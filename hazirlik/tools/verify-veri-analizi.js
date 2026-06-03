/* Veri Analizi (24 soru) — ortalama/ortanca/tepe değer/açıklık hesaplarını BAĞIMSIZ yapıp
   cevap anahtarıyla karşılaştırır. Kullanım: node verify-veri-analizi.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'veri-analizi.json'), 'utf8'));
const yak = (a, b) => Math.abs(a - b) < 1e-9;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const mode = a => { const m = {}; let best = a[0], bc = 0; for (const x of a) { m[x] = (m[x] || 0) + 1; if (m[x] > bc) { bc = m[x]; best = x; } } return best; };
const range = a => Math.max(...a) - Math.min(...a);
function harfBul(q, bek) { const e = Object.keys(q.siklar).filter(h => yak(parseFloat(String(q.siklar[h]).replace(',', '.')), bek)); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }

const num = {
  '001': mean([2, 4, 6]), '002': mode([5, 5, 8, 10]), '003': range([3, 7, 7, 9]), '004': mean([10, 20, 30, 40]),
  '005': mode([4, 8, 8, 8, 12]), '006': median([1, 2, 3, 4, 5]), '007': range([6, 2, 9, 4]), '008': mean([5, 10, 15]),
  '009': median([2, 4, 6, 8]), '010': mean([3, 5, 7, 9, 11]), '011': mean([70, 80, 90]), '012': mode([12, 15, 15, 18, 20]),
  '013': range([10, 14, 18, 22]), '014': 6 * 5, '015': 6 * 3 - (4 + 7), '016': median([8, 12, 16, 20, 24]),
  '017': 4 * 75 - 3 * 70, '018': mean([2, 4, 4, 6, 9]), '019': mean([10, 20, 30]) + range([10, 20, 30]),
  '020': median([60, 70, 80, 90, 100]), '021': 5 * 50 - 4 * 48, '022': mode([1, 3, 3, 5, 5, 5, 7]),
  '023': 3 * 15 - (10 + 20), '024': median([4, 8, 12, 16, 20, 24])
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
