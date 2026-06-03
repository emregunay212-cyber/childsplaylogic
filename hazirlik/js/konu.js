/* konu.js — Konu anlatımı render + not alma.
   Zengin anlatım formatını (bölüm tipleri: hook/kavram/gorsel/ornek/dene/ozet) destekler;
   tip'i olmayan eski bölümler de çalışır (geriye uyumlu). Anlatım HTML'i ve SVG görseller
   DOMParser ile güvenli eklenir (script/iframe/on-event temizlenir; SVG <style> korunur). */
(function () {
  // Düz metin alanlarında yanlışlıkla bırakılan HTML entity'lerini (ör. &nbsp;) çöz; yoksa
  // textContent literal "&nbsp;" gösterir. (icerikHtml/svg zaten DOMParser ile çözülür.)
  const coz = (s) => String(s)
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = coz(x); return e; };
  const hataEl = (m) => el('p', 'hz-hata', m);

  // Güvenilir statik içerik/SVG'yi script çalıştırmadan DOM'a ekler. (SVG stilleri için <style> korunur.)
  function htmlGuvenliEkle(hedef, html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, iframe, object, embed').forEach(n => n.remove());
    doc.body.querySelectorAll('*').forEach(n => {
      [...n.attributes].forEach(a => {
        if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /javascript:/i.test(a.value))) n.removeAttribute(a.name);
      });
    });
    hedef.append(...doc.body.childNodes);
  }

  function kutuEkle(sec, kutular) {
    kutular.forEach(k => {
      const kutu = el('div', 'hz-kutu hz-kutu-' + (k.tur || 'tanim'));
      if (k.baslik) kutu.append(el('div', 'hz-kutu-baslik', k.baslik));
      kutu.append(el('div', 'hz-kutu-metin', k.metin));
      sec.append(kutu);
    });
  }

  function bolumEkle(b) {
    const sec = el('div', 'hz-bolum hz-bolum-' + (b.tip || 'duz'));
    if (b.baslik) sec.append(el('h3', null, b.baslik));

    if (b.tip === 'hook') {
      const box = el('div', 'hz-hook');
      if (b.icerikHtml) htmlGuvenliEkle(box, b.icerikHtml);
      sec.append(box);
      return sec;
    }
    if (b.tip === 'gorsel') {
      const g = el('div', 'hz-gorsel');
      if (b.svg) htmlGuvenliEkle(g, b.svg);
      sec.append(g);
      if (b.aciklama) sec.append(el('p', 'hz-gorsel-aciklama', b.aciklama));
      return sec;
    }
    if (b.tip === 'ornek') {
      (b.ornekler || []).forEach(o => {
        if (typeof o === 'string') { sec.append(el('p', 'hz-ornek-duz', o)); return; }
        const kart = el('div', 'hz-ornek-kart');
        if (o.soru) kart.append(el('div', 'hz-ornek-soru', o.soru));
        if (o.adimlar && o.adimlar.length) {
          const ol = el('ol', 'hz-ornek-adimlar');
          o.adimlar.forEach(a => ol.append(el('li', null, a)));
          kart.append(ol);
        }
        if (o.sonuc) kart.append(el('div', 'hz-ornek-sonuc', o.sonuc));
        sec.append(kart);
      });
      return sec;
    }
    if (b.tip === 'dene') {
      if (b.soru) sec.append(el('div', 'hz-dene-soru', b.soru));
      const aksiyon = el('div', 'hz-dene-aksiyon');
      const ipKutu = el('div', 'hz-dene-ipucu'); ipKutu.hidden = true;
      const cvKutu = el('div', 'hz-dene-cevap'); cvKutu.hidden = true;
      if (b.ipucu) {
        ipKutu.append(el('span', 'hz-kutu-baslik', 'İpucu'), el('span', null, ' ' + b.ipucu));
        const ipBtn = el('button', 'hz-btn hz-btn-ikincil', 'İpucu ver');
        ipBtn.addEventListener('click', () => { ipKutu.hidden = !ipKutu.hidden; });
        aksiyon.append(ipBtn);
      }
      if (b.cevap) {
        cvKutu.append(el('span', 'hz-kutu-baslik', 'Cevap'), el('span', null, ' ' + b.cevap));
        const cvBtn = el('button', 'hz-btn', 'Cevabı göster');
        cvBtn.addEventListener('click', () => { cvKutu.hidden = false; cvBtn.disabled = true; });
        aksiyon.append(cvBtn);
      }
      sec.append(aksiyon, ipKutu, cvKutu);
      return sec;
    }
    if (b.tip === 'ozet') {
      if (b.icerikHtml) { const w = el('div'); htmlGuvenliEkle(w, b.icerikHtml); sec.append(w); }
      if (b.merak) {
        const m = el('div', 'hz-merak');
        m.append(el('div', 'hz-merak-etiket', 'Sırada ne var?'), el('p', null, b.merak));
        sec.append(m);
      }
      return sec;
    }
    // kavram veya tip'siz (eski format): kutular + icerikHtml + ornekler(string)
    if (b.kutular && b.kutular.length) kutuEkle(sec, b.kutular);
    if (b.icerikHtml) { const w = el('div'); htmlGuvenliEkle(w, b.icerikHtml); sec.append(w); }
    if (b.ornekler && b.ornekler.length) {
      const ul = el('ul', 'hz-ornekler');
      b.ornekler.forEach(o => ul.append(el('li', null, typeof o === 'string' ? o : (o.soru || ''))));
      sec.append(ul);
    }
    return sec;
  }

  const kok = document.getElementById('hz-konu');
  const p = new URLSearchParams(location.search);
  const sinav = p.get('sinav') || 'LGS';
  const ders = p.get('ders') || 'matematik';
  const slug = p.get('konu');
  if (!slug) { kok.replaceChildren(hataEl('Konu belirtilmedi.')); return; }

  (async function () {
    try {
      const d = await Icerik.konu(sinav, ders, slug);
      render(d);
    } catch (err) {
      kok.replaceChildren(hataEl('İçerik yüklenemedi. Sayfanın bir sunucudan (http) açıldığından emin ol. — ' + err.message));
    }
  })();

  function render(d) {
    const parts = [];
    const anlat = el('div', 'hz-kart hz-anlatim');
    anlat.append(el('h1', null, d.konu));
    anlat.append(el('div', 'hz-konu-durum', `${d.sinav} • ${d.ders}`));
    if (d.anlatim && d.anlatim.ozet) anlat.append(el('div', 'hz-ozet', d.anlatim.ozet));
    (d.anlatim && d.anlatim.bolumler ? d.anlatim.bolumler : []).forEach(b => anlat.append(bolumEkle(b)));

    if (d.anlatim && d.anlatim.sikHatalar && d.anlatim.sikHatalar.length) {
      const h = el('div', 'hz-hatalar');
      h.append(el('h3', null, 'Sık Yapılan Hatalar'));
      const ul = el('ul');
      d.anlatim.sikHatalar.forEach(x => ul.append(el('li', null, x)));
      h.append(ul);
      anlat.append(h);
    }
    parts.push(anlat);

    // Not alma (çoklu: metin/çizim)
    const notKart = el('div', 'hz-kart hz-not');
    if (typeof Notlar !== 'undefined') Notlar.panelOlustur(notKart, slug);
    parts.push(notKart);

    // Soruları çöz
    const cta = el('div', 'hz-sonuc-aksiyon');
    const btn = el('a', 'hz-btn', 'Bu Konunun Sorularını Çöz →');
    btn.href = `test.html?sinav=${sinav}&ders=${ders}&konu=${slug}`;
    cta.append(btn);
    parts.push(cta);

    kok.replaceChildren(...parts);
  }
})();
