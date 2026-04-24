/**
 * Google OAuth için tüm gerekli değişkenler ve geçerli https/http callback URL.
 */
export function isGoogleOAuthEnabled() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const uri = process.env.GOOGLE_REDIRECT_URI;
  if (!id || !secret || !String(uri).trim()) {
    return false;
  }
  try {
    const p = new URL(String(uri).trim());
    return p.protocol === 'http:' || p.protocol === 'https:';
  } catch {
    return false;
  }
}
