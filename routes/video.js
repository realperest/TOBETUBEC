import express from 'express';
import { getInnertube } from '../services/innertube.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { toProxyStreamUrl, getRequestPublicBaseUrl } from '../lib/videoMappers.js';
import { getOrSet } from '../services/cache.js';
import { logError, logInfo } from '../lib/log.js';
import {
  YT_ANDROID_APP_UA,
  YT_IOS_APP_UA,
  youtubeUpstreamHeaders,
} from '../lib/youtubeUpstream.js';

/**
 * TV_EMBEDDED / WEB_EMBEDDED: "YouTube is no longer supported in this application or device" üretebiliyor.
 * Doğrudan Google manifest URL'ü yoksa getBasicInfo + toDash() ile MPD sentezlenir.
 */
const MANIFEST_CLIENT_CHAIN = [
  'WEB',
  'ANDROID',
  'IOS',
  'TV',
  'MWEB',
  'WEB_CREATOR',
  'ANDROID_VR',
];

/**
 * @param {any} info
 * @param {'dash' | 'hls'} kind
 * @returns {string|null}
 */
function pickDirectManifestUrl(info, kind) {
  const sd = info && info.streaming_data;
  if (!sd) {
    return null;
  }
  if (kind === 'dash' && sd.dash_manifest_url) {
    return String(sd.dash_manifest_url);
  }
  if (kind === 'hls' && sd.hls_manifest_url) {
    return String(sd.hls_manifest_url);
  }
  return null;
}

/**
 * @param {any} info
 * @returns {boolean}
 */
function hasStreamableFormats(info) {
  const sd = info && info.streaming_data;
  if (!sd) {
    return false;
  }
  const a = Array.isArray(sd.adaptive_formats) && sd.adaptive_formats.length > 0;
  const f = Array.isArray(sd.formats) && sd.formats.length > 0;
  return a || f;
}

/**
 * @param {any} info
 * @returns {boolean}
 */
function isNotHardBlocked(info) {
  const s = info && info.playability_status && info.playability_status.status;
  return s !== 'UNPLAYABLE' && s !== 'LOGIN_REQUIRED';
}

/**
 * @param {import('youtubei.js').Innertube} innertube
 * @param {string} videoId
 * @param {any} [firstInfo]
 * @returns {Promise<any|null>}
 */
async function findVideoInfoForGeneratedDash(innertube, videoId, firstInfo) {
  if (firstInfo && hasStreamableFormats(firstInfo) && isNotHardBlocked(firstInfo)) {
    return firstInfo;
  }
  for (const client of MANIFEST_CLIENT_CHAIN) {
    try {
      const info = await innertube.getBasicInfo(videoId, { client: /** @type {any} */ (client) });
      if (hasStreamableFormats(info) && isNotHardBlocked(info)) {
        return info;
      }
    } catch {
      /* diğer istemci dene */
    }
  }
  try {
    const info = await innertube.getBasicInfo(videoId);
    if (hasStreamableFormats(info)) {
      return info;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Sunucu / veri merkezi IP'lerinde tek istemciyle streaming_data boş kalabiliyor.
 * @param {import('youtubei.js').Innertube} innertube
 * @param {string} videoId
 * @returns {Promise<any>}
 */
async function getBasicInfoForPlayback(innertube, videoId) {
  const clientOrder = [undefined, 'WEB', 'ANDROID', 'IOS', 'MWEB', 'TV', 'WEB_CREATOR'];
  /** @type {any} */
  let lastOk = null;
  for (const client of clientOrder) {
    try {
      const info = client
        ? await innertube.getBasicInfo(videoId, { client: /** @type {any} */ (client) })
        : await innertube.getBasicInfo(videoId);
      if (info && isNotHardBlocked(info) && hasStreamableFormats(info)) {
        return info;
      }
      if (info && isNotHardBlocked(info)) {
        lastOk = info;
      }
    } catch (e) {
      logInfo('getBasicInfo client denemesi', {
        videoId,
        client: client || 'varsayilan',
        err: (e instanceof Error) ? e.message : String(e),
      });
    }
  }
  if (lastOk) {
    return lastOk;
  }
  try {
    return await innertube.getBasicInfo(videoId);
  } catch (e) {
    logInfo('getBasicInfo son fallback getInfo', { videoId, err: (e instanceof Error) ? e.message : String(e) });
    return await innertube.getInfo(videoId);
  }
}

/**
 * getBasicInfo önce: watchNext yok, PlayerErrorCommand / parser gürültüsü azalır.
 * @param {import('youtubei.js').Innertube} innertube
 * @param {string} videoId
 * @param {'dash' | 'hls'} kind
 * @param {any} [firstInfo]
 */
async function resolveDirectManifestUrl(innertube, videoId, kind, firstInfo) {
  const tryInfo = (info) => {
    if (!info) {
      return null;
    }
    return pickDirectManifestUrl(info, kind);
  };
  const a = tryInfo(firstInfo);
  if (a) {
    return a;
  }
  for (const client of MANIFEST_CLIENT_CHAIN) {
    try {
      const info = await innertube.getBasicInfo(videoId, { client: /** @type {any} */ (client) });
      const u = tryInfo(info);
      if (u) {
        return u;
      }
    } catch {
      /* dene */
    }
    try {
      const info = await innertube.getInfo(videoId, { client: /** @type {any} */ (client) });
      const u = tryInfo(info);
      if (u) {
        return u;
      }
    } catch {
      /* dene */
    }
  }
  try {
    const basic = await innertube.getBasicInfo(videoId);
    return tryInfo(basic);
  } catch {
    return null;
  }
}

const router = express.Router();
router.use(requireAuth);

/**
 * @param {import('express').Request} req
 * @param {string} directUrl
 */
function proxyXform(req, directUrl) {
  return toProxyStreamUrl(req, directUrl);
}

/**
 * DASH XML içindeki sadece gerçek medya URL'lerini proxy'ler.
 * XML namespace URL'lerine dokunmaz.
 * @param {import('express').Request} req
 * @param {string} xml
 */
function rewriteDashUrls(req, xml) {
  if (!xml) {
    return '';
  }
  return String(xml).replace(/>(https:\/\/[^<\s"]+)</g, (_, url) => {
    const proxied = proxyXform(req, String(url))
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `>${proxied}<`;
  });
}

/**
 * M3U8 içindeki medya URL'lerini proxy endpointine çevirir.
 * @param {import('express').Request} req
 * @param {string} m3u8
 */
function rewriteM3u8Urls(req, m3u8) {
  if (!m3u8) {
    return '';
  }
  return String(m3u8)
    .split('\n')
    .map((line) => {
      const t = String(line || '').trim();
      if (!t || t.startsWith('#')) {
        return line;
      }
      if (/^https?:\/\//i.test(t)) {
        return proxyXform(req, t);
      }
      return line;
    })
    .join('\n');
}

/**
 * @param {import('youtubei.js').Innertube} innertube
 * @param {import('express').Request} req
 * @param {string} videoId
 * @param {any} info
 */
async function buildFormatList(innertube, req, videoId, info) {
  const list = [];
  const seen = new Set();
  const addFormat = (f, qualityHint) => {
    if (!f || !f.url) {
      return;
    }
    const key = `${f.itag || qualityHint || 'x'}:${f.url}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    list.push({
      itag: f.itag || 0,
      quality: f.quality_label || qualityHint || `${f.height || '?'}p`,
      url: proxyXform(req, f.url),
      mimeType: f.mime_type || '',
    });
  };

  const isVideoFormat = (f) => {
    if (!f || !f.url) {
      return false;
    }
    if (f.has_video) {
      return true;
    }
    return Boolean(f.mime_type && /video\//i.test(String(f.mime_type)));
  };
  const addList = async (arr) => {
    for (const f of arr || []) {
      if (!isVideoFormat(f)) {
        continue;
      }
      try {
        const u = f.url || null;
        if (!u) {
          continue;
        }
        addFormat({ ...f, url: u }, f.quality_label);
      } catch (e) {
        logError('format parse', e instanceof Error ? e : new Error(String(e)), { videoId, itag: f.itag });
      }
    }
  };
  if (info.streaming_data) {
    await addList(info.streaming_data.formats);
    await addList(info.streaming_data.adaptive_formats);
  }
  return list;
}

router.get('/:videoId/manifest.mpd', async (req, res) => {
  const { videoId } = req.params;
  const cacheKey = `manifest:v7:${req.get('host') || 'host'}:${videoId}`;
  try {
    const xml = await getOrSet(
      cacheKey,
      async () => {
        const innertube = await getInnertube();
        const visitorId = innertube.session?.context?.client?.visitorData || '';
        let info;
        try {
          info = await innertube.getBasicInfo(videoId);
        } catch (e) {
          logError('manifest.mpd getBasicInfo', e instanceof Error ? e : new Error(String(e)), { videoId });
          info = await innertube.getInfo(videoId);
        }
        if (info.playability_status && (info.playability_status.status === 'UNPLAYABLE' || info.playability_status.status === 'LOGIN_REQUIRED')) {
          const e = new Error('Video oynatılamıyor');
          e.code = 'UNPLAYABLE';
          throw e;
        }
        const directDashUrl = await resolveDirectManifestUrl(innertube, videoId, 'dash', info);
        if (directDashUrl) {
          const directRes = await fetch(directDashUrl, {
            headers: youtubeUpstreamHeaders(req, { referer: 'https://www.youtube.com/', visitorId }),
          });
          if (!directRes.ok) {
            throw new Error(`DASH fetch HTTP ${String(directRes.status)}`);
          }
          const directXml = await directRes.text();
          return rewriteDashUrls(req, directXml);
        }
        const forDash = await findVideoInfoForGeneratedDash(innertube, videoId, info);
        if (forDash) {
          try {
            const mpd = await forDash.toDash({
              url_transformer: (url) => proxyXform(req, url),
            });
            if (mpd && String(mpd).length > 0) {
              return String(mpd);
            }
          } catch (e) {
            /* decipher / YouTube sınırı: sık olur, error log şişirmez */
            logInfo('manifest.mpd toDash atlanıyor', { videoId, err: (e instanceof Error) ? e.message : String(e) });
          }
        }
        throw new Error('DASH manifest URL bulunamadı');
      },
      2 * 60 * 1000,
    );
    res.setHeader('Content-Type', 'application/dash+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.send(xml);
  } catch (err) {
    logError('manifest.mpd', err instanceof Error ? err : new Error(String(err)));
    if (err && typeof err === 'object' && 'code' in err && err.code === 'UNPLAYABLE') {
      return res.status(404).type('text/plain').send('Video oynatılamıyor');
    }
    return res.status(500).type('text/plain').send('Manifest üretilemedi');
  }
});

router.get('/:videoId/manifest.m3u8', async (req, res) => {
  const { videoId } = req.params;
  const cacheKey = `manifest-hls:v5:${req.get('host') || 'host'}:${videoId}`;
  try {
    const m3u8 = await getOrSet(
      cacheKey,
      async () => {
        const innertube = await getInnertube();
        const visitorId = innertube.session?.context?.client?.visitorData || '';
        let seedInfo;
        try {
          seedInfo = await innertube.getBasicInfo(videoId);
        } catch {
          seedInfo = null;
        }
        const hlsUrl = await resolveDirectManifestUrl(innertube, videoId, 'hls', seedInfo);
        if (!hlsUrl) {
          throw new Error('HLS manifest URL bulunamadı');
        }
        const hlsHeaderSets = [
          youtubeUpstreamHeaders(req, { referer: 'https://m.youtube.com/', visitorId }),
          youtubeUpstreamHeaders(req, { referer: 'https://m.youtube.com/', visitorId, userAgent: YT_IOS_APP_UA }),
          youtubeUpstreamHeaders(req, { referer: 'https://m.youtube.com/', visitorId, userAgent: YT_ANDROID_APP_UA }),
        ];
        let directM3u8 = '';
        let lastStatus = 0;
        for (const headers of hlsHeaderSets) {
          const directRes = await fetch(hlsUrl, { headers });
          lastStatus = directRes.status;
          if (directRes.ok) {
            directM3u8 = await directRes.text();
            break;
          }
        }
        if (!directM3u8) {
          throw new Error(`HLS fetch HTTP ${String(lastStatus)}`);
        }
        return rewriteM3u8Urls(req, directM3u8);
      },
      2 * 60 * 1000,
    );
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.send(m3u8);
  } catch (err) {
    logError('manifest.m3u8', err instanceof Error ? err : new Error(String(err)));
    return res.status(500).type('text/plain').send('HLS manifest üretilemedi');
  }
});

router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const innertube = await getInnertube();
    let info;
    try {
      info = await getBasicInfoForPlayback(innertube, videoId);
    } catch (e) {
      logError('video getBasicInfo', e instanceof Error ? e : new Error(String(e)), { videoId });
      info = await innertube.getInfo(videoId);
    }
    if (info.playability_status && info.playability_status.status === 'UNPLAYABLE') {
      return res.status(404).json({ error: 'Video oynatılamıyor' });
    }
    const title = info.basic_info?.title != null
      ? String(info.basic_info.title)
      : '';
    const channel = info.basic_info?.channel && info.basic_info.channel.name != null
      ? String(info.basic_info.channel.name)
      : '';
    const rel = getRequestPublicBaseUrl(req) || `${req.protocol}://${req.get('host')}`;
    const dashManifestUrl = `${rel}/api/video/${encodeURIComponent(videoId)}/manifest.mpd`;
    const hlsManifestUrl = `${rel}/api/video/${encodeURIComponent(videoId)}/manifest.m3u8`;
    const formats = await buildFormatList(innertube, req, videoId, info);
    return res.json({
      id: videoId,
      title,
      channel,
      dashManifestUrl,
      hlsManifestUrl,
      isLive: Boolean(info.basic_info?.is_live),
      formats,
    });
  } catch (err) {
    logError('video detay', err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ error: 'Video bilgisi alınamadı' });
  }
});

export default router;
