/* ============================================
   OYUN: Kod Macerası (Code Adventure) - Tek Oyunculu
   ============================================ */

const KodMacerasi = (() => {
    const id = 'kod-macerasi';
    const levels = [
        { gridSize: 3, maxBlocks: 3, blocks: ['FORWARD', 'TURN_LEFT', 'TURN_RIGHT'], rounds: 3 },
        { gridSize: 4, maxBlocks: 5, blocks: ['FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'REPEAT'], rounds: 3 },
        { gridSize: 5, maxBlocks: 7, blocks: ['FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'REPEAT', 'BACK'], rounds: 3 },
    ];

    let container = null;
    let callbacks = null;
    let currentLevel = null;
    let currentRound = 0;
    let totalRounds = 0;
    let sequence = [];
    let puzzle = null;
    let usedPuzzleIndices = [];
    let isExecuting = false;
    let roundResults = []; // her turun blok sayısı ve optimal

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        currentLevel = levels[level - 1];
        currentRound = 0;
        totalRounds = currentLevel.rounds;
        usedPuzzleIndices = [];
        roundResults = [];
        isExecuting = false;

        GameEngine.setTotal(totalRounds);
        nextRound();
    }

    function nextRound() {
        currentRound++;
        sequence = [];
        isExecuting = false;

        // Bulmaca seç
        const levelIdx = levels.indexOf(currentLevel) + 1;
        puzzle = KodMacerasiCore.getPuzzle(levelIdx, usedPuzzleIndices);
        const pidx = KodMacerasiCore.getPuzzleIndex(levelIdx, puzzle);
        if (pidx >= 0) usedPuzzleIndices.push(pidx);

        renderGame();
    }

    function renderGame() {
        container.innerHTML = '';

        // Yönerge
        const instruction = document.createElement('div');
        instruction.className = 'game-instruction';
        instruction.textContent = TR.instructions[id];
        container.appendChild(instruction);

        // Grid
        const gridEl = KodMacerasiCore.renderGrid(
            container, puzzle,
            { x: puzzle.start.x, y: puzzle.start.y },
            puzzle.start.dir
        );

        // Program alanı
        KodMacerasiCore.renderProgramArea(
            container,
            currentLevel.maxBlocks,
            sequence,
            onRemoveBlock,
            onPlay,
            onReset
        );

        // Blok paleti
        KodMacerasiCore.renderBlockPalette(
            container,
            currentLevel.blocks,
            onBlockSelect
        );

        // Durum
        const status = document.createElement('div');
        status.className = 'kod-status';
        status.innerHTML = `
            <span>${TR.kodMacerasi.round}: ${currentRound}/${totalRounds}</span>
            <span>${TR.kodMacerasi.blocksUsed}: ${sequence.length}/${currentLevel.maxBlocks}</span>
        `;
        container.appendChild(status);

        updatePaletteState();
    }

    function onBlockSelect(type) {
        if (isExecuting) return;
        if (sequence.length >= currentLevel.maxBlocks) return;

        sequence.push(type);
        renderGame();
    }

    function onRemoveBlock(index) {
        if (isExecuting) return;
        sequence.splice(index, 1);
        renderGame();
    }

    function onReset() {
        if (isExecuting) return;
        sequence = [];
        renderGame();
    }

    function onPlay() {
        if (isExecuting || sequence.length === 0) return;
        isExecuting = true;

        // Play butonunu devre dışı bırak
        const playBtn = container.querySelector('.kod-play-btn');
        if (playBtn) playBtn.disabled = true;
        const resetBtn = container.querySelector('.kod-reset-btn');
        if (resetBtn) resetBtn.style.display = 'none';

        // Paleti devre dışı bırak
        container.querySelectorAll('.kod-block-btn').forEach(b => b.classList.add('disabled'));

        // Sekansı çalıştır
        const result = KodMacerasiCore.executeSequence(
            puzzle, sequence,
            { x: puzzle.start.x, y: puzzle.start.y },
            puzzle.start.dir
        );

        const gridEl = container.querySelector('.kod-grid');

        KodMacerasiCore.animateExecution(gridEl, result.path, puzzle,
            (step, p) => {
                // Her adımda ses
                if (p.action === 'move') AudioManager.play('tap');
                else if (p.action === 'turn') AudioManager.play('flip');
            },
            (lastStep) => {
                if (result.success) {
                    // Başarı!
                    AudioManager.play('levelComplete');
                    const gridRect = gridEl.getBoundingClientRect();
                    Particles.sparkle(gridRect.left + gridRect.width / 2, gridRect.top + gridRect.height / 2, 8);

                    roundResults.push({
                        blocks: sequence.length,
                        optimal: puzzle.optimal,
                    });

                    callbacks.onCorrect();

                    if (currentRound >= totalRounds) {
                        // Seviye tamamlandı
                        const stars = calculateStars();
                        setTimeout(() => callbacks.onComplete(stars), 600);
                    } else {
                        // Sonraki tur
                        setTimeout(() => nextRound(), 1000);
                    }
                } else {
                    // Başarısız
                    AudioManager.play('error');
                    callbacks.onWrong();

                    // Hata mesajı göster
                    const msg = document.createElement('div');
                    msg.className = 'game-instruction';
                    msg.style.color = 'var(--error)';
                    msg.style.fontWeight = '700';
                    msg.textContent = result.error === 'crashed'
                        ? TR.kodMacerasi.crashed
                        : result.error === 'outOfBounds'
                        ? TR.kodMacerasi.outOfBounds
                        : TR.kodMacerasi.notReached;

                    const existing = container.querySelector('.game-instruction');
                    if (existing) existing.replaceWith(msg);

                    // 1.5 sn sonra resetle
                    setTimeout(() => {
                        isExecuting = false;
                        renderGame();
                    }, 1500);
                }
            }
        );
    }

    function updatePaletteState() {
        const full = sequence.length >= currentLevel.maxBlocks;
        container.querySelectorAll('.kod-block-btn').forEach(btn => {
            if (full) btn.classList.add('disabled');
            else btn.classList.remove('disabled');
        });
    }

    function calculateStars() {
        if (roundResults.length === 0) return 1;

        let totalExcess = 0;
        roundResults.forEach(r => {
            totalExcess += Math.max(0, r.blocks - r.optimal);
        });

        const avgExcess = totalExcess / roundResults.length;

        if (avgExcess <= 0) return 3;     // Tüm turlar optimal
        if (avgExcess <= 1.5) return 2;   // Ortalama 1-2 fazla blok
        return 1;                          // Çok fazla blok kullanıldı
    }

    function destroy() {
        if (container) container.innerHTML = '';
        sequence = [];
        isExecuting = false;
    }

    return { id, levels, init, destroy };
})();
