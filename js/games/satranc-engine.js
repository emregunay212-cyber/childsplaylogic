/* ============================================
   SATRANÇ MOTORU - Kural + Minimax AI
   Tam kurallar: rok, en passant, piyon terfisi,
   şah, mat, pat kontrolü + değişken zorluk AI
   ============================================ */

const ChessEngine = (() => {

    // Taş sembolleri (fallback)
    const PIECES = {
        K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
        k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
    };

    // SVG taş URL'leri (Wikimedia Commons standart satranç taşları)
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

    const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    // Pozisyon bonus tabloları (basitleştirilmiş)
    const PST = {
        p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
        n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
        b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
        r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
        q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
        k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
    };

    const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    // ── FEN Parsing ──
    function fenToBoard(fen) {
        const parts = fen.split(' ');
        const rows = parts[0].split('/');
        const board = [];
        for (const row of rows) {
            const r = [];
            for (const ch of row) {
                if (ch >= '1' && ch <= '8') {
                    for (let i = 0; i < parseInt(ch); i++) r.push(null);
                } else {
                    r.push(ch);
                }
            }
            board.push(r);
        }
        return {
            board, turn: parts[1] || 'w',
            castling: parts[2] || '-', enPassant: parts[3] || '-',
            halfmove: parseInt(parts[4]) || 0, fullmove: parseInt(parts[5]) || 1
        };
    }

    function boardToFen(state) {
        let fen = '';
        for (let r = 0; r < 8; r++) {
            let empty = 0;
            for (let c = 0; c < 8; c++) {
                if (state.board[r][c] === null) { empty++; }
                else {
                    if (empty > 0) { fen += empty; empty = 0; }
                    fen += state.board[r][c];
                }
            }
            if (empty > 0) fen += empty;
            if (r < 7) fen += '/';
        }
        return `${fen} ${state.turn} ${state.castling} ${state.enPassant} ${state.halfmove} ${state.fullmove}`;
    }

    function isWhite(piece) { return piece && piece === piece.toUpperCase(); }
    function isBlack(piece) { return piece && piece === piece.toLowerCase(); }
    function isOwnPiece(piece, turn) { return turn === 'w' ? isWhite(piece) : isBlack(piece); }
    function isEnemyPiece(piece, turn) { return piece && !isOwnPiece(piece, turn); }

    // ── Hamle Üretimi ──
    function generateMoves(state, onlyCaptures = false) {
        const moves = [];
        const { board, turn, castling, enPassant } = state;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece || !isOwnPiece(piece, turn)) continue;
                const type = piece.toLowerCase();

                if (type === 'p') generatePawnMoves(board, r, c, turn, enPassant, moves, onlyCaptures);
                else if (type === 'n') generateKnightMoves(board, r, c, turn, moves, onlyCaptures);
                else if (type === 'b') generateSlidingMoves(board, r, c, turn, [[-1,-1],[-1,1],[1,-1],[1,1]], moves, onlyCaptures);
                else if (type === 'r') generateSlidingMoves(board, r, c, turn, [[-1,0],[1,0],[0,-1],[0,1]], moves, onlyCaptures);
                else if (type === 'q') generateSlidingMoves(board, r, c, turn, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], moves, onlyCaptures);
                else if (type === 'k') generateKingMoves(board, r, c, turn, castling, moves, onlyCaptures);
            }
        }
        return moves;
    }

    function generatePawnMoves(board, r, c, turn, ep, moves, onlyCaptures) {
        const dir = turn === 'w' ? -1 : 1;
        const startRow = turn === 'w' ? 6 : 1;
        const promoRow = turn === 'w' ? 0 : 7;

        // İleri
        if (!onlyCaptures) {
            const nr = r + dir;
            if (nr >= 0 && nr < 8 && !board[nr][c]) {
                if (nr === promoRow) {
                    ['q','r','b','n'].forEach(p => moves.push({ from: [r,c], to: [nr,c], promotion: turn === 'w' ? p.toUpperCase() : p }));
                } else {
                    moves.push({ from: [r,c], to: [nr,c] });
                    // Çift adım
                    if (r === startRow && !board[nr + dir][c]) {
                        moves.push({ from: [r,c], to: [nr + dir, c], doublePush: true });
                    }
                }
            }
        }

        // Yeme
        for (const dc of [-1, 1]) {
            const nr = r + dir, nc = c + dc;
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
            if (board[nr][nc] && isEnemyPiece(board[nr][nc], turn)) {
                if (nr === promoRow) {
                    ['q','r','b','n'].forEach(p => moves.push({ from: [r,c], to: [nr,nc], promotion: turn === 'w' ? p.toUpperCase() : p, capture: board[nr][nc] }));
                } else {
                    moves.push({ from: [r,c], to: [nr,nc], capture: board[nr][nc] });
                }
            }
            // En passant
            if (ep !== '-') {
                const epC = ep.charCodeAt(0) - 97;
                const epR = 8 - parseInt(ep[1]);
                if (nr === epR && nc === epC) {
                    moves.push({ from: [r,c], to: [nr,nc], enPassant: true, capture: board[r][nc] });
                }
            }
        }
    }

    function generateKnightMoves(board, r, c, turn, moves, onlyCaptures) {
        const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of offsets) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
            if (isOwnPiece(board[nr][nc], turn)) continue;
            if (onlyCaptures && !board[nr][nc]) continue;
            moves.push({ from: [r,c], to: [nr,nc], capture: board[nr][nc] || undefined });
        }
    }

    function generateSlidingMoves(board, r, c, turn, dirs, moves, onlyCaptures) {
        for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                if (isOwnPiece(board[nr][nc], turn)) break;
                if (board[nr][nc]) {
                    moves.push({ from: [r,c], to: [nr,nc], capture: board[nr][nc] });
                    break;
                }
                if (!onlyCaptures) moves.push({ from: [r,c], to: [nr,nc] });
                nr += dr; nc += dc;
            }
        }
    }

    function generateKingMoves(board, r, c, turn, castling, moves, onlyCaptures) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
                if (isOwnPiece(board[nr][nc], turn)) continue;
                if (onlyCaptures && !board[nr][nc]) continue;
                moves.push({ from: [r,c], to: [nr,nc], capture: board[nr][nc] || undefined });
            }
        }

        // Rok
        if (!onlyCaptures) {
            if (turn === 'w') {
                if (castling.includes('K') && !board[7][5] && !board[7][6] && board[7][7] === 'R') {
                    if (!isSquareAttacked(board, 7, 4, 'b') && !isSquareAttacked(board, 7, 5, 'b') && !isSquareAttacked(board, 7, 6, 'b'))
                        moves.push({ from: [7,4], to: [7,6], castle: 'K' });
                }
                if (castling.includes('Q') && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0] === 'R') {
                    if (!isSquareAttacked(board, 7, 4, 'b') && !isSquareAttacked(board, 7, 3, 'b') && !isSquareAttacked(board, 7, 2, 'b'))
                        moves.push({ from: [7,4], to: [7,2], castle: 'Q' });
                }
            } else {
                if (castling.includes('k') && !board[0][5] && !board[0][6] && board[0][7] === 'r') {
                    if (!isSquareAttacked(board, 0, 4, 'w') && !isSquareAttacked(board, 0, 5, 'w') && !isSquareAttacked(board, 0, 6, 'w'))
                        moves.push({ from: [0,4], to: [0,6], castle: 'k' });
                }
                if (castling.includes('q') && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0] === 'r') {
                    if (!isSquareAttacked(board, 0, 4, 'w') && !isSquareAttacked(board, 0, 3, 'w') && !isSquareAttacked(board, 0, 2, 'w'))
                        moves.push({ from: [0,4], to: [0,2], castle: 'q' });
                }
            }
        }
    }

    // Kare saldırı altında mı
    function isSquareAttacked(board, r, c, byColor) {
        // Şövalye saldırısı
        const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        const kn = byColor === 'w' ? 'N' : 'n';
        for (const [dr, dc] of knightOffsets) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === kn) return true;
        }

        // Kral saldırısı
        const ki = byColor === 'w' ? 'K' : 'k';
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === ki) return true;
            }
        }

        // Piyon saldırısı
        const pDir = byColor === 'w' ? 1 : -1;
        const pw = byColor === 'w' ? 'P' : 'p';
        for (const dc of [-1, 1]) {
            const nr = r + pDir, nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === pw) return true;
        }

        // Kayar taş saldırısı (fil, kale, vezir)
        const diagPieces = byColor === 'w' ? ['B', 'Q'] : ['b', 'q'];
        const straightPieces = byColor === 'w' ? ['R', 'Q'] : ['r', 'q'];

        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                if (board[nr][nc]) {
                    if (diagPieces.includes(board[nr][nc])) return true;
                    break;
                }
                nr += dr; nc += dc;
            }
        }
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                if (board[nr][nc]) {
                    if (straightPieces.includes(board[nr][nc])) return true;
                    break;
                }
                nr += dr; nc += dc;
            }
        }

        return false;
    }

    // ── Hamle Yapma ──
    function makeMove(state, move) {
        const newBoard = state.board.map(r => [...r]);
        const [fr, fc] = move.from;
        const [tr, tc] = move.to;
        const piece = newBoard[fr][fc];

        let newCastling = state.castling;
        let newEP = '-';
        let captured = move.capture || null;

        // En passant yeme
        if (move.enPassant) {
            newBoard[fr][tc] = null;
        }

        // Piyon çift adım → ep kaydı
        if (move.doublePush) {
            const epRow = state.turn === 'w' ? fr - 1 : fr + 1;
            newEP = String.fromCharCode(97 + fc) + (8 - epRow);
        }

        // Rok
        if (move.castle) {
            if (move.castle === 'K') { newBoard[7][5] = 'R'; newBoard[7][7] = null; }
            else if (move.castle === 'Q') { newBoard[7][3] = 'R'; newBoard[7][0] = null; }
            else if (move.castle === 'k') { newBoard[0][5] = 'r'; newBoard[0][7] = null; }
            else if (move.castle === 'q') { newBoard[0][3] = 'r'; newBoard[0][0] = null; }
        }

        // Piyon terfisi
        if (move.promotion) {
            newBoard[tr][tc] = move.promotion;
        } else {
            newBoard[tr][tc] = piece;
        }
        newBoard[fr][fc] = null;

        // Rok haklarını güncelle
        if (piece === 'K') newCastling = newCastling.replace('K', '').replace('Q', '');
        if (piece === 'k') newCastling = newCastling.replace('k', '').replace('q', '');
        if (fr === 7 && fc === 0) newCastling = newCastling.replace('Q', '');
        if (fr === 7 && fc === 7) newCastling = newCastling.replace('K', '');
        if (fr === 0 && fc === 0) newCastling = newCastling.replace('q', '');
        if (fr === 0 && fc === 7) newCastling = newCastling.replace('k', '');
        if (tr === 7 && tc === 0) newCastling = newCastling.replace('Q', '');
        if (tr === 7 && tc === 7) newCastling = newCastling.replace('K', '');
        if (tr === 0 && tc === 0) newCastling = newCastling.replace('q', '');
        if (tr === 0 && tc === 7) newCastling = newCastling.replace('k', '');
        if (newCastling === '') newCastling = '-';

        return {
            board: newBoard,
            turn: state.turn === 'w' ? 'b' : 'w',
            castling: newCastling,
            enPassant: newEP,
            halfmove: (captured || piece.toLowerCase() === 'p') ? 0 : state.halfmove + 1,
            fullmove: state.turn === 'b' ? state.fullmove + 1 : state.fullmove,
            captured
        };
    }

    // ── Yasal Hamle Kontrolü (şah durumu filtre) ──
    function getLegalMoves(state) {
        const pseudoMoves = generateMoves(state);
        return pseudoMoves.filter(move => {
            const newState = makeMove(state, move);
            const kingPos = findKing(newState.board, state.turn);
            if (!kingPos) return false;
            const enemy = state.turn === 'w' ? 'b' : 'w';
            return !isSquareAttacked(newState.board, kingPos[0], kingPos[1], enemy);
        });
    }

    function getMovesForSquare(state, r, c) {
        return getLegalMoves(state).filter(m => m.from[0] === r && m.from[1] === c);
    }

    function findKing(board, color) {
        const king = color === 'w' ? 'K' : 'k';
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (board[r][c] === king) return [r, c];
        return null;
    }

    // ── Durum Kontrolü ──
    function isCheck(state) {
        const kingPos = findKing(state.board, state.turn);
        if (!kingPos) return false;
        const enemy = state.turn === 'w' ? 'b' : 'w';
        return isSquareAttacked(state.board, kingPos[0], kingPos[1], enemy);
    }

    function isCheckmate(state) {
        return isCheck(state) && getLegalMoves(state).length === 0;
    }

    function isStalemate(state) {
        return !isCheck(state) && getLegalMoves(state).length === 0;
    }

    function isDraw(state) {
        if (isStalemate(state)) return true;
        if (state.halfmove >= 100) return true; // 50 hamle kuralı
        return false;
    }

    // ── Değerlendirme ──
    function evaluate(state) {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = state.board[r][c];
                if (!piece) continue;
                const type = piece.toLowerCase();
                const val = PIECE_VALUES[type] || 0;
                const pstIdx = isWhite(piece) ? r * 8 + c : (7 - r) * 8 + c;
                const pstVal = PST[type] ? PST[type][pstIdx] : 0;
                if (isWhite(piece)) score += val + pstVal;
                else score -= val + pstVal;
            }
        }
        return state.turn === 'w' ? score : -score;
    }

    // ── Minimax AI ──
    function minimax(state, depth, alpha, beta, maximizing) {
        if (depth === 0) return evaluate(state);

        const moves = getLegalMoves(state);
        if (moves.length === 0) {
            if (isCheck(state)) return maximizing ? -99999 : 99999;
            return 0; // pat
        }

        // Hamle sıralaması (yeme önce)
        moves.sort((a, b) => (b.capture ? PIECE_VALUES[b.capture.toLowerCase()] || 0 : 0) - (a.capture ? PIECE_VALUES[a.capture.toLowerCase()] || 0 : 0));

        if (maximizing) {
            let best = -Infinity;
            for (const move of moves) {
                const newState = makeMove(state, move);
                const val = minimax(newState, depth - 1, alpha, beta, false);
                best = Math.max(best, val);
                alpha = Math.max(alpha, val);
                if (beta <= alpha) break;
            }
            return best;
        } else {
            let best = Infinity;
            for (const move of moves) {
                const newState = makeMove(state, move);
                const val = minimax(newState, depth - 1, alpha, beta, true);
                best = Math.min(best, val);
                beta = Math.min(beta, val);
                if (beta <= alpha) break;
            }
            return best;
        }
    }

    function getBestMove(state, depth = 2) {
        const moves = getLegalMoves(state);
        if (moves.length === 0) return null;

        // Derinlik 0 = rastgele hamle
        if (depth <= 0) {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        // Hamle sıralaması
        moves.sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));

        let bestMove = moves[0];
        let bestScore = -Infinity;

        for (const move of moves) {
            const newState = makeMove(state, move);
            const score = -minimax(newState, depth - 1, -Infinity, Infinity, false);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    // ── Yardımcılar ──
    function squareToAlg(r, c) {
        return String.fromCharCode(97 + c) + (8 - r);
    }

    function algToSquare(alg) {
        return [8 - parseInt(alg[1]), alg.charCodeAt(0) - 97];
    }

    function getSymbol(piece) {
        return PIECES[piece] || '';
    }

    function getPieceSVG(piece) {
        return PIECE_SVGS[piece] || null;
    }

    return {
        START_FEN, PIECES, PIECE_VALUES,
        fenToBoard, boardToFen,
        getLegalMoves, getMovesForSquare,
        makeMove, isCheck, isCheckmate, isStalemate, isDraw,
        evaluate, getBestMove,
        squareToAlg, algToSquare, getSymbol,
        findKing, isSquareAttacked, isWhite, isBlack, isOwnPiece,
        getPieceSVG, PIECE_SVGS
    };
})();
