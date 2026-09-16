#!/usr/bin/env node
/* ============================================
   Oyun kataloğu üretici — data/games.json → js/catalog.js + index.html altbilgisi (B2a)
   --------------------------------------------
   data/games.json oyun bilgisinin TEK kaynağıdır (hub kayıt defteri, kilit listesi, TR.games,
   altbilgi bağlantıları, SEO üretici, duman testi). Bu araç JSON'u doğrular ve iki çıktı üretir:
     js/catalog.js   GAME_SECTIONS / GAME_CATALOG / GAME_MODULES (hub izdüşümü; about/cat yok)
     index.html      <!-- catalog:start --> … <!-- catalog:end --> arasındaki altbilgi grupları
   Üretilen dosyalar elle düzenlenmez; değişiklik JSON'a yapılır, sonra `npm run catalog`.

   Kullanım:
     node tools/build-catalog.js            # doğrula + üret (yalnız değişen dosya yazılır)
     node tools/build-catalog.js --check    # doğrula + üretilmişlerle karşılaştır; fark → çıkış 1 (CI)
   Bağımlılık yok (Node ≥ 20). Satır sonu: mevcut dosyanınki korunur (CRLF/LF); karşılaştırma LF'e göre.

   Şema (hepsi zorunlu, ? = isteğe bağlı):
     sections[]: { id (harf|sayi|bulmaca|yaratici|strateji|online), title, icon (js/app.js categoryIcons
                   anahtarı), color (#rrggbb — css/tokens.css --kat-<id> gelene kadar yedek) }
     games[]:    slug (benzersiz, [a-z0-9-]), name (benzersiz), module (ModülAdı | null; eslint.config.js
                 gameModuleGlobals listesinde), section, cat (SEO tür etiketi), subject (SUBJECTS),
                 age [min,max] (min<max; 4–12 raflarından en az birini keser), minutes (1–30, tipik tur),
                 levels (module varsa; ≥1 = modül.levels.length), teaches, short, about, players,
                 players_range [min, max|null], active (false = "Yakında": hub'da kapalı kart, landing noindex,
                 sitemap/llms/altbilgi dışı; eski comingSoon), stars (solo yıldız eşiği, 0 = açık), badge?,
                 online? { module, order (Online bölümü sırası 1..N, benzersiz), stars, badge?, files? },
                 files { js[], css[] } (tembel yükleme; sıra = çalışma sırası; yerel yol ya da https URL).
     Kural: module ya da online'dan en az biri; section 'online' ⇔ module null.
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_REL = 'data/games.json';
const CATALOG_REL = 'js/catalog.js';
const INDEX_REL = 'index.html';
const ESLINT_REL = 'eslint.config.js';
const START_MARK = '<!-- catalog:start -->';
const END_MARK = '<!-- catalog:end -->';

const SUBJECTS = ['turkce', 'ingilizce', 'matematik', 'fen', 'kodlama', 'strateji', 'sanat', 'spor', 'genel'];
const SECTION_IDS = ['harf', 'sayi', 'bulmaca', 'yaratici', 'strateji', 'online'];
const SHELF_MIN = 4;      // docs/tasarim-sozlesmesi.md §3.02: raflar 4-6 · 6-8 · 8-10 · 10-12
const SHELF_MAX = 12;
const MINUTES_MIN = 1;
const MINUTES_MAX = 30;
// Hub'a giden alanlar (js/catalog.js). about/cat yalnız SEO üreticide (seo/build_seo.py) okunur.
const HUB_FIELDS = ['slug', 'name', 'module', 'section', 'subject', 'age', 'minutes', 'levels', 'teaches',
    'players', 'players_range', 'active', 'stars', 'badge', 'online', 'files'];

// ── Yardımcılar ──

function fail(msg) {
    console.error(`[catalog] HATA: ${msg}`);
    process.exit(1);
}

function readText(rel) {
    const abs = path.join(ROOT, rel);
    return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

function toLf(text) { return text.replace(/\r\n/g, '\n'); }

// Mevcut dosya CRLF ise CRLF, değilse (ya da yoksa) index.html'in satır sonu (depo geleneği)
function eolFor(existing, fallback) {
    if (existing !== null) return existing.includes('\r\n') ? '\r\n' : '\n';
    return fallback;
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const isInt = (v) => Number.isInteger(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isExternal = (p) => /^https?:\/\//.test(p);

// eslint.config.js gameModuleGlobals listesi — require() 'globals' paketini ister; bağımlılıksız kalmak
// için metin taranır: `const gameModuleGlobals = Object.fromEntries([ 'A', 'B', … ].map(`
function eslintModuleNames() {
    const src = readText(ESLINT_REL);
    if (src === null) return null;
    const start = src.indexOf('gameModuleGlobals');
    if (start < 0) return null;
    const open = src.indexOf('[', start);
    const close = src.indexOf('].map(', open);
    if (open < 0 || close < 0) return null;
    return new Set(Array.from(src.slice(open, close).matchAll(/'([A-Za-z0-9_$]+)'/g), (m) => m[1]));
}

// ── Doğrulama ──

function validate(data) {
    const errors = [];
    const err = (m) => errors.push(m);
    const moduleNames = eslintModuleNames();
    if (!moduleNames) err(`${ESLINT_REL}: gameModuleGlobals listesi okunamadı`);

    if (!data || typeof data !== 'object' || Array.isArray(data)) { err('kök bir nesne olmalı ({ sections, games })'); return errors; }
    const sections = data.sections;
    const games = data.games;
    if (!Array.isArray(sections) || !sections.length) err('sections: boş olmayan dizi olmalı');
    if (!Array.isArray(games) || !games.length) err('games: boş olmayan dizi olmalı');
    if (errors.length) return errors;

    const sectionIds = new Set();
    sections.forEach((s, i) => {
        const at = `sections[${i}]`;
        if (!s || typeof s !== 'object') { err(`${at}: nesne olmalı`); return; }
        if (!SECTION_IDS.includes(s.id)) err(`${at}.id: ${SECTION_IDS.join('|')} olmalı (${s.id})`);
        if (sectionIds.has(s.id)) err(`${at}.id: tekrar (${s.id})`);
        sectionIds.add(s.id);
        if (!isStr(s.title)) err(`${at}.title: boş olamaz`);
        if (!isStr(s.icon) || !/^[a-z]+$/.test(s.icon)) err(`${at}.icon: [a-z]+ (categoryIcons anahtarı) olmalı`);
        if (!/^#[0-9A-Fa-f]{6}$/.test(String(s.color))) err(`${at}.color: #rrggbb olmalı`);
    });

    const slugs = new Set();
    const names = new Set();
    const orders = new Map();
    let onlineCount = 0;

    function checkModule(at, name) {
        if (!isStr(name) || !/^[A-Z][A-Za-z0-9_$]*$/.test(name)) { err(`${at}: modül adı olmalı (${name})`); return; }
        if (moduleNames && !moduleNames.has(name)) err(`${at}: "${name}" ${ESLINT_REL} gameModuleGlobals listesinde yok`);
    }

    function checkFiles(at, files, required) {
        if (files === undefined) { if (required) err(`${at}: zorunlu`); return; }
        if (!files || typeof files !== 'object' || Array.isArray(files)) { err(`${at}: { js:[], css:[] } olmalı`); return; }
        for (const key of ['js', 'css']) {
            const list = files[key];
            if (!Array.isArray(list)) { err(`${at}.${key}: dizi olmalı`); continue; }
            list.forEach((p, i) => {
                const where = `${at}.${key}[${i}]`;
                if (!isStr(p)) { err(`${where}: boş olamaz`); return; }
                if (/[?#]/.test(p)) err(`${where}: sorgu/parça yok (?v= elle artırılmaz; deploy hash'ler): ${p}`);
                const ext = key === 'js' ? /\.m?js$/ : /\.css$/;
                if (!ext.test(p.split('?')[0])) err(`${where}: .${key} dosyası olmalı: ${p}`);
                if (isExternal(p)) return;
                if (p.startsWith('/') || p.includes('..')) err(`${where}: köke göre yol olmalı (js/…, css/…): ${p}`);
                else if (!fs.existsSync(path.join(ROOT, p))) err(`${where}: dosya yok: ${p}`);
            });
        }
        const extra = Object.keys(files).filter((k) => k !== 'js' && k !== 'css');
        if (extra.length) err(`${at}: bilinmeyen anahtar ${extra.join(', ')}`);
    }

    games.forEach((g, i) => {
        const at = `games[${i}]${g && g.slug ? ` (${g.slug})` : ''}`;
        if (!g || typeof g !== 'object') { err(`${at}: nesne olmalı`); return; }
        if (!isStr(g.slug) || !/^[a-z0-9-]+$/.test(g.slug)) err(`${at}.slug: [a-z0-9-] olmalı`);
        else if (slugs.has(g.slug)) err(`${at}.slug: tekrar`);
        slugs.add(g.slug);
        if (!isStr(g.name)) err(`${at}.name: boş olamaz`);
        else if (names.has(g.name)) err(`${at}.name: tekrar (${g.name})`);
        names.add(g.name);

        const hasModule = g.module !== null && g.module !== undefined;
        if (g.module === undefined) err(`${at}.module: zorunlu (ModülAdı ya da null)`);
        else if (hasModule) checkModule(`${at}.module`, g.module);

        if (!sectionIds.has(g.section)) err(`${at}.section: sections listesinde yok (${g.section})`);
        if ((g.section === 'online') === hasModule) err(`${at}.section: 'online' yalnız module null iken (ve o zaman zorunlu)`);
        if (!isStr(g.cat)) err(`${at}.cat: boş olamaz`);
        if (!SUBJECTS.includes(g.subject)) err(`${at}.subject: ${SUBJECTS.join('|')} olmalı (${g.subject})`);

        if (!Array.isArray(g.age) || g.age.length !== 2 || !g.age.every(isInt)) err(`${at}.age: [min, max] tam sayı olmalı`);
        else {
            const [lo, hi] = g.age;
            if (lo >= hi) err(`${at}.age: min < max olmalı (${lo}-${hi})`);
            if (hi <= SHELF_MIN || lo >= SHELF_MAX) err(`${at}.age: ${SHELF_MIN}-${SHELF_MAX} raflarından birini kesmeli (${lo}-${hi})`);
        }
        if (!isInt(g.minutes) || g.minutes < MINUTES_MIN || g.minutes > MINUTES_MAX) err(`${at}.minutes: ${MINUTES_MIN}–${MINUTES_MAX} tam sayı olmalı (${g.minutes})`);
        if (hasModule) { if (!isInt(g.levels) || g.levels < 1) err(`${at}.levels: module varsa ≥ 1 tam sayı olmalı`); }
        else if (g.levels !== undefined) err(`${at}.levels: yalnız module varsa`);

        for (const k of ['teaches', 'short', 'about', 'players']) if (!isStr(g[k])) err(`${at}.${k}: boş olamaz`);
        if (!Array.isArray(g.players_range) || g.players_range.length !== 2 || !isInt(g.players_range[0]) || g.players_range[0] < 1 ||
            !(g.players_range[1] === null || (isInt(g.players_range[1]) && g.players_range[1] >= g.players_range[0]))) {
            err(`${at}.players_range: [min ≥ 1, max ≥ min | null] olmalı`);
        }
        if (typeof g.active !== 'boolean') err(`${at}.active: true/false olmalı`);
        if (!isInt(g.stars) || g.stars < 0) err(`${at}.stars: ≥ 0 tam sayı olmalı`);
        if (g.badge !== undefined && !isStr(g.badge)) err(`${at}.badge: boş olamaz`);
        if (g.comingSoon !== undefined) err(`${at}.comingSoon: kullanılmaz — active:false yaz`);

        const o = g.online;
        if (o !== undefined) {
            if (!o || typeof o !== 'object' || Array.isArray(o)) err(`${at}.online: nesne olmalı`);
            else {
                onlineCount += 1;
                checkModule(`${at}.online.module`, o.module);
                if (!isInt(o.order) || o.order < 1) err(`${at}.online.order: ≥ 1 tam sayı olmalı`);
                else if (orders.has(o.order)) err(`${at}.online.order: ${o.order} zaten ${orders.get(o.order)}'da`);
                orders.set(o.order, g.slug);
                if (!isInt(o.stars) || o.stars < 0) err(`${at}.online.stars: ≥ 0 tam sayı olmalı`);
                if (o.badge !== undefined && !isStr(o.badge)) err(`${at}.online.badge: boş olamaz`);
                checkFiles(`${at}.online.files`, o.files, false);
                const extra = Object.keys(o).filter((k) => !['module', 'order', 'stars', 'badge', 'files'].includes(k));
                if (extra.length) err(`${at}.online: bilinmeyen anahtar ${extra.join(', ')}`);
            }
        }
        if (!hasModule && o === undefined) err(`${at}: module ya da online'dan en az biri olmalı`);
        checkFiles(`${at}.files`, g.files, true);
    });
    for (let n = 1; n <= onlineCount; n += 1) if (!orders.has(n)) err(`online.order: 1..${onlineCount} aralığında ${n} eksik`);
    return errors;
}

// ── Üretim ──

function hubRecord(g) {
    const out = {};
    for (const k of HUB_FIELDS) if (g[k] !== undefined) out[k] = g[k];
    return out;
}

function buildCatalogJs(data) {
    const games = data.games;
    const moduleNames = [];
    for (const g of games) if (g.module) moduleNames.push(g.module);
    for (const g of onlineOrdered(games)) if (!moduleNames.includes(g.online.module)) moduleNames.push(g.online.module);
    const solo = games.filter((g) => g.module).length;
    const lines = [
        '/* ============================================',
        `   ÜRETİLMİŞ — kaynak ${DATA_REL} (node tools/build-catalog.js). ELLE DÜZENLENMEZ.`,
        '   --------------------------------------------',
        '   Hub kataloğu: js/app.js (kayıt defteri), js/lock-catalog.js (kilit listesi), js/i18n.js (TR.games)',
        `   ve js/admin.js buradan türetir. Değişiklik ${DATA_REL}'a yapılır, sonra \`npm run catalog\`.`,
        '   GAME_SECTIONS : hub bölümleri, görünüm sırasıyla; icon = js/app.js categoryIcons anahtarı,',
        '                   color = css/tokens.css --kat-<id> gelene kadar yedek renk.',
        `   GAME_CATALOG  : ${games.length} kayıt (${solo} solo + ${onlineOrdered(games).length} online), hub sırası; about/cat gibi yalnız`,
        '                   SEO üreticide (seo/build_seo.py) kullanılan alanlar burada yok.',
        '   GAME_MODULES  : modül adı → tembel referans. Üst düzey const modüller window\'a bağlanmaz',
        '                   (window[ad] çalışmaz), eval CSP\'yi kırar — tek güvenli yol bu thunk tablosudur.',
        '   Sıra: index.html bu dosyayı js/errors.js\'ten hemen sonra, i18n/lock-catalog/app.js\'ten önce yükler.',
        '   ============================================ */',
        'const GAME_SECTIONS = [',
        ...data.sections.map((s) => `    ${JSON.stringify(s)},`),
        '];',
        'const GAME_CATALOG = [',
        ...games.map((g) => `    ${JSON.stringify(hubRecord(g))},`),
        '];',
        'const GAME_MODULES = {',
        ...moduleNames.map((m) => `    ${m}: () => ${m},`),
        '};',
        '',
    ];
    return lines.join('\n');
}

function onlineOrdered(games) {
    return games.filter((g) => g.online).sort((a, b) => a.online.order - b.online.order);
}

// index.html altbilgi grupları — biçim A5a ile birebir (24/28/32 boşluk girinti)
function buildFooterGroups(data) {
    const games = data.games;
    const groups = [];
    for (const s of data.sections) {
        const items = s.id === 'online'
            ? onlineOrdered(games).filter((g) => g.section === 'online' && g.active)
            : games.filter((g) => g.section === s.id && g.module && g.active);
        if (!items.length) continue;
        groups.push(
            '                        <div class="hub-footer-group">',
            `                            <h3>${escapeHtml(s.title)}</h3>`,
            '                            <ul>',
            ...items.map((g) => `                                <li><a href="/oyunlar/${g.slug}/">${escapeHtml(g.name)}</a></li>`),
            '                            </ul>',
            '                        </div>',
        );
    }
    return groups.join('\n');
}

function spliceFooter(indexLf, groups) {
    const a = indexLf.indexOf(START_MARK);
    const b = indexLf.indexOf(END_MARK);
    if (a < 0 || b < 0) fail(`${INDEX_REL}: ${START_MARK} / ${END_MARK} işaretleri yok`);
    if (indexLf.indexOf(START_MARK, a + 1) >= 0 || indexLf.indexOf(END_MARK, b + 1) >= 0) fail(`${INDEX_REL}: işaret birden fazla`);
    if (b < a) fail(`${INDEX_REL}: catalog:end, catalog:start'tan önce`);
    const endLineStart = indexLf.lastIndexOf('\n', b) + 1;          // END işaretinin satır başı (girintisiyle)
    return indexLf.slice(0, a + START_MARK.length) + '\n' + groups + '\n' + indexLf.slice(endLineStart);
}

// ── Ana akış ──

function main() {
    const args = process.argv.slice(2);
    const check = args.includes('--check');
    const unknown = args.filter((a) => a !== '--check');
    if (unknown.length) fail(`bilinmeyen argüman: ${unknown.join(' ')} (yalnız --check)`);

    const raw = readText(DATA_REL);
    if (raw === null) fail(`${DATA_REL} yok`);
    let data;
    try { data = JSON.parse(raw); } catch (e) { fail(`${DATA_REL} JSON değil: ${e.message}`); }

    const errors = validate(data);
    if (errors.length) {
        for (const e of errors) console.error(`[catalog] ${e}`);
        fail(`${DATA_REL}: ${errors.length} şema hatası`);
    }

    const indexText = readText(INDEX_REL);
    if (indexText === null) fail(`${INDEX_REL} yok`);
    const indexLf = toLf(indexText);
    const outputs = [
        { rel: CATALOG_REL, existing: readText(CATALOG_REL), next: buildCatalogJs(data) },
        { rel: INDEX_REL, existing: indexText, next: spliceFooter(indexLf, buildFooterGroups(data)) },
    ];

    const solo = data.games.filter((g) => g.module).length;
    const online = onlineOrdered(data.games).length;
    const inactive = data.games.filter((g) => !g.active).map((g) => g.slug);
    console.log(`[catalog] ${DATA_REL}: ${data.games.length} kayıt (${solo} solo + ${online} online; kapalı: ${inactive.join(', ') || 'yok'}) — şema OK`);

    const stale = outputs.filter((o) => o.existing === null || toLf(o.existing) !== o.next);
    if (check) {
        if (stale.length) {
            for (const o of stale) console.error(`[catalog] güncel değil: ${o.rel}`);
            fail(`üretilmiş çıktı ${DATA_REL} ile uyuşmuyor — \`npm run catalog\` çalıştırıp commit et`);
        }
        console.log('[catalog] check OK — js/catalog.js ve index.html altbilgisi data/games.json ile aynı');
        return;
    }
    const fallbackEol = eolFor(indexText, '\n');
    for (const o of stale) {
        const eol = eolFor(o.existing, fallbackEol);
        fs.writeFileSync(path.join(ROOT, o.rel), eol === '\n' ? o.next : o.next.replace(/\n/g, eol), 'utf8');
        console.log(`[catalog] yazıldı: ${o.rel}`);
    }
    if (!stale.length) console.log('[catalog] değişiklik yok');
}

main();
