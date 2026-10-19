/* ============================================
   On Parmak — mini oyun: Balon Vadisi (harf oyunu) → window.OnParmakOyunlari.balon
   --------------------------------------------
   Spec §6.2: sağdan üzerinde harf yazan balonlar gelir; doğru harf → karakterimiz o balona atlar. Tutunduğu balon
   yavaşça alçalır; ayağı suya değerse can gider ve karakter SIRADAKİ balona taşınır (o balonun harfi atlanır, basış
   sayılmaz). Yanlış tuşta hedef balon sallanır. Bitiş: metin biter (canlı) ya da 3 can biter.
   TypingClub "Balloon Valley" yalnız işleyiş örneğidir; sahne ve karakter kendi SVG çizimimiz (createElementNS).
   Şiddet yok: düşmek = suya "cup" diye girmek.

   Sözleşme (spec §6.1 + modül başlığı js/games/on-parmak.js):
     baslat(alan, { metin, el, tohum }, { tus(dogruMu), bitti({ canliBitti }), hedef?(ch|null) }) → tutamaç
       tutamaç = { bas(ch), devamTusu() → bool, duraklat(acik) }
       - Oyun kendi keydown dinleyicisini KURMAZ; modül her tuşta önce devamTusu() çağırır (true = yutuldu, sayılmaz),
         sonra yazılabilir karakteri bas(ch) ile verir. duraklat(true|false): Caps Lock — açıkken döngü durur (balon
         alçalmaz, can gitmez), kapanınca hemen sürer; açıkken devam tuşu oyunu sürdürmez (dongu duraklat/surdur 'caps').
       - tus(dogruMu) her sayılan basışta tam bir kez, bas() içinde EŞZAMANLI çağrılır; son doğru harfte bitti() de
         eşzamanlı gelir (sahte saatte döngü dönmese de akış ilerler). Can bitişi döngüden gelir.
       - hedef(ch): beklenen karakter değişince (başta, doğru basışta, can kaybında; bitişte null).
     durdur(): döngü + ResizeObserver durur, DOM boşalır; tekrar çağrılabilir.
   Belirleyicilik: balon yükseklikleri/renkleri/bulutlar rng(tohum) ile (modül tohum = genel bölüm numarası).
   Zaman yalnız döngünün dt'si (setTimeout yok). prefers-reduced-motion: sallanma/salınım/yay yok, atlayış ve kamera
   anında, sıçrama halkaları yerinde söner; temel hız düşük (uyarlanirHiz).
   ============================================ */
(function () {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';
    const H = 320;              // sahne yüksekliği (SVG birimi); genişlik kabın en/boy oranından
    const SU_Y = 272;           // su yüzeyi
    const ARALIK = 150;         // balonlar arası yatay uzaklık
    const EL_Y = 74;            // balon merkezinden karakterin ellerine (ip ucu)
    const PIT_OLCEK = 1.3;      // karakter çizim ölçeği (çizim birimi: eller → ayak 46)
    const AYAK_Y = EL_Y + 46 * PIT_OLCEK;   // balon merkezinden ayak ucuna
    const BAS_Y = 66;           // başlangıç balonu (harfsiz; HUD'un altında kalır)
    const YUK_MIN = 52, YUK_MAX = 98;   // harfli balonların süzülme yüksekliği
    const ZIPLA_MS = 260;       // doğru basış atlayışı: kısa — klavyeyle sık yapılan eylem, girdiyi beklemez
    const SICRA_ZIPLA_MS = 520; // sudan çıkış (seyrek an)
    const SALLA_MS = 220;
    const SICRA_MS = 700;
    const BIRAK_MS = 900;       // bırakılan balon yükselip söner
    const CAN = 3;
    const RENK_SAYISI = 5;
    const HIZ = { taban: 9, min: 5, max: 20, artis: 0.35, azalis: 2 };   // alçalma, birim/sn

    let s = null;   // etkin oyun durumu (tek örnek)

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

    // ── Çizim parçaları ──
    function balonCiz(parent, b) {
        const g = svgEl('g', { class: 'op-balon__b op-balon__b--' + b.renk + (b.harf ? '' : ' op-balon__b--bos') }, parent);
        g.dataset.i = String(b.i);
        if (b.harf) { g.dataset.harf = b.harf; g.dataset.yuk = String(Math.round(b.taban)); g.dataset.renk = String(b.renk); }
        const ic = svgEl('g', { class: 'op-balon__ic' }, g);              // sallanma bu katmanda (konumdan ayrı)
        svgEl('path', { class: 'op-balon__ip', d: 'M0 38 q-5 10 0 18 t0 18' }, ic);
        svgEl('path', { class: 'op-balon__dugum', d: 'M-5 41 L0 35 L5 41 Z' }, ic);
        svgEl('ellipse', { class: 'op-balon__govde', cx: 0, cy: 0, rx: 33, ry: 37 }, ic);
        svgEl('ellipse', { class: 'op-balon__parilti', cx: -12, cy: -16, rx: 7, ry: 11, transform: 'rotate(28 -12 -16)' }, ic);
        if (b.harf) {
            const t = svgEl('text', { class: 'op-balon__harf', x: 0, y: 2 }, ic);
            t.textContent = b.harf;
            // Hedef işareti (renkten bağımsız): yalnız sıradaki balonda görünür
            svgEl('path', { class: 'op-balon__ok', d: 'M-9 -60 L9 -60 L0 -47 Z' }, g);
        }
        b.g = g; b.ic = ic;
    }

    // Karakter "Pıt": orijin = eller (ipin ucu); gövde aşağıda. Kendi çizimimiz.
    function karakterCiz(parent) {
        const g = svgEl('g', { class: 'op-balon__pit' }, parent);
        const ic = svgEl('g', { class: 'op-balon__pit-ic' }, g);
        svgEl('path', { class: 'op-balon__pit-kol', d: 'M-11 22 Q-10 10 -3 2' }, ic);
        svgEl('path', { class: 'op-balon__pit-kol', d: 'M11 22 Q10 10 3 2' }, ic);
        svgEl('ellipse', { class: 'op-balon__pit-ayak', cx: -7, cy: 44, rx: 6, ry: 3.5 }, ic);
        svgEl('ellipse', { class: 'op-balon__pit-ayak', cx: 7, cy: 44, rx: 6, ry: 3.5 }, ic);
        svgEl('circle', { class: 'op-balon__pit-govde', cx: 0, cy: 28, r: 17 }, ic);
        svgEl('ellipse', { class: 'op-balon__pit-karin', cx: 0, cy: 34, rx: 10, ry: 8 }, ic);
        svgEl('path', { class: 'op-balon__pit-tepe', d: 'M-3 12 q2 -7 6 -4 q-3 1 -2 5' }, ic);
        svgEl('circle', { class: 'op-balon__pit-goz', cx: -6, cy: 25, r: 2.6 }, ic);
        svgEl('circle', { class: 'op-balon__pit-goz', cx: 6, cy: 25, r: 2.6 }, ic);
        svgEl('circle', { class: 'op-balon__pit-yanak', cx: -11, cy: 31, r: 2.6 }, ic);
        svgEl('circle', { class: 'op-balon__pit-yanak', cx: 11, cy: 31, r: 2.6 }, ic);
        svgEl('path', { class: 'op-balon__pit-agiz', d: 'M-4 31 q4 4 8 0' }, ic);
        svgEl('circle', { class: 'op-balon__pit-el', cx: -2.5, cy: 2, r: 3 }, ic);
        svgEl('circle', { class: 'op-balon__pit-el', cx: 2.5, cy: 2, r: 3 }, ic);
        return { g, ic };
    }

    function tepeYolu(uzunluk, rnd, taban, genlik) {
        let d = 'M-200 ' + H + ' L-200 ' + taban;
        for (let x = -200; x <= uzunluk; x += 120) {
            const y = taban - genlik * (0.4 + rnd() * 0.6);
            d += ' Q' + (x + 60) + ' ' + y + ' ' + (x + 120) + ' ' + taban;
        }
        return d + ' L' + (uzunluk + 120) + ' ' + H + ' Z';
    }

    function baslat(alan, ayar, cbs) {
        durdur();
        const O = window.OnParmakOyunOrtak;
        const metin = String(ayar.metin || '');
        const rnd = O.rng((ayar.tohum >>> 0) || 1);
        const azalt = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const kok = htmlEl('div', 'op-balon');
        kok.dataset.tohum = String(ayar.tohum);
        const svg = svgEl('svg', { class: 'op-balon__svg', viewBox: '0 0 800 ' + H, role: 'img', focusable: 'false',
            'aria-label': 'Balon Vadisi: karakter balondan balona atlar' });
        svg.setAttribute('preserveAspectRatio', 'xMinYMax meet');
        kok.appendChild(svg);

        const gunes = svgEl('g', { class: 'op-balon__gunes' }, svg);
        svgEl('circle', { class: 'op-balon__gunes-hale', r: 46 }, gunes);
        svgEl('circle', { class: 'op-balon__gunes-ic', r: 30 }, gunes);

        const dunyaUzun = (metin.length + 3) * ARALIK;
        const bulutlar = svgEl('g', { class: 'op-balon__bulutlar' }, svg);
        for (let x = 40; x < dunyaUzun * 0.15 + 1600; x += 220 + rnd() * 160) {
            const y = 34 + rnd() * 70, k = 0.7 + rnd() * 0.5;
            const b = svgEl('g', { class: 'op-balon__bulut', transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + k.toFixed(2) + ')' }, bulutlar);
            svgEl('ellipse', { cx: 0, cy: 0, rx: 34, ry: 14 }, b);
            svgEl('ellipse', { cx: -14, cy: -8, rx: 16, ry: 13 }, b);
            svgEl('ellipse', { cx: 12, cy: -11, rx: 18, ry: 15 }, b);
        }
        const tepeUzak = svgEl('path', { class: 'op-balon__tepe op-balon__tepe--uzak', d: tepeYolu(dunyaUzun * 0.2 + 1600, rnd, 238, 70) }, svg);
        const tepeYakin = svgEl('path', { class: 'op-balon__tepe op-balon__tepe--yakin', d: tepeYolu(dunyaUzun * 0.4 + 1600, rnd, 262, 46) }, svg);

        const dunya = svgEl('g', { class: 'op-balon__dunya' }, svg);
        const balonKat = svgEl('g', {}, dunya);
        const pit = karakterCiz(dunya);

        const su = svgEl('g', { class: 'op-balon__su' }, svg);
        svgEl('rect', { class: 'op-balon__su-govde', x: -10, y: SU_Y, width: 3000, height: H - SU_Y + 10 }, su);
        let dalga = 'M-80 ' + SU_Y;
        for (let x = -80; x < 3000; x += 40) dalga += ' q10 -6 20 0 t20 0';
        const dalgaYol = svgEl('path', { class: 'op-balon__dalga', d: dalga }, su);
        const sicraKat = svgEl('g', { class: 'op-balon__sicrama' }, svg);

        // HUD (HTML): canlar + ilerleme; duraklama katmanı
        const hud = htmlEl('div', 'op-balon__hud');
        const canlar = htmlEl('div', 'op-balon__canlar');
        canlar.setAttribute('role', 'img');
        const canIkon = [];
        for (let i = 0; i < CAN; i++) {
            const c = svgEl('svg', { viewBox: '0 0 24 24', class: 'op-balon__can', 'aria-hidden': 'true', focusable: 'false' }, canlar);
            svgEl('path', { d: 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.7 1.3 5.2 3.1 1.5-1.8 3-3.1 5.2-3.1 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z' }, c);
            canIkon.push(c);
        }
        const ilerleme = htmlEl('div', 'op-balon__ilerleme');
        ilerleme.setAttribute('aria-hidden', 'true');
        hud.append(canlar, ilerleme);
        kok.appendChild(hud);
        const devam = htmlEl('div', 'op-balon__devam');
        devam.setAttribute('role', 'status');
        devam.hidden = true;
        devam.appendChild(htmlEl('strong', '', 'Oyun durdu'));
        devam.appendChild(htmlEl('span', '', 'Devam etmek için bir tuşa bas'));
        kok.appendChild(devam);
        alan.appendChild(kok);

        // Balonlar: 0 = başlangıç (harfsiz), i ≥ 1 → metin[i-1]
        const balonlar = [];
        for (let i = 0; i <= metin.length; i++) {
            const taban = i === 0 ? BAS_Y : YUK_MIN + rnd() * (YUK_MAX - YUK_MIN);
            const b = { i, harf: i === 0 ? '' : metin[i - 1], x: i * ARALIK, taban, y: taban, renk: Math.floor(rnd() * RENK_SAYISI),
                faz: rnd() * Math.PI * 2, salla: 0, birak: -1, gorunur: true };
            balonCiz(balonKat, b);
            balonlar.push(b);
        }

        s = { alan, kok, svg, metin, cbs, azalt, balonlar, pit, dunya, gunes, bulutlar, tepeUzak, tepeYakin, dalgaYol, sicraKat,
            canIkon, canlar, ilerleme, devam, i: 0, can: CAN, bitti: false, kazandi: false, zaman: 0, W: 800, kamera: 0,
            zip: null, sicralar: [], hiz: O.uyarlanirHiz(HIZ), dongu: null, ro: null };

        olcuGuncelle();
        s.kamera = kameraHedef();
        if (typeof ResizeObserver === 'function') { s.ro = new ResizeObserver(olcuGuncelle); s.ro.observe(kok); }
        hudYaz();
        hedefYaz();
        ciz();
        const benim = s;
        s.dongu = O.dongu(adim, { durumDegisti: (d) => { if (s === benim) durumYaz(d); } });
        durumYaz(s.dongu.durum());
        return {
            bas: (ch) => { if (s === benim) bas(ch); },
            devamTusu: () => (s === benim && s.dongu ? s.dongu.devamTusu() : false),
            // Caps Lock (modül): açıkken alçalma/zaman durur; kapanınca hemen sürer (devam tuşu gerekmez)
            duraklat: (acik) => {
                if (s !== benim || !s.dongu) return;
                if (acik) s.dongu.duraklat('caps'); else s.dongu.surdur('caps');
            },
        };
    }

    function olcuGuncelle() {
        if (!s) return;
        const w = s.kok.clientWidth, h = s.kok.clientHeight;
        s.W = w > 0 && h > 0 ? Math.max(360, Math.min(1600, Math.round(H * w / h))) : 800;
        s.svg.setAttribute('viewBox', '0 0 ' + s.W + ' ' + H);
        s.gunes.setAttribute('transform', 'translate(' + Math.round(s.W * 0.78) + ' 214)');
    }

    // Karakter hep sahnenin %26'sında (başlangıç balonu da): sol üstteki can HUD'u ile çakışmaz
    function kameraHedef() { return karakterKonum().x - s.W * 0.26; }

    function durumYaz(d) {
        if (!s) return;
        s.kok.dataset.durum = d;
        s.devam.hidden = d !== 'devam-bekliyor';
    }

    function hudYaz() {
        s.kok.dataset.can = String(s.can);
        s.canIkon.forEach((c, i) => c.classList.toggle('is-gitti', i >= s.can));
        s.canlar.setAttribute('aria-label', 'Can: ' + s.can + ' / ' + CAN);
        s.ilerleme.textContent = Math.min(s.i, s.metin.length) + ' / ' + s.metin.length;
    }

    function beklenen() { return !s.bitti && s.i < s.metin.length ? s.metin[s.i] : null; }

    function hedefYaz() {
        const ch = beklenen();
        s.kok.dataset.hedef = ch || '';
        s.balonlar.forEach((b) => b.g.classList.toggle('is-hedef', b.i === s.i + 1 && !!ch));
        if (typeof s.cbs.hedef === 'function') s.cbs.hedef(ch);
    }

    // ── Girdi ──
    function bas(ch) {
        if (s.bitti) return;
        const hedef = s.balonlar[s.i + 1];
        if (ch !== beklenen()) {
            s.cbs.tus(false);
            if (hedef) { hedef.salla = SALLA_MS; hedef.g.classList.add('is-yanlis'); }   // işaret hemen; döngü söndürür
            return;
        }
        s.cbs.tus(true);
        if (!s) return;              // modül çağrı içinde durdurduysa
        s.hiz.basari();
        atla(s.i + 1, false);
        if (s.i >= s.metin.length) { bitir(true); return; }
        hedefYaz();
    }

    function atla(j, sudan) {
        const eski = s.balonlar[s.i];
        const bas0 = karakterKonum();
        eski.birak = 0;                          // bırakılan balon yükselip söner
        s.i = j;
        s.zip = s.azalt ? null : { t: 0, sure: sudan ? SICRA_ZIPLA_MS : ZIPLA_MS, x0: bas0.x, y0: bas0.y, yay: sudan ? 60 : 30 };
        hudYaz();
    }

    function bitir(canli) {
        s.bitti = true;
        s.kazandi = canli;
        s.kok.dataset.bitti = canli ? 'canli' : 'canlar';
        hedefYaz();
        s.cbs.bitti({ canliBitti: canli });
    }

    // ── Döngü ──
    function adim(dt) {
        s.zaman += dt;
        const cur = s.balonlar[s.i];
        if (!s.bitti) {
            cur.y += s.hiz.deger() * dt / 1000;
            if (cur.y + AYAK_Y >= SU_Y) {
                suyaDustu();
                if (!s) return;          // modül bitti() içinde durdurduysa (bas() ile aynı koruma)
            }
        }
        if (s.zip) { s.zip.t += dt; if (s.zip.t >= s.zip.sure) s.zip = null; }
        s.balonlar.forEach((b) => {
            if (b.salla > 0) b.salla = Math.max(0, b.salla - dt);
            if (b.birak >= 0 && b.birak < BIRAK_MS) b.birak += dt;
        });
        s.sicralar = s.sicralar.filter((x) => { x.t += dt; if (x.t >= SICRA_MS) { x.g.remove(); return false; } return true; });
        const hedefK = kameraHedef();
        s.kamera = s.azalt ? hedefK : s.kamera + (hedefK - s.kamera) * (1 - Math.exp(-dt / 140));
        ciz();
    }

    function suyaDustu() {
        const cur = s.balonlar[s.i];
        const sx = cur.x;
        const g = svgEl('g', { class: 'op-balon__sicra', transform: 'translate(' + sx + ' ' + SU_Y + ')' }, s.sicraKat);
        svgEl('ellipse', { class: 'op-balon__halka', rx: 18, ry: 5 }, g);
        svgEl('ellipse', { class: 'op-balon__halka', rx: 30, ry: 8 }, g);
        for (let k = -1; k <= 1; k++) svgEl('circle', { class: 'op-balon__damla', cx: k * 12, cy: -8 - (k === 0 ? 8 : 0), r: 3.5 }, g);
        s.sicralar.push({ g, t: 0, x: sx });
        s.can -= 1;
        s.hiz.canKaybi();
        if (window.AudioManager) window.AudioManager.play('whoosh');
        if (s.can <= 0) {
            cur.birak = 0;
            s.kok.classList.add('is-suda');
            hudYaz();
            bitir(false);
            return;
        }
        // Karakter sıradaki balona taşınır; o balonun harfi atlanır (basış sayılmaz)
        atla(s.i + 1, true);
        if (s.i >= s.metin.length) { bitir(true); return; }
        hedefYaz();
    }

    function balonKonum(b) {
        let y = b.y;
        if (!s.azalt && b.i !== s.i && b.birak < 0) y += Math.sin(s.zaman / 380 + b.faz) * 3;   // bekleyen balon hafif salınır
        if (b.birak >= 0 && !s.azalt) y -= (b.birak / 1000) * 70;
        return { x: b.x, y };
    }

    function karakterKonum() {
        const b = s.balonlar[s.i];
        if (s.bitti && !s.kazandi) return { x: b.x, y: SU_Y - 38 };
        const p = balonKonum(b);
        return { x: p.x, y: p.y + EL_Y };
    }

    function ciz() {
        const kam = s.kamera;
        s.dunya.setAttribute('transform', 'translate(' + (-kam).toFixed(2) + ' 0)');
        s.sicraKat.setAttribute('transform', 'translate(' + (-kam).toFixed(2) + ' 0)');
        s.bulutlar.setAttribute('transform', 'translate(' + (-kam * 0.15).toFixed(2) + ' 0)');
        s.tepeUzak.setAttribute('transform', 'translate(' + (-kam * 0.2).toFixed(2) + ' 0)');
        s.tepeYakin.setAttribute('transform', 'translate(' + (-kam * 0.4).toFixed(2) + ' 0)');
        s.dalgaYol.setAttribute('transform', 'translate(' + (-(kam % 40)).toFixed(2) + ' 0)');

        const sol = kam - 80, sag = kam + s.W + 80;
        for (const b of s.balonlar) {
            const gorunur = b.x >= sol && b.x <= sag && !(b.birak >= BIRAK_MS);
            if (gorunur !== b.gorunur) { b.gorunur = gorunur; b.g.style.display = gorunur ? '' : 'none'; }
            if (!gorunur) continue;
            const p = balonKonum(b);
            b.g.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ')');
            if (b.birak >= 0) b.g.style.opacity = String(Math.max(0, 1 - b.birak / BIRAK_MS));
            if (b.salla > 0 && !s.azalt) {
                const k = b.salla / SALLA_MS;
                b.ic.setAttribute('transform', 'rotate(' + (Math.sin((1 - k) * Math.PI * 4) * 9 * k).toFixed(2) + ')');
            } else b.ic.removeAttribute('transform');
            b.g.classList.toggle('is-yanlis', b.salla > 0);
        }

        // Karakter
        let p = karakterKonum();
        if (s.zip) {
            const t = Math.min(1, s.zip.t / s.zip.sure), e = easeOut(t);
            p = { x: s.zip.x0 + (p.x - s.zip.x0) * e, y: s.zip.y0 + (p.y - s.zip.y0) * e - 4 * s.zip.yay * t * (1 - t) };
        } else if (s.bitti && s.kazandi && !s.azalt) {
            p = { x: p.x, y: p.y - Math.abs(Math.sin(s.zaman / 220)) * 5 };
        } else if (s.bitti && !s.azalt) {
            p = { x: p.x, y: p.y + Math.sin(s.zaman / 500) * 2 };
        }
        s.pit.g.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ') scale(' + PIT_OLCEK + ')');

        for (const x of s.sicralar) {
            const k = x.t / SICRA_MS;
            const olc = s.azalt ? 1 : 0.7 + easeOut(k) * 0.8;
            x.g.setAttribute('transform', 'translate(' + x.x + ' ' + SU_Y + ') scale(' + olc.toFixed(3) + ')');
            x.g.style.opacity = String(Math.max(0, 1 - k));
        }
    }

    function durdur() {
        if (!s) return;
        const eski = s;
        s = null;
        if (eski.dongu) eski.dongu.durdur();
        if (eski.ro) eski.ro.disconnect();
        if (eski.kok.parentNode) eski.kok.parentNode.removeChild(eski.kok);
    }

    window.OnParmakOyunlari = window.OnParmakOyunlari || {};
    window.OnParmakOyunlari.balon = { baslat, durdur };
})();
