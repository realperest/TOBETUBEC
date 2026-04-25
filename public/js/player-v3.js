(function () {
  const path = String(window.location.pathname || '');
  const selfFile = path.replace(/^.*\//, '') || 'player-v3-innertube-canvas.html';
  const video = document.getElementById('hiddenVideo');
  const canvas = document.getElementById('viewCanvas');
  if (!video || !canvas) {
    return;
  }
  const ctx = canvas.getContext('2d');
  function qParam() {
    return 'auto';
  }
  function id() {
    return new URLSearchParams(window.location.search).get('videoId') || '';
  }
  function showPlaybackError(reason) {
    const shell = document.getElementById('videoShell');
    if (!shell) {
      return;
    }
    const old = shell.querySelector('.player-error');
    if (old) {
      old.remove();
    }
    const box = document.createElement('div');
    box.className = 'player-error';
    box.textContent = 'V3 Canvas akisi baslatilamadi: ' + reason;
    shell.appendChild(box);
  }
  function pickFormat(formats, q) {
    if (!formats || formats.length === 0) {
      return null;
    }
    const list = formats.filter(function (f) {
      return f && f.url && /video/i.test(String(f.mimeType || ''));
    });
    const use = list.length ? list : formats;
    function h(f) {
      const m = /(\d+)/.exec(String(f.quality || ''));
      return m ? parseInt(m[1], 10) : 0;
    }
    const sorted = use.slice().sort(function (a, b) {
      return h(b) - h(a);
    });
    if (q === 'auto') {
      return sorted[0] || formats[0];
    }
    const cap = { 480: 480, 720: 720, 1080: 1080 }[q] || 720;
    let best = null;
    for (let i = 0; i < sorted.length; i += 1) {
      if (h(sorted[i]) <= cap && h(sorted[i]) > 0) {
        best = sorted[i];
        break;
      }
    }
    return best || sorted[0] || formats[0];
  }
  async function loadSug(seedQuery) {
    const v = id();
    if (!v) {
      return;
    }
    const r = await fetch('/api/suggestions/' + encodeURIComponent(v), { credentials: 'include' });
    if (!r.ok) {
      return;
    }
    const list = await r.json();
    const ul = document.getElementById('sugList');
    if (!ul) {
      return;
    }
    ul.textContent = '';
    let count = 0;
    (list || []).forEach(function (s) {
      if (!s || !s.id) {
        return;
      }
      if (String(s.id) === String(v)) {
        return;
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '/players/' + selfFile + '?videoId=' + encodeURIComponent(String(s.id));
      a.innerHTML = '<img src="' + (s.thumbnail || '').replace(/"/g, '&quot;') + '" alt="" width="120" height="68" />' + '<div><h4>' + (s.title || '').replace(/</g, '&lt;') + '</h4><p>' + (s.channel || '').replace(/</g, '&lt;') + '</p></div>';
      li.appendChild(a);
      ul.appendChild(li);
      count += 1;
    });
    if (count === 0 && seedQuery) {
      const r2 = await fetch('/api/search?q=' + encodeURIComponent(seedQuery), { credentials: 'include' });
      if (!r2.ok) {
        return;
      }
      const d2 = await r2.json();
      (d2.videos || []).slice(0, 24).forEach(function (s) {
        if (!s || !s.id || String(s.id) === String(v)) {
          return;
        }
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '/players/' + selfFile + '?videoId=' + encodeURIComponent(String(s.id));
        a.innerHTML = '<img src="' + (s.thumbnail || '').replace(/"/g, '&quot;') + '" alt="" width="120" height="68" />' + '<div><h4>' + (s.title || '').replace(/</g, '&lt;') + '</h4><p>' + (s.channel || '').replace(/</g, '&lt;') + '</p></div>';
        li.appendChild(a);
        ul.appendChild(li);
      });
    }
  }
  function loop() {
    if (ctx && video.readyState >= 2) {
      const w = canvas.clientWidth || 1280;
      const h2 = Math.floor((w * 9) / 16);
      canvas.width = w;
      canvas.height = h2;
      try {
        ctx.drawImage(video, 0, 0, w, h2);
      } catch (e) {
        void 0;
      }
    }
    requestAnimationFrame(loop);
  }
  function bindPauseToggle() {
    const onToggle = function () {
      if (video.paused) {
        void video.play();
      } else {
        video.pause();
      }
    };
    canvas.addEventListener('click', onToggle);
    canvas.addEventListener('touchend', function (e) {
      e.preventDefault();
      onToggle();
    }, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space') {
        e.preventDefault();
        onToggle();
      }
    });
  }
  (async function go() {
    const v = id();
    if (!v) {
      return;
    }
    void loadSug('teknoloji inceleme');
    try {
      const r = await fetch('/api/ytdlp/stream/' + encodeURIComponent(v) + '?quality=best', { credentials: 'include' });
      if (r.ok) {
        const yd = await r.json();
        if (yd && yd.url) {
          video.src = yd.url;
        }
      }
      if (!video.src) {
        const r2 = await fetch('/api/video/' + encodeURIComponent(v), { credentials: 'include' });
        if (!r2.ok) {
          showPlaybackError('/api/video HTTP ' + r2.status);
          return;
        }
        const d = await r2.json();
        void loadSug((d && (d.title || d.channel)) ? String(d.title || d.channel) : 'teknoloji inceleme');
        const f = pickFormat(d.formats || [], qParam());
        if (!f || !f.url) {
          showPlaybackError('Oynatilabilir format bulunamadi');
          return;
        }
        video.src = f.url;
      }
      video.muted = false;
      video.preload = 'auto';
      video.load();
      if (window.TobeTubeBuffer && typeof window.TobeTubeBuffer.installHtml5 === 'function') {
        window.TobeTubeBuffer.installHtml5(video, {
          fallbackStream: function () {
            return fetch('/api/ytdlp/stream/' + encodeURIComponent(v) + '?quality=480', { credentials: 'include' })
              .then(function (r) {
                return r.ok ? r.json() : null;
              })
              .then(function (d) {
                return d && d.url ? d.url : null;
              });
          },
        });
      }
      if (window.TobeTubeBuffer && typeof window.TobeTubeBuffer.safePlay === 'function') {
        await window.TobeTubeBuffer.safePlay(video);
      } else {
        await video.play();
      }
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      window.console && window.console.error && window.console.error('v3 play error', err);
      showPlaybackError(msg);
      return;
    }
    if (window.TobeTubeChrome && window.TobeTubeChrome.setAdapter) {
      window.TobeTubeChrome.setAdapter({
        getCurrentTime: function () {
          return video.currentTime;
        },
        getDuration: function () {
          return (isFinite(video.duration) && video.duration) || 0;
        },
        seek: function (s) {
          video.currentTime = s;
        },
        setRate: function (r) {
          video.playbackRate = r;
        },
        setVolume: function (v) {
          video.volume = v;
        },
        getVolume: function () {
          return video.volume;
        },
        setMuted: function (m) {
          video.muted = Boolean(m);
        },
        getMuted: function () {
          return Boolean(video.muted);
        },
        play: function () {
          return video.play();
        },
        pause: function () {
          video.pause();
        },
        isPaused: function () {
          return video.paused;
        },
      });
    }
    bindPauseToggle();
    void loop();
  })();
}());
