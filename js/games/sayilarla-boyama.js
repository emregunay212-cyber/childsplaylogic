/* ============================================
   OYUN: Sayılarla Boyama (Color by Number / Pixel Art)
   Numaralı kutuları doğru renkle boya, gizli resmi ortaya çıkar.
   Her seviye = bir pixel resmi. '0' = boş hücre, 1+ = palet numarası.
   ============================================ */

const SayilarlaBoyama = (() => {
    const id = 'sayilarla-boyama';

    // Pixel resimleri — satır string'leri görsel hizalama için ('0' = boş)
    const pictures = [
        {
            name: 'Kalp', emoji: '❤️',
            palette: { 1: '#E74C3C', 2: '#FF8FAB' },
            rows: [
                '01100110',
                '12211221',
                '12222221',
                '12222221',
                '01222210',
                '00122100',
                '00011000',
            ],
        },
        {
            name: 'Yıldız', emoji: '⭐',
            palette: { 1: '#F4C430', 2: '#FFE082' },
            rows: [
                '000010000',
                '000010000',
                '000111000',
                '111212111',
                '011222110',
                '001222100',
                '011202110',
                '011000110',
                '110000011',
            ],
        },
        {
            name: 'Elma', emoji: '🍎',
            palette: { 1: '#E74C3C', 2: '#2ECC71', 3: '#8B5A2B' },
            rows: [
                '0000030000',
                '0000230000',
                '0002230000',
                '0011111100',
                '0111111110',
                '1111111111',
                '1111111111',
                '0111111110',
                '0111111110',
                '0011111100',
            ],
        },
        {
            name: 'Balık', emoji: '🐟',
            palette: { 1: '#3498DB', 2: '#FF7F50', 3: '#2C3E50' },
            rows: [
                '00011111000',
                '20111111100',
                '22111113110',
                '22211111110',
                '22111111110',
                '20111111100',
                '00011111000',
            ],
        },
        {
            name: 'Çiçek', emoji: '🌸',
            palette: { 1: '#FF69B4', 2: '#F1C40F', 3: '#2ECC71' },
            rows: [
                '00001110000',
                '00111111100',
                '01111111110',
                '01112221110',
                '01122222110',
                '01112221110',
                '01111111110',
                '00111311100',
                '00000300000',
                '00003330000',
                '00033333000',
            ],
        },
        {
            name: 'Kelebek', emoji: '🦋',
            palette: { 1: '#9B59B6', 2: '#F1C40F', 3: '#34495E' },
            rows: [
                '11100000111',
                '11110301111',
                '11111311111',
                '01112321110',
                '00112321100',
                '00012321000',
                '00112321100',
                '01112321110',
                '11111311111',
                '11110301111',
                '11100000111',
            ],
        },
    ];

    const levels = pictures.map(p => ({ name: p.name }));

    let container = null;
    let callbacks = null;
    let pic = null;
    let grid = [];          // 2D sayı dizisi
    let cellEls = [];       // 2D DOM referansı
    let selectedNum = null;
    let totalCells = 0;
    let coloredCells = 0;
    let wrongTaps = 0;
    let isPainting = false;
    let counts = {};        // numara → kalan boyanmamış hücre sayısı
    let done = false;

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        pic = pictures[level - 1] || pictures[0];

        grid = pic.rows.map(row => row.split('').map(ch => parseInt(ch, 10) || 0));
        cellEls = [];
        coloredCells = 0;
        wrongTaps = 0;
        isPainting = false;
        done = false;

        counts = {};
        totalCells = 0;
        grid.forEach(row => row.forEach(n => {
            if (n > 0) { counts[n] = (counts[n] || 0) + 1; totalCells++; }
        }));
        GameEngine.setTotal(totalCells);

        // İlk numarayı otomatik seç (en küçük palet numarası)
        const nums = Object.keys(pic.palette).map(Number).sort((a, b) => a - b);
        selectedNum = nums[0];

        render();
    }

    function render() {
        container.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'game-instruction';
        title.textContent = `${pic.emoji} ${pic.name} — numarayı seç ve boya!`;
        container.appendChild(title);

        const wrap = document.createElement('div');
        wrap.className = 'sbn-wrap';

        const gridEl = document.createElement('div');
        gridEl.className = 'sbn-grid';
        const cols = grid[0].length;
        gridEl.style.setProperty('--sbn-cols', cols);
        gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        cellEls = [];
        for (let r = 0; r < grid.length; r++) {
            const rowEls = [];
            for (let c = 0; c < cols; c++) {
                const n = grid[r][c];
                const cell = document.createElement('div');
                cell.className = 'sbn-cell';

                if (n === 0) {
                    cell.classList.add('sbn-empty');
                } else {
                    cell.dataset.num = n;
                    cell.dataset.r = r;
                    cell.dataset.c = c;
                    cell.dataset.colored = 'false';
                    cell.textContent = n;

                    cell.addEventListener('pointerdown', (e) => {
                        e.preventDefault();
                        isPainting = true;
                        tryPaint(r, c, false);
                    });
                }
                gridEl.appendChild(cell);
                rowEls.push(cell);
            }
            cellEls.push(rowEls);
        }

        // Sürükle-boya (mouse + dokunmatik): işaretçi hangi hücrenin üstündeyse onu boyar
        gridEl.addEventListener('pointermove', (e) => {
            if (!isPainting) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el.classList.contains('sbn-cell') && !el.classList.contains('sbn-empty')) {
                tryPaint(parseInt(el.dataset.r, 10), parseInt(el.dataset.c, 10), true);
            }
        });

        document.addEventListener('pointerup', stopPainting);

        wrap.appendChild(gridEl);
        container.appendChild(wrap);

        // Numaralı renk paleti
        const paletteDiv = document.createElement('div');
        paletteDiv.className = 'sbn-palette';

        const nums = Object.keys(pic.palette).map(Number).sort((a, b) => a - b);
        nums.forEach(num => {
            const swatch = document.createElement('button');
            swatch.className = 'sbn-swatch';
            swatch.style.background = pic.palette[num];
            swatch.dataset.num = num;

            const numLabel = document.createElement('span');
            numLabel.className = 'sbn-swatch-num';
            numLabel.textContent = num;
            swatch.appendChild(numLabel);

            if (num === selectedNum) swatch.classList.add('active');
            if (counts[num] === 0) swatch.classList.add('completed');

            swatch.addEventListener('click', () => {
                selectedNum = num;
                AudioManager.play('tap');
                updateSwatches(paletteDiv);
                updateHints();
            });
            paletteDiv.appendChild(swatch);
        });

        container.appendChild(paletteDiv);

        updateHints();
    }

    function updateSwatches(paletteDiv) {
        paletteDiv.querySelectorAll('.sbn-swatch').forEach(s => {
            const num = parseInt(s.dataset.num, 10);
            s.classList.toggle('active', num === selectedNum);
            s.classList.toggle('completed', counts[num] === 0);
        });
    }

    // Seçili numaranın boyanmamış hücrelerini hafifçe vurgula (çocuk dostu ipucu)
    function updateHints() {
        for (let r = 0; r < cellEls.length; r++) {
            for (let c = 0; c < cellEls[r].length; c++) {
                const cell = cellEls[r][c];
                if (!cell || cell.classList.contains('sbn-empty')) continue;
                const isTarget = grid[r][c] === selectedNum && cell.dataset.colored === 'false';
                cell.classList.toggle('sbn-hint', isTarget);
            }
        }
    }

    function tryPaint(r, c, fromDrag) {
        if (done) return;
        const cell = cellEls[r] && cellEls[r][c];
        if (!cell || cell.dataset.colored === 'true' || cell.classList.contains('sbn-empty')) return;

        const target = grid[r][c];

        if (target === selectedNum) {
            cell.style.background = pic.palette[target];
            cell.dataset.colored = 'true';
            cell.classList.remove('sbn-hint');
            cell.classList.add('sbn-filled');
            cell.textContent = '';
            coloredCells++;
            counts[target]--;
            callbacks.onCorrect();
            AudioManager.play('pop');

            if (counts[target] === 0) {
                const sw = container.querySelector(`.sbn-swatch[data-num="${target}"]`);
                if (sw) sw.classList.add('completed');
            }

            if (coloredCells >= totalCells) finish();
        } else if (!fromDrag) {
            // Yanlış renk — yalnızca kasıtlı tıklamada uyar (sürüklerken sessizce yok say)
            wrongTaps++;
            callbacks.onWrong();
            cell.classList.remove('sbn-shake');
            void cell.offsetWidth; // reflow → animasyonu yeniden tetikle
            cell.classList.add('sbn-shake');
        }
    }

    function finish() {
        done = true;
        isPainting = false;
        const stars = wrongTaps <= 2 ? 3 : (wrongTaps <= 6 ? 2 : 1);
        // Hemen kaydet: 500 ms gecikmede "Ana Sayfa"ya basılırsa yıldız hiç yazılmıyordu (kutlamayı motor zaten geciktirir)
        callbacks.onComplete(stars);
    }

    function stopPainting() {
        isPainting = false;
    }

    function destroy() {
        document.removeEventListener('pointerup', stopPainting);
        if (container) container.innerHTML = '';
        cellEls = [];
        grid = [];
    }

    return { id, levels, init, destroy };
})();
