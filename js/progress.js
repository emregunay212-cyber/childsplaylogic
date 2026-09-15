/* ============================================
   OYUN BAHÇESİ - İlerleme Takibi
   --------------------------------------------
   - localStorage 'oyun_bahcesi_progress' tek kaynak; bellekte önbelleklenir
     (her getter yeniden parse etmez), başka sekme yazarsa 'storage' ile tazelenir.
   - Yüklemede şema doğrulanır: bozuk/yanlış şekilli kayıt yedeklenip
     ('oyun_bahcesi_progress_bozuk') varsayılana dönülür — hub açılmaya devam eder.
   - resetToken: admin global sıfırlamasının bu PROFİLDE görülen jetonu. Blob'la
     birlikte buluta gider (users/{uid}/progress) → cihazdan bağımsız karşılaştırılır.
   ============================================ */

const Progress = (() => {
    const STORAGE_KEY = 'oyun_bahcesi_progress';
    const BACKUP_KEY = 'oyun_bahcesi_progress_bozuk';
    const LOG_SNIPPET_LEN = 200;
    // Bulut senkron kancası — Google girişinde Auth ayarlar; her save sonrası çağrılır.
    // Misafir/çıkışta null'dur → yerel kalır, buluta yazılmaz.
    let syncHook = null;
    // Bellek önbelleği: null = localStorage'dan (yeniden) okunmalı
    let cache = null;

    const defaultData = {
        version: 1,
        games: {},
        totalStars: 0,
        settings: {
            soundEnabled: true,
            teacherUnlocks: {},
        }
    };

    function fresh() { return JSON.parse(JSON.stringify(defaultData)); }

    function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

    // Beklenen şekil: düz nesne + games nesnesi + sayısal totalStars + version
    function isValidShape(v) {
        return isPlainObject(v)
            && typeof v.version === 'number'
            && isPlainObject(v.games)
            && typeof v.totalStars === 'number';
    }

    // Geçerli kabul edilmiş veriyi bilinen şekle tamamla (eksik alt alanlar).
    // resetToken bilerek varsayılana bağlanmaz: alan YOKSA profil hiç damgalanmamıştır (bkz. getResetToken).
    function normalize(data) {
        const merged = Object.assign(fresh(), isPlainObject(data) ? data : {});
        if (!isPlainObject(merged.games)) merged.games = {};
        if (!isPlainObject(merged.settings)) merged.settings = fresh().settings;
        return merged;
    }

    function backupCorrupt(raw, why) {
        console.warn('İlerleme kaydı bozuk (' + why + ') — ' + BACKUP_KEY + ' anahtarına yedeklenip sıfırdan başlanıyor:',
            String(raw).slice(0, LOG_SNIPPET_LEN));
        try { localStorage.setItem(BACKUP_KEY, String(raw)); } catch (e) { console.warn('Yedek yazılamadı:', e); }
    }

    // localStorage'dan oku → geçerli veri ya da null (kayıt yok / bozuk)
    function readStorage() {
        let raw = null;
        try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { console.warn('İlerleme okunamadı:', e); return null; }
        if (raw == null || raw === '') return null;
        let parsed;
        try { parsed = JSON.parse(raw); } catch (e) { backupCorrupt(raw, 'JSON çözümlenemedi: ' + e.message); return null; }
        if (!isValidShape(parsed)) { backupCorrupt(raw, 'şema uyuşmuyor'); return null; }
        return normalize(parsed);
    }

    function load() {
        if (!cache) cache = readStorage() || fresh();
        return cache;
    }

    function save(data) {
        cache = data;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('İlerleme kaydedilemedi:', e);
        }
        // Google kullanıcısı aktifse buluta da yansıt (Auth ayarlar)
        if (syncHook) { try { syncHook(data); } catch (e) { console.error('Bulut senkron kancası hata verdi:', e); } }
    }

    // Başka sekme yazdı (ya da localStorage temizlendi) → önbelleği düşür, sonraki getter yeniden okur
    try {
        window.addEventListener('storage', (e) => {
            if (!e || e.key === null || e.key === STORAGE_KEY) cache = null;
        });
    } catch (e) { /* window yok (test ortamı) */ }

    // Salt okuma: kayıt yoksa önbelleğe boş girdi EKLEMEDEN varsayılan döner (blob şişmesin)
    function getGameProgress(gameId) {
        const data = load();
        return data.games[gameId] || { levels: {}, totalStars: 0 };
    }

    function getLevelStars(gameId, level) {
        const game = getGameProgress(gameId);
        return game.levels[level]?.stars || 0;
    }

    function setLevelStars(gameId, level, stars) {
        const data = load();
        if (!data.games[gameId]) {
            data.games[gameId] = { levels: {}, totalStars: 0 };
        }
        const current = data.games[gameId].levels[level]?.stars || 0;
        if (stars > current) {
            data.games[gameId].levels[level] = {
                stars,
                ...(data.games[gameId].levels[level] || {}),
            };
            data.games[gameId].levels[level].stars = stars;

            // Toplam yıldız hesapla
            let gameTotal = 0;
            for (const lv in data.games[gameId].levels) {
                gameTotal += data.games[gameId].levels[lv].stars || 0;
            }
            data.games[gameId].totalStars = gameTotal;

            // Genel toplam
            let total = 0;
            for (const gId in data.games) {
                total += data.games[gId].totalStars || 0;
            }
            data.totalStars = total;

            save(data);
        }
        return stars;
    }

    function getTotalStars() {
        const data = load();
        return data.totalStars || 0;
    }

    function getGameTotalStars(gameId) {
        const game = getGameProgress(gameId);
        return game.totalStars || 0;
    }

    function getMaxStarsForGame(gameId) {
        const game = getGameProgress(gameId);
        let max = 0;
        for (const lv in game.levels) {
            max = Math.max(max, game.levels[lv].stars || 0);
        }
        return max;
    }

    function getSettings() {
        const data = load();
        return data.settings || defaultData.settings;
    }

    function saveSetting(key, value) {
        const data = load();
        if (!data.settings) data.settings = {};
        data.settings[key] = value;
        save(data);
    }

    // Öğretmen/veli kilit açma override'ları (oyun bazlı): { 'oyun-id': true }
    function getTeacherUnlocks() {
        const s = getSettings();
        return (s && s.teacherUnlocks) || {};
    }

    function setTeacherUnlock(gameId, on) {
        const map = getTeacherUnlocks();
        if (on) map[gameId] = true;
        else delete map[gameId];
        saveSetting('teacherUnlocks', map);
    }

    function isTeacherUnlocked(gameId) {
        return !!getTeacherUnlocks()[gameId];
    }

    function clearTeacherUnlocks() {
        saveSetting('teacherUnlocks', {});
    }

    function resetAll() {
        save(fresh());
    }

    // ── Admin global sıfırlama jetonu (app.js applyAdminConfig kullanır) ──
    // null → bu profil hiç damgalanmamış (eski kayıt / yeni hesap / az önce sıfırlanmış blob)
    function getResetToken() {
        const t = load().resetToken;
        return typeof t === 'number' ? t : null;
    }

    // Jetonu ilerlemeye dokunmadan damgala (ilk damga ya da daha yeni jeton) → bulutla taşınır
    function markResetSeen(token) {
        const tok = Number(token) || 0;
        const data = load();
        if (typeof data.resetToken === 'number' && data.resetToken >= tok) return;
        data.resetToken = tok;
        save(data);
    }

    // Sıfırla + jetonu aynı kayıtta damgala (tek save → tek bulut yazımı)
    function applyReset(token) {
        const data = fresh();
        data.resetToken = Number(token) || 0;
        save(data);
    }

    // ── Bulut senkron yardımcıları (Auth modülü kullanır) ──
    // save() sonrası çağrılacak kancayı ayarla (Google: buluta yaz; misafir/çıkış: null)
    function setSyncHook(fn) { syncHook = fn || null; }

    // Tüm ilerlemeyi buluttan gelen veriyle değiştir (varsayılan şekille güvenli birleştir)
    function replaceAll(data) {
        save(normalize(data));
    }

    return {
        setSyncHook,
        replaceAll,
        getLevelStars,
        setLevelStars,
        getTotalStars,
        getGameTotalStars,
        getMaxStarsForGame,
        getGameProgress,
        getSettings,
        saveSetting,
        getTeacherUnlocks,
        setTeacherUnlock,
        isTeacherUnlocked,
        clearTeacherUnlocks,
        resetAll,
        getResetToken,
        markResetSeen,
        applyReset,
    };
})();
