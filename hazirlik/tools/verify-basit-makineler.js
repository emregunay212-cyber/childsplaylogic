/* Basit Makineler (24 soru) — kaldıraç (Yük·kol=Kuvvet·kol), makara (sabit/hareketli/palanga),
   eğik düzlem (F=G·h/ℓ) hesaplarını BAĞIMSIZ yapıp cevap anahtarıyla karşılaştırır + şık
   çakışmasını denetler. Kullanım: node verify-basit-makineler.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'icerik', 'lgs', 'fen', 'basit-makineler.json'), 'utf8'));

const kald = (yuk, yk, kk) => yuk * yk / kk;        // kuvvet
const kaldYuk = (kuv, kk, yk) => kuv * kk / yk;     // yük
const kaldKol = (yuk, yk, kuv) => yuk * yk / kuv;   // kuvvet kolu
const hareketli = yuk => yuk / 2;
const sabit = yuk => yuk;
const palanga = (yuk, n) => yuk / (2 * n);
const palangaYuk = (kuv, n) => kuv * 2 * n;
const egik = (G, h, l) => G * h / l;                // kuvvet
const egikYuk = (F, l, h) => F * l / h;             // yük
const egikUz = (G, h, F) => G * h / F;              // uzunluk

const bek = {
  '001': kald(40, 2, 4), '002': hareketli(60), '003': sabit(50), '004': kald(30, 3, 9),
  '005': hareketli(80), '006': egik(60, 1, 3), '007': kald(20, 6, 4), '008': hareketli(100),
  '009': kaldYuk(10, 6, 2), '010': egik(100, 2, 5), '011': kald(50, 2, 5), '012': palanga(80, 2),
  '013': egik(120, 3, 4), '014': 2 * 25, '015': kaldKol(60, 1, 15), '016': egik(200, 4, 8),
  '017': palanga(120, 3), '018': kaldKol(80, 3, 20), '019': egikYuk(30, 6, 2), '020': kald(45, 4, 6),
  '021': egik(150, 5, 10), '022': palangaYuk(30, 2), '023': kald(36, 5, 9), '024': egikUz(200, 2, 40)
};

const yak = (a, b) => Math.abs(a - b) < 1e-6;
const pnum = s => parseFloat(String(s).replace(/[−–]/g, '-').replace(',', '.').replace(/[^0-9.\-]/g, ''));
function harfBul(q, b) { const e = Object.keys(q.siklar).filter(h => yak(pnum(q.siklar[h]), b)); return e.length === 1 ? e[0] : '?[' + e.join('') + ']'; }

let pass = 0, fail = 0;
for (const q of data.sorular) {
  const id = q.id.split('-').pop();
  const b = bek[id];
  if (b === undefined) { console.log(id, 'ATLA — beklenen yok'); fail++; continue; }
  const harfler = Object.keys(q.siklar);
  const vals = harfler.map(h => pnum(q.siklar[h]));
  let cakisma = '';
  for (let i = 0; i < vals.length; i++)
    for (let j = i + 1; j < vals.length; j++)
      if (yak(vals[i], vals[j])) cakisma += `${harfler[i]}=${harfler[j]} `;
  const h = harfBul(q, b);
  const ok = h === q.dogruCevap && !cakisma;
  if (ok) pass++;
  else { fail++; console.log(`${q.id} dc=${q.dogruCevap} hesap=${h} bek=${b} ${cakisma ? 'CAKISMA:' + cakisma : ''} FAIL`); }
}
console.log(`SONUC: ${pass} PASS, ${fail} FAIL  (${data.sorular.length} soru)`);
process.exit(fail > 0 ? 1 : 0);
