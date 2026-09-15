/* ============================================
   js/janitor.js testleri — istemci tarafı temizlikçi (24 saatten eski lobi/oda kayıtları)
   --------------------------------------------
   Canlı RTDB'ye DOKUNMAZ: sahte `db` (ref().orderByChild().endAt().limitToFirst().once() +
   ref().update()) page.evaluate ile sayfada kurulur ve Janitor.run({ db, now }) ile verilir.
   Uygulamanın kendi planladığı koşu (js/app.js proceedAfterAuth → Janitor.schedule) tohumlanmış
   eşikle atlanır (bo_janitor_last = şimdi; tests/helpers/guest-seed.js) — testler eşiği ancak o
   koşunun "atlandı" günlüğü görüldükten sonra sıfırlar (openHub), böylece gerçek db'ye koşu
   sızmaz. Sahte veritabanı RTDB sorgu sıralamasını taklit eder: createdAt'ı olmayan çocuk en
   başta (null önce), sayılar artan, endAt dahil, limitToFirst; update({k:null}) kaydı siler;
   `.info/serverTimeOffset` (sunucu − istemci, ms) varsayılan 0 — saat kayması testinde gerçek
   Firebase'in raporlayacağı değer verilir (istemci 25 sa ileri → −25 sa).
   Çalıştırma: npm run test:janitor
   ============================================ */
'use strict';

const { test: base, expect } = require('@playwright/test');
const { getActiveSlugs } = require('./helpers/slugs');
const { seedGuest, JANITOR_LAST_KEY } = require('./helpers/guest-seed');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const SKIP_PREFIX = '[Janitor] atlandı: ';
const SCHEDULED_RUN_TIMEOUT_MS = 45000;   // requestIdleCallback en geç 30 sn (js/janitor.js IDLE_TIMEOUT_MS) + yükleme payı

const { solo, online } = getActiveSlugs();
const allLockKeys = [...solo, ...online.map((id) => 'mp:' + id)];

// ── Fixture'lar: misafir tohumu (+ temizlikçi eşiği) ve konsol toplayıcı ──
const test = base.extend({
    context: async ({ context }, use) => {
        await seedGuest(context, allLockKeys);
        await use(context);
    },

    // Yakalanmamış JS hatası / (404 dışı) console.error → FAIL. warn/info/debug iddialar için toplanır.
    logs: async ({ page }, use) => {
        const pageErrors = [];
        const consoleErrors = [];
        const warnings = [];
        const infos = [];
        const debugs = [];
        const tolerated = [/status of 404\b|Kaynak yüklenemedi/];   // görsel/font 404'leri duman testinin konusu
        page.on('pageerror', (err) => pageErrors.push(err.stack || String(err)));
        page.on('console', (msg) => {
            const text = msg.text();
            const type = msg.type();
            if (type === 'warning') { warnings.push(text); return; }
            if (type === 'info') { infos.push(text); return; }
            if (type === 'debug') { debugs.push(text); return; }
            if (type !== 'error') return;
            if (tolerated.some((re) => re.test(text))) return;
            consoleErrors.push(text);
        });
        await use({
            pageErrors, consoleErrors, warnings, infos, debugs,
            tolerate(re) { tolerated.push(re); },   // testin kendi kurduğu koşulun beklenen yan etkisi (ör. çevrimdışı emülasyonu)
            assertClean() {
                expect.soft(pageErrors, 'yakalanmamış JS hatası (pageerror)').toEqual([]);
                expect.soft(consoleErrors, 'console.error (404 dışı) — unhandledrejection da buraya düşer (js/errors.js)').toEqual([]);
            },
        });
    },
});

// Hub'ı açar ve uygulamanın planladığı tek koşunun bittiğini ("atlandı: <neden>") bekler;
// döndürdüğü neden tohumlu eşikte 'throttle' olmalı. Bundan sonra eşik güvenle sıfırlanabilir.
async function openHub(page) {
    const skipped = page.waitForEvent('console', {
        predicate: (m) => m.text().startsWith(SKIP_PREFIX),
        timeout: SCHEDULED_RUN_TIMEOUT_MS,
    });
    skipped.catch(() => {});   // goto düşerse gözlemsiz ret olmasın; aşağıdaki await yine fırlatır
    await page.goto('/');
    await expect(page.locator('#hub')).toBeVisible();
    await expect(page.locator('#login-screen'), 'giriş kartı kapalı olmalı (misafir tohumu)').toBeHidden();
    return (await skipped).text().slice(SKIP_PREFIX.length);
}

const clearThrottle = (page) => page.evaluate((k) => localStorage.removeItem(k), JANITOR_LAST_KEY);
const readThrottle = (page) => page.evaluate((k) => Number(localStorage.getItem(k)), JANITOR_LAST_KEY);

// Sayfada sahte veritabanı kurar: window[name] = { ref, log, data }.
// data: { [yol]: { [anahtar]: kayıt } }
// opts.failOnce: once('value')'su reddedilecek yollar (izin hatası simülasyonu)
// opts.serverTimeOffset: .info/serverTimeOffset değeri (ms, varsayılan 0) ya da 'reject' | 'nan' | 'hang'
function installFakeDb(page, name, data, opts = {}) {
    const failOnce = opts.failOnce || [];
    const serverTimeOffset = opts.serverTimeOffset === undefined ? 0 : opts.serverTimeOffset;
    return page.evaluate(({ name, data, failOnce, serverTimeOffset }) => {
        const log = { queries: [], updates: [], clockReads: 0 };
        const rank = (v) => (v && typeof v.createdAt === 'number' ? v.createdAt : -Infinity);   // RTDB: null önce
        const cmp = (a, b) => {
            const ra = rank(a.val); const rb = rank(b.val);
            if (ra !== rb) return ra < rb ? -1 : 1;
            return a.key < b.key ? -1 : 1;
        };
        function snapshotFor(path, q) {
            if (q.orderBy !== 'createdAt') throw new Error('sahte db yalnız orderByChild("createdAt") destekler');
            const node = data[path] || {};
            const rows = Object.keys(node).map((key) => ({ key, val: node[key] }))
                .filter((r) => q.endAt === null || rank(r.val) <= q.endAt)
                .sort(cmp)
                .slice(0, q.limit === null ? undefined : q.limit);
            return {
                forEach(fn) { for (const r of rows) { if (fn({ key: r.key, val: () => r.val }) === true) return true; } return false; },
                numChildren() { return rows.length; },
            };
        }
        function ref(path) {
            if (path === '.info/serverTimeOffset') {
                return {
                    once() {
                        log.clockReads += 1;
                        if (serverTimeOffset === 'reject') return Promise.reject(new Error('.info okunamadı (sahte)'));
                        if (serverTimeOffset === 'nan') return Promise.resolve({ val: () => 'abc' });
                        if (serverTimeOffset === 'hang') return new Promise(() => {});
                        return Promise.resolve({ val: () => serverTimeOffset });
                    },
                };
            }
            const q = { orderBy: null, endAt: null, limit: null };
            const api = {
                orderByChild(field) { q.orderBy = field; return api; },
                endAt(value) { q.endAt = value; return api; },
                limitToFirst(n) { q.limit = n; return api; },
                once(event) {
                    log.queries.push({ path, event, orderBy: q.orderBy, endAt: q.endAt, limit: q.limit });
                    if (failOnce.includes(path)) return Promise.reject(new Error('permission_denied (sahte)'));
                    try { return Promise.resolve(snapshotFor(path, q)); } catch (e) { return Promise.reject(e); }
                },
                update(obj) {
                    const keys = Object.keys(obj).sort();
                    log.updates.push({ path, keys, allNull: keys.every((k) => obj[k] === null) });
                    const node = data[path] || {};
                    keys.forEach((k) => { if (obj[k] === null) delete node[k]; });
                    return Promise.resolve();
                },
            };
            return api;
        }
        window[name] = { ref, log, data };
    }, { name, data, failOnce, serverTimeOffset });
}

const runJanitor = (page, name, opts = {}) => page.evaluate(
    ({ name, opts }) => window.Janitor.run(Object.assign({ db: window[name] }, opts)), { name, opts },
);
const readLog = (page, name) => page.evaluate((n) => window[n].log, name);

// Dört yolun da desen/bayatlık sınırlarını kapsayan örnek veri (yorumlar beklentiyi söyler).
function sampleData(now) {
    return {
        'lobbies': {
            ABCDE: { createdAt: now - 2 * DAY, hostName: 'Ayşe', state: 'WAITING' },   // bayat → silinir
            FGHIJ: { createdAt: now - HOUR, hostName: 'Ali', state: 'WAITING' },       // taze → sorgu dışı
            KLMNO: { createdAt: now - DAY, state: 'FINISHED' },                        // tam sınır: endAt dahil → silinir
            ORPHN: { state: 'WAITING', hostName: 'Eski' },                             // createdAt yok → yetim → silinir
            'bad-key': { createdAt: now - 3 * DAY },                                   // desen dışı: kural yazdırmaz → dokunulmaz
        },
        'rooms/altin-avi': {
            PQRST: { createdAt: now - 25 * HOUR, state: 'PLAYING' },   // silinir
            UVWXY: { createdAt: now - 23 * HOUR, state: 'WAITING' },   // taze → sorgu dışı
        },
        'rooms/son-kart': {
            AB23: { createdAt: now - 30 * HOUR },    // silinir
            ab23: { createdAt: now - 30 * HOUR },    // küçük harf: desen dışı → dokunulmaz
            ABCDE: { createdAt: now - 30 * HOUR },   // 5 karakter: son-kart deseni 4 → dokunulmaz
        },
        'rooms/kelimelik': {
            CD45: { createdAt: now - 2 * HOUR },     // taze → sorgu dışı; silinecek yok → update çağrılmaz
        },
    };
}

test.describe('js/janitor.js — istemci tarafı temizlikçi', () => {
    test.describe.configure({ timeout: 60000 });

    test('window.Janitor yayımlanır; uygulamanın planladığı koşu tohumlanmış eşikle atlanır (canlı RTDB\'ye yazmaz)', async ({ page, logs: con }) => {
        const before = Date.now();
        const reason = await openHub(page);
        expect(reason, 'tohumlu eşik: koşu "throttle" ile atlanmalı (firebase ise SDK yüklenememiş demektir)').toBe('throttle');

        const api = await page.evaluate(() => ({
            run: typeof window.Janitor.run,
            schedule: typeof window.Janitor.schedule,
            stale: window.Janitor.STALE_MS,
            throttle: window.Janitor.THROTTLE_MS,
            batch: window.Janitor.BATCH,
            clock: window.Janitor.CLOCK_TIMEOUT_MS,
            key: window.Janitor.LAST_KEY,
        }));
        expect(api).toEqual({ run: 'function', schedule: 'function', stale: DAY, throttle: 6 * HOUR, batch: 60, clock: 10000, key: JANITOR_LAST_KEY });

        // Atlanan koşu eşik damgasını YENİLEMEZ: tohum (sayfa açılışındaki Date.now()) olduğu gibi durur.
        const stamp = await readThrottle(page);
        expect(stamp).toBeGreaterThanOrEqual(before - 1000);
        expect(stamp).toBeLessThanOrEqual(Date.now());
        expect(con.infos.filter((t) => t.startsWith('[Janitor]')), 'atlanan koşu özet basmaz').toEqual([]);
        con.assertClean();
    });

    test('sahte db: yalnız desene uyan bayat/yetim anahtarlar, yol başına tek çok-yollu update ile silinir', async ({ page, logs: con }) => {
        await openHub(page);
        const now = await page.evaluate(() => Date.now());
        await installFakeDb(page, '__fakeDb', sampleData(now));
        await page.evaluate(() => { window.FIREBASE_OK = true; });   // SDK engellense bile kapı sahte db için açık
        await clearThrottle(page);                                    // "hiç koşmamış cihaz"

        const result = await runJanitor(page, '__fakeDb', { now });
        expect(result.skipped, 'koşmalı (kapı/eşik yok)').toBeUndefined();
        expect(result).toEqual({
            now, cutoff: now - DAY, offset: 0, scanned: 8, deleted: 5, failed: 0,
            paths: {
                'lobbies': { scanned: 4, deleted: 3 },
                'rooms/altin-avi': { scanned: 1, deleted: 1 },
                'rooms/son-kart': { scanned: 3, deleted: 1 },
                'rooms/kelimelik': { scanned: 0, deleted: 0 },
            },
        });

        const log = await readLog(page, '__fakeDb');
        expect(log.clockReads, 'sunucu saati koşu başına bir kez okunur').toBe(1);
        const query = (path) => ({ path, event: 'value', orderBy: 'createdAt', endAt: now - DAY, limit: 60 });
        expect(log.queries).toEqual([query('lobbies'), query('rooms/altin-avi'), query('rooms/son-kart'), query('rooms/kelimelik')]);
        expect(log.updates).toEqual([
            { path: 'lobbies', keys: ['ABCDE', 'KLMNO', 'ORPHN'], allNull: true },
            { path: 'rooms/altin-avi', keys: ['PQRST'], allNull: true },
            { path: 'rooms/son-kart', keys: ['AB23'], allNull: true },
        ]);   // rooms/kelimelik: silinecek yok → update yok

        // Dokunulmaması gerekenler yerinde: taze, desen dışı, başka yolun deseni
        const left = await page.evaluate((n) => Object.fromEntries(Object.entries(window[n].data).map(([p, node]) => [p, Object.keys(node).sort()])), '__fakeDb');
        expect(left).toEqual({
            'lobbies': ['FGHIJ', 'bad-key'],
            'rooms/altin-avi': ['UVWXY'],
            'rooms/son-kart': ['ABCDE', 'ab23'],
            'rooms/kelimelik': ['CD45'],
        });

        expect(await readThrottle(page), 'koşu damgası = now').toBe(now);
        expect(con.infos.some((t) => /^\[Janitor\] .*lobbies 3\/4 · rooms\/altin-avi 1\/1 · rooms\/son-kart 1\/3 · rooms\/kelimelik 0\/0 → 5 silindi$/.test(t)), con.infos.join('\n')).toBe(true);
        expect(con.warnings.filter((t) => t.startsWith('[Janitor]'))).toEqual([]);
        con.assertClean();
    });

    test('eşik: aynı cihazda 6 saat dolmadan ikinci koşu sorgu bile yapmaz; 6 saat dolunca yeniden koşar', async ({ page, logs: con }) => {
        await openHub(page);
        const now = await page.evaluate(() => Date.now());
        await installFakeDb(page, '__first', sampleData(now));
        await installFakeDb(page, '__second', sampleData(now));
        await installFakeDb(page, '__third', sampleData(now));
        await page.evaluate(() => { window.FIREBASE_OK = true; });
        await clearThrottle(page);

        const first = await runJanitor(page, '__first', { now });
        expect(first.deleted).toBe(5);
        expect(await readThrottle(page)).toBe(now);

        const second = await runJanitor(page, '__second', { now: now + 6 * HOUR - 1 });
        expect(second).toEqual({ skipped: 'throttle' });
        expect((await readLog(page, '__second')).queries, 'eşikte sorgu yok').toEqual([]);
        expect(await readThrottle(page), 'atlanan koşu damgayı yenilemez').toBe(now);
        expect(con.debugs.filter((t) => t === SKIP_PREFIX + 'throttle').length).toBeGreaterThanOrEqual(2);   // planlı koşu + bu

        const third = await runJanitor(page, '__third', { now: now + 6 * HOUR });
        expect(third.skipped).toBeUndefined();
        expect((await readLog(page, '__third')).queries).toHaveLength(4);
        expect(await readThrottle(page)).toBe(now + 6 * HOUR);

        // force: eşiği atlar (elle çalıştırma / hata ayıklama)
        const forced = await runJanitor(page, '__second', { now: now + 6 * HOUR + 1, force: true });
        expect(forced.skipped).toBeUndefined();
        con.assertClean();
    });

    test('kapılar: FIREBASE_OK değilse, çevrimdışıysa ve iframe içindeyse db\'ye dokunmadan atlar', async ({ page, context, logs: con }) => {
        await openHub(page);
        // Dokunulursa fırlatan db: kapılar db'den ÖNCE çalışmalı
        await page.evaluate(() => {
            window.__touched = 0;
            window.__armed = { ref() { window.__touched += 1; throw new Error('kapı geçilmemeliydi'); } };
        });
        const touched = () => page.evaluate(() => window.__touched);

        await page.evaluate(() => { window.FIREBASE_OK = false; });
        expect(await runJanitor(page, '__armed', { force: true })).toEqual({ skipped: 'firebase' });

        await page.evaluate(() => { window.FIREBASE_OK = true; });
        // Çevrimdışı emülasyonunda sayfanın KENDİ ağ istekleri (Firebase kanalı, tembel görseller)
        // "net::ERR_INTERNET_DISCONNECTED" basar — temizlikçiyle ilgisiz, beklenen yan etki.
        con.tolerate(/net::ERR_INTERNET_DISCONNECTED/);
        await context.setOffline(true);
        expect(await page.evaluate(() => navigator.onLine), 'Playwright çevrimdışı emülasyonu navigator.onLine=false vermeli').toBe(false);
        expect(await runJanitor(page, '__armed', { force: true })).toEqual({ skipped: 'offline' });
        await context.setOffline(false);
        expect(await touched()).toBe(0);

        // iframe: aynı betik alt pencerede yüklenir, window.top !== window → atlar
        await page.evaluate(() => new Promise((resolve, reject) => {
            const f = document.createElement('iframe');
            f.name = 'janitor-frame';
            f.srcdoc = '<script src="/js/janitor.js"></script>';
            f.onload = () => resolve();
            f.onerror = () => reject(new Error('iframe yüklenemedi'));
            document.body.appendChild(f);
        }));
        const frame = page.frame({ name: 'janitor-frame' });
        expect(frame).toBeTruthy();
        const inFrame = await frame.evaluate(() => {
            window.FIREBASE_OK = true;
            let touched = 0;
            const db = { ref() { touched += 1; throw new Error('kapı geçilmemeliydi'); } };
            return window.Janitor.run({ db, force: true }).then((r) => ({ r, touched, top: window.top === window }));
        });
        expect(inFrame).toEqual({ r: { skipped: 'iframe' }, touched: 0, top: false });

        expect(con.debugs).toEqual(expect.arrayContaining([SKIP_PREFIX + 'firebase', SKIP_PREFIX + 'offline', SKIP_PREFIX + 'iframe']));
        con.assertClean();
    });

    test('dayanıklılık: bir yol reddedilse diğerleri temizlenir; söz asla reddedilmez, hata console.warn', async ({ page, logs: con }) => {
        await openHub(page);
        const now = await page.evaluate(() => Date.now());
        await installFakeDb(page, '__partial', sampleData(now), { failOnce: ['rooms/altin-avi'] });
        await page.evaluate(() => { window.FIREBASE_OK = true; });
        await clearThrottle(page);

        const result = await runJanitor(page, '__partial', { now });
        expect(result).toMatchObject({ scanned: 7, deleted: 4, failed: 1 });
        expect(result.paths['rooms/altin-avi']).toEqual({ scanned: 0, deleted: 0, error: 'permission_denied (sahte)' });
        expect((await readLog(page, '__partial')).updates.map((u) => u.path)).toEqual(['lobbies', 'rooms/son-kart']);
        expect(con.warnings.some((t) => t.startsWith('[Janitor] rooms/altin-avi temizlenemedi'))).toBe(true);
        expect(con.infos.some((t) => /^\[Janitor\] .*rooms\/altin-avi HATA .*→ 4 silindi, 1 yol hatalı$/.test(t)), con.infos.join('\n')).toBe(true);

        // Senkron patlama (yol ref()'i fırlatır; saat okunur): dört yol da hatalı, söz yine çözülür
        const broken = await page.evaluate(() => window.Janitor.run({
            db: { ref(p) { if (p === '.info/serverTimeOffset') return { once: () => Promise.resolve({ val: () => 0 }) }; throw new Error('boom'); } },
            force: true,
        }));
        expect(broken).toMatchObject({ scanned: 0, deleted: 0, failed: 4 });

        // Koşu sırasında ikinci çağrı: 'running' ile atlanır (eşzamanlı koşu yok)
        const overlap = await page.evaluate(() => {
            let release;
            const gate = new Promise((r) => { release = r; });
            const slow = { ref(p) {
                if (p === '.info/serverTimeOffset') return { once: () => Promise.resolve({ val: () => 0 }) };
                return { orderByChild() { return this; }, endAt() { return this; }, limitToFirst() { return this; }, once() { return gate.then(() => ({ forEach() {} })); } };
            } };
            const a = window.Janitor.run({ db: slow, force: true });
            const b = window.Janitor.run({ db: slow, force: true });
            release();
            return Promise.all([a, b]).then(([ra, rb]) => ({ a: ra.failed, b: rb }));
        });
        expect(overlap).toEqual({ a: 0, b: { skipped: 'running' } });
        con.assertClean();   // unhandledrejection olsaydı js/errors.js console.error basardı
    });

    test('saat: kesim sunucu saatiyle — istemci saati 25 saat ileri olsa da canlı kayıt silinmez; offset okunamazsa hiçbir şey silinmez (kapalı-güvenli)', async ({ page, logs: con }) => {
        await openHub(page);
        const now = await page.evaluate(() => Date.now());   // gerçek (sunucu) zaman: kayıtların createdAt'ı buna göre (ServerValue.TIMESTAMP)
        await page.evaluate(() => { window.FIREBASE_OK = true; });

        // İstemci saati 25 saat ileri: gerçek Firebase .info/serverTimeOffset = sunucu − istemci = −25 sa raporlar.
        // İstemci saatiyle kesim olsaydı cutoff = now + 1 sa → 1 saatlik FGHIJ (canlı oda) silinirdi.
        await installFakeDb(page, '__skew', sampleData(now), { serverTimeOffset: -25 * HOUR });
        await clearThrottle(page);
        const skewed = await runJanitor(page, '__skew', { now: now + 25 * HOUR });
        expect(skewed).toMatchObject({ now, cutoff: now - DAY, offset: -25 * HOUR, scanned: 8, deleted: 5, failed: 0 });
        const skewLog = await readLog(page, '__skew');
        expect(skewLog.queries.map((q) => q.endAt), 'sorgu kesimi sunucu saatine göre').toEqual([now - DAY, now - DAY, now - DAY, now - DAY]);
        const skewLeft = await page.evaluate(() => Object.keys(window.__skew.data.lobbies).sort());
        expect(skewLeft, 'canlı FGHIJ (1 sa) yerinde').toEqual(['FGHIJ', 'bad-key']);
        expect(await readThrottle(page), 'eşik damgası istemci saatiyle (cihaz-içi karşılaştırma)').toBe(now + 25 * HOUR);

        // Offset alınamıyor (ret / sayı değil / bağlantı yok → zaman aşımı): sorgu yok, silme yok, damga yok
        for (const [mode, extra] of [['reject', {}], ['nan', {}], ['hang', { clockTimeoutMs: 200 }]]) {
            const name = '__clock_' + mode;
            await installFakeDb(page, name, sampleData(now), { serverTimeOffset: mode });
            await clearThrottle(page);
            expect(await runJanitor(page, name, Object.assign({ now }, extra)), mode).toEqual({ skipped: 'clock' });
            const log = await readLog(page, name);
            expect(log.clockReads, mode).toBe(1);
            expect(log.queries, mode + ': yol sorgusu olmamalı').toEqual([]);
            expect(log.updates, mode + ': silme olmamalı').toEqual([]);
            expect(await readThrottle(page), mode + ': damga yazılmaz → sonraki açılışta yeniden denenir').toBe(0);
        }
        expect(con.warnings.filter((t) => t.startsWith('[Janitor] sunucu saati alınamadı'))).toHaveLength(3);
        expect(con.debugs.filter((t) => t === SKIP_PREFIX + 'clock')).toHaveLength(3);

        // Zaman aşımından sonra kilit kalmaz: sağlıklı db ile koşu yeniden mümkün
        await installFakeDb(page, '__after', sampleData(now));
        expect((await runJanitor(page, '__after', { now })).deleted).toBe(5);
        con.assertClean();
    });

    test('parti: yol başına koşu başına en fazla 60 kayıt (limitToFirst); kalanı sonraki koşuda', async ({ page, logs: con }) => {
        await openHub(page);
        const now = await page.evaluate(() => Date.now());
        const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lobbies = {};
        for (let i = 0; i < 70; i += 1) lobbies['AB' + L[Math.floor(i / 26)] + L[i % 26] + 'Z'] = { createdAt: now - 2 * DAY - i * 1000 };
        await installFakeDb(page, '__batch', { lobbies });
        await page.evaluate(() => { window.FIREBASE_OK = true; });
        await clearThrottle(page);

        const first = await runJanitor(page, '__batch', { now });
        expect(first.paths.lobbies).toEqual({ scanned: 60, deleted: 60 });
        const log = await readLog(page, '__batch');
        expect(log.updates).toHaveLength(1);
        expect(log.updates[0].keys).toHaveLength(60);

        const second = await runJanitor(page, '__batch', { now: now + 1, force: true });
        expect(second.paths.lobbies).toEqual({ scanned: 10, deleted: 10 });
        expect(await page.evaluate(() => Object.keys(window.__batch.data.lobbies).length)).toBe(0);
        con.assertClean();
    });
});
