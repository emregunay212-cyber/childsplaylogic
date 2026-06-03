/* Dönüşüm Geometrisi — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Öteleme / x-y-orijin-(y=x) yansıması / 90-180-270° dönme dönüşümlerini nokta üzerinde
   kendisi uygular; şıkları (x, y) çiftine ayrıştırıp tek eşleşeni dogruCevap ile karşılaştırır.
   Kullanım: node verify-donusum-geometrisi2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'donusum-geometrisi.json'), 'utf8'));

// dönüşümler: [x,y] -> [x,y]
const trans = (dx, dy) => ([x, y]) => [x + dx, y + dy];
const reflX = ([x, y]) => [x, -y];        // x eksenine
const reflY = ([x, y]) => [-x, y];        // y eksenine
const reflO = ([x, y]) => [-x, -y];       // orijine (= 180°)
const reflYX = ([x, y]) => [y, x];        // y = x doğrusuna
const rot90 = ([x, y]) => [-y, x];        // saat tersi 90°
const rot180 = ([x, y]) => [-x, -y];
const rotCW90 = ([x, y]) => [y, -x];      // saat yönü 90° (= saat tersi 270°)
const comp = (...fns) => p => fns.reduce((q, f) => f(q), p);   // soldan sağa uygula

// id -> { p: başlangıç noktası, f: dönüşüm }
const bek = {
  '025': { p: [3, 5], f: reflX }, '026': { p: [4, -2], f: reflY }, '027': { p: [2, 3], f: trans(4, 0) },
  '028': { p: [5, 1], f: trans(0, 3) }, '029': { p: [-2, 4], f: reflX }, '030': { p: [3, 7], f: reflY },
  '031': { p: [1, 2], f: trans(-5, 0) }, '032': { p: [4, 5], f: trans(0, -2) },
  '033': { p: [3, 4], f: reflO }, '034': { p: [2, 5], f: reflYX }, '035': { p: [1, 3], f: trans(2, -1) },
  '036': { p: [-3, 2], f: reflO }, '037': { p: [4, 1], f: reflYX }, '038': { p: [5, 3], f: trans(2, 4) },
  '039': { p: [-2, -5], f: reflX }, '040': { p: [6, -3], f: reflY },
  '041': { p: [2, 3], f: rot90 }, '042': { p: [4, 1], f: rot180 }, '043': { p: [1, 5], f: rotCW90 },
  '044': { p: [3, 2], f: rotCW90 }, '045': { p: [2, 4], f: comp(reflX, trans(3, 0)) },
  '046': { p: [-1, 3], f: rot180 }, '047': { p: [5, 2], f: rot90 }, '048': { p: [4, 3], f: comp(reflYX, reflY) },
  // --- TUR-2 (049-072) ---
  '049': { p: [6, 2], f: reflX }, '050': { p: [3, 8], f: reflY }, '051': { p: [2, 5], f: trans(3, 0) },
  '052': { p: [4, 6], f: trans(0, -4) }, '053': { p: [-3, 5], f: reflX }, '054': { p: [7, -2], f: reflY },
  '055': { p: [1, 4], f: trans(5, 0) }, '056': { p: [5, 3], f: trans(0, 2) },
  '057': { p: [3, 4], f: reflO }, '058': { p: [2, 6], f: reflYX }, '059': { p: [4, 1], f: trans(-2, 3) },
  '060': { p: [-5, 2], f: reflO }, '061': { p: [5, 3], f: reflYX }, '062': { p: [6, 4], f: trans(-3, -2) },
  '063': { p: [-2, -6], f: reflX }, '064': { p: [7, -3], f: reflY },
  '065': { p: [2, 5], f: rot90 }, '066': { p: [4, 3], f: rot180 }, '067': { p: [1, 6], f: rotCW90 },
  '068': { p: [5, 2], f: rot90 }, '069': { p: [3, 1], f: comp(reflX, trans(2, 0)) },
  '070': { p: [4, 2], f: rot180 }, '071': { p: [6, 5], f: reflYX }, '072': { p: [2, 7], f: comp(reflY, reflX) },
  // --- TUR-3 (073-096) ---
  '073': { p: [4, 7], f: reflX }, '074': { p: [5, 3], f: reflY }, '075': { p: [2, 6], f: trans(3, 0) },
  '076': { p: [5, 6], f: trans(0, -2) }, '077': { p: [-3, 6], f: reflX }, '078': { p: [8, -1], f: reflY },
  '079': { p: [2, 3], f: trans(5, 0) }, '080': { p: [3, 5], f: trans(0, 3) },
  '081': { p: [5, 6], f: reflO }, '082': { p: [3, 7], f: reflYX }, '083': { p: [5, 2], f: trans(-2, 3) },
  '084': { p: [-4, 3], f: reflO }, '085': { p: [6, 2], f: reflYX }, '086': { p: [7, 5], f: trans(-3, -2) },
  '087': { p: [-3, -5], f: reflX }, '088': { p: [8, -2], f: reflY },
  '089': { p: [3, 4], f: rot90 }, '090': { p: [5, 4], f: rot180 }, '091': { p: [2, 5], f: rotCW90 },
  '092': { p: [6, 1], f: rot90 }, '093': { p: [2, 3], f: comp(reflX, trans(4, 0)) },
  '094': { p: [6, 3], f: rot180 }, '095': { p: [7, 4], f: reflYX }, '096': { p: [3, 5], f: comp(reflYX, reflX) }
};

// "(3, -5)" -> [3,-5]
function parsePt(s) {
  const m = String(s).replace(/−/g, '-').match(/-?\d+/g);
  return m && m.length === 2 ? [parseInt(m[0], 10), parseInt(m[1], 10)] : null;
}
const eq = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (!b) { atla++; continue; }   // 001-024
  const want = b.f(b.p);
  const H = Object.keys(q.siklar);
  const esit = H.filter(h => eq(parsePt(q.siklar[h]), want));
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen=(${want.join(', ')})`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (${want.join(', ')})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
