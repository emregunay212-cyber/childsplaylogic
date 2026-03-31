/* ============================================
   OYUN: LEGO Macerası - Kodlama + İnşaat
   LEGO adam parça toplar, yapı inşa eder
   ============================================ */

const LegoMacerasi = (() => {
  const id = 'lego-macerasi';

  const MOVES = {
    UP: { dx: 0, dy: -1 }, DOWN: { dx: 0, dy: 1 },
    LEFT: { dx: -1, dy: 0 }, RIGHT: { dx: 1, dy: 0 },
  };

  const BLOCK_DEFS = {
    UP:    { color: '#4ECDC4', label: 'Yukarı', svg: dir => `<svg viewBox="0 0 32 32" width="28" height="28"><path d="M16 4l10 14H6z" fill="white"/><rect x="12" y="18" width="8" height="10" rx="2" fill="white"/></svg>` },
    DOWN:  { color: '#A55EEA', label: 'Aşağı', svg: () => `<svg viewBox="0 0 32 32" width="28" height="28"><rect x="12" y="4" width="8" height="10" rx="2" fill="white"/><path d="M16 28l10-14H6z" fill="white"/></svg>` },
    LEFT:  { color: '#FF6B6B', label: 'Sola', svg: () => `<svg viewBox="0 0 32 32" width="28" height="28"><path d="M4 16l14-10v8h10v4H18v8z" fill="white"/></svg>` },
    RIGHT: { color: '#45B7D1', label: 'Sağa', svg: () => `<svg viewBox="0 0 32 32" width="28" height="28"><path d="M28 16l-14-10v8H4v4h10v8z" fill="white"/></svg>` },
    PICK:  { color: '#FF9800', label: 'Al', svg: () => `<svg viewBox="0 0 32 32" width="28" height="28"><rect x="8" y="18" width="16" height="10" rx="3" fill="white"/><rect x="10" y="20" width="5" height="3" rx="1" fill="#FF9800"/><rect x="17" y="20" width="5" height="3" rx="1" fill="#FF9800"/><path d="M12 18 L12 10 Q16 4 20 10 L20 18" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>` },
  };

  const PIECE_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6'];
  const PIECE_EMOJIS = ['🟥', '🟦', '🟩', '🟨', '🟪'];

  // Önceden tanımlı bulmacalar
  const PUZZLES = {
    1: [ // 3x3, 1 parça, engel yok
      { size: 3, start: {x:0,y:2}, target: {x:2,y:0}, pieces: [{x:1,y:1,color:0}], obstacles: [], optimal: 4 },
      { size: 3, start: {x:2,y:2}, target: {x:0,y:0}, pieces: [{x:1,y:1,color:0}], obstacles: [], optimal: 4 },
      { size: 3, start: {x:0,y:2}, target: {x:2,y:2}, pieces: [{x:1,y:2,color:0}], obstacles: [], optimal: 3 },
      { size: 3, start: {x:1,y:2}, target: {x:1,y:0}, pieces: [{x:1,y:1,color:0}], obstacles: [], optimal: 3 },
      { size: 3, start: {x:0,y:1}, target: {x:2,y:1}, pieces: [{x:1,y:1,color:0}], obstacles: [], optimal: 3 },
    ],
    2: [ // 4x4, 2 parça, 1-2 engel
      { size: 4, start: {x:0,y:3}, target: {x:3,y:0}, pieces: [{x:1,y:2,color:0},{x:2,y:1,color:1}], obstacles: [{x:1,y:1}], optimal: 8 },
      { size: 4, start: {x:0,y:3}, target: {x:3,y:3}, pieces: [{x:1,y:3,color:0},{x:2,y:1,color:1}], obstacles: [{x:2,y:3}], optimal: 8 },
      { size: 4, start: {x:3,y:3}, target: {x:0,y:0}, pieces: [{x:2,y:2,color:0},{x:1,y:1,color:1}], obstacles: [{x:1,y:2}], optimal: 8 },
      { size: 4, start: {x:0,y:0}, target: {x:3,y:3}, pieces: [{x:2,y:0,color:0},{x:3,y:2,color:1}], obstacles: [{x:2,y:2}], optimal: 7 },
      { size: 4, start: {x:0,y:3}, target: {x:3,y:0}, pieces: [{x:0,y:1,color:0},{x:3,y:2,color:1}], obstacles: [{x:1,y:1},{x:2,y:2}], optimal: 9 },
    ],
    3: [ // 5x5, 3 parça, 2-3 engel
      { size: 5, start: {x:0,y:4}, target: {x:4,y:0}, pieces: [{x:1,y:3,color:0},{x:2,y:2,color:1},{x:3,y:1,color:2}], obstacles: [{x:1,y:1},{x:3,y:3}], optimal: 11 },
      { size: 5, start: {x:0,y:4}, target: {x:4,y:4}, pieces: [{x:2,y:4,color:0},{x:2,y:2,color:1},{x:4,y:2,color:2}], obstacles: [{x:1,y:2},{x:3,y:3}], optimal: 12 },
      { size: 5, start: {x:4,y:4}, target: {x:0,y:0}, pieces: [{x:3,y:3,color:0},{x:2,y:2,color:1},{x:1,y:1,color:2}], obstacles: [{x:2,y:4},{x:0,y:2}], optimal: 11 },
      { size: 5, start: {x:0,y:4}, target: {x:4,y:0}, pieces: [{x:0,y:2,color:0},{x:2,y:0,color:1},{x:4,y:2,color:2}], obstacles: [{x:1,y:1},{x:3,y:1},{x:2,y:3}], optimal: 12 },
    ],
  };

  const levels = [
    { gridSize: 3, maxBlocks: 5,  blocks: ['UP','DOWN','LEFT','RIGHT'], rounds: 3, piecesNeeded: 1 },
    { gridSize: 4, maxBlocks: 9,  blocks: ['UP','DOWN','LEFT','RIGHT','PICK'], rounds: 3, piecesNeeded: 2 },
    { gridSize: 5, maxBlocks: 14, blocks: ['UP','DOWN','LEFT','RIGHT','PICK'], rounds: 3, piecesNeeded: 3 },
  ];

  let container, callbacks, currentLevel, currentRound, totalRounds;
  let sequence, puzzle, isExecuting, usedPuzzleIndices, roundResults;
  let collectedPieces; // Bu turda toplanan parçalar

  function init(gameArea, level, cbs) {
    container = gameArea;
    callbacks = cbs;
    currentLevel = levels[level - 1];
    currentRound = 0;
    totalRounds = currentLevel.rounds;
    usedPuzzleIndices = [];
    roundResults = [];
    isExecuting = false;
    GameEngine.setTotal(totalRounds);
    document.addEventListener('keydown', keyHandler);
    nextRound();
  }

  function keyHandler(e) {
    const map = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT' };
    const move = map[e.key];
    if (move && !isExecuting && sequence.length < currentLevel.maxBlocks) {
      e.preventDefault(); sequence.push(move); renderGame();
    }
    if (e.key === 'Enter' && !isExecuting && sequence.length > 0) { e.preventDefault(); onPlay(); }
    if (e.key === 'Backspace' && !isExecuting) { e.preventDefault(); sequence.pop(); renderGame(); }
  }

  function pickPuzzle() {
    const lvl = levels.indexOf(currentLevel) + 1;
    const pool = PUZZLES[lvl];
    const available = pool.filter((_, i) => !usedPuzzleIndices.includes(i));
    const list = available.length > 0 ? available : pool;
    const p = list[Math.floor(Math.random() * list.length)];
    const idx = pool.indexOf(p);
    if (idx >= 0) usedPuzzleIndices.push(idx);
    return JSON.parse(JSON.stringify(p)); // deep clone
  }

  function nextRound() {
    currentRound++;
    sequence = [];
    collectedPieces = [];
    isExecuting = false;
    puzzle = pickPuzzle();
    renderGame();
  }

  // ── LEGO Adam SVG ──
  function legoManSVG() {
    return `<svg viewBox="0 0 64 64" class="lego-man">
      <circle cx="32" cy="12" r="10" fill="#FFD600"/>
      <rect x="24" y="8" width="16" height="4" rx="2" fill="#E74C3C"/>
      <circle cx="28" cy="14" r="2" fill="#333"/>
      <circle cx="36" cy="14" r="2" fill="#333"/>
      <path d="M29,18 Q32,21 35,18" fill="none" stroke="#333" stroke-width="1.5"/>
      <rect x="22" y="22" width="20" height="18" rx="4" fill="#E74C3C"/>
      <rect x="28" y="26" width="8" height="3" rx="1" fill="#C0392B"/>
      <rect x="14" y="24" width="10" height="6" rx="3" fill="#FFD600"/>
      <rect x="40" y="24" width="10" height="6" rx="3" fill="#FFD600"/>
      <rect x="24" y="40" width="8" height="14" rx="3" fill="#2980B9"/>
      <rect x="34" y="40" width="8" height="14" rx="3" fill="#2980B9"/>
      <rect x="22" y="52" width="10" height="6" rx="2" fill="#333"/>
      <rect x="34" y="52" width="10" height="6" rx="2" fill="#333"/>
    </svg>`;
  }

  // ── LEGO Parça SVG ──
  function legoPieceSVG(colorIdx) {
    const c = PIECE_COLORS[colorIdx] || PIECE_COLORS[0];
    return `<svg viewBox="0 0 40 28" class="lego-piece-svg">
      <rect x="2" y="8" width="36" height="18" rx="3" fill="${c}"/>
      <circle cx="12" cy="8" r="5" fill="${c}"/><circle cx="12" cy="6" r="4" fill="${c}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <circle cx="28" cy="8" r="5" fill="${c}"/><circle cx="28" cy="6" r="4" fill="${c}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <rect x="4" y="10" width="32" height="2" rx="1" fill="rgba(0,0,0,0.1)"/>
    </svg>`;
  }

  // ── Grid Render ──
  function renderGrid() {
    const size = puzzle.size;
    const wrap = document.createElement('div');
    wrap.className = 'lego-grid-wrap';

    const grid = document.createElement('div');
    grid.className = `lego-grid grid-${size}x${size}`;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = document.createElement('div');
        cell.className = 'lego-cell';
        cell.dataset.x = x; cell.dataset.y = y;

        // LEGO plaka çıkıntısı
        cell.innerHTML = '<div class="lego-stud"></div>';

        if (puzzle.obstacles.some(o => o.x === x && o.y === y)) {
          cell.classList.add('lego-obstacle');
          cell.innerHTML = '💧';
        } else if (puzzle.target.x === x && puzzle.target.y === y) {
          cell.classList.add('lego-target');
          cell.innerHTML = '🏗️';
        } else {
          const piece = puzzle.pieces.find(p => p.x === x && p.y === y && !collectedPieces.includes(puzzle.pieces.indexOf(p)));
          if (piece) {
            cell.classList.add('lego-has-piece');
            cell.innerHTML = `<div class="lego-piece-cell">${PIECE_EMOJIS[piece.color]}</div>`;
            // Sıra numarası
            const order = puzzle.pieces.indexOf(piece) + 1;
            cell.innerHTML += `<span class="lego-order">${order}</span>`;
          }
        }

        if (puzzle.start.x === x && puzzle.start.y === y && collectedPieces.length === 0) {
          cell.classList.add('lego-robot-here');
          cell.innerHTML += legoManSVG();
        }

        grid.appendChild(cell);
      }
    }

    wrap.appendChild(grid);
    return wrap;
  }

  // ── Yapı Paneli ──
  function renderBuildPanel() {
    const total = puzzle.pieces.length;
    const panel = document.createElement('div');
    panel.className = 'lego-build-panel';
    panel.innerHTML = `
      <div class="lego-build-title">🏗️ İnşaat</div>
      <div class="lego-build-stack">
        ${puzzle.pieces.map((p, i) => `
          <div class="lego-build-slot ${collectedPieces.includes(i) ? 'lego-built' : ''}" style="--piece-color: ${PIECE_COLORS[p.color]}">
            ${collectedPieces.includes(i) ? legoPieceSVG(p.color) : '<div class="lego-build-empty">?</div>'}
          </div>
        `).join('')}
      </div>
      <div class="lego-build-count">${collectedPieces.length}/${total}</div>
    `;
    return panel;
  }

  // ── Ana Render ──
  function renderGame() {
    container.innerHTML = '';

    // Yönerge
    const inst = document.createElement('div');
    inst.className = 'game-instruction';
    inst.textContent = 'LEGO parçalarını topla ve inşaat alanına ulaş!';
    container.appendChild(inst);

    // Grid + Build panel wrapper
    const gameWrap = document.createElement('div');
    gameWrap.className = 'lego-game-wrap';
    gameWrap.appendChild(renderGrid());
    gameWrap.appendChild(renderBuildPanel());
    container.appendChild(gameWrap);

    // Program alanı
    renderProgramArea();

    // Blok paleti
    renderBlockPalette();

    // Durum
    const status = document.createElement('div');
    status.className = 'kod-status';
    status.innerHTML = `<span>Tur: ${currentRound}/${totalRounds}</span><span>Blok: ${sequence.length}/${currentLevel.maxBlocks}</span>`;
    container.appendChild(status);
  }

  function renderBlockPalette() {
    const palette = document.createElement('div');
    palette.className = 'kod-palette';
    currentLevel.blocks.forEach(type => {
      const btn = document.createElement('button');
      btn.className = 'kod-block-btn';
      btn.style.background = BLOCK_DEFS[type].color;
      btn.innerHTML = BLOCK_DEFS[type].svg();
      btn.title = BLOCK_DEFS[type].label;
      const full = sequence.length >= currentLevel.maxBlocks;
      if (full || isExecuting) btn.classList.add('disabled');
      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled') || isExecuting) return;
        if (sequence.length >= currentLevel.maxBlocks) return;
        AudioManager.play('tap');
        sequence.push(type);
        renderGame();
      });
      palette.appendChild(btn);
    });
    container.appendChild(palette);
  }

  function renderProgramArea() {
    const wrap = document.createElement('div');
    wrap.className = 'kod-program-wrap';

    const label = document.createElement('div');
    label.className = 'kod-program-label';
    label.textContent = 'Program';
    wrap.appendChild(label);

    const slots = document.createElement('div');
    slots.className = 'kod-program-slots';
    for (let i = 0; i < currentLevel.maxBlocks; i++) {
      const slot = document.createElement('div');
      slot.className = 'kod-program-slot';
      if (sequence[i]) {
        slot.classList.add('filled');
        const block = document.createElement('div');
        block.className = 'slot-block';
        block.style.background = BLOCK_DEFS[sequence[i]].color;
        block.innerHTML = BLOCK_DEFS[sequence[i]].svg();
        slot.appendChild(block);
        slot.addEventListener('click', () => {
          if (isExecuting) return;
          AudioManager.play('tap');
          sequence.splice(i, 1);
          renderGame();
        });
      }
      slots.appendChild(slot);
    }
    wrap.appendChild(slots);

    const btns = document.createElement('div');
    btns.className = 'kod-action-btns';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'kod-reset-btn';
    resetBtn.innerHTML = '↺';
    resetBtn.onclick = () => { if (!isExecuting) { AudioManager.play('tap'); sequence = []; renderGame(); } };
    btns.appendChild(resetBtn);
    const playBtn = document.createElement('button');
    playBtn.className = 'kod-play-btn';
    playBtn.innerHTML = '▶';
    playBtn.disabled = sequence.length === 0;
    playBtn.onclick = () => { AudioManager.play('tap'); onPlay(); };
    btns.appendChild(playBtn);
    wrap.appendChild(btns);
    container.appendChild(wrap);
  }

  // ── Çalıştırma ──
  function executeSequence() {
    const size = puzzle.size;
    let x = puzzle.start.x, y = puzzle.start.y;
    let collected = [];
    let nextPieceIdx = 0;
    const path = [{ x, y, action: 'start', collected: [] }];

    for (const cmd of sequence) {
      if (cmd === 'PICK') {
        // Parça topla
        const pieceIdx = puzzle.pieces.findIndex((p, i) => p.x === x && p.y === y && !collected.includes(i));
        if (pieceIdx < 0) {
          path.push({ x, y, action: 'pick_fail', collected: [...collected] });
          return { success: false, path, collected, error: 'noPiece' };
        }
        // Seviye 2-3'te sıra kontrolü
        if (currentLevel.piecesNeeded > 1 && pieceIdx !== nextPieceIdx) {
          path.push({ x, y, action: 'pick_wrong_order', collected: [...collected] });
          return { success: false, path, collected, error: 'wrongOrder' };
        }
        collected.push(pieceIdx);
        nextPieceIdx++;
        path.push({ x, y, action: 'pick', pickedIdx: pieceIdx, collected: [...collected] });
        continue;
      }

      const move = MOVES[cmd];
      if (!move) continue;
      x += move.dx; y += move.dy;

      if (x < 0 || x >= size || y < 0 || y >= size) {
        path.push({ x, y, action: 'outOfBounds', collected: [...collected] });
        return { success: false, path, collected, error: 'outOfBounds' };
      }
      if (puzzle.obstacles.some(o => o.x === x && o.y === y)) {
        x -= move.dx; y -= move.dy;
        path.push({ x, y, action: 'crashed', collected: [...collected] });
        return { success: false, path, collected, error: 'crashed' };
      }
      path.push({ x, y, action: 'move', collected: [...collected] });
    }

    // Tüm parçalar toplandı mı ve hedefe ulaşıldı mı?
    const allCollected = collected.length >= puzzle.pieces.length;
    const atTarget = x === puzzle.target.x && y === puzzle.target.y;

    if (!allCollected) return { success: false, path, collected, error: 'missingPieces' };
    if (!atTarget) return { success: false, path, collected, error: 'notReached' };

    return { success: true, path, collected, error: null };
  }

  // ── Animasyon ──
  function animateExecution(result) {
    const gridEl = container.querySelector('.lego-grid');
    if (!gridEl) return;
    const { path } = result;
    let step = 0;
    const size = puzzle.size;

    function nextStep() {
      if (step >= path.length) {
        onAnimationDone(result);
        return;
      }

      const p = path[step];
      const cells = gridEl.querySelectorAll('.lego-cell');

      // Robot kaldır
      cells.forEach(c => {
        c.classList.remove('lego-robot-here');
        const man = c.querySelector('.lego-man');
        if (man) man.remove();
      });

      if (p.action === 'outOfBounds') { onAnimationDone(result); return; }

      const cellIdx = p.y * size + p.x;
      const cell = cells[cellIdx];
      if (!cell) { step++; setTimeout(nextStep, 400); return; }

      cell.classList.add('lego-robot-here');
      if (p.action !== 'start') cell.classList.add('lego-trail');
      cell.innerHTML += legoManSVG();

      if (p.action === 'crashed') {
        const man = cell.querySelector('.lego-man');
        if (man) man.classList.add('crashed');
        AudioManager.play('error');
      }

      if (p.action === 'pick') {
        // Parça toplandı animasyonu
        cell.classList.remove('lego-has-piece');
        const pieceEl = cell.querySelector('.lego-piece-cell');
        if (pieceEl) pieceEl.remove();
        const orderEl = cell.querySelector('.lego-order');
        if (orderEl) orderEl.remove();

        collectedPieces = [...p.collected];
        // Yapı panelini güncelle
        const panel = container.querySelector('.lego-build-panel');
        if (panel) panel.replaceWith(renderBuildPanel());

        AudioManager.play('success');
        const rect = cell.getBoundingClientRect();
        Particles.sparkle(rect.left + rect.width / 2, rect.top, 6);
      }

      if (p.action === 'pick_fail' || p.action === 'pick_wrong_order') {
        AudioManager.play('error');
      }

      step++;
      if (step < path.length) setTimeout(nextStep, 450);
      else setTimeout(() => onAnimationDone(result), 400);
    }

    setTimeout(nextStep, 300);
  }

  function onAnimationDone(result) {
    if (result.success) {
      AudioManager.play('levelComplete');
      const gridEl = container.querySelector('.lego-grid');
      if (gridEl) {
        const rect = gridEl.getBoundingClientRect();
        Particles.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 10);
      }

      roundResults.push({ blocks: sequence.length, optimal: puzzle.optimal });
      callbacks.onCorrect();

      if (currentRound >= totalRounds) {
        const stars = calculateStars();
        setTimeout(() => callbacks.onComplete(stars), 600);
      } else {
        setTimeout(() => nextRound(), 1000);
      }
    } else {
      AudioManager.play('error');
      callbacks.onWrong();

      const errMsgs = {
        crashed: 'Engele çarptı! 💧',
        outOfBounds: 'Alanın dışına çıktı!',
        notReached: 'İnşaat alanına ulaşamadı!',
        missingPieces: 'Tüm parçaları toplamadın!',
        noPiece: 'Burada parça yok!',
        wrongOrder: 'Yanlış sıra! Numaralı sırayı takip et!',
      };

      const inst = container.querySelector('.game-instruction');
      if (inst) {
        inst.style.color = 'var(--error)';
        inst.style.fontWeight = '700';
        inst.textContent = errMsgs[result.error] || 'Hata!';
      }

      setTimeout(() => { isExecuting = false; collectedPieces = []; renderGame(); }, 1500);
    }
  }

  function onPlay() {
    if (isExecuting || sequence.length === 0) return;
    isExecuting = true;
    collectedPieces = [];

    // Disable UI
    container.querySelectorAll('.kod-block-btn').forEach(b => b.classList.add('disabled'));
    const playBtn = container.querySelector('.kod-play-btn');
    if (playBtn) playBtn.disabled = true;

    const result = executeSequence();
    animateExecution(result);
  }

  function calculateStars() {
    if (roundResults.length === 0) return 1;
    let totalExcess = 0;
    roundResults.forEach(r => totalExcess += Math.max(0, r.blocks - r.optimal));
    const avg = totalExcess / roundResults.length;
    if (avg <= 0) return 3;
    if (avg <= 2) return 2;
    return 1;
  }

  function destroy() {
    document.removeEventListener('keydown', keyHandler);
    if (container) container.innerHTML = '';
    sequence = [];
    isExecuting = false;
  }

  return { id, levels, init, destroy };
})();
