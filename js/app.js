/* ============================================
   OYUN BAHÇESİ - Ana Uygulama
   ============================================ */

const App = (() => {
    // Hub kart giriş animasyonu kademesi (renderHubGrid)
    const STAGGER_MAX_CARDS = 12;
    const STAGGER_STEP_MS = 40;
    // Yönetici oyunu oyun ortasında kilitlerse: uyarı → bu kadar sonra hub'a dön
    const LOCK_KICK_DELAY_MS = 5000;

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

    // Kayıt defteri: oyun modülleri TEMBEL referansla ({ game: () => HarfTanima }) tutulur ve
    // aşağıda resolveEntries() ile tek tek çözülür. Bir oyun dosyası yüklenemez, parse edilemez
    // ya da IIFE'si fırlatırsa yalnız o kart düşer (console.warn), hub ölmez.
    // Neden window['HarfTanima'] değil: modüller top-level const → window'a bağlanmaz;
    // eval/Function ile ad çözmek ise ileride (A1/A9) CSP'yi kırar.
    const gameCategoryDefs = [
        {
            title: 'Harfler & Kelimeler',
            icon: categoryIcons.letters,
            color: '#45B7D1',
            games: [
                { game: () => HarfTanima, color: 'var(--harf-color)' },
                { game: () => HeceBirlestirme, color: 'var(--hece-color)' },
                // Eğitsel seri (Faz 0+): kilitsiz — İngilizce kelime öğretimi.
                // Şimdilik kapalı (kullanıcı isteği, 2026-06-16) — yeniden açmak için "comingSoon: true"yu kaldır.
                { game: () => KelimeMadeni3D, color: 'var(--kelime-madeni-color)', comingSoon: true },
                { game: () => KelimeBalonu, color: 'var(--kelime-balonu-color)' },
                { game: () => KelimeCanavarlari, color: 'var(--kelime-canavar-color)' },
                { game: () => KelimeKurtarma, color: 'var(--kelime-kurtarma-color)' },
                { game: () => GunlukKelime, color: 'var(--gunluk-kelime-color)' },
            ]
        },
        {
            title: 'Sayılar & Matematik',
            icon: categoryIcons.numbers,
            color: '#4ECDC4',
            games: [
                { game: () => SayiSayma, color: 'var(--sayi-color)' },
                { game: () => Matematik, color: 'var(--matematik-color)' },
                { game: () => Desen, color: 'var(--desen-color)' },
                // Eğitsel seri Faz 1 (4.1, 4.2): kilitsiz — işlem akıcılığı.
                { game: () => BilgiMadencisi, color: 'var(--bilgi-madencisi-color)' },
                { game: () => MatematikPatlatma, color: 'var(--matematik-patlatma-color)' },
                { game: () => MatematikKafe, color: 'var(--matematik-kafe-color)' },
                { game: () => BilgiYilani, color: 'var(--bilgi-yilani-color)' },
                { game: () => RitimSorulari, color: 'var(--ritim-color)' },
                { game: () => Kesir2048, color: 'var(--kesir-color)' },
                { game: () => SayiNinja, color: 'var(--sayi-ninja-color)' },
            ]
        },
        {
            title: 'Bulmaca & Mantık',
            icon: categoryIcons.puzzles,
            color: '#A55EEA',
            games: [
                { game: () => HafizaKartlari, color: 'var(--hafiza-color)' },
                { game: () => SekilBulmaca, color: 'var(--sekil-color)' },
                { game: () => Siralama, color: 'var(--siralama-color)' },
                { game: () => Jigsaw, color: 'var(--jigsaw-color)' },
                { game: () => Tetris, color: 'var(--tetris-color)' },
                // Eğitsel seri (Faz 3): kilitsiz — fen gözlem/dikkat.
                { game: () => BilimDedektifi, color: 'var(--bilim-dedektifi-color)' },
                { game: () => EslestirmeUstasi, color: 'var(--eslestirme-color)' },
                { game: () => LabirentAvcisi, color: 'var(--labirent-color)' },
            ]
        },
        {
            title: 'Yaratıcılık',
            icon: categoryIcons.creativity,
            color: '#FF78C4',
            games: [
                { game: () => RenkEslestirme, color: 'var(--renk-color)' },
                { game: () => Boyama, color: 'var(--boyama-color)' },
                { game: () => Tuval, color: 'var(--tuval-color)' },
                { game: () => SayilarlaBoyama, color: 'var(--sayilarla-boyama-color)' },
                { game: () => EmojiYapici, color: 'var(--emoji-yapici-color)' },
            ]
        },
        {
            title: 'Strateji & Macera',
            icon: categoryIcons.strategy,
            color: '#27AE60',
            games: [
                { game: () => KodMacerasi, color: 'var(--kodmacerasi-color)' },
                { game: () => LegoMacerasi, color: 'var(--lego-color)' },
                { game: () => LegoWorld, color: 'var(--lego-world-color)' },
                { game: () => Satranc, color: 'var(--satranc-color)' },
                // Kilit eşikleri js/lock-catalog.js'te (LOCK_CATALOG). Buradaki sıra = görünüm sırası.
                { game: () => ZiplaTopla, color: 'var(--zipla-topla-color)' },
                { game: () => SpaceWaves, color: 'var(--space-waves-color)' },
                { game: () => Egim, color: 'var(--egim-color)' },
                { game: () => BuzKulesi, color: 'var(--buz-kulesi-color)' },
                { game: () => Penalti, color: 'var(--penalti-color)' },
                { game: () => ZindanOkcusu, color: 'var(--zindan-okcusu-color)' },
                // Eğitsel seri (Faz 0+): kilitsiz — eğitsel içeriğe engelsiz erişim.
                { game: () => BilVeFethet, color: 'var(--bil-ve-fethet-color)' },
                { game: () => BilgiTakimi, color: 'var(--bilgi-takimi-color)' },
                { game: () => BilgiCiftligi, color: 'var(--bilgi-ciftligi-color)' },
                { game: () => BilgiKulesi, color: 'var(--bilgi-kulesi-color)' },
                { game: () => CevapKosusu, color: 'var(--cevap-kosusu-color)' },
                { game: () => BilgiSavunmasi, color: 'var(--savunma-color)' },
                { game: () => FizikFirlatma, color: 'var(--firlatma-color)' },
            ]
        },
    ];

    // Tembel referansın adı (uyarı metni için): "() => Tetris" → "Tetris"
    function thunkName(fn) {
        const m = /=>\s*([\w$]+)/.exec(String(fn));
        return m ? m[1] : String(fn);
    }

    // Girdiyi çöz: { game: () => Mod, ...rest } → { game: Mod, ...rest }; modül yoksa null
    function resolveEntry(entry) {
        let game = null;
        try { game = entry.game(); } catch (e) { game = null; }   // ReferenceError/TDZ = dosya yüklenmedi ya da fırlattı
        if (!game || typeof game !== 'object' || !game.id) {
            console.warn('Oyun modülü eksik: ' + thunkName(entry.game) + ' — kartı atlanıyor (dosya yüklenemedi ya da hata verdi).');
            return null;
        }
        return Object.assign({}, entry, { game });
    }
    function resolveEntries(entries) { return entries.map(resolveEntry).filter(Boolean); }

    // Kategori şekli korunur ({ title, icon, color, games:[{ game, color, comingSoon }] })
    const gameCategories = gameCategoryDefs.map(cat => Object.assign({}, cat, { games: resolveEntries(cat.games) }));

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

    // Tık + klavye (Enter/Boşluk) etkinleştirme — role="button" div kartlar ve çipler için.
    // Tek tanım js/mobile-utils.js'te (bilnet-meta.js de aynı yardımcıyı kullanır).
    function bindActivate(el, fn) { MobileUtils.bindActivate(el, fn); }

    // Kart ikonu yüklenemezse (ör. eksik SVG) kırık resim yerine kategori ikonuna düş
    function withIconFallback(card, fallbackSrc) {
        const img = card.querySelector('.card-icon img, .popular-icon img');
        if (!img) return;
        img.onerror = () => { img.onerror = null; img.src = fallbackSrc; };
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
    function applyLockedState(card, entry) {
        card.classList.add('locked');
        card.setAttribute('aria-disabled', 'true');
        // Erişilebilir ad görünen metinden gelir: "Kilitli <ad> X / N" (ayrı aria-label çelişirdi)
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
        bindActivate(card, onTap);
    }

    // ── Kilitli oyun bilgi penceresi: neden kilitli + nasıl açılır ──
    // Erişilebilirlik: açılınca odak "Tamam"a gider, Escape kapatır, kapanınca odak karta döner;
    // tek düğmeli diyalog → Tab odağı düğmede tutar (odak arkadaki sayfaya kaçmaz).
    let lockModalEl = null;
    let lockModalReturnFocus = null;
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
        title.id = 'lm-title';
        title.textContent = 'Bu Oyun Kilitli';
        ov.setAttribute('aria-labelledby', 'lm-title');

        const msg = document.createElement('p');
        msg.className = 'lm-msg';
        msg.id = 'lm-msg';
        ov.setAttribute('aria-describedby', 'lm-msg');

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
        ov.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { e.preventDefault(); hideLockInfo(); }
            else if (e.key === 'Tab') { e.preventDefault(); btn.focus(); }
        });
        document.body.appendChild(ov);

        ov._msg = msg; ov._bar = bar; ov._fill = fill; ov._barLabel = barLabel; ov._hint = hint; ov._btn = btn;
        lockModalEl = ov;
        return ov;
    }
    function hideLockInfo() {
        if (!lockModalEl || lockModalEl.classList.contains('hidden')) return;
        lockModalEl.classList.add('hidden');
        const back = lockModalReturnFocus;
        lockModalReturnFocus = null;
        if (back && back.isConnected) { try { back.focus(); } catch (e) {} }
    }
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
        lockModalReturnFocus = document.activeElement;
        ov.classList.remove('hidden');
        try { ov._btn.focus(); } catch (e) {}
    }

    // Multiplayer games list
    // Online oyunların kilit eşikleri js/lock-catalog.js'te (LOCK_CATALOG, 'mp:' önekli key).
    const mpGameDefs = [
        { id: 'kelime-tahmin', game: () => KelimeTahmin },
        { id: 'harf-tahmin', game: () => HarfTahmin },
        { id: 'kod-macerasi', game: () => KodMacerasiMP },
        { id: 'satranc', game: () => SatrancMP },
        { id: 'penalti-mp', game: () => PenaltiMP },
        { id: 'ates-buz', game: () => AtesBuz },
        { id: 'zipla-topla-coop', game: () => ZiplaToplaCoop },
        { id: 'hava-hokeyi', game: () => HavaHokeyi },
        { id: 'altin-avi', game: () => AltinAvi },
        { id: 'kelimelik', game: () => Kelimelik },
        { id: 'son-kart', game: () => SonKart, badge: '2-4 Oyuncu' },
    ];
    const mpGamesList = resolveEntries(mpGameDefs);   // şekil: { id, game, badge? }

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

        // Merkezi admin ayarlarını dinlemeye başla (Firebase /adminConfig). Uygulanması
        // oturum çözülene kadar ertelenir (proceedAfterAuth) — sıfırlama × bulut senkron yarışı.
        subscribeAdminConfig();

        // Firebase yok (SDK engellendi): bant + online kartlar kapalı; tek kişilik oyunlar açık
        if (!isFirebaseOk()) showOfflineBanner();

        // Mobil: ilk dokunuşta audio context kilidini aç (iOS gereği)
        try { MobileUtils.attachGlobalAudioUnlock(); } catch (e) {}

        // Event listener'lar
        setupEventListeners();

        // Giriş kapısı: Google/Misafir oturumu çözülünce app devam eder (proceedAfterAuth).
        // Deep-link & splash artık oturum belirlendikten SONRA işlenir.
        Auth.init(proceedAfterAuth);
    }

    function isFirebaseOk() { return window.FIREBASE_OK === true; }

    function showOfflineBanner() {
        const b = document.getElementById('offline-banner');
        if (b) b.classList.remove('hidden');
    }

    // Auth oturumu hazır (Google yüklendi / misafir seçildi) → app'e gir
    let authEntered = false;
    let authResolved = false;      // profil (yerel ya da buluttan) yerine oturdu → adminConfig uygulanabilir
    let adminConfigLoaded = false; // ilk /adminConfig anlık görüntüsü geldi (subscribeAdminConfig)
    function proceedAfterAuth() {
        authResolved = true;
        // Sıfırlama jetonu artık DOĞRU profille (replaceAll sonrası) karşılaştırılır
        if (adminConfigLoaded) applyAdminConfig();
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
        if (mp && !isFirebaseOk()) {             // çevrimdışı: online oyun açılamaz → hub + uyarı
            appToast('Çevrimdışısın — online oyunlar şu an açılamıyor.');
            return false;
        }
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
                            <div class="popular-icon"><img src="assets/images/hub/${game.id}.svg" alt="" draggable="false"></div>
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
            withIconFallback(card, categoryIcons.home);
            if (entry) {
                bindActivate(card, () => { AudioManager.play('tap'); startGame(entry.game); });
            }
        });
    }

    function renderHubGrid() {
        const grid = document.getElementById('hub-grid');
        grid.innerHTML = '';
        let cardIndex = 0;

        // Giriş kademesi: ilk 12 kart 40 ms arayla, kalanı birlikte (58 kart × 60 ms = 3.5 s bekleme idi)
        function staggerDelay(i) { return Math.min(i, STAGGER_MAX_CARDS) * STAGGER_STEP_MS + 'ms'; }

        function createGameCard(gameEntry, fallbackIcon) {
            const { game, comingSoon } = gameEntry;
            const card = document.createElement('div');
            card.className = 'game-card';
            card.dataset.game = game.id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            // aria-label yok: erişilebilir ad görünen metin (rozet + başlık + durum) — WCAG 2.5.3

            let starsHTML = '';
            for (let i = 1; i <= (game.levels?.length || 3); i++) {
                const s = Progress.getLevelStars(game.id, i);
                const cls = s > 0 ? 'earned' : 'empty';
                starsHTML += `<svg class="${cls}" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
            }

            card.innerHTML = `
                <div class="card-icon"><img src="assets/images/hub/${game.id}.svg" alt="" draggable="false"></div>
                <div class="card-title">${TR.games[game.id]}</div>
                <div class="card-stars">${starsHTML}</div>
            `;

            withIconFallback(card, fallbackIcon);
            card.style.animationDelay = staggerDelay(cardIndex);
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
                bindActivate(card, bump);
                return card;
            }

            // Kilitli oyun: yıldız eşiği dolmamış ve öğretmen izni yok → gri kart, "Kilitli" rozeti, ilerleme
            if (!isGameUnlocked(gameEntry)) {
                applyLockedState(card, gameEntry);
                return card;
            }

            bindActivate(card, () => { AudioManager.play('tap'); startGame(game); });
            return card;
        }

        function createMPCard(entry) {
            const { id, game } = entry;
            const card = document.createElement('div');
            card.className = 'game-card';
            card.dataset.game = id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.innerHTML = `
                <div class="mp-badge">2 Oyuncu</div>
                <div class="card-icon"><img src="assets/images/hub/${id}.svg" alt="" draggable="false"></div>
                <div class="card-title">${TR.games[id]}</div>
                <div class="card-stars"><span style="font-size:0.7rem;color:var(--text-muted)">Online</span></div>
            `;
            // 2'den fazla oyuncuya izin veren oyunlar için rozet metnini değiştir (örn. "2-4 Oyuncu")
            if (entry.badge) { const b = card.querySelector('.mp-badge'); if (b) b.textContent = entry.badge; }
            withIconFallback(card, categoryIcons.online);
            card.style.animationDelay = staggerDelay(cardIndex);
            cardIndex++;

            // Çevrimdışı (Firebase yok): online kart gri + "Çevrimdışı" rozeti, tıkta yalnız uyarı
            if (!isFirebaseOk()) {
                applyOfflineState(card);
                return card;
            }

            // Kilitli online oyun: gri kart + "Kilitli" rozeti + ilerleme (mp-badge CSS ile gizlenir)
            if (!isGameUnlocked(entry)) {
                applyLockedState(card, entry);
                return card;
            }

            bindActivate(card, () => { AudioManager.play('tap'); startMultiplayerGame(game); });
            return card;
        }

        // Online kart, Firebase yokken: sessizce başarısız olmak yerine görünür "kapalı" durumu
        function applyOfflineState(card) {
            card.classList.add('offline');
            card.setAttribute('aria-disabled', 'true');
            const badge = document.createElement('div');
            badge.className = 'offline-badge';
            badge.textContent = 'Çevrimdışı';
            card.appendChild(badge);
            const onTap = () => {
                try { AudioManager.play('tap'); } catch (e) {}
                card.classList.remove('cs-bump'); void card.offsetWidth; card.classList.add('cs-bump');
                appToast('Çevrimdışısın — online oyunlar şu an açılamıyor.');
            };
            bindActivate(card, onTap);
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
                const h2 = document.createElement('h2');   // h1 (üst bar) → h2 bölüm (h3 atlaması yok)
                h2.style.setProperty('--cat-color', category.color);
                const catImg = document.createElement('img');
                catImg.src = category.icon;
                catImg.alt = '';                            // dekoratif: başlık metni zaten adı taşıyor
                catImg.className = 'cat-header-icon';
                catImg.draggable = false;
                h2.appendChild(catImg);
                h2.appendChild(document.createTextNode(' ' + category.title));
                header.appendChild(h2);
                grid.appendChild(header);

                category.games.forEach((entry) => {
                    grid.appendChild(createGameCard(entry, category.icon));
                });
            });
        }

        // ── Çok Oyunculu Bölüm ──
        if (showAll || showMP) {
            const mpHeader = document.createElement('div');
            mpHeader.className = 'hub-category-header mp-section-header';
            const mpH2 = document.createElement('h2');
            mpH2.style.setProperty('--cat-color', '#5B4A8A');
            const mpImg = document.createElement('img');
            mpImg.src = categoryIcons.online;
            mpImg.alt = '';
            mpImg.className = 'cat-header-icon';
            mpImg.draggable = false;
            mpH2.appendChild(mpImg);
            mpH2.appendChild(document.createTextNode(' ' + TR.multiplayerTitle));
            mpHeader.appendChild(mpH2);
            grid.appendChild(mpHeader);

            mpGamesList.forEach((entry) => {
                grid.appendChild(createMPCard(entry));
            });
        }
    }

    function startMultiplayerGame(game, bypassLock = false) {
        // Firebase yoksa online oyun hiçbir yoldan açılmaz (kart zaten kapalı; bu son koruma)
        if (!isFirebaseOk()) { appToast('Çevrimdışısın — online oyunlar şu an açılamıyor.'); return; }
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
        if (game.id === 'altin-avi' || game.id === 'kelimelik' || game.id === 'son-kart') {
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
        if (entry && entry.comingSoon) {   // kapalı oyun: kart da, derin-bağlantı (?oyun=) da — hiçbir yoldan açılmaz
            try { AudioManager.play('tap'); } catch (e) {}
            return;
        }
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

    // Şu an oynanan oyunun katalog girdisi (online: activeMpGame; solo: body.dataset.activeGame)
    function activeGameEntry() {
        if (activeMpGame) return mpGamesList.find(e => e.game === activeMpGame) || null;
        const id = document.body.dataset.activeGame;
        if (id) return gameRegistry.find(e => e.game && e.game.id === id) || null;
        return null;
    }

    // Basit bildirim (admin kilitleyince "oyundan atıldın" mesajı vb.) — js/errors.js'teki
    // paylaşılan toast (#app-toast, stil css/main.css). errors.js yüklenmediyse konsola düşer.
    function appToast(msg) {
        if (window.HubToast) HubToast.show(msg);
        else console.warn('[toast]', msg);
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

    // Firebase /adminConfig'i dinle — merkezi admin ayarları (kilitler/sıfırlama/ses).
    // İlk anlık görüntü gelene kadar adminConfigLoaded=false: sıfırlama karşılaştırması
    // yapılmaz (eski jetonu bilmeden profil damgalanmasın). Oturum çözülmeden de uygulanmaz.
    function subscribeAdminConfig() {
        try {
            if (!isFirebaseOk() || typeof db === 'undefined' || !db) return;
            db.ref('adminConfig').on('value', (snap) => {
                adminConfig = snap.val() || {};
                adminConfigLoaded = true;
                if (authResolved) applyAdminConfig();   // aksi hâlde proceedAfterAuth uygular
            }, (err) => {
                // okuma reddedildi/çevrimdışı → adminConfig boş kalır, yerel mantık sürer
                console.warn('adminConfig okunamadı — yerel kilit mantığı sürüyor:', err);
            });
        } catch (e) { console.error('adminConfig aboneliği kurulamadı:', e); }
    }

    // Global sıfırlama: jeton PROFİLDE (Progress blob → bulut) damgalanır, cihazda değil.
    // - Profil hiç damgalanmamışsa (eski kayıt / yeni hesap / az önce sıfırlanmış blob):
    //   mevcut jeton sıfırlama YAPILMADAN damgalanır → eski sıfırlamalar geriye dönük uygulanmaz,
    //   dağıtım anında hiçbir kullanıcı yıldız kaybetmez.
    // - Jeton damgadan yeniyse: tek save ile sıfırla + damgala → Google'da buluta gider;
    //   başka cihaz/replaceAll sonrası aynı karşılaştırma yapılır, yeni sıfırlama yine kazanır.
    // - Profil damgasızsa ama cihazda ESKİ anahtar (A4 öncesi 'oyun_bahcesi_lastResetToken') varsa,
    //   o cihazın en son gördüğü jetonla karşılaştırılır: yeni jeton → sıfırla; değilse yalnız damgala.
    const LEGACY_RESET_KEY = 'oyun_bahcesi_lastResetToken';
    function readLegacyResetToken() {
        let raw = null;
        try { raw = localStorage.getItem(LEGACY_RESET_KEY); } catch (e) { return null; }
        if (raw === null) return null;
        const n = parseInt(raw, 10);
        return Number.isFinite(n) ? n : null;
    }
    function applyResetTokenIfNewer() {
        const tok = Number(adminConfig.resetToken) || 0;
        const seen = Progress.getResetToken();
        if (seen === null) {
            const legacy = readLegacyResetToken();
            if (legacy !== null && tok > legacy) {
                Progress.applyReset(tok);
                appToast('Yıldızlar yönetici tarafından sıfırlandı.');
            } else {
                Progress.markResetSeen(tok);
            }
            try { localStorage.removeItem(LEGACY_RESET_KEY); } catch (e) {}   // artık profil damgası geçerli
            return;
        }
        if (tok > seen) {
            Progress.applyReset(tok);
            appToast('Yıldızlar yönetici tarafından sıfırlandı.');
        }
    }

    // Merkezi ayarları cihaza uygula: global sıfırlama sinyali, ses, kilit yeniden render
    // Yalnız oturum çözüldükten (authResolved) ve ilk adminConfig geldikten sonra çağrılır.
    function applyAdminConfig() {
        if (!authResolved || !adminConfigLoaded) return;
        applyResetTokenIfNewer();
        // Ses zorlaması (admin 'on'/'off' dayatabilir; yoksa cihazın kendi ayarı)
        if (adminConfig.sound === 'off') { AudioManager.setEnabled(false); document.getElementById('btn-sound')?.classList.add('muted'); }
        else if (adminConfig.sound === 'on') { AudioManager.setEnabled(true); document.getElementById('btn-sound')?.classList.remove('muted'); }
        updateStarCounter();
        if (currentView === 'hub') {
            renderHubGrid();
        } else if (currentView === 'game') {
            // Oyun oynanırken admin kilitlerse ("Kilit" = komple kapat): önce uyar, 5 sn sonra hub'a at
            const entry = activeGameEntry();
            if (entry && !isGameUnlocked(entry)) scheduleLockKick(entry);
        }
    }

    // Uyarı + gecikmeli çıkış. Süre dolunca yeniden bakılır: admin bu arada açtıysa ya da oyuncu
    // zaten başka bir (açık) oyuna/hub'a geçtiyse hiçbir şey yapılmaz.
    let lockKickTimer = null;
    function scheduleLockKick(entry) {
        if (lockKickTimer) return;   // aynı kilit için ikinci uyarı yok
        appToast('Bu oyun yönetici tarafından kapatıldı — 5 saniye içinde ana ekrana dönülecek.');
        lockKickTimer = setTimeout(() => {
            lockKickTimer = null;
            if (currentView !== 'game') return;
            const now = activeGameEntry();
            if (!now || now !== entry || isGameUnlocked(now)) return;
            navigateToHub();
            appToast('Bu oyun yönetici tarafından kapatıldı.');
        }, LOCK_KICK_DELAY_MS);
    }

    return { init, updateStarCounter, showHub };
})();

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', App.init);
