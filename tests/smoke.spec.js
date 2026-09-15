/* ============================================
   Duman testi — her aktif oyun derin bağlantıyla (`/?oyun=<slug>`) açılır,
   3 sn çalışır; yakalanmamış JS hatası ya da (404 dışı) console.error → FAIL.
   + admin.html giriş formu, + oyunlar/index.html bağlantı sayısı.

   Kurulum tarayıcı UI'sı üzerinden değil, depolama tohumuyla yapılır (hızlı, deterministik):
   - sessionStorage bo_guest_mode=1 → giriş kartı atlanır (js/auth.js resumeGuest)
   - localStorage oyun_bahcesi_progress → tüm kilitler öğretmen-izniyle açık; böylece
     test canlı adminConfig'e ("auto"/"unlock") bağımlı değildir. Yalnız açık admin
     "lock" bir oyunu hub'a geri atar — o da gerçek bir durumdur, test onu gösterir.
   - localStorage oyun_bahcesi_lastResetToken → canlı resetToken tohumu silmesin.
   ============================================ */
'use strict';

const { test: base, expect } = require('@playwright/test');
const { getActiveSlugs } = require('./helpers/slugs');
const tolerated = require('./helpers/tolerated-404');

// Depolama anahtarları — kaynak: js/auth.js:11, js/progress.js:6, js/app.js applyAdminConfig
const GUEST_KEY = 'bo_guest_mode';
const PROGRESS_KEY = 'oyun_bahcesi_progress';
const RESET_TOKEN_KEY = 'oyun_bahcesi_lastResetToken';

// Oyun açıldıktan sonra hata toplamak için gözlem penceresi. Senkronizasyon beklemesi
// DEĞİL (görünürlük ayrıca koşulla beklenir); init/ilk kare hatalarını yakalamak için.
const SOAK_MS = 3000;
const MIN_LANDING_LINKS = 50;

// 404'ü tolere ETMEDİĞİMİZ kaynak türleri: sayfa/betik/stil/veri eksikse oyun bozuktur.
const CRITICAL_RESOURCE_TYPES = new Set(['document', 'script', 'stylesheet', 'xhr', 'fetch']);

const { solo, online, skipped } = getActiveSlugs();
const allLockKeys = [...solo, ...online.map((id) => 'mp:' + id)];

// Derin bağlantı: aynı slug hem solo hem online ise (kod-macerasi, satranc) js/app.js
// tryDeepLink SOLO'yu açar → online sürüm yalnız hub kartından açılabilir.
const deepLinkTargets = [
    ...solo.map((slug) => ({ slug, kind: 'solo' })),
    ...online.filter((slug) => !solo.includes(slug)).map((slug) => ({ slug, kind: 'online' })),
];
const hubOnlyOnline = online.filter((slug) => solo.includes(slug));

// ── Fixture'lar: misafir oturumu tohumu + hata toplayıcı ──
const test = base.extend({
    context: async ({ context }, use) => {
        await context.addInitScript(({ guestKey, progressKey, resetKey, lockKeys }) => {
            const teacherUnlocks = Object.fromEntries(lockKeys.map((k) => [k, true]));
            const progress = { version: 1, games: {}, totalStars: 0, settings: { soundEnabled: true, teacherUnlocks } };
            try { sessionStorage.setItem(guestKey, '1'); } catch (e) { /* depolama kapalıysa giriş kartı görünür → test bunu yakalar */ }
            try {
                localStorage.setItem(progressKey, JSON.stringify(progress));
                localStorage.setItem(resetKey, String(Number.MAX_SAFE_INTEGER));
            } catch (e) { /* aynı */ }
        }, { guestKey: GUEST_KEY, progressKey: PROGRESS_KEY, resetKey: RESET_TOKEN_KEY, lockKeys: allLockKeys });
        await use(context);
    },

    errors: async ({ page }, use, testInfo) => {
        const pageErrors = [];
        const consoleErrors = [];
        const critical404 = [];

        page.on('pageerror', (err) => pageErrors.push(err.stack || String(err)));
        page.on('console', (msg) => {
            if (msg.type() !== 'error') return;
            const text = msg.text();
            const url = (msg.location() && msg.location().url) || '';
            if (/^Failed to load resource/.test(text) && /status of 404\b/.test(text)) {
                tolerated.record({ url, test: testInfo.title });   // kritik olanı 'response' dinleyicisi ayrıca düşürür
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
            assertClean() {
                expect.soft(pageErrors, 'yakalanmamış JS hatası (pageerror)').toEqual([]);
                expect.soft(consoleErrors, 'console.error (404 dışı)').toEqual([]);
                expect.soft(critical404, 'kritik kaynak 404 (document/script/stylesheet/xhr/fetch)').toEqual([]);
            },
        });
    },
});

async function expectGameViewOpen(page, slug, kind) {
    await expect(page.locator('#login-screen'), 'giriş kartı kapalı olmalı (misafir tohumu)').toBeHidden();
    await expect(page.locator('#game-container'), `oyun görünümü açılmalı: ${slug} (kilit/admin "lock"?)`).toBeVisible();
    await expect(page.locator('#hub'), 'hub gizlenmeli').toBeHidden();
    await expect(page.locator('#game-area > *').first(), 'oyun #game-area içine bir şey çizmeli').toBeAttached();
    if (kind === 'solo') {
        // js/app.js startGame → body[data-active-game]; js/engine.js → #game-title = TR.games[id]
        await expect(page.locator('body')).toHaveAttribute('data-active-game', slug);
        await expect(page.locator('#game-title')).not.toBeEmpty();
    }
}

test.describe('Oyunlar derin bağlantıyla açılır (/?oyun=<slug>)', () => {
    for (const { slug, kind } of deepLinkTargets) {
        test(`${slug} (${kind})`, async ({ page, errors }) => {
            await page.goto(`/?oyun=${slug}`);
            await expectGameViewOpen(page, slug, kind);
            await page.waitForTimeout(SOAK_MS);   // gözlem penceresi (bkz. SOAK_MS)
            errors.assertClean();
        });
    }
});

test.describe('Online sürümü yalnız hub kartından açılan oyunlar', () => {
    for (const slug of hubOnlyOnline) {
        test(`${slug} (online, hub → Online sekmesi → kart)`, async ({ page, errors }) => {
            await page.goto('/');
            await expect(page.locator('#hub')).toBeVisible();
            await page.locator('#hub-nav-scroll .hub-nav-chip[data-cat="mp"]').click();
            const card = page.locator(`#hub-grid .game-card[data-game="${slug}"]`);
            await expect(card, 'online kart kilitsiz olmalı (öğretmen izni tohumlandı)').not.toHaveClass(/\b(locked|coming-soon)\b/);
            await card.click();
            await expectGameViewOpen(page, slug, 'online');
            await expect(page.locator('#game-area .lobby-main'), 'Lobby ana menüsü çizilmeli').toBeVisible();
            await page.waitForTimeout(SOAK_MS);
            errors.assertClean();
        });
    }
});

test('admin.html: giriş formu görünür, JS hatası yok', async ({ page, errors }) => {
    await page.goto('/admin.html');
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#panel-view')).toBeHidden();
    await page.waitForTimeout(SOAK_MS);   // auth durumu asenkron çözülür; geç hataları da yakala
    errors.assertClean();
});

test(`oyunlar/index.html: en az ${MIN_LANDING_LINKS} oyun sayfası bağlantısı`, async ({ page, errors }) => {
    await page.goto('/oyunlar/');
    const hrefs = await page.locator('a[href^="/oyunlar/"]').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
    const gamePages = new Set(hrefs.filter((h) => /^\/oyunlar\/[a-z0-9-]+\/$/.test(h)));
    expect(gamePages.size, 'benzersiz /oyunlar/<slug>/ bağlantısı').toBeGreaterThanOrEqual(MIN_LANDING_LINKS);
    errors.assertClean();
});

test('katalog: comingSoon ile atlanan slug listesi raporlanır', async () => {
    // Bilgi amaçlı: kapsam dışı bırakılanları koşu çıktısında görünür kıl (sessiz atlama olmasın).
    test.info().annotations.push({ type: 'skipped-slugs', description: skipped.join(', ') || '(yok)' });
    console.log(`Duman testi kapsamı: ${deepLinkTargets.length} derin bağlantı + ${hubOnlyOnline.length} hub kartı; atlanan (comingSoon): ${skipped.join(', ') || '(yok)'}`);
    expect(deepLinkTargets.length + hubOnlyOnline.length).toBe(solo.length + online.length);
});
