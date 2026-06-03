/* Basit Olayların Olasılığı (24 soru) — olasılıkları BAĞIMSIZ hesaplar, cevap anahtarıyla
   karşılaştırır. Kesir şıklar deger() ile çözülür. Kullanım: node verify-olasilik.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'olasilik.json'), 'utf8'));
const yak = (a, b) => Math.abs(a - b) < 1e-9;
function deger(s) {
  s = String(s).replace(/[−–]/g, '-').replace(',', '.');
  if (/[a-zçğıöşü√]/i.test(s)) return NaN;
  if (s.includes('/')) { const p = s.split('/'); return parseFloat(p[0]) / parseFloat(p[1]); }
  return parseFloat(s);
}
function harfBul(q, bek) { const e = Object.keys(q.siklar).filter(h => yak(deger(q.siklar[h]), bek)); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }

// Bağımsız hesaplanmış olasılıklar (istenen/toplam)
const num = {
  '001': 1 / 6, '002': 1 / 2, '003': 3 / 6, '004': 4 / 10, '005': 4 / 10, '006': 1 / 6,
  '007': 1, '008': 0, '009': 3 / 6, '010': 2 / 10, '011': 2 / 20, '012': 1 / 4,
  '013': 3 / 6, '014': 4 / 12, '015': 3 / 5, '016': 2 / 6, '017': 6 / 36, '018': 6 / 36,
  '019': 3 / 4, '020': 5 / 50, '021': 3 / 4, '022': 6 / 10, '023': 1 / 36, '024': 15 / 30
};
let pass = 0, fail = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const bek = num[id];
  if (bek === undefined) { console.log(id, 'ATLA'); continue; }
  const h = harfBul(q, bek);
  const ok = h === q.dogruCevap;
  if (ok) pass++; else { fail++; console.log(`${q.id} dc=${q.dogruCevap} hesap=${h} bek=${bek.toFixed(4)} FAIL`); }
}
console.log(`SONUC: ${pass} PASS, ${fail} FAIL  (${data.sorular.length} soru)`);
process.exit(fail > 0 ? 1 : 0);
