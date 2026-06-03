/* ontest.js — Seviye tespit (ön test). Hazır konuların hepsinden karışık sorular sorar,
   sonuçları KONU BAZINDA toplayıp başlangıç seviyesini Plan'a yazar. Normal testten farkı:
   dönüt gösterilmez (amaç ölçmek), sonuç konu bazlı seviye özetidir. Güvenli DOM. */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

  const kok = document.getElementById('hz-ontest');
  const profil = Plan.profil();
  if (!profil) { location.replace('index.html'); return; }
  const sinav = profil.sinavHedefi || 'LGS';
  const ders = 'matematik';

  let havuz = [], idx = 0;
  const cevaplar = [];

  (async function () {
    try {
      havuz = await Icerik.onTestHavuzu(sinav, ders, 4);
      if (!havuz.length) {
        kok.replaceChildren(el('p', 'hz-bos', 'Ön test için hazır içerik bulunamadı.'));
        return;
      }
      girisEkrani();
    } catch (err) {
      kok.replaceChildren(el('p', 'hz-hata', 'Yüklenemedi. Sayfa bir sunucudan açılmalı. — ' + err.message));
    }
  })();

  function girisEkrani() {
    const kutu = el('div', 'hz-sonuc');
    kutu.append(
      el('h2', null, 'Seviye Tespit Testi'),
      el('p', 'hz-sonuc-mesaj', `${havuz.length} soruluk kısa bir testle hangi konularda güçlü/zayıf olduğunu belirleyeceğiz. Telaşlanma — bu bir sınav değil, sana özel plan çıkarmak için.`)
    );
    const basla = el('button', 'hz-btn', 'Teste Başla →');
    basla.addEventListener('click', soruGoster);
    kutu.append(basla);
    kok.replaceChildren(kutu);
  }

  function soruGoster() {
    const q = havuz[idx];
    const kart = el('div', 'hz-quiz');
    const ust = el('div', 'hz-quiz-ust');
    const sag = el('div', 'hz-quiz-ust-sag');
    if (q.cikmis) {
      const yil = q.cikmisYil ? `${q.cikmisYil} ` : '';
      const rozet = el('span', 'hz-cikmis-rozet', `${yil}Çıkmış Soru`);
      if (q.kaynak) rozet.title = q.kaynak;
      sag.append(rozet);
    }
    sag.append(el('span', 'hz-quiz-zorluk hz-z-orta', q._konuAd));
    ust.append(el('span', 'hz-quiz-sayac', `Soru ${idx + 1} / ${havuz.length}`), sag);
    kart.append(ust, el('div', 'hz-quiz-soru', q.soru));
    const siklar = el('div', 'hz-quiz-siklar');
    Object.keys(q.siklar).forEach(h => {
      const b = el('button', 'hz-sik');
      b.dataset.harf = h;
      b.append(el('span', 'hz-sik-harf', h), el('span', 'hz-sik-metin', q.siklar[h]));
      b.addEventListener('click', () => cevapla(h));
      siklar.append(b);
    });
    kart.append(siklar);
    kok.replaceChildren(kart);
  }

  function cevapla(harf) {
    const q = havuz[idx];
    cevaplar.push({ slug: q._slug, ad: q._konuAd, dogruMu: harf === q.dogruCevap });
    if (idx + 1 < havuz.length) { idx++; soruGoster(); }
    else bitir();
  }

  function bitir() {
    const konuSonuc = {};
    cevaplar.forEach(c => {
      if (!konuSonuc[c.slug]) konuSonuc[c.slug] = { dogru: 0, yanlis: 0, ad: c.ad };
      if (c.dogruMu) konuSonuc[c.slug].dogru++; else konuSonuc[c.slug].yanlis++;
    });
    Plan.onTestSonucKaydet(sinav, ders, konuSonuc);

    const kutu = el('div', 'hz-sonuc');
    kutu.append(
      el('h2', null, 'Seviye Tespit Tamamlandı 🎯'),
      el('p', 'hz-sonuc-mesaj', 'Başlangıç seviyen belirlendi. Konu durumun:')
    );
    const liste = el('div', 'hz-konu-liste');
    liste.style.textAlign = 'left';
    liste.style.margin = '16px 0';
    Object.keys(konuSonuc).forEach(slug => {
      const r = konuSonuc[slug];
      const durum = Plan.konuDurum(sinav, ders, slug);
      const sev = Plan.seviye(durum);
      const satir = el('div', 'hz-konu-satir');
      const bilgi = el('div', 'hz-konu-bilgi');
      bilgi.append(el('div', 'hz-konu-ad', r.ad), el('div', 'hz-konu-durum', `${r.dogru}/${r.dogru + r.yanlis} doğru`));
      satir.append(bilgi);
      const rozet = el('span', 'hz-rozet');
      const harita = { zayif: ['hz-rozet-zayif', 'Zayıf'], orta: ['hz-rozet-orta', 'Orta'], guclu: ['hz-rozet-guclu', 'Güçlü'], baslanmadi: ['hz-rozet-yeni', 'Yeni'] };
      const [cls, metin] = harita[sev] || harita.baslanmadi;
      rozet.classList.add(cls); rozet.textContent = metin;
      satir.append(rozet);
      liste.append(satir);
    });
    kutu.append(liste);
    const git = el('a', 'hz-btn', 'Çalışma Planıma Git →');
    git.href = 'panel.html';
    kutu.append(git);
    kok.replaceChildren(kutu);
  }
})();
