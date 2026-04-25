import express from 'express';
import { getInnertube } from '../services/innertube.js';
import { mapSearchVideoNode, isMusicLikeContent } from '../lib/videoMappers.js';
import { logError } from '../lib/log.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const innertube = await getInnertube();
    const buckets = [
      ['technology review', 10],
      ['science documentary', 10],
      ['automotive review', 10],
      ['sports highlights', 10],
      ['gaming gameplay', 10],
      ['world news analysis', 8],
      ['travel documentary', 8],
    ];
    const picked = [];
    const seenId = new Set();
    const seenChannel = new Map();
    const tryPush = (item) => {
      if (!item || !item.id) {
        return false;
      }
      if (seenId.has(item.id)) {
        return false;
      }
      const ch = String(item.channel || '').trim().toLowerCase();
      if (ch) {
        const c = seenChannel.get(ch) || 0;
        if (c >= 2) {
          return false;
        }
        seenChannel.set(ch, c + 1);
      }
      seenId.add(item.id);
      picked.push(item);
      return true;
    };

    for (const [query, maxPerBucket] of buckets) {
      try {
        const s = await innertube.search(query, { type: 'video' });
        let taken = 0;
        for (const v of s.videos || []) {
          const m = mapSearchVideoNode(v);
          if (isMusicLikeContent(m)) {
            continue;
          }
          if (tryPush(m)) {
            taken += 1;
          }
          if (taken >= maxPerBucket || picked.length >= 48) {
            break;
          }
        }
      } catch (err) {
        logError('trending bucket arama', err instanceof Error ? err : new Error(String(err)), { query });
      }
      if (picked.length >= 48) {
        break;
      }
    }

    if (picked.length === 0) {
      return res.status(500).json({ error: 'Trend listesi alınamadı' });
    }
    // Basit karıştırma: ardışık benzerliği azalt.
    for (let i = picked.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = picked[i];
      picked[i] = picked[j];
      picked[j] = t;
    }
    return res.json(picked.slice(0, 48));
  } catch (err) {
    logError('trending hatası', err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ error: 'Trend listesi alınamadı' });
  }
});

export default router;
