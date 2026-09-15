/* ============================================
   A9 doğrulama betiği (kanıt) — tarayıcıda gerçek davranış:
   1) hub (misafir): Google Fonts / cdnjs / unpkg isteği YOK; Fredoka+Nunito yüklü; konsol hatası 0
   2) /?oyun=lego-world → three.js + GLTFLoader ancak o zaman iner, oyun çizilir
   3) /?oyun=satranc → chess.js ancak o zaman iner
   4) /?oyun=altin-avi → Cinzel / Cinzel Decorative / Bebas Neue self-host dosyaları iner
   5) /?oyun=bilgi-ciftligi (iframe oyunu) açılır
   6) landing (/oyunlar/tetris/) ve 404.html: Google Fonts isteği yok, fontlar yüklü
   7) yükleme hatası yolu: oyun scripti engellenince toast + hub'a dönüş; engel kalkınca yeniden dener ve açılır
   8) hub kartından açma + hub'a dönüş + yeniden açma (önbellek yolu)
   Kullanım: node tests/kanit/verify-a9.js --url http://127.0.0.1:8790 --out tests/kanit/A9-dogrulama.json
   ============================================ */
'use strict';
/* global THREE */   // page.evaluate() içinde tarayıcı globali (three.js, yalnız lego-world)

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const args = process.argv.slice(2);
function opt(name, def) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; }
const BASE = opt('--url', 'http://127.0.0.1:8790').replace(/\/$/, '');
const OUT = opt('--out', path.join(__dirname, 'A9-dogrulama.json'));

const GUEST_KEY = 'bo_guest_mode';
const PROGRESS_KEY = 'oyun_bahcesi_progress';
const RESET_TOKEN_KEY = 'oyun_bahcesi_lastResetToken';

const FONT_HOSTS = /fonts\.googleapis\.com|fonts\.gstatic\.com/;
const CDN_HOSTS = /cdnjs\.cloudflare\.com|unpkg\.com/;

async function newPage(browser, { unlockAll = true } = {}) {
    const context = await browser.newContext({ locale: 'tr-TR', reducedMotion: 'reduce' });
    await context.addInitScript(({ guestKey, progressKey, resetKey, unlockAll: ua }) => {
        const keys = ['tetris', 'zipla-topla', 'space-waves', 'egim', 'buz-kulesi', 'penalti', 'zindan-okcusu',
            'mp:zipla-topla-coop', 'mp:kelime-tahmin', 'mp:harf-tahmin', 'mp:kod-macerasi', 'mp:satranc', 'mp:penalti-mp', 'mp:ates-buz', 'mp:altin-avi', 'mp:hava-hokeyi'];
        const teacherUnlocks = ua ? Object.fromEntries(keys.map((k) => [k, true])) : {};
        const progress = { version: 1, games: {}, totalStars: 0, settings: { soundEnabled: true, teacherUnlocks } };
        try { sessionStorage.setItem(guestKey, '1'); } catch (e) { /* */ }
        try { localStorage.setItem(progressKey, JSON.stringify(progress)); localStorage.setItem(resetKey, String(Number.MAX_SAFE_INTEGER)); } catch (e) { /* */ }
    }, { guestKey: GUEST_KEY, progressKey: PROGRESS_KEY, resetKey: RESET_TOKEN_KEY, unlockAll });
    const page = await context.newPage();
    const requests = [];
    const consoleErrors = [];
    const pageErrors = [];
    page.on('request', (r) => requests.push(r.url()));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    return { page, context, requests, consoleErrors, pageErrors };
}

const rel = (u) => u.replace(BASE + '/', '');
const summarize = (reqs, re) => reqs.filter((u) => re.test(u)).map(rel);

async function fontsLoaded(page) {
    await page.evaluate(() => document.fonts.ready);
    return page.evaluate(() => ({
        fredoka600: document.fonts.check('600 16px Fredoka'),
        nunito400: document.fonts.check('400 16px Nunito'),
        cinzel: document.fonts.check('400 16px Cinzel'),
        cinzelDecorative: document.fonts.check('700 16px "Cinzel Decorative"'),
        bebas: document.fonts.check('400 16px "Bebas Neue"'),
    }));
}

async function openGame(browser, slug, extra = {}) {
    const s = await newPage(browser);
    await s.page.goto(`${BASE}/?oyun=${slug}`, { waitUntil: 'load' });
    await s.page.waitForSelector('#game-container:not(.hidden)', { timeout: 15000 });
    await s.page.waitForSelector('#game-area > *', { timeout: 20000 });
    await s.page.waitForTimeout(extra.settleMs || 3000);
    const result = {
        slug,
        gameAreaChildren: await s.page.locator('#game-area > *').count(),
        title: await s.page.locator('#game-title').textContent(),
        googleFontRequests: summarize(s.requests, FONT_HOSTS),
        cdnRequests: summarize(s.requests, CDN_HOSTS),
        lazyJs: summarize(s.requests, /\/js\/games\//),
        lazyCss: summarize(s.requests, /\/css\/(?!main|animations|hub|multiplayer|games|responsive|imza|fonts\.css)/),
        localFonts: summarize(s.requests, /\/assets\/fonts\//),
        fonts: await fontsLoaded(s.page),
        consoleErrors: s.consoleErrors,
        pageErrors: s.pageErrors,
        ...(extra.probe ? { probe: await s.page.evaluate(extra.probe) } : {}),
    };
    await s.context.close();
    return result;
}

(async () => {
    const browser = await chromium.launch();
    const report = { base: BASE, at: new Date().toISOString() };

    // 1) Hub (misafir)
    {
        const s = await newPage(browser);
        await s.page.goto(`${BASE}/`, { waitUntil: 'load' });
        await s.page.waitForSelector('#hub:not(.hidden)', { timeout: 15000 });
        await s.page.waitForTimeout(3000);
        report.hub = {
            cards: await s.page.locator('#hub-grid .game-card').count(),
            googleFontRequests: summarize(s.requests, FONT_HOSTS),
            cdnRequests: summarize(s.requests, CDN_HOSTS),
            gameScriptsAtLoad: summarize(s.requests, /\/js\/games\//),
            thirdPartyHosts: [...new Set(s.requests.filter((u) => !u.startsWith(BASE)).map((u) => new URL(u).host))],
            scriptTags: await s.page.evaluate(() => [...document.querySelectorAll('script[src]')].map((x) => ({ src: x.getAttribute('src'), defer: x.defer }))),
            fonts: await fontsLoaded(s.page),
            consoleErrors: s.consoleErrors,
            pageErrors: s.pageErrors,
        };
        // 8) hub kartı → oyun → hub → aynı oyun (önbellek) — ağ isteği sayısı ikinci açılışta artmamalı
        const before = s.requests.length;
        await s.page.locator('#hub-grid .game-card[data-game="tetris"]').click();
        await s.page.waitForSelector('#game-area .tetris-wrap, #game-area canvas, #game-area > *', { timeout: 15000 });
        await s.page.waitForTimeout(1500);
        const firstOpenNew = s.requests.slice(before).map(rel);
        await s.page.locator('#game-home').click();
        await s.page.waitForSelector('#hub:not(.hidden)', { timeout: 10000 });
        const mid = s.requests.length;
        await s.page.locator('#hub-grid .game-card[data-game="tetris"]').click();
        await s.page.waitForSelector('#game-area > *', { timeout: 15000 });
        await s.page.waitForTimeout(1500);
        report.cardOpenReopen = {
            firstOpenRequests: firstOpenNew.filter((u) => /js\/games|css\/tetris/.test(u)),
            reopenGameRequests: s.requests.slice(mid).map(rel).filter((u) => /js\/games|css\/tetris/.test(u)),
            activeGame: await s.page.evaluate(() => document.body.dataset.activeGame),
            consoleErrors: s.consoleErrors, pageErrors: s.pageErrors,
        };
        await s.context.close();
    }

    // 2-5) Oyunlar
    report.legoWorld = await openGame(browser, 'lego-world', { settleMs: 5000, probe: () => ({ three: typeof THREE !== 'undefined' && THREE.REVISION, gltf: typeof THREE !== 'undefined' && typeof THREE.GLTFLoader, canvas: !!document.querySelector('#game-area canvas') }) });
    report.satranc = await openGame(browser, 'satranc', { probe: () => ({ chess: typeof Chess, board: !!document.querySelector('#game-area .chess-board') }) });
    report.altinAvi = await openGame(browser, 'altin-avi', { probe: () => ({ ff: getComputedStyle(document.querySelector('#game-area h1, #game-area .aa-title, #game-area [class*="title"]') || document.body).fontFamily }) });
    report.bilgiCiftligi = await openGame(browser, 'bilgi-ciftligi', { probe: () => ({ iframe: !!document.querySelector('#game-area iframe'), src: (document.querySelector('#game-area iframe') || {}).src }) });

    // 6) Landing + 404
    for (const [key, url] of [['landing', `${BASE}/oyunlar/tetris/`], ['notFound', `${BASE}/404.html`], ['gizlilik', `${BASE}/gizlilik/`]]) {
        const s = await newPage(browser);
        await s.page.goto(url, { waitUntil: 'load' });
        await s.page.waitForTimeout(1000);
        report[key] = { url, googleFontRequests: summarize(s.requests, FONT_HOSTS), localFonts: summarize(s.requests, /\/assets\/fonts\//), fonts: await fontsLoaded(s.page), consoleErrors: s.consoleErrors, pageErrors: s.pageErrors };
        await s.context.close();
    }

    // 7) Yükleme hatası → toast + hub; engel kalkınca yeniden dener
    {
        const s = await newPage(browser);
        let blocked = true;
        await s.context.route(/\/js\/games\/tetris\.js/, (route) => (blocked ? route.abort() : route.continue()));
        await s.page.goto(`${BASE}/`, { waitUntil: 'load' });
        await s.page.waitForSelector('#hub:not(.hidden)', { timeout: 15000 });
        await s.page.locator('#hub-grid .game-card[data-game="tetris"]').click();
        await s.page.waitForSelector('#app-toast.show', { timeout: 15000 });
        const toast = await s.page.locator('#app-toast').textContent();
        await s.page.waitForSelector('#hub:not(.hidden)', { timeout: 10000 });
        const backToHub = await s.page.locator('#game-container').evaluate((el) => el.classList.contains('hidden'));
        blocked = false;
        await s.page.locator('#hub-grid .game-card[data-game="tetris"]').click();
        await s.page.waitForSelector('#game-container:not(.hidden) #game-area > *', { timeout: 15000 });
        await s.page.waitForTimeout(1500);
        report.loadFailureRetry = {
            toast, backToHub,
            retryOpened: await s.page.evaluate(() => document.body.dataset.activeGame === 'tetris' && !!document.querySelector('#game-area > *')),
            consoleErrorsDuringFailure: s.consoleErrors,   // beklenen: AssetLoader/Hub yükleme hatası satırları
            pageErrors: s.pageErrors,
        };
        await s.context.close();
    }

    await browser.close();
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
