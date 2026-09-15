/* ============================================
   OYUN: Jigsaw Bulmaca
   Emoji grid tabanlı parça birleştirme
   ============================================ */

const Jigsaw = (() => {
  const id = 'jigsaw';

  const PICTURES = [
    { name: 'Çiftlik', grid: ['🐔','🐷','🐮','🐑','🐴','🐶','🐱','🐰','🦆','🌻','🌾','🏠','🚜','🌳','🌈','🦋'] },
    { name: 'Deniz', grid: ['🐟','🐠','🐙','🦀','🐚','🌊','🐬','🦈','🐢','🦑','🪸','⚓','🚢','🏖️','🐋','🦞'] },
    { name: 'Uzay', grid: ['🚀','🌍','🌙','⭐','🪐','☀️','🌟','💫','🛸','🌕','✨','🔭','👨‍🚀','🌌','💥','🛰️'] },
    { name: 'Orman', grid: ['🌳','🌲','🍄','🦊','🐻','🦌','🐿️','🦉','🌿','🍃','🌸','🐝','🦋','🐛','🌺','🍀'] },
    { name: 'Meyve', grid: ['🍎','🍊','🍋','🍇','🍓','🍌','🍑','🍒','🥝','🍍','🥭','🫐','🍈','🍉','🥥','🫒'] },
  ];

  const levels = [
    { gridSize: 2, totalPieces: 4 },  // 2x2
    { gridSize: 3, totalPieces: 9 },  // 3x3
    { gridSize: 4, totalPieces: 16 }, // 4x4
  ];

  let container, callbacks, currentLevel, placedCount, pictureData, pieces;
  let timers = [];
  function later(fn, ms) { const t = setTimeout(() => { timers = timers.filter(x => x !== t); fn(); }, ms); timers.push(t); return t; }

  function init(gameArea, level, cbs) {
    container = gameArea;
    callbacks = cbs;
    timers.forEach(clearTimeout); timers = [];
    currentLevel = levels[level - 1];
    placedCount = 0;
    const pic = PICTURES[Math.floor(Math.random() * PICTURES.length)];
    const size = currentLevel.gridSize;
    // Use first size*size emojis from the picture
    pictureData = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        pictureData.push({ emoji: pic.grid[r * 4 + c] || '❓', row: r, col: c });
      }
    }
    pieces = [...pictureData].sort(() => Math.random() - 0.5);
    GameEngine.setTotal(currentLevel.totalPieces);
    render();
  }

  function render() {
    const size = currentLevel.gridSize;
    const cellSize = Math.min(70, 280 / size);

    // Örnek resim: parçaların NEREYE gideceği başka türlü bilinemez (emoji ızgarası rastgele
    // bir "resim"; ipucu olmadan oyun tamamen tahmindi). Küçük referans ızgarası tahtanın üstünde.
    const refCell = Math.max(18, Math.round(cellSize * 0.42));
    container.innerHTML = `
      <div class="jig-game">
        <div class="jig-progress">Yerleştirilen: ${placedCount}/${currentLevel.totalPieces}</div>
        <div class="jig-ref-label">Örnek — aynısını yap:</div>
        <div class="jig-ref" aria-label="Örnek resim" style="grid-template-columns: repeat(${size}, ${refCell}px); grid-template-rows: repeat(${size}, ${refCell}px);">
          ${pictureData.map(p => `<div class="jig-ref-cell" style="width:${refCell}px;height:${refCell}px;font-size:${Math.round(refCell * 0.62)}px;">${p.emoji}</div>`).join('')}
        </div>
        <div class="jig-board" id="jig-board" style="grid-template-columns: repeat(${size}, ${cellSize}px); grid-template-rows: repeat(${size}, ${cellSize}px);">
          ${pictureData.map((p, i) => `
            <div class="jig-cell ${p.placed ? 'jig-placed' : ''}" data-idx="${i}" style="width:${cellSize}px;height:${cellSize}px;font-size:${cellSize * 0.55}px;">
              ${p.placed ? p.emoji : ''}
            </div>
          `).join('')}
        </div>
        <div class="jig-hint">Parçayı seç, sonra yerine tıkla!</div>
        <div class="jig-pieces" id="jig-pieces">
          ${pieces.filter(p => !p.placed).map((p, i) => `
            <button class="jig-piece" data-row="${p.row}" data-col="${p.col}" style="font-size:${Math.min(40, cellSize * 0.5)}px;">
              ${p.emoji}
            </button>
          `).join('')}
        </div>
      </div>`;

    let selectedPiece = null;

    // Piece selection
    container.querySelectorAll('.jig-piece').forEach(btn => {
      btn.onclick = () => {
        container.querySelectorAll('.jig-piece').forEach(b => b.classList.remove('jig-selected'));
        btn.classList.add('jig-selected');
        selectedPiece = { row: parseInt(btn.dataset.row), col: parseInt(btn.dataset.col), el: btn };
        AudioManager.play('tap');
      };
    });

    // Cell placement
    container.querySelectorAll('.jig-cell:not(.jig-placed)').forEach(cell => {
      cell.onclick = () => {
        if (!selectedPiece) return;
        const idx = parseInt(cell.dataset.idx);
        const target = pictureData[idx];

        if (selectedPiece.row === target.row && selectedPiece.col === target.col) {
          // Correct placement
          target.placed = true;
          placedCount++;
          cell.textContent = target.emoji;
          cell.classList.add('jig-placed', 'jig-pop');
          selectedPiece.el.remove();
          selectedPiece = null;
          callbacks.onCorrect();   // sesi motor çalar
          Particles.sparkle(cell.getBoundingClientRect().left + cell.offsetWidth / 2, cell.getBoundingClientRect().top, 5);

          // Update progress
          const prog = container.querySelector('.jig-progress');
          if (prog) prog.textContent = `Yerleştirilen: ${placedCount}/${currentLevel.totalPieces}`;

          if (placedCount >= currentLevel.totalPieces) {
            later(() => {
              Particles.celebrate();
              callbacks.onComplete();
            }, 600);
          }
        } else {
          // Wrong placement
          cell.classList.add('jig-wrong');
          callbacks.onWrong();
          later(() => cell.classList.remove('jig-wrong'), 500);
        }
      };
    });
  }

  function destroy() {
    timers.forEach(clearTimeout); timers = [];
    if (container) container.innerHTML = '';
  }

  return { id, levels, init, destroy };
})();
