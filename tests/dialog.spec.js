/* ============================================
   Dialog sistemi testleri (Faz 2 / B3) — js/dialog.js + dört katman
   --------------------------------------------
   Katman başına: aç → document.activeElement içeride; Tab ×20 → odak içeride kalır; Escape → kapanır
   ve odak tetikleyiciye döner (seviye tamamlama HARİÇ: Escape kapatmaz, çocuk kazara çıkmasın);
   arka plan inert (yedek yolda aria-hidden). Erişilebilirlik ağacı: getByRole('dialog') + erişilebilir ad
   (aria-labelledby) + ariaSnapshot — kanıt docs/inceleme-2026-09-15/kanit/B3-a11y.md.

   Kurulum tests/smoke.spec.js ile aynı (depolama tohumu, tests/helpers/guest-seed.js). Farkı:
   - Firebase CDN'i (gstatic) engellenir → js/firebase-config.js FIREBASE_OK=false → misafir modu yerelden
     sürer, canlı adminConfig kilit override'ı gelmez → `tetris` (data/games.json stars:10) DAİMA kilitli
     (öğretmen izni tohumundan bilerek çıkarılır). Test canlı RTDB'ye dokunmaz.
   - Seviye tamamlama /?oyun=sayi-sayma açılıp GameEngine.onComplete(3) doğrudan çağrılarak tetiklenir
     (oyunu oynamak yerine; motor 400 ms sonra kutlamayı açar).
   - "Yedek yol" (showModal yok: eski Safari/Chrome, Karar 10) addInitScript ile HTMLDialogElement
     showModal/show ve HTMLElement inert silinerek AYNI Chromium'da koşulur.
   Çalıştırma: npm run test:dialog (PORT=8765 ile başka port).
   ============================================ */
'use strict';

const { test: base, expect } = require('@playwright/test');
const { getActiveSlugs } = require('./helpers/slugs');
const { seedGuest } = require('./helpers/guest-seed');

const LOCKED_SLUG = 'tetris';                 // data/games.json stars:10 → yıldız 0 + öğretmen izni yok = kilitli
// B2b: aynı oyun yaş aralığının kestiği her rafta görünür (tetris 6-10 → üç raf) → ilk raf kartı (.first()) kullanılır
const LEVEL_GAME = 'sayi-sayma';              // çok seviyeli solo oyun (levels > 1)
const TAB_ROUNDS = 20;
const CELEBRATE_DELAY_MS = 400;               // js/engine.js onComplete → showLevelComplete gecikmesi

const { solo, online } = getActiveSlugs();
const allLockKeys = [...solo, ...online.map((id) => 'mp:' + id)].filter((k) => k !== LOCKED_SLUG);

const test = base.extend({
    context: async ({ context }, use) => {
        await seedGuest(context, allLockKeys);
        // Firebase yok → yerel kilit mantığı, canlı adminConfig yok (deterministik kilitli kart)
        await context.route(/https:\/\/www\.gstatic\.com\/firebasejs\//, (route) => route.abort());
        await use(context);
    },
    errors: async ({ page }, use) => {
        const pageErrors = [];
        const consoleErrors = [];
        page.on('pageerror', (err) => pageErrors.push(err.stack || String(err)));
        page.on('console', (msg) => {
            if (msg.type() !== 'error') return;
            const text = msg.text();
            if (/Failed to load resource|Kaynak yüklenemedi|net::ERR_FAILED/.test(text)) return;   // engellenen CDN / görsel 404
            consoleErrors.push(text);
        });
        await use({
            assertClean() {
                expect.soft(pageErrors, 'yakalanmamış JS hatası').toEqual([]);
                expect.soft(consoleErrors, 'console.error').toEqual([]);
            },
        });
    },
});

// ── Yardımcılar ──
const activeInfo = (page) => page.evaluate(() => {
    const a = document.activeElement;
    return a ? { tag: a.tagName, id: a.id, cls: a.className && String(a.className), text: (a.textContent || '').trim().slice(0, 40) } : null;
});
const activeInside = (page, selector) => page.evaluate((sel) => {
    const root = document.querySelector(sel);
    return !!(root && document.activeElement && root.contains(document.activeElement));
}, selector);
const attrs = (page, selector, names) => page.evaluate(({ sel, names }) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const out = {};
    for (const n of names) out[n] = el.getAttribute(n);
    return out;
}, { sel: selector, names });

// Kilitli kart kasıtlı aria-disabled="true" (tıkı bilgi penceresi açar) → Playwright'ın "enabled" bekleyişi atlanır.
// hover(): görünür + kararlı (kaydırma/giriş animasyonu bitmiş) bekler; force tıkı sonra aynı noktaya iner.
const clickLocked = async (card) => {
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await card.click({ force: true });
};

async function tabStaysInside(page, selector) {
    for (let i = 0; i < TAB_ROUNDS; i++) {
        await page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab');   // ara sıra geri de git
        expect(await activeInside(page, selector), `Tab #${i + 1}: odak ${selector} içinde kalmalı`).toBe(true);
    }
}

async function openHub(page) {
    await page.goto('/');
    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(page.locator('#hub')).toBeVisible();
}

async function openGame(page, slug) {
    await page.goto(`/?oyun=${slug}`);
    await expect(page.locator('#game-container')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-active-game', slug);
    await expect(page.locator('#game-area .game-loading')).toHaveCount(0);
    await expect(page.locator('#game-area > *').first()).toBeAttached();
}

async function triggerLevelComplete(page, stars = 3) {
    await page.evaluate((s) => { GameEngine.onComplete(s); }, stars);
    const dlg = page.locator('#level-complete');
    await expect(dlg).toBeVisible({ timeout: CELEBRATE_DELAY_MS + 5000 });
    return dlg;
}

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('1) Kilit penceresi (js/app.js → Dialog, dismissible)', () => {
    test('aç → odak "Tamam", Tab içeride, arka plan inert, Escape kapatır ve odak karta döner', async ({ page, errors }) => {
        await openHub(page);
        const card = page.locator(`#hub-grid .game-card[data-game="${LOCKED_SLUG}"]`).first();
        await expect(card, 'tetris kilitli olmalı (Firebase engelli, öğretmen izni yok)').toHaveClass(/\blocked\b/);
        await clickLocked(card);

        const dlg = page.getByRole('dialog', { name: 'Bu Oyun Kilitli' });
        await expect(dlg).toBeVisible();
        await expect(dlg).toHaveAttribute('aria-modal', 'true');
        expect(await activeInfo(page)).toMatchObject({ tag: 'BUTTON', cls: 'lm-btn' });
        await expect(page.locator('#app'), 'arka plan (#app) inert').toHaveAttribute('inert', '');
        await tabStaysInside(page, 'dialog.lock-modal');

        await page.keyboard.press('Escape');
        await expect(dlg).toBeHidden();
        await expect(page.locator('#app')).not.toHaveAttribute('inert', '');
        expect(await activeInfo(page), 'odak kilitli karta dönmeli').toMatchObject({ cls: expect.stringContaining('game-card') });
        expect(await page.evaluate((s) => document.activeElement.getAttribute('data-game'), LOCKED_SLUG)).toBe(LOCKED_SLUG);
        errors.assertClean();
    });

    test('perdeye tık kapatır; "Tamam" kapatır; klavyeyle açılınca animasyonsuz (.dialog--aninda)', async ({ page, errors }) => {
        await openHub(page);
        const card = page.locator(`#hub-grid .game-card[data-game="${LOCKED_SLUG}"]`).first();
        await clickLocked(card);
        const dlg = page.locator('dialog.lock-modal');
        await expect(dlg).toBeVisible();
        await expect(dlg).not.toHaveClass(/dialog--aninda/);
        await dlg.click({ position: { x: 8, y: 8 } });        // kart dışı = perde
        await expect(dlg).toBeHidden();

        await card.focus();
        await page.keyboard.press('Enter');                    // bindActivate keydown → Dialog.fromKeyboard → animate:false
        await expect(dlg).toBeVisible();
        await expect(dlg).toHaveClass(/dialog--aninda/);
        await page.getByRole('button', { name: 'Tamam', exact: true }).click();
        await expect(dlg).toBeHidden();
        errors.assertClean();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('2) Meta panel (js/bilnet-meta.js → Dialog, dismissible)', () => {
    test('aç → odak "Kapat", ad aria-labelledby, Tab içeride, kardeşler inert, Escape → odak jeton çipine', async ({ page, errors }) => {
        await openHub(page);
        const chip = page.locator('#coin-counter');
        await chip.click();

        const dlg = page.getByRole('dialog', { name: /Eğitsel İlerlemen/ });
        await expect(dlg).toBeVisible();
        await expect(dlg).toHaveAttribute('aria-modal', 'true');
        expect(await activeInfo(page)).toMatchObject({ id: 'mp-close' });
        // #meta-panel #app'in içinde → kardeşleri inert (#app'in kendisi değil: dialog da kilitlenirdi)
        await expect(page.locator('#hub')).toHaveAttribute('inert', '');
        await expect(page.locator('#top-bar')).toHaveAttribute('inert', '');
        await expect(page.locator('#game-container')).toHaveAttribute('inert', '');
        await expect(page.locator('#app')).not.toHaveAttribute('inert', '');
        await tabStaysInside(page, '#meta-panel');

        await page.keyboard.press('Escape');
        await expect(dlg).toBeHidden();
        await expect(page.locator('#hub')).not.toHaveAttribute('inert', '');
        expect(await activeInfo(page)).toMatchObject({ id: 'coin-counter' });
        errors.assertClean();
    });

    test('klavyeyle (Enter) açılınca animasyonsuz; "Kapat" düğmesi kapatır', async ({ page, errors }) => {
        await openHub(page);
        await page.locator('#coin-counter').focus();
        await page.keyboard.press('Enter');
        const dlg = page.locator('#meta-panel');
        await expect(dlg).toBeVisible();
        await expect(dlg).toHaveClass(/dialog--aninda/);
        await page.locator('#mp-close').click();
        await expect(dlg).toBeHidden();
        expect(await activeInfo(page)).toMatchObject({ id: 'coin-counter' });
        errors.assertClean();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('3) Seviye tamamlama (js/engine.js → Dialog, dismissible:false)', () => {
    test('aç → odak "Sonraki Seviye", ad = başlık, Tab içeride, oyun inert, Escape KAPATMAZ, Sonraki → 2. seviye', async ({ page, errors }) => {
        await openGame(page, LEVEL_GAME);
        const dlg = await triggerLevelComplete(page, 3);
        const title = await page.evaluate(() => TR.complete.perfect);
        await expect(page.getByRole('dialog', { name: title })).toBeVisible();
        await expect(dlg).toHaveAttribute('aria-modal', 'true');
        expect(await activeInfo(page)).toMatchObject({ id: 'btn-next' });
        await expect(page.locator('#game-container')).toHaveAttribute('inert', '');
        await expect(page.locator('#top-bar')).toHaveAttribute('inert', '');
        await tabStaysInside(page, '#level-complete');

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(dlg, 'Escape seviye tamamlamayı KAPATMAMALI').toBeVisible();
        expect(await activeInside(page, '#level-complete')).toBe(true);
        await page.keyboard.press('Escape');                 // ikinci Escape de (close watcher) kapatmamalı
        await page.waitForTimeout(300);
        await expect(dlg).toBeVisible();
        await dlg.click({ position: { x: 8, y: 8 } });       // perdeye tık da kapatmaz
        await page.waitForTimeout(200);
        await expect(dlg).toBeVisible();

        await page.locator('#btn-next').click();
        await expect(dlg).toBeHidden();
        await expect(page.locator('#game-container')).not.toHaveAttribute('inert', '');
        expect(await page.evaluate(() => GameEngine.getCurrentLevel())).toBe(2);
        expect(await page.evaluate(() => GameEngine.getState())).toBe('PLAYING');
        errors.assertClean();
    });

    test('son seviyede "Sonraki" gizli → ilk odak "Tekrar Oyna"; "Oyunlar" hub\'a döner ve dialog kapanır', async ({ page, errors }) => {
        await openGame(page, LEVEL_GAME);
        const last = await page.evaluate(() => {
            const g = GameEngine.getCurrentGame();
            GameEngine.startGame(g, g.levels.length);
            return g.levels.length;
        });
        expect(last).toBeGreaterThan(1);
        const dlg = await triggerLevelComplete(page, 2);
        await expect(page.locator('#btn-next')).toBeHidden();
        expect(await activeInfo(page)).toMatchObject({ id: 'btn-replay' });

        await page.locator('#btn-hub').click();
        await expect(dlg).toBeHidden();
        await expect(page.locator('#hub')).toBeVisible();
        await expect(page.locator('#game-container')).toBeHidden();
        await expect(page.locator('#hub')).not.toHaveAttribute('inert', '');
        errors.assertClean();
    });

    test('konfeti kanvası modal açıkken üst katmanda (popover), kapanınca iner', async ({ page, errors }) => {
        await openGame(page, LEVEL_GAME);
        await triggerLevelComplete(page, 3);
        expect(await page.evaluate(() => {
            const c = document.getElementById('particles-canvas');
            return typeof c.showPopover !== 'function' || c.matches(':popover-open');
        }), 'popover API varsa kanvas :popover-open olmalı').toBe(true);
        await page.locator('#btn-replay').click();
        await expect(page.locator('#level-complete')).toBeHidden();
        expect(await page.evaluate(() => document.getElementById('particles-canvas').hasAttribute('popover'))).toBe(false);
        errors.assertClean();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('4) Hesap menüsü (js/auth.js → Dialog modal:false)', () => {
    test('aç → perde/inert yok, odak düğmede kalır; Tab → Çıkış yap; Escape → kapanır, odak düğmede', async ({ page, errors }) => {
        await openHub(page);
        const tog = page.locator('#user-chip .user-toggle');
        const menu = page.locator('#user-chip .user-menu');
        await tog.click();
        await expect(menu).toBeVisible();
        await expect(tog).toHaveAttribute('aria-expanded', 'true');
        await expect(menu).not.toHaveAttribute('aria-modal', 'true');
        await expect(page.locator('#hub')).not.toHaveAttribute('inert', '');
        await expect(page.locator('#top-bar')).not.toHaveAttribute('inert', '');
        expect(await activeInfo(page)).toMatchObject({ cls: 'user-toggle' });

        await page.keyboard.press('Tab');
        expect(await activeInfo(page)).toMatchObject({ cls: 'user-menu-signout' });
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden();
        await expect(tog).toHaveAttribute('aria-expanded', 'false');
        expect(await activeInfo(page)).toMatchObject({ cls: 'user-toggle' });
        errors.assertClean();
    });

    test('dışarı tık kapatır; odak menüden ayrılınca kapanır (WCAG 1.4.13); düğme ikinci tıkta kapatır', async ({ page, errors }) => {
        await openHub(page);
        const tog = page.locator('#user-chip .user-toggle');
        const menu = page.locator('#user-chip .user-menu');
        await tog.click();
        await expect(menu).toBeVisible();
        await page.locator('#hub').click({ position: { x: 10, y: 200 } });
        await expect(menu).toBeHidden();

        await tog.click();
        await expect(menu).toBeVisible();
        await page.keyboard.press('Tab');                    // Çıkış yap
        await page.keyboard.press('Tab');                    // menüden çıkar
        await expect(menu).toBeHidden();

        await tog.click();
        await expect(menu).toBeVisible();
        await tog.click();
        await expect(menu).toBeHidden();
        errors.assertClean();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('5) Yedek yol — showModal ve inert yok (eski tarayıcı, Karar 10)', () => {
    // HTMLDialogElement.showModal/show ve HTMLElement.inert silinir → js/dialog.js `open` özniteliği +
    // role/aria-modal + elle Tab döngüsü + aria-hidden kardeşler yoluna düşer.
    test.beforeEach(async ({ context }) => {
        await context.addInitScript(() => {
            delete HTMLDialogElement.prototype.showModal;
            delete HTMLDialogElement.prototype.show;
            delete HTMLElement.prototype.inert;
        });
    });

    test('kilit penceresi: role/aria-modal elle, kardeşler aria-hidden, Tab döngüsü, Escape kapatır', async ({ page, errors }) => {
        await openHub(page);
        expect(await page.evaluate(() => typeof document.createElement('dialog').showModal)).toBe('undefined');
        const card = page.locator(`#hub-grid .game-card[data-game="${LOCKED_SLUG}"]`).first();
        await clickLocked(card);
        const dlg = page.locator('dialog.lock-modal');
        await expect(dlg).toBeVisible();
        expect(await attrs(page, 'dialog.lock-modal', ['role', 'aria-modal', 'open'])).toEqual({ role: 'dialog', 'aria-modal': 'true', open: '' });
        await expect(page.getByRole('dialog', { name: 'Bu Oyun Kilitli' })).toBeVisible();
        await expect(page.locator('#app')).toHaveAttribute('aria-hidden', 'true');
        expect(await page.evaluate(() => document.getElementById('app').hasAttribute('inert'))).toBe(false);
        expect(await activeInfo(page)).toMatchObject({ cls: 'lm-btn' });
        await tabStaysInside(page, 'dialog.lock-modal');
        await page.keyboard.press('Escape');
        await expect(dlg).toBeHidden();
        await expect(page.locator('#app')).not.toHaveAttribute('aria-hidden', 'true');
        expect(await page.evaluate(() => document.activeElement.getAttribute('data-game'))).toBe(LOCKED_SLUG);
        errors.assertClean();
    });

    test('seviye tamamlama: Tab döngüsü elle, Escape kapatmaz, Sonraki kapatır', async ({ page, errors }) => {
        await openGame(page, LEVEL_GAME);
        const dlg = await triggerLevelComplete(page, 3);
        expect(await attrs(page, '#level-complete', ['role', 'aria-modal', 'open'])).toEqual({ role: 'dialog', 'aria-modal': 'true', open: '' });
        await expect(page.locator('#game-container')).toHaveAttribute('aria-hidden', 'true');
        expect(await activeInfo(page)).toMatchObject({ id: 'btn-next' });
        await tabStaysInside(page, '#level-complete');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(dlg).toBeVisible();
        await page.locator('#btn-next').click();
        await expect(dlg).toBeHidden();
        await expect(page.locator('#game-container')).not.toHaveAttribute('aria-hidden', 'true');
        errors.assertClean();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('6) Hareket: kapanış animasyonu (reduced-motion KAPALI)', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('fareyle açılan kilit penceresi animasyonlu açılır, "Tamam" ile .dialog--kapaniyor üzerinden kapanır', async ({ page, errors }) => {
        await openHub(page);
        await clickLocked(page.locator(`#hub-grid .game-card[data-game="${LOCKED_SLUG}"]`).first());
        const dlg = page.locator('dialog.lock-modal');
        await expect(dlg).toBeVisible();
        await expect(dlg).not.toHaveClass(/dialog--aninda/);
        const opening = await page.evaluate(() => getComputedStyle(document.querySelector('dialog.lock-modal')).animationName);
        expect(opening).toBe('dialogAc');
        await page.getByRole('button', { name: 'Tamam', exact: true }).click();
        await expect(dlg).toHaveClass(/dialog--kapaniyor/);
        await expect(dlg).toBeHidden({ timeout: 2000 });
        await expect(dlg).not.toHaveClass(/dialog--kapaniyor/);
        errors.assertClean();
    });

    test('Escape ile kapanış animasyonsuz (anında)', async ({ page, errors }) => {
        await openHub(page);
        await page.locator('#coin-counter').click();
        const dlg = page.locator('#meta-panel');
        await expect(dlg).toBeVisible();
        await page.keyboard.press('Escape');
        expect(await page.evaluate(() => document.getElementById('meta-panel').open)).toBe(false);   // beklemeden kapandı
        errors.assertClean();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
test('7) Erişilebilirlik ağacı: üç modal katmanın rol/ad anlık görüntüsü (kanıt B3-a11y.md)', async ({ page }) => {
    await openHub(page);
    const out = {};
    await clickLocked(page.locator(`#hub-grid .game-card[data-game="${LOCKED_SLUG}"]`).first());
    out.kilit = await page.locator('dialog.lock-modal').ariaSnapshot();
    await page.keyboard.press('Escape');
    await page.locator('#coin-counter').click();
    out.meta = await page.locator('#meta-panel').ariaSnapshot();
    await page.keyboard.press('Escape');
    await page.locator('#user-chip .user-toggle').click();
    out.menu = await page.locator('#user-chip .user-menu').ariaSnapshot();
    await page.keyboard.press('Escape');
    await openGame(page, LEVEL_GAME);
    await triggerLevelComplete(page, 3);
    out.seviye = await page.locator('#level-complete').ariaSnapshot();
    for (const [k, v] of Object.entries(out)) {
        expect(v, `${k}: ağaçta dialog rolü`).toMatch(/^- dialog/m);
        test.info().annotations.push({ type: `aria-${k}`, description: v });
        console.log(`\n[aria ${k}]\n${v}`);
    }
});
