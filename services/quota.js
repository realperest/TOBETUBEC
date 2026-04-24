import crypto from 'node:crypto';

const dailyLimit = 100;

/** @type {Map<string, { day: string; used: number }>} */
const byUser = new Map();

/**
 * Günü YYYY-MM-DD (UTC) olarak döner.
 * @returns {string}
 */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
function userKey(req) {
  if (req.user && req.user.id) {
    return `u:${String(req.user.id)}`;
  }
  const raw = String(req.sessionID || 'anon');
  return `s:${raw}`;
}

/**
 * Oturum anahtarını (hash) kota için tutar; ham session id loglanmaz.
 * @param {import('express').Request} req
 * @returns {string}
 */
export function quotaIdForRequest(req) {
  const k = userKey(req);
  return crypto.createHash('sha256').update(k).digest('hex').slice(0, 12);
}

/**
 * Aynı gün +100 tüketir. Limit aşıldıysa false.
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function tryConsumeSearch(req) {
  const k = userKey(req);
  const day = todayKey();
  let rec = byUser.get(k);
  if (!rec || rec.day !== day) {
    rec = { day, used: 0 };
  }
  if (rec.used >= dailyLimit) {
    byUser.set(k, rec);
    return false;
  }
  rec.used += 1;
  byUser.set(k, rec);
  return true;
}

/**
 * Mevcut kullanım (bugün, arama sayısı)
 * @param {import('express').Request} req
 * @returns {{ used: number, limit: number }}
 */
export function getQuota(req) {
  const k = userKey(req);
  const day = todayKey();
  const rec = byUser.get(k);
  const used = rec && rec.day === day ? rec.used : 0;
  return { used, limit: dailyLimit };
}
