(function () {
  const el = document.getElementById('quotaLabel');
  if (!el) {
    return;
  }
  async function tick() {
    try {
      const r = await fetch('/api/quota', { credentials: 'include' });
      if (r.status === 401) {
        el.textContent = '0/100';
        return;
      }
      const d = await r.json();
      if (d && (typeof d.used === 'number' || typeof d.limit === 'number')) {
        const u = d.used;
        const l = d.limit;
        el.textContent = String(u) + '/' + String(l);
      }
    } catch (e) {
      window.console && window.console.error && window.console.error('quota', e);
    }
  }
  window.TobeTubeQuota = { tick: tick };
  void tick();
}());
