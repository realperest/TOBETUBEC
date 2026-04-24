(function () {
  function bufferedSecondsAhead(video) {
    if (!video || !video.buffered || video.buffered.length === 0) {
      return 0;
    }
    var t = video.currentTime;
    var i;
    for (i = 0; i < video.buffered.length; i += 1) {
      if (t >= video.buffered.start(i) && t < video.buffered.end(i)) {
        return Math.max(0, video.buffered.end(i) - t);
      }
    }
    return 0;
  }

  var PREREAD_TARGET_S = 20;
  var NUDGE_INTERVAL_MS = 2500;
  var STALL_DEBOUNCE_MS = 3500;

  function installPrereadNudge(video) {
    if (!video) {
      return;
    }
    video.setAttribute('preload', 'auto');
    video.preload = 'auto';
    setInterval(function () {
      if (video.paused || video.ended) {
        return;
      }
      if (!isFinite(video.duration) || video.duration <= 0) {
        return;
      }
      var ahead = bufferedSecondsAhead(video);
      if (ahead < PREREAD_TARGET_S) {
        try {
          void video.play();
        } catch (err) {
          if (window.console && window.console.warn) {
            window.console.warn('TobeTubeBuffer preread', err);
          }
        }
      }
    }, NUDGE_INTERVAL_MS);
  }

  var ARM_FALLBACK_MS = 8000;

  function installStallRecovery(video, fetchFallbackUrl) {
    if (!video || typeof fetchFallbackUrl !== 'function') {
      return;
    }
    var recovering = false;
    var lastRecover = 0;
    var allowSrcSwap = false;
    video.addEventListener(
      'playing',
      function onFirstPlay() {
        allowSrcSwap = true;
        video.removeEventListener('playing', onFirstPlay);
      },
    );
    setTimeout(function () {
      allowSrcSwap = true;
    }, ARM_FALLBACK_MS);
    function tryRecover() {
      if (!allowSrcSwap) {
        return;
      }
      if (recovering) {
        return;
      }
      var now = Date.now();
      if (now - lastRecover < STALL_DEBOUNCE_MS) {
        return;
      }
      lastRecover = now;
      recovering = true;
      Promise.resolve()
        .then(function () {
          return fetchFallbackUrl();
        })
        .then(function (url) {
          if (!url || typeof url !== 'string') {
            return;
          }
          var resumeAt = Math.max(0, Number(video.currentTime) || 0);
          video.src = url;
          video.load();
          if (resumeAt > 0.5) {
            video.currentTime = resumeAt;
          }
          return video.play();
        })
        .catch(function (err) {
          if (window.console && window.console.error) {
            window.console.error('TobeTubeBuffer stall', err);
          }
        })
        .finally(function () {
          recovering = false;
        });
    }
    // 'waiting' = normal ara tampon; burada src/load yapmak play() sözünü keser
    // (The play() request was interrupted by a new load request)
    video.addEventListener('stalled', tryRecover);
  }

  function safePlay(video) {
    if (!video || typeof video.play !== 'function') {
      return Promise.resolve();
    }
    return video.play().catch(function (err) {
      var m = err && err.message ? String(err.message) : String(err);
      if (m.indexOf('interrupted') >= 0 || m.indexOf('load request') >= 0) {
        return new Promise(function (resolve, reject) {
          requestAnimationFrame(function () {
            video.play().then(resolve).catch(reject);
          });
        });
      }
      throw err;
    });
  }

  window.TobeTubeBuffer = {
    safePlay: safePlay,
    shakaStreamingBlock: function () {
      return {
        lowLatencyMode: false,
        segmentPrefetchLimit: 2,
        retryParameters: {
          maxAttempts: 3,
          baseDelay: 200,
          backoffFactor: 2,
          fuzzFactor: 0.5,
          timeout: 10000,
        },
        bufferingGoal: 50,
        rebufferingGoal: 4,
        bufferBehind: 48,
      };
    },
    installHtml5: function (video, options) {
      options = options || {};
      if (!video) {
        return;
      }
      installPrereadNudge(video);
      if (options.fallbackStream) {
        installStallRecovery(video, options.fallbackStream);
      }
    },
  };
}());
