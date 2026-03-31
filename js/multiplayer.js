/* ── Multiplayer Connection Manager (Firebase RTDB) ── */
const Multiplayer = (() => {
  let playerId = null;
  let playerName = 'Oyuncu';
  let currentLobbyId = null;
  let currentRole = null; // 'host' | 'guest'
  let connected = false;
  const handlers = new Map();
  let lobbyRef = null;
  let lobbyListener = null;
  let messagesRef = null;
  let messagesListener = null;

  // Benzersiz oyuncu ID oluştur
  function generatePlayerId() {
    return 'P' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  }

  // Bağlantı (Firebase zaten bağlı, sadece ID oluştur)
  function connect() {
    return new Promise((resolve) => {
      if (!playerId) playerId = generatePlayerId();
      connected = true;
      // Presence sistemi
      const presenceRef = db.ref('players/' + playerId);
      presenceRef.set({ name: playerName, online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP });
      presenceRef.onDisconnect().remove();
      emit('WELCOME', { playerId });
      resolve();
    });
  }

  function disconnect() {
    if (currentLobbyId) {
      leaveLobby();
    }
    if (playerId) {
      db.ref('players/' + playerId).remove();
    }
    stopListening();
    connected = false;
    playerId = null;
    currentLobbyId = null;
    currentRole = null;
  }

  // Mesaj gönderme (RTDB üzerinden)
  function send(type, payload = {}) {
    const action = { type, ...payload };
    switch (type) {
      case 'SET_NAME': return setName(payload.name);
      case 'CREATE_LOBBY': return createLobby(payload);
      case 'LIST_LOBBIES': return listLobbies();
      case 'JOIN_LOBBY': return joinLobby(payload.lobbyId);
      case 'QUICK_PLAY': return quickPlay(payload.gameType);
      case 'SET_WORD': return setWord(payload.word);
      case 'GUESS_WORD': return guessWord(payload.guess);
      case 'GUESS_LETTER': return guessLetter(payload.letter);
      case 'SUBMIT_SEQUENCE': return submitSequence(payload.sequence);
      case 'SUBMIT_MOVE': return submitMove(payload.move);
      case 'LEAVE_LOBBY': return leaveLobby();
      default: console.warn('Unknown message type:', type);
    }
  }

  // Event handlers
  function on(type, callback) {
    if (!handlers.has(type)) handlers.set(type, []);
    handlers.get(type).push(callback);
  }

  function off(type, callback) {
    if (!handlers.has(type)) return;
    if (callback) {
      const cbs = handlers.get(type);
      const i = cbs.indexOf(callback);
      if (i >= 0) cbs.splice(i, 1);
    } else {
      handlers.delete(type);
    }
  }

  function offAll() {
    handlers.clear();
  }

  function emit(type, data = {}) {
    const cbs = handlers.get(type);
    if (cbs) cbs.forEach(cb => cb(data));
  }

  function isConnected() { return connected; }
  function getPlayerId() { return playerId; }

  // ── İşlem Fonksiyonları ──

  function setName(name) {
    if (name && typeof name === 'string') {
      playerName = name.trim().slice(0, 20);
      if (playerId) db.ref('players/' + playerId + '/name').set(playerName);
    }
    emit('NAME_SET', { name: playerName });
  }

  function trUpper(s) { return s.toLocaleUpperCase('tr-TR'); }

  function genLobbyCode() {
    const chars = 'ABCDEFGHJKLMNPRSTUVYZ';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  // ── Lobi İşlemleri ──

  async function createLobby(opts) {
    const lobbyId = genLobbyCode();
    const { gameType } = opts;

    let lobbyData;
    if (gameType === 'kod-macerasi') {
      const gridSize = [5,6,7].includes(parseInt(opts.gridSize)) ? parseInt(opts.gridSize) : 6;
      const totalRounds = 3;
      // 3 tur icin 6 puzzle uret (her tur host+guest icin ayri)
      const genPuzzle = (typeof KodMacerasiCore !== 'undefined')
        ? (s) => KodMacerasiCore.generateComplexPuzzle(s)
        : (s) => generateKodPuzzle(s, 2);
      const rounds = {};
      for (let r = 1; r <= totalRounds; r++) {
        const hp = genPuzzle(gridSize);
        const gp = genPuzzle(gridSize);
        rounds[r] = {
          hostPuzzle: hp, guestPuzzle: gp,
          hostRobotPos: { x: hp.start.x, y: hp.start.y },
          guestRobotPos: { x: gp.start.x, y: gp.start.y },
          hostFinished: false, guestFinished: false, winner: null
        };
      }
      lobbyData = {
        id: lobbyId, gameType, gridSize, totalRounds,
        hostId: playerId, hostName: playerName, guestId: null, guestName: null,
        state: 'WAITING', currentRound: 1,
        hostScore: 0, guestScore: 0,
        rounds,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
    } else {
      const wordLength = Math.min(Math.max(parseInt(opts.wordLength) || 5, 3), 8);
      const maxTurns = [5,10,15].includes(parseInt(opts.maxTurns)) ? parseInt(opts.maxTurns) : 10;
      lobbyData = {
        id: lobbyId, gameType, wordLength, maxTurns,
        hostId: playerId, hostName: playerName, guestId: null, guestName: null,
        state: 'WAITING',
        hostWord: null, guestWord: null,
        currentTurn: 'host', turnNumber: 0,
        hostGuesses: [], guestGuesses: [],
        hostRevealed: [], guestRevealed: [],
        hostGuessedWord: false, guestGuessedWord: false,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
    }

    await db.ref('lobbies/' + lobbyId).set(lobbyData);
    currentLobbyId = lobbyId;
    currentRole = 'host';
    listenToLobby(lobbyId);
    emit('LOBBY_CREATED', { lobbyId, lobby: lobbyData });
  }

  async function listLobbies() {
    const snapshot = await db.ref('lobbies').orderByChild('state').equalTo('WAITING').once('value');
    const list = [];
    snapshot.forEach(child => {
      const lobby = child.val();
      const item = { id: lobby.id, gameType: lobby.gameType, hostName: lobby.hostName || 'Bilinmiyor' };
      if (lobby.gameType === 'kod-macerasi') {
        item.gridSize = lobby.gridSize;
        item.totalRounds = lobby.totalRounds;
      } else {
        item.wordLength = lobby.wordLength;
        item.maxTurns = lobby.maxTurns;
      }
      list.push(item);
    });
    emit('LOBBY_LIST', { lobbies: list });
  }

  async function joinLobby(lobbyId) {
    const ref = db.ref('lobbies/' + lobbyId);
    const snapshot = await ref.once('value');
    const lobby = snapshot.val();

    if (!lobby || lobby.state !== 'WAITING') {
      return emit('ERROR', { code: 'LOBBY_NOT_FOUND', message: 'Lobi bulunamadı' });
    }

    currentLobbyId = lobbyId;
    currentRole = 'guest';

    if (lobby.gameType === 'kod-macerasi') {
      await ref.update({ guestId: playerId, guestName: playerName, state: 'PLAYING' });
      listenToLobby(lobbyId);

      const updatedSnap = await ref.once('value');
      const ul = updatedSnap.val();
      const round = ul.rounds[ul.currentRound];

      emit('PLAYER_JOINED', { opponentName: ul.hostName, role: 'guest' });
      emit('GAME_START', {
        yourRole: 'guest', opponentName: ul.hostName,
        gridSize: ul.gridSize, totalRounds: ul.totalRounds, currentRound: ul.currentRound,
        myPuzzle: round.guestPuzzle, myRobotPos: round.guestRobotPos,
        opPuzzle: round.hostPuzzle, opRobotPos: round.hostRobotPos,
        hostScore: ul.hostScore, guestScore: ul.guestScore,
        gameType: 'kod-macerasi'
      });
    } else {
      // Kelime/harf tahmin
      await ref.update({
        guestId: playerId, guestName: playerName,
        state: 'WORD_SETUP'
      });
      listenToLobby(lobbyId);
      emit('PLAYER_JOINED', { opponentName: lobby.hostName, role: 'guest' });
      emit('WORD_SETUP', { wordLength: lobby.wordLength });
    }
  }

  async function quickPlay(gameType) {
    // Bekleten lobi ara
    const snapshot = await db.ref('lobbies').orderByChild('state').equalTo('WAITING').once('value');
    let found = false;
    snapshot.forEach(child => {
      const lobby = child.val();
      if (lobby.gameType === gameType && !found) {
        found = true;
        joinLobby(lobby.id);
      }
    });

    if (!found) {
      // Yeni lobi oluştur
      const defaults = gameType === 'kod-macerasi'
        ? { gameType, gridSize: 6 }
        : { gameType, wordLength: 5, maxTurns: 10 };
      await createLobby(defaults);
      emit('LOBBY_CREATED', { lobbyId: currentLobbyId, quickPlay: true });
    }
  }

  // ── Kelime/Harf Tahmin ──

  async function setWord(word) {
    if (!currentLobbyId) return;
    const ref = db.ref('lobbies/' + currentLobbyId);
    const cleanWord = trUpper((word || '').trim());

    const field = currentRole === 'host' ? 'hostWord' : 'guestWord';
    await ref.child(field).set(cleanWord);
    emit('WORD_ACCEPTED', {});

    // İki kelime de girildi mi kontrol et
    const snap = await ref.once('value');
    const lobby = snap.val();
    if (lobby.hostWord && lobby.guestWord) {
      await ref.update({ state: 'PLAYING', currentTurn: 'host', turnNumber: 1 });
    }
  }

  async function guessWord(guess) {
    if (!currentLobbyId) return;
    const ref = db.ref('lobbies/' + currentLobbyId);
    const snap = await ref.once('value');
    const lobby = snap.val();

    if (lobby.currentTurn !== currentRole) {
      return emit('ERROR', { code: 'NOT_YOUR_TURN', message: 'Senin sıran değil' });
    }

    const cleanGuess = trUpper((guess || '').trim());
    const targetWord = currentRole === 'host' ? lobby.guestWord : lobby.hostWord;
    const results = [];
    let allCorrect = true;

    for (let i = 0; i < cleanGuess.length; i++) {
      if (cleanGuess[i] === targetWord[i]) {
        results.push({ letter: cleanGuess[i], status: 'green' });
      } else {
        results.push({ letter: cleanGuess[i], status: 'red' });
        allCorrect = false;
      }
    }

    // Tahmini kaydet
    const guessField = currentRole === 'host' ? 'hostGuesses' : 'guestGuesses';
    const guesses = lobby[guessField] || [];
    guesses.push({ guess: cleanGuess, results });

    const updates = { [guessField]: guesses };

    if (allCorrect) {
      updates[currentRole === 'host' ? 'hostGuessedWord' : 'guestGuessedWord'] = true;
    }

    // Sıra değiştir
    const otherRole = currentRole === 'host' ? 'guest' : 'host';
    const otherGuessed = otherRole === 'host' ? (lobby.hostGuessedWord || false) : (lobby.guestGuessedWord || false);

    if (allCorrect && otherGuessed) {
      updates.state = 'FINISHED';
      updates.winner = 'draw';
    } else if (allCorrect) {
      updates.state = 'FINISHED';
      updates.winner = currentRole; // Ilk bilen kazanir
    } else if (otherGuessed) {
      updates.state = 'FINISHED';
      updates.winner = otherRole;
    } else {
      const hostG = guessField === 'hostGuesses' ? guesses : (lobby.hostGuesses || []);
      const guestG = guessField === 'guestGuesses' ? guesses : (lobby.guestGuesses || []);
      if (hostG.length >= lobby.maxTurns && guestG.length >= lobby.maxTurns) {
        updates.state = 'FINISHED';
        updates.winner = 'draw';
      } else {
        updates.currentTurn = currentRole === 'host' ? 'guest' : 'host';
        if (updates.currentTurn === 'host') updates.turnNumber = (lobby.turnNumber || 0) + 1;
      }
    }

    await ref.update(updates);
  }

  async function guessLetter(letter) {
    if (!currentLobbyId) return;
    const ref = db.ref('lobbies/' + currentLobbyId);
    const snap = await ref.once('value');
    const lobby = snap.val();

    if (lobby.currentTurn !== currentRole) {
      return emit('ERROR', { code: 'NOT_YOUR_TURN', message: 'Senin sıran değil' });
    }

    const cleanLetter = trUpper((letter || '').trim());
    const targetWord = currentRole === 'host' ? lobby.guestWord : lobby.hostWord;
    const myRevealed = currentRole === 'host' ? (lobby.hostRevealed || []) : (lobby.guestRevealed || []);
    const myGuesses = currentRole === 'host' ? (lobby.hostGuesses || []) : (lobby.guestGuesses || []);

    if (myGuesses.some(g => g.letter === cleanLetter)) {
      return emit('ERROR', { code: 'ALREADY_GUESSED', message: 'Bu harfi zaten tahmin ettin' });
    }

    const positions = [];
    for (let i = 0; i < targetWord.length; i++) {
      if (targetWord[i] === cleanLetter) {
        positions.push(i);
        if (!myRevealed.includes(i)) myRevealed.push(i);
      }
    }

    const hit = positions.length > 0;
    myGuesses.push({ letter: cleanLetter, hit, positions });

    const allRevealed = myRevealed.length >= targetWord.length;

    const guessField = currentRole === 'host' ? 'hostGuesses' : 'guestGuesses';
    const revealedField = currentRole === 'host' ? 'hostRevealed' : 'guestRevealed';
    const guessedField = currentRole === 'host' ? 'hostGuessedWord' : 'guestGuessedWord';

    const updates = {
      [guessField]: myGuesses,
      [revealedField]: myRevealed,
    };

    if (allRevealed) updates[guessedField] = true;

    const otherRole = currentRole === 'host' ? 'guest' : 'host';
    const otherGuessed = otherRole === 'host' ? (lobby.hostGuessedWord || false) : (lobby.guestGuessedWord || false);

    if (allRevealed && otherGuessed) {
      updates.state = 'FINISHED';
      updates.winner = 'draw';
    } else if (allRevealed) {
      updates.state = 'FINISHED';
      updates.winner = currentRole; // Ilk tamamlayan kazanir
    } else if (otherGuessed) {
      updates.state = 'FINISHED';
      updates.winner = otherRole;
    } else {
      const hostG = guessField === 'hostGuesses' ? myGuesses : (lobby.hostGuesses || []);
      const guestG = guessField === 'guestGuesses' ? myGuesses : (lobby.guestGuesses || []);
      if (hostG.length >= lobby.maxTurns && guestG.length >= lobby.maxTurns) {
        updates.state = 'FINISHED';
        const hr = (lobby.hostRevealed || []).length;
        const gr = (lobby.guestRevealed || []).length;
        updates.winner = hr > gr ? 'host' : gr > hr ? 'guest' : 'draw';
      } else {
        updates.currentTurn = currentRole === 'host' ? 'guest' : 'host';
        if (updates.currentTurn === 'host') updates.turnNumber = (lobby.turnNumber || 0) + 1;
      }
    }

    await ref.update(updates);
  }

  // ── Kod Macerası ──

  async function submitSequence(sequence) {
    if (!currentLobbyId) return;
    const ref = db.ref('lobbies/' + currentLobbyId);
    const field = currentRole === 'host' ? 'hostSequence' : 'guestSequence';
    await ref.child(field).set(sequence);
  }

  // Esanli yaris: kendi puzzle'imda bir hamle yap
  async function submitMove(move) {
    if (!currentLobbyId) return;
    const ref = db.ref('lobbies/' + currentLobbyId);
    const snap = await ref.once('value');
    const lobby = snap.val();
    if (!lobby || lobby.state !== 'PLAYING') return;

    const r = lobby.currentRound;
    const round = lobby.rounds[r];
    if (!round) return;

    const myPuzzle = currentRole === 'host' ? round.hostPuzzle : round.guestPuzzle;
    const posField = currentRole === 'host' ? 'hostRobotPos' : 'guestRobotPos';
    const finField = currentRole === 'host' ? 'hostFinished' : 'guestFinished';

    if (round[finField]) return; // zaten bitirdim

    // RESET: engele çarpma sonrası başa dönüş
    if (move === 'RESET') {
      const updates = {};
      updates[`rounds/${r}/${posField}`] = { x: myPuzzle.start.x, y: myPuzzle.start.y };
      await ref.update(updates);
      return;
    }

    const MOVES_MAP = { UP: {dx:0,dy:-1}, DOWN: {dx:0,dy:1}, LEFT: {dx:-1,dy:0}, RIGHT: {dx:1,dy:0} };
    const m = MOVES_MAP[move];
    if (!m) return;

    const pos = round[posField] || myPuzzle.start;
    const nx = pos.x + m.dx;
    const ny = pos.y + m.dy;

    // Sınır kontrolü
    if (nx < 0 || nx >= myPuzzle.size || ny < 0 || ny >= myPuzzle.size) return;

    // Engel kontrolü - client tarafında ceza uygulanıyor, server sadece pozisyonu günceller
    const obstacles = myPuzzle.obstacles || [];
    if (obstacles.some(o => o.x === nx && o.y === ny)) return;

    const updates = {};
    updates[`rounds/${r}/${posField}`] = { x: nx, y: ny };

    // Hedefe ulaştı mı?
    if (nx === myPuzzle.target.x && ny === myPuzzle.target.y) {
      updates[`rounds/${r}/${finField}`] = true;
      // Ilk bitiren turu kazanir
      if (!round.winner) {
        updates[`rounds/${r}/winner`] = currentRole;
        const scoreField = currentRole === 'host' ? 'hostScore' : 'guestScore';
        updates[scoreField] = (lobby[scoreField] || 0) + 1;
      }
    }

    await ref.update(updates);
  }

  // ── Lobi Dinleyici ──

  function listenToLobby(lobbyId) {
    stopListening();
    lobbyRef = db.ref('lobbies/' + lobbyId);
    let prevState = null;
    let prevHostWord = null;
    let prevGuestWord = null;
    let prevTurn = null;
    let prevHostGuesses = 0;
    let prevGuestGuesses = 0;
    let prevLastMove = null;

    lobbyListener = lobbyRef.on('value', (snapshot) => {
      const lobby = snapshot.val();
      if (!lobby) {
        emit('OPPONENT_LEFT', { reason: 'lobby_deleted' });
        stopListening();
        return;
      }

      // Misafir katıldı (host için)
      if (currentRole === 'host' && lobby.guestId && prevState === 'WAITING' && lobby.state !== 'WAITING') {
        emit('PLAYER_JOINED', { opponentName: lobby.guestName, role: 'host' });

        if (lobby.gameType === 'kod-macerasi') {
          const round = lobby.rounds[lobby.currentRound];
          emit('GAME_START', {
            yourRole: 'host', opponentName: lobby.guestName,
            gridSize: lobby.gridSize, totalRounds: lobby.totalRounds, currentRound: lobby.currentRound,
            myPuzzle: round.hostPuzzle, myRobotPos: round.hostRobotPos,
            opPuzzle: round.guestPuzzle, opRobotPos: round.guestRobotPos,
            hostScore: lobby.hostScore, guestScore: lobby.guestScore,
            gameType: 'kod-macerasi'
          });
        } else {
          emit('WORD_SETUP', { wordLength: lobby.wordLength });
        }
      }

      // Rakip kelimesini girdi
      if (lobby.gameType !== 'kod-macerasi') {
        const opWordField = currentRole === 'host' ? 'guestWord' : 'hostWord';
        const prevOpWord = currentRole === 'host' ? prevGuestWord : prevHostWord;
        if (lobby[opWordField] && !prevOpWord) {
          emit('OPPONENT_READY', {});
        }

        // Oyun başladı (iki kelime girilince)
        if ((prevState === 'WORD_SETUP' || prevState === null) && lobby.state === 'PLAYING') {
          const opName = currentRole === 'host' ? lobby.guestName : lobby.hostName;
          emit('GAME_START', {
            yourRole: currentRole,
            opponentName: opName,
            wordLength: lobby.wordLength,
            maxTurns: lobby.maxTurns,
            currentTurn: lobby.currentTurn,
            gameType: lobby.gameType
          });
          if (lobby.currentTurn === currentRole) emit('YOUR_TURN', {});
          else emit('WAIT_TURN', {});
        }

        // Tahmin sonucu (kelime-tahmin)
        if (lobby.gameType === 'kelime-tahmin') {
          const hg = (lobby.hostGuesses || []).length;
          const gg = (lobby.guestGuesses || []).length;
          if (hg > prevHostGuesses && prevHostGuesses >= 0) {
            const lastGuess = lobby.hostGuesses[hg - 1];
            emit('GUESS_RESULT', { guess: lastGuess.guess, results: lastGuess.results, guesser: 'host', turnNumber: lobby.turnNumber });
          }
          if (gg > prevGuestGuesses && prevGuestGuesses >= 0) {
            const lastGuess = lobby.guestGuesses[gg - 1];
            emit('GUESS_RESULT', { guess: lastGuess.guess, results: lastGuess.results, guesser: 'guest', turnNumber: lobby.turnNumber });
          }
          prevHostGuesses = hg;
          prevGuestGuesses = gg;
        }

        // Tahmin sonucu (harf-tahmin)
        if (lobby.gameType === 'harf-tahmin') {
          const hg = (lobby.hostGuesses || []).length;
          const gg = (lobby.guestGuesses || []).length;
          if (hg > prevHostGuesses && prevHostGuesses >= 0) {
            const last = lobby.hostGuesses[hg - 1];
            const revealedWord = [];
            const targetWord = lobby.guestWord;
            const hostRev = lobby.hostRevealed || [];
            for (let i = 0; i < targetWord.length; i++) revealedWord.push(hostRev.includes(i) ? targetWord[i] : null);
            emit('LETTER_RESULT', { letter: last.letter, hit: last.hit, positions: last.positions, revealed: revealedWord, guesser: 'host', turnNumber: lobby.turnNumber });
          }
          if (gg > prevGuestGuesses && prevGuestGuesses >= 0) {
            const last = lobby.guestGuesses[gg - 1];
            const revealedWord = [];
            const targetWord = lobby.hostWord;
            const guestRev = lobby.guestRevealed || [];
            for (let i = 0; i < targetWord.length; i++) revealedWord.push(guestRev.includes(i) ? targetWord[i] : null);
            emit('LETTER_RESULT', { letter: last.letter, hit: last.hit, positions: last.positions, revealed: revealedWord, guesser: 'guest', turnNumber: lobby.turnNumber });
          }
          prevHostGuesses = hg;
          prevGuestGuesses = gg;
        }

        // Sıra değişti
        if (lobby.currentTurn && lobby.currentTurn !== prevTurn && lobby.state === 'PLAYING') {
          if (lobby.currentTurn === currentRole) emit('YOUR_TURN', { turnNumber: lobby.turnNumber });
          else emit('WAIT_TURN', { turnNumber: lobby.turnNumber });
        }
      }

      // Kod macerası: eşanlı yarış dinleme
      if (lobby.gameType === 'kod-macerasi' && lobby.state === 'PLAYING' && lobby.rounds) {
        const r = lobby.currentRound;
        const round = lobby.rounds[r];
        if (round) {
          // Rakibin robot pozisyonu değişti mi?
          const opPosField = currentRole === 'host' ? 'guestRobotPos' : 'hostRobotPos';
          const opFinField = currentRole === 'host' ? 'guestFinished' : 'hostFinished';
          const myFinField = currentRole === 'host' ? 'hostFinished' : 'guestFinished';

          emit('ROUND_UPDATE', {
            round: r,
            opRobotPos: round[opPosField],
            opFinished: round[opFinField] || false,
            myFinished: round[myFinField] || false,
            roundWinner: round.winner,
            hostScore: lobby.hostScore || 0,
            guestScore: lobby.guestScore || 0,
          });

          // İki taraf da bitirdiyse sonraki tura geç
          if (round.hostFinished && round.guestFinished && currentRole === 'host') {
            if (r < lobby.totalRounds) {
              // Sonraki tur 2sn sonra
              setTimeout(() => {
                if (currentLobbyId) {
                  db.ref('lobbies/' + currentLobbyId + '/currentRound').set(r + 1);
                }
              }, 2500);
            } else {
              // Oyun bitti
              setTimeout(() => {
                if (currentLobbyId) {
                  const winner = (lobby.hostScore || 0) > (lobby.guestScore || 0) ? 'host'
                    : (lobby.guestScore || 0) > (lobby.hostScore || 0) ? 'guest' : 'draw';
                  db.ref('lobbies/' + currentLobbyId).update({ state: 'FINISHED', winner });
                }
              }, 2500);
            }
          }

          // Tur değişti mi?
          if (r !== prevLastMove) {
            const newRound = lobby.rounds[r];
            if (newRound && prevLastMove && prevLastMove !== r) {
              emit('NEW_ROUND', {
                round: r, totalRounds: lobby.totalRounds,
                myPuzzle: currentRole === 'host' ? newRound.hostPuzzle : newRound.guestPuzzle,
                myRobotPos: currentRole === 'host' ? newRound.hostRobotPos : newRound.guestRobotPos,
                opPuzzle: currentRole === 'host' ? newRound.guestPuzzle : newRound.hostPuzzle,
                opRobotPos: currentRole === 'host' ? newRound.guestRobotPos : newRound.hostRobotPos,
                hostScore: lobby.hostScore || 0, guestScore: lobby.guestScore || 0,
              });
            }
            prevLastMove = r;
          }
        }
      }

      // Oyun bitti
      if (lobby.state === 'FINISHED' && prevState !== 'FINISHED') {
        const payload = {
          winner: lobby.winner,
          hostWord: lobby.hostWord,
          guestWord: lobby.guestWord,
          hostGuesses: (lobby.hostGuesses || []).length,
          guestGuesses: (lobby.guestGuesses || []).length,
          hostScore: lobby.hostScore || 0,
          guestScore: lobby.guestScore || 0,
          gameType: lobby.gameType,
          yourRole: currentRole
        };
        emit('GAME_OVER', payload);

        // Oyun bitti - lobiyi 5 sn sonra sil (iki taraf da GAME_OVER alsın)
        setTimeout(() => {
          if (currentLobbyId) {
            db.ref('lobbies/' + currentLobbyId).remove().catch(() => {});
            stopListening();
            currentLobbyId = null;
            currentRole = null;
          }
        }, 5000);
      }

      prevState = lobby.state;
      prevHostWord = lobby.hostWord;
      prevGuestWord = lobby.guestWord;
      prevTurn = lobby.currentTurn;
    });
  }

  // Kod macerası tur sonucu hesapla
  async function processKodRound(lobby) {
    // Sadece host hesaplar (çift hesaplama önlenir)
    if (currentRole !== 'host') return;

    const puzzle = lobby.puzzles[(lobby.currentRound || 1) - 1];
    const hostResult = executeKodSeq(puzzle, lobby.hostSequence);
    const guestResult = executeKodSeq(puzzle, lobby.guestSequence);

    let roundWinner = 'draw';
    if (hostResult.success && !guestResult.success) roundWinner = 'host';
    else if (!hostResult.success && guestResult.success) roundWinner = 'guest';
    else if (hostResult.success && guestResult.success) {
      if (lobby.hostSequence.length < lobby.guestSequence.length) roundWinner = 'host';
      else if (lobby.guestSequence.length < lobby.hostSequence.length) roundWinner = 'guest';
    }

    const hostScore = (lobby.hostScore || 0) + (roundWinner === 'host' ? 1 : 0);
    const guestScore = (lobby.guestScore || 0) + (roundWinner === 'guest' ? 1 : 0);
    const hasNext = (lobby.currentRound || 1) < lobby.totalRounds;

    const roundResult = {
      round: lobby.currentRound || 1,
      totalRounds: lobby.totalRounds,
      winner: roundWinner,
      hostResult: { success: hostResult.success, blocks: lobby.hostSequence.length },
      guestResult: { success: guestResult.success, blocks: lobby.guestSequence.length },
      hostScore, guestScore,
      nextPuzzle: hasNext ? lobby.puzzles[lobby.currentRound] : null
    };

    // Sonuçları RTDB'ye yaz
    const ref = db.ref('lobbies/' + currentLobbyId);
    const updates = {
      hostScore, guestScore,
      lastRoundResult: roundResult,
      hostSequence: null,
      guestSequence: null,
    };

    if (hasNext) {
      updates.currentRound = (lobby.currentRound || 1) + 1;
    } else {
      updates.state = 'FINISHED';
      updates.winner = hostScore > guestScore ? 'host' : guestScore > hostScore ? 'guest' : 'draw';
    }

    await ref.update(updates);
  }

  // Basit kod sekans çalıştırıcı (client-side)
  function executeKodSeq(puzzle, sequence) {
    const MOVES = { UP: {dx:0,dy:-1}, DOWN: {dx:0,dy:1}, LEFT: {dx:-1,dy:0}, RIGHT: {dx:1,dy:0} };
    let x = puzzle.start.x, y = puzzle.start.y;

    const expanded = [];
    for (let i = 0; i < sequence.length; i++) {
      if (sequence[i] === 'REPEAT' && expanded.length > 0) expanded.push(expanded[expanded.length - 1]);
      else expanded.push(sequence[i]);
    }

    for (const cmd of expanded) {
      const m = MOVES[cmd];
      if (!m) continue;
      x += m.dx; y += m.dy;
      if (x < 0 || x >= puzzle.size || y < 0 || y >= puzzle.size) return { success: false };
      if (puzzle.obstacles?.some(o => o.x === x && o.y === y)) return { success: false };
    }
    return { success: x === puzzle.target.x && y === puzzle.target.y };
  }

  function stopListening() {
    if (lobbyRef && lobbyListener) {
      lobbyRef.off('value', lobbyListener);
    }
    lobbyRef = null;
    lobbyListener = null;
  }

  async function leaveLobby() {
    if (currentLobbyId) {
      try {
        await db.ref('lobbies/' + currentLobbyId).remove();
      } catch (e) { /* ignore */ }
    }
    stopListening();
    currentLobbyId = null;
    currentRole = null;
    emit('LOBBY_LEFT', {});
  }

  // ── Kod Macerası Bulmaca Üretici ──
  function generateKodPuzzles(gridSize, count) {
    const puzzles = [];
    for (let i = 0; i < count; i++) {
      puzzles.push(generateKodPuzzle(gridSize, i + 1));
    }
    return puzzles;
  }

  function generateKodPuzzle(size, difficulty) {
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    const start = { x: 0, y: size - 1 };
    const target = { x: size - 1, y: 0 };

    const obstacles = [];
    const numObs = Math.min(difficulty, Math.floor(size * size * 0.15));
    let attempts = 0;
    while (obstacles.length < numObs && attempts < 50) {
      const ox = Math.floor(Math.random() * size);
      const oy = Math.floor(Math.random() * size);
      if ((ox === start.x && oy === start.y) || (ox === target.x && oy === target.y)) { attempts++; continue; }
      if (obstacles.some(o => o.x === ox && o.y === oy)) { attempts++; continue; }
      obstacles.push({ x: ox, y: oy });
      grid[oy][ox] = 1;
      attempts++;
    }

    const optimal = Math.abs(target.x - start.x) + Math.abs(target.y - start.y);
    return { size, grid, start, target, collectibles: [], obstacles, optimal };
  }

  return { connect, disconnect, send, on, off, offAll, isConnected, getPlayerId, onConnect: () => {}, onDisconnect: () => {} };
})();
