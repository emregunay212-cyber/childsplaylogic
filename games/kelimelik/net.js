/* ============================================
   KELİMELİK — Ağ katmanı (Online 1v1)
   Doğrudan Firebase RTDB: rooms/kelimelik/{kod}. (Altın Avı gibi; multiplayer.js DEĞİL.)
   Aktif-oyuncu yetkili model: sırası gelen oyuncu doğrulayıp yeni durumu yazar,
   rakip dinleyip yeniden çizer. Torba RTDB'de; sıra dönüşümlü olduğu için tutarlı.
   ============================================ */
const KelimelikNet = (() => {
  let db = null, myId = null, myName = 'Oyuncu', roomCode = null, roomRef = null, cb = null, dcRef = null, roomListener = null;

  function ready() { db = db || window.KL_DB || null; return !!db; }
  function genId() { return 'p' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }

  function init() {
    ready();
    myId = genId();
    try { myName = (localStorage.getItem('mp_name') || 'Oyuncu').slice(0, 16); } catch (e) { myName = 'Oyuncu'; }
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
    init, create, join, quick, subscribe, update, leave,
    myId: () => myId, myName: () => myName, code: () => roomCode, hasDB: () => ready()
  };
})();
