/* ============================================
   Global hata yakalama + paylaşılan bildirim (toast)
   --------------------------------------------
   index.html'de diğer uygulama script'lerinden ÖNCE yüklenir; böylece bir oyun
   modülü yüklenirken fırlayan hata bile yakalanır. Hiçbir hata yutulmaz:
   ayrıntı konsola (console.error), kullanıcıya kısa Türkçe toast.
   window.HubToast.show(msg) → app.js (appToast) ve auth.js de bunu kullanır.
   ============================================ */
(function () {
    const TOAST_MS = 3200;
    const REPEAT_GUARD_MS = 4000;   // aynı mesajı bu süre içinde tekrar gösterme (spam önleme)
    let toastEl = null;
    let toastTimer = null;
    let lastMsg = '';
    let lastAt = 0;

    function ensureToastEl() {
        if (toastEl && toastEl.isConnected) return toastEl;
        toastEl = document.getElementById('app-toast');
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'app-toast';
            toastEl.setAttribute('role', 'status');
            toastEl.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastEl);
        }
        return toastEl;
    }

    function show(msg) {
        if (!document.body) { console.warn('[Toast] body hazır değil:', msg); return; }
        const t = ensureToastEl();
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), TOAST_MS);
    }

    // Aynı hata art arda gelirse (ör. animasyon döngüsü) kullanıcıyı toast yağmuruna tutma
    function notifyOnce(msg) {
        const now = Date.now();
        if (msg === lastMsg && now - lastAt < REPEAT_GUARD_MS) return;
        lastMsg = msg; lastAt = now;
        show(msg);
    }

    // capture=true: <script>/<img> yükleme hataları da (bubbling yapmaz) buraya düşer
    window.addEventListener('error', (ev) => {
        if (ev.target && ev.target !== window) {
            const src = ev.target.src || ev.target.href || '';
            console.error('[Hub] Kaynak yüklenemedi:', ev.target.tagName, src);
            return;   // eksik görsel/script kullanıcı için eyleme dönük değil; kart zaten atlanır
        }
        const where = ev.filename ? (' @ ' + ev.filename + ':' + ev.lineno + ':' + ev.colno) : '';
        console.error('[Hub] Yakalanmamış hata' + where, ev.error || ev.message);
        notifyOnce('Bir şeyler ters gitti — sayfa çalışmaya devam ediyor.');
    }, true);

    window.addEventListener('unhandledrejection', (ev) => {
        console.error('[Hub] Yakalanmamış promise hatası:', ev.reason);
        notifyOnce('Bir işlem tamamlanamadı.');
    });

    window.HubToast = { show, once: notifyOnce };
})();
