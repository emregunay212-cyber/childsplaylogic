/* Madde ve Endüstri — DERİNLEŞTİRME seti (025-048) atom-yapısı HESAPLI alt küme doğrulaması.
   Nötr atomda proton=elektron, kütle no=proton+nötron, nötron=kütle−proton bağıntılarını
   kendisi hesaplar. (Kavramsal id'ler [element/bileşik/değişim/periyodik] structural doğrulamada;
   bu script onları atlar.) Kullanım: node verify-madde-endustri2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'madde-endustri.json'), 'utf8'));

// hesaplı id -> beklenen sayı (atom yapısı bağıntılarından bağımsız hesap)
const bek = {
  '026': 11,            // atom no = proton
  '027': 17,            // p = e
  '028': 6 + 6,         // kütle = p + n
  '030': 3,             // e = atom no
  '031': 23 - 11,       // n = kütle − p
  '033': 8 + 8,         // kütle = p + n
  '034': 19,            // p = e
  '036': 40 - 22,       // p = kütle − n
  '038': 12 + 12,       // p + e (nötr, ikisi de 12)
  '040': 14 - 7,        // n = kütle − p
  '041': 40 - 20,       // n = kütle − atom no
  '042': 15 + 15,       // p + e
  '044': 35 - 17,       // n = kütle − p
  '046': 16,            // e = atom no
  '048': 19 + 20,       // kütle = p + n
  // --- TUR-2 (049-072) atom-yapısı hesaplı altküme ---
  '049': 8,             // e = atom no
  '050': 11 + 12,       // kütle = p + n = 23
  '053': 14 - 7,        // n = kütle − p = 7
  '054': 6,             // p = atom no
  '057': 17 + 18,       // kütle = 35
  '058': 40 - 22,       // p = kütle − n = 18
  '060': 19,            // e = atom no
  '061': 24 - 12,       // n = 12
  '064': 20 + 20,       // kütle = 40
  '065': 39 - 19,       // n = 20
  '066': 16,            // p = e
  '068': 31 - 16,       // p = kütle − n = 15
  '069': 13 + 13,       // p + e = 26
  '072': 27 - 13,       // n = 14
  // --- TUR-3 (073-096) atom-yapısı hesaplı altküme (kavramsal 073,075,078,080,083,086,091,094,096 atlanır) ---
  '074': 9,             // p = e
  '076': 7 + 7,         // kütle = p + n = 14
  '077': 12,            // atom no = p
  '079': 5 + 6,         // kütle = 11
  '081': 23 - 11,       // n = kütle − p = 12
  '082': 16,            // e = atom no
  '084': 40 - 22,       // p = kütle − n = 18
  '085': 8 + 10,        // kütle = 18
  '087': 13 + 13,       // p + e = 26
  '088': 31 - 16,       // p = kütle − n = 15
  '089': 39 - 19,       // n = kütle − p = 20
  '090': 13 + 14,       // kütle = 27
  '092': 40 - 20,       // n = kütle − atom no = 20
  '093': 17 + 18,       // kütle = 35
  '095': 35 - 17        // n = kütle − p = 18
};

const pnum = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10);

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const v = bek[id];
  if (v === undefined) { atla++; continue; }   // 001-024 + kavramsal id'ler
  const H = Object.keys(q.siklar);
  const esit = H.filter(h => pnum(q.siklar[h]) === v);
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen=${v}`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (${v})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`ATOM-YAPISI HESAPLI SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı (001-024 + kavramsal)  (toplam ${data.sorular.length})`);
console.log('(Kavramsal sorular 025,029,032,035,037,039,043,045,047 yalnizca verify-yapisal ile denetlenir.)');
process.exit(fail > 0 ? 1 : 0);
