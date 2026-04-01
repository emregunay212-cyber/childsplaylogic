/* ============================================
   LEGO World — 3D Açık Dünya (Three.js)
   Ok tuşlarıyla hareket, LEGO parça toplama, bina tamiri
   ============================================ */

const LegoWorld = (() => {
  const id = 'lego-world';

  const levels = [
    { worldSize: 20, buildings: 2, pieceCount: 18, capacity: 20 },
    { worldSize: 30, buildings: 3, pieceCount: 20, capacity: 25 },
    { worldSize: 40, buildings: 4, pieceCount: 30, capacity: 40 },
  ];

  // ── Bina Tanımları ──
  const BUILDING_DEFS = [
    { name: 'Okul', emoji: '🏫', color: 0xE74C3C, required: { red: 3, blue: 2 } },
    { name: 'Hastane', emoji: '🏥', color: 0xECF0F1, required: { white: 3, red: 2 } },
    { name: 'İtfaiye', emoji: '🚒', color: 0xC0392B, required: { red: 4, yellow: 2 } },
    { name: 'Kütüphane', emoji: '📚', color: 0x8D6E63, required: { brown: 3, orange: 3 } },
    { name: 'Park', emoji: '🎡', color: 0x27AE60, required: { green: 3, yellow: 2, blue: 1 } },
    { name: 'Köprü', emoji: '🌉', color: 0x7F8C8D, required: { gray: 4, black: 2 } },
  ];

  const PIECE_TYPES = {
    red:    { color: 0xE74C3C, label: 'Kırmızı', emoji: '🟥' },
    blue:   { color: 0x3498DB, label: 'Mavi', emoji: '🟦' },
    yellow: { color: 0xF1C40F, label: 'Sarı', emoji: '🟨' },
    green:  { color: 0x2ECC71, label: 'Yeşil', emoji: '🟩' },
    orange: { color: 0xFF9800, label: 'Turuncu', emoji: '🟠' },
    white:  { color: 0xFFFFFF, label: 'Beyaz', emoji: '⬜' },
    brown:  { color: 0x8D6E63, label: 'Kahverengi', emoji: '🟤' },
    gray:   { color: 0x95A5A6, label: 'Gri', emoji: '⬛' },
    black:  { color: 0x2C3E50, label: 'Siyah', emoji: '⚫' },
  };

  let container, callbacks, currentLevel;
  let scene, camera, renderer, clock;
  let player, playerGroup;
  let keys = {};
  let pieces3D = []; // { mesh, type, collected }
  let buildings3D = []; // { group, def, repaired, position }
  let trees3D = [];
  let inventory = {}; // { red: 0, blue: 0, ... }
  let buildingsRepaired = 0;
  let animFrameId = null;
  let overlayVisible = false;
  let hudEl = null;
  let mobileJoystick = null;
  let joystickDir = { x: 0, z: 0 };

  // ── INIT ──
  function init(gameArea, level, cbs) {
    container = gameArea;
    callbacks = cbs;
    currentLevel = levels[level - 1];
    buildingsRepaired = 0;
    inventory = {};
    overlayVisible = false;
    keys = {};
    pieces3D = [];
    buildings3D = [];
    trees3D = [];
    joystickDir = { x: 0, z: 0 };

    Object.keys(PIECE_TYPES).forEach(k => inventory[k] = 0);

    container.innerHTML = '';
    container.style.padding = '0';
    container.style.overflow = 'hidden';

    GameEngine.setTotal(currentLevel.buildings);

    setupThreeJS();
    buildWorld();
    createHUD();
    createMobileControls();
    setupControls();

    clock = new THREE.Clock();
    animate();
  }

  // ── THREE.JS SETUP ──
  function setupThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 30, 80);

    const w = container.clientWidth;
    const h = container.clientHeight;

    camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    camera.position.set(0, 14, 14);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Işıklar
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    scene.add(sun);

    window.addEventListener('resize', onResize);
  }

  function onResize() {
    if (!container || !camera || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  // ── DÜNYA İNŞA ──
  function buildWorld() {
    const ws = currentLevel.worldSize;

    // Zemin — çim
    const groundGeo = new THREE.PlaneGeometry(ws, ws);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x7EC850 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Çim çizgileri
    const lineGeo = new THREE.PlaneGeometry(ws, 0.05);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x6BBF3B });
    for (let i = -ws / 2; i <= ws / 2; i += 4) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.01, i);
      scene.add(line);
    }

    // Yol
    const roadGeo = new THREE.PlaneGeometry(3, ws);
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x95A5A6 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.02;
    scene.add(road);

    const road2 = new THREE.Mesh(new THREE.PlaneGeometry(ws, 3), roadMat);
    road2.rotation.x = -Math.PI / 2;
    road2.position.y = 0.02;
    scene.add(road2);

    // Oyuncu
    createPlayer();

    // Binalar
    createBuildings();

    // Ağaçlar
    createTrees();

    // LEGO parçaları
    spawnPieces();
  }

  // ── LEGO KARAKTER ──
  function createPlayer() {
    playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);

    // GLTF model yüklemeyi dene
    if (typeof THREE.GLTFLoader !== 'undefined') {
      const loader = new THREE.GLTFLoader();

      loader.load('assets/models/player.glb',
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(0.7, 0.7, 0.7);
          model.position.y = 0;

          // Mesh'lere LEGO renkleri uygula (texture yerine)
          const partColors = {
            'head': 0xFFD600,     // sarı kafa
            'body': 0xE74C3C,     // kırmızı gövde
            'arm': 0xFFD600,      // sarı kol
            'hand': 0xFFD600,     // sarı el
            'leg': 0x2980B9,      // mavi bacak
            'shoe': 0x2C3E50,     // koyu ayakkabı
            'hair': 0x8B4513,     // kahverengi saç
          };
          const defaultColor = 0xE74C3C;
          let meshIdx = 0;
          const colorOrder = [0x8B4513, 0xFFD600, 0xE74C3C, 0xE74C3C, 0xFFD600, 0xFFD600, 0x2980B9, 0x2980B9, 0x2C3E50, 0x2C3E50];

          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              // Adına göre renk ata, yoksa sırayla
              const name = (child.name || '').toLowerCase();
              let color = defaultColor;
              for (const [part, c] of Object.entries(partColors)) {
                if (name.includes(part)) { color = c; break; }
              }
              if (color === defaultColor && meshIdx < colorOrder.length) {
                color = colorOrder[meshIdx];
              }
              child.material = new THREE.MeshLambertMaterial({ color });
              meshIdx++;
            }
          });

          while (playerGroup.children.length > 0) playerGroup.remove(playerGroup.children[0]);
          playerGroup.add(model);
        },
        undefined,
        (err) => { console.warn('GLB yüklenemedi:', err); }
      );
    }

    // Başlangıçta fallback göster (GLTF yüklenene kadar)
    createFallbackPlayer();
  }

  function createFallbackPlayer() {
    // Mevcut prosedürel LEGO adam (fallback)
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2980B9 });
    const legGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.18, 0.25, 0);
    leftLeg.castShadow = true;
    playerGroup.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.18, 0.25, 0);
    rightLeg.castShadow = true;
    playerGroup.add(rightLeg);

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xE74C3C });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.4), bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    playerGroup.add(body);

    const armMat = new THREE.MeshLambertMaterial({ color: 0xFFD600 });
    const armGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.5, 0.75, 0);
    playerGroup.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.5, 0.75, 0);
    playerGroup.add(rightArm);

    const headMat = new THREE.MeshLambertMaterial({ color: 0xFFD600 });
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.45, 16), headMat);
    head.position.y = 1.35;
    head.castShadow = true;
    playerGroup.add(head);

    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), headMat);
    stud.position.y = 1.63;
    playerGroup.add(stud);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 1.38, 0.28);
    playerGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 1.38, 0.28);
    playerGroup.add(rightEye);
    player = playerGroup;
  }

  // ── BİNALAR ──
  function createBuildings() {
    const count = currentLevel.buildings;
    const ws = currentLevel.worldSize;
    const spacing = ws / (count + 1);

    for (let i = 0; i < count; i++) {
      const def = BUILDING_DEFS[i % BUILDING_DEFS.length];
      const bx = -ws / 2 + spacing * (i + 1) + (Math.random() - 0.5) * 4;
      const bz = -ws / 4 + (Math.random() - 0.5) * (ws / 3);

      const group = new THREE.Group();

      // Ana yapı (hasarlı — yarı saydam, çatlaklı görünüm)
      const bw = 2 + Math.random();
      const bh = 1.5 + Math.random() * 1.5;
      const bd = 2 + Math.random();

      const wallMat = new THREE.MeshLambertMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.5,
      });
      const wallGeo = new THREE.BoxGeometry(bw, bh, bd);
      const walls = new THREE.Mesh(wallGeo, wallMat);
      walls.position.y = bh / 2;
      walls.castShadow = true;
      walls.receiveShadow = true;
      group.add(walls);

      // Çatı
      const roofMat = new THREE.MeshLambertMaterial({ color: 0x8B4513, transparent: true, opacity: 0.5 });
      const roofGeo = new THREE.ConeGeometry(bw * 0.75, 1, 4);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = bh + 0.5;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);

      // "Tamir gerekli" işareti
      const signGeo = new THREE.PlaneGeometry(1.2, 0.5);
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(0, 0, 128, 48);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔧 TAMİR', 64, 32);
      const signTex = new THREE.CanvasTexture(canvas);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.y = bh + 1.8;
      sign.name = 'repair-sign';
      group.add(sign);

      group.position.set(bx, 0, bz);
      scene.add(group);

      buildings3D.push({
        group,
        def,
        repaired: false,
        position: { x: bx, z: bz },
        walls,
        roof,
        bw, bh, bd,
      });
    }
  }

  function repairBuilding(bIdx) {
    const b = buildings3D[bIdx];
    if (b.repaired) return;

    // Parçaları düş
    const required = b.def.required;
    for (const [type, count] of Object.entries(required)) {
      if ((inventory[type] || 0) < count) return; // yetersiz
    }
    for (const [type, count] of Object.entries(required)) {
      inventory[type] -= count;
    }

    b.repaired = true;
    buildingsRepaired++;

    // Görsel güncelleme — tam opak
    b.walls.material.opacity = 1;
    b.walls.material.transparent = false;
    b.roof.material.opacity = 1;
    b.roof.material.transparent = false;

    // İşareti kaldır
    const sign = b.group.getObjectByName('repair-sign');
    if (sign) b.group.remove(sign);

    // Kapı ekle
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.05), doorMat);
    door.position.set(0, 0.4, b.bd / 2 + 0.03);
    b.group.add(door);

    // Pencereler ekle
    const winMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB });
    [-0.6, 0.6].forEach(wx => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.05), winMat);
      win.position.set(wx, b.bh * 0.6, b.bd / 2 + 0.03);
      b.group.add(win);
    });

    updateHUD();
    AudioManager.play('success');

    const rect = container.getBoundingClientRect();
    Particles.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 3, 10);

    callbacks.onCorrect();

    if (buildingsRepaired >= currentLevel.buildings) {
      setTimeout(() => {
        Particles.celebrate();
        const stars = calcStars();
        callbacks.onComplete(stars);
      }, 1000);
    }
  }

  // ── AĞAÇLAR ──
  function createTrees() {
    const ws = currentLevel.worldSize;
    const count = Math.floor(ws * 1.5);

    for (let i = 0; i < count; i++) {
      const tx = (Math.random() - 0.5) * (ws - 4);
      const tz = (Math.random() - 0.5) * (ws - 4);

      // Yoldan uzak tut
      if (Math.abs(tx) < 2.5 && Math.abs(tz) < ws / 2) continue;
      if (Math.abs(tz) < 2.5 && Math.abs(tx) < ws / 2) continue;

      // Binalardan uzak tut
      const tooClose = buildings3D.some(b =>
        Math.abs(tx - b.position.x) < 4 && Math.abs(tz - b.position.z) < 4
      );
      if (tooClose) continue;

      const treeGroup = new THREE.Group();
      const trunkH = 0.6 + Math.random() * 0.4;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, trunkH, 6),
        new THREE.MeshLambertMaterial({ color: 0x8D6E63 })
      );
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      const leafH = 1 + Math.random() * 0.5;
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.6 + Math.random() * 0.3, leafH, 6),
        new THREE.MeshLambertMaterial({ color: 0x27AE60 + Math.floor(Math.random() * 0x002000) })
      );
      leaf.position.y = trunkH + leafH / 2 - 0.1;
      leaf.castShadow = true;
      treeGroup.add(leaf);

      treeGroup.position.set(tx, 0, tz);
      scene.add(treeGroup);
      trees3D.push(treeGroup);
    }
  }

  // ── LEGO PARÇALARI ──
  function spawnPieces() {
    const ws = currentLevel.worldSize;
    const count = currentLevel.pieceCount;
    const typeKeys = Object.keys(PIECE_TYPES);

    // Binalara göre gerekli parçaları hesapla
    const needed = {};
    buildings3D.forEach(b => {
      if (b.repaired) return;
      for (const [t, c] of Object.entries(b.def.required)) {
        needed[t] = (needed[t] || 0) + c;
      }
    });

    // Pool: önce her gerekli tipin TAM SAYISINI ekle, sonra ekstra
    const pool = [];
    for (const [t, c] of Object.entries(needed)) {
      for (let i = 0; i < c + 1; i++) pool.push(t); // ihtiyaç + 1 fazladan
    }
    while (pool.length < count) {
      pool.push(typeKeys[Math.floor(Math.random() * typeKeys.length)]);
    }
    // Karıştır
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    function getValidPos() {
      for (let a = 0; a < 50; a++) {
        const px = (Math.random() - 0.5) * (ws - 4);
        const pz = (Math.random() - 0.5) * (ws - 4);
        if (Math.abs(px) < 2 && Math.abs(pz) < 2) continue;
        return { px, pz };
      }
      return { px: 3 + Math.random() * 4, pz: 3 + Math.random() * 4 };
    }

    for (let i = 0; i < pool.length; i++) {
      const type = pool[i];
      const { px, pz } = getValidPos();

      const pieceGroup = new THREE.Group();

      // LEGO blok
      const color = PIECE_TYPES[type].color;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.3, 0.5),
        new THREE.MeshLambertMaterial({ color })
      );
      block.position.y = 0.15;
      block.castShadow = true;
      pieceGroup.add(block);

      // Beyaz/açık renk bloklar için siyah kenar çizgisi
      if (type === 'white' || type === 'gray') {
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(block.geometry),
          new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 })
        );
        edges.position.copy(block.position);
        pieceGroup.add(edges);
      }

      // LEGO stud
      const stud = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8),
        new THREE.MeshLambertMaterial({ color })
      );
      stud.position.y = 0.35;
      pieceGroup.add(stud);

      // Parlama efekti
      const glow = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.5, 16),
        new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.02;
      pieceGroup.add(glow);

      pieceGroup.position.set(px, 0, pz);
      scene.add(pieceGroup);

      pieces3D.push({ group: pieceGroup, type, collected: false, x: px, z: pz });
    }
  }

  // ── KONTROLLER ──
  function setupControls() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Fare ile tıklama (bina etkileşimi)
    renderer.domElement.addEventListener('click', onCanvasClick);
  }

  function onKeyDown(e) {
    keys[e.key] = true;
    if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
      tryInteract();
    }
  }
  function onKeyUp(e) { keys[e.key] = false; }

  function onCanvasClick(e) {
    tryInteract();
  }

  function tryInteract() {
    if (overlayVisible) return;

    // En yakın binayı kontrol et
    const px = player.position.x;
    const pz = player.position.z;

    for (let i = 0; i < buildings3D.length; i++) {
      const b = buildings3D[i];
      if (b.repaired) continue;
      const dist = Math.sqrt(
        Math.pow(px - b.position.x, 2) + Math.pow(pz - b.position.z, 2)
      );
      if (dist < 4) {
        showRepairUI(i);
        return;
      }
    }
  }

  // ── MOBİL KONTROLLER ──
  function createMobileControls() {
    if (!('ontouchstart' in window)) return;

    const joy = document.createElement('div');
    joy.className = 'lw-joystick';
    joy.innerHTML = `
      <button class="lw-joy-btn" data-dir="up">▲</button>
      <div class="lw-joy-mid">
        <button class="lw-joy-btn" data-dir="left">◄</button>
        <button class="lw-joy-btn lw-joy-action" data-dir="action">🔧</button>
        <button class="lw-joy-btn" data-dir="right">►</button>
      </div>
      <button class="lw-joy-btn" data-dir="down">▼</button>
    `;
    container.appendChild(joy);
    mobileJoystick = joy;

    joy.querySelectorAll('.lw-joy-btn').forEach(btn => {
      const dir = btn.dataset.dir;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (dir === 'action') { tryInteract(); return; }
        joystickDir = {
          x: dir === 'left' ? -1 : dir === 'right' ? 1 : 0,
          z: dir === 'up' ? -1 : dir === 'down' ? 1 : 0,
        };
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (dir !== 'action') joystickDir = { x: 0, z: 0 };
      });
    });
  }

  // ── HUD ──
  function createHUD() {
    hudEl = document.createElement('div');
    hudEl.className = 'lw-hud';
    updateHUD();
    container.appendChild(hudEl);
  }

  function updateHUD() {
    if (!hudEl) return;
    const totalPieces = Object.values(inventory).reduce((a, b) => a + b, 0);
    const piecesHTML = Object.entries(inventory)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `<span class="lw-hud-piece">${PIECE_TYPES[k].emoji}${v}</span>`)
      .join('');

    hudEl.innerHTML = `
      <div class="lw-hud-left">
        <div class="lw-hud-bag" id="lw-bag-btn">🎒 ${totalPieces}/${currentLevel.capacity}</div>
        ${piecesHTML ? `<div class="lw-hud-pieces">${piecesHTML}</div>` : ''}
      </div>
      <div class="lw-hud-right">
        <div class="lw-hud-buildings">🏗️ ${buildingsRepaired}/${currentLevel.buildings}</div>
      </div>
      <div class="lw-hud-hint" id="lw-hint"></div>
    `;
  }

  function showHint(text) {
    const hint = container.querySelector('#lw-hint');
    if (hint) {
      hint.textContent = text;
      hint.classList.add('lw-hint-show');
      setTimeout(() => hint.classList.remove('lw-hint-show'), 2500);
    }
  }

  // ── TAMİR UI ──
  function showRepairUI(bIdx) {
    const b = buildings3D[bIdx];
    overlayVisible = true;

    const overlay = document.createElement('div');
    overlay.className = 'lw-overlay';

    let reqHTML = '';
    let canRepair = true;
    for (const [type, count] of Object.entries(b.def.required)) {
      const have = inventory[type] || 0;
      const ok = have >= count;
      if (!ok) canRepair = false;
      reqHTML += `<div class="lw-req-row ${ok ? 'lw-req-ok' : 'lw-req-need'}">
        ${PIECE_TYPES[type].emoji} ${PIECE_TYPES[type].label}: ${have}/${count} ${ok ? '✅' : '❌'}
      </div>`;
    }

    overlay.innerHTML = `
      <div class="lw-repair-card">
        <h2>🔧 ${b.def.name} Tamiri ${b.def.emoji}</h2>
        <div class="lw-req-list">${reqHTML}</div>
        <div class="lw-repair-btns">
          <button class="lw-btn lw-btn-repair" ${canRepair ? '' : 'disabled'}>${canRepair ? '🔨 Tamir Et!' : '❌ Parça Eksik'}</button>
          <button class="lw-btn lw-btn-close">← Geri</button>
        </div>
      </div>
    `;

    container.appendChild(overlay);

    overlay.querySelector('.lw-btn-repair').onclick = () => {
      if (!canRepair) return;
      overlay.remove();
      overlayVisible = false;
      repairBuilding(bIdx);
    };

    overlay.querySelector('.lw-btn-close').onclick = () => {
      overlay.remove();
      overlayVisible = false;
    };
  }

  // ── ANİMASYON DÖNGÜSÜ ──
  function animate() {
    animFrameId = requestAnimationFrame(animate);
    if (overlayVisible) { renderer.render(scene, camera); return; }

    const delta = clock.getDelta();
    const speed = 8 * delta;

    // Karakter hareketi
    let dx = 0, dz = 0;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dz -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dz += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    // Mobil joystick
    if (joystickDir.x || joystickDir.z) {
      dx = joystickDir.x;
      dz = joystickDir.z;
    }

    if (dx || dz) {
      const len = Math.sqrt(dx * dx + dz * dz);
      dx /= len; dz /= len;

      const newX = player.position.x + dx * speed;
      const newZ = player.position.z + dz * speed;
      const ws = currentLevel.worldSize;

      // Sınır kontrolü
      if (Math.abs(newX) < ws / 2 - 1) player.position.x = newX;
      if (Math.abs(newZ) < ws / 2 - 1) player.position.z = newZ;

      // Yön (yumuşak dönüş)
      const targetRot = Math.atan2(dx, dz);
      let diff = targetRot - player.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.rotation.y += diff * 10 * delta;

      // Yürüme animasyonu (bounce + sallama)
      const t = clock.elapsedTime;
      player.position.y = Math.abs(Math.sin(t * 10)) * 0.08;
      player.rotation.z = Math.sin(t * 8) * 0.06;
    } else {
      // Duruyorken düz dur
      player.position.y *= 0.9;
      player.rotation.z *= 0.9;
    }

    // Kamera takibi (yumuşak lerp)
    const camLerp = 4 * delta;
    camera.position.x += (player.position.x - camera.position.x) * camLerp;
    camera.position.z += (player.position.z + 14 - camera.position.z) * camLerp;
    camera.lookAt(player.position.x, 1, player.position.z);

    // Parça toplama kontrolü
    checkPieceCollection();

    // Parça animasyonu (zıplama + dönme)
    pieces3D.forEach(p => {
      if (p.collected) return;
      const t = clock.elapsedTime;
      p.group.position.y = Math.sin(t * 3 + p.x) * 0.15;
      p.group.rotation.y += delta * 1.5;
    });

    // Bina işareti animasyonu
    buildings3D.forEach(b => {
      if (b.repaired) return;
      const sign = b.group.getObjectByName('repair-sign');
      if (sign) {
        sign.position.y = b.bh + 1.8 + Math.sin(clock.elapsedTime * 2) * 0.1;
        sign.lookAt(camera.position);
      }
    });

    // Yakındaki bina ipucu
    const nearBuilding = buildings3D.find(b => {
      if (b.repaired) return false;
      const dist = Math.sqrt(
        Math.pow(player.position.x - b.position.x, 2) +
        Math.pow(player.position.z - b.position.z, 2)
      );
      return dist < 4;
    });
    const hintEl = container.querySelector('#lw-hint');
    if (hintEl) {
      if (nearBuilding) {
        hintEl.textContent = `E tuşu → ${nearBuilding.def.name} tamir et`;
        hintEl.classList.add('lw-hint-show');
      } else {
        hintEl.classList.remove('lw-hint-show');
      }
    }

    renderer.render(scene, camera);
  }

  function checkPieceCollection() {
    const px = player.position.x;
    const pz = player.position.z;
    const totalPieces = Object.values(inventory).reduce((a, b) => a + b, 0);

    pieces3D.forEach(p => {
      if (p.collected) return;
      const dist = Math.sqrt(Math.pow(px - p.x, 2) + Math.pow(pz - p.z, 2));
      if (dist < 1.2) {
        if (totalPieces >= currentLevel.capacity) {
          showHint('🎒 Çanta dolu!');
          return;
        }
        p.collected = true;
        scene.remove(p.group);
        inventory[p.type] = (inventory[p.type] || 0) + 1;
        updateHUD();
        AudioManager.play('success');

        const rect = container.getBoundingClientRect();
        Particles.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 4);
      }
    });
  }

  function calcStars() {
    const totalCollected = Object.values(inventory).reduce((a, b) => a + b, 0);
    const totalPossible = currentLevel.pieceCount;
    const efficiency = (totalPossible - totalCollected) / totalPossible;
    // Daha az parça toplamak = daha verimli
    if (efficiency > 0.4) return 3;
    if (efficiency > 0.2) return 2;
    return 1;
  }

  // ── TEMİZLİK ──
  function destroy() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);

    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }

    if (scene) {
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }

    scene = null; camera = null; renderer = null;
    player = null; playerGroup = null;
    pieces3D = []; buildings3D = []; trees3D = [];

    if (hudEl) { hudEl.remove(); hudEl = null; }
    if (mobileJoystick) { mobileJoystick.remove(); mobileJoystick = null; }

    if (container) {
      container.innerHTML = '';
      container.style.padding = '';
      container.style.overflow = '';
    }
  }

  return { id, levels, init, destroy };
})();
