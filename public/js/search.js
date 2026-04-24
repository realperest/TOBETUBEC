(function () {
  const $in = document.getElementById('searchInput');
  const $go = document.getElementById('searchRun');
  const $v = document.getElementById('voiceSearch');
  if (!$in || !$go || !$v) {
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  function runSearch() {
    if (window.TobeTubeApp && typeof window.TobeTubeApp.runSearchFromUi === 'function') {
      window.TobeTubeApp.runSearchFromUi();
    }
  }
  $go.addEventListener('click', function () {
    runSearch();
  });
  $in.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  });
  if (SpeechRecognition) {
    $v.addEventListener('click', function () {
      const rec = new SpeechRecognition();
      rec.lang = 'tr-TR';
      rec.onresult = function (ev) {
        const t = ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript;
        if (t) {
          $in.value = t;
        }
        runSearch();
      };
      rec.onerror = function (err) {
        window.console && window.console.error && window.console.error('ses', err);
      };
      try {
        rec.start();
      } catch (e) {
        window.console && window.console.error && window.console.error('rec', e);
      }
    });
  } else {
    $v.setAttribute('disabled', 'true');
    $v.title = 'Bu tarayicida destek yok';
  }
}());
