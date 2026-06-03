/* Doğrusal Denklemler — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Her denklemi sol (L) ve sağ (R) fonksiyon olarak kodlar; L(x)=R(x) sağlayan tam sayıyı
   [-200,200] aralığında kendisi tarayarak bulur, tek eşleşen şıkkı dogruCevap ile karşılaştırır.
   Kullanım: node verify-dogrusal-denklemler2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'dogrusal-denklemler.json'), 'utf8'));

// id -> { L, R } : denklemin iki tarafı
const denk = {
  '025': { L: x => x + 5, R: () => 12 }, '026': { L: x => x - 3, R: () => 8 },
  '027': { L: x => 2 * x, R: () => 14 }, '028': { L: x => x / 3, R: () => 4 },
  '029': { L: x => 3 * x, R: () => 21 }, '030': { L: x => x + 9, R: () => 15 },
  '031': { L: x => 4 * x, R: () => 20 }, '032': { L: x => x - 7, R: () => 0 },
  '033': { L: x => 2 * x + 3, R: () => 11 }, '034': { L: x => 3 * x - 5, R: () => 16 },
  '035': { L: x => 5 * x + 2, R: () => 27 }, '036': { L: x => 4 * x - 9, R: () => 7 },
  '037': { L: x => 2 * (x + 3), R: () => 16 }, '038': { L: x => 6 * x + 4, R: x => 2 * x + 20 },
  '039': { L: x => 3 * x - 2, R: x => x + 8 }, '040': { L: x => 7 * x, R: x => 3 * x + 28 },
  '041': { L: x => 5 * x - 3, R: x => 2 * x + 12 }, '042': { L: x => 4 * (x - 1), R: x => 2 * x + 6 },
  '043': { L: x => x / 2 + 3, R: () => 7 }, '044': { L: x => 3 * x + 7, R: x => 5 * x - 5 },
  '045': { L: x => 2 * x - 4, R: x => 11 - x }, '046': { L: x => 6 * (x - 2), R: x => 3 * x + 9 },
  '047': { L: x => 8 * x - 5, R: x => 5 * x + 13 }, '048': { L: x => 3 * x + 4, R: () => 25 },
  // --- TUR-2 (049-072) ---
  '049': { L: x => x + 8, R: () => 15 }, '050': { L: x => x - 6, R: () => 10 },
  '051': { L: x => 5 * x, R: () => 45 }, '052': { L: x => x / 4, R: () => 3 },
  '053': { L: x => x + 11, R: () => 20 }, '054': { L: x => 7 * x, R: () => 56 },
  '055': { L: x => x - 10, R: () => 5 }, '056': { L: x => x / 5, R: () => 4 },
  '057': { L: x => 2 * x + 3, R: () => 17 }, '058': { L: x => 3 * x - 4, R: () => 20 },
  '059': { L: x => 4 * x + 5, R: () => 33 }, '060': { L: x => 5 * x - 6, R: () => 39 },
  '061': { L: x => 2 * (x + 4), R: () => 26 }, '062': { L: x => 6 * x + 5, R: x => 2 * x + 25 },
  '063': { L: x => 5 * x - 3, R: x => 2 * x + 18 }, '064': { L: x => 3 * (x - 2), R: x => x + 12 },
  '065': { L: x => 4 * x + 7, R: x => 6 * x - 5 }, '066': { L: x => 2 * x - 9, R: x => 11 - 3 * x },
  '067': { L: x => 7 * (x - 1), R: x => 4 * x + 11 }, '068': { L: x => x / 2 + 5, R: () => 9 },
  '069': { L: x => 5 * x + 12, R: x => 2 * x }, '070': { L: x => 3 * x - 4, R: x => 8 * x + 11 },
  '071': { L: x => 6 * (x + 2), R: x => 4 * x + 2 }, '072': { L: x => 10 - 2 * x, R: x => x - 5 },
  // --- TUR-3 (073-096) ---
  '073': { L: x => x + 6, R: () => 14 }, '074': { L: x => x - 5, R: () => 11 },
  '075': { L: x => 4 * x, R: () => 36 }, '076': { L: x => x / 3, R: () => 6 },
  '077': { L: x => 3 * x + 2, R: () => 20 }, '078': { L: x => x + 15, R: () => 23 },
  '079': { L: x => 6 * x, R: () => 42 }, '080': { L: x => x - 12, R: () => 0 },
  '081': { L: x => 5 * x - 7, R: () => 18 }, '082': { L: x => 2 * x + 9, R: () => 21 },
  '083': { L: x => 3 * (x + 1), R: () => 27 }, '084': { L: x => 7 * x + 2, R: x => 3 * x + 22 },
  '085': { L: x => 6 * x - 4, R: x => 2 * x + 16 }, '086': { L: x => 4 * x - 1, R: x => 2 * x + 13 },
  '087': { L: x => 9 * x, R: x => 5 * x + 24 }, '088': { L: x => 5 * (x - 1), R: x => 3 * x + 7 },
  '089': { L: x => 4 * x + 15, R: x => x }, '090': { L: x => 3 * x - 7, R: x => 13 - 2 * x },
  '091': { L: x => 5 * (x + 1), R: x => 3 * x - 5 }, '092': { L: x => 12 - 3 * x, R: x => x - 8 },
  '093': { L: x => 9 * x - 4, R: x => 6 * x + 14 }, '094': { L: x => 5 * x + 9, R: x => 8 * x - 6 },
  '095': { L: x => x / 3 + 4, R: () => 10 }, '096': { L: x => 6 * (x - 2), R: x => 4 * x + 2 }
};

function solve(L, R) {
  const sols = [];
  for (let x = -200; x <= 200; x++) if (Math.abs(L(x) - R(x)) < 1e-9) sols.push(x);
  return sols;   // tek tam sayı çözüm beklenir
}
const pnum = s => parseInt(String(s).replace(/−/g, '-').replace(/[^0-9-]/g, ''), 10);

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const d = denk[id];
  if (!d) { atla++; continue; }   // 001-024
  const sols = solve(d.L, d.R);
  let durum;
  if (sols.length !== 1) { durum = `tek tam çözüm yok [${sols.join(',')}]`; }
  else {
    const v = sols[0];
    const H = Object.keys(q.siklar);
    const esit = H.filter(h => pnum(q.siklar[h]) === v);
    if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] x=${v}`;
    else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama x=${v}=${esit[0]}`;
    else durum = 'ok';
  }
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
