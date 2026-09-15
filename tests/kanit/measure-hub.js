/* ============================================
   Hub ilk yük ölçümü (A9 kanıtı) — misafir olarak "/" açılır, ağ trafiği CDP ile sayılır.
   Çıktı: istek sayısı, aktarım (transfer) ve gzip tahmini; kategori bazında (yerel JS/CSS,
   font, Firebase compat, diğer CDN, görsel). Yerel statik sunucu sıkıştırmaz → yerel dosyalar
   için gzip boyutu zlib ile hesaplanır (Vercel gzip/brotli ile aynı ya da daha küçük olur).
   Kullanım:
     node tests/static-server.js --port 8790 &
     node tests/kanit/measure-hub.js --url http://127.0.0.1:8790/ --out tests/kanit/A9-once-network.json --label once
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { URL } = require('url');
const { chromium } = require('@playwright/test');

const args = process.argv.slice(2);
function opt(name, def) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; }
const TARGET = opt('--url', 'http://127.0.0.1:8790/');
const OUT = opt('--out', path.join(__dirname, 'A9-network.json'));
const LABEL = opt('--label', '');
const SETTLE_MS = 4000;

// Depolama tohumu — tests/smoke.spec.js ile aynı anahtarlar (misafir, kilitsiz)
const GUEST_KEY = 'bo_guest_mode';
const PROGRESS_KEY = 'oyun_bahcesi_progress';
const RESET_TOKEN_KEY = 'oyun_bahcesi_lastResetToken';

const isLocal = (url) => /^http:\/\/(127\.0\.0\.1|localhost)/.test(url);

function category(url, type) {
    if (/gstatic\.com\/firebasejs/.test(url)) return 'firebase-compat';
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url)) return 'google-fonts';
    if (/cdnjs\.cloudflare\.com|unpkg\.com/.test(url)) return 'cdn-lib';
    if (/firebasedatabase\.app|googleapis\.com|firebaseapp\.com|firebase\.googleapis/.test(url)) return 'firebase-api';
    if (type === 'script') return 'local-js';
    if (type === 'stylesheet') return 'local-css';
    if (type === 'font') return 'local-font';
    if (type === 'image') return 'image';
    if (type === 'document') return 'document';
    return 'other';
}

function localFileSizes(root, url) {
    const p = decodeURIComponent(new URL(url).pathname);
    let file = path.join(root, p);
    if (p.endsWith('/')) file = path.join(file, 'index.html');
    const buf = fs.readFileSync(file);
    const alreadyCompressed = /\.(png|jpg|jpeg|webp|woff2|gif|mp3|ogg)$/i.test(p);
    return { raw: buf.length, gzip: alreadyCompressed ? buf.length : zlib.gzipSync(buf, { level: 6 }).length };
}

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({ locale: 'tr-TR', reducedMotion: 'reduce' });
    await context.addInitScript(({ guestKey, progressKey, resetKey }) => {
        const progress = { version: 1, games: {}, totalStars: 0, settings: { soundEnabled: true, teacherUnlocks: {} } };
        try { sessionStorage.setItem(guestKey, '1'); } catch (e) { /* depolama kapalı */ }
        try {
            localStorage.setItem(progressKey, JSON.stringify(progress));
            localStorage.setItem(resetKey, String(Number.MAX_SAFE_INTEGER));
        } catch (e) { /* aynı */ }
    }, { guestKey: GUEST_KEY, progressKey: PROGRESS_KEY, resetKey: RESET_TOKEN_KEY });

    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    const reqs = new Map();
    cdp.on('Network.requestWillBeSent', (e) => {
        reqs.set(e.requestId, { url: e.request.url, type: (e.type || '').toLowerCase(), transfer: 0, status: 0 });
    });
    cdp.on('Network.responseReceived', (e) => {
        const r = reqs.get(e.requestId);
        if (r) { r.status = e.response.status; r.type = (e.type || r.type).toLowerCase(); }
    });
    cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.transfer = e.encodedDataLength; });

    const t0 = Date.now();
    await page.goto(TARGET, { waitUntil: 'load' });
    const loadMs = Date.now() - t0;
    await page.waitForSelector('#hub', { state: 'visible', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(SETTLE_MS);

    const perf = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
        return {
            domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
            loadEventMs: nav ? Math.round(nav.loadEventEnd) : null,
            ...paints,
            fonts: { fredoka600: document.fonts.check('600 16px Fredoka'), nunito400: document.fonts.check('400 16px Nunito') },
            scriptTags: document.querySelectorAll('script[src]').length,
            styleTags: document.querySelectorAll('link[rel="stylesheet"]').length,
            hubCards: document.querySelectorAll('#hub-grid .game-card').length,
        };
    });

    const root = path.resolve(__dirname, '..', '..');
    const rows = [];
    for (const r of reqs.values()) {
        if (!r.status) continue;
        let raw = r.transfer;
        let gzip = r.transfer;
        if (isLocal(r.url)) {
            try { ({ raw, gzip } = localFileSizes(root, r.url)); } catch (e) { /* 404 vb. → transfer değeri kalır */ }
        }
        rows.push({ url: r.url, type: r.type, status: r.status, category: category(r.url, r.type), transfer: r.transfer, raw, gzip });
    }

    const byCat = {};
    for (const r of rows) {
        const c = byCat[r.category] || (byCat[r.category] = { requests: 0, transfer: 0, raw: 0, gzip: 0 });
        c.requests += 1; c.transfer += r.transfer; c.raw += r.raw; c.gzip += r.gzip;
    }
    const sum = (key) => rows.reduce((a, r) => a + r[key], 0);
    const kb = (n) => Math.round((n / 1024) * 10) / 10;
    const jsNoFirebase = rows.filter((r) => r.category === 'local-js' || r.category === 'cdn-lib').reduce((a, r) => a + r.gzip, 0);

    const summary = {
        label: LABEL,
        url: TARGET,
        measuredAt: new Date().toISOString(),
        loadMs,
        perf,
        totals: { requests: rows.length, transferKB: kb(sum('transfer')), rawKB: kb(sum('raw')), gzipKB: kb(sum('gzip')) },
        jsGzipKBExcludingFirebase: kb(jsNoFirebase),
        byCategory: Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, {
            requests: v.requests, transferKB: kb(v.transfer), rawKB: kb(v.raw), gzipKB: kb(v.gzip),
        }])),
        thirdPartyHosts: [...new Set(rows.filter((r) => !isLocal(r.url)).map((r) => new URL(r.url).host))],
        rows: rows.sort((a, b) => b.gzip - a.gzip),
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(Object.assign({}, summary, { rows: undefined }), null, 2));
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
