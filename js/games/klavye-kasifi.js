/* ============================================
   OYUN: Klavye Kâşifi (klavye oyunu, 4–10 yaş)
   --------------------------------------------
   Tasarım: docs/klavye-kasifi-tasarim-2026-09-15.md (+ 13 Eki 2026 kesintisiz akış)
   Kesintisiz akış: Harfler → Heceler → Kelimeler → Cümleler → Rakamlar → Noktalama. Kısım = motor
   seviyesi (yıldız kaydı, araç çubuğu noktası); kısım içindeki bölümler kısa bir şeritle KENDİLİĞİNDEN
   geçer — çıkılmadıkça "Sonraki Seviye" düğmesi yok. Kısım bitince callbacks.onLevelUp(yıldız) (katman
   açılmaz), yalnız son kısım onComplete ile kutlama katmanını açar. İçerik: klavye-kasifi-icerik.js.
   Süre/can/hız baskısı yok. Fiziksel klavye birincil giriş; ekran klavyesi (TR Q dizilimi) hem dokunmatik
   giriş hem de "tuş nerede" haritasıdır — ikisi aynı press() yoluna girer.
   ============================================ */

const KlavyeKasifi = (() => {
    const id = 'klavye-kasifi';

    // Türkçe Q dizilimi — satır kaymaları CSS'te (.kk-row--N). Çift kapaklı tuş [taban, Shift]:
    // Shift karakteri kapağın üstünde küçük yazılır (gerçek tuş kapağı gibi).
    const ROWS = [
        [['1', '!'], ['2', "'"], ['3', '^'], ['4', '+'], ['5', '%'], ['6', '&'], ['7', '/'], ['8', '('], ['9', ')'], ['0', '='], ['*', '?']],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ', [',', ';']],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', ['.', ':']],
    ];
    const SPACE = ' ';
    const SHIFT_OF = {};            // Shift karakteri → taban ('!' → '1')
    const TYPEABLE = new Set([SPACE]);
    ROWS.flat().forEach((k) => {
        if (Array.isArray(k)) { TYPEABLE.add(k[0]); TYPEABLE.add(k[1]); SHIFT_OF[k[1]] = k[0]; } else TYPEABLE.add(k);
    });
    const needsShift = (ch) => Object.prototype.hasOwnProperty.call(SHIFT_OF, ch);
    // Fiziksel tuş KONUMU (e.code) → TR Q kapağındaki karakter [taban, Shift]. İşletim sistemi dizilimi
    // İngilizceyse e.key kapakla uyuşmaz (";" gibi): kapaktaki karakter de aday olur, beklenenle uyuşan seçilir.
    const CODE_MAP = {
        Semicolon: ['Ş', 'Ş'], Quote: ['İ', 'İ'], BracketLeft: ['Ğ', 'Ğ'], BracketRight: ['Ü', 'Ü'],
        Comma: ['Ö', 'Ö'], Period: ['Ç', 'Ç'], KeyI: ['I', 'I'],
        Slash: ['.', ':'], Backslash: [',', ';'], Minus: ['*', '?'],
    };
    ROWS[0].slice(0, 10).forEach((k) => { CODE_MAP['Digit' + k[0]] = k; });

    // Sesli okuma: harf ve işaret adları (yalnız tr-TR sesi varsa ve düğme açıksa)
    const LETTER_NAMES = {
        A: 'a', B: 'be', C: 'ce', Ç: 'çe', D: 'de', E: 'e', F: 'fe', G: 'ge', Ğ: 'yumuşak ge', H: 'he',
        I: 'ı', İ: 'i', J: 'je', K: 'ke', L: 'le', M: 'me', N: 'ne', O: 'o', Ö: 'ö', P: 'pe', Q: 'ku',
        R: 're', S: 'se', Ş: 'şe', T: 'te', U: 'u', Ü: 'ü', V: 've', W: 'dabılyu', X: 'iks', Y: 'ye', Z: 'ze',
    };
    const KEY_NAMES = { '.': 'nokta', ',': 'virgül', '?': 'soru işareti', '!': 'ünlem' };
    const REWARDS = ['⭐', '🌟', '🏅', '🎈', '🍀', '💎', '🚀', '🎉'];   // resmi olmayan tur (hece, sayı, Q/W/X)

    const HINT_DELAY_MS = 5000;     // gecikmeli ipucu: bu kadar boşta kalınca hedef tuş nefes alır
    const REVEAL_MS = 450;          // resim balonda görünür, sonra deftere uçar
    const FLY_MS = 470;             // uçuş süresi (CSS geçişi 460 ms + pay)
    const NEXT_ROUND_MS = 1150;     // doğru → yeni tur
    const DOWN_MS = 140;            // fiziksel basışta ekran tuşunun çökük kalma süresi
    const STAGE_BANNER_MS = 1800;   // bölüm arası şerit (düğme yok)
    const SECTION_BANNER_MS = 2800; // kısım arası şerit: kazanılan yıldızlar + sıradaki kısım

    const levels = window.KLAVYE_KASIFI_ICERIK;   // kısım listesi = motor seviyeleri
    const TOTAL_STAGES = levels.reduce((n, s) => n + s.stages.length, 0);

    let container = null;
    let callbacks = null;
    let els = {};           // root, progress, instruction, shelf, card, main, bubble, caption, banner, speech
    let keyEls = {};        // karakter → <button> (çift kapaklıda iki karakter aynı düğme), ' ' → boşluk
    let shiftEls = [];
    let timers = [];
    let hintTimer = null;
    let sectionIdx = 0;     // levels[sectionIdx]
    let stageIdx = 0;       // levels[sectionIdx].stages[stageIdx]
    let stage = null;
    let queue = [];         // bölümün öğeleri bu girişteki sırasıyla
    let round = 0;          // bölüm içi tur (1…)
    let sectionRounds = 0;
    let sectionWrong = 0;   // kısımda içinde en az bir yanlış olan tur sayısı → yıldız
    let wrongThisRound = false;
    let target = null;      // { text, chars (büyük harf, karşılaştırma), emoji, label, say }
    let pos = 0;            // word/sentence: sıradaki karakter; word'de === chars.length → Boşluk bekleniyor
    let busy = true;        // doğru sonrası geçişte / şeritte / oyun bitince giriş kapalı
    let shiftOn = false;    // ekran klavyesinde Shift'e dokunuldu (dokunmatik giriş)
    let keydownHandler = null;
    let voicesHandler = null;
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
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    }
    function capitalize(s) { return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1).toLocaleLowerCase('tr-TR'); }

    // ── Kurulum ──
    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        clearTimers();
        sectionIdx = Math.min(Math.max(level, 1), levels.length) - 1;
        stageIdx = 0; target = null; busy = true; shiftOn = false;
        keyEls = {}; shiftEls = [];

        buildDom();
        // Kutlama düğmesinden (Tekrar Oyna) kalan bayat odağı bırak: ilk basış oyuna gitsin
        const ae = document.activeElement;
        if (ae && ae !== document.body && !gameArea.contains(ae)) { try { ae.blur(); } catch (e) { /* yok say */ } }
        keydownHandler = onKeyDown;
        document.addEventListener('keydown', keydownHandler);
        startSection();
    }

    function buildDom() {
        container.innerHTML = '';
        const root = el('div', 'kk-game');

        // Bölüm sayacı (sol üst; ses düğmesinin aynası)
        const progress = el('div', 'kk-progress');
        progress.appendChild(el('span', 'kk-progress__label', 'Bölüm'));
        progress.appendChild(el('span', 'kk-progress__num'));
        root.appendChild(progress);

        const instruction = el('div', 'game-instruction kk-instruction');
        instruction.setAttribute('aria-live', 'polite');
        root.appendChild(instruction);

        // Kâşif defteri: bölümün tur sayısı kadar yuva — kazanılan resimler buraya uçar (ilerleme = resim)
        const shelf = el('div', 'kk-shelf');
        shelf.setAttribute('aria-label', 'Kâşif defteri');
        root.appendChild(shelf);

        const stageEl = el('div', 'kk-stage');
        const card = el('div', 'kk-card');
        const bubble = el('div', 'kk-bubble', '?');
        bubble.setAttribute('aria-hidden', 'true');
        card.appendChild(bubble);
        stageEl.appendChild(card);
        const caption = el('div', 'kk-caption');
        stageEl.appendChild(caption);
        root.appendChild(stageEl);

        root.appendChild(buildKeyboard());

        const banner = el('div', 'kk-banner');
        banner.setAttribute('aria-hidden', 'true');   // aynı metin yönergede (aria-live) duyurulur
        root.appendChild(banner);

        const speech = buildSpeechToggle();
        if (speech) root.appendChild(speech);

        container.appendChild(root);
        els = { root, progress, instruction, shelf, card, main: null, bubble, caption, banner, speech };
    }

    function buildKeyboard() {
        const kb = el('div', 'kk-keyboard');
        kb.setAttribute('role', 'group');
        kb.setAttribute('aria-label', 'Ekran klavyesi');
        ROWS.forEach((row, i) => {
            const r = el('div', 'kk-row kk-row--' + (i + 1));
            if (i === 3) r.appendChild(makeShiftKey('left'));
            row.forEach((k) => r.appendChild(makeKey(k)));
            if (i === 3) r.appendChild(makeShiftKey('right'));
            kb.appendChild(r);
        });
        const r5 = el('div', 'kk-row kk-row--5');
        r5.appendChild(makeKey(SPACE));
        kb.appendChild(r5);
        return kb;
    }

    function keyButton(cls, aria) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'kk-key' + (cls ? ' ' + cls : '');
        b.tabIndex = -1;                       // fiziksel klavye zaten erişilebilir giriş; Tab ile 50 tuş gezilmez
        b.setAttribute('aria-label', aria);
        b.addEventListener('mousedown', (e) => e.preventDefault());   // odak alma → fiziksel Boşluk düğmeyi ikinci kez tetiklemesin
        return b;
    }

    function makeKey(k) {
        const dual = Array.isArray(k);
        const base = dual ? k[0] : k;
        const shifted = dual ? k[1] : null;
        if (base === SPACE) {
            const b = keyButton('kk-key--space', 'Boşluk tuşu');
            b.appendChild(el('span', 'kk-key__cap', 'Boşluk'));
            b.addEventListener('click', () => { setShift(false); press(SPACE); b.blur(); });
            keyEls[SPACE] = b;
            return b;
        }
        const b = keyButton(dual ? 'kk-key--dual' : '', dual ? base + ' ve ' + shifted + ' tuşu' : base + ' tuşu');
        b.dataset.key = base;
        if (dual) b.appendChild(el('span', 'kk-key__shift', shifted));
        b.appendChild(el('span', 'kk-key__cap', base));
        b.addEventListener('click', () => {
            const ch = shiftOn && shifted ? shifted : base;
            setShift(false);
            press(ch);
            b.blur();
        });
        keyEls[base] = b;
        if (dual) keyEls[shifted] = b;
        return b;
    }

    // Dokunmatik Shift: bir kez dokun → sıradaki tuş Shift karakterini verir (fiziksel klavyede basılı tutulur)
    function makeShiftKey(side) {
        const b = keyButton('kk-key--shift kk-key--shift-' + side, 'Shift tuşu');
        b.appendChild(el('span', 'kk-key__cap', '⇧'));
        b.appendChild(el('span', 'kk-key__word', 'Shift'));
        b.addEventListener('click', () => { setShift(!shiftOn); b.blur(); });
        shiftEls.push(b);
        return b;
    }
    function setShift(on) {
        shiftOn = on;
        shiftEls.forEach((b) => { b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    }

    // ── Fiziksel klavye ──
    function onKeyDown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // Odak oyun kökünün DIŞINDA bir etkileşimli öğedeyse (araç çubuğu "Ana sayfa"/"Tam ekran",
        // ileride bir form alanı) tuşu tarayıcıya bırak: Enter/Boşluk düğmeyi etkinleştirsin,
        // harf yazı alanına gitsin. Gövde odaktayken (normal oyun) davranış değişmez.
        const t = e.target;
        // Gizlenmiş bir düğme (az önce tıklanan "Tekrar Oyna") odakta kalabilir: çizilmiyorsa (getClientRects 0)
        // oyun tuşu işler; aksi hâlde çocuğun ilk basışları yutulurdu.
        if (t && t !== document.body && els.root && !els.root.contains(t)
            && typeof t.closest === 'function' && t.closest('button, a, input, textarea, select, [contenteditable]')
            && t.getClientRects().length > 0) return;
        const isSpace = e.key === ' ' || e.key === 'Enter' || e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter';
        if (isSpace) e.preventDefault();       // oyun alanı meşgul penceresinde de kaymasın
        if (e.repeat) return;
        if (e.key === 'Shift') {               // ekrandaki Shift de çöker: "Shift nerede" eşlemesi
            const b = shiftEls[e.code === 'ShiftRight' ? 1 : 0];
            if (b) { b.classList.add('is-down'); later(() => b.classList.remove('is-down'), DOWN_MS); }
            return;
        }
        if (busy) return;
        if (isSpace) {                         // Enter = Boşluk ("gönder")
            flashKey(SPACE);
            press(SPACE);
            return;
        }
        const ch = resolveKey(e);
        if (!ch) return;
        e.preventDefault();
        flashKey(ch);
        press(ch);
    }

    // Adaylar: e.key (işletim sistemi dizilimi) ve e.code'un TR Q kapağı. Beklenen karakterle uyuşan seçilir —
    // İngilizce dizilimde "i" veren KeyI hedef I iken I, Period hedef Ç iken Ç; uyuşmazsa ilk aday (yanlış geri bildirimi).
    function resolveKey(e) {
        const cands = [];
        if (typeof e.key === 'string' && e.key.length === 1) {
            const k = e.key.toLocaleUpperCase('tr-TR');
            if (TYPEABLE.has(k)) cands.push(k);
        }
        const m = CODE_MAP[e.code];
        if (m) cands.push(m[e.shiftKey ? 1 : 0]);
        const exp = expectedKey();
        if (exp && cands.includes(exp)) return exp;
        return cands[0] || null;
    }

    // Fiziksel basışta ekrandaki tuş da çöker — karakter ↔ tuş konumu eşlemesi pekişir
    function flashKey(key) {
        const b = keyEls[key];
        if (!b) return;
        b.classList.add('is-down');
        later(() => b.classList.remove('is-down'), DOWN_MS);
    }

    // ── Kısım / bölüm ──
    function stageNumber() {
        let n = stageIdx + 1;
        for (let i = 0; i < sectionIdx; i++) n += levels[i].stages.length;
        return n;
    }

    function startSection() {
        sectionRounds = levels[sectionIdx].stages.reduce((n, s) => n + s.items.length, 0);
        sectionWrong = 0;
        GameEngine.setTotal(sectionRounds);
        startStage();
    }

    function startStage() {
        stage = levels[sectionIdx].stages[stageIdx];
        queue = stage.order === 'fixed' ? stage.items.slice() : shuffle(stage.items);
        round = 0;
        const root = els.root;
        root.classList.remove('kk-game--key', 'kk-game--word', 'kk-game--sentence');
        root.classList.add('kk-game--' + stage.kind);
        root.style.setProperty('--kk-rounds', String(queue.length));   // defter yuvaları genişlik bütçesi
        root.dataset.kisim = levels[sectionIdx].id;
        root.dataset.bolum = stageNumber() + '/' + TOTAL_STAGES;
        els.progress.lastChild.textContent = stageNumber() + '/' + TOTAL_STAGES;
        els.progress.title = levels[sectionIdx].name + ' · ' + stage.name;

        els.shelf.innerHTML = '';
        for (let i = 0; i < queue.length; i++) els.shelf.appendChild(el('span', 'kk-slot'));

        if (els.main) els.main.remove();
        const cls = { key: 'kk-letter', word: 'kk-word', sentence: 'kk-line' }[stage.kind];
        els.main = el('div', cls);
        if (stage.kind === 'word') els.main.setAttribute('aria-label', 'Yazılacak kelime');
        els.card.insertBefore(els.main, els.bubble);
        startRound();
    }

    function makeTarget(item) {
        const text = Array.isArray(item) ? item[0] : item;
        const chars = [...text].map((c) => c.toLocaleUpperCase('tr-TR'));
        if (stage.kind === 'key') {
            const pics = (TR.letterImages && TR.letterImages[text]) || [];
            const img = pics.length ? pick(pics) : null;
            const name = KEY_NAMES[text];
            return {
                text, chars,
                emoji: img ? img.emoji : pick(REWARDS),
                label: img ? img.word : (name ? capitalize(name) : ''),
                say: LETTER_NAMES[text] || name || text,
            };
        }
        const emoji = Array.isArray(item) ? item[1] : null;
        return {
            text, chars,
            emoji: emoji || pick(REWARDS),
            label: stage.kind === 'word' && emoji ? capitalize(text) : '',
            say: text,
        };
    }

    // ── Tur ──
    function startRound() {
        round++;
        wrongThisRound = false;
        pos = 0;
        busy = false;
        clearHint();
        setShift(false);
        AudioManager.play('pop');

        target = makeTarget(queue[round - 1]);
        els.bubble.textContent = target.text.includes('?') ? '🎁' : '?';   // gizli resim; hedef "?" iken karışmasın
        els.bubble.classList.remove('is-revealed', 'is-flown');
        els.caption.textContent = '';
        els.caption.classList.remove('is-visible');

        if (stage.kind === 'key') {
            const ch = target.text;
            els.main.textContent = ch;
            els.main.classList.remove('kk-pop'); void els.main.offsetWidth; els.main.classList.add('kk-pop');
            const shown = '«' + ch + '»' + (KEY_NAMES[ch] ? ' (' + KEY_NAMES[ch] + ')' : '');
            setInstruction(stage.tip || (stage.hint === 'always' ? 'Yanan tuşa bas: ' + shown : shown + ' tuşunu bul ve bas!'));
        } else if (stage.kind === 'word') {
            renderTiles();
            setInstruction(stage.tip || 'Harfleri sırayla yaz, sonra Boşluk!');
        } else {
            renderLine();
            setInstruction(stage.tip || 'Cümleyi yaz! Kelimelerin arasında Boşluk tuşuna bas.');
        }
        speak(target.say);
        armHint();
    }

    function renderTiles() {
        els.main.innerHTML = '';
        els.root.style.setProperty('--kk-word-len', String(target.chars.length));   // kutu genişliği bütçesi
        [...target.text].forEach((ch, i) => {
            const tile = el('span', 'kk-tile', ch);
            if (i === 0) tile.classList.add('is-current');
            els.main.appendChild(tile);
        });
    }

    // Cümle: kelime grupları satır sonunda bölünmez; boşluk önceki kelimenin sonunda durur (satır boşlukla başlamaz)
    function renderLine() {
        const line = els.main;
        line.innerHTML = '';
        const n = target.chars.length;
        line.classList.remove('kk-line--l', 'kk-line--m', 'kk-line--s');
        line.classList.add(n <= 20 ? 'kk-line--l' : (n <= 45 ? 'kk-line--m' : 'kk-line--s'));
        line.setAttribute('aria-label', 'Yazılacak cümle: ' + target.text);
        const words = target.text.split(SPACE);
        words.forEach((w, wi) => {
            const group = el('span', 'kk-w');
            group.setAttribute('aria-hidden', 'true');
            [...w].forEach((c) => group.appendChild(el('span', 'kk-ch', c)));
            if (wi < words.length - 1) group.appendChild(el('span', 'kk-ch kk-ch--space'));
            line.appendChild(group);
        });
        line.querySelector('.kk-ch').classList.add('is-current');
    }

    function setInstruction(text) { els.instruction.textContent = text; }

    // ── İpucu: hedef tuş yanar ('always' hep; 'delayed' boşta kalınca ya da yanlışta). Shift karakterinde
    //    Shift tuşları da yanar. Kelimenin sonundaki Boşluk ("gönder") yeni kavram: hep yanar. ──
    function expectedKey() {
        if (!target) return null;
        if (stage.kind === 'key') return target.chars[0];
        return pos < target.chars.length ? target.chars[pos] : SPACE;
    }
    function light(key, cls) {
        const b = keyEls[key];
        if (b) b.classList.add(cls);
        if (needsShift(key)) shiftEls.forEach((s) => s.classList.add(cls));
    }
    function armHint() {
        clearHint();
        const key = expectedKey();
        els.root.dataset.beklenen = key;
        if (stage.hint === 'always' || (stage.kind === 'word' && pos >= target.chars.length)) {
            light(key, 'is-target');
            return;
        }
        hintTimer = setTimeout(() => { hintTimer = null; showHint(); }, HINT_DELAY_MS);
    }
    function showHint() {
        clearTimeout(hintTimer); hintTimer = null;
        const key = expectedKey();
        const b = keyEls[key];
        if (b && !b.classList.contains('is-target')) light(key, 'is-hint');
    }
    function clearHint() {
        clearTimeout(hintTimer); hintTimer = null;
        Object.keys(keyEls).forEach((k) => keyEls[k].classList.remove('is-target', 'is-hint'));
        shiftEls.forEach((s) => s.classList.remove('is-target', 'is-hint'));
    }

    // ── Giriş ──
    function press(key) {
        if (busy || !target) return;
        AudioManager.play('tap');
        if (key !== expectedKey()) { wrong(key); return; }
        if (stage.kind === 'key' || (stage.kind === 'word' && pos >= target.chars.length)) { correct(key); return; }
        advance(key);
    }

    function advance(key) {
        const cells = els.main.querySelectorAll(stage.kind === 'word' ? '.kk-tile' : '.kk-ch');
        cells[pos].classList.remove('is-current');
        cells[pos].classList.add('is-done');
        const b = keyEls[key];
        b.classList.remove('is-target', 'is-hint');
        b.classList.add('is-correct');
        later(() => b.classList.remove('is-correct'), 420);
        pos++;
        if (pos < target.chars.length) {
            cells[pos].classList.add('is-current');
            armHint();
        } else if (stage.kind === 'sentence') {
            correct(key);                        // cümle son karakterle biter
        } else {
            setInstruction('Şimdi Boşluk tuşuna bas!');
            AudioManager.play('flip');
            armHint();                           // Boşluk yanar
        }
    }

    function correct(key) {
        busy = true;
        clearHint();
        els.root.dataset.beklenen = '';
        callbacks.onCorrect();
        const b = keyEls[key];
        b.classList.add('is-correct');
        later(() => b.classList.remove('is-correct'), 500);

        // Balon resme döner
        els.bubble.textContent = target.emoji;
        els.bubble.classList.add('is-revealed');
        els.caption.textContent = target.label;
        els.caption.classList.toggle('is-visible', !!target.label);
        const r = els.bubble.getBoundingClientRect();
        Particles.sparkle(r.left + r.width / 2, r.top + r.height / 2, 10);
        if (target.label) speak(target.label);

        // Resim deftere uçar (sabit konumlu klon, transform geçişi); hareket azaltılmışsa doğrudan yerleşir
        const slot = els.shelf.children[round - 1];
        const emoji = target.emoji;
        later(() => flyToSlot(slot, emoji), REVEAL_MS);

        if (round >= queue.length) later(endStage, NEXT_ROUND_MS + 350);
        else later(startRound, NEXT_ROUND_MS);
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
            sectionWrong++;
            callbacks.onWrong();                 // yalnız turun İLK yanlışı sayılır (el yordamı cezalanmaz)
        } else {
            AudioManager.play('error');
        }
        els.card.classList.remove('kk-nudge'); void els.card.offsetWidth; els.card.classList.add('kk-nudge');
        showHint();                              // yanlıştan sonra çocuk asla takılı kalmaz
    }

    // Kısım yıldızı: hatalı tur oranına göre (motorun doğruluk formülüne bağlı değil)
    function computeStars() {
        const ratio = sectionWrong / Math.max(1, sectionRounds);
        if (ratio <= 0.15) return 3;
        if (ratio <= 0.5) return 2;
        return 1;
    }

    // Bölüm bitti: düğme yok — şerit gösterilir, sıradaki bölüm kendiliğinden başlar.
    function endStage() {
        busy = true;
        clearHint();
        const section = levels[sectionIdx];
        const doneNo = stageNumber();
        if (stageIdx < section.stages.length - 1) {
            stageIdx++;
            showBanner('Bölüm ' + doneNo + ' tamam!', null, 'Sıradaki: ' + section.stages[stageIdx].name, STAGE_BANNER_MS);
            later(startStage, STAGE_BANNER_MS);
            return;
        }
        const stars = computeStars();
        if (sectionIdx >= levels.length - 1) { finish(stars); return; }
        callbacks.onLevelUp(stars);              // motor yıldızı kaydeder, araç çubuğu sonraki kısma geçer
        AudioManager.play('star');
        sectionIdx++;
        stageIdx = 0;
        const next = levels[sectionIdx];
        showBanner(section.name + ' bitti!', stars, 'Sıradaki: ' + next.name + ' · ' + next.stages[0].name, SECTION_BANNER_MS);
        later(startSection, SECTION_BANNER_MS);
    }

    function showBanner(title, stars, sub, ms) {
        const b = els.banner;
        b.innerHTML = '';
        b.appendChild(el('div', 'kk-banner__title', title));
        if (stars) {
            const s = el('div', 'kk-banner__stars', '⭐'.repeat(stars));
            s.setAttribute('aria-label', '3 üzerinden ' + stars + ' yıldız');
            b.appendChild(s);
        }
        b.appendChild(el('div', 'kk-banner__sub', sub));
        b.classList.add('is-visible');
        setInstruction(title + ' ' + sub);
        later(() => b.classList.remove('is-visible'), ms - 250);
    }

    function finish(stars) {
        busy = true;
        clearHint();
        callbacks.onComplete(stars);
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
            if (speechOn) speak(target && target.say);
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
        els = {}; keyEls = {}; shiftEls = []; target = null; stage = null;
    }

    return { id, levels, init, destroy };
})();
