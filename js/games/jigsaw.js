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

  function init(gameArea, level, cbs) {
    container = gameArea;
    callbacks = cbs;
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

    container.innerHTML = `
      <div class="jig-game">
        <div class="jig-progress">Yerleştirilen: ${placedCount}/${currentLevel.totalPieces}</div>
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
          callbacks.onCorrect();
          AudioManager.play('success');
          Particles.sparkle(cell.getBoundingClientRect().left + cell.offsetWidth / 2, cell.getBoundingClientRect().top, 5);

          // Update progress
          const prog = container.querySelector('.jig-progress');
          if (prog) prog.textContent = `Yerleştirilen: ${placedCount}/${currentLevel.totalPieces}`;

          if (placedCount >= currentLevel.totalPieces) {
            setTimeout(() => {
              Particles.celebrate();
              callbacks.onComplete();
            }, 600);
          }
        } else {
          // Wrong placement
          cell.classList.add('jig-wrong');
          callbacks.onWrong();
          AudioManager.play('error');
          setTimeout(() => cell.classList.remove('jig-wrong'), 500);
        }
      };
    });
  }

  function destroy() { if (container) container.innerHTML = ''; }

  return { id, levels, init, destroy };
})();
