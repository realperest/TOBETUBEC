import express from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ProxyAgent } from 'undici';
import { logError } from '../lib/log.js';
import { YT_ANDROID_APP_UA, YT_IOS_APP_UA, youtubeUpstreamHeaders } from '../lib/youtubeUpstream.js';
import { getInnertube } from '../services/innertube.js';

const router = express.Router();

const upstreamProxy = String(process.env.YTDLP_PROXY || '').trim();
const upstreamDispatcher = upstreamProxy ? new ProxyAgent(upstreamProxy) : null;

function isAllowedStreamUrl(href) {
  try {
    const u = new URL(href);
    return u.hostname.includes('googlevideo.com');
  } catch {
    return false;
  }
}

router.get('/stream', async (req, res) => {
  const url = req.query.url != null && req.query.url !== '' ? String(req.query.url) : null;
  if (!url) {
    return res.status(400).send('Eksik url');
  }
  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch (e) {
    logError('proxy decode', e instanceof Error ? e : new Error(String(e)));
    return res.status(400).send('Geçersiz url');
  }
  if (!isAllowedStreamUrl(decoded)) {
    return res.status(403).send('İzin yok');
  }
  try {
    let visitorId = '';
    try {
      const innertube = await getInnertube();
      visitorId = innertube.session?.context?.client?.visitorData || '';
    } catch (e) {
      logError('proxy visitor', e instanceof Error ? e : new Error(String(e)));
    }
    const buildReq = (extra) => {
      const base = { ...youtubeUpstreamHeaders(req, visitorId ? { visitorId } : {}), ...extra };
      const h = { ...base };
      const clientRange = req.headers.range;
      if (clientRange) {
        h.Range = String(clientRange);
      }
      return h;
    };
    const isManifest = decoded.includes('manifest.googlevideo.com');
    const attemptSets = [
      buildReq({}),
      buildReq({ Referer: 'https://m.youtube.com/', Origin: 'https://m.youtube.com' }),
      buildReq({ Referer: 'https://m.youtube.com/', Origin: 'https://m.youtube.com', 'User-Agent': YT_IOS_APP_UA }),
      buildReq({ Referer: 'https://m.youtube.com/', Origin: 'https://m.youtube.com', 'User-Agent': YT_ANDROID_APP_UA }),
    ];
    if (isManifest) {
      attemptSets.push(
        buildReq({ Referer: 'https://www.youtube.com/', Origin: 'https://www.youtube.com', 'User-Agent': YT_IOS_APP_UA }),
      );
    }
    let r = await fetch(decoded, { headers: attemptSets[0], dispatcher: upstreamDispatcher || undefined });
    for (let i = 1; i < attemptSets.length && r.status === 403; i += 1) {
      r = await fetch(decoded, { headers: attemptSets[i], dispatcher: upstreamDispatcher || undefined });
    }
    if (!r.ok && r.status !== 206) {
      const sample = decoded.length > 100 ? `${decoded.slice(0, 100)}...` : decoded;
      logError('proxy üst hata', new Error('HTTP ' + String(r.status)), { sample });
      return res.status(r.status).send('Kaynak cevabı hatalı');
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    const ct = r.headers.get('content-type');
    if (ct) {
      res.setHeader('Content-Type', ct);
    }
    const cr = r.headers.get('content-range');
    if (cr) {
      res.setHeader('Content-Length', r.headers.get('content-length') || '');
      res.setHeader('Content-Range', cr);
    } else {
      const len = r.headers.get('content-length');
      if (len) {
        res.setHeader('Content-Length', len);
      }
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.status(r.status);
    if (!r.body) {
      return res.end();
    }
    const nodeStream = Readable.fromWeb(r.body);
    await pipeline(nodeStream, res);
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    if (/** @type {any} */ (e).code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      logError('proxy pipe', e);
    }
    if (!res.headersSent) {
      return res.status(502).send('Oynatma akışı hatası');
    }
  }
  return null;
});

export default router;
