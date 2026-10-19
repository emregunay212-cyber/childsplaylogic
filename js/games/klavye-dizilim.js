/* ============================================
   Klavye dizilimi — Türkçe Q (ortak, saf; DOM'a ve oyun modüllerine dokunmaz)
   --------------------------------------------
   Klavye Kâşifi ve On Parmak ikisi de bunu kullanır → modülden ÖNCE yüklenir (data/games.json files.js, ilk sıra).
   Yayımlar: window.KlavyeDizilim. Tasarım: docs/on-parmak-tasarim-2026-10-15.md §5.1 ve §7.

   Veri: SATIRLAR = 4 satır; her tuş { code, alt, ust, parmak } (+ okul klavyesinin `< >` tuşunda pasif: true).
     code    KeyboardEvent.code — fiziksel tuş KONUMU (işletim sistemi dizilimine bağlı değil)
     alt     Shift'siz karakter ('ı', 'i', '1')      ust   Shift'li karakter ('I', 'İ', '!')
     parmak  basan parmak (PARMAKLAR); Shift'li karakterde ayrıca karşı elin serçesi Shift'e basar (§5.1)
   Harf tuşu: alt !== ust ve alt.toLocaleUpperCase('tr-TR') === ust. Türkçe büyük/küçük harf HER ZAMAN 'tr-TR' ile
   çevrilir ('i'.toUpperCase() 'I' verir, yanlış).

   API (hepsi saf):
     tusOf(ch)       → { code, shift } | null     karakter hangi tuşta, Shift gerekir mi
     parmaklarOf(ch) → ['sol-isaret'] | ['sag-serce', 'sol-isaret'] | []   (Shift'liyse ÖNCE Shift parmağı)
     shiftTusuOf(ch) → 'ShiftLeft' | 'ShiftRight' | null   (karşı elin Shift'i; Shift gerekmiyorsa null)
     elOf(ch)        → 'sol' | 'sag' | null       (Boşluk iki başparmakla → null)
     yazilabilir(ch) → bool                       dizilimde var VE pasif tuş değil (içerik yalnız bunları kullanır)
     karakterOf(e)   → string | null              fiziksel basış → karakter: "fiziksel tuş = konum" (aşağıda)

   karakterOf(e): e.code SATIRLAR'da (ya da Space) varsa karakter YALNIZ koddan türer — e.key'e bakılmaz. Böylece
   İngilizce dizilimli PC'de KeyI → 'ı', Quote → 'i', Comma → 'ö' çıkar (yanlış fiziksel tuş doğru sayılmaz), Windows
   TR Q'daki ölü tuş ^ (e.key 'Dead', Digit3 + Shift) da doğru çıkar. Harf tuşunda büyük/küçük = shiftKey XOR Caps Lock;
   diğer tuşlarda shiftKey ? ust : alt (Caps Lock rakam/noktalamayı etkilemez). e.code boşsa (bazı sanal klavyeler)
   tek karakterlik e.key dizilimde varsa o döner. e.code dolu ama haritada yoksa (Numpad, F tuşları, Shift, Enter…)
   null → çağıran basışı yok sayar ve saymaz. Ctrl/Meta/Alt süzmesi çağıranın işidir (Kâşifi gibi).
   Pasif `< >` tuşu tepkisizdir: e.code IntlBackslash (ya da boş e.code ile '<' / '>') → null, basış yok sayılır ve sayılmaz.

   Kâşifi görünümü: KlavyeDizilim.kasifi.satirlar() / kodHaritasi() — Kâşifi'nin bugünkü ROWS ve CODE_MAP sabitlerinin
   birebir türevi (tests/klavye-kasifi.spec.js derin-eşitliği denetler). Kâşifi kendi SHIFT_OF / TYPEABLE /
   resolveKey kalıbını korur; bu görünüm yalnız iki veri sabitini verir.
   ============================================ */

(function () {
    'use strict';

    const PARMAKLAR = Object.freeze([
        'sol-serce', 'sol-yuzuk', 'sol-orta', 'sol-isaret',
        'sag-isaret', 'sag-orta', 'sag-yuzuk', 'sag-serce',
        'basparmak',
    ]);

    function tus(code, alt, ust, parmak, pasif) {
        const t = { code, alt, ust, parmak };
        if (pasif) t.pasif = true;
        return Object.freeze(t);
    }

    const SATIRLAR = Object.freeze([
        Object.freeze([
            tus('Backquote', '"', 'é', 'sol-serce'),
            tus('Digit1', '1', '!', 'sol-serce'),
            tus('Digit2', '2', "'", 'sol-yuzuk'),
            tus('Digit3', '3', '^', 'sol-orta'),
            tus('Digit4', '4', '+', 'sol-isaret'),
            tus('Digit5', '5', '%', 'sol-isaret'),
            tus('Digit6', '6', '&', 'sag-isaret'),
            tus('Digit7', '7', '/', 'sag-isaret'),
            tus('Digit8', '8', '(', 'sag-orta'),
            tus('Digit9', '9', ')', 'sag-yuzuk'),
            tus('Digit0', '0', '=', 'sag-serce'),
            tus('Minus', '*', '?', 'sag-serce'),
            tus('Equal', '-', '_', 'sag-serce'),
        ]),
        Object.freeze([
            tus('KeyQ', 'q', 'Q', 'sol-serce'),
            tus('KeyW', 'w', 'W', 'sol-yuzuk'),
            tus('KeyE', 'e', 'E', 'sol-orta'),
            tus('KeyR', 'r', 'R', 'sol-isaret'),
            tus('KeyT', 't', 'T', 'sol-isaret'),
            tus('KeyY', 'y', 'Y', 'sag-isaret'),
            tus('KeyU', 'u', 'U', 'sag-isaret'),
            tus('KeyI', 'ı', 'I', 'sag-orta'),
            tus('KeyO', 'o', 'O', 'sag-yuzuk'),
            tus('KeyP', 'p', 'P', 'sag-serce'),
            tus('BracketLeft', 'ğ', 'Ğ', 'sag-serce'),
            tus('BracketRight', 'ü', 'Ü', 'sag-serce'),
        ]),
        Object.freeze([
            tus('KeyA', 'a', 'A', 'sol-serce'),
            tus('KeyS', 's', 'S', 'sol-yuzuk'),
            tus('KeyD', 'd', 'D', 'sol-orta'),
            tus('KeyF', 'f', 'F', 'sol-isaret'),
            tus('KeyG', 'g', 'G', 'sol-isaret'),
            tus('KeyH', 'h', 'H', 'sag-isaret'),
            tus('KeyJ', 'j', 'J', 'sag-isaret'),
            tus('KeyK', 'k', 'K', 'sag-orta'),
            tus('KeyL', 'l', 'L', 'sag-yuzuk'),
            tus('Semicolon', 'ş', 'Ş', 'sag-serce'),
            tus('Quote', 'i', 'İ', 'sag-serce'),
            tus('Backslash', ',', ';', 'sag-serce'),
        ]),
        Object.freeze([
            tus('IntlBackslash', '<', '>', 'sol-serce', true),   // okul klavyelerinde Z'nin solunda; pasif
            tus('KeyZ', 'z', 'Z', 'sol-serce'),
            tus('KeyX', 'x', 'X', 'sol-yuzuk'),
            tus('KeyC', 'c', 'C', 'sol-orta'),
            tus('KeyV', 'v', 'V', 'sol-isaret'),
            tus('KeyB', 'b', 'B', 'sol-isaret'),
            tus('KeyN', 'n', 'N', 'sag-isaret'),
            tus('KeyM', 'm', 'M', 'sag-isaret'),
            tus('Comma', 'ö', 'Ö', 'sag-orta'),
            tus('Period', 'ç', 'Ç', 'sag-yuzuk'),
            tus('Slash', '.', ':', 'sag-serce'),
        ]),
    ]);

    // Satırlar dışındaki tuşlar: Boşluk (iki başparmak) ve iki Shift (karakter üretmez, yalnız parmak/konum bilgisi)
    const BOSLUK = tus('Space', ' ', ' ', 'basparmak');
    const SHIFT = Object.freeze({
        ShiftLeft: Object.freeze({ code: 'ShiftLeft', parmak: 'sol-serce' }),
        ShiftRight: Object.freeze({ code: 'ShiftRight', parmak: 'sag-serce' }),
    });

    // Karşı elin Shift'i: sol el karakteri → sağ Shift (sağ serçe), sağ el karakteri → sol Shift (sol serçe)
    const KARSI_SHIFT = { sol: 'ShiftRight', sag: 'ShiftLeft' };
    const KARSI_SERCE = { sol: 'sag-serce', sag: 'sol-serce' };

    const harfTusu = (t) => t.alt !== t.ust && t.alt.toLocaleUpperCase('tr-TR') === t.ust;
    const elOfTus = (t) => (t.parmak.startsWith('sol-') ? 'sol' : t.parmak.startsWith('sag-') ? 'sag' : null);

    // Arama tabloları (Map: 'constructor' gibi dizgiler prototipe düşmesin)
    const KOD = new Map();          // e.code → tuş (Boşluk dahil, Shift değil)
    const KARAKTER = new Map();     // karakter → { tus, shift }
    SATIRLAR.flat().concat([BOSLUK]).forEach((t) => {
        KOD.set(t.code, t);
        if (!KARAKTER.has(t.alt)) KARAKTER.set(t.alt, { tus: t, shift: false });
        if (t.ust !== t.alt && !KARAKTER.has(t.ust)) KARAKTER.set(t.ust, { tus: t, shift: true });
    });

    function tusOf(ch) {
        const k = KARAKTER.get(ch);
        return k ? { code: k.tus.code, shift: k.shift } : null;
    }

    function elOf(ch) {
        const k = KARAKTER.get(ch);
        return k ? elOfTus(k.tus) : null;
    }

    function parmaklarOf(ch) {
        const k = KARAKTER.get(ch);
        if (!k) return [];
        if (!k.shift) return [k.tus.parmak];
        return [KARSI_SERCE[elOfTus(k.tus)], k.tus.parmak];
    }

    function shiftTusuOf(ch) {
        const k = KARAKTER.get(ch);
        if (!k || !k.shift) return null;
        return KARSI_SHIFT[elOfTus(k.tus)] || null;
    }

    function yazilabilir(ch) {
        const k = KARAKTER.get(ch);
        return !!k && !k.tus.pasif;
    }

    function karakterOf(e) {
        if (!e) return null;
        if (typeof e.code === 'string' && e.code !== '') {
            const t = KOD.get(e.code);
            if (!t || t.pasif) return null;                             // Numpad, F tuşları, Shift, Enter, … ve pasif `< >`: tepkisiz
            const shift = !!e.shiftKey;
            if (harfTusu(t)) {
                const caps = typeof e.getModifierState === 'function' && !!e.getModifierState('CapsLock');
                return shift !== caps ? t.ust : t.alt;                  // büyük = Shift XOR Caps Lock
            }
            return shift ? t.ust : t.alt;
        }
        // e.code boş (bazı sanal klavyeler): e.key büyük/küçük harfi zaten taşır → Caps Lock/Shift'e bakılmaz (bilerek)
        const k = e.key;
        return typeof k === 'string' && k.length === 1 && yazilabilir(k) ? k : null;
    }

    // ── Klavye Kâşifi görünümü ──
    // Kâşifi'nin ekran klavyesinde bulunmayan tuşlar: rakam satırının uçları (" é ve - _) ve pasif `< >`.
    const KASIFI_DISI = { Backquote: true, Equal: true };
    const kasifiTusuMu = (t) => !t.pasif && !KASIFI_DISI[t.code];
    // ASCII harf tuşu (Q…M, Türkçe harf değil): e.key her dizilimde aynı harfi verir → kod adayına gerek yok
    const duzHarfTusu = (t) => /^[a-z]$/.test(t.alt) && /^[A-Z]$/.test(t.ust);

    // ROWS: rakam/noktalama tuşu [taban, Shift], harf tuşu BÜYÜK harf dizgisi
    function kasifiSatirlar() {
        return SATIRLAR.map((satir) => satir.filter(kasifiTusuMu).map((t) => (harfTusu(t) ? t.ust : [t.alt, t.ust])));
    }

    // CODE_MAP: e.code → [taban, Shift] (harf tuşunda ikisi de büyük harf); yalnız e.key'in kapakla uyuşmayabileceği tuşlar
    function kasifiKodHaritasi() {
        const harita = {};
        SATIRLAR.forEach((satir) => satir.filter(kasifiTusuMu).forEach((t) => {
            if (duzHarfTusu(t)) return;
            harita[t.code] = harfTusu(t) ? [t.ust, t.ust] : [t.alt, t.ust];
        }));
        return harita;
    }

    window.KlavyeDizilim = Object.freeze({
        PARMAKLAR, SATIRLAR, BOSLUK, SHIFT,
        tusOf, parmaklarOf, shiftTusuOf, elOf, yazilabilir, karakterOf,
        kasifi: Object.freeze({ satirlar: kasifiSatirlar, kodHaritasi: kasifiKodHaritasi }),
    });
})();
