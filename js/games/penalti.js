/* ============================================
   OYUN: Penaltı - Kaleye Şut Çek!
   SVG sahne: yeşil çim, kale, kaleci kedi, top
   ============================================ */

const Penalti = (() => {
    const id = 'penalti';
    const levels = [
        { saveChance: 0.10 }, { saveChance: 0.15 }, { saveChance: 0.20 },
        { saveChance: 0.30 }, { saveChance: 0.40 }, { saveChance: 0.50 },
        { saveChance: 0.60 }, { saveChance: 0.70 }, { saveChance: 0.80 },
    ];

    const TOTAL_SHOTS = 5;
    // 3x3 kale bölgeleri (sol/orta/sağ × üst/orta/alt)
    const ZONES = [
        { label: 'Sol Üst',   tx: 70,  ty: 65 },
        { label: 'Orta Üst',  tx: 200, ty: 55 },
        { label: 'Sağ Üst',   tx: 330, ty: 65 },
        { label: 'Sol Orta',  tx: 80,  ty: 120 },
        { label: 'Orta',      tx: 200, ty: 115 },
        { label: 'Sağ Orta',  tx: 320, ty: 120 },
        { label: 'Sol Alt',   tx: 90,  ty: 170 },
        { label: 'Orta Alt',  tx: 200, ty: 170 },
        { label: 'Sağ Alt',   tx: 310, ty: 170 },
    ];

    let container, callbacks, saveChance, shotsTaken, goals, isAnimating, currentLevel;
    let shotResults = []; // [{goal: true/false}]

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        currentLevel = level;
        saveChance = levels[level - 1].saveChance;
        shotsTaken = 0;
        goals = 0;
        isAnimating = false;
        shotResults = [];
        GameEngine.setTotal(TOTAL_SHOTS);
        render();
    }

    // Kaleci SVG pozları
    function keeperSVG(pose) {
        // pose: 'stand', 'dive-left', 'dive-right', 'dive-up', 'dive-down-left', 'dive-down-right'
        if (pose === 'dive-left') {
            return `<!-- Sola uçuyor -->
                <ellipse cx="-10" cy="15" rx="28" ry="18" fill="#FF9800" transform="rotate(-30, -10, 15)"/>
                <circle cx="-15" cy="-8" r="16" fill="#FF9800"/>
                <polygon points="-27,-20 -32,-34 -19,-22" fill="#FF9800"/>
                <polygon points="-3,-20 2,-34 -11,-22" fill="#FF9800"/>
                <circle cx="-20" cy="-10" r="3.5" fill="white"/><circle cx="-10" cy="-10" r="3.5" fill="white"/>
                <circle cx="-19" cy="-10" r="2" fill="#333"/><circle cx="-9" cy="-10" r="2" fill="#333"/>
                <ellipse cx="-15" cy="-3" rx="3" ry="2" fill="#FF7043"/>
                <ellipse cx="-15" cy="18" rx="12" ry="14" fill="#FFE0B2"/>
                <circle cx="-42" cy="0" r="10" fill="#4CAF50"/>
                <circle cx="18" cy="5" r="8" fill="#4CAF50"/>
                <ellipse cx="-20" cy="35" rx="7" ry="5" fill="#FF9800" transform="rotate(-20)"/>
                <ellipse cx="0" cy="35" rx="7" ry="5" fill="#FF9800" transform="rotate(-10)"/>`;
        }
        if (pose === 'dive-right') {
            return `<!-- Sağa uçuyor -->
                <ellipse cx="10" cy="15" rx="28" ry="18" fill="#FF9800" transform="rotate(30, 10, 15)"/>
                <circle cx="15" cy="-8" r="16" fill="#FF9800"/>
                <polygon points="3,-20 -2,-34 11,-22" fill="#FF9800"/>
                <polygon points="27,-20 32,-34 19,-22" fill="#FF9800"/>
                <circle cx="10" cy="-10" r="3.5" fill="white"/><circle cx="20" cy="-10" r="3.5" fill="white"/>
                <circle cx="11" cy="-10" r="2" fill="#333"/><circle cx="21" cy="-10" r="2" fill="#333"/>
                <ellipse cx="15" cy="-3" rx="3" ry="2" fill="#FF7043"/>
                <ellipse cx="15" cy="18" rx="12" ry="14" fill="#FFE0B2"/>
                <circle cx="42" cy="0" r="10" fill="#4CAF50"/>
                <circle cx="-18" cy="5" r="8" fill="#4CAF50"/>
                <ellipse cx="20" cy="35" rx="7" ry="5" fill="#FF9800" transform="rotate(20)"/>
                <ellipse cx="0" cy="35" rx="7" ry="5" fill="#FF9800" transform="rotate(10)"/>`;
        }
        if (pose === 'dive-up') {
            return `<!-- Yukarı uzanıyor -->
                <ellipse cx="0" cy="10" rx="20" ry="30" fill="#FF9800"/>
                <circle cx="0" cy="-22" r="16" fill="#FF9800"/>
                <polygon points="-14,-34 -18,-48 -6,-36" fill="#FF9800"/>
                <polygon points="14,-34 18,-48 6,-36" fill="#FF9800"/>
                <circle cx="-6" cy="-24" r="3.5" fill="white"/><circle cx="6" cy="-24" r="3.5" fill="white"/>
                <circle cx="-5" cy="-24" r="2" fill="#333"/><circle cx="7" cy="-24" r="2" fill="#333"/>
                <ellipse cx="0" cy="-16" rx="3" ry="2" fill="#FF7043"/>
                <ellipse cx="0" cy="14" rx="13" ry="16" fill="#FFE0B2"/>
                <circle cx="-28" cy="-15" r="10" fill="#4CAF50"/>
                <circle cx="28" cy="-15" r="10" fill="#4CAF50"/>
                <ellipse cx="-8" cy="42" rx="7" ry="5" fill="#FF9800"/>
                <ellipse cx="8" cy="42" rx="7" ry="5" fill="#FF9800"/>`;
        }
        // Default: ayakta
        return `<!-- Ayakta duruyor -->
            <ellipse cx="0" cy="20" rx="22" ry="28" fill="#FF9800"/>
            <circle cx="0" cy="-12" r="18" fill="#FF9800"/>
            <polygon points="-14,-26 -18,-40 -6,-28" fill="#FF9800"/>
            <polygon points="14,-26 18,-40 6,-28" fill="#FF9800"/>
            <polygon points="-12,-28 -15,-38 -7,-29" fill="#FFB74D"/>
            <polygon points="12,-28 15,-38 7,-29" fill="#FFB74D"/>
            <circle cx="-7" cy="-14" r="4" fill="white"/><circle cx="7" cy="-14" r="4" fill="white"/>
            <circle cx="-6" cy="-14" r="2.5" fill="#333"/><circle cx="8" cy="-14" r="2.5" fill="#333"/>
            <ellipse cx="0" cy="-6" rx="4" ry="3" fill="#FF7043"/>
            <ellipse cx="0" cy="24" rx="15" ry="18" fill="#FFE0B2"/>
            <circle cx="-26" cy="10" r="9" fill="#4CAF50"/>
            <circle cx="26" cy="10" r="9" fill="#4CAF50"/>
            <ellipse cx="-10" cy="50" rx="8" ry="5" fill="#FF9800"/>
            <ellipse cx="10" cy="50" rx="8" ry="5" fill="#FF9800"/>`;
    }

    function getKeeperPose(zoneIdx) {
        // 0=sol-üst, 1=orta-üst, 2=sağ-üst, 3=sol-orta, 4=orta, 5=sağ-orta, 6=sol-alt, 7=orta-alt, 8=sağ-alt
        if (zoneIdx <= 2) return 'dive-up';       // üst sıra
        if (zoneIdx === 0 || zoneIdx === 3 || zoneIdx === 6) return 'dive-left';  // sol
        if (zoneIdx === 2 || zoneIdx === 5 || zoneIdx === 8) return 'dive-right'; // sağ
        return 'stand'; // orta
    }

    // ── SVG Sahne ──
    function buildScene() {
        return `
        <svg viewBox="0 0 400 300" class="penalti-scene" xmlns="http://www.w3.org/2000/svg">
            <!-- Gökyüzü -->
            <defs>
                <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#87CEEB"/>
                    <stop offset="100%" stop-color="#B8E6FF"/>
                </linearGradient>
                <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#4CAF50"/>
                    <stop offset="100%" stop-color="#388E3C"/>
                </linearGradient>
            </defs>
            <rect width="400" height="300" fill="url(#skyGrad)"/>

            <!-- Bulutlar -->
            <ellipse cx="80" cy="40" rx="40" ry="15" fill="white" opacity="0.7"/>
            <ellipse cx="60" cy="35" rx="25" ry="12" fill="white" opacity="0.7"/>
            <ellipse cx="320" cy="50" rx="35" ry="12" fill="white" opacity="0.6"/>

            <!-- Çim -->
            <rect x="0" y="185" width="400" height="115" fill="url(#grassGrad)"/>
            <!-- Çim çizgileri -->
            <line x1="0" y1="210" x2="400" y2="210" stroke="#43A047" stroke-width="1" opacity="0.4"/>
            <line x1="0" y1="240" x2="400" y2="240" stroke="#43A047" stroke-width="1" opacity="0.3"/>

            <!-- Kale direkleri -->
            <rect x="40" y="45" width="6" height="155" rx="3" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1"/>
            <rect x="354" y="45" width="6" height="155" rx="3" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1"/>
            <rect x="38" y="40" width="324" height="8" rx="4" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1"/>

            <!-- Ağ -->
            <path d="M46,48 L46,198 L20,210 L20,55 Z" fill="none" stroke="#ccc" stroke-width="0.5" opacity="0.6"/>
            <path d="M354,48 L354,198 L380,210 L380,55 Z" fill="none" stroke="#ccc" stroke-width="0.5" opacity="0.6"/>
            <!-- Yatay ağ çizgileri -->
            ${[70,95,120,145,170].map(y => `<line x1="46" y1="${y}" x2="354" y2="${y}" stroke="#ccc" stroke-width="0.5" opacity="0.3"/>`).join('')}
            <!-- Dikey ağ çizgileri -->
            ${[100,150,200,250,300].map(x => `<line x1="${x}" y1="48" x2="${x}" y2="198" stroke="#ccc" stroke-width="0.5" opacity="0.3"/>`).join('')}

            <!-- 3x3 Tıklanabilir bölgeler (görünmez) -->
            ${ZONES.map((z, i) => `
                <rect class="pen-target" data-zone="${i}"
                    x="${z.tx - 50}" y="${z.ty - 25}" width="100" height="50"
                    fill="transparent" cursor="pointer" rx="8"/>
            `).join('')}

            <!-- Kaleci Kedi -->
            <g id="pen-keeper" transform="translate(200, 140)">
                ${keeperSVG('stand')}
            </g>

            <!-- Top -->
            <g id="pen-ball" transform="translate(200, 260)">
                <circle cx="0" cy="0" r="14" fill="white" stroke="#333" stroke-width="1.5"/>
                <path d="M-5,-12 L5,-12 L8,-3 L0,4 L-8,-3 Z" fill="#333" opacity="0.8"/>
                <path d="M-14,0 L-8,-3 L-8,6 L-12,4 Z" fill="#333" opacity="0.6"/>
                <path d="M14,0 L8,-3 L8,6 L12,4 Z" fill="#333" opacity="0.6"/>
                <circle cx="-3" cy="-4" r="3" fill="white" opacity="0.4"/>
            </g>

            <!-- Sonuç mesajı -->
            <text id="pen-msg" x="200" y="260" text-anchor="middle" font-size="0" font-weight="bold" fill="white" stroke="#333" stroke-width="1"></text>
        </svg>`;
    }

    function render() {
        container.innerHTML = '';

        // Skor + atış bilgisi
        const topBar = document.createElement('div');
        topBar.className = 'pen-topbar';
        topBar.innerHTML = `
            <span class="pen-shot-info">Atış ${Math.min(shotsTaken + 1, TOTAL_SHOTS)}/${TOTAL_SHOTS}</span>
            <span class="pen-score-info">⚽ ${goals} Gol</span>
        `;
        container.appendChild(topBar);

        // SVG Sahne
        const sceneWrap = document.createElement('div');
        sceneWrap.className = 'pen-scene-wrap';
        sceneWrap.innerHTML = buildScene();
        container.appendChild(sceneWrap);

        // Hedef bölgelere tıklama
        sceneWrap.querySelectorAll('.pen-target').forEach(target => {
            target.addEventListener('click', () => {
                if (isAnimating) return;
                const zoneIdx = parseInt(target.dataset.zone);
                takeShot(zoneIdx);
            });
            // Hover efekti
            target.addEventListener('mouseenter', () => {
                if (!isAnimating) target.setAttribute('fill', 'rgba(255,255,255,0.2)');
            });
            target.addEventListener('mouseleave', () => {
                target.setAttribute('fill', 'transparent');
            });
        });

        // Atış geçmişi
        const history = document.createElement('div');
        history.className = 'pen-history';
        for (let i = 0; i < TOTAL_SHOTS; i++) {
            const dot = document.createElement('span');
            dot.className = 'pen-dot';
            if (i < shotResults.length) {
                dot.classList.add(shotResults[i].goal ? 'goal' : 'miss');
                dot.textContent = shotResults[i].goal ? '⚽' : '❌';
            } else if (i === shotsTaken) {
                dot.classList.add('current');
                dot.textContent = '🔵';
            } else {
                dot.textContent = '⚪';
            }
            history.appendChild(dot);
        }
        container.appendChild(history);
    }

    function takeShot(zoneIdx) {
        isAnimating = true;
        const zone = ZONES[zoneIdx];
        const saved = Math.random() < saveChance;
        const keeperZoneIdx = saved ? zoneIdx : getRandomZoneExcluding(zoneIdx);
        const keeperZone = ZONES[keeperZoneIdx];

        const svg = container.querySelector('.penalti-scene');
        const ball = svg.querySelector('#pen-ball');
        const keeper = svg.querySelector('#pen-keeper');
        const msg = svg.querySelector('#pen-msg');

        // 1) Top hedefe uçar
        ball.style.transition = 'transform 0.5s cubic-bezier(0.2, 0, 0.2, 1)';
        ball.setAttribute('transform', `translate(${zone.tx}, ${zone.ty}) scale(0.7)`);

        // 2) Kaleci atlar + poz değişir
        setTimeout(() => {
            const kx = keeperZone.tx;
            const ky = keeperZone.ty + 10;
            const pose = getKeeperPose(keeperZoneIdx);
            keeper.innerHTML = keeperSVG(pose);
            keeper.style.transition = 'transform 0.35s ease-out';
            keeper.setAttribute('transform', `translate(${kx}, ${ky}) scale(0.9)`);
        }, 200);

        // 3) Sonuç
        setTimeout(() => {
            shotsTaken++;

            if (saved) {
                shotResults.push({ goal: false });
                msg.textContent = 'KURTARDI!';
                msg.setAttribute('fill', '#F44336');
                msg.setAttribute('font-size', '28');
                AudioManager.play('error');
            } else {
                goals++;
                shotResults.push({ goal: true });
                callbacks.onCorrect();
                msg.textContent = 'GOL!';
                msg.setAttribute('fill', '#4CAF50');
                msg.setAttribute('font-size', '36');
                AudioManager.play('success');
                const rect = container.getBoundingClientRect();
                Particles.sparkle(rect.left + rect.width * (zone.tx / 400), rect.top + rect.height * 0.3, 8);
            }

            // 4) Reset ve sonraki atış
            setTimeout(() => {
                isAnimating = false;
                if (shotsTaken >= TOTAL_SHOTS) {
                    const stars = goals >= 5 ? 3 : goals >= 4 ? 2 : goals >= 3 ? 1 : 0;
                    if (stars > 0) {
                        AudioManager.play('levelComplete');
                        Particles.celebrate();
                        setTimeout(() => callbacks.onComplete(stars), 500);
                    } else {
                        showLose();
                    }
                } else {
                    render();
                }
            }, 1200);
        }, 700);
    }

    function getRandomZoneExcluding(exclude) {
        let idx;
        do { idx = Math.floor(Math.random() * 9); } while (idx === exclude);
        return idx;
    }

    function showLose() {
        container.innerHTML = `
            <div class="kod-gameover">
                <div class="kod-gameover-card" style="background: linear-gradient(135deg, #fd79a8, #e17055);">
                    <div class="kod-gameover-icon">😔</div>
                    <h2 class="kod-gameover-title" style="color:white;">Yeterli Gol Yok!</h2>
                    <p class="kod-gameover-sub" style="color:rgba(255,255,255,0.8);">${goals}/${TOTAL_SHOTS} gol attın. En az 3 gol gerekli!</p>
                    <button class="kod-gameover-btn" id="pen-retry">Tekrar Dene</button>
                </div>
            </div>`;
        container.querySelector('#pen-retry').onclick = () => init(container, currentLevel, callbacks);
    }

    function destroy() {
        if (container) container.innerHTML = '';
        isAnimating = false;
    }

    return { id, levels, init, destroy };
})();
