/* ============================================
   ALTIN AVI — 2-30 Kişilik Toplu Quiz Yarışı
   Blooket / Crypto Hack tarzı: herkes KENDİ HIZINDA
   soru çözer. Doğru cevap → 3 gizemli kasadan birini
   seç (altın / x2 / rakipten çalma). Süre dolunca en
   çok altını olan kazanır.

   Senkron tur YOK: her oyuncu yalnız kendi verisini
   yazar → bir oyuncunun kopması/donması diğerlerini
   asla bekletmez (eski faz-makinesi donmalarının kökü
   buydu). Tek paylaşılan geçiş: state PLAYING→FINISHED
   (transaction, herhangi bir istemci tetikleyebilir).

   Sorular: Bilişim Teknolojileri (BT)
   Mimari: kendi /rooms/altin-avi/{code} Firebase path'i
   ============================================ */

const AltinAvi = (() => {
  const id = 'altin-avi';
  const isMultiplayer = true;

  const MAX_PLAYERS = 30;
  const GAME_DURATION_DEFAULT_MS = 5 * 60000;
  const WRONG_SPLASH_MS = 2500;   // yanlış ekranı: doğru cevabı okuma süresi
  const CORRECT_SPLASH_MS = 900;  // doğru ekranı: kısa kutlama, sonra kasalar
  const STEAL_RATE = 0.20;        // ÇAL kasası: hedef altınının %20'si
  const GOLD_CAP = 999999;
  const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVYZ';

  // Kasa ödül havuzu (ağırlıklı çekiliş — Blooket Crypto Hack dağılımına yakın)
  const CHEST_POOL = [
    { type: 'gold', amount: 10, w: 25 },
    { type: 'gold', amount: 25, w: 30 },
    { type: 'gold', amount: 50, w: 20 },
    { type: 'gold', amount: 75, w: 10 },
    { type: 'double', w: 5 },
    { type: 'steal', w: 10 },
  ];

  // ── Host ayar seçimleri (createRoom öncesi doldurulur) ──
  let pendingSettings = {
    maxPlayers: 30,
    durationMin: 5,
  };

  // ── State ──
  let container = null;
  let myId = null;
  let myName = '';
  let myRoomCode = null;
  let roomRef = null;
  let roomListener = null;
  let isHost = false;
  let roomData = null;
  let lastRenderedPhase = null;
  let timerRafId = null;
  let coalesceRaf = null;
  let pendingCoalesced = null;
  let lastKnownMe = null;       // son sağlam oyuncu node'um (kopma sonrası self-heal için)
  let healInFlight = false;
  let connectedRef = null;      // .info/connected presence dinleyicisi (onDisconnect re-arm)
  let connectedListener = null;

  // Kendi-hızında oyun durumu (tamamen yerel — oda event'leri buna dokunmaz)
  let myOrder = [];             // soru indekslerinin bana özel karışık sırası
  let myPos = 0;
  let myAnswered = 0;
  let myCorrect = 0;
  let prevMyGold = 0;           // düşüş tespiti → "çalındı!" bildirimi
  let stageLocked = false;      // çift tıklama koruması (cevap/kasa)
  let lastFinishTry = 0;

  // 30 kişilik odada her oyuncunun yazımı herkeste bir 'value' event tetikler. O(N) maliyetli
  // yeniden-çizimleri (lobi ızgarası / liderlik tablosu) kare başına TEK çizime indir.
  function scheduleCoalesced(fn) {
    pendingCoalesced = fn;
    if (coalesceRaf) return;
    coalesceRaf = requestAnimationFrame(() => {
      coalesceRaf = null;
      const f = pendingCoalesced; pendingCoalesced = null;
      if (f) f();
    });
  }

  // ── DOM helper (XSS-güvenli, sadece textContent kullanır) ──
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
      for (const key in props) {
        if (key === 'class') el.className = props[key];
        else if (key === 'style' && typeof props[key] === 'object') {
          Object.assign(el.style, props[key]);
        }
        else if (key === 'text') el.textContent = props[key];
        else if (key.startsWith('on') && typeof props[key] === 'function') {
          el.addEventListener(key.substring(2).toLowerCase(), props[key]);
        }
        else if (key === 'data' && typeof props[key] === 'object') {
          for (const dk in props[key]) el.dataset[dk] = props[key][dk];
        }
        else if (props[key] !== null && props[key] !== undefined && props[key] !== false) {
          el.setAttribute(key, props[key]);
        }
      }
    }
    for (const c of children) {
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) { c.forEach(cc => cc && el.appendChild(cc)); }
      else if (typeof c === 'string' || typeof c === 'number') {
        el.appendChild(document.createTextNode(String(c)));
      } else {
        el.appendChild(c);
      }
    }
    return el;
  }

  // ── Lifecycle ──
  function init(gameArea, data) {
    container = gameArea;
    myId = generatePlayerId();
    myName = (localStorage.getItem('mp_name') || '').trim();
    myRoomCode = null;
    isHost = false;
    roomData = null;
    lastRenderedPhase = null;
    lastKnownMe = null;
    healInFlight = false;
    resetMyGameState();
    renderEntryMenu();
  }

  function destroy() { cleanup(); }

  function cleanup() {
    if (connectedRef && connectedListener) {
      try { connectedRef.off('value', connectedListener); } catch (e) {}
    }
    connectedRef = null;
    connectedListener = null;
    lastKnownMe = null;
    healInFlight = false;
    if (roomListener && roomRef) {
      try { roomRef.off('value', roomListener); } catch (e) {}
    }
    if (timerRafId) { cancelAnimationFrame(timerRafId); timerRafId = null; }
    if (coalesceRaf) { cancelAnimationFrame(coalesceRaf); coalesceRaf = null; }
    pendingCoalesced = null;
    if (myRoomCode && myId) {
      try { db.ref('rooms/altin-avi/' + myRoomCode + '/players/' + myId).remove(); } catch (e) {}
    }
    myRoomCode = null;
    isHost = false;
    roomData = null;
    roomRef = null;
    roomListener = null;
    resetMyGameState();
  }

  function resetMyGameState() {
    myOrder = [];
    myPos = 0;
    myAnswered = 0;
    myCorrect = 0;
    prevMyGold = 0;
    stageLocked = false;
    lastFinishTry = 0;
  }

  // ── Helpers ──
  function generatePlayerId() {
    return 'P' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }
  function genCode() {
    let s = '';
    for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }
  function makePlayer(name) {
    return {
      id: myId,
      name: (name || 'Oyuncu').slice(0, 16),
      gold: 0,
      answered: 0,
      correct: 0,
      online: true,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    };
  }
  function playerRef(pid) {
    return db.ref('rooms/altin-avi/' + myRoomCode + '/players/' + pid);
  }
  function pickShuffledQuestions() {
    const all = (window.ALTIN_AVI_QUESTIONS || []).slice();
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.map(q => ({ q: q.q, options: q.options.slice(), correctIdx: q.correctIdx }));
  }
  function shuffleIndices(n) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function playersArray() {
    if (!roomData || !roomData.players) return [];
    return Object.values(roomData.players);
  }
  function clearContainer() {
    while (container.firstChild) container.removeChild(container.firstChild);
  }
  function clearEl(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }
  function toast(msg, ms) {
    const el = h('div', { class: 'aa-toast', text: msg });
    container.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, ms || 2500);
  }
  function sfx(name) {
    if (typeof AudioManager !== 'undefined' && AudioManager.play) {
      try { AudioManager.play(name); } catch (e) {}
    }
  }
  function leaveAndExit() {
    cleanup();
    if (typeof App !== 'undefined' && App.showHub) App.showHub();
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtClock(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
  }

  // Host: oyunu erken bitir → state FINISHED → herkeste podyum gösterilir.
  async function endGameEarly() {
    if (!isHost || !roomRef) return;
    if (!confirm('Oyunu şimdi bitirmek istediğine emin misin? Sıralama hemen gösterilecek.')) return;
    try {
      await roomRef.update({ state: 'FINISHED' });
    } catch (e) {
      console.error('endGameEarly error', e);
      toast('Bitirilemedi.');
    }
  }

  // Oyun içi üst bar sağ aksiyonları: host'a "BİTİR" + herkese "ayrıl" (🚪).
  function topBarEndButtons() {
    const children = [];
    if (isHost) {
      children.push(h('button', {
        class: 'aa-end-btn',
        title: 'Oyunu bitir ve sıralamayı göster',
        onClick: endGameEarly
      }, '⏹ BİTİR'));
    }
    children.push(h('button', {
      class: 'aa-leave-btn',
      onClick: () => { if (confirm('Oyundan ayrılmak istediğine emin misin?')) leaveAndExit(); }
    }, '🚪'));
    return h('div', { class: 'aa-top-actions' }, ...children);
  }

  // ── AYAR SEÇİCİ ──
  function renderSettingRow(label, options, getValue, onSelect) {
    const row = h('div', { class: 'aa-setting-row' },
      h('span', { class: 'aa-setting-label', text: label })
    );
    const btnGroup = h('div', { class: 'aa-setting-options' });
    options.forEach(opt => {
      const btn = h('button', {
        class: 'aa-btn aa-setting-btn' + (getValue() === opt.value ? ' aa-setting-btn-active' : ''),
        onClick: () => {
          onSelect(opt.value);
          btnGroup.querySelectorAll('.aa-setting-btn').forEach(b => b.classList.remove('aa-setting-btn-active'));
          btn.classList.add('aa-setting-btn-active');
        }
      }, opt.label);
      btnGroup.appendChild(btn);
    });
    row.appendChild(btnGroup);
    return row;
  }

  function renderRoomSettings() {
    lastRenderedPhase = 'SETTINGS';
    clearContainer();

    const card = h('div', { class: 'aa-entry-card' },
      h('div', { class: 'aa-entry-header' },
        h('div', { class: 'aa-coin-big', text: '$' }),
        h('h2', { class: 'aa-entry-title', text: 'ODA AYARLARI' })
      ),
      h('div', { class: 'aa-settings-form' },
        renderSettingRow(
          'MAKS OYUNCU',
          [2,5,10,15,20,30].map(v => ({ value: v, label: String(v) })),
          () => pendingSettings.maxPlayers,
          v => { pendingSettings.maxPlayers = v; }
        ),
        renderSettingRow(
          'OYUN SÜRESİ',
          [3,5,7,10].map(v => ({ value: v, label: v + ' dk' })),
          () => pendingSettings.durationMin,
          v => { pendingSettings.durationMin = v; }
        )
      ),
      h('div', { class: 'aa-entry-buttons' },
        h('button', {
          class: 'aa-btn aa-btn-primary',
          onClick: createRoom
        }, '◆ ODA KUR'),
        h('button', { class: 'aa-back-btn', onClick: renderEntryMenu }, '◂◂ GERİ')
      )
    );

    container.appendChild(h('div', { class: 'aa-entry' }, card));
  }

  // ── ENTRY MENU ──
  function renderEntryMenu() {
    lastRenderedPhase = 'ENTRY';
    clearContainer();

    const nameInput = h('input', {
      id: 'aa-name-input', type: 'text', maxlength: '16', placeholder: 'Adını yaz...'
    });
    nameInput.value = myName;
    nameInput.addEventListener('input', () => { myName = nameInput.value.trim(); });

    const ensureName = () => {
      const n = nameInput.value.trim();
      if (!n) { toast('Önce adını yaz!'); nameInput.focus(); return null; }
      myName = n;
      localStorage.setItem('mp_name', n);
      return n;
    };

    const card = h('div', { class: 'aa-entry-card' },
      h('div', { class: 'aa-entry-header' },
        h('div', { class: 'aa-coin-big', text: '$' }),
        h('h2', { class: 'aa-entry-title', text: 'ALTIN AVI' }),
        h('p', { class: 'aa-entry-sub', text: '2-30 OYUNCU · KENDİ HIZINDA YARIŞ' })
      ),
      h('div', { class: 'aa-entry-name' },
        h('label', { for: 'aa-name-input', text: 'MACERACI ADI:' }),
        nameInput
      ),
      h('div', { class: 'aa-entry-buttons' },
        h('button', {
          class: 'aa-btn aa-btn-primary',
          onClick: () => { if (ensureName()) renderRoomSettings(); }
        }, '◆ ODA AÇ'),
        h('button', {
          class: 'aa-btn aa-btn-secondary',
          onClick: () => { if (ensureName()) renderJoinCode(); }
        }, '▸ KODLA KATIL'),
        h('button', {
          class: 'aa-btn aa-btn-tertiary',
          onClick: () => { if (ensureName()) quickPlay(); }
        }, '⚡ HIZLI EŞLEŞTİR')
      ),
      h('button', { class: 'aa-back-btn', onClick: leaveAndExit }, '◂◂ GERİ')
    );

    container.appendChild(h('div', { class: 'aa-entry' }, card));
  }

  function renderJoinCode() {
    lastRenderedPhase = 'JOIN';
    clearContainer();

    // Canlı value yeniden yazımı YAPMA: input olayında .value'yu değiştirmek
    // mobil/Türkçe klavyelerin IME birleştirmesini bozup harf düşürüyordu
    // (bazen hiç yazılamıyordu). Büyük harf gösterimi CSS text-transform ile,
    // filtre/normalize KATIL'da yapılıyor. maxlength=5 uzunluğu doğal sınırlar.
    const codeInput = h('input', {
      id: 'aa-code-input', class: 'aa-code-input', maxlength: '5',
      placeholder: 'ABCDE', autocomplete: 'off',
      autocapitalize: 'characters', autocorrect: 'off', spellcheck: 'false'
    });

    const card = h('div', { class: 'aa-entry-card' },
      h('h2', { class: 'aa-entry-title', text: 'KOD GİR' }),
      h('p', { class: 'aa-entry-sub', text: '5 KARAKTERLİ ODA KODU' }),
      h('div', { class: 'aa-code-input-wrap' }, codeInput),
      h('div', { class: 'aa-entry-buttons' },
        h('button', {
          class: 'aa-btn aa-btn-primary',
          onClick: async () => {
            const code = codeInput.value.toUpperCase()
              .split('').filter(c => CODE_CHARS.includes(c)).join('');
            if (code.length !== 5) { toast('5 KARAKTER GİR!'); return; }
            await joinRoom(code);
          }
        }, '▸ KATIL')
      ),
      h('button', { class: 'aa-back-btn', onClick: renderEntryMenu }, '◂◂ GERİ')
    );

    container.appendChild(h('div', { class: 'aa-entry' }, card));
    setTimeout(() => codeInput.focus(), 50);
  }

  // ── ROOM OPERATIONS ──
  async function createRoom() {
    showLoading('Oda oluşturuluyor...');
    try {
      let code, exists = true, attempts = 0;
      while (exists && attempts < 5) {
        code = genCode();
        const snap = await db.ref('rooms/altin-avi/' + code).once('value');
        exists = snap.exists();
        attempts++;
      }
      if (exists) { toast('Oda kodu üretilemedi, tekrar dene.'); renderEntryMenu(); return; }

      const questions = pickShuffledQuestions();
      if (questions.length < 4) {
        toast('Soru bankası eksik!'); renderEntryMenu(); return;
      }

      const initialData = {
        code,
        state: 'WAITING',
        hostId: myId,
        maxPlayers: pendingSettings.maxPlayers,
        durationMs: pendingSettings.durationMin * 60000,
        endsAt: null,
        questions,
        players: { [myId]: makePlayer(myName) },
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      await db.ref('rooms/altin-avi/' + code).set(initialData);

      myRoomCode = code;
      isHost = true;
      attachOnDisconnect();
      listenToRoom(code);
    } catch (e) {
      console.error('[AltinAvi] createRoom error', e);
      toast('Oda oluşturulamadı: ' + (e.message || 'bağlantı hatası'));
      renderEntryMenu();
    }
  }

  async function joinRoom(code) {
    showLoading('Odaya katılınıyor...');
    try {
      const snap = await db.ref('rooms/altin-avi/' + code).once('value');
      const room = snap.val();
      if (!room) { toast('Oda bulunamadı!'); renderEntryMenu(); return; }
      if (room.state !== 'WAITING') { toast('Oyun çoktan başladı!'); renderEntryMenu(); return; }
      const pcount = room.players ? Object.keys(room.players).length : 0;
      if (pcount >= (room.maxPlayers ?? MAX_PLAYERS)) { toast('Oda dolu!'); renderEntryMenu(); return; }

      await db.ref('rooms/altin-avi/' + code + '/players/' + myId).set(makePlayer(myName));
      myRoomCode = code;
      isHost = false;
      attachOnDisconnect();
      listenToRoom(code);
    } catch (e) {
      console.error('[AltinAvi] joinRoom error', e);
      toast('Katılım hatası: ' + (e.message || 'bağlantı hatası'));
      renderEntryMenu();
    }
  }

  async function quickPlay() {
    showLoading('Açık oda aranıyor...');
    try {
      const snap = await db.ref('rooms/altin-avi').orderByChild('state').equalTo('WAITING').once('value');
      let targetCode = null;
      snap.forEach(child => {
        const r = child.val();
        const pcount = r && r.players ? Object.keys(r.players).length : 0;
        if (!targetCode && pcount < (r.maxPlayers ?? MAX_PLAYERS)) targetCode = r.code;
      });
      if (targetCode) await joinRoom(targetCode);
      else await createRoom();
    } catch (e) {
      console.error('[AltinAvi] quickPlay error', e);
      await createRoom();
    }
  }

  // onDisconnect TEK SEFERLİKTİR: sunucu ilk kopuşta çalıştırır ve handler silinir.
  // Mobilde kısa kopma (ekran kilidi, wifi→4G) node'umuzu siler; tek-sefer kurulum
  // reconnect sonrası yenilenmez. Her bağlantıda yeniden kur (multiplayer.js deseni).
  function attachOnDisconnect() {
    if (!myRoomCode || !myId) return;
    if (connectedRef && connectedListener) {
      try { connectedRef.off('value', connectedListener); } catch (e) {}
    }
    connectedRef = db.ref('.info/connected');
    connectedListener = connectedRef.on('value', (snap) => {
      if (snap.val() !== true || !myRoomCode || !myId) return;
      try {
        db.ref('rooms/altin-avi/' + myRoomCode + '/players/' + myId).onDisconnect().remove();
      } catch (e) { console.warn('onDisconnect attach failed', e); }
    });
  }

  function listenToRoom(code) {
    roomRef = db.ref('rooms/altin-avi/' + code);
    roomListener = roomRef.on('value', (snap) => {
      const data = snap.val();
      if (!data) {
        toast('Oda kapatıldı.');
        cleanup();
        if (typeof App !== 'undefined' && App.showHub) setTimeout(() => App.showHub(), 1200);
        return;
      }
      roomData = data;
      handleRoomUpdate();
    });
  }

  function handleRoomUpdate() {
    if (!roomData) return;
    const players = roomData.players || {};

    // Self-heal: kısa kopmada onDisconnect node'umu sildiyse (ya da kendi yazımlarım
    // isimsiz kısmi bir node bıraktıysa) son sağlam kopyayı geri yaz — oyuncu oyundan
    // düşmesin. Transaction ile: sağlam node'un üzerine asla yazmaz (yarış güvenli).
    const meNode = players[myId];
    if (meNode && meNode.name) {
      lastKnownMe = meNode;
      healInFlight = false;
    } else if (lastKnownMe && roomData.state !== 'FINISHED' && !healInFlight && myRoomCode) {
      healInFlight = true;
      const restored = lastKnownMe;
      playerRef(myId)
        .transaction(cur => {
          if (cur && cur.name) return; // bu arada sağlam geldi — dokunma
          // kısmi node'daki taze alanlar (gold/answered) restored'ı ezsin
          return Object.assign({}, restored, cur || {});
        })
        .catch(() => {})
        .then(() => { healInFlight = false; });
    }

    // Host migration
    if (!players[roomData.hostId]) {
      const arr = Object.values(players).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      if (arr.length > 0 && arr[0].id === myId) {
        db.ref('rooms/altin-avi/' + myRoomCode + '/hostId').transaction((cur) => {
          if (!players[cur] || cur === roomData.hostId) return myId;
          return;
        }).catch(() => {});
      }
    }
    isHost = (roomData.hostId === myId);

    if (Object.keys(players).length === 0 && !healInFlight) {
      if (roomRef) roomRef.remove().catch(() => {});
      return;
    }

    const state = roomData.state;
    if (state !== lastRenderedPhase) {
      lastRenderedPhase = state;
      if (state === 'WAITING') renderWaitingRoom();
      else if (state === 'PLAYING') startMyGame();
      else if (state === 'FINISHED') renderFinalScreen();
    } else {
      // Aynı ekran içinde sadece hafif HUD güncellemeleri (kare başına tek çizim)
      if (state === 'WAITING') scheduleCoalesced(updateWaitingPlayers);
      else if (state === 'PLAYING') scheduleCoalesced(updateGameHud);
    }
  }

  // ── WAITING ROOM ──
  function renderWaitingRoom() {
    clearContainer();
    const card = h('div', { class: 'aa-waiting-card' },
      h('h2', { class: 'aa-waiting-title', text: 'LOBBY' }),
      h('div', { class: 'aa-code-box' },
        h('span', { class: 'aa-code-label', text: 'ODA KODU' }),
        h('span', { class: 'aa-code-value', id: 'aa-code-value', text: myRoomCode || '?????' })
      ),
      h('div', { class: 'aa-players-header' },
        h('span', {},
          'OYUNCU ',
          h('span', { id: 'aa-pcount', text: '0' }),
          h('span', { id: 'aa-maxplayers-display', text: ' / ' + (roomData?.maxPlayers ?? MAX_PLAYERS) })
        ),
        h('span', { class: 'aa-room-settings-info', id: 'aa-room-settings-info' })
      ),
      h('div', { class: 'aa-players-grid', id: 'aa-players-grid' }),
      h('div', { class: 'aa-waiting-actions' },
        h('button', { class: 'aa-btn aa-btn-primary', id: 'aa-start-btn', onClick: startGame }, '▶ BAŞLAT'),
        h('button', { class: 'aa-btn aa-btn-tertiary', onClick: leaveAndExit }, '✕ AYRIL')
      ),
      h('p', { class: 'aa-waiting-hint', id: 'aa-waiting-hint' })
    );
    container.appendChild(h('div', { class: 'aa-waiting' }, card));
    updateWaitingPlayers();
  }

  function updateWaitingPlayers() {
    const grid = container.querySelector('#aa-players-grid');
    const pcountEl = container.querySelector('#aa-pcount');
    const startBtn = container.querySelector('#aa-start-btn');
    const hint = container.querySelector('#aa-waiting-hint');
    if (!grid || !roomData) return;

    clearEl(grid);
    const players = playersArray().sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    pcountEl.textContent = String(players.length);

    players.forEach(p => {
      const chip = h('div', { class: 'aa-player-chip' +
          (p.id === roomData.hostId ? ' is-host' : '') +
          (p.id === myId ? ' is-me' : '') },
        h('span', { class: 'aa-chip-name', text: (p.name || '?') + (p.id === myId ? ' (sen)' : '') }),
        p.id === roomData.hostId ? h('span', { class: 'aa-chip-host', text: '👑' }) : null
      );
      grid.appendChild(chip);
    });

    // Ayar özeti güncelle
    const settingsInfo = container.querySelector('#aa-room-settings-info');
    if (settingsInfo && roomData) {
      const dk = Math.round((roomData.durationMs ?? GAME_DURATION_DEFAULT_MS) / 60000);
      settingsInfo.textContent = dk + ' DK · EN ÇOK ALTIN KAZANIR';
    }
    const maxDisplay = container.querySelector('#aa-maxplayers-display');
    if (maxDisplay && roomData) {
      maxDisplay.textContent = ' / ' + (roomData.maxPlayers ?? MAX_PLAYERS);
    }

    if (isHost) {
      startBtn.style.display = '';
      startBtn.disabled = false;
      hint.textContent = players.length + ' OYUNCU HAZIR';
    } else {
      startBtn.style.display = 'none';
      hint.textContent = 'HOST BEKLENİYOR...';
    }
  }

  async function startGame() {
    if (!isHost || !roomRef || !roomData) return;
    try {
      const dur = roomData.durationMs ?? GAME_DURATION_DEFAULT_MS;
      await roomRef.update({
        state: 'PLAYING',
        startedAt: Date.now(),
        endsAt: Date.now() + dur
      });
    } catch (e) {
      console.error('startGame error', e);
      toast('Başlatılamadı.');
    }
  }

  // ── KENDİ HIZINDA OYUN ──
  function startMyGame() {
    const qs = (roomData && roomData.questions) || [];
    myOrder = shuffleIndices(qs.length);
    myPos = 0;
    const me = roomData.players && roomData.players[myId];
    myAnswered = (me && me.answered) || 0;
    myCorrect = (me && me.correct) || 0;
    prevMyGold = (me && me.gold) || 0;
    stageLocked = false;
    lastFinishTry = 0;
    renderGameShell();
    showQuestion();
  }

  function renderGameShell() {
    clearContainer();

    const topBar = h('div', { class: 'aa-game-top' },
      h('div', { class: 'aa-round-info' },
        h('span', { class: 'aa-round-label', text: 'ALTIN' }),
        h('span', { class: 'aa-round-num' },
          '$', h('span', { id: 'aa-my-gold', text: '0' })
        ),
        h('span', { class: 'aa-stats-chip', id: 'aa-my-stats', text: '✓0/0' })
      ),
      h('div', { class: 'aa-timer-wrap' },
        h('div', { class: 'aa-timer-bar' },
          h('div', { class: 'aa-timer-fill', id: 'aa-timer-fill' })
        ),
        h('span', { class: 'aa-timer-num aa-timer-clock', id: 'aa-timer-num', text: '--:--' })
      ),
      topBarEndButtons()
    );

    const leaderboard = h('div', { class: 'aa-leaderboard', id: 'aa-leaderboard' });
    const stage = h('div', { class: 'aa-stage', id: 'aa-stage' });

    container.appendChild(h('div', { class: 'aa-game' },
      topBar,
      leaderboard,
      h('div', { class: 'aa-game-main' }, stage)
    ));

    renderLeaderboard();
    updateGameHud();
    startGameClock();
  }

  // Kendi kazancımı transaction sonucundan ANINDA yaz (oda event'i + rAF beklemeden):
  // ödül tıklamasında altın gecikmesiz görünür; arka plan sekmesinde de doğru kalır.
  function setMyGoldHud(g) {
    if (typeof g !== 'number') return;
    prevMyGold = g;
    const el = container.querySelector('#aa-my-gold');
    if (el) el.textContent = String(g);
  }

  // Oda event'i geldikçe: altınım + istatistik çipi + liderlik tablosu.
  // Soru/kasa sahnesi TAMAMEN yerel — buradan asla yeniden çizilmez.
  function updateGameHud() {
    if (!roomData) return;
    const me = roomData.players && roomData.players[myId];
    if (me) {
      const g = me.gold || 0;
      const goldEl = container.querySelector('#aa-my-gold');
      if (goldEl) goldEl.textContent = String(g);
      if (g < prevMyGold) {
        toast('🚨 ' + (prevMyGold - g) + '$ ÇALINDI!', 2200);
        sfx('error');
      }
      prevMyGold = g;
    }
    const statsEl = container.querySelector('#aa-my-stats');
    if (statsEl) statsEl.textContent = '✓' + myCorrect + '/' + myAnswered;
    renderLeaderboard();
  }

  function startGameClock() {
    if (timerRafId) cancelAnimationFrame(timerRafId);
    function tick() {
      if (!roomData || roomData.state !== 'PLAYING') return;
      const endsAt = roomData.endsAt || 0;
      const total = roomData.durationMs ?? GAME_DURATION_DEFAULT_MS;
      const fill = container.querySelector('#aa-timer-fill');
      const num = container.querySelector('#aa-timer-num');
      if (endsAt) {
        const remaining = Math.max(0, endsAt - Date.now());
        if (fill) fill.style.width = ((remaining / total) * 100) + '%';
        if (num) num.textContent = fmtClock(remaining);
        // Süre doldu: HERHANGİ bir istemci bitişi tetikleyebilir (host'a bağımlılık yok).
        // Transaction idempotent — ilk başaran kazanır, gerisi no-op.
        if (remaining <= 0 && roomRef && Date.now() - lastFinishTry > 2000) {
          lastFinishTry = Date.now();
          roomRef.child('state')
            .transaction(cur => (cur === 'PLAYING' ? 'FINISHED' : undefined))
            .catch(() => {});
        }
      }
      timerRafId = requestAnimationFrame(tick);
    }
    tick();
  }

  // ── SORU AKIŞI ──
  function showQuestion() {
    const stage = container.querySelector('#aa-stage');
    const qs = (roomData && roomData.questions) || [];
    if (!stage || !qs.length) return;
    if (myPos >= myOrder.length) {        // banka bitti → yeniden karıştır, devam
      myOrder = shuffleIndices(qs.length);
      myPos = 0;
    }
    const q = qs[myOrder[myPos]];
    stageLocked = false;

    clearEl(stage);
    const optsRoot = h('div', { class: 'aa-options' });
    q.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const btn = h('button', {
        class: 'aa-option-btn',
        data: { idx: String(idx) },
        onClick: () => onAnswer(idx, q)
      },
        h('span', { class: 'aa-opt-letter', text: letter }),
        h('span', { class: 'aa-opt-text', text: opt })
      );
      optsRoot.appendChild(btn);
    });
    stage.appendChild(h('div', { class: 'aa-question-card' },
      h('div', { class: 'aa-question-text', text: q.q }),
      optsRoot
    ));
  }

  function onAnswer(idx, q) {
    if (stageLocked) return;
    stageLocked = true;
    const correct = idx === q.correctIdx;
    myAnswered++;
    if (correct) myCorrect++;
    writeMyStats();
    const statsEl = container.querySelector('#aa-my-stats');
    if (statsEl) statsEl.textContent = '✓' + myCorrect + '/' + myAnswered;

    if (correct) {
      sfx('success');
      showSplash(true, null, () => renderChests());
    } else {
      sfx('error');
      showSplash(false, q.options[q.correctIdx], nextQuestion);
    }
  }

  function nextQuestion() {
    myPos++;
    showQuestion();
  }

  // answered/correct'i yalnız BEN yazarım → düz update yeterli (yarış yok).
  // gold ise ASLA düz yazılmaz: çalmalar eşzamanlı geldiği için hep transaction.
  function writeMyStats() {
    if (!myRoomCode || !myId) return;
    playerRef(myId).update({ answered: myAnswered, correct: myCorrect }).catch(() => {});
  }

  function showSplash(correct, correctText, onDone) {
    const stage = container.querySelector('#aa-stage');
    if (!stage) return;
    clearEl(stage);
    let fired = false;
    const proceed = () => {
      if (fired) return;
      fired = true;
      onDone();
    };
    const splash = h('div', {
      class: 'aa-splash ' + (correct ? 'correct' : 'wrong'),
      onClick: proceed
    },
      h('div', { class: 'aa-splash-title', text: correct ? 'DOĞRU!' : 'YANLIŞ!' }),
      h('div', { class: 'aa-splash-mark', text: correct ? '✓' : '✕' }),
      correct ? null : h('div', { class: 'aa-splash-answer', text: 'Doğru Cevap: ' + correctText }),
      h('div', { class: 'aa-splash-hint', text: correct ? 'KASALAR AÇILIYOR...' : 'DEVAM İÇİN DOKUN' })
    );
    stage.appendChild(splash);
    setTimeout(proceed, correct ? CORRECT_SPLASH_MS : WRONG_SPLASH_MS);
  }

  // ── KASA SEÇİMİ ──
  function drawReward() {
    const totalW = CHEST_POOL.reduce((s, c) => s + c.w, 0);
    let r = Math.random() * totalW;
    for (const c of CHEST_POOL) {
      r -= c.w;
      if (r <= 0) return c;
    }
    return CHEST_POOL[0];
  }

  function renderChests() {
    const stage = container.querySelector('#aa-stage');
    if (!stage) return;
    clearEl(stage);
    stageLocked = false;
    let picked = false;

    const grid = h('div', { class: 'aa-chest-grid' });
    const boxes = [];
    for (let i = 0; i < 3; i++) {
      const qmark = h('div', { class: 'aa-chest-q', text: '?' });
      const box = h('div', {
        class: 'aa-chest-box',
        onClick: async () => {
          if (picked) return;
          picked = true;
          sfx('flip');
          const reward = drawReward();
          boxes.forEach(b => { if (b !== box) b.classList.add('dimmed'); });
          box.classList.add('opened');

          const others = playersArray().filter(p => p.id !== myId);
          if (reward.type === 'steal' && others.length > 0) {
            qmark.textContent = '🏴‍☠️';
            renderStealTargets();
            return;
          }
          if (reward.type === 'double') {
            const res = await applyDouble();
            setMyGoldHud(res.total);
            qmark.textContent = '×2';
            showChestResult(stage, res.gained > 0
              ? 'ALTININ İKİYE KATLANDI! +' + res.gained + '$'
              : 'İKİYE KATLAMA — kasan boştu (0$)');
          } else {
            const amount = (reward.type === 'gold') ? reward.amount : 30;
            const total = await applyGoldDelta(amount);
            setMyGoldHud(total);
            qmark.textContent = '+' + amount + '$';
            showChestResult(stage, '+' + amount + ' ALTIN KAZANDIN!');
          }
        }
      }, qmark);
      boxes.push(box);
      grid.appendChild(box);
    }

    stage.appendChild(h('div', { class: 'aa-chest-wrap' },
      h('div', { class: 'aa-chest-title', text: '▶ BİR KASA SEÇ!' }),
      grid
    ));
  }

  function showChestResult(stage, text) {
    sfx('star');
    stage.appendChild(h('div', { class: 'aa-chest-result', text: text }));
    stage.appendChild(h('button', {
      class: 'aa-btn aa-btn-primary aa-continue-btn',
      onClick: () => { sfx('tap'); nextQuestion(); }
    }, 'DEVAM ▸'));
  }

  // ÇAL: 3 gizli hedef kutusu — isimler seçimden sonra görünür (sürpriz korunur)
  function renderStealTargets() {
    const stage = container.querySelector('#aa-stage');
    if (!stage) return;
    clearEl(stage);
    let picked = false;

    const others = playersArray().filter(p => p.id !== myId);
    if (others.length === 0) { renderChests(); return; }
    // Altını olanlar öncelikli (boş hedef anti-klimaks); hiç yoksa herkes
    const withGold = others.filter(p => (p.gold || 0) > 0);
    const pool = (withGold.length > 0 ? withGold : others)
      .slice().sort(() => Math.random() - 0.5).slice(0, 3);

    const grid = h('div', { class: 'aa-target-grid' });
    pool.forEach(p => {
      const nameEl = h('div', { class: 'aa-target-name', text: '???' });
      const statEl = h('div', { class: 'aa-target-stats', text: '$ ?' });
      const box = h('div', { class: 'aa-target-box aa-target-hidden',
        onClick: async () => {
          if (picked) return;
          picked = true;
          sfx('flip');
          box.classList.add('selected');
          box.classList.remove('aa-target-hidden');
          nameEl.textContent = p.name || '?';
          const stolen = await stealFrom(p.id);
          statEl.textContent = stolen > 0 ? '+' + stolen + '$ ÇALDIN!' : 'KASASI BOŞTU! (0$)';
          showChestResult(stage, stolen > 0
            ? (p.name || '?') + ' oyuncusundan ' + stolen + '$ çaldın! 🏴‍☠️'
            : (p.name || '?') + ' oyuncusunun kasası boş çıktı!');
        }
      }, nameEl, statEl);
      grid.appendChild(box);
    });

    stage.appendChild(h('div', { class: 'aa-chest-wrap' },
      h('div', { class: 'aa-chest-title aa-chest-title-steal', text: '🏴‍☠️ HACK! KİMDEN ÇALACAKSIN?' }),
      grid
    ));
  }

  // ── ALTIN İŞLEMLERİ (hepsi transaction — eşzamanlı çalmalarla yarış güvenli) ──
  function applyGoldDelta(delta) {
    if (!myRoomCode || !myId) return Promise.resolve(0);
    return playerRef(myId).child('gold')
      .transaction(g => Math.max(0, Math.min(GOLD_CAP, (g || 0) + delta)))
      .then(tx => (tx && tx.snapshot ? tx.snapshot.val() : 0))
      .catch(() => 0);
  }

  function applyDouble() {
    if (!myRoomCode || !myId) return Promise.resolve({ gained: 0, total: 0 });
    let gained = 0;
    return playerRef(myId).child('gold')
      .transaction(g => {
        const cur = g || 0;
        gained = Math.min(GOLD_CAP, cur * 2) - cur;
        return cur + gained;
      })
      .then(tx => (tx && tx.committed
        ? { gained, total: tx.snapshot.val() || 0 }
        : { gained: 0, total: 0 }))
      .catch(() => ({ gained: 0, total: 0 }));
  }

  async function stealFrom(targetId) {
    if (!myRoomCode || !targetId) return 0;
    let stolen = 0;
    try {
      const tx = await playerRef(targetId).child('gold').transaction(g => {
        if (g === null) return;           // hedef silinmiş — vazgeç
        const cur = g || 0;
        stolen = Math.floor(cur * STEAL_RATE);
        return cur - stolen;
      });
      if (!tx.committed) return 0;
      if (stolen > 0) {
        const total = await applyGoldDelta(stolen);
        setMyGoldHud(total);
      }
      return stolen;
    } catch (e) {
      console.error('stealFrom error', e);
      return 0;
    }
  }

  // ── LEADERBOARD ──
  function renderLeaderboard() {
    const root = container.querySelector('#aa-leaderboard');
    if (!root) return;
    clearEl(root);

    const players = playersArray().sort((a, b) => (b.gold || 0) - (a.gold || 0));
    const myRank = players.findIndex(p => p.id === myId) + 1;
    const top = players.slice(0, 5);

    root.appendChild(h('div', { class: 'aa-lb-title', text: 'RANKING' }));

    top.forEach((p, i) => {
      const row = h('div', { class: 'aa-lb-row' + (p.id === myId ? ' is-me' : '') },
        h('span', { class: 'aa-lb-rank', text: pad2(i + 1) }),
        h('span', { class: 'aa-lb-name', text: (p.name || '?') + (p.id === myId ? ' [you]' : '') }),
        h('span', { class: 'aa-lb-gold', text: (p.gold || 0) + '$' })
      );
      root.appendChild(row);
    });

    if (myRank > 5) {
      root.appendChild(h('div', { class: 'aa-lb-sep', text: '· · ·' }));
      const me = players[myRank - 1];
      root.appendChild(
        h('div', { class: 'aa-lb-row is-me' },
          h('span', { class: 'aa-lb-rank', text: pad2(myRank) }),
          h('span', { class: 'aa-lb-name', text: (me.name || '?') + ' [you]' }),
          h('span', { class: 'aa-lb-gold', text: (me.gold || 0) + '$' })
        )
      );
    }
  }

  // ── FINAL SCREEN ──
  function renderFinalScreen() {
    if (timerRafId) { cancelAnimationFrame(timerRafId); timerRafId = null; }
    clearContainer();

    const players = playersArray().sort((a, b) => (b.gold || 0) - (a.gold || 0));
    const myRank = players.findIndex(p => p.id === myId) + 1;
    const winner = players[0];
    const iWon = winner && winner.id === myId;

    const podium = h('div', { class: 'aa-podium', id: 'aa-podium' });
    const podiumOrder = [1, 0, 2];
    podiumOrder.forEach(rankIdx => {
      if (!players[rankIdx]) return;
      const p = players[rankIdx];
      const medal = rankIdx === 0 ? '🥇' : rankIdx === 1 ? '🥈' : '🥉';
      const slot = h('div', {
        class: 'aa-podium-slot rank-' + (rankIdx + 1) + (p.id === myId ? ' is-me' : '')
      },
        h('div', { class: 'aa-podium-medal', text: medal }),
        h('div', { class: 'aa-podium-name', text: p.name || '?' }),
        h('div', { class: 'aa-podium-gold', text: (p.gold || 0) + ' 💰' })
      );
      podium.appendChild(slot);
    });

    const me = players[myRank - 1];
    const myRankText = me
      ? '> RANK ' + pad2(myRank) + ' · ' + (me.gold || 0) + '$ · ✓' + (me.correct || 0) + '/' + (me.answered || 0) + ' SORU <'
      : '';

    const titleText = iWon ? '★ WINNER ★' : (myRank > 0 && myRank <= 3 ? 'GOOD RUN' : 'GAME OVER');
    const card = h('div', { class: 'aa-final-card' },
      h('h2', { class: 'aa-final-title', text: titleText }),
      podium,
      h('div', { class: 'aa-my-rank', text: myRankText }),
      h('div', { class: 'aa-final-buttons' },
        h('button', {
          class: 'aa-btn aa-btn-primary',
          onClick: () => {
            cleanup();
            myId = generatePlayerId();
            renderEntryMenu();
          }
        }, '↻ RESTART'),
        h('button', { class: 'aa-btn aa-btn-tertiary', onClick: leaveAndExit }, '⌂ HUB')
      )
    );

    container.appendChild(h('div', { class: 'aa-final' }, card));

    sfx('complete');
    if (typeof Particles !== 'undefined' && Particles.celebrate && (iWon || (myRank > 0 && myRank <= 3))) {
      try { Particles.celebrate(); } catch (e) {}
    }

    if (isHost) {
      setTimeout(() => {
        if (roomRef && roomData && roomData.state === 'FINISHED') {
          roomRef.remove().catch(() => {});
        }
      }, 60000);
    }
  }

  // ── LOADING ──
  function showLoading(msg) {
    clearContainer();
    container.appendChild(
      h('div', { class: 'aa-loading' },
        h('div', { class: 'aa-spinner' }),
        h('div', { class: 'aa-loading-text', text: msg || 'Yükleniyor...' })
      )
    );
  }

  // ── PUBLIC ──
  return { id, isMultiplayer, init, destroy };
})();
