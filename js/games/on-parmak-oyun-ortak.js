/* ============================================
   On Parmak — dört mini oyunun ortak parçaları → window.OnParmakOyunOrtak
   --------------------------------------------
   Spec §6.1. Yalnız rAF + visibilitychange'e dokunur (DOM'suz); testler: tests/on-parmak.spec.js.

   dongu(adimFn, { simdi?, azami? })  →  denetleyici
     adimFn(dt, t): dt = ms (en çok `azami`, vars. 100 — devamdan sonra sıçrama olmasın), t = rAF zaman damgası.
     denetleyici: { durdur(), durum(), devamTusu() }
       durum(): 'calisiyor' | 'gizli' (sekme gizli, rAF yok) | 'devam-bekliyor' (sekme göründü, tuş bekleniyor) | 'durdu'
       devamTusu(): oyun modülü HER tuşta ÖNCE bunu çağırır. true → tuş yutuldu (sayma, işleme); 'devam-bekliyor'
         durumundaysa döngüyü yeniden başlatır (devam tuşu sayılmaz). 'gizli' durumunda da true döner.
       Oyun, durum 'devam-bekliyor' olunca "Devam etmek için bir tuşa bas" yazısını durum() ile çizer
       (opts.durumDegisti(durum) çağrılır).
     adimFn fırlatırsa: console.error + döngü durur (durum 'durdu').
     Sekme oluşturulurken zaten gizliyse durum 'gizli' başlar; ilk durumDegisti('gizli') bildirimi mikro görevde (dongu() döndükten sonra) gelir.
     durdur(): rAF iptal + visibilitychange dinleyicisi kaldırılır (hub'a dönüşte sızıntı yok); tekrar çağrılabilir.

   uyarlanirHiz({ taban, min, max, artis, azalis, azaltilmisHareket? })  →  { deger(), basari(), canKaybi() }
     Başlangıç = taban. basari: +artis (≤ max), canKaybi: −azalis (≥ min). prefers-reduced-motion (ya da
     azaltilmisHareket:true) açıksa taban × 0.6 (≥ min).

   hedefSec(hedefler, harf, kilit?)  →  hedef | null
     hedef = { kelime, tehlike, ilerleme? } — tehlike: büyük = tehlikeye yakın (oyun kendi birimini normalize eder);
     ilerleme: yazılmış harf sayısı (vars. 0). kilit: hedefler içindeki mevcut kilitli hedef → olduğu gibi döner
     (kelime bitene dek kilit sürer; kilitliyken beklenen harfi oyun kelime[ilerleme]'ye bakıp kendisi doğrular).
     Kilit yoksa: ilk harfi `harf` olan, henüz başlanmamış hedefler arasından tehlikesi en yüksek (eşitte ilk). Yoksa null
     (basış hata sayılır). Harf eşleşmesi harf büyüklüğüne duyarlıdır, BİLEREK (Shift öğretilir: 'e' "Elma"yı vurmaz);
     çağıran KlavyeDizilim.karakterOf çıktısını olduğu gibi verir.

   rng(tohum)  →  () => [0,1)   mulberry32; aynı tohum = aynı dizi.
   ============================================ */
(function () {
    'use strict';

    function dongu(adimFn, opts) {
        const o = opts || {};
        const azami = o.azami || 100;
        let durum = 'calisiyor';
        let rafId = 0;
        let onceki = null;

        function bildir() { if (typeof o.durumDegisti === 'function') o.durumDegisti(durum); }
        function gizliMi() { return typeof document !== 'undefined' && document.visibilityState === 'hidden'; }

        function kare(t) {
            rafId = 0;
            if (durum !== 'calisiyor') return;
            const dt = onceki == null ? 0 : Math.min(azami, Math.max(0, t - onceki));
            onceki = t;
            try { adimFn(dt, t); } catch (err) {
                console.error('[OnParmakOyunOrtak] adimFn hatası, döngü durduruldu', err);
                durdur();
                return;
            }
            if (durum === 'calisiyor') rafId = requestAnimationFrame(kare);
        }
        function baslat() {
            onceki = null;
            if (!rafId) rafId = requestAnimationFrame(kare);
        }
        function gorunurluk() {
            if (durum === 'durdu') return;
            if (gizliMi()) {
                if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
                durum = 'gizli';
                bildir();
            } else if (durum === 'gizli') {
                durum = 'devam-bekliyor';
                bildir();
            }
        }
        function durdur() {
            if (durum === 'durdu') return;
            durum = 'durdu';
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
            document.removeEventListener('visibilitychange', gorunurluk);
        }
        function devamTusu() {
            if (durum === 'calisiyor' || durum === 'durdu') return false;
            if (durum === 'devam-bekliyor') {
                durum = 'calisiyor';
                bildir();
                baslat();
            }
            return true;
        }

        document.addEventListener('visibilitychange', gorunurluk);
        if (gizliMi()) {
            durum = 'gizli';
            // dongu() dönmeden bildirim çağıran henüz denetleyiciyi tutmaz → bir mikro görev ertelenir
            Promise.resolve().then(() => { if (durum === 'gizli') bildir(); });
        } else baslat();
        return { durdur, durum: () => durum, devamTusu };
    }

    function uyarlanirHiz({ taban, min, max, artis, azalis, azaltilmisHareket }) {
        let azalt = azaltilmisHareket;
        if (azalt === undefined) {
            azalt = typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        let d = Math.min(max, Math.max(min, azalt ? taban * 0.6 : taban));
        return {
            deger: () => d,
            basari() { d = Math.min(max, d + artis); return d; },
            canKaybi() { d = Math.max(min, d - azalis); return d; },
        };
    }

    function hedefSec(hedefler, harf, kilit) {
        if (kilit && hedefler.indexOf(kilit) !== -1) return kilit;
        let en = null;
        for (const h of hedefler) {
            if ((h.ilerleme || 0) !== 0 || h.kelime.charAt(0) !== harf) continue;
            if (en === null || h.tehlike > en.tehlike) en = h;
        }
        return en;
    }

    function rng(tohum) {
        let a = tohum >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    window.OnParmakOyunOrtak = { dongu, uyarlanirHiz, hedefSec, rng };
})();
