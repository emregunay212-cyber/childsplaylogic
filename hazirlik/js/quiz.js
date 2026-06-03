/* quiz.js — ADAPTİF soru-çözme motoru.
   - Test, öğrencinin o konudaki SEVİYESİNE göre başlar (zayıf→kolay, orta→orta, güçlü→zor).
   - Test İÇİNDE dinamik: doğru cevap → bir sonraki soru zorlaşır; yanlış → kolaylaşır.
   - Soru havuzundan, hedeflenen zorluğa en yakın (sorulmamış) soru seçilir; o zorluk biterse komşu
     zorluktan alınır.
   - Yanlış cevapta doğru cevap + çözüm (dönüt). Soru kökündeki kelimeler dokunarak işaretlenebilir.
   - Süre sayacı; bitince sonuç Plan'a kaydedilir. Güvenli DOM (innerHTML yok). */
const Quiz = (() => {
  const ZORLUKLAR = ['kolay', 'orta', 'zor'];
  let S = null;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function karistir(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function baslangicIdx(seviye) {
    if (seviye === 'guclu') return 2;
    if (seviye === 'zayif' || seviye === 'baslanmadi') return 0;
    return 1; // orta veya bilinmiyor
  }

  function basla(konuData, kapsayici, { sinav, ders, slug, onBitti, timerEl, testBoyu = 10, seviye = 'orta' } = {}) {
    // dogrulandi:false → onay bekleyen taslak (ör. öğretmence teyit edilmemiş çıkmış soru); öğrenciye gösterilmez
    const havuz = (konuData.sorular || []).filter(s => s.dogrulandi !== false);
    const gruplar = { kolay: [], orta: [], zor: [] };
    havuz.forEach(s => { (gruplar[s.zorluk] || gruplar.orta).push(s); });
    ZORLUKLAR.forEach(z => karistir(gruplar[z]));

    S = {
      data: konuData, gruplar, sorulan: new Set(),
      dogru: 0, yanlis: 0, cevaplar: [],
      kapsayici, sinav, ders, slug, onBitti, seviye,
      zorlukIdx: baslangicIdx(seviye),
      hedefSayi: Math.min(testBoyu, havuz.length),
      soruNo: 0, aktif: null, cevaplandi: false,
      timerEl: timerEl || null, baslaMs: Date.now(), timerId: null
    };
    if (!havuz.length) { kapsayici.replaceChildren(el('p', 'hz-bos', 'Bu konuya henüz soru eklenmemiş.')); return; }
    baslatTimer();
    soruGoster();
  }

  function baslatTimer() {
    if (!S.timerEl) return;
    const yaz = () => {
      const s = Math.floor((Date.now() - S.baslaMs) / 1000);
      S.timerEl.textContent = `⏱ ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };
    yaz();
    S.timerId = setInterval(yaz, 1000);
  }
  function durdurTimer() { if (S.timerId) { clearInterval(S.timerId); S.timerId = null; } }

  // Hedef zorluğa en yakın, sorulmamış soruyu seç (yoksa komşu zorluk).
  function soruSec() {
    const idx = S.zorlukIdx;
    const sira = [idx, idx + 1, idx - 1, idx + 2, idx - 2].filter(i => i >= 0 && i <= 2);
    for (const i of sira) {
      const aday = S.gruplar[ZORLUKLAR[i]].filter(q => !S.sorulan.has(q.id));
      if (aday.length) return aday[0];
    }
    return null;
  }

  function soruGoster() {
    if (S.soruNo >= S.hedefSayi) { bitir(); return; }
    const q = soruSec();
    if (!q) { bitir(); return; }
    S.aktif = q; S.sorulan.add(q.id); S.soruNo++; S.cevaplandi = false;

    const kart = el('div', 'hz-quiz');
    const ust = el('div', 'hz-quiz-ust');
    const sag = el('div', 'hz-quiz-ust-sag');
    if (q.cikmis) {                                  // gerçek çıkmış sınav sorusu → sağ üstte rozet
      const yil = q.cikmisYil ? `${q.cikmisYil} ` : '';
      const rozet = el('span', 'hz-cikmis-rozet', `${yil}Çıkmış Soru`);
      if (q.kaynak) rozet.title = q.kaynak;          // kaynak detayını üzerine gelince göster
      sag.append(rozet);
    }
    sag.append(el('span', `hz-quiz-zorluk hz-z-${q.zorluk}`, q.zorluk));
    ust.append(
      el('span', 'hz-quiz-sayac', `Soru ${S.soruNo} / ${S.hedefSayi}`),
      sag
    );
    kart.append(ust);

    // Soru kökü: kelimelere dokununca işaretlenir (vurgu/altı çizili)
    const soruEl = el('div', 'hz-quiz-soru');
    String(q.soru).split(/(\s+)/).forEach(parca => {
      if (parca === '') return;
      if (/^\s+$/.test(parca)) { soruEl.appendChild(document.createTextNode(parca)); return; }
      const w = el('span', 'hz-kelime', parca);
      w.addEventListener('click', () => w.classList.toggle('hz-vurgu'));
      soruEl.appendChild(w);
    });
    kart.append(soruEl);

    const siklar = el('div', 'hz-quiz-siklar');
    Object.keys(q.siklar).forEach(h => {
      const b = el('button', 'hz-sik'); b.dataset.harf = h;
      b.append(el('span', 'hz-sik-harf', h), el('span', 'hz-sik-metin', q.siklar[h]));
      b.addEventListener('click', () => cevapla(h));
      siklar.append(b);
    });
    kart.append(siklar);

    const donut = el('div', 'hz-quiz-donut'); donut.id = 'hz-donut'; donut.hidden = true;
    kart.append(donut);

    const alt = el('div', 'hz-quiz-alt');
    const ileri = el('button', 'hz-btn hz-btn-ileri', S.soruNo < S.hedefSayi ? 'Sonraki Soru →' : 'Testi Bitir');
    ileri.id = 'hz-ileri'; ileri.hidden = true;
    ileri.addEventListener('click', sonraki);
    alt.append(ileri);
    kart.append(alt);

    S.kapsayici.replaceChildren(kart);
  }

  function cevapla(harf) {
    if (S.cevaplandi) return;
    S.cevaplandi = true;
    const q = S.aktif;
    const dogruMu = harf === q.dogruCevap;
    if (dogruMu) { S.dogru++; S.zorlukIdx = Math.min(2, S.zorlukIdx + 1); }   // doğru → zorlaş
    else { S.yanlis++; S.zorlukIdx = Math.max(0, S.zorlukIdx - 1); }          // yanlış → kolaylaş
    S.cevaplar.push({ id: q.id, secilen: harf, dogru: q.dogruCevap, dogruMu, zorluk: q.zorluk });

    S.kapsayici.querySelectorAll('.hz-sik').forEach(b => {
      b.disabled = true;
      if (b.dataset.harf === q.dogruCevap) b.classList.add('hz-sik-dogru');
      else if (b.dataset.harf === harf) b.classList.add('hz-sik-yanlis');
    });
    const donut = S.kapsayici.querySelector('#hz-donut');
    donut.replaceChildren(
      el('div', `hz-donut-baslik ${dogruMu ? 'hz-dogru' : 'hz-yanlis'}`,
        dogruMu ? '✓ Doğru!' : `✗ Yanlış — doğru cevap: ${q.dogruCevap}`),
      el('div', 'hz-donut-cozum', q.cozum || '')
    );
    donut.hidden = false;
    S.kapsayici.querySelector('#hz-ileri').hidden = false;
  }

  function sonraki() { soruGoster(); }

  function bitir() {
    durdurTimer();
    const gecenSn = Math.floor((Date.now() - S.baslaMs) / 1000);
    const toplam = S.soruNo || 1;
    const oran = Math.round((S.dogru / toplam) * 100);
    if (S.sinav && typeof Plan !== 'undefined') Plan.testSonucuKaydet(S.sinav, S.ders, S.slug, S.dogru, S.yanlis);
    const mesaj = oran >= 80 ? 'Harika! Bu konuda güçlüsün 💪'
      : oran >= 50 ? 'İyi gidiyorsun, biraz daha tekrar iyi olur.'
      : 'Bu konuyu tekrar çalışman faydalı olacak.';
    const dk = Math.floor(gecenSn / 60), sn = gecenSn % 60;
    const basina = toplam ? Math.round(gecenSn / toplam) : 0;

    const kutu = el('div', 'hz-sonuc');
    kutu.append(
      el('div', 'hz-sonuc-skor', `${S.dogru} / ${toplam}`),
      el('div', 'hz-sonuc-yuzde', `%${oran} doğru`),
      el('p', 'hz-sonuc-sure', `⏱ ${dk} dk ${sn} sn  ·  soru başına ~${basina} sn`),
      el('p', 'hz-sonuc-mesaj', mesaj)
    );
    const aksiyon = el('div', 'hz-sonuc-aksiyon');
    const tekrar = el('button', 'hz-btn', 'Tekrar Çöz');
    tekrar.addEventListener('click', () =>
      basla(S.data, S.kapsayici, { sinav: S.sinav, ders: S.ders, slug: S.slug, onBitti: S.onBitti, timerEl: S.timerEl, testBoyu: S.hedefSayi, seviye: S.seviye }));
    const panel = el('a', 'hz-btn hz-btn-ikincil', 'Panele Dön'); panel.href = 'panel.html';
    aksiyon.append(tekrar, panel);
    kutu.append(aksiyon);
    S.kapsayici.replaceChildren(kutu);
    if (typeof S.onBitti === 'function') S.onBitti({ dogru: S.dogru, yanlis: S.yanlis, oran, gecenSn });
  }

  return { basla };
})();
