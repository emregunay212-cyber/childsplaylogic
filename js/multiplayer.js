/* ── Multiplayer Connection Manager ── */
const Multiplayer = (() => {
  let ws = null;
  let playerId = null;
  let connected = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT = 3;
  const handlers = new Map();
  let onConnectCb = null;
  let onDisconnectCb = null;

  const WS_URL = `ws://${location.hostname || 'localhost'}:3001`;

  function connect() {
    return new Promise((resolve, reject) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        return resolve();
      }
      try {
        ws = new WebSocket(WS_URL);
      } catch (e) {
        return reject(e);
      }

      ws.onopen = () => {
        connected = true;
        reconnectAttempts = 0;
        if (onConnectCb) onConnectCb();
        resolve();
      };

      ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        const { type, ...data } = msg;
        if (type === 'WELCOME') {
          playerId = data.playerId;
        }
        const cbs = handlers.get(type);
        if (cbs) cbs.forEach(cb => cb(data));
      };

      ws.onclose = () => {
        connected = false;
        if (onDisconnectCb) onDisconnectCb();
        if (reconnectAttempts < MAX_RECONNECT) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 8000);
          setTimeout(() => {
            connect().catch(() => {});
          }, delay);
        }
      };

      ws.onerror = () => {
        if (!connected) reject(new Error('Baglanti hatasi'));
      };
    });
  }

  function disconnect() {
    reconnectAttempts = MAX_RECONNECT; // prevent auto reconnect
    if (ws) {
      ws.close();
      ws = null;
    }
    connected = false;
    playerId = null;
  }

  function send(type, payload = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...payload }));
    }
  }

  function on(type, callback) {
    if (!handlers.has(type)) handlers.set(type, []);
    handlers.get(type).push(callback);
  }

  function off(type, callback) {
    if (!handlers.has(type)) return;
    if (callback) {
      const cbs = handlers.get(type);
      const i = cbs.indexOf(callback);
      if (i >= 0) cbs.splice(i, 1);
    } else {
      handlers.delete(type);
    }
  }

  function offAll() {
    handlers.clear();
  }

  function isConnected() { return connected; }
  function getPlayerId() { return playerId; }

  function onConnect(cb) { onConnectCb = cb; }
  function onDisconnect(cb) { onDisconnectCb = cb; }

  return { connect, disconnect, send, on, off, offAll, isConnected, getPlayerId, onConnect, onDisconnect };
})();
