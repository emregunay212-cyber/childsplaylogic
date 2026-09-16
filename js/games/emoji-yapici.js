/* ============================================
   OYUN: Emoji Yapıcı (Emoji Builder benzeri)
   Yüz parçalarını (göz, ağız, kaş, aksesuar) seçip
   birleştirerek özgün emoji/yüz oluştur. Tüm parçalar
   SVG ile çizilir (hazır emoji karakteri kullanılmaz).
   ============================================ */

const EmojiYapici = (() => {
    const id = 'emoji-yapici';
    const levels = [{}];
    const svgNS = 'http://www.w3.org/2000/svg';
    const STROKE = '#2b2b2b';

    // Yüz rengi paleti
    const COLORS = [
        '#FFD93D', '#FFB04D', '#FF8FAB', '#B5E48C',
        '#A0C4FF', '#BDB2FF', '#FF6B6B', '#7BDFF2',
        '#FF9F1C', '#06D6A0', '#EF476F', '#C77DFF',
        '#FFADAD', '#48CAE4', '#F15BB5', '#9EE493',
    ];

    // ---- SVG yardımcı path üreticileri ----
    function heartPath(cx, cy, s) {
        return `M${cx},${cy + s * 0.95} C${cx - s * 1.5},${cy - s * 0.5} ${cx - s * 0.55},${cy - s * 1.4} ${cx},${cy - s * 0.45} C${cx + s * 0.55},${cy - s * 1.4} ${cx + s * 1.5},${cy - s * 0.5} ${cx},${cy + s * 0.95} Z`;
    }
    function starPath(cx, cy, r) {
        let p = '';
        for (let i = 0; i < 10; i++) {
            const ang = -Math.PI / 2 + i * Math.PI / 5;
            const rr = i % 2 === 0 ? r : r * 0.45;
            const x = (cx + Math.cos(ang) * rr).toFixed(1);
            const y = (cy + Math.sin(ang) * rr).toFixed(1);
            p += (i === 0 ? 'M' : 'L') + x + ',' + y;
        }
        return p + 'Z';
    }

    // ---- Parça setleri ---- (her parça: draw = [[tag, attrs], ...])
    const SHAPES = [
        { name: 'Yuvarlak', draw: [['circle', { cx: 100, cy: 105, r: 78 }]] },
        { name: 'Oval', draw: [['ellipse', { cx: 100, cy: 104, rx: 66, ry: 82 }]] },
        { name: 'Geniş', draw: [['ellipse', { cx: 100, cy: 108, rx: 84, ry: 70 }]] },
        { name: 'Kare', draw: [['rect', { x: 28, y: 36, width: 144, height: 142, rx: 38 }]] },
        { name: 'Yumurta', draw: [['ellipse', { cx: 100, cy: 108, rx: 60, ry: 84 }]] },
        { name: 'Kalp', draw: [['path', { d: 'M100,176 C44,134 32,82 58,58 C78,40 100,52 100,74 C100,52 122,40 142,58 C168,82 156,134 100,176 Z' }]] },
    ];

    const EYES = [
        { name: 'Nokta', draw: [
            ['circle', { cx: 72, cy: 92, r: 8, fill: STROKE }],
            ['circle', { cx: 128, cy: 92, r: 8, fill: STROKE }],
        ]},
        { name: 'İri', draw: [
            ['circle', { cx: 72, cy: 92, r: 15, fill: '#fff', stroke: STROKE, 'stroke-width': 2 }],
            ['circle', { cx: 74, cy: 94, r: 8, fill: STROKE }],
            ['circle', { cx: 70, cy: 89, r: 3, fill: '#fff' }],
            ['circle', { cx: 128, cy: 92, r: 15, fill: '#fff', stroke: STROKE, 'stroke-width': 2 }],
            ['circle', { cx: 130, cy: 94, r: 8, fill: STROKE }],
            ['circle', { cx: 126, cy: 89, r: 3, fill: '#fff' }],
        ]},
        { name: 'Kapalı', draw: [
            ['path', { d: 'M60,94 Q72,84 84,94', fill: 'none', stroke: STROKE, 'stroke-width': 4, 'stroke-linecap': 'round' }],
            ['path', { d: 'M116,94 Q128,84 140,94', fill: 'none', stroke: STROKE, 'stroke-width': 4, 'stroke-linecap': 'round' }],
        ]},
        { name: 'Kalp', draw: [
            ['path', { d: heartPath(72, 90, 9), fill: '#FF4D6D' }],
            ['path', { d: heartPath(128, 90, 9), fill: '#FF4D6D' }],
        ]},
        { name: 'Yıldız', draw: [
            ['path', { d: starPath(72, 92, 12), fill: '#FFD93D', stroke: '#E0A800', 'stroke-width': 1 }],
            ['path', { d: starPath(128, 92, 12), fill: '#FFD93D', stroke: '#E0A800', 'stroke-width': 1 }],
        ]},
        { name: 'Şaşkın', draw: [
            ['circle', { cx: 72, cy: 92, r: 13, fill: '#fff', stroke: STROKE, 'stroke-width': 2 }],
            ['circle', { cx: 72, cy: 92, r: 5, fill: STROKE }],
            ['circle', { cx: 128, cy: 92, r: 13, fill: '#fff', stroke: STROKE, 'stroke-width': 2 }],
            ['circle', { cx: 128, cy: 92, r: 5, fill: STROKE }],
        ]},
        { name: 'Göz Kırpma', draw: [
            ['circle', { cx: 72, cy: 92, r: 8, fill: STROKE }],
            ['path', { d: 'M116,92 Q128,84 140,92', fill: 'none', stroke: STROKE, 'stroke-width': 4, 'stroke-linecap': 'round' }],
        ]},
        { name: 'Uykulu', draw: [
            ['path', { d: 'M60,90 Q72,86 84,90', fill: 'none', stroke: STROKE, 'stroke-width': 3, 'stroke-linecap': 'round' }],
            ['circle', { cx: 72, cy: 95, r: 5, fill: STROKE }],
            ['path', { d: 'M116,90 Q128,86 140,90', fill: 'none', stroke: STROKE, 'stroke-width': 3, 'stroke-linecap': 'round' }],
            ['circle', { cx: 128, cy: 95, r: 5, fill: STROKE }],
        ]},
        { name: 'Çarpı', draw: [
            ['path', { d: 'M64,85 L80,99 M80,85 L64,99', fill: 'none', stroke: STROKE, 'stroke-width': 4, 'stroke-linecap': 'round' }],
            ['path', { d: 'M120,85 L136,99 M136,85 L120,99', fill: 'none', stroke: STROKE, 'stroke-width': 4, 'stroke-linecap': 'round' }],
        ]},
        { name: 'Ağlamaklı', draw: [
            ['circle', { cx: 72, cy: 90, r: 13, fill: '#fff', stroke: STROKE, 'stroke-width': 2 }],
            ['circle', { cx: 72, cy: 92, r: 7, fill: STROKE }],
            ['path', { d: 'M70,104 Q67,118 72,119 Q77,118 74,104 Z', fill: '#7BDFF2' }],
            ['circle', { cx: 128, cy: 90, r: 13, fill: '#fff', stroke: STROKE, 'stroke-width': 2 }],
            ['circle', { cx: 128, cy: 92, r: 7, fill: STROKE }],
            ['path', { d: 'M126,104 Q123,118 128,119 Q133,118 130,104 Z', fill: '#7BDFF2' }],
        ]},
        { name: 'Kocaman', draw: [
            ['circle', { cx: 72, cy: 92, r: 18, fill: '#fff', stroke: STROKE, 'stroke-width': 2 }],
            ['circle', { cx: 73, cy: 94, r: 11, fill: STROKE }],
            ['circle', { cx: 68, cy: 88, r: 4, fill: '#fff' }],
            ['circle', { cx: 128, cy: 92, r: 18, fill: '#fff', stroke: STROKE, 'stroke-width': 2 }],
            ['circle', { cx: 129, cy: 94, r: 11, fill: STROKE }],
            ['circle', { cx: 124, cy: 88, r: 4, fill: '#fff' }],
        ]},
    ];

    const MOUTHS = [
        { name: 'Gülümseme', draw: [['path', { d: 'M72,132 Q100,154 128,132', fill: 'none', stroke: STROKE, 'stroke-width': 5, 'stroke-linecap': 'round' }]] },
        { name: 'Kahkaha', draw: [
            ['path', { d: 'M70,128 Q100,136 130,128 Q120,162 100,162 Q80,162 70,128 Z', fill: '#7a2233' }],
            ['path', { d: 'M80,131 Q100,134 120,131 Q112,141 100,141 Q88,141 80,131 Z', fill: '#fff' }],
        ]},
        { name: 'Üzgün', draw: [['path', { d: 'M72,146 Q100,128 128,146', fill: 'none', stroke: STROKE, 'stroke-width': 5, 'stroke-linecap': 'round' }]] },
        { name: 'Şaşkın', draw: [['ellipse', { cx: 100, cy: 142, rx: 13, ry: 17, fill: '#7a2233' }]] },
        { name: 'Dil', draw: [
            ['path', { d: 'M74,130 Q100,150 126,130', fill: 'none', stroke: STROKE, 'stroke-width': 5, 'stroke-linecap': 'round' }],
            ['ellipse', { cx: 100, cy: 147, rx: 11, ry: 9, fill: '#FF7A99' }],
        ]},
        { name: 'Düz', draw: [['line', { x1: 76, y1: 140, x2: 124, y2: 140, stroke: STROKE, 'stroke-width': 5, 'stroke-linecap': 'round' }]] },
        { name: 'Sırıtış', draw: [
            ['path', { d: 'M68,130 Q100,152 132,130 Q100,150 68,130 Z', fill: '#fff', stroke: STROKE, 'stroke-width': 2 }],
            ['line', { x1: 84, y1: 134, x2: 84, y2: 145, stroke: STROKE, 'stroke-width': 1.5 }],
            ['line', { x1: 100, y1: 136, x2: 100, y2: 148, stroke: STROKE, 'stroke-width': 1.5 }],
            ['line', { x1: 116, y1: 134, x2: 116, y2: 145, stroke: STROKE, 'stroke-width': 1.5 }],
        ]},
        { name: 'Öpücük', draw: [['path', { d: 'M90,138 Q100,128 110,138 Q100,148 90,138 Z', fill: '#FF7A99' }]] },
        { name: 'Büyük Gülüş', draw: [
            ['path', { d: 'M66,127 Q100,172 134,127 Z', fill: '#7a2233' }],
            ['path', { d: 'M76,130 Q100,138 124,130 Q112,142 100,142 Q88,142 76,130 Z', fill: '#fff' }],
        ]},
        { name: 'Dalgalı', draw: [['path', { d: 'M70,138 Q82,131 94,138 Q106,145 118,138 Q126,133 132,137', fill: 'none', stroke: STROKE, 'stroke-width': 4, 'stroke-linecap': 'round' }]] },
        { name: 'Küçük O', draw: [['circle', { cx: 100, cy: 140, r: 8, fill: '#7a2233' }]] },
    ];

    const BROWS = [
        { name: 'Yok', draw: [] },
        { name: 'Düz', draw: [
            ['rect', { x: 60, y: 68, width: 26, height: 5, rx: 2, fill: STROKE }],
            ['rect', { x: 114, y: 68, width: 26, height: 5, rx: 2, fill: STROKE }],
        ]},
        { name: 'Mutlu', draw: [
            ['path', { d: 'M60,73 Q73,64 86,71', fill: 'none', stroke: STROKE, 'stroke-width': 5, 'stroke-linecap': 'round' }],
            ['path', { d: 'M114,71 Q127,64 140,73', fill: 'none', stroke: STROKE, 'stroke-width': 5, 'stroke-linecap': 'round' }],
        ]},
        { name: 'Kızgın', draw: [
            ['path', { d: 'M60,66 L86,75', fill: 'none', stroke: STROKE, 'stroke-width': 5, 'stroke-linecap': 'round' }],
            ['path', { d: 'M140,66 L114,75', fill: 'none', stroke: STROKE, 'stroke-width': 5, 'stroke-linecap': 'round' }],
        ]},
        { name: 'Kalın', draw: [
            ['rect', { x: 58, y: 64, width: 30, height: 8, rx: 4, fill: STROKE }],
            ['rect', { x: 112, y: 64, width: 30, height: 8, rx: 4, fill: STROKE }],
        ]},
        { name: 'Endişeli', draw: [
            ['path', { d: 'M60,70 Q73,77 86,73', fill: 'none', stroke: STROKE, 'stroke-width': 5, 'stroke-linecap': 'round' }],
            ['path', { d: 'M114,73 Q127,77 140,70', fill: 'none', stroke: STROKE, 'stroke-width': 5, 'stroke-linecap': 'round' }],
        ]},
        { name: 'İnce', draw: [
            ['path', { d: 'M62,71 Q73,67 84,70', fill: 'none', stroke: STROKE, 'stroke-width': 3, 'stroke-linecap': 'round' }],
            ['path', { d: 'M116,70 Q127,67 138,71', fill: 'none', stroke: STROKE, 'stroke-width': 3, 'stroke-linecap': 'round' }],
        ]},
    ];

    const ACCESSORIES = [
        { name: 'Yok', draw: [] },
        { name: 'Gözlük', draw: [
            ['circle', { cx: 72, cy: 92, r: 20, fill: 'none', stroke: '#3b3b3b', 'stroke-width': 3 }],
            ['circle', { cx: 128, cy: 92, r: 20, fill: 'none', stroke: '#3b3b3b', 'stroke-width': 3 }],
            ['line', { x1: 92, y1: 92, x2: 108, y2: 92, stroke: '#3b3b3b', 'stroke-width': 3 }],
        ]},
        { name: 'Güneş Gözlüğü', draw: [
            ['rect', { x: 52, y: 80, width: 40, height: 24, rx: 8, fill: '#222' }],
            ['rect', { x: 108, y: 80, width: 40, height: 24, rx: 8, fill: '#222' }],
            ['line', { x1: 92, y1: 88, x2: 108, y2: 88, stroke: '#222', 'stroke-width': 4 }],
        ]},
        { name: 'Şapka', draw: [
            ['path', { d: 'M42,54 Q100,18 158,54 L158,60 L42,60 Z', fill: '#E63946' }],
            ['rect', { x: 34, y: 57, width: 132, height: 9, rx: 4, fill: '#C1121F' }],
        ]},
        { name: 'Taç', draw: [
            ['path', { d: 'M55,54 L70,30 L85,48 L100,26 L115,48 L130,30 L145,54 Z', fill: '#FFD93D', stroke: '#E0A800', 'stroke-width': 2 }],
            ['circle', { cx: 100, cy: 26, r: 4, fill: '#FF6B6B' }],
        ]},
        { name: 'Pembe Yanak', draw: [
            ['circle', { cx: 56, cy: 120, r: 11, fill: '#FF8FAB', opacity: 0.55 }],
            ['circle', { cx: 144, cy: 120, r: 11, fill: '#FF8FAB', opacity: 0.55 }],
        ]},
        { name: 'Fiyonk', draw: [
            ['path', { d: 'M100,42 L76,31 L79,53 Z', fill: '#FF5D8F' }],
            ['path', { d: 'M100,42 L124,31 L121,53 Z', fill: '#FF5D8F' }],
            ['circle', { cx: 100, cy: 42, r: 6, fill: '#E63973' }],
        ]},
        { name: 'Gözyaşı', draw: [['path', { d: 'M128,106 Q123,124 130,127 Q137,124 132,106 Z', fill: '#7BDFF2' }]] },
        { name: 'Ter Damlası', draw: [['path', { d: 'M150,52 Q144,68 152,71 Q160,68 154,52 Z', fill: '#7BDFF2' }]] },
        { name: 'Kalp Yanak', draw: [['path', { d: heartPath(150, 112, 9), fill: '#FF4D6D' }]] },
        { name: 'Maske', draw: [
            ['path', { d: 'M58,116 Q100,106 142,116 L139,150 Q100,164 61,150 Z', fill: '#A0E7E5', stroke: '#5BC0C0', 'stroke-width': 2 }],
            ['path', { d: 'M58,120 L40,110', fill: 'none', stroke: '#5BC0C0', 'stroke-width': 2 }],
            ['path', { d: 'M142,120 L160,110', fill: 'none', stroke: '#5BC0C0', 'stroke-width': 2 }],
        ]},
    ];

    const CATEGORIES = [
        { key: 'shape', label: 'Yüz', items: SHAPES },
        { key: 'color', label: 'Renk', items: COLORS },
        { key: 'brow', label: 'Kaş', items: BROWS },
        { key: 'eyes', label: 'Göz', items: EYES },
        { key: 'mouth', label: 'Ağız', items: MOUTHS },
        { key: 'accessory', label: 'Aksesuar', items: ACCESSORIES },
    ];

    // ---- Durum ----
    let container = null;
    let callbacks = null;
    let state = { shape: 0, color: 0, brow: 2, eyes: 1, mouth: 0, accessory: 0 };
    let activeCat = 'shape';
    let collection = [];
    let celebrated = false;
    let previewWrap = null;
    let optionsRow = null;
    let collectionRow = null;

    // Koleksiyon kalıcı: localStorage (Google girişinde auth.js GAME_SAVE_KEYS ile buluta da yazılır).
    // Eskiden yalnız bellekteydi — "Tekrar Oyna"/hub'a dönüş/yenileme koleksiyonu siliyordu.
    const SAVE_KEY = 'emojiyapici_save';
    const MAX_COLLECTION = 24;
    const RANGES = { shape: SHAPES.length, color: COLORS.length, brow: BROWS.length, eyes: EYES.length, mouth: MOUTHS.length, accessory: ACCESSORIES.length };
    function validFace(o) {
        return !!o && typeof o === 'object' && Object.keys(RANGES).every(k => Number.isInteger(o[k]) && o[k] >= 0 && o[k] < RANGES[k]);
    }
    function loadCollection() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr.filter(validFace).slice(-MAX_COLLECTION) : [];
        } catch (e) { return []; }   // bozuk/erişilemez kayıt → boş koleksiyon, çökme yok
    }
    function saveCollection() {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(collection)); } catch (e) { /* kota/gizli mod: bellekte kalır */ }
    }

    // ---- Yardımcı ----
    function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

    function el(tag, attrs) {
        const e = document.createElementNS(svgNS, tag);
        if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
        return e;
    }

    // Bir state'ten katmanlı SVG yüz oluştur
    function buildFace(st, size) {
        const svg = el('svg', { viewBox: '0 0 200 200', width: size, height: size });
        svg.classList.add('ey-face-svg');
        // Taban (renk + kontur)
        SHAPES[st.shape].draw.forEach(([tag, attrs]) => {
            svg.appendChild(el(tag, Object.assign({}, attrs, { fill: COLORS[st.color], stroke: '#3a2e10', 'stroke-width': 3 })));
        });
        // Katmanlar (alttan üste): kaş → göz → ağız → aksesuar
        [BROWS[st.brow], EYES[st.eyes], MOUTHS[st.mouth], ACCESSORIES[st.accessory]].forEach(part => {
            part.draw.forEach(([tag, attrs]) => svg.appendChild(el(tag, attrs)));
        });
        return svg;
    }

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs || {};
        state = { shape: 0, color: 0, brow: 2, eyes: 1, mouth: 0, accessory: 0 };
        activeCat = 'shape';
        collection = loadCollection();
        celebrated = collection.length >= 4;
        try { GameEngine.setTotal(4); } catch (e) {}
        render();
    }

    function render() {
        clear(container);

        const wrap = document.createElement('div');
        wrap.className = 'ey-wrap';

        const title = document.createElement('div');
        title.className = 'game-instruction';
        title.textContent = 'Parçaları seç, kendi emoji yüzünü yarat!';
        wrap.appendChild(title);

        previewWrap = document.createElement('div');
        previewWrap.className = 'ey-preview';
        wrap.appendChild(previewWrap);
        renderPreview();

        const tabs = document.createElement('div');
        tabs.className = 'ey-tabs';
        CATEGORIES.forEach(cat => {
            const tab = document.createElement('button');
            tab.className = 'ey-tab' + (cat.key === activeCat ? ' active' : '');
            tab.textContent = cat.label;
            tab.addEventListener('click', () => {
                activeCat = cat.key;
                try { AudioManager.play('tap'); } catch (e) {}
                tabs.querySelectorAll('.ey-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderOptions();
            });
            tabs.appendChild(tab);
        });
        wrap.appendChild(tabs);

        optionsRow = document.createElement('div');
        optionsRow.className = 'ey-options';
        wrap.appendChild(optionsRow);
        renderOptions();

        const actions = document.createElement('div');
        actions.className = 'ey-actions';

        const surpriseBtn = document.createElement('button');
        surpriseBtn.className = 'ey-btn ey-btn-surprise';
        surpriseBtn.textContent = '🎲 Sürpriz';
        surpriseBtn.addEventListener('click', randomize);
        actions.appendChild(surpriseBtn);

        const addBtn = document.createElement('button');
        addBtn.className = 'ey-btn ey-btn-add';
        addBtn.textContent = '✓ Koleksiyona Ekle';
        addBtn.addEventListener('click', addToCollection);
        actions.appendChild(addBtn);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'ey-btn ey-btn-reset';
        resetBtn.textContent = '↺ Sıfırla';
        resetBtn.addEventListener('click', () => {
            state = { shape: 0, color: 0, brow: 2, eyes: 1, mouth: 0, accessory: 0 };
            try { AudioManager.play('tap'); } catch (e) {}
            renderPreview();
            renderOptions();
        });
        actions.appendChild(resetBtn);

        wrap.appendChild(actions);

        const collTitle = document.createElement('div');
        collTitle.className = 'ey-coll-title';
        collTitle.textContent = 'Koleksiyonum';
        wrap.appendChild(collTitle);

        collectionRow = document.createElement('div');
        collectionRow.className = 'ey-collection';
        wrap.appendChild(collectionRow);
        renderCollection();

        container.appendChild(wrap);
    }

    function renderPreview() {
        if (!previewWrap) return;
        clear(previewWrap);
        const face = buildFace(state, 220);
        face.classList.add('ey-preview-face');
        previewWrap.appendChild(face);
    }

    function renderOptions() {
        if (!optionsRow) return;
        clear(optionsRow);

        if (activeCat === 'color') {
            COLORS.forEach((color, idx) => {
                const btn = document.createElement('button');
                btn.className = 'ey-color' + (idx === state.color ? ' active' : '');
                btn.style.background = color;
                btn.addEventListener('click', () => {
                    state.color = idx;
                    try { AudioManager.play('pop'); } catch (e) {}
                    renderPreview();
                    renderOptions();
                });
                optionsRow.appendChild(btn);
            });
            return;
        }

        const cat = CATEGORIES.find(c => c.key === activeCat);
        cat.items.forEach((item, idx) => {
            const btn = document.createElement('button');
            btn.className = 'ey-option' + (idx === state[activeCat] ? ' active' : '');
            const previewState = Object.assign({}, state);
            previewState[activeCat] = idx;
            btn.appendChild(buildFace(previewState, 54));
            btn.addEventListener('click', () => {
                state[activeCat] = idx;
                try { AudioManager.play('pop'); } catch (e) {}
                renderPreview();
                renderOptions();
            });
            optionsRow.appendChild(btn);
        });
    }

    function renderCollection() {
        if (!collectionRow) return;
        clear(collectionRow);
        if (collection.length === 0) {
            const hint = document.createElement('div');
            hint.className = 'ey-coll-empty';
            hint.textContent = 'Henüz yüz eklemedin. Bir yüz yapıp "Koleksiyona Ekle"ye bas!';
            collectionRow.appendChild(hint);
            return;
        }
        collection.forEach((st, idx) => {
            const slot = document.createElement('div');
            slot.className = 'ey-coll-item';
            slot.appendChild(buildFace(st, 64));
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'ey-coll-del';
            del.setAttribute('aria-label', 'Bu yüzü koleksiyondan sil');
            del.textContent = '✕';
            del.addEventListener('click', () => {
                collection.splice(idx, 1);
                saveCollection();
                try { AudioManager.play('pop'); } catch (e) {}
                renderCollection();
            });
            slot.appendChild(del);
            collectionRow.appendChild(slot);
        });
    }

    function randomize() {
        try { AudioManager.play('whoosh'); } catch (e) {}
        state.shape = Math.floor(Math.random() * SHAPES.length);
        state.color = Math.floor(Math.random() * COLORS.length);
        state.brow = Math.floor(Math.random() * BROWS.length);
        state.eyes = Math.floor(Math.random() * EYES.length);
        state.mouth = Math.floor(Math.random() * MOUTHS.length);
        state.accessory = Math.floor(Math.random() * ACCESSORIES.length);
        renderPreview();
        renderOptions();
    }

    function addToCollection() {
        collection.push(Object.assign({}, state));
        while (collection.length > MAX_COLLECTION) collection.shift();
        saveCollection();
        try { AudioManager.play('success'); } catch (e) {}
        renderCollection();
        if (collection.length >= 4 && !celebrated) {
            celebrated = true;
            try { AudioManager.play('levelComplete'); } catch (e) {}
            try { Particles.celebrate(); } catch (e) {}
            try { if (callbacks.onComplete) callbacks.onComplete(3); } catch (e) {}
        }
    }

    function destroy() {
        clear(container);
        previewWrap = optionsRow = collectionRow = null;
    }

    return { id, levels, init, destroy };
})();
