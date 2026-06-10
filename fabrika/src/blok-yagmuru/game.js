/* ============================================
   OYUN: Blok Yağmuru / Block Rain
   Klasik 10x20 blok-dizme — düşen parçalar,
   satır temizleme, kademeli hızlanan seviye sistemi.
   Çocuk dostu: yavaş başlar, ghost piece ile yardımcı.
   ============================================ */

const BlokYagmuru = (() => {
    const id = 'blok-yagmuru';
    const levels = [{}];

    // ---- Tahta ----
    const COLS = 10, ROWS = 20;
    const CELL = 32;                       // hücre boyutu (dünya px)
    const BOARD_W = COLS * CELL;           // 320
    const BOARD_H = ROWS * CELL;           // 640
    const BOARD_X = 24, BOARD_Y = 40;
    const PANEL_X = BOARD_X + BOARD_W + 24; // 368
    const GAME_W = 560, GAME_H = 720;

    // ---- Hız (yavaş başla → kademeli hızlan) ----
    const BASE_DROP_MS = 1000;
    const DROP_DECAY = 0.82;               // her seviyede çarpan
    const MIN_DROP_MS = 120;
    const LINES_PER_LEVEL = 10;

    // DAS / ARR (yatay tuş basılı tutma)
    const DAS_MS = 170;                    // ilk gecikme
    const ARR_MS = 55;                     // tekrar aralığı
    const SOFT_DROP_MS = 45;               // yumuşak düşüş aralığı

    // ---- Parça tanımları ----
    // Her parça bir matris; renk anahtarı COLORS sözlüğüne işaret eder.
    const SHAPES = {
        I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        O: [[1,1],[1,1]],
        T: [[0,1,0],[1,1,1],[0,0,0]],
        S: [[0,1,1],[1,1,0],[0,0,0]],
        Z: [[1,1,0],[0,1,1],[0,0,0]],
        J: [[1,0,0],[1,1,1],[0,0,0]],
        L: [[0,0,1],[1,1,1],[0,0,0]],
    };
    const PIECE_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    // Klasik renkler, çocuk dostu yumuşatılmış canlı tonlar
    const COLORS = {
        I: '#33C4D6',  // cyan
        O: '#F7C948',  // sarı
        T: '#B069D6',  // mor
        S: '#5FC97A',  // yeşil
        Z: '#EC6A6A',  // kırmızı
        J: '#5B8DEF',  // mavi
        L: '#F2994A',  // turuncu
    };
    const COLORS_LIGHT = {
        I: '#7BE0EC', O: '#FCE08A', T: '#D29CEC', S: '#90E0A3',
        Z: '#F7A0A0', J: '#94B7F7', L: '#F7C08A',
    };
    const COLORS_DARK = {
        I: '#1F8B99', O: '#C99A22', T: '#7E47A0', S: '#3E9656',
        Z: '#C24545', J: '#3A63B5', L: '#C26F25',
    };
    const FRAME_COLOR = '#5C6BC0';

    // ---- Durum ----
    let container, callbacks;
    let canvas, ctx, canvasFit;
    let uiLayer;
    let board;                             // ROWS×COLS, '' veya parça anahtarı
    let current;                           // { key, matrix, x, y }
    let nextKey;
    let bag;                               // 7-bag randomizer
    let score, lines, level, bestScore;
    let dropMs, dropAccum;
    let state;                             // countdown | playing | gameover | destroyed
    let lastTime, animFrameId;
    let finalScore;
    let countdownEndAt, countdownSec;
    let flashRows;                         // temizlenirken parlayan satırlar
    let flashTimer;
    let shake;                             // game over / hard drop sarsıntısı

    // Input
    let keyDownHandler, keyUpHandler;
    let moveDir;                           // -1, 0, 1 (yatay)
    let dasTimer, dasCharged;
    let softDrop, softTimer;

    // ---- Yardımcılar ----
    function nowMs() { return performance.now(); }

    // 7-bag: tüm parçaları karıştırıp sırayla dağıt (adil dağıtım)
    function refillBag() {
        bag = PIECE_KEYS.slice();
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
    }
    function nextFromBag() {
        if (!bag || bag.length === 0) refillBag();
        return bag.pop();
    }

    function makePiece(key) {
        const matrix = SHAPES[key].map(row => row.slice());
        const w = matrix[0].length;
        const x = Math.floor((COLS - w) / 2);
        // I parçasında üst satır boş; biraz yukarıda başlat
        return { key, matrix, x, y: (key === 'I' ? -1 : 0) };
    }

    function rotateMatrix(m) {
        const n = m.length, w = m[0].length;
        const out = [];
        for (let c = 0; c < w; c++) {
            const row = [];
            for (let r = n - 1; r >= 0; r--) row.push(m[r][c]);
            out.push(row);
        }
        return out;
    }

    // Parça hücrelerinin tahtaya/sınıra çarpıp çarpmadığı
    function collides(matrix, px, py) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (!matrix[r][c]) continue;
                const x = px + c, y = py + r;
                if (x < 0 || x >= COLS || y >= ROWS) return true;
                if (y >= 0 && board[y][x]) return true;
            }
        }
        return false;
    }

    // ---- Init / Destroy ----
    function init(gameArea, level_, cbs) {
        container = gameArea;
        callbacks = cbs || {};
        bestScore = parseInt(Storage.get('blok-yagmuru-best') || '0', 10) || 0;
        buildDOM();
        bindInput();
        resetGame();
        lastTime = nowMs();
        gameLoop();
    }

    function destroy() {
        state = 'destroyed';
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (canvasFit) { canvasFit.disconnect(); canvasFit = null; }
        unbindInput();
        if (container) container.innerHTML = '';
    }

    function resetGame() {
        SDK.gameplayStart();
        board = [];
        for (let r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(''));
        score = 0; lines = 0; level = 1;
        dropMs = BASE_DROP_MS; dropAccum = 0;
        finalScore = 0;
        flashRows = null; flashTimer = 0; shake = 0;
        moveDir = 0; dasTimer = 0; dasCharged = false;
        softDrop = false; softTimer = 0;

        refillBag();
        nextKey = nextFromBag();
        spawnPiece();

        state = 'countdown';
        countdownEndAt = nowMs() + 3000;
        countdownSec = 3;
    }

    function spawnPiece() {
        current = makePiece(nextKey);
        nextKey = nextFromBag();
        // Spawn noktasında çarpışma varsa oyun biter (tahta doldu)
        if (collides(current.matrix, current.x, current.y)) {
            triggerGameOver();
        }
    }

    // ---- DOM ----
    function buildDOM() {
        container.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'tt-wrap';

        canvas = document.createElement('canvas');
        canvas.className = 'tt-canvas';
        ctx = canvas.getContext('2d');
        try { canvasFit = MobileUtils.attachResponsiveCanvas(canvas, ctx, GAME_W, GAME_H); }
        catch (e) { canvas.width = GAME_W; canvas.height = GAME_H; }
        canvas.style.touchAction = 'none';
        wrap.appendChild(canvas);

        uiLayer = document.createElement('div');
        uiLayer.className = 'tt-ui-layer';
        wrap.appendChild(uiLayer);

        const hint = document.createElement('div');
        hint.className = 'tt-hint';
        const hintSpan = document.createElement('span');
        hintSpan.textContent = T('tt.hint');
        hint.appendChild(hintSpan);
        uiLayer.appendChild(hint);

        // Mobil dokunmatik butonlar
        const mobile = document.createElement('div');
        mobile.className = 'tt-mobile';
        const mkBtn = (cls, act, labelKey, txt) => {
            const b = document.createElement('button');
            b.className = 'tt-mbtn ' + cls;
            b.dataset.act = act;
            b.setAttribute('aria-label', T(labelKey));
            b.textContent = txt;
            return b;
        };
        mobile.appendChild(mkBtn('tt-mleft', 'left', 'tt.left', '◀'));
        mobile.appendChild(mkBtn('tt-mrotate', 'rotate', 'tt.rotate', '↻'));
        mobile.appendChild(mkBtn('tt-mright', 'right', 'tt.right', '▶'));
        mobile.appendChild(mkBtn('tt-msoft', 'soft', 'tt.soft', '▼'));
        mobile.appendChild(mkBtn('tt-mdrop', 'drop', 'tt.drop', '⤓'));
        uiLayer.appendChild(mobile);

        container.appendChild(wrap);
    }

    // ---- Input ----
    function bindInput() {
        keyDownHandler = (e) => {
            if (state === 'gameover' || state === 'destroyed') return;
            switch (e.key) {
                case 'ArrowLeft': case 'a': case 'A':
                    startMove(-1); e.preventDefault(); break;
                case 'ArrowRight': case 'd': case 'D':
                    startMove(1); e.preventDefault(); break;
                case 'ArrowUp': case 'x': case 'X': case 'w': case 'W':
                    if (state === 'playing' && !e.repeat) rotate(1);
                    e.preventDefault(); break;
                case 'z': case 'Z': case 'Control':
                    if (state === 'playing' && !e.repeat) rotate(-1);
                    e.preventDefault(); break;
                case 'ArrowDown': case 's': case 'S':
                    softDrop = true; softTimer = SOFT_DROP_MS; e.preventDefault(); break;
                case ' ': case 'Spacebar':
                    if (state === 'playing' && !e.repeat) hardDrop();
                    e.preventDefault(); break;
            }
        };
        keyUpHandler = (e) => {
            switch (e.key) {
                case 'ArrowLeft': case 'a': case 'A':
                    if (moveDir === -1) stopMove(); break;
                case 'ArrowRight': case 'd': case 'D':
                    if (moveDir === 1) stopMove(); break;
                case 'ArrowDown': case 's': case 'S':
                    softDrop = false; break;
            }
        };
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);

        // Mobil — basılı tutma desteği
        if (uiLayer) {
            uiLayer.querySelectorAll('.tt-mbtn').forEach((btn) => {
                const act = btn.dataset.act;
                if (act === 'left' || act === 'right') {
                    const dir = act === 'left' ? -1 : 1;
                    bindHold(btn, () => startMove(dir), () => { if (moveDir === dir) stopMove(); });
                } else if (act === 'soft') {
                    bindHold(btn, () => { softDrop = true; softTimer = SOFT_DROP_MS; }, () => { softDrop = false; });
                } else if (act === 'rotate') {
                    bindTap(btn, () => { if (state === 'playing') rotate(1); });
                } else if (act === 'drop') {
                    bindTap(btn, () => { if (state === 'playing') hardDrop(); });
                }
            });
        }
    }

    function bindHold(btn, onPress, onRelease) {
        if (typeof MobileUtils !== 'undefined' && MobileUtils.bindHoldButton) {
            MobileUtils.bindHoldButton(btn, onPress, onRelease);
        } else {
            btn.addEventListener('mousedown', (e) => { e.preventDefault(); onPress(); });
            btn.addEventListener('mouseup', onRelease);
            btn.addEventListener('mouseleave', onRelease);
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); onPress(); }, { passive: false });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); onRelease(); }, { passive: false });
        }
    }
    function bindTap(btn, onTap) {
        btn.addEventListener('click', (e) => { e.preventDefault(); onTap(); });
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); onTap(); }, { passive: false });
    }

    function unbindInput() {
        document.removeEventListener('keydown', keyDownHandler);
        document.removeEventListener('keyup', keyUpHandler);
    }

    // ---- Hareket ----
    function startMove(dir) {
        moveDir = dir;
        dasTimer = 0;
        dasCharged = false;
        if (state === 'playing') tryMove(dir, 0);
    }
    function stopMove() {
        moveDir = 0;
        dasTimer = 0;
        dasCharged = false;
    }

    function tryMove(dx, dy) {
        if (!collides(current.matrix, current.x + dx, current.y + dy)) {
            current.x += dx;
            current.y += dy;
            if (dx !== 0) { try { AudioManager.play('tap'); } catch (e) {} }
            return true;
        }
        return false;
    }

    function rotate(dir) {
        let m = current.matrix;
        const turns = dir > 0 ? 1 : 3;
        for (let i = 0; i < turns; i++) m = rotateMatrix(m);
        // Wall kick: yerinde olmazsa yana küçük kaydırmalar dene
        const kicks = [0, -1, 1, -2, 2];
        for (const k of kicks) {
            if (!collides(m, current.x + k, current.y)) {
                current.matrix = m;
                current.x += k;
                try { AudioManager.play('pop'); } catch (e) {}
                return true;
            }
        }
        // Yukarı doğru bir kick (özellikle I parçası dipte)
        if (!collides(m, current.x, current.y - 1)) {
            current.matrix = m;
            current.y -= 1;
            try { AudioManager.play('pop'); } catch (e) {}
            return true;
        }
        return false;
    }

    function hardDrop() {
        let dropped = 0;
        while (!collides(current.matrix, current.x, current.y + 1)) {
            current.y += 1;
            dropped++;
        }
        score += dropped * 2;
        shake = Math.min(6, 2 + dropped * 0.25);
        lockPiece();
    }

    function softStep() {
        if (tryMove(0, 1)) {
            score += 1;
        } else {
            lockPiece();
        }
    }

    function gravityStep() {
        if (!tryMove(0, 1)) {
            lockPiece();
        }
    }

    function lockPiece() {
        const m = current.matrix;
        for (let r = 0; r < m.length; r++) {
            for (let c = 0; c < m[r].length; c++) {
                if (!m[r][c]) continue;
                const x = current.x + c, y = current.y + r;
                if (y >= 0) board[y][x] = current.key;
            }
        }
        try { AudioManager.play('pop'); } catch (e) {}
        clearLines();
        if (state === 'playing') spawnPiece();
    }

    function clearLines() {
        const full = [];
        for (let r = 0; r < ROWS; r++) {
            if (board[r].every(cell => cell)) full.push(r);
        }
        if (full.length === 0) return;

        // Skor (klasik): 1=100, 2=300, 3=500, 4=800 — seviye çarpanı
        const pts = [0, 100, 300, 500, 800][full.length] * level;
        score += pts;
        lines += full.length;

        // Satırları kaldır, üsttekileri aşağı kaydır
        for (const r of full) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(''));
        }

        // Görsel flaş efekti (kaldırılan satır indekslerinde)
        flashRows = full.slice();
        flashTimer = 220;

        // Ses: 4 satır birden farklı
        try { AudioManager.play(full.length >= 4 ? 'complete' : 'success'); } catch (e) {}

        // Seviye güncelle
        const newLevel = Math.floor(lines / LINES_PER_LEVEL) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropMs = Math.max(MIN_DROP_MS, BASE_DROP_MS * Math.pow(DROP_DECAY, level - 1));
            try { AudioManager.play('whoosh'); } catch (e) {}
        }
    }

    // ---- Game Over ----
    function triggerGameOver() {
        if (state === 'gameover') return;
        state = 'gameover';
        SDK.gameplayStop();
        finalScore = score;
        shake = 8;
        if (finalScore > bestScore) {
            bestScore = finalScore;
            SDK.happyMoment();
            try { Storage.set('blok-yagmuru-best', String(bestScore)); } catch (e) {}
        }
        try { AudioManager.play('error'); } catch (e) {}
        setTimeout(showGameOverModal, 450);
    }

    function showGameOverModal() {
        if (state === 'destroyed') return;
        const el = (tag, cls, text) => {
            const e = document.createElement(tag);
            if (cls) e.className = cls;
            if (text !== undefined) e.textContent = text;
            return e;
        };
        const row = (labelKey, value) => {
            const r = el('div', 'tt-go-row');
            r.appendChild(el('span', null, T(labelKey)));
            const b = document.createElement('b');
            b.textContent = String(value);
            r.appendChild(b);
            return r;
        };
        const modal = el('div', 'tt-modal tt-gameover-modal');
        const card = el('div', 'tt-modal-card tt-gameover-card');
        card.appendChild(el('div', 'tt-gameover-title', T('tt.gameover')));
        const scoreBox = el('div', 'tt-gameover-score');
        scoreBox.appendChild(row('tt.score', finalScore));
        scoreBox.appendChild(row('tt.lines', lines));
        scoreBox.appendChild(row('tt.level', level));
        scoreBox.appendChild(row('tt.record', bestScore));
        card.appendChild(scoreBox);
        const btns = el('div', 'tt-gameover-buttons');
        const restartBtn = el('button', 'tt-btn tt-btn-primary', T('tt.retry'));
        const homeBtn = el('button', 'tt-btn tt-btn-secondary', T('tt.home'));
        btns.appendChild(restartBtn);
        btns.appendChild(homeBtn);
        card.appendChild(btns);
        modal.appendChild(card);
        uiLayer.appendChild(modal);

        restartBtn.addEventListener('click', () => {
            modal.remove();
            resetGame();
            lastTime = nowMs();
        });
        homeBtn.addEventListener('click', () => {
            const h = document.getElementById('btn-home');
            if (h) h.click();
        });
    }

    // ---- Döngü ----
    function gameLoop() {
        if (state === 'destroyed') return;
        const t = nowMs();
        const dt = Math.min(100, t - lastTime);
        lastTime = t;

        if (state === 'playing') {
            update(dt);
        } else if (state === 'countdown') {
            updateCountdown();
        }
        if (flashTimer > 0) flashTimer = Math.max(0, flashTimer - dt);
        if (shake > 0) shake = Math.max(0, shake - dt * 0.03);
        draw();
        animFrameId = requestAnimationFrame(gameLoop);
    }

    function updateCountdown() {
        const remainMs = countdownEndAt - nowMs();
        if (remainMs <= 0) {
            state = 'playing';
            lastTime = nowMs();
            try { AudioManager.play('whoosh'); } catch (e) {}
            return;
        }
        const newSec = Math.ceil(remainMs / 1000);
        if (newSec !== countdownSec) {
            countdownSec = newSec;
            try { AudioManager.play('pop'); } catch (e) {}
        }
    }

    function update(dt) {
        // Yatay DAS/ARR (tuş/buton basılı tutunca tekrarlı kaydırma)
        if (moveDir !== 0) {
            dasTimer += dt;
            if (!dasCharged) {
                if (dasTimer >= DAS_MS) { dasCharged = true; dasTimer = 0; tryMove(moveDir, 0); }
            } else {
                while (dasTimer >= ARR_MS) { dasTimer -= ARR_MS; tryMove(moveDir, 0); }
            }
        }

        // Yumuşak düşüş
        if (softDrop) {
            softTimer -= dt;
            while (softTimer <= 0) {
                softTimer += SOFT_DROP_MS;
                softStep();
                if (state !== 'playing') return;
            }
        }

        // Yerçekimi
        dropAccum += dt;
        while (dropAccum >= dropMs) {
            dropAccum -= dropMs;
            gravityStep();
            if (state !== 'playing') return;
        }
    }

    // ---- Çizim ----
    function draw() {
        ctx.clearRect(0, 0, GAME_W, GAME_H);

        // Yumuşak pastel arka plan
        const bg = ctx.createLinearGradient(0, 0, 0, GAME_H);
        bg.addColorStop(0, '#EEF1FB');
        bg.addColorStop(1, '#D7DCF2');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, GAME_W, GAME_H);

        ctx.save();
        if (shake > 0) {
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        drawBoard();
        drawGhost();
        drawCurrent();
        drawPanel();

        ctx.restore();

        if (state === 'countdown') drawCountdownOverlay();
    }

    function cellRect(col, row) {
        return { x: BOARD_X + col * CELL, y: BOARD_Y + row * CELL };
    }

    function roundRectPath(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawRoundedBlock(x, y, size, key, alpha) {
        const pad = 1.5;
        const s = size - pad * 2;
        const rx = x + pad, ry = y + pad;
        const r = 6;
        ctx.globalAlpha = alpha == null ? 1 : alpha;

        // Gövde — dikey gradyan (açık → ana → koyu)
        const grad = ctx.createLinearGradient(rx, ry, rx, ry + s);
        grad.addColorStop(0, COLORS_LIGHT[key]);
        grad.addColorStop(0.5, COLORS[key]);
        grad.addColorStop(1, COLORS_DARK[key]);
        ctx.fillStyle = grad;
        roundRectPath(rx, ry, s, s, r);
        ctx.fill();

        // Üst parlaklık
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        roundRectPath(rx + 3, ry + 3, s - 6, s * 0.32, 4);
        ctx.fill();

        // Kenar
        ctx.globalAlpha = (alpha == null ? 1 : alpha) * 0.5;
        ctx.strokeStyle = COLORS_DARK[key];
        ctx.lineWidth = 1.5;
        roundRectPath(rx, ry, s, s, r);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function drawBoard() {
        // Oyun alanı zemini
        ctx.fillStyle = '#FBFCFF';
        roundRectPath(BOARD_X - 6, BOARD_Y - 6, BOARD_W + 12, BOARD_H + 12, 14);
        ctx.fill();

        // İnce ızgara
        ctx.strokeStyle = 'rgba(120, 130, 190, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 0; c <= COLS; c++) {
            const x = BOARD_X + c * CELL;
            ctx.moveTo(x, BOARD_Y); ctx.lineTo(x, BOARD_Y + BOARD_H);
        }
        for (let r = 0; r <= ROWS; r++) {
            const y = BOARD_Y + r * CELL;
            ctx.moveTo(BOARD_X, y); ctx.lineTo(BOARD_X + BOARD_W, y);
        }
        ctx.stroke();

        // Yerleşmiş bloklar
        for (let r = 0; r < ROWS; r++) {
            const isFlashing = flashRows && flashRows.includes(r) && flashTimer > 0;
            for (let c = 0; c < COLS; c++) {
                if (!board[r][c]) continue;
                const { x, y } = cellRect(c, r);
                drawRoundedBlock(x, y, CELL, board[r][c]);
                if (isFlashing) {
                    ctx.globalAlpha = (flashTimer / 220) * 0.85;
                    ctx.fillStyle = '#ffffff';
                    roundRectPath(x + 1.5, y + 1.5, CELL - 3, CELL - 3, 6);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }
        }

        // Çerçeve
        ctx.strokeStyle = FRAME_COLOR;
        ctx.lineWidth = 3;
        roundRectPath(BOARD_X - 6, BOARD_Y - 6, BOARD_W + 12, BOARD_H + 12, 14);
        ctx.stroke();
    }

    function drawCurrent() {
        if (!current || state === 'gameover') return;
        const m = current.matrix;
        for (let r = 0; r < m.length; r++) {
            for (let c = 0; c < m[r].length; c++) {
                if (!m[r][c]) continue;
                const row = current.y + r;
                if (row < 0) continue;
                const { x, y } = cellRect(current.x + c, row);
                drawRoundedBlock(x, y, CELL, current.key);
            }
        }
    }

    function drawGhost() {
        if (!current || state !== 'playing') return;
        // Düşeceği yeri bul
        let gy = current.y;
        while (!collides(current.matrix, current.x, gy + 1)) gy++;
        if (gy === current.y) return;
        const m = current.matrix;
        for (let r = 0; r < m.length; r++) {
            for (let c = 0; c < m[r].length; c++) {
                if (!m[r][c]) continue;
                const row = gy + r;
                if (row < 0) continue;
                const { x, y } = cellRect(current.x + c, row);
                ctx.globalAlpha = 0.22;
                ctx.fillStyle = COLORS[current.key];
                roundRectPath(x + 2, y + 2, CELL - 4, CELL - 4, 6);
                ctx.fill();
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = COLORS[current.key];
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawPanel() {
        const px = PANEL_X;
        const pw = GAME_W - PANEL_X - 24;   // 144

        // SIRADAKİ parça kutusu
        drawPanelCard(px, BOARD_Y, pw, 130, T('tt.next'));
        drawNextPiece(px, BOARD_Y + 34, pw, 90);

        // Skor / Seviye / Satır / Rekor kartları
        let cy = BOARD_Y + 150;
        cy = drawStatCard(px, cy, pw, T('tt.score_panel'), String(score)) + 14;
        cy = drawStatCard(px, cy, pw, T('tt.level_panel'), String(level)) + 14;
        cy = drawStatCard(px, cy, pw, T('tt.lines_panel'), String(lines)) + 14;
        drawStatCard(px, cy, pw, T('tt.record_panel'), String(Math.max(bestScore, score)));
    }

    function drawPanelCard(x, y, w, h, title) {
        ctx.fillStyle = '#FBFCFF';
        roundRectPath(x, y, w, h, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(92, 107, 192, 0.35)';
        ctx.lineWidth = 2;
        roundRectPath(x, y, w, h, 12);
        ctx.stroke();
        ctx.fillStyle = '#7B86C6';
        ctx.font = '700 12px "Fredoka", "Nunito", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(title, x + 12, y + 11);
        return y + h;
    }

    function drawStatCard(x, y, w, title, value) {
        const h = 56;
        drawPanelCard(x, y, w, h, title);
        ctx.fillStyle = '#3A4178';
        ctx.font = '800 24px "Fredoka", "Nunito", system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(value, x + w - 12, y + 36);
        ctx.textAlign = 'left';
        return y + h;
    }

    function drawNextPiece(x, y, w, h) {
        const m = SHAPES[nextKey];
        const pw = m[0].length, ph = m.length;
        // Dolu hücre sınırlarını bul, ortala
        let minR = ph, maxR = -1, minC = pw, maxC = -1;
        for (let r = 0; r < ph; r++) for (let c = 0; c < pw; c++) {
            if (m[r][c]) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
        }
        const bw = maxC - minC + 1, bh = maxR - minR + 1;
        const cs = Math.min(26, (w - 24) / bw, (h - 12) / bh);
        const totalW = bw * cs, totalH = bh * cs;
        const ox = x + (w - totalW) / 2;
        const oy = y + (h - totalH) / 2;
        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                if (!m[r][c]) continue;
                drawRoundedBlock(ox + (c - minC) * cs, oy + (r - minR) * cs, cs, nextKey);
            }
        }
    }

    function drawCountdownOverlay() {
        ctx.fillStyle = 'rgba(40, 45, 90, 0.35)';
        ctx.fillRect(BOARD_X - 6, BOARD_Y - 6, BOARD_W + 12, BOARD_H + 12);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const cx = BOARD_X + BOARD_W / 2;
        const cyc = BOARD_Y + BOARD_H / 2;
        const remainMs = countdownEndAt - nowMs();
        const secF = remainMs / 1000;
        const pulse = 1 - (secF - Math.floor(secF));
        const scale = 1 + pulse * 0.4;
        const label = countdownSec > 0 ? String(countdownSec) : T('tt.go');

        ctx.translate(cx, cyc);
        ctx.scale(scale, scale);
        ctx.font = '900 88px "Fredoka", "Arial Black", system-ui, sans-serif';
        ctx.strokeStyle = FRAME_COLOR;
        ctx.lineWidth = 6;
        ctx.strokeText(label, 0, 0);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, 0, 0);
        ctx.restore();
    }

    return { id, levels, init, destroy };
})();
