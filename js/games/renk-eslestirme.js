/* ============================================
   OYUN: Renk Eşleştirme (Color Matching)
   ============================================ */

const RenkEslestirme = (() => {
    const id = 'renk-eslestirme';
    const levels = [
        { optionCount: 4, correctCount: 1, colors: ['kirmizi', 'mavi', 'sari', 'yesil'] },
        { optionCount: 6, correctCount: 2, colors: ['kirmizi', 'mavi', 'sari', 'yesil', 'turuncu', 'mor'] },
        { optionCount: 6, correctCount: 1, colors: ['kirmizi', 'mavi', 'sari', 'yesil', 'turuncu', 'mor', 'pembe'], showText: true },
    ];

    // Renge göre nesne: kartın rengiyle emojinin rengi AYNI olmalı (eskiden rastgele seçiliyordu:
    // sarı kartta 🔵, kırmızı kartta 🟢 — renk öğrenen 4 yaş için yanıltıcı). 3. seviyede
    // (metin modu) kart zemini beyaz kalır; rengi yalnız nesne taşır.
    const objectsByColor = {
        kirmizi: ['🍎', '🍓', '🚒', '🔴', '🍅'],
        mavi:    ['🔵', '🐟', '💙', '🫐', '🐳'],
        sari:    ['🍌', '⭐', '🟡', '🐥', '🌻'],
        yesil:   ['🟢', '🍏', '🐸', '🌳', '🥦'],
        turuncu: ['🍊', '🟠', '🥕', '🦊', '🎃'],
        mor:     ['💜', '🍆', '🟣', '🍇', '🔮'],
        pembe:   ['🩷', '🌸', '🐷', '🦩', '🌷'],
    };
    let timers = [];
    function later(fn, ms) { const t = setTimeout(() => { timers = timers.filter(x => x !== t); fn(); }, ms); timers.push(t); return t; }

    let container = null;
    let callbacks = null;
    let targetColor = null;
    let correctFound = 0;
    let totalCorrect = 0;
    let roundsPlayed = 0;
    let totalRounds = 5;

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        roundsPlayed = 0;
        timers.forEach(clearTimeout); timers = [];
        GameEngine.setTotal(totalRounds);
        startRound(level);
    }

    function startRound(level) {
        container.innerHTML = '';
        correctFound = 0;

        const config = levels[level - 1];
        const colorKeys = [...config.colors].sort(() => Math.random() - 0.5);
        targetColor = colorKeys[0];
        const colorData = TR.colors[targetColor];

        // Yönerge
        const instruction = document.createElement('div');
        instruction.className = 'game-instruction';

        if (config.showText) {
            instruction.innerHTML = `<strong>${colorData.name}</strong> rengindeki nesneye dokun!`;
        } else {
            instruction.textContent = `${colorData.name} nerede?`;
        }
        container.appendChild(instruction);

        // Hedef renk gösterimi (metin modunda gösterme)
        if (!config.showText) {
            const target = document.createElement('div');
            target.className = 'color-target';
            target.style.background = colorData.hex;
            container.appendChild(target);
        }

        // Seçenekler
        totalCorrect = config.correctCount;
        const optionsDiv = document.createElement('div');
        optionsDiv.style.display = 'flex';
        optionsDiv.style.flexWrap = 'wrap';
        optionsDiv.style.gap = '16px';
        optionsDiv.style.justifyContent = 'center';
        optionsDiv.style.maxWidth = '500px';

        // Doğru renkteki nesneler
        const options = [];
        for (let i = 0; i < config.correctCount; i++) {
            options.push({ colorKey: targetColor, correct: true });
        }

        // Yanlış renkteki nesneler
        const wrongColors = colorKeys.filter(c => c !== targetColor);
        for (let i = 0; i < config.optionCount - config.correctCount; i++) {
            options.push({ colorKey: wrongColors[i % wrongColors.length], correct: false });
        }

        options.sort(() => Math.random() - 0.5);

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'game-option-btn';
            btn.style.width = '100px';
            btn.style.height = '100px';
            btn.style.fontSize = '2.5rem';
            btn.style.borderColor = TR.colors[opt.colorKey].hex;
            // Metin modunda ipucu yalnız nesnenin rengi: zemin beyaz. Diğer seviyelerde zemin = renk.
            btn.style.background = config.showText ? '#fff' : TR.colors[opt.colorKey].hex;

            // Emoji: kartın rengine uygun nesne
            const pool = objectsByColor[opt.colorKey] || ['⬜'];
            const emoji = pool[Math.floor(Math.random() * pool.length)];
            const span = document.createElement('span');
            span.style.filter = 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))';
            span.textContent = emoji;
            btn.appendChild(span);

            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                btn.disabled = true;

                if (opt.correct) {
                    btn.classList.add('correct');
                    correctFound++;
                    callbacks.onCorrect();

                    const rect = btn.getBoundingClientRect();
                    Particles.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 5);

                    if (correctFound >= totalCorrect) {
                        // Tur kazanıldı: kalan kartlar da kilitlenir (geçiş penceresinde dokunuş haksız yanlış saymasın)
                        optionsDiv.querySelectorAll('.game-option-btn').forEach(b => { b.disabled = true; });
                        roundsPlayed++;
                        if (roundsPlayed >= totalRounds) {
                            later(() => callbacks.onComplete(), 600);
                        } else {
                            later(() => startRound(GameEngine.getCurrentLevel()), 800);
                        }
                    }
                } else {
                    btn.classList.add('wrong');
                    callbacks.onWrong();
                    later(() => {
                        btn.classList.remove('wrong');
                        btn.disabled = false;
                    }, 600);
                }
            });

            optionsDiv.appendChild(btn);
        });

        container.appendChild(optionsDiv);
    }

    function destroy() {
        timers.forEach(clearTimeout); timers = [];
        if (container) container.innerHTML = '';
    }

    return { id, levels, init, destroy };
})();
