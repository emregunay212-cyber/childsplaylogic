/* ============================================
   OYUN: Hece Birleştirme
   ============================================ */

const HeceBirlestirme = (() => {
  const id = 'hece-birlestirme';

  // Kelime havuzu: [heceler, resim_yolu, yanıltıcılar(opsiyonel)]
  const IMG = 'assets/images/words/';
  const WORDS_L1 = [
    // 3 heceli kelimeler — yanıltıcı yok
    [['a','ra','ba'], IMG+'araba.png'],
    [['por','ta','kal'], IMG+'portakal.png'],
    [['do','ma','tes'], IMG+'domates.png'],
    [['pa','ta','tes'], IMG+'patates.png'],
    [['ke','le','bek'], IMG+'kelebek.png'],
    [['kur','ba','ğa'], IMG+'kurbaga.png'],
    [['öğ','ret','men'], IMG+'ogretmen.png'],
    [['ka','rın','ca'], IMG+'karinca.png'],
    [['san','dal','ye'], IMG+'sandalye.png'],
    [['hay','van','lar'], IMG+'hayvanlar.png'],
    [['per','şem','be'], IMG+'takvim.png'],
    [['çi','çek','ler'], IMG+'cicekler.png'],
  ];
  const WORDS_L2 = [
    // 4 heceli kelimeler + 1 yanıltıcı hece
    [['bil','gi','sa','yar'], IMG+'bilgisayar.png', ['me']],
    [['te','le','viz','yon'], IMG+'televizyon.png', ['ka']],
    [['ka','ra','bi','ber'], IMG+'karabiber.png', ['tu']],
    [['he','li','kop','ter'], IMG+'helikopter.png', ['sa']],
    [['a','yak','ka','bı'], IMG+'ayakkabi.png', ['lı']],
    [['kü','tüp','ha','ne'], IMG+'kutüphane.png', ['ri']],
    [['o','to','mo','bil'], IMG+'araba.png', ['de']],
    [['cu','mar','te','si'], IMG+'takvim.png', ['na']],
    [['ça','ma','şır','lar'], IMG+'camasir.png', ['be']],
    [['mü','hen','dis','lik'], IMG+'muhendis.png', ['pa']],
  ];
  const WORDS_L3 = [
    // 4-5 heceli kelimeler + 2 yanıltıcı hece
    [['an','sik','lo','pe','di'], IMG+'kutüphane.png', ['ta','mu']],
    [['ü','ni','ver','si','te'], IMG+'universite.png', ['ka','lo']],
    [['ma','te','ma','tik','çi'], IMG+'matematik.png', ['bu','le']],
    [['bil','gi','sa','yar','cı'], IMG+'bilgisayar.png', ['me','tu']],
    [['te','le','viz','yon','cu'], IMG+'televizyon.png', ['ra','şı']],
    [['kü','tüp','ha','ne','ci'], IMG+'kutüphane.png', ['bo','lu']],
    [['he','li','kop','ter','ler'], IMG+'helikopter.png', ['sa','ni']],
    [['o','to','mo','bil','ler'], IMG+'araba.png', ['ka','dü']],
    [['a','yak','ka','bı','lar'], IMG+'ayakkabi.png', ['ti','se']],
    [['cu','mar','te','si','ler'], IMG+'takvim.png', ['ba','nö']],
  ];

  const levels = [
    { words: WORDS_L1, rounds: 6 },
    { words: WORDS_L2, rounds: 6 },
    { words: WORDS_L3, rounds: 7 },
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
    const wordData = pickWord();
    const syllables = wordData[0];
    const imgSrc = wordData[1];
    const distractors = wordData[2] || [];
    const allSyllables = [...syllables, ...distractors];
    const shuffled = allSyllables.sort(() => Math.random() - 0.5);
    let selected = [];

    container.innerHTML = `
      <div class="hece-game">
        <div class="hece-progress">Kelime ${round}/${totalRounds}</div>
        <div class="hece-target">
          <img class="hece-emoji-img" src="${imgSrc}" alt="ipucu" draggable="false">
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
          setTimeout(() => checkAnswer(selected, syllables, imgSrc), 400);
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

  function checkAnswer(selected, correct, imgSrc) {
    const isCorrect = selected.join('') === correct.join('');
    const answerArea = container.querySelector('#hece-answer');

    if (isCorrect) {
      answerArea.classList.add('hece-success');
      callbacks.onCorrect();
      AudioManager.play('success');

      // Show full word with image
      const word = correct.join('');
      while (answerArea.firstChild) answerArea.removeChild(answerArea.firstChild);
      const reveal = document.createElement('div');
      reveal.className = 'hece-word-reveal';
      const revealImg = document.createElement('img');
      revealImg.src = imgSrc;
      revealImg.alt = word;
      revealImg.className = 'hece-reveal-img';
      reveal.appendChild(revealImg);
      reveal.appendChild(document.createTextNode(word));
      answerArea.appendChild(reveal);

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
