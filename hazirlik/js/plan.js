/* plan.js — Öğrenci profili, ilerleme takibi ve kural tabanlı çalışma önerisi.
   ŞİMDİLİK localStorage tabanlı (local geliştirme). "Siteye aktarım" aşamasında
   bu katman Firebase Auth + RTDB (kullanicilar/{uid}) ile değiştirilecek; arayüz
   (API) aynı kalacak şekilde tasarlandı. Tüm mantık if/else + sayma — AI yok. */
const Plan = (() => {
  const KEY = 'hazirlik_durum_v1';

  function varsayilan() {
    return { profil: null, ilerleme: {}, notlar: {}, sonGuncelleme: null };
  }
  function yukle() {
    try { return JSON.parse(localStorage.getItem(KEY)) || varsayilan(); }
    catch { return varsayilan(); }
  }
  function kaydet(d) {
    d.sonGuncelleme = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(d));
  }

  function anahtar(sinav, ders, slug) { return `${sinav.toLowerCase()}/${ders}/${slug}`; }

  function profilKaydet(profil) { const d = yukle(); d.profil = profil; kaydet(d); }
  function profil() { return yukle().profil; }

  function konuDurum(sinav, ders, slug) {
    const d = yukle();
    return d.ilerleme[anahtar(sinav, ders, slug)] ||
      { dogru: 0, yanlis: 0, leitnerKutu: 1, sonCalisma: null, denemeSayisi: 0 };
  }

  // Eşik tabanlı seviye: <%50 zayıf, %50–80 orta, >%80 güçlü.
  function seviye(durum) {
    const t = durum.dogru + durum.yanlis;
    if (t === 0) return 'baslanmadi';
    const oran = durum.dogru / t;
    if (oran < 0.5) return 'zayif';
    if (oran < 0.8) return 'orta';
    return 'guclu';
  }

  // Bir test sonrası ilerlemeyi ve Leitner kutusunu günceller.
  function testSonucuKaydet(sinav, ders, slug, dogru, yanlis) {
    const d = yukle();
    const k = anahtar(sinav, ders, slug);
    const mevcut = d.ilerleme[k] || { dogru: 0, yanlis: 0, leitnerKutu: 1, sonCalisma: null, denemeSayisi: 0 };
    mevcut.dogru += dogru;
    mevcut.yanlis += yanlis;
    mevcut.denemeSayisi += 1;
    mevcut.sonCalisma = new Date().toISOString();
    // Leitner: bu oturumda çoğunluk doğruysa kutuyu yükselt, değilse 1'e indir.
    const oran = (dogru + yanlis) ? dogru / (dogru + yanlis) : 0;
    mevcut.leitnerKutu = oran >= 0.7 ? Math.min(5, mevcut.leitnerKutu + 1) : 1;
    d.ilerleme[k] = mevcut;
    kaydet(d);
    return mevcut;
  }

  // Günlük öneri: hazır konular arasından, önce hiç çalışılmamış (sıraya göre),
  // yoksa en zayıf (Leitner kutusu en düşük) konuyu önerir.
  function gunlukOneri(sinav, ders, konuListesi) {
    const hazir = konuListesi.filter(k => k.hazir);
    if (!hazir.length) return null;
    const baslanmamis = hazir.find(k => konuDurum(sinav, ders, k.slug).sonCalisma === null);
    if (baslanmamis) return { konu: baslanmamis, neden: 'Bu konuya henüz başlamadın.' };
    const sirali = [...hazir].sort((a, b) =>
      konuDurum(sinav, ders, a.slug).leitnerKutu - konuDurum(sinav, ders, b.slug).leitnerKutu);
    return { konu: sirali[0], neden: 'Tekrar etmen gereken konu.' };
  }

  // Notlar (konu bazlı, ÇOKLU) — her not { tip:'metin'|'cizim', icerik, tarih }.
  // Eski tek-metin biçimi otomatik diziye taşınır (geriye uyum).
  function notListesi(slug) {
    const n = yukle().notlar[slug];
    if (!n) return [];
    if (Array.isArray(n)) return n;
    return n.metin ? [{ tip: 'metin', icerik: n.metin, tarih: n.tarih || null }] : [];
  }
  function notEkle(slug, tip, icerik) {
    const d = yukle();
    let n = d.notlar[slug];
    if (!Array.isArray(n)) n = (n && n.metin) ? [{ tip: 'metin', icerik: n.metin, tarih: n.tarih || null }] : [];
    n.push({ tip, icerik, tarih: new Date().toISOString() });
    d.notlar[slug] = n; kaydet(d);
    return n;
  }
  function notSil(slug, index) {
    const d = yukle(); const n = d.notlar[slug];
    if (Array.isArray(n)) { n.splice(index, 1); d.notlar[slug] = n; kaydet(d); }
    return notListesi(slug);
  }

  function sifirla() { localStorage.removeItem(KEY); }

  // Ön test (seviye tespit) sonucunu işler: konu bazlı doğru/yanlış → başlangıç seviyesi +
  // Leitner kutusu. konuSonuclari: { slug: { dogru, yanlis, ad } }
  function onTestSonucKaydet(sinav, ders, konuSonuclari) {
    const d = yukle();
    Object.keys(konuSonuclari).forEach(slug => {
      const k = anahtar(sinav, ders, slug);
      const r = konuSonuclari[slug];
      const m = d.ilerleme[k] || { dogru: 0, yanlis: 0, leitnerKutu: 1, sonCalisma: null, denemeSayisi: 0 };
      m.dogru += r.dogru; m.yanlis += r.yanlis;
      m.denemeSayisi += 1; m.sonCalisma = new Date().toISOString();
      const oran = (r.dogru + r.yanlis) ? r.dogru / (r.dogru + r.yanlis) : 0;
      m.leitnerKutu = oran >= 0.8 ? 3 : (oran >= 0.5 ? 2 : 1);  // ön teste göre başlangıç
      d.ilerleme[k] = m;
    });
    if (d.profil) d.profil.onTestTamam = true;
    kaydet(d);
  }
  function onTestTamamMi() { const p = yukle().profil; return !!(p && p.onTestTamam); }

  function sinavTarihiKaydet(tarih) { const d = yukle(); if (d.profil) { d.profil.sinavTarihi = tarih; kaydet(d); } }

  const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  function gunFarki(t1, t2) { return Math.ceil((t2 - t1) / 86400000); }

  // Kural tabanlı çalışma planı (AI yok): seviye + sınav tarihi → öncelik + haftalık program.
  function planOlustur(sinav, ders, konular, sinavTarihiStr) {
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    const hazir = (konular || []).filter(k => k.hazir);
    const seviyePuan = { zayif: 3, baslanmadi: 2.5, orta: 1.5, guclu: 0.5 };
    const seansSayisi = { zayif: 3, baslanmadi: 2, orta: 2, guclu: 1 };

    const konuBilgi = hazir.map(k => {
      const durum = konuDurum(sinav, ders, k.slug);
      const sev = seviye(durum);
      return {
        slug: k.slug, ad: k.ad, sira: k.sira, sev,
        puan: seviyePuan[sev] != null ? seviyePuan[sev] : 2,
        seans: seansSayisi[sev] != null ? seansSayisi[sev] : 2
      };
    });
    // Öncelik: yüksek puan (zayıf) önce; eşitlikte müfredat sırası
    const oncelik = konuBilgi.slice().sort((a, b) => (b.puan - a.puan) || (a.sira - b.sira));
    // Çalışma blokları: önce her konudan 1, sonra seansı fazla (zayıf) olanlar tekrar
    const bloklar = [];
    const maxSeans = konuBilgi.length ? Math.max.apply(null, konuBilgi.map(k => k.seans)) : 0;
    for (let tur = 0; tur < maxSeans; tur++) {
      for (const k of oncelik) { if (tur < k.seans) bloklar.push(k); }
    }
    // Kalan süre
    let kalanGun = null, kalanHafta = null;
    if (sinavTarihiStr) {
      const st = new Date(sinavTarihiStr); st.setHours(0, 0, 0, 0);
      kalanGun = gunFarki(bugun, st);
      kalanHafta = kalanGun > 0 ? Math.ceil(kalanGun / 7) : 0;
    }
    // Haftalık program: bugünden 7 gün; her güne sırayla bir blok (tekrarlı)
    const haftalik = [];
    for (let i = 0; i < 7 && bloklar.length; i++) {
      const gunIdx = (bugun.getDay() + i) % 7;
      const blok = bloklar[i % bloklar.length];
      haftalik.push({
        gunAd: GUNLER[gunIdx], bugunMu: i === 0,
        slug: blok.slug, ad: blok.ad, sev: blok.sev,
        gorev: blok.ad + ' — anlatım + 20 soru'
      });
    }
    const haftadaCalismaGun = 5;
    const gerekenHafta = bloklar.length ? Math.ceil(bloklar.length / haftadaCalismaGun) : 0;
    return { kalanGun, kalanHafta, haftalik, oncelik, bloklar, hazirSayisi: hazir.length, gerekenHafta };
  }

  return {
    profil, profilKaydet, konuDurum, seviye, testSonucuKaydet,
    gunlukOneri, notListesi, notEkle, notSil, sifirla, anahtar,
    onTestSonucKaydet, onTestTamamMi, sinavTarihiKaydet, planOlustur
  };
})();
