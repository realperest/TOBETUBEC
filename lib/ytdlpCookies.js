import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

let cached = {
  filePath: '',
  fingerprint: '',
};

function envFingerprint() {
  const b64 = String(process.env.YTDLP_COOKIES_B64 || '').trim();
  const raw = String(process.env.YTDLP_COOKIES || '').trim();
  const s = (b64 ? `b64:${b64}` : '') + (raw ? `raw:${raw}` : '');
  return crypto.createHash('sha256').update(s).digest('hex');
}

function decodeCookiesText() {
  const b64 = String(process.env.YTDLP_COOKIES_B64 || '').trim();
  if (b64) {
    return Buffer.from(b64, 'base64').toString('utf8');
  }
  return String(process.env.YTDLP_COOKIES || '').trim();
}

function looksLikeNetscapeCookies(s) {
  const t = String(s || '').trim();
  return t.startsWith('# Netscape HTTP Cookie File') || t.includes('youtube.com');
}

/**
 * Railway gibi ortamlarda yt-dlp bot doğrulamasını aşmak için cookie dosyası.
 * Env’den alınır, runtime’da temp dosyaya yazılır, repo’ya girmez.
 * @returns {Promise<string>} cookie dosya yolu (yoksa '')
 */
export async function ensureYtdlpCookiesFile() {
  const fp = envFingerprint();
  if (cached.filePath && cached.fingerprint === fp) {
    return cached.filePath;
  }

  const txt = decodeCookiesText();
  if (!txt) {
    cached = { filePath: '', fingerprint: fp };
    return '';
  }
  if (!looksLikeNetscapeCookies(txt)) {
    cached = { filePath: '', fingerprint: fp };
    return '';
  }

  const dir = path.join(os.tmpdir(), 'tobetube');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'ytdlp-cookies.txt');
  await fs.writeFile(filePath, txt, { encoding: 'utf8', mode: 0o600 });
  cached = { filePath, fingerprint: fp };
  return filePath;
}

