/* test.js — Konuya özel soru çözme sayfası. Soru havuzunu yükler, Quiz motorunu (rotasyon +
   süre) başlatır ve sağdaki not panelini yönetir (test çözerken not görünür/düzenlenebilir). */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

  const kok = document.getElementById('hz-test');
  const p = new URLSearchParams(location.search);
  const sinav = p.get('sinav') || 'LGS';
  const ders = p.get('ders') || 'matematik';
  const slug = p.get('konu');
  if (!slug) { kok.replaceChildren(el('p', 'hz-hata', 'Konu belirtilmedi.')); return; }

  document.getElementById('hz-test-geri').href = `konu.html?sinav=${sinav}&ders=${ders}&konu=${slug}`;

  // Not paneli (çoklu: metin/çizim)
  const notPanel = document.getElementById('hz-not-panel');
  if (notPanel && typeof Notlar !== 'undefined') Notlar.panelOlustur(notPanel, slug);

  // Karalama / hesap alanı (aç-kapa; ilk açılışta kurulur)
  const scToggle = document.getElementById('hz-scratch-toggle');
  const scKap = document.getElementById('hz-scratch');
  let scKuruldu = false;
  if (scToggle && scKap) {
    scToggle.addEventListener('click', () => {
      scKap.hidden = !scKap.hidden;
      if (!scKap.hidden && !scKuruldu && typeof Scratchpad !== 'undefined') {
        Scratchpad.olustur(scKap);
        scKuruldu = true;
      }
      scToggle.textContent = scKap.hidden ? '✏️ Karalama / Hesap Alanını Aç' : '✏️ Karalama Alanını Gizle';
    });
  }

  (async function () {
    try {
      const data = await Icerik.konu(sinav, ders, slug);
      document.getElementById('hz-test-baslik').textContent = `${data.konu} — Test`;
      const seviye = Plan.seviye(Plan.konuDurum(sinav, ders, slug));  // teste seviyeye göre başla
      Quiz.basla(data, kok, { sinav, ders, slug, timerEl: document.getElementById('hz-timer'), seviye });
    } catch (err) {
      kok.replaceChildren(el('p', 'hz-hata', 'İçerik yüklenemedi. Sayfanın bir sunucudan (http) açıldığından emin ol. — ' + err.message));
    }
  })();
})();
