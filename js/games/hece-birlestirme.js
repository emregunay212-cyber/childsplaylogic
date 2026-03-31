/* ============================================
   OYUN: Hece Birleştirme
   ============================================ */

const HeceBirlestirme = (() => {
  const id = 'hece-birlestirme';

  // Kelime havuzu: [heceler, emoji]
  const WORDS_L1 = [
    [['ar','ba'], '🚗'], [['el','ma'], '🍎'], [['ka','pı'], '🚪'],
    [['ba','ba'], '👨'], [['an','ne'], '👩'], [['de','de'], '👴'],
    [['su','yu'], '💧'], [['ta','vuk'], '🐔'], [['ör','dek'], '🦆'],
    [['ka','lem'], '✏️'], [['si','lgi'], '🧹'], [['ma','sa'], '🪑'],
    [['ke','di'], '🐱'], [['kö','pek'], '🐶'], [['ku','zu'], '🐑'],
  ];
  const WORDS_L2 = [
    [['ba','lık'], '🐟'], [['ço','cuk'], '👦'], [['ta','vşan'], '🐰'],
    [['çi','çek'], '🌸'], [['bul','ut'], '☁️'], [['ka','lem'], '✏️'],
    [['ay','çi','çek'], '🌻'], [['kar','puz'], '🍉'], [['por','ta','kal'], '🍊'],
    [['ke','le','bek'], '🦋'], [['kurt','ba','ğa'], '🐸'], [['de','niz'], '🌊'],
  ];
  const WORDS_L3 = [
    [['ke','le','bek'], '🦋'], [['pa','ta','tes'], '🥔'], [['do','ma','tes'], '🍅'],
    [['por','ta','kal'], '🍊'], [['ço','cuk','lar'], '👧'], [['hay','van','lar'], '🐾'],
    [['öğ','ret','men'], '👩‍🏫'], [['kurt','ba','ğa'], '🐸'], [['bil','gi','sa','yar'], '💻'],
    [['te','le','viz','yon'], '📺'], [['ka','ra','bi','ber'], '🌶️'],
  ];

  const levels = [
    { words: WORDS_L1, rounds: 5 },
    { words: WORDS_L2, rounds: 5 },
    { words: WORDS_L3, rounds: 5 },
  ];

  let container, callbacks, currentLevel, round, totalRounds, usedIndices;

  function init(gameArea, level, cbs) {
    container = gameArea;
    callbacks = cbs;
    currentLevel = levels[level - 1];
    round = 0;
    totalRounds = currentLevel.rounds;
    usedIndices = [];
    GameEngine.setTotal(totalRounds);
    nextRound();
  }

  function pickWord() {
    const pool = currentLevel.words;
    let idx;
    let attempts = 0;
    do {
      idx = Math.floor(Math.random() * pool.length);
      attempts++;
    } while (usedIndices.includes(idx) && attempts < 30);
    usedIndices.push(idx);
    return pool[idx];
  }

  function nextRound() {
    round++;
    const [syllables, emoji] = pickWord();
    const shuffled = [...syllables].sort(() => Math.random() - 0.5);
    let selected = [];

    container.innerHTML = `
      <div class="hece-game">
        <div class="hece-progress">Kelime ${round}/${totalRounds}</div>
        <div class="hece-target">
          <span class="hece-emoji">${emoji}</span>
          <span class="hece-hint">Heceleri doğru sıraya koy!</span>
        </div>
        <div class="hece-answer-area" id="hece-answer">
          ${syllables.map(() => '<div class="hece-slot"></div>').join('')}
        </div>
        <div class="hece-syllables" id="hece-pool">
          ${shuffled.map((s, i) => `<button class="hece-btn" data-syl="${s}" data-idx="${i}">${s}</button>`).join('')}
        </div>
      </div>`;

    const pool = container.querySelector('#hece-pool');
    const answerArea = container.querySelector('#hece-answer');

    pool.querySelectorAll('.hece-btn').forEach(btn => {
      btn.onclick = () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.classList.add('hece-used');
        selected.push(btn.dataset.syl);

        // Fill next slot
        const slots = answerArea.querySelectorAll('.hece-slot');
        const slot = slots[selected.length - 1];
        if (slot) {
          slot.textContent = btn.dataset.syl;
          slot.classList.add('hece-filled');
        }

        AudioManager.play('tap');

        // All syllables placed?
        if (selected.length === syllables.length) {
          setTimeout(() => checkAnswer(selected, syllables, emoji), 400);
        }
      };
    });

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'hece-reset-btn';
    resetBtn.textContent = '↺ Tekrar';
    resetBtn.onclick = () => {
      selected = [];
      pool.querySelectorAll('.hece-btn').forEach(b => { b.disabled = false; b.classList.remove('hece-used'); });
      answerArea.querySelectorAll('.hece-slot').forEach(s => { s.textContent = ''; s.classList.remove('hece-filled'); });
    };
    container.querySelector('.hece-game').appendChild(resetBtn);
  }

  function checkAnswer(selected, correct, emoji) {
    const isCorrect = selected.join('') === correct.join('');
    const answerArea = container.querySelector('#hece-answer');

    if (isCorrect) {
      answerArea.classList.add('hece-success');
      callbacks.onCorrect();
      AudioManager.play('success');

      // Show full word
      const word = correct.join('');
      answerArea.innerHTML = `<div class="hece-word-reveal">${emoji} ${word}</div>`;

      const rect = answerArea.getBoundingClientRect();
      Particles.sparkle(rect.left + rect.width / 2, rect.top, 8);

      setTimeout(() => {
        if (round >= totalRounds) callbacks.onComplete();
        else nextRound();
      }, 1200);
    } else {
      answerArea.classList.add('hece-wrong');
      callbacks.onWrong();
      AudioManager.play('error');

      setTimeout(() => {
        answerArea.classList.remove('hece-wrong');
        // Reset for retry
        const pool = container.querySelector('#hece-pool');
        if (pool) {
          pool.querySelectorAll('.hece-btn').forEach(b => { b.disabled = false; b.classList.remove('hece-used'); });
        }
        answerArea.querySelectorAll('.hece-slot').forEach(s => { s.textContent = ''; s.classList.remove('hece-filled'); });
      }, 800);
    }
  }

  function destroy() { if (container) container.innerHTML = ''; }

  return { id, levels, init, destroy };
})();
