/* ============================================
   OYUN: Penaltı - Kaleye Şut Çek!
   9 seviye, her seviyede kaleci daha iyi
   ============================================ */

const Penalti = (() => {
    const id = 'penalti';
    const levels = [
        { saveChance: 0.10, name: 'Çok Kolay' },
        { saveChance: 0.15, name: 'Kolay' },
        { saveChance: 0.20, name: 'Kolay+' },
        { saveChance: 0.30, name: 'Orta' },
        { saveChance: 0.40, name: 'Orta+' },
        { saveChance: 0.50, name: 'Zor' },
        { saveChance: 0.60, name: 'Zor+' },
        { saveChance: 0.70, name: 'Çok Zor' },
        { saveChance: 0.80, name: 'Usta' },
    ];

    const TOTAL_SHOTS = 5;
    const ZONES = [
        { name: 'Sol Üst', x: 0, y: 0, emoji: '↖' },
        { name: 'Orta Üst', x: 1, y: 0, emoji: '⬆' },
        { name: 'Sağ Üst', x: 2, y: 0, emoji: '↗' },
        { name: 'Sol Orta', x: 0, y: 1, emoji: '⬅' },
        { name: 'Orta', x: 1, y: 1, emoji: '⏺' },
        { name: 'Sağ Orta', x: 2, y: 1, emoji: '➡' },
        { name: 'Sol Alt', x: 0, y: 2, emoji: '↙' },
        { name: 'Orta Alt', x: 1, y: 2, emoji: '⬇' },
        { name: 'Sağ Alt', x: 2, y: 2, emoji: '↘' },
    ];

    let container = null;
    let callbacks = null;
    let saveChance = 0.1;
    let shotsTaken = 0;
    let goals = 0;
    let isAnimating = false;

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        const config = levels[level - 1];
        saveChance = config.saveChance;
        shotsTaken = 0;
        goals = 0;
        isAnimating = false;

        GameEngine.setTotal(TOTAL_SHOTS);
        render();
    }

    function render() {
        container.innerHTML = '';

        // Yönerge
        const instr = document.createElement('div');
        instr.className = 'game-instruction';
        instr.textContent = `Atış ${shotsTaken + 1}/${TOTAL_SHOTS} - Kaleye şut çek!`;
        container.appendChild(instr);

        // Skor
        const scoreBar = document.createElement('div');
        scoreBar.className = 'penalti-score';
        scoreBar.innerHTML = `⚽ Gol: <strong>${goals}</strong> / ${TOTAL_SHOTS}`;
        container.appendChild(scoreBar);

        // Kale (3x3 grid)
        const goal = document.createElement('div');
        goal.className = 'penalti-goal';

        // Kale çerçevesi
        const frame = document.createElement('div');
        frame.className = 'penalti-frame';

        const grid = document.createElement('div');
        grid.className = 'penalti-grid';

        ZONES.forEach((zone, idx) => {
            const cell = document.createElement('button');
            cell.className = 'penalti-zone';
            cell.innerHTML = `<span class="penalti-arrow">${zone.emoji}</span>`;
            cell.title = zone.name;
            cell.disabled = isAnimating;

            cell.addEventListener('click', () => {
                if (isAnimating) return;
                takeShot(idx);
            });
            grid.appendChild(cell);
        });

        frame.appendChild(grid);
        goal.appendChild(frame);

        // Top
        const ball = document.createElement('div');
        ball.className = 'penalti-ball';
        ball.id = 'penalti-ball';
        ball.textContent = '⚽';
        goal.appendChild(ball);

        container.appendChild(goal);

        // Atış geçmişi
        const history = document.createElement('div');
        history.className = 'penalti-history';
        for (let i = 0; i < TOTAL_SHOTS; i++) {
            const dot = document.createElement('span');
            dot.className = 'penalti-dot';
            if (i < shotsTaken) {
                // Geçmiş atışlar
                dot.classList.add(i < goals ? 'goal' : 'miss');
                dot.textContent = i < goals ? '⚽' : '❌';
            } else {
                dot.textContent = '○';
            }
            history.appendChild(dot);
        }
        container.appendChild(history);
    }

    function takeShot(zoneIdx) {
        isAnimating = true;
        const zone = ZONES[zoneIdx];

        // Kaleci hangi yöne atlayacak
        const saved = Math.random() < saveChance;
        const keeperZone = saved ? zoneIdx : getRandomZoneExcluding(zoneIdx);

        // Animasyon
        const ball = document.getElementById('penalti-ball');
        const grid = container.querySelector('.penalti-grid');
        const cells = grid.querySelectorAll('.penalti-zone');

        // Top animasyonu - hedefe doğru
        if (ball) {
            ball.style.transition = 'all 0.4s ease-out';
            const targetCell = cells[zoneIdx];
            const rect = targetCell.getBoundingClientRect();
            const goalRect = container.querySelector('.penalti-goal').getBoundingClientRect();
            ball.style.transform = `translate(${rect.left - goalRect.left - goalRect.width/2 + rect.width/2}px, ${rect.top - goalRect.top - goalRect.height + 20}px) scale(0.6)`;
        }

        // Kaleci göster
        setTimeout(() => {
            // Kaleci animasyonu
            const keeperCell = cells[keeperZone];
            keeperCell.innerHTML = '<span class="penalti-keeper">🧤</span>';
            keeperCell.classList.add('keeper-dive');

            setTimeout(() => {
                shotsTaken++;

                if (saved) {
                    // Kurtarıldı!
                    cells[zoneIdx].classList.add('saved');
                    AudioManager.play('error');
                    showResult('Kurtardı! 🧤', false);
                } else {
                    // GOL!
                    goals++;
                    cells[zoneIdx].classList.add('goal-scored');
                    callbacks.onCorrect();
                    AudioManager.play('success');
                    Particles.sparkle(
                        cells[zoneIdx].getBoundingClientRect().left + 30,
                        cells[zoneIdx].getBoundingClientRect().top + 30, 6
                    );
                    showResult('GOL! ⚽🎉', true);
                }
            }, 400);
        }, 500);
    }

    function getRandomZoneExcluding(exclude) {
        let idx;
        do { idx = Math.floor(Math.random() * 9); } while (idx === exclude);
        return idx;
    }

    function showResult(text, isGoal) {
        const msg = document.createElement('div');
        msg.className = `penalti-result ${isGoal ? 'goal' : 'miss'}`;
        msg.textContent = text;
        container.appendChild(msg);

        setTimeout(() => {
            isAnimating = false;

            if (shotsTaken >= TOTAL_SHOTS) {
                // Oyun bitti
                const stars = goals >= 5 ? 3 : goals >= 4 ? 2 : goals >= 3 ? 1 : 0;
                if (stars > 0) {
                    AudioManager.play('levelComplete');
                    Particles.celebrate();
                    setTimeout(() => callbacks.onComplete(stars), 500);
                } else {
                    // Kaybetti
                    showLose();
                }
            } else {
                render();
            }
        }, 1200);
    }

    function showLose() {
        container.innerHTML = `
            <div class="chess-lose-msg">
                <div class="chess-lose-card">
                    <div style="font-size:3rem;">😔</div>
                    <h3>Yeterli gol atamadın!</h3>
                    <p>${goals}/${TOTAL_SHOTS} gol. En az 3 gol gerekli!</p>
                    <button class="chess-retry-btn" id="pen-retry">Tekrar Dene</button>
                </div>
            </div>`;
        container.querySelector('#pen-retry').onclick = () => {
            init(container, levels.findIndex(l => l.saveChance === saveChance) + 1, callbacks);
        };
    }

    function destroy() {
        if (container) container.innerHTML = '';
        isAnimating = false;
    }

    return { id, levels, init, destroy };
})();
