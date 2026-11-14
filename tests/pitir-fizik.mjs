// Pıtır — fizik ölçümleri ve değişmezleri (plan §3.1, §9.1). Tarayıcısız, Node.
// Kullanım: node tests/pitir-fizik.mjs   (npm run test:pitir bunu da koşar)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require(process.env.PITIR_CORE || '../games/pitir/core.js');
const K = P.K;

let fail = 0;
function ok(cond, msg, extra) {
    if (cond) console.log('  ✓ ' + msg + (extra ? ' (' + extra + ')' : ''));
    else { fail++; console.log('  ✗ ' + msg + (extra ? ' (' + extra + ')' : '')); }
}
const near = (v, want, tol) => Math.abs(v - want) <= Math.abs(want) * tol;
const lvl = (rows) => P.prepare({ id: 'test', harita: rows });
function run(L, n, inpFn, st) {
    st = st || P.createState(L);
    for (let i = 0; i < n && !st.dead && !st.done; i++) P.step(st, L, inpFn(st, i));
    return st;
}

// Düz zemin sahnesi: 200 ayrı '#' karo (birleştirme dikişlerini sınar)
const FLAT = lvl([
    ' '.repeat(220),
    ' '.repeat(220),
    ' '.repeat(220),
    ' '.repeat(220),
    ' S' + ' '.repeat(217) + 'F',
    '#'.repeat(221),
]);

console.log('Ölçümler (plan §3.1, ±%3)');
{
    // durgun → tam zıplama yüksekliği
    const st = run(FLAT, 30, () => ({}));
    const y0 = st.y; let maxY = y0;
    run(FLAT, 120, () => ({ j: true }), st);
    const st2 = run(FLAT, 30, () => ({}));
    let m = 0; const s3 = P.clone(st2); for (let i = 0; i < 100; i++) { P.step(s3, FLAT, { j: true }); m = Math.max(m, s3.y - y0); }
    maxY = m;
    ok(near(maxY, 2.4, 0.03), 'tam zıplama yüksekliği ≈ 2,4', maxY.toFixed(3));
}
{
    // kısa basış (0,05 sn) yüksekliği
    const st = run(FLAT, 30, () => ({}));
    const y0 = st.y; let m = 0;
    for (let i = 0; i < 100; i++) { P.step(st, FLAT, { j: i < 6 }); m = Math.max(m, st.y - y0); }
    ok(m > 0.8 && m < 1.15, 'kısa zıplama ≈ 1,0', m.toFixed(3));
}
{
    // 0 → tam hız süresi ve tam hız
    const st = run(FLAT, 30, () => ({}));
    let t = -1;
    for (let i = 0; i < 120; i++) { P.step(st, FLAT, { r: true }); if (t < 0 && st.vx >= K.MAX_RUN - 1e-6) t = (i + 1) * P.STEP; }
    ok(t > 0.18 && t < 0.26, 'tam hıza ulaşma ≈ 0,22 sn', t.toFixed(3));
    ok(near(st.vx, K.MAX_RUN, 0.001), 'düz zeminde en yüksek hız 6,5', st.vx.toFixed(3));
}
{
    // tam hızda tam zıplama uzunluğu
    const st = run(FLAT, 120, () => ({ r: true }));
    let x0 = null, x1 = null;
    for (let i = 0; i < 200; i++) {
        const was = st.ground;
        P.step(st, FLAT, { r: true, j: x1 === null });
        if (was && !st.ground && x0 === null) x0 = st.x;
        if (!was && st.ground && x0 !== null && x1 === null) { x1 = st.x; break; }
    }
    ok(x1 !== null && near(x1 - x0, 5.2, 0.05), 'tam hızda zıplama uzunluğu ≈ 5,2', x1 && (x1 - x0).toFixed(3));
}
{
    // bırakınca durma (düz zemin)
    const st = run(FLAT, 120, () => ({ r: true }));
    const x0 = st.x;
    run(FLAT, 120, () => ({}), st);
    ok(Math.abs(st.vx) < 1e-9 && st.x - x0 < 1.2, 'tuş bırakılınca ≈ 1 karo içinde durur', (st.x - x0).toFixed(3));
}

console.log('Değişmezler (plan §9.1)');
{
    // F4: dikişlerde takılma yok — tam hızda 200 karo, hız düşmez, zemin hiç kaybolmaz
    const st = run(FLAT, 120, () => ({ r: true }));
    let minV = 99, air = 0;
    for (let i = 0; i < 2400 && !st.done; i++) { P.step(st, FLAT, { r: true }); minV = Math.min(minV, st.vx); if (!st.ground) air++; }
    ok(minV >= K.MAX_RUN - 1e-6 && air === 0, 'F4 karo dikişlerinde takılma/sekme yok', 'min hız ' + minV.toFixed(3) + ', havada adım ' + air);
}
{
    // F4b: yokuş aşağı koşarken (45° ve 22,5°) top yerden kopmaz — zemin bayrağı titremez
    const DOWN = lvl([
        ' S                                    ',
        '###\\                                  ',
        '####\\                                 ',
        '#####\\                                ',
        '######\\                               ',
        '#######\\                              ',
        '########)}                            ',
        '##########)}                          ',
        '############)}                        ',
        '##############)}                    F ',
        '######################################',
    ]);
    const st = P.createState(DOWN);
    let air = 0, started = false;
    for (let i = 0; i < 600 && !st.done; i++) {
        P.step(st, DOWN, { r: true });
        if (st.ground) started = true;
        else if (started && st.x > 3 && st.x < 16) air++;
    }
    ok(air === 0, 'F4b yokuş aşağı koşuda zemin teması kopmaz', 'havada adım ' + air);
}
{
    // F3: tünelleme yok — 1 karo kalınlığında duvar ve zemin, en yüksek hızlarda
    const WALL = lvl([
        ' '.repeat(40), ' '.repeat(40), ' '.repeat(40), ' '.repeat(40), ' '.repeat(40), ' '.repeat(40),
        ' S            #              F',
        '#'.repeat(40),
    ]);
    const st = P.createState(WALL);
    st.vx = K.MAX_SPEED;
    let passed = false;
    for (let i = 0; i < 600; i++) { st.vx = K.MAX_SPEED; P.step(st, WALL, { r: true }); if (st.x > 14) passed = true; }
    ok(!passed, 'F3 en yüksek yatay hızda 1 karo duvardan geçmez');
    const FLOOR = lvl([' '.repeat(10), '  S', ' '.repeat(10), ' '.repeat(10), ' '.repeat(10), '##########  F', ' '.repeat(10)]);
    const s2 = P.createState(FLOOR); s2.y = 9; let below = false;
    for (let i = 0; i < 400; i++) { s2.vy = -K.MAX_FALL; P.step(s2, FLOOR, {}); if (s2.y < 1) below = true; }
    ok(!below, 'F3 en yüksek düşüş hızında 1 karo zeminden geçmez');
}
{
    // F5: eğimde enerji artmaz — V vadisi (45° iniş + 45° çıkış), tuşsuz
    const V = lvl([
        '          ',
        ' S      ',
        '##\\      /#####  F',
        '###\\    /######',
        '####\\  /#######',
        '#####\\/########',
        '################',
    ].map(r => r.padEnd(20)));
    const st = P.createState(V);
    st.x = 2.6; const y0 = st.y; let maxLater = -9, seenBottom = false;
    for (let i = 0; i < 1200; i++) {
        P.step(st, V, i < 20 ? { r: true } : {});
        if (st.y < y0 - 2) seenBottom = true;
        if (seenBottom) maxLater = Math.max(maxLater, st.y);
    }
    ok(seenBottom && maxLater <= y0 + 0.05, 'F5 vadiden çıkışta başlangıç yüksekliği aşılmaz', 'başlangıç ' + y0.toFixed(2) + ', sonra en çok ' + maxLater.toFixed(2));
}
{
    // F1 + F2 + F8: rastgele girdi taraması (eğimler, yarım eğimler, tek yönlü platform, dar geçitler)
    const MIX = lvl([
        '                                                    ',
        '                  ===         #     ##              ',
        '        ##                    #  ({  ##     ===     ',
        ' S     ####    /#\\       )}   #  #####     #####   F',
        '####  ######  /###\\  ##(######################{#####',
        '#####################################################',
    ]);
    // her karonun çokgen içi testi
    const rows = MIX.level.harita, H = rows.length;
    const SH = { '#': 1, '/': 1, '\\': 1, '(': 1, '{': 1, ')': 1, '}': 1 };
    const inside = (x, y) => {
        const cx = Math.floor(x), cy = Math.floor(y), r = rows[H - 1 - cy];
        const ch = r && r[cx];
        if (!SH[ch]) return false;
        const fx = x - cx, fy = y - cy;
        switch (ch) {
            case '#': return true;
            case '/': return fy < fx - 0.02;
            case '\\': return fy < 1 - fx - 0.02;
            case '(': return fy < fx * 0.5 - 0.02;
            case '{': return fy < 0.5 + fx * 0.5 - 0.02;
            case ')': return fy < 1 - fx * 0.5 - 0.02;
            case '}': return fy < 0.5 - fx * 0.5 - 0.02;
        }
        return false;
    };
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    let bad = 0, jump = 0, nan = 0, steps = 0;
    for (let runN = 0; runN < 400; runN++) {
        const st = P.createState(MIX);
        let inp = {};
        for (let i = 0; i < 1500 && !st.dead && !st.done; i++) {
            if (i % 12 === 0) inp = { l: rnd() < 0.3, r: rnd() < 0.7, j: rnd() < 0.4 };
            const px = st.x, py = st.y, pvx = st.vx, pvy = st.vy;
            P.step(st, MIX, inp);
            steps++;
            if (!Number.isFinite(st.x + st.y + st.vx + st.vy)) { nan++; break; }
            if (inside(st.x, st.y)) { bad++; if (bad <= 3) console.log('    ihlal', runN, i, st.x.toFixed(3), st.y.toFixed(3), 'önce', px.toFixed(3), py.toFixed(3), 'v', pvx.toFixed(2), pvy.toFixed(2), 'girdi', JSON.stringify(inp)); }
            const lim = (Math.hypot(pvx, pvy) + K.G * P.STEP) * P.STEP + 0.45;
            if (Math.hypot(st.x - px, st.y - py) > lim) jump++;
        }
    }
    ok(nan === 0, 'F8 NaN / sonsuz yok', steps + ' adım');
    ok(bad === 0, 'F1 top merkezi hiçbir adımda katı karonun içinde değil', bad + ' ihlal');
    ok(jump === 0, 'F2 tek adımda ışınlanma yok', jump + ' ihlal');
}
{
    // F9 belirleyicilik + F10 kopya bağımsızlığı
    const inputs = []; let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 3000; i++) inputs.push({ l: rnd() < 0.2, r: rnd() < 0.8, j: rnd() < 0.3 });
    const a = P.createState(FLAT), b = P.createState(FLAT);
    inputs.forEach(x => { P.step(a, FLAT, x); P.step(b, FLAT, x); });
    ok(JSON.stringify(a) === JSON.stringify(b), 'F9 aynı girdi → bit bit aynı durum');
    const c = P.createState(FLAT); inputs.slice(0, 500).forEach(x => P.step(c, FLAT, x));
    const snap = JSON.stringify(c), k = P.clone(c);
    inputs.slice(500, 1500).forEach(x => P.step(k, FLAT, x));
    ok(JSON.stringify(c) === snap, 'F10 kopya üzerinde oynamak asıl durumu bozmaz');
}

console.log(fail ? `\n✗ ${fail} hata` : '\n✓ fizik testleri geçti');
process.exit(fail ? 1 : 0);
