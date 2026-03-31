const { WebSocketServer } = require('ws');

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

// ── State ──
const players = new Map();   // ws → Player
const lobbies = new Map();   // lobbyId → Lobby
let idCounter = 0;

function genId(prefix) { return prefix + (++idCounter).toString(36).padStart(4, '0'); }
function genLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPRSTUVYZ';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Turkish helpers ──
function trUpper(s) { return s.toLocaleUpperCase('tr-TR'); }

// ── Lobby cleanup (5 min idle) ──
setInterval(() => {
  const now = Date.now();
  for (const [id, lobby] of lobbies) {
    if (lobby.state === 'WAITING' && now - lobby.createdAt > 5 * 60 * 1000) {
      lobbies.delete(id);
    }
  }
}, 60000);

// ── Connection handler ──
wss.on('connection', (ws) => {
  const player = {
    id: genId('P'),
    name: 'Oyuncu',
    lobbyId: null,
    role: null,
    ws
  };
  players.set(ws, player);
  send(ws, 'WELCOME', { playerId: player.id });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleMessage(ws, player, msg);
  });

  ws.on('close', () => {
    handleDisconnect(player);
    players.delete(ws);
  });
});

function send(ws, type, payload = {}) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ type, ...payload }));
  }
}

function sendToLobby(lobbyId, type, payload = {}, excludeWs = null) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;
  for (const [ws, p] of players) {
    if (p.lobbyId === lobbyId && ws !== excludeWs) {
      send(ws, type, payload);
    }
  }
}

function getOpponent(player) {
  if (!player.lobbyId) return null;
  for (const [, p] of players) {
    if (p.lobbyId === player.lobbyId && p.id !== player.id) return p;
  }
  return null;
}

// ── Message router ──
function handleMessage(ws, player, msg) {
  const { type, ...data } = msg;
  switch (type) {
    case 'SET_NAME': return onSetName(ws, player, data);
    case 'CREATE_LOBBY': return onCreateLobby(ws, player, data);
    case 'LIST_LOBBIES': return onListLobbies(ws, player, data);
    case 'JOIN_LOBBY': return onJoinLobby(ws, player, data);
    case 'QUICK_PLAY': return onQuickPlay(ws, player, data);
    case 'SET_WORD': return onSetWord(ws, player, data);
    case 'GUESS_WORD': return onGuessWord(ws, player, data);
    case 'GUESS_LETTER': return onGuessLetter(ws, player, data);
    case 'SUBMIT_SEQUENCE': return onSubmitSequence(ws, player, data);
    case 'LEAVE_LOBBY': return onLeaveLobby(ws, player);
    case 'PING': return send(ws, 'PONG');
    default: return send(ws, 'ERROR', { code: 'UNKNOWN', message: 'Bilinmeyen mesaj tipi' });
  }
}

// ── Handlers ──

function onSetName(ws, player, { name }) {
  if (name && typeof name === 'string') {
    player.name = name.trim().slice(0, 20);
  }
  send(ws, 'NAME_SET', { name: player.name });
}

function onCreateLobby(ws, player, { gameType, wordLength, maxTurns }) {
  if (player.lobbyId) {
    return send(ws, 'ERROR', { code: 'ALREADY_IN_LOBBY', message: 'Zaten bir lobidesin' });
  }
  if (!['kelime-tahmin', 'harf-tahmin', 'kod-macerasi'].includes(gameType)) {
    return send(ws, 'ERROR', { code: 'INVALID_GAME', message: 'Gecersiz oyun tipi' });
  }

  const lobbyId = genLobbyCode();
  let lobby;

  if (gameType === 'kod-macerasi') {
    const gridSize = [3, 4, 5].includes(parseInt(data.gridSize)) ? parseInt(data.gridSize) : 4;
    const totalRounds = [1, 3, 5].includes(parseInt(data.totalRounds)) ? parseInt(data.totalRounds) : 3;
    lobby = {
      id: lobbyId, gameType, gridSize, totalRounds,
      hostId: player.id, guestId: null, state: 'WAITING',
      currentRound: 0, puzzles: generateKodPuzzles(gridSize, totalRounds),
      hostSequence: null, guestSequence: null,
      hostScore: 0, guestScore: 0, createdAt: Date.now()
    };
  } else {
    wordLength = Math.min(Math.max(parseInt(wordLength) || 5, 3), 8);
    maxTurns = [5, 10, 15].includes(parseInt(maxTurns)) ? parseInt(maxTurns) : 10;
    lobby = {
      id: lobbyId, gameType, wordLength, maxTurns,
      hostId: player.id, guestId: null, state: 'WAITING',
      hostWord: null, guestWord: null, currentTurn: 'host', turnNumber: 0,
      hostGuesses: [], guestGuesses: [], hostRevealed: [], guestRevealed: [],
      hostGuessedWord: false, guestGuessedWord: false, createdAt: Date.now()
    };
  }
  lobbies.set(lobbyId, lobby);
  player.lobbyId = lobbyId;
  player.role = 'host';

  send(ws, 'LOBBY_CREATED', {
    lobby: sanitizeLobby(lobby),
    lobbyId
  });
}

function onListLobbies(ws) {
  const list = [];
  for (const [, lobby] of lobbies) {
    if (lobby.state === 'WAITING') {
      const host = findPlayerById(lobby.hostId);
      const item = { id: lobby.id, gameType: lobby.gameType, hostName: host ? host.name : 'Bilinmiyor' };
      if (lobby.gameType === 'kod-macerasi') {
        item.gridSize = lobby.gridSize;
        item.totalRounds = lobby.totalRounds;
      } else {
        item.wordLength = lobby.wordLength;
        item.maxTurns = lobby.maxTurns;
      }
      list.push(item);
    }
  }
  send(ws, 'LOBBY_LIST', { lobbies: list });
}

function onJoinLobby(ws, player, { lobbyId }) {
  if (player.lobbyId) {
    return send(ws, 'ERROR', { code: 'ALREADY_IN_LOBBY', message: 'Zaten bir lobidesin' });
  }
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.state !== 'WAITING') {
    return send(ws, 'ERROR', { code: 'LOBBY_NOT_FOUND', message: 'Lobi bulunamadi' });
  }
  joinPlayerToLobby(player, lobby);
}

function onQuickPlay(ws, player, { gameType }) {
  if (player.lobbyId) {
    return send(ws, 'ERROR', { code: 'ALREADY_IN_LOBBY', message: 'Zaten bir lobidesin' });
  }

  // Find a waiting lobby of the same game type
  for (const [, lobby] of lobbies) {
    if (lobby.state === 'WAITING' && lobby.gameType === gameType) {
      return joinPlayerToLobby(player, lobby);
    }
  }

  // No lobby found, create one with defaults
  const lobbyId = genLobbyCode();
  let lobby;
  if (gameType === 'kod-macerasi') {
    lobby = {
      id: lobbyId, gameType, gridSize: 4, totalRounds: 3,
      hostId: player.id, guestId: null, state: 'WAITING',
      currentRound: 0, puzzles: generateKodPuzzles(4, 3),
      hostSequence: null, guestSequence: null,
      hostScore: 0, guestScore: 0, createdAt: Date.now()
    };
  } else {
    lobby = {
      id: lobbyId, gameType: gameType || 'kelime-tahmin',
      wordLength: 5, maxTurns: 10,
      hostId: player.id, guestId: null, state: 'WAITING',
      hostWord: null, guestWord: null, currentTurn: 'host', turnNumber: 0,
      hostGuesses: [], guestGuesses: [], hostRevealed: [], guestRevealed: [],
      hostGuessedWord: false, guestGuessedWord: false, createdAt: Date.now()
    };
  }
  lobbies.set(lobbyId, lobby);
  player.lobbyId = lobbyId;
  player.role = 'host';

  send(player.ws, 'LOBBY_CREATED', {
    lobby: sanitizeLobby(lobby),
    lobbyId,
    quickPlay: true
  });
}

function joinPlayerToLobby(player, lobby) {
  lobby.guestId = player.id;
  player.lobbyId = lobby.id;
  player.role = 'guest';

  const host = findPlayerById(lobby.hostId);

  if (lobby.gameType === 'kod-macerasi') {
    // Kod macerasi: kelime girisi yok, direkt oyun baslar
    lobby.state = 'PLAYING';
    lobby.currentRound = 1;

    const puzzle = lobby.puzzles[0];
    const gameData = {
      gridSize: lobby.gridSize,
      totalRounds: lobby.totalRounds,
      puzzle,
      round: 1,
      gameType: 'kod-macerasi'
    };

    if (host) {
      send(host.ws, 'PLAYER_JOINED', { opponentName: player.name, role: 'host' });
      send(host.ws, 'GAME_START', { yourRole: 'host', opponentName: player.name, ...gameData });
    }
    send(player.ws, 'PLAYER_JOINED', { opponentName: host ? host.name : '?', role: 'guest' });
    send(player.ws, 'GAME_START', { yourRole: 'guest', opponentName: host ? host.name : '?', ...gameData });
  } else {
    // Kelime/harf tahmin: kelime girisi asamasi
    lobby.state = 'WORD_SETUP';

    if (host) {
      send(host.ws, 'PLAYER_JOINED', { opponentName: player.name, role: 'host' });
      send(host.ws, 'WORD_SETUP', { wordLength: lobby.wordLength });
    }
    send(player.ws, 'PLAYER_JOINED', { opponentName: host ? host.name : '?', role: 'guest' });
    send(player.ws, 'WORD_SETUP', { wordLength: lobby.wordLength });
  }
}

function onSetWord(ws, player, { word }) {
  const lobby = lobbies.get(player.lobbyId);
  if (!lobby || lobby.state !== 'WORD_SETUP') {
    return send(ws, 'ERROR', { code: 'INVALID_STATE', message: 'Kelime gonderilemez' });
  }

  const cleanWord = trUpper((word || '').trim());
  if (cleanWord.length !== lobby.wordLength) {
    return send(ws, 'ERROR', { code: 'INVALID_WORD', message: `Kelime ${lobby.wordLength} harf olmali` });
  }

  if (player.role === 'host') {
    lobby.hostWord = cleanWord;
  } else {
    lobby.guestWord = cleanWord;
  }

  send(ws, 'WORD_ACCEPTED', {});

  // Notify opponent
  const opponent = getOpponent(player);
  if (opponent) send(opponent.ws, 'OPPONENT_READY', {});

  // Both words set? Start game
  if (lobby.hostWord && lobby.guestWord) {
    lobby.state = 'PLAYING';
    lobby.currentTurn = 'host';
    lobby.turnNumber = 1;

    const host = findPlayerById(lobby.hostId);
    const guest = findPlayerById(lobby.guestId);

    if (host) {
      send(host.ws, 'GAME_START', {
        yourRole: 'host',
        opponentName: guest ? guest.name : '?',
        wordLength: lobby.wordLength,
        maxTurns: lobby.maxTurns,
        currentTurn: 'host',
        gameType: lobby.gameType
      });
      send(host.ws, 'YOUR_TURN', {});
    }
    if (guest) {
      send(guest.ws, 'GAME_START', {
        yourRole: 'guest',
        opponentName: host ? host.name : '?',
        wordLength: lobby.wordLength,
        maxTurns: lobby.maxTurns,
        currentTurn: 'host',
        gameType: lobby.gameType
      });
      send(guest.ws, 'WAIT_TURN', {});
    }
  }
}

function onGuessWord(ws, player, { guess }) {
  const lobby = lobbies.get(player.lobbyId);
  if (!lobby || lobby.state !== 'PLAYING' || lobby.gameType !== 'kelime-tahmin') {
    return send(ws, 'ERROR', { code: 'INVALID_STATE', message: 'Tahmin yapilamaz' });
  }
  if (lobby.currentTurn !== player.role) {
    return send(ws, 'ERROR', { code: 'NOT_YOUR_TURN', message: 'Senin siran degil' });
  }

  const cleanGuess = trUpper((guess || '').trim());
  if (cleanGuess.length !== lobby.wordLength) {
    return send(ws, 'ERROR', { code: 'INVALID_GUESS', message: `Tahmin ${lobby.wordLength} harf olmali` });
  }

  // Compare against opponent's word
  const targetWord = player.role === 'host' ? lobby.guestWord : lobby.hostWord;
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

  const guessRecord = { guess: cleanGuess, results };
  if (player.role === 'host') {
    lobby.hostGuesses.push(guessRecord);
  } else {
    lobby.guestGuesses.push(guessRecord);
  }

  if (allCorrect) {
    if (player.role === 'host') lobby.hostGuessedWord = true;
    else lobby.guestGuessedWord = true;
  }

  // Send result to both players
  const host = findPlayerById(lobby.hostId);
  const guest = findPlayerById(lobby.guestId);

  const resultPayload = { guess: cleanGuess, results, guesser: player.role, turnNumber: lobby.turnNumber };

  if (host) send(host.ws, 'GUESS_RESULT', resultPayload);
  if (guest) send(guest.ws, 'GUESS_RESULT', resultPayload);

  // Check game over conditions
  if (lobby.hostGuessedWord && lobby.guestGuessedWord) {
    return endGame(lobby, 'draw');
  }

  // Did someone already guess and now the other just failed?
  const otherRole = player.role === 'host' ? 'guest' : 'host';
  const otherAlreadyGuessed = otherRole === 'host' ? lobby.hostGuessedWord : lobby.guestGuessedWord;

  if (allCorrect) {
    if (otherAlreadyGuessed) {
      // Both guessed now
      return endGame(lobby, 'draw');
    }
    // Give opponent one final turn to tie
    lobby.currentTurn = otherRole;
    notifyTurn(lobby, host, guest);
    return;
  }

  // Current player didn't guess correctly
  if (otherAlreadyGuessed) {
    // Other already guessed, this player failed their last chance -> other wins
    return endGame(lobby, otherRole);
  }

  // Max turns check
  if (lobby.hostGuesses.length >= lobby.maxTurns && lobby.guestGuesses.length >= lobby.maxTurns) {
    return endGame(lobby, decideWinner(lobby));
  }

  // Switch turn
  lobby.currentTurn = lobby.currentTurn === 'host' ? 'guest' : 'host';
  if (lobby.currentTurn === 'host') lobby.turnNumber++;
  notifyTurn(lobby, host, guest);
}

function onGuessLetter(ws, player, { letter }) {
  const lobby = lobbies.get(player.lobbyId);
  if (!lobby || lobby.state !== 'PLAYING' || lobby.gameType !== 'harf-tahmin') {
    return send(ws, 'ERROR', { code: 'INVALID_STATE', message: 'Tahmin yapilamaz' });
  }
  if (lobby.currentTurn !== player.role) {
    return send(ws, 'ERROR', { code: 'NOT_YOUR_TURN', message: 'Senin siran degil' });
  }

  const cleanLetter = trUpper((letter || '').trim());
  if (cleanLetter.length !== 1) {
    return send(ws, 'ERROR', { code: 'INVALID_LETTER', message: 'Tek harf gonder' });
  }

  // Check if already guessed
  const myRevealed = player.role === 'host' ? lobby.hostRevealed : lobby.guestRevealed;
  const myGuesses = player.role === 'host' ? lobby.hostGuesses : lobby.guestGuesses;

  if (myGuesses.some(g => g.letter === cleanLetter)) {
    return send(ws, 'ERROR', { code: 'ALREADY_GUESSED', message: 'Bu harfi zaten tahmin ettin' });
  }

  const targetWord = player.role === 'host' ? lobby.guestWord : lobby.hostWord;
  const positions = [];

  for (let i = 0; i < targetWord.length; i++) {
    if (targetWord[i] === cleanLetter) {
      positions.push(i);
      if (!myRevealed.includes(i)) myRevealed.push(i);
    }
  }

  const hit = positions.length > 0;
  if (player.role === 'host') {
    lobby.hostGuesses.push({ letter: cleanLetter, hit, positions });
  } else {
    lobby.guestGuesses.push({ letter: cleanLetter, hit, positions });
  }

  // Build revealed string for the guesser
  const revealedWord = [];
  for (let i = 0; i < targetWord.length; i++) {
    revealedWord.push(myRevealed.includes(i) ? targetWord[i] : null);
  }

  const allRevealed = myRevealed.length === targetWord.length;
  if (allRevealed) {
    if (player.role === 'host') lobby.hostGuessedWord = true;
    else lobby.guestGuessedWord = true;
  }

  // Send result to both
  const host = findPlayerById(lobby.hostId);
  const guest = findPlayerById(lobby.guestId);

  const resultPayload = {
    letter: cleanLetter,
    hit,
    positions,
    revealed: revealedWord,
    guesser: player.role,
    turnNumber: lobby.turnNumber
  };

  if (host) send(host.ws, 'LETTER_RESULT', resultPayload);
  if (guest) send(guest.ws, 'LETTER_RESULT', resultPayload);

  // Check game over
  if (lobby.hostGuessedWord && lobby.guestGuessedWord) {
    return endGame(lobby, 'draw');
  }

  const otherRole = player.role === 'host' ? 'guest' : 'host';
  const otherAlreadyGuessed = otherRole === 'host' ? lobby.hostGuessedWord : lobby.guestGuessedWord;

  if (allRevealed) {
    if (otherAlreadyGuessed) {
      return endGame(lobby, 'draw');
    }
    // Give opponent one final turn to tie
    lobby.currentTurn = otherRole;
    notifyTurn(lobby, host, guest);
    return;
  }

  // Current player didn't reveal all - if other already did, they win
  if (otherAlreadyGuessed) {
    return endGame(lobby, otherRole);
  }

  // Max turns
  if (lobby.hostGuesses.length >= lobby.maxTurns && lobby.guestGuesses.length >= lobby.maxTurns) {
    return endGame(lobby, decideWinner(lobby));
  }

  // Switch turn
  lobby.currentTurn = lobby.currentTurn === 'host' ? 'guest' : 'host';
  if (lobby.currentTurn === 'host') lobby.turnNumber++;
  notifyTurn(lobby, host, guest);
}

function onLeaveLobby(ws, player) {
  const lobby = lobbies.get(player.lobbyId);
  if (!lobby) {
    player.lobbyId = null;
    player.role = null;
    return;
  }

  const opponent = getOpponent(player);
  if (opponent) {
    send(opponent.ws, 'OPPONENT_LEFT', { reason: 'left' });
    opponent.lobbyId = null;
    opponent.role = null;
  }

  lobbies.delete(lobby.id);
  player.lobbyId = null;
  player.role = null;
  send(ws, 'LOBBY_LEFT', {});
}

// ── Game helpers ──

function notifyTurn(lobby, host, guest) {
  if (lobby.currentTurn === 'host') {
    if (host) send(host.ws, 'YOUR_TURN', { turnNumber: lobby.turnNumber });
    if (guest) send(guest.ws, 'WAIT_TURN', { turnNumber: lobby.turnNumber });
  } else {
    if (guest) send(guest.ws, 'YOUR_TURN', { turnNumber: lobby.turnNumber });
    if (host) send(host.ws, 'WAIT_TURN', { turnNumber: lobby.turnNumber });
  }
}

function decideWinner(lobby) {
  if (lobby.hostGuessedWord && !lobby.guestGuessedWord) return 'host';
  if (!lobby.hostGuessedWord && lobby.guestGuessedWord) return 'guest';
  if (lobby.hostGuessedWord && lobby.guestGuessedWord) return 'draw';
  // Neither guessed - check who got more right
  if (lobby.gameType === 'harf-tahmin') {
    if (lobby.hostRevealed.length > lobby.guestRevealed.length) return 'host';
    if (lobby.guestRevealed.length > lobby.hostRevealed.length) return 'guest';
  }
  return 'draw';
}

function endGame(lobby, winner) {
  lobby.state = 'FINISHED';
  const host = findPlayerById(lobby.hostId);
  const guest = findPlayerById(lobby.guestId);

  const payload = {
    winner,
    hostWord: lobby.hostWord,
    guestWord: lobby.guestWord,
    hostGuesses: lobby.hostGuesses.length,
    guestGuesses: lobby.guestGuesses.length,
    gameType: lobby.gameType
  };

  if (host) {
    send(host.ws, 'GAME_OVER', { ...payload, yourRole: 'host' });
    host.lobbyId = null;
    host.role = null;
  }
  if (guest) {
    send(guest.ws, 'GAME_OVER', { ...payload, yourRole: 'guest' });
    guest.lobbyId = null;
    guest.role = null;
  }

  lobbies.delete(lobby.id);
}

function handleDisconnect(player) {
  if (player.lobbyId) {
    const lobby = lobbies.get(player.lobbyId);
    if (lobby) {
      const opponent = getOpponent(player);
      if (opponent) {
        send(opponent.ws, 'OPPONENT_LEFT', { reason: 'disconnected' });
        opponent.lobbyId = null;
        opponent.role = null;
      }
      lobbies.delete(lobby.id);
    }
  }
}

// ── Utilities ──

function findPlayerById(id) {
  for (const [, p] of players) {
    if (p.id === id) return p;
  }
  return null;
}

function sanitizeLobby(lobby) {
  const base = { id: lobby.id, gameType: lobby.gameType, state: lobby.state };
  if (lobby.gameType === 'kod-macerasi') {
    return { ...base, gridSize: lobby.gridSize, totalRounds: lobby.totalRounds };
  }
  return { ...base, wordLength: lobby.wordLength, maxTurns: lobby.maxTurns };
}

// ── Kod Macerasi handlers ──

function onSubmitSequence(ws, player, { sequence }) {
  const lobby = lobbies.get(player.lobbyId);
  if (!lobby || lobby.state !== 'PLAYING' || lobby.gameType !== 'kod-macerasi') {
    return send(ws, 'ERROR', { code: 'INVALID_STATE', message: 'Sekans gonderilemez' });
  }
  if (!Array.isArray(sequence) || sequence.length === 0) {
    return send(ws, 'ERROR', { code: 'INVALID_SEQUENCE', message: 'Gecersiz sekans' });
  }

  if (player.role === 'host') lobby.hostSequence = sequence;
  else lobby.guestSequence = sequence;

  send(ws, 'SEQUENCE_ACCEPTED', {});
  const opponent = getOpponent(player);
  if (opponent) send(opponent.ws, 'OPPONENT_READY', {});

  // Both submitted?
  if (lobby.hostSequence && lobby.guestSequence) {
    const puzzle = lobby.puzzles[lobby.currentRound - 1];
    const hostResult = executeKodSequence(puzzle, lobby.hostSequence);
    const guestResult = executeKodSequence(puzzle, lobby.guestSequence);

    // Determine round winner
    let roundWinner = 'draw';
    if (hostResult.success && !guestResult.success) roundWinner = 'host';
    else if (!hostResult.success && guestResult.success) roundWinner = 'guest';
    else if (hostResult.success && guestResult.success) {
      if (lobby.hostSequence.length < lobby.guestSequence.length) roundWinner = 'host';
      else if (lobby.guestSequence.length < lobby.hostSequence.length) roundWinner = 'guest';
    }

    if (roundWinner === 'host') lobby.hostScore++;
    else if (roundWinner === 'guest') lobby.guestScore++;

    const host = findPlayerById(lobby.hostId);
    const guest = findPlayerById(lobby.guestId);

    const hasNextRound = lobby.currentRound < lobby.totalRounds;
    const nextPuzzle = hasNextRound ? lobby.puzzles[lobby.currentRound] : null;

    const roundPayload = {
      round: lobby.currentRound,
      totalRounds: lobby.totalRounds,
      winner: roundWinner,
      hostResult: { success: hostResult.success, blocks: lobby.hostSequence.length, path: hostResult.path },
      guestResult: { success: guestResult.success, blocks: lobby.guestSequence.length, path: guestResult.path },
      hostScore: lobby.hostScore,
      guestScore: lobby.guestScore,
      nextPuzzle: nextPuzzle,
    };

    if (host) send(host.ws, 'ROUND_RESULT', { ...roundPayload, yourRole: 'host' });
    if (guest) send(guest.ws, 'ROUND_RESULT', { ...roundPayload, yourRole: 'guest' });

    if (!hasNextRound) {
      // Game over
      let finalWinner = 'draw';
      if (lobby.hostScore > lobby.guestScore) finalWinner = 'host';
      else if (lobby.guestScore > lobby.hostScore) finalWinner = 'guest';

      lobby.state = 'FINISHED';
      const overPayload = {
        winner: finalWinner, hostScore: lobby.hostScore, guestScore: lobby.guestScore,
        gameType: 'kod-macerasi'
      };
      if (host) { send(host.ws, 'GAME_OVER', { ...overPayload, yourRole: 'host' }); host.lobbyId = null; host.role = null; }
      if (guest) { send(guest.ws, 'GAME_OVER', { ...overPayload, yourRole: 'guest' }); guest.lobbyId = null; guest.role = null; }
      lobbies.delete(lobby.id);
    } else {
      // Next round
      lobby.currentRound++;
      lobby.hostSequence = null;
      lobby.guestSequence = null;
    }
  }
}

function generateKodPuzzles(gridSize, count) {
  const puzzles = [];
  for (let i = 0; i < count; i++) {
    puzzles.push(generateKodPuzzle(gridSize, i + 1));
  }
  return puzzles;
}

function generateKodPuzzle(size, difficulty) {
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  const start = { x: 0, y: size - 1, dir: Math.random() < 0.5 ? 'UP' : 'RIGHT' };
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

  const dx = Math.abs(target.x - start.x);
  const dy = Math.abs(target.y - start.y);
  const optimal = dx + dy + ((dx > 0 && dy > 0) ? 1 : 0);

  return { size, grid, start, target, collectibles: [], obstacles, optimal };
}

function executeKodSequence(puzzle, sequence) {
  const DIRS = { UP: { dx: 0, dy: -1 }, RIGHT: { dx: 1, dy: 0 }, DOWN: { dx: 0, dy: 1 }, LEFT: { dx: -1, dy: 0 } };
  const DIR_ORDER = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

  let x = puzzle.start.x, y = puzzle.start.y;
  let dirIdx = DIR_ORDER.indexOf(puzzle.start.dir);
  const path = [{ x, y, dir: DIR_ORDER[dirIdx], action: 'start' }];

  const expanded = [];
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] === 'REPEAT' && expanded.length > 0) expanded.push(expanded[expanded.length - 1]);
    else expanded.push(sequence[i]);
  }

  for (const cmd of expanded) {
    if (cmd === 'TURN_LEFT') { dirIdx = (dirIdx + 3) % 4; path.push({ x, y, dir: DIR_ORDER[dirIdx], action: 'turn' }); continue; }
    if (cmd === 'TURN_RIGHT') { dirIdx = (dirIdx + 1) % 4; path.push({ x, y, dir: DIR_ORDER[dirIdx], action: 'turn' }); continue; }

    const d = DIRS[DIR_ORDER[dirIdx]];
    if (cmd === 'FORWARD') { x += d.dx; y += d.dy; }
    else if (cmd === 'BACK') { x -= d.dx; y -= d.dy; }

    if (x < 0 || x >= puzzle.size || y < 0 || y >= puzzle.size) {
      return { success: false, path, error: 'outOfBounds' };
    }
    if (puzzle.obstacles.some(o => o.x === x && o.y === y)) {
      return { success: false, path, error: 'crashed' };
    }
    path.push({ x, y, dir: DIR_ORDER[dirIdx], action: 'move' });
  }

  return { success: x === puzzle.target.x && y === puzzle.target.y, path, error: null };
}

console.log(`🎮 Oyun Bahcesi WS Server - port ${PORT}`);
