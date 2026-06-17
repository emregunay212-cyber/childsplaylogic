/* ============================================
   SON KART — Motor fuzz testi (Node)
   Binlerce rastgele-legal oyunu sonuna oynatır; her ADIM sonrası
   "deste+ıskarta+tüm eller = 108 benzersiz kart" değişmezini ve
   hatasız tamamlanmayı doğrular. Çalıştır: node games/son-kart/tools/fuzz.js
   ============================================ */
const Deck = require('../js/deck.js');
const Engine = require('../js/engine.js');
const Bot = require('../js/bot.js');

function checkInvariant(state, tag) {
  const ids = [];
  state.deck.forEach(c => ids.push(c.id));
  state.discard.forEach(c => ids.push(c.id));
  state.pids.forEach(p => state.hands[p].forEach(c => ids.push(c.id)));
  const set = new Set(ids);
  if (ids.length !== 108 || set.size !== 108) {
    throw new Error(`INVARIANT [${tag}]: kart sayısı ${ids.length}, benzersiz ${set.size} (108 olmalı)`);
  }
}

function playOneTurn(state, pid) {
  const mv = Bot.choose(state, pid);
  if (mv.type === 'play') {
    return { state: Engine.play(state, pid, mv.cardId, mv.color, true), played: true };
  }
  // çek → çekileni oynayabiliyorsak oyna, yoksa geç
  state = Engine.draw(state, pid);
  const drawnId = state.lastDrawn;
  const legal = Engine.legalMoves(state, pid);
  if (drawnId != null && legal.indexOf(drawnId) >= 0) {
    const card = state.hands[pid].find(c => c.id === drawnId);
    const color = Deck.isWild(card) ? Bot.bestColor(state.hands[pid].filter(c => c.id !== drawnId)) : undefined;
    return { state: Engine.play(state, pid, drawnId, color, true), played: true };
  }
  return { state: Engine.pass(state, pid), played: false };
}

function runGame(seed, nPlayers) {
  Engine.setRng(Deck.makeRng(seed));
  const pids = [];
  for (let i = 0; i < nPlayers; i++) pids.push('p' + i);
  let state = Engine.deal(pids);
  checkInvariant(state, 'deal');

  let moves = 0, sinceLastPlay = 0;
  const MAX = 5000;
  while (!state.winner && moves < MAX) {
    const pid = state.turn;
    const r = playOneTurn(state, pid);
    state = r.state;
    checkInvariant(state, 'move#' + moves);
    moves++;
    sinceLastPlay = r.played ? 0 : sinceLastPlay + 1;
    // Deste tükendi + kimse oynayamıyor → stalemate (gerçek UNO uç durumu)
    if (!state.winner && state.deck.length === 0 && sinceLastPlay >= nPlayers + 1) {
      return { result: 'stalemate', moves };
    }
  }
  if (!state.winner) return { result: 'maxmoves', moves };
  // kazananın eli boş olmalı
  if (state.hands[state.winner].length !== 0) throw new Error('winner-hand-not-empty');
  return { result: 'win', moves, winner: state.winner };
}

// ── Koş ──
const GAMES = 4000;
const stats = { win: 0, stalemate: 0, maxmoves: 0 };
let totalMoves = 0, maxMoves = 0;
for (let i = 0; i < GAMES; i++) {
  const nPlayers = 2 + (i % 3);          // 2,3,4 döngüsü
  const r = runGame(i * 2654435761 % 2147483647 + 1, nPlayers);
  stats[r.result]++;
  totalMoves += r.moves;
  if (r.moves > maxMoves) maxMoves = r.moves;
}

console.log('Son Kart fuzz —', GAMES, 'oyun (2-4 kişi)');
console.log('  kazanan ile biten :', stats.win);
console.log('  stalemate (deste bitti):', stats.stalemate);
console.log('  MAX hamle aşımı   :', stats.maxmoves);
console.log('  ort. hamle/oyun   :', (totalMoves / GAMES).toFixed(1), '| en uzun:', maxMoves);
if (stats.maxmoves > 0) { console.error('HATA: MAX hamle aşıldı (olası sonsuz döngü).'); process.exit(1); }
console.log('✔ Değişmez (108 kart) her adımda korundu, hata fırlatılmadı.');
