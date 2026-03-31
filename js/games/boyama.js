/* ============================================
   OYUN: Boyama (Coloring) - Galeri Sistemi
   10 resim, bölüm mantığı (seviye değil)
   ============================================ */

const Boyama = (() => {
    const id = 'boyama';

    const palette = [
        '#E74C3C', '#3498DB', '#F1C40F', '#2ECC71',
        '#E67E22', '#9B59B6', '#FF69B4', '#8B4513',
        '#1ABC9C', '#FFFFFF', '#333333', '#87CEEB',
    ];

    // 10 SVG çizim
    const drawings = [
        { name: 'Ev', emoji: '🏠', viewBox: '0 0 200 200', regions: [
            { d: 'M30,120 L100,50 L170,120 Z', id: 'roof', fill: '#EEE' },
            { d: 'M45,120 L45,180 L155,180 L155,120 Z', id: 'wall', fill: '#EEE' },
            { d: 'M80,140 L80,180 L120,180 L120,140 Z', id: 'door', fill: '#DDD' },
            { d: 'M55,130 L55,155 L75,155 L75,130 Z', id: 'w1', fill: '#DDD' },
            { d: 'M125,130 L125,155 L145,155 L145,130 Z', id: 'w2', fill: '#DDD' },
            { type: 'circle', cx: 100, cy: 35, r: 20, id: 'sun', fill: '#EEE' },
        ]},
        { name: 'Çiçek', emoji: '🌸', viewBox: '0 0 200 200', regions: [
            { type: 'ellipse', cx: 100, cy: 60, rx: 25, ry: 22, id: 'p1', fill: '#EEE', transform: 'rotate(0, 100, 80)' },
            { type: 'ellipse', cx: 100, cy: 60, rx: 25, ry: 22, id: 'p2', fill: '#EEE', transform: 'rotate(72, 100, 80)' },
            { type: 'ellipse', cx: 100, cy: 60, rx: 25, ry: 22, id: 'p3', fill: '#EEE', transform: 'rotate(144, 100, 80)' },
            { type: 'ellipse', cx: 100, cy: 60, rx: 25, ry: 22, id: 'p4', fill: '#EEE', transform: 'rotate(216, 100, 80)' },
            { type: 'ellipse', cx: 100, cy: 60, rx: 25, ry: 22, id: 'p5', fill: '#EEE', transform: 'rotate(288, 100, 80)' },
            { type: 'circle', cx: 100, cy: 80, r: 15, id: 'center', fill: '#DDD' },
            { d: 'M95,95 L95,180 L105,180 L105,95 Z', id: 'stem', fill: '#DDD' },
        ]},
        { name: 'Kelebek', emoji: '🦋', viewBox: '0 0 200 200', regions: [
            { d: 'M100,60 Q50,30 30,70 Q20,100 60,110 Q80,115 100,100 Z', id: 'wt1', fill: '#EEE' },
            { d: 'M100,60 Q150,30 170,70 Q180,100 140,110 Q120,115 100,100 Z', id: 'wt2', fill: '#EEE' },
            { d: 'M100,100 Q60,110 40,140 Q35,170 80,160 Q95,155 100,140 Z', id: 'wb1', fill: '#EEE' },
            { d: 'M100,100 Q140,110 160,140 Q165,170 120,160 Q105,155 100,140 Z', id: 'wb2', fill: '#EEE' },
            { type: 'ellipse', cx: 100, cy: 100, rx: 8, ry: 35, id: 'body', fill: '#DDD' },
            { type: 'circle', cx: 100, cy: 60, r: 10, id: 'head', fill: '#DDD' },
        ]},
        { name: 'Araba', emoji: '🚗', viewBox: '0 0 200 200', regions: [
            { d: 'M20,120 L20,100 L60,100 L80,70 L140,70 L160,100 L180,100 L180,120 Z', id: 'body', fill: '#EEE' },
            { d: 'M80,70 L85,95 L135,95 L140,70 Z', id: 'window', fill: '#DDD' },
            { type: 'circle', cx: 55, cy: 130, r: 18, id: 'wheel1', fill: '#DDD' },
            { type: 'circle', cx: 145, cy: 130, r: 18, id: 'wheel2', fill: '#DDD' },
            { d: 'M165,95 L180,95 L180,105 L170,105 Z', id: 'light', fill: '#EEE' },
        ]},
        { name: 'Güneş', emoji: '☀️', viewBox: '0 0 200 200', regions: [
            { type: 'circle', cx: 100, cy: 100, r: 40, id: 'sun', fill: '#EEE' },
            { d: 'M100,10 L105,50 L95,50 Z', id: 'r1', fill: '#DDD' },
            { d: 'M100,150 L105,190 L95,190 Z', id: 'r2', fill: '#DDD' },
            { d: 'M10,100 L50,95 L50,105 Z', id: 'r3', fill: '#DDD' },
            { d: 'M150,100 L190,95 L190,105 Z', id: 'r4', fill: '#DDD' },
            { d: 'M36,36 L62,58 L58,62 Z', id: 'r5', fill: '#DDD' },
            { d: 'M164,36 L138,58 L142,62 Z', id: 'r6', fill: '#DDD' },
        ]},
        { name: 'Ağaç', emoji: '🌳', viewBox: '0 0 200 200', regions: [
            { d: 'M85,180 L85,120 L115,120 L115,180 Z', id: 'trunk', fill: '#DDD' },
            { type: 'circle', cx: 100, cy: 80, r: 50, id: 'crown1', fill: '#EEE' },
            { type: 'circle', cx: 70, cy: 95, r: 30, id: 'crown2', fill: '#EEE' },
            { type: 'circle', cx: 130, cy: 95, r: 30, id: 'crown3', fill: '#EEE' },
            { type: 'circle', cx: 100, cy: 55, r: 25, id: 'crown4', fill: '#EEE' },
        ]},
        { name: 'Balık', emoji: '🐟', viewBox: '0 0 200 200', regions: [
            { type: 'ellipse', cx: 90, cy: 100, rx: 60, ry: 35, id: 'body', fill: '#EEE' },
            { d: 'M150,100 L180,70 L180,130 Z', id: 'tail', fill: '#DDD' },
            { type: 'circle', cx: 55, cy: 90, r: 8, id: 'eye', fill: '#DDD' },
            { d: 'M70,115 Q90,130 110,115', id: 'fin1', fill: '#DDD', stroke: true },
            { d: 'M80,75 Q90,55 100,75', id: 'fin2', fill: '#DDD', stroke: true },
        ]},
        { name: 'Yıldız', emoji: '⭐', viewBox: '0 0 200 200', regions: [
            { d: 'M100,20 L120,75 L180,80 L135,120 L150,180 L100,145 L50,180 L65,120 L20,80 L80,75 Z', id: 'star', fill: '#EEE' },
            { type: 'circle', cx: 100, cy: 100, r: 20, id: 'center', fill: '#DDD' },
        ]},
        { name: 'Kedi', emoji: '🐱', viewBox: '0 0 200 200', regions: [
            { type: 'circle', cx: 100, cy: 110, r: 50, id: 'body', fill: '#EEE' },
            { type: 'circle', cx: 100, cy: 60, r: 35, id: 'head', fill: '#EEE' },
            { d: 'M70,40 L65,10 L85,30 Z', id: 'ear1', fill: '#DDD' },
            { d: 'M130,40 L135,10 L115,30 Z', id: 'ear2', fill: '#DDD' },
            { type: 'circle', cx: 85, cy: 55, r: 6, id: 'eye1', fill: '#DDD' },
            { type: 'circle', cx: 115, cy: 55, r: 6, id: 'eye2', fill: '#DDD' },
            { type: 'ellipse', cx: 100, cy: 70, rx: 5, ry: 4, id: 'nose', fill: '#DDD' },
            { d: 'M85,165 L85,190 L95,190 L95,165 Z', id: 'leg1', fill: '#DDD' },
            { d: 'M105,165 L105,190 L115,190 L115,165 Z', id: 'leg2', fill: '#DDD' },
        ]},
        { name: 'Gökkuşağı', emoji: '🌈', viewBox: '0 0 200 200', regions: [
            { d: 'M10,160 A90,90 0 0,1 190,160 L190,170 A100,100 0 0,0 10,170 Z', id: 'r1', fill: '#EEE' },
            { d: 'M25,160 A75,75 0 0,1 175,160 L175,170 A85,85 0 0,0 25,170 Z', id: 'r2', fill: '#EEE' },
            { d: 'M40,160 A60,60 0 0,1 160,160 L160,170 A70,70 0 0,0 40,170 Z', id: 'r3', fill: '#EEE' },
            { d: 'M55,160 A45,45 0 0,1 145,160 L145,170 A55,55 0 0,0 55,170 Z', id: 'r4', fill: '#EEE' },
            { d: 'M70,160 A30,30 0 0,1 130,160 L130,170 A40,40 0 0,0 70,170 Z', id: 'r5', fill: '#EEE' },
            { type: 'circle', cx: 40, cy: 170, r: 20, id: 'cloud1', fill: '#EEE' },
            { type: 'circle', cx: 160, cy: 170, r: 20, id: 'cloud2', fill: '#EEE' },
        ]},
    ];

    // levels = 10 tane boş seviye (GameEngine uyumluluğu)
    const levels = drawings.map(() => ({}));

    let container = null;
    let callbacks = null;
    let selectedColor = null;
    let colorHistory = [];
    let coloredRegions = 0;
    let totalRegions = 0;
    let completedDrawings = new Set();

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;

        // Her zaman galeri göster
        showGallery();
    }

    function showGallery() {
        container.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'game-instruction';
        title.textContent = 'Boyamak istediğin resmi seç!';
        container.appendChild(title);

        const gallery = document.createElement('div');
        gallery.className = 'boyama-gallery';

        drawings.forEach((drawing, idx) => {
            const card = document.createElement('button');
            card.className = 'boyama-gallery-card';
            if (completedDrawings.has(idx)) card.classList.add('completed');

            card.innerHTML = `
                <span class="boyama-gallery-emoji">${drawing.emoji}</span>
                <span class="boyama-gallery-name">${drawing.name}</span>
                ${completedDrawings.has(idx) ? '<span class="boyama-gallery-check">✅</span>' : ''}
            `;

            card.addEventListener('click', () => {
                AudioManager.play('tap');
                startDrawing(idx);
            });
            gallery.appendChild(card);
        });

        container.appendChild(gallery);
    }

    function startDrawing(drawingIdx) {
        container.innerHTML = '';
        selectedColor = null;
        colorHistory = [];
        coloredRegions = 0;

        const drawing = drawings[drawingIdx];
        totalRegions = drawing.regions.length;
        GameEngine.setTotal(totalRegions);

        // Geri butonu
        const backBtn = document.createElement('button');
        backBtn.className = 'boyama-back-btn';
        backBtn.textContent = '← Resimler';
        backBtn.addEventListener('click', () => {
            AudioManager.play('tap');
            showGallery();
        });
        container.appendChild(backBtn);

        // Başlık
        const title = document.createElement('div');
        title.className = 'game-instruction';
        title.textContent = `${drawing.emoji} ${drawing.name}`;
        container.appendChild(title);

        // SVG
        const coloringArea = document.createElement('div');
        coloringArea.className = 'coloring-area';

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
                        completedDrawings.add(drawingIdx);
                        AudioManager.play('levelComplete');
                        Particles.celebrate();
                        setTimeout(() => showGallery(), 1500);
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

        palette.forEach(color => {
            const swatch = document.createElement('button');
            swatch.className = 'color-swatch';
            swatch.style.background = color;
            if (color === '#FFFFFF') swatch.style.border = '3px solid #DDD';

            swatch.addEventListener('click', () => {
                paletteDiv.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                selectedColor = color;
                AudioManager.play('tap');
            });
            paletteDiv.appendChild(swatch);
        });

        // Geri al
        const undoBtn = document.createElement('button');
        undoBtn.className = 'color-swatch';
        undoBtn.style.background = '#F0F0F0';
        undoBtn.style.fontSize = '1.2rem';
        undoBtn.textContent = '↩';
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
