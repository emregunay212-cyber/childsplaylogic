/* ============================================
   Ateş & Buz — çarpışma/fizik testi (Node, tarayıcısız, bağımlılıksız).
   --------------------------------------------
   Oyunun GERÇEK modüllerini (games/ates-buz/js) sahte DOM ile yükler ve game.js döngüsünün fizik sırasını
   (düğme/rampa → küp → kol → top → oyuncular) birebir yineler. Deterministik rastgele girdilerle (kendi
   çevresini tarayan, duvara yaslanıp zıplayan, kapıları sürekli açıp kapatan) 10 seviyeyi oynatır ve
   değişmezleri denetler. Neden: kullanıcı şikâyetleri (karakter sıkışıp blokun İÇİNDEN düşüyor, zıplarken
   duvardan geçiyor, parçalar kayboluyor) görsel olarak güvenilir yakalanamaz; bu ölçülür.

   Denetlenenler
   1) VERİ      : oyuncu/küp/top/elmas/düğme/kol başlangıçları katı bloğun içinde değil.
   2) TARAMA    : gövde blokta ≥13 px en çok 35 kare (bekçi 30'da kurtarır), duvardan "tünelleme" 0,
                  dünya dışı 0, tek karede >40 px ışınlanma 0, küp/top gömülü kalma 0.
   3) SENARYO   : bulunan kök nedenlerin yapıcı tekrarı (S1 kayma-sıfırlanması, S2/S3 dikey rampa yanlış
                  eksen, S4 top duvarda doğuyor, S5 bekçi). Eski kodda kırmızıdır.
   Çalıştırma : npm run test:ates-buz   (ATES_BUZ_ROOT=<klasör> ile başka bir kopya; SEEDS/FRAMES ile boyut)
   Seviye görseli ↔ ızgara eşitliği tarayıcı ister: tests/ates-buz-veri.spec.js
   ============================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(process.env.ATES_BUZ_ROOT || path.join(HERE, '..', 'games', 'ates-buz'));
const SEEDS = Number(process.env.SEEDS || 4);
const FRAMES = Number(process.env.FRAMES || 3000);

// ── Oyun kaynaklarını {"type":"module"} ile geçici klasöre al (Node 20'de tipsiz pakette .js ESM yüklenmez) ──
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ates-buz-'));
process.on('SIGINT', () => process.exit(130)); // exit işleyicisi geçici klasörü siler
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* yoksay */ } });
fs.cpSync(path.join(SRC, 'js'), path.join(TMP, 'js'), { recursive: true });
fs.cpSync(path.join(SRC, 'data'), path.join(TMP, 'data'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'package.json'), '{"type":"module"}');

// ── Sahte DOM: canvas çizimi yok sayılır; görseller hiç yüklenmez (fizik çizimden bağımsız) ──
const ctxStub = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'measureText' ? () => ({ width: 0 }) : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const canvas = { width: 0, height: 0, getContext: () => ctxStub, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }) };
globalThis.document = { getElementById: () => canvas, addEventListener() {}, createElement: () => ({ style: {} }), body: { appendChild() {} } };
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.Image = class { set src(v) { this._s = v; } };
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem() {} }, configurable: true, writable: true });

const imp = (rel) => { const [p, q] = rel.split('?'); return import(pathToFileURL(path.join(TMP, 'js', p)).href + (q ? `?${q}` : '')); };
const { GAME_SIZE } = await imp('helpers.js');
const { levels } = await imp('collisionBlocks.js?v=5');
const { createObjectsFromArray } = await imp('collisions.js');
const { Player } = await imp('player.js?v=3');
const { Sprite } = await imp('sprite.js');
const { Diamond } = await imp('ingameAssets/diamond.js');
const { Button } = await imp('ingameAssets/button.js');
const { Ramp } = await imp('ingameAssets/ramp.js');
const { Lever } = await imp('ingameAssets/lever.js');
const { Cube } = await imp('ingameAssets/cube.js');
const { Ball } = await imp('ingameAssets/ball.js');
const { Bridge } = await imp('ingameAssets/bridge.js');
const data = {};
for (const f of ['players', 'diamonds', 'buttons', 'levers', 'cubes', 'doors', 'bridges', 'balls']) data[f] = JSON.parse(fs.readFileSync(path.join(TMP, 'data', `${f}.json`), 'utf8'));

// Hız/zıplama sabitleri game.js'ten OKUNUR (dışa aktarılmıyor): oyunda değişirse test de aynı değerle koşar (CLAUDE.md kuralı)
const gameSrc = fs.readFileSync(path.join(SRC, 'js', 'game.js'), 'utf8');
const readConst = (name) => { const m = gameSrc.match(new RegExp(`const ${name} = (-?[0-9.]+);`)); if (!m) throw new Error(`game.js'te ${name} bulunamadı`); return Number(m[1]); };
const MOVE_SPEED = readConst('MOVE_SPEED');
const JUMP_VELOCITY = readConst('JUMP_VELOCITY');
console.log(`(oyun sabitleri: MOVE_SPEED=${MOVE_SPEED}, JUMP_VELOCITY=${JUMP_VELOCITY})`);
const { width: GW, height: GH } = GAME_SIZE;
const BS = GAME_SIZE.block.width;
const LEVELS = Object.keys(levels).map(Number);

// ── Seviye kurulumu: game.js startGame() ile aynı sırada ──
function setup(lv) {
    const s = { lv, frame: 0, assets: [], players: [], buttons: [], levers: [], cubes: [], balls: [], ramps: [], diamonds: [], grid: levels[lv] };
    s.blocks = createObjectsFromArray(levels[lv]).objects;
    (data.diamonds[lv] || []).forEach((d) => s.diamonds.push(new Diamond({ position: d.position, type: d.type })));
    const mkRamp = (g) => new Ramp({ position: { ...g.ramp.position }, boxCount: g.ramp.boxCount, color: g.ramp.color, finalColor: g.ramp.finalColor, finalPosition: g.ramp.finalPosition, rotated: g.ramp.rotated });
    (data.buttons[lv] || []).forEach((g) => {
        const ramp = mkRamp(g); s.assets.push(ramp); s.ramps.push(ramp);
        const grp = g.buttons.map((b) => { const nb = new Button({ position: { ...b.position }, color: g.ramp.color, finalColor: g.ramp.finalColor, ramp }); s.assets.push(nb); return nb; });
        s.buttons.push(grp);
    });
    (data.levers[lv] || []).forEach((g) => {
        const ramp = mkRamp(g); s.assets.push(ramp); s.ramps.push(ramp);
        const lever = new Lever({ position: g.lever.position, color: g.ramp.color, finalColor: g.ramp.finalColor, ramp });
        s.levers.push(lever); s.assets.push(lever);
    });
    (data.cubes[lv] || []).forEach((c) => { const cube = new Cube({ position: { ...c.position }, collisionBlocks: s.blocks, allAssets: s.assets, players: s.players }); s.cubes.push(cube); s.assets.push(cube); });
    (data.bridges[lv] || []).forEach((b) => { const br = new Bridge({ position: { ...b.position }, chainsCount: b.chainsCount }); s.assets.push(br); });
    (data.balls[lv] || []).forEach((b) => { const ball = new Ball({ position: { ...b.position }, collisionBlocks: s.blocks, allAssets: s.assets }); s.balls.push(ball); s.assets.push(ball); });
    for (const key in data.players) {
        const cp = data.players[key];
        const anim = { idle: { currentRow: 1, frameRate: 1 }, left: { currentRow: 2, frameRate: 8, flipImage: true }, right: { currentRow: 2, frameRate: 8 }, up: { currentRow: 3, frameRate: 1 }, down: { currentRow: 4, frameRate: 1 } };
        const p = new Player({
            position: { ...cp[lv].position }, collisionBlocks: s.blocks, allAssets: s.assets, diamonds: s.diamonds, doors: [],
            imgSrc: cp.constants.imgSrc, element: cp.constants.element, frameRate: 1, frameDelay: 4, imgRows: 4, currentRow: 1,
            keys: { up: 'ArrowUp', left: 'ArrowLeft', right: 'ArrowRight', pressed: { up: false, left: false, right: false } },
            animations: anim,
            legs: new Sprite({ position: { x: cp[lv].position.x + 37, y: cp[lv].position.y + 72 }, imgSrc: '', imgRows: 2, currentRow: 1, frameRate: 1, frameDelay: 4, animations: { idle: { currentRow: 1, frameRate: 1 }, left: { currentRow: 2, flipImage: true, frameRate: 8 }, right: { currentRow: 2, frameRate: 8 } } }),
        });
        p.startPos = { ...cp[lv].position };
        p.hitboxPositionCalc();
        s.players.push(p);
    }
    return s;
}

// game.js animation() içindeki fizik sırası (çizim/ağ/kapı hariç). inputs: { fire:{left,right,up}, water:{…} }
function step(s, inputs) {
    s.frame++;
    for (const buttons of s.buttons) {
        let movedRamp = false;
        for (const button of buttons) {
            if (button.pressed) {
                if (button.position.y == button.finalPosition.y) {
                    let standing = false;
                    s.players.forEach((p) => { if (button.checkStandingOnButton(p, p.hitbox.legs)) standing = true; });
                    s.cubes.forEach((c) => { if (button.checkStandingOnButton(c, c.hitbox)) standing = true; });
                    s.balls.forEach((b) => { if (button.checkStandingOnButton(b, b.hitbox)) standing = true; });
                    if (!standing) { button.pressed = false; button.move('up'); }
                } else button.move('down');
            } else if (button.position.y != button.startPosition.y) button.move('up');
            if (button.pressed && !movedRamp) { movedRamp = true; button.run(); }
        }
        if (!movedRamp) buttons[0].run();
    }
    s.cubes.forEach((cube) => {
        cube.update();
        if (cube.rampBlocked) s.assets.forEach((a) => { if (a.hitbox.position.y == Math.round(cube.hitbox.position.y + cube.hitbox.height)) { a.blocked = true; a.blockedDirection = 'up'; } });
    });
    s.levers.forEach((l) => l.run());
    s.balls.forEach((b) => b.update());
    s.levers.forEach((l) => l.checkAngle());
    s.players.forEach((p) => {
        const inp = inputs[p.element] || {};
        if (inp.up && !p.keys.pressed.up) { if (p.isOnBlock && !p.rampBlocked) p.velocity.y = JUMP_VELOCITY; p.keys.pressed.up = true; }
        else if (!inp.up) p.keys.pressed.up = false;
        p.keys.pressed.left = !!inp.left; p.keys.pressed.right = !!inp.right;
        p.velocity.x = p.keys.pressed.left ? -MOVE_SPEED : p.keys.pressed.right ? MOVE_SPEED : 0;
        p.update();
        if (p.rampBlocked) s.assets.forEach((a) => { if (a.hitbox.position.y == Math.round(p.hitbox.position.y + p.hitbox.height)) { a.blocked = true; a.blockedDirection = 'up'; } });
        if (p.died) { // çevrimiçi yeniden doğuş (game.js)
            p.position.x = p.startPos.x; p.position.y = p.startPos.y; p.velocity.x = 0; p.velocity.y = 0; p.died = false; p.isOnBlock = false;
            p.lastSafe = { x: p.startPos.x, y: p.startPos.y }; p.stuckFrames = 0; p.respawns = (p.respawns || 0) + 1; p.hitboxPositionCalc();
        }
    });
}

// ── Geometri yardımcıları (yalnız tam kare hücreler; üçgen/havuz hariç) ──
const solid = (s, c, r) => (c < 0 || c >= GW || r < 0 || r >= GH) ? true : s.grid[r * GW + c] === 1;
function embed(s, x, y, w, h) { // en derin hücre bindirmesi = iki eksenin küçüğü
    let worst = 0;
    for (let r = Math.floor(y / BS); r <= Math.floor((y + h - 1e-6) / BS); r++) for (let c = Math.floor(x / BS); c <= Math.floor((x + w - 1e-6) / BS); c++) {
        if (!solid(s, c, r)) continue;
        const ox = Math.min(x + w, (c + 1) * BS) - Math.max(x, c * BS), oy = Math.min(y + h, (r + 1) * BS) - Math.max(y, r * BS);
        if (ox > 0 && oy > 0) worst = Math.max(worst, Math.min(ox, oy));
    }
    return worst;
}
// "Bloğun içinden geçiş": tüm hitbox bir kare hücreyle yatayda ≥6 px VE dikeyde ≥30 px örtüşüyor (meşru ayak
// dalması ≤24 px; gerçek batış kayma hatasında 36 px'e çıkıyordu). Değer = yatay bindirme (yoksa 0).
function sunk(s, p) {
    const hb = p.hitbox, x = hb.position.x, y = hb.position.y;
    let worst = 0;
    for (let r = Math.floor(y / BS); r <= Math.floor((y + hb.height - 1e-6) / BS); r++) for (let c = Math.floor(x / BS); c <= Math.floor((x + hb.width - 1e-6) / BS); c++) {
        if (!solid(s, c, r)) continue;
        const ox = Math.min(x + hb.width, (c + 1) * BS) - Math.max(x, c * BS), oy = Math.min(y + hb.height, (r + 1) * BS) - Math.max(y, r * BS);
        if (ox >= 6 && oy >= 30) worst = Math.max(worst, ox);
    }
    return worst;
}
const bodyEmbed = (s, p) => embed(s, p.hitbox.position.x, p.hitbox.position.y, p.hitbox.width, p.hitbox.height - p.hitbox.legs.height);
function tunnels(s, x0, y0, x1, y1) { // iki nokta arası doğru, ikisini de içermeyen katı hücreyi kesiyor mu?
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2);
    if (n < 10) return false;
    const a = [Math.floor(x0 / BS), Math.floor(y0 / BS)], b = [Math.floor(x1 / BS), Math.floor(y1 / BS)];
    for (let i = 1; i < n; i++) {
        const c = Math.floor((x0 + (x1 - x0) * i / n) / BS), r = Math.floor((y0 + (y1 - y0) * i / n) / BS);
        if (solid(s, c, r) && !(c === a[0] && r === a[1]) && !(c === b[0] && r === b[1])) return true;
    }
    return false;
}

// ── Deterministik girdi politikaları ──
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function policy(seed, mode) {
    const R = rng(seed * 104729 + mode.length * 7 + mode.charCodeAt(0));
    const st = {};
    return (s) => {
        const out = {};
        for (const p of s.players) {
            const a = st[p.element] || (st[p.element] = { dir: R() < 0.5 ? -1 : 1, left: 30, hold: 0 });
            if (a.left-- <= 0) { // random: kısa yön değişimi · hug: uzun süre aynı yöne (duvara yaslan) · spam: sık yön + sürekli zıplama
                a.dir = mode === 'hug' ? (R() < 0.35 ? -a.dir : a.dir) : R() < 0.42 ? -1 : R() < 0.84 ? 1 : 0;
                a.left = mode === 'hug' ? 60 + Math.floor(R() * 160) : mode === 'spam' ? 4 + Math.floor(R() * 22) : 8 + Math.floor(R() * 90);
            }
            let up = false;
            if (a.hold > 0) { a.hold--; up = true; }
            else if (p.isOnBlock && R() < (mode === 'spam' ? 0.5 : mode === 'hug' ? 0.25 : 0.035)) { a.hold = mode === 'hug' ? 10 + Math.floor(R() * 14) : 1 + Math.floor(R() * 10); up = true; }
            else if (mode === 'spam' && R() < 0.03) { a.hold = 3; up = true; }
            out[p.element] = { left: a.dir < 0, right: a.dir > 0, up };
        }
        return out;
    };
}

// Hata ayıklama yardımı: DEBUG_TRACE=<seviye>:<mod>:<tohum>:<kare0>:<kare1>:<fire|water> → o karelerde her x/y yazımını satır no ile basar
const TRACE = process.env.DEBUG_TRACE ? (([lv, mode, seed, f0, f1, who]) => ({ lv: +lv, mode, seed: +seed, f0: +f0, f1: +f1, who }))(process.env.DEBUG_TRACE.split(':')) : null;
function traceFrame(s, f, who) {
    const p = s.players.find((q) => q.element === who);
    const src = (e) => { const m = e.stack.split('\n')[3].match(/(\w+)\.js\?v=\d+:(\d+)|(\w+)\.js:(\d+)/); return m ? (m[1] || m[3]) + ':' + (m[2] || m[4]) : '?'; };
    console.log(`f${f} pos(${p.position.x.toFixed(2)},${p.position.y.toFixed(2)}) v(${p.velocity.x},${p.velocity.y.toFixed(2)}) ob${+p.isOnBlock} sl${+p.sliding.left}${+p.sliding.right}`);
    const hb = p.hitbox, bb = hb.position.y + hb.height - hb.legs.height;
    const ov = [];
    for (const b of [...s.blocks.filter((q) => q.shape === 'square'), ...s.assets.filter((a) => a.shape === 'ramp' || a.shape === 'square')]) {
        const ox = Math.min(hb.position.x + hb.width, b.hitbox.position.x + b.hitbox.width) - Math.max(hb.position.x, b.hitbox.position.x);
        const oy = Math.min(bb, b.hitbox.position.y + b.hitbox.height) - Math.max(hb.position.y, b.hitbox.position.y);
        if (ox > 0 && oy > 0) ov.push(`${b.constructor.name}(${b.hitbox.position.x.toFixed(0)},${b.hitbox.position.y.toFixed(0)} ${b.hitbox.width}x${b.hitbox.height}) ox${ox.toFixed(1)} oy${oy.toFixed(1)}`);
    }
    if (ov.length) console.log('     body overlaps:', ov.join(' | '));
    for (const axis of ['x', 'y']) { if (p.position.__hooked?.[axis]) continue; let v = p.position[axis]; (p.position.__hooked ||= {})[axis] = true; Object.defineProperty(p.position, axis, { get() { return v; }, set(n) { if (n !== v && Math.abs(n - v) > 0.6) console.log(`     ${axis} ${v.toFixed(2)} → ${n.toFixed(2)}  (${src(new Error())})`); v = n; }, enumerable: true, configurable: true }); }
}

// ── Mini test çerçevesi ──
const failures = [];
let total = 0;
function check(name, ok, detail = '') { total++; console.log(`${ok ? '  ok ' : ' FAIL'}  ${name}${ok || !detail ? '' : '  → ' + detail}`); if (!ok) failures.push(name); }

// 1) VERİ ─────────────────────────────────────────────────────────────────────────────────────────
console.log('\n[1] Başlangıç verisi — hiçbir parça katı bloğun içinde doğmaz');
{
    const bad = [];
    const chk = (lv, kind, label, x, y, w, h, lim, s) => { const e = embed(s, x, y, w, h); if (e >= lim) bad.push(`L${lv} ${kind} ${label} (${Math.round(x)},${Math.round(y)}) ${e.toFixed(0)}px`); };
    for (const lv of LEVELS) {
        const s = setup(lv);
        s.players.forEach((p) => chk(lv, 'oyuncu', p.element, p.hitbox.position.x, p.hitbox.position.y, p.hitbox.width, p.hitbox.height, 4, s));
        s.cubes.forEach((o, i) => chk(lv, 'küp', '#' + i, o.hitbox.position.x, o.hitbox.position.y, o.hitbox.width, o.hitbox.height, 6, s));
        s.balls.forEach((o, i) => chk(lv, 'top', '#' + i, o.hitbox.position.x, o.hitbox.position.y, o.hitbox.width, o.hitbox.height, 4, s));
        s.diamonds.forEach((o, i) => chk(lv, 'elmas', o.type + i, o.hitbox.position.x, o.hitbox.position.y, o.hitbox.width, o.hitbox.height, 12, s));
        s.assets.filter((a) => a.shape === 'button' || a.shape === 'lever').forEach((o, i) => chk(lv, o.shape, '#' + i, o.hitbox.position.x, o.hitbox.position.y, o.hitbox.width, o.hitbox.height, 6, s));
        (data.doors[lv] || []).forEach((d) => chk(lv, 'kapı', d.element, d.position.x + 20, d.position.y + 20, 60, 88, 12, s));
    }
    check('10 seviyede parça/oyuncu/elmas/kapı katı blokta doğmuyor', bad.length === 0, bad.join('; '));
}

// 2) TARAMA ───────────────────────────────────────────────────────────────────────────────────────
console.log(`\n[2] Tarama — ${LEVELS.length} seviye × 3 oyun biçimi × ${SEEDS} tohum × ${FRAMES} kare (+ kapı/rampa zorlaması)`);
{
    const t = { frames: 0, maxDeepRun: 0, tunnel: 0, oob: 0, bigJump: 0, pieceHidden: 0, pieceOut: 0, unstuck: 0, sunk: 0 };
    const ex = {};
    const note = (k, v) => { if (!ex[k]) ex[k] = v; };
    for (const mode of ['random', 'hug', 'spam']) for (const lv of LEVELS) for (let seed = 1; seed <= SEEDS; seed++) {
        const s = setup(lv), pol = policy(seed, mode), R = rng(seed * 31 + lv);
        // "gates": her düğme/kol grubu kendiliğinden açılıp kapanır → rampalar oyuncu/parçanın üstüne gelir
        const groups = [...s.buttons.map((g) => (v) => g.forEach((b) => { b.pressed = v; })), ...s.levers.map((l) => (v) => { l.angle = (v ? -30 : 30) * Math.PI / 180; })];
        const timers = groups.map(() => 30 + Math.floor(R() * 200)), on = groups.map(() => false);
        const tr = new Map(s.players.map((p) => [p, { run: 0, cx: null, cy: null, px: p.position.x, py: p.position.y, resp: 0, oob: false, un: 0, sunk: false }]));
        const pieces = [...s.cubes.map((o) => ['küp', o]), ...s.balls.map((o) => ['top', o])];
        const hid = new Map(pieces.map(([, o]) => [o, 0]));
        for (let f = 0; f < FRAMES; f++) {
            if (mode !== 'random') groups.forEach((g, i) => { if (--timers[i] <= 0) { on[i] = !on[i]; g(on[i]); timers[i] = 40 + Math.floor(R() * 220); } });
            if (TRACE && TRACE.lv === lv && TRACE.mode === mode && TRACE.seed === seed && f >= TRACE.f0 && f <= TRACE.f1) traceFrame(s, f, TRACE.who);
            step(s, pol(s)); t.frames++;
            for (const p of s.players) {
                const k = tr.get(p), hb = p.hitbox, cx = hb.position.x + hb.width / 2, cy = hb.position.y + hb.height / 2;
                // yeniden doğuş ve sıkışma bekçisi (son çare) bilinçli konum değiştirir → ışınlanma sayılmaz
                const un = p.unstuckCount ?? 0; // eski kodda alan yok
                const respawned = (p.respawns || 0) !== k.resp || un !== k.un;
                if (un !== k.un) { t.unstuck++; note('unstuck', `L${lv} ${mode} s${seed} f${f} ${p.element}`); }
                k.resp = p.respawns || 0; k.un = un;
                if (!respawned) {
                    if (k.cx !== null && tunnels(s, k.cx, k.cy, cx, cy)) { t.tunnel++; note('tunnel', `L${lv} ${mode} s${seed} f${f} ${p.element}`); }
                    if (Math.abs(p.position.x - k.px) > 40 || Math.abs(p.position.y - k.py) > 40) { t.bigJump++; note('bigJump', `L${lv} ${mode} s${seed} f${f} ${p.element} (${k.px.toFixed(0)},${k.py.toFixed(0)})→(${p.position.x.toFixed(0)},${p.position.y.toFixed(0)})`); }
                }
                k.cx = cx; k.cy = cy; k.px = p.position.x; k.py = p.position.y;
                const sk = sunk(s, p) > 0;
                if (sk && !k.sunk) { t.sunk++; note('sunk', `L${lv} ${mode} s${seed} f${f} ${p.element}`); } k.sunk = sk;
                if (bodyEmbed(s, p) >= 13) { k.run++; if (k.run > t.maxDeepRun) { t.maxDeepRun = k.run; note('deep', `L${lv} ${mode} s${seed} f${f} ${p.element}`); } } else k.run = 0;
                const out = hb.position.x < -2 || hb.position.x + hb.width > GW * BS + 2 || hb.position.y < -40 || hb.position.y > GH * BS + 10;
                if (out && !k.oob) { t.oob++; note('oob', `L${lv} ${mode} s${seed} f${f} ${p.element}`); } k.oob = out;
            }
            for (const [kind, o] of pieces) {
                const e = embed(s, o.hitbox.position.x, o.hitbox.position.y, o.hitbox.width, o.hitbox.height);
                if (e >= (kind === 'küp' ? 12 : 10)) { const n = hid.get(o) + 1; hid.set(o, n); if (n === 30) { t.pieceHidden++; note('piece', `L${lv} ${mode} s${seed} f${f} ${kind}`); } } else hid.set(o, 0);
                if (o.position.x < -10 || o.position.x > GW * BS + 10) { t.pieceOut++; note('pieceOut', `L${lv} ${kind}`); }
            }
        }
    }
    console.log(`     ${t.frames} kare · en uzun gömülü seri ${t.maxDeepRun} kare · sıkışma bekçisi ${t.unstuck} kez devreye girdi`);
    check('gövde bloğa ≥13 px gömülü kalma ≤ 35 kare (bekçi 30\'da kurtarır)', t.maxDeepRun <= 35, `${t.maxDeepRun} kare @ ${ex.deep}`);
    check(`oyuncu bir bloğun içinden "batıp" geçmiyor (hitbox ≥6×≥30 px örtüşme; bütçe ≤ ${Math.floor(t.frames / 200000)})`, t.sunk <= Math.floor(t.frames / 200000), `${t.sunk} olay, ilk: ${ex.sunk}`);
    check('duvardan tünelleme yok', t.tunnel === 0, `${t.tunnel} olay, ilk: ${ex.tunnel}`);
    check('harita dışına çıkma yok', t.oob === 0, `${t.oob} olay, ilk: ${ex.oob}`);
    check('tek karede >40 px ışınlanma yok', t.bigJump === 0, `${t.bigJump} olay, ilk: ${ex.bigJump}`);
    // Bilinen sınır (docs/ates-buz-fizik-2026-09-30.md): seviye 4 kol #0 rampası ara konumdayken bir eğim/blok köşesiyle ~16 px'lik dar
    // aralık oluşturur; gövde sığmaz, bekçi ≤0,5 sn'de çözer. Bütçe kare sayısına ölçeklenir (360k: bekçi ≤3, batma ≤1).
    const unstuckBudget = Math.ceil(t.frames / 150000), sunkBudget = Math.floor(t.frames / 200000);
    check(`sıkışma bekçisi son çaredir: nadir devreye girer (≤ ${unstuckBudget} / ${t.frames} kare)`, t.unstuck <= unstuckBudget, `${t.unstuck} kez, ilk: ${ex.unstuck}`);
    check('küp/top 30 kare blokta gömülü kalmıyor', t.pieceHidden === 0, `${t.pieceHidden} olay, ilk: ${ex.piece}`);
    check('küp/top haritadan çıkmıyor', t.pieceOut === 0, `${t.pieceOut} olay, ilk: ${ex.pieceOut}`);
}

// 3) SENARYOLAR — bulunan kök nedenlerin yapıcı tekrarı ──────────────────────────────────────────────
console.log('\n[3] Senaryolar (S1–S4, S6–S9 eski kodda kırmızıdır; S5 yeni bekçiyi doğrular)');
const fire = (s) => s.players.find((p) => p.element === 'fire');
const water = (s) => s.players.find((p) => p.element === 'water');
const place = (p, x, y, vy = 0) => { p.position.x = x; p.position.y = y; p.velocity.x = 0; p.velocity.y = vy; p.lastSafe = { x, y }; p.stuckFrames = 0; p.hitboxPositionCalc(); };
const park = (s, keep) => s.players.filter((p) => p !== keep).forEach((p) => place(p, 36 * 37, 36 * 2)); // diğer oyuncuyu köşeye park et
{ // S1: kayma (3 × x−−) ile yürüme (+3) birbirini sıfırlıyordu → oyuncu köşede asılı kalıp bloğun İÇİNDEN düşüyordu
    // (hız 3.0). Durum gerçek oyundan: seviye 5, (15,16) bloğunun sol yüzünde kayma bayrağı açık, sağa basılı.
    const s = setup(5), p = fire(s); park(s, p); place(p, 483.99, 493.06, 2.14); p.sliding.left = true;
    let worst = 0;
    for (let f = 0; f < 60; f++) { step(s, { fire: { right: true } }); worst = Math.max(worst, sunk(s, p)); }
    check('S1 köşede kayma bayrağı açıkken sağa basmak oyuncuyu bloğun içinden düşürmez (hız 3.0)', worst === 0, `hitbox ${worst.toFixed(1)} px yatay bindirmeyle bloğun içinden geçti`);
}
{ // S2: dikey rampa kapısına 3 px bitişik, eğimde durup zıpla → "tavan" sanıp rampanın ALTINA 78 px ışınlanıyordu
    const s = setup(5), p = water(s); park(s, p); place(p, 625.49, 426.98);
    p.isOnBlock = true;
    let maxDy = 0;
    for (let f = 0; f < 4; f++) { const y0 = p.position.y; step(s, { water: { up: true } }); maxDy = Math.max(maxDy, Math.abs(p.position.y - y0)); }
    check('S2 dikey rampaya bitişikken zıplama ışınlamaz (|Δy| ≤ 12)', maxDy <= 12, `en büyük Δy ${maxDy.toFixed(1)}`);
}
{ // S3: rampaya ~13 px bindirmiş oyuncu bloktan UZAĞA (sola) zıplıyor → bloğun öbür yüzüne +51 px ışınlanıyordu
    const s = setup(5), p = fire(s); park(s, p); place(p, 635.49, 400.98, -4.2);
    const gateX = 689; // dikey rampa kapısının sol yüzü (seviye 5)
    let maxDx = 0;
    for (let f = 0; f < 6; f++) { const x0 = p.position.x; step(s, { fire: { left: true, up: true } }); maxDx = Math.max(maxDx, Math.abs(p.position.x - x0)); }
    const rightEdge = p.hitbox.position.x + p.hitbox.width;
    check('S3 bloktan uzağa yürürken öbür yüze geçmez (kapının solunda kalır, |Δx| ≤ 16)', rightEdge <= gateX + 0.5 && maxDx <= 16, `sağ kenar ${rightEdge.toFixed(1)} (kapı ${gateX}), en büyük Δx ${maxDx.toFixed(1)}`);
}
{ // S4: Seviye 6'da top duvarın içinde doğuyordu (ilk 2 karede 15+36 px ışınlanıp zemin görselinin altında kalıyordu)
    const s = setup(6), b = s.balls[1], y0 = b.position.y;
    let maxDy = 0;
    for (let f = 0; f < 4; f++) { const y = b.position.y; step(s, {}); maxDy = Math.max(maxDy, Math.abs(b.position.y - y)); }
    check('S4 seviye 6 topu doğarken ışınlanmaz', maxDy <= 10 && Math.abs(b.position.y - y0) < 15, `Δy ${maxDy.toFixed(1)}`);
}
{ // S5: bekçi — çözümleyici bozulsa bile gömülü oyuncu ≤ ~31 karede son serbest konumuna döner
    const s = setup(2), p = fire(s);
    for (let i = 0; i < 5; i++) step(s, {});
    const safe = { ...p.lastSafe };
    p.horizontalCollision = () => {}; p.verticalCollision = () => {}; p.gravity = () => {};
    p.position.y += 40; // zemin bloklarının içine
    for (let i = 0; i < 35; i++) step(s, {});
    check('S5 bekçi: gömülü oyuncu son serbest konuma döner', p.position.x === safe.x && p.position.y === safe.y, `(${p.position.x},${p.position.y}) ≠ (${safe.x},${safe.y})`);
}

// Sentetik rampa (havada duran katı yatay/dikey çubuk) — korumaları tek başına sınamak için
const makeRamp = (x, y, w, h) => ({ shape: 'ramp', hitbox: { position: { x, y }, width: w, height: h }, blocked: false });
{ // S6: küp, dikey rampa kapısına 10 px bindirmiş ve bloktan UZAĞA (sola) itiliyor → eskiden kapının öbür yüzüne ~100 px ışınlanıyordu
    const s = setup(5); park(s, null);
    const cube = new Cube({ position: { x: 689 - 64 + 10, y: 430 }, collisionBlocks: s.blocks, allAssets: s.assets, players: s.players });
    s.cubes.push(cube); s.assets.push(cube);
    cube.hitboxPositionCalc();
    let maxDx = 0;
    for (let f = 0; f < 3; f++) { const x0 = cube.position.x; cube.velocity.x = -1.5; cube.update(); maxDx = Math.max(maxDx, Math.abs(cube.position.x - x0)); }
    check('S6 küp bloktan uzağa itilirken kapının öbür yüzüne ışınlanmaz (|Δx| ≤ 16)', maxDx <= 16, `en büyük Δx ${maxDx.toFixed(1)}`);
}
{ // S7: top, dikey rampa kapısına bindirmiş ve bloktan uzağa gidiyor → eskiden geniş rampada +136 px ışınlanıyordu
    const s = setup(5); park(s, null);
    const ball = new Ball({ position: { x: 689 - 28 + 8, y: 440 }, collisionBlocks: s.blocks, allAssets: s.assets });
    s.balls.push(ball); s.assets.push(ball);
    ball.hitboxPositionCalc();
    let maxDx = 0;
    for (let f = 0; f < 3; f++) { const x0 = ball.position.x; ball.velocity.x = -2; ball.update(); maxDx = Math.max(maxDx, Math.abs(ball.position.x - x0)); }
    check('S7 top bloktan uzağa giderken kapının öbür yüzüne ışınlanmaz (|Δx| ≤ 16)', maxDx <= 16, `en büyük Δx ${maxDx.toFixed(1)}`);
}
{ // S8: iniş koruması — ayaklar geniş bir yatay rampanın 24 px İÇİNDE (yan gömülme) → rampanın üstüne yukarı ışınlanmaz
    const s = setup(2), p = fire(s); park(s, p); s.assets.push(makeRamp(400, 300, 108, 26));
    place(p, 405, 225); // hitbox (436, 262..322): ayaklar rampa üstünden 22 px aşağıda, gövde x-aralığının içinde
    let maxUp = 0;
    for (let f = 0; f < 2; f++) { const y0 = p.position.y; step(s, {}); maxUp = Math.max(maxUp, y0 - p.position.y); }
    check('S8 rampanın içine gömülü ayaklar tek karede yukarı ışınlanmaz (yükselme ≤ 10)', maxUp <= 10, `yükselme ${maxUp.toFixed(1)} px`);
}
{ // S9: tavan koruması — kafa geniş bir yatay rampanın alt yüzüne 20 px gömülü, yukarı çıkıyor → rampanın ALTINA aşağı ışınlanmaz
    const s = setup(2), p = fire(s); park(s, p); s.assets.push(makeRamp(400, 300, 108, 26));
    place(p, 405, 326 - 20 - 37, -3); // hitbox.y = 306: kafa rampa (300..326) içinde, alt yüzden 20 px yukarıda; gövde x-aralığının içinde
    let maxDown = 0;
    for (let f = 0; f < 2; f++) { const y0 = p.position.y; step(s, {}); maxDown = Math.max(maxDown, (p.position.y - y0) + 3); } // doğal hareket ≈ −3 (yukarı)
    check('S9 rampanın içine gömülü kafa tek karede aşağı ışınlanmaz (sapma ≤ 10)', maxDown <= 10, `aşağı sapma ${maxDown.toFixed(1)} px`);
}
{ // S10: eğim (üçgen) kafa-çarpışması hücrenin UZAK yüzüne atıyordu (seviye 4, geniş taramada yakalanan durum: 65–72 px yanal sıçrama)
    // Hücre (20,20) sağ-yukarı üçgen (x 720..756, y 720..756). Oyuncu hitbox'ı hücrenin sağ kenarına 6 px bindirmiş (x=750..786),
    // gövde altı hücre alt sınırını geçmiş, yukarı çıkıyor ve SAĞA (hücreden uzağa) basıyor.
    const s = setup(4), p = water(s); park(s, p); place(p, 719, 716.58, -2.67);
    const x0 = p.position.x;
    step(s, { water: { right: true } });
    const dx = Math.abs(p.position.x - x0);
    check('S10 eğim hücresiyle kafa çarpışmasında hücrenin öbür yüzüne ışınlanmaz (|Δx| ≤ 16)', dx <= 16, `Δx ${dx.toFixed(1)}`);
}
{ // S11: kayma iptali YALNIZ kare bloğa yaslıyken — serbest havada kayma bayrağı açıkken yürüme iptal OLMAZ (eğimde tırmanma/iniş bozulmasın)
    const s = setup(2), p = fire(s); park(s, p); place(p, 300, 50); // seviye 2 üst boşluk: çevrede kare blok yok
    p.sliding.left = true;
    const x0 = p.position.x;
    step(s, { fire: { right: true } });
    check('S11 serbest havada kayma bayrağı yürümeyi iptal etmez (Δx ≥ 2,5)', p.position.x - x0 >= 2.5, `Δx ${(p.position.x - x0).toFixed(2)}`);
}
{ // S12a: küp iniş koruması — küp, yüksek (80 px) bir rampanın üst kenarından 40 px içinde (yan gömülme) → rampanın üstüne ışınlanmaz
    const s = setup(2); park(s, null); s.assets.push(makeRamp(400, 300, 108, 80));
    const cube = new Cube({ position: { x: 420, y: 273 }, collisionBlocks: s.blocks, allAssets: s.assets, players: s.players });
    s.cubes.push(cube); s.assets.push(cube); cube.hitboxPositionCalc();
    const y0 = cube.position.y; cube.update();
    check('S12a küp rampanın içine gömülüyken tek karede yukarı ışınlanmaz (yükselme ≤ 10)', y0 - cube.position.y <= 10, `yükselme ${(y0 - cube.position.y).toFixed(1)} px`);
}
{ // S12b: küp tavan koruması — küpün üstü rampanın alt yüzüne 20 px gömülü → rampanın ALTINA aşağı ışınlanmaz
    const s = setup(2); park(s, null); s.assets.push(makeRamp(400, 300, 108, 80));
    const cube = new Cube({ position: { x: 420, y: 359 }, collisionBlocks: s.blocks, allAssets: s.assets, players: s.players });
    s.cubes.push(cube); s.assets.push(cube); cube.hitboxPositionCalc();
    const y0 = cube.position.y; cube.update();
    check('S12b küp rampanın alt yüzüne gömülüyken tek karede aşağı ışınlanmaz (inme ≤ 10)', cube.position.y - y0 <= 10, `inme ${(cube.position.y - y0).toFixed(1)} px`);
}
{ // S13: top tavan koruması — topun üstü rampanın alt yüzüne 20 px gömülü → rampanın ALTINA aşağı ışınlanmaz
    const s = setup(2); park(s, null); s.assets.push(makeRamp(400, 300, 108, 80));
    const ball = new Ball({ position: { x: 440, y: 359 }, collisionBlocks: s.blocks, allAssets: s.assets });
    s.balls.push(ball); s.assets.push(ball); ball.hitboxPositionCalc();
    const y0 = ball.position.y; ball.update();
    check('S13 top rampanın alt yüzüne gömülüyken tek karede aşağı ışınlanmaz (inme ≤ 10)', ball.position.y - y0 <= 10, `inme ${(ball.position.y - y0).toFixed(1)} px`);
}

console.log(`\n${failures.length ? 'BAŞARISIZ' : 'GEÇTİ'}: ${total - failures.length}/${total} denetim` + (failures.length ? `\n  kırmızı: ${failures.join(' | ')}` : ''));
process.exit(failures.length ? 1 : 0);
