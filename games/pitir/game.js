/* Pıtır — tarayıcı katmanı: çizim (Canvas 2D), girdi (klavye + dokunmatik), menü, kayıt, sesler.
   Fizik ve bölümler saf çekirdekte: core.js (PCore) + levels.js (PLevels). */
(function () {
    'use strict';
    const P = window.PCore;
    const LV = window.PLevels;
    const K = P.K;
    const STEP = P.STEP;
    const $ = (s) => document.querySelector(s);

    // ════════════ Kayıt ════════════
    const SAVE_KEY = 'pitir_ilerleme';
    let save = { b: {}, ses: true };
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const v = JSON.parse(raw); if (v && typeof v === 'object') save = Object.assign({ b: {}, ses: true }, v); } } catch (e) { /* kayıtsız */ }
    const writeSave = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* yok */ } };
    const rec = (id) => save.b[id] || (save.b[id] = { bitti: 0, yildiz: [], sure: 0 });

    // ════════════ Ses (kısa tınılar) ════════════
    const tone = (f, d, type, vol, when) => { if (save.ses) EduKit.tone(f, d, type || 'triangle', vol || 0.06, when || 0); };
    const Sfx = {
        zipla: () => { tone(440, 0.08, 'square', 0.035); tone(660, 0.07, 'square', 0.03, 0.04); },
        yildiz: () => { tone(988, 0.08, 'triangle', 0.07); tone(1319, 0.12, 'triangle', 0.07, 0.07); tone(1760, 0.16, 'triangle', 0.06, 0.14); },
        bayrak: () => { tone(523, 0.1); tone(784, 0.16, 'triangle', 0.06, 0.08); },
        pof: () => { tone(330, 0.12, 'sine', 0.08); tone(220, 0.18, 'sine', 0.07, 0.06); },
        bitis: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, i * 0.09)),
        yay: () => { tone(392, 0.06, 'square', 0.04); tone(784, 0.14, 'triangle', 0.05, 0.03); },
    };

    // ════════════ Tuval ════════════
    const cv = $('#oyun');
    const g = cv.getContext('2d');
    const LOW = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    let W = 0, H = 0, DPR = 1, SC = 40;
    const VIEW_W = 19, VIEW_H = 11;          // en az bu kadar karo görünür
    const VIEW_H_DOKUN = 9;                   // dokunmatik düzende alt şerit yer kapladığı için biraz daha yakın kamera
    // Dokunmatik düzen: düğmeler ekranın altında kendi şeritlerinde durur; oyun dünyası bu şeridin ÜSTÜNE
    // yerleştirilir (kamera tabanı şeridin üst kenarı). Böylece top, zemin ve ileride gelenler düğmelerin altında kalmaz.
    let BAND = 0;                             // alt şerit yüksekliği (canvas pikseli); klavye düzeninde 0
    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2);
        W = Math.max(1, Math.floor(cv.clientWidth * DPR));
        H = Math.max(1, Math.floor(cv.clientHeight * DPR));
        cv.width = W; cv.height = H;
        measureBand();
    }
    function measureBand() {
        const pad = $('#dokunmatik');
        if (!pad || pad.hidden) BAND = 0;
        else {
            let top = Infinity;
            pad.querySelectorAll('.tus').forEach(b => { top = Math.min(top, b.getBoundingClientRect().top); });
            BAND = isFinite(top) ? Math.max(0, Math.min(H * 0.4, H - Math.floor((top - 8) * DPR))) : 0;
        }
        SC = Math.min(W / VIEW_W, (H - BAND) / (BAND ? VIEW_H_DOKUN : VIEW_H));
    }
    window.addEventListener('resize', resize);
    resize();
    let camX = 0, camY = 0;              // görünen oyun alanının sol-alt köşesinin dünya koordinatı
    const sx = (x) => (x - camX) * SC;
    const sy = (y) => H - BAND - (y - camY) * SC;

    // ════════════ Oyun durumu ════════════
    let G = null;
    let particles = [];
    const input = { l: false, r: false, j: false };

    function startLevel(data, fromSave) {
        const L = P.prepare(data);
        G = { data, L, st: P.createState(L), prev: null, phase: 'play', deadT: 0, attempts: 1, time: 0, roll: 0, blink: 0, best: null };
        G.prev = { x: G.st.x, y: G.st.y };
        particles = [];
        acc = 0;
        hideAll();
        $('#hud').hidden = false;
        $('#dokunmatik').hidden = !showTouch;
        measureBand();
        camX = G.st.x - (W / SC) * 0.4; camY = Math.max(0, G.st.y - ((H - BAND) / SC) * 0.35);
        updateHud(true);
        void fromSave;
    }

    function respawn(fromStart) {
        const st = fromStart ? P.createState(G.L) : P.spawnAt(G.L, G.st);
        if (fromStart) G.time = 0;
        G.st = st; G.prev = { x: st.x, y: st.y }; G.phase = 'play'; G.attempts++;
        updateHud(true);
    }

    function burst(x, y, col, n, sp) {
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + i * 0.37, v = sp * (0.4 + ((i * 7919) % 100) / 160);
            particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 2, life: 0.7, col, s: 0.12 + (i % 3) * 0.05 });
        }
    }

    function handleEvents() {
        const st = G.st;
        for (const e of st.ev) {
            if (e === 'jump') Sfx.zipla();
            else if (e === 'spring') Sfx.yay();
            else if (e === 'star') { Sfx.yildiz(); burst(st.x, st.y, '#ffd23f', 16, 5); updateHud(true); }
            else if (e === 'cp') { Sfx.bayrak(); burst(st.x, st.y + 0.5, '#7cfc9a', 10, 4); }
            else if (e === 'dead') { G.phase = 'dead'; G.deadT = 0.6; Sfx.pof(); burst(st.x, st.y, '#ffb020', 18, 6); burst(st.x, st.y, '#ffe680', 10, 3); }
            else if (e === 'done') finish();
        }
        st.ev.length = 0;
    }

    function finish() {
        G.phase = 'done';
        Sfx.bitis();
        burst(G.st.x, G.st.y + 1, '#ff8a1e', 30, 7);
        const r = rec(G.data.id);
        r.bitti = 1;
        G.st.stars.forEach(n => { if (r.yildiz.indexOf(n) < 0) r.yildiz.push(n); });
        const t = Math.round(G.time * 10) / 10;
        if (!r.sure || t < r.sure) r.sure = t;
        writeSave();
        setTimeout(showResult, 900);
    }

    // ════════════ Döngü ════════════
    let acc = 0, last = 0;
    function frame(ts) {
        requestAnimationFrame(frame);
        const now = ts / 1000;
        let dt = now - (last || now); last = now;
        if (dt > 0.1) dt = 0.1;
        if (G) {
            if (G.phase === 'play') {
                acc += dt;
                while (acc >= STEP && G.phase === 'play') {
                    G.prev = { x: G.st.x, y: G.st.y };
                    P.step(G.st, G.L, bot ? botInput() : input);
                    G.time += STEP;
                    handleEvents();
                    acc -= STEP;
                }
            } else if (G.phase === 'dead') {
                G.deadT -= dt;
                if (G.deadT <= 0) respawn(false);
            }
            if (G.phase !== 'paused') updateHud(false);
        }
        for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 14 * dt; p.life -= dt; }
        particles = particles.filter(p => p.life > 0);
        draw(G && G.phase === 'play' ? acc / STEP : 1, dt);
    }

    // ════════════ Çizim ════════════
    const TEMA = {
        cayir: { gok1: '#8fd3ff', gok2: '#dff4ff', tepe1: '#a8e07a', tepe2: '#7cc85a', toprak: '#b07a45', toprakKoyu: '#8a5a30', cim: '#4caf50', cimAcik: '#7ed957' },
    };
    function draw(alpha, dt) {
        const tema = TEMA[(G && G.data.tema) || 'cayir'];
        const sky = g.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, tema.gok1); sky.addColorStop(1, tema.gok2);
        g.fillStyle = sky; g.fillRect(0, 0, W, H);
        if (!G) return;
        const st = G.st;
        const bx = G.prev.x + (st.x - G.prev.x) * alpha, by = G.prev.y + (st.y - G.prev.y) * alpha;

        // kamera: yatayda topu %40'ta tut, dikeyde ölü bölge; dünya sınırlarında dur
        const vw = W / SC, vh = (H - BAND) / SC;
        const tx = bx - vw * 0.4;
        let ty = camY;
        if (by - camY > vh * 0.62) ty = by - vh * 0.62;
        if (by - camY < vh * 0.3) ty = by - vh * 0.3;
        const k = Math.min(1, dt * 8);
        camX += (tx - camX) * k; camY += (ty - camY) * k;
        camX = Math.max(-0.5, Math.min(G.L.W - vw + 0.5, camX));
        camY = Math.max(0, Math.min(Math.max(0, G.L.H - vh + 1), camY));   // en alt satır ekranın altına oturur

        // paralaks tepeler + bulutlar
        hills(camX * 0.25, tema.tepe1, 0.55, 7);
        hills(camX * 0.5, tema.tepe2, 0.35, 4.5);
        clouds();

        drawTiles(tema);
        drawItems();
        if (G.phase !== 'dead') drawBall(bx, by, dt);
        for (const p of particles) {
            g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
            g.fillStyle = p.col;
            g.beginPath(); g.arc(sx(p.x), sy(p.y), p.s * SC, 0, 7); g.fill();
        }
        g.globalAlpha = 1;
        if (BAND) drawBand();
    }
    // Dokunmatik şerit: dünyanın alt devamı soluk görünür (çukurlar okunur) ama dikkat oyun alanında kalır.
    function drawBand() {
        const y = H - BAND;
        const grad = g.createLinearGradient(0, y, 0, H);
        grad.addColorStop(0, 'rgba(31,58,77,0.55)'); grad.addColorStop(1, 'rgba(31,58,77,0.78)');
        g.fillStyle = grad; g.fillRect(0, y, W, BAND);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, y, W, Math.max(1, DPR));
    }
    function hills(off, col, amp, per) {
        g.fillStyle = col;
        g.beginPath(); g.moveTo(0, H);
        for (let i = 0; i <= 48; i++) {
            const xs = (i / 48) * W, wx = xs / SC + off;
            const h = (Math.sin(wx / per) * 0.5 + 0.5) * amp * 6 + 1.5 + Math.sin(wx / (per * 0.37)) * 0.4;
            g.lineTo(xs, H - (h + 0.5) * SC * 0.9);
        }
        g.lineTo(W, H); g.closePath(); g.fill();
    }
    function clouds() {
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = -1; i < 6; i++) {
            const base = Math.floor(camX * 0.15 / 12) + i;
            const x = (base * 12 - camX * 0.15) * SC, y = H * (0.12 + ((base * 37) % 5) * 0.04);
            const r = SC * 0.7;
            g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r, y - r * 0.4, r * 0.9, 0, 7); g.arc(x + r * 2, y, r * 0.8, 0, 7); g.fill();
        }
    }
    function drawTiles(tema) {
        const L = G.L, rows = L.level.harita, Hh = rows.length;
        const x0 = Math.max(0, Math.floor(camX) - 1), x1 = Math.min(L.W, Math.ceil(camX + W / SC) + 1);
        const y0 = Math.max(0, Math.floor(camY - BAND / SC) - 1), y1 = Math.min(Hh, Math.ceil(camY + H / SC) + 1);
        g.fillStyle = tema.toprak;
        for (let cy = y0; cy < y1; cy++) {
            const row = rows[Hh - 1 - cy] || '';
            for (let cx = x0; cx < x1; cx++) {
                const sh = P.SHAPES[row[cx]];
                if (!sh) continue;
                g.beginPath();
                sh.forEach(([px, py], i) => { const X = sx(cx + px), Y = sy(cy + py); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
                g.closePath(); g.fill();
                g.strokeStyle = tema.toprak; g.lineWidth = 1.2; g.stroke();     // karo dikişlerinde ince boşluk kalmasın
                // toprak dokusu: küçük taşlar
                if (((cx * 73 + cy * 37) % 7) === 0) { g.fillStyle = tema.toprakKoyu; g.beginPath(); g.arc(sx(cx + 0.35), sy(cy + 0.35), SC * 0.08, 0, 7); g.fill(); g.fillStyle = tema.toprak; }
            }
        }
        // dış kenarlar: üst yüzeyler çim, diğerleri koyu çizgi
        for (const s of L.segs) {
            if (Math.max(s.ax, s.bx) < x0 || Math.min(s.ax, s.bx) > x1) continue;
            g.beginPath(); g.moveTo(sx(s.ax), sy(s.ay)); g.lineTo(sx(s.bx), sy(s.by));
            if (s.ny > 0.5) {
                g.strokeStyle = tema.cim; g.lineWidth = SC * 0.26; g.lineCap = 'round'; g.stroke();
                g.strokeStyle = tema.cimAcik; g.lineWidth = SC * 0.08; g.stroke();
            } else { g.strokeStyle = tema.toprakKoyu; g.lineWidth = Math.max(1, SC * 0.05); g.lineCap = 'butt'; g.stroke(); }
        }
        g.lineCap = 'butt';
    }
    function star(x, y, r, rot) {
        g.beginPath();
        for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        g.closePath();
    }
    function drawItems() {
        const L = G.L, t = performance.now() / 1000, old = (save.b[G.data.id] || {}).yildiz || [];
        for (const s of L.stars) {
            if (G.st.stars.indexOf(s.no) >= 0) continue;
            const X = sx(s.x), Y = sy(s.y + Math.sin(t * 2 + s.x) * 0.08);
            star(X, Y, SC * 0.38, Math.sin(t * 1.5 + s.no) * 0.25);
            g.fillStyle = old.indexOf(s.no) >= 0 ? '#ffe9a6' : '#ffd23f'; g.fill();
            g.lineWidth = SC * 0.06; g.strokeStyle = '#b37400'; g.stroke();
        }
        for (const s of L.spikes) {
            g.beginPath();
            const up = s[1] % 1 === 0;
            const cx0 = Math.floor(s[0]);
            if (up) { g.moveTo(sx(cx0 + 0.05), sy(s[1])); g.lineTo(sx(cx0 + 0.5), sy(s[1] + 0.85)); g.lineTo(sx(cx0 + 0.95), sy(s[1])); }
            else { const top = Math.floor(s[1]) + 1; g.moveTo(sx(cx0 + 0.05), sy(top)); g.lineTo(sx(cx0 + 0.5), sy(top - 0.85)); g.lineTo(sx(cx0 + 0.95), sy(top)); }
            g.closePath(); g.fillStyle = '#e8edf2'; g.fill(); g.lineWidth = SC * 0.06; g.strokeStyle = '#c0392b'; g.stroke();
        }
        L.cps.forEach((c, i) => {
            const on = G.st.cp >= i;
            const X = sx(c.x), Y = sy(c.y);
            g.strokeStyle = '#5a4a3a'; g.lineWidth = SC * 0.08; g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Y - SC * 1.6); g.stroke();
            g.fillStyle = on ? '#4caf50' : '#d6dde3';
            g.beginPath(); g.moveTo(X, Y - SC * 1.6); g.lineTo(X + SC * 0.8, Y - SC * 1.35); g.lineTo(X, Y - SC * 1.1); g.closePath(); g.fill();
        });
        const f = L.finish;
        const fx = sx(f[0] + 0.5), fy = sy(f[1]);
        g.strokeStyle = '#5a4a3a'; g.lineWidth = SC * 0.1; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - SC * 2.6); g.stroke();
        const wave = Math.sin(t * 4) * SC * 0.06;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
            g.fillStyle = (i + j) % 2 ? '#1f3a4d' : '#ffffff';
            g.fillRect(fx + i * SC * 0.33, fy - SC * 2.6 + j * SC * 0.33 + wave * (i / 2), SC * 0.34, SC * 0.34);
        }
    }
    function drawBall(x, y, dt) {
        const st = G.st, r = K.R * 1.08 * SC;
        G.roll -= st.vx * dt / K.R;
        G.blink -= dt; if (G.blink < -3.2) G.blink = 0.15;
        const X = sx(x), Y = sy(y);
        // gölge
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.beginPath(); g.ellipse(X, Y + r * 0.95, r * 0.8, r * 0.18, 0, 0, 7); g.fill();
        // gövde
        const grd = g.createRadialGradient(X - r * 0.35, Y - r * 0.4, r * 0.1, X, Y, r);
        grd.addColorStop(0, '#ffe08a'); grd.addColorStop(0.55, '#ffa62b'); grd.addColorStop(1, '#e8730c');
        g.fillStyle = grd; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill();
        g.lineWidth = Math.max(2, SC * 0.06); g.strokeStyle = '#a84f00'; g.stroke();
        // dönen desen (yuvarlanma hissi)
        g.save(); g.beginPath(); g.arc(X, Y, r * 0.96, 0, 7); g.clip();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = r * 0.16;
        for (let i = 0; i < 3; i++) { const a = G.roll + i * 2.09; g.beginPath(); g.arc(X + Math.cos(a) * r * 0.62, Y + Math.sin(a) * r * 0.62, r * 0.14, 0, 7); g.stroke(); }
        g.restore();
        // gözler: yöne bakar, zıplarken büyür
        const look = Math.max(-1, Math.min(1, st.vx / 4));
        const big = st.ground ? 1 : 1.15;
        const ex = X + look * r * 0.22, ey = Y - r * 0.18;
        for (const side of [-1, 1]) {
            const ox = ex + side * r * 0.3;
            g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ox, ey, r * 0.2 * big, r * (G.blink > 0 ? 0.04 : 0.26) * big, 0, 0, 7); g.fill();
            if (G.blink <= 0) { g.fillStyle = '#1f3a4d'; g.beginPath(); g.arc(ox + look * r * 0.07, ey + r * 0.04, r * 0.11 * big, 0, 7); g.fill(); }
        }
    }

    // ════════════ HUD ════════════
    let hudKey = '';
    function updateHud(force) {
        if (!G) return;
        const n = G.st.stars.length;
        const k = n + '|' + Math.floor(G.time * 10);
        if (!force && k === hudKey) return;
        hudKey = k;
        $('#hud-bolum').textContent = G.data.sira + '. ' + G.data.ad;
        $('#hud-yildiz').textContent = '★'.repeat(n) + '☆'.repeat(Math.max(0, G.L.stars.length - n));
        $('#hud-sure').textContent = G.time.toFixed(1).replace('.', ',') + ' sn';
    }

    // ════════════ Ekranlar ════════════
    function hideAll() { ['#menu', '#duraklat', '#sonuc'].forEach(s => { $(s).hidden = true; }); }
    const DUNYA = { 1: 'Dünya 1 · Çayır Tepeleri', 2: 'Dünya 2 · Oyuncak Fabrikası', 3: 'Dünya 3 · Büyük Orman' };
    function worldOpen(w) {
        if (w === 1) return true;
        const lastPrev = LV.bolumler.filter(b => b.dunya === w - 1).slice(-1)[0];
        return !!(lastPrev && lastPrev.sira === 10 * (w - 1) && save.b[lastPrev.id] && save.b[lastPrev.id].bitti);
    }
    function showMenu() {
        G = null; hideAll();
        $('#hud').hidden = true; $('#dokunmatik').hidden = true;
        const box = $('#dunyalar'); box.textContent = '';
        [1, 2, 3].forEach(w => {
            const list = LV.bolumler.filter(b => b.dunya === w);
            const open = worldOpen(w);
            const sec = document.createElement('div'); sec.className = 'dunya' + (open ? '' : ' kilitli');
            const h = document.createElement('h2'); h.textContent = DUNYA[w] + (open ? '' : ' 🔒'); sec.appendChild(h);
            const grid = document.createElement('div'); grid.className = 'izgara';
            if (!list.length) { const p = document.createElement('p'); p.className = 'alt'; p.textContent = 'Yakında'; sec.appendChild(p); }
            list.forEach(d => {
                const r = save.b[d.id];
                const b = document.createElement('button'); b.type = 'button'; b.className = 'bolum' + (r && r.bitti ? ' bitti' : '');
                const num = document.createElement('b'); num.textContent = d.sira;
                const ad = document.createElement('small'); ad.textContent = d.ad;
                const yz = document.createElement('span'); yz.className = 'yz';
                const got = r ? r.yildiz.length : 0; yz.textContent = '★'.repeat(got) + '☆'.repeat(3 - got);
                b.append(num, ad, yz);
                b.setAttribute('aria-label', `${d.sira}. bölüm: ${d.ad}, ${got} / 3 yıldız` + (open ? '' : ', kilitli'));
                if (!open) b.disabled = true;
                b.addEventListener('click', () => { EduKit.audio.init(); startLevel(d); });
                grid.appendChild(b);
            });
            sec.appendChild(grid); box.appendChild(sec);
        });
        $('#menu').hidden = false;
    }
    function btn(txt, main, fn) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'dugme' + (main ? ' dugme-ana' : ''); b.textContent = txt;
        b.addEventListener('click', fn); return b;
    }
    function showResult() {
        if (!G) return;
        hideAll(); $('#dokunmatik').hidden = true; measureBand();
        const d = G.data, n = G.st.stars.length, total = G.L.stars.length;
        const ys = $('#sonuc-yildiz'); ys.textContent = '';
        for (let i = 0; i < total; i++) { const s = document.createElement('span'); s.textContent = '★'; if (i >= n) s.className = 'bos'; ys.appendChild(s); }
        const t = G.time;
        const medal = t <= d.par && n === total ? 'Altın' : n === total ? 'Gümüş' : 'Bronz';
        $('#sonuc-govde').textContent = `${d.ad} · ${t.toFixed(1).replace('.', ',')} sn · ${G.attempts}. deneme · ${medal} madalya`;
        $('#sonuc-baslik').textContent = n === total ? 'Harika!' : 'Bölüm tamam!';
        const btns = $('#sonuc-dugmeler'); btns.textContent = '';
        const idx = LV.bolumler.indexOf(d), next = LV.bolumler[idx + 1];
        if (next && worldOpen(next.dunya)) btns.appendChild(btn('Sonraki bölüm', true, () => startLevel(next)));
        btns.appendChild(btn('Tekrar', !next, () => startLevel(d)));
        btns.appendChild(btn('Bölümler', false, showMenu));
        $('#sonuc').hidden = false;
        const f = btns.querySelector('button'); if (f) f.focus();
    }
    function pause() {
        if (!G || G.phase === 'done' || G.phase === 'paused') return;
        G.before = G.phase; G.phase = 'paused';
        input.l = input.r = input.j = false;
        $('#duraklat').hidden = false; $('#btn-devam').focus();
    }
    function resume() { if (!G || G.phase !== 'paused') return; $('#duraklat').hidden = true; G.phase = G.before || 'play'; acc = 0; }

    // ════════════ Girdi ════════════
    const KEYS = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'j', KeyW: 'j', Space: 'j' };
    document.addEventListener('keydown', (e) => {
        if (e.target && e.target.tagName === 'INPUT') return;
        const k = KEYS[e.code];
        if (k && G && G.phase !== 'paused' && !(e.target && e.target.closest && e.target.closest('.ekran'))) { input[k] = true; e.preventDefault(); return; }
        if (e.code === 'Escape' || e.code === 'KeyP') { if (G && G.phase === 'paused') resume(); else pause(); }
        else if (e.code === 'KeyR' && G && G.phase === 'play') { G.st.dead = true; respawn(false); }
        else if (e.code === 'KeyM') toggleSound();
    });
    document.addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) input[k] = false; });
    window.addEventListener('blur', () => { input.l = input.r = input.j = false; });

    // dokunmatik düğmeler: her düğme kendi parmaklarını izler (çoklu dokunma; düğmeden kayan parmak bırakılmış sayılır)
    const showTouch = LOW || ('ontouchstart' in window);
    const held = { l: new Set(), r: new Set(), j: new Set() };
    document.querySelectorAll('.tus').forEach(b => {
        const k = b.dataset.tus;
        const down = (e) => { e.preventDefault(); EduKit.audio.unlock(); held[k].add(e.pointerId); input[k] = true; b.classList.add('basili'); try { b.releasePointerCapture(e.pointerId); } catch (x) { /* yok */ } };
        const up = (e) => { held[k].delete(e.pointerId); if (!held[k].size) { input[k] = false; b.classList.remove('basili'); } };
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    document.addEventListener('contextmenu', (e) => { if (!(e.target.closest && e.target.closest('.ekran'))) e.preventDefault(); });

    function toggleSound() {
        save.ses = !save.ses; writeSave();
        $('#btn-ses').setAttribute('aria-pressed', String(!save.ses));
        $('#btn-ses').setAttribute('aria-label', save.ses ? 'Sesi kapat' : 'Sesi aç');
    }
    function toggleFull() {
        const d = document, el = d.documentElement;
        try {
            if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
            const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
            if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e2) { /* yok */ } }).catch(() => {});
        } catch (e) { /* desteklenmiyor */ }
    }
    if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) $('#btn-tam').hidden = true;
    $('#btn-tam').addEventListener('click', toggleFull);
    $('#btn-ses').addEventListener('click', toggleSound);
    $('#btn-ses').setAttribute('aria-pressed', String(!save.ses));
    $('#btn-duraklat').addEventListener('click', pause);
    $('#btn-devam').addEventListener('click', resume);
    $('#btn-cp').addEventListener('click', () => { if (!G) return; $('#duraklat').hidden = true; respawn(false); });
    $('#btn-bastan').addEventListener('click', () => { if (G) startLevel(G.data); });
    $('#btn-menu').addEventListener('click', showMenu);
    EduKit.onHidden(() => { input.l = input.r = input.j = false; pause(); });

    // test kancası: botun girdi kaydını oynat (geliştirme / duman testi)
    let bot = null;
    function botInput() { const a = bot.path[Math.floor(G.st.step / bot.D)]; return P.ACTIONS[a === undefined ? 2 : a]; }
    window.__pitir = {
        get G() { return G; },
        play: (id) => { const d = LV.bolumler.find(b => b.id === id); if (d) startLevel(d); },
        bot: (on) => { bot = on && G ? P.solve(G.L) : null; if (bot) { G.st = P.createState(G.L); G.time = 0; } return !!bot; },
    };

    showMenu();
    requestAnimationFrame(frame);
})();
