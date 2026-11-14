// Pıtır — bölüm doğrulama botu (plan §9.2). Tarayıcısız, Node.
// Her bölüm: (a) baştan bitiş, (b) her checkpoint'ten bitiş, (c) her yıldız alınarak bitiş,
// (d) girdi kaydı tekrar oynatılınca aynı sonuç, (e) hiç basmayan bitiremez,
// (f) zorluk ölçer: botun yolundaki en dar zamanlama penceresi (Dünya 1'de ≥ 2 karar).
// Kullanım: npm run test:pitir   ·   tek bölüm: PITIR_BOLUM=d1-02 npm run test:pitir
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../games/pitir/core.js');
const LV = require('../games/pitir/levels.js');

const only = process.env.PITIR_BOLUM;
let fail = 0;
const t0 = Date.now();
const check = (c, m) => { if (!c) { fail++; console.log('  ✗ ' + m); } return c; };

const ids = new Set();
for (const data of LV.bolumler) {
    check(!ids.has(data.id), `${data.id}: id tekrarı`); ids.add(data.id);
    if (only && data.id !== only) continue;
    const t = Date.now();
    let L;
    try { L = P.prepare(data); } catch (e) { check(false, data.id + ': ' + e.message); continue; }
    const stats = {};
    const sol = P.solve(L, { stats });
    if (!check(sol, `${data.id} "${data.ad}": baştan geçilemiyor (en uzak x=${(stats.best || 0).toFixed(1)}, düğüm ${stats.nodes})`)) continue;

    const end = P.replay(L, sol.path, { D: sol.D });
    check(end.done && !end.dead, `${data.id}: girdi kaydı tekrar oynatılınca bitmiyor`);

    const idle = P.createState(L);
    for (let i = 0; i < 120 * 120 && !idle.dead && !idle.done; i++) P.step(idle, L, {});
    check(!idle.done, `${data.id}: hiç basmadan bitiyor`);

    // checkpoint'lerden: oyuncu checkpoint'te durur hâlde yeniden doğar (plan §3.4)
    const snaps = P.checkpointStates(L, sol.path, sol.D);
    let cpOk = 0;
    for (const s of snaps) {
        if (s.cp < 0) continue;
        if (check(P.solve(L, { from: P.spawnAt(L, s) }), `${data.id}: checkpoint ${s.cp + 1}'den geçilemiyor`)) cpOk++;
    }
    check(cpOk === L.cps.length, `${data.id}: ${L.cps.length} checkpoint'ten ${cpOk} tanesi doğrulandı`);

    // yıldızlar
    check(L.stars.length === 3, `${data.id}: 3 yıldız olmalı (${L.stars.length})`);
    let starOk = 0;
    for (const s of L.stars) if (check(P.solve(L, { needStar: s.no }), `${data.id}: yıldız ${s.no} (x ${s.x}) alınarak bitirilemiyor`)) starOk++;

    // zorluk ölçer: yoldaki her kararı tek tek değiştir, kaç komşu karar aynı (ölümsüz) sonucu veriyor
    let narrow = 0;
    for (let k = 0; k < sol.path.length; k++) {
        const alt = sol.path.slice(); let survive = 0;
        for (let a = 0; a < P.ACTIONS.length; a++) {
            if (a === sol.path[k]) continue;
            alt[k] = a;
            const st = P.replay(L, alt.slice(0, Math.min(alt.length, k + 12)), { D: sol.D });
            if (!st.dead) survive++;
        }
        if (survive === 0) narrow++;
    }
    console.log(`✓ ${data.id.padEnd(6)} ${data.ad.padEnd(16)} ${(sol.steps / 120).toFixed(1)} sn · ${cpOk} checkpoint · ${starOk}/3 yıldız · tek doğru kararlı an: ${narrow} · ${((Date.now() - t) / 1000).toFixed(1)} sn`);
}
console.log(`\n${fail ? '✗ ' + fail + ' hata' : '✓ tümü geçti'} (${((Date.now() - t0) / 1000).toFixed(1)} sn)`);
process.exit(fail ? 1 : 0);
