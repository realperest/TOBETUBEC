(function () {
  const $gridH = document.getElementById('panelHome');
  const $gridHistory = document.getElementById('panelHistory');
  const tabHome = document.getElementById('tabHome');
  const tabHist = document.getElementById('tabHistory');
  const $sheet = document.getElementById('qualitySheet');
  const $title = document.getElementById('qualitySheetTitle');
  const $mainHome = document.getElementById('mainHome');
  const $catRow = document.getElementById('catRow');
  if (
    !$gridH ||
    !$gridHistory ||
    !tabHome ||
    !tabHist ||
    !$sheet ||
    !$title ||
    !$mainHome ||
    !$catRow
  ) {
    return;
  }
  const LS_V = 'tobetube_default_v';
  const LS_Q = 'tobetube_default_q';
  const LS_HISTORY = 'tobetube_watch_history_v1';
  const PLAYER_FILES = {
    1: 'player-v1-iframe',
    2: 'player-v2-innertube-dash',
    3: 'player-v3-innertube-canvas',
    4: 'player-v4-innertube-webgl',
    5: 'player-v5-ytdlp-proxy',
  };
  const catQueries = {
    tumu: null,
    haber: 'haber gündem',
    oyun: 'oyun oynanış',
    teknoloji: 'teknoloji inceleme',
    spor: 'spor özeti',
  };
  let selectedVideoId = null;
  let currentCat = 'tumu';
  let openVersion = 2;
  let lastHomeVideoIds = [];
  function getDefaultV() {
    const s = String(localStorage.getItem(LS_V) || '2');
    const n = parseInt(s, 10);
    if (n >= 1 && n <= 5) {
      return n;
    }
    return 2;
  }
  function getDefaultQ() {
    return String(localStorage.getItem(LS_Q) || 'auto');
  }
  function setDefault(v, q) {
    if (v >= 1 && v <= 5) {
      localStorage.setItem(LS_V, String(v));
    }
    if (q) {
      localStorage.setItem(LS_Q, String(q));
    }
  }
  function playerUrlFor(v, q, id) {
    const file = PLAYER_FILES[v] || PLAYER_FILES[2];
    const u = new URL('/players/' + file + '.html', window.location.origin);
    u.searchParams.set('videoId', id);
    u.searchParams.set('q', q);
    return u.toString();
  }
  function loadHistoryList() {
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(function (x) {
        return x && x.id && x.source === 'player';
      });
    } catch (err) {
      void err;
      return [];
    }
  }
  function loadHistoryPanel() {
    const rows = loadHistoryList();
    fillGrid($gridHistory, rows);
  }
  function oneCard(x, $parentGrid) {
    const a = document.createElement('button');
    a.type = 'button';
    a.className = 'card';
    a.setAttribute('data-id', x.id);
    a.setAttribute('aria-pressed', 'false');
    a.innerHTML =
      '<div class="thumb"><img src="' +
      escapeAttr(x.thumbnail) +
      '" alt="" />' +
      (x.isLive
        ? '<span class="live" aria-label="yayin">LIVE</span>'
        : '') +
      (x.duration
        ? '<span class="dur">' + escapeText(x.duration) + '</span>'
        : '') +
      '</div><div class="caption"><h3>' +
      escapeText(x.title) +
      '</h3><p>' +
      escapeText(x.channel || '') +
      '</p></div>';
    a.addEventListener('click', function () {
      $parentGrid.querySelectorAll('.card[aria-pressed="true"]').forEach(function (b) {
        b.setAttribute('aria-pressed', 'false');
      });
      a.setAttribute('aria-pressed', 'true');
      selectedVideoId = x.id;
      const v0 = getDefaultV();
      const q0 = getDefaultQ();
      window.location.href = playerUrlFor(v0, q0, x.id);
    });
    return a;
  }
  function escapeText(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    return escapeText(s).replace(/"/g, '&quot;');
  }
  function fillGrid($el, list) {
    $el.textContent = '';
    if (!list || list.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'Sonuç yok';
      $el.appendChild(p);
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(function (x) {
      frag.appendChild(oneCard(x, $el));
    });
    $el.appendChild(frag);
  }
  function showError(msg) {
    $gridH.textContent = '';
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = msg;
    $gridH.appendChild(p);
  }
  async function loadTrending() {
    const r = await fetch('/api/trending', { credentials: 'include' });
    if (r.status === 401) {
      showError('Giriş yapin');
      return;
    }
    if (!r.ok) {
      let msg = 'Içerik yüklenemedi';
      try {
        const e = await r.json();
        if (e && e.error) {
          msg = String(e.error);
        }
      } catch (err) {
        void err;
      }
      showError(msg);
      return;
    }
    const d = await r.json();
    lastHomeVideoIds = Array.isArray(d)
      ? d.map(function (x) { return x && x.id ? x.id : null; }).filter(Boolean)
      : [];
    fillGrid($gridH, d);
  }
  async function doSearchText(q) {
    const u = new URLSearchParams();
    u.set('q', q);
    const r = await fetch('/api/search?' + u.toString(), { credentials: 'include' });
    const d = await r.json();
    if (r.status === 401) {
      showError('Giriş yapin');
      return;
    }
    if (r.status === 429) {
      showError(d && d.error ? d.error : 'Limit');
      if (window.TobeTubeQuota && window.TobeTubeQuota.tick) {
        window.TobeTubeQuota.tick();
      }
      return;
    }
    if (!r.ok) {
      showError('Hata');
      if (window.TobeTubeQuota && window.TobeTubeQuota.tick) {
        window.TobeTubeQuota.tick();
      }
      return;
    }
    if (d && d.videos) {
      fillGrid($gridH, d.videos);
    }
    if (window.TobeTubeQuota && window.TobeTubeQuota.tick) {
      window.TobeTubeQuota.tick();
    }
  }
  function setTab(t) {
    if (t === 'home') {
      tabHome.setAttribute('aria-selected', 'true');
      tabHome.setAttribute('tabindex', '0');
      tabHist.setAttribute('aria-selected', 'false');
      tabHist.setAttribute('tabindex', '-1');
      $gridH.hidden = false;
      document.getElementById('panelHistory').hidden = true;
    } else {
      tabHome.setAttribute('aria-selected', 'false');
      tabHome.setAttribute('tabindex', '-1');
      tabHist.setAttribute('aria-selected', 'true');
      tabHist.setAttribute('tabindex', '0');
      $gridH.hidden = true;
      document.getElementById('panelHistory').hidden = false;
    }
  }
  tabHome.addEventListener('click', function () {
    setTab('home');
    if (currentCat === 'tumu') {
      void loadTrending();
    } else {
      const q0 = catQueries[currentCat] || 'video';
      void doSearchText(q0);
    }
  });
  tabHist.addEventListener('click', function () {
    setTab('hist');
    loadHistoryPanel();
  });
  $catRow.querySelectorAll('.cat-pill').forEach(function (b) {
    b.addEventListener('click', function () {
      $catRow.querySelectorAll('.cat-pill').forEach(function (x) {
        x.setAttribute('aria-pressed', 'false');
      });
      b.setAttribute('aria-pressed', 'true');
      currentCat = b.getAttribute('data-key') || 'tumu';
      if (currentCat === 'tumu') {
        void loadTrending();
      } else {
        const q0 = catQueries[currentCat] || 'video';
        void doSearchText(q0);
      }
    });
  });
  $mainHome.addEventListener('click', function () {
    window.location.href = '/';
  });
  $sheet.addEventListener('click', function (e) {
    if (e.target === $sheet) {
      $sheet.setAttribute('aria-hidden', 'true');
    }
  });
  function openQualitySheetFor(v) {
    openVersion = v;
    $title.textContent = 'V' + String(v) + ' kalite';
    $sheet.setAttribute('aria-hidden', 'false');
  }
  document.querySelectorAll('.nav-v').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const v = parseInt(btn.getAttribute('data-v') || '2', 10);
      openQualitySheetFor(v);
    });
  });
  $sheet.querySelectorAll('.q-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const q = String(btn.getAttribute('data-q') || 'auto');
      setDefault(openVersion, q);
      $sheet.setAttribute('aria-hidden', 'true');
      if (selectedVideoId) {
        const u = playerUrlFor(openVersion, q, selectedVideoId);
        try {
          window.__tobetubePause = true;
        } catch (e) {
          void 0;
        }
        window.location.href = u;
        return;
      }
      if (window.TobeTubeAuth && window.TobeTubeAuth.refresh) {
        window.TobeTubeAuth.refresh();
      }
    });
  });
  function runFromUi() {
    const t = (document.getElementById('searchInput') && document.getElementById('searchInput').value) || '';
    const t2 = String(t).trim();
    if (t2) {
      setTab('home');
      void doSearchText(t2);
    }
  }
  const initialQ = new URLSearchParams(window.location.search).get('q');
  if (initialQ && String(initialQ).trim()) {
    setTab('home');
    document.getElementById('searchInput').value = String(initialQ);
    void doSearchText(String(initialQ).trim());
  } else {
    void loadTrending();
  }
  loadHistoryPanel();
  window.TobeTubeApp = {
    runSearchFromUi: runFromUi,
  };
}());
