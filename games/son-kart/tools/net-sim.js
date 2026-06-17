/* ============================================
   SON KART — Online netcode simülasyonu (Node, bellek-içi sahte RTDB)
   Canlı Firebase'e erişmeden net.js'i gerçek akışla doğrular:
     - transaction ile çok-koltuklu katılma (2-4 oyuncu)
     - durum serileştirme gidiş-dönüşü (gsToRoom/roomToGs + RTDB boş-dizi→null)
     - host↔guest tam oyun "tel üzerinden" + subscribe senkronu
   Çalıştır: node games/son-kart/tools/net-sim.js
   ============================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Deck = require('../js/deck.js');
const Engine = require('../js/engine.js');
const Bot = require('../js/bot.js');

// ── main.js ile birebir aynı serileştirme sözleşmesi ──
function gsToRoom(gs) { return { pids: gs.pids, hands: gs.hands, deck: gs.deck, discard: gs.discard, curColor: gs.curColor, dir: gs.dir, turn: gs.turn, active: gs.active, saidUno: gs.saidUno, winner: gs.winner, last: gs.last, lastDrawn: gs.lastDrawn }; }
function roomToGs(r) { return { pids: r.pids || [], hands: r.hands || {}, deck: r.deck || [], discard: r.discard || [], curColor: r.curColor, dir: r.dir || 1, turn: r.turn, active: r.active || {}, saidUno: r.saidUno || {}, winner: r.winner || null, last: r.last || null, lastDrawn: (r.lastDrawn != null ? r.lastDrawn : null) }; }
function buildInitial(id, name) { const o = { hostId: id, state: 'WAITING', pids: [id], names: {} }; o.names[id] = name; return o; }

// ── Bellek-içi sahte RTDB (RTDB davranışını taklit eder, boş dizi/objeyi null'a indirger) ──
function makeMock() {
  const data = { '.info': { connected: true } };
  const listeners = [];
  const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  function stripEmpties(v) {
    if (Array.isArray(v)) { if (v.length === 0) return null; return v.map(x => (x === undefined ? null : stripEmpties(x))); }
    if (v && typeof v === 'object') { const o = {}; let n = 0; for (const k in v) { const sv = stripEmpties(v[k]); if (sv !== null && sv !== undefined) { o[k] = sv; n++; } } return n ? o : null; }
    return v;
  }
  const getNode = segs => { let c = data; for (const s of segs) { if (c == null) return undefined; c = c[s]; } return c; };
  function setNode(segs, val) {
    let c = data; for (let i = 0; i < segs.length - 1; i++) { const s = segs[i]; if (c[s] == null || typeof c[s] !== 'object') c[s] = {}; c = c[s]; }
    const last = segs[segs.length - 1]; const sv = stripEmpties(val);
    if (sv === null || sv === undefined) delete c[last]; else c[last] = sv;
  }
  function snap(segs) {
    return {
      val: () => clone(getNode(segs)),
      exists: () => getNode(segs) != null,
      forEach: f => { const node = getNode(segs) || {}; for (const k in node) { if (f({ key: k, val: () => clone(node[k]) })) break; } }
    };
  }
  function notify(segs) { listeners.forEach(L => { if (L.path.length <= segs.length && L.path.every((s, i) => s === segs[i])) L.cb(snap(L.path)); }); }
  function refFor(p) {
    const segs = p.split('/').filter(Boolean);
    return {
      once: () => Promise.resolve(snap(segs)),
      set: v => { setNode(segs, v); notify(segs); return Promise.resolve(); },
      update: patch => { for (const k in patch) setNode(segs.concat(k.split('/').filter(Boolean)), patch[k]); notify(segs); return Promise.resolve(); },
      remove: () => { setNode(segs, null); notify(segs.slice(0, -1)); return Promise.resolve(); },
      on: (ev, cb) => { listeners.push({ path: segs, cb }); cb(snap(segs)); return cb; },
      off: () => { for (let i = listeners.length - 1; i >= 0; i--) if (listeners[i].path.join('/') === segs.join('/')) listeners.splice(i, 1); },
      child: c => refFor(p + '/' + c),
      transaction: fn => { const cur = getNode(segs); const res = fn(cur === undefined ? null : clone(cur)); if (res === undefined) return Promise.resolve({ committed: false, snapshot: snap(segs) }); setNode(segs, res); notify(segs); return Promise.resolve({ committed: true, snapshot: snap(segs) }); },
      onDisconnect: () => ({ set: () => {}, remove: () => {}, cancel: () => {} }),
      orderByChild: c => ({ equalTo: v => ({ once: () => Promise.resolve({ forEach: f => { const node = getNode(segs) || {}; for (const k in node) if (node[k] && node[k][c] === v) { if (f({ key: k, val: () => clone(node[k]) })) break; } } }) }) })
    };
  }
  return { ref: refFor };
}

// ── net.js'i Node'da güvenli vm bağlamında yükle (window + localStorage enjekte) ──
const NET_SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'net.js'), 'utf8');
function loadNet(db, name) {
  const sandbox = { window: { SK_DB: db }, localStorage: { getItem: () => name, setItem() {}, removeItem() {} }, Math, Date, JSON, Promise, Object, Array, console };
  vm.createContext(sandbox);
  const net = vm.runInContext(NET_SRC + '\n;SonKartNet;', sandbox);
  net.init(); return net;
}

function checkInv(gs, tag) {
  const ids = [];
  gs.deck.forEach(c => ids.push(c.id)); gs.discard.forEach(c => ids.push(c.id));
  gs.pids.forEach(p => (gs.hands[p] || []).forEach(c => ids.push(c.id)));
  if (ids.length !== 108 || new Set(ids).size !== 108) throw new Error('INVARIANT [' + tag + ']: ' + ids.length);
}
function botMove(gs, pid) {
  const mv = Bot.choose(gs, pid);
  if (mv.type === 'play') return Engine.play(gs, pid, mv.cardId, mv.color, true);
  let ns = Engine.draw(gs, pid);
  const id = ns.lastDrawn; const legal = new Set(Engine.legalMoves(ns, pid));
  if (id != null && legal.has(id)) {
    const c = ns.hands[pid].find(x => x.id === id);
    const color = Deck.isWild(c) ? Bot.bestColor(ns.hands[pid].filter(x => x.id !== id)) : undefined;
    return Engine.play(ns, pid, id, color, true);
  }
  return Engine.pass(ns, pid);
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }

async function testJoin(nPlayers) {
  const db = makeMock();
  const clients = []; for (let i = 0; i < nPlayers; i++) clients.push(loadNet(db, 'P' + i));
  const code = await clients[0].create(buildInitial);
  for (let i = 1; i < nPlayers; i++) await clients[i].join(code);
  const room = (await db.ref('rooms/son-kart/' + code).once('value')).val();
  ok(room && room.pids && room.pids.length === nPlayers, nPlayers + ' oyuncu: pids uzunluğu ' + (room && room.pids ? room.pids.length : '?'));
  ok(room && new Set(room.pids).size === room.pids.length, nPlayers + ' oyuncu: koltuklar benzersiz (transaction yarış-koşulu yok)');
  if (nPlayers === 4) {
    const extra = loadNet(db, 'X');
    let rejected = false;
    try { await extra.join(code); } catch (e) { rejected = e.message === 'full'; }
    ok(rejected, 'dolu odaya katılma "full" ile reddedildi');
  }
  return { db, code, clients };
}

async function testFullGame(nPlayers, seed) {
  const { db, code, clients } = await testJoin(nPlayers);
  const pids = (await db.ref('rooms/son-kart/' + code).once('value')).val().pids;
  const latest = clients.map(() => null);
  clients.forEach((c, i) => c.subscribe(r => { latest[i] = r; }));
  Engine.setRng(Deck.makeRng(seed));
  const gs0 = Engine.deal(pids);
  await clients[0].update(Object.assign({ state: 'PLAYING' }, gsToRoom(gs0)));
  ok(latest.every(r => r && r.state === 'PLAYING'), nPlayers + 'k: tüm clientlar PLAYING aldı (subscribe)');

  let guard = 0, moves = 0, syncOk = true, serialOk = true;
  while (guard++ < 5000) {
    const cur = roomToGs(latest[0]);
    if (cur.winner) break;
    const pid = cur.turn; const ci = pids.indexOf(pid);
    const ns = botMove(cur, pid);
    checkInv(ns, 'wire#' + moves);
    await clients[ci].update(Object.assign({ state: ns.winner ? 'OVER' : 'PLAYING' }, gsToRoom(ns)));
    const back = roomToGs(latest[ci]);
    if (back.turn !== ns.turn || back.curColor !== ns.curColor || back.deck.length !== ns.deck.length) serialOk = false;
    for (const p of pids) if ((ns.hands[p] || []).length !== (back.hands[p] || []).length) serialOk = false;
    for (const r of latest) { const g = roomToGs(r); if (g.turn !== ns.turn || (g.winner || null) !== (ns.winner || null)) syncOk = false; }
    moves++;
  }
  const fin = roomToGs(latest[0]);
  ok(!!fin.winner, nPlayers + 'k: kazananla bitti (' + moves + ' hamle)');
  ok(serialOk, nPlayers + 'k: serileştirme gidiş-dönüşü kayıpsız');
  ok(syncOk, nPlayers + 'k: tüm clientlar her hamlede senkron (subscribe yayılımı)');
  ok(latest.every(r => roomToGs(r).winner === fin.winner), nPlayers + 'k: kazanan tüm clientlarda tutarlı');
}

async function testSerializeWinner() {
  const db = makeMock();
  const ref = db.ref('rooms/son-kart/ZZZZ');
  const gs = { pids: ['a', 'b'], hands: { a: [], b: [{ c: 'r', v: '5', id: 3 }] }, deck: [], discard: [{ c: 'g', v: '2', id: 9 }], curColor: 'g', dir: 1, turn: 'a', active: { a: true, b: true }, saidUno: {}, winner: 'a', last: null, lastDrawn: null };
  await ref.set(Object.assign({ state: 'OVER' }, gsToRoom(gs)));
  const back = roomToGs((await ref.once('value')).val());
  ok(back.winner === 'a', 'serialize: winner korundu');
  ok((back.hands.a || []).length === 0, 'serialize: boş el (null→[]) güvenli kurtarıldı');
  ok((back.hands.b || []).length === 1, 'serialize: dolu el korundu');
  ok(back.deck.length === 0 && back.discard.length === 1, 'serialize: boş deste + ıskarta doğru');
}

(async () => {
  console.log('Son Kart — online netcode simülasyonu');
  await testJoin(2); await testJoin(3); await testJoin(4);
  await testSerializeWinner();
  await testFullGame(2, 12345);
  await testFullGame(3, 67890);
  await testFullGame(4, 24680);
  console.log('\nSonuç:  ' + pass + ' geçti, ' + fail + ' başarısız');
  if (fail) process.exit(1);
  console.log('✔ Netcode: çok-koltuklu katılma, serileştirme ve host↔guest senkronu doğrulandı.');
})();
