/* ============================================
   KELİMELİK — Sözlük (MODÜLER / DEĞİŞTİRİLEBİLİR)
   Şimdilik test için ~90 kelimelik mock liste. İleride gerçek bir sözlük
   API'si (TDK vb.) veya daha büyük bir kelime dosyası ile değiştirilebilir:
   yalnız KelimelikDict.isValid(word) imzasını koru.
   Not: harfler Türkçe BÜYÜK harf (İ ≠ I) ve torbadaki harf setiyle uyumlu olmalı.
   ============================================ */
const KelimelikDict = (() => {
  const WORDS = [
    // 2-3 harf
    'AT','EV','EL','SU','AY','UN','OT','EK','İP','GÜL','GÖZ','KOL','KAR','KUM','TAŞ',
    'DAĞ','GÖL','GÖK','SÜT','BAL','YAĞ','TUZ','ET','BUZ','KÖY','YOL','SAÇ','DİŞ','KAŞ',
    'TOP','TÜY','KÖK','DAL','NAR','ARI','KEL','SAĞ','SOL','BİR','İKİ','ÜÇ','ON',
    // 4-5 harf
    'KEDİ','OKUL','MASA','KAPI','ELMA','ARMUT','ÇİÇEK','AĞAÇ','ORMAN','DENİZ','NEHİR',
    'GÜNEŞ','BULUT','KALEM','KİTAP','DEFTER','SİLGİ','ÇANTA','OYUN','ARABA','UÇAK',
    'TREN','GEMİ','EKMEK','PEYNİR','ŞEKER','DOMATES','BİBER','SOĞAN','HAVUÇ','MARUL',
    'KUŞ','BALIK','ASLAN','KAPLAN','TAVŞAN','KURT','TİLKİ','İNEK','KOYUN','KEÇİ',
    'TAVUK','HOROZ','ÖRDEK','ANNE','BABA','ÇOCUK','BEBEK','DEDE','NİNE','TEYZE',
    'AMCA','DAYI','HALA','DERS','SINIF','TAHTA','MAVİ','SARI','YEŞİL','SİYAH',
    'BEYAZ','MOR','PEMBE','GÜZEL','BÜYÜK','KÜÇÜK','UZUN','KISA','SICAK','SOĞUK',
    'YENİ','ESKİ','İYİ','HIZLI','YAVAŞ','MUTLU','EVET','KAR','YILDIZ','RÜZGAR',
    'YAĞMUR','TOPRAK','ATEŞ','HAVA','MEYVE','SEBZE','ÇORBA','PİLAV','SALATA'
  ];
  const SET = new Set(WORDS);

  // Türkçe büyük harfe çevir (i→İ, ı→I doğru) + boşlukları temizle
  function normalize(w) {
    return String(w || '')
      .replace(/i/g, 'İ').replace(/ı/g, 'I')
      .toUpperCase()
      .replace(/[^A-ZÇĞİÖŞÜ]/g, '');
  }
  function isValid(word) { return SET.has(normalize(word)); }

  return { isValid, normalize, _set: SET, _words: WORDS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = KelimelikDict;
