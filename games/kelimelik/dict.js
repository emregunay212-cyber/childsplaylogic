/* ============================================
   KELİMELİK — Sözlük (MODÜLER / DEĞİŞTİRİLEBİLİR)
   words.txt: ~68k Türkçe kök (TDK imla kılavuzu, CanNuhlar/Turkce-Kelime-Listesi
   + fiil kökleri türetildi). Tembel yüklenir, önbelleğe alınır.
   Çekimli kelimeler (kitaplar, evler, geldim...) Türkçe EK-SOYMA + ünsüz yumuşaması
   ile köke indirgenip doğrulanır — böylece tüm liste devasa olmadan geniş kapsam.
   İleride: words.txt'i daha büyük/resmi bir liste veya API ile değiştir; isValid imzasını koru.
   ============================================ */
const KelimelikDict = (() => {
  // Yüklenene kadar kullanılacak küçük yedek liste (offline / fetch başarısız)
  const MOCK = ['AT','EV','EL','SU','AY','UN','OT','GÜL','GÖZ','KOL','KAR','KUM','TAŞ','DAĞ','GÖL',
    'SÜT','BAL','YAĞ','TUZ','BUZ','YOL','TOP','NAR','KEDİ','OKUL','MASA','KAPI','ELMA','ÇİÇEK','AĞAÇ',
    'ORMAN','DENİZ','GÜNEŞ','KALEM','KİTAP','OYUN','ARABA','EKMEK','ŞEKER','KUŞ','BALIK','ANNE','BABA',
    'ÇOCUK','MAVİ','SARI','YEŞİL','BÜYÜK','KÜÇÜK','GÜZEL','YENİ','ESKİ','MUTLU','SU','AŞK','DİL'];
  let SET = new Set(MOCK);
  let loaded = false, loading = null;

  // ünsüz yumuşaması geri-alma: kitabı→kitab→(B→P)→kitap
  const MUT = { 'B': 'P', 'C': 'Ç', 'D': 'T', 'Ğ': 'K', 'G': 'K' };
  // Türkçe çekim ekleri (iteratif soyma; ünlü uyumu varyantları). Uzundan kısaya sıralanır.
  let SUF = [
    'LAR','LER',
    'IMIZ','İMİZ','UMUZ','ÜMÜZ','INIZ','İNİZ','UNUZ','ÜNÜZ','MIZ','MİZ','MUZ','MÜZ','NIZ','NİZ','NUZ','NÜZ',
    'LARIN','LERİN','LARI','LERİ','LARA','LERE','LARDA','LERDE','LARDAN','LERDEN','LARLA','LERLE',
    'NIN','NİN','NUN','NÜN','NDAN','NDEN','NDA','NDE','NLA','NLE','YLA','YLE','LA','LE',
    'DAN','DEN','TAN','TEN','DA','DE','TA','TE','YA','YE','NA','NE','A','E',
    'YI','Yİ','YU','YÜ','NI','Nİ','NU','NÜ','SI','Sİ','SU','SÜ',
    'IN','İN','UN','ÜN','IM','İM','UM','ÜM','I','İ','U','Ü',
    'IYORUM','İYORUM','UYORUM','ÜYORUM','IYORSUN','İYORSUN','IYOR','İYOR','UYOR','ÜYOR',
    'YORUM','YORSUN','YORUZ','YORSUNUZ','YORLAR','YOR',
    'ACAĞIM','ECEĞİM','ACAKSIN','ECEKSİN','ACAĞIZ','ECEĞİZ','ACAK','ECEK',
    'DILAR','DİLER','DULAR','DÜLER','TILAR','TİLER','DINIZ','DİNİZ','DUNUZ','DÜNÜZ',
    'DIM','DİM','DUM','DÜM','TIM','TİM','TUM','TÜM','DIN','DİN','DUN','DÜN','TIN','TİN','TUN','TÜN',
    'DIK','DİK','DUK','DÜK','TIK','TİK','TUK','TÜK','DI','Dİ','DU','DÜ','TI','Tİ','TU','TÜ',
    'MIŞIM','MİŞİM','MIŞSIN','MİŞSİN','MIŞ','MİŞ','MUŞ','MÜŞ',
    'MAYACAK','MEYECEK','MIYOR','MİYOR','MUYOR','MÜYOR','MAZ','MEZ','MAK','MEK','MA','ME',
    'SAM','SEM','SAN','SEN','SA','SE','KEN',
    'AR','ER','IR','İR','UR','ÜR','SIN','SİN','SUN','SÜN','SINIZ','SİNİZ','IZ','İZ','UZ','ÜZ'
  ];
  SUF.sort((a, b) => b.length - a.length);

  function normalize(w) {
    return String(w || '').replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase().replace(/[^A-ZÇĞİÖŞÜ]/g, '');
  }
  function rootOk(r) {
    if (r.length < 2) return false;
    if (SET.has(r)) return true;
    const m = MUT[r[r.length - 1]];
    return !!(m && SET.has(r.slice(0, -1) + m));
  }
  function strip(w, d) {
    if (d > 4 || w.length < 3) return false;
    for (const s of SUF) {
      if (w.length >= s.length + 2 && w.endsWith(s)) {
        const r = w.slice(0, -s.length);
        if (rootOk(r) || strip(r, d + 1)) return true;
      }
    }
    return false;
  }
  function isValid(word) {
    const W = normalize(word);
    if (W.length < 2) return false;
    if (rootOk(W)) return true;
    return strip(W, 0);
  }
  // Birebir sözlük eşleşmesi — mutation ve ek-soyma uygulanmaz. Tahta üstü kelime doğrulaması için.
  // Türkçe fonolojiği gereği sesli harf zorunludur; kısaltmalar (CR, NR vb.) reddedilir.
  const TR_VOWELS = /[AEIİOÖUÜ]/;
  function isExact(word) {
    const W = normalize(word);
    return W.length >= 2 && TR_VOWELS.test(W) && SET.has(W);
  }

  function load(url) {
    if (loaded) return Promise.resolve(true);
    if (loading) return loading;
    loading = fetch(url || 'words.txt?v=1')
      .then(r => { if (!r.ok) throw 0; return r.text(); })
      .then(txt => {
        const s = new Set();
        for (const ln of txt.split('\n')) { const w = ln.trim(); if (w) s.add(w); }
        if (s.size > 1000) { SET = s; loaded = true; }
        return loaded;
      })
      .catch(() => false);
    return loading;
  }

  return { isValid, isExact, normalize, load, isLoaded: () => loaded, size: () => SET.size, words: () => SET };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = KelimelikDict;
