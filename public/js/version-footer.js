(function () {
  const updates = [
    { id: '260424.0046', text: 'buffer-tune: waiting\'de src değişimi kaldırıldı (play interrupted); stall + ilk oynatma koruması' },
    { id: '260424.0043', text: 'İlerleme çubuğunda tampon (buffer) göstergesi: YT getVideoLoadedFraction + HTML5 buffered' },
    { id: '260424.0038', text: 'Tampon düzeltmesi: Shaka abr+streaming birlikte; HTML5\'te ahead=0 iken nudge' },
    { id: '260424.0034', text: 'Tesla/ geniş ekran responsive (tesla-viewport), Shaka 50s buffer + HTML5 ön tampon' },
    { id: '260424.0028', text: 'Tüm oynatıcılarda seçili çalma hızı vurgusu (renk, çerçeve, aria-pressed)' },
    { id: '260423.0003', text: 'Kota, WebSocket heartbeat, CORS proxy' },
    { id: '260423.0002', text: 'InnerTube, Shaka, Canvas, WebGL, yt-dlp yolları' },
  ];
  const el = document.getElementById('versionFooter') || document.getElementById('versionFooterP');
  if (!el) {
    return;
  }
  const v = document.body.getAttribute('data-page-version') || '260423.0001';
  const lastSeen = String(localStorage.getItem('ver_seen') || '');
  const isNew = lastSeen !== updates[0].id;
  if (isNew) {
    localStorage.setItem('ver_seen', updates[0].id);
  }
  const cur = document.createElement('div');
  cur.className = 'cur' + (isNew ? ' is-new' : '');
  cur.textContent = v;
  el.appendChild(cur);
  const u = document.createElement('ul');
  updates.forEach((row, i) => {
    const li = document.createElement('li');
    li.className = 'newest' + (i === 0 && isNew ? ' unread' : '');
    if (i === 0) {
      li.setAttribute('style', 'font-weight:700;');
    }
    li.textContent = row.id + ' — ' + row.text;
    u.appendChild(li);
  });
  el.appendChild(u);
}());
