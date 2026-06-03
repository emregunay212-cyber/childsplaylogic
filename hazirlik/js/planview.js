/* planview.js — Çalışma planının tam görünümü: sınava kalan süre + Bu Hafta programı +
   Bu Ay odak + Yıllık konu öncelik sırası. Plan motoru Plan.planOlustur'dan gelir (kural
   tabanlı, AI yok). Güvenli DOM. */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const SEV = { zayif: ['hz-rozet-zayif', 'Zayıf'], orta: ['hz-rozet-orta', 'Orta'], guclu: ['hz-rozet-guclu', 'Güçlü'], baslanmadi: ['hz-rozet-yeni', 'Yeni'] };

  const kok = document.getElementById('hz-plan');
  const profil = Plan.profil();
  if (!profil) { location.replace('index.html'); return; }
  const sinav = profil.sinavHedefi || 'LGS';
  const ders = 'matematik';

  function konuRozeti(sev) {
    const [c, m] = SEV[sev] || SEV.baslanmadi;
    const r = el('span', 'hz-rozet ' + c, m); return r;
  }
  function konuSatiri(slug, ad, ust, alt, sev) {
    const a = el('a', 'hz-konu-satir');
    a.href = `konu.html?sinav=${sinav}&ders=${ders}&konu=${slug}`;
    a.append(el('span', 'hz-konu-no', ust));
    const bilgi = el('div', 'hz-konu-bilgi');
    bilgi.append(el('div', 'hz-konu-ad', ad));
    if (alt) bilgi.append(el('div', 'hz-konu-durum', alt));
    a.append(bilgi);
    if (sev) a.append(konuRozeti(sev));
    return a;
  }
  function formatTarih(s) { try { return new Date(s).toLocaleDateString('tr-TR'); } catch (e) { return s; } }

  (async function () {
    try {
      const konular = await Icerik.konular(sinav, ders);
      render(Plan.planOlustur(sinav, ders, konular, profil.sinavTarihi));
    } catch (err) {
      kok.replaceChildren(el('p', 'hz-hata', 'Plan oluşturulamadı. Sayfa bir sunucudan açılmalı. — ' + err.message));
    }
  })();

  function render(plan) {
    const parts = [];
    parts.push(el('h1', 'hz-selam', '📅 Çalışma Planın'));

    // --- Sınava kalan süre / yıllık bakış ---
    const sureKart = el('div', 'hz-kart hz-oneri');
    if (profil.sinavTarihi && plan.kalanGun != null && plan.kalanGun > 0) {
      sureKart.append(
        el('div', 'hz-oneri-etiket', 'SINAVA KALAN'),
        el('h2', null, `${plan.kalanGun} gün · ${plan.kalanHafta} hafta`),
        el('p', null, `Sınav tarihi: ${formatTarih(profil.sinavTarihi)}`)
      );
      const yetisir = plan.kalanHafta >= plan.gerekenHafta;
      sureKart.append(el('p', null, yetisir
        ? `${plan.hazirSayisi} hazır konu var; tahmini ~${plan.gerekenHafta} haftalık çalışma. Tempon yeterli 👍`
        : `~${plan.gerekenHafta} haftalık iş var ama ${plan.kalanHafta} hafta kaldı — günlük tempoyu artır.`));
    } else if (profil.sinavTarihi && plan.kalanGun != null) {
      sureKart.append(el('div', 'hz-oneri-etiket', 'SINAV TARİHİ'), el('p', null, 'Girdiğin sınav tarihi geçmiş görünüyor; güncelleyebilirsin.'));
    } else {
      sureKart.append(el('div', 'hz-oneri-etiket', 'SINAV TARİHİ'), el('p', null, 'Planın süresini hesaplamak için sınav tarihini ekle.'));
    }
    // tarih düzenleme
    const inp = el('input', 'hz-girdi'); inp.type = 'date'; if (profil.sinavTarihi) inp.value = profil.sinavTarihi;
    inp.style.marginTop = '10px';
    const tarihBtn = el('button', 'hz-btn', 'Tarihi Kaydet'); tarihBtn.style.marginTop = '8px';
    tarihBtn.addEventListener('click', () => { if (inp.value) { Plan.sinavTarihiKaydet(inp.value); location.reload(); } });
    sureKart.append(inp, tarihBtn);
    parts.push(sureKart);

    if (!plan.haftalik.length) {
      parts.push(el('p', 'hz-bos', 'Plan oluşturmak için önce seviye tespit testini çöz ve hazır konu olsun.'));
      kok.replaceChildren(...parts);
      return;
    }

    // --- Bu Hafta ---
    parts.push(el('h2', 'hz-bolum-baslik', '🗓️ Bu Hafta'));
    const hk = el('div', 'hz-konu-liste');
    plan.haftalik.forEach(g => {
      const satir = konuSatiri(g.slug, (g.bugunMu ? 'Bugün — ' : '') + g.gunAd, g.bugunMu ? '★' : g.gunAd.slice(0, 2), g.gorev, g.sev);
      if (g.bugunMu) { satir.style.borderColor = 'var(--hz-ana)'; satir.style.borderWidth = '2px'; }
      hk.append(satir);
    });
    parts.push(hk);

    // --- Bu Ay Odak (öncelikli ilk konular) ---
    parts.push(el('h2', 'hz-bolum-baslik', '📌 Bu Ay Odaklan'));
    const ay = el('div', 'hz-konu-liste');
    plan.oncelik.slice(0, Math.min(4, plan.oncelik.length)).forEach((k, i) =>
      ay.append(konuSatiri(k.slug, k.ad, String(i + 1), null, k.sev)));
    parts.push(ay);

    // --- Yıllık: tüm konu öncelik sırası ---
    parts.push(el('h2', 'hz-bolum-baslik', '📚 Konu Öncelik Sırası (Yıllık)'));
    const yil = el('div', 'hz-konu-liste');
    plan.oncelik.forEach((k, i) => yil.append(konuSatiri(k.slug, k.ad, String(i + 1), null, k.sev)));
    parts.push(yil);

    kok.replaceChildren(...parts);
  }
})();
