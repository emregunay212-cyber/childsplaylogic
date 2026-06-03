/* Cebirsel İfadeler + Doğrusal Denklemler (her biri 24 soru) — BAĞIMSIZ doğrular (Node.js).
   Sembolik sorular fonksiyon modeliyle (birden çok değerde eşitlik), sayısal sorular hesapla,
   denklemler kök testiyle. Kullanım: node verify-cebir-denklem.js */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'icerik', 'lgs', 'matematik');
const load = s => JSON.parse(fs.readFileSync(path.join(dir, s + '.json'), 'utf8'));

const TESTX = [2, 3, 5, 7, 11];
const TESTAB = [[5, 2], [7, 3], [4, 1], [9, 5]];
const yak = (a, b) => Math.abs(a - b) < 1e-6;
const pnum = s => parseFloat(String(s).replace(/[−–]/g, '-').replace(',', '.').replace(/[^0-9.\-]/g, ''));

function semb1(q, f, mod) { const e = Object.keys(mod).filter(k => TESTX.every(x => yak(f(x), mod[k](x)))); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }
function semb2(q, f, mod) { const e = Object.keys(mod).filter(k => TESTAB.every(([a, b]) => yak(f(a, b), mod[k](a, b)))); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }
function sayisal(q, bek) { const e = Object.keys(q.siklar).filter(h => yak(pnum(q.siklar[h]), bek)); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }
function denklem(q, sol, sag) { const e = Object.keys(q.siklar).filter(h => { const x = pnum(q.siklar[h]); return yak(sol(x), sag(x)); }); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }

const C = 'lgs-mat-cebirsel-ifadeler-ozdeslikler-';
const D = 'lgs-mat-dogrusal-denklemler-';
const checks = {
  // ---- Cebirsel ----
  [C + '001']: q => semb1(q, x => 7 * x - 2 * x, { A: x => 5 * x, B: x => 9 * x, C: x => 14 * x, D: () => 5 }),
  [C + '002']: q => sayisal(q, (() => { const x = 4; return 3 * x * x - 2 * x; })()),
  [C + '003']: q => semb1(q, x => (x + 5) * (x - 5), { A: x => x * x - 25, B: x => x * x + 25, C: x => x * x - 10 * x + 25, D: x => x * x - 5 * x }),
  [C + '004']: q => sayisal(q, 6 * 6 - 4 * 4),
  [C + '005']: q => semb1(q, x => x * x - 8 * x + 16, { A: x => (x - 4) ** 2, B: x => (x + 4) ** 2, C: x => (x - 4) * (x + 4), D: x => (x - 8) ** 2 }),
  [C + '006']: q => semb1(q, x => 2 * (3 * x - 1), { A: x => 6 * x - 2, B: x => 6 * x - 1, C: x => 5 * x - 1, D: x => 6 * x + 2 }),
  [C + '007']: q => sayisal(q, 8 * 8 - 2 * 12),
  [C + '008']: q => semb1(q, x => 15 * x ** 3 / (3 * x), { A: x => 5 * x * x, B: x => 5 * x ** 3, C: x => 12 * x * x, D: x => 5 * x }),
  [C + '009']: q => sayisal(q, (() => { const x = 10; return x * x - 1; })()),
  [C + '010']: q => semb2(q, (a, b) => (a - b) ** 2, { A: (a, b) => a * a - 2 * a * b + b * b, B: (a, b) => a * a + 2 * a * b + b * b, C: (a, b) => a * a - b * b, D: (a, b) => a * a - a * b + b * b }),
  [C + '011']: q => semb1(q, a => 4 * a + 3 * a, { A: a => 7 * a, B: a => 12 * a, C: () => 7, D: a => a ** 7 }),
  [C + '012']: q => sayisal(q, 5 * 2),
  [C + '013']: q => semb1(q, x => 3 * (x + 2), { A: x => 3 * x + 6, B: x => 3 * x + 2, C: x => x + 6, D: x => 3 * x + 5 }),
  [C + '014']: q => semb1(q, y => 8 * y - 3 * y, { A: y => 5 * y, B: y => 11 * y, C: () => 5, D: y => 24 * y }),
  [C + '015']: q => sayisal(q, 3 + 7),
  [C + '016']: q => semb1(q, x => (x + 2) * (x - 2), { A: x => x * x - 4, B: x => x * x + 4, C: x => x * x - 4 * x + 4, D: x => x * x - 2 * x }),
  [C + '017']: q => sayisal(q, (() => { const x = 5; return 2 * x * x - 3; })()),
  [C + '018']: q => semb1(q, x => (x + 3) ** 2, { A: x => x * x + 9, B: x => x * x + 6 * x + 9, C: x => x * x + 3 * x + 9, D: x => x * x + 6 * x }),
  [C + '019']: q => sayisal(q, 10 ** 2 - 2 * 21),
  [C + '020']: q => sayisal(q, 7 * 7 - 3 * 3),
  [C + '021']: q => semb1(q, x => x * x - 10 * x + 25, { A: x => (x - 5) ** 2, B: x => (x + 5) ** 2, C: x => (x - 5) * (x + 5), D: x => (x - 10) ** 2 }),
  [C + '022']: q => sayisal(q, (() => { const x = 4; return (x - 1) * (x + 1); })()),
  [C + '023']: q => semb2(q, (x, y) => 6 * x * x * y / (2 * x * y), { A: (x, y) => 3 * x, B: (x, y) => 3 * x * y, C: (x, y) => 4 * x, D: () => 3 }),
  [C + '024']: q => sayisal(q, 5 * 9),
  // ---- Doğrusal ----
  [D + '001']: q => denklem(q, x => 2 * x + 3, () => 11),
  [D + '002']: q => denklem(q, x => 5 * x, () => 20),
  [D + '003']: q => denklem(q, x => 3 * x - 7, x => 2 * x + 1),
  [D + '004']: q => denklem(q, x => x / 2 + 1, () => 5),
  [D + '005']: q => denklem(q, x => 2 * (x - 3), () => 10),
  [D + '006']: q => sayisal(q, (13 - 5) / (6 - 2)),
  [D + '007']: q => sayisal(q, 3),
  [D + '008']: q => denklem(q, x => 4 * x + 5, x => 3 * x + 12),
  [D + '009']: q => sayisal(q, 11),
  [D + '010']: q => sayisal(q, 2 * 4 + 1),
  [D + '011']: q => denklem(q, x => x + 5, () => 12),
  [D + '012']: q => denklem(q, x => 4 * x, () => 24),
  [D + '013']: q => denklem(q, x => x - 3, () => 10),
  [D + '014']: q => denklem(q, x => 3 * x, () => 15),
  [D + '015']: q => sayisal(q, 2 + 4),
  [D + '016']: q => denklem(q, x => 5 * x - 2, () => 13),
  [D + '017']: q => denklem(q, x => 2 * x + 7, x => x + 10),
  [D + '018']: q => denklem(q, x => 3 * (x - 2), () => 15),
  [D + '019']: q => sayisal(q, (8 - 2) / (3 - 1)),
  [D + '020']: q => sayisal(q, 4 * 3 - 1),
  [D + '021']: q => denklem(q, x => x / 3 + 2, () => 5),
  [D + '022']: q => denklem(q, x => 5 * x + 3, x => 2 * x + 18),
  [D + '023']: q => sayisal(q, 17),
  [D + '024']: q => sayisal(q, 2)
};

let pass = 0, fail = 0;
for (const slug of ['cebirsel-ifadeler-ozdeslikler', 'dogrusal-denklemler']) {
  for (const q of load(slug).sorular) {
    const fn = checks[q.id];
    if (!fn) { console.log(`${q.id} ATLA`); continue; }
    const h = fn(q); const ok = h === q.dogruCevap;
    if (ok) pass++; else fail++;
    if (!ok) console.log(`${q.id} [${q.zorluk}] dc=${q.dogruCevap} hesap=${h} => FAIL`);
  }
}
console.log(`SONUC: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
