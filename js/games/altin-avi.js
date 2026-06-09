/* ============================================
   ALTIN AVI — 5-30 Kişilik Online Quiz Savaşı
   Crypto Hack tarzı: kazı / saldır / savun / hack
   Sorular: Bilişim Teknolojileri (BT)
   Mimari: kendi /rooms/altin-avi/{code} Firebase path'i
   ============================================ */

const AltinAvi = (() => {
  const id = 'altin-avi';
  const isMultiplayer = true;

  const TOTAL_ROUNDS = 50;
  const MIN_PLAYERS = 5;
  const MAX_PLAYERS = 30;
  const STARTING_GOLD = 100;
  const CHOICE_DURATION_MS = 20000;
  const REVEAL_DURATION_MS = 5000;
  const PREP_DURATION_MS = 5000;
  // Anti-stuck: host normal sürede fazı ilerletmezse (cihazı donduysa veya sekme
  // arka plana geçtiyse setInterval kısılır), bu ek süre sonra en eski non-host
  // oyuncu ilerletmeyi devralır. Faz geçişleri transaction ile çift-ilerletmeye karşı korumalı.
  const HOST_GRACE_MS = 7000;
  const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVYZ';

  // Hız bonusu: doğru cevap verenlere sıraya göre dağıtılır
  // 1. = 10, 2. = 9, 3. = 8, ..., 6+ = 5 altın
  const SPEED_BONUS_FIRST = 10;
  const SPEED_BONUS_MIN = 5;

  // Saldırı/Savunma seviyeleri kalıcı. Yükseltme maliyeti: currentLevel * 5
  // ATK 1→2: 5, 2→3: 10, 3→4: 15, ..., n→n+1: n*5
  const START_ATK = 1;
  const START_DEF = 1;
  const UPGRADE_COST_PER_LEVEL = 5;
  const TRANSFER_PER_DIFF = 10; // |ATK - DEF| * 10 = transfer miktarı

  // ── Host ayar seçimleri (createRoom öncesi doldurulur) ──
  let pendingSettings = {
    maxPlayers: 30,
    totalRounds: 50,
    choiceDurationMs: 20000,
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
  let hostTickInterval = null;
  let myChoice = null;
  let lastRenderedPhase = null;
  let timerRafId = null;
  let coalesceRaf = null;
  let pendingCoalesced = null;

  // 30 kişilik odada her oyuncunun yazımı herkeste bir 'value' event tetikler. O(N) maliyetli
  // yeniden-çizimleri (lobi ızgarası / liderlik tablosu) kare başına TEK çizime indir: bir
  // patlama gelse de en fazla 60fps'te bir çizilir, en güncel roomData ile (kayıpsız).
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
    myChoice = null;
    lastRenderedPhase = null;
    renderEntryMenu();
  }

  function destroy() { cleanup(); }

  function cleanup() {
    if (roomListener && roomRef) {
      try { roomRef.off('value', roomListener); } catch (e) {}
    }
    if (hostTickInterval) { clearInterval(hostTickInterval); hostTickInterval = null; }
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
      gold: STARTING_GOLD,
      atkLevel: START_ATK,
      defLevel: START_DEF,
      online: true,
      joinedAt: firebase.database.ServerValue.TIMESTAMP,
      currentChoice: null
    };
  }

  function upgradeCost(currentLevel) {
    return (currentLevel || 1) * UPGRADE_COST_PER_LEVEL;
  }
  function pickRandomQuestions(n) {
    const all = (window.ALTIN_AVI_QUESTIONS || []).slice();
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, Math.min(n, all.length)).map(q => ({
      q: q.q, options: q.options.slice(), correctIdx: q.correctIdx
    }));
  }
  function playersArray() {
    if (!roomData || !roomData.players) return [];
    return Object.values(roomData.players);
  }
  function playerCount() { return playersArray().length; }
  function clearContainer() {
    while (container.firstChild) container.removeChild(container.firstChild);
  }
  function toast(msg, ms) {
    const el = h('div', { class: 'aa-toast', text: msg });
    container.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, ms || 2500);
  }
  function leaveAndExit() {
    cleanup();
    if (typeof App !== 'undefined' && App.showHub) App.showHub();
  }
  // Host: oyunu erken bitir → state FINISHED → herkeste final ekranı (podyum, 1.) gösterilir.
  async function endGameEarly() {
    if (!isHost || !roomRef) return;
    if (!confirm('Oyunu şimdi bitirmek istediğine emin misin? Sıralama (1.) hemen gösterilecek.')) return;
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

  function actionLabel(a) {
    if (a === 'attack') return '🪙 KAP';
    if (a === 'defend') return '⛨ SAVUN';
    return '— PAS';
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  // Hız bonusu sıraya göre verilir (resolveRound içinde hesaplanır)
  // 1. = 10, 2. = 9, ..., 6+ = 5
  function bonusForRank(rank) {
    return Math.max(SPEED_BONUS_MIN, SPEED_BONUS_FIRST - (rank - 1));
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
          'SORU SAYISI',
          [10,20,30,50].map(v => ({ value: v, label: String(v) })),
          () => pendingSettings.totalRounds,
          v => { pendingSettings.totalRounds = v; }
        ),
        renderSettingRow(
          'SORU SÜRESİ',
          [10,15,20,30].map(v => ({ value: v * 1000, label: v + 's' })),
          () => pendingSettings.choiceDurationMs,
          v => { pendingSettings.choiceDurationMs = v; }
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
        h('p', { class: 'aa-entry-sub', text: '5-30 OYUNCU · ALTIN AVI' })
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

      const questions = pickRandomQuestions(pendingSettings.totalRounds);
      if (questions.length < pendingSettings.totalRounds) {
        toast('Soru bankası eksik!'); renderEntryMenu(); return;
      }

      const initialData = {
        code,
        state: 'WAITING',
        hostId: myId,
        maxPlayers: pendingSettings.maxPlayers,
        totalRounds: pendingSettings.totalRounds,
        choiceDurationMs: pendingSettings.choiceDurationMs,
        currentRound: 1,
        roundPhase: 'CHOICE',
        roundStartedAt: null,
        questions,
        players: { [myId]: makePlayer(myName) },
        lastResult: null,
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

  function attachOnDisconnect() {
    if (!myRoomCode || !myId) return;
    try {
      db.ref('rooms/altin-avi/' + myRoomCode + '/players/' + myId).onDisconnect().remove();
    } catch (e) { console.warn('onDisconnect attach failed', e); }
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

    if (Object.keys(players).length === 0) {
      if (roomRef) roomRef.remove().catch(() => {});
      return;
    }

    const state = roomData.state;
    const phase = roomData.roundPhase;
    const round = roomData.currentRound;

    let phaseKey;
    if (state === 'WAITING') phaseKey = 'WAITING';
    else if (state === 'FINISHED') phaseKey = 'FINISHED';
    else phaseKey = phase + '_' + round;

    if (phaseKey !== lastRenderedPhase) {
      lastRenderedPhase = phaseKey;
      // Reset myChoice only at PREP start (new round) — action carries from PREP into CHOICE
      if (state !== 'PLAYING' || phase === 'PREP') myChoice = null;
      if (state === 'WAITING') renderWaitingRoom();
      else if (state === 'FINISHED') renderFinalScreen();
      else if (phase === 'PREP') renderPrepPhase();
      else if (phase === 'CHOICE') renderChoicePhase();
      else if (phase === 'REVEAL') renderRevealPhase();
    } else {
      // WAITING ızgarası ve REVEAL tablosu O(N) çizim → kare-başına-tek'e indir (kalabalıkta
      // çok sayıda eşzamanlı 'value' event'i tek çizimde topla). PREP/CHOICE zaten hafif.
      if (state === 'WAITING') scheduleCoalesced(updateWaitingPlayers);
      else if (phase === 'PREP') updatePrepPhase();
      else if (phase === 'CHOICE') updateChoicePhase();
      else if (phase === 'REVEAL') scheduleCoalesced(updateLeaderboardOnly);
    }

    // Tick'i artık yalnız host değil HERKES çalıştırır: host donarsa/arka plana
    // geçerse en eski non-host oyuncu fazı ilerletmeyi devralabilsin (anti-stuck).
    if (state === 'PLAYING') ensureTick();
    else if (hostTickInterval) { clearInterval(hostTickInterval); hostTickInterval = null; }
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

    while (grid.firstChild) grid.removeChild(grid.firstChild);
    const players = playersArray().sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    pcountEl.textContent = String(players.length);

    players.forEach(p => {
      const chip = h('div', { class: 'aa-player-chip' +
          (p.id === roomData.hostId ? ' is-host' : '') +
          (p.id === myId ? ' is-me' : '') },
        h('span', { class: 'aa-chip-name', text: p.name + (p.id === myId ? ' (sen)' : '') }),
        p.id === roomData.hostId ? h('span', { class: 'aa-chip-host', text: '👑' }) : null
      );
      grid.appendChild(chip);
    });

    // Ayar özeti güncelle
    const settingsInfo = container.querySelector('#aa-room-settings-info');
    if (settingsInfo && roomData) {
      const dur = Math.round((roomData.choiceDurationMs ?? CHOICE_DURATION_MS) / 1000);
      settingsInfo.textContent = (roomData.totalRounds ?? TOTAL_ROUNDS) + ' SORU · ' + dur + 's';
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

  // ── PREP PHASE ──
  function renderPrepPhase() {
    clearContainer();
    if (!myChoice) myChoice = { answer: null, answerTime: null, action: null, targetId: null };

    const topBar = h('div', { class: 'aa-game-top' },
      h('div', { class: 'aa-round-info' },
        h('span', { class: 'aa-round-label', text: 'ROUND' }),
        h('span', { class: 'aa-round-num' },
          pad2(roomData.currentRound),
          ' / ' + pad2(roomData.totalRounds ?? TOTAL_ROUNDS)
        )
      ),
      h('div', { class: 'aa-timer-wrap' },
        h('div', { class: 'aa-timer-bar' },
          h('div', { class: 'aa-timer-fill', id: 'aa-timer-fill' })
        ),
        h('span', { class: 'aa-timer-num', id: 'aa-timer-num', text: '5' })
      ),
      topBarEndButtons()
    );

    const leaderboard = h('div', { class: 'aa-leaderboard', id: 'aa-leaderboard' });

    const actions = [
      { key: 'attack', icon: '🪙', name: 'KAP', desc: 'rakibin altınını kap' },
      { key: 'defend', icon: '⛨', name: 'SAVUN', desc: 'gelene direnç' }
    ];
    const actionRow = h('div', { class: 'aa-action-row', id: 'aa-action-row' });
    actions.forEach(a => {
      const btn = h('button', {
        class: 'aa-action-btn' + (myChoice && myChoice.action === a.key ? ' selected' : ''),
        data: { action: a.key },
        onClick: () => selectAction(a.key)
      },
        h('span', { class: 'aa-action-icon', text: a.icon }),
        h('span', { class: 'aa-action-name', text: a.name }),
        h('span', { class: 'aa-action-desc', text: a.desc })
      );
      actionRow.appendChild(btn);
    });
    const actionSection = h('div', { class: 'aa-action-section' },
      h('div', { class: 'aa-action-label', text: 'HAMLENİ SEÇ:' }),
      actionRow
    );

    const me = roomData.players && roomData.players[myId];
    const myAtk = me ? (me.atkLevel || START_ATK) : START_ATK;
    const myDef = me ? (me.defLevel || START_DEF) : START_DEF;
    const myGold = me ? (me.gold || 0) : 0;
    const statsSection = h('div', { class: 'aa-stats-section' },
      h('div', { class: 'aa-stats-grid' },
        h('div', { class: 'aa-stat-card attack' },
          h('div', { class: 'aa-stat-icon', text: '🗡' }),
          h('div', { class: 'aa-stat-name', text: 'ATK' }),
          h('div', { class: 'aa-stat-level' }, 'LV ', h('span', { id: 'aa-atk-level', class: 'aa-stat-num', text: String(myAtk) })),
          h('button', { class: 'aa-upgrade-btn', id: 'aa-upgrade-atk', onClick: upgradeAttack },
            '+1 (', h('span', { id: 'aa-atk-cost', text: String(upgradeCost(myAtk)) }), ' $)')
        ),
        h('div', { class: 'aa-stat-card defend' },
          h('div', { class: 'aa-stat-icon', text: '🛡' }),
          h('div', { class: 'aa-stat-name', text: 'DEF' }),
          h('div', { class: 'aa-stat-level' }, 'LV ', h('span', { id: 'aa-def-level', class: 'aa-stat-num', text: String(myDef) })),
          h('button', { class: 'aa-upgrade-btn', id: 'aa-upgrade-def', onClick: upgradeDefend },
            '+1 (', h('span', { id: 'aa-def-cost', text: String(upgradeCost(myDef)) }), ' $)')
        ),
        h('div', { class: 'aa-stat-card gold' },
          h('div', { class: 'aa-stat-icon', text: '$' }),
          h('div', { class: 'aa-stat-name', text: 'ALTIN' }),
          h('div', { class: 'aa-stat-level' }, h('span', { id: 'aa-my-gold-line', class: 'aa-stat-num gold-num', text: String(myGold) }))
        )
      )
    );

    const prepInfo = h('div', { class: 'aa-prep-info', text: 'Soru yakında geliyor...' });

    container.appendChild(h('div', { class: 'aa-game' },
      topBar,
      leaderboard,
      h('div', { class: 'aa-game-main' }, actionSection, statsSection, prepInfo)
    ));

    renderLeaderboard();
    updatePrepPhase();
    startPrepTimer();
  }

  function startPrepTimer() {
    if (timerRafId) cancelAnimationFrame(timerRafId);
    const fill = container.querySelector('#aa-timer-fill');
    const num = container.querySelector('#aa-timer-num');
    function tick() {
      if (!roomData || roomData.roundPhase !== 'PREP') return;
      const startedAt = roomData.prepStartedAt;
      if (!startedAt) { timerRafId = requestAnimationFrame(tick); return; }
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, PREP_DURATION_MS - elapsed);
      const pct = (remaining / PREP_DURATION_MS) * 100;
      if (fill) fill.style.width = pct + '%';
      if (num) num.textContent = String(Math.ceil(remaining / 1000));
      if (remaining > 0) timerRafId = requestAnimationFrame(tick);
    }
    tick();
  }

  function updatePrepPhase() {
    // PREP'te altın yalnız kendi yükseltmemle değişir; leaderboard'ı her 'value'
    // event'inde yeniden çizmeyiz (faz başında bir kez çizilir) — yük azaltma.
    const me = roomData.players && roomData.players[myId];
    if (!me) return;
    const myGold = me.gold || 0;
    const myAtk = me.atkLevel || START_ATK;
    const myDef = me.defLevel || START_DEF;
    const atkCost = upgradeCost(myAtk);
    const defCost = upgradeCost(myDef);
    const setText = (id, val) => {
      const el = container.querySelector('#' + id);
      if (el) el.textContent = String(val);
    };
    setText('aa-my-gold-line', myGold);
    setText('aa-atk-level', myAtk);
    setText('aa-def-level', myDef);
    setText('aa-atk-cost', atkCost);
    setText('aa-def-cost', defCost);
    const atkBtn = container.querySelector('#aa-upgrade-atk');
    const defBtn = container.querySelector('#aa-upgrade-def');
    if (atkBtn) atkBtn.disabled = myGold < atkCost;
    if (defBtn) defBtn.disabled = myGold < defCost;
  }

  async function startGame() {
    if (!isHost) return;
    try {
      await roomRef.update({
        state: 'PLAYING',
        currentRound: 1,
        roundPhase: 'PREP',
        prepStartedAt: Date.now()
      });
    } catch (e) {
      console.error('startGame error', e);
      toast('Başlatılamadı.');
    }
  }

  // ── CHOICE PHASE ──
  function renderChoicePhase() {
    clearContainer();
    const q = roomData.questions[roomData.currentRound - 1];
    if (!q) { console.error('No question for round', roomData.currentRound); return; }

    // Carry action from PREP; initialize only if needed
    if (!myChoice) myChoice = { answer: null, answerTime: null, action: null, targetId: null };

    const dur = roomData?.choiceDurationMs ?? CHOICE_DURATION_MS;
    const topBar = h('div', { class: 'aa-game-top' },
      h('div', { class: 'aa-round-info' },
        h('span', { class: 'aa-round-label', text: 'ROUND' }),
        h('span', { class: 'aa-round-num' },
          pad2(roomData.currentRound),
          ' / ' + pad2(roomData.totalRounds ?? TOTAL_ROUNDS)
        )
      ),
      h('div', { class: 'aa-timer-wrap' },
        h('div', { class: 'aa-timer-bar' },
          h('div', { class: 'aa-timer-fill', id: 'aa-timer-fill' })
        ),
        h('span', { class: 'aa-timer-num', id: 'aa-timer-num', text: String(Math.ceil(dur / 1000)) })
      ),
      topBarEndButtons()
    );

    const leaderboard = h('div', { class: 'aa-leaderboard', id: 'aa-leaderboard' });

    // Action indicator (selected during PREP)
    const chosenAction = myChoice.action;
    const actionIndicator = h('div', { class: 'aa-action-indicator' },
      chosenAction === 'attack'
        ? h('span', { class: 'aa-action-indicator-text attack', text: '🪙 KAP — rakibin altınını kap' })
        : chosenAction === 'defend'
        ? h('span', { class: 'aa-action-indicator-text defend', text: '⛨ SAVUN — gelene direnç' })
        : h('span', { class: 'aa-action-indicator-text', text: '— PAS (PREP\'te hamle seçilmedi)' })
    );

    // Question card — options container reused for target selection after answer
    const optsRoot = h('div', { class: 'aa-options', id: 'aa-options' });
    q.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const btn = h('button', {
        class: 'aa-option-btn',
        data: { idx: String(idx) },
        onClick: () => selectAnswer(idx)
      },
        h('span', { class: 'aa-opt-letter', text: letter }),
        h('span', { class: 'aa-opt-text', text: opt })
      );
      optsRoot.appendChild(btn);
    });
    const questionCard = h('div', { class: 'aa-question-card' },
      h('div', { class: 'aa-question-text', id: 'aa-question-text', text: q.q }),
      optsRoot
    );

    const waiting = h('div', {
      class: 'aa-waiting-others',
      id: 'aa-waiting-others',
      style: { display: 'none' }
    }, '> SYNC.. DİĞER OYUNCULAR BEKLENİYOR..');

    container.appendChild(h('div', { class: 'aa-game' },
      topBar,
      leaderboard,
      h('div', { class: 'aa-game-main' }, actionIndicator, questionCard, waiting)
    ));

    renderLeaderboard();
    updateChoicePhase();
    startChoiceTimer();
  }

  function selectAnswer(idx) {
    if (!myChoice) myChoice = { answer: null, answerTime: null, action: null, targetId: null };
    if (isMyChoiceLocked()) return;
    if (myChoice.answer === null && roomData && roomData.roundStartedAt) {
      myChoice.answerTime = Math.max(0, Date.now() - roomData.roundStartedAt);
    }
    myChoice.answer = idx;
    container.querySelectorAll('.aa-option-btn').forEach(b => {
      b.classList.toggle('selected', parseInt(b.dataset.idx, 10) === idx);
    });

    // KAP seçilmişse hedef seçim UI'ı göster; diğer durumlarda hemen gönder
    if (myChoice.action === 'attack') {
      renderTargetSelection();
    } else {
      sendChoice();
    }
  }

  function selectAction(actionName) {
    if (!myChoice) myChoice = { answer: null, answerTime: null, action: null, targetId: null };
    myChoice.action = actionName;
    container.querySelectorAll('.aa-action-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.action === actionName);
    });
  }

  function renderTargetSelection() {
    const optsRoot = container.querySelector('#aa-options');
    if (!optsRoot) return;
    while (optsRoot.firstChild) optsRoot.removeChild(optsRoot.firstChild);

    const others = playersArray().filter(p => p.id !== myId);
    if (others.length === 0) { sendChoice(); return; }

    const shuffled = others.slice().sort(() => Math.random() - 0.5).slice(0, 3);

    optsRoot.appendChild(h('div', { class: 'aa-target-label', text: '▶ HEDEF SEÇ:' }));
    const grid = h('div', { class: 'aa-target-grid' });
    shuffled.forEach((p) => {
      // İsim ve istatistikler seçimden önce gizli
      const nameEl = h('div', { class: 'aa-target-name', text: '???' });
      const atkEl = h('span', { class: 'aa-target-stat atk', text: '⚔ ?' });
      const defEl = h('span', { class: 'aa-target-stat def', text: '🛡 ?' });
      const statsEl = h('div', { class: 'aa-target-stats' }, atkEl, defEl);

      const box = h('div', { class: 'aa-target-box aa-target-hidden',
        onClick: () => {
          if (myChoice.targetId) return; // zaten seçildi
          myChoice.targetId = p.id;
          // Seçim sonrası isim ve istatistikleri göster
          nameEl.textContent = p.name;
          atkEl.textContent = '⚔ ' + (p.atkLevel || 1);
          defEl.textContent = '🛡 ' + (p.defLevel || 1);
          container.querySelectorAll('.aa-target-box').forEach(b => b.classList.remove('selected'));
          box.classList.add('selected');
          box.classList.remove('aa-target-hidden');
          setTimeout(() => sendChoice(), 700);
        }
      }, nameEl, statsEl);
      grid.appendChild(box);
    });
    optsRoot.appendChild(grid);
  }

  function autoSubmitOnTimeout() {
    if (isMyChoiceLocked()) return;
    if (!myChoice) myChoice = { answer: null, answerTime: null, action: null, targetId: null };
    // KAP + hedef seçilmemişse rastgele seç
    if (myChoice.action === 'attack' && !myChoice.targetId) {
      const others = playersArray().filter(p => p.id !== myId);
      if (others.length > 0) {
        myChoice.targetId = others[Math.floor(Math.random() * others.length)].id;
      }
    }
    if (myChoice.answer !== null) sendChoice();
  }

  // Yükseltme: transaction ile atomik
  async function upgradeAttack() {
    if (!myRoomCode || !myId) return;
    const ref = db.ref('rooms/altin-avi/' + myRoomCode + '/players/' + myId);
    let resultMsg = null;
    try {
      const tx = await ref.transaction((player) => {
        if (!player) return;
        const cur = player.atkLevel || START_ATK;
        const cost = cur * UPGRADE_COST_PER_LEVEL;
        if ((player.gold || 0) < cost) {
          resultMsg = 'Yetersiz altın! (' + cost + ' gerek)';
          return;
        }
        player.gold = player.gold - cost;
        player.atkLevel = cur + 1;
        return player;
      });
      if (resultMsg) toast(resultMsg);
      else if (tx.committed) toast('⚔️ Saldırı +1 yükseldi!', 1500);
    } catch (e) {
      console.error('upgradeAttack failed', e);
      toast('Yükseltme yapılamadı.');
    }
  }

  async function upgradeDefend() {
    if (!myRoomCode || !myId) return;
    const ref = db.ref('rooms/altin-avi/' + myRoomCode + '/players/' + myId);
    let resultMsg = null;
    try {
      const tx = await ref.transaction((player) => {
        if (!player) return;
        const cur = player.defLevel || START_DEF;
        const cost = cur * UPGRADE_COST_PER_LEVEL;
        if ((player.gold || 0) < cost) {
          resultMsg = 'Yetersiz altın! (' + cost + ' gerek)';
          return;
        }
        player.gold = player.gold - cost;
        player.defLevel = cur + 1;
        return player;
      });
      if (resultMsg) toast(resultMsg);
      else if (tx.committed) toast('🛡️ Savunma +1 yükseldi!', 1500);
    } catch (e) {
      console.error('upgradeDefend failed', e);
      toast('Yükseltme yapılamadı.');
    }
  }

  function isMyChoiceLocked() {
    const me = roomData && roomData.players && roomData.players[myId];
    return !!(me && me.currentChoice && me.currentChoice.round === roomData.currentRound);
  }

  async function sendChoice() {
    if (!myChoice || myChoice.answer === null) return;
    if (!myRoomCode) return;
    try {
      const payload = {
        answer: myChoice.answer,
        answerTime: myChoice.answerTime !== null ? myChoice.answerTime : (roomData?.choiceDurationMs ?? CHOICE_DURATION_MS),
        action: myChoice.action || 'pass',
        targetId: myChoice.targetId || null,
        round: roomData.currentRound
      };
      await db.ref('rooms/altin-avi/' + myRoomCode + '/players/' + myId + '/currentChoice').set(payload);
      lockMyChoiceUI();
    } catch (e) {
      console.error('sendChoice failed', e);
      toast('Gönderilemedi.');
    }
  }

  function lockMyChoiceUI() {
    container.querySelectorAll('.aa-option-btn, .aa-action-btn').forEach(b => b.classList.add('locked'));
    const submitBtn = container.querySelector('#aa-submit-btn');
    if (submitBtn) submitBtn.disabled = true;
    const wait = container.querySelector('#aa-waiting-others');
    if (wait) wait.style.display = '';
  }

  function updateChoicePhase() {
    // KRİTİK PERFORMANS: CHOICE fazında altın DEĞİŞMEZ (yalnız REVEAL'de hesaplanır).
    // Kalabalıkta her oyuncunun currentChoice yazımı herkeste 'value' event tetikler;
    // leaderboard'ı her seferinde yeniden çizmek O(n²) DOM yüküne yol açıp host
    // cihazını kilitliyordu ("bir süre sonra herkes takılıyor" sorununun ana sebebi).
    // Tablo faz başında bir kez çizilir; burada yalnız kendi kilit durumumu kontrol ederim.
    const me = roomData.players && roomData.players[myId];
    if (me && me.currentChoice && me.currentChoice.round === roomData.currentRound) {
      lockMyChoiceUI();
    }
  }

  function updateLeaderboardOnly() {
    renderLeaderboard();
  }

  function startChoiceTimer() {
    if (timerRafId) cancelAnimationFrame(timerRafId);
    const fill = container.querySelector('#aa-timer-fill');
    const num = container.querySelector('#aa-timer-num');
    let autoSubmitted = false;
    function tick() {
      if (!roomData || roomData.roundPhase !== 'CHOICE') return;
      const startedAt = roomData.roundStartedAt;
      if (!startedAt) { timerRafId = requestAnimationFrame(tick); return; }
      const elapsed = Date.now() - startedAt;
      const dur = roomData?.choiceDurationMs ?? CHOICE_DURATION_MS;
      const remaining = Math.max(0, dur - elapsed);
      const pct = (remaining / dur) * 100;
      if (fill) fill.style.width = pct + '%';
      if (num) num.textContent = String(Math.ceil(remaining / 1000));
      if (remaining > 0) {
        timerRafId = requestAnimationFrame(tick);
      } else if (!autoSubmitted) {
        autoSubmitted = true;
        autoSubmitOnTimeout();
      }
    }
    tick();
  }

  // ── LEADERBOARD ──
  function renderLeaderboard() {
    const root = container.querySelector('#aa-leaderboard');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);

    const players = playersArray().sort((a, b) => (b.gold || 0) - (a.gold || 0));
    const myRank = players.findIndex(p => p.id === myId) + 1;
    const top = players.slice(0, 5);

    root.appendChild(h('div', { class: 'aa-lb-title', text: 'RANKING' }));

    top.forEach((p, i) => {
      const row = h('div', { class: 'aa-lb-row' + (p.id === myId ? ' is-me' : '') },
        h('span', { class: 'aa-lb-rank', text: pad2(i + 1) }),
        h('span', { class: 'aa-lb-name', text: p.name + (p.id === myId ? ' [you]' : '') }),
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
          h('span', { class: 'aa-lb-name', text: me.name + ' [you]' }),
          h('span', { class: 'aa-lb-gold', text: (me.gold || 0) + '$' })
        )
      );
    }
  }

  // ── REVEAL PHASE ──
  function renderRevealPhase() {
    clearContainer();
    const result = roomData.lastResult;
    if (!result) {
      container.appendChild(h('div', { class: 'aa-game' },
        h('div', { class: 'aa-loading-text', style: { textAlign: 'center', padding: '40px' }, text: 'Sonuçlar hesaplanıyor...' })
      ));
      return;
    }
    const q = roomData.questions[result.round - 1];

    const topBar = h('div', { class: 'aa-game-top' },
      h('div', { class: 'aa-round-info' },
        h('span', { class: 'aa-round-label', text: 'ROUND' }),
        h('span', { class: 'aa-round-num', text: pad2(result.round) + ' / ' + pad2(roomData.totalRounds ?? TOTAL_ROUNDS) })
      ),
      h('div', { class: 'aa-reveal-label', text: '◆ SONUÇLAR ◆' }),
      topBarEndButtons()
    );

    const leaderboard = h('div', { class: 'aa-leaderboard', id: 'aa-leaderboard' });

    const optsRoot = h('div', { class: 'aa-options aa-options-reveal' });
    q.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const card = h('div', { class: 'aa-option-btn' + (idx === q.correctIdx ? ' correct' : '') },
        h('span', { class: 'aa-opt-letter', text: letter }),
        h('span', { class: 'aa-opt-text', text: opt })
      );
      optsRoot.appendChild(card);
    });
    const questionCard = h('div', { class: 'aa-question-card aa-question-reveal' },
      h('div', { class: 'aa-question-text', text: q.q }),
      optsRoot
    );

    const summary = h('div', { class: 'aa-reveal-summary' });
    const myResult = result.perPlayer && result.perPlayer[myId];
    if (myResult) {
      const appliedDelta = (typeof myResult.appliedDelta === 'number') ? myResult.appliedDelta : (myResult.delta || 0);
      const card = h('div', { class: 'aa-my-result' + (myResult.correct ? ' correct' : ' wrong') },
        h('div', { class: 'aa-my-status' },
          myResult.correct ? '◆ CORRECT ◆' : '✕ WRONG ✕',
          myResult.correct && myResult.speedBonus > 0
            ? h('span', { class: 'aa-speed-bonus', text: '+' + myResult.speedBonus + ' SPEED' })
            : null
        ),
        h('div', { class: 'aa-my-action', text: '> ' + actionLabel(myResult.action) +
          (myResult.action === 'attack' ? ' (ATK LV' + (myResult.atkLevel || 1) + ')'
           : myResult.action === 'defend' ? ' (DEF LV' + (myResult.defLevel || 1) + ')'
           : '') }),
        h('div', {
          class: 'aa-my-delta' +
            (appliedDelta > 0 ? ' positive' : appliedDelta < 0 ? ' negative' : '')
        }, (appliedDelta >= 0 ? '+' : '') + appliedDelta + '$')
      );
      summary.appendChild(card);
    }

    // Savaş özetleri: bana ilgili olanlar (saldıran ya da hedef)
    const perPlayer = result.perPlayer || {};
    const myBattleSummary = h('div', { class: 'aa-battle-summary' });
    let hasBattleInfo = false;

    // Benim saldırım
    const myRes = perPlayer[myId];
    if (myRes && myRes.effectiveAttack && myRes.target) {
      hasBattleInfo = true;
      const tgt = perPlayer[myRes.target];
      const outcomeText = myRes.battleOutcome === 'win'
        ? '▲ SALDIRI KAZANDI · ' + myRes.transfer + '$ ÇALINDI'
        : myRes.battleOutcome === 'win_empty'
        ? '▲ KAZANDIN AMA HEDEF BATTI · 0$'
        : myRes.battleOutcome === 'loss'
        ? '▼ SAVUNMA KAZANDI · ' + myRes.transfer + '$ KAYIP'
        : '◆ BERABERE ◆';

      myBattleSummary.appendChild(h('div', { class: 'aa-battle-title' },
        'HEDEF: ', h('span', { text: tgt ? tgt.name.toUpperCase() : '?' })
      ));
      myBattleSummary.appendChild(
        h('div', { class: 'aa-battle-vs' },
          h('div', { class: 'aa-battle-side attack' },
            h('div', { class: 'aa-battle-side-label', text: 'ATK' }),
            h('div', { class: 'aa-battle-side-value', text: String(myRes.atkLevel || 1) })
          ),
          h('div', { class: 'aa-battle-vs-mid', text: 'VS' }),
          h('div', { class: 'aa-battle-side defend' },
            h('div', { class: 'aa-battle-side-label', text: 'DEF' }),
            h('div', { class: 'aa-battle-side-value', text: String(myRes.def || 0) })
          )
        )
      );
      myBattleSummary.appendChild(
        h('div', {
          class: 'aa-battle-result ' + (
            (myRes.battleOutcome === 'win' || myRes.battleOutcome === 'win_empty') ? 'atk-wins' :
            myRes.battleOutcome === 'loss' ? 'def-wins' : 'tie'
          )
        }, outcomeText)
      );
    }

    // Bana yapılan saldırılar
    Object.keys(perPlayer).forEach(attackerId => {
      if (attackerId === myId) return;
      const att = perPlayer[attackerId];
      if (!att.effectiveAttack || att.target !== myId) return;
      hasBattleInfo = true;

      const outcomeText = att.battleOutcome === 'win'
        ? '▲ SALDIRI KAZANDI · ' + att.transfer + '$ ÇALINDI'
        : att.battleOutcome === 'win_empty'
        ? '▲ SALDIRAN KAZANDI AMA BATIN · 0$'
        : att.battleOutcome === 'loss'
        ? '▼ SAVUNMAN TUTTU · ' + att.transfer + '$ KAZANDIN'
        : '◆ BERABERE ◆';

      myBattleSummary.appendChild(h('div', { class: 'aa-battle-title' },
        h('span', { text: att.name.toUpperCase() }), ' sana saldırdı'
      ));
      myBattleSummary.appendChild(
        h('div', { class: 'aa-battle-vs' },
          h('div', { class: 'aa-battle-side attack' },
            h('div', { class: 'aa-battle-side-label', text: 'ATK' }),
            h('div', { class: 'aa-battle-side-value', text: String(att.atkLevel || 1) })
          ),
          h('div', { class: 'aa-battle-vs-mid', text: 'VS' }),
          h('div', { class: 'aa-battle-side defend' },
            h('div', { class: 'aa-battle-side-label', text: 'DEF' }),
            h('div', { class: 'aa-battle-side-value', text: String(att.def || 0) })
          )
        )
      );
      myBattleSummary.appendChild(
        h('div', {
          class: 'aa-battle-result ' + (
            (att.battleOutcome === 'win' || att.battleOutcome === 'win_empty') ? 'atk-wins' :
            att.battleOutcome === 'loss' ? 'def-wins' : 'tie'
          )
        }, outcomeText)
      );
    });

    container.appendChild(h('div', { class: 'aa-game aa-reveal-phase' },
      topBar,
      leaderboard,
      h('div', { class: 'aa-game-main' }, questionCard, summary, hasBattleInfo ? myBattleSummary : null)
    ));

    renderLeaderboard();
  }

  // ── FINAL SCREEN ──
  function renderFinalScreen() {
    if (hostTickInterval) { clearInterval(hostTickInterval); hostTickInterval = null; }
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
        h('div', { class: 'aa-podium-name', text: p.name }),
        h('div', { class: 'aa-podium-gold', text: (p.gold || 0) + ' 💰' })
      );
      podium.appendChild(slot);
    });

    const me = players[myRank - 1];
    const myRankText = me
      ? '> RANK ' + pad2(myRank) + ' · ' + (me.gold || 0) + '$ TOPLAM <'
      : '';

    const titleText = iWon ? '★ WINNER ★' : (myRank <= 3 ? 'GOOD RUN' : 'GAME OVER');
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

    if (typeof AudioManager !== 'undefined' && AudioManager.play) {
      try { AudioManager.play('complete'); } catch (e) {}
    }
    if (typeof Particles !== 'undefined' && Particles.celebrate && (iWon || myRank <= 3)) {
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

  // ── TICK (faz ilerletme) ──
  function ensureTick() {
    if (hostTickInterval) return;
    hostTickInterval = setInterval(tickFrame, 1000);
  }

  // Fazı ilerletme yetkisi: normalde host. Ama host beklenen süreyi + HOST_GRACE_MS
  // kadar aştıysa (cihazı donmuş / sekme arka planda) en eski non-host oyuncu devralır.
  // Böylece host kilitlense bile oyun tıkanmaz. Transaction'lar çift-ilerletmeyi önler.
  function canDrive(elapsed, expectedDur) {
    if (!roomData) return false;
    if (isHost) return true;
    if (elapsed < expectedDur + HOST_GRACE_MS) return false;
    const players = roomData.players || {};
    const arr = Object.values(players).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    const backup = arr.find(p => p.id !== roomData.hostId);
    return !!(backup && backup.id === myId);
  }

  async function tickFrame() {
    if (!roomData) return;
    if (roomData.state !== 'PLAYING') return;
    const phase = roomData.roundPhase;

    if (phase === 'PREP') {
      const prepElapsed = Date.now() - (roomData.prepStartedAt || 0);
      if (prepElapsed >= PREP_DURATION_MS && canDrive(prepElapsed, PREP_DURATION_MS)) {
        try {
          // Atomik: yalnız PREP→CHOICE geçişini ilk yapan kazanır
          const tx = await roomRef.child('roundPhase').transaction(cur => (cur === 'PREP' ? 'CHOICE' : undefined));
          if (tx.committed && tx.snapshot.val() === 'CHOICE') {
            await roomRef.update({ roundStartedAt: Date.now() });
          }
        } catch (e) { console.error('PREP→CHOICE error', e); }
      }
      return;
    }

    const startedAt = roomData.roundStartedAt;
    if (!startedAt) return;
    const elapsed = Date.now() - startedAt;

    if (phase === 'CHOICE') {
      const players = roomData.players || {};
      const ids = Object.keys(players);
      const r = roomData.currentRound;
      const allChosen = ids.length > 0 && ids.every(id => {
        const c = players[id].currentChoice;
        return c && c.round === r;
      });
      const dur = roomData.choiceDurationMs ?? CHOICE_DURATION_MS;
      // Herkes cevapladıysa host hemen çözer; süre dolunca host (host donmuşsa grace
      // sonrası yedek) çözer. resolveRound deterministik + idempotent → çift-çağrı güvenli.
      if ((allChosen && isHost) || (elapsed >= dur && canDrive(elapsed, dur))) {
        await resolveRound();
      }
    } else if (phase === 'REVEAL') {
      if (elapsed >= REVEAL_DURATION_MS && canDrive(elapsed, REVEAL_DURATION_MS)) {
        await advanceRound();
      }
    }
  }

  async function resolveRound() {
    // Yetki tickFrame/canDrive'da verilir (host ya da donmuş-host yedeği). Bu fonksiyon
    // deterministik + fresh-read idempotent: iki client çalıştırsa bile aynı sonucu
    // yazar, çift-resolve zarar vermez.
    if (!roomRef || !roomData) return;
    if (roomData.roundPhase !== 'CHOICE') return;
    if (roomData.lastResult && roomData.lastResult.round === roomData.currentRound) return;

    try {
      // Taze snapshot — listener gecikmeli olabilir, choice'lar ve atk/def kesin oku
      const freshSnap = await roomRef.once('value');
      const fresh = freshSnap.val();
      if (!fresh) return;
      if (fresh.roundPhase !== 'CHOICE') return;
      if (fresh.lastResult && fresh.lastResult.round === fresh.currentRound) return;

      const r = fresh.currentRound;
      const q = fresh.questions[r - 1];
      if (!q) { console.error('Question missing for round', r); return; }
      const players = fresh.players || {};
      const ids = Object.keys(players);
      if (ids.length === 0) return;

      // Lider: lastResult için bilgi, artık saldırı hedefi değil
      const sorted = ids.map(id => players[id]).sort((a, b) => {
        const d = (b.gold || 0) - (a.gold || 0);
        if (d !== 0) return d;
        return (a.joinedAt || 0) - (b.joinedAt || 0);
      });
      const leaderId = sorted[0] ? sorted[0].id : null;

      // 1) Per-player normalize
      const perPlayer = {};
      ids.forEach(id => {
        const p = players[id];
        const c = (p.currentChoice && p.currentChoice.round === r) ? p.currentChoice : null;
        const answer = c && typeof c.answer === 'number' ? c.answer : null;
        const rawAction = c && c.action ? c.action : 'pass';
        const action = (rawAction === 'attack' || rawAction === 'defend') ? rawAction : 'pass';
        const answerTime = c && typeof c.answerTime === 'number' ? c.answerTime : null;
        const targetId = c && c.targetId ? c.targetId : null;
        const correct = answer !== null && answer === q.correctIdx;
        // Saldırı geçerli: doğru cevap + attack + hedef seçilmiş + hedef oyuncu var
        const effectiveAttack = correct && action === 'attack' && targetId && !!players[targetId];
        perPlayer[id] = {
          name: p.name,
          atkLevel: p.atkLevel || START_ATK,
          defLevel: p.defLevel || START_DEF,
          answer, action, answerTime, correct, targetId, effectiveAttack,
          rank: null,
          speedBonus: 0,
          battleDelta: 0,
          delta: 0,
          target: null,
          targetName: null,
          def: 0,
          diff: 0,
          transfer: 0,
          battleOutcome: 'none'
        };
      });

      // 2) Hız bonusu — doğru cevap verenleri answerTime'a göre sırala, rank-bazlı ödül
      const correctList = ids
        .filter(id => perPlayer[id].correct && perPlayer[id].answerTime !== null)
        .sort((a, b) => perPlayer[a].answerTime - perPlayer[b].answerTime);
      correctList.forEach((id, idx) => {
        const rank = idx + 1;
        perPlayer[id].rank = rank;
        perPlayer[id].speedBonus = bonusForRank(rank);
      });

      // 3) 1v1 Çatışma — her saldıran kendi seçtiği hedefe karşı bağımsız
      // Working gold: hedef altını birden fazla saldırıya karşı doğru biriktirir
      const workingGold = {};
      ids.forEach(id => { workingGold[id] = players[id].gold || 0; });

      // Hızlı doğru cevap verenler önce saldırır (answerTime'a göre sırala)
      const attackerIds = ids
        .filter(id => perPlayer[id].effectiveAttack)
        .sort((a, b) => (perPlayer[a].answerTime || 0) - (perPlayer[b].answerTime || 0));

      attackerIds.forEach(aid => {
        const me = perPlayer[aid];
        const tId = me.targetId;
        const target = perPlayer[tId];
        if (!target) return;

        me.target = tId;
        me.targetName = players[tId] ? players[tId].name : '?';

        // Savun seçtiyse defLevel aktif, aksi halde 0
        const def = target.action === 'defend' ? target.defLevel : 0;
        const diff = me.atkLevel - def;
        const baseTransfer = Math.abs(diff) * TRANSFER_PER_DIFF;

        me.def = def;
        me.diff = diff;

        if (diff > 0) {
          // Saldırı kazandı: hedeften al (hedefin 0 altını varsa hiçbir şey gelmez)
          const actual = Math.min(baseTransfer, workingGold[tId]);
          me.battleDelta += actual;
          target.battleDelta -= actual;
          workingGold[aid] += actual;
          workingGold[tId] = Math.max(0, workingGold[tId] - actual);
          me.battleOutcome = actual > 0 ? 'win' : 'win_empty';
          me.transfer = actual;
        } else if (diff < 0) {
          // Savunma kazandı: saldıran kaybeder, savunmacı alır
          const actual = Math.min(baseTransfer, workingGold[aid]);
          me.battleDelta -= actual;
          target.battleDelta += actual;
          workingGold[aid] = Math.max(0, workingGold[aid] - actual);
          workingGold[tId] += actual;
          me.battleOutcome = 'loss';
          me.transfer = actual;
        } else {
          me.battleOutcome = 'tie';
          me.transfer = 0;
        }
      });

      // 4) Toplam delta = hız bonusu + battleDelta
      ids.forEach(id => {
        const me = perPlayer[id];
        me.delta = me.speedBonus + me.battleDelta;
      });

      // 5) Yeni altın değerleri (negatife düşmesin)
      const updates = {};
      ids.forEach(id => {
        const oldGold = players[id].gold || 0;
        const newGold = Math.max(0, oldGold + perPlayer[id].delta);
        perPlayer[id].appliedDelta = newGold - oldGold;
        perPlayer[id].newGold = newGold;
        updates['players/' + id + '/gold'] = newGold;
      });

      updates['lastResult'] = {
        round: r,
        correctIdx: q.correctIdx,
        leaderId: leaderId || null,
        perPlayer
      };
      updates['roundPhase'] = 'REVEAL';
      updates['roundStartedAt'] = Date.now();

      await roomRef.update(updates);
    } catch (e) {
      console.error('resolveRound error', e);
    }
  }

  async function advanceRound() {
    // Yetki tickFrame/canDrive'da. Çift-ilerletmeyi (round atlama) önlemek için
    // currentRound transaction ile atomik artırılır — yalnız ilk geçen kazanır.
    if (!roomRef || !roomData) return;
    try {
      const r = roomData.currentRound;
      if (r >= (roomData.totalRounds ?? TOTAL_ROUNDS)) {
        await roomRef.child('state').transaction(cur => (cur === 'PLAYING' ? 'FINISHED' : undefined));
        return;
      }
      const tx = await roomRef.child('currentRound').transaction(cur => (cur === r ? r + 1 : undefined));
      if (!tx.committed) return; // başka bir client zaten ilerletti
      const updates = {
        roundPhase: 'PREP',
        prepStartedAt: Date.now()
      };
      const players = roomData.players || {};
      Object.keys(players).forEach(id => {
        updates['players/' + id + '/currentChoice'] = null;
      });
      await roomRef.update(updates);
    } catch (e) {
      console.error('advanceRound error', e);
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
