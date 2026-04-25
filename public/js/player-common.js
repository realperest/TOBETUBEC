(function () {
  const PlayersByFile = {
    'player-v3-innertube-canvas': 3,
    'player-v4-innertube-webgl': 4,
    'player-v5-ytdlp-proxy': 5,
  };
  const FileByNum = {
    3: 'player-v3-innertube-canvas',
    4: 'player-v4-innertube-webgl',
    5: 'player-v5-ytdlp-proxy',
  };
  const LS_V = 'tobetube_default_v';
  const LS_Q = 'tobetube_default_q';
  const LS_HISTORY = 'tobetube_watch_history_v1';
  let adapter = {
    getCurrentTime: function () {
      return 0;
    },
    getDuration: function () {
      return 0;
    },
    seek: function (s) {
      void s;
    },
    setRate: function (r) {
      void r;
    },
    setVolume: function (v) {
      void v;
    },
    getVolume: function () {
      return 1;
    },
    setMuted: function (m) {
      void m;
    },
    getMuted: function () {
      return false;
    },
    play: function () {
      return Promise.resolve();
    },
    pause: function () {},
    isPaused: function () {
      return false;
    },
  };
  const $prog = document.getElementById('progress');
  const $fill = document.getElementById('progressFill');
  const $buf = document.getElementById('progressBuffered');
  const $time = document.getElementById('timeText');
  const $disc = document.getElementById('disconnect');
  const $fs = document.getElementById('fsBtn');
  const $vol = document.getElementById('volumeBtn');
  const $speedBtn = document.getElementById('speedBtn');
  const $speedMenu = document.getElementById('speedMenu');
  const $volumeRange = document.getElementById('volumeRange');
  if (!$prog || !$fill || !$time || !$disc || !$fs) {
    return;
  }
  function html5BufferedEndSeconds(video) {
    if (!video || !video.buffered || !video.buffered.length) {
      return 0;
    }
    const t = video.currentTime;
    const b = video.buffered;
    let i;
    for (i = 0; i < b.length; i += 1) {
      if (t >= b.start(i) && t < b.end(i)) {
        return b.end(i);
      }
    }
    let maxAhead = 0;
    for (i = 0; i < b.length; i += 1) {
      if (b.end(i) > t) {
        maxAhead = Math.max(maxAhead, b.end(i));
      }
    }
    if (maxAhead > 0) {
      return maxAhead;
    }
    for (i = 0; i < b.length; i += 1) {
      if (b.start(i) > t) {
        maxAhead = Math.max(maxAhead, b.end(i));
      }
    }
    return maxAhead;
  }
  function getBufferedEndSeconds() {
    if (adapter.getBufferedEnd && typeof adapter.getBufferedEnd === 'function') {
      const v = adapter.getBufferedEnd();
      if (typeof v === 'number' && isFinite(v) && v >= 0) {
        return v;
      }
    }
    const m = document.getElementById('hiddenVideo') || document.getElementById('media');
    if (m) {
      return html5BufferedEndSeconds(m);
    }
    return 0;
  }
  function wireMediaBufferEvents() {
    const m = document.getElementById('hiddenVideo') || document.getElementById('media');
    if (!m || m._ttBufUiWire || !m.addEventListener) {
      return;
    }
    m._ttBufUiWire = true;
    m.addEventListener('progress', tick);
  }
  setTimeout(wireMediaBufferEvents, 0);
  setTimeout(wireMediaBufferEvents, 800);
  setTimeout(wireMediaBufferEvents, 2500);
  const pathName = String(window.location.pathname || '');
  const fileBase = pathName.replace(/^.*\//, '').replace(/\.html$/, '') || 'player-v3-innertube-canvas';
  const currentN = PlayersByFile[fileBase] || 2;
  function params() {
    return new URLSearchParams(window.location.search);
  }
  function videoId() {
    return (params().get('videoId') || '').trim();
  }
  function recordWatchHistory() {
    const id = videoId();
    if (!id) {
      return;
    }
    fetch('/api/video/' + encodeURIComponent(id), { credentials: 'include' })
      .then(function (r) {
        if (!r.ok) {
          return null;
        }
        return r.json();
      })
      .then(function (d) {
        if (!d || !d.id) {
          return;
        }
        let cur = [];
        try {
          const raw = localStorage.getItem(LS_HISTORY);
          const parsed = raw ? JSON.parse(raw) : [];
          cur = Array.isArray(parsed) ? parsed : [];
        } catch (err) {
          void err;
        }
        const next = cur.filter(function (x) {
          return x && x.id && x.id !== d.id;
        });
        next.unshift({
          id: d.id,
          title: d.title || '',
          thumbnail: 'https://i.ytimg.com/vi/' + encodeURIComponent(String(d.id)) + '/hqdefault.jpg',
          channel: d.channel || '',
          duration: '',
          isLive: Boolean(d.isLive),
          watchedAt: Date.now(),
          source: 'player',
        });
        try {
          localStorage.setItem(LS_HISTORY, JSON.stringify(next.slice(0, 80)));
        } catch (err) {
          void err;
        }
      })
      .catch(function (err) {
        void err;
      });
  }
  function startT() {
    const t0 = params().get('t');
    const t = t0 == null || t0 === '' ? 0 : parseInt(t0, 10);
    return Number.isNaN(t) || t < 0 ? 0 : t;
  }
  function getQ() {
    return 'auto';
  }
  function getDefaultV() {
    const s = String(localStorage.getItem(LS_V) || '3');
    const n = parseInt(s, 10);
    if (n >= 3 && n <= 5) {
      return n;
    }
    return 3;
  }
  function urlToVersion(n) {
    const f = FileByNum[n] || 'player-v3-innertube-canvas';
    return '/players/' + f + '.html?videoId=' + encodeURIComponent(videoId());
  }
  function setNavState() {
    const v = getDefaultV();
    document.querySelectorAll('.nav-v').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-v') === String(currentN) ? 'true' : 'false');
    });
    if (v === currentN) {
    }
  }
  document.querySelectorAll('.nav-v').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const n = parseInt(btn.getAttribute('data-v') || '2', 10);
      if (n < 3 || n > 5) {
        return;
      }
      if (n !== currentN) {
        try {
          adapter.pause();
        } catch (e) {
          void 0;
        }
        localStorage.setItem(LS_V, String(n));
        window.location.href = urlToVersion(n);
      }
    });
  });
  const hbtn = document.getElementById('mainHome');
  if (hbtn) {
    hbtn.addEventListener('click', function () {
      try {
        adapter.pause();
      } catch (e) {
        void 0;
      }
      const u = new URL(window.location.origin + '/');
      u.searchParams.set('t', String(Math.floor(adapter.getCurrentTime() || 0)));
      u.searchParams.set('resume', videoId());
      window.location.href = u.pathname + u.search;
    });
  }
  let progDrag = false;
  function onProg(ev) {
    if (!ev) {
      return;
    }
    const rect = $prog.getBoundingClientRect();
    const x = (ev.clientX != null ? ev.clientX : (ev.touches && ev.touches[0] && ev.touches[0].clientX)) - rect.left;
    const p = Math.max(0, Math.min(1, x / Math.max(1, rect.width)));
    const d = adapter.getDuration();
    adapter.seek(p * d);
  }
  $prog.addEventListener('click', onProg);
  $prog.addEventListener('pointerdown', function (e) {
    progDrag = true;
    onProg(e);
  });
  window.addEventListener('pointerup', function () {
    progDrag = false;
  });
  $prog.addEventListener('pointermove', function (e) {
    if (progDrag) {
      onProg(e);
    }
  });
  let t0s = 0;
  let t0x = 0;
  const shell = document.getElementById('videoShell') || $prog;
  shell.addEventListener('touchstart', function (e) {
    if (!e.touches || !e.touches[0]) {
      return;
    }
    t0s = e.timeStamp;
    t0x = e.touches[0].clientX;
  });
  shell.addEventListener('touchend', function (e) {
    if (!e.changedTouches || !e.changedTouches[0]) {
      return;
    }
    const dx = e.changedTouches[0].clientX - t0x;
    const dt = e.timeStamp - t0s;
    if (dt < 500 && (dx > 50 || dx < -50)) {
      const cur = adapter.getCurrentTime();
      if (dx > 0) {
        adapter.seek(Math.max(0, cur - 10));
      } else {
        adapter.seek(cur + 10);
      }
    }
  });
  let lastSyncedPlaybackRate = -1;
  function setSpeedMenuVisible(show) {
    if (!$speedMenu) {
      return;
    }
    $speedMenu.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  setSpeedMenuVisible(false);
  function syncSpeedButtonHighlight(rate) {
    const r = Number(rate);
    if (!Number.isFinite(r) || r <= 0) {
      return;
    }
    if ($speedBtn) {
      $speedBtn.textContent = (Math.abs(r - 1) < 0.01 ? 'Normal' : String(r) + 'x');
    }
    const buttons = document.querySelectorAll('.speed-opt');
    if (!buttons || buttons.length === 0) {
      return;
    }
    let best = null;
    let bestDiff = Infinity;
    buttons.forEach(function (b) {
      const pr = parseFloat(b.getAttribute('data-rate') || '1');
      const d = Math.abs(pr - r);
      if (d < bestDiff) {
        bestDiff = d;
        best = b;
      }
    });
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
    });
    if (best && bestDiff < 0.201) {
      best.setAttribute('aria-pressed', 'true');
    }
  }
  document.querySelectorAll('.speed-opt').forEach(function (b) {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      const r = parseFloat(b.getAttribute('data-rate') || '1');
      adapter.setRate(r);
      const media = document.getElementById('hiddenVideo') || document.getElementById('media');
      if (media && typeof media.playbackRate === 'number') {
        media.playbackRate = r;
      }
      syncSpeedButtonHighlight(r);
      setSpeedMenuVisible(false);
    });
  });
  if ($speedBtn) {
    $speedBtn.addEventListener('click', function () {
      if (!$speedMenu) {
        return;
      }
      const isOpen = $speedMenu.getAttribute('aria-hidden') === 'false';
      setSpeedMenuVisible(!isOpen);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e && e.key === 'Escape') {
      setSpeedMenuVisible(false);
    }
  });
  document.addEventListener('click', function (ev) {
    if (!$speedMenu || !$speedBtn) {
      return;
    }
    const t = ev.target;
    if (!t || !(t instanceof Element)) {
      return;
    }
    if (t === $speedBtn || $speedMenu.contains(t)) {
      return;
    }
    setSpeedMenuVisible(false);
  });
  syncSpeedButtonHighlight(1);
  $fs.addEventListener('click', function () {
    const el = document.getElementById('videoShell') || document.body;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });
  if ($vol) {
    $vol.addEventListener('click', function () {
      const muted = !(adapter.getMuted && adapter.getMuted()) ? true : false;
      if (adapter.setMuted) {
        adapter.setMuted(muted);
      }
      $vol.textContent = muted ? '🔇' : '🔊';
    });
  }
  if ($volumeRange) {
    $volumeRange.addEventListener('input', function () {
      const v = Math.max(0, Math.min(1, parseFloat(String($volumeRange.value || '1'))));
      if (adapter.setVolume) {
        adapter.setVolume(v);
      }
      if ($vol) {
        $vol.textContent = v <= 0.001 ? '🔇' : '🔊';
      }
    });
  }
  function tick() {
    const cur = adapter.getCurrentTime();
    const d = Math.max(0, adapter.getDuration() || 0);
    const p = d > 0 ? cur / d : 0;
    $fill.style.width = (Math.min(1, p) * 100).toFixed(2) + '%';
    if ($buf) {
      const bEnd = getBufferedEndSeconds();
      const bp = d > 0 && isFinite(bEnd) && bEnd > 0 ? Math.min(1, bEnd / d) : 0;
      $buf.style.width = (Math.min(1, bp) * 100).toFixed(2) + '%';
    }
    const a = function (n) {
      const x = Math.floor(n);
      const m = Math.floor(x / 60);
      const s = x % 60;
      return String(m) + ':' + (s < 10 ? '0' : '') + String(s);
    };
    $time.textContent = a(cur) + ' / ' + a(d);
    const m = document.getElementById('hiddenVideo') || document.getElementById('media');
    if (m && typeof m.playbackRate === 'number' && m.playbackRate > 0) {
      if (Math.abs(m.playbackRate - lastSyncedPlaybackRate) > 0.02) {
        lastSyncedPlaybackRate = m.playbackRate;
        syncSpeedButtonHighlight(m.playbackRate);
      }
    }
  }
  setInterval(tick, 500);
  window.addEventListener('online', function () {
    if ($disc) {
      $disc.setAttribute('aria-hidden', 'true');
    }
  });
  window.addEventListener('offline', function () {
    if ($disc) {
      $disc.setAttribute('aria-hidden', 'false');
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      try {
        adapter.pause();
      } catch (e) {
        void 0;
      }
    }
  });
  recordWatchHistory();
  setNavState();
  window.TobeTubeChrome = {
    setAdapter: function (a) {
      if (a && typeof a.getCurrentTime === 'function') {
        adapter = a;
        if ($volumeRange && adapter.getVolume) {
          const v = adapter.getVolume();
          if (typeof v === 'number' && isFinite(v)) {
            $volumeRange.value = String(Math.max(0, Math.min(1, v)));
          }
        }
        if ($vol && adapter.getMuted) {
          $vol.textContent = adapter.getMuted() ? '🔇' : '🔊';
        }
        setTimeout(wireMediaBufferEvents, 0);
        const t = startT();
        if (t > 0) {
          setTimeout(function () {
            a.seek(t);
          }, 200);
        }
        setTimeout(function () {
          const media = document.getElementById('hiddenVideo') || document.getElementById('media');
          if (media && typeof media.playbackRate === 'number' && media.playbackRate > 0) {
            lastSyncedPlaybackRate = media.playbackRate;
            syncSpeedButtonHighlight(media.playbackRate);
          } else {
            syncSpeedButtonHighlight(1);
          }
        }, 0);
        setTimeout(function () {
          const media = document.getElementById('hiddenVideo') || document.getElementById('media');
          if (media && typeof media.playbackRate === 'number' && media.playbackRate > 0) {
            lastSyncedPlaybackRate = media.playbackRate;
            syncSpeedButtonHighlight(media.playbackRate);
          }
        }, 400);
      }
    },
    getStartTime: function () {
      return startT();
    },
    getVideoId: function () {
      return videoId();
    },
    getQuality: function () {
      return getQ();
    },
  };
}());
