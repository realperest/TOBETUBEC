import express from 'express';
import { getInnertube } from '../services/innertube.js';
import { mapSearchVideoNode, isMusicLikeContent } from '../lib/videoMappers.js';
import { logError } from '../lib/log.js';

const router = express.Router();

router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const innertube = await getInnertube();
    const info = await innertube.getInfo(videoId);
    const out = [];
    const seen = new Set([String(videoId)]);
    const push = (item) => {
      if (!item || !item.id) {
        return;
      }
      const id = String(item.id);
      if (seen.has(id)) {
        return;
      }
      seen.add(id);
      out.push(item);
    };
    if (info.watch_next_feed) {
      for (const n of info.watch_next_feed) {
        const m = mapSearchVideoNode(n);
        if (m && !isMusicLikeContent(m) && out.length < 16) {
          push(m);
        }
      }
    }
    const t = String(info?.basic_info?.title || '').trim();
    const c = String(info?.basic_info?.channel?.name || '').trim();
    const base = [t, c].filter(Boolean).join(' ').trim();
    const diversifyQueries = [
      base,
      base ? `${base} inceleme` : 'teknoloji inceleme',
      base ? `${base} shorts` : 'youtube shorts',
      base ? `${base} benzer` : 'gündem videosu',
      'teknoloji',
      'spor',
      'oyun',
    ].filter(Boolean);

    for (const q of diversifyQueries) {
      if (out.length >= 36) {
        break;
      }
      try {
        const s = await innertube.search(q, { type: 'video' });
        for (const v of s.videos || []) {
          const m = mapSearchVideoNode(v);
          if (isMusicLikeContent(m)) {
            continue;
          }
          push(m);
          if (out.length >= 36) {
            break;
          }
        }
      } catch (err) {
        logError('suggestions query fallback', err instanceof Error ? err : new Error(String(err)), { query: q });
      }
    }
    // Karıştırma: tek konu kümelenmesini azalt.
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const x = out[i];
      out[i] = out[j];
      out[j] = x;
    }
    return res.json(out.slice(0, 30));
  } catch (err) {
    logError('suggestions hatası', err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ error: 'Öneriler yüklenemedi' });
  }
});

export default router;
