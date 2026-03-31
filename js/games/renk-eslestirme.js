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

    const objects = ['🍎', '🚗', '🎈', '⭐', '🌸', '🐟', '🦋', '🍌', '🍊', '🟢', '💜', '🩷', '🔵', '🟡', '🟠'];

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
            btn.style.background = TR.colors[opt.colorKey].hex + '22';
            btn.style.borderColor = TR.colors[opt.colorKey].hex;

            // Emoji seç
            const emoji = objects[Math.floor(Math.random() * objects.length)];
            btn.innerHTML = `<span style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1))">${emoji}</span>`;
            btn.style.background = TR.colors[opt.colorKey].hex;

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
                        roundsPlayed++;
                        if (roundsPlayed >= totalRounds) {
                            setTimeout(() => callbacks.onComplete(), 600);
                        } else {
                            setTimeout(() => startRound(GameEngine.getCurrentLevel()), 800);
                        }
                    }
                } else {
                    btn.classList.add('wrong');
                    callbacks.onWrong();
                    setTimeout(() => {
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
        if (container) container.innerHTML = '';
    }

    return { id, levels, init, destroy };
})();
