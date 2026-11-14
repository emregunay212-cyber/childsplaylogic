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
        return { level, W, H, segs, buckets, spikes, stars, cps, start, finish, water, acid };
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
        };
    }

    function clone(st) {
        const c = Object.assign({}, st);
        c.stars = st.stars.slice();
        c.ev = [];
        return c;
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

    function circleRect(cx, cy, r, b) {
        const qx = Math.max(b[0], Math.min(cx, b[2])), qy = Math.max(b[1], Math.min(cy, b[3]));
        const dx = cx - qx, dy = cy - qy;
        return dx * dx + dy * dy < r * r;
    }

    function die(st) { st.dead = true; st.ev.push('dead'); }

    function step(st, L, inp) {
        if (st.dead || st.done) return;
        const dt = STEP;
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
        if (st.vy < -K.MAX_FALL) st.vy = -K.MAX_FALL;
        if (st.vx > K.MAX_SPEED) st.vx = K.MAX_SPEED; else if (st.vx < -K.MAX_SPEED) st.vx = -K.MAX_SPEED;

        // alt adımlı hareket + çözüm
        const n = Math.min(8, Math.max(1, Math.ceil(Math.max(Math.abs(st.vx), Math.abs(st.vy)) * dt / K.SUB)));
        st.ground = false; st.spring = false;
        for (let i = 0; i < n; i++) {
            const prevBottom = st.y - K.R;
            st.x += st.vx * dt / n;
            st.y += st.vy * dt / n;
            resolve(st, L, prevBottom);
        }
        // yere yapışma: zemindeyken (zıplamadan) küçük bir tümsek/iniş topu havaya atmasın
        if (!st.ground && wasGround && !st.jumping && st.vy <= 0.5) {
            const sx = st.x, sy = st.y, svx = st.vx, svy = st.vy;
            st.y -= 0.3;
            resolve(st, L, st.y - K.R + 0.3);
            if (!st.ground) { st.x = sx; st.y = sy; st.vx = svx; st.vy = svy; }
        }
        if (st.spring) { st.vy = K.SPRING_V; st.ground = false; st.jumping = false; st.coyote = 0; st.ev.push('spring'); }
        st.step++;

        // ── tehlikeler, yıldızlar, checkpoint, bitiş ──
        if (st.y < K.FALL_DIE) { die(st); return; }
        const hr = K.R * 0.8;
        for (let i = 0; i < L.spikes.length; i++) if (circleRect(st.x, st.y, hr, L.spikes[i])) { die(st); return; }
        for (let i = 0; i < L.acid.length; i++) if (circleRect(st.x, st.y, hr, L.acid[i])) { die(st); return; }
        for (let i = 0; i < L.stars.length; i++) {
            const s = L.stars[i];
            if (st.stars.indexOf(s.no) >= 0) continue;
            const dx = st.x - s.x, dy = st.y - s.y;
            if (dx * dx + dy * dy < (K.R + 0.38) * (K.R + 0.38)) { st.stars.push(s.no); st.ev.push('star'); }
        }
        for (let i = st.cp + 1; i < L.cps.length; i++) {
            if (st.x >= L.cps[i].x && st.y >= L.cps[i].y - 0.5) { st.cp = i; st.ev.push('cp'); }
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
    function solve(L, opts) {
        opts = opts || {};
        const D = opts.D || 6;
        const maxNodes = opts.maxNodes || 1500000;
        const need = opts.needStar;
        const star = need !== undefined ? L.stars.find(s => s.no === need) : null;
        const fx = (L.finish[0] + L.finish[2]) / 2, fy = L.finish[1] + 0.5;
        const start = opts.from ? clone(opts.from) : createState(L);
        const has = (s) => !star || s.stars.indexOf(need) >= 0;
        const h = (s) => {
            if (!has(s)) return Math.abs(s.x - star.x) + Math.abs(s.y - star.y) + Math.abs(fx - star.x) + Math.abs(fy - star.y);
            return Math.abs(fx - s.x) + Math.abs(fy - s.y);
        };
        // Zaman anahtarda YOK: hareketli nesne olmayan dünyada aynı konum/hız = aynı gelecek.
        // (Hareketli nesneler eklenince yalnız döngü fazları anahtara girer.)
        const key = (s) => Math.round(s.x * 4) + '|' + Math.round(s.y * 4) + '|' + Math.round(s.vx) + '|' + Math.round(s.vy) +
            (s.ground ? 'g' : 'a') + (s.jumping ? (s.cut ? 'c' : 'J') : '') + (s.prevJ ? 'h' : '') + (s.buf > 0 ? 'b' : '') + (s.coyote > 0 ? 'y' : '') +
            (has(s) ? '*' : '');
        const seen = new Set([key(start)]);
        const heap = Heap();
        heap.push({ st: start, f: h(start), d: 0, parent: null, a: -1 });
        let nodes = 0, best = -1e9;
        while (heap.size) {
            const cur = heap.pop();
            for (let ai = 0; ai < ACTIONS.length; ai++) {
                const st = clone(cur.st);
                for (let i = 0; i < D && !st.dead && !st.done; i++) step(st, L, ACTIONS[ai]);
                if (++nodes > maxNodes) { if (opts.stats) { opts.stats.best = best; opts.stats.nodes = nodes; } return null; }
                if (st.x > best) best = st.x;
                if (st.dead) continue;
                if (st.done) {
                    if (!has(st)) continue;
                    const path = [ai];
                    for (let n = cur; n && n.a >= 0; n = n.parent) path.push(n.a);
                    path.reverse();
                    return { path, D, steps: st.step, nodes };
                }
                const k = key(st);
                if (seen.has(k)) continue;
                seen.add(k);
                heap.push({ st, f: h(st) + (cur.d + 1) * 0.15, d: cur.d + 1, parent: cur, a: ai });
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
        return s;
    }

    const PCore = { STEP, K, SHAPES, ACTIONS, prepare, createState, clone, step, progress, solve, replay, checkpointStates, spawnAt };
    if (typeof module !== 'undefined' && module.exports) module.exports = PCore;
    else root.PCore = PCore;
})(typeof window !== 'undefined' ? window : globalThis);
