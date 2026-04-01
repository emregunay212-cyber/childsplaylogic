/* ============================================
   OYUN: Satranç - Tek Oyunculu (9 Seviye)
   chess.js + Stockfish.js entegrasyonu
   ============================================ */

const Satranc = (() => {
    const id = 'satranc';
    const levels = [
        { skill: 0,  depth: 5,  errorRate: 0.5, name: 'Çok Kolay' },
        { skill: 3,  depth: 6,  errorRate: 0.35, name: 'Kolay' },
        { skill: 5,  depth: 7,  errorRate: 0.25, name: 'Kolay+' },
        { skill: 8,  depth: 8,  errorRate: 0.15, name: 'Orta' },
        { skill: 10, depth: 10, errorRate: 0.1, name: 'Orta+' },
        { skill: 13, depth: 12, errorRate: 0.05, name: 'Zor' },
        { skill: 15, depth: 14, errorRate: 0.0, name: 'Zor+' },
        { skill: 18, depth: 16, errorRate: 0.0, name: 'Çok Zor' },
        { skill: 20, depth: 20, errorRate: 0.0, name: 'Usta' },
    ];

    let container = null;
    let callbacks = null;
    let game = null; // chess.js instance
    let selectedSquare = null;
    let validMoves = [];
    let lastMove = null;
    let playerColor = 'w';
    let aiThinking = false;
    let moveCount = 0;
    let capturedByMe = [];
    let capturedByAI = [];
    let gameEnded = false;
    let stateHistory = [];
    let boardMounted = false;
    let cellCache = [];
    let currentLevelConfig = null;
    let currentLevel = 1;

    async function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        currentLevel = level;
        currentLevelConfig = levels[level - 1];
        playerColor = 'w';
        game = ChessEngine.createGame();
        selectedSquare = null;
        validMoves = [];
        lastMove = null;
        aiThinking = false;
        moveCount = 0;
        capturedByMe = [];
        capturedByAI = [];
        gameEnded = false;
        stateHistory = [];
        boardMounted = false;
        cellCache = [];

        GameEngine.setTotal(1);

        // Stockfish'i arka planda başlat
        ChessEngine.initStockfish();

        render();
    }

    function renderCapturedHTML(pieces) {
        return pieces.filter(p => p).map(p => {
            const url = ChessEngine.getPieceSVG(p);
            if (url) return `<img src="${url}" class="chess-captured-piece" alt="${p}" draggable="false">`;
            return ChessEngine.getSymbol(p);
        }).join('');
    }

    function render() {
        if (!boardMounted) {
            container.innerHTML = `
                <div class="chess-player-info opponent" id="chess-top-info"></div>
                <div class="chess-board" id="chess-board"></div>
                <div class="chess-player-info player" id="chess-bot-info"></div>
                <div id="chess-undo-wrap"></div>
                <div class="chess-status" id="chess-status"></div>
            `;
            const boardEl = container.querySelector('#chess-board');
            cellCache = [];
            const flipped = playerColor === 'b';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const br = flipped ? 7 - r : r;
                    const bc = flipped ? 7 - c : c;
                    const cell = document.createElement('div');
                    cell.dataset.r = br;
                    cell.dataset.c = bc;
                    cell.addEventListener('click', () => onCellClick(br, bc));
                    boardEl.appendChild(cell);
                    cellCache.push({ el: cell, r: br, c: bc });
                }
            }
            boardMounted = true;
        }

        // Üst/Alt bilgi
        container.querySelector('#chess-top-info').innerHTML =
            `<span class="chess-player-name">🖥️ Bilgisayar</span><span class="chess-captured">${renderCapturedHTML(capturedByAI)}</span>`;
        container.querySelector('#chess-bot-info').innerHTML =
            `<span class="chess-player-name">👤 Sen</span><span class="chess-captured">${renderCapturedHTML(capturedByMe)}</span>`;

        // Tahtayı güncelle
        const board = ChessEngine.gameToBoard(game);
        const inCheck = game.in_check();
        const turn = game.turn();

        for (const cached of cellCache) {
            const { el, r: br, c: bc } = cached;
            const isDark = (br + bc) % 2 === 1;

            el.className = `chess-cell ${isDark ? 'dark' : 'light'}`;

            if (lastMove) {
                const [fr, fc] = ChessEngine.squareToRC(lastMove.from);
                const [tr, tc] = ChessEngine.squareToRC(lastMove.to);
                if ((br === fr && bc === fc) || (br === tr && bc === tc))
                    el.classList.add('last-move');
            }

            if (inCheck) {
                const king = turn === 'w' ? 'K' : 'k';
                if (board[br][bc] === king) el.classList.add('in-check');
            }

            if (selectedSquare && selectedSquare[0] === br && selectedSquare[1] === bc)
                el.classList.add('selected');

            if (validMoves.some(m => {
                const [tr, tc] = ChessEngine.squareToRC(m.to);
                return tr === br && tc === bc;
            })) {
                el.classList.add('valid-move');
                if (board[br][bc]) el.classList.add('valid-capture');
            }

            // Taş güncelle
            const piece = board[br][bc];
            const currentPiece = el.dataset.piece || '';
            if (piece !== currentPiece) {
                const oldPieceEl = el.querySelector('.chess-piece');
                if (oldPieceEl) oldPieceEl.remove();

                if (piece) {
                    const svgUrl = ChessEngine.getPieceSVG(piece);
                    if (svgUrl) {
                        const img = document.createElement('img');
                        img.className = 'chess-piece';
                        img.src = svgUrl;
                        img.alt = piece;
                        img.draggable = false;
                        el.insertBefore(img, el.firstChild);
                    }
                }
                el.dataset.piece = piece || '';
            }

            // Koordinatlar
            if (!el.querySelector('.chess-coord')) {
                const idx = cellCache.indexOf(cached);
                const visualC = idx % 8;
                const visualR = Math.floor(idx / 8);
                if (visualC === 0) {
                    const rank = document.createElement('span');
                    rank.className = 'chess-coord rank';
                    rank.textContent = 8 - br;
                    el.appendChild(rank);
                }
                if (visualR === 7) {
                    const file = document.createElement('span');
                    file.className = 'chess-coord file';
                    file.textContent = String.fromCharCode(97 + bc);
                    el.appendChild(file);
                }
            }
        }

        // Geri al butonu
        const undoWrap = container.querySelector('#chess-undo-wrap');
        if (stateHistory.length > 0 && !aiThinking && !gameEnded && game.turn() === playerColor) {
            if (!undoWrap.querySelector('.chess-undo-btn')) {
                undoWrap.innerHTML = '<button class="chess-undo-btn">↩ Hamle Geri Al</button>';
                undoWrap.querySelector('.chess-undo-btn').addEventListener('click', undoMove);
            }
        } else {
            undoWrap.innerHTML = '';
        }

        // Durum mesajı
        const statusEl = container.querySelector('#chess-status');
        if (aiThinking) {
            statusEl.innerHTML = '<span class="chess-thinking">🤔 Düşünüyor...</span>';
        } else if (gameEnded) {
            statusEl.textContent = '';
        } else if (game.turn() === playerColor) {
            statusEl.innerHTML = inCheck
                ? '<span class="chess-check">⚠️ ŞAH! Kralını kurtar!</span>'
                : '<span>♟️ Senin sıran</span>';
        } else {
            statusEl.textContent = '';
        }
    }

    function onCellClick(r, c) {
        if (aiThinking || gameEnded || game.turn() !== playerColor) return;

        const board = ChessEngine.gameToBoard(game);

        // Geçerli hamle hedefine tıklandı
        const sq = ChessEngine.rcToSquare(r, c);
        const targetMove = validMoves.find(m => m.to === sq);
        if (targetMove) {
            executeMove(targetMove);
            return;
        }

        // Kendi taşına tıklandı
        const piece = board[r][c];
        if (piece && ChessEngine.isOwnPiece(piece, playerColor)) {
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
        // Geri alma için kaydet
        stateHistory.push({
            fen: game.fen(),
            capturedByMe: [...capturedByMe],
            capturedByAI: [...capturedByAI],
            moveCount,
            lastMove,
        });

        // Piyon terfisi (otomatik vezir)
        const moveData = { from: moveObj.from, to: moveObj.to };
        if (moveObj.flags && moveObj.flags.includes('p')) {
            moveData.promotion = 'q';
        }

        const result = game.move(moveData);
        if (!result) return;

        if (result.captured) {
            const cap = playerColor === 'w' ? result.captured : result.captured.toUpperCase();
            capturedByMe.push(cap);
        }

        lastMove = { from: result.from, to: result.to };
        selectedSquare = null;
        validMoves = [];
        moveCount++;

        AudioManager.play(result.captured ? 'success' : 'tap');
        render();

        if (checkGameEnd()) return;

        // AI hamlesi
        aiThinking = true;
        render();

        doAIMove();
    }

    async function doAIMove() {
        const cfg = currentLevelConfig;
        let aiMoveStr = null;

        // Stockfish hazırsa onu kullan
        if (ChessEngine.isStockfishReady()) {
            aiMoveStr = await ChessEngine.getStockfishMove(game.fen(), cfg.skill, cfg.depth);
        }

        if (aiMoveStr) {
            // Stockfish hamlesini uygula
            const moveData = ChessEngine.sfMoveToChessMove(aiMoveStr);
            if (moveData) {
                const result = game.move(moveData);
                if (result) {
                    if (result.captured) {
                        const cap = playerColor === 'w' ? result.captured.toUpperCase() : result.captured;
                        capturedByAI.push(cap);
                    }
                    lastMove = { from: result.from, to: result.to };
                    moveCount++;
                }
            }
        } else {
            // Fallback: basit AI
            const fallbackMove = ChessEngine.getFallbackMove(game, cfg.errorRate);
            if (fallbackMove) {
                const result = game.move({ from: fallbackMove.from, to: fallbackMove.to, promotion: fallbackMove.promotion });
                if (result) {
                    if (result.captured) {
                        const cap = playerColor === 'w' ? result.captured.toUpperCase() : result.captured;
                        capturedByAI.push(cap);
                    }
                    lastMove = { from: result.from, to: result.to };
                    moveCount++;
                }
            }
        }

        aiThinking = false;
        render();
        checkGameEnd();
    }

    function undoMove() {
        if (stateHistory.length === 0 || aiThinking || gameEnded) return;

        const prev = stateHistory.pop();
        game = ChessEngine.createGame(prev.fen);
        capturedByMe = prev.capturedByMe;
        capturedByAI = prev.capturedByAI;
        moveCount = prev.moveCount;
        lastMove = prev.lastMove;
        selectedSquare = null;
        validMoves = [];

        AudioManager.play('tap');
        render();
    }

    function checkGameEnd() {
        if (game.in_checkmate()) {
            gameEnded = true;
            const playerWon = game.turn() !== playerColor;
            if (playerWon) {
                AudioManager.play('levelComplete');
                Particles.celebrate();
                const stars = moveCount < 40 ? 3 : moveCount < 60 ? 2 : 1;
                setTimeout(() => callbacks.onComplete(stars), 800);
            } else {
                AudioManager.play('error');
                showLoseMessage();
            }
            return true;
        }
        if (game.in_stalemate() || game.in_draw() || game.in_threefold_repetition()) {
            gameEnded = true;
            setTimeout(() => callbacks.onComplete(1), 800);
            return true;
        }
        return false;
    }

    function showLoseMessage() {
        const msg = document.createElement('div');
        msg.className = 'chess-lose-msg';
        msg.innerHTML = `
            <div class="chess-lose-card">
                <div style="font-size:3rem;">😔</div>
                <h3>Mat oldun!</h3>
                <p>Tekrar dene, başarabilirsin!</p>
                <button class="chess-retry-btn">Tekrar Dene</button>
            </div>
        `;
        container.appendChild(msg);
        msg.querySelector('.chess-retry-btn').onclick = () => {
            init(container, currentLevel, callbacks);
        };
    }

    function destroy() {
        ChessEngine.destroyStockfish();
        if (container) container.innerHTML = '';
        gameEnded = false;
        aiThinking = false;
        boardMounted = false;
        cellCache = [];
    }

    return { id, levels, init, destroy };
})();
