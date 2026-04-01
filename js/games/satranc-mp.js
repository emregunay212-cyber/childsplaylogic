/* ============================================
   OYUN: Satranç MP - Online 2 Kişilik
   chess.js entegrasyonu
   ============================================ */

const SatrancMP = (() => {
    const id = 'satranc';
    const isMultiplayer = true;

    let container = null;
    let gameData = null;
    let game = null; // chess.js instance
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
        game = ChessEngine.createGame(data.fen || ChessEngine.START_FEN);
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
            if (data.fen) game = ChessEngine.createGame(data.fen);
            if (data.lastMove) lastMove = data.lastMove;
            if (data.captured && data.mover !== gameData.yourRole) {
                capturedByOp.push(data.captured);
            }
            selectedSquare = null;
            validMoves = [];
            render();
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

    function renderCapturedMP(pieces) {
        return pieces.filter(p => p).map(p => {
            const url = ChessEngine.getPieceSVG(p);
            if (url) return `<img src="${url}" class="chess-captured-piece" alt="${p}" draggable="false">`;
            return ChessEngine.getSymbol(p);
        }).join('');
    }

    function render() {
        container.innerHTML = '';

        const isMyTurn = game.turn() === myColor;

        const turnDiv = document.createElement('div');
        turnDiv.className = `chess-mp-turn ${isMyTurn ? 'my-turn' : 'op-turn'}`;
        turnDiv.textContent = isMyTurn
            ? (game.in_check() ? '⚠️ ŞAH! Kralını kurtar!' : '♟️ Senin sıran!')
            : `⏳ ${gameData.opponentName} düşünüyor...`;
        container.appendChild(turnDiv);

        const topInfo = document.createElement('div');
        topInfo.className = 'chess-player-info opponent';
        topInfo.innerHTML = `<span>🔵 ${gameData.opponentName}</span><span class="chess-captured">${renderCapturedMP(capturedByOp)}</span>`;
        container.appendChild(topInfo);

        const boardEl = document.createElement('div');
        boardEl.className = 'chess-board';
        renderBoard(boardEl);
        container.appendChild(boardEl);

        const botInfo = document.createElement('div');
        botInfo.className = 'chess-player-info player';
        botInfo.innerHTML = `<span>🟠 Sen</span><span class="chess-captured">${renderCapturedMP(capturedByMe)}</span>`;
        container.appendChild(botInfo);
    }

    function renderBoard(boardEl) {
        const board = ChessEngine.gameToBoard(game);
        const flipped = myColor === 'b';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const br = flipped ? 7 - r : r;
                const bc = flipped ? 7 - c : c;
                const cell = document.createElement('div');
                const isDark = (br + bc) % 2 === 1;
                cell.className = `chess-cell ${isDark ? 'dark' : 'light'}`;

                if (lastMove) {
                    const [fr, fc] = ChessEngine.squareToRC(lastMove.from);
                    const [tr, tc] = ChessEngine.squareToRC(lastMove.to);
                    if ((br === fr && bc === fc) || (br === tr && bc === tc))
                        cell.classList.add('last-move');
                }

                if (game.in_check()) {
                    const king = game.turn() === 'w' ? 'K' : 'k';
                    if (board[br][bc] === king) cell.classList.add('in-check');
                }

                if (selectedSquare && selectedSquare[0] === br && selectedSquare[1] === bc)
                    cell.classList.add('selected');

                if (validMoves.some(m => {
                    const [tr, tc] = ChessEngine.squareToRC(m.to);
                    return tr === br && tc === bc;
                })) {
                    cell.classList.add('valid-move');
                    if (board[br][bc]) cell.classList.add('valid-capture');
                }

                const piece = board[br][bc];
                if (piece) {
                    const svgUrl = ChessEngine.getPieceSVG(piece);
                    if (svgUrl) {
                        const img = document.createElement('img');
                        img.className = 'chess-piece';
                        img.src = svgUrl;
                        img.alt = piece;
                        img.draggable = false;
                        cell.appendChild(img);
                    }
                }

                if (c === 0) { const s = document.createElement('span'); s.className = 'chess-coord rank'; s.textContent = 8-br; cell.appendChild(s); }
                if (r === 7) { const s = document.createElement('span'); s.className = 'chess-coord file'; s.textContent = String.fromCharCode(97+bc); cell.appendChild(s); }

                cell.addEventListener('click', () => onCellClick(br, bc));
                boardEl.appendChild(cell);
            }
        }
    }

    function onCellClick(r, c) {
        if (gameOver || game.turn() !== myColor) return;

        const sq = ChessEngine.rcToSquare(r, c);
        const targetMove = validMoves.find(m => m.to === sq);
        if (targetMove) {
            executeMove(targetMove);
            return;
        }

        const board = ChessEngine.gameToBoard(game);
        const piece = board[r][c];
        if (piece && ChessEngine.isOwnPiece(piece, myColor)) {
            selectedSquare = [r, c];
            validMoves = ChessEngine.getMovesForSquare(game, r, c);
            AudioManager.play('tap');
            render();
            return;
        }

        selectedSquare = null;
        validMoves = [];
        render();
    }

    function executeMove(moveObj) {
        const moveData = { from: moveObj.from, to: moveObj.to };
        if (moveObj.flags && moveObj.flags.includes('p')) {
            moveData.promotion = 'q';
        }

        const result = game.move(moveData);
        if (!result) return;

        if (result.captured) capturedByMe.push(result.captured);

        lastMove = { from: result.from, to: result.to };
        selectedSquare = null;
        validMoves = [];

        AudioManager.play(result.captured ? 'success' : 'tap');

        Multiplayer.send('CHESS_MOVE', {
            from: [8 - parseInt(result.from[1]), result.from.charCodeAt(0) - 97],
            to: [8 - parseInt(result.to[1]), result.to.charCodeAt(0) - 97],
            promotion: result.promotion || null,
            captured: result.captured || null
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
        const reason = data.winReason === 'checkmate' ? 'Şah Mat!' : data.winReason === 'stalemate' ? 'Pat' : '';

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
