/* Üslü İfadeler + Kareköklü İfadeler (her biri 24 soru) — matematiği BAĞIMSIZ doğrular (Node.js).
   Kesir/ondalık şıklar `deger()` ile (1/4, 0,01 …), radikaller fonksiyon modeliyle çözülür.
   Kullanım: node verify-uslu-karekoklu.js */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'icerik', 'lgs', 'matematik');
const load = s => JSON.parse(fs.readFileSync(path.join(dir, s + '.json'), 'utf8'));
const sq = Math.sqrt, eps = 1e-6;
const yak = (a, b) => Math.abs(a - b) < eps;
function deger(s) {
  s = String(s).replace(/[−–]/g, '-').replace(',', '.');
  if (/[√a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(s)) return NaN; // radikal/harf içeren şık sade sayı değildir
  if (s.includes('/')) { const p = s.split('/'); return parseFloat(p[0]) / parseFloat(p[1]); }
  return parseFloat(s.replace(/[^0-9.\-]/g, ''));
}
function harfBul(q, beklenen) {
  const e = Object.keys(q.siklar).filter(h => yak(deger(q.siklar[h]), beklenen));
  return e.length === 1 ? e[0] : '?[' + e.join('') + ']';
}
function tekEslesen(q, bek, mod) {
  const e = Object.keys(mod).filter(k => yak(mod[k], bek));
  return e.length === 1 ? e[0] : '?[' + e.join('') + ']';
}
function tamKareAmong(q) {
  const e = Object.keys(q.siklar).filter(h => { const r = sq(deger(q.siklar[h])); return Math.abs(r - Math.round(r)) < eps; });
  return e.length === 1 ? e[0] : '?[' + e.join('') + ']';
}

const num = {
  'lgs-mat-uslu-ifadeler-001': 2 ** 4, 'lgs-mat-uslu-ifadeler-002': (-3) ** 2, 'lgs-mat-uslu-ifadeler-003': 7 ** 0,
  'lgs-mat-uslu-ifadeler-004': 2 ** 3 * 2 ** 2, 'lgs-mat-uslu-ifadeler-005': 3 ** 5 / 3 ** 3, 'lgs-mat-uslu-ifadeler-006': (2 ** 3) ** 2,
  'lgs-mat-uslu-ifadeler-007': 2 ** -3, 'lgs-mat-uslu-ifadeler-008': 10 ** 5, 'lgs-mat-uslu-ifadeler-009': 5 * 10 ** 3,
  'lgs-mat-uslu-ifadeler-010': (-2) ** 4 - (-2) ** 3, 'lgs-mat-uslu-ifadeler-011': 5 ** 2, 'lgs-mat-uslu-ifadeler-012': (-2) ** 2,
  'lgs-mat-uslu-ifadeler-013': 10 ** 3, 'lgs-mat-uslu-ifadeler-014': 3 ** 0, 'lgs-mat-uslu-ifadeler-015': 2 ** 5 / 2 ** 2,
  'lgs-mat-uslu-ifadeler-016': (3 ** 2) ** 2, 'lgs-mat-uslu-ifadeler-017': 5 ** 2 * 5, 'lgs-mat-uslu-ifadeler-018': 2 ** -2,
  'lgs-mat-uslu-ifadeler-019': (-1) ** 100, 'lgs-mat-uslu-ifadeler-020': 2 ** 3 + 2 ** 2, 'lgs-mat-uslu-ifadeler-021': 4 ** 2 * 2 ** 3,
  'lgs-mat-uslu-ifadeler-022': (2 * 3) ** 2, 'lgs-mat-uslu-ifadeler-023': 10 ** -2, 'lgs-mat-uslu-ifadeler-024': 2 ** 4 - 2 ** 0,
  'lgs-mat-karekoklu-ifadeler-001': sq(64), 'lgs-mat-karekoklu-ifadeler-002': sq(121), 'lgs-mat-karekoklu-ifadeler-004': sq(3 * 12),
  'lgs-mat-karekoklu-ifadeler-007': sq(80 / 5), 'lgs-mat-karekoklu-ifadeler-008': sq(11) ** 2, 'lgs-mat-karekoklu-ifadeler-010': sq(0.25),
  'lgs-mat-karekoklu-ifadeler-011': sq(81), 'lgs-mat-karekoklu-ifadeler-012': sq(100), 'lgs-mat-karekoklu-ifadeler-013': sq(1),
  'lgs-mat-karekoklu-ifadeler-015': sq(16), 'lgs-mat-karekoklu-ifadeler-016': sq(2 * 18), 'lgs-mat-karekoklu-ifadeler-017': sq(200 / 2),
  'lgs-mat-karekoklu-ifadeler-020': 3 * sq(2) * sq(2), 'lgs-mat-karekoklu-ifadeler-021': (2 * sq(3)) ** 2,
  'lgs-mat-karekoklu-ifadeler-022': sq(0.09), 'lgs-mat-karekoklu-ifadeler-024': sq(144) + sq(25)
};
const rad = {
  'lgs-mat-karekoklu-ifadeler-005': { bek: sq(45), mod: { A: 3 * sq(5), B: 5 * sq(3), C: 9 * sq(5), D: 15 } },
  'lgs-mat-karekoklu-ifadeler-006': { bek: 5 * sq(7), mod: { A: 5 * sq(14), B: 6 * sq(7), C: 5 * sq(7), D: 35 } },
  'lgs-mat-karekoklu-ifadeler-009': { bek: sq(8) + sq(18), mod: { A: sq(26), B: 5 * sq(2), C: 6 * sq(2), D: 10 * sq(2) } },
  'lgs-mat-karekoklu-ifadeler-018': { bek: sq(98), mod: { A: 7 * sq(2), B: 2 * sq(7), C: 49 * sq(2), D: 14 } },
  'lgs-mat-karekoklu-ifadeler-019': { bek: sq(12) + sq(3), mod: { A: sq(15), B: 3 * sq(3), C: 2 * sq(3), D: 6 } },
  'lgs-mat-karekoklu-ifadeler-023': { bek: sq(50) - sq(8), mod: { A: sq(42), B: 3 * sq(2), C: 7 * sq(2), D: sq(2) } }
};
const tamKare = ['lgs-mat-karekoklu-ifadeler-003', 'lgs-mat-karekoklu-ifadeler-014'];

let pass = 0, fail = 0;
for (const slug of ['uslu-ifadeler', 'karekoklu-ifadeler']) {
  for (const q of load(slug).sorular) {
    let h = 'ATLA';
    if (num[q.id] !== undefined) h = harfBul(q, num[q.id]);
    else if (rad[q.id]) h = tekEslesen(q, rad[q.id].bek, rad[q.id].mod);
    else if (tamKare.includes(q.id)) h = tamKareAmong(q);
    if (h === 'ATLA') { console.log(`${q.id} [${q.zorluk}] ATLA (kontrol yok)`); continue; }
    const ok = h === q.dogruCevap;
    if (ok) pass++; else fail++;
    console.log(`${q.id} [${q.zorluk}] dc=${q.dogruCevap} hesap=${h} => ${ok ? 'PASS' : 'FAIL'}`);
  }
}
console.log(`\nSONUC: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
