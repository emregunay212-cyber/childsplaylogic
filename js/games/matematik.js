/* ============================================
   OYUN: Matematik - Toplama & Çıkarma
   ============================================ */

const Matematik = (() => {
  const id = 'matematik';
  const levels = [
    { maxNum: 10, ops: ['+'], rounds: 5 },
    { maxNum: 10, ops: ['+', '-'], rounds: 5 },
    { maxNum: 20, ops: ['+', '-'], rounds: 5 },
  ];

  let container, callbacks, currentLevel, round, totalRounds;

  function init(gameArea, level, cbs) {
    container = gameArea;
    callbacks = cbs;
    currentLevel = levels[level - 1];
    round = 0;
    totalRounds = currentLevel.rounds;
    GameEngine.setTotal(totalRounds);
    nextQuestion();
  }

  function generateQuestion() {
    const { maxNum, ops } = currentLevel;
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, answer;

    if (op === '+') {
      a = 1 + Math.floor(Math.random() * (maxNum - 1));
      b = 1 + Math.floor(Math.random() * (maxNum - a));
      answer = a + b;
    } else {
      a = 2 + Math.floor(Math.random() * (maxNum - 1));
      b = 1 + Math.floor(Math.random() * (a - 1));
      answer = a - b;
    }
    return { a, b, op, answer };
  }

  function generateChoices(answer, maxNum) {
    const choices = new Set([answer]);
    while (choices.size < 4) {
      let wrong = answer + (Math.floor(Math.random() * 5) - 2);
      if (wrong < 0) wrong = Math.floor(Math.random() * 5);
      if (wrong !== answer && wrong >= 0 && wrong <= maxNum * 2) choices.add(wrong);
    }
    return [...choices].sort(() => Math.random() - 0.5);
  }

  function nextQuestion() {
    round++;
    const q = generateQuestion();
    const choices = generateChoices(q.answer, currentLevel.maxNum);
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7B731'];

    container.innerHTML = `
      <div class="mat-game">
        <div class="mat-progress">Soru ${round}/${totalRounds}</div>
        <div class="mat-question">
          <span class="mat-num">${q.a}</span>
          <span class="mat-op">${q.op === '+' ? '+' : '−'}</span>
          <span class="mat-num">${q.b}</span>
          <span class="mat-eq">=</span>
          <span class="mat-num mat-unknown">?</span>
        </div>
        <div class="mat-choices">
          ${choices.map((c, i) => `
            <button class="mat-choice" data-answer="${c}" style="background: ${colors[i]};">
              ${c}
            </button>
          `).join('')}
        </div>
      </div>`;

    container.querySelectorAll('.mat-choice').forEach(btn => {
      btn.onclick = () => handleAnswer(parseInt(btn.dataset.answer), q.answer, btn);
    });
  }

  function handleAnswer(selected, correct, btn) {
    // Disable all buttons
    container.querySelectorAll('.mat-choice').forEach(b => b.disabled = true);

    if (selected === correct) {
      btn.classList.add('mat-correct');
      callbacks.onCorrect();
      AudioManager.play('success');
      const rect = btn.getBoundingClientRect();
      Particles.sparkle(rect.left + rect.width / 2, rect.top, 6);

      // Update ? with answer
      const unknown = container.querySelector('.mat-unknown');
      if (unknown) { unknown.textContent = correct; unknown.classList.add('mat-revealed'); }

      setTimeout(() => {
        if (round >= totalRounds) {
          callbacks.onComplete();
        } else {
          nextQuestion();
        }
      }, 1000);
    } else {
      btn.classList.add('mat-wrong');
      callbacks.onWrong();
      AudioManager.play('error');

      // Show correct answer
      container.querySelectorAll('.mat-choice').forEach(b => {
        if (parseInt(b.dataset.answer) === correct) b.classList.add('mat-correct');
      });

      setTimeout(() => {
        if (round >= totalRounds) {
          callbacks.onComplete();
        } else {
          nextQuestion();
        }
      }, 1500);
    }
  }

  function destroy() { if (container) container.innerHTML = ''; }

  return { id, levels, init, destroy };
})();
