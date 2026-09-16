/* ============================================
   EduKit testi (Faz 2 / B5) — games/_shared/edu-kit.js'e taşınan eğitsel iframe oyunları.
   Kapsam dosya sisteminden türetilir: index.html'i `../_shared/edu-kit.js` yükleyen her games/<slug>/
   (yeni oyun kit'e geçince otomatik kapsanır; en az MIN_KIT_GAMES beklenir, aksi hâlde FAIL).
   Her oyun için:
     1. Hub derin bağlantısı /?oyun=<slug> → iframe içinde EduKit.version tanımlı, satır içi script 0
        (JSON-LD sayılmaz), yakalanmamış JS hatası / console.error 0 (smoke ile aynı toplayıcı).
     2. Bağımsız açılış /games/<slug>/ → aynı koşullar; kit'in kendi ayakları üzerinde durduğunu gösterir
        (hub yok, MobileUtils yok, window.storage köprüsünü kit kurar).
     3. CSP provası: aynı sayfa, yanıt gövdesine GEÇİCİ `<meta http-equiv="Content-Security-Policy"
        content="script-src 'self'">` enjekte edilerek açılır (dosyaya yazılmaz, yalnız bu testte) →
        "Refused to execute inline script" 0 ve EduKit yine tanımlı. Yani B9'da script-src için
        'unsafe-inline' bu sayfalara gerekmez. Provanın kendisi ayrıca kontrol edilir: satır içi bir
        yoklama betiği enjekte edilince ihlal 1 olmalı (harness çalışıyor).
   + edu-kit.css :root token'ları css/tokens.css ile birebir (ham hex kopyası uyumsuzsa FAIL).
   Çalıştırma: npm run test:edu-kit   (PORT=8773 ile: 8000/8765 başka koşularda dolu olabilir)
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { test: base, expect } = require('@playwright/test');
const { getActiveSlugs } = require('./helpers/slugs');
const { seedGuest } = require('./helpers/guest-seed');
const tolerated = require('./helpers/tolerated-404');

const ROOT = path.resolve(__dirname, '..');
const GAMES_DIR = path.join(ROOT, 'games');
const MIN_KIT_GAMES = 20;
const SOAK_MS = 1500;   // init/ilk kare hatalarını toplama penceresi (smoke 3 sn; burada oyun başına 3 test)
const CSP_META = '<meta http-equiv="Content-Security-Policy" content="script-src \'self\'">';
const CSP_VIOLATION_RE = /Content Security Policy|Refused to execute inline script/i;
const CRITICAL_RESOURCE_TYPES = new Set(['document', 'script', 'stylesheet', 'xhr', 'fetch']);

/** index.html'i edu-kit'i yükleyen oyun slug'ları (sıralı). */
function kitSlugs() {
    return fs.readdirSync(GAMES_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
        .map((d) => d.name)
        .filter((slug) => {
            const file = path.join(GAMES_DIR, slug, 'index.html');
            return fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes('../_shared/edu-kit.js');
        })
        .sort();
}

const slugs = kitSlugs();
const { solo, online } = getActiveSlugs();
const allLockKeys = [...solo, ...online.map((id) => 'mp:' + id)];

// ── Fixture'lar: misafir tohumu + hata toplayıcı (tests/smoke.spec.js ile aynı kurallar) ──
const test = base.extend({
    context: async ({ context }, use) => {
        await seedGuest(context, allLockKeys);
        await use(context);
    },

    errors: async ({ page }, use, testInfo) => {
        const pageErrors = [];
        const consoleErrors = [];
        const cspViolations = [];
        const critical404 = [];

        page.on('pageerror', (err) => pageErrors.push(err.stack || String(err)));
        page.on('console', (msg) => {
            if (msg.type() !== 'error') return;
            const text = msg.text();
            const url = (msg.location() && msg.location().url) || '';
            if (CSP_VIOLATION_RE.test(text)) { cspViolations.push(text); return; }
            const hubImg = text.match(/^\[Hub\] Kaynak yüklenemedi: (?:IMG|IMAGE|img) (\S+)/);
            if (hubImg) { tolerated.record({ url: hubImg[1], test: testInfo.title }); return; }
            if (/^Failed to load resource/.test(text) && /status of 404\b/.test(text)) {
                tolerated.record({ url, test: testInfo.title });
                return;
            }
            consoleErrors.push(url ? `${text}  @ ${url}` : text);
        });
        page.on('response', (res) => {
            if (res.status() !== 404) return;
            const type = res.request().resourceType();
            if (CRITICAL_RESOURCE_TYPES.has(type)) critical404.push(`${type} 404 → ${res.url()}`);
        });

        await use({
            cspViolations,
            assertClean() {
                expect.soft(pageErrors, 'yakalanmamış JS hatası (pageerror)').toEqual([]);
                expect.soft(consoleErrors, 'console.error (404 dışı)').toEqual([]);
                expect.soft(critical404, 'kritik kaynak 404 (document/script/stylesheet/xhr/fetch)').toEqual([]);
            },
        });
    },
});

/** Oyun belgesinde (frame) kit ve satır içi script durumunu okur. */
async function probeFrame(frame) {
    return frame.evaluate(() => ({
        version: window.EduKit && window.EduKit.version,
        inlineScripts: document.querySelectorAll('script:not([src]):not([type="application/ld+json"])').length,
        kitCss: !!document.querySelector('link[href*="_shared/edu-kit.css"]'),
        storage: !!(window.storage && typeof window.storage.get === 'function' && typeof window.storage.set === 'function'),
    }));
}

async function expectKitFrame(frame, slug) {
    await expect.poll(async () => (await probeFrame(frame)).version, `${slug}: EduKit yüklenmeli`).toMatch(/^\d+\.\d+\.\d+$/);
    const p = await probeFrame(frame);
    expect(p.inlineScripts, `${slug}: satır içi <script> kalmamalı (JSON-LD hariç)`).toBe(0);
    expect(p.kitCss, `${slug}: ../_shared/edu-kit.css bağlanmalı`).toBe(true);
    expect(p.storage, `${slug}: window.storage köprüsü (get/set) kurulmalı`).toBe(true);
}

/** Hub'daki oyun iframe'ini (games/<slug>/index.html) bulur. */
async function hubGameFrame(page, slug) {
    const el = page.locator('#game-area iframe');
    await expect(el, `${slug}: hub #game-area içinde iframe açılmalı`).toBeAttached();
    await expect.poll(() => page.frames().some((f) => f.url().includes(`/games/${slug}/`)), `${slug}: iframe games/${slug}/ yüklenmeli`).toBe(true);
    return page.frames().find((f) => f.url().includes(`/games/${slug}/`));
}

/** Yanıta geçici CSP meta'sı (+ isteğe bağlı yoklama betiği) enjekte eder. Dosyaya dokunmaz. */
async function routeWithCsp(page, slug, extraHtml = '') {
    await page.route((url) => url.pathname === `/games/${slug}/` || url.pathname === `/games/${slug}/index.html`, async (route) => {
        const res = await route.fetch();
        let body = await res.text();
        expect(body, `${slug}: yanıt <head> içermeli`).toContain('<head>');
        body = body.replace('<head>', '<head>' + CSP_META);
        if (extraHtml) body = body.replace('</body>', extraHtml + '</body>');
        await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
    });
}

test('kapsam: en az 20 oyun edu-kit kullanıyor', async () => {
    test.info().annotations.push({ type: 'edu-kit-slugs', description: slugs.join(', ') });
    console.log(`EduKit kapsamı (${slugs.length}): ${slugs.join(', ')}`);
    expect(slugs.length, 'games/*/index.html içinde ../_shared/edu-kit.js yükleyen oyun sayısı').toBeGreaterThanOrEqual(MIN_KIT_GAMES);
    for (const slug of slugs) {
        expect(fs.existsSync(path.join(GAMES_DIR, slug, 'game.js')), `${slug}: games/${slug}/game.js olmalı`).toBe(true);
        expect(solo.includes(slug), `${slug}: data/games.json'da aktif solo oyun olmalı (derin bağlantı testi için)`).toBe(true);
    }
});

test('edu-kit.css :root token değerleri css/tokens.css ile birebir', async () => {
    const parseRoot = (file) => {
        const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        const root = /:root\s*\{([\s\S]*?)\n\}/.exec(css);
        expect(root, `${path.basename(file)}: :root bloğu`).not.toBeNull();
        const out = {};
        for (const m of root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim().replace(/\s+/g, ' ');
        return out;
    };
    const kit = parseRoot(path.join(GAMES_DIR, '_shared', 'edu-kit.css'));
    const tokens = parseRoot(path.join(ROOT, 'css', 'tokens.css'));
    const names = Object.keys(kit);
    expect(names.length, 'kit :root token sayısı').toBeGreaterThan(10);
    const mismatches = names
        .filter((n) => tokens[n] !== kit[n])
        .map((n) => `${n}: kit=${kit[n]} tokens.css=${tokens[n] === undefined ? '(yok)' : tokens[n]}`);
    expect(mismatches, 'edu-kit.css yalnız tokens.css değerlerini kopyalar (ad ve değer birebir)').toEqual([]);
    // Ham hex yalnız :root kopyasında: dosyanın geri kalanında hex yok
    const rest = fs.readFileSync(path.join(GAMES_DIR, '_shared', 'edu-kit.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/:root\s*\{[\s\S]*?\n\}/, '');
    expect(rest.match(/#[0-9a-f]{3,8}\b/gi) || [], 'edu-kit.css: :root dışında ham hex yok').toEqual([]);
});

test.describe('Hub derin bağlantısı (/?oyun=<slug>): iframe içinde EduKit, satır içi script 0', () => {
    for (const slug of slugs) {
        test(`${slug} (hub)`, async ({ page, errors }) => {
            await page.goto(`/?oyun=${slug}`);
            await expect(page.locator('#game-container'), `oyun görünümü açılmalı: ${slug}`).toBeVisible();
            const frame = await hubGameFrame(page, slug);
            await expectKitFrame(frame, slug);
            await page.waitForTimeout(SOAK_MS);
            errors.assertClean();
        });
    }
});

test.describe('Bağımsız açılış (/games/<slug>/): kit hub olmadan çalışır', () => {
    for (const slug of slugs) {
        test(`${slug} (bağımsız)`, async ({ page, errors }) => {
            await page.goto(`/games/${slug}/`);
            await expectKitFrame(page.mainFrame(), slug);
            await page.waitForTimeout(SOAK_MS);
            errors.assertClean();
        });
    }
});

test.describe('CSP provası: script-src \'self\' altında satır içi ihlal 0', () => {
    for (const slug of slugs) {
        test(`${slug} (CSP)`, async ({ page, errors }) => {
            await routeWithCsp(page, slug);
            await page.goto(`/games/${slug}/`);
            expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').count(), 'geçici CSP meta enjekte edilmiş olmalı').toBe(1);
            await expectKitFrame(page.mainFrame(), slug);
            await page.waitForTimeout(SOAK_MS);
            expect(errors.cspViolations, `${slug}: CSP ihlali (satır içi script) olmamalı`).toEqual([]);
            errors.assertClean();
        });
    }

    test('provanın kendisi: enjekte edilen satır içi yoklama betiği ihlal üretir', async ({ page, errors }) => {
        const slug = slugs[0];
        await routeWithCsp(page, slug, '<script>window.__inlineProbe = 1;</script>');
        await page.goto(`/games/${slug}/`);
        await expect.poll(async () => (await probeFrame(page.mainFrame())).version, 'kit (src betiği) CSP altında yüklenmeli').toMatch(/^\d+\.\d+\.\d+$/);
        await expect.poll(() => errors.cspViolations.length, 'yoklama betiği CSP tarafından engellenmeli').toBe(1);
        expect(await page.evaluate(() => window.__inlineProbe), 'yoklama betiği çalışmamalı').toBeUndefined();
        expect((await probeFrame(page.mainFrame())).inlineScripts, 'yoklama betiği belgede satır içi sayılmalı (sayaç çalışıyor)').toBe(1);
    });
});
