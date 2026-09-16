/* exported Dialog */
/* ============================================
   Dialog — tek modal / katman API'si (Faz 2 / B3)
   --------------------------------------------
   index.html'de js/errors.js'ten hemen sonra yüklenir (defer). Dört katman bunu kullanır:
   kilit penceresi (js/app.js), meta panel (js/bilnet-meta.js), seviye tamamlama (js/engine.js),
   hesap menüsü (js/auth.js, modal:false). Katmanlarda ÖZEL Escape / Tab / odak kodu yoktur;
   hepsi burada.

     Dialog.open(el, {
         initialFocus,        // seçici | element | null — açılışta odak; yoksa ilk odaklanabilir (modal) / yerinde kalır (menü)
         returnFocus,         // seçici | element | false — kapanışta odak; varsayılan: açılış anındaki document.activeElement
         dismissible = true,  // Escape + perdeye tık kapatır; false → Escape yok sayılır (seviye tamamlama: çocuk kazara çıkmasın)
         modal = true,        // false → menü/popover: perde yok, arka plan inert değil, dışarı tık + odak kaçışı kapatır
         animate = true,      // false → giriş animasyonu yok (klavyeyle açılan katman; emil-design-eng: sık işlem = animasyon yok)
         onClose,             // (reason) => {}  reason: 'api' | 'escape' | 'backdrop' | 'outside' | 'native'
     })
     Dialog.close(el)         // kapanış animasyonu (css/hub.css .dialog--kapaniyor) bitince gerçekten kapanır
     Dialog.isOpen(el)
     Dialog.fromKeyboard(e)   // etkinleştiren olay klavyeden mi? (bindActivate keydown'ı ya da detail=0 click)

   Yol seçimi:
   - el bir <dialog> ve showModal() varsa → showModal(): üst katman, odak tuzağı ve Escape tarayıcıdan.
     Escape'i yine de keydown'da biz yakalarız (preventDefault → tarayıcının kapatma isteği hiç başlamaz;
     dismissible ise animasyonlu kapatırız). `cancel` ayrıca preventDefault'lanır (emniyet kemeri),
     `close` olayı dinlenir: tarayıcı/dış kod kapatırsa temizlik yine yapılır.
   - Yoksa (eski Safari/Chrome; Karar 10) yedek yol: `open` özniteliği elle, role="dialog" aria-modal="true",
     Tab döngüsü ve odak kaçış bekçisi elle.
   - Arka plan: modal açıkken dialog'un KARDEŞLERİ `inert` (desteklenmiyorsa aria-hidden="true"); önceden
     inert olanlara dokunulmaz, kapanışta yalnız bizim koyduklarımız kaldırılır. Kardeşler seçildi çünkü
     #meta-panel ve #level-complete #app'in İÇİNDE durur (#app'i inert yapmak dialog'u da kilitlerdi).
   - Kaydırma kilidi: ayrıca gerekmedi — html/body zaten overflow:hidden (css/main.css), tek kaydırma kabı
     .hub inert olur, perde tam ekran + overscroll-behavior:contain zincirlemeyi keser. MobileUtils.lockBodyScroll
     KULLANILMAZ: o body.game-active bayrağıdır (oyun durumu); seviye tamamlama kapanınca çağrılacak
     unlock, süren oyunun mobil kaydırma kilidini bozardı.
   - Konfeti kanvası (#particles-canvas, data-dialog-ustu): üst katmandaki dialog'un perdesi altında
     kalmasın diye popover API varsa dialog'dan SONRA üst katmana alınır (dialog'un üstünde çizer);
     son modal kapanınca indirilir. Popover yoksa perde altında sönük görünür (zarif bozulma).
   ============================================ */
const Dialog = (() => {
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
        'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    const CLOSE_FALLBACK_MS = 400;   // animationend gelmezse (kesilen animasyon vb.) bu kadar sonra kapat
    const SUPPORTS_INERT = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;

    const stack = [];   // açık katmanlar, sondaki en üstte

    function resolve(target) {
        if (!target) return null;
        if (typeof target === 'string') return document.querySelector(target);
        return target.nodeType === 1 ? target : null;
    }
    function find(el) {
        for (let i = stack.length - 1; i >= 0; i--) if (stack[i].el === el) return stack[i];
        return null;
    }
    function top() { return stack.length ? stack[stack.length - 1] : null; }
    function isOpen(el) {
        const entry = find(resolve(el));
        return !!entry && entry.state === 'open';
    }
    function isNativeDialog(el) {
        return typeof HTMLDialogElement === 'function' && el instanceof HTMLDialogElement &&
            typeof el.showModal === 'function' && typeof el.show === 'function';
    }
    function isVisible(node) {
        return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
    }
    function focusables(el) {
        return Array.from(el.querySelectorAll(FOCUSABLE)).filter((n) => isVisible(n) && !n.closest('[inert]'));
    }
    function tryFocus(node) {
        if (!node || typeof node.focus !== 'function') return false;
        try { node.focus({ preventScroll: true }); } catch (e) { try { node.focus(); } catch (e2) { return false; } }
        return document.activeElement === node;
    }
    function fromKeyboard(e) {
        if (!e) return false;
        if (e.type === 'keydown' || e.type === 'keyup') return true;
        // Gerçek <button> üstünde Enter/Boşluk → click olayı gelir; tarayıcı detail=0 verir (fare tıkı ≥ 1)
        return e.type === 'click' && e.detail === 0 && !(e.pointerType);
    }

    // ── Arka plan: kardeşleri inert (ya da aria-hidden) yap / geri al ──
    function shieldSiblings(entry) {
        const parent = entry.el.parentElement;
        if (!parent) return;
        for (const sib of parent.children) {
            if (sib === entry.el) continue;
            if (/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(sib.tagName)) continue;
            if (SUPPORTS_INERT) {
                if (sib.inert) continue;                       // zaten inert (başka katman koymuş) → dokunma
                sib.inert = true;
            } else {
                if (sib.getAttribute('aria-hidden') === 'true') continue;
                sib.setAttribute('aria-hidden', 'true');
            }
            entry.shielded.push(sib);
        }
    }
    function unshieldSiblings(entry) {
        for (const sib of entry.shielded) {
            if (SUPPORTS_INERT) sib.inert = false;
            else sib.removeAttribute('aria-hidden');
        }
        entry.shielded = [];
    }

    // ── Üst katman üstü katman: konfeti kanvası (popover API) ──
    function raiseOverlays() {
        for (const ov of document.querySelectorAll('[data-dialog-ustu]')) {
            if (typeof ov.showPopover !== 'function') break;   // popover API yok → perde altında kalır
            try {
                if (!ov.hasAttribute('popover')) ov.setAttribute('popover', 'manual');
                if (!ov.matches(':popover-open')) ov.showPopover();
            } catch (e) { /* bağlı değil / geçersiz durum → perde altında kalır */ }
        }
    }
    function lowerOverlays() {
        if (stack.some((s) => s.modal && s.native)) return;   // hâlâ üst katmanda modal var
        for (const ov of document.querySelectorAll('[data-dialog-ustu][popover]')) {
            try { if (ov.matches(':popover-open')) ov.hidePopover(); } catch (e) {}
            ov.removeAttribute('popover');
        }
    }

    // ── Belge düzeyi dinleyiciler: yalnız en az bir katman açıkken takılı ──
    let docBound = false;
    function bindDoc() {
        if (docBound) return;
        docBound = true;
        document.addEventListener('keydown', onDocKeydown, true);
        document.addEventListener('pointerdown', onDocPointerdown, true);
        document.addEventListener('focusin', onDocFocusin, true);
    }
    function unbindDoc() {
        if (!docBound || stack.length) return;
        docBound = false;
        document.removeEventListener('keydown', onDocKeydown, true);
        document.removeEventListener('pointerdown', onDocPointerdown, true);
        document.removeEventListener('focusin', onDocFocusin, true);
    }
    function onDocKeydown(e) {
        const entry = top();
        if (!entry || entry.state !== 'open') return;
        if (e.key === 'Escape' || e.key === 'Esc') {
            // Her yolda preventDefault: tarayıcının kapatma isteği (close watcher) hiç başlamaz; kapatmayı
            // (animasyonlu) biz yaparız. dismissible=false → yok sayılır (seviye tamamlama).
            e.preventDefault();
            e.stopPropagation();
            if (entry.dismissible) close(entry.el, 'escape');
            return;
        }
        // Tab döngüsü modal katmanların hepsinde: yerel showModal odağı belgede kilitler ama SARMAZ (son
        // öğeden Tab tarayıcı çubuğuna gider; APG dialog deseni sarmayı ister) → uçlarda biz sararız.
        if (e.key === 'Tab' && entry.modal) trapTab(entry, e);
    }
    function trapTab(entry, e) {
        const list = focusables(entry.el);
        if (!list.length) { e.preventDefault(); tryFocus(entry.el); return; }
        const first = list[0], last = list[list.length - 1];
        const active = document.activeElement;
        const inside = entry.el.contains(active);
        if (e.shiftKey) {
            if (!inside || active === first) { e.preventDefault(); tryFocus(last); }
        } else if (!inside || active === last) { e.preventDefault(); tryFocus(first); }
    }
    function onDocPointerdown(e) {
        const entry = top();
        if (!entry || entry.state !== 'open' || entry.modal) return;
        // Menü/popover: katmanın ve tetikleyicinin dışına basınca kapanır (tetikleyicinin kendi tıkı aç/kapa yapar)
        const t = e.target;
        if (entry.el.contains(t)) return;
        if (entry.trigger && entry.trigger.contains && entry.trigger.contains(t)) return;
        close(entry.el, 'outside');
    }
    function onDocFocusin(e) {
        const entry = top();
        if (!entry || entry.state !== 'open') return;
        const t = e.target;
        if (entry.el.contains(t)) return;
        if (entry.modal) {
            // Yedek yol bekçisi: odak dışarı sızdıysa içeri al (yerel showModal bunu kendi yapar)
            if (!entry.native) { const list = focusables(entry.el); tryFocus(list[0] || entry.el); }
            return;
        }
        if (entry.trigger && entry.trigger.contains && entry.trigger.contains(t)) return;
        close(entry.el, 'outside');   // WCAG 1.4.13: odak menüden ayrılınca menü kapanır
    }

    // ── Katman üstü dinleyiciler (perdeye tık, yerel cancel/close) ──
    function bindEl(entry) {
        const el = entry.el;
        entry.onPointerdown = (e) => { entry.downOnBackdrop = (e.target === el); };
        entry.onClick = (e) => {
            // Perde = dialog'un kendi dolgu alanı (kart dışı). Basma da perdede başlamış olmalı: kart içinde
            // başlayıp perdede biten sürükleme kapatmasın.
            if (e.target !== el || !entry.downOnBackdrop) return;
            entry.downOnBackdrop = false;
            if (entry.modal && entry.dismissible && entry.state === 'open') close(el, 'backdrop');
        };
        entry.onCancel = (e) => {
            e.preventDefault();   // Escape zaten keydown'da yakalandı; burası emniyet kemeri (dismissible ise oradan kapanır)
            if (entry.dismissible && entry.state === 'open') close(el, 'escape');
        };
        entry.onNativeClose = () => {
            // Dış kod el.close() dedi ya da tarayıcı kapattı → temizlik bizde
            if (entry.state === 'open') finishClose(entry, 'native');
        };
        el.addEventListener('pointerdown', entry.onPointerdown);
        el.addEventListener('click', entry.onClick);
        if (entry.native) {
            el.addEventListener('cancel', entry.onCancel);
            el.addEventListener('close', entry.onNativeClose);
        }
    }
    function unbindEl(entry) {
        const el = entry.el;
        el.removeEventListener('pointerdown', entry.onPointerdown);
        el.removeEventListener('click', entry.onClick);
        if (entry.native) {
            el.removeEventListener('cancel', entry.onCancel);
            el.removeEventListener('close', entry.onNativeClose);
        }
    }

    function open(target, opts = {}) {
        const el = resolve(target);
        if (!el || !el.isConnected) { console.warn('[Dialog] açılacak öğe yok:', target); return null; }
        const existing = find(el);
        if (existing) {
            if (existing.state === 'open') { placeInitialFocus(existing); return el; }
            finishClose(existing, 'api');   // kapanış animasyonundayken yeniden açıldı → hemen bitir, temiz aç
        }
        const modal = opts.modal !== false;
        const entry = {
            el, modal,
            native: isNativeDialog(el),
            dismissible: opts.dismissible !== false,
            initialFocus: opts.initialFocus,
            returnFocus: opts.returnFocus === undefined ? document.activeElement : opts.returnFocus,
            trigger: null,   // menü modunda dış tık / odak kaçışı bekçisinin muaf tuttuğu öğe (= returnFocus)
            onClose: typeof opts.onClose === 'function' ? opts.onClose : null,
            shielded: [],
            state: 'open',
            closeTimer: 0,
            downOnBackdrop: false,
            prevActive: document.activeElement,   // initialFocus:null → odak açılıştan sonra buraya geri konur
        };
        if (opts.returnFocus === false) entry.returnFocus = null;
        const trig = resolve(entry.returnFocus);
        if (trig && trig !== document.body && trig !== document.documentElement) entry.trigger = trig;

        if (!el.hasAttribute('role')) el.setAttribute('role', 'dialog');
        if (modal) el.setAttribute('aria-modal', 'true'); else el.removeAttribute('aria-modal');
        el.classList.remove('dialog--kapaniyor');
        el.classList.toggle('dialog--aninda', opts.animate === false);

        stack.push(entry);
        bindDoc();
        bindEl(entry);
        if (modal) shieldSiblings(entry);

        if (entry.native) {
            try {
                if (!el.open) { if (modal) el.showModal(); else el.show(); }
            } catch (e) {
                console.warn('[Dialog] showModal başarısız, yedek yol:', e);
                entry.native = false;
                el.setAttribute('open', '');
            }
        } else {
            el.setAttribute('open', '');
        }
        if (modal && entry.native) raiseOverlays();
        placeInitialFocus(entry);
        return el;
    }

    function placeInitialFocus(entry) {
        const want = entry.initialFocus;
        if (want === null || want === false) {
            // Menü: odak yerinde (tetikleyicide) kalır. Yerel show()/showModal() odağı ilk odaklanabilire
            // taşımıştır → geri al (Enter-Enter ile kazara "Çıkış yap" olmasın).
            const prev = entry.prevActive;
            if (prev && prev.isConnected && prev !== document.body && !entry.el.contains(prev)) tryFocus(prev);
            return;
        }
        let node = want ? (typeof want === 'string' ? entry.el.querySelector(want) : want) : null;
        if (node && !isVisible(node)) node = null;
        if (!node) node = focusables(entry.el)[0] || null;
        if (!node) {
            if (!entry.el.hasAttribute('tabindex')) entry.el.setAttribute('tabindex', '-1');
            node = entry.el;
        }
        tryFocus(node);
    }

    function close(target, reason = 'api') {
        const el = resolve(target);
        const entry = el && find(el);
        if (!entry || entry.state !== 'open') return;
        entry.state = 'closing';
        // Klavyeyle kapatma (Escape) animasyonsuz; klavyeyle açılan katman (dialog--aninda) da öyle kapanır.
        if (reason === 'escape') el.classList.add('dialog--aninda');
        // Kapanış animasyonu: sınıf CSS'te bir animasyon değiştiriyorsa onu bekle; değiştirmiyorsa (menü,
        // animasyonsuz katman, hareket azaltma: animation none) hemen bitir.
        const before = getComputedStyle(el).animationName;
        el.classList.add('dialog--kapaniyor');
        const after = getComputedStyle(el).animationName;
        const dur = parseFloat(getComputedStyle(el).animationDuration) || 0;
        if (after === before || after === 'none' || dur <= 0.02) { finishClose(entry, reason); return; }
        const done = () => finishClose(entry, reason);
        entry.onAnimEnd = (e) => { if (e.target === el) done(); };
        el.addEventListener('animationend', entry.onAnimEnd);
        entry.closeTimer = setTimeout(done, Math.min(CLOSE_FALLBACK_MS, dur * 1000 + 80));
    }

    function finishClose(entry, reason) {
        if (entry.state === 'closed') return;
        entry.state = 'closed';
        const el = entry.el;
        clearTimeout(entry.closeTimer);
        if (entry.onAnimEnd) el.removeEventListener('animationend', entry.onAnimEnd);
        unbindEl(entry);
        const i = stack.indexOf(entry);
        if (i >= 0) stack.splice(i, 1);
        el.classList.remove('dialog--kapaniyor', 'dialog--aninda');
        if (entry.native) {
            if (el.open) { try { el.close(); } catch (e) { el.removeAttribute('open'); } }
        } else {
            el.removeAttribute('open');
        }
        if (entry.modal) unshieldSiblings(entry);
        lowerOverlays();
        unbindDoc();
        // Odak dönüşü: tetikleyici hâlâ belgede ve görünürse ona; aksi hâlde odak olduğu yerde kalır
        // (kapanan dialog'un içindeyse tarayıcı body'ye düşürür).
        const back = resolve(entry.returnFocus);
        if (back && back.isConnected && back !== document.body && isVisible(back)) tryFocus(back);
        if (entry.onClose) { try { entry.onClose(reason); } catch (e) { console.error('[Dialog] onClose hatası:', e); } }
    }

    return { open, close, isOpen, fromKeyboard };
})();
