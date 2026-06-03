/* Basınç — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Katı basınç P=F/A, sıvı basıncı P=h·d·g ve bunların ters problemlerini (F=P·A,
   A=F/P, h=P/(d·g), d=P/(h·g)) kendisi hesaplar. Kayan nokta bölmeleri (800/0,2 vb.)
   için 0,5 tolerans. Tek eşleşen şıkkı dogruCevap ile karşılaştırır.
   Kullanım: node verify-basinc2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'basinc.json'), 'utf8'));

const katiP = (F, A) => F / A;
const kuvvet = (P, A) => P * A;
const alan = (F, P) => F / P;
const siviP = (h, d, g) => h * d * g;
const derinlik = (P, d, g) => P / (d * g);
const yogunluk = (P, h, g) => P / (h * g);

const bek = {
  '025': katiP(100, 5), '026': katiP(200, 4), '027': katiP(60, 3), '028': katiP(90, 9),
  '029': katiP(120, 6), '030': katiP(150, 5), '031': katiP(80, 2), '032': katiP(240, 8),
  '033': kuvvet(25, 4), '034': alan(200, 40), '035': katiP(300, 10), '036': siviP(2, 1000, 10),
  '037': siviP(3, 1000, 10), '038': kuvvet(50, 6), '039': katiP(400, 8), '040': siviP(5, 1000, 10),
  '041': katiP(800, 0.2), '042': katiP(600, 0.5), '043': derinlik(40000, 1000, 10), '044': siviP(8, 1000, 10),
  '045': katiP(100, 2) / katiP(100, 4), '046': katiP(1000, 0.4), '047': yogunluk(60000, 6, 10), '048': kuvvet(800, 0.25),
  // --- TUR-2 (049-072) ---
  '049': katiP(150, 3), '050': katiP(160, 4), '051': katiP(210, 7), '052': katiP(180, 9),
  '053': katiP(250, 5), '054': katiP(360, 6), '055': katiP(140, 7), '056': katiP(320, 4),
  '057': kuvvet(30, 5), '058': alan(400, 50), '059': siviP(4, 1000, 10), '060': katiP(450, 9),
  '061': kuvvet(40, 3), '062': siviP(6, 1000, 10), '063': alan(600, 30), '064': katiP(540, 6),
  '065': katiP(900, 0.3), '066': derinlik(30000, 1000, 10), '067': yogunluk(80000, 8, 10), '068': kuvvet(1000, 0.25),
  '069': katiP(1200, 0.4), '070': siviP(7, 1000, 10), '071': katiP(kuvvet(60, 4), 2), '072': derinlik(50000, 1000, 10),
  // --- TUR-3 (073-096) ---
  '073': katiP(200, 5), '074': katiP(300, 6), '075': kuvvet(20, 5), '076': katiP(270, 3),
  '077': katiP(160, 8), '078': kuvvet(35, 4), '079': katiP(480, 8), '080': katiP(350, 7),
  '081': siviP(1, 1000, 10), '082': siviP(9, 1000, 10), '083': alan(800, 40), '084': kuvvet(45, 4),
  '085': katiP(640, 8), '086': siviP(10, 1000, 10), '087': alan(900, 30), '088': katiP(420, 6),
  '089': derinlik(20000, 1000, 10), '090': yogunluk(36000, 6, 10), '091': siviP(3, 1200, 10), '092': derinlik(70000, 1000, 10),
  '093': katiP(kuvvet(50, 4), 2), '094': yogunluk(50000, 5, 10), '095': siviP(4, 1200, 10), '096': derinlik(90000, 1000, 10)
};

const pnum = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10);

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const v = bek[id];
  if (v === undefined) { atla++; continue; }   // 001-024
  const H = Object.keys(q.siklar);
  const esit = H.filter(h => Math.abs(pnum(q.siklar[h]) - v) < 0.5);   // tolerans (kayan nokta)
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen≈${Math.round(v)}`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (≈${Math.round(v)})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
