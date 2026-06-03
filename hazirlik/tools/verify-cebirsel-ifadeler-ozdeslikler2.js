/* Cebirsel İfadeler ve Özdeşlikler — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Her şıkkı x'li polinoma (≤2. derece) ayrıştırıp, sorunun işlemini bağımsız bir JS
   fonksiyonu olarak 7 farklı x değerinde değerlendirir; tüm noktalarda eşleşen tek şıkkı
   bulup dogruCevap ile karşılaştırır. (Sayı-değer soruları 'num' modunda.)
   Kullanım: node verify-cebirsel-ifadeler-ozdeslikler2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'cebirsel-ifadeler-ozdeslikler.json'), 'utf8'));

// "x² + 6x + 9" -> [c0,c1,c2]; '−' ve boşlukları normalize eder
function parsePoly(s) {
  s = String(s).replace(/−/g, '-').replace(/\s+/g, '');
  const terms = s.match(/[+-]?[^+-]+/g) || [];
  const c = [0, 0, 0];
  for (let t of terms) {
    let sign = 1;
    if (t[0] === '+') t = t.slice(1);
    else if (t[0] === '-') { sign = -1; t = t.slice(1); }
    let m;
    if ((m = t.match(/^(\d*)x²$/))) c[2] += sign * (m[1] === '' ? 1 : +m[1]);
    else if ((m = t.match(/^(\d*)x$/))) c[1] += sign * (m[1] === '' ? 1 : +m[1]);
    else if ((m = t.match(/^(\d+)$/))) c[0] += sign * (+m[1]);
    else return null;   // beklenmeyen biçim
  }
  return c;
}
const evalPoly = (c, x) => c[0] + c[1] * x + c[2] * x * x;
const XS = [-3, -2, -1, 0, 1, 2, 3];

// id -> { f: işlemin bağımsız fonksiyonu } veya { num: sabit değer }
const bek = {
  '025': { f: x => 4 * x + 3 * x }, '026': { f: x => 9 * x - 5 * x }, '027': { f: x => 3 * (x + 2) },
  '028': { f: x => x * x }, '029': { f: x => 6 * x + 2 * x }, '030': { f: x => 5 * (x - 1) },
  '031': { f: x => 2 * x + 5 + 3 * x }, '032': { f: x => x * (x + 3) },
  '033': { f: x => (x - 1) * (x + 4) }, '034': { f: x => (x - 2) ** 2 }, '035': { f: x => (x + 6) * (x - 6) },
  '036': { f: x => (x + 1) * (x + 5) }, '037': { f: x => 4 * x * 2 * x }, '038': { f: x => (3 * x + 1) ** 2 },
  '039': { num: 4 * 4 + 2 * 4 }, '040': { f: x => (x - 7) * (x + 7) },
  '041': { f: x => (x + 4) ** 2 }, '042': { f: x => (2 * x - 5) * (2 * x + 5) },
  '043': { f: x => (x + 3) ** 2 - (x - 3) ** 2 }, '044': { f: x => (3 * x + 2) ** 2 },
  '045': { f: x => (x - 6) * (x + 2) }, '046': { num: 3 * 5 + 7 },
  '047': { f: x => (x + 8) * (x - 3) }, '048': { f: x => 4 * (x + 2) + 2 * (x - 5) },
  // --- TUR-2 (049-072) ---
  '049': { f: x => 7 * x + 2 * x }, '050': { f: x => 10 * x - 4 * x }, '051': { f: x => 4 * (x + 3) },
  '052': { f: x => x * (x + 5) }, '053': { f: x => 3 * x + 7 + 2 * x }, '054': { f: x => 8 * x - 3 * x + x },
  '055': { f: x => 2 * (x + 4) + 3 }, '056': { f: x => 6 * (x - 2) },
  '057': { f: x => (x + 5) ** 2 }, '058': { f: x => (x - 4) ** 2 }, '059': { f: x => (x + 7) * (x - 7) },
  '060': { f: x => (x + 2) * (x + 6) }, '061': { f: x => (2 * x + 3) ** 2 }, '062': { f: x => (x - 5) * (x + 3) },
  '063': { f: x => (3 * x - 1) * (3 * x + 1) }, '064': { f: x => (x + 9) * (x - 2) },
  '065': { f: x => (x + 4) ** 2 - (x - 4) ** 2 }, '066': { num: (3 + 2) ** 2 },
  '067': { f: x => 2 * (3 * x + 1) + 4 * x }, '068': { f: x => (2 * x + 3) * (x - 1) },
  '069': { num: 5 }, '070': { num: 6 },
  '071': { f: x => 3 * (2 * x - 1) - (x - 4) }, '072': { f: x => (x + 1) ** 2 + (x - 1) ** 2 },
  // --- TUR-3 (073-096) ---
  '073': { f: x => 5 * x + 4 * x }, '074': { f: x => 8 * x - 3 * x }, '075': { f: x => 3 * (x + 2) },
  '076': { f: x => x * (x + 4) }, '077': { f: x => 2 * x + 3 + 4 * x }, '078': { f: x => 5 * (x - 1) },
  '079': { f: x => x * (x - 6) }, '080': { f: x => 7 * x - 2 * x + x },
  '081': { f: x => (x + 5) ** 2 }, '082': { f: x => (x - 3) ** 2 }, '083': { f: x => (x + 4) * (x - 4) },
  '084': { f: x => (x + 2) * (x + 7) }, '085': { f: x => (2 * x + 1) ** 2 }, '086': { f: x => (x - 6) * (x + 2) },
  '087': { f: x => (3 * x - 2) * (3 * x + 2) }, '088': { f: x => 2 * (x + 3) + 3 * (x - 1) },
  '089': { f: x => (x + 3) ** 2 - (x - 3) ** 2 }, '090': { num: 7 * 7 - 3 * 3 },
  '091': { f: x => (x - 5) * (x + 4) }, '092': { f: x => (x + 1) ** 2 + (x + 2) },
  '093': { num: 21 * 21 - 19 * 19 }, '094': { f: x => 3 * (2 * x + 1) - (x - 2) },
  '095': { f: x => (2 * x - 3) ** 2 }, '096': { num: 2 * 4 * 4 + 3 * 4 }
};
const pnum = s => parseInt(String(s).replace(/[^0-9-]/g, ''), 10);

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (!b) { atla++; continue; }   // 001-024
  const H = Object.keys(q.siklar);
  let esit;
  if (b.num !== undefined) {
    esit = H.filter(h => pnum(q.siklar[h]) === b.num);
  } else {
    esit = H.filter(h => { const c = parsePoly(q.siklar[h]); return c && XS.every(x => evalPoly(c, x) === b.f(x)); });
  }
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}]`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]}`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
