/* ============================================
   KELİMELİK — UI + Girdi (Faz 1: tek-ekran/solo test)
   Motoru (engine.js) + sözlüğü (dict.js) DOM'a bağlar.
   Yerleştirme: dokun-yerleştir (mobil) + HTML5 sürükle-bırak (masaüstü).
   Faz 2'de bu çekirdeğin üzerine online 1v1 senkron katmanı gelecek.
   ============================================ */
const KelimelikGame = (() => {
  const E = KelimelikEngine, D = KelimelikDict;
  let board, bag, rack, placed, selId, score, cellEls, els, uidC;

  const $ = id => document.getElementById(id);
  function uid() { return 'k' + (++uidC); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function isPlaced(id) { return placed.some(p => p.id === id); }
  function provisionalAt(r, c) { return placed.find(p => p.r === r && p.c === c); }

  function tileEl(letter, opts) {
    const t = document.createElement('div');
    t.className = 'kl-tile' + (opts && opts.neu ? ' neu' : '') + (opts && opts.sel ? ' sel' : '') + (letter === '*' ? ' joker' : '');
    const span = document.createElement('span');
    span.textContent = letter === '*' ? '·' : letter;
    t.appendChild(span);
    const v = document.createElement('span');
    v.className = 'v'; v.textContent = E.letterValue(letter);
    t.appendChild(v);
    return t;
  }

  function init(root) {
    clear(root);
    uidC = 0;
    // HUD
    const hud = document.createElement('div'); hud.className = 'kl-hud';
    const mkStat = (id, label) => { const s = document.createElement('div'); s.className = 'kl-stat'; const b = document.createElement('b'); b.id = id; b.textContent = '0'; const sp = document.createElement('span'); sp.textContent = label; s.appendChild(b); s.appendChild(sp); return s; };
    hud.appendChild(mkStat('kl-score', 'PUAN'));
    hud.appendChild(mkStat('kl-move', 'HAMLE'));
    hud.appendChild(mkStat('kl-bag', 'TORBA'));
    root.appendChild(hud);
    // Mesaj
    const msg = document.createElement('div'); msg.className = 'kl-msg info'; msg.id = 'kl-msg';
    msg.textContent = 'İlk kelimeyi ortadaki ★ kareye yerleştir.';
    root.appendChild(msg);
    // Tahta
    const boardEl = document.createElement('div'); boardEl.className = 'kl-board'; boardEl.id = 'kl-board';
    cellEls = [];
    for (let r = 0; r < E.SIZE; r++) {
      cellEls[r] = [];
      for (let c = 0; c < E.SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'kl-cell';
        const sp = E.SPECIALS[r][c];
        if (r === E.CENTER && c === E.CENTER) cell.classList.add('center');
        else if (sp === 'DL') cell.classList.add('dl');
        else if (sp === 'TL') cell.classList.add('tl');
        else if (sp === 'DW') cell.classList.add('dw');
        else if (sp === 'TW') cell.classList.add('tw');
        cell.addEventListener('click', () => onCell(r, c));
        cell.addEventListener('dragover', (e) => { if (canDrop(r, c)) { e.preventDefault(); cell.classList.add('drop-ok'); } });
        cell.addEventListener('dragleave', () => cell.classList.remove('drop-ok'));
        cell.addEventListener('drop', (e) => { e.preventDefault(); cell.classList.remove('drop-ok'); onDrop(r, c); });
        cellEls[r][c] = cell;
        boardEl.appendChild(cell);
      }
    }
    root.appendChild(boardEl);
    // Istaka
    const rackEl = document.createElement('div'); rackEl.className = 'kl-rack'; rackEl.id = 'kl-rack';
    root.appendChild(rackEl);
    // Butonlar
    const btns = document.createElement('div'); btns.className = 'kl-buttons';
    const mkBtn = (ico, label, cls, fn) => { const b = document.createElement('button'); b.className = 'kl-btn' + (cls ? ' ' + cls : ''); const i = document.createElement('span'); i.className = 'ico'; i.textContent = ico; const t = document.createElement('span'); t.textContent = label; b.appendChild(i); b.appendChild(t); b.addEventListener('click', fn); return b; };
    btns.appendChild(mkBtn('↩', 'Geri Al', '', undoAll));
    btns.appendChild(mkBtn('🔀', 'Karıştır', '', shuffleRack));
    btns.appendChild(mkBtn('⏭', 'Geç', '', pass));
    els = {}; els.play = mkBtn('✓', 'Oyna', 'play', play);
    btns.appendChild(els.play);
    root.appendChild(btns);

    els.msg = msg;
    newGame();
  }

  function newGame() {
    board = E.newBoard();
    bag = E.newBag();
    rack = E.draw(bag, 7).map(l => ({ id: uid(), letter: l }));
    placed = []; selId = null; score = 0;
    renderAll();
  }

  function setMsg(text, kind) { els.msg.textContent = text; els.msg.className = 'kl-msg ' + (kind || 'info'); }

  function renderAll() { renderBoard(); renderRack(); renderHud(); }

  function renderBoard() {
    for (let r = 0; r < E.SIZE; r++) for (let c = 0; c < E.SIZE; c++) {
      const cell = cellEls[r][c];
      clear(cell);
      cell.classList.remove('has-tile');
      const prov = provisionalAt(r, c);
      if (board[r][c]) { cell.classList.add('has-tile'); cell.appendChild(tileEl(board[r][c].letter)); }
      else if (prov) { cell.classList.add('has-tile'); cell.appendChild(tileEl(prov.letter, { neu: true })); }
    }
  }

  function renderRack() {
    const rackEl = $('kl-rack'); clear(rackEl);
    for (let i = 0; i < 7; i++) {
      const slot = document.createElement('div'); slot.className = 'kl-slot';
      const t = rack[i];
      if (t && !isPlaced(t.id)) {
        const el = tileEl(t.letter, { sel: selId === t.id });
        el.setAttribute('draggable', 'true');
        el.addEventListener('click', (e) => { e.stopPropagation(); selId = (selId === t.id ? null : t.id); renderRack(); });
        el.addEventListener('dragstart', () => { selId = t.id; });
        slot.appendChild(el);
      }
      rackEl.appendChild(slot);
    }
  }

  function renderHud() {
    $('kl-score').textContent = score;
    $('kl-bag').textContent = bag.length;
    // provizyon hamle puanı (yalnız yerleşim geçerliyse)
    let mv = 0;
    if (placed.length) {
      const res = E.evaluateMove(board, placed.map(p => ({ r: p.r, c: p.c, letter: p.letter })));
      mv = res.ok ? res.score : 0;
    }
    $('kl-move').textContent = mv;
    els.play.disabled = placed.length === 0;
  }

  function canDrop(r, c) { return !board[r][c] && !provisionalAt(r, c) && selId; }

  function placeSel(r, c) {
    const t = rack.find(x => x.id === selId);
    if (!t) return;
    placed.push({ r, c, id: t.id, letter: t.letter });
    selId = null;
    renderAll();
  }

  function onCell(r, c) {
    if (board[r][c]) return;                 // sabit taş — dokunma
    const prov = provisionalAt(r, c);
    if (prov) { placed = placed.filter(p => p !== prov); renderAll(); return; }  // provizyonu geri al
    if (selId) placeSel(r, c);               // seçili taşı koy
  }
  function onDrop(r, c) { if (canDrop(r, c)) placeSel(r, c); }

  function undoAll() { placed = []; selId = null; renderAll(); setMsg('Taşlar geri alındı.', 'info'); }
  function shuffleRack() { E.shuffle(rack); renderRack(); }

  function pass() {
    // Pas / harf değiştir: yerleştirilenleri geri al, ıstakayı torbaya iade edip yeniden çek
    placed = []; selId = null;
    for (const t of rack) bag.push(t.letter);
    E.shuffle(bag);
    rack = E.draw(bag, 7).map(l => ({ id: uid(), letter: l }));
    renderAll();
    setMsg('Harfler değiştirildi.', 'info');
  }

  function play() {
    if (!placed.length) return;
    const res = E.evaluateMove(board, placed.map(p => ({ r: p.r, c: p.c, letter: p.letter })));
    if (!res.ok) { setMsg(res.reason, 'err'); return; }
    const bad = res.words.find(w => !D.isValid(w.word));
    if (bad) { setMsg('"' + bad.word + '" sözlükte yok.', 'err'); return; }
    // Onayla: provizyonu tahtaya yaz, puanı ekle, ıstakayı yenile
    for (const p of placed) board[p.r][p.c] = { letter: p.letter };
    score += res.score;
    const ids = new Set(placed.map(p => p.id));
    rack = rack.filter(t => !ids.has(t.id));
    E.draw(bag, 7 - rack.length).forEach(l => rack.push({ id: uid(), letter: l }));
    placed = []; selId = null;
    renderAll();
    setMsg('+' + res.score + ' puan! (' + res.words.map(w => w.word).join(', ') + ')', 'ok');
  }

  return { init, newGame };
})();

// Sayfa hazır olunca başlat (standalone test)
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('kl-root');
  if (root) KelimelikGame.init(root);
});
