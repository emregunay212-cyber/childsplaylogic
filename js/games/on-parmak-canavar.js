/* ============================================
   On Parmak — mini oyun: Canavar Saldırısı (kelime oyunu) → window.OnParmakOyunlari.canavar
   --------------------------------------------
   Spec §6.2: kelime üstte harf kutularında; sevimli, tüylü canavar sağdan yavaşça yaklaşır. Kelime bitince karakterimiz
   KAR TOPU atar: top yay çizerek uçar, canavar "püf" diye geri seker, güç çubuğu bir dilim azalır. Canavar karaktere
   ulaşırsa bir can gider ve canavar başa çekilir (kelime ve ilerleme korunur). Bitiş: kelimeler biter (= güç çubuğu
   biter, canlı) ya da 3 can biter. Şiddet yok: kar topu, karlı canavar, el sallayarak uzaklaşma.
   TypingClub "Monster Attack" yalnız işleyiş örneğidir; sahne, karakter ve canavar kendi SVG çizimimiz (createElementNS).

   Yazım: metin boşlukla ayrılmış kelimeler; BOŞLUK da yazılır — kelimenin son kutusu Boşluk tuşudur ve kar topunu o
   fırlatır (son kelimede son harf). Böylece beklenen dizi = metnin kendisi (ölçüm, hız ve __opType ile birebir).

   Sözleşme (spec §6.1 + modül başlığı js/games/on-parmak.js; Balon Vadisi ile aynı):
     baslat(alan, { metin, el, tohum }, { tus(dogruMu), bitti({ canliBitti }), hedef?(ch|null) }) → tutamaç
       tutamaç = { bas(ch), devamTusu() → bool, duraklat(acik) }
       - keydown dinleyicisi KURULMAZ; modül her tuşta önce devamTusu(), sonra bas(ch). duraklat(true|false) = Caps Lock
         (açıkken canavar yürümez, can gitmez; kapanınca hemen sürer; dongu duraklat/surdur 'caps').
       - tus(dogruMu) her sayılan basışta tam bir kez, bas() içinde EŞZAMANLI; son doğru basışta bitti() de eşzamanlı.
         Can bitişi döngüden gelir. Güç çubuğu basışta (eşzamanlı) azalır; kar topunun uçuşu ve geri sekme görseldir.
       - hedef(ch): beklenen karakter değişince (başta, doğru basışta; bitişte null).
     durdur(): döngü + ResizeObserver durur, DOM boşalır; tekrar çağrılabilir. Ölçü/döngü/durum/tutamaç/durdur
     OnParmakOyunOrtak.oyunKabugu'nda; kalpler canlarHud, devam katmanı devamKatmani (ortak, kopya yok).
   Belirleyicilik: canavar rengi, ağaçlar, kar taneleri rng(tohum) ile. Zaman yalnız döngünün dt'si (setTimeout yok).
   prefers-reduced-motion: uçuş yayı, ezilme, yürüme salınımı, kar yağışı yok — top canavarda belirip söner, geri sekme
   ve geri çekilme anında; temel hız düşük (uyarlanirHiz).
   ============================================ */
(function () {
    'use strict';

    const O = window.OnParmakOyunOrtak;           // ortak çekirdek + sahne yardımcıları + oyun kabuğu (önce yüklenir)
    const { svgEl, htmlEl, easeOut } = O;
    const H = 320;               // sahne yüksekliği (SVG birimi); genişlik kabın en/boy oranından
    const ZEMIN_Y = 272;         // karların üstü (ayaklar burada)
    const CAN = 3;
    const RENK_SAYISI = 3;
    // Yaklaşma: konum m ∈ [0,1] (1 = başlangıç, sağ kenar; 0 = karaktere değdi). Hız m/sn → sahne genişliğinden bağımsız.
    // Taban 0,05 = yol 20 sn (azaltılmış harekette ×0,6 → 33 sn). Hedef hızda (8 kelime/dk) 6 karakterlik kelime ~9 sn:
    // canavar ~0,45 ilerler, kar topu 0,5 geri iter → hedef hızdaki çocuk can kaybetmeden kazanır; çok yavaşlayan kaybeder.
    const HIZ = { taban: 0.05, min: 0.025, max: 0.09, artis: 0.002, azalis: 0.008 };
    const GERI = 0.5;            // bir kar topunun geri itmesi
    const UCUS_MS = 340;         // kar topu uçuşu: x doğrusal, y yerçekimi yayı (fiziksel)
    const SEK_MS = 420;          // geri sekme (ease-out)
    const CEKIL_MS = 800;        // temastan sonra başa çekilme
    const EZIL_MS = 360;         // vuruşta ezilip toparlanma
    const SAC_MS = 340;          // kar serpintisi
    const ATIS_MS = 220;         // kol savurma
    const YANLIS_MS = 280;       // yanlış kutu işareti
    const SIRT_MS = 260;         // temasta karakterin geri sıçraması

    // Vuruş başına bir kar lekesi (gövdenin önünde; sırası sabit → belirleyici)
    const LEKELER = [[-30, -52], [14, -76], [8, -30], [-34, -78], [24, -54], [-14, -22], [-6, -88], [30, -32]];

    let s = null;   // etkin oyun durumu (tek örnek)

    const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

    // ── Çizim parçaları ──
    // Tüylü gövde: elips çevresinde küçük tümsekler (kapalı yol)
    function tuyYolu(cx, cy, rx, ry, n, derin) {
        let d = '';
        for (let i = 0; i <= n; i++) {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
            if (i === 0) { d = 'M' + x.toFixed(1) + ' ' + y.toFixed(1); continue; }
            const am = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2;
            const qx = cx + Math.cos(am) * (rx + derin), qy = cy + Math.sin(am) * (ry + derin);
            d += ' Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1);
        }
        return d + ' Z';
    }

    // Canavar "Pofuduk": orijin = ayakların ortası (zemin). Sola (karaktere) bakar.
    function canavarCiz(parent, renk) {
        const g = svgEl('g', { class: 'op-canavar__cv op-canavar__cv--' + renk }, parent);
        const govde = svgEl('g', { class: 'op-canavar__cv-govde' }, g);     // ezilme ölçeği bu katmanda (taban orijinli)
        svgEl('ellipse', { class: 'op-canavar__cv-golge', cx: 0, cy: 2, rx: 40, ry: 6 }, govde);
        svgEl('ellipse', { class: 'op-canavar__cv-ayak', cx: -16, cy: -3, rx: 12, ry: 7 }, govde);
        svgEl('ellipse', { class: 'op-canavar__cv-ayak', cx: 18, cy: -3, rx: 12, ry: 7 }, govde);
        svgEl('path', { class: 'op-canavar__cv-boynuz', d: 'M-26 -78 q-10 -18 -2 -26 q4 12 14 18 Z' }, govde);
        svgEl('path', { class: 'op-canavar__cv-boynuz', d: 'M22 -80 q8 -18 0 -26 q-6 12 -14 18 Z' }, govde);
        svgEl('path', { class: 'op-canavar__cv-tuy', d: tuyYolu(0, -46, 44, 40, 18, 5) }, govde);
        svgEl('ellipse', { class: 'op-canavar__cv-karin', cx: -4, cy: -32, rx: 25, ry: 21 }, govde);
        svgEl('path', { class: 'op-canavar__cv-kol', d: 'M-40 -40 q-14 4 -12 16' }, govde);
        svgEl('path', { class: 'op-canavar__cv-kol', d: 'M40 -40 q12 6 8 18' }, govde);
        const goz = svgEl('g', { class: 'op-canavar__cv-gozler' }, govde);
        for (const x of [-17, 9]) {
            svgEl('circle', { class: 'op-canavar__cv-goz', cx: x, cy: -58, r: 11 }, goz);
            svgEl('circle', { class: 'op-canavar__cv-bebek', cx: x - 3.5, cy: -56.5, r: 5 }, goz);
            svgEl('circle', { class: 'op-canavar__cv-isik', cx: x - 5.5, cy: -59, r: 1.8 }, goz);
        }
        // Vurulunca gözler sıkıca kapanır (> <) — acı değil, "üşüdüm" ifadesi
        const kapali = svgEl('g', { class: 'op-canavar__cv-kapali' }, govde);
        svgEl('path', { d: 'M-25 -63 l8 5 l-8 5' }, kapali);
        svgEl('path', { d: 'M17 -63 l-8 5 l8 5' }, kapali);
        svgEl('circle', { class: 'op-canavar__cv-yanak', cx: -27, cy: -43, r: 4.5 }, govde);
        svgEl('circle', { class: 'op-canavar__cv-yanak', cx: 19, cy: -43, r: 4.5 }, govde);
        svgEl('path', { class: 'op-canavar__cv-agiz', d: 'M-16 -41 q10 10 20 0' }, govde);
        svgEl('path', { class: 'op-canavar__cv-dis', d: 'M-9 -38.6 l2.6 4.6 l2.6 -4 Z' }, govde);
        // Üstüne yapışan kar (her vuruşta bir leke daha; kazanınca kar tutmuş canavar)
        const kar = svgEl('g', { class: 'op-canavar__cv-kar' }, govde);
        return { g, govde, kar };
    }

    // Karakter "Pıt" (kış hâli: bere + atkı): orijin = ayakların ortası. Sağa (canavara) bakar.
    function karakterCiz(parent) {
        const g = svgEl('g', { class: 'op-canavar__pit' }, parent);
        const ic = svgEl('g', {}, g);
        svgEl('ellipse', { class: 'op-canavar__cv-golge', cx: 0, cy: 2, rx: 24, ry: 4.5 }, ic);
        svgEl('ellipse', { class: 'op-canavar__pit-ayak', cx: -8, cy: -3, rx: 8, ry: 4.5 }, ic);
        svgEl('ellipse', { class: 'op-canavar__pit-ayak', cx: 9, cy: -3, rx: 8, ry: 4.5 }, ic);
        svgEl('circle', { class: 'op-canavar__pit-govde', cx: 0, cy: -27, r: 23 }, ic);
        svgEl('ellipse', { class: 'op-canavar__pit-karin', cx: 2, cy: -19, rx: 13, ry: 10 }, ic);
        svgEl('path', { class: 'op-canavar__pit-atki', d: 'M-18 -38 q18 9 36 0 l0 7 q-18 9 -36 0 Z' }, ic);
        svgEl('path', { class: 'op-canavar__pit-atki', d: 'M-12 -33 l-5 14 l7 1 l3 -13 Z' }, ic);
        svgEl('path', { class: 'op-canavar__pit-bere', d: 'M-21 -46 q0 -24 21 -24 q21 0 21 24 Z' }, ic);
        svgEl('rect', { class: 'op-canavar__pit-bere-kenar', x: -23, y: -50, width: 46, height: 8, rx: 4 }, ic);
        svgEl('circle', { class: 'op-canavar__pit-ponpon', cx: 0, cy: -72, r: 6 }, ic);
        svgEl('circle', { class: 'op-canavar__pit-goz', cx: 1, cy: -38 + 1, r: 2.8 }, ic);
        svgEl('circle', { class: 'op-canavar__pit-goz', cx: 12, cy: -38 + 1, r: 2.8 }, ic);
        svgEl('circle', { class: 'op-canavar__pit-yanak', cx: -4, cy: -31, r: 2.8 }, ic);
        svgEl('circle', { class: 'op-canavar__pit-yanak', cx: 17, cy: -31, r: 2.8 }, ic);
        svgEl('path', { class: 'op-canavar__pit-agiz', d: 'M3 -32 q4 4 8 0' }, ic);
        svgEl('path', { class: 'op-canavar__pit-kol', d: 'M-18 -22 q-8 6 -6 14' }, ic);
        // Atış kolu: omuzdan döner; elde (kelime bitmek üzereyken) kar topu belirir
        const kol = svgEl('g', { class: 'op-canavar__pit-atis', transform: 'translate(16 -24)' }, ic);
        const kolIc = svgEl('g', {}, kol);
        svgEl('path', { class: 'op-canavar__pit-kol', d: 'M0 0 q10 2 14 -10' }, kolIc);
        const top = svgEl('circle', { class: 'op-canavar__top op-canavar__eldeki', cx: 15, cy: -15, r: 7 }, kolIc);
        return { g, ic, kolIc, top };
    }

    const tepeYolu = (uzunluk, rnd, taban, genlik) => O.tepeYolu(rnd, { x0: -40, son: uzunluk, adim: 160, taban, genlik, alt: H });

    function agacCiz(parent, x, k) {
        const g = svgEl('g', { class: 'op-canavar__agac', transform: 'translate(' + x.toFixed(1) + ' ' + (ZEMIN_Y - 26) + ') scale(' + k.toFixed(2) + ')' }, parent);
        g.dataset.x = String(Math.round(x));
        svgEl('rect', { class: 'op-canavar__agac-govde', x: -4, y: -8, width: 8, height: 12, rx: 2 }, g);
        svgEl('path', { class: 'op-canavar__agac-yaprak', d: 'M0 -70 L22 -30 L-22 -30 Z M0 -50 L28 -6 L-28 -6 Z' }, g);
        svgEl('path', { class: 'op-canavar__agac-kar', d: 'M0 -70 L9 -54 q-4 4 -9 0 q-5 4 -9 0 Z M0 -50 L11 -33 q-5 5 -11 0 q-6 5 -11 0 Z' }, g);
    }

    function baslat(alan, ayar, cbs) {
        durdur();
        const metin = String(ayar.metin || '');
        const kelimeler = metin.split(' ').filter(Boolean);
        const rnd = O.rng((ayar.tohum >>> 0) || 1);
        const azalt = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const renk = Math.floor(rnd() * RENK_SAYISI);

        const kok = htmlEl('div', 'op-canavar');
        kok.dataset.tohum = String(ayar.tohum);
        kok.dataset.renk = String(renk);
        const svg = svgEl('svg', { class: 'op-canavar__svg', viewBox: '0 0 800 ' + H, role: 'img', focusable: 'false',
            'aria-label': 'Canavar Saldırısı: kelimeyi yaz, kar topuyla canavarı geri püskürt' });
        svg.setAttribute('preserveAspectRatio', 'xMinYMax meet');
        kok.appendChild(svg);

        // Arka plan: uzak karlı tepeler, çam ağaçları, yakın kar zemini
        svgEl('path', { class: 'op-canavar__tepe op-canavar__tepe--uzak', d: tepeYolu(1700, rnd, 236, 64) }, svg);
        const agaclar = svgEl('g', { class: 'op-canavar__agaclar' }, svg);
        for (let x = 30 + rnd() * 60; x < 1700; x += 120 + rnd() * 170) agacCiz(agaclar, x, 0.7 + rnd() * 0.5);
        svgEl('path', { class: 'op-canavar__tepe op-canavar__tepe--yakin', d: tepeYolu(1700, rnd, ZEMIN_Y + 4, 14) }, svg);
        const taneler = [];
        const taneKat = svgEl('g', { class: 'op-canavar__taneler' }, svg);
        for (let i = 0; i < 16; i++) {
            const t = { x: rnd() * 1600, y: rnd() * ZEMIN_Y, r: 1.6 + rnd() * 2.2, v: 10 + rnd() * 14, faz: rnd() * 6.3 };
            t.el = svgEl('circle', { class: 'op-canavar__tane', r: t.r.toFixed(1), cx: t.x.toFixed(1), cy: t.y.toFixed(1) }, taneKat);
            taneler.push(t);
        }

        const pit = karakterCiz(svg);
        const cv = canavarCiz(svg, renk);
        const atisKat = svgEl('g', { class: 'op-canavar__atislar' }, svg);

        // HUD (HTML): canlar solda, canavarın gücü sağda; kelime kutuları altında ortada
        const hud = htmlEl('div', 'op-canavar__hud');
        const canlar = O.canlarHud(CAN);
        const guc = htmlEl('div', 'op-canavar__guc op-canavar__cv--' + renk);
        guc.setAttribute('role', 'img');
        const yuz = svgEl('svg', { viewBox: '0 0 24 24', class: 'op-canavar__guc-yuz', 'aria-hidden': 'true', focusable: 'false' }, guc);
        svgEl('path', { class: 'op-canavar__cv-tuy', d: tuyYolu(12, 13, 9.5, 9, 10, 1.6) }, yuz);
        svgEl('circle', { class: 'op-canavar__cv-goz', cx: 8.5, cy: 11, r: 3 }, yuz);
        svgEl('circle', { class: 'op-canavar__cv-goz', cx: 15.5, cy: 11, r: 3 }, yuz);
        svgEl('circle', { class: 'op-canavar__cv-bebek', cx: 7.8, cy: 11.4, r: 1.5 }, yuz);
        svgEl('circle', { class: 'op-canavar__cv-bebek', cx: 14.8, cy: 11.4, r: 1.5 }, yuz);
        const cubuk = htmlEl('div', 'op-canavar__cubuk');
        cubuk.setAttribute('aria-hidden', 'true');
        const dilimler = kelimeler.map(() => cubuk.appendChild(htmlEl('span', 'op-canavar__dilim is-dolu')));
        const gucSayi = htmlEl('span', 'op-canavar__guc-sayi');
        gucSayi.setAttribute('aria-hidden', 'true');
        guc.append(yuz, cubuk, gucSayi);
        hud.append(canlar.el, guc);
        const kelimeKap = htmlEl('div', 'op-canavar__kelime');
        kelimeKap.setAttribute('role', 'img');
        kok.append(hud, kelimeKap);

        const devam = O.devamKatmani();
        kok.appendChild(devam);
        alan.appendChild(kok);

        s = { alan, kok, svg, cbs, azalt, kelimeler, ki: 0, hi: 0, kutular: [], kelimeKap, pit, cv, atisKat, agaclar, taneler,
            canlar, guc, dilimler, gucSayi, can: CAN, saglik: kelimeler.length, bitti: false, kazandi: false,
            zaman: 0, W: 800, m: 1, anim: null, toplar: [], sacilar: [], ezil: 0, atis: 0, yanlis: 0, sirt: 0, kar: 0,
            hiz: O.uyarlanirHiz(HIZ), kabuk: null };
        const benim = s;
        // Kabuk: ölçü (viewBox), ResizeObserver, döngü, durum/devam katmanı, tutamaç, durdur
        s.kabuk = O.oyunKabugu({ kok, svg, H, devam, adim, olcu: (W) => { benim.W = W; } });
        kelimeCiz();
        hudYaz();
        hedefYaz();
        ciz();
        return s.kabuk.baslat(bas);
    }

    // ── Geometri ──
    function pitX() { return Math.max(56, Math.round(s.W * 0.13)); }
    function temasX() { return pitX() + 74; }                 // canavar ayağının karaktere değdiği yer
    function basX() { return s.W - 62; }
    function canavarX(m) { return temasX() + m * (basX() - temasX()); }
    function gorunenM() {
        const a = s.anim;
        if (!a) return s.m;
        return a.m0 + (a.m1 - a.m0) * (a.tur === 'cekil' ? easeOut(a.t / a.sure) : easeOutQuint(a.t / a.sure));
    }

    // ── Kelime kutuları (HTML; tek kelime görünür) ──
    function sonKelimeMi() { return s.ki >= s.kelimeler.length - 1; }
    function kelimeCiz() {
        const kap = s.kelimeKap;
        kap.innerHTML = '';
        s.kutular = [];
        const k = s.kelimeler[s.ki];
        if (!k) { kap.removeAttribute('aria-label'); return; }
        const harfler = [...k];
        const n = harfler.length + (sonKelimeMi() ? 0 : 1.4);       // Boşluk kutusu 1,4 kutu genişliğinde
        kap.style.setProperty('--n', String(n));
        kap.setAttribute('aria-label', 'Yazılacak kelime: ' + k + (sonKelimeMi() ? '' : ', sonra Boşluk'));
        for (const ch of harfler) {
            const b = htmlEl('span', 'op-canavar__kutu', ch);
            kap.appendChild(b);
            s.kutular.push(b);
        }
        if (!sonKelimeMi()) {
            // Boşluk kutusu: kar topunu fırlatır. Çizili boşluk çubuğu simgesi (glif değil)
            const b = htmlEl('span', 'op-canavar__kutu op-canavar__kutu--bosluk');
            const ik = svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, b);
            svgEl('path', { d: 'M4 9v6h16V9' }, ik);
            kap.appendChild(b);
            s.kutular.push(b);
        }
        kutuDurum();
    }
    function kutuDurum() {
        s.kutular.forEach((b, i) => {
            b.classList.toggle('is-yazildi', i < s.hi);
            b.classList.toggle('is-sira', i === s.hi && !s.bitti);
            if (i !== s.hi) { b.classList.remove('is-yanlis'); b.style.transform = ''; }
        });
        s.kok.dataset.kelime = String(s.ki);
    }

    function hudYaz() {
        s.kok.dataset.can = String(s.can);
        s.kok.dataset.saglik = String(s.saglik);
        s.canlar.guncelle(s.can);
        s.dilimler.forEach((d, i) => d.classList.toggle('is-dolu', i < s.saglik));
        s.gucSayi.textContent = s.saglik + '/' + s.kelimeler.length;
        s.guc.setAttribute('aria-label', 'Canavarın gücü: ' + s.saglik + ' / ' + s.kelimeler.length);
    }

    function beklenen() {
        if (s.bitti) return null;
        const k = s.kelimeler[s.ki];
        if (!k) return null;
        if (s.hi < k.length) return k[s.hi];
        return sonKelimeMi() ? null : ' ';
    }

    function hedefYaz() {
        const ch = beklenen();
        s.kok.dataset.hedef = ch || '';
        if (typeof s.cbs.hedef === 'function') s.cbs.hedef(ch);
    }

    // ── Girdi ──
    function bas(ch) {
        if (s.bitti) return;
        const exp = beklenen();
        if (exp == null) return;
        if (ch !== exp) {
            s.cbs.tus(false);
            s.yanlis = YANLIS_MS;
            const b = s.kutular[s.hi];
            if (b) b.classList.add('is-yanlis');
            return;
        }
        s.cbs.tus(true);
        if (!s) return;              // modül çağrı içinde durdurduysa
        if (s.yanlis > 0) {          // bekleyen yanlış işareti bu kutuda söner, sıradaki kutuya geçmez
            s.yanlis = 0;
            const eski = s.kutular[s.hi];
            if (eski) { eski.classList.remove('is-yanlis'); eski.style.transform = ''; }
        }
        s.hi += 1;
        const k = s.kelimeler[s.ki];
        const atis = exp === ' ' || (s.hi >= k.length && sonKelimeMi());
        if (!atis) {
            kutuDurum();
            if (s.hi >= k.length) s.pit.g.classList.add('is-hazir');   // harfler tamam: elde kar topu, Boşluk atar
            hedefYaz();
            return;
        }
        // Kar topu: güç çubuğu hemen azalır (eşzamanlı), uçuş + geri sekme döngüde
        s.saglik -= 1;
        s.hiz.basari();
        topAt(s.saglik === 0);
        s.ki += 1;
        s.hi = 0;
        hudYaz();
        if (s.ki >= s.kelimeler.length) { bitir(true); return; }
        kelimeCiz();
        hedefYaz();
    }

    // son = son kar topu (güç bitti): vurulur ama geri itilmez, canavar karlar içinde yerinde kalır
    function topAt(son) {
        s.pit.g.classList.remove('is-hazir');
        s.atis = ATIS_MS;
        const x0 = pitX() + 30, y0 = ZEMIN_Y - 42;
        if (s.azalt) { vurus(son); return; }         // azaltılmış hareket: uçuş yok, top canavarda belirip söner
        const el = svgEl('circle', { class: 'op-canavar__top', r: 9, cx: x0, cy: y0 }, s.atisKat);
        s.toplar.push({ el, t: 0, x0, y0, son });
    }

    // Top canavara değdi: ezilme, kapalı gözler, kar lekesi, serpinti, geri sekme (son topta yok)
    function vurus(son) {
        const mx = canavarX(gorunenM());
        const sx = mx - 22, sy = ZEMIN_Y - 54;
        const g = svgEl('g', { class: 'op-canavar__sac', transform: 'translate(' + sx.toFixed(1) + ' ' + sy + ')' }, s.atisKat);
        const parca = [];
        for (let i = 0; i < 7; i++) {
            const a = -Math.PI / 2 + (i - 3) * 0.42 + Math.PI * (i % 2 ? 0.08 : -0.08);
            const c = svgEl('circle', { class: 'op-canavar__top', r: i === 3 ? 8 : 4.5 }, g);
            parca.push({ c, dx: -Math.cos(a) * (i === 3 ? 8 : 36), dy: Math.sin(a) * 30 });
        }
        s.sacilar.push({ g, t: 0, parca });
        if (s.kar < LEKELER.length) {
            const [ux, uy] = LEKELER[s.kar];
            svgEl('path', { class: 'op-canavar__kar-leke', d: 'M' + ux + ' ' + uy + ' q7 -10 15 -2 q9 -3 9 7 q-3 9 -13 7 q-11 4 -11 -12 Z' }, s.cv.kar);
            s.kar += 1;
        }
        s.ezil = EZIL_MS;
        s.cv.g.classList.add('is-vuruldu');
        if (window.AudioManager) window.AudioManager.play('pop');
        if (son) return;                             // son top: canavar yerinde kalır, karlar içinde zıplar
        const m0 = gorunenM();
        s.m = Math.min(1, m0 + GERI);
        s.anim = s.azalt ? null : { tur: 'sek', m0, m1: s.m, t: 0, sure: SEK_MS };
    }

    function bitir(canli) {
        s.bitti = true;
        s.kazandi = canli;
        s.kok.dataset.bitti = canli ? 'canli' : 'canlar';
        kutuDurum();
        hedefYaz();
        s.cbs.bitti({ canliBitti: canli });
    }

    // ── Döngü ──
    function adim(dt) {
        s.zaman += dt;
        // Uçan toplar (konumdan bağımsız: değince vuruş)
        s.toplar = s.toplar.filter((t) => {
            t.t += dt;
            if (t.t >= UCUS_MS) { t.el.remove(); vurus(t.son); return false; }
            return true;
        });
        if (s.anim) {
            s.anim.t += dt;
            if (s.anim.t >= s.anim.sure) s.anim = null;
        }
        // Yürüyüş: top havadayken ya da geri sekerken/çekilirken durur (oyun adil: vuruş anı yakalanır)
        if (!s.bitti && !s.anim && s.toplar.length === 0) {
            s.m -= s.hiz.deger() * dt / 1000;
            if (s.m <= 0) {
                temas();
                if (!s) return;          // modül bitti() içinde durdurduysa
            }
        }
        if (s.ezil > 0) { s.ezil = Math.max(0, s.ezil - dt); if (s.ezil === 0) s.cv.g.classList.remove('is-vuruldu'); }
        if (s.atis > 0) s.atis = Math.max(0, s.atis - dt);
        if (s.sirt > 0) s.sirt = Math.max(0, s.sirt - dt);
        if (s.yanlis > 0) {
            s.yanlis = Math.max(0, s.yanlis - dt);
            const b = s.kutular[s.hi];
            if (b) {
                if (s.yanlis === 0) { b.classList.remove('is-yanlis'); b.style.transform = ''; }
                else if (!s.azalt) {
                    const k = s.yanlis / YANLIS_MS;
                    b.style.transform = 'translateX(' + (Math.sin((1 - k) * Math.PI * 4) * 5 * k).toFixed(2) + 'px)';
                }
            }
        }
        s.sacilar = s.sacilar.filter((x) => { x.t += dt; if (x.t >= SAC_MS) { x.g.remove(); return false; } return true; });
        if (!s.azalt) {
            for (const t of s.taneler) {
                t.y += t.v * dt / 1000;
                if (t.y > ZEMIN_Y) t.y -= ZEMIN_Y + 10;
            }
        }
        ciz();
    }

    function temas() {
        s.m = 0;
        s.can -= 1;
        s.hiz.canKaybi();
        s.sirt = SIRT_MS;
        if (window.AudioManager) window.AudioManager.play('whoosh');
        hudYaz();
        if (s.can <= 0) { bitir(false); return; }
        s.m = 1;
        s.anim = s.azalt ? null : { tur: 'cekil', m0: 0, m1: 1, t: 0, sure: CEKIL_MS };
    }

    function ciz() {
        const m = gorunenM();
        let cx = canavarX(m);
        let cy = ZEMIN_Y;
        let don = 0, sx = 1, sy = 1;
        const yuruyor = !s.bitti && !s.anim && s.toplar.length === 0;
        if (!s.azalt) {
            if (yuruyor) {
                // Paytak yürüyüş: küçük sekme + yalpalama
                cy -= Math.abs(Math.sin(s.zaman / 190)) * 4;
                don = Math.sin(s.zaman / 190) * 3;
            } else if (s.bitti && s.kazandi) {
                cy -= Math.abs(Math.sin(s.zaman / 260)) * 3;     // karlar içinde neşeyle zıplar
            } else if (s.bitti) {
                don = Math.sin(s.zaman / 300) * 4;               // canavar kazandı: yerinde dans
            }
            if (s.ezil > 0) {
                const k = s.ezil / EZIL_MS;                       // 1 → 0: ezil, toparlan (hafif yaylanma)
                const e = Math.sin(k * Math.PI) * 0.16 * k + Math.sin(k * Math.PI * 2) * 0.03;
                sx = 1 + e; sy = 1 - e;
            }
        }
        s.cv.g.setAttribute('transform', 'translate(' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ') rotate(' + don.toFixed(2) + ')');
        s.cv.govde.setAttribute('transform', sx === 1 ? '' : 'scale(' + sx.toFixed(3) + ' ' + sy.toFixed(3) + ')');

        // Karakter: temasta geri sıçrar; kazanınca sevinçle zıplar
        let px = pitX(), py = ZEMIN_Y;
        if (!s.azalt) {
            if (s.sirt > 0) { const k = s.sirt / SIRT_MS; px -= Math.sin(k * Math.PI) * 10; py -= Math.sin(k * Math.PI) * 8; }
            else if (s.bitti && s.kazandi) py -= Math.abs(Math.sin(s.zaman / 220)) * 6;
        }
        s.pit.g.setAttribute('transform', 'translate(' + px.toFixed(2) + ' ' + py.toFixed(2) + ')');
        const kol = s.atis > 0 && !s.azalt ? -70 * Math.sin((1 - s.atis / ATIS_MS) * Math.PI) : 0;
        s.pit.kolIc.setAttribute('transform', 'rotate(' + kol.toFixed(1) + ')');

        for (const t of s.toplar) {
            const k = t.t / UCUS_MS;
            const x1 = cx - 24, y1 = ZEMIN_Y - 54;
            const x = t.x0 + (x1 - t.x0) * k;
            const y = t.y0 + (y1 - t.y0) * k - 4 * 56 * k * (1 - k);     // yerçekimi yayı, tepe 56 birim
            t.el.setAttribute('cx', x.toFixed(1));
            t.el.setAttribute('cy', y.toFixed(1));
        }
        for (const x of s.sacilar) {
            const k = x.t / SAC_MS, e = easeOut(k);
            x.g.style.opacity = String(Math.max(0, 1 - k * k));
            if (s.azalt) continue;
            for (const p of x.parca) {
                p.c.setAttribute('cx', (p.dx * e).toFixed(1));
                p.c.setAttribute('cy', (p.dy * e + 18 * k * k).toFixed(1));
            }
        }
        if (!s.azalt) {
            for (const t of s.taneler) {
                t.el.setAttribute('cx', (t.x + Math.sin(s.zaman / 900 + t.faz) * 8).toFixed(1));
                t.el.setAttribute('cy', t.y.toFixed(1));
            }
        }
        s.kok.dataset.m = m.toFixed(3);
    }

    function durdur() {
        if (!s) return;
        const eski = s;
        s = null;
        eski.kabuk.durdur();
    }

    window.OnParmakOyunlari = window.OnParmakOyunlari || {};
    window.OnParmakOyunlari.canavar = { baslat, durdur };
})();
