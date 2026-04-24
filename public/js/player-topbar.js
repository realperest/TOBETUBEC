(function () {
  const input = document.getElementById('searchInput');
  const run = document.getElementById('searchRun');
  const mic = document.getElementById('voiceSearch');
  if (!input || !run) {
    return;
  }
  function goSearch() {
    const q = String(input.value || '').trim();
    const u = new URL('/', window.location.origin);
    if (q) {
      u.searchParams.set('q', q);
    }
    window.location.href = u.toString();
  }
  run.addEventListener('click', goSearch);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      goSearch();
    }
  });
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (mic && SpeechRecognition) {
    mic.addEventListener('click', function () {
      const rec = new SpeechRecognition();
      rec.lang = 'tr-TR';
      rec.onresult = function (ev) {
        const t = ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript;
        if (t) {
          input.value = t;
        }
        goSearch();
      };
      try {
        rec.start();
      } catch (err) {
        void err;
      }
    });
  } else if (mic) {
    mic.disabled = true;
  }
}());
