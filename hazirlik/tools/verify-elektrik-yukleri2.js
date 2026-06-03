/* Elektrik Yükleri — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Ohm yasası V=I·R, I=V/R, R=V/I ile seri (toplam) ve paralel ((R1·R2)/(R1+R2))
   eşdeğer direnç hesaplarını kendisi yapar. 0,5 tolerans. Tek eşleşeni dc ile karşılaştırır.
   Kullanım: node verify-elektrik-yukleri2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'elektrik-yukleri.json'), 'utf8'));

const V = (I, R) => I * R;
const I = (V, R) => V / R;
const R = (V, I) => V / I;
const seri = (...rs) => rs.reduce((s, r) => s + r, 0);
const paralel = (r1, r2) => (r1 * r2) / (r1 + r2);

const bek = {
  '025': V(2, 5), '026': I(12, 4), '027': R(20, 4), '028': V(3, 6),
  '029': V(5, 2), '030': I(24, 6), '031': R(30, 5), '032': V(4, 5),
  '033': seri(3, 5), '034': seri(10, 20, 30), '035': paralel(6, 6), '036': I(12, 3),
  '037': V(2, seri(4, 8)), '038': paralel(10, 10), '039': V(6, 3), '040': R(40, 8),
  '041': I(24, seri(5, 7)), '042': paralel(6, 3), '043': I(20, seri(2, 3, 5)), '044': I(60, 12),
  '045': R(16, 4), '046': paralel(8, 8), '047': I(45, seri(9, 6)), '048': V(2, seri(4, 6)),
  // --- TUR-2 (049-072) ---
  '049': V(3, 4), '050': I(20, 5), '051': R(24, 3), '052': V(2, 9),
  '053': I(36, 9), '054': R(40, 5), '055': V(5, 4), '056': seri(4, 6),
  '057': seri(10, 15, 5), '058': paralel(4, 4), '059': I(48, 6), '060': V(4, seri(3, 5)),
  '061': paralel(6, 12), '062': I(60, seri(5, 7)), '063': R(54, 6), '064': seri(8, 12, 10),
  '065': V(6, seri(2, 4, 6)), '066': paralel(10, 15), '067': I(48, seri(4, 2, 6)), '068': R(72, 8),
  '069': paralel(20, 20), '070': V(5, seri(3, 9)), '071': I(90, seri(6, 9)), '072': paralel(12, 6),
  // --- TUR-3 (073-096) ---
  '073': V(3, 5), '074': I(18, 3), '075': R(36, 4), '076': V(4, 4),
  '077': I(20, 4), '078': seri(5, 7), '079': R(45, 5), '080': V(6, 4),
  '081': paralel(12, 12), '082': I(48, seri(5, 3)), '083': R(56, 7), '084': paralel(12, 4),
  '085': V(3, seri(2, 5)), '086': I(54, seri(4, 5)), '087': R(63, 9), '088': paralel(9, 18),
  '089': V(2, seri(4, 5, 6)), '090': I(72, seri(3, 4, 5)), '091': paralel(8, 24), '092': I(100, seri(6, 4, 10)),
  '093': paralel(30, 20), '094': V(4, seri(2, 3, 5)), '095': paralel(12, 24), '096': R(96, 8)
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
