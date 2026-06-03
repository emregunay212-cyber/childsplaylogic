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
                { game: Penalti, color: 'var(--penalti-color)' },
                { game: ZiplaTopla, color: 'var(--zipla-topla-color)' },
                { game: SpaceWaves, color: 'var(--space-waves-color)' },
                { game: Egim, color: 'var(--egim-color)' },
                { game: BuzKulesi, color: 'var(--buz-kulesi-color)' },
                { game: ZindanOkcusu, color: 'var(--zindan-okcusu-color)' },
            ]
        },
    ];

    // Flat registry for backward compatibility
    const gameRegistry = gameCategories.flatMap(cat => cat.games);

    // Multiplayer games list
    const mpGamesList = [
        { id: 'kelime-tahmin', game: KelimeTahmin },
        { id: 'harf-tahmin', game: HarfTahmin },
        { id: 'kod-macerasi', game: KodMacerasiMP },
        { id: 'satranc', game: SatrancMP },
        { id: 'penalti-mp', game: PenaltiMP },
        { id: 'ates-buz', game: AtesBuz },
        { id: 'altin-avi', game: AltinAvi },
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

        // Mobil: ilk dokunuşta audio context kilidini aç (iOS gereği)
        try { MobileUtils.attachGlobalAudioUnlock(); } catch (e) {}

        // Event listener'lar
        setupEventListeners();

        // Splash ekranı
        showSplash();
    }

    function setupEventListeners() {
        // Splash başla butonu
        document.getElementById('splash-start')?.addEventListener('click', () => {
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

        document.getElementById('btn-settings')?.addEventListener('click', () => {
            showParentControls();
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
            { id: 'all', icon: categoryIcons.home, label: 'Tümü' },
            ...gameCategories.map((c, i) => ({ id: 'cat-' + i, icon: c.icon, label: c.title })),
            { id: 'mp', icon: categoryIcons.online, label: 'Online' },
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
            lbl.textContent = c.label;
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

        function createGameCard(game) {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.dataset.game = game.id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', TR.games[game.id]);

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

            card.addEventListener('click', () => { AudioManager.play('tap'); startGame(game); });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); AudioManager.play('tap'); startGame(game); }
            });
            return card;
        }

        function createMPCard(id, game) {
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

                category.games.forEach(({ game }) => {
                    grid.appendChild(createGameCard(game));
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

            mpGamesList.forEach(({ id, game }) => {
                grid.appendChild(createMPCard(id, game));
            });
        }
    }

    function startMultiplayerGame(game) {
        cleanupActiveMpGame();
        currentView = 'game';
        document.getElementById('hub').classList.add('hidden');
        document.getElementById('hub-nav').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        document.getElementById('top-bar').classList.add('hidden');

        const gameArea = document.getElementById('game-area');
        gameArea.innerHTML = '';

        // Altın Avı kendi lobisini yönetir (5-30 kişilik, 1v1 Lobby uygun değil)
        if (game.id === 'altin-avi') {
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

    function startGame(game, level = 1) {
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

    function showParentControls() {
        // Basit matematik PIN
        const a = 2 + Math.floor(Math.random() * 7);
        const b = 2 + Math.floor(Math.random() * 7);
        const answer = prompt(`Ebeveyn kontrolü\n\n${a} + ${b} = ?`);

        if (parseInt(answer) === a + b) {
            const action = prompt(
                'Ebeveyn Ayarları:\n\n' +
                '1 - İlerlemeyi Sıfırla\n' +
                '2 - Kapat\n\n' +
                'Seçiminiz:'
            );

            if (action === '1') {
                if (confirm('Tüm ilerleme silinecek. Emin misiniz?')) {
                    Progress.resetAll();
                    updateStarCounter();
                    if (currentView === 'hub') renderHubGrid();
                    alert('İlerleme sıfırlandı!');
                }
            }
        }
    }

    return { init, updateStarCounter, showHub };
})();

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', App.init);
