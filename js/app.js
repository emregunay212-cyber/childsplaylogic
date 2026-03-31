/* ============================================
   OYUN BAHÇESİ - Ana Uygulama
   ============================================ */

const App = (() => {
    // Oyun kayıt defteri
    const gameRegistry = [
        { game: HafizaKartlari, emoji: '🃏', color: 'var(--hafiza-color)' },
        { game: RenkEslestirme, emoji: '🎨', color: 'var(--renk-color)' },
        { game: SayiSayma, emoji: '🔢', color: 'var(--sayi-color)' },
        { game: HarfTanima, emoji: '🔤', color: 'var(--harf-color)' },
        { game: SekilBulmaca, emoji: '🧩', color: 'var(--sekil-color)' },
        { game: Boyama, emoji: '🖌️', color: 'var(--boyama-color)' },
        { game: Siralama, emoji: '📊', color: 'var(--siralama-color)' },
        { game: KodMacerasi, emoji: '🤖', color: 'var(--kodmacerasi-color)' },
    ];

    let currentView = 'splash';

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
        const app = document.getElementById('app');
        app.classList.remove('hidden');

        document.getElementById('hub').classList.remove('hidden');
        document.getElementById('game-container').classList.add('hidden');
        document.getElementById('top-bar').classList.remove('hidden');

        // Yıldız sayacı güncelle
        updateStarCounter();

        // Hub grid render
        renderHubGrid();
    }

    function renderHubGrid() {
        const grid = document.getElementById('hub-grid');
        grid.innerHTML = '';

        gameRegistry.forEach(({ game, emoji, color }) => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.dataset.game = game.id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', TR.games[game.id]);

            // Oyun yıldızları
            const gameTotalStars = Progress.getGameTotalStars(game.id);
            const maxPossible = (game.levels?.length || 3) * 3;

            // Seviye başına en iyi yıldızları göster
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

            card.addEventListener('click', () => {
                AudioManager.play('tap');
                startGame(game);
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    AudioManager.play('tap');
                    startGame(game);
                }
            });

            grid.appendChild(card);
        });

        // ── Çok Oyunculu Bölüm ──
        const mpHeader = document.createElement('div');
        mpHeader.className = 'mp-section-header';
        mpHeader.innerHTML = `<h3>🌐 ${TR.multiplayerTitle}</h3>`;
        grid.appendChild(mpHeader);

        const mpGames = [
            { id: 'kelime-tahmin', emoji: '🔤', color: 'var(--kelime-color)', game: KelimeTahmin },
            { id: 'harf-tahmin', emoji: '🔡', color: 'var(--harf-tahmin-color)', game: HarfTahmin },
            { id: 'kod-macerasi', emoji: '🤖', color: 'var(--kodmacerasi-color)', game: KodMacerasiMP },
        ];
        mpGames.forEach(({ id, emoji, color, game }) => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.dataset.game = id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', TR.games[id]);
            card.style.borderColor = color;

            card.innerHTML = `
                <div class="mp-badge">2 Oyuncu</div>
                <div class="card-icon"><img src="assets/images/hub/${id}.svg" alt="${TR.games[id]}" draggable="false"></div>
                <div class="card-title">${TR.games[id]}</div>
                <div class="card-stars"><span style="font-size:0.7rem;color:#888">🎮 Online</span></div>
            `;

            card.addEventListener('click', () => {
                AudioManager.play('tap');
                startMultiplayerGame(game);
            });
            grid.appendChild(card);
        });
    }

    function startMultiplayerGame(game) {
        currentView = 'game';
        document.getElementById('hub').classList.add('hidden');
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
