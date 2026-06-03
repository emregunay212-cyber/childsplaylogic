/* Madde ve Endüstri — hesaplanabilir alt küme (atom yapısı: proton/nötron/elektron sayıları)
   BAĞIMSIZ hesaplanıp cevap anahtarıyla karşılaştırılır. Kavramsal sorular ATLANIR
   (verify-yapisal.js denetler). Kullanım: node verify-madde-endustri.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'madde-endustri.json'), 'utf8'));

// --- bağımsız kurallar ---
const proton = atomNo => atomNo;                     // atom numarası = proton
const elektron = atomNo => atomNo;                   // nötr atomda elektron = proton
const notron = (kutle, atomNo) => kutle - atomNo;    // nötron = kütle - atom no
const kutle = (p, n) => p + n;                       // kütle = proton + nötron

const bek = {
  '003': proton(6), '004': elektron(8), '006': proton(11),
  '009': notron(23, 11), '010': elektron(17), '012': 16 - 8 /* proton = kütle - nötron */,
  '014': notron(24, 12), '017': notron(39, 19), '018': kutle(17, 18),
  '020': elektron(20) /* atom no = elektron */, '022': notron(40, 20)
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
