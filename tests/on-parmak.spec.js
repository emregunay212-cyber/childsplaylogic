/* ============================================
   On Parmak testleri
   --------------------------------------------
   Bu dosya adım adım büyür. Şu an yalnız:
   1) Ortak klavye dizilimi (js/games/klavye-dizilim.js, Node `vm`, TARAYICISIZ): satırların veri sabiti,
      parmak haritası (spec §5.1), tusOf / parmaklarOf / shiftTusuOf / elOf / yazilabilir örnek tablosu ve
      karakterOf — "fiziksel tuş = konum": TR Q, İngilizce dizilim (TR kapak), Caps Lock, ölü tuş, Numpad, boş e.code.
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
