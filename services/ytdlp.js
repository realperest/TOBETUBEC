import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

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
 * yt-dlp ile tek bir doğrudan indirme URL’si (veya hata) döner.
 * @param {string} videoId
 * @param {string} [quality]
 * @returns {Promise<string>}
 */
export async function getStreamUrlWithYtdlp(videoId, quality) {
  const fsel = formatSelector(quality);
  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const args = ['-g', '-f', fsel, '--no-warnings', videoUrl];
  const candidates = process.platform === 'win32'
    ? [
      { cmd: 'yt-dlp.exe', args },
      { cmd: 'yt-dlp', args },
      { cmd: 'python', args: ['-m', 'yt_dlp', ...args] },
      { cmd: 'py', args: ['-m', 'yt_dlp', ...args] },
    ]
    : [
      { cmd: 'yt-dlp', args },
      { cmd: 'python3', args: ['-m', 'yt_dlp', ...args] },
      { cmd: 'python', args: ['-m', 'yt_dlp', ...args] },
    ];

  /** @type {Error | null} */
  let lastErr = null;
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
      if (code !== 'ENOENT' && !isMissingPythonYtdlp(lastErr)) {
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
