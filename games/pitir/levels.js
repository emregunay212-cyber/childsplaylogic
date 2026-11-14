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

    const PLevels = { bolumler: B, kurucu };
    if (typeof module !== 'undefined' && module.exports) module.exports = PLevels;
    else root.PLevels = PLevels;
})(typeof window !== 'undefined' ? window : globalThis);
