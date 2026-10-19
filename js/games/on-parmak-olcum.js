/* ============================================
   On Parmak — ölçüm (saf, DOM'suz) → window.OnParmakOlcum
   --------------------------------------------
   Doğruluk, hız (kelime/dk), bölüm ve kısım yıldızı. Spec §4. Node'da (`vm`) test edilir:
   tests/on-parmak.spec.js
   ============================================ */
(function () {
    'use strict';

    // İlk basışta doğru / toplam basış, yüzde. Hiç basış yok → 0 (hiç basmadan bölüm bitmez, tekrar).
    function dogruluk(dogruIlk, toplamBasis) {
        if (!(toplamBasis > 0)) return 0;
        return (dogruIlk * 100) / toplamBasis;
    }

    // kelime/dk = (karakter / 5) / dakika. Süre < 1 sn → 0 (sahte saatte sonsuz hız olmaz, 3. yıldız verilmez).
    function hiz(karakter, ms) {
        if (!(ms >= 1000)) return 0;
        return (karakter / 5) / (ms / 60000);
    }

    // 0 = tekrar (doğruluk < 80) | 1 | 2 | 3.
    // canliBitti:false (oyunda canlar bitti) → en çok 1. hedefHiz yoksa 3. yıldız yalnız doğruluk ≥ 95.
    function bolumYildizi({ dogruluk: d, hiz: h, hedefHiz, canliBitti = true }) {
        if (!(d >= 80)) return 0;
        if (!canliBitti) return 1;
        if (d >= 95 && (hedefHiz == null || h >= hedefHiz)) return 3;
        if (d >= 90) return 2;
        return 1;
    }

    // Bölüm yıldızlarının ortalaması, en yakın tam sayı; boş → 0.
    function kisimYildizi(yildizlar) {
        if (!yildizlar || !yildizlar.length) return 0;
        const toplam = yildizlar.reduce((a, b) => a + b, 0);
        return Math.round(toplam / yildizlar.length);
    }

    window.OnParmakOlcum = { dogruluk, hiz, bolumYildizi, kisimYildizi };
})();
