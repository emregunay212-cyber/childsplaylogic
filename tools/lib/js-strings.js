/* ============================================
   JS kaynağındaki dizge sabitlerini bulur (tools/build.js için)
   --------------------------------------------
   Neden regex değil: `'js/x.js'` gibi bir yol yorum satırında, bir CSS seçicisinin
   içinde (`[href*="css/x.css"]`) ya da bir regex sabitinde de geçebilir. Bu küçük
   tarayıcı yorumları, regex sabitlerini ve `${…}` içeren şablon dizgeleri atlar;
   yalnız BÜTÜN değeri tek bir dizge olan sabitleri döndürür.
   Sezgisel: `/` işareti, önceki anlamlı karakter/sözcük bölme işlemi olamayacak bir
   şeyse regex başlangıcı sayılır (`return /x/`, `= /x/`, `(/x/`). Bağımlılık yok.
   ============================================ */
'use strict';

// Regex sabiti başlatabilecek önceki karakterler (bölme işleci değil).
const REGEX_AFTER_CHARS = new Set('(,=:[!&|?{};+-*%<>~^'.split(''));
// Regex sabiti başlatabilecek önceki anahtar sözcükler.
const REGEX_AFTER_WORDS = new Set([
    'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
    'case', 'do', 'else', 'yield', 'await',
]);
const WORD_CHAR = /[\w$]/;

/**
 * @param {string} src JS kaynağı (klasik betik ya da ES modülü)
 * @returns {{ start: number, end: number, value: string }[]} tırnaklar HARİÇ içerik aralıkları
 */
function findStringLiterals(src) {
    const found = [];
    const n = src.length;
    let i = 0;
    let prevChar = '';   // boşluk/yorum dışı son karakter
    let prevWord = '';   // son tanımlayıcı ya da anahtar sözcük

    function regexAllowed() {
        if (prevChar === '') return true;
        if (WORD_CHAR.test(prevChar)) return REGEX_AFTER_WORDS.has(prevWord);
        return REGEX_AFTER_CHARS.has(prevChar);
    }

    function skipLineComment() {
        const e = src.indexOf('\n', i);
        i = e < 0 ? n : e;
    }

    function skipBlockComment() {
        const e = src.indexOf('*/', i + 2);
        i = e < 0 ? n : e + 2;
    }

    function skipRegex() {
        i += 1;
        let inClass = false;
        while (i < n && src[i] !== '\n') {
            const ch = src[i];
            if (ch === '\\') { i += 2; continue; }
            if (inClass) { if (ch === ']') inClass = false; }
            else if (ch === '[') inClass = true;
            else if (ch === '/') break;
            i += 1;
        }
        i += 1;                                            // kapanış /
        while (i < n && /[a-z]/i.test(src[i])) i += 1;    // bayraklar
        prevChar = ')';
        prevWord = '';
    }

    function readQuoted(quote) {
        i += 1;
        const start = i;
        while (i < n && src[i] !== quote && src[i] !== '\n') {
            if (src[i] === '\\') i += 1;
            i += 1;
        }
        found.push({ start, end: i, value: src.slice(start, i) });
        i += 1;                                            // kapanış tırnağı
        prevChar = quote;
        prevWord = '';
    }

    function readTemplate() {
        i += 1;
        const start = i;
        let interpolated = false;
        while (i < n && src[i] !== '`') {
            if (src[i] === '\\') { i += 2; continue; }
            if (src[i] === '$' && src[i + 1] === '{') {
                interpolated = true;
                i += 2;
                readInterpolation();
                continue;
            }
            i += 1;
        }
        // `${…}` içeren şablon tek bir sabit değildir (URL'yi çalışma anında kurar) → atlanır.
        if (!interpolated) found.push({ start, end: i, value: src.slice(start, i) });
        i += 1;
        prevChar = '`';
        prevWord = '';
    }

    // `${` sonrası: eşleşen `}`'e kadar normal tarama (iç içe dizge/şablon/regex dahil).
    function readInterpolation() {
        let depth = 0;
        prevChar = '{';
        prevWord = '';
        while (i < n) {
            const ch = src[i];
            if (ch === '}' && depth === 0) { i += 1; return; }
            if (step() === 'char') {
                if (ch === '{') depth += 1;
                else if (ch === '}') depth -= 1;
            }
        }
    }

    // Bir birim ilerler; dönüş: 'comment' | 'string' | 'regex' | 'char'
    function step() {
        const ch = src[i];
        const next = src[i + 1];
        if (ch === '/' && next === '/') { skipLineComment(); return 'comment'; }
        if (ch === '/' && next === '*') { skipBlockComment(); return 'comment'; }
        if (ch === '\'' || ch === '"') { readQuoted(ch); return 'string'; }
        if (ch === '`') { readTemplate(); return 'string'; }
        if (ch === '/' && regexAllowed()) { skipRegex(); return 'regex'; }
        if (WORD_CHAR.test(ch)) {
            prevWord = WORD_CHAR.test(prevChar) ? prevWord + ch : ch;
            prevChar = ch;
        } else if (!/\s/.test(ch)) {
            prevChar = ch;
            prevWord = '';
        }
        i += 1;
        return 'char';
    }

    while (i < n) step();
    return found;
}

module.exports = { findStringLiterals };
