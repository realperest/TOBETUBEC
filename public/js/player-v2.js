(function () {
  const path = String(window.location.pathname || '');
  const selfFile = path.replace(/^.*\//, '') || 'player-v2-innertube-dash.html';
  const video = document.getElementById('media');
  if (!video || !window.shaka) {
    return;
  }
  shaka.polyfill.installAll();
  const player = new shaka.Player(video);
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
    box.textContent = 'V2 oynatma baslatilamadi: ' + reason;
    shell.appendChild(box);
  }
  function showV2ExperimentalBlocked(detail) {
    const shell = document.getElementById('videoShell');
    if (!shell) {
      return;
    }
    const old = shell.querySelector('.player-error');
    if (old) {
      old.remove();
    }
    const vid = id();
    const q = qParam();
    const box = document.createElement('div');
    box.className = 'player-error player-error-v2';
    const p1 = document.createElement('p');
    p1.textContent = 'V2 (DASH + Shaka) deneysel: YouTube tarafı çoğu videoda imza, bölge veya cihaz kısıtı uyguluyor; kütüphane tam uyum (ör. po_token) olmadan güvenilir çalışmayabilir. ' + String(detail || '');
    const p2 = document.createElement('p');
    p2.className = 'v2-alt-wrap';
    const tPre = document.createTextNode('Şimdilik: ');
    p2.appendChild(tPre);
    const a1 = document.createElement('a');
    a1.href = '/players/player-v1-iframe.html?videoId=' + encodeURIComponent(vid) + '&q=' + encodeURIComponent(q);
    a1.textContent = 'V1 (iframe)';
    p2.appendChild(a1);
    p2.appendChild(document.createTextNode(' · '));
    const a2 = document.createElement('a');
    a2.href = '/players/player-v3-innertube-canvas.html?videoId=' + encodeURIComponent(vid) + '&q=' + encodeURIComponent(q);
    a2.textContent = 'V3 (canvas)';
    p2.appendChild(a2);
    p2.appendChild(document.createTextNode(' · '));
    const a3 = document.createElement('a');
    a3.href = '/players/player-v4-innertube-webgl.html?videoId=' + encodeURIComponent(vid) + '&q=' + encodeURIComponent(q);
    a3.textContent = 'V4';
    p2.appendChild(a3);
    box.appendChild(p1);
    box.appendChild(p2);
    shell.appendChild(box);
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
        a.href = '/players/' + selfFile + '?videoId=' + encodeURIComponent(String(s.id)) + '&q=' + encodeURIComponent(qParam());
        a.innerHTML = '<img src="' + (s.thumbnail || '').replace(/"/g, '&quot;') + '" alt="" width="120" height="68" />' + '<div><h4>' + (s.title || '').replace(/</g, '&lt;') + '</h4><p>' + (s.channel || '').replace(/</g, '&lt;') + '</p></div>';
        li.appendChild(a);
        ul.appendChild(li);
      });
    }
  }
  function pickByHeight(shakaPlayer, target) {
    const ts = shakaPlayer.getVariantTracks() || [];
    if (!ts || ts.length === 0) {
      return;
    }
    if (target <= 0) {
      return;
    }
    const sorted = ts.slice().sort(function (a, b) {
      return (b.height || 0) - (a.height || 0);
    });
    for (let i = 0; i < sorted.length; i += 1) {
      if ((sorted[i].height || 0) <= target) {
        shakaPlayer.selectVariantTrack(sorted[i], true, 0.1);
        return;
      }
    }
    shakaPlayer.selectVariantTrack(sorted[sorted.length - 1], true, 0.1);
  }
  function bindPauseToggle() {
    const onToggle = function () {
      if (video.paused) {
        void video.play();
      } else {
        video.pause();
      }
    };
    video.addEventListener('click', onToggle);
    video.addEventListener('touchend', function (e) {
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
  async function go() {
    const v = id();
    if (!v) {
      return;
    }
    void loadSug('teknoloji inceleme');
    try {
      const streamTuning =
        window.TobeTubeBuffer && typeof window.TobeTubeBuffer.shakaStreamingBlock === 'function'
          ? window.TobeTubeBuffer.shakaStreamingBlock()
          : {
              retryParameters: {
                maxAttempts: 2,
                baseDelay: 250,
                backoffFactor: 2,
                fuzzFactor: 0.5,
                timeout: 8000,
              },
              bufferingGoal: 20,
              rebufferingGoal: 8,
              bufferBehind: 20,
            };
      await player.configure({
        manifest: {
          retryParameters: {
            maxAttempts: 2,
            baseDelay: 250,
            backoffFactor: 2,
            fuzzFactor: 0.5,
            timeout: 6000,
          },
        },
        streaming: streamTuning,
      });
      const r = await fetch('/api/video/' + encodeURIComponent(v), { credentials: 'include' });
      if (!r.ok) {
        showPlaybackError('/api/video HTTP ' + r.status);
        return;
      }
      const d = await r.json();
      void loadSug((d && (d.title || d.channel)) ? String(d.title || d.channel) : 'teknoloji inceleme');
      const dashUrl = d && d.dashManifestUrl
        ? new URL(d.dashManifestUrl, window.location.origin).href
        : null;
      const hlsUrl = d && d.hlsManifestUrl
        ? new URL(d.hlsManifestUrl, window.location.origin).href
        : null;
      if (!dashUrl && !hlsUrl) {
        showPlaybackError('Manifest bulunamadi');
        return;
      }
      const q = qParam();
      let loaded = false;
      let blobRevoke = null;
      if (dashUrl) {
        const dr = await fetch(dashUrl, { credentials: 'include' });
        if (!dr.ok) {
          showV2ExperimentalBlocked('DASH manifesti alınamadı (HTTP ' + dr.status + ').');
          return;
        }
        const dxml = await dr.text();
        if (!dxml || (dxml.indexOf('<MPD') < 0 && dxml.indexOf('<mpd') < 0)) {
          showV2ExperimentalBlocked('Geçerli DASH (MPD) cevabı yok; sunucu YouTube hatası üretiyor olabilir.');
          return;
        }
        blobRevoke = URL.createObjectURL(new Blob([dxml], { type: 'application/dash+xml' }));
        try {
          await player.load(blobRevoke);
          loaded = true;
        } catch (dashErr) {
          if (blobRevoke) {
            try {
              URL.revokeObjectURL(blobRevoke);
            } catch (e) {
              void e;
            }
            blobRevoke = null;
          }
          window.console && window.console.warn && window.console.warn('v2 DASH shaka hatasi, HLS deneniyor', dashErr);
        }
      }
      if (!loaded) {
        if (!hlsUrl) {
          showV2ExperimentalBlocked('DASH oynatılamadı ve HLS yolu yok veya yetersiz.');
          return;
        }
        const hr = await fetch(hlsUrl, { credentials: 'include' });
        if (!hr.ok) {
          showV2ExperimentalBlocked('HLS oynatma listesi alınamadı (HTTP ' + hr.status + '). YouTube bölge veya imza engeli olabilir.');
          return;
        }
        const hm3 = await hr.text();
        if (!hm3 || hm3.indexOf('#EXTM3U') < 0) {
          showV2ExperimentalBlocked('HLS listesi geçersiz.');
          return;
        }
        const hlsBlob = URL.createObjectURL(new Blob([hm3], { type: 'application/vnd.apple.mpegurl' }));
        try {
          await player.load(hlsBlob);
          loaded = true;
        } catch (hlsErr) {
          try {
            URL.revokeObjectURL(hlsBlob);
          } catch (e) {
            void e;
          }
          window.console && window.console.error && window.console.error('v2 hls shaka', hlsErr);
          showV2ExperimentalBlocked('HLS açıldı ama oynatma/segment aşamasında hata (önceki sebeplere benzer).');
          return;
        }
      }
      if (!loaded) {
        showV2ExperimentalBlocked('Beklenmeyen durum: oynatma başlamadı.');
        return;
      }
      const oldError = document.querySelector('#videoShell .player-error');
      if (oldError) {
        oldError.remove();
      }
      if (q === 'auto') {
        await player.configure({
          abr: { enabled: true },
          streaming: streamTuning,
        });
      } else {
        await player.configure({
          abr: { enabled: false },
          streaming: streamTuning,
        });
        const cap = { 480: 480, 720: 720, 1080: 1080 }[q] || 720;
        pickByHeight(player, cap);
      }
      video.preload = 'auto';
      video.muted = false;
      video.defaultMuted = false;
      video.volume = 1;
      await video.play();
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      window.console && window.console.error && window.console.error('v2 play error', err);
      if (msg.indexOf('1001') >= 0 || msg.indexOf('HTTP') >= 0) {
        showV2ExperimentalBlocked('Oynatıcı: ' + msg);
      } else {
        showPlaybackError(msg);
      }
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
  }
  player.addEventListener('error', function (e) {
    window.console && window.console.error && window.console.error('shaka', e);
  });
  void go();
}());
