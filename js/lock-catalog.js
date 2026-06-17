/* ============================================
   OYUN BAHÇESİ - Kilit Kataloğu (TEK KAYNAK)
   --------------------------------------------
   Kilitlenebilir oyunların yıldız eşikleri burada tanımlanır ve
   hem cihaz (js/app.js) hem admin paneli (js/admin.js) bunu paylaşır.

   key: kilit/override anahtarı. Solo oyunlar oyunun id'siyle, online
   oyunlar 'mp:' önekiyle anahtarlanır — çünkü bazı online oyunlar
   (satranc, kod-macerasi) solo sürümleriyle AYNI id'yi taşır; önek
   bu çakışmayı önler. adminConfig.locks ve teacherUnlocks bu key'i kullanır.
   ============================================ */
const LOCK_CATALOG = [
    // Solo (tek oyunculu) — kademeli
    { key: 'tetris',          id: 'tetris',          stars: 10, type: 'solo' },
    { key: 'zipla-topla',     id: 'zipla-topla',     stars: 15, type: 'solo' },
    { key: 'space-waves',     id: 'space-waves',     stars: 20, type: 'solo' },
    { key: 'egim',            id: 'egim',            stars: 25, type: 'solo' },
    { key: 'buz-kulesi',      id: 'buz-kulesi',      stars: 30, type: 'solo' },
    { key: 'penalti',         id: 'penalti',         stars: 35, type: 'solo' },
    { key: 'zindan-okcusu',   id: 'zindan-okcusu',   stars: 40, type: 'solo' },
    // Online (çok oyunculu) — solo'lardan sonra, daha yüksek eşik
    { key: 'mp:zipla-topla-coop', id: 'zipla-topla-coop', stars: 30, type: 'online' },
    { key: 'mp:kelime-tahmin', id: 'kelime-tahmin',  stars: 40, type: 'online' },
    { key: 'mp:harf-tahmin',   id: 'harf-tahmin',    stars: 45, type: 'online' },
    { key: 'mp:kod-macerasi',  id: 'kod-macerasi',   stars: 50, type: 'online' },
    { key: 'mp:satranc',       id: 'satranc',        stars: 55, type: 'online' },
    { key: 'mp:penalti-mp',    id: 'penalti-mp',     stars: 60, type: 'online' },
    { key: 'mp:ates-buz',      id: 'ates-buz',       stars: 65, type: 'online' },
    { key: 'mp:altin-avi',     id: 'altin-avi',      stars: 70, type: 'online' },
    { key: 'mp:hava-hokeyi',   id: 'hava-hokeyi',    stars: 75, type: 'online' },
    { key: 'mp:son-kart',      id: 'son-kart',       stars: 40, type: 'online' },
];

// key -> gerekli yıldız (hızlı arama)
const LOCK_STARS_BY_KEY = {};
LOCK_CATALOG.forEach(g => { LOCK_STARS_BY_KEY[g.key] = g.stars; });
