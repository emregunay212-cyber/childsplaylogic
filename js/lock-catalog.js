/* ============================================
   OYUN BAHÇESİ - Kilit Kataloğu
   --------------------------------------------
   TÜM oyunların kilit listesi; hem cihaz (js/app.js) hem admin paneli (js/admin.js)
   bunu paylaşır. Admin panelinden HER oyun açılıp/kilitlenebilir.

   Kaynak: data/games.json → js/catalog.js (GAME_CATALOG; ÜRETİLMİŞ, `npm run catalog`).
   Bu dosya listeyi ve eşikleri oradan türetir; oyun eklemek/eşik değiştirmek için JSON düzenlenir.
   API değişmedi: SOLO_GAMES, ONLINE_GAMES, STARS_BY_KEY, LOCK_CATALOG, LOCK_STARS_BY_KEY.

   stars: yıldız eşiği (JSON `stars` solo, `online.stars` online). 0 = eşiksiz (varsayılan
   açık) ama admin "Kilit" ile komple kapatabilir. >0 = o kadar yıldız toplanınca açılır.
   key: kilit/override anahtarı. Solo oyunlar oyunun id'siyle, online oyunlar 'mp:' önekiyle
   anahtarlanır — bazı online oyunlar (satranc, kod-macerasi) solo sürümleriyle AYNI id'yi
   taşır; önek bu çakışmayı önler. adminConfig.locks ve teacherUnlocks bu key'i kullanır.
   Kapalı (active:false) oyunlar da listede: admin paneli onları da gösterir/kilitler.
   ============================================ */

// Hub sırasına göre tüm tek-oyunculu oyunlar
const SOLO_GAMES = GAME_CATALOG.filter(g => g.module).map(g => g.slug);

// Tüm online (çok oyunculu) oyunlar, Online bölümü sırasıyla
const ONLINE_GAMES = GAME_CATALOG
    .filter(g => g.online)
    .sort((a, b) => a.online.order - b.online.order)
    .map(g => g.slug);

// Yıldız eşikleri (yalnızca eşiği OLANLAR). Burada olmayan her oyun = 0 (eşiksiz/açık).
const STARS_BY_KEY = {};
GAME_CATALOG.forEach(g => {
    if (g.module && g.stars > 0) STARS_BY_KEY[g.slug] = g.stars;
    if (g.online && g.online.stars > 0) STARS_BY_KEY['mp:' + g.slug] = g.online.stars;
});

const LOCK_CATALOG = [];
SOLO_GAMES.forEach(id => LOCK_CATALOG.push({ key: id, id: id, type: 'solo', stars: STARS_BY_KEY[id] || 0 }));
ONLINE_GAMES.forEach(id => { const k = 'mp:' + id; LOCK_CATALOG.push({ key: k, id: id, type: 'online', stars: STARS_BY_KEY[k] || 0 }); });

// key -> gerekli yıldız (hızlı arama)
const LOCK_STARS_BY_KEY = {};
LOCK_CATALOG.forEach(g => { LOCK_STARS_BY_KEY[g.key] = g.stars; });
