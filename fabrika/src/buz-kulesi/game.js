/* ============================================
   OYUN: Buz Kulesi (Ice Tower) — Icy Tower tarzı dikey platform zıplama
   Tek kişilik, endless arcade
   - Prosedürel platform spawn (kuleyi yukarı doğru üretir)
   - Kamera dünya-uzayında aşağı kayar
   - Wall-jump (yan kenarlardan zıpla)
   - Kombo: ardışık platform atlayışları puan çarpanı + süper zıplama
   - Kar tanesi parçacık tema
   ============================================ */

const BuzKulesi = (() => {
    const id = 'buz-kulesi';

    const levels = [{}];

    // ---- Sabitler ----
    const GAME_W = 400, GAME_H = 640;
    const FPS = 60, STEP = 1 / FPS;

    const PLAYER_W = 28, PLAYER_H = 32;

    // Fizik (px/s) — çocuklar için sakin, kontrol edilebilir
    const GRAVITY = 1700;
    const MAX_VY_FALL = 820;
    const JUMP_VELOCITY = 600;        // ilk zıplama: ~106px yükseklik (70px gap'i rahat aşar)
    const MAX_VX = 240;
    const ACCEL_GROUND = 1600;
    const ACCEL_AIR = 900;
    const FRIC_GROUND = 2000;
    const FRIC_AIR = 200;
    const COYOTE_TIME = 0.12;
    const JUMP_BUFFER = 0.16;

    // Wall-jump
    const WALL_JUMP_VX = 240;
    const WALL_JUMP_VY = 560;
    const WALL_SLIDE_VY_MAX = 160;
    const WALL_JUMP_LOCK = 0.15;

    // Kombo / skor
    const COMBO_WINDOW = 1.6;
    const COMBO_JUMP_BOOST = 0.025;   // her kombo +%2.5
    const COMBO_JUMP_MAX = 0.30;      // maks +%30 süper zıplama

    // Kamera scroll — sakin, başlangıçta neredeyse yok
    const SCROLL_TRIGGER_RATIO = 0.45;     // trigger orta-üst — oyuncuya alan ver
    const SCROLL_CATCHUP_RATE = 600;       // anlık snap yerine maks px/s
    const SCROLL_BASE = 22;                 // baştan itibaren sabit aşağı kayma (platformlar düşüyor hissi)
    const SCROLL_RAMP_PER_PLATFORM = 0.18;  // her platformda +0.18 px/s ek ivme
    const SCROLL_MAX = 100;                  // tavanı koy — fazla zorlaşmasın

    // Renkler
    const COL = {
        skyTop: '#001a40',
        skyBot: '#0a3a78',
        platTop: '#d6f0ff',
        platMid: '#4FC3F7',
        platEdge: '#0288D1',
        wall: '#0a2a55',
        wallEdge: '#1b5b9e',
        char: '#ffffff',
        charShade: '#cfe7f7',
        scarf: '#1e88e5',
        scarfShade: '#1565c0',
        cheek: '#ff8a8a',
        carrot: '#ff8c2a',
        eye: '#1a1a1a',
    };

    // ---- Durum ----
    let container, callbacks, canvas, ctx;
    let wrap, hud, hudHeightEl, hudComboEl, hudComboValEl, comboFlashEl, modalEl;
    let animFrameId = null;
    let lastTime = 0, accum = 0;
    let keys;
    let onKeyDownRef, onKeyUpRef;

    // Oyun state
    let player;
    let platforms;
    let cameraY;
    let idxCount;
    let combo;
    let lastLandedIdx;
    let lastLandTime;
    let maxCombo;
    let score;
    let heightM;
    let gameOver, gameOverShown;
    let snowflakes;
    let trailParticles;
    let wallJumpLockTimer = 0;
    let highScore = 0;
    let startPlayerY = 0;
    let bestPlayerY = 0;

    // ---- DOM helper (createElement bazlı, innerHTML kullanmaz) ----
    function h(tag, props, ...children) {
        const el = document.createElement(tag);
        if (props) {
            for (const key in props) {
                if (key === 'class') el.className = props[key];
                else if (key === 'style' && typeof props[key] === 'object') Object.assign(el.style, props[key]);
                else if (key === 'text') el.textContent = props[key];
                else if (key.startsWith('on') && typeof props[key] === 'function') {
                    el.addEventListener(key.substring(2).toLowerCase(), props[key]);
                }
                else if (props[key] !== null && props[key] !== undefined && props[key] !== false) {
                    el.setAttribute(key, props[key]);
                }
            }
        }
        for (const c of children) {
            if (c === null || c === undefined || c === false) continue;
            if (Array.isArray(c)) c.forEach(cc => cc && el.appendChild(cc));
            else if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(String(c)));
            else el.appendChild(c);
        }
        return el;
    }

    // ---- Init / Destroy ----
    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs || {};
        try {
            highScore = parseInt(Storage.get('bk-highscore') || '0', 10) || 0;
        } catch (e) { highScore = 0; }
        startRun();
    }

    function destroy() {
        if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
        if (onKeyDownRef) document.removeEventListener('keydown', onKeyDownRef);
        if (onKeyUpRef) document.removeEventListener('keyup', onKeyUpRef);
        onKeyDownRef = null; onKeyUpRef = null;
        keys = {};
        if (container) while (container.firstChild) container.removeChild(container.firstChild);
        wrap = hud = hudHeightEl = hudComboEl = hudComboValEl = comboFlashEl = modalEl = null;
        canvas = ctx = null;
    }

    function startRun() {
        SDK.gameplayStart();
        gameOver = false; gameOverShown = false;
        keys = {};
        cameraY = 0;
        idxCount = 0;
        combo = 1;
        lastLandedIdx = 0;
        lastLandTime = -999;
        maxCombo = 1;
        score = 0;
        heightM = 0;
        wallJumpLockTimer = 0;

        platforms = [];
        // Zemin platformu ekranın altında, oyuncu görünür şekilde üstüne yerleşir
        const groundY = GAME_H - 80;
        platforms.push({ x: 0, y: groundY, w: GAME_W, h: 24, index: 0, isGround: true });

        for (let i = 0; i < 12; i++) spawnNextPlatform();

        player = {
            x: GAME_W / 2 - PLAYER_W / 2,
            y: groundY - PLAYER_H,
            dx: 0, dy: 0,
            w: PLAYER_W, h: PLAYER_H,
            dir: 1,
            onGround: true,
            jumpHeld: false,
            wallSide: 0,
            coyote: 0,
            jumpBuffer: 0,
        };
        startPlayerY = player.y;
        bestPlayerY = player.y;

        snowflakes = [];
        for (let i = 0; i < 45; i++) {
            snowflakes.push({
                x: Math.random() * GAME_W,
                y: Math.random() * GAME_H,
                r: 0.6 + Math.random() * 1.8,
                vy: 16 + Math.random() * 40,
                vx: -8 + Math.random() * 16,
                depth: Math.random(),
            });
        }
        trailParticles = [];

        buildDOM();

        onKeyDownRef = onKeyDown;
        onKeyUpRef = onKeyUp;
        document.addEventListener('keydown', onKeyDownRef);
        document.addEventListener('keyup', onKeyUpRef);

        lastTime = performance.now();
        accum = 0;
        animFrameId = requestAnimationFrame(gameLoop);
    }

    // ---- DOM ----
    function buildDOM() {
        while (container.firstChild) container.removeChild(container.firstChild);

        canvas = document.createElement('canvas');
        canvas.className = 'bk-canvas';
        ctx = canvas.getContext('2d');
        try {
            if (typeof MobileUtils !== 'undefined' && MobileUtils.setupHiDPICanvas) {
                MobileUtils.setupHiDPICanvas(canvas, ctx, GAME_W, GAME_H, { forceIntegerDpr: true });
            } else {
                canvas.width = GAME_W; canvas.height = GAME_H;
            }
        } catch (e) {
            canvas.width = GAME_W; canvas.height = GAME_H;
        }
        canvas.style.touchAction = 'none';

        // HUD
        hudHeightEl = h('span', { class: 'bk-hud-value', text: '0m' });
        const hudHeightBox = h('div', { class: 'bk-hud-box' },
            h('span', { class: 'bk-hud-label', text: '🏔' }),
            hudHeightEl
        );

        hudComboValEl = h('span', { class: 'bk-hud-value', text: 'x1' });
        hudComboEl = h('div', { class: 'bk-hud-box bk-hud-combo', style: { display: 'none' } },
            h('span', { text: '🔥' }),
            hudComboValEl
        );

        hud = h('div', { class: 'bk-hud' }, hudHeightBox, hudComboEl);

        comboFlashEl = h('div', { class: 'bk-combo-flash' });

        const frame = h('div', { class: 'bk-frame' }, canvas, hud, comboFlashEl);

        // Mobil kontrolleri
        const makeBtn = (cls, txt, key) => {
            const b = h('button', { class: 'bk-btn ' + cls, type: 'button', text: txt });
            if (typeof MobileUtils !== 'undefined' && MobileUtils.bindHoldButton) {
                MobileUtils.bindHoldButton(b, () => { keys[key] = true; }, () => { keys[key] = false; });
            } else {
                b.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; }, { passive: false });
                b.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; }, { passive: false });
                b.addEventListener('touchcancel', () => { keys[key] = false; });
                b.addEventListener('mousedown', () => { keys[key] = true; });
                b.addEventListener('mouseup', () => { keys[key] = false; });
                b.addEventListener('mouseleave', () => { keys[key] = false; });
            }
            return b;
        };
        const btnL = makeBtn('bk-btn-left', '◀', 'ArrowLeft');
        const btnR = makeBtn('bk-btn-right', '▶', 'ArrowRight');
        const btnJ = makeBtn('bk-btn-jump', '▲', ' ');

        const controls = h('div', { class: 'bk-controls' },
            h('div', { class: 'bk-ctrl-side' }, btnL, btnR),
            h('div', { class: 'bk-ctrl-side' }, btnJ)
        );

        wrap = h('div', { class: 'bk-wrap' }, frame, controls);
        container.appendChild(wrap);
    }

    // ---- Input ----
    function onKeyDown(e) {
        const k = normalizeKey(e.key);
        if (k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ') {
            e.preventDefault();
            keys[k] = true;
        }
    }
    function onKeyUp(e) {
        const k = normalizeKey(e.key);
        if (keys[k] !== undefined) keys[k] = false;
    }
    function normalizeKey(k) {
        if (k === 'a' || k === 'A') return 'ArrowLeft';
        if (k === 'd' || k === 'D') return 'ArrowRight';
        if (k === 'w' || k === 'W' || k === 'ArrowUp') return ' ';
        return k;
    }

    // ---- Platform spawn ----
    // FİZİK SINIRI: peak jump height = JUMP_VELOCITY²/(2·GRAVITY) = 600²/3400 ≈ 106 px
    // İmkansız atlayışın olmaması için aralığı 85'le sınırlıyoruz (~21 px güvenlik marjı).
    // Yatay erişim (MAX_VX × kalış süresi): kid-friendly için 90 px güvenli sınır.
    const MAX_PLATFORM_GAP = 85;
    const MAX_HORIZ_REACH = 90;

    function spawnNextPlatform() {
        const lastPlat = platforms[platforms.length - 1];
        const lvl = idxCount;
        // Aralık: 65'ten başla, her 8 platformda +3 → max 85 (fizikçe garanti ulaşılır)
        const gap = Math.min(MAX_PLATFORM_GAP, 65 + Math.floor(lvl / 8) * 3);
        // Genişlik: 130'dan başla, her 10 platformda -5 → min 55
        const minW = Math.max(55, 130 - Math.floor(lvl / 10) * 5);
        const w = minW + Math.random() * 26;

        // Yatay konum: önceki platforma göre MAX_HORIZ_REACH içinde olmalı
        // (en kötü ihtimalle bile yan kenardan kenara zıplanabilsin)
        const prevX = lastPlat.x;
        const prevW = lastPlat.w;
        const minX = Math.max(0, prevX - w - MAX_HORIZ_REACH);
        const maxX = Math.min(GAME_W - w, prevX + prevW + MAX_HORIZ_REACH);
        const x = (maxX > minX)
            ? minX + Math.random() * (maxX - minX)
            : Math.max(0, Math.min(GAME_W - w, prevX));

        idxCount++;
        platforms.push({ x, y: lastPlat.y - gap, w, h: 12, index: idxCount });
    }

    // ---- Loop ----
    function gameLoop() {
        if (gameOver && gameOverShown) return;
        const now = performance.now();
        accum += Math.min(0.08, (now - lastTime) / 1000);
        lastTime = now;

        while (accum >= STEP) {
            accum -= STEP;
            if (!gameOver) fixedUpdate(STEP);
        }
        draw();
        animFrameId = requestAnimationFrame(gameLoop);
    }

    // ---- Fizik ----
    function fixedUpdate(dt) {
        const p = player;

        const jumpKey = keys[' '];
        const jumpPressedNow = jumpKey && !p.jumpHeld;
        p.jumpHeld = jumpKey;
        if (jumpPressedNow) p.jumpBuffer = JUMP_BUFFER;
        else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

        wallJumpLockTimer = Math.max(0, wallJumpLockTimer - dt);
        let ax = 0;
        const accel = p.onGround ? ACCEL_GROUND : ACCEL_AIR;
        const fric = p.onGround ? FRIC_GROUND : FRIC_AIR;
        if (wallJumpLockTimer <= 0) {
            if (keys['ArrowLeft']) { ax = -accel; p.dir = -1; }
            else if (keys['ArrowRight']) { ax = accel; p.dir = 1; }
            else {
                if (p.dx > 0) p.dx = Math.max(0, p.dx - fric * dt);
                else if (p.dx < 0) p.dx = Math.min(0, p.dx + fric * dt);
            }
        }
        p.dx += ax * dt;
        p.dx = Math.max(-MAX_VX, Math.min(MAX_VX, p.dx));

        p.dy += GRAVITY * dt;

        const touchingLeftWall = (p.x <= 0);
        const touchingRightWall = (p.x + p.w >= GAME_W);
        if ((touchingLeftWall || touchingRightWall) && p.dy > 0 && !p.onGround) {
            p.wallSide = touchingLeftWall ? -1 : 1;
            p.dy = Math.min(p.dy, WALL_SLIDE_VY_MAX);
        } else {
            p.wallSide = 0;
        }

        if (p.jumpBuffer > 0) {
            if (p.onGround || p.coyote > 0) {
                const boost = 1 + Math.min(combo * COMBO_JUMP_BOOST, COMBO_JUMP_MAX);
                p.dy = -JUMP_VELOCITY * boost;
                p.onGround = false;
                p.coyote = 0;
                p.jumpBuffer = 0;
                try { AudioManager.play('pop'); } catch (e) {}
            } else if (p.wallSide !== 0) {
                p.dx = -p.wallSide * WALL_JUMP_VX;
                p.dy = -WALL_JUMP_VY;
                p.dir = -p.wallSide;
                p.jumpBuffer = 0;
                p.wallSide = 0;
                wallJumpLockTimer = WALL_JUMP_LOCK;
                try { AudioManager.play('pop'); } catch (e) {}
            }
        }

        p.dy = Math.min(p.dy, MAX_VY_FALL);

        p.x += p.dx * dt;
        if (p.x < 0) { p.x = 0; if (p.dx < 0) p.dx = 0; }
        if (p.x + p.w > GAME_W) { p.x = GAME_W - p.w; if (p.dx > 0) p.dx = 0; }

        const prevY = p.y;
        p.y += p.dy * dt;

        if (p.onGround) p.coyote = COYOTE_TIME;
        p.onGround = false;

        if (p.dy > 0) {
            for (const pl of platforms) {
                const overlapX = (p.x + p.w > pl.x) && (p.x < pl.x + pl.w);
                if (!overlapX) continue;
                const prevBottom = prevY + p.h;
                const curBottom = p.y + p.h;
                if (prevBottom <= pl.y && curBottom >= pl.y) {
                    p.y = pl.y - p.h;
                    p.dy = 0;
                    p.onGround = true;
                    p.coyote = COYOTE_TIME;
                    onLand(pl);
                    break;
                }
            }
        }

        if (!p.onGround) p.coyote = Math.max(0, p.coyote - dt);

        // Kamera takibi: hedef = oyuncuyu üst %X'te tut. Anlık snap yerine yumuşak yetişme.
        const cameraTargetY = p.y - SCROLL_TRIGGER_RATIO * GAME_H;
        if (cameraTargetY < cameraY) {
            const maxDelta = SCROLL_CATCHUP_RATE * dt;
            cameraY = Math.max(cameraTargetY, cameraY - maxDelta);
        }
        // Auto-scroll: baştan sabit kayma + platform sayısıyla kademeli ivme (tavanlı)
        const forceSpeed = Math.min(SCROLL_MAX, SCROLL_BASE + idxCount * SCROLL_RAMP_PER_PLATFORM);
        cameraY -= forceSpeed * dt;

        // Yukarıda yeterli platform var mı? (her döngüde güncel topPlat'i oku — sonsuz döngü kapısı kapanır)
        let spawnSafety = 0;
        while (platforms[platforms.length - 1].y > cameraY - 200 && spawnSafety < 20) {
            spawnNextPlatform();
            spawnSafety++;
        }

        const screenBottomWorldY = cameraY + GAME_H + 60;
        for (let i = platforms.length - 1; i >= 0; i--) {
            if (platforms[i].y > screenBottomWorldY) platforms.splice(i, 1);
        }

        const screenY = p.y - cameraY;
        if (screenY > GAME_H + 40) triggerGameOver();

        if (p.y < bestPlayerY) bestPlayerY = p.y;
        const newHeightM = Math.max(0, Math.floor((startPlayerY - bestPlayerY) / 16));
        if (newHeightM !== heightM) {
            heightM = newHeightM;
            if (hudHeightEl) hudHeightEl.textContent = heightM + 'm';
        }

        if (combo > 1) {
            const t = performance.now() / 1000;
            if (t - lastLandTime > COMBO_WINDOW * 1.7) {
                combo = 1;
                updateComboHUD();
            }
        }

        for (const sf of snowflakes) {
            const parallax = 0.4 + sf.depth * 0.8;
            sf.y += sf.vy * dt * parallax;
            sf.x += sf.vx * dt * parallax;
            sf.vx += (Math.random() - 0.5) * 6 * dt;
            sf.vx = Math.max(-30, Math.min(30, sf.vx));
            if (sf.y > GAME_H + 4) { sf.y = -4; sf.x = Math.random() * GAME_W; }
            if (sf.x < -6) sf.x = GAME_W + 4;
            if (sf.x > GAME_W + 6) sf.x = -4;
        }

        if (combo >= 3 && !p.onGround && p.dy < -100) {
            if (Math.random() < 0.6) {
                trailParticles.push({
                    x: p.x + p.w / 2 + (Math.random() - 0.5) * 14,
                    y: p.y + p.h,
                    life: 0.45,
                    age: 0,
                    size: 3 + Math.random() * 3,
                });
            }
        }
        for (let i = trailParticles.length - 1; i >= 0; i--) {
            const tp = trailParticles[i];
            tp.age += dt;
            if (tp.age >= tp.life) trailParticles.splice(i, 1);
        }
    }

    function onLand(platform) {
        if (platform.isGround) return;
        const t = performance.now() / 1000;
        if (platform.index > lastLandedIdx && (t - lastLandTime) < COMBO_WINDOW) {
            combo++;
            const jumped = platform.index - lastLandedIdx;
            score += 10 * jumped * combo;
            if (combo > maxCombo) maxCombo = combo;
            if (combo >= 3) showComboFlash(combo);
        } else if (platform.index > lastLandedIdx) {
            combo = 1;
            score += 10;
        } else {
            combo = 1;
        }
        lastLandedIdx = platform.index;
        lastLandTime = t;
        updateComboHUD();
    }

    function updateComboHUD() {
        if (!hudComboEl) return;
        if (combo > 1) {
            hudComboEl.style.display = '';
            if (hudComboValEl) hudComboValEl.textContent = 'x' + combo;
            hudComboEl.classList.add('pulse');
            setTimeout(() => hudComboEl && hudComboEl.classList.remove('pulse'), 180);
        } else {
            hudComboEl.style.display = 'none';
        }
    }

    function showComboFlash(c) {
        if (!comboFlashEl) return;
        comboFlashEl.textContent = T('bk.combo_flash', { c: c });
        comboFlashEl.classList.remove('show');
        void comboFlashEl.offsetWidth;
        comboFlashEl.classList.add('show');
    }

    // ---- Game Over ----
    function triggerGameOver() {
        if (gameOver) return;
        gameOver = true;
        SDK.gameplayStop();
        let isNewRecord = false;
        if (score > highScore) {
            highScore = score;
            isNewRecord = true;
            SDK.happyMoment();
            try { Storage.set('bk-highscore', String(highScore)); } catch (e) {}
        }
        try { AudioManager.play('wrong'); } catch (e) {}
        showGameOverModal(isNewRecord);
        gameOverShown = true;
    }

    function showGameOverModal(isNewRecord) {
        if (!wrap) return;
        if (modalEl) modalEl.remove();

        const retryBtn = h('button', {
            class: 'bk-mbtn bk-mbtn-primary', type: 'button', text: T('bk.retry'),
            onClick: () => {
                if (modalEl) { modalEl.remove(); modalEl = null; }
                if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
                if (onKeyDownRef) document.removeEventListener('keydown', onKeyDownRef);
                if (onKeyUpRef) document.removeEventListener('keyup', onKeyUpRef);
                onKeyDownRef = null; onKeyUpRef = null;
                startRun();
            }
        });
        const exitBtn = h('button', {
            class: 'bk-mbtn bk-mbtn-secondary', type: 'button', text: T('bk.exit'),
            onClick: () => { if (typeof App !== 'undefined' && App.showHub) App.showHub(); }
        });

        const scoreCell = h('b', { text: String(score) });
        if (isNewRecord) {
            scoreCell.appendChild(h('span', { class: 'bk-new-record', text: T('bk.new_record') }));
        }

        const stats = h('div', { class: 'bk-modal-stats' },
            h('div', { class: 'bk-stat-row' },
                h('span', { text: T('bk.height') }),
                h('b', { text: heightM + 'm' })
            ),
            h('div', { class: 'bk-stat-row' },
                h('span', { text: T('bk.score') }),
                scoreCell
            ),
            h('div', { class: 'bk-stat-row' },
                h('span', { text: T('bk.max_combo') }),
                h('b', { text: 'x' + maxCombo })
            ),
            h('div', { class: 'bk-stat-row record' },
                h('span', { text: T('bk.record') }),
                h('b', { text: String(highScore) })
            )
        );

        const card = h('div', { class: 'bk-modal-card' },
            h('div', { class: 'bk-modal-title', text: T('bk.fell') }),
            h('div', { class: 'bk-modal-sub', text: T('bk.fell_sub') }),
            stats,
            h('div', { class: 'bk-modal-buttons' }, retryBtn, exitBtn)
        );

        modalEl = h('div', { class: 'bk-modal' }, card);
        const frameEl = wrap.querySelector('.bk-frame');
        if (frameEl) frameEl.appendChild(modalEl);
    }

    // ---- Render ----
    function draw() {
        if (!ctx) return;
        const g = ctx.createLinearGradient(0, 0, 0, GAME_H);
        g.addColorStop(0, COL.skyTop);
        g.addColorStop(1, COL.skyBot);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, GAME_W, GAME_H);

        drawStars();

        ctx.save();
        for (const sf of snowflakes) {
            if (sf.depth < 0.5) {
                ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + sf.depth * 0.4) + ')';
                ctx.beginPath();
                ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        ctx.fillStyle = COL.wall;
        ctx.fillRect(0, 0, 4, GAME_H);
        ctx.fillRect(GAME_W - 4, 0, 4, GAME_H);
        ctx.fillStyle = COL.wallEdge;
        ctx.fillRect(4, 0, 1, GAME_H);
        ctx.fillRect(GAME_W - 5, 0, 1, GAME_H);

        for (const pl of platforms) {
            const sy = pl.y - cameraY;
            if (sy < -20 || sy > GAME_H + 20) continue;
            if (pl.isGround) drawGroundPlatform(pl.x, sy, pl.w, pl.h);
            else drawPlatform(pl.x, sy, pl.w, pl.h);
        }

        for (const tp of trailParticles) {
            const sy = tp.y - cameraY;
            const t = 1 - (tp.age / tp.life);
            ctx.fillStyle = 'rgba(214,240,255,' + (t * 0.7) + ')';
            ctx.beginPath();
            ctx.arc(tp.x, sy, tp.size * (0.5 + t * 0.7), 0, Math.PI * 2);
            ctx.fill();
        }

        drawPlayer();

        for (const sf of snowflakes) {
            if (sf.depth >= 0.5) {
                ctx.fillStyle = 'rgba(255,255,255,' + (0.55 + sf.depth * 0.35) + ')';
                ctx.beginPath();
                ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawStars() {
        const seed = Math.floor(cameraY / 200);
        ctx.save();
        for (let i = 0; i < 22; i++) {
            const sx = ((i * 73 + seed * 31) % GAME_W);
            const sy = ((i * 113 + seed * 47) % GAME_H);
            const opa = 0.3 + ((i * 17) % 7) / 10;
            ctx.fillStyle = 'rgba(231,243,255,' + opa.toFixed(2) + ')';
            ctx.fillRect(sx, sy, 1.4, 1.4);
        }
        ctx.restore();
    }

    function drawPlatform(x, y, w, h) {
        ctx.fillStyle = COL.platMid;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = COL.platTop;
        ctx.fillRect(x, y, w, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, w, 1);
        ctx.fillStyle = COL.platEdge;
        ctx.fillRect(x, y + h - 2, w, 2);
        ctx.fillStyle = '#a9e8ff';
        ctx.fillRect(x + 3, y + 4, 2, 5);
        ctx.fillRect(x + w - 5, y + 4, 2, 5);
    }

    function drawGroundPlatform(x, y, w, h) {
        const gg = ctx.createLinearGradient(0, y, 0, y + h);
        gg.addColorStop(0, '#ffffff');
        gg.addColorStop(0.4, '#d6f0ff');
        gg.addColorStop(1, '#4FC3F7');
        ctx.fillStyle = gg;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 8; i++) {
            const bx = x + (w / 8) * i + 4;
            ctx.beginPath();
            ctx.arc(bx, y + 1, 4, Math.PI, 0);
            ctx.fill();
        }
        ctx.fillStyle = '#0288D1';
        ctx.fillRect(x, y + h - 3, w, 3);
    }

    function drawPlayer() {
        const p = player;
        const sy = p.y - cameraY;
        if (sy < -p.h - 20 || sy > GAME_H + 40) return;

        const cx = p.x + p.w / 2;
        const top = sy;

        ctx.fillStyle = COL.scarfShade;
        ctx.fillRect(p.x + 4, top + p.h * 0.6, p.w - 8, 6);
        ctx.fillStyle = COL.scarf;
        ctx.fillRect(p.x + 3, top + p.h * 0.55, p.w - 6, 5);

        ctx.fillStyle = COL.char;
        ctx.beginPath();
        ctx.arc(cx, top + p.h * 0.78, p.w / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COL.charShade;
        ctx.beginPath();
        ctx.arc(cx - 4, top + p.h * 0.82, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = COL.char;
        ctx.beginPath();
        ctx.arc(cx, top + p.h * 0.32, p.w / 2 - 4, 0, Math.PI * 2);
        ctx.fill();

        const eyeOffX = p.dir * 1.2;
        ctx.fillStyle = COL.eye;
        ctx.fillRect(cx - 4 + eyeOffX, top + p.h * 0.28, 1.8, 2.2);
        ctx.fillRect(cx + 3 + eyeOffX, top + p.h * 0.28, 1.8, 2.2);

        ctx.fillStyle = COL.cheek;
        ctx.beginPath(); ctx.arc(cx - 5, top + p.h * 0.38, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 5, top + p.h * 0.38, 1.6, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = COL.carrot;
        ctx.beginPath();
        ctx.moveTo(cx, top + p.h * 0.34);
        ctx.lineTo(cx + p.dir * 6, top + p.h * 0.36);
        ctx.lineTo(cx, top + p.h * 0.40);
        ctx.closePath();
        ctx.fill();

        if (p.wallSide !== 0 && p.dy > 0) {
            ctx.fillStyle = 'rgba(214,240,255,0.55)';
            const wx = p.wallSide < 0 ? p.x - 5 : p.x + p.w + 1;
            ctx.fillRect(wx, top + 4, 3, p.h - 8);
        }
    }

    return { id, levels, init, destroy };
})();
