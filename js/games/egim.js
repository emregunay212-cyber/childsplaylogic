/* ============================================
   OYUN: Eğim — Slope Ball
   Pseudo-3D canvas, top sürekli ileri yuvarlanır,
   sol/sağ ile yönelir, kırmızı bloklara değerse veya
   kenardan düşerse oyun biter. Tek can.
   ============================================ */

const Egim = (() => {
    const id = 'egim';
    const levels = [{}];

    // ---- Sabitler ----
    const GAME_W = 800, GAME_H = 500;
    const FPS = 60, STEP = 1 / FPS;

    // Track
    const TRACK_HALF_WIDTH = 3.0;         // dünya birimleri (±x)
    const HORIZON_Y = 140;                 // ufuk çizgisi ekran y
    const CAMERA_Y = 2.5;                  // kamera yerden yüksekliği
    const CAMERA_Z_OFFSET = 4.0;           // kamera topun arkasında
    const FOV_SCALE = 300;                 // perspektif ölçek
    const VIEW_DIST = 140;                 // kaç birim ileriyi çiziyoruz

    // Ball
    const BALL_RADIUS = 0.55;
    const BASE_SPEED = 14;                 // birim/saniye
    const MAX_SPEED = 38;
    const SPEED_RAMP_SECONDS = 45;         // bu sürede max'a çıkar
    const LATERAL_SPEED = 11;
    const BALL_GRAVITY = 60;
    const BALL_JUMP_V = 18;

    // Obstacles
    const OBSTACLE_MIN_GAP = 8;
    const OBSTACLE_MAX_GAP = 18;
    const OBSTACLE_W = 1.3;
    const OBSTACLE_H = 1.1;

    // ---- Durum ----
    let container, callbacks;
    let canvas, ctx;
    let uiLayer;
    let hudEl, scoreEl, distanceEl, bestEl;
    let ball;
    let obstacles, particles;
    let cameraZ;                           // kameranın ileride takip ettiği z
    let runTime;
    let currentSpeed;
    let score, distanceScore, bestScore;
    let state;
    let lastTime, accum, animFrameId;
    let finalScore;
    let savedThisRound;
    let keyDownHandler, keyUpHandler, touchStartHandler, touchEndHandler, touchMoveHandler;
    let keys;
    let nextObstacleZ;
    let countdownEndAt, countdownSec;
    let db;
    let trackStripeOffset;

    // ---- Yardımcılar ----
    function nowMs() { return performance.now(); }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function escapeHTML(s) {
        return String(s).replace(/[&<>"'`]/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
        })[ch]);
    }

    // Perspektif: dünya (x,y,z-cameraZ) → ekran (sx,sy,scale)
    function project(wx, wy, wz) {
        const dz = wz - cameraZ + CAMERA_Z_OFFSET;
        if (dz <= 0.1) return null;
        const scale = FOV_SCALE / dz;
        const sx = GAME_W / 2 + wx * scale;
        const sy = HORIZON_Y + (CAMERA_Y - wy) * scale;
        return { sx, sy, scale };
    }

    // ---- Init / Destroy ----
    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs || {};
        try { db = firebase.database(); } catch (e) { db = null; }
        bestScore = parseInt(localStorage.getItem('egim-best') || '0', 10) || 0;
        buildDOM();
        bindInput();
        resetRun();
        lastTime = nowMs(); accum = 0;
        gameLoop();
    }

    function destroy() {
        state = 'destroyed';
        if (animFrameId) cancelAnimationFrame(animFrameId);
        unbindInput();
        if (container) container.innerHTML = '';
    }

    function resetRun() {
        runTime = 0;
        cameraZ = 0;
        currentSpeed = 0;
        score = 0;
        distanceScore = 0;
        obstacles = [];
        particles = [];
        nextObstacleZ = 12;
        finalScore = 0;
        savedThisRound = false;
        keys = { left: false, right: false, jump: false };
        trackStripeOffset = 0;

        ball = {
            x: 0,
            y: 0,              // zeminden yükseklik
            z: 0,              // ileri pozisyon
            vy: 0,
            onGround: true,
            rollAngle: 0,
        };

        // İlk spawn'lar
        for (let z = 14; z < 90; z += rand(OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP)) {
            spawnObstacle(z);
            nextObstacleZ = z;
        }
        nextObstacleZ += rand(OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP);

        state = 'countdown';
        countdownEndAt = nowMs() + 3000;
        countdownSec = 3;
        renderHUD();
    }

    // ---- DOM ----
    function buildDOM() {
        container.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'eg-wrap';

        canvas = document.createElement('canvas');
        canvas.className = 'eg-canvas';
        ctx = canvas.getContext('2d');
        try { MobileUtils.setupHiDPICanvas(canvas, ctx, GAME_W, GAME_H); }
        catch (e) { canvas.width = GAME_W; canvas.height = GAME_H; }
        canvas.style.touchAction = 'none';
        wrap.appendChild(canvas);

        uiLayer = document.createElement('div');
        uiLayer.className = 'eg-ui-layer';
        wrap.appendChild(uiLayer);

        hudEl = document.createElement('div');
        hudEl.className = 'eg-hud';
        hudEl.innerHTML =
            '<div class="eg-hud-box eg-score"><span class="eg-hud-label">Skor</span><span id="eg-score">0</span></div>' +
            '<div class="eg-hud-box eg-dist"><span class="eg-hud-label">Mesafe</span><span id="eg-distance">0</span></div>' +
            '<div class="eg-hud-box eg-best"><span class="eg-hud-label">Rekor</span><span id="eg-best">0</span></div>';
        uiLayer.appendChild(hudEl);

        const hint = document.createElement('div');
        hint.className = 'eg-hint';
        hint.innerHTML = '<span>◀ ▶ ile <b>yönel</b> • Boşluk ile <b>zıpla</b></span>';
        uiLayer.appendChild(hint);

        // Mobil touch alanları
        const mobile = document.createElement('div');
        mobile.className = 'eg-mobile';
        mobile.innerHTML =
            '<button class="eg-mbtn eg-mleft" data-dir="left">◀</button>' +
            '<button class="eg-mbtn eg-mjump" data-dir="jump">↑</button>' +
            '<button class="eg-mbtn eg-mright" data-dir="right">▶</button>';
        uiLayer.appendChild(mobile);

        container.appendChild(wrap);

        scoreEl = document.getElementById('eg-score');
        distanceEl = document.getElementById('eg-distance');
        bestEl = document.getElementById('eg-best');
    }

    // ---- Input ----
    function bindInput() {
        keyDownHandler = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; e.preventDefault(); }
            else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; e.preventDefault(); }
            else if (e.key === ' ' || e.code === 'Space' || e.key === 'ArrowUp') { keys.jump = true; e.preventDefault(); }
        };
        keyUpHandler = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
            else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
            else if (e.key === ' ' || e.code === 'Space' || e.key === 'ArrowUp') keys.jump = false;
        };
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);

        // Mobil — per-touch identifier tracking (stuck-button fix)
        const touchToDir = Object.create(null);
        const setDir = (dir, val) => {
            if (dir === 'left') keys.left = val;
            else if (dir === 'right') keys.right = val;
            else if (dir === 'jump') keys.jump = val;
        };
        const findBtn = (target) => target && target.closest && target.closest('.eg-mbtn');
        touchStartHandler = (e) => {
            let handled = false;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const btn = findBtn(document.elementFromPoint(t.clientX, t.clientY));
                if (!btn) continue;
                handled = true;
                touchToDir[t.identifier] = btn.dataset.dir;
                setDir(btn.dataset.dir, true);
            }
            if (handled) e.preventDefault();
        };
        touchEndHandler = (e) => {
            let handled = false;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const dir = touchToDir[t.identifier];
                if (!dir) continue;
                handled = true;
                delete touchToDir[t.identifier];
                setDir(dir, false);
            }
            if (handled) e.preventDefault();
        };
        touchMoveHandler = (e) => {
            if (e.changedTouches) e.preventDefault();
        };
        const mouseStart = (e) => {
            const btn = findBtn(e.target);
            if (!btn) return;
            setDir(btn.dataset.dir, true);
        };
        const mouseEnd = () => {
            keys.left = false; keys.right = false; keys.jump = false;
        };
        if (uiLayer) {
            uiLayer.addEventListener('touchstart', touchStartHandler, { passive: false });
            uiLayer.addEventListener('touchend', touchEndHandler, { passive: false });
            uiLayer.addEventListener('touchcancel', touchEndHandler, { passive: false });
            uiLayer.addEventListener('touchmove', touchMoveHandler, { passive: false });
            uiLayer.addEventListener('mousedown', mouseStart);
            uiLayer.addEventListener('mouseup', mouseEnd);
            uiLayer.addEventListener('mouseleave', mouseEnd);
        }
    }

    function unbindInput() {
        document.removeEventListener('keydown', keyDownHandler);
        document.removeEventListener('keyup', keyUpHandler);
    }

    // ---- Döngü ----
    function gameLoop() {
        if (state === 'destroyed') return;
        const t = nowMs();
        const dt = Math.min(0.05, (t - lastTime) / 1000);
        lastTime = t;

        if (state === 'playing') {
            accum += dt;
            while (accum >= STEP) {
                accum -= STEP;
                update(STEP);
            }
        } else if (state === 'countdown') {
            updateCountdown();
        }
        draw();
        animFrameId = requestAnimationFrame(gameLoop);
    }

    function updateCountdown() {
        const remainMs = countdownEndAt - nowMs();
        if (remainMs <= 0) {
            state = 'playing';
            lastTime = nowMs(); accum = 0;
            try { AudioManager.play('whoosh'); } catch (e) {}
            return;
        }
        const newSec = Math.ceil(remainMs / 1000);
        if (newSec !== countdownSec) {
            countdownSec = newSec;
            try { AudioManager.play('pop'); } catch (e) {}
        }
    }

    // ---- Update ----
    function update(dt) {
        runTime += dt;

        // Hız rampası
        const t = clamp(runTime / SPEED_RAMP_SECONDS, 0, 1);
        currentSpeed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * t;

        // Top ileri hareket
        ball.z += currentSpeed * dt;
        cameraZ = ball.z;

        // Yanal kontrol
        if (keys.left) ball.x -= LATERAL_SPEED * dt;
        if (keys.right) ball.x += LATERAL_SPEED * dt;

        // Zıplama
        if (keys.jump && ball.onGround) {
            ball.vy = BALL_JUMP_V;
            ball.onGround = false;
            try { AudioManager.play('pop'); } catch (e) {}
        }

        // Yerçekimi
        ball.vy -= BALL_GRAVITY * dt;
        ball.y += ball.vy * dt;
        if (ball.y <= 0) {
            ball.y = 0;
            ball.vy = 0;
            ball.onGround = true;
        }

        // Yuvarlanma animasyonu
        ball.rollAngle += currentSpeed * dt * 0.8;

        // Pist çizgileri
        trackStripeOffset = (trackStripeOffset + currentSpeed * dt) % 4;

        // Kenar kontrolü
        if (Math.abs(ball.x) > TRACK_HALF_WIDTH + BALL_RADIUS) {
            triggerGameOver('fall');
            return;
        }

        // Engel spawn
        while (nextObstacleZ < cameraZ + VIEW_DIST) {
            spawnObstacle(nextObstacleZ);
            nextObstacleZ += rand(OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP);
        }

        // Eski engelleri temizle
        obstacles = obstacles.filter(o => o.z > cameraZ - 5);

        // Çarpışma
        if (ball.y < OBSTACLE_H) {
            for (const o of obstacles) {
                const dz = o.z - ball.z;
                if (dz < -1 || dz > 2) continue;
                const dx = Math.abs(o.x - ball.x);
                if (dz > -OBSTACLE_W * 0.5 && dz < OBSTACLE_W * 0.5 &&
                    dx < OBSTACLE_W * 0.5 + BALL_RADIUS * 0.8) {
                    triggerGameOver('hit');
                    return;
                }
            }
        }

        // Partiküller (iz bırakan toz)
        for (const p of particles) {
            p.life -= dt;
            p.z -= p.vz * dt;   // geriye kalır (kamera ileri gider)
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy -= 30 * dt;
        }
        particles = particles.filter(p => p.life > 0);

        // Skor
        distanceScore = Math.floor(ball.z);
        score = distanceScore;
        renderHUD();
    }

    function spawnObstacle(z) {
        const x = rand(-TRACK_HALF_WIDTH * 0.75, TRACK_HALF_WIDTH * 0.75);
        obstacles.push({ x, z });
    }

    // ---- Game Over ----
    function triggerGameOver(reason) {
        if (state !== 'playing') return;
        state = 'gameover';
        finalScore = score;
        if (finalScore > bestScore) {
            bestScore = finalScore;
            try { localStorage.setItem('egim-best', String(bestScore)); } catch (e) {}
        }
        // Patlama efekti
        spawnExplosion(ball.x, ball.y + 0.5, ball.z);
        try { AudioManager.play('error'); } catch (e) {}
        setTimeout(showGameOverModal, 500);
    }

    function spawnExplosion(wx, wy, wz) {
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: wx, y: wy, z: wz,
                vx: rand(-3, 3), vy: rand(1, 6), vz: rand(-3, 3),
                life: 0.6 + Math.random() * 0.5,
                color: 'hsl(' + randInt(0, 45) + ', 100%, ' + randInt(55, 70) + '%)',
                r: 0.08 + Math.random() * 0.08
            });
        }
    }

    function showGameOverModal() {
        const modal = document.createElement('div');
        modal.className = 'eg-modal eg-gameover-modal';
        modal.innerHTML =
            '<div class="eg-modal-card eg-gameover-card">' +
                '<div class="eg-gameover-title">🎯 Oyun Bitti</div>' +
                '<div class="eg-gameover-score">' +
                    '<div class="eg-go-row"><span>Skor</span><b>' + finalScore + '</b></div>' +
                    '<div class="eg-go-row"><span>Mesafe</span><b>' + distanceScore + '</b></div>' +
                    '<div class="eg-go-row"><span>Rekor</span><b>' + bestScore + '</b></div>' +
                '</div>' +
                '<div class="eg-gameover-buttons">' +
                    '<button class="eg-btn eg-btn-primary" id="eg-btn-restart">🔁 Tekrar Oyna</button>' +
                    '<button class="eg-btn eg-btn-secondary" id="eg-btn-home">🏠 Ana Sayfa</button>' +
                    (finalScore > 0 ? '<button class="eg-btn eg-btn-accent" id="eg-btn-save">⭐ Skoru Kaydet</button>' : '') +
                '</div>' +
                '<div class="eg-save-area" id="eg-save-area"></div>' +
                '<div class="eg-leaderboard-area" id="eg-leaderboard-area"></div>' +
            '</div>';
        uiLayer.appendChild(modal);

        modal.querySelector('#eg-btn-restart').addEventListener('click', () => {
            modal.remove();
            resetRun();
            lastTime = nowMs(); accum = 0;
        });
        modal.querySelector('#eg-btn-home').addEventListener('click', () => {
            const h = document.getElementById('btn-home');
            if (h) h.click();
        });
        const saveBtn = modal.querySelector('#eg-btn-save');
        if (saveBtn) saveBtn.addEventListener('click', () => showSaveForm(modal));
    }

    function showSaveForm(modal) {
        if (savedThisRound) return;
        const area = modal.querySelector('#eg-save-area');
        area.innerHTML =
            '<div class="eg-save-form">' +
                '<input type="text" id="eg-name-input" maxlength="16" placeholder="Adın (en fazla 16 harf)" />' +
                '<button class="eg-btn eg-btn-primary" id="eg-btn-commit-save">Kaydet</button>' +
            '</div>';
        const input = area.querySelector('#eg-name-input');
        input.focus();
        area.querySelector('#eg-btn-commit-save').addEventListener('click', () => {
            const raw = (input.value || '').trim();
            if (!raw) { input.focus(); input.classList.add('eg-shake'); setTimeout(() => input.classList.remove('eg-shake'), 400); return; }
            saveScoreAndShowLeaderboard(raw.slice(0, 16), finalScore, modal);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') area.querySelector('#eg-btn-commit-save').click();
        });
    }

    async function saveScoreAndShowLeaderboard(name, scoreVal, modal) {
        if (!db) {
            modal.querySelector('#eg-save-area').innerHTML = '<div class="eg-error">⚠️ Sunucuya bağlanılamadı.</div>';
            return;
        }
        if (savedThisRound) return;
        savedThisRound = true;
        const saveBtn = modal.querySelector('#eg-btn-save');
        if (saveBtn) saveBtn.disabled = true;

        const ref = db.ref('leaderboards/egim');
        try {
            const entry = { name, score: scoreVal, timestamp: firebase.database.ServerValue.TIMESTAMP };
            const newRef = await ref.push(entry);
            modal.querySelector('#eg-save-area').innerHTML = '<div class="eg-save-ok">✅ Kaydedildi!</div>';
            await renderLeaderboard(modal, newRef.key, scoreVal);
        } catch (err) {
            modal.querySelector('#eg-save-area').innerHTML = '<div class="eg-error">⚠️ Kaydedilemedi. ' + escapeHTML(err.message || '') + '</div>';
        }
    }

    async function renderLeaderboard(modal, myKey, myScore) {
        const area = modal.querySelector('#eg-leaderboard-area');
        area.innerHTML = '<div class="eg-lb-loading">Sıralama yükleniyor...</div>';
        try {
            const snap = await db.ref('leaderboards/egim')
                .orderByChild('score').limitToLast(50).once('value');
            const rows = [];
            snap.forEach(child => {
                const v = child.val();
                rows.push({ key: child.key, name: v.name || 'Anonim', score: v.score || 0, timestamp: v.timestamp || 0 });
            });
            rows.sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);

            const myIdx = rows.findIndex(r => r.key === myKey);
            if (myIdx >= 0 && myIdx < 50) {
                renderPaginatedLB(area, rows, myKey, myIdx);
            } else {
                let rank = 51;
                try {
                    const afterSnap = await db.ref('leaderboards/egim')
                        .orderByChild('score').startAfter(myScore).once('value');
                    let above = 0;
                    afterSnap.forEach(() => { above++; });
                    rank = above + 1;
                } catch (e) {}
                area.innerHTML =
                    '<div class="eg-lb-out">' +
                        '<div class="eg-lb-title">🌍 Global Sıralaman</div>' +
                        '<div class="eg-lb-rank-big"><span>#' + rank + '</span></div>' +
                        '<div class="eg-lb-msg">İlk 50\'ye girmek için daha yüksek skor yap!</div>' +
                    '</div>';
            }
        } catch (err) {
            area.innerHTML = '<div class="eg-error">⚠️ Sıralama yüklenemedi.</div>';
        }
    }

    function renderPaginatedLB(area, rows, myKey, myIdx) {
        const PER = 10;
        const pages = Math.ceil(rows.length / PER);
        let currentPage = Math.floor(myIdx / PER);

        function render() {
            const start = currentPage * PER;
            const slice = rows.slice(start, start + PER);
            let html = '<div class="eg-lb-title">🏆 İlk 50 — Sayfa ' + (currentPage + 1) + ' / ' + pages + '</div>';
            html += '<div class="eg-lb-table">';
            html += '<div class="eg-lb-head"><span class="eg-lb-rank">#</span><span class="eg-lb-name">İsim</span><span class="eg-lb-score">Skor</span></div>';
            slice.forEach((r, i) => {
                const rank = start + i + 1;
                const me = r.key === myKey ? ' eg-lb-me' : '';
                html += '<div class="eg-lb-row' + me + '"><span class="eg-lb-rank">' + rank + '</span><span class="eg-lb-name">' + escapeHTML(r.name) + '</span><span class="eg-lb-score">' + r.score + '</span></div>';
            });
            html += '</div>';
            html += '<div class="eg-lb-nav">' +
                '<button class="eg-btn eg-btn-ghost" id="eg-lb-prev"' + (currentPage === 0 ? ' disabled' : '') + '>◀ Önceki</button>' +
                '<span class="eg-lb-pageinfo">' + (start + 1) + '-' + Math.min(start + PER, rows.length) + '</span>' +
                '<button class="eg-btn eg-btn-ghost" id="eg-lb-next"' + (currentPage >= pages - 1 ? ' disabled' : '') + '>Sonraki ▶</button>' +
                '</div>';
            area.innerHTML = html;
            const prev = area.querySelector('#eg-lb-prev');
            const next = area.querySelector('#eg-lb-next');
            if (prev) prev.addEventListener('click', () => { if (currentPage > 0) { currentPage--; render(); } });
            if (next) next.addEventListener('click', () => { if (currentPage < pages - 1) { currentPage++; render(); } });
        }
        render();
    }

    // ---- HUD ----
    function renderHUD() {
        if (scoreEl) scoreEl.textContent = score;
        if (distanceEl) distanceEl.textContent = distanceScore;
        if (bestEl) bestEl.textContent = bestScore;
    }

    // ---- Draw ----
    function draw() {
        // Synthwave gökyüzü — derin lacivert → magenta → sıcak pembe
        const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
        g.addColorStop(0, '#05010f');
        g.addColorStop(0.45, '#1a0340');
        g.addColorStop(0.8, '#ff2a8a');
        g.addColorStop(1, '#ff8a4a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, GAME_W, HORIZON_Y);

        // Neon güneş
        drawNeonSun();

        // Alt void — derin siyah-mor
        const bg = ctx.createLinearGradient(0, HORIZON_Y, 0, GAME_H);
        bg.addColorStop(0, '#0a021a');
        bg.addColorStop(1, '#02000a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, HORIZON_Y, GAME_W, GAME_H - HORIZON_Y);

        // Retrowave grid — ufuk çizgisi altında
        drawRetroGrid();

        // Pist
        drawTrack();

        // Engelleri, topu, partikülleri z sırasına göre çiz (uzak → yakın)
        const drawables = [];
        for (const o of obstacles) {
            if (o.z > cameraZ - 2 && o.z < cameraZ + VIEW_DIST) {
                drawables.push({ type: 'obs', z: o.z, ref: o });
            }
        }
        for (const p of particles) {
            if (p.z > cameraZ - 2 && p.z < cameraZ + VIEW_DIST) {
                drawables.push({ type: 'par', z: p.z, ref: p });
            }
        }
        drawables.push({ type: 'ball', z: ball.z, ref: ball });
        drawables.sort((a, b) => b.z - a.z);

        for (const d of drawables) {
            if (d.type === 'obs') drawObstacle(d.ref);
            else if (d.type === 'par') drawParticle(d.ref);
            else if (d.type === 'ball') drawBall(d.ref);
        }

        // Tarama hattı (CRT efekti)
        drawScanlines();

        // Hız vinyet — neon magenta
        const speedPct = (currentSpeed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
        if (speedPct > 0.3) {
            ctx.globalAlpha = clamp(speedPct * 0.45, 0, 0.45);
            const vg = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, GAME_H / 3, GAME_W / 2, GAME_H / 2, GAME_W / 1.6);
            vg.addColorStop(0, 'rgba(255, 42, 138, 0)');
            vg.addColorStop(1, 'rgba(255, 42, 138, 0.9)');
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, GAME_W, GAME_H);
            ctx.globalAlpha = 1;
        }

        if (state === 'countdown') drawCountdownOverlay();
    }

    function drawNeonSun() {
        const cx = GAME_W / 2;
        const cy = HORIZON_Y + 10;
        const r = 70;
        // Halo
        const halo = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.4);
        halo.addColorStop(0, 'rgba(255, 180, 80, 0.55)');
        halo.addColorStop(0.5, 'rgba(255, 80, 140, 0.25)');
        halo.addColorStop(1, 'rgba(255, 80, 140, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, GAME_W, HORIZON_Y + 30);
        // Güneş diski (ufuk üstünde yarım)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, GAME_W, HORIZON_Y);
        ctx.clip();
        const sg = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
        sg.addColorStop(0, '#fff2a0');
        sg.addColorStop(0.5, '#ff9a3a');
        sg.addColorStop(1, '#ff2a8a');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Yatay kesim çizgileri (synthwave klasik)
        ctx.fillStyle = '#05010f';
        for (let i = 0; i < 8; i++) {
            const y = cy - r + (i / 8) * r * 1.1 + 18;
            const h = 2 + i * 0.8;
            ctx.globalAlpha = 0.85 - i * 0.05;
            ctx.fillRect(cx - r, y, r * 2, h);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function drawRetroGrid() {
        // Ufuk çizgisi altındaki zeminde perspektif grid (pist dışı alan)
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 42, 138, 0.5)';
        ctx.lineWidth = 1;
        ctx.shadowColor = '#ff2a8a';
        ctx.shadowBlur = 6;

        // Dikey çizgiler — ufuktan dışa doğru yayılan
        const vanishX = GAME_W / 2;
        const lineCount = 18;
        for (let i = -lineCount; i <= lineCount; i++) {
            if (Math.abs(i) < 3) continue; // pist alanını atla
            const endX = vanishX + i * (GAME_W / 2.5);
            ctx.beginPath();
            ctx.moveTo(vanishX, HORIZON_Y);
            ctx.lineTo(endX, GAME_H);
            ctx.stroke();
        }

        // Yatay çizgiler — uzaklaştıkça sıklaşan
        const offset = (trackStripeOffset * 22) % 40;
        for (let i = 0; i < 12; i++) {
            const t = i / 12;
            const y = HORIZON_Y + Math.pow(t, 2.2) * (GAME_H - HORIZON_Y) + offset * (1 - t) * 0.5;
            if (y > GAME_H) continue;
            ctx.globalAlpha = 0.25 + t * 0.4;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_W, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function drawScanlines() {
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#000';
        for (let y = 0; y < GAME_H; y += 3) {
            ctx.fillRect(0, y, GAME_W, 1);
        }
        ctx.restore();
    }

    function drawTrack() {
        const nearLeft = project(-TRACK_HALF_WIDTH, 0, cameraZ + 0.5);
        const nearRight = project(TRACK_HALF_WIDTH, 0, cameraZ + 0.5);
        const farLeft = project(-TRACK_HALF_WIDTH, 0, cameraZ + VIEW_DIST);
        const farRight = project(TRACK_HALF_WIDTH, 0, cameraZ + VIEW_DIST);
        if (!nearLeft || !farLeft) return;

        // Pist zemini — koyu temel
        ctx.fillStyle = '#0a0220';
        ctx.beginPath();
        ctx.moveTo(farLeft.sx, farLeft.sy);
        ctx.lineTo(farRight.sx, farRight.sy);
        ctx.lineTo(nearRight.sx, nearRight.sy);
        ctx.lineTo(nearLeft.sx, nearLeft.sy);
        ctx.closePath();
        ctx.fill();

        // Satranç tahtası panelleri — alternatif koyu/biraz açık
        const stripeSize = 4;
        for (let dz = -trackStripeOffset; dz < VIEW_DIST; dz += stripeSize) {
            const z0 = cameraZ + dz + 0.5;
            const z1 = cameraZ + dz + stripeSize + 0.5;
            const l0 = project(-TRACK_HALF_WIDTH, 0, z0);
            const r0 = project(TRACK_HALF_WIDTH, 0, z0);
            const l1 = project(-TRACK_HALF_WIDTH, 0, z1);
            const r1 = project(TRACK_HALF_WIDTH, 0, z1);
            if (!l0 || !l1) continue;

            const stripeIdx = Math.floor((cameraZ + dz) / stripeSize);
            const isDark = stripeIdx % 2 === 0;
            const alpha = clamp(1 - dz / VIEW_DIST, 0, 1);
            ctx.fillStyle = isDark
                ? `rgba(30, 10, 60, ${alpha * 0.85})`
                : `rgba(80, 20, 120, ${alpha * 0.7})`;
            ctx.beginPath();
            ctx.moveTo(l1.sx, l1.sy);
            ctx.lineTo(r1.sx, r1.sy);
            ctx.lineTo(r0.sx, r0.sy);
            ctx.lineTo(l0.sx, l0.sy);
            ctx.closePath();
            ctx.fill();
        }

        // Merkez şerit çizgileri (yakın — uzak, solarak)
        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const midFar = project(0, 0, cameraZ + VIEW_DIST);
        const midNear = project(0, 0, cameraZ + 0.5);
        if (midFar && midNear) {
            ctx.moveTo(midFar.sx, midFar.sy);
            ctx.lineTo(midNear.sx, midNear.sy);
            ctx.stroke();
        }
        ctx.restore();

        // Neon kenar çizgileri — cyan glow
        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(farLeft.sx, farLeft.sy);
        ctx.lineTo(nearLeft.sx, nearLeft.sy);
        ctx.moveTo(farRight.sx, farRight.sy);
        ctx.lineTo(nearRight.sx, nearRight.sy);
        ctx.stroke();
        // Ek iç çizgi (daha parlak)
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba(220, 255, 255, 0.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
    }

    function drawObstacle(o) {
        const hx = OBSTACLE_W / 2;
        const hz = OBSTACLE_W / 2;
        const h = OBSTACLE_H;
        const corners = [
            project(o.x - hx, 0, o.z - hz),      // 0 alt-sol-ön
            project(o.x + hx, 0, o.z - hz),      // 1 alt-sağ-ön
            project(o.x + hx, 0, o.z + hz),      // 2 alt-sağ-arka
            project(o.x - hx, 0, o.z + hz),      // 3 alt-sol-arka
            project(o.x - hx, h, o.z - hz),      // 4 üst-sol-ön
            project(o.x + hx, h, o.z - hz),      // 5 üst-sağ-ön
            project(o.x + hx, h, o.z + hz),      // 6 üst-sağ-arka
            project(o.x - hx, h, o.z + hz),      // 7 üst-sol-arka
        ];
        if (corners.some(c => c === null)) return;

        // Derin siyah gövde — neon neon efekti için
        ctx.fillStyle = '#1a0008';
        // Ön yüz
        ctx.beginPath();
        ctx.moveTo(corners[0].sx, corners[0].sy);
        ctx.lineTo(corners[1].sx, corners[1].sy);
        ctx.lineTo(corners[5].sx, corners[5].sy);
        ctx.lineTo(corners[4].sx, corners[4].sy);
        ctx.closePath();
        ctx.fill();
        // Üst
        const topGrad = ctx.createLinearGradient(corners[4].sx, corners[4].sy, corners[6].sx, corners[6].sy);
        topGrad.addColorStop(0, '#ff2040');
        topGrad.addColorStop(1, '#8a001a');
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.moveTo(corners[4].sx, corners[4].sy);
        ctx.lineTo(corners[5].sx, corners[5].sy);
        ctx.lineTo(corners[6].sx, corners[6].sy);
        ctx.lineTo(corners[7].sx, corners[7].sy);
        ctx.closePath();
        ctx.fill();
        // Yan
        const visible = ball.x < o.x ? 'right' : 'left';
        ctx.fillStyle = '#2a0010';
        ctx.beginPath();
        if (visible === 'right') {
            ctx.moveTo(corners[1].sx, corners[1].sy);
            ctx.lineTo(corners[2].sx, corners[2].sy);
            ctx.lineTo(corners[6].sx, corners[6].sy);
            ctx.lineTo(corners[5].sx, corners[5].sy);
        } else {
            ctx.moveTo(corners[3].sx, corners[3].sy);
            ctx.lineTo(corners[0].sx, corners[0].sy);
            ctx.lineTo(corners[4].sx, corners[4].sy);
            ctx.lineTo(corners[7].sx, corners[7].sy);
        }
        ctx.closePath();
        ctx.fill();

        // NEON KENAR ÇİZGİLERİ — tüm küp iskeleti
        ctx.save();
        ctx.shadowColor = '#ff0050';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#ff2060';
        ctx.lineWidth = 2.5;
        const edges = [
            [0,1],[1,2],[2,3],[3,0],        // alt kare
            [4,5],[5,6],[6,7],[7,4],        // üst kare
            [0,4],[1,5],[2,6],[3,7],        // dikey
        ];
        ctx.beginPath();
        for (const [a, b] of edges) {
            ctx.moveTo(corners[a].sx, corners[a].sy);
            ctx.lineTo(corners[b].sx, corners[b].sy);
        }
        ctx.stroke();
        // İç parlak çizgi
        ctx.shadowBlur = 4;
        ctx.strokeStyle = '#ffb0c0';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    function drawBall(b) {
        const p = project(b.x, b.y + BALL_RADIUS, b.z);
        if (!p) return;
        const r = BALL_RADIUS * p.scale;

        // Gölge — neon cyan ışık izi
        const shadow = project(b.x, 0.01, b.z);
        if (shadow) {
            ctx.save();
            ctx.shadowColor = '#00ffd0';
            ctx.shadowBlur = 12;
            ctx.fillStyle = 'rgba(0, 255, 208, 0.35)';
            ctx.beginPath();
            ctx.ellipse(shadow.sx, shadow.sy, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Dış neon glow
        ctx.save();
        ctx.shadowColor = '#00ffd0';
        ctx.shadowBlur = 25;
        ctx.fillStyle = 'rgba(0, 255, 208, 0.3)';
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Chrome gövde - koyu → neon cyan
        const bg = ctx.createRadialGradient(p.sx - r * 0.4, p.sy - r * 0.4, r * 0.05, p.sx, p.sy, r);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(0.25, '#b0fff0');
        bg.addColorStop(0.6, '#00e8c0');
        bg.addColorStop(1, '#002a28');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();

        // Yuvarlanma — neon çizgi
        ctx.save();
        ctx.translate(p.sx, p.sy);
        ctx.rotate(b.rollAngle);
        ctx.shadowColor = '#00ffd0';
        ctx.shadowBlur = 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.85, r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 255, 208, 0.7)';
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.35, r * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Parlak nokta
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(p.sx - r * 0.4, p.sy - r * 0.45, r * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Neon kenar
        ctx.save();
        ctx.shadowColor = '#00ffd0';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#00ffd0';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function drawParticle(p) {
        const pr = project(p.x, p.y, p.z);
        if (!pr) return;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, Math.max(1, p.r * pr.scale), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    function drawCountdownOverlay() {
        ctx.fillStyle = 'rgba(5, 2, 20, 0.5)';
        ctx.fillRect(0, 0, GAME_W, GAME_H);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const remainMs = countdownEndAt - nowMs();
        const secF = remainMs / 1000;
        const pulse = 1 - (secF - Math.floor(secF));
        const scale = 1 + pulse * 0.5;
        const label = countdownSec > 0 ? String(countdownSec) : 'GO!';

        ctx.translate(GAME_W / 2, GAME_H / 2);
        ctx.scale(scale, scale);
        ctx.font = 'bold 96px "Orbitron", "Arial Black", system-ui, sans-serif';
        ctx.shadowColor = countdownSec > 0 ? '#ff2a8a' : '#00ffd0';
        ctx.shadowBlur = 32;
        ctx.fillStyle = countdownSec > 0 ? '#ff2a8a' : '#00ffd0';
        ctx.fillText(label, 0, 0);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeText(label, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px "Comic Sans MS", system-ui, sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        const isTouch = (typeof MobileUtils !== 'undefined' && MobileUtils.isTouchDevice());
        ctx.fillText(isTouch ? 'Alttaki tuşlarla yönel ve zıpla' : '◀ ▶ ile yönel, Boşluk ile zıpla', GAME_W / 2, GAME_H - 40);
        ctx.restore();
    }

    return { id, levels, init, destroy };
})();
