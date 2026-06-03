/* Eşitsizlikler — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Her eşitsizliği bir koşul fonksiyonu p(x) olarak kodlar; tam sayıları [-500,500]
   tarayıp çözüm kümesini bulur, sorunun istediği uca göre (max=en büyük, min=en küçük)
   beklenen tam sayıyı hesaplar, tek eşleşen şıkkı dogruCevap ile karşılaştırır.
   Kullanım: node verify-esitsizlikler2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'esitsizlikler.json'), 'utf8'));

// id -> { p: koşul, ask: 'max' | 'min' }
const ineq = {
  '025': { p: x => x + 2 < 6, ask: 'max' }, '026': { p: x => x - 1 > 4, ask: 'min' },
  '027': { p: x => 2 * x <= 10, ask: 'max' }, '028': { p: x => x + 4 >= 9, ask: 'min' },
  '029': { p: x => x - 3 < 2, ask: 'max' }, '030': { p: x => 3 * x >= 12, ask: 'min' },
  '031': { p: x => x + 6 <= 10, ask: 'max' }, '032': { p: x => x - 5 > 0, ask: 'min' },
  '033': { p: x => 2 * x + 1 < 9, ask: 'max' }, '034': { p: x => 3 * x - 2 >= 7, ask: 'min' },
  '035': { p: x => 4 * x + 3 <= 19, ask: 'max' }, '036': { p: x => 5 * x - 4 > 11, ask: 'min' },
  '037': { p: x => 2 * x + 5 <= 13, ask: 'max' }, '038': { p: x => 3 * x + 1 > 10, ask: 'min' },
  '039': { p: x => 6 * x - 5 < 19, ask: 'max' }, '040': { p: x => 4 * x + 2 >= 14, ask: 'min' },
  '041': { p: x => -x < 2, ask: 'min' }, '042': { p: x => -2 * x > 6, ask: 'max' },
  '043': { p: x => -x + 1 <= 4, ask: 'min' }, '044': { p: x => 5 - x > 1, ask: 'max' },
  '045': { p: x => -3 * x >= 9, ask: 'max' }, '046': { p: x => 2 * x + 3 < x + 7, ask: 'max' },
  '047': { p: x => 3 * x - 1 >= x + 5, ask: 'min' }, '048': { p: x => 7 - 2 * x >= 1, ask: 'max' },
  // --- TUR-2 (049-072) ---
  '049': { p: x => x + 3 < 8, ask: 'max' }, '050': { p: x => x - 2 > 7, ask: 'min' },
  '051': { p: x => 2 * x <= 14, ask: 'max' }, '052': { p: x => x + 6 >= 10, ask: 'min' },
  '053': { p: x => x - 1 < 6, ask: 'max' }, '054': { p: x => 3 * x > 12, ask: 'min' },
  '055': { p: x => x + 8 <= 11, ask: 'max' }, '056': { p: x => x - 6 > 0, ask: 'min' },
  '057': { p: x => 2 * x + 1 < 11, ask: 'max' }, '058': { p: x => 3 * x - 2 >= 10, ask: 'min' },
  '059': { p: x => 4 * x + 3 <= 23, ask: 'max' }, '060': { p: x => 5 * x - 4 > 16, ask: 'min' },
  '061': { p: x => 2 * x + 7 <= 15, ask: 'max' }, '062': { p: x => 3 * x + 1 > 13, ask: 'min' },
  '063': { p: x => 6 * x - 5 < 25, ask: 'max' }, '064': { p: x => 4 * x + 2 >= 22, ask: 'min' },
  '065': { p: x => -x < 3, ask: 'min' }, '066': { p: x => -2 * x > 8, ask: 'max' },
  '067': { p: x => 5 - x >= 1, ask: 'max' }, '068': { p: x => -3 * x <= 9, ask: 'min' },
  '069': { p: x => 2 * x + 5 < x + 9, ask: 'max' }, '070': { p: x => 3 * x - 1 >= x + 7, ask: 'min' },
  '071': { p: x => 9 - 2 * x >= 1, ask: 'max' }, '072': { p: x => 4 * x + 3 < 2 * x + 13, ask: 'max' },
  // --- TUR-3 (073-096) ---
  '073': { p: x => x + 4 < 9, ask: 'max' }, '074': { p: x => x - 3 > 5, ask: 'min' },
  '075': { p: x => 2 * x <= 16, ask: 'max' }, '076': { p: x => x + 5 >= 12, ask: 'min' },
  '077': { p: x => x - 2 < 3, ask: 'max' }, '078': { p: x => 4 * x > 20, ask: 'min' },
  '079': { p: x => x + 7 <= 10, ask: 'max' }, '080': { p: x => x - 4 > 0, ask: 'min' },
  '081': { p: x => 2 * x + 3 < 13, ask: 'max' }, '082': { p: x => 3 * x - 1 >= 11, ask: 'min' },
  '083': { p: x => 5 * x + 2 <= 27, ask: 'max' }, '084': { p: x => 4 * x - 5 > 15, ask: 'min' },
  '085': { p: x => 2 * x + 9 <= 17, ask: 'max' }, '086': { p: x => 3 * x + 4 > 19, ask: 'min' },
  '087': { p: x => 6 * x - 7 <= 17, ask: 'max' }, '088': { p: x => 5 * x + 6 >= 31, ask: 'min' },
  '089': { p: x => -x < 4, ask: 'min' }, '090': { p: x => -2 * x > 10, ask: 'max' },
  '091': { p: x => 7 - x >= 2, ask: 'max' }, '092': { p: x => 3 * x + 2 < x + 10, ask: 'max' },
  '093': { p: x => 5 * x - 3 >= 2 * x + 9, ask: 'min' }, '094': { p: x => -4 * x <= 12, ask: 'min' },
  '095': { p: x => 4 * x - 1 < 2 * x + 9, ask: 'max' }, '096': { p: x => 6 * x + 5 >= 3 * x + 20, ask: 'min' }
};

function uc(p, ask) {
  const sat = [];
  for (let x = -500; x <= 500; x++) if (p(x)) sat.push(x);
  if (!sat.length) return null;
  return ask === 'max' ? Math.max(...sat) : Math.min(...sat);
}
const pnum = s => parseInt(String(s).replace(/−/g, '-').replace(/[^0-9-]/g, ''), 10);

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const it = ineq[id];
  if (!it) { atla++; continue; }   // 001-024
  const v = uc(it.p, it.ask);
  let durum;
  if (v === null) durum = 'çözüm yok / sınırsız';
  else {
    const H = Object.keys(q.siklar);
    const esit = H.filter(h => pnum(q.siklar[h]) === v);
    if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen=${v}`;
    else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama ${it.ask}=${v}=${esit[0]}`;
    else durum = 'ok';
  }
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
