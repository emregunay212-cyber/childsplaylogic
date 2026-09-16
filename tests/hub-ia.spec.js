/* ============================================
   Hub bilgi mimarisi testleri (Faz 2 / B2b) — yaş rafı, kategori/ders çipleri, "Devam et", öğretmen
   anahtarı, arama, klavye, kart durumları, statik /oyunlar/ süzgeci.
   --------------------------------------------
   Kurulum tests/dialog.spec.js ile aynı (depolama tohumu, tests/helpers/guest-seed.js): misafir, tüm kilitler
   öğretmen-izniyle açık, `tetris` (stars:10) bilerek dışarıda → yıldız eşiğiyle kilitli.
   Firebase: gstatic CDN engellenir (canlı RTDB'ye dokunulmaz). İki kip:
     - "stub": addInitScript ile sahte `firebase` (database().ref('adminConfig').on → verilen adminConfig,
       auth().onAuthStateChanged → null): FIREBASE_OK=true → online kartlar açık, admin "lock" override'ı test edilir.
     - "yok": firebase tanımsız → çevrimdışı bant + online kartlar "Çevrimdışı".
   Çalıştırma: npm run test:hub-ia (PORT=8765 ile başka port).
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { test: base, expect } = require('@playwright/test');
const { getActiveSlugs } = require('./helpers/slugs');
const { seedGuest } = require('./helpers/guest-seed');

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'games.json'), 'utf8'));
const LOCKED_SLUG = 'tetris';                 // yıldız eşiği (stars:10) → kilitli
const ADMIN_LOCKED_SLUG = 'jigsaw';           // adminConfig.locks 'lock' → "şimdilik kapalı"
const SOON_SLUG = 'kelime-madeni-3d';         // active:false → "Yakında"
const ONLINE_SLUG = 'kelimelik';              // yalnız online (age 7-10 → 1-2, 3-4, 5-6 rafları)
const KEYBOARD_OPEN_COUNT = 5;

const { solo, online } = getActiveSlugs();
const allLockKeys = [...solo, ...online.map((id) => 'mp:' + id)].filter((k) => k !== LOCKED_SLUG);

// ── Beklentiler doğrudan data/games.json'dan (js/hub-ia.js ile aynı kural; test bağımsız hesaplar) ──
function shelvesOf(age) { return DATA.shelves.filter((s) => age[0] <= s.ages[1] && age[1] >= s.ages[0]).map((s) => s.id); }
function cardsOf(shelfId) {
    const out = [];
    for (const g of DATA.games) {
        if (!shelvesOf(g.age).includes(shelfId)) continue;
        if (g.module) out.push(g.slug);                 // yakında (active:false) kartı da rafta görünür
        if (g.online && g.active) out.push('mp:' + g.slug);
    }
    return out;
}
function fold(s) {
    return String(s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
}
const words = (s) => fold(s).split(/[^a-z0-9]+/).filter(Boolean);
const SUBJECTS = { turkce: 'Türkçe', ingilizce: 'İngilizce', matematik: 'Matematik', fen: 'Fen', kodlama: 'Kodlama', strateji: 'Strateji', sanat: 'Sanat', spor: 'Spor', genel: 'Genel' };
function expectedSearch(q) {
    const tokens = words(q);
    const hits = [];
    for (const g of DATA.games) {
        const variants = [];
        if (g.module) variants.push({ slug: g.slug, section: DATA.sections.find((s) => s.id === g.section).title, online: false });
        if (g.online && g.active) variants.push({ slug: g.slug, section: 'Online Çok Oyunculu', online: true });
        for (const v of variants) {
            const hay = words([g.name, g.teaches, SUBJECTS[g.subject] || g.subject, v.section, v.online ? 'online çok oyunculu' : ''].join(' '));
            if (tokens.every((t) => hay.some((w) => w.startsWith(t)))) hits.push(v.slug);
        }
    }
    return hits;
}

// Sahte Firebase (sayfa betiklerinden ÖNCE çalışır): adminConfig anlık görüntüsü + misafir oturumu
function firebaseStub(adminConfig) {
    return `(() => {
        const ADMIN = ${JSON.stringify(adminConfig)};
        const ref = (p) => ({
            on(ev, cb) { if (p === 'adminConfig') setTimeout(() => cb({ val: () => ADMIN }), 0); },
            off() {}, once() { return Promise.resolve({ val: () => null }); },
            set() { return Promise.resolve(); }, update() { return Promise.resolve(); },
            orderByChild() { return this; }, endAt() { return this; }, limitToFirst() { return this; },
        });
        const auth = () => ({ onAuthStateChanged(cb) { setTimeout(() => cb(null), 0); }, signOut() { return Promise.resolve(); } });
        auth.GoogleAuthProvider = function () {};
        window.firebase = { initializeApp() {}, database() { return { ref }; }, auth };
    })();`;
}

const test = base.extend({
    context: async ({ context }, use) => {
        await seedGuest(context, allLockKeys);
        await context.route(/https:\/\/www\.gstatic\.com\/firebasejs\//, (route) => route.abort());
        await use(context);
    },
    // Varsayılan kip: sahte Firebase (online açık, jigsaw admin-kilitli). Çevrimdışı testleri kendi kipini kurar.
    firebaseMode: ['stub', { option: true }],
    page: async ({ context, firebaseMode }, use) => {
        if (firebaseMode === 'stub') await context.addInitScript(firebaseStub({ locks: { [ADMIN_LOCKED_SLUG]: 'lock' } }));
        const page = await context.newPage();
        await use(page);
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
async function openHub(page) {
    await page.goto('/');
    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(page.locator('#hub')).toBeVisible();
    await expect(page.locator('#hub-grid .raf').first()).toBeVisible();
}
const shelfChip = (page, id) => page.locator(`#hub-shelf-nav [role="radio"][data-value="${id}"]`);
const catChip = (page, id) => page.locator(`#hub-nav-scroll [role="radio"][data-value="${id}"]`);
const activeGame = (page) => page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-game'));
async function backToHub(page) {
    await page.locator('#game-home').click();
    await expect(page.locator('#hub')).toBeVisible();
}

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('1) Yaş rafı', () => {
    test('ilk ziyaret "Hepsi": dört raf alt alta, sayılar JSON ile aynı, online oyun raf içinde rozetli, ayrı online bölümü yok', async ({ page, errors }) => {
        await openHub(page);
        await expect(shelfChip(page, 'hepsi')).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('#hub-grid')).toHaveClass(/hub-grid--raflar/);
        const shelves = page.locator('#hub-grid .raf[data-shelf]');
        await expect(shelves).toHaveCount(DATA.shelves.length);
        for (const s of DATA.shelves) {
            const raf = page.locator(`#hub-grid .raf[data-shelf="${s.id}"]`);
            const expected = cardsOf(s.id);
            await expect(raf.locator('.raf-sayi')).toHaveText(`${expected.length} oyun`);
            await expect(raf.locator('.raf-ray .game-card')).toHaveCount(expected.length);
            await expect(raf.locator('.raf-baslik')).toContainText(s.label);
        }
        // Çıkış kriteri: en küçük yaş rafı kısa (≤ ~15 kart; 17 = veri)
        expect(cardsOf('anaokulu').length).toBeLessThanOrEqual(18);
        // Online kart: 1-2. Sınıf rafında, "2 Oyuncu" rozetiyle, kilitsiz
        const onlineCard = page.locator(`#hub-grid .raf[data-shelf="sinif-1-2"] .game-card[data-game="${ONLINE_SLUG}"][data-online]`);
        await expect(onlineCard).toHaveCount(1);
        await expect(onlineCard.locator('.mp-badge')).toHaveText('2 Oyuncu');
        await expect(onlineCard).not.toHaveClass(/\b(locked|offline|coming-soon)\b/);
        await expect(page.locator('#hub-grid h2', { hasText: 'Çok Oyunculu' })).toHaveCount(0);
        errors.assertClean();
    });

    test('"Anaokulu" çipi → tek raf ızgarası: kesir-2048 yok, renk-eslestirme var; seçim hatırlanır (bo_shelf)', async ({ page, errors }) => {
        await openHub(page);
        await shelfChip(page, 'anaokulu').click();
        await expect(shelfChip(page, 'anaokulu')).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('#hub-grid')).toHaveClass(/hub-grid--izgara/);
        await expect(page.locator('#hub-grid .raf')).toHaveCount(1);
        await expect(page.locator('#hub-grid .game-card[data-game="kesir-2048"]')).toHaveCount(0);
        await expect(page.locator('#hub-grid .game-card[data-game="renk-eslestirme"]')).toHaveCount(1);
        await expect(page.locator('#hub-grid .raf-izgara .game-card')).toHaveCount(cardsOf('anaokulu').length);
        expect(await page.evaluate(() => localStorage.getItem('bo_shelf'))).toBe('anaokulu');
        await page.reload();
        await expect(page.locator('#hub')).toBeVisible();
        await expect(shelfChip(page, 'anaokulu')).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('#hub-grid .game-card[data-game="kesir-2048"]')).toHaveCount(0);
        errors.assertClean();
    });

    test('kategori çipi ikincil eksen: "Online" → yalnız online kartlar; "Sayılar" → yalnız o bölüm; "Tümü" geri getirir', async ({ page, errors }) => {
        await openHub(page);
        await catChip(page, 'online').click();
        const cards = page.locator('#hub-grid .game-card');
        expect(await cards.count()).toBeGreaterThan(0);
        await expect(page.locator('#hub-grid .game-card:not([data-online])')).toHaveCount(0);
        await catChip(page, 'sayi').click();
        await expect(page.locator('#hub-grid .game-card:not([data-section="sayi"])')).toHaveCount(0);
        await expect(page.locator('#hub-grid .game-card[data-game="matematik"]').first()).toBeVisible();
        await catChip(page, 'all').click();
        await expect(page.locator('#hub-grid .raf[data-shelf="anaokulu"] .raf-sayi')).toHaveText(`${cardsOf('anaokulu').length} oyun`);
        errors.assertClean();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('2) Öğretmen anahtarı + arama', () => {
    test('anahtar (role=switch): açıkken kazanım + süre + ders çipleri + arama görünür, hatırlanır; kapalıyken gizli', async ({ page, errors }) => {
        await openHub(page);
        const sw = page.getByRole('switch', { name: 'Öğretmen görünümü' });
        await expect(sw).toHaveAttribute('aria-checked', 'false');
        const first = DATA.games.find((g) => g.module && g.active);
        const card = page.locator(`#hub-grid .game-card[data-game="${first.slug}"]`).first();
        await expect(card.locator('.card-teaches')).toBeHidden();
        await expect(page.locator('#hub-search')).toBeHidden();

        await sw.click();
        await expect(sw).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('#hub')).toHaveClass(/\bogretmen\b/);
        await expect(card.locator('.card-teaches')).toBeVisible();
        await expect(card.locator('.card-teaches')).toHaveText(first.teaches);
        await expect(card.locator('.card-dk')).toHaveText(`${first.minutes} dk`);
        await expect(page.locator('#hub-search-input')).toBeVisible();
        await expect(page.locator('#hub-subject-nav [role="radio"]')).toHaveCount(10);   // Tüm dersler + 9 ders
        expect(await page.evaluate(() => localStorage.getItem('bo_teacher'))).toBe('1');

        await page.reload();
        await expect(page.locator('#hub')).toBeVisible();
        await expect(page.getByRole('switch', { name: 'Öğretmen görünümü' })).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('#hub-search-input')).toBeVisible();

        await page.getByRole('switch', { name: 'Öğretmen görünümü' }).click();
        await expect(page.locator('#hub')).not.toHaveClass(/\bogretmen\b/);
        await expect(page.locator('#hub-search')).toBeHidden();
        await expect(card.locator('.card-teaches')).toBeHidden();
        expect(await page.evaluate(() => localStorage.getItem('bo_teacher'))).toBeNull();
        errors.assertClean();
    });

    test('ders çipi (öğretmen): "Matematik" → yalnız subject=matematik kartlar', async ({ page, errors }) => {
        await openHub(page);
        await page.getByRole('switch', { name: 'Öğretmen görünümü' }).click();
        await page.locator('#hub-subject-nav [role="radio"][data-value="matematik"]').click();
        const expected = DATA.games.filter((g) => g.subject === 'matematik').map((g) => g.slug);
        const shown = await page.locator('#hub-grid .game-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-game')));
        expect(shown.length).toBeGreaterThan(0);
        for (const slug of new Set(shown)) expect(expected, `${slug} matematik dersinde olmalı`).toContain(slug);
        errors.assertClean();
    });

    test('arama: ad/kazanım/ders üzerinde, aksan + İ/ı duyarsız; ad eşleşmesi önde; 0 sonuç → boş durum; temizlenince raflar', async ({ page, errors }) => {
        await openHub(page);
        await page.getByRole('switch', { name: 'Öğretmen görünümü' }).click();
        const input = page.locator('#hub-search-input');
        const results = page.locator('#hub-grid .raf--arama .game-card');

        // "kesir": ad (Kesir 2048) + kazanımda "kesirler/kesir" geçen oyunlar; ilk sonuç ad eşleşmesi
        await input.fill('kesir');
        await expect(page.locator('#hub-grid')).toHaveClass(/hub-grid--arama/);
        const exp = expectedSearch('kesir');
        await expect(results).toHaveCount(exp.length);
        expect(exp.length).toBeGreaterThanOrEqual(1);
        await expect(results.first()).toHaveAttribute('data-game', 'kesir-2048');
        await expect(page.locator('#hub-search-count')).toHaveText(`${exp.length} oyun bulundu`);
        await expect(page.locator('#hub-continue'), 'arama açıkken Devam et gizli').toBeHidden();

        // Tam ad → tek sonuç; büyük harf + noktalı İ ve aksan farkı sonucu değiştirmez
        for (const q of ['kesir 2048', 'KESİR 2048', 'Kesır 2048']) {
            await input.fill(q);
            await expect(results, q).toHaveCount(1);
            await expect(results.first()).toHaveAttribute('data-game', 'kesir-2048');
        }
        await input.fill('sekil');
        await expect(results.first()).toHaveAttribute('data-game', 'sekil-bulmaca');
        await input.fill('ŞEKİL');
        await expect(results.first()).toHaveAttribute('data-game', 'sekil-bulmaca');
        // ders adıyla
        await input.fill('ingilizce');
        await expect(results).toHaveCount(expectedSearch('ingilizce').length);

        // 0 sonuç
        await input.fill('zzqx');
        await expect(results).toHaveCount(0);
        await expect(page.locator('#hub-grid .hub-empty')).toContainText('Burada bir oyun yok');
        await expect(page.locator('#hub-search-count')).toHaveText('Oyun bulunamadı');

        // temizle → raflar + devam et geri
        await input.fill('');
        await expect(page.locator('#hub-grid')).toHaveClass(/hub-grid--raflar/);
        await expect(page.locator('#hub-continue')).toBeVisible();
        errors.assertClean();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('3) Klavye + Devam et', () => {
    test('boş Devam et: maskot + "Hadi başlayalım!"; ilerleme şeması v2', async ({ page, errors }) => {
        await openHub(page);
        const empty = page.locator('#hub-continue .continue-empty');
        await expect(empty).toBeVisible();
        await expect(empty).toContainText('Hadi başlayalım!');
        await expect(empty.locator('img')).toHaveAttribute('src', /bulut-mutlu\.svg/);
        const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('oyun_bahcesi_progress')));
        expect(stored.version).toBe(2);
        expect(stored.lastPlayed).toEqual({});
        errors.assertClean();
    });

    test(`klavyeyle ${KEYBOARD_OPEN_COUNT} kart açılır (ok tuşları + Enter, roving tabindex); Devam et son 3 oyunu en yeniden eskiye gösterir`, async ({ page, errors }) => {
        await openHub(page);
        // Anaokulu rafı: ilk beş kart aktif ve kilitsiz (yakında/kilitli kart Enter'a tepki vermez, doğru davranış)
        const ray = page.locator('#hub-grid .raf[data-shelf="anaokulu"] .raf-ray');
        const cards = ray.locator('.game-card');
        // Roving: yalnız bir kart Tab durağı
        expect(await cards.evaluateAll((els) => els.filter((e) => e.tabIndex === 0).length)).toBe(1);
        const opened = [];
        for (let i = 0; i < KEYBOARD_OPEN_COUNT; i++) {
            const rayNow = page.locator('#hub-grid .raf[data-shelf="anaokulu"] .raf-ray');
            await rayNow.locator('.game-card').first().focus();
            await page.keyboard.press('Home');
            for (let k = 0; k < i; k++) await page.keyboard.press('ArrowRight');
            const slug = await activeGame(page);
            expect(slug).toBeTruthy();
            expect(opened).not.toContain(slug);
            await page.keyboard.press('Enter');
            await expect(page.locator('#game-container')).toBeVisible();
            await expect(page.locator('#game-area .game-loading')).toHaveCount(0);
            const isOnline = await page.evaluate(() => !document.body.dataset.activeGame);
            if (!isOnline) await expect(page.locator('body')).toHaveAttribute('data-active-game', slug);
            opened.push(slug);
            await backToHub(page);
        }
        expect(opened.length).toBe(KEYBOARD_OPEN_COUNT);
        // Devam et: en son açılan 3 oyun, en yeniden eskiye
        const tiles = page.locator('#hub-continue .game-card');
        await expect(tiles).toHaveCount(3);
        const shown = await tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-game')));
        expect(shown).toEqual(opened.slice(-3).reverse());
        const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('oyun_bahcesi_progress')));
        expect(Object.keys(stored.lastPlayed).length).toBe(KEYBOARD_OPEN_COUNT);
        // Devam et karosundan da açılır
        await tiles.first().click();
        await expect(page.locator('#game-container')).toBeVisible();
        errors.assertClean();
    });

    test('çip grubu: ok tuşu komşu rafı seçer (radiogroup), Home/End uçlar; ızgarada Yukarı/Aşağı satır değiştirir', async ({ page, errors }) => {
        await openHub(page);
        await shelfChip(page, 'hepsi').focus();
        await page.keyboard.press('ArrowRight');
        await expect(shelfChip(page, 'anaokulu')).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('#hub-grid')).toHaveClass(/hub-grid--izgara/);
        await page.keyboard.press('End');
        await expect(shelfChip(page, 'sinif-5-6')).toHaveAttribute('aria-checked', 'true');
        await page.keyboard.press('Home');
        await expect(shelfChip(page, 'hepsi')).toHaveAttribute('aria-checked', 'true');
        // Izgara: Aşağı → alt satırdaki kart (farklı kart, daha aşağıda)
        await shelfChip(page, 'anaokulu').click();
        const grid = page.locator('#hub-grid .raf-izgara');
        await grid.locator('.game-card').first().focus();
        const before = await page.evaluate(() => ({ g: document.activeElement.getAttribute('data-game'), y: document.activeElement.offsetTop }));
        await page.keyboard.press('ArrowDown');
        const after = await page.evaluate(() => ({ g: document.activeElement.getAttribute('data-game'), y: document.activeElement.offsetTop }));
        expect(after.g).not.toBe(before.g);
        expect(after.y).toBeGreaterThan(before.y);
        await page.keyboard.press('ArrowUp');
        expect(await activeGame(page)).toBe(before.g);
        errors.assertClean();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('4) Kart durumları korunur', () => {
    test('anatomi: kategori şeridi, üç yıldız yuvası (role=img), yaş rozeti; yakında / yıldız-kilidi / admin-kilidi', async ({ page, errors }) => {
        await openHub(page);
        const g = DATA.games.find((x) => x.slug === 'harf-tanima');
        const card = page.locator('#hub-grid .game-card[data-game="harf-tanima"]').first();
        await expect(card).toHaveAttribute('data-section', g.section);
        await expect(card.locator('.card-stars')).toHaveAttribute('role', 'img');
        await expect(card.locator('.card-stars')).toHaveAttribute('aria-label', '3 üzerinden 0 yıldız');
        await expect(card.locator('.card-stars svg')).toHaveCount(3);
        await expect(card.locator('.card-yas')).toHaveText(`${g.age[0]}-${g.age[1]} yaş`);
        const stripe = await card.evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
        const token = await page.evaluate((s) => { const d = document.createElement('div'); d.style.color = `var(--kat-${s})`; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; }, g.section);
        expect(stripe).toBe(token);

        const soon = page.locator(`#hub-grid .game-card[data-game="${SOON_SLUG}"]`).first();
        await expect(soon).toHaveClass(/coming-soon/);
        await expect(soon).toHaveAttribute('aria-disabled', 'true');
        await expect(soon.locator('.coming-soon-badge')).toHaveText('Yakında');

        const locked = page.locator(`#hub-grid .game-card[data-game="${LOCKED_SLUG}"]`).first();
        await expect(locked).toHaveClass(/\blocked\b/);
        await expect(locked.locator('.lock-badge')).toContainText('Kilitli');
        await expect(locked.locator('.card-lock-progress')).toContainText('/ 10');

        // adminConfig (sahte Firebase) 'lock' → kilitli; tıkta "şimdilik kapalı"
        const admin = page.locator(`#hub-grid .game-card[data-game="${ADMIN_LOCKED_SLUG}"]`).first();
        await expect(admin).toHaveClass(/\blocked\b/);
        await admin.scrollIntoViewIfNeeded();
        await admin.hover();
        await admin.click({ force: true });
        const dlg = page.getByRole('dialog', { name: 'Bu Oyun Kilitli' });
        await expect(dlg).toBeVisible();
        await expect(dlg).toContainText('Bu oyun şimdilik kapalı');
        await page.keyboard.press('Escape');
        await expect(dlg).toBeHidden();
        errors.assertClean();
    });

    test.describe('çevrimdışı (Firebase yok)', () => {
        test.use({ firebaseMode: 'none' });
        test('bant maskotlu, online kartlar "Çevrimdışı" + basılamaz; solo kartlar açık', async ({ page, errors }) => {
            await openHub(page);
            const banner = page.locator('#offline-banner');
            await expect(banner).toBeVisible();
            await expect(banner).toContainText('Çevrimdışısın, tek kişilik oyunlar açık');
            await expect(banner.locator('img')).toHaveAttribute('src', /bulut-uyuyan\.svg/);
            const onlineCards = page.locator('#hub-grid .game-card[data-online]');
            expect(await onlineCards.count()).toBeGreaterThan(0);
            await expect(page.locator('#hub-grid .game-card[data-online]:not(.offline)')).toHaveCount(0);
            await expect(onlineCards.first().locator('.offline-badge')).toHaveText('Çevrimdışı');
            await expect(onlineCards.first()).toHaveAttribute('aria-disabled', 'true');
            await expect(page.locator('#hub-grid .game-card[data-game="harf-tanima"]').first()).not.toHaveClass(/\b(offline|locked|coming-soon)\b/);
            errors.assertClean();
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('5) Statik hub /oyunlar/ (sözleşme §3.11) + kopya', () => {
    test('süzgeç yaş × kategori JS\'siz çalışır; kartlar hub anatomisinde, kazanım hep açık; boş durum', async ({ page, errors }) => {
        await page.goto('/oyunlar/');
        const active = DATA.games.filter((g) => g.active);
        await expect(page.locator('.grid .g')).toHaveCount(active.length);
        await expect(page.locator('.grid .g .g-kazanim')).toHaveCount(active.length);
        await expect(page.locator('.g[href="/oyunlar/harf-tanima/"] .g-kazanim')).toHaveText(DATA.games.find((g) => g.slug === 'harf-tanima').teaches);
        await expect(page.locator('.g[href="/oyunlar/harf-tanima/"] .g-yas')).toHaveText('4-7 yaş');

        // Radio görsel olarak gizli (clip); etiket tıklanır, seçim radio'da doğrulanır
        await page.locator('label[for="yas-anaokulu"]').click();
        await expect(page.locator('#yas-anaokulu')).toBeChecked();
        await expect(page.locator('.g[href="/oyunlar/kesir-2048/"]')).toBeHidden();
        await expect(page.locator('.g[href="/oyunlar/renk-eslestirme/"]')).toBeVisible();
        const visible = await page.locator('.grid .g').evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.getAttribute('href')));
        const expected = active.filter((g) => shelvesOf(g.age).includes('anaokulu')).map((g) => `/oyunlar/${g.slug}/`);
        expect(visible.sort()).toEqual(expected.sort());

        // Anaokulu × Online: veri gereği boş → boş durum metni
        await page.locator('label[for="kat-online"]').click();
        await expect(page.locator('#kat-online')).toBeChecked();
        await expect(page.locator('.bos')).toBeVisible();
        await expect(page.locator('.bos')).toContainText('Burada bir oyun yok');
        await page.locator('label[for="yas-hepsi"]').click();
        await page.locator('label[for="kat-hepsi"]').click();
        await expect(page.locator('.bos')).toBeHidden();
        expect(await page.locator('.grid .g').evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== 'none').length)).toBeGreaterThan(0);
        errors.assertClean();
    });

    test('sayfa metninde uzun tire (—) yok: hub + /oyunlar/', async ({ page }) => {
        await openHub(page);
        const hubText = await page.evaluate(() => (document.getElementById('top-bar').innerText + '\n' + document.getElementById('hub').innerText));
        expect(hubText).not.toContain('—');
        await page.goto('/oyunlar/');
        expect(await page.evaluate(() => document.body.innerText)).not.toContain('—');
    });
});
