/* ============================================
   OYUN BAHÇESİ - İlerleme Takibi
   ============================================ */

const Progress = (() => {
    const STORAGE_KEY = 'oyun_bahcesi_progress';

    const defaultData = {
        version: 1,
        games: {},
        totalStars: 0,
        settings: {
            soundEnabled: true,
        }
    };

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.warn('İlerleme yüklenemedi:', e);
        }
        return JSON.parse(JSON.stringify(defaultData));
    }

    function save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('İlerleme kaydedilemedi:', e);
        }
    }

    function getGameProgress(gameId) {
        const data = load();
        if (!data.games[gameId]) {
            data.games[gameId] = { levels: {}, totalStars: 0 };
        }
        return data.games[gameId];
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

    function resetAll() {
        save(JSON.parse(JSON.stringify(defaultData)));
    }

    return {
        getLevelStars,
        setLevelStars,
        getTotalStars,
        getGameTotalStars,
        getMaxStarsForGame,
        getGameProgress,
        getSettings,
        saveSetting,
        resetAll,
    };
})();
