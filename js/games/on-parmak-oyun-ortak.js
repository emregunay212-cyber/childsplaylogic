/* ============================================
   On Parmak — dört mini oyunun ortak parçaları → window.OnParmakOyunOrtak
   --------------------------------------------
   Spec §6.1. Yalnız rAF + visibilitychange'e dokunur (DOM'suz); testler: tests/on-parmak.spec.js.

   dongu(adimFn, { simdi?, azami? })  →  denetleyici
     adimFn(dt, t): dt = ms (en çok `azami`, vars. 100 — devamdan sonra sıçrama olmasın), t = rAF zaman damgası.
     denetleyici: { durdur(), durum(), devamTusu(), duraklat(neden), surdur(neden) }
       durum(): 'calisiyor' | 'duraklatildi' (en az bir duraklatma nedeni var, rAF yok) | 'gizli' (sekme gizli, rAF yok)
         | 'devam-bekliyor' (sekme göründü, tuş bekleniyor) | 'durdu'
       devamTusu(): oyun modülü HER tuşta ÖNCE bunu çağırır. true → tuş yutuldu (sayma, işleme); 'devam-bekliyor'
         durumundaysa döngüyü yeniden başlatır (devam tuşu sayılmaz) — ama açık bir duraklatma nedeni varsa (ör. Caps
         Lock) BAŞLATMAZ, yine true döner. 'gizli' durumunda da true; 'duraklatildi' durumunda false (çağıranın işi).
       duraklat(neden) / surdur(neden): nedenler bağımsızdır (ör. 'caps'); hepsi kalkınca döngü HEMEN sürer (devam tuşu
         gerekmez), dt sıçramaz (onceki sıfırlanır). Sekme gizliliği ayrı yoldur: gizli/devam-bekliyor iken surdur
         döngüyü başlatmaz, görünür + tuş gerekir. 'durdu' sonrası ikisi de etkisiz.
       Oyun, durum 'devam-bekliyor' olunca "Devam etmek için bir tuşa bas" yazısını durum() ile çizer
       (opts.durumDegisti(durum) çağrılır).
     adimFn fırlatırsa: console.error + döngü durur (durum 'durdu').
     Sekme oluşturulurken zaten gizliyse durum 'gizli' başlar; ilk durumDegisti('gizli') bildirimi mikro görevde (dongu() döndükten sonra) gelir.
     durdur(): rAF iptal + visibilitychange dinleyicisi kaldırılır (hub'a dönüşte sızıntı yok); tekrar çağrılabilir.

   uyarlanirHiz({ taban, min, max, artis, azalis, azaltilmisHareket? })  →  { deger(), basari(), canKaybi() }
     Başlangıç = taban. basari: +artis (≤ max), canKaybi: −azalis (≥ min). prefers-reduced-motion (ya da
     azaltilmisHareket:true) açıksa taban × 0.6 (≥ min).

   hedefSec(hedefler, harf, kilit?)  →  hedef | null
     hedef = { kelime, tehlike, ilerleme? } — tehlike: büyük = tehlikeye yakın (oyun kendi birimini normalize eder);
     ilerleme: yazılmış harf sayısı (vars. 0). kilit: hedefler içindeki mevcut kilitli hedef → olduğu gibi döner
     (kelime bitene dek kilit sürer; kilitliyken beklenen harfi oyun kelime[ilerleme]'ye bakıp kendisi doğrular).
     Kilit yoksa: ilk harfi `harf` olan, henüz başlanmamış hedefler arasından tehlikesi en yüksek (eşitte ilk). Yoksa null
     (basış hata sayılır). Harf eşleşmesi harf büyüklüğüne duyarlıdır, BİLEREK (Shift öğretilir: 'e' "Elma"yı vurmaz);
     çağıran KlavyeDizilim.karakterOf çıktısını olduğu gibi verir.

   enAcil(hedefler)  →  hedef | null   tehlikesi en yüksek hedef (eşitte ilk).
   beklenenHarf(hedefler, kilit?)  →  harf | null   çok hedefli oyunda klavye vurgusu: kilit varsa kilitli kelimenin
     sıradaki harfi (kelime[ilerleme]); yoksa en acil hedefin İLK harfi (o harf basılırsa hedefSec de aynı hedefi seçer).
     hedefler = SEÇİLEBİLİR hedefler (ör. Elma'da yalnız sahnede görünen sincaplar).
   hedefBildirici(kok, cb?)  →  yaz(ch)   hedef değişince (yalnız o zaman) kok.dataset.hedef + cb(ch|null).

   rng(tohum)  →  () => [0,1)   mulberry32; aynı tohum = aynı dizi.

   ── Sahne yardımcıları (dört oyunda ortak; kopya yazılmaz) ──
   svgEl(tag, attrs?, parent?) / htmlEl(tag, cls?, text?)  createElementNS / createElement; metin YALNIZ textContent ile.
   easeOut(t) = 1 − (1 − t)³.
   tepeYolu(rnd, { x0, son, adim, taban, genlik, alt })  →  SVG yol dizgesi: x0'dan son'a adim aralıklı tepeler, alt kenarı kapalı;
     tepe başına tam bir rnd() (belirleyici).
   canlarHud(n, { ad = 'Can', yol = kalp, sinif? })  →  { el, guncelle(can) }   can hapı (.op-mini__canlar, n × .op-mini__can
     [+ sinif]); guncelle giden canları is-gitti (içi boş) yapar ve aria-label "<ad>: c / n" yazar. Elma Bekçisi elma yoluyla çağırır.
   devamKatmani()  →  el   "Oyun durdu / Devam etmek için bir tuşa bas" (.op-mini__devam, role=status, başta hidden).

   oyunKabugu({ kok, svg, H, devam, adim, olcu? })  →  kabuk   — bir oyunun döngü + ölçü + durum + tutamaç kabuğu
     kok DOM'da olmalı. Oluşturunca: ölçü okunur (kabuk.W = H × en/boy, 360–1600; ölçü yoksa 800), svg viewBox '0 0 W H',
     olcu(W) çağrılır, ResizeObserver kurulur (boyut değişince aynısı). Oyun ilk çizimini yaptıktan sonra:
     kabuk.baslat(basFn) → tutamaç { bas(ch), devamTusu(), duraklat(acik) } — dongu(adim) başlar; durum her değişince
       kok.dataset.durum yazılır, devam katmanı yalnız 'devam-bekliyor'da görünür; duraklat(true|false) = dongu duraklat/surdur('caps').
     kabuk.dongu (denetleyici), kabuk.etkin() (durdur'dan sonra false). kabuk.durdur(): döngü + ResizeObserver durur, kok
     DOM'dan çıkar; durdur'dan sonra tutamaç, ölçü ve durum geri çağrıları etkisizdir (eski oyun yeni oyuna yazamaz). Tekrar çağrılabilir.
   Oyun dosyası kalıbı: s = {…}; s.kabuk = O.oyunKabugu({ …, olcu: (W) => { s.W = W; … } }); ilk çizim; return s.kabuk.baslat(bas);
   durdur() { if (!s) return; const e = s; s = null; e.kabuk.durdur(); }
   ============================================ */
(function () {
    'use strict';

    function dongu(adimFn, opts) {
        const o = opts || {};
        const azami = o.azami || 100;
        let durum = 'calisiyor';
        let rafId = 0;
        let onceki = null;
        const nedenler = new Set();

        function bildir() { if (typeof o.durumDegisti === 'function') o.durumDegisti(durum); }
        function gizliMi() { return typeof document !== 'undefined' && document.visibilityState === 'hidden'; }

        function kare(t) {
            rafId = 0;
            if (durum !== 'calisiyor') return;
            const dt = onceki == null ? 0 : Math.min(azami, Math.max(0, t - onceki));
            onceki = t;
            try { adimFn(dt, t); } catch (err) {
                console.error('[OnParmakOyunOrtak] adimFn hatası, döngü durduruldu', err);
                durdur();
                return;
            }
            if (durum === 'calisiyor') rafId = requestAnimationFrame(kare);
        }
        function baslat() {
            onceki = null;
            if (!rafId) rafId = requestAnimationFrame(kare);
        }
        function gorunurluk() {
            if (durum === 'durdu') return;
            if (gizliMi()) {
                if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
                durum = 'gizli';
                bildir();
            } else if (durum === 'gizli') {
                durum = 'devam-bekliyor';   // duraklatma nedeni sürse de: önce nedenler kalkar, sonra tuş
                bildir();
            }
        }
        function duraklat(neden) {
            if (durum === 'durdu') return;
            nedenler.add(String(neden));
            if (durum === 'calisiyor') {
                if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
                durum = 'duraklatildi';
                bildir();
            }
        }
        function surdur(neden) {
            if (durum === 'durdu') return;
            nedenler.delete(String(neden));
            if (nedenler.size === 0 && durum === 'duraklatildi') {
                durum = 'calisiyor';
                bildir();
                baslat();
            }
        }
        function durdur() {
            if (durum === 'durdu') return;
            durum = 'durdu';
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
            document.removeEventListener('visibilitychange', gorunurluk);
        }
        function devamTusu() {
            if (durum === 'calisiyor' || durum === 'durdu' || durum === 'duraklatildi') return false;
            if (durum === 'devam-bekliyor' && nedenler.size === 0) {
                durum = 'calisiyor';
                bildir();
                baslat();
            }
            return true;
        }

        document.addEventListener('visibilitychange', gorunurluk);
        if (gizliMi()) {
            durum = 'gizli';
            // dongu() dönmeden bildirim çağıran henüz denetleyiciyi tutmaz → bir mikro görev ertelenir
            Promise.resolve().then(() => { if (durum === 'gizli') bildir(); });
        } else baslat();
        return { durdur, durum: () => durum, devamTusu, duraklat, surdur };
    }

    function uyarlanirHiz({ taban, min, max, artis, azalis, azaltilmisHareket }) {
        let azalt = azaltilmisHareket;
        if (azalt === undefined) {
            azalt = typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        let d = Math.min(max, Math.max(min, azalt ? taban * 0.6 : taban));
        return {
            deger: () => d,
            basari() { d = Math.min(max, d + artis); return d; },
            canKaybi() { d = Math.max(min, d - azalis); return d; },
        };
    }

    function hedefSec(hedefler, harf, kilit) {
        if (kilit && hedefler.indexOf(kilit) !== -1) return kilit;
        let en = null;
        for (const h of hedefler) {
            if ((h.ilerleme || 0) !== 0 || h.kelime.charAt(0) !== harf) continue;
            if (en === null || h.tehlike > en.tehlike) en = h;
        }
        return en;
    }

    function enAcil(hedefler) {
        let en = null;
        for (const h of hedefler) if (en === null || h.tehlike > en.tehlike) en = h;
        return en;
    }

    function beklenenHarf(hedefler, kilit) {
        if (kilit) return [...kilit.kelime][kilit.ilerleme || 0] || null;
        const h = enAcil(hedefler);
        return h ? [...h.kelime][0] || null : null;
    }

    function hedefBildirici(kok, cb) {
        let son;
        return function (ch) {
            const c = ch || null;
            if (c === son) return;
            son = c;
            kok.dataset.hedef = c || '';
            if (typeof cb === 'function') cb(c);
        };
    }

    function rng(tohum) {
        let a = tohum >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ── Sahne yardımcıları ──
    const NS = 'http://www.w3.org/2000/svg';
    function svgEl(tag, attrs, parent) {
        const n = document.createElementNS(NS, tag);
        if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    }
    function htmlEl(tag, cls, text) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    function tepeYolu(rnd, { x0, son, adim, taban, genlik, alt }) {
        let d = 'M' + x0 + ' ' + alt + ' L' + x0 + ' ' + taban;
        let x = x0;
        for (; x <= son; x += adim) {
            const y = taban - genlik * (0.4 + rnd() * 0.6);
            d += ' Q' + (x + adim / 2) + ' ' + y.toFixed(1) + ' ' + (x + adim) + ' ' + taban;
        }
        return d + ' L' + (son + adim) + ' ' + alt + ' Z';
    }

    const KALP = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.7 1.3 5.2 3.1 1.5-1.8 3-3.1 5.2-3.1 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z';
    function canlarHud(n, opts) {
        const o = opts || {};
        const ad = o.ad || 'Can';
        const el = htmlEl('div', 'op-mini__canlar');
        el.setAttribute('role', 'img');
        const ikon = [];
        for (let i = 0; i < n; i++) {
            const c = svgEl('svg', { viewBox: '0 0 24 24', class: 'op-mini__can' + (o.sinif ? ' ' + o.sinif : ''), 'aria-hidden': 'true', focusable: 'false' }, el);
            svgEl('path', { d: o.yol || KALP }, c);
            ikon.push(c);
        }
        function guncelle(can) {
            ikon.forEach((c, i) => c.classList.toggle('is-gitti', i >= can));
            el.setAttribute('aria-label', ad + ': ' + can + ' / ' + n);
        }
        guncelle(n);
        return { el, guncelle };
    }

    function devamKatmani() {
        const el = htmlEl('div', 'op-mini__devam');
        el.setAttribute('role', 'status');
        el.hidden = true;
        el.appendChild(htmlEl('strong', '', 'Oyun durdu'));
        el.appendChild(htmlEl('span', '', 'Devam etmek için bir tuşa bas'));
        return el;
    }

    function oyunKabugu({ kok, svg, H, devam, adim, olcu }) {
        let acik = true;
        const k = { W: 800, dongu: null, ro: null, etkin: () => acik };
        function olcuGuncelle() {
            if (!acik) return;
            const w = kok.clientWidth, h = kok.clientHeight;
            k.W = w > 0 && h > 0 ? Math.max(360, Math.min(1600, Math.round(H * w / h))) : 800;
            svg.setAttribute('viewBox', '0 0 ' + k.W + ' ' + H);
            if (typeof olcu === 'function') olcu(k.W);
        }
        function durumYaz(d) {
            if (!acik) return;
            kok.dataset.durum = d;
            if (devam) devam.hidden = d !== 'devam-bekliyor';
        }
        olcuGuncelle();
        if (typeof ResizeObserver === 'function') { k.ro = new ResizeObserver(olcuGuncelle); k.ro.observe(kok); }
        k.baslat = function (basFn) {
            k.dongu = dongu(adim, { durumDegisti: durumYaz });
            durumYaz(k.dongu.durum());
            return {
                bas: (ch) => { if (acik) basFn(ch); },
                devamTusu: () => (acik && k.dongu ? k.dongu.devamTusu() : false),
                // Caps Lock (modül): açıkken döngü durur; kapanınca hemen sürer (devam tuşu gerekmez)
                duraklat: (ac) => {
                    if (!acik || !k.dongu) return;
                    if (ac) k.dongu.duraklat('caps'); else k.dongu.surdur('caps');
                },
            };
        };
        k.durdur = function () {
            if (!acik) return;
            acik = false;
            if (k.dongu) k.dongu.durdur();
            if (k.ro) k.ro.disconnect();
            if (kok.parentNode) kok.parentNode.removeChild(kok);
        };
        return k;
    }

    window.OnParmakOyunOrtak = { dongu, uyarlanirHiz, hedefSec, enAcil, beklenenHarf, hedefBildirici, rng, svgEl, htmlEl, easeOut, tepeYolu, canlarHud, devamKatmani, oyunKabugu };
})();
