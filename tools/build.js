#!/usr/bin/env node
/* ============================================
   İçerik hash'li önbellek kırma — deploy anında (A10b)
   --------------------------------------------
   Her yerel JS/CSS/HTML başvurusuna `?h=<sha256 ilk 10>` ekler; böylece js/css
   `Cache-Control: immutable` ile 1 yıl önbelleklenebilir (vercel.json) ve dosya
   değişince URL'si de değişir. Depoda insan dostu `?v=N` kalabilir; eski/yeni sorgu
   ne olursa olsun build sırasında hash ile değiştirilir. Bağımlılık yok (Node ≥ 20).

   Kullanım:
     node tools/build.js                      # yerinde (Vercel buildCommand)
     node tools/build.js --check              # yerinde + çıktıyı doğrula (hata → çıkış 1)
     node tools/build.js --out .build-check   # kökü kopyalayıp orada üret (CI / yerel test)
     node tools/build.js --out .build-check --check
     node tools/build.js --root <dizin>       # başka bir kökte çalış (varsayılan: tools/..)

   Doğrulama (--check): çıktı ağacı yeniden taranır; (1) her yerel başvuru tam olarak
   hedefin hash'ini taşımalı (idempotence + eksik/eski hash), (2) hiçbir .html/.js
   dosyasında yerel bir `…?v=N` kalıntısı olmamalı (kapsam dışı kalmış bir yükleme
   kalıbını yakalar). Bir sorun varsa deploy/CI kırmızıya döner — hash'siz bir js/css
   URL'si immutable önbellekte 1 yıl takılı kalırdı.
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const site = require('./lib/site');
const refs = require('./lib/refs');

const MARKER = '.bilnetoyun-build.json';       // --out hedefinin bu araca ait olduğunun kanıtı
const VENDOR_RE = /(^|\/)(?:js\/lib\/|three\.min\.js$|stockfish\.js$)/;
const STALE_VERSION_RE = /[\w./-]+\.(?:m?js|css|html)\?v=\d+/g;

function parseArgs(argv) {
    const opts = { root: path.resolve(__dirname, '..'), out: null, check: false };
    const value = (i) => {
        if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) fail(`${argv[i]} bir dizin ister`);
        return path.resolve(argv[i + 1]);
    };
    for (let i = 0; i < argv.length; i += 1) {
        const a = argv[i];
        if (a === '--root') opts.root = value(i++);
        else if (a === '--out') opts.out = value(i++);
        else if (a === '--check') opts.check = true;
        else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
        else fail(`bilinmeyen argüman: ${a} (--help)`);
    }
    if (!fs.existsSync(path.join(opts.root, 'index.html'))) fail(`kök site değil (index.html yok): ${opts.root}`);
    if (opts.out && (opts.out === opts.root || opts.root.startsWith(opts.out + path.sep))) fail('--out kökün kendisi ya da üstü olamaz');
    return opts;
}

function printHelp() {
    console.log(fs.readFileSync(__filename, 'utf8').split('============================================')[1]);
}

function fail(msg) {
    console.error(`[build] HATA: ${msg}`);
    process.exit(1);
}

// --out hedefini güvenle sıfırlar: yalnız boş ya da daha önce bu aracın ürettiği bir klasör silinir.
function prepareOutDir(out) {
    if (fs.existsSync(out)) {
        const entries = fs.readdirSync(out);
        if (entries.length && !entries.includes(MARKER)) fail(`--out klasörü dolu ve bu araca ait değil (${MARKER} yok): ${out}`);
        fs.rmSync(out, { recursive: true, force: true });
    }
    fs.mkdirSync(out, { recursive: true });
}

// Kökü --out'a kopyalar (EXCLUDED_DIRS, nokta klasörleri ve out'un kendisi hariç).
// fs.cpSync kökü kendi alt klasörüne kopyalamayı reddeder (filtreyle bile) → elle yürünür.
function copyTree(root, out) {
    (function walk(dir) {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const abs = path.join(dir, ent.name);
            if (abs === out) continue;
            const dest = path.join(out, path.relative(root, abs));
            if (ent.isDirectory()) {
                if (site.isExcludedDir(ent.name)) continue;
                fs.mkdirSync(dest, { recursive: true });
                walk(abs);
            } else if (ent.isFile()) {
                fs.mkdirSync(path.dirname(dest), { recursive: true });
                fs.copyFileSync(abs, dest);
            }
        }
    })(root);
}

function writeOutputs(root, outRoot, rendered, files) {
    let written = 0;
    for (const [abs, text] of rendered) {
        const dest = path.join(outRoot, path.relative(root, abs));
        if (files.get(abs).text === text && fs.existsSync(dest)) continue;   // yerinde: değişmeyen dosyaya dokunma
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, Buffer.from(text, 'latin1'));
        written += 1;
    }
    return written;
}

function summarize(scan, rendered, written, outRoot) {
    const kinds = { html: 0, js: 0, module: 0, leaf: 0 };
    const targets = new Set();
    let refCount = 0;
    for (const e of scan.files.values()) {
        kinds[e.kind] += 1;
        refCount += e.refs.length;
        for (const r of e.refs) targets.add(r.target);
    }
    console.log(`[build] kök: ${scan.root}${outRoot !== scan.root ? `\n[build] çıktı: ${outRoot}` : ''}`);
    console.log(`[build] taranan: ${kinds.html} HTML, ${kinds.js} hub JS, ${kinds.module} ES modülü · yaprak varlık: ${kinds.leaf}`);
    console.log(`[build] hash'lenen yerel başvuru: ${refCount} (${targets.size} farklı hedef) · dış URL: ${scan.stats.external} · özel sorgulu (dokunulmadı): ${scan.stats.customQuery}`);
    console.log(`[build] yazılan dosya: ${written} / ${rendered.size} taranan`);
}

// ── Doğrulama ──

function verify(outRoot) {
    const problems = [];
    const again = site.scanSite(outRoot);
    problems.push(...again.errors.map((e) => `çözümlenemeyen başvuru: ${e}`));
    const hashes = site.computeHashes(again);
    for (const entry of again.files.values()) {
        for (const r of entry.refs) {
            const expected = `?h=${hashes.get(r.target)}`;
            const actual = refs.splitRef(r.value).query;
            if (actual !== expected) problems.push(`${entry.rel}: "${r.value}" → beklenen ${expected}`);
        }
    }
    problems.push(...findStaleVersions(outRoot));
    return problems;
}

// Kaba tarama: kapsam dışı kalmış `…?v=N` kalıntısı (URL'ler ve vendor dosyaları hariç).
function findStaleVersions(root) {
    const problems = [];
    (function walk(dir) {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const abs = path.join(dir, ent.name);
            if (ent.isDirectory()) { if (!site.isExcludedDir(ent.name)) walk(abs); continue; }
            if (!/\.(?:m?js|html)$/i.test(ent.name)) continue;
            const rel = path.relative(root, abs).split(path.sep).join('/');
            if (VENDOR_RE.test(rel)) continue;
            const text = fs.readFileSync(abs, 'latin1');
            let m;
            STALE_VERSION_RE.lastIndex = 0;
            while ((m = STALE_VERSION_RE.exec(text))) {
                const context = text.slice(Math.max(0, m.index - 12), m.index) + m[0];
                if (context.includes('//')) continue;   // dış URL (yerel yolda `//` olmaz)
                const line = text.slice(0, m.index).split('\n').length;
                problems.push(`${rel}:${line}: hash'lenmemiş ?v= kalıntısı "${m[0]}"`);
            }
        }
    })(root);
    return problems;
}

// ── Ana akış ──

function main() {
    const opts = parseArgs(process.argv.slice(2));
    const outRoot = opts.out || opts.root;
    const skipDirs = new Set(opts.out && opts.out.startsWith(opts.root + path.sep) ? [opts.out] : []);

    const scan = site.scanSite(opts.root, { skipDirs });
    if (scan.errors.length) {
        for (const e of scan.errors) console.error(`[build] HATA: ${e}`);
        fail(`${scan.errors.length} çözümlenemeyen yerel başvuru`);
    }
    const hashes = site.computeHashes(scan);
    const rendered = site.render(scan, hashes);

    if (opts.out) { prepareOutDir(opts.out); copyTree(opts.root, opts.out); }
    const written = writeOutputs(opts.root, outRoot, rendered, scan.files);
    if (opts.out) fs.writeFileSync(path.join(opts.out, MARKER), JSON.stringify({ tool: 'tools/build.js', files: scan.files.size }) + '\n');
    summarize(scan, rendered, written, outRoot);

    if (!opts.check) return;
    const problems = verify(outRoot);
    if (problems.length) {
        for (const p of problems) console.error(`[check] ${p}`);
        fail(`${problems.length} sorun — çıktı hash'siz/eski başvuru içeriyor`);
    }
    console.log('[check] OK — çıktı idempotent: her yerel başvuru hedefinin hash\'ini taşıyor, ?v= kalıntısı yok');
}

main();
