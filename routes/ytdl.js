import express from 'express';
import { getStreamUrlWithYtdlp } from '../services/ytdlp.js';
import { toProxyStreamUrl } from '../lib/videoMappers.js';
import { logError } from '../lib/log.js';

const router = express.Router();

router.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const q = String(req.query.quality || 'best');
  try {
    const direct = await getStreamUrlWithYtdlp(videoId, q);
    const out = toProxyStreamUrl(req, direct);
    return res.json({ url: out, videoId, quality: q });
  } catch (err) {
    logError('ytdlp stream', err instanceof Error ? err : new Error(String(err)));
    if (err && typeof err === 'object' && 'code' in err) {
      if (err.code === 'YTDLP_BAD_QUALITY') {
        return res.status(400).json({ error: 'Geçersiz kalite' });
      }
      if (err.code === 'YTDLP_NOT_FOUND') {
        return res.status(503).json({ error: 'yt-dlp bulunamadi (PATH veya Python modulu eksik)' });
      }
      if (err.code === 'YTDLP_COOKIES_INCOMPLETE') {
        return res.status(503).json({
          error: 'YouTube erişimi için cookie eksik/uygunsuz. Google ve YouTube cookie export edip Railway env’e girin.',
        });
      }
    }
    return res.status(500).json({ error: 'yt-dlp ile URL alınamadı' });
  }
});

export default router;
