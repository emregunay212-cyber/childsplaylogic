/* ============================================
   BilnetBridge testi (Faz 2 / B6) — iframe oyunlarının Firebase'i hub köprüsünden alması.
   Köprü: js/firebase-config.js `window.BilnetBridge = { firebase, db, ready(), uid(), displayName() }`.
   Kapsam (ağa çıkmayan, deterministik; canlı RTDB'li iki cihaz testi ayrı: tests/bridge-live.spec.js):
     1. Köprü API şekli: ready() asla reddetmez (db ya da null), uid() misafirde null, displayName() 'Oyuncu'.
     2. Hub derin bağlantısı /?oyun=kelimelik|son-kart → iframe'de `firebase` globali YOK, gstatic
        firebase-*-compat.js isteği iframe'den 0 (yalnız hub'dan); online düğmeleri hub bağlantısına göre
        (FIREBASE_OK → açık; değilse devre dışı + "bağlanamıyoruz" metni); JS hatası 0.
     3. Bağımsız açılış /games/kelimelik/, /games/son-kart/ (Karar 6): online düğmeleri devre dışı +
        "Bilnet Oyun içinden oynanır" + /?oyun=<slug> bağlantısı; Son Kart solo bir hamle oynanır; JS hatası 0.
     4. CSP provası (tests/edu-kit.spec.js ile aynı yöntem): 4 iframe sayfasına geçici
        `script-src 'self'` meta'sı enjekte → satır içi ihlal sayısı envanterle (CSP_INLINE) birebir:
        kelimelik 0, son-kart 0, ates-buz 0, hava-hokeyi 1 (tüm oyun tek satır içi blok — B9 taşır).
        Envanter değişirse (B9) sayılar burada güncellenir; artış = gerileme.
     5. three.js r128 tek kopya: LEGO World (hub) ve Kelime Madeni 3D (bağımsız sayfa) THREE'yi
        js/lib/three.r128.min.js'ten yükler; CDN isteği 0, REVISION 128, GLTFLoader THREE'ye bağlı.
   Çalıştırma: npm run test:bridge   (PORT=8782 ile: 8000/8765/8773 başka koşularda dolu olabilir)
   ============================================ */
'use strict';

const { test: base, expect } = require('@playwright/test');
const { getActiveSlugs } = require('./helpers/slugs');
const { seedGuest } = require('./helpers/guest-seed');
const tolerated = require('./helpers/tolerated-404');

const BRIDGE_GAMES = ['kelimelik', 'son-kart'];          // SDK'yı eskiden kendileri yükleyen iki iframe oyunu
const CSP_INLINE = { kelimelik: 0, 'son-kart': 0, 'ates-buz': 0, 'hava-hokeyi': 1 };   // B6 sonrası satır içi blok envanteri
const SOAK_MS = 1500;
const CSP_META = '<meta http-equiv="Content-Security-Policy" content="script-src \'self\'">';
const CSP_VIOLATION_RE = /Content Security Policy|Refused to execute inline script/i;
const CRITICAL_RESOURCE_TYPES = new Set(['document', 'script', 'stylesheet', 'xhr', 'fetch']);
const FIREBASE_SDK_RE = /gstatic\.com\/firebasejs\/.*firebase-[a-z-]+-compat\.js/;

const { solo, online } = getActiveSlugs();
const allLockKeys = [...solo, ...online.map((id) => 'mp:' + id)];

// ── Fixture'lar: misafir tohumu + hata toplayıcı (tests/edu-kit.spec.js ile aynı kurallar) ──
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

/** Hub'daki oyun iframe'ini (games/<slug>/index.html) bulur. */
async function hubGameFrame(page, slug) {
    const el = page.locator('#game-area iframe');
    await expect(el, `${slug}: hub #game-area içinde iframe açılmalı`).toBeAttached();
    await expect.poll(() => page.frames().some((f) => f.url().includes(`/games/${slug}/`)), `${slug}: iframe games/${slug}/ yüklenmeli`).toBe(true);
    return page.frames().find((f) => f.url().includes(`/games/${slug}/`));
}

/** Menüdeki online kontrollerinin durumu (oyun bağımsız seçiciler). */
async function onlineControls(frame, slug) {
    if (slug === 'kelimelik') {
        await expect(frame.locator('.kl-menu'), 'kelimelik menüsü').toBeVisible();
        return frame.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('.kl-menu .kl-mbtn')).filter((b) => /Hızlı Eşleş|Oda Kur|Katıl/.test(b.textContent));
            const inp = document.getElementById('kl-joincode');
            const warn = document.querySelector('.kl-warn');
            const link = document.querySelector('.kl-hublink');
            return {
                count: btns.length,
                disabled: btns.every((b) => b.disabled) && !!inp && inp.disabled,
                enabled: btns.every((b) => !b.disabled) && !!inp && !inp.disabled,
                warn: warn ? warn.textContent : '',
                link: link ? link.getAttribute('href') : null,
                firebaseGlobal: typeof window.firebase,
            };
        });
    }
    await expect(frame.locator('#screen-menu.active'), 'son-kart menüsü').toBeVisible();
    return frame.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('#screen-menu .sk-btn')).filter((b) => /Hızlı Eşleş|Oda Kur|Katıl/.test(b.textContent));
        const inp = document.querySelector('#screen-menu .sk-field input');
        const warn = document.querySelector('.sk-hubnote');
        const link = document.querySelector('.sk-hublink');
        return {
            count: btns.length,
            disabled: btns.every((b) => b.disabled) && !!inp && inp.disabled,
            enabled: btns.every((b) => !b.disabled) && !!inp && !inp.disabled,
            warn: warn ? warn.textContent : '',
            link: link ? link.getAttribute('href') : null,
            firebaseGlobal: typeof window.firebase,
        };
    });
}

/** Yanıta geçici CSP meta'sı enjekte eder (dosyaya dokunmaz). */
async function routeWithCsp(page, slug) {
    await page.route((url) => url.pathname === `/games/${slug}/` || url.pathname === `/games/${slug}/index.html`, async (route) => {
        const res = await route.fetch();
        let body = await res.text();
        expect(body, `${slug}: yanıt <head> içermeli`).toContain('<head>');
        body = body.replace('<head>', '<head>' + CSP_META);
        await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
    });
}

test('köprü API: BilnetBridge { firebase, db, ready, uid, displayName }, ready() reddetmez', async ({ page, errors }) => {
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => typeof window.BilnetBridge), 'js/firebase-config.js yüklenmeli').toBe('object');
    const probe = await page.evaluate(async () => {
        const b = window.BilnetBridge;
        if (!b) return { present: false };
        let readyResult = 'reject';
        try { const db = await b.ready(); readyResult = db ? 'db' : 'null'; } catch (e) { readyResult = 'reject'; }
        return {
            present: true,
            keys: Object.keys(b).sort(),
            readyResult,
            readyMatchesFlag: readyResult === (window.FIREBASE_OK ? 'db' : 'null'),
            uid: b.uid(),
            name: b.displayName(),
            firebaseOk: !!window.FIREBASE_OK,
        };
    });
    test.info().annotations.push({ type: 'bridge', description: JSON.stringify(probe) });
    expect(probe.present, 'window.BilnetBridge tanımlı olmalı').toBe(true);
    expect(probe.keys).toEqual(['db', 'displayName', 'firebase', 'ready', 'uid']);
    expect(probe.readyResult, 'ready() asla reddetmez: db ya da null').not.toBe('reject');
    expect(probe.readyMatchesFlag, 'ready() sonucu FIREBASE_OK ile tutarlı (açık → db, kapalı → null)').toBe(true);
    expect(probe.uid, 'misafirde (B7 öncesi) uid null').toBeNull();
    expect(probe.name, 'ad kaynağı yoksa Oyuncu').toBe('Oyuncu');
    errors.assertClean();
});

test.describe('Hub derin bağlantısı: SDK yalnız hub yükler, iframe köprüden alır', () => {
    for (const slug of BRIDGE_GAMES) {
        test(`${slug} (hub)`, async ({ page, errors }) => {
            const sdkByFrame = { hub: 0, iframe: 0 };
            page.on('request', (req) => {
                if (!FIREBASE_SDK_RE.test(req.url())) return;
                const f = req.frame();
                if (f === page.mainFrame()) sdkByFrame.hub++; else sdkByFrame.iframe++;
            });
            await page.goto(`/?oyun=${slug}`);
            await expect(page.locator('#game-container'), `oyun görünümü açılmalı: ${slug}`).toBeVisible();
            const frame = await hubGameFrame(page, slug);
            const firebaseOk = await page.evaluate(() => !!window.FIREBASE_OK);
            const c = await onlineControls(frame, slug);
            test.info().annotations.push({ type: 'network', description: `firebase-*-compat.js: hub=${sdkByFrame.hub} iframe=${sdkByFrame.iframe}; FIREBASE_OK=${firebaseOk}` });
            expect(c.count, 'online kontrolleri çizilmeli (Hızlı Eşleş, Oda Kur, Katıl)').toBe(3);
            expect(c.firebaseGlobal, 'iframe kendi Firebase SDK\'sını yüklememeli').toBe('undefined');
            expect(sdkByFrame.iframe, 'gstatic firebase-*-compat.js isteği iframe\'den 0').toBe(0);
            if (firebaseOk) {
                expect(sdkByFrame.hub, 'SDK yalnız hub\'dan (3 dosya)').toBeGreaterThanOrEqual(3);
                expect(c.enabled, 'hub bağlıyken online düğmeleri açık').toBe(true);
                expect(c.link, 'hub içinde hub bağlantısı gösterilmez').toBeNull();
            } else {
                // Ağ/gstatic kapalı ortam: köprü null verir → düğmeler devre dışı + maskot metni (bağlantı yok, hub linki yok)
                expect(c.disabled, 'hub çevrimdışıyken online düğmeleri devre dışı').toBe(true);
                expect(c.warn, 'çevrimdışı metni').toContain('bağlanamıyoruz');
                expect(c.link).toBeNull();
            }
            await page.waitForTimeout(SOAK_MS);
            errors.assertClean();
        });
    }
});

test.describe('Bağımsız açılış (/games/<slug>/): online yok, hub bağlantısı var (Karar 6)', () => {
    for (const slug of BRIDGE_GAMES) {
        test(`${slug} (bağımsız)`, async ({ page, errors }) => {
            await page.goto(`/games/${slug}/`);
            const c = await onlineControls(page.mainFrame(), slug);
            expect(c.count).toBe(3);
            expect(c.firebaseGlobal, 'bağımsız sayfada Firebase SDK yok').toBe('undefined');
            expect(c.disabled, 'online düğmeleri + kod alanı devre dışı').toBe(true);
            expect(c.warn, 'yönlendirme metni').toContain('Bilnet Oyun içinden oynanır');
            expect(c.warn, 'uzun tire yok (tasarım sözleşmesi)').not.toMatch(/[—–]/);
            expect(c.link, 'hub derin bağlantısı').toBe(`/?oyun=${slug}`);
            await page.waitForTimeout(SOAK_MS);
            errors.assertClean();
        });
    }

    test('son-kart (bağımsız): solo mod oynanır — bota karşı bir hamle', async ({ page, errors }) => {
        await page.goto('/games/son-kart/');
        await page.getByRole('button', { name: 'Bota Karşı Oyna' }).click();
        await expect(page.locator('#screen-game.active'), 'oyun ekranı').toBeVisible();
        const hand = page.locator('.sk-hand .sk-card');
        await expect.poll(() => hand.count(), 'el dağıtılmalı').toBeGreaterThanOrEqual(7);
        // Sıra bizde: oynanabilir kart varsa oyna, yoksa deste'den çek (her iki yol da bir hamledir)
        await expect(page.locator('.sk-hand.myturn'), 'ilk sıra insanda').toBeVisible();
        const before = await hand.count();
        const playable = page.locator('.sk-hand .sk-card.playable');
        if (await playable.count()) {
            await playable.first().click();
            const colorModal = page.locator('#sk-colormodal.show');
            if (await colorModal.isVisible().catch(() => false)) await colorModal.locator('button').first().click();
            await expect.poll(() => hand.count(), 'kart oynanınca el azalmalı').toBe(before - 1);
        } else {
            await page.locator('.sk-draw-card').click();
            await expect.poll(() => hand.count(), 'çekince el artmalı').toBe(before + 1);
        }
        await page.waitForTimeout(SOAK_MS);
        errors.assertClean();
    });
});

test.describe('three.js r128 tek kopya: js/lib/three.r128.min.js (B6)', () => {
    const THREE_LOCAL_RE = /\/js\/lib\/three\.r128\.min\.js(?:[?#]|$)/;
    const THREE_CDN_RE = /cdnjs\.cloudflare\.com|unpkg\.com/;

    test('LEGO World (hub, tembel yükleme): THREE r128 yerel dosyadan, CDN isteği 0', async ({ page, errors }) => {
        const reqs = { local: 0, cdn: 0 };
        page.on('request', (req) => {
            if (THREE_LOCAL_RE.test(req.url())) reqs.local++;
            if (THREE_CDN_RE.test(req.url())) reqs.cdn++;
        });
        await page.goto('/?oyun=lego-world');
        await expect(page.locator('#game-container')).toBeVisible();
        await expect.poll(() => page.evaluate(() => (window.THREE && window.THREE.REVISION) || null), 'THREE tanımlı olmalı').toBe('128');
        expect(await page.evaluate(() => typeof (window.THREE && window.THREE.GLTFLoader)), 'GLTFLoader THREE üstüne bağlanmalı (sıra: three → loader)').toBe('function');
        expect(reqs.local, 'js/lib/three.r128.min.js istendi').toBe(1);
        expect(reqs.cdn, 'CDN (cdnjs/unpkg) isteği').toBe(0);
        await page.waitForTimeout(SOAK_MS);
        errors.assertClean();
    });

    test('Kelime Madeni 3D (kapalı oyun, bağımsız sayfa): aynı dosya ../../js/lib/ üzerinden', async ({ page, errors }) => {
        const reqs = { local: 0, cdn: 0, other: [] };
        page.on('request', (req) => {
            if (THREE_LOCAL_RE.test(req.url())) reqs.local++;
            else if (THREE_CDN_RE.test(req.url())) reqs.cdn++;
            else if (/three/i.test(req.url())) reqs.other.push(req.url());
        });
        await page.goto('/games/kelime-madeni-3d/');
        await expect.poll(() => page.evaluate(() => (window.THREE && window.THREE.REVISION) || null), 'THREE tanımlı olmalı').toBe('128');
        expect(reqs.local).toBe(1);
        expect(reqs.cdn).toBe(0);
        expect(reqs.other, 'başka bir three kopyası istenmemeli (eski games/kelime-madeni-3d/three.min.js silindi)').toEqual([]);
        await page.waitForTimeout(SOAK_MS);
        errors.assertClean();
    });
});

test.describe('CSP provası: script-src \'self\' altında satır içi ihlal envanteri', () => {
    for (const slug of Object.keys(CSP_INLINE)) {
        test(`${slug} (CSP): satır içi ihlal ${CSP_INLINE[slug]}`, async ({ page, errors }) => {
            await routeWithCsp(page, slug);
            await page.goto(`/games/${slug}/`);
            expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').count(), 'geçici CSP meta enjekte edilmiş olmalı').toBe(1);
            await page.waitForTimeout(SOAK_MS);
            const inlineScripts = await page.evaluate(() => document.querySelectorAll('script:not([src]):not([type="application/ld+json"])').length);
            test.info().annotations.push({ type: 'csp', description: `${slug}: satır içi <script> ${inlineScripts}, ihlal ${errors.cspViolations.length}` });
            expect(inlineScripts, `${slug}: belgede satır içi <script> sayısı envanterle aynı`).toBe(CSP_INLINE[slug]);
            expect(errors.cspViolations.length, `${slug}: CSP satır içi ihlal sayısı envanterle aynı (B9 hedefi 0)`).toBe(CSP_INLINE[slug]);
        });
    }
});
