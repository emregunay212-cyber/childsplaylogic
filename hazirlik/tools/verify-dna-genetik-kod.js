/* DNA ve Genetik Kod — hesaplanabilir alt küme (baz eşleşmesi A-T/G-C + Chargaff kuralı)
   BAĞIMSIZ hesaplanır ve cevap anahtarıyla karşılaştırılır. Kavramsal sorular bu script'te
   ATLANIR (onları verify-yapisal.js denetler). Kullanım: node verify-dna-genetik-kod.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'dna-genetik-kod.json'), 'utf8'));

// --- bağımsız kurallar ---
const es = { A: 'T', T: 'A', G: 'C', C: 'G' };           // baz eşleşmesi
const komp = s => s.toUpperCase().replace(/[^ATGC]/g, '').split('').map(b => es[b]).join('');
const ad = { A: 'adenin', T: 'timin', G: 'guanin', C: 'sitozin' }; // harf -> baz adı

// her hesaplanabilir soru için beklenen cevap (bağımsız hesapla)
const bek = {
  '004': { tip: 'metin', v: ad[es['A']] },                 // A -> timin
  '005': { tip: 'metin', v: ad[es['G']] },                 // G -> sitozin
  '007': { tip: 'metin', v: ad[es['A']] },                 // A karşısı -> timin
  '009': { tip: 'diz', v: komp('AGCT') },                  // -> TCGA
  '010': { tip: 'sayi', v: 30 },                           // T = A = 30
  '013': { tip: 'diz', v: komp('GGAT') },                  // -> CCTA
  '014': { tip: 'sayi', v: 40 },                           // C = G = 40
  '017': { tip: 'sayi', v: 5 },                            // karşı T = orijinal A = 5
  '018': { tip: 'sayi', v: (200 - 2 * 60) / 2 },           // G = (toplam - 2A)/2 = 40
  '019': { tip: 'diz', v: komp('TACGG') },                 // -> ATGCC
  '021': { tip: 'sayi', v: (100 - 2 * 30) / 2 },           // G% = (100 - 2A%)/2 = 20
  '022': { tip: 'sayi', v: 8 }                             // karşı G = orijinal C = 8
};

const yak = (a, b) => Math.abs(a - b) < 1e-9;
const pnum = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
const norm = s => String(s).toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
const diz = s => String(s).toUpperCase().replace(/[^ATGC]/g, '');

function harfBul(q, b) {
  const e = Object.keys(q.siklar).filter(h => {
    const c = q.siklar[h];
    if (b.tip === 'sayi') return yak(pnum(c), b.v);
    if (b.tip === 'diz') return diz(c) === b.v;
    return norm(c) === b.v;            // metin
  });
  return e.length === 1 ? e[0] : '?[' + e.join('') + ']';
}

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (!b) { atla++; continue; }       // kavramsal — verify-yapisal denetler
  const h = harfBul(q, b);
  const ok = h === q.dogruCevap;
  if (ok) pass++;
  else { fail++; console.log(`${q.id} dc=${q.dogruCevap} hesap=${h} bek=${b.v} (${b.tip}) FAIL`); }
}
console.log(`HESAPLANABİLİR SONUC: ${pass} PASS, ${fail} FAIL, ${atla} kavramsal-atlandı  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
