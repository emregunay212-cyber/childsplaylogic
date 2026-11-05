"use strict";
/* ================= LINGO — ilk harfi verilen 5 harfli kelimeyi 5 denemede bul =================
   Bağımsız iframe oyunu (games/lingo/index.html); hub modülü js/games/lingo.js gömer.
   EduKit (games/_shared/edu-kit.js): ses (tek AudioContext), gizlenince süreyi duraklatma.
   Sözlük: window.TDK5 ({ KELİME: "anlam" }) isteğe bağlı — index.html'deki nota bak; yokken kolay liste. */
(function () {
  // ---------- Kelime listesi (5 harfli, çocuklara uygun) ----------
  const RAW = `KALEM KİTAP SINIF TAHTA SİLGİ ÇANTA MASAL ORMAN DENİZ BULUT GÜNEŞ ARMUT KİRAZ ÇİLEK
  KAVUN LİMON HAVUÇ BİBER SOĞAN AYRAN BÖREK SİMİT TAVUK HOROZ KOYUN ÖRDEK ASLAN ZEBRA KOALA
  PANDA YUNUS ARABA EKRAN MODEM ROBOT DÖNGÜ BİLGİ HESAP CEVAP RESİM MÜZİK KAZAK ÇORAP ŞAPKA
  BAHÇE ÇİÇEK DALGA NEHİR ŞEKER PASTA TABAK KAŞIK ÇATAL DOLAP YATAK LAMBA RADYO VİDEO DÜNYA
  ROKET FENER ÇADIR KUZEN BEBEK ÇOCUK PRENS SARAY KÖPRÜ SOKAK CADDE ŞEHİR YOLCU BİLET TAKSİ
  METRO POLİS FIRIN EKMEK BALIK ÇORBA PİLAV TATLI HELVA LOKUM KAHVE BEYAZ SİYAH YEŞİL PEMBE
  ALTIN GÜMÜŞ DEMİR KAĞIT MAKAS SAYFA ŞARKI GİTAR DAVUL KEMAN BALON KUKLA TOPAÇ HIZLI YAVAŞ
  BÜYÜK KÜÇÜK DERİN GENİŞ SICAK SOĞUK TEMİZ HAFİF OKUMA YAZMA ÇİZİM KEŞİF KANAT KARGA SERÇE
  KUMRU ŞAHİN MARTI BÖCEK TİLKİ KİRPİ YILAN FİDAN TOHUM MEYVE SEBZE İNCİR VİŞNE CEVİZ BADEM
  MISIR KABAK MARUL SALÇA TEYZE MUTLU SEVGİ DOLMA KÖFTE MANTI BURUN KULAK`;

  const up = s => s.toLocaleUpperCase('tr-TR');
  const WORDS = [...new Set(RAW.split(/\s+/).filter(Boolean).map(up))].filter(w => Array.from(w).length === 5);
  const LETTERS = new Set(Array.from('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'));
  const TIME = 20, REVEAL = 260;
  const DICT = window.TDK5 || null;               // { KELİME: "ilk anlamı" }
  const TDK_WORDS = DICT ? Object.keys(DICT) : [];
  const EASY = new Set(WORDS);
  let pool = 'easy', dictCheck = !!DICT;
  const isWord = w => EASY.has(w) || (DICT && w in DICT);
  function meaningEl(w) {
    if (!(DICT && DICT[w])) return null;
    const d = document.createElement('div'); d.className = 'mean'; d.textContent = '📖 ' + DICT[w];
    return d;
  }

  // ---------- Durum ----------
  let mode = 'solo', timerOn = false;
  let scores = [0, 0], soloScore = 0, streak = 0, startTeam = 0, active = 0;
  let target = [], hist = [], cur = [], known = [];
  let steal = false, over = false, busy = false;
  let used = new Set(), timeLeft = TIME, timerId = null;
  const keyState = {};

  // ---------- DOM ----------
  const $ = id => document.getElementById(id);
  const boardEl = $('board'), msgEl = $('msg'), kbEl = $('kb'), nextBtn = $('nextBtn'), kin = $('kinput');
  const rows = [];
  for (let r = 0; r < 6; r++) {
    const row = document.createElement('div'); row.className = 'row';
    for (let i = 0; i < 5; i++) { const t = document.createElement('div'); t.className = 'tile'; row.appendChild(t); }
    boardEl.appendChild(row); rows.push(row);
  }

  const KB = [
    ['E','R','T','Y','U','I','O','P','Ğ','Ü'],
    ['A','S','D','F','G','H','J','K','L','Ş','İ'],
    ['ENTER','Z','C','V','B','N','M','Ö','Ç','SİL']
  ];
  const keyEls = {};
  KB.forEach(line => {
    const kr = document.createElement('div'); kr.className = 'kr';
    line.forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'k'; b.textContent = k === 'ENTER' ? 'GİR' : k;
      if (k === 'ENTER' || k === 'SİL') b.classList.add('wide');
      b.addEventListener('mousedown', e => e.preventDefault()); // telefon klavyesi açıksa kapanmasın
      b.addEventListener('click', () => press(k));
      kr.appendChild(b); keyEls[k] = b;
    });
    kbEl.appendChild(kr);
  });

  // ---------- Yardımcılar ----------
  const teamName = t => t === 0 ? '🐯 Kaplanlar' : '🐬 Yunuslar';
  const mascot = $('mascot');
  // msg(parçalar, ruh hali): parçalar dize ya da düğüm; dize metin olarak eklenir (innerHTML yok)
  function msg(parts, mood) {
    msgEl.textContent = '';
    const list = Array.isArray(parts) ? parts : [parts];
    list.forEach(p => { if (p == null) return; msgEl.appendChild(typeof p === 'string' ? document.createTextNode(p) : p); });
    if (!msgEl.childNodes.length) msgEl.appendChild(document.createTextNode(' '));
    mascot.className = 'mascot';
    if (mood) { void mascot.offsetWidth; mascot.classList.add(mood); }
    mascot.textContent = mood === 'happy' ? '🤩' : mood === 'sad' ? '🥺' : '🦉';
  }
  function bold(text) { const b = document.createElement('b'); b.textContent = text; return b; }
  const CHEERS = ['Neredeyse! 💪', 'Devam et! 🌟', 'Bir daha dene! 🍀', 'Yaklaşıyorsun! ✨', 'Sen yaparsın! 🚀'];
  const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

  // ---- Sesler (EduKit: tek AudioContext, dosya gerekmez) ----
  let sndOn = true;
  function tone(f, d = .08, type = 'sine', delay = 0, vol = .15) {
    if (!sndOn) return;
    try { EduKit.tone(f, d, type, vol, delay); } catch (e) {}
  }
  const sWin = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'triangle', i * .12));
  const sLose = () => [392, 330, 262].forEach((f, i) => tone(f, .22, 'triangle', i * .15));
  // İlk kullanıcı jestinde ses bağlamını kur (tarayıcı otomatik oynatma kuralı)
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, () => { try { EduKit.audio.init(); } catch (e) {} }, { capture: true, passive: true }));

  // ---- Konfeti ----
  function confetti() {
    const colors = ['#ff5d73', '#ff9f43', '#ffd23f', '#3ccf6e', '#8f6bff', '#ff7eb6', '#4fc3f7'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('div'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
      c.style.animationDelay = Math.random() * .4 + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4000);
    }
  }

  function pickWord() {
    const list = pool === 'tdk' && TDK_WORDS.length ? TDK_WORDS : WORDS;
    if (used.size >= list.length) used.clear();
    let w;
    do { w = list[Math.floor(Math.random() * list.length)]; } while (used.has(w));
    used.add(w);
    return Array.from(w);
  }

  // Bilinen (yeşil) harfler kilitli; kullanıcı yalnızca boş kutuları doldurur
  const freeSlots = () => [0, 1, 2, 3, 4].filter(i => !known[i]);
  function guessArr() {
    const g = []; let k = 0;
    for (let i = 0; i < 5; i++) g.push(known[i] || cur[k++] || '');
    return g;
  }

  function evaluate(g, t) {
    const res = Array(5).fill('no'), cnt = {};
    for (let i = 0; i < 5; i++) { if (g[i] === t[i]) res[i] = 'ok'; else cnt[t[i]] = (cnt[t[i]] || 0) + 1; }
    for (let i = 0; i < 5; i++) { if (res[i] !== 'ok' && cnt[g[i]] > 0) { res[i] = 'near'; cnt[g[i]]--; } }
    return res;
  }

  // ---------- Çizim ----------
  function scoreBox(label, value, on) {
    const d = document.createElement('div'); d.className = 'sc' + (on ? ' on' : '');
    const s = document.createElement('small'); s.textContent = label;
    const b = document.createElement('b'); b.textContent = String(value);
    d.appendChild(s); d.appendChild(b);
    return d;
  }
  function renderScores() {
    const s = $('scores');
    s.textContent = '';
    if (mode === 'team') {
      [0, 1].forEach(t => s.appendChild(scoreBox(teamName(t), scores[t], t === active && !over)));
    } else {
      s.appendChild(scoreBox('Puan', soloScore));
      s.appendChild(scoreBox('Seri', streak));
    }
  }

  function render() {
    const shown = steal ? 6 : 5, free = freeSlots();
    if (kin.value !== cur.join('')) kin.value = cur.join('');
    rows.forEach((row, r) => {
      row.style.display = r < shown ? '' : 'none';
      row.classList.toggle('steal', r === 5);
      for (let i = 0; i < 5; i++) {
        const t = row.children[i];
        let ch = '', cls = 'tile';
        if (r < hist.length) { ch = hist[r].g[i]; cls += ' ' + hist[r].res[i]; }
        else if (r === hist.length && !over) {
          if (known[i]) { ch = known[i]; cls += ' lock'; }
          else {
            const k = free.indexOf(i);
            if (cur[k]) { ch = cur[k]; cls += ' filled'; }
            else if (k === cur.length) cls += ' cursor';
          }
        }
        t.textContent = ch; t.className = cls;
      }
    });
    for (const k in keyEls) {
      keyEls[k].classList.remove('ok', 'near', 'no');
      if (keyState[k]) keyEls[k].classList.add(keyState[k]);
    }
    nextBtn.textContent = over ? 'Yeni kelime ▶' : 'Pes et';
    nextBtn.classList.toggle('giveup', !over);
    renderScores();
  }

  // ---------- Süre ----------
  function stopTimer() { clearInterval(timerId); timerId = null; }
  function drawTimer() {
    const bar = $('timerBar');
    bar.style.width = (timeLeft / TIME * 100) + '%';
    bar.classList.toggle('low', timeLeft <= 5);
  }
  function tick() {
    timerId = setInterval(() => {
      timeLeft--; drawTimer();
      if (timeLeft <= 0) { stopTimer(); timeout(); }
    }, 1000);
  }
  function startTimer() {
    stopTimer();
    $('timer').classList.toggle('show', timerOn);
    if (!timerOn || over) return;
    timeLeft = TIME; drawTimer();
    tick();
  }
  function timeout() {
    if (busy || over) return;
    hist.push({ g: Array(5).fill(''), res: Array(5).fill('no') });
    cur = [];
    msg('⏰ Süre doldu!');
    afterMiss();
  }
  // Sekme gizlenince süre durur, görünür olunca kaldığı yerden sürer (EduKit.onHidden)
  let pausedByHide = false;
  try {
    EduKit.onHidden(
      () => { if (timerId) { stopTimer(); pausedByHide = true; } },
      () => { if (pausedByHide) { pausedByHide = false; if (timerOn && !over && !busy) tick(); } }
    );
  } catch (e) {}

  // ---------- Oyun akışı ----------
  function newRound() {
    target = pickWord();
    hist = []; cur = []; steal = false; over = false; busy = false;
    known = [target[0], null, null, null, null];
    for (const k in keyState) delete keyState[k];
    if (mode === 'team') { active = startTeam; startTeam = 1 - startTeam; }
    msg(mode === 'team' ? ['Sıra sizde: ', bold(teamName(active))] : 'Hadi kelimeyi bulalım! 🔍');
    render(); startTimer();
  }

  function press(k) {
    if (busy || over) return;
    if (k === 'ENTER') return submit();
    if (k === 'SİL') { cur.pop(); return render(); }
    if (cur.length < freeSlots().length && LETTERS.has(k)) { cur.push(k); tone(700, .05); render(); }
  }
  function enter() { if (busy) return; if (over) newRound(); else submit(); }

  function shake() {
    const row = rows[hist.length];
    row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); tone(160, .2, 'square', 0, .08);
  }

  function submit() {
    if (cur.length < freeSlots().length) { shake(); msg('Boş kutuları doldur'); return; }
    const g = guessArr();
    if (dictCheck && !isWord(g.join(''))) { shake(); msg('Bu kelime sözlükte yok, başka dene'); return; }
    busy = true; stopTimer();
    const res = evaluate(g, target);
    const row = rows[hist.length];
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const t = row.children[i];
        t.classList.add('flip');
        setTimeout(() => { t.className = 'tile flip ' + res[i]; tone(res[i] === 'ok' ? 880 : res[i] === 'near' ? 620 : 300, .1, 'triangle'); }, 200);
      }, i * REVEAL);
    }
    setTimeout(() => {
      hist.push({ g, res }); cur = [];
      const rank = { no: 1, near: 2, ok: 3 };
      g.forEach((ch, i) => {
        if (res[i] === 'ok') known[i] = target[i];
        if (!keyState[ch] || rank[res[i]] > rank[keyState[ch]]) keyState[ch] = res[i];
      });
      busy = false;
      if (res.every(x => x === 'ok')) win();
      else { msg(cheer()); afterMiss(); }
    }, 5 * REVEAL + 250);
  }

  function afterMiss() {
    const limit = steal ? 6 : 5;
    if (hist.length >= limit) {
      if (mode === 'team' && !steal) {
        const unk = [0, 1, 2, 3, 4].filter(i => !known[i]);
        if (unk.length > 1) { const p = unk[Math.floor(Math.random() * unk.length)]; known[p] = target[p]; }
        steal = true; active = 1 - active;
        msg([bold(teamName(active)), ': size bir harf hediye! 🎁 Tek hakkınız var!']);
      } else return endRound(false);
    }
    render(); startTimer();
  }

  function win() {
    const pts = steal ? 10 : (5 - (hist.length - 1)) * 10;
    const m = meaningEl(target.join(''));
    if (mode === 'team') { scores[active] += pts; msg(['🎉 ', bold(teamName(active)), ` bildi! +${pts} puan`, m], 'happy'); }
    else { soloScore += pts; streak++; msg([`Süpersin! 🎉 +${pts} puan`, m], 'happy'); }
    confetti(); sWin();
    over = true; stopTimer(); render();
    const row = rows[hist.length - 1];
    [...row.children].forEach((t, i) => setTimeout(() => t.classList.add('win'), i * 90));
  }

  function endRound(gaveUp) {
    over = true; stopTimer();
    if (mode === 'solo') streak = 0;
    sLose();
    const ans = document.createElement('span'); ans.className = 'ans'; ans.textContent = target.join('');
    msg([gaveUp ? 'Kelime: ' : 'Bu sefer olmadı 🙈 Kelime: ', ans, meaningEl(target.join(''))], 'sad');
    render();
  }

  // ---------- Kontroller ----------
  nextBtn.addEventListener('click', () => {
    if (busy) return;
    if (over) { newRound(); if (isTouch && !kbOn) kin.focus(); } else endRound(true);
  });

  // ---- Telefon / bilgisayar klavyesi (gizli input) ----
  kin.addEventListener('input', () => {
    if (busy || over) { render(); return; }
    cur = Array.from(up(kin.value)).filter(c => LETTERS.has(c)).slice(0, freeSlots().length);
    tone(700, .05); render();
  });
  kin.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enter(); } });
  $('kform').addEventListener('submit', e => { e.preventDefault(); enter(); });
  boardEl.addEventListener('click', () => kin.focus());

  // ---- Ekran klavyesi aç/kapa ----
  const isTouch = matchMedia('(pointer:coarse)').matches;
  let kbOn = !isTouch;
  const kbChk = $('kbChk');
  function updKb() {
    kbEl.classList.toggle('hide', !kbOn);
    $('tapHint').classList.toggle('show', !kbOn && document.activeElement !== kin);
  }
  kbChk.checked = kbOn;
  kbChk.addEventListener('change', () => { kbOn = kbChk.checked; updKb(); });
  kin.addEventListener('focus', updKb);
  kin.addEventListener('blur', updKb);

  $('modeSeg').addEventListener('click', e => {
    const m = e.target.dataset.mode; if (!m || m === mode || busy) return;
    mode = m; scores = [0, 0]; soloScore = 0; streak = 0; startTeam = 0;
    [...$('modeSeg').children].forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
    newRound();
  });

  $('timerChk').addEventListener('change', e => { timerOn = e.target.checked; if (!over && !busy) startTimer(); });

  document.addEventListener('keydown', e => {
    if (e.target === kin || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|BUTTON|SUMMARY)$/.test(e.target.tagName) && (e.key === 'Enter' || e.key === ' ')) return;
    if (e.key === 'Enter') { e.preventDefault(); enter(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); press('SİL'); return; }
    if (e.key.length === 1) press(up(e.key));
  });

  // ---- Kelime havuzu & sözlük kontrolü ----
  if (!DICT) $('dictControls').style.display = 'none';
  $('poolSeg').addEventListener('click', e => {
    const p = e.target.dataset.pool; if (!p || p === pool || busy) return;
    pool = p; used.clear();
    [...$('poolSeg').children].forEach(b => b.classList.toggle('on', b.dataset.pool === pool));
    newRound();
  });
  $('dictChk').addEventListener('change', e => { dictCheck = e.target.checked; });

  $('sndBtn').addEventListener('click', () => { sndOn = !sndOn; $('sndBtn').textContent = sndOn ? '🔊' : '🔇'; });

  updKb();
  newRound();
})();
