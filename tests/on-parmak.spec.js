/* ============================================
   On Parmak testleri
   --------------------------------------------
   Bu dosya adım adım büyür. Şu an yalnız:
   1) Ortak klavye dizilimi (js/games/klavye-dizilim.js, Node `vm`, TARAYICISIZ): satırların veri sabiti,
      parmak haritası (spec §5.1), tusOf / parmaklarOf / shiftTusuOf / elOf / yazilabilir örnek tablosu ve
      karakterOf — "fiziksel tuş = konum": TR Q, İngilizce dizilim (TR kapak), Caps Lock, ölü tuş, Numpad, boş e.code.
   Ekran (js/games/on-parmak-ekran.js, TARAYICI): 404.html + addScriptTag (fikstür dosyası yok) — tuşlar, etiketler, vurgula/bas,
   dokunma (el katmanı geçirgen, pasif tepkisiz), parmak uçları orta sırada, goster, yokEt.
   Çalıştırma: npm run test:on-parmak
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { test, expect } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');

function loadDizilim() {
    const window = {};
    const rel = 'js/games/klavye-dizilim.js';
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { window }, { filename: rel });
    return window.KlavyeDizilim;
}
const D = loadDizilim();

// Fiziksel basış taklidi (gerçek KeyboardEvent'in kullanılan yüzü): getModifierState('CapsLock')
const ev = (key, code, { shift = false, caps = false } = {}) => ({
    key, code, shiftKey: shift, getModifierState: (m) => m === 'CapsLock' && caps,
});

test.describe('KlavyeDizilim — veri (tarayıcısız)', () => {
    test('4 satır, tuş sırası ve karakterler Türkçe Q ile birebir', () => {
        const SATIR = [
            // Satır 0: Backquote … Equal
            [['Backquote', '"', 'é'], ['Digit1', '1', '!'], ['Digit2', '2', "'"], ['Digit3', '3', '^'], ['Digit4', '4', '+'],
                ['Digit5', '5', '%'], ['Digit6', '6', '&'], ['Digit7', '7', '/'], ['Digit8', '8', '('], ['Digit9', '9', ')'],
                ['Digit0', '0', '='], ['Minus', '*', '?'], ['Equal', '-', '_']],
            // Satır 1
            [['KeyQ', 'q', 'Q'], ['KeyW', 'w', 'W'], ['KeyE', 'e', 'E'], ['KeyR', 'r', 'R'], ['KeyT', 't', 'T'], ['KeyY', 'y', 'Y'],
                ['KeyU', 'u', 'U'], ['KeyI', 'ı', 'I'], ['KeyO', 'o', 'O'], ['KeyP', 'p', 'P'], ['BracketLeft', 'ğ', 'Ğ'],
                ['BracketRight', 'ü', 'Ü']],
            // Satır 2
            [['KeyA', 'a', 'A'], ['KeyS', 's', 'S'], ['KeyD', 'd', 'D'], ['KeyF', 'f', 'F'], ['KeyG', 'g', 'G'], ['KeyH', 'h', 'H'],
                ['KeyJ', 'j', 'J'], ['KeyK', 'k', 'K'], ['KeyL', 'l', 'L'], ['Semicolon', 'ş', 'Ş'], ['Quote', 'i', 'İ'],
                ['Backslash', ',', ';']],
            // Satır 3: pasif `< >` Z'nin solunda
            [['IntlBackslash', '<', '>'], ['KeyZ', 'z', 'Z'], ['KeyX', 'x', 'X'], ['KeyC', 'c', 'C'], ['KeyV', 'v', 'V'],
                ['KeyB', 'b', 'B'], ['KeyN', 'n', 'N'], ['KeyM', 'm', 'M'], ['Comma', 'ö', 'Ö'], ['Period', 'ç', 'Ç'],
                ['Slash', '.', ':']],
        ];
        expect(D.SATIRLAR.map((satir) => satir.map((t) => [t.code, t.alt, t.ust]))).toEqual(SATIR);
        // Pasif yalnız IntlBackslash
        const pasif = D.SATIRLAR.flat().filter((t) => t.pasif).map((t) => t.code);
        expect(pasif).toEqual(['IntlBackslash']);
        // Boşluk ve iki Shift
        expect(D.BOSLUK).toMatchObject({ code: 'Space', alt: ' ', ust: ' ', parmak: 'basparmak' });
        expect(Object.keys(D.SHIFT)).toEqual(['ShiftLeft', 'ShiftRight']);
        expect(D.SHIFT.ShiftLeft.parmak).toBe('sol-serce');
        expect(D.SHIFT.ShiftRight.parmak).toBe('sag-serce');
    });

    test('her karakter tek tuşta; harf tuşunda büyük/küçük Türkçe kuralıyla (I↔ı, İ↔i)', () => {
        const tuslar = [...D.SATIRLAR.flat(), D.BOSLUK];
        const hepsi = tuslar.flatMap((t) => (t.alt === t.ust ? [t.alt] : [t.alt, t.ust]));
        expect(new Set(hepsi).size, 'aynı karakter iki tuşta').toBe(hepsi.length);
        // Harf tuşu = alt !== ust && alt.toLocaleUpperCase('tr-TR') === ust: 29 Türkçe harf + Q W X = 32
        const harfler = tuslar.filter((t) => t.alt !== t.ust && t.alt.toLocaleUpperCase('tr-TR') === t.ust);
        expect(harfler).toHaveLength(32);
        expect(D.tusOf('ı')).toEqual({ code: 'KeyI', shift: false });
        expect(D.tusOf('I')).toEqual({ code: 'KeyI', shift: true });
        expect(D.tusOf('i')).toEqual({ code: 'Quote', shift: false });
        expect(D.tusOf('İ')).toEqual({ code: 'Quote', shift: true });
    });

    test('parmak haritası spec §5.1 ile aynı; her parmak adı geçerli', () => {
        // Spec §5.1 tablosu (Shift'siz karakterler; `"` sol serçe, `i` ve `,` `.` sağ serçe)
        const HARITA = {
            'sol-serce': '"1qaz', 'sol-yuzuk': '2wsx', 'sol-orta': '3edc', 'sol-isaret': '45rtfgvb',
            'sag-isaret': '67yuhjnm', 'sag-orta': '8ıkö', 'sag-yuzuk': '9olç', 'sag-serce': '0*-pğüşi,.',
            basparmak: ' ',
        };
        const beklenen = Object.fromEntries(Object.entries(HARITA).flatMap(([parmak, chars]) => [...chars].map((c) => [c, parmak])));
        // Aynı küme: pasif hariç her tuşun Shift'siz karakteri + Boşluk
        const dizilim = Object.fromEntries([...D.SATIRLAR.flat().filter((t) => !t.pasif), D.BOSLUK].map((t) => [t.alt, t.parmak]));
        expect(dizilim).toEqual(beklenen);
        // Shift'li karakter tuşunun parmağıyla aynı parmakta basılır (Shift ayrı: parmaklarOf'un ilk elemanı)
        for (const t of D.SATIRLAR.flat().filter((x) => !x.pasif)) {
            expect(D.parmaklarOf(t.alt).slice(-1), t.alt).toEqual([t.parmak]);
            expect(D.parmaklarOf(t.ust).slice(-1), t.ust).toEqual([t.parmak]);
        }
        D.SATIRLAR.flat().forEach((t) => expect(D.PARMAKLAR, t.code).toContain(t.parmak));
        expect(D.PARMAKLAR).toEqual(['sol-serce', 'sol-yuzuk', 'sol-orta', 'sol-isaret', 'sag-isaret', 'sag-orta', 'sag-yuzuk', 'sag-serce', 'basparmak']);
    });
});

test.describe('KlavyeDizilim — tusOf / parmaklarOf / shiftTusuOf / elOf / yazilabilir (tarayıcısız)', () => {
    // [karakter, tusOf, parmaklarOf, shiftTusuOf, elOf]
    const TABLO = [
        ['ı', { code: 'KeyI', shift: false }, ['sag-orta'], null, 'sag'],
        ['i', { code: 'Quote', shift: false }, ['sag-serce'], null, 'sag'],
        ['İ', { code: 'Quote', shift: true }, ['sol-serce', 'sag-serce'], 'ShiftLeft', 'sag'],
        ['I', { code: 'KeyI', shift: true }, ['sol-serce', 'sag-orta'], 'ShiftLeft', 'sag'],
        ['ş', { code: 'Semicolon', shift: false }, ['sag-serce'], null, 'sag'],
        ['?', { code: 'Minus', shift: true }, ['sol-serce', 'sag-serce'], 'ShiftLeft', 'sag'],
        ['"', { code: 'Backquote', shift: false }, ['sol-serce'], null, 'sol'],
        ['^', { code: 'Digit3', shift: true }, ['sag-serce', 'sol-orta'], 'ShiftRight', 'sol'],
        ['F', { code: 'KeyF', shift: true }, ['sag-serce', 'sol-isaret'], 'ShiftRight', 'sol'],
        ['f', { code: 'KeyF', shift: false }, ['sol-isaret'], null, 'sol'],
        [' ', { code: 'Space', shift: false }, ['basparmak'], null, null],
    ];
    for (const [ch, tus, parmaklar, shiftTusu, el] of TABLO) {
        test(`örnek «${ch === ' ' ? 'Boşluk' : ch}»`, () => {
            expect(D.tusOf(ch)).toEqual(tus);
            expect(D.parmaklarOf(ch)).toEqual(parmaklar);
            expect(D.shiftTusuOf(ch)).toBe(shiftTusu);
            expect(D.elOf(ch)).toBe(el);
            expect(D.yazilabilir(ch)).toBe(true);
        });
    }

    test('Shift gereken karakterde karşı elin Shift tuşu: sol el → ShiftRight, sağ el → ShiftLeft (tüm dizilim)', () => {
        for (const t of D.SATIRLAR.flat().filter((x) => !x.pasif && x.alt !== x.ust)) {
            const el = t.parmak.startsWith('sol-') ? 'sol' : 'sag';
            expect(D.shiftTusuOf(t.ust), t.ust).toBe(el === 'sol' ? 'ShiftRight' : 'ShiftLeft');
            expect(D.shiftTusuOf(t.alt), t.alt).toBeNull();
            expect(D.elOf(t.alt), t.alt).toBe(el);
            expect(D.elOf(t.ust), t.ust).toBe(el);
        }
    });

    test('pasif `< >` yazılabilir değil; bilinmeyen karakter null / boş / false', () => {
        expect(D.tusOf('<')).toEqual({ code: 'IntlBackslash', shift: false });
        expect(D.tusOf('>')).toEqual({ code: 'IntlBackslash', shift: true });
        expect(D.yazilabilir('<')).toBe(false);
        expect(D.yazilabilir('>')).toBe(false);
        for (const ch of ['@', '€', 'ñ', 'wx', '', 'constructor', undefined, null, 5]) {
            expect(D.yazilabilir(ch), String(ch)).toBe(false);
            expect(D.tusOf(ch), String(ch)).toBeNull();
            expect(D.parmaklarOf(ch), String(ch)).toEqual([]);
            expect(D.shiftTusuOf(ch), String(ch)).toBeNull();
            expect(D.elOf(ch), String(ch)).toBeNull();
        }
        // Pasif dışında dizilimdeki her karakter yazılabilir
        const yazilabilirler = [...D.SATIRLAR.flat().filter((t) => !t.pasif), D.BOSLUK].flatMap((t) => [t.alt, t.ust]);
        yazilabilirler.forEach((ch) => expect(D.yazilabilir(ch), ch).toBe(true));
    });
});

test.describe('KlavyeDizilim.karakterOf — fiziksel tuş = konum (tarayıcısız)', () => {
    test('TR Q dizilimi', () => {
        expect(D.karakterOf(ev('ı', 'KeyI'))).toBe('ı');
        expect(D.karakterOf(ev('I', 'KeyI', { shift: true }))).toBe('I');
        expect(D.karakterOf(ev('i', 'Quote'))).toBe('i');
        expect(D.karakterOf(ev('İ', 'Quote', { shift: true }))).toBe('İ');
        expect(D.karakterOf(ev('ş', 'Semicolon'))).toBe('ş');
        expect(D.karakterOf(ev('?', 'Minus', { shift: true }))).toBe('?');
        expect(D.karakterOf(ev('!', 'Digit1', { shift: true }))).toBe('!');
        expect(D.karakterOf(ev('a', 'KeyA'))).toBe('a');
        expect(D.karakterOf(ev('A', 'KeyA', { shift: true }))).toBe('A');
        expect(D.karakterOf(ev(' ', 'Space'))).toBe(' ');
    });

    test('İngilizce dizilim (TR kapaklı klavye): karakter e.key\'den değil konumdan gelir', () => {
        expect(D.karakterOf(ev('i', 'KeyI'))).toBe('ı');
        expect(D.karakterOf(ev('I', 'KeyI', { shift: true }))).toBe('I');
        expect(D.karakterOf(ev("'", 'Quote'))).toBe('i');
        expect(D.karakterOf(ev('"', 'Quote', { shift: true }))).toBe('İ');
        expect(D.karakterOf(ev(',', 'Comma'))).toBe('ö');
        expect(D.karakterOf(ev('<', 'Comma', { shift: true }))).toBe('Ö');
        expect(D.karakterOf(ev(';', 'Semicolon'))).toBe('ş');
        expect(D.karakterOf(ev(':', 'Semicolon', { shift: true }))).toBe('Ş');
        expect(D.karakterOf(ev('[', 'BracketLeft'))).toBe('ğ');
        expect(D.karakterOf(ev(']', 'BracketRight'))).toBe('ü');
        expect(D.karakterOf(ev('.', 'Period'))).toBe('ç');
        expect(D.karakterOf(ev('/', 'Slash'))).toBe('.');
        expect(D.karakterOf(ev('?', 'Slash', { shift: true }))).toBe(':');
        expect(D.karakterOf(ev('\\', 'Backslash'))).toBe(',');
        // Kod kazanır: e.key kapakla uyuşmasa da
        expect(D.karakterOf(ev('x', 'KeyI'))).toBe('ı');
    });

    test('Caps Lock: harfte Shift ile XOR; rakam ve noktalama etkilenmez', () => {
        expect(D.karakterOf(ev('F', 'KeyF', { caps: true }))).toBe('F');
        expect(D.karakterOf(ev('f', 'KeyF', { caps: true, shift: true }))).toBe('f');
        expect(D.karakterOf(ev('f', 'KeyF'))).toBe('f');
        // Türkçe harfler (tr-TR büyük/küçük)
        expect(D.karakterOf(ev('ı', 'KeyI', { caps: true }))).toBe('I');
        expect(D.karakterOf(ev('i', 'Quote', { caps: true }))).toBe('İ');
        expect(D.karakterOf(ev('İ', 'Quote', { caps: true, shift: true }))).toBe('i');
        expect(D.karakterOf(ev('ş', 'Semicolon', { caps: true }))).toBe('Ş');
        // Harf olmayan tuşlar
        expect(D.karakterOf(ev('1', 'Digit1', { caps: true }))).toBe('1');
        expect(D.karakterOf(ev('!', 'Digit1', { caps: true, shift: true }))).toBe('!');
        expect(D.karakterOf(ev('.', 'Slash', { caps: true }))).toBe('.');
        // getModifierState yoksa Caps Lock kapalı sayılır
        expect(D.karakterOf({ key: 'f', code: 'KeyF', shiftKey: false })).toBe('f');
    });

    test('ölü tuş: Windows TR Q\'da ^ (e.key "Dead") koddan doğru çıkar', () => {
        expect(D.karakterOf(ev('Dead', 'Digit3', { shift: true }))).toBe('^');
        expect(D.karakterOf(ev('3', 'Digit3'))).toBe('3');
    });

    test('haritada olmayan kod → null (Numpad, F tuşları, Shift, Enter, Caps Lock …)', () => {
        expect(D.karakterOf(ev('4', 'Numpad4'))).toBeNull();
        expect(D.karakterOf(ev('/', 'NumpadDivide'))).toBeNull();
        expect(D.karakterOf(ev('Enter', 'NumpadEnter'))).toBeNull();
        for (const [key, code] of [['F5', 'F5'], ['Shift', 'ShiftLeft'], ['Shift', 'ShiftRight'], ['Enter', 'Enter'],
            ['Backspace', 'Backspace'], ['CapsLock', 'CapsLock'], ['Tab', 'Tab'], ['Escape', 'Escape'], ['ArrowLeft', 'ArrowLeft']]) {
            expect(D.karakterOf(ev(key, code)), code).toBeNull();
        }
    });

    test('boş e.code (sanal klavye): tek karakterlik e.key dizilimdeyse o; değilse null', () => {
        expect(D.karakterOf(ev('a', ''))).toBe('a');
        expect(D.karakterOf(ev('A', ''))).toBe('A');
        expect(D.karakterOf(ev('ı', ''))).toBe('ı');
        expect(D.karakterOf(ev(' ', ''))).toBe(' ');
        expect(D.karakterOf({ key: 'a' })).toBe('a');                    // e.code hiç yok
        expect(D.karakterOf(ev('Enter', ''))).toBeNull();
        expect(D.karakterOf(ev('Shift', ''))).toBeNull();
        expect(D.karakterOf(ev('@', ''))).toBeNull();
        expect(D.karakterOf(ev('Unidentified', ''))).toBeNull();
        expect(D.karakterOf({ code: '' })).toBeNull();
        expect(D.karakterOf({})).toBeNull();
        expect(D.karakterOf(null)).toBeNull();
        expect(D.karakterOf(undefined)).toBeNull();
    });

    test('pasif `< >` tuşu tepkisiz: karakterOf null (e.code ile de, boş e.code ile de)', () => {
        expect(D.karakterOf(ev('<', 'IntlBackslash'))).toBeNull();
        expect(D.karakterOf(ev('>', 'IntlBackslash', { shift: true }))).toBeNull();
        expect(D.karakterOf(ev('<', ''))).toBeNull();
        expect(D.karakterOf(ev('>', ''))).toBeNull();
        expect(D.yazilabilir('<')).toBe(false);
    });

    test('gidiş-dönüş: dizilimdeki her karakter için tusOf → basış → karakterOf aynı karakteri verir', () => {
        const hepsi = [...D.SATIRLAR.flat().filter((t) => !t.pasif), D.BOSLUK].flatMap((t) => [t.alt, t.ust]);
        for (const ch of new Set(hepsi)) {
            const { code, shift } = D.tusOf(ch);
            expect(D.karakterOf(ev(ch, code, { shift })), ch).toBe(ch);
        }
    });
});

/* ---------- OnParmakOlcum (saf ölçüm, tarayıcısız) ---------- */
function loadOlcum() {
    const window = {};
    const rel = 'js/games/on-parmak-olcum.js';
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { window }, { filename: rel });
    return window.OnParmakOlcum;
}

test.describe('OnParmakOlcum — ölçüm (tarayıcısız)', () => {
    test('dogruluk: yüzde; 0/0 → 0; tam isabet 100', () => {
        const O = loadOlcum();
        expect(O.dogruluk(0, 0)).toBe(0);
        expect(O.dogruluk(10, 10)).toBe(100);
        expect(O.dogruluk(8, 10)).toBe(80);
        expect(O.dogruluk(0, 5)).toBe(0);
        expect(O.dogruluk(19, 20)).toBe(95);
    });

    test('hiz: karakter/5/dakika; ms < 1000 → 0', () => {
        const O = loadOlcum();
        expect(O.hiz(100, 60000)).toBe(20);
        expect(O.hiz(50, 30000)).toBe(20);
        expect(O.hiz(100, 1000)).toBe(1200);
        expect(O.hiz(100, 999)).toBe(0);
        expect(O.hiz(100, 0)).toBe(0);
        expect(O.hiz(100, -5)).toBe(0);
    });

    test('bolumYildizi: doğruluk sınırları 79,9 / 80 / 90 / 95', () => {
        const O = loadOlcum();
        const y = (d, h = 100, hedefHiz = 8) => O.bolumYildizi({ dogruluk: d, hiz: h, hedefHiz });
        expect(y(79.9)).toBe(0);
        expect(y(80)).toBe(1);
        expect(y(89.9)).toBe(1);
        expect(y(90)).toBe(2);
        expect(y(94.9)).toBe(2);
        expect(y(95)).toBe(3);
        expect(y(100)).toBe(3);
        expect(y(0)).toBe(0);
    });

    test('bolumYildizi: 3. yıldız hız şartı — tam hedefte verilir, altında 2', () => {
        const O = loadOlcum();
        expect(O.bolumYildizi({ dogruluk: 96, hiz: 8, hedefHiz: 8 })).toBe(3);
        expect(O.bolumYildizi({ dogruluk: 96, hiz: 7.9, hedefHiz: 8 })).toBe(2);
        expect(O.bolumYildizi({ dogruluk: 96, hiz: 0, hedefHiz: 8 })).toBe(2);
        expect(O.bolumYildizi({ dogruluk: 92, hiz: 50, hedefHiz: 8 })).toBe(2);
    });

    test('bolumYildizi: hedefHiz yoksa 3. yıldız yalnız doğruluk ≥ 95', () => {
        const O = loadOlcum();
        expect(O.bolumYildizi({ dogruluk: 95, hiz: 0 })).toBe(3);
        expect(O.bolumYildizi({ dogruluk: 94.9, hiz: 99 })).toBe(2);
        expect(O.bolumYildizi({ dogruluk: 85, hiz: 99 })).toBe(1);
    });

    test('bolumYildizi: canliBitti:false → en çok 1; %80 kuralı önce', () => {
        const O = loadOlcum();
        expect(O.bolumYildizi({ dogruluk: 70, hiz: 99, hedefHiz: 8, canliBitti: false })).toBe(0);
        expect(O.bolumYildizi({ dogruluk: 98, hiz: 99, hedefHiz: 8, canliBitti: false })).toBe(1);
        expect(O.bolumYildizi({ dogruluk: 80, hiz: 99, canliBitti: false })).toBe(1);
        expect(O.bolumYildizi({ dogruluk: 98, hiz: 99, hedefHiz: 8, canliBitti: true })).toBe(3);
    });

    test('kisimYildizi: ortalama, en yakın tama; boş → 0', () => {
        const O = loadOlcum();
        expect(O.kisimYildizi([])).toBe(0);
        expect(O.kisimYildizi([3, 3, 3])).toBe(3);
        expect(O.kisimYildizi([1, 2])).toBe(2);       // 1,5 → 2
        expect(O.kisimYildizi([1, 1, 2])).toBe(1);    // 1,33 → 1
        expect(O.kisimYildizi([2, 2, 3])).toBe(2);    // 2,33 → 2
        expect(O.kisimYildizi([2, 3, 3])).toBe(3);    // 2,67 → 3
        expect(O.kisimYildizi([0, 0, 1])).toBe(0);
    });

    test('saf: yalnız window.OnParmakOlcum yayımlanır, başka global yok', () => {
        const ctx = { window: {} };
        const rel = 'js/games/on-parmak-olcum.js';
        vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
        expect(Object.keys(ctx.window)).toEqual(['OnParmakOlcum']);
        expect(Object.keys(ctx)).toEqual(['window']);
    });
});

/* ---------- ON_PARMAK_ICERIK (içerik kuralları, tarayıcısız) ---------- */
function loadIcerik() {
    const window = {};
    const rel = 'js/games/on-parmak-icerik.js';
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { window }, { filename: rel });
    return window.ON_PARMAK_ICERIK;
}

// ── Sıkı içerik kuralları (Adım 3 görev 1): saf denetçiler. Her biri düzleştirilmiş bölüm listesini alır, ihlal
// iletilerini döndürür (boş = uygun). Gerçek içerikte boş olmalı; kural bozan sahte içerikle de sınanırlar ki
// kural "hep yeşil" olmasın. Kısım 2–7 içerik görevleri bunlarla korunur.
const tr = (x) => x.toLocaleLowerCase('tr-TR');
const harfMi = (c) => /\p{L}/u.test(c);
const sozcukler = (metin) => metin.split(/[^\p{L}]+/u).filter(Boolean);   // ' ? ! ( ) " … ayırıcı: "Ali'nin" → Ali, nin
const elAdi = (ad) => {
    const m = tr(ad).match(/(?:^|[^\p{L}])(sol|sağ) el(?:[^\p{L}]|$)/u);
    return m ? (m[1] === 'sol' ? 'sol' : 'sag') : null;
};
const SHIFT_YAN = { ShiftLeft: 'sol', ShiftRight: 'sag' };

// Yasak sözcükler. KÖK: çekimli biçimler de yakalanır (sözcük bu kökle BAŞLARSA: 'silahlar', 'savaşı', 'şarabı').
// TAM: başka masum sözcüklerin başı olan kısa kökler yalnız sayılan biçimleriyle ('kan' → kanat/kanal serbest;
// 'seks' → seksen; 'rakı' → rakım; 'fal' → falan; 'öl' → ölçü; 'bahis' çekimi 'bahsi' → bahsetmek serbest).
const YASAK_KOK = ['silah', 'ölüm', 'ölü', 'öldü', 'katil', 'kavga', 'savaş', 'bomba', 'ateş', 'aşk', 'sahaf', 'şarap', 'şarab',
    'içki', 'sigara', 'kumar', 'bahis', 'ihanet', 'intihar', 'cinsel', 'şiddet'];
const YASAK_TAM = new Set(['kan', 'kanı', 'kana', 'kanda', 'kandan', 'kanın', 'kanlı', 'kanlar', 'öl', 'ölmek', 'ölür', 'ölen', 'ölsün',
    'fal', 'falı', 'fala', 'falcı', 'rakı', 'rakıyı', 'rakının', 'seks', 'seksi', 'bahsi', 'bahse']);
function yasakSozcukMu(w) {
    const k = tr(w);
    return YASAK_TAM.has(k) || YASAK_KOK.some((kok) => k.startsWith(kok));
}

// Bölümleri genel numarasıyla (diziden türer, sabit numara yok) düzleştirir; öğrenilmiş küme birikimlidir;
// shiftler = o bölüm dahil tanıtılmış Shift'ler ('sol' | 'sag').
function icerikBolumleri(icerik) {
    const kume = new Set();
    const shiftler = new Set();
    const sonuc = [];
    let no = 0;
    icerik.forEach((kisim, ki) => {
        for (const b of kisim.bolumler) {
            no += 1;
            (b.yeni || []).forEach((k) => kume.add(k));
            if (b.yeniShift) {
                shiftler.add(b.yeniShift);
                // Karşı elin Shift'i: 'sol' Shift → sağ el harfleri büyük (sapma 11)
                const hedefEl = b.yeniShift === 'sol' ? 'sag' : 'sol';
                for (const k of [...kume]) {
                    if (D.elOf(k) === hedefEl && k.toLocaleUpperCase('tr-TR') !== k) kume.add(k.toLocaleUpperCase('tr-TR'));
                }
            }
            sonuc.push({ no, kisim: ki, kisimAd: kisim.ad, hedefHiz: kisim.hedefHiz, b, ogrenilen: new Set(kume), shiftler: new Set(shiftler) });
        }
    });
    return sonuc;
}
const bolumEtiketi = (x) => `bölüm ${x.no} (${x.b.ad})`;
const OYUN_ADLARI = ['balon', 'canavar', 'baloncuk', 'elma'];

const ICERIK_DENETCI = {
    // Q, W, X yalnız adı o harfi (tek başına: "Q ve W", "X tekrar") anan tanıtım/tekrar bölümünde (kutu | satir)
    qwx(bs) {
        const ihlal = [];
        for (const x of bs) {
            const adHarfleri = new Set(tr(x.b.ad).split(/[^\p{L}]+/u).filter((t) => t.length === 1));
            for (const h of ['q', 'w', 'x']) {
                if (!tr(x.b.metin).includes(h)) continue;
                if (!['kutu', 'satir'].includes(x.b.tur) || !adHarfleri.has(h)) {
                    ihlal.push(`${bolumEtiketi(x)}: "${h}" yalnız adı onu anan tanıtım/tekrar bölümünde`);
                }
            }
        }
        return ihlal;
    },
    // Shift'li her karakter (büyük harf, ? ! : ; ' ( ) …) ancak gerektirdiği Shift tanıtıldıktan SONRA (o bölüm dahil);
    // yeniShift yalnız kutuda ve metninde o Shift'le yazılan en az bir büyük harf var (tanıtımın örneği oradan gelir)
    shiftSirasi(bs) {
        const ihlal = [];
        for (const x of bs) {
            for (const ch of new Set(x.b.metin)) {
                const kod = D.shiftTusuOf(ch);
                if (kod && !x.shiftler.has(SHIFT_YAN[kod])) ihlal.push(`${bolumEtiketi(x)}: "${ch}" ${SHIFT_YAN[kod] === 'sol' ? 'sol' : 'sağ'} Shift tanıtılmadan`);
            }
            if (x.b.yeniShift !== undefined) {
                if (!['sol', 'sag'].includes(x.b.yeniShift) || x.b.tur !== 'kutu') ihlal.push(`${bolumEtiketi(x)}: yeniShift 'sol'|'sag' ve yalnız kutuda`);
                const kod = x.b.yeniShift === 'sol' ? 'ShiftLeft' : 'ShiftRight';
                if (![...x.b.metin].some((c) => harfMi(c) && c !== tr(c) && D.shiftTusuOf(c) === kod)) {
                    ihlal.push(`${bolumEtiketi(x)}: ${x.b.yeniShift} Shift bölümünde o Shift'le yazılan büyük harf yok`);
                }
            }
        }
        return ihlal;
    },
    // Tek el bölümü (adında "sol el" / "sağ el"): harf ve rakamlar yalnız o elde; boşluk (başparmak) ve noktalama serbest
    tekEl(bs) {
        const ihlal = [];
        for (const x of bs) {
            const el = elAdi(x.b.ad);
            if (!el) continue;
            for (const ch of new Set(x.b.metin)) {
                if (!/[\p{L}\p{N}]/u.test(ch)) continue;
                if (D.elOf(ch) !== el) ihlal.push(`${bolumEtiketi(x)}: "${ch}" ${el === 'sol' ? 'sol' : 'sağ'} elde değil`);
            }
        }
        return ihlal;
    },
    // Yasak sözcük (çekimli biçimler dahil): metin ve bölüm adı
    yasak(bs) {
        const ihlal = [];
        for (const x of bs) {
            for (const w of sozcukler(x.b.metin + ' ' + x.b.ad)) if (yasakSozcukMu(w)) ihlal.push(`${bolumEtiketi(x)}: "${w}"`);
        }
        return ihlal;
    },
    // Tam kurs (levels === 7) kuralları: 7 kısım, 90–110 bölüm, dört oyunun her biri en az iki kez
    tamKurs(bs, kisimSayisi) {
        const ihlal = [];
        if (kisimSayisi !== 7) ihlal.push(`kısım sayısı ${kisimSayisi} ≠ 7`);
        if (bs.length < 90 || bs.length > 110) ihlal.push(`bölüm sayısı ${bs.length} ∉ [90, 110]`);
        for (const oyun of OYUN_ADLARI) {
            const n = bs.filter((x) => x.b.tur === 'oyun' && x.b.oyun === oyun).length;
            if (n < 2) ihlal.push(`${oyun} ${n} kez (en az 2)`);
        }
        return ihlal;
    },
};

test.describe('ON_PARMAK_ICERIK — sıkı kural denetçileri kendini sınar (sahte içerik, tarayıcısız)', () => {
    const k = (bolumler) => ({ ad: 'Sahte', ornek: 'F J', hedefHiz: 10, el: false, bolumler });
    const kutu = (ad, yeni, metin, ek = {}) => ({ tur: 'kutu', ad, yeni, metin, ...ek });
    const satir = (ad, metin) => ({ tur: 'satir', ad, metin });
    const oyun = (o) => ({ tur: 'oyun', ad: o, oyun: o, metin: 'fj' });
    const bs = (...kisimlar) => icerikBolumleri(kisimlar);

    test('yasak sözcük: çekimli biçim yakalanır (kökle başlayan), masum benzer sözcük serbest; büyük harfte de', () => {
        for (const w of ['silah', 'silahlar', 'Silahı', 'SAVAŞ', 'savaşçı', 'kanlı', 'Kan', 'öldürdü', 'ölümü', 'şarabı', 'kumarbaz', 'falcı', 'rakı', 'aşkım', 'Ateşi']) {
            expect(yasakSozcukMu(w), w).toBe(true);
        }
        for (const w of ['kanat', 'kanal', 'kalem', 'seksen', 'rakım', 'falan', 'ölçü', 'ölçmek', 'bahsetti', 'sahil', 'kandil', 'sakal']) {
            expect(yasakSozcukMu(w), w).toBe(false);
        }
        expect(ICERIK_DENETCI.yasak(bs(k([satir('Deneme', 'Ali\'nin silahları yok. (Savaşı) sevmez!')])))).toEqual([
            'bölüm 1 (Deneme): "silahları"', 'bölüm 1 (Deneme): "Savaşı"']);
    });

    test('Q/W/X: yalnız adı o harfi anan kutu/satır bölümünde; adın sözcük içindeki harfi sayılmaz', () => {
        expect(ICERIK_DENETCI.qwx(bs(k([kutu('Q ve W', ['q', 'w'], 'qqww qwqw'), satir('X tekrar', 'xx xa ax'), satir('Kelimeler', 'kale sal')])))).toEqual([]);
        expect(ICERIK_DENETCI.qwx(bs(k([kutu('Q ve W', ['q', 'w'], 'qqww'), satir('Kelimeler', 'wifi xa'),
            { tur: 'oyun', ad: 'Balon: Q', oyun: 'balon', metin: 'qqqq' }, satir('Quiz sözcükleri', 'quiz')])))).toEqual([
            'bölüm 2 (Kelimeler): "w" yalnız adı onu anan tanıtım/tekrar bölümünde',
            'bölüm 2 (Kelimeler): "x" yalnız adı onu anan tanıtım/tekrar bölümünde',
            'bölüm 3 (Balon: Q): "q" yalnız adı onu anan tanıtım/tekrar bölümünde',
            'bölüm 4 (Quiz sözcükleri): "q" yalnız adı onu anan tanıtım/tekrar bölümünde',
        ]);
    });

    test('Shift sırası: büyük harf / Shift\'li işaret ancak gerektirdiği Shift tanıtıldıktan sonra (sol Shift → sağ el büyükleri)', () => {
        expect(ICERIK_DENETCI.shiftSirasi(bs(k([kutu('Sol Shift', [], 'Jj Kk', { yeniShift: 'sol' }), satir('Cümle', 'Kale? Jale.'),
            kutu('Sağ Shift', [], 'Ff Dd', { yeniShift: 'sag' }), satir('Adlar', 'Defne ile Kaan; (Ada)')])))).toEqual([]);
        expect(ICERIK_DENETCI.shiftSirasi(bs(k([satir('Erken', 'Ali gel'), kutu('Sol Shift', [], 'Jj Kk', { yeniShift: 'sol' }),
            satir('Sol el büyüğü', 'Fa Da'), kutu('Shift örneksiz', [], 'jj kk', { yeniShift: 'sag' }),
            satir('Yanlış yer', 'Ff')])).map((x, i) => (i === 4 ? { ...x, b: { ...x.b, yeniShift: 'orta' } } : x)))).toEqual([
            'bölüm 1 (Erken): "A" sağ Shift tanıtılmadan',
            'bölüm 3 (Sol el büyüğü): "F" sağ Shift tanıtılmadan',
            'bölüm 3 (Sol el büyüğü): "D" sağ Shift tanıtılmadan',
            'bölüm 4 (Shift örneksiz): sag Shift bölümünde o Shift\'le yazılan büyük harf yok',
            'bölüm 5 (Yanlış yer): yeniShift \'sol\'|\'sag\' ve yalnız kutuda',
        ]);
    });

    test('tek el: adında "sol el"/"sağ el" olan bölümde harf ve rakam yalnız o elde; boşluk ve noktalama serbest', () => {
        expect(ICERIK_DENETCI.tekEl(bs(k([satir('Sol el kelimeleri', 'sade fes, sert? 12345'), satir('Sağ el kelimeleri', 'ılık ilim, ön. 7890')])))).toEqual([]);
        expect(ICERIK_DENETCI.tekEl(bs(k([satir('Sol el kelimeleri', 'sert kale 6'), satir('Sağ El: kelimeler', 'ılık sal'), satir('Solelli', 'kale')])))).toEqual([
            'bölüm 1 (Sol el kelimeleri): "k" sol elde değil',
            'bölüm 1 (Sol el kelimeleri): "l" sol elde değil',
            'bölüm 1 (Sol el kelimeleri): "6" sol elde değil',
            'bölüm 2 (Sağ El: kelimeler): "s" sağ elde değil',
            'bölüm 2 (Sağ El: kelimeler): "a" sağ elde değil',
        ]);
    });

    test('tam kurs: 7 kısım, 90–110 bölüm, dört oyun ≥ 2', () => {
        const govde = Array.from({ length: 84 }, (_, i) => satir('S' + i, 'fj'));
        const iyi = [...govde, ...OYUN_ADLARI.flatMap((o) => [oyun(o), oyun(o)])];          // 92 bölüm
        expect(ICERIK_DENETCI.tamKurs(bs(...Array.from({ length: 7 }, (_, i) => k(iyi.slice(i * 13, i === 6 ? undefined : (i + 1) * 13)))), 7)).toEqual([]);
        expect(ICERIK_DENETCI.tamKurs(bs(k([...govde.slice(0, 80), oyun('balon'), oyun('elma')])), 6)).toEqual([
            'kısım sayısı 6 ≠ 7', 'bölüm sayısı 82 ∉ [90, 110]', 'balon 1 kez (en az 2)', 'canavar 0 kez (en az 2)', 'baloncuk 0 kez (en az 2)', 'elma 1 kez (en az 2)',
        ]);
    });
});

test.describe('ON_PARMAK_ICERIK — içerik kuralları (tarayıcısız)', () => {
    const bolumler = () => icerikBolumleri(loadIcerik());
    const etiket = bolumEtiketi;

    const OYUNLAR = ['balon', 'canavar', 'baloncuk', 'elma'];
    const HARF_OYUNLARI = ['balon'];        // diğerleri kelime oyunu

    test('şema: kısım alanları, tur kutu|satir|oyun, oyun adı 4 oyundan biri, metin dolu', () => {
        const icerik = loadIcerik();
        expect(Array.isArray(icerik)).toBe(true);
        expect(icerik.length).toBeGreaterThan(0);
        for (const k of icerik) {
            expect(typeof k.ad).toBe('string');
            expect(typeof k.ornek).toBe('string');
            expect(k.hedefHiz).toBeGreaterThan(0);
            expect(typeof k.el).toBe('boolean');
            expect(k.bolumler.length).toBeGreaterThan(0);
        }
        for (const x of bolumler()) {
            expect(['kutu', 'satir', 'oyun'], etiket(x)).toContain(x.b.tur);
            if (x.b.tur === 'oyun') expect(OYUNLAR, etiket(x)).toContain(x.b.oyun);
            else expect(x.b.oyun, etiket(x)).toBeUndefined();
            expect(typeof x.b.ad, etiket(x)).toBe('string');
            expect(x.b.metin.length, etiket(x)).toBeGreaterThan(0);
            // Kutu: yeni tuş(lar) ya da yalnız Shift tanıtımı (yeni: [] + yeniShift; sapma 11)
            if (x.b.tur === 'kutu') expect(Array.isArray(x.b.yeni) && (x.b.yeni.length > 0 || !!x.b.yeniShift), etiket(x)).toBe(true);
        }
    });

    test('her karakter dizilimde yazılabilir', () => {
        for (const x of bolumler()) {
            for (const ch of x.b.metin) expect(D.yazilabilir(ch), `${etiket(x)} "${ch}"`).toBe(true);
        }
    });

    test('birikimli öğrenilmiş küme dışında karakter yok', () => {
        for (const x of bolumler()) {
            for (const ch of x.b.metin) expect(x.ogrenilen.has(ch), `${etiket(x)} "${ch}" henüz öğrenilmedi`).toBe(true);
        }
    });

    test('kutu 21–35 karakter; satır ≥ 50 ve ≤ hedefHiz × 10 (kutuda hedef 8); oyun ≤ hedefHiz × 10', () => {
        for (const x of bolumler()) {
            const n = [...x.b.metin].length;
            if (x.b.tur === 'kutu') {
                expect(n, etiket(x)).toBeGreaterThanOrEqual(21);
                expect(n, etiket(x)).toBeLessThanOrEqual(35);
            } else if (x.b.tur === 'satir') {
                expect(n, etiket(x)).toBeGreaterThanOrEqual(50);
                expect(n, etiket(x)).toBeLessThanOrEqual(x.hedefHiz * 10);
            } else {
                expect(n, etiket(x)).toBeLessThanOrEqual(x.hedefHiz * 10);
            }
        }
    });

    test('oyun metni: harf oyununda boşluksuz ≥ 20 harf; kelime oyununda ≥ 8 kelime', () => {
        for (const x of bolumler().filter((y) => y.b.tur === 'oyun')) {
            if (HARF_OYUNLARI.includes(x.b.oyun)) {
                expect(x.b.metin.includes(' '), etiket(x)).toBe(false);
                expect([...x.b.metin].length, etiket(x)).toBeGreaterThanOrEqual(20);
            } else {
                expect(x.b.metin.split(' ').length, etiket(x)).toBeGreaterThanOrEqual(8);
            }
        }
    });

    test('kutu bölümünün yeni tuşları kendi metninde geçer', () => {
        for (const x of bolumler().filter((y) => y.b.tur === 'kutu')) {
            for (const k of x.b.yeni) expect(x.b.metin.includes(k), `${etiket(x)} yeni "${k}"`).toBe(true);
        }
    });

    test('metinde baştaki/sondaki boşluk ve çift boşluk yok', () => {
        for (const x of bolumler()) {
            expect(x.b.metin, etiket(x)).toBe(x.b.metin.trim());
            expect(x.b.metin.includes('  '), etiket(x)).toBe(false);
        }
    });

    test('metin ve bölüm adı NFC (birleşik harf yok: kod noktası okuma = ekrandaki harf)', () => {
        for (const x of bolumler()) {
            expect(x.b.metin === x.b.metin.normalize('NFC'), etiket(x)).toBe(true);
            expect(x.b.ad === x.b.ad.normalize('NFC'), etiket(x)).toBe(true);
        }
    });

    test('çocuğa uygunsuz sözcük yok (yasak kök/tam liste, çekimli biçimler dahil; metin ve bölüm adındaki her sözcük)', () => {
        expect(ICERIK_DENETCI.yasak(bolumler())).toEqual([]);
    });

    test('Q, W, X yalnız adı o harfi anan tanıtım/tekrar bölümünde', () => {
        expect(ICERIK_DENETCI.qwx(bolumler())).toEqual([]);
    });

    test('büyük harf ve Shift\'li işaret yalnız gerektirdiği Shift tanıtıldıktan sonra; yeniShift bölümü kutu + örnek büyük harf', () => {
        expect(ICERIK_DENETCI.shiftSirasi(bolumler())).toEqual([]);
    });

    test('tek el bölümlerinde ("sol el" / "sağ el") harf ve rakam yalnız o elde (boşluk, noktalama serbest)', () => {
        expect(ICERIK_DENETCI.tekEl(bolumler())).toEqual([]);
    });

    test('tam kurs (YALNIZ data/games.json levels === 7): 7 kısım, 90–110 bölüm, dört oyunun her biri ≥ 2', () => {
        const levels = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8')).games.find((g) => g.slug === 'on-parmak').levels;
        test.skip(levels !== 7, `levels ${levels}: kurs henüz tamamlanmadı (Kısım 2–7 içerik görevleri)`);
        expect(ICERIK_DENETCI.tamKurs(bolumler(), loadIcerik().length)).toEqual([]);
    });

    test('Kısım 1 (Orta sıra): el açık, hedefHiz 8; Balon Vadisi "D K tekrar" ve "İlk kelimeler"den, Uçan Baloncuklar "G H tekrar ve kelimeler"den sonra, Canavar Saldırısı kısım sonunda', () => {
        const k1 = loadIcerik()[0];
        expect(k1.ad).toBe('Orta sıra');
        expect(k1.hedefHiz).toBe(8);
        expect(k1.el).toBe(true);
        const oyunlar = k1.bolumler.map((b, i) => ({ b, onceki: k1.bolumler[i - 1] })).filter((x) => x.b.tur === 'oyun');
        expect(oyunlar.map((x) => [x.onceki.ad, x.b.oyun, x.b.ad])).toEqual([
            ['D K tekrar', 'balon', 'Balon Vadisi: F J D K'],
            ['İlk kelimeler', 'balon', 'Balon Vadisi: ilk sekiz tuş'],
            ['G H tekrar ve kelimeler', 'baloncuk', 'Uçan Baloncuklar: orta sıra'],
            ['Orta sıra kelimeleri', 'canavar', 'Canavar Saldırısı: orta sıra kelimeleri'],
        ]);
        expect(k1.bolumler[k1.bolumler.length - 1].oyun).toBe('canavar');
    });

    test('Kısım 1 yeni tuş sırası: f j, boşluk, d k, s l, a ş, g h, i ,', () => {
        const yeniler = loadIcerik()[0].bolumler.filter((b) => b.tur === 'kutu').map((b) => b.yeni.join(''));
        expect(yeniler).toEqual(['fj', ' ', 'dk', 'sl', 'aş', 'gh', 'i,']);
    });

    test('kayıt: içerikte geçen her oyun adının dosyası files.js içinde (js/games/on-parmak-<ad>.js), modülden önce', () => {
        const kayit = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8')).games.find((g) => g.slug === 'on-parmak');
        const modul = kayit.files.js.indexOf('js/games/on-parmak.js');
        const adlar = new Set(bolumler().filter((x) => x.b.tur === 'oyun').map((x) => x.b.oyun));
        expect(adlar.size).toBeGreaterThan(0);
        for (const ad of adlar) {
            const dosya = 'js/games/on-parmak-' + ad + '.js';
            const i = kayit.files.js.indexOf(dosya);
            expect(i, dosya).toBeGreaterThanOrEqual(0);
            expect(i, dosya).toBeLessThan(modul);
            expect(fs.existsSync(path.join(ROOT, dosya)), dosya).toBe(true);
        }
    });

    test('kayıt: data/games.json levels = ON_PARMAK_ICERIK.length; kapalı; dosya sırası dizilim → ölçüm → içerik → ekran → oyun ortak → oyunlar → modül', () => {
        const kayit = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8')).games.find((g) => g.slug === 'on-parmak');
        expect(kayit, 'on-parmak kaydı').toBeTruthy();
        expect(kayit.levels).toBe(loadIcerik().length);
        expect(kayit.active).toBe(false);
        expect(kayit.module).toBe('OnParmak');
        expect(kayit.files.js).toEqual(['js/games/klavye-dizilim.js', 'js/games/on-parmak-olcum.js', 'js/games/on-parmak-icerik.js',
            'js/games/on-parmak-ekran.js', 'js/games/on-parmak-oyun-ortak.js', 'js/games/on-parmak-balon.js', 'js/games/on-parmak-canavar.js',
            'js/games/on-parmak-baloncuk.js', 'js/games/on-parmak-elma.js', 'js/games/on-parmak.js']);
        expect(kayit.files.css).toEqual(['css/on-parmak.css']);
    });

    test('boşluk öğrenildikten sonra her satır birden çok sözcük içerir', () => {
        for (const x of bolumler().filter((y) => y.b.tur === 'satir' && y.ogrenilen.has(' '))) {
            expect(x.b.metin.split(' ').length, etiket(x)).toBeGreaterThanOrEqual(5);
        }
    });
});

// ── Ekran: klavye + eller tek SVG (js/games/on-parmak-ekran.js, TARAYICI) ──
// Fikstür dosyası yok: düz bir sayfaya (404.html, hub'sız) dizilim + ekran modülü + CSS eklenir, olustur() bir kapta çağrılır.
test.describe('OnParmakEkran — klavye + eller (tarayıcı)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/404.html');
        await page.addStyleTag({ url: '/css/on-parmak.css' });
        await page.addScriptTag({ url: '/js/games/klavye-dizilim.js' });
        await page.addScriptTag({ url: '/js/games/on-parmak-ekran.js' });
        await page.evaluate(() => {
            const kap = document.createElement('div');
            kap.id = 'kap';
            kap.style.width = '900px';
            document.body.prepend(kap);
            window.__basilan = [];
            window.__ekran = window.OnParmakEkran.olustur(kap, {
                el: true, klavye: true, basinca: (ch) => window.__basilan.push(ch),
            });
        });
    });

    const hedefler = (page) => page.evaluate(() => ({
        tuslar: [...document.querySelectorAll('#kap [data-code].is-hedef')].map((g) => g.dataset.code).sort(),
        parmaklar: [...document.querySelectorAll('#kap [data-parmak].is-hedef')].map((p) => p.dataset.parmak).sort(),
    }));

    test('tek SVG: dizilimdeki her tuş (pasif < > dahil) + Boşluk + iki Shift; 10 parmak yolu; el katmanı tıklanmaz', async ({ page }) => {
        const r = await page.evaluate(() => {
            const kap = document.getElementById('kap');
            const D = window.KlavyeDizilim;
            const beklenen = D.SATIRLAR.flat().map((t) => t.code).concat(['Space', 'ShiftLeft', 'ShiftRight']).sort();
            const kodlar = [...kap.querySelectorAll('[data-code]')].map((g) => g.dataset.code).sort();
            const el = kap.querySelector('.op-eller');
            return {
                svgSayisi: kap.querySelectorAll('svg').length,
                beklenen, kodlar,
                parmaklar: [...kap.querySelectorAll('[data-parmak]')].map((p) => p.dataset.parmak).sort(),
                elPointer: getComputedStyle(el).pointerEvents,
                elSvgde: el.ownerSVGElement === kap.querySelector('svg'),
            };
        });
        expect(r.svgSayisi).toBe(1);
        expect(r.kodlar).toEqual(r.beklenen);
        expect(r.parmaklar).toEqual(['basparmak', 'basparmak', 'sag-isaret', 'sag-orta', 'sag-serce', 'sag-yuzuk',
            'sol-isaret', 'sol-orta', 'sol-serce', 'sol-yuzuk']);
        expect(r.elPointer).toBe('none');
        expect(r.elSvgde).toBe(true);
    });

    test('tuş etiketleri: harf küçük, rakam/noktalama iki yüzlü, " ve - görünür, pasif < > işaretli', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yazi = (code) => [...document.querySelectorAll(`#kap .op-etiket[data-etiket="${code}"] text`)]
                .map((t) => t.textContent).sort();
            return {
                f: yazi('KeyF'), i: yazi('Quote'), bir: yazi('Digit1'), tirnak: yazi('Backquote'), eksi: yazi('Equal'),
                pasif: document.querySelector('#kap [data-code="IntlBackslash"]').classList.contains('is-pasif'),
            };
        });
        expect(r.f).toEqual(['f']);
        expect(r.i).toEqual(['i']);
        expect(r.bir).toEqual(['!', '1']);
        expect(r.tirnak).toEqual(['"', 'é']);
        expect(r.eksi).toEqual(['-', '_']);
        expect(r.pasif).toBe(true);
    });

    test('vurgula: sıradaki tuş + parmak; Shift\'li karakterde karşı Shift + karşı serçe; boşlukta iki başparmak', async ({ page }) => {
        await page.evaluate(() => window.__ekran.vurgula('f'));
        expect(await hedefler(page)).toEqual({ tuslar: ['KeyF'], parmaklar: ['sol-isaret'] });

        await page.evaluate(() => window.__ekran.vurgula('F'));
        expect(await hedefler(page)).toEqual({ tuslar: ['KeyF', 'ShiftRight'], parmaklar: ['sag-serce', 'sol-isaret'] });

        await page.evaluate(() => window.__ekran.vurgula('Ş'));
        expect(await hedefler(page)).toEqual({ tuslar: ['Semicolon', 'ShiftLeft'], parmaklar: ['sag-serce', 'sol-serce'] });

        await page.evaluate(() => window.__ekran.vurgula('ı'));
        expect(await hedefler(page)).toEqual({ tuslar: ['KeyI'], parmaklar: ['sag-orta'] });

        await page.evaluate(() => window.__ekran.vurgula(' '));
        expect(await hedefler(page)).toEqual({ tuslar: ['Space'], parmaklar: ['basparmak', 'basparmak'] });

        await page.evaluate(() => window.__ekran.vurgula(null));
        expect(await hedefler(page)).toEqual({ tuslar: [], parmaklar: [] });
    });

    test('bas: doğru basış kısa süre is-down, yanlış is-yanlis; sonra kendiliğinden söner', async ({ page }) => {
        await page.evaluate(() => { window.__ekran.bas('f', true); window.__ekran.bas('j', false); });
        const sinif = (code) => page.evaluate((c) => document.querySelector(`#kap [data-code="${c}"]`).getAttribute('class'), code);
        expect(await sinif('KeyF')).toContain('is-down');
        expect(await sinif('KeyJ')).toContain('is-yanlis');
        await expect.poll(() => sinif('KeyF')).not.toContain('is-down');
        await expect.poll(() => sinif('KeyJ')).not.toContain('is-yanlis');
    });

    test('dokunma: tuşa basış basinca(karakter) çağırır; el katmanı geçirgen; pasif < > ve Shift tepkisiz', async ({ page }) => {
        // Gerçek tıklama: Playwright noktadaki en üst öğenin tuş olduğunu doğrular → el/etiket katmanı engellerse düşer
        await page.locator('#kap [data-code="KeyA"]').click();      // sol serçe ucunun altında
        await page.locator('#kap [data-code="KeyJ"]').click();      // sağ işaret ucunun altında
        await page.locator('#kap [data-code="Digit1"]').click();
        await page.locator('#kap [data-code="Space"]').click({ position: { x: 40, y: 10 } });
        await page.locator('#kap [data-code="IntlBackslash"]').click();
        await page.locator('#kap [data-code="ShiftLeft"]').click();
        expect(await page.evaluate(() => window.__basilan)).toEqual(['a', 'j', '1', ' ']);
    });

    test('alt sıra hedefi ellerin ÜSTÜNDE yanar (vurgu katmanı eller ile etiketler arasında); basış da', async ({ page }) => {
        for (const [ch, code] of [['c', 'KeyC'], ['m', 'KeyM'], ['ç', 'Period'], ['f', 'KeyF']]) {
            const r = await page.evaluate(([c, kod]) => {
                window.__ekran.vurgula(c);
                const svg = document.querySelector('#kap svg');
                const katman = (sec) => [...svg.children].indexOf(svg.querySelector(sec));
                const v = svg.querySelector(`.op-vurgu[data-vurgu="${kod}"]`);
                const k = svg.querySelector(`[data-code="${kod}"] .op-tus__kapak`).getBBox();
                const vb = v.querySelector('.op-vurgu__kapak').getBBox();
                const kx = k.x + k.width / 2, ky = k.y + k.height / 2;
                return {
                    sira: [katman('.op-tuslar'), katman('.op-eller'), katman('.op-vurgular'), katman('.op-etiketler')],
                    gorunur: getComputedStyle(v).display !== 'none' && v.getBoundingClientRect().width > 0,
                    ortada: kx >= vb.x && kx <= vb.x + vb.width && ky >= vb.y && ky <= vb.y + vb.height,
                    gorunenler: [...svg.querySelectorAll('.op-vurgu')].filter((x) => getComputedStyle(x).display !== 'none')
                        .map((x) => x.dataset.vurgu),
                };
            }, [ch, code]);
            expect(r.sira[0] < r.sira[1] && r.sira[1] < r.sira[2] && r.sira[2] < r.sira[3], `${ch} katman sırası ${r.sira}`).toBe(true);
            expect(r.gorunur, ch).toBe(true);
            expect(r.ortada, ch).toBe(true);
            expect(r.gorunenler, ch).toEqual([code]);
        }
        await page.evaluate(() => { window.__ekran.vurgula(null); window.__ekran.bas('b', false); });
        expect(await page.evaluate(() => [...document.querySelectorAll('#kap .op-vurgu')]
            .filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.dataset.vurgu))).toEqual(['KeyB']);
    });

    test('dokunma: birincil olmayan düğme (sağ tık) tepkisiz', async ({ page }) => {
        await page.locator('#kap [data-code="KeyA"]').click({ button: 'right' });
        await page.locator('#kap [data-code="KeyA"]').click({ button: 'middle' });
        expect(await page.evaluate(() => window.__basilan)).toEqual([]);
    });

    test('parmak uçları orta sıra tuşlarının üstünde (A S D F · J K L Ş), başparmaklar Boşlukta', async ({ page }) => {
        const r = await page.evaluate(() => {
            const kap = document.getElementById('kap');
            const kutu = (code) => kap.querySelector(`[data-code="${code}"] .op-tus__kapak`).getBBox();
            const uc = (sec) => kap.querySelector(sec).getBBox();
            const cift = [
                ['sol-serce', 'KeyA'], ['sol-yuzuk', 'KeyS'], ['sol-orta', 'KeyD'], ['sol-isaret', 'KeyF'],
                ['sag-isaret', 'KeyJ'], ['sag-orta', 'KeyK'], ['sag-yuzuk', 'KeyL'], ['sag-serce', 'Semicolon'],
            ];
            const sonuc = cift.map(([p, code]) => {
                const b = uc(`[data-parmak="${p}"]`);
                const k = kutu(code);
                const kx = k.x + k.width / 2;
                // ucun tepesi tuşun içinde ve tuşun ortası parmağın yatay aralığında
                return [p, b.y >= k.y && b.y <= k.y + k.height && kx >= b.x && kx <= b.x + b.width];
            });
            const bosluk = kutu('Space');
            const bas = [...kap.querySelectorAll('[data-parmak="basparmak"]')].map((p) => {
                const b = p.getBBox();
                return b.y >= bosluk.y && b.y <= bosluk.y + bosluk.height && b.x + b.width / 2 >= bosluk.x
                    && b.x + b.width / 2 <= bosluk.x + bosluk.width;
            });
            return { sonuc, bas };
        });
        for (const [p, ok] of r.sonuc) expect(ok, p).toBe(true);
        expect(r.bas).toEqual([true, true]);
    });

    test('goster: el ve klavye ayrı ayrı gizlenir; ikisi kapalıysa ekran hiç yer kaplamaz', async ({ page }) => {
        const gorunur = () => page.evaluate(() => {
            const kap = document.getElementById('kap');
            const g = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
            return { svg: g(kap.querySelector('svg')), el: g(kap.querySelector('.op-eller')), tus: g(kap.querySelector('[data-code="KeyF"]')) };
        });
        expect(await gorunur()).toEqual({ svg: true, el: true, tus: true });
        await page.evaluate(() => window.__ekran.goster({ el: false, klavye: true }));
        expect(await gorunur()).toEqual({ svg: true, el: false, tus: true });
        await page.evaluate(() => window.__ekran.goster({ el: false, klavye: false }));
        expect((await gorunur()).svg).toBe(false);
        await page.evaluate(() => window.__ekran.goster({ el: true, klavye: true }));
        expect(await gorunur()).toEqual({ svg: true, el: true, tus: true });
    });

    test('yokEt: DOM temizlenir, bekleyen söndürme zamanlayıcısı kopuk düğüme yazmaz, dinleyici kalmaz', async ({ page }) => {
        const r = await page.evaluate(async () => {
            const kap = document.getElementById('kap');
            const tus = kap.querySelector('[data-code="KeyA"]');
            window.__ekran.bas('a', true);
            window.__ekran.yokEt();
            const bos = kap.childNodes.length === 0;
            await new Promise((res) => setTimeout(res, 700));
            tus.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            return { bos, sinif: tus.getAttribute('class'), basilan: window.__basilan.length };
        });
        expect(r.bos).toBe(true);
        expect(r.sinif).toContain('is-down');     // söndürme iptal edildi: kopuk düğüme dokunulmadı
        expect(r.basilan).toBe(0);
    });
});

// ── Oyun modülü (js/games/on-parmak.js, TARAYICI) ──
// Kapalı oyun (active:false) hiçbir yoldan açılmaz → test bağlamında js/catalog.js yanıtı yamalanır: yalnız on-parmak
// satırında "active":false → true (üretim kodu değişmez; hash'li çıktıda ?h= de eşleşir). Derin bağlantı kilidi atlar.
// Sahte Firebase + misafir tohumu + gstatic engeli tests/klavye-kasifi.spec.js kalıbı. Görev 6 bu fikstürü genişletir.
const { getActiveSlugs } = require('./helpers/slugs');
const { seedGuest } = require('./helpers/guest-seed');

const OP_FIREBASE_STUB = `(() => {
    const ref = (p) => ({
        on(ev, cb) { if (p === 'adminConfig') setTimeout(() => cb({ val: () => ({}) }), 0); },
        off() {}, once() { return Promise.resolve({ val: () => null }); },
        set() { return Promise.resolve(); }, update() { return Promise.resolve(); },
        orderByChild() { return this; }, endAt() { return this; }, limitToFirst() { return this; },
    });
    const auth = () => ({ onAuthStateChanged(cb) { setTimeout(() => cb(null), 0); }, signOut() { return Promise.resolve(); } });
    auth.GoogleAuthProvider = function () {};
    window.firebase = { initializeApp() {}, database() { return { ref }; }, auth };
})();`;
// Fiziksel basış taklidi: karakterin TR Q konumu (KlavyeDizilim.tusOf) → keydown { key, code, shiftKey, CapsLock }.
// __opType(ch, 'tr'|'us', { caps }): 'tr' = e.key Türkçe kapaktaki karakter; 'us' = AYNI fiziksel tuşun İngilizce
// dizilimdeki e.key'i (ı→'i', i→"'", ş→';', ğ→'[', ü→']', ö→',', ç→'.', .→'/', ,→'\\').
const OP_TYPER = `(() => {
    const US = { Backquote: ['\`', '~'], Minus: ['-', '_'], Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
        Semicolon: [';', ':'], Quote: ["'", '"'], Backslash: ['\\\\', '|'], Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'], Space: [' ', ' '] };
    const RAKAM_UST = ')!@#$%^&*(';
    const usKey = (code, shift) => {
        if (code.indexOf('Key') === 0) return shift ? code.slice(3) : code.slice(3).toLowerCase();
        if (code.indexOf('Digit') === 0) return shift ? RAKAM_UST[Number(code.slice(5))] : code.slice(5);
        return US[code] ? US[code][shift ? 1 : 0] : '';
    };
    window.__opType = (ch, layout, opt) => {
        const o = opt || {};
        const t = window.KlavyeDizilim.tusOf(ch);
        const shift = !!(t && t.shift);
        const key = layout === 'us' && t ? usKey(t.code, shift) : ch;
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key, code: t ? t.code : '', shiftKey: shift, modifierCapsLock: !!o.caps,
            repeat: !!o.repeat, bubbles: true, cancelable: true,
        }));
    };
    window.__opBas = (ch, opt) => window.__opType(ch, 'tr', opt);
    // Ham tuş: { key, code } aynen (Numpad, CapsLock, Backspace, Enter, yanlış fiziksel tuş …)
    window.__opTus = (key, code, opt) => {
        const o = opt || {};
        document.dispatchEvent(new KeyboardEvent('keydown', { key, code, modifierCapsLock: !!o.caps, bubbles: true, cancelable: true }));
    };
})();`;
// document 'keydown' ve 'visibilitychange' dinleyici defteri: addEventListener/removeEventListener sarmalı
// (aynı tür+işlev+capture tek kayıt)
const OP_DINLEYICI = `(() => {
    const IZLENEN = ['keydown', 'visibilitychange'];
    const defter = [];
    const kayit = (t, f, o) => ({ t, f, c: typeof o === 'boolean' ? o : !!(o && o.capture) });
    const ayni = (a, b) => a.t === b.t && a.f === b.f && a.c === b.c;
    const ekle = document.addEventListener.bind(document);
    const sil = document.removeEventListener.bind(document);
    document.addEventListener = function (t, f, o) {
        if (IZLENEN.includes(t) && f) { const k = kayit(t, f, o); if (!defter.some((x) => ayni(x, k))) defter.push(k); }
        return ekle(t, f, o);
    };
    document.removeEventListener = function (t, f, o) {
        if (IZLENEN.includes(t) && f) { const k = kayit(t, f, o); const i = defter.findIndex((x) => ayni(x, k)); if (i >= 0) defter.splice(i, 1); }
        return sil(t, f, o);
    };
    window.__opKeydownSayisi = () => defter.filter((x) => x.t === 'keydown').length;
    window.__opDinleyiciSayisi = (t) => defter.filter((x) => x.t === t).length;
})();`;
const OP_SLUG = 'on-parmak';
const opLockKeys = (() => {
    const { solo, online } = getActiveSlugs();
    return [...solo, OP_SLUG, ...online.map((s) => 'mp:' + s)];
})();

// Fikstür fabrikası. parcali: ikinci test kısmı eklenir (içerik dosyası yanıtına) ve katalogda levels 2 olur —
// kısım geçişi (onLevelUp) üretimde tek kısım varken sınanamaz (sapma 6).
const OP_TEST_KISIM = "window.ON_PARMAK_ICERIK.push({ ad: 'Deneme kısmı', ornek: 'F J', hedefHiz: 8, el: true, bolumler: "
    + "[ { tur: 'satir', ad: 'Deneme satırı', metin: 'fj jf fj jf fj jf fj jf fj jf' } ] });\n";
// Elma Bekçisi Kısım 1'de yok (Adım 3'te Kısım 2'de ilk kez) → oyun bu fikstürle sınanır: ikinci test kısmı = Elma bölümü
// + ardından bir satır (kaybedince akışın sürdüğü görülsün). Kelimeler orta sıradan; f/j hiçbir kelimenin ilk harfi değil.
// Sıra testlere göre seçildi: 0 "hala" görünür başlar, 1 "dal" kenardan girer (ilk harfi farklı → giriş bitmeden seçilemez),
// 2 "kasa" ve 3 "kaş" aynı ilk harf (ağaca en yakın olan kilitlenmeli).
const OP_ELMA_METIN = 'hala dal kasa kaş saha gaga şal ada sakal lala';
const OP_TEST_ELMA = "window.ON_PARMAK_ICERIK.push({ ad: 'Deneme: Elma', ornek: 'F J', hedefHiz: 8, el: true, bolumler: "
    + "[ { tur: 'oyun', ad: 'Elma Bekçisi: deneme', oyun: 'elma', metin: '" + OP_ELMA_METIN + "' }, "
    + "{ tur: 'satir', ad: 'Deneme satırı', metin: 'fj jf fj jf fj jf fj jf fj jf' } ] });\n";
// Bilinmeyen oyun adı (güvenlik notu M3): miras ad 'constructor' ve olmayan 'yok' → console.error + bölüm atlanır
const OP_TEST_BILINMEZ = "window.ON_PARMAK_ICERIK.push({ ad: 'Deneme: bilinmez', ornek: 'F J', hedefHiz: 8, el: true, bolumler: "
    + "[ { tur: 'oyun', ad: 'Miras ad', oyun: 'constructor', metin: 'fj jf' }, { tur: 'oyun', ad: 'Olmayan oyun', oyun: 'yok', metin: 'fj jf' }, "
    + "{ tur: 'satir', ad: 'Deneme satırı', metin: 'fj jf fj jf fj jf fj jf fj jf' } ] });\n";
// Shift ve geniş glif (Adım 3 görev 1): içerikte henüz büyük harf/işaret yok → 2. test kısmı. Sırayla: sol Shift tanıtımı,
// sağ Shift tanıtımı, Shift'li işaretler kutusu ('?' tanıtımı + büyük harf, rakam satırının Shift'lileri, : ; ' " - ),
// geniş glifli + Shift'li uzun satır (375 px'te taşma; tek sözcük satırdan uzun: harf harf bölünür).
const OP_SHIFT_KUTU = "A? Jk! (8) Ğ: Ş; 'İ' \"ö\" -I";
const OP_SHIFT_SATIR = 'MMMMMM WWWWWW ĞĞĞĞĞĞ ŞŞŞŞŞŞ mmmmmmm wwwwwww ğğğğğğ şşşşşş MĞŞW? (ŞMW) "Ğm" Ş: Ww; '
    + "M'ğ! WWWWWWWWWWWWWWWWWWWWWWWWWWWW ĞŞMW ŞŞMM - WMĞŞ WMĞŞ WMĞŞ WMĞŞ Mm Ww Ğğ Şş";
const OP_TEST_SHIFT = 'window.ON_PARMAK_ICERIK.push(' + JSON.stringify({ ad: 'Deneme: Shift', ornek: 'J K', hedefHiz: 10, el: false, bolumler: [
    { tur: 'kutu', ad: 'Sol Shift', yeni: [], yeniShift: 'sol', metin: 'Jj Kk Ll Jk Kl Lj Jj Kk Ll' },
    { tur: 'kutu', ad: 'Sağ Shift', yeni: [], yeniShift: 'sag', metin: 'Ff Dd Ss Fd Ds Sf Ff Dd Ss' },
    { tur: 'kutu', ad: 'Shift işaretleri', yeni: ['?'], metin: OP_SHIFT_KUTU },
    { tur: 'satir', ad: 'Geniş harfler', metin: OP_SHIFT_SATIR },
] }) + ');\n';
function opTestKur({ parcali = false, elma = false, bilinmez = false, shift = false } = {}) {
    return test.extend({
        context: async ({ context }, use) => {
            await seedGuest(context, opLockKeys);
            await context.route(/https:\/\/www\.gstatic\.com\/firebasejs\//, (route) => route.abort());
            await context.route(/\/js\/catalog\.js(\?|$)/, async (route) => {
                const res = await route.fetch();
                const govde = (await res.text()).split('\n').map((satir) => {
                    if (!satir.includes('"slug":"on-parmak"')) return satir;
                    const yamali = satir.replace('"active":false', '"active":true');
                    // Fikstür bir kısım ekler → levels N → N + 1 (içerik kısım kazandıkça yama kendiliğinden uyar)
                    return parcali || elma || bilinmez || shift ? yamali.replace(/"levels":(\d+)/, (m, n) => '"levels":' + (Number(n) + 1)) : yamali;
                }).join('\n');
                await route.fulfill({ response: res, body: govde });
            });
            if (parcali || elma || bilinmez || shift) {
                const ek = elma ? OP_TEST_ELMA : bilinmez ? OP_TEST_BILINMEZ : shift ? OP_TEST_SHIFT : OP_TEST_KISIM;
                await context.route(/\/js\/games\/on-parmak-icerik\.js(\?|$)/, async (route) => {
                    const res = await route.fetch();
                    await route.fulfill({ response: res, body: (await res.text()) + '\n' + ek });
                });
            }
            await context.addInitScript(OP_FIREBASE_STUB);
            await context.addInitScript(OP_TYPER);
            await context.addInitScript(OP_DINLEYICI);
            await use(context);
        },
        errors: async ({ page }, use) => {
            const pageErrors = [];
            const consoleErrors = [];
            page.on('pageerror', (err) => pageErrors.push(err.stack || String(err)));
            page.on('console', (msg) => {
                if (msg.type() !== 'error') return;
                const text = msg.text();
                if (/Failed to load resource|Kaynak yüklenemedi|net::ERR_FAILED/.test(text)) return;
                consoleErrors.push(text);
            });
            await use({
                assertClean() {
                    expect.soft(pageErrors, 'yakalanmamış JS hatası').toEqual([]);
                    expect.soft(consoleErrors, 'console.error').toEqual([]);
                },
            });
        },
    });
}
const opTest = opTestKur();
const opTestParcali = opTestKur({ parcali: true });
const opTestElma = opTestKur({ elma: true });
const opTestBilinmez = opTestKur({ bilinmez: true });
const opTestShift = opTestKur({ shift: true });

// Bölüm numaraları ve metinleri içerik dosyasından türer (sabit numara yok)
const OP_ICERIK = loadIcerik();
const OP_BOLUMLER = OP_ICERIK.flatMap((k, ki) => k.bolumler.map((b) => ({ ...b, kisim: ki })));
const OP_N = OP_BOLUMLER.length;
const opNo = (pred) => OP_BOLUMLER.findIndex(pred) + 1;
const OP_ILK_SATIR = opNo((b) => b.tur === 'satir');
const OP_ILK_VIRGUL = opNo((b) => b.tur === 'kutu' && b.yeni.includes(','));
const OP_SON = OP_ICERIK[0].bolumler.length;       // Kısım 1'in son bölümünün genel numarası

const opOyun = (page) => page.locator('.op-oyun');
const opPicker = (page) => page.locator('.op-picker');
const opOverlayAcik = (page) => page.evaluate(() => Dialog.isOpen(document.getElementById('level-complete')));

// Derin bağlantı → seçici (ilk odak Kısım 1 kartı). no yoksa Enter = baştan; no varsa o bölümün çipi
// hazirla(page): saat kurulduktan SONRA, sayfa yüklenmeden ÖNCE (ör. sahte rAF'ı saran addInitScript)
async function opAc(page, no, toplam = OP_N, hazirla = null) {
    await page.clock.install({ time: new Date('2026-10-19T09:00:00Z') });
    if (hazirla) await hazirla(page);
    await page.goto('/?oyun=' + OP_SLUG);
    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(page.locator('#splash-screen')).toBeHidden();
    await expect(opPicker(page)).toBeVisible();
    await expect(page.locator('.op-picker__kart[data-kisim="1"] .op-picker__kisim')).toBeFocused();
    if (no) await page.locator('.op-picker__bolum[data-bolum-sec="' + no + '"]').click();
    else await page.keyboard.press('Enter');
    await expect(opOyun(page)).toHaveAttribute('data-bolum', (no || 1) + '/' + toplam);
    await page.clock.pauseAt(new Date('2026-10-19T09:05:00Z'));
}

// Sıradaki beklenen karakterleri (data-beklenen) yazar; her basış arasında saat `ms` ilerler (son basıştan sonra
// ilerlemez). layout 'tr' | 'us'. Dönüş: basış sayısı
async function opYaz(page, mod, ms = 400, layout = 'tr', azami = 200) {
    let n = 0;
    for (; n < azami; n++) {
        const d = await opOyun(page).evaluate((r) => ({ mod: r.dataset.mod, ch: r.dataset.beklenen }));
        if (d.mod !== mod || !d.ch) break;
        const sonra = await page.evaluate(([ch, dz]) => { window.__opType(ch, dz); return document.querySelector('.op-oyun').dataset.mod; }, [d.ch, layout]);
        if (sonra !== mod) { n++; break; }          // bölüm bitti: saat ilerletilmez (şerit zamanlaması testte)
        if (ms) await page.clock.runFor(ms);
    }
    return n;
}

opTest.describe('OnParmak — oyun modülü (tarayıcı)', () => {
    opTest('seçici → tanıtım (yanlış tuş geçirmez) → kutu alıştırması → sonuç şeridi; konsol hatası 0', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page);
        const oyun = opOyun(page);

        // Tanıtım: f, sonra j; yanlış tuş ilerletmez ve sayılmaz
        await expect(oyun).toHaveAttribute('data-mod', 'tanitim');
        await expect(oyun).toHaveAttribute('data-beklenen', 'f');
        await expect(page.locator('.op-tanitim__cumle')).toContainText('sol işaret parmağınla');
        await page.evaluate(() => window.__opBas('j'));
        await expect(oyun).toHaveAttribute('data-beklenen', 'f');
        await page.evaluate(() => window.__opBas('f'));
        await expect(oyun).toHaveAttribute('data-beklenen', 'j');
        await expect(page.locator('.op-tanitim__cumle')).toContainText('sağ işaret parmağınla');
        await page.evaluate(() => window.__opBas('j'));

        // 1,2 sn "Şimdi alıştıralım" şeridi: basışlar yok sayılır
        await expect(oyun).toHaveAttribute('data-mod', 'serit');
        await expect(page.locator('.op-serit')).toContainText('Şimdi alıştıralım');
        await page.clock.runFor(1300);
        await expect(oyun).toHaveAttribute('data-mod', 'kutu');
        await expect(page.locator('.op-kutu')).toHaveCount(7);

        // Kutu: yanlış basış bekletir, kutu kırmızı + basılan karakter; düzeltilen kutu ✓ almaz
        await page.evaluate(() => window.__opBas('d'));
        const ilk = page.locator('.op-kutu[data-i="0"]');
        await expect(ilk).toHaveClass(/is-yanlis/);
        await expect(ilk.locator('.op-kutu__harf')).toHaveText('d');
        await page.evaluate(() => window.__opBas('f'));
        await expect(ilk).toHaveClass(/is-duzeltildi/);
        await expect(ilk.locator('.op-kutu__tik')).toHaveCount(0);

        // Kalanı hatasız: 24 karakterde 1 yanlış → doğruluk 23/25 = %92 → 2 yıldız (kutuda hız şartı yok)
        await opYaz(page, 'kutu');
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit')).toHaveClass(/is-acik/);
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm 1 tamam!');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %92');
        await expect(page.locator('.op-serit .op-yildiz.is-kazanildi')).toHaveCount(2);
        await page.clock.runFor(100);
        await expect(page.locator('.op-canli')).toContainText('3 üzerinden 2 yıldız');

        // Enter ilk 400 ms'de yok sayılır, sonra sıradaki bölüme geçirir
        await page.keyboard.press('Enter');
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
        await page.clock.runFor(400);
        await page.keyboard.press('Enter');
        await expect(oyun).toHaveAttribute('data-bolum', '2/' + OP_N);
        await expect(oyun).toHaveAttribute('data-mod', 'tanitim');
        await expect(oyun).toHaveAttribute('data-beklenen', ' ');
        errors.assertClean();
    });

    opTest('satır bölümü: canlı ölçüm, %80 altı "Bir daha deneyelim" + aynı bölüm baştan; Caps Lock açıkken basış sayılmaz', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page);
        await page.evaluate('GameEngine.startGame(OnParmak, 1)');   // dizge: test dosyasında oyun globalleri tanımsız (eslint)
        await page.locator('.op-picker__bolum[data-bolum-sec="' + OP_ILK_SATIR + '"]').click();
        const oyun = opOyun(page);
        await expect(oyun).toHaveAttribute('data-bolum', OP_ILK_SATIR + '/' + OP_N);
        await expect(oyun).toHaveAttribute('data-mod', 'satir');
        await expect(page.locator('.op-olcum')).toBeHidden();

        // Caps Lock: uyarı görünür, basış sayılmaz (imleç ilerlemez); kapanınca yazma sürer
        await page.evaluate(() => window.__opBas('f', { caps: true }));
        await expect(page.locator('.op-caps')).toBeVisible();
        await expect(page.locator('.op-harf.is-imlec')).toHaveCount(1);
        expect(await page.locator('.op-harf.is-dogru, .op-harf.is-yanlis').count()).toBe(0);
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: false }));
        await expect(page.locator('.op-caps')).toBeHidden();

        // Hep yanlış tuş (j yerine k, f yerine d …): imleç yine ilerler, ölçüm ilk basıştan sonra görünür
        await page.evaluate(() => window.__opBas('k'));
        await expect(page.locator('.op-olcum')).toBeVisible();
        await expect(page.locator('.op-harf').first()).toHaveClass(/is-yanlis/);
        for (let i = 0; i < 80; i++) {
            const mod = await oyun.getAttribute('data-mod');
            if (mod !== 'satir') break;
            await page.evaluate(() => window.__opBas('k'));
            await page.clock.runFor(300);
        }
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bir daha deneyelim');
        await expect(page.locator('.op-serit__alt')).toContainText('hedef %80');
        // Tekrar şeridinde hız gösterilmez (yalnız doğruluk ve hedef): ne şeritte ne arkadaki canlı ölçümde
        await expect(page.locator('.op-serit__alt')).not.toContainText('kelime/dk');
        await expect(page.locator('.op-olcum__oge--hiz')).toBeHidden();
        await expect(page.locator('.op-olcum__oge--dogruluk')).toBeVisible();
        await page.clock.runFor(100);
        await expect(page.locator('.op-canli')).not.toContainText('kelime');
        // ~2,5 sn sonra aynı bölüm baştan (tanıtım yok — satır bölümü), ölçüm sıfırlanır
        await page.clock.runFor(2500);
        await expect(oyun).toHaveAttribute('data-bolum', OP_ILK_SATIR + '/' + OP_N);
        await expect(oyun).toHaveAttribute('data-mod', 'satir');
        await expect(page.locator('.op-olcum')).toBeHidden();
        expect(await page.locator('.op-harf.is-yanlis').count()).toBe(0);
        errors.assertClean();
    });

    opTest('seçici: kısım kartları içerikten; ilk odak Kısım 1; bölüm çipi doğru bölümü ve başlığı açar', async ({ page, errors }) => {
        await opAc(page, 5);
        const oyun = opOyun(page);
        await expect(page.locator('.op-ilerleme__no')).toHaveText('Bölüm 5/' + OP_N);
        await expect(page.locator('.op-ilerleme__ad')).toHaveText(OP_BOLUMLER[4].ad);
        await expect(oyun).toHaveAttribute('data-kisim', '1');
        await expect(oyun).toHaveAttribute('data-tur', OP_BOLUMLER[4].tur);
        expect(await page.evaluate(() => GameEngine.getCurrentLevel())).toBe(1);

        // Seçici kartları ve çipleri içerik dizisinden türer
        await page.evaluate('GameEngine.startGame(OnParmak, 1)');
        await expect(opPicker(page)).toBeVisible();
        await expect(page.locator('.op-picker__kart')).toHaveCount(OP_ICERIK.length);
        await expect(page.locator('.op-picker__kart[data-kisim="1"] .op-picker__bolum')).toHaveCount(OP_ICERIK[0].bolumler.length);
        await expect(page.locator('.op-picker__kart[data-kisim="1"] .op-picker__kisim')).toBeFocused();
        errors.assertClean();
    });

    opTest('satır: yanlış harf işaretlenip ilerler; canlı hız/doğruluk görünür; Backspace ve Enter sayılmaz', async ({ page, errors }) => {
        opTest.setTimeout(60000);
        await opAc(page, OP_ILK_SATIR);
        const oyun = opOyun(page);
        await expect(oyun).toHaveAttribute('data-mod', 'satir');

        // Backspace / Enter / Numpad: ne ilerler ne sayılır (ölçüm başlamaz)
        await page.evaluate(() => {
            window.__opTus('Backspace', 'Backspace');
            window.__opTus('Enter', 'Enter');
            window.__opTus('4', 'Numpad4');
        });
        await expect(page.locator('.op-olcum')).toBeHidden();
        expect(await page.locator('.op-harf.is-dogru, .op-harf.is-yanlis').count()).toBe(0);
        await expect(page.locator('.op-harf').first()).toHaveClass(/is-imlec/);

        // Yanlış basış: harf kırmızı, imleç ilerler, ölçüm %0
        const hedef0 = await oyun.getAttribute('data-beklenen');
        const yanlis = hedef0 === 'k' ? 'd' : 'k';
        await page.evaluate((ch) => window.__opBas(ch), yanlis);
        await expect(page.locator('.op-harf').first()).toHaveClass(/is-yanlis/);
        await expect(page.locator('.op-harf').nth(1)).toHaveClass(/is-imlec/);
        await expect(page.locator('.op-olcum')).toBeVisible();
        await expect(page.locator('.op-olcum__deger').nth(1)).toHaveText('%0');

        // Saat ilerler, doğru basış: doğruluk 1/2 = %50; hız 2 karakter / 1,1 sn = 21,8 → ekranda 21 (Math.floor, yuvarlanmaz)
        await page.clock.runFor(1100);
        const hedef1 = await oyun.getAttribute('data-beklenen');
        await page.evaluate((ch) => window.__opBas(ch), hedef1);
        await expect(page.locator('.op-harf').nth(1)).toHaveClass(/is-dogru/);
        await expect(page.locator('.op-olcum__deger').nth(1)).toHaveText('%50');
        await expect(page.locator('.op-olcum__deger').first()).toHaveText('21');

        // Yazma sırasında Backspace/Enter hâlâ sayılmaz
        await page.evaluate(() => { window.__opTus('Backspace', 'Backspace'); window.__opTus('Enter', 'Enter'); });
        await expect(page.locator('.op-olcum__deger').nth(1)).toHaveText('%50');
        await expect(page.locator('.op-harf').nth(2)).toHaveClass(/is-imlec/);
        errors.assertClean();
    });

    opTest('sonuç şeridi page.clock ile kendiliğinden geçer (2,5 sn) ve sıradaki bölüm başlar', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_ILK_SATIR);
        const oyun = opOyun(page);
        await opYaz(page, 'satir', 100);
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit')).toHaveClass(/is-acik/);
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm ' + OP_ILK_SATIR + ' tamam!');
        // Sonuç hızı Math.floor ile (ham değer kararda): n karakter, basışlar arası 100 ms → (n/5) / ((n−1)·100 ms)
        const n = OP_BOLUMLER[OP_ILK_SATIR - 1].metin.length;
        const hizHam = (n / 5) / (((n - 1) * 100) / 60000);
        expect(hizHam % 1).not.toBe(0);
        await expect(page.locator('.op-serit__alt')).toContainText(Math.floor(hizHam) + ' kelime/dk');
        await page.clock.runFor(2400);
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');             // henüz kalkmadı
        await page.clock.runFor(150);
        await expect(oyun).toHaveAttribute('data-bolum', (OP_ILK_SATIR + 1) + '/' + OP_N);
        await expect(page.locator('.op-serit')).not.toHaveClass(/is-acik/);
        errors.assertClean();
    });

    opTest('son bölüm → kutlama katmanı açılır; "Tekrar Oyna" (gerçek düğme) seçiciyi açar', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_N);
        const oyun = opOyun(page);
        await opYaz(page, OP_BOLUMLER[OP_N - 1].tur, 100);           // son bölüm (oyun ya da satır)
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
        expect(await opOverlayAcik(page)).toBe(false);
        await page.clock.runFor(400);
        await page.keyboard.press('Enter');                                   // Enter şeridi geçer
        await expect(oyun).toHaveAttribute('data-mod', 'bitti');
        await page.clock.runFor(500);                                         // motor 400 ms sonra katmanı açar
        await expect.poll(() => opOverlayAcik(page)).toBe(true);
        expect(await page.evaluate(() => Progress.getLevelStars('on-parmak', 1))).toBeGreaterThan(0);
        await expect(page.locator('#btn-next')).toBeHidden();                 // son (tek) seviye: "Sonraki Seviye" yok
        await page.locator('#btn-replay').click();
        await expect(opPicker(page)).toBeVisible();
        expect(await opOverlayAcik(page)).toBe(false);
        errors.assertClean();
    });

    opTest('Caps Lock açıkken doğru tuş bile sayılmaz (kutu); kapanınca yazma sürer', async ({ page, errors }) => {
        await opAc(page, OP_ILK_VIRGUL);
        const oyun = opOyun(page);
        await page.evaluate(() => { window.__opType('i', 'tr'); window.__opType(',', 'tr'); });   // tanıtım
        await page.clock.runFor(1300);
        await expect(oyun).toHaveAttribute('data-mod', 'kutu');
        const hedef = await oyun.getAttribute('data-beklenen');
        await page.evaluate((ch) => window.__opType(ch, 'tr', { caps: true }), hedef);
        await expect(page.locator('.op-caps')).toBeVisible();
        await expect(page.locator('.op-kutu[data-i="0"]')).toHaveClass(/is-etkin/);
        await expect(page.locator('.op-kutu[data-i="0"]')).not.toHaveClass(/is-(yanlis|dogru|duzeltildi)/);
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: false }));
        await expect(page.locator('.op-caps')).toBeHidden();
        await page.evaluate((ch) => window.__opType(ch, 'tr'), hedef);
        await expect(page.locator('.op-kutu[data-i="0"]')).toHaveClass(/is-dogru/);
        errors.assertClean();
    });

    opTest('İngilizce dizilim (TR kapak): kapaktaki tuş doğru, yanlış fiziksel tuş yanlış, Numpad yok sayılır', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_ILK_VIRGUL);
        const oyun = opOyun(page);

        // Tanıtım: i ("'" tuşu), sonra virgül (\ tuşu). Comma tuşu (e.key ',') virgül DEĞİL: Türkçe ö konumu
        await expect(oyun).toHaveAttribute('data-beklenen', 'i');
        await page.evaluate(() => window.__opType('i', 'us'));
        await expect(oyun).toHaveAttribute('data-beklenen', ',');
        await page.evaluate(() => window.__opTus(',', 'Comma'));
        await expect(oyun).toHaveAttribute('data-beklenen', ',');            // yanlış fiziksel tuş: ilerlemedi
        await page.evaluate(() => window.__opTus('4', 'Numpad4'));           // Numpad: yok sayıldı
        await page.evaluate(() => window.__opTus(',', 'NumpadComma'));
        await expect(oyun).toHaveAttribute('data-beklenen', ',');
        await page.evaluate(() => window.__opType(',', 'us'));
        await expect(oyun).toHaveAttribute('data-mod', 'serit');
        await page.clock.runFor(1300);
        await expect(oyun).toHaveAttribute('data-mod', 'kutu');

        // Kutu: Comma tuşu = ö → yanlış (kutuda basılan karakter ö görünür); Numpad sayılmaz
        await page.evaluate(() => { window.__opTus('4', 'Numpad4'); window.__opTus(',', 'NumpadComma'); });
        await expect(page.locator('.op-kutu[data-i="0"]')).not.toHaveClass(/is-yanlis/);
        await page.evaluate(() => window.__opTus(',', 'Comma'));
        await expect(page.locator('.op-kutu[data-i="0"]')).toHaveClass(/is-yanlis/);
        await expect(page.locator('.op-kutu[data-i="0"] .op-kutu__harf')).toHaveText('ö');

        // Kalanı İngilizce dizilimde doğru tuşlarla: bölüm biter
        await opYaz(page, 'kutu', 0, 'us');
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
        errors.assertClean();
    });

    opTest('ekran klavyesine dokunma = basış (tanıtımda ve kutuda); yanlış tuş sayılmaz', async ({ page, errors }) => {
        await opAc(page);
        const oyun = opOyun(page);
        const dokun = (code) => page.locator('.op-ekran-kap [data-code="' + code + '"]').click();
        await expect(oyun).toHaveAttribute('data-beklenen', 'f');
        await dokun('KeyA');                                                  // yanlış tuş
        await expect(oyun).toHaveAttribute('data-beklenen', 'f');
        await dokun('KeyF');
        await expect(oyun).toHaveAttribute('data-beklenen', 'j');
        await dokun('KeyJ');
        await expect(oyun).toHaveAttribute('data-mod', 'serit');
        await page.clock.runFor(1300);
        await expect(oyun).toHaveAttribute('data-mod', 'kutu');
        const kod = await page.evaluate((ch) => window.KlavyeDizilim.tusOf(ch).code, await oyun.getAttribute('data-beklenen'));
        await dokun(kod);
        await expect(page.locator('.op-kutu[data-i="0"]')).toHaveClass(/is-dogru/);
        errors.assertClean();
    });

    opTest('hub\'a dönüşte document keydown dinleyicisi açılış öncesine döner (sızıntı yok)', async ({ page, errors }) => {
        await page.clock.install({ time: new Date('2026-10-19T09:00:00Z') });
        await page.goto('/?oyun=' + OP_SLUG);
        await expect(opPicker(page)).toBeVisible();
        // İlk tuş vuruşu mobile-utils'in tek seferlik yakalayıcısını (capture) söker; taban çizgisi ondan SONRA alınır
        await page.keyboard.press('Shift');
        const once = await page.evaluate(() => window.__opKeydownSayisi());
        await page.keyboard.press('Enter');                                   // Kısım 1 baştan: oyun dinleyicisi kurulur
        await expect(opOyun(page)).toHaveAttribute('data-bolum', '1/' + OP_N);
        expect(await page.evaluate(() => window.__opKeydownSayisi())).toBeGreaterThan(once);
        await page.locator('#game-home').click();
        await page.clock.fastForward(1000);
        await expect(page.locator('#hub')).toBeVisible();
        expect(await page.evaluate(() => window.__opKeydownSayisi())).toBe(once);
        errors.assertClean();
    });

    // Spec §8 "yazma odağı kaybolursa tıklama/tuş geri getirir": fareyle odaklanmış araç çubuğu düğmesi yazılabilir
    // tuşu yutmaz (odak bırakılır, basış sayılır; Boşluk düğmeyi tetiklemez). Klavyeyle odaklanmış düğmede Tab/Enter tarayıcının.
    opTest('odak kaçışı: fareyle tıklanan tam ekran düğmesinden sonra f sayılır, Boşluk düğmeyi tetiklemez', async ({ page, errors }) => {
        await opAc(page);
        const oyun = opOyun(page);
        const kap = page.locator('#game-container');
        await expect(oyun).toHaveAttribute('data-beklenen', 'f');
        await page.locator('#game-fullscreen').click();                       // fareyle: odak düğmede, :focus-visible DEĞİL
        await expect(kap).toHaveClass(/is-fullscreen/);
        await expect(page.locator('#game-fullscreen')).toBeFocused();
        await page.keyboard.press('f');                                       // gerçek basış: hedef odaktaki düğme
        await expect(oyun).toHaveAttribute('data-beklenen', 'j');
        await expect(page.locator('#game-fullscreen')).not.toBeFocused();

        // Tekrar fareyle odakla; Boşluk (beklenen değil → tanıtımda yanlış, sayılmaz) düğmeyi tetiklememeli
        await page.locator('#game-fullscreen').click();
        await expect(kap).not.toHaveClass(/is-fullscreen/);
        await page.keyboard.press('Space');
        await expect(kap).not.toHaveClass(/is-fullscreen/);
        await expect(oyun).toHaveAttribute('data-beklenen', 'j');

        // Oyun içindeki El düğmesine fareyle tıklama da yazmayı durdurmaz
        await page.locator('.op-dugme').first().click();
        await page.keyboard.press('j');
        await expect(oyun).toHaveAttribute('data-mod', 'serit');
        errors.assertClean();
    });

    opTest('odak kaçışı: klavyeyle (Tab) odaklanan düğmede Enter düğmeyi etkinleştirir, oyun yutmaz', async ({ page, errors }) => {
        await opAc(page);
        const elDugme = page.locator('.op-dugme').first();
        await expect(elDugme).toHaveAttribute('aria-pressed', 'true');
        await elDugme.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');                               // klavye etkileşimi → :focus-visible
        await expect(elDugme).toBeFocused();
        expect(await elDugme.evaluate((b) => b.matches(':focus-visible'))).toBe(true);
        await page.keyboard.press('Enter');
        await expect(elDugme).toHaveAttribute('aria-pressed', 'false');
        await expect(elDugme).toBeFocused();
        errors.assertClean();
    });

    // Yerleşim kararlılığı: bölüm türü (tanıtım / kutu / satır) ve Caps uyarısı klavyeyi dikeyde oynatmaz
    for (const [ad, vp] of [['masaüstü 1366×768', { width: 1366, height: 768 }], ['telefon 375×812', { width: 375, height: 812 }]]) {
        opTest('yerleşim: tanıtım, kutu, satır ve Caps uyarısında klavyenin üstü aynı (±2 px) — ' + ad, async ({ page, errors }) => {
            opTest.setTimeout(60000);
            await page.setViewportSize(vp);
            const ust = () => page.locator('.op-ekran__svg').evaluate((s) => s.getBoundingClientRect().top);
            await opAc(page);
            const oyun = opOyun(page);
            await expect(oyun).toHaveAttribute('data-mod', 'tanitim');
            const t0 = await ust();
            await page.evaluate(() => { window.__opBas('f'); window.__opBas('j'); });
            await page.clock.runFor(1300);
            await expect(oyun).toHaveAttribute('data-mod', 'kutu');
            expect(Math.abs((await ust()) - t0)).toBeLessThanOrEqual(2);
            await page.evaluate(() => window.__opBas('f', { caps: true }));
            await expect(page.locator('.op-caps')).toBeVisible();
            expect(Math.abs((await ust()) - t0)).toBeLessThanOrEqual(2);
            await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: false }));

            await page.evaluate('GameEngine.startGame(OnParmak, 1)');
            await page.locator('.op-picker__bolum[data-bolum-sec="' + OP_ILK_SATIR + '"]').click();
            await expect(oyun).toHaveAttribute('data-mod', 'satir');
            expect(Math.abs((await ust()) - t0)).toBeLessThanOrEqual(2);
            await page.evaluate(() => window.__opBas('f', { caps: true }));
            await expect(page.locator('.op-caps')).toBeVisible();
            expect(Math.abs((await ust()) - t0)).toBeLessThanOrEqual(2);

            // Caps uyarısı açıkken de ekran (klavye + eller) görünüm alanına sığar; yatay taşma yok
            const r = await page.locator('.op-ekran__svg').evaluate((s) => {
                const b = s.getBoundingClientRect();
                return { alt: b.bottom, sol: b.left, sag: b.right, gen: innerWidth, yuk: innerHeight, kaydir: document.documentElement.scrollWidth };
            });
            expect(r.alt).toBeLessThanOrEqual(r.yuk + 1);
            expect(r.sol).toBeGreaterThanOrEqual(0);
            expect(r.sag).toBeLessThanOrEqual(r.gen);
            expect(r.kaydir).toBeLessThanOrEqual(r.gen);
            errors.assertClean();
        });
    }

    opTest('telefon (375 px): El/Klavye düğmeleri başlıkla aynı satırda, adları erişilebilir; klavye genişliği kullanır', async ({ page, errors }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await opAc(page, OP_ILK_SATIR);
        const ilerleme = await page.locator('.op-ilerleme__no').boundingBox();
        for (const [i, ad] of [[0, 'El'], [1, 'Klavye']]) {
            const d = page.locator('.op-dugme').nth(i);
            await expect(d).toHaveAccessibleName(ad);
            const b = await d.boundingBox();
            expect(b.width).toBeGreaterThanOrEqual(44);                       // dokunma hedefi
            expect(b.height).toBeGreaterThanOrEqual(44);
            // aynı satır: düğmenin dikey ortası ilerleme hapının dikey aralığında
            const orta = b.y + b.height / 2;
            expect(orta).toBeGreaterThan(ilerleme.y);
            expect(orta).toBeLessThan(ilerleme.y + ilerleme.height);
        }
        const svg = await page.locator('.op-ekran__svg').boundingBox();
        expect(svg.width).toBeGreaterThanOrEqual(375 - 16);                   // kenar boşluğu en çok 8 px
        expect(svg.x).toBeGreaterThanOrEqual(0);
        expect(svg.x + svg.width).toBeLessThanOrEqual(375);
        errors.assertClean();
    });

    opTest('Caps duyurusu sonuç duyurusunu ezmez: sonuç metni korunur, Caps bilgisi eklenir', async ({ page, errors }) => {
        opTest.setTimeout(60000);
        await opAc(page, OP_ILK_SATIR);
        const oyun = opOyun(page);
        await opYaz(page, 'satir', 100);
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
        await page.clock.runFor(100);
        await expect(page.locator('.op-canli')).toContainText('Bölüm ' + OP_ILK_SATIR + ' tamam');
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: true }));
        await page.clock.runFor(100);
        await expect(page.locator('.op-canli')).toContainText('Bölüm ' + OP_ILK_SATIR + ' tamam');
        await expect(page.locator('.op-canli')).toContainText('Büyük harf kilidi açık');
        errors.assertClean();
    });

    // Bölüm 1 → son bölüm tek akış: metinler içerikten (ekrandaki kutu/satır metni = içerik metni), her bölüm sonu
    // "Bölüm N tamam!", son bölümde kutlama katmanı. Hız 0 (sahte saat durur) → satırda 2, kutu ve oyunda 3 yıldız.
    opTest('Bölüm 1 → ' + OP_N + ' tek akış: tanıtım, kutu ve satır içerikten; son bölümde kutlama katmanı', async ({ page, errors }) => {
        opTest.setTimeout(180000);
        await opAc(page);
        const oyun = opOyun(page);
        for (let i = 0; i < OP_N; i++) {
            const b = OP_BOLUMLER[i];
            await expect(oyun).toHaveAttribute('data-bolum', (i + 1) + '/' + OP_N);
            await expect(page.locator('.op-ilerleme__ad')).toHaveText(b.ad);
            if (b.tur === 'kutu') {
                // Tanıtım: yeni tuşlar sırayla, içerikteki sırada (yeni yoksa tanıtım da yok)
                for (const ch of b.yeni || []) {
                    await expect(oyun).toHaveAttribute('data-mod', 'tanitim');
                    await expect(oyun).toHaveAttribute('data-beklenen', ch);
                    await page.evaluate((c) => window.__opBas(c), ch);
                }
                if ((b.yeni || []).length) {
                    await expect(oyun).toHaveAttribute('data-mod', 'serit');
                    await page.clock.runFor(1300);
                }
                await expect(oyun).toHaveAttribute('data-mod', 'kutu');
                const ilkSayfa = await page.locator('.op-kutu .op-kutu__harf').allTextContents();
                expect(ilkSayfa.join('')).toBe(b.metin.slice(0, 7).split(' ').join('␣'));
            } else if (b.tur === 'oyun') {
                // Oyun bölümü: sahnedeki harfler/kelime içerikten, sıra korunur; ilk hedef ilk harf
                await expect(oyun).toHaveAttribute('data-mod', 'oyun');
                if (b.oyun === 'balon') {
                    const harfler = await page.locator('.op-balon__b[data-harf]').evaluateAll((d) => d.map((g) => g.dataset.harf));
                    expect(harfler.join('')).toBe(b.metin);
                } else if (b.oyun === 'baloncuk') {
                    // Uçan Baloncuklar: başta iki baloncuk, metnin ilk iki kelimesi (sırayla); en acil = ilk kelime
                    const k = b.metin.split(' ');
                    await expect(page.locator('.op-baloncuk__b')).toHaveCount(2);
                    expect(await page.locator('.op-baloncuk__b').evaluateAll((d) => d.map((g) => g.dataset.kelime))).toEqual(k.slice(0, 2));
                } else {
                    // Canavar: ilk kelime kutularda (+ Boşluk kutusu), güç çubuğu = kelime sayısı
                    const ilk = b.metin.split(' ')[0];
                    await expect(page.locator('.op-canavar__kutu:not(.op-canavar__kutu--bosluk)')).toHaveText([...ilk]);
                    await expect(page.locator('.op-canavar__dilim.is-dolu')).toHaveCount(b.metin.split(' ').length);
                }
                await expect(oyun).toHaveAttribute('data-beklenen', b.metin[0]);
            } else {
                await expect(oyun).toHaveAttribute('data-mod', 'satir');
                const yazi = await page.locator('.op-satirlar .op-harf').allTextContents();
                expect(yazi.join('')).toBe(b.metin);
            }
            // Hatasız yaz (tek evaluate: hızlı). Çok hedefli oyunda yeni doğan hedef önce görünmeli → saatli yazıcı
            if (b.tur === 'oyun' && (b.oyun === 'baloncuk' || b.oyun === 'elma')) await opCokYaz(page, 300);
            else await page.evaluate((m) => {
                const r = document.querySelector('.op-oyun');
                for (let n = 0; n < 400 && r.dataset.mod === m && r.dataset.beklenen; n++) window.__opBas(r.dataset.beklenen);
            }, b.tur);
            await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
            await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm ' + (i + 1) + ' tamam!');
            // satırda hız şartı (sahte saat → hız 0) 3. yıldızı tutar; kutu ve oyunda hız şartı yok
            await expect(page.locator('.op-serit .op-yildiz.is-kazanildi')).toHaveCount(b.tur === 'satir' ? 2 : 3);
            await page.clock.runFor(2600);
        }
        await expect(oyun).toHaveAttribute('data-mod', 'bitti');
        await page.clock.runFor(500);
        await expect.poll(() => opOverlayAcik(page)).toBe(true);
        expect(await page.evaluate(() => Progress.getLevelStars('on-parmak', 1))).toBeGreaterThan(0);
        errors.assertClean();
    });
});

// ── Mini oyun: Balon Vadisi (tur:'oyun', js/games/on-parmak-balon.js) ──
// Bölüm numaraları içerikten; oyun bitişi (canlı ya da canlar) sonuç şeridine bağlanır. Öncelik (sapma 9): önce %80, sonra can.
const OP_BALON1 = opNo((b) => b.tur === 'oyun' && b.oyun === 'balon');
const OP_BALON2 = OP_BALON1 + 1 + OP_BOLUMLER.slice(OP_BALON1).findIndex((b) => b.tur === 'oyun' && b.oyun === 'balon');
const opBalon = (page) => page.locator('.op-balon');
// Sahte rAF sarmalı: bekleyen istek kümesi (kare gelince ya da iptalde düşer) + ResizeObserver etkin sayısı.
// page.clock.install'dan SONRA eklenir (opAc hazirla) → saatin sahte rAF'ını sarar.
const OP_RAF = `(() => {
    const bekleyen = new Set();
    const r = window.requestAnimationFrame.bind(window), c = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (f) => { const id = r((t) => { bekleyen.delete(id); f(t); }); bekleyen.add(id); return id; };
    window.cancelAnimationFrame = (id) => { bekleyen.delete(id); c(id); };
    window.__opRafBekleyen = () => bekleyen.size;
    const RO = window.ResizeObserver;
    let etkin = 0;
    if (RO) window.ResizeObserver = class extends RO {
        constructor(cb) { super(cb); this.__acik = false; }
        observe(...a) { if (!this.__acik) { this.__acik = true; etkin++; } return super.observe(...a); }
        disconnect() { if (this.__acik) { this.__acik = false; etkin--; } return super.disconnect(); }
    };
    window.__opRoEtkin = () => etkin;
})();`;
// Oyun bitene (mod 'oyun' değil) kadar saati 1 sn'lik adımlarla ilerletir (şerit 2,5 sn'de kendiliğinden geçer → adım küçük)
async function opOyunBitene(page, azamiSn = 120) {
    for (let i = 0; i < azamiSn; i++) {
        if (await opOyun(page).getAttribute('data-mod') !== 'oyun') return i;
        await page.clock.runFor(1000);
    }
    throw new Error('oyun ' + azamiSn + ' sn içinde bitmedi');
}
const opGorun = (page, v) => page.evaluate((d) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => d });
    document.dispatchEvent(new Event('visibilitychange'));
}, v);

opTest.describe('OnParmak — Balon Vadisi (oyun bölümü)', () => {
    opTest('kazanma: metin yazılır → canlı biter → yıldız (hız şartı yok); sahne harfleri içerikten, klavye küçük', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALON1);
        const b = OP_BOLUMLER[OP_BALON1 - 1];
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await expect(opOyun(page)).toHaveAttribute('data-tur', 'oyun');
        await expect(opBalon(page)).toHaveAttribute('data-can', '3');
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[0]);
        // Sıradaki tuş ekran klavyesinde yanar
        const kod = await page.evaluate((ch) => window.KlavyeDizilim.tusOf(ch).code, b.metin[0]);
        await expect(page.locator('.op-tus[data-code="' + kod + '"]')).toHaveClass(/is-hedef/);
        // Oyunda ekran klavyesi küçük (≤ 600 px)
        expect((await page.locator('.op-ekran').boundingBox()).width).toBeLessThanOrEqual(601);
        const n = await opYaz(page, 'oyun', 400);
        expect(n).toBe(b.metin.length);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opBalon(page)).toHaveAttribute('data-bitti', 'canli');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', '3');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm ' + OP_BALON1 + ' tamam!');
        await expect(page.locator('.op-serit .op-yildiz.is-kazanildi')).toHaveCount(3);
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', (OP_BALON1 + 1) + '/' + OP_N);
        await expect(opBalon(page)).toHaveCount(0);
        errors.assertClean();
    });

    opTest('yavaş ama doğru: birkaç doğru basış, sonra canlar biter → en çok 1 yıldız, akış sonraki bölüme geçer', async ({ page, errors }) => {
        opTest.setTimeout(120000);
        await opAc(page, OP_BALON1);
        const b = OP_BOLUMLER[OP_BALON1 - 1];
        for (let i = 0; i < 3; i++) await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[3]);
        await opOyunBitene(page);
        await expect(opBalon(page)).toHaveAttribute('data-can', '0');
        await expect(opBalon(page)).toHaveAttribute('data-bitti', 'canlar');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', '1');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm ' + OP_BALON1 + ' bitti');
        await expect(page.locator('.op-serit .op-yildiz.is-kazanildi')).toHaveCount(1);
        await expect(page.locator('.op-serit__alt')).toContainText('canlar');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', (OP_BALON1 + 1) + '/' + OP_N);
        errors.assertClean();
    });

    opTest('hiç basmadan canlar biter → tekrar (önce %80 kuralı); aynı bölüm 3 canla baştan', async ({ page, errors }) => {
        opTest.setTimeout(120000);
        await opAc(page, OP_BALON1);
        await opOyunBitene(page);
        await expect(opBalon(page)).toHaveAttribute('data-bitti', 'canlar');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', 'tekrar');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bir daha deneyelim');
        await expect(page.locator('.op-serit__alt')).toHaveText('doğruluk %0, hedef %80');
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', OP_BALON1 + '/' + OP_N);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await expect(opBalon(page)).toHaveAttribute('data-can', '3');
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', OP_BOLUMLER[OP_BALON1 - 1].metin[0]);
        errors.assertClean();
    });

    opTest('rastgele basma (doğruluk < %80) canlı bitse de tekrar', async ({ page, errors }) => {
        await opAc(page, OP_BALON1);
        // Her harften önce bir yanlış harf: doğruluk %50; yanlış basış ilerletmez, hedef balon kırmızı konturlu
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen === 'f' ? 'j' : 'f'));
        await expect(page.locator('.op-balon__b.is-hedef')).toHaveClass(/is-yanlis/);
        await page.evaluate(() => {
            const r = document.querySelector('.op-oyun');
            window.__opBas(r.dataset.beklenen);
            for (let n = 0; n < 200 && r.dataset.mod === 'oyun'; n++) {
                window.__opBas(r.dataset.beklenen === 'f' ? 'j' : 'f');
                if (r.dataset.mod === 'oyun') window.__opBas(r.dataset.beklenen);
            }
        });
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opBalon(page)).toHaveAttribute('data-bitti', 'canli');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', 'tekrar');
        await expect(page.locator('.op-serit__alt')).toHaveText('doğruluk %50, hedef %80');
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', OP_BALON1 + '/' + OP_N);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        errors.assertClean();
    });

    opTest('sekme gizlenince oyun durur; görünür olunca "Devam etmek için bir tuşa bas"; devam tuşu sayılmaz', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALON1);
        const b = OP_BOLUMLER[OP_BALON1 - 1];
        await page.evaluate(() => { window.__opBas(document.querySelector('.op-oyun').dataset.beklenen); window.__opBas(document.querySelector('.op-oyun').dataset.beklenen); });
        await page.clock.runFor(500);
        await opGorun(page, 'hidden');
        await expect(opBalon(page)).toHaveAttribute('data-durum', 'gizli');
        const konum = () => page.locator('.op-balon__pit').getAttribute('transform');
        const once = await konum();
        await page.clock.runFor(20000);                        // gizliyken balon alçalmaz, can gitmez
        expect(await konum()).toBe(once);
        await opGorun(page, 'visible');
        await expect(opBalon(page)).toHaveAttribute('data-durum', 'devam-bekliyor');
        await expect(page.locator('.op-mini__devam')).toBeVisible();
        await expect(page.locator('.op-mini__devam')).toContainText('Devam etmek için bir tuşa bas');
        await page.clock.runFor(5000);
        expect(await konum()).toBe(once);
        await expect(opBalon(page)).toHaveAttribute('data-can', '3');
        // Devam tuşu: YANLIŞ harf — sayılsaydı doğruluk %100 olmazdı; hedef de değişmez
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen === 'f' ? 'j' : 'f'));
        await expect(opBalon(page)).toHaveAttribute('data-durum', 'calisiyor');
        await expect(page.locator('.op-mini__devam')).toBeHidden();
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[2]);
        await opYaz(page, 'oyun', 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        errors.assertClean();
    });

    opTest('Caps Lock açıkken oyun durur (can gitmez, balon alçalmaz, basış sayılmaz); kapanınca hemen sürer', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALON1);
        const b = OP_BOLUMLER[OP_BALON1 - 1];
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        await page.clock.runFor(300);
        const konum = () => page.locator('.op-balon__pit').getAttribute('transform');
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: true }));
        await expect(page.locator('.op-caps')).toBeVisible();
        await expect(opBalon(page)).toHaveAttribute('data-durum', 'duraklatildi');
        const once = await konum();
        await page.clock.runFor(20000);
        expect(await konum()).toBe(once);
        await expect(opBalon(page)).toHaveAttribute('data-can', '3');
        await page.evaluate((ch) => window.__opBas(ch, { caps: true }), b.metin[1]);        // Caps açıkken: sayılmaz
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[1]);
        await expect(page.locator('.op-mini__devam')).toBeHidden();                        // devam tuşu istenmez
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: false }));
        await expect(page.locator('.op-caps')).toBeHidden();
        await expect(opBalon(page)).toHaveAttribute('data-durum', 'calisiyor');            // hemen sürer
        await page.clock.runFor(2000);
        expect(await konum()).not.toBe(once);                                                // alçalma sürüyor
        await opYaz(page, 'oyun', 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        errors.assertClean();
    });

    opTest('sekme dönüşünde Caps Lock açıksa Caps tuşu ve harfler oyunu sürdürmez; Caps kapanınca tuşla sürer', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALON1);
        const b = OP_BOLUMLER[OP_BALON1 - 1];
        await page.clock.runFor(300);
        await opGorun(page, 'hidden');
        await opGorun(page, 'visible');
        await expect(opBalon(page)).toHaveAttribute('data-durum', 'devam-bekliyor');
        const konum = () => page.locator('.op-balon__pit').getAttribute('transform');
        const once = await konum();
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: true }));   // Caps tuşu (açtı): sürdürmez
        await expect(opBalon(page)).toHaveAttribute('data-durum', 'devam-bekliyor');
        await page.evaluate((ch) => window.__opBas(ch, { caps: true }), b.metin[0]);       // harf de sürdürmez, sayılmaz
        await expect(opBalon(page)).toHaveAttribute('data-durum', 'devam-bekliyor');
        await page.clock.runFor(10000);
        expect(await konum()).toBe(once);
        await expect(opBalon(page)).toHaveAttribute('data-can', '3');
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[0]);
        // Caps'i kapatan tuş: Caps artık kapalı → devam tuşu sayılır (yutulur, sayılmaz)
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: false }));
        await expect(opBalon(page)).toHaveAttribute('data-durum', 'calisiyor');
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[0]);
        await opYaz(page, 'oyun', 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        errors.assertClean();
    });

    opTest('rAF: oyun sürerken bekleyen kare ve ResizeObserver var; oyundan sonraki bölüme geçişte ikisi de 0', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALON1, OP_N, (p) => p.addInitScript(OP_RAF));
        await page.clock.runFor(200);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.__opDinleyiciSayisi('visibilitychange'))).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(1);
        // Oyun bölümünden sonraki bölüme geçişte de oyun durur (kazan → şerit → sonraki bölüm)
        await opYaz(page, 'oyun', 0);
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', (OP_BALON1 + 1) + '/' + OP_N);
        await page.clock.runFor(200);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(0);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBe(0);
        errors.assertClean();
    });

    opTest('rAF: oyun ortasında hub\'a dönünce bekleyen kare 0, dinleyiciler açılış öncesine döner', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await page.clock.install({ time: new Date('2026-10-19T09:00:00Z') });
        await page.addInitScript(OP_RAF);
        await page.goto('/?oyun=' + OP_SLUG);
        await expect(opPicker(page)).toBeVisible();
        await page.keyboard.press('Shift');                     // mobile-utils'in tek seferlik yakalayıcısı sökülsün
        await page.clock.runFor(500);
        const once = await page.evaluate(() => ({ k: window.__opKeydownSayisi(), v: window.__opDinleyiciSayisi('visibilitychange'), raf: window.__opRafBekleyen() }));
        await page.locator('.op-picker__bolum[data-bolum-sec="' + OP_BALON1 + '"]').click();
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await page.clock.runFor(300);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBeGreaterThan(once.raf);
        await page.locator('#game-home').click();
        await page.clock.runFor(1000);
        await expect(page.locator('#hub')).toBeVisible();
        await page.clock.runFor(1000);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBe(0);
        expect(await page.evaluate(() => window.__opKeydownSayisi())).toBe(once.k);
        expect(await page.evaluate(() => window.__opDinleyiciSayisi('visibilitychange'))).toBe(once.v);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(0);
        errors.assertClean();
    });

    opTest('aynı tohum (bölüm numarası) iki açılışta aynı sahne ve aynı ilk hedef dizisi; başka bölüm başka sahne', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        // İlk açılış derin bağlantıyla; sonrakiler hub'a dönüp kartla (aynı sayfa, modül yeniden init)
        let ilk = true;
        const iz = async (p, no) => {
            if (ilk) { ilk = false; await opAc(p, no); } else {
                await p.locator('#game-home').click();
                await p.clock.runFor(1000);
                await p.locator('.game-card[data-game="on-parmak"]').first().click();
                await p.clock.runFor(500);
                await expect(opPicker(p)).toBeVisible();
                await p.locator('.op-picker__bolum[data-bolum-sec="' + no + '"]').click();
                await expect(opOyun(p)).toHaveAttribute('data-bolum', no + '/' + OP_N);
            }
            const sahne = await p.locator('.op-balon__b[data-harf]').evaluateAll((d) => d.map((g) => g.dataset.harf + ':' + g.dataset.yuk + ':' + g.dataset.renk));
            const tohum = await p.locator('.op-balon').getAttribute('data-tohum');
            const hedefler = await p.evaluate(() => {
                const r = document.querySelector('.op-oyun');
                const d = [];
                for (let n = 0; n < 6; n++) { d.push(r.dataset.beklenen); window.__opBas(r.dataset.beklenen); }
                return d;
            });
            return { sahne, tohum, hedefler };
        };
        const a = await iz(page, OP_BALON1);
        const b = await iz(page, OP_BALON1);
        expect(a.tohum).toBe(String(OP_BALON1));
        expect(b).toEqual(a);
        expect(a.hedefler.join('')).toBe(OP_BOLUMLER[OP_BALON1 - 1].metin.slice(0, 6));
        const c = await iz(page, OP_BALON2);
        expect(c.tohum).toBe(String(OP_BALON2));
        const yer = (s) => s.slice(0, 20).map((x) => x.split(':').slice(1).join(':'));   // yükseklik:renk
        expect(yer(c.sahne)).not.toEqual(yer(a.sahne));
        errors.assertClean();
    });
});

// Normal hız yolu (prefers-reduced-motion yok): atlayış yayı, salınım, sallanma ve kamera yumuşatması açık
opTest.describe('OnParmak — Balon Vadisi, normal hareket', () => {
    opTest.use({ reducedMotion: 'no-preference' });
    opTest('kazanma ve can kaybı normal hareket yolunda da aynı: canlı bitiş ≥ 1 yıldız; suya düşünce can gider, hedef ilerler', async ({ page, errors }) => {
        opTest.setTimeout(120000);
        await opAc(page, OP_BALON1);
        const b = OP_BOLUMLER[OP_BALON1 - 1];
        expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
        // Can kaybı: basmadan bekle → bir can gider, karakter sıradaki balona taşınır (o harf atlanır)
        for (let i = 0; i < 60 && (await opBalon(page).getAttribute('data-can')) === '3'; i++) await page.clock.runFor(500);
        await expect(opBalon(page)).toHaveAttribute('data-can', '2');
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[1]);
        await expect(page.locator('.op-mini__can.is-gitti')).toHaveCount(1);
        await page.clock.runFor(600);                           // sudan çıkış yayı biter
        await opYaz(page, 'oyun', 250);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opBalon(page)).toHaveAttribute('data-bitti', 'canli');
        expect(Number(await opOyun(page).getAttribute('data-sonuc'))).toBeGreaterThanOrEqual(1);
        errors.assertClean();
    });
});

// ── Mini oyun: Canavar Saldırısı (tur:'oyun', kelime oyunu, js/games/on-parmak-canavar.js) ──
// Kelime + Boşluk yazılır (Boşluk kar topunu atar; son kelimede son harf). Güç çubuğu = kelime sayısı. Kısım 1'in son
// bölümü → bitince kısım (tek kısımlı içerikte oyun) biter: "akış sürer" = kısım sonu (kutlama katmanı).
const OP_CANAVAR = opNo((b) => b.tur === 'oyun' && b.oyun === 'canavar');
const opCanavar = (page) => page.locator('.op-canavar');
async function opCanavarSonra(page) {
    // Şerit geçince akış sürer: sonraki bölüm ya da (son bölümse) kısım/oyun sonu; sahne kalkar
    await page.clock.runFor(2600);
    if (OP_CANAVAR < OP_N) await expect(opOyun(page)).toHaveAttribute('data-bolum', (OP_CANAVAR + 1) + '/' + OP_N);
    else await expect(opOyun(page)).toHaveAttribute('data-mod', 'bitti');
    await expect(opCanavar(page)).toHaveCount(0);
}
const opM = async (page) => Number(await opCanavar(page).getAttribute('data-m'));

opTest.describe('OnParmak — Canavar Saldırısı (oyun bölümü)', () => {
    opTest('kazanma: kelimeler + Boşluk yazılır → her kelimede kar topu, güç çubuğu azalır, canavar geri seker → canlı biter', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_CANAVAR);
        const b = OP_BOLUMLER[OP_CANAVAR - 1];
        const kelimeler = b.metin.split(' ');
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await expect(opCanavar(page)).toHaveAttribute('data-can', '3');
        await expect(opCanavar(page)).toHaveAttribute('data-saglik', String(kelimeler.length));
        await expect(page.locator('.op-canavar__dilim')).toHaveCount(kelimeler.length);
        await expect(page.locator('.op-canavar__guc')).toHaveAttribute('aria-label', 'Canavarın gücü: ' + kelimeler.length + ' / ' + kelimeler.length);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[0]);
        await expect(page.locator('.op-canavar__kutu.is-sira')).toHaveText(b.metin[0]);
        await expect(page.locator('.op-canavar__kutu--bosluk')).toHaveCount(1);
        const kod = await page.evaluate((ch) => window.KlavyeDizilim.tusOf(ch).code, b.metin[0]);
        await expect(page.locator('.op-tus[data-code="' + kod + '"]')).toHaveClass(/is-hedef/);
        expect((await page.locator('.op-ekran').boundingBox()).width).toBeLessThanOrEqual(601);
        // Canavar yaklaşır; ilk kelimenin harfleri → beklenen Boşluk (elde kar topu), Boşluk → atış
        await page.clock.runFor(3000);
        const m0 = await opM(page);
        expect(m0).toBeLessThan(1);
        for (const ch of kelimeler[0]) await page.evaluate((c) => window.__opBas(c), ch);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', ' ');
        await expect(page.locator('.op-canavar__pit')).toHaveClass(/is-hazir/);
        await expect(page.locator('.op-canavar__kutu.is-yazildi')).toHaveCount(kelimeler[0].length);
        await page.evaluate(() => window.__opBas(' '));
        await expect(opCanavar(page)).toHaveAttribute('data-saglik', String(kelimeler.length - 1));
        await expect(page.locator('.op-canavar__dilim.is-dolu')).toHaveCount(kelimeler.length - 1);
        await expect(opCanavar(page)).toHaveAttribute('data-kelime', '1');
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', kelimeler[1][0]);
        await expect(page.locator('.op-canavar__kutu:not(.op-canavar__kutu--bosluk)')).toHaveText([...kelimeler[1]]);
        await expect(page.locator('.op-canavar__cv')).toHaveClass(/is-vuruldu/);   // azaltılmış harekette vuruş anında
        await page.clock.runFor(100);
        expect(await opM(page)).toBeCloseTo(Math.min(1, m0 + 0.5), 1);              // geri sekti
        // Son harften önce dur: son atış (güç biter) canavarı geri itmez — yerinde, karlar içinde kalır
        const kalan = b.metin.length - kelimeler[0].length - 1;
        const n = await opYaz(page, 'oyun', 300, 'tr', kalan - 1);
        expect(n).toBe(kalan - 1);
        const mSon = await opM(page);
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opCanavar(page)).toHaveAttribute('data-bitti', 'canli');
        await expect(opCanavar(page)).toHaveAttribute('data-saglik', '0');
        await expect(opCanavar(page)).toHaveAttribute('data-can', '3');
        await page.clock.runFor(100);
        expect(await opM(page)).toBeCloseTo(mSon, 3);           // son top geri itmedi
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', '3');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm ' + OP_CANAVAR + ' tamam!');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        await opCanavarSonra(page);
        errors.assertClean();
    });

    opTest('yavaş ama doğru: birkaç doğru basış, canavar 3 kez ulaşır (ilerleme korunur) → en çok 1 yıldız, akış sürer', async ({ page, errors }) => {
        opTest.setTimeout(150000);
        await opAc(page, OP_CANAVAR);
        const b = OP_BOLUMLER[OP_CANAVAR - 1];
        for (let i = 0; i < 3; i++) await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[3]);
        // İlk temas: bir can gider, canavar başa çekilir, kelime ve ilerleme yerinde kalır
        for (let i = 0; i < 80 && (await opCanavar(page).getAttribute('data-can')) === '3'; i++) await page.clock.runFor(1000);
        await expect(opCanavar(page)).toHaveAttribute('data-can', '2');
        await expect(page.locator('.op-mini__can.is-gitti')).toHaveCount(1);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[3]);
        await expect(opCanavar(page)).toHaveAttribute('data-kelime', '0');
        expect(await opM(page)).toBeGreaterThan(0.9);
        await opOyunBitene(page, 200);
        await expect(opCanavar(page)).toHaveAttribute('data-can', '0');
        await expect(opCanavar(page)).toHaveAttribute('data-bitti', 'canlar');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', '1');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm ' + OP_CANAVAR + ' bitti');
        await expect(page.locator('.op-serit .op-yildiz.is-kazanildi')).toHaveCount(1);
        await expect(page.locator('.op-serit__alt')).toContainText('canlar');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        await opCanavarSonra(page);
        errors.assertClean();
    });

    opTest('hiç basmadan canlar biter → tekrar (önce %80 kuralı); aynı bölüm 3 canla, tam güçle baştan', async ({ page, errors }) => {
        opTest.setTimeout(150000);
        await opAc(page, OP_CANAVAR);
        const b = OP_BOLUMLER[OP_CANAVAR - 1];
        await opOyunBitene(page, 200);
        await expect(opCanavar(page)).toHaveAttribute('data-bitti', 'canlar');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', 'tekrar');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bir daha deneyelim');
        await expect(page.locator('.op-serit__alt')).toHaveText('doğruluk %0, hedef %80');
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', OP_CANAVAR + '/' + OP_N);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await expect(opCanavar(page)).toHaveAttribute('data-can', '3');
        await expect(opCanavar(page)).toHaveAttribute('data-saglik', String(b.metin.split(' ').length));
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[0]);
        errors.assertClean();
    });

    opTest('rastgele basma (doğruluk < %80) canlı bitse de tekrar; yanlış basış ilerletmez, sıradaki kutu kırmızı', async ({ page, errors }) => {
        await opAc(page, OP_CANAVAR);
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen === 'f' ? 'j' : 'f'));
        await expect(page.locator('.op-canavar__kutu.is-sira')).toHaveClass(/is-yanlis/);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', OP_BOLUMLER[OP_CANAVAR - 1].metin[0]);
        await page.clock.runFor(400);
        await expect(page.locator('.op-canavar__kutu.is-yanlis')).toHaveCount(0);           // işaret kendiliğinden söner
        await page.evaluate(() => {
            const r = document.querySelector('.op-oyun');
            window.__opBas(r.dataset.beklenen);
            for (let n = 0; n < 400 && r.dataset.mod === 'oyun'; n++) {
                window.__opBas(r.dataset.beklenen === 'f' ? 'j' : 'f');
                if (r.dataset.mod === 'oyun') window.__opBas(r.dataset.beklenen);
            }
        });
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opCanavar(page)).toHaveAttribute('data-bitti', 'canli');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', 'tekrar');
        await expect(page.locator('.op-serit__alt')).toHaveText('doğruluk %50, hedef %80');
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', OP_CANAVAR + '/' + OP_N);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        errors.assertClean();
    });

    opTest('sekme gizlenince durur; görünür olunca "Devam etmek için bir tuşa bas"; devam tuşu sayılmaz', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_CANAVAR);
        const b = OP_BOLUMLER[OP_CANAVAR - 1];
        await page.evaluate(() => { window.__opBas(document.querySelector('.op-oyun').dataset.beklenen); window.__opBas(document.querySelector('.op-oyun').dataset.beklenen); });
        await page.clock.runFor(500);
        await opGorun(page, 'hidden');
        await expect(opCanavar(page)).toHaveAttribute('data-durum', 'gizli');
        const once = await opM(page);
        await page.clock.runFor(30000);                        // gizliyken canavar yürümez, can gitmez
        expect(await opM(page)).toBe(once);
        await opGorun(page, 'visible');
        await expect(opCanavar(page)).toHaveAttribute('data-durum', 'devam-bekliyor');
        await expect(page.locator('.op-mini__devam')).toBeVisible();
        await expect(page.locator('.op-mini__devam')).toContainText('Devam etmek için bir tuşa bas');
        await page.clock.runFor(5000);
        expect(await opM(page)).toBe(once);
        await expect(opCanavar(page)).toHaveAttribute('data-can', '3');
        // Devam tuşu: YANLIŞ harf — sayılsaydı doğruluk %100 olmazdı; hedef de değişmez
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen === 'f' ? 'j' : 'f'));
        await expect(opCanavar(page)).toHaveAttribute('data-durum', 'calisiyor');
        await expect(page.locator('.op-mini__devam')).toBeHidden();
        await expect(page.locator('.op-canavar__kutu.is-yanlis')).toHaveCount(0);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[2]);
        await page.clock.runFor(1000);
        expect(await opM(page)).toBeLessThan(once);            // yürüyüş sürüyor
        await opYaz(page, 'oyun', 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        errors.assertClean();
    });

    opTest('Caps Lock açıkken oyun durur (canavar yürümez, can gitmez, basış sayılmaz); kapanınca hemen sürer', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_CANAVAR);
        const b = OP_BOLUMLER[OP_CANAVAR - 1];
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        await page.clock.runFor(300);
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: true }));
        await expect(page.locator('.op-caps')).toBeVisible();
        await expect(opCanavar(page)).toHaveAttribute('data-durum', 'duraklatildi');
        const once = await opM(page);
        await page.clock.runFor(40000);
        expect(await opM(page)).toBe(once);
        await expect(opCanavar(page)).toHaveAttribute('data-can', '3');
        await page.evaluate((ch) => window.__opBas(ch, { caps: true }), b.metin[1]);        // Caps açıkken: sayılmaz
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', b.metin[1]);
        await expect(page.locator('.op-mini__devam')).toBeHidden();
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: false }));
        await expect(page.locator('.op-caps')).toBeHidden();
        await expect(opCanavar(page)).toHaveAttribute('data-durum', 'calisiyor');
        await page.clock.runFor(2000);
        expect(await opM(page)).toBeLessThan(once);
        await opYaz(page, 'oyun', 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        errors.assertClean();
    });

    opTest('rAF: oyun sürerken bekleyen kare + ResizeObserver; bitince oyun durur (RO 0, sahne yok)', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_CANAVAR, OP_N, (p) => p.addInitScript(OP_RAF));
        await page.clock.runFor(200);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.__opDinleyiciSayisi('visibilitychange'))).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(1);
        await opYaz(page, 'oyun', 0);
        await opCanavarSonra(page);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(0);
        errors.assertClean();
    });

    opTest('aynı tohum (bölüm numarası) iki açılışta aynı sahne ve aynı hedef dizisi; başka tohum başka sahne', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        let ilk = true;
        const iz = async (p, no) => {
            if (ilk) { ilk = false; await opAc(p, no); } else {
                await p.locator('#game-home').click();
                await p.clock.runFor(1000);
                await p.locator('.game-card[data-game="on-parmak"]').first().click();
                await p.clock.runFor(500);
                await expect(opPicker(p)).toBeVisible();
                await p.locator('.op-picker__bolum[data-bolum-sec="' + no + '"]').click();
                await expect(opOyun(p)).toHaveAttribute('data-bolum', no + '/' + OP_N);
            }
            const kok = opCanavar(p);
            const sahne = { renk: await kok.getAttribute('data-renk'),
                agac: await p.locator('.op-canavar__agac').evaluateAll((d) => d.map((g) => g.dataset.x).join(',')) };
            const tohum = await kok.getAttribute('data-tohum');
            const hedefler = await p.evaluate(() => {
                const r = document.querySelector('.op-oyun');
                const d = [];
                for (let n = 0; n < 8; n++) { d.push(r.dataset.beklenen); window.__opBas(r.dataset.beklenen); }
                return d;
            });
            return { sahne, tohum, hedefler };
        };
        const a = await iz(page, OP_CANAVAR);
        const b = await iz(page, OP_CANAVAR);
        expect(a.tohum).toBe(String(OP_CANAVAR));
        expect(b).toEqual(a);
        expect(a.hedefler.join('')).toBe(OP_BOLUMLER[OP_CANAVAR - 1].metin.slice(0, 8));
        // Başka tohum: sahne değişir (oyun doğrudan, ayrı kapta kurulur ve durdurulur)
        const c = await page.evaluate(() => {
            const kap = document.createElement('div');
            kap.style.cssText = 'position:fixed;width:800px;height:320px;left:0;top:0';
            document.body.appendChild(kap);
            const oy = window.OnParmakOyunlari.canavar;
            oy.baslat(kap, { metin: 'fil dil', tohum: 999 }, { tus() {}, bitti() {} });
            const x = [...kap.querySelectorAll('.op-canavar__agac')].map((g) => g.dataset.x).join(',');
            oy.durdur();
            kap.remove();
            return x;
        });
        expect(c).not.toBe(a.sahne.agac);
        errors.assertClean();
    });
});

// Normal hız yolu: kar topu yay çizerek uçar, canavar ezilip geri seker, temasta yumuşak geri çekilme
opTest.describe('OnParmak — Canavar Saldırısı, normal hareket', () => {
    opTest.use({ reducedMotion: 'no-preference' });
    opTest('atış: top havada uçar (canavar bekler), değince geri seker; temas → can gider, yumuşak çekilme; kazanma ≥ 1 yıldız', async ({ page, errors }) => {
        opTest.setTimeout(120000);
        await opAc(page, OP_CANAVAR);
        const b = OP_BOLUMLER[OP_CANAVAR - 1];
        const kelimeler = b.metin.split(' ');
        expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
        for (let i = 0; i < 60 && (await opCanavar(page).getAttribute('data-can')) === '3'; i++) await page.clock.runFor(500);
        await expect(opCanavar(page)).toHaveAttribute('data-can', '2');
        expect(await opM(page)).toBeLessThan(0.95);             // çekilme sürüyor (anında değil)
        await page.clock.runFor(900);
        expect(await opM(page)).toBeGreaterThan(0.95);
        await page.clock.runFor(8000);
        for (const ch of kelimeler[0]) await page.evaluate((c) => window.__opBas(c), ch);
        const m0 = await opM(page);
        await page.evaluate(() => window.__opBas(' '));
        await expect(opCanavar(page)).toHaveAttribute('data-saglik', String(kelimeler.length - 1));
        await expect(page.locator('.op-canavar__atislar > .op-canavar__top')).toHaveCount(1);   // havada
        await expect(page.locator('.op-canavar__cv')).not.toHaveClass(/is-vuruldu/);
        await page.clock.runFor(200);
        expect(await opM(page)).toBeCloseTo(m0, 2);             // top havadayken canavar bekler
        await page.clock.runFor(200);
        await expect(page.locator('.op-canavar__cv')).toHaveClass(/is-vuruldu/);
        await expect(page.locator('.op-canavar__atislar > .op-canavar__top')).toHaveCount(0);
        await page.clock.runFor(600);
        expect(m0).toBeLessThan(0.75);
        expect(await opM(page)).toBeCloseTo(Math.min(1, m0 + 0.5), 1);   // geri sekti (tavan 1; sekme bitti, yürüyüş sürüyor)
        await opYaz(page, 'oyun', 250);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opCanavar(page)).toHaveAttribute('data-bitti', 'canli');
        expect(Number(await opOyun(page).getAttribute('data-sonuc'))).toBeGreaterThanOrEqual(1);
        errors.assertClean();
    });

    opTest('yanlış basışın sallanması sıradaki kutuya geçmez (280 ms içinde doğru basış)', async ({ page, errors }) => {
        await opAc(page, OP_CANAVAR);
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen === 'f' ? 'j' : 'f'));
        await page.clock.runFor(60);
        const ilk = page.locator('.op-canavar__kutu').nth(0);
        expect(await ilk.evaluate((e) => e.style.transform)).not.toBe('');                   // ilk kutu sallanıyor
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        for (let i = 0; i < 4; i++) {
            await page.clock.runFor(60);
            const d = await page.locator('.op-canavar__kutu').evaluateAll((k) => k.map((e) => e.style.transform + '|' + e.classList.contains('is-yanlis')));
            expect(d.every((x) => x === '|false'), d.join(' ')).toBe(true);
        }
        errors.assertClean();
    });

    opTest('rAF: oyun ortasında (top havadayken) hub\'a dönünce bekleyen kare 0, dinleyiciler açılış öncesine döner', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await page.clock.install({ time: new Date('2026-10-19T09:00:00Z') });
        await page.addInitScript(OP_RAF);
        await page.goto('/?oyun=' + OP_SLUG);
        await expect(opPicker(page)).toBeVisible();
        await page.keyboard.press('Shift');
        await page.clock.runFor(500);
        const once = await page.evaluate(() => ({ k: window.__opKeydownSayisi(), v: window.__opDinleyiciSayisi('visibilitychange'), raf: window.__opRafBekleyen() }));
        await page.locator('.op-picker__bolum[data-bolum-sec="' + OP_CANAVAR + '"]').click();
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await page.evaluate(() => { const r = document.querySelector('.op-oyun'); for (let i = 0; i < 6; i++) window.__opBas(r.dataset.beklenen); });
        await page.clock.runFor(150);
        await expect(page.locator('.op-canavar__atislar > .op-canavar__top')).toHaveCount(1);   // top gerçekten havada
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBeGreaterThan(once.raf);
        await page.locator('#game-home').click();
        await page.clock.runFor(1000);
        await expect(page.locator('#hub')).toBeVisible();
        await page.clock.runFor(1000);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBe(0);
        expect(await page.evaluate(() => window.__opKeydownSayisi())).toBe(once.k);
        expect(await page.evaluate(() => window.__opDinleyiciSayisi('visibilitychange'))).toBe(once.v);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(0);
        await expect(opCanavar(page)).toHaveCount(0);
        errors.assertClean();
    });

});

// ── Mini oyun: Uçan Baloncuklar (tur:'oyun', js/games/on-parmak-baloncuk.js) ──
// Kelime oyunu, çok hedef: ilk harf hedefi seçer (hedefSec: o harfle başlayan, tepeye en yakın), kilit kelime bitene dek
// sürer; BOŞLUK yazılmaz. Kaçan baloncuk = can. Öncelik (sapma 9): önce %80, sonra can.
const OP_BALONCUK = opNo((b) => b.tur === 'oyun' && b.oyun === 'baloncuk');
const OP_BALONCUK_B = OP_BOLUMLER[OP_BALONCUK - 1];
const OP_BALONCUK_K = OP_BALONCUK_B.metin.split(' ');
const opBaloncuk = (page) => page.locator('.op-baloncuk');
// Sahnedeki baloncuklar (DOM sırası): kelime, doğuş sırası, şerit, yükseklik p, kilit
const opBlc = (page) => page.evaluate(() => [...document.querySelectorAll('.op-baloncuk__b')].map((g) => ({
    k: g.dataset.kelime, sira: Number(g.dataset.sira), serit: g.dataset.serit, p: Number(g.dataset.p), kilit: g.classList.contains('is-kilitli'),
})));
async function opBaloncukSonra(page) {
    await page.clock.runFor(2600);
    await expect(opOyun(page)).toHaveAttribute('data-bolum', (OP_BALONCUK + 1) + '/' + OP_N);
    await expect(opBaloncuk(page)).toHaveCount(0);
}
// f/j hiçbir kelimenin harfi değil: kilitliyken de kilitsizken de yanlış
const opYanlisBas = (page) => page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen === 'f' ? 'j' : 'f'));
// Çok hedefli oyun (Baloncuk, Elma): data-beklenen'i yazar; beklenen boşsa (görünür hedef yok: çayırın arkasında ya da
// kenardan giriyor) saat ilerler ve bekler. Her basıştan sonra saat ms ilerler.
async function opCokYaz(page, ms = 300, azami = 400) {
    for (let n = 0; n < azami; n++) {
        const d = await opOyun(page).evaluate((r) => ({ mod: r.dataset.mod, ch: r.dataset.beklenen }));
        if (d.mod !== 'oyun') return;
        if (d.ch) await page.evaluate((ch) => window.__opBas(ch), d.ch);
        if (await opOyun(page).getAttribute('data-mod') !== 'oyun') return;
        await page.clock.runFor(ms || 100);
    }
    throw new Error('oyun bölümü bitmedi');
}
// Rastgele basma: her görünür hedefte önce yanlış (f/j), sonra doğru harf → doğruluk %50
async function opYarimYaz(page) {
    for (let n = 0; n < 400; n++) {
        const mod = await page.evaluate(() => {
            const r = document.querySelector('.op-oyun');
            if (r.dataset.mod === 'oyun' && r.dataset.beklenen) {
                window.__opBas(r.dataset.beklenen === 'f' ? 'j' : 'f');
                if (r.dataset.mod === 'oyun') window.__opBas(r.dataset.beklenen);
            }
            return r.dataset.mod;
        });
        if (mod !== 'oyun') return;
        await page.clock.runFor(200);
    }
    throw new Error('oyun bölümü bitmedi');
}
// Uçan Baloncuklar doğuş planı Node'da (oyun başlığındaki sözleşme): kelime başına u, kay, faz; şerit = floor(u × n),
// bir öncekinin şeridine düşerse (+1) mod n. Dönüş: sıra → şerit
function opBaloncukPlan(tohum, kelimeler, n) {
    const rnd = loadOyunOrtak().rng(tohum);
    const plan = kelimeler.map(() => { const u = rnd(); rnd(); rnd(); return u; });
    let son = -1;
    return plan.map((u) => { let s = Math.min(n - 1, Math.floor(u * n)); if (s === son) s = (s + 1) % n; son = s; return s; });
}

opTest.describe('OnParmak — Uçan Baloncuklar (oyun bölümü)', () => {
    opTest('kazanma: ilk harf kilitler, kelime bitince baloncuk patlar, yenisi doğar → liste biter, canlı → 3 yıldız', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALONCUK);
        const k = OP_BALONCUK_K;
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await expect(opBaloncuk(page)).toHaveAttribute('data-can', '3');
        await expect(page.locator('.op-mini__can')).toHaveCount(3);
        await expect(page.locator('.op-baloncuk__ilerleme')).toHaveAttribute('aria-label', 'Kelime: 0 / ' + k.length + ', patlatılan baloncuk: 0');
        await expect(page.locator('.op-baloncuk__ilerleme')).toHaveText('0/' + k.length);
        // İki başlangıç baloncuğu da çayırın üstünde (seçilebilir)
        await expect(page.locator('.op-baloncuk__b[data-gorunur="1"]')).toHaveCount(2);
        await expect(page.locator('.op-ilerleme__ad')).toHaveText('Uçan Baloncuklar: orta sıra');
        expect((await opBlc(page)).map((b) => b.k)).toEqual(k.slice(0, 2));
        // Kilitsiz: beklenen = en acil (tepeye en yakın) baloncuğun ilk harfi; klavyede o tuş yanar
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[0][0]);
        const kod = await page.evaluate((ch) => window.KlavyeDizilim.tusOf(ch).code, k[0][0]);
        await expect(page.locator('.op-tus[data-code="' + kod + '"]')).toHaveClass(/is-hedef/);
        expect((await page.locator('.op-ekran').boundingBox()).width).toBeLessThanOrEqual(601);
        await page.clock.runFor(2000);
        const b0 = await opBlc(page);
        expect(b0[0].p).toBeGreaterThan(0.32);                  // süzülüyor
        expect(b0[0].p).toBeGreaterThan(b0[1].p);
        // İlk harf → kilit; sıradaki harf altı çizili, diğer baloncuklar soluk; Boşluk beklenmez
        await page.evaluate((c) => window.__opBas(c), k[0][0]);
        await expect(opBaloncuk(page)).toHaveAttribute('data-kilit', '0');
        await expect(page.locator('.op-baloncuk__b.is-kilitli')).toHaveAttribute('data-kelime', k[0]);
        await expect(page.locator('.op-baloncuk__b.is-kilitli tspan.is-sira')).toHaveText(k[0][1]);
        await expect(page.locator('.op-baloncuk__b.is-kilitli tspan.is-yazildi')).toHaveCount(1);
        await expect(opBaloncuk(page)).toHaveClass(/is-kilitli/);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[0][1]);
        for (const ch of [...k[0]].slice(1)) await page.evaluate((c) => window.__opBas(c), ch);
        // Patladı: sayılır, kilit düşer, eksilen yerine sıradaki kelime hemen doğar (eşzamanlı ≥ 2)
        await expect(opBaloncuk(page)).toHaveAttribute('data-patlayan', '1');
        await expect(opBaloncuk(page)).toHaveAttribute('data-kilit', '');
        await expect(page.locator('.op-baloncuk__pop')).toHaveCount(1);
        await expect(page.locator('.op-baloncuk__pop .op-mini__tik')).toHaveCount(1);    // renk dışı isabet: onay işareti
        expect((await opBlc(page)).map((b) => b.k)).toEqual(k.slice(1, 3));
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[1][0]);
        await page.clock.runFor(400);
        await expect(page.locator('.op-baloncuk__pop')).toHaveCount(0);
        await opCokYaz(page, 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opBaloncuk(page)).toHaveAttribute('data-bitti', 'canli');
        await expect(opBaloncuk(page)).toHaveAttribute('data-patlayan', String(k.length));
        await expect(page.locator('.op-baloncuk__ilerleme')).toHaveText(k.length + '/' + k.length);
        await expect(opBaloncuk(page)).toHaveAttribute('data-can', '3');
        await expect(page.locator('.op-baloncuk__b')).toHaveCount(0);
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', '3');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm ' + OP_BALONCUK + ' tamam!');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        await opBaloncukSonra(page);
        errors.assertClean();
    });

    opTest('yavaş ama doğru: kilitli baloncuk kaçar (can + kilit gider), 3 kaçış → en çok 1 yıldız, akış sürer', async ({ page, errors }) => {
        opTest.setTimeout(150000);
        await opAc(page, OP_BALONCUK);
        const k = OP_BALONCUK_K;
        await page.evaluate(() => { const r = document.querySelector('.op-oyun'); window.__opBas(r.dataset.beklenen); window.__opBas(r.dataset.beklenen); });
        await expect(opBaloncuk(page)).toHaveAttribute('data-kilit', '0');
        for (let i = 0; i < 80 && (await opBaloncuk(page).getAttribute('data-can')) === '3'; i++) await page.clock.runFor(1000);
        await expect(opBaloncuk(page)).toHaveAttribute('data-can', '2');
        await expect(page.locator('.op-mini__can.is-gitti')).toHaveCount(1);
        await expect(opBaloncuk(page)).toHaveAttribute('data-kilit', '');        // kilitli baloncuk kaçtı
        await expect(page.locator('.op-baloncuk__b[data-sira="0"]')).toHaveCount(0);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[1][0]);    // sıradaki en acil
        await opOyunBitene(page, 200);
        await expect(opBaloncuk(page)).toHaveAttribute('data-can', '0');
        await expect(opBaloncuk(page)).toHaveAttribute('data-bitti', 'canlar');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', '1');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm ' + OP_BALONCUK + ' bitti');
        await expect(page.locator('.op-serit .op-yildiz.is-kazanildi')).toHaveCount(1);
        await expect(page.locator('.op-serit__alt')).toContainText('canlar');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        await opBaloncukSonra(page);
        errors.assertClean();
    });

    opTest('hiç basmadan 3 baloncuk kaçar → tekrar (önce %80 kuralı); aynı bölüm 3 canla, ilk iki kelimeyle baştan', async ({ page, errors }) => {
        opTest.setTimeout(150000);
        await opAc(page, OP_BALONCUK);
        await opOyunBitene(page, 200);
        await expect(opBaloncuk(page)).toHaveAttribute('data-bitti', 'canlar');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', 'tekrar');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bir daha deneyelim');
        await expect(page.locator('.op-serit__alt')).toHaveText('doğruluk %0, hedef %80');
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', OP_BALONCUK + '/' + OP_N);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await expect(opBaloncuk(page)).toHaveAttribute('data-can', '3');
        expect((await opBlc(page)).map((b) => b.k)).toEqual(OP_BALONCUK_K.slice(0, 2));
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', OP_BALONCUK_B.metin[0]);
        errors.assertClean();
    });

    opTest('rastgele basma (doğruluk < %80) canlı bitse de tekrar', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALONCUK);
        await opYarimYaz(page);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opBaloncuk(page)).toHaveAttribute('data-bitti', 'canli');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', 'tekrar');
        await expect(page.locator('.op-serit__alt')).toHaveText('doğruluk %50, hedef %80');
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', OP_BALONCUK + '/' + OP_N);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        errors.assertClean();
    });

    opTest('ilk harf: kilitsizken eşleşmeyen harf hata; aynı harfle başlayanlardan tepeye en yakını kilitlenir; kilitliyken yanlış harf (öbürünün ilk harfi de) hata, kilit sürer', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALONCUK);
        await page.clock.runFor(1500);
        // Kilitsiz, hiçbir baloncuğun ilk harfi değil → hata, kilit yok
        await opYanlisBas(page);
        await expect(opBaloncuk(page)).toHaveAttribute('data-kilit', '');
        await expect(page.locator('.op-baloncuk__b.is-kilitli')).toHaveCount(0);
        // Aynı ilk harfli en az iki baloncuk: en yüksek p olan kilitlenmeli
        const once = await opBlc(page);
        const harf = [...new Set(once.map((b) => b.k[0]))].find((h) => once.filter((b) => b.k[0] === h).length >= 2);
        expect(harf, 'aynı ilk harfli iki baloncuk (içerik: ' + OP_BALONCUK_B.metin + ')').toBeTruthy();
        const adaylar = once.filter((b) => b.k[0] === harf).sort((a, b) => b.p - a.p);
        expect(adaylar[0].p).toBeGreaterThan(adaylar[1].p);
        await page.evaluate((c) => window.__opBas(c), harf);
        await expect(opBaloncuk(page)).toHaveAttribute('data-kilit', String(adaylar[0].sira));
        await expect(page.locator('.op-baloncuk__b.is-kilitli')).toHaveCount(1);
        await expect(page.locator('.op-baloncuk__b.is-kilitli')).toHaveAttribute('data-sira', String(adaylar[0].sira));
        // Kilitliyken öbür baloncuğun ilk harfi (sıradaki harf değil) → hata; kilit ve ilerleme yerinde
        const sira = adaylar[0].k[1];
        expect(harf).not.toBe(sira);
        await page.evaluate((c) => window.__opBas(c), harf);
        await expect(page.locator('.op-baloncuk__b.is-kilitli')).toHaveAttribute('data-sira', String(adaylar[0].sira));
        await expect(page.locator('.op-baloncuk__b.is-kilitli tspan.is-sira')).toHaveClass(/is-yanlis/);
        await expect(page.locator('.op-baloncuk__b.is-kilitli tspan.is-yazildi')).toHaveCount(1);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', sira);
        await page.evaluate((c) => window.__opBas(c), sira);
        await expect(page.locator('.op-baloncuk__b.is-kilitli tspan.is-yazildi')).toHaveCount(2);
        await expect(page.locator('.op-baloncuk__b.is-kilitli tspan.is-yanlis')).toHaveCount(0);
        await opCokYaz(page, 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opBaloncuk(page)).toHaveAttribute('data-bitti', 'canli');
        // 2 hata; basış = metnin boşluksuz harf sayısı + 2
        const harfSayisi = OP_BALONCUK_K.join('').length;
        const yuzde = Math.floor((harfSayisi / (harfSayisi + 2)) * 100);
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %' + yuzde);
        errors.assertClean();
    });

    opTest('sekme gizlenince durur; görünür olunca "Devam etmek için bir tuşa bas"; devam tuşu sayılmaz', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALONCUK);
        const k = OP_BALONCUK_K;
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        await page.clock.runFor(500);
        await opGorun(page, 'hidden');
        await expect(opBaloncuk(page)).toHaveAttribute('data-durum', 'gizli');
        const once = (await opBlc(page))[0].p;
        await page.clock.runFor(40000);                        // gizliyken baloncuklar yükselmez, kaçış yok
        expect((await opBlc(page))[0].p).toBe(once);
        await opGorun(page, 'visible');
        await expect(opBaloncuk(page)).toHaveAttribute('data-durum', 'devam-bekliyor');
        await expect(page.locator('.op-mini__devam')).toBeVisible();
        await expect(page.locator('.op-mini__devam')).toContainText('Devam etmek için bir tuşa bas');
        await page.clock.runFor(5000);
        expect((await opBlc(page))[0].p).toBe(once);
        await expect(opBaloncuk(page)).toHaveAttribute('data-can', '3');
        // Devam tuşu YANLIŞ harf: sayılsaydı doğruluk %100 olmazdı; yanlış işareti yok, kilit/hedef aynı
        await opYanlisBas(page);
        await expect(opBaloncuk(page)).toHaveAttribute('data-durum', 'calisiyor');
        await expect(page.locator('.op-mini__devam')).toBeHidden();
        await expect(page.locator('tspan.is-yanlis')).toHaveCount(0);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[0][1]);
        await page.clock.runFor(1000);
        expect((await opBlc(page))[0].p).toBeGreaterThan(once);
        await opCokYaz(page, 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        errors.assertClean();
    });

    opTest('yalnız GÖRÜNÜR baloncuk seçilir: çayırın arkasındakinin ilk harfi kilitlemez, hata sayılır; çıkınca kilitlenir', async ({ page, errors }) => {
        opTest.setTimeout(120000);
        await opAc(page, OP_BALONCUK);
        // Çayırın arkasında, ilk harfi hiçbir görünür baloncuğunkiyle aynı olmayan bir baloncuk bekle
        const gizliAday = () => page.evaluate(() => {
            const b = [...document.querySelectorAll('.op-baloncuk__b')].map((g) => ({ k: g.dataset.kelime, sira: g.dataset.sira, gor: g.dataset.gorunur === '1' }));
            const gorunenIlk = new Set(b.filter((x) => x.gor).map((x) => [...x.k][0]));
            return b.find((x) => !x.gor && !gorunenIlk.has([...x.k][0])) || null;
        });
        let aday = null;
        for (let i = 0; i < 120 && !(aday = await gizliAday()); i++) await page.clock.runFor(250);
        expect(aday, 'çayırın arkasında ayrı ilk harfli baloncuk').toBeTruthy();
        const harf = [...aday.k][0];
        await expect(opOyun(page)).not.toHaveAttribute('data-beklenen', harf);       // görünmeyen vurgulanmaz
        await page.evaluate((c) => window.__opBas(c), harf);
        await expect(opBaloncuk(page)).toHaveAttribute('data-kilit', '');               // kilitlemedi
        await expect(page.locator('.op-tus.is-yanlis')).toHaveCount(1);                 // hata olarak işaretlendi
        // Çayırın üstüne çıkınca aynı harf kilitler (başka görünür eşi yoksa)
        const sel = '.op-baloncuk__b[data-sira="' + aday.sira + '"]';
        for (let i = 0; i < 200 && (await page.locator(sel).getAttribute('data-gorunur')) !== '1'; i++) await page.clock.runFor(100);
        await expect(page.locator(sel)).toHaveAttribute('data-gorunur', '1');
        // Çok hedef: kilitsiz basış, aday en acil olmayabilir → eşleşen görünür baloncuk kilitlenir (adayın ilk harfi tektir)
        const kilitliVarMi = await opBaloncuk(page).getAttribute('data-kilit');
        if (!kilitliVarMi) {
            await page.evaluate((c) => window.__opBas(c), harf);
            await expect(opBaloncuk(page)).toHaveAttribute('data-kilit', aday.sira);
        }
        await opCokYaz(page, 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        // Görünmeyene basış hata sayıldı (doğruluk < %100)
        await expect(page.locator('.op-serit__alt')).not.toContainText('doğruluk %100');
        errors.assertClean();
    });

    opTest('Caps Lock açıkken oyun durur (baloncuk yükselmez, basış sayılmaz); kapanınca hemen sürer', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALONCUK);
        const k = OP_BALONCUK_K;
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        await page.clock.runFor(300);
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: true }));
        await expect(page.locator('.op-caps')).toBeVisible();
        await expect(opBaloncuk(page)).toHaveAttribute('data-durum', 'duraklatildi');
        const once = (await opBlc(page))[0].p;
        await page.clock.runFor(60000);
        expect((await opBlc(page))[0].p).toBe(once);
        await expect(opBaloncuk(page)).toHaveAttribute('data-can', '3');
        await page.evaluate((ch) => window.__opBas(ch, { caps: true }), k[0][1]);        // Caps açıkken: sayılmaz
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[0][1]);
        await expect(page.locator('.op-mini__devam')).toBeHidden();
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: false }));
        await expect(page.locator('.op-caps')).toBeHidden();
        await expect(opBaloncuk(page)).toHaveAttribute('data-durum', 'calisiyor');
        await page.clock.runFor(2000);
        expect((await opBlc(page))[0].p).toBeGreaterThan(once);
        await opCokYaz(page, 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        errors.assertClean();
    });

    opTest('rAF: oyun sürerken bekleyen kare + ResizeObserver; bitince oyun durur (RO 0, sahne yok)', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await opAc(page, OP_BALONCUK, OP_N, (p) => p.addInitScript(OP_RAF));
        await page.clock.runFor(200);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.__opDinleyiciSayisi('visibilitychange'))).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(1);
        await opCokYaz(page, 100);
        await opBaloncukSonra(page);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(0);
        errors.assertClean();
    });

    opTest('aynı tohum (bölüm numarası) iki açılışta aynı baloncuk sırası, şeritleri ve hedef dizisi; başka tohum başka sahne', async ({ page, errors }) => {
        opTest.setTimeout(120000);
        let ilk = true;
        const iz = async (p, no) => {
            if (ilk) { ilk = false; await opAc(p, no); } else {
                await p.locator('#game-home').click();
                await p.clock.runFor(1000);
                await p.locator('.game-card[data-game="on-parmak"]').first().click();
                await p.clock.runFor(500);
                await expect(opPicker(p)).toBeVisible();
                await p.locator('.op-picker__bolum[data-bolum-sec="' + no + '"]').click();
                await expect(opOyun(p)).toHaveAttribute('data-bolum', no + '/' + OP_N);
            }
            const tohum = await opBaloncuk(p).getAttribute('data-tohum');
            const bulut = await p.locator('.op-baloncuk__bulut').evaluateAll((d) => d.map((g) => g.getAttribute('transform')).join('|'));
            // Doğuş sırası + şerit + yatay konum (dikey konum kare zamanlamasına göre birkaç birim oynar; karşılaştırılmaz)
            const konum = () => p.locator('.op-baloncuk__b').evaluateAll((d) => d.map((g) => g.dataset.sira + ':' + g.dataset.serit + '@' + /translate\(([-\d.]+)/.exec(g.getAttribute('transform'))[1]).join(','));
            const bas = await konum();
            // 12 doğru harf; görünür baloncuk yoksa (yeni doğan çayırın arkasında) saat ilerler
            const hedefler = [];
            for (let n = 0; n < 60 && hedefler.length < 12; n++) {
                const ch = await opOyun(p).getAttribute('data-beklenen');
                if (!ch) { await p.clock.runFor(250); continue; }
                hedefler.push(ch);
                await p.evaluate((c) => window.__opBas(c), ch);
            }
            const dogan = [];
            for (let i = 0; i < 20; i++) { await p.clock.runFor(1000); dogan.push(await konum()); }
            return { tohum, bulut, bas, hedefler, dogan, n: Number(await opBaloncuk(p).getAttribute('data-seritler')) };
        };
        const a = await iz(page, OP_BALONCUK);
        const b = await iz(page, OP_BALONCUK);
        expect(a.tohum).toBe(String(OP_BALONCUK));
        expect(b).toEqual(a);
        expect(a.hedefler.join('')).toBe(OP_BALONCUK_K.join('').slice(0, 12));
        // Şerit YALNIZ plandan (rng(tohum) + şerit sayısı): Node'da hesaplanan planla birebir; kare zamanlamasına,
        // doluluğa bakan bir seçim bu eşitliği bozar
        expect(a.n).toBeGreaterThanOrEqual(2);
        const plan = opBaloncukPlan(OP_BALONCUK, OP_BALONCUK_K, a.n);
        const gorulen = {};
        for (const kare of [a.bas, ...a.dogan]) for (const x of kare.split(',').filter(Boolean)) {
            const [sira, serit] = x.split('@')[0].split(':').map(Number);
            gorulen[sira] = serit;
        }
        expect(Object.keys(gorulen).length).toBeGreaterThan(4);
        for (const s of Object.keys(gorulen)) expect(gorulen[s], 'plan, sıra ' + s).toBe(plan[s]);
        // Zamanla baloncuk doğdu (doğuş sırası metin sırası; şerit tohumdan)
        const sonSiralar = a.dogan[a.dogan.length - 1].split(',').map((x) => Number(x.split(':')[0]));
        expect(Math.max(...sonSiralar)).toBeGreaterThan(4);
        const c = await page.evaluate(() => {
            const kap = document.createElement('div');
            kap.style.cssText = 'position:fixed;width:800px;height:360px;left:0;top:0';
            document.body.appendChild(kap);
            const oy = window.OnParmakOyunlari.baloncuk;
            oy.baslat(kap, { metin: 'hala daha', tohum: 999 }, { tus() {}, bitti() {} });
            const x = [...kap.querySelectorAll('.op-baloncuk__bulut')].map((g) => g.getAttribute('transform')).join('|');
            oy.durdur();
            const bos = kap.childElementCount;
            kap.remove();
            return { x, bos };
        });
        expect(c.x).not.toBe(a.bulut);
        expect(c.bos).toBe(0);
        errors.assertClean();
    });

    opTest('rAF: oyun ortasında hub\'a dönünce bekleyen kare 0, dinleyiciler açılış öncesine döner', async ({ page, errors }) => {
        opTest.setTimeout(90000);
        await page.clock.install({ time: new Date('2026-10-19T09:00:00Z') });
        await page.addInitScript(OP_RAF);
        await page.goto('/?oyun=' + OP_SLUG);
        await expect(opPicker(page)).toBeVisible();
        await page.keyboard.press('Shift');
        await page.clock.runFor(500);
        const once = await page.evaluate(() => ({ k: window.__opKeydownSayisi(), v: window.__opDinleyiciSayisi('visibilitychange'), raf: window.__opRafBekleyen() }));
        await page.locator('.op-picker__bolum[data-bolum-sec="' + OP_BALONCUK + '"]').click();
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await page.evaluate(() => { const r = document.querySelector('.op-oyun'); for (let i = 0; i < 2; i++) window.__opBas(r.dataset.beklenen); });
        await page.clock.runFor(150);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBeGreaterThan(once.raf);
        await page.locator('#game-home').click();
        await page.clock.runFor(1000);
        await expect(page.locator('#hub')).toBeVisible();
        await page.clock.runFor(1000);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBe(0);
        expect(await page.evaluate(() => window.__opKeydownSayisi())).toBe(once.k);
        expect(await page.evaluate(() => window.__opDinleyiciSayisi('visibilitychange'))).toBe(once.v);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(0);
        await expect(opBaloncuk(page)).toHaveCount(0);
        errors.assertClean();
    });
});

// Normal hız yolu: salınım, patlama halkası + damlalar, kaçış pufu, kazanınca kutlama baloncukları
opTest.describe('OnParmak — Uçan Baloncuklar, normal hareket', () => {
    opTest.use({ reducedMotion: 'no-preference' });
    opTest('baloncuklar salınarak yükselir; patlama halkası genişleyip söner (damlalar); kaçışta puf; kazanma ≥ 1 yıldız', async ({ page, errors }) => {
        opTest.setTimeout(120000);
        await opAc(page, OP_BALONCUK);
        const k = OP_BALONCUK_K;
        expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
        // Salınım: aynı şeritte x değişir; normal hız azaltılmıştan yüksek (1 sn'de > 0,04 p)
        const xOf = () => page.locator('.op-baloncuk__b[data-sira="0"]').evaluate((g) => Number(/translate\(([-\d.]+)/.exec(g.getAttribute('transform'))[1]));
        const p0 = (await opBlc(page))[0].p;
        const x0 = await xOf();
        await page.clock.runFor(1000);
        expect(Math.abs((await xOf()) - x0)).toBeGreaterThan(0.5);
        expect((await opBlc(page))[0].p - p0).toBeGreaterThan(0.04);
        // Patlama: halka + 8 damla, ~280 ms'de söner
        for (const ch of k[0]) await page.evaluate((c) => window.__opBas(c), ch);
        await expect(page.locator('.op-baloncuk__pop')).toHaveCount(1);
        await expect(page.locator('.op-baloncuk__damla')).toHaveCount(8);
        const rBas = await page.locator('.op-baloncuk__pop-halka').evaluate((c) => Number(c.getAttribute('r')));
        await page.clock.runFor(150);
        expect(await page.locator('.op-baloncuk__pop-halka').evaluate((c) => Number(c.getAttribute('r')))).toBeGreaterThan(rBas);
        await page.clock.runFor(300);
        await expect(page.locator('.op-baloncuk__pop')).toHaveCount(0);
        // Kaçış: puf (3 küçük bulut) belirip söner
        for (let i = 0; i < 300 && (await opBaloncuk(page).getAttribute('data-can')) === '3'; i++) await page.clock.runFor(100);
        await expect(opBaloncuk(page)).toHaveAttribute('data-can', '2');
        await expect(page.locator('.op-baloncuk__puf .op-baloncuk__puf-c')).toHaveCount(3);
        await page.clock.runFor(500);
        await expect(page.locator('.op-baloncuk__puf')).toHaveCount(0);
        await opCokYaz(page, 250);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opBaloncuk(page)).toHaveAttribute('data-bitti', 'canli');
        await expect(page.locator('.op-baloncuk__kutlama')).toHaveCount(1);
        // Bir baloncuk kaçtı ama sayaç tamamlanmış durumu gösterir (ele alınan kelime = toplam)
        await expect(page.locator('.op-baloncuk__ilerleme')).toHaveText(k.length + '/' + k.length);
        expect(Number(await opBaloncuk(page).getAttribute('data-patlayan'))).toBeLessThan(k.length);
        expect(Number(await opOyun(page).getAttribute('data-sonuc'))).toBeGreaterThanOrEqual(1);
        errors.assertClean();
    });
});

// ── Mini oyun: Elma Bekçisi (tur:'oyun', js/games/on-parmak-elma.js) ──
// Kelime oyunu, çok hedef: ilk harf GÖRÜNEN sincaplardan ağaca en yakını seçer (hedefSec), kilit kelime bitene dek sürer;
// BOŞLUK yazılmaz. Ağaca varan sincap bir elma alır (5 elma = can). Kısım 1'de yok → opTestElma fikstürü (2. kısım:
// Elma bölümü + satır). Öncelik (sapma 9): önce %80, sonra elmalar.
const OP_ELMA = OP_N + 1;                 // fikstürdeki Elma bölümünün genel numarası (= tohum)
const OP_ELMA_N = OP_N + 2;               // fikstürle toplam bölüm
const OP_ELMA_K = OP_ELMA_METIN.split(' ');
const opElma = (page) => page.locator('.op-elma');
// Sahnedeki seçilebilir/yürüyen sincaplar (kaçanlar data-sira taşımaz): kelime, sıra, taraf, şerit, yol m, görünür, kilit, x
const opSnc = (page) => page.evaluate(() => [...document.querySelectorAll('.op-elma__s[data-sira]')].map((g) => ({
    k: g.dataset.kelime, sira: Number(g.dataset.sira), taraf: g.dataset.taraf, serit: g.dataset.serit, m: Number(g.dataset.m),
    gorunur: g.dataset.gorunur === '1', kilit: g.classList.contains('is-kilitli'),
    x: Number(/translate\(([-\d.]+)/.exec(g.getAttribute('transform'))[1]),
})).sort((a, b) => a.sira - b.sira));   // şeritler ayrı katman → DOM sırası değil doğuş sırası
async function opElmaSonra(page) {
    await page.clock.runFor(2600);
    await expect(opOyun(page)).toHaveAttribute('data-bolum', (OP_ELMA + 1) + '/' + OP_ELMA_N);
    await expect(opOyun(page)).toHaveAttribute('data-mod', 'satir');
    await expect(opElma(page)).toHaveCount(0);
}
// data-beklenen'i yazar; beklenen boşsa (yalnız giren sincap var) saat ilerler ve bekler (ortak çok hedef yazıcı)
const opElmaYaz = (page, ms, azami) => opCokYaz(page, ms, azami);
async function opElmaAc(page, hazirla = null) { await opAc(page, OP_ELMA, OP_ELMA_N, hazirla); }

opTestElma.describe('OnParmak — Elma Bekçisi (oyun bölümü, test fikstürü)', () => {
    opTestElma('kazanma: ilk harf kilitler, kelime bitince sincap kaçar, yenisi doğar → kelimeler biter, 5 elma → 3 yıldız', async ({ page, errors }) => {
        opTestElma.setTimeout(90000);
        await opElmaAc(page);
        const k = OP_ELMA_K;
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await expect(page.locator('.op-ilerleme__ad')).toHaveText('Elma Bekçisi: deneme');
        await expect(opElma(page)).toHaveAttribute('data-elma', '5');
        await expect(opElma(page)).toHaveAttribute('data-tohum', String(OP_ELMA));
        await expect(page.locator('.op-elma__hud-elma')).toHaveCount(5);
        await expect(page.locator('.op-elma .op-mini__canlar')).toHaveAttribute('aria-label', 'Elma: 5 / 5');
        await expect(page.locator('.op-elma__ilerleme')).toHaveAttribute('aria-label', 'Kelime: 0 / ' + k.length + ', bitirilen: 0');
        await expect(page.locator('.op-elma__yuva:not(.is-alindi)')).toHaveCount(5);
        const ilk = await opSnc(page);
        expect(ilk.map((b) => b.k)).toEqual(k.slice(0, 2));
        expect(ilk.map((b) => b.taraf).sort()).toEqual(['sag', 'sol']);       // ilk çift iki yandan
        expect(ilk[0].gorunur).toBe(true);
        // Kilitsiz: beklenen = ağaca en yakın GÖRÜNEN sincabın ilk harfi; klavyede o tuş yanar; Boşluk beklenmez
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[0][0]);
        const kod = await page.evaluate((ch) => window.KlavyeDizilim.tusOf(ch).code, k[0][0]);
        await expect(page.locator('.op-tus[data-code="' + kod + '"]')).toHaveClass(/is-hedef/);
        await page.clock.runFor(2000);
        const s0 = await opSnc(page);
        expect(s0[0].m).toBeGreaterThan(0.2);                                   // ağaca yürüyor
        expect(s0[1].gorunur).toBe(true);                                       // giriş bitti
        // İlk harf → kilit; sıradaki harf altı çizili, kilitli etiket işaretli, diğerleri soluk
        await page.evaluate((c) => window.__opBas(c), k[0][0]);
        await expect(opElma(page)).toHaveAttribute('data-kilit', '0');
        await expect(opElma(page)).toHaveClass(/is-kilitli/);
        await expect(page.locator('.op-elma__etiket.is-kilitli tspan.is-sira')).toHaveText(k[0][1]);
        await expect(page.locator('.op-elma__etiket.is-kilitli tspan.is-yazildi')).toHaveCount(1);
        await expect(page.locator('.op-elma__s.is-kilitli')).toHaveAttribute('data-kelime', k[0]);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[0][1]);
        for (const ch of [...k[0]].slice(1)) await page.evaluate((c) => window.__opBas(c), ch);
        // Kelime bitti: sincap kaçar (seçilemez, etiketsiz), sayılır, kilit düşer, eksilen yerine sıradaki doğar
        await expect(opElma(page)).toHaveAttribute('data-biten', '1');
        await expect(opElma(page)).toHaveAttribute('data-kilit', '');
        await expect(page.locator('.op-elma__ilerleme')).toHaveAttribute('aria-label', 'Kelime: 1 / ' + k.length + ', bitirilen: 1');
        await expect(page.locator('.op-elma__s.is-kaciyor')).toHaveCount(1);
        await expect(page.locator('.op-elma__etiket[data-sira="0"]')).toHaveCount(0);
        await expect(page.locator('.op-elma__etiket--pop .op-mini__tik')).toHaveCount(1);   // renk dışı isabet: onay
        expect((await opSnc(page)).map((b) => b.k)).toEqual(k.slice(1, 3));
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[1][0]);
        await page.clock.runFor(3000);
        await expect(page.locator('.op-elma__s.is-kaciyor')).toHaveCount(0);   // kaçan sahneden çıktı (azaltılmış: soldu)
        await opElmaYaz(page, 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opElma(page)).toHaveAttribute('data-bitti', 'canli');
        await expect(opElma(page)).toHaveAttribute('data-biten', String(k.length));
        await expect(opElma(page)).toHaveAttribute('data-elma', '5');
        await expect(page.locator('.op-elma__ilerleme')).toHaveText(k.length + '/' + k.length);
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', '3');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm ' + OP_ELMA + ' tamam!');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        await opElmaSonra(page);
        errors.assertClean();
    });

    opTestElma('yavaş ama doğru: kilitli sincap ağaca varır (elma + kilit gider), 5 elma biter → en çok 1 yıldız, akış sürer', async ({ page, errors }) => {
        opTestElma.setTimeout(150000);
        await opElmaAc(page);
        const k = OP_ELMA_K;
        await page.evaluate(() => { const r = document.querySelector('.op-oyun'); window.__opBas(r.dataset.beklenen); window.__opBas(r.dataset.beklenen); });
        await expect(opElma(page)).toHaveAttribute('data-kilit', '0');
        for (let i = 0; i < 80 && (await opElma(page).getAttribute('data-elma')) === '5'; i++) await page.clock.runFor(1000);
        await expect(opElma(page)).toHaveAttribute('data-elma', '4');
        await expect(page.locator('.op-elma .op-mini__can.is-gitti')).toHaveCount(1);
        await expect(page.locator('.op-elma .op-mini__canlar')).toHaveAttribute('aria-label', 'Elma: 4 / 5');
        await expect(page.locator('.op-elma__yuva.is-alindi')).toHaveCount(1);
        await expect(opElma(page)).toHaveAttribute('data-kilit', '');           // kilitli sincap ağaca vardı
        await expect(page.locator('.op-elma__s[data-sira="0"]')).toHaveCount(0);
        const kalan = await opSnc(page);
        expect(kalan.length).toBeGreaterThan(0);
        for (const b of kalan) expect(k.slice(1)).toContain(b.k);
        await opOyunBitene(page, 300);
        await expect(opElma(page)).toHaveAttribute('data-elma', '0');
        await expect(page.locator('.op-elma__yuva.is-alindi')).toHaveCount(5);
        await expect(opElma(page)).toHaveAttribute('data-bitti', 'elmalar');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', '1');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bölüm ' + OP_ELMA + ' bitti');
        await expect(page.locator('.op-serit .op-yildiz.is-kazanildi')).toHaveCount(1);
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        await opElmaSonra(page);
        errors.assertClean();
    });

    opTestElma('hiç basmadan 5 elma gider → tekrar (önce %80 kuralı); aynı bölüm 5 elmayla, ilk iki kelimeyle baştan', async ({ page, errors }) => {
        opTestElma.setTimeout(150000);
        await opElmaAc(page);
        await opOyunBitene(page, 300);
        await expect(opElma(page)).toHaveAttribute('data-bitti', 'elmalar');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', 'tekrar');
        await expect(page.locator('.op-serit__baslik')).toHaveText('Bir daha deneyelim');
        await expect(page.locator('.op-serit__alt')).toHaveText('doğruluk %0, hedef %80');
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', OP_ELMA + '/' + OP_ELMA_N);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await expect(opElma(page)).toHaveAttribute('data-elma', '5');
        await expect(page.locator('.op-elma__yuva.is-alindi')).toHaveCount(0);
        expect((await opSnc(page)).map((b) => b.k)).toEqual(OP_ELMA_K.slice(0, 2));
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', OP_ELMA_K[0][0]);
        errors.assertClean();
    });

    opTestElma('rastgele basma (doğruluk < %80) canlı bitse de tekrar', async ({ page, errors }) => {
        opTestElma.setTimeout(90000);
        await opElmaAc(page);
        for (let n = 0; n < 400 && (await opOyun(page).getAttribute('data-mod')) === 'oyun'; n++) {
            await page.evaluate(() => {
                const r = document.querySelector('.op-oyun');
                if (!r.dataset.beklenen) return;                          // yalnız giren sincap: bekle
                window.__opBas('f');                                      // hiçbir kelimenin harfi değil → hata
                if (r.dataset.mod === 'oyun') window.__opBas(r.dataset.beklenen);
            });
            await page.clock.runFor(100);
        }
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opElma(page)).toHaveAttribute('data-bitti', 'canli');
        await expect(opOyun(page)).toHaveAttribute('data-sonuc', 'tekrar');
        await expect(page.locator('.op-serit__alt')).toHaveText('doğruluk %50, hedef %80');
        await page.clock.runFor(2600);
        await expect(opOyun(page)).toHaveAttribute('data-bolum', OP_ELMA + '/' + OP_ELMA_N);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        errors.assertClean();
    });

    opTestElma('ilk harf: sahneye girmemiş sincap seçilemez; aynı harfle başlayanlardan ağaca en yakını kilitlenir; kilitliyken yanlış harf (öbürünün ilk harfi de) hata, kilit sürer', async ({ page, errors }) => {
        opTestElma.setTimeout(120000);
        await opElmaAc(page);
        const k = OP_ELMA_K;
        // Açılışta 2. sincap ("dal") kenardan giriyor: görünmüyor → ilk harfi hata, kilit yok, vurgu onu göstermez
        const bas = await opSnc(page);
        expect(bas[1].k).toBe(k[1]);
        expect(bas[1].gorunur).toBe(false);
        await expect(page.locator('.op-elma__s[data-sira="1"]')).toHaveAttribute('data-gorunur', '0');
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[0][0]);
        await page.evaluate((c) => window.__opBas(c), k[1][0]);
        await expect(opElma(page)).toHaveAttribute('data-kilit', '');
        // Kilitsiz, hiçbir sincabın ilk harfi değil → hata
        await page.evaluate(() => window.__opBas('f'));
        await expect(opElma(page)).toHaveAttribute('data-kilit', '');
        // Giriş bitince aynı harf onu kilitler
        await page.clock.runFor(1200);
        await expect(page.locator('.op-elma__s[data-sira="1"]')).toHaveAttribute('data-gorunur', '1');
        await page.evaluate((c) => window.__opBas(c), k[1][0]);
        await expect(opElma(page)).toHaveAttribute('data-kilit', '1');
        // Kilitliyken öbür sincabın ilk harfi (sıradaki harf değil) → hata; kilit ve ilerleme yerinde, sıradaki harf kırmızı
        expect(k[0][0]).not.toBe(k[1][1]);
        await page.evaluate((c) => window.__opBas(c), k[0][0]);
        await expect(opElma(page)).toHaveAttribute('data-kilit', '1');
        await expect(page.locator('.op-elma__etiket.is-kilitli tspan.is-sira')).toHaveClass(/is-yanlis/);
        await expect(page.locator('.op-elma__etiket.is-kilitli tspan.is-yazildi')).toHaveCount(1);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[1][1]);
        for (const ch of [...k[1]].slice(1)) await page.evaluate((c) => window.__opBas(c), ch);
        await expect(opElma(page)).toHaveAttribute('data-biten', '1');
        // "kasa" ve "kaş" (aynı ilk harf) ikisi de görünür olana dek bekle; "k" ağaca en yakın olanı kilitler
        let adaylar = [];
        for (let i = 0; i < 40; i++) {
            adaylar = (await opSnc(page)).filter((b) => b.gorunur && b.k[0] === 'k');
            if (adaylar.length >= 2) break;
            await page.clock.runFor(500);
        }
        expect(adaylar.length, 'aynı ilk harfli iki görünür sincap').toBeGreaterThanOrEqual(2);
        adaylar.sort((a, b) => b.m - a.m);
        expect(adaylar[0].m).toBeGreaterThan(adaylar[1].m);
        expect(adaylar[0].taraf).not.toBe(adaylar[1].taraf);                   // iki yandan
        await page.evaluate(() => window.__opBas('k'));
        await expect(opElma(page)).toHaveAttribute('data-kilit', String(adaylar[0].sira));
        await expect(page.locator('.op-elma__s.is-kilitli')).toHaveCount(1);
        await expect(page.locator('.op-elma__s.is-kilitli')).toHaveAttribute('data-sira', String(adaylar[0].sira));
        await opElmaYaz(page, 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opElma(page)).toHaveAttribute('data-bitti', 'canli');
        // 3 hata (girmemiş sincabın harfi, f, kilitliyken öbür harf); basış = boşluksuz harf sayısı + 3
        const harfSayisi = k.join('').length;
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %' + Math.floor((harfSayisi / (harfSayisi + 3)) * 100));
        errors.assertClean();
    });

    opTestElma('sekme gizlenince durur; görünür olunca "Devam etmek için bir tuşa bas"; devam tuşu sayılmaz', async ({ page, errors }) => {
        opTestElma.setTimeout(90000);
        await opElmaAc(page);
        const k = OP_ELMA_K;
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        await page.clock.runFor(500);
        await opGorun(page, 'hidden');
        await expect(opElma(page)).toHaveAttribute('data-durum', 'gizli');
        const once = (await opSnc(page))[0].m;
        await page.clock.runFor(60000);                        // gizliyken sincaplar yürümez, elma gitmez
        expect((await opSnc(page))[0].m).toBe(once);
        await opGorun(page, 'visible');
        await expect(opElma(page)).toHaveAttribute('data-durum', 'devam-bekliyor');
        await expect(page.locator('.op-mini__devam')).toBeVisible();
        await expect(page.locator('.op-mini__devam')).toContainText('Devam etmek için bir tuşa bas');
        await page.clock.runFor(5000);
        expect((await opSnc(page))[0].m).toBe(once);
        await expect(opElma(page)).toHaveAttribute('data-elma', '5');
        // Devam tuşu YANLIŞ harf: sayılsaydı doğruluk %100 olmazdı; yanlış işareti yok, kilit/hedef aynı
        await page.evaluate(() => window.__opBas('f'));
        await expect(opElma(page)).toHaveAttribute('data-durum', 'calisiyor');
        await expect(page.locator('.op-mini__devam')).toBeHidden();
        await expect(page.locator('tspan.is-yanlis')).toHaveCount(0);
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[0][1]);
        await page.clock.runFor(1000);
        expect((await opSnc(page))[0].m).toBeGreaterThan(once);
        await opElmaYaz(page, 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        errors.assertClean();
    });

    opTestElma('Caps Lock açıkken oyun durur (sincap yürümez, basış sayılmaz); kapanınca hemen sürer', async ({ page, errors }) => {
        opTestElma.setTimeout(90000);
        await opElmaAc(page);
        const k = OP_ELMA_K;
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        await page.clock.runFor(300);
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: true }));
        await expect(page.locator('.op-caps')).toBeVisible();
        await expect(opElma(page)).toHaveAttribute('data-durum', 'duraklatildi');
        const once = (await opSnc(page))[0].m;
        await page.clock.runFor(60000);
        expect((await opSnc(page))[0].m).toBe(once);
        await expect(opElma(page)).toHaveAttribute('data-elma', '5');
        await page.evaluate((ch) => window.__opBas(ch, { caps: true }), k[0][1]);   // Caps açıkken: sayılmaz
        await expect(opOyun(page)).toHaveAttribute('data-beklenen', k[0][1]);
        await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: false }));
        await expect(page.locator('.op-caps')).toBeHidden();
        await expect(opElma(page)).toHaveAttribute('data-durum', 'calisiyor');
        await page.clock.runFor(2000);
        expect((await opSnc(page))[0].m).toBeGreaterThan(once);
        await opElmaYaz(page, 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(page.locator('.op-serit__alt')).toContainText('doğruluk %100');
        errors.assertClean();
    });

    opTestElma('rAF: oyun sürerken bekleyen kare + ResizeObserver; bitince oyun durur (RO 0, sahne yok)', async ({ page, errors }) => {
        opTestElma.setTimeout(90000);
        await opElmaAc(page, (p) => p.addInitScript(OP_RAF));
        await page.clock.runFor(200);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.__opDinleyiciSayisi('visibilitychange'))).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(1);
        await opElmaYaz(page, 100);
        await opElmaSonra(page);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(0);
        errors.assertClean();
    });

    opTestElma('rAF: oyun ortasında hub\'a dönünce bekleyen kare 0, dinleyiciler açılış öncesine döner', async ({ page, errors }) => {
        opTestElma.setTimeout(90000);
        await page.clock.install({ time: new Date('2026-10-19T09:00:00Z') });
        await page.addInitScript(OP_RAF);
        await page.goto('/?oyun=' + OP_SLUG);
        await expect(opPicker(page)).toBeVisible();
        await page.keyboard.press('Shift');
        await page.clock.runFor(500);
        const once = await page.evaluate(() => ({ k: window.__opKeydownSayisi(), v: window.__opDinleyiciSayisi('visibilitychange'), raf: window.__opRafBekleyen() }));
        await page.locator('.op-picker__bolum[data-bolum-sec="' + OP_ELMA + '"]').click();
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
        await page.evaluate(() => { const r = document.querySelector('.op-oyun'); for (let i = 0; i < 4; i++) window.__opBas(r.dataset.beklenen); });
        await page.clock.runFor(150);
        await expect(page.locator('.op-elma__s.is-kaciyor')).toHaveCount(1);   // kaçış efekti sürüyor
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBeGreaterThan(once.raf);
        await page.locator('#game-home').click();
        await page.clock.runFor(1000);
        await expect(page.locator('#hub')).toBeVisible();
        await page.clock.runFor(1000);
        expect(await page.evaluate(() => window.__opRafBekleyen())).toBe(0);
        expect(await page.evaluate(() => window.__opKeydownSayisi())).toBe(once.k);
        expect(await page.evaluate(() => window.__opDinleyiciSayisi('visibilitychange'))).toBe(once.v);
        expect(await page.evaluate(() => window.__opRoEtkin())).toBe(0);
        await expect(opElma(page)).toHaveCount(0);
        errors.assertClean();
    });

    opTestElma('aynı tohum iki açılışta aynı doğuş sırası, taraf, şerit ve konum; taraf/şerit basış zamanlamasından bağımsız; başka tohum başka sahne', async ({ page, errors }) => {
        opTestElma.setTimeout(180000);
        // Açılışlar hub kartından (saat duruk → kare zamanlaması iki açılışta birebir aynı); ilk açılış yalnız giriş
        await opElmaAc(page);
        const ac = async (p) => {
            await p.locator('#game-home').click();
            await p.clock.runFor(1000);
            await p.locator('.game-card[data-game="on-parmak"]').first().click();
            await p.clock.runFor(500);
            await expect(opPicker(p)).toBeVisible();
            await p.locator('.op-picker__bolum[data-bolum-sec="' + OP_ELMA + '"]').click();
            await expect(opOyun(p)).toHaveAttribute('data-bolum', OP_ELMA + '/' + OP_ELMA_N);
        };
        // Doğuş sırası + taraf + şerit birebir; x (= yoldaki ilerleme) kare evresine göre ±birkaç birim oynar → toleransla
        const konum = async (p) => (await opSnc(p)).map((b) => ({ id: b.sira + ':' + b.taraf + ':' + b.serit, x: b.x }));
        const ayniKonum = (u, v) => {
            expect(u.map((o) => o.id)).toEqual(v.map((o) => o.id));
            u.forEach((o, i) => expect(Math.abs(o.x - v[i].x), o.id).toBeLessThan(4));
        };
        // Sıra → taraf:şerit haritası (doğan her sincap)
        const harita = async (p, h) => { for (const b of await opSnc(p)) h[b.sira] = b.taraf + ':' + b.serit; };
        const iz = async (p, yaz) => {
            await ac(p);
            const tepe = await p.locator('.op-elma__tepe').getAttribute('d');
            const bas = await konum(p);
            const h = {};
            const hedefler = [], seyir = [];
            for (let i = 0; i < 40; i++) {
                await harita(p, h);
                if (yaz && i % 2 === 0) {
                    const ch = await opOyun(p).getAttribute('data-beklenen');
                    hedefler.push(ch);
                    if (ch) await p.evaluate((c) => window.__opBas(c), ch);
                }
                await p.clock.runFor(700);
                if (await opOyun(p).getAttribute('data-mod') !== 'oyun') break;
                seyir.push(await konum(p));
            }
            return { tohum: await opElma(p).getAttribute('data-tohum'), tepe, bas, hedefler, seyir, harita: h };
        };
        const a = await iz(page, true);
        const b = await iz(page, true);
        expect(a.tohum).toBe(String(OP_ELMA));
        expect([b.tohum, b.tepe, b.hedefler, b.harita]).toEqual([a.tohum, a.tepe, a.hedefler, a.harita]);
        ayniKonum(b.bas, a.bas);
        expect(b.seyir.length).toBe(a.seyir.length);
        a.seyir.forEach((u, i) => ayniKonum(b.seyir[i], u));
        expect(Object.keys(a.harita).length).toBeGreaterThan(5);
        // Hiç basmadan (bambaşka zamanlama): açılış aynı; aynı sıra numarasının tarafı ve şeridi aynı
        const c = await iz(page, false);
        ayniKonum(c.bas, a.bas);
        const ortak = Object.keys(c.harita).filter((s) => a.harita[s]);
        expect(ortak.length).toBeGreaterThan(3);
        for (const s of ortak) expect(c.harita[s], 'sıra ' + s).toBe(a.harita[s]);
        // Sözleşme: taraf/şerit YALNIZ rng(tohum)'dan (oyun başlığındaki plan): çift başına bir rnd() (ilki hangi yandan),
        // her yanda şerit yakın(1)/uzak(0) sırayla. Kare zamanlamasına, doluluğa bakan bir seçim bu eşitliği bozar.
        const rnd = loadOyunOrtak().rng(OP_ELMA);
        const plan = {}, sayac = { sol: 0, sag: 0 };
        for (let i = 0; i < OP_ELMA_K.length; i += 2) {
            const once = rnd() < 0.5 ? 'sol' : 'sag', sonra = once === 'sol' ? 'sag' : 'sol';
            [once, sonra].forEach((t, j) => { if (i + j < OP_ELMA_K.length) plan[i + j] = t + ':' + (1 - (sayac[t]++ % 2)); });
        }
        for (const h of [a.harita, c.harita]) for (const s of Object.keys(h)) expect(h[s], 'plan, sıra ' + s).toBe(plan[s]);
        // Başka tohum → başka tepe çizgisi; durdur DOM'u boşaltır
        const d = await page.evaluate(() => {
            const kap = document.createElement('div');
            kap.style.cssText = 'position:fixed;width:800px;height:360px;left:0;top:0';
            document.body.appendChild(kap);
            const oy = window.OnParmakOyunlari.elma;
            oy.baslat(kap, { metin: 'hala daha', tohum: 999 }, { tus() {}, bitti() {} });
            const x = kap.querySelector('.op-elma__tepe').getAttribute('d');
            oy.durdur();
            const bos = kap.childElementCount;
            kap.remove();
            return { x, bos };
        });
        expect(d.x).not.toBe(a.tepe);
        expect(d.bos).toBe(0);
        errors.assertClean();
    });
});

// Normal hız yolu: sekme, kaçışta zıplama + koşu (sahneden çıkar), elmanın daldan pati'ye uçuşu, kazanınca elma zıplaması
opTestElma.describe('OnParmak — Elma Bekçisi, normal hareket', () => {
    opTestElma.use({ reducedMotion: 'no-preference' });
    opTestElma('sincaplar sekerek yürür; kaçan sincap koşarak sahneden çıkar; elma daldan uçup sincapla gider; kazanma ≥ 1 yıldız, elmalar zıplar', async ({ page, errors }) => {
        opTestElma.setTimeout(150000);
        await opElmaAc(page);
        const k = OP_ELMA_K;
        expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
        // Sekme: iç grupta dikey öteleme değişir; normal hız azaltılmıştan yüksek (1 sn'de > 0,04 m)
        const sek = () => page.locator('.op-elma__s[data-sira="0"] > g').getAttribute('transform');
        const m0 = (await opSnc(page))[0].m;
        const s1 = await sek();
        await page.clock.runFor(1000);
        expect(await sek()).not.toBe(s1);
        expect((await opSnc(page))[0].m - m0).toBeGreaterThan(0.04);
        // Kaçış: ilk kelimeyi bitir → sincap kendi kenarına doğru koşar ve sahneden çıkar
        const taraf = (await opSnc(page))[0].taraf;
        for (const ch of k[0]) await page.evaluate((c) => window.__opBas(c), ch);
        const kacan = page.locator('.op-elma__s.is-kaciyor');
        await expect(kacan).toHaveCount(1);
        await expect(page.locator('.op-elma__etiket--pop')).toHaveCount(1);     // etiket yerinde büyüyüp söner
        const xOf = () => kacan.evaluate((g) => Number(/translate\(([-\d.]+)/.exec(g.getAttribute('transform'))[1]));
        const x0 = await xOf();
        await page.clock.runFor(400);
        const x1 = await xOf();
        if (taraf === 'sol') expect(x1).toBeLessThan(x0 - 40); else expect(x1).toBeGreaterThan(x0 + 40);
        await expect(page.locator('.op-elma__etiket--pop')).toHaveCount(0);
        await page.clock.runFor(2500);
        await expect(kacan).toHaveCount(0);
        // Elma alma: bir sincap ağaca varınca elma daldan uçar (sincap bekler), sonra sincapla gider
        for (let i = 0; i < 400 && (await opElma(page).getAttribute('data-elma')) === '5'; i++) await page.clock.runFor(100);
        await expect(opElma(page)).toHaveAttribute('data-elma', '4');
        await expect(page.locator('.op-elma__s.is-aliyor')).toHaveCount(1);
        const tasinan = page.locator('.op-elma__tasinan');
        await expect(tasinan).toHaveCount(1);
        const yOf = () => tasinan.evaluate((g) => Number(/translate\([-\d.]+ ([-\d.]+)/.exec(g.getAttribute('transform'))[1]));
        const y0 = await yOf();
        await page.clock.runFor(500);
        await expect(page.locator('.op-elma__s.is-aliyor')).toHaveCount(0);
        await expect(page.locator('.op-elma__s.is-kaciyor')).toHaveCount(1);
        expect(await yOf()).toBeGreaterThan(y0 + 40);                           // daldan sincabın eline indi
        await tasinan.evaluate((g) => { g.dataset.iz = '1'; });
        await page.clock.runFor(3000);
        await expect(page.locator('.op-elma__tasinan[data-iz]')).toHaveCount(0);   // sincapla sahneden çıktı
        await opElmaYaz(page, 250);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        await expect(opElma(page)).toHaveAttribute('data-bitti', 'canli');
        expect(Number(await opOyun(page).getAttribute('data-sonuc'))).toBeGreaterThanOrEqual(1);
        // Kutlama: daldaki elmalar sırayla zıplar
        await page.clock.runFor(150);
        expect(await page.locator('.op-elma__yuva:not(.is-alindi) .op-elma__elma').first().getAttribute('transform')).toMatch(/translate\(0 -/);
        errors.assertClean();
    });

    opTestElma('yeniden boyutlandırma kutlamayı kaybettirmez (yeni kurulan elmalar zıplar); ölçü değişmeden ağaç yeniden çizilmez', async ({ page, errors }) => {
        opTestElma.setTimeout(120000);
        await opElmaAc(page);
        // İlk çizim tek sefer: ağaç düğümü ResizeObserver'ın ilk bildiriminden sonra da aynı düğüm
        await page.locator('.op-elma__agac').evaluate((g) => { g.dataset.iz = '1'; });
        await page.clock.runFor(300);
        await page.waitForTimeout(100);
        await page.clock.runFor(100);
        await expect(page.locator('.op-elma__agac[data-iz]')).toHaveCount(1);
        await opElmaYaz(page, 250);
        await expect(opElma(page)).toHaveAttribute('data-bitti', 'canli');
        // Kutlama başında sahne daralır → ağaç ve elmalar yeniden kurulur
        await page.locator('.op-alan').evaluate((e) => { e.style.width = '70%'; });
        await expect.poll(async () => { await page.clock.runFor(16); return page.locator('.op-elma__agac[data-iz]').count(); }).toBe(0);
        const zipliyor = async () => {
            for (let i = 0; i < 20; i++) {
                const t = await page.locator('.op-elma__yuva:not(.is-alindi) .op-elma__elma').evaluateAll((d) => d.map((g) => g.getAttribute('transform') || ''));
                if (t.some((x) => /translate\(0 -[1-9]/.test(x))) return true;
                await page.clock.runFor(30);
            }
            return false;
        };
        expect(await zipliyor()).toBe(true);
        errors.assertClean();
    });
});

// ── Dört mini oyun birlikte (Elma fikstürü: Kısım 1 + Elma bölümü): yerleşim, Caps bandı, "Oyun durdu" şeridi,
// sonuç şeridi, renk dışı isabet, duyurular. Kabul geçidi bulguları (a2-final-fix-brief).
const OP_DORT = () => [['balon', OP_BALON1], ['canavar', OP_CANAVAR], ['baloncuk', OP_BALONCUK], ['elma', OP_ELMA]];
async function opBolumAc(page, no, ilk) {
    if (ilk) { await opAc(page, no, OP_ELMA_N); return; }
    await page.evaluate('GameEngine.startGame(OnParmak, 1)');
    await page.locator('.op-picker__bolum[data-bolum-sec="' + no + '"]').click();
    await expect(opOyun(page)).toHaveAttribute('data-bolum', no + '/' + OP_ELMA_N);
    await expect(opOyun(page)).toHaveAttribute('data-mod', 'oyun');
}
const opDikdortgen = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; });
const opKesisir = (a, b, pay = 0) => a.x < b.r - pay && b.x < a.r - pay && a.y < b.b - pay && b.y < a.b - pay;
const opSekmeGizleGoster = (page) => page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
});
// Bir öğenin metin satırı sayısı (metin düğümlerinin satır kutularının ayrı üst kenarları)
const opSatirSayisi = (loc) => loc.evaluate((e) => {
    const r = document.createRange();
    r.selectNodeContents(e);
    return new Set([...r.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top))).size;
});

for (const [ad, vp] of [['masaüstü 1366×768', { width: 1366, height: 768 }], ['telefon 375×812', { width: 375, height: 812 }]]) {
    opTestElma.describe('OnParmak — dört mini oyun yerleşimi, ' + ad, () => {
        opTestElma('sahne üst kenarı dört oyunda aynı (±2 px); bölüm adı tam okunur; Caps bandı canları/sayacı/yönergeyi örtmez; "Oyun durdu" şeridi altta, hedefi örtmez, ≤ 2 satır', async ({ page, errors }) => {
            opTestElma.setTimeout(150000);
            await page.setViewportSize(vp);
            const ustler = [];
            let ilk = true;
            for (const [oyunAd, no] of OP_DORT()) {
                await opBolumAc(page, no, ilk);
                ilk = false;
                const kok = page.locator('.op-mini');
                await expect(kok).toHaveCount(1);
                const sahne = await opDikdortgen(kok);
                ustler.push(sahne.y);
                // Bölüm adı kesilmez (üç nokta yok), yatay taşma yok
                const adOlcu = await page.locator('.op-ilerleme__ad').evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight }));
                expect(adOlcu.sw, oyunAd + ': bölüm adı genişliği').toBeLessThanOrEqual(adOlcu.cw + 1);
                expect(adOlcu.sh, oyunAd + ': bölüm adı yüksekliği').toBeLessThanOrEqual(adOlcu.ch + 1);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                // Yönerge tek satır (sabit yükseklik), taşmaz
                const yon = page.locator('.op-yonerge');
                const yonOlcu = await yon.evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
                expect(yonOlcu.sw, oyunAd + ': yönerge tek satıra sığar').toBeLessThanOrEqual(yonOlcu.cw + 1);
                const hud = await page.locator('.op-mini__hud > *').evaluateAll((d) => d.map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; }));
                const yonR = await opDikdortgen(yon);
                // Caps bandı: canları, sayacı ve yönergeyi örtmez
                await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: true }));
                await expect(page.locator('.op-caps')).toBeVisible();
                const caps = await opDikdortgen(page.locator('.op-caps'));
                for (const h of [...hud, yonR]) expect(opKesisir(caps, h), oyunAd + ': Caps bandı ' + JSON.stringify(h)).toBe(false);
                expect(caps.b).toBeLessThanOrEqual(sahne.b + 1);
                await page.evaluate(() => window.__opTus('CapsLock', 'CapsLock', { caps: false }));
                await expect(page.locator('.op-caps')).toBeHidden();
                // Oyun durdu şeridi: sahnenin alt yarısında, HUD'u ve hedefi örtmez, telefonda en çok 2 satır
                await opSekmeGizleGoster(page);
                const devam = page.locator('.op-mini__devam');
                await expect(devam).toBeVisible();
                const d = await opDikdortgen(devam);
                expect(d.y, oyunAd + ': şerit alt yarıda').toBeGreaterThanOrEqual(sahne.y + sahne.h / 2 - 1);
                for (const h of hud) expect(opKesisir(d, h)).toBe(false);
                const hedefSec = { balon: '.op-balon__b.is-hedef .op-balon__govde', canavar: '.op-canavar__kelime', baloncuk: null, elma: null }[oyunAd];
                if (hedefSec) expect(opKesisir(d, await opDikdortgen(page.locator(hedefSec))), oyunAd + ': hedef örtülmez').toBe(false);
                expect(await opSatirSayisi(devam.locator('strong')) + 0).toBe(1);
                const satir = await devam.evaluate((e) => {
                    const r = document.createRange();
                    r.selectNodeContents(e);
                    return new Set([...r.getClientRects()].filter((q) => q.width > 0 && q.height > 4).map((q) => Math.round(q.top / 4))).size;
                });
                expect(satir, oyunAd + ': şerit satır sayısı').toBeLessThanOrEqual(vp.width < 600 ? 2 : 1);
                await page.evaluate(() => window.__opTus('Shift', 'ShiftLeft'));
                await expect(devam).toBeHidden();
            }
            expect(Math.max(...ustler) - Math.min(...ustler), 'sahne üstleri ' + ustler.join(', ')).toBeLessThanOrEqual(2);
            errors.assertClean();
        });
    });
}

opTestElma.describe('OnParmak — mini oyunlar: isabet işareti, duyurular, sonuç şeridi', () => {
    opTestElma('Balon: doğru harfte balonun üstünde onay; can kaybı ve "Oyun durdu" canlı bölgeye; sonuç duyurusu ezilmez; bitince "Oyun durdu" HİÇ görünmez', async ({ page, errors }) => {
        opTestElma.setTimeout(120000);
        await opAc(page, OP_BALON1, OP_ELMA_N);
        const canli = page.locator('.op-canli');
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        await expect(page.locator('.op-balon__b.is-tamam')).toHaveCount(1);
        await expect(page.locator('.op-balon__b.is-tamam .op-balon__tik')).toBeVisible();
        await expect(page.locator('.op-balon__b:not(.is-tamam) .op-balon__tik').first()).toBeHidden();
        await opSekmeGizleGoster(page);
        await page.clock.runFor(60);
        await expect(canli).toHaveText('Oyun durdu. Devam etmek için bir tuşa bas.');
        await page.evaluate(() => window.__opTus('Shift', 'ShiftLeft'));
        for (let i = 0; i < 60 && (await opBalon(page).getAttribute('data-can')) === '3'; i++) await page.clock.runFor(500);
        await page.clock.runFor(60);
        await expect(canli).toHaveText('Suya düştün. 2 can kaldı.');
        await opOyunBitene(page);
        await page.clock.runFor(60);
        await expect(canli).toContainText('Bölüm ' + OP_BALON1);                // son can: yalnız sonuç duyurusu
        await expect(canli).not.toContainText('can kaldı');
        // Bitişten sonra sekme dönüşü: kart yok, duyuru sonuçta kalır
        await opSekmeGizleGoster(page);
        await page.clock.runFor(60);
        await expect(page.locator('.op-mini__devam')).toBeHidden();
        await expect(canli).toContainText('Bölüm ' + OP_BALON1);
        errors.assertClean();
    });

    opTestElma('Canavar: "Güç" etiketli sayaç (kalan güç); yazılan kutuda onay rozeti; temas duyurulur', async ({ page, errors }) => {
        opTestElma.setTimeout(120000);
        await opAc(page, OP_CANAVAR, OP_ELMA_N);
        await expect(page.locator('.op-canavar__guc-ad')).toHaveText('Güç');
        await expect(page.locator('.op-canavar__guc-ad')).toBeVisible();
        await page.evaluate(() => window.__opBas(document.querySelector('.op-oyun').dataset.beklenen));
        const rozet = await page.locator('.op-canavar__kutu.is-yazildi').first().evaluate((e) => ({
            once: getComputedStyle(e, '::before').content, sonra: getComputedStyle(e, '::after').content,
            sonraKenar: getComputedStyle(e, '::after').borderRightWidth }));
        expect(rozet.once).not.toBe('none');
        expect(rozet.sonra).not.toBe('none');
        expect(parseFloat(rozet.sonraKenar)).toBeGreaterThan(1);
        for (let i = 0; i < 80 && (await opCanavar(page).getAttribute('data-can')) === '3'; i++) await page.clock.runFor(500);
        await page.clock.runFor(60);
        await expect(page.locator('.op-canli')).toHaveText('Canavar sana ulaştı. 2 can kaldı.');
        errors.assertClean();
    });

    opTestElma('sonuç şeridi telefonda (375 px): parçalar bölünmez, son parça ("sn") tek başına satırda kalmaz; sahnedeki sayaç bitişte tam', async ({ page, errors }) => {
        opTestElma.setTimeout(120000);
        await page.setViewportSize({ width: 375, height: 812 });
        await opAc(page, OP_CANAVAR, OP_ELMA_N);
        await opYaz(page, 'oyun', 300);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        const parca = await page.locator('.op-serit__parca').evaluateAll((d) => d.map((e) => {
            const r = e.getBoundingClientRect();
            return { t: e.textContent, ust: Math.round(r.top), h: r.height, satir: e.getClientRects().length };
        }));
        expect(parca.map((p) => p.t.replace(/ ·$/, '')).at(-1)).toMatch(/sn$/);
        for (const p of parca) expect(p.satir, p.t).toBe(1);                       // parça içinde bölünme yok
        const son = parca.at(-1);
        expect(parca.filter((p) => p.ust === son.ust).length, 'son parça yetim değil: ' + JSON.stringify(parca)).toBeGreaterThanOrEqual(2);
        await expect(page.locator('.op-canavar__guc-sayi')).toHaveText('0/' + OP_BOLUMLER[OP_CANAVAR - 1].metin.split(' ').length);
        errors.assertClean();
    });
});

opTestElma.describe('OnParmak — Uçan Baloncuklar telefonda', () => {
    opTestElma('telefon (375 px): 2 şerit; baloncuklar üst üste binmez; kilit halkası sahne kenarına değmez', async ({ page, errors }) => {
        opTestElma.setTimeout(150000);
        await page.setViewportSize({ width: 375, height: 812 });
        await opAc(page, OP_BALONCUK, OP_ELMA_N);
        await expect(opBaloncuk(page)).toHaveAttribute('data-seritler', '2');
        const olc = () => page.evaluate(() => {
            const k = document.querySelector('.op-mini').getBoundingClientRect();
            const daire = (e) => { const r = e.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2, x: r.left, rr: r.right }; };
            return { kok: { x: k.left, r: k.right },
                govde: [...document.querySelectorAll('.op-baloncuk__b .op-baloncuk__govde')].map(daire),
                halka: [...document.querySelectorAll('.op-baloncuk__b.is-kilitli .op-baloncuk__halka')].map(daire) };
        });
        for (let i = 0; i < 70; i++) {
            const o = await olc();
            for (let a = 0; a < o.govde.length; a++) for (let b = a + 1; b < o.govde.length; b++) {
                const A = o.govde[a], B = o.govde[b];
                expect(Math.hypot(A.cx - B.cx, A.cy - B.cy), 'baloncuklar ' + a + '/' + b).toBeGreaterThanOrEqual(A.r + B.r - 1);
            }
            for (const h of o.halka) { expect(h.x).toBeGreaterThanOrEqual(o.kok.x); expect(h.rr).toBeLessThanOrEqual(o.kok.r); }
            if (i % 4 === 0) {
                const ch = await opOyun(page).getAttribute('data-beklenen');
                if (ch) await page.evaluate((c) => window.__opBas(c), ch);
            }
            await page.clock.runFor(300);
            if (await opOyun(page).getAttribute('data-mod') !== 'oyun') break;
        }
        errors.assertClean();
    });
});

opTestBilinmez.describe('OnParmak — bilinmeyen oyun adı (güvenlik notu)', () => {
    opTestBilinmez('miras ad ("constructor") ve olmayan oyun: console.error + bölüm atlanır, akış satıra geçer; sayfa hatası yok', async ({ page }) => {
        const hatalar = [], sayfa = [];
        page.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
        page.on('pageerror', (e) => sayfa.push(String(e)));
        const N = OP_N + 3;
        await page.clock.install({ time: new Date('2026-10-19T09:00:00Z') });
        await page.goto('/?oyun=' + OP_SLUG);
        await expect(opPicker(page)).toBeVisible();
        await page.locator('.op-picker__bolum[data-bolum-sec="' + (OP_N + 1) + '"]').click();
        await expect(opOyun(page)).toHaveAttribute('data-bolum', N + '/' + N);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'satir');
        await expect(page.locator('.op-mini')).toHaveCount(0);
        expect(hatalar.filter((t) => /bilinmeyen oyun "constructor"/.test(t))).toHaveLength(1);
        expect(hatalar.filter((t) => /bilinmeyen oyun "yok"/.test(t))).toHaveLength(1);
        expect(sayfa).toEqual([]);
    });
});

opTestElma.describe('OnParmak — Elma Bekçisi telefonda ve yeniden boyutlandırmada', () => {
    opTestElma('telefon (375 px): etiket başka sincaba ve başka etikete binmez; sap sincabına iner; giriş sırasında CSS geçişi kapalı', async ({ page, errors }) => {
        opTestElma.setTimeout(150000);
        await page.setViewportSize({ width: 375, height: 812 });
        await opElmaAc(page);
        const olc = () => page.evaluate(() => {
            const kutu = (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; };
            const etiket = [...document.querySelectorAll('.op-elma__etiket:not(.op-elma__etiket--pop)')].map((e) => ({
                sira: e.dataset.sira, k: kutu(e.querySelector('.op-elma__etiket-zemin')), giris: e.classList.contains('is-giris'),
                gecis: getComputedStyle(e).transitionDuration, op: e.style.opacity }));
            const sincap = [...document.querySelectorAll('.op-elma__s[data-sira]')].map((g) => ({ sira: g.dataset.sira, k: kutu(g.querySelector('.op-elma__sincap')) }));
            return { etiket, sincap };
        });
        let girisGoruldu = false;
        for (let i = 0; i < 60; i++) {
            const { etiket, sincap } = await olc();
            for (const e of etiket) {
                for (const s of sincap) if (s.sira !== e.sira) expect(opKesisir(e.k, s.k, 1), 'etiket ' + e.sira + ' / sincap ' + s.sira).toBe(false);
                for (const f of etiket) if (f.sira !== e.sira) expect(opKesisir(e.k, f.k, 1), 'etiket ' + e.sira + ' / etiket ' + f.sira).toBe(false);
                if (e.giris) { girisGoruldu = true; expect(e.gecis, 'girişte geçiş kapalı').toBe('0s'); }
            }
            if (i % 3 === 0) {
                const ch = await opOyun(page).getAttribute('data-beklenen');
                if (ch) await page.evaluate((c) => window.__opBas(c), ch);
            }
            await page.clock.runFor(400);
            if (await opOyun(page).getAttribute('data-mod') !== 'oyun') break;
        }
        expect(girisGoruldu).toBe(true);
        errors.assertClean();
    });
});
// PR3'te oyun açılınca (active:true) bu describe silinir.
const opTestYamasiz = test.extend({
    context: async ({ context }, use) => {
        await seedGuest(context, opLockKeys);
        await context.route(/https:\/\/www\.gstatic\.com\/firebasejs\//, (route) => route.abort());
        await context.addInitScript(OP_FIREBASE_STUB);
        await use(context);
    },
});
opTestYamasiz.describe('OnParmak — kapalı oyun (katalog yamasız; PR3\'te oyun açılınca silinir)', () => {
    opTestYamasiz('/?oyun=on-parmak oyunu açmaz; hub kartı "Yakında" ve ikonu yüklü', async ({ page }) => {
        const hatalar = [];
        page.on('pageerror', (e) => hatalar.push(String(e)));
        await page.goto('/?oyun=' + OP_SLUG);
        await expect(page.locator('#hub')).toBeVisible();
        await page.waitForTimeout(500);
        await expect(page.locator('.op-picker')).toHaveCount(0);
        await expect(page.locator('.op-oyun')).toHaveCount(0);
        expect(await page.evaluate(() => document.body.hasAttribute('data-active-game'))).toBe(false);
        const kart = page.locator('.game-card[data-game="' + OP_SLUG + '"]').first();
        await expect(kart).toHaveClass(/coming-soon/);
        await kart.scrollIntoViewIfNeeded();
        const img = kart.locator('.card-icon img');
        await expect(img).toHaveAttribute('src', /assets\/images\/hub\/on-parmak\.svg/);
        await expect.poll(() => img.evaluate((i) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
        expect(hatalar).toEqual([]);
    });
});

opTestParcali.describe('OnParmak — kısım geçişi (2 kısımlı test fikstürü)', () => {
    opTestParcali('Kısım 1 bitince katman AÇILMAZ: araç çubuğu 2. seviye, yıldız kaydı, Kısım 2 başlar; seçici 2. kart → seviye 2', async ({ page, errors }) => {
        opTestParcali.setTimeout(90000);
        await opAc(page, OP_SON, OP_N + 1);
        const oyun = opOyun(page);
        expect(await page.evaluate(() => GameEngine.getCurrentGame().levels.length)).toBe(2);
        await opYaz(page, OP_BOLUMLER[OP_SON - 1].tur, 100);         // Kısım 1'in son bölümü (oyun ya da satır)
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
        await page.clock.runFor(2600);                                         // şerit geçer → kısım biter → onLevelUp
        expect(await opOverlayAcik(page)).toBe(false);
        await expect(page.locator('#toolbar-level .level-dot').nth(1)).toHaveClass(/active/);
        await expect(page.locator('#toolbar-level .level-dot').nth(0)).toHaveClass(/done/);
        expect(await page.evaluate(() => GameEngine.getCurrentLevel())).toBe(2);
        expect(await page.evaluate(() => Progress.getLevelStars('on-parmak', 1))).toBeGreaterThan(0);
        await expect(page.locator('.op-serit__baslik')).toContainText('tamam');
        await page.clock.runFor(2900);                                         // geçiş şeridi → Kısım 2'nin ilk bölümü
        await expect(oyun).toHaveAttribute('data-kisim', '2');
        await expect(oyun).toHaveAttribute('data-bolum', (OP_N + 1) + '/' + (OP_N + 1));
        await expect(oyun).toHaveAttribute('data-mod', 'satir');
        expect(await opOverlayAcik(page)).toBe(false);

        // Seçici: 2. kısım kartı → motor seviyesi 2, ilk bölümü
        await page.evaluate('GameEngine.startGame(OnParmak, 1)');
        await expect(opPicker(page)).toBeVisible();
        await expect(page.locator('.op-picker__kart')).toHaveCount(2);
        await page.locator('.op-picker__kart[data-kisim="2"] .op-picker__kisim').click();
        await expect(oyun).toHaveAttribute('data-kisim', '2');
        await expect(oyun).toHaveAttribute('data-bolum', (OP_N + 1) + '/' + (OP_N + 1));
        expect(await page.evaluate(() => GameEngine.getCurrentLevel())).toBe(2);
        await expect(page.locator('#toolbar-level .level-dot').nth(1)).toHaveClass(/active/);
        errors.assertClean();
    });

    opTestParcali('son kısım (2) bitince kutlama katmanı açılır; "Tekrar Oyna" seçiciye döner', async ({ page, errors }) => {
        opTestParcali.setTimeout(90000);
        await opAc(page, OP_N + 1, OP_N + 1);
        expect(await page.evaluate(() => GameEngine.getCurrentLevel())).toBe(2);
        await opYaz(page, 'satir', 100);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'sonuc');
        expect(await opOverlayAcik(page)).toBe(false);
        await page.clock.runFor(2600);
        await page.clock.runFor(500);
        await expect.poll(() => opOverlayAcik(page)).toBe(true);
        expect(await page.evaluate(() => Progress.getLevelStars('on-parmak', 2))).toBeGreaterThan(0);
        await page.locator('#btn-replay').click();
        await expect(opPicker(page)).toBeVisible();
        expect(await opOverlayAcik(page)).toBe(false);
        errors.assertClean();
    });
});

/* ---- OnParmakOyunOrtak — ortak oyun parçaları ---- */
function loadOyunOrtak(ctxEkstra = {}) {
    const window = Object.assign({}, ctxEkstra);
    const rel = 'js/games/on-parmak-oyun-ortak.js';
    const document = { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), {
        window, Math, document, requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
    }, { filename: rel });
    return window.OnParmakOyunOrtak;
}

test.describe('OnParmakOyunOrtak — rng / hedefSec / uyarlanirHiz (tarayıcısız)', () => {
    const O = loadOyunOrtak();

    test('rng: mulberry32 deterministik, [0,1), tohuma bağlı', () => {
        const dizi = (r) => Array.from({ length: 50 }, () => r());
        const A = dizi(O.rng(42)), B = dizi(O.rng(42)), C = dizi(O.rng(43));
        expect(A).toEqual(B);
        expect(A).not.toEqual(C);
        for (const x of A) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
        expect(new Set(A).size).toBe(50);
        expect(O.rng(1)()).toBeCloseTo(0.6270739405881613, 12);   // bilinen mulberry32(1) ilk değeri
    });

    test('hedefSec: ilk harfle eşleşen, tehlikeye en yakın; eşleşme yoksa null; harf büyüklüğü duyarlı', () => {
        const a = { kelime: 'elma', tehlike: 0.2 }, b = { kelime: 'ekmek', tehlike: 0.7 },
            c = { kelime: 'ağaç', tehlike: 0.9 }, d = { kelime: 'ışık', tehlike: 0.5 };
        const h = [a, b, c, d];
        expect(O.hedefSec(h, 'e')).toBe(b);
        expect(O.hedefSec(h, 'ğ')).toBe(null);
        expect(O.hedefSec(h, 'ı')).toBe(d);
        expect(O.hedefSec(h, 'I')).toBe(null);
        expect(O.hedefSec([], 'e')).toBe(null);
        expect(O.hedefSec([{ kelime: 'ev', tehlike: 1 }, { kelime: 'el', tehlike: 1 }], 'e').kelime).toBe('ev');   // eşitte ilk
    });

    test('hedefSec: kilit kelime bitene dek korunur; başlanmış hedef yeniden seçilmez; kilit listeden çıkınca serbest', () => {
        const a = { kelime: 'elma', tehlike: 0.2, ilerleme: 1 }, b = { kelime: 'ekmek', tehlike: 0.9 };
        expect(O.hedefSec([a, b], 'k', a)).toBe(a);              // kilitliyken başka harf de kilidi döndürür (hata sayımı oyunda)
        expect(O.hedefSec([a, b], 'e', a)).toBe(a);              // tehlikesi daha yüksek b'ye geçmez
        expect(O.hedefSec([a, b], 'e')).toBe(b);                 // kilitsiz: a başlanmış, b seçilir
        expect(O.hedefSec([b], 'e', a)).toBe(b);                 // kilit artık listede yok
    });

    test('enAcil / beklenenHarf: kilit varsa kilitli kelimenin sıradaki harfi; yoksa tehlikesi en yüksek hedefin ilk harfi (eşitte ilk)', () => {
        const a = { kelime: 'elma', tehlike: 0.2 }, b = { kelime: 'ışık', tehlike: 0.7 }, c = { kelime: 'ağaç', tehlike: 0.7 };
        expect(O.enAcil([a, b, c])).toBe(b);
        expect(O.enAcil([])).toBe(null);
        expect(O.beklenenHarf([a, b, c])).toBe('ı');
        expect(O.beklenenHarf([a, b], { kelime: 'şişe', ilerleme: 2 })).toBe('ş');
        expect(O.beklenenHarf([a], { kelime: 'elma', ilerleme: 4 })).toBe(null);   // bitmiş kilit
        expect(O.beklenenHarf([])).toBe(null);
        // en acilin ilk harfi basılırsa hedefSec de AYNI hedefi seçer (vurgu ile seçim tutarlı)
        expect(O.hedefSec([a, b, c], O.beklenenHarf([a, b, c]))).toBe(b);
    });

    test('hedefBildirici: yalnız değişince kok.dataset.hedef + geri çağrı; null ve boş aynı', () => {
        const kok = { dataset: {} }, gelen = [];
        const yaz = O.hedefBildirici(kok, (ch) => gelen.push(ch));
        yaz('a'); yaz('a'); yaz(null); yaz(''); yaz('b');
        expect(gelen).toEqual(['a', null, 'b']);
        expect(kok.dataset.hedef).toBe('b');
        const yalniz = O.hedefBildirici(kok);                     // geri çağrısız da çalışır
        yalniz(null);
        expect(kok.dataset.hedef).toBe('');
    });

    test('uyarlanirHiz: taban başlangıç, başarıda artar (≤ max), can kaybında azalır (≥ min); reduced-motion tabanı düşürür', () => {
        const ayar = { taban: 100, min: 60, max: 130, artis: 10, azalis: 25 };
        const h = O.uyarlanirHiz({ ...ayar, azaltilmisHareket: false });
        expect(h.deger()).toBe(100);
        expect([h.basari(), h.basari(), h.basari(), h.basari()]).toEqual([110, 120, 130, 130]);
        expect([h.canKaybi(), h.canKaybi(), h.canKaybi(), h.canKaybi()]).toEqual([105, 80, 60, 60]);
        expect(O.uyarlanirHiz({ ...ayar, azaltilmisHareket: true }).deger()).toBe(60);
        expect(O.uyarlanirHiz({ ...ayar, taban: 50, azaltilmisHareket: false }).deger()).toBe(60);   // min'e kenetlenir
        const m = loadOyunOrtak({ matchMedia: (q) => ({ matches: /reduce/.test(q) }) });
        expect(m.uyarlanirHiz(ayar).deger()).toBe(60);           // matchMedia'dan okur
    });

    test('azaltilmisHareket: tek kaynak — matchMedia yoksa false, reduce eşleşirse true', () => {
        expect(O.azaltilmisHareket()).toBe(false);
        expect(loadOyunOrtak({ matchMedia: (q) => ({ matches: /reduce/.test(q) }) }).azaltilmisHareket()).toBe(true);
        expect(loadOyunOrtak({ matchMedia: () => ({ matches: false }) }).azaltilmisHareket()).toBe(false);
    });

    test('secilebilir: yalnız görünür hedefler (gorunur !== false); hedefSec/beklenenHarf görünmeyeni seçmez', () => {
        const a = { kelime: 'kasa', tehlike: 0.9, gorunur: false }, b = { kelime: 'kaş', tehlike: 0.4, gorunur: true },
            c = { kelime: 'dal', tehlike: 0.1 };
        expect(O.secilebilir([a, b, c])).toEqual([b, c]);
        expect(O.hedefSec(O.secilebilir([a, b, c]), 'k')).toBe(b);   // tehlikesi yüksek ama görünmeyen a değil
        expect(O.beklenenHarf(O.secilebilir([a, c]))).toBe('d');
        expect(O.hedefSec(O.secilebilir([a]), 'k')).toBe(null);      // görünmeyenin ilk harfi = hata
    });

    test('harf okuma: hedefSec ile beklenenHarf aynı yöntem (kod noktası; vekil çift ilk harf de eşleşir)', () => {
        const a = { kelime: '\u{1F600}x', tehlike: 1 };            // ilk "harf" iki UTF-16 birimi
        expect(O.beklenenHarf([a])).toBe('\u{1F600}');
        expect(O.hedefSec([a], O.beklenenHarf([a]))).toBe(a);
    });
});

test.describe('OnParmakOyunOrtak.dongu (tarayıcı, sahte saat)', () => {
    test.beforeEach(async ({ page }) => {
        await page.clock.install({ time: 0 });
        await page.goto('/404.html');
        await page.addScriptTag({ url: '/js/games/on-parmak-oyun-ortak.js' });
        await page.clock.pauseAt(1000);                                         // saat yalnız runFor ile akar: kare sayıları belirleyici
        await page.evaluate(() => {
            window.__raf = { iste: 0, iptal: 0 };
            const r = window.requestAnimationFrame.bind(window), c = window.cancelAnimationFrame.bind(window);
            window.requestAnimationFrame = (f) => { window.__raf.iste++; return r(f); };
            window.cancelAnimationFrame = (i) => { window.__raf.iptal++; return c(i); };
            window.__adim = [];
            window.__durumlar = [];
            window.__gorun = (v) => {
                Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
                document.dispatchEvent(new Event('visibilitychange'));
            };
            window.__d = window.OnParmakOyunOrtak.dongu((dt) => window.__adim.push(dt), { durumDegisti: (d) => window.__durumlar.push(d) });
        });
    });

    test('adım çağrılır, dt azami 100 ms; durdur() döngüyü bitirir ve tekrar çağrılabilir', async ({ page }) => {
        await page.clock.runFor(500);
        expect(await page.evaluate(() => window.__adim.length)).toBeGreaterThan(10);
        expect(await page.evaluate(() => Math.max(...window.__adim))).toBeLessThanOrEqual(100);
        expect(await page.evaluate(() => window.__d.durum())).toBe('calisiyor');
        // saat sahte ama akıyor: sayımı durdurmayla aynı eşzamanlı blokta al
        const n = await page.evaluate(() => { window.__d.durdur(); window.__d.durdur(); return window.__adim.length; });
        await page.clock.runFor(500);
        expect(await page.evaluate(() => window.__adim.length)).toBe(n);
        expect(await page.evaluate(() => window.__d.durum())).toBe('durdu');
        expect(await page.evaluate(() => window.__d.devamTusu())).toBe(false);
    });

    test('sekme gizlenince rAF durur; görünür olunca devam bekler; devam tuşu yutulur (true), sonraki tuş normal (false)', async ({ page }) => {
        await page.clock.runFor(200);
        await page.evaluate(() => window.__gorun('hidden'));
        expect(await page.evaluate(() => window.__d.durum())).toBe('gizli');
        const n = await page.evaluate(() => window.__adim.length);
        await page.clock.runFor(1000);
        expect(await page.evaluate(() => window.__adim.length)).toBe(n);
        expect(await page.evaluate(() => window.__d.devamTusu())).toBe(true);   // gizliyken de yutulur, döngü başlamaz
        expect(await page.evaluate(() => window.__d.durum())).toBe('gizli');
        await page.evaluate(() => window.__gorun('visible'));
        expect(await page.evaluate(() => window.__d.durum())).toBe('devam-bekliyor');
        await page.clock.runFor(1000);
        expect(await page.evaluate(() => window.__adim.length)).toBe(n);        // tuşa kadar akmaz
        expect(await page.evaluate(() => window.__d.devamTusu())).toBe(true);   // devam tuşu: yutuldu
        expect(await page.evaluate(() => window.__d.durum())).toBe('calisiyor');
        expect(await page.evaluate(() => window.__d.devamTusu())).toBe(false);  // sonraki tuş normal sayılır
        await page.clock.runFor(300);
        expect(await page.evaluate(() => window.__adim.length)).toBeGreaterThan(n);
        expect(await page.evaluate(() => Math.max(...window.__adim))).toBeLessThanOrEqual(100);   // bekleme süresi dt'ye sıçramaz
        expect(await page.evaluate(() => window.__durumlar)).toEqual(['gizli', 'devam-bekliyor', 'calisiyor']);
    });

    test('durdur() sonrası visibilitychange dinleyicisi kalmaz; rAF iptal edilir ve adım gelmez', async ({ page }) => {
        const n0 = await page.evaluate(() => { window.__d.durdur(); window.__gorun('hidden'); window.__gorun('visible'); return window.__adim.length; });
        expect(await page.evaluate(() => window.__durumlar)).toEqual([]);
        expect(await page.evaluate(() => window.__d.durum())).toBe('durdu');
        expect(await page.evaluate(() => window.__raf.iptal)).toBeGreaterThan(0);
        await page.clock.runFor(300);
        expect(await page.evaluate(() => window.__adim.length)).toBe(n0);       // durdurma anındaki sayı = son sayı
    });

    test('adimFn fırlatırsa console.error + döngü durur (durum durdu)', async ({ page }) => {
        const r = await page.evaluate(async () => {
            const hata = [];
            const eski = console.error;
            console.error = (...a) => hata.push(a.map(String).join(' '));
            let n = 0;
            const d = window.OnParmakOyunOrtak.dongu(() => { n++; throw new Error('patladi'); });
            window.__t = { d, say: () => n, hata, geri: () => { console.error = eski; } };
            return null;
        });
        expect(r).toBe(null);
        await page.clock.runFor(500);
        const s = await page.evaluate(() => { window.__t.geri(); return { n: window.__t.say(), durum: window.__t.d.durum(), hata: window.__t.hata }; });
        expect(s.n).toBe(1);
        expect(s.durum).toBe('durdu');
        expect(s.hata.length).toBe(1);
        expect(s.hata[0]).toContain('patladi');
    });

    test('duraklat/surdur: rAF durur, adım gelmez, devamTusu false; nedenler bağımsız; surdur hemen sürer, dt sıçramaz', async ({ page }) => {
        await page.clock.runFor(200);
        await page.evaluate(() => { window.__d.duraklat('caps'); window.__d.duraklat('baska'); });
        expect(await page.evaluate(() => window.__d.durum())).toBe('duraklatildi');
        const n = await page.evaluate(() => window.__adim.length);
        await page.clock.runFor(2000);
        expect(await page.evaluate(() => window.__adim.length)).toBe(n);
        expect(await page.evaluate(() => window.__d.devamTusu())).toBe(false);        // tuş yutulmaz (çağıranın işi)
        await page.evaluate(() => window.__d.surdur('caps'));
        expect(await page.evaluate(() => window.__d.durum())).toBe('duraklatildi');  // bir neden daha var
        await page.clock.runFor(500);
        expect(await page.evaluate(() => window.__adim.length)).toBe(n);
        await page.evaluate(() => window.__d.surdur('baska'));
        expect(await page.evaluate(() => window.__d.durum())).toBe('calisiyor');     // devam tuşu gerekmez
        await page.clock.runFor(300);
        const adimlar = await page.evaluate(() => window.__adim);
        expect(adimlar.length).toBeGreaterThan(n);
        expect(adimlar[n]).toBe(0);                                                  // ilk adım: bekleme süresi dt'ye girmez
        expect(await page.evaluate(() => window.__durumlar)).toEqual(['duraklatildi', 'calisiyor']);
    });

    test('gizli + duraklat: görünür olunca devam bekler; neden sürerken devam tuşu sürdürmez; neden kalkınca tuşla sürer', async ({ page }) => {
        await page.clock.runFor(200);
        await page.evaluate(() => window.__d.duraklat('caps'));
        await page.evaluate(() => window.__gorun('hidden'));
        expect(await page.evaluate(() => window.__d.durum())).toBe('gizli');
        await page.evaluate(() => window.__gorun('visible'));
        expect(await page.evaluate(() => window.__d.durum())).toBe('devam-bekliyor');
        const n = await page.evaluate(() => window.__adim.length);
        expect(await page.evaluate(() => window.__d.devamTusu())).toBe(true);         // yutulur ama SÜRDÜRMEZ
        expect(await page.evaluate(() => window.__d.durum())).toBe('devam-bekliyor');
        await page.evaluate(() => window.__d.surdur('caps'));
        expect(await page.evaluate(() => window.__d.durum())).toBe('devam-bekliyor');  // sekme dönüşü yine tuş ister
        await page.clock.runFor(500);
        expect(await page.evaluate(() => window.__adim.length)).toBe(n);
        expect(await page.evaluate(() => window.__d.devamTusu())).toBe(true);
        expect(await page.evaluate(() => window.__d.durum())).toBe('calisiyor');
        await page.clock.runFor(300);
        expect(await page.evaluate(() => window.__adim.length)).toBeGreaterThan(n);
        await page.evaluate(() => { window.__d.durdur(); window.__d.duraklat('x'); window.__d.surdur('x'); });
        expect(await page.evaluate(() => window.__d.durum())).toBe('durdu');
    });

    test('başta gizli sekme: durumDegisti(gizli) dongu() döndükten sonra gelir (eşzamanlı değil)', async ({ page }) => {
        const r = await page.evaluate(async () => {
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
            const olaylar = [];
            let donduktenSonra = false;
            const d = window.OnParmakOyunOrtak.dongu(() => {}, { durumDegisti: (x) => olaylar.push([x, donduktenSonra]) });
            donduktenSonra = true;
            const eszamanli = olaylar.length;
            await Promise.resolve(); await Promise.resolve();
            d.durdur();
            return { eszamanli, olaylar, durum: d.durum() };
        });
        expect(r.eszamanli).toBe(0);
        expect(r.olaylar).toEqual([['gizli', true]]);
    });
});

test.describe('OnParmakOyunOrtak — tepeYolu (tarayıcısız)', () => {
    test('tepeYolu: belirleyici, tepe başına tam bir rnd(), kapalı yol; uçlar parametreden', () => {
        let n = 0;
        const O = loadOyunOrtak();
        const r = O.rng(5);
        const say = () => { n++; return r(); };
        const a = O.tepeYolu(say, { x0: -200, son: 400, adim: 120, taban: 238, genlik: 70, alt: 320 });
        expect(n).toBe(6);                                       // x = -200, -80, 40, 160, 280, 400
        expect(a.startsWith('M-200 320 L-200 238 Q-140 ')).toBe(true);
        expect(a.endsWith(' L520 320 Z')).toBe(true);
        expect(a.match(/Q/g).length).toBe(6);
        const b = O.tepeYolu(O.rng(5), { x0: -200, son: 400, adim: 120, taban: 238, genlik: 70, alt: 320 });
        expect(b).toBe(a);
        for (const y of [...a.matchAll(/Q\S+ (\S+) /g)].map((m) => Number(m[1]))) {
            expect(y).toBeLessThanOrEqual(238 - 70 * 0.4 + 0.05);
            expect(y).toBeGreaterThanOrEqual(238 - 70 - 0.05);
        }
    });

    test('yayımlanan API: çekirdek + sahne yardımcıları + kabuk', () => {
        const O = loadOyunOrtak();
        expect(Object.keys(O).sort()).toEqual(['azaltilmisHareket', 'beklenenHarf', 'canlarHud', 'devamKatmani', 'dongu', 'easeOut', 'enAcil',
            'hedefBildirici', 'hedefSec', 'htmlEl', 'oyunKabugu', 'rng', 'secilebilir', 'svgEl', 'tepeYolu', 'tikCiz', 'uyarlanirHiz'].sort());
        expect(O.easeOut(0)).toBe(0);
        expect(O.easeOut(1)).toBe(1);
        expect(O.easeOut(0.5)).toBeCloseTo(0.875, 9);
    });
});

test.describe('OnParmakOyunOrtak — canlarHud / devamKatmani / oyunKabugu (tarayıcı, sahte saat)', () => {
    test.beforeEach(async ({ page }) => {
        await page.clock.install({ time: 0 });
        await page.goto('/404.html');
        await page.evaluate(() => {
            const RO = window.ResizeObserver;
            window.__ro = 0;
            window.ResizeObserver = class extends RO {
                observe(...a) { window.__ro++; return super.observe(...a); }
                disconnect() { window.__ro--; return super.disconnect(); }
            };
        });
        await page.addScriptTag({ url: '/js/games/on-parmak-oyun-ortak.js' });
        await page.clock.pauseAt(1000);
    });

    test('svgEl / htmlEl: SVG ad alanı, öznitelik, ebeveyn; metin textContent ile (HTML yorumlanmaz)', async ({ page }) => {
        const r = await page.evaluate(() => {
            const O = window.OnParmakOyunOrtak;
            const kap = document.createElement('div');
            const g = O.svgEl('g', { class: 'x', transform: 'translate(1 2)' }, kap);
            const h = O.htmlEl('span', 'a b', '<b>kalın</b>');
            return { ns: g.namespaceURI, cls: g.getAttribute('class'), tr: g.getAttribute('transform'), ebeveyn: g.parentNode === kap,
                hcls: h.className, metin: h.textContent, cocuk: h.children.length, bos: O.htmlEl('i').textContent };
        });
        expect(r).toEqual({ ns: 'http://www.w3.org/2000/svg', cls: 'x', tr: 'translate(1 2)', ebeveyn: true,
            hcls: 'a b', metin: '<b>kalın</b>', cocuk: 0, bos: '' });
    });

    test('canlarHud: n kalp, aria-label; guncelle giden canları is-gitti yapar', async ({ page }) => {
        const r = await page.evaluate(() => {
            const h = window.OnParmakOyunOrtak.canlarHud(3);
            const durum = () => [...h.el.querySelectorAll('.op-mini__can')].map((c) => c.classList.contains('is-gitti'));
            const a = { sinif: h.el.className, rol: h.el.getAttribute('role'), etiket: h.el.getAttribute('aria-label'), d: durum() };
            h.guncelle(1);
            return { a, b: { etiket: h.el.getAttribute('aria-label'), d: durum() } };
        });
        expect(r.a).toEqual({ sinif: 'op-mini__canlar', rol: 'img', etiket: 'Can: 3 / 3', d: [false, false, false] });
        expect(r.b).toEqual({ etiket: 'Can: 1 / 3', d: [false, true, true] });
        // Seçenekler: ad (aria-label), ikon yolu, ek sınıf (Elma Bekçisi: 5 elma)
        const e = await page.evaluate(() => {
            const h = window.OnParmakOyunOrtak.canlarHud(5, { ad: 'Elma', yol: 'M1 1h2v2z', sinif: 'x-elma' });
            h.guncelle(4);
            const c = h.el.querySelectorAll('.op-mini__can');
            return { n: c.length, sinif: c[0].getAttribute('class'), yol: c[0].querySelector('path').getAttribute('d'),
                etiket: h.el.getAttribute('aria-label'), gitti: c[4].classList.contains('is-gitti') };
        });
        expect(e).toEqual({ n: 5, sinif: 'op-mini__can x-elma', yol: 'M1 1h2v2z', etiket: 'Elma: 4 / 5', gitti: true });
    });

    test('devamKatmani: başta gizli, canlı bölge DEĞİL (duyuru modülün aria-live bölgesinde), iki parça metin', async ({ page }) => {
        const r = await page.evaluate(() => {
            const el = window.OnParmakOyunOrtak.devamKatmani();
            return { sinif: el.className, rol: el.getAttribute('role'), gizli: el.hidden, metin: [...el.children].map((c) => c.textContent) };
        });
        expect(r).toEqual({ sinif: 'op-mini__devam', rol: null, gizli: true, metin: ['Oyun durdu', 'Devam etmek için bir tuşa bas'] });
    });

    test('oyunKabugu: ölçü → viewBox + olcu(W); baslat → döngü + tutamaç; sekme/caps durumu; durdur her şeyi söker', async ({ page }) => {
        const r = await page.evaluate(() => {
            const O = window.OnParmakOyunOrtak;
            const kok = O.htmlEl('div');
            kok.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:320px';
            const svg = O.svgEl('svg', {}, kok);
            const devam = O.devamKatmani();
            kok.appendChild(devam);
            document.body.appendChild(kok);
            window.__kayit = { olcu: [], adim: 0, bas: [] };
            const k = O.oyunKabugu({ kok, svg, H: 320, devam, adim: () => { window.__kayit.adim++; }, olcu: (W) => window.__kayit.olcu.push(W) });
            const once = { W: k.W, vb: svg.getAttribute('viewBox'), olcu: window.__kayit.olcu.slice(), ro: window.__ro, dongu: k.dongu };
            window.__k = k; window.__kok = kok; window.__devam = devam;
            window.__t = k.baslat((ch) => window.__kayit.bas.push(ch));
            return { once, durum: kok.dataset.durum, anahtar: Object.keys(window.__t).sort() };
        });
        expect(r.once).toEqual({ W: 640, vb: '0 0 640 320', olcu: [640], ro: 1, dongu: null });
        expect(r.durum).toBe('calisiyor');
        expect(r.anahtar).toEqual(['bas', 'devamTusu', 'duraklat']);
        await page.clock.runFor(200);
        expect(await page.evaluate(() => window.__kayit.adim)).toBeGreaterThan(0);
        await page.evaluate(() => window.__t.bas('f'));
        // Caps: duraklat(true) → 'duraklatildi', adım gelmez; false → hemen sürer
        await page.evaluate(() => window.__t.duraklat(true));
        expect(await page.evaluate(() => window.__kok.dataset.durum)).toBe('duraklatildi');
        const a1 = await page.evaluate(() => window.__kayit.adim);
        await page.clock.runFor(500);
        expect(await page.evaluate(() => window.__kayit.adim)).toBe(a1);
        await page.evaluate(() => window.__t.duraklat(false));
        expect(await page.evaluate(() => window.__kok.dataset.durum)).toBe('calisiyor');
        // Sekme: gizli → devam bekler (katman görünür), tuş yutulur → katman gizlenir
        await page.evaluate(() => {
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
            document.dispatchEvent(new Event('visibilitychange'));
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        expect(await page.evaluate(() => ({ d: window.__kok.dataset.durum, g: window.__devam.hidden }))).toEqual({ d: 'devam-bekliyor', g: false });
        expect(await page.evaluate(() => window.__t.devamTusu())).toBe(true);
        expect(await page.evaluate(() => ({ d: window.__kok.dataset.durum, g: window.__devam.hidden }))).toEqual({ d: 'calisiyor', g: true });
        // Boyut değişince ölçü yenilenir
        await page.evaluate(() => { window.__kok.style.width = '960px'; });
        await page.clock.runFor(100);
        await expect.poll(() => page.evaluate(() => window.__k.W)).toBe(960);
        // durdur: döngü + RO sökülür, kök çıkar; sonra tutamaç/ölçü/durum etkisiz; tekrar çağrılabilir
        const son = await page.evaluate(() => {
            const k = window.__k;
            k.durdur(); k.durdur();
            const adim = window.__kayit.adim;
            window.__t.bas('j');
            const devamT = window.__t.devamTusu();
            window.__t.duraklat(true);
            return { ro: window.__ro, bagli: window.__kok.isConnected, etkin: k.etkin(), dongu: k.dongu.durum(), bas: window.__kayit.bas, devamT, adim };
        });
        expect(son).toMatchObject({ ro: 0, bagli: false, etkin: false, dongu: 'durdu', bas: ['f'], devamT: false });
        await page.clock.runFor(500);
        expect(await page.evaluate(() => window.__kayit.adim)).toBe(son.adim);
    });

    test('oyunKabugu: ilk çizim tek sefer (RO ilk bildirimi olcu çağırmaz); "Oyun durdu" duyurulur; bitir sonrası devam kartı hiç yok', async ({ page }) => {
        await page.evaluate(() => {
            const O = window.OnParmakOyunOrtak;
            const kok = O.htmlEl('div');
            kok.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:320px';
            const svg = O.svgEl('svg', {}, kok);
            const devam = O.devamKatmani();
            kok.appendChild(devam);
            document.body.appendChild(kok);
            window.__kayit = { olcu: 0, adim: 0, duyuru: [] };
            window.__k = O.oyunKabugu({ kok, svg, H: 320, devam, adim: () => { window.__kayit.adim++; },
                olcu: () => { window.__kayit.olcu++; }, duyur: (m) => window.__kayit.duyuru.push(m) });
            window.__kok = kok; window.__devam = devam;
            window.__t = window.__k.baslat(() => {});
        });
        await page.clock.runFor(300);
        await page.waitForTimeout(100);                          // RO bildirimi (çizim adımı) gelsin
        await page.clock.runFor(100);
        expect(await page.evaluate(() => window.__kayit.olcu)).toBe(1);
        const gizleGoster = () => page.evaluate(() => {
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
            document.dispatchEvent(new Event('visibilitychange'));
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await gizleGoster();
        expect(await page.evaluate(() => ({ g: window.__devam.hidden, d: window.__kayit.duyuru }))).toEqual({
            g: false, d: ['Oyun durdu. Devam etmek için bir tuşa bas.'] });
        await page.evaluate(() => window.__t.devamTusu());
        // Bitiş: kart gizli; sekme dönüşünde kart çıkmaz, döngü tuşsuz sürer, devamTusu false (tuş sonuç şeridine)
        await page.evaluate(() => window.__k.bitir('canli'));
        expect(await page.evaluate(() => window.__kok.dataset.bitti)).toBe('canli');
        await gizleGoster();
        const r = await page.evaluate(() => ({ g: window.__devam.hidden, d: window.__kok.dataset.durum, n: window.__kayit.duyuru.length,
            tus: window.__t.devamTusu() }));
        expect(r).toEqual({ g: true, d: 'calisiyor', n: 1, tus: false });
        const a = await page.evaluate(() => window.__kayit.adim);
        await page.clock.runFor(300);
        expect(await page.evaluate(() => window.__kayit.adim)).toBeGreaterThan(a);
        // Boyut değişince olcu yeniden (yalnız o zaman)
        await page.evaluate(() => { window.__kok.style.width = '900px'; });
        await expect.poll(async () => { await page.clock.runFor(50); return page.evaluate(() => window.__kayit.olcu); }).toBe(2);
        await page.evaluate(() => window.__k.durdur());
    });
});

// ── Shift ve geniş glifler (Adım 3 görev 1; fikstür: OP_TEST_SHIFT, içerikte henüz büyük harf/işaret yok) ──
const OP_SH_SOL = OP_N + 1;
const OP_SH_SAG = OP_N + 2;
const OP_SH_KUTU = OP_N + 3;
const OP_SH_SATIR = OP_N + 4;
const OP_SH_TOPLAM = OP_N + 4;
// Oyun ekranında yanan tuş kodları ve parmaklar (tekil, sıralı)
const opYanan = (page) => page.evaluate(() => ({
    tuslar: [...new Set([...document.querySelectorAll('.op-oyun [data-code].is-hedef')].map((g) => g.dataset.code))].sort(),
    parmaklar: [...new Set([...document.querySelectorAll('.op-oyun [data-parmak].is-hedef')].map((p) => p.dataset.parmak))].sort(),
}));
// Karakter için beklenen yanma: tuş + (Shift'liyse) karşı Shift; parmaklar parmaklarOf
const opBeklenenYanma = (ch) => ({
    tuslar: [D.tusOf(ch).code, D.shiftTusuOf(ch)].filter(Boolean).sort(),
    parmaklar: [...new Set(D.parmaklarOf(ch))].sort(),
});
// Satırlar: taşma (scrollWidth > clientWidth) ve satırın karakterleri (yanlış boşluk ␣ görünse de metindeki karakter)
const opSatirlar = (page) => page.locator('.op-satirlar__ic > .op-satir').evaluateAll((d) => d.map((e) => ({
    sw: e.scrollWidth, cw: e.clientWidth,
    metin: [...e.querySelectorAll('.op-harf')].map((h) => (h.classList.contains('op-harf--bosluk') ? ' ' : h.textContent)).join(''),
})));
async function opSatirTasmasiz(page, etiket) {
    const satirlar = await opSatirlar(page);
    expect(satirlar.length, etiket).toBeGreaterThan(1);
    for (const [i, s] of satirlar.entries()) expect(s.sw, `${etiket}: satır ${i + 1} "${s.metin}" taşmaz`).toBeLessThanOrEqual(s.cw);
    return satirlar;
}

opTestShift.describe('OnParmak — Shift tanıtımı ve Shift\'li karakterler (fikstür)', () => {
    opTestShift('yeniShift sol: tanıtımda örnek büyük harf yanar (J + sol Shift + sağ işaret + sol serçe); yalnız sol Shift geçirir', async ({ page, errors }) => {
        opTestShift.setTimeout(90000);
        await opAc(page, OP_SH_SOL, OP_SH_TOPLAM);
        const oyun = opOyun(page);
        await expect(oyun).toHaveAttribute('data-mod', 'tanitim');
        await expect(oyun).toHaveAttribute('data-beklenen', 'Shift');
        await expect(page.locator('.op-tanitim__tus')).toHaveText(['Shift', 'J']);
        await expect(page.locator('.op-tanitim__cumle')).toContainText('Sağ el harfleri için sol Shift’e sol serçe parmağınla bas.');
        expect(await opYanan(page)).toEqual({ tuslar: ['KeyJ', 'ShiftLeft'], parmaklar: ['sag-isaret', 'sol-serce'] });
        await page.clock.runFor(100);
        await expect(page.locator('.op-canli')).toContainText('Örneğin büyük J');
        // Örnek harfe ya da yanlış Shift'e basmak geçirmez
        await page.evaluate(() => window.__opBas('J'));
        await page.evaluate(() => window.__opTus('Shift', 'ShiftRight'));
        await expect(oyun).toHaveAttribute('data-mod', 'tanitim');
        await page.evaluate(() => window.__opTus('Shift', 'ShiftLeft'));
        await expect(oyun).toHaveAttribute('data-mod', 'serit');
        await expect(page.locator('.op-serit')).toContainText('Sol Shift');
        await page.clock.runFor(1300);
        await expect(oyun).toHaveAttribute('data-mod', 'kutu');
        await expect(oyun).toHaveAttribute('data-beklenen', 'J');
        expect(await opYanan(page)).toEqual(opBeklenenYanma('J'));
        // Shift'siz küçük harf büyük harfin yerine geçmez
        await page.evaluate(() => window.__opBas('j'));
        await expect(page.locator('.op-kutu[data-i="0"]')).toHaveClass(/is-yanlis/);
        await expect(oyun).toHaveAttribute('data-beklenen', 'J');
        await opYaz(page, 'kutu');
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
        errors.assertClean();
    });

    opTestShift('yeniShift sağ: örnek F + sağ Shift + sol işaret + sağ serçe; yalnız sağ Shift geçirir', async ({ page, errors }) => {
        await opAc(page, OP_SH_SAG, OP_SH_TOPLAM);
        const oyun = opOyun(page);
        await expect(page.locator('.op-tanitim__tus')).toHaveText(['Shift', 'F']);
        await expect(page.locator('.op-tanitim__cumle')).toContainText('Sol el harfleri için sağ Shift’e sağ serçe parmağınla bas.');
        expect(await opYanan(page)).toEqual({ tuslar: ['KeyF', 'ShiftRight'], parmaklar: ['sag-serce', 'sol-isaret'] });
        await page.evaluate(() => window.__opTus('Shift', 'ShiftLeft'));
        await expect(oyun).toHaveAttribute('data-mod', 'tanitim');
        await page.evaluate(() => window.__opTus('Shift', 'ShiftRight'));
        await expect(page.locator('.op-serit')).toContainText('Sağ Shift');
        errors.assertClean();
    });

    opTestShift('Shift\'li yeni tuş tanıtımı (?): tuşun kendi parmağı + karşı Shift söylenir; kutuda büyük harf, rakam satırı Shift\'lileri ve : ; \' " - doğru beklenir, karşı Shift yanar', async ({ page, errors }) => {
        opTestShift.setTimeout(90000);
        await opAc(page, OP_SH_KUTU, OP_SH_TOPLAM);
        const oyun = opOyun(page);
        await expect(oyun).toHaveAttribute('data-beklenen', '?');
        await expect(page.locator('.op-tanitim__cumle')).toHaveText('? tuşuna sağ serçe parmağınla bas; sol Shift’i sol serçe parmağınla basılı tut.');
        expect(await opYanan(page)).toEqual(opBeklenenYanma('?'));
        await page.evaluate(() => window.__opBas('?'));
        await page.clock.runFor(1300);
        await expect(oyun).toHaveAttribute('data-mod', 'kutu');
        const metin = [...OP_SHIFT_KUTU];
        for (const [i, ch] of metin.entries()) {
            await expect(oyun, `kutu ${i}`).toHaveAttribute('data-beklenen', ch);
            if (ch !== ' ') expect(await opYanan(page), `kutu ${i} "${ch}"`).toEqual(opBeklenenYanma(ch));
            // Büyük harfte Shift'siz küçüğü, Shift'li işarette aynı tuşun Shift'siz karakteri yanlış sayılır
            const t = D.tusOf(ch);
            if (t && t.shift) {
                const alt = D.SATIRLAR.flat().find((k) => k.code === t.code).alt;
                await page.evaluate((c) => window.__opBas(c), alt);
                await expect(page.locator('.op-kutu[data-i="' + i + '"]'), `kutu ${i} "${ch}" ← "${alt}"`).toHaveClass(/is-yanlis/);
            }
            await page.evaluate((c) => window.__opBas(c), ch);
        }
        await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
        errors.assertClean();
    });
});

for (const [ad, vp] of [['masaüstü 1366×768', { width: 1366, height: 768 }], ['telefon 375×812', { width: 375, height: 812 }]]) {
    opTestShift.describe('OnParmak — satır motoru ölçülü bölme, ' + ad, () => {
        opTestShift('geniş glifli + Shift\'li satır: hiçbir satır taşmaz, sözcük bölünmez (satırdan uzun sözcük hariç), metin tam; Shift\'li karakterde karşı Shift yanar; yanlış boşluk (␣) taşırmaz', async ({ page, errors }) => {
            opTestShift.setTimeout(120000);
            await page.setViewportSize(vp);
            await opAc(page, OP_SH_SATIR, OP_SH_TOPLAM);
            const oyun = opOyun(page);
            await expect(oyun).toHaveAttribute('data-mod', 'satir');
            const satirlar = await opSatirTasmasiz(page, ad);
            expect(satirlar.map((s) => s.metin).join('')).toBe(OP_SHIFT_SATIR);
            // Sözcük bölünmez: satır sonu boşluk ya da metnin sonu — yalnız satıra sığmayan uzun sözcük (W×28) harf harf bölünür
            satirlar.slice(0, -1).forEach((s, i) => {
                if (s.metin.endsWith(' ')) return;
                expect(/^W+$/.test(s.metin.split(' ').pop()), `satır ${i + 1} "${s.metin}" sözcük ortasında bitiyor`).toBe(true);
            });
            // Her karakterde: beklenen + yanan tuşlar (Shift'liyse karşı Shift); boşluklar yanlış yazılır (␣ görünür)
            const sorun = await page.evaluate(() => {
                const D2 = window.KlavyeDizilim;
                const r = document.querySelector('.op-oyun');
                const hatalar = [];
                const tasma = () => Math.max(...[...document.querySelectorAll('.op-satirlar__ic > .op-satir')].map((e) => e.scrollWidth - e.clientWidth));
                let enCokTasma = -Infinity;
                for (let n = 0; n < 400 && r.dataset.mod === 'satir'; n++) {
                    const ch = r.dataset.beklenen;
                    if (ch !== ' ') {
                        const yanan = [...new Set([...r.querySelectorAll('[data-code].is-hedef')].map((g) => g.dataset.code))].sort().join(',');
                        const beklenen = [D2.tusOf(ch).code, D2.shiftTusuOf(ch)].filter(Boolean).sort().join(',');
                        if (yanan !== beklenen) hatalar.push(ch + ': ' + yanan + ' ≠ ' + beklenen);
                    }
                    window.__opBas(ch === ' ' ? 'j' : ch);
                    if (r.dataset.mod === 'satir') enCokTasma = Math.max(enCokTasma, tasma());
                }
                return { hatalar, enCokTasma };
            });
            expect(sorun.hatalar).toEqual([]);
            expect(sorun.enCokTasma, 'yazarken (␣ dahil) taşma').toBeLessThanOrEqual(0);
            await expect(page.locator('.op-harf.is-yanlis').first()).toHaveText('␣');
            await expect(oyun).toHaveAttribute('data-mod', 'sonuc');
            await opSatirTasmasiz(page, ad + ' (bitişte)');
            errors.assertClean();
        });
    });
}

opTestShift.describe('OnParmak — satır motoru yeniden boyutlandırmada', () => {
    opTestShift('masaüstü → 375 px: satırlar yeniden bölünür (taşma yok), yazılanlar ve imleç korunur', async ({ page, errors }) => {
        opTestShift.setTimeout(90000);
        await page.setViewportSize({ width: 1366, height: 768 });
        await opAc(page, OP_SH_SATIR, OP_SH_TOPLAM);
        await expect(opOyun(page)).toHaveAttribute('data-mod', 'satir');
        const once = (await opSatirlar(page)).length;
        for (const ch of [...OP_SHIFT_SATIR].slice(0, 30)) await page.evaluate((c) => window.__opBas(c), ch);
        await page.setViewportSize({ width: 375, height: 812 });
        await expect.poll(async () => (await opSatirlar(page)).length).toBeGreaterThan(once);
        await opSatirTasmasiz(page, '375 sonrası');
        expect(await page.locator('.op-harf.is-dogru').count()).toBe(30);
        const imlec = await page.locator('.op-harf').evaluateAll((h) => h.findIndex((e) => e.classList.contains('is-imlec')));
        expect(imlec).toBe(30);
        await expect(page.locator('.op-satir.is-etkin .op-harf.is-imlec')).toHaveCount(1);
        errors.assertClean();
    });
});
