/* ============================================
   OYUN: Sayı Sayma (Number Counting)
   ============================================ */

const SayiSayma = (() => {
    const id = 'sayi-sayma';
    const levels = [
        { min: 1, max: 5, options: 5, rounds: 5 },
        { min: 1, max: 10, options: 5, rounds: 5 },
        { min: 1, max: 10, options: 5, rounds: 5, addition: true },
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

        let answer;
        let instructionText;
        let objectsHTML;

        const obj = TR.countingObjects[Math.floor(Math.random() * TR.countingObjects.length)];

        if (config.addition) {
            const a = 1 + Math.floor(Math.random() * 5);
            const b = 1 + Math.floor(Math.random() * (config.max - a));
            answer = a + b;

            instructionText = `${a} tane ${obj.emoji} ve ${b} tane ${obj.emoji}, toplam kaç tane?`;

            // Görsel nesneler
            objectsHTML = createObjectsDisplay(obj.emoji, a, b);
        } else {
            answer = config.min + Math.floor(Math.random() * (config.max - config.min + 1));
            instructionText = `Kaç tane ${obj.emoji} var? Say ve doğru sayıya bas!`;
            objectsHTML = createObjectsDisplay(obj.emoji, answer, 0);
        }

        // Yönerge
        const instruction = document.createElement('div');
        instruction.className = 'game-instruction';
        instruction.textContent = instructionText;
        container.appendChild(instruction);

        // Nesne alanı
        const objectArea = document.createElement('div');
        objectArea.innerHTML = objectsHTML;
        objectArea.style.margin = '16px 0';
        container.appendChild(objectArea);

        // Sayı butonları
        const numbersDiv = document.createElement('div');
        numbersDiv.style.display = 'flex';
        numbersDiv.style.flexWrap = 'wrap';
        numbersDiv.style.gap = '12px';
        numbersDiv.style.justifyContent = 'center';
        numbersDiv.style.maxWidth = '400px';

        // Seçenekleri oluştur (doğru cevap dahil)
        const options = new Set([answer]);
        while (options.size < config.options) {
            let n = config.min + Math.floor(Math.random() * config.max);
            if (n !== answer) options.add(n);
        }

        const sorted = [...options].sort((a, b) => a - b);

        sorted.forEach(num => {
            const btn = document.createElement('button');
            btn.className = 'number-btn';
            btn.textContent = num;

            btn.addEventListener('click', () => {
                if (btn.disabled) return;

                if (num === answer) {
                    btn.classList.add('correct');
                    btn.disabled = true;
                    callbacks.onCorrect();

                    const rect = btn.getBoundingClientRect();
                    Particles.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);

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

            numbersDiv.appendChild(btn);
        });

        container.appendChild(numbersDiv);
    }

    function createObjectsDisplay(emoji, count1, count2) {
        const total = count1 + count2;
        let html = '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:12px;background:rgba(255,255,255,0.6);border-radius:20px;max-width:400px;margin:0 auto">';

        for (let i = 0; i < count1; i++) {
            const rotation = -10 + Math.random() * 20;
            const delay = i * 0.05;
            html += `<span style="font-size:2.2rem;display:inline-block;transform:rotate(${rotation}deg);animation:pop 0.3s var(--ease-spring) both ${delay}s">${emoji}</span>`;
        }

        if (count2 > 0) {
            html += '<span style="font-size:2rem;display:flex;align-items:center;font-family:Fredoka;font-weight:700;color:#E67E22;margin:0 4px">+</span>';
            for (let i = 0; i < count2; i++) {
                const rotation = -10 + Math.random() * 20;
                const delay = (count1 + i) * 0.05;
                html += `<span style="font-size:2.2rem;display:inline-block;transform:rotate(${rotation}deg);animation:pop 0.3s var(--ease-spring) both ${delay}s">${emoji}</span>`;
            }
        }

        html += '</div>';
        return html;
    }

    function destroy() {
        if (container) container.innerHTML = '';
    }

    return { id, levels, init, destroy };
})();
