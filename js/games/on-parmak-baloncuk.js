/* ============================================
   On Parmak — mini oyun: Uçan Baloncuklar (kelime oyunu, çok hedef) → window.OnParmakOyunlari.baloncuk
   --------------------------------------------
   Spec §6.1–6.2: içinde kelime yazan 2–4 sabun baloncuğu çayırın arkasından yukarı süzülür. İLK HARF hedefi seçer
   (OnParmakOyunOrtak.hedefSec): o harfle başlayan, tepeye (kaçmaya) en yakın baloncuk kilitlenir; kilit kelime bitene
   dek sürer, kelime bitince baloncuk patlar. Tepeden kaçan her baloncuk bir can götürür (kelimesi de gider; kilitliyse
   kilit düşer). Bitiş: kelime listesi biter (canlı) ya da 3 baloncuk kaçar. Şiddet yok: sabun baloncuğu patlar.
   TypingClub "Floating Bubbles" yalnız işleyiş örneğidir; sahne ve baloncuklar kendi SVG çizimimiz (createElementNS).

   Yazım (denetçi kararı): BOŞLUK YAZILMAZ — her kelime kendi baloncuğunda; metin boşlukla ayrılmış kelime listesidir,
   baloncuklar metin sırasıyla doğar. Kilitliyken yanlış harf = hata (kilit sürer; başka baloncuğun ilk harfi de
   yanlıştır). Kilitsizken hiçbir baloncuğun ilk harfine uymayan harf = hata.

   Sözleşme (spec §6.1 + modül başlığı js/games/on-parmak.js; Balon/Canavar ile aynı):
     baslat(alan, { metin, el, tohum }, { tus(dogruMu), bitti({ canliBitti }), hedef?(ch|null) }) → tutamaç
       tutamaç = { bas(ch), devamTusu() → bool, duraklat(acik) } (OnParmakOyunOrtak.oyunKabugu verir).
       - keydown dinleyicisi KURULMAZ. tus() her sayılan basışta tam bir kez, bas() içinde EŞZAMANLI; son kelimenin
         patladığı basışta bitti() de eşzamanlı. Kaçışla bitiş döngüden gelir.
       - hedef(ch): kilit varsa kilitli kelimenin sıradaki harfi; kilit yoksa EN ACİL baloncuğun (tepeye en yakın)
         ilk harfi — ekran klavyesi parmağı oraya yönlendirir (o harf basılırsa hedefSec de aynı baloncuğu seçer);
         baloncuk yoksa ya da bitişte null. Değişince bildirilir (basışta ve döngüde: kaçış/doğuş en acili değiştirir).
     durdur(): kabuk durdurur (döngü + ResizeObserver, DOM boşalır); tekrar çağrılabilir.
   Doğuş: başta iki baloncuk (biri yarı yolda); sonra her DOGUS_P / hız saniyede bir (en çok 4 eşzamanlı, boş şerit
   varsa); eşzamanlı sayı 2'nin altına düşünce (patlama/kaçış) sıradaki kelime hemen doğar. Şerit seçimi rng(tohum):
   aynı tohum + aynı basışlar = aynı baloncuk sırası ve konumları (data-sira, data-serit).
   Zaman yalnız döngünün dt'si (setTimeout yok). prefers-reduced-motion: salınım, patlama damlaları ve kaçış pufu yok
   (patlama yerinde solar), temel hız düşük (uyarlanirHiz × 0,6 → doğuş aralığı da uzar).
   ============================================ */
(function () {
    'use strict';

    const O = window.OnParmakOyunOrtak;           // ortak çekirdek + sahne yardımcıları + oyun kabuğu (önce yüklenir)
    const { svgEl, htmlEl, easeOut } = O;
    const H = 360;              // sahne yüksekliği (SVG birimi); genişlik kabın en/boy oranından
    const CAYIR_Y = H - 34;     // çayırın üst kenarı (baloncuklar arkasından çıkar)
    const CAN = 3;
    const ESZ_MIN = 2, ESZ_MAX = 4;
    const KENAR = 14;           // şerit dizisinin yan payı
    const SERIT_IDEAL = 150;    // geniş sahnede şerit genişliği (en az 3 şerit)
    // Hız: p/sn (p = 0 çayırın altında, 1 = tepeden tamamen çıktı). Taban 0,045 → tırmanış ~22 sn
    // (azaltılmış harekette ×0,6 → ~37 sn). Hedef hızda (8 kelime/dk ≈ 6–7 sn/kelime) iki baloncuk rahat yetişir.
    const HIZ = { taban: 0.045, min: 0.028, max: 0.08, artis: 0.0015, azalis: 0.006 };
    const DOGUS_P = 0.3;        // zamanlı doğuş aralığı = 0,3 p yol (taban hızda ~6,7 sn)
    const SERBEST_P = 0.45;     // bu yüksekliğin altındaki baloncuk şeridini tutar (üst üste doğmasın)
    const BASLANGIC = [0.32, 0.12];
    const YEDEK_P = 0.1;        // eksilince doğan baloncuk: çayırın hemen arkasından
    const PATLA_MS = 280;
    const PUF_MS = 420;
    const YANLIS_MS = 260;
    const SAKLA_MS = 1400;      // kazanınca çayırdan yükselen küçük baloncuklar

    let s = null;   // etkin oyun durumu (tek örnek)

    // ── Geometri ──
    function seritler() {
        const n = Math.max(3, Math.floor((s.W - 2 * KENAR) / SERIT_IDEAL));
        return { n, en: (s.W - 2 * KENAR) / n };
    }
    function yaricap(kelime) {
        const { en } = seritler();
        return Math.min(34 + [...kelime].length * 8, en / 2 - 3);
    }
    function bx(b) {
        const { n, en } = seritler();
        const serit = Math.min(b.serit, n - 1);
        let x = KENAR + en * (serit + 0.5) + b.kay * (en / 2 - b.r);
        if (!s.azalt && !s.bitti) x += Math.sin(s.zaman / 1100 + b.faz) * 6;
        return x;
    }
    function by(p, r) { return (H + r) - p * (H + 2 * r); }

    // ── Çizim ──
    function bulutCiz(parent, x, y, k) {
        const g = svgEl('g', { class: 'op-baloncuk__bulut', transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + k.toFixed(2) + ')' }, parent);
        svgEl('path', { d: 'M-46 10 q-4 -20 18 -20 q6 -18 28 -12 q18 -14 34 4 q20 0 18 18 Z' }, g);
        return g;
    }

    function baloncukCiz(b) {
        const g = svgEl('g', { class: 'op-baloncuk__b' }, s.kat);
        g.dataset.kelime = b.kelime;
        g.dataset.sira = String(b.sira);
        g.dataset.serit = String(b.serit);
        const ic = svgEl('g', { class: 'op-baloncuk__ic' }, g);        // kilit ölçeği + yanlış sallantısı burada
        svgEl('circle', { class: 'op-baloncuk__halka', r: (b.r + 7).toFixed(1) }, ic);   // kilit: ikinci, kesikli halka
        svgEl('circle', { class: 'op-baloncuk__govde', r: b.r.toFixed(1) }, ic);
        svgEl('path', { class: 'op-baloncuk__yansima', d: yansimaYolu(b.r) }, ic);
        svgEl('circle', { class: 'op-baloncuk__isik', cx: (b.r * 0.42).toFixed(1), cy: (-b.r * 0.5).toFixed(1), r: (b.r * 0.1).toFixed(1) }, ic);
        const n = [...b.kelime].length;
        const boy = Math.min(30, (2 * b.r - 18) / (n * 0.6));
        const t = svgEl('text', { class: 'op-baloncuk__kelime', x: 0, y: (boy * 0.36).toFixed(1), 'font-size': boy.toFixed(1) }, ic);
        b.harfler = [...b.kelime].map((ch) => { const ts = svgEl('tspan', {}, t); ts.textContent = ch; return ts; });
        b.g = g;
        b.ic = ic;
        return g;
    }
    // Sol üstte ince ışık yayı (sabun baloncuğu parıltısı)
    function yansimaYolu(r) {
        const a0 = Math.PI * 1.08, a1 = Math.PI * 1.42, k = r * 0.76;
        const p = (a) => (Math.cos(a) * k).toFixed(1) + ' ' + (Math.sin(a) * k).toFixed(1);
        return 'M' + p(a0) + ' A' + k.toFixed(1) + ' ' + k.toFixed(1) + ' 0 0 1 ' + p(a1);
    }

    function baslat(alan, ayar, cbs) {
        durdur();
        const kelimeler = String(ayar.metin || '').split(' ').filter(Boolean);
        const rnd = O.rng((ayar.tohum >>> 0) || 1);
        const azalt = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const kok = htmlEl('div', 'op-baloncuk');
        kok.dataset.tohum = String(ayar.tohum);
        const svg = svgEl('svg', { class: 'op-baloncuk__svg', viewBox: '0 0 800 ' + H, role: 'img', focusable: 'false',
            'aria-label': 'Uçan Baloncuklar: baloncuğun ilk harfine bas, kelimeyi yaz, baloncuğu patlat' });
        svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
        kok.appendChild(svg);

        // Arka plan: bulutlar (tohumla), baloncuk katmanı, ÖNDE çayır (baloncuklar arkasından doğar), efektler en önde
        const bulutlar = svgEl('g', { class: 'op-baloncuk__bulutlar' }, svg);
        for (let x = 40 + rnd() * 80; x < 1600; x += 190 + rnd() * 220) bulutCiz(bulutlar, x, 70 + rnd() * 150, 0.7 + rnd() * 0.6);
        const kat = svgEl('g', { class: 'op-baloncuk__kat' }, svg);
        svgEl('path', { class: 'op-baloncuk__cayir op-baloncuk__cayir--arka', d: O.tepeYolu(rnd, { x0: -40, son: 1700, adim: 140, taban: CAYIR_Y + 6, genlik: 16, alt: H }) }, svg);
        svgEl('path', { class: 'op-baloncuk__cayir', d: O.tepeYolu(rnd, { x0: -90, son: 1700, adim: 110, taban: CAYIR_Y + 18, genlik: 12, alt: H }) }, svg);
        const efekt = svgEl('g', { class: 'op-baloncuk__efektler' }, svg);

        // HUD: canlar solda, patlatılan sayısı sağda
        const hud = htmlEl('div', 'op-baloncuk__hud');
        const canlar = O.canlarHud(CAN);
        const sayac = htmlEl('div', 'op-baloncuk__ilerleme');
        sayac.setAttribute('role', 'img');
        const ik = svgEl('svg', { viewBox: '0 0 24 24', class: 'op-baloncuk__ilerleme-ik', 'aria-hidden': 'true', focusable: 'false' }, sayac);
        svgEl('circle', { cx: 12, cy: 12, r: 9 }, ik);
        svgEl('path', { d: 'M7.5 9.5 a5 5 0 0 1 4 -3.5' }, ik);
        const sayi = htmlEl('span', 'op-baloncuk__ilerleme-sayi');
        sayac.appendChild(sayi);
        hud.append(canlar.el, sayac);
        kok.appendChild(hud);
        const devam = O.devamKatmani();
        kok.appendChild(devam);
        alan.appendChild(kok);

        s = { kok, svg, kat, efekt, cbs, azalt, rnd, kelimeler, sonraki: 0, aktif: [], kilit: null, can: CAN, patlayan: 0,
            kacan: 0, bitti: false, kazandi: false, zaman: 0, W: 800, dogus: 0, efektler: [], yanlis: 0,
            hedefBildir: O.hedefBildirici(kok, cbs.hedef), canlar, sayac, sayi, hiz: O.uyarlanirHiz(HIZ), kabuk: null };
        const benim = s;
        s.kabuk = O.oyunKabugu({ kok, svg, H, devam, adim, olcu: (W) => { benim.W = W; if (benim.aktif.length) ciz(); } });
        for (const p of BASLANGIC) if (s.sonraki < kelimeler.length) dogur(p, true);
        hudYaz();
        hedefYaz();
        ciz();
        return s.kabuk.baslat(bas);
    }

    // ── Doğuş: metin sırasıyla; şerit rng ile, alçaktaki baloncukların şeritleri dolu ──
    function dogur(p0, zorunlu) {
        const { n } = seritler();
        const dolu = new Set(s.aktif.filter((b) => b.p < SERBEST_P).map((b) => Math.min(b.serit, n - 1)));
        const bos = [];
        for (let i = 0; i < n; i++) if (!dolu.has(i)) bos.push(i);
        let serit;
        if (bos.length) serit = bos[Math.floor(s.rnd() * bos.length)];
        else if (zorunlu) {
            // Hepsi dolu (dar sahne): en alçaktaki baloncuğu en yüksek olan şerit
            const alt = new Array(n).fill(2);
            for (const b of s.aktif) { const i = Math.min(b.serit, n - 1); alt[i] = Math.min(alt[i], b.p); }
            serit = alt.indexOf(Math.max(...alt));
        } else return false;
        const kelime = s.kelimeler[s.sonraki];
        const b = { kelime, sira: s.sonraki, serit, p: p0, ilerleme: 0, tehlike: p0, kay: (s.rnd() - 0.5) * 0.6,
            faz: s.rnd() * 6.3, r: 0, g: null, ic: null, harfler: [], yanlis: 0 };
        b.r = yaricap(kelime);
        s.sonraki += 1;
        s.aktif.push(b);
        baloncukCiz(b);
        harfDurum(b);
        return true;
    }
    function eksikseDogur() {
        while (!s.bitti && s.aktif.length < ESZ_MIN && s.sonraki < s.kelimeler.length) dogur(YEDEK_P, true);
    }

    // ── Durum yazımı ──
    function harfDurum(b) {
        b.harfler.forEach((ts, i) => {
            ts.setAttribute('class', i < b.ilerleme ? 'is-yazildi' : (b === s.kilit && i === b.ilerleme ? 'is-sira' + (b.yanlis > 0 ? ' is-yanlis' : '') : ''));
        });
        b.g.classList.toggle('is-kilitli', b === s.kilit);
    }
    function hudYaz() {
        s.kok.dataset.can = String(s.can);
        s.kok.dataset.patlayan = String(s.patlayan);
        s.kok.dataset.kilit = s.kilit ? String(s.kilit.sira) : '';
        s.kok.classList.toggle('is-kilitli', !!s.kilit);
        s.canlar.guncelle(s.can);
        s.sayi.textContent = s.patlayan + '/' + s.kelimeler.length;
        s.sayac.setAttribute('aria-label', 'Patlatılan baloncuk: ' + s.patlayan + ' / ' + s.kelimeler.length);
    }
    // Klavye vurgusu: kilitli kelimenin sıradaki harfi ya da en acil baloncuğun ilk harfi (ortak, tehlike = p)
    function hedefYaz() { s.hedefBildir(s.bitti ? null : O.beklenenHarf(s.aktif, s.kilit)); }

    // ── Girdi ──
    function bas(ch) {
        if (s.bitti) return;
        if (s.kilit) {
            const b = s.kilit;
            const harfler = [...b.kelime];
            if (ch !== harfler[b.ilerleme]) {
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
        const h = O.hedefSec(s.aktif, ch, null);
        if (!h) { s.cbs.tus(false); return; }
        s.cbs.tus(true);
        if (!s) return;
        s.kilit = h;
        ilerle(h);
    }
    function ilerle(b) {
        b.ilerleme += 1;
        b.yanlis = 0;
        if (b.ilerleme >= [...b.kelime].length) { patla(b); return; }
        harfDurum(b);
        hudYaz();
        hedefYaz();
    }

    // Kelime bitti: baloncuk patlar (halka genişleyip söner + damlalar); sayılır, eksikse yenisi doğar
    function patla(b) {
        s.kilit = null;
        s.aktif.splice(s.aktif.indexOf(b), 1);
        s.patlayan += 1;
        s.hiz.basari();
        const x = bx(b), y = by(b.p, b.r);
        b.g.remove();
        const g = svgEl('g', { class: 'op-baloncuk__pop', transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')' }, s.efekt);
        const halka = svgEl('circle', { class: 'op-baloncuk__pop-halka', r: b.r.toFixed(1) }, g);
        const damla = [];
        if (!s.azalt) {
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + 0.3;
                damla.push({ c: svgEl('circle', { class: 'op-baloncuk__damla', r: i % 2 ? 3 : 4.5 }, g), dx: Math.cos(a), dy: Math.sin(a) });
            }
        }
        s.efektler.push({ tur: 'pop', g, halka, damla, r: b.r, t: 0, sure: PATLA_MS });
        if (window.AudioManager) window.AudioManager.play('pop');
        hudYaz();
        if (bittiMi()) { bitir(true); return; }
        eksikseDogur();
        hedefYaz();
    }
    function bittiMi() { return s.sonraki >= s.kelimeler.length && s.aktif.length === 0; }

    function bitir(canli) {
        s.bitti = true;
        s.kazandi = canli;
        if (s.kilit) { const k = s.kilit; s.kilit = null; harfDurum(k); }
        s.kok.dataset.bitti = canli ? 'canli' : 'canlar';
        hudYaz();
        hedefYaz();
        if (canli && !s.azalt) {
            // Kazanınca çayırdan küçük baloncuk kümesi yükselir (tek kutlama anı)
            const g = svgEl('g', { class: 'op-baloncuk__kutlama' }, s.efekt);
            const parca = [];
            for (let i = 0; i < 9; i++) {
                const x = s.W * (0.15 + 0.7 * (i / 8)) + (s.rnd() - 0.5) * 30;
                parca.push({ c: svgEl('circle', { class: 'op-baloncuk__mini', r: (5 + s.rnd() * 7).toFixed(1), cx: x.toFixed(1), cy: CAYIR_Y }, g),
                    x, gec: i * 70 + s.rnd() * 90 });
            }
            s.efektler.push({ tur: 'kutlama', g, parca, t: 0, sure: SAKLA_MS + 700 });
        }
        s.cbs.bitti({ canliBitti: canli });
    }

    // ── Döngü ──
    function adim(dt) {
        s.zaman += dt;
        if (!s.bitti) {
            const v = s.hiz.deger() * dt / 1000;
            const kacanlar = [];
            for (const b of s.aktif) {
                b.p += v;
                b.tehlike = b.p;
                if (b.p >= 1) kacanlar.push(b);
            }
            for (const b of kacanlar) {
                kac(b);
                if (!s || s.bitti) break;
            }
            if (!s) return;              // modül bitti() içinde durdurduysa
            if (!s.bitti) {
                s.dogus += v;
                if (s.dogus >= DOGUS_P && s.sonraki < s.kelimeler.length) {
                    if (s.aktif.length >= ESZ_MAX) s.dogus = DOGUS_P;          // yer açılınca hemen
                    else if (dogur(0, false)) s.dogus = 0;
                }
                hedefYaz();
            }
        }
        for (const b of s.aktif) {
            if (b.yanlis > 0) { b.yanlis = Math.max(0, b.yanlis - dt); if (b.yanlis === 0) harfDurum(b); }
        }
        s.efektler = s.efektler.filter((e) => { e.t += dt; if (e.t >= e.sure) { e.g.remove(); return false; } return true; });
        ciz();
    }

    // Tepeden kaçtı: bir can gider (kelimesi de); kilitliyse kilit düşer
    function kac(b) {
        s.aktif.splice(s.aktif.indexOf(b), 1);
        if (s.kilit === b) s.kilit = null;
        const x = bx(b);
        b.g.remove();
        s.can -= 1;
        s.kacan += 1;
        s.hiz.canKaybi();
        if (window.AudioManager) window.AudioManager.play('whoosh');
        const g = svgEl('g', { class: 'op-baloncuk__puf', transform: 'translate(' + x.toFixed(1) + ' 6)' }, s.efekt);
        const parca = [];
        for (let i = 0; i < (s.azalt ? 1 : 3); i++) parca.push(svgEl('circle', { class: 'op-baloncuk__puf-c', cx: (i - 1) * 14, cy: 0, r: i === 1 ? 10 : 7 }, g));
        s.efektler.push({ tur: 'puf', g, parca, t: 0, sure: PUF_MS });
        hudYaz();
        if (s.can <= 0) { bitir(false); return; }
        if (bittiMi()) { bitir(true); return; }
        eksikseDogur();
    }

    function ciz() {
        for (const b of s.aktif) {
            const x = bx(b), y = by(b.p, b.r);
            b.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
            b.g.dataset.p = b.p.toFixed(3);
            let tf = b === s.kilit ? 'scale(1.08)' : '';
            if (b.yanlis > 0 && !s.azalt) {
                const k = b.yanlis / YANLIS_MS;
                tf = 'translate(' + (Math.sin((1 - k) * Math.PI * 4) * 5 * k).toFixed(2) + ' 0) ' + tf;
            }
            b.ic.setAttribute('transform', tf);
        }
        for (const e of s.efektler) {
            const k = Math.min(1, e.t / e.sure), u = easeOut(k);
            if (e.tur === 'pop') {
                if (s.azalt) { e.g.style.opacity = String(1 - k); continue; }
                e.halka.setAttribute('r', (e.r * (1 + 0.35 * u)).toFixed(1));
                e.halka.style.opacity = String(1 - u);
                for (const d of e.damla) {
                    d.c.setAttribute('cx', (d.dx * (e.r + 22 * u)).toFixed(1));
                    d.c.setAttribute('cy', (d.dy * (e.r + 22 * u) + 10 * k * k).toFixed(1));
                    d.c.style.opacity = String(1 - k);
                }
            } else if (e.tur === 'puf') {
                e.g.style.opacity = String(1 - k);
                if (!s.azalt) e.parca.forEach((c, i) => c.setAttribute('cy', (-14 * u - (i === 1 ? 4 : 0) * u).toFixed(1)));
            } else {
                for (const p of e.parca) {
                    const kk = Math.max(0, Math.min(1, (e.t - p.gec) / SAKLA_MS));
                    p.c.setAttribute('cy', (CAYIR_Y - (CAYIR_Y + 20) * easeOut(kk)).toFixed(1));
                    p.c.setAttribute('cx', (p.x + Math.sin(e.t / 260 + p.gec) * 6).toFixed(1));
                    p.c.style.opacity = String(kk <= 0 ? 0 : 1 - kk * kk);
                }
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
    window.OnParmakOyunlari.baloncuk = { baslat, durdur };
})();
