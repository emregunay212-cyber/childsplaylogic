/* Kareköklü İfadeler — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Her şıkkı kanonik (katsayı, köksüz-radikand) biçimine indirger; bekleneni op
   tanımından kendisi hesaplar (√, çarpma/bölme √(ab), sadeleştirme, köklü toplama).
   Kullanım: node verify-karekoklu-ifadeler2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'karekoklu-ifadeler.json'), 'utf8'));

// (katsayı c, radikand r) -> kare çarpanları kök dışına çıkar (r kareden arınmış olur)
function simplify(c, r) {
  if (r < 0) return { c: NaN, r: NaN };
  for (let k = 2; k * k <= r; k++) while (r % (k * k) === 0) { r /= k * k; c *= k; }
  return { c, r };
}
// "2√3" -> {c:2,r:3}, "√5" -> {c:1,r:5}, "16" -> {c:16,r:1}, sonra sadeleştir
function parseRad(s) {
  s = String(s).trim();
  let m = s.match(/^(\d*)√(\d+)$/);
  if (m) return simplify(m[1] === '' ? 1 : parseInt(m[1], 10), parseInt(m[2], 10));
  m = s.match(/^(\d+)$/);
  if (m) return simplify(parseInt(m[1], 10), 1);
  return { c: NaN, r: NaN };
}
const eq = (a, b) => a.c === b.c && a.r === b.r;

// op -> bağımsız beklenen kanonik {c,r}
function expect(o) {
  switch (o.op) {
    case 'sqrt': return simplify(1, o.a);
    case 'sq': return simplify(o.a, 1);              // (√a)² = a
    case 'mul': return simplify(1, o.a * o.b);       // √a·√b = √(ab)
    case 'div': return simplify(1, o.a / o.b);       // √a/√b = √(a/b)
    case 'simplify': return simplify(1, o.a);
    case 'addrad': return simplify(o.c1 + o.c2, o.r);
    case 'subrad': return simplify(o.c1 - o.c2, o.r);
    case 'sumsimplify': case 'subsimplify': {        // √t1 ± √t2 (aynı köke inmeli)
      const t = o.terms.map(n => simplify(1, n));
      if (t.some(x => x.r !== t[0].r)) return { c: NaN, r: NaN };
      const c = o.op === 'sumsimplify' ? t.reduce((s, x) => s + x.c, 0) : t[0].c - t[1].c;
      return simplify(c, t[0].r);
    }
  }
  return { c: NaN, r: NaN };
}

const bek = {
  '025': { op: 'sqrt', a: 256 }, '026': { op: 'sqrt', a: 324 }, '027': { op: 'sqrt', a: 361 },
  '028': { op: 'sqrt', a: 400 }, '029': { op: 'sqrt', a: 441 }, '030': { op: 'sqrt', a: 289 },
  '031': { op: 'sq', a: 7 }, '032': { op: 'sq', a: 13 },
  '033': { op: 'mul', a: 2, b: 8 }, '034': { op: 'mul', a: 3, b: 27 }, '035': { op: 'mul', a: 5, b: 20 },
  '036': { op: 'div', a: 48, b: 3 }, '037': { op: 'div', a: 72, b: 2 }, '038': { op: 'div', a: 98, b: 2 },
  '039': { op: 'simplify', a: 20 }, '040': { op: 'simplify', a: 45 }, '041': { op: 'simplify', a: 72 }, '042': { op: 'simplify', a: 32 },
  '043': { op: 'addrad', c1: 2, c2: 3, r: 5 }, '044': { op: 'subrad', c1: 7, c2: 4, r: 3 },
  '045': { op: 'sumsimplify', terms: [8, 2] }, '046': { op: 'sumsimplify', terms: [18, 2] },
  '047': { op: 'sumsimplify', terms: [12, 27] }, '048': { op: 'subsimplify', terms: [75, 12] },
  // --- TUR-2 (049-072) ---
  '049': { op: 'sqrt', a: 100 }, '050': { op: 'sqrt', a: 144 }, '051': { op: 'sqrt', a: 169 },
  '052': { op: 'sqrt', a: 225 }, '053': { op: 'sq', a: 11 }, '054': { op: 'sqrt', a: 196 },
  '055': { op: 'sq', a: 17 }, '056': { op: 'sqrt', a: 81 },
  '057': { op: 'mul', a: 2, b: 18 }, '058': { op: 'mul', a: 5, b: 5 }, '059': { op: 'mul', a: 2, b: 50 },
  '060': { op: 'div', a: 50, b: 2 }, '061': { op: 'div', a: 200, b: 2 },
  '062': { op: 'simplify', a: 50 }, '063': { op: 'simplify', a: 48 }, '064': { op: 'simplify', a: 98 },
  '065': { op: 'sumsimplify', terms: [27, 3] }, '066': { op: 'subsimplify', terms: [48, 12] },
  '067': { op: 'addrad', c1: 5, c2: 2, r: 6 }, '068': { op: 'subrad', c1: 9, c2: 5, r: 5 },
  '069': { op: 'sumsimplify', terms: [20, 45] }, '070': { op: 'sumsimplify', terms: [50, 8] },
  '071': { op: 'subsimplify', terms: [45, 20] }, '072': { op: 'mul', a: 8, b: 2 },
  // --- TUR-3 (073-096) ---
  '073': { op: 'sqrt', a: 64 }, '074': { op: 'sqrt', a: 121 }, '075': { op: 'sqrt', a: 256 },
  '076': { op: 'sqrt', a: 400 }, '077': { op: 'sq', a: 9 }, '078': { op: 'sqrt', a: 289 },
  '079': { op: 'sqrt', a: 196 }, '080': { op: 'sq', a: 15 },
  '081': { op: 'mul', a: 3, b: 12 }, '082': { op: 'div', a: 98, b: 2 }, '083': { op: 'mul', a: 5, b: 20 },
  '084': { op: 'simplify', a: 75 }, '085': { op: 'simplify', a: 32 }, '086': { op: 'simplify', a: 50 },
  '087': { op: 'div', a: 200, b: 2 }, '088': { op: 'mul', a: 6, b: 24 },
  '089': { op: 'sumsimplify', terms: [8, 18] }, '090': { op: 'subsimplify', terms: [50, 8] },
  '091': { op: 'sumsimplify', terms: [12, 48] }, '092': { op: 'subsimplify', terms: [80, 20] },
  '093': { op: 'addrad', c1: 4, c2: 5, r: 7 }, '094': { op: 'subrad', c1: 8, c2: 3, r: 6 },
  '095': { op: 'sumsimplify', terms: [18, 32] }, '096': { op: 'subsimplify', terms: [72, 18] }
};

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const o = bek[id];
  if (!o) { atla++; continue; }   // 001-024
  const want = expect(o);
  const H = Object.keys(q.siklar);
  const esit = H.filter(h => eq(parseRad(q.siklar[h]), want));
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen=${want.c}√${want.r}`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (${want.c}√${want.r})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
