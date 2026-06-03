/* Üslü İfadeler — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Her üslü ifadeyi Math.pow ile kendisi hesaplar, sonucu tek bir şıkla eşleşiyor mu
   ve o şık dogruCevap mı diye kontrol eder. (Orijinal 001-024 verify-uslu-karekoklu'da.)
   Kullanım: node verify-uslu-ifadeler2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'uslu-ifadeler.json'), 'utf8'));
const P = Math.pow;

// id -> bağımsız hesaplanan beklenen değer
const bek = {
  '025': P(2,4),                 // 16
  '026': P(3,3),                 // 27
  '027': P(5,2),                 // 25
  '028': P(10,3),                // 1000
  '029': P(2,5),                 // 32
  '030': P(6,2),                 // 36
  '031': P(7,0),                 // 1
  '032': P(2,6),                 // 64
  '033': P(2,2)*P(2,3),          // 32  (2⁵)
  '034': P(3,4)/P(3,2),          // 9   (3²)
  '035': P(P(2,2),3),            // 64  (2⁶)
  '036': P(5,3)*P(5,0),          // 125
  '037': P(2,3)*P(3,3),          // 216
  '038': P(10,4)/P(10,2),        // 100 (10²)
  '039': P(P(3,2),2),            // 81  (3⁴)
  '040': P(2,7)/P(2,4),          // 8   (2³)
  '041': P(2,2)+P(2,3),          // 12
  '042': P(3,2)*P(3,1),          // 27  (3³)
  '043': P(2*3,2),               // 36  (6²)
  '044': P(5,2)+P(5,0),          // 26
  '045': P(2,4)*P(2,0),          // 16
  '046': P(P(10,2),2)/P(10,2),   // 100 (10²)
  '047': P(2,3)+P(3,2),          // 17
  '048': P(P(2,3),2)/P(2,2),     // 16  (2⁴)
  // --- TUR-2 (049-072) ---
  '049': P(4,3),                 // 64
  '050': P(9,2),                 // 81
  '051': P(2,7),                 // 128
  '052': P(10,4),                // 10000
  '053': P(11,2),                // 121
  '054': P(1,5),                 // 1
  '055': P(4,0),                 // 1
  '056': P(7,2),                 // 49
  '057': P(2,4)*P(2,2),          // 64  (2⁶)
  '058': P(3,3)*P(3,2),          // 243 (3⁵)
  '059': P(5,4)/P(5,2),          // 25  (5²)
  '060': P(2,8)/P(2,5),          // 8   (2³)
  '061': P(P(5,2),2),            // 625 (5⁴)
  '062': P(P(10,2),3),           // 1000000 (10⁶)
  '063': P(2,3)*P(5,3),          // 1000
  '064': P(4,2)*P(4,1),          // 64  (4³)
  '065': P(3,3)+P(4,2),          // 43
  '066': P(5,2)-P(3,2),          // 16
  '067': P(2,5)+P(2,2),          // 36
  '068': P(2*5,2),               // 100 (10²)
  '069': P(6,2)-P(6,0),          // 35
  '070': P(10,3)-P(10,2),        // 900
  '071': P(3,4)/P(3,2)+3,        // 12
  '072': P(P(3,2),2)-P(4,3),     // 17
  // --- TUR-3 (073-096) ---
  '073': P(3,4),                 // 81
  '074': P(2,6),                 // 64
  '075': P(5,3),                 // 125
  '076': P(10,5),                // 100000
  '077': P(9,2),                 // 81
  '078': P(2,0),                 // 1
  '079': P(12,2),                // 144
  '080': P(6,3),                 // 216
  '081': P(3,2)*P(3,3),          // 243 (3⁵)
  '082': P(2,5)*P(2,2),          // 128 (2⁷)
  '083': P(7,3)/P(7,2),          // 7   (7¹)
  '084': P(10,6)/P(10,3),        // 1000 (10³)
  '085': P(P(2,3),2),            // 64  (2⁶)
  '086': P(P(3,2),3),            // 729 (3⁶)
  '087': P(4,3)*P(4,2),          // 1024 (4⁵)
  '088': P(2*3,3),               // 216 (6³)
  '089': P(2,4)+P(3,3),          // 43
  '090': P(5,3)-P(4,2),          // 109
  '091': P(2,6)/P(2,3)+5,        // 13
  '092': P(P(2,2),3)-P(6,2),     // 28
  '093': P(3,4)-P(2,5),          // 49
  '094': P(10,4)+P(10,2),        // 10100
  '095': P(P(5,2),2)/P(5,2),     // 25  (5²)
  '096': P(2,3)*P(2,2)-P(4,2)    // 16
};

const pnum = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10);

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const v = bek[id];
  if (v === undefined) { atla++; continue; }   // 001-024
  const H = Object.keys(q.siklar);
  const esit = H.filter(h => pnum(q.siklar[h]) === v);   // değere eşleşen şık(lar)
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen=${v}`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (${v})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
