/* ============================================
   OYUN: Kod Macerası MP - Eşanlı Puzzle Yarışı
   Her oyuncu kendi puzzle'ini çözer.
   Rakibin haritası ve ilerlemesi canlı görünür.
   3 tur, en çok turu kazanan oyunu kazanır.
   ============================================ */

const KodMacerasiMP = (() => {
    const id = 'kod-macerasi';
    const isMultiplayer = true;

    let container = null;
    let gameData = null;
    let myPuzzle = null;
    let myRobotPos = null;
    let opPuzzle = null;
    let opRobotPos = null;
    let myFinished = false;
    let opFinished = false;
    let currentRound = 1;
    let hostScore = 0;
    let guestScore = 0;
    let gameOver = false;

    function init(gameArea, data) {
        container = gameArea;
        gameData = data;
        currentRound = data.currentRound || 1;
        hostScore = data.hostScore || 0;
        guestScore = data.guestScore || 0;
        myFinished = false;
        opFinished = false;
        gameOver = false;

        myPuzzle = data.myPuzzle;
        opPuzzle = data.opPuzzle;
        if (!myPuzzle || !opPuzzle) {
            container.innerHTML = '<div class="game-instruction" style="color:red;">Bulmaca yüklenemedi.</div>';
            return;
        }
        myRobotPos = data.myRobotPos || { x: myPuzzle.start.x, y: myPuzzle.start.y };
        opRobotPos = data.opRobotPos || { x: opPuzzle.start.x, y: opPuzzle.start.y };

        setupListeners();
        addKeyboardListener();
        renderGame();
    }

    function handleKeyDown(e) {
        const keyMap = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT' };
        const move = keyMap[e.key];
        if (move && !myFinished && !gameOver) {
            e.preventDefault();
            onMove(move);
        }
    }

    function addKeyboardListener() {
        document.addEventListener('keydown', handleKeyDown);
    }

    function removeKeyboardListener() {
        document.removeEventListener('keydown', handleKeyDown);
    }

    function setupListeners() {
        Multiplayer.on('ROUND_UPDATE', (data) => {
            opRobotPos = data.opRobotPos;
            opFinished = data.opFinished || false;
            myFinished = data.myFinished || false;
            hostScore = data.hostScore || 0;
            guestScore = data.guestScore || 0;

            // Rakip gridini güncelle
            renderOpponentGrid();
            renderScorebar();

            if (data.roundWinner && !gameOver) {
                // Tur kazananı var
                if (data.roundWinner === gameData.yourRole) {
                    AudioManager.play('success');
                } else if (myFinished) {
                    // Ben de bitirdim ama rakip önce bitirmiş
                }
            }
        });

        Multiplayer.on('NEW_ROUND', (data) => {
            currentRound = data.round;
            myPuzzle = data.myPuzzle;
            opPuzzle = data.opPuzzle;
            myRobotPos = data.myRobotPos || { x: myPuzzle.start.x, y: myPuzzle.start.y };
            opRobotPos = data.opRobotPos || { x: opPuzzle.start.x, y: opPuzzle.start.y };
            hostScore = data.hostScore || 0;
            guestScore = data.guestScore || 0;
            myFinished = false;
            opFinished = false;
            renderGame();
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

        // Skor çubuğu
        const scorebar = document.createElement('div');
        scorebar.className = 'kod-mp-scorebar';
        scorebar.id = 'kod-scorebar';
        container.appendChild(scorebar);
        renderScorebar();

        // Yan yana düzen: sol=benim grid+butonlar, sag=rakip grid
        const row = document.createElement('div');
        row.className = 'kod-mp-row';

        // SOL: Benim haritam + butonlar
        const leftCol = document.createElement('div');
        leftCol.className = 'kod-mp-left';

        const myLabel = document.createElement('div');
        myLabel.className = 'kod-mp-section-label my-label';
        myLabel.textContent = '🟠 Sen';
        if (myFinished) myLabel.textContent += ' ✅';
        leftCol.appendChild(myLabel);

        const myGridContainer = document.createElement('div');
        myGridContainer.id = 'my-grid-container';
        leftCol.appendChild(myGridContainer);
        renderMyGrid(myGridContainer);

        // Butonlar
        const palette = document.createElement('div');
        palette.className = 'kod-palette';
        ['UP', 'DOWN', 'LEFT', 'RIGHT'].forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'kod-block-btn';
            btn.style.background = KodMacerasiCore.BLOCKS[type].color;
            btn.innerHTML = KodMacerasiCore.getBlockSVG(type, 28);
            if (myFinished || gameOver) btn.classList.add('disabled');
            btn.addEventListener('click', () => {
                if (myFinished || gameOver) return;
                onMove(type);
            });
            palette.appendChild(btn);
        });
        leftCol.appendChild(palette);
        row.appendChild(leftCol);

        // SAĞ: Rakip haritası
        const rightCol = document.createElement('div');
        rightCol.className = 'kod-mp-right';

        const opLabel = document.createElement('div');
        opLabel.className = 'kod-mp-section-label op-label';
        opLabel.textContent = `🔵 ${gameData.opponentName}`;
        if (opFinished) opLabel.textContent += ' ✅';
        rightCol.appendChild(opLabel);

        const opGridContainer = document.createElement('div');
        opGridContainer.id = 'op-grid-container';
        opGridContainer.className = 'kod-mp-mini-grid-wrap';
        rightCol.appendChild(opGridContainer);
        renderOpGrid(opGridContainer);
        row.appendChild(rightCol);

        container.appendChild(row);
    }

    function renderMyGrid(container) {
        if (!container) container = document.getElementById('my-grid-container');
        if (!container) return;
        container.innerHTML = '';
        KodMacerasiCore.renderGrid(container, myPuzzle, myRobotPos);
    }

    function renderOpGrid(container) {
        if (!container) container = document.getElementById('op-grid-container');
        if (!container) return;
        container.innerHTML = '';
        KodMacerasiCore.renderGrid(container, opPuzzle, opRobotPos, '#2196F3');
    }

    function renderOpponentGrid() {
        renderOpGrid();
        // Rakip label güncelle
        const opLabel = container.querySelector('.op-label');
        if (opLabel) {
            opLabel.textContent = `🔵 ${gameData.opponentName}`;
            if (opFinished) opLabel.textContent += ' ✅';
        }
    }

    function renderScorebar() {
        const el = document.getElementById('kod-scorebar');
        if (!el) return;
        const myScore = gameData.yourRole === 'host' ? hostScore : guestScore;
        const opScore = gameData.yourRole === 'host' ? guestScore : hostScore;
        el.innerHTML = `
            <span class="kod-mp-score my-score">🟠 Sen: ${myScore}</span>
            <span class="kod-mp-round">Tur ${currentRound}/${gameData.totalRounds || 3}</span>
            <span class="kod-mp-score op-score">🔵 ${gameData.opponentName}: ${opScore}</span>
        `;
    }

    function onMove(type) {
        if (myFinished || gameOver) return;

        // Lokal önizleme: hemen hareket et
        const MOVES = { UP: {dx:0,dy:-1}, DOWN: {dx:0,dy:1}, LEFT: {dx:-1,dy:0}, RIGHT: {dx:1,dy:0} };
        const m = MOVES[type];
        const nx = myRobotPos.x + m.dx;
        const ny = myRobotPos.y + m.dy;

        const obstacles = myPuzzle.obstacles || [];
        if (nx < 0 || nx >= myPuzzle.size || ny < 0 || ny >= myPuzzle.size ||
            obstacles.some(o => o.x === nx && o.y === ny)) {
            AudioManager.play('error');
            return; // geçersiz hamle
        }

        myRobotPos = { x: nx, y: ny };
        AudioManager.play('tap');
        renderMyGrid();

        // Hedefe ulaştı mı?
        if (nx === myPuzzle.target.x && ny === myPuzzle.target.y) {
            myFinished = true;
            AudioManager.play('levelComplete');
            const gridEl = container.querySelector('#my-grid-container .kod-grid');
            if (gridEl) {
                const rect = gridEl.getBoundingClientRect();
                Particles.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);
            }
            // Butonları devre dışı bırak
            container.querySelectorAll('.kod-block-btn').forEach(b => b.classList.add('disabled'));
        }

        // Firebase'e gönder
        Multiplayer.send('SUBMIT_MOVE', { move: type });
    }

    function showGameOver(data) {
        const isWinner = data.winner === gameData.yourRole;
        const isDraw = data.winner === 'draw';

        if (isWinner) {
            AudioManager.play('levelComplete');
            Particles.celebrate();
        } else {
            AudioManager.play('error');
        }

        const myScore = gameData.yourRole === 'host' ? (data.hostScore || hostScore) : (data.guestScore || guestScore);
        const opScore = gameData.yourRole === 'host' ? (data.guestScore || guestScore) : (data.hostScore || hostScore);

        const bgGrad = isWinner ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
            : isDraw ? 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        const titleColor = isWinner ? '#1a5e2a' : isDraw ? '#4a1a6b' : '#7a1a2a';
        const icon = isWinner ? '🏆' : isDraw ? '🤝' : '💪';
        const title = isWinner ? 'Tebrikler!' : isDraw ? 'Berabere!' : 'İyi Oyundu!';
        const sub = isWinner ? 'Harika bir yarış oldu, kazandın!' : isDraw ? 'İkiniz de çok iyiydiniz!' : 'Bir dahaki sefere kazanacaksın!';

        setTimeout(() => {
            removeKeyboardListener();
            container.innerHTML = `
                <div class="kod-gameover">
                    <div class="kod-gameover-card" style="background:${bgGrad};">
                        <div class="kod-gameover-icon">${icon}</div>
                        <h2 class="kod-gameover-title" style="color:${titleColor};">${title}</h2>
                        <p class="kod-gameover-sub">${sub}</p>
                        <div class="kod-gameover-scores">
                            <div class="kod-gameover-player">
                                <div class="kod-gameover-avatar" style="background:#FF9800;">🟠</div>
                                <span class="kod-gameover-name">Sen</span>
                                <span class="kod-gameover-pts">${myScore}</span>
                            </div>
                            <div class="kod-gameover-vs">VS</div>
                            <div class="kod-gameover-player">
                                <div class="kod-gameover-avatar" style="background:#2196F3;">🔵</div>
                                <span class="kod-gameover-name">${gameData.opponentName}</span>
                                <span class="kod-gameover-pts">${opScore}</span>
                            </div>
                        </div>
                        <button class="kod-gameover-btn">${TR.mp.backToHub}</button>
                    </div>
                </div>`;

            container.querySelector('.kod-gameover-btn').onclick = () => {
                Multiplayer.send('LEAVE_LOBBY');
                Multiplayer.offAll();
                App.showHub();
            };
        }, 1200);
    }

    function destroy() {
        Multiplayer.offAll();
        removeKeyboardListener();
        if (container) container.innerHTML = '';
        gameOver = false;
    }

    return { id, isMultiplayer, init, destroy };
})();
