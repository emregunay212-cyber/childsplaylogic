/* Olasılık — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Beklenen olasılığı favori/toplam'dan kendisi hesaplar, sade kesre indirir; her şıkkı
   de sade kesre indirip tek eşleşeni bulur, dogruCevap ile karşılaştırır.
   Kullanım: node verify-olasilik2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'olasilik.json'), 'utf8'));

const gcd = (a, b) => b ? gcd(b, a % b) : a;
function reduce(n, d) { if (d === 0) return { n: NaN, d: NaN }; const g = gcd(Math.abs(n), Math.abs(d)) || 1; return { n: n / g, d: d / g }; }
// "2/5" -> {n:2,d:5}, "1" -> {1,1}, "0" -> {0,1}
function parseFrac(s) {
  s = String(s).trim();
  let m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return reduce(parseInt(m[1], 10), parseInt(m[2], 10));
  m = s.match(/^(\d+)$/);
  if (m) return reduce(parseInt(m[1], 10), 1);
  return { n: NaN, d: NaN };
}
const eq = (a, b) => a.n === b.n && a.d === b.d;

// id -> { f: favori durum, t: toplam durum }  (bağımsız sayım)
const bek = {
  '025': { f: 1, t: 2 }, '026': { f: 1, t: 6 }, '027': { f: 3, t: 6 }, '028': { f: 2, t: 5 },
  '029': { f: 0, t: 6 }, '030': { f: 6, t: 6 }, '031': { f: 4, t: 8 }, '032': { f: 1, t: 6 },
  '033': { f: 2, t: 6 }, '034': { f: 5, t: 10 }, '035': { f: 4, t: 10 }, '036': { f: 2, t: 6 },
  '037': { f: 4, t: 10 }, '038': { f: 5, t: 10 }, '039': { f: 3, t: 12 }, '040': { f: 7, t: 10 },
  '041': { f: 4, t: 20 }, '042': { f: 3, t: 6 }, '043': { f: 5, t: 20 }, '044': { f: 5, t: 9 },
  '045': { f: 5, t: 15 }, '046': { f: 8, t: 20 }, '047': { f: 4, t: 24 }, '048': { f: 2, t: 6 },
  // --- TUR-2 (049-072) ---
  '049': { f: 1, t: 4 }, '050': { f: 3, t: 4 }, '051': { f: 1, t: 3 }, '052': { f: 1, t: 5 },
  '053': { f: 2, t: 4 }, '054': { f: 4, t: 4 }, '055': { f: 0, t: 5 }, '056': { f: 3, t: 5 },
  '057': { f: 4, t: 6 }, '058': { f: 6, t: 8 }, '059': { f: 3, t: 9 }, '060': { f: 8, t: 12 },
  '061': { f: 5, t: 10 }, '062': { f: 2, t: 10 }, '063': { f: 9, t: 12 }, '064': { f: 6, t: 15 },
  '065': { f: 12, t: 20 }, '066': { f: 10, t: 25 }, '067': { f: 15, t: 20 }, '068': { f: 7, t: 28 },
  '069': { f: 8, t: 24 }, '070': { f: 9, t: 15 }, '071': { f: 16, t: 20 }, '072': { f: 18, t: 24 },
  // --- TUR-3 (073-096) ---
  '073': { f: 1, t: 2 }, '074': { f: 1, t: 6 }, '075': { f: 3, t: 6 }, '076': { f: 2, t: 5 },
  '077': { f: 1, t: 4 }, '078': { f: 0, t: 6 }, '079': { f: 6, t: 6 }, '080': { f: 3, t: 4 },
  '081': { f: 4, t: 10 }, '082': { f: 5, t: 8 }, '083': { f: 6, t: 9 }, '084': { f: 3, t: 12 },
  '085': { f: 8, t: 20 }, '086': { f: 4, t: 20 }, '087': { f: 10, t: 25 }, '088': { f: 9, t: 12 },
  '089': { f: 12, t: 20 }, '090': { f: 15, t: 20 }, '091': { f: 16, t: 24 }, '092': { f: 7, t: 28 },
  '093': { f: 18, t: 30 }, '094': { f: 1, t: 20 }, '095': { f: 6, t: 20 }, '096': { f: 10, t: 25 }
};

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (!b) { atla++; continue; }   // 001-024
  const want = reduce(b.f, b.t);
  const H = Object.keys(q.siklar);
  const esit = H.filter(h => eq(parseFrac(q.siklar[h]), want));
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen=${want.n}/${want.d}`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (${want.n}/${want.d})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
