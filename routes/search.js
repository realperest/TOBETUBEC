import express from 'express';
import { getInnertube } from '../services/innertube.js';
import { mapSearchVideoNode, isMusicLikeContent } from '../lib/videoMappers.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { tryConsumeSearch, getQuota } from '../services/quota.js';
import { saveSearchState, takeSearchState } from '../services/searchContinuation.js';
import { logError } from '../lib/log.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'q gerekli' });
  }
  const pageToken = req.query.pageToken != null && req.query.pageToken !== ''
    ? String(req.query.pageToken)
    : null;

  try {
    if (!pageToken) {
      const qState = getQuota(req);
      if (qState.used >= qState.limit) {
        return res.status(429).json({
          error: 'Günlük 100 arama limitine ulaştın. Trend videolara göz at.',
          videos: [],
          nextPageToken: null,
        });
      }
      const ok = tryConsumeSearch(req);
      if (!ok) {
        return res.status(429).json({
          error: 'Günlük 100 arama limitine ulaştın. Trend videolara göz at.',
          videos: [],
          nextPageToken: null,
        });
      }
    }

    const innertube = await getInnertube();
    let search;
    if (pageToken) {
      const prior = takeSearchState(pageToken);
      if (!prior) {
        return res.status(400).json({ error: 'Arama sayfası süresi doldu' });
      }
      search = await prior.getContinuation();
    } else {
      search = await innertube.search(q, { type: 'video' });
    }

    const out = [];
    for (const v of search.videos || []) {
      const m = mapSearchVideoNode(v);
      if (m && !isMusicLikeContent(m)) {
        out.push(m);
      }
    }
    if (out.length === 0) {
      for (const n of search.results || []) {
        const m = mapSearchVideoNode(n);
        if (m && !isMusicLikeContent(m)) {
          out.push(m);
        }
      }
    }

    let nextPageToken = null;
    if (search.has_continuation) {
      nextPageToken = saveSearchState(search);
    }
    return res.json({ videos: out, nextPageToken });
  } catch (err) {
    logError('search hatası', err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ error: 'Arama çalıştırılamadı' });
  }
});

export default router;
