/* Üçgenler — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   İç açılar toplamı / Pisagor / alan / ikizkenar-eşkenar / dış açı formüllerini kendisi
   hesaplar, tek eşleşen şıkkı dogruCevap ile karşılaştırır.
   Kullanım: node verify-ucgenler2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'ucgenler.json'), 'utf8'));

const acuc = (a, b) => 180 - a - b;                       // üçüncü açı
const hyp = (a, b) => Math.sqrt(a * a + b * b);           // hipotenüs
const leg = (h, l) => Math.sqrt(h * h - l * l);           // eksik dik kenar
const alan = (b, h) => b * h / 2;
const iso = ap => (180 - ap) / 2;                          // ikizkenar taban açısı (tepe verilince)
const xsum = (coeffs, idx) => (180 / coeffs.reduce((s, c) => s + c, 0)) * (idx === undefined ? 1 : coeffs[idx]);

const bek = {
  '025': acuc(60, 70), '026': acuc(90, 30), '027': hyp(3, 4), '028': 180 / 3,
  '029': acuc(45, 45), '030': alan(10, 6), '031': hyp(6, 8), '032': 50,
  '033': acuc(55, 65), '034': leg(13, 5), '035': alan(12, 5), '036': iso(40),
  '037': hyp(5, 12), '038': 50 + 60, '039': xsum([2, 3, 4]), '040': 30 - (10 + 8),
  '041': hyp(8, 15), '042': leg(20, 12), '043': xsum([1, 2, 3], 2), '044': iso(90),
  '045': 120 - 70, '046': 2 * 49 / 14, '047': hyp(9, 12), '048': 24 / 3,
  // --- TUR-2 (049-072) ---
  '049': acuc(50, 60), '050': hyp(20, 21), '051': alan(8, 5), '052': 180 / 3,
  '053': acuc(90, 45), '054': alan(10, 4), '055': iso(80), '056': acuc(40, 75),
  '057': hyp(7, 24), '058': leg(10, 8), '059': iso(50), '060': alan(14, 6),
  '061': acuc(33, 57), '062': leg(26, 24), '063': 55 + 72, '064': xsum([1, 2, 2], 2),
  '065': hyp(9, 40), '066': leg(17, 15), '067': alan(9, 12), '068': 14,
  '069': 180 - 70 - 70, '070': 130 - 60, '071': hyp(12, 16), '072': alan(16, 9),
  // --- TUR-3 (073-096) ---
  '073': acuc(70, 60), '074': acuc(80, 55), '075': alan(12, 6), '076': iso(40),
  '077': acuc(100, 30), '078': alan(10, 8), '079': 180 / 3, '080': iso(100),
  '081': hyp(9, 12), '082': leg(15, 9), '083': hyp(8, 15), '084': alan(18, 6),
  '085': leg(10, 6), '086': acuc(48, 62), '087': xsum([2, 3, 4], 2), '088': hyp(5, 12),
  '089': leg(13, 12), '090': xsum([1, 2, 3], 2), '091': 130 - 60, '092': 2 * 48 / 12,
  '093': hyp(20, 15), '094': 180 - 2 * 65, '095': leg(25, 24), '096': alan(15, 8)
};

const pnum = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10);

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const v = bek[id];
  if (v === undefined) { atla++; continue; }   // 001-024
  const H = Object.keys(q.siklar);
  const esit = H.filter(h => pnum(q.siklar[h]) === v);
  let durum;
  if (!Number.isInteger(v)) durum = `beklenen tam sayı değil (${v})`;
  else if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen=${v}`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (${v})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
