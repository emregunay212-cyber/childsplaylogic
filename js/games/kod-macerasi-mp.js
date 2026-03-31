/* ============================================
   OYUN: Kod Macerası MP (Çok Oyunculu)
   ============================================ */

const KodMacerasiMP = (() => {
    const id = 'kod-macerasi-mp';
    const isMultiplayer = true;

    let container = null;
    let gameData = null;
    let sequence = [];
    let isReady = false;
    let currentPuzzle = null;
    let maxBlocks = 7;

    function init(gameArea, data) {
        container = gameArea;
        gameData = data;
        sequence = [];
        isReady = false;
        currentPuzzle = data.puzzle;

        // Max blok: grid boyutuna göre
        const gs = data.gridSize || currentPuzzle?.size || 4;
        maxBlocks = gs <= 3 ? 5 : gs <= 4 ? 7 : 9;

        setupListeners();
        renderGame();
    }

    function setupListeners() {
        Multiplayer.on('OPPONENT_READY', () => {
            const status = container.querySelector('.kod-mp-opponent-bar');
            if (status) status.innerHTML = `<span>🟢 ${gameData.opponentName}: ${TR.kodMacerasi.ready}</span>`;
        });

        Multiplayer.on('SEQUENCE_ACCEPTED', () => {
            // Benim sekansım kabul edildi
        });

        Multiplayer.on('ROUND_RESULT', (data) => {
            showRoundResult(data);
        });

        Multiplayer.on('GAME_OVER', (data) => {
            showGameOver(data);
        });

        Multiplayer.on('OPPONENT_LEFT', () => {
            container.innerHTML = `
                <div class="mp-game-over-overlay">
                    <h2>${TR.mp.opponentLeft || 'Rakip ayrıldı'}</h2>
                    <button class="mp-btn mp-btn-hub" onclick="App.showHub()">${TR.mp.backToHub}</button>
                </div>`;
        });
    }

    function renderGame() {
        container.innerHTML = '';

        // Üst bilgi
        const header = document.createElement('div');
        header.className = 'kod-mp-status';
        header.classList.add('your-turn');
        header.innerHTML = `🤖 ${TR.kodMacerasi.round} ${gameData.round || 1}/${gameData.totalRounds} — vs ${gameData.opponentName}`;
        container.appendChild(header);

        // Rakip durumu
        const opBar = document.createElement('div');
        opBar.className = 'kod-mp-opponent-bar';
        opBar.innerHTML = `<span>🔵 ${gameData.opponentName}: ${TR.kodMacerasi.building}<span class="dot-loading"></span></span>`;
        container.appendChild(opBar);

        // Grid
        if (currentPuzzle) {
            KodMacerasiCore.renderGrid(
                container, currentPuzzle,
                { x: currentPuzzle.start.x, y: currentPuzzle.start.y },
                gameData.yourRole === 'host' ? '#FF9800' : '#2196F3'
            );
        }

        // Program alanı
        const availBlocks = currentPuzzle && currentPuzzle.size <= 3
            ? ['UP', 'DOWN', 'LEFT', 'RIGHT']
            : ['UP', 'DOWN', 'LEFT', 'RIGHT', 'REPEAT'];

        KodMacerasiCore.renderProgramArea(
            container, maxBlocks, sequence,
            onRemoveBlock, onSubmit, onReset
        );

        // Blok paleti
        KodMacerasiCore.renderBlockPalette(container, availBlocks, onBlockSelect);

        // Durum çubuğu
        const status = document.createElement('div');
        status.className = 'kod-status';
        status.innerHTML = `<span>${TR.kodMacerasi.blocksUsed}: ${sequence.length}/${maxBlocks}</span>`;
        container.appendChild(status);

        // Hazır butonunu yeşil yap
        const playBtn = container.querySelector('.kod-play-btn');
        if (playBtn) {
            playBtn.innerHTML = '✓';
            playBtn.title = TR.kodMacerasi.ready;
        }

        updatePaletteState();

        if (isReady) disableInput();
    }

    function onBlockSelect(type) {
        if (isReady) return;
        if (sequence.length >= maxBlocks) return;
        sequence.push(type);
        renderGame();
    }

    function onRemoveBlock(index) {
        if (isReady) return;
        sequence.splice(index, 1);
        renderGame();
    }

    function onReset() {
        if (isReady) return;
        sequence = [];
        renderGame();
    }

    function onSubmit() {
        if (isReady || sequence.length === 0) return;
        isReady = true;
        Multiplayer.send('SUBMIT_SEQUENCE', { sequence });
        disableInput();

        // Hazır mesajı göster
        const playBtn = container.querySelector('.kod-play-btn');
        if (playBtn) {
            playBtn.disabled = true;
            playBtn.innerHTML = '⏳';
        }
    }

    function disableInput() {
        container.querySelectorAll('.kod-block-btn').forEach(b => b.classList.add('disabled'));
        const playBtn = container.querySelector('.kod-play-btn');
        if (playBtn) playBtn.disabled = true;
    }

    function updatePaletteState() {
        const full = sequence.length >= maxBlocks;
        container.querySelectorAll('.kod-block-btn').forEach(btn => {
            if (full || isReady) btn.classList.add('disabled');
            else btn.classList.remove('disabled');
        });
    }

    function showRoundResult(data) {
        const myResult = data.yourRole === 'host' ? data.hostResult : data.guestResult;
        const opResult = data.yourRole === 'host' ? data.guestResult : data.hostResult;

        const isWinner = data.winner === data.yourRole;
        const isDraw = data.winner === 'draw';

        let resultEmoji = isDraw ? '🤝' : isWinner ? '🎉' : '😔';
        let resultText = isDraw ? TR.mp.draw : isWinner ? TR.mp.youWin : TR.mp.youLose;

        container.innerHTML = `
            <div class="mp-game-over-overlay" style="position:relative;background:white;border-radius:20px;padding:1.5rem;text-align:center;margin:1rem;">
                <h2 style="color:${isWinner ? 'var(--success)' : isDraw ? 'var(--neutral)' : 'var(--error)'}">
                    ${resultEmoji} ${resultText}
                </h2>
                <div style="display:flex;justify-content:center;gap:2rem;margin:1rem 0;">
                    <div>
                        <strong>${TR.mp.you}</strong><br>
                        ${myResult.success ? '✅' : '❌'} ${myResult.blocks} ${TR.kodMacerasi.blocksUsed}
                    </div>
                    <div>
                        <strong>${gameData.opponentName}</strong><br>
                        ${opResult.success ? '✅' : '❌'} ${opResult.blocks} ${TR.kodMacerasi.blocksUsed}
                    </div>
                </div>
                <p style="font-size:1.2rem;font-weight:700;">
                    ${data.hostScore} - ${data.guestScore}
                </p>
                ${data.nextPuzzle ? `<p style="color:#888;font-size:0.9rem;">${TR.kodMacerasi.round} ${(data.round||0)+1}/${data.totalRounds} başlıyor...</p>` : ''}
            </div>
        `;

        if (isWinner) {
            AudioManager.play('levelComplete');
            Particles.celebrate();
        } else if (!isDraw) {
            AudioManager.play('error');
        }

        // Sonraki tur varsa 3 sn sonra başlat
        if (data.nextPuzzle) {
            setTimeout(() => {
                currentPuzzle = data.nextPuzzle;
                gameData.round = (data.round || 0) + 1;
                sequence = [];
                isReady = false;
                renderGame();
            }, 3000);
        }
    }

    function showGameOver(data) {
        const isWinner = data.winner === data.yourRole;
        const isDraw = data.winner === 'draw';

        let resultEmoji = isDraw ? '🤝' : isWinner ? '🏆' : '😔';
        let resultText = isDraw ? TR.mp.draw : isWinner ? TR.mp.youWin : TR.mp.youLose;

        container.innerHTML = `
            <div class="mp-game-over-overlay">
                <h2 class="mp-result-title">${resultEmoji} ${resultText}</h2>
                <div class="mp-result-scores">
                    <div class="mp-score-card">
                        <span class="mp-score-name">${TR.mp.you}</span>
                        <span class="mp-score-value">${data.hostScore}</span>
                    </div>
                    <span class="mp-score-vs">-</span>
                    <div class="mp-score-card">
                        <span class="mp-score-name">${gameData.opponentName}</span>
                        <span class="mp-score-value">${data.guestScore}</span>
                    </div>
                </div>
                <div class="mp-result-buttons">
                    <button class="mp-btn mp-btn-hub">${TR.mp.backToHub}</button>
                </div>
            </div>
        `;

        if (isWinner) {
            AudioManager.play('levelComplete');
            Particles.celebrate();
        }

        container.querySelector('.mp-btn-hub').onclick = () => {
            Multiplayer.send('LEAVE_LOBBY');
            Multiplayer.offAll();
            App.showHub();
        };
    }

    function destroy() {
        Multiplayer.offAll();
        if (container) container.innerHTML = '';
        sequence = [];
        isReady = false;
    }

    return { id, isMultiplayer, init, destroy };
})();
