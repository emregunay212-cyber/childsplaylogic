/* ============================================
   OYUN: Harf Tanıma (Letter Recognition)
   ============================================ */

const HarfTanima = (() => {
    const id = 'harf-tanima';

    const vowels = ['A', 'E', 'I', 'İ', 'O', 'Ö', 'U', 'Ü'];
    const commonConsonants = ['B', 'C', 'Ç', 'D', 'F', 'G', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'Ş', 'T', 'Y', 'Z'];

    const levels = [
        { letters: vowels, optionCount: 4, rounds: 5 },
        { letters: commonConsonants.slice(0, 8), optionCount: 4, rounds: 5 },
        { letters: [...vowels, ...commonConsonants], optionCount: 4, rounds: 6 },
    ];

    let container = null;
    let callbacks = null;
    let roundsPlayed = 0;
    let totalRounds = 5;

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        roundsPlayed = 0;
        totalRounds = levels[level - 1].rounds;
        GameEngine.setTotal(totalRounds);
        startRound(level);
    }

    function startRound(level) {
        container.innerHTML = '';
        const config = levels[level - 1];

        // Sadece TR.letterImages'da mevcut olan harfleri filtrele
        const availableLetters = config.letters.filter(l => TR.letterImages[l] && TR.letterImages[l].length > 0);
        if (availableLetters.length === 0) return;

        const targetLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
        const correctOptions = TR.letterImages[targetLetter];
        const correctOption = correctOptions[Math.floor(Math.random() * correctOptions.length)];

        // Yönerge
        const instruction = document.createElement('div');
        instruction.className = 'game-instruction';
        instruction.textContent = `"${targetLetter}" harfi ile başlayan resmi bul!`;
        container.appendChild(instruction);

        // Büyük harf gösterimi
        const letterDiv = document.createElement('div');
        letterDiv.className = 'letter-display';
        letterDiv.textContent = targetLetter;
        container.appendChild(letterDiv);

        // Seçenekler: 1 doğru + 3 yanlış
        const options = [{ ...correctOption, correct: true }];

        // Yanlış seçenekler (farklı harflerden)
        const wrongLetters = availableLetters.filter(l => l !== targetLetter);
        const shuffledWrong = wrongLetters.sort(() => Math.random() - 0.5);

        for (let i = 0; i < config.optionCount - 1 && i < shuffledWrong.length; i++) {
            const wLetter = shuffledWrong[i];
            const wOptions = TR.letterImages[wLetter];
            if (wOptions && wOptions.length > 0) {
                const wOption = wOptions[Math.floor(Math.random() * wOptions.length)];
                options.push({ ...wOption, correct: false });
            }
        }

        options.sort(() => Math.random() - 0.5);

        // Seçenek kartları
        const optionsDiv = document.createElement('div');
        optionsDiv.style.display = 'flex';
        optionsDiv.style.flexWrap = 'wrap';
        optionsDiv.style.gap = '16px';
        optionsDiv.style.justifyContent = 'center';

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'game-option-btn';
            btn.style.flexDirection = 'column';
            btn.style.width = '110px';
            btn.style.height = '120px';
            btn.style.display = 'flex';
            btn.innerHTML = `
                <span style="font-size:2.5rem;margin-bottom:4px">${opt.emoji}</span>
                <span style="font-size:0.85rem;color:#666">${opt.word}</span>
            `;

            btn.addEventListener('click', () => {
                if (btn.disabled) return;

                if (opt.correct) {
                    btn.classList.add('correct');
                    btn.disabled = true;
                    callbacks.onCorrect();

                    const rect = btn.getBoundingClientRect();
                    Particles.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);

                    // Tüm butonları devre dışı bırak
                    optionsDiv.querySelectorAll('.game-option-btn').forEach(b => b.disabled = true);

                    roundsPlayed++;
                    if (roundsPlayed >= totalRounds) {
                        setTimeout(() => callbacks.onComplete(), 600);
                    } else {
                        setTimeout(() => startRound(GameEngine.getCurrentLevel()), 800);
                    }
                } else {
                    btn.classList.add('wrong');
                    callbacks.onWrong();
                    setTimeout(() => btn.classList.remove('wrong'), 500);
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
