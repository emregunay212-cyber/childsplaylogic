/* ============================================
   SON KART — Bot (SAF / sezgisel)
   choose(state, pid) → hamle önerisi:
     { type:'play', cardId, color? }  veya  { type:'draw' }
   Strateji (basit ama makul):
     - Oynanabilir kart varsa oyna; jokerleri (wild/wd4) son çare olarak sakla.
     - Aynı değerden birden çok kartı eritmek için: önce renkli aksiyon/sayı,
       sonra joker.
     - Joker oynanırsa renk = elde EN ÇOK bulunan renk.
   "Son Kart" anonsunu bot her zaman yapar (denetleyici declareUno=true geçer).
   ============================================ */
(function (root, factory) {
  const Deck = (typeof require !== 'undefined') ? require('./deck.js') : root.SK_Deck;
  const Engine = (typeof require !== 'undefined') ? require('./engine.js') : root.SK_Engine;
  const mod = factory(Deck, Engine);
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.SK_Bot = mod;
})(typeof self !== 'undefined' ? self : this, function (Deck, Engine) {
  'use strict';

  // Elde en çok bulunan renk (joker hariç). Hiç renkli yoksa rastgele renk.
  function bestColor(hand) {
    const cnt = { r: 0, y: 0, g: 0, b: 0 };
    hand.forEach(c => { if (cnt[c.c] != null) cnt[c.c]++; });
    let best = 'r', max = -1;
    for (const c of Deck.COLORS) if (cnt[c] > max) { max = cnt[c]; best = c; }
    if (max === 0) best = Deck.COLORS[Math.floor(Math.random() * Deck.COLORS.length)];
    return best;
  }

  function choose(state, pid) {
    const hand = state.hands[pid] || [];
    const legalIds = Engine.legalMoves(state, pid);
    if (legalIds.length === 0) return { type: 'draw' };

    const legal = hand.filter(c => legalIds.indexOf(c.id) >= 0);
    // Joker olmayanları öne al — jokerleri sakla
    const nonWild = legal.filter(c => !Deck.isWild(c));
    const pool = nonWild.length ? nonWild : legal;
    const pick = pool[0];

    if (Deck.isWild(pick)) {
      // Joker oynarken: rengi seçerken bu jokeri elden düşmüş kabul edip kalan renge bak
      const rest = hand.filter(c => c.id !== pick.id);
      return { type: 'play', cardId: pick.id, color: bestColor(rest) };
    }
    return { type: 'play', cardId: pick.id };
  }

  return { choose, bestColor };
});
