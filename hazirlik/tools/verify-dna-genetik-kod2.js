/* DNA ve Genetik Kod — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Baz eşleşmesi (A-T, G-C), tamamlayıcı zincir ve Chargaff kuralı (A=T, G=C) ile baz
   sayısı/yüzdesi hesaplarını kendisi yapar. Tamamlayıcı dizi ve baz adı eşleştirmesi +
   sayısal Chargaff türevleri. Kullanım: node verify-dna-genetik-kod2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'dna-genetik-kod.json'), 'utf8'));

const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };           // DNA tamamlayıcı
const NAME = { A: 'Adenin', T: 'Timin', G: 'Guanin', C: 'Sitozin', U: 'Urasil' };
const compSeq = s => s.split('-').map(b => COMP[b.trim().toUpperCase()]).join('-');
const norm = s => String(s).replace(/\s/g, '').toUpperCase();
const pnum = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10);

// id -> beklenen { kind, val }
const bek = {
  '025': { kind: 'str', val: NAME[COMP.A] },          // Timin
  '026': { kind: 'str', val: NAME[COMP.G] },          // Sitozin
  '027': { kind: 'str', val: NAME[COMP.T] },          // Adenin
  '028': { kind: 'str', val: NAME[COMP.C] },          // Guanin
  '029': { kind: 'num', val: 30 }, '030': { kind: 'num', val: 25 },
  '031': { kind: 'num', val: 40 }, '032': { kind: 'num', val: 18 },
  '033': { kind: 'seq', val: compSeq('A-T-G') },      // T-A-C
  '034': { kind: 'num', val: 30 }, '035': { kind: 'num', val: 20 },
  '036': { kind: 'seq', val: compSeq('C-G-A') },      // G-C-T
  '037': { kind: 'num', val: 50 + 50 + 30 + 30 },     // 160
  '038': { kind: 're', val: /timin/i },               // "Timin sayısına" (A=T)
  '039': { kind: 'seq', val: compSeq('T-A-C-G') },    // A-T-G-C
  '040': { kind: 'str', val: NAME.U },                // Urasil (RNA: A→U)
  '041': { kind: 'num', val: 60 },                    // A=T
  '042': { kind: 'num', val: 200 - 2 * 60 },          // G+C = 80
  '043': { kind: 'num', val: (100 - 2 * 30) / 2 },    // %G = 20
  '044': { kind: 'seq', val: compSeq('G-A-T-C-A') },  // C-T-A-G-T
  '045': { kind: 'num', val: (100 - 2 * 20) / 2 },    // A = 30
  '046': { kind: 'num', val: (100 - 2 * 25) / 2 },    // %A = 25
  '047': { kind: 'seq', val: compSeq('A-A-G-C-T') },  // T-T-C-G-A
  '048': { kind: 'num', val: (300 - 2 * 90) / 2 },     // G = 60
  // --- TUR-2 (049-072) ---
  '049': { kind: 'str', val: NAME[COMP.T] },           // Adenin
  '050': { kind: 'str', val: NAME[COMP.G] },           // Sitozin
  '051': { kind: 'str', val: NAME[COMP.C] },           // Guanin
  '052': { kind: 'str', val: NAME[COMP.A] },           // Timin
  '053': { kind: 'num', val: 45 }, '054': { kind: 'num', val: 60 },
  '055': { kind: 'seq', val: compSeq('A-T-C') },       // T-A-G
  '056': { kind: 'seq', val: compSeq('G-C-A') },       // C-G-T
  '057': { kind: 'num', val: 30 }, '058': { kind: 'num', val: 40 + 40 + 35 + 35 },  // 150
  '059': { kind: 'seq', val: compSeq('T-G-C-A') },     // A-C-G-T
  '060': { kind: 'num', val: 20 }, '061': { kind: 'num', val: (100 - 2 * 35) / 2 }, // 15
  '062': { kind: 're', val: /timin/i },
  '063': { kind: 'seq', val: compSeq('C-A-T-G') },     // G-T-A-C
  '064': { kind: 'num', val: 50 },
  '065': { kind: 'num', val: (100 - 2 * 20) / 2 },     // 30
  '066': { kind: 'num', val: 200 - 2 * 60 },           // 80
  '067': { kind: 'seq', val: compSeq('A-G-T-C-A') },   // T-C-A-G-T
  '068': { kind: 'str', val: NAME.U },                 // Urasil
  '069': { kind: 'num', val: (100 - 2 * 30) / 2 },     // 20
  '070': { kind: 'num', val: (300 - 2 * 90) / 2 },     // 60
  '071': { kind: 're', val: /sitozin/i },
  '072': { kind: 'seq', val: compSeq('T-T-A-G-C') },   // A-A-T-C-G
  // --- TUR-3 (073-096) ---
  '073': { kind: 'str', val: NAME[COMP.A] },            // Timin
  '074': { kind: 'str', val: NAME[COMP.G] },            // Sitozin
  '075': { kind: 'num', val: 25 }, '076': { kind: 'num', val: 35 },
  '077': { kind: 'seq', val: compSeq('A-G-T') },        // T-C-A
  '078': { kind: 'seq', val: compSeq('C-A-G') },        // G-T-C
  '079': { kind: 're', val: /timin/i }, '080': { kind: 'num', val: 40 },
  '081': { kind: 'num', val: (100 - 2 * 40) / 2 },      // 10
  '082': { kind: 'seq', val: compSeq('T-G-A-C') },      // A-C-T-G
  '083': { kind: 'num', val: (100 - 2 * 30) / 2 },      // 20
  '084': { kind: 're', val: /sitozin/i },
  '085': { kind: 'num', val: (100 - 2 * 15) / 2 },      // 35
  '086': { kind: 'seq', val: compSeq('G-G-A-T') },      // C-C-T-A
  '087': { kind: 'str', val: NAME[COMP.C] },            // Guanin
  '088': { kind: 'num', val: (100 - 2 * 15) / 2 },      // 35
  '089': { kind: 'num', val: (200 - 2 * 60) / 2 },      // 40
  '090': { kind: 'num', val: (100 - 2 * 10) / 2 },      // 40
  '091': { kind: 'seq', val: compSeq('A-T-G-C-A') },    // T-A-C-G-T
  '092': { kind: 'num', val: (400 - 2 * 120) / 2 },     // 80
  '093': { kind: 'str', val: NAME.U },                  // Urasil
  '094': { kind: 'num', val: (100 - 2 * 25) / 2 },      // 25
  '095': { kind: 'seq', val: compSeq('C-T-A-G-C') },    // G-A-T-C-G
  '096': { kind: 'num', val: 30 }
};

function matchCount(q, b) {
  const H = Object.keys(q.siklar);
  if (b.kind === 'num') return H.filter(h => pnum(q.siklar[h]) === b.val);
  if (b.kind === 'str') return H.filter(h => norm(q.siklar[h]) === norm(b.val));
  if (b.kind === 'seq') return H.filter(h => norm(q.siklar[h]) === norm(b.val));
  if (b.kind === 're') return H.filter(h => b.val.test(q.siklar[h]));
  return [];
}

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (!b) { atla++; continue; }   // 001-024
  const esit = matchCount(q, b);
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen=${b.val}`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (${b.val})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
