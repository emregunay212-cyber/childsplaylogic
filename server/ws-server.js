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
  if (!['kelime-tahmin', 'harf-tahmin'].includes(gameType)) {
    return send(ws, 'ERROR', { code: 'INVALID_GAME', message: 'Gecersiz oyun tipi' });
  }
  wordLength = Math.min(Math.max(parseInt(wordLength) || 5, 3), 8);
  maxTurns = [5, 10, 15].includes(parseInt(maxTurns)) ? parseInt(maxTurns) : 10;

  const lobbyId = genLobbyCode();
  const lobby = {
    id: lobbyId,
    gameType,
    wordLength,
    maxTurns,
    hostId: player.id,
    guestId: null,
    state: 'WAITING',
    hostWord: null,
    guestWord: null,
    currentTurn: 'host',
    turnNumber: 0,
    hostGuesses: [],
    guestGuesses: [],
    hostRevealed: [],
    guestRevealed: [],
    hostGuessedWord: false,
    guestGuessedWord: false,
    createdAt: Date.now()
  };
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
      list.push({
        id: lobby.id,
        gameType: lobby.gameType,
        wordLength: lobby.wordLength,
        maxTurns: lobby.maxTurns,
        hostName: host ? host.name : 'Bilinmiyor'
      });
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
  const lobby = {
    id: lobbyId,
    gameType: gameType || 'kelime-tahmin',
    wordLength: 5,
    maxTurns: 10,
    hostId: player.id,
    guestId: null,
    state: 'WAITING',
    hostWord: null,
    guestWord: null,
    currentTurn: 'host',
    turnNumber: 0,
    hostGuesses: [],
    guestGuesses: [],
    hostRevealed: [],
    guestRevealed: [],
    hostGuessedWord: false,
    guestGuessedWord: false,
    createdAt: Date.now()
  };
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
  lobby.state = 'WORD_SETUP';
  player.lobbyId = lobby.id;
  player.role = 'guest';

  const host = findPlayerById(lobby.hostId);

  // Notify host
  if (host) {
    send(host.ws, 'PLAYER_JOINED', { opponentName: player.name, role: 'host' });
    send(host.ws, 'WORD_SETUP', { wordLength: lobby.wordLength });
  }

  // Notify guest
  send(player.ws, 'PLAYER_JOINED', { opponentName: host ? host.name : '?', role: 'guest' });
  send(player.ws, 'WORD_SETUP', { wordLength: lobby.wordLength });
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
  return {
    id: lobby.id,
    gameType: lobby.gameType,
    wordLength: lobby.wordLength,
    maxTurns: lobby.maxTurns,
    state: lobby.state
  };
}

console.log(`🎮 Oyun Bahcesi WS Server - port ${PORT}`);
