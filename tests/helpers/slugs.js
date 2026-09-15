/* ============================================
   Duman testi için aktif oyun slug'ları — test ANINDA koddan türetilir.
   - js/lock-catalog.js: SOLO_GAMES + ONLINE_GAMES (tek kaynak, hub sırası)
   - js/app.js: `comingSoon: true` işaretli kayıt(lar) → modül adı → js/games/<dosya>
     içindeki `const id = '<slug>'` ile slug'a çevrilir ve listeden düşülür.
   Listeler elle kopyalanmaz; kataloğa oyun eklenince test kendiliğinden genişler.
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIN_EXPECTED_SLUGS = 50;   // regex sessizce boş dönerse test "geçmesin"

function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// `const NAME = [ 'a', 'b', … ];` biçimindeki string dizisini çıkarır.
function extractStringArray(source, constName) {
    const re = new RegExp('const\\s+' + constName + '\\s*=\\s*\\[([\\s\\S]*?)\\];');
    const m = re.exec(source);
    if (!m) throw new Error(`js/lock-catalog.js içinde "${constName}" dizisi bulunamadı`);
    return Array.from(m[1].matchAll(/'([a-z0-9-]+)'/g), (x) => x[1]);
}

// js/app.js kayıt defterinde `{ game: X, …, comingSoon: true }` olan modül adları.
function comingSoonModuleNames(appSource) {
    return Array.from(
        appSource.matchAll(/\{\s*game:\s*([A-Za-z0-9_$]+)[^}]*comingSoon:\s*true/g),
        (m) => m[1],
    );
}

// Modül adı (örn. KelimeMadeni3D) → js/games/*.js içindeki `const id = '…'` slug'ı.
function moduleNameToSlug(moduleName) {
    const dir = path.join(ROOT, 'js', 'games');
    const declRe = new RegExp('^\\s*const\\s+' + moduleName + '\\s*=', 'm');
    for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.js')) continue;
        const src = fs.readFileSync(path.join(dir, file), 'utf8');
        if (!declRe.test(src)) continue;
        const id = /const\s+id\s*=\s*'([a-z0-9-]+)'/.exec(src);
        if (!id) throw new Error(`${file}: "${moduleName}" modülünde "const id = '…'" bulunamadı`);
        return id[1];
    }
    throw new Error(`js/games/ altında "${moduleName}" modülünü tanımlayan dosya yok`);
}

/**
 * @returns {{ solo: string[], online: string[], skipped: string[] }}
 *   solo/online: derin bağlantıyla (`/?oyun=<slug>`) açılması beklenen aktif slug'lar.
 *   skipped: comingSoon nedeniyle atlananlar (rapor için).
 */
function getActiveSlugs() {
    const catalog = read('js/lock-catalog.js');
    const app = read('js/app.js');

    const skipped = comingSoonModuleNames(app).map(moduleNameToSlug);
    const isActive = (slug) => !skipped.includes(slug);

    const solo = extractStringArray(catalog, 'SOLO_GAMES').filter(isActive);
    const online = extractStringArray(catalog, 'ONLINE_GAMES').filter(isActive);

    const total = solo.length + online.length;
    if (total < MIN_EXPECTED_SLUGS) {
        throw new Error(`Yalnız ${total} aktif slug bulundu (beklenen ≥ ${MIN_EXPECTED_SLUGS}) — lock-catalog.js biçimi değişmiş olabilir`);
    }
    return { solo, online, skipped };
}

module.exports = { getActiveSlugs };
