/* Geometrik Cisimler (24 soru) — hacim/yüzey alanı formüllerini BAĞIMSIZ hesaplayıp
   cevap anahtarıyla karşılaştırır. π'li cevaplarda katsayı + π bayrağı eşleşmeli
   (örn "36" ile "36π" eşleşmez). Şık çakışması da denetlenir.
   Kullanım: node verify-geometrik-cisimler.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'geometrik-cisimler.json'), 'utf8'));

// --- bağımsız formüller ---
const kupHacim = a => a ** 3;
const kupYuzey = a => 6 * a * a;
const prizmaHacim = (a, b, c) => a * b * c;
const prizmaYuzey = (a, b, c) => 2 * (a * b + b * c + a * c);
const silindirHacimK = (r, h) => r * r * h;       // π katsayısı
const silindirYuzeyK = (r, h) => 2 * r * (r + h); // π katsayısı
const koniHacimK = (r, h) => r * r * h / 3;       // π katsayısı
const kureHacimK = r => 4 * r ** 3 / 3;           // π katsayısı
const kureYuzeyK = r => 4 * r * r;                // π katsayısı
const karePiramitHacim = (a, h) => a * a * h / 3;

const P = true; // π bayrağı kısayolu
const bek = {
  '001': { v: kupHacim(3) }, '002': { v: prizmaHacim(2, 3, 4) }, '003': { v: kupYuzey(2) }, '004': { v: prizmaHacim(5, 2, 3) },
  '005': { v: silindirHacimK(1, 5), pi: P }, '006': { v: kureYuzeyK(3), pi: P }, '007': { v: kupHacim(4) }, '008': { v: prizmaHacim(1, 6, 2) },
  '009': { v: silindirHacimK(2, 3), pi: P }, '010': { v: silindirYuzeyK(3, 4), pi: P }, '011': { v: koniHacimK(3, 4), pi: P }, '012': { v: kureHacimK(3), pi: P },
  '013': { v: karePiramitHacim(6, 5) }, '014': { v: 10 * 7 }, '015': { v: silindirHacimK(5, 2), pi: P }, '016': { v: Math.cbrt(125) },
  '017': { v: silindirYuzeyK(2, 5), pi: P }, '018': { v: koniHacimK(6, 8), pi: P }, '019': { v: Math.sqrt(100 / 4) }, '020': { v: karePiramitHacim(4, 9) },
  '021': { v: prizmaYuzey(2, 3, 4) }, '022': { v: 48 / (4 * 4) }, '023': { v: kureHacimK(6), pi: P }, '024': { v: 75 * 3 / (5 * 5) }
};

const yak = (a, b) => Math.abs(a - b) < 1e-9;
// "36π cm³" -> {v:36, pi:true} ; "27 cm³" -> {v:27, pi:false}
function parse(s) {
  s = String(s).replace(/[−–]/g, '-');
  const pi = /π|pi/i.test(s);
  const m = s.match(/-?\d+(\.\d+)?/);
  const v = m ? parseFloat(m[0]) : (pi ? 1 : NaN);
  return { v, pi };
}
function harfBul(q, b) {
  const e = Object.keys(q.siklar).filter(h => {
    const p = parse(q.siklar[h]);
    return p.pi === !!b.pi && yak(p.v, b.v);
  });
  return e.length === 1 ? e[0] : '?[' + e.join('') + ']';
}

let pass = 0, fail = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (!b) { console.log(id, 'ATLA — beklenen yok'); fail++; continue; }

  // şık çakışması (aynı değer + aynı π durumu)
  const harfler = Object.keys(q.siklar);
  const ps = harfler.map(h => parse(q.siklar[h]));
  let cakisma = '';
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++)
      if (ps[i].pi === ps[j].pi && yak(ps[i].v, ps[j].v)) cakisma += `${harfler[i]}=${harfler[j]} `;

  const h = harfBul(q, b);
  const ok = h === q.dogruCevap && !cakisma;
  if (ok) pass++;
  else { fail++; console.log(`${q.id} dc=${q.dogruCevap} hesap=${h} bek=${b.v}${b.pi ? 'π' : ''} ${cakisma ? 'CAKISMA:' + cakisma : ''} FAIL`); }
}
console.log(`SONUC: ${pass} PASS, ${fail} FAIL  (${data.sorular.length} soru)`);
process.exit(fail > 0 ? 1 : 0);
