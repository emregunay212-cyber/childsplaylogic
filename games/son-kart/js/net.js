/* ============================================
   SON KART — Ağ katmanı (Online 2-4 kişi)
   Firebase RTDB: rooms/son-kart/{kod}. (Kelimelik deseninin N-oyuncu genellemesi;
   multiplayer.js DEĞİL.) Aktif-oyuncu yetkili: sırası gelen oyuncu yeni durumu yazar.
   Katılma yarış-koşulu için transaction; kopma için presence + .info/connected re-arm.
   Veritabanı (B6): iframe SDK/config yüklemez; hub'ın köprüsü `window.parent.BilnetBridge.ready()`
   verir (js/firebase-config.js). Bağımsız açılışta (parent yok) online desteklenmez (Karar 6):
   `inHub()` false → main.js/ui.js düğmeleri kapatıp hub bağlantısı gösterir; solo çalışır.
   ============================================ */
const SonKartNet = (() => {
  const ROOT = 'rooms/son-kart/';
  let db = null, fb = null, myId = null, myName = 'Oyuncu';
  let roomCode = null, roomRef = null, cb = null, roomListener = null;
  let connRef = null, dcRoom = null;
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
  function norm(c) { return (c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  // createdAt sunucu damgası (js/janitor.js bayatlığı sunucu saatine göre ölçer); köprü yoksa istemci saati.
  function serverTs() { try { return fb.database.ServerValue.TIMESTAMP; } catch (e) { return Date.now(); } }

  // Köprü hazır olunca çözülür; asla reddetmez (db null = online kapalı, solo açık).
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

  // presence/{myId}=true + onDisconnect false; .info/connected ile yeniden kurulur.
  function armPresence() {
    if (!roomRef || !myId) return;
    const pRef = roomRef.child('presence/' + myId);
    const arm = () => { try { pRef.onDisconnect().set(false); pRef.set(true); } catch (e) {} };
    arm();
    if (!connRef) {
      connRef = db.ref('.info/connected');
      connRef.on('value', s => { if (s.val() === true) arm(); });
    }
  }

  // host: yeni WAITING oda. buildInitial(myId,myName) → başlangıç oda gövdesi.
  async function create(buildInitial) {
    if (!ready()) throw new Error('no-db');
    for (let tries = 0; tries < 6; tries++) {
      const code = genCode();
      const ref = db.ref(ROOT + code);
      const snap = await ref.once('value');
      if (snap.exists()) continue;
      roomCode = code; roomRef = ref;
      await ref.set(buildInitial(myId, myName));
      dcRoom = roomRef.onDisconnect(); dcRoom.remove();   // host beklerken koparsa oda silinsin
      armPresence();
      return code;
    }
    throw new Error('code-fail');
  }

  // guest: WAITING odaya transaction ile koltuk ekleyerek katıl.
  async function join(code) {
    if (!ready()) throw new Error('no-db');
    code = norm(code);
    const ref = db.ref(ROOT + code);
    const res = await ref.transaction(room => {
      if (!room) return room;                       // yok → abort (aşağıda ayrıştır)
      if (room.state !== 'WAITING') return;          // başlamış → abort
      room.pids = room.pids || [];
      if (room.pids.indexOf(myId) >= 0) return room; // zaten içerideyim
      if (room.pids.length >= 4) return;             // dolu → abort
      room.pids.push(myId);
      room.names = room.names || {};
      room.names[myId] = myName;
      return room;
    });
    if (!res.committed) {
      const snap = await ref.once('value'); const r = snap.val();
      if (!r) throw new Error('not-found');
      if (r.state !== 'WAITING') throw new Error('started');
      throw new Error('full');
    }
    roomCode = code; roomRef = ref;
    armPresence();
    return res.snapshot.val();
  }

  async function quick(buildInitial) {
    if (!ready()) throw new Error('no-db');
    let list = null;
    try { list = await db.ref('rooms/son-kart').orderByChild('state').equalTo('WAITING').once('value'); } catch (e) {}
    let target = null;
    if (list) list.forEach(ch => {
      const r = ch.val();
      if (!target && r && r.state === 'WAITING' && (r.pids || []).length >= 1 && (r.pids || []).length < 4 && r.hostId !== myId) target = ch.key;
    });
    if (target) { try { const room = await join(target); return { joined: true, code: target, room }; } catch (e) {} }
    const code = await create(buildInitial);
    return { joined: false, code };
  }

  // host oyunu başlatınca: bekleme-silme onDisconnect'ini iptal et (PLAYING oda kalıcı).
  function cancelRoomDisconnect() { try { if (dcRoom) dcRoom.cancel(); } catch (e) {} dcRoom = null; }

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
      if (connRef) { connRef.off(); connRef = null; }
      if (roomRef) {
        const pRef = roomRef.child('presence/' + myId);
        try { pRef.onDisconnect().cancel(); } catch (e) {}
        pRef.set(false).catch(() => {});
        cancelRoomDisconnect();
        roomRef.off();
        roomRef.once('value').then(s => {
          const r = s.val(); if (!r) return;
          if (r.state === 'WAITING') {
            if (r.hostId === myId) roomRef.remove().catch(() => {});
            else roomRef.transaction(room => {
              if (!room || room.state !== 'WAITING') return room;
              room.pids = (room.pids || []).filter(p => p !== myId);
              if (room.names) delete room.names[myId];
              return room;
            }).catch(() => {});
          }
          // PLAYING: presence=false yeterli; koltuğu host/yetkili deactivate eder (main.js).
        }).catch(() => {});
      }
    } catch (e) {}
    roomRef = null; roomCode = null; cb = null; roomListener = null;
  }

  return {
    init, create, join, quick, subscribe, update, leave, cancelRoomDisconnect, serverTs, inHub,
    myId: () => myId, myName: () => myName, code: () => roomCode, hasDB: () => ready()
  };
})();
