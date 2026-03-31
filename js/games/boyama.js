/* ============================================
   OYUN: Boyama (Coloring)
   ============================================ */

const Boyama = (() => {
    const id = 'boyama';

    const palette = [
        '#E74C3C', '#3498DB', '#F1C40F', '#2ECC71',
        '#E67E22', '#9B59B6', '#FF69B4', '#8B4513',
        '#1ABC9C', '#FFFFFF',
    ];

    // SVG çizimleri
    const drawings = [
        {
            name: 'Ev',
            viewBox: '0 0 200 200',
            regions: [
                { d: 'M30,120 L100,50 L170,120 Z', id: 'roof', fill: '#EEE' },
                { d: 'M45,120 L45,180 L155,180 L155,120 Z', id: 'wall', fill: '#EEE' },
                { d: 'M80,140 L80,180 L120,180 L120,140 Z', id: 'door', fill: '#DDD' },
                { d: 'M55,130 L55,155 L75,155 L75,130 Z', id: 'window1', fill: '#DDD' },
                { d: 'M125,130 L125,155 L145,155 L145,130 Z', id: 'window2', fill: '#DDD' },
                { type: 'circle', cx: 100, cy: 35, r: 20, id: 'sun', fill: '#EEE' },
            ],
        },
        {
            name: 'Çiçek',
            viewBox: '0 0 200 200',
            regions: [
                { type: 'ellipse', cx: 100, cy: 60, rx: 25, ry: 22, id: 'petal1', fill: '#EEE', transform: 'rotate(0, 100, 80)' },
                { type: 'ellipse', cx: 100, cy: 60, rx: 25, ry: 22, id: 'petal2', fill: '#EEE', transform: 'rotate(72, 100, 80)' },
                { type: 'ellipse', cx: 100, cy: 60, rx: 25, ry: 22, id: 'petal3', fill: '#EEE', transform: 'rotate(144, 100, 80)' },
                { type: 'ellipse', cx: 100, cy: 60, rx: 25, ry: 22, id: 'petal4', fill: '#EEE', transform: 'rotate(216, 100, 80)' },
                { type: 'ellipse', cx: 100, cy: 60, rx: 25, ry: 22, id: 'petal5', fill: '#EEE', transform: 'rotate(288, 100, 80)' },
                { type: 'circle', cx: 100, cy: 80, r: 15, id: 'center', fill: '#DDD' },
                { d: 'M95,95 L95,180 L105,180 L105,95 Z', id: 'stem', fill: '#DDD' },
                { d: 'M95,140 Q70,130 60,145', id: 'leaf1', fill: '#DDD', stroke: true },
                { d: 'M105,155 Q130,145 140,160', id: 'leaf2', fill: '#DDD', stroke: true },
            ],
        },
        {
            name: 'Kelebek',
            viewBox: '0 0 200 200',
            regions: [
                { d: 'M100,60 Q50,30 30,70 Q20,100 60,110 Q80,115 100,100 Z', id: 'wing-tl', fill: '#EEE' },
                { d: 'M100,60 Q150,30 170,70 Q180,100 140,110 Q120,115 100,100 Z', id: 'wing-tr', fill: '#EEE' },
                { d: 'M100,100 Q60,110 40,140 Q35,170 80,160 Q95,155 100,140 Z', id: 'wing-bl', fill: '#EEE' },
                { d: 'M100,100 Q140,110 160,140 Q165,170 120,160 Q105,155 100,140 Z', id: 'wing-br', fill: '#EEE' },
                { type: 'ellipse', cx: 100, cy: 100, rx: 8, ry: 35, id: 'body', fill: '#DDD' },
                { type: 'circle', cx: 100, cy: 60, r: 10, id: 'head', fill: '#DDD' },
            ],
        },
    ];

    const levels = [
        { drawingIndex: 0, palette: palette.slice(0, 6) },
        { drawingIndex: 1, palette: palette.slice(0, 8) },
        { drawingIndex: 2, palette: palette },
    ];

    let container = null;
    let callbacks = null;
    let selectedColor = null;
    let colorHistory = [];
    let coloredRegions = 0;
    let totalRegions = 0;

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        selectedColor = null;
        colorHistory = [];
        coloredRegions = 0;

        const config = levels[level - 1];
        const drawing = drawings[config.drawingIndex];
        totalRegions = drawing.regions.length;
        GameEngine.setTotal(totalRegions);

        // Yönerge
        const instruction = document.createElement('div');
        instruction.className = 'game-instruction';
        instruction.textContent = TR.instructions[id];
        container.appendChild(instruction);

        // Boyama alanı
        const coloringArea = document.createElement('div');
        coloringArea.className = 'coloring-area';

        // SVG oluştur
        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('viewBox', drawing.viewBox);
        svg.classList.add('coloring-svg');
        svg.style.maxWidth = '300px';
        svg.style.maxHeight = '300px';
        svg.style.background = 'rgba(255,255,255,0.8)';
        svg.style.borderRadius = '20px';
        svg.style.padding = '10px';

        drawing.regions.forEach(region => {
            let el;
            if (region.type === 'circle') {
                el = document.createElementNS(svgNs, 'circle');
                el.setAttribute('cx', region.cx);
                el.setAttribute('cy', region.cy);
                el.setAttribute('r', region.r);
            } else if (region.type === 'ellipse') {
                el = document.createElementNS(svgNs, 'ellipse');
                el.setAttribute('cx', region.cx);
                el.setAttribute('cy', region.cy);
                el.setAttribute('rx', region.rx);
                el.setAttribute('ry', region.ry);
                if (region.transform) el.setAttribute('transform', region.transform);
            } else {
                el = document.createElementNS(svgNs, 'path');
                el.setAttribute('d', region.d);
            }

            el.setAttribute('fill', region.fill);
            el.setAttribute('stroke', '#333');
            el.setAttribute('stroke-width', '2');
            el.style.cursor = 'pointer';
            el.style.transition = 'fill 0.3s ease';
            el.dataset.id = region.id;
            el.dataset.colored = 'false';

            el.addEventListener('click', () => {
                if (!selectedColor) return;
                const prevColor = el.getAttribute('fill');
                el.setAttribute('fill', selectedColor);

                if (el.dataset.colored === 'false') {
                    el.dataset.colored = 'true';
                    coloredRegions++;
                    callbacks.onCorrect();

                    if (coloredRegions >= totalRegions) {
                        // Tüm bölgeler boyandı - serbest devam edilebilir
                        setTimeout(() => callbacks.onComplete(3), 500);
                    }
                }

                colorHistory.push({ element: el, prevColor });
                AudioManager.play('pop');
            });

            svg.appendChild(el);
        });

        coloringArea.appendChild(svg);

        // Renk paleti
        const paletteDiv = document.createElement('div');
        paletteDiv.className = 'color-palette';

        config.palette.forEach(color => {
            const swatch = document.createElement('button');
            swatch.className = 'color-swatch';
            swatch.style.background = color;
            if (color === '#FFFFFF') {
                swatch.style.border = '3px solid #DDD';
            }

            swatch.addEventListener('click', () => {
                paletteDiv.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                selectedColor = color;
                AudioManager.play('tap');
            });

            paletteDiv.appendChild(swatch);
        });

        // Geri al butonu
        const undoBtn = document.createElement('button');
        undoBtn.className = 'color-swatch';
        undoBtn.style.background = '#F0F0F0';
        undoBtn.style.fontSize = '1.2rem';
        undoBtn.textContent = '↩';
        undoBtn.title = 'Geri Al';
        undoBtn.addEventListener('click', () => {
            if (colorHistory.length === 0) return;
            const last = colorHistory.pop();
            last.element.setAttribute('fill', last.prevColor);
            AudioManager.play('tap');
        });
        paletteDiv.appendChild(undoBtn);

        coloringArea.appendChild(paletteDiv);
        container.appendChild(coloringArea);
    }

    function destroy() {
        if (container) container.innerHTML = '';
        colorHistory = [];
    }

    return { id, levels, init, destroy };
})();
