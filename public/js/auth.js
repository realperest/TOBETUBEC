(function () {
  const $login = document.getElementById('googleLogin');
  const $logout = document.getElementById('googleLogout');
  const $line = document.getElementById('userLine');
  const $msg = document.getElementById('authMessage');
  if (!$login || !$logout || !$line || !$msg) {
    return;
  }
  function setHidden(el, h) {
    if (h) {
      el.classList.add('hidden');
    } else {
      el.classList.remove('hidden');
    }
  }
  function showAuthParams() {
    const p = new URLSearchParams(window.location.search);
    if (p.get('auth') === 'hata') {
      $msg.textContent = 'Giriş hatası; tekrar deneyin.';
      $msg.setAttribute('aria-hidden', 'false');
      setHidden($msg, false);
    } else if (p.get('auth') === 'tamam') {
      $msg.textContent = 'Giriş tamam';
      $msg.setAttribute('aria-hidden', 'false');
      setHidden($msg, false);
      p.delete('auth');
      const s = p.toString();
      window.history.replaceState({}, document.title, s ? '?' + s : window.location.pathname);
    } else {
      $msg.setAttribute('aria-hidden', 'true');
      setHidden($msg, true);
    }
  }
  async function load() {
    const r = await fetch('/auth/status', { credentials: 'include' });
    const d = await r.json();
    if (d && d.loggedIn && d.user) {
      setHidden($login, true);
      setHidden($logout, false);
      setHidden($line, false);
      $line.textContent = d.user.name || 'Kullanıcı';
    } else {
      setHidden($login, false);
      setHidden($logout, true);
      setHidden($line, true);
      $line.textContent = '';
    }
    showAuthParams();
  }
  $login.addEventListener('click', function () {
    window.location.href = '/auth/google';
  });
  $logout.addEventListener('click', function () {
    window.location.href = '/auth/logout';
  });
  window.TobeTubeAuth = { refresh: load };
  void load();
}());
