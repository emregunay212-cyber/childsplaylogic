/* Enerji Dönüşümleri — DERİNLEŞTİRME seti (025-048) HESAPLI doğrulama.
   Potansiyel enerji Ep=m·g·h ve kinetik enerji Ek=½·m·v² (g=10 N/kg) ile bunların ters
   problemlerini (h=Ep/(mg), m=Ep/(gh), v=√(2Ek/m)) kendisi hesaplar. 0,5 tolerans.
   Kullanım: node verify-enerji-donusumleri2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'enerji-donusumleri.json'), 'utf8'));

const G = 10;
const ep = (m, h) => m * G * h;
const ek = (m, v) => 0.5 * m * v * v;
const hEp = (Ep, m) => Ep / (m * G);
const mEp = (Ep, h) => Ep / (G * h);
const vEk = (Ek, m) => Math.sqrt(2 * Ek / m);

const bek = {
  '025': ep(2, 5), '026': ep(3, 4), '027': ek(2, 3), '028': ep(4, 2),
  '029': ep(5, 2), '030': ek(4, 5), '031': ek(2, 10), '032': ep(6, 3),
  '033': ep(10, 2), '034': ek(6, 2), '035': ek(10, 6), '036': ep(1, 10),
  '037': ek(3, 4), '038': hEp(200, 4), '039': ep(8, 5), '040': ek(2, 6),
  '041': ek(5, 4), '042': mEp(300, 6), '043': ep(2, 15), '044': ek(4, 10),
  '045': ep(3, 10), '046': vEk(100, 2), '047': ek(8, 5), '048': ep(5, 8),
  // --- TUR-2 (049-072) ---
  '049': ep(3, 5), '050': ep(4, 3), '051': ek(2, 4), '052': ep(5, 4),
  '053': ep(2, 7), '054': ek(4, 3), '055': ep(6, 5), '056': ek(2, 6),
  '057': ep(10, 3), '058': ek(6, 4), '059': ep(8, 4), '060': ek(4, 5),
  '061': ep(7, 4), '062': ek(2, 8), '063': ep(9, 2), '064': ek(10, 2),
  '065': hEp(300, 6), '066': mEp(400, 5), '067': vEk(100, 2), '068': ep(6, 8),
  '069': ek(3, 4), '070': hEp(500, 10), '071': vEk(90, 5), '072': mEp(360, 4),
  // --- TUR-3 (073-096) ---
  '073': ep(2, 6), '074': ep(3, 6), '075': ek(2, 5), '076': ep(4, 5),
  '077': ek(2, 7), '078': ep(5, 6), '079': ek(2, 9), '080': ep(6, 4),
  '081': ek(4, 4), '082': ep(8, 3), '083': ek(6, 3), '084': ep(7, 2),
  '085': ek(8, 2), '086': ep(2, 20), '087': ek(5, 2), '088': ek(3, 2),
  '089': hEp(400, 8), '090': mEp(600, 3), '091': vEk(64, 2), '092': vEk(225, 2),
  '093': hEp(300, 2), '094': mEp(800, 4), '095': ek(10, 4), '096': vEk(36, 8)
};

const pnum = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10);

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const v = bek[id];
  if (v === undefined) { atla++; continue; }   // 001-024
  const H = Object.keys(q.siklar);
  const esit = H.filter(h => Math.abs(pnum(q.siklar[h]) - v) < 0.5);
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen≈${Math.round(v)}`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (≈${Math.round(v)})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
