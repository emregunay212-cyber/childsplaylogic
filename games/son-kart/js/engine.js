/* ============================================
   SON KART — Oyun Motoru (SAF / mod-bağımsız)
   Durum makinesi: deal / legalMoves / play / draw / pass.
   Aynı durum gövdesi hem solo (bellek) hem online (RTDB) için kullanılır.
   Tur modeli: aktif-oyuncu yetkili — sırası gelen oyuncu yeni durumu üretir.

   Durum (state):
     pids:[id], hands:{id:[card]}, deck:[card], discard:[card] (üst=son),
     curColor:'r|y|g|b', dir:1|-1, turn:pid, active:{id:bool},
     saidUno:{id:bool}, winner:pid|null, last:{by,action,card,color,drew},
     lastDrawn: cardId|null  (en son çekilen kart; draw sonrası UI/bot için)
   ============================================ */
(function (root, factory) {
  const Deck = (typeof require !== 'undefined') ? require('./deck.js') : root.SK_Deck;
  const mod = factory(Deck);
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.SK_Engine = mod;
})(typeof self !== 'undefined' ? self : this, function (Deck) {
  'use strict';

  let _rng = Math.random;
  function setRng(fn) { _rng = fn || Math.random; }

  function clone(state) { return JSON.parse(JSON.stringify(state)); }
  function top(state) { return state.discard[state.discard.length - 1]; }
  function isActive(state, pid) { return state.active[pid] !== false; }
  function activeCount(state) { return state.pids.filter(p => isActive(state, p)).length; }

  // from pid'den dir yönünde `steps` AKTİF koltuk ilerle → varılan pid.
  function advance(state, fromPid, steps) {
    const n = state.pids.length;
    let idx = state.pids.indexOf(fromPid);
    if (activeCount(state) <= 1) return fromPid;
    let moved = 0, guard = 0;
    while (moved < steps && guard < n * 4) {
      idx = (idx + state.dir + n) % n;
      if (isActive(state, state.pids[idx])) moved++;
      guard++;
    }
    return state.pids[idx];
  }

  // Deste boşsa ıskartayı (üst hariç) karıştırıp desteye koy.
  function reshuffleIfNeeded(state) {
    if (state.deck.length > 0) return;
    if (state.discard.length <= 1) return; // çekilecek kart kalmadı (nadir)
    const keep = state.discard.pop();
    state.deck = Deck.shuffle(state.discard, _rng);
    state.discard = [keep];
  }

  // pid eline desteden n kart çek (gerekirse karıştır).
  function drawN(state, pid, n) {
    const drawn = [];
    for (let i = 0; i < n; i++) {
      reshuffleIfNeeded(state);
      if (state.deck.length === 0) break;
      const card = state.deck.pop();
      state.hands[pid].push(card);
      drawn.push(card);
    }
    return drawn;
  }

  // ── Başlangıç dağıtımı (host/solo kurulum) ──
  function deal(pids) {
    let deck = Deck.shuffle(Deck.buildDeck(), _rng);
    const hands = {}, active = {}, saidUno = {};
    pids.forEach(p => { hands[p] = []; active[p] = true; saidUno[p] = false; });
    for (let i = 0; i < 7; i++) pids.forEach(p => hands[p].push(deck.pop()));
    // İlk açılan kart joker olmasın — jokerleri desteye geri katıp tekrar karıştır.
    let starter = deck.pop();
    while (Deck.isWild(starter)) { deck.push(starter); deck = Deck.shuffle(deck, _rng); starter = deck.pop(); }
    return {
      pids: pids.slice(),
      hands, deck, discard: [starter],
      curColor: starter.c, dir: 1, turn: pids[0],
      active, saidUno, winner: null,
      last: { by: null, action: 'start', card: starter, color: starter.c, drew: 0 },
      lastDrawn: null
    };
  }

  function findCard(hand, cardId) { return hand.find(c => c.id === cardId); }

  // pid'in elindeki oynanabilir kart id'leri.
  function legalMoves(state, pid) {
    const t = top(state);
    return (state.hands[pid] || []).filter(c => Deck.canPlay(c, t, state.curColor)).map(c => c.id);
  }

  // ── Kart oyna ── (illegal ise Error fırlatır)
  // declareUno: oyuncu bu hamleyle 1 karta düşerse "Son Kart" anonsu yaptı mı.
  function play(state, pid, cardId, chosenColor, declareUno) {
    if (state.winner) throw new Error('over');
    if (state.turn !== pid) throw new Error('not-turn');
    const hand = state.hands[pid];
    const card = findCard(hand, cardId);
    if (!card) throw new Error('no-card');
    if (!Deck.canPlay(card, top(state), state.curColor)) throw new Error('illegal');
    if (Deck.isWild(card) && Deck.COLORS.indexOf(chosenColor) < 0) throw new Error('no-color');

    const s = clone(state);
    s.lastDrawn = null;
    const h = s.hands[pid];
    h.splice(h.findIndex(c => c.id === cardId), 1);
    s.discard.push(card);
    s.curColor = Deck.isWild(card) ? chosenColor : card.c;
    s.last = { by: pid, action: 'play', card, color: s.curColor, drew: 0 };

    // Kazanma: el bitti → efekt/tur ilerletme yok.
    if (h.length === 0) { s.winner = pid; return s; }

    // Son Kart anonsu / cezası
    if (h.length === 1) {
      if (declareUno) s.saidUno[pid] = true;
      else { drawN(s, pid, 2); s.saidUno[pid] = false; s.last.drew = -2; } // -2: ceza işareti (UI)
    } else {
      s.saidUno[pid] = false;
    }

    // Aksiyon efektleri + tur ilerletme
    let steps = 1;
    if (card.v === 'rev') { s.dir = -s.dir; steps = (activeCount(s) === 2) ? 2 : 1; }
    else if (card.v === 'skip') { steps = 2; }
    else if (card.v === 'd2' || card.v === 'wd4') {
      const victim = advance(s, pid, 1);          // sıradaki aktif oyuncu
      const n = card.v === 'd2' ? 2 : 4;
      drawN(s, victim, n);
      s.last.drew = n;                            // pozitif: rakip çekti
      steps = 2;                                  // çeken oyuncu atlanır
    }
    s.turn = advance(s, pid, steps);
    return s;
  }

  // ── 1 kart çek ── (tur ilerlemez; çekilen kart s.lastDrawn'a yazılır)
  function draw(state, pid) {
    if (state.winner) throw new Error('over');
    if (state.turn !== pid) throw new Error('not-turn');
    const s = clone(state);
    const drawn = drawN(s, pid, 1);
    s.lastDrawn = drawn.length ? drawn[0].id : null;
    s.last = { by: pid, action: 'draw', card: null, color: s.curColor, drew: 1 };
    return s;
  }

  // ── Sıra geç ── (çektikten sonra oynamayan/oynayamayan oyuncu için)
  function pass(state, pid) {
    if (state.winner) throw new Error('over');
    if (state.turn !== pid) throw new Error('not-turn');
    const s = clone(state);
    s.lastDrawn = null;
    s.turn = advance(s, pid, 1);
    s.last = { by: pid, action: 'pass', card: null, color: s.curColor, drew: 0 };
    return s;
  }

  // ── Online: kopan koltuğu pasifleştir; sıra ondaysa ilerlet; <2 aktif → kazanan ──
  function deactivate(state, pid) {
    const s = clone(state);
    s.active[pid] = false;
    if (activeCount(s) === 1) { s.winner = s.pids.find(p => isActive(s, p)) || s.winner; return s; }
    if (s.turn === pid) s.turn = advance(s, pid, 1);
    return s;
  }

  return { setRng, deal, legalMoves, play, draw, pass, deactivate, top, isActive, activeCount, clone };
});
