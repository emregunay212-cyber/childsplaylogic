/* ============================================
   SATRANÇ MOTORU - chess.js + Stockfish.js
   chess.js: Kural motoru (hamle üretimi, validasyon)
   Stockfish.js: AI motor (WASM, Web Worker)
   ============================================ */

const ChessEngine = (() => {

    // Taş SVG URL'leri (Wikimedia Commons)
    const PIECE_SVGS = {
        K: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
        Q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
        R: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
        B: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
        N: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
        P: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
        k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
        q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
        r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
        b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
        n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
        p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    };

    const PIECES = {
        K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
        k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
    };

    const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    // ── Stockfish Web Worker ──
    let sfWorker = null;
    let sfReady = false;
    let sfResolve = null;

    // Stockfish'i başlat (lazy load - sadece gerektiğinde)
    function initStockfish() {
        return new Promise((resolve) => {
            if (sfReady) return resolve();

            try {
                // Stockfish.js lokal dosyadan Blob Worker oluştur
                const sfUrl = new URL('js/lib/stockfish.js', window.location.href).href;
                const blob = new Blob(
                    [`importScripts("${sfUrl}");`],
                    { type: 'application/javascript' }
                );
                sfWorker = new Worker(URL.createObjectURL(blob));

                let uciTimeout = setTimeout(() => {
                    if (!sfReady) {
                        console.warn('Stockfish UCI timeout, fallback AI');
                        resolve();
                    }
                }, 8000);

                sfWorker.onmessage = (e) => {
                    const line = typeof e.data === 'string' ? e.data : e.data?.data || '';

                    if (line === 'uciok') {
                        sfReady = true;
                        clearTimeout(uciTimeout);
                        resolve();
                    }

                    // bestmove yanıtı
                    if (line.startsWith('bestmove') && sfResolve) {
                        const move = line.split(' ')[1];
                        sfResolve(move);
                        sfResolve = null;
                    }
                };

                sfWorker.onerror = (err) => {
                    console.warn('Stockfish Worker hatası:', err);
                    sfReady = false;
                    clearTimeout(uciTimeout);
                    resolve();
                };

                sfWorker.postMessage('uci');
            } catch (err) {
                console.warn('Worker oluşturulamadı:', err);
                sfReady = false;
                resolve();
            }
        });
    }

    // Stockfish'ten en iyi hamleyi al
    function getStockfishMove(fen, skillLevel, depth) {
        return new Promise((resolve) => {
            if (!sfWorker || !sfReady) {
                resolve(null); // Stockfish yoksa null dön
                return;
            }

            sfResolve = resolve;

            sfWorker.postMessage('ucinewgame');
            sfWorker.postMessage(`setoption name Skill Level value ${skillLevel}`);
            sfWorker.postMessage(`position fen ${fen}`);
            sfWorker.postMessage(`go depth ${depth}`);

            // Timeout - 10 saniye sonra iptal
            setTimeout(() => {
                if (sfResolve) {
                    sfResolve(null);
                    sfResolve = null;
                }
            }, 10000);
        });
    }

    // Stockfish kapanışı
    function destroyStockfish() {
        if (sfWorker) {
            sfWorker.terminate();
            sfWorker = null;
            sfReady = false;
            sfResolve = null;
        }
    }

    function isStockfishReady() { return sfReady; }

    // ── chess.js Wrapper (uyumluluk) ──

    function createGame(fen) {
        return new Chess(fen || START_FEN);
    }

    function getSymbol(piece) { return PIECES[piece] || ''; }
    function getPieceSVG(piece) { return PIECE_SVGS[piece] || null; }
    function isWhite(piece) { return piece && piece === piece.toUpperCase(); }
    function isBlack(piece) { return piece && piece === piece.toLowerCase(); }
    function isOwnPiece(piece, turn) { return turn === 'w' ? isWhite(piece) : isBlack(piece); }

    // chess.js oyun objesinden 8x8 board dizisi çıkar
    function gameToBoard(game) {
        const board = [];
        for (let r = 0; r < 8; r++) {
            const row = [];
            for (let c = 0; c < 8; c++) {
                const sq = String.fromCharCode(97 + c) + (8 - r);
                const piece = game.get(sq);
                if (piece) {
                    row.push(piece.color === 'w' ? piece.type.toUpperCase() : piece.type);
                } else {
                    row.push(null);
                }
            }
            board.push(row);
        }
        return board;
    }

    // Koordinat dönüşümleri
    function rcToSquare(r, c) {
        return String.fromCharCode(97 + c) + (8 - r);
    }

    function squareToRC(sq) {
        return [8 - parseInt(sq[1]), sq.charCodeAt(0) - 97];
    }

    // Bir kare için geçerli hamleleri al
    function getMovesForSquare(game, r, c) {
        const sq = rcToSquare(r, c);
        return game.moves({ square: sq, verbose: true });
    }

    // Stockfish hamle formatını (e2e4) chess.js move objesine çevir
    function sfMoveToChessMove(sfMove) {
        if (!sfMove || sfMove.length < 4) return null;
        const from = sfMove.substring(0, 2);
        const to = sfMove.substring(2, 4);
        const promotion = sfMove.length > 4 ? sfMove[4] : undefined;
        return { from, to, promotion };
    }

    // ── Fallback AI (Stockfish yoksa) ──
    function getFallbackMove(game, errorRate) {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) return null;

        // Hata oranına göre rastgele hamle
        if (Math.random() < errorRate) {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        // Basit değerlendirme: yeme hamlelerini tercih et
        const vals = { p: 1, n: 3, b: 3, r: 5, q: 9 };
        moves.sort((a, b) => {
            const aVal = a.captured ? (vals[a.captured] || 0) : 0;
            const bVal = b.captured ? (vals[b.captured] || 0) : 0;
            return bVal - aVal;
        });

        // En iyi 3 hamleden rastgele seç
        const top = moves.slice(0, Math.min(3, moves.length));
        return top[Math.floor(Math.random() * top.length)];
    }

    return {
        START_FEN, PIECES, PIECE_SVGS,
        createGame, gameToBoard,
        getSymbol, getPieceSVG,
        isWhite, isBlack, isOwnPiece,
        rcToSquare, squareToRC,
        getMovesForSquare, sfMoveToChessMove,
        initStockfish, getStockfishMove, destroyStockfish, isStockfishReady,
        getFallbackMove,
    };
})();
