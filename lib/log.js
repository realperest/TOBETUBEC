import { appendFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(__dirname, '..', 'logs', 'app.log');

/**
 * @param {string} level
 * @param {string} message
 * @param {Record<string, unknown> | undefined} [data]
 */
async function fileLine(level, message, data) {
  try {
    const dir = path.dirname(logPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const line = JSON.stringify({ t: new Date().toISOString(), level, message, data: data || {} });
    await appendFile(logPath, line + '\n', 'utf8');
  } catch (err) {
    console.error('Log yazılamadı', err);
  }
}

/**
 * @param {string} message
 * @param {Error} [err]
 * @param {Record<string, unknown> | undefined} [data]
 */
export function logError(message, err, data) {
  const payload = { ...data };
  if (err) {
    payload.name = err.name;
    payload.message = err.message;
    payload.stack = err.stack;
  }
  console.error(message, err || '', payload);
  void fileLine('error', message, payload);
}

/**
 * @param {string} message
 * @param {Record<string, unknown> | undefined} [data]
 */
export function logInfo(message, data) {
  console.log(message, data || '');
  void fileLine('info', message, data || {});
}
