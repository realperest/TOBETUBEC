import express from 'express';
import passport from 'passport';
import { isGoogleOAuthEnabled } from '../lib/oauthConfig.js';

const router = express.Router();

function requireGoogleOauth(req, res, next) {
  if (!isGoogleOAuthEnabled()) {
    return res.status(503).type('text').send(
      'Google girisi bu ortamda yapilandirilmedi. Railway Variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ve tam HTTPS GOOGLE_REDIRECT_URI (ornek: https://x.up.railway.app/auth/callback) gerekir.',
    );
  }
  return next();
}

router.get(
  '/google',
  requireGoogleOauth,
  passport.authenticate('google', {
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
    accessType: 'offline',
    prompt: 'consent',
  }),
);

router.get(
  '/callback',
  requireGoogleOauth,
  passport.authenticate('google', { failureRedirect: '/?err=1' }),
  (req, res) => {
    res.redirect('/');
  },
);

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

router.get('/status', (req, res) => {
  const u = /** @type {any} */ (req.user);
  if (!u) {
    return res.json({ loggedIn: false, user: null });
  }
  return res.json({
    loggedIn: true,
    user: { name: u.name, avatar: u.picture || null },
  });
});

export default router;
