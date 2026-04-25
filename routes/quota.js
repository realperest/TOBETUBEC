import express from 'express';
import { getQuota } from '../services/quota.js';

const router = express.Router();

router.get('/', (req, res) => {
  return res.json(getQuota(req));
});

export default router;
