/**
 * @param {any} v
 * @returns {object|null}
 */
export function mapSearchVideoNode(v) {
  if (!v) {
    return null;
  }
  if (!v.id) {
    return null;
  }
  let titleText = '';
  if (v.title && v.title.text != null) {
    titleText = String(v.title.text);
  } else if (v.heading) {
    titleText = typeof v.heading === 'string' ? v.heading : String((v.heading && v.heading.text) || '');
  }
  const thumb = v.best_thumbnail?.url
    || (v.thumbnails && v.thumbnails[0] && v.thumbnails[0].url)
    || '';
  const channel = (v.author && v.author.name) ? String(v.author.name) : '';
  const publishedAt = (v.published && v.published.text) ? String(v.published.text) : '';
  return {
    id: String(v.id),
    title: titleText,
    thumbnail: thumb,
    channel,
    duration: (v.duration && v.duration.text != null) ? String(v.duration.text) : '',
    viewCount: (v.view_count && v.view_count.text) ? String(v.view_count.text) : (v.short_view_count && v.short_view_count.text) ? String(v.short_view_count.text) : '',
    publishedAt,
    isLive: Boolean(v.is_live),
  };
}

/**
 * @param {{title?: string, channel?: string}|null|undefined} item
 * @returns {boolean}
 */
export function isMusicLikeContent(item) {
  if (!item) {
    return false;
  }
  const t = String(item.title || '').toLowerCase();
  const c = String(item.channel || '').toLowerCase();
  const x = `${t} ${c}`;
  const re = /(music|müzik|official audio|lyric|lyrics|remix|cover|sped up|nightcore|playlist|radio|lofi|akustik|acoustic|konser|live session|şarkı|türkçe pop|hip hop|rap|beat)/i;
  return re.test(x);
}

/**
 * Cloudflare / Railway gibi ters vekillerde orijinal https host için.
 * @param {import('express').Request} req
 * @returns {string}
 */
export function getRequestPublicBaseUrl(req) {
  if (!req || typeof req.get !== 'function') {
    return '';
  }
  const rawProto = String(req.get('x-forwarded-proto') || '')
    .split(',')[0]
    .trim();
  const proto = rawProto || (req.protocol || 'http');
  const host = String(
    (req.get('x-forwarded-host') || req.get('host') || '')).trim();
  if (!host) {
    return '';
  }
  return `${proto}://${host}`;
}

/**
 * @param {import('express').Request} req
 * @param {string} directUrl
 * @returns {string}
 */
export function toProxyStreamUrl(req, directUrl) {
  if (!directUrl) {
    return directUrl;
  }
  if (!String(directUrl).includes('googlevideo.com')) {
    return directUrl;
  }
  const base = getRequestPublicBaseUrl(req) || `${req.protocol}://${req.get('host')}`;
  return `${base}/api/proxy/stream?url=${encodeURIComponent(directUrl)}`;
}
