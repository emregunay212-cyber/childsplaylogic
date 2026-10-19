/* ============================================
   On Parmak — mini oyun: Elma Bekçisi (kelime oyunu, çok hedef) → window.OnParmakOyunlari.elma
   --------------------------------------------
   Spec §6.2: ortada bir elma ağacı ve 5 elma; iki yandan, üzerinde kelime etiketi taşıyan sincaplar ağaca doğru
   sekerek gelir. İLK HARF sincabı seçer (OnParmakOyunOrtak.hedefSec, tehlike = ağaca yakınlık m): o harfle başlayan,
   ağaca en yakın sincap kilitlenir; kilit kelime bitene dek sürer, kelime bitince sincap geri döner ve kaçar. Ağaca
   varan sincap bir elma alıp kaçar. Bitiş: kelimeler biter (canlı) ya da 5 elma biter. Şiddet yok: sincap kaçar.
   TypingClub "Apple Thieves" yalnız işleyiş örneğidir; sahne, ağaç ve sincaplar kendi SVG çizimimiz (createElementNS).

   Yazım (denetçi kararı, çok hedefli oyun): BOŞLUK YAZILMAZ — her kelime kendi sincabında; metin boşlukla ayrılmış
   kelime listesidir, sincaplar metin sırasıyla doğar. Kilitliyken yanlış harf = hata (kilit sürer; başka sincabın ilk
   harfi de yanlıştır). Kilitsizken hiçbir GÖRÜNÜR sincabın ilk harfine uymayan harf = hata.
   Yalnız sahnede GÖRÜNEN sincap seçilebilir: doğan sincap kenardan sahneye girer (GIRIS_MS, data-gorunur="0"), girişi
   bitmeden kilitlenmez ve klavye vurgusu onu göstermez.

   Sözleşme (spec §6.1 + modül başlığı js/games/on-parmak.js; Balon/Canavar/Baloncuk ile aynı):
     baslat(alan, { metin, el, tohum }, { tus(dogruMu), bitti({ canliBitti }), hedef?(ch|null) }) → tutamaç
       tutamaç = { bas(ch), devamTusu() → bool, duraklat(acik) } (OnParmakOyunOrtak.oyunKabugu verir).
       - keydown dinleyicisi KURULMAZ. tus() her sayılan basışta tam bir kez, bas() içinde EŞZAMANLI; son kelimenin
         bittiği basışta bitti() de eşzamanlı. Elmalar bitince bitiş döngüden gelir.
       - hedef(ch): OnParmakOyunOrtak.beklenenHarf(secilebilir(sincaplar), kilit) — kilit varsa sıradaki harf, yoksa ağaca
         en yakın görünen sincabın ilk harfi; bitişte null. Değişince bildirilir (basışta ve döngüde).
       - duyuru?(metin): elma kaybı (oyun sürüyorsa) ve "Oyun durdu" — modülün kalıcı aria-live bölgesine.
     durdur(): kabuk durdurur (döngü + ResizeObserver, DOM boşalır); tekrar çağrılabilir.
   Doğuş planı baslat'ta BİR KEZ ve kare zamanlamasından bağımsız kurulur (rng(tohum)): kelimeler ikişerli öbeklenir,
   öbekte biri solda biri sağda (sırası çift başına tam bir rnd()), her kelimeye tam bir rnd() (tüy rengi); her yanda
   şerit (uzak/yakın) sırayla değişir. Aynı tohum = gerçek oturumda da aynı taraf/şerit/renk dizisi (data-taraf,
   data-serit). Zamanlama: başta iki sincap (biri yolun %20'sinde, öbürü girişte); sonra her DOGUS_M yolda bir (en çok 4
   eşzamanlı); 2'nin altına düşünce sıradaki hemen doğar. Sıradakinin şeridinde kenara yakın (m < SERIT_BOS) sincap
   varsa doğuş bekler (etiketler üst üste binmesin) — konum yine plandan.
   Zaman yalnız döngünün dt'si (setTimeout yok). prefers-reduced-motion: sekme, kaçışta zıplama/koşu, elma uçuşu ve
   kazanma zıplaması yok — kaçan sincap yerinde solar, elma doğrudan sincabın elinde belirir; temel hız düşük (× 0,6).
   Etiketler sincapların ÜSTÜNDE ayrı bir bantta: yakın şeridin etiketi uzak şeridin sincap başlarının üstünde, uzak
   şeridin etiketi onun da üstünde; etiket sincaba ince bir sapla bağlanır → etiket sincaba ya da öbür şeridin etiketine
   binmez. Giriş sırasında etiket saydamlığı döngüden (CSS geçişi kapalı: is-giris).
   Sayaç (sağ üst): ele alınan kelime = biten + elma alan / toplam — bitişte hep toplam/toplam.
   Ölçü değişince (ResizeObserver) ağaç ve yuvalar yeniden kurulur; kutlama efekti yuvaları sıra numarasıyla izler
   (yeniden kurulan elmalarla sürer).
   ============================================ */
(function () {
    'use strict';

    const O = window.OnParmakOyunOrtak;           // ortak çekirdek + sahne yardımcıları + oyun kabuğu (önce yüklenir)
    const { svgEl, htmlEl, easeOut } = O;
    const H = 360;                  // sahne yüksekliği (SVG birimi); genişlik kabın en/boy oranından
    const YER_Y = 262;              // çimenin üst kenarı
    const AGAC_TABAN = 304;         // gövdenin çimene oturduğu yer (iki şeridin arası)
    const TAC_Y = 122;              // ağaç tacının merkezi
    // 0 = uzak (küçük), 1 = yakın; et = etiket merkezi (yakın etiketin altı uzak sincabın başının üstünde, uzak etiket onun üstünde)
    // (etiket yüksekliği 36: yakın 198–234 < uzak sincabın başı 245; uzak 158–194 < yakın etiketin üstü)
    const SERITLER = [{ y: 292, k: 0.84, et: 176 }, { y: 338, k: 1, et: 216 }];
    const ELMA_SAYI = 5;
    const ESZ_MIN = 2, ESZ_MAX = 4;
    const GOVDE_YARI = 30;          // sincap gövdesinin yarı genişliği (kuyruk ucu–burun), ölçek 1
    const AGAC_ARA = 58;            // varışta sincap merkezi ile ağaç ekseni arası
    const ETIKET_BOY = 22;          // etiket yazı boyu (SVG birimi; 375 px telefonda ≈ 21 px)
    // Hız: m/sn (m = 0 sahne kenarında tam görünür, 1 = ağaca vardı). Taban 0,05 → yürüyüş ~20 sn
    // (azaltılmış harekette × 0,6 → ~33 sn). Hedef hızda (8 kelime/dk ≈ 6–7 sn/kelime) iki sincap rahat yetişir.
    const HIZ = { taban: 0.05, min: 0.03, max: 0.085, artis: 0.0015, azalis: 0.006 };
    const DOGUS_M = 0.3;            // zamanlı doğuş aralığı = 0,3 m yol (taban hızda ~6 sn)
    const SERIT_BOS = 0.3;          // şeritteki son sincap bu kadar ilerlemeden aynı şeride yenisi doğmaz
    const BASLANGIC = [0.2, 0];     // ilk iki sincabın yolu (ilki görünür başlar, ikincisi kenardan girer)
    const GIRIS_MS = 900;           // kenardan sahneye giriş (bu sürede seçilemez)
    const KACIS_HIZ = 520;          // kaçış koşusu, birim/sn
    const ZIPLA_MS = 220;           // kaçışın başındaki dönüş zıplaması
    const SOL_MS = 420;             // azaltılmış harekette kaçan sincabın solması
    const ELMA_UC_MS = 420;         // elmanın daldan sincabın eline uçuşu
    const YANLIS_MS = 260;
    const POP_MS = 320;             // kelime bitince etiketin "tamam" sönüşü (onay işaretiyle)
    const KUTLA_MS = 360, KUTLA_ARA = 80;   // kazanınca kalan elmaların sırayla zıplaması

    // Taçtaki elma yuvaları (taç merkezine göre); soldaki sincap en soldakini alır, sağdaki en sağdakini
    const YUVALAR = [[-62, -10], [-30, -50], [12, -58], [56, -26], [-6, 8]];
    const ELMA_YOL = 'M12 7.4c-1.3-1-2.7-1.5-4.2-1.2C4.4 6.8 2.8 9.9 3.5 13.4c.7 3.6 3.2 7 5.8 7.3 1 .1 1.7-.4 2.7-.4s1.7.5 2.7.4'
        + 'c2.6-.3 5.1-3.7 5.8-7.3.7-3.5-.9-6.6-4.3-7.2-1.5-.3-2.9.2-4.2 1.2zM12.6 6.2c.3-2.2 1.9-3.6 4.3-3.7-.1 2.3-1.8 3.8-4.3 3.7z';

    let s = null;   // etkin oyun durumu (tek örnek)

    // ── Plan: taraf + şerit + renk, kelime başına sabit sayıda rnd() ──
    function planKur(kelimeler, rnd) {
        const plan = [];
        const seritSayac = { '-1': 0, 1: 0 };
        for (let i = 0; i < kelimeler.length; i += 2) {
            const once = rnd() < 0.5 ? -1 : 1;              // çiftin ilki hangi yandan
            for (let j = 0; j < 2 && i + j < kelimeler.length; j++) {
                const taraf = j === 0 ? once : -once;
                const serit = 1 - (seritSayac[taraf]++ % 2);   // her yanda yakın, uzak, yakın …
                plan.push({ kelime: kelimeler[i + j], sira: i + j, taraf, serit, renk: 0 });
            }
        }
        for (const p of plan) p.renk = rnd() < 0.5 ? 0 : 1;
        return plan;
    }

    // ── Geometri ──
    const olcek = (b) => SERITLER[b.serit].k;
    function xKenar(b) { const d = GOVDE_YARI * olcek(b) + 6; return b.taraf < 0 ? d : s.W - d; }
    function xAgac(b) { return s.W / 2 + b.taraf * AGAC_ARA; }
    function xDis(b) { const d = GOVDE_YARI * olcek(b) + 12; return b.taraf < 0 ? -d : s.W + d; }
    function sincapX(b) {
        if (b.giris < 1) return xDis(b) + (xKenar(b) - xDis(b)) * easeOut(b.giris);
        return xKenar(b) + (xAgac(b) - xKenar(b)) * Math.min(1, b.m);
    }
    const gorunur = (b) => b.giris >= 1;
    function etiketGenislik(kelime) { return [...kelime].length * ETIKET_BOY * 0.6 + 26; }
    function etiketY(b) { return SERITLER[b.serit].et; }
    // Sap: etiketin alt kenarından sincabın başının hemen üstüne (sekme payı 6)
    function sapBoy(b) { return SERITLER[b.serit].y - 58 * olcek(b) - 6 - etiketY(b); }
    function etiketX(b, x) {
        const y = b.etiketYari + 6;
        return Math.max(y, Math.min(s.W - y, x));
    }
    function yuvaXY(i) { return [s.W / 2 + YUVALAR[i][0], TAC_Y + YUVALAR[i][1]]; }
    function elX(b, x, yon) { return x + yon * 20 * olcek(b); }               // elmayı tutan pati
    function elY(b) { return SERITLER[b.serit].y - 26 * olcek(b); }

    // ── Çizim ──
    function agacCiz(svg, W) {
        const g = svgEl('g', { class: 'op-elma__agac' }, svg);
        const cx = W / 2;
        // Gövde: kökte genişleyen yamuk + iki kısa dal
        svgEl('path', { class: 'op-elma__govde', d: 'M' + (cx - 26) + ' ' + AGAC_TABAN + ' q12 -8 12 -30 l2 -110 l24 0 l2 110 q0 22 12 30 Z' }, g);
        svgEl('path', { class: 'op-elma__dal', d: 'M' + (cx - 4) + ' ' + (TAC_Y + 64) + ' q-20 -16 -40 -18 M' + (cx + 6) + ' ' + (TAC_Y + 50) + ' q18 -14 36 -14' }, g);
        // Taç: önce mürekkep anahat (yarıçap +3), sonra dolgu → iç çizgisiz bulut
        const daireler = [[-58, 10, 56], [58, 4, 58], [0, -30, 70], [-4, 30, 60], [30, -10, 52]];
        const anahat = svgEl('g', { class: 'op-elma__tac-anahat' }, g);
        const dolgu = svgEl('g', { class: 'op-elma__tac' }, g);
        for (const [dx, dy, r] of daireler) {
            svgEl('circle', { cx: cx + dx, cy: TAC_Y + dy, r: r + 3 }, anahat);
            svgEl('circle', { cx: cx + dx, cy: TAC_Y + dy, r }, dolgu);
        }
        svgEl('ellipse', { class: 'op-elma__tac-isik', cx: cx - 30, cy: TAC_Y - 40, rx: 34, ry: 18, transform: 'rotate(-20 ' + (cx - 30) + ' ' + (TAC_Y - 40) + ')' }, g);
        return g;
    }

    function elmaCiz(parent) {
        const g = svgEl('g', { class: 'op-elma__elma' }, parent);
        svgEl('circle', { class: 'op-elma__elma-govde', r: 13 }, g);
        svgEl('path', { class: 'op-elma__elma-sap', d: 'M0 -12 q1 -6 4 -8' }, g);
        svgEl('path', { class: 'op-elma__elma-yaprak', d: 'M2 -16 q6 -6 12 -3 q-5 6 -12 3 Z' }, g);
        svgEl('ellipse', { class: 'op-elma__elma-isik', cx: -5, cy: -4, rx: 3, ry: 4.5 }, g);
        return g;
    }

    // Sincap sağa bakar (ayaklar 0,0); sola bakan için scale(-1 1)
    function sincapCiz(parent, renk) {
        const g = svgEl('g', { class: 'op-elma__sincap op-elma__sincap--' + (renk ? 'kahve' : 'kizil') }, parent);
        svgEl('path', { class: 'op-elma__kuyruk', d: 'M-8 -12 C-38 -10 -46 -40 -32 -58 C-22 -70 -2 -66 -6 -50 C-9 -40 -24 -38 -20 -24 C-18 -18 -12 -14 -8 -12 Z' }, g);
        svgEl('path', { class: 'op-elma__kuyruk-cizgi', d: 'M-14 -20 C-30 -24 -34 -44 -24 -54' }, g);
        svgEl('ellipse', { class: 'op-elma__beden', cx: 4, cy: -20, rx: 16, ry: 18 }, g);
        svgEl('ellipse', { class: 'op-elma__karin', cx: 10, cy: -18, rx: 7.5, ry: 11 }, g);
        svgEl('path', { class: 'op-elma__kulak', d: 'M8 -52 l2 -12 l8 9 Z' }, g);
        svgEl('circle', { class: 'op-elma__bas', cx: 16, cy: -44, r: 12 }, g);
        svgEl('circle', { class: 'op-elma__goz', cx: 21, cy: -46, r: 2.4 }, g);
        svgEl('circle', { class: 'op-elma__burun', cx: 28, cy: -41, r: 2 }, g);
        svgEl('ellipse', { class: 'op-elma__ayak', cx: 0, cy: -2, rx: 7, ry: 3.5 }, g);
        svgEl('ellipse', { class: 'op-elma__ayak', cx: 14, cy: -2, rx: 7, ry: 3.5 }, g);
        svgEl('ellipse', { class: 'op-elma__pati', cx: 20, cy: -26, rx: 4, ry: 3 }, g);
        return g;
    }

    function sincapOlustur(p, m0, giris0) {
        const b = { kelime: p.kelime, sira: p.sira, taraf: p.taraf, serit: p.serit, renk: p.renk, m: m0, giris: giris0,
            ilerleme: 0, tehlike: m0, yanlis: 0, faz: p.sira * 1.7, gorunur: giris0 >= 1, g: null, govde: null, sekme: null, etiket: null,
            etiketIc: null, harfler: [], etiketYari: etiketGenislik(p.kelime) / 2 };
        const g = svgEl('g', { class: 'op-elma__s' }, s.seritKat[p.serit]);
        g.dataset.kelime = b.kelime;
        g.dataset.sira = String(b.sira);
        g.dataset.taraf = b.taraf < 0 ? 'sol' : 'sag';
        g.dataset.serit = String(b.serit);
        b.g = g;
        b.sekme = svgEl('g', {}, g);                    // sekme (y) burada
        b.govde = svgEl('g', {}, b.sekme);               // yön + ölçek burada
        sincapCiz(b.govde, b.renk);
        // Etiket: beyaz hap + mürekkep kontur; alt ucunda sincaba inen küçük üçgen. Kilitte ikinci kesikli çerçeve.
        b.etiket = svgEl('g', { class: 'op-elma__etiket' }, s.etiketKat);
        b.etiket.dataset.sira = String(b.sira);
        b.etiketIc = svgEl('g', { class: 'op-elma__etiket-ic' }, b.etiket);
        const gen = b.etiketYari * 2, yuk = ETIKET_BOY + 14;
        // Sap: etiketi sincaba bağlar (etiket bantta, sincap şeritte); kilitte mavi
        svgEl('path', { class: 'op-elma__etiket-sap', d: 'M0 ' + (yuk / 2) + ' L0 ' + sapBoy(b).toFixed(1) }, b.etiket);
        svgEl('rect', { class: 'op-elma__etiket-halka', x: -gen / 2 - 5, y: -yuk / 2 - 5, width: gen + 10, height: yuk + 10, rx: yuk / 2 + 5 }, b.etiketIc);
        svgEl('path', { class: 'op-elma__etiket-uc', d: 'M-7 ' + (yuk / 2 - 1) + ' L0 ' + (yuk / 2 + 8) + ' L7 ' + (yuk / 2 - 1) + ' Z' }, b.etiketIc);
        svgEl('rect', { class: 'op-elma__etiket-zemin', x: -gen / 2, y: -yuk / 2, width: gen, height: yuk, rx: yuk / 2 }, b.etiketIc);
        const t = svgEl('text', { class: 'op-elma__kelime', x: 0, y: (ETIKET_BOY * 0.36).toFixed(1), 'font-size': ETIKET_BOY }, b.etiketIc);
        b.harfler = [...b.kelime].map((ch) => { const ts = svgEl('tspan', {}, t); ts.textContent = ch; return ts; });
        return b;
    }

    function baslat(alan, ayar, cbs) {
        durdur();
        const kelimeler = String(ayar.metin || '').split(' ').filter(Boolean);
        const rnd = O.rng((ayar.tohum >>> 0) || 1);
        const azalt = O.azaltilmisHareket();
        const plan = planKur(kelimeler, rnd);

        const kok = htmlEl('div', 'op-mini op-elma');
        kok.dataset.tohum = String(ayar.tohum);
        const svg = svgEl('svg', { class: 'op-mini__svg op-elma__svg', viewBox: '0 0 800 ' + H, role: 'img', focusable: 'false',
            'aria-label': 'Elma Bekçisi: sincabın kelimesinin ilk harfine bas, kelimeyi yaz, sincap kaçsın' });
        svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
        kok.appendChild(svg);

        // Katmanlar: tepeler, çimen, ağaç (W'ye bağlı → yeniden çizilir), elmalar, uzak şerit, yakın şerit, etiketler, efektler
        const zemin = svgEl('g', { class: 'op-elma__zemin' }, svg);
        const tepe = O.tepeYolu(rnd, { x0: -60, son: 1700, adim: 170, taban: YER_Y + 4, genlik: 34, alt: H });
        svgEl('path', { class: 'op-elma__tepe', d: tepe }, zemin);
        svgEl('rect', { class: 'op-elma__cimen', x: -10, y: YER_Y, width: 1620, height: H - YER_Y + 10 }, zemin);
        const otlar = [];
        for (let i = 0; i < 26; i++) otlar.push([rnd() * 1600, YER_Y + 14 + rnd() * (H - YER_Y - 24)]);
        const otKat = svgEl('g', { class: 'op-elma__otlar' }, zemin);
        for (const [x, y] of otlar) svgEl('path', { d: 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' l-4 -9 M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' l1 -11 M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' l5 -8' }, otKat);
        const agacKat = svgEl('g', {}, svg);
        const elmaKat = svgEl('g', { class: 'op-elma__elmalar' }, svg);
        const seritKat = [svgEl('g', { class: 'op-elma__serit' }, svg), svgEl('g', { class: 'op-elma__serit' }, svg)];
        const etiketKat = svgEl('g', { class: 'op-elma__etiketler' }, svg);
        const efekt = svgEl('g', { class: 'op-elma__efektler' }, svg);

        // HUD: elmalar solda (can), bitirilen kelime sağda
        const hud = htmlEl('div', 'op-mini__hud op-elma__hud');
        const elmaHud = O.canlarHud(ELMA_SAYI, { ad: 'Elma', yol: ELMA_YOL, sinif: 'op-elma__hud-elma' });
        const sayac = htmlEl('div', 'op-mini__sayac op-elma__ilerleme');
        sayac.setAttribute('role', 'img');
        const ik = svgEl('svg', { viewBox: '0 0 24 24', class: 'op-elma__ilerleme-ik', 'aria-hidden': 'true', focusable: 'false' }, sayac);
        svgEl('rect', { x: 2.5, y: 6, width: 19, height: 10, rx: 5 }, ik);
        svgEl('path', { d: 'M10 16 l2 4 l2 -4' }, ik);
        const sayi = htmlEl('span', 'op-elma__ilerleme-sayi');
        sayac.appendChild(sayi);
        hud.append(elmaHud.el, sayac);
        kok.appendChild(hud);
        const devam = O.devamKatmani();
        kok.appendChild(devam);
        alan.appendChild(kok);

        s = { kok, svg, agacKat, elmaKat, seritKat, etiketKat, efekt, cbs, azalt, plan, kelimeler, sonraki: 0, aktif: [],
            kilit: null, elma: ELMA_SAYI, yuvalar: [], biten: 0, alinan: 0, bitti: false, kazandi: false, zaman: 0, W: 800,
            dogus: 0, efektler: [], hedefBildir: O.hedefBildirici(kok, cbs.hedef), elmaHud, sayac, sayi,
            hiz: O.uyarlanirHiz(HIZ), kabuk: null };
        const benim = s;
        s.kabuk = O.oyunKabugu({ kok, svg, H, devam, adim, duyur: cbs.duyuru, olcu: (W) => { benim.W = W; sahneKur(); } });
        for (let i = 0; i < BASLANGIC.length && s.sonraki < plan.length; i++) dogur(BASLANGIC[i], i === 0 ? 1 : 0);
        hudYaz();
        hedefYaz();
        ciz();
        return s.kabuk.baslat(bas);
    }

    // Ağaç ve elma yuvaları genişliğe bağlı: ölçü değişince yeniden kurulur (alınan yuvalar boş kalır)
    function sahneKur() {
        s.agacKat.textContent = '';
        agacCiz(s.agacKat, s.W);
        s.elmaKat.textContent = '';
        s.yuvalar = YUVALAR.map((_, i) => {
            const alindi = s.yuvalar[i] ? s.yuvalar[i].alindi : false;
            const [x, y] = yuvaXY(i);
            const g = svgEl('g', { class: 'op-elma__yuva', transform: 'translate(' + x + ' ' + y + ')' }, s.elmaKat);
            g.dataset.yuva = String(i);
            svgEl('circle', { class: 'op-elma__yuva-bos', r: 13 }, g);
            const elma = elmaCiz(g);
            g.classList.toggle('is-alindi', alindi);
            return { g, elma, alindi };
        });
        if (s.aktif.length) ciz();
    }

    // ── Doğuş: metin sırasıyla; taraf/şerit plandan ──
    // Aynı yan + şeritteki sincap hem yolun SERIT_BOS'unu almış hem de yeni gelenin etiketine yer açmış olmalı (dar
    // sahnede — telefonda — 0,3 yol yalnız ~27 birim: etiketler üst üste binerdi)
    function seritBos(p) {
        const yeniYari = etiketGenislik(p.kelime) / 2;
        return !s.aktif.some((b) => b.taraf === p.taraf && b.serit === p.serit && (b.giris < 1 || b.m < SERIT_BOS
            || Math.abs(sincapX(b) - xKenar(b)) < b.etiketYari + yeniYari + 8));
    }
    function dogur(m0, giris0) {
        const b = sincapOlustur(s.plan[s.sonraki], m0, giris0);
        s.sonraki += 1;
        s.aktif.push(b);
        harfDurum(b);
        sincapYerlestir(b);
        return b;
    }
    function siradakiDogabilir() { return s.sonraki < s.plan.length && seritBos(s.plan[s.sonraki]); }
    function eksikseDogur() {
        while (!s.bitti && s.aktif.length < ESZ_MIN && siradakiDogabilir()) dogur(0, 0);
    }

    // ── Durum yazımı ──
    function harfDurum(b) {
        b.harfler.forEach((ts, i) => {
            ts.setAttribute('class', i < b.ilerleme ? 'is-yazildi' : (b === s.kilit && i === b.ilerleme ? 'is-sira' + (b.yanlis > 0 ? ' is-yanlis' : '') : ''));
        });
        b.g.classList.toggle('is-kilitli', b === s.kilit);
        b.etiket.classList.toggle('is-kilitli', b === s.kilit);
    }
    function hudYaz() {
        s.kok.dataset.elma = String(s.elma);
        s.kok.dataset.biten = String(s.biten);
        s.kok.dataset.kilit = s.kilit ? String(s.kilit.sira) : '';
        s.kok.classList.toggle('is-kilitli', !!s.kilit);
        s.elmaHud.guncelle(s.elma);
        const n = s.kelimeler.length, islenen = s.biten + s.alinan;
        s.sayi.textContent = islenen + '/' + n;
        s.sayac.setAttribute('aria-label', 'Kelime: ' + islenen + ' / ' + n + ', bitirilen: ' + s.biten);
    }
    // Ortak seçim kuralı: b.gorunur (girişi bitti) — döngü ve doğuş günceller
    const secilebilir = () => O.secilebilir(s.aktif);
    function hedefYaz() { s.hedefBildir(s.bitti ? null : O.beklenenHarf(secilebilir(), s.kilit)); }

    // ── Girdi ──
    function bas(ch) {
        if (s.bitti) return;
        if (s.kilit) {
            const b = s.kilit;
            if (ch !== [...b.kelime][b.ilerleme]) {
                s.cbs.tus(false);
                if (!s) return;
                b.yanlis = YANLIS_MS;
                harfDurum(b);
                return;
            }
            s.cbs.tus(true);
            if (!s) return;
            ilerle(b);
            return;
        }
        const h = O.hedefSec(secilebilir(), ch, null);
        if (!h) { s.cbs.tus(false); return; }
        s.cbs.tus(true);
        if (!s) return;
        s.kilit = h;
        ilerle(h);
    }
    function ilerle(b) {
        b.ilerleme += 1;
        b.yanlis = 0;
        if (b.ilerleme >= [...b.kelime].length) { kovuldu(b); return; }
        harfDurum(b);
        hudYaz();
        hedefYaz();
    }

    // Sahneden çıkış: sincap geri döner ve kendi kenarına koşar (azaltılmış harekette yerinde solar); etiket söner
    function cikar(b, tasinan) {
        s.aktif.splice(s.aktif.indexOf(b), 1);
        if (s.kilit === b) s.kilit = null;
        const x = sincapX(b);
        b.g.classList.remove('is-kilitli');
        b.g.classList.add('is-kaciyor');
        b.g.removeAttribute('data-sira');
        b.g.removeAttribute('data-kelime');
        b.etiket.remove();
        s.efektler.push({ tur: 'kac', b, x, yon: b.taraf, tasinan: tasinan || null, t: 0, sure: s.azalt ? SOL_MS : 4000 });
    }

    // Kelime bitti: sincap kaçar (sayılır), eksikse yenisi doğar
    function kovuldu(b) {
        const x = sincapX(b);
        harfDurum(b);                                    // son harf de "yazıldı"
        // Etiketin "tamam" sönüşü (yerinde büyüyüp solar)
        const pop = svgEl('g', { class: 'op-elma__etiket op-elma__etiket--pop is-kilitli', transform: b.etiket.getAttribute('transform') || '' }, s.efekt);
        pop.appendChild(b.etiketIc.cloneNode(true));
        O.tikCiz(pop, { transform: 'translate(' + (b.etiketYari + 2).toFixed(1) + ' ' + (-(ETIKET_BOY + 14) / 2 + 2) + ')' });   // renk dışı onay
        s.efektler.push({ tur: 'pop', g: pop, x: etiketX(b, x), y: etiketY(b), t: 0, sure: POP_MS });
        cikar(b, null);
        s.biten += 1;
        s.hiz.basari();
        if (window.AudioManager) window.AudioManager.play('whoosh');
        hudYaz();
        if (bittiMi()) { bitir(true); return; }
        eksikseDogur();
        hedefYaz();
    }

    // Ağaca vardı: tarafındaki ilk dolu yuvadan bir elma alır (uçuş), sonra kaçar
    function elmaAl(b) {
        const sirali = s.yuvalar.map((y, i) => ({ y, i, x: YUVALAR[i][0] })).filter((o) => !o.y.alindi)
            .sort((a, c) => (b.taraf < 0 ? a.x - c.x : c.x - a.x));
        const secilen = sirali[0];
        s.elma -= 1;
        s.alinan += 1;
        s.hiz.canKaybi();
        let tasinan = null, bas0 = null;
        if (secilen) {
            secilen.y.alindi = true;
            secilen.y.g.classList.add('is-alindi');
            tasinan = elmaCiz(s.efekt);
            tasinan.classList.add('op-elma__tasinan');
            bas0 = yuvaXY(secilen.i);
        }
        if (window.AudioManager) window.AudioManager.play('pop');
        if (tasinan && !s.azalt) {
            // Önce elma uçar (sincap ağaçta bekler, artık seçilemez), sonra kaçış
            s.aktif.splice(s.aktif.indexOf(b), 1);
            if (s.kilit === b) s.kilit = null;
            b.etiket.remove();
            b.g.classList.remove('is-kilitli');
            b.g.classList.add('is-aliyor');
            b.g.removeAttribute('data-sira');
            b.g.removeAttribute('data-kelime');
            s.efektler.push({ tur: 'uc', b, x: sincapX(b), tasinan, x0: bas0[0], y0: bas0[1], t: 0, sure: ELMA_UC_MS });
        } else {
            cikar(b, tasinan);
        }
        hudYaz();
        if (s.elma <= 0) { bitir(false); return; }
        if (typeof s.cbs.duyuru === 'function') s.cbs.duyuru('Sincap bir elma aldı. ' + s.elma + ' elma kaldı.');
        if (!s) return;
        if (bittiMi()) { bitir(true); return; }
        eksikseDogur();
    }

    function bittiMi() { return s.sonraki >= s.plan.length && s.aktif.length === 0; }

    function bitir(canli) {
        s.bitti = true;
        s.kazandi = canli;
        if (s.kilit) { const k = s.kilit; s.kilit = null; harfDurum(k); }
        s.kabuk.bitir(canli ? 'canli' : 'elmalar');
        hudYaz();
        hedefYaz();
        if (canli && !s.azalt) {
            // Kazanınca daldaki elmalar sırayla zıplar (tek kutlama anı). Yuva SIRA NUMARASIYLA izlenir: ölçü değişip
            // sahne yeniden kurulursa efekt yeni elmalarla sürer
            const kalan = s.yuvalar.map((y, i) => (y.alindi ? -1 : i)).filter((i) => i >= 0);
            s.efektler.push({ tur: 'kutla', kalan, t: 0, sure: KUTLA_MS + KUTLA_ARA * kalan.length });
        }
        s.cbs.bitti({ canliBitti: canli });
    }

    // ── Döngü ──
    function adim(dt) {
        s.zaman += dt;
        if (!s.bitti) {
            const v = s.hiz.deger() * dt / 1000;
            const varan = [];
            for (const b of s.aktif) {
                if (b.giris < 1) { b.giris = Math.min(1, b.giris + dt / GIRIS_MS); b.gorunur = gorunur(b); continue; }
                b.m += v;
                b.tehlike = b.m;
                if (b.m >= 1) varan.push(b);
            }
            for (const b of varan) {
                b.m = 1;
                elmaAl(b);
                if (!s || s.bitti) break;
            }
            if (!s) return;              // modül bitti() içinde durdurduysa
            if (!s.bitti) {
                s.dogus += v;
                if (s.dogus >= DOGUS_M && s.sonraki < s.plan.length) {
                    if (s.aktif.length >= ESZ_MAX || !siradakiDogabilir()) s.dogus = DOGUS_M;   // yer açılınca hemen
                    else { dogur(0, 0); s.dogus = 0; }
                }
                eksikseDogur();
                hedefYaz();
            }
        }
        for (const b of s.aktif) {
            if (b.yanlis > 0) { b.yanlis = Math.max(0, b.yanlis - dt); if (b.yanlis === 0) harfDurum(b); }
        }
        const yeni = [];
        s.efektler = s.efektler.filter((e) => efektAdim(e, dt, yeni)).concat(yeni);
        ciz();
    }

    // Efekt bir kare ilerler; false → bitti ve DOM'dan söküldü (ardıl efekt `yeni`ye eklenir)
    function efektAdim(e, dt, yeni) {
        e.t += dt;
        if (e.tur === 'kac') {
            if (!s.azalt) e.x += e.yon * KACIS_HIZ * dt / 1000 * Math.min(1, e.t / ZIPLA_MS);
            const disarida = e.yon < 0 ? e.x < -GOVDE_YARI * 2 - 20 : e.x > s.W + GOVDE_YARI * 2 + 20;
            if ((s.azalt && e.t >= e.sure) || (!s.azalt && disarida) || e.t >= 4000) {
                e.b.g.remove();
                if (e.tasinan) e.tasinan.remove();
                return false;
            }
            return true;
        }
        if (e.tur === 'uc' && e.t >= e.sure) {
            // Elma pati'de: kaçış başlar
            e.b.g.classList.remove('is-aliyor');
            e.b.g.classList.add('is-kaciyor');
            yeni.push({ tur: 'kac', b: e.b, x: e.x, yon: e.b.taraf, tasinan: e.tasinan, t: 0, sure: 4000 });
            return false;
        }
        if (e.t >= e.sure) { if (e.g) e.g.remove(); return false; }
        return true;
    }

    function ciz() {
        for (const b of s.aktif) sincapYerlestir(b);
        efektCiz();
    }

    function sincapYerlestir(b) {
        const x = sincapX(b), y = SERITLER[b.serit].y, k = olcek(b);
        b.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y + ')');
        b.g.dataset.m = b.m.toFixed(3);
        b.g.dataset.gorunur = gorunur(b) ? '1' : '0';
        // Sekme: tek sincap adımı = kısa yay; azaltılmış harekette yok
        const sek = s.azalt || s.bitti ? 0 : -Math.abs(Math.sin(s.zaman / 170 + b.faz)) * 5 * k;
        b.sekme.setAttribute('transform', 'translate(0 ' + sek.toFixed(2) + ')');
        b.govde.setAttribute('transform', 'scale(' + (-b.taraf * k) + ' ' + k + ')');
        const ex = etiketX(b, x), ey = etiketY(b);
        b.etiket.setAttribute('transform', 'translate(' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ')');
        b.etiket.style.opacity = gorunur(b) ? '' : String((b.giris * b.giris).toFixed(2));
        b.etiket.classList.toggle('is-giris', !gorunur(b));     // girişte saydamlık döngüden: CSS geçişi kapalı
        let tf = b === s.kilit ? 'scale(1.1)' : '';
        if (b.yanlis > 0 && !s.azalt) {
            const q = b.yanlis / YANLIS_MS;
            tf = 'translate(' + (Math.sin((1 - q) * Math.PI * 4) * 5 * q).toFixed(2) + ' 0) ' + tf;
        }
        b.etiketIc.setAttribute('transform', tf);
    }

    function efektCiz() {
        for (const e of s.efektler) {
            const q = Math.min(1, e.t / e.sure), u = easeOut(q);
            if (e.tur === 'kac') {
                const b = e.b, k = olcek(b), y = SERITLER[b.serit].y;
                b.g.setAttribute('transform', 'translate(' + e.x.toFixed(1) + ' ' + y + ')');
                // Kaçış yönüne döner (kenara bakar); başta küçük bir zıplama, sonra koşu sekmesi
                b.govde.setAttribute('transform', 'scale(' + (b.taraf * k) + ' ' + k + ')');
                let sek = 0;
                if (s.azalt) b.g.style.opacity = String(1 - q);
                else if (e.t < ZIPLA_MS) sek = -Math.sin(Math.PI * e.t / ZIPLA_MS) * 14 * k;
                else sek = -Math.abs(Math.sin(e.t / 90)) * 6 * k;
                b.sekme.setAttribute('transform', 'translate(0 ' + sek.toFixed(2) + ')');
                if (e.tasinan) {
                    e.tasinan.setAttribute('transform', 'translate(' + elX(b, e.x, b.taraf).toFixed(1) + ' ' + (elY(b) + sek).toFixed(1) + ') scale(' + (0.8 * k).toFixed(2) + ')');
                    if (s.azalt) e.tasinan.style.opacity = String(1 - q);
                }
            } else if (e.tur === 'uc') {
                // Elma daldan pati'ye yayla uçar (ease-out; tepe noktası yolun üstünde)
                const b = e.b, k = olcek(b), x0 = e.x0, y0 = e.y0;
                b.g.setAttribute('transform', 'translate(' + e.x.toFixed(1) + ' ' + SERITLER[b.serit].y + ')');
                b.sekme.setAttribute('transform', '');
                const x1 = elX(b, e.x, -b.taraf), y1 = elY(b);
                const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - Math.sin(Math.PI * u) * 34;
                e.tasinan.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (1 - 0.2 * k * u).toFixed(2) + ')');
            } else if (e.tur === 'pop') {
                e.g.setAttribute('transform', 'translate(' + e.x.toFixed(1) + ' ' + e.y.toFixed(1) + ') scale(' + (s.azalt ? 1 : 1 + 0.15 * u).toFixed(3) + ')');
                e.g.style.opacity = String(Math.min(1, 2 * (1 - q)));   // yarı süre tam görünür (onay okunur), sonra söner
            } else if (e.tur === 'kutla') {
                e.kalan.forEach((yi, i) => {
                    const kk = Math.max(0, Math.min(1, (e.t - i * KUTLA_ARA) / KUTLA_MS));
                    s.yuvalar[yi].elma.setAttribute('transform', 'translate(0 ' + (-Math.sin(Math.PI * kk) * 10).toFixed(2) + ')');
                });
            }
        }
    }

    function durdur() {
        if (!s) return;
        const eski = s;
        s = null;
        eski.kabuk.durdur();
    }

    window.OnParmakOyunlari = window.OnParmakOyunlari || {};
    window.OnParmakOyunlari.elma = { baslat, durdur };
})();
