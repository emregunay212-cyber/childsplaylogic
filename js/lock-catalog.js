/* ============================================
   OYUN BAHÇESİ - Kilit Kataloğu (TEK KAYNAK)
   --------------------------------------------
   TÜM oyunlar burada listelenir; hem cihaz (js/app.js) hem admin paneli
   (js/admin.js) bunu paylaşır. Admin panelinden HER oyun açılıp/kilitlenebilir.

   stars: yıldız eşiği. 0 = eşiksiz (varsayılan açık) ama admin "Kilit" ile
   komple kapatabilir. >0 = o kadar yıldız toplanınca açılır.
   key: kilit/override anahtarı. Solo oyunlar oyunun id'siyle, online oyunlar
   'mp:' önekiyle anahtarlanır — bazı online oyunlar (satranc, kod-macerasi)
   solo sürümleriyle AYNI id'yi taşır; önek bu çakışmayı önler.
   adminConfig.locks ve teacherUnlocks bu key'i kullanır.
   ============================================ */

// Hub sırasına göre tüm tek-oyunculu oyunlar
const SOLO_GAMES = [
    'harf-tanima', 'hece-birlestirme', 'kelime-madeni-3d', 'kelime-balonu', 'kelime-canavarlari',
    'kelime-kurtarma', 'gunluk-kelime', 'sayi-sayma', 'matematik', 'desen', 'bilgi-madencisi',
    'matematik-patlatma', 'matematik-kafe', 'bilgi-yilani', 'ritim-sorulari', 'kesir-2048', 'sayi-ninja',
    'hafiza-kartlari', 'sekil-bulmaca', 'siralama', 'jigsaw', 'tetris', 'bilim-dedektifi',
    'eslestirme-ustasi', 'labirent-avcisi', 'renk-eslestirme', 'boyama', 'tuval', 'sayilarla-boyama',
    'emoji-yapici', 'kod-macerasi', 'lego-macerasi', 'lego-world', 'satranc', 'zipla-topla',
    'space-waves', 'egim', 'buz-kulesi', 'penalti', 'zindan-okcusu', 'bil-ve-fethet', 'bilgi-takimi',
    'bilgi-ciftligi', 'bilgi-kulesi', 'cevap-kosusu', 'bilgi-savunmasi', 'fizik-firlatma'
];

// Tüm online (çok oyunculu) oyunlar
const ONLINE_GAMES = [
    'kelime-tahmin', 'harf-tahmin', 'kod-macerasi', 'satranc', 'penalti-mp', 'ates-buz',
    'zipla-topla-coop', 'hava-hokeyi', 'altin-avi', 'kelimelik', 'son-kart'
];

// Yıldız eşikleri (yalnızca eşiği OLANLAR). Burada olmayan her oyun = 0 (eşiksiz/açık).
const STARS_BY_KEY = {
    'tetris': 10, 'zipla-topla': 15, 'space-waves': 20, 'egim': 25, 'buz-kulesi': 30,
    'penalti': 35, 'zindan-okcusu': 40,
    'mp:zipla-topla-coop': 30, 'mp:kelime-tahmin': 40, 'mp:harf-tahmin': 45, 'mp:kod-macerasi': 50,
    'mp:satranc': 55, 'mp:penalti-mp': 60, 'mp:ates-buz': 65, 'mp:altin-avi': 70, 'mp:hava-hokeyi': 75
};

const LOCK_CATALOG = [];
SOLO_GAMES.forEach(id => LOCK_CATALOG.push({ key: id, id: id, type: 'solo', stars: STARS_BY_KEY[id] || 0 }));
ONLINE_GAMES.forEach(id => { const k = 'mp:' + id; LOCK_CATALOG.push({ key: k, id: id, type: 'online', stars: STARS_BY_KEY[k] || 0 }); });

// key -> gerekli yıldız (hızlı arama)
const LOCK_STARS_BY_KEY = {};
LOCK_CATALOG.forEach(g => { LOCK_STARS_BY_KEY[g.key] = g.stars; });
