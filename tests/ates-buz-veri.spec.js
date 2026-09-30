/* ============================================
   Ateş & Buz — seviye verisi testi (tarayıcı): zemin görseli ↔ çarpışma ızgarası BİREBİR olmalı.
   --------------------------------------------
   Neden: Seviye 1'de 59 hücre görselde katı ama çarpışmada BOŞTU (19'una ulaşılıyordu: karakter katı görünen
   bandın ortasındaki delikten düşüp duvarın içinde kalıyor, "duvardan geçiyor"). Fizik testi (Node) görseli
   göremez; bu test her seviyenin PNG'sini canvas'ta okuyup `js/collisionBlocks.js` ızgarasıyla karşılaştırır:
     • ızgara BOŞ ama görsel %85+ katı  → içinden geçilen hayalet duvar
     • ızgara BLOK ama görsel %85+ açık → görünmez duvar
     • üçgen hücrenin katı yarısı görselle aynı yönde mi (4 üçgen kodu)
   Çalıştırma: npm run test:ates-buz  (fizik testiyle birlikte) · yalnız bu: npx playwright test tests/ates-buz-veri.spec.js
   ============================================ */
'use strict';

const { test, expect } = require('@playwright/test');

test('Ateş & Buz: her seviyenin görseli çarpışma ızgarasıyla birebir (hayalet/görünmez duvar yok, üçgen yönleri doğru)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/games/ates-buz/index.html');

    const report = await page.evaluate(async () => {
        const { levels } = await import('/games/ates-buz/js/collisionBlocks.js?v=5');
        const W = 39, H = 29, B = 36;
        const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('görsel yüklenemedi: ' + src)); i.src = src; });
        // koordinat (u,v) hücre içinde [0,1]; 2 SOL-YUKARI: sağ-alt yarı, 3 SAĞ-YUKARI: sol-alt yarı, 4 SOL-AŞAĞI: sağ-üst yarı, 5 SAĞ-AŞAĞI: sol-üst yarı (CollisionBlock.draw ile aynı)
        const inside = { 2: (u, v) => u + v >= 1, 3: (u, v) => u <= v, 4: (u, v) => u >= v, 5: (u, v) => u + v <= 1 };
        const offs = [0.1, 0.3, 0.7, 0.9];
        const out = {};
        for (const n of Object.keys(levels)) {
            const img = await load(`/games/ates-buz/img/maps/level${n}.png`);
            const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
            const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
            const d = cx.getImageData(0, 0, cv.width, cv.height).data;
            const arr = levels[n];
            const ghost = [], invisible = [], badTri = [];
            for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
                let op = 0;
                for (let y = r * B; y < (r + 1) * B; y += 3) for (let x = c * B; x < (c + 1) * B; x += 3) if (d[((y * cv.width) + x) * 4 + 3] > 128) op++;
                const frac = op / 144, g = arr[r * W + c];
                if (g === 0 && frac > 0.85) ghost.push(`(${c},${r})`);
                if (g === 1 && frac < 0.15) invisible.push(`(${c},${r})`);
                if (g >= 2 && g <= 5) {
                    let mism = 0, tot = 0;
                    for (const u of offs) for (const v of offs) {
                        if (Math.abs(u + v - 1) < 0.25 && (g === 2 || g === 5)) continue;
                        if (Math.abs(u - v) < 0.25 && (g === 3 || g === 4)) continue;
                        const x = Math.floor(c * B + u * B), y = Math.floor(r * B + v * B);
                        tot++; if ((d[((y * cv.width) + x) * 4 + 3] > 128) !== inside[g](u, v)) mism++;
                    }
                    if (tot && mism / tot > 0.34) badTri.push(`(${c},${r})#${g}`);
                }
            }
            out[n] = { size: `${img.width}x${img.height}`, ghost, invisible, badTri, cells: arr.length };
        }
        return out;
    });

    expect(Object.keys(report).length, 'seviye sayısı').toBe(10);
    for (const [n, r] of Object.entries(report)) {
        expect(r.cells, `seviye ${n} ızgara uzunluğu (39×29)`).toBe(39 * 29);
        expect(r.size, `seviye ${n} görsel boyutu`).toBe('1404x1044');
        expect(r.ghost, `seviye ${n}: görselde katı ama çarpışması BOŞ (içinden geçilir)`).toEqual([]);
        expect(r.invisible, `seviye ${n}: çarpışması BLOK ama görselde açık (görünmez duvar)`).toEqual([]);
        expect(r.badTri, `seviye ${n}: üçgen hücre yönü görselle uyuşmuyor`).toEqual([]);
    }
});
