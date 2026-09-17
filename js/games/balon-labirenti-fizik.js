/* ============================================
   Balon Labirenti — saf fizik çekirdeği (DOM yok, deterministik)
   --------------------------------------------
   Canlı oyun (js/games/balon-labirenti.js), nişan önizlemesi, hayalet ipucu, çözüm tarayıcı
   (tools/balon-labirenti-coz.js) ve Playwright çözülebilirlik testi (tests/balon-labirenti.spec.js)
   AYNI step fonksiyonunu kullanır: bir labirentin kayıtlı cozum'u testte temizliyorsa oyunda da temizler.
   Kurallar: yalnız + − × ÷ √ (sin/cos yalnız atış dönüşümünde bir kez); Math.random yok; zaman dışarıdan
   sabit adımla verilir (ADIM = 1/120 s, ALT_ADIM alt adım) → V8/JavaScriptCore aynı yolu üretir.
   Koordinat: 800×500 mantıksal, sol üst orijin, y aşağı. Açı: derece, 0 = sağ, 90 = yukarı.
   Sonuçlar: temiz (hepsi patladı) · dustu (kanvası terk etti; üst kenar açık) · durdu · zaman.
   ============================================ */
'use strict';

window.BALON_LABIRENTI_FIZIK = (() => {
    const SABIT = Object.freeze({
        W: 800, H: 500,
        TOP_R: 12,            // dikenli top yarıçapı
        BALON_R: 16,          // balon yarıçapı (patlama mesafesi = TOP_R + BALON_R = 28)
        DUVAR_MIN: 20,        // en ince duvar (alt adımda yer değiştirme < DUVAR_MIN/2 olmalı)
        G: 900,               // yerçekimi px/s²
        HIZ_MAX: 900,         // kuvvet 100 → 900 px/s (45°'de menzil v²/g = 900 px)
        HIZ_TAVAN: 1400,      // enerji sınırı ~1308 + sıcak hava payı; tünelleme matematiği buna dayanır
        ADIM: 1 / 120,        // sabit tik
        ALT_ADIM: 2,          // tik başına alt adım → h = 1/240 s, en fazla 5,8 px yer değiştirme
        E: 0.75,              // sekme katsayısı
        SURTUNME: 0.998,      // yuvarlanma sürtünmesi (temas alt adımı başına; hız saniyede ×0,62 → 300 px/s ≈ 620 px yol)
        YAPISMA_HIZ: 40,      // bu normal hızın altında sekme yok, yuvarlanma (köşede mikro-sekme biter)
        DURGUN_HIZ: 12,       // bu hızın altında …
        DURGUN_SURE: 0.8,     // … bu kadar süre kalırsa durdu
        ZAMAN_ASIMI: 12,      // zaman
        DIS_PAY: 40,          // kanvas dışına bu kadar taşınca dustu (üst kenar açık)
        CEKME_MAX: 140,       // tam kuvvet çekiş uzunluğu (mantıksal px)
        CEKME_MIN: 12,        // altı: dokunma/tık iptal
        PLATFORM_HIZ_MAX: 120,
        HAVA_GUC: Object.freeze([1.2, 2.0]),
    });
    const H = SABIT.ADIM / SABIT.ALT_ADIM;
    const POP_R = SABIT.TOP_R + SABIT.BALON_R;
    const POP_R2 = POP_R * POP_R;

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    // Çekiş vektörü (işaretçi şimdi − basılan nokta, mantıksal px) → atış; top çekişin TERSİNE uçar.
    // Kısa çekiş → null (dokunma iptal). Tamsayı açı/kuvvet: gösterge ne yazıyorsa simülasyon o sayılarla koşar.
    function pullToShot(cx, cy) {
        const len = Math.sqrt(cx * cx + cy * cy);
        if (len < SABIT.CEKME_MIN) return null;
        const lx = -cx, ly = -cy;                                   // fırlatma yönü (ekran, y aşağı)
        let aci = Math.round(Math.atan2(-ly, lx) * 180 / Math.PI);  // matematik açısı (y yukarı)
        aci = ((aci % 360) + 360) % 360;
        const kuvvet = Math.round(clamp(len, 0, SABIT.CEKME_MAX) / SABIT.CEKME_MAX * 100);
        return { aci, kuvvet };
    }

    function launchVel(aci, kuvvet) {
        const v = clamp(kuvvet, 0, 100) / 100 * SABIT.HIZ_MAX;
        const rad = aci * Math.PI / 180;
        return { vx: v * Math.cos(rad), vy: -v * Math.sin(rad) };
    }

    // Hareketli platform: (x,y) ↔ hedef arasında üçgen dalga; gidiş-dönüş sure s; t = 0 başlangıç noktası.
    // Trig yok → deterministik; hız sabit büyüklükte, yön yarı periyotta değişir.
    function platformAt(p, t) {
        const sure = p.sure > 0 ? p.sure : 1;
        const u = (t % sure) / sure;                  // 0..1
        const s = u < 0.5 ? u * 2 : 2 - u * 2;       // 0 → 1 → 0
        const yon = u < 0.5 ? 1 : -1;
        const dx = p.hedef.x - p.x, dy = p.hedef.y - p.y;
        const k = 2 / sure;
        return { x: p.x + dx * s, y: p.y + dy * s, vx: dx * k * yon, vy: dy * k * yon };
    }

    function createShot(level, shot) {
        const v = launchVel(shot.aci, shot.kuvvet);
        const n = level.balonlar.length;
        const patladi = new Array(n);
        for (let i = 0; i < n; i++) patladi[i] = false;
        return {
            x: level.baslangic.x, y: level.baslangic.y, vx: v.vx, vy: v.vy,
            t: 0, spin: 0, durgunSure: 0,
            patladi, patlayan: [], kalan: n, sonPatlayan: -1,
            sonuc: null, olaylar: [],
        };
    }

    // Daire–AABB (en yakın nokta) çözümü. (svx, svy) kutunun hızı (platform); duvar için 0.
    function resolve(st, bx, by, bw, bh, svx, svy) {
        const R = SABIT.TOP_R;
        const px = clamp(st.x, bx, bx + bw), py = clamp(st.y, by, by + bh);
        const dx = st.x - px, dy = st.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 >= R * R) return;
        let nx, ny, pen;
        if (d2 > 1e-9) {
            const d = Math.sqrt(d2);
            nx = dx / d; ny = dy / d; pen = R - d;
        } else {
            // Merkez kutunun içinde: en az batan yüzden dışarı
            const sol = st.x - bx, sag = bx + bw - st.x, ust = st.y - by, alt = by + bh - st.y;
            let m = sol; nx = -1; ny = 0;
            if (sag < m) { m = sag; nx = 1; ny = 0; }
            if (ust < m) { m = ust; nx = 0; ny = -1; }
            if (alt < m) { m = alt; nx = 0; ny = 1; }
            pen = m + R;
        }
        st.x += nx * pen; st.y += ny * pen;
        let rvx = st.vx - svx, rvy = st.vy - svy;      // kutuya göre hız
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
            if (-vn < SABIT.YAPISMA_HIZ) {
                rvx -= vn * nx; rvy -= vn * ny;          // normal bileşen sıfır → yuvarlanma
                rvx *= SABIT.SURTUNME; rvy *= SABIT.SURTUNME;
            } else {
                const j = (1 + SABIT.E) * vn;
                rvx -= j * nx; rvy -= j * ny;
                st.olaylar.push({ tip: 'carpma', siddet: -vn, nx, ny });
            }
        }
        const sn = svx * nx + svy * ny;                // platform yalnız normal boyunca iter
        st.vx = rvx + sn * nx; st.vy = rvy + sn * ny;
    }

    // Tek alt adım. sonuc bir kez atanır; sonrası (görsel devam için) yalnız hareket eder.
    function step(st, level, h) {
        st.vy += SABIT.G * h;
        const hava = level.hava;
        if (hava) {
            for (let i = 0; i < hava.length; i++) {
                const z = hava[i];
                if (st.x >= z.x && st.x <= z.x + z.w && st.y >= z.y && st.y <= z.y + z.h) st.vy -= z.guc * SABIT.G * h;
            }
        }
        const sp2 = st.vx * st.vx + st.vy * st.vy;
        if (sp2 > SABIT.HIZ_TAVAN * SABIT.HIZ_TAVAN) {
            const k = SABIT.HIZ_TAVAN / Math.sqrt(sp2);
            st.vx *= k; st.vy *= k;
        }
        st.x += st.vx * h; st.y += st.vy * h;
        const duvarlar = level.duvarlar;
        if (duvarlar) {
            for (let i = 0; i < duvarlar.length; i++) {
                const d = duvarlar[i];
                resolve(st, d.x, d.y, d.w, d.h, 0, 0);
            }
        }
        const hareketli = level.hareketli;
        if (hareketli) {
            for (let i = 0; i < hareketli.length; i++) {
                const p = hareketli[i];
                const q = platformAt(p, st.t);
                resolve(st, q.x, q.y, p.w, p.h, q.vx, q.vy);
            }
        }
        const balonlar = level.balonlar;
        for (let i = 0; i < balonlar.length; i++) {
            if (st.patladi[i]) continue;
            const b = balonlar[i];
            const dx = st.x - b.x, dy = st.y - b.y;
            if (dx * dx + dy * dy < POP_R2) {
                st.patladi[i] = true;
                st.patlayan.push(i);
                st.kalan--;
                st.sonPatlayan = i;
                st.olaylar.push({ tip: 'pop', i });
                if (st.kalan === 0 && !st.sonuc) st.sonuc = 'temiz';
            }
        }
        st.spin += st.vx / SABIT.TOP_R * h;             // yalnız görsel (diken dönüşü)
        st.t += h;
        if (st.sonuc) return st.sonuc;
        const R = SABIT.TOP_R, PAY = SABIT.DIS_PAY;
        if (st.x < -R - PAY || st.x > SABIT.W + R + PAY || st.y > SABIT.H + R + PAY) {
            st.sonuc = 'dustu';
        } else {
            const sp = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
            if (sp < SABIT.DURGUN_HIZ) {
                st.durgunSure += h;
                if (st.durgunSure >= SABIT.DURGUN_SURE) st.sonuc = 'durdu';
            } else {
                st.durgunSure = 0;
            }
            if (!st.sonuc && st.t >= SABIT.ZAMAN_ASIMI) st.sonuc = 'zaman';
        }
        return st.sonuc;
    }

    // Bir sabit tik = ALT_ADIM alt adım; olaylar tik başında temizlenir (modül tik sonunda tüketir).
    // zorla=true: sonuç atanmış olsa da hareket ettir (temizlendikten sonraki görsel devam).
    function tick(st, level, zorla) {
        st.olaylar.length = 0;
        for (let i = 0; i < SABIT.ALT_ADIM; i++) {
            step(st, level, H);
            if (st.sonuc && !zorla) break;
        }
        return st.sonuc;
    }

    // Tam simülasyon: { sonuc, patlayan, hepsi, sure, yol? } — yol tik başına [x,y] (ipucu yayı, test).
    function simulate(level, shot, opts) {
        const o = opts || {};
        const maxT = o.maxT > 0 ? o.maxT : SABIT.ZAMAN_ASIMI;
        const st = createShot(level, shot);
        const yol = o.yol ? [[st.x, st.y]] : null;
        while (!st.sonuc && st.t < maxT - 1e-9) {
            tick(st, level, false);
            if (yol) yol.push([st.x, st.y]);
        }
        return { sonuc: st.sonuc || 'zaman', patlayan: st.patlayan.slice(), hepsi: st.kalan === 0, sure: st.t, yol };
    }

    // Nişan önizlemesi: yalnız yerçekimi (duvar/hava yok), kanvas dışında kesilir.
    function preview(level, aci, kuvvet, n, dt) {
        const N = n || 22, DT = dt || 0.04;
        const v = launchVel(aci, kuvvet);
        const out = [];
        let x = level.baslangic.x, y = level.baslangic.y, vy = v.vy;
        const vx = v.vx;
        for (let i = 0; i < N; i++) {
            vy += SABIT.G * DT;
            x += vx * DT; y += vy * DT;
            if (x < 0 || x > SABIT.W || y > SABIT.H) break;
            out.push([x, y]);
        }
        return out;
    }

    return { SABIT, H, pullToShot, launchVel, platformAt, createShot, step, tick, simulate, preview };
})();
