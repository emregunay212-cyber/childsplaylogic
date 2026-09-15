/* ============================================
   OYUN: Hafıza Kartları (Memory Cards)
   ============================================ */

const HafizaKartlari = (() => {
    const id = 'hafiza-kartlari';
    const levels = [
        { grid: [2, 2], pairs: 2 },
        { grid: [2, 3], pairs: 3 },
        { grid: [2, 4], pairs: 4 },
        { grid: [3, 4], pairs: 6 },
        { grid: [4, 4], pairs: 8 },
        { grid: [4, 5], pairs: 10 },
        { grid: [4, 6], pairs: 12 },
        { grid: [5, 6], pairs: 15 },
        { grid: [6, 6], pairs: 18 },
        { grid: [6, 7], pairs: 21 },
    ];

    let container = null;
    let callbacks = null;
    let flippedCards = [];
    let matchedPairs = 0;
    let totalPairs = 0;
    let lockBoard = false;
    let attempts = 0;
    let timers = [];
    function later(fn, ms) { const t = setTimeout(() => { timers = timers.filter(x => x !== t); fn(); }, ms); timers.push(t); return t; }

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        timers.forEach(clearTimeout); timers = [];
        flippedCards = [];
        matchedPairs = 0;
        lockBoard = false;
        attempts = 0;

        const config = levels[level - 1];
        totalPairs = config.pairs;

        // Resim seç
        const shuffled = [...TR.memoryImages].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, config.pairs);
        let cards = [...selected, ...selected];
        cards.sort(() => Math.random() - 0.5);

        // Yönerge
        const instruction = document.createElement('div');
        instruction.className = 'game-instruction';
        instruction.textContent = TR.instructions[id];
        container.appendChild(instruction);

        // Grid
        const grid = document.createElement('div');
        grid.className = 'memory-grid';
        const [rows, cols] = config.grid;
        grid.classList.add(`grid-${rows}x${cols}`);
        // Kart boyutu ekrana sığmalı: 375 px telefonda 5+ sütun sabit px ile taşıyor, sağdaki
        // kartlar .game-area overflow-x:hidden ardında kalıp tıklanamıyordu (seviye 6-10 bitirilemezdi)
        const preferred = cols <= 2 ? 120 : cols <= 3 ? 100 : cols <= 4 ? 80 : cols <= 5 ? 68 : cols <= 6 ? 58 : 50;
        const gap = 16;
        const avail = Math.max(200, (container.clientWidth || window.innerWidth) - 32);
        const cardSize = Math.max(36, Math.min(preferred, Math.floor((avail - gap * (cols - 1)) / cols))) + 'px';
        grid.style.gridTemplateColumns = `repeat(${cols}, ${cardSize})`;
        grid.style.setProperty('--card-size', cardSize);
        grid.style.justifyContent = 'center';

        GameEngine.setTotal(config.pairs);

        cards.forEach((imgName, index) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.emoji = imgName;
            card.dataset.index = index;
            card.style.animationDelay = (index * 0.05) + 's';

            card.innerHTML = `
                <div class="memory-card-inner">
                    <div class="memory-card-front"></div>
                    <div class="memory-card-back">
                        <img src="assets/images/memory/${imgName}.svg" alt="${imgName}" draggable="false">
                    </div>
                </div>
            `;

            card.addEventListener('click', () => onCardClick(card));
            grid.appendChild(card);
        });

        container.appendChild(grid);
    }

    function onCardClick(card) {
        if (lockBoard) return;
        if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

        AudioManager.play('flip');
        card.classList.add('flipped');
        flippedCards.push(card);

        if (flippedCards.length === 2) {
            lockBoard = true;
            attempts++;
            checkMatch();
        }
    }

    function checkMatch() {
        const [card1, card2] = flippedCards;
        const match = card1.dataset.emoji === card2.dataset.emoji;

        if (match) {
            card1.classList.add('matched');
            card2.classList.add('matched');
            matchedPairs++;
            callbacks.onCorrect();

            // Sparkle efekti
            const r1 = card1.getBoundingClientRect();
            const r2 = card2.getBoundingClientRect();
            Particles.sparkle(r1.left + r1.width / 2, r1.top + r1.height / 2, 6);
            Particles.sparkle(r2.left + r2.width / 2, r2.top + r2.height / 2, 6);

            flippedCards = [];
            lockBoard = false;

            if (matchedPairs === totalPairs) {
                const stars = calculateMemoryStars();
                later(() => callbacks.onComplete(stars), 500);
            }
        } else {
            callbacks.onWrong();
            later(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                flippedCards = [];
                lockBoard = false;
            }, 800);
        }
    }

    function calculateMemoryStars() {
        const ratio = attempts / totalPairs;
        if (ratio <= 1.5) return 3;
        if (ratio <= 2.5) return 2;
        return 1;
    }

    function destroy() {
        timers.forEach(clearTimeout); timers = [];
        if (container) container.innerHTML = '';
        flippedCards = [];
        lockBoard = false;
    }

    return { id, levels, init, destroy };
})();
