/* Basit Makineler — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Kaldıraç dengesi (Y·yk=K·kk), makara/palanga kuvvet kazancı, eğik düzlem (F=G·h/ℓ),
   iş (W=F·yol) ve ters problemleri kendisi hesaplar. 0,5 tolerans (kayan nokta).
   Kullanım: node verify-basit-makineler2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'basit-makineler.json'), 'utf8'));

const leverF = (yuk, yk, kk) => yuk * yk / kk;       // dengeyi sağlayan kuvvet
const leverYuk = (F, kk, yk) => F * kk / yk;         // kaldırılan yük
const makara = (yuk, kazanc) => yuk / kazanc;        // sabit:1, hareketli:2, palanga:kazanç
const egikF = (yuk, h, L) => yuk * h / L;            // eğik düzlem kuvveti
const egikH = (F, L, yuk) => F * L / yuk;            // yükselme (F·ℓ = G·h)
const is = (F, yol) => F * yol;

const bek = {
  '025': leverF(100, 2, 4), '026': makara(200, 2), '027': makara(80, 1), '028': is(50, 4),
  '029': leverF(60, 1, 3), '030': makara(300, 2), '031': is(30, 5), '032': makara(120, 1),
  '033': leverYuk(40, 6, 2), '034': makara(400, 4), '035': egikF(200, 2, 8), '036': is(25, 8),
  '037': leverF(90, 2, 6), '038': makara(250, 2), '039': egikF(300, 3, 6), '040': is(60, 10),
  '041': leverF(150, 4, 5), '042': makara(600, 6), '043': egikF(400, 2, 10), '044': is(200, 6),
  '045': leverYuk(25, 8, 2), '046': makara(800, 4), '047': egikH(60, 5, 100), '048': is(500, 4),
  // --- TUR-2 (049-072) ---
  '049': makara(100, 1), '050': makara(200, 2), '051': is(40, 3), '052': makara(160, 2),
  '053': leverF(120, 2, 4), '054': is(50, 6), '055': makara(90, 1), '056': makara(240, 2),
  '057': leverF(80, 3, 4), '058': egikF(300, 2, 10), '059': makara(400, 4), '060': leverYuk(50, 6, 2),
  '061': is(120, 4), '062': egikF(500, 3, 15), '063': leverF(200, 3, 6), '064': makara(600, 3),
  '065': leverYuk(30, 8, 2), '066': egikH(50, 8, 200), '067': is(250, 6), '068': makara(900, 3),
  '069': leverF(300, 2, 5), '070': egikF(600, 4, 12), '071': is(75, 8), '072': leverYuk(40, 9, 3),
  // --- TUR-3 (073-096) ---
  '073': makara(120, 2), '074': is(20, 6), '075': makara(140, 1), '076': is(30, 7),
  '077': makara(180, 2), '078': is(45, 4), '079': makara(160, 4), '080': leverF(100, 3, 5),
  '081': egikF(200, 3, 12), '082': leverF(240, 2, 6), '083': leverYuk(60, 8, 2), '084': makara(720, 3),
  '085': egikF(450, 2, 9), '086': is(150, 4), '087': leverF(360, 2, 8), '088': makara(500, 2),
  '089': egikH(40, 200, 80), '090': leverYuk(120, 9, 3), '091': egikF(900, 4, 12), '092': leverF(420, 3, 7),
  '093': egikH(50, 180, 90), '094': leverYuk(80, 9, 3), '095': is(250, 8), '096': egikF(800, 3, 12)
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
