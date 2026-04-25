import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { YT_CHROME_UA } from '../lib/youtubeUpstream.js';
import { ensureYtdlpCookiesFile } from '../lib/ytdlpCookies.js';

const execFileAsync = promisify(execFile);

/**
 * @param {unknown} err
 * @returns {boolean}
 */
function isMissingPythonYtdlp(err) {
  const msg = String(
    (err && typeof err === 'object' && 'message' in err && err.message) || '',
  ).toLowerCase();
  return msg.includes('no module named yt_dlp');
}

/**
 * @param {string} quality
 * @returns {string}
 */
function formatSelector(quality) {
  const q = String(quality || 'best').toLowerCase();
  const avBest = 'best[acodec!=none][vcodec!=none]/best';
  if (q === 'best' || q === 'auto') {
    return avBest;
  }
  if (q === '1080' || q === '1080p' || q === 'hd') {
    return 'best[height<=1080][acodec!=none][vcodec!=none]/best[acodec!=none][vcodec!=none]/best';
  }
  if (q === '720' || q === '720p') {
    return 'best[height<=720][acodec!=none][vcodec!=none]/best[acodec!=none][vcodec!=none]/best';
  }
  if (q === '480' || q === '480p') {
    return 'best[height<=480][acodec!=none][vcodec!=none]/best[acodec!=none][vcodec!=none]/best';
  }
  if (q === '360' || q === '360p') {
    return 'best[height<=360][acodec!=none][vcodec!=none]/best[acodec!=none][vcodec!=none]/best';
  }
  if (q === 'worst') {
    return 'worst';
  }
  const err = new Error('Geçersiz kalite');
  err.code = 'YTDLP_BAD_QUALITY';
  throw err;
}

/**
 * @param {string} fsel
 * @param {string} videoUrl
 * @returns {string[]}
 */
function ytdlpGetUrlArgs(fsel, videoUrl) {
  const proxy = String(process.env.YTDLP_PROXY || '').trim();
  const forceIpv4 = String(process.env.YTDLP_FORCE_IPV4 || '').trim();
  return [
    '-g',
    '-f',
    fsel,
    '--no-warnings',
    '--user-agent',
    YT_CHROME_UA,
    ...(proxy ? ['--proxy', proxy] : []),
    ...(forceIpv4 && forceIpv4 !== '0' ? ['--force-ipv4'] : []),
    '--add-header',
    'Referer:https://www.youtube.com/watch',
    '--add-header',
    'Accept-Language:en-US,en;q=0.9',
    '--extractor-args',
    'youtube:player_client=web',
    videoUrl,
  ];
}

/**
 * @param {string} quality
 * @returns {string[]}
 */
function formatStringAttempts(quality) {
  const primary = formatSelector(quality);
  // "b" / "w" gibi kısaltmalar yt-dlp'de geçerli format seçici değildir.
  // Burada amaç: tek dosya A+V (mp4) öncelikli, sonra genel fallback.
  return [
    primary,
    'best[acodec!=none][vcodec!=none]/best',
    '22/18/best',
    'best',
    'worst',
  ];
}

/**
 * yt-dlp ile tek bir doğrudan indirme URL’si (veya hata) döner.
 * @param {string} videoId
 * @param {string} [quality]
 * @returns {Promise<string>}
 */
export async function getStreamUrlWithYtdlp(videoId, quality) {
  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const fAttempts = formatStringAttempts(quality);
  const cookiesFile = await ensureYtdlpCookiesFile();
  const buildCandidates = (argLine) => (process.platform === 'win32'
    ? [
      { cmd: 'yt-dlp.exe', args: argLine },
      { cmd: 'yt-dlp', args: argLine },
      { cmd: 'python', args: ['-m', 'yt_dlp', ...argLine] },
      { cmd: 'py', args: ['-m', 'yt_dlp', ...argLine] },
    ]
    : [
      { cmd: 'yt-dlp', args: argLine },
      { cmd: 'python3', args: ['-m', 'yt_dlp', ...argLine] },
      { cmd: 'python', args: ['-m', 'yt_dlp', ...argLine] },
    ]);

  /** @type {Error | null} */
  let lastErr = null;
  for (const fsel of fAttempts) {
    const argLine = ytdlpGetUrlArgs(fsel, videoUrl);
    if (cookiesFile) {
      argLine.splice(argLine.length - 1, 0, '--cookies', cookiesFile);
    }
    const candidates = buildCandidates(argLine);
    for (const c of candidates) {
      try {
        const { stdout, stderr } = await execFileAsync(c.cmd, c.args, {
          maxBuffer: 10 * 1024 * 1024,
        });
        const line = String(stdout)
          .split('\n')
          .map((s) => s.trim())
          .find(Boolean);
        if (!line) {
          const e = new Error('yt-dlp bos cikti');
          e.code = 'YTDLP_EMPTY';
          e.detail = (stderr && String(stderr).trim()) || '';
          throw e;
        }
        return line;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        const code = /** @type {any} */ (lastErr).code;
        if (code === 'ENOENT' || isMissingPythonYtdlp(lastErr)) {
          continue;
        }
        break;
      }
    }
  }

  const e = lastErr || new Error('yt-dlp calistirilamadi');
  if (/** @type {any} */ (e).code === 'ENOENT') {
    /** @type {any} */ (e).code = 'YTDLP_NOT_FOUND';
  }
  throw e;
}
