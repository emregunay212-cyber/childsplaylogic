/* ============================================
   KOD MACERASI - Paylaşılan Grid/Blok/Çalıştırma Mantığı
   ============================================ */

const KodMacerasiCore = (() => {

    // Hareket sabitleri (yön yok, doğrudan 4 yöne hareket)
    const MOVES = {
        UP:    { dx: 0, dy: -1 },
        DOWN:  { dx: 0, dy: 1 },
        LEFT:  { dx: -1, dy: 0 },
        RIGHT: { dx: 1, dy: 0 },
    };

    // Blok tanımları
    const BLOCKS = {
        UP:     { color: '#4ECDC4', label: 'Yukarı' },
        DOWN:   { color: '#A55EEA', label: 'Aşağı' },
        LEFT:   { color: '#FF6B6B', label: 'Sola' },
        RIGHT:  { color: '#45B7D1', label: 'Sağa' },
        REPEAT: { color: '#F7B731', label: TR.kodMacerasi.repeat },
    };

    // Blok SVG ikonları (basit oklar)
    function getBlockSVG(type, size = 28) {
        const svgs = {
            UP: `<svg viewBox="0 0 32 32" width="${size}" height="${size}"><path d="M16 4l10 14H6z" fill="white"/><rect x="12" y="18" width="8" height="10" rx="2" fill="white"/></svg>`,
            DOWN: `<svg viewBox="0 0 32 32" width="${size}" height="${size}"><rect x="12" y="4" width="8" height="10" rx="2" fill="white"/><path d="M16 28l10-14H6z" fill="white"/></svg>`,
            LEFT: `<svg viewBox="0 0 32 32" width="${size}" height="${size}"><path d="M4 16l14-10v8h10v4H18v8z" fill="white"/></svg>`,
            RIGHT: `<svg viewBox="0 0 32 32" width="${size}" height="${size}"><path d="M28 16l-14-10v8H4v4h10v8z" fill="white"/></svg>`,
            REPEAT: `<svg viewBox="0 0 32 32" width="${size}" height="${size}"><path d="M22 8l4 4-4 4" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 16a10 10 0 0 1 20 0" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"/><path d="M10 24l-4-4 4-4" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 16a10 10 0 0 1-20 0" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>`,
        };
        return svgs[type] || '';
    }

    // Robot SVG
    function createRobotSVG(color = '#FF9800') {
        return `<svg viewBox="0 0 64 64" class="kod-robot">
            <rect x="16" y="20" width="32" height="28" rx="6" fill="${color}"/>
            <rect x="22" y="8" width="20" height="16" rx="8" fill="${color}"/>
            <circle cx="28" cy="16" r="4" fill="white"/><circle cx="28" cy="16" r="2" fill="#333"/>
            <circle cx="36" cy="16" r="4" fill="white"/><circle cx="36" cy="16" r="2" fill="#333"/>
            <rect x="28" y="28" width="8" height="4" rx="2" fill="white"/>
            <rect x="10" y="28" width="8" height="4" rx="2" fill="${color}" opacity="0.7"/>
            <rect x="46" y="28" width="8" height="4" rx="2" fill="${color}" opacity="0.7"/>
            <rect x="20" y="48" width="8" height="8" rx="3" fill="${color}" opacity="0.8"/>
            <rect x="36" y="48" width="8" height="8" rx="3" fill="${color}" opacity="0.8"/>
            <line x1="32" y1="2" x2="32" y2="8" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
            <circle cx="32" cy="2" r="3" fill="#FFD700"/>
        </svg>`;
    }

    // Önceden tanımlı bulmacalar
    const PUZZLES = {
        1: [ // Seviye 1: 3x3, basit (2-3 blok, kolay yollar)
            { // Düz ileri 2 adım
                size: 3,
                grid: [[0,0,0],[0,0,0],[0,0,0]],
                start: { x: 1, y: 2 },
                target: { x: 1, y: 0 },
                collectibles: [],
                obstacles: [],
                optimal: 2
            },
            { // Sağa 2 adım
                size: 3,
                grid: [[0,0,0],[0,0,0],[0,0,0]],
                start: { x: 0, y: 1 },
                target: { x: 2, y: 1 },
                collectibles: [],
                obstacles: [],
                optimal: 2
            },
            { // İleri 1 + Sağa Dön + İleri 1
                size: 3,
                grid: [[0,0,0],[0,0,0],[0,0,0]],
                start: { x: 0, y: 2 },
                target: { x: 1, y: 1 },
                collectibles: [],
                obstacles: [],
                optimal: 3
            },
            { // İleri 1 + Sola Dön + İleri 1
                size: 3,
                grid: [[0,0,0],[0,0,0],[0,0,0]],
                start: { x: 2, y: 2 },
                target: { x: 1, y: 1 },
                collectibles: [],
                obstacles: [],
                optimal: 3
            },
            { // Düz ileri 1 adım (en basit)
                size: 3,
                grid: [[0,0,0],[0,0,0],[0,0,0]],
                start: { x: 1, y: 1 },
                target: { x: 1, y: 0 },
                collectibles: [],
                obstacles: [],
                optimal: 1
            },
        ],
        2: [ // Seviye 2: 4x4, engeller + tekrar
            {
                size: 4,
                grid: [[0,0,0,0],[0,1,0,0],[0,0,0,0],[0,0,1,0]],
                start: { x: 0, y: 3 },
                target: { x: 3, y: 0 },
                collectibles: [{ x: 1, y: 0 }],
                obstacles: [{ x: 1, y: 1 }, { x: 2, y: 3 }],
                optimal: 5
            },
            {
                size: 4,
                grid: [[0,0,0,0],[0,0,1,0],[0,0,0,0],[0,1,0,0]],
                start: { x: 0, y: 3 },
                target: { x: 3, y: 0 },
                collectibles: [{ x: 3, y: 3 }],
                obstacles: [{ x: 2, y: 1 }, { x: 1, y: 3 }],
                optimal: 5
            },
            {
                size: 4,
                grid: [[0,0,0,0],[0,0,0,0],[0,1,0,0],[0,0,0,0]],
                start: { x: 0, y: 3 },
                target: { x: 3, y: 1 },
                collectibles: [{ x: 0, y: 0 }],
                obstacles: [{ x: 1, y: 2 }],
                optimal: 4
            },
            {
                size: 4,
                grid: [[0,0,0,0],[1,0,0,0],[0,0,1,0],[0,0,0,0]],
                start: { x: 1, y: 3 },
                target: { x: 1, y: 0 },
                collectibles: [{ x: 3, y: 2 }],
                obstacles: [{ x: 0, y: 1 }, { x: 2, y: 2 }],
                optimal: 4
            },
        ],
        3: [ // Seviye 3: 5x5, hepsi
            {
                size: 5,
                grid: [[0,0,0,0,0],[0,1,0,1,0],[0,0,0,0,0],[0,1,0,0,0],[0,0,0,1,0]],
                start: { x: 0, y: 4 },
                target: { x: 4, y: 0 },
                collectibles: [{ x: 2, y: 2 }, { x: 4, y: 4 }],
                obstacles: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 4 }],
                optimal: 6
            },
            {
                size: 5,
                grid: [[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0]],
                start: { x: 0, y: 4 },
                target: { x: 4, y: 0 },
                collectibles: [{ x: 4, y: 4 }, { x: 0, y: 0 }],
                obstacles: [{ x: 2, y: 1 }, { x: 2, y: 3 }],
                optimal: 6
            },
            {
                size: 5,
                grid: [[0,0,0,0,0],[0,1,0,0,0],[0,0,0,1,0],[0,0,0,0,0],[0,0,1,0,0]],
                start: { x: 2, y: 4 },
                target: { x: 2, y: 0 },
                collectibles: [{ x: 0, y: 2 }, { x: 4, y: 2 }],
                obstacles: [{ x: 1, y: 1 }, { x: 3, y: 2 }, { x: 2, y: 4 }],
                optimal: 5
            },
        ],
    };

    // Grid render
    function renderGrid(container, puzzle, robotPos, robotColor) {
        const size = puzzle.size;
        const obstacles = puzzle.obstacles || [];
        const collectibles = puzzle.collectibles || [];
        const target = puzzle.target;
        const wrap = document.createElement('div');
        wrap.className = 'kod-grid-wrap';

        const grid = document.createElement('div');
        grid.className = `kod-grid grid-${size}x${size}`;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = document.createElement('div');
                cell.className = 'kod-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                // Engel
                if (obstacles.some(o => o.x === x && o.y === y)) {
                    cell.classList.add('obstacle');
                    cell.textContent = '🪨';
                }
                // Hedef
                else if (target.x === x && target.y === y) {
                    cell.classList.add('target');
                    cell.textContent = '⭐';
                }
                // Toplanabilir
                else if (collectibles.some(c => c.x === x && c.y === y)) {
                    cell.classList.add('collectible');
                    cell.textContent = '💎';
                }

                // Robot
                if (robotPos.x === x && robotPos.y === y) {
                    cell.classList.add('robot-here');
                    cell.innerHTML += createRobotSVG(robotColor || '#FF9800');
                }

                grid.appendChild(cell);
            }
        }

        wrap.appendChild(grid);
        container.appendChild(wrap);
        return grid;
    }

    // Blok paleti render
    function renderBlockPalette(container, availableBlocks, onSelect) {
        const palette = document.createElement('div');
        palette.className = 'kod-palette';

        availableBlocks.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'kod-block-btn';
            btn.style.background = BLOCKS[type].color;
            btn.innerHTML = getBlockSVG(type, 32);
            btn.title = BLOCKS[type].label;
            btn.dataset.type = type;
            btn.addEventListener('click', () => {
                if (!btn.classList.contains('disabled')) {
                    AudioManager.play('tap');
                    onSelect(type);
                }
            });
            palette.appendChild(btn);
        });

        container.appendChild(palette);
        return palette;
    }

    // Program alanı render
    function renderProgramArea(container, maxBlocks, sequence, onRemove, onPlay, onReset) {
        const wrap = document.createElement('div');
        wrap.className = 'kod-program-wrap';

        const label = document.createElement('div');
        label.className = 'kod-program-label';
        label.textContent = TR.kodMacerasi.program;
        wrap.appendChild(label);

        const slots = document.createElement('div');
        slots.className = 'kod-program-slots';

        for (let i = 0; i < maxBlocks; i++) {
            const slot = document.createElement('div');
            slot.className = 'kod-program-slot';
            slot.dataset.index = i;

            if (sequence[i]) {
                slot.classList.add('filled');
                const block = document.createElement('div');
                block.className = 'slot-block';
                block.style.background = BLOCKS[sequence[i]].color;
                block.innerHTML = getBlockSVG(sequence[i]);
                slot.appendChild(block);
                slot.addEventListener('click', () => {
                    AudioManager.play('tap');
                    onRemove(i);
                });
            }

            slots.appendChild(slot);
        }

        wrap.appendChild(slots);

        // Butonlar
        const btns = document.createElement('div');
        btns.className = 'kod-action-btns';

        const resetBtn = document.createElement('button');
        resetBtn.className = 'kod-reset-btn';
        resetBtn.innerHTML = '↺';
        resetBtn.addEventListener('click', () => {
            AudioManager.play('tap');
            onReset();
        });
        btns.appendChild(resetBtn);

        const playBtn = document.createElement('button');
        playBtn.className = 'kod-play-btn';
        playBtn.innerHTML = '▶';
        playBtn.disabled = sequence.length === 0;
        playBtn.addEventListener('click', () => {
            AudioManager.play('tap');
            onPlay();
        });
        btns.appendChild(playBtn);

        wrap.appendChild(btns);
        container.appendChild(wrap);
        return wrap;
    }

    // Sekans çalıştırma (saf fonksiyon) - basit 4 yönlü hareket
    function executeSequence(puzzle, sequence, startPos) {
        const size = puzzle.size;
        const obstacles = puzzle.obstacles || [];
        const collectibles = puzzle.collectibles || [];
        const target = puzzle.target;
        let x = startPos.x;
        let y = startPos.y;
        let collected = [];
        let path = [{ x, y, action: 'start' }];

        // REPEAT bloğunu genişlet
        const expanded = [];
        for (let i = 0; i < sequence.length; i++) {
            if (sequence[i] === 'REPEAT') {
                if (expanded.length > 0) {
                    expanded.push(expanded[expanded.length - 1]);
                }
            } else {
                expanded.push(sequence[i]);
            }
        }

        for (let i = 0; i < expanded.length; i++) {
            const cmd = expanded[i];
            const move = MOVES[cmd];
            if (!move) continue;

            const prevX = x, prevY = y;
            x += move.dx;
            y += move.dy;

            // Sınır kontrolü
            if (x < 0 || x >= size || y < 0 || y >= size) {
                path.push({ x, y, action: 'outOfBounds' });
                return { success: false, path, collected, error: 'outOfBounds' };
            }

            // Engel kontrolü
            if (obstacles.some(o => o.x === x && o.y === y)) {
                x = prevX;
                y = prevY;
                path.push({ x, y, action: 'crashed' });
                return { success: false, path, collected, error: 'crashed' };
            }

            // Toplanabilir kontrolü
            const cIdx = collectibles.findIndex(c => c.x === x && c.y === y && !collected.includes(`${c.x},${c.y}`));
            if (cIdx >= 0) {
                collected.push(`${collectibles[cIdx].x},${collectibles[cIdx].y}`);
            }

            path.push({ x, y, action: 'move' });
        }

        // Hedefe ulaştı mı?
        const success = x === target.x && y === target.y;
        if (!success) {
            return { success: false, path, collected, error: 'notReached' };
        }

        return { success: true, path, collected, error: null };
    }

    // Robot animasyonu
    function animateExecution(gridEl, path, puzzle, onStep, onComplete) {
        const { size } = puzzle;
        let step = 0;

        function nextStep() {
            if (step >= path.length) {
                onComplete(path[path.length - 1]);
                return;
            }

            const p = path[step];
            const cells = gridEl.querySelectorAll('.kod-cell');

            // Önceki robot'u kaldır
            cells.forEach(c => {
                c.classList.remove('robot-here');
                const oldRobot = c.querySelector('.kod-robot');
                if (oldRobot) oldRobot.remove();
            });

            // Sınır dışı ise animasyon atla
            if (p.action === 'outOfBounds') {
                onComplete(p);
                return;
            }

            // Yeni pozisyona robot koy
            const cellIdx = p.y * size + p.x;
            const cell = cells[cellIdx];
            if (cell) {
                cell.classList.add('robot-here');
                if (p.action !== 'start') cell.classList.add('trail');
                cell.innerHTML += createRobotSVG('#FF9800');
                const robot = cell.querySelector('.kod-robot');

                if (p.action === 'crashed') {
                    robot.classList.add('crashed');
                    AudioManager.play('error');
                }

                // Toplanabilir toplandı mı?
                if (p.action === 'move') {
                    const gem = cell.querySelector('.collectible');
                    if (cell.classList.contains('collectible')) {
                        cell.textContent = '';
                        cell.classList.remove('collectible');
                        cell.classList.add('robot-here');
                        cell.innerHTML += createRobotSVG('#FF9800');
                        const r2 = cell.querySelector('.kod-robot');
                        AudioManager.play('success');
                        const rect = cell.getBoundingClientRect();
                        Particles.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 4);
                    }
                }
            }

            if (onStep) onStep(step, p);
            step++;

            if (step < path.length) {
                setTimeout(nextStep, 450);
            } else {
                setTimeout(() => onComplete(p), 400);
            }
        }

        setTimeout(nextStep, 300);
    }

    // Bulmaca seçici
    function getPuzzle(level, usedIndices) {
        const puzzles = PUZZLES[level];
        if (!puzzles) return null;
        const available = puzzles.filter((_, i) => !usedIndices.includes(i));
        if (available.length === 0) return puzzles[Math.floor(Math.random() * puzzles.length)];
        const idx = Math.floor(Math.random() * available.length);
        return available[idx];
    }

    function getPuzzleIndex(level, puzzle) {
        return PUZZLES[level]?.indexOf(puzzle) ?? -1;
    }

    // Basit bulmaca üretimi (tek oyunculu MP eski)
    function generatePuzzle(gridSize, difficulty) {
        return generateComplexPuzzle(gridSize);
    }

    // BFS en kısa yol bulma
    function bfs(size, obstacleSet, start, target) {
        const key = (x, y) => x + ',' + y;
        const queue = [{ x: start.x, y: start.y, dist: 0 }];
        const visited = new Set([key(start.x, start.y)]);
        const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

        while (queue.length > 0) {
            const curr = queue.shift();
            if (curr.x === target.x && curr.y === target.y) return curr.dist;
            for (const d of dirs) {
                const nx = curr.x + d.dx, ny = curr.y + d.dy;
                if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
                if (obstacleSet.has(key(nx, ny))) continue;
                if (visited.has(key(nx, ny))) continue;
                visited.add(key(nx, ny));
                queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
            }
        }
        return -1; // ulaşılamaz
    }

    // Karmaşık bulmaca üretimi (MP için, en az minPath adım)
    function generateComplexPuzzle(gridSize) {
        const size = gridSize;
        const minPath = Math.max(8, size + 4); // en az 8 adim yol
        const key = (x, y) => x + ',' + y;

        let bestPuzzle = null;
        let bestDist = 0;

        for (let attempt = 0; attempt < 50; attempt++) {
            const grid = Array.from({ length: size }, () => Array(size).fill(0));
            const start = { x: 0, y: size - 1 };
            const target = { x: size - 1, y: 0 };
            const obstacles = [];
            const obstacleSet = new Set();

            // Rastgele engeller: %20-30 oran
            const numObs = Math.floor(size * size * (0.2 + Math.random() * 0.1));
            let obsAttempts = 0;
            while (obstacles.length < numObs && obsAttempts < 200) {
                const ox = Math.floor(Math.random() * size);
                const oy = Math.floor(Math.random() * size);
                const k = key(ox, oy);
                if ((ox === start.x && oy === start.y) || (ox === target.x && oy === target.y)) { obsAttempts++; continue; }
                if (obstacleSet.has(k)) { obsAttempts++; continue; }

                // Geçici ekle ve yol var mı kontrol et
                obstacleSet.add(k);
                const dist = bfs(size, obstacleSet, start, target);
                if (dist < 0) {
                    obstacleSet.delete(k); // yol kapanır, geri al
                } else {
                    obstacles.push({ x: ox, y: oy });
                    grid[oy][ox] = 1;
                }
                obsAttempts++;
            }

            const dist = bfs(size, obstacleSet, start, target);
            if (dist >= minPath && dist > bestDist) {
                bestDist = dist;
                bestPuzzle = { size, grid, start, target, collectibles: [], obstacles, optimal: dist };
            }
        }

        // Fallback: en iyi bulunan veya engelsiz
        if (!bestPuzzle) {
            bestPuzzle = {
                size, grid: Array.from({ length: size }, () => Array(size).fill(0)),
                start: { x: 0, y: size - 1 }, target: { x: size - 1, y: 0 },
                collectibles: [], obstacles: [], optimal: (size - 1) * 2
            };
        }

        return bestPuzzle;
    }

    return {
        BLOCKS,
        MOVES,
        PUZZLES,
        getBlockSVG,
        createRobotSVG,
        renderGrid,
        renderBlockPalette,
        renderProgramArea,
        executeSequence,
        animateExecution,
        getPuzzle,
        getPuzzleIndex,
        generatePuzzle,
        generateComplexPuzzle,
        bfs,
    };
})();
