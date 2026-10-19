/* ============================================
   On Parmak — ekran: Türkçe Q klavye + iki el, TEK SVG (saf DOM; oyun modülüne ve motora dokunmaz)
   --------------------------------------------
   Neden tek SVG (plan sapma 4): klavye sabit ızgarada çizilir, eller AYNI koordinat sisteminde → parmak uçları her
   ölçekte orta sıra tuşlarının üstünde kalır (A S D F · J K L Ş, başparmaklar Boşlukta). Kendi çizimimiz; TypingClub
   yalnız işleyiş örneğidir (spec §1.1).
   Yükleme: js/games/klavye-dizilim.js'ten SONRA (window.KlavyeDizilim). Yayımlar: window.OnParmakEkran.

   API:
     OnParmakEkran.olustur(kap, { el = true, klavye = true, basinca }) → {
       vurgula(ch)        sıradaki karakter: tuşu + parmak(lar)ı + gerekiyorsa karşı Shift `is-hedef`; null/'' → temizle
       bas(ch, dogruMu)   basılan karakterin tuşu kısa süre `is-down` (doğru) ya da `is-yanlis` (yanlış); Shift'liyse Shift de
       goster({ el, klavye })  el / klavye katmanını göster-gizle; ikisi de kapalıysa ekran yer kaplamaz (hidden)
       yokEt()            zamanlayıcılar + dinleyici kaldırılır, ekran kaptan çıkarılır
     }
     Dokunma: tuş `<g data-code>` pointerdown → basinca(tuşun Shift'siz karakteri) — modülün press() yolu.
     Pasif `< >` (IntlBackslash), Shift ve süs tuşları (Tab, Caps, Enter, …) tepkisiz.

   Katmanlar (alttan üste): tepsi → tuşlar (g[data-code], tıklanır) → eller (g.op-eller) → vurgular (g.op-vurgular:
   her tuşun hedef/basış kopyası, yalnız durum sınıfı varken görünür) → etiketler (g.op-etiketler). Üst üç katman
   pointer-events: none. Vurgu ve etiket elin ÜSTÜNDE: alt sıra hedefi ve parmak altındaki harf de görünür.
   Durum sınıfları tuşa, vurgusuna ve etiketine birlikte yazılır (basılı tuşun yazısı da iner). Stil: css/on-parmak.css.
   Güvenlik: SVG createElementNS ile, metin textContent ile; veriyle innerHTML yok.
   ============================================ */

(function () {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';

    // ── Izgara (SVG birimi) ──
    const U = 60;              // tuş adımı
    const BOSLUK_ARA = 6;      // tuşlar arası boşluk
    const P = 12;              // tepsi iç boşluğu
    const GEN = P * 2 + U * 15;            // 924: 15 tuş birimi genişlik
    const TEPSI_YUK = P * 2 + U * 5;       // 324: 5 sıra
    const YUK = 400;                       // eller tepsinin altından girer (bilekler kadrajda kesilir)
    const KAPAK_YUK = 50;                  // tuş kapağı; altında 4 birimlik taban görünür (derinlik)

    // Sıra başlangıçları (tuş birimi) — ISO dizilim: Tab 1,5 · Caps 1,75 · sol Shift 1,25 (+ `< >`)
    const SIRA_BASI = [0, 1.5, 1.75, 1.25];
    // Süs tuşları: dizilimde yok, yalnız klavyenin biçimi için (etiketsiz, tepkisiz)
    const SUS = [
        { sira: 0, o: 13, w: 2 },                 // Backspace
        { sira: 1, o: 0, w: 1.5 },                // Tab
        { sira: 2, o: 0, w: 1.75 },               // Caps Lock
        { sira: 4, o: 0, w: 1.5 }, { sira: 4, o: 1.5, w: 1 }, { sira: 4, o: 2.5, w: 1 },
        { sira: 4, o: 10, w: 1 }, { sira: 4, o: 11, w: 1 }, { sira: 4, o: 12, w: 1.5 }, { sira: 4, o: 13.5, w: 1.5 },
    ];
    const BOSLUK_TUSU = { sira: 4, o: 3.5, w: 6.5 };
    const SHIFT_YERI = { ShiftLeft: { sira: 3, o: 0, w: 1.25 }, ShiftRight: { sira: 3, o: 12.25, w: 2.75 } };

    // ── Eller ── Sol el; sağ el F–J ortasına (x = 417) göre aynası. uc = parmak ucu ortası, kok = avuç içinde kalan dip.
    const AYNA_X = 834;
    const SOL_PARMAKLAR = [
        { id: 'sol-serce', uc: [147, 180], kok: [186, 332], w: 28 },
        { id: 'sol-yuzuk', uc: [207, 175], kok: [224, 330], w: 32 },
        { id: 'sol-orta', uc: [267, 173], kok: [264, 328], w: 34 },
        { id: 'sol-isaret', uc: [327, 177], kok: [302, 332], w: 34 },
        { id: 'basparmak', uc: [374, 288], kok: [314, 364], w: 36 },
    ];
    const SOL_AVUC = 'M164 314C196 292 294 290 328 310C346 334 348 376 334 408C328 422 326 432 326 440L198 440C192 418 172 384 166 350C163 336 162 324 164 314Z';

    const PARMAK_ADI = {
        'sol-serce': 'sol serçe', 'sol-yuzuk': 'sol yüzük', 'sol-orta': 'sol orta', 'sol-isaret': 'sol işaret',
        'sag-isaret': 'sağ işaret', 'sag-orta': 'sağ orta', 'sag-yuzuk': 'sağ yüzük', 'sag-serce': 'sağ serçe',
        basparmak: 'başparmak',
    };
    const SURE_DOGRU = 160;     // basılı görünüm (ms)
    const SURE_YANLIS = 420;    // yanlış uyarısı (ms) — sallanma (200 ms) + okunacak kadar kalış

    function el(ad, oz, ebeveyn) {
        const d = document.createElementNS(NS, ad);
        Object.keys(oz || {}).forEach((k) => d.setAttribute(k, String(oz[k])));
        if (ebeveyn) ebeveyn.appendChild(d);
        return d;
    }

    // Tuş birimi → kapak dikdörtgeni
    function kutu(yer) {
        return {
            x: P + yer.o * U + BOSLUK_ARA / 2,
            y: P + yer.sira * U + BOSLUK_ARA / 2,
            w: yer.w * U - BOSLUK_ARA,
            h: U - BOSLUK_ARA,
        };
    }

    // Parmak: ucu yarım daire, dibe doğru hafif genişleyen kapsül (dip avucun altında kalır)
    function parmakYolu(uc, kok, w) {
        const [tx, ty] = uc;
        const [bx, by] = kok;
        const uz = Math.hypot(tx - bx, ty - by);
        const dx = (tx - bx) / uz, dy = (ty - by) / uz;      // dipten uca yön
        const nx = -dy, ny = dx;                             // yön dikmesi
        const r = w / 2, rd = r * 1.22, k = 0.5523 * r;      // k: çeyrek daire Bezier katsayısı
        const n = (v) => Math.round(v * 10) / 10;
        const p = (x, y) => `${n(x)} ${n(y)}`;
        return [
            `M${p(bx + nx * rd, by + ny * rd)}`,
            `L${p(tx + nx * r, ty + ny * r)}`,
            `C${p(tx + nx * r + dx * k, ty + ny * r + dy * k)} ${p(tx + dx * r + nx * k, ty + dy * r + ny * k)} ${p(tx + dx * r, ty + dy * r)}`,
            `C${p(tx + dx * r - nx * k, ty + dy * r - ny * k)} ${p(tx - nx * r + dx * k, ty - ny * r + dy * k)} ${p(tx - nx * r, ty - ny * r)}`,
            `L${p(bx - nx * rd, by - ny * rd)}Z`,
        ].join('');
    }

    function aynaYol(d) {
        // Yalnız mutlak M/L/C/Z komutları: sayı çiftlerinde x → AYNA_X - x
        return d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (_, x, y) => `${Math.round((AYNA_X - Number(x)) * 10) / 10} ${y}`);
    }

    function olustur(kap, opts) {
        const D = window.KlavyeDizilim;
        const ayar = opts || {};
        const basinca = typeof ayar.basinca === 'function' ? ayar.basinca : null;

        const sarmal = document.createElement('div');
        sarmal.className = 'op-ekran';
        const svg = el('svg', {
            viewBox: `0 0 ${GEN} ${YUK}`, class: 'op-ekran__svg', role: 'img', focusable: 'false',
            'aria-label': 'Türkçe Q klavye ve parmak yerleşimi',
        }, sarmal);

        el('rect', { class: 'op-tepsi', x: 0, y: 0, width: GEN, height: TEPSI_YUK, rx: 20 }, svg);
        const tusKatmani = el('g', { class: 'op-tuslar' }, svg);
        const elKatmani = el('g', { class: 'op-eller', 'pointer-events': 'none', 'aria-hidden': 'true' }, svg);
        // Vurgu katmanı ELLERİN ÜSTÜNDE: alt sıra (z … ç .) hedefi/basışı parmak altında kalmasın; etiketler yine en üstte
        const vurguKatmani = el('g', { class: 'op-vurgular', 'pointer-events': 'none', 'aria-hidden': 'true' }, svg);
        const etiketKatmani = el('g', { class: 'op-etiketler', 'pointer-events': 'none', 'aria-hidden': 'true' }, svg);

        const tuslar = new Map();      // code → { g, vurgu, etiket }
        const karakterOfKod = new Map(); // code → dokunmada üretilen karakter (Shift'siz)

        function kapakCiz(g, b) {
            el('rect', { class: 'op-tus__taban', x: b.x, y: b.y + 4, width: b.w, height: KAPAK_YUK, rx: 9 }, g);
            el('rect', { class: 'op-tus__kapak', x: b.x, y: b.y, width: b.w, height: KAPAK_YUK, rx: 9 }, g);
        }

        function yazi(etiket, metin, x, y, sinif) {
            const t = el('text', { x, y, class: sinif, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, etiket);
            t.textContent = metin;
        }

        function tusEkle(code, yer, secenek) {
            const b = kutu(yer);
            const g = el('g', { class: 'op-tus' + (secenek.pasif ? ' is-pasif' : ''), 'data-code': code }, tusKatmani);
            kapakCiz(g, b);
            const vurgu = el('g', { class: 'op-vurgu', 'data-vurgu': code }, vurguKatmani);
            el('rect', { class: 'op-vurgu__hale', x: b.x - 4, y: b.y - 4, width: b.w + 8, height: KAPAK_YUK + 8, rx: 12 }, vurgu);
            el('rect', { class: 'op-vurgu__kapak', x: b.x, y: b.y, width: b.w, height: KAPAK_YUK, rx: 9 }, vurgu);
            const etiket = el('g', { class: 'op-etiket' + (secenek.pasif ? ' is-pasif' : ''), 'data-etiket': code }, etiketKatmani);
            const cx = b.x + b.w / 2, cy = b.y + KAPAK_YUK / 2;
            if (secenek.yazi) yazi(etiket, secenek.yazi, cx, cy, 'op-etiket__kucuk');
            else if (secenek.tek) yazi(etiket, secenek.tek, cx, cy, 'op-etiket__harf');
            else if (secenek.alt !== undefined) {
                yazi(etiket, secenek.ust, cx, cy - 11, 'op-etiket__ust');
                yazi(etiket, secenek.alt, cx, cy + 10, 'op-etiket__alt');
            }
            if (code === 'KeyF' || code === 'KeyJ') {   // orta sıra kabartısı: gerçek klavyedeki gibi
                el('line', { class: 'op-etiket__kabarti', x1: cx - 7, x2: cx + 7, y1: cy + 18, y2: cy + 18 }, etiket);
            }
            tuslar.set(code, { g, vurgu, etiket });
        }

        // Süs tuşları
        SUS.forEach((yer) => {
            const b = kutu(yer);
            el('rect', { class: 'op-tus--sus', x: b.x, y: b.y, width: b.w, height: KAPAK_YUK + 4, rx: 9 }, tusKatmani);
        });
        // ISO Enter: iki sıra boyunca L biçimi (süs)
        {
            const ust = kutu({ sira: 1, o: 13.5, w: 1.5 });
            const alt = kutu({ sira: 2, o: 13.75, w: 1.25 });
            const altY = alt.y + KAPAK_YUK + 4;
            el('path', {
                class: 'op-tus--sus',
                d: `M${ust.x} ${ust.y}H${ust.x + ust.w}V${altY}H${alt.x}V${ust.y + KAPAK_YUK + 4}H${ust.x}Z`,
                'stroke-linejoin': 'round',
            }, tusKatmani);
        }

        // Dizilim tuşları
        D.SATIRLAR.forEach((satir, sira) => {
            satir.forEach((t, i) => {
                const harf = t.alt !== t.ust && t.alt.toLocaleUpperCase('tr-TR') === t.ust;
                tusEkle(t.code, { sira, o: SIRA_BASI[sira] + i, w: 1 },
                    harf ? { tek: t.alt, pasif: t.pasif } : { alt: t.alt, ust: t.ust, pasif: t.pasif });
                if (!t.pasif) karakterOfKod.set(t.code, t.alt);
            });
        });
        tusEkle('ShiftLeft', SHIFT_YERI.ShiftLeft, { yazi: 'Shift' });
        tusEkle('ShiftRight', SHIFT_YERI.ShiftRight, { yazi: 'Shift' });
        tusEkle(D.BOSLUK.code, BOSLUK_TUSU, { yazi: 'boşluk' });
        karakterOfKod.set(D.BOSLUK.code, D.BOSLUK.alt);
        // Boşluk yazısı tuşun alt yarısına, iki başparmağın arasına
        const bosEtiket = tuslar.get(D.BOSLUK.code).etiket.querySelector('text');
        bosEtiket.setAttribute('y', String(Number(bosEtiket.getAttribute('y')) + 10));

        // Eller: her parmak ayrı yol; avuç parmak diplerini örter (avuç ÜSTTE çizilir)
        const parmaklar = new Map();   // id → [path, …] (başparmak iki el)
        [['sol', (d) => d], ['sag', aynaYol]].forEach(([yan, cevir]) => {
            const g = el('g', { class: `op-el op-el--${yan}` }, elKatmani);
            SOL_PARMAKLAR.forEach((f) => {
                const id = f.id === 'basparmak' ? 'basparmak' : f.id.replace(/^sol-/, `${yan}-`);
                const yol = el('path', { class: 'op-parmak', 'data-parmak': id, 'data-el': yan, d: cevir(parmakYolu(f.uc, f.kok, f.w)) }, g);
                if (!parmaklar.has(id)) parmaklar.set(id, []);
                parmaklar.get(id).push(yol);
            });
            el('path', { class: 'op-avuc', d: cevir(SOL_AVUC) }, g);
        });

        kap.appendChild(sarmal);

        // ── Durum ──
        let hedefler = [];             // is-hedef taşıyan düğümler
        const sondur = new Map();      // `${code}|${sinif}` → zamanlayıcı

        function sinifla(code, sinif, acik) {
            const t = tuslar.get(code);
            if (!t) return;
            t.g.classList.toggle(sinif, acik);
            t.vurgu.classList.toggle(sinif, acik);
            t.etiket.classList.toggle(sinif, acik);
        }

        function vurgula(ch) {
            hedefler.forEach((d) => d.classList.remove('is-hedef'));
            hedefler = [];
            const konum = ch ? D.tusOf(ch) : null;
            if (!konum) {
                svg.setAttribute('aria-label', 'Türkçe Q klavye ve parmak yerleşimi');
                return;
            }
            const kodlar = [konum.code];
            const shift = D.shiftTusuOf(ch);
            if (shift) kodlar.push(shift);
            kodlar.forEach((code) => {
                const t = tuslar.get(code);
                if (t) hedefler.push(t.g, t.vurgu, t.etiket);
            });
            const ids = D.parmaklarOf(ch);
            ids.forEach((id) => (parmaklar.get(id) || []).forEach((p) => hedefler.push(p)));
            hedefler.forEach((d) => d.classList.add('is-hedef'));
            const ad = ch === ' ' ? 'boşluk' : ch;
            svg.setAttribute('aria-label', `Sıradaki tuş: ${ad}${shift ? ' (Shift ile)' : ''} — ${ids.map((id) => PARMAK_ADI[id]).join(' ve ')} parmak`);
        }

        function bas(ch, dogruMu) {
            const konum = ch ? D.tusOf(ch) : null;
            if (!konum) return;
            const sinif = dogruMu ? 'is-down' : 'is-yanlis';
            const kodlar = [konum.code];
            const shift = D.shiftTusuOf(ch);
            if (shift) kodlar.push(shift);
            kodlar.forEach((code) => {
                const anahtar = `${code}|${sinif}`;
                clearTimeout(sondur.get(anahtar));
                // Animasyonu yeniden başlat (aynı tuşa art arda basış): sınıfı kaldır, düzeni oku, yeniden ekle
                sinifla(code, sinif, false);
                void svg.getBoundingClientRect();
                sinifla(code, sinif, true);
                sondur.set(anahtar, setTimeout(() => {
                    sondur.delete(anahtar);
                    sinifla(code, sinif, false);
                }, dogruMu ? SURE_DOGRU : SURE_YANLIS));
            });
        }

        function goster(g) {
            const elAcik = !g || g.el !== false;
            const klavyeAcik = !g || g.klavye !== false;
            sarmal.classList.toggle('op-ekran--elsiz', !elAcik);
            sarmal.classList.toggle('op-ekran--klavyesiz', !klavyeAcik);
            sarmal.hidden = !elAcik && !klavyeAcik;
        }

        function dokun(e) {
            if (e.button !== 0 || e.isPrimary === false) return;   // yalnız birincil düğme / ilk dokunuş
            const g = e.target && e.target.closest ? e.target.closest('[data-code]') : null;
            if (!g || !svg.contains(g)) return;
            const ch = karakterOfKod.get(g.getAttribute('data-code'));
            if (ch === undefined) return;            // pasif `< >`, Shift
            e.preventDefault();                       // odak oyun alanında kalsın, metin seçilmesin
            if (basinca) basinca(ch);
        }
        svg.addEventListener('pointerdown', dokun);

        function yokEt() {
            sondur.forEach((z) => clearTimeout(z));
            sondur.clear();
            svg.removeEventListener('pointerdown', dokun);
            hedefler = [];
            sarmal.remove();
        }

        goster({ el: ayar.el, klavye: ayar.klavye });
        return { vurgula, bas, goster, yokEt };
    }

    window.OnParmakEkran = Object.freeze({ olustur });
})();
