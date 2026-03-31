/* ============================================
   OYUN: Kod Macerası MP - Sıra Tabanlı Yarış
   2 oyuncu aynı grid'de aynı robotu yönetir.
   Sırayla 1 blok koyar, robot hareket eder.
   İlk yıldıza ulaştıran kazanır.
   ============================================ */

const KodMacerasiMP = (() => {
    const id = 'kod-macerasi';
    const isMultiplayer = true;

    let container = null;
    let gameData = null;
    let puzzle = null;
    let robotPos = null;
    let isMyTurn = false;
    let moveHistory = [];
    let gameOver = false;

    function init(gameArea, data) {
        container = gameArea;
        gameData = data;
        puzzle = data.puzzle;
        if (!puzzle) {
            container.innerHTML = '<div class="game-instruction" style="color:red;">Bulmaca yüklenemedi. Lütfen tekrar deneyin.</div>';
            return;
        }
        robotPos = data.robotPos || { x: puzzle.start.x, y: puzzle.start.y };
        isMyTurn = data.currentTurn === data.yourRole;
        moveHistory = [];
        gameOver = false;

        setupListeners();
        renderGame();
    }

    function setupListeners() {
        Multiplayer.on('MOVE_MADE', (data) => {
            robotPos = data.robotPos;
            moveHistory = data.moveHistory || [];
            isMyTurn = data.currentTurn === gameData.yourRole;

            // Hamle animasyonu
            renderGame();

            if (data.blocked) {
                AudioManager.play('error');
            } else {
                AudioManager.play('tap');
                // Yıldız pozisyonunda sparkle
                if (robotPos.x === puzzle.target.x && robotPos.y === puzzle.target.y) {
                    const gridEl = container.querySelector('.kod-grid');
                    if (gridEl) {
                        const targetCell = gridEl.querySelector('.kod-cell.target');
                        if (targetCell) {
                            const rect = targetCell.getBoundingClientRect();
                            Particles.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);
                        }
                    }
                }
            }
        });

        Multiplayer.on('YOUR_TURN', () => {
            isMyTurn = true;
            renderTurnIndicator();
        });

        Multiplayer.on('WAIT_TURN', () => {
            isMyTurn = false;
            renderTurnIndicator();
        });

        Multiplayer.on('GAME_OVER', (data) => {
            gameOver = true;
            showGameOver(data);
        });

        Multiplayer.on('OPPONENT_LEFT', () => {
            gameOver = true;
            container.innerHTML = `
                <div class="mp-game-over-overlay">
                    <h2>Rakip ayrıldı</h2>
                    <button class="mp-btn mp-btn-hub">${TR.mp.backToHub}</button>
                </div>`;
            container.querySelector('.mp-btn-hub').onclick = () => {
                Multiplayer.send('LEAVE_LOBBY');
                Multiplayer.offAll();
                App.showHub();
            };
        });
    }

    function renderGame() {
        container.innerHTML = '';

        // Başlık: Sen vs Rakip
        const header = document.createElement('div');
        header.className = 'kod-mp-header';
        const myColor = gameData.yourRole === 'host' ? '#FF9800' : '#2196F3';
        const opColor = gameData.yourRole === 'host' ? '#2196F3' : '#FF9800';
        header.innerHTML = `
            <span style="color:${myColor};font-weight:700;">🟠 Sen</span>
            <span style="color:#999;font-size:0.9rem;">vs</span>
            <span style="color:${opColor};font-weight:700;">🔵 ${gameData.opponentName}</span>
        `;
        container.appendChild(header);

        // Sıra göstergesi
        const turnDiv = document.createElement('div');
        turnDiv.className = 'kod-mp-status ' + (isMyTurn ? 'your-turn' : 'opponent-turn');
        turnDiv.textContent = isMyTurn ? 'SENİN SIRAN!' : `${gameData.opponentName} düşünüyor...`;
        container.appendChild(turnDiv);

        // Grid
        if (puzzle) {
            KodMacerasiCore.renderGrid(container, puzzle, robotPos);
        }

        // Blok paleti (sadece sıra bendeyse aktif)
        const palette = document.createElement('div');
        palette.className = 'kod-palette';
        ['UP', 'DOWN', 'LEFT', 'RIGHT'].forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'kod-block-btn';
            btn.style.background = KodMacerasiCore.BLOCKS[type].color;
            btn.innerHTML = KodMacerasiCore.getBlockSVG(type, 32);
            btn.title = KodMacerasiCore.BLOCKS[type].label;
            if (!isMyTurn || gameOver) btn.classList.add('disabled');
            btn.addEventListener('click', () => {
                if (!isMyTurn || gameOver) return;
                AudioManager.play('tap');
                isMyTurn = false; // hemen devre dışı bırak (çift tıklama önleme)
                renderTurnIndicator();
                disablePalette();
                Multiplayer.send('SUBMIT_MOVE', { move: type });
            });
            palette.appendChild(btn);
        });
        container.appendChild(palette);

        // Hamle geçmişi
        if (moveHistory.length > 0) {
            const histDiv = document.createElement('div');
            histDiv.className = 'kod-move-history';
            const label = document.createElement('span');
            label.className = 'kod-history-label';
            label.textContent = 'Hamleler: ';
            histDiv.appendChild(label);

            moveHistory.slice(-12).forEach(m => {
                const chip = document.createElement('span');
                chip.className = 'kod-history-chip' + (m.blocked ? ' blocked' : '');
                const arrows = { UP: '⬆', DOWN: '⬇', LEFT: '⬅', RIGHT: '➡' };
                chip.style.background = m.player === 'host' ? '#FFF3E0' : '#E3F2FD';
                chip.style.borderColor = m.player === 'host' ? '#FF9800' : '#2196F3';
                chip.textContent = (m.blocked ? '❌' : '') + (arrows[m.move] || m.move);
                histDiv.appendChild(chip);
            });
            container.appendChild(histDiv);
        }
    }

    function renderTurnIndicator() {
        const turnDiv = container.querySelector('.kod-mp-status');
        if (turnDiv) {
            turnDiv.className = 'kod-mp-status ' + (isMyTurn ? 'your-turn' : 'opponent-turn');
            turnDiv.textContent = isMyTurn ? 'SENİN SIRAN!' : `${gameData.opponentName} düşünüyor...`;
        }
    }

    function disablePalette() {
        container.querySelectorAll('.kod-block-btn').forEach(b => b.classList.add('disabled'));
    }

    function showGameOver(data) {
        const isWinner = data.winner === gameData.yourRole;
        const isDraw = data.winner === 'draw';
        const resultEmoji = isDraw ? '🤝' : isWinner ? '🏆' : '😔';
        const resultText = isDraw ? TR.mp.draw : isWinner ? TR.mp.youWin : TR.mp.youLose;

        if (isWinner) {
            AudioManager.play('levelComplete');
            Particles.celebrate();
        } else {
            AudioManager.play('error');
        }

        setTimeout(() => {
            container.innerHTML = `
                <div class="mp-game-over-overlay">
                    <h2 class="mp-result-title">${resultEmoji} ${resultText}</h2>
                    <p style="font-size:1rem;color:#666;margin:0.5rem 0;">
                        ${isWinner ? 'Robotu yıldıza sen götürdün!' : 'Rakibin robotu yıldıza götürdü!'}
                    </p>
                    <p style="font-size:0.9rem;color:#999;">Toplam ${moveHistory.length} hamle yapıldı</p>
                    <div class="mp-result-buttons">
                        <button class="mp-btn mp-btn-hub">${TR.mp.backToHub}</button>
                    </div>
                </div>`;

            container.querySelector('.mp-btn-hub').onclick = () => {
                Multiplayer.send('LEAVE_LOBBY');
                Multiplayer.offAll();
                App.showHub();
            };
        }, 1500);
    }

    function destroy() {
        Multiplayer.offAll();
        if (container) container.innerHTML = '';
        gameOver = false;
        moveHistory = [];
    }

    return { id, isMultiplayer, init, destroy };
})();
