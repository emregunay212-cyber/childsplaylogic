/* ============================================
   KELİMELİK — Ağ katmanı (Online 1v1)
   Doğrudan Firebase RTDB: rooms/kelimelik/{kod}. (Altın Avı gibi; multiplayer.js DEĞİL.)
   Aktif-oyuncu yetkili model: sırası gelen oyuncu doğrulayıp yeni durumu yazar,
   rakip dinleyip yeniden çizer. Torba RTDB'de; sıra dönüşümlü olduğu için tutarlı.
   Veritabanı (B6): iframe SDK/config yüklemez; hub'ın köprüsü `window.parent.BilnetBridge.ready()`
   verir (js/firebase-config.js). Bağımsız açılışta (parent yok) online desteklenmez (Karar 6):
   `inHub()` false → game.js düğmeleri kapatıp hub bağlantısı gösterir.
   ============================================ */
const KelimelikNet = (() => {
  let db = null, fb = null, myId = null, myName = 'Oyuncu', roomCode = null, roomRef = null, cb = null, dcRef = null, roomListener = null;
  let hubBridge = null;   // parent.BilnetBridge (hub içindeyken); çapraz-origin/eksik → null

  function readBridge() {
    try {
      if (window.parent === window || !window.parent) return null;
      const b = window.parent.BilnetBridge;
      return (b && typeof b.ready === 'function') ? b : null;
    } catch (e) { return null; }   // çapraz-origin parent: erişim SecurityError fırlatır
  }
  function inHub() { return !!hubBridge; }
  function ready() { return !!db; }
  function genId() { return 'p' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
  // createdAt sunucu damgası (js/janitor.js bayatlığı sunucu saatine göre ölçer); köprü yoksa istemci saati.
  function serverTs() { try { return fb.database.ServerValue.TIMESTAMP; } catch (e) { return Date.now(); } }

  // Köprü hazır olunca çözülür; asla reddetmez (db null = online kapalı, alıştırma açık).
  async function init() {
    myId = genId();
    hubBridge = readBridge();
    db = null; fb = null;
    if (hubBridge) {
      try {
        db = (await hubBridge.ready()) || null;
        fb = hubBridge.firebase || null;
      } catch (e) { db = null; fb = null; }
    }
    try { myName = (hubBridge ? hubBridge.displayName() : (localStorage.getItem('mp_name') || 'Oyuncu')).slice(0, 16); } catch (e) { myName = 'Oyuncu'; }
    return ready();
  }

  // initialState: ağ-dışı (engine) tarafından üretilen başlangıç oda gövdesi (host için)
  async function create(buildInitial) {
    if (!ready()) throw new Error('no-db');
    // benzersiz kod bul
    for (let tries = 0; tries < 6; tries++) {
      const code = genCode();
      const ref = db.ref('rooms/kelimelik/' + code);
      const snap = await ref.once('value');
      if (snap.exists()) continue;
      roomCode = code; roomRef = ref;
      await ref.set(buildInitial(myId, myName));
      // host beklerken bağlantı koparsa odayı sil
      dcRef = roomRef.onDisconnect(); dcRef.remove();
      return code;
    }
    throw new Error('code-fail');
  }

  // guest: WAITING odaya katıl. dealFn(room) → güncel patch (racks/turn/state vb.) döndürür.
  async function join(code, dealFn) {
    if (!ready()) throw new Error('no-db');
    code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const ref = db.ref('rooms/kelimelik/' + code);
    const snap = await ref.once('value');
    const room = snap.val();
    if (!room) throw new Error('not-found');
    if (room.state !== 'WAITING') throw new Error('started');
    if ((room.pids || []).length >= 2) throw new Error('full');
    roomCode = code; roomRef = ref;
    const patch = dealFn(room, myId, myName);   // racks dağıt + turn + PLAYING
    await ref.update(patch);
    dcRef = roomRef.child('leftBy').onDisconnect(); dcRef.set(myId);  // koparsa rakibe bildir
    return room;
  }

  async function quick(buildInitial, dealFn) {
    if (!ready()) throw new Error('no-db');
    let list = null;
    try { list = await db.ref('rooms/kelimelik').orderByChild('state').equalTo('WAITING').once('value'); } catch (e) {}
    let target = null;
    if (list) list.forEach(ch => { const r = ch.val(); if (!target && r && (r.pids || []).length === 1 && r.hostId !== myId) target = ch.key; });
    if (target) { await join(target, dealFn); return { joined: true, code: target }; }
    const code = await create(buildInitial); return { joined: false, code };
  }

  function subscribe(fn) {
    cb = fn;
    if (!roomRef) return;
    if (roomListener) roomRef.off('value', roomListener);
    roomListener = s => { try { cb(s.val()); } catch (e) {} };
    roomRef.on('value', roomListener);
  }
  function update(patch) { if (roomRef) return roomRef.update(patch); }

  function leave() {
    try {
      if (dcRef) { try { dcRef.cancel(); } catch (e) {} }
      if (roomRef) {
        roomRef.off();
        // bekleyen oda ise sil; oynanan oda ise rakibe ayrıldığını bildir
        roomRef.once('value').then(s => {
          const r = s.val(); if (!r) return;
          if (r.state === 'WAITING') roomRef.remove().catch(() => {});
          else roomRef.update({ leftBy: myId }).catch(() => {});
        }).catch(() => {});
      }
    } catch (e) {}
    roomRef = null; roomCode = null; cb = null; roomListener = null;
  }

  return {
    init, create, join, quick, subscribe, update, leave, serverTs, inHub,
    myId: () => myId, myName: () => myName, code: () => roomCode, hasDB: () => ready()
  };
})();
