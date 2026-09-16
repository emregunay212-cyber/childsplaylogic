/* ============================================
   EduKit — eğitsel iframe oyunlarının ortak çekirdeği (Faz 2 / B5)
   --------------------------------------------
   Klasik <script>; tek global `window.EduKit`. Her games/<slug>/index.html gövde sonunda şu sırayla yükler:
     <script src="../_shared/edu-kit.js"></script>
     <script src="game.js"></script>
   Hub modüllerine (MobileUtils, AudioManager, Progress…) BAŞVURMAZ: iframe ayrı penceredir, kit tek
   başına çalışır. Kaynak: 20 oyundaki birebir kopya tone/pick/shuffle/storage/visibilitychange blokları
   (docs/inceleme-2026-09-15/05-muhendislik.md ORTA "aynı iskelet"; farklar kanit/B5-farklar.md).
   Davranış oyunlardaki kopyalarla birebirdir — imza, varsayılanlar ve zarf DEĞİŞTİRİLMEZ.

   API
     EduKit.version                         '1.0.0'
     EduKit.audio.init()                    tek AudioContext'i kurar (yoksa) ve askıdaysa resume eder.
                                            Kullanıcı jestinde çağrılır (oyunlar "Oyna"da çağırır). Çağrılmadan
                                            tone() sessizdir — eski kopyalarla aynı.
     EduKit.audio.unlock()                  yalnız resume (bağlam varsa ve askıdaysa). Kit ilk jestte kendisi de
                                            çağırır: pointerdown / touchstart / keydown (yakalama, pasif).
     EduKit.audio.context()                 AudioContext | null
     EduKit.tone(f, dur, type, vol, when)   osilatör tınısı — f Hz, dur SANİYE, type 'triangle', vol 0.06,
                                            when saniye gecikme; üstel sönüm 0.0001'e, stop dur+0.02.
     EduKit.pick(arr)                       rastgele eleman
     EduKit.shuffle(arr)                    Fisher-Yates, YENİ dizi döner (girdi değişmez)
     EduKit.shuffleInPlace(arr)             Fisher-Yates yerinde, aynı diziyi döner (eski oyun kopyalarının davranışı)
     EduKit.randInt(a, b)                   tam sayı [a, b] (oyunlardaki `rnd`)
     EduKit.rand(a, b)                      ondalık [a, b)
     EduKit.clamp(v, lo, hi)
     EduKit.dist(x1, y1, x2, y2)            Öklid uzaklığı
     EduKit.storage                         window.storage köprüsü — Promise API: get(key) → {value}|null,
                                            set(key, value), remove(key) (= delete). Hub köprüsü zaten
                                            tanımlıysa dokunmaz. Anahtarlar js/auth.js GAME_SAVE_KEYS ile senkronlanır.
     EduKit.onHidden(pauseFn, resumeFn?)    visibilitychange(hidden) + pagehide → pauseFn (görünür olana dek
                                            tek sefer); visibilitychange(visible) → resumeFn, pageshow (bfcache
                                            dönüşü) → resumeFn. Geri dönüş: dinleyicileri kaldıran fonksiyon.
     EduKit.toast(msg, ms = 2800)           #toast öğesi varsa onu kullanır (oyunun stili), yoksa .edu-toast
                                            oluşturur (edu-kit.css). Aynı öğede önceki zamanlayıcıyı iptal eder.
   ============================================ */
'use strict';

window.EduKit = (function () {
    var version = '1.0.0';

    /* ── Ses: tek AudioContext (Web Audio sentez — ses dosyası yok) ── */
    var ctx = null;

    function init() {
        if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    function unlock() {
        if (!ctx || ctx.state !== 'suspended') return;
        try {
            var p = ctx.resume();
            if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (e) {}
    }

    function tone(f, dur, type, vol, when) {
        if (!ctx) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(vol || 0.06, ctx.currentTime + (when || 0));
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (when || 0) + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + (when || 0)); o.stop(ctx.currentTime + (when || 0) + dur + 0.02);
    }

    // İlk kullanıcı jesti: askıdaki bağlamı uyandır. Kalıcı dinleyici (tek seferlik değil): iOS arka
    // plandan dönüşte bağlamı yeniden askıya alabilir; durum kontrolü ucuzdur.
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
        document.addEventListener(ev, unlock, { capture: true, passive: true });
    });

    /* ── Rastgelelik + sayı yardımcıları ── */
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function shuffleInPlace(a) {
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function shuffle(arr) { return shuffleInPlace(Array.prototype.slice.call(arr)); }

    function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

    function rand(a, b) { return a + Math.random() * (b - a); }

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }

    /* ── window.storage köprüsü (localStorage, Promise API) ──
       Google girişli kullanıcıda hub bu anahtarları users/{uid}/gameSaves ile senkronlar (js/auth.js). */
    var storage = (function () {
        var s = window.storage;
        if (s && typeof s.get === 'function' && typeof s.set === 'function') return s;
        s = {
            get: function (key) {
                try { var v = localStorage.getItem(key); return Promise.resolve(v != null ? { value: v } : null); }
                catch (e) { return Promise.resolve(null); }
            },
            set: function (key, value) {
                try { localStorage.setItem(key, value); return Promise.resolve(); }
                catch (e) { return Promise.resolve(); }
            },
            remove: function (key) {
                try { localStorage.removeItem(key); return Promise.resolve(); }
                catch (e) { return Promise.resolve(); }
            }
        };
        s['delete'] = s.remove;
        window.storage = s;
        return s;
    })();

    /* ── Görünürlük: sekme gizlenince duraklat (teneffüs zili güvencesi), sayfa kapanırken de kaydet ── */
    function onHidden(pauseFn, resumeFn) {
        var hidden = false;
        function hide() { if (hidden) return; hidden = true; pauseFn(); }
        function show(force) { if (!hidden && !force) return; hidden = false; if (resumeFn) resumeFn(); }
        function onVis() { if (document.hidden) hide(); else show(true); }
        function onPageShow() { show(false); }
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('pagehide', hide);
        window.addEventListener('pageshow', onPageShow);
        return function off() {
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('pagehide', hide);
            window.removeEventListener('pageshow', onPageShow);
        };
    }

    /* ── Kısa bildirim ── */
    var toastTimers = new WeakMap();

    function toast(msg, ms) {
        var el = document.getElementById('toast') || document.querySelector('.edu-toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'edu-toast';
            document.body.appendChild(el);
        }
        if (!el.getAttribute('role')) { el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); }
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimers.get(el));
        toastTimers.set(el, setTimeout(function () { el.classList.remove('show'); }, ms || 2800));
        return el;
    }

    return {
        version: version,
        audio: { init: init, unlock: unlock, tone: tone, context: function () { return ctx; } },
        tone: tone,
        pick: pick,
        shuffle: shuffle,
        shuffleInPlace: shuffleInPlace,
        randInt: randInt,
        rand: rand,
        clamp: clamp,
        dist: dist,
        storage: storage,
        onHidden: onHidden,
        toast: toast
    };
})();
