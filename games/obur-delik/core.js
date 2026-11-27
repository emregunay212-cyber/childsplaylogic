/* global module */
/* Obur Delik — SAF oyun çekirdeği (DOM, Date, Math.random YOK).
   Aynı kod tarayıcıda (game.js) ve Node testinde (tests/obur-delik-bot.mjs) çalışır.
   Dünya birimi ≈ piksel (yakınlaştırma 1'de). Delik yalnız kendinden küçük nesneleri yutar, yuttukça büyür.
   Rakip delikler aynı kurallarla yer; delikler birbirini YUTMAZ (çocuk sitesi: kimse kimseye zarar vermez).
   Yetenekler: ATIL = kısa hızlanma (yalnız oyuncu); ACI BİBER = puanının bir kısmını verip ileri fırlatır (rakipler de seyrek atar),
   değen rakip "hapşırır": bir an durur, puanının bir kısmını eşya olarak etrafa püskürtür (eşyalar yeniden yutulabilir). */
(function (root) {
    'use strict';

    // ── Tohumlu rastgele (mulberry32) ──
    function rng(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ── Nesne türleri: r = taban yarıçapı (yutma ölçüsü), h = yükseklik (çizim), p = puan ──
    const TIPLER = {
        cicek:    { r: 5,   h: 4,   p: 1 },
        koni:     { r: 6,   h: 12,  p: 1 },
        top:      { r: 6,   h: 12,  p: 1 },
        yangin:   { r: 6,   h: 12,  p: 1 },
        kutu:     { r: 8,   h: 10,  p: 1 },
        cop:      { r: 8,   h: 15,  p: 2 },
        posta:    { r: 8,   h: 18,  p: 2 },
        lamba:    { r: 9,   h: 44,  p: 3 },
        cali:     { r: 12,  h: 14,  p: 3 },
        bank:     { r: 14,  h: 10,  p: 3 },
        varil:    { r: 11,  h: 16,  p: 3 },
        agac:     { r: 20,  h: 48,  p: 8 },
        araba:    { r: 22,  h: 16,  p: 8 },
        durak:    { r: 22,  h: 26,  p: 8 },
        bufe:     { r: 26,  h: 28,  p: 12 },
        konteyner:{ r: 32,  h: 26,  p: 16 },
        fiskiye:  { r: 40,  h: 18,  p: 20 },
        kamyon:   { r: 38,  h: 26,  p: 20 },
        otobus:   { r: 44,  h: 24,  p: 24 },
        ev:       { r: 46,  h: 44,  p: 28 },
        dukkan:   { r: 56,  h: 52,  p: 36 },
        vinc:     { r: 62,  h: 140, p: 45 },
        apartman: { r: 76,  h: 120, p: 60 },
        kule:     { r: 98,  h: 210, p: 110 },
        gokdelen: { r: 128, h: 320, p: 180 }
    };

    // Delik büyüklüğü: r = R0 + K·√puan. Yutma şartı: nesne.r < delik.r · YUTMA_ORAN.
    const R0 = 16, K = 2.6, YUTMA_ORAN = 0.88;

    // Yetenek ayarları
    const ATIL = { sure: 1.2, bekle: 5, carpan: 1.6 };
    const BIBER = { r: 14, omur: 14, inis: 0.35, bekle: 6, enAzPuan: 30, maliyet: 0.10, enFazla: 2,
        hapsuOran: 0.25, hapsuOranOyuncu: 0.18, hapsuSure: 0.9, sacilanEnFazla: 14, farkEtme: 0.5,
        nisanAci: 0.6, nisanMenzil: 650, nisanYardim: 0.5, botIlk: 12, botAra: 14, botAraRast: 10, botAtma: 0.75, botMenzil: 480 };
    // Hapşırınca püsküren eşya türleri (game.js bunlar için yedek örnek ayırır)
    const SACILAN = ['top', 'kutu', 'varil', 'araba', 'konteyner', 'otobus'];
    const DUSME_SN = 0.45;            // düşme animasyonu (puan hemen verilir)
    const BLOK = 420, YOL = 72;       // şehir ızgarası: blok aralığı ve yol genişliği

    function delikR(puan) { return R0 + K * Math.sqrt(puan); }
    function yutabilir(delikYaricap, nesneYaricap) { return nesneYaricap < delikYaricap * YUTMA_ORAN; }
    // Büyüdükçe ağırlaşır: küçük delik çevik (225), büyük delik yavaş (r=60 → 184, r=168 → 157).
    // Kamera da uzaklaştığı için ekranda yavaşlama belirgin hissedilir — büyümenin bedeli.
    function hiz(r) { return 225 * Math.pow(R0 / Math.max(R0, r), 0.15); }

    // Kademe duyuruları: delik bu yarıçapı geçince "Artık … yutabilirsin" (game.js gösterir)
    const KADEMELER = [
        { tip: 'bank', ad: 'bankları ve çalıları' },
        { tip: 'araba', ad: 'arabaları ve ağaçları' },
        { tip: 'ev', ad: 'evleri ve otobüsleri' },
        { tip: 'apartman', ad: 'apartmanları' },
        { tip: 'kule', ad: 'kuleleri' },
        { tip: 'gokdelen', ad: 'gökdelenleri' }
    ];

    // ── Bölge (blok) dolgu tarifleri: [tip, adet] — büyükten küçüğe yerleşir ──
    const BOLGELER = {
        park:   [['fiskiye', 1], ['agac', 7], ['bank', 4], ['cali', 8], ['cop', 3], ['top', 4], ['cicek', 18]],
        ev:     [['ev', 3], ['agac', 3], ['araba', 1], ['cali', 4], ['posta', 3], ['cop', 2], ['cicek', 10], ['top', 2]],
        carsi:  [['dukkan', 2], ['bufe', 2], ['durak', 1], ['bank', 3], ['kutu', 8], ['cop', 3], ['cicek', 4], ['koni', 3]],
        merkez: [['apartman', 2], ['dukkan', 1], ['agac', 3], ['bank', 2], ['kutu', 6], ['cop', 2], ['posta', 2]],
        liman:  [['vinc', 1], ['konteyner', 6], ['kamyon', 1], ['varil', 8], ['kutu', 8], ['koni', 4]],
        kule:   [['kule', 1], ['agac', 2], ['bank', 2], ['kutu', 6], ['cicek', 6]],
        dev:    [['gokdelen', 1], ['agac', 2], ['bank', 2], ['kutu', 6], ['cicek', 6]]
    };

    // ── Bölümler (sıra = oyun içi bölüm no). bolgeler: blok başına ağırlıklı seçim.
    //    hedef: yıldız eşikleri = haritadaki toplam puanın yüzdesi (botla ayarlandı, tests/obur-delik-bot.mjs).
    //    Rakip varsa 3. yıldız ayrıca BİRİNCİLİK ister. ──
    const BOLUMLER = [
        { ad: 'Çiçekli Park', izgara: 4, sure: 90, rakip: 0, rakipHiz: 0,
          bolgeler: { park: 3, ev: 1 }, hedef: [0.30, 0.50, 0.75], renk: 'park' },
        { ad: 'Sakin Mahalle', izgara: 5, sure: 100, rakip: 1, rakipHiz: 0.48,
          bolgeler: { ev: 3, park: 1, carsi: 1 }, hedef: [0.25, 0.42, 0.62], renk: 'mahalle' },
        { ad: 'Kalabalık Çarşı', izgara: 6, sure: 110, rakip: 2, rakipHiz: 0.47,
          bolgeler: { carsi: 3, ev: 2, park: 1 }, hedef: [0.15, 0.34, 0.50], renk: 'carsi' },
        { ad: 'Rüzgârlı Liman', izgara: 7, sure: 120, rakip: 2, rakipHiz: 0.50,
          bolgeler: { liman: 3, carsi: 1, ev: 1, park: 1 }, hedef: [0.18, 0.32, 0.46], renk: 'liman' },
        { ad: 'Şehir Merkezi', izgara: 8, sure: 120, rakip: 3, rakipHiz: 0.44,
          bolgeler: { merkez: 3, carsi: 2, park: 1, kule: 1 }, hedef: [0.08, 0.24, 0.40], renk: 'merkez' },
        { ad: 'Gökdelenler', izgara: 9, sure: 150, rakip: 3, rakipHiz: 0.42,
          bolgeler: { merkez: 2, kule: 2, dev: 1, carsi: 1, park: 1 }, hedef: [0.07, 0.24, 0.38], renk: 'gokdelen' }
    ];

    const RAKIPLER = [
        { ad: 'Fırfır', renk: '#ff8a3d' },
        { ad: 'Zıpzıp', renk: '#38d39f' },
        { ad: 'Pofuduk', renk: '#ff5fa2' }
    ];

    function agirlikliSec(r, agirliklar) {
        const anahtarlar = Object.keys(agirliklar);
        let top = 0;
        for (const k of anahtarlar) top += agirliklar[k];
        let x = r() * top;
        for (const k of anahtarlar) { x -= agirliklar[k]; if (x < 0) return k; }
        return anahtarlar[anahtarlar.length - 1];
    }

    // ── Harita üret (bölüm numarasından tohumlu: aynı bölüm = aynı şehir) ──
    function haritaKur(bolumNo) {
        const b = BOLUMLER[bolumNo];
        const r = rng(1000 + bolumNo * 7919);
        const n = b.izgara;
        const W = n * BLOK, H = n * BLOK;
        const nesneler = [];
        const bloklar = [];
        let id = 0;

        function ekle(tip, x, y, ek) {
            const t = TIPLER[tip];
            const o = { id: id++, tip, x, y, r: t.r, h: t.h, p: t.p, yon: 0, vx: 0, vy: 0,
                tohum: r(), dusen: null, k: 0, sallan: 0 };
            if (ek) Object.assign(o, ek);
            nesneler.push(o);
            return o;
        }
        function bosMu(x, y, rad, liste) {
            for (const o of liste) {
                const dx = o.x - x, dy = o.y - y, m = o.r + rad + 4;
                if (dx * dx + dy * dy < m * m) return false;
            }
            return true;
        }

        // Bloklar: yollar x = i·BLOK (0..n) çizgilerinde; blok içi [i·BLOK + YOL/2, (i+1)·BLOK − YOL/2]
        for (let by = 0; by < n; by++) {
            for (let bx = 0; bx < n; bx++) {
                const bolge = agirlikliSec(r, b.bolgeler);
                const x0 = bx * BLOK + YOL / 2 + 10, y0 = by * BLOK + YOL / 2 + 10;
                const ic = BLOK - YOL - 20;
                bloklar.push({ x: bx * BLOK + YOL / 2, y: by * BLOK + YOL / 2, w: BLOK - YOL, bolge });
                const yerel = [];
                for (const [tip, adet] of BOLGELER[bolge]) {
                    const rad = TIPLER[tip].r;
                    for (let k = 0; k < adet; k++) {
                        for (let deneme = 0; deneme < 30; deneme++) {
                            const x = x0 + rad + r() * (ic - 2 * rad);
                            const y = y0 + rad + r() * (ic - 2 * rad);
                            if (bosMu(x, y, rad, yerel)) {
                                const ek = {};
                                if (tip === 'araba' || tip === 'kamyon' || tip === 'otobus') ek.yon = r() < 0.5 ? 0 : 1;
                                yerel.push(ekle(tip, x, y, ek));
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Yol kenarları: lambalar, koniler, yangın muslukları
        for (let i = 1; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const c = i * BLOK;
                const s = j * BLOK + BLOK / 2;
                if (r() < 0.6) ekle('lamba', c - YOL / 2 + 6, s + (r() - 0.5) * 200);
                if (r() < 0.6) ekle('lamba', s + (r() - 0.5) * 200, c + YOL / 2 - 6);
                if (r() < 0.35) ekle(r() < 0.5 ? 'koni' : 'yangin', c + YOL / 2 - 6, s + (r() - 0.5) * 240);
            }
        }

        // Hareketli araçlar: her iç yolda iki şerit (zıt yön), şerit başına eşit aralıklı araçlar
        for (let i = 1; i < n; i++) {
            const c = i * BLOK;
            for (const serit of [-1, 1]) {
                const adet = 2 + Math.floor(r() * 2);
                const v = (55 + r() * 35) * serit;
                for (let k = 0; k < adet; k++) {
                    const tip = r() < 0.18 ? (r() < 0.5 ? 'otobus' : 'kamyon') : 'araba';
                    const pos = (k + r() * 0.4) / adet * W;
                    // yatay yol (y = c) ve dikey yol (x = c)
                    if (k % 2 === 0) ekle(tip, pos, c + serit * 16, { yon: 0, vx: v, surer: true });
                    else ekle(tip, c + serit * 16, pos, { yon: 1, vy: v, surer: true });
                }
            }
        }

        let toplam = 0;
        for (const o of nesneler) toplam += o.p;
        return { W, H, n, nesneler, bloklar, toplam };
    }

    function delikYap(ad, renk, x, y, bot, botHiz) {
        return { ad, renk, x, y, vx: 0, vy: 0, puan: 0, r: R0, bot, botHiz: botHiz || 1,
            hedef: null, dusunme: 0, yon: -Math.PI / 2, kademe: 0, yutulan: 0,
            atilT: 0, atilBekle: 0, biberBekle: 0, hapsuT: 0, biberDusun: 0 };
    }

    // ── Yeni oyun durumu ──
    function oyunKur(bolumNo) {
        const b = BOLUMLER[bolumNo];
        const h = haritaKur(bolumNo);
        const s = { bolumNo, bolum: b, W: h.W, H: h.H, n: h.n, nesneler: h.nesneler, bloklar: h.bloklar,
            toplam: h.toplam, t: 0, kalan: b.sure, bitti: false, olaylar: [], rng: rng(77 + bolumNo), delikler: [],
            biberler: [], sonId: h.nesneler.length };
        // Oyuncu ortadaki kavşakta; rakipler köşelere yakın kavşaklarda
        const orta = Math.floor(h.n / 2) * BLOK;
        s.delikler.push(delikYap('Sen', '#6c5cff', orta, orta, false));
        const kose = [[BLOK, BLOK], [h.W - BLOK, h.H - BLOK], [h.W - BLOK, BLOK], [BLOK, h.H - BLOK]];
        for (let i = 0; i < b.rakip; i++) {
            const rk = RAKIPLER[i];
            const rd = delikYap(rk.ad, rk.renk, kose[i][0], kose[i][1], true, b.rakipHiz);
            rd.biberDusun = BIBER.botIlk + i * 4;      // ilk atış en erken 12 sn sonra, rakipler sırayla
            s.delikler.push(rd);
        }
        return s;
    }

    // ── Bot beyni: yutabildiği en değerli-yakın nesneye git. Oyuncu otomatik pilotu da bunu kullanır. ──
    function botYon(s, d) {
        d.dusunme -= 1;
        if (d.hedef && (d.hedef.dusen || !yutabilir(d.r, d.hedef.r))) d.hedef = null;
        if (!d.hedef || d.dusunme <= 0) {
            // Botlar ~0,75 sn'de bir karar verir ve her zaman en iyisini seçmez (insan gibi dalgın)
            d.dusunme = d.bot ? 45 : 12;
            let enIyi = null, enIyiPuan = -1, simdiki = -1;
            for (const o of s.nesneler) {
                if (o.dusen || !yutabilir(d.r, o.r)) continue;
                const dx = o.x - d.x, dy = o.y - d.y;
                const m = Math.sqrt(dx * dx + dy * dy);
                const deger = (o.p + 0.5) / (m + 80) * (d.bot ? 0.6 + 0.8 * s.rng() : 1);
                if (o === d.hedef) simdiki = deger;
                if (deger > enIyiPuan) { enIyiPuan = deger; enIyi = o; }
            }
            // Kararlılık: bot, yeni hedef belirgin şekilde (1,4×) daha iyi değilse fikrini değiştirmez —
            // sürekli yön değiştirmek rakipleri olduğundan hızlı gösteriyordu.
            if (!(d.bot && simdiki > 0 && enIyiPuan < simdiki * 1.4)) d.hedef = enIyi;
        }
        if (!d.hedef) return { dx: 0, dy: 0 };
        const dx = d.hedef.x - d.x, dy = d.hedef.y - d.y;
        const m = Math.sqrt(dx * dx + dy * dy) || 1;
        const guc = Math.min(1, m / 30);
        return { dx: dx / m * guc, dy: dy / m * guc };
    }

    // ── Bir adım: giris = { dx, dy } (oyuncu, büyüklük ≤ 1). Sabit dt önerilir (1/60). ──
    function adim(s, giris, dt) {
        if (s.bitti) return;
        s.t += dt;
        s.kalan -= dt;
        s.olaylar.length = 0;

        // Araçlar yollarda akar (haritanın kenarından öbür kenara sarar)
        for (const o of s.nesneler) {
            if (!o.surer || o.dusen) continue;
            o.x += o.vx * dt; o.y += o.vy * dt;
            if (o.x < -60) o.x += s.W + 120; else if (o.x > s.W + 60) o.x -= s.W + 120;
            if (o.y < -60) o.y += s.H + 120; else if (o.y > s.H + 60) o.y -= s.H + 120;
        }

        for (const d of s.delikler) {
            d.atilT = Math.max(0, d.atilT - dt); d.atilBekle = Math.max(0, d.atilBekle - dt);
            d.biberBekle = Math.max(0, d.biberBekle - dt); d.hapsuT = Math.max(0, d.hapsuT - dt);
        }
        // Rakipler de arada bir biber atar: seyrek, yalnız önünde biri varken, eli titreyerek
        for (const d of s.delikler) {
            if (!d.bot) continue;
            d.biberDusun -= dt;
            if (d.biberDusun > 0) continue;
            d.biberDusun = BIBER.botAra + s.rng() * BIBER.botAraRast;
            if (biberHedef(s, d, BIBER.botMenzil) && s.rng() < BIBER.botAtma) biberAt(s, d);
        }
        if (giris && giris.atil) atil(s, s.delikler[0]);
        if (giris && giris.biber) {
            const gx0 = giris.dx || 0, gy0 = giris.dy || 0;      // o an yönlendirilen yöne fırlat
            if (gx0 * gx0 + gy0 * gy0 > 0.0025) s.delikler[0].yon = Math.atan2(gy0, gx0);
            biberAt(s, s.delikler[0]);
        }

        // Delikleri sür
        for (const d of s.delikler) {
            let g = d.bot ? botYon(s, d) : (giris || { dx: 0, dy: 0 });
            let gx = g.dx || 0, gy = g.dy || 0;
            if (d.bot) {      // fark ettiği biberden kaçar (havadayken de); fark etmediğini görmezden gelir — asla ona yönelmez
                const di = s.delikler.indexOf(d);
                for (const b of s.biberler) {
                    if (b.sahip === d || !b.fark[di]) continue;
                    const bx = d.x - b.x, by = d.y - b.y, bm = Math.sqrt(bx * bx + by * by) || 1, menzil = d.r + 90;
                    if (bm < menzil) { const k = (1 - bm / menzil) * 2.2; gx += bx / bm * k; gy += by / bm * k; }
                }
            }
            const gm = Math.sqrt(gx * gx + gy * gy);
            if (gm > 1) { gx /= gm; gy /= gm; }
            const v = hiz(d.r) * (d.bot ? d.botHiz : 1) * (d.atilT > 0 ? ATIL.carpan : 1) * (d.hapsuT > 0 ? 0.12 : 1);
            const yumusak = Math.min(1, dt * (d.bot ? 3.5 : 10));   // botlar daha yavaş döner
            d.vx += (gx * v - d.vx) * yumusak;
            d.vy += (gy * v - d.vy) * yumusak;
            d.x += d.vx * dt; d.y += d.vy * dt;
            if (gm > 0.05) d.yon = Math.atan2(gy, gx);
            const kenar = d.r * 0.6;
            d.x = Math.max(kenar, Math.min(s.W - kenar, d.x));
            d.y = Math.max(kenar, Math.min(s.H - kenar, d.y));
        }
        // Delikler üst üste binmez: yumuşak itiş
        for (let i = 0; i < s.delikler.length; i++) {
            for (let j = i + 1; j < s.delikler.length; j++) {
                const a = s.delikler[i], b = s.delikler[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const m = Math.sqrt(dx * dx + dy * dy) || 0.01;
                const min = (a.r + b.r) * 0.9;
                if (m < min) {
                    const it = (min - m) / 2;
                    a.x -= dx / m * it; a.y -= dy / m * it;
                    b.x += dx / m * it; b.y += dy / m * it;
                }
            }
        }

        // Acı biberler
        for (let i = s.biberler.length - 1; i >= 0; i--) {
            const b = s.biberler[i];
            b.kalan -= dt; b.inis = Math.max(0, b.inis - dt);
            if (b.kalan <= 0) { s.olaylar.push({ tur: 'biberBitti', biber: b }); s.biberler.splice(i, 1); continue; }
            if (b.inis > 0) continue;
            for (const d of s.delikler) {
                if (d === b.sahip || d.hapsuT > 0) continue;
                const dx = d.x - b.x, dy = d.y - b.y, m = d.r * 0.75 + BIBER.r;
                if (dx * dx + dy * dy < m * m) { hapsu(s, d, b); s.biberler.splice(i, 1); break; }
            }
        }

        // Yutma
        for (const o of s.nesneler) {
            if (o.dusen) {
                o.k += dt / DUSME_SN;
                // düşen nesne deliğin merkezine kayar
                o.x += (o.dusen.x - o.x) * Math.min(1, dt * 6);
                o.y += (o.dusen.y - o.y) * Math.min(1, dt * 6);
                continue;
            }
            o.sallan = Math.max(0, o.sallan - dt * 3);
            for (const d of s.delikler) {
                const dx = o.x - d.x, dy = o.y - d.y;
                const m2 = dx * dx + dy * dy;
                const lim = d.r + o.r;
                if (m2 >= lim * lim) continue;
                if (yutabilir(d.r, o.r)) {
                    const icSinir = d.r - o.r * 0.45;
                    if (m2 < icSinir * icSinir) {
                        o.dusen = d; o.k = 0;
                        const onceR = d.r;
                        d.puan += o.p; d.yutulan += 1;
                        d.r = delikR(d.puan);
                        s.olaylar.push({ tur: 'yut', delik: d, nesne: o });
                        // kademe duyurusu (yalnız ilk kez)
                        while (d.kademe < KADEMELER.length &&
                               yutabilir(d.r, TIPLER[KADEMELER[d.kademe].tip].r)) {
                            if (!yutabilir(onceR, TIPLER[KADEMELER[d.kademe].tip].r)) {
                                s.olaylar.push({ tur: 'kademe', delik: d, ad: KADEMELER[d.kademe].ad, tip: KADEMELER[d.kademe].tip });
                            }
                            d.kademe++;
                        }
                        break;
                    }
                } else {
                    // büyük nesne deliğin üstünde sallanır ama düşmez; ilk temasta "çarp" olayı (ses/geri bildirim)
                    if (o.sallan < 0.05) s.olaylar.push({ tur: 'carp', delik: d, nesne: o });
                    o.sallan = 1;
                }
            }
        }
        // Düşmesi biten nesneleri at
        let yaz = 0;
        for (let i = 0; i < s.nesneler.length; i++) {
            const o = s.nesneler[i];
            if (o.dusen && o.k >= 1) continue;
            s.nesneler[yaz++] = o;
        }
        s.nesneler.length = yaz;

        if (s.kalan <= 0) { s.kalan = 0; s.bitti = true; s.olaylar.push({ tur: 'bitti' }); }
        // Şehrin tamamı yutulduysa tur erken biter (kutlama game.js'te)
        else if (s.nesneler.length === 0) { s.temiz = true; s.bitti = true; s.olaylar.push({ tur: 'bitti' }); }
    }

    // ── Yetenekler ──
    function atil(s, d) {
        if (d.atilBekle > 0 || d.hapsuT > 0) return false;
        d.atilT = ATIL.sure; d.atilBekle = ATIL.bekle;
        s.olaylar.push({ tur: 'atil', delik: d });
        return true;
    }
    function biberHazir(s, d) {
        let benim = 0;
        for (const b of s.biberler) if (b.sahip === d) benim++;
        return d.biberBekle <= 0 && d.hapsuT <= 0 && d.puan >= BIBER.enAzPuan && benim < BIBER.enFazla && s.delikler.length > 1;
    }
    function biberAt(s, d) {
        if (!biberHazir(s, d)) return false;
        const maliyet = Math.max(6, Math.round(d.puan * BIBER.maliyet));
        d.puan -= maliyet; d.r = delikR(d.puan);
        d.biberBekle = BIBER.bekle;
        const ux = Math.cos(d.yon), uy = Math.sin(d.yon);
        const ileri = d.r * 1.5 + 110;
        let hx = d.x + ux * ileri, hy = d.y + uy * ileri;
        // Nişan: biber nişan çizgisine, hedefin uzaklığına düşer. Yardım sapmanın yalnız yarısını düzeltir:
        // tam ortadan nişan alan kesin vurur (fark edip kaçmaya çalışsa da yetişemez), kenardan vurulan kaçabilir.
        const enIyi = biberHedef(s, d, BIBER.nisanMenzil);
        // her rakip biberi yarı yarıya fark eder (dalgın): fark ederse kaçmaya çalışır
        const fark = s.delikler.map((o) => o !== d && s.rng() < BIBER.farkEtme);
        if (enIyi) {
            const px = enIyi.x + enIyi.vx * BIBER.inis, py = enIyi.y + enIyi.vy * BIBER.inis;
            const izd = (px - d.x) * ux + (py - d.y) * uy;            // nişan çizgisi boyunca uzaklık
            const cx = d.x + ux * izd, cy = d.y + uy * izd;
            hx = cx + (px - cx) * BIBER.nisanYardim; hy = cy + (py - cy) * BIBER.nisanYardim;
            if (d.bot) {      // botun eli titrer: yana rastgele sapma
                const e = (s.rng() - 0.5) * 2 * (enIyi.r * 0.9 + 25);
                hx += -uy * e; hy += ux * e;
            }
        }
        const x = Math.max(BIBER.r, Math.min(s.W - BIBER.r, hx));
        const y = Math.max(BIBER.r, Math.min(s.H - BIBER.r, hy));
        const b = { id: s.sonId++, x, y, x0: d.x, y0: d.y, sahip: d, kalan: BIBER.omur, inis: BIBER.inis, fark };
        s.biberler.push(b);
        s.olaylar.push({ tur: 'biber', delik: d, biber: b, maliyet });
        return true;
    }
    // Gidiş yönünün ±~35° içinde, menzildeki en yakın delik
    function biberHedef(s, d, menzil) {
        let enIyi = null, enIyiM = menzil;
        for (const o of s.delikler) {
            if (o === d) continue;
            const dx = o.x - d.x, dy = o.y - d.y, m = Math.sqrt(dx * dx + dy * dy);
            let fark = Math.atan2(dy, dx) - d.yon;
            fark = Math.atan2(Math.sin(fark), Math.cos(fark));
            if (Math.abs(fark) < BIBER.nisanAci && m < enIyiM) { enIyiM = m; enIyi = o; }
        }
        return enIyi;
    }
    function hapsu(s, d, b) {
        const kayip = Math.floor(d.puan * (d.bot ? BIBER.hapsuOran : BIBER.hapsuOranOyuncu));
        d.hapsuT = BIBER.hapsuSure;
        d.puan -= kayip; d.r = delikR(d.puan);
        d.vx *= 0.2; d.vy *= 0.2; d.hedef = null;
        // kaybedilen puan kadar eşya etrafa püskürür (en fazla 14 tane; artan kısım kaybolur)
        const yeni = [];
        let kalan = kayip;
        while (kalan > 0 && yeni.length < BIBER.sacilanEnFazla) {
            const hedefP = kalan / (BIBER.sacilanEnFazla - yeni.length);
            let tip = SACILAN[0];
            for (const t of SACILAN) if (TIPLER[t].p <= Math.max(1, hedefP) && TIPLER[t].p <= kalan) tip = t;
            const t = TIPLER[tip];
            const a = (yeni.length / BIBER.sacilanEnFazla) * Math.PI * 2 + s.rng() * 0.8;
            const uz = d.r + t.r + 25 + s.rng() * 70;
            const o = { id: s.sonId++, tip, x: Math.max(t.r, Math.min(s.W - t.r, d.x + Math.cos(a) * uz)),
                y: Math.max(t.r, Math.min(s.H - t.r, d.y + Math.sin(a) * uz)), r: t.r, h: t.h, p: t.p, yon: 0, vx: 0, vy: 0,
                tohum: s.rng(), dusen: null, k: 0, sallan: 0, sacilan: true, kx: d.x, ky: d.y };
            s.nesneler.push(o); yeni.push(o);
            kalan -= t.p;
        }
        s.olaylar.push({ tur: 'hapsu', delik: d, biber: b, kayip, nesneler: yeni });
    }

    // ── Sonuç: yüzde, sıra, yıldız ──
    function sonuc(s) {
        const ben = s.delikler[0];
        const oran = ben.puan / s.toplam;
        const sirali = s.delikler.slice().sort((a, b) => b.puan - a.puan);
        const sira = sirali.indexOf(ben) + 1;
        const h = s.bolum.hedef;
        let yildiz = 0;
        if (oran >= h[0]) yildiz = 1;
        if (oran >= h[1]) yildiz = 2;
        if (oran >= h[2] && sira === 1) yildiz = 3;
        return { oran, sira, yildiz, puan: ben.puan, sirali };
    }

    const api = { rng, TIPLER, BOLUMLER, RAKIPLER, KADEMELER, BLOK, YOL, DUSME_SN, YUTMA_ORAN, ATIL, BIBER, SACILAN,
        delikR, yutabilir, hiz, haritaKur, oyunKur, adim, botYon, sonuc, atil, biberAt, biberHazir, biberHedef };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.ObCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
