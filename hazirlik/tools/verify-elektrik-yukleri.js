/* Elektrik Yükleri ve Elektrik Enerjisi — hesaplanabilir alt küme (P=V·I, E=P·t=V·I·t ve
   ters çözümler) BAĞIMSIZ hesaplanır. Kavramsal sorular ATLANIR (verify-yapisal.js denetler).
   Kullanım: node verify-elektrik-yukleri.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'elektrik-yukleri.json'), 'utf8'));

const P = (V, I) => V * I;
const E_Pt = (P, t) => P * t;
const E_VIt = (V, I, t) => V * I * t;
const I_PV = (P, V) => P / V;
const t_EP = (E, P) => E / P;

const bek = {
  '004': P(10, 2), '007': P(12, 3), '009': P(220, 5),
  '011': E_Pt(100, 10), '013': E_Pt(60, 5), '015': P(6, 4),
  '017': I_PV(200, 20), '018': E_VIt(10, 2, 5), '020': t_EP(600, 60),
  '021': I_PV(440, 220), '023': E_VIt(12, 5, 2)
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
