/* Geometrik Cisimler — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Küp/dikdörtgenler prizması/silindir hacim ve yüzey alanı formüllerini kendisi hesaplar.
   Şıkkı {v, pi} olarak ayrıştırır: hem sayısal değeri hem 'π içeriyor mu' bilgisini
   karşılaştırır (20 cm³ ile 20π cm³ farkını ayırır). Tek eşleşeni dogruCevap ile kıyaslar.
   Kullanım: node verify-geometrik-cisimler2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'geometrik-cisimler.json'), 'utf8'));

// "20π cm³" -> {v:20, pi:true}; "16 cm²" -> {v:16, pi:false}
function parse(s) {
  s = String(s);
  const pi = /π/.test(s);
  const m = s.match(/\d+/);
  return { v: m ? parseInt(m[0], 10) : NaN, pi };
}
const eq = (a, b) => a.v === b.v && a.pi === b.pi;

// formüller (pi=true ise v, π katsayısıdır)
const kupHacim = a => ({ v: a ** 3, pi: false });
const prizmaHacim = (a, b, c) => ({ v: a * b * c, pi: false });
const kupYuzey = a => ({ v: 6 * a * a, pi: false });
const prizmaYuzey = (a, b, c) => ({ v: 2 * (a * b + b * c + a * c), pi: false });
const silHacim = (r, h) => ({ v: r * r * h, pi: true });        // π·r²·h
const silTaban = r => ({ v: r * r, pi: true });                 // π·r²
const silYan = (r, h) => ({ v: 2 * r * h, pi: true });          // 2·π·r·h
const silTum = (r, h) => ({ v: 2 * r * (r + h), pi: true });    // 2πr(r+h)
const ayritHacimden = V => ({ v: Math.round(Math.cbrt(V)), pi: false });
const ayritYuzeyden = S => ({ v: Math.round(Math.sqrt(S / 6)), pi: false });

const bek = {
  '025': kupHacim(3), '026': prizmaHacim(2, 3, 4), '027': silHacim(2, 5), '028': kupHacim(4),
  '029': prizmaHacim(5, 2, 3), '030': silHacim(3, 2), '031': kupHacim(5), '032': prizmaHacim(4, 4, 2),
  '033': kupYuzey(3), '034': silTaban(4), '035': silYan(2, 6), '036': kupYuzey(2),
  '037': prizmaHacim(3, 4, 5), '038': silHacim(5, 4), '039': kupHacim(10), '040': silYan(3, 5),
  '041': prizmaYuzey(2, 3, 5), '042': silTum(2, 3), '043': ayritHacimden(64), '044': silHacim(6, 2),
  '045': prizmaHacim(6, 5, 4), '046': kupYuzey(6), '047': ayritYuzeyden(54), '048': silHacim(4, 10),
  // --- TUR-2 (049-072) ---
  '049': kupHacim(6), '050': prizmaHacim(3, 4, 2), '051': silHacim(3, 4), '052': kupHacim(2),
  '053': kupYuzey(4), '054': prizmaHacim(5, 3, 2), '055': silTaban(5), '056': kupHacim(7),
  '057': silHacim(2, 10), '058': kupYuzey(5), '059': prizmaYuzey(2, 3, 4), '060': silYan(4, 5),
  '061': silHacim(5, 2), '062': prizmaHacim(4, 3, 5), '063': silTaban(6), '064': kupHacim(8),
  '065': silTum(3, 2), '066': ayritHacimden(125), '067': silHacim(10, 3), '068': prizmaYuzey(3, 3, 5),
  '069': ayritYuzeyden(150), '070': silTum(2, 4), '071': kupYuzey(10), '072': silHacim(6, 5),
  // --- TUR-3 (073-096) ---
  '073': kupHacim(9), '074': prizmaHacim(2, 5, 6), '075': kupHacim(11), '076': prizmaHacim(3, 3, 4),
  '077': kupYuzey(7), '078': kupHacim(12), '079': prizmaHacim(2, 4, 7), '080': kupYuzey(8),
  '081': silHacim(2, 7), '082': silTaban(7), '083': silYan(5, 3), '084': prizmaYuzey(2, 4, 5),
  '085': silHacim(3, 5), '086': silTaban(8), '087': silYan(2, 8), '088': prizmaYuzey(3, 4, 5),
  '089': silTum(4, 2), '090': ayritHacimden(216), '091': silHacim(4, 6), '092': ayritYuzeyden(96),
  '093': silTum(3, 4), '094': prizmaHacim(3, 5, 6), '095': kupHacim(13), '096': silHacim(4, 5)
};

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const want = bek[id];
  if (!want) { atla++; continue; }   // 001-024
  const H = Object.keys(q.siklar);
  const esit = H.filter(h => eq(parse(q.siklar[h]), want));
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen=${want.v}${want.pi ? 'π' : ''}`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (${want.v}${want.pi ? 'π' : ''})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
