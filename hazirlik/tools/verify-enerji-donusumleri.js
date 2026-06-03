/* Enerji Dönüşümleri — hesaplanabilir alt küme (Ep=m·g·h, Ek=½·m·v² ve ters çözümleri)
   BAĞIMSIZ hesaplanır. Kavramsal sorular ATLANIR (verify-yapisal.js denetler).
   Kullanım: node verify-enerji-donusumleri.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'enerji-donusumleri.json'), 'utf8'));

const g = 10;
const Ep = (m, h) => m * g * h;
const Ek = (m, v) => 0.5 * m * v * v;
const hFromEp = (E, m) => E / (m * g);
const vFromEk = (E, m) => Math.sqrt(2 * E / m);

const bek = {
  '003': Ep(2, 5), '005': Ek(2, 2), '007': Ep(3, 2), '009': Ep(5, 4),
  '010': Ek(4, 3), '012': Ep(10, 3), '014': Ek(6, 2), '016': Ep(1, 10),
  '017': Ek(2, 5), '018': hFromEp(240, 4), '020': vFromEk(50, 4), '021': Ep(2, 6), '023': Ek(10, 4)
};

const yak = (a, b) => Math.abs(a - b) < 1e-9;
const pnum = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
function harfBul(q, b) { const e = Object.keys(q.siklar).filter(h => yak(pnum(q.siklar[h]), b)); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (b === undefined) { atla++; continue; }
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
console.log(`HESAPLANABİLİR SONUC: ${pass} PASS, ${fail} FAIL, ${atla} kavramsal-atlandı  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
