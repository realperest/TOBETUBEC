(function () {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = proto + '//' + window.location.host + '/ws';
  function connect() {
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      return;
    }
    ws.onmessage = function (ev) {
      try {
        const o = JSON.parse(String(ev.data));
        if (o && o.type === 'ping' && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'pong', t: o.t || Date.now() }));
        }
      } catch (err) {
        window.console && window.console.error && window.console.error('ws mesaj hatası', err);
      }
    };
    ws.onclose = function () {
      setTimeout(connect, 5000);
    };
  }
  connect();
}());
