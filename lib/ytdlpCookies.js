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
  const g = String(process.env.YTDLP_COOKIES_GOOGLE_B64 || '').trim();
  const y = String(process.env.YTDLP_COOKIES_YOUTUBE_B64 || '').trim();
  const s = (b64 ? `b64:${b64}` : '')
    + (raw ? `raw:${raw}` : '')
    + (g ? `g:${g}` : '')
    + (y ? `y:${y}` : '');
  return crypto.createHash('sha256').update(s).digest('hex');
}

function decodeB64(b64) {
  const s = String(b64 || '').trim();
  if (!s) {
    return '';
  }
  try {
    return Buffer.from(s, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function decodeCookiesTextSingle() {
  const b64 = String(process.env.YTDLP_COOKIES_B64 || '').trim();
  if (b64) {
    return decodeB64(b64);
  }
  return String(process.env.YTDLP_COOKIES || '').trim();
}

function looksLikeNetscapeCookies(s) {
  const t = String(s || '').trim();
  return t.startsWith('# Netscape HTTP Cookie File') || t.includes('youtube.com');
}

function stripHeaderLines(txt) {
  return String(txt || '')
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l && !l.startsWith('#'));
}

function buildMergedCookiesText(googleTxt, youtubeTxt) {
  const header = [
    '# Netscape HTTP Cookie File',
    '# https://curl.haxx.se/rfc/cookie_spec.html',
    '# This is a generated file! Do not edit.',
    '',
  ].join('\n');
  const lines = [...stripHeaderLines(googleTxt), ...stripHeaderLines(youtubeTxt)];
  return header + lines.join('\n') + '\n';
}

function hasDomain(txt, domain) {
  const s = String(txt || '').toLowerCase();
  return s.includes(`\t.${domain}\t`) || s.includes(`\t${domain}\t`) || s.includes(`.${domain}\t`) || s.includes(`${domain}\t`);
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

  const gB64 = String(process.env.YTDLP_COOKIES_GOOGLE_B64 || '').trim();
  const yB64 = String(process.env.YTDLP_COOKIES_YOUTUBE_B64 || '').trim();
  const gTxt = decodeB64(gB64);
  const yTxt = decodeB64(yB64);
  let txt = '';

  if (gTxt || yTxt) {
    if (!gTxt || !yTxt) {
      const e = new Error('Cookie eksik: Google ve YouTube cookie birlikte gerekli');
      /** @type {any} */ (e).code = 'YTDLP_COOKIES_INCOMPLETE';
      throw e;
    }
    txt = buildMergedCookiesText(gTxt, yTxt);
    if (!hasDomain(txt, 'google.com') || !hasDomain(txt, 'youtube.com')) {
      const e = new Error('Cookie gecersiz: google.com ve youtube.com domain satirlari bulunamadi');
      /** @type {any} */ (e).code = 'YTDLP_COOKIES_INCOMPLETE';
      throw e;
    }
  } else {
    txt = decodeCookiesTextSingle();
  }

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

