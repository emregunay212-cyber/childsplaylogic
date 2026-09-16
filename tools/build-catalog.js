#!/usr/bin/env node
/* ============================================
   Oyun kataloğu üretici — data/games.json → js/catalog.js + index.html altbilgisi/SEO bloğu (B2a, B2b)
   --------------------------------------------
   data/games.json oyun bilgisinin TEK kaynağıdır (hub kayıt defteri, yaş rafları, kilit listesi, TR.games,
   altbilgi bağlantıları, SEO üretici, duman testi). Bu araç JSON'u doğrular ve iki çıktı üretir:
     js/catalog.js   GAME_SHELVES / GAME_SECTIONS / GAME_CATALOG / GAME_MODULES (hub izdüşümü; about/cat yok)
     index.html      <!-- catalog:start --> … <!-- catalog:end -->   altbilgi grupları
                     <!-- catalog:lead:start --> … <!-- catalog:lead:end --> altbilgi giriş cümlesi (oyun sayıları)
                     <!-- catalog:seo:start --> … <!-- catalog:seo:end -->   SEO içerik bloğu (sayılar + oyun adları)
   Üretilen dosyalar elle düzenlenmez; değişiklik JSON'a yapılır, sonra `npm run catalog`.

   Kullanım:
     node tools/build-catalog.js            # doğrula + üret (yalnız değişen dosya yazılır)
     node tools/build-catalog.js --check    # doğrula + üretilmişlerle karşılaştır; fark → çıkış 1 (CI)
   Bağımlılık yok (Node ≥ 20). Satır sonu: mevcut dosyanınki korunur (CRLF/LF); karşılaştırma LF'e göre.

   Şema (hepsi zorunlu, ? = isteğe bağlı):
     shelves[]:  { id ([a-z0-9-], benzersiz), label, yas (görünen etiket, "4-6"), ages [ilk, son] (rafın kapsadığı
                   tam yaşlar, KAPALI aralık; raflar bitişik ve 4..12'yi kesintisiz kaplar) } — B2b yaş rafı.
                   Oyun age [min,max] rafın ages aralığıyla kesişiyorsa o rafa girer (birden çok raf olabilir).
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
const LEAD_START = '<!-- catalog:lead:start -->';
const LEAD_END = '<!-- catalog:lead:end -->';
const SEO_START = '<!-- catalog:seo:start -->';
const SEO_END = '<!-- catalog:seo:end -->';

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
// Dış dosya yalnız https + izinli CDN (vercel.json CSP script-src ile aynı liste); yerel dosya yalnız js/, css/ altında.
// B8a: chess.js ve GLTFLoader js/lib/ altına alındı, unpkg düştü; cdnjs yalnız three.min.js r128 için (B6 ile o da düşer).
const CDN_HOSTS = ['cdnjs.cloudflare.com'];
const LOCAL_PREFIX = /^(js\/|css\/)/;
// Metin alanları HTML sink'lerine (js/app.js kart şablonu innerHTML) kaçışsız gidebilir → < > yasak
const hasAngle = (v) => /[<>]/.test(String(v));

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

    if (!data || typeof data !== 'object' || Array.isArray(data)) { err('kök bir nesne olmalı ({ shelves, sections, games })'); return errors; }
    const shelves = data.shelves;
    const sections = data.sections;
    const games = data.games;
    if (!Array.isArray(shelves) || !shelves.length) err('shelves: boş olmayan dizi olmalı (yaş rafları, B2b)');
    if (!Array.isArray(sections) || !sections.length) err('sections: boş olmayan dizi olmalı');
    if (!Array.isArray(games) || !games.length) err('games: boş olmayan dizi olmalı');
    if (errors.length) return errors;

    // Raflar: bitişik kapalı yaş aralıkları, 4..12'yi kesintisiz kaplar (ilk raf 4'te başlar, son raf 12'de biter)
    const shelfIds = new Set();
    let expectNext = SHELF_MIN;
    shelves.forEach((s, i) => {
        const at = `shelves[${i}]`;
        if (!s || typeof s !== 'object') { err(`${at}: nesne olmalı`); return; }
        if (!isStr(s.id) || !/^[a-z0-9-]+$/.test(s.id)) err(`${at}.id: [a-z0-9-] olmalı`);
        else if (shelfIds.has(s.id)) err(`${at}.id: tekrar (${s.id})`);
        shelfIds.add(s.id);
        for (const k of ['label', 'yas']) {
            if (!isStr(s[k])) err(`${at}.${k}: boş olamaz`);
            else if (hasAngle(s[k])) err(`${at}.${k}: < > içeremez: ${s[k]}`);
        }
        if (!Array.isArray(s.ages) || s.ages.length !== 2 || !s.ages.every(isInt) || s.ages[0] > s.ages[1]) {
            err(`${at}.ages: [ilk, son] tam sayı (ilk ≤ son) olmalı`);
        } else {
            if (s.ages[0] !== expectNext) err(`${at}.ages: ${expectNext} ile başlamalı (raflar bitişik; ${s.ages[0]} bulundu)`);
            expectNext = s.ages[1] + 1;
        }
        const extra = Object.keys(s).filter((k) => !['id', 'label', 'yas', 'ages'].includes(k));
        if (extra.length) err(`${at}: bilinmeyen anahtar ${extra.join(', ')}`);
    });
    if (expectNext !== SHELF_MAX + 1) err(`shelves: son raf ${SHELF_MAX} yaşında bitmeli (${expectNext - 1} bulundu)`);

    const sectionIds = new Set();
    sections.forEach((s, i) => {
        const at = `sections[${i}]`;
        if (!s || typeof s !== 'object') { err(`${at}: nesne olmalı`); return; }
        if (!SECTION_IDS.includes(s.id)) err(`${at}.id: ${SECTION_IDS.join('|')} olmalı (${s.id})`);
        if (sectionIds.has(s.id)) err(`${at}.id: tekrar (${s.id})`);
        sectionIds.add(s.id);
        if (!isStr(s.title)) err(`${at}.title: boş olamaz`);
        else if (hasAngle(s.title)) err(`${at}.title: < > içeremez: ${s.title}`);
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
                if (isExternal(p)) {
                    let u = null; try { u = new URL(p); } catch (e) { u = null; }
                    if (!u || u.protocol !== 'https:' || !CDN_HOSTS.includes(u.hostname)) err(`${where}: dış dosya yalnız https ve ${CDN_HOSTS.join('/')}: ${p}`);
                    return;
                }
                if (p.startsWith('/') || p.includes('..') || !LOCAL_PREFIX.test(p)) err(`${where}: köke göre yol olmalı (js/…, css/…): ${p}`);
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
        else if (hasAngle(g.name)) err(`${at}.name: < > içeremez (innerHTML sink'i): ${g.name}`);
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
        if (g.badge !== undefined && (!isStr(g.badge) || hasAngle(g.badge))) err(`${at}.badge: boş olamaz, < > içeremez`);
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
                if (o.badge !== undefined && (!isStr(o.badge) || hasAngle(o.badge))) err(`${at}.online.badge: boş olamaz, < > içeremez`);
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
        '   Hub kataloğu: js/app.js (kayıt defteri), js/hub-ia.js (yaş rafı), js/lock-catalog.js (kilit listesi),',
        `   js/i18n.js (TR.games) ve js/admin.js buradan türetir. Değişiklik ${DATA_REL}'a yapılır, sonra \`npm run catalog\`.`,
        '   GAME_SHELVES  : yaş rafları (B2b), görünüm sırasıyla; ages = kapsanan tam yaşlar [ilk, son] (kapalı aralık),',
        '                   yas = görünen etiket. Oyun age aralığı ages ile kesişiyorsa o rafa girer (js/hub-ia.js).',
        '   GAME_SECTIONS : hub bölümleri, görünüm sırasıyla; icon = js/app.js categoryIcons anahtarı,',
        '                   color = css/tokens.css --kat-<id> gelene kadar yedek renk.',
        `   GAME_CATALOG  : ${games.length} kayıt (${solo} solo + ${onlineOrdered(games).length} online), hub sırası; about/cat gibi yalnız`,
        '                   SEO üreticide (seo/build_seo.py) kullanılan alanlar burada yok.',
        '   GAME_MODULES  : modül adı → tembel referans. Üst düzey const modüller window\'a bağlanmaz',
        '                   (window[ad] çalışmaz), eval CSP\'yi kırar — tek güvenli yol bu thunk tablosudur.',
        '   Sıra: index.html bu dosyayı js/errors.js\'ten hemen sonra, i18n/lock-catalog/app.js\'ten önce yükler.',
        '   ============================================ */',
        '/* exported GAME_SHELVES */',
        'const GAME_SHELVES = [',
        ...data.shelves.map((s) => `    ${JSON.stringify(s)},`),
        '];',
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

// index.html işaret çifti arasını yeniden yazar: START satırının girintisi gövde satırlarına uygulanır
function spliceBlock(indexLf, startMark, endMark, bodyLines) {
    const a = indexLf.indexOf(startMark);
    const b = indexLf.indexOf(endMark);
    if (a < 0 || b < 0) fail(`${INDEX_REL}: ${startMark} / ${endMark} işaretleri yok`);
    if (indexLf.indexOf(startMark, a + 1) >= 0 || indexLf.indexOf(endMark, b + 1) >= 0) fail(`${INDEX_REL}: işaret birden fazla (${startMark})`);
    if (b < a) fail(`${INDEX_REL}: ${endMark}, ${startMark}'tan önce`);
    const startLineStart = indexLf.lastIndexOf('\n', a) + 1;
    const indent = indexLf.slice(startLineStart, a).match(/^\s*/)[0];
    const endLineStart = indexLf.lastIndexOf('\n', b) + 1;          // END işaretinin satır başı (girintisiyle)
    const body = bodyLines.map((l) => (l ? indent + l : l)).join('\n');
    return indexLf.slice(0, a + startMark.length) + '\n' + body + '\n' + indexLf.slice(endLineStart);
}

function spliceFooter(indexLf, groups) {
    return spliceBlock(indexLf, START_MARK, END_MARK, groups.split('\n'));
}

// Sayılar: aktif solo + aktif online (kod-macerasi/satranc iki sürümlü → iki kart, iki oyun)
function counts(data) {
    const solo = data.games.filter((g) => g.module && g.active);
    const online = onlineOrdered(data.games).filter((g) => g.active);
    return { solo, online, total: solo.length + online.length };
}

// Bir oyunun girdiği raflar: age [min,max] ile rafın ages [ilk,son] (kapalı) kesişimi — js/hub-ia.js ve
// seo/games_data.py ile AYNI kural; değişecekse üçü birlikte değişir.
function shelvesOf(data, g) {
    return data.shelves.filter((s) => g.age[0] <= s.ages[1] && g.age[1] >= s.ages[0]).map((s) => s.id);
}

function nameList(items) {
    return items.map((g) => `<em>${escapeHtml(g.name)}</em>`).join(', ');
}

// Altbilgi giriş cümlesi (index.html .hub-footer-lead): toplam oyun sayısı kataloğdan
function buildFooterLead(data) {
    const { total } = counts(data);
    return [
        `<p class="hub-footer-lead"><strong>Bilnet Oyun</strong>, Bilnet Okulları'nın anaokulu ve ilkokul öğrencileri için hazırladığı ${total} ücretsiz eğitici oyun. Üyelik yok, reklam yok; her oyun tarayıcıda açılır. <a href="/oyunlar/">Tüm oyunlar ve yaş grupları</a></p>`,
    ];
}

// SEO içerik bloğu (index.html #seo-content): sayılar, raf dağılımı ve oyun adları kataloğdan;
// sabit paragraflar (neden / öğretmen) burada durur. Uzun tire (—) sayfa metninde kullanılmaz.
function buildSeoBlock(data) {
    const { solo, online, total } = counts(data);
    const cards = [...solo, ...online];
    const shelfLine = data.shelves.map((s) => {
        const n = cards.filter((g) => shelvesOf(data, g).includes(s.id)).length;
        return `${escapeHtml(s.label)} (${escapeHtml(s.yas)} yaş) ${n} oyun`;
    }).join(', ');
    const lines = [
        '<h2>Bilnet Oyun: Çocuklar İçin Ücretsiz Eğitici Oyunlar</h2>',
        `<p><strong>Bilnet Oyun</strong>, Bilnet Okulları'nın anaokulu ve ilkokul çağındaki çocuklar için tasarladığı <strong>${total} ücretsiz eğitici oyun</strong> sunan bir web platformudur. İndirme veya kayıt gerektirmeden, doğrudan tarayıcıda oynayabileceğiniz interaktif oyunlarla çocuklarınızın öğrenme sürecini destekleyin.</p>`,
        '',
        '<h3>Hangi Oyunlar Var?</h3>',
        `<p><strong>Yaş raflarına göre:</strong> ${shelfLine}. Her oyun, yaş aralığının kestiği her rafta görünür.</p>`,
    ];
    for (const s of data.sections) {
        if (s.id === 'online') continue;
        const items = solo.filter((g) => g.section === s.id);
        if (!items.length) continue;
        lines.push(`<p><strong>${escapeHtml(s.title.replace(' & ', ' ve '))} (${items.length} oyun):</strong> ${nameList(items)}.</p>`);
    }
    lines.push(
        '',
        '<h3>Online Çok Oyunculu Oyunlar</h3>',
        `<p>Bilnet Oyun'da <strong>${online.length} online çok oyunculu oyun</strong> bulunur: ${nameList(online)}. Arkadaşlarınızla gerçek zamanlı oynayabilir, lobi sistemiyle oda oluşturabilir, mevcut odalara katılabilir veya hızlı eşleşme ile anında oynamaya başlayabilirsiniz.</p>`,
        '',
        '<h3>Neden Bilnet Oyun?</h3>',
        '<ul>',
        '    <li><strong>Tamamen ücretsiz</strong>: reklam yok, abonelik yok, gizli ücret yok</li>',
        '    <li><strong>Kayıt gerektirmez</strong>: hemen oynamaya başla</li>',
        '    <li><strong>Her cihazda çalışır</strong>: telefon, tablet ve bilgisayarda mobil uyumlu tasarım</li>',
        '    <li><strong>Türkçe arayüz</strong>: tamamen Türkçe, çocuklar kolayca anlayabilir</li>',
        '    <li><strong>Güvenli</strong>: reklam ve izleme yok; misafir modunda hiçbir kişisel veri toplanmaz, Google ile girişte yalnızca ilerleme hesapta saklanır (<a href="/gizlilik/">gizlilik</a>)</li>',
        '    <li><strong>Eğitici</strong>: matematik, kodlama, strateji, dil ve yaratıcılık becerileri geliştirir</li>',
        '</ul>',
        '',
        '<h3>Öğretmenler ve Veliler İçin</h3>',
        '<p>Bilnet Oyun, sınıf ortamında veya evde kullanılmak üzere tasarlanmıştır. Oyunlar yaş raflarına ayrılır; öğretmen görünümü her kartta kazanımı ve tipik süreyi gösterir, ada, kazanıma ya da derse göre arama yapılır. Yıldız ve seviye sistemiyle çocukların ilerlemesini takip edebilirsiniz. Her oyun anaokulu ve ilkokul müfredatına uygun beceriler geliştirir: problem çözme, mantıksal düşünme, el-göz koordinasyonu, alfabe ve sayı tanıma, kodlama temelleri ve stratejik planlama.</p>',
        '',
        `<p><strong>Hemen oynamaya başlayın!</strong> Yukarıdaki "Oynamaya Başla" butonuna tıklayarak ${total} eğitici oyuna ücretsiz erişin. <a href="https://bilnetoyun.com">bilnetoyun.com</a></p>`,
    );
    return lines;
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
    let nextIndex = spliceFooter(indexLf, buildFooterGroups(data));
    nextIndex = spliceBlock(nextIndex, LEAD_START, LEAD_END, buildFooterLead(data));
    nextIndex = spliceBlock(nextIndex, SEO_START, SEO_END, buildSeoBlock(data));
    const outputs = [
        { rel: CATALOG_REL, existing: readText(CATALOG_REL), next: buildCatalogJs(data) },
        { rel: INDEX_REL, existing: indexText, next: nextIndex },
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
        console.log('[catalog] check OK — js/catalog.js ve index.html (altbilgi, giriş cümlesi, SEO bloğu) data/games.json ile aynı');
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
