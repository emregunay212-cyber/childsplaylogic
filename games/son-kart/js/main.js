/* ============================================
   SON KART — Denetleyici (solo + online)
   Saf motoru (engine) UI ve ağ (net) ile birleştirir.
   Solo: durum bellekte; bot turları gecikmeli akar.
   Online: aktif-oyuncu yetkili — kendi hamleni RTDB'ye yazarsın, snapshot'tan çizilir.
   ============================================ */
(function () {
  'use strict';
  const Deck = SK_Deck, Engine = SK_Engine, Bot = SK_Bot;
  const UI = SonKartUI, net = SonKartNet;

  let mode = null;                 // 'solo' | 'online'
  let state = null;                // motor durumu
  let myId = 'p0';
  let names = {};                  // pid -> ad
  let isBot = {};                  // pid -> bool (solo)
  let unoArmed = false;
  let lastBotCount = 1;
  let botTimer = null;
  let resultShown = false;

  let lastRoom = null;
  const online = { isHost: false, shownLobby: false };
  const goneTimers = {};
  let log = [], logSig = null;          // okunabilir hamle akışı (feed)

  function myName() { return net.myName ? net.myName() : 'Sen'; }

  // ── Hamle akışı (feed) metinleri ──
  const VAL_TR = { skip: 'Atla', rev: 'Yön', d2: '+2' };
  function cardLabel(card, color) {
    if (!card) return '';
    const cn = UI.COLOR_NAME;
    if (card.v === 'wild') return 'Joker' + (color ? ' → ' + (cn[color] || '') : '');
    if (card.v === 'wd4') return 'Joker +4' + (color ? ' → ' + (cn[color] || '') : '');
    return (cn[card.c] || '') + ' ' + (VAL_TR[card.v] || card.v);
  }
  function moveText(last) {
    if (!last) return '';
    const who = last.by === myId ? 'Sen' : (names[last.by] || 'Oyuncu');
    if (last.action === 'start') return 'Başlangıç kartı: ' + cardLabel(last.card, last.color);
    if (last.action === 'draw') return who + ' kart çekti';
    if (last.action === 'pass') return who + ' pas geçti';
    let t = who + ': ' + cardLabel(last.card, last.color);
    if (last.drew > 0) t += ' (+' + last.drew + ' çektirdi)';
    else if (last.drew === -2) t += ' (Son Kart cezası +2)';
    return t;
  }
  function sigOf(l) { return l ? (l.by + '|' + l.action + '|' + (l.card ? l.card.id : '-') + '|' + l.drew) : null; }
  function maybeLog() {
    if (!state || !state.last) return;
    const s = sigOf(state.last);
    if (s === logSig) return;
    logSig = s;
    const t = moveText(state.last);
    if (t) { log.push(t); if (log.length > 20) log.shift(); }
  }
  function resetLog() { log = []; logSig = null; }

  // ── Yardımcılar ──
  function alreadyDrew(s) { return s && s.turn === myId && s.last && s.last.action === 'draw' && s.last.by === myId; }
  function present(pid) {
    if (mode !== 'online' || !lastRoom) return true;
    return (lastRoom.presence && lastRoom.presence[pid]) !== false;
  }
  function buildView() {
    const players = state.pids.map(pid => ({
      name: names[pid] || 'Oyuncu',
      count: (state.hands[pid] || []).length,
      isTurn: state.turn === pid && !state.winner,
      present: present(pid),
      isMe: pid === myId,
      said: !!(state.saidUno && state.saidUno[pid])
    }));
    const canAct = !state.winner && state.turn === myId;
    const drew = alreadyDrew(state);
    const legal = new Set(canAct ? Engine.legalMoves(state, myId) : []);
    return {
      players, top: Engine.top(state), curColor: state.curColor, dir: state.dir,
      deckCount: state.deck.length, myHand: state.hands[myId] || [],
      legal, canAct, canPass: canAct && drew, drew,
      activeName: (names[state.turn] || 'Oyuncu'), log: log
    };
  }
  function render() { if (!state) return; maybeLog(); UI.renderGame(buildView()); }

  // ── Ortak hamle uygula ──
  function commit(ns) {
    unoArmed = false; state = ns; render();
    if (mode === 'online') netWrite(ns);
    if (ns.winner) { onGameOver(); return; }
    if (mode === 'solo') maybeBotTurn();
  }

  // ── İnsan eylemleri ──
  async function humanPlay(cardId) {
    if (!state || state.winner || state.turn !== myId) return;
    const card = (state.hands[myId] || []).find(c => c.id === cardId);
    if (!card) return;
    let color;
    if (Deck.isWild(card)) { color = await UI.askColor(); if (state.turn !== myId || state.winner) return; }
    try { commit(Engine.play(state, myId, cardId, color, unoArmed)); }
    catch (e) { UI.toast('Bu kart oynanamaz'); }
  }
  function humanDraw() {
    if (!state || state.winner || state.turn !== myId || alreadyDrew(state)) return;
    let ns = Engine.draw(state, myId);
    const id = ns.lastDrawn;
    const legal = new Set(Engine.legalMoves(ns, myId));
    if (!(id != null && legal.has(id))) ns = Engine.pass(ns, myId);   // çekti, oynayamıyor → pas
    commit(ns);
  }
  function humanPass() {
    if (!state || state.winner || state.turn !== myId || !alreadyDrew(state)) return;
    commit(Engine.pass(state, myId));
  }
  function onUno() { if (state && state.turn === myId && (state.hands[myId] || []).length === 2) { unoArmed = true; UI.toast('Son Kart dedin!'); } }

  // ── Solo bot turları ──
  function maybeBotTurn() {
    clearTimeout(botTimer);
    if (mode !== 'solo' || !state || state.winner || !isBot[state.turn]) return;
    botTimer = setTimeout(runBotTurn, 950 + Math.random() * 550);
  }
  function runBotTurn() {
    if (mode !== 'solo' || !state || state.winner) return;
    const pid = state.turn; if (!isBot[pid]) return;
    const mv = Bot.choose(state, pid);
    let ns;
    if (mv.type === 'play') ns = Engine.play(state, pid, mv.cardId, mv.color, true);
    else {
      ns = Engine.draw(state, pid);
      const id = ns.lastDrawn; const legal = new Set(Engine.legalMoves(ns, pid));
      if (id != null && legal.has(id)) {
        const c = ns.hands[pid].find(x => x.id === id);
        const color = Deck.isWild(c) ? Bot.bestColor(ns.hands[pid].filter(x => x.id !== id)) : undefined;
        ns = Engine.play(ns, pid, id, color, true);
      } else ns = Engine.pass(ns, pid);
    }
    state = ns; render();
    if (state.winner) { onGameOver(); return; }
    maybeBotTurn();
  }

  // ── Solo başlat ──
  function startSolo(botCount) {
    clearAllTimers(); resetLog();
    mode = 'solo'; myId = 'p0'; resultShown = false; unoArmed = false;
    lastBotCount = botCount; names = {}; isBot = {};
    const pids = ['p0']; names.p0 = myName() || 'Sen';
    for (let i = 1; i <= botCount; i++) { const id = 'b' + i; pids.push(id); names[id] = 'Bot ' + i; isBot[id] = true; }
    Engine.setRng(Math.random);
    state = Engine.deal(pids);
    render(); maybeBotTurn();
  }

  // ── Online ──
  function buildInitial(id, name) {
    const o = { hostId: id, state: 'WAITING', pids: [id], names: {} };
    o.names[id] = name;
    try { o.createdAt = window.firebase.database.ServerValue.TIMESTAMP; } catch (e) {}
    return o;
  }
  function gsToRoom(gs) {
    return {
      pids: gs.pids, hands: gs.hands, deck: gs.deck, discard: gs.discard,
      curColor: gs.curColor, dir: gs.dir, turn: gs.turn, active: gs.active,
      saidUno: gs.saidUno, winner: gs.winner, last: gs.last, lastDrawn: gs.lastDrawn
    };
  }
  function roomToGs(r) {
    return {
      pids: r.pids || [], hands: r.hands || {}, deck: r.deck || [], discard: r.discard || [],
      curColor: r.curColor, dir: r.dir || 1, turn: r.turn, active: r.active || {},
      saidUno: r.saidUno || {}, winner: r.winner || null, last: r.last || null,
      lastDrawn: (r.lastDrawn != null ? r.lastDrawn : null)
    };
  }
  function netWrite(ns) { const p = gsToRoom(ns); p.state = ns.winner ? 'OVER' : 'PLAYING'; try { net.update(p); } catch (e) {} }

  function authorityId(room) {
    const order = room.pids || [];
    for (const p of order) if ((room.presence && room.presence[p]) !== false) return p;
    return null;
  }
  function watchDisconnects(room) {
    if (room.state !== 'PLAYING' || !state || state.winner) return;
    (room.pids || []).forEach(pid => {
      if (pid === myId) return;
      const isPresent = (room.presence && room.presence[pid]) !== false;
      const isActive = (room.active && room.active[pid]) !== false;
      if (!isPresent && isActive) {
        if (!goneTimers[pid]) goneTimers[pid] = setTimeout(() => {
          goneTimers[pid] = null;
          if (!state || state.winner) return;
          if ((lastRoom.presence && lastRoom.presence[pid]) !== false) return;  // geri geldi
          try { netWrite(Engine.deactivate(state, pid)); UI.toast((names[pid] || 'Oyuncu') + ' ayrıldı'); } catch (e) {}
        }, 10000);
      } else if (isPresent && goneTimers[pid]) { clearTimeout(goneTimers[pid]); goneTimers[pid] = null; }
    });
  }

  function enterOnline(isHost) {
    mode = 'online'; myId = net.myId(); online.isHost = isHost; online.shownLobby = false;
    resultShown = false; resetLog(); UI.setHint(''); net.subscribe(onRoom);
  }
  function onRoom(room) {
    if (!room) { if (mode === 'online') { UI.toast('Oda kapandı'); goMenu(); } return; }
    lastRoom = room; names = room.names || names;
    if (room.state === 'WAITING') {
      if (!online.shownLobby) { online.shownLobby = true; UI.showLobby({ code: net.code(), isHost: online.isHost, onStart: hostStart, onLeave: goMenu }); }
      const players = (room.pids || []).map(pid => ({ name: (room.names && room.names[pid]) || 'Oyuncu', present: (room.presence && room.presence[pid]) !== false, isHost: pid === room.hostId }));
      const cnt = players.filter(p => p.present).length;
      UI.updateLobby({ players, canStart: online.isHost && cnt >= 2, hint: cnt < 2 ? 'En az 2 oyuncu gerekli…' : (online.isHost ? 'Hazır! Başlatabilirsin.' : 'Kurucu bekleniyor…') });
      return;
    }
    // PLAYING / OVER
    state = roomToGs(room); online.shownLobby = false; render();
    if (authorityId(room) === myId) watchDisconnects(room);
    if (state.winner && !resultShown) onGameOver();
  }
  function hostStart() {
    if (!lastRoom) return;
    const presentPids = (lastRoom.pids || []).filter(p => (lastRoom.presence && lastRoom.presence[p]) !== false);
    if (presentPids.length < 2) { UI.updateLobby({ players: [], canStart: false, hint: 'En az 2 oyuncu gerekli…' }); return; }
    Engine.setRng(Math.random);
    const gs = Engine.deal(presentPids);
    net.cancelRoomDisconnect();
    const patch = gsToRoom(gs); patch.state = 'PLAYING';
    try { net.update(patch); } catch (e) {}
  }

  function onCreate() { if (!net.hasDB()) return UI.setHint('Online şu an kullanılamıyor.'); UI.setHint('Oda kuruluyor…'); net.create(buildInitial).then(() => enterOnline(true)).catch(() => UI.setHint('Oda kurulamadı.')); }
  function onQuick() { if (!net.hasDB()) return UI.setHint('Online şu an kullanılamıyor.'); UI.setHint('Eşleşiliyor…'); net.quick(buildInitial).then(r => enterOnline(!r.joined)).catch(() => UI.setHint('Eşleşme başarısız.')); }
  function onJoin(code) {
    if (!net.hasDB()) return UI.setHint('Online şu an kullanılamıyor.');
    if (!code) return UI.setHint('Oda kodu gir.');
    UI.setHint('Katılınıyor…');
    net.join(code).then(() => enterOnline(false)).catch(e => {
      const m = e && e.message;
      UI.setHint(m === 'not-found' ? 'Oda bulunamadı.' : m === 'started' ? 'Oyun başlamış.' : m === 'full' ? 'Oda dolu.' : 'Katılınamadı.');
    });
  }

  // ── Oyun sonu / menü ──
  function onGameOver() {
    resultShown = true; clearTimeout(botTimer);
    const w = state.winner, isMe = w === myId;
    UI.showResult({
      isMe, text: isMe ? 'Tebrikler!' : ((names[w] || 'Oyuncu') + ' kazandı'),
      onAgain: () => { resultShown = false; if (mode === 'solo') startSolo(lastBotCount); else goMenu(); },
      onHome: () => goMenu()
    });
  }
  function clearAllTimers() { clearTimeout(botTimer); Object.keys(goneTimers).forEach(k => { clearTimeout(goneTimers[k]); goneTimers[k] = null; }); }
  function goMenu() {
    clearAllTimers();
    if (mode === 'online') { try { net.leave(); } catch (e) {} }
    mode = null; state = null; lastRoom = null; resultShown = false; online.shownLobby = false;
    UI.hideResult(); UI.showMenu(menuCbs);
  }

  const menuCbs = { onSolo: startSolo, onQuick: onQuick, onCreate: onCreate, onJoin: onJoin };

  function init() {
    UI.mount(document.getElementById('root'));
    UI.setHandlers({ onPlay: humanPlay, onDraw: humanDraw, onPass: humanPass, onUno: onUno, onLeaveGame: goMenu });
    try { net.init(); } catch (e) {}
    UI.showMenu(menuCbs);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
