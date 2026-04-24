(function () {
  let ytPlayer = null;
  const path = String(window.location.pathname || '');
  const selfFile = path.replace(/^.*\//, '') || 'player-v1-iframe.html';
  function vid() {
    return new URLSearchParams(window.location.search).get('videoId') || '';
  }
  function qParam() {
    return String(new URLSearchParams(window.location.search).get('q') || 'auto');
  }
  function applyQuality() {
    if (!ytPlayer || !ytPlayer.setPlaybackQuality) {
      return;
    }
    const q = qParam();
    const m = {
      480: 'large',
      720: 'hd720',
      1080: 'hd1080',
      auto: 'auto',
    }[q] || 'auto';
    try {
      ytPlayer.setPlaybackQuality(m);
    } catch (e) {
      window.console && window.console.error && window.console.error(e);
    }
  }
  async function loadSuggestions(seedQuery) {
    const id = vid();
    if (!id) {
      return;
    }
    const r = await fetch('/api/suggestions/' + encodeURIComponent(id), { credentials: 'include' });
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
    (list || []).forEach(function (v) {
      if (!v || !v.id) {
        return;
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '/players/' + selfFile + '?videoId=' + encodeURIComponent(String(v.id)) + '&q=' + encodeURIComponent(qParam());
      a.innerHTML = '<img src="' + (v.thumbnail || '').replace(/"/g, '&quot;') + '" alt="" width="120" height="68" />' + '<div><h4>' + (v.title || '').replace(/</g, '&lt;') + '</h4><p>' + (v.channel || '').replace(/</g, '&lt;') + '</p></div>';
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
      (d2.videos || []).slice(0, 24).forEach(function (x) {
        if (!x || !x.id || String(x.id) === String(id)) {
          return;
        }
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '/players/' + selfFile + '?videoId=' + encodeURIComponent(String(x.id)) + '&q=' + encodeURIComponent(qParam());
        a.innerHTML = '<img src="' + (x.thumbnail || '').replace(/"/g, '&quot;') + '" alt="" width="120" height="68" />' + '<div><h4>' + (x.title || '').replace(/</g, '&lt;') + '</h4><p>' + (x.channel || '').replace(/</g, '&lt;') + '</p></div>';
        li.appendChild(a);
        ul.appendChild(li);
      });
    }
  }
  function onYouTubeIframeAPIReady() {
    const id = vid();
    if (!id) {
      return;
    }
    if (!window.YT || !window.YT.Player) {
      return;
    }
    ytPlayer = new window.YT.Player('player', {
      height: '100%',
      width: '100%',
      videoId: id,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: function () {
          applyQuality();
          if (window.TobeTubeChrome && window.TobeTubeChrome.setAdapter) {
            window.TobeTubeChrome.setAdapter({
              getCurrentTime: function () {
                return (ytPlayer && ytPlayer.getCurrentTime && ytPlayer.getCurrentTime()) || 0;
              },
              getDuration: function () {
                return (ytPlayer && ytPlayer.getDuration && ytPlayer.getDuration()) || 0;
              },
              seek: function (s) {
                if (ytPlayer && ytPlayer.seekTo) {
                  ytPlayer.seekTo(s, true);
                }
              },
              setRate: function (r) {
                if (ytPlayer && ytPlayer.setPlaybackRate) {
                  ytPlayer.setPlaybackRate(r);
                }
              },
              play: function () {
                if (ytPlayer && ytPlayer.playVideo) {
                  ytPlayer.playVideo();
                }
                return Promise.resolve();
              },
              pause: function () {
                if (ytPlayer && ytPlayer.pauseVideo) {
                  ytPlayer.pauseVideo();
                }
              },
              isPaused: function () {
                if (ytPlayer && ytPlayer.getPlayerState) {
                  return ytPlayer.getPlayerState() === window.YT.PlayerState.PAUSED;
                }
                return false;
              },
              getBufferedEnd: function () {
                if (!ytPlayer || !ytPlayer.getVideoLoadedFraction || !ytPlayer.getDuration) {
                  return 0;
                }
                const f = ytPlayer.getVideoLoadedFraction();
                const dur = ytPlayer.getDuration();
                if (typeof f !== 'number' || !isFinite(f) || f < 0 || !isFinite(dur) || dur <= 0) {
                  return 0;
                }
                return f * dur;
              },
            });
          }
        },
        onStateChange: function (ev) {
          void ev;
        },
      },
    });
    fetch('/api/video/' + encodeURIComponent(id), { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        const seed = d && (d.title || d.channel) ? String(d.title || d.channel) : '';
        void loadSuggestions(seed || 'teknoloji');
      })
      .catch(function () {
        void loadSuggestions('teknoloji');
      });
  }
  window.TobeTubeV1 = true;
  if (window.YT && window.YT.Player) {
    onYouTubeIframeAPIReady();
  } else {
    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
  }
}());
