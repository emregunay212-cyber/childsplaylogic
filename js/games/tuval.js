/* ============================================
   OYUN: Tuval - Pixel Boyama (Serbest Çizim)
   3 seviye: 10x10, 15x15, 20x20
   Sürükle-boya, silgi, seviye geçiş
   ============================================ */

const Tuval = (() => {
    const id = 'tuval';
    const levels = [
        { gridSize: 10, name: 'Küçük Tuval' },
        { gridSize: 15, name: 'Orta Tuval' },
        { gridSize: 20, name: 'Büyük Tuval' },
    ];

    const COLORS = [
        '#E74C3C', '#3498DB', '#F1C40F', '#2ECC71',
        '#E67E22', '#9B59B6', '#FF69B4', '#8B4513',
        '#1ABC9C', '#000000', '#87CEEB', '#FFD700',
        '#FF6348', '#A55EEA', '#26DE81', '#FFFFFF',
    ];

    let container = null;
    let callbacks = null;
    let currentColor = '#E74C3C';
    let isEraser = false;
    let isPainting = false;
    let lastCell = null;
    let clearArmed = false;
    let timers = [];
    function later(fn, ms) { const t = setTimeout(() => { timers = timers.filter(x => x !== t); fn(); }, ms); timers.push(t); return t; }
    let gridSize = 10;
    let currentLevel = 1;
    let grid = []; // 2D renk dizisi

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        currentLevel = level;
        gridSize = levels[level - 1].gridSize;
        currentColor = COLORS[0];
        isEraser = false;
        isPainting = false;
        lastCell = null;
        clearArmed = false;
        timers.forEach(clearTimeout); timers = [];
        grid = Array.from({ length: gridSize }, () => Array(gridSize).fill('#FFFFFF'));

        GameEngine.setTotal(1);
        render();
    }

    function render() {
        container.innerHTML = '';

        // Seviye geçiş butonları
        const lvBar = document.createElement('div');
        lvBar.className = 'tuval-lvbar';
        levels.forEach((lv, idx) => {
            const btn = document.createElement('button');
            btn.className = `tuval-lv-btn ${idx + 1 === currentLevel ? 'active' : ''}`;
            btn.textContent = `Lv ${idx + 1}`;
            btn.addEventListener('click', () => {
                if (idx + 1 === currentLevel) return;   // aynı seviyeye tekrar basmak çizimi silmesin
                AudioManager.play('tap');
                currentLevel = idx + 1;
                gridSize = lv.gridSize;
                grid = Array.from({ length: gridSize }, () => Array(gridSize).fill('#FFFFFF'));
                render();
            });
            lvBar.appendChild(btn);
        });
        container.appendChild(lvBar);

        // Tuval alanı
        const canvasWrap = document.createElement('div');
        canvasWrap.className = 'tuval-wrap';

        const canvasEl = document.createElement('div');
        canvasEl.className = `tuval-grid tuval-${gridSize}`;
        canvasEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'tuval-cell';
                cell.style.background = grid[r][c];
                cell.dataset.r = r;
                cell.dataset.c = c;

                cell.addEventListener('pointerdown', (e) => {
                    isPainting = true;
                    lastCell = { r, c };
                    paintCell(r, c, cell);
                    // Dokunmatikte tarayıcı işaretçiyi ilk hücreye örtük olarak yakalar → başka hücreye
                    // sürüklemede pointerenter hiç gelmez; capture bırakılınca elementFromPoint yolu çalışır
                    try { if (cell.hasPointerCapture && cell.hasPointerCapture(e.pointerId)) cell.releasePointerCapture(e.pointerId); } catch (err) {}
                    e.preventDefault();
                });
                canvasEl.appendChild(cell);
            }
        }
        // Sürükleme: işaretçinin altındaki hücreyi bul, son hücreyle arasını çizgi olarak doldur
        // (hızlı çapraz sürüklemede boşluk kalmasın)
        canvasEl.addEventListener('pointermove', (e) => {
            if (!isPainting) return;
            const target = document.elementFromPoint(e.clientX, e.clientY);
            if (!target || !target.classList.contains('tuval-cell') || !canvasEl.contains(target)) return;
            const r = +target.dataset.r, c = +target.dataset.c;
            paintLine(lastCell, { r, c });
            lastCell = { r, c };
        });

        // Pointer up on document
        document.addEventListener('pointerup', stopPainting);

        canvasWrap.appendChild(canvasEl);
        container.appendChild(canvasWrap);

        // Renk paleti
        const paletteDiv = document.createElement('div');
        paletteDiv.className = 'tuval-palette';

        COLORS.forEach(color => {
            const swatch = document.createElement('button');
            swatch.className = `tuval-swatch ${color === currentColor && !isEraser ? 'active' : ''}`;
            swatch.style.background = color;
            if (color === '#FFFFFF') swatch.style.border = '2px solid #DDD';

            swatch.addEventListener('click', () => {
                currentColor = color;
                isEraser = false;
                updatePaletteActive(paletteDiv);
                AudioManager.play('tap');
            });
            paletteDiv.appendChild(swatch);
        });
        container.appendChild(paletteDiv);

        // Araçlar
        const tools = document.createElement('div');
        tools.className = 'tuval-tools';

        const eraserBtn = document.createElement('button');
        eraserBtn.className = `tuval-tool-btn ${isEraser ? 'active' : ''}`;
        eraserBtn.innerHTML = '🧹 Silgi';
        eraserBtn.addEventListener('click', () => {
            isEraser = true;
            updatePaletteActive(paletteDiv);
            eraserBtn.classList.add('active');
            AudioManager.play('tap');
        });
        tools.appendChild(eraserBtn);

        const clearBtn = document.createElement('button');
        clearBtn.className = 'tuval-tool-btn danger';
        clearBtn.innerHTML = '🗑️ Temizle';
        clearBtn.addEventListener('click', () => {
            // Tek dokunuşla geri dönüşsüz silme olmasın: ilk basış onay ister, 3 sn içinde ikinci basış siler
            if (!clearArmed) {
                clearArmed = true;
                clearBtn.innerHTML = '❓ Emin misin? Tekrar bas';
                later(() => { clearArmed = false; if (clearBtn.isConnected) clearBtn.innerHTML = '🗑️ Temizle'; }, 3000);
                return;
            }
            clearArmed = false;
            grid = Array.from({ length: gridSize }, () => Array(gridSize).fill('#FFFFFF'));
            AudioManager.play('tap');
            render();
        });
        tools.appendChild(clearBtn);

        container.appendChild(tools);
    }

    function paintCell(r, c, cellEl) {
        const color = isEraser ? '#FFFFFF' : currentColor;
        grid[r][c] = color;
        cellEl.style.background = color;
    }

    // Bresenham: iki hücre arasındaki tüm hücreleri boya
    function paintLine(a, b) {
        if (!a) { const el = cellAt(b.r, b.c); if (el) paintCell(b.r, b.c, el); return; }
        let r0 = a.r, c0 = a.c; const r1 = b.r, c1 = b.c;
        const dr = Math.abs(r1 - r0), dc = Math.abs(c1 - c0);
        const sr = r0 < r1 ? 1 : -1, sc = c0 < c1 ? 1 : -1;
        let err = dc - dr;
        for (let guard = 0; guard < 400; guard++) {
            const el = cellAt(r0, c0); if (el) paintCell(r0, c0, el);
            if (r0 === r1 && c0 === c1) break;
            const e2 = 2 * err;
            if (e2 > -dr) { err -= dr; c0 += sc; }
            if (e2 < dc) { err += dc; r0 += sr; }
        }
    }
    function cellAt(r, c) {
        return container ? container.querySelector(`.tuval-cell[data-r="${r}"][data-c="${c}"]`) : null;
    }

    function stopPainting() {
        isPainting = false;
        lastCell = null;
    }

    function updatePaletteActive(paletteDiv) {
        paletteDiv.querySelectorAll('.tuval-swatch').forEach(s => s.classList.remove('active'));
        if (!isEraser) {
            paletteDiv.querySelectorAll('.tuval-swatch').forEach(s => {
                if (s.style.background === currentColor || rgbToHex(s.style.background) === currentColor.toLowerCase()) {
                    s.classList.add('active');
                }
            });
        }
    }

    function rgbToHex(rgb) {
        if (rgb.startsWith('#')) return rgb.toLowerCase();
        const match = rgb.match(/\d+/g);
        if (!match) return rgb;
        return '#' + match.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }

    function destroy() {
        timers.forEach(clearTimeout); timers = [];
        document.removeEventListener('pointerup', stopPainting);
        if (container) container.innerHTML = '';
    }

    return { id, levels, init, destroy };
})();
