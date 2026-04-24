import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getQuota } from '../services/quota.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  return res.json(getQuota(req));
});

export default router;
