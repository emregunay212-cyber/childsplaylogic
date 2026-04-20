/* ============================================
   OYUN: SpaceWaves — Uzay Dalgaları
   Canvas tabanlı side-scroller, gravity-switch kontrolü,
   çarpışmada bilişim sorusu + checkpoint + hız rampası
   ============================================ */

const SpaceWaves = (() => {
  const id = 'space-waves';
  const levels = [{}];

  // ---- Sabitler ----
  const GAME_W = 800, GAME_H = 420;
  const FPS = 60, STEP = 1 / FPS;
  const PLAYER_X = 120;
  const PLAYER_W = 42, PLAYER_H = 28;

  const BASE_SPEED = 160;
  const MAX_SPEED  = 300;
  const RAMP_SECONDS = 2.5;

  const GRAVITY = 650;
  const MAX_VY  = 210;
  const FLIP_KICK = 0.35;  // toggle anında anlık yön hızı oranı (0-1)

  const CHECKPOINT_EVERY = 500;
  const RESPAWN_CLEAR_AHEAD = 260;
  const INVULN_MS = 1100;

  const QUESTION_TIME = 15;
  const MAX_LIVES = 3;

  const OBSTACLE_MIN_GAP = 220;
  const OBSTACLE_MAX_GAP = 420;
  const STAR_CHANCE = 0.55;

  // ---- Durum ----
  let container, callbacks;
  let canvas, ctx;
  let uiLayer;
  let hudEl, livesEl, scoreEl, distanceEl;
  let player;
  let obstacles, stars, particles;
  let checkpointWorldX, lastCheckpointScore, lastCheckpointDistance;
  let worldX, currentSpeed, respawnTimer;
  let lives, score, distanceScore, starsCollected;
  let state;
  let lastTime, accum, animFrameId;
  let usedQuestions;
  let currentQuestion;
  let invulnUntil;
  let nextObstacleAtWorldX;
  let inputDir;
  let finalScore;
  let savedThisRound;
  let keyHandler, clickHandler, touchHandler;
  let questionTimerId;
  let parallax;
  let db;
  let countdownEndAt;          // ms — countdown hedef zamanı
  let countdownSec;            // 3, 2, 1, 0 (GO) gösterilen rakam

  // ---------- Yardımcılar ----------
  function nowMs() { return performance.now(); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"'`]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
    })[ch]);
  }

  // ---------- Init / Destroy ----------
  function init(gameArea, level, cbs) {
    container = gameArea;
    callbacks = cbs || {};
    try { db = firebase.database(); } catch (e) { db = null; }

    buildDOM();
    bindInput();
    resetRun();
    lastTime = nowMs(); accum = 0;
    gameLoop();
  }

  function destroy() {
    state = 'destroyed';
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (questionTimerId) { clearInterval(questionTimerId); questionTimerId = null; }
    unbindInput();
    if (container) container.innerHTML = '';
  }

  function resetRun() {
    worldX = 0;
    currentSpeed = 0;
    respawnTimer = 0;
    lives = MAX_LIVES;
    score = 0;
    distanceScore = 0;
    starsCollected = 0;
    checkpointWorldX = 0;
    lastCheckpointScore = 0;
    lastCheckpointDistance = 0;
    obstacles = [];
    stars = [];
    particles = [];
    usedQuestions = new Set();
    state = 'playing';
    invulnUntil = nowMs() + INVULN_MS;
    nextObstacleAtWorldX = 400;
    inputDir = 1;
    finalScore = 0;
    savedThisRound = false;

    player = { x: PLAYER_X, y: GAME_H / 2, vy: 0, r: 14 };

    // İlk start için countdown'a geç
    state = 'countdown';
    countdownEndAt = nowMs() + 3000;
    countdownSec = 3;

    parallax = {
      farStars: genStars(60, 0.15, 1.2),
      midStars: genStars(40, 0.35, 1.6),
      nearStars: genStars(25, 0.6, 2.2),
      nebula: { offset: 0 },
    };

    renderHUD();
  }

  function genStars(n, speedFactor, maxR) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        x: Math.random() * GAME_W,
        y: Math.random() * GAME_H,
        r: 0.4 + Math.random() * maxR,
        speedFactor,
        twinkle: Math.random() * Math.PI * 2
      });
    }
    return arr;
  }

  // ---------- DOM ----------
  function buildDOM() {
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'sw-wrap';

    canvas = document.createElement('canvas');
    canvas.className = 'sw-canvas';
    canvas.width = GAME_W;
    canvas.height = GAME_H;
    ctx = canvas.getContext('2d');
    wrap.appendChild(canvas);

    uiLayer = document.createElement('div');
    uiLayer.className = 'sw-ui-layer';
    wrap.appendChild(uiLayer);

    hudEl = document.createElement('div');
    hudEl.className = 'sw-hud';
    hudEl.innerHTML =
      '<div class="sw-hud-box sw-lives" id="sw-lives"></div>' +
      '<div class="sw-hud-box sw-score"><span class="sw-hud-label">Skor</span><span id="sw-score">0</span></div>' +
      '<div class="sw-hud-box sw-dist"><span class="sw-hud-label">Mesafe</span><span id="sw-distance">0</span></div>';
    uiLayer.appendChild(hudEl);

    const hint = document.createElement('div');
    hint.className = 'sw-hint';
    hint.innerHTML = '<span>Boşluk / Sol tık ile <b>yön değiştir</b></span>';
    uiLayer.appendChild(hint);

    container.appendChild(wrap);

    livesEl = document.getElementById('sw-lives');
    scoreEl = document.getElementById('sw-score');
    distanceEl = document.getElementById('sw-distance');
  }

  // ---------- Input ----------
  function bindInput() {
    keyHandler = (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleGravity();
      }
    };
    clickHandler = (e) => { if (e.button === 0) toggleGravity(); };
    touchHandler = (e) => { e.preventDefault(); toggleGravity(); };
    document.addEventListener('keydown', keyHandler);
    canvas.addEventListener('mousedown', clickHandler);
    canvas.addEventListener('touchstart', touchHandler, { passive: false });
  }

  function unbindInput() {
    document.removeEventListener('keydown', keyHandler);
    if (canvas) {
      canvas.removeEventListener('mousedown', clickHandler);
      canvas.removeEventListener('touchstart', touchHandler);
    }
  }

  function toggleGravity() {
    if (state !== 'playing' && state !== 'countdown') return;
    inputDir = -inputDir;
    if (state === 'playing') {
      // Anlık yön kazandır — "salınım" hissini önle
      player.vy = inputDir * MAX_VY * FLIP_KICK;
      spawnThrusterBurst();
    }
    try { AudioManager.play('pop'); } catch (e) {}
  }

  function updateCountdown() {
    const remainMs = countdownEndAt - nowMs();
    if (remainMs <= 0) {
      // GO! → gerçek oyun
      state = 'playing';
      respawnTimer = 0;            // hız rampası yeniden başlasın
      currentSpeed = 0;
      invulnUntil = nowMs() + INVULN_MS;
      lastTime = nowMs(); accum = 0;
      try { AudioManager.play('whoosh'); } catch (e) {}
      return;
    }
    const newSec = Math.ceil(remainMs / 1000);
    if (newSec !== countdownSec) {
      countdownSec = newSec;
      try { AudioManager.play('pop'); } catch (e) {}
    }
  }

  // ---------- Oyun döngüsü ----------
  function gameLoop() {
    if (state === 'destroyed') return;
    const t = nowMs();
    const dt = Math.min(0.05, (t - lastTime) / 1000);
    lastTime = t;

    if (state === 'playing') {
      accum += dt;
      while (accum >= STEP) {
        accum -= STEP;
        update(STEP);
      }
    } else if (state === 'countdown') {
      updateCountdown();
      // Countdown sırasında sadece karakter ortada sabit duruyor
      player.y = GAME_H / 2;
      player.vy = 0;
    }
    draw();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  // ---------- Update ----------
  function update(dt) {
    respawnTimer += dt;
    const t = clamp(respawnTimer / RAMP_SECONDS, 0, 1);
    const distBoost = clamp(worldX / 12000, 0, 0.6);
    const targetSpeed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * distBoost;
    currentSpeed = easeOutCubic(t) * targetSpeed;

    const deltaX = currentSpeed * dt;
    worldX += deltaX;

    // Parallax
    [parallax.farStars, parallax.midStars, parallax.nearStars].forEach(field => {
      for (const s of field) {
        s.x -= deltaX * s.speedFactor;
        if (s.x < -5) { s.x += GAME_W + 10; s.y = Math.random() * GAME_H; }
        s.twinkle += dt * 2.4;
      }
    });
    parallax.nebula.offset = (parallax.nebula.offset + deltaX * 0.1) % 1024;

    // Oyuncu fiziği
    player.vy += GRAVITY * inputDir * dt;
    player.vy = clamp(player.vy, -MAX_VY, MAX_VY);
    player.y += player.vy * dt;

    // Sınırlar
    if (player.y < 18) { player.y = 18; player.vy = 0; triggerCollision('border'); return; }
    if (player.y > GAME_H - 18) { player.y = GAME_H - 18; player.vy = 0; triggerCollision('border'); return; }

    // Engelleri/starları taşı
    for (const o of obstacles) o.sx -= deltaX;
    for (const s of stars) s.sx -= deltaX;
    obstacles = obstacles.filter(o => o.sx + o.w > -60);
    stars = stars.filter(s => s.sx + s.r > -20);

    // Spawn
    while (nextObstacleAtWorldX < worldX + GAME_W + 100) {
      spawnObstacle(nextObstacleAtWorldX - worldX + GAME_W);
      if (Math.random() < STAR_CHANCE) spawnStar(nextObstacleAtWorldX - worldX + GAME_W + rand(60, 140));
      nextObstacleAtWorldX += rand(OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP);
    }

    distanceScore = Math.floor(worldX / 10);
    score = distanceScore + starsCollected * 10;

    // Checkpoint
    if (worldX - checkpointWorldX >= CHECKPOINT_EVERY) {
      checkpointWorldX = worldX;
      lastCheckpointScore = score;
      lastCheckpointDistance = distanceScore;
      flashHUD();
    }

    // Star toplama
    for (const s of stars) {
      if (s.collected) continue;
      const dx = s.sx - player.x;
      const dy = s.sy - player.y;
      if (dx * dx + dy * dy < (s.r + player.r) * (s.r + player.r)) {
        s.collected = true;
        starsCollected++;
        score = distanceScore + starsCollected * 10;
        try { AudioManager.play('success'); } catch (e) {}
      }
    }

    // Çarpışma
    if (nowMs() > invulnUntil) {
      for (const o of obstacles) {
        if (collidesWith(o)) { triggerCollision(o.type); return; }
      }
    }

    // Partiküller
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt; p.vy += 120 * dt;
    }
    particles = particles.filter(p => p.life > 0);

    renderHUD();
  }

  function collidesWith(o) {
    const cx = clamp(player.x, o.sx, o.sx + o.w);
    const cy = clamp(player.y, o.sy, o.sy + o.h);
    const dx = player.x - cx;
    const dy = player.y - cy;
    return dx * dx + dy * dy < player.r * player.r;
  }

  function spawnObstacle(sx) {
    const types = ['asteroid', 'wave', 'blackhole'];
    const type = types[randInt(0, 2)];
    let w, h, sy;
    if (type === 'asteroid') {
      w = randInt(44, 72); h = w;
      sy = rand(60, GAME_H - 60 - h);
    } else if (type === 'wave') {
      w = 36; h = randInt(90, 180);
      sy = Math.random() < 0.5 ? 0 : GAME_H - h;
    } else {
      w = 58; h = 58;
      sy = rand(60, GAME_H - 60 - h);
    }
    obstacles.push({ type, sx, sy, w, h, phase: Math.random() * Math.PI * 2 });
  }

  function spawnStar(sx) {
    stars.push({ sx, sy: rand(50, GAME_H - 50), r: 11, collected: false, bob: Math.random() * Math.PI * 2 });
  }

  function spawnThrusterBurst() {
    for (let i = 0; i < 10; i++) {
      particles.push({
        x: player.x - 16, y: player.y,
        vx: -rand(40, 160), vy: rand(-80, 80),
        life: 0.4 + Math.random() * 0.3,
        color: 'hsl(' + randInt(20, 50) + ', 100%, ' + randInt(55, 75) + '%)',
        r: 2 + Math.random() * 2
      });
    }
  }

  function spawnExplosion(x, y) {
    for (let i = 0; i < 26; i++) {
      particles.push({
        x, y,
        vx: rand(-260, 260), vy: rand(-260, 260),
        life: 0.6 + Math.random() * 0.4,
        color: 'hsl(' + randInt(0, 40) + ', 100%, ' + randInt(55, 75) + '%)',
        r: 2 + Math.random() * 3
      });
    }
  }

  // ---------- Çarpışma akışı ----------
  function triggerCollision(type) {
    if (state !== 'playing') return;
    state = 'question';
    spawnExplosion(player.x, player.y);
    try { AudioManager.play('error'); } catch (e) {}
    showQuestion();
  }

  function pickQuestion() {
    const pool = (window.SPACE_WAVES_QUESTIONS || []);
    if (!pool.length) return { q: '1 + 1 = ?', options: ['2', '3', '4', '1'], correctIdx: 0 };
    let candidates = [];
    for (let i = 0; i < pool.length; i++) if (!usedQuestions.has(i)) candidates.push(i);
    if (!candidates.length) { usedQuestions.clear(); candidates = pool.map((_, i) => i); }
    const idx = candidates[randInt(0, candidates.length - 1)];
    usedQuestions.add(idx);
    return Object.assign({ __idx: idx }, pool[idx]);
  }

  function showQuestion() {
    currentQuestion = pickQuestion();
    const modal = document.createElement('div');
    modal.className = 'sw-modal sw-question-modal';
    modal.innerHTML =
      '<div class="sw-modal-card">' +
        '<div class="sw-question-header">' +
          '<div class="sw-question-title">⚡ Çarpıştın! Doğru cevapla, canını koru!</div>' +
          '<div class="sw-timer-ring">' +
            '<svg viewBox="0 0 64 64"><circle class="sw-timer-bg" cx="32" cy="32" r="28"/><circle class="sw-timer-fg" cx="32" cy="32" r="28"/></svg>' +
            '<span class="sw-timer-text" id="sw-timer-text">' + QUESTION_TIME + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="sw-question-text">' + escapeHTML(currentQuestion.q) + '</div>' +
        '<div class="sw-options" id="sw-options"></div>' +
      '</div>';
    uiLayer.appendChild(modal);

    const optsEl = modal.querySelector('#sw-options');
    currentQuestion.options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'sw-option';
      b.innerHTML = '<span class="sw-opt-letter">' + String.fromCharCode(65 + i) + '</span><span class="sw-opt-text">' + escapeHTML(opt) + '</span>';
      b.addEventListener('click', () => onAnswer(i, modal));
      optsEl.appendChild(b);
    });

    const ringFg = modal.querySelector('.sw-timer-fg');
    const circum = 2 * Math.PI * 28;
    if (ringFg) { ringFg.style.strokeDasharray = circum; ringFg.style.strokeDashoffset = 0; }

    const startTs = nowMs();
    questionTimerId = setInterval(() => {
      const elapsed = (nowMs() - startTs) / 1000;
      const left = Math.max(0, QUESTION_TIME - elapsed);
      const pct = left / QUESTION_TIME;
      const tt = modal.querySelector('#sw-timer-text');
      if (tt) tt.textContent = Math.ceil(left);
      if (ringFg) ringFg.style.strokeDashoffset = circum * (1 - pct);
      if (left <= 0) {
        clearInterval(questionTimerId);
        questionTimerId = null;
        onAnswer(-1, modal);
      }
    }, 100);
  }

  function onAnswer(selectedIdx, modal) {
    if (questionTimerId) { clearInterval(questionTimerId); questionTimerId = null; }
    const correct = currentQuestion.correctIdx;
    const isCorrect = selectedIdx === correct;
    const buttons = modal.querySelectorAll('.sw-option');
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === correct) b.classList.add('sw-correct');
      if (selectedIdx !== -1 && i === selectedIdx && i !== correct) b.classList.add('sw-wrong');
    });
    const banner = document.createElement('div');
    banner.className = 'sw-answer-banner ' + (isCorrect ? 'sw-banner-ok' : 'sw-banner-bad');
    banner.textContent = isCorrect
      ? '✅ Doğru! Canını korudun.'
      : (selectedIdx === -1 ? '⏰ Süre doldu! Bir can kaybettin.' : '❌ Yanlış! Bir can kaybettin.');
    modal.querySelector('.sw-modal-card').appendChild(banner);

    try { AudioManager.play(isCorrect ? 'success' : 'error'); } catch (e) {}

    setTimeout(() => {
      modal.remove();
      if (!isCorrect) lives--;
      if (lives <= 0) gameOver();
      else respawn();
    }, 900);
  }

  function respawn() {
    worldX = checkpointWorldX;
    score = lastCheckpointScore;
    distanceScore = lastCheckpointDistance;
    respawnTimer = 0;
    currentSpeed = 0;
    inputDir = 1;
    player.y = GAME_H / 2;
    player.vy = 0;
    obstacles = obstacles.filter(o => o.sx > PLAYER_X + RESPAWN_CLEAR_AHEAD);
    stars = stars.filter(s => s.sx > PLAYER_X + 80);
    nextObstacleAtWorldX = Math.max(nextObstacleAtWorldX, worldX + GAME_W + RESPAWN_CLEAR_AHEAD);
    invulnUntil = nowMs() + INVULN_MS;
    // Geri sayım ile başlat — oyuncu hazırlansın
    state = 'countdown';
    countdownEndAt = nowMs() + 3000;
    countdownSec = 3;
    lastTime = nowMs(); accum = 0;
  }

  // ---------- Game Over + Leaderboard ----------
  function gameOver() {
    state = 'gameover';
    finalScore = score;
    try { AudioManager.play('complete'); } catch (e) {}
    showGameOverModal();
  }

  function showGameOverModal() {
    const modal = document.createElement('div');
    modal.className = 'sw-modal sw-gameover-modal';
    modal.innerHTML =
      '<div class="sw-modal-card sw-gameover-card">' +
        '<div class="sw-gameover-title">🚀 Oyun Bitti</div>' +
        '<div class="sw-gameover-score">' +
          '<div class="sw-go-row"><span>Skor</span><b>' + finalScore + '</b></div>' +
          '<div class="sw-go-row"><span>Mesafe</span><b>' + distanceScore + '</b></div>' +
          '<div class="sw-go-row"><span>Yıldız</span><b>' + starsCollected + '</b></div>' +
        '</div>' +
        '<div class="sw-gameover-buttons">' +
          '<button class="sw-btn sw-btn-primary" id="sw-btn-restart">🔁 Tekrar Oyna</button>' +
          '<button class="sw-btn sw-btn-secondary" id="sw-btn-home">🏠 Ana Sayfa</button>' +
          (finalScore > 0 ? '<button class="sw-btn sw-btn-accent" id="sw-btn-save">⭐ Skoru Kaydet</button>' : '') +
        '</div>' +
        '<div class="sw-save-area" id="sw-save-area"></div>' +
        '<div class="sw-leaderboard-area" id="sw-leaderboard-area"></div>' +
      '</div>';
    uiLayer.appendChild(modal);

    modal.querySelector('#sw-btn-restart').addEventListener('click', () => {
      modal.remove();
      resetRun();
      lastTime = nowMs(); accum = 0;
      invulnUntil = nowMs() + INVULN_MS;
    });
    modal.querySelector('#sw-btn-home').addEventListener('click', () => {
      const h = document.getElementById('btn-home');
      if (h) h.click();
    });
    const saveBtn = modal.querySelector('#sw-btn-save');
    if (saveBtn) saveBtn.addEventListener('click', () => showSaveForm(modal));
  }

  function showSaveForm(modal) {
    if (savedThisRound) return;
    const area = modal.querySelector('#sw-save-area');
    area.innerHTML =
      '<div class="sw-save-form">' +
        '<input type="text" id="sw-name-input" maxlength="16" placeholder="Adın (en fazla 16 harf)" />' +
        '<button class="sw-btn sw-btn-primary" id="sw-btn-commit-save">Kaydet</button>' +
      '</div>';
    const input = area.querySelector('#sw-name-input');
    input.focus();
    area.querySelector('#sw-btn-commit-save').addEventListener('click', () => {
      const raw = (input.value || '').trim();
      if (!raw) { input.focus(); input.classList.add('sw-shake'); setTimeout(() => input.classList.remove('sw-shake'), 400); return; }
      saveScoreAndShowLeaderboard(raw.slice(0, 16), finalScore, modal);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') area.querySelector('#sw-btn-commit-save').click();
    });
  }

  async function saveScoreAndShowLeaderboard(name, scoreVal, modal) {
    if (!db) {
      modal.querySelector('#sw-save-area').innerHTML = '<div class="sw-error">⚠️ Sunucuya bağlanılamadı.</div>';
      return;
    }
    if (savedThisRound) return;
    savedThisRound = true;
    const saveBtn = modal.querySelector('#sw-btn-save');
    if (saveBtn) saveBtn.disabled = true;

    const ref = db.ref('leaderboards/space-waves');
    try {
      const entry = { name, score: scoreVal, timestamp: firebase.database.ServerValue.TIMESTAMP };
      const newRef = await ref.push(entry);
      modal.querySelector('#sw-save-area').innerHTML = '<div class="sw-save-ok">✅ Kaydedildi!</div>';
      await renderLeaderboard(modal, newRef.key, scoreVal);
    } catch (err) {
      modal.querySelector('#sw-save-area').innerHTML = '<div class="sw-error">⚠️ Kaydedilemedi. ' + escapeHTML(err.message || '') + '</div>';
    }
  }

  async function renderLeaderboard(modal, myKey, myScore) {
    const area = modal.querySelector('#sw-leaderboard-area');
    area.innerHTML = '<div class="sw-lb-loading">Sıralama yükleniyor...</div>';
    try {
      const snap = await db.ref('leaderboards/space-waves')
        .orderByChild('score').limitToLast(50).once('value');
      const rows = [];
      snap.forEach(child => {
        const v = child.val();
        rows.push({ key: child.key, name: v.name || 'Anonim', score: v.score || 0, timestamp: v.timestamp || 0 });
      });
      rows.sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);

      const myIdx = rows.findIndex(r => r.key === myKey);
      if (myIdx >= 0 && myIdx < 50) {
        renderPaginatedLB(area, rows, myKey, myIdx);
      } else {
        // 50+ → rank
        let rank = 51;
        try {
          const afterSnap = await db.ref('leaderboards/space-waves')
            .orderByChild('score').startAfter(myScore).once('value');
          let above = 0;
          afterSnap.forEach(() => { above++; });
          rank = above + 1;
        } catch (e) {}
        area.innerHTML =
          '<div class="sw-lb-out">' +
            '<div class="sw-lb-title">🌍 Global Sıralaman</div>' +
            '<div class="sw-lb-rank-big"><span>#' + rank + '</span></div>' +
            '<div class="sw-lb-msg">İlk 50\'ye girmek için daha yüksek skor yap!</div>' +
          '</div>';
      }
    } catch (err) {
      area.innerHTML = '<div class="sw-error">⚠️ Sıralama yüklenemedi.</div>';
    }
  }

  function renderPaginatedLB(area, rows, myKey, myIdx) {
    const PER = 10;
    const pages = Math.ceil(rows.length / PER);
    let currentPage = Math.floor(myIdx / PER);

    function render() {
      const start = currentPage * PER;
      const slice = rows.slice(start, start + PER);
      let html = '<div class="sw-lb-title">🏆 İlk 50 — Sayfa ' + (currentPage + 1) + ' / ' + pages + '</div>';
      html += '<div class="sw-lb-table">';
      html += '<div class="sw-lb-head"><span class="sw-lb-rank">#</span><span class="sw-lb-name">İsim</span><span class="sw-lb-score">Skor</span></div>';
      slice.forEach((r, i) => {
        const rank = start + i + 1;
        const me = r.key === myKey ? ' sw-lb-me' : '';
        html += '<div class="sw-lb-row' + me + '"><span class="sw-lb-rank">' + rank + '</span><span class="sw-lb-name">' + escapeHTML(r.name) + '</span><span class="sw-lb-score">' + r.score + '</span></div>';
      });
      html += '</div>';
      html += '<div class="sw-lb-nav">' +
        '<button class="sw-btn sw-btn-ghost" id="sw-lb-prev"' + (currentPage === 0 ? ' disabled' : '') + '>◀ Önceki</button>' +
        '<span class="sw-lb-pageinfo">' + (start + 1) + '-' + Math.min(start + PER, rows.length) + '</span>' +
        '<button class="sw-btn sw-btn-ghost" id="sw-lb-next"' + (currentPage >= pages - 1 ? ' disabled' : '') + '>Sonraki ▶</button>' +
        '</div>';
      area.innerHTML = html;
      const prev = area.querySelector('#sw-lb-prev');
      const next = area.querySelector('#sw-lb-next');
      if (prev) prev.addEventListener('click', () => { if (currentPage > 0) { currentPage--; render(); } });
      if (next) next.addEventListener('click', () => { if (currentPage < pages - 1) { currentPage++; render(); } });
    }
    render();
  }

  // ---------- HUD ----------
  function renderHUD() {
    if (!livesEl) return;
    let lh = '';
    for (let i = 0; i < MAX_LIVES; i++) {
      lh += '<span class="sw-heart ' + (i < lives ? 'on' : 'off') + '">♥</span>';
    }
    livesEl.innerHTML = lh;
    if (scoreEl) scoreEl.textContent = score;
    if (distanceEl) distanceEl.textContent = distanceScore;
  }

  function flashHUD() {
    if (!hudEl) return;
    hudEl.classList.add('sw-hud-flash');
    setTimeout(() => hudEl && hudEl.classList.remove('sw-hud-flash'), 350);
  }

  // ---------- Draw ----------
  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, GAME_H);
    g.addColorStop(0, '#0b0324');
    g.addColorStop(0.5, '#1a0b3f');
    g.addColorStop(1, '#2b0f4f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    drawNebula();
    drawStarField(parallax.farStars, '#6a5dff');
    drawStarField(parallax.midStars, '#a9a3ff');
    drawStarField(parallax.nearStars, '#ffffff');

    for (const s of stars) {
      if (s.collected) continue;
      ctx.save();
      ctx.translate(s.sx, s.sy);
      s.bob += 0.06;
      ctx.rotate(Math.sin(s.bob) * 0.2);
      drawStarShape(0, 0, s.r, '#ffd54a', '#ffa000');
      ctx.restore();
    }

    for (const o of obstacles) drawObstacle(o);

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawPlayer();

    if (nowMs() < invulnUntil && Math.floor(nowMs() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Countdown overlay
    if (state === 'countdown') drawCountdownOverlay();
  }

  function drawCountdownOverlay() {
    // Karartma
    ctx.fillStyle = 'rgba(5, 2, 20, 0.45)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Ok — karakterin gideceği yön
    const cx = player.x;
    const cy = player.y;
    const arrowOffset = inputDir === -1 ? -46 : 46;
    const arrowY = cy + arrowOffset;
    const bob = Math.sin(nowMs() / 220) * 4;

    ctx.save();
    ctx.translate(cx, arrowY + bob);
    ctx.globalAlpha = 0.95;
    // Glow
    ctx.shadowColor = '#ffd54a';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    if (inputDir === -1) {
      // Yukarı ok
      ctx.moveTo(0, -14);
      ctx.lineTo(14, 8);
      ctx.lineTo(5, 8);
      ctx.lineTo(5, 18);
      ctx.lineTo(-5, 18);
      ctx.lineTo(-5, 8);
      ctx.lineTo(-14, 8);
    } else {
      // Aşağı ok
      ctx.moveTo(0, 14);
      ctx.lineTo(14, -8);
      ctx.lineTo(5, -8);
      ctx.lineTo(5, -18);
      ctx.lineTo(-5, -18);
      ctx.lineTo(-5, -8);
      ctx.lineTo(-14, -8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Sayı / GO!
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const remainMs = countdownEndAt - nowMs();
    const secF = remainMs / 1000;
    const pulse = 1 - (secF - Math.floor(secF)); // 0 → 1 her saniye
    const scale = 1 + pulse * 0.5;
    const label = countdownSec > 0 ? String(countdownSec) : 'GO!';

    ctx.translate(GAME_W / 2, GAME_H / 2 - 90);
    ctx.scale(scale, scale);
    ctx.font = 'bold 92px "Comic Sans MS", system-ui, sans-serif';
    ctx.shadowColor = '#7b5bff';
    ctx.shadowBlur = 22;
    ctx.fillStyle = countdownSec > 0 ? '#ffd54a' : '#2ecc71';
    ctx.fillText(label, 0, 0);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeText(label, 0, 0);
    ctx.restore();

    // İpucu
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Comic Sans MS", system-ui, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText('Boşluk / Tık ile yön seç', GAME_W / 2, GAME_H - 40);
    ctx.restore();
  }

  function drawNebula() {
    const off = parallax.nebula.offset;
    const grd = ctx.createRadialGradient(GAME_W * 0.7 - off * 0.3, GAME_H * 0.4, 10, GAME_W * 0.7 - off * 0.3, GAME_H * 0.4, 320);
    grd.addColorStop(0, 'rgba(180, 90, 255, 0.35)');
    grd.addColorStop(1, 'rgba(180, 90, 255, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    const grd2 = ctx.createRadialGradient(GAME_W * 0.2 - off * 0.2, GAME_H * 0.7, 10, GAME_W * 0.2 - off * 0.2, GAME_H * 0.7, 260);
    grd2.addColorStop(0, 'rgba(40, 160, 255, 0.28)');
    grd2.addColorStop(1, 'rgba(40, 160, 255, 0)');
    ctx.fillStyle = grd2;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  }

  function drawStarField(field, color) {
    ctx.fillStyle = color;
    for (const s of field) {
      ctx.globalAlpha = 0.5 + Math.sin(s.twinkle) * 0.4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawStarShape(cx, cy, r, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.5;
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
  }

  function drawObstacle(o) {
    if (o.type === 'asteroid') {
      ctx.save();
      ctx.translate(o.sx + o.w / 2, o.sy + o.h / 2);
      o.phase += 0.01;
      ctx.rotate(o.phase);
      const r = o.w / 2;
      const grd = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
      grd.addColorStop(0, '#8e8e8e'); grd.addColorStop(1, '#444');
      ctx.fillStyle = grd;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const rr = r + Math.sin(i * 2.1 + o.phase) * 4;
        const x = Math.cos(ang) * rr; const y = Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.25, r * 0.2, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (o.type === 'wave') {
      const grad = ctx.createLinearGradient(o.sx, 0, o.sx + o.w, 0);
      grad.addColorStop(0, 'rgba(0, 220, 255, 0)');
      grad.addColorStop(0.5, 'rgba(0, 220, 255, 0.9)');
      grad.addColorStop(1, 'rgba(0, 220, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(o.sx, o.sy, o.w, o.h);
      ctx.strokeStyle = '#e6fbff'; ctx.lineWidth = 2;
      ctx.beginPath();
      o.phase += 0.12;
      for (let y = o.sy; y < o.sy + o.h; y += 4) {
        const wx = o.sx + o.w / 2 + Math.sin((y + o.phase * 40) / 16) * 6;
        if (y === o.sy) ctx.moveTo(wx, y); else ctx.lineTo(wx, y);
      }
      ctx.stroke();
    } else if (o.type === 'blackhole') {
      ctx.save();
      ctx.translate(o.sx + o.w / 2, o.sy + o.h / 2);
      o.phase += 0.04;
      ctx.rotate(o.phase);
      const r = o.w / 2;
      const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
      grd.addColorStop(0, '#000'); grd.addColorStop(0.55, '#3b1060'); grd.addColorStop(1, 'rgba(100, 20, 180, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b76dff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4 + i * 4, o.phase + i, o.phase + i + 1.4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawPlayer() {
    const x = player.x, y = player.y;
    const thrust = currentSpeed / MAX_SPEED;

    // Thruster alevi
    ctx.save();
    const flameX = x - 18;
    const fg = ctx.createLinearGradient(flameX, y, flameX - 18 - thrust * 14, y);
    fg.addColorStop(0, '#ffd84a');
    fg.addColorStop(1, 'rgba(255, 120, 0, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(flameX, y - 6);
    ctx.lineTo(flameX - 14 - thrust * 12, y);
    ctx.lineTo(flameX, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(inputDir === -1 ? -0.2 : 0.15);

    const bodyGrad = ctx.createLinearGradient(-20, -12, 20, 12);
    bodyGrad.addColorStop(0, '#9ae8ff');
    bodyGrad.addColorStop(1, '#2a7cff');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(18, 0);
    ctx.lineTo(-18, 10);
    ctx.quadraticCurveTo(-22, 0, -18, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f1a3a'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.fillStyle = '#15223a';
    ctx.beginPath(); ctx.ellipse(4, 0, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6ff0ff';
    ctx.beginPath(); ctx.ellipse(4, -1, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#4a9cff';
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-12, -14); ctx.lineTo(-2, -8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-12, 14); ctx.lineTo(-2, 8); ctx.closePath(); ctx.fill();

    ctx.restore();
  }

  return { id, levels, init, destroy };
})();
