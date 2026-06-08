/* ============================================
   KELİMELİK — Yapay Zeka Rakibi
   Strateji: sözlükteki kelimelerden rafla oluşturulabilecekleri filtrele,
   tahtada dene, en yüksek puanı seç.
   ============================================ */
const KelimelikAI = (() => {

  // Ana fonksiyon: mevcut tahta ve raf için en iyi hamleyi bul
  function findBestMove(board, rackLetters) {
    const E = KelimelikEngine, D = KelimelikDict;
    if (!D.isLoaded()) return null;

    const isEmpty = !board.some(row => row.some(c => c));
    const candidates = [];

    // Sözlükten rafla oluşturulabilecek kelimeleri topla
    const wordSet = new Set();
    collectWords(rackLetters, wordSet, D);

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

  // Sözlükteki kelimeleri tara; raftan oluşturulabilecekleri wordSet'e ekle.
  // Joker ('*') gereken eksik harfleri karşılar.
  function collectWords(rackLetters, wordSet, D) {
    const rackMap = {};
    for (const l of rackLetters) rackMap[l] = (rackMap[l] || 0) + 1;
    const jokers = rackMap['*'] || 0;

    for (const word of D.words()) {
      if (word.length < 2 || word.length > 7) continue;
      if (canForm(word, rackMap, jokers)) wordSet.add(word);
    }
  }

  function canForm(word, rackMap, jokers) {
    let extra = 0;
    const need = {};
    for (const l of word) need[l] = (need[l] || 0) + 1;
    for (const l of Object.keys(need)) {
      const deficit = need[l] - (rackMap[l] || 0);
      if (deficit > 0) extra += deficit;
    }
    return extra <= jokers;
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
