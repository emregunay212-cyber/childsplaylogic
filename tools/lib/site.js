/* ============================================
   Site grafiği: dosya keşfi → başvurular → içerik hash'leri (tools/build.js için)
   --------------------------------------------
   Taranan dosyalar:
   - HTML: kökten en fazla 3 seviye derinlikte .html dosyaları (index/admin/404,
     games/<id>/index.html, oyunlar/…, gizlilik|hakkinda|iletisim) — EXCLUDED_DIRS dışında.
   - Hub JS: js/ altındaki tüm .js (js/lib/ hariç). Klasik betik → URL'ler belgeye (köke) göre çözülür.
   - ES modülleri: başvurulardan keşfedilir (games/ates-buz/js/…), belirteçler dosyaya göre.
   - Diğer her hedef (css, klasik iframe betikleri, vendor) YAPRAKTIR: ham bayt hash'i.

   Hash tanımı (deterministik, döngüye dayanıklı, idempotent):
     contentHash(X) = sha256( X'in sorguları SİLİNMİŞ normalize içeriği )
     hash(X)        = sha256( contentHash(X) + X'ten erişilebilen tüm dosyaların
                              contentHash'leri (sıralı, tekil) ).slice(0, 10)
   Bir bağımlılık değişince onu gömen her dosyanın da URL'si değişir (çıktı içeriği
   değiştiği için); modül döngüleri (menus.js ⇄ buttons.js) erişilebilirlik kümesiyle
   sorunsuz çözülür. Sorgular normalize edildiğinden aynı ağaç ikinci kez taranınca
   aynı hash'ler çıkar → build idempotenttir ve --check bunu doğrular.
   Dosyalar latin1 olarak okunup yazılır: dokunulmayan baytlar bire bir korunur.
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const refs = require('./refs');

const HASH_LEN = 10;
const HTML_MAX_DEPTH = 3;
// Kök altında hiç bakılmayan klasörler (ad bazlı, her seviyede). `.` ile başlayanlar da atlanır.
const EXCLUDED_DIRS = new Set([
    'node_modules', 'fabrika', 'docs', 'plans', 'tests', 'seo', 'server', 'tools', 'kaynak',
    'test-results', 'playwright-report',
]);
const HUB_JS_DIR = 'js';
const VENDOR_JS_DIR = path.join('js', 'lib');

function sha256(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function isExcludedDir(name) {
    return name.startsWith('.') || EXCLUDED_DIRS.has(name);
}

function listDir(dir) {
    return fs.readdirSync(dir, { withFileTypes: true })
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Kökten en fazla HTML_MAX_DEPTH seviye derin .html dosyaları (sıralı, deterministik). */
function walkHtml(root, extra = new Set()) {
    const out = [];
    (function walk(dir, depth) {
        for (const ent of listDir(dir)) {
            const abs = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                if (depth < HTML_MAX_DEPTH && !isExcludedDir(ent.name) && !extra.has(abs)) walk(abs, depth + 1);
            } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
                out.push(abs);
            }
        }
    })(root, 1);
    return out;
}

/** js/ altındaki tüm .js dosyaları — js/lib/ (vendor) hariç. */
function walkHubJs(root) {
    const out = [];
    const base = path.join(root, HUB_JS_DIR);
    if (!fs.existsSync(base)) return out;
    (function walk(dir) {
        for (const ent of listDir(dir)) {
            const abs = path.join(dir, ent.name);
            if (ent.isDirectory()) { if (abs !== path.join(root, VENDOR_JS_DIR)) walk(abs); }
            else if (ent.isFile() && ent.name.endsWith('.js')) out.push(abs);
        }
    })(base);
    return out;
}

// Dosyanın türü: 'html' | 'js' (hub, köke göre) | 'module' | 'leaf'
function classify(root, abs, text) {
    const ext = path.extname(abs).toLowerCase();
    if (ext === '.html') return 'html';
    if (ext !== '.js' && ext !== '.mjs') return 'leaf';
    const rel = path.relative(root, abs);
    if (rel.startsWith(VENDOR_JS_DIR + path.sep)) return 'leaf';
    if (rel.startsWith(HUB_JS_DIR + path.sep)) return 'js';
    return refs.isEsModule(text) ? 'module' : 'leaf';
}

// Gerçek dosya adı büyük/küçük harfiyle eşleşiyor mu? (Windows'ta bulunur, Linux'ta 404 olurdu)
// Kök de gerçek yola çevrilir: kökün kendisi sembolik bağsa (CI/Vercel) yanlış alarm üretmez.
function caseMismatch(root, abs) {
    try {
        const realRel = path.relative(fs.realpathSync.native(root), fs.realpathSync.native(abs));
        return realRel !== path.relative(root, abs);
    } catch (e) { return false; }
}

/**
 * Tek dosyayı okuyup başvurularını çıkarır; eksik hedefler `errors`'a yazılır.
 * @returns {{ abs, rel, kind, text?, raw?, refs: [{start,end,value,target}] }}
 */
function scanFile(root, abs, errors, stats) {
    const raw = fs.readFileSync(abs);
    const text = raw.toString('latin1');
    const kind = classify(root, abs, text);
    const entry = { abs, rel: path.relative(root, abs).split(path.sep).join('/'), kind, raw, text, refs: [] };
    if (kind === 'leaf') return entry;

    const baseDir = kind === 'js' ? root : path.dirname(abs);
    const candidates = kind === 'html' ? refs.htmlRefs(text) : refs.jsRefs(text);
    for (const c of candidates) {
        if (refs.isExternal(c.value)) { stats.external += 1; continue; }
        const { file, query } = refs.splitRef(c.value);
        if (!refs.isHashableFile(file)) continue;   // font preload, manifest, json…
        if (!refs.isReplaceableQuery(query)) { stats.customQuery += 1; continue; }
        const target = refs.resolveLocal(file, baseDir, root);
        const where = `${entry.rel}: "${c.value}"`;
        if (!target) { errors.push(`${where} → kök dışına çıkıyor`); continue; }
        if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { errors.push(`${where} → dosya yok: ${path.relative(root, target)}`); continue; }
        if (caseMismatch(root, target)) { errors.push(`${where} → büyük/küçük harf uyuşmazlığı (Linux'ta 404): ${path.relative(root, target)}`); continue; }
        entry.refs.push({ start: c.start, end: c.end, value: c.value, target });
    }
    return entry;
}

/**
 * Keşif + tarama. Tohum: HTML dosyaları ve hub JS; hedefler kuyruğa eklenir
 * (HTML ve modüller taranır, gerisi yaprak).
 * @param {string} root mutlak site kökü
 * @param {{ skipDirs?: Set<string> }} [opts] atlanacak mutlak klasörler (örn. --out hedefi)
 */
function scanSite(root, opts = {}) {
    const skipDirs = opts.skipDirs || new Set();
    const files = new Map();
    const errors = [];
    const stats = { external: 0, customQuery: 0 };
    const queue = [...walkHtml(root, skipDirs), ...walkHubJs(root)];
    while (queue.length) {
        const abs = queue.shift();
        if (files.has(abs)) continue;
        const entry = scanFile(root, abs, errors, stats);
        files.set(abs, entry);
        for (const r of entry.refs) if (!files.has(r.target)) queue.push(r.target);
    }
    return { root, files, errors, stats };
}

// Normalize içerik: her başvuru sorgusuz yol olarak yazılır → ?v=/?h= değerleri hash'i etkilemez.
function normalizedText(entry) {
    return spliceRefs(entry, (r) => {
        const { file, fragment } = refs.splitRef(r.value);
        return file + fragment;
    });
}

function spliceRefs(entry, replacement) {
    let out = entry.text;
    const sorted = [...entry.refs].sort((a, b) => b.start - a.start);
    for (const r of sorted) out = out.slice(0, r.start) + replacement(r) + out.slice(r.end);
    return out;
}

/** @returns {Map<string, string>} abs → 10 hex hash */
function computeHashes(site) {
    const contentHash = new Map();
    for (const [abs, entry] of site.files) {
        contentHash.set(abs, entry.kind === 'leaf' ? sha256(entry.raw) : sha256(Buffer.from(normalizedText(entry), 'latin1')));
    }
    const reachable = new Map();
    function reach(abs) {
        if (reachable.has(abs)) return reachable.get(abs);
        const seen = new Set();
        const stack = [abs];
        while (stack.length) {
            const cur = stack.pop();
            for (const r of site.files.get(cur).refs) {
                if (!seen.has(r.target)) { seen.add(r.target); stack.push(r.target); }
            }
        }
        seen.delete(abs);
        reachable.set(abs, seen);
        return seen;
    }
    const hashes = new Map();
    for (const abs of site.files.keys()) {
        const deps = [...reach(abs)].map((d) => contentHash.get(d)).sort();
        hashes.set(abs, sha256([contentHash.get(abs), ...deps].join('\n')).slice(0, HASH_LEN));
    }
    return hashes;
}

/** Taranan dosyaların hash'li çıktı metni. @returns {Map<string, string>} abs → latin1 metin */
function render(site, hashes) {
    const out = new Map();
    for (const [abs, entry] of site.files) {
        if (entry.kind === 'leaf') continue;
        out.set(abs, spliceRefs(entry, (r) => {
            const { file, fragment } = refs.splitRef(r.value);
            return `${file}?h=${hashes.get(r.target)}${fragment}`;
        }));
    }
    return out;
}

module.exports = { EXCLUDED_DIRS, HASH_LEN, isExcludedDir, scanSite, computeHashes, render };
