/* ============================================
   KELİMELİK — Yapay Zeka Rakibi
   Strateji: raftan tüm permütasyonları üret (2-7 harf),
   sözlükte geçerlileri tahtada dene, en yüksek puanı seç.
   Jokerler: yaygın Türkçe harflerle ikame edilir.
   ============================================ */
const KelimelikAI = (() => {
  const TR_COMMON = ['A','E','İ','K','R','T','L','N','M','S','D','U','Y','I','O','B','Ç','H','G','Z'];

  // Ana fonksiyon: mevcut tahta ve raf için en iyi hamleyi bul
  function findBestMove(board, rackLetters) {
    const E = KelimelikEngine, D = KelimelikDict;
    if (!D.isLoaded()) return null;

    const isEmpty = !board.some(row => row.some(c => c));
    const candidates = [];

    // Joker içeren raf için varyantlar üret
    const racks = buildRackVariants(rackLetters);

    // Tüm varyantlardan geçerli kelimeleri topla
    const wordSet = new Set();
    for (const rack of racks) collectWords(rack, wordSet, D);

    const words = [...wordSet];
    if (!words.length) return null;

    // Her kelimeyi tahtada her konumda dene
    for (const word of words) {
      if (word.length < 2) continue;

      // Yatay yerleşimler
      for (let r = 0; r < E.SIZE; r++) {
        for (let c = 0, max = E.SIZE - word.length; c <= max; c++) {
          if (!quickConnect(board, r, c, word.length, true, isEmpty)) continue;
          const placed = tryFit(board, word, r, c, true, rackLetters);
          if (!placed) continue;
          const res = E.evaluateMove(board, placed);
          if (res.ok && res.words.every(w => D.isValid(w.word))) {
            candidates.push({ placed, score: res.score, words: res.words });
          }
        }
      }

      // Dikey yerleşimler
      for (let r = 0, maxR = E.SIZE - word.length; r <= maxR; r++) {
        for (let c = 0; c < E.SIZE; c++) {
          if (!quickConnect(board, r, c, word.length, false, isEmpty)) continue;
          const placed = tryFit(board, word, r, c, false, rackLetters);
          if (!placed) continue;
          const res = E.evaluateMove(board, placed);
          if (res.ok && res.words.every(w => D.isValid(w.word))) {
            candidates.push({ placed, score: res.score, words: res.words });
          }
        }
      }
    }

    if (!candidates.length) return null;

    // En yüksek puanlı 3 arasından rastgele seç (hafif çeşitlilik)
    candidates.sort((a, b) => b.score - a.score);
    return candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
  }

  // Joker ('*') için yaygın harflerle ikame varyantları üret
  function buildRackVariants(rackLetters) {
    const base = rackLetters.filter(l => l !== '*');
    const jokers = rackLetters.length - base.length;
    if (jokers === 0) return [base];
    // Tek ya da çift joker: her yaygın harf için bir varyant (ikincisi tryFit'e bırakılır)
    return TR_COMMON.map(sub => [...base, sub]);
  }

  // Permütasyon: raftaki harflerden oluşan sözlükte geçerli tüm kelimeleri topla
  function collectWords(rack, wordSet, D) {
    function go(rem, cur) {
      if (cur.length >= 2 && D.isValid(cur.join(''))) wordSet.add(cur.join(''));
      if (cur.length >= 7 || !rem.length) return;
      const seen = new Set();
      for (let i = 0; i < rem.length; i++) {
        if (seen.has(rem[i])) continue;
        seen.add(rem[i]);
        const next = rem.slice(); next.splice(i, 1);
        go(next, [...cur, rem[i]]);
      }
    }
    go(rack, []);
  }

  // Yerleşim, mevcut taşlarla bağlantılı olabilir mi? (gereksiz evaluateMove'u azaltır)
  function quickConnect(board, sr, sc, len, horiz, isEmpty) {
    const SZ = KelimelikEngine.SIZE, C = KelimelikEngine.CENTER;
    for (let i = 0; i < len; i++) {
      const r = horiz ? sr : sr + i, c = horiz ? sc + i : sc;
      if (isEmpty) { if (r === C && c === C) return true; continue; }
      if (board[r][c]) return true;
      if (r > 0    && board[r-1][c]) return true;
      if (r < SZ-1 && board[r+1][c]) return true;
      if (c > 0    && board[r][c-1]) return true;
      if (c < SZ-1 && board[r][c+1]) return true;
    }
    return false;
  }

  // Kelimeyi (sr,sc) noktasına yatay/dikey yerleştirmeyi dene.
  // Mevcut taşlar uyuşuyorsa atla; kalan harfleri rafta ara (joker desteği).
  // Başarılıysa placed dizisi, aksi hâlde null döner.
  function tryFit(board, word, sr, sc, horiz, rack) {
    const placed = [], needed = [];
    for (let i = 0; i < word.length; i++) {
      const r = horiz ? sr : sr + i, c = horiz ? sc + i : sc;
      const ex = board[r][c];
      if (ex) { if (ex.letter !== word[i]) return null; }
      else { placed.push({ r, c, letter: word[i] }); needed.push(word[i]); }
    }
    if (!placed.length) return null;

    const rackCopy = rack.slice();
    for (const letter of needed) {
      const idx = rackCopy.indexOf(letter);
      if (idx !== -1) { rackCopy.splice(idx, 1); }
      else {
        const ji = rackCopy.indexOf('*');
        if (ji !== -1) { rackCopy.splice(ji, 1); }
        else return null;
      }
    }
    return placed;
  }

  // Kullanılan harfleri raftan çıkar (joker desteğiyle); yeni dizi döner
  function removeFromRack(rack, usedLetters) {
    const copy = rack.slice();
    for (const letter of usedLetters) {
      const idx = copy.indexOf(letter);
      if (idx !== -1) { copy.splice(idx, 1); }
      else {
        const ji = copy.indexOf('*');
        if (ji !== -1) copy.splice(ji, 1);
      }
    }
    return copy;
  }

  return { findBestMove, removeFromRack };
})();
