/* ============================================
   Duman testi için aktif oyun slug'ları — test ANINDA data/games.json'dan türetilir (B2a).
   - module olan kayıtlar → solo (hub sırası); online olan kayıtlar → online (online.order sırası)
   - active:false (hub'da "Yakında", landing noindex) → listeden düşer, `skipped`'a girer
   Listeler elle kopyalanmaz; JSON'a oyun eklenince test kendiliğinden genişler.
   (Eski yol: js/lock-catalog.js + js/app.js comingSoon regex'i — artık iki dosya da aynı JSON'dan türer.)
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data', 'games.json');
const MIN_EXPECTED_SLUGS = 50;   // veri sessizce boş dönerse test "geçmesin"

function loadGames() {
    const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    if (!data || !Array.isArray(data.games)) throw new Error('data/games.json: "games" dizisi yok');
    return data.games;
}

/**
 * @returns {{ solo: string[], online: string[], skipped: string[] }}
 *   solo/online: derin bağlantıyla (`/?oyun=<slug>`) açılması beklenen aktif slug'lar.
 *   skipped: active:false nedeniyle atlananlar (rapor için).
 */
function getActiveSlugs() {
    const games = loadGames();
    const skipped = games.filter((g) => !g.active).map((g) => g.slug);
    const solo = games.filter((g) => g.active && g.module).map((g) => g.slug);
    const online = games
        .filter((g) => g.active && g.online)
        .sort((a, b) => a.online.order - b.online.order)
        .map((g) => g.slug);

    const total = solo.length + online.length;
    if (total < MIN_EXPECTED_SLUGS) {
        throw new Error(`Yalnız ${total} aktif slug bulundu (beklenen ≥ ${MIN_EXPECTED_SLUGS}) — data/games.json biçimi değişmiş olabilir`);
    }
    return { solo, online, skipped };
}

module.exports = { getActiveSlugs };
