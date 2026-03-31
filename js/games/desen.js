/* ============================================
   OYUN: Desen Tamamlama
   Tekrarlayan desenleri tanı ve tamamla
   ============================================ */

const Desen = (() => {
  const id = 'desen';

  const SHAPES = ['🔴','🔵','🟡','🟢','🟣','🟠','⭐','💎','🌙','❤️','🔷','🔶','♦️','🟤'];

  const levels = [
    { patternLen: 2, seqLen: 5, rounds: 5 },  // AB deseni, 5 eleman göster
    { patternLen: 3, seqLen: 7, rounds: 5 },  // ABC deseni
    { patternLen: 4, seqLen: 9, rounds: 5 },  // AABB/ABCD karmaşık
  ];

  let container, callbacks, currentLevel, round, totalRounds;

  function init(gameArea, level, cbs) {
    container = gameArea;
    callbacks = cbs;
    currentLevel = levels[level - 1];
    round = 0;
    totalRounds = currentLevel.rounds;
    GameEngine.setTotal(totalRounds);
    nextRound();
  }

  function generatePattern() {
    const { patternLen, seqLen } = currentLevel;
    // Pick unique shapes for the pattern
    const shuffled = [...SHAPES].sort(() => Math.random() - 0.5);
    const pattern = shuffled.slice(0, patternLen);

    // Build sequence
    const sequence = [];
    for (let i = 0; i < seqLen + 1; i++) {
      sequence.push(pattern[i % patternLen]);
    }

    // The answer is the last element
    const answer = sequence[seqLen];
    const visible = sequence.slice(0, seqLen);

    // Generate wrong choices
    const wrongPool = SHAPES.filter(s => s !== answer);
    const wrongShuffled = wrongPool.sort(() => Math.random() - 0.5);
    const choices = [answer, wrongShuffled[0], wrongShuffled[1]];
    if (patternLen >= 3) choices.push(wrongShuffled[2]);

    return {
      visible,
      answer,
      choices: choices.sort(() => Math.random() - 0.5),
      pattern,
    };
  }

  function nextRound() {
    round++;
    const q = generatePattern();

    container.innerHTML = `
      <div class="desen-game">
        <div class="desen-progress">Desen ${round}/${totalRounds}</div>
        <div class="desen-instruction">Sıradaki ne olmalı?</div>
        <div class="desen-sequence">
          ${q.visible.map(s => `<div class="desen-item">${s}</div>`).join('')}
          <div class="desen-item desen-unknown">❓</div>
        </div>
        <div class="desen-choices">
          ${q.choices.map(c => `
            <button class="desen-choice" data-val="${c}">${c}</button>
          `).join('')}
        </div>
      </div>`;

    container.querySelectorAll('.desen-choice').forEach(btn => {
      btn.onclick = () => handleChoice(btn, q.answer);
    });
  }

  function handleChoice(btn, answer) {
    container.querySelectorAll('.desen-choice').forEach(b => b.disabled = true);
    const selected = btn.dataset.val;

    if (selected === answer) {
      btn.classList.add('desen-correct');
      callbacks.onCorrect();
      AudioManager.play('success');

      // Reveal answer in sequence
      const unknown = container.querySelector('.desen-unknown');
      if (unknown) {
        unknown.textContent = answer;
        unknown.classList.remove('desen-unknown');
        unknown.classList.add('desen-revealed');
      }

      const rect = btn.getBoundingClientRect();
      Particles.sparkle(rect.left + rect.width / 2, rect.top, 6);

      setTimeout(() => {
        if (round >= totalRounds) callbacks.onComplete();
        else nextRound();
      }, 1000);
    } else {
      btn.classList.add('desen-wrong');
      callbacks.onWrong();
      AudioManager.play('error');

      // Highlight correct
      container.querySelectorAll('.desen-choice').forEach(b => {
        if (b.dataset.val === answer) b.classList.add('desen-correct');
      });

      setTimeout(() => {
        if (round >= totalRounds) callbacks.onComplete();
        else nextRound();
      }, 1500);
    }
  }

  function destroy() { if (container) container.innerHTML = ''; }

  return { id, levels, init, destroy };
})();
