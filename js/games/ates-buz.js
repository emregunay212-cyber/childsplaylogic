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
  const MAPS = [
    { // Seviye 1: Basit tanışma
      grid: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,11,0,0,11,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,5,0,6,1],
        [1,0,0,0,0,0,0,2,2,0,0,3,3,0,0,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      fireStart: {x:1,y:10}, iceStart: {x:3,y:10},
    },
    { // Seviye 2: Platformlu
      grid: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
        [1,0,0,0,0,0,0,2,2,0,0,3,3,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      fireStart: {x:1,y:10}, iceStart: {x:3,y:10},
    },
    { // Seviye 3: Düğme mekaniği
      grid: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,6,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1],
        [1,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,7,0,0,0,0,0,0,0,0,10,0,0,0,0,0,1],
        [1,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,1],
        [1,0,0,0,0,0,0,2,0,0,0,3,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      fireStart: {x:1,y:10}, iceStart: {x:9,y:10},
    },
    { // Seviye 4: Karmaşık düğme + platform
      grid: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,5,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,1],
        [1,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,0,0,0,1],
        [1,0,0,8,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,1],
        [1,0,1,1,1,0,0,0,4,4,4,0,0,0,0,0,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      fireStart: {x:1,y:10}, iceStart: {x:14,y:10},
    },
    { // Seviye 5: Tüm mekanikler
      grid: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,6,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1],
        [1,0,0,0,0,0,0,11,0,0,0,9,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,1,1,0,1,1,1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,7,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,1],
        [1,0,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
        [1,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,8,0,1],
        [1,0,0,0,0,2,2,0,0,0,0,3,3,0,0,0,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      ],
      fireStart: {x:1,y:10}, iceStart: {x:9,y:10},
    },
  ];

  const TS = 40; // Tile size
  const PW = 20, PH = 28;
  const GRAV = 0.5, JFORCE = -9, SPEED = 3;
  const GW = 20 * TS, GH = 12 * TS;

  let container, gameData, canvas, ctx, animId;
  let myPlayer, opPlayer, myRole, opName;
  let currentMap, currentLevel, gates, coins, collectedCoins;
  let keys, gameActive, bothAtDoor;
  let lobbyRef, posRef, syncInterval;

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

    myPlayer = { x: myStart.x * TS + 10, y: myStart.y * TS + 10, vx: 0, vy: 0, onGround: false, atDoor: false };
    opPlayer = { x: opStart.x * TS + 10, y: opStart.y * TS + 10, vx: 0, vy: 0, onGround: false, atDoor: false };
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
    update(); draw();
    animId = requestAnimationFrame(loop);
  }

  function update() {
    // Input
    if (keys['ArrowLeft']) myPlayer.vx = -SPEED;
    else if (keys['ArrowRight']) myPlayer.vx = SPEED;
    else myPlayer.vx = 0;

    if ((keys[' '] || keys['ArrowUp']) && myPlayer.onGround) {
      myPlayer.vy = JFORCE;
      myPlayer.onGround = false;
    }

    // Physics
    myPlayer.vy += GRAV;
    myPlayer.x += myPlayer.vx;
    resolveCollisionX(myPlayer);
    myPlayer.y += myPlayer.vy;
    resolveCollisionY(myPlayer);

    // Tehlike kontrolü
    const isFire = myRole === 'host';
    checkHazards(myPlayer, isFire);

    // Düğme kontrolü
    checkButtons(myPlayer, isFire);

    // Kapı kontrolü
    checkDoor(myPlayer, isFire);

    // Coin kontrolü
    checkCoins(myPlayer);
  }

  function tileAt(px, py) {
    const tx = Math.floor(px / TS);
    const ty = Math.floor(py / TS);
    if (tx < 0 || tx >= 20 || ty < 0 || ty >= 12) return T.WALL;
    const tile = currentMap[ty][tx];
    // Kapılar açıksa boş
    if (tile === T.GATE_F) { const g = gates.fire.find(g => g.x === tx && g.y === ty); return g && g.open ? T.EMPTY : T.WALL; }
    if (tile === T.GATE_I) { const g = gates.ice.find(g => g.x === tx && g.y === ty); return g && g.open ? T.EMPTY : T.WALL; }
    return tile;
  }

  function isSolid(tile) {
    return tile === T.WALL;
  }

  function resolveCollisionX(p) {
    // Sol
    if (isSolid(tileAt(p.x, p.y + 2)) || isSolid(tileAt(p.x, p.y + PH - 2))) {
      p.x = Math.floor(p.x / TS) * TS + TS; p.vx = 0;
    }
    // Sağ
    if (isSolid(tileAt(p.x + PW, p.y + 2)) || isSolid(tileAt(p.x + PW, p.y + PH - 2))) {
      p.x = Math.floor((p.x + PW) / TS) * TS - PW; p.vx = 0;
    }
  }

  function resolveCollisionY(p) {
    p.onGround = false;
    // Aşağı
    if (isSolid(tileAt(p.x + 2, p.y + PH)) || isSolid(tileAt(p.x + PW - 2, p.y + PH))) {
      p.y = Math.floor((p.y + PH) / TS) * TS - PH;
      p.vy = 0; p.onGround = true;
    }
    // Yukarı
    if (p.vy < 0 && (isSolid(tileAt(p.x + 2, p.y)) || isSolid(tileAt(p.x + PW - 2, p.y)))) {
      p.y = Math.floor(p.y / TS) * TS + TS; p.vy = 0;
    }
  }

  function checkHazards(p, isFire) {
    const cx = p.x + PW / 2, cy = p.y + PH / 2;
    const tile = tileAt(cx, cy);
    // Ateş su'dan ölür, Buz lava'dan ölür, ikisi de zehirden ölür
    if ((isFire && tile === T.WATER) || (!isFire && tile === T.LAVA) || tile === T.POISON) {
      AudioManager.play('error');
      respawn(p);
    }
  }

  function respawn(p) {
    const map = MAPS[currentLevel - 1];
    const isFire = myRole === 'host';
    const start = isFire ? map.fireStart : map.iceStart;
    p.x = start.x * TS + 10; p.y = start.y * TS + 10;
    p.vx = 0; p.vy = 0; p.onGround = false; p.atDoor = false;
  }

  function checkButtons(p, isFire) {
    const tx = Math.floor((p.x + PW / 2) / TS);
    const ty = Math.floor((p.y + PH) / TS);
    if (ty >= 12) return;
    const tile = currentMap[ty][tx];
    const isOnButton = p.onGround && (p.y + PH >= ty * TS - 2);

    if (isOnButton && tile === T.BUTTON_F && isFire) {
      gates.fire.forEach((g, i) => { g.open = true; });
      syncButtons();
    } else if (isOnButton && tile === T.BUTTON_I && !isFire) {
      gates.ice.forEach((g, i) => { g.open = true; });
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
    const tx = Math.floor((p.x + PW / 2) / TS);
    const ty = Math.floor((p.y + PH / 2) / TS);
    if (ty < 0 || ty >= 12 || tx < 0 || tx >= 20) return;
    const tile = currentMap[ty][tx];
    const myDoor = isFire ? T.FIRE_DOOR : T.ICE_DOOR;
    p.atDoor = (tile === myDoor);
    checkBothAtDoor();
  }

  function checkCoins(p) {
    for (const c of coins) {
      if (c.collected) continue;
      const dx = (p.x + PW / 2) - (c.x * TS + TS / 2);
      const dy = (p.y + PH / 2) - (c.y * TS + TS / 2);
      if (dx * dx + dy * dy < 600) {
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
    const color = isFire ? '#FF4500' : '#1E90FF';
    const highlight = isFire ? '#FF6600' : '#4FC3F7';

    // Gövde
    ctx.fillStyle = color;
    ctx.fillRect(p.x + 4, p.y + 10, PW - 8, PH - 14);

    // Kafa
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(p.x + PW / 2, p.y + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Gözler
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(p.x + 7, p.y + 7, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + 13, p.y + 7, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(p.x + 7, p.y + 7, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + 13, p.y + 7, 1.5, 0, Math.PI * 2); ctx.fill();

    // Alev/Buz efekti (kafada)
    if (isFire) {
      ctx.fillStyle = '#FF6600';
      ctx.beginPath(); ctx.moveTo(p.x + 5, p.y); ctx.lineTo(p.x + 10, p.y - 8); ctx.lineTo(p.x + 15, p.y); ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.moveTo(p.x + 7, p.y); ctx.lineTo(p.x + 10, p.y - 5); ctx.lineTo(p.x + 13, p.y); ctx.fill();
    } else {
      ctx.fillStyle = '#B3E5FC';
      ctx.beginPath(); ctx.moveTo(p.x + 4, p.y - 2); ctx.lineTo(p.x + 7, p.y - 7); ctx.lineTo(p.x + 10, p.y - 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x + 10, p.y - 2); ctx.lineTo(p.x + 13, p.y - 7); ctx.lineTo(p.x + 16, p.y - 2); ctx.fill();
    }

    // Bacaklar
    ctx.fillStyle = color;
    ctx.fillRect(p.x + 4, p.y + PH - 4, 5, 4);
    ctx.fillRect(p.x + PW - 9, p.y + PH - 4, 5, 4);
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
