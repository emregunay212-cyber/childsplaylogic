/* ============================================
   Klavye Kâşifi testleri — kesintisiz akış (13 Eki 2026)
   --------------------------------------------
   1) İçerik (Node, tarayıcısız): kısım sırası Harfler → Heceler → Kelimeler → Cümleler → Rakamlar → Noktalama;
      klavyedeki 32 harfin, 10 rakamın ve . , ? ! işaretlerinin hepsi gelir; cümle kısmı noktalamasız;
      yalnız ekran klavyesindeki karakterler; bölüm ≤ 12 tur; data/games.json levels = kısım sayısı.
   2) "35 dakikalık ders" bütçesi: hatasız, okuma payı SIFIR alt sınırla bile 30 kelime/dk (2,5 vuruş/sn)
      bitiremez; 48 kelime/dk (4 vuruş/sn, usta) bitirir. İçerik kısalırsa burası kırılır.
   3) Canlı akış (tarayıcı, page.clock): bölümler düğmesiz geçer; kısım sonunda yıldız sessizce kaydedilir,
      kutlama katmanı yalnız SON kısımda açılır; TR Q ve İngilizce dizilimde (TR kapak) fiziksel tuşlar;
      ekran klavyesinde Shift; yanlış sayımı; çıkıp girince baştan.
   Çalıştırma: npm run test:klavye
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { test: base, expect } = require('@playwright/test');
const { getActiveSlugs } = require('./helpers/slugs');
const { seedGuest } = require('./helpers/guest-seed');

const ROOT = path.join(__dirname, '..');
const SLUG = 'klavye-kasifi';

// ── Fixture: sahte Firebase + misafir tohumu + hata toplayıcı (tests/balon-labirenti.spec.js kalıbı) ──
const { solo, online } = getActiveSlugs();
const allLockKeys = [...solo, ...online.map((id) => 'mp:' + id)];
const FIREBASE_STUB = `(() => {
    const ref = (p) => ({
        on(ev, cb) { if (p === 'adminConfig') setTimeout(() => cb({ val: () => ({}) }), 0); },
        off() {}, once() { return Promise.resolve({ val: () => null }); },
        set() { return Promise.resolve(); }, update() { return Promise.resolve(); },
        orderByChild() { return this; }, endAt() { return this; }, limitToFirst() { return this; },
    });
    const auth = () => ({ onAuthStateChanged(cb) { setTimeout(() => cb(null), 0); }, signOut() { return Promise.resolve(); } });
    auth.GoogleAuthProvider = function () {};
    window.firebase = { initializeApp() {}, database() { return { ref }; }, auth };
})();`;
// Fiziksel basış taklidi: window.__kkType(ch, 'tr' | 'us') — 'tr' TR Q işletim sistemi dizilimi;
// 'us' İngilizce dizilim + TR Q kapaklı klavye (e.key kapakla uyuşmaz, e.code konumu verir).
const TYPER = `(() => {
    const TR = { '.': ['.', 'Slash'], ',': [',', 'Backslash'], '?': ['?', 'Minus', 1], '!': ['!', 'Digit1', 1], ' ': [' ', 'Space'] };
    const US = { 'Ş': [';', 'Semicolon'], 'İ': ["'", 'Quote'], 'Ğ': ['[', 'BracketLeft'], 'Ü': [']', 'BracketRight'],
        'Ö': [',', 'Comma'], 'Ç': ['.', 'Period'], 'I': ['i', 'KeyI'], '.': ['/', 'Slash'], ',': ['\\\\', 'Backslash'],
        '?': ['_', 'Minus', 1], '!': ['!', 'Digit1', 1], ' ': [' ', 'Space'] };
    window.__kkType = (ch, layout) => {
        const m = (layout === 'us' ? US : TR)[ch];
        let key, code, shiftKey = false;
        if (m) { key = m[0]; code = m[1]; shiftKey = !!m[2]; }
        else if (/[0-9]/.test(ch)) { key = ch; code = 'Digit' + ch; }
        else { key = ch.toLocaleLowerCase(layout === 'us' ? 'en-US' : 'tr-TR'); code = ''; }
        document.dispatchEvent(new KeyboardEvent('keydown', { key, code, shiftKey, bubbles: true, cancelable: true }));
    };
})();`;
const test = base.extend({
    context: async ({ context }, use) => {
        await seedGuest(context, allLockKeys);
        await context.route(/https:\/\/www\.gstatic\.com\/firebasejs\//, (route) => route.abort());
        await context.addInitScript(FIREBASE_STUB);
        await context.addInitScript(TYPER);
        await use(context);
    },
    errors: async ({ page }, use) => {
        const pageErrors = [];
        const consoleErrors = [];
        page.on('pageerror', (err) => pageErrors.push(err.stack || String(err)));
        page.on('console', (msg) => {
            if (msg.type() !== 'error') return;
            const text = msg.text();
            if (/Failed to load resource|Kaynak yüklenemedi|net::ERR_FAILED/.test(text)) return;
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

function loadContent() {
    const window = {};
    const rel = 'js/games/klavye-kasifi-icerik.js';
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { window }, { filename: rel });
    return window.KLAVYE_KASIFI_ICERIK;
}
const textOf = (item) => (Array.isArray(item) ? item[0] : item);
const upper = (s) => s.toLocaleUpperCase('tr-TR');
const LETTERS = [...'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZQWX'];
const DIGITS = [...'0123456789'];
const PUNCT = ['.', ',', '?', '!'];

test.describe('Klavye Kâşifi — içerik (tarayıcısız)', () => {
    test('kısım sırası, kapsam ve karakter kümesi', () => {
        const C = loadContent();
        expect(C.map((s) => s.id)).toEqual(['harf', 'hece', 'kelime', 'cumle', 'rakam', 'noktalama']);
        const byId = Object.fromEntries(C.map((s) => [s.id, s]));
        const keysOf = (sec) => new Set(sec.stages.filter((st) => st.kind === 'key').flatMap((st) => st.items.map(textOf)));
        const textsOf = (sec) => sec.stages.flatMap((st) => st.items.map(textOf));

        // Önce klavyedeki tüm harfler (tek tuş), rakam ve işaretler kendi kısımlarında tek tuş olarak da gelir
        expect([...keysOf(byId.harf)].sort()).toEqual([...LETTERS].sort());
        expect([...keysOf(byId.rakam)].sort()).toEqual(DIGITS);
        expect([...keysOf(byId.noktalama)].sort()).toEqual([...PUNCT].sort());
        // Noktalama kısmının cümlelerinde dört işaret ve sayı geçer
        const nk = textsOf(byId.noktalama).join('');
        PUNCT.forEach((p) => expect(nk).toContain(p));
        expect(nk).toMatch(/[0-9]/);

        // Hece/kelime yalnız harf; cümle kısmı noktalamasız (noktalama ve rakam sona bırakıldı — sahip kararı)
        const onlyLetters = /^[A-ZÇĞIİÖŞÜ]+$/;
        [...textsOf(byId.hece), ...textsOf(byId.kelime)].forEach((t) => expect(t, t).toMatch(onlyLetters));
        textsOf(byId.cumle).forEach((t) => expect(upper(t), t).toMatch(/^[A-ZÇĞIİÖŞÜ ]+$/));

        const allowed = new Set([...LETTERS, ...DIGITS, ...PUNCT, ' ']);
        const problems = [];
        for (const sec of C) {
            expect(sec.stages.length).toBeGreaterThan(0);
            for (const st of sec.stages) {
                const at = sec.id + ' / ' + st.name;
                if (!['key', 'word', 'sentence'].includes(st.kind)) problems.push(at + ': kind ' + st.kind);
                if (!['always', 'delayed'].includes(st.hint)) problems.push(at + ': hint ' + st.hint);
                if (st.items.length < 1 || st.items.length > 12) problems.push(at + ': ' + st.items.length + ' tur (1–12)');
                for (const it of st.items) {
                    const t = textOf(it);
                    if (st.kind === 'key' && [...t].length !== 1) problems.push(at + ': tek tuş değil «' + t + '»');
                    if (st.kind !== 'sentence' && t.includes(' ')) problems.push(at + ': boşluk «' + t + '»');
                    if (st.kind === 'sentence' && (/ {2}/.test(t) || t !== t.trim())) problems.push(at + ': boşluk düzeni «' + t + '»');
                    [...upper(t)].forEach((ch) => { if (!allowed.has(ch)) problems.push(at + ': ekran klavyesinde yok «' + ch + '» (' + t + ')'); });
                }
            }
        }
        expect(problems, problems.join('\n')).toEqual([]);

        // Kayıt defteri: levels = kısım sayısı, içerik dosyası modülden önce yüklenir
        const entry = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8')).games.find((g) => g.slug === SLUG);
        expect(entry.levels).toBe(C.length);
        expect(entry.files.js).toEqual(['js/games/klavye-kasifi-icerik.js', 'js/games/klavye-kasifi.js']);
    });

    test('35 dakikalık ders: orta hız bitiremez, usta bitirir', () => {
        const C = loadContent();
        // Modül sabitleri (js/games/klavye-kasifi.js): NEXT_ROUND_MS 1150, son turda +350, bölüm şeridi 1800, kısım şeridi 2800
        let keys = 0, rounds = 0, stages = 0;
        for (const sec of C) {
            for (const st of sec.stages) {
                stages++;
                for (const it of st.items) {
                    rounds++;
                    keys += [...textOf(it)].length + (st.kind === 'word' ? 1 : 0);   // kelime sonunda Boşluk
                }
            }
        }
        const fixed = rounds * 1.15 + stages * 0.35 + (stages - C.length) * 1.8 + (C.length - 1) * 2.8;   // sn
        const minutes = (cps) => (keys / cps + fixed) / 60;   // hatasız, okuma/arama payı sıfır → ALT sınır
        expect(minutes(2.5), '30 kelime/dk bitirmemeli').toBeGreaterThan(35);
        expect(minutes(4), '48 kelime/dk (usta) bitirebilmeli').toBeLessThan(35);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Canlı akış (tarayıcı, page.clock): zaman durdurulur, tur geçişleri elle ilerletilir
const game = (page) => page.locator('.kk-game');
const overlayOpen = (page) => page.evaluate(() => Dialog.isOpen(document.getElementById('level-complete')));

async function openGame(page) {
    await page.clock.install({ time: new Date('2026-10-13T09:00:00Z') });
    await page.goto('/?oyun=' + SLUG);
    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(game(page)).toHaveAttribute('data-bolum', '1/39');
    await expect(page.locator('#splash-screen')).toBeHidden();
    await page.clock.pauseAt(new Date('2026-10-13T09:05:00Z'));
}

// Turun kalanını beklenen tuşlarla yazar (tek evaluate); dönüş: yazılan vuruş sayısı
const typeRound = (page, layout = 'tr') => page.evaluate((lay) => {
    const root = document.querySelector('.kk-game');
    let n = 0;
    while (root.dataset.beklenen && n < 400) { window.__kkType(root.dataset.beklenen, lay); n++; }
    return n;
}, layout);

// Sıradaki tur başlayana (beklenen dolu) ya da kutlama katmanı açılana kadar zamanı ilerletir
async function nextRound(page) {
    for (let i = 0; i < 20; i++) {
        await page.clock.fastForward(500);
        const s = await page.evaluate(() => ({
            exp: document.querySelector('.kk-game') ? document.querySelector('.kk-game').dataset.beklenen : '',
            done: Dialog.isOpen(document.getElementById('level-complete')),
        }));
        if (s.exp || s.done) return s;
    }
    throw new Error('sıradaki tur başlamadı');
}

// Aktif kısmı sonuna kadar oynar; her turdan sonra katman açık mı, bölüm sayacı nasıl ilerledi kaydedilir
async function playSection(page, layout = 'tr') {
    const seen = [];
    let overlayMidway = false;
    const startKisim = await game(page).getAttribute('data-kisim');
    for (let i = 0; i < 200; i++) {
        seen.push(await game(page).getAttribute('data-bolum'));
        await typeRound(page, layout);
        const s = await nextRound(page);
        if (s.done) return { seen, overlayMidway, finished: true };
        if (await overlayOpen(page)) overlayMidway = true;
        if ((await game(page).getAttribute('data-kisim')) !== startKisim) return { seen, overlayMidway, finished: false };
    }
    throw new Error('kısım bitmedi');
}

test.describe('Klavye Kâşifi — canlı akış', () => {
    test('Harfler kısmı düğmesiz biter: bölümler kendiliğinden geçer, yıldız sessizce kaydedilir', async ({ page, errors }) => {
        test.setTimeout(120000);
        await openGame(page);
        await expect(game(page)).toHaveAttribute('data-kisim', 'harf');
        const r = await playSection(page);
        expect(r.finished).toBe(false);
        expect(r.overlayMidway, 'kısım içinde kutlama katmanı açılmamalı').toBe(false);
        expect([...new Set(r.seen)]).toEqual(['1/39', '2/39', '3/39', '4/39', '5/39', '6/39']);
        // Kısım geçişi: motor seviyesi 2, yıldız kaydı 3 (hatasız), araç çubuğu 2. noktada, katman kapalı
        await expect(game(page)).toHaveAttribute('data-kisim', 'hece');
        await expect(game(page)).toHaveAttribute('data-bolum', '7/39');
        expect(await overlayOpen(page)).toBe(false);
        expect(await page.evaluate(() => GameEngine.getCurrentLevel())).toBe(2);
        expect(await page.evaluate(() => Progress.getLevelStars('klavye-kasifi', 1))).toBe(3);
        await expect(page.locator('#toolbar-level .level-dot').nth(1)).toHaveClass(/active/);
        await expect(page.locator('#toolbar-level .level-dot').nth(0)).toHaveClass(/done/);
        // Hece turu: harfler + Boşluk
        expect(await typeRound(page)).toBeGreaterThanOrEqual(3);
        errors.assertClean();
    });

    test('son kısım (Noktalama) bitince kutlama katmanı açılır; ? ve ! Shift ile yazılır', async ({ page, errors }) => {
        test.setTimeout(120000);
        await openGame(page);
        await page.evaluate(() => GameEngine.startGame(KlavyeKasifi, 6));
        await expect(game(page)).toHaveAttribute('data-kisim', 'noktalama');
        await expect(game(page)).toHaveAttribute('data-bolum', '31/39');
        const r = await playSection(page);
        expect(r.finished).toBe(true);
        expect(r.overlayMidway).toBe(false);
        expect([...new Set(r.seen)]).toEqual(['31/39', '32/39', '33/39', '34/39', '35/39', '36/39', '37/39', '38/39', '39/39']);
        expect(await page.evaluate(() => Progress.getLevelStars('klavye-kasifi', 6))).toBe(3);
        await expect(page.locator('#btn-next')).toBeHidden();   // son seviye: "Sonraki Seviye" yok
        errors.assertClean();
    });

    test('İngilizce dizilim + TR kapak: Ş İ Ğ Ü Ö Ç I ve . , ? ! kapaktaki gibi kabul edilir', async ({ page, errors }) => {
        test.setTimeout(90000);
        await openGame(page);
        // Harfler: orta, üst, alt sıra (Ş İ / I Ğ Ü / Ö Ç) hatasız
        for (const bolum of ['1/39', '2/39', '3/39']) {
            await expect(game(page)).toHaveAttribute('data-bolum', bolum);
            while ((await game(page).getAttribute('data-bolum')) === bolum) {
                await typeRound(page, 'us');
                await nextRound(page);
            }
        }
        expect(await page.evaluate(() => GameEngine.getScore().wrong)).toBe(0);
        // Noktalama: nokta/virgül ve soru/ünlem tuşları
        await page.evaluate(() => GameEngine.startGame(KlavyeKasifi, 6));
        for (const bolum of ['31/39', '32/39']) {
            await expect(game(page)).toHaveAttribute('data-bolum', bolum);
            while ((await game(page).getAttribute('data-bolum')) === bolum) {
                await typeRound(page, 'us');
                await nextRound(page);
            }
        }
        expect(await page.evaluate(() => GameEngine.getScore())).toMatchObject({ correct: 16, wrong: 0 });
        errors.assertClean();
    });

    test('ekran klavyesi: Shift\'e dokun + tuş = Shift karakteri; yanlış tur bir kez sayılır, ipucu yanar', async ({ page, errors }) => {
        await openGame(page);
        // Yanlış: ilk yanlış sayılır, ikincisi sayılmaz; ipucu (is-target ya da is-hint) hedef tuşta
        const exp = await game(page).getAttribute('data-beklenen');
        const other = exp === 'A' ? 'S' : 'A';
        await page.locator(`.kk-key[data-key="${other}"]`).click();
        await page.locator(`.kk-key[data-key="${other}"]`).click();
        expect(await page.evaluate(() => GameEngine.getScore().wrong)).toBe(1);
        await expect(page.locator(`.kk-key[data-key="${exp}"]`)).toHaveClass(/is-target|is-hint/);

        await page.evaluate(() => GameEngine.startGame(KlavyeKasifi, 6));
        await expect(game(page)).toHaveAttribute('data-bolum', '31/39');
        // Nokta ve virgül: ekran tuşuna dokunarak
        while ((await game(page).getAttribute('data-bolum')) === '31/39') {
            const ch = await game(page).getAttribute('data-beklenen');
            await page.locator(`.kk-key[data-key="${ch}"]`).click();
            await nextRound(page);
        }
        // Soru/ünlem: Shift'siz dokunuş yanlış (taban karakter), Shift + tuş doğru; Shift tuşları ipucunda yanar
        await expect(game(page)).toHaveAttribute('data-bolum', '32/39');
        const ch = await game(page).getAttribute('data-beklenen');
        const keyBtn = page.locator(`.kk-key[data-key="${ch === '?' ? '*' : '1'}"]`);
        await expect(page.locator('.kk-key--shift-left')).toHaveClass(/is-target/);
        await keyBtn.click();
        expect(await page.evaluate(() => GameEngine.getScore())).toMatchObject({ correct: 8, wrong: 1 });
        await page.locator('.kk-key--shift-left').click();
        await expect(page.locator('.kk-key--shift-left')).toHaveAttribute('aria-pressed', 'true');
        await keyBtn.click();
        expect(await page.evaluate(() => GameEngine.getScore())).toMatchObject({ correct: 9, wrong: 1 });
        await expect(page.locator('.kk-key--shift-left')).toHaveAttribute('aria-pressed', 'false');
        errors.assertClean();
    });

    test('çıkıp yeniden girince oyun baştan başlar', async ({ page, errors }) => {
        await openGame(page);
        while ((await game(page).getAttribute('data-bolum')) === '1/39') {
            await typeRound(page);
            await nextRound(page);
        }
        await expect(game(page)).toHaveAttribute('data-bolum', '2/39');
        await page.locator('#game-home').click();
        await page.clock.fastForward(1000);
        await expect(page.locator('#hub')).toBeVisible();
        await page.locator('.game-card[data-game="klavye-kasifi"]').first().click();   // hub kartı seviye 1 ile açar
        await page.clock.fastForward(500);
        await expect(game(page)).toHaveAttribute('data-bolum', '1/39');
        expect(await page.evaluate(() => GameEngine.getCurrentLevel())).toBe(1);
        errors.assertClean();
    });
});
