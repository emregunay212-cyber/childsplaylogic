/* icerik.js — Sınav hazırlık içeriğini (katalog + konu) statik JSON'dan okur.
   Çalışma anında AI yok; her şey önceden hazırlanmış JSON dosyalarından gelir.
   Not: fetch file:// ile çalışmaz; sayfa bir HTTP sunucusundan açılmalıdır. */
const Icerik = (() => {
  const BASE = 'icerik';
  let _katalog = null;

  async function katalog() {
    if (_katalog) return _katalog;
    const r = await fetch(`${BASE}/index.json`);
    if (!r.ok) throw new Error(`Katalog yüklenemedi (${r.status})`);
    _katalog = await r.json();
    return _katalog;
  }

  async function konu(sinav, ders, slug) {
    const yol = `${BASE}/${sinav.toLowerCase()}/${ders}/${slug}.json`;
    const r = await fetch(yol);
    if (!r.ok) throw new Error(`Konu içeriği bulunamadı: ${yol} (${r.status})`);
    return r.json();
  }

  // Kataloğdan bir dersin konu listesini (sıralı) döndürür.
  async function konular(sinav, ders) {
    const k = await katalog();
    const d = k.sinavlar?.[sinav]?.dersler?.[ders];
    if (!d) return [];
    return [...d.konular].sort((a, b) => a.sira - b.sira);
  }

  function karistir(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Ön test havuzu: hazır konuların her birinden konuBasina kadar soru; her soru konu
  // etiketli (_slug, _konuAd) ve tüm havuz karıştırılmış döner. İçerik arttıkça otomatik
  // çok-konulu seviye tespiti olur.
  async function onTestHavuzu(sinav, ders, konuBasina = 4) {
    const ks = (await konular(sinav, ders)).filter(k => k.hazir && !k.cikmis);  // çıkmış-soru konuları seviye tespitine girmez
    const havuz = [];
    for (const k of ks) {
      const d = await konu(sinav, ders, k.slug);
      // dogrulandi:false → onay bekleyen taslak; ölçmeye katma
      const onayli = (d.sorular || []).filter(s => s.dogrulandi !== false);
      const sec = karistir(onayli).slice(0, konuBasina);
      sec.forEach(s => havuz.push(Object.assign({}, s, { _slug: k.slug, _konuAd: k.ad })));
    }
    return karistir(havuz);
  }

  return { katalog, konu, konular, onTestHavuzu };
})();
