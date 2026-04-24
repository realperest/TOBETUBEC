/**
 * YouTube stream / manifest uç noktaları gerçek tarayıcı User-Agent'ı ve Referer
 * beklemezse 403 dönebiliyor. Node veya hatalı Range başlıkları listelerde sorun çıkarıyor.
 */
export const YT_CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** HLS master / manifest.googlevideo.com çoğunlukla mobil YouTube uygulaması imzası ister. */
export const YT_IOS_APP_UA =
  'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';

export const YT_ANDROID_APP_UA =
  'com.google.android.youtube/21.03.36(Linux; U; Android 16; tr_TR) gzip';

/**
 * @param {import('express').Request|undefined} req
 * @param {{ referer?: string, visitorId?: string }} [opts]
 * @returns {Record<string, string>}
 */
export function youtubeUpstreamHeaders(req, opts = {}) {
  const referer = opts.referer != null ? opts.referer : 'https://www.youtube.com/';
  const al = req && req.headers['accept-language'] ? String(req.headers['accept-language']) : 'en-US,en;q=0.9,tr;q=0.8';
  const h = {
    'User-Agent': YT_CHROME_UA,
    Referer: referer,
    Origin: String(referer).includes('m.youtube.com') ? 'https://m.youtube.com' : 'https://www.youtube.com',
    Accept: '*/*',
    'Accept-Language': al,
  };
  if (opts.visitorId) {
    h['X-Goog-Visitor-Id'] = String(opts.visitorId);
  }
  if (opts.userAgent) {
    h['User-Agent'] = String(opts.userAgent);
  }
  return h;
}
