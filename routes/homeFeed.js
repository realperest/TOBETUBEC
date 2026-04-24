import express from 'express';
import { getInnertube } from '../services/innertube.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { mapSearchVideoNode, isMusicLikeContent } from '../lib/videoMappers.js';
import { logError } from '../lib/log.js';

const router = express.Router();
router.use(requireAuth);

router.get('/sezgisel', async (req, res) => {
  try {
    const innertube = await getInnertube();
    const excludeRaw = String(req.query.exclude || '');
    const exclude = new Set(
      excludeRaw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    );

    /** @type {Array<any>} */
    const out = [];
    const seen = new Set();
    const pushDistinct = (item) => {
      if (!item || !item.id) {
        return;
      }
      if (exclude.has(item.id) || seen.has(item.id)) {
        return;
      }
      seen.add(item.id);
      out.push(item);
    };

    try {
      const home = await innertube.getHomeFeed();
      for (const v of home.videos || []) {
        const m = mapSearchVideoNode(v);
        if (!isMusicLikeContent(m)) {
          pushDistinct(m);
        }
      }
      if (out.length < 24 && home.has_continuation) {
        const next = await home.getContinuation();
        for (const v of next.videos || []) {
          const m = mapSearchVideoNode(v);
          if (!isMusicLikeContent(m)) {
            pushDistinct(m);
          }
          if (out.length >= 36) {
            break;
          }
        }
      }
    } catch (err) {
      logError('sezgisel home feed fallback', err instanceof Error ? err : new Error(String(err)));
    }

    // Sezgisel için home ile aynı listeyi döşememek adına farklı arama havuzu.
    if (out.length < 24) {
      const queries = [
        'belgesel',
        'bilim teknoloji',
        'oyun inceleme',
        'dünya gündem',
        'otomobil inceleme',
      ];
      for (const q of queries) {
        try {
          const s = await innertube.search(q, { type: 'video' });
          for (const v of s.videos || []) {
            const m = mapSearchVideoNode(v);
            if (isMusicLikeContent(m)) {
              continue;
            }
            pushDistinct(m);
            if (out.length >= 48) {
              break;
            }
          }
          if (out.length >= 48) {
            break;
          }
        } catch (err) {
          logError('sezgisel arama fallback', err instanceof Error ? err : new Error(String(err)), { query: q });
        }
      }
    }
    return res.json(out.slice(0, 48));
  } catch (err) {
    logError('sezgisel', err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ error: 'Ana sayfa beslemesi alınamadı' });
  }
});

export default router;
