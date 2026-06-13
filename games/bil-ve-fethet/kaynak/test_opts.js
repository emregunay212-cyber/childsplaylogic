/* ============================================================
   questionbank.js — _opts / _sameAns birim testi
   Çalıştır:  node games/bil-ve-fethet/kaynak/test_opts.js
   Amaç: çeldirici cevap-eşitliği çakışmasının (Mustafa Kemal /
   Mustafa Kemal Atatürk) bir daha çıkmadığını ve normal soruların
   hâlâ 4 farklı seçenek ürettiğini doğrulamak.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error('  ✘ ' + m); } };

// questionbank.js düz script — eval edip iç fonksiyonları dışa aç
const src = fs.readFileSync(path.join(__dirname, 'questionbank.js'), 'utf8');
const exportTail = ';return {_opts,_sameAns,_normAns,SUBJGEN,HIST_WHO,_q};';
const mod = new Function(src + exportTail)();
const { _opts, _sameAns, SUBJGEN, HIST_WHO, _q } = mod;

console.log('— _sameAns (cevap eşitliği) —');
ok(_sameAns('Mustafa Kemal', 'Mustafa Kemal Atatürk') === true, 'Mustafa Kemal ⊂ Mustafa Kemal Atatürk');
ok(_sameAns('Mustafa Kemal Atatürk', 'Mustafa Kemal') === true, 'tersi de doğru (simetrik)');
ok(_sameAns('İnönü', 'İsmet İnönü') === true, 'İnönü ⊂ İsmet İnönü');
ok(_sameAns('Atatürk', 'Mustafa Kemal Atatürk') === true, 'Atatürk ⊂ Mustafa Kemal Atatürk');
ok(_sameAns('Sultan Süleyman', 'Sultan Selim') === false, 'farklı padişahlar AYNI sayılmaz');
ok(_sameAns('Osman Bey', 'Mustafa Kemal') === false, 'alakasız isimler farklı');
ok(_sameAns('12', '120') === false, 'sayı: 12 ≠ 120 (kelime sınırı)');
ok(_sameAns('O', 'OH') === false, 'element: O ≠ OH (kelime sınırı)');
ok(_sameAns('-100', '100') === false, 'işaret: -100 ≠ 100 (eksi korunur)');
ok(_sameAns('1/2', '12') === false, 'kesir: 1/2 ≠ 12 (bölü korunur)');
ok(_sameAns('İstanbul', 'İstanbul') === true, 'İ büyük/küçük normalize tutarlı');
ok(_sameAns('elma', 'Elma') === true, 'büyük/küçük harf normalize');
ok(_sameAns('2', '2') === true, 'birebir eşit');

console.log('— _opts: Mustafa Kemal senaryosu (1000 deneme) —');
const histAns = HIST_WHO.map(x => x[1]); // tüm tarih cevapları havuzu
let bad = 0;
for (let i = 0; i < 1000; i++) {
  // "T.C. kurucusu" → Mustafa Kemal Atatürk, havuz tüm tarih cevapları (Mustafa Kemal dahil)
  const opts = _opts('Mustafa Kemal Atatürk', histAns);
  // hiçbir seçenek doğru cevapla "aynı kişi" olmamalı (doğrunun kendisi hariç)
  const dupes = opts.filter(o => o !== 'Mustafa Kemal Atatürk' && _sameAns(o, 'Mustafa Kemal Atatürk'));
  if (dupes.length) bad++;
  // ters senaryo: İlk TBMM Başkanı → Mustafa Kemal
  const opts2 = _opts('Mustafa Kemal', histAns);
  const dupes2 = opts2.filter(o => o !== 'Mustafa Kemal' && _sameAns(o, 'Mustafa Kemal'));
  if (dupes2.length) bad++;
}
ok(bad === 0, `1000×2 denemede "Mustafa Kemal" ikilemi çakışması: ${bad} (0 olmalı)`);

console.log('— _opts: genel sağlamlık —');
// büyük havuzlu sorular hâlâ 4 farklı seçenek vermeli
const sampleOpts = _opts('Fatih Sultan Mehmet', histAns);
ok(sampleOpts.length === 4, `büyük havuz 4 seçenek (geldi: ${sampleOpts.length})`);
ok(new Set(sampleOpts).size === sampleOpts.length, 'seçenekler birbirinden farklı (string)');
ok(sampleOpts.includes('Fatih Sultan Mehmet'), 'doğru cevap seçenekler içinde');
// hiçbir seçenek çifti "aynı cevap" olmamalı
let pairwise = true;
for (let a = 0; a < sampleOpts.length; a++)
  for (let b = a + 1; b < sampleOpts.length; b++)
    if (_sameAns(sampleOpts[a], sampleOpts[b])) pairwise = false;
ok(pairwise, 'hiçbir seçenek çifti birbirine eşdeğer değil');

// sayı havuzu (hece sayısı): 4 farklı seçenek, doğru içeride
const numOpts = _opts('3', ['1','2','3','4','5','6']);
ok(numOpts.length === 4 && numOpts.includes('3'), 'sayı havuzu 4 seçenek + doğru');
ok(new Set(numOpts).size === 4, 'sayı seçenekleri benzersiz');

console.log('— _q: tüm üreticiler ans index tutarlılığı + 4 seçenek (300 örnek/jeneratör) —');
let qBad = 0, qTotal = 0, qFew = 0;
for (const subj of Object.keys(SUBJGEN)) {
  for (const lvl of Object.keys(SUBJGEN[subj])) {
    for (let i = 0; i < 300; i++) {
      const q = SUBJGEN[subj][lvl]({});
      qTotal++;
      // doğru index gerçekten doğru cevabı işaret etmeli ve opts[ans] benzersiz olmalı
      if (q.ans < 0 || q.ans >= q.opts.length) { qBad++; continue; }
      // doğru cevaba "eşdeğer" başka seçenek olmamalı (ikilem yok)
      const correct = q.opts[q.ans];
      const eq = q.opts.filter((o, idx) => idx !== q.ans && _sameAns(o, correct));
      if (eq.length) qBad++;
      // aşırı-birleştirme regresyonu: havuz yeterliyken hâlâ 4 seçenek gelmeli
      if (q.opts.length < 4) qFew++;
    }
  }
}
ok(qBad === 0, `${qTotal} üretilen soruda ikilem/bozuk index: ${qBad} (0 olmalı)`);
ok(qFew === 0, `4'ten az seçenekli soru (aşırı-birleştirme): ${qFew} (0 olmalı)`);

console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);
