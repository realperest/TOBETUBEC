const store = new Map();

/**
 * @param {string} key
 * @param {() => Promise<T>} factory
 * @param {number} ttlMs
 * @returns {Promise<T>}
 * @template T
 */
export async function getOrSet(key, factory, ttlMs) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = await factory();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/**
 * @param {string} key
 */
export function del(key) {
  store.delete(key);
}

/**
 * Belirli prefix ile tüm anahtarları siler.
 * @param {string} prefix
 */
export function delPrefix(prefix) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) {
      store.delete(k);
    }
  }
}
