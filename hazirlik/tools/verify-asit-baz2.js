/* Asitler ve Bazlar — DERİNLEŞTİRME seti (025-048) pH-sınıflama HESAPLI doğrulaması.
   pH < 7 → asidik, pH = 7 → nötr, pH > 7 → bazik kuralını kendisi uygular ve doğru
   sınıf sözcüğünü taşıyan şıkkı bulur. (Turnusol/tat/nötrleşme/örnek gibi KAVRAMSAL id'ler
   structural doğrulamada; bu script onları atlar.) Kullanım: node verify-asit-baz2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'asit-baz.json'), 'utf8'));

const classify = pH => (pH < 7 ? 'asidik' : pH > 7 ? 'bazik' : 'nötr');
const norm = s => String(s).trim().toLocaleLowerCase('tr');
const pnum = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10);

// id -> beklenen
const bek = {
  '025': { kind: 'class', pH: 3 }, '026': { kind: 'class', pH: 7 }, '027': { kind: 'class', pH: 11 },
  '028': { kind: 'num', val: 7 }, '029': { kind: 'class', pH: 1 }, '030': { kind: 'class', pH: 14 },
  '033': { kind: 'class', pH: 5 }, '034': { kind: 'class', pH: 9 }, '037': { kind: 'class', pH: 2 },
  '039': { kind: 'class', pH: 6 }, '041': { kind: 'class', pH: 6 }, '042': { kind: 'class', pH: 8 },
  '045': { kind: 're', val: /\b7\b/ }, '046': { kind: 'class', pH: 13 }, '048': { kind: 'class', pH: 0 },
  // --- TUR-2 (049-072) pH-sınıflama/değer hesaplı altküme ---
  '049': { kind: 'class', pH: 4 }, '050': { kind: 'class', pH: 10 }, '051': { kind: 'class', pH: 7 },
  '053': { kind: 'class', pH: 2 }, '054': { kind: 'class', pH: 12 },
  '057': { kind: 'class', pH: 5 }, '058': { kind: 'class', pH: 9 }, '059': { kind: 'num', val: 7 },
  '061': { kind: 'class', pH: 1 }, '062': { kind: 'class', pH: 13 }, '064': { kind: 'class', pH: 6 },
  '065': { kind: 'class', pH: 8 }, '066': { kind: 'num', val: 1 }, '067': { kind: 'class', pH: 3 },
  '069': { kind: 'class', pH: 11 }, '070': { kind: 'num', val: 13 }, '071': { kind: 're', val: /nötr/i },
  '072': { kind: 'class', pH: 0 },
  // --- TUR-3 (073-096) pH-sınıflama/değer hesaplı altküme (kavramsal 078,080,082,084,087,093,096 atlanır) ---
  '073': { kind: 'class', pH: 4 }, '074': { kind: 'class', pH: 10 }, '075': { kind: 'num', val: 7 },
  '076': { kind: 'class', pH: 2 }, '077': { kind: 'class', pH: 12 }, '079': { kind: 'class', pH: 5 },
  '081': { kind: 'class', pH: 9 }, '083': { kind: 'class', pH: 6 }, '085': { kind: 'num', val: 7 },
  '086': { kind: 'class', pH: 11 }, '088': { kind: 'class', pH: 3 }, '089': { kind: 're', val: /nötr/i },
  '090': { kind: 'class', pH: 8 }, '091': { kind: 'num', val: 1 }, '092': { kind: 'class', pH: 13 },
  '094': { kind: 'num', val: 14 }, '095': { kind: 'class', pH: 1 }
};

function esitler(q, b) {
  const H = Object.keys(q.siklar);
  if (b.kind === 'class') { const want = norm(classify(b.pH)); return H.filter(h => norm(q.siklar[h]) === want); }
  if (b.kind === 'num') return H.filter(h => pnum(q.siklar[h]) === b.val);
  if (b.kind === 're') return H.filter(h => b.val.test(q.siklar[h]));
  return [];
}

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (!b) { atla++; continue; }   // 001-024 + kavramsal id'ler
  const e = esitler(q, b);
  const beklenenStr = b.kind === 'class' ? classify(b.pH) : (b.kind === 'num' ? b.val : b.val);
  let durum;
  if (e.length !== 1) durum = `CAKISMA/yok [${e.join('')}] beklenen=${beklenenStr}`;
  else if (e[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${e[0]} (${beklenenStr})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`pH-SINIFLAMA HESAPLI SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı (001-024 + kavramsal)  (toplam ${data.sorular.length})`);
console.log('(Kavramsal sorular 031,032,035,036,038,040,043,044,047 yalnizca verify-yapisal ile denetlenir.)');
process.exit(fail > 0 ? 1 : 0);
