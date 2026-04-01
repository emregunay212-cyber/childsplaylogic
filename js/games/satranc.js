/* ============================================
   OYUN: Satranç - Zorluk Seçimli
   chess.js + Stockfish.js
   ============================================ */

const Satranc = (() => {
    const id = 'satranc';
    // Tek seviye (GameEngine uyumluluğu) - zorluk seçimi oyun içinde
    const levels = [{}];

    const DIFFICULTIES = {
        'cok-kolay': { skill: 0,  depth: 1,  errorRate: 0.5, emoji: '😊', name: 'Çok Kolay', desc: 'Başlangıç', color: '#2ECC71' },
        'kolay':     { skill: 3,  depth: 3,  errorRate: 0.3, emoji: '🙂', name: 'Kolay', desc: 'Rahat', color: '#3498DB' },
        'orta':      { skill: 8,  depth: 6,  errorRate: 0.0, emoji: '😐', name: 'Orta', desc: 'Dengeli', color: '#F39C12' },
        'zor':       { skill: 15, depth: 12, errorRate: 0.0, emoji: '😤', name: 'Zor', desc: 'Zorlu', color: '#E74C3C' },
        'cok-zor':   { skill: 20, depth: 20, errorRate: 0.0, emoji: '🔥', name: 'Çok Zor', desc: 'Usta', color: '#8E44AD' },
    };

    let container = null;
    let callbacks = null;
    let game = null;
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
    let currentDifficulty = null;

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        boardMounted = false;
        cellCache = [];
        gameEnded = false;

        GameEngine.setTotal(1);
        ChessEngine.initStockfish();

        showDifficultySelect();
    }

    // ── Zorluk Seçim Ekranı ──
    function showDifficultySelect() {
        container.innerHTML = '';

        const wrap = document.createElement('div');
        wrap.className = 'chess-diff-screen';
        wrap.innerHTML = `
            <div class="chess-diff-title">♟️ Satranç</div>
            <p class="chess-diff-subtitle">Zorluk seviyeni seç:</p>
            <div class="chess-diff-grid">
                ${Object.entries(DIFFICULTIES).map(([key, d]) => `
                    <button class="chess-diff-card" data-diff="${key}" style="--diff-color: ${d.color};">
                        <span class="chess-diff-emoji">${d.emoji}</span>
                        <span class="chess-diff-name">${d.name}</span>
                        <span class="chess-diff-desc">${d.desc}</span>
                    </button>
                `).join('')}
            </div>
        `;
        container.appendChild(wrap);

        wrap.querySelectorAll('.chess-diff-card').forEach(card => {
            card.addEventListener('click', () => {
                const key = card.dataset.diff;
                currentDifficulty = DIFFICULTIES[key];
                AudioManager.play('tap');
                startGame();
            });
        });
    }

    function startGame() {
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

        const diffLabel = currentDifficulty ? currentDifficulty.name : '';
        container.querySelector('#chess-top-info').innerHTML =
            `<span class="chess-player-name">🖥️ Bilgisayar <small style="opacity:0.6">(${diffLabel})</small></span><span class="chess-captured">${renderCapturedHTML(capturedByAI)}</span>`;
        container.querySelector('#chess-bot-info').innerHTML =
            `<span class="chess-player-name">👤 Sen</span><span class="chess-captured">${renderCapturedHTML(capturedByMe)}</span>`;

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
            if (validMoves.some(m => { const [tr,tc] = ChessEngine.squareToRC(m.to); return tr===br&&tc===bc; })) {
                el.classList.add('valid-move');
                if (board[br][bc]) el.classList.add('valid-capture');
            }

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

            if (!el.querySelector('.chess-coord')) {
                const idx = cellCache.indexOf(cached);
                if (idx % 8 === 0) { const s = document.createElement('span'); s.className = 'chess-coord rank'; s.textContent = 8 - br; el.appendChild(s); }
                if (Math.floor(idx / 8) === 7) { const s = document.createElement('span'); s.className = 'chess-coord file'; s.textContent = String.fromCharCode(97 + bc); el.appendChild(s); }
            }
        }

        const undoWrap = container.querySelector('#chess-undo-wrap');
        if (stateHistory.length > 0 && !aiThinking && !gameEnded && game.turn() === playerColor) {
            if (!undoWrap.querySelector('.chess-undo-btn')) {
                undoWrap.innerHTML = '<button class="chess-undo-btn">↩ Hamle Geri Al</button>';
                undoWrap.querySelector('.chess-undo-btn').addEventListener('click', undoMove);
            }
        } else {
            undoWrap.innerHTML = '';
        }

        const statusEl = container.querySelector('#chess-status');
        if (aiThinking) statusEl.innerHTML = '<span class="chess-thinking">🤔 Düşünüyor...</span>';
        else if (gameEnded) statusEl.textContent = '';
        else if (game.turn() === playerColor) statusEl.innerHTML = inCheck ? '<span class="chess-check">⚠️ ŞAH!</span>' : '<span>♟️ Senin sıran</span>';
        else statusEl.textContent = '';
    }

    function onCellClick(r, c) {
        if (aiThinking || gameEnded || game.turn() !== playerColor) return;
        const board = ChessEngine.gameToBoard(game);
        const sq = ChessEngine.rcToSquare(r, c);
        const targetMove = validMoves.find(m => m.to === sq);
        if (targetMove) { executeMove(targetMove); return; }
        const piece = board[r][c];
        if (piece && ChessEngine.isOwnPiece(piece, playerColor)) {
            selectedSquare = [r, c];
            validMoves = ChessEngine.getMovesForSquare(game, r, c);
            AudioManager.play('tap');
            render();
            return;
        }
        selectedSquare = null; validMoves = []; render();
    }

    function executeMove(moveObj) {
        stateHistory.push({ fen: game.fen(), capturedByMe: [...capturedByMe], capturedByAI: [...capturedByAI], moveCount, lastMove });
        const moveData = { from: moveObj.from, to: moveObj.to };
        if (moveObj.flags && moveObj.flags.includes('p')) moveData.promotion = 'q';
        const result = game.move(moveData);
        if (!result) return;
        if (result.captured) capturedByMe.push(playerColor === 'w' ? result.captured : result.captured.toUpperCase());
        lastMove = { from: result.from, to: result.to };
        selectedSquare = null; validMoves = []; moveCount++;
        AudioManager.play(result.captured ? 'success' : 'tap');
        render();
        if (checkGameEnd()) return;
        aiThinking = true; render(); doAIMove();
    }

    async function doAIMove() {
        const cfg = currentDifficulty;
        let aiMoveStr = null;

        if (ChessEngine.isStockfishReady() && cfg.errorRate === 0) {
            aiMoveStr = await ChessEngine.getStockfishMove(game.fen(), cfg.skill, cfg.depth);
        } else if (ChessEngine.isStockfishReady() && Math.random() >= cfg.errorRate) {
            aiMoveStr = await ChessEngine.getStockfishMove(game.fen(), cfg.skill, cfg.depth);
        }

        if (aiMoveStr) {
            const md = ChessEngine.sfMoveToChessMove(aiMoveStr);
            if (md) {
                const r = game.move(md);
                if (r) {
                    if (r.captured) capturedByAI.push(playerColor === 'w' ? r.captured.toUpperCase() : r.captured);
                    lastMove = { from: r.from, to: r.to }; moveCount++;
                }
            }
        } else {
            const fb = ChessEngine.getFallbackMove(game, cfg.errorRate);
            if (fb) {
                const r = game.move({ from: fb.from, to: fb.to, promotion: fb.promotion });
                if (r) {
                    if (r.captured) capturedByAI.push(playerColor === 'w' ? r.captured.toUpperCase() : r.captured);
                    lastMove = { from: r.from, to: r.to }; moveCount++;
                }
            }
        }
        aiThinking = false; render(); checkGameEnd();
    }

    function undoMove() {
        if (stateHistory.length === 0 || aiThinking || gameEnded) return;
        const prev = stateHistory.pop();
        game = ChessEngine.createGame(prev.fen);
        capturedByMe = prev.capturedByMe; capturedByAI = prev.capturedByAI;
        moveCount = prev.moveCount; lastMove = prev.lastMove;
        selectedSquare = null; validMoves = [];
        AudioManager.play('tap'); render();
    }

    function checkGameEnd() {
        if (game.in_checkmate()) {
            gameEnded = true;
            if (game.turn() !== playerColor) {
                AudioManager.play('levelComplete'); Particles.celebrate();
                const stars = moveCount < 40 ? 3 : moveCount < 60 ? 2 : 1;
                setTimeout(() => callbacks.onComplete(stars), 800);
            } else {
                AudioManager.play('error'); showLoseMessage();
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
        msg.innerHTML = `<div class="chess-lose-card"><div style="font-size:3rem;">😔</div><h3>Mat oldun!</h3><p>Tekrar dene!</p><button class="chess-retry-btn">Tekrar Dene</button><button class="chess-retry-btn" style="background:#3498DB;color:white;margin-left:8px;">Zorluk Değiştir</button></div>`;
        container.appendChild(msg);
        msg.querySelectorAll('.chess-retry-btn')[0].onclick = () => startGame();
        msg.querySelectorAll('.chess-retry-btn')[1].onclick = () => { boardMounted = false; showDifficultySelect(); };
    }

    function destroy() {
        ChessEngine.destroyStockfish();
        if (container) container.innerHTML = '';
        gameEnded = false; aiThinking = false; boardMounted = false; cellCache = [];
    }

    return { id, levels, init, destroy };
})();
