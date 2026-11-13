/* Ritim Koşusu — saf oyun çekirdeği (RKCore)
   DOM, zaman ve rastgelelik YOK: aynı kod tarayıcıda (game.js), Node testinde (tests/ritim-kosusu-bot.mjs)
   ve ileride sunucuda (skor doğrulama) çalışır. Fizik sabit adımla (240 Hz) ilerler; çizim ekran hızında.

   Birim: 1 blok. Zemin y = 0, tavan y = CEIL. Oyuncu kutusu [x - s/2, x + s/2] × [y, y + s] (s = 1).
   grav = 1 → yerçekimi aşağı, grav = -1 → yukarı (tavanda koşu).

   API:
     RKCore.prepare(levelData)        → L (sıralı nesneler + çarpışma kutuları)
     RKCore.createState(L)            → st
     RKCore.step(st, L, hold)         → bir fizik adımı (hold = tuş basılı mı); olaylar st.ev[]'e eklenir
     RKCore.clone(st)                 → checkpoint anlık görüntüsü
     RKCore.progress(st, L)           → 0..100
     RKCore.solve(L, opts)            → doğrulama botu: { holds[], steps } | null
     RKCore.replay(L, holds, opts)    → girdi kaydını tekrar oynatır (hile koruması / test)
*/
/* global module */
(function (root) {
    'use strict';

    const STEP = 1 / 240;
    const SPEEDS = { '0.5': 8.4, '1': 10.4, '2': 13.0, '3': 15.6, '4': 19.2 };
    const G = 148;
    const JUMP = 24.9;
    const PAD = 1.55;
    const SHIP_G = 38, SHIP_UP = 38, SHIP_V = 8.5;
    const BALL_G = 120, BALL_FLIP_V = 6;
    const UFO_G = 95, UFO_FLAP = 15, UFO_MAXFALL = 12;
    const CEIL = 9;
    const MAXV = 42;
    const BUF_STEPS = 24;        // 0,1 sn: erken basış affı (top/UFO/halka)
    const LAND_TOL = 0.32;       // bloğun üstüne "biraz aşağıdan" gelişte yine de bas
    const ROBOT_V = 18, ROBOT_BOOST = 90, ROBOT_T = 72;   // robot: kısa basış ≈1,1 blok, 0,3 sn tutma ≈2,8 blok
    const MINI = 0.6, MINI_K = 0.85;                     // mini boyut ve zıplama hızı çarpanı
    const MODES = ['kup', 'gemi', 'top', 'ufo', 'dalga', 'robot'];

    // ── Hazırlık: seviye verisini çarpışma kutularıyla sıralı listeye çevir ──
    function prepare(data) {
        const objs = [];
        const pits = [];
        (data.nesneler || []).forEach((o, i) => {
            const n = Object.assign({}, o, { id: i });
            const y = o.y || 0;
            switch (o.t) {
                case 'diken':
                case 'yarim_diken': {
                    const h = o.t === 'diken' ? 0.55 : 0.3;
                    n.x0 = o.x; n.x1 = o.x + 1;
                    if (o.yon === 'asagi') { n.hb = [o.x + 0.33, y + 1 - h, o.x + 0.67, y + 1]; }
                    else { n.hb = [o.x + 0.33, y, o.x + 0.67, y + h]; }
                    break;
                }
                case 'blok':
                    n.g = o.g || 1; n.h = o.h || 1;
                    n.x0 = o.x; n.x1 = o.x + n.g; n.y0 = y; n.y1 = y + n.h;
                    break;
                case 'testere':
                    n.r = o.r || 1; n.x0 = o.x - n.r; n.x1 = o.x + n.r; n.cy = y;
                    break;
                case 'pad_sari': case 'pad_pembe': case 'pad_mavi':
                    n.x0 = o.x; n.x1 = o.x + 1; n.hb = [o.x + 0.1, y, o.x + 0.9, y + 0.4];
                    break;
                case 'halka_sari': case 'halka_pembe': case 'halka_mavi': case 'halka_yesil': case 'halka_siyah':
                    n.x0 = o.x - 1.2; n.x1 = o.x + 1.2; n.cy = y;
                    break;
                case 'portal_mod': case 'portal_yercekimi': case 'portal_hiz': case 'portal_boyut': case 'portal_ayna':
                case 'tetik_hareket': case 'checkpoint':
                    n.x0 = o.x - 0.5; n.x1 = o.x + 0.5;
                    // y verilmişse yalnız [y-1.6, y+1.6] arasından geçen tetikler (yol ayrımı); yoksa tam boy kapı
                    n.ylo = (o.y === undefined || o.t === 'tetik_hareket') ? -99 : o.y - 1.6;
                    n.yhi = (o.y === undefined || o.t === 'tetik_hareket') ? 99 : o.y + 1.6;
                    break;
                case 'coin':
                    n.x0 = o.x - 0.5; n.x1 = o.x + 0.5; n.cy = y;
                    break;
                case 'cukur':
                    pits.push([o.x, o.x + (o.g || 1)]);
                    return;
                default:
                    return;   // bilinmeyen / yalnız görsel nesne
            }
            objs.push(n);
        });
        objs.sort((a, b) => a.x0 - b.x0);
        const cps = objs.filter(o => o.t === 'checkpoint').map(o => o.x);
        const b = data.baslangic || {};
        return {
            data, objs, pits, cps,
            bitis: data.bitis,
            start: {
                mode: b.mod || 'kup',
                speed: String(b.hiz || 1),
                grav: b.yercekimi === 'ters' ? -1 : 1,
                mini: b.boyut === 'mini',
            },
            coinCount: objs.filter(o => o.t === 'coin').length,
        };
    }

    function b0(L) { return L.start; }
    function createState(L) {
        return {
            x: 0, y: L.start.grav === 1 ? 0 : CEIL - 1, vy: 0,
            mode: L.start.mode, grav: L.start.grav, speed: L.start.speed,
            s: b0(L).mini ? MINI : 1, mirror: false, boost: 0, mv: {},
            onGround: true, prevHold: false, buf: 0,
            dead: false, done: false, step: 0, cp: -1, i0: 0,
            used: {}, coins: [], ev: [],
        };
    }

    function clone(st) {
        const c = Object.assign({}, st);
        c.used = Object.assign({}, st.used);
        c.coins = st.coins.slice();
        c.mv = Object.assign({}, st.mv);
        c.ev = [];
        return c;
    }

    function floorAt(L, x) {
        for (let i = 0; i < L.pits.length; i++) {
            const p = L.pits[i];
            if (x - 0.3 >= p[0] && x + 0.3 <= p[1]) return false;
        }
        return true;
    }

    function rectHit(a0, a1, a2, a3, b0, b1, b2, b3) {
        return a0 < b2 && a2 > b0 && a1 < b3 && a3 > b1;
    }

    function die(st) { st.dead = true; st.ev.push('dead'); }

    // Hareket tetikleyicisi: grup dikey kaydırması (yumuşak giriş-çıkış). st.mv[grup] = [başlangıç adımı, dy, süre adımı, önceki ofset]
    function groupOffset(st, grup) { return offsetAt(st, grup, st.step); }
    function offsetAt(st, grup, stepNo) {
        const m = st.mv[grup];
        if (!m) return 0;
        let k = (stepNo - m[0]) / m[2];
        if (k >= 1) return m[3] + m[1];
        if (k <= 0) return m[3];
        k = k * k * (3 - 2 * k);
        return m[3] + m[1] * k;
    }

    function step(st, L, hold) {
        if (st.dead || st.done) return;
        const press = hold && !st.prevHold;
        st.prevHold = hold;
        if (press) st.buf = BUF_STEPS; else if (st.buf > 0) st.buf--;
        const dt = STEP;
        const spd = SPEEDS[st.speed];
        let g = st.grav;
        const s = st.s;
        const jk = s < 1 ? MINI_K : 1;

        // ── Moda göre dikey hız ──
        switch (st.mode) {
            case 'kup':
                if (st.onGround && (hold || st.buf > 0)) {
                    st.vy = JUMP * jk * g; st.onGround = false; st.buf = 0; st.ev.push('jump');
                }
                st.vy -= G * g * dt;
                break;
            case 'robot':
                if (st.onGround && (hold || st.buf > 0)) {
                    st.vy = ROBOT_V * jk * g; st.onGround = false; st.buf = 0; st.boost = ROBOT_T; st.ev.push('jump');
                }
                if (st.boost > 0) {
                    if (hold) { st.vy += ROBOT_BOOST * jk * g * dt; st.boost--; } else st.boost = 0;
                }
                st.vy -= G * g * dt;
                break;
            case 'gemi':
                st.vy += (hold ? SHIP_UP : -SHIP_G) * g * dt;
                if (st.vy > SHIP_V) st.vy = SHIP_V;
                if (st.vy < -SHIP_V) st.vy = -SHIP_V;
                break;
            case 'top':
                if (st.onGround && st.buf > 0) {
                    st.grav = g = -g; st.vy = -BALL_FLIP_V * g; st.onGround = false; st.buf = 0; st.ev.push('flip');
                }
                st.vy -= BALL_G * g * dt;
                break;
            case 'ufo':
                if (st.buf > 0) { st.vy = UFO_FLAP * jk * g; st.buf = 0; st.onGround = false; st.ev.push('jump'); }
                st.vy -= UFO_G * g * dt;
                if (st.vy * g < -UFO_MAXFALL) st.vy = -UFO_MAXFALL * g;
                break;
            case 'dalga':
                st.vy = (hold ? 1 : -1) * spd * (s < 1 ? 2 : 1) * g;
                break;
        }
        if (st.vy > MAXV) st.vy = MAXV;
        if (st.vy < -MAXV) st.vy = -MAXV;

        // ── Hareket ──
        const prevX = st.x, prevY = st.y;
        st.x += spd * dt;
        st.y += st.vy * dt;
        st.step++;
        st.onGround = false;

        // Zemin ve tavan
        if (st.y < 0 && floorAt(L, st.x)) {
            if (prevY >= -LAND_TOL) {
                st.y = 0;
                if (st.vy < 0) st.vy = 0;
                if (g === 1) st.onGround = true;
            }
        }
        if (st.y < -3) { die(st); return; }
        if (st.y + s > CEIL) {
            st.y = CEIL - s;
            if (st.vy > 0) st.vy = 0;
            if (g === -1) st.onGround = true;
        }

        // ── Nesneler ──
        const px0 = st.x - s / 2, px1 = st.x + s / 2;
        // iç kutu (ölüm için, kenara sürtmek affedilir)
        const ix0 = px0 + 0.15 * s, ix1 = px1 - 0.15 * s;
        const iy0 = st.y + 0.12 * s, iy1 = st.y + s - 0.12 * s;
        const objs = L.objs;
        while (st.i0 < objs.length && objs[st.i0].x1 < px0 - 3) st.i0++;
        for (let i = st.i0; i < objs.length; i++) {
            const o = objs[i];
            if (o.x0 > px1 + 1.5) break;
            const oy = o.grup === undefined ? 0 : groupOffset(st, o.grup);
            switch (o.t) {
                case 'blok': {
                    if (!(px0 < o.x1 && px1 > o.x0)) break;
                    const y0 = o.y0 + oy, y1 = o.y1 + oy;
                    if (!(st.y < y1 && st.y + s > y0)) break;
                    // hareketli blokta bir önceki adımın konumuna göre karar ver (platform oyuncuyu taşır)
                    const poy = o.grup === undefined ? 0 : offsetAt(st, o.grup, st.step - 1);
                    if (prevY >= o.y1 + poy - LAND_TOL && st.vy <= 0.001 + Math.max(0, oy - poy) * 240) {
                        st.y = y1; if (st.vy < 0) st.vy = 0; if (g === 1) st.onGround = true;
                    } else if (prevY + s <= y0 + LAND_TOL && st.vy >= 0) {
                        st.y = y0 - s; st.vy = 0; if (g === -1) st.onGround = true;
                    } else if (rectHit(ix0, iy0, ix1, iy1, o.x0, y0, o.x1, y1)) {
                        die(st); return;
                    }
                    break;
                }
                case 'diken': case 'yarim_diken':
                    if (rectHit(ix0, iy0, ix1, iy1, o.hb[0], o.hb[1] + oy, o.hb[2], o.hb[3] + oy)) { die(st); return; }
                    break;
                case 'testere': {
                    const cx = Math.max(ix0, Math.min(o.x, ix1));
                    const cy = Math.max(iy0, Math.min(o.cy + oy, iy1));
                    const dx = cx - o.x, dy = cy - (o.cy + oy);
                    if (dx * dx + dy * dy < (o.r * 0.82) * (o.r * 0.82)) { die(st); return; }
                    break;
                }
                case 'pad_sari': case 'pad_pembe': case 'pad_mavi':
                    if (st.used[o.id]) break;
                    if (!rectHit(px0, st.y, px1, st.y + s, o.hb[0], o.hb[1] + oy, o.hb[2], o.hb[3] + oy)) break;
                    st.used[o.id] = 1; st.ev.push('pad');
                    if (o.t === 'pad_mavi') { st.grav = g = -g; st.vy = -12 * g; }
                    else st.vy = JUMP * PAD * jk * (o.t === 'pad_pembe' ? 0.7 : 1) * g;
                    st.boost = 0;
                    st.onGround = false;
                    break;
                case 'halka_sari': case 'halka_pembe': case 'halka_mavi': case 'halka_yesil': case 'halka_siyah': {
                    if (st.used[o.id]) break;
                    const dx = st.x - o.x, dy = (st.y + s / 2) - (o.cy + oy);
                    if (dx * dx + dy * dy > 1.25 * 1.25) break;
                    if (!(st.buf > 0 || (hold && (st.mode === 'kup' || st.mode === 'robot')))) break;
                    st.used[o.id] = 1; st.buf = 0; st.boost = 0; st.ev.push('orb');
                    const k = (st.mode === 'kup' || st.mode === 'robot' ? 1 : 0.8) * jk;
                    if (o.t === 'halka_sari') st.vy = JUMP * k * g;
                    else if (o.t === 'halka_pembe') st.vy = JUMP * 0.7 * k * g;
                    else if (o.t === 'halka_mavi') { st.grav = g = -g; st.vy = -12 * g; }
                    else if (o.t === 'halka_yesil') { st.grav = g = -g; st.vy = -JUMP * 0.75 * k * g; }   // çevir + yeni yöne hızlı fırlat
                    else if (o.t === 'halka_siyah') st.vy = -30 * g;
                    st.onGround = false;
                    break;
                }
                case 'portal_mod': case 'portal_yercekimi': case 'portal_hiz': case 'portal_boyut': case 'portal_ayna':
                case 'tetik_hareket': case 'checkpoint': {
                    if (!(prevX < o.x && st.x >= o.x)) break;
                    const cy = st.y + s / 2;
                    if (cy < o.ylo || cy > o.yhi) break;
                    if (o.t === 'checkpoint') { st.cp = o.x; st.ev.push('cp'); break; }
                    if (o.t === 'tetik_hareket') {
                        st.mv[o.grup] = [st.step, o.dy || 0, Math.max(1, Math.round((o.sure || 0.4) * 240)), groupOffset(st, o.grup)];
                        break;
                    }
                    if (o.t === 'portal_boyut') {
                        const ns = o.deger === 'mini' ? MINI : 1;
                        if (ns !== st.s) { st.s = ns; st.ev.push('portal'); if (g === -1 && st.y + ns > CEIL) st.y = CEIL - ns; }
                        break;
                    }
                    if (o.t === 'portal_ayna') { st.mirror = o.deger === 'acik'; st.ev.push('portal'); break; }
                    st.ev.push('portal');
                    if (o.t === 'portal_mod' && MODES.indexOf(o.deger) >= 0 && st.mode !== o.deger) {
                        st.mode = o.deger; st.vy *= 0.5; st.buf = 0; st.boost = 0;
                    } else if (o.t === 'portal_yercekimi') {
                        const ng = o.deger === 'ters' ? -1 : 1;
                        if (ng !== g) { st.grav = g = ng; st.vy *= 0.5; }
                    } else if (o.t === 'portal_hiz' && SPEEDS[String(o.deger)]) {
                        st.speed = String(o.deger);
                    }
                    break;
                }
                case 'coin': {
                    if (st.coins.indexOf(o.no) >= 0) break;
                    const dx = st.x - o.x, dy = (st.y + s / 2) - (o.cy + oy);
                    if (dx * dx + dy * dy < 0.95 * 0.95) { st.coins.push(o.no); st.ev.push('coin'); }
                    break;
                }
            }
        }
        if (st.x >= L.bitis) { st.done = true; st.ev.push('done'); }
    }

    function progress(st, L) {
        return Math.max(0, Math.min(100, Math.floor((st.x / L.bitis) * 100)));
    }

    // ── Doğrulama botu ──
    // Her D adımda bir karar (bas / bırak). Derinlik öncelikli arama + durum belleği.
    // opts: { from: st (checkpoint görüntüsü), needCoin: no, D, maxNodes }
    function solve(L, opts) {
        opts = opts || {};
        const D = opts.D || 8;
        const maxNodes = opts.maxNodes || 3000000;
        const start = opts.from ? clone(opts.from) : createState(L);
        const need = opts.needCoin;
        const seen = new Set();
        const holds = [];
        let nodes = 0, best = 0;
        const stack = [{ st: start, next: 0 }];
        function key(st) {
            return st.step + '|' + Math.round(st.x * 4) + '|' + Math.round(st.y * 5) + '|' + Math.round(st.vy / 1.5) + '|' + st.grav + st.mode + st.speed +
                (st.onGround ? 'g' : 'a') + (st.prevHold ? 'h' : 'r') + (st.buf > 0 ? 'b' : '') + (st.boost > 0 ? 'B' : '') + st.s + '|' + Object.keys(st.used).length +
                (need !== undefined && st.coins.indexOf(need) >= 0 ? 'c' : '');
        }
        while (stack.length) {
            const top = stack[stack.length - 1];
            if (top.next > 1) { stack.pop(); holds.pop(); continue; }
            // bir önceki kararı tekrar etmek önce denenir (daha az titreme)
            const prevHold = top.st.prevHold;
            const h = top.next === 0 ? prevHold : !prevHold;
            top.next++;
            const st = clone(top.st);
            for (let i = 0; i < D && !st.dead && !st.done; i++) step(st, L, h);
            if (++nodes > maxNodes) break;
            if (st.x > best) best = st.x;
            if (st.dead) continue;
            if (st.done) {
                if (need === undefined || st.coins.indexOf(need) >= 0) {
                    holds.push(h);
                    return { holds: holds.slice(), D, steps: st.step, nodes };
                }
                continue;
            }
            const k = key(st);
            if (seen.has(k)) continue;
            seen.add(k);
            holds.push(h);
            stack.push({ st, next: 0 });
        }
        if (opts.stats) { opts.stats.best = best; opts.stats.nodes = nodes; }
        return null;
    }

    // Girdi kaydını (her D adımlık karar) tekrar oynat
    function replay(L, holds, opts) {
        opts = opts || {};
        const D = opts.D || 8;
        const st = opts.from ? clone(opts.from) : createState(L);
        for (let j = 0; j < holds.length && !st.dead && !st.done; j++) {
            for (let i = 0; i < D && !st.dead && !st.done; i++) step(st, L, holds[j]);
        }
        // kayıt bittiyse bırakarak devam (son karar sonrası kalan düz koşu)
        let guard = 0;
        while (!st.dead && !st.done && guard++ < 240 * 5) step(st, L, false);
        return st;
    }

    // Bir koşudan checkpoint görüntüleri: her checkpoint'e ilk varışta durum
    function checkpointStates(L, holds, D) {
        D = D || 8;
        const st = createState(L);
        const out = [];
        let last = -1;
        for (let j = 0; j < holds.length && !st.dead && !st.done; j++) {
            for (let i = 0; i < D && !st.dead && !st.done; i++) {
                step(st, L, holds[j]);
                if (st.cp !== last) { last = st.cp; out.push(clone(st)); }
            }
        }
        return out;
    }

    const RKCore = {
        STEP, SPEEDS, CEIL, MODES, MINI, groupOffset,
        prepare, createState, clone, step, progress, solve, replay, checkpointStates,
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = RKCore;
    else root.RKCore = RKCore;
})(typeof window !== 'undefined' ? window : globalThis);
