/* Veri Analizi — DERİNLEŞTİRME seti (025-048) bağımsız doğrulama.
   Veri kümesinden ortalama/ortanca/tepe değer/açıklık/eksik veri/birleşik ortalamayı
   kendisi hesaplar, tek eşleşen şıkkı bulup dogruCevap ile karşılaştırır.
   Kullanım: node verify-veri-analizi2.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'matematik', 'veri-analizi.json'), 'utf8'));

const sum = a => a.reduce((s, x) => s + x, 0);
const mean = a => sum(a) / a.length;
function median(a) { const s = [...a].sort((x, y) => x - y); const n = s.length, m = n >> 1; return n % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function mode(a) { const f = {}; let best = null, bc = -1; for (const x of a) { f[x] = (f[x] || 0) + 1; if (f[x] > bc) { bc = f[x]; best = x; } } return best; }
const range = a => Math.max(...a) - Math.min(...a);
const missing = (others, m) => m * (others.length + 1) - sum(others);
const combined = groups => sum(groups.map(g => g.n * g.mean)) / sum(groups.map(g => g.n));

// id -> bağımsız hesaplanan beklenen değer
const bek = {
  '025': mean([10,20,30]), '026': range([3,7,9,15]), '027': mode([2,4,4,6,8]), '028': mean([5,15]),
  '029': range([12,18,25,30]), '030': mode([1,3,3,3,5,7]), '031': mean([6,9,12,13]), '032': median([7,9,11]),
  '033': mean([4,8,12,16,20]), '034': median([10,20,30,40]), '035': mode([5,5,8,8,8,10]), '036': range([22,35,40,58,60]),
  '037': mean([14,16,18,20,22]), '038': median([3,6,9,12,15]), '039': missing([60,70,80], 75), '040': mean([25,35,45]),
  '041': mean([11,13,15,17,19,21]), '042': median([2,4,6,10,12,14]), '043': range([100,140,175,210,260]),
  '044': missing([10,15,25,30], 20), '045': combined([{n:3,mean:10},{n:2,mean:20}]), '046': mode([7,7,7,9,9,4]),
  '047': mean([8,12,16,24]), '048': median([2,5,8,11,14,17,20]),
  // --- TUR-2 (049-072) ---
  '049': mean([8,12,16]), '050': range([5,9,14,20]), '051': mode([2,6,6,9,11]), '052': median([4,9,14]),
  '053': mean([10,14]), '054': range([7,13,19,28]), '055': mode([3,3,5,8,8,8,10]), '056': median([6,10,14,18]),
  '057': mean([6,10,14,18,22]), '058': median([5,8,11,14,17]), '059': range([45,60,72,88,100]), '060': mode([4,4,7,7,7,9,12]),
  '061': mean([21,23,25,27,29]), '062': median([2,4,8,16,32,64,128]), '063': mean([30,40,50,60]), '064': range([105,130,160,200,255]),
  '065': missing([12,18,24], 20), '066': combined([{n:2,mean:15},{n:3,mean:25}]), '067': missing([70,80,90,75], 80), '068': combined([{n:4,mean:10},{n:6,mean:20}]),
  '069': mean([13,17,19,23,28]), '070': median([10,20,30,40,50,60]), '071': range([12,12,12,12]), '072': missing([88,92,96], 90),
  // --- TUR-3 (073-096) ---
  '073': mean([6,10,14]), '074': range([4,9,13,22]), '075': mode([3,5,5,8,11]), '076': median([7,11,15]),
  '077': mean([2,4,6,8]), '078': range([15,20,28,40]), '079': mode([6,6,9,9,9,12]), '080': median([4,8,12,16]),
  '081': mean([12,16,20,24,28]), '082': median([5,9,13,17,21]), '083': range([34,50,68,90]), '084': missing([78,85,89], 84),
  '085': combined([{n:2,mean:10},{n:3,mean:20}]), '086': mean([21,23,25,27,29]), '087': mode([8,8,11,11,11,15,15]), '088': range([120,145,170,205,260]),
  '089': median([3,6,9,12,15,18,21]), '090': combined([{n:4,mean:15},{n:6,mean:25}]), '091': missing([45,50,55,60], 54), '092': mean([110,130,150,170,190,210]),
  '093': median([4,7,10,16,22,28]), '094': combined([{n:5,mean:12},{n:5,mean:18}]), '095': missing([20,30,40,50,60], 38), '096': mean([35,45,55,65])
};

const pnum = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10);

let pass = 0, fail = 0, atla = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const v = bek[id];
  if (v === undefined) { atla++; continue; }   // 001-024
  const H = Object.keys(q.siklar);
  const esit = H.filter(h => pnum(q.siklar[h]) === v);
  let durum;
  if (esit.length !== 1) durum = `CAKISMA/yok [${esit.join('')}] beklenen=${v}`;
  else if (esit[0] !== q.dogruCevap) durum = `dc=${q.dogruCevap} ama hesap=${esit[0]} (${v})`;
  else durum = 'ok';
  if (durum === 'ok') pass++; else { fail++; console.log(`${q.id} ${durum} FAIL`); }
}
console.log(`DERİNLEŞTİRME SONUC: ${pass} PASS, ${fail} FAIL, ${atla} atlandı(001-024)  (toplam ${data.sorular.length})`);
process.exit(fail > 0 ? 1 : 0);
