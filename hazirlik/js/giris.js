/* giris.js — Karşılama/kayıt ekranı. Şimdilik profil localStorage'a yazılır;
   "siteye aktarım"da Firebase Auth (veli e-postası + şifre) ile değiştirilecek. */
(function () {
  if (Plan.profil()) { location.replace('panel.html'); return; }

  const form = document.getElementById('hz-giris-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ad = document.getElementById('hz-ad').value.trim();
    const sinav = document.getElementById('hz-sinav').value;
    const veli = document.getElementById('hz-veli').value.trim();
    const sinavTarihi = document.getElementById('hz-sinav-tarihi').value;
    const kvkk = document.getElementById('hz-kvkk').checked;
    if (!ad || !kvkk) return;
    Plan.profilKaydet({
      ogrenciAdi: ad, sinavHedefi: sinav, veliEposta: veli, sinavTarihi: sinavTarihi || null,
      kayitTarihi: new Date().toISOString()
    });
    // Kayıttan sonra ilk adım: seviye tespit (ön test).
    location.href = 'ontest.html';
  });
})();
