/* ============================================
   Balon Labirenti testleri — saf fizik + seviye içeriği (Node, tarayıcısız) ve canlı akış (Playwright).
   --------------------------------------------
   1) Çözülebilirlik: her labirentin kayıtlı `cozum` atışı ve 3×3 tolerans ızgarası (açı ±1°, kuvvet ±2)
      aynı deterministik simülasyonla tüm balonları patlatır; çözüm ≤ 10 s. Fizik değişirse burası kırılır.
   2) Determinizm + tünelleme değişmezi: aynı atış iki kez → bit-bit aynı yol; alt adımda yer değiştirme
      duvar yarı kalınlığının altında.
   3) Seviye yapısı: 6 bölüm × 5 labirent, geometri kuralları (kenar payı, duvar içi balon yok, süpürme
      kesişmez, bölüm-mekanik kapıları).
   Saf dosyalar `vm.runInNewContext` ile `{ window: {} }` içinde koşar: document/performance yok →
   DOM'a dokunan kod burada fırlatır (saflık kontrolü). Canlı akış testleri (4-5) tarayıcıda koşar.
   Çalıştırma: npm run test:balon (PORT=8765 ile başka port; SITE_ROOT=.build-check hash'li çıktı)
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { test: base, expect } = require('@playwright/test');
const { getActiveSlugs } = require('./helpers/slugs');
const { seedGuest } = require('./helpers/guest-seed');

const ROOT = path.join(__dirname, '..');
const SLUG = 'balon-labirenti';

// ── Canlı testler için fixture: misafir tohumu, Firebase CDN engeli, hata toplayıcı (tests/hub-ia.spec.js kalıbı) ──
const { solo, online } = getActiveSlugs();
const allLockKeys = [...solo, ...online.map((id) => 'mp:' + id)];
// Sahte Firebase (sayfa betiklerinden ÖNCE): adminConfig boş, oturum misafir; canlı RTDB'ye dokunulmaz.
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
const test = base.extend({
    context: async ({ context }, use) => {
        await seedGuest(context, allLockKeys);
        await context.route(/https:\/\/www\.gstatic\.com\/firebasejs\//, (route) => route.abort());
        await context.addInitScript(FIREBASE_STUB);
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
const PURE_FILES = ['js/games/balon-labirenti-fizik.js', 'js/games/balon-labirenti-levels.js'];
const BOLUM_SAYISI = 6;
const LABIRENT_PER_BOLUM = 5;

// Saf dosyaları tarayıcısız yükle: yalnız `window` var, DOM yok.
function loadPure() {
    const window = {};
    const sandbox = { window };
    for (const rel of PURE_FILES) {
        const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        vm.runInNewContext(src, sandbox, { filename: rel });
    }
    return { F: window.BALON_LABIRENTI_FIZIK, LEVELS: window.BALON_LABIRENTI_LEVELS };
}

// ── Geometri yardımcıları (test bağımsız hesaplar; fizik dosyasına güvenmez) ──
const inRect = (px, py, r, pad = 0) => px >= r.x - pad && px <= r.x + r.w + pad && py >= r.y - pad && py <= r.y + r.h + pad;
const rectsOverlap = (a, b, pad = 0) => a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
const rectInCanvas = (r, W, H) => r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H;
// Hareketli platformun süpürdüğü alan: başlangıç ve hedef dikdörtgenlerinin birleşim kutusu (eksene paralel hareket)
function sweepBox(p) {
    const x0 = Math.min(p.x, p.hedef.x), y0 = Math.min(p.y, p.hedef.y);
    const x1 = Math.max(p.x, p.hedef.x) + p.w, y1 = Math.max(p.y, p.hedef.y) + p.h;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

test.describe('Balon Labirenti — saf fizik ve seviye içeriği (tarayıcısız)', () => {
    test('her labirent kayıtlı çözümle ve 3×3 toleransla temizlenir', () => {
        const { F, LEVELS } = loadPure();
        const hatalar = [];
        for (const m of LEVELS) {
            for (const da of [-1, 0, 1]) {
                for (const dk of [-2, 0, 2]) {
                    const shot = { aci: (m.cozum.aci + da + 360) % 360, kuvvet: m.cozum.kuvvet + dk };
                    const r = F.simulate(m, shot);
                    if (!r.hepsi) {
                        hatalar.push(`${m.id} aci=${shot.aci} kuvvet=${shot.kuvvet} → ${r.sonuc} (${r.patlayan.length}/${m.balonlar.length})`);
                    }
                }
            }
            const merkez = F.simulate(m, m.cozum);
            if (merkez.sure > 10) hatalar.push(`${m.id} çözüm ${merkez.sure.toFixed(2)} s > 10 s`);
        }
        expect(hatalar, hatalar.join('\n')).toEqual([]);
    });

    test('fizik deterministik, tünelleme sınırı içinde, sonuç sözlüğü sabit', () => {
        const { F, LEVELS } = loadPure();
        const S = F.SABIT;
        // Alt adımda en fazla yer değiştirme < duvar yarı kalınlığı → yanlış yüzden çözülme yok
        expect(S.HIZ_TAVAN * S.ADIM / S.ALT_ADIM).toBeLessThan(S.DUVAR_MIN / 2);
        expect(S.HIZ_TAVAN).toBeGreaterThanOrEqual(Math.sqrt(S.HIZ_MAX * S.HIZ_MAX + 2 * S.G * S.H)); // enerji sınırı
        const m = LEVELS[0];
        const a = F.simulate(m, m.cozum, { yol: true });
        const b = F.simulate(m, m.cozum, { yol: true });
        expect(a.yol).toEqual(b.yol);
        expect(a.yol.length).toBeGreaterThan(10);
        expect(a.sonuc).toBe('temiz');
        // Boşluğa atış: top kanvası terk eder
        const bos = F.simulate({ ...m, duvarlar: [], hareketli: [], hava: [], balonlar: [{ x: 700, y: 60 }] }, { aci: 270, kuvvet: 50 });
        expect(bos.sonuc).toBe('dustu');
        expect(bos.hepsi).toBe(false);
        // Çekiş → atış dönüşümü: kısa çekiş iptal, tam çekiş kuvvet 100, sola çekiş sağa atar (açı 0)
        expect(F.pullToShot(4, 4)).toBeNull();
        expect(F.pullToShot(-S.CEKME_MAX * 2, 0)).toEqual({ aci: 0, kuvvet: 100 });
        expect(F.pullToShot(0, S.CEKME_MAX / 2)).toEqual({ aci: 90, kuvvet: 50 });
    });

    test(`seviye yapısı: ${BOLUM_SAYISI} bölüm × ${LABIRENT_PER_BOLUM} labirent, geometri kuralları`, () => {
        const { F, LEVELS } = loadPure();
        const { W, H, BALON_R, DUVAR_MIN, PLATFORM_HIZ_MAX, HAVA_GUC } = F.SABIT;
        const hatalar = [];
        const err = (m, msg) => hatalar.push(`${m.id}: ${msg}`);

        expect(LEVELS.length).toBe(BOLUM_SAYISI * LABIRENT_PER_BOLUM);
        const ids = new Set();
        for (let b = 1; b <= BOLUM_SAYISI; b++) {
            const grup = LEVELS.filter((m) => m.bolum === b);
            expect(grup.map((m) => m.sira), `bölüm ${b} sıra`).toEqual([1, 2, 3, 4, 5]);
        }
        for (const m of LEVELS) {
            if (!/^b[1-6]-[1-5]$/.test(m.id) || m.id !== `b${m.bolum}-${m.sira}`) err(m, 'id biçimi');
            if (ids.has(m.id)) err(m, 'id tekrarı');
            ids.add(m.id);
            if (typeof m.ad !== 'string' || !m.ad.trim()) err(m, 'ad boş');
            const duvarlar = m.duvarlar || [];
            const hareketli = m.hareketli || [];
            const hava = m.hava || [];
            const balonlar = m.balonlar || [];

            if (balonlar.length < 1) err(m, 'balon yok');
            for (const d of duvarlar) {
                if (d.w < DUVAR_MIN || d.h < DUVAR_MIN) err(m, `duvar ${d.x},${d.y} ince (${d.w}×${d.h})`);
                if (!rectInCanvas(d, W, H)) err(m, `duvar ${d.x},${d.y} kanvas dışı`);
            }
            balonlar.forEach((b, i) => {
                if (b.x < 24 || b.x > W - 24 || b.y < 24 || b.y > H - 24) err(m, `balon ${i} kenara yakın`);
                for (const d of duvarlar) if (inRect(b.x, b.y, d, BALON_R + 4)) err(m, `balon ${i} duvar içinde/yapışık`);
                for (const p of hareketli) if (inRect(b.x, b.y, sweepBox(p), BALON_R + 4)) err(m, `balon ${i} platform süpürmesinde`);
                for (let j = i + 1; j < balonlar.length; j++) {
                    const o = balonlar[j];
                    if (Math.hypot(o.x - b.x, o.y - b.y) < 30) err(m, `balon ${i}-${j} çok yakın`);
                }
            });
            const s = m.baslangic;
            if (!s || s.x < 40 || s.x > W - 40 || s.y < 40 || s.y > H - 40) err(m, 'başlangıç kenara yakın');
            else {
                for (const d of duvarlar) if (inRect(s.x, s.y, d, 60)) err(m, 'başlangıcın 60 px içinde duvar');
                for (const p of hareketli) if (inRect(s.x, s.y, sweepBox(p), 60)) err(m, 'başlangıcın 60 px içinde platform süpürmesi');
            }
            for (const p of hareketli) {
                if (m.bolum < 4) err(m, 'bölüm 4 öncesi hareketli platform');
                if (p.w < DUVAR_MIN || p.h < DUVAR_MIN) err(m, 'platform ince');
                if (!rectInCanvas(p, W, H) || !rectInCanvas({ x: p.hedef.x, y: p.hedef.y, w: p.w, h: p.h }, W, H)) err(m, 'platform süpürmesi kanvas dışı');
                if (p.x !== p.hedef.x && p.y !== p.hedef.y) err(m, 'platform çapraz hareket ediyor (yalnız yatay/dikey)');
                const yol = Math.hypot(p.hedef.x - p.x, p.hedef.y - p.y);
                if (!(p.sure > 0) || yol * 2 / p.sure > PLATFORM_HIZ_MAX) err(m, `platform hızı > ${PLATFORM_HIZ_MAX}`);
                for (const d of duvarlar) if (rectsOverlap(sweepBox(p), d)) err(m, 'platform süpürmesi duvarla kesişiyor');
            }
            for (const z of hava) {
                if (m.bolum < 5) err(m, 'bölüm 5 öncesi sıcak hava');
                if (!(z.guc >= HAVA_GUC[0] && z.guc <= HAVA_GUC[1])) err(m, `hava gücü ${z.guc} aralık dışı`);
                if (!rectInCanvas(z, W, H)) err(m, 'hava kutusu kanvas dışı');
            }
            const c = m.cozum;
            if (!c || !Number.isInteger(c.aci) || c.aci < 0 || c.aci > 359) err(m, 'cozum.aci tamsayı 0-359 olmalı');
            if (!c || !Number.isInteger(c.kuvvet) || c.kuvvet < 12 || c.kuvvet > 98) err(m, 'cozum.kuvvet tamsayı 12-98 olmalı (tolerans payı)');
        }
        expect(hatalar, hatalar.join('\n')).toEqual([]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Canlı akış (tarayıcı): çekiş → uçuş → temiz/ıska → ipucu; klavye; hub'a dönüş → yeniden açılış (sızıntı yok)
const wrap = (page) => page.locator('.bl-wrap');
async function openGame(page) {
    await page.goto('/?oyun=' + SLUG);
    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(wrap(page)).toHaveAttribute('data-durum', 'nisan');
    await expect(wrap(page).locator('canvas')).toBeVisible();
}
// Kayıtlı çözümü (ya da verilen atışı) kanvasta fare çekişine çevirir: çekiş = fırlatma yönünün tersi.
async function cekVeBirak(page, atis) {
    const canvas = wrap(page).locator('canvas');
    const box = await canvas.boundingBox();
    const m = await page.evaluate(() => {
        const w = document.querySelector('.bl-wrap');
        const idx = parseInt(w.dataset.labirent, 10) - 1;
        const bolum = parseInt(w.dataset.bolum, 10) || 1;
        const maze = window.BALON_LABIRENTI_LEVELS.filter((x) => x.bolum === bolum)[idx];
        const S = window.BALON_LABIRENTI_FIZIK.SABIT;
        return { baslangic: maze.baslangic, cozum: maze.cozum, CEKME_MAX: S.CEKME_MAX, W: S.W };
    });
    const a = atis || m.cozum;
    const s = box.width / m.W;
    const rad = a.aci * Math.PI / 180;
    const uz = a.kuvvet / 100 * m.CEKME_MAX * s;
    const from = { x: box.x + m.baslangic.x * s, y: box.y + m.baslangic.y * s };
    const to = { x: from.x - Math.cos(rad) * uz, y: from.y + Math.sin(rad) * uz };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    return a;
}

test.describe('Balon Labirenti — canlı akış', () => {
    test('kayıtlı çözüm labirenti temizler, ıska sayılır, ikinci ıskada ipucu belirir', async ({ page, errors }) => {
        await openGame(page);
        await expect(wrap(page)).toHaveAttribute('data-labirent', '1/5');
        const a = await cekVeBirak(page);
        const atis = (await wrap(page).getAttribute('data-atis')).split(',').map(Number);
        expect(Math.abs(atis[0] - a.aci)).toBeLessThanOrEqual(1);
        expect(Math.abs(atis[1] - a.kuvvet)).toBeLessThanOrEqual(2);
        await expect(wrap(page)).toHaveAttribute('data-durum', 'temizlendi', { timeout: 15000 });
        await expect(wrap(page)).toHaveAttribute('data-labirent', '2/5', { timeout: 5000 });
        await expect(wrap(page)).toHaveAttribute('data-durum', 'nisan');
        expect(await page.evaluate(() => GameEngine.getScore())).toMatchObject({ correct: 1, wrong: 0, total: 5 });

        // Kasıtlı ıska: boşluğa (sola, alçak) at
        await cekVeBirak(page, { aci: 200, kuvvet: 40 });
        await expect(wrap(page)).toHaveAttribute('data-durum', 'kacirdi', { timeout: 15000 });
        expect(await page.evaluate(() => GameEngine.getScore())).toMatchObject({ correct: 1, wrong: 1 });
        await expect(wrap(page)).toHaveAttribute('data-durum', 'nisan', { timeout: 5000 });
        await expect(wrap(page)).not.toHaveAttribute('data-ipucu', '1');
        await cekVeBirak(page, { aci: 200, kuvvet: 40 });
        await expect(wrap(page)).toHaveAttribute('data-durum', 'kacirdi', { timeout: 15000 });
        await expect(wrap(page)).toHaveAttribute('data-ipucu', '1', { timeout: 5000 });
        await expect(page.locator('.bl-yeniden')).toBeVisible();
        errors.assertClean();
    });

    test('klavye nişanı: ok tuşları okumayı açar, Enter atar; duyuru metni gelir', async ({ page, errors }) => {
        await openGame(page);
        await page.locator('.bl-wrap canvas').focus();
        await page.keyboard.press('ArrowLeft');
        await expect(page.locator('.bl-okuma')).toHaveClass(/is-acik/);
        await expect(page.locator('.bl-okuma')).toContainText('açı 48°');
        await page.keyboard.press('ArrowUp');
        await expect(page.locator('.bl-okuma')).toContainText('kuvvet 65');
        await page.keyboard.press('Enter');
        await expect(wrap(page)).toHaveAttribute('data-durum', 'ucus');
        await expect(wrap(page)).toHaveAttribute('data-atis', '48,65');
        await expect(page.locator('.bl-duyuru')).toContainText(/temizlendi|Iskaladın/, { timeout: 15000 });
        errors.assertClean();
    });

    test('hub\'a dönüş temiz: döngü durur, kanvas kalmaz; yeniden açılışta tek sahne ve tek ses', async ({ page, errors }) => {
        await openGame(page);
        await page.locator('#game-home').click();
        await expect(page.locator('#hub')).toBeVisible();
        await expect(wrap(page)).toHaveCount(0);
        expect(await page.evaluate(() => BalonLabirenti.durum().rafAktif)).toBe(false);
        // Hub kartından yeniden aç (aynı sayfa → sızıntı gerçek olurdu)
        await page.locator(`#hub-grid .game-card[data-game="${SLUG}"]`).first().click();
        await expect(wrap(page)).toHaveAttribute('data-durum', 'nisan');
        await expect(wrap(page)).toHaveCount(1);
        expect(await page.evaluate(() => BalonLabirenti.durum().rafAktif)).toBe(true);
        // Ses casusu: bir temiz atışta pop sesi en çok balon sayısı kadar (çift dinleyici = iki kat), en az 1
        // (modül aynı karede patlayan balonlar için sesi 16 ms'de bire indirir → tam eşitlik beklenmez).
        await page.evaluate(() => {
            window.__popSayac = 0;
            const orj = AudioManager.play;
            AudioManager.play = function (ad) { if (ad === 'pop') window.__popSayac++; return orj.apply(this, arguments); };
        });
        await cekVeBirak(page);
        await expect(wrap(page)).toHaveAttribute('data-durum', 'temizlendi', { timeout: 15000 });
        const balon = await page.evaluate(() => window.BALON_LABIRENTI_LEVELS[0].balonlar.length);
        const pop = await page.evaluate(() => window.__popSayac);
        expect(pop).toBeGreaterThanOrEqual(1);
        expect(pop).toBeLessThanOrEqual(balon);
        errors.assertClean();
    });
});
