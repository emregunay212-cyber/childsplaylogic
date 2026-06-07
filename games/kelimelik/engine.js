/* ============================================
   KELİMELİK — Çekirdek Motor (saf mantık, UI'dan bağımsız)
   State serileştirilebilir (online senkron için hazır); puanlama + yerleşim
   doğrulaması burada. Sözlük AYRI (dict.js) — değiştirilebilir.
   ============================================ */
const KelimelikEngine = (() => {
  const SIZE = 15;
  const CENTER = 7;

  // Türkçe Scrabble harf puanları ( * = joker/boş taş, 0 puan )
  const VALUES = {
    'A':1,'B':3,'C':4,'Ç':4,'D':3,'E':1,'F':7,'G':5,'Ğ':8,'H':5,'I':2,'İ':1,
    'J':10,'K':1,'L':1,'M':2,'N':1,'O':2,'Ö':7,'P':5,'R':1,'S':2,'Ş':4,'T':1,
    'U':2,'Ü':3,'V':7,'Y':3,'Z':4,'*':0
  };

  // Harf dağılımı (torba) — toplam 100 taş (2 joker dahil)
  const DIST = {
    'A':12,'B':2,'C':2,'Ç':2,'D':2,'E':8,'F':1,'G':1,'Ğ':1,'H':1,'I':4,'İ':7,
    'J':1,'K':7,'L':7,'M':4,'N':5,'O':3,'Ö':1,'P':1,'R':6,'S':3,'Ş':2,'T':5,
    'U':3,'Ü':2,'V':1,'Y':2,'Z':2,'*':2
  };

  // Özel kareler (15x15). TW=Kelime×3, DW=Kelime×2, TL=Harf×3, DL=Harf×2.
  // Standart Scrabble yerleşimi (merkez 7,7 = DW + yıldız).
  function buildSpecials() {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
    const set = (type, coords) => coords.forEach(([r, c]) => { g[r][c] = type; });
    set('TW', [[0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]]);
    set('DW', [[1,1],[2,2],[3,3],[4,4],[1,13],[2,12],[3,11],[4,10],
               [13,1],[12,2],[11,3],[10,4],[13,13],[12,12],[11,11],[10,10],[7,7]]);
    set('TL', [[1,5],[1,9],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[13,5],[13,9]]);
    set('DL', [[0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],[6,2],[6,6],[6,8],[6,12],
               [7,3],[7,11],[8,2],[8,6],[8,8],[8,12],[11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11]]);
    return g;
  }
  const SPECIALS = buildSpecials();

  function letterValue(L) { return VALUES[L] || 0; }

  function newBag() {
    const bag = [];
    for (const L in DIST) for (let i = 0; i < DIST[L]; i++) bag.push(L);
    return shuffle(bag);
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function draw(bag, n) { const out = []; for (let i = 0; i < n && bag.length; i++) out.push(bag.pop()); return out; }

  // Boş 15x15 tahta (her hücre: null | {letter})
  function newBoard() { return Array.from({ length: SIZE }, () => Array(SIZE).fill(null)); }

  // Bir hamleyi DEĞERLENDİR (yerleşim geçerli mi + puan + oluşan kelimeler).
  // board: mevcut taşlar (null|{letter}). placed: [{r,c,letter}] yeni konan taşlar.
  // Sözlük kontrolü BURADA YOK — çağıran (game.js) words[].word'leri dict ile doğrular.
  // Dönüş: {ok:false, reason} | {ok:true, score, words:[{word,score,cells}], placed}
  function evaluateMove(board, placed) {
    if (!placed || !placed.length) return { ok: false, reason: 'Tahtaya taş koymadın.' };

    const rows = new Set(placed.map(p => p.r)), cols = new Set(placed.map(p => p.c));
    const horizontal = rows.size === 1;
    const vertical = cols.size === 1;
    if (!horizontal && !vertical) return { ok: false, reason: 'Taşlar tek bir satır/sütunda olmalı.' };

    // Birleşik tahta (mevcut + yeni), yeni taşlar neu:true
    const B = board.map(row => row.map(c => c ? { letter: c.letter, neu: false } : null));
    for (const p of placed) {
      if (B[p.r][p.c]) return { ok: false, reason: 'Dolu kareye taş konamaz.' };
      B[p.r][p.c] = { letter: p.letter, neu: true };
    }

    const isFirst = board.every(row => row.every(c => !c));
    if (isFirst) {
      if (!placed.some(p => p.r === CENTER && p.c === CENTER))
        return { ok: false, reason: 'İlk kelime ortadaki yıldıza değmeli.' };
    } else {
      const adj = placed.some(p => [[1,0],[-1,0],[0,1],[0,-1]].some(([dr, dc]) => {
        const nr = p.r + dr, nc = p.c + dc;
        return nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc];
      }));
      if (!adj) return { ok: false, reason: 'Yeni kelime mevcut harflere değmeli.' };
    }

    // Bir hücreden başlayıp dr,dc yönünde kesintisiz harf dizisini topla
    function gatherLine(r, c, dr, dc) {
      let sr = r, sc = c;
      while (true) { const pr = sr - dr, pc = sc - dc; if (pr < 0 || pc < 0 || pr >= SIZE || pc >= SIZE || !B[pr][pc]) break; sr = pr; sc = pc; }
      const cells = [];
      let cr = sr, cc = sc;
      while (cr >= 0 && cc >= 0 && cr < SIZE && cc < SIZE && B[cr][cc]) {
        cells.push({ r: cr, c: cc, letter: B[cr][cc].letter, neu: B[cr][cc].neu });
        cr += dr; cc += dc;
      }
      return cells;
    }

    const words = [];
    const mdr = horizontal ? 0 : 1, mdc = horizontal ? 1 : 0;   // ana yön
    const cdr = horizontal ? 1 : 0, cdc = horizontal ? 0 : 1;   // çapraz yön
    const main = gatherLine(placed[0].r, placed[0].c, mdr, mdc);
    if (main.length >= 2) words.push(main);
    // Ana kelime tüm yeni taşları içermeli (boşluk olmamalı)
    for (const p of placed) if (!main.some(c => c.r === p.r && c.c === p.c))
      return { ok: false, reason: 'Harfler bitişik olmalı (boşluk var).' };
    // Her yeni taş için dik (çapraz) kelime
    for (const p of placed) { const cross = gatherLine(p.r, p.c, cdr, cdc); if (cross.length >= 2) words.push(cross); }

    if (!words.length) return { ok: false, reason: 'En az 2 harfli bir kelime oluşturmalısın.' };

    let total = 0; const wlist = [];
    for (const cells of words) {
      let wordMul = 1, sc = 0;
      for (const c of cells) {
        let lv = letterValue(c.letter);
        if (c.neu) {
          const sp = SPECIALS[c.r][c.c];
          if (sp === 'DL') lv *= 2; else if (sp === 'TL') lv *= 3;
          else if (sp === 'DW') wordMul *= 2; else if (sp === 'TW') wordMul *= 3;
        }
        sc += lv;
      }
      sc *= wordMul;
      total += sc;
      wlist.push({ word: cells.map(c => c.letter).join(''), score: sc, cells });
    }
    if (placed.length === 7) total += 50;   // tüm ıstakayı kullanma bonusu (bingo)

    return { ok: true, score: total, words: wlist, placed };
  }

  return { SIZE, CENTER, VALUES, DIST, SPECIALS, letterValue, newBag, shuffle, draw, newBoard, evaluateMove };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = KelimelikEngine;
