/* Pıtır — bölümler (PLevels). Tüm bölümler özgündür; plan §7.
   Harita ASCII'dir (plan §5.1); elle karakter saymak hataya açık olduğu için bölümler küçük bir kurucuyla
   (yükseklik profili + damga) yazılır ve çıktı düz ASCII satırlarıdır. Her bölüm `npm run test:pitir` ile
   baştan, her checkpoint'ten ve her yıldız alınarak botla doğrulanır. */
/* global module */
(function (root) {
    'use strict';

    // Kurucu: W × H ızgara, y = 0 en alt satır
    function kurucu(W, H) {
        const g = Array.from({ length: H }, () => Array(W).fill(' '));
        const set = (x, y, ch) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch; };
        const m = {
            // [x0, x1) sütunlarını h yüksekliğine kadar doldur (h = 0 → çukur)
            yer(x0, x1, h, ch = '#') { for (let x = x0; x < x1; x++) for (let y = 0; y < H; y++) set(x, y, y < h ? ch : ' '); return m; },
            // 45° rampa: x'ten başlayıp n sütun boyunca h0'dan yukarı (+1) ya da aşağı (-1)
            rampa(x, n, h0, yon) {
                for (let i = 0; i < n; i++) {
                    const cx = x + i;
                    if (yon > 0) { m.yer(cx, cx + 1, h0 + i); set(cx, h0 + i, '/'); }
                    else { m.yer(cx, cx + 1, h0 - i - 1); set(cx, h0 - i - 1, '\\'); }
                }
                return m;
            },
            // 22,5° rampa: her iki sütunda 1 yükselir/alçalır, n = yükseklik farkı
            yokus(x, n, h0, yon) {
                for (let i = 0; i < n; i++) {
                    const a = x + 2 * i, b = a + 1;
                    if (yon > 0) { m.yer(a, a + 1, h0 + i); set(a, h0 + i, '('); m.yer(b, b + 1, h0 + i); set(b, h0 + i, '{'); }
                    else { m.yer(a, a + 1, h0 - i - 1); set(a, h0 - i - 1, ')'); m.yer(b, b + 1, h0 - i - 1); set(b, h0 - i - 1, '}'); }
                }
                return m;
            },
            kutu(x0, y0, x1, y1, ch = '#') { for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) set(x, y, ch); return m; },
            koy(x, y, ch) { set(x, y, ch); return m; },
            satirlar() { return g.slice().reverse().map(r => r.join('').replace(/\s+$/, '')); },
        };
        return m;
    }

    const B = [];

    // ── 1 · İlk Tur — yuvarlan, zıpla ──
    B.push((() => {
        const m = kurucu(96, 12);
        m.yer(0, 12, 2).yer(12, 24, 3).yer(24, 44, 3).kutu(28, 3, 34, 5);
        m.yer(44, 46, 1).yer(46, 56, 3).yer(56, 59, 0).yer(59, 70, 3);
        m.yer(70, 76, 4).yer(76, 82, 5).yer(82, 86, 4).yer(86, 96, 3);
        m.koy(6, 2, 'S').koy(1, 2, '*').koy(31, 5, '*').koy(80, 7, '*');
        m.koy(54, 3, 'C').koy(92, 3, 'F');
        return { id: 'd1-01', ad: 'İlk Tur', dunya: 1, sira: 1, par: 30, tema: 'cayir', harita: m.satirlar() };
    })());

    // ── 2 · Tepe Aşağı — eğim, hız kazanma ──
    B.push((() => {
        const m = kurucu(112, 15);
        m.yer(0, 6, 4).yokus(6, 7, 4, 1).yer(20, 22, 11).rampa(22, 7, 11, -1);
        m.yer(29, 34, 2).yer(34, 42, 4).kutu(34, 2, 38, 3, ' ').koy(36, 2, '*');     // dipte alçak tünel + yıldız 3
        // dalgalı tepeler
        m.rampa(42, 3, 4, 1).yer(45, 47, 7).rampa(47, 3, 7, -1).yer(50, 52, 4).rampa(52, 3, 4, 1).yer(55, 57, 7).rampa(57, 3, 7, -1);
        // büyük iniş ve gerçek çukur
        m.rampa(60, 6, 4, 1).yer(66, 68, 10).rampa(68, 6, 10, -1).yer(74, 80, 0).koy(77, 6, '*');
        m.yer(80, 82, 4).yokus(82, 5, 4, 1).yer(92, 112, 9).koy(95, 11, '*');
        m.koy(2, 4, 'S').koy(40, 4, 'C').koy(108, 9, 'F');
        return { id: 'd1-02', ad: 'Tepe Aşağı', dunya: 1, sira: 2, par: 35, tema: 'cayir', harita: m.satirlar() };
    })());

    // ── 3 · Kutu Dostu — kutu itme, kutuya çıkma ──
    // 3 karoluk duvarlar zıplamayla aşılmaz: kutuyu duvara it, üstüne çık. İkinci kutu raftan düşürülür, üçüncüsü çıkıntıya itilir.
    B.push((() => {
        const m = kurucu(84, 13);
        m.yer(0, 14, 2).yer(14, 17, 5).yer(17, 30, 2).yer(30, 36, 4).yer(36, 42, 2).yer(42, 45, 5);
        m.yer(45, 60, 2).yer(60, 64, 5).yer(64, 68, 2).yer(68, 71, 1).yer(71, 84, 2);
        m.koy(68, 1, '^').koy(69, 1, '^').koy(70, 1, '^');
        m.koy(3, 2, 'S').koy(10, 2, 'B').koy(20, 2, 'C').koy(34, 4, 'B').koy(48, 2, 'C').koy(56, 2, 'B');
        m.koy(15, 8, '*').koy(43, 8, '*').koy(69, 3, '*').koy(80, 2, 'F');
        return { id: 'd1-03', ad: 'Kutu Dostu', dunya: 1, sira: 3, par: 45, tema: 'cayir', harita: m.satirlar() };
    })());

    // ── 4 · Diken Bahçesi — dikenler, alçak tavan (kısa zıplama), dikenli çukur adaları, inişten uçuş ──
    B.push((() => {
        const m = kurucu(104, 13);
        m.yer(0, 47, 2).koy(12, 2, '^').koy(19, 2, '^').koy(25, 2, '^').koy(26, 2, '^');
        m.kutu(30, 4, 42, 13).koy(33, 2, '^').koy(38, 2, '^');                 // alçak tavan: 2 karo boşluk
        m.yer(47, 64, 1);                                                       // dikenli çukur (52. sütun güvenli raf)
        for (let x = 47; x < 64; x++) if (x !== 52) m.koy(x, 1, '^');
        m.yer(49, 51, 2).yer(54, 56, 2).yer(59, 61, 2);
        m.yer(64, 74, 2).rampa(74, 4, 2, 1).yer(78, 81, 6).rampa(81, 4, 6, -1).yer(85, 104, 2);
        m.koy(88, 2, '^').koy(89, 2, '^').koy(90, 2, '^');
        m.koy(3, 2, 'S').koy(44, 2, 'C').koy(68, 2, 'C');
        m.koy(36, 3, '*').koy(52, 1, '*').koy(89, 5, '*').koy(99, 2, 'F');
        return { id: 'd1-04', ad: 'Diken Bahçesi', dunya: 1, sira: 4, par: 40, tema: 'cayir', harita: m.satirlar() };
    })());

    // ── 5 · Tepe Sınavı — 1–4'ün birleşimi ──
    B.push((() => {
        const m = kurucu(134, 16);
        m.yer(0, 6, 7).rampa(6, 5, 7, -1).yer(11, 18, 2).yer(18, 22, 0).yer(22, 34, 2);          // inişte hız al, çukuru atla
        m.yer(34, 37, 5).yer(37, 56, 2).kutu(44, 4, 56, 16).koy(47, 2, '^').koy(52, 2, '^');      // kutu duvarı, alçak tavan
        m.yer(56, 60, 2).yer(60, 78, 1);
        for (let x = 60; x < 78; x++) m.koy(x, 1, '^');
        m.yer(63, 65, 2).yer(68, 70, 2).yer(73, 75, 2);
        m.yer(78, 86, 2).rampa(86, 6, 2, 1).yer(92, 96, 8).rampa(96, 6, 8, -1).yer(102, 107, 0).yer(107, 134, 2);
        m.koy(2, 7, 'S').koy(28, 2, 'B').koy(40, 2, 'C').koy(80, 2, 'C').koy(112, 2, 'C');
        m.koy(20, 4, '*').koy(35, 8, '*').koy(104, 5, '*').koy(128, 2, 'F');
        return { id: 'd1-05', ad: 'Tepe Sınavı', dunya: 1, sira: 5, par: 60, tema: 'cayir', harita: m.satirlar() };
    })());

    // ── 6 · Yüzen Adımlar — hareketli platform (nefes bölümü) ──
    B.push((() => {
        const m = kurucu(110, 16);
        m.yer(0, 10, 3).yer(10, 22, 1).yer(10, 11, 2).yer(21, 22, 2).yer(22, 36, 3).yer(30, 33, 5);   // altı güvenli çukur; asansörün yanında basamak (her yükseklikte binilir)
        m.yer(36, 52, 9).yer(52, 78, 0).yer(78, 84, 9).rampa(84, 6, 9, -1).yer(90, 110, 3);
        m.koy(3, 3, 'S').koy(26, 3, 'C').koy(48, 9, 'C').koy(104, 3, 'F');
        m.koy(35, 11, '*').koy(64, 6, '*').koy(76, 12, '*');
        return {
            id: 'd1-06', ad: 'Yüzen Adımlar', dunya: 1, sira: 6, par: 45, tema: 'cayir', harita: m.satirlar(),
            nesneler: [
                { t: 'platform', x: 10, y: 3, w: 3, dx: 9, per: 960 },
                { t: 'platform', x: 33, y: 3, w: 3, dy: 6, per: 960 },
                { t: 'platform', x: 52, y: 9, w: 3, dx: 9, per: 960 },
                { t: 'platform', x: 66, y: 6, w: 3, dy: 3, per: 480, faz: 0.5 },
                { t: 'platform', x: 72, y: 9, w: 3, dx: 3, per: 480 },
            ],
        };
    })());

    // ── 7 · Bas ve Geç — düğme ve kapı ──
    B.push((() => {
        const m = kurucu(112, 14);
        const kapiDuvari = (x, y) => m.kutu(x, y + 3, x + 1, 14);           // kapının üstü tavana kadar kapalı
        m.yer(0, 34, 2).yer(34, 35, 1).yer(35, 74, 2).yer(74, 78, 4).yer(78, 80, 2).yer(80, 81, 1).yer(81, 112, 2);
        kapiDuvari(14, 2); kapiDuvari(42, 2); kapiDuvari(86, 2); kapiDuvari(98, 2);
        m.koy(3, 2, 'S').koy(20, 2, 'C').koy(31, 2, 'B').koy(62, 2, 'C').koy(76, 4, 'B');
        m.koy(17, 4, '*').koy(76, 7, '*').koy(104, 5, '*').koy(108, 2, 'F');
        return {
            id: 'd1-07', ad: 'Bas ve Geç', dunya: 1, sira: 7, par: 50, tema: 'cayir', harita: m.satirlar(),
            nesneler: [
                { t: 'dugme', x: 9, y: 2, kapi: 'k1' }, { t: 'kapi', id: 'k1', x: 14, y: 2, h: 3 },
                { t: 'dugme', x: 34, y: 1, kapi: 'k2', tur: 'tut' }, { t: 'kapi', id: 'k2', x: 42, y: 2, h: 3 },
                { t: 'dugme', x: 80, y: 1, kapi: 'k3', tur: 'tut' }, { t: 'kapi', id: 'k3', x: 86, y: 2, h: 3 },
                { t: 'dugme', x: 92, y: 2, kapi: 'k4' }, { t: 'kapi', id: 'k4', x: 98, y: 2, h: 3 },
            ],
        };
    })());

    // ── 8 · Çöken Köprü — düşen platform ──
    B.push((() => {
        const m = kurucu(124, 16);
        m.yer(0, 8, 3).yer(8, 22, 1).yer(22, 34, 3).yer(34, 52, 0).yer(52, 62, 3);
        m.yer(62, 80, 0).yer(80, 92, 11).rampa(92, 8, 11, -1).yer(100, 105, 0).yer(105, 124, 3);
        m.koy(3, 3, 'S').koy(26, 3, 'C').koy(55, 3, 'C').koy(88, 11, 'C').koy(118, 3, 'F');
        m.koy(44, 6, '*').koy(78, 13, '*').koy(102, 2, '*');
        return {
            id: 'd1-08', ad: 'Çöken Köprü', dunya: 1, sira: 8, par: 50, tema: 'cayir', harita: m.satirlar(),
            nesneler: [
                { t: 'duser', x: 9, y: 3, w: 2 }, { t: 'duser', x: 13, y: 3, w: 2 }, { t: 'duser', x: 17, y: 3, w: 2 },
                { t: 'duser', x: 36, y: 3, w: 2 }, { t: 'duser', x: 40, y: 3, w: 2 }, { t: 'duser', x: 44, y: 3, w: 2 }, { t: 'duser', x: 48, y: 3, w: 2 },
                { t: 'duser', x: 43, y: 5, w: 2 },
                { t: 'duser', x: 64, y: 5, w: 2 }, { t: 'duser', x: 68, y: 7, w: 2 }, { t: 'duser', x: 72, y: 9, w: 2 }, { t: 'duser', x: 76, y: 11, w: 2 },
                { t: 'duser', x: 101, y: 1, w: 2 },
            ],
        };
    })());

    // ── 9 · Kirpi Yolu — dikenli temizlik robotundan kaçınma (üstüne basmak da ölüm) ──
    B.push((() => {
        const m = kurucu(126, 14);
        m.yer(0, 70, 2).kutu(30, 4, 44, 14).yer(70, 76, 4).yer(76, 98, 2).yer(98, 108, 0).yer(108, 126, 2);
        m.koy(3, 2, 'S').koy(46, 2, 'C').koy(78, 2, 'C').koy(120, 2, 'F');
        m.koy(26, 5, '*').koy(37, 3, '*').koy(63, 2, '*');
        return {
            id: 'd1-09', ad: 'Kirpi Yolu', dunya: 1, sira: 9, par: 55, tema: 'cayir', harita: m.satirlar(),
            nesneler: [
                { t: 'kirpi', x0: 14, x1: 22, y: 2, per: 960 },
                { t: 'kirpi', x0: 33, x1: 41, y: 2, per: 960 },
                { t: 'kirpi', x0: 52, x1: 60, y: 2, per: 960 }, { t: 'kirpi', x0: 60, x1: 68, y: 2, per: 960, faz: 0.5 },
                { t: 'kirpi', x0: 84, x1: 94, y: 2, per: 960 },
                { t: 'platform', x: 98, y: 2, w: 3, dx: 7, per: 960 },
            ],
        };
    })());

    // ── 10 · İstasyon Kapısı — Dünya 1 sınavı ──
    B.push((() => {
        const m = kurucu(176, 16);
        m.yer(0, 6, 8).rampa(6, 6, 8, -1).yer(12, 30, 2).yer(30, 31, 1).yer(31, 50, 2).kutu(40, 5, 41, 16);   // hız al, kutu → çentik düğmesi → kapı
        m.yer(50, 70, 0).yer(70, 100, 2).kutu(84, 4, 96, 16);                                                   // düşen zincir, kirpi + alçak tavan
        m.yer(100, 124, 0).yer(124, 134, 2).yer(134, 136, 4).yer(136, 138, 6).yer(138, 140, 8).rampa(140, 6, 8, -1).yer(146, 176, 2);
        m.koy(2, 8, 'S').koy(20, 2, 'C').koy(27, 2, 'B').koy(46, 2, 'C').koy(73, 2, 'C').koy(128, 2, 'C').koy(170, 2, 'F');
        m.koy(35, 5, '*').koy(60, 6, '*').koy(114, 4, '*');
        return {
            id: 'd1-10', ad: 'İstasyon Kapısı', dunya: 1, sira: 10, par: 75, tema: 'cayir', harita: m.satirlar(),
            nesneler: [
                { t: 'dugme', x: 30, y: 1, kapi: 'k1', tur: 'tut' }, { t: 'kapi', id: 'k1', x: 40, y: 2, h: 3 },
                { t: 'duser', x: 51, y: 2, w: 2 }, { t: 'duser', x: 55, y: 3, w: 2 }, { t: 'duser', x: 59, y: 4, w: 2 }, { t: 'duser', x: 63, y: 3, w: 2 }, { t: 'duser', x: 67, y: 2, w: 2 },
                { t: 'kirpi', x0: 77, x1: 83, y: 2, per: 480 }, { t: 'kirpi', x0: 86, x1: 94, y: 2, per: 480 },
                { t: 'platform', x: 101, y: 2, w: 3, dx: 8, per: 480 }, { t: 'platform', x: 112, y: 2, w: 3, dx: 8, per: 480, faz: 0.5 },
            ],
        };
    })());

    const PLevels = { bolumler: B, kurucu };
    if (typeof module !== 'undefined' && module.exports) module.exports = PLevels;
    else root.PLevels = PLevels;
})(typeof window !== 'undefined' ? window : globalThis);
