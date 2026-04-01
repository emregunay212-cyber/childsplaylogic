/* ============================================
   OYUN: Satranç - Tek Oyunculu (9 Seviye, AI)
   ============================================ */

const Satranc = (() => {
    const id = 'satranc';
    const levels = [
        { depth: 1, errorRate: 0.5, name: 'Çok Kolay' },
        { depth: 1, errorRate: 0.35, name: 'Kolay' },
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

    // Hücre cache - DOM bir kez oluşturulur, sonra sadece güncellenir
    let cellCache = []; // 64 hücre referansı

    function renderCapturedHTML(pieces) {
        return pieces.filter(p => p).map(p => {
            const url = ChessEngine.getPieceSVG(p);
            if (url) return `<img src="${url}" class="chess-captured-piece" alt="${p}" draggable="false">`;
            return ChessEngine.getSymbol(p);
        }).join('');
    }

    function render() {
        if (!boardMounted) {
            // İlk render: DOM yapısını bir kez oluştur
            container.innerHTML = `
                <div class="chess-player-info opponent" id="chess-top-info"></div>
                <div class="chess-board" id="chess-board"></div>
                <div class="chess-player-info player" id="chess-bot-info"></div>
                <div id="chess-undo-wrap"></div>
                <div class="chess-status" id="chess-status"></div>
            `;
            // 64 hücreyi bir kez oluştur
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

        // Üst/Alt bilgi güncelle
        container.querySelector('#chess-top-info').innerHTML =
            `<span class="chess-player-name">🖥️ Bilgisayar</span><span class="chess-captured">${renderCapturedHTML(capturedByAI)}</span>`;
        container.querySelector('#chess-bot-info').innerHTML =
            `<span class="chess-player-name">👤 Sen</span><span class="chess-captured">${renderCapturedHTML(capturedByMe)}</span>`;

        // Tahtayı güncelle - DOM silmeden sadece class ve içerik değiştir
        const isCheck = ChessEngine.isCheck(state);
        const checkKing = isCheck ? (state.turn === 'w' ? 'K' : 'k') : null;

        for (const cached of cellCache) {
            const { el, r: br, c: bc } = cached;
            const isDark = (br + bc) % 2 === 1;

            // Class sıfırla ve yeniden ata
            el.className = `chess-cell ${isDark ? 'dark' : 'light'}`;

            if (lastMove && ((lastMove.from[0] === br && lastMove.from[1] === bc) || (lastMove.to[0] === br && lastMove.to[1] === bc)))
                el.classList.add('last-move');
            if (checkKing && state.board[br][bc] === checkKing)
                el.classList.add('in-check');
            if (selectedSquare && selectedSquare[0] === br && selectedSquare[1] === bc)
                el.classList.add('selected');
            if (validMoves.some(m => m.to[0] === br && m.to[1] === bc)) {
                el.classList.add('valid-move');
                if (state.board[br][bc]) el.classList.add('valid-capture');
            }

            // Taş içeriğini güncelle (sadece değiştiyse)
            const piece = state.board[br][bc];
            const currentPiece = el.dataset.piece || '';
            if (piece !== currentPiece) {
                // Sadece taş elemanını değiştir, koordinatları koru
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
                    } else {
                        const span = document.createElement('span');
                        span.className = 'chess-piece';
                        span.textContent = ChessEngine.getSymbol(piece);
                        el.insertBefore(span, el.firstChild);
                    }
                }
                el.dataset.piece = piece || '';
            }

            // Koordinatlar (sadece ilk render'da yoksa ekle)
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
        if (stateHistory.length > 0 && !aiThinking && !gameEnded && state.turn === playerColor) {
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
        } else if (state.turn === playerColor) {
            statusEl.innerHTML = isCheck
                ? '<span class="chess-check">⚠️ ŞAH! Kralını kurtar!</span>'
                : '<span>♟️ Senin sıran</span>';
        } else {
            statusEl.textContent = '';
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
