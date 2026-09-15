/* ============================================
   Playwright yapılandırması — bilnetoyun.com duman testi
   --------------------------------------------
   Çalıştırma:
     npm run test:smoke                    → tests/static-server.js 8000'de kendiliğinden kalkar
     PORT=8765 npm run test:smoke          → 8000 doluysa başka port
     BASE_URL=https://… npm run test:smoke → dış ortam (Vercel önizleme); yerel sunucu başlatılmaz
   Sunucu neden Node (server.py değil): tests/static-server.js başlığına bak (dinleme kuyruğu).
   ============================================ */
'use strict';

const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.PORT || 8000);
// 127.0.0.1 (localhost değil): Ubuntu runner'da "localhost" önce ::1'e çözülebilir → yalnız CI'da
// görülen ERR_CONNECTION_REFUSED flake'ini kökten önler; sunucu da 127.0.0.1'e bağlanır.
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
    testDir: 'tests',
    fullyParallel: true,          // tek dosyadaki ~60 test 4 worker'a dağılsın
    workers: 4,
    retries: 1,                   // "retry'da geçti" = flake sinyali; tedavi değil ölçüm
    timeout: 30000,
    reporter: 'list',
    forbidOnly: !!process.env.CI,
    expect: { timeout: 10000 },

    use: {
        baseURL: BASE_URL,
        locale: 'tr-TR',
        // Hub kartları sonsuz `gentleFloat` animasyonuyla sürekli hareket eder (css/hub.css:238);
        // Playwright tıklamadan önce "element stable" bekler → 30 sn'ye kadar yarış (1/180 koşuda
        // görüldü). Site prefers-reduced-motion'ı destekler (css/animations.css:193): animasyonlar
        // tek kareye iner, tıklama deterministik olur. Duman testi hareketi değil JS hatasını ölçer.
        reducedMotion: 'reduce',
        // Artefaktlar: yeşil koşuda sıfır maliyet, kırmızıda tam adli kayıt
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],

    globalSetup: require.resolve('./tests/global-setup.js'),
    globalTeardown: require.resolve('./tests/global-teardown.js'),

    // Dış BASE_URL verilmişse yerel sunucu başlatma.
    webServer: process.env.BASE_URL ? undefined : {
        command: `node tests/static-server.js --port ${PORT}`,
        url: `${BASE_URL}/`,
        reuseExistingServer: true,   // elle açık sunucu (server.py dahil) varsa onu kullan
        timeout: 30000,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
