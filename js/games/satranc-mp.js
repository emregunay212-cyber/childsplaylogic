/* ============================================
   OYUN: Satranç MP - Online 2 Kişilik
   ============================================ */

const SatrancMP = (() => {
    const id = 'satranc';
    const isMultiplayer = true;

    let container = null;
    let gameData = null;
    let state = null;
    let selectedSquare = null;
    let validMoves = [];
    let lastMove = null;
    let myColor = 'w';
    let capturedByMe = [];
    let capturedByOp = [];
    let gameOver = false;

    function init(gameArea, data) {
        container = gameArea;
        gameData = data;
        state = ChessEngine.fenToBoard(data.fen || ChessEngine.START_FEN);
        myColor = data.hostColor === 'white' ? (data.yourRole === 'host' ? 'w' : 'b') : (data.yourRole === 'host' ? 'b' : 'w');
        selectedSquare = null;
        validMoves = [];
        lastMove = null;
        capturedByMe = [];
        capturedByOp = [];
        gameOver = false;

        setupListeners();
        render();
    }

    function setupListeners() {
        Multiplayer.on('CHESS_UPDATE', (data) => {
            if (data.fen) state = ChessEngine.fenToBoard(data.fen);
            if (data.lastMove) lastMove = data.lastMove;
            if (data.captured && data.mover !== gameData.yourRole) {
                capturedByOp.push(data.captured);
            }
            selectedSquare = null;
            validMoves = [];
            render();

            // Mat/pat kontrol
            if (data.checkmate || data.stalemate || data.draw) {
                gameOver = true;
            }
        });

        Multiplayer.on('GAME_OVER', (data) => {
            gameOver = true;
            showGameOver(data);
        });

        Multiplayer.on('OPPONENT_LEFT', () => {
            gameOver = true;
            container.innerHTML = `
                <div class="kod-gameover">
                    <div class="kod-gameover-card" style="background: linear-gradient(135deg, #dfe6e9, #b2bec3);">
                        <div class="kod-gameover-icon">🚪</div>
                        <h2 class="kod-gameover-title" style="color:#2d3436;">Rakip Ayrıldı</h2>
                        <p class="kod-gameover-sub">Sen kazandın!</p>
                        <button class="kod-gameover-btn">${TR.mp.backToHub}</button>
                    </div>
                </div>`;
            container.querySelector('.kod-gameover-btn').onclick = () => {
                Multiplayer.send('LEAVE_LOBBY');
                Multiplayer.offAll();
                App.showHub();
            };
        });
    }

    function render() {
        container.innerHTML = '';

        const isMyTurn = state.turn === myColor;

        // Sıra göstergesi
        const turnDiv = document.createElement('div');
        turnDiv.className = `chess-mp-turn ${isMyTurn ? 'my-turn' : 'op-turn'}`;
        turnDiv.textContent = isMyTurn
            ? (ChessEngine.isCheck(state) ? '⚠️ ŞAH! Kralını kurtar!' : '♟️ Senin sıran!')
            : `⏳ ${gameData.opponentName} düşünüyor...`;
        container.appendChild(turnDiv);

        // Üst: Rakip bilgi
        const topInfo = document.createElement('div');
        topInfo.className = 'chess-player-info opponent';
        topInfo.innerHTML = `<span>🔵 ${gameData.opponentName}</span><span class="chess-captured">${capturedByOp.map(p => ChessEngine.getSymbol(p)).join('')}</span>`;
        container.appendChild(topInfo);

        // Tahta
        const boardEl = document.createElement('div');
        boardEl.className = 'chess-board';
        renderBoard(boardEl);
        container.appendChild(boardEl);

        // Alt: Ben bilgi
        const botInfo = document.createElement('div');
        botInfo.className = 'chess-player-info player';
        botInfo.innerHTML = `<span>🟠 Sen</span><span class="chess-captured">${capturedByMe.map(p => ChessEngine.getSymbol(p)).join('')}</span>`;
        container.appendChild(botInfo);
    }

    function renderBoard(boardEl) {
        const flipped = myColor === 'b';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const br = flipped ? 7 - r : r;
                const bc = flipped ? 7 - c : c;
                const cell = document.createElement('div');
                const isDark = (br + bc) % 2 === 1;
                cell.className = `chess-cell ${isDark ? 'dark' : 'light'}`;
                cell.dataset.r = br;
                cell.dataset.c = bc;

                if (lastMove && ((lastMove.from[0] === br && lastMove.from[1] === bc) || (lastMove.to[0] === br && lastMove.to[1] === bc)))
                    cell.classList.add('last-move');

                if (ChessEngine.isCheck(state)) {
                    const king = state.turn === 'w' ? 'K' : 'k';
                    if (state.board[br][bc] === king) cell.classList.add('in-check');
                }

                if (selectedSquare && selectedSquare[0] === br && selectedSquare[1] === bc)
                    cell.classList.add('selected');

                if (validMoves.some(m => m.to[0] === br && m.to[1] === bc)) {
                    cell.classList.add('valid-move');
                    if (state.board[br][bc]) cell.classList.add('valid-capture');
                }

                const piece = state.board[br][bc];
                if (piece) {
                    const pieceEl = document.createElement('span');
                    pieceEl.className = 'chess-piece';
                    pieceEl.textContent = ChessEngine.getSymbol(piece);
                    cell.appendChild(pieceEl);
                }

                if (c === 0) { const s = document.createElement('span'); s.className = 'chess-coord rank'; s.textContent = 8-br; cell.appendChild(s); }
                if (r === 7) { const s = document.createElement('span'); s.className = 'chess-coord file'; s.textContent = String.fromCharCode(97+bc); cell.appendChild(s); }

                cell.addEventListener('click', () => onCellClick(br, bc));
                boardEl.appendChild(cell);
            }
        }
    }

    function onCellClick(r, c) {
        if (gameOver || state.turn !== myColor) return;

        const targetMove = validMoves.find(m => m.to[0] === r && m.to[1] === c);
        if (targetMove) {
            executeMove(targetMove);
            return;
        }

        const piece = state.board[r][c];
        if (piece && ChessEngine.isOwnPiece(piece, myColor)) {
            selectedSquare = [r, c];
            validMoves = ChessEngine.getMovesForSquare(state, r, c);
            AudioManager.play('tap');
            render();
            return;
        }

        selectedSquare = null;
        validMoves = [];
        render();
    }

    function executeMove(move) {
        if (move.promotion) move.promotion = myColor === 'w' ? 'Q' : 'q';
        if (move.capture) capturedByMe.push(move.capture);

        const result = ChessEngine.makeMove(state, move);
        state = result;
        lastMove = move;
        selectedSquare = null;
        validMoves = [];

        AudioManager.play(move.capture ? 'success' : 'tap');

        // Firebase'e gönder
        Multiplayer.send('CHESS_MOVE', {
            from: move.from,
            to: move.to,
            promotion: move.promotion || null,
            castle: move.castle || null,
            enPassant: move.enPassant || false,
            captured: move.capture || null
        });

        render();
    }

    function showGameOver(data) {
        const isWinner = data.winner === gameData.yourRole;
        const isDraw = data.winner === 'draw';
        const bgGrad = isWinner ? 'linear-gradient(135deg, #43e97b, #38f9d7)'
            : isDraw ? 'linear-gradient(135deg, #a18cd1, #fbc2eb)'
            : 'linear-gradient(135deg, #f093fb, #f5576c)';
        const icon = isWinner ? '🏆' : isDraw ? '🤝' : '💪';
        const title = isWinner ? 'Tebrikler!' : isDraw ? 'Berabere!' : 'İyi Oyundu!';
        const reason = data.winReason === 'checkmate' ? 'Şah Mat!' : data.winReason === 'stalemate' ? 'Pat' : data.winReason === 'resign' ? 'Teslim' : '';

        if (isWinner) { AudioManager.play('levelComplete'); Particles.celebrate(); }

        setTimeout(() => {
            container.innerHTML = `
                <div class="kod-gameover">
                    <div class="kod-gameover-card" style="background:${bgGrad};">
                        <div class="kod-gameover-icon">${icon}</div>
                        <h2 class="kod-gameover-title">${title}</h2>
                        <p class="kod-gameover-sub">${reason}</p>
                        <button class="kod-gameover-btn">${TR.mp.backToHub}</button>
                    </div>
                </div>`;
            container.querySelector('.kod-gameover-btn').onclick = () => {
                Multiplayer.send('LEAVE_LOBBY');
                Multiplayer.offAll();
                App.showHub();
            };
        }, 1000);
    }

    function destroy() {
        Multiplayer.offAll();
        if (container) container.innerHTML = '';
        gameOver = false;
    }

    return { id, isMultiplayer, init, destroy };
})();
