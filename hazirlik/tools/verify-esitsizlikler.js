/* Eşitsizlikler (24 soru) — her eşitsizliği BAĞIMSIZ çözer (−200..200 tam sayı taraması),
   en küçük/büyük tam sayı çözümü veya çözüm sayısını bulur, cevap anahtarıyla karşılaştırır.
   Kullanım: node verify-esitsizlikler.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'esitsizlikler.json'), 'utf8'));
const yak = (a, b) => Math.abs(a - b) < 1e-9;
const pnum = s => parseFloat(String(s).replace(/[−–]/g, '-').replace(',', '.').replace(/[^0-9.\-]/g, ''));
function harfBul(q, bek) { const e = Object.keys(q.siklar).filter(h => yak(pnum(q.siklar[h]), bek)); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }

const checks = {
  '001': { f: x => x + 3 > 7, tip: 'min' }, '002': { f: x => x - 1 < 4, tip: 'max' },
  '003': { f: x => 2 * x <= 8, tip: 'max' }, '004': { f: x => x + 5 >= 9, tip: 'min' },
  '005': { f: x => x - 3 <= 2, tip: 'max' }, '006': { f: x => 4 * x >= 16, tip: 'min' },
  '007': { f: x => x + 2 < 6, tip: 'max' }, '008': { f: x => 2 * x >= 6, tip: 'min' },
  '009': { f: x => 2 * x + 1 > 9, tip: 'min' }, '010': { f: x => 3 * x - 2 <= 10, tip: 'max' },
  '011': { f: x => x / 2 + 1 < 5, tip: 'max' }, '012': { f: x => 5 <= x && x < 10, tip: 'count' },
  '013': { f: x => 2 < x && x <= 7, tip: 'count' }, '014': { f: x => -x < 3, tip: 'min' },
  '015': { f: x => 2 * (x - 1) <= 8, tip: 'max' }, '016': { f: x => 3 * x + 4 > x + 10, tip: 'min' },
  '017': { f: x => -2 * x >= 6, tip: 'max' }, '018': { f: x => -3 * x < 9, tip: 'min' },
  '019': { f: x => 1 < 2 * x - 3 && 2 * x - 3 < 7, tip: 'count' }, '020': { f: x => x >= 2 && x <= 4, tip: 'count' },
  '021': { f: x => 4 - x > 1, tip: 'max' }, '022': { f: x => -x + 5 <= 2, tip: 'min' },
  '023': { f: x => 2 * x - 7 >= 3, tip: 'min' }, '024': { f: x => 10 - 2 * x > 0, tip: 'max' }
};
function hesapla(c) {
  const R = []; for (let x = -200; x <= 200; x++) if (c.f(x)) R.push(x);
  if (c.tip === 'min') return R[0];
  if (c.tip === 'max') return R[R.length - 1];
  return R.length;
}
let pass = 0, fail = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop(); const c = checks[id];
  if (!c) { console.log(id, 'ATLA'); continue; }
  const bek = hesapla(c); const h = harfBul(q, bek); const ok = h === q.dogruCevap;
  if (ok) pass++; else { fail++; console.log(`${q.id} dc=${q.dogruCevap} hesap=${h} bek=${bek} FAIL`); }
}
console.log(`SONUC: ${pass} PASS, ${fail} FAIL  (${data.sorular.length} soru)`);
process.exit(fail > 0 ? 1 : 0);
