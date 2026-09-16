#!/usr/bin/env node
/* ============================================
   SRI denetimi — index.html / admin.html'deki dış <script integrity> hash'leri hâlâ doğru mu? (B8a)
   --------------------------------------------
   Firebase compat SDK'sı gstatic'ten `integrity="sha384-…" crossorigin="anonymous"` ile yüklenir.
   Hash uyuşmazsa tarayıcı script'i sessizce çalıştırmaz → js/firebase-config.js çevrimdışı moda düşer
   (hub açılır ama giriş/bulut/online kapalı). Kırılma değil, görünmezlik — bu araç CI'da erken uyarır.

   Ne yapar: iki HTML'deki `integrity` taşıyan dış <script src> etiketlerini bulur, her URL'yi indirir,
   integrity'deki algoritmayla (sha256/384/512) özetini hesaplar, karşılaştırır. Ayrıca `crossorigin`
   eksikse (SRI çapraz kökende CORS ister; yoksa tarayıcı script'i reddeder) hata sayar.
   integrity'siz dış script uyarı olarak listelenir (--strict ile hata).

   Kullanım:
     node tools/sri-check.js            # doğrula; uyuşmazlık → çıkış 1, hangi dosya/URL yazılır
     node tools/sri-check.js --print    # her URL için güncel integrity değerini yaz (hash yenileme)
     node tools/sri-check.js --strict   # integrity'siz dış script de hata
   Bağımlılık yok (Node ≥ 20: global fetch + crypto). package.json: `npm run sri:check`.
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PAGES = ['index.html', 'admin.html'];
const ALGOS = new Set(['sha256', 'sha384', 'sha512']);
const TIMEOUT_MS = 20000;

function parseAttrs(text) {
    const attrs = {};
    const re = /([A-Za-z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let m;
    while ((m = re.exec(text))) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
    return attrs;
}

function stripComments(html) {
    return html.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));   // satır sayısı korunur
}

/** Sayfadaki dış <script src> etiketleri: { page, line, src, integrity?, crossorigin? } */
function externalScripts(page) {
    const abs = path.join(ROOT, page);
    if (!fs.existsSync(abs)) return [];
    const html = stripComments(fs.readFileSync(abs, 'utf8'));
    const out = [];
    const re = /<script\b([^>]*)>/gi;
    let m;
    while ((m = re.exec(html))) {
        const a = parseAttrs(m[1]);
        if (!a.src || !/^(?:https?:)?\/\//i.test(a.src)) continue;
        const line = html.slice(0, m.index).split('\n').length;
        out.push({ page, line, src: a.src, integrity: a.integrity, crossorigin: a.crossorigin });
    }
    return out;
}

function parseIntegrity(value) {
    // "sha384-BASE64" (boşlukla ayrılmış birden çok olabilir; ilk tanınan algoritma kullanılır)
    for (const token of String(value).trim().split(/\s+/)) {
        const i = token.indexOf('-');
        const algo = token.slice(0, i).toLowerCase();
        if (i > 0 && ALGOS.has(algo)) return { algo, digest: token.slice(i + 1) };
    }
    return null;
}

async function download(url) {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

async function main() {
    const args = process.argv.slice(2);
    const print = args.includes('--print');
    const strict = args.includes('--strict');
    const unknown = args.filter((a) => a !== '--print' && a !== '--strict');
    if (unknown.length) { console.error(`[sri] bilinmeyen argüman: ${unknown.join(' ')} (yalnız --print, --strict)`); process.exit(2); }

    const scripts = PAGES.flatMap(externalScripts);
    // Çıkış kodu process.exit() yerine exitCode ile: undici keep-alive soketi açıkken exit(1) Windows/Node 24'te
    // libuv assert'iyle 127 döndürüyor (yine kırmızı ama yanıltıcı). exitCode ile döngü doğal biter, kod 1 kalır.
    if (!scripts.length) { console.error('[sri] HATA: dış <script src> bulunamadı — sayfalar taşındı mı?'); process.exitCode = 1; return; }

    let errors = 0;
    let warnings = 0;
    const cache = new Map();   // aynı URL iki sayfada → tek indirme

    for (const s of scripts) {
        const where = `${s.page}:${s.line} ${s.src}`;
        if (!s.integrity) {
            const msg = `integrity yok: ${where}`;
            if (strict) { errors += 1; console.error(`[sri] HATA: ${msg}`); } else { warnings += 1; console.warn(`[sri] uyarı: ${msg}`); }
            if (!print) continue;
        }
        const want = s.integrity ? parseIntegrity(s.integrity) : { algo: 'sha384', digest: null };
        if (!want) { errors += 1; console.error(`[sri] HATA: integrity biçimi tanınmadı (${s.integrity}): ${where}`); continue; }
        if (s.integrity && s.crossorigin === undefined) {
            errors += 1;
            console.error(`[sri] HATA: crossorigin="anonymous" yok (çapraz kökende SRI CORS ister; tarayıcı script'i reddeder): ${where}`);
        }
        let body;
        try {
            if (!cache.has(s.src)) cache.set(s.src, download(s.src));
            body = await cache.get(s.src);
        } catch (e) {
            errors += 1;
            console.error(`[sri] HATA: indirilemedi (${e.message}): ${where}`);
            continue;
        }
        const got = crypto.createHash(want.algo).update(body).digest('base64');
        if (print) console.log(`${s.page}:${s.line} ${s.src}\n    integrity="${want.algo}-${got}"  (${body.length} bayt)`);
        if (want.digest === null) continue;
        if (got === want.digest) {
            if (!print) console.log(`[sri] OK   ${where} (${want.algo}, ${body.length} bayt)`);
        } else {
            errors += 1;
            console.error(`[sri] HATA: hash uyuşmuyor: ${where}\n    beklenen ${want.algo}-${want.digest}\n    gelen    ${want.algo}-${got}`);
        }
    }

    const checked = scripts.filter((s) => s.integrity).length;
    if (errors) {
        console.error(`[sri] ${errors} hata, ${warnings} uyarı (${checked} integrity'li script) — index.html/admin.html integrity değerlerini \`node tools/sri-check.js --print\` ile yenile`);
        process.exitCode = 1;
        return;
    }
    console.log(`[sri] check OK — ${checked} integrity'li dış script doğrulandı${warnings ? `, ${warnings} uyarı` : ''}`);
}

main().catch((e) => { console.error(`[sri] HATA: ${e.stack || e}`); process.exitCode = 1; });
