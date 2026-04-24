import crypto from 'node:crypto';

/** @type {Map<string, { search: any; expires: number }>} */
const store = new Map();
const ttlMs = 10 * 60 * 1000;

function clearExpired() {
  const t = Date.now();
  for (const [k, v] of store) {
    if (v.expires < t) {
      store.delete(k);
    }
  }
}

/**
 * @param {any} search
 * @returns {string}
 */
export function saveSearchState(search) {
  clearExpired();
  const id = crypto.randomBytes(20).toString('hex');
  store.set(id, { search, expires: Date.now() + ttlMs });
  return id;
}

/**
 * @param {string} id
 * @returns {any}
 */
export function takeSearchState(id) {
  if (!id || typeof id !== 'string') {
    return null;
  }
  clearExpired();
  const e = store.get(id);
  if (!e) {
    return null;
  }
  store.delete(id);
  if (e.expires < Date.now()) {
    return null;
  }
  return e.search;
}
