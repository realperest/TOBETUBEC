import express from 'express';
import passport from 'passport';

const router = express.Router();

router.get(
  '/google',
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
