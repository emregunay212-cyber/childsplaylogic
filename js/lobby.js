/* ── Lobby UI Module ── */
const Lobby = (() => {
  let currentGameType = null;
  let container = null;
  let onGameStart = null;

  const TURKISH_KEYBOARD = [
    ['A','B','C','Ç','D','E','F','G','Ğ','H'],
    ['I','İ','J','K','L','M','N','O','Ö','P'],
    ['R','S','Ş','T','U','Ü','V','Y','Z','⌫']
  ];

  function show(gameType, gameArea, callbacks) {
    currentGameType = gameType;
    container = gameArea;
    onGameStart = callbacks?.onGameStart;
    container.innerHTML = '';
    renderMainMenu();
  }

  function hide() {
    Multiplayer.offAll();
    Multiplayer.disconnect();
    if (container) container.innerHTML = '';
  }

  // ── Main Menu ──
  function renderMainMenu() {
    const gameName = TR.games[currentGameType] || currentGameType;
    const icon = currentGameType === 'kelime-tahmin' ? '🔤' : currentGameType === 'harf-tahmin' ? '🔡' : '🤖';
    container.innerHTML = `
      <div class="lobby-main">
        <div class="lobby-header">
          <span class="lobby-icon">${icon}</span>
          <h2>${gameName}</h2>
          <span class="lobby-badge">2 Oyuncu</span>
        </div>
        <div class="lobby-name-row">
          <label>${TR.mp.yourName}</label>
          <input type="text" class="lobby-name-input" maxlength="20" placeholder="Adını yaz..." value="${localStorage.getItem('mp_name') || ''}">
        </div>
        <div class="lobby-buttons">
          <button class="lobby-btn lobby-btn-create" data-action="create">
            <span class="lobby-btn-icon">🏠</span>
            <span>${TR.mp.createRoom}</span>
          </button>
          <button class="lobby-btn lobby-btn-join" data-action="join">
            <span class="lobby-btn-icon">🚪</span>
            <span>${TR.mp.joinRoom}</span>
          </button>
          <button class="lobby-btn lobby-btn-quick" data-action="quick">
            <span class="lobby-btn-icon">⚡</span>
            <span>${TR.mp.quickPlay}</span>
          </button>
        </div>
        <button class="lobby-back-btn" data-action="back">← ${TR.mp.back}</button>
      </div>`;

    container.querySelector('[data-action="create"]').onclick = () => connectAndDo(renderCreateForm);
    container.querySelector('[data-action="join"]').onclick = () => connectAndDo(renderLobbyList);
    container.querySelector('[data-action="quick"]').onclick = () => connectAndDo(doQuickPlay);
    container.querySelector('[data-action="back"]').onclick = () => { hide(); App.showHub(); };
  }

  async function connectAndDo(fn) {
    saveName();
    try {
      showLoading(TR.mp.connecting);
      await Multiplayer.connect();
      const name = localStorage.getItem('mp_name') || 'Oyuncu';
      Multiplayer.send('SET_NAME', { name });
      fn();
    } catch {
      showError(TR.mp.connectionError);
    }
  }

  function saveName() {
    const input = container.querySelector('.lobby-name-input');
    if (input && input.value.trim()) {
      localStorage.setItem('mp_name', input.value.trim());
    }
  }

  // ── Create Lobby ──
  function renderCreateForm() {
    const isKod = currentGameType === 'kod-macerasi' || currentGameType === 'satranc' || currentGameType === 'penalti-mp';
    const isSatranc = currentGameType === 'satranc';
    const isPenalti = currentGameType === 'penalti-mp';

    const settingsHTML = isPenalti ? `
        <div class="lobby-setting">
          <p style="text-align:center;color:#888;font-size:0.9rem;">⚽ 5'er penaltı atışı + seri penaltı</p>
        </div>
    ` : isSatranc ? `
        <div class="lobby-setting">
          <label>Renk Seçimi:</label>
          <div class="pill-selector" data-name="hostColor">
            <button class="pill active" data-value="white">⬜ Beyaz</button>
            <button class="pill" data-value="black">⬛ Siyah</button>
            <button class="pill" data-value="random">🎲 Rastgele</button>
          </div>
        </div>
    ` : isKod ? `
        <div class="lobby-setting">
          <label>${TR.kodMacerasi.gridSize}</label>
          <div class="pill-selector" data-name="gridSize">
            ${[5,6,7].map(n => `<button class="pill ${n===7?'active':''}" data-value="${n}">${n}x${n}</button>`).join('')}
          </div>
        </div>
    ` : `
        <div class="lobby-setting">
          <label>${TR.mp.letterCount}</label>
          <div class="pill-selector" data-name="wordLength">
            ${[3,4,5,6,7,8].map(n => `<button class="pill ${n===5?'active':''}" data-value="${n}">${n}</button>`).join('')}
          </div>
        </div>
        <div class="lobby-setting">
          <label>${TR.mp.turnCount}</label>
          <div class="pill-selector" data-name="maxTurns">
            ${[5,10,15,999].map(n => `<button class="pill ${n===10?'active':''}" data-value="${n}">${n===999?'∞':n}</button>`).join('')}
          </div>
        </div>
    `;

    container.innerHTML = `
      <div class="lobby-create">
        <h2>${TR.mp.roomSettings}</h2>
        ${settingsHTML}
        <button class="lobby-btn lobby-btn-create lobby-submit-btn">${TR.mp.create}</button>
        <button class="lobby-back-btn" data-action="back">← ${TR.mp.back}</button>
      </div>`;

    container.querySelectorAll('.pill-selector').forEach(sel => {
      sel.querySelectorAll('.pill').forEach(pill => {
        pill.onclick = () => {
          sel.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        };
      });
    });

    container.querySelector('.lobby-submit-btn').onclick = () => {
      if (isPenalti) {
        Multiplayer.on('LOBBY_CREATED', (data) => renderWaitingRoom(data.lobbyId));
        Multiplayer.send('CREATE_LOBBY', { gameType: currentGameType });
      } else if (isSatranc) {
        let hostColor = container.querySelector('[data-name="hostColor"] .active')?.dataset.value || 'white';
        if (hostColor === 'random') hostColor = Math.random() < 0.5 ? 'white' : 'black';
        Multiplayer.on('LOBBY_CREATED', (data) => renderWaitingRoom(data.lobbyId));
        Multiplayer.send('CREATE_LOBBY', { gameType: currentGameType, hostColor });
      } else if (isKod) {
        const gridSize = parseInt(container.querySelector('[data-name="gridSize"] .active').dataset.value);
        Multiplayer.on('LOBBY_CREATED', (data) => renderWaitingRoom(data.lobbyId));
        Multiplayer.send('CREATE_LOBBY', { gameType: currentGameType, gridSize });
      } else {
        const wordLength = parseInt(container.querySelector('[data-name="wordLength"] .active').dataset.value);
        const maxTurns = parseInt(container.querySelector('[data-name="maxTurns"] .active').dataset.value);
        Multiplayer.on('LOBBY_CREATED', (data) => renderWaitingRoom(data.lobbyId));
        Multiplayer.send('CREATE_LOBBY', { gameType: currentGameType, wordLength, maxTurns });
      }
    };

    container.querySelector('[data-action="back"]').onclick = renderMainMenu;
  }

  // ── Waiting Room ──
  function renderWaitingRoom(lobbyId) {
    Multiplayer.offAll();
    container.innerHTML = `
      <div class="lobby-waiting">
        <h2>${TR.mp.waitingRoom}</h2>
        <div class="lobby-code-box">
          <span class="lobby-code-label">${TR.mp.roomCode}</span>
          <span class="lobby-code">${lobbyId}</span>
        </div>
        <div class="lobby-waiting-anim">
          <div class="waiting-dots"><span>.</span><span>.</span><span>.</span></div>
          <p>${TR.mp.waitingForOpponent}</p>
        </div>
        <button class="lobby-back-btn" data-action="cancel">${TR.mp.cancel}</button>
      </div>`;

    Multiplayer.on('PLAYER_JOINED', (data) => {
      if (currentGameType === 'kod-macerasi' || currentGameType === 'satranc' || currentGameType === 'penalti-mp') {
        // Kod macerasi: kelime girisi yok, GAME_START bekle
        Multiplayer.on('GAME_START', (gameData) => {
          Multiplayer.off('GAME_START');
          Multiplayer.off('PLAYER_JOINED');
          if (onGameStart) onGameStart(gameData);
        });
      } else {
        renderWordSetup(data);
      }
    });

    // Also listen for GAME_START directly (for joiner in kod-macerasi)
    if (currentGameType === 'kod-macerasi' || currentGameType === 'satranc') {
      Multiplayer.on('GAME_START', (gameData) => {
        Multiplayer.off('GAME_START');
        Multiplayer.off('PLAYER_JOINED');
        if (onGameStart) onGameStart(gameData);
      });
    }

    container.querySelector('[data-action="cancel"]').onclick = () => {
      Multiplayer.send('LEAVE_LOBBY');
      renderMainMenu();
    };
  }

  // ── Lobby List ──
  function renderLobbyList() {
    Multiplayer.offAll();
    container.innerHTML = `
      <div class="lobby-list-screen">
        <h2>${TR.mp.availableRooms}</h2>
        <div class="lobby-list-container">
          <div class="lobby-loading">${TR.mp.loading}</div>
        </div>
        <button class="lobby-refresh-btn">${TR.mp.refresh}</button>
        <button class="lobby-back-btn" data-action="back">← ${TR.mp.back}</button>
      </div>`;

    Multiplayer.on('LOBBY_LIST', (data) => {
      const listContainer = container.querySelector('.lobby-list-container');
      if (!data.lobbies || data.lobbies.length === 0) {
        listContainer.innerHTML = `<div class="lobby-empty">${TR.mp.noRooms}</div>`;
        return;
      }
      listContainer.innerHTML = data.lobbies.map(l => `
        <div class="lobby-list-card">
          <div class="lobby-list-info">
            <span class="lobby-list-icon">${l.gameType === 'penalti-mp' ? '⚽' : l.gameType === 'kod-macerasi' ? '🤖' : l.gameType === 'kelime-tahmin' ? '🔤' : l.gameType === 'satranc' ? '♟️' : '🔡'}</span>
            <div>
              <strong>${l.hostName}</strong>
              <span class="lobby-list-detail">${l.gameType === 'penalti-mp' ? '5 atış' : l.gameType === 'kod-macerasi' ? l.gridSize+'x'+l.gridSize+' grid' : l.gameType === 'satranc' ? 'Satranç' : l.wordLength+' harf · '+(l.maxTurns>=999?'∞':l.maxTurns)+' tur'}</span>
            </div>
          </div>
          <button class="lobby-join-btn" data-id="${l.id}">${TR.mp.join}</button>
        </div>`).join('');

      listContainer.querySelectorAll('.lobby-join-btn').forEach(btn => {
        btn.onclick = () => {
          let joinedData = null;
          Multiplayer.on('PLAYER_JOINED', (data) => {
            joinedData = data;
          });
          if (currentGameType === 'kod-macerasi' || currentGameType === 'satranc' || currentGameType === 'penalti-mp') {
            Multiplayer.on('GAME_START', (gameData) => {
              Multiplayer.offAll();
              if (onGameStart) onGameStart(gameData);
            });
          } else {
            Multiplayer.on('WORD_SETUP', (data) => {
              Multiplayer.offAll();
              doRenderWordSetup(data.wordLength, joinedData?.opponentName || '?');
            });
          }
          Multiplayer.on('ERROR', (data) => showError(data.message));
          Multiplayer.send('JOIN_LOBBY', { lobbyId: btn.dataset.id });
        };
      });
    });

    Multiplayer.send('LIST_LOBBIES');
    container.querySelector('.lobby-refresh-btn').onclick = () => Multiplayer.send('LIST_LOBBIES');
    container.querySelector('[data-action="back"]').onclick = renderMainMenu;
  }

  // ── Quick Play ──
  function doQuickPlay() {
    Multiplayer.offAll();
    showLoading(TR.mp.searching);

    let joinedData = null;
    Multiplayer.on('LOBBY_CREATED', (data) => {
      if (data.quickPlay) renderWaitingRoom(data.lobbyId);
    });
    Multiplayer.on('PLAYER_JOINED', (data) => {
      joinedData = data;
    });
    if (currentGameType === 'kod-macerasi' || currentGameType === 'satranc') {
      Multiplayer.on('GAME_START', (gameData) => {
        Multiplayer.offAll();
        if (onGameStart) onGameStart(gameData);
      });
    } else {
      Multiplayer.on('WORD_SETUP', (data) => {
        Multiplayer.offAll();
        doRenderWordSetup(data.wordLength, joinedData?.opponentName || '?');
      });
    }
    Multiplayer.on('ERROR', (data) => {
      // Lobi bulunamadı/doluysa tekrar dene (yeni lobi oluşturulacak)
      showLoading(TR.mp.searching);
      Multiplayer.send('QUICK_PLAY', { gameType: currentGameType });
    });
    Multiplayer.send('QUICK_PLAY', { gameType: currentGameType });
  }

  // ── Word Setup ──
  // Called when PLAYER_JOINED is received. WORD_SETUP arrives immediately after.
  function renderWordSetup(joinData) {
    Multiplayer.offAll();

    Multiplayer.on('WORD_SETUP', (data) => {
      doRenderWordSetup(data.wordLength, joinData.opponentName);
    });

    // Also listen for the case where we ARE the joiner and WORD_SETUP came bundled
    // Show a loading state while waiting
    showLoading(TR.mp.loading);
  }

  function doRenderWordSetup(wordLength, opponentName) {
    Multiplayer.offAll();
    let currentWord = '';

    container.innerHTML = `
      <div class="word-setup">
        <h2>${TR.mp.writeWord}</h2>
        <p class="word-setup-info">${TR.mp.writeWordDesc.replace('{n}', wordLength)}</p>
        <p class="word-setup-opponent">${TR.mp.opponent}: <strong>${opponentName || '?'}</strong></p>
        <div class="word-boxes">${Array(wordLength).fill('<div class="word-box"></div>').join('')}</div>
        <div class="tr-keyboard">
          ${TURKISH_KEYBOARD.map(row => `<div class="kb-row">${row.map(k =>
            `<button class="kb-key" data-key="${k}">${k}</button>`
          ).join('')}</div>`).join('')}
        </div>
        <button class="lobby-btn lobby-btn-create lobby-submit-btn" disabled>${TR.mp.send}</button>
        <div class="word-setup-status"></div>
      </div>`;

    const boxes = container.querySelectorAll('.word-box');
    const submitBtn = container.querySelector('.lobby-submit-btn');
    const statusEl = container.querySelector('.word-setup-status');

    function updateBoxes() {
      boxes.forEach((b, i) => {
        b.textContent = currentWord[i] || '';
        b.classList.toggle('filled', !!currentWord[i]);
      });
      submitBtn.disabled = currentWord.length !== wordLength;
    }

    container.querySelectorAll('.kb-key').forEach(key => {
      key.onclick = () => {
        const k = key.dataset.key;
        if (k === '⌫') {
          currentWord = currentWord.slice(0, -1);
        } else if (currentWord.length < wordLength) {
          currentWord += k;
        }
        updateBoxes();
      };
    });

    submitBtn.onclick = () => {
      if (currentWord.length !== wordLength) return;
      Multiplayer.send('SET_WORD', { word: currentWord });
      submitBtn.disabled = true;
      submitBtn.textContent = TR.mp.waiting;
    };

    Multiplayer.on('WORD_ACCEPTED', () => {
      statusEl.textContent = TR.mp.wordAccepted;
      statusEl.className = 'word-setup-status accepted';
    });

    Multiplayer.on('OPPONENT_READY', () => {
      statusEl.textContent = TR.mp.opponentReady;
    });

    Multiplayer.on('GAME_START', (data) => {
      Multiplayer.offAll();
      if (onGameStart) onGameStart(data);
    });

    Multiplayer.on('ERROR', (data) => {
      statusEl.textContent = data.message;
      statusEl.className = 'word-setup-status error';
      submitBtn.disabled = false;
      submitBtn.textContent = TR.mp.send;
    });

    Multiplayer.on('OPPONENT_LEFT', () => {
      showError(TR.mp.opponentLeft);
      setTimeout(renderMainMenu, 2000);
    });
  }

  // ── Helpers ──
  function showLoading(msg) {
    container.innerHTML = `
      <div class="lobby-loading-screen">
        <div class="waiting-dots"><span>.</span><span>.</span><span>.</span></div>
        <p>${msg}</p>
      </div>`;
  }

  function showError(msg) {
    const existing = container.querySelector('.lobby-error-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'lobby-error-toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function getTurkishKeyboard() { return TURKISH_KEYBOARD; }

  return { show, hide, getTurkishKeyboard };
})();
