/* ============================================
   Tembel varlık yükleyici — oyun JS/CSS'i ilk açılışta indirilir (A9b)
   --------------------------------------------
   AssetLoader.load(['js/games/tetris.js', 'css/tetris.css']) → Promise<void>
   - Aynı URL bir kez yüklenir (önbellek: URL → Promise); ikinci çağrı aynı sözü döndürür.
   - Script'ler `async=false` ile eklenir: DİNAMİK eklenen script'ler bu bayrakla ekleme
     sırasında çalışır → bağımlılık sırası (zipla-topla-levels.js → zipla-topla.js,
     three.min.js → GLTFLoader.js → lego-world.js) indirme hızından bağımsız korunur.
   - CSS, css/responsive.css bağlantısının ÖNÜNE eklenir: eski <head> sırası korunur
     (responsive.css oyun sınıflarını aynı özgüllükle ezer; sonradan gelse ezilirdi).
   - Gerçek yükleme hatası (404/ağ): önbellek silinir, etiket kaldırılır → sonraki tıklama
     yeniden dener. Zaman aşımı: yalnız çağıran reddedilir; etiket ve önbellek KALIR
     (yarım inen script sonradan çalışabilir; ikinci kopya "already declared" hatası üretirdi).
   - Kullanıcı mesajı çağıranındır (js/app.js appToast); burada yalnız console.error.
   - window.AssetLoader olarak yayımlanır (js/errors.js → window.HubToast ile aynı kalıp):
     eslint.config.js global listesi koruma altında; çağıran `window.AssetLoader.load(…)` der.
   ============================================ */
(function () {
    const TIMEOUT_MS = 20000;   // yavaş 3G'de three.min.js (~120 KB gzip) için pay bırakır
    const cache = new Map();    // url → Promise<void>

    function isStylesheet(url) { return /\.css(?:[?#]|$)/i.test(url); }

    function insertStylesheet(link) {
        const before = document.querySelector('link[rel="stylesheet"][href*="css/responsive.css"]');
        if (before && before.parentNode) before.parentNode.insertBefore(link, before);
        else document.head.appendChild(link);
    }

    function loadOnce(url) {
        if (cache.has(url)) return cache.get(url);
        const p = new Promise((resolve, reject) => {
            const el = isStylesheet(url) ? document.createElement('link') : document.createElement('script');
            const fail = () => {
                cache.delete(url);
                if (el.parentNode) el.parentNode.removeChild(el);
                const err = new Error('Kaynak yüklenemedi: ' + url);
                console.error('[AssetLoader]', err.message);
                reject(err);
            };
            el.addEventListener('load', () => resolve(), { once: true });
            el.addEventListener('error', fail, { once: true });
            if (isStylesheet(url)) {
                el.rel = 'stylesheet';
                el.href = url;
                insertStylesheet(el);
            } else {
                el.async = false;      // ekleme sırasında çalıştır (bkz. üst not)
                el.src = url;
                document.head.appendChild(el);
            }
        });
        cache.set(url, p);
        return p;
    }

    function withTimeout(promise, url) {
        let timer = null;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Kaynak zaman aşımı (' + TIMEOUT_MS + ' ms): ' + url)), TIMEOUT_MS);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    }

    /** Listedeki tüm varlıkları (paralel indirme, sıralı çalıştırma) yükler. */
    function load(files) {
        const list = Array.isArray(files) ? files : [];
        return Promise.all(list.map((url) => withTimeout(loadOnce(url), url))).then(() => undefined);
    }

    window.AssetLoader = { load };
})();
