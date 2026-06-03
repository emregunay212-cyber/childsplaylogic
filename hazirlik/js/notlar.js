/* notlar.js — Konuya bağlı ÇOKLU not paneli (Not 1, Not 2, …). Her not METİN veya ÇİZİM olabilir.
   Not eklerken Scratchpad (Yaz / Çizim) yeniden kullanılır: Yaz modunda metin notu, Çizim modunda
   çizim notu kaydedilir. Böylece matematiksel ifade yazmak zor olduğunda öğrenci çizerek not alır.
   Hem konu hem test sayfasında kullanılır. Güvenli DOM (innerHTML yok). */
const Notlar = (() => {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

  function panelOlustur(kapsayici, slug) {
    function render() {
      kapsayici.replaceChildren();
      kapsayici.append(el('h3', 'hz-not-baslik', '📝 Notların'));

      const liste = Plan.notListesi(slug);
      if (!liste.length) kapsayici.append(el('p', 'hz-not-bos', 'Henüz notun yok. Aşağıdan metin veya çizim notu ekleyebilirsin.'));

      liste.forEach((n, i) => {
        const oge = el('div', 'hz-not-oge');
        const ust = el('div', 'hz-not-ust');
        ust.append(el('span', 'hz-not-no', 'Not ' + (i + 1)));
        const sil = el('button', 'hz-not-sil', 'Sil'); sil.type = 'button';
        sil.addEventListener('click', () => { Plan.notSil(slug, i); render(); });
        ust.append(sil);
        oge.append(ust);
        if (n.tip === 'cizim') {
          const img = el('img', 'hz-not-cizim'); img.src = n.icerik; img.alt = 'Çizim notu';
          oge.append(img);
        } else {
          oge.append(el('div', 'hz-not-metin', n.icerik));
        }
        kapsayici.append(oge);
      });

      const ekleBtn = el('button', 'hz-btn hz-btn-ikincil hz-not-eklebtn', '+ Not Ekle');
      ekleBtn.type = 'button';
      ekleBtn.addEventListener('click', () => ekleAlani(ekleBtn));
      kapsayici.append(ekleBtn);
    }

    function ekleAlani(ekleBtn) {
      ekleBtn.remove();
      const wrap = el('div', 'hz-not-ekleme');
      const spKap = el('div');
      wrap.append(spKap);
      const sp = (typeof Scratchpad !== 'undefined') ? Scratchpad.olustur(spKap, { yukseklik: 220 }) : null;

      const aksiyon = el('div', 'hz-not-aksiyon');
      const kaydet = el('button', 'hz-btn', 'Notu Kaydet'); kaydet.type = 'button';
      const iptal = el('button', 'hz-btn hz-btn-ikincil', 'İptal'); iptal.type = 'button';
      aksiyon.append(kaydet, iptal);
      wrap.append(aksiyon);
      kapsayici.append(wrap);

      kaydet.addEventListener('click', () => {
        if (sp) {
          if (sp.aktif() === 'cizim') {
            const d = sp.cizimDataURL();
            if (d) Plan.notEkle(slug, 'cizim', d);
          } else {
            const m = sp.metin().trim();
            if (m) Plan.notEkle(slug, 'metin', m);
          }
        }
        render();
      });
      iptal.addEventListener('click', render);
    }

    render();
  }

  return { panelOlustur };
})();
