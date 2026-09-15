/* ============================================
   Tolere edilen 404'lerin (görsel/font gibi kritik olmayan kaynaklar) kaydı.
   Worker'lar satır satır JSON ekler; globalTeardown tekilleştirip koşunun sonunda basar.
   Neden dosya: Playwright worker'ları ayrı süreçlerdir; bellek paylaşılmaz.
   ============================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.resolve(__dirname, '..', '..', 'test-results', 'tolerated-404.jsonl');

function record(entry) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

function reset() {
    try { fs.unlinkSync(LOG_FILE); } catch (e) { /* yoksa sorun değil */ }
}

function readAll() {
    let raw = '';
    try { raw = fs.readFileSync(LOG_FILE, 'utf8'); } catch (e) { return []; }
    return raw.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

// Koşu sonu raporu: URL bazında tekilleştir, hangi testlerde görüldüğünü say.
function report() {
    const entries = readAll();
    reset();
    if (!entries.length) return;

    const byUrl = new Map();
    for (const e of entries) {
        const cur = byUrl.get(e.url) || { count: 0, tests: new Set() };
        cur.count += 1;
        cur.tests.add(e.test);
        byUrl.set(e.url, cur);
    }

    const lines = [...byUrl.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([url, v]) => `  - ${url}  (${v.tests.size} test, ${v.count} kez)`);

    console.log('\n' + '─'.repeat(72));
    console.log(`UYARI — tolere edilen 404 (kritik olmayan kaynak), ${byUrl.size} URL:`);
    console.log(lines.join('\n'));
    console.log('Bunlar testi kırmaz; A6 (zipla-topla-coop.svg) gibi adımlarda kapatılmalı.');
    console.log('─'.repeat(72) + '\n');
}

module.exports = { record, reset, report };
