/* ============================================
   OYUN: Penaltı MP - Online 2 Kişilik
   Gerçek futbol penaltı atışı kuralları
   ============================================ */

const PenaltiMP = (() => {
  const id = 'penalti-mp';
  const isMultiplayer = true;

  const TOTAL_ROUNDS = 5;
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

  // Kaleci SVG renkleri
  const SKIN = '#FDDCB5';
  const JERSEY_HOME = '#FFD600';
  const JERSEY_AWAY = '#2196F3';
  const SHORTS = '#333';
  const GLOVES = '#4CAF50';
  const HAIR = '#5D4037';

  let container = null;
  let gameData = null;
  let gameOver = false;
  let myRole = null;       // 'host' | 'guest'
  let amShooter = false;   // Bu turda atan mıyım?
  let selectedZone = null; // Seçtiğim bölge
  let waitingOpponent = false;
  let hostScore = 0;
  let guestScore = 0;
  let hostShots = [];      // [{zone, keeperZone, goal}]
  let guestShots = [];
  let currentRound = 1;
  let currentShooter = 'host';
  let isAnimating = false;
  let isSuddenDeath = false;

  function init(gameArea, data) {
    container = gameArea;
    gameData = data;
    myRole = data.yourRole;
    gameOver = false;
    selectedZone = null;
    waitingOpponent = false;
    hostScore = 0;
    guestScore = 0;
    hostShots = [];
    guestShots = [];
    currentRound = 1;
    currentShooter = 'host';
    isAnimating = false;
    isSuddenDeath = false;
    amShooter = (myRole === 'host'); // Host ilk atan
    render();
    setupListeners();
  }

  // ── Kaleci SVG ──
  function keeperSVG(pose, jersey) {
    const J = jersey || JERSEY_HOME;
    if (pose === 'dive-left') {
      return `<g transform="rotate(-25, 0, 10)">
        <rect x="5" y="28" width="8" height="22" rx="4" fill="${SKIN}"/>
        <rect x="-12" y="25" width="8" height="22" rx="4" fill="${SKIN}" transform="rotate(20,-8,25)"/>
        <ellipse cx="9" cy="52" rx="6" ry="4" fill="#222"/>
        <ellipse cx="-6" cy="50" rx="6" ry="4" fill="#222"/>
        <rect x="-12" y="20" width="28" height="12" rx="4" fill="${SHORTS}"/>
        <rect x="-14" y="-2" width="30" height="24" rx="6" fill="${J}"/>
        <text x="1" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#333">1</text>
        <circle cx="0" cy="-14" r="12" fill="${SKIN}"/>
        <ellipse cx="0" cy="-22" rx="12" ry="6" fill="${HAIR}"/>
        <circle cx="-4" cy="-16" r="2" fill="#333"/>
        <circle cx="5" cy="-16" r="2" fill="#333"/>
        <path d="M-2,-10 Q1,-8 4,-10" fill="none" stroke="#333" stroke-width="1"/>
        <rect x="-42" y="-8" width="30" height="8" rx="4" fill="${J}"/>
        <circle cx="-44" cy="-4" r="7" fill="${GLOVES}"/>
        <rect x="14" y="0" width="18" height="7" rx="3" fill="${J}"/>
        <circle cx="33" cy="3" r="6" fill="${GLOVES}"/>
      </g>`;
    }
    if (pose === 'dive-right') {
      return `<g transform="rotate(25, 0, 10)">
        <rect x="-12" y="28" width="8" height="22" rx="4" fill="${SKIN}"/>
        <rect x="5" y="25" width="8" height="22" rx="4" fill="${SKIN}" transform="rotate(-20,8,25)"/>
        <ellipse cx="-8" cy="52" rx="6" ry="4" fill="#222"/>
        <ellipse cx="9" cy="50" rx="6" ry="4" fill="#222"/>
        <rect x="-14" y="20" width="28" height="12" rx="4" fill="${SHORTS}"/>
        <rect x="-14" y="-2" width="30" height="24" rx="6" fill="${J}"/>
        <text x="1" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#333">1</text>
        <circle cx="0" cy="-14" r="12" fill="${SKIN}"/>
        <ellipse cx="0" cy="-22" rx="12" ry="6" fill="${HAIR}"/>
        <circle cx="-4" cy="-16" r="2" fill="#333"/>
        <circle cx="5" cy="-16" r="2" fill="#333"/>
        <path d="M-2,-10 Q1,-8 4,-10" fill="none" stroke="#333" stroke-width="1"/>
        <rect x="14" y="-8" width="30" height="8" rx="4" fill="${J}"/>
        <circle cx="46" cy="-4" r="7" fill="${GLOVES}"/>
        <rect x="-30" y="0" width="18" height="7" rx="3" fill="${J}"/>
        <circle cx="-31" cy="3" r="6" fill="${GLOVES}"/>
      </g>`;
    }
    if (pose === 'dive-up') {
      return `<rect x="-5" y="30" width="8" height="22" rx="4" fill="${SKIN}"/>
        <rect x="0" y="30" width="8" height="22" rx="4" fill="${SKIN}"/>
        <ellipse cx="-1" cy="54" rx="6" ry="4" fill="#222"/>
        <ellipse cx="4" cy="54" rx="6" ry="4" fill="#222"/>
        <rect x="-10" y="22" width="24" height="12" rx="4" fill="${SHORTS}"/>
        <rect x="-12" y="-2" width="28" height="26" rx="6" fill="${J}"/>
        <text x="2" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#333">1</text>
        <circle cx="2" cy="-14" r="12" fill="${SKIN}"/>
        <ellipse cx="2" cy="-22" rx="12" ry="6" fill="${HAIR}"/>
        <circle cx="-2" cy="-16" r="2" fill="#333"/>
        <circle cx="7" cy="-16" r="2" fill="#333"/>
        <path d="M0,-10 Q3,-8 6,-10" fill="none" stroke="#333" stroke-width="1"/>
        <rect x="-18" y="-30" width="7" height="30" rx="3" fill="${J}"/>
        <circle cx="-15" cy="-32" r="7" fill="${GLOVES}"/>
        <rect x="15" y="-30" width="7" height="30" rx="3" fill="${J}"/>
        <circle cx="18" cy="-32" r="7" fill="${GLOVES}"/>`;
    }
    // stand
    return `<rect x="-8" y="30" width="8" height="24" rx="4" fill="${SKIN}"/>
      <rect x="3" y="30" width="8" height="24" rx="4" fill="${SKIN}"/>
      <ellipse cx="-4" cy="56" rx="7" ry="4" fill="#222"/>
      <ellipse cx="7" cy="56" rx="7" ry="4" fill="#222"/>
      <rect x="-12" y="22" width="28" height="14" rx="5" fill="${SHORTS}"/>
      <rect x="-14" y="-4" width="32" height="28" rx="6" fill="${J}"/>
      <text x="2" y="18" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">1</text>
      <circle cx="2" cy="-16" r="14" fill="${SKIN}"/>
      <ellipse cx="2" cy="-26" rx="14" ry="7" fill="${HAIR}"/>
      <circle cx="-3" cy="-18" r="2.5" fill="#333"/>
      <circle cx="7" cy="-18" r="2.5" fill="#333"/>
      <path d="M-1,-12 Q2,-9 5,-12" fill="none" stroke="#333" stroke-width="1.2"/>
      <rect x="-36" y="-2" width="24" height="8" rx="4" fill="${J}"/>
      <circle cx="-38" cy="2" r="7" fill="${GLOVES}"/>
      <rect x="16" y="-2" width="24" height="8" rx="4" fill="${J}"/>
      <circle cx="42" cy="2" r="7" fill="${GLOVES}"/>`;
  }

  function getKeeperPose(zoneIdx) {
    if (zoneIdx === 0 || zoneIdx === 3 || zoneIdx === 6) return 'dive-left';
    if (zoneIdx === 2 || zoneIdx === 5 || zoneIdx === 8) return 'dive-right';
    if (zoneIdx === 1) return 'dive-up';
    return 'stand';
  }

  // ── SVG Sahne ──
  function buildScene() {
    return `
    <svg viewBox="0 0 400 300" class="penalti-scene" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyGradMP" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#87CEEB"/>
          <stop offset="100%" stop-color="#B8E6FF"/>
        </linearGradient>
        <linearGradient id="grassGradMP" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4CAF50"/>
          <stop offset="100%" stop-color="#388E3C"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#skyGradMP)"/>
      <ellipse cx="80" cy="40" rx="40" ry="15" fill="white" opacity="0.7"/>
      <ellipse cx="60" cy="35" rx="25" ry="12" fill="white" opacity="0.7"/>
      <ellipse cx="320" cy="50" rx="35" ry="12" fill="white" opacity="0.6"/>
      <rect x="0" y="185" width="400" height="115" fill="url(#grassGradMP)"/>
      <line x1="0" y1="210" x2="400" y2="210" stroke="#43A047" stroke-width="1" opacity="0.4"/>
      <line x1="0" y1="240" x2="400" y2="240" stroke="#43A047" stroke-width="1" opacity="0.3"/>
      <rect x="40" y="45" width="6" height="155" rx="3" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1"/>
      <rect x="354" y="45" width="6" height="155" rx="3" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1"/>
      <rect x="38" y="40" width="324" height="8" rx="4" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1"/>
      <path d="M46,48 L46,198 L20,210 L20,55 Z" fill="none" stroke="#ccc" stroke-width="0.5" opacity="0.6"/>
      <path d="M354,48 L354,198 L380,210 L380,55 Z" fill="none" stroke="#ccc" stroke-width="0.5" opacity="0.6"/>
      ${[70,95,120,145,170].map(y => `<line x1="46" y1="${y}" x2="354" y2="${y}" stroke="#ccc" stroke-width="0.5" opacity="0.3"/>`).join('')}
      ${[100,150,200,250,300].map(x => `<line x1="${x}" y1="48" x2="${x}" y2="198" stroke="#ccc" stroke-width="0.5" opacity="0.3"/>`).join('')}
      ${ZONES.map((z, i) => `
        <rect class="pen-target" data-zone="${i}"
          x="${z.tx - 50}" y="${z.ty - 25}" width="100" height="50"
          fill="transparent" cursor="pointer" rx="8"/>
      `).join('')}
      <g id="pen-keeper-mp" transform="translate(200, 140)">
        ${keeperSVG('stand', amShooter ? JERSEY_AWAY : JERSEY_HOME)}
      </g>
      <g id="pen-ball-mp" transform="translate(200, 260)">
        <circle cx="0" cy="0" r="14" fill="white" stroke="#333" stroke-width="1.5"/>
        <path d="M-5,-12 L5,-12 L8,-3 L0,4 L-8,-3 Z" fill="#333" opacity="0.8"/>
        <path d="M-14,0 L-8,-3 L-8,6 L-12,4 Z" fill="#333" opacity="0.6"/>
        <path d="M14,0 L8,-3 L8,6 L12,4 Z" fill="#333" opacity="0.6"/>
        <circle cx="-3" cy="-4" r="3" fill="white" opacity="0.4"/>
      </g>
      <text id="pen-msg-mp" x="200" y="260" text-anchor="middle" font-size="0" font-weight="bold" fill="white" stroke="#333" stroke-width="1"></text>
    </svg>`;
  }

  // ── Skor Tablosu ──
  function buildScoreboard() {
    const hostName = myRole === 'host' ? 'Sen' : (gameData.opponentName || 'Rakip');
    const guestName = myRole === 'guest' ? 'Sen' : (gameData.opponentName || 'Rakip');

    const maxDots = isSuddenDeath ? Math.max(hostShots.length, guestShots.length, TOTAL_ROUNDS + 1) : TOTAL_ROUNDS;

    function shotDots(shots, count) {
      let html = '';
      for (let i = 0; i < count; i++) {
        if (i < shots.length) {
          html += `<span class="pen-mp-dot ${shots[i].goal ? 'goal' : 'miss'}">${shots[i].goal ? '⚽' : '❌'}</span>`;
        } else {
          html += `<span class="pen-mp-dot empty">⚪</span>`;
        }
      }
      return html;
    }

    return `
      <div class="pen-mp-scoreboard">
        <div class="pen-mp-team ${myRole === 'host' ? 'pen-mp-me' : ''}">
          <span class="pen-mp-name">${hostName}</span>
          <span class="pen-mp-score">${hostScore}</span>
          <div class="pen-mp-dots">${shotDots(hostShots, maxDots)}</div>
        </div>
        <div class="pen-mp-vs">
          <span class="pen-mp-round">${isSuddenDeath ? '⚡ Seri' : 'Atış ' + currentRound + '/' + TOTAL_ROUNDS}</span>
          <span class="pen-mp-vs-text">VS</span>
        </div>
        <div class="pen-mp-team ${myRole === 'guest' ? 'pen-mp-me' : ''}">
          <span class="pen-mp-name">${guestName}</span>
          <span class="pen-mp-score">${guestScore}</span>
          <div class="pen-mp-dots">${shotDots(guestShots, maxDots)}</div>
        </div>
      </div>`;
  }

  // ── Render ──
  function render() {
    const roleText = amShooter ? '⚽ Nereye Vuruyorsun?' : '🧤 Nereye Atlıyorsun?';
    const roleClass = amShooter ? 'shooter' : 'keeper';

    container.innerHTML = `
      <div class="mp-game pen-mp-game">
        <div class="mp-toolbar">
          <button class="mp-home-btn" id="mp-leave">🏠</button>
          <div class="mp-title"><h2>⚽ Penaltı Online</h2></div>
          <div class="pen-mp-role-badge ${roleClass}">${roleText}</div>
        </div>
        ${buildScoreboard()}
        <div class="pen-scene-wrap">
          ${buildScene()}
        </div>
        <div class="pen-mp-status" id="pen-mp-status">
          ${waitingOpponent ? '<div class="pen-mp-waiting"><div class="waiting-dots"><span>.</span><span>.</span><span>.</span></div><span>Rakip seçiyor...</span></div>' : '<span class="pen-mp-hint">' + (amShooter ? 'Topu göndermek istediğin köşeye tıkla!' : 'Kaleci olarak atlamak istediğin yöne tıkla!') + '</span>'}
        </div>
      </div>`;

    // Leave button
    container.querySelector('#mp-leave').onclick = () => {
      Multiplayer.send('LEAVE_LOBBY');
      Multiplayer.offAll();
      App.showHub();
    };

    // Zone click
    if (!waitingOpponent && !isAnimating && !gameOver) {
      container.querySelectorAll('.pen-target').forEach(target => {
        target.addEventListener('click', () => {
          if (waitingOpponent || isAnimating || gameOver) return;
          const zoneIdx = parseInt(target.dataset.zone);
          selectZone(zoneIdx);
        });
        target.addEventListener('mouseenter', () => {
          if (!waitingOpponent && !isAnimating && !gameOver) target.setAttribute('fill', 'rgba(255,255,255,0.25)');
        });
        target.addEventListener('mouseleave', () => {
          target.setAttribute('fill', 'transparent');
        });
      });
    }
  }

  function selectZone(zoneIdx) {
    selectedZone = zoneIdx;
    waitingOpponent = true;

    if (amShooter) {
      Multiplayer.send('PENALTY_SHOOT', { zone: zoneIdx });
    } else {
      Multiplayer.send('PENALTY_KEEPER', { zone: zoneIdx });
    }

    // Update status
    const statusEl = container.querySelector('#pen-mp-status');
    if (statusEl) {
      statusEl.innerHTML = '<div class="pen-mp-waiting"><div class="waiting-dots"><span>.</span><span>.</span><span>.</span></div><span>Rakip seçiyor...</span></div>';
    }

    // Disable zone clicking
    container.querySelectorAll('.pen-target').forEach(t => {
      t.style.pointerEvents = 'none';
    });

    AudioManager.play('tap');
  }

  // ── Animasyon ──
  function playResultAnimation(shotZone, keeperZone, isGoal, callback) {
    isAnimating = true;
    const svg = container.querySelector('.penalti-scene');
    if (!svg) { isAnimating = false; if (callback) callback(); return; }

    const ball = svg.querySelector('#pen-ball-mp');
    const keeper = svg.querySelector('#pen-keeper-mp');
    const msg = svg.querySelector('#pen-msg-mp');

    const sz = ZONES[shotZone];
    const kz = ZONES[keeperZone];

    // Top hedefe uçar
    if (ball) {
      ball.style.transition = 'transform 0.5s cubic-bezier(0.2, 0, 0.2, 1)';
      ball.setAttribute('transform', `translate(${sz.tx}, ${sz.ty}) scale(0.7)`);
    }

    // Kaleci atlar
    setTimeout(() => {
      if (keeper) {
        const pose = getKeeperPose(keeperZone);
        keeper.innerHTML = keeperSVG(pose, amShooter ? JERSEY_AWAY : JERSEY_HOME);
        keeper.style.transition = 'transform 0.35s ease-out';
        keeper.setAttribute('transform', `translate(${kz.tx}, ${kz.ty + 10}) scale(0.9)`);
      }
    }, 200);

    // Sonuç mesajı
    setTimeout(() => {
      if (msg) {
        if (isGoal) {
          msg.textContent = 'GOL!';
          msg.setAttribute('fill', '#4CAF50');
          msg.setAttribute('font-size', '36');
          AudioManager.play('success');
          const rect = container.getBoundingClientRect();
          Particles.sparkle(rect.left + rect.width * (sz.tx / 400), rect.top + rect.height * 0.3, 8);
        } else {
          msg.textContent = 'KURTARDI!';
          msg.setAttribute('fill', '#F44336');
          msg.setAttribute('font-size', '28');
          AudioManager.play('error');
        }
      }

      // Reset sonrası callback
      setTimeout(() => {
        isAnimating = false;
        if (callback) callback();
      }, 1500);
    }, 700);
  }

  // ── Listeners ──
  function setupListeners() {
    Multiplayer.on('PENALTY_RESULT', (data) => {
      // data: { round, shooter, shotZone, keeperZone, goal, hostScore, guestScore, hostShots, guestShots, currentShooter, currentRound, isSuddenDeath }
      hostScore = data.hostScore;
      guestScore = data.guestScore;
      hostShots = data.hostShots || [];
      guestShots = data.guestShots || [];
      currentRound = data.currentRound;
      currentShooter = data.currentShooter;
      isSuddenDeath = data.isSuddenDeath || false;

      // Animasyonu oynat
      playResultAnimation(data.shotZone, data.keeperZone, data.goal, () => {
        // Sonraki atışa hazırlan
        waitingOpponent = false;
        selectedZone = null;
        amShooter = (currentShooter === myRole);
        render();
      });
    });

    Multiplayer.on('GAME_OVER', (data) => {
      gameOver = true;

      // Son atışın animasyonunu bekle
      const showResult = () => {
        renderGameOver(data);
      };

      if (isAnimating) {
        const check = setInterval(() => {
          if (!isAnimating) {
            clearInterval(check);
            showResult();
          }
        }, 200);
      } else {
        showResult();
      }
    });

    Multiplayer.on('OPPONENT_LEFT', () => {
      gameOver = true;
      showToast('Rakip oyundan ayrıldı!');
      setTimeout(() => App.showHub(), 3000);
    });

    Multiplayer.on('ERROR', (data) => {
      showToast(data.message);
      waitingOpponent = false;
      render();
    });
  }

  // ── Game Over ──
  function renderGameOver(data) {
    let resultText, resultClass;
    if (data.winner === 'draw') {
      resultText = 'Berabere!';
      resultClass = 'draw';
    } else if (data.winner === myRole) {
      resultText = 'Kazandın!';
      resultClass = 'win';
      Particles.celebrate();
    } else {
      resultText = 'Kaybettin!';
      resultClass = 'lose';
    }

    const overlay = document.createElement('div');
    overlay.className = 'mp-game-over-overlay';
    overlay.innerHTML = `
      <div class="mp-game-over ${resultClass}">
        <h2>${resultClass === 'win' ? '🏆' : resultClass === 'draw' ? '🤝' : '😢'} ${resultText}</h2>
        <div class="pen-mp-final-score">
          <div class="pen-mp-final-team">
            <span class="pen-mp-final-name">${myRole === 'host' ? 'Sen' : (gameData.opponentName || 'Rakip')}</span>
            <span class="pen-mp-final-num">${data.hostScore || hostScore}</span>
          </div>
          <span class="pen-mp-final-dash">-</span>
          <div class="pen-mp-final-team">
            <span class="pen-mp-final-name">${myRole === 'guest' ? 'Sen' : (gameData.opponentName || 'Rakip')}</span>
            <span class="pen-mp-final-num">${data.guestScore || guestScore}</span>
          </div>
        </div>
        <div class="mp-game-over-btns">
          <button class="lobby-btn lobby-btn-create" id="mp-play-again">${TR.mp.playAgain}</button>
          <button class="lobby-btn lobby-btn-join" id="mp-go-hub">${TR.mp.backToHub}</button>
        </div>
      </div>`;
    container.appendChild(overlay);

    overlay.querySelector('#mp-play-again').onclick = () => {
      Multiplayer.offAll();
      overlay.remove();
      Lobby.show(id, container, { onGameStart: (d) => init(container, d) });
    };
    overlay.querySelector('#mp-go-hub').onclick = () => {
      Multiplayer.offAll();
      Multiplayer.disconnect();
      App.showHub();
    };
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'lobby-error-toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function destroy() {
    Multiplayer.offAll();
    if (container) container.innerHTML = '';
  }

  return { id, isMultiplayer, init, destroy };
})();
