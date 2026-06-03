/* Basınç (24 soru) — katı basıncı (P=F/A, F=P·A, A=F/P) ve sıvı basıncını (P=h·d·g)
   BAĞIMSIZ hesaplayıp cevap anahtarıyla karşılaştırır + şık çakışmasını denetler.
   Kullanım: node verify-basinc.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'basinc.json'), 'utf8'));

const P = (F, A) => F / A;        // katı basıncı
const F = (P, A) => P * A;        // kuvvet
const A = (F, P) => F / P;        // alan
const Psivi = (h, d, g) => h * d * g;

const bek = {
  '001': P(100, 5), '002': P(60, 2), '003': P(200, 4), '004': P(80, 8),
  '005': P(45, 9), '006': P(72, 8), '007': P(150, 3), '008': P(36, 6),
  '009': F(20, 3), '010': F(50, 2), '011': A(240, 40), '012': A(100, 25),
  '013': Psivi(2, 1000, 10), '014': Psivi(5, 1000, 10), '015': P(150, 5), '016': F(8, 10),
  '017': P(300, 0.5), '018': Psivi(3, 1200, 10), '019': A(400, 80), '020': P(120, 2 * 3),
  '021': Psivi(4, 1000, 10), '022': P(500, 25), '023': Psivi(10, 1000, 10), '024': P(360, 0.6)
};

const yak = (a, b) => Math.abs(a - b) < 1e-6;
const pnum = s => parseFloat(String(s).replace(/[−–]/g, '-').replace('.', '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
function harfBul(q, b) { const e = Object.keys(q.siklar).filter(h => yak(pnum(q.siklar[h]), b)); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }

let pass = 0, fail = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (b === undefined) { console.log(id, 'ATLA — beklenen yok'); fail++; continue; }
  const harfler = Object.keys(q.siklar);
  const vals = harfler.map(h => pnum(q.siklar[h]));
  let cakisma = '';
  for (let i = 0; i < vals.length; i++)
    for (let j = i + 1; j < vals.length; j++)
      if (yak(vals[i], vals[j])) cakisma += `${harfler[i]}=${harfler[j]} `;
  const h = harfBul(q, b);
  const ok = h === q.dogruCevap && !cakisma;
  if (ok) pass++;
  else { fail++; console.log(`${q.id} dc=${q.dogruCevap} hesap=${h} bek=${b} ${cakisma ? 'CAKISMA:' + cakisma : ''} FAIL`); }
}
console.log(`SONUC: ${pass} PASS, ${fail} FAIL  (${data.sorular.length} soru)`);
process.exit(fail > 0 ? 1 : 0);
