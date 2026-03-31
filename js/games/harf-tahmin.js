/* ── Harf Tahmin (Letter Guessing - Hangman Style) ── */
const HarfTahmin = (() => {
  const id = 'harf-tahmin';
  const isMultiplayer = true;
  let container = null;
  let gameData = null;
  let myRevealed = [];      // positions I've revealed of opponent's word
  let opRevealed = [];       // positions opponent revealed of my word
  let myGuessedLetters = []; // letters I've guessed
  let opGuessedLetters = []; // letters opponent guessed
  let myHits = new Set();
  let myMisses = new Set();
  let isMyTurn = false;
  let gameOver = false;

  const KEYBOARD = [
    ['A','B','C','Ç','D','E','F','G','Ğ','H'],
    ['I','İ','J','K','L','M','N','O','Ö','P'],
    ['R','S','Ş','T','U','Ü','V','Y','Z']
  ];

  function init(gameArea, data) {
    container = gameArea;
    gameData = data;
    myRevealed = Array(data.wordLength).fill(null);
    opRevealed = Array(data.wordLength).fill(null);
    myGuessedLetters = [];
    opGuessedLetters = [];
    myHits = new Set();
    myMisses = new Set();
    isMyTurn = (data.yourRole === 'host' && data.currentTurn === 'host') ||
               (data.yourRole === 'guest' && data.currentTurn === 'guest');
    gameOver = false;
    render();
    setupListeners();
  }

  function render() {
    const myRevealedCount = myRevealed.filter(x => x !== null).length;
    const opRevealedCount = opRevealed.filter(x => x !== null).length;

    container.innerHTML = `
      <div class="mp-game harf-tahmin-game">
        <div class="mp-toolbar">
          <button class="mp-home-btn" id="mp-leave">🏠</button>
          <div class="mp-title">
            <h2>🔡 ${TR.games['harf-tahmin']}</h2>
          </div>
          <div class="mp-turn-info">
            <span class="mp-turn-badge ${isMyTurn ? 'your-turn' : 'wait-turn'}">
              ${isMyTurn ? TR.mp.yourTurn : TR.mp.opponentTurn}
            </span>
          </div>
        </div>

        <div class="harf-section">
          <h3>${TR.mp.opponentWordTitle}</h3>
          <div class="harf-word-display" id="my-reveal">
            ${myRevealed.map((ch, i) =>
              `<div class="harf-cell ${ch ? 'revealed' : 'hidden'}">${ch || '?'}</div>`
            ).join('')}
          </div>
          <div class="harf-progress">${TR.mp.found}: ${myRevealedCount}/${gameData.wordLength}</div>
        </div>

        <div class="harf-divider">
          <span>🆚 ${gameData.opponentName}</span>
        </div>

        <div class="harf-section opponent-section">
          <h3>${TR.mp.yourWordTitle}</h3>
          <div class="harf-word-display" id="op-reveal">
            ${opRevealed.map((ch, i) =>
              `<div class="harf-cell ${ch ? 'revealed opponent-revealed' : 'hidden'}">${ch || '·'}</div>`
            ).join('')}
          </div>
          <div class="harf-progress">${TR.mp.found}: ${opRevealedCount}/${gameData.wordLength}</div>
        </div>

        <div class="tr-keyboard mp-keyboard" id="mp-keyboard">
          ${KEYBOARD.map(row => `<div class="kb-row">${row.map(k => {
            let cls = 'kb-key';
            if (myHits.has(k)) cls += ' kb-hit';
            else if (myMisses.has(k)) cls += ' kb-miss';
            const disabled = !isMyTurn || myHits.has(k) || myMisses.has(k);
            return `<button class="${cls}" data-key="${k}" ${disabled ? 'disabled' : ''}>${k}</button>`;
          }).join('')}</div>`).join('')}
        </div>
      </div>`;

    container.querySelector('#mp-leave').onclick = () => {
      Multiplayer.send('LEAVE_LOBBY');
      Multiplayer.offAll();
      App.showHub();
    };

    container.querySelectorAll('.kb-key').forEach(key => {
      key.onclick = () => guessLetter(key.dataset.key);
    });
  }

  function guessLetter(letter) {
    if (gameOver || !isMyTurn || myHits.has(letter) || myMisses.has(letter)) return;
    Multiplayer.send('GUESS_LETTER', { letter });
    // Sıra değişimini server'dan gelen event'e bırak
    // Doğru tahminse sıra değişmeyecek, yanlışsa WAIT_TURN gelecek
  }

  function updateTurnDisplay() {
    const badge = container.querySelector('.mp-turn-badge');
    if (badge) {
      badge.className = `mp-turn-badge ${isMyTurn ? 'your-turn' : 'wait-turn'}`;
      badge.textContent = isMyTurn ? TR.mp.yourTurn : TR.mp.opponentTurn;
    }
    container.querySelectorAll('.kb-key').forEach(key => {
      const k = key.dataset.key;
      key.disabled = !isMyTurn || myHits.has(k) || myMisses.has(k);
    });
  }

  function updateUI() {
    const myRevealedCount = myRevealed.filter(x => x !== null).length;
    const opRevealedCount = opRevealed.filter(x => x !== null).length;

    // Update my reveal cells
    const myRevealEl = container.querySelector('#my-reveal');
    if (myRevealEl) {
      myRevealEl.innerHTML = myRevealed.map((ch, i) =>
        `<div class="harf-cell ${ch ? 'revealed' : 'hidden'}">${ch || '?'}</div>`
      ).join('');
    }

    // Update opponent reveal cells
    const opRevealEl = container.querySelector('#op-reveal');
    if (opRevealEl) {
      opRevealEl.innerHTML = opRevealed.map((ch, i) =>
        `<div class="harf-cell ${ch ? 'revealed opponent-revealed' : 'hidden'}">${ch || '·'}</div>`
      ).join('');
    }

    // Update progress texts
    const progressEls = container.querySelectorAll('.harf-progress');
    if (progressEls[0]) progressEls[0].textContent = `${TR.mp.found}: ${myRevealedCount}/${gameData.wordLength}`;
    if (progressEls[1]) progressEls[1].textContent = `${TR.mp.found}: ${opRevealedCount}/${gameData.wordLength}`;

    // Update keyboard
    container.querySelectorAll('.kb-key').forEach(key => {
      const k = key.dataset.key;
      key.classList.remove('kb-hit', 'kb-miss');
      if (myHits.has(k)) key.classList.add('kb-hit');
      else if (myMisses.has(k)) key.classList.add('kb-miss');
      key.disabled = !isMyTurn || myHits.has(k) || myMisses.has(k);
    });

    // Update turn badge
    updateTurnDisplay();
  }

  function setupListeners() {
    Multiplayer.on('LETTER_RESULT', (data) => {
      if (data.guesser === gameData.yourRole) {
        // My guess result
        myGuessedLetters.push(data.letter);
        if (data.hit) {
          myHits.add(data.letter);
          data.positions.forEach(pos => { myRevealed[pos] = data.revealed[pos]; });
          isMyTurn = true; // Doğru bildi, sıra bende kalıyor
          AudioManager.play('success');
        } else {
          myMisses.add(data.letter);
          isMyTurn = false; // Yanlış bildi, sıra karşıya
          AudioManager.play('error');
        }
      } else {
        // Opponent's guess on my word
        opGuessedLetters.push(data.letter);
        if (data.hit) {
          data.positions.forEach(pos => { opRevealed[pos] = data.revealed[pos]; });
          isMyTurn = false; // Rakip doğru bildi, sıra onda kalıyor
        } else {
          isMyTurn = true; // Rakip yanlış bildi, sıra bana geçiyor
        }
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
      renderGameOver(data);
    });

    Multiplayer.on('OPPONENT_LEFT', () => {
      gameOver = true;
      showToast(TR.mp.opponentLeft);
      setTimeout(() => App.showHub(), 3000);
    });

    Multiplayer.on('ERROR', (data) => {
      showToast(data.message);
      if (data.code === 'ALREADY_GUESSED') {
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
