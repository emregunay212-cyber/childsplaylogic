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

    // ── Kayıt defteri (A4 tembel referans + A9b tembel YÜKLEME) ──
    // Her girdi: game (thunk), id, levels, files, color?, comingSoon?, badge?
    //  game   : modüle TEMBEL referans. Dosyalar `files` ile yüklenmeden çözülmez (loadGame);
    //           dosya inmez/parse edilmez/IIFE fırlatırsa yalnız o oyun açılmaz (toast), hub ölmez.
    //           Neden window['HarfTanima'] değil: modüller top-level const → window'a bağlanmaz;
    //           eval/Function ile ad çözmek ise CSP'yi (vercel.json) kırar.
    //  id     : oyunun slug'ı (= modül.id): TR.games, kilit anahtarı, hub ikonu, derin bağlantı.
    //  levels : seviye sayısı (= modül.levels.length) — kartın yıldız satırı modül yüklenmeden
    //           çizilir. Modül yüklenince doğrulanır; uyuşmazsa console.error (kart yanlış yıldız
    //           sayısı gösteriyor demektir → burayı güncelle). Online oyunlarda yok.
    //  files  : oyun açılınca yüklenecek JS/CSS (js/loader.js). Sıra = çalışma sırası; ortak
    //           bağımlılık (kod-macerasi-shared, satranc-engine, zipla-topla-levels, …) önce.
    //           `?v=` elle artırılmaz: deploy'da tools/build.js her yola içerik hash'i (?h=) ekler (A10b).
    // tests/helpers/slugs.js comingSoon kayıtlarını `game:` ilk anahtar olacak biçimde okur → `game:` ilk anahtar kalır.
    const CHESS_JS = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
    const THREE_JS = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    const GLTF_LOADER_JS = 'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js';
    const KOD_MACERASI_SHARED = ['js/games/kod-macerasi-shared.js', 'css/kod-macerasi.css'];
    const SATRANC_SHARED = [CHESS_JS, 'js/games/satranc-engine.js', 'css/satranc.css'];
    const ZIPLA_TOPLA_FILES = ['js/games/zipla-topla-levels.js', 'js/games/zipla-topla.js?v=6', 'css/zipla-topla.css?v=3'];

    const gameCategoryDefs = [
        {
            title: 'Harfler & Kelimeler',
            icon: categoryIcons.letters,
            color: '#45B7D1',
            games: [
                { game: () => HarfTanima, id: 'harf-tanima', levels: 3, files: ['js/games/harf-tanima.js'], color: 'var(--harf-color)' },
                { game: () => HeceBirlestirme, id: 'hece-birlestirme', levels: 3, files: ['js/games/hece-birlestirme.js'], color: 'var(--hece-color)' },
                // Eğitsel seri (Faz 0+): kilitsiz — İngilizce kelime öğretimi.
                // Şimdilik kapalı (kullanıcı isteği, 2026-06-16) — yeniden açmak için "comingSoon: true"yu kaldır.
                { game: () => KelimeMadeni3D, id: 'kelime-madeni-3d', levels: 1, files: ['js/games/kelime-madeni-3d.js', 'css/kelime-madeni-3d.css'], color: 'var(--kelime-madeni-color)', comingSoon: true },
                { game: () => KelimeBalonu, id: 'kelime-balonu', levels: 1, files: ['js/games/kelime-balonu.js', 'css/kelime-balonu.css'], color: 'var(--kelime-balonu-color)' },
                { game: () => KelimeCanavarlari, id: 'kelime-canavarlari', levels: 1, files: ['js/games/kelime-canavarlari.js', 'css/kelime-canavarlari.css'], color: 'var(--kelime-canavar-color)' },
                { game: () => KelimeKurtarma, id: 'kelime-kurtarma', levels: 1, files: ['js/games/kelime-kurtarma.js', 'css/kelime-kurtarma.css'], color: 'var(--kelime-kurtarma-color)' },
                { game: () => GunlukKelime, id: 'gunluk-kelime', levels: 1, files: ['js/games/gunluk-kelime.js', 'css/gunluk-kelime.css'], color: 'var(--gunluk-kelime-color)' },
            ]
        },
        {
            title: 'Sayılar & Matematik',
            icon: categoryIcons.numbers,
            color: '#4ECDC4',
            games: [
                { game: () => SayiSayma, id: 'sayi-sayma', levels: 3, files: ['js/games/sayi-sayma.js'], color: 'var(--sayi-color)' },
                { game: () => Matematik, id: 'matematik', levels: 3, files: ['js/games/matematik.js'], color: 'var(--matematik-color)' },
                { game: () => Desen, id: 'desen', levels: 3, files: ['js/games/desen.js'], color: 'var(--desen-color)' },
                // Eğitsel seri Faz 1 (4.1, 4.2): kilitsiz — işlem akıcılığı.
                { game: () => BilgiMadencisi, id: 'bilgi-madencisi', levels: 1, files: ['js/games/bilgi-madencisi.js', 'css/bilgi-madencisi.css'], color: 'var(--bilgi-madencisi-color)' },
                { game: () => MatematikPatlatma, id: 'matematik-patlatma', levels: 1, files: ['js/games/matematik-patlatma.js', 'css/matematik-patlatma.css'], color: 'var(--matematik-patlatma-color)' },
                { game: () => MatematikKafe, id: 'matematik-kafe', levels: 1, files: ['js/games/matematik-kafe.js', 'css/matematik-kafe.css'], color: 'var(--matematik-kafe-color)' },
                { game: () => BilgiYilani, id: 'bilgi-yilani', levels: 1, files: ['js/games/bilgi-yilani.js', 'css/bilgi-yilani.css'], color: 'var(--bilgi-yilani-color)' },
                { game: () => RitimSorulari, id: 'ritim-sorulari', levels: 1, files: ['js/games/ritim-sorulari.js', 'css/ritim-sorulari.css'], color: 'var(--ritim-color)' },
                { game: () => Kesir2048, id: 'kesir-2048', levels: 1, files: ['js/games/kesir-2048.js', 'css/kesir-2048.css'], color: 'var(--kesir-color)' },
                { game: () => SayiNinja, id: 'sayi-ninja', levels: 1, files: ['js/games/sayi-ninja.js', 'css/sayi-ninja.css'], color: 'var(--sayi-ninja-color)' },
            ]
        },
        {
            title: 'Bulmaca & Mantık',
            icon: categoryIcons.puzzles,
            color: '#A55EEA',
            games: [
                { game: () => HafizaKartlari, id: 'hafiza-kartlari', levels: 10, files: ['js/games/hafiza-kartlari.js'], color: 'var(--hafiza-color)' },
                { game: () => SekilBulmaca, id: 'sekil-bulmaca', levels: 3, files: ['js/games/sekil-bulmaca.js'], color: 'var(--sekil-color)' },
                { game: () => Siralama, id: 'siralama', levels: 3, files: ['js/games/siralama.js'], color: 'var(--siralama-color)' },
                { game: () => Jigsaw, id: 'jigsaw', levels: 3, files: ['js/games/jigsaw.js'], color: 'var(--jigsaw-color)' },
                { game: () => Tetris, id: 'tetris', levels: 1, files: ['js/games/tetris.js', 'css/tetris.css'], color: 'var(--tetris-color)' },
                // Eğitsel seri (Faz 3): kilitsiz — fen gözlem/dikkat.
                { game: () => BilimDedektifi, id: 'bilim-dedektifi', levels: 1, files: ['js/games/bilim-dedektifi.js', 'css/bilim-dedektifi.css'], color: 'var(--bilim-dedektifi-color)' },
                { game: () => EslestirmeUstasi, id: 'eslestirme-ustasi', levels: 1, files: ['js/games/eslestirme-ustasi.js', 'css/eslestirme-ustasi.css'], color: 'var(--eslestirme-color)' },
                { game: () => LabirentAvcisi, id: 'labirent-avcisi', levels: 1, files: ['js/games/labirent-avcisi.js', 'css/labirent-avcisi.css'], color: 'var(--labirent-color)' },
            ]
        },
        {
            title: 'Yaratıcılık',
            icon: categoryIcons.creativity,
            color: '#FF78C4',
            games: [
                { game: () => RenkEslestirme, id: 'renk-eslestirme', levels: 3, files: ['js/games/renk-eslestirme.js'], color: 'var(--renk-color)' },
                { game: () => Boyama, id: 'boyama', levels: 10, files: ['js/games/boyama.js'], color: 'var(--boyama-color)' },
                { game: () => Tuval, id: 'tuval', levels: 3, files: ['js/games/tuval.js', 'css/tuval.css'], color: 'var(--tuval-color)' },
                { game: () => SayilarlaBoyama, id: 'sayilarla-boyama', levels: 6, files: ['js/games/sayilarla-boyama.js?v=2', 'css/sayilarla-boyama.css'], color: 'var(--sayilarla-boyama-color)' },
                { game: () => EmojiYapici, id: 'emoji-yapici', levels: 1, files: ['js/games/emoji-yapici.js?v=4', 'css/emoji-yapici.css?v=2'], color: 'var(--emoji-yapici-color)' },
            ]
        },
        {
            title: 'Strateji & Macera',
            icon: categoryIcons.strategy,
            color: '#27AE60',
            games: [
                { game: () => KodMacerasi, id: 'kod-macerasi', levels: 3, files: [...KOD_MACERASI_SHARED, 'js/games/kod-macerasi.js'], color: 'var(--kodmacerasi-color)' },
                // lego-macerasi'nin stilleri css/kod-macerasi.css içinde (.lego-*, .kod-*): tembel yüklemede eksikti → oyun stilsiz açılıyordu
                { game: () => LegoMacerasi, id: 'lego-macerasi', levels: 3, files: ['css/kod-macerasi.css', 'js/games/lego-macerasi.js'], color: 'var(--lego-color)' },
                { game: () => LegoWorld, id: 'lego-world', levels: 9, files: [THREE_JS, GLTF_LOADER_JS, 'js/games/lego-world.js', 'css/lego-world.css'], color: 'var(--lego-world-color)' },
                { game: () => Satranc, id: 'satranc', levels: 1, files: [...SATRANC_SHARED, 'js/games/satranc.js'], color: 'var(--satranc-color)' },
                // Kilit eşikleri js/lock-catalog.js'te (LOCK_CATALOG). Buradaki sıra = görünüm sırası.
                { game: () => ZiplaTopla, id: 'zipla-topla', levels: 12, files: ZIPLA_TOPLA_FILES, color: 'var(--zipla-topla-color)' },
                { game: () => SpaceWaves, id: 'space-waves', levels: 1, files: ['js/games/space-waves-questions.js', 'js/games/space-waves.js', 'css/space-waves.css?v=2'], color: 'var(--space-waves-color)' },
                { game: () => Egim, id: 'egim', levels: 1, files: ['js/games/egim.js?v=2', 'css/egim.css?v=2'], color: 'var(--egim-color)' },
                { game: () => BuzKulesi, id: 'buz-kulesi', levels: 1, files: ['js/games/buz-kulesi.js', 'css/buz-kulesi.css?v=2'], color: 'var(--buz-kulesi-color)' },
                { game: () => Penalti, id: 'penalti', levels: 9, files: ['js/games/penalti.js', 'css/penalti.css'], color: 'var(--penalti-color)' },
                { game: () => ZindanOkcusu, id: 'zindan-okcusu', levels: 1, files: ['js/games/zindan-okcusu.js?v=7', 'css/zindan-okcusu.css'], color: 'var(--zindan-okcusu-color)' },
                // Eğitsel seri (Faz 0+): kilitsiz — eğitsel içeriğe engelsiz erişim.
                { game: () => BilVeFethet, id: 'bil-ve-fethet', levels: 1, files: ['js/games/bil-ve-fethet.js', 'css/bil-ve-fethet.css'], color: 'var(--bil-ve-fethet-color)' },
                { game: () => BilgiTakimi, id: 'bilgi-takimi', levels: 1, files: ['js/games/bilgi-takimi.js', 'css/bilgi-takimi.css'], color: 'var(--bilgi-takimi-color)' },
                { game: () => BilgiCiftligi, id: 'bilgi-ciftligi', levels: 1, files: ['js/games/bilgi-ciftligi.js', 'css/bilgi-ciftligi.css'], color: 'var(--bilgi-ciftligi-color)' },
                { game: () => BilgiKulesi, id: 'bilgi-kulesi', levels: 1, files: ['js/games/bilgi-kulesi.js', 'css/bilgi-kulesi.css'], color: 'var(--bilgi-kulesi-color)' },
                { game: () => CevapKosusu, id: 'cevap-kosusu', levels: 1, files: ['js/games/cevap-kosusu.js', 'css/cevap-kosusu.css'], color: 'var(--cevap-kosusu-color)' },
                { game: () => BilgiSavunmasi, id: 'bilgi-savunmasi', levels: 1, files: ['js/games/bilgi-savunmasi.js', 'css/bilgi-savunmasi.css'], color: 'var(--savunma-color)' },
                { game: () => FizikFirlatma, id: 'fizik-firlatma', levels: 1, files: ['js/games/fizik-firlatma.js', 'css/fizik-firlatma.css'], color: 'var(--firlatma-color)' },
            ]
        },
    ];

    // Tembel referansın adı (hata metni için): "() => Tetris" → "Tetris"
    function thunkName(fn) {
        const m = /=>\s*([\w$]+)/.exec(String(fn));
        return m ? m[1] : String(fn);
    }

    // Kategori şekli korunur ({ title, icon, color, games:[{ game, id, levels, files, … }] }).
    // Kartlar yalnız statik alanlardan (id/levels) çizilir; modül oyun açılınca yüklenir (loadGame).
    const gameCategories = gameCategoryDefs;

    // Düz liste (derin bağlantı, popüler oyunlar, kilit guard'ı)
    const gameRegistry = gameCategories.flatMap(cat => cat.games);

    // Kilit/override anahtarı: online girdiler (entry.online) 'mp:' önekli — solo/online id
    // çakışmasını önler (satranc, kod-macerasi). js/lock-catalog.js LOCK_CATALOG key'leriyle birebir.
    function lockKey(entry) {
        if (!entry) return '';
        return entry.online ? ('mp:' + entry.id) : entry.id;
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
        { game: () => KelimeTahmin, id: 'kelime-tahmin', files: ['js/games/kelime-tahmin.js?v=2'] },
        { game: () => HarfTahmin, id: 'harf-tahmin', files: ['js/games/harf-tahmin.js?v=3'] },
        { game: () => KodMacerasiMP, id: 'kod-macerasi', files: [...KOD_MACERASI_SHARED, 'js/games/kod-macerasi-mp.js'] },
        { game: () => SatrancMP, id: 'satranc', files: [...SATRANC_SHARED, 'js/games/satranc-mp.js'] },
        { game: () => PenaltiMP, id: 'penalti-mp', files: ['js/games/penalti-mp.js', 'css/penalti.css'] },
        { game: () => AtesBuz, id: 'ates-buz', files: ['js/games/ates-buz.js', 'css/ates-buz.css'] },
        { game: () => ZiplaToplaCoop, id: 'zipla-topla-coop', files: ZIPLA_TOPLA_FILES },   // ZiplaToplaCoop zipla-topla.js içinde tanımlı
        { game: () => HavaHokeyi, id: 'hava-hokeyi', files: ['js/games/hava-hokeyi.js', 'css/hava-hokeyi.css'] },
        // Cinzel/Cinzel Decorative/Bebas Neue yalnız bu oyunda: css/fonts-altin-avi.css (self-host) burada yüklenir
        { game: () => AltinAvi, id: 'altin-avi', files: ['js/games/altin-avi-questions.js', 'js/games/altin-avi.js?v=4', 'css/altin-avi.css?v=4', 'css/fonts-altin-avi.css'] },
        { game: () => Kelimelik, id: 'kelimelik', files: ['js/games/kelimelik.js?v=2'] },
        { game: () => SonKart, id: 'son-kart', files: ['js/games/son-kart.js?v=2'], badge: '2-4 Oyuncu' },
    ];
    const mpGamesList = mpGameDefs.map(e => Object.assign({}, e, { online: true }));   // şekil: { game, id, files, online, badge? }
    // Kendi lobisini/odasını yöneten online oyunlar (paylaşılan Lobby kullanmaz)
    const SELF_LOBBY_GAMES = new Set(['altin-avi', 'kelimelik', 'son-kart']);

    // ── Modül çözümleme + tembel yükleme ──
    // Yüklenen modüller girdiye göre önbelleklenir (girdi nesnesi değiştirilmez).
    const moduleCache = new Map();   // entry → modül

    function resolveModule(entry) {
        const cached = moduleCache.get(entry);
        if (cached) return cached;
        let game = null;
        try { game = entry.game(); } catch (e) { game = null; }   // ReferenceError/TDZ = dosya yüklenmedi ya da fırlattı
        if (!game || typeof game !== 'object' || !game.id) {
            console.error('Oyun modülü eksik: ' + thunkName(entry.game) + ' (' + entry.id + ') — dosya yüklendi ama modül tanımlı değil ya da hata verdi.');
            return null;
        }
        if (game.id !== entry.id) {
            console.error('Kayıt defteri uyuşmazlığı: ' + entry.id + ' girdisi ' + game.id + ' modülünü çözdü (js/app.js).');
        }
        if (entry.levels && game.levels && game.levels.length !== entry.levels) {
            console.error('Kayıt defteri uyuşmazlığı: ' + entry.id + ' levels=' + entry.levels + ', modül ' + game.levels.length + ' seviye — kart yanlış sayıda yıldız gösteriyor; js/app.js\'i güncelle.');
        }
        moduleCache.set(entry, game);
        return game;
    }

    // Girdinin dosyalarını (JS/CSS) yükler, modülü çözer. Sonuç: Promise<modül>; hata → reject.
    function loadGame(entry) {
        const cached = moduleCache.get(entry);
        if (cached) return Promise.resolve(cached);
        return window.AssetLoader.load(entry.files).then(() => {
            const game = resolveModule(entry);
            if (!game) throw new Error('Oyun modülü çözülemedi: ' + entry.id);
            return game;
        });
    }

    let currentView = 'splash';
    let activeCategory = 'all';
    // GameEngine/Multiplayer dışında, kendi Firebase dinleyicisiyle çalışan
    // multiplayer oyun (örn. Altın Avı). Geçişlerde destroy edilmeli.
    let activeMpGame = null;     // modül
    let activeMpEntry = null;    // kayıt defteri girdisi (kilit/atma için)
    // Tembel yükleme yarışı: her başlatma bir sıra numarası alır; dosyalar inene kadar kullanıcı
    // başka karta/hub'a geçtiyse (numara değişti ya da görünüm oyun değil) geç gelen yükleme başlatılmaz.
    let startSeq = 0;

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
        // Bayat lobi/oda temizliği (Spark planı, Cloud Functions yok): boşta zamanda planlanır,
        // oyun başlatma yolunda çağrılmaz; kapılar/6 saat eşiği js/janitor.js'te. Asla fırlatmaz.
        if (window.Janitor) window.Janitor.schedule();
    }

    function tryDeepLink() {
        let slug;
        try { slug = new URLSearchParams(location.search).get('oyun'); } catch (e) { return false; }
        if (!slug) return false;
        const sp = gameRegistry.find(e => e.id === slug);
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
        if (sp) startGame(sp, 1, true);
        else if (mp) startMultiplayerGame(mp, true);
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
        // Get all games with their star counts, pick top 5 (statik alanlar: modül yüklenmeden)
        const allGames = gameRegistry.map((entry) => ({
            entry,
            stars: Progress.getGameTotalStars(entry.id),
            maxStars: (entry.levels || 3) * 3,
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
                    ${popular.filter(p => p.stars > 0).map(({ entry, stars, maxStars }) => `
                        <div class="popular-card" data-game="${entry.id}" role="button" tabindex="0">
                            <div class="popular-icon"><img src="assets/images/hub/${entry.id}.svg" alt="" draggable="false"></div>
                            <div class="popular-info">
                                <div class="popular-name">${TR.games[entry.id]}</div>
                                <div class="popular-stars">⭐ ${stars}/${maxStars}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;

        container.querySelectorAll('.popular-card').forEach(card => {
            const gameId = card.dataset.game;
            const entry = gameRegistry.find(g => g.id === gameId);
            withIconFallback(card, categoryIcons.home);
            if (entry) {
                bindActivate(card, () => { AudioManager.play('tap'); startGame(entry); });
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
            // Kart yalnız statik alanlardan çizilir (id, levels); modül oyun açılınca yüklenir (A9b)
            const { id, comingSoon } = gameEntry;
            const card = document.createElement('div');
            card.className = 'game-card';
            card.dataset.game = id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            // aria-label yok: erişilebilir ad görünen metin (rozet + başlık + durum) — WCAG 2.5.3

            let starsHTML = '';
            for (let i = 1; i <= (gameEntry.levels || 3); i++) {
                const s = Progress.getLevelStars(id, i);
                const cls = s > 0 ? 'earned' : 'empty';
                starsHTML += `<svg class="${cls}" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
            }

            card.innerHTML = `
                <div class="card-icon"><img src="assets/images/hub/${id}.svg" alt="" draggable="false"></div>
                <div class="card-title">${TR.games[id]}</div>
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

            bindActivate(card, () => { AudioManager.play('tap'); startGame(gameEntry); });
            return card;
        }

        function createMPCard(entry) {
            const { id } = entry;
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

            bindActivate(card, () => { AudioManager.play('tap'); startMultiplayerGame(entry); });
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

    // ── Oyun görünümüne geç + yükleme durumu ──
    // Görünüm HEMEN değişir (hub gizli, oyun kapsayıcısı açık); dosyalar inerken kısa bir
    // gecikmeden sonra yükleniyor göstergesi çizilir (önbellekten anında gelen oyunlarda titreme yok).
    const LOADING_HINT_DELAY_MS = 150;

    function showGameView(entry) {
        cleanupActiveMpGame();
        currentView = 'game';
        document.getElementById('hub').classList.add('hidden');
        document.getElementById('hub-nav').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        document.getElementById('top-bar').classList.add('hidden');
        const title = document.getElementById('game-title');
        if (title) title.textContent = TR.games[entry.id] || entry.id;   // GameEngine.startGame yeniden yazar
        const gameArea = document.getElementById('game-area');
        gameArea.innerHTML = '';
        return gameArea;
    }

    function renderLoadingHint(gameArea, entry) {
        gameArea.innerHTML = '';
        const box = document.createElement('div');
        box.className = 'game-loading';
        box.setAttribute('role', 'status');
        box.setAttribute('aria-live', 'polite');
        const spinner = document.createElement('div');
        spinner.className = 'game-loading-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        const text = document.createElement('p');
        text.className = 'game-loading-text';
        text.textContent = (TR.games[entry.id] || entry.id) + ' yükleniyor…';
        box.appendChild(spinner);
        box.appendChild(text);
        gameArea.appendChild(box);
    }

    // Dosyaları yükle; bu arada kullanıcı başka yere geçtiyse (seq değişti / görünüm oyun değil)
    // hiçbir şey başlatma. Hata: konsol + toast, hub'a dön (kart yeniden tıklanınca tekrar dener).
    function loadThenStart(entry, gameArea, onLoaded) {
        const seq = ++startSeq;
        const hintTimer = setTimeout(() => { if (seq === startSeq && currentView === 'game') renderLoadingHint(gameArea, entry); }, LOADING_HINT_DELAY_MS);
        return loadGame(entry)
            .then((game) => {
                if (seq !== startSeq || currentView !== 'game') return;   // bayat yükleme
                gameArea.innerHTML = '';
                onLoaded(game);
            })
            .catch((err) => {
                console.error('[Hub] Oyun yüklenemedi: ' + entry.id, err);
                if (seq !== startSeq) return;
                appToast('Oyun yüklenemedi — bağlantını kontrol edip tekrar dene.');
                if (currentView === 'game') navigateToHub();
            })
            .finally(() => clearTimeout(hintTimer));
    }

    function startMultiplayerGame(entry, bypassLock = false) {
        // Firebase yoksa online oyun hiçbir yoldan açılmaz (kart zaten kapalı; bu son koruma)
        if (!isFirebaseOk()) { appToast('Çevrimdışısın — online oyunlar şu an açılamıyor.'); return; }
        // Kilitli online oyun guard'ı (bypassLock=true: landing/deep-link ziyaretçisi atlar)
        if (!bypassLock && !isGameUnlocked(entry)) { try { AudioManager.play('tap'); } catch (e) {} return; }
        const gameArea = showGameView(entry);

        loadThenStart(entry, gameArea, (game) => {
            // Altın Avı, Kelimelik ve Son Kart kendi lobilerini/odalarını yönetir (paylaşılan Lobby kullanmaz)
            if (SELF_LOBBY_GAMES.has(entry.id)) {
                activeMpGame = game;
                activeMpEntry = entry;
                game.init(gameArea, {});
                return;
            }
            Lobby.show(entry.id, gameArea, {
                onGameStart: (data) => {
                    activeMpGame = game;
                    activeMpEntry = entry;
                    game.init(gameArea, data);
                }
            });
        });
    }

    function startGame(entry, level = 1, bypassLock = false) {
        // Kilitli oyun guard'ı — kartı bypass eden tüm yollar için tek koruma noktası.
        // bypassLock=true: landing/deep-link ile gelen ziyaretçi kilidi atlar.
        if (entry.comingSoon) {   // kapalı oyun: kart da, derin-bağlantı (?oyun=) da — hiçbir yoldan açılmaz
            try { AudioManager.play('tap'); } catch (e) {}
            return;
        }
        if (!bypassLock && !isGameUnlocked(entry)) {
            try { AudioManager.play('tap'); } catch (e) {}
            return;
        }
        const gameArea = showGameView(entry);

        try { MobileUtils.lockBodyScroll(); } catch (e) {}
        // CSS targeting için aktif oyun kimliği — portrait mobile auto-rotation
        document.body.dataset.activeGame = entry.id;

        loadThenStart(entry, gameArea, (game) => { GameEngine.startGame(game, level); });
    }

    function cleanupActiveMpGame() {
        if (activeMpGame && typeof activeMpGame.destroy === 'function') {
            try { activeMpGame.destroy(); } catch (e) {}
        }
        activeMpGame = null;
        activeMpEntry = null;
    }

    // Şu an oynanan oyunun katalog girdisi (online: activeMpEntry; solo: body.dataset.activeGame)
    function activeGameEntry() {
        if (activeMpGame) return activeMpEntry;
        const id = document.body.dataset.activeGame;
        if (id) return gameRegistry.find(e => e.id === id) || null;
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

    // Oyunlar hub'a dönerken TAM temizlik yolu (motor destroy, MP kapat, kaydırma kilidi aç, tam ekrandan çık).
    // Eski `App.showHub` ham showHub'dı: buz-kulesi "Hub'a Dön" ile çıkınca klavye dinleyicileri ve
    // mobil kaydırma kilidi kalıyordu.
    return { init, updateStarCounter, showHub: navigateToHub, navigateToHub };
})();

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', App.init);
