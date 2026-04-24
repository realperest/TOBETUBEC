import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import express from 'express';
import session from 'express-session';
import compression from 'compression';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { WebSocketServer } from 'ws';

import authRouter from './routes/auth.js';
import trendingRouter from './routes/trending.js';
import searchRouter from './routes/search.js';
import videoRouter from './routes/video.js';
import suggestionsRouter from './routes/suggestions.js';
import proxyRouter from './routes/proxy.js';
import ytdlRouter from './routes/ytdl.js';
import quotaRouter from './routes/quota.js';
import { logError, logInfo } from './lib/log.js';
import { isGoogleOAuthEnabled } from './lib/oauthConfig.js';

dotenv.config({ override: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const app = express();
const port = parseInt(String(process.env.PORT || '3000'), 10);

if (!process.env.SESSION_SECRET) {
  logError('SESSION_SECRET yok; .env örneğini kopyalayın', new Error('SESSION_SECRET'), {});
}

app.set('trust proxy', 1);
app.use(compression({ threshold: 1024 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    name: 'tobetube.sid',
    secret: process.env.SESSION_SECRET || 'dev-unsafe-secret-degistir',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: isProd,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

if (isGoogleOAuthEnabled()) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_REDIRECT_URI,
      },
      (accessToken, refreshToken, profile, done) => {
        const picture = Array.isArray(profile.photos) && profile.photos[0] && profile.photos[0].value
          ? String(profile.photos[0].value)
          : null;
        const user = {
          id: profile.id,
          name: profile.displayName || 'Kullanici',
          picture,
        };
        return done(null, user);
      },
    ),
  );
} else {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    logError(
      'Google OAuth: GOOGLE_REDIRECT_URI gecerli ve dolu olmali (https://.../auth/callback). Simdi devre disi.',
      new Error('OAuth eksik alan'),
      {},
    );
  } else {
    logInfo('Google OAuth yok: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI gerekir', {});
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, t: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/api/trending', trendingRouter);
app.use('/api/search', searchRouter);
app.use('/api/video', videoRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/ytdlp', ytdlRouter);
app.use('/api/quota', quotaRouter);
app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProd ? '1d' : 0 }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).send('Bulunamadi');
  }
  return res.status(404).json({ error: 'Bulunamadi' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  logError('express istek hatasi', err instanceof Error ? err : new Error(String(err)), {
    path: req.path,
    method: req.method,
  });
  res.status(500).type('text').send('Internal Server Error');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  if (!req.url || !req.url.startsWith('/ws')) {
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});
wss.on('connection', (ws) => {
  const t = setInterval(() => {
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
      } catch (e) {
        logError('ws ping', e instanceof Error ? e : new Error(String(e)));
      }
    }
  }, 11_000);
  ws.on('message', (raw) => {
    try {
      const j = JSON.parse(String(raw));
      if (j && j.type === 'pong') {
        return;
      }
    } catch {
    }
  });
  ws.on('close', () => clearInterval(t));
  ws.on('error', (err) => {
    logError('ws hata', err);
    clearInterval(t);
  });
});

server.listen(port, () => {
  logInfo('Sunucu dinliyor', { port });
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logError('unhandledRejection', err);
});
process.on('uncaughtException', (err) => {
  logError('uncaughtException', err);
});
