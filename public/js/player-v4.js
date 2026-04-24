(function () {
  const path = String(window.location.pathname || '');
  const selfFile = path.replace(/^.*\//, '') || 'player-v4-innertube-webgl.html';
  const video = document.getElementById('hiddenVideo');
  const canvas = document.getElementById('glCanvas');
  if (!video || !canvas) {
    return;
  }
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: false });
  if (!gl) {
    return;
  }
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(
    vs,
    'attribute vec2 a; varying vec2 v; void main(){ v=a*0.5+0.5; gl_Position=vec4(a,0,1);} ',
  );
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(
    fs,
    'precision mediump float; uniform sampler2D t; varying vec2 v; void main(){ vec2 uv=vec2(v.x,1.0-v.y); gl_FragColor=texture2D(t,uv);} ',
  );
  gl.compileShader(fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  function qParam() {
    return String(new URLSearchParams(window.location.search).get('q') || 'auto');
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
    box.textContent = 'V4 WebGL akisi baslatilamadi: ' + reason;
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
    for (let i = 0; i < sorted.length; i += 1) {
      if (h(sorted[i]) <= cap && h(sorted[i]) > 0) {
        return sorted[i];
      }
    }
    return sorted[0] || formats[0];
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
      a.href = '/players/' + selfFile + '?videoId=' + encodeURIComponent(String(s.id)) + '&q=' + encodeURIComponent(qParam());
      a.innerHTML = '<img src="' + (s.thumbnail || '').replace(/"/g, '&quot;') + '" alt="" width="120" height="68" /><div><h4>' + (s.title || '').replace(/</g, '&lt;') + '</h4><p>' + (s.channel || '').replace(/</g, '&lt;') + '</p></div>';
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
        a.href = '/players/' + selfFile + '?videoId=' + encodeURIComponent(String(s.id)) + '&q=' + encodeURIComponent(qParam());
        a.innerHTML = '<img src="' + (s.thumbnail || '').replace(/"/g, '&quot;') + '" alt="" width="120" height="68" /><div><h4>' + (s.title || '').replace(/</g, '&lt;') + '</h4><p>' + (s.channel || '').replace(/</g, '&lt;') + '</p></div>';
        li.appendChild(a);
        ul.appendChild(li);
      });
    }
  }
  function loop() {
    const w = canvas.clientWidth || 1280;
    const h2 = Math.floor((w * 9) / 16);
    if (canvas.width !== w) {
      canvas.width = w;
    }
    if (canvas.height !== h2) {
      canvas.height = h2;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (video.readyState >= 2) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
  (async function () {
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
      video.preload = 'auto';
      video.muted = false;
      video.defaultMuted = false;
      video.volume = 1;
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
      window.console && window.console.error && window.console.error('v4 play error', err);
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
