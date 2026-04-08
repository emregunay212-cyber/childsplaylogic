/* ============================================
   OYUN: Ateş & Buz - Online 2 Kişilik Platform
   Canvas tabanlı işbirlikçi bulmaca platformer
   Host = Ateş (kırmızı), Guest = Buz (mavi)
   ============================================ */

const AtesBuz = (() => {
  const id = 'ates-buz';
  const isMultiplayer = true;

  // Tile tipleri
  const T = {
    EMPTY: 0, WALL: 1, LAVA: 2, WATER: 3, POISON: 4,
    FIRE_DOOR: 5, ICE_DOOR: 6, BUTTON_F: 7, BUTTON_I: 8,
    GATE_F: 9, GATE_I: 10, COIN: 11,
  };

  // Seviye haritaları (20x12 tile grid, her tile 40px)
  // Max zıplama: ~3 tile yüksek, ~2.5 tile yatay
  // Platformlar arası max 2 tile dikey, 2 tile yatay boşluk
  const MAPS = [
    { // Seviye 1: Tutorial - düz yol + basit platformlar
      grid: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,2,2,0,0,0,0,0,3,3,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      fireStart: {x:1,y:10}, iceStart: {x:3,y:10},
    },
    { // Seviye 2: Zigzag platformlar + coin'ler
      grid: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1],
        [1,0,0,0,0,0,2,2,0,0,0,0,3,3,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      fireStart: {x:1,y:10}, iceStart: {x:18,y:10},
    },
    { // Seviye 3: Düğme mekaniği tanıtım
      grid: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,5,0,6,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,1,0,9,0,10,0,1,1,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,7,0,0,0,0,0,0,0,0,0,0,8,0,0,0,1],
        [1,0,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,2,0,0,0,0,3,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      fireStart: {x:1,y:10}, iceStart: {x:18,y:10},
    },
    { // Seviye 4: Karmaşık düğme + zehir
      grid: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,5,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,1,1,0,0,9,0,0,0,1,1,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1],
        [1,0,0,8,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,1],
        [1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
        [1,0,0,0,0,0,2,0,0,4,4,0,0,3,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      fireStart: {x:1,y:10}, iceStart: {x:14,y:10},
    },
    { // Seviye 5: Final - tüm mekanikler
      grid: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,5,0,6,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,9,0,0,0,0,0,0,0,10,0,0,0,0,1],
        [1,0,0,0,0,1,1,1,0,0,0,0,0,1,1,1,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,1],
        [1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
        [1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,2,2,0,0,0,0,0,0,3,3,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      fireStart: {x:1,y:10}, iceStart: {x:18,y:10},
    },
  ];

  const TS = 40; // Tile size
  const GW = 20 * TS, GH = 12 * TS;

  // Delta-time fizik sabitleri (piksel/saniye cinsinden)
  const GRAVITY  = TS * 50;     // yerçekimi ivmesi (2000)
  const MAXDX    = TS * 6;      // max yatay hız
  const MAXDY    = TS * 30;     // max dikey hız
  const ACCEL    = MAXDX * 3;   // 0.33s'de max hıza ulaş
  const FRICTION = MAXDX * 6;   // 0.16s'de dur
  const IMPULSE  = TS * 1200;   // zıplama impulse (48000 - gravity'nin 24x'i)

  const FPS = 60;
  const STEP = 1 / FPS;

  let container, gameData, canvas, ctx, animId;
  let myPlayer, opPlayer, myRole, opName;
  let currentMap, currentLevel, gates, coins, collectedCoins;
  let keys, gameActive, bothAtDoor;
  let lobbyRef, posRef, syncInterval;
  let lastTime, accumulator;

  function makeEntity(x, y) {
    return {
      x: x, y: y, dx: 0, dy: 0,
      gravity: GRAVITY, maxdx: MAXDX, maxdy: MAXDY,
      impulse: IMPULSE, accel: ACCEL, friction: FRICTION,
      left: false, right: false, jump: false,
      jumping: false, falling: true, atDoor: false,
      start: { x: x, y: y }
    };
  }

  // Tile koordinat yardımcıları
  function p2t(p) { return Math.floor(p / TS); }
  function t2p(t) { return t * TS; }
  function tcell(tx, ty) {
    if (tx < 0 || tx >= 20 || ty < 0 || ty >= 12) return 1; // duvar
    const tile = currentMap[ty][tx];
    if (tile === T.GATE_F) { const g = gates.fire.find(g => g.x === tx && g.y === ty); return (g && g.open) ? 0 : 1; }
    if (tile === T.GATE_I) { const g = gates.ice.find(g => g.x === tx && g.y === ty); return (g && g.open) ? 0 : 1; }
    return (tile === T.WALL) ? 1 : 0;
  }

  function init(gameArea, data) {
    container = gameArea;
    gameData = data;
    myRole = data.yourRole;
    opName = data.opponentName;
    currentLevel = data.level || 1;
    gameActive = true;
    bothAtDoor = false;
    keys = {};
    collectedCoins = 0;
    lastTime = performance.now();
    accumulator = 0;
    loadLevel(currentLevel);
    buildDOM();
    setupSync();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    loop();
  }

  function loadLevel(lvl) {
    const map = MAPS[lvl - 1];
    currentMap = map.grid.map(row => [...row]);
    gates = { fire: [], ice: [] };
    coins = [];

    // Kapılar ve coinleri bul
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 20; x++) {
        if (currentMap[y][x] === T.GATE_F) gates.fire.push({x, y, open: false});
        if (currentMap[y][x] === T.GATE_I) gates.ice.push({x, y, open: false});
        if (currentMap[y][x] === T.COIN) { coins.push({x, y, collected: false}); currentMap[y][x] = T.EMPTY; }
      }
    }

    const isHost = myRole === 'host';
    const myStart = isHost ? map.fireStart : map.iceStart;
    const opStart = isHost ? map.iceStart : map.fireStart;

    myPlayer = makeEntity(myStart.x * TS, myStart.y * TS);
    opPlayer = makeEntity(opStart.x * TS, opStart.y * TS);
  }

  function buildDOM() {
    while (container.firstChild) container.removeChild(container.firstChild);
    const wrap = document.createElement('div');
    wrap.className = 'ab-wrap';

    // Info bar
    const info = document.createElement('div');
    info.className = 'ab-info';
    info.id = 'ab-info';
    const myLabel = myRole === 'host' ? 'Ateş (Sen)' : 'Buz (Sen)';
    const opLabel = myRole === 'host' ? 'Buz (' + opName + ')' : 'Ateş (' + opName + ')';
    info.textContent = myLabel + ' vs ' + opLabel + ' | Seviye ' + currentLevel;
    wrap.appendChild(info);

    canvas = document.createElement('canvas');
    canvas.className = 'ab-canvas';
    canvas.width = GW; canvas.height = GH;
    ctx = canvas.getContext('2d');
    wrap.appendChild(canvas);

    // Mobil kontroller
    const controls = document.createElement('div');
    controls.className = 'ab-controls';
    const makeBtn = (cls, txt) => { const b = document.createElement('button'); b.className = 'ab-btn ' + cls; b.textContent = txt; return b; };
    const btnL = makeBtn('ab-btn-left', '\u25C0');
    const btnR = makeBtn('ab-btn-right', '\u25B6');
    const btnJ = makeBtn('ab-btn-jump', '\u25B2');
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

  function setupSync() {
    if (!db || !gameData.lobbyId) return;
    const lobbyId = gameData.lobbyId;
    lobbyRef = db.ref('lobbies/' + lobbyId);
    posRef = lobbyRef.child('positions');

    // Karşı oyuncunun pozisyonunu dinle
    const opField = myRole === 'host' ? 'guest' : 'host';
    posRef.child(opField).on('value', snap => {
      const val = snap.val();
      if (val) {
        opPlayer.x = val.x;
        opPlayer.y = val.y;
        opPlayer.atDoor = val.atDoor || false;
        checkBothAtDoor();
      }
    });

    // Düğme durumlarını dinle
    lobbyRef.child('buttons').on('value', snap => {
      const val = snap.val();
      if (val) {
        gates.fire.forEach((g, i) => { g.open = val['gf' + i] || false; });
        gates.ice.forEach((g, i) => { g.open = val['gi' + i] || false; });
      }
    });

    // Kendi pozisyonumu düzenli gönder
    syncInterval = setInterval(() => {
      if (!gameActive) return;
      const myField = myRole === 'host' ? 'host' : 'guest';
      posRef.child(myField).set({ x: myPlayer.x, y: myPlayer.y, atDoor: myPlayer.atDoor });
    }, 50);
  }

  function onKeyDown(e) {
    if (['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)) { e.preventDefault(); keys[e.key] = true; }
  }
  function onKeyUp(e) { keys[e.key] = false; }

  function loop() {
    if (!gameActive) return;
    const now = performance.now();
    accumulator += Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      updatePhysics(STEP);
    }
    draw();
    animId = requestAnimationFrame(loop);
  }

  function updatePhysics(dt) {
    const p = myPlayer;

    // Input → entity flags
    p.left = !!keys['ArrowLeft'];
    p.right = !!keys['ArrowRight'];
    p.jump = !!(keys[' '] || keys['ArrowUp']);

    // Fizik güncelle
    updateEntity(p, dt);

    // Tehlike kontrolü
    const isFire = myRole === 'host';
    checkHazards(p, isFire);

    // Düğme kontrolü
    checkButtons(p, isFire);

    // Kapı kontrolü
    checkDoor(p, isFire);

    // Coin kontrolü
    checkCoins(p);
  }

  // Delta-time tabanlı fizik motoru (referans: jakesgordon/javascript-tiny-platformer, MIT)
  function updateEntity(e, dt) {
    var wasleft  = e.dx < 0,
        wasright = e.dx > 0,
        falling  = e.falling,
        friction = e.friction * (falling ? 0.5 : 1),
        accel    = e.accel * (falling ? 0.5 : 1);

    e.ddx = 0;
    e.ddy = e.gravity;

    if (e.left)       e.ddx -= accel;
    else if (wasleft) e.ddx += friction;

    if (e.right)       e.ddx += accel;
    else if (wasright) e.ddx -= friction;

    if (e.jump && !e.jumping && !falling) {
      e.ddy -= e.impulse;
      e.jumping = true;
    }

    e.x  += dt * e.dx;
    e.y  += dt * e.dy;
    e.dx  = Math.max(-e.maxdx, Math.min(e.maxdx, e.dx + dt * e.ddx));
    e.dy  = Math.max(-e.maxdy, Math.min(e.maxdy, e.dy + dt * e.ddy));

    if ((wasleft && e.dx > 0) || (wasright && e.dx < 0)) e.dx = 0;

    // Tile tabanlı çarpışma
    var tx = p2t(e.x), ty = p2t(e.y),
        nx = e.x % TS,  ny = e.y % TS,
        cell      = tcell(tx, ty),
        cellright = tcell(tx + 1, ty),
        celldown  = tcell(tx, ty + 1),
        celldiag  = tcell(tx + 1, ty + 1);

    // Aşağı düşme
    if (e.dy > 0) {
      if ((celldown && !cell) || (celldiag && !cellright && nx)) {
        e.y = t2p(ty); e.dy = 0; e.falling = false; e.jumping = false; ny = 0;
      }
    }
    // Yukarı çarpma
    else if (e.dy < 0) {
      if ((cell && !celldown) || (cellright && !celldiag && nx)) {
        e.y = t2p(ty + 1); e.dy = 0;
        cell = celldown; cellright = celldiag; ny = 0;
      }
    }

    // Sağa çarpma
    if (e.dx > 0) {
      if ((cellright && !cell) || (celldiag && !celldown && ny)) {
        e.x = t2p(tx); e.dx = 0;
      }
    }
    // Sola çarpma
    else if (e.dx < 0) {
      if ((cell && !cellright) || (celldown && !celldiag && ny)) {
        e.x = t2p(tx + 1); e.dx = 0;
      }
    }

    e.falling = !(celldown || (nx && celldiag));
  }

  function rawTileAt(px, py) {
    const tx = p2t(px), ty = p2t(py);
    if (tx < 0 || tx >= 20 || ty < 0 || ty >= 12) return T.WALL;
    return currentMap[ty][tx];
  }

  function checkHazards(p, isFire) {
    // Karakterin alt-orta noktasını kontrol et
    const tile = rawTileAt(p.x + TS * 0.3, p.y + TS * 0.8);
    const tile2 = rawTileAt(p.x + TS * 0.7, p.y + TS * 0.8);
    const danger = (t) => (isFire && t === T.WATER) || (!isFire && t === T.LAVA) || t === T.POISON;
    if (danger(tile) || danger(tile2)) {
      AudioManager.play('error');
      respawnEntity(p);
    }
  }

  function respawnEntity(p) {
    p.x = p.start.x; p.y = p.start.y;
    p.dx = 0; p.dy = 0;
    p.falling = true; p.jumping = false; p.atDoor = false;
  }

  function checkButtons(p, isFire) {
    const tx = p2t(p.x + TS / 2);
    const ty = p2t(p.y + TS);
    if (ty >= 12 || ty < 0) return;
    const tile = currentMap[ty][tx];
    if (!p.falling && tile === T.BUTTON_F && isFire) {
      gates.fire.forEach(g => { g.open = true; });
      syncButtons();
    } else if (!p.falling && tile === T.BUTTON_I && !isFire) {
      gates.ice.forEach(g => { g.open = true; });
      syncButtons();
    }
  }

  function syncButtons() {
    if (!lobbyRef) return;
    const data = {};
    gates.fire.forEach((g, i) => { data['gf' + i] = g.open; });
    gates.ice.forEach((g, i) => { data['gi' + i] = g.open; });
    lobbyRef.child('buttons').set(data);
  }

  function checkDoor(p, isFire) {
    const tx = p2t(p.x + TS / 2);
    const ty = p2t(p.y + TS / 2);
    if (ty < 0 || ty >= 12 || tx < 0 || tx >= 20) return;
    const tile = currentMap[ty][tx];
    const myDoor = isFire ? T.FIRE_DOOR : T.ICE_DOOR;
    p.atDoor = (tile === myDoor);
    checkBothAtDoor();
  }

  function checkCoins(p) {
    for (const c of coins) {
      if (c.collected) continue;
      const dx = (p.x + TS / 2) - (c.x * TS + TS / 2);
      const dy = (p.y + TS / 2) - (c.y * TS + TS / 2);
      if (dx * dx + dy * dy < TS * TS) {
        c.collected = true;
        collectedCoins++;
        AudioManager.play('success');
      }
    }
  }

  function checkBothAtDoor() {
    if (myPlayer.atDoor && opPlayer.atDoor && !bothAtDoor) {
      bothAtDoor = true;
      gameActive = false;
      AudioManager.play('complete');
      Particles.celebrate();

      // Seviye tamamlandı
      if (currentLevel < 5) {
        setTimeout(() => {
          showLevelComplete();
        }, 800);
      } else {
        setTimeout(() => showGameOver(), 800);
      }
    }
  }

  function showLevelComplete() {
    const overlay = document.createElement('div');
    overlay.className = 'ab-overlay';
    const card = document.createElement('div');
    card.className = 'ab-complete-card';
    const title = document.createElement('h2');
    title.textContent = 'Seviye ' + currentLevel + ' Tamam!';
    card.appendChild(title);
    const nextBtn = document.createElement('button');
    nextBtn.className = 'ab-next-btn';
    nextBtn.textContent = 'Sonraki Seviye';
    nextBtn.onclick = () => {
      overlay.remove();
      currentLevel++;
      gameActive = true;
      bothAtDoor = false;
      collectedCoins = 0;
      loadLevel(currentLevel);
      // Seviye bilgisini Firebase'e yaz
      if (lobbyRef && myRole === 'host') lobbyRef.child('level').set(currentLevel);
      buildDOM();
      loop();
    };
    card.appendChild(nextBtn);
    overlay.appendChild(card);
    container.appendChild(overlay);
  }

  function showGameOver() {
    const overlay = document.createElement('div');
    overlay.className = 'ab-overlay';
    const card = document.createElement('div');
    card.className = 'ab-complete-card';
    const title = document.createElement('h2');
    title.textContent = 'Tebrikler! Tum Seviyeler Tamam!';
    card.appendChild(title);
    const hubBtn = document.createElement('button');
    hubBtn.className = 'ab-next-btn';
    hubBtn.textContent = 'Ana Sayfaya Don';
    hubBtn.onclick = () => { destroy(); App.showHub(); };
    card.appendChild(hubBtn);
    overlay.appendChild(card);
    container.appendChild(overlay);
  }

  function draw() {
    ctx.clearRect(0, 0, GW, GH);

    // Arka plan
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, GW, GH);

    // Tile'ları çiz
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 20; x++) {
        const tile = currentMap[y][x];
        const px = x * TS, py = y * TS;

        if (tile === T.WALL) {
          ctx.fillStyle = '#4a4a5e';
          ctx.fillRect(px, py, TS, TS);
          ctx.strokeStyle = '#3a3a4e';
          ctx.strokeRect(px, py, TS, TS);
        } else if (tile === T.LAVA) {
          ctx.fillStyle = '#FF4500';
          ctx.fillRect(px, py, TS, TS);
          ctx.fillStyle = '#FF6600';
          ctx.fillRect(px, py, TS, TS / 3);
        } else if (tile === T.WATER) {
          ctx.fillStyle = '#1E90FF';
          ctx.fillRect(px, py, TS, TS);
          ctx.fillStyle = '#4FC3F7';
          ctx.fillRect(px, py, TS, TS / 3);
        } else if (tile === T.POISON) {
          ctx.fillStyle = '#32CD32';
          ctx.fillRect(px, py, TS, TS);
          ctx.fillStyle = '#7CFC00';
          ctx.fillRect(px, py, TS, TS / 3);
        } else if (tile === T.FIRE_DOOR) {
          ctx.fillStyle = '#FF6347';
          ctx.fillRect(px + 5, py, TS - 10, TS);
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(px + 8, py + 3, TS - 16, TS - 6);
        } else if (tile === T.ICE_DOOR) {
          ctx.fillStyle = '#4FC3F7';
          ctx.fillRect(px + 5, py, TS - 10, TS);
          ctx.fillStyle = '#E0F7FA';
          ctx.fillRect(px + 8, py + 3, TS - 16, TS - 6);
        } else if (tile === T.BUTTON_F) {
          ctx.fillStyle = '#FF4500';
          ctx.fillRect(px + 10, py + TS - 8, TS - 20, 8);
          ctx.fillRect(px + 14, py + TS - 14, TS - 28, 6);
        } else if (tile === T.BUTTON_I) {
          ctx.fillStyle = '#1E90FF';
          ctx.fillRect(px + 10, py + TS - 8, TS - 20, 8);
          ctx.fillRect(px + 14, py + TS - 14, TS - 28, 6);
        } else if (tile === T.GATE_F) {
          const g = gates.fire.find(g => g.x === x && g.y === y);
          if (!g || !g.open) {
            ctx.fillStyle = 'rgba(255,69,0,0.6)';
            ctx.fillRect(px + 2, py, TS - 4, TS);
            // Çizgiler
            for (let i = 0; i < 4; i++) {
              ctx.fillStyle = 'rgba(255,140,0,0.5)';
              ctx.fillRect(px + 6, py + i * 10 + 2, TS - 12, 4);
            }
          }
        } else if (tile === T.GATE_I) {
          const g = gates.ice.find(g => g.x === x && g.y === y);
          if (!g || !g.open) {
            ctx.fillStyle = 'rgba(30,144,255,0.6)';
            ctx.fillRect(px + 2, py, TS - 4, TS);
            for (let i = 0; i < 4; i++) {
              ctx.fillStyle = 'rgba(79,195,247,0.5)';
              ctx.fillRect(px + 6, py + i * 10 + 2, TS - 12, 4);
            }
          }
        }
      }
    }

    // Coinler
    for (const c of coins) {
      if (c.collected) continue;
      const cx = c.x * TS + TS / 2, cy = c.y * TS + TS / 2;
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700'; ctx.fill();
      ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Ateş karakteri (host)
    const fireP = myRole === 'host' ? myPlayer : opPlayer;
    drawCharacter(fireP, true);

    // Buz karakteri (guest)
    const iceP = myRole === 'host' ? opPlayer : myPlayer;
    drawCharacter(iceP, false);
  }

  function drawCharacter(p, isFire) {
    const S = TS; // karakter boyutu = tile boyutu
    const color = isFire ? '#FF4500' : '#1E90FF';
    const highlight = isFire ? '#FF6600' : '#4FC3F7';
    const cx = p.x + S / 2;

    // Gövde
    ctx.fillStyle = color;
    ctx.fillRect(p.x + 8, p.y + 14, S - 16, S - 20);

    // Kafa
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(cx, p.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Gözler
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(cx - 4, p.y + 9, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, p.y + 9, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - 4, p.y + 9, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, p.y + 9, 2, 0, Math.PI * 2); ctx.fill();

    // Alev/Buz efekti (kafada)
    if (isFire) {
      ctx.fillStyle = '#FF6600';
      ctx.beginPath(); ctx.moveTo(cx - 8, p.y); ctx.lineTo(cx, p.y - 12); ctx.lineTo(cx + 8, p.y); ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.moveTo(cx - 5, p.y); ctx.lineTo(cx, p.y - 8); ctx.lineTo(cx + 5, p.y); ctx.fill();
    } else {
      ctx.fillStyle = '#B3E5FC';
      ctx.beginPath(); ctx.moveTo(cx - 8, p.y - 2); ctx.lineTo(cx - 4, p.y - 10); ctx.lineTo(cx, p.y - 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, p.y - 2); ctx.lineTo(cx + 4, p.y - 10); ctx.lineTo(cx + 8, p.y - 2); ctx.fill();
    }

    // Bacaklar
    ctx.fillStyle = color;
    ctx.fillRect(p.x + 8, p.y + S - 6, 8, 6);
    ctx.fillRect(p.x + S - 16, p.y + S - 6, 8, 6);
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    if (syncInterval) clearInterval(syncInterval);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    keys = {};
    gameActive = false;

    // Firebase dinleyicileri temizle
    if (posRef) {
      const opField = myRole === 'host' ? 'guest' : 'host';
      posRef.child(opField).off();
    }
    if (lobbyRef) lobbyRef.child('buttons').off();
    if (container) while (container.firstChild) container.removeChild(container.firstChild);
  }

  return { id, isMultiplayer, init, destroy };
})();
