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
        isin: () => { [330, 392, 494, 587, 698, 831].forEach((f, i) => tone(f, 0.12, 'sine', 0.045, i * 0.12)); },
        yildizSay: (i) => { tone(1047 * Math.pow(1.19, i), 0.14, 'triangle', 0.07); tone(1568 * Math.pow(1.19, i), 0.18, 'sine', 0.04, 0.05); },
        dugme: () => { tone(660, 0.07, 'square', 0.04); tone(990, 0.12, 'triangle', 0.05, 0.06); },
        yay: () => { tone(392, 0.06, 'square', 0.04); tone(784, 0.14, 'triangle', 0.05, 0.03); },
    };

    // ════════════ Tuval ════════════
    const cv = $('#oyun');
    const g = cv.getContext('2d');
    const LOW = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    let W = 0, H = 0, DPR = 1, SC = 40;
    // Kamera yakınlaşması: SC0 en geniş görüş (VIEW_W × VIEW_H karo), ZOOM çarpanı 1 (geniş) … ZOOM_YAKIN (yakın).
    // Top yavaşken yakın; hızlandıkça ve havada kaldıkça uzaklaşır, böylece önü ve iniş yeri görünür.
    let SC0 = 40, ZOOM = 1.5;
    const ZOOM_YAKIN = 1.5;
    const VIEW_W = 19, VIEW_H = 11;          // en az bu kadar karo görünür
    const VIEW_H_DOKUN = 9;                   // dokunmatik düzende alt şerit yer kapladığı için biraz daha yakın kamera
    // Dokunmatik düzen: düğmeler ekranın altında kendi şeritlerinde durur; oyun dünyası bu şeridin ÜSTÜNE
    // yerleştirilir (kamera tabanı şeridin üst kenarı). Böylece top, zemin ve ileride gelenler düğmelerin altında kalmaz.
    let BAND = 0;                             // alt şerit yüksekliği (canvas pikseli); klavye düzeninde 0
    // dokunmatik düğme durumu (algılama kodu aşağıda, 'Dokunmatik düğmeler')
    const TUSLAR = [...document.querySelectorAll('.tus')].map(el => ({ el, k: el.dataset.tus, r: null }));
    const parmak = new Map();                 // pointerId → düğme anahtarı ('l' | 'r' | 'j' | null)
    const mandal = { l: false, r: false, j: false };
    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2);
        W = Math.max(1, Math.floor(cv.clientWidth * DPR));
        H = Math.max(1, Math.floor(cv.clientHeight * DPR));
        cv.width = W; cv.height = H;
        measureBand();
        if (TUSLAR.length) olcTuslar();
    }
    function measureBand() {
        const pad = $('#dokunmatik');
        if (!pad || pad.hidden) BAND = 0;
        else {
            let top = Infinity;
            pad.querySelectorAll('.tus').forEach(b => { top = Math.min(top, b.getBoundingClientRect().top); });
            if (TUSLAR.length) olcTuslar();
            BAND = isFinite(top) ? Math.max(0, Math.min(H * 0.4, H - Math.floor((top - 8) * DPR))) : 0;
        }
        SC0 = Math.min(W / VIEW_W, (H - BAND) / (BAND ? VIEW_H_DOKUN : VIEW_H));
        SC = SC0 * ZOOM;
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
        ZOOM = ZOOM_YAKIN; G.air = 0; measureBand();
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
            else if (e === 'btn') Sfx.dugme();
            else if (e === 'star') { Sfx.yildiz(); burst(st.x, st.y, '#ffc83d', 16, 5); updateHud(true); }
            else if (e === 'cp') { Sfx.bayrak(); burst(st.x, st.y + 0.5, '#20c997', 10, 4); }
            else if (e === 'dead') { G.phase = 'dead'; G.deadT = 0.6; Sfx.pof(); burst(st.x, st.y, '#ffb020', 18, 6); burst(st.x, st.y, '#ffe680', 10, 3); }
            else if (e === 'done') finish();
        }
        st.ev.length = 0;
    }

    // Bitiş: top ışınlanma kapısının merkezine çekilir, dönerek küçülür (0–0,9 sn); kapı parlar ve yıldız
    // tozuyla patlar (0,9 sn); ardından sonuç kartı gelir. Azaltılmış harekette çekilme yok, kısa bir soluş var.
    const REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const W_CEK = REDUCE ? 0.35 : 0.9, W_SONUC = REDUCE ? 0.7 : 1.7;
    const easeInOut = (p) => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    function portalCenter() { const f = G.L.finish; return { x: f[0] + 0.5, y: f[1] + 1.35 }; }
    function warpPos() {
        const w = G.warp, c = portalCenter();
        const p = easeInOut(Math.min(1, w.t / W_CEK));
        if (REDUCE) return { x: w.x0, y: w.y0, s: 1, a: 1 - Math.min(1, w.t / W_CEK), p };
        return { x: w.x0 + (c.x - w.x0) * p, y: w.y0 + (c.y - w.y0) * p + Math.sin(Math.PI * p) * 0.5, s: Math.max(0, 1 - 0.92 * p * p), a: 1, p };
    }
    function stepWarp(dt) {
        const w = G.warp; if (!w) return;
        w.t += dt;
        if (!w.flash && w.t >= W_CEK) {
            w.flash = true;
            const c = portalCenter();
            Sfx.bitis();
            if (!REDUCE) { burst(c.x, c.y, '#1fb6d8', 28, 8); burst(c.x, c.y, '#ffc83d', 22, 6); burst(c.x, c.y, '#ffffff', 14, 4); }
        }
        if (!w.shown && w.t >= W_SONUC) { w.shown = true; showResult(); }
    }
    function finish() {
        G.phase = 'done';
        G.warp = { t: 0, x0: G.st.x, y0: G.st.y, flash: false, shown: false };
        Sfx.isin();
        const r = rec(G.data.id);
        r.bitti = 1;
        G.st.stars.forEach(n => { if (r.yildiz.indexOf(n) < 0) r.yildiz.push(n); });
        const t = Math.round(G.time * 10) / 10;
        if (!r.sure || t < r.sure) r.sure = t;
        writeSave();
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
                    P.step(G.st, G.L, bot ? botInput() : adimGirdisi());
                    G.time += STEP;
                    handleEvents();
                    acc -= STEP;
                }
            } else if (G.phase === 'done') {
                stepWarp(dt);
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

    // ════════════ Çizim — "Aydınlık uzay istasyonu" ════════════
    // Gündüz yörüngesi: açık gök, büyük şeftali gezegen, uzakta istasyon modülleri. Zemin beyaz-gümüş paneller,
    // üst yüzeyler camgöbeği ışık şeridi. Tehlike = turuncu-kırmızı, toplanacak = altın, ilerleme = camgöbeği/yeşil.
    const TEMA = {
        istasyon: {
            gok1: '#c9d7f0', gok2: '#eef3fa',
            gezegen1: '#ffe2c4', gezegen2: '#f2a774', halka: 'rgba(255,255,255,0.75)',
            modulUzak: '#d5deee', modulYakin: '#c2cee2', pencere: '#ffffff', isik: '#ff8a2a',
            panel: '#f5f8fc', panelDikis: '#d9e1ec', menfez: '#c7d2e2',
            serit: '#1fb6d8', seritAcik: '#c4f3ff', kenar: '#9fb0c6',
            murekkep: '#1b2a3d',
        },
    };
    TEMA.cayir = TEMA.istasyon;          // Dünya 1 bölümleri bu temayı kullanır
    function draw(alpha, dt) {
        const tema = TEMA[(G && G.data.tema) || 'istasyon'] || TEMA.istasyon;
        const sky = g.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, tema.gok1); sky.addColorStop(1, tema.gok2);
        g.fillStyle = sky; g.fillRect(0, 0, W, H);
        if (!G) return;
        const st = G.st;
        const wp = G.phase === 'done' && G.warp ? warpPos() : null;
        const bx = wp ? wp.x : G.prev.x + (st.x - G.prev.x) * alpha, by = wp ? wp.y : G.prev.y + (st.y - G.prev.y) * alpha;

        // yakınlaşma: hız ve havada kalma süresi uzaklaştırır; uzaklaşma hızlı, yakınlaşma yavaş (pompalama olmasın)
        G.air = st.ground ? 0 : (G.air || 0) + dt;
        const hiz = Math.min(1, Math.hypot(st.vx, st.vy) / K.MAX_RUN);
        const f = Math.min(1, 0.45 * hiz + 0.5 * Math.min(1, Math.max(0, G.air - 0.12) / 0.35));   // kısa sekmeler sayılmaz
        const zt = wp && !REDUCE ? 1.8 : ZOOM_YAKIN - (ZOOM_YAKIN - 1) * f;   // ışınlanırken kapıya yaklaş
        ZOOM += (zt - ZOOM) * Math.min(1, dt * (zt < ZOOM ? 3 : 1.2));
        const scOld = SC; SC = SC0 * ZOOM;
        camX = bx - (bx - camX) * scOld / SC; camY = by - (by - camY) * scOld / SC;   // top ekranda yerinde kalsın
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

        // arka plan: gezegen (çok yavaş), toz parıltıları, iki kat istasyon modülü
        planet(tema);
        motes();
        modules(camX * 0.2, tema.modulUzak, 0.55, 9, tema);
        modules(camX * 0.45, tema.modulYakin, 0.32, 6, tema);

        drawTiles(tema);
        drawItems(tema);
        drawDyn(tema, performance.now() / 1000);
        if (wp) drawWarp(bx, by, wp, dt, tema);
        else if (G.phase !== 'dead') drawBall(bx, by, dt, tema);
        for (const p of particles) {
            g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
            g.fillStyle = p.col;
            g.beginPath(); g.arc(sx(p.x), sy(p.y), p.s * SC, 0, 7); g.fill();
        }
        g.globalAlpha = 1;
        if (BAND) drawBand(tema);
    }
    // Dokunmatik şerit: kontrol konsolu. Dünyanın alt devamı soluk görünür (çukurlar okunur).
    function drawBand(tema) {
        const y = H - BAND;
        g.globalAlpha = 0.82; g.fillStyle = tema.murekkep; g.fillRect(0, y, W, BAND); g.globalAlpha = 1;
        g.fillStyle = tema.serit; g.fillRect(0, y, W, Math.max(1, DPR * 1.5));
    }
    function planet(tema) {
        const r = Math.min(W, H) * 0.42;
        const X = W * 0.8 - camX * 0.04 * SC, Y = H * 0.24;
        const grd = g.createRadialGradient(X - r * 0.35, Y - r * 0.35, r * 0.1, X, Y, r);
        grd.addColorStop(0, tema.gezegen1); grd.addColorStop(1, tema.gezegen2);
        g.globalAlpha = 0.85;
        g.fillStyle = grd; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill();
        g.save(); g.beginPath(); g.arc(X, Y, r, 0, 7); g.clip();          // bulut kuşakları
        g.fillStyle = 'rgba(255,255,255,0.22)';
        for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(X, Y - r * 0.45 + i * r * 0.42, r * 1.1, r * 0.07, -0.18, 0, 7); g.fill(); }
        g.restore();
        g.strokeStyle = tema.halka; g.lineWidth = r * 0.05;                  // halka (önden geçen yarı)
        g.beginPath(); g.ellipse(X, Y, r * 1.45, r * 0.32, -0.18, 0.15, Math.PI - 0.15); g.stroke();
        g.globalAlpha = 1;
    }
    function motes() {
        const t = performance.now() / 1000, span = W + 40;
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 26; i++) {
            const px = (((i * 197.3 - camX * SC * 0.1 + t * 6 * (1 + i % 3) * DPR) % span) + span) % span - 20;
            const py = H * 0.7 * ((i * 0.6180339) % 1);
            g.beginPath(); g.arc(px, py, (1 + (i % 3) * 0.6) * DPR, 0, 7); g.fill();
        }
    }
    // istasyon modülleri: yuvarlatılmış gövdeler + bağlantı boruları + pencere ışıkları (konumdan türetilir, rastgele değil)
    function modules(off, col, hk, per, tema) {
        const unit = SC, base = H - BAND, deck = hk * unit * 2.2;
        const i0 = Math.floor(off / per) - 1, n = Math.ceil(W / (per * unit)) + 3;
        g.fillStyle = col;
        g.fillRect(0, base - deck, W, deck + BAND);                         // alt güverte
        for (let i = i0; i < i0 + n; i++) {
            const h = (2.5 + (Math.abs(i * 7919) % 5) * 0.9) * hk * 2.4 * unit;
            const w = (2.2 + (Math.abs(i * 104729) % 3) * 0.8) * unit;
            const x = (i * per - off) * unit;
            const y = base - deck - h;
            g.fillStyle = col;
            rr(x, y, w, h + 2, Math.min(w, h) * 0.35); g.fill();
            g.fillRect(x + w - 1, y + h * 0.55, per * unit - w + 2, unit * 0.28);   // boru
            const rows = Math.max(1, Math.floor((h - unit * 0.5) / (unit * 0.9)));
            for (let j = 0; j < rows; j++) {
                const lit = (Math.abs(i * 31 + j * 17) % 6) === 0;
                g.fillStyle = lit ? tema.isik : tema.pencere;
                g.globalAlpha = lit ? 0.55 : 0.45;
                rr(x + w * 0.25, y + unit * 0.45 + j * unit * 0.9, w * 0.5, unit * 0.22, unit * 0.11); g.fill();
            }
            g.globalAlpha = 1;
        }
    }
    function rr(x, y, w, h, r) {
        g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function drawTiles(tema) {
        const L = G.L, rows = L.level.harita, Hh = rows.length;
        const x0 = Math.max(0, Math.floor(camX) - 1), x1 = Math.min(L.W, Math.ceil(camX + W / SC) + 1);
        const y0 = Math.max(0, Math.floor(camY - BAND / SC) - 1), y1 = Math.min(Hh, Math.ceil(camY + H / SC) + 1);
        g.lineWidth = Math.max(1, DPR);
        for (let cy = y0; cy < y1; cy++) {
            const row = rows[Hh - 1 - cy] || '';
            for (let cx = x0; cx < x1; cx++) {
                const sh = P.SHAPES[row[cx]];
                if (!sh) continue;
                g.beginPath();
                sh.forEach(([px, py], i) => { const X = sx(cx + px), Y = sy(cy + py); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
                g.closePath();
                g.fillStyle = tema.panel; g.fill();
                g.strokeStyle = tema.panelDikis; g.stroke();          // panel dikişleri (aynı zamanda karo arası boşlukları kapatır)
                const hsh = (cx * 73 + cy * 37) % 13;
                if (sh.length === 4 && hsh === 0) {                    // menfez
                    g.fillStyle = tema.menfez;
                    for (let v = 0; v < 3; v++) { rr(sx(cx + 0.22), sy(cy + 0.72 - v * 0.2), SC * 0.56, SC * 0.08, SC * 0.04); g.fill(); }
                } else if (sh.length === 4 && hsh === 6) {             // küçük durum ışığı
                    g.fillStyle = tema.isik; g.beginPath(); g.arc(sx(cx + 0.5), sy(cy + 0.5), SC * 0.07, 0, 7); g.fill();
                }
            }
        }
        // dış kenarlar: üst yüzeyler ışık şeridi, diğerleri çelik çizgi
        g.lineCap = 'round';
        for (const s of L.segs) {
            if (Math.max(s.ax, s.bx) < x0 || Math.min(s.ax, s.bx) > x1) continue;
            g.beginPath(); g.moveTo(sx(s.ax), sy(s.ay)); g.lineTo(sx(s.bx), sy(s.by));
            if (s.ny > 0.5) {
                g.strokeStyle = tema.serit; g.lineWidth = SC * 0.2; g.stroke();
                g.strokeStyle = tema.seritAcik; g.lineWidth = SC * 0.06; g.stroke();
            } else { g.strokeStyle = tema.kenar; g.lineWidth = Math.max(1, SC * 0.06); g.stroke(); }
        }
        g.lineCap = 'butt';
    }
    function star(x, y, r, rot) {
        g.beginPath();
        for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
        g.closePath();
    }
    function glow(x, y, r, rgb, a) {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    // Dinamik nesneler: kargo kutusu, yüzen platform, uyarı şeritli düşen panel, basınç düğmesi, enerji kapısı, dikenli temizlik robotu ("kirpi")
    function drawDyn(tema, t) {
        if (!G.L.dyn.any) return;
        const v = P.dynView(G.L, G.st);
        const R = (r) => [sx(r[0]), sy(r[3]), (r[2] - r[0]) * SC, (r[3] - r[1]) * SC];
        // kapılar: tavandaki yuva + kayan enerji paneli
        v.kapi.forEach(k => {
            const [x, y, w, h] = R(k.r);
            const hx = sx(k.x + 0.05), hy = sy(k.y + k.h + 0.25);
            g.fillStyle = tema.kenar; rr(hx, hy, SC * 0.9, SC * 0.3, SC * 0.08); g.fill();
            if (k.acik < 1) {
                g.save(); g.beginPath(); g.rect(sx(k.x - 1), sy(k.y + k.h), SC * 3, k.h * SC); g.clip();
                glow(x + w / 2, y + h / 2, Math.max(w, h) * 0.7, '31,182,216', 0.25 * (1 - k.acik));
                g.fillStyle = '#7fd8ec'; rr(x, y, w, h, SC * 0.12); g.fill();
                g.lineWidth = SC * 0.06; g.strokeStyle = tema.serit; g.stroke();
                g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = SC * 0.05;
                for (let i = 1; i < k.h * 2; i++) { const yy = y + (i / (k.h * 2)) * h; g.beginPath(); g.moveTo(x + w * 0.2, yy); g.lineTo(x + w * 0.8, yy); g.stroke(); }
                g.restore();
            }
        });
        // düğmeler: yuvarlak basınç plakası; basılınca yeşil yanar, "tut" türünde ortada nokta
        v.dugme.forEach(b => {
            const cx = sx(b.x + 0.5), by = sy(b.y), h = b.on ? SC * 0.08 : SC * 0.2;
            g.fillStyle = tema.kenar; rr(cx - SC * 0.46, by - SC * 0.1, SC * 0.92, SC * 0.12, SC * 0.04); g.fill();
            if (b.on) glow(cx, by - SC * 0.1, SC * 0.8, '32,201,151', 0.5);
            g.fillStyle = b.on ? '#20c997' : '#ff7a1a'; rr(cx - SC * 0.36, by - SC * 0.1 - h, SC * 0.72, h + SC * 0.02, SC * 0.06); g.fill();
            if (b.tur === 'tut') { g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, by - SC * 0.1 - h / 2, SC * 0.05, 0, 7); g.fill(); }
        });
        // hareketli platformlar: yüzen panel, altında camgöbeği iticiler
        v.platform.forEach(r => {
            const [x, y, w, h] = R(r);
            for (let i = 0; i < 2; i++) {
                const tx = x + w * (i ? 0.75 : 0.25);
                glow(tx, y + h + SC * 0.1, SC * 0.45, '31,182,216', 0.55 + Math.sin(t * 12 + i) * 0.15);
            }
            g.fillStyle = tema.panel; rr(x, y, w, h, SC * 0.14); g.fill();
            g.lineWidth = SC * 0.05; g.strokeStyle = tema.kenar; g.stroke();
            g.fillStyle = tema.serit; rr(x + SC * 0.06, y, w - SC * 0.12, SC * 0.1, SC * 0.05); g.fill();
        });
        // düşen paneller: sarı-lacivert uyarı şeridi; basınca titrer
        v.duser.forEach(f => {
            if (f.gitti) return;
            let [x, y, w, h] = R(f.r);
            if (f.titre) x += Math.sin(t * 70) * SC * 0.05;
            g.save(); rr(x, y, w, h, SC * 0.1); g.clip();
            g.fillStyle = '#ffc83d'; g.fillRect(x, y, w, h);
            g.fillStyle = tema.murekkep;
            for (let i = -2; i < w / (SC * 0.5) + 2; i++) { const xx = x + i * SC * 0.5; g.beginPath(); g.moveTo(xx, y + h); g.lineTo(xx + SC * 0.25, y + h); g.lineTo(xx + SC * 0.25 + h, y); g.lineTo(xx + h, y); g.fill(); }
            g.restore();
            g.lineWidth = SC * 0.05; g.strokeStyle = tema.murekkep; rr(x, y, w, h, SC * 0.1); g.stroke();
        });
        // kargo kutuları
        v.kutu.forEach(r => {
            const [x, y, w, h] = R(r), c = SC * 0.12;
            g.fillStyle = '#e9eef5'; rr(x, y, w, h, c); g.fill();
            g.fillStyle = '#ff8a2a'; g.fillRect(x + w * 0.08, y + h * 0.4, w * 0.84, h * 0.2);
            g.lineWidth = SC * 0.06; g.strokeStyle = '#5f708a'; rr(x, y, w, h, c); g.stroke();
            g.strokeStyle = '#9fb0c6'; g.lineWidth = SC * 0.04;
            g.beginPath(); g.moveTo(x + w * 0.2, y + h * 0.18); g.lineTo(x + w * 0.8, y + h * 0.18); g.moveTo(x + w * 0.2, y + h * 0.82); g.lineTo(x + w * 0.8, y + h * 0.82); g.stroke();
        });
        // kirpi: dikenli küçük temizlik robotu (dikenler turuncu-kırmızı = tehlike rengi), yürüdüğü yöne bakar
        v.kirpi.forEach(k => {
            const cx = sx(k.x), cy = sy(k.y + 0.42), r = SC * 0.42;
            g.fillStyle = '#e8503a';
            for (let i = 0; i < 9; i++) {
                const a = Math.PI * (0.05 + 0.9 * i / 8) + Math.PI, wob = Math.sin(t * 10 + i) * 0.05;
                const ax = cx + Math.cos(a) * r * 0.8, ay = cy + Math.sin(a) * r * 0.8;
                const tx = cx + Math.cos(a + wob) * r * 1.45, ty = cy + Math.sin(a + wob) * r * 1.45;
                const px = -Math.sin(a) * r * 0.22, py = Math.cos(a) * r * 0.22;
                g.beginPath(); g.moveTo(ax + px, ay + py); g.lineTo(tx, ty); g.lineTo(ax - px, ay - py); g.fill();
            }
            g.fillStyle = '#ff9a3d'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
            g.lineWidth = SC * 0.05; g.strokeStyle = '#a8321f'; g.stroke();
            g.fillStyle = tema.murekkep; rr(cx + k.yon * r * 0.1 - r * 0.55, cy - r * 0.35, r * 1.1, r * 0.5, r * 0.25); g.fill();
            g.fillStyle = '#7ee8ff';
            for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + k.yon * r * 0.25 + s * r * 0.22, cy - r * 0.1, r * 0.1, 0, 7); g.fill(); }
            g.fillStyle = tema.murekkep;
            for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * r * 0.5, cy + r * 0.92, r * 0.18, 0, 7); g.fill(); }
        });
    }
    function drawItems(tema) {
        const L = G.L, t = performance.now() / 1000, old = (save.b[G.data.id] || {}).yildiz || [];
        for (const s of L.stars) {
            if (G.st.stars.indexOf(s.no) >= 0) continue;
            const X = sx(s.x), Y = sy(s.y + Math.sin(t * 2 + s.x) * 0.08);
            glow(X, Y, SC * 0.85, '255,200,61', 0.35 + Math.sin(t * 3 + s.no) * 0.1);
            star(X, Y, SC * 0.38, Math.sin(t * 1.5 + s.no) * 0.25);
            g.fillStyle = old.indexOf(s.no) >= 0 ? '#ffe7a3' : '#ffc83d'; g.fill();
            g.lineWidth = SC * 0.06; g.strokeStyle = '#c98200'; g.stroke();
        }
        for (const s of L.spikes) {
            g.beginPath();
            const up = s[1] % 1 === 0;
            const cx0 = Math.floor(s[0]);
            if (up) { g.moveTo(sx(cx0 + 0.05), sy(s[1])); g.lineTo(sx(cx0 + 0.5), sy(s[1] + 0.85)); g.lineTo(sx(cx0 + 0.95), sy(s[1])); }
            else { const top = Math.floor(s[1]) + 1; g.moveTo(sx(cx0 + 0.05), sy(top)); g.lineTo(sx(cx0 + 0.5), sy(top - 0.85)); g.lineTo(sx(cx0 + 0.95), sy(top)); }
            g.closePath(); g.fillStyle = '#ff6b3d'; g.fill(); g.lineWidth = SC * 0.06; g.strokeStyle = '#b8340f'; g.stroke();
        }
        // checkpoint: işaret kulesi — sönük gri, alınınca yeşil yanar
        L.cps.forEach((c, i) => {
            const on = G.st.cp >= i;
            const X = sx(c.x), Y = sy(c.y);
            g.fillStyle = tema.kenar; rr(X - SC * 0.06, Y - SC * 1.5, SC * 0.12, SC * 1.5, SC * 0.05); g.fill();
            if (on) glow(X, Y - SC * 1.6, SC * 0.9, '32,201,151', 0.45 + Math.sin(t * 4) * 0.1);
            g.fillStyle = on ? '#20c997' : '#c8d2e0';
            g.beginPath(); g.arc(X, Y - SC * 1.6, SC * 0.22, 0, 7); g.fill();
            g.lineWidth = SC * 0.05; g.strokeStyle = tema.murekkep; g.stroke();
        });
        // bitiş: ışınlanma kapısı
        const f = L.finish;
        const fx = sx(f[0] + 0.5), fy = sy(f[1]), cyy = fy - SC * 1.35;
        const wv = G.warp && G.phase === 'done' ? Math.min(1, G.warp.t / 0.9) : 0;   // ışınlanırken kapı parlar
        glow(fx, cyy, SC * (1.9 + wv * 1.2), '31,182,216', 0.3 + wv * 0.4);
        g.fillStyle = 'rgba(196,243,255,0.55)'; g.beginPath(); g.ellipse(fx, cyy, SC * 0.62, SC * 1.15, 0, 0, 7); g.fill();
        g.lineWidth = SC * 0.22; g.strokeStyle = tema.serit; g.stroke();
        g.lineWidth = SC * 0.07; g.strokeStyle = '#ffffff';
        g.setLineDash([SC * 0.3, SC * 0.25]); g.lineDashOffset = -t * SC * 1.2; g.stroke(); g.setLineDash([]);
        g.fillStyle = tema.kenar; rr(fx - SC * 0.8, fy - SC * 0.16, SC * 1.6, SC * 0.2, SC * 0.08); g.fill();
    }
    function drawWarp(x, y, wp, dt, tema) {
        const w = G.warp, c = portalCenter(), CX = sx(c.x), CY = sy(c.y);
        // çekim çizgileri: kapıya doğru dönerek akan ışık
        if (!REDUCE && w.t < W_CEK + 0.2) {
            const k = Math.min(1, w.t / 0.25) * Math.max(0, 1 - Math.max(0, w.t - W_CEK) / 0.2);
            g.lineCap = 'round'; g.lineWidth = SC * 0.07;
            for (let i = 0; i < 12; i++) {
                const a = i / 12 * Math.PI * 2 + w.t * 3, ph = (w.t * 1.6 + i * 0.37) % 1, rad = SC * (2.6 - 2.2 * ph);
                g.strokeStyle = i % 3 ? `rgba(31,182,216,${0.7 * k * ph})` : `rgba(255,200,61,${0.8 * k * ph})`;
                g.beginPath(); g.arc(CX, CY, rad, a, a + 0.5); g.stroke();
            }
            g.lineCap = 'butt';
        }
        // top: dönerek küçülür (azaltılmış harekette yerinde solar)
        if (w.t < W_CEK) {
            if (!REDUCE) G.spin = (G.spin || 0) + dt * 40;
            const X = sx(x), Y = sy(y);
            g.save(); g.globalAlpha = wp.a;
            g.translate(X, Y); g.scale(wp.s, wp.s); g.translate(-X, -Y);
            drawBall(x, y, dt, tema);
            g.restore();
        }
        // kapı patlaması: genişleyen halkalar + beyaz parlama
        if (w.flash && !REDUCE) {
            const e = w.t - W_CEK;
            for (const [d, col, wdt] of [[0, '255,255,255', 0.22], [0.12, '31,182,216', 0.16], [0.24, '255,200,61', 0.12]]) {
                const q = (e - d) / 0.6; if (q <= 0 || q >= 1) continue;
                const ease = 1 - Math.pow(1 - q, 3);
                g.lineWidth = SC * wdt * (1 - q); g.strokeStyle = `rgba(${col},${1 - q})`;
                g.beginPath(); g.ellipse(CX, CY, SC * (0.6 + 3.2 * ease), SC * (1.1 + 2.6 * ease), 0, 0, 7); g.stroke();
            }
            if (e < 0.35) glow(CX, CY, SC * 3.5, '255,255,255', 0.9 * (1 - e / 0.35));
        }
    }
    function drawBall(x, y, dt, tema) {
        const st = G.st, r = K.R * 1.08 * SC;
        // dönüş: yerdeyken yüzey boyunca hız / yarıçap (kaymadan yuvarlanma); havada son dönüş hızı korunur, yavaşça söner.
        // Ekranda pozitif açı saat yönü → sağa giderken saat yönünde döner.
        if (st.ground) G.spin = (st.vx * st.gny - st.vy * st.gnx) / K.R;
        else G.spin = (G.spin || 0) * Math.max(0, 1 - dt * 0.4);
        G.roll += (G.spin || 0) * dt;
        G.blink -= dt; if (G.blink < -3.2) G.blink = 0.15;
        const X = sx(x), Y = sy(y);
        // Pıtır: inci beyazı robot küre. Dönen parçalar (turuncu enerji bandı, lambalar, panel dikişi) yuvarlanmayı
        // gösterir; vizör, LED gözler ve parlama sabittir (ışık kaynağı ve yüz dönmez).
        g.fillStyle = 'rgba(27,42,61,0.16)';
        g.beginPath(); g.ellipse(X, Y + r * 0.97, r * 0.8, r * 0.17, 0, 0, 7); g.fill();
        glow(X, Y, r * 2, '255,138,42', 0.32 + Math.min(0.15, Math.abs(G.spin || 0) * 0.01));
        // kabuk
        const grd = g.createRadialGradient(X - r * 0.38, Y - r * 0.42, r * 0.05, X, Y, r);
        grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.5, '#e6edf6'); grd.addColorStop(1, '#a7b6cb');
        g.fillStyle = grd; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill();
        // dönen parçalar
        g.save(); g.beginPath(); g.arc(X, Y, r * 0.97, 0, 7); g.clip();
        g.translate(X, Y); g.rotate(G.roll);
        g.strokeStyle = 'rgba(95,112,138,0.55)'; g.lineWidth = Math.max(1, r * 0.04);    // panel dikişi (küre üzerinde eğri)
        g.beginPath(); g.ellipse(0, 0, r * 0.42, r, 0, 0, 7); g.stroke();
        g.fillStyle = '#ff8a2a';                                                           // enerji bandı
        g.fillRect(-r, -r * 0.12, r * 2, r * 0.24);
        g.fillStyle = '#ffd7a8'; g.fillRect(-r, -r * 0.035, r * 2, r * 0.07);
        for (const s of [-1, 1]) {                                                         // lambalar
            g.fillStyle = '#ff8a2a'; g.beginPath(); g.arc(0, s * r * 0.7, r * 0.13, 0, 7); g.fill();
            g.fillStyle = '#fff3e0'; g.beginPath(); g.arc(0, s * r * 0.7, r * 0.055, 0, 7); g.fill();
        }
        g.restore();
        g.lineWidth = Math.max(1.5, r * 0.07); g.strokeStyle = '#5f708a';
        g.beginPath(); g.arc(X, Y, r, 0, 7); g.stroke();
        // vizör: yöne doğru kayar
        const look = Math.max(-1, Math.min(1, st.vx / 4));
        const big = st.ground ? 1 : 1.18;
        const vx0 = X + look * r * 0.16, vy0 = Y - r * 0.22, vw = r * 1.3, vh = r * 0.62;
        g.fillStyle = tema.murekkep; rr(vx0 - vw / 2, vy0 - vh / 2, vw, vh, vh / 2); g.fill();
        g.lineWidth = Math.max(1, r * 0.05); g.strokeStyle = '#5f708a'; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.16)'; rr(vx0 - vw / 2 + r * 0.1, vy0 - vh / 2 + r * 0.06, vw * 0.55, vh * 0.28, vh * 0.14); g.fill();
        // LED gözler: camgöbeği; göz kırpınca ince çizgi, havadayken büyür
        for (const side of [-1, 1]) {
            const ox = vx0 + side * r * 0.28 + look * r * 0.06, ew = r * 0.17 * big, eh = (G.blink > 0 ? r * 0.05 : r * 0.3) * big;
            glow(ox, vy0, r * 0.38, '31,182,216', 0.55);
            g.fillStyle = '#7ee8ff'; rr(ox - ew / 2, vy0 - eh / 2, ew, eh, Math.min(ew, eh) / 2); g.fill();
        }
        // parlama (sabit ışık)
        g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(X - r * 0.48, Y + r * 0.3, r * 0.1, r * 0.2, 0.5, 0, 7); g.fill();
    }

    // ════════════ HUD ════════════
    let hudKey = '';
    function updateHud(force) {
        if (!G) return;
        const n = G.st.stars.length;
        const k = n + '|' + Math.floor(G.time * 10);
        if (!force && k === hudKey) return;
        hudKey = k;
        $('#hud-no').textContent = G.data.sira;
        $('#hud-ad').textContent = G.data.ad;
        // yıldız yuvaları: boş yuva soluk; yeni alınan yıldız küçük bir zıplamayla dolar
        const box = $('#hud-yildiz'), total = G.L.stars.length;
        if (box.childElementCount !== total) {
            box.textContent = '';
            for (let i = 0; i < total; i++) {
                const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                sv.setAttribute('viewBox', '0 0 24 24'); sv.setAttribute('class', 'yuva');
                const pa = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pa.setAttribute('d', 'M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z');
                sv.appendChild(pa); box.appendChild(sv);
            }
        }
        const before = G.hudN === undefined ? n : G.hudN;
        Array.from(box.children).forEach((sv, i) => {
            sv.classList.toggle('dolu', i < n);
            if (i < n && i >= before) { sv.classList.remove('pop'); void sv.getBoundingClientRect(); sv.classList.add('pop'); }
        });
        G.hudN = n;
        box.setAttribute('aria-label', 'Toplanan yıldız: ' + n + ' / ' + total);
        $('#hud-sure').textContent = G.time.toFixed(1).replace('.', ',');
    }

    // ════════════ Ekranlar ════════════
    function hideAll() { ['#menu', '#duraklat', '#sonuc'].forEach(s => { $(s).hidden = true; }); }
    const DUNYA = { 1: 'Dünya 1 · Yörünge İstasyonu', 2: 'Dünya 2 · Robot Atölyesi', 3: 'Dünya 3 · Sera Kubbesi' };
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
        for (let i = 0; i < total; i++) {
            const s = document.createElement('span'); s.textContent = '★'; s.className = i < n ? 'gir' : 'bos gir';
            const gec = REDUCE ? 0 : 280 + i * 220;
            s.style.animationDelay = gec + 'ms'; ys.appendChild(s);
            if (i < n) setTimeout(() => { if (!$('#sonuc').hidden) Sfx.yildizSay(i); }, gec);
        }
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
        input.l = input.r = input.j = false; tuslariBirak();
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
    window.addEventListener('blur', () => { input.l = input.r = input.j = false; tuslariBirak(); });

    // Dokunmatik düğmeler — konuma göre algılama. Her parmağın ekrandaki yeri, düğmelerin DURGUN dikdörtgenleriyle
    // (basılınca yapılan 5 px'lik görsel çökme hariç) karşılaştırılır:
    //  • dikdörtgenler 14 px payla genişletilir (küçük parmak tam ortaya basamasa da sayılır);
    //  • basılı tutan parmak düğmeden biraz kayarsa bırakmaz (28 px'e kadar tolerans), titreme zıplamayı kesmez;
    //  • parmak sol düğmeden sağa kaydırılınca yön hemen değişir, kaldırmaya gerek yok.
    // Çok kısa dokunuşlar da kaçmasın diye her basış bir sonraki fizik adımına kadar "mandallanır".
    const showTouch = LOW || ('ontouchstart' in window);
    function olcTuslar() {
        TUSLAR.forEach(t => {
            const el = t.el, par = el.offsetParent; if (!par) { t.r = null; return; }
            const pr = par.getBoundingClientRect();
            t.r = { x: pr.left + el.offsetLeft, y: pr.top + el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
        });
    }
    function tusBul(x, y, onceki) {
        let en = null, enD = Infinity;
        for (const t of TUSLAR) {
            if (!t.r) continue;
            const pay = t.k === onceki ? 28 : 14;
            const dx = Math.max(t.r.x - x, 0, x - (t.r.x + t.r.w)), dy = Math.max(t.r.y - y, 0, y - (t.r.y + t.r.h));
            const d = Math.hypot(dx, dy);
            if (d <= pay && (d < enD || (d === enD && t.k === onceki))) { en = t.k; enD = d; }
        }
        return en;
    }
    function tusGuncelle() {
        const on = { l: false, r: false, j: false };
        parmak.forEach(k => { if (k) on[k] = true; });
        for (const t of TUSLAR) {
            if (on[t.k] && !input[t.k]) mandal[t.k] = true;
            input[t.k] = on[t.k];
            t.el.classList.toggle('basili', on[t.k]);
        }
    }
    const padAcik = () => !$('#dokunmatik').hidden && G && (G.phase === 'play' || G.phase === 'dead');
    function pDown(e) {
        if (!padAcik() || (e.target.closest && e.target.closest('.ikon-dugme, .ekran'))) return;
        if (!TUSLAR[0].r) olcTuslar();
        const k = tusBul(e.clientX, e.clientY, null);
        if (!k) return;
        e.preventDefault(); EduKit.audio.unlock();
        parmak.set(e.pointerId, k); tusGuncelle();
    }
    function pMove(e) {
        if (!parmak.has(e.pointerId)) return;
        const once = parmak.get(e.pointerId), k = tusBul(e.clientX, e.clientY, once);
        if (k !== once) { parmak.set(e.pointerId, k); tusGuncelle(); }
    }
    function pUp(e) { if (parmak.delete(e.pointerId)) tusGuncelle(); }
    document.addEventListener('pointerdown', pDown, { passive: false });
    document.addEventListener('pointermove', pMove, { passive: true });
    document.addEventListener('pointerup', pUp); document.addEventListener('pointercancel', pUp);
    TUSLAR.forEach(t => t.el.addEventListener('contextmenu', (e) => e.preventDefault()));
    function tuslariBirak() { parmak.clear(); mandal.l = mandal.r = mandal.j = false; tusGuncelle(); }
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
    EduKit.onHidden(() => { input.l = input.r = input.j = false; tuslariBirak(); pause(); });

    // test kancası: botun girdi kaydını oynat (geliştirme / duman testi)
    let bot = null;
    // fizik adımının gördüğü girdi: basılı olanlar + son adımdan beri basılıp çoktan bırakılmış kısa dokunuşlar
    const adimG = { l: false, r: false, j: false };
    function adimGirdisi() {
        adimG.l = input.l || mandal.l; adimG.r = input.r || mandal.r; adimG.j = input.j || mandal.j;
        mandal.l = mandal.r = mandal.j = false;
        return adimG;
    }
    function botInput() { const a = bot.path[Math.floor(G.st.step / bot.D)]; return P.ACTIONS[a === undefined ? 2 : a]; }
    window.__pitir = {
        get G() { return G; },
        get zoom() { return ZOOM; },
        play: (id) => { const d = LV.bolumler.find(b => b.id === id); if (d) startLevel(d); },
        bot: (on) => { bot = on && G ? P.solve(G.L) : null; if (bot) { G.st = P.createState(G.L); G.time = 0; } return !!bot; },
    };

    showMenu();
    requestAnimationFrame(frame);
})();
