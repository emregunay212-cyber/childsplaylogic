/* Üçgenler (24 soru) — açı/Pisagor/alan/çevre/üçgen eşitsizliği hesaplarını BAĞIMSIZ yapıp
   cevap anahtarıyla karşılaştırır. Kullanım: node verify-ucgenler.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'ucgenler.json'), 'utf8'));
const sq = Math.sqrt;
const yak = (a, b) => Math.abs(a - b) < 1e-9;
const pnum = s => parseFloat(String(s).replace(/[−–]/g, '-').replace(',', '.').replace(/[^0-9.\-]/g, ''));
function harfBul(q, bek) { const e = Object.keys(q.siklar).filter(h => yak(pnum(q.siklar[h]), bek)); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }

const num = {
  '001': 180 - 60 - 70, '002': 90 - 30, '003': 60, '004': sq(9 + 16), '005': 180, '006': 180 - 100,
  '007': sq(36 + 64), '008': 180 - 90 - 45, '009': 120 - 50, '010': sq(169 - 25), '011': 18, '012': 8 * 5 / 2,
  '013': 45, '014': 4 + 7 - 1, '015': sq(64 + 225), '016': 4 * (180 / 9), '017': sq(100 - 36), '018': (9 - 5) + 1,
  '019': 6 * 8 / 2, '020': (180 - 40) / 2, '021': ((180 - 60) / 3) + 40, '022': sq(81 + 144), '023': 5 * (180 / 12), '024': sq(625 - 49)
};
let pass = 0, fail = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop(); const bek = num[id];
  if (bek === undefined) { console.log(id, 'ATLA'); continue; }
  const h = harfBul(q, bek); const ok = h === q.dogruCevap;
  if (ok) pass++; else { fail++; console.log(`${q.id} dc=${q.dogruCevap} hesap=${h} bek=${bek} FAIL`); }
}
console.log(`SONUC: ${pass} PASS, ${fail} FAIL  (${data.sorular.length} soru)`);
process.exit(fail > 0 ? 1 : 0);
