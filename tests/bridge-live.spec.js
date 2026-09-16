/* ============================================
   BilnetBridge CANLI iki cihaz testi (Faz 2 / B6) — hub üzerinden gerçek RTDB (Spark) ile.
   Varsayılan olarak ATLANIR (CI'da koşmaz): `BRIDGE_LIVE=1 PORT=8782 npm run test:bridge-live`.
   İki bağımsız browser.newContext() = iki cihaz (ayrı depolama, ayrı Firebase bağlantısı); ikisi de misafir.
     1. Son Kart: A oda kurar → B kodla katılır → A başlatır → iki taraf sırayla oynar; el biter ya da
        hamle tavanına (MAX_TURNS) gelinir; her iki taraf en az bir hamle yapmış olmalı. Oda kodu rapora yazılmaz.
     2. Kelimelik: A oda kurar → B kodla katılır → A "Geç" → B "Rakip pas geçti. Sıra sende." → B "Geç" → A aynı
        (= 1 tam tur, iki taraf da oynadı).
     3. Hava Hokeyi ve Ateş & Buz (görev 3, köprü üzerinden lobi oyunları): A hub lobisinde oda kurar, B listeden
        katılır → iki iframe `?role=&lobbyId=` ile açılır; hub RTDB'sinde `lobbies/<kod>/hh|ab` altında host durumu
        + iki presence görünür (iframe'ler hub köprüsüyle yazdı), iframe konsolunda "bağlantı kurulamadı" yok.
   Test lobileri `createdAt` taşır → js/janitor.js 24 saat sonra temizler; oyuncu presence'ı onDisconnect ile silinir.
   ============================================ */
'use strict';

const { test: base, expect } = require('@playwright/test');
const { getActiveSlugs } = require('./helpers/slugs');
const { seedGuest } = require('./helpers/guest-seed');

const LIVE = !!process.env.BRIDGE_LIVE;
const MAX_TURNS = 160;          // Son Kart: bir el tipik 20–60 hamle; tavan = güvenlik
const TURN_WAIT_MS = 400;
const { solo, online } = getActiveSlugs();
const allLockKeys = [...solo, ...online.map((id) => 'mp:' + id)];

const test = base.extend({});
test.describe.configure({ mode: 'serial' });
test.setTimeout(240000);
test.use({ actionTimeout: 15000 });   // tek bir tıklama asılırsa test 4 dk değil 15 sn'de düşsün (hangi adım, belli olsun)

/** Yeni "cihaz": ayrı bağlam + misafir tohumu + hata toplayıcı. */
async function newDevice(browser, label) {
    const context = await browser.newContext();
    await seedGuest(context, allLockKeys);
    const page = await context.newPage();
    const errors = [];
    const logs = [];
    page.on('pageerror', (err) => errors.push(`${label}: ${err.stack || err}`));
    page.on('console', (msg) => {
        const t = msg.text();
        logs.push(`${msg.type()}: ${t}`);
        if (msg.type() === 'error' && !/404|Kaynak yüklenemedi|Failed to load resource/.test(t)) errors.push(`${label}: ${t}`);
    });
    return { context, page, errors, logs, label };
}

async function hubGameFrame(page, slug) {
    await expect(page.locator('#game-area iframe')).toBeAttached();
    await expect.poll(() => page.frames().some((f) => f.url().includes(`/games/${slug}/`))).toBe(true);
    return page.frames().find((f) => f.url().includes(`/games/${slug}/`));
}

/** Hub'daki köprüden RTDB yolunu okur (testin gözü: iframe'lerin yazdığı veri). */
function readPath(page, path) {
    return page.evaluate(async (p) => {
        const db = await window.BilnetBridge.ready();
        if (!db) return null;
        const s = await db.ref(p).once('value');
        return s.val();
    }, path);
}

test.describe('Canlı iki cihaz (BRIDGE_LIVE=1)', () => {
    test.skip(!LIVE, 'Canlı RTDB testi: BRIDGE_LIVE=1 ile koşar');

    test('Son Kart: oda kur → kodla katıl → bir el', async ({ browser }) => {
        const A = await newDevice(browser, 'A');
        const B = await newDevice(browser, 'B');
        try {
            await A.page.goto('/?oyun=son-kart');
            const fa = await hubGameFrame(A.page, 'son-kart');
            await expect(fa.locator('#screen-menu.active')).toBeVisible();
            await expect(fa.getByRole('button', { name: 'Oda Kur' })).toBeEnabled();
            await fa.getByRole('button', { name: 'Oda Kur' }).click();
            await expect(fa.locator('#screen-lobby.active')).toBeVisible({ timeout: 20000 });
            const code = (await fa.locator('.sk-code-box .code').textContent()).trim();
            expect(code).toMatch(/^[A-Z2-9]{4}$/);

            await B.page.goto('/?oyun=son-kart');
            const fb = await hubGameFrame(B.page, 'son-kart');
            await expect(fb.locator('#screen-menu.active')).toBeVisible();
            await fb.locator('#screen-menu .sk-field input').fill(code);
            await fb.getByRole('button', { name: 'Katıl' }).click();
            await expect(fb.locator('#screen-lobby.active')).toBeVisible({ timeout: 20000 });

            const start = fa.getByRole('button', { name: 'Başlat' });
            await expect(start).toBeEnabled({ timeout: 20000 });
            await start.click();
            await expect(fa.locator('#screen-game.active')).toBeVisible({ timeout: 20000 });
            await expect(fb.locator('#screen-game.active')).toBeVisible({ timeout: 20000 });

            const moves = { A: 0, B: 0 };
            let finished = false;
            for (let turn = 0; turn < MAX_TURNS && !finished; turn++) {
                let acted = false;
                for (const [who, f] of [['A', fa], ['B', fb]]) {
                    if (await f.locator('#sk-resultmodal.show').isVisible().catch(() => false)) { finished = true; break; }
                    if (!(await f.locator('.sk-hand.myturn').isVisible().catch(() => false))) continue;
                    // Kural: elde 2 kart kalınca oynamadan önce "SON KART!" denir; denmezse +2 ceza → el hiç bitmez
                    const uno = f.locator('.sk-uno-btn');
                    if (await uno.isVisible().catch(() => false)) await uno.click({ force: true });   // düğme nabız animasyonlu: "stable" beklemez
                    const playable = f.locator('.sk-hand .sk-card.playable');
                    if (await playable.count()) {
                        await playable.first().click();
                        const cm = f.locator('#sk-colormodal.show');
                        if (await cm.isVisible().catch(() => false)) await cm.locator('button').first().click();
                    } else {
                        await f.locator('.sk-draw-card').click();
                        await f.waitForTimeout(TURN_WAIT_MS);
                        const pass = f.getByRole('button', { name: 'Pas Geç' });
                        if (await pass.isVisible().catch(() => false)) await pass.click();
                        else {
                            const p2 = f.locator('.sk-hand .sk-card.playable');
                            if (await p2.count()) {
                                await p2.first().click();
                                const cm = f.locator('#sk-colormodal.show');
                                if (await cm.isVisible().catch(() => false)) await cm.locator('button').first().click();
                            }
                        }
                    }
                    moves[who]++; acted = true;
                    await f.waitForTimeout(TURN_WAIT_MS);
                }
                if (!acted) await A.page.waitForTimeout(TURN_WAIT_MS);
            }
            const resultA = await fa.locator('#sk-resultmodal.show').isVisible().catch(() => false);
            const resultB = await fb.locator('#sk-resultmodal.show').isVisible().catch(() => false);
            test.info().annotations.push({ type: 'son-kart', description: `hamle A=${moves.A} B=${moves.B}; el bitti: ${resultA || resultB}` });
            console.log(`[bridge-live] Son Kart: hamle A=${moves.A} B=${moves.B}; el bitti: ${resultA || resultB}`);
            expect(moves.A, 'A en az bir hamle').toBeGreaterThan(0);
            expect(moves.B, 'B en az bir hamle').toBeGreaterThan(0);
            expect(A.errors.concat(B.errors), 'iki cihazda JS hatası 0').toEqual([]);
        } finally {
            await A.context.close(); await B.context.close();
        }
    });

    test('Kelimelik: oda kur → kodla katıl → 1 tam tur (iki pas)', async ({ browser }) => {
        const A = await newDevice(browser, 'A');
        const B = await newDevice(browser, 'B');
        try {
            await A.page.goto('/?oyun=kelimelik');
            const fa = await hubGameFrame(A.page, 'kelimelik');
            await expect(fa.locator('.kl-menu')).toBeVisible();
            const create = fa.locator('.kl-mbtn', { hasText: 'Oda Kur' });
            await expect(create).toBeEnabled();
            await create.click();
            const codeEl = fa.locator('.kl-bigcode');
            await expect(codeEl).toBeVisible({ timeout: 20000 });
            const code = (await codeEl.textContent()).trim();
            expect(code).toMatch(/^[A-Z2-9]{4}$/);

            await B.page.goto('/?oyun=kelimelik');
            const fb = await hubGameFrame(B.page, 'kelimelik');
            await expect(fb.locator('.kl-menu')).toBeVisible();
            await fb.locator('#kl-joincode').fill(code);
            await fb.locator('.kl-mbtn', { hasText: 'Katıl' }).click();
            await expect(fb.locator('.kl-board')).toBeVisible({ timeout: 20000 });
            await expect(fa.locator('.kl-board')).toBeVisible({ timeout: 20000 });

            await expect(fa.locator('#kl-msg')).toContainText('Sıra sende', { timeout: 20000 });
            await expect(fb.locator('#kl-msg')).toContainText('Rakip oynuyor');
            await fa.locator('.kl-btn', { hasText: 'Geç' }).click();
            await expect(fb.locator('#kl-msg')).toContainText('Rakip pas geçti', { timeout: 20000 });
            await expect(fb.locator('#kl-msg')).toContainText('Sıra sende');
            await fb.locator('.kl-btn', { hasText: 'Geç' }).click();
            await expect(fa.locator('#kl-msg')).toContainText('Rakip pas geçti', { timeout: 20000 });
            await expect(fa.locator('#kl-msg')).toContainText('Sıra sende');
            const rackA = await fa.locator('#kl-rack .kl-tile').count();
            const rackB = await fb.locator('#kl-rack .kl-tile').count();
            console.log(`[bridge-live] Kelimelik: 1 tam tur (A pas, B pas); ıstaka A=${rackA} B=${rackB}`);
            expect(rackA).toBe(7); expect(rackB).toBe(7);
            // temiz ayrıl (oda leftBy alır; janitor 24 saat sonra siler)
            await fa.locator('.kl-exit').click();
            await fb.locator('.kl-exit').click();
            expect(A.errors.concat(B.errors), 'iki cihazda JS hatası 0').toEqual([]);
        } finally {
            await A.context.close(); await B.context.close();
        }
    });

    for (const [slug, node, hostKey] of [['hava-hokeyi', 'hh', 'hostState'], ['ates-buz', 'ab', 'hostState']]) {
        test(`${slug}: hub lobisi → iki iframe köprüyle ${node} düğümüne yazar`, async ({ browser }) => {
            const A = await newDevice(browser, 'A');
            const B = await newDevice(browser, 'B');
            try {
                await A.page.goto(`/?oyun=${slug}`);
                await A.page.locator('[data-action="create"]').click();
                await A.page.locator('.lobby-submit-btn').click();
                const codeEl = A.page.locator('.lobby-code');
                await expect(codeEl).toBeVisible({ timeout: 20000 });
                const code = (await codeEl.textContent()).trim();
                expect(code).toMatch(/^[A-Z]{5}$/);

                await B.page.goto(`/?oyun=${slug}`);
                await B.page.locator('[data-action="join"]').click();
                const joinBtn = B.page.locator(`.lobby-join-btn[data-id="${code}"]`);
                for (let i = 0; i < 10 && !(await joinBtn.isVisible().catch(() => false)); i++) {
                    await B.page.waitForTimeout(1000);
                    const refresh = B.page.locator('.lobby-refresh-btn');
                    if (await refresh.isVisible().catch(() => false)) await refresh.click();
                }
                await expect(joinBtn, 'B listede A\'nın odasını görmeli').toBeVisible({ timeout: 20000 });
                await joinBtn.click();

                const fa = await hubGameFrame(A.page, slug);
                const fb = await hubGameFrame(B.page, slug);
                expect(fa.url()).toMatch(/role=host/); expect(fb.url()).toMatch(/role=guest/);

                const path = `lobbies/${code}/${node}`;
                await expect.poll(async () => {
                    const v = await readPath(A.page, path);
                    return !!(v && v[hostKey] && v.presence && v.presence.host && v.presence.guest);
                }, `${slug}: ${node}/${hostKey} + presence.host + presence.guest hub RTDB'sinde görünmeli (iframe'ler köprüyle yazdı)`).toBe(true, { timeout: 60000 });

                const badLogs = A.logs.concat(B.logs).filter((l) => /bağlantı kurulamadı|BilnetBridge\) yok|offline mod/i.test(l));
                expect(badLogs, 'iframe konsolunda köprü/bağlantı uyarısı 0').toEqual([]);
                console.log(`[bridge-live] ${slug}: host+guest iframe köprüyle yazdı (${node}: ${hostKey}, presence ×2)`);
                expect(A.errors.concat(B.errors), 'iki cihazda JS hatası 0').toEqual([]);
            } finally {
                await A.context.close(); await B.context.close();
            }
        });
    }
});
