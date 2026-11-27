/* Obur Delik — 3D çizim (three.js r128), girdi, menü, ses, kayıt. Kurallar ve fizik core.js'te (ObCore, saf).
   Sanat kitabı (craft-game-floors/art-direction):
     Üslup: "Güneşli minyatür şehir — az çokgenli ama gerçek malzemeler (asfalt, çim, cam, tuğla), yumuşak gerçek gölgeler."
     Palet: asfalt #41454c · çim #6aa84f · kaldırım #d6d0c4 · tuğla #b4573f · cam #7fb3d5 · yaprak #3f8a3a · vurgu (delik) #8f6bff.
     Işık: ikindi güneşi güneybatıdan (sıcak #fff0d8), gökten serin dolgu, uzakta hafif pus.
   Delik gerçek bir yer kesiği: delik diski stencil'e yazar, zemin stencil ≠ 1 olan yere çizilir; düşen nesneler
   zeminin altına iner ve yalnız delikten görünür. Kayıt anahtarı `obur_ilerleme` (js/auth.js GAME_SAVE_KEYS). */
"use strict";
(function () {
    const C = window.ObCore;
    const THREE = window.THREE;
    const $ = (id) => document.getElementById(id);
    const cv = $('oyun');
    const DOKUN = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const AZ_HAREKET = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DT = 1 / 60;
    const PI = Math.PI;

    if (!THREE) { hataGoster('3D kütüphanesi yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.'); return; }
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !DOKUN, stencil: true, powerPreference: 'high-performance' });
    } catch (e) { hataGoster('Bu cihaz 3D çizimi (WebGL) desteklemiyor.'); return; }
    function hataGoster(msg) {
        const k = document.querySelector('#menu .kart');
        if (k) { const p = document.createElement('p'); p.className = 'alt hata'; p.textContent = msg; k.appendChild(p); }
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DOKUN ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
    const PUS = lin('#cfe0ec');
    const scene = new THREE.Scene();
    scene.background = PUS;
    scene.fog = new THREE.Fog(PUS, 900, 2600);
    const kamera = new THREE.PerspectiveCamera(42, 1, 10, 12000);

    // ── Ortam ışığı (IBL): gökyüzü degradesinden yansıma haritası — cam ve metal gerçekçi parlar ──
    (function ortam() {
        const pm = new THREE.PMREMGenerator(renderer);
        const es = new THREE.Scene();
        const g = new THREE.SphereGeometry(100, 32, 16);
        const renk = [];
        const ust = lin('#7fb2e6'), ufuk = lin('#ddd6c8'), alt = lin('#6b5f50');
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
            const y = p.getY(i) / 100;
            const c = y > 0 ? ufuk.clone().lerp(ust, Math.pow(y, 0.6)) : ufuk.clone().lerp(alt, Math.pow(-y, 0.5));
            renk.push(c.r, c.g, c.b);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(renk, 3));
        es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
        const gunesTopu = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(14, 12, 9) }));
        gunesTopu.position.set(-55, 60, 45);
        es.add(gunesTopu);
        scene.environment = pm.fromScene(es, 0.04).texture;
        pm.dispose();
    })();

    const hemi = new THREE.HemisphereLight(lin('#cfe6ff'), lin('#7a6a52'), 0.35);
    const gunes = new THREE.DirectionalLight(lin('#fff0d8'), 1.85);
    const GUNES_YON = new THREE.Vector3(-0.55, 0.78, 0.42).normalize();
    gunes.castShadow = true;
    gunes.shadow.mapSize.set(DOKUN ? 1024 : 2048, DOKUN ? 1024 : 2048);
    gunes.shadow.bias = -0.0004;
    gunes.shadow.normalBias = 0.6;
    scene.add(hemi, gunes, gunes.target);

    // ── Tuval boyutu ──
    let W = 0, H = 0;
    function boyutla() {
        W = cv.clientWidth || window.innerWidth; H = cv.clientHeight || window.innerHeight;
        renderer.setSize(W, H, false);
        kamera.aspect = W / H;
        kamera.fov = W < H ? 52 : 42;
        kamera.updateProjectionMatrix();
    }
    window.addEventListener('resize', boyutla);
    boyutla();

    // ── Dokular (kodla üretilir) ──
    function doku(ciz, boy) {
        const c = document.createElement('canvas'); c.width = c.height = boy || 256;
        ciz(c.getContext('2d'), c.width);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = ANISO;
        return t;
    }
    function benek(g, b, renkler, adet, boyMin, boyMax, alfa) {
        for (let i = 0; i < adet; i++) {
            g.globalAlpha = alfa * (0.4 + Math.random() * 0.6);
            g.fillStyle = renkler[(Math.random() * renkler.length) | 0];
            const s = boyMin + Math.random() * (boyMax - boyMin);
            g.fillRect(Math.random() * b, Math.random() * b, s, s);
        }
        g.globalAlpha = 1;
    }
    const DOKU = {
        asfalt: doku((g, b) => {
            g.fillStyle = '#44484f'; g.fillRect(0, 0, b, b);
            benek(g, b, ['#2f3238', '#5a5e66', '#3a3d44', '#62666d'], 5000, 1, 2.5, 0.55);
            g.strokeStyle = 'rgba(20,20,24,.35)'; g.lineWidth = 1.2;
            for (let i = 0; i < 3; i++) { g.beginPath(); let x = Math.random() * b, y = Math.random() * b; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 40; y += Math.random() * 25; g.lineTo(x, y); } g.stroke(); }
        }),
        cim: doku((g, b) => {
            g.fillStyle = '#649f45'; g.fillRect(0, 0, b, b);
            benek(g, b, ['#4f8a36', '#78b455', '#5c9840', '#86c162', '#4a7f33'], 7000, 1, 3, 0.6);
            g.globalAlpha = 0.12; g.fillStyle = '#3d6e2a';
            for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(Math.random() * b, Math.random() * b, 10 + Math.random() * 30, 0, PI * 2); g.fill(); }
            g.globalAlpha = 1;
        }),
        parke: doku((g, b) => {
            g.fillStyle = '#cbbfa8'; g.fillRect(0, 0, b, b);
            const s = b / 8;
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
                const o = (y % 2) * s / 2;
                g.fillStyle = ['#d3c7af', '#c4b79d', '#d9ceb8', '#bfb197'][(Math.random() * 4) | 0];
                g.fillRect(x * s + o + 1, y * s + 1, s - 2, s - 2);
            }
            benek(g, b, ['#a99c84', '#e2d8c4'], 1500, 1, 2, 0.4);
        }),
        beton: doku((g, b) => {
            g.fillStyle = '#b3b5b8'; g.fillRect(0, 0, b, b);
            benek(g, b, ['#9fa2a6', '#c4c6c9', '#a8abaf'], 4000, 1, 3, 0.45);
            g.strokeStyle = 'rgba(80,82,86,.45)'; g.lineWidth = 2;
            g.strokeRect(1, 1, b / 2 - 2, b / 2 - 2); g.strokeRect(b / 2 + 1, b / 2 + 1, b / 2 - 2, b / 2 - 2);
            g.strokeRect(b / 2 + 1, 1, b / 2 - 2, b / 2 - 2); g.strokeRect(1, b / 2 + 1, b / 2 - 2, b / 2 - 2);
        }),
        kaldirim: doku((g, b) => {
            g.fillStyle = '#d6d0c4'; g.fillRect(0, 0, b, b);
            const s = b / 4;
            for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
                g.fillStyle = ['#dcd6ca', '#cfc8bb', '#d8d2c6'][(Math.random() * 3) | 0];
                g.fillRect(x * s + 1.5, y * s + 1.5, s - 3, s - 3);
            }
            benek(g, b, ['#b9b2a5', '#e6e1d7'], 1200, 1, 2, 0.4);
        })
    };
    function parlakDoku(ic, dis) {   // delik ışıltısı: yarıçapta parlayan halka
        return doku((g, b) => {
            const gr = g.createRadialGradient(b / 2, b / 2, 0, b / 2, b / 2, b / 2);
            gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(ic - 0.04, 'rgba(255,255,255,0)');
            gr.addColorStop(ic, 'rgba(255,255,255,0.95)'); gr.addColorStop(ic + 0.05, 'rgba(255,255,255,0.45)');
            gr.addColorStop(dis, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr; g.fillRect(0, 0, b, b);
        }, 256);
    }
    const PARILTI = parlakDoku(0.77, 0.97);
    const DALGA = parlakDoku(0.86, 0.98);
    const GIRDAP = doku((g, b) => {
        g.translate(b / 2, b / 2); g.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
            g.rotate(PI / 2);
            g.beginPath();
            for (let t = 0; t < 1; t += 0.02) {
                const a = t * 4.2, r = t * b * 0.48;
                if (t === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = b * 0.03; g.stroke();
        }
    }, 256);
    const TOZ = doku((g, b) => {
        const gr = g.createRadialGradient(b / 2, b / 2, 0, b / 2, b / 2, b / 2);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, b, b);
    }, 64);

    // ── Stencil: delik maskesi ve zemin ──
    function stencilli(m) {
        m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.NotEqualStencilFunc;
        m.stencilFail = THREE.KeepStencilOp; m.stencilZFail = THREE.KeepStencilOp; m.stencilZPass = THREE.KeepStencilOp;
        return m;
    }
    function zeminMat(map, tekrar, renk) {
        const m = new THREE.MeshLambertMaterial({ map: map, color: renk ? lin(renk) : 0xffffff });
        m.userData.tekrar = tekrar;
        return stencilli(m);
    }
    const ZMAT = {
        asfalt: zeminMat(DOKU.asfalt, 180),
        cim: zeminMat(DOKU.cim, 140),
        cimKoyu: zeminMat(DOKU.cim, 420, '#7d9c6c'),
        parke: zeminMat(DOKU.parke, 90),
        beton: zeminMat(DOKU.beton, 160),
        betonAcik: zeminMat(DOKU.beton, 120, '#f2efe8'),
        kaldirim: zeminMat(DOKU.kaldirim, 48),
        cizgi: stencilli(new THREE.MeshLambertMaterial({ color: lin('#f1eee4') })),
        su: stencilli(new THREE.MeshStandardMaterial({ color: lin('#2d6f96'), roughness: 0.18, metalness: 0.1 }))
    };
    const BOLGE_MAT = { park: 'cim', ev: 'cim', carsi: 'parke', merkez: 'betonAcik', kule: 'betonAcik', dev: 'betonAcik', liman: 'beton' };

    function zeminGeo(rects, y, tekrar) {
        const n = rects.length;
        const pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), uv = new Float32Array(n * 8), idx = new Uint32Array(n * 6);
        rects.forEach((r, i) => {
            const v = [[r.x, r.z], [r.x + r.w, r.z], [r.x + r.w, r.z + r.d], [r.x, r.z + r.d]];
            v.forEach((p, j) => {
                pos.set([p[0], y, p[1]], i * 12 + j * 3); nor.set([0, 1, 0], i * 12 + j * 3);
                uv.set([p[0] / tekrar, -p[1] / tekrar], i * 8 + j * 2);
            });
            const b = i * 4;
            idx.set([b, b + 3, b + 2, b, b + 2, b + 1], i * 6);
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        g.setIndex(new THREE.BufferAttribute(idx, 1));
        return g;
    }

    // ── Model kurucu: parçalar tek geometride birleşir (köşe renkli), zemine yakın köşeler koyulaşır (sahte AO) ──
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
    function Model() { this.opak = []; this.cam = []; }
    Model.prototype._ekle = function (geo, renk, x, y, z, o) {
        o = o || {};
        _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e); _p.set(x, y, z);
        _m.compose(_p, _q, _s);
        const g = geo.index ? geo.toNonIndexed() : geo;
        if (g !== geo) geo.dispose();
        g.applyMatrix4(_m);
        (o.cam ? this.cam : this.opak).push({ g, renk: lin(renk), ao: !o.cam && o.ao !== false });
        return this;
    };
    Model.prototype.kutu = function (w, h, d, x, y0, z, renk, o) { return this._ekle(new THREE.BoxGeometry(w, h, d), renk, x, y0 + h / 2, z, o); };
    Model.prototype.kutuM = function (w, h, d, x, yc, z, renk, o) { return this._ekle(new THREE.BoxGeometry(w, h, d), renk, x, yc, z, o); };
    Model.prototype.silindir = function (rt, rb, h, seg, x, y0, z, renk, o) {
        const sg = Math.max(4, Math.min(seg, Math.round(Math.max(rt, rb) * 1.6 + 4)));
        return this._ekle(new THREE.CylinderGeometry(rt, rb, h, sg, 1, false), renk, x, y0 + h / 2, z, o);
    };
    Model.prototype.koni = function (r, h, seg, x, y0, z, renk, o) { return this._ekle(new THREE.ConeGeometry(r, h, seg), renk, x, y0 + h / 2, z, o); };
    Model.prototype.kure = function (r, x, yc, z, renk, o) {
        o = o || {};
        // küçük nesnelerde az bölüm: telefonda üçgen bütçesi (seviye 6'da ~2000 nesne)
        const g = o.ico ? new THREE.IcosahedronGeometry(r, r < 6 ? 0 : 1)
            : r < 2.5 ? new THREE.SphereGeometry(r, 6, 4) : r < 7 ? new THREE.SphereGeometry(r, 10, 6) : new THREE.SphereGeometry(r, 14, 9);
        if (o.sx || o.sy || o.sz) g.scale(o.sx || 1, o.sy || 1, o.sz || 1);
        return this._ekle(g, renk, x, yc, z, o);
    };
    Model.prototype.prizma = function (w, h, d, x, y0, z, renk, o) {   // üçgen kesitli çatı gövdesi (mahya x boyunca)
        const a = [-w / 2, 0, -d / 2], b = [w / 2, 0, -d / 2], c = [w / 2, 0, d / 2], dd = [-w / 2, 0, d / 2], e = [-w / 2, h, 0], f = [w / 2, h, 0];
        const tri = [dd, e, a, c, b, f, a, e, f, a, f, b, dd, c, f, dd, f, e];
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute([].concat(...tri), 3));
        g.computeVertexNormals();
        return this._ekle(g, renk, x, y0, z, o);
    };
    function birlestir(parcalar, aoH) {
        if (!parcalar.length) return null;
        let n = 0;
        for (const p of parcalar) n += p.g.attributes.position.count;
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
        let k = 0;
        for (const p of parcalar) {
            const pa = p.g.attributes.position.array, na = p.g.attributes.normal.array, cnt = p.g.attributes.position.count;
            pos.set(pa, k * 3); nor.set(na, k * 3);
            for (let i = 0; i < cnt; i++) {
                const ao = p.ao ? 0.5 + 0.5 * Math.min(1, Math.max(0, pa[i * 3 + 1]) / aoH) : 1;
                col[(k + i) * 3] = p.renk.r * ao; col[(k + i) * 3 + 1] = p.renk.g * ao; col[(k + i) * 3 + 2] = p.renk.b * ao;
            }
            k += cnt; p.g.dispose();
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.computeBoundingSphere();
        return g;
    }

    // ── Renkler ──
    const CAM = '#6e9cc0', CAM_KOYU = '#3e5f7a', ISIK = '#ffe6a3', TEKER = '#1d1e22', JANT = '#b9bec5';
    const ARABA = ['#c0392b', '#2471a3', '#f0c419', '#27ae60', '#ecf0f1', '#7d3c98', '#2c3e50', '#e67e22'];
    const KONT = ['#c8443a', '#2f6db5', '#e8892c', '#2f8f5a', '#6b4ea3', '#d4b21f'];
    const DUVAR = ['#f3dfc1', '#d7e7f0', '#f1d3da', '#fff0b8', '#e5d4c0', '#cfe3cf'];
    const CATI = ['#b4473a', '#7a4a32', '#40607f', '#565a5e'];
    const BINA = ['#b5a58c', '#8f9eab', '#c4a484', '#9aa58f', '#b08f7d'];
    const CICEK = ['#ff5f8f', '#ffd23f', '#ffffff', '#b07cff', '#ff8f3d'];
    const YAPRAK = [['#3f8a3a', '#57a84a'], ['#2f7a44', '#4c9a58'], ['#c96f22', '#e8a23a']];

    function tekerlek(m, x, z, r, en) {
        m.silindir(r, r, en, 14, x, r, z, TEKER, { rx: PI / 2, ao: false });
        m.silindir(r * 0.55, r * 0.55, en + 0.4, 10, x, r, z, JANT, { rx: PI / 2, ao: false });
    }
    function pencereSirasi(m, w, d, y, adetX, adetZ, pw, ph, renk) {
        for (let i = 0; i < adetX; i++) {
            const x = -w / 2 + (i + 0.5) * w / adetX;
            m.kutu(pw, ph, 0.8, x, y, d / 2 + 0.3, renk, { cam: true });
            m.kutu(pw, ph, 0.8, x, y, -d / 2 - 0.3, renk, { cam: true });
        }
        for (let i = 0; i < adetZ; i++) {
            const z = -d / 2 + (i + 0.5) * d / adetZ;
            m.kutu(0.8, ph, pw, w / 2 + 0.3, y, z, renk, { cam: true });
            m.kutu(0.8, ph, pw, -w / 2 - 0.3, y, z, renk, { cam: true });
        }
    }

    // ── Modeller: { n: değişke sayısı, golge, yap(m, v) } — ölçüler core.js TIPLER r/h ile uyumlu, ön yüz +x ──
    const MODEL = {
        cicek: { n: 5, golge: false, yap(m, v) {
            m.kure(3.2, 0, 0.6, 0, '#4f8f3a', { sy: 0.35, ico: true });
            [[-1.8, -1], [1.6, -0.6], [0, 1.8]].forEach(([x, z], i) => {
                m.silindir(0.35, 0.35, 4 + i, 4, x, 0, z, '#4f8f3a');
                m.kure(1.7, x, 4.4 + i, z, CICEK[(v + i) % 5], { sy: 0.6 });
                m.kure(0.7, x, 4.8 + i, z, '#ffb400');
            });
        } },
        koni: { n: 1, golge: false, yap(m) {
            m.kutu(9, 1, 9, 0, 0, 0, '#2b2b2b');
            m.koni(4.4, 12, 14, 0, 1, 0, '#ff6a13');
            m.silindir(2.2, 2.75, 2.2, 14, 0, 5.2, 0, '#f4f4f4');
        } },
        top: { n: 4, golge: false, yap(m, v) {
            const c = ['#e63946', '#1d7ed8', '#ffd23f', '#2bb673'][v];
            m.kure(5.5, 0, 5.5, 0, c);
            m.silindir(5.6, 5.6, 1.2, 16, 0, 4.9, 0, '#ffffff', { rz: 0.4 });
        } },
        yangin: { n: 1, golge: false, yap(m) {
            m.silindir(3.2, 3.6, 9, 12, 0, 0, 0, '#c62828');
            m.kure(3.3, 0, 9, 0, '#c62828', { sy: 0.75 });
            m.silindir(1.2, 1.2, 9.5, 8, 0, 6, 0, '#a51f1f', { rz: PI / 2 });
            m.silindir(0.8, 0.8, 2, 8, 0, 12, 0, '#8e1b1b');
        } },
        kutu: { n: 2, golge: false, yap(m, v) {
            m.kutu(13, 10, 11, 0, 0, 0, v ? '#b98a55' : '#c99a62');
            m.kutu(13.2, 0.4, 2.6, 0, 10, 0, '#e1c48f');
            if (v) m.kutu(9, 7, 8, 1.5, 10, 0.5, '#c99a62', { ry: 0.4 });
        } },
        cop: { n: 2, golge: false, yap(m, v) {
            const c = v ? '#3a6fb0' : '#2f8f46';
            m.silindir(5.6, 5.1, 14, 16, 0, 0, 0, c);
            m.silindir(6.1, 6.1, 1.6, 16, 0, 14, 0, '#1f2a24');
            m.kutu(4, 1.4, 1.2, 0, 15.4, 0, '#1f2a24');
        } },
        posta: { n: 1, golge: true, yap(m) {
            m.kutu(2, 9, 2, 0, 0, 0, '#4a4f55');
            m.kutu(9, 8, 11, 0, 9, 0, '#f2c230');
            m.silindir(5.5, 5.5, 9, 14, 0, 17, 0, '#f2c230', { rz: PI / 2 });
            m.kutu(0.6, 1.2, 5, 4.8, 13, 0, '#3a3000');
        } },
        lamba: { n: 1, golge: true, yap(m) {
            m.silindir(2.4, 2.9, 2.4, 10, 0, 0, 0, '#3a3f47');
            m.silindir(0.9, 1.3, 43, 8, 0, 0, 0, '#3a3f47');
            m.kutu(11, 1.2, 1.2, 5, 42.5, 0, '#3a3f47');
            m.kutu(6, 2.2, 4.4, 10.5, 41, 0, '#2c3036');
            m.kutu(4.8, 0.6, 3.4, 10.5, 40.6, 0, ISIK, { cam: true });
        } },
        cali: { n: 3, golge: false, yap(m, v) {
            const y = YAPRAK[v === 2 ? 1 : 0];
            m.kure(7.5, -4, 6.5, 1.5, y[0], { ico: true, sy: 0.85 });
            m.kure(7, 4.5, 6, -1.5, y[0], { ico: true, sy: 0.85 });
            m.kure(8, 0, 9, 0, y[1], { ico: true, sy: 0.9 });
            if (v === 1) [[-3, 13, 3], [4, 11, 4], [1, 14, -3], [-5, 10, -2]].forEach(([x, yy, z]) => m.kure(1.4, x, yy, z, '#ff6f91'));
        } },
        bank: { n: 2, golge: true, yap(m, v) {
            const ahsap = v ? '#9a5f2f' : '#b07440';
            for (let i = 0; i < 3; i++) m.kutu(27, 1.2, 2.2, 0, 5, -2.6 + i * 2.6, ahsap);
            for (let i = 0; i < 2; i++) m.kutu(27, 2.2, 1.2, 0, 7.5 + i * 3, -4.6, ahsap, { rx: -0.12 });
            [-11, 11].forEach((x) => { m.kutu(1.4, 5, 7.5, x, 0, 0, '#2e3238'); m.kutu(1.4, 7, 1.2, x, 5, -4.4, '#2e3238'); });
        } },
        varil: { n: 4, golge: true, yap(m, v) {
            const c = KONT[v];
            m.silindir(8, 8, 16, 16, 0, 0, 0, c);
            m.silindir(8.3, 8.3, 1, 16, 0, 4, 0, '#2a2a2a', { ao: false });
            m.silindir(8.3, 8.3, 1, 16, 0, 11.5, 0, '#2a2a2a', { ao: false });
            m.silindir(2, 2, 0.6, 8, 3, 16, 2, '#3a3a3a');
        } },
        agac: { n: 3, golge: true, yap(m, v) {
            m.silindir(2.2, 3.2, 22, 8, 0, 0, 0, '#6b4528');
            if (v === 1) {
                m.koni(15, 22, 9, 0, 10, 0, '#2a6b3a'); m.koni(12, 19, 9, 0, 22, 0, '#2f7a44'); m.koni(8, 15, 9, 0, 33, 0, '#378a4d');
            } else {
                const y = YAPRAK[v === 2 ? 2 : 0];
                m.kure(14, 0, 30, 0, y[0], { ico: true });
                m.kure(10.5, 8, 26, 4, y[0], { ico: true });
                m.kure(10, -8, 27, -3, y[1], { ico: true });
                m.kure(9.5, -2, 38, 3, y[1], { ico: true });
                m.kure(8, 4, 36, -6, y[1], { ico: true });
            }
        } },
        araba: { n: 8, golge: true, yap(m, v) {
            const c = ARABA[v];
            m.kutu(44, 7, 20, 0, 3, 0, c);
            m.kutu(26, 6.5, 18.4, -2, 10, 0, CAM_KOYU, { cam: true });
            m.kutu(20, 1.2, 18, -3, 16.3, 0, c);
            m.kutu(3, 7.5, 18.6, -14.5, 9.6, 0, c, { rz: -0.35 });
            m.kutu(3, 7.5, 18.6, 10.5, 9.6, 0, c, { rz: 0.45 });
            m.kutu(1, 2, 4, 22.2, 6.5, 6, ISIK, { cam: true }); m.kutu(1, 2, 4, 22.2, 6.5, -6, ISIK, { cam: true });
            m.kutu(1, 2, 4, -22.2, 6.5, 6.5, '#d32f2f', { cam: true }); m.kutu(1, 2, 4, -22.2, 6.5, -6.5, '#d32f2f', { cam: true });
            m.kutu(45, 2, 20.6, 0, 2.6, 0, '#2a2c30');
            [[13, 9.6], [13, -9.6], [-13, 9.6], [-13, -9.6]].forEach(([x, z]) => tekerlek(m, x, z, 3.7, 3));
        } },
        otobus: { n: 3, golge: true, yap(m, v) {
            const c = ['#f2b705', '#d64541', '#e9ecef'][v];
            m.kutu(88, 22, 26, 0, 3.5, 0, c);
            m.kutu(76, 8, 26.6, -4, 13, 0, CAM_KOYU, { cam: true });
            m.kutu(1, 12, 22, 44.2, 9, 0, CAM_KOYU, { cam: true });
            m.kutu(88.4, 2.4, 26.4, 0, 3.2, 0, '#2a2c30');
            m.kutu(20, 3, 14, -16, 25.5, 0, '#c9ced4');
            m.kutu(1, 2, 5, 44.4, 6, 8, ISIK, { cam: true }); m.kutu(1, 2, 5, 44.4, 6, -8, ISIK, { cam: true });
            [[28, 12.6], [28, -12.6], [-26, 12.6], [-26, -12.6]].forEach(([x, z]) => tekerlek(m, x, z, 5, 3.5));
        } },
        kamyon: { n: 4, golge: true, yap(m, v) {
            m.kutu(20, 20, 25, 26, 4, 0, '#eceff1');
            m.kutu(1, 8, 21, 36.2, 14, 0, CAM_KOYU, { cam: true });
            m.kutu(52, 24, 26, -10, 5, 0, KONT[v]);
            for (let i = 0; i < 8; i++) m.kutu(1.2, 22, 26.6, -34 + i * 7, 6, 0, KONT[v]);
            m.kutu(76, 2.6, 26, 0, 3, 0, '#2a2c30');
            m.kutu(1, 2, 5, 36.4, 7, 8, ISIK, { cam: true }); m.kutu(1, 2, 5, 36.4, 7, -8, ISIK, { cam: true });
            [[26, 12.6], [-2, 12.6], [-24, 12.6], [26, -12.6], [-2, -12.6], [-24, -12.6]].forEach(([x, z]) => tekerlek(m, x, z, 4.6, 3.4));
        } },
        durak: { n: 1, golge: true, yap(m) {
            m.kutu(46, 1.6, 18, 0, 25, 0, '#c0392b');
            m.kutu(44, 20, 0.8, 0, 4, -7.5, CAM, { cam: true });
            [[-21, -7.5], [21, -7.5], [-21, 7], [21, 7]].forEach(([x, z]) => m.kutu(1.5, 25, 1.5, x, 0, z, '#5b6168'));
            m.kutu(30, 1.4, 6, 0, 7, -4, '#8a5a32');
            m.kutu(1, 20, 14, 22, 4, 0, '#2471a3');
        } },
        bufe: { n: 2, golge: true, yap(m, v) {
            m.kutu(42, 26, 34, 0, 0, 0, '#f3e6cf');
            m.kutu(0.8, 10, 26, 21.3, 9, 0, CAM, { cam: true });
            for (let i = 0; i < 6; i++) m.kutuM(12, 1, 6.4, 25, 23, -16 + i * 6.4 + 3.2, i % 2 ? '#ffffff' : (v ? '#2e86de' : '#d63b30'), { rz: -0.35 });
            m.kutu(46, 2, 38, 0, 26, 0, '#5a4636');
            m.kutu(2, 6, 22, 20, 28, 0, '#ffd23f');
        } },
        konteyner: { n: 6, golge: true, yap(m, v) {
            const c = KONT[v];
            m.kutu(64, 26, 30, 0, 0, 0, c);
            for (let i = 0; i < 10; i++) m.kutu(1.6, 24, 30.8, -29 + i * 6.4, 1, 0, c);
            m.kutu(0.8, 22, 1.2, 32.2, 2, 0, '#2a2a2a');
            m.kutu(64.4, 1.4, 30.4, 0, 24.6, 0, c);
        } },
        fiskiye: { n: 1, golge: true, yap(m) {
            m.silindir(40, 42, 6, 28, 0, 0, 0, '#b9b2a6');
            m.silindir(36, 36, 5.2, 28, 0, 1, 0, '#4fa6d1', { cam: true });
            m.silindir(4, 5, 14, 12, 0, 0, 0, '#c9c2b6');
            m.silindir(13, 4.5, 3.5, 18, 0, 13, 0, '#c9c2b6');
            m.silindir(11.5, 11.5, 0.6, 18, 0, 16.2, 0, '#7cc4e6', { cam: true });
            m.kure(2.6, 0, 19.5, 0, '#cfeefc', { sy: 1.8, cam: true });
        } },
        ev: { n: 6, golge: true, yap(m, v) {
            const dv = DUVAR[v], cat = CATI[v % 4];
            m.kutu(78, 3, 62, 0, 0, 0, '#8d8577');
            m.kutu(74, 26, 58, 0, 3, 0, dv);
            m.prizma(74, 19, 58, 0, 29, 0, dv);
            const a = 0.58, L = 37;
            m.kutuM(82, 2.6, L, 0, 29 + Math.sin(a) * L / 2 + 1, Math.cos(a) * L / 2, cat, { rx: a });
            m.kutuM(82, 2.6, L, 0, 29 + Math.sin(a) * L / 2 + 1, -Math.cos(a) * L / 2, cat, { rx: -a });
            m.kutu(7, 16, 7, 18, 34, -9, '#9c4a36');
            m.kutu(11, 17, 1, 0, 3, 29.3, '#7a4b2c');
            m.kutu(16, 2, 6, 0, 0, 32, '#9a9184');
            [-24, 24].forEach((x) => { m.kutu(13, 11, 0.8, x, 11, 29.4, CAM, { cam: true }); m.kutu(13, 11, 0.8, x, 11, -29.4, CAM, { cam: true }); m.kutu(15, 1.2, 2, x, 10, 30, '#ffffff'); });
            [-14, 14].forEach((z) => { m.kutu(0.8, 11, 12, 37.4, 11, z, CAM, { cam: true }); m.kutu(0.8, 11, 12, -37.4, 11, z, CAM, { cam: true }); });
        } },
        dukkan: { n: 5, golge: true, yap(m, v) {
            const w = 96, d = 76, dv = DUVAR[(v + 2) % DUVAR.length];
            m.kutu(w, 52, d, 0, 0, 0, dv);
            m.kutu(0.8, 17, 64, w / 2 + 0.3, 3, 0, CAM, { cam: true });
            for (let i = 0; i < 4; i++) m.kutu(0.8, 11, 11, w / 2 + 0.3, 30, -27 + i * 18, CAM, { cam: true });
            pencereSirasi(m, w, d, 30, 5, 0, 12, 11, CAM);
            const tente = ['#d63b30', '#2e86de', '#27ae60', '#8e44ad', '#e67e22'][v];
            for (let i = 0; i < 8; i++) m.kutuM(14, 1, d / 8 + 0.2, w / 2 + 5, 23, -d / 2 + (i + 0.5) * d / 8, i % 2 ? '#ffffff' : tente, { rz: -0.3 });
            m.kutu(1.5, 7, 46, w / 2 + 0.8, 43, 0, '#263238');
            [[w, 2, d, 0, 0], [w, 4, 2, 0, -d / 2], [w, 4, 2, 0, d / 2], [2, 4, d, -w / 2, 0], [2, 4, d, w / 2, 0]].forEach(([a, b, c, x, z], i) => { if (i) m.kutu(a, b, c, x, 52, z, '#9e9586'); });
            m.kutu(16, 9, 12, -20, 52, -10, '#c7ccd1'); m.kutu(12, 7, 10, 10, 52, 14, '#c7ccd1');
        } },
        apartman: { n: 5, golge: true, yap(m, v) {
            const w = 118, d = 98, kat = 7, c = BINA[v];
            m.kutu(w, 120, d, 0, 0, 0, c);
            for (let f = 0; f < kat; f++) {
                const y = 6 + f * 16;
                pencereSirasi(m, w, d, y, 6, 5, 11, 9, (f * 3 + v) % 5 === 0 ? ISIK : CAM);
                if (f > 0) m.kutu(w + 1.2, 1.3, d + 1.2, 0, y - 3.2, 0, '#e8e2d6');
                if (f > 0 && f % 2 === 1) for (let i = 0; i < 3; i++) {
                    const x = -w / 2 + (i * 2 + 1.5) * w / 6;
                    m.kutu(17, 1.2, 7, x, y - 1.5, d / 2 + 3.5, '#d9d3c7');
                    m.kutu(17, 5, 0.8, x, y - 0.3, d / 2 + 6.8, '#5c6670');
                }
            }
            m.kutu(w, 4, 2, 0, 120, d / 2 - 1, '#9e9586'); m.kutu(w, 4, 2, 0, 120, -d / 2 + 1, '#9e9586');
            m.kutu(2, 4, d, w / 2 - 1, 120, 0, '#9e9586'); m.kutu(2, 4, d, -w / 2 + 1, 120, 0, '#9e9586');
            m.silindir(8, 8, 12, 12, -30, 120, -20, '#c7ccd1'); m.kutu(20, 14, 16, 25, 120, 10, '#b8b1a4');
            m.kutu(24, 2, 10, 0, 18, d / 2 + 5, '#5c6670'); m.kutu(14, 16, 0.8, 0, 0, d / 2 + 0.4, CAM_KOYU, { cam: true });
        } },
        kule: { n: 3, golge: true, yap(m, v) {
            m.kutu(150, 28, 128, 0, 0, 0, '#9fa6ad');
            m.kutu(140, 18, 118.4, 0, 4, 0, CAM_KOYU, { cam: true });
            m.kutu(110, 182, 96, 0, 28, 0, BINA[v + 1]);
            for (let i = 0; i < 12; i++) m.kutu(111, 8, 97, 0, 34 + i * 14.5, 0, i % 4 === v ? '#4f7ea6' : CAM_KOYU, { cam: true });
            m.kutu(84, 12, 72, 0, 210, 0, '#c9ced4');
            m.silindir(1.4, 2.4, 44, 6, 10, 222, 0, '#9fa6ad');
            m.kure(2.4, 10, 267, 0, '#ff3b30', { cam: true });
        } },
        gokdelen: { n: 2, golge: true, yap(m, v) {
            const w = 168, d = 144, H = 290;
            m.kutu(196, 22, 166, 0, 0, 0, '#b7b0a3');
            m.kutu(w, H, d, 0, 22, 0, v ? '#3d6283' : '#2f5577', { cam: true });
            for (let i = 0; i <= 10; i++) {
                const x = -w / 2 + i * w / 10;
                m.kutu(2.2, H, d + 1, x, 22, 0, '#aeb6bf');
            }
            for (let i = 0; i <= 8; i++) {
                const z = -d / 2 + i * d / 8;
                m.kutu(w + 1, H, 2.2, 0, 22, z, '#aeb6bf');
            }
            for (let k = 1; k < 10; k++) m.kutu(w + 1.4, 2, d + 1.4, 0, 22 + k * H / 10, 0, '#aeb6bf');
            m.kutu(w + 2, 2, d + 2, 0, 22 + H, 0, '#8d949c');      // opak çatı (yukarıdan cam beyaz parlıyordu)
            m.kutu(128, 26, 108, 0, 24 + H, 0, '#9aa3ad');
            m.kutu(86, 14, 70, 0, 48 + H, 0, '#d0d5da');
            m.silindir(1.6, 3.4, 70, 8, 0, 62 + H, 0, '#d0d5da');
        } },
        vinc: { n: 1, golge: true, yap(m) {
            m.kutu(32, 10, 32, 0, 0, 0, '#9fa6ad');
            m.kutu(11, 132, 11, 0, 10, 0, '#f2b705');
            for (let i = 0; i < 8; i++) m.kutu(12, 1.2, 12, 0, 18 + i * 16, 0, '#c99600');
            m.kutu(12, 10, 12, 0, 128, 6, '#eceff1');
            m.kutu(1, 6, 10, 6.5, 130, 6, CAM_KOYU, { cam: true });
            m.kutu(150, 6, 7, 40, 142, 0, '#f2b705');
            m.kutu(22, 12, 12, -30, 136, 0, '#6f7780');
            m.silindir(0.6, 0.6, 70, 4, 84, 72, 0, '#333');
            m.kutu(34, 14, 16, 84, 58, 0, KONT[1]);
        } }
    };
    // Model geometrileri bir kez kurulur (opak + cam), bölümler arası paylaşılır
    const MODEL_GEO = {};
    function modelGeo(tip, v) {
        const k = tip + '|' + v;
        if (!MODEL_GEO[k]) {
            const m = new Model();
            MODEL[tip].yap(m, v);
            const h = C.TIPLER[tip].h;
            MODEL_GEO[k] = { opak: birlestir(m.opak, Math.min(14, h * 0.35 + 2)), cam: birlestir(m.cam, 1) };
        }
        return MODEL_GEO[k];
    }
    const MAT_OPAK = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, envMapIntensity: 0.6 });
    const MAT_CAM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.25, envMapIntensity: 0.5 });

    // ── Dünya (bölüm sahnesi) ──
    let dunya = null;   // { kok, ornek: Map(key → {opak, cam}), delik: Map(delik → görsel) }
    const yardim = new THREE.Object3D();

    function dunyaKur(s) {
        dunyaSil();
        const kok = new THREE.Group();
        scene.add(kok);
        const N = s.n, B = C.BLOK, Y = C.YOL, Wm = s.W, Hm = s.H;
        // zemin
        const ekle = (geo, mat) => { const z = new THREE.Mesh(geo, mat); z.receiveShadow = true; kok.add(z); return z; };
        const disMat = s.bolum.renk === 'liman' ? ZMAT.su : ZMAT.cimKoyu;
        ekle(zeminGeo([{ x: -6000, z: -6000, w: Wm + 12000, d: Hm + 12000 }], -0.6, disMat.userData.tekrar || 400), disMat);
        ekle(zeminGeo([{ x: -20, z: -20, w: Wm + 40, d: Hm + 40 }], 0, 180), ZMAT.asfalt);
        const kald = [], bolge = {}, yol = [];
        for (const b of s.bloklar) {
            kald.push({ x: b.x - 8, z: b.y - 8, w: b.w + 16, d: b.w + 16 });
            const mk = BOLGE_MAT[b.bolge];
            (bolge[mk] = bolge[mk] || []).push({ x: b.x, z: b.y, w: b.w, d: b.w });
            if (b.bolge === 'park') {
                yol.push({ x: b.x + b.w / 2 - 9, z: b.y, w: 18, d: b.w });
                yol.push({ x: b.x, z: b.y + b.w / 2 - 9, w: b.w, d: 18 });
            }
        }
        ekle(zeminGeo(kald, 0.15, 48), ZMAT.kaldirim);
        for (const mk in bolge) ekle(zeminGeo(bolge[mk], 0.3, ZMAT[mk].userData.tekrar), ZMAT[mk]);
        if (yol.length) ekle(zeminGeo(yol, 0.42, 48), ZMAT.kaldirim);
        // şerit çizgileri ve yaya geçitleri
        const cz = [];
        const kavsakYakin = (v) => { const k = Math.round(v / B) * B; return Math.abs(v - k) < Y / 2 + 32; };
        for (let i = 1; i < N; i++) {
            const c = i * B;
            for (let t = 10; t < Wm - 30; t += 56) {
                if (!kavsakYakin(t + 15)) { cz.push({ x: c - 1.6, z: t, w: 3.2, d: 30 }); cz.push({ x: t, z: c - 1.6, w: 30, d: 3.2 }); }
            }
        }
        for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) {
            const ci = i * B, cj = j * B;
            for (let k = 0; k < 6; k++) {
                const o = -27 + k * 10.5;
                cz.push({ x: ci + o, z: cj - Y / 2 - 27, w: 5, d: 22 });
                cz.push({ x: ci + o, z: cj + Y / 2 + 5, w: 5, d: 22 });
                cz.push({ x: ci - Y / 2 - 27, z: cj + o, w: 22, d: 5 });
                cz.push({ x: ci + Y / 2 + 5, z: cj + o, w: 22, d: 5 });
            }
        }
        ekle(zeminGeo(cz, 0.22, 100), ZMAT.cizgi);

        // nesneler: (tür, değişke) başına örnekli ağ
        const gruplar = new Map();
        for (const o of s.nesneler) {
            const v = Math.floor(o.tohum * MODEL[o.tip].n) % MODEL[o.tip].n;
            const k = o.tip + '|' + v;
            if (!gruplar.has(k)) gruplar.set(k, []);
            o._k = k; o._i = gruplar.get(k).length;
            o._ry = donus(o);
            gruplar.get(k).push(o);
        }
        // hapşırınca püsküren eşyalar için her türde yedek yuva (sonradan örnekli ağ büyütülemez)
        const yedekli = new Set();
        for (const t of C.SACILAN) { const k = t + '|0'; if (!gruplar.has(k)) gruplar.set(k, []); yedekli.add(k); }
        const ornek = new Map();
        for (const [k, liste] of gruplar) {
            const [tip, v] = k.split('|');
            const g = modelGeo(tip, +v);
            const kayit = {};
            for (const tur of ['opak', 'cam']) {
                if (!g[tur]) continue;
                const ek = yedekli.has(k) ? YEDEK : 0;
                const im = new THREE.InstancedMesh(g[tur], tur === 'cam' ? MAT_CAM : MAT_OPAK, liste.length + ek);
                for (let i = 0; i < ek; i++) im.setMatrixAt(liste.length + i, SIFIR);
                im.castShadow = MODEL[tip].golge; im.receiveShadow = true;
                im.frustumCulled = false;
                kok.add(im);
                kayit[tur] = im;
            }
            ornek.set(k, kayit);
        }
        const bos = new Map();
        for (const k of yedekli) { const n0 = gruplar.get(k).length, l = []; for (let i = YEDEK - 1; i >= 0; i--) l.push(n0 + i); bos.set(k, l); }
        dunya = { kok, ornek, delik: new Map(), dusen: [], sallanan: new Set(), tipler: new Set(s.nesneler.map((o) => o.tip)),
            bos, ucan: [], biber: new Map() };
        for (const o of s.nesneler) yerlestir(o, o.x, 0, o.y, 0, o._ry, 0);
        for (const k of ornek.values()) for (const t in k) k[t].instanceMatrix.needsUpdate = true;
        for (const d of s.delikler) delikGorsel(d);
        etiketleriKur(s);
    }
    const YEDEK = 30;
    const SIFIR = new THREE.Matrix4().makeScale(0, 0, 0).setPosition(0, -9999, 0);
    // Acı biber: parlak kırmızı gövde + yeşil sap + kırmızı ışıltı
    const BIBER_GOVDE = new THREE.SphereGeometry(1, 18, 12).scale(0.5, 0.5, 1.45);
    const BIBER_SAP = new THREE.CylinderGeometry(0.1, 0.16, 0.6, 8).rotateX(PI / 2.6).translate(0, 0.2, -1.55);
    const BIBER_SAPKA = new THREE.SphereGeometry(0.32, 10, 6).scale(1, 0.55, 1).translate(0, 0.05, -1.3);
    const BIBER_MAT = new THREE.MeshStandardMaterial({ color: lin('#e8231f'), roughness: 0.28, metalness: 0.05, emissive: lin('#4a0400') });
    const SAP_MAT = new THREE.MeshStandardMaterial({ color: lin('#3f8f2c'), roughness: 0.6 });
    const BIBER_ISIK_MAT = new THREE.MeshBasicMaterial({ map: PARILTI, color: lin('#ff5a3c'), transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    function biberGorsel(b) {
        const g = new THREE.Group();
        const govde = new THREE.Group();
        const m1 = new THREE.Mesh(BIBER_GOVDE, BIBER_MAT), m2 = new THREE.Mesh(BIBER_SAP, SAP_MAT), m3 = new THREE.Mesh(BIBER_SAPKA, SAP_MAT);
        m1.castShadow = true;
        govde.add(m1, m2, m3);
        govde.rotation.z = 0.25;
        const isik = new THREE.Mesh(DUZLEM, BIBER_ISIK_MAT.clone());
        isik.position.y = 0.6; isik.renderOrder = 5;
        g.add(govde, isik);
        for (const n of [m1, m2, m3, isik]) n.userData.delik = true;   // paylaşılan geometri: dunyaSil silmesin
        dunya.kok.add(g);
        dunya.biber.set(b, { g, govde, isik, t: 0 });
    }
    function biberSil(b) {
        const v = dunya && dunya.biber.get(b);
        if (!v) return;
        dunya.kok.remove(v.g); v.isik.material.dispose();
        dunya.biber.delete(b);
    }
    function biberGuncelle(dt) {
        const olc = C.BIBER.r * Math.max(1, kam.D / 650);      // uzaktan da görünsün
        for (const [b, v] of dunya.biber) {
            v.t += dt;
            const k = 1 - b.inis / C.BIBER.inis;              // 0 → 1: fırlatma yayı
            let x = b.x, z = b.y, y = 4 + (AZ_HAREKET ? 0 : Math.sin(v.t * 4) * 2);
            if (b.inis > 0) { x = b.x0 + (b.x - b.x0) * k; z = b.y0 + (b.y - b.y0) * k; y = 6 + Math.sin(k * PI) * (60 + olc * 3); }
            v.g.position.set(x, y, z);
            v.govde.scale.setScalar(olc * 0.75);
            v.govde.rotation.y = AZ_HAREKET ? 0.6 : v.t * 1.6;
            const sonda = b.kalan < 3 && !AZ_HAREKET ? (Math.sin(v.t * 18) > 0 ? 1 : 0.25) : 1;
            // ışıltı her zaman İNİŞ NOKTASINDA yerde durur: biber havadayken nereye düşeceğini gösterir (kaçma şansı)
            const uyari = b.inis > 0 ? 1.6 : 1;
            v.isik.scale.set(olc * 5 * uyari, 1, olc * 5 * uyari);
            v.isik.position.set(b.x - x, 1.5 - y, b.y - z);
            v.isik.material.opacity = b.inis > 0 ? 0.95 : (0.45 + (AZ_HAREKET ? 0 : 0.2 * Math.sin(v.t * 5))) * sonda;
            v.govde.visible = sonda > 0.5 || b.kalan >= 3;
        }
    }
    function sacilanEkle(o) {
        const k = o.tip + '|0', l = dunya.bos.get(k);
        if (!l || !l.length) return;
        o._k = k; o._i = l.pop(); o._yedek = true; o._ry = o.tohum * PI * 2;
        dunya.ucan.push({ o, t: 0 });
    }
    function ucanGuncelle(dt) {
        const L = dunya.ucan;
        for (let i = L.length - 1; i >= 0; i--) {
            const u = L[i], o = u.o;
            if (o.dusen) { L.splice(i, 1); continue; }
            u.t += dt;
            const k = Math.min(1, u.t / 0.5);
            const x = o.kx + (o.x - o.kx) * k, z = o.ky + (o.y - o.ky) * k;
            const y = Math.sin(k * PI) * (50 + o.r * 2.5) - (1 - k) * 20;
            if (k >= 1) { yerlestir(o, o.x, 0, o.y, 0, o._ry); L.splice(i, 1); continue; }
            yerlestir(o, x, y, z, (1 - k) * 4, o._ry, 1, 0.4);
        }
    }
    function donus(o) {
        if (o.surer) return yonAci(o);
        if (o.tip === 'araba' || o.tip === 'kamyon' || o.tip === 'otobus') return o.yon ? PI / 2 : 0;
        const r = C.TIPLER[o.tip].r;
        if (r >= 40) return Math.floor(o.tohum * 40) % 4 * PI / 2;   // binalar ızgaraya hizalı
        return o.tohum * PI * 2;
    }
    function yonAci(o) {
        if (o.vx > 0) return 0; if (o.vx < 0) return PI;
        if (o.vy > 0) return -PI / 2; return PI / 2;
    }
    const _ust = new THREE.Vector3(0, 1, 0), _eksen = new THREE.Vector3(), _q2 = new THREE.Quaternion();
    function yerlestir(o, x, y, z, egim, ry, eksenX, eksenZ, olcek) {
        yardim.position.set(x, y, z);
        yardim.quaternion.setFromAxisAngle(_ust, ry);
        if (egim) {
            _eksen.set(eksenX || 1, 0, eksenZ || 0).normalize();
            _q2.setFromAxisAngle(_eksen, egim);
            yardim.quaternion.premultiply(_q2);
        }
        const s = olcek === undefined ? 1 : olcek;
        yardim.scale.set(s, s, s);
        yardim.updateMatrix();
        const k = dunya.ornek.get(o._k);
        if (!k) return;              // yuvası olmayan (yedek tükenmiş) püsküren eşya: çizilmez
        if (k.opak) { k.opak.setMatrixAt(o._i, yardim.matrix); k.opak.instanceMatrix.needsUpdate = true; }
        if (k.cam) { k.cam.setMatrixAt(o._i, yardim.matrix); k.cam.instanceMatrix.needsUpdate = true; }
    }
    function dunyaSil() {
        if (!dunya) return;
        scene.remove(dunya.kok);
        dunya.kok.traverse((n) => {
            if (n.isInstancedMesh) n.dispose();                       // model geometrileri paylaşılır, silinmez
            else if (n.isMesh && n.userData.delik) { /* delik malzemeleri DELIK_MAT önbelleğinde kalır */ }
            else if (n.isMesh) n.geometry.dispose();                   // zemin geometrisi bölüme özel
        });
        dunya = null;
        $('etiketler').textContent = '';
    }

    // ── Delik görseli: stencil maskesi + iç duvar + dip + girdap + kenar + ışıltı ──
    const MASKE_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false });
    Object.assign(MASKE_MAT, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp });
    const DAIRE = new THREE.CircleGeometry(1, 64).rotateX(-PI / 2);
    const DUVAR_GEO = (() => {
        const g = new THREE.CylinderGeometry(1, 1, 1, 64, 16, true).translate(0, -0.5, 0);
        const p = g.attributes.position, renk = [];
        for (let i = 0; i < p.count; i++) {
            const yy = -p.getY(i);
            const isik = 0.45 + 0.55 * Math.max(0, -p.getZ(i));      // kameradan uzak duvar güneşi alır
            let c = (1 - Math.pow(yy, 0.55)) * isik;
            if (yy < 0.03) c *= 0.35;                                   // kesik kenar: koyu toprak bandı
            renk.push(c, c, c);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(renk, 3));
        return g;
    })();
    const HALKA = new THREE.RingGeometry(1, 1.06, 96).rotateX(-PI / 2);
    const DUZLEM = new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2);
    // Delik malzemeleri renk başına bir kez kurulur ve saklanır: her bölümde yeniden derlemek takılma yapıyordu
    const DELIK_MAT = new Map();
    function delikMat(hex) {
        if (DELIK_MAT.has(hex)) return DELIK_MAT.get(hex);
        const renk = new THREE.Color(hex);
        const m = {
            renk,
            duvar: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, color: renk.clone().multiplyScalar(0.42) }),
            dip: new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }),
            girdap: new THREE.MeshBasicMaterial({ map: GIRDAP, color: renk, transparent: true, opacity: 0.15,
                blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
            kenar: new THREE.MeshBasicMaterial({ color: renk.clone(), toneMapped: false, fog: false }),
            parilti: new THREE.MeshBasicMaterial({ map: PARILTI, color: renk, transparent: true, opacity: 0.6,
                blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })
        };
        DELIK_MAT.set(hex, m);
        return m;
    }
    const BEYAZ = new THREE.Color(1, 1, 1);
    function delikGorsel(d) {
        const g = new THREE.Group();
        const dm = delikMat(d.renk);
        const maske = new THREE.Mesh(DAIRE, MASKE_MAT); maske.renderOrder = -10; maske.position.y = 1.5;
        const duvar = new THREE.Mesh(DUVAR_GEO, dm.duvar);
        const dip = new THREE.Mesh(DAIRE, dm.dip);
        const girdap = new THREE.Mesh(DAIRE, dm.girdap);
        const kenar = new THREE.Mesh(HALKA, dm.kenar);
        kenar.position.y = 1.6;
        const parilti = new THREE.Mesh(DUZLEM, dm.parilti);
        parilti.position.y = 1.8; parilti.renderOrder = 5;
        g.add(maske, duvar, dip, girdap, kenar, parilti);
        for (const n of g.children) n.userData.delik = true;
        dunya.kok.add(g);
        dunya.delik.set(d, { g, maske, duvar, dip, girdap, kenar, parilti, dm, nabiz: 0, parla: 0, gorR: d.r });
    }
    function delikGuncelle(d, zaman, dt) {
        const v = dunya.delik.get(d);
        if (!v) return;
        v.gorR += (d.r - v.gorR) * Math.min(1, dt * 8);    // büyüme yumuşak (sayı zıplamaz)
        v.nabiz = Math.max(0, v.nabiz - dt * 4);
        v.parla = Math.max(0, v.parla - dt * 1.6);
        v.dm.kenar.color.copy(v.dm.renk).lerp(BEYAZ, v.parla);
        const r = v.gorR, derin = r * 2.4 + 40;
        v.g.position.set(d.x, 0, d.y);
        v.maske.scale.set(r, 1, r);
        v.duvar.scale.set(r, derin, r);
        v.dip.scale.set(r, 1, r); v.dip.position.y = -derin + 0.5;
        v.girdap.scale.set(r * 0.92, 1, r * 0.92); v.girdap.position.y = -derin * 0.45;
        v.girdap.rotation.y = AZ_HAREKET ? 0 : -zaman * 1.3;
        const ks = r * (1 + v.nabiz * 0.06);
        v.kenar.scale.set(ks, 1, ks);
        const ps = r * 2.2 * (1 + v.nabiz * 0.1 + v.parla * 0.3);
        v.parilti.scale.set(ps, 1, ps);
        v.parilti.material.opacity = 0.28 + 0.3 * v.nabiz + 0.4 * v.parla + (AZ_HAREKET ? 0 : 0.05 * Math.sin(zaman * 3));
    }

    // ── Rakip ad etiketleri ve uçan puanlar (DOM) ──
    function etiketleriKur(s) {
        const kap = $('etiketler'); kap.textContent = '';
        for (const d of s.delikler) {
            if (!d.bot) continue;
            const e = document.createElement('div'); e.className = 'etiket'; e.textContent = d.ad; e.style.setProperty('--renk', d.renk);
            kap.appendChild(e);
            dunya.delik.get(d).etiket = e;
        }
    }
    const _v = new THREE.Vector3();
    function ekranda(x, y, z) {
        _v.set(x, y, z).project(kamera);
        return { x: (_v.x + 1) / 2 * W, y: (1 - _v.y) / 2 * H, gorunur: _v.z < 1 && Math.abs(_v.x) < 1.2 && Math.abs(_v.y) < 1.2 };
    }
    const popHavuz = [];
    function puanUcur(x, y, z, metin, buyuk) {
        const p = ekranda(x, y, z);
        if (!p.gorunur) return;
        let e = popHavuz.find((n) => !n.isConnected || n.dataset.bos === '1');
        if (!e) { e = document.createElement('div'); e.className = 'pop'; popHavuz.push(e); }
        e.dataset.bos = '0';
        e.textContent = metin;
        e.classList.toggle('buyuk', !!buyuk);
        e.style.left = p.x + 'px'; e.style.top = p.y + 'px';
        $('efektler').appendChild(e);
        clearTimeout(e._t);
        e._t = setTimeout(() => { e.dataset.bos = '1'; e.remove(); }, 900);
    }

    // ── Parçacıklar: toz bulutu ve şok dalgası (havuzlu) ──
    const tozHavuz = [];
    for (let i = 0; i < 120; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TOZ, transparent: true, depthWrite: false, opacity: 0 }));
        sp.visible = false; sp.userData = { omur: 0, t: 0, vx: 0, vy: 0, vz: 0, boy: 1 };
        scene.add(sp); tozHavuz.push(sp);
    }
    const TOZ_RENK = [lin('#d9cdb8'), lin('#bfb3a0'), lin('#e8e0d0')];
    function tozPatlat(x, z, r, adet, renk) {
        if (AZ_HAREKET) adet = Math.ceil(adet / 2);
        for (let i = 0; i < adet; i++) {
            const sp = tozHavuz.find((p) => !p.visible);
            if (!sp) return;
            const a = Math.random() * PI * 2, hz = r * (1.2 + Math.random());
            sp.visible = true;
            sp.position.set(x + Math.cos(a) * r * 0.6, 2 + Math.random() * r * 0.3, z + Math.sin(a) * r * 0.6);
            sp.material.color.copy(renk || TOZ_RENK[i % 3]);
            sp.material.blending = renk ? THREE.AdditiveBlending : THREE.NormalBlending;
            Object.assign(sp.userData, { omur: 0.55 + Math.random() * 0.3, t: 0, vx: Math.cos(a) * hz, vy: r * (0.8 + Math.random()), vz: Math.sin(a) * hz, boy: r * (0.5 + Math.random() * 0.5) });
        }
    }
    const dalgalar = [];
    // Şok dalgası: d (delik) ya da {x, y, r} izler; süre/büyüme ayarlanır, gecikme ile ikinci halka
    function sokDalgasi(d, renk, sure, buyume, gecikme) {
        const m = new THREE.Mesh(DUZLEM, new THREE.MeshBasicMaterial({ map: DALGA, color: renk || lin('#ffd23f'), transparent: true,
            blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, opacity: 0 }));
        m.position.set(d.x, 2, d.y); m.renderOrder = 6;
        scene.add(m);
        dalgalar.push({ m, d, t: -(gecikme || 0), sure: sure || 0.9, buyume: buyume || 3 });
    }
    function efektGuncelle(dt) {
        for (const sp of tozHavuz) {
            if (!sp.visible) continue;
            const u = sp.userData;
            u.t += dt;
            if (u.t >= u.omur) { sp.visible = false; continue; }
            const k = u.t / u.omur;
            sp.position.x += u.vx * dt; sp.position.y += u.vy * dt; sp.position.z += u.vz * dt;
            u.vx *= 0.92; u.vz *= 0.92; u.vy *= 0.94;
            const s = u.boy * (0.6 + k * 1.2);
            sp.scale.set(s, s, s);
            sp.material.opacity = (1 - k) * 0.75;
        }
        for (let i = dalgalar.length - 1; i >= 0; i--) {
            const w = dalgalar[i];
            w.t += dt;
            if (w.t < 0) continue;
            const k = w.t / w.sure;
            if (k >= 1) { scene.remove(w.m); w.m.material.dispose(); dalgalar.splice(i, 1); continue; }
            const s = w.d.r * 2.2 * (1 + (1 - Math.pow(1 - k, 2)) * w.buyume);
            w.m.scale.set(s, 1, s); w.m.position.set(w.d.x, 2, w.d.y);
            w.m.material.opacity = 1 - k;
        }
    }

    // ── Düşme animasyonu: nesne kenardan devrilir, merkeze kayar, yer çekimiyle düşer ──
    function dusmeBasla(o, d) {
        const dx = d.x - o.x, dz = d.y - o.y;
        const m = Math.hypot(dx, dz) || 1;
        dunya.dusen.push({ o, d, t: 0, x: o.x, z: o.y, ry: o._ry, ex: dz / m, ez: -dx / m, don: (o.tohum - 0.5) * 3, vy: 0, y: 0 });
        dunya.sallanan.delete(o);
    }
    function dusmeGuncelle(dt) {
        const L = dunya.dusen;
        for (let i = L.length - 1; i >= 0; i--) {
            const f = L[i], o = f.o, d = f.d;
            f.t += dt;
            const cek = Math.min(1, dt * (3 + f.t * 6));
            f.x += (d.x - f.x) * cek; f.z += (d.y - f.z) * cek;
            f.vy -= (500 + d.r * 4) * dt;
            f.y += f.vy * dt;
            const egim = Math.min(o.h > d.r ? 2.1 : 1.5, f.t * (o.h > d.r ? 2.6 : 3.4)) + f.don * f.t;   // tepe deliğe doğru devrilir
            const derin = d.r * 2.4 + 40 + o.h;
            if (-f.y > derin || f.t > 2) {
                yerlestir(o, 0, -9999, 0, 0, 0, 1, 0, 0); L.splice(i, 1);
                if (o._yedek) { dunya.bos.get(o._k).push(o._i); o._yedek = false; }     // yuva yeniden kullanılır
                continue;
            }
            yerlestir(o, f.x, f.y, f.z, egim, f.ry, f.ex, f.ez);
        }
    }

    // ── Ses (Web Audio, dosya yok) ──
    const Ses = (() => {
        const { init, tone } = EduKit.audio;
        let kapali = false;
        return {
            init,
            degis() { kapali = !kapali; return kapali; },
            yut(r, kombo, R) {
                if (kapali) return;
                const f = Math.min(1300, 700 / Math.sqrt(r / 6)) * (1 + Math.min(kombo, 12) * 0.04);
                tone(f, 0.07, 'triangle', 0.045);
                // deliğin kendi "yutkunma" sesi: delik büyüdükçe kalınlaşır ve dolgunlaşır
                const g = 260 * Math.pow(16 / Math.max(16, R || 16), 0.35);
                tone(g, 0.12, 'sine', 0.025 + Math.min(0.035, (R || 16) / 5000), 0.01);
                if (r >= 20) { tone(f * 0.5, 0.22, 'sine', 0.07, 0.02); tone(f * 0.25, 0.3, 'sine', 0.05, 0.05); }
            },
            atil() { if (!kapali) { tone(260, 0.16, 'sawtooth', 0.025); tone(520, 0.14, 'triangle', 0.04, 0.04); tone(780, 0.1, 'triangle', 0.03, 0.09); } },
            firlat() { if (!kapali) { tone(880, 0.07, 'triangle', 0.04); tone(660, 0.09, 'triangle', 0.035, 0.06); } },
            hapsu() { if (!kapali) { tone(520, 0.07, 'square', 0.03); tone(640, 0.06, 'square', 0.03, 0.08); tone(330, 0.16, 'triangle', 0.06, 0.2); tone(990, 0.08, 'triangle', 0.04, 0.22); } },
            tonk() { if (!kapali) { tone(150, 0.12, 'sine', 0.06); tone(96, 0.18, 'sine', 0.045, 0.03); } },
            kademe() { if (!kapali) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.065, i * 0.08)); },
            tik(yuksek) { if (!kapali) tone(yuksek ? 988 : 660, 0.1, 'square', 0.035); },
            bitis(y) {
                if (kapali) return;
                (y > 0 ? [523, 659, 784, 1047] : [392, 349, 311]).forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, i * 0.14));
            }
        };
    })();

    // ── Kayıt ──
    const KAYIT = 'obur_ilerleme';
    const NB = C.BOLUMLER.length;
    const ilerleme = { yildiz: new Array(NB).fill(0), enIyi: new Array(NB).fill(0) };
    EduKit.storage.get(KAYIT).then((r) => {
        if (r && r.value) {
            try {
                const v = JSON.parse(r.value);
                for (let i = 0; i < NB; i++) {
                    ilerleme.yildiz[i] = Math.max(0, Math.min(3, (v.yildiz && v.yildiz[i]) | 0));
                    ilerleme.enIyi[i] = Math.max(0, Math.min(1, +(v.enIyi && v.enIyi[i]) || 0));
                }
            } catch (e) { /* bozuk kayıt: sıfırdan */ }
        }
        menuCiz();
    });
    function kaydet() { EduKit.storage.set(KAYIT, JSON.stringify(ilerleme)); }
    function acikMi(i) { return i === 0 || ilerleme.yildiz[i - 1] > 0; }

    // ── Oyun durumu ──
    let durum = 'menu';     // menu | geri | oyun | mola | sonuc
    let s = null, bolumNo = 0, birikim = 0, geriSayim = 0;
    const kam = { x: 0, z: 0, D: 600, sars: 0 };
    let kombo = 0, komboT = 0, hudT = 0, otoPilot = false, biriken = 0, sonPop = -1, sonTonk = -1, finalT = 0, atilIz = 0;
    let istekAtil = false, istekBiber = false;
    const KART = [['#5fbf5a', '#21603a'], ['#7bb4e8', '#2b4d8c'], ['#f0a24b', '#8a4316'], ['#3fa9c9', '#164e66'],
        ['#9a8cff', '#3a2b8c'], ['#ff6f91', '#6b1f48']];

    function hedefD() {
        const r = s ? s.delikler[0].r : 16;
        return (r * 7.5 + 300) * (W < H ? 1.25 : 1);
    }
    function kamerayiOturt(ani) {
        const ben = s.delikler[0];
        if (ani) { kam.x = ben.x; kam.z = ben.y; kam.D = hedefD(); }
    }

    function basla(no) {
        bolumNo = no;
        s = C.oyunKur(no);
        dunyaKur(s);
        kombo = 0; biriken = 0; sonPop = -1; sonTonk = -1; finalT = 0; $('kombo').classList.remove('goster');
        kamerayiOturt(true);
        ekranGoster(null);
        $('hud').hidden = false;
        const h = s.bolum.hedef, olcek = h[2] * 1.15;
        ['esik1', 'esik2', 'esik3'].forEach((id, i) => { $(id).style.left = (h[i] / olcek * 100) + '%'; $(id).classList.remove('dolu'); });
        $('ilerleme').style.width = '0%';
        $('siralama').textContent = '';
        $('btn-biber').hidden = s.delikler.length < 2;      // rakipsiz bölümde biberin işi yok
        istekAtil = istekBiber = false;
        hudGuncelle(true);
        durum = 'geri'; geriSayim = 3.2;
        Ses.init();
    }
    function ekranGoster(id) {
        for (const e of ['menu', 'duraklat', 'sonuc']) $(e).hidden = e !== id;
        if (id) {
            const ilk = $(id).querySelector('button:not([disabled]):not([hidden])');
            if (ilk) ilk.focus({ preventScroll: true });
        }
    }
    function mola() {
        if (durum !== 'oyun' && durum !== 'geri') return;
        durum = 'mola'; ekranGoster('duraklat'); $('geri-sayim').hidden = true;
    }
    function devam() {
        if (durum !== 'mola') return;
        ekranGoster(null); durum = 'geri'; geriSayim = 3.2;
    }
    function bitir() {
        durum = 'sonuc';
        const so = C.sonuc(s);
        if (so.yildiz > ilerleme.yildiz[bolumNo]) ilerleme.yildiz[bolumNo] = so.yildiz;
        if (so.oran > ilerleme.enIyi[bolumNo]) ilerleme.enIyi[bolumNo] = so.oran;
        kaydet();
        Ses.bitis(so.yildiz);
        $('sonuc-baslik').textContent = s.temiz ? 'Şehir tertemiz!' : so.yildiz === 3 ? 'Muhteşem!' : so.yildiz > 0 ? 'Süre doldu, aferin!' : 'Süre doldu!';
        const yz = $('sonuc-yildiz'); yz.textContent = '';
        for (let i = 0; i < 3; i++) { const e = document.createElement(i < so.yildiz ? 'b' : 'span'); e.textContent = '★'; yz.appendChild(e); }
        yz.setAttribute('aria-label', so.yildiz + ' yıldız');
        let metin = 'Şehrin %' + Math.floor(so.oran * 100) + ' kadarını yuttun.';
        if (s.delikler.length > 1) metin += ' Sıran: ' + so.sira + '.';
        if (so.yildiz === 0) metin += ' 1 yıldız için %' + Math.round(s.bolum.hedef[0] * 100) + ' gerekli.';
        else if (so.yildiz === 2 && s.delikler.length > 1 && so.oran >= s.bolum.hedef[2]) metin += ' 3. yıldız için birinci olmalısın!';
        $('sonuc-metin').textContent = metin;
        const liste = $('sonuc-liste'); liste.textContent = '';
        if (s.delikler.length > 1) for (const d of so.sirali) liste.appendChild(siraSatiri(d));
        $('btn-sonraki').hidden = !(bolumNo + 1 < NB && acikMi(bolumNo + 1));
        ekranGoster('sonuc');
        $('hud').hidden = true;
        menuCiz();
    }
    function siraSatiri(d) {
        const li = document.createElement('li');
        if (!d.bot) li.className = 'ben';
        const n = document.createElement('span'); n.className = 'nokta'; n.style.background = d.renk;
        const a = document.createElement('span'); a.textContent = d.ad;
        const p = document.createElement('span'); p.className = 'p'; p.textContent = d.puan;
        li.append(n, a, p);
        return li;
    }
    const hudOnce = { sure: '', yuzde: '', gen: '', sira: '', atil: '', biber: '' };
    function yaz(id, alan, deger, fn) { if (hudOnce[alan] !== deger) { hudOnce[alan] = deger; fn($(id), deger); } }
    function hudGuncelle(hepsi) {
        const ben = s.delikler[0];
        if (hepsi) { hudOnce.sure = hudOnce.yuzde = hudOnce.gen = hudOnce.sira = hudOnce.atil = hudOnce.biber = ''; }
        const k = Math.max(0, Math.ceil(s.kalan));
        yaz('sure', 'sure', Math.floor(k / 60) + ':' + String(k % 60).padStart(2, '0'), (e, v) => { e.textContent = v; e.classList.toggle('az', k <= 10); });
        const oran = ben.puan / s.toplam, h = s.bolum.hedef;
        yaz('yuzde', 'yuzde', '%' + Math.floor(oran * 100), (e, v) => { e.textContent = v; });
        yaz('ilerleme', 'gen', Math.min(100, oran / (h[2] * 1.15) * 100).toFixed(1) + '%', (e, v) => { e.style.width = v; });
        for (let i = 0; i < 3; i++) {
            const e = $('esik' + (i + 1));
            if (oran >= h[i] && !e.classList.contains('dolu')) { e.classList.add('dolu'); if (!hepsi) Ses.kademe(); }
        }
        const atilDolu = (1 - ben.atilBekle / C.ATIL.bekle).toFixed(2);
        yaz('btn-atil', 'atil', atilDolu, (e, v) => { e.style.setProperty('--dolu', v); e.classList.toggle('hazir', v === '1.00'); });
        if (s.delikler.length > 1) {
            const hazir = C.biberHazir(s, ben);
            const bv = hazir ? '1.00' : ben.puan < C.BIBER.enAzPuan ? 'az' : (1 - ben.biberBekle / C.BIBER.bekle).toFixed(2);
            yaz('btn-biber', 'biber', bv, (e, v) => {
                e.style.setProperty('--dolu', v === 'az' ? '0' : v); e.classList.toggle('hazir', hazir); e.classList.toggle('kilit', v === 'az');
                e.setAttribute('aria-label', v === 'az' ? 'Acı biber: önce biraz büyü' : 'Acı biber fırlat (E tuşu)');
            });
        }
        if (s.delikler.length > 1 && (hepsi || hudT <= 0)) {
            hudT = 0.3;
            const sirali = s.delikler.slice().sort((a, b) => b.puan - a.puan);
            const imza = sirali.map((d) => d.ad + d.puan).join('|');
            if (imza !== hudOnce.sira) {
                hudOnce.sira = imza;
                const ol = $('siralama');
                if (hepsi || !ol._satir || ol._s !== s) { ol.textContent = ''; ol._satir = new Map(); ol._s = s; }
                for (const d of sirali) {
                    let li = ol._satir.get(d);
                    if (!li) { li = siraSatiri(d); ol._satir.set(d, li); }
                    const p = li.lastChild; if (p.textContent !== String(d.puan)) p.textContent = d.puan;
                    ol.appendChild(li);       // mevcut düğüm yalnızca yer değiştirir
                }
            }
        }
    }

    // ── Girdi ──
    const tuslar = new Set();
    const fare = { x: 0, y: 0, aktif: false };
    const kol = { aktif: false, id: null, x0: 0, y0: 0, dx: 0, dy: 0 };
    const TUS = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
    window.addEventListener('keydown', (e) => {
        if (TUS[e.code]) { tuslar.add(e.code); fare.aktif = false; if (durum === 'oyun' || durum === 'geri') e.preventDefault(); }
        if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { if (durum === 'mola') devam(); else mola(); }
        if (durum === 'oyun' && !e.repeat) {
            if (e.code === 'Space') { istekAtil = true; e.preventDefault(); }
            if (e.code === 'KeyE' || e.code === 'KeyB') istekBiber = true;
        }
    });
    for (const [id, f] of [['btn-atil', () => { istekAtil = true; }], ['btn-biber', () => { istekBiber = true; }]]) {
        $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); Ses.init(); if (durum === 'oyun') f(); });
        $(id).addEventListener('click', (e) => { if (e.detail === 0 && durum === 'oyun') f(); });   // klavyeyle (Enter) basış
    }
    window.addEventListener('keyup', (e) => tuslar.delete(e.code));
    window.addEventListener('blur', () => tuslar.clear());
    const parmaklar = new Map();     // ekrandaki tüm parmaklar: id → {x, y}
    function fareKonum(e) {          // imleç tuval içi piksel (adım başına getBoundingClientRect yok)
        const r = cv.getBoundingClientRect();
        fare.aktif = true; fare.x = e.clientX - r.left; fare.y = e.clientY - r.top;
    }
    function kolBasla(id, x, y) {
        kol.aktif = true; kol.id = id; kol.x0 = x; kol.y0 = y; kol.dx = 0; kol.dy = 0;
        const k = $('kol'); k.hidden = false; k.style.left = x + 'px'; k.style.top = y + 'px';
        $('kol-top').style.transform = '';
    }
    cv.addEventListener('pointerdown', (e) => {
        Ses.init();
        if (e.pointerType === 'mouse') { fareKonum(e); return; }
        parmaklar.set(e.pointerId, { x: e.clientX, y: e.clientY });
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* yok */ }
        if (!kol.aktif) kolBasla(e.pointerId, e.clientX, e.clientY);
    });
    cv.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'mouse') { fareKonum(e); return; }
        const pp = parmaklar.get(e.pointerId); if (pp) { pp.x = e.clientX; pp.y = e.clientY; }
        if (!kol.aktif || e.pointerId !== kol.id) return;
        let dx = e.clientX - kol.x0, dy = e.clientY - kol.y0;
        const m = Math.hypot(dx, dy), max = 50, olu = 8;
        if (m > max) { dx = dx / m * max; dy = dy / m * max; }
        const g = m < olu ? 0 : Math.min(1, (m - olu) / (max - olu));     // küçük titremeler deliği kaydırmaz
        const mm = Math.min(m, max) || 1;
        kol.dx = dx / mm * g; kol.dy = dy / mm * g;
        $('kol-top').style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    function kolBirak(e) {
        if (e.pointerType === 'mouse') return;
        parmaklar.delete(e.pointerId);
        if (e.pointerId !== kol.id) return;
        kol.aktif = false; kol.dx = 0; kol.dy = 0; $('kol').hidden = true;
        // ekranda başka parmak kaldıysa kolu o devralır (çocuklar ikinci parmağı sık dayar)
        for (const [id, p] of parmaklar) { kolBasla(id, p.x, p.y); break; }
    }
    cv.addEventListener('pointerup', kolBirak);
    cv.addEventListener('pointercancel', kolBirak);
    cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') fare.aktif = false; });

    function girdi() {
        const g = yonGirdi();
        if (istekAtil) { g.atil = true; istekAtil = false; }
        if (istekBiber) { g.biber = true; istekBiber = false; }
        return g;
    }
    function yonGirdi() {
        if (otoPilot) return C.botYon(s, s.delikler[0]);
        let gx = 0, gy = 0;
        for (const k of tuslar) { const v = TUS[k]; if (v) { gx += v[0]; gy += v[1]; } }
        if (gx || gy) { const m = Math.hypot(gx, gy); return { dx: gx / m, dy: gy / m }; }
        if (kol.aktif) return { dx: kol.dx, dy: kol.dy };
        if (fare.aktif) {
            // imlecin zemindeki noktasına doğru (perspektif doğru)
            // ekran uzayında: imleç deliğin üstündeyse delik durur (kamera takip etse de sürünmez)
            const ben = s.delikler[0];
            const m0 = ekranda(ben.x, 0, ben.y), m1 = ekranda(ben.x + ben.r, 0, ben.y);
            const rpx = Math.max(6, Math.abs(m1.x - m0.x));
            const dx = fare.x - m0.x, dy = (fare.y - m0.y) / 0.83;   // dikey ekran mesafesi eğimle kısalır
            const m = Math.hypot(dx, dy);
            const olu = rpx * 0.55;
            if (m < olu) return { dx: 0, dy: 0 };
            const g = Math.min(1, (m - olu) / (rpx * 0.8 + 70));
            return { dx: dx / m * g, dy: dy / m * g };
        }
        return { dx: 0, dy: 0 };
    }

    // ── Döngü ──
    function olaylariIsle() {
        const ben = s.delikler[0];
        for (const e of s.olaylar) {
            if (e.tur === 'yut') {
                dusmeBasla(e.nesne, e.delik);
                const v = dunya.delik.get(e.delik);
                if (v) v.nabiz = Math.min(1, v.nabiz + 0.3 + e.nesne.r / 60);
                const nr = e.nesne.r;
                if (nr >= 20) tozPatlat(e.nesne.x, e.nesne.y, nr * 0.7, nr >= 76 ? 18 : nr >= 40 ? 12 : 5);
                if (e.delik !== ben || durum === 'menu') continue;
                kombo++; komboT = 0.8;
                Ses.yut(nr, kombo, ben.r);
                if (kombo >= 3) komboGoster(kombo);
                if (e.nesne.p >= 20) kam.sars = Math.min(1, kam.sars + e.nesne.p / 80 + e.nesne.h / 400);
                if (nr >= 40) sokDalgasi({ x: e.nesne.x, y: e.nesne.y, r: nr * 0.6 }, TOZ_RENK[2], 0.6, 1.6);
                // uçan puanlar birikir: en çok 0,15 sn'de bir, toplamı gösterir (art arda yutmada üst üste binmez)
                biriken += e.nesne.p;
                if (s.t - sonPop >= 0.35 || e.nesne.p >= 40) {
                    puanUcur(e.nesne.x, e.nesne.h * 0.8, e.nesne.y, '+' + biriken, biriken >= 20);
                    biriken = 0; sonPop = s.t;
                }
            } else if (e.tur === 'biber') {
                biberGorsel(e.biber);
                if (e.delik === ben) { Ses.firlat(); puanUcur(ben.x, 10, ben.y, '−' + e.maliyet, false); }
                else if (durum !== 'menu' && ekranda(e.biber.x, 0, e.biber.y).gorunur) Ses.firlat();   // rakip attı: duy ve kaç
            } else if (e.tur === 'biberBitti') {
                biberSil(e.biber);
            } else if (e.tur === 'hapsu') {
                biberSil(e.biber);
                const d = e.delik;
                tozPatlat(d.x, d.y, d.r * 0.9, 16, lin('#ff7a5c'));
                for (const o of e.nesneler) sacilanEkle(o);
                const v = dunya.delik.get(d);
                if (v) { v.nabiz = 1; v.parla = 0.6; }
                const p = ekranda(d.x, 0, d.y);
                if (p.gorunur && durum !== 'menu') {
                    Ses.hapsu();
                    puanUcur(d.x, 30, d.y, 'Hapşu! −' + e.kayip, true);
                    kam.sars = Math.min(1, kam.sars + (d === ben ? 0.6 : 0.25));
                }
            } else if (e.tur === 'atil' && e.delik === ben) {
                Ses.atil();
                const v = dunya.delik.get(ben);
                if (v) v.parla = Math.max(v.parla, 0.5);
            } else if (e.tur === 'carp' && e.delik === ben && durum === 'oyun') {
                // "bu çok büyük" geri bildirimi: yumuşak tonk (en çok 0,3 sn'de bir)
                if (s.t - sonTonk > 0.3) { Ses.tonk(); sonTonk = s.t; }
            } else if (e.tur === 'kademe' && e.delik === ben && durum !== 'menu' && dunya.tipler.has(e.tip)) {
                Ses.kademe();
                sokDalgasi(ben, null, 0.9, 3);
                sokDalgasi(ben, lin('#fff4c2'), 0.9, 2.2, 0.18);
                tozPatlat(ben.x, ben.y, ben.r, 16, lin('#ffd23f'));
                const v = dunya.delik.get(ben);
                if (v) { v.parla = 1; v.nabiz = 1; }
                const p = ekranda(ben.x, 0, ben.y);
                $('flas').style.setProperty('--fx', p.x + 'px'); $('flas').style.setProperty('--fy', p.y + 'px');
                afis('Artık ' + e.ad + ' yutabilirsin!');
            }
        }
    }
    function komboGoster(n) {
        const k = $('kombo');
        k.textContent = 'Kombo ×' + n;
        k.classList.add('goster');
        if (k.animate && !AZ_HAREKET) k.animate([{ transform: 'translateX(-50%) scale(1.35)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 180, easing: 'ease-out' });
    }
    function afis(metin) {
        const a = $('afis');
        a.textContent = metin;
        a.classList.remove('goster'); void a.offsetWidth; a.classList.add('goster');
        const f = $('flas'); f.classList.remove('goster'); void f.offsetWidth; f.classList.add('goster');
    }

    function sahneGuncelle(zaman, dt) {
        if (!dunya) return;
        // hareketli araçlar ve sallanan büyük nesneler
        for (const o of s.nesneler) {
            if (o.dusen) continue;
            if (o.surer) { o._ry = yonAci(o); yerlestir(o, o.x, 0, o.y, 0, o._ry); }
            else if (o.sallan > 0 && !AZ_HAREKET) {
                dunya.sallanan.add(o);
                yerlestir(o, o.x, 0, o.y, Math.sin(zaman * 22 + o.tohum * 9) * 0.07 * o.sallan, o._ry, 1, 0.4);
            } else if (dunya.sallanan.has(o)) {
                dunya.sallanan.delete(o); yerlestir(o, o.x, 0, o.y, 0, o._ry);
            }
        }
        ucanGuncelle(dt);
        biberGuncelle(dt);
        const ben0 = s.delikler[0];
        if (ben0.atilT > 0 && !AZ_HAREKET && dt > 0) {
            atilIz -= dt;
            if (atilIz <= 0) { atilIz = 0.05; tozPatlat(ben0.x - ben0.vx * 0.1, ben0.y - ben0.vy * 0.1, ben0.r * 0.45, 2, lin('#bfe3ff')); }
        }
        dusmeGuncelle(dt);
        for (const d of s.delikler) {
            delikGuncelle(d, zaman, dt);
            const v = dunya.delik.get(d);
            if (v && v.etiket) {
                const p = ekranda(d.x, 4, d.y - d.r * 1.05);
                v.etiket.style.display = p.gorunur ? '' : 'none';
                v.etiket.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px) translate(-50%,-100%)';
            }
        }
        // kamera: yumuşak takip + hafif ileri bakış + sarsıntı
        const ben = s.delikler[0];
        const yum = Math.min(1, dt * 5);
        kam.D += (hedefD() - kam.D) * Math.min(1, dt * 1.4);
        // görünen zemin yarı-genişliği/derinliği (eğim ~56°): kamera haritanın dışını göstermesin
        const th = Math.tan(kamera.fov * PI / 360);
        const yx = kam.D * th * (W / H), yz = kam.D * th * 1.15, pay = 70;
        const sinir = (v, yari, boy) => (yari * 2 > boy + pay * 2 ? boy / 2 : Math.max(yari - pay, Math.min(boy - yari + pay, v)));
        kam.x += (sinir(ben.x + ben.vx * 0.25, yx, s.W) - kam.x) * yum;
        kam.z += (sinir(ben.y + ben.vy * 0.25, yz, s.H) - kam.z) * yum;
        kam.sars = Math.max(0, kam.sars - dt * 2.5);
        const sx = AZ_HAREKET ? 0 : (Math.random() - 0.5) * kam.sars * kam.D * 0.012;
        const sz = AZ_HAREKET ? 0 : (Math.random() - 0.5) * kam.sars * kam.D * 0.012;
        const egim = 0.98;
        kamera.position.set(kam.x + sx, Math.sin(egim) * kam.D, kam.z + Math.cos(egim) * kam.D + sz);
        kamera.lookAt(kam.x + sx, 0, kam.z + sz - kam.D * 0.04);
        scene.fog.near = kam.D * 0.95; scene.fog.far = kam.D * 2.6;
        // gölge kamerası oyuncuyu izler
        const gk = kam.D * 1.15;
        const sc = gunes.shadow.camera;
        if (Math.abs(sc.right - gk) > 1) {
            sc.left = -gk; sc.right = gk; sc.top = gk; sc.bottom = -gk;
            sc.near = 10; sc.far = kam.D * 6; sc.updateProjectionMatrix();
        }
        gunes.target.position.set(kam.x, 0, kam.z - kam.D * 0.2);
        gunes.position.copy(gunes.target.position).addScaledVector(GUNES_YON, kam.D * 2.5);
        efektGuncelle(dt);
    }

    function guncelle(dt) {
        if (durum === 'geri') {
            const once = Math.ceil(geriSayim);
            geriSayim -= dt;
            const gs = $('geri-sayim');
            if (geriSayim <= 0.2) { gs.hidden = true; durum = 'oyun'; Ses.tik(true); }
            else {
                const n = Math.ceil(geriSayim - 0.2);
                gs.hidden = false; gs.textContent = n > 0 ? n : 'Başla!';
                if (Math.ceil(geriSayim) !== once) Ses.tik(false);
            }
        }
        if (durum === 'oyun') {
            birikim += dt;
            let adimSay = 0;
            while (birikim >= DT && adimSay < 5) {
                C.adim(s, girdi(), DT);
                olaylariIsle();
                birikim -= DT; adimSay++;
                if (s.bitti) break;
            }
            if (adimSay >= 5) birikim = 0;
            hudT -= dt; komboT -= dt;
            if (komboT <= 0 && kombo) { kombo = 0; $('kombo').classList.remove('goster'); }
            hudGuncelle(false);
            if (s.bitti) {
                if (!s.temiz) bitir();
                else if (finalT === 0) {
                    // şehrin hepsi yutuldu: kısa kutlama, sonra sonuç ekranı
                    const ben = s.delikler[0];
                    finalT = 1.8;
                    Ses.kademe();
                    sokDalgasi(ben, null, 1.2, 4);
                    sokDalgasi(ben, lin('#fff4c2'), 1.2, 3, 0.2);
                    tozPatlat(ben.x, ben.y, ben.r * 1.2, 24, lin('#ffd23f'));
                    afis('Şehir tertemiz! Hepsini yuttun!');
                } else if (finalT > 0) {
                    finalT -= dt;
                    if (finalT <= 0) { finalT = -1; bitir(); }
                }
            }
        }
    }

    let oncekiT = 0, menuS = null, sahneZamani = 0;
    function kare(tms) {
        const zaman = tms / 1000;
        const dt = oncekiT ? Math.min(0.1, zaman - oncekiT) : 0;
        oncekiT = zaman;
        if (durum === 'menu' && s) {
            // menü arkasında bölüm 1 kendi kendine oynar
            C.adim(s, C.botYon(s, s.delikler[0]), Math.min(dt, 1 / 30));
            olaylariIsle();
            if (s.bitti || s.kalan < 5) { demoKur(); }
        } else if (durum === 'geri' || durum === 'oyun') {
            guncelle(dt);
        }
        if (durum !== 'mola') sahneZamani = zaman;
        if (s && dunya) sahneGuncelle(sahneZamani, durum === 'mola' ? 0 : dt);
        renderer.render(scene, kamera);
        requestAnimationFrame(kare);
    }
    function demoKur() {
        menuS = C.oyunKur(0);
        menuS.kalan = 70;
        s = menuS;
        dunyaKur(s);
        kamerayiOturt(true);
    }

    // ── Menü ──
    function menuCiz() {
        const kap = $('bolumler'); kap.textContent = '';
        C.BOLUMLER.forEach((b, i) => {
            const acik = acikMi(i);
            const k = document.createElement('button');
            k.type = 'button'; k.className = 'bolum-kart'; k.setAttribute('role', 'listitem');
            k.style.setProperty('--k1', KART[i][0]); k.style.setProperty('--k2', KART[i][1]);
            k.disabled = !acik;
            const no = document.createElement('span'); no.className = 'bk-no'; no.textContent = 'Bölüm ' + (i + 1);
            const ad = document.createElement('span'); ad.className = 'bk-ad'; ad.textContent = b.ad;
            const bilgi = document.createElement('span'); bilgi.className = 'bk-bilgi';
            bilgi.textContent = (b.rakip ? b.rakip + ' rakip · ' : 'Tek başına · ') + Math.round(b.sure / 60 * 10) / 10 + ' dk';
            const yz = document.createElement('span'); yz.className = 'bk-yildiz';
            for (let j = 0; j < 3; j++) { const e = document.createElement(j < ilerleme.yildiz[i] ? 'b' : 'span'); e.textContent = '★'; yz.appendChild(e); }
            k.append(no, ad, bilgi, yz);
            if (!acik) {
                const kl = document.createElement('span'); kl.className = 'bk-kilit'; kl.textContent = '🔒'; k.appendChild(kl);
                k.setAttribute('aria-label', 'Bölüm ' + (i + 1) + ' ' + b.ad + ', kilitli: önceki bölümden 1 yıldız al');
            } else {
                k.setAttribute('aria-label', 'Bölüm ' + (i + 1) + ' ' + b.ad + ', ' + ilerleme.yildiz[i] + ' yıldız');
                k.addEventListener('click', () => basla(i));
            }
            kap.appendChild(k);
        });
    }
    function menuyeDon() {
        durum = 'menu'; $('hud').hidden = true; $('geri-sayim').hidden = true;
        demoKur();
        menuCiz(); ekranGoster('menu');
    }

    $('btn-devam').addEventListener('click', devam);
    $('btn-yeniden').addEventListener('click', () => basla(bolumNo));
    $('btn-menu1').addEventListener('click', menuyeDon);
    $('btn-menu2').addEventListener('click', menuyeDon);
    $('btn-tekrar').addEventListener('click', () => basla(bolumNo));
    $('btn-sonraki').addEventListener('click', () => basla(bolumNo + 1));
    $('btn-duraklat').addEventListener('click', () => { if (durum === 'mola') devam(); else mola(); });
    $('btn-ses').addEventListener('click', (e) => {
        const kapali = Ses.degis();
        e.currentTarget.setAttribute('aria-pressed', String(kapali));
        e.currentTarget.setAttribute('aria-label', kapali ? 'Sesi aç' : 'Sesi kapat');
    });
    EduKit.onHidden(mola);

    // Geliştirme/duman kancası
    window.__ob = {
        oyna: (no) => basla(no | 0),
        oto: (acik) => { otoPilot = !!acik; },
        durum: () => ({ durum, bolum: bolumNo, kalan: s && s.kalan, puan: s && s.delikler[0].puan, r: s && s.delikler[0].r,
            cizim: renderer.info.render.calls, ucgen: renderer.info.render.triangles,
            x: s && s.delikler[0].x, y: s && s.delikler[0].y, W: s && s.W, kam: { x: kam.x, z: kam.z, D: kam.D, fov: kamera.fov } }),
        olc: (n) => {     // GPU dahil kare süresi (ms): n kare art arda çiz, GPU'yu bekle
            const gl = renderer.getContext(); n = n || 20;
            const a = performance.now();
            for (let i = 0; i < n; i++) renderer.render(scene, kamera);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
            return Math.round((performance.now() - a) / n * 10) / 10;
        },
        dongu: (n, dt) => { for (let i = 0; i < (n || 1); i++) guncelle(dt || 1 / 60); },   // test: kare döngüsünü elle ilerlet
        hizlandir: (sn) => {     // test: oyunu ve sahneyi eşzamanlı ilerlet (arka planda kısılan sekmede de)
            if (!s) return;
            if (durum === 'geri') { durum = 'oyun'; $('geri-sayim').hidden = true; }
            if (durum !== 'oyun') return;
            const t0 = performance.now() / 1000;
            for (let i = 0; i < sn * 60 && !s.bitti; i++) {
                C.adim(s, girdi(), DT); olaylariIsle(); hudGuncelle(false);
                if (i % 2 === 0) sahneGuncelle(t0 + i * DT, DT * 2);
            }
            for (let i = 0; i < 40; i++) sahneGuncelle(t0 + sn + i / 60, 1 / 60);
            renderer.render(scene, kamera);
        }
    };

    if (DOKUN) {     // dokunmatik cihazda yalnız dokunma ipucu
        const ip = document.querySelector('#menu .ipucu');
        if (ip) { ip.textContent = ''; const b = document.createElement('b'); b.textContent = 'Parmağını ekranda kaydır:'; ip.append(b, ' delik o yöne gider. Parmağını kaldırınca durur. ⚡ düğmesi hızlı atılır, 🌶️ düğmesi rakiplere acı biber fırlatır.'); }
    }
    demoKur();
    menuCiz();
    requestAnimationFrame(kare);
})();
