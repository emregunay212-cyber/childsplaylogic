/* ── Kelime Tahmin (Word Guessing - Wordle Style) ── */
const KelimeTahmin = (() => {
  const id = 'kelime-tahmin';
  const isMultiplayer = true;
  let container = null;
  let gameData = null;
  let currentGuess = '';
  let myGuesses = [];
  let opponentGuessCount = 0;
  let isMyTurn = false;
  let gameOver = false;

  const KEYBOARD = [
    ['A','B','C','Ç','D','E','F','G','Ğ','H'],
    ['I','İ','J','K','L','M','N','O','Ö','P'],
    ['R','S','Ş','T','U','Ü','V','Y','Z','⌫']
  ];

  function init(gameArea, data) {
    container = gameArea;
    gameData = data;
    currentGuess = '';
    myGuesses = [];
    opponentGuessCount = 0;
    isMyTurn = data.currentTurn === (data.yourRole === 'host' ? 'host' : 'guest') ||
               (data.yourRole === 'host' && data.currentTurn === 'host') ||
               (data.yourRole === 'guest' && data.currentTurn === 'guest');
    gameOver = false;
    render();
    setupListeners();
  }

  function render() {
    const maxRows = gameData.maxTurns;
    container.innerHTML = `
      <div class="mp-game kelime-tahmin-game">
        <div class="mp-toolbar">
          <button class="mp-home-btn" id="mp-leave">🏠</button>
          <div class="mp-title">
            <h2>🔤 ${TR.games['kelime-tahmin']}</h2>
          </div>
          <div class="mp-turn-info">
            <span class="mp-turn-badge ${isMyTurn ? 'your-turn' : 'wait-turn'}">
              ${isMyTurn ? TR.mp.yourTurn : TR.mp.opponentTurn}
            </span>
          </div>
        </div>

        <div class="mp-opponent-info">
          <span>🆚 ${gameData.opponentName}</span>
          <span class="opponent-progress">${TR.mp.opponentGuesses}: ${opponentGuessCount}</span>
        </div>

        <div class="guess-grid" id="guess-grid">
          ${renderGrid()}
        </div>

        <div class="tr-keyboard mp-keyboard" id="mp-keyboard">
          ${KEYBOARD.map(row => `<div class="kb-row">${row.map(k =>
            `<button class="kb-key" data-key="${k}" ${!isMyTurn && k !== '⌫' ? 'disabled' : ''}>${k}</button>`
          ).join('')}</div>`).join('')}
        </div>

        <button class="mp-guess-btn" id="mp-guess-btn" ${!isMyTurn || currentGuess.length !== gameData.wordLength ? 'disabled' : ''}>
          ${TR.mp.guess}
        </button>
      </div>`;

    container.querySelector('#mp-leave').onclick = () => {
      Multiplayer.send('LEAVE_LOBBY');
      Multiplayer.offAll();
      App.showHub();
    };

    container.querySelectorAll('.kb-key').forEach(key => {
      key.onclick = () => handleKey(key.dataset.key);
    });

    container.querySelector('#mp-guess-btn').onclick = submitGuess;
  }

  function renderGrid() {
    const rows = [];
    // My previous guesses
    for (const g of myGuesses) {
      rows.push(`<div class="guess-row completed">${g.results.map(r =>
        `<div class="guess-cell ${r.status}">${r.letter}</div>`
      ).join('')}</div>`);
    }
    // Current input row (if not game over)
    if (!gameOver && myGuesses.length < gameData.maxTurns) {
      const cells = [];
      for (let i = 0; i < gameData.wordLength; i++) {
        cells.push(`<div class="guess-cell ${i < currentGuess.length ? 'typed' : 'empty'}">${currentGuess[i] || ''}</div>`);
      }
      rows.push(`<div class="guess-row current">${cells.join('')}</div>`);
    }
    // Empty future rows
    const remaining = gameData.maxTurns - myGuesses.length - (gameOver ? 0 : 1);
    for (let i = 0; i < Math.max(0, remaining); i++) {
      rows.push(`<div class="guess-row future">${Array(gameData.wordLength).fill('<div class="guess-cell empty"></div>').join('')}</div>`);
    }
    return rows.join('');
  }

  function handleKey(key) {
    if (gameOver || !isMyTurn) return;
    if (key === '⌫') {
      currentGuess = currentGuess.slice(0, -1);
    } else if (currentGuess.length < gameData.wordLength) {
      currentGuess += key;
    }
    updateUI();
  }

  function submitGuess() {
    if (gameOver || !isMyTurn || currentGuess.length !== gameData.wordLength) return;
    Multiplayer.send('GUESS_WORD', { guess: currentGuess });
    isMyTurn = false;
    updateTurnDisplay();
  }

  function updateUI() {
    const grid = container.querySelector('#guess-grid');
    if (grid) grid.innerHTML = renderGrid();
    const btn = container.querySelector('#mp-guess-btn');
    if (btn) btn.disabled = !isMyTurn || currentGuess.length !== gameData.wordLength;
  }

  function updateTurnDisplay() {
    const badge = container.querySelector('.mp-turn-badge');
    if (badge) {
      badge.className = `mp-turn-badge ${isMyTurn ? 'your-turn' : 'wait-turn'}`;
      badge.textContent = isMyTurn ? TR.mp.yourTurn : TR.mp.opponentTurn;
    }
    // Enable/disable keyboard
    container.querySelectorAll('.kb-key').forEach(key => {
      if (key.dataset.key !== '⌫') key.disabled = !isMyTurn;
    });
    const btn = container.querySelector('#mp-guess-btn');
    if (btn) btn.disabled = !isMyTurn || currentGuess.length !== gameData.wordLength;
  }

  function setupListeners() {
    Multiplayer.on('GUESS_RESULT', (data) => {
      if (data.guesser === gameData.yourRole) {
        myGuesses.push({ guess: data.guess, results: data.results });
        currentGuess = '';
        AudioManager.play(data.results.every(r => r.status === 'green') ? 'complete' : 'pop');
      } else {
        opponentGuessCount++;
        const opProg = container.querySelector('.opponent-progress');
        if (opProg) opProg.textContent = `${TR.mp.opponentGuesses}: ${opponentGuessCount}`;
      }
      updateUI();
    });

    Multiplayer.on('YOUR_TURN', () => {
      isMyTurn = true;
      updateTurnDisplay();
      AudioManager.play('tap');
    });

    Multiplayer.on('WAIT_TURN', () => {
      isMyTurn = false;
      updateTurnDisplay();
    });

    Multiplayer.on('GAME_OVER', (data) => {
      gameOver = true;
      isMyTurn = false;
      updateUI();
      renderGameOver(data);
    });

    Multiplayer.on('OPPONENT_LEFT', () => {
      gameOver = true;
      showToast(TR.mp.opponentLeft);
      setTimeout(() => App.showHub(), 3000);
    });

    Multiplayer.on('ERROR', (data) => {
      showToast(data.message);
      // Re-enable if it was a guess error
      if (data.code === 'INVALID_GUESS') {
        isMyTurn = true;
        updateTurnDisplay();
      }
    });
  }

  function renderGameOver(data) {
    let resultText, resultClass;
    if (data.winner === 'draw') {
      resultText = TR.mp.draw;
      resultClass = 'draw';
    } else if (data.winner === data.yourRole) {
      resultText = TR.mp.youWin;
      resultClass = 'win';
      Particles.celebrate();
    } else {
      resultText = TR.mp.youLose;
      resultClass = 'lose';
    }

    const overlay = document.createElement('div');
    overlay.className = 'mp-game-over-overlay';
    overlay.innerHTML = `
      <div class="mp-game-over ${resultClass}">
        <h2>${resultClass === 'win' ? '🎉' : resultClass === 'draw' ? '🤝' : '😢'} ${resultText}</h2>
        <div class="mp-game-over-words">
          <div class="mp-word-reveal">
            <span class="mp-word-label">${TR.mp.yourWord}:</span>
            <span class="mp-word-value">${data.yourRole === 'host' ? data.hostWord : data.guestWord}</span>
          </div>
          <div class="mp-word-reveal">
            <span class="mp-word-label">${TR.mp.opponentWord}:</span>
            <span class="mp-word-value">${data.yourRole === 'host' ? data.guestWord : data.hostWord}</span>
          </div>
        </div>
        <div class="mp-game-over-stats">
          <span>${TR.mp.you}: ${data.yourRole === 'host' ? data.hostGuesses : data.guestGuesses} ${TR.mp.guesses}</span>
          <span>${TR.mp.opponentLabel}: ${data.yourRole === 'host' ? data.guestGuesses : data.hostGuesses} ${TR.mp.guesses}</span>
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
