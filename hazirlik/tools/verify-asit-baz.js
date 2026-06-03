/* Asitler ve Bazlar — hesaplanabilir alt küme (pH sınıflandırma: <7 asidik, =7 nötr, >7 bazik;
   en asidik = en küçük pH, en bazik = en büyük pH) BAĞIMSIZ hesaplanır. Kavramsal sorular
   ATLANIR (verify-yapisal.js denetler). Kullanım: node verify-asit-baz.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'asit-baz.json'), 'utf8'));

// --- bağımsız kurallar ---
const sinifla = pH => pH < 7 ? 'asidik' : (pH === 7 ? 'notr' : 'bazik');

const bek = {
  '003': { tip: 'sinif', v: sinifla(3) },
  '004': { tip: 'sinif', v: sinifla(7) },
  '006': { tip: 'sinif', v: sinifla(11) },
  '009': { tip: 'sayi', v: 7 },                              // nötr nokta
  '010': { tip: 'sayi', v: Math.min(2, 5, 9, 12) },          // en asidik
  '012': { tip: 'sinif', v: sinifla(6) },
  '014': { tip: 'sayi', v: Math.max(4, 8, 10, 13) },         // en bazik
  '016': { tip: 'sinif', v: sinifla(8) },
  '019': { tip: 'sayi', v: Math.min(1, 6) },                 // daha kuvvetli asit
  '020': { tip: 'sayi', v: 7 },                              // nötrleşme sonucu
  '021': { tip: 'sayi', v: Math.max(5, 9) }                  // bazik olan
};

const yak = (a, b) => Math.abs(a - b) < 1e-9;
const pnum = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
// diakritikleri sadeleştir + küçük harf (Nötr -> notr)
const norm = s => String(s).toLocaleLowerCase('tr')
  .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
  .replace(/\s+/g, ' ').trim();

function harfBul(q, b) {
  const e = Object.keys(q.siklar).filter(h => {
    const c = q.siklar[h];
    if (b.tip === 'sayi') return yak(pnum(c), b.v);
    return norm(c) === b.v;       // sinif: birebir eşleşme
  });
  return e.length === 1 ? e[0] : '?[' + e.join('') + ']';
}

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (!b) { atla++; continue; }
  const h = harfBul(q, b);
  const ok = h === q.dogruCevap;
  if (ok) pass++;
  else { fail++; console.log(`${q.id} dc=${q.dogruCevap} hesap=${h} bek=${b.v} (${b.tip}) FAIL`); }
}
console.log(`HESAPLANABİLİR SONUC: ${pass} PASS, ${fail} FAIL, ${atla} kavramsal-atlandı  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
