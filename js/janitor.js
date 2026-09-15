/* ============================================
   İstemci tarafı temizlikçi — 24 saatten eski lobi/oda kayıtları (Spark planı)
   --------------------------------------------
   Neden: lobbies/* ve rooms/* tasarım gereği herkese okunur; terk edilmiş kayıtlar çocukların
   takma adlarını süresiz taşırdı. Ücretsiz Spark planında Cloud Functions (sunucu tarafı
   zamanlayıcı) yok → temizliği ziyaretçilerin tarayıcısı boşta zamanda yapar.

   Ne yapar: her hedef yol için `orderByChild('createdAt').endAt(şimdi − 24 sa).limitToFirst(60)`
   sorgusu. RTDB sıralamasında createdAt'ı hiç olmayan çocuklar (yetimler) en başa düşer ve
   endAt'e dahildir → onlar da silinir. Anahtarı database.rules.json desenine uyanlar tek
   çok-yollu `update({ k: null, … })` ile silinir. Kurallar TEKİL kaydı silmeye izin verir,
   koleksiyonu toptan silmeye vermez; çok-yollu update'te her yol ayrı denetlenir ve tek
   reddedilen yol hepsini düşürür → anahtar süzgeci şart. createdAt istemcide de denetlenir
   (savunma: indeks/sorgu ne döndürürse döndürsün taze kayıt silinmez).

   Saat: kesim istemci saatiyle DEĞİL sunucu saatiyle alınır — `.info/serverTimeOffset`
   (sunucu − istemci, ms) okunur, şimdi = Date.now() + offset. Kayıtların createdAt'ı sunucu
   damgasıdır (ServerValue.TIMESTAMP); saati 25 saat ileri bir istemci aksi hâlde 1 saatlik canlı
   odayı silerdi. Offset okunamazsa (bağlantı yok / zaman aşımı / sayı değil) HİÇBİR ŞEY silinmez,
   koşu { skipped: 'clock' } ile biter ve eşik damgası yazılmaz (kapalı-güvenli; sonraki açılışta
   yeniden denenir).

   Kapılar (sessiz, console.debug): window.FIREBASE_OK, navigator.onLine, üst pencere (iframe
   değil), cihaz başına 6 saatte bir (localStorage bo_janitor_last; saat alınır alınmaz, silmeden
   ÖNCE yazılır → ağ hatasında yeniden deneme fırtınası yok), eşzamanlı koşu yok. Asla fırlatmaz,
   söz asla reddedilmez (js/errors.js unhandledrejection'ı console.error basar). Yol başına hata
   console.warn, özet console.info('[Janitor] …').

   Çağıran: js/app.js proceedAfterAuth → Janitor.schedule() — requestIdleCallback (yoksa 4 sn
   sonra); oyun başlatma yolunda çağrılmaz. Test (tests/janitor.spec.js): Janitor.run({ db, now,
   force, clockTimeoutMs }) ile sahte db enjekte edilir (now = istemci saati); canlı veritabanına
   dokunulmaz.

   Sunucu tarafı: database.rules.json `.indexOn: ["state","createdAt"]` dağıtılana kadar SDK
   sorguyu istemcide süzer ("Using an unspecified index" uyarısı) — çalışır ama düğümün tamamını
   indirir. `firebase deploy --only database` ile indeks devreye girer.
   ============================================ */
(function () {
    const STALE_MS = 24 * 60 * 60 * 1000;     // bundan eski kayıt bayat sayılır
    const THROTTLE_MS = 6 * 60 * 60 * 1000;   // cihaz başına en çok bu sıklıkta koşu
    const BATCH = 60;                          // yol başına koşu başına en fazla kayıt
    const IDLE_TIMEOUT_MS = 30000;             // requestIdleCallback: en geç bu kadar sonra
    const FALLBACK_DELAY_MS = 4000;            // requestIdleCallback yoksa (Safari)
    const CLOCK_TIMEOUT_MS = 10000;            // .info/serverTimeOffset bu sürede gelmezse koşu yok (bağlantı kurulamadı)
    const CLOCK_PATH = '.info/serverTimeOffset';
    const LAST_KEY = 'bo_janitor_last';        // localStorage: son koşu (istemci saati, ms epoch)

    // database.rules.json `$lobbyId` / `$code` .write desenleriyle birebir aynı olmalı.
    const TARGETS = [
        { path: 'lobbies',         key: /^[A-Z]{5}$/ },
        { path: 'rooms/altin-avi', key: /^[A-Z]{5}$/ },
        { path: 'rooms/son-kart',  key: /^[A-Z2-9]{4}$/ },
        { path: 'rooms/kelimelik', key: /^[A-Z2-9]{4}$/ },
    ];

    let running = false;
    let scheduled = false;

    function readLast() {
        try {
            const v = parseInt(localStorage.getItem(LAST_KEY), 10);
            return Number.isFinite(v) ? v : 0;
        } catch (e) { return 0; }
    }

    function writeLast(now) {
        try { localStorage.setItem(LAST_KEY, String(now)); } catch (e) { /* depolama kapalı: eşik yalnız bu sekmede (running) */ }
    }

    function isTopWindow() {
        try { return window.top === window; } catch (e) { return false; }
    }

    // null → koş; string → atlama nedeni (test ve konsol için okunur ad).
    function gate(opts, clientNow) {
        if (running) return 'running';
        if (window.FIREBASE_OK !== true) return 'firebase';
        if (navigator.onLine === false) return 'offline';
        if (!isTopWindow()) return 'iframe';
        if (!opts.force && clientNow - readLast() < THROTTLE_MS) return 'throttle';
        return null;
    }

    // Sunucu saati: istemci saati + .info/serverTimeOffset. Bağlantı yoksa SDK bu okumayı
    // el sıkışmaya kadar bekletir → zaman aşımı; sayı gelmezse hata. Her iki hâl → 'clock'.
    function serverNow(handle, clientNow, timeoutMs) {
        let timer = null;
        const read = Promise.resolve()
            .then(() => handle.ref(CLOCK_PATH).once('value'))
            .then((snap) => {
                const offset = snap && typeof snap.val === 'function' ? snap.val() : snap;
                if (typeof offset !== 'number' || !Number.isFinite(offset)) throw new Error(CLOCK_PATH + ' sayı değil: ' + offset);
                return clientNow + offset;
            });
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(CLOCK_PATH + ' zaman aşımı (' + timeoutMs + ' ms)')), timeoutMs);
        });
        return Promise.race([read, timeout]).finally(() => clearTimeout(timer));
    }

    // Tek yol: bayat + yetim kayıtları sorgula, desene uyan anahtarları tek update ile sil.
    async function sweep(handle, target, cutoff) {
        const snap = await handle.ref(target.path)
            .orderByChild('createdAt').endAt(cutoff).limitToFirst(BATCH).once('value');
        const updates = {};
        let scanned = 0;
        let deleted = 0;
        snap.forEach((child) => {
            scanned += 1;
            const val = child.val();
            const ts = val && typeof val.createdAt === 'number' ? val.createdAt : null;   // null: yetim
            if (target.key.test(child.key) && (ts === null || ts <= cutoff)) {
                updates[child.key] = null;
                deleted += 1;
            }
            // dönüş değeri yok → RTDB forEach numaralandırmaya devam eder (true = iptal)
        });
        if (deleted > 0) await handle.ref(target.path).update(updates);
        return { scanned, deleted };
    }

    function summary(r) {
        const parts = TARGETS.map((t) => {
            const p = r.paths[t.path] || {};
            return t.path + ' ' + (p.error ? 'HATA' : (p.deleted + '/' + p.scanned));
        });
        return '24 saatten eski kayıt temizliği (silinen/taranan): ' + parts.join(' · ')
            + ' → ' + r.deleted + ' silindi' + (r.failed ? ', ' + r.failed + ' yol hatalı' : '');
    }

    async function execute(opts) {
        const clientNow = typeof opts.now === 'number' ? opts.now : Date.now();
        const reason = gate(opts, clientNow);
        if (reason) { console.debug('[Janitor] atlandı: ' + reason); return { skipped: reason }; }
        const handle = opts.db || (typeof db !== 'undefined' ? db : null);   // db: js/firebase-config.js
        if (!handle) { console.debug('[Janitor] atlandı: db'); return { skipped: 'db' }; }

        running = true;
        let now;
        try {
            now = await serverNow(handle, clientNow, typeof opts.clockTimeoutMs === 'number' ? opts.clockTimeoutMs : CLOCK_TIMEOUT_MS);
        } catch (e) {
            running = false;
            console.warn('[Janitor] sunucu saati alınamadı, temizlik yapılmadı:', e);
            console.debug('[Janitor] atlandı: clock');
            return { skipped: 'clock' };
        }
        writeLast(clientNow);   // eşik istemci saatine göre (cihaz-içi karşılaştırma); silmeden önce yazılır
        const cutoff = now - STALE_MS;
        const result = { now, cutoff, offset: now - clientNow, scanned: 0, deleted: 0, failed: 0, paths: {} };
        try {
            for (const target of TARGETS) {
                try {
                    const r = await sweep(handle, target, cutoff);
                    result.paths[target.path] = r;
                    result.scanned += r.scanned;
                    result.deleted += r.deleted;
                } catch (e) {
                    result.failed += 1;
                    result.paths[target.path] = { scanned: 0, deleted: 0, error: String((e && e.message) || e) };
                    console.warn('[Janitor] ' + target.path + ' temizlenemedi:', e);
                }
            }
            console.info('[Janitor] ' + summary(result));
        } finally {
            running = false;
        }
        return result;
    }

    /**
     * Temizliği çalıştırır. Asla fırlatmaz; söz her zaman çözülür:
     * { skipped: 'running'|'firebase'|'offline'|'iframe'|'throttle'|'db'|'clock'|'error' } ya da
     * { now (sunucu), cutoff, offset, scanned, deleted, failed, paths: { [yol]: { scanned, deleted, error? } } }.
     * opts: { db?: sahte/alternatif veritabanı, now?: istemci saati (ms epoch), force?: eşiği atla,
     *         clockTimeoutMs?: .info/serverTimeOffset bekleme süresi }
     */
    function run(opts) {
        return execute(opts || {}).catch((e) => {
            running = false;
            console.warn('[Janitor] beklenmeyen hata:', e);
            return { skipped: 'error' };
        });
    }

    /** Boşta zamanda tek koşu planlar (sayfa başına bir kez; eşik ve kapılar run içinde). */
    function schedule(opts) {
        if (scheduled) return;
        scheduled = true;
        const go = () => { run(opts); };
        try {
            if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(go, { timeout: IDLE_TIMEOUT_MS });
            else setTimeout(go, FALLBACK_DELAY_MS);
        } catch (e) {
            setTimeout(go, FALLBACK_DELAY_MS);
        }
    }

    window.Janitor = { run, schedule, STALE_MS, THROTTLE_MS, BATCH, CLOCK_TIMEOUT_MS, LAST_KEY };
})();
