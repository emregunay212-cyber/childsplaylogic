/* ============================================
   OYUN: Ateş & Buz - Online 2 Kişilik Platform
   Host-authoritative: Host tüm fiziği hesaplar.
   Guest sadece input gönderir, host state yayınlar.
   ============================================ */

const AtesBuz = (() => {
  const id = 'ates-buz';
  const isMultiplayer = true;

  // Tile tipleri
  const T = {
    EMPTY: 0, WALL: 1, LAVA: 2, WATER: 3, POISON: 4,
    FIRE_DOOR: 5, ICE_DOOR: 6, BUTTON_F: 7, BUTTON_I: 8,
    GATE_F: 9, GATE_I: 10,
  };

  // Grid: 20 wide x 12 tall, 40px tile
  const TILE = 40, MAP_W = 20, MAP_H = 12;
  const GW = MAP_W * TILE, GH = MAP_H * TILE;

  // Fizik sabitleri (host tick: 60Hz)
  const GRAVITY = 1800;
  const MOVE_SPEED = 220;
  const JUMP_V = 560;
  const MAX_FALL = 900;

  // Ağ: host state yayın hızı ~25Hz, guest input hızı ~20Hz
  const BROADCAST_MS = 40;
  const DISCONNECT_MS = 8000;

  // Seviye haritaları (1 = duvar, _ = boş, diğerleri tile kodu)
  // Legend: F=fire_door, I=ice_door, b=button_f, B=button_i, g=gate_f, G=gate_i,
  //         L=lava, W=water, P=poison, 1=wall, .=empty
  // Fire (host) = kırmızı, Buz (guest) = mavi
  // Fire ↔ water (ölümcül), Ice ↔ lava (ölümcül), poison ikisine de
  const LEVELS = [ // max zıplama ~2 tile ↑ + 1 tile ↔
    // Seviye 1: Başlangıç — 2 sıçrama, geniş platformlar, tehlikesiz.
    {
      name: 'Başlangıç',
      rows: [
        '11111111111111111111',
        '1..................1',
        '1..................1',
        '1..................1',
        '1..................1',
        '1..................1',
        '1..................1',
        '1.F..............I.1',
        '1111............1111',
        '1..1111......1111..1',
        '1..................1',
        '11111111111111111111',
      ],
      fireStart: { x: 2, y: 10 },
      iceStart: { x: 17, y: 10 },
    },
    // Seviye 2: Dikkat — aynı yapı + ortada küçük lav/su havuzu.
    {
      name: 'Dikkat',
      rows: [
        '11111111111111111111',
        '1..................1',
        '1..................1',
        '1..................1',
        '1..................1',
        '1..................1',
        '1..................1',
        '1.F..............I.1',
        '1111............1111',
        '1..1111......1111..1',
        '1.......LL.WW......1',
        '11111111111111111111',
      ],
      fireStart: { x: 2, y: 10 },
      iceStart: { x: 17, y: 10 },
    },
    // Seviye 3: Düğme — her oyuncu kendi butonuna basar, üstteki dekoratif
    // kapısı kaybolur (cause-and-effect). Mutual koordinasyon yok.
    {
      name: 'Düğme',
      rows: [
        '11111111111111111111',
        '1.g..............G.1',
        '1..................1',
        '1..................1',
        '1..................1',
        '1..................1',
        '1..................1',
        '1.F..............I.1',
        '1111............1111',
        '1..1111......1111..1',
        '1..b............B..1',
        '11111111111111111111',
      ],
      fireStart: { x: 2, y: 10 },
      iceStart: { x: 17, y: 10 },
    },
  ];

  // Modül durumu
  let container, gameData, myRole, opName;
  let canvas, ctx, animId;
  let currentLevelIdx;
  let map;                      // 2D tile array (mutable: gates değişir)
  let gates;                    // {fire:[{x,y,open}], ice:[...]}
  let fireDoor, iceDoor;        // {x,y}
  let fire, ice;                // { x,y,vx,vy, onGround, dead, atDoor, inputL, inputR, inputJ }
  // Guest render smoothing
  let renderFire, renderIce;    // lerp hedefleri
  let gameActive, levelComplete;

  // Firebase
  let lobbyRef, stateRef, lobbyLevelRef;
  let hostBroadcastTimer = null;
  let disconnectTimer = null;
  let completeTimeoutId = null;

  // Girdi
  let keys;

  // ─────────────────────────────────────────
  // Yaşam döngüsü
  // ─────────────────────────────────────────
  function init(gameArea, data) {
    container = gameArea;
    gameData = data || {};
    myRole = gameData.yourRole;
    opName = gameData.opponentName || 'Rakip';
    currentLevelIdx = Math.max(0, (gameData.level || 1) - 1);
    gameActive = true;
    levelComplete = false;
    keys = {};

    buildDOM();
    loadLevel(currentLevelIdx);
    setupNetwork();
    addInputListeners();

    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    gameActive = false;
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    stopNetwork();
    removeInputListeners();
    if (container) while (container.firstChild) container.removeChild(container.firstChild);
    container = null; canvas = null; ctx = null;
    fire = ice = renderFire = renderIce = null;
    map = null; gates = null;
  }

  // ─────────────────────────────────────────
  // Seviye & harita
  // ─────────────────────────────────────────
  function parseLevel(idx) {
    const L = LEVELS[idx];
    const grid = [];
    const fireGates = [], iceGates = [];
    let fd = null, idoor = null;

    for (let y = 0; y < MAP_H; y++) {
      const row = L.rows[y];
      const rowArr = new Array(MAP_W).fill(T.EMPTY);
      for (let x = 0; x < MAP_W; x++) {
        const c = row[x];
        switch (c) {
          case '1': rowArr[x] = T.WALL; break;
          case 'L': rowArr[x] = T.LAVA; break;
          case 'W': rowArr[x] = T.WATER; break;
          case 'P': rowArr[x] = T.POISON; break;
          case 'F': rowArr[x] = T.FIRE_DOOR; fd = { x, y }; break;
          case 'I': rowArr[x] = T.ICE_DOOR; idoor = { x, y }; break;
          case 'b': rowArr[x] = T.BUTTON_F; break;
          case 'B': rowArr[x] = T.BUTTON_I; break;
          case 'g': rowArr[x] = T.GATE_F; fireGates.push({ x, y, open: false }); break;
          case 'G': rowArr[x] = T.GATE_I; iceGates.push({ x, y, open: false }); break;
          default: rowArr[x] = T.EMPTY;
        }
      }
      grid.push(rowArr);
    }
    return {
      grid, fireGates, iceGates,
      fireDoor: fd, iceDoor: idoor,
      fireStart: L.fireStart, iceStart: L.iceStart,
      name: L.name,
    };
  }

  function loadLevel(idx) {
    const lv = parseLevel(idx);
    map = lv.grid;
    gates = { fire: lv.fireGates, ice: lv.iceGates };
    fireDoor = lv.fireDoor;
    iceDoor = lv.iceDoor;

    fire = makeEntity(lv.fireStart.x, lv.fireStart.y);
    ice = makeEntity(lv.iceStart.x, lv.iceStart.y);
    renderFire = { x: fire.x, y: fire.y };
    renderIce = { x: ice.x, y: ice.y };

    levelComplete = false;
    updateInfoBar();
  }

  function makeEntity(tx, ty) {
    return {
      x: tx * TILE, y: ty * TILE,
      vx: 0, vy: 0,
      onGround: false, dead: false, atDoor: false,
      startX: tx * TILE, startY: ty * TILE,
      inputL: false, inputR: false, inputJ: false,
      jumpHeld: false, // zıplama tuşu serbest bırakılmadan tekrar zıplanamaz
    };
  }

  // ─────────────────────────────────────────
  // Çarpışma yardımcıları
  // ─────────────────────────────────────────
  function tileAt(tx, ty) {
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return T.WALL;
    return map[ty][tx];
  }

  function isSolid(tx, ty) {
    const t = tileAt(tx, ty);
    if (t === T.WALL) return true;
    if (t === T.GATE_F) {
      const g = gates.fire.find(g => g.x === tx && g.y === ty);
      return !(g && g.open);
    }
    if (t === T.GATE_I) {
      const g = gates.ice.find(g => g.x === tx && g.y === ty);
      return !(g && g.open);
    }
    return false;
  }

  // Karakter hitbox = 32x36 (tile 40x40), grid'de sığar
  const BOX_W = 32, BOX_H = 36;
  function entityBox(e) {
    return {
      l: e.x + (TILE - BOX_W) / 2,
      r: e.x + (TILE - BOX_W) / 2 + BOX_W,
      t: e.y + (TILE - BOX_H),
      b: e.y + TILE,
    };
  }

  function collidesAt(e, newX, newY) {
    const l = newX + (TILE - BOX_W) / 2;
    const r = l + BOX_W - 1;
    const t = newY + (TILE - BOX_H);
    const b = newY + TILE - 1;
    const lt = Math.floor(l / TILE), rt = Math.floor(r / TILE);
    const tt = Math.floor(t / TILE), bt = Math.floor(b / TILE);
    for (let ty = tt; ty <= bt; ty++) {
      for (let tx = lt; tx <= rt; tx++) {
        if (isSolid(tx, ty)) return true;
      }
    }
    return false;
  }

  // ─────────────────────────────────────────
  // Fizik (sadece host)
  // ─────────────────────────────────────────
  function stepEntity(e, dt) {
    if (e.dead) return;

    const dir = (e.inputR ? 1 : 0) - (e.inputL ? 1 : 0);
    e.vx = dir * MOVE_SPEED;

    // Zıplama: tuş basılı tutulurken tek zıplama
    if (e.inputJ && e.onGround && !e.jumpHeld) {
      e.vy = -JUMP_V;
      e.onGround = false;
      e.jumpHeld = true;
    }
    if (!e.inputJ) e.jumpHeld = false;

    // Yerçekimi
    e.vy += GRAVITY * dt;
    if (e.vy > MAX_FALL) e.vy = MAX_FALL;

    // X ekseninde ilerle
    let nx = e.x + e.vx * dt;
    if (collidesAt(e, nx, e.y)) {
      // Blok — kademeli yaklaştır
      const step = Math.sign(e.vx);
      while (step !== 0 && !collidesAt(e, e.x + step, e.y)) e.x += step;
      e.vx = 0;
    } else {
      e.x = nx;
    }

    // Y ekseninde ilerle
    let ny = e.y + e.vy * dt;
    if (collidesAt(e, e.x, ny)) {
      const step = Math.sign(e.vy);
      while (step !== 0 && !collidesAt(e, e.x, e.y + step)) e.y += step;
      if (e.vy > 0) e.onGround = true;
      e.vy = 0;
    } else {
      e.y = ny;
      e.onGround = false;
    }

    // Yerde kontrolü (1 px altta katı var mı?)
    if (e.vy === 0) {
      e.onGround = collidesAt(e, e.x, e.y + 1);
    }

    // Harita sınırı
    if (e.y > GH + 200) killEntity(e);
  }

  function checkHazards(e, isFire) {
    if (e.dead) return;
    // Merkez tile'a bak
    const cx = e.x + TILE / 2;
    const cy = e.y + TILE - 8;
    const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
    const t = tileAt(tx, ty);
    if (t === T.POISON) return killEntity(e);
    if (isFire && t === T.WATER) return killEntity(e);
    if (!isFire && t === T.LAVA) return killEntity(e);
  }

  function killEntity(e) {
    if (e.dead) return;
    e.dead = true;
    setTimeout(() => {
      if (!gameActive) return;
      e.x = e.startX; e.y = e.startY;
      e.vx = 0; e.vy = 0; e.dead = false; e.onGround = false; e.atDoor = false;
    }, 600);
  }

  function checkButtons() {
    // Kalıcı buton: bir kez basıldığında kapı kalıcı açık, false'a geri dönmez.
    // Sıfırlama sadece loadLevel'de olur (yeni gate'ler open:false yaratılır).
    const onButton = (e, type) => {
      if (e.dead) return false;
      const cx = e.x + TILE / 2;
      const feetY = e.y + TILE - 2;
      const tx = Math.floor(cx / TILE), ty = Math.floor(feetY / TILE);
      return tileAt(tx, ty) === type;
    };
    if (myRole === 'host') {
      if (onButton(fire, T.BUTTON_F)) gates.fire.forEach(g => { g.open = true; });
    } else {
      if (onButton(ice, T.BUTTON_I)) gates.ice.forEach(g => { g.open = true; });
    }
  }

  function checkDoors() {
    const atOwnDoor = (e, door) => {
      if (!door || e.dead) return false;
      const cx = e.x + TILE / 2, cy = e.y + TILE / 2;
      const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
      return tx === door.x && ty === door.y;
    };
    // Her oyuncu sadece kendi karakterinin kapı durumunu günceller
    if (myRole === 'host') {
      fire.atDoor = atOwnDoor(fire, fireDoor);
    } else {
      ice.atDoor = atOwnDoor(ice, iceDoor);
    }
    // Host otoriter olarak seviye tamamlanmasını tespit eder (her iki atDoor true)
    if (myRole === 'host' && fire.atDoor && ice.atDoor && !levelComplete) {
      levelComplete = true;
      gameActive = false;
      if (typeof AudioManager !== 'undefined') AudioManager.play('complete');
      if (typeof Particles !== 'undefined' && Particles.celebrate) Particles.celebrate();
      completeTimeoutId = setTimeout(() => {
        completeTimeoutId = null;
        if (levelComplete) showLevelComplete();
      }, 700);
    }
  }

  function tick(dt) {
    if (!gameActive || levelComplete) return;
    // Her oyuncu sadece kendi karakterinin fiziğini çalıştırır
    if (myRole === 'host') {
      stepEntity(fire, dt);
      checkHazards(fire, true);
    } else {
      stepEntity(ice, dt);
      checkHazards(ice, false);
    }
    checkButtons();
    checkDoors();
  }

  // ─────────────────────────────────────────
  // Ağ
  // ─────────────────────────────────────────
  let lastOpponentSeenAt = 0;
  let lastOpponentT = null;

  function setupNetwork() {
    if (typeof db === 'undefined' || !db || !gameData.lobbyId) return;
    lobbyRef = db.ref('lobbies/' + gameData.lobbyId);
    stateRef = lobbyRef.child('ab_state');
    lobbyLevelRef = lobbyRef.child('level');

    // Tek otorite: lobby.level — seviye geçişleri için
    lobbyLevelRef.on('value', snap => {
      const lvl = snap.val();
      if (typeof lvl !== 'number') return;
      const idx = Math.max(0, lvl - 1);
      if (idx > currentLevelIdx) advanceTo(idx);
    });

    // Her iki taraf state'e yazar (kendi subtree'sine) ve her iki taraf dinler
    stateRef.on('value', snap => {
      const v = snap.val();
      if (!v) return;
      applyRemoteState(v);
      // Rakibin timestamp'i — disconnect watchdog için
      const opField = myRole === 'host' ? 'g' : 'h';
      const op = v[opField];
      if (op && typeof op.t === 'number' && op.t !== lastOpponentT) {
        lastOpponentT = op.t;
        lastOpponentSeenAt = performance.now();
      }
    });

    hostBroadcastTimer = setInterval(broadcastState, BROADCAST_MS);
    broadcastState();

    disconnectTimer = setInterval(() => {
      if (!gameActive || lastOpponentSeenAt === 0) return;
      if (performance.now() - lastOpponentSeenAt > DISCONNECT_MS) onDisconnect();
    }, 1500);
  }

  function stopNetwork() {
    if (hostBroadcastTimer) { clearInterval(hostBroadcastTimer); hostBroadcastTimer = null; }
    if (disconnectTimer) { clearInterval(disconnectTimer); disconnectTimer = null; }
    if (completeTimeoutId) { clearTimeout(completeTimeoutId); completeTimeoutId = null; }
    if (stateRef) stateRef.off();
    if (lobbyLevelRef) lobbyLevelRef.off();
    lobbyRef = stateRef = lobbyLevelRef = null;
    lastOpponentSeenAt = 0; lastOpponentT = null;
  }

  function broadcastState() {
    if (!stateRef) return;
    if (myRole === 'host') {
      stateRef.child('h').set({
        x: Math.round(fire.x), y: Math.round(fire.y), d: fire.dead ? 1 : 0,
        atd: fire.atDoor ? 1 : 0,
        gf: gates.fire.map(g => g.open ? 1 : 0).join(''),
        lvl: currentLevelIdx,
        done: levelComplete ? 1 : 0,
        t: Date.now(),
      });
    } else {
      stateRef.child('g').set({
        x: Math.round(ice.x), y: Math.round(ice.y), d: ice.dead ? 1 : 0,
        atd: ice.atDoor ? 1 : 0,
        gi: gates.ice.map(g => g.open ? 1 : 0).join(''),
        t: Date.now(),
      });
    }
  }

  function applyRemoteState(v) {
    if (myRole === 'host') {
      // Host guest'in verisini okur (ice pozisyon + ice gates + ice atDoor)
      const g = v.g;
      if (!g) return;
      if (typeof g.x === 'number') ice.x = g.x;
      if (typeof g.y === 'number') ice.y = g.y;
      ice.dead = !!g.d;
      ice.atDoor = !!g.atd;
      // Monotonik: kalıcı buton ile tutarlı — sadece true'ya yükselt
      if (typeof g.gi === 'string')
        for (let i = 0; i < gates.ice.length; i++) if (g.gi[i] === '1') gates.ice[i].open = true;
    } else {
      // Guest host'un verisini okur (fire + lvl/done)
      const h = v.h;
      if (!h) return;
      if (typeof h.lvl === 'number' && h.lvl > currentLevelIdx) {
        advanceTo(h.lvl);
        return;
      }
      if (typeof h.lvl === 'number' && h.lvl !== currentLevelIdx) return;
      if (typeof h.x === 'number') fire.x = h.x;
      if (typeof h.y === 'number') fire.y = h.y;
      fire.dead = !!h.d;
      fire.atDoor = !!h.atd;
      if (typeof h.gf === 'string')
        for (let i = 0; i < gates.fire.length; i++) if (h.gf[i] === '1') gates.fire[i].open = true;
      if (h.done && !levelComplete) {
        levelComplete = true;
        gameActive = false;
        if (typeof AudioManager !== 'undefined') AudioManager.play('complete');
        if (typeof Particles !== 'undefined' && Particles.celebrate) Particles.celebrate();
        completeTimeoutId = setTimeout(() => {
          completeTimeoutId = null;
          if (levelComplete) showLevelComplete();
        }, 700);
      }
    }
  }

  function onDisconnect() {
    if (!gameActive) return;
    gameActive = false;
    showOverlay('Rakip bağlantısı koptu', 'Ana Sayfaya Dön', () => {
      destroy();
      if (typeof App !== 'undefined' && App.showHub) App.showHub();
    });
  }

  // ─────────────────────────────────────────
  // Ana döngü
  // ─────────────────────────────────────────
  let lastTime = 0;
  function loop(ts) {
    if (animId === null) return;

    if (!lastTime) lastTime = ts;
    let dt = Math.min(0.05, (ts - lastTime) / 1000);
    lastTime = ts;

    // Her oyuncu kendi karakterinin input'unu günceller ve fiziğini yerel çalıştırır
    if (myRole === 'host') {
      fire.inputL = !!keys['ArrowLeft']; fire.inputR = !!keys['ArrowRight']; fire.inputJ = !!(keys[' '] || keys['ArrowUp']);
    } else {
      ice.inputL = !!keys['ArrowLeft']; ice.inputR = !!keys['ArrowRight']; ice.inputJ = !!(keys[' '] || keys['ArrowUp']);
    }
    if (gameActive) tick(dt);

    // Kendi karakterin direkt render; rakip karakter lerp ile yumuşatılır
    const a = 0.35;
    if (myRole === 'host') {
      renderFire.x = fire.x; renderFire.y = fire.y;
      renderIce.x += (ice.x - renderIce.x) * a;
      renderIce.y += (ice.y - renderIce.y) * a;
    } else {
      renderIce.x = ice.x; renderIce.y = ice.y;
      renderFire.x += (fire.x - renderFire.x) * a;
      renderFire.y += (fire.y - renderFire.y) * a;
    }

    draw();
    animId = requestAnimationFrame(loop);
  }

  // ─────────────────────────────────────────
  // Çizim
  // ─────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    // Gradient arka plan
    const g = ctx.createLinearGradient(0, 0, 0, GH);
    g.addColorStop(0, '#1a1a2e');
    g.addColorStop(1, '#0f1424');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GW, GH);

    // Tile'lar
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = map[y][x];
        const px = x * TILE, py = y * TILE;
        if (t === T.WALL) drawWall(px, py);
        else if (t === T.LAVA) drawLava(px, py);
        else if (t === T.WATER) drawWater(px, py);
        else if (t === T.POISON) drawPoison(px, py);
        else if (t === T.FIRE_DOOR) drawDoor(px, py, true);
        else if (t === T.ICE_DOOR) drawDoor(px, py, false);
        else if (t === T.BUTTON_F) drawButton(px, py, true, gates.fire.length > 0 && gates.fire[0].open);
        else if (t === T.BUTTON_I) drawButton(px, py, false, gates.ice.length > 0 && gates.ice[0].open);
        else if (t === T.GATE_F) {
          const gg = gates.fire.find(g => g.x === x && g.y === y);
          if (!gg || !gg.open) drawGate(px, py, true);
        } else if (t === T.GATE_I) {
          const gg = gates.ice.find(g => g.x === x && g.y === y);
          if (!gg || !gg.open) drawGate(px, py, false);
        }
      }
    }

    // Karakterler
    if (!fire.dead) drawCharacter(renderFire.x, renderFire.y, true);
    if (!ice.dead) drawCharacter(renderIce.x, renderIce.y, false);
  }

  function drawWall(px, py) {
    ctx.fillStyle = '#3a3a52'; ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = '#4a4a66'; ctx.fillRect(px, py, TILE, 4);
    ctx.fillStyle = '#2a2a3e'; ctx.fillRect(px, py + TILE - 4, TILE, 4);
  }
  function drawLiquid(px, py, deep, mid, top) {
    ctx.fillStyle = deep; ctx.fillRect(px, py + 8, TILE, TILE - 8);
    ctx.fillStyle = mid; ctx.fillRect(px, py + 6, TILE, 6);
    ctx.fillStyle = top;
    ctx.fillRect(px, py + 4 + Math.sin(performance.now() / 200 + px) * 2, TILE, 3);
  }
  function drawLava(px, py)   { drawLiquid(px, py, '#c12a0a', '#ff5722', '#ffb300'); }
  function drawWater(px, py)  { drawLiquid(px, py, '#0d47a1', '#1e88e5', '#81d4fa'); }
  function drawPoison(px, py) { drawLiquid(px, py, '#2e7d32', '#66bb6a', '#ccff90'); }
  function drawDoor(px, py, isFire) {
    ctx.fillStyle = isFire ? '#ff6b35' : '#4fc3f7';
    ctx.fillRect(px + 4, py + 2, TILE - 8, TILE - 2);
    ctx.fillStyle = isFire ? '#ffd166' : '#e1f5fe';
    ctx.fillRect(px + 8, py + 6, TILE - 16, TILE - 10);
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(px + TILE - 12, py + TILE / 2, 2, 0, Math.PI * 2); ctx.fill();
  }
  function drawButton(px, py, isFire, pressed) {
    ctx.fillStyle = '#444'; ctx.fillRect(px + 6, py + TILE - 10, TILE - 12, 4);
    ctx.fillStyle = pressed ? (isFire ? '#992b00' : '#0d47a1') : (isFire ? '#ff4500' : '#1e90ff');
    ctx.fillRect(px + 10, py + (pressed ? TILE - 11 : TILE - 14), TILE - 20, pressed ? 3 : 6);
  }
  function drawGate(px, py, isFire) {
    ctx.fillStyle = isFire ? 'rgba(255,69,0,0.7)' : 'rgba(30,144,255,0.7)';
    ctx.fillRect(px + 2, py, TILE - 4, TILE);
    ctx.fillStyle = isFire ? 'rgba(255,140,0,0.4)' : 'rgba(79,195,247,0.4)';
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 4, py + 4 + i * 12, TILE - 8, 4);
  }
  function drawCharacter(x, y, isFire) {
    const color = isFire ? '#ff5722' : '#29b6f6';
    const hl = isFire ? '#ffab40' : '#b3e5fc';
    const cx = x + TILE / 2;
    // Gövde
    ctx.fillStyle = color;
    ctx.fillRect(x + 10, y + 14, TILE - 20, TILE - 18);
    // Kafa
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.arc(cx, y + 12, 10, 0, Math.PI * 2);
    ctx.fill();
    // Gözler
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - 4, y + 11, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, y + 11, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(cx - 4, y + 11, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, y + 11, 1.5, 0, Math.PI * 2); ctx.fill();
    // Efekt
    if (isFire) {
      ctx.fillStyle = '#ffab40';
      ctx.beginPath(); ctx.moveTo(cx - 8, y + 2); ctx.lineTo(cx, y - 8); ctx.lineTo(cx + 8, y + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath(); ctx.moveTo(cx - 4, y + 2); ctx.lineTo(cx, y - 4); ctx.lineTo(cx + 4, y + 2); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = '#81d4fa';
      ctx.beginPath(); ctx.moveTo(cx - 7, y + 2); ctx.lineTo(cx - 3, y - 6); ctx.lineTo(cx + 1, y + 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 1, y + 2); ctx.lineTo(cx + 3, y - 6); ctx.lineTo(cx + 7, y + 2); ctx.closePath(); ctx.fill();
    }
    // Bacak
    ctx.fillStyle = color;
    ctx.fillRect(x + 10, y + TILE - 4, 8, 4);
    ctx.fillRect(x + TILE - 18, y + TILE - 4, 8, 4);
  }

  // ─────────────────────────────────────────
  // DOM & girdi
  // ─────────────────────────────────────────
  function buildDOM() {
    while (container.firstChild) container.removeChild(container.firstChild);
    const wrap = document.createElement('div');
    wrap.className = 'ab-wrap';

    const info = document.createElement('div');
    info.className = 'ab-info';
    info.id = 'ab-info';
    wrap.appendChild(info);

    canvas = document.createElement('canvas');
    canvas.className = 'ab-canvas';
    canvas.width = GW; canvas.height = GH;
    ctx = canvas.getContext('2d');
    wrap.appendChild(canvas);

    // Mobil kontroller
    const controls = document.createElement('div');
    controls.className = 'ab-controls';
    const mk = (cls, txt, k) => {
      const b = document.createElement('button');
      b.className = 'ab-btn ' + cls;
      b.textContent = txt;
      const dn = e => { e.preventDefault(); keys[k] = true; };
      const up = e => { e.preventDefault(); keys[k] = false; };
      b.addEventListener('touchstart', dn, { passive: false });
      b.addEventListener('touchend', up);
      b.addEventListener('touchcancel', up);
      b.addEventListener('mousedown', dn);
      b.addEventListener('mouseup', up);
      b.addEventListener('mouseleave', up);
      return b;
    };
    controls.appendChild(mk('ab-btn-left', '\u25C0', 'ArrowLeft'));
    controls.appendChild(mk('ab-btn-jump', '\u25B2', ' '));
    controls.appendChild(mk('ab-btn-right', '\u25B6', 'ArrowRight'));
    wrap.appendChild(controls);

    container.appendChild(wrap);
  }

  function updateInfoBar() {
    const info = document.getElementById('ab-info');
    if (!info) return;
    const isFire = myRole === 'host';
    const me = isFire ? 'Ateş' : 'Buz';
    const op = isFire ? 'Buz' : 'Ateş';
    info.textContent =
      'Sen: ' + me + '  ·  ' + opName + ': ' + op +
      '  ·  ' + (currentLevelIdx + 1) + '/' + LEVELS.length + ' — ' + LEVELS[currentLevelIdx].name;
  }

  function onKeyDown(e) {
    if (['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)) {
      e.preventDefault();
      keys[e.key] = true;
    }
  }
  function onKeyUp(e) {
    if (['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)) {
      keys[e.key] = false;
    }
  }
  function addInputListeners() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  }
  function removeInputListeners() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  }

  // ─────────────────────────────────────────
  // Seviye geçiş
  // ─────────────────────────────────────────
  function advanceTo(newIdx) {
    if (newIdx === currentLevelIdx) return;
    if (completeTimeoutId) { clearTimeout(completeTimeoutId); completeTimeoutId = null; }
    if (newIdx >= LEVELS.length) return showAllDone();
    currentLevelIdx = newIdx;
    loadLevel(currentLevelIdx);
    gameActive = true;
    levelComplete = false;
    removeOverlay();
  }

  function showLevelComplete() {
    if (currentLevelIdx + 1 >= LEVELS.length) return showAllDone();
    const btnText = myRole === 'host' ? 'Sonraki Seviye' : 'Host bekleniyor...';
    showOverlay('Seviye ' + (currentLevelIdx + 1) + ' tamam!', btnText, () => {
      if (myRole !== 'host') return;
      // Tek otorite: lobby.level. Listener her iki tarafta da advanceTo'yu tetikler.
      if (lobbyLevelRef) lobbyLevelRef.set(currentLevelIdx + 2);
      else advanceTo(currentLevelIdx + 1);
    }, myRole !== 'host');
  }
  function showAllDone() {
    gameActive = false;
    showOverlay('Tebrikler! Tüm seviyeler tamam.', 'Ana Sayfaya Dön', () => {
      destroy();
      if (typeof App !== 'undefined' && App.showHub) App.showHub();
    });
  }

  function showOverlay(title, btnText, onClick, disabled) {
    removeOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'ab-overlay';
    overlay.id = 'ab-overlay';
    const card = document.createElement('div');
    card.className = 'ab-complete-card';
    const h = document.createElement('h2');
    h.textContent = title;
    card.appendChild(h);
    const btn = document.createElement('button');
    btn.className = 'ab-next-btn';
    btn.textContent = btnText;
    btn.disabled = !!disabled;
    if (disabled) btn.style.opacity = '0.6';
    btn.onclick = onClick;
    card.appendChild(btn);
    overlay.appendChild(card);
    container.appendChild(overlay);
  }
  function removeOverlay() {
    const ex = document.getElementById('ab-overlay');
    if (ex) ex.remove();
  }

  return { id, isMultiplayer, init, destroy };
})();
