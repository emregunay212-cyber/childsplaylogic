/* Pıtır — saf fizik çekirdeği (PCore)
   DOM, zaman ve rastgelelik YOK: tarayıcı (game.js), Node testleri ve doğrulama botu aynı kodu çalıştırır.
   Sabit adım 120 Hz. Birim: 1 karo. y yukarı.

   Zemin: ASCII karo haritası → her karonun çokgeni → ortak kenarlar birbirini siler → kalan dış kenarlar
   aynı doğrultuda birleştirilir. Böylece top karo dikişlerine takılmaz (plan §5.1, test F4).
   Top: daire; kenarlara en yakın nokta ile çözülür (köşeler yuvarlak davranır), alt adımlarla tünelleme yok (F3).

   API:
     PCore.prepare(level)              → L (kenarlar, kova dizini, tehlikeler, yıldızlar…)
     PCore.createState(L)              → st
     PCore.step(st, L, input)          → input = { l, r, j } (bool); olaylar st.ev[]
     PCore.clone(st)
     PCore.solve(L, opts)              → doğrulama botu
     PCore.replay(L, inputs, opts)
*/
/* global module */
(function (root) {
    'use strict';

    const STEP = 1 / 120;
    const K = {
        R: 0.42, G: 30, MAX_RUN: 6.5, ACC_GROUND: 30, ACC_AIR: 16, FRICTION: 22, ICE_FRICTION: 3, TURN: 26,
        JUMP_V: 12, JUMP_CUT: 0.45, COYOTE: 12, BUFFER: 15, MAX_FALL: 17, MAX_SPEED: 13,
        GROUND_N: 0.7,            // normalin y bileşeni bundan büyükse zemin (≈ 45°'ye kadar)
        FLAT_N: 0.978,            // ≈ 12°: bu kadar düz eğimde tuş bırakılınca durur
        SPRING_V: 17, SUB: 0.2, FALL_DIE: -4,
    };

    // ── Karo şekilleri (yerel 0..1, saat yönü tersine) ──
    const SQ = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const SHAPES = {
        '#': SQ, 'I': SQ, '<': SQ, '>': SQ, 'T': SQ,
        '/': [[0, 0], [1, 0], [1, 1]],                 // sağa yükselen 45°
        '\\': [[0, 0], [1, 0], [0, 1]],                // sağa alçalan 45°
        '(': [[0, 0], [1, 0], [1, 0.5]],               // sağa yükselen 22,5° — alt yarı
        '{': [[0, 0], [1, 0], [1, 1], [0, 0.5]],       // sağa yükselen 22,5° — üst yarı
        ')': [[0, 0], [1, 0], [1, 0.5], [0, 1]],       // sağa alçalan 22,5° — üst yarı
        '}': [[0, 0], [1, 0], [0, 0.5]],               // sağa alçalan 22,5° — alt yarı
    };
    const MAT = { '#': 'z', 'I': 'buz', '<': 'bantL', '>': 'bantR', 'T': 'yay', '/': 'z', '\\': 'z', '(': 'z', '{': 'z', ')': 'z', '}': 'z' };
    const BELT = 3;
    const BUCKET = 4;

    function keyPt(x, y) { return Math.round(x * 2) + ',' + Math.round(y * 2); }

    // ── Hazırlık ──
    function prepare(level) {
        const rows = level.harita;
        const H = rows.length;
        const W = Math.max(...rows.map(r => r.length));
        const at = (cx, cy) => { const r = rows[H - 1 - cy]; return (r && cx >= 0 && cx < r.length) ? r[cx] : ' '; };
        const raw = [];          // yönlü kenar parçaları
        const spikes = [], stars = [], cps = [], oneway = [], water = [], acid = [];
        let start = null, finish = null;

        for (let cy = 0; cy < H; cy++) {
            for (let cx = 0; cx < W; cx++) {
                const ch = at(cx, cy);
                const sh = SHAPES[ch];
                if (sh) {
                    for (let i = 0; i < sh.length; i++) {
                        const a = sh[i], b = sh[(i + 1) % sh.length];
                        const ax = cx + a[0], ay = cy + a[1], bx = cx + b[0], by = cy + b[1];
                        // eksen hizalı kenarları 0,5'lik parçalara böl (yarım eğim komşulukları da silinebilsin)
                        if (ax === bx || ay === by) {
                            const len = Math.abs(bx - ax) + Math.abs(by - ay);
                            const n = Math.round(len * 2);
                            for (let k = 0; k < n; k++) {
                                const t0 = k / n, t1 = (k + 1) / n;
                                raw.push({ ax: ax + (bx - ax) * t0, ay: ay + (by - ay) * t0, bx: ax + (bx - ax) * t1, by: ay + (by - ay) * t1, mat: MAT[ch] });
                            }
                        } else raw.push({ ax, ay, bx, by, mat: MAT[ch] });
                    }
                    continue;
                }
                switch (ch) {
                    case '=': oneway.push({ ax: cx + 1, ay: cy + 1, bx: cx, by: cy + 1, mat: 'z', oneway: true }); break;
                    case '^': spikes.push([cx + 0.18, cy, cx + 0.82, cy + 0.55]); break;
                    case 'v': spikes.push([cx + 0.18, cy + 0.45, cx + 0.82, cy + 1]); break;
                    case '*': stars.push({ no: stars.length + 1, x: cx + 0.5, y: cy + 0.5 }); break;
                    case 'C': cps.push({ x: cx + 0.5, y: cy }); break;
                    case 'S': start = { x: cx + 0.5, y: cy + K.R + 0.001 }; break;
                    case 'F': finish = [cx, cy, cx + 1, cy + 2.5]; break;
                    case '~': water.push([cx, cy, cx + 1, cy + 1]); break;
                    case '%': acid.push([cx + 0.1, cy, cx + 0.9, cy + 0.85]); break;
                    default: break;
                }
            }
        }
        // ortak kenarları sil (yönsüz anahtar iki kez geçiyorsa iç kenardır)
        const count = new Map();
        const ukey = (e) => { const p = keyPt(e.ax, e.ay), q = keyPt(e.bx, e.by); return p < q ? p + '|' + q : q + '|' + p; };
        raw.forEach(e => { const k = ukey(e); count.set(k, (count.get(k) || 0) + 1); });
        const outer = raw.filter(e => count.get(ukey(e)) === 1);
        // aynı doğrultudaki ardışık kenarları birleştir
        const byStart = new Map();
        outer.forEach(e => { e.dead = false; byStart.set(keyPt(e.ax, e.ay) + e.mat, e); });
        const dirOf = (e) => { const dx = e.bx - e.ax, dy = e.by - e.ay, l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
        outer.forEach(e => {
            if (e.dead) return;
            for (;;) {
                const nx = byStart.get(keyPt(e.bx, e.by) + e.mat);
                if (!nx || nx === e || nx.dead) break;
                const d1 = dirOf(e), d2 = dirOf(nx);
                if (Math.abs(d1[0] - d2[0]) > 1e-9 || Math.abs(d1[1] - d2[1]) > 1e-9) break;
                e.bx = nx.bx; e.by = nx.by; nx.dead = true;
                byStart.delete(keyPt(nx.ax, nx.ay) + nx.mat);
            }
        });
        const segs = outer.filter(e => !e.dead).concat(oneway).map(finishSeg);
        const nb = Math.ceil(W / BUCKET) + 1;
        const buckets = Array.from({ length: nb }, () => []);
        segs.forEach((s, i) => {
            const x0 = Math.min(s.ax, s.bx) - 1, x1 = Math.max(s.ax, s.bx) + 1;
            for (let b = Math.max(0, Math.floor(x0 / BUCKET)); b <= Math.min(nb - 1, Math.floor(x1 / BUCKET)); b++) buckets[b].push(i);
        });
        if (!start) throw new Error(level.id + ': S (başlangıç) yok');
        if (!finish) throw new Error(level.id + ': F (bitiş) yok');
        cps.sort((a, b) => a.x - b.x);
        const solid = (cx, cy) => !!SHAPES[at(cx, cy)];
        const dyn = prepareDyn(level, at, W, H);
        return { level, W, H, segs, buckets, spikes, stars, cps, start, finish, water, acid, solid, dyn };
    }

    function finishSeg(e) {
        const dx = e.bx - e.ax, dy = e.by - e.ay, l = Math.hypot(dx, dy);
        // saat yönü tersine çokgende dış normal = (dy, -dx) / l
        return { ax: e.ax, ay: e.ay, bx: e.bx, by: e.by, dx, dy, len2: dx * dx + dy * dy, nx: dy / l, ny: -dx / l, mat: e.mat, oneway: !!e.oneway };
    }

    function createState(L) {
        return {
            x: L.start.x, y: L.start.y, vx: 0, vy: 0,
            ground: false, gnx: 0, gny: 1, gmat: 'z',
            coyote: 0, buf: 0, jumping: false, cut: false, prevJ: false,
            dead: false, done: false, step: 0, cp: -1, stars: [], ev: [],
            o: initDyn(L), onM: -1, onF: -1, push: 0, snap: null, spring: false,
        };
    }

    // Elle yazılmış sabit biçimli kopya: Object.assign büyük nesnede yavaş "sözlük" biçimine düşüyordu (bot 6× yavaşladı).
    function clone(st) {
        const o = st.o;
        return {
            x: st.x, y: st.y, vx: st.vx, vy: st.vy,
            ground: st.ground, gnx: st.gnx, gny: st.gny, gmat: st.gmat,
            coyote: st.coyote, buf: st.buf, jumping: st.jumping, cut: st.cut, prevJ: st.prevJ,
            dead: st.dead, done: st.done, step: st.step, cp: st.cp, stars: st.stars.slice(), ev: [],
            o: (o.box.length || o.fall.length || o.btn.length) ? copyDyn(o) : o,   // durumsuz bölümde paylaşılır
            onM: st.onM, onF: st.onF, push: st.push, snap: st.snap, spring: st.spring,   // snap değişmez → paylaşılır
        };
    }

    // ── Çarpışma ──
    function resolve(st, L, prevBottom) {
        const R = K.R;
        // haritanın sol / sağ kenarı görünmez duvar (top dünyadan çıkmaz, kova dizini hep geçerli)
        if (st.x < R) { st.x = R; if (st.vx < 0) st.vx = 0; }
        else if (st.x > L.W - R) { st.x = L.W - R; if (st.vx > 0) st.vx = 0; }
        const b = Math.min(L.buckets.length - 1, Math.max(0, Math.floor(st.x / BUCKET)));
        const list = L.buckets[b];
        for (let it = 0; it < 3; it++) {
            let moved = false;
            for (let k = 0; k < list.length; k++) {
                const s = L.segs[list[k]];
                if (s.oneway && !(st.vy <= 0.01 && prevBottom >= s.ay - 0.06)) continue;
                // merkez kenarın arkasındaysa bu kenar değil, komşusu çözer (köşede yandan takılmayı önler)
                if ((st.x - s.ax) * s.nx + (st.y - s.ay) * s.ny < 0) continue;
                let t = ((st.x - s.ax) * s.dx + (st.y - s.ay) * s.dy) / s.len2;
                if (t < 0) t = 0; else if (t > 1) t = 1;
                const px = s.ax + s.dx * t, py = s.ay + s.dy * t;
                let dx = st.x - px, dy = st.y - py;
                const d2 = dx * dx + dy * dy;
                if (d2 >= R * R) continue;
                const d = Math.sqrt(d2);
                let nx, ny;
                if (d < 1e-9) { nx = s.nx; ny = s.ny; } else { nx = dx / d; ny = dy / d; }
                const pen = R - d;
                st.x += nx * pen; st.y += ny * pen;
                moved = true;
                const vn = st.vx * nx + st.vy * ny;
                if (vn < 0) { st.vx -= vn * nx; st.vy -= vn * ny; }
                if (ny > K.GROUND_N) {
                    st.ground = true; st.gnx = nx; st.gny = ny; st.gmat = s.mat;
                    if (s.mat === 'yay' && ny > 0.95) st.spring = true;
                }
            }
            if (!moved) break;
        }
    }

    // ── Dinamik nesneler (plan §3.3, §3.4) ──
    // Tanımlar L.dyn içinde, değişen durum st içinde düz sayılardır (clone ucuz, bot tarayabilir).
    //   kutu     {x, y}                 : 0,9×0,9 AABB, yerçekimi, top iter (itilirken top hızı ≤ 3), üst üste durur, çukura düşer
    //   (platform ve kirpi için faz: 0..1, döngüde başlangıç kayması)
    //   platform {x, y, w, dx, dy, per} : kinematik; (x,y)→(x+dx,y+dy) gidip gelir, per adımda bir tur (yumuşak uçlar); üstündekini taşır
    //   duser    {x, y, w}              : üstüne basılınca 0,5 sn titrer, sonra düşer
    //   dugme    {x, y, kapi, tur}      : top ya da kutu basar; tur 'bir' (bir kez açar) | 'tut' (basılıyken açık)
    //   kapi     {id, x, y, h}          : 0,6 genişlik, 0,4 sn'de yukarı kayar; altında top/kutu varken kapanmaz
    //   kirpi    {x0, x1, y, per}       : x0↔x1 arasında sabit hızla yürür; dokunmak (üstüne düşmek de) ölümdür
    // y değerleri: kutu/düğme/kapı/kirpi için durduğu zemin, platform/düşen için ÜST yüzey.
    const BOX = 0.9, PLAT_T = 0.4, PUSH_V = 3, FALL_WAIT = 60, DOOR_T = 48, KIRPI_R = 0.42;

    function prepareDyn(level, at, W, H) {
        const d = { kutu: [], platform: [], duser: [], dugme: [], kapi: [], kirpi: [], per: 0 };
        for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) if (at(cx, cy) === 'B') d.kutu.push({ x: cx, y: cy });
        (level.nesneler || []).forEach(o => {
            if (o.t === 'kutu') d.kutu.push({ x: o.x, y: o.y });
            else if (o.t === 'platform') d.platform.push({ x: o.x, y: o.y, w: o.w || 3, dx: o.dx || 0, dy: o.dy || 0, per: o.per || 480, f: Math.round((o.faz || 0) * (o.per || 480)) });
            else if (o.t === 'duser') d.duser.push({ x: o.x, y: o.y, w: o.w || 2 });
            else if (o.t === 'dugme') d.dugme.push({ x: o.x, y: o.y, kapi: o.kapi, tur: o.tur || 'bir' });
            else if (o.t === 'kapi') d.kapi.push({ id: o.id, x: o.x, y: o.y, h: o.h || 3 });
            else if (o.t === 'kirpi') d.kirpi.push({ x0: o.x0, x1: o.x1, y: o.y, per: o.per || 480, f: Math.round((o.faz || 0) * (o.per || 480)) });
            else throw new Error((level.id || '?') + ': bilinmeyen nesne ' + o.t);
        });
        d.kapi.forEach(k => { k.btn = []; });
        d.dugme.forEach((b, i) => {
            const k = d.kapi.find(q => q.id === b.kapi);
            if (!k) throw new Error((level.id || '?') + ': düğmenin kapısı yok: ' + b.kapi);
            k.btn.push(i);
        });
        // döngüsel nesnelerin ortak periyodu (bot anahtarındaki faz için)
        const gcd = (a, b) => (b ? gcd(b, a % b) : a);
        let per = 0;
        d.platform.concat(d.kirpi).forEach(o => { per = per ? per / gcd(per, o.per) * o.per : o.per; });
        d.per = per;
        d.any = d.kutu.length + d.platform.length + d.duser.length + d.dugme.length + d.kirpi.length > 0;
        return d;
    }
    function initDyn(L) {
        const d = L.dyn;
        return {
            box: d.kutu.map(b => ({ x: b.x + 0.05, y: b.y, vy: 0 })),
            fall: d.duser.map(() => ({ t: 0, dy: 0, vy: 0 })),
            btn: d.dugme.map(() => 0),
            door: d.kapi.map(() => 0),
        };
    }
    function copyDyn(o) {
        return { box: o.box.map(b => ({ x: b.x, y: b.y, vy: b.vy })), fall: o.fall.map(f => ({ t: f.t, dy: f.dy, vy: f.vy })), btn: o.btn.slice(), door: o.door.slice() };
    }
    // hareketli platform konumu (t adımında): yumuşak uçlu gidiş-dönüş
    function moverAt(m, t) {
        const p = (1 - Math.cos(2 * Math.PI * ((t + m.f) % m.per) / m.per)) / 2;
        return [m.x + m.dx * p, m.y + m.dy * p];
    }
    function kirpiAt(k, t) {
        const q = ((t + k.f) % k.per) / k.per, p = q < 0.5 ? q * 2 : 2 - q * 2;
        return [k.x0 + (k.x1 - k.x0) * p, q < 0.5 ? 1 : -1];
    }
    function doorRect(L, st, i) {
        const k = L.dyn.kapi[i], up = k.h * st.o.door[i] / DOOR_T;
        return [k.x + 0.2, k.y + up, k.x + 0.8, k.y + k.h + up];
    }
    function boxRect(b) { return [b.x, b.y, b.x + BOX, b.y + BOX]; }
    function overlap(a, b) { return a[0] < b[2] - 1e-9 && a[2] > b[0] + 1e-9 && a[1] < b[3] - 1e-9 && a[3] > b[1] + 1e-9; }

    // kutunun çarpabileceği katı dikdörtgenler (karo hücreleri, öbür kutular, kapalı kapılar)
    function boxObstacles(L, st, bi, r) {
        const out = [];
        for (let cx = Math.floor(r[0]) - 1; cx <= Math.floor(r[2]) + 1; cx++) {
            for (let cy = Math.floor(r[1]) - 1; cy <= Math.floor(r[3]) + 1; cy++) if (L.solid(cx, cy)) out.push([cx, cy, cx + 1, cy + 1]);
        }
        st.o.box.forEach((b, j) => { if (j !== bi && b.y > -50) out.push(boxRect(b)); });
        for (let i = 0; i < L.dyn.kapi.length; i++) out.push(doorRect(L, st, i));
        return out;
    }
    // kutuyu eksen boyunca taşı, engelde dur; gerçekleşen yer değiştirmeyi döndür
    function moveBox(L, st, bi, dx, dy) {
        const b = st.o.box[bi];
        const r = boxRect(b);
        const n = dx !== 0 ? [r[0] + dx, r[1], r[2] + dx, r[3]] : [r[0], r[1] + dy, r[2], r[3] + dy];
        const obs = boxObstacles(L, st, bi, [Math.min(r[0], n[0]), Math.min(r[1], n[1]), Math.max(r[2], n[2]), Math.max(r[3], n[3])]);
        let mv = dx !== 0 ? dx : dy;
        for (const o of obs) {
            if (overlap(r, o)) continue;              // zaten iç içe (başlangıç hatası) → yok say, sıkışma olmasın
            if (dx !== 0) {
                if (!(r[1] < o[3] - 1e-9 && r[3] > o[1] + 1e-9)) continue;
                if (mv > 0 && o[0] >= r[2] - 1e-9) mv = Math.min(mv, o[0] - r[2]);
                else if (mv < 0 && o[2] <= r[0] + 1e-9) mv = Math.max(mv, o[2] - r[0]);
            } else {
                if (!(r[0] < o[2] - 1e-9 && r[2] > o[0] + 1e-9)) continue;
                if (mv > 0 && o[1] >= r[3] - 1e-9) mv = Math.min(mv, o[1] - r[3]);
                else if (mv < 0 && o[3] <= r[1] + 1e-9) mv = Math.max(mv, o[3] - r[1]);
            }
        }
        if (dx !== 0) b.x += mv; else b.y += mv;
        return mv;
    }

    // dinamik nesneleri bir adım ilerlet (top hareketinden önce); t = bu adımın zamanı
    function stepDyn(st, L, t) {
        const d = L.dyn, o = st.o, dt = STEP;
        // hareketli platform üstündeki topu taşı
        if (st.onM >= 0) {
            const a = moverAt(d.platform[st.onM], t - 1), b = moverAt(d.platform[st.onM], t);
            st.x += b[0] - a[0]; st.y += b[1] - a[1];
        }
        // düşen platformlar
        for (let i = 0; i < o.fall.length; i++) {
            const f = o.fall[i];
            if (f.t === 0 && st.onF === i) f.t = 1;
            if (f.t > 0) {
                f.t++;
                if (f.t > FALL_WAIT && f.dy > -30) { f.vy = Math.max(-K.MAX_FALL, f.vy - K.G * dt); f.dy += f.vy * dt; }
            }
        }
        // kutular: yerçekimi (alttan üste, yığınlar düzgün otursun)
        const order = o.box.map((b, i) => i).sort((a, b) => o.box[a].y - o.box[b].y);
        for (const i of order) {
            const b = o.box[i];
            if (b.y < -50) continue;
            b.vy = Math.max(-K.MAX_FALL, b.vy - K.G * dt);
            const want = b.vy * dt, got = moveBox(L, st, i, 0, want);
            if (Math.abs(got - want) > 1e-9) b.vy = 0;
            if (b.y < K.FALL_DIE) { b.y = -100; b.vy = 0; }
        }
        // düğmeler
        for (let i = 0; i < d.dugme.length; i++) {
            const q = d.dugme[i], plate = [q.x + 0.1, q.y, q.x + 0.9, q.y + 0.3];
            let on = circleRect(st.x, st.y, K.R + 0.02, plate);
            for (let j = 0; !on && j < o.box.length; j++) {
                const b = o.box[j];
                if (b.x < plate[2] && b.x + BOX > plate[0] && b.y <= q.y + 0.2 && b.y >= q.y - 0.2) on = true;
            }
            if (q.tur === 'bir') { if (on && !o.btn[i]) { o.btn[i] = 1; st.ev.push('btn'); } }
            else { if (on && !o.btn[i]) st.ev.push('btn'); o.btn[i] = on ? 1 : 0; }
        }
        // kapılar
        for (let i = 0; i < d.kapi.length; i++) {
            const k = d.kapi[i], open = k.btn.some(bi => o.btn[bi]);
            if (open && o.door[i] < DOOR_T) o.door[i]++;
            else if (!open && o.door[i] > 0) {
                // kapanırken altında top ya da kutu varsa bekle (ezmez, sıkıştırmaz)
                const full = [k.x + 0.2, k.y, k.x + 0.8, k.y + k.h];
                const block = circleRect(st.x, st.y, K.R + 0.05, full) || o.box.some(b => overlap(boxRect(b), full));
                if (!block) o.door[i]--;
            }
        }
    }

    // topun çarpabileceği dinamik dikdörtgenler (t anında)
    function dynRects(st, L, t) {
        const d = L.dyn, out = [];
        for (let i = 0; i < d.platform.length; i++) {
            const m = d.platform[i], p = moverAt(m, t);
            out.push({ r: [p[0], p[1] - PLAT_T, p[0] + m.w, p[1]], k: 'm', i });
        }
        for (let i = 0; i < d.duser.length; i++) {
            const f = d.duser[i], s = st.o.fall[i];
            if (s.dy > -30) out.push({ r: [f.x, f.y - PLAT_T + s.dy, f.x + f.w, f.y + s.dy], k: 'f', i });
        }
        for (let i = 0; i < d.kapi.length; i++) out.push({ r: doorRect(L, st, i), k: 'd', i });
        for (let i = 0; i < st.o.box.length; i++) if (st.o.box[i].y > -50) out.push({ r: boxRect(st.o.box[i]), k: 'b', i });
        return out;
    }
    // topu dinamik dikdörtgenlerden çıkar; kutuya yandan dayanırsa kutuyu it
    function resolveDyn(st, L, rects) {
        const R = K.R;
        let moved = false;
        for (const q of rects) {
            let r = q.r;
            let px = Math.max(r[0], Math.min(st.x, r[2])), py = Math.max(r[1], Math.min(st.y, r[3]));
            let dx = st.x - px, dy = st.y - py, d2 = dx * dx + dy * dy;
            if (d2 >= R * R) continue;
            let nx, ny, d = Math.sqrt(d2);
            if (d < 1e-9) {
                // merkez içeride: en kısa çıkış yönü
                const e = [st.x - r[0], r[2] - st.x, st.y - r[1], r[3] - st.y], m = Math.min(...e);
                if (m === e[3]) { nx = 0; ny = 1; } else if (m === e[0]) { nx = -1; ny = 0; } else if (m === e[1]) { nx = 1; ny = 0; } else { nx = 0; ny = -1; }
                d = -m;
            } else { nx = dx / d; ny = dy / d; }
            if (q.k === 'b' && Math.abs(nx) > 0.7 && st.vx * nx < 0) {
                // kutuyu it: kutu toptan uzaklaşır, engel varsa durur
                const want = -nx * (R - d), got = moveBox(L, st, q.i, want, 0);
                st.push = -Math.sign(nx);
                r = q.r = boxRect(st.o.box[q.i]);
                if (Math.abs(got - want) < 1e-9) continue;     // kutu tam kaydı: top hızını korur (iter, durmaz)
                px = Math.max(r[0], Math.min(st.x, r[2])); py = Math.max(r[1], Math.min(st.y, r[3]));
                dx = st.x - px; dy = st.y - py; d2 = dx * dx + dy * dy;
                if (d2 >= R * R) continue;
                d = Math.sqrt(d2);
                if (d > 1e-9) { nx = dx / d; ny = dy / d; }
            }
            if (q.k === 'm' && ny < -K.GROUND_N && st.ground) {
                // inen asansör yerdeki topa değdi: ezmez, topu platformun boş tarafına iter
                const L0 = r[0] - R - 0.01, R0 = r[2] + R + 0.01, cy = Math.floor(st.y);
                const solL = L.solid(Math.floor(L0), cy), solR = L.solid(Math.floor(R0), cy);
                const goL = solR || (!solL && st.x - r[0] < r[2] - st.x);
                st.x = goL ? L0 : R0; st.vx = 0;
                moved = true;
                continue;
            }
            const pen = R - d;
            st.x += nx * pen; st.y += ny * pen;
            moved = true;
            const vn = st.vx * nx + st.vy * ny;
            if (vn < 0) { st.vx -= vn * nx; st.vy -= vn * ny; }
            if (ny > K.GROUND_N) {
                st.ground = true; st.gnx = nx; st.gny = ny; st.gmat = 'z';
                if (q.k === 'm') st.onM = q.i; else if (q.k === 'f') st.onF = q.i;
            }
        }
        return moved;
    }
    // çizim için: nesnelerin o anki görünümü
    function dynView(L, st) {
        const d = L.dyn, t = st.step;
        return {
            kutu: st.o.box.filter(b => b.y > -50).map(boxRect),
            platform: d.platform.map(m => { const p = moverAt(m, t); return [p[0], p[1] - PLAT_T, p[0] + m.w, p[1]]; }),
            duser: d.duser.map((f, i) => { const s = st.o.fall[i]; return { r: [f.x, f.y - PLAT_T + s.dy, f.x + f.w, f.y + s.dy], titre: s.t > 0 && s.t <= FALL_WAIT, gitti: s.dy <= -30 }; }),
            dugme: d.dugme.map((q, i) => ({ x: q.x, y: q.y, on: !!st.o.btn[i], tur: q.tur })),
            kapi: d.kapi.map((k, i) => ({ r: doorRect(L, st, i), x: k.x, y: k.y, h: k.h, acik: st.o.door[i] / DOOR_T })),
            kirpi: d.kirpi.map(k => { const p = kirpiAt(k, t); return { x: p[0], y: k.y, yon: p[1] }; }),
        };
    }
    function dynKey(st, L) {
        const o = st.o;
        let s = '';
        for (const b of o.box) s += '|' + Math.round(b.x * 2) + ',' + Math.round(b.y * 2);
        for (const f of o.fall) s += f.t === 0 ? '0' : f.t <= FALL_WAIT ? String.fromCharCode(97 + Math.floor(f.t / 12)) : 'F';
        for (const v of o.btn) s += v;
        for (const v of o.door) s += v === 0 ? 'k' : v === DOOR_T ? 'a' : 'y';
        if (L.dyn.per) s += '@' + Math.floor((st.step % L.dyn.per) / 24);   // 0,2 sn'lik faz dilimi (daha ince dilim aramayı patlatıyor)
        return s;
    }

    function circleRect(cx, cy, r, b) {
        const qx = Math.max(b[0], Math.min(cx, b[2])), qy = Math.max(b[1], Math.min(cy, b[3]));
        const dx = cx - qx, dy = cy - qy;
        return dx * dx + dy * dy < r * r;
    }

    function die(st) { st.dead = true; st.ev.push('dead'); }

    function step(st, L, inp) {
        if (st.dead || st.done) return;
        const dt = STEP;
        const dynOn = L.dyn.any, t = st.step + 1;
        if (dynOn) stepDyn(st, L, t);
        st.onM = -1; st.onF = -1;
        const j = !!inp.j;
        const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
        if (j && !st.prevJ) st.buf = K.BUFFER; else if (st.buf > 0) st.buf--;
        st.prevJ = j;
        const wasGround = st.ground;
        if (wasGround) st.coyote = K.COYOTE; else if (st.coyote > 0) st.coyote--;

        if (wasGround) {
            // zemin teğeti (sağa doğru)
            const tx = st.gny, ty = -st.gnx;
            let vt = st.vx * tx + st.vy * ty;
            const ice = st.gmat === 'buz';
            if (dir !== 0) {
                if (dir * vt < 0) vt += dir * (ice ? K.ICE_FRICTION + 6 : K.TURN) * dt;          // dönüşte fren
                if (dir * vt < K.MAX_RUN) {
                    vt += dir * (ice ? K.ACC_GROUND * 0.35 : K.ACC_GROUND) * dt;
                    if (dir * vt > K.MAX_RUN) vt = dir * K.MAX_RUN;
                }
            } else if (st.gny >= K.FLAT_N || ice) {
                const f = (ice ? K.ICE_FRICTION : K.FRICTION) * dt;
                vt = Math.abs(vt) <= f ? 0 : vt - Math.sign(vt) * f;
            }
            vt += -K.G * ty * dt;                                  // yerçekiminin teğet bileşeni
            // teğet hız + zemine doğru küçük bastırma (çözücü her adımda teması görsün; zemin/hava titremesi olmasın)
            st.vx = vt * tx - st.gnx * K.G * dt; st.vy = vt * ty - st.gny * K.G * dt;
            if (st.gmat === 'bantL') st.x -= BELT * dt;
            else if (st.gmat === 'bantR') st.x += BELT * dt;
        } else {
            if (dir !== 0 && dir * st.vx < K.MAX_RUN) st.vx += dir * K.ACC_AIR * dt;
            st.vy -= K.G * dt;
        }

        // zıplama (tampon + coyote)
        if (st.buf > 0 && st.coyote > 0) {
            st.vy = K.JUMP_V; st.buf = 0; st.coyote = 0; st.jumping = true; st.cut = false; st.ground = false;
            st.ev.push('jump');
        }
        if (st.jumping && !j && st.vy > 0 && !st.cut) { st.vy *= K.JUMP_CUT; st.cut = true; }
        if (st.vy <= 0) st.jumping = false;
        // kutu iterken top yavaşlar (plan §3.3: 3,0)
        if (st.push && dir === st.push && dir * st.vx > PUSH_V) st.vx = dir * PUSH_V;
        st.push = 0;
        if (st.vy < -K.MAX_FALL) st.vy = -K.MAX_FALL;
        if (st.vx > K.MAX_SPEED) st.vx = K.MAX_SPEED; else if (st.vx < -K.MAX_SPEED) st.vx = -K.MAX_SPEED;

        // alt adımlı hareket + çözüm
        const n = Math.min(8, Math.max(1, Math.ceil(Math.max(Math.abs(st.vx), Math.abs(st.vy)) * dt / K.SUB)));
        st.ground = false; st.spring = false;
        const rects = dynOn ? dynRects(st, L, t) : null;
        for (let i = 0; i < n; i++) {
            const prevBottom = st.y - K.R;
            st.x += st.vx * dt / n;
            st.y += st.vy * dt / n;
            resolve(st, L, prevBottom);
            if (rects && resolveDyn(st, L, rects)) resolve(st, L, prevBottom);
        }
        // yere yapışma: zemindeyken (zıplamadan) küçük bir tümsek/iniş topu havaya atmasın
        if (!st.ground && wasGround && !st.jumping && st.vy <= 0.5) {
            const sx = st.x, sy = st.y, svx = st.vx, svy = st.vy;
            st.y -= 0.3;
            resolve(st, L, st.y - K.R + 0.3);
            if (rects) resolveDyn(st, L, rects);
            if (!st.ground) { st.x = sx; st.y = sy; st.vx = svx; st.vy = svy; }
        }
        if (st.spring) { st.vy = K.SPRING_V; st.ground = false; st.jumping = false; st.coyote = 0; st.ev.push('spring'); }
        st.step++;

        // ── tehlikeler, yıldızlar, checkpoint, bitiş ──
        if (st.y < K.FALL_DIE) { die(st); return; }
        const hr = K.R * 0.8;
        for (let i = 0; i < L.spikes.length; i++) if (circleRect(st.x, st.y, hr, L.spikes[i])) { die(st); return; }
        for (let i = 0; i < L.acid.length; i++) if (circleRect(st.x, st.y, hr, L.acid[i])) { die(st); return; }
        for (let i = 0; i < L.dyn.kirpi.length; i++) {
            const k = L.dyn.kirpi[i], p = kirpiAt(k, st.step), dx = st.x - p[0], dy = st.y - (k.y + KIRPI_R), rr = hr + KIRPI_R * 0.85;
            if (dx * dx + dy * dy < rr * rr) { die(st); return; }
        }
        for (let i = 0; i < L.stars.length; i++) {
            const s = L.stars[i];
            if (st.stars.indexOf(s.no) >= 0) continue;
            const dx = st.x - s.x, dy = st.y - s.y;
            if (dx * dx + dy * dy < (K.R + 0.38) * (K.R + 0.38)) { st.stars.push(s.no); st.ev.push('star'); }
        }
        for (let i = st.cp + 1; i < L.cps.length; i++) {
            if (st.x >= L.cps[i].x && st.y >= L.cps[i].y - 0.5) { st.cp = i; st.ev.push('cp'); if (dynOn) st.snap = copyDyn(st.o); }
        }
        if (circleRect(st.x, st.y, K.R, L.finish)) { st.done = true; st.ev.push('done'); }
    }

    function progress(st, L) {
        const sx = L.start.x, fx = L.finish[0];
        return Math.max(0, Math.min(100, Math.floor(((st.x - sx) / (fx - sx)) * 100)));
    }

    // ── Doğrulama botu ──
    // Her D adımda bir karar: {sol, dur, sağ} × {zıpla basılı, bırak}.
    // En iyi önce arama: hedefe (yıldız şartı varsa önce yıldıza, sonra bitişe) en yakın durum önce açılır;
    // durum belleği aynı konum/hız/zıplama durumuna ikinci kez girmeyi engeller. Yıldız alındı bayrağı
    // anahtardadır → yıldızı alıp kurtulamayan bir yaya girilirse arama geri dönüp başka yol dener.
    const BEKLE = 8;
    const ACTIONS = [
        { l: false, r: true, j: false }, { l: false, r: true, j: true },
        { l: false, r: false, j: false }, { l: false, r: false, j: true },
        { l: true, r: false, j: false }, { l: true, r: false, j: true },
    ];
    function Heap() {
        const a = [];
        return {
            get size() { return a.length; },
            push(n) { a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= n.f) break; a[i] = a[p]; i = p; } a[i] = n; },
            pop() {
                const top = a[0], last = a.pop();
                if (a.length) {
                    let i = 0;
                    for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; const v = (k) => (k === i ? last : a[k]);
                        if (l < a.length && a[l].f < v(m).f) m = l; if (r < a.length && a[r].f < v(m).f) m = r;
                        if (m === i) break; a[i] = a[m]; i = m; }
                    a[i] = last;
                }
                return top;
            },
        };
    }
    // Checkpoint'e bağlama: dinamik nesneli bölümde arama yeni bir checkpoint'e varınca o noktaya "bağlanır"
    // (yığın ve bellek sıfırlanır, oradan devam). Oyundaki checkpoint mantığıyla aynıdır ve zamanlama gerektiren
    // bölümlerde aramayı parça parça küçültür. Bağlı arama bulamazsa bağlamasız arama denenir.
    // Yol mesafesi haritası: hedef hücreden karo ızgarasında (kare karolar duvar, eğim ve boşluk geçilir) 4 komşulu BFS.
    // Düz Manhattan mesafesi "duvarın üstünden dolaş" ya da "asansörle yukarı çık" gibi yolları bilmez; bu harita bilir.
    function distMap(L, tx, ty) {
        const key = Math.floor(tx) + ',' + Math.floor(ty);
        L._dm = L._dm || {};
        if (L._dm[key]) return L._dm[key];
        const W = L.W + 2, H = L.H + 6, d = new Float64Array(W * H).fill(1e9);
        const sq = (cx, cy) => { const c = L.level.harita[L.H - 1 - cy]; const ch = c && cx >= 0 ? c[cx] : ' '; return ch === '#' || ch === 'I' || ch === '<' || ch === '>' || ch === 'T'; };
        const q = [];
        const sx0 = Math.max(0, Math.min(W - 1, Math.floor(tx))), sy0 = Math.max(0, Math.min(H - 1, Math.floor(ty)));
        d[sy0 * W + sx0] = 0; q.push(sx0, sy0);
        for (let i = 0; i < q.length; i += 2) {
            const x = q[i], y = q[i + 1], v = d[y * W + x] + 1;
            for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                if (nx < 0 || ny < 0 || nx >= W || ny >= H || sq(nx, ny) || d[ny * W + nx] <= v) continue;
                d[ny * W + nx] = v; q.push(nx, ny);
            }
        }
        const f = (x, y) => {
            const cx = Math.max(0, Math.min(W - 1, Math.floor(x))), cy = Math.max(0, Math.min(H - 1, Math.floor(y)));
            const v = d[cy * W + cx];
            return v < 1e9 ? v + Math.abs(x - tx) * 0.01 : Math.abs(x - tx) + Math.abs(y - ty) + 50;
        };
        L._dm[key] = f;
        return f;
    }
    function solve(L, opts) {
        opts = opts || {};
        const bagla = opts.bagla !== undefined ? opts.bagla : L.dyn.any;
        const r = solveIn(L, opts, bagla);
        return r || !bagla ? r : solveIn(L, opts, false);
    }
    function solveIn(L, opts, bagla) {
        const D = opts.D || 6;
        const maxNodes = opts.maxNodes || (L.dyn.per || L.dyn.kutu.length ? 4000000 : 1500000);   // zamanlama ve kutu aramaları daha geniş
        const need = opts.needStar;
        const DW = opts.dw !== undefined ? opts.dw : 0.15;
        const YW = opts.yw !== undefined ? opts.yw : (L.dyn.any ? 0.3 : 1);   // nesneli bölümde tırmanış (kutu, asansör) cezalandırılmasın
        const star = need !== undefined ? L.stars.find(s => s.no === need) : null;
        const fx = (L.finish[0] + L.finish[2]) / 2, fy = L.finish[1] + 0.5;
        const start = opts.from ? clone(opts.from) : createState(L);
        const has = (s) => !star || s.stars.indexOf(need) >= 0;
        const yol = L.dyn.any && opts.yol !== false;          // nesneli bölümde yol mesafesi haritası
        const dF = yol ? distMap(L, fx, fy) : null, dS = yol && star ? distMap(L, star.x, star.y) : null;
        // asansörün altında olmak yol haritasında "yukarıya yakın" görünür ama değildir → ceza
        const lifts = L.dyn.platform.filter(m => m.dy !== 0);
        const alti = (s) => {
            for (const m of lifts) { const p = moverAt(m, s.step); if (s.x > p[0] - K.R && s.x < p[0] + m.w + K.R && s.y < p[1] - PLAT_T) return 8; }
            return 0;
        };
        // önündeki kapı kapalıysa ara hedef: 'bir' düğmesine git; 'tut' düğmesine bir kutu it (topu kutunun arkasına getir)
        const kapilar = L.dyn.kapi.map((k, i) => ({ k, i })).sort((a, b) => a.k.x - b.k.x);
        // (öndeki kapalı kapıların hepsi toplanır: bir kapıyı açmak cezayı hep düşürür, hiç artırmaz)
        const kapiCeza = (s) => {
            let sum = 0;
            for (const { k, i } of kapilar) {
                if (k.x + 1 < s.x || s.o.door[i] >= DOOR_T) continue;
                let best = 1e9;
                for (const bi of k.btn) {
                    const b = L.dyn.dugme[bi], bx = b.x + 0.5;
                    if (b.tur === 'bir') { best = Math.min(best, Math.abs(s.x - bx) + Math.abs(s.y - b.y)); continue; }
                    for (const bo of s.o.box) {
                        if (bo.y < -50) continue;
                        const cx = bo.x + BOX / 2, dir = cx < bx ? 1 : -1;
                        best = Math.min(best, Math.abs(cx - bx) * 2 + Math.abs(bo.y - b.y) + Math.abs(s.x - (cx - dir * 0.9)) + Math.abs(s.y - (bo.y + 0.45)) * 0.5);
                    }
                }
                sum += 30 + (best < 1e9 ? best : 0);
            }
            return sum;
        };
        const h = yol ? (s) => alti(s) + kapiCeza(s) + (has(s) ? dF(s.x, s.y) : dS(s.x, s.y) + dF(star.x, star.y)) : (s) => {
            if (!has(s)) return Math.abs(s.x - star.x) + Math.abs(s.y - star.y) + Math.abs(fx - star.x) + Math.abs(fy - star.y);
            return Math.abs(fx - s.x) + Math.abs(fy - s.y) * YW;
        };
        // Zaman anahtarda YOK: aynı konum/hız = aynı gelecek. Dinamik nesneler varsa durumları (kutu konumları,
        // düşen/düğme/kapı) ve döngüsel nesnelerin ortak fazı anahtara eklenir.
        const key = (s) => Math.round(s.x * 4) + '|' + Math.round(s.y * 4) + '|' + Math.round(s.vx) + '|' + Math.round(s.vy) +
            (s.ground ? 'g' : 'a') + (s.jumping ? (s.cut ? 'c' : 'J') : '') + (s.prevJ ? 'h' : '') + (s.buf > 0 ? 'b' : '') + (s.coyote > 0 ? 'y' : '') +
            (has(s) ? '*' : '') + (L.dyn.any ? dynKey(s, L) : '');
        const seen = new Set([key(start)]);
        let heap = Heap();
        heap.push({ st: start, f: h(start), d: 0, parent: null, a: -1 });
        let nodes = 0, best = -1e9, cpMax = start.cp;
        // döngüsel nesneli bölümde ek "bekle" hamlesi (BEKLE karar boyu boşta): platformu beklemek tek düğüm olur
        const NA = L.dyn.per ? ACTIONS.length + 1 : ACTIONS.length;
        while (heap.size) {
            const cur = heap.pop();
            for (let ai = 0; ai < NA; ai++) {
                const st = clone(cur.st);
                const n = ai === ACTIONS.length ? D * BEKLE : D, act = ai === ACTIONS.length ? ACTIONS[2] : ACTIONS[ai];
                for (let i = 0; i < n && !st.dead && !st.done; i++) step(st, L, act);
                if (++nodes > maxNodes) { if (opts.stats) { opts.stats.best = best; opts.stats.nodes = nodes; } return null; }
                if (st.x > best) best = st.x;
                if (st.dead) continue;
                if (st.done) {
                    if (!has(st)) continue;
                    const raw = [ai];
                    for (let q = cur; q && q.a >= 0; q = q.parent) raw.push(q.a);
                    raw.reverse();
                    const path = [];
                    raw.forEach(a => { if (a === ACTIONS.length) for (let k = 0; k < BEKLE; k++) path.push(2); else path.push(a); });
                    return { path, D, steps: st.step, nodes };
                }
                if (bagla && st.cp > cpMax && (has(st) || star.x > L.cps[st.cp].x)) {
                    cpMax = st.cp; heap = Heap(); seen.clear(); nodes = 0;
                    seen.add(key(st));
                    heap.push({ st, f: h(st), d: 0, parent: cur, a: ai });
                    break;
                }
                const k = key(st);
                if (seen.has(k)) continue;
                seen.add(k);
                heap.push({ st, f: h(st) + (cur.d + 1) * DW, d: cur.d + 1, parent: cur, a: ai });
            }
        }
        if (opts.stats) { opts.stats.best = best; opts.stats.nodes = nodes; }
        return null;
    }
    function replay(L, path, opts) {
        opts = opts || {};
        const D = opts.D || 6;
        const st = opts.from ? clone(opts.from) : createState(L);
        for (let p = 0; p < path.length && !st.dead && !st.done; p++) {
            for (let i = 0; i < D && !st.dead && !st.done; i++) step(st, L, ACTIONS[path[p]]);
        }
        return st;
    }
    function checkpointStates(L, path, D) {
        D = D || 6;
        const st = createState(L);
        const out = [];
        let last = -1;
        for (let p = 0; p < path.length && !st.dead && !st.done; p++) {
            for (let i = 0; i < D && !st.dead && !st.done; i++) {
                step(st, L, ACTIONS[path[p]]);
                if (st.cp !== last) { last = st.cp; const c = clone(st); out.push(c); }
            }
        }
        return out;
    }
    // checkpoint'ten yeniden doğuş durumu: checkpoint noktasında, duran top
    function spawnAt(L, st) {
        const s = createState(L);
        if (st.cp >= 0) { const c = L.cps[st.cp]; s.x = c.x; s.y = c.y + K.R + 0.001; s.cp = st.cp; }
        s.stars = st.stars.slice();
        // dinamik nesneler checkpoint'e varıldığı andaki hâline döner (kutu yanlış çukura düştüyse geri gelir)
        if (st.snap) { s.o = copyDyn(st.snap); s.snap = st.snap; }
        return s;
    }

    const PCore = { STEP, K, SHAPES, ACTIONS, prepare, createState, clone, step, progress, solve, replay, checkpointStates, spawnAt, dynView };
    if (typeof module !== 'undefined' && module.exports) module.exports = PCore;
    else root.PCore = PCore;
})(typeof window !== 'undefined' ? window : globalThis);
