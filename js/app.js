/* ============================================
   OYUN BAHÇESİ - Ana Uygulama
   ============================================ */

const App = (() => {
    // Oyun kategorileri
    const categoryIcons = {
        letters: 'assets/images/categories/letters.png',
        numbers: 'assets/images/categories/numbers.png',
        puzzles: 'assets/images/categories/puzzles.png',
        creativity: 'assets/images/categories/creativity.png',
        strategy: 'assets/images/categories/strategy.png',
        home: 'assets/images/categories/home.png',
        online: 'assets/images/categories/online.png',
    };

    const gameCategories = [
        {
            title: 'Harfler & Kelimeler',
            icon: categoryIcons.letters,
            color: '#45B7D1',
            games: [
                { game: HarfTanima, color: 'var(--harf-color)' },
                { game: HeceBirlestirme, color: 'var(--hece-color)' },
            ]
        },
        {
            title: 'Sayılar & Matematik',
            icon: categoryIcons.numbers,
            color: '#4ECDC4',
            games: [
                { game: SayiSayma, color: 'var(--sayi-color)' },
                { game: Matematik, color: 'var(--matematik-color)' },
                { game: Desen, color: 'var(--desen-color)' },
            ]
        },
        {
            title: 'Bulmaca & Mantık',
            icon: categoryIcons.puzzles,
            color: '#A55EEA',
            games: [
                { game: HafizaKartlari, color: 'var(--hafiza-color)' },
                { game: SekilBulmaca, color: 'var(--sekil-color)' },
                { game: Siralama, color: 'var(--siralama-color)' },
                { game: Jigsaw, color: 'var(--jigsaw-color)' },
                { game: Tetris, color: 'var(--tetris-color)' },
            ]
        },
        {
            title: 'Yaratıcılık',
            icon: categoryIcons.creativity,
            color: '#FF78C4',
            games: [
                { game: RenkEslestirme, color: 'var(--renk-color)' },
                { game: Boyama, color: 'var(--boyama-color)' },
                { game: Tuval, color: 'var(--tuval-color)' },
                { game: SayilarlaBoyama, color: 'var(--sayilarla-boyama-color)' },
                { game: EmojiYapici, color: 'var(--emoji-yapici-color)' },
            ]
        },
        {
            title: 'Strateji & Macera',
            icon: categoryIcons.strategy,
            color: '#27AE60',
            games: [
                { game: KodMacerasi, color: 'var(--kodmacerasi-color)' },
                { game: LegoMacerasi, color: 'var(--lego-color)' },
                { game: LegoWorld, color: 'var(--lego-world-color)' },
                { game: Satranc, color: 'var(--satranc-color)' },
                // Kilit eşikleri js/lock-catalog.js'te (LOCK_CATALOG). Buradaki sıra = görünüm sırası.
                { game: ZiplaTopla, color: 'var(--zipla-topla-color)' },
                { game: SpaceWaves, color: 'var(--space-waves-color)' },
                { game: Egim, color: 'var(--egim-color)' },
                { game: BuzKulesi, color: 'var(--buz-kulesi-color)' },
                { game: Penalti, color: 'var(--penalti-color)' },
                { game: ZindanOkcusu, color: 'var(--zindan-okcusu-color)' },
            ]
        },
    ];

    // Flat registry for backward compatibility
    const gameRegistry = gameCategories.flatMap(cat => cat.games);

    // Bir oyun girdisinin görüntü kimliği (tek-oyunculu: game.id, online: entry.id) — TR.games için.
    function entryId(entry) {
        return (entry && entry.id) || (entry && entry.game && entry.game.id);
    }

    // Kilit/override anahtarı: online girdiler 'mp:' önekli (solo/online id çakışmasını önler).
    // js/lock-catalog.js'teki LOCK_CATALOG key'leriyle birebir eşleşir.
    function lockKey(entry) {
        if (!entry) return '';
        return entry.id ? ('mp:' + entry.id) : (entry.game && entry.game.id);
    }

    // Merkezi admin ayarları (Firebase /adminConfig). Cihaz bunu okuyup uygular.
    let adminConfig = {};

    // Oyun kilidi açık mı? Öncelik: admin override > öğretmen izni > yıldız eşiği.
    function isGameUnlocked(gameEntry) {
        if (!gameEntry) return true;
        const key = lockKey(gameEntry);
        const ov = adminConfig.locks && adminConfig.locks[key];
        if (ov === 'unlock') return true;   // admin zorla açtı
        if (ov === 'lock') return false;    // admin zorla kilitledi
        const req = LOCK_STARS_BY_KEY[key];
        if (!req) return true;              // eşik yok → açık
        if (Progress.isTeacherUnlocked(key)) return true;
        return Progress.getTotalStars() >= req;
    }

    // Tek path'li bir SVG ikonu DOM ile güvenli şekilde üretir (innerHTML yok)
    function svgIcon(cls, pathD) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        if (cls) svg.setAttribute('class', cls);
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', pathD);
        svg.appendChild(p);
        return svg;
    }
    const LOCK_PATH = 'M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 0 1 6 0v3H9z';
    const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

    // Bir karta kilitli görünümü uygular: gri + "Kilitli" rozeti + "X / N" ilerleme + tıkta bump.
    // Hem tek-oyunculu (createGameCard) hem online (createMPCard) kartlarda kullanılır.
    function applyLockedState(card, entry, displayId) {
        card.classList.add('locked');
        card.setAttribute('aria-disabled', 'true');
        card.setAttribute('aria-label', TR.games[displayId] + ' (kilitli)');

        const badge = document.createElement('div');
        badge.className = 'lock-badge';
        badge.appendChild(svgIcon('lock-ico', LOCK_PATH));
        const badgeText = document.createElement('span');
        badgeText.textContent = 'Kilitli';
        badge.appendChild(badgeText);
        card.appendChild(badge);

        // Yıldız satırını "X / eşik" ilerleme göstergesiyle değiştir (çocuğu motive eder)
        const have = Progress.getTotalStars();
        const need = LOCK_STARS_BY_KEY[lockKey(entry)];
        const prog = document.createElement('div');
        prog.className = 'card-lock-progress';
        prog.appendChild(svgIcon('lp-star', STAR_PATH));
        const progText = document.createElement('span');
        progText.textContent = Math.min(have, need) + ' / ' + need;
        prog.appendChild(progText);
        const starsRow = card.querySelector('.card-stars');
        if (starsRow) starsRow.replaceWith(prog); else card.appendChild(prog);

        const onTap = () => {
            try { AudioManager.play('tap'); } catch (e) {}
            card.classList.remove('cs-bump'); void card.offsetWidth; card.classList.add('cs-bump');
            showLockInfo(entry);
        };
        card.addEventListener('click', onTap);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); }
        });
    }

    // ── Kilitli oyun bilgi penceresi: neden kilitli + nasıl açılır ──
    let lockModalEl = null;
    function ensureLockModal() {
        if (lockModalEl) return lockModalEl;
        const ov = document.createElement('div');
        ov.className = 'lock-modal hidden';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');

        const card = document.createElement('div');
        card.className = 'lock-modal-card';

        const iconWrap = document.createElement('div');
        iconWrap.className = 'lm-icon';
        iconWrap.appendChild(svgIcon('lm-lock', LOCK_PATH));

        const title = document.createElement('h2');
        title.className = 'lm-title';
        title.textContent = 'Bu Oyun Kilitli';

        const msg = document.createElement('p');
        msg.className = 'lm-msg';

        const bar = document.createElement('div');
        bar.className = 'lm-bar';
        const fill = document.createElement('div');
        fill.className = 'lm-bar-fill';
        bar.appendChild(fill);

        const barLabel = document.createElement('div');
        barLabel.className = 'lm-bar-label';

        const hint = document.createElement('p');
        hint.className = 'lm-hint';

        const btn = document.createElement('button');
        btn.className = 'lm-btn';
        btn.type = 'button';
        btn.textContent = 'Tamam';
        btn.addEventListener('click', hideLockInfo);

        card.appendChild(iconWrap);
        card.appendChild(title);
        card.appendChild(msg);
        card.appendChild(bar);
        card.appendChild(barLabel);
        card.appendChild(hint);
        card.appendChild(btn);
        ov.appendChild(card);
        ov.addEventListener('click', (e) => { if (e.target === ov) hideLockInfo(); });
        document.body.appendChild(ov);

        ov._msg = msg; ov._bar = bar; ov._fill = fill; ov._barLabel = barLabel; ov._hint = hint;
        lockModalEl = ov;
        return ov;
    }
    function hideLockInfo() { if (lockModalEl) lockModalEl.classList.add('hidden'); }
    function showLockInfo(entry) {
        const key = lockKey(entry);
        const need = LOCK_STARS_BY_KEY[key];
        const forced = adminConfig.locks && adminConfig.locks[key] === 'lock';
        const ov = ensureLockModal();
        if (forced || !need) {
            // Admin zorla kapatmış (veya eşik yok) → yıldız nudge'ı anlamsız
            ov._msg.textContent = 'Bu oyun şimdilik kapalı.';
            ov._bar.classList.add('hidden');
            ov._barLabel.classList.add('hidden');
            ov._hint.textContent = 'Daha sonra tekrar dene.';
        } else {
            const have = Progress.getTotalStars();
            const remaining = Math.max(0, need - have);
            ov._msg.textContent = remaining > 0
                ? ('Bu oyunu açmak için ' + need + ' yıldıza ulaşman gerekiyor. Şu an ' + have + ' yıldızın var — ' + remaining + ' tane daha topla!')
                : ('Bu oyunu açmak için ' + need + ' yıldız gerekiyor.');
            const pct = Math.max(0, Math.min(100, Math.round((have / need) * 100)));
            ov._fill.style.width = pct + '%';
            ov._barLabel.textContent = Math.min(have, need) + ' / ' + need + ' yıldız';
            ov._bar.classList.remove('hidden');
            ov._barLabel.classList.remove('hidden');
            ov._hint.textContent = 'İpucu: Diğer (açık) oyunları oynayarak yıldız topla!';
        }
        ov.classList.remove('hidden');
    }

    // Multiplayer games list
    // Online oyunların kilit eşikleri js/lock-catalog.js'te (LOCK_CATALOG, 'mp:' önekli key).
    const mpGamesList = [
        { id: 'kelime-tahmin', game: KelimeTahmin },
        { id: 'harf-tahmin', game: HarfTahmin },
        { id: 'kod-macerasi', game: KodMacerasiMP },
        { id: 'satranc', game: SatrancMP },
        { id: 'penalti-mp', game: PenaltiMP },
        { id: 'ates-buz', game: AtesBuz },
        { id: 'altin-avi', game: AltinAvi },
        { id: 'kelimelik', game: Kelimelik },
    ];

    let currentView = 'splash';
    let activeCategory = 'all';
    // GameEngine/Multiplayer dışında, kendi Firebase dinleyicisiyle çalışan
    // multiplayer oyun (örn. Altın Avı). Geçişlerde destroy edilmeli.
    let activeMpGame = null;

    function init() {
        // Parçacık sistemi başlat
        Particles.init();

        // Ayarları yükle
        const settings = Progress.getSettings();
        if (settings.soundEnabled === false) {
            AudioManager.setEnabled(false);
            document.getElementById('btn-sound')?.classList.add('muted');
        }

        // Merkezi admin ayarlarını dinlemeye başla (Firebase /adminConfig)
        subscribeAdminConfig();

        // Mobil: ilk dokunuşta audio context kilidini aç (iOS gereği)
        try { MobileUtils.attachGlobalAudioUnlock(); } catch (e) {}

        // Event listener'lar
        setupEventListeners();

        // Giriş kapısı: Google/Misafir oturumu çözülünce app devam eder (proceedAfterAuth).
        // Deep-link & splash artık oturum belirlendikten SONRA işlenir.
        Auth.init(proceedAfterAuth);
    }

    // Auth oturumu hazır (Google yüklendi / misafir seçildi) → app'e gir
    let authEntered = false;
    function proceedAfterAuth() {
        updateStarCounter();
        try { hideSplash(); } catch (e) {}
        if (authEntered) { showHub(); return; }   // çıkış sonrası yeniden giriş → hub
        authEntered = true;
        if (!tryDeepLink()) showHub();
    }

    function tryDeepLink() {
        let slug;
        try { slug = new URLSearchParams(location.search).get('oyun'); } catch (e) { return false; }
        if (!slug) return false;
        const sp = gameRegistry.find(e => e.game && e.game.id === slug);
        const mp = mpGamesList.find(e => e.id === slug);
        if (!sp && !mp) return false;            // bilinmeyen slug → normal splash akışı
        try { AudioManager.init(); } catch (e) {}
        try { hideSplash(); } catch (e) {}
        showHub();
        // Landing/deep-link (?oyun=) ile gelen ziyaretçi kilidi ATLAR (SEO → doğrudan oyna).
        // Uygulama içi kart tıklamaları kilide tabi kalır (guard yalnız bypassLock=true ile atlanır).
        if (sp) startGame(sp.game, 1, true);
        else if (mp) startMultiplayerGame(mp.game, true);
        return true;
    }

    function setupEventListeners() {
        // Splash başla butonu
        document.getElementById('splash-start')?.addEventListener('click', () => {
            // Oturum henüz çözülmediyse (giriş gerekiyorsa) splash'i atlatma — Auth karar verir
            if (typeof Auth !== 'undefined' && !Auth.getMode()) return;
            AudioManager.init();
            AudioManager.play('whoosh');
            hideSplash();
            showHub();
        });

        // Üst bar butonları
        document.getElementById('btn-home')?.addEventListener('click', () => {
            navigateToHub();
        });

        document.getElementById('btn-sound')?.addEventListener('click', (e) => {
            const enabled = AudioManager.toggle();
            e.currentTarget.classList.toggle('muted', !enabled);
            Progress.saveSetting('soundEnabled', enabled);
            if (enabled) AudioManager.play('tap');
        });

        // Oyun toolbar
        document.getElementById('game-home')?.addEventListener('click', () => {
            navigateToHub();
        });

        // Seviye tamamlama butonları
        document.getElementById('btn-replay')?.addEventListener('click', () => {
            GameEngine.replay();
        });

        document.getElementById('btn-next')?.addEventListener('click', () => {
            GameEngine.nextLevel();
        });

        document.getElementById('btn-hub')?.addEventListener('click', () => {
            GameEngine.hideLevelComplete();
            navigateToHub();
        });

        // Tam ekran butonu
        document.getElementById('game-fullscreen')?.addEventListener('click', toggleFullscreen);
        document.addEventListener('fullscreenchange', updateFullscreenUI);
        document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
    }

    function toggleFullscreen() {
        const el = document.getElementById('game-container');
        if (!el) return;
        const goingFs = !el.classList.contains('is-fullscreen');
        // Oyunu ekranı kaplayacak şekilde büyüt — her zaman çalışır (CSS).
        el.classList.toggle('is-fullscreen', goingFs);
        try { AudioManager.play('tap'); } catch (e) {}
        // CSS boyutu değişti — canvas oyunlarının iç çözünürlüğünü yeniden
        // hesaplaması için (layout sonrası) resize olayını tetikle. Aksi halde
        // canvas büyür ama düşük çözünürlükte kalıp bulanıklaşır.
        requestAnimationFrame(() => { try { window.dispatchEvent(new Event('resize')); } catch (e) {} });
        // Tarayıcının gerçek tam ekranını da dene (destekliyorsa); başarısızsa
        // CSS büyütme modu yine de geçerli kalır.
        try {
            if (goingFs) {
                const req = el.requestFullscreen || el.webkitRequestFullscreen;
                if (req) { const p = req.call(el); if (p && p.catch) p.catch(() => {}); }
            } else if (document.fullscreenElement || document.webkitFullscreenElement) {
                const exit = document.exitFullscreen || document.webkitExitFullscreen;
                if (exit) exit.call(document);
            }
        } catch (e) {}
    }

    function updateFullscreenUI() {
        // Tarayıcı tam ekranından (ESC vb.) çıkıldıysa CSS büyütme modunu da kapat
        const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (!fs) document.getElementById('game-container')?.classList.remove('is-fullscreen');
    }

    function showSplash() {
        document.getElementById('splash-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
    }

    function hideSplash() {
        const splash = document.getElementById('splash-screen');
        splash.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        splash.style.opacity = '0';
        splash.style.transform = 'scale(1.05)';
        const seoBlock = document.getElementById('seo-content');
        if (seoBlock) seoBlock.style.display = 'none';
        setTimeout(() => {
            splash.classList.add('hidden');
            splash.style.opacity = '';
            splash.style.transform = '';
        }, 500);
    }

    function showHub() {
        cleanupActiveMpGame();
        currentView = 'hub';
        activeCategory = 'all';
        const app = document.getElementById('app');
        app.classList.remove('hidden');

        document.getElementById('hub').classList.remove('hidden');
        document.getElementById('hub-nav').classList.remove('hidden');
        document.getElementById('game-container').classList.add('hidden');
        document.getElementById('top-bar').classList.remove('hidden');

        updateStarCounter();
        renderCategoryNav();
        renderPopularGames();
        renderHubGrid();
    }

    function renderCategoryNav() {
        const nav = document.getElementById('hub-nav-scroll');
        const cats = [
            { id: 'all', icon: categoryIcons.home, label: 'Tümü', short: 'Tümü' },
            ...gameCategories.map((c, i) => ({ id: 'cat-' + i, icon: c.icon, label: c.title, short: c.title.split(' & ')[0] })),
            { id: 'mp', icon: categoryIcons.online, label: 'Online', short: 'Online' },
        ];

        nav.innerHTML = '';
        cats.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'hub-nav-chip' + (c.id === activeCategory ? ' active' : '');
            btn.dataset.cat = c.id;
            const img = document.createElement('img');
            img.className = 'chip-icon';
            img.src = c.icon;
            img.alt = c.label;
            img.draggable = false;
            btn.appendChild(img);
            const lbl = document.createElement('span');
            lbl.className = 'chip-label';
            const lblFull = document.createElement('span');
            lblFull.className = 'chip-lbl-full';
            lblFull.textContent = c.label;
            const lblShort = document.createElement('span');
            lblShort.className = 'chip-lbl-short';
            lblShort.textContent = c.short || c.label;
            lbl.appendChild(lblFull);
            lbl.appendChild(lblShort);
            btn.appendChild(lbl);
            nav.appendChild(btn);
        });

        nav.querySelectorAll('.hub-nav-chip').forEach(chip => {
            chip.onclick = () => {
                activeCategory = chip.dataset.cat;
                AudioManager.play('tap');
                // Update active
                nav.querySelectorAll('.hub-nav-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                renderHubGrid();
                // Show/hide popular section
                const pop = document.getElementById('hub-popular');
                if (pop) pop.style.display = activeCategory === 'all' ? '' : 'none';
            };
        });
    }

    function getPopularGames() {
        // Get all games with their star counts, pick top 5
        const allGames = gameRegistry.map(({ game }) => ({
            game,
            stars: Progress.getGameTotalStars(game.id),
            maxStars: (game.levels?.length || 3) * 3,
        }));
        // Sort by stars desc, then by maxStars for tiebreaker
        allGames.sort((a, b) => b.stars - a.stars || b.maxStars - a.maxStars);
        return allGames.slice(0, 5);
    }

    function renderPopularGames() {
        const container = document.getElementById('hub-popular');
        if (!container) return;
        const popular = getPopularGames();

        // If no one has played yet, show a welcome instead
        const hasPlayed = popular.some(p => p.stars > 0);

        if (!hasPlayed) {
            container.innerHTML = `
                <div class="popular-section">
                    <div class="popular-header"><span>🌟</span> Hadi Başlayalım!</div>
                    <p class="popular-empty">Aşağıdan bir oyun seçerek maceraya başla!</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="popular-section">
                <div class="popular-header"><span>🔥</span> En Çok Oynanan</div>
                <div class="popular-scroll">
                    ${popular.filter(p => p.stars > 0).map(({ game, stars, maxStars }) => `
                        <div class="popular-card" data-game="${game.id}" role="button" tabindex="0">
                            <div class="popular-icon"><img src="assets/images/hub/${game.id}.svg" alt="${TR.games[game.id]}" draggable="false"></div>
                            <div class="popular-info">
                                <div class="popular-name">${TR.games[game.id]}</div>
                                <div class="popular-stars">⭐ ${stars}/${maxStars}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;

        container.querySelectorAll('.popular-card').forEach(card => {
            const gameId = card.dataset.game;
            const entry = gameRegistry.find(g => g.game.id === gameId);
            if (entry) {
                card.onclick = () => { AudioManager.play('tap'); startGame(entry.game); };
            }
        });
    }

    function renderHubGrid() {
        const grid = document.getElementById('hub-grid');
        grid.innerHTML = '';
        let cardIndex = 0;

        function createGameCard(gameEntry) {
            const { game, comingSoon } = gameEntry;
            const card = document.createElement('div');
            card.className = 'game-card';
            card.dataset.game = game.id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', TR.games[game.id] + (comingSoon ? ' (yakında)' : ''));

            let starsHTML = '';
            for (let i = 1; i <= (game.levels?.length || 3); i++) {
                const s = Progress.getLevelStars(game.id, i);
                const cls = s > 0 ? 'earned' : 'empty';
                starsHTML += `<svg class="${cls}" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
            }

            card.innerHTML = `
                <div class="card-icon"><img src="assets/images/hub/${game.id}.svg" alt="${TR.games[game.id]}" draggable="false"></div>
                <div class="card-title">${TR.games[game.id]}</div>
                <div class="card-stars">${starsHTML}</div>
            `;

            card.style.animationDelay = `${cardIndex * 0.06}s`;
            cardIndex++;

            if (comingSoon) {
                // Henüz aktif değil: kart "Yakında" rozetiyle görünür ama oynanamaz.
                card.classList.add('coming-soon');
                card.setAttribute('aria-disabled', 'true');

                const badge = document.createElement('div');
                badge.className = 'coming-soon-badge';
                badge.textContent = 'Yakında';
                card.appendChild(badge);

                // Yıldız satırını "Çok yakında!" etiketiyle değiştir.
                const stars = card.querySelector('.card-stars');
                const label = document.createElement('div');
                label.className = 'card-soon-label';
                label.textContent = 'Çok yakında!';
                if (stars) stars.replaceWith(label); else card.appendChild(label);

                const bump = () => {
                    try { AudioManager.play('tap'); } catch (e) {}
                    card.classList.remove('cs-bump'); void card.offsetWidth; card.classList.add('cs-bump');
                };
                card.addEventListener('click', bump);
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(); }
                });
                return card;
            }

            // Kilitli oyun: yıldız eşiği dolmamış ve öğretmen izni yok → gri kart, "Kilitli" rozeti, ilerleme
            if (!isGameUnlocked(gameEntry)) {
                applyLockedState(card, gameEntry, game.id);
                return card;
            }

            card.addEventListener('click', () => { AudioManager.play('tap'); startGame(game); });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); AudioManager.play('tap'); startGame(game); }
            });
            return card;
        }

        function createMPCard(entry) {
            const { id, game } = entry;
            const card = document.createElement('div');
            card.className = 'game-card';
            card.dataset.game = id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', TR.games[id]);
            card.innerHTML = `
                <div class="mp-badge">2 Oyuncu</div>
                <div class="card-icon"><img src="assets/images/hub/${id}.svg" alt="${TR.games[id]}" draggable="false"></div>
                <div class="card-title">${TR.games[id]}</div>
                <div class="card-stars"><span style="font-size:0.7rem;color:#888">Online</span></div>
            `;
            card.style.animationDelay = `${cardIndex * 0.06}s`;
            cardIndex++;

            // Kilitli online oyun: gri kart + "Kilitli" rozeti + ilerleme (mp-badge CSS ile gizlenir)
            if (!isGameUnlocked(entry)) {
                applyLockedState(card, entry, id);
                return card;
            }

            card.addEventListener('click', () => { AudioManager.play('tap'); startMultiplayerGame(game); });
            return card;
        }

        const showAll = activeCategory === 'all';
        const showMP = activeCategory === 'mp';
        const catIdx = activeCategory.startsWith('cat-') ? parseInt(activeCategory.split('-')[1]) : -1;

        // ── Kategorili Tek Oyunculu Oyunlar ──
        if (!showMP) {
            gameCategories.forEach((category, idx) => {
                if (!showAll && catIdx !== idx) return;

                const header = document.createElement('div');
                header.className = 'hub-category-header';
                const h3 = document.createElement('h3');
                h3.style.setProperty('--cat-color', category.color);
                const catImg = document.createElement('img');
                catImg.src = category.icon;
                catImg.alt = category.title;
                catImg.className = 'cat-header-icon';
                catImg.draggable = false;
                h3.appendChild(catImg);
                h3.appendChild(document.createTextNode(' ' + category.title));
                header.appendChild(h3);
                grid.appendChild(header);

                category.games.forEach((entry) => {
                    grid.appendChild(createGameCard(entry));
                });
            });
        }

        // ── Çok Oyunculu Bölüm ──
        if (showAll || showMP) {
            const mpHeader = document.createElement('div');
            mpHeader.className = 'hub-category-header mp-section-header';
            const mpH3 = document.createElement('h3');
            mpH3.style.setProperty('--cat-color', '#5B4A8A');
            const mpImg = document.createElement('img');
            mpImg.src = categoryIcons.online;
            mpImg.alt = 'Online';
            mpImg.className = 'cat-header-icon';
            mpImg.draggable = false;
            mpH3.appendChild(mpImg);
            mpH3.appendChild(document.createTextNode(' ' + TR.multiplayerTitle));
            mpHeader.appendChild(mpH3);
            grid.appendChild(mpHeader);

            mpGamesList.forEach((entry) => {
                grid.appendChild(createMPCard(entry));
            });
        }
    }

    function startMultiplayerGame(game, bypassLock = false) {
        // Kilitli online oyun guard'ı (bypassLock=true: landing/deep-link ziyaretçisi atlar)
        const entry = mpGamesList.find(e => e.game === game);
        if (entry && !bypassLock && !isGameUnlocked(entry)) { try { AudioManager.play('tap'); } catch (e) {} return; }
        cleanupActiveMpGame();
        currentView = 'game';
        document.getElementById('hub').classList.add('hidden');
        document.getElementById('hub-nav').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        document.getElementById('top-bar').classList.add('hidden');

        const gameArea = document.getElementById('game-area');
        gameArea.innerHTML = '';

        // Altın Avı ve Kelimelik kendi lobilerini/odalarını yönetir (paylaşılan Lobby kullanmaz)
        if (game.id === 'altin-avi' || game.id === 'kelimelik') {
            activeMpGame = game;
            game.init(gameArea, {});
            return;
        }

        Lobby.show(game.id, gameArea, {
            onGameStart: (data) => {
                activeMpGame = game;
                game.init(gameArea, data);
            }
        });
    }

    function startGame(game, level = 1, bypassLock = false) {
        // Kilitli oyun guard'ı — kartı bypass eden tüm yollar için tek koruma noktası.
        // bypassLock=true: landing/deep-link ile gelen ziyaretçi kilidi atlar.
        const entry = gameRegistry.find(e => e.game.id === game.id);
        if (entry && !bypassLock && !isGameUnlocked(entry)) {
            try { AudioManager.play('tap'); } catch (e) {}
            return;
        }
        cleanupActiveMpGame();
        currentView = 'game';

        document.getElementById('hub').classList.add('hidden');
        document.getElementById('hub-nav').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        document.getElementById('top-bar').classList.add('hidden');

        try { MobileUtils.lockBodyScroll(); } catch (e) {}
        // CSS targeting için aktif oyun kimliği — portrait mobile auto-rotation
        if (game && game.id) document.body.dataset.activeGame = game.id;

        GameEngine.startGame(game, level);
    }

    function cleanupActiveMpGame() {
        if (activeMpGame && typeof activeMpGame.destroy === 'function') {
            try { activeMpGame.destroy(); } catch (e) {}
        }
        activeMpGame = null;
    }

    function navigateToHub() {
        // Oyun-içi kayıtları (Zindan vb.) çıkışta buluta yansıt (Google kullanıcısı)
        try { if (typeof Auth !== 'undefined' && Auth.flushGameSaves) Auth.flushGameSaves(); } catch (e) {}
        AudioManager.play('whoosh');
        // Tam ekrandan çık (oyundan ayrılırken)
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (exit) { try { exit.call(document); } catch (e) {} }
        }
        GameEngine.destroy();
        GameEngine.hideLevelComplete();
        // Cleanup multiplayer if active
        Multiplayer.offAll();
        Multiplayer.disconnect();
        try { MobileUtils.unlockBodyScroll(); } catch (e) {}
        delete document.body.dataset.activeGame;
        showHub();
    }

    function updateStarCounter() {
        const total = Progress.getTotalStars();
        const counter = document.getElementById('total-stars');
        if (counter) counter.textContent = total;
    }

    // Firebase /adminConfig'i dinle — merkezi admin ayarları (kilitler/sıfırlama/ses)
    function subscribeAdminConfig() {
        try {
            if (typeof db === 'undefined' || !db) return;
            db.ref('adminConfig').on('value', (snap) => {
                adminConfig = snap.val() || {};
                applyAdminConfig();
            }, () => { /* okuma reddedildi/çevrimdışı → adminConfig boş kalır, yerel mantık sürer */ });
        } catch (e) { /* Firebase yoksa yerel mantıkla devam */ }
    }

    // Merkezi ayarları cihaza uygula: global sıfırlama sinyali, ses, kilit yeniden render
    function applyAdminConfig() {
        // Global sıfırlama: token yerelde görülenden büyükse ilerlemeyi bir kez sıfırla
        const tok = adminConfig.resetToken;
        if (tok) {
            let seen = 0;
            try { seen = parseInt(localStorage.getItem('oyun_bahcesi_lastResetToken') || '0', 10); } catch (e) {}
            if (tok > seen) {
                Progress.resetAll();
                try { localStorage.setItem('oyun_bahcesi_lastResetToken', String(tok)); } catch (e) {}
            }
        }
        // Ses zorlaması (admin 'on'/'off' dayatabilir; yoksa cihazın kendi ayarı)
        if (adminConfig.sound === 'off') { AudioManager.setEnabled(false); document.getElementById('btn-sound')?.classList.add('muted'); }
        else if (adminConfig.sound === 'on') { AudioManager.setEnabled(true); document.getElementById('btn-sound')?.classList.remove('muted'); }
        updateStarCounter();
        if (currentView === 'hub') renderHubGrid();
    }

    return { init, updateStarCounter, showHub };
})();

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', App.init);
