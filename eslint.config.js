/* ============================================
   ESLint flat config (ESLint 10) — bilnetoyun.com
   --------------------------------------------
   Amaç: `no-undef` ile "tanımsız değişken" hatalarını yakalamak. Site bundler'sız
   klasik <script> etiketleriyle çalışır; her dosyanın en üst düzeyindeki
   `const X = (() => {…})()` modülleri diğer dosyalardan global olarak görünür.
   Aşağıdaki global listeleri koddan türetildi (index.html script sırası + her
   dosyanın üst düzey bildirimleri); yeni bir oyun modülü eklenirse buraya da
   eklenir — aksi hâlde lint doğru olarak "X is not defined" der.

   Kapsam kuralı: hub globalleri yalnız js/** için tanımlıdır. games/** altındaki
   iframe oyunları ayrı pencerede çalışır; oradan hub modülüne (Progress, App…)
   başvuru gerçek bir hatadır ve bilerek global sayılmaz.
   ============================================ */
'use strict';

const globals = require('globals');

// Üçüncü parti globaller: Firebase <script> (index.html <head>, gstatic + SRI), three (cdnjs) ve js/lib/ vendor (tembel yükleme).
const cdnGlobals = {
    firebase: 'readonly',   // firebase-*-compat.js (gstatic)
    THREE: 'readonly',      // three.min.js r128 (cdnjs) — lego-world
    Chess: 'readonly',      // js/lib/chess.0.10.3.min.js (vendor, B8a) — satranc-engine
};

// Hub çekirdek modülleri: js/*.js içinde üst düzey `const X = …` (index.html / admin.html yükler).
const hubCoreGlobals = {
    App: 'readonly',                // js/app.js
    Auth: 'readonly',               // js/auth.js
    AudioManager: 'readonly',       // js/audio.js
    db: 'readonly',                 // js/firebase-config.js (firebase.database())
    DragSystem: 'readonly',         // js/drag.js
    GameEngine: 'readonly',         // js/engine.js
    Lobby: 'readonly',              // js/lobby.js
    GAME_SECTIONS: 'readonly',      // js/catalog.js (ÜRETİLMİŞ: data/games.json, B2a)
    GAME_CATALOG: 'readonly',       // js/catalog.js
    GAME_MODULES: 'readonly',       // js/catalog.js — modül adı → thunk tablosu
    LOCK_CATALOG: 'readonly',       // js/lock-catalog.js
    LOCK_STARS_BY_KEY: 'readonly',  // js/lock-catalog.js
    MobileUtils: 'readonly',        // js/mobile-utils.js
    Multiplayer: 'readonly',        // js/multiplayer.js
    Particles: 'readonly',          // js/particles.js
    Progress: 'readonly',           // js/progress.js
    HubToast: 'readonly',           // js/errors.js (A4)
    AssetLoader: 'readonly',        // js/loader.js (A9)
    ADMIN_EMAIL: 'readonly',        // js/firebase-config.js (A6)
    Janitor: 'readonly',            // js/janitor.js (istemci tarafı temizlikçi)
    TR: 'readonly',                 // js/i18n.js
};

// Oyun modülleri: js/games/*.js — js/catalog.js GAME_MODULES thunk tablosu (data/games.json module /
// online.module; tools/build-catalog.js bu listeyi doğrular) ve paylaşılan motorlar (ChessEngine,
// KodMacerasiCore) bunlara adıyla başvurur.
const gameModuleGlobals = Object.fromEntries([
    // Tek oyunculu (hub sırasıyla)
    'HarfTanima', 'KlavyeKasifi', 'HeceBirlestirme', 'KelimeMadeni3D', 'KelimeBalonu', 'KelimeCanavarlari',
    'KelimeKurtarma', 'GunlukKelime',
    'SayiSayma', 'Matematik', 'Desen', 'BilgiMadencisi', 'MatematikPatlatma', 'MatematikKafe',
    'BilgiYilani', 'RitimSorulari', 'Kesir2048', 'SayiNinja',
    'HafizaKartlari', 'SekilBulmaca', 'Siralama', 'Jigsaw', 'Tetris', 'BilimDedektifi',
    'EslestirmeUstasi', 'LabirentAvcisi',
    'RenkEslestirme', 'Boyama', 'Tuval', 'SayilarlaBoyama', 'EmojiYapici',
    'KodMacerasi', 'LegoMacerasi', 'LegoWorld', 'Satranc', 'ZiplaTopla', 'SpaceWaves', 'Egim',
    'BuzKulesi', 'Penalti', 'ZindanOkcusu', 'BilVeFethet', 'BilgiTakimi', 'BilgiCiftligi',
    'BilgiKulesi', 'CevapKosusu', 'BilgiSavunmasi', 'FizikFirlatma',
    // Online (online.order sırasıyla)
    'KelimeTahmin', 'HarfTahmin', 'KodMacerasiMP', 'SatrancMP', 'PenaltiMP', 'AtesBuz',
    'ZiplaToplaCoop', 'HavaHokeyi', 'AltinAvi', 'Kelimelik', 'SonKart',
    // Paylaşılan motorlar
    'ChessEngine',      // js/games/satranc-engine.js
    'KodMacerasiCore',  // js/games/kod-macerasi-shared.js
].map((name) => [name, 'readonly']));

// no-unused-vars temel seçenekleri. `exported`: dosyada bildirilip başka dosyadan kullanılan
// (yani yukarıdaki global listelerdeki) üst düzey modül adları "kullanılmıyor" sayılmasın.
function unusedVars(exported = []) {
    const opts = { args: 'none', caughtErrors: 'none' };
    if (exported.length) opts.varsIgnorePattern = '^(?:' + exported.join('|') + ')$';
    return ['warn', opts];
}

module.exports = [
    {
        ignores: [
            'node_modules/**',
            'test-results/**',
            'playwright-report/**',
            '.build-check/**',                    // tools/build.js --out çıktısı (A10b)
            'js/lib/**',                          // vendor: stockfish.js, chess.0.10.3.min.js, GLTFLoader.r128.js (js/lib/README.md)
            'games/kelime-madeni-3d/three.min.js', // vendor, minified
            'fabrika/**',                          // üretim araçları/kaynak — siteye çıkmaz
            'server/**',                           // eski WS sunucusu — siteye çıkmaz (A11: silinecek)
            'seo/**',                              // python üretici
        ],
    },

    // ── Varsayılan: tarayıcıda klasik <script> ──
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: { ...globals.browser },
        },
        rules: {
            'no-undef': 'error',
            // Hata değil uyarı: mevcut kodda ölü değişken çok; sinyal olarak kalsın, CI'ı kırmasın.
            // catch (e) {} kalıbı kod tabanının stili → yakalanan hatalar sayılmaz.
            'no-unused-vars': unusedVars(),
        },
    },

    // ── Hub (index.html / admin.html) — js/** ──
    {
        files: ['js/**/*.js'],
        languageOptions: {
            globals: { ...cdnGlobals, ...hubCoreGlobals, ...gameModuleGlobals },
        },
        rules: {
            'no-unused-vars': unusedVars([...Object.keys(hubCoreGlobals), ...Object.keys(gameModuleGlobals)]),
        },
    },

    // ── Ateş & Buz: ES modülleri (games/ates-buz/index.html <script type="module">) ──
    {
        files: ['games/ates-buz/js/**/*.js'],
        languageOptions: { sourceType: 'module' },
    },
    {
        // game.js `canvas`ı helpers.js'ten import ETMİYOR; tarayıcının "named access"
        // davranışıyla (<canvas id="canvas"> → window.canvas) çalışıyor. Gizli bağımlılık —
        // kalıcı çözüm: `import { canvas } from "./helpers.js"` (A11 temizlik).
        files: ['games/ates-buz/js/game.js'],
        languageOptions: { globals: { canvas: 'readonly' } },
    },

    // ── Kelimelik (iframe): kendi klasik modülleri + UMD (module.exports) ──
    {
        files: ['games/kelimelik/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.commonjs,          // module/require/exports — UMD guard'ları
                KelimelikAI: 'readonly',
                KelimelikDict: 'readonly',
                KelimelikEngine: 'readonly',
                KelimelikNet: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': unusedVars(['KelimelikAI', 'KelimelikDict', 'KelimelikEngine', 'KelimelikNet']),
        },
    },

    // ── Son Kart (iframe): UMD modülleri window.SK_* + Node fuzz/sim araçları ──
    {
        files: ['games/son-kart/js/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.commonjs,
                SK_Deck: 'readonly',
                SK_Engine: 'readonly',
                SK_Bot: 'readonly',
                SonKartNet: 'readonly',
                SonKartUI: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': unusedVars(['SonKartNet', 'SonKartUI']),
        },
    },

    // ── Node betikleri: oyun araçları/testleri (siteye çıkmaz) ──
    {
        files: ['games/**/tools/**/*.js', 'games/**/kaynak/**/*.js', 'games/**/test_*.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
    },

    // ── Test altyapısı (Playwright), build aracı (tools/build.js, A10b) ve bu yapılandırma ──
    {
        files: ['tests/**/*.js', 'tools/**/*.js', 'playwright.config.js', 'eslint.config.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
    },
];
