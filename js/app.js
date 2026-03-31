/* ============================================
   OYUN BAHÇESİ - Ana Uygulama
   ============================================ */

const App = (() => {
    // Oyun kategorileri
    const gameCategories = [
        {
            title: '📚 Harfler & Kelimeler',
            color: '#45B7D1',
            games: [
                { game: HarfTanima, color: 'var(--harf-color)' },
                { game: HeceBirlestirme, color: 'var(--hece-color)' },
            ]
        },
        {
            title: '🔢 Sayılar & Matematik',
            color: '#4ECDC4',
            games: [
                { game: SayiSayma, color: 'var(--sayi-color)' },
                { game: Matematik, color: 'var(--matematik-color)' },
                { game: Desen, color: 'var(--desen-color)' },
            ]
        },
        {
            title: '🧩 Bulmaca & Mantık',
            color: '#A55EEA',
            games: [
                { game: HafizaKartlari, color: 'var(--hafiza-color)' },
                { game: SekilBulmaca, color: 'var(--sekil-color)' },
                { game: Siralama, color: 'var(--siralama-color)' },
                { game: Jigsaw, color: 'var(--jigsaw-color)' },
            ]
        },
        {
            title: '🎨 Yaratıcılık',
            color: '#FF78C4',
            games: [
                { game: RenkEslestirme, color: 'var(--renk-color)' },
                { game: Boyama, color: 'var(--boyama-color)' },
                { game: Tuval, color: 'var(--tuval-color)' },
            ]
        },
        {
            title: '🎮 Strateji & Macera',
            color: '#27AE60',
            games: [
                { game: KodMacerasi, color: 'var(--kodmacerasi-color)' },
                { game: LegoMacerasi, color: 'var(--lego-color)' },
                { game: Satranc, color: 'var(--satranc-color)' },
                { game: Penalti, color: 'var(--penalti-color)' },
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
    ];

    let currentView = 'splash';
    let activeCategory = 'all';

    function init() {
        // Parçacık sistemi başlat
        Particles.init();

        // Ayarları yükle
        const settings = Progress.getSettings();
        if (settings.soundEnabled === false) {
            AudioManager.setEnabled(false);
            document.getElementById('btn-sound')?.classList.add('muted');
        }

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
        setTimeout(() => {
            splash.classList.add('hidden');
            splash.style.opacity = '';
            splash.style.transform = '';
        }, 500);
    }

    function showHub() {
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
            { id: 'all', emoji: '🏠', label: 'Tümü' },
            ...gameCategories.map((c, i) => ({ id: 'cat-' + i, emoji: c.title.split(' ')[0], label: c.title.replace(/^[^\s]+\s/, '') })),
            { id: 'mp', emoji: '🌐', label: 'Online' },
        ];

        nav.innerHTML = cats.map(c =>
            `<button class="hub-nav-chip ${c.id === activeCategory ? 'active' : ''}" data-cat="${c.id}">
                <span class="chip-emoji">${c.emoji}</span>
                <span class="chip-label">${c.label}</span>
            </button>`
        ).join('');

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
                <div class="card-stars"><span style="font-size:0.7rem;color:#888">🎮 Online</span></div>
            `;
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
                header.innerHTML = `<h3 style="--cat-color: ${category.color}">${category.title}</h3>`;
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
            mpHeader.innerHTML = `<h3 style="--cat-color: #5B4A8A">🌐 ${TR.multiplayerTitle}</h3>`;
            grid.appendChild(mpHeader);

            mpGamesList.forEach(({ id, game }) => {
                grid.appendChild(createMPCard(id, game));
            });
        }
    }

    function startMultiplayerGame(game) {
        currentView = 'game';
        document.getElementById('hub').classList.add('hidden');
        document.getElementById('hub-nav').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        document.getElementById('top-bar').classList.add('hidden');

        const gameArea = document.getElementById('game-area');
        gameArea.innerHTML = '';

        Lobby.show(game.id, gameArea, {
            onGameStart: (data) => {
                game.init(gameArea, data);
            }
        });
    }

    function startGame(game, level = 1) {
        currentView = 'game';

        document.getElementById('hub').classList.add('hidden');
        document.getElementById('hub-nav').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        document.getElementById('top-bar').classList.add('hidden');

        GameEngine.startGame(game, level);
    }

    function navigateToHub() {
        AudioManager.play('whoosh');
        GameEngine.destroy();
        GameEngine.hideLevelComplete();
        // Cleanup multiplayer if active
        Multiplayer.offAll();
        Multiplayer.disconnect();
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
