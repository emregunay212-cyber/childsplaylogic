/* ============================================
   OYUN: Zıpla Topla — Mario-stili 2D Platform Macerası
   Canvas tabanlı, kamera takipli, 3 tema × 4 seviye = 12 bölüm
   - Coyote time + jump buffer + değişken zıplama
   - AABB swept collision (yan çarpışma dahil)
   - Hareketli platform taşıma
   - Goomba düşmanlar (üstüne basınca ölür)
   - 3 can — bitince game over
   ============================================ */

const ZiplaTopla = (() => {
    const id = 'zipla-topla';

    // ---- Sabitler ----
    const GAME_W = 800, GAME_H = 360;
    const FPS = 60, STEP = 1 / FPS;

    const PLAYER_W = 26, PLAYER_H = 36;
    const COIN_R = 9;

    // Fizik (piksel / saniye)
    const GRAVITY = 1700;
    const MAX_VY_FALL = 720;
    const MAX_VY_JUMP = -680;
    const JUMP_VELOCITY = 640;
    const JUMP_CUT = 0.5;
    const MAX_VX = 280;
    const ACCEL_GROUND = 1800;
    const ACCEL_AIR = 1000;
    const FRIC_GROUND = 2200;
    const FRIC_AIR = 400;
    const COYOTE_TIME = 0.15;
    const JUMP_BUFFER = 0.16;

    const ENEMY_SPEED = 60;
    const ENEMY_W = 28, ENEMY_H = 26;

    const MAX_LIVES = 3;      // tek kişilik can havuzu
    const COOP_LIVES = 5;     // iki kişilik ortak can havuzu (iki oyuncu daha sık ölür)
    const EDGE_MARGIN = 6;    // co-op: oyuncuların görünür ekran kenarına yumuşak yapışma payı

    // Oyuncu kontrolleri — P1: ok tuşları + ↑/Boşluk, P2: A/D + W
    const CONTROLS = {
        p1: { left: 'ArrowLeft', right: 'ArrowRight', jump: ['ArrowUp', ' '] },
        p2: { left: 'a', right: 'd', jump: ['w'] },
    };

    // Karakter paletleri — P1 Mario (kırmızı), P2 Luigi (yeşil). Aynı çizim, farklı renk.
    const PALETTES = {
        mario: { hat: '#c0392b', body: '#e74c3c', label: '1' },
        luigi: { hat: '#1e8449', body: '#27ae60', label: '2' },
    };

    // Temalar
    const THEMES = {
        meadow: {
            name: 'Çayır',
            skyTop: '#89d5ff', skyBot: '#d5f2ff',
            groundTop: '#3cc84a', groundMid: '#6b3b1f', groundBot: '#4a2a15',
            platformTop: '#3cc84a', platformMid: '#6b3b1f',
            cloudColor: 'rgba(255,255,255,0.85)',
            accent: '#ffcf3a',
        },
        cave: {
            name: 'Yeraltı',
            skyTop: '#2a1845', skyBot: '#120825',
            groundTop: '#6a5580', groundMid: '#3b2a55', groundBot: '#1f1238',
            platformTop: '#8a7ea5', platformMid: '#4a3a68',
            cloudColor: 'rgba(180,150,220,0.25)',
            accent: '#ff6ac9',
        },
        sky: {
            name: 'Gökyüzü',
            skyTop: '#ffb27a', skyBot: '#ffeac0',
            groundTop: '#fff', groundMid: '#c9d8ff', groundBot: '#8aa5e8',
            platformTop: '#fff', platformMid: '#a9bfff',
            cloudColor: 'rgba(255,255,255,0.9)',
            accent: '#ff8a3a',
        },
    };

    // ---- Seviye tanımları ----
    // Platform: {x,y,w,h}
    // MovingPlatform: {x,y,w,h,minX,maxX,speed} veya {minY,maxY,vertical:true}
    // Coin: {x,y}
    // Spike: {x,y,w}   — y platformun üst kenarıdır; diken yukarı doğru çıkar
    // Enemy: {x,y,minX,maxX} (Goomba)
    // Door: {x,y}
    // Start: {x,y}
    const LEVELS = window.ZIPLA_TOPLA_LEVELS || [];

    const levels = LEVELS.map(() => ({}));

    // ---- Durum ----
    let container, callbacks, canvas, ctx;
    let players, coinList, spikeList, platformList, movingPlatforms, door, enemyList, lvl, theme;
    let collectedCoins, totalCoins, animFrameId, gameOver, levelWon, gameOverShown;
    let keys, keysPrev, currentLevelIdx, lastTime, accum;
    let cameraX, levelWidth, groundY, groundHoles;
    let lives, deathFlash;
    let mode = 'solo', maxLives = MAX_LIVES;   // 'solo' | 'coop' | 'online' — sayfa oturumu boyunca korunur
    let winTimer = null;                       // "bölüm kazanıldı" 700ms zamanlayıcısı (iptal edilebilir olmalı)
    // --- Online co-op durumu (host-otoriteli, Firebase RTDB) ---
    let netRole = null;                        // 'host' | 'guest'
    let roomRef = null;                        // firebase ref: lobbies/<id>/zt
    let net = null;                            // { lobbyId, opponentName }
    let latestGuestInput = { left: false, right: false, jump: false };
    let lastSentInput = null;                  // guest: son gönderilen girdi (kenar-tetik kıyası)
    let latestHostState = null;
    let snapBuf = [];                          // guest: [{rx, s}] anlık-görüntü tamponu (rx = yerel alınma zamanı)
    let clockOff = Infinity;                   // guest: min(rx - hostZamanı) — MONOTON (yalnız düşer; pencere-min'i periyodik ileri sıçratır)
    let lastBroadcastAt = 0, lastInputAt = 0;
    let onlineStatus = 'play';                 // 'play' | 'over' | 'victory'
    let opponentLeft = false, oppSeen = false, oppGoneTimer = null;
    let netListeners = [];                     // [{ref, cb}] — destroy'da tam olarak kaldırmak için
    let bgTicker = null;                       // online: gizli-sekme döngü sürücüsü (Worker timer)
    let winAdvanceTimer = null;                // online: kazanınca sonraki bölüme geçiş zamanlayıcısı
    let levelBanner;

    // ---- Init / Destroy ----
    function init(gameArea, level, cbs) {
        if (mode === 'online') mode = 'solo';   // önceki online oturumdan miras kalmasın (GameEngine yolu hiç online değildir)
        container = gameArea;
        callbacks = cbs;
        currentLevelIdx = level - 1;
        maxLives = (mode === 'coop') ? COOP_LIVES : MAX_LIVES;
        lives = maxLives;
        GameEngine.setTotal(LEVELS[currentLevelIdx].coins.length);
        startLevel();
    }

    // Seviye geometrisini + oyuncuları kur (DOM/döngü YOK). Hem startLevel hem
    // de online guest'in seviye-geçişinde (applyHostState) yeniden kurmak için kullanılır.
    function setupLevelData() {
        lvl = LEVELS[currentLevelIdx];
        theme = THEMES[lvl.theme];
        levelWidth = lvl.width;
        groundY = lvl.ground.y;
        groundHoles = lvl.ground.holes || [];

        players = [makePlayer('mario', CONTROLS.p1, lvl.start.x)];
        if (mode === 'coop' || mode === 'online') {
            players.push(makePlayer('luigi', CONTROLS.p2, lvl.start.x + 40));
        }
        if (mode === 'online' && netRole === 'host') {
            players[0].localOnline = true;          // Mario = host yerel girişi
            if (players[1]) players[1].netInput = latestGuestInput;  // Luigi = guest girişi (canlı obje)
        }

        coinList = lvl.coins.map(c => ({ x: c.x, y: c.y, collected: false, bob: Math.random() * Math.PI * 2 }));
        spikeList = lvl.spikes.map(s => ({ ...s }));
        platformList = lvl.platforms.map(p => ({ ...p }));
        movingPlatforms = lvl.movingPlatforms.map(p => ({
            ...p, prevX: p.x, prevY: p.y, phase: Math.random() * Math.PI * 2,
        }));
        enemyList = (lvl.enemies || []).map(e => ({
            x: e.x, y: e.y, minX: e.minX, maxX: e.maxX,
            w: ENEMY_W, h: ENEMY_H, dir: -1,
            dead: false, squashTimer: 0,
        }));
        door = { ...lvl.door };
        collectedCoins = 0; totalCoins = lvl.coins.length;
    }

    function startLevel() {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (winTimer) { clearTimeout(winTimer); winTimer = null; }
        if (winAdvanceTimer) { clearTimeout(winAdvanceTimer); winAdvanceTimer = null; }
        gameOver = false; levelWon = false; gameOverShown = false; onlineStatus = 'play';
        keys = {}; keysPrev = {};
        lastTime = performance.now(); accum = 0;
        lastBroadcastAt = 0; lastInputAt = 0;   // online: yeni bölüm/retry durumu ilk karede hemen yayılsın
        cameraX = 0;
        deathFlash = 0;

        setupLevelData();

        levelBanner = { show: true, timer: 1.6 };

        buildDOM();
        // Dinleyicileri çift-eklemeye karşı idempotent tut (mod değişimi/retry startLevel'i doğrudan çağırır)
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('visibilitychange', onVisChange);
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('visibilitychange', onVisChange);
        gameLoop();
    }

    function makePlayer(type, controls, startX) {
        return {
            x: startX, y: lvl.start.y - PLAYER_H, dx: 0, dy: 0,
            w: PLAYER_W, h: PLAYER_H, dir: 1,
            onGround: false, jumpHeld: false, invuln: 0,
            coyote: 0, jumpBuf: 0, ridingPlatform: null,
            type, controls, palette: PALETTES[type],
        };
    }

    // Mod değiştir (HUD geçişi) — mevcut bölümü yeni modda yeniden başlatır
    function setMode(m) {
        if (m === mode || levelWon || gameOver) return;  // kazanma/game-over penceresinde geçişi engelle
        mode = m;
        maxLives = (mode === 'coop') ? COOP_LIVES : MAX_LIVES;
        lives = maxLives;
        startLevel();
    }

    function destroy() {
        stopBgTicker();
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (winTimer) { clearTimeout(winTimer); winTimer = null; }
        if (winAdvanceTimer) { clearTimeout(winAdvanceTimer); winAdvanceTimer = null; }
        if (oppGoneTimer) { clearTimeout(oppGoneTimer); oppGoneTimer = null; }
        // Online: kayıtlı RTDB dinleyicilerini TAM ve hedefli kaldır (alt-yollar + .info/connected
        // kendi callback'iyle — başka sistemlerin dinleyicilerine dokunmadan) + presence'ı sil
        netListeners.forEach(l => { try { l.ref.off('value', l.cb); } catch (e) {} });
        netListeners = [];
        if (roomRef) {
            try { roomRef.child('presence/' + netRole).remove(); } catch (e) {}
            roomRef = null;
        }
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('visibilitychange', onVisChange);
        keys = {};
        if (container) while (container.firstChild) container.removeChild(container.firstChild);
    }

    // ---- DOM ----
    function buildDOM() {
        while (container.firstChild) container.removeChild(container.firstChild);

        const wrap = document.createElement('div');
        wrap.className = 'zt-wrap';

        const frame = document.createElement('div');
        frame.className = 'zt-frame';

        canvas = document.createElement('canvas');
        canvas.className = 'zt-canvas';
        ctx = canvas.getContext('2d');
        try { MobileUtils.setupHiDPICanvas(canvas, ctx, GAME_W, GAME_H, { forceIntegerDpr: true }); }
        catch (e) { canvas.width = GAME_W; canvas.height = GAME_H; }
        canvas.style.touchAction = 'none';
        frame.appendChild(canvas);

        const hud = document.createElement('div');
        hud.className = 'zt-hud';
        hud.innerHTML =
            '<div class="zt-hud-box zt-hud-lives" id="zt-lives"></div>' +
            '<div class="zt-hud-box zt-hud-coins"><span class="zt-hud-label">💰</span><span id="zt-coins">0/' + totalCoins + '</span></div>' +
            '<div class="zt-hud-box zt-hud-level"><span class="zt-hud-label">Seviye</span><span>' + (currentLevelIdx + 1) + '/12</span></div>';
        frame.appendChild(hud);

        // Mod geçişi (1 KİŞİ / 2 KİŞİ) — güvenli DOM ile, yalnızca klavyeli (dokunmatik olmayan) cihazlarda.
        // 2 kişilik mod klavye gerektirir; mobilde tek kişilik kalır.
        const isTouch = (typeof MobileUtils !== 'undefined' && MobileUtils.isTouchDevice && MobileUtils.isTouchDevice());
        if (!isTouch && mode !== 'online') {
            const modeBox = document.createElement('div');
            modeBox.className = 'zt-hud-box zt-mode-toggle';
            [['solo', '1 KİŞİ'], ['coop', '2 KİŞİ']].forEach(([m, txt]) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'zt-mode-btn' + (mode === m ? ' active' : '');
                b.dataset.mode = m;
                b.textContent = txt;
                modeBox.appendChild(b);
            });
            modeBox.addEventListener('click', (e) => {
                const btn = e.target.closest('.zt-mode-btn');
                if (btn) setMode(btn.dataset.mode);
            });
            hud.insertBefore(modeBox, hud.firstChild);
        }

        wrap.appendChild(frame);

        const controls = document.createElement('div');
        controls.className = 'zt-controls';
        const makeBtn = (cls, txt) => {
            const b = document.createElement('button');
            b.className = 'zt-btn ' + cls;
            b.textContent = txt;
            b.setAttribute('type', 'button');
            return b;
        };
        const btnL = makeBtn('zt-btn-left', '◀');
        const btnR = makeBtn('zt-btn-right', '▶');
        const btnJ = makeBtn('zt-btn-jump', '▲');

        const bind = (btn, key) => {
            if (typeof MobileUtils !== 'undefined' && MobileUtils.bindHoldButton) {
                MobileUtils.bindHoldButton(btn, () => { keys[key] = true; }, () => { keys[key] = false; });
            } else {
                btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; });
                btn.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; });
                btn.addEventListener('touchcancel', () => { keys[key] = false; });
                btn.addEventListener('mousedown', () => { keys[key] = true; });
                btn.addEventListener('mouseup', () => { keys[key] = false; });
                btn.addEventListener('mouseleave', () => { keys[key] = false; });
            }
        };
        bind(btnL, 'ArrowLeft'); bind(btnR, 'ArrowRight'); bind(btnJ, ' ');

        const leftSide = document.createElement('div');
        leftSide.className = 'zt-ctrl-side zt-ctrl-left';
        leftSide.appendChild(btnL); leftSide.appendChild(btnR);

        const rightSide = document.createElement('div');
        rightSide.className = 'zt-ctrl-side zt-ctrl-right';
        rightSide.appendChild(btnJ);

        controls.appendChild(leftSide);
        controls.appendChild(rightSide);
        wrap.appendChild(controls);

        container.appendChild(wrap);

        maybeShowOrientationHint(wrap);

        updateHUD();
    }

    function maybeShowOrientationHint(wrap) {
        const isTouch = (typeof MobileUtils !== 'undefined' && MobileUtils.isTouchDevice());
        if (!isTouch) return;
        let dismissed = false;
        try { dismissed = localStorage.getItem('zt-rotate-hint-dismissed') === '1'; } catch (e) {}
        if (dismissed) return;
        const isPortrait = window.matchMedia && window.matchMedia('(orientation: portrait)').matches;
        if (!isPortrait) return;

        const overlay = document.createElement('div');
        overlay.className = 'zt-rotate-hint';
        overlay.innerHTML =
            '<div class="zt-rotate-card">' +
                '<div class="zt-rotate-icon">📱↻</div>' +
                '<div class="zt-rotate-title">Daha iyi deneyim için</div>' +
                '<div class="zt-rotate-text">Telefonunu yan çevir — platformer oyunları geniş ekranda çok daha eğlenceli!</div>' +
                '<button class="zt-rotate-btn" id="zt-rotate-dismiss" type="button">Yine de oyna</button>' +
            '</div>';
        wrap.appendChild(overlay);
        overlay.querySelector('#zt-rotate-dismiss').addEventListener('click', () => {
            try { localStorage.setItem('zt-rotate-hint-dismissed', '1'); } catch (e) {}
            overlay.remove();
        });
    }

    function updateHUD() {
        const coinEl = document.getElementById('zt-coins');
        if (coinEl) coinEl.textContent = collectedCoins + '/' + totalCoins;
        const livesEl = document.getElementById('zt-lives');
        if (livesEl) {
            let html = '';
            for (let i = 0; i < maxLives; i++) {
                html += '<span class="zt-heart ' + (i < lives ? 'on' : 'off') + '">♥</span>';
            }
            livesEl.innerHTML = html;
        }
    }

    // ---- Input ----
    // P1: ok tuşları + ↑/Boşluk · P2: A/D + W
    // Bir tuşu mantıksal token'a çevir. ÖNCE fiziksel tuş kodu (e.code: KeyA/KeyD/KeyW/Arrow*/Space)
    // — klavye DÜZENİNDEN bağımsız, böylece WASD Türkçe-F dahil her düzende çalışır — sonra e.key karakteri.
    function keyToken(e) {
        const code = e.code;
        if (code === 'ArrowLeft' || e.key === 'ArrowLeft') return 'ArrowLeft';
        if (code === 'ArrowRight' || e.key === 'ArrowRight') return 'ArrowRight';
        if (code === 'ArrowUp' || e.key === 'ArrowUp') return 'ArrowUp';
        if (code === 'Space' || e.key === ' ') return ' ';
        if (code === 'KeyA') return 'a';
        if (code === 'KeyD') return 'd';
        if (code === 'KeyW') return 'w';
        const k = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
        if (k === 'a' || k === 'd' || k === 'w') return k;
        return null;
    }
    function onKeyDown(e) {
        const tok = keyToken(e);
        if (!tok) return;
        if (tok === 'ArrowLeft' || tok === 'ArrowRight' || tok === 'ArrowUp' || tok === ' ') e.preventDefault();
        keys[tok] = true;
    }
    function onKeyUp(e) {
        const tok = keyToken(e);
        if (tok) keys[tok] = false;
    }

    // ---- Loop ----
    // Tek simülasyon/ağ adımı. Görünür sekmede rAF (gameLoop), GİZLİ sekmede Worker
    // zamanlayıcısı (bgTicker) çağırır — tarayıcı gizli sekmede rAF'ı tamamen durdurur,
    // bu yüzden online host/guest döngüsü rAF'a bağlı kalamaz.
    function stepGame() {
        const now = performance.now();
        accum += Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;

        if (mode === 'online' && netRole === 'guest') {
            // Guest: yerel simülasyon yok — gelen host durumunu uygula, kendi girdisini gönder
            applyHostState();
            sendGuestInput(now);
            accum = 0;
            if (levelBanner && levelBanner.show) {
                levelBanner.timer -= 1 / FPS;
                if (levelBanner.timer <= 0) levelBanner.show = false;
            }
        } else {
            while (accum >= STEP) {
                accum -= STEP;
                if (!levelWon && !gameOver && onlineStatus === 'play') fixedUpdate(STEP);
                if (levelBanner && levelBanner.show) {
                    levelBanner.timer -= STEP;
                    if (levelBanner.timer <= 0) levelBanner.show = false;
                }
            }
            if (mode === 'online' && netRole === 'host') broadcastHostState(now);
        }
        if (!document.hidden) draw();   // gizli sekmede çizim israf — simülasyon/ağ yeter
    }

    function gameLoop() {
        // Online'da game-over altında bile döngü sürmeli (retry/durum senkronu için)
        if (gameOver && gameOverShown && mode !== 'online') return;
        stepGame();
        animFrameId = requestAnimationFrame(gameLoop);
    }

    // Online arka-plan sürücüsü: Worker setInterval'i gizli sekmede KISILMAZ (ana-iş
    // parçacığı timer'larının aksine) — host fiziği/yayını ve guest girdi-gönderimi
    // sekme arka plandayken de tam hızda sürer (aynı bilgisayarda iki sekme senaryosu dahil).
    function startBgTicker() {
        if (bgTicker) return;
        try {
            const url = URL.createObjectURL(new Blob(
                ['setInterval(function(){postMessage(1)},33)'],
                { type: 'application/javascript' }
            ));
            const w = new Worker(url);
            URL.revokeObjectURL(url);
            // Koşulsuz adım: accumulator sayesinde rAF ile çakışma zararsız (fizik süresi
            // gerçek zamana bağlı), gizliyken ise tek sürücü budur.
            w.onmessage = () => { if (mode === 'online') stepGame(); };
            bgTicker = { stop: () => w.terminate() };
        } catch (e) {
            // Worker yoksa ana-iş parçacığı interval'i (gizlide ~1Hz'e kısılır ama donmaz)
            const id = setInterval(() => { if (mode === 'online') stepGame(); }, 250);
            bgTicker = { stop: () => clearInterval(id) };
        }
    }
    function stopBgTicker() { if (bgTicker) { bgTicker.stop(); bgTicker = null; } }

    // Sekme gizlenince basılı tuşları bırak — keyup başka sekmeye gittiğinde
    // karakterin sonsuza dek koşması (takılı tuş) önlenir.
    function onVisChange() { if (document.hidden) keys = {}; }

    // ---- Fizik ----
    function fixedUpdate(dt) {
        // Hareketli platformları güncelle (önceki pos kaydet) — kareye bir kez
        for (const mp of movingPlatforms) {
            mp.prevX = mp.x; mp.prevY = mp.y;
            mp.phase += mp.speed * dt;
            if (mp.vertical) {
                mp.y = mp.minY + (Math.sin(mp.phase) * 0.5 + 0.5) * (mp.maxY - mp.minY);
            } else {
                mp.x = mp.minX + (Math.sin(mp.phase) * 0.5 + 0.5) * (mp.maxX - mp.minX);
            }
        }

        // Her oyuncuyu güncelle (ölüm game-over'a yol açarsa erken çık)
        for (const p of players) {
            updatePlayer(p, dt);
            if (gameOver) return;
        }

        // Düşmanlar — kareye bir kez hareket, tüm oyunculara karşı kontrol
        for (const e of enemyList) {
            if (e.dead) {
                e.squashTimer -= dt;
                continue;
            }
            e.x += e.dir * ENEMY_SPEED * dt;
            if (e.x <= e.minX) { e.x = e.minX; e.dir = 1; }
            if (e.x + e.w >= e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }

            for (const p of players) {
                if (!aabb(p, e)) continue;
                // Üstten basma — iki oyuncu da aynı karede basabilir; her ikisi de seker
                if (p.dy > 0 && (p.y + p.h - e.y) < 18) {
                    p.dy = -JUMP_VELOCITY * 0.6;
                    if (!e.dead) {
                        e.dead = true;
                        e.squashTimer = 0.35;
                        try { AudioManager.play('success'); } catch (err) {}
                    }
                } else if (!e.dead && p.invuln <= 0) {
                    // Yalnızca CANLI düşman zarar verir (ezilmiş düşmana yandan değmek öldürmez)
                    playerDie(p);
                    break;
                }
            }
            if (gameOver) return;
        }

        // Para toplama — herhangi bir oyuncu toplayabilir (ortak sayaç)
        for (const coin of coinList) {
            if (coin.collected) continue;
            coin.bob += dt * 4;
            const cy = coin.y + Math.sin(coin.bob) * 3;
            for (const p of players) {
                const cdx = (p.x + p.w / 2) - coin.x;
                const cdy = (p.y + p.h / 2) - cy;
                if (cdx * cdx + cdy * cdy < (COIN_R + 16) * (COIN_R + 16)) {
                    coin.collected = true;
                    collectedCoins++;
                    if (callbacks) callbacks.onCorrect();
                    try { AudioManager.play('success'); } catch (e) {}
                    updateHUD();
                    break;
                }
            }
        }

        // Diken — ölümsüzken zarar yok
        for (const s of spikeList) {
            for (const p of players) {
                if (p.invuln > 0) continue;
                if (p.x + p.w > s.x + 4 && p.x < s.x + s.w - 4 &&
                    p.y + p.h > s.y - 14 && p.y + p.h < s.y + 18) {
                    playerDie(p);
                    break;
                }
            }
            if (gameOver) return;
        }

        // Kapı — herhangi bir oyuncu ulaşınca bölüm biter (co-op: birlikte kazanılır)
        for (const p of players) {
            if (p.x + p.w > door.x + 4 && p.x < door.x + 36 &&
                p.y + p.h > door.y + 8 && p.y < door.y + 48) {
                if (!levelWon) {
                    levelWon = true;
                    try { AudioManager.play('complete'); } catch (e) {}
                    try { Particles.celebrate(); } catch (e) {}
                    if (mode === 'online') {
                        handleOnlineWin();   // host: kısa kutlama sonra sonraki bölüme geç / zafer
                    } else {
                        const pct = totalCoins > 0 ? collectedCoins / totalCoins : 1;
                        const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
                        winTimer = setTimeout(() => { winTimer = null; callbacks.onComplete(stars); }, 700);
                    }
                }
                break;
            }
        }

        updateCamera();
    }

    // Bir oyuncunun girdisini oku: net (host'taki Luigi = guest girdisi),
    // online-yerel (host'taki Mario), ya da klavye (solo/coop kendi kontrol seti).
    function readInput(p) {
        if (p.netInput) return p.netInput;
        if (p.localOnline) return readBroadLocalInput();
        const c = p.controls;
        return { left: !!keys[c.left], right: !!keys[c.right], jump: c.jump.some(k => keys[k]) };
    }
    function readBroadLocalInput() {
        // Online yerel oyuncu: ok tuşları + WASD + boşluk hepsini kabul eder
        return {
            left: !!(keys['ArrowLeft'] || keys['a']),
            right: !!(keys['ArrowRight'] || keys['d']),
            jump: !!(keys['ArrowUp'] || keys[' '] || keys['w']),
        };
    }

    function updatePlayer(p, dt) {
        const inp = readInput(p);

        // Jump buffer: zıplama tuşuna yeni basıldı mı?
        const jumpPressed = !!inp.jump;
        const jumpPressedNow = jumpPressed && !p.jumpHeld;
        p.jumpHeld = jumpPressed;
        if (jumpPressedNow) p.jumpBuf = JUMP_BUFFER;
        else p.jumpBuf = Math.max(0, p.jumpBuf - dt);

        // Yatay giriş
        let ax = 0;
        const accel = p.onGround ? ACCEL_GROUND : ACCEL_AIR;
        const fric = p.onGround ? FRIC_GROUND : FRIC_AIR;
        if (inp.left) { ax = -accel; p.dir = -1; }
        else if (inp.right) { ax = accel; p.dir = 1; }
        else {
            // Sürtünme
            if (p.dx > 0) { p.dx = Math.max(0, p.dx - fric * dt); }
            else if (p.dx < 0) { p.dx = Math.min(0, p.dx + fric * dt); }
        }
        p.dx += ax * dt;
        p.dx = Math.max(-MAX_VX, Math.min(MAX_VX, p.dx));

        // Zıplama (buffer + coyote)
        if (p.jumpBuf > 0 && (p.onGround || p.coyote > 0)) {
            p.dy = -JUMP_VELOCITY;
            p.onGround = false;
            p.coyote = 0;
            p.jumpBuf = 0;
            try { AudioManager.play('pop'); } catch (e) {}
        }

        // Değişken zıplama: yukarı çıkarken tuş bırakılırsa kes
        if (!jumpPressed && p.dy < 0) p.dy *= JUMP_CUT;

        // Yerçekimi
        p.dy += GRAVITY * dt;
        p.dy = Math.max(MAX_VY_JUMP, Math.min(MAX_VY_FALL, p.dy));

        // Hareket ve çarpışma (X sonra Y)
        const wasOnGround = p.onGround;
        p.onGround = false;

        p.x += p.dx * dt;
        resolveCollisionsX(p);

        p.y += p.dy * dt;
        resolveCollisionsY(p, dt);

        // Hareketli platform üstündeyse taşı
        if (p.ridingPlatform) {
            p.x += p.ridingPlatform.x - p.ridingPlatform.prevX;
            p.y += p.ridingPlatform.y - p.ridingPlatform.prevY;
            if (p.y + p.h > groundY && !isOverHole(p.x, p.w)) {
                p.y = groundY - p.h;
                p.dy = 0;
                p.onGround = true;
            }
        }
        p.ridingPlatform = null;

        // Coyote time
        if (wasOnGround && !p.onGround) p.coyote = COYOTE_TIME;
        else p.coyote = Math.max(0, p.coyote - dt);

        // Seviye sınırları (X)
        if (p.x < 0) { p.x = 0; p.dx = 0; }
        if (p.x > levelWidth - p.w) { p.x = levelWidth - p.w; p.dx = 0; }

        // Düşme ölümü
        if (p.y > GAME_H + 50) { playerDie(p); return; }

        // Ölümsüzlük sayacı
        if (p.invuln > 0) p.invuln -= dt;
    }

    function updateCamera() {
        let targetCam;
        if ((mode === 'coop' || mode === 'online') && players.length > 1) {
            // İki oyuncunun orta noktasını takip et
            let sum = 0;
            for (const p of players) sum += p.x + p.w / 2;
            targetCam = sum / players.length - GAME_W / 2;
        } else {
            const p = players[0];
            targetCam = p.x + p.w / 2 - GAME_W / 2;
        }
        cameraX = Math.max(0, Math.min(levelWidth - GAME_W, targetCam));

        // Co-op: oyuncuları görünür ekranda tut — ekran kenarı yumuşak duvar gibi davranır,
        // böylece kimse ekran dışına kaçamaz (New Super Mario Bros tarzı).
        if ((mode === 'coop' || mode === 'online') && players.length > 1) {
            for (const p of players) {
                const minX = cameraX + EDGE_MARGIN;
                const maxX = cameraX + GAME_W - p.w - EDGE_MARGIN;
                if (p.x < minX) { p.x = minX; if (p.dx < 0) p.dx = 0; }
                if (p.x > maxX) { p.x = maxX; if (p.dx > 0) p.dx = 0; }
            }
        }
    }

    function isOverHole(x, w) {
        for (const h of groundHoles) {
            if (x + w > h.x + 4 && x < h.x + h.w - 4) return true;
        }
        return false;
    }

    function resolveCollisionsX(p) {
        const all = [...platformList, ...movingPlatforms];
        for (const pl of all) {
            if (aabb(p, pl)) {
                if (p.dx > 0) {
                    p.x = pl.x - p.w - 0.01;
                } else if (p.dx < 0) {
                    p.x = pl.x + pl.w + 0.01;
                }
                p.dx = 0;
            }
        }
    }

    function resolveCollisionsY(p, dt) {
        const all = [...platformList, ...movingPlatforms];
        for (const pl of all) {
            if (aabb(p, pl)) {
                if (p.dy > 0) {
                    // Yere iniş
                    p.y = pl.y - p.h - 0.01;
                    p.dy = 0;
                    p.onGround = true;
                    if (pl.minX !== undefined || pl.minY !== undefined) {
                        p.ridingPlatform = pl;
                    }
                } else if (p.dy < 0) {
                    // Tavana çarpma
                    p.y = pl.y + pl.h + 0.01;
                    p.dy = 0;
                }
            }
        }
        // Zemin (boşluklar hariç)
        if (p.y + p.h > groundY && p.dy >= 0) {
            if (!isOverHole(p.x, p.w)) {
                p.y = groundY - p.h;
                p.dy = 0;
                p.onGround = true;
            }
        }
    }

    function aabb(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    }

    // ---- Ölüm / Game Over ----
    function playerDie(p) {
        try { AudioManager.play('error'); } catch (e) {}
        if (callbacks && callbacks.onWrong) callbacks.onWrong();
        lives--;               // ortak can havuzu
        updateHUD();
        deathFlash = 0.3;
        if (lives <= 0) {
            if (mode === 'online') { onlineStatus = 'over'; showOnlineGameOver(); }
            else showGameOver();
        } else {
            respawnPlayer(p);
        }
    }

    function respawnPlayer(p) {
        const partner = players.find(o => o !== p);
        // Eş YALNIZCA güvenli zemindeyse (yerde + delik üzerinde değil) onun yanında doğ.
        // Aksi halde (eş de düşüyor/havada ya da solo) güvenli başlangıca dön —
        // böylece iki oyuncu aynı çukura düşünce zincirleme ölüm/can tükenmesi olmaz.
        const partnerSafe = partner && partner.onGround && !isOverHole(partner.x, partner.w);
        if (mode === 'coop' && partnerSafe) {
            p.x = partner.x;
            p.y = partner.y;
        } else {
            p.x = lvl.start.x;
            p.y = lvl.start.y - PLAYER_H;
            cameraX = 0;
        }
        p.dx = 0; p.dy = 0;
        p.onGround = false;
        p.invuln = 1.0;
        p.coyote = 0; p.jumpBuf = 0;
        p.ridingPlatform = null;
    }

    function showGameOver() {
        gameOver = true;
        gameOverShown = true;
        try { AudioManager.play('error'); } catch (e) {}

        const overlay = document.createElement('div');
        overlay.className = 'zt-modal zt-gameover';
        overlay.innerHTML =
            '<div class="zt-modal-card">' +
                '<div class="zt-modal-title">💥 Oyun Bitti</div>' +
                '<div class="zt-modal-sub">Tüm canlarını kaybettin!</div>' +
                '<div class="zt-modal-stats">Topladığın para: <b>' + collectedCoins + '/' + totalCoins + '</b></div>' +
                '<div class="zt-modal-buttons">' +
                    '<button class="zt-mbtn zt-mbtn-primary" id="zt-btn-retry">🔁 Tekrar Dene</button>' +
                    '<button class="zt-mbtn zt-mbtn-secondary" id="zt-btn-back">🏠 Ana Sayfa</button>' +
                '</div>' +
            '</div>';
        container.appendChild(overlay);
        overlay.querySelector('#zt-btn-retry').addEventListener('click', () => {
            overlay.remove();
            lives = maxLives;
            gameOverShown = false;
            gameOver = false;
            startLevel();
        });
        overlay.querySelector('#zt-btn-back').addEventListener('click', () => {
            const h = document.getElementById('btn-home');
            if (h) h.click();
        });
    }

    // ---- Çizim ----
    function draw() {
        drawBackground();
        drawGround();
        drawPlatforms();
        drawSpikes();
        drawCoins();
        drawDoor();
        drawEnemies();
        for (const p of players) drawPlayer(p);

        if (deathFlash > 0) {
            ctx.fillStyle = `rgba(255, 80, 80, ${deathFlash})`;
            ctx.fillRect(0, 0, GAME_W, GAME_H);
            deathFlash = Math.max(0, deathFlash - 0.02);
        }

        if (levelBanner && levelBanner.show) drawLevelBanner();
    }

    function drawBackground() {
        const g = ctx.createLinearGradient(0, 0, 0, GAME_H);
        g.addColorStop(0, theme.skyTop);
        g.addColorStop(1, theme.skyBot);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, GAME_W, GAME_H);

        // Parallax bulutlar/dekor
        ctx.fillStyle = theme.cloudColor;
        const paraOffset = -cameraX * 0.3;
        for (let i = 0; i < 8; i++) {
            const cx = ((i * 340 + paraOffset) % (GAME_W + 200) + GAME_W + 200) % (GAME_W + 200) - 100;
            const cy = 40 + (i % 3) * 30;
            if (lvl.theme === 'cave') {
                // Taş sarkıt
                ctx.beginPath();
                ctx.moveTo(cx, 0);
                ctx.lineTo(cx + 20, 0);
                ctx.lineTo(cx + 10, 24 + (i % 2) * 10);
                ctx.closePath();
                ctx.fill();
            } else {
                // Bulut
                ctx.beginPath();
                ctx.arc(cx, cy, 18, 0, Math.PI * 2);
                ctx.arc(cx + 22, cy - 6, 22, 0, Math.PI * 2);
                ctx.arc(cx + 44, cy, 18, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Uzak dağlar (sadece meadow/sky)
        if (lvl.theme !== 'cave') {
            ctx.fillStyle = lvl.theme === 'sky' ? 'rgba(255,255,255,0.4)' : 'rgba(80, 140, 80, 0.55)';
            const mpOffset = -cameraX * 0.5;
            for (let i = 0; i < 10; i++) {
                const mx = (i * 280 + mpOffset) % (GAME_W + 400) - 200;
                const my = groundY - 60;
                ctx.beginPath();
                ctx.moveTo(mx, my + 60);
                ctx.lineTo(mx + 80, my);
                ctx.lineTo(mx + 160, my + 60);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    function drawGround() {
        // Zemin: groundHoles hariç çiz
        const segments = [{ x: 0, w: levelWidth }];
        for (const h of groundHoles) {
            const newSegs = [];
            for (const s of segments) {
                if (h.x + h.w <= s.x || h.x >= s.x + s.w) {
                    newSegs.push(s);
                } else {
                    if (h.x > s.x) newSegs.push({ x: s.x, w: h.x - s.x });
                    if (h.x + h.w < s.x + s.w) newSegs.push({ x: h.x + h.w, w: s.x + s.w - (h.x + h.w) });
                }
            }
            segments.splice(0, segments.length, ...newSegs);
        }
        for (const s of segments) {
            const sx = s.x - cameraX;
            if (sx + s.w < 0 || sx > GAME_W) continue;
            // Üst yeşil/çim
            ctx.fillStyle = theme.groundTop;
            ctx.fillRect(sx, groundY, s.w, 8);
            // Orta
            ctx.fillStyle = theme.groundMid;
            ctx.fillRect(sx, groundY + 8, s.w, 20);
            // Alt
            ctx.fillStyle = theme.groundBot;
            ctx.fillRect(sx, groundY + 28, s.w, GAME_H - groundY - 28);
            // Doku noktaları
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            for (let i = 0; i < s.w; i += 24) {
                ctx.fillRect(sx + i, groundY + 14, 3, 3);
                ctx.fillRect(sx + i + 12, groundY + 22, 2, 2);
            }
        }
    }

    function drawPlatforms() {
        for (const p of platformList) drawPlatform(p, false);
        for (const mp of movingPlatforms) drawPlatform(mp, true);
    }

    function drawPlatform(p, moving) {
        const sx = p.x - cameraX;
        if (sx + p.w < 0 || sx > GAME_W) return;
        // Üst şerit — tema renginde
        ctx.fillStyle = moving ? theme.accent : theme.platformTop;
        ctx.fillRect(sx, p.y, p.w, 4);
        // Gövde
        ctx.fillStyle = theme.platformMid;
        ctx.fillRect(sx, p.y + 4, p.w, p.h - 4);
        // Tile çizgileri
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1;
        for (let i = 20; i < p.w; i += 20) {
            ctx.beginPath();
            ctx.moveTo(sx + i, p.y + 4);
            ctx.lineTo(sx + i, p.y + p.h);
            ctx.stroke();
        }
        // Gölge
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(sx, p.y + p.h, p.w, 2);
    }

    function drawSpikes() {
        ctx.fillStyle = '#d0d0d0';
        ctx.strokeStyle = '#666';
        for (const s of spikeList) {
            const sx = s.x - cameraX;
            const cnt = Math.floor(s.w / 10);
            for (let i = 0; i < cnt; i++) {
                ctx.beginPath();
                ctx.moveTo(sx + i * 10, s.y + 12);
                ctx.lineTo(sx + i * 10 + 5, s.y - 6);
                ctx.lineTo(sx + i * 10 + 10, s.y + 12);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
    }

    function drawCoins() {
        for (const coin of coinList) {
            if (coin.collected) continue;
            const sx = coin.x - cameraX;
            if (sx < -20 || sx > GAME_W + 20) continue;
            const cy = coin.y + Math.sin(coin.bob) * 3;
            // Glow
            ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
            ctx.beginPath(); ctx.arc(sx, cy, COIN_R + 4, 0, Math.PI * 2); ctx.fill();
            // Gövde
            ctx.beginPath(); ctx.arc(sx, cy, COIN_R, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd700'; ctx.fill();
            ctx.strokeStyle = '#c9a300'; ctx.lineWidth = 2; ctx.stroke();
            // Parlak nokta
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath(); ctx.arc(sx - 3, cy - 3, 2.5, 0, Math.PI * 2); ctx.fill();
            // $ harfi
            ctx.fillStyle = '#a07800';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', sx, cy + 1);
        }
    }

    function drawDoor() {
        const sx = door.x - cameraX;
        if (sx + 40 < 0 || sx > GAME_W) return;
        // Çerçeve
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(sx, door.y, 36, 52);
        // İç
        ctx.fillStyle = theme.accent;
        ctx.fillRect(sx + 3, door.y + 3, 30, 46);
        // Üst kemer
        ctx.fillStyle = '#4a2a10';
        ctx.beginPath();
        ctx.arc(sx + 18, door.y + 12, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(sx + 18, door.y + 12, 9, Math.PI, 0);
        ctx.fill();
        // Tokmak
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(sx + 28, door.y + 30, 2.5, 0, Math.PI * 2); ctx.fill();
        // Yazı
        ctx.fillStyle = '#4a2a10';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ÇIKIŞ', sx + 18, door.y + 42);
    }

    function drawEnemies() {
        for (const e of enemyList) {
            const sx = e.x - cameraX;
            if (sx + e.w < 0 || sx > GAME_W) continue;
            if (e.dead) {
                // Ezilmiş
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(sx, e.y + e.h - 6, e.w, 6);
                ctx.fillStyle = '#a0522d';
                ctx.fillRect(sx + 2, e.y + e.h - 4, e.w - 4, 2);
                continue;
            }
            // Goomba gövde
            ctx.save();
            // Gölge
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath(); ctx.ellipse(sx + e.w / 2, e.y + e.h + 2, e.w / 2, 3, 0, 0, Math.PI * 2); ctx.fill();
            // Kafa/gövde — kahverengi mantar
            ctx.fillStyle = '#8b5a2b';
            ctx.beginPath();
            ctx.arc(sx + e.w / 2, e.y + e.h / 2, e.w / 2, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(sx, e.y + e.h / 2, e.w, e.h / 2);
            // Alt — daha koyu
            ctx.fillStyle = '#6b3b1f';
            ctx.fillRect(sx, e.y + e.h - 6, e.w, 6);
            // Ayaklar
            ctx.fillStyle = '#2a1a10';
            const foot = (Math.floor(e.x / 10) % 2 === 0) ? 0 : 2;
            ctx.fillRect(sx + 2, e.y + e.h - 3, 8, 4);
            ctx.fillRect(sx + e.w - 10, e.y + e.h - 3 + foot, 8, 4);
            // Gözler
            ctx.fillStyle = '#fff';
            ctx.fillRect(sx + 6, e.y + 8, 6, 6);
            ctx.fillRect(sx + e.w - 12, e.y + 8, 6, 6);
            ctx.fillStyle = '#000';
            const eyeOff = e.dir > 0 ? 2 : 0;
            ctx.fillRect(sx + 7 + eyeOff, e.y + 10, 3, 3);
            ctx.fillRect(sx + e.w - 11 + eyeOff, e.y + 10, 3, 3);
            // Kaşlar
            ctx.fillStyle = '#2a1a10';
            ctx.fillRect(sx + 4, e.y + 6, 8, 2);
            ctx.fillRect(sx + e.w - 12, e.y + 6, 8, 2);
            ctx.restore();
        }
    }

    function drawPlayer(p) {
        const sx = p.x - cameraX;
        // Ölümsüzken yanıp sön — zaman tabanlı (online guest invuln'ü azaltmaz, sabit değer
        // magnitude-tabanlı blink'i dondururdu; zaman tabanlı tüm modlarda doğru çalışır)
        if (p.invuln > 0 && Math.floor(performance.now() / 70) % 2 === 0) return;
        const pal = p.palette;
        ctx.save();
        if (p.dir === -1) {
            ctx.translate(sx + p.w / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(sx + p.w / 2), 0);
        }
        // Gölge
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(sx + p.w / 2, p.y + p.h + 2, p.w / 2, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Bacaklar (koşu animasyonu)
        ctx.fillStyle = '#2a4080';
        const runPhase = Math.abs(p.dx) > 20 ? Math.sin(performance.now() / 80) * 3 : 0;
        ctx.fillRect(sx + 4, p.y + 26, 6, 10 + runPhase);
        ctx.fillRect(sx + 16, p.y + 26, 6, 10 - runPhase);
        // Ayakkabı
        ctx.fillStyle = '#6b3b1f';
        ctx.fillRect(sx + 3, p.y + 34 + runPhase, 8, 3);
        ctx.fillRect(sx + 15, p.y + 34 - runPhase, 8, 3);

        // Gövde - tulum (palet rengi: Mario kırmızı / Luigi yeşil)
        ctx.fillStyle = pal.body;
        ctx.fillRect(sx + 3, p.y + 15, 20, 14);
        // Askı / düğmeler
        ctx.fillStyle = '#fff2a0';
        ctx.beginPath(); ctx.arc(sx + 8, p.y + 20, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 18, p.y + 20, 1.5, 0, Math.PI * 2); ctx.fill();

        // Kollar
        ctx.fillStyle = '#fed7a8';
        ctx.fillRect(sx + 1, p.y + 17, 4, 9);
        ctx.fillRect(sx + 21, p.y + 17, 4, 9);

        // Kafa
        ctx.fillStyle = '#fed7a8';
        ctx.beginPath(); ctx.arc(sx + p.w / 2, p.y + 8, 8, 0, Math.PI * 2); ctx.fill();

        // Şapka (palet rengi)
        ctx.fillStyle = pal.hat;
        ctx.fillRect(sx + 4, p.y, 18, 5);
        ctx.fillRect(sx + 8, p.y - 4, 12, 5);

        // Bıyık
        ctx.fillStyle = '#2a1a10';
        ctx.fillRect(sx + 9, p.y + 11, 10, 2);

        // Göz
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 15, p.y + 6, 4, 5);
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 17, p.y + 7, 2, 3);

        ctx.restore();

        // Şapka logosu — "Z" — flip DIŞINDA çizilir ki sola bakınca aynalanmasın
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Z', sx + p.w / 2, p.y + 3);

        // Co-op/online: başın üstünde oyuncu rozeti ("1"/"2") — flip dışında, düz çizilir
        if (mode === 'coop' || mode === 'online') {
            const lx = sx + p.w / 2;
            const ly = p.y - 12;
            ctx.fillStyle = pal.hat;
            ctx.strokeStyle = 'rgba(0,0,0,0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pal.label, lx, ly + 0.5);
            ctx.textBaseline = 'alphabetic';
        }
    }

    function drawLevelBanner() {
        const alpha = Math.min(1, levelBanner.timer / 1.6) * 0.9;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
        ctx.fillRect(0, GAME_H / 2 - 50, GAME_W, 100);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(255, 223, 100, ${alpha})`;
        ctx.font = 'bold 38px "Comic Sans MS", system-ui, sans-serif';
        ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
        ctx.fillText('Seviye ' + (currentLevelIdx + 1) + ' — ' + theme.name, GAME_W / 2, GAME_H / 2 - 10);
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.font = 'bold 16px "Comic Sans MS", system-ui, sans-serif';
        if (mode === 'online') {
            const meName = netRole === 'host' ? 'Sen = Mario 🔴' : 'Sen = Luigi 🟢';
            const opName = (net && net.opponentName) ? net.opponentName : 'Rakip';
            ctx.fillText(meName + '  ·  Rakip: ' + opName, GAME_W / 2, GAME_H / 2 + 14);
            ctx.font = 'bold 14px "Comic Sans MS", system-ui, sans-serif';
            ctx.fillText('Hareket: ← →  veya  A D    ·    Zıpla: ↑ / Boşluk / W', GAME_W / 2, GAME_H / 2 + 34);
        } else if (mode === 'coop') {
            ctx.fillText('1. Oyuncu: ← →  ↑   ·   2. Oyuncu: A D  W', GAME_W / 2, GAME_H / 2 + 20);
        } else {
            ctx.fillText('Paraları topla, kapıya ulaş!', GAME_W / 2, GAME_H / 2 + 22);
        }
    }

    // ============================================================
    //  ONLINE CO-OP — host-otoriteli, Firebase RTDB (Ateş-Buz modeli)
    //  Host = Mario (P1, yerel klavye/dokunmatik). Guest = Luigi (P2).
    //  Host tüm fiziği işler ve ~30Hz tam durum yayınlar; guest yalnızca
    //  girdisini ~20Hz gönderir ve gelen durumu çizer (snap; interpolasyon yok).
    //  Sync yolu: lobbies/<lobbyId>/zt/{hostState, guestInput, presence, cmd}
    // ============================================================
    const BROADCAST_MS = 33, INPUT_MS = 50, OPP_GRACE_MS = 6000;

    function initOnline(gameArea, data) {
        container = gameArea;
        callbacks = null;
        mode = 'online';
        netRole = (data && data.yourRole === 'guest') ? 'guest' : 'host';
        net = { lobbyId: data && data.lobbyId, opponentName: (data && data.opponentName) || 'Rakip' };
        currentLevelIdx = Math.max(0, (((data && data.level) || 1) - 1));
        maxLives = COOP_LIVES; lives = maxLives;
        onlineStatus = 'play';
        opponentLeft = false; oppSeen = false;
        latestHostState = null; snapBuf = []; clockOff = Infinity;
        latestGuestInput = { left: false, right: false, jump: false };
        lastSentInput = null;
        lastBroadcastAt = 0; lastInputAt = 0;

        try { roomRef = firebase.database().ref('lobbies/' + net.lobbyId + '/zt'); }
        catch (e) { roomRef = null; }

        netSetup();
        startBgTicker();   // sekme arka plana düşse de host fiziği / guest girdisi sürsün
        startLevel();
    }

    // Dinleyiciyi kaydet ve listede tut (destroy'da tam kaldırma için)
    function netOn(ref, cb) { ref.on('value', cb); netListeners.push({ ref, cb }); return cb; }

    function netSetup() {
        if (!roomRef) return;
        const otherRole = netRole === 'host' ? 'guest' : 'host';
        try {
            const myPres = roomRef.child('presence/' + netRole);
            const connRef = firebase.database().ref('.info/connected');
            netOn(connRef, s => {
                if (s.val() === true) { myPres.onDisconnect().remove(); myPres.set(true); }
            });
            // Rakip presence — kısa kesintiler için 6sn grace (false-positive ayrılma engellenir)
            netOn(roomRef.child('presence/' + otherRole), s => {
                if (s.val()) {
                    oppSeen = true;
                    if (oppGoneTimer) { clearTimeout(oppGoneTimer); oppGoneTimer = null; }
                } else if (oppSeen && !opponentLeft) {
                    if (oppGoneTimer) clearTimeout(oppGoneTimer);
                    oppGoneTimer = setTimeout(handleOpponentLeft, OPP_GRACE_MS);
                }
            });
        } catch (e) {}

        if (netRole === 'host') {
            netOn(roomRef.child('guestInput'), s => {
                const v = s.val() || {};
                latestGuestInput.left = !!v.left;
                latestGuestInput.right = !!v.right;
                latestGuestInput.jump = !!v.jump;
            });
            netOn(roomRef.child('cmd'), s => {
                if (s.val() === 'retry' && onlineStatus === 'over') {
                    roomRef.child('cmd').remove();
                    doOnlineRetry();
                }
            });
        } else {
            netOn(roomRef.child('hostState'), s => {
                const v = s.val();
                latestHostState = v;
                if (v) {
                    const rx = performance.now();
                    snapBuf.push({ rx, s: v });
                    if (snapBuf.length > 20) snapBuf.shift();
                    if (typeof v.t === 'number' && rx - v.t < clockOff) clockOff = rx - v.t;
                }
            });
        }
    }

    function broadcastHostState(now) {
        if (!roomRef || now - lastBroadcastAt < BROADCAST_MS) return;
        lastBroadcastAt = now;
        const p1 = players[0], p2 = players[1];
        roomRef.child('hostState').set({
            t: Math.round(now),   // host saati — guest, segment sürelerini varış yerine bundan alır (jitter eler)
            lv: currentLevelIdx,
            st: onlineStatus,
            lives: lives,
            cc: collectedCoins,
            bn: (levelBanner && levelBanner.show) ? 1 : 0,
            p1: p1 ? { x: Math.round(p1.x), y: Math.round(p1.y), d: p1.dir, iv: p1.invuln > 0 ? 1 : 0 } : null,
            p2: p2 ? { x: Math.round(p2.x), y: Math.round(p2.y), d: p2.dir, iv: p2.invuln > 0 ? 1 : 0 } : null,
            co: coinList.map(c => c.collected ? 1 : 0),
            en: enemyList.map(e => ({ x: Math.round(e.x), d: e.dir, k: e.dead ? 1 : 0 })),
            mp: movingPlatforms.map(m => ({ x: Math.round(m.x), y: Math.round(m.y) })),
        });
    }

    function sendGuestInput(now) {
        if (!roomRef) return;
        const i = readBroadLocalInput();
        // Kenar-tetikli gönderim: durum DEĞİŞTİYSE throttle beklemeden hemen yolla.
        // Yalnız periyodik (50ms) örnekleme, kısa dokunuşları ızgaraya yuvarlayıp Luigi'nin
        // hareket parçalarını uzatıyordu (Mario'dan "daha seri" his) — değişim anında gönderim
        // tuş süresini birebir korur; 50ms periyodik yazım keepalive olarak kalır.
        const changed = !lastSentInput ||
            i.left !== lastSentInput.left || i.right !== lastSentInput.right || i.jump !== lastSentInput.jump;
        if (!changed && now - lastInputAt < INPUT_MS) return;
        lastInputAt = now;
        lastSentInput = i;
        roomRef.child('guestInput').set({ left: i.left, right: i.right, jump: i.jump });
    }

    // Guest render interpolasyonu (anlık-görüntü tamponu): dünyayı INTERP_DELAY ms GEÇMİŞTE,
    // o anı saran iki anlık-görüntü ARASINDA doğrusal interpolasyonla çiz. "En son hedefe lerp"
    // yaklaşımı, paketlerin düzensiz gelişini hız dalgalanmasına çevirir (ölçüldü: 7↔11px
    // testere dişi); zamana-parametreli interpolasyon gelişten ve render hızından bağımsız
    // SABİT hız üretir. Bedel: uzak görüntüde ~INTERP_DELAY ek gecikme.
    const INTERP_DELAY = 100, NET_SNAP = 120;   // NET_SNAP üstü fark = ışınlanma → kaydırmadan atla

    function applyHostState() {
        if (opponentLeft) return;   // rakip ayrıldıysa donmuş durumu uygulama — "Ayrıldı" overlay'i korunur
        const newest = latestHostState;
        if (!newest) return;
        // Host bölüm değiştirdiyse guest geometriyi yeniden kur; eski bölümün tamponunu at
        if (typeof newest.lv === 'number' && newest.lv !== currentLevelIdx) {
            currentLevelIdx = newest.lv;
            setupLevelData();
            levelBanner = { show: !!newest.bn, timer: 1.6 };
            snapBuf = snapBuf.length ? [snapBuf[snapBuf.length - 1]] : [];
        }
        if (typeof newest.lives === 'number') lives = newest.lives;
        if (typeof newest.cc === 'number') collectedCoins = newest.cc;

        // Render anını saran A→B anlık-görüntü çiftini bul.
        // Tercihen HOST zaman damgalarıyla: damgalar hostta sabit ~33ms aralıklı üretildiğinden
        // segment süreleri kesindir; varış (RTDB) jitter'ı yalnızca yavaş değişen ofsete yansır.
        // offset = min(varış - hostZamanı) ≈ saat farkı + en-iyi-yol gecikmesi.
        let sA = newest, sB = newest, t = 1, segDt = 33;
        const stamped = snapBuf.length >= 2 && clockOff < Infinity && typeof snapBuf[0].s.t === 'number';
        if (stamped) {
            const rht = performance.now() - clockOff - INTERP_DELAY;   // host zaman çizgisindeki render anı
            for (let i = snapBuf.length - 1; i >= 0; i--) {
                if (snapBuf[i].s.t <= rht) {
                    const nb = snapBuf[i + 1];
                    if (nb) {
                        sA = snapBuf[i].s; sB = nb.s;
                        segDt = Math.max(1, nb.s.t - snapBuf[i].s.t);
                        t = Math.min(1, (rht - snapBuf[i].s.t) / segDt);
                    }
                    break;  // nb yoksa: tampon açlığı → en yeni duruma sabit kal
                }
            }
        } else {
            // Damga yoksa varış zamanına göre (yedek yol)
            const rt = performance.now() - INTERP_DELAY;
            for (let i = snapBuf.length - 1; i >= 0; i--) {
                if (snapBuf[i].rx <= rt) {
                    const nb = snapBuf[i + 1];
                    if (nb) {
                        sA = snapBuf[i].s; sB = nb.s;
                        segDt = Math.max(1, nb.rx - snapBuf[i].rx);
                        t = Math.min(1, (rt - snapBuf[i].rx) / segDt);
                    }
                    break;
                }
            }
        }
        const lerp = (a, b) => a + (b - a) * t;

        const p1 = players[0], p2 = players[1];
        const applyP = (p, a, b) => {
            if (!p || !a || !b) return;
            if (Math.abs(b.x - a.x) > NET_SNAP || Math.abs(b.y - a.y) > NET_SNAP) {
                p.x = b.x; p.y = b.y; p.dx = 0;       // ışınlanma (respawn/teleport)
            } else {
                p.x = lerp(a.x, b.x); p.y = lerp(a.y, b.y);
                p.dx = (b.x - a.x) / segDt * 1000;    // px/s — bacak animasyonu |dx|>20'ye bakar
            }
            p.dir = b.d; p.invuln = b.iv ? 0.5 : 0;
        };
        applyP(p1, sA.p1, sB.p1);
        applyP(p2, sA.p2, sB.p2);

        // Ayrık alanlar (toplandı/öldü/yön) interpolasyon değil — en yeni durumdan
        if (Array.isArray(newest.co)) for (let i = 0; i < newest.co.length; i++) { if (coinList[i]) coinList[i].collected = !!newest.co[i]; }
        if (Array.isArray(newest.en)) for (let i = 0; i < newest.en.length; i++) {
            const e = enemyList[i];
            if (!e) continue;
            const a = sA.en && sA.en[i], b = sB.en && sB.en[i];
            if (a && b && Math.abs(b.x - a.x) <= NET_SNAP) e.x = lerp(a.x, b.x);
            else e.x = newest.en[i].x;
            e.dir = newest.en[i].d; e.dead = !!newest.en[i].k;
        }
        if (Array.isArray(newest.mp)) for (let i = 0; i < newest.mp.length; i++) {
            const m = movingPlatforms[i];
            if (!m) continue;
            const a = sA.mp && sA.mp[i], b = sB.mp && sB.mp[i];
            if (a && b) { m.x = lerp(a.x, b.x); m.y = lerp(a.y, b.y); }
            else { m.x = newest.mp[i].x; m.y = newest.mp[i].y; }
        }
        updateHUD();
        updateCamera();
        // Durum geçişleri (overlay senkronu)
        if (newest.st === 'over' && !gameOverShown) { onlineStatus = 'over'; showOnlineGameOver(); }
        else if (newest.st === 'victory' && !gameOverShown) { onlineStatus = 'victory'; showOnlineVictory(); }
        else if (newest.st === 'play' && gameOverShown) { onlineStatus = 'play'; gameOver = false; removeOnlineOverlay(); }
    }

    function handleOnlineWin() {
        // Yalnızca host buraya ulaşır (guest fixedUpdate çalıştırmaz)
        if (winAdvanceTimer) clearTimeout(winAdvanceTimer);
        winAdvanceTimer = setTimeout(() => {
            winAdvanceTimer = null;
            if (currentLevelIdx < LEVELS.length - 1) {
                currentLevelIdx++;
                lives = maxLives;     // her bölümde ortak can havuzu yenilensin (solo ile paralel)
                startLevel();
            } else {
                onlineStatus = 'victory';
                showOnlineVictory();
            }
        }, 1300);
    }

    function doOnlineRetry() {
        // Host mevcut bölümü sıfırdan başlatır; broadcast st='play' guest overlay'ini kapatır
        removeOnlineOverlay();
        lives = maxLives;
        gameOver = false; gameOverShown = false;
        onlineStatus = 'play';
        startLevel();
    }

    function handleOpponentLeft() {
        if (opponentLeft) return;
        opponentLeft = true;
        gameOver = true;
        removeOnlineOverlay();
        makeOnlineOverlay('👋 Rakip Ayrıldı',
            (net && net.opponentName ? net.opponentName : 'Rakip') + ' oyundan ayrıldı.',
            [{ label: '🏠 Ana Sayfa', primary: true, onClick: leaveOnline }]);
        gameOverShown = true;
    }

    function leaveOnline() {
        const h = document.getElementById('btn-home');
        if (h) h.click();
    }

    function removeOnlineOverlay() {
        if (!container) return;
        const ex = container.querySelector('.zt-modal');
        if (ex) ex.remove();
        gameOverShown = false;
    }

    // Güvenli DOM ile online overlay (innerHTML yok — XSS güvenli; rakip adı textContent ile)
    function makeOnlineOverlay(title, sub, buttons) {
        const overlay = document.createElement('div');
        overlay.className = 'zt-modal zt-gameover';
        const card = document.createElement('div');
        card.className = 'zt-modal-card';
        const t = document.createElement('div'); t.className = 'zt-modal-title'; t.textContent = title;
        const su = document.createElement('div'); su.className = 'zt-modal-sub'; su.textContent = sub;
        const stats = document.createElement('div'); stats.className = 'zt-modal-stats';
        stats.appendChild(document.createTextNode('Bölüm '));
        const b1 = document.createElement('b'); b1.textContent = (currentLevelIdx + 1) + '/12'; stats.appendChild(b1);
        stats.appendChild(document.createTextNode(' · Para '));
        const b2 = document.createElement('b'); b2.textContent = collectedCoins + '/' + totalCoins; stats.appendChild(b2);
        const row = document.createElement('div'); row.className = 'zt-modal-buttons';
        buttons.forEach(b => {
            const btn = document.createElement('button');
            btn.className = 'zt-mbtn ' + (b.primary ? 'zt-mbtn-primary' : 'zt-mbtn-secondary');
            btn.textContent = b.label;
            btn.addEventListener('click', b.onClick);
            row.appendChild(btn);
        });
        card.appendChild(t); card.appendChild(su); card.appendChild(stats); card.appendChild(row);
        overlay.appendChild(card);
        container.appendChild(overlay);
        return overlay;
    }

    function showOnlineGameOver() {
        gameOver = true; gameOverShown = true;
        try { AudioManager.play('error'); } catch (e) {}
        const buttons = [];
        if (netRole === 'host') {
            buttons.push({ label: '🔁 Tekrar Dene', primary: true, onClick: doOnlineRetry });
        } else {
            buttons.push({ label: '🔁 Tekrar İste', primary: true, onClick: () => { if (roomRef) roomRef.child('cmd').set('retry'); } });
        }
        buttons.push({ label: '🏠 Ana Sayfa', primary: false, onClick: leaveOnline });
        makeOnlineOverlay('💥 Oyun Bitti', 'Ortak canlarınız bitti!', buttons);
    }

    function showOnlineVictory() {
        gameOver = true; gameOverShown = true;
        try { AudioManager.play('complete'); } catch (e) {}
        try { Particles.celebrate(); } catch (e) {}
        makeOnlineOverlay('🏆 Tebrikler!', 'Tüm bölümleri birlikte bitirdiniz!',
            [{ label: '🏠 Ana Sayfa', primary: true, onClick: leaveOnline }]);
    }

    return { id, levels, init, destroy, initOnline };
})();

// Online co-op girişi (paylaşılan Lobby üzerinden başlar) — aynı motoru host-otoriteli kullanır
const ZiplaToplaCoop = {
    id: 'zipla-topla-coop',
    isMultiplayer: true,
    init(gameArea, data) { ZiplaTopla.initOnline(gameArea, data || {}); },
    destroy() { ZiplaTopla.destroy(); },
};
