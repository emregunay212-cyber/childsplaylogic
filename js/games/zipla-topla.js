/* ============================================
   OYUN: Zıpla Topla - 2D Platform Macerası
   Canvas tabanlı side-scroller
   ============================================ */

const ZiplaTopla = (() => {
  const id = 'zipla-topla';

  // Seviye haritaları
  const LEVELS = [
    { // Seviye 1: Düz zemin, 5 para
      platforms: [{x:0,y:280,w:800,h:20}],
      coins: [{x:150,y:250},{x:250,y:250},{x:350,y:250},{x:450,y:250},{x:550,y:250}],
      spikes: [],
      door: {x:700,y:240},
      start: {x:40,y:240},
      movingPlatforms: [],
    },
    { // Seviye 2: Platformlar + 8 para + 1 diken
      platforms: [
        {x:0,y:280,w:250,h:20},{x:300,y:240,w:120,h:16},
        {x:470,y:200,w:120,h:16},{x:620,y:260,w:180,h:20},
      ],
      coins: [{x:80,y:250},{x:160,y:250},{x:330,y:210},{x:380,y:210},{x:500,y:170},{x:540,y:170},{x:660,y:230},{x:740,y:230}],
      spikes: [{x:260,y:268,w:30}],
      door: {x:740,y:220}, start: {x:40,y:240}, movingPlatforms: [],
    },
    { // Seviye 3: Hareketli platform + 10 para + 2 diken
      platforms: [{x:0,y:280,w:180,h:20},{x:350,y:220,w:100,h:16},{x:600,y:280,w:200,h:20}],
      coins: [{x:60,y:250},{x:120,y:250},{x:370,y:190},{x:420,y:190},{x:280,y:160},{x:500,y:140},{x:640,y:250},{x:700,y:250},{x:660,y:210},{x:730,y:210}],
      spikes: [{x:190,y:268,w:30},{x:560,y:268,w:30}],
      door: {x:740,y:240}, start: {x:40,y:240},
      movingPlatforms: [{x:200,y:240,w:80,h:14,minX:200,maxX:320,speed:1},{x:480,y:180,w:80,h:14,minX:460,maxX:580,speed:1.2}],
    },
    { // Seviye 4: Karmaşık + 12 para + 3 diken
      platforms: [
        {x:0,y:280,w:150,h:20},{x:200,y:250,w:80,h:14},{x:340,y:210,w:80,h:14},
        {x:500,y:250,w:100,h:16},{x:650,y:180,w:80,h:14},{x:540,y:130,w:100,h:14},
        {x:350,y:130,w:80,h:14},{x:700,y:280,w:100,h:20},
      ],
      coins: [{x:60,y:250},{x:110,y:250},{x:220,y:220},{x:260,y:220},{x:360,y:180},{x:400,y:180},{x:530,y:220},{x:570,y:220},{x:670,y:150},{x:700,y:150},{x:560,y:100},{x:380,y:100}],
      spikes: [{x:155,y:268,w:30},{x:440,y:268,w:30},{x:610,y:268,w:30}],
      door: {x:740,y:240}, start: {x:40,y:240},
      movingPlatforms: [{x:120,y:200,w:70,h:14,minY:160,maxY:250,speed:0.8,vertical:true}],
    },
    { // Seviye 5: Boss parkur
      platforms: [
        {x:0,y:280,w:120,h:20},{x:250,y:230,w:70,h:14},{x:400,y:190,w:70,h:14},
        {x:300,y:130,w:80,h:14},{x:500,y:130,w:70,h:14},{x:650,y:200,w:70,h:14},{x:700,y:280,w:100,h:20},
      ],
      coins: [{x:40,y:250},{x:80,y:250},{x:260,y:200},{x:300,y:200},{x:410,y:160},{x:440,y:160},{x:320,y:100},{x:360,y:100},{x:520,y:100},{x:550,y:100},{x:670,y:170},{x:700,y:170},{x:730,y:250},{x:760,y:250},{x:180,y:220}],
      spikes: [{x:130,y:268,w:30},{x:340,y:268,w:30},{x:470,y:268,w:30},{x:600,y:268,w:30}],
      door: {x:740,y:240}, start: {x:40,y:240},
      movingPlatforms: [{x:140,y:250,w:70,h:14,minX:140,maxX:230,speed:1.5},{x:550,y:170,w:70,h:14,minY:130,maxY:220,speed:1,vertical:true}],
    },
  ];

  const levels = LEVELS.map(() => ({}));
  const PLAYER_W = 20, PLAYER_H = 28, COIN_R = 8;
  const GRAVITY = 0.5, JUMP_FORCE = -9, MOVE_SPEED = 3.5;
  const GAME_W = 800, GAME_H = 300;

  let container, callbacks, canvas, ctx;
  let player, coinList, spikeList, platformList, movingPlatforms, door;
  let collectedCoins, totalCoins, animFrameId, gameOver, levelWon;
  let keys, currentLevelIdx;

  function init(gameArea, level, cbs) {
    container = gameArea;
    callbacks = cbs;
    currentLevelIdx = level - 1;
    GameEngine.setTotal(LEVELS[currentLevelIdx].coins.length);
    startLevel();
  }

  function startLevel() {
    const lvl = LEVELS[currentLevelIdx];
    gameOver = false; levelWon = false;
    collectedCoins = 0; totalCoins = lvl.coins.length;
    keys = {};
    player = { x: lvl.start.x, y: lvl.start.y, vx: 0, vy: 0, onGround: false, w: PLAYER_W, h: PLAYER_H, dir: 1 };
    coinList = lvl.coins.map(c => ({ x: c.x, y: c.y, collected: false, bob: Math.random() * Math.PI * 2 }));
    spikeList = lvl.spikes.map(s => ({ ...s }));
    platformList = lvl.platforms.map(p => ({ ...p }));
    movingPlatforms = lvl.movingPlatforms.map(p => ({ ...p, phase: 0 }));
    door = { ...lvl.door };
    buildDOM();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    gameLoop();
  }

  function buildDOM() {
    while (container.firstChild) container.removeChild(container.firstChild);
    const wrap = document.createElement('div');
    wrap.className = 'zt-wrap';

    canvas = document.createElement('canvas');
    canvas.className = 'zt-canvas';
    canvas.width = GAME_W; canvas.height = GAME_H;
    ctx = canvas.getContext('2d');
    wrap.appendChild(canvas);

    // HUD
    const hud = document.createElement('div');
    hud.className = 'zt-hud'; hud.id = 'zt-hud';
    hud.textContent = 'Para: 0/' + totalCoins;
    wrap.appendChild(hud);

    // Mobil kontroller
    const controls = document.createElement('div');
    controls.className = 'zt-controls';
    const makeBtn = (cls, txt) => { const b = document.createElement('button'); b.className = 'zt-btn ' + cls; b.textContent = txt; return b; };
    const btnL = makeBtn('zt-btn-left', '\u25C0');
    const btnR = makeBtn('zt-btn-right', '\u25B6');
    const btnJ = makeBtn('zt-btn-jump', '\u25B2');

    const bind = (btn, key) => {
      btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; });
      btn.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; });
      btn.addEventListener('mousedown', () => { keys[key] = true; });
      btn.addEventListener('mouseup', () => { keys[key] = false; });
      btn.addEventListener('mouseleave', () => { keys[key] = false; });
    };
    bind(btnL, 'ArrowLeft'); bind(btnR, 'ArrowRight'); bind(btnJ, ' ');
    controls.appendChild(btnL); controls.appendChild(btnJ); controls.appendChild(btnR);
    wrap.appendChild(controls);
    container.appendChild(wrap);
  }

  function updateHUD() {
    const h = document.getElementById('zt-hud');
    if (h) h.textContent = 'Para: ' + collectedCoins + '/' + totalCoins;
  }

  function onKeyDown(e) {
    if (['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)) { e.preventDefault(); keys[e.key] = true; }
  }
  function onKeyUp(e) { keys[e.key] = false; }

  function gameLoop() {
    if (gameOver || levelWon) return;
    update(); draw();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  function update() {
    if (keys['ArrowLeft']) { player.vx = -MOVE_SPEED; player.dir = -1; }
    else if (keys['ArrowRight']) { player.vx = MOVE_SPEED; player.dir = 1; }
    else player.vx = 0;

    if ((keys[' '] || keys['ArrowUp']) && player.onGround) {
      player.vy = JUMP_FORCE; player.onGround = false;
      AudioManager.play('pop');
    }

    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    // Platform çarpışma
    player.onGround = false;
    const allPlats = [...platformList, ...movingPlatforms];
    for (const p of allPlats) {
      if (player.x + player.w > p.x && player.x < p.x + p.w &&
          player.y + player.h > p.y && player.y + player.h < p.y + p.h + 10 && player.vy >= 0) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }

    // Sınırlar
    if (player.x < 0) player.x = 0;
    if (player.x > GAME_W - player.w) player.x = GAME_W - player.w;
    if (player.y > GAME_H + 50) { callbacks.onWrong(); AudioManager.play('error'); resetPlayer(); }

    // Hareketli platformlar
    for (const mp of movingPlatforms) {
      mp.phase += mp.speed * 0.02;
      if (mp.vertical) {
        mp.y = mp.minY + (Math.sin(mp.phase) * 0.5 + 0.5) * (mp.maxY - mp.minY);
      } else {
        mp.x = mp.minX + (Math.sin(mp.phase) * 0.5 + 0.5) * (mp.maxX - mp.minX);
      }
    }

    // Para toplama
    for (const coin of coinList) {
      if (coin.collected) continue;
      coin.bob += 0.05;
      const cy = coin.y + Math.sin(coin.bob) * 3;
      const dx = (player.x + player.w / 2) - coin.x;
      const dy = (player.y + player.h / 2) - cy;
      if (dx * dx + dy * dy < (COIN_R + 12) * (COIN_R + 12)) {
        coin.collected = true; collectedCoins++;
        callbacks.onCorrect(); AudioManager.play('success'); updateHUD();
      }
    }

    // Diken çarpışma
    for (const s of spikeList) {
      if (player.x + player.w > s.x && player.x < s.x + s.w &&
          player.y + player.h > s.y && player.y + player.h < s.y + 16) {
        callbacks.onWrong(); AudioManager.play('error'); resetPlayer(); return;
      }
    }

    // Kapı
    const dx = (player.x + player.w / 2) - (door.x + 15);
    const dy = (player.y + player.h / 2) - (door.y + 20);
    if (dx * dx + dy * dy < 625) {
      levelWon = true; AudioManager.play('complete');
      const pct = totalCoins > 0 ? collectedCoins / totalCoins : 1;
      const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
      Particles.celebrate();
      setTimeout(() => callbacks.onComplete(stars), 600);
    }
  }

  function resetPlayer() {
    const lvl = LEVELS[currentLevelIdx];
    player.x = lvl.start.x; player.y = lvl.start.y;
    player.vx = 0; player.vy = 0; player.onGround = false;
  }

  function draw() {
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
    grad.addColorStop(0, '#87CEEB'); grad.addColorStop(1, '#E0F0FF');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Bulutlar (dekoratif)
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(120, 40, 20, 0, Math.PI*2); ctx.arc(140, 35, 25, 0, Math.PI*2); ctx.arc(160, 40, 20, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(500, 55, 18, 0, Math.PI*2); ctx.arc(520, 48, 22, 0, Math.PI*2); ctx.arc(540, 55, 18, 0, Math.PI*2); ctx.fill();

    // Platformlar
    for (const p of platformList) drawPlatform(p, false);
    for (const mp of movingPlatforms) drawPlatform(mp, true);

    // Dikenler
    for (const s of spikeList) {
      ctx.fillStyle = '#E74C3C';
      const cnt = Math.floor(s.w / 10);
      for (let i = 0; i < cnt; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x + i * 10, s.y + 12);
        ctx.lineTo(s.x + i * 10 + 5, s.y);
        ctx.lineTo(s.x + i * 10 + 10, s.y + 12);
        ctx.fill();
      }
    }

    // Paralar
    for (const coin of coinList) {
      if (coin.collected) continue;
      const cy = coin.y + Math.sin(coin.bob) * 3;
      ctx.beginPath(); ctx.arc(coin.x, cy, COIN_R, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700'; ctx.fill();
      ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(coin.x - 2, cy - 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
    }

    // Kapı
    ctx.fillStyle = '#8B4513'; ctx.fillRect(door.x, door.y, 30, 40);
    ctx.fillStyle = '#D2691E'; ctx.fillRect(door.x + 3, door.y + 3, 24, 34);
    ctx.beginPath(); ctx.arc(door.x + 22, door.y + 22, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700'; ctx.fill();

    // Oyuncu
    drawPlayer();
  }

  function drawPlatform(p, moving) {
    ctx.fillStyle = moving ? '#9B59B6' : '#8B4513';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = moving ? '#BB77DD' : '#2ECC71';
    ctx.fillRect(p.x, p.y, p.w, 4);
  }

  function drawPlayer() {
    const p = player;
    ctx.save();
    if (p.dir === -1) { ctx.translate(p.x + p.w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(p.x + p.w / 2), 0); }
    // Gövde
    ctx.fillStyle = '#3498DB'; ctx.fillRect(p.x + 4, p.y + 10, 12, 14);
    // Kafa
    ctx.fillStyle = '#FECA57'; ctx.beginPath(); ctx.arc(p.x + p.w / 2, p.y + 6, 8, 0, Math.PI * 2); ctx.fill();
    // Göz
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(p.x + 12, p.y + 5, 2, 0, Math.PI * 2); ctx.fill();
    // Şapka
    ctx.fillStyle = '#E74C3C'; ctx.fillRect(p.x + 2, p.y - 2, 16, 5); ctx.fillRect(p.x + 6, p.y - 6, 10, 5);
    // Bacaklar
    ctx.fillStyle = '#2C3E50'; ctx.fillRect(p.x + 4, p.y + 24, 5, 4); ctx.fillRect(p.x + 11, p.y + 24, 5, 4);
    ctx.restore();
  }

  function destroy() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    keys = {};
    if (container) while (container.firstChild) container.removeChild(container.firstChild);
  }

  return { id, levels, init, destroy };
})();
