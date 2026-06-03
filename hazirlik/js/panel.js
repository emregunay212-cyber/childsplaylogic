/* panel.js — Dashboard. ÇOK DERSLİ: katalogdaki dersler arası sekmeyle geçilir; seçili dersin
   konuları + seviye rozetleri + günlük öneri gösterilir. Seçili ders localStorage'da hatırlanır. */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const hataEl = (m) => el('p', 'hz-hata', m);
  const SEV = { zayif: ['hz-rozet-zayif', 'Zayıf'], orta: ['hz-rozet-orta', 'Orta'], guclu: ['hz-rozet-guclu', 'Güçlü'], baslanmadi: ['hz-rozet-yeni', 'Yeni'] };

  const kok = document.getElementById('hz-panel');
  const profil = Plan.profil();
  if (!profil) { location.replace('index.html'); return; }
  const sinav = profil.sinavHedefi || 'LGS';
  let seciliDers = localStorage.getItem('hazirlik_ders') || 'matematik';

  (async function () {
    try {
      const katalog = await Icerik.katalog();
      const dersler = (katalog.sinavlar[sinav] || {}).dersler || {};
      if (!dersler[seciliDers]) seciliDers = Object.keys(dersler)[0];
      render(dersler);
    } catch (err) {
      kok.replaceChildren(hataEl('İçerik yüklenemedi. Sayfa bir sunucudan (http) açılmalı. — ' + err.message));
    }
  })();

  function render(dersler) {
    const parts = [];
    parts.push(el('h1', 'hz-selam', `Merhaba ${profil.ogrenciAdi}! 👋`));
    const altSatir = el('p', 'hz-selam-alt', `${sinav} çalışma alanın.  `);
    const sifirla = el('button', 'hz-cik', 'Profili sıfırla');
    sifirla.addEventListener('click', () => { Plan.sifirla(); location.href = 'index.html'; });
    altSatir.append(sifirla);
    parts.push(altSatir);

    // Ön test yapılmadıysa uyarı
    if (!Plan.onTestTamamMi()) {
      const uyari = el('div', 'hz-kart hz-oneri');
      uyari.append(
        el('div', 'hz-oneri-etiket', 'Önerilen ilk adım'),
        el('h2', null, '🎯 Seviye Tespit Testi'),
        el('p', null, 'Sana özel çalışma planı için önce kısa bir seviye tespit testi çöz.')
      );
      const b = el('a', 'hz-btn', 'Teste Başla →'); b.href = 'ontest.html';
      uyari.append(b);
      parts.push(uyari);
    }

    // Ders seçici sekmeler
    const dersBar = el('div', 'hz-ders-bar');
    Object.keys(dersler).forEach(dKey => {
      const d = dersler[dKey];
      const btn = el('button', 'hz-ders-btn' + (dKey === seciliDers ? ' aktif' : ''), d.ad);
      btn.type = 'button';
      if (dKey === seciliDers && d.renk) { btn.style.background = d.renk; btn.style.borderColor = d.renk; }
      btn.addEventListener('click', () => {
        if (dKey === seciliDers) return;
        seciliDers = dKey;
        localStorage.setItem('hazirlik_ders', dKey);
        render(dersler);
      });
      dersBar.append(btn);
    });
    parts.push(dersBar);

    const ders = dersler[seciliDers];
    const konular = [...(ders.konular || [])].sort((a, b) => a.sira - b.sira);
    const hazirVar = konular.some(k => k.hazir);

    // Günlük öneri (ön test tamam + seçili derste hazır içerik varsa)
    if (Plan.onTestTamamMi() && hazirVar) {
      const oneri = Plan.gunlukOneri(sinav, seciliDers, konular);
      if (oneri) {
        const k = el('div', 'hz-kart hz-oneri');
        k.append(el('div', 'hz-oneri-etiket', `Bugünün önerisi · ${ders.ad}`));
        k.append(el('h2', null, oneri.konu.ad));
        k.append(el('p', null, oneri.neden));
        const btn = el('a', 'hz-btn', 'Çalışmaya başla →');
        btn.href = `konu.html?sinav=${sinav}&ders=${seciliDers}&konu=${oneri.konu.slug}`;
        k.append(btn);
        parts.push(k);
      }
      const planBtn = el('a', 'hz-btn hz-btn-ikincil', '📅 Çalışma Planım');
      planBtn.href = 'plan.html';
      planBtn.style.marginBottom = '18px';
      parts.push(planBtn);
    }

    parts.push(el('h2', 'hz-bolum-baslik', `${ders.ad} Konuları`));
    if (!hazirVar) {
      parts.push(el('p', 'hz-not-bos', 'Bu dersin içeriği yakında eklenecek. Şimdilik konuları görebilirsin.'));
    }
    const liste = el('div', 'hz-konu-liste');
    konular.forEach(ku => {
      const durum = Plan.konuDurum(sinav, seciliDers, ku.slug);
      const sev = Plan.seviye(durum);
      const satir = ku.hazir ? el('a', 'hz-konu-satir') : el('div', 'hz-konu-satir hz-kilitli');
      if (ku.hazir) satir.href = `konu.html?sinav=${sinav}&ders=${seciliDers}&konu=${ku.slug}`;
      satir.append(el('span', 'hz-konu-no', String(ku.sira)));
      const bilgi = el('div', 'hz-konu-bilgi');
      bilgi.append(el('div', 'hz-konu-ad', ku.ad));
      const dt = durum.dogru + durum.yanlis;
      bilgi.append(el('div', 'hz-konu-durum',
        !ku.hazir ? 'Yakında eklenecek' : (dt ? `${durum.dogru}/${dt} doğru` : 'Henüz çalışılmadı')));
      satir.append(bilgi);
      const rozet = el('span', 'hz-rozet');
      if (!ku.hazir) { rozet.classList.add('hz-rozet-yakinda'); rozet.textContent = 'Yakında'; }
      else { const [c, m] = SEV[sev] || SEV.baslanmadi; rozet.classList.add(c); rozet.textContent = m; }
      satir.append(rozet);
      liste.append(satir);
    });
    parts.push(liste);

    kok.replaceChildren(...parts);
  }
})();
