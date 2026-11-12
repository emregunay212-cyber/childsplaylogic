// Ritim Koşusu — bölüm doğrulama botu (tarayıcısız, Node).
// Her bölüm ve yarış pisti: (1) baştan geçilebilir, (2) her checkpoint'ten geçilebilir,
// (3) her coin alınarak bitirilebilir, (4) botun girdi kaydı tekrar oynatılınca aynı sonucu verir
// (belirleyici çekirdek — online yarışta skor doğrulama buna dayanır), (5) hiç basmayan oyuncu bitiremez.
// Kullanım: npm run test:ritim   ·   tek bölüm: RK_BOLUM=d1-04 npm run test:ritim
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const RK = require('../games/ritim-kosusu/core.js');
const LV = require('../games/ritim-kosusu/levels.js');

const only = process.env.RK_BOLUM;
let fail = 0;
const t0 = Date.now();

function check(cond, msg) {
    if (!cond) { fail++; console.log('  ✗ ' + msg); }
    return cond;
}

const ids = new Set();
for (const data of LV.hepsi) {
    check(!ids.has(data.id), `${data.id}: id tekrarı`); ids.add(data.id);
    if (only && data.id !== only) continue;
    const L = RK.prepare(data);
    const t = Date.now();
    const stats = {};
    const sol = RK.solve(L, { stats });
    if (!check(sol, `${data.id} "${data.ad}": baştan geçilemiyor (en uzak x=${(stats.best || 0).toFixed(1)})`)) {
        // en uzak ilerleme: teşhis için
        continue;
    }
    const end = RK.replay(L, sol.holds, { D: sol.D });
    check(end.done && !end.dead, `${data.id}: girdi kaydı tekrar oynatılınca bitmiyor`);

    // hiç basmayan oyuncu bitirememeli
    const idle = RK.createState(L);
    while (!idle.dead && !idle.done) RK.step(idle, L, false);
    check(idle.dead, `${data.id}: hiç basmadan bitiyor (bölüm boş)`);

    // checkpoint'ler
    const snaps = RK.checkpointStates(L, sol.holds, sol.D);
    let cpOk = 0;
    for (const s of snaps) {
        if (s.cp < 0) continue;
        if (check(RK.solve(L, { from: s }), `${data.id}: checkpoint x=${s.cp}'ten geçilemiyor`)) cpOk++;
    }
    check(L.cps.length === cpOk, `${data.id}: ${L.cps.length} checkpoint'ten ${cpOk} tanesi doğrulandı (yoldan geçilmeyen checkpoint olabilir)`);

    // coinler
    const coins = L.objs.filter(o => o.t === 'coin').map(o => o.no);
    if (!data.yaris) check(coins.length === 3, `${data.id}: 3 coin olmalı (${coins.length})`);
    let coinOk = 0;
    for (const no of coins) {
        if (check(RK.solve(L, { needCoin: no }), `${data.id}: coin ${no} alınarak bitirilemiyor`)) coinOk++;
    }
    console.log(`✓ ${data.id.padEnd(8)} ${data.ad.padEnd(14)} ${(sol.steps / 240).toFixed(1)} sn · ${cpOk} checkpoint · ${coinOk}/${coins.length} coin · ${((Date.now() - t) / 1000).toFixed(1)} sn`);
}

console.log(`\n${fail ? '✗ ' + fail + ' hata' : '✓ tümü geçti'} (${((Date.now() - t0) / 1000).toFixed(1)} sn)`);
process.exit(fail ? 1 : 0);
