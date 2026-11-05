/* ============================================
   Lingo testi — 9 bölümlük seri (2 → 10 harf), özet, tekrar etmeyen kelimeler.
   --------------------------------------------
   Tarayıcısız: games/lingo/kelimeler.js kovaları (her uzunlukta ≥ MIN_PER_LEN kelime, yalnız Türkçe büyük harf,
   tekrar yok). Tarayıcıda (/games/lingo/, hub yok): bölüm şeridi 9 hap, satırdaki kutu sayısı = harf sayısı,
   ilk harf kilitli; "Pes et" ile 9 bölüm geçilir (her açıklanan kelime doğru uzunlukta, lingo_used'a yazılır),
   10 harf bitince özet katmanı (0 / 9, toplam puan), "Yeni seri" 2 harfe döner ve açıklanan kelimeler tekrar
   etmez. Doğru tahmin akışı: açıklanan kelimeyi yeni seride yakalayınca değil — kilitli ilk harf + gizli
   girdiye yazılan doğru kelimeyle (page.evaluate ile hedef okunmaz; oyun pes edilince kelimeyi söyler, aynı
   kelime ikinci seride GELMEZ, bu yüzden kazanma akışı "Sözlük kontrolü" kapalıyken rastgele değil,
   2 harfli kovada deneme-yanılmayla sınanır: 29 harften en çok 5 deneme → ilk bölüm kazanılamayabilir; o yüzden
   puan > 0 koşulu yerine ÖZETİN puanı ve bulunan sayısını tutarlı raporlaması denetlenir).
   Çalıştırma: npm run test:lingo (PORT=8775 ile başka port).
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { test, expect } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const MIN_LEN = 2, MAX_LEN = 10, ROUNDS = MAX_LEN - MIN_LEN + 1;
const MIN_PER_LEN = 20;
const TR_UPPER = /^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+$/;

function loadWords() {
    const ctx = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games', 'lingo', 'kelimeler.js'), 'utf8'), ctx);
    return ctx.window.LINGO_KELIMELER;
}

test.describe('kelime havuzu (tarayıcısız)', () => {
    test(`her uzunlukta (${MIN_LEN}–${MAX_LEN}) en az ${MIN_PER_LEN} kelime; yalnız Türkçe büyük harf; kova = gerçek uzunluk; tekrar yok`, () => {
        const W = loadWords();
        const all = [];
        for (let n = MIN_LEN; n <= MAX_LEN; n++) {
            const list = W[n] || [];
            expect(list.length, `${n} harf`).toBeGreaterThanOrEqual(MIN_PER_LEN);
            for (const w of list) {
                expect(w, `${w}: yalnız Türkçe büyük harf`).toMatch(TR_UPPER);
                expect(Array.from(w).length, `${w}: ${n} harf olmalı`).toBe(n);
                all.push(w);
            }
        }
        expect(new Set(all).size, 'tekrar eden kelime').toBe(all.length);
        expect(Object.keys(W).map(Number).sort((a, b) => a - b)).toEqual(Array.from({ length: ROUNDS }, (_, i) => MIN_LEN + i));
    });
});

test.describe('seri akışı (/games/lingo/)', () => {
    test.beforeEach(async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
        page.errorsSeen = errors;
    });

    const tilesInRow = (page, r) => page.locator('#board .row').nth(r).locator('.tile');
    const curLevel = (page) => page.locator('#levels .lv.cur');

    test('9 bölüm 2→10 harf: kutu sayısı = harf, ilk harf kilitli, pes edilen kelimeler doğru uzunlukta ve tekrar etmez; özet; yeni seri 2 harfe döner', async ({ page }) => {
        await page.goto('/games/lingo/');
        await expect(page.locator('#levels .lv')).toHaveCount(ROUNDS);
        await expect(page.locator('#levels .lv').first()).toHaveText(String(MIN_LEN));
        await expect(page.locator('#levels .lv').last()).toHaveText(String(MAX_LEN));
        await expect(curLevel(page)).toHaveText(String(MIN_LEN));
        await expect(page.locator('#msg')).toContainText(`Bölüm 1/${ROUNDS}`);

        const revealed = [];
        for (let i = 0; i < ROUNDS; i++) {
            const n = MIN_LEN + i;
            await expect(curLevel(page), `bölüm ${i + 1}`).toHaveText(String(n));
            await expect(tilesInRow(page, 0)).toHaveCount(n);
            await expect(page.locator('#board .row').nth(0).locator('.tile.lock'), 'yalnız ilk harf açık').toHaveCount(1);
            await expect(page.locator('#board .row:visible')).toHaveCount(5);
            await expect(page.locator('#board')).toHaveAttribute('style', new RegExp(`--n:\\s*${n}\\b`));
            await expect(page.locator('#nextBtn')).toHaveText('Pes et');
            await page.locator('#nextBtn').click();
            const word = (await page.locator('#msg .ans').textContent()).trim();
            expect(Array.from(word).length, `${word}: ${n} harf`).toBe(n);
            revealed.push(word);
            await expect(page.locator('#levels .lv').nth(i)).toHaveClass(/\bno\b/);
            await expect(page.locator('#nextBtn')).toHaveText(i < ROUNDS - 1 ? 'Sonraki kelime ▶' : 'Sonucu gör 🏁');
            await page.locator('#nextBtn').click();
        }
        // Özet: 0 / 9 bulundu, toplam 0 puan, seri sayısı 1
        const sum = page.locator('#summary');
        await expect(sum).toBeVisible();
        await expect(sum.locator('.sumTitle')).toContainText('Seri tamamlandı');
        await expect(sum.locator('.sumScore')).toHaveText('0');
        await expect(sum.locator('.sumStat').nth(0)).toContainText(`0 / ${ROUNDS}`);
        await expect(sum.locator('.sumStat').nth(2)).toContainText('1');
        await expect(sum.locator('.sumStrip .lv')).toHaveCount(ROUNDS);
        // Kullanılanlar cihazda
        const used = await page.evaluate(() => JSON.parse(localStorage.getItem('lingo_used') || '{}'));
        for (const w of revealed) expect(used[String(Array.from(w).length)], w).toContain(w);
        const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('lingo_stats') || '{}'));
        expect(stats.episodes).toBe(1);

        // Yeni seri: 2 harfe döner; yeni serinin kelimeleri öncekilerle çakışmaz (kova 29+ → tekrar yok)
        await sum.locator('#againBtn').click();
        await expect(sum).toBeHidden();
        await expect(curLevel(page)).toHaveText(String(MIN_LEN));
        await expect(tilesInRow(page, 0)).toHaveCount(MIN_LEN);
        await expect(page.locator('#msg')).toContainText(`Bölüm 1/${ROUNDS}`);
        for (let i = 0; i < 3; i++) {
            await page.locator('#nextBtn').click();
            const word = (await page.locator('#msg .ans').textContent()).trim();
            expect(revealed, `${word} ilk seride de çıkmıştı`).not.toContain(word);
            await page.locator('#nextBtn').click();
        }
        expect(page.errorsSeen, 'JS hatası / console.error').toEqual([]);
    });

    test('doğru tahmin: ilk denemede bulunan 2 harfli kelime = 2 × 2 × 5 = 20 puan, hap yeşil, seri sayacı 1', async ({ page }) => {
        // Hedefi dışarıdan okumadan "doğru tahmin" üretmek için: kelimeyi pes edip öğren, sayfayı yenile ve
        // (kova sıfırlanana dek tekrar gelmez) → bunun yerine 2 harfli kovayı tek kelimeye indirgeyip deterministik yap.
        await page.addInitScript(() => {
            document.addEventListener('DOMContentLoaded', () => {}, { once: true });
            Object.defineProperty(window, 'LINGO_KELIMELER', {
                configurable: true,
                set(v) { v[2] = ['AT']; Object.defineProperty(window, 'LINGO_KELIMELER', { value: v, writable: true, configurable: true }); },
                get() { return undefined; },
            });
        });
        await page.goto('/games/lingo/');
        await expect(tilesInRow(page, 0)).toHaveCount(2);
        await expect(tilesInRow(page, 0).first()).toHaveText('A');
        await page.locator('#board').click();
        await page.keyboard.type('T');
        await page.keyboard.press('Enter');
        await expect(page.locator('#msg')).toContainText('+20 puan');
        await expect(page.locator('#levels .lv').first()).toHaveClass(/\bok\b/);
        await expect(page.locator('#scores .sc').first().locator('b')).toHaveText('20');
        await expect(page.locator('#scores .sc').nth(1).locator('b'), 'seri').toHaveText('1');
        await expect(page.locator('#nextBtn')).toHaveText('Sonraki kelime ▶');
        await page.locator('#nextBtn').click();
        await expect(curLevel(page)).toHaveText('3');
        await expect(tilesInRow(page, 0)).toHaveCount(3);

        // Düğmeye tıklandıktan sonra Enter/Boşluk düğmeye "tık" olmaz (odak bırakılır): tahmin pes etmeye dönüşmez
        expect(await page.evaluate(() => document.activeElement === document.getElementById('nextBtn')), 'odak düğmede kalmamalı').toBe(false);
        await page.keyboard.press('Enter');
        await page.keyboard.press(' ');
        await expect(page.locator('#nextBtn')).toHaveText('Pes et');
        await expect(page.locator('#msg .ans')).toHaveCount(0);
        await expect(curLevel(page)).toHaveText('3');
        // Odak zorla düğmeye verilse bile Enter oyun akışına gider: eksik tahmin → "Boş kutuları doldur", pes YOK
        await page.locator('#nextBtn').focus();
        await page.keyboard.type('A');
        await expect(page.locator('#board .tile.filled'), 'harf kutuya girer (odak düğmedeyken de)').toHaveCount(1);
        await page.keyboard.press('Enter');
        await expect(page.locator('#msg')).toContainText('Boş kutuları doldur');
        await expect(page.locator('#nextBtn')).toHaveText('Pes et');
        await expect(page.locator('#msg .ans')).toHaveCount(0);
        expect(page.errorsSeen, 'JS hatası / console.error').toEqual([]);
    });

    test('tur bittikten hemen sonra ikinci Enter sonucu atlamaz (700 ms kilit); sonra Enter sonraki kelimeye geçer', async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(window, 'LINGO_KELIMELER', {
                configurable: true,
                set(v) { v[2] = ['AT']; Object.defineProperty(window, 'LINGO_KELIMELER', { value: v, writable: true, configurable: true }); },
                get() { return undefined; },
            });
        });
        await page.goto('/games/lingo/');
        await expect(tilesInRow(page, 0)).toHaveCount(2);
        await page.locator('#board').click();
        await page.keyboard.type('T');
        await page.keyboard.press('Enter');
        await expect(page.locator('#msg')).toContainText('+20 puan');
        await page.keyboard.press('Enter');                 // kilit içinde: bölüm değişmez
        await expect(curLevel(page)).toHaveText('2');
        await expect(page.locator('#msg')).toContainText('+20 puan');
        await page.waitForTimeout(800);
        await page.keyboard.press('Enter');                 // kilit bitti: sonraki kelime
        await expect(curLevel(page)).toHaveText('3');
        expect(page.errorsSeen, 'JS hatası / console.error').toEqual([]);
    });
});
