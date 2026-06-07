/* ============================================
   KELİMELİK — UI + Akış: Menü + Tek-başına Alıştırma + Online 1v1
   Çekirdek: engine.js (saf mantık) + dict.js (sözlük) + net.js (RTDB oda).
   Online model: aktif-oyuncu doğrular, yeni durumu RTDB'ye yazar; rakip dinler.
   ============================================ */
const KelimelikGame = (() => {
  const E = KelimelikEngine, D = KelimelikDict, NET = (typeof KelimelikNet !== 'undefined' ? KelimelikNet : null);
  let root, mode, board, myRack, placed, selId, soloScore, bag, room, lastRackKey, cellEls, ui, uidC;

  const $ = id => document.getElementById(id);
  const clear = el => { while (el && el.firstChild) el.removeChild(el.firstChild); };
  const uid = () => 'k' + (++uidC);
  const myId = () => NET ? NET.myId() : 'me';

  function init(r) { root = r; uidC = 0; try { if (NET) NET.init(); } catch (e) {} showMenu(); }

  function tileEl(letter, opts) {
    const t = document.createElement('div');
    t.className = 'kl-tile' + (opts && opts.neu ? ' neu' : '') + (opts && opts.sel ? ' sel' : '') + (letter === '*' ? ' joker' : '');
    const s = document.createElement('span'); s.textContent = letter === '*' ? '·' : letter; t.appendChild(s);
    const v = document.createElement('span'); v.className = 'v'; v.textContent = E.letterValue(letter); t.appendChild(v);
    return t;
  }

  /* ---------------- MENÜ ---------------- */
  function showMenu() {
    cleanupNet();
    clear(root); mode = null;
    const w = document.createElement('div'); w.className = 'kl-menu';
    const h = document.createElement('h1'); h.className = 'kl-title'; h.textContent = 'KELİMELİK'; w.appendChild(h);
    const sub = document.createElement('p'); sub.className = 'kl-sub'; sub.textContent = 'Türkçe Kelime Oyunu'; w.appendChild(sub);
    const mk = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'kl-mbtn' + (cls ? ' ' + cls : ''); b.textContent = label; b.addEventListener('click', fn); return b; };
    if (NET && NET.hasDB()) {
      w.appendChild(mk('⚡ Hızlı Eşleş', 'primary', onQuick));
      w.appendChild(mk('🏠 Oda Kur', null, onCreate));
      const row = document.createElement('div'); row.className = 'kl-joinrow';
      const inp = document.createElement('input'); inp.className = 'kl-code'; inp.id = 'kl-joincode'; inp.placeholder = 'ODA KODU'; inp.maxLength = 4; inp.autocapitalize = 'characters';
      inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      row.appendChild(inp); row.appendChild(mk('Katıl', null, () => onJoin(inp.value))); w.appendChild(row);
    } else {
      const wn = document.createElement('p'); wn.className = 'kl-warn'; wn.textContent = 'Online bağlantı kurulamadı — yalnız alıştırma modu.'; w.appendChild(wn);
    }
    const or = document.createElement('div'); or.className = 'kl-or'; or.textContent = '— veya —'; w.appendChild(or);
    w.appendChild(mk('🎯 Tek Başına Alıştır', null, startSolo));
    const er = document.createElement('p'); er.className = 'kl-menuerr'; er.id = 'kl-menuerr'; w.appendChild(er);
    root.appendChild(w);
  }
  const menuErr = t => { const e = $('kl-menuerr'); if (e) e.textContent = t || ''; };

  /* ---------------- ORTAK OYUN EKRANI ---------------- */
  function buildGameUI() {
    clear(root);
    ui = {};
    const hud = document.createElement('div'); hud.className = 'kl-hud';
    const chip = (id, label) => { const d = document.createElement('div'); d.className = 'kl-stat'; const b = document.createElement('b'); b.id = id; b.textContent = '0'; const s = document.createElement('span'); s.id = id + '-l'; s.textContent = label; d.appendChild(b); d.appendChild(s); return d; };
    hud.appendChild(chip('kl-me', 'SEN'));
    hud.appendChild(chip('kl-bag', 'TORBA'));
    hud.appendChild(chip('kl-opp', 'RAKİP'));
    root.appendChild(hud);
    const msg = document.createElement('div'); msg.className = 'kl-msg info'; msg.id = 'kl-msg'; root.appendChild(msg);
    const boardEl = document.createElement('div'); boardEl.className = 'kl-board';
    cellEls = [];
    for (let r = 0; r < E.SIZE; r++) {
      cellEls[r] = [];
      for (let c = 0; c < E.SIZE; c++) {
        const cell = document.createElement('div'); cell.className = 'kl-cell';
        const sp = E.SPECIALS[r][c];
        if (r === E.CENTER && c === E.CENTER) cell.classList.add('center');
        else if (sp) cell.classList.add(sp.toLowerCase());
        cell.addEventListener('click', () => onCell(r, c));
        cell.addEventListener('dragover', e => { if (canDrop(r, c)) { e.preventDefault(); cell.classList.add('drop-ok'); } });
        cell.addEventListener('dragleave', () => cell.classList.remove('drop-ok'));
        cell.addEventListener('drop', e => { e.preventDefault(); cell.classList.remove('drop-ok'); if (canDrop(r, c)) placeSel(r, c); });
        cellEls[r][c] = cell; boardEl.appendChild(cell);
      }
    }
    root.appendChild(boardEl);
    const rackEl = document.createElement('div'); rackEl.className = 'kl-rack'; rackEl.id = 'kl-rack'; root.appendChild(rackEl);
    const btns = document.createElement('div'); btns.className = 'kl-buttons';
    const mk = (ico, label, cls, fn) => { const b = document.createElement('button'); b.className = 'kl-btn' + (cls ? ' ' + cls : ''); const i = document.createElement('span'); i.className = 'ico'; i.textContent = ico; const t = document.createElement('span'); t.textContent = label; b.appendChild(i); b.appendChild(t); b.addEventListener('click', fn); return b; };
    ui.undo = mk('↩', 'Geri Al', '', undoAll);
    ui.shuf = mk('🔀', 'Karıştır', '', () => { E.shuffle(myRack); renderRack(); });
    ui.pass = mk('⏭', 'Geç', '', onPass);
    ui.play = mk('✓', 'Oyna', 'play', onPlay);
    [ui.undo, ui.shuf, ui.pass, ui.play].forEach(b => btns.appendChild(b));
    root.appendChild(btns);
    const foot = document.createElement('button'); foot.className = 'kl-exit'; foot.textContent = '← Menü'; foot.addEventListener('click', showMenu); root.appendChild(foot);
    ui.msg = msg;
  }
  const setMsg = (t, k) => { if (ui && ui.msg) { ui.msg.textContent = t; ui.msg.className = 'kl-msg ' + (k || 'info'); } };

  function committedBoard() {
    if (mode === 'online') {
      const b = E.newBoard();
      (room && room.board || []).forEach(t => { b[t.r][t.c] = { letter: t.l }; });
      return b;
    }
    return board;
  }
  function provAt(r, c) { return placed.find(p => p.r === r && p.c === c); }
  const isPlaced = id => placed.some(p => p.id === id);

  function renderBoard() {
    const B = committedBoard();
    for (let r = 0; r < E.SIZE; r++) for (let c = 0; c < E.SIZE; c++) {
      const cell = cellEls[r][c]; clear(cell); cell.classList.remove('has-tile');
      const prov = provAt(r, c);
      if (B[r][c]) { cell.classList.add('has-tile'); cell.appendChild(tileEl(B[r][c].letter)); }
      else if (prov) { cell.classList.add('has-tile'); cell.appendChild(tileEl(prov.letter, { neu: true })); }
    }
  }
  function renderRack() {
    const rackEl = $('kl-rack'); if (!rackEl) return; clear(rackEl);
    for (let i = 0; i < 7; i++) {
      const slot = document.createElement('div'); slot.className = 'kl-slot';
      const t = myRack[i];
      if (t && !isPlaced(t.id)) {
        const el = tileEl(t.letter, { sel: selId === t.id });
        el.setAttribute('draggable', 'true');
        el.addEventListener('click', e => { e.stopPropagation(); if (!canPlay()) return; selId = (selId === t.id ? null : t.id); renderRack(); });
        el.addEventListener('dragstart', () => { if (canPlay()) selId = t.id; });
        slot.appendChild(el);
      }
      rackEl.appendChild(slot);
    }
  }

  /* ---------------- GİRDİ ---------------- */
  function canPlay() { return mode === 'solo' || (room && room.state === 'PLAYING' && room.turn === myId() && !room.leftBy); }
  function canDrop(r, c) { return canPlay() && !committedBoard()[r][c] && !provAt(r, c) && selId; }
  function placeSel(r, c) { const t = myRack.find(x => x.id === selId); if (!t) return; placed.push({ r, c, id: t.id, letter: t.letter }); selId = null; renderBoard(); renderRack(); renderHud(); }
  function onCell(r, c) {
    if (!canPlay()) return;
    if (committedBoard()[r][c]) return;
    const prov = provAt(r, c);
    if (prov) { placed = placed.filter(p => p !== prov); renderBoard(); renderRack(); renderHud(); return; }
    if (selId) placeSel(r, c);
  }
  function undoAll() { placed = []; selId = null; renderBoard(); renderRack(); renderHud(); }

  function renderHud() {
    if (mode === 'solo') {
      $('kl-me').textContent = soloScore; $('kl-me-l').textContent = 'PUAN';
      $('kl-bag').textContent = bag.length;
      let mv = 0; if (placed.length) { const res = E.evaluateMove(committedBoard(), placed.map(p => ({ r: p.r, c: p.c, letter: p.letter }))); mv = res.ok ? res.score : 0; }
      $('kl-opp').textContent = mv; $('kl-opp-l').textContent = 'HAMLE';
      ui.play.disabled = placed.length === 0;
      ui.undo.disabled = ui.pass.disabled = ui.shuf.disabled = false;
      return;
    }
    // online
    const me = myId(), opp = (room.pids || []).find(p => p !== me);
    $('kl-me').textContent = (room.scores && room.scores[me]) || 0; $('kl-me-l').textContent = (room.names && room.names[me] || 'SEN').slice(0, 8);
    $('kl-opp').textContent = (opp && room.scores && room.scores[opp]) || 0; $('kl-opp-l').textContent = (opp && room.names && room.names[opp] || 'RAKİP').slice(0, 8);
    $('kl-bag').textContent = (room.bag || []).length;
    const mine = canPlay();
    [ui.undo, ui.shuf, ui.pass, ui.play].forEach(b => b.disabled = !mine);
    if (mine && !placed.length) ui.play.disabled = true;
    document.querySelector('.kl-board').classList.toggle('locked', !mine);
  }

  /* ---------------- SOLO ---------------- */
  function startSolo() {
    mode = 'solo'; buildGameUI();
    board = E.newBoard(); bag = E.newBag(); myRack = E.draw(bag, 7).map(l => ({ id: uid(), letter: l }));
    placed = []; selId = null; soloScore = 0;
    $('kl-me-l').textContent = 'PUAN'; $('kl-opp-l').textContent = 'HAMLE';
    renderBoard(); renderRack(); renderHud(); setMsg('İlk kelimeyi ortadaki ★ kareye koy.', 'info');
  }

  /* ---------------- ORTAK: Oyna / Geç ---------------- */
  function evaluateCurrent() {
    const res = E.evaluateMove(committedBoard(), placed.map(p => ({ r: p.r, c: p.c, letter: p.letter })));
    if (!res.ok) return { err: res.reason };
    const bad = res.words.find(w => !D.isValid(w.word));
    if (bad) return { err: '"' + bad.word + '" sözlükte yok.' };
    return { res };
  }
  function onPlay() { return mode === 'solo' ? soloPlay() : onlinePlay(); }
  function onPass() { return mode === 'solo' ? soloPass() : onlinePass(); }

  function soloPlay() {
    if (!placed.length) return;
    const ev = evaluateCurrent(); if (ev.err) { setMsg(ev.err, 'err'); return; }
    for (const p of placed) board[p.r][p.c] = { letter: p.letter };
    soloScore += ev.res.score;
    const ids = new Set(placed.map(p => p.id));
    myRack = myRack.filter(t => !ids.has(t.id));
    E.draw(bag, 7 - myRack.length).forEach(l => myRack.push({ id: uid(), letter: l }));
    placed = []; selId = null; renderBoard(); renderRack(); renderHud();
    setMsg('+' + ev.res.score + ' puan! (' + ev.res.words.map(w => w.word).join(', ') + ')', 'ok');
  }
  function soloPass() {
    placed = []; selId = null;
    for (const t of myRack) bag.push(t.letter); E.shuffle(bag);
    myRack = E.draw(bag, 7).map(l => ({ id: uid(), letter: l }));
    renderBoard(); renderRack(); renderHud(); setMsg('Harfler değiştirildi.', 'info');
  }

  /* ---------------- ONLINE ---------------- */
  function buildInitial(id, name) {
    return { code: NET.code(), state: 'WAITING', createdAt: Date.now(), hostId: id, pids: [id], names: { [id]: name }, scores: { [id]: 0 }, racks: {}, bag: E.newBag(), board: [], turn: null, passes: 0, last: null, winner: null };
  }
  function takeN(arr, n) { return arr.splice(Math.max(0, arr.length - n)); }
  function dealFn(rm, id, name) {
    const bg = (rm.bag || E.newBag()).slice(); const host = rm.pids[0];
    const rH = takeN(bg, 7), rG = takeN(bg, 7);
    return { pids: [host, id], names: Object.assign({}, rm.names, { [id]: name }), scores: { [host]: 0, [id]: 0 }, racks: { [host]: rH, [id]: rG }, bag: bg, turn: host, state: 'PLAYING', passes: 0 };
  }
  async function onCreate() { menuErr('Oda kuruluyor...'); try { await NET.create(buildInitial); mode = 'online'; room = null; NET.subscribe(onRoom); } catch (e) { menuErr('Oda kurulamadı.'); } }
  async function onQuick() { menuErr('Eşleşiliyor...'); try { await NET.quick(buildInitial, dealFn); mode = 'online'; room = null; NET.subscribe(onRoom); } catch (e) { menuErr('Eşleşme başarısız.'); } }
  async function onJoin(code) {
    if (!code || code.length < 4) { menuErr('4 haneli oda kodu gir.'); return; }
    menuErr('Katılınıyor...');
    try { await NET.join(code, dealFn); mode = 'online'; room = null; NET.subscribe(onRoom); }
    catch (e) { const m = String(e && e.message); menuErr(m.includes('not-found') ? 'Oda bulunamadı.' : m.includes('started') ? 'Oyun başlamış.' : m.includes('full') ? 'Oda dolu.' : 'Katılınamadı.'); }
  }

  function onRoom(state) {
    if (!state) { if (mode === 'online') showMenuWith('Oda kapandı.'); return; }
    room = state;
    if (state.state === 'WAITING') { renderWaiting(); return; }
    if (state.leftBy && state.leftBy !== myId() && state.state !== 'OVER') { showResult('left'); return; }
    if (state.state === 'OVER') { ensureGameUI(); showResult(); return; }
    if (state.state === 'PLAYING') { ensureGameUI(); syncRack(); renderBoard(); renderRack(); renderHud(); turnMsg(); }
  }

  let gameBuilt = false;
  function ensureGameUI() { if (!gameBuilt || !document.querySelector('.kl-board')) { buildGameUI(); gameBuilt = true; placed = []; selId = null; myRack = []; lastRackKey = null; } }
  function syncRack() {
    const me = myId(); const letters = (room.racks && room.racks[me]) || [];
    const key = letters.join('');
    if (key !== lastRackKey) { lastRackKey = key; myRack = letters.map(l => ({ id: uid(), letter: l })); placed = []; selId = null; }
  }
  function turnMsg() {
    if (room.leftBy) return;
    if (canPlay()) {
      let s = 'Sıra sende.';
      if (room.last && room.last.by !== myId()) s = (room.last.pass ? 'Rakip pas geçti. ' : ('Rakip: ' + (room.last.words || []).join(', ') + ' (+' + room.last.score + '). ')) + 'Sıra sende.';
      setMsg(s, 'ok');
    } else setMsg('Rakip oynuyor...', 'info');
  }

  function renderWaiting() {
    clear(root); gameBuilt = false;
    const w = document.createElement('div'); w.className = 'kl-menu';
    const h = document.createElement('h1'); h.className = 'kl-title'; h.textContent = 'ODA HAZIR'; w.appendChild(h);
    const p = document.createElement('p'); p.className = 'kl-sub'; p.textContent = 'Arkadaşına bu kodu ver:'; w.appendChild(p);
    const code = document.createElement('div'); code.className = 'kl-bigcode'; code.textContent = NET.code() || (room && room.code) || '----'; w.appendChild(code);
    const dots = document.createElement('p'); dots.className = 'kl-warn'; dots.textContent = 'Rakip bekleniyor...'; w.appendChild(dots);
    const b = document.createElement('button'); b.className = 'kl-mbtn'; b.textContent = 'İptal'; b.addEventListener('click', showMenu); w.appendChild(b);
    root.appendChild(w);
  }

  function onlinePlay() {
    if (!canPlay() || !placed.length) return;
    const ev = evaluateCurrent(); if (ev.err) { setMsg(ev.err, 'err'); return; }
    const me = myId(), opp = room.pids.find(p => p !== me);
    const newBoard = (room.board || []).concat(placed.map(p => ({ r: p.r, c: p.c, l: p.letter })));
    const bg = (room.bag || []).slice();
    const ids = new Set(placed.map(p => p.id));
    let newRack = myRack.filter(t => !ids.has(t.id)).map(t => t.letter);
    newRack = newRack.concat(takeN(bg, 7 - newRack.length));
    const myScore = ((room.scores && room.scores[me]) || 0) + ev.res.score;
    const patch = { board: newBoard, bag: bg, ['racks/' + me]: newRack, ['scores/' + me]: myScore, turn: opp, passes: 0, last: { by: me, name: NET.myName(), words: ev.res.words.map(w => w.word), score: ev.res.score } };
    if (bg.length === 0 && newRack.length === 0) { patch.state = 'OVER'; patch.winner = decideWinner(myScore, (room.scores && room.scores[opp]) || 0, me, opp); }
    placed = []; selId = null; setMsg('Gönderiliyor...', 'info');
    NET.update(patch);
  }
  function onlinePass() {
    if (!canPlay()) return;
    const me = myId(), opp = room.pids.find(p => p !== me);
    // pas + harf değiştir: ıstakayı torbaya iade et, yeniden çek
    const bg = (room.bag || []).slice();
    for (const t of myRack) if (!isPlaced(t.id)) bg.push(t.letter);
    E.shuffle(bg);
    const newRack = takeN(bg, 7);
    const passes = (room.passes || 0) + 1;
    const patch = { bag: bg, ['racks/' + me]: newRack, turn: opp, passes, last: { by: me, name: NET.myName(), pass: true } };
    if (passes >= 4) { patch.state = 'OVER'; patch.winner = decideWinner((room.scores && room.scores[me]) || 0, (room.scores && room.scores[opp]) || 0, me, opp); }
    placed = []; selId = null; lastRackKey = null;
    NET.update(patch);
  }
  function decideWinner(a, b, ida, idb) { return a > b ? ida : b > a ? idb : 'draw'; }

  function showResult(kind) {
    clear(root); gameBuilt = false;
    const me = myId(), opp = (room.pids || []).find(p => p !== me);
    const w = document.createElement('div'); w.className = 'kl-menu';
    const h = document.createElement('h1'); h.className = 'kl-title';
    let txt, cls = 'kl-sub';
    if (kind === 'left') { txt = '🏆 Rakip ayrıldı — kazandın!'; }
    else if (room.winner === 'draw') { txt = '🤝 Berabere!'; }
    else if (room.winner === me) { txt = '🏆 Kazandın!'; }
    else { txt = '😢 Kaybettin'; }
    h.textContent = 'OYUN BİTTİ'; w.appendChild(h);
    const r = document.createElement('p'); r.className = cls; r.textContent = txt; w.appendChild(r);
    const sc = document.createElement('p'); sc.className = 'kl-sub';
    sc.textContent = 'Sen: ' + ((room.scores && room.scores[me]) || 0) + '  •  Rakip: ' + ((opp && room.scores && room.scores[opp]) || 0);
    w.appendChild(sc);
    const b = document.createElement('button'); b.className = 'kl-mbtn primary'; b.textContent = 'Yeni Oyun'; b.addEventListener('click', showMenu); w.appendChild(b);
    root.appendChild(w);
  }

  function cleanupNet() { try { if (NET && mode === 'online') NET.leave(); } catch (e) {} }
  function showMenuWith(msg) { showMenu(); menuErr(msg); }

  return { init, showMenu };
})();

document.addEventListener('DOMContentLoaded', () => { const root = document.getElementById('kl-root'); if (root) KelimelikGame.init(root); });
