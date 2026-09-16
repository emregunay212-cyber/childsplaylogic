/* ============================================
   OYUN: Klavye Kâşifi (okul öncesi klavye oyunu)
   --------------------------------------------
   Tasarım: docs/klavye-kasifi-tasarim-2026-09-15.md
   4–6 yaş: ekrandaki harfi klavyede BULMAK, tek tuşa TEK basış, 3. seviyede sıra + Boşluk.
   Süre/can/hız baskısı yok. Fiziksel klavye birincil giriş; ekran klavyesi (TR Q dizilimi)
   hem dokunmatik giriş hem de "tuş nerede" haritasıdır — ikisi aynı press() yoluna girer.
   ============================================ */

const KlavyeKasifi = (() => {
    const id = 'klavye-kasifi';

    // Türkçe Q dizilimi — satır kaymaları CSS'te (.kk-row--2 / --3)
    const ROWS = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'],
    ];
    const SPACE = ' ';
    const ALL_KEYS = new Set(ROWS.flat());
    // İşletim sistemi İngilizce dizilimdeyse e.key harf vermez (";" gibi); fiziksel tuş KONUMU
    // (e.code) TR Q'daki harfe çevrilir — tuş kapağında ne yazıyorsa o gelir.
    const CODE_MAP = { Semicolon: 'Ş', Quote: 'İ', BracketLeft: 'Ğ', BracketRight: 'Ü', Comma: 'Ö', Period: 'Ç' };

    // Sesli okuma: harf adları (yalnız tr-TR sesi varsa ve düğme açıksa)
    const LETTER_NAMES = {
        A: 'a', B: 'be', C: 'ce', Ç: 'çe', D: 'de', E: 'e', F: 'fe', G: 'ge', Ğ: 'yumuşak ge', H: 'he',
        I: 'ı', İ: 'i', J: 'je', K: 'ke', L: 'le', M: 'me', N: 'ne', O: 'o', Ö: 'ö', P: 'pe',
        R: 're', S: 'se', Ş: 'şe', T: 'te', U: 'u', Ü: 'ü', V: 've', Y: 'ye', Z: 'ze',
    };

    const HINT_DELAY_MS = 5000;     // 2–3. seviye: bu kadar boşta kalınca hedef tuş nefes alır
    const REVEAL_MS = 450;          // resim balonda görünür, sonra deftere uçar
    const FLY_MS = 470;             // uçuş süresi (CSS geçişi 460 ms + pay)
    const NEXT_ROUND_MS = 1150;     // doğru → yeni tur
    const DOWN_MS = 140;            // fiziksel basışta ekran tuşunun çökük kalma süresi

    const levels = [
        { kind: 'letter', rounds: 6, hint: 'always' },    // Işıklı Tuş
        { kind: 'letter', rounds: 8, hint: 'delayed' },   // Harf Avı
        { kind: 'word', rounds: 4, hint: 'delayed' },     // Kelime Yolu
    ];

    let container = null;
    let callbacks = null;
    let config = null;
    let els = {};           // instruction, shelf, stage, card, letter, bubble, caption, word, speech
    let keyEls = {};        // 'A' → <button>, ' ' → boşluk
    let timers = [];
    let hintTimer = null;
    let round = 0;
    let wrongRounds = 0;    // içinde en az bir yanlış olan tur sayısı → yıldız
    let wrongThisRound = false;
    let target = null;      // { letter, word, emoji, label }
    let wordPos = 0;        // 3. seviye: sıradaki harf; === word.length → Boşluk bekleniyor
    let busy = true;        // doğru sonrası geçişte / oyun bitince giriş kapalı
    let usedPicks = new Set(); // bu seviyede çıkan hedefler — havuz bitmeden tekrar yok
    let keydownHandler = null;
    let voicesHandler = null;
    let wordPool = null;
    let speechOn = false;

    function later(fn, ms) {
        const t = setTimeout(() => { timers = timers.filter((x) => x !== t); fn(); }, ms);
        timers.push(t);
        return t;
    }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; clearTimeout(hintTimer); hintTimer = null; }
    function el(tag, cls, text) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }
    function reducedMotion() {
        try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // ── Kurulum ──
    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        config = levels[level - 1] || levels[0];
        clearTimers();
        round = 0; wrongRounds = 0; wrongThisRound = false; target = null; wordPos = 0; usedPicks = new Set();
        busy = false;
        keyEls = {};
        GameEngine.setTotal(config.rounds);

        buildDom();
        // Kutlama düğmesinden (Tekrar Oyna / Sonraki Seviye) kalan bayat odağı bırak: ilk basış oyuna gitsin
        const ae = document.activeElement;
        if (ae && ae !== document.body && !gameArea.contains(ae)) { try { ae.blur(); } catch (e) { /* yok say */ } }
        keydownHandler = onKeyDown;
        document.addEventListener('keydown', keydownHandler);
        startRound();
    }

    function buildDom() {
        container.innerHTML = '';
        const root = el('div', 'kk-game');
        root.classList.add('kk-game--' + config.kind);
        root.style.setProperty('--kk-rounds', String(config.rounds));   // defter yuvaları genişlik bütçesi

        const instruction = el('div', 'game-instruction kk-instruction');
        instruction.setAttribute('aria-live', 'polite');
        root.appendChild(instruction);

        // Kâşif defteri: tur sayısı kadar yuva — kazanılan resimler buraya uçar (ilerleme = resim)
        const shelf = el('div', 'kk-shelf');
        shelf.setAttribute('aria-label', 'Kâşif defteri');
        for (let i = 0; i < config.rounds; i++) shelf.appendChild(el('span', 'kk-slot'));
        root.appendChild(shelf);

        const stage = el('div', 'kk-stage');
        const card = el('div', 'kk-card');
        let letter = null, word = null;
        if (config.kind === 'letter') {
            letter = el('div', 'kk-letter');
            card.appendChild(letter);
        } else {
            word = el('div', 'kk-word');
            word.setAttribute('aria-label', 'Yazılacak kelime');
            card.appendChild(word);
        }
        const bubble = el('div', 'kk-bubble', '?');
        bubble.setAttribute('aria-hidden', 'true');
        card.appendChild(bubble);
        stage.appendChild(card);
        const caption = el('div', 'kk-caption');
        stage.appendChild(caption);
        root.appendChild(stage);

        root.appendChild(buildKeyboard());

        const speech = buildSpeechToggle();
        if (speech) root.appendChild(speech);

        container.appendChild(root);
        els = { root, instruction, shelf, stage, card, letter, word, bubble, caption, speech };
    }

    function buildKeyboard() {
        const kb = el('div', 'kk-keyboard');
        kb.setAttribute('role', 'group');
        kb.setAttribute('aria-label', 'Ekran klavyesi');
        ROWS.forEach((row, i) => {
            const r = el('div', 'kk-row kk-row--' + (i + 1));
            row.forEach((ch) => r.appendChild(makeKey(ch, ch, ch + ' tuşu')));
            kb.appendChild(r);
        });
        const r4 = el('div', 'kk-row kk-row--4');
        r4.appendChild(makeKey(SPACE, 'Boşluk', 'Boşluk tuşu'));
        kb.appendChild(r4);
        return kb;
    }

    function makeKey(key, label, aria) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'kk-key' + (key === SPACE ? ' kk-key--space' : '');
        b.dataset.key = key;
        b.tabIndex = -1;                       // fiziksel klavye zaten erişilebilir giriş; Tab ile 30 tuş gezilmez
        b.setAttribute('aria-label', aria);
        b.appendChild(el('span', 'kk-key__cap', label));
        b.addEventListener('mousedown', (e) => e.preventDefault());   // odak alma → fiziksel Boşluk düğmeyi ikinci kez tetiklemesin
        b.addEventListener('click', () => { press(key); b.blur(); });
        keyEls[key] = b;
        return b;
    }

    // ── Fiziksel klavye ──
    function onKeyDown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // Odak oyun kökünün DIŞINDA bir etkileşimli öğedeyse (araç çubuğu "Ana sayfa"/"Tam ekran",
        // ileride bir form alanı) tuşu tarayıcıya bırak: Enter/Boşluk düğmeyi etkinleştirsin,
        // harf yazı alanına gitsin. Gövde odaktayken (normal oyun) davranış değişmez.
        const t = e.target;
        // Gizlenmiş bir düğme (az önce tıklanan "Sonraki Seviye") odakta kalabilir: çizilmiyorsa (getClientRects 0)
        // oyun tuşu işler; aksi hâlde çocuğun ilk basışları yutulurdu.
        if (t && t !== document.body && els.root && !els.root.contains(t)
            && typeof t.closest === 'function' && t.closest('button, a, input, textarea, select, [contenteditable]')
            && t.getClientRects().length > 0) return;
        const isSpace = e.key === ' ' || e.key === 'Enter' || e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter';
        if (isSpace) e.preventDefault();       // oyun alanı meşgul penceresinde de kaymasın
        if (busy || e.repeat) return;
        if (isSpace) {                         // Enter = Boşluk (3. seviye "gönder")
            flashKey(SPACE);
            press(SPACE);
            return;
        }
        if (typeof e.key !== 'string' || e.key.length !== 1) return;
        let ch = e.key.toLocaleUpperCase('tr-TR');
        // İngilizce dizilimde KeyI "i" verir → tr-TR büyük harfi İ; hedef I (noktasız) ise o tuş I'dır.
        // TR dizilimde aynı tuş "ı" verir (→ I), İ ayrı tuştur; bu dal orada devreye girmez.
        if (ch === 'İ' && e.code === 'KeyI' && e.key === 'i' && expectedKey() === 'I') ch = 'I';
        if (!ALL_KEYS.has(ch)) ch = CODE_MAP[e.code] || null;
        if (!ch) return;
        e.preventDefault();
        flashKey(ch);
        press(ch);
    }

    // Fiziksel basışta ekrandaki tuş da çöker — harf ↔ tuş konumu eşlemesi pekişir
    function flashKey(key) {
        const b = keyEls[key];
        if (!b) return;
        b.classList.add('is-down');
        later(() => b.classList.remove('is-down'), DOWN_MS);
    }

    // ── Tur ──
    function startRound() {
        round++;
        wrongThisRound = false;
        wordPos = 0;
        busy = false;
        clearHint();
        AudioManager.play('pop');

        target = config.kind === 'letter' ? pickLetterTarget() : pickWordTarget();
        els.bubble.textContent = '?';
        els.bubble.classList.remove('is-revealed', 'is-flown');
        els.caption.textContent = '';
        els.caption.classList.remove('is-visible');

        if (config.kind === 'letter') {
            els.letter.textContent = target.letter;
            els.letter.classList.remove('kk-pop'); void els.letter.offsetWidth; els.letter.classList.add('kk-pop');
            setInstruction(config.hint === 'always'
                ? 'Yanan tuşa bas: «' + target.letter + '»'
                : '«' + target.letter + '» tuşunu bul ve bas!');
            speak(LETTER_NAMES[target.letter] || target.letter);
        } else {
            renderWord();
            setInstruction('Harfleri sırayla yaz, sonra Boşluk!');
            speak(target.label);
        }
        armHint();
    }

    function pickLetterTarget() {
        const letters = Object.keys(TR.letterImages).filter((L) => ALL_KEYS.has(L) && TR.letterImages[L].length);
        const fresh = letters.filter((L) => !usedPicks.has(L));
        const letter = pick(fresh.length ? fresh : letters);
        usedPicks.add(letter);
        const img = pick(TR.letterImages[letter]);
        return { letter, emoji: img.emoji, label: img.word };
    }

    // 2–5 harfli kelimeler TR.letterImages'tan (tek kaynak); aynı emoji iki kelimede kullanılmaz (Elma/Nar 🍎)
    function getWordPool() {
        if (wordPool) return wordPool;
        const seen = new Set();
        const list = [];
        Object.keys(TR.letterImages).forEach((L) => {
            TR.letterImages[L].forEach((o) => {
                const w = o.word.toLocaleUpperCase('tr-TR');
                if (w.length < 2 || w.length > 5 || seen.has(o.emoji)) return;
                if (![...w].every((ch) => ALL_KEYS.has(ch))) return;
                seen.add(o.emoji);
                list.push({ word: w, emoji: o.emoji, label: o.word });
            });
        });
        wordPool = list;
        return list;
    }

    function pickWordTarget() {
        const all = getWordPool();
        const fresh = all.filter((w) => !usedPicks.has(w.word));
        const t = pick(fresh.length ? fresh : all);
        usedPicks.add(t.word);
        return { word: t.word, letters: [...t.word], emoji: t.emoji, label: t.label };
    }

    function renderWord() {
        els.word.innerHTML = '';
        els.root.style.setProperty('--kk-word-len', String(target.letters.length));   // kutu genişliği bütçesi
        target.letters.forEach((ch, i) => {
            const tile = el('span', 'kk-tile', ch);
            if (i === 0) tile.classList.add('is-current');
            els.word.appendChild(tile);
        });
    }

    function setInstruction(text) { els.instruction.textContent = text; }

    // ── İpucu: hedef tuş yanar (1. seviye hep; 2–3. seviye boşta kalınca ya da yanlışta) ──
    function expectedKey() {
        if (config.kind === 'letter') return target.letter;
        return wordPos < target.letters.length ? target.letters[wordPos] : SPACE;
    }
    function armHint() {
        clearHint();
        const key = expectedKey();
        if (config.hint === 'always' || key === SPACE) {
            keyEls[key].classList.add('is-target');       // Boşluk yeni kavram: hep yanar
            return;
        }
        hintTimer = setTimeout(() => { hintTimer = null; showHint(); }, HINT_DELAY_MS);
    }
    function showHint() {
        clearTimeout(hintTimer); hintTimer = null;
        const key = expectedKey();
        const b = keyEls[key];
        if (b && !b.classList.contains('is-target')) b.classList.add('is-hint');
    }
    function clearHint() {
        clearTimeout(hintTimer); hintTimer = null;
        Object.keys(keyEls).forEach((k) => keyEls[k].classList.remove('is-target', 'is-hint'));
    }

    // ── Giriş ──
    function press(key) {
        if (busy || !target) return;
        AudioManager.play('tap');
        if (config.kind === 'letter') {
            if (key === target.letter) correct(key);
            else wrong(key);
            return;
        }
        // Kelime Yolu
        if (wordPos < target.letters.length) {
            if (key === target.letters[wordPos]) advanceWord(key);
            else wrong(key);
        } else if (key === SPACE) {
            correct(SPACE);
        } else {
            wrong(key);
        }
    }

    function advanceWord(key) {
        const tiles = els.word.querySelectorAll('.kk-tile');
        const tile = tiles[wordPos];
        tile.classList.remove('is-current');
        tile.classList.add('is-done');
        const b = keyEls[key];
        b.classList.remove('is-target', 'is-hint');
        b.classList.add('is-correct');
        later(() => b.classList.remove('is-correct'), 420);
        wordPos++;
        if (wordPos < target.letters.length) {
            tiles[wordPos].classList.add('is-current');
            armHint();
        } else {
            setInstruction('Şimdi Boşluk tuşuna bas!');
            AudioManager.play('flip');
            armHint();                           // Boşluk yanar
        }
    }

    function correct(key) {
        busy = true;
        clearHint();
        callbacks.onCorrect();
        const b = keyEls[key];
        b.classList.add('is-correct');
        later(() => b.classList.remove('is-correct'), 500);

        // Balon resme döner
        els.bubble.textContent = target.emoji;
        els.bubble.classList.add('is-revealed');
        els.caption.textContent = target.label;
        els.caption.classList.add('is-visible');
        const r = els.bubble.getBoundingClientRect();
        Particles.sparkle(r.left + r.width / 2, r.top + r.height / 2, 10);
        speak(target.label);

        // Resim deftere uçar (sabit konumlu klon, transform geçişi); hareket azaltılmışsa doğrudan yerleşir
        const slot = els.shelf.children[round - 1];
        const emoji = target.emoji;
        later(() => flyToSlot(slot, emoji), REVEAL_MS);

        if (round >= config.rounds) {
            later(() => finish(), NEXT_ROUND_MS + 350);
        } else {
            later(() => startRound(), NEXT_ROUND_MS);
        }
    }

    function flyToSlot(slot, emoji) {
        if (!slot || !els.bubble) return;
        const fill = () => { slot.textContent = emoji; slot.classList.add('is-filled'); };
        if (reducedMotion()) { fill(); return; }
        const from = els.bubble.getBoundingClientRect();
        const to = slot.getBoundingClientRect();
        const flyer = el('div', 'kk-flyer', emoji);
        flyer.setAttribute('aria-hidden', 'true');
        flyer.style.left = from.left + 'px';
        flyer.style.top = from.top + 'px';
        flyer.style.width = from.width + 'px';
        flyer.style.height = from.height + 'px';
        flyer.style.fontSize = getComputedStyle(els.bubble).fontSize;
        document.body.appendChild(flyer);
        els.bubble.classList.add('is-flown');     // resim balondan çıkıyor: balon solar
        void flyer.offsetWidth;                   // başlangıç konumu uygulanmış olsun
        const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
        const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
        const scale = to.width / from.width;
        flyer.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')';
        later(() => { flyer.remove(); fill(); }, FLY_MS);
    }

    function wrong(key) {
        const b = keyEls[key];
        if (b) {
            b.classList.remove('is-wrong'); void b.offsetWidth; b.classList.add('is-wrong');
            later(() => b.classList.remove('is-wrong'), 450);
        }
        if (!wrongThisRound) {
            wrongThisRound = true;
            wrongRounds++;
            callbacks.onWrong();                 // yalnız turun İLK yanlışı sayılır (el yordamı cezalanmaz)
        } else {
            AudioManager.play('error');
        }
        els.card.classList.remove('kk-nudge'); void els.card.offsetWidth; els.card.classList.add('kk-nudge');
        showHint();                              // yanlıştan sonra çocuk asla takılı kalmaz
    }

    // Yıldız: hatalı tur sayısına göre (motorun doğruluk formülüne bağlı değil)
    function computeStars() {
        if (wrongRounds <= 1) return 3;
        if (wrongRounds <= Math.ceil(config.rounds / 2)) return 2;
        return 1;
    }

    function finish() {
        busy = true;
        clearHint();
        callbacks.onComplete(computeStars());
    }

    // ── Sesli okuma (isteğe bağlı; yalnız tr-TR sesi varsa) ──
    function trVoice() {
        try {
            if (!('speechSynthesis' in window)) return null;
            const tr = window.speechSynthesis.getVoices().filter((v) => /^tr/i.test(v.lang));
            // Cihaz-içi ses varsa onu seç; uzak (bulut) sesler okunacak metni tarayıcı üzerinden sunucuya yollar
            return tr.find((v) => v.localService) || tr[0] || null;
        } catch (e) { return null; }
    }
    function speak(text) {
        if (!speechOn || !text) return;
        if (typeof AudioManager.isEnabled === 'function' && !AudioManager.isEnabled()) return;
        const voice = trVoice();
        if (!voice) return;
        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(String(text).toLocaleLowerCase('tr-TR'));
            u.lang = 'tr-TR';
            u.voice = voice;
            u.rate = 0.85;
            window.speechSynthesis.speak(u);
        } catch (e) { /* sesli okuma isteğe bağlı: sessizce vazgeç */ }
    }
    function buildSpeechToggle() {
        if (!('speechSynthesis' in window)) return null;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'kk-speech';
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', 'Harfleri sesli oku');
        b.title = 'Harfleri sesli oku';
        b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path class="kk-speech__wave" d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke-width="2" stroke-linecap="round"/></svg>';
        b.hidden = true;
        const sync = () => {
            const available = !!trVoice();
            b.hidden = !available;
            if (!available) speechOn = false;
        };
        try {
            const s = Progress.getSettings();
            speechOn = !!(s && s.kkSpeech);
        } catch (e) { speechOn = false; }
        b.addEventListener('click', () => {
            speechOn = !speechOn;
            b.setAttribute('aria-pressed', String(speechOn));
            b.classList.toggle('is-on', speechOn);
            try { Progress.saveSetting('kkSpeech', speechOn); } catch (e) { /* ayar kaydı isteğe bağlı */ }
            if (speechOn) speak(config.kind === 'letter' && target ? LETTER_NAMES[target.letter] : (target && target.label));
            else { try { window.speechSynthesis.cancel(); } catch (e) { /* yok say */ } }
            b.blur();
        });
        b.classList.toggle('is-on', speechOn);
        b.setAttribute('aria-pressed', String(speechOn));
        sync();
        // Chrome sesleri geç yükler
        if (b.hidden) {
            voicesHandler = () => sync();
            try { window.speechSynthesis.addEventListener('voiceschanged', voicesHandler); } catch (e) { voicesHandler = null; }
        }
        return b;
    }

    function destroy() {
        clearTimers();
        busy = true;
        if (keydownHandler) { document.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
        if (voicesHandler) { try { window.speechSynthesis.removeEventListener('voiceschanged', voicesHandler); } catch (e) { /* yok say */ } voicesHandler = null; }
        try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* yok say */ }
        document.querySelectorAll('.kk-flyer').forEach((n) => n.remove());
        if (container) container.innerHTML = '';
        els = {}; keyEls = {}; target = null;
    }

    return { id, levels, init, destroy };
})();
