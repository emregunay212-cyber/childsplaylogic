/* global Dialog */   /* js/dialog.js (B3) — eslint.config.js hubCoreGlobals listesine eklenene kadar (config-protection hook) */
/* ============================================
   OYUN BAHÇESİ - Oyun Motoru
   ============================================ */

const GameEngine = (() => {
    let currentGame = null;
    let currentLevel = 1;
    let state = 'IDLE'; // IDLE, PLAYING, COMPLETED
    let score = { correct: 0, wrong: 0, total: 0 };
    // Oyun örneği sayacı: her startGame/destroy bir nesil ilerletir. Modüllerin geciken
    // setTimeout/rAF'ları eski neslin callback'lerini çağırırsa yok sayılır — BAŞKA bir oyunun
    // puanına/yıldızına karışamaz. (Modül `callbacks`'i init'te yeniden atadığından aynı oyunun
    // <1 s içinde yeniden başlatılmasında zamanlayıcı temizliği modülün kendi işidir.)
    let generation = 0;

    function startGame(game, level = 1) {
        if (currentGame && currentGame.destroy) {
            currentGame.destroy();
        }

        currentGame = game;
        currentLevel = level;
        state = 'PLAYING';
        score = { correct: 0, wrong: 0, total: 0 };

        // Her oyun örneğine TAZE bir #game-area: eski düğüm kopartılır, önceki oyunun
        // geciken zamanlayıcıları ellerindeki kopuk düğüme yazar, yeni ekranı silemez.
        // id/class korunur (CSS .game-area), hub #game-area'yı her seferinde yeniden bulur.
        const oldArea = document.getElementById('game-area');
        const gameArea = oldArea.cloneNode(false);
        oldArea.replaceWith(gameArea);

        // Toolbar güncelle
        document.getElementById('game-title').textContent = TR.games[game.id] || game.id;
        updateToolbarLevel(game, level);
        updateToolbarStars(0);

        // Oyunu başlat — callback'ler bu nesle bağlı
        const gen = ++generation;
        const bound = (fn) => (...args) => { if (gen === generation) return fn(...args); };
        if (game.init) {
            game.init(gameArea, level, { onCorrect: bound(onCorrect), onWrong: bound(onWrong), onComplete: bound(onComplete) });
        }
    }

    function updateToolbarLevel(game, level) {
        const container = document.getElementById('toolbar-level');
        container.innerHTML = '';
        const totalLevels = game.levels ? game.levels.length : 3;
        for (let i = 1; i <= totalLevels; i++) {
            const dot = document.createElement('span');
            dot.className = 'level-dot';
            if (i === level) dot.classList.add('active');
            if (i < level) dot.classList.add('done');
            const stars = Progress.getLevelStars(game.id, i);
            if (stars > 0 && i !== level) dot.classList.add('done');
            container.appendChild(dot);
        }
    }

    function updateToolbarStars(count) {
        const stars = document.querySelectorAll('#toolbar-stars .toolbar-star');
        stars.forEach((star, i) => {
            star.classList.toggle('earned', i < count);
        });
    }

    function onCorrect() {
        score.correct++;
        AudioManager.play('success');
    }

    function onWrong() {
        score.wrong++;
        AudioManager.play('error');
    }

    function calculateStars() {
        // Deneme doğruluğu: doğru / (doğru + yanlış). Yanlışta turu tekrar ettiren oyunlarda
        // (harf-tanima, hece…) her tur sonunda doğru sayısı toplam'a eşitleniyordu →
        // kaç hata olursa olsun 3 yıldız çıkıyordu; 2/1 yıldız ekranları hiç görünmüyordu.
        const attempts = score.correct + score.wrong;
        if (attempts === 0) return 3;
        const accuracy = score.correct / attempts;
        if (accuracy >= 0.95) return 3;
        if (accuracy >= 0.7) return 2;
        return 1;
    }

    function onComplete(customStars) {
        if (state !== 'PLAYING') return;
        state = 'COMPLETED';

        const stars = customStars !== undefined ? customStars : calculateStars();

        // İlerleme kaydet
        Progress.setLevelStars(currentGame.id, currentLevel, stars);

        // Toolbar güncelle
        updateToolbarStars(stars);

        // Kutlama
        setTimeout(() => {
            AudioManager.play('complete');
            Particles.celebrate();
            showLevelComplete(stars);
        }, 400);
    }

    function showLevelComplete(stars) {
        const overlay = document.getElementById('level-complete');
        const titleEl = document.getElementById('complete-title');
        const starsEl = document.getElementById('complete-stars');
        const nextBtn = document.getElementById('btn-next');

        // Başlık
        if (stars === 3) titleEl.textContent = TR.complete.perfect;
        else if (stars === 2) titleEl.textContent = TR.complete.great;
        else titleEl.textContent = TR.complete.good;

        // Yıldızlar — erişilebilir ad tek görselde (WCAG 4.1.2): "3 üzerinden 2 yıldız"; SVG'ler dekoratif
        starsEl.innerHTML = '';
        starsEl.setAttribute('role', 'img');
        starsEl.setAttribute('aria-label', '3 üzerinden ' + stars + ' yıldız');
        for (let i = 0; i < 3; i++) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('aria-hidden', 'true');
            svg.classList.add('star');
            if (i < stars) svg.classList.add('earned');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
            svg.appendChild(path);
            starsEl.appendChild(svg);
        }

        // Sonraki seviye butonu
        const totalLevels = currentGame.levels ? currentGame.levels.length : 3;
        const isLast = currentLevel >= totalLevels;
        nextBtn.classList.toggle('hidden', isLast);

        // <dialog> (js/dialog.js, B3): ilk odak "Sonraki Seviye" (son seviyede "Tekrar Oyna");
        // dismissible:false → Escape/perde kapatmaz (çocuk kazara çıkmasın); çıkış yalnız üç düğmeden.
        Dialog.open(overlay, {
            initialFocus: isLast ? document.getElementById('btn-replay') : nextBtn,
            dismissible: false,
        });

        // Toplam yıldız güncelle
        App.updateStarCounter();
    }

    function hideLevelComplete() {
        Dialog.close(document.getElementById('level-complete'));
    }

    function replay() {
        hideLevelComplete();
        startGame(currentGame, currentLevel);
    }

    function nextLevel() {
        hideLevelComplete();
        const totalLevels = currentGame.levels ? currentGame.levels.length : 3;
        if (currentLevel < totalLevels) {
            startGame(currentGame, currentLevel + 1);
        }
    }

    function getCurrentGame() { return currentGame; }
    function getCurrentLevel() { return currentLevel; }
    function getScore() { return score; }
    function getState() { return state; }

    function setTotal(n) { score.total = n; }

    function destroy() {
        if (currentGame && currentGame.destroy) {
            currentGame.destroy();
        }
        generation++;   // hub'a dönüş: geciken callback'ler ölü
        currentGame = null;
        state = 'IDLE';
    }

    return {
        startGame, onCorrect, onWrong, onComplete,
        replay, nextLevel, hideLevelComplete, destroy,
        getCurrentGame, getCurrentLevel, getScore, getState,
        setTotal, calculateStars,
    };
})();
