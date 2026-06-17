/* ============================================
   SON KART — Deste & Kurallar (SAF / pure)
   UNO-tarzı 108 kartlık deste, karıştırma ve legallik.
   Hem tarayıcı (window.SK_Deck) hem Node (module.exports) için UMD.
   Kart: { c:'r|y|g|b|w', v:'0'..'9'|'skip'|'rev'|'d2'|'wild'|'wd4', id:int }
   ============================================ */
(function (root, factory) {
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.SK_Deck = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const COLORS = ['r', 'y', 'g', 'b'];           // kırmızı, sarı, yeşil, mavi
  const ACTIONS = ['skip', 'rev', 'd2'];          // renkli aksiyon kartları

  // 108 kart: renk başına 0×1, 1-9×2, skip/rev/d2 ×2  (=25), 4 renk =100;
  // + wild ×4, wd4 ×4 = 8.  Toplam 108. id'ler benzersiz 0..107.
  function buildDeck() {
    const cards = [];
    let id = 0;
    for (const c of COLORS) {
      cards.push({ c, v: '0', id: id++ });
      for (let n = 1; n <= 9; n++) { cards.push({ c, v: '' + n, id: id++ }); cards.push({ c, v: '' + n, id: id++ }); }
      for (const a of ACTIONS) { cards.push({ c, v: a, id: id++ }); cards.push({ c, v: a, id: id++ }); }
    }
    for (let k = 0; k < 4; k++) cards.push({ c: 'w', v: 'wild', id: id++ });
    for (let k = 0; k < 4; k++) cards.push({ c: 'w', v: 'wd4', id: id++ });
    return cards;
  }

  // mulberry32 — küçük, deterministik PRNG (fuzz testi için tohumlanabilir).
  function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fisher-Yates — yeni dizi döndürür; rng yoksa Math.random.
  function shuffle(arr, rng) {
    const r = rng || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function isWild(card) { return !!card && (card.v === 'wild' || card.v === 'wd4'); }

  // Bir kart, üstteki karta + aktif renge göre oynanabilir mi?
  // curColor: aktif renk (joker sonrası seçilen renk; normalde top.c ile aynı).
  function canPlay(card, top, curColor) {
    if (!card) return false;
    if (isWild(card)) return true;                 // joker her zaman oynanır (v1: wd4 serbest)
    if (card.c === curColor) return true;          // renk eşleşmesi
    if (top && !isWild(top) && card.v === top.v) return true; // değer eşleşmesi
    return false;
  }

  return { COLORS, ACTIONS, buildDeck, makeRng, shuffle, isWild, canPlay };
});
