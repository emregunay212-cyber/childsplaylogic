/* ============================================
   OYUN: Satranç - Tek Oyunculu (9 Seviye, AI)
   ============================================ */

const Satranc = (() => {
    const id = 'satranc';
    const levels = [
        { depth: 1, errorRate: 0.6, name: 'Çok Kolay' },
        { depth: 1, errorRate: 0.4, name: 'Kolay' },
        { depth: 2, errorRate: 0.4, name: 'Kolay+' },
        { depth: 2, errorRate: 0.2, name: 'Orta' },
        { depth: 3, errorRate: 0.2, name: 'Orta+' },
        { depth: 3, errorRate: 0.1, name: 'Zor' },
        { depth: 4, errorRate: 0.1, name: 'Zor+' },
        { depth: 4, errorRate: 0.0, name: 'Çok Zor' },
        { depth: 5, errorRate: 0.0, name: 'Usta' },
    ];

    let container = null;
    let callbacks = null;
    let state = null;
    let selectedSquare = null;
    let validMoves = [];
    let lastMove = null;
    let playerColor = 'w';
    let aiDepth = 1;
    let aiErrorRate = 0;
    let aiThinking = false;
    let moveCount = 0;
    let capturedByMe = [];
    let capturedByAI = [];
    let gameEnded = false;
    let stateHistory = []; // hamle geri alma için

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        const config = levels[level - 1];
        aiDepth = config.depth;
        aiErrorRate = config.errorRate || 0;
        playerColor = 'w';
        state = ChessEngine.fenToBoard(ChessEngine.START_FEN);
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

        GameEngine.setTotal(1);
        render();
    }

    let boardMounted = false;

    function render() {
        if (!boardMounted) {
            // İlk render: DOM yapısını oluştur
            container.innerHTML = `
                <div class="chess-player-info opponent" id="chess-top-info"></div>
                <div class="chess-board" id="chess-board"></div>
                <div class="chess-player-info player" id="chess-bot-info"></div>
                <div id="chess-undo-wrap"></div>
                <div class="chess-status" id="chess-status"></div>
            `;
            boardMounted = true;
        }

        // Yenilen taşları SVG ile göster (null/undefined filtrele)
        function renderCaptured(pieces) {
            return pieces.filter(p => p).map(p => {
                const url = ChessEngine.getPieceSVG(p);
                if (url) return `<img src="${url}" class="chess-captured-piece" alt="${p}" draggable="false">`;
                return ChessEngine.getSymbol(p);
            }).join('');
        }

        // Üst bilgi (AI'ın yediği taşlar = beyaz taşlarım)
        const topEl = container.querySelector('#chess-top-info');
        topEl.innerHTML = `<span class="chess-player-name">🖥️ Bilgisayar</span><span class="chess-captured">${renderCaptured(capturedByAI)}</span>`;

        // Tahta güncelle
        const boardEl = container.querySelector('#chess-board');
        boardEl.innerHTML = '';
        renderBoard(boardEl);

        // Alt bilgi (benim yediğim taşlar = siyah taşları)
        const botEl = container.querySelector('#chess-bot-info');
        botEl.innerHTML = `<span class="chess-player-name">👤 Sen</span><span class="chess-captured">${renderCaptured(capturedByMe)}</span>`;

        // Geri al butonu
        const undoWrap = container.querySelector('#chess-undo-wrap');
        if (stateHistory.length > 0 && !aiThinking && !gameEnded && state.turn === playerColor) {
            undoWrap.innerHTML = '<button class="chess-undo-btn">↩ Hamle Geri Al</button>';
            undoWrap.querySelector('.chess-undo-btn').addEventListener('click', undoMove);
        } else {
            undoWrap.innerHTML = '';
        }

        // Durum mesajı
        const statusEl = container.querySelector('#chess-status');
        if (aiThinking) {
            statusEl.innerHTML = '<span class="chess-thinking">🤔 Düşünüyor...</span>';
        } else if (gameEnded) {
            statusEl.textContent = '';
        } else if (state.turn === playerColor) {
            statusEl.innerHTML = ChessEngine.isCheck(state)
                ? '<span class="chess-check">⚠️ ŞAH! Kralını kurtar!</span>'
                : '<span>♟️ Senin sıran</span>';
        } else {
            statusEl.textContent = '';
        }
    }

    function renderBoard(boardEl) {
        const flipped = playerColor === 'b';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const br = flipped ? 7 - r : r;
                const bc = flipped ? 7 - c : c;
                const cell = document.createElement('div');
                const isDark = (br + bc) % 2 === 1;
                cell.className = `chess-cell ${isDark ? 'dark' : 'light'}`;
                cell.dataset.r = br;
                cell.dataset.c = bc;

                // Son hamle vurgusu
                if (lastMove && ((lastMove.from[0] === br && lastMove.from[1] === bc) || (lastMove.to[0] === br && lastMove.to[1] === bc))) {
                    cell.classList.add('last-move');
                }

                // Şah vurgusu
                if (ChessEngine.isCheck(state)) {
                    const king = state.turn === 'w' ? 'K' : 'k';
                    if (state.board[br][bc] === king) {
                        cell.classList.add('in-check');
                    }
                }

                // Seçili kare
                if (selectedSquare && selectedSquare[0] === br && selectedSquare[1] === bc) {
                    cell.classList.add('selected');
                }

                // Geçerli hamle göstergesi
                const isValidTarget = validMoves.some(m => m.to[0] === br && m.to[1] === bc);
                if (isValidTarget) {
                    cell.classList.add('valid-move');
                    if (state.board[br][bc]) cell.classList.add('valid-capture');
                }

                // Taş
                const piece = state.board[br][bc];
                if (piece) {
                    const svgUrl = ChessEngine.getPieceSVG(piece);
                    if (svgUrl) {
                        const img = document.createElement('img');
                        img.className = 'chess-piece';
                        img.src = svgUrl;
                        img.alt = piece;
                        img.draggable = false;
                        cell.appendChild(img);
                    } else {
                        const span = document.createElement('span');
                        span.className = 'chess-piece';
                        span.textContent = ChessEngine.getSymbol(piece);
                        cell.appendChild(span);
                    }
                }

                // Koordinatlar
                if (c === 0) {
                    const rank = document.createElement('span');
                    rank.className = 'chess-coord rank';
                    rank.textContent = 8 - br;
                    cell.appendChild(rank);
                }
                if (r === 7) {
                    const file = document.createElement('span');
                    file.className = 'chess-coord file';
                    file.textContent = String.fromCharCode(97 + bc);
                    cell.appendChild(file);
                }

                cell.addEventListener('click', () => onCellClick(br, bc));
                boardEl.appendChild(cell);
            }
        }
    }

    function onCellClick(r, c) {
        if (aiThinking || gameEnded || state.turn !== playerColor) return;

        const piece = state.board[r][c];

        // Geçerli hamle hedefine tıklandı
        const targetMove = validMoves.find(m => m.to[0] === r && m.to[1] === c);
        if (targetMove) {
            executeMove(targetMove);
            return;
        }

        // Kendi taşına tıklandı
        if (piece && ChessEngine.isOwnPiece(piece, playerColor)) {
            selectedSquare = [r, c];
            validMoves = ChessEngine.getMovesForSquare(state, r, c);
            AudioManager.play('tap');
            render();
            return;
        }

        // Boş kare veya düşman taşı (seçim iptal)
        selectedSquare = null;
        validMoves = [];
        render();
    }

    function executeMove(move) {
        // Hamle öncesi durumu kaydet (geri alma için)
        stateHistory.push({
            state: ChessEngine.boardToFen(state),
            capturedByMe: [...capturedByMe],
            capturedByAI: [...capturedByAI],
            moveCount,
            lastMove,
        });

        // Piyon terfisi kontrol (otomatik vezir)
        if (move.promotion) {
            move.promotion = playerColor === 'w' ? 'Q' : 'q';
        }

        const result = ChessEngine.makeMove(state, move);
        if (move.capture) {
            capturedByMe.push(move.capture);
        }
        state = result;
        lastMove = move;
        selectedSquare = null;
        validMoves = [];
        moveCount++;

        AudioManager.play(move.capture ? 'success' : 'tap');
        render();

        // Oyun durumu kontrol
        if (checkGameEnd()) return;

        // AI hamlesi
        aiThinking = true;
        render();
        setTimeout(() => {
            const aiMove = ChessEngine.getBestMove(state, aiDepth, aiErrorRate);
            if (aiMove) {
                if (aiMove.capture) {
                    capturedByAI.push(aiMove.capture);
                }
                if (aiMove.promotion) {
                    aiMove.promotion = playerColor === 'w' ? 'q' : 'Q';
                }
                state = ChessEngine.makeMove(state, aiMove);
                lastMove = aiMove;
                moveCount++;
            }
            aiThinking = false;
            render();
            checkGameEnd();
        }, 300 + aiDepth * 100);
    }

    function undoMove() {
        if (stateHistory.length === 0 || aiThinking || gameEnded) return;

        // Son kaydedilen durumu geri yükle (oyuncunun hamle öncesi)
        const prev = stateHistory.pop();
        state = ChessEngine.fenToBoard(prev.state);
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
        if (ChessEngine.isCheckmate(state)) {
            gameEnded = true;
            const playerWon = state.turn !== playerColor;
            if (playerWon) {
                AudioManager.play('levelComplete');
                Particles.celebrate();
                const stars = moveCount < 40 ? 3 : moveCount < 60 ? 2 : 1;
                setTimeout(() => callbacks.onComplete(stars), 800);
            } else {
                AudioManager.play('error');
                // Kaybetti - tekrar dene mesajı
                showLoseMessage();
            }
            return true;
        }
        if (ChessEngine.isStalemate(state) || ChessEngine.isDraw(state)) {
            gameEnded = true;
            setTimeout(() => callbacks.onComplete(1), 800); // Pat = 1 yıldız
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
            init(container, levels.indexOf(levels.find(l => l.depth === aiDepth)) + 1, callbacks);
        };
    }

    function destroy() {
        if (container) container.innerHTML = '';
        gameEnded = false;
        aiThinking = false;
        boardMounted = false;
    }

    return { id, levels, init, destroy };
})();
