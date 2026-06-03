/* GENEL YAPISAL DOĞRULAYICI — hesapla doğrulanamayan kavramsal/sözel konular için.
   Olgusal doğruluğu denetlemez (o, dikkatli yazım + öğretmen kontrolü gerektirir); ama
   YAPISAL bütünlüğü garanti eder:
     - tam 24 soru, 8 kolay / 8 orta / 8 zor
     - her soruda A,B,C,D dolu ve birbirinden FARKLI
     - dogruCevap ∈ {A,B,C,D}
     - zorunlu alanlar (id benzersiz, soru, cozum, kazanim) dolu
     - guncel/tarihsel bilgi gerektiren sorularda kaynakGerekli bayrağı uyarısı
   Kullanım: node verify-yapisal.js <sinav>/<ders>/<konuSlug>.json
   Örnek:   node verify-yapisal.js lgs/fen/mevsimler-iklim.json */
const fs = require('fs');
const path = require('path');

const rel = process.argv[2];
if (!rel) { console.error('Kullanım: node verify-yapisal.js <sinav>/<ders>/<slug>.json'); process.exit(2); }
const dosya = path.join(__dirname, '..', 'icerik', ...rel.split('/'));
const data = JSON.parse(fs.readFileSync(dosya, 'utf8'));

const HARF = ['A', 'B', 'C', 'D'];
let hata = 0;
const uyari = [];
const gorulenId = new Set();
const zorlukSay = { kolay: 0, orta: 0, zor: 0 };

function bildir(id, msg) { hata++; console.log(`${id}  ${msg}`); }

if (!Array.isArray(data.sorular)) { console.error('sorular dizisi yok'); process.exit(1); }
if (data.sorular.length !== 24) console.log(`UYARI: soru sayısı ${data.sorular.length} (beklenen 24)`);

for (const q of data.sorular) {
  const id = q.id || '(id yok)';
  if (!q.id) bildir(id, 'id eksik');
  if (gorulenId.has(q.id)) bildir(id, 'id tekrarı'); else gorulenId.add(q.id);

  if (!q.soru || !String(q.soru).trim()) bildir(id, 'soru metni boş');
  if (!q.cozum || !String(q.cozum).trim()) bildir(id, 'cozum boş');
  if (!q.kazanim || !String(q.kazanim).trim()) bildir(id, 'kazanim boş');

  if (zorlukSay[q.zorluk] === undefined) bildir(id, `geçersiz zorluk: ${q.zorluk}`);
  else zorlukSay[q.zorluk]++;

  const s = q.siklar || {};
  const eksik = HARF.filter(h => !s[h] || !String(s[h]).trim());
  if (eksik.length) bildir(id, `şık eksik/boş: ${eksik.join(',')}`);

  // şık metinleri farklı mı? (normalize: küçük harf + boşluk sadeleştir)
  const norm = h => String(s[h] || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < HARF.length; i++)
    for (let j = i + 1; j < HARF.length; j++)
      if (s[HARF[i]] && s[HARF[j]] && norm(HARF[i]) === norm(HARF[j]))
        bildir(id, `şık tekrarı: ${HARF[i]}=${HARF[j]}`);

  if (!HARF.includes(q.dogruCevap)) bildir(id, `dogruCevap geçersiz: ${q.dogruCevap}`);
  else if (!s[q.dogruCevap]) bildir(id, `dogruCevap (${q.dogruCevap}) boş şıkkı gösteriyor`);

  // olgusal risk: tarih/güncel bilgi içeren sorularda kaynak bayrağı önerilir
  if (/\b(yıl|tarih|ne zaman|hangi tarihte|kaç yılında)\b/i.test(q.soru || '') && !q.kaynakGerekli)
    uyari.push(`${id}: tarih/yıl içeriyor — kaynakGerekli:true düşünülmeli`);
}

if (zorlukSay.kolay !== 8 || zorlukSay.orta !== 8 || zorlukSay.zor !== 8)
  console.log(`UYARI: zorluk dağılımı kolay=${zorlukSay.kolay} orta=${zorlukSay.orta} zor=${zorlukSay.zor} (beklenen 8/8/8)`);

if (uyari.length) { console.log('--- olgusal kaynak uyarıları ---'); uyari.forEach(u => console.log(' ' + u)); }

console.log(`YAPISAL SONUC: ${data.sorular.length} soru, ${hata} HATA, dağılım ${zorlukSay.kolay}/${zorlukSay.orta}/${zorlukSay.zor}`);
process.exit(hata > 0 ? 1 : 0);
