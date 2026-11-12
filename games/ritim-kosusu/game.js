/* Ritim Koşusu — tarayıcı katmanı: çizim (Canvas 2D), müzik (Web Audio, kodla üretilir), girdi, menüler,
   kayıt ve online yarış (hub lobisi → window.parent.firebase, lobbies/<id>/rk).
   Fizik ve bölüm verisi saf çekirdekte: core.js (RKCore) + levels.js (RKLevels). */
(function () {
    'use strict';
    const RK = window.RKCore;
    const LV = window.RKLevels;
    const STEP = RK.STEP;
    const CEIL = RK.CEIL;
    const $ = (s) => document.querySelector(s);

    const qs = new URLSearchParams(location.search);
    const LOBBY = qs.get('lobbyId');
    const ONLINE = qs.get('mod') === 'yaris' && /^[A-Z]{5}$/.test(LOBBY || '');
    const ROLE = qs.get('role') === 'guest' ? 'guest' : 'host';
    const OPP_ROLE = ROLE === 'host' ? 'guest' : 'host';
    const OPP_NAME = (qs.get('name') || 'Rakip').slice(0, 24);

    // ════════════ Kayıt ════════════
    const SAVE_KEY = 'rk_ilerleme';
    let save = { b: {}, ses: true };
    function loadSave() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) { const v = JSON.parse(raw); if (v && typeof v === 'object') save = Object.assign({ b: {}, ses: true }, v); }
        } catch (e) { /* gizli pencere / engelli depolama: kayıtsız oyna */ }
    }
    function writeSave() {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* yok say */ }
    }
    function rec(id) { return save.b[id] || (save.b[id] = { en: 0, pr: 0, bitti: 0, coin: [], den: 0 }); }

    // ════════════ Ses ════════════
    const Sfx = (() => {
        function ctx() { return save.ses ? EduKit.audio.context() : null; }
        function noise(c, dur, when, vol, hp) {
            const len = Math.floor(c.sampleRate * dur);
            const buf = c.createBuffer(1, len, c.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const src = c.createBufferSource(); src.buffer = buf;
            const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800;
            const g = c.createGain(); g.gain.value = vol;
            src.connect(f); f.connect(g); g.connect(Music.out(c));
            src.start(when);
        }
        function tone(f, dur, type, vol, when) {
            const c = ctx(); if (!c) return;
            const t = c.currentTime + (when || 0);
            const o = c.createOscillator(), g = c.createGain();
            o.type = type || 'triangle'; o.frequency.value = f;
            g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(Music.out(c)); o.start(t); o.stop(t + dur + 0.02);
        }
        return {
            noise,
            olum() {
                const c = ctx(); if (!c) return;
                noise(c, 0.35, c.currentTime, 0.25, 300);
                const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
                o.type = 'sawtooth'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.4);
                g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
                o.connect(g); g.connect(Music.out(c)); o.start(t); o.stop(t + 0.5);
            },
            coin() { tone(988, 0.09, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0.08); },
            cp() { tone(660, 0.08, 'triangle', 0.06); tone(880, 0.12, 'triangle', 0.06, 0.07); },
            bitis() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, i * 0.1)); },
            portal() { tone(440, 0.12, 'sine', 0.05); tone(880, 0.12, 'sine', 0.04, 0.05); },
            say(n) { tone(n ? 660 : 990, n ? 0.15 : 0.35, 'square', 0.06); },
        };
    })();

    // Bölüm müziği: kodla bestelenir (bölüm kimliğinden tohumlanır) — davul, bas, arpej, melodi
    const Music = (() => {
        let master = null, timer = null, startAt = 0, stepDur = 0.1, next = 0, song = null, mctx = null;
        function out(c) {
            if (!master || master.context !== c) {
                master = c.createGain(); master.gain.value = 0.7; master.connect(c.destination);
            }
            return master;
        }
        function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
        function rng(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
        const PROGS = [[0, 5, 3, 4], [0, 3, 4, 4], [5, 3, 0, 4], [0, 4, 5, 3], [0, 0, 3, 4], [5, 4, 3, 4]];
        const MINOR = [0, 2, 3, 5, 7, 8, 10];
        const MAJOR = [0, 2, 4, 5, 7, 9, 11];
        function compose(level) {
            const r = rng(hash(level.id));
            const scale = r() < 0.55 ? MINOR : MAJOR;
            const root = 45 + Math.floor(r() * 7);            // A2..D#3 civarı
            const prog = PROGS[Math.floor(r() * PROGS.length)];
            const mel = [];                                      // 2 ölçülük melodi, 16'lık adımlar (null = sus)
            for (let i = 0; i < 32; i++) mel.push(r() < (i % 4 === 0 ? 0.8 : 0.35) ? Math.floor(r() * 7) : null);
            const arpShape = [0, 2, 4, 2, 0, 4, 2, 4].map(v => v + (r() < 0.3 ? 7 : 0));
            return { scale, root, prog, mel, arpShape, bpm: level.bpm || 128 };
        }
        function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
        function deg(sng, chordDeg, d) {
            const s = sng.scale; const idx = chordDeg + d;
            return sng.root + s[((idx % 7) + 7) % 7] + 12 * Math.floor(idx / 7);
        }
        function voice(c, f, t, dur, type, vol, lp) {
            const o = c.createOscillator(), g = c.createGain();
            o.type = type; o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); fl.connect(g); }
            else o.connect(g);
            g.connect(out(c)); o.start(t); o.stop(t + dur + 0.03);
        }
        function kick(c, t) {
            const o = c.createOscillator(), g = c.createGain();
            o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
            g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
            o.connect(g); g.connect(out(c)); o.start(t); o.stop(t + 0.22);
        }
        function play(c, i, t) {
            const sng = song; const s16 = i % 16; const bar = Math.floor(i / 16);
            const chord = sng.prog[bar % 4];
            const intro = bar < 1;
            if (s16 % 4 === 0) kick(c, t);
            if (!intro && s16 % 8 === 4) Sfx.noise(c, 0.12, t, 0.13, 1500);
            if (s16 % 2 === 1) Sfx.noise(c, 0.035, t, 0.05, 7000);
            if (s16 % 2 === 0) voice(c, midi(deg(sng, chord, 0) - 12), t, stepDur * 1.8, 'sawtooth', 0.09, 420);
            if (!intro) voice(c, midi(deg(sng, chord, sng.arpShape[s16 % 8]) + 12), t, stepDur * 0.9, 'square', 0.025, 2600);
            if (bar >= 2) {
                const m = sng.mel[(i % 32)];
                if (m !== null) voice(c, midi(deg(sng, chord, m) + 24), t, stepDur * 1.7, 'triangle', 0.06);
            }
        }
        function tick() {
            if (!mctx || !song) return;
            while (startAt + next * stepDur < mctx.currentTime + 0.15) {
                const t = startAt + next * stepDur;
                if (t >= mctx.currentTime - 0.02) play(mctx, next, t);
                next++;
            }
        }
        // offsetSec: bölüm zamanında nereden başlanacağı (pratik/checkpoint). Negatifse ileride başlar (geri sayım).
        function start(level, offsetSec) {
            stop();
            if (!save.ses) return;
            mctx = EduKit.audio.context(); if (!mctx) return;
            song = compose(level);
            stepDur = 60 / song.bpm / 4;
            startAt = mctx.currentTime + 0.03 - offsetSec;
            next = Math.max(0, Math.ceil(offsetSec / stepDur));
            tick();
            timer = setInterval(tick, 25);
        }
        function stop() {
            if (timer) clearInterval(timer);
            timer = null; song = null;
        }
        return { start, stop, out };
    })();

    // ════════════ Tuval ════════════
    const cv = $('#oyun');
    const g2 = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, SC = 40;
    const VIEW_Y0 = -1.6, VIEW_H = 11.4;
    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, Math.floor(cv.clientWidth * DPR));
        H = Math.max(1, Math.floor(cv.clientHeight * DPR));
        cv.width = W; cv.height = H;
        SC = H / VIEW_H;
    }
    window.addEventListener('resize', resize);
    resize();

    let camX = 0;
    const sx = (wx) => (wx - camX) * SC;
    const sy = (wy) => H - (wy - VIEW_Y0) * SC;

    // ════════════ Oyun durumu ════════════
    let G = null;          // aktif koşu
    let practiceMode = false;
    let hold = false;
    let particles = [];
    let shake = 0;

    const MODE_COL = { kup: '#38e07b', gemi: '#ff5fcf', top: '#ff9a3c', ufo: '#ffe14d', dalga: '#40e0ff' };
    const ORB_COL = { halka_sari: '#ffd23f', halka_pembe: '#ff6fd0', halka_mavi: '#4ad8ff', halka_yesil: '#5dff6a', halka_siyah: '#1a1a1a' };
    const PAD_COL = { pad_sari: '#ffd23f', pad_pembe: '#ff6fd0', pad_mavi: '#4ad8ff' };

    function startRun(data, opts) {
        opts = opts || {};
        const L = RK.prepare(data);
        G = {
            data, L, st: RK.createState(L), px: 0, py: 0, attempts: 1,
            practice: !!opts.practice, race: !!opts.race, snap: null,
            phase: opts.race ? 'count' : 'play', deadT: 0, rot: 0, trail: [], ceilA: 0,
            startPerf: opts.startPerf || 0, deaths: 0, finishMs: 0, raceMs: 0,
        };
        G.px = G.st.x; G.py = G.st.y;
        particles = [];
        acc = 0;
        hideAll();
        $('#hud').hidden = false;
        $('#pratik-rozet').hidden = !G.practice;
        $('#ilerleme-rakip').hidden = !G.race;
        $('#btn-duraklat').hidden = G.race;
        updateHud(true);
        if (!G.race) Music.start(data, 0);
        else Music.start(data, -Math.max(0, (G.startPerf - performance.now()) / 1000));
        try { cv.focus(); } catch (e) { /* yok */ }
    }

    function respawn() {
        const st = G.snap ? RK.clone(G.snap) : RK.createState(G.L);
        G.st = st; G.px = st.x; G.py = st.y; G.trail = []; G.rot = 0;
        G.phase = 'play';
        acc = 0;
        if (!G.race) {
            G.attempts++;
            Music.start(G.data, G.snap ? G.snap.step * STEP : 0);
        }
        updateHud(true);
    }

    function onDeath() {
        const st = G.st;
        G.phase = 'dead'; G.deadT = G.race ? 0.6 : 0.75; G.deaths++;
        shake = 0.25;
        Sfx.olum();
        if (!G.race) Music.stop();
        burst(st.x, st.y + 0.5, '#ffb020', 26, 9);
        burst(st.x, st.y + 0.5, '#ffffff', 10, 6);
        if (!G.race && !G.data.yaris) {
            const r = rec(G.data.id);
            const p = RK.progress(st, G.L);
            if (G.practice) r.pr = Math.max(r.pr, p); else r.en = Math.max(r.en, p);
            r.den = (r.den || 0) + 1;
            writeSave();
        }
    }

    function onFinish() {
        G.phase = 'done';
        Sfx.bitis();
        burst(G.st.x, G.st.y + 0.5, '#7CFC9A', 40, 10);
        if (G.race) { Net.finished(); return; }
        Music.stop();
        const d = G.data;
        if (!d.yaris) {
            const r = rec(d.id);
            if (G.practice) r.pr = 100;
            else {
                r.en = 100; r.bitti = 1;
                G.st.coins.forEach(no => { if (r.coin.indexOf(no) < 0) r.coin.push(no); });
            }
            writeSave();
        }
        setTimeout(() => showResult(), 700);
    }

    function handleEvents() {
        const st = G.st;
        for (let i = 0; i < st.ev.length; i++) {
            const e = st.ev[i];
            if (e === 'dead') { onDeath(); break; }
            else if (e === 'done') { onFinish(); break; }
            else if (e === 'cp') {
                if (G.practice || G.race) { G.snap = RK.clone(st); Sfx.cp(); burst(st.x, st.y + 0.5, '#7CFC9A', 8, 4); }
            } else if (e === 'coin') { Sfx.coin(); burst(st.x, st.y + 0.5, '#ffd23f', 14, 5); updateHud(true); }
            else if (e === 'portal') Sfx.portal();
            else if (e === 'pad' || e === 'orb') burst(st.x, st.y + 0.2, '#ffffff', 6, 3);
        }
        st.ev.length = 0;
    }

    // ════════════ Döngü ════════════
    let acc = 0, last = 0;
    let bot = null;      // test kancası: doğrulama botunun girdi kaydını oynatır (__rk.bot())
    function frame(ts) {
        requestAnimationFrame(frame);
        const now = ts / 1000;
        let dt = now - (last || now); last = now;
        if (dt > 0.1) dt = 0.1;
        if (G) {
            if (G.phase === 'count') {
                const left = G.startPerf - performance.now();
                countdown(left);
                if (left <= 0) { G.phase = 'play'; acc = 0; }
            }
            if (G.phase === 'play') {
                acc += dt;
                while (acc >= STEP && G.phase === 'play') {
                    G.px = G.st.x; G.py = G.st.y;
                    RK.step(G.st, G.L, bot ? !!bot.holds[Math.floor(G.st.step / bot.D)] : hold);
                    G.raceMs += STEP * 1000;
                    handleEvents();
                    acc -= STEP;
                }
            } else if (G.phase === 'dead') {
                G.deadT -= dt;
                G.raceMs += dt * 1000;
                if (G.deadT <= 0) respawn();
            }
            if (G.race) Net.tick(now);
            updateHud(false);
        }
        updateParticles(dt);
        draw(G && G.phase === 'play' ? acc / STEP : 1, dt);
    }

    // ════════════ Parçacıklar ════════════
    function burst(x, y, col, n, sp) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, v = sp * (0.3 + Math.random());
            particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.4, col, s: 0.12 + Math.random() * 0.18 });
        }
    }
    function updateParticles(dt) {
        for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 12 * dt; p.life -= dt; }
        particles = particles.filter(p => p.life > 0);
        if (shake > 0) shake -= dt;
    }

    // ════════════ Çizim ════════════
    function shade(hex, k) {
        const n = parseInt(hex.slice(1), 16);
        let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
        return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
    }
    function hash01(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

    function draw(alpha, dt) {
        const data = G ? G.data : LV.bolumler[0];
        const tema = data.tema;
        const st = G ? G.st : null;
        const wx = st ? G.px + (st.x - G.px) * alpha : (performance.now() / 1000) * 6;
        const wy = st ? G.py + (st.y - G.py) * alpha : 0;
        camX = wx - (W / SC) * 0.3;
        const simT = st ? st.step * STEP : performance.now() / 1000;
        const beat = (simT * (data.bpm || 128) / 60) % 1;
        const pulse = Math.pow(1 - beat, 3);

        g2.save();
        if (shake > 0) g2.translate((Math.random() - 0.5) * shake * 30, (Math.random() - 0.5) * shake * 30);

        // gök + paralaks
        const sky = g2.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, tema.gok1); sky.addColorStop(1, tema.gok2);
        g2.fillStyle = sky; g2.fillRect(-40, -40, W + 80, H + 80);
        // uzak yıldızlar
        g2.fillStyle = 'rgba(255,255,255,0.55)';
        const farX = camX * 0.1;
        for (let i = Math.floor(farX / 3) - 1; i < Math.floor(farX / 3) + W / SC / 3 + 2; i++) {
            const x = (i * 3 + hash01(i) * 3 - farX) * SC, y = hash01(i + 9.3) * H * 0.6;
            const r = (0.03 + hash01(i + 3.1) * 0.05) * SC;
            g2.globalAlpha = 0.3 + 0.5 * hash01(i + 1.7); g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill();
        }
        g2.globalAlpha = 1;
        // tepeler (iki katman)
        hills(camX * 0.2, shade(tema.gok2, -0.35), 0.38, 9, 1.0);
        hills(camX * 0.45, shade(tema.gok2, -0.55), 0.24, 6, 2.0);

        // tavan
        const wantCeil = st && (st.mode !== 'kup' || st.grav === -1) ? 1 : 0;
        if (G) G.ceilA += (wantCeil - G.ceilA) * Math.min(1, dt * 6);
        const ceilA = G ? G.ceilA : 0;
        if (ceilA > 0.01) {
            g2.globalAlpha = ceilA;
            const top = sy(CEIL);
            const cg = g2.createLinearGradient(0, 0, 0, top);
            cg.addColorStop(0, shade(tema.zemin, -0.6)); cg.addColorStop(1, shade(tema.zemin, -0.25));
            g2.fillStyle = cg; g2.fillRect(-40, -40, W + 80, top + 40);
            g2.fillStyle = tema.cizgi; g2.fillRect(-40, top - 2 * DPR, W + 80, 3 * DPR);
            g2.globalAlpha = 1;
        }

        if (G) drawObjects(G.L, tema, simT, pulse);

        // zemin (çukurlar hariç)
        const gy = sy(0);
        const gg = g2.createLinearGradient(0, gy, 0, H);
        gg.addColorStop(0, tema.zemin); gg.addColorStop(1, shade(tema.zemin, -0.6));
        g2.fillStyle = gg;
        const pits = G ? G.L.pits : [];
        let cx0 = camX - 2;
        const xEnd = camX + W / SC + 2;
        const segs = [];
        pits.slice().sort((a, b) => a[0] - b[0]).forEach(p => { if (p[1] > cx0 && p[0] < xEnd) { segs.push([cx0, p[0]]); cx0 = Math.max(cx0, p[1]); } });
        segs.push([cx0, xEnd]);
        for (const [a, b] of segs) {
            if (b <= a) continue;
            g2.fillRect(sx(a), gy, (b - a) * SC, H - gy + 40);
            // zemin karoları
            g2.strokeStyle = 'rgba(255,255,255,0.08)'; g2.lineWidth = 1 * DPR;
            for (let x = Math.ceil(a / 2) * 2; x < b; x += 2) { g2.beginPath(); g2.moveTo(sx(x), gy); g2.lineTo(sx(x), H); g2.stroke(); }
            g2.fillStyle = tema.cizgi;
            g2.globalAlpha = 0.65 + 0.35 * pulse;
            g2.fillRect(sx(a), gy - 1.5 * DPR, (b - a) * SC, (3 + 2 * pulse) * DPR);
            g2.globalAlpha = 1;
            g2.fillStyle = gg;
        }

        // hayalet (online rakip)
        if (G && G.race) Net.drawGhost();

        // oyuncu
        if (G && st && G.phase !== 'dead') drawPlayer(wx, wy, st, dt);

        // parçacıklar
        for (const p of particles) {
            g2.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
            g2.fillStyle = p.col;
            g2.fillRect(sx(p.x) - p.s * SC / 2, sy(p.y) - p.s * SC / 2, p.s * SC, p.s * SC);
        }
        g2.globalAlpha = 1;
        g2.restore();
    }

    function hills(off, col, amp, period, seed) {
        g2.fillStyle = col;
        g2.beginPath();
        g2.moveTo(-10, H);
        const wpx = W / SC;
        for (let i = 0; i <= 60; i++) {
            const x = (i / 60) * wpx;
            const t = (x + off) / period;
            const y = 1.2 + amp * 10 * (0.5 + 0.5 * Math.sin(t + seed) * Math.cos(t * 0.37 + seed * 2));
            g2.lineTo(x * SC, sy(y));
        }
        g2.lineTo(W + 10, H);
        g2.closePath(); g2.fill();
    }

    function drawObjects(L, tema, t, pulse) {
        const x0 = camX - 3, x1 = camX + W / SC + 3;
        const objs = L.objs;
        // ikili arama ile başlangıç
        let lo = 0, hi = objs.length;
        while (lo < hi) { const m = (lo + hi) >> 1; if (objs[m].x0 < x0 - 3) lo = m + 1; else hi = m; }
        const savedCoins = (G && G.data && save.b[G.data.id]) ? save.b[G.data.id].coin : [];
        for (let i = lo; i < objs.length; i++) {
            const o = objs[i];
            if (o.x0 > x1) break;
            if (o.x1 < x0) continue;
            switch (o.t) {
                case 'blok': drawBlock(o, tema); break;
                case 'diken': case 'yarim_diken': drawSpike(o); break;
                case 'testere': drawSaw(o, t); break;
                case 'pad_sari': case 'pad_pembe': case 'pad_mavi': drawPad(o, pulse); break;
                case 'halka_sari': case 'halka_pembe': case 'halka_mavi': case 'halka_yesil': case 'halka_siyah': drawOrb(o, pulse); break;
                case 'portal_mod': case 'portal_yercekimi': case 'portal_hiz': drawPortal(o, t); break;
                case 'checkpoint': if (G.practice || G.race) drawFlag(o); break;
                case 'coin': if (G.st.coins.indexOf(o.no) < 0) drawCoin(o, t, savedCoins.indexOf(o.no) >= 0); break;
            }
        }
        // bitiş kapısı
        const bx = L.bitis;
        if (bx > x0 && bx < x1 + 2) {
            const c = 0.5;
            for (let yy = 0; yy < CEIL / c; yy++) for (let xx = 0; xx < 2; xx++) {
                g2.fillStyle = (yy + xx) % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,30,0.85)';
                g2.fillRect(sx(bx + xx * c), sy((yy + 1) * c), c * SC + 1, c * SC + 1);
            }
            g2.fillStyle = '#fff'; g2.font = '900 ' + Math.round(0.7 * SC) + 'px system-ui, sans-serif'; g2.textAlign = 'center';
            g2.fillText('BİTİŞ', sx(bx + 0.5), sy(CEIL + 0.3));
        }
    }

    function drawBlock(o, tema) {
        const X = sx(o.x0), Y = sy(o.y1), w = (o.x1 - o.x0) * SC, h = (o.y1 - o.y0) * SC;
        g2.fillStyle = 'rgba(6,8,24,0.78)'; g2.fillRect(X, Y, w, h);
        g2.strokeStyle = tema.cizgi; g2.globalAlpha = 0.22; g2.lineWidth = 1 * DPR;
        for (let x = 1; x < o.x1 - o.x0; x++) { g2.beginPath(); g2.moveTo(X + x * SC, Y); g2.lineTo(X + x * SC, Y + h); g2.stroke(); }
        for (let y = 1; y < o.y1 - o.y0; y++) { g2.beginPath(); g2.moveTo(X, Y + y * SC); g2.lineTo(X + w, Y + y * SC); g2.stroke(); }
        g2.globalAlpha = 1;
        g2.strokeStyle = tema.cizgi; g2.lineWidth = 2 * DPR; g2.strokeRect(X + DPR, Y + DPR, w - 2 * DPR, h - 2 * DPR);
    }
    function drawSpike(o) {
        const h = o.t === 'diken' ? 1 : 0.5;
        const up = o.yon !== 'asagi';
        const by = o.y || 0;
        const baseY = up ? by : by + 1, tipY = up ? by + h : by + 1 - h;
        g2.beginPath();
        g2.moveTo(sx(o.x + 0.06), sy(baseY)); g2.lineTo(sx(o.x + 0.5), sy(tipY)); g2.lineTo(sx(o.x + 0.94), sy(baseY)); g2.closePath();
        const gr = g2.createLinearGradient(0, sy(tipY), 0, sy(baseY));
        gr.addColorStop(0, '#3a3f66'); gr.addColorStop(1, '#0a0b18');
        g2.fillStyle = gr; g2.fill();
        g2.strokeStyle = 'rgba(255,255,255,0.9)'; g2.lineWidth = 2 * DPR; g2.stroke();
    }
    function drawSaw(o, t) {
        const X = sx(o.x), Y = sy(o.cy), R = o.r * SC;
        g2.save(); g2.translate(X, Y); g2.rotate(-t * 6);
        g2.beginPath();
        const n = 12;
        for (let i = 0; i < n * 2; i++) {
            const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? R * 0.78 : R;
            g2.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g2.closePath(); g2.fillStyle = '#c9cfe0'; g2.fill(); g2.strokeStyle = '#2a2d40'; g2.lineWidth = 2 * DPR; g2.stroke();
        g2.beginPath(); g2.arc(0, 0, R * 0.32, 0, 7); g2.fillStyle = '#2a2d40'; g2.fill();
        g2.restore();
    }
    function drawPad(o, pulse) {
        const X = sx(o.x + 0.5), Y = sy(o.y || 0);
        g2.fillStyle = PAD_COL[o.t];
        g2.shadowColor = PAD_COL[o.t]; g2.shadowBlur = (8 + 10 * pulse) * DPR;
        g2.beginPath(); g2.ellipse(X, Y, 0.42 * SC, 0.22 * SC, 0, Math.PI, 0); g2.fill();
        g2.shadowBlur = 0;
    }
    function drawOrb(o, pulse) {
        if (G.st.used[o.id]) return;
        const X = sx(o.x), Y = sy(o.cy), r = (0.4 + 0.05 * pulse) * SC;
        const col = ORB_COL[o.t];
        g2.shadowColor = o.t === 'halka_siyah' ? '#ffffff' : col; g2.shadowBlur = 14 * DPR;
        g2.beginPath(); g2.arc(X, Y, r, 0, 7); g2.fillStyle = col; g2.fill();
        g2.shadowBlur = 0;
        g2.lineWidth = 3 * DPR; g2.strokeStyle = '#fff'; g2.stroke();
        g2.beginPath(); g2.arc(X, Y, r * 1.55, 0, 7); g2.globalAlpha = 0.35 + 0.3 * pulse; g2.lineWidth = 2 * DPR; g2.strokeStyle = col; g2.stroke();
        g2.globalAlpha = 1;
    }
    function portalStyle(o) {
        if (o.t === 'portal_mod') return { col: MODE_COL[o.deger] || '#fff', ic: { kup: '■', gemi: '➤', top: '●', ufo: '◓', dalga: '➶' }[o.deger] || '?' };
        if (o.t === 'portal_yercekimi') return o.deger === 'ters' ? { col: '#ffd23f', ic: '⇅' } : { col: '#4ad8ff', ic: '⇅' };
        const v = String(o.deger);
        return { col: { '0.5': '#ffa040', '1': '#40c8ff', '2': '#50ff70', '3': '#ff50e0', '4': '#ff4040' }[v] || '#fff', ic: { '0.5': '‹', '1': '›', '2': '»', '3': '⋙', '4': '⋙›' }[v] || '›' };
    }
    function drawPortal(o, t) {
        const p = portalStyle(o);
        const full = o.ylo < -50;
        const yA = full ? 0.15 : o.ylo, yB = full ? CEIL - 0.15 : o.yhi;
        const X = sx(o.x), w = 0.55 * SC;
        g2.save();
        g2.shadowColor = p.col; g2.shadowBlur = 16 * DPR;
        g2.strokeStyle = p.col; g2.lineWidth = 4 * DPR;
        g2.globalAlpha = 0.85;
        g2.beginPath(); g2.ellipse(X, (sy(yA) + sy(yB)) / 2, w / 2, (yB - yA) * SC / 2, 0, 0, 7); g2.stroke();
        g2.globalAlpha = 0.18; g2.fillStyle = p.col; g2.fill();
        g2.restore();
        const cy = full ? 4.5 : (o.ylo + o.yhi) / 2;
        g2.beginPath(); g2.arc(X, sy(cy), 0.5 * SC, 0, 7); g2.fillStyle = 'rgba(0,0,0,0.6)'; g2.fill();
        g2.lineWidth = 2 * DPR; g2.strokeStyle = p.col; g2.stroke();
        g2.fillStyle = p.col; g2.font = '900 ' + Math.round(0.62 * SC) + 'px system-ui, sans-serif';
        g2.textAlign = 'center'; g2.textBaseline = 'middle';
        g2.fillText(p.ic, X, sy(cy) + 1);
        g2.textBaseline = 'alphabetic';
        void t;
    }
    function drawFlag(o) {
        const X = sx(o.x), Y = sy(0);
        g2.strokeStyle = '#fff'; g2.lineWidth = 2 * DPR;
        g2.beginPath(); g2.moveTo(X, Y); g2.lineTo(X, Y - 1.6 * SC); g2.stroke();
        g2.fillStyle = G.st.cp >= o.x ? '#7CFC9A' : 'rgba(124,252,154,0.45)';
        g2.beginPath(); g2.moveTo(X, Y - 1.6 * SC); g2.lineTo(X + 0.7 * SC, Y - 1.35 * SC); g2.lineTo(X, Y - 1.1 * SC); g2.fill();
    }
    function drawCoin(o, t, old) {
        const X = sx(o.x), Y = sy(o.cy), r = 0.38 * SC;
        const k = Math.abs(Math.cos(t * 3 + o.x));
        g2.save(); g2.translate(X, Y); g2.scale(0.25 + 0.75 * k, 1);
        g2.shadowColor = old ? '#c0c8e0' : '#ffd23f'; g2.shadowBlur = 12 * DPR;
        g2.beginPath(); g2.arc(0, 0, r, 0, 7); g2.fillStyle = old ? '#b8c0d8' : '#ffc61a'; g2.fill();
        g2.shadowBlur = 0; g2.lineWidth = 2 * DPR; g2.strokeStyle = old ? '#6a7290' : '#b4600c'; g2.stroke();
        g2.fillStyle = old ? '#6a7290' : '#b4600c'; g2.font = '900 ' + Math.round(0.45 * SC) + 'px system-ui, sans-serif';
        g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('★', 0, 1);
        g2.restore(); g2.textBaseline = 'alphabetic';
    }

    function cubeFace(size, c1, c2) {
        const s = size;
        g2.fillStyle = c1; g2.fillRect(-s / 2, -s / 2, s, s);
        g2.strokeStyle = '#2a1600'; g2.lineWidth = Math.max(1.5, s * 0.07); g2.strokeRect(-s / 2, -s / 2, s, s);
        g2.fillStyle = c2; g2.fillRect(-s * 0.32, -s * 0.32, s * 0.64, s * 0.64);
        g2.fillStyle = '#1b1030';
        g2.fillRect(-s * 0.24, -s * 0.18, s * 0.16, s * 0.16);
        g2.fillRect(s * 0.08, -s * 0.18, s * 0.16, s * 0.16);
        g2.fillStyle = '#fff';
        g2.fillRect(-s * 0.2, -s * 0.16, s * 0.06, s * 0.06);
        g2.fillRect(s * 0.12, -s * 0.16, s * 0.06, s * 0.06);
        g2.fillStyle = '#1b1030'; g2.fillRect(-s * 0.16, s * 0.1, s * 0.32, s * 0.07);
    }

    function drawPlayer(wx, wy, st, dt) {
        const s = SC;
        const X = sx(wx), Y = sy(wy + 0.5);
        const gsign = st.grav;
        // iz
        if (st.mode === 'dalga' || st.mode === 'gemi') {
            G.trail.push([wx - 0.3, wy + 0.5]);
            if (G.trail.length > 40) G.trail.shift();
            g2.strokeStyle = st.mode === 'dalga' ? 'rgba(64,224,255,0.7)' : 'rgba(255,255,255,0.35)';
            g2.lineWidth = (st.mode === 'dalga' ? 6 : 4) * DPR;
            g2.beginPath();
            G.trail.forEach(([x, y], i) => { if (i === 0) g2.moveTo(sx(x), sy(y)); else g2.lineTo(sx(x), sy(y)); });
            g2.stroke();
        } else if (G.trail.length) G.trail = [];

        g2.save();
        g2.translate(X, Y);
        if (st.mode === 'kup') {
            if (st.onGround) G.rot = Math.round(G.rot / (Math.PI / 2)) * (Math.PI / 2);
            else G.rot += gsign * (Math.PI / 0.38) * dt;
            g2.rotate(G.rot);
            cubeFace(s * 0.98, '#ffb020', '#ffe066');
        } else if (st.mode === 'gemi') {
            g2.scale(1, -gsign);
            g2.rotate(-Math.atan2(st.vy * gsign, 10) * 0.8);
            g2.scale(1, -1);
            g2.save(); g2.translate(-s * 0.05, -s * 0.22); cubeFace(s * 0.5, '#ffb020', '#ffe066'); g2.restore();
            g2.beginPath();
            g2.moveTo(-s * 0.55, s * 0.05); g2.lineTo(s * 0.55, s * 0.12); g2.lineTo(s * 0.2, s * 0.42); g2.lineTo(-s * 0.5, s * 0.42); g2.closePath();
            g2.fillStyle = '#ff5fcf'; g2.fill(); g2.strokeStyle = '#3a0a30'; g2.lineWidth = 2 * DPR; g2.stroke();
        } else if (st.mode === 'top') {
            g2.rotate((wx * 2.2) * gsign);
            g2.beginPath(); g2.arc(0, 0, s * 0.48, 0, 7); g2.fillStyle = '#ff9a3c'; g2.fill();
            g2.lineWidth = 2.5 * DPR; g2.strokeStyle = '#3a1600'; g2.stroke();
            g2.beginPath(); g2.arc(0, 0, s * 0.3, 0, 7); g2.fillStyle = '#ffe066'; g2.fill();
            g2.fillStyle = '#1b1030'; g2.fillRect(-s * 0.16, -s * 0.12, s * 0.1, s * 0.1); g2.fillRect(s * 0.06, -s * 0.12, s * 0.1, s * 0.1);
        } else if (st.mode === 'ufo') {
            g2.scale(1, gsign === -1 ? -1 : 1);
            g2.save(); g2.translate(0, -s * 0.12); cubeFace(s * 0.48, '#ffb020', '#ffe066'); g2.restore();
            g2.beginPath(); g2.ellipse(0, s * 0.18, s * 0.55, s * 0.2, 0, 0, 7); g2.fillStyle = '#ffe14d'; g2.fill();
            g2.strokeStyle = '#3a2a00'; g2.lineWidth = 2 * DPR; g2.stroke();
        } else if (st.mode === 'dalga') {
            const ang = (hold ? -1 : 1) * gsign * Math.PI / 4;
            g2.rotate(ang);
            g2.beginPath(); g2.moveTo(s * 0.45, 0); g2.lineTo(-s * 0.35, -s * 0.32); g2.lineTo(-s * 0.2, 0); g2.lineTo(-s * 0.35, s * 0.32); g2.closePath();
            g2.fillStyle = '#40e0ff'; g2.fill(); g2.strokeStyle = '#002a3a'; g2.lineWidth = 2 * DPR; g2.stroke();
        }
        g2.restore();
    }

    // ════════════ HUD ════════════
    let hudPct = -1;
    function updateHud(force) {
        if (!G) return;
        const p = RK.progress(G.st, G.L);
        if (force || p !== hudPct) {
            hudPct = p;
            $('#ilerleme-ben').style.width = p + '%';
            $('#yuzde').textContent = p + '%';
            $('#deneme').textContent = G.race ? ('Ölüm ' + G.deaths) : ('Deneme ' + G.attempts);
            const total = G.L.coinCount;
            $('#coin-hud').hidden = !total;
            $('#coin-hud').textContent = total ? '★ ' + G.st.coins.length + '/' + total : '';
        }
    }
    function countdown(leftMs) {
        const el = $('#geri-sayim');
        if (leftMs <= 0) { el.hidden = true; el.dataset.n = ''; return; }
        const n = Math.ceil(leftMs / 1000);
        const txt = n > 3 ? '' : String(n);
        el.hidden = !txt;
        if (el.dataset.n !== txt) { el.dataset.n = txt; el.textContent = txt; if (txt) Sfx.say(n); }
    }

    // ════════════ Ekranlar ════════════
    function hideAll() { ['#menu', '#duraklat', '#sonuc', '#online'].forEach(s => { $(s).hidden = true; }); }
    function isUnlocked(i) {
        const d = LV.bolumler[i];
        if (d.dunya === 1) return true;
        // yeni dünya, önceki dünyanın sınav bölümü bitince açılır
        const prevWorldLast = LV.bolumler.filter(x => x.dunya === d.dunya - 1).slice(-1)[0];
        return !!(prevWorldLast && save.b[prevWorldLast.id] && save.b[prevWorldLast.id].bitti);
    }
    function card(d, i, onPick, opts) {
        opts = opts || {};
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'bolum-kart';
        b.style.setProperty('--k1', d.tema.gok2); b.style.setProperty('--k2', d.tema.gok1);
        const r = save.b[d.id];
        const no = document.createElement('span'); no.className = 'bk-no';
        const num = LV.bolumler.indexOf(d) + 1;
        no.textContent = d.yaris ? ('Pist ' + d.id.split('-')[1]) : ('Bölüm ' + num + ' · Dünya ' + d.dunya);
        const ad = document.createElement('span'); ad.className = 'bk-ad'; ad.textContent = d.ad;
        const alt = document.createElement('span'); alt.className = 'bk-alt';
        const z = document.createElement('span'); z.textContent = d.zorluk + (d.yildiz ? ' · ' + d.yildiz + '★' : '');
        alt.appendChild(z);
        if (!d.yaris) {
            const c = document.createElement('span'); c.className = 'bk-coin';
            const got = r ? r.coin.length : 0;
            c.textContent = '●'.repeat(got) + '○'.repeat(3 - got);
            c.setAttribute('aria-label', got + ' / 3 coin');
            alt.appendChild(c);
        }
        b.append(no, ad, alt);
        if (!d.yaris) {
            const bar = document.createElement('div'); bar.className = 'bk-bar';
            const fill = document.createElement('i'); fill.style.width = (r ? r.en : 0) + '%'; bar.appendChild(fill);
            b.appendChild(bar);
            if (r && r.bitti) { const t = document.createElement('span'); t.className = 'bk-tamam'; t.textContent = '✔'; t.setAttribute('aria-label', 'tamamlandı'); b.appendChild(t); }
            b.setAttribute('aria-label', `Bölüm ${num}: ${d.ad}, ${d.zorluk}. En iyi %${r ? r.en : 0}` + (opts.locked ? '. Kilitli' : ''));
        }
        if (opts.locked) { b.disabled = true; b.title = 'Önceki dünyanın son bölümünü bitir'; }
        b.addEventListener('click', () => onPick(d, b));
        return b;
    }
    function showMenu() {
        Music.stop();
        G = null;
        hideAll();
        $('#hud').hidden = true;
        $('#geri-sayim').hidden = true;
        const grid = $('#bolumler'); grid.textContent = '';
        LV.bolumler.forEach((d, i) => grid.appendChild(card(d, i, play, { locked: !isUnlocked(i) })));
        const pg = $('#pistler'); pg.textContent = '';
        LV.pistler.forEach((d, i) => pg.appendChild(card(d, i, play)));
        $('#menu').hidden = false;
    }
    function play(d) {
        EduKit.audio.init();
        startRun(d, { practice: practiceMode });
    }
    function showResult() {
        hideAll();
        $('#hud').hidden = true;
        const d = G.data;
        const body = $('#sonuc-govde'); body.textContent = '';
        const big = document.createElement('div'); big.className = 'buyuk'; big.textContent = G.practice ? 'Pratik tamam!' : 'Bölüm tamam!';
        const p1 = document.createElement('div'); p1.textContent = d.ad + ' · ' + G.attempts + '. denemede';
        body.append(big, p1);
        if (G.L.coinCount) {
            const p2 = document.createElement('div');
            p2.textContent = G.practice ? 'Coinler yalnız Normal modda kaydedilir.' : ('Coin: ' + '★'.repeat(G.st.coins.length) + '☆'.repeat(G.L.coinCount - G.st.coins.length));
            body.appendChild(p2);
        }
        $('#sonuc-baslik').textContent = 'Tebrikler!';
        const btns = $('#sonuc-dugmeler'); btns.textContent = '';
        const list = d.yaris ? LV.pistler : LV.bolumler;
        const idx = list.indexOf(d);
        const nextD = list[idx + 1];
        if (nextD && (d.yaris || isUnlocked(idx + 1))) btns.appendChild(btn('Sonraki bölüm', true, () => play(nextD)));
        btns.appendChild(btn('Tekrar', !nextD, () => play(d)));
        if (G.practice && !d.yaris) btns.appendChild(btn('Normal modda dene', false, () => { setPractice(false); play(d); }));
        btns.appendChild(btn('Bölümler', false, showMenu));
        $('#sonuc').hidden = false;
        const f = btns.querySelector('button'); if (f) f.focus();
    }
    function btn(txt, main, fn) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'dugme' + (main ? ' dugme-ana' : ''); b.textContent = txt;
        b.addEventListener('click', fn);
        return b;
    }
    function pause() {
        if (!G || G.race || G.phase === 'done' || $('#duraklat').hidden === false) return;
        G.pausedPhase = G.phase; G.phase = 'paused'; hold = false;
        Music.stop();
        $('#duraklat').hidden = false;
        $('#btn-devam').focus();
    }
    function resume() {
        if (!G || G.phase !== 'paused') return;
        $('#duraklat').hidden = true;
        // kaldığı yerden müzik
        G.phase = G.pausedPhase || 'play';
        acc = 0;
        Music.start(G.data, G.st.step * STEP);
        try { cv.focus(); } catch (e) { /* yok */ }
    }
    function setPractice(on) {
        practiceMode = on;
        document.querySelectorAll('.secenek').forEach(b => b.setAttribute('aria-checked', String((b.dataset.tur === 'pratik') === on)));
    }

    // ════════════ Girdi ════════════
    function isUi(t) { return t && t.closest && t.closest('button, .ekran'); }
    document.addEventListener('pointerdown', (e) => {
        if (isUi(e.target)) return;
        if (e.button !== undefined && e.button > 0) return;
        EduKit.audio.unlock();
        hold = true;
    });
    const release = () => { hold = false; };
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
    document.addEventListener('keydown', (e) => {
        if (JUMP_KEYS.indexOf(e.code) >= 0) {
            if (G && (G.phase === 'play' || G.phase === 'dead' || G.phase === 'count') && !isUi(document.activeElement)) {
                e.preventDefault(); hold = true;
            } else if (e.code === 'Space' && G && G.phase === 'play') { e.preventDefault(); hold = true; }
        } else if (e.code === 'Escape' || e.code === 'KeyP') {
            if (G && G.phase === 'paused') resume(); else pause();
        } else if (e.code === 'KeyM') toggleSound();
    });
    document.addEventListener('keyup', (e) => { if (JUMP_KEYS.indexOf(e.code) >= 0) hold = false; });

    function toggleSound() {
        save.ses = !save.ses; writeSave();
        const b = $('#btn-ses');
        b.setAttribute('aria-pressed', String(!save.ses));
        b.setAttribute('aria-label', save.ses ? 'Sesi kapat' : 'Sesi aç');
        if (!save.ses) Music.stop();
        else if (G && G.phase === 'play' && !G.race) { EduKit.audio.init(); Music.start(G.data, G.st.step * STEP); }
    }

    $('#btn-ses').addEventListener('click', toggleSound);
    $('#btn-duraklat').addEventListener('click', pause);
    $('#btn-devam').addEventListener('click', resume);
    $('#btn-yeniden').addEventListener('click', () => { const d = G.data; $('#duraklat').hidden = true; startRun(d, { practice: G.practice }); });
    $('#btn-menu').addEventListener('click', showMenu);
    document.querySelectorAll('.secenek').forEach(b => b.addEventListener('click', () => setPractice(b.dataset.tur === 'pratik')));
    document.querySelector('.secenek-satir').addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setPractice(!practiceMode); document.querySelector('.secenek[aria-checked="true"]').focus(); }
    });
    EduKit.onHidden(() => { hold = false; if (G && !G.race) pause(); });

    // ════════════ Online yarış (hub lobisi) ════════════
    const Net = (() => {
        let ref = null, pdb = null, offset = 0, presence = null;
        let tur = 0, oppSeen = false, oppHere = false, oppGoneTimer = null;
        let opp = null;                 // son durum
        const buf = [];                 // interpolasyon tamponu [{t, x, y, m, g}]
        let lastSend = 0, selected = LV.pistler[0].id, raceTimeout = 0, resultShown = false;
        const serverNow = () => Date.now() + offset;

        function init() {
            const pwin = window.parent;
            if (!pwin || pwin === window || !pwin.firebase) return false;
            try {
                pdb = pwin.firebase.database();
                ref = pdb.ref('lobbies/' + LOBBY + '/rk');
            } catch (e) { return false; }
            pdb.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
            presence = ref.child('var/' + ROLE);
            pdb.ref('.info/connected').on('value', s => {
                if (s.val() === true && presence) { presence.onDisconnect().remove(); presence.set(true); }
            });
            ref.child('var/' + OPP_ROLE).on('value', s => {
                if (s.val()) {
                    oppSeen = true; oppHere = true;
                    if (oppGoneTimer) { clearTimeout(oppGoneTimer); oppGoneTimer = null; }
                } else if (oppSeen && !oppGoneTimer) {
                    oppGoneTimer = setTimeout(() => {
                        oppGoneTimer = null; oppHere = false;
                        EduKit.toast(OPP_NAME + ' ayrıldı.');
                        if (G && G.race && G.phase === 'done') showRaceResult();
                    }, 6000);
                }
                lobbyUi();
            });
            ref.child('yaris').on('value', s => {
                const v = s.val();
                if (!v || !v.tur || v.tur === tur) { if (v && v.pist) { selected = v.pist; lobbyUi(); } return; }
                tur = v.tur; selected = v.pist;
                beginRace(v);
            });
            ref.child('oyuncu/' + OPP_ROLE).on('value', s => {
                const v = s.val();
                if (!v || v.tur !== tur) return;
                opp = v;
                buf.push({ t: performance.now(), x: v.x, y: v.y, m: v.m, g: v.g, o: v.o });
                if (buf.length > 30) buf.shift();
                if (G && G.race && G.phase === 'done' && v.b) showRaceResult();
            });
            window.addEventListener('pagehide', cleanup);
            return true;
        }
        function cleanup() {
            try { if (presence) presence.remove(); } catch (e) { /* yok */ }
        }
        function lobbyUi() {
            $('#rakip-ad').textContent = OPP_NAME;
            $('#rakip-nokta').classList.toggle('acik', oppHere);
            const startBtn = $('#btn-baslat');
            startBtn.hidden = ROLE !== 'host';
            startBtn.disabled = !oppHere;
            const grid = $('#online-pistler');
            if (!grid.childElementCount) {
                LV.pistler.concat(LV.bolumler.slice(0, 3)).forEach((d, i) => {
                    const c = card(d, i, (dd) => {
                        if (ROLE !== 'host') return;
                        selected = dd.id; lobbyUi();
                        ref.child('yaris/pist').set(selected);
                    });
                    grid.appendChild(c);
                });
            }
            grid.querySelectorAll('.bolum-kart').forEach((b, i) => {
                const d = LV.pistler.concat(LV.bolumler.slice(0, 3))[i];
                b.setAttribute('aria-pressed', String(d.id === selected));
                b.disabled = ROLE !== 'host';
                if (ROLE !== 'host') b.style.filter = d.id === selected ? 'none' : '';
            });
            $('#online-mesaj').textContent = ROLE === 'host'
                ? (oppHere ? 'Pisti seç ve Başlat\'a bas. Rakibin yarı saydam hayalet olarak görünür; ölürsen son checkpoint\'ten devam edersin.' : OPP_NAME + ' bekleniyor…')
                : 'Kurucu pisti seçiyor… Yarış başlayınca geri sayım çıkar.';
        }
        function showLobby() {
            Music.stop();
            G = null;
            hideAll();
            $('#hud').hidden = true;
            $('#online').hidden = false;
            lobbyUi();
        }
        function hostStart() {
            if (ROLE !== 'host' || !oppHere) return;
            EduKit.audio.init();
            ref.child('oyuncu').remove();
            ref.child('yaris').set({ pist: selected, t0: serverNow() + 3800, tur: tur + 1 });
        }
        function beginRace(v) {
            const d = LV.hepsi.find(x => x.id === v.pist) || LV.pistler[0];
            EduKit.audio.init();
            buf.length = 0; opp = null; resultShown = false;
            const startPerf = performance.now() + (v.t0 - serverNow());
            raceTimeout = startPerf + (d.bitis / 10.4) * 3000;
            startRun(d, { race: true, startPerf });
        }
        function tick() {
            const now = performance.now();
            if (G.phase !== 'count' && now - lastSend > 100) {
                lastSend = now;
                const st = G.st;
                ref.child('oyuncu/' + ROLE).set({
                    tur, x: +st.x.toFixed(2), y: +st.y.toFixed(2), m: st.mode, g: st.grav,
                    o: G.phase === 'dead' ? 1 : 0, d: G.deaths, b: G.finishMs || 0,
                }).catch(() => { /* geçici ağ hatası */ });
            }
            if (opp) {
                const pct = Math.max(0, Math.min(100, (opp.x / G.L.bitis) * 100));
                $('#ilerleme-rakip').style.left = pct + '%';
            }
            if (G.phase !== 'done' && now > raceTimeout && raceTimeout) { G.phase = 'done'; Music.stop(); showRaceResult(); }
        }
        function finished() {
            // oyun zamanı (fizik adımı + ölüm beklemesi): kare düşmesi süreyi şişirmez, girdi kaydıyla doğrulanabilir
            G.finishMs = Math.max(1, Math.round(G.raceMs));
            lastSend = 0; tick();
            Music.stop();
            if ((opp && opp.b) || !oppHere) showRaceResult();
            else EduKit.toast('Bitirdin! ' + OPP_NAME + ' bekleniyor…', 4000);
        }
        function ghostPos() {
            if (!buf.length) return null;
            const t = performance.now() - 120;
            let a = buf[0], b = buf[buf.length - 1];
            for (let i = 0; i < buf.length - 1; i++) if (buf[i].t <= t && buf[i + 1].t >= t) { a = buf[i]; b = buf[i + 1]; break; }
            if (t >= b.t) return b;
            const k = b.t === a.t ? 1 : Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
            if (Math.abs(b.x - a.x) > 8) return b;    // checkpoint'e dönüş: atlama, kaydırma
            return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, m: b.m, g: b.g, o: b.o };
        }
        function drawGhost() {
            const p = ghostPos();
            if (!p || p.o) return;
            const X = sx(p.x), Y = sy(p.y + 0.5);
            const inView = X > -SC && X < W + SC;
            g2.save();
            if (inView) {
                g2.globalAlpha = 0.45;
                g2.translate(X, Y);
                if (p.m === 'top') { g2.beginPath(); g2.arc(0, 0, SC * 0.48, 0, 7); g2.fillStyle = '#6ec8ff'; g2.fill(); }
                else cubeFace(SC * 0.9, '#3a8ee0', '#6ec8ff');
                g2.globalAlpha = 0.9;
                g2.fillStyle = '#fff'; g2.font = '800 ' + Math.round(0.42 * SC) + 'px system-ui, sans-serif'; g2.textAlign = 'center';
                g2.fillText(OPP_NAME, 0, -SC * 0.75);
            } else {
                const right = X >= W;
                const ex = right ? W - 0.6 * SC : 0.6 * SC, ey = Math.max(SC, Math.min(H - SC, Y));
                g2.fillStyle = '#6ec8ff';
                g2.beginPath();
                if (right) { g2.moveTo(ex + 0.4 * SC, ey); g2.lineTo(ex - 0.2 * SC, ey - 0.35 * SC); g2.lineTo(ex - 0.2 * SC, ey + 0.35 * SC); }
                else { g2.moveTo(ex - 0.4 * SC, ey); g2.lineTo(ex + 0.2 * SC, ey - 0.35 * SC); g2.lineTo(ex + 0.2 * SC, ey + 0.35 * SC); }
                g2.fill();
                g2.font = '800 ' + Math.round(0.4 * SC) + 'px system-ui, sans-serif'; g2.textAlign = right ? 'right' : 'left';
                const diff = Math.round(p.x - G.st.x);
                g2.fillText(OPP_NAME + ' ' + (diff > 0 ? '+' : '') + diff + ' blok', right ? ex - 0.4 * SC : ex + 0.4 * SC, ey - 0.5 * SC);
            }
            g2.restore();
        }
        function fmt(ms) { return (ms / 1000).toFixed(2) + ' sn'; }
        function showRaceResult() {
            if (resultShown || !G) return;
            resultShown = true;
            Music.stop();
            const me = { ad: 'Sen', b: G.finishMs, x: G.st.x, d: G.deaths };
            const op = { ad: OPP_NAME, b: opp ? opp.b : 0, x: opp ? opp.x : 0, d: opp ? opp.d : 0 };
            const rank = [me, op].sort((a, b) => {
                if (a.b && b.b) return a.b - b.b;
                if (a.b) return -1; if (b.b) return 1;
                return b.x - a.x;
            });
            hideAll();
            $('#hud').hidden = true;
            const body = $('#sonuc-govde'); body.textContent = '';
            const big = document.createElement('div'); big.className = 'buyuk';
            const tie = me.b && op.b && Math.abs(me.b - op.b) < 1;
            big.textContent = tie ? 'Berabere!' : (rank[0] === me ? 'Kazandın!' : (OPP_NAME + ' kazandı'));
            body.appendChild(big);
            const tb = document.createElement('table'); tb.className = 'sira';
            rank.forEach((r, i) => {
                const tr = document.createElement('tr'); if (i === 0 && !tie) tr.className = 'kazanan';
                [(i + 1) + '.', r.ad, r.b ? fmt(r.b) : ('%' + Math.min(99, Math.floor((r.x / G.L.bitis) * 100))), r.d + ' ölüm']
                    .forEach(t => { const td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
                tb.appendChild(tr);
            });
            body.appendChild(tb);
            if (!oppHere) { const p = document.createElement('div'); p.textContent = OPP_NAME + ' yarıştan ayrıldı.'; body.appendChild(p); }
            $('#sonuc-baslik').textContent = 'Yarış bitti';
            const btns = $('#sonuc-dugmeler'); btns.textContent = '';
            if (ROLE === 'host') {
                btns.appendChild(btn('Rövanş', true, () => { hostStart(); }));
                btns.appendChild(btn('Pist değiştir', false, showLobby));
            } else {
                const w = document.createElement('p'); w.className = 'alt'; w.textContent = 'Rövanş için kurucuyu bekle…';
                btns.appendChild(w);
                btns.appendChild(btn('Lobi', false, showLobby));
            }
            $('#sonuc').hidden = false;
        }
        return { init, showLobby, hostStart, tick, finished, drawGhost };
    })();

    $('#btn-baslat').addEventListener('click', () => Net.hostStart());

    // ════════════ Başlat ════════════
    loadSave();
    $('#btn-ses').setAttribute('aria-pressed', String(!save.ses));
    if (ONLINE) {
        if (Net.init()) Net.showLobby();
        else { showMenu(); EduKit.toast('Online bağlantı kurulamadı — tek kişilik oynayabilirsin.', 5000); }
    } else showMenu();
    requestAnimationFrame(frame);

    // test/hata ayıklama kancası (yalnız okuma)
    window.__rk = {
        get G() { return G; },
        play: (id, pr) => { const d = LV.hepsi.find(x => x.id === id); if (d) startRun(d, { practice: !!pr }); },
        bot: (on) => { bot = on && G ? RK.solve(G.L) : null; return !!bot; },
    };
})();
