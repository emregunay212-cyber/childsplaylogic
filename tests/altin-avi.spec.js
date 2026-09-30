/* ============================================
   Altın Avı testleri — "tıklayarak geç" istismarına karşı ceza + oyun hataları.
   --------------------------------------------
   Sınıfta çocuklar soruyu okumadan hep aynı yere basıyordu: yanlışın bedeli yoktu (yanlış ekranı tek
   tıkla geçiliyordu), doğru cevap %64 B'ydi ve şıklar hep aynı sırada çıkıyordu. Bu dosya o davranışı
   kilitler; ayrıca sunucu saati, final sıralaması ve erişilebilirlik hatalarını.

   Canlı RTDB'ye DOKUNULMAZ: gstatic engellenir, tests/helpers/fake-rtdb.js sahte veritabanı kurar
   (window.__rtdb ile başka oyuncu taklit edilir). Zaman page.clock ile DURDURULUR ve elle ilerletilir
   (tick) → kilit süreleri gerçek zamana bağlı titremez.
   Çalıştırma: npm run test:altin-avi (PORT=8765 ile başka port).
   ============================================ */
'use strict';

const { test: base, expect } = require('@playwright/test');
const { getActiveSlugs } = require('./helpers/slugs');
const { seedGuest } = require('./helpers/guest-seed');
const { fakeFirebaseScript } = require('./helpers/fake-rtdb');

const { solo, online } = getActiveSlugs();
const allLockKeys = [...solo, ...online.map((id) => 'mp:' + id)];

const ROOMS = 'rooms/altin-avi/';
const READ_MS = 3100;          // okuma kilidi üst sınırı (3000 ms) + pay
const WRONG_LOCK = [3000, 5000, 8000];   // art arda 1., 2., 3.+ yanlış → tıklanamayan bekleme
const PENALTY = 10;            // yanlışta altın cezası

const test = base.extend({
    serverOffset: [0, { option: true }],   // sunucu − istemci saati (ms); saat kayması testi
    context: async ({ context, serverOffset }, use) => {
        await seedGuest(context, allLockKeys);
        await context.route(/https:\/\/www\.gstatic\.com\/firebasejs\//, (route) => route.abort());
        await context.addInitScript(fakeFirebaseScript({ offset: serverOffset }));
        await use(context);
    },
    // Her testin sonunda: yakalanmamış JS hatası / console.error yok
    errors: [async ({ page }, use) => {
        const pageErrors = [];
        const consoleErrors = [];
        page.on('pageerror', (err) => pageErrors.push(err.stack || String(err)));
        page.on('console', (msg) => {
            if (msg.type() !== 'error') return;
            const text = msg.text();
            if (/Failed to load resource|Kaynak yüklenemedi|net::ERR_FAILED/.test(text)) return;
            consoleErrors.push(text);
        });
        await use();
        expect.soft(pageErrors, 'yakalanmamış JS hatası').toEqual([]);
        expect.soft(consoleErrors, 'console.error').toEqual([]);
    }, { auto: true }],
});

// ── Yardımcılar ──
// fastForward: zamanı ATLATIR, vadesi gelen zamanlayıcıları en çok bir kez tetikler. runFor her rAF karesini
// gerçek zamanda tek tek koşturur (3 sn ≈ 1 sn gerçek) → yavaş. Oyun süre sınırlarını Date.now() ile
// hesapladığı için (okuma kilidi, yanlış bekleme) atlama yeterlidir.
const tick = (page, ms) => page.clock.fastForward(ms);
const settle = (page) => tick(page, 60);   // rAF ile birleştirilen HUD/olay çizimleri

// Oda kurar (deep link → ad → ODA AÇ → [çalma kapalı] → ODA KUR), zamanı durdurur, oda kodunu döndürür.
async function openLobby(page, { steal = true, name = 'Deneme' } = {}) {
    await page.clock.install({ time: new Date('2026-01-01T09:00:00Z') });
    await page.goto('/?oyun=altin-avi');
    await page.locator('#aa-name-input').fill(name);
    await page.getByRole('button', { name: /ODA AÇ/ }).click();
    if (!steal) await page.getByRole('button', { name: 'KAPALI', exact: true }).click();
    await page.getByRole('button', { name: /ODA KUR/ }).click();
    await expect(page.locator('#aa-start-btn')).toBeVisible();
    const code = (await page.locator('#aa-code-value').textContent()).trim();
    await page.clock.pauseAt(new Date('2026-01-01T09:05:00Z'));
    return code;
}

const addBot = (page, code, id, name, gold) => page.evaluate(([c, i, n, g]) => {
    window.__rtdb.set('rooms/altin-avi/' + c + '/players/' + i,
        { id: i, name: n, gold: g, answered: 0, correct: 0, online: true, joinedAt: 1 });
}, [code, id, name, gold]);

async function startPlaying(page) {
    await settle(page);
    await page.locator('#aa-start-btn').click();
    await expect(page.locator('.aa-question-card')).toBeVisible();
}

// Benim oyuncu kimliğim (RTDB ağacından, ada göre)
const myId = (page, code, name = 'Deneme') => page.evaluate(([c, n]) => {
    const ps = window.__rtdb.get('rooms/altin-avi/' + c + '/players') || {};
    return Object.keys(ps).find((k) => ps[k].name === n);
}, [code, name]);

const dbGet = (page, path) => page.evaluate((p) => window.__rtdb.get(p), path);
const dbSet = (page, path, v) => page.evaluate(([p, x]) => window.__rtdb.set(p, x), [path, v]);

// Ekrandaki sorunun doğru şıkkının EKRANDAKİ konumu (soru bankasından, metne göre)
const correctPos = (page) => page.evaluate(() => {
    const qText = document.querySelector('.aa-question-text').textContent;
    const q = window.ALTIN_AVI_QUESTIONS.find((x) => x.q === qText);
    const texts = [...document.querySelectorAll('.aa-option-btn .aa-opt-text')].map((e) => e.textContent);
    return texts.indexOf(q.options[q.correctIdx]);
});

async function answer(page, kind) {
    const c = await correctPos(page);
    await page.locator('.aa-option-btn').nth(kind === 'correct' ? c : (c + 1) % 4).click();
}

// Doğru cevaptan sonra: kasalar → ilkini aç → (çalma çıktıysa hedef seç) → devam
async function collectChest(page) {
    await tick(page, 1000);
    await page.locator('.aa-chest-box').first().click();
    await expect(page.locator('.aa-continue-btn, .aa-target-box').first()).toBeVisible();
    if (await page.locator('.aa-target-box').count()) {
        await page.locator('.aa-target-box').first().click();
        await expect(page.locator('.aa-continue-btn')).toBeVisible();
    }
    await page.locator('.aa-continue-btn').click();
}

// ── Testler ──
test.describe('tıklayarak geçmeye karşı ceza', () => {
    test('şıklar her gösterimde karışır: doğru cevap dört konuma da dağılır', async ({ page }) => {
        test.setTimeout(90000);
        await openLobby(page);
        await startPlaying(page);
        const pos = [0, 0, 0, 0];
        const N = 60;   // ≈4 sn sahte zaman × 60 = 4 dk < 5 dk oyun süresi
        // Playwright tıklaması (kararlılık beklemesi) tur başına ~1,5 sn tutar → DOM üzerinden hızlı tıkla
        const clickCorrectAndChest = () => page.evaluate(() => {
            const qText = document.querySelector('.aa-question-text').textContent;
            const q = window.ALTIN_AVI_QUESTIONS.find((x) => x.q === qText);
            const texts = [...document.querySelectorAll('.aa-option-btn .aa-opt-text')].map((e) => e.textContent);
            const c = texts.indexOf(q.options[q.correctIdx]);
            document.querySelectorAll('.aa-option-btn')[c].click();
            return c;
        });
        const finishChest = () => page.evaluate(() => {
            document.querySelector('.aa-chest-box').click();
        }).then(() => settle(page)).then(() => page.evaluate(() => {
            const t = document.querySelector('.aa-target-box');
            if (t) t.click();
        })).then(() => settle(page)).then(() => page.evaluate(() => {
            const b = document.querySelector('.aa-continue-btn');
            if (b) b.click();
        }));
        for (let i = 0; i < N; i++) {
            await tick(page, READ_MS);
            pos[await clickCorrectAndChest()]++;
            await tick(page, 1000);
            await finishChest();
        }
        // Beklenen ≈15 (σ≈3,4). Eski hâl: B ≈ %64 (≈38), D = 0 → "hep aynı yere bas" işliyordu.
        for (let i = 0; i < 4; i++) {
            expect(pos[i], 'konum ' + 'ABCD'[i] + ' dağılımı ' + pos.join('/')).toBeGreaterThan(3);
            expect(pos[i], 'konum ' + 'ABCD'[i] + ' dağılımı ' + pos.join('/')).toBeLessThan(32);
        }
    });

    test('yanlış cevap tıklanarak geçilemez; süre art arda yanlışla artar, doğruda sıfırlanır', async ({ page }) => {
        await openLobby(page);
        await startPlaying(page);

        // 1. yanlış: 3 sn kilit. Splash'e defalarca tıkla → hâlâ orada.
        await tick(page, READ_MS);
        await answer(page, 'wrong');
        const splash = page.locator('.aa-splash.wrong');
        await expect(splash).toBeVisible();
        // Beklemeden 5 kez tıkla (eski hâlde ilk tıklama ekranı geçiyordu; sonrakiler beklemeye düşmesin)
        for (let i = 0; i < 5; i++) await page.evaluate(() => { const s = document.querySelector('.aa-splash'); if (s) s.click(); });
        await tick(page, WRONG_LOCK[0] - 500);
        await expect(splash, 'kilit dolmadan ekran geçilmemeli').toBeVisible();
        await tick(page, 600);
        await expect(splash).toBeHidden();
        await expect(page.locator('.aa-question-card')).toBeVisible();

        // 2. art arda yanlış: 5 sn
        await tick(page, READ_MS);
        await answer(page, 'wrong');
        await expect(splash).toBeVisible();
        await tick(page, WRONG_LOCK[1] - 500);
        await expect(splash, 'ikinci yanlışta kilit daha uzun').toBeVisible();
        await tick(page, 600);
        await expect(splash).toBeHidden();

        // doğru cevap seriyi sıfırlar → sonraki yanlış yine 3 sn
        await tick(page, READ_MS);
        await answer(page, 'correct');
        await collectChest(page);
        await tick(page, READ_MS);
        await answer(page, 'wrong');
        await expect(splash).toBeVisible();
        await tick(page, WRONG_LOCK[0] + 100);
        await expect(splash, 'doğrudan sonra seri sıfırlanır (3 sn)').toBeHidden();
    });

    test('yanlış cevap altın cezası getirir, altın 0\'ın altına inmez', async ({ page }) => {
        const code = await openLobby(page);
        await startPlaying(page);
        const id = await myId(page, code);
        await dbSet(page, ROOMS + code + '/players/' + id + '/gold', 25);
        await settle(page);

        await tick(page, READ_MS);
        await answer(page, 'wrong');
        expect(await dbGet(page, ROOMS + code + '/players/' + id + '/gold')).toBe(25 - PENALTY);
        // Kendi cezam "ÇALINDI!" bildirimi tetiklememeli (HUD altın düşüşünü çalma sanıyordu)
        await settle(page);
        await expect(page.locator('.aa-toast')).toHaveCount(0);
        await expect(page.locator('.aa-splash-loss')).toHaveText('−' + PENALTY + ' ALTIN');

        await tick(page, WRONG_LOCK[0] + 100);
        await dbSet(page, ROOMS + code + '/players/' + id + '/gold', 4);
        await settle(page);
        await tick(page, READ_MS);
        await answer(page, 'wrong');
        expect(await dbGet(page, ROOMS + code + '/players/' + id + '/gold')).toBe(0);
    });

    test('okuma kilidi: soru çizilir çizilmez gelen (devreden) tıklama cevap sayılmaz', async ({ page }) => {
        const code = await openLobby(page);
        await startPlaying(page);
        const id = await myId(page, code);

        // Çizimden hemen sonra tıklama (önceki ekrandan devreden mash) → yok sayılır
        await page.evaluate(() => document.querySelector('.aa-option-btn').click());
        await settle(page);
        await expect(page.locator('.aa-splash')).toHaveCount(0);
        expect((await dbGet(page, ROOMS + code + '/players/' + id)).answered).toBe(0);

        // Okuma süresi dolunca cevap kabul edilir
        await tick(page, READ_MS);
        await answer(page, 'correct');
        expect((await dbGet(page, ROOMS + code + '/players/' + id)).answered).toBe(1);
    });
});

test.describe('çalma kasası (Blooket tarzı — kalır, host kapatabilir)', () => {
    // Kasa çekilişini çalma aralığına zorlar: drawReward tek Math.random() çağırır, 0.95 → havuzun son %10'u
    const forceLastBucket = (page) => page.evaluate(() => {
        const orig = Math.random;
        Math.random = () => 0.95;
        try { document.querySelector('.aa-chest-box').click(); } finally { Math.random = orig; }
    });

    test('çalma AÇIKken çalma kasası rakipten %20 alır', async ({ page }) => {
        const code = await openLobby(page);
        await addBot(page, code, 'PBOT1', 'Bot Bir', 200);
        await startPlaying(page);
        const id = await myId(page, code);

        await tick(page, READ_MS);
        await answer(page, 'correct');
        await tick(page, 1000);
        await forceLastBucket(page);
        await expect(page.locator('.aa-target-grid')).toBeVisible();
        await page.locator('.aa-target-box').first().click();
        await expect(page.locator('.aa-chest-result')).toBeVisible();

        expect((await dbGet(page, ROOMS + code + '/players/PBOT1')).gold).toBe(160);
        expect((await dbGet(page, ROOMS + code + '/players/' + id)).gold).toBe(40);
    });

    test('host ÇALMA: KAPALI seçerse çalma kasası hiç çıkmaz, rakibin altını değişmez', async ({ page }) => {
        const code = await openLobby(page, { steal: false });
        await addBot(page, code, 'PBOT1', 'Bot Bir', 200);
        await startPlaying(page);

        await tick(page, READ_MS);
        await answer(page, 'correct');
        await tick(page, 1000);
        await forceLastBucket(page);
        await expect(page.locator('.aa-chest-result')).toBeVisible();
        await expect(page.locator('.aa-target-grid')).toHaveCount(0);
        expect((await dbGet(page, ROOMS + code + '/players/PBOT1')).gold).toBe(200);
        expect((await dbGet(page, ROOMS + code)).stealEnabled).toBe(false);
    });
});

test.describe('oyun hataları', () => {
    test('kasa kutuları klavyeyle açılabilen düğmelerdir', async ({ page }) => {
        await openLobby(page);
        await startPlaying(page);
        await tick(page, READ_MS);
        await answer(page, 'correct');
        await tick(page, 1000);
        await expect(page.locator('button.aa-chest-box')).toHaveCount(3);
    });

    test('final sıralaması bitişten sonra gelen yazımlarla güncellenir', async ({ page }) => {
        const code = await openLobby(page);
        await addBot(page, code, 'PBOT1', 'Bot Bir', 100);
        await addBot(page, code, 'PBOT2', 'Bot İki', 50);
        await startPlaying(page);

        await dbSet(page, ROOMS + code + '/state', 'FINISHED');
        await settle(page);
        await expect(page.locator('.aa-podium-slot.rank-1 .aa-podium-name')).toHaveText('Bot Bir');

        // Bitiş anında yolda olan yazım sonradan gelir → podyum doğruyu göstermeli
        await dbSet(page, ROOMS + code + '/players/PBOT2/gold', 500);
        await settle(page);
        await expect(page.locator('.aa-podium-slot.rank-1 .aa-podium-name')).toHaveText('Bot İki');
    });

    test('final ekranındayken oda silinirse çocuk atılmaz, podyum kalır', async ({ page }) => {
        const code = await openLobby(page);
        await addBot(page, code, 'PBOT1', 'Bot Bir', 100);
        await startPlaying(page);
        await dbSet(page, ROOMS + code + '/state', 'FINISHED');
        await settle(page);
        await expect(page.locator('.aa-podium')).toBeVisible();

        // Host 60 sn sonra odayı siler (ya da temizlikçi): eskiden "Oda kapatıldı" + hub'a atma
        await dbSet(page, ROOMS + code, null);
        await tick(page, 2000);
        await expect(page.locator('.aa-podium')).toBeVisible();
        await expect(page.locator('.aa-toast')).toHaveCount(0);
    });

    test('oyun bittikten sonra kasadan altın yazılmaz', async ({ page }) => {
        const code = await openLobby(page);
        await startPlaying(page);
        const id = await myId(page, code);
        await tick(page, READ_MS);
        await answer(page, 'correct');
        await tick(page, 1000);

        // Bitiş oyuncu kasa ekranındayken gelir (final ekranı DOM'u temizler); yolda kalan kasa
        // tıklaması (DOM'dan kopmuş öğenin işleyicisi) bitişten SONRA altın yazmamalı.
        await page.evaluate(() => { window.__staleBox = document.querySelector('.aa-chest-box'); });
        await dbSet(page, ROOMS + code + '/state', 'FINISHED');
        await settle(page);
        await page.evaluate(() => window.__staleBox.click());
        await settle(page);
        expect((await dbGet(page, ROOMS + code + '/players/' + id)).gold || 0).toBe(0);
    });
});

test.describe('sunucu saati (okul cihazlarında saat kayığı)', () => {
    test.use({ serverOffset: 7 * 60 * 1000 });   // sunucu istemciden 7 dk ileri

    test('bitiş zamanı sunucu saatine göre yazılır (istemci saati kayık olsa da)', async ({ page }) => {
        const code = await openLobby(page);
        await startPlaying(page);
        const { endsAt, durationMs, serverNow } = await page.evaluate((c) => {
            const room = window.__rtdb.get('rooms/altin-avi/' + c);
            return { endsAt: room.endsAt, durationMs: room.durationMs, serverNow: window.__rtdb.serverNow() };
        }, code);
        // Doğru: endsAt ≈ sunucuNow + süre. Eski hâl: istemci Date.now() + süre → 7 dk geri kalırdı.
        expect(Math.abs(endsAt - (serverNow + durationMs))).toBeLessThan(5000);
        await expect(page.locator('#aa-timer-num')).toHaveText(/0[45]:\d\d/);
    });
});
