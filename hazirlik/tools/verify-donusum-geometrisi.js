/* Dönüşüm Geometrisi (24 soru) — öteleme/yansıma/dönme koordinat dönüşümlerini
   BAĞIMSIZ hesaplayıp cevap anahtarıyla karşılaştırır + şık koordinat çakışmasını
   denetler. Kullanım: node verify-donusum-geometrisi.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'donusum-geometrisi.json'), 'utf8'));

// --- bağımsız dönüşüm fonksiyonları ---
const ote = (p, a, b) => [p[0] + a, p[1] + b];      // öteleme
const yansX = p => [p[0], -p[1]];                    // x ekseni yansıması
const yansY = p => [-p[0], p[1]];                    // y ekseni yansıması
const don90 = p => [-p[1], p[0]];                    // 90° saat yönü tersi
const don180 = p => [-p[0], -p[1]];                  // 180°
const don270 = p => [p[1], -p[0]];                   // 270° saat yönü tersi
const E = (x, y) => [x === 0 ? 0 : x, y === 0 ? 0 : y]; // -0 -> 0

// beklenen koordinatlar (kaynak noktadan zincirle hesaplanır)
const bek = {
  '001': ote([2, 3], 4, 0), '002': ote([1, 5], 0, 3), '003': yansX([3, 4]), '004': yansY([2, 6]),
  '005': ote([0, 0], 5, 0), '006': ote([4, 1], -2, 0), '007': yansX([5, 5]), '008': yansY([-3, 2]),
  '009': ote([2, 3], 3, 1), '010': don180([1, 2]), '011': don90([4, 0]), '012': yansX([3, -2]),
  '013': ote([2, 5], 1, -3), '014': yansY([-2, 4]), '015': don180([0, 3]), '016': don90([1, 1]),
  '017': don180([3, 4]), '018': don270([2, 0]), '019': ote(yansX([1, 2]), 3, 0), '020': don90([3, 3]),
  '021': don180([-1, 4]), '022': ote(yansY([5, 2]), 0, 1), '023': don90([2, -3]), '024': ote([4, 1], -6, -2)
};

// "(6, 3)" / "(-2, -1)" -> [6,3]
function koord(s) {
  const m = String(s).replace(/[−–]/g, '-').match(/-?\d+/g);
  return (m && m.length >= 2) ? [parseInt(m[0], 10), parseInt(m[1], 10)] : null;
}
function harfBul(q, b) {
  const e = Object.keys(q.siklar).filter(h => {
    const k = koord(q.siklar[h]);
    return k && k[0] === b[0] && k[1] === b[1];
  });
  return e.length === 1 ? e[0] : '?[' + e.join('') + ']';
}

let pass = 0, fail = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (!b) { console.log(id, 'ATLA — beklenen yok'); fail++; continue; }
  const be = E(b[0], b[1]);

  // şık koordinat çakışması var mı?
  const harfler = Object.keys(q.siklar);
  const koordlar = harfler.map(h => koord(q.siklar[h]));
  let cakisma = '';
  for (let i = 0; i < koordlar.length; i++)
    for (let j = i + 1; j < koordlar.length; j++)
      if (koordlar[i] && koordlar[j] && koordlar[i][0] === koordlar[j][0] && koordlar[i][1] === koordlar[j][1])
        cakisma += `${harfler[i]}=${harfler[j]} `;

  const h = harfBul(q, be);
  const ok = h === q.dogruCevap && !cakisma;
  if (ok) pass++;
  else { fail++; console.log(`${q.id} dc=${q.dogruCevap} hesap=${h} bek=(${be[0]}, ${be[1]}) ${cakisma ? 'CAKISMA:' + cakisma : ''} FAIL`); }
}
console.log(`SONUC: ${pass} PASS, ${fail} FAIL  (${data.sorular.length} soru)`);
process.exit(fail > 0 ? 1 : 0);
