"use strict";
/* ================= LINGO — 9 bölümlük seri: 2 harften 10 harfe =================
   Bağımsız iframe oyunu (games/lingo/index.html); hub modülü js/games/lingo.js gömer.
   Seri (bölüm): 9 tur, tur başına kelime uzunluğu 2,3,…,10. Her turda ilk harf verilir, 5 deneme hakkı
   (2 takımda bilemeyen takımın rakibine bir harf daha + tek hak). 10 harf bitince özet (toplam puan,
   bulunan/9, en iyi puan) sunulur, "Yeni seri" 2 harften başlar.
   Puan: tur = (6 − deneme) × harf × 2 (10 harfi ilk denemede bulan 100, 2 harfi 10); çalma turu = harf × 2.
   Kelimeler: kelimeler.js (LINGO_KELIMELER[uzunluk]); kullanılanlar cihazda tutulur (lingo_used), kova
   bitince o kova sıfırlanır → art arda aynı kelime çıkmaz. En iyi puan / seri sayısı: lingo_stats.
   EduKit: ses (tek AudioContext), gizlenince süre durur, storage köprüsü (js/auth.js GAME_SAVE_KEYS). */
(function () {
  const WORDS = window.LINGO_KELIMELER || {};
  const MIN_LEN = 2, MAX_LEN = 10, ROUNDS = MAX_LEN - MIN_LEN + 1;   // 9 bölüm
  const TRIES = 5, TIME = 20, REVEAL = 220;
  const up = s => s.toLocaleUpperCase('tr-TR');
  const LETTERS = new Set(Array.from('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'));
  const DICT = window.TDK5 || null;               // { KELİME: "ilk anlamı" } — isteğe bağlı
  const EASY = new Set(Object.values(WORDS).flat());
  let pool = 'easy', dictCheck = !!DICT;
  const isWord = w => EASY.has(w) || (DICT && w in DICT);
  function meaningEl(w) {
    if (!(DICT && DICT[w])) return null;
    const d = document.createElement('div'); d.className = 'mean'; d.textContent = '📖 ' + DICT[w];
    return d;
  }

  // ---------- Kayıt (EduKit.storage: Promise API, localStorage köprüsü) ----------
  const USED_KEY = 'lingo_used', STATS_KEY = 'lingo_stats';
  let usedByLen = {};                              // { "5": ["KALEM", …] }
  let stats = { best: 0, episodes: 0 };
  const store = (window.EduKit && EduKit.storage) || null;
  async function load(key, fallback) {
    try { const r = store && await store.get(key); if (r && r.value) return JSON.parse(r.value); } catch (e) {}
    return fallback;
  }
  function save(key, value) { try { if (store) store.set(key, JSON.stringify(value)); } catch (e) {} }

  // ---------- Durum ----------
  let mode = 'solo', timerOn = false;
  let level = 0, L = MIN_LEN;                       // bölüm (0..8), kelime uzunluğu
  let results = [];                                 // bölüm sonuçları: 'ok' | 'no'
  let scores = [0, 0], soloScore = 0, streak = 0, startTeam = 0, active = 0;
  let target = [], hist = [], cur = [], known = [];
  let steal = false, over = false, busy = false, episodeDone = false;
  let timeLeft = TIME, timerId = null;
  const keyState = {};

  // ---------- DOM ----------
  const $ = id => document.getElementById(id);
  const boardEl = $('board'), msgEl = $('msg'), kbEl = $('kb'), nextBtn = $('nextBtn'), kin = $('kinput');
  const levelsEl = $('levels'), summaryEl = $('summary');
  const rows = [];
  for (let r = 0; r < TRIES + 1; r++) {
    const row = document.createElement('div'); row.className = 'row';
    boardEl.appendChild(row); rows.push(row);
  }
  function buildBoard(n) {
    boardEl.style.setProperty('--n', n);
    boardEl.classList.toggle('dar', n > 7);
    rows.forEach(row => {
      row.textContent = '';
      for (let i = 0; i < n; i++) { const t = document.createElement('div'); t.className = 'tile'; row.appendChild(t); }
    });
  }
  // Bölüm şeridi: 9 hap (harf sayısı); geçmiş turlar yeşil/gri, aktif tur vurgulu
  const levelEls = [];
  for (let i = 0; i < ROUNDS; i++) {
    const s = document.createElement('span'); s.className = 'lv'; s.textContent = String(MIN_LEN + i);
    s.title = (MIN_LEN + i) + ' harf'; levelsEl.appendChild(s); levelEls.push(s);
  }
  function renderLevels() {
    levelEls.forEach((s, i) => {
      s.className = 'lv' + (results[i] ? ' ' + results[i] : '') + (i === level && !episodeDone ? ' cur' : '');
    });
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
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const bold = text => el('b', null, text);
  const CHEERS = ['Neredeyse! 💪', 'Devam et! 🌟', 'Bir daha dene! 🍀', 'Yaklaşıyorsun! ✨', 'Sen yaparsın! 🚀'];
  const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];
  const roundLabel = () => `Bölüm ${level + 1}/${ROUNDS} · ${L} harf`;

  // ---- Sesler (EduKit: tek AudioContext, dosya gerekmez) ----
  let sndOn = true;
  function tone(f, d = .08, type = 'sine', delay = 0, vol = .15) {
    if (!sndOn) return;
    try { EduKit.tone(f, d, type, vol, delay); } catch (e) {}
  }
  const sWin = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'triangle', i * .12));
  const sLose = () => [392, 330, 262].forEach((f, i) => tone(f, .22, 'triangle', i * .15));
  const sFinal = () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .25, 'triangle', i * .14));
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, () => { try { EduKit.audio.init(); } catch (e) {} }, { capture: true, passive: true }));

  // ---- Konfeti ----
  function confetti(n = 70) {
    const colors = ['#ff5d73', '#ff9f43', '#ffd23f', '#3ccf6e', '#8f6bff', '#ff7eb6', '#4fc3f7'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
      c.style.animationDelay = Math.random() * .4 + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4000);
    }
  }

  // ---- Kelime seçimi: kullanılmayanlardan rastgele; kova bitince sıfırlanır (aynı kelime art arda gelmez) ----
  function pickWord(n) {
    let list = WORDS[n] || [];
    if (pool === 'tdk' && DICT) { const t = Object.keys(DICT).filter(w => Array.from(w).length === n); if (t.length) list = t; }
    if (!list.length) list = [Array(n).fill('A').join('')];   // veri eksikse oyun kilitlenmesin
    const key = String(n);
    let used = new Set(usedByLen[key] || []);
    let fresh = list.filter(w => !used.has(w));
    if (!fresh.length) { used = new Set(); fresh = list.slice(); }
    const w = fresh[Math.floor(Math.random() * fresh.length)];
    used.add(w);
    usedByLen[key] = [...used];
    save(USED_KEY, usedByLen);
    return Array.from(w);
  }

  // Bilinen (yeşil) harfler kilitli; kullanıcı yalnızca boş kutuları doldurur
  const freeSlots = () => Array.from({ length: L }, (_, i) => i).filter(i => !known[i]);
  function guessArr() {
    const g = []; let k = 0;
    for (let i = 0; i < L; i++) g.push(known[i] || cur[k++] || '');
    return g;
  }

  function evaluate(g, t) {
    const res = Array(L).fill('no'), cnt = {};
    for (let i = 0; i < L; i++) { if (g[i] === t[i]) res[i] = 'ok'; else cnt[t[i]] = (cnt[t[i]] || 0) + 1; }
    for (let i = 0; i < L; i++) { if (res[i] !== 'ok' && cnt[g[i]] > 0) { res[i] = 'near'; cnt[g[i]]--; } }
    return res;
  }

  // ---------- Çizim ----------
  function scoreBox(label, value, on) {
    const d = el('div', 'sc' + (on ? ' on' : ''));
    d.appendChild(el('small', null, label)); d.appendChild(el('b', null, String(value)));
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
      s.appendChild(scoreBox('En iyi', stats.best));
    }
  }

  function render() {
    const shown = steal ? TRIES + 1 : TRIES, free = freeSlots();
    if (kin.value !== cur.join('')) kin.value = cur.join('');
    rows.forEach((row, r) => {
      row.style.display = r < shown ? '' : 'none';
      row.classList.toggle('steal', r === TRIES);
      for (let i = 0; i < L; i++) {
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
    nextBtn.textContent = !over ? 'Pes et' : (level < ROUNDS - 1 ? 'Sonraki kelime ▶' : 'Sonucu gör 🏁');
    nextBtn.classList.toggle('giveup', !over);
    renderScores(); renderLevels();
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
    hist.push({ g: Array(L).fill(''), res: Array(L).fill('no') });
    cur = [];
    msg('⏰ Süre doldu!');
    afterMiss();
  }
  let pausedByHide = false;
  try {
    EduKit.onHidden(
      () => { if (timerId) { stopTimer(); pausedByHide = true; } },
      () => { if (pausedByHide) { pausedByHide = false; if (timerOn && !over && !busy) tick(); } }
    );
  } catch (e) {}

  // ---------- Seri / tur akışı ----------
  function startEpisode() {
    level = 0; results = []; episodeDone = false;
    soloScore = 0; scores = [0, 0]; startTeam = 0;
    summaryEl.hidden = true;
    newRound();
  }

  function newRound() {
    L = MIN_LEN + level;
    target = pickWord(L);
    buildBoard(L);
    hist = []; cur = []; steal = false; over = false; busy = false;
    known = Array(L).fill(null); known[0] = target[0];
    for (const k in keyState) delete keyState[k];
    if (mode === 'team') { active = startTeam; startTeam = 1 - startTeam; }
    msg(mode === 'team' ? [bold(roundLabel()), ' · Sıra sizde: ', bold(teamName(active))]
                        : [bold(roundLabel()), level === 0 ? ' · Hadi başlayalım! 🔍' : ' · Devam! 🔍']);
    render(); startTimer();
  }

  function press(k) {
    if (busy || over) return;
    if (k === 'ENTER') return submit();
    if (k === 'SİL') { cur.pop(); return render(); }
    if (cur.length < freeSlots().length && LETTERS.has(k)) { cur.push(k); tone(700, .05); render(); }
  }
  function next() {
    if (busy) return;
    if (!over) return submit();
    if (level < ROUNDS - 1) { level++; newRound(); if (isTouch && !kbOn) kin.focus(); }
    else showSummary();
  }
  // Enter: tur sürüyorsa tahmini gönderir; tur bittiyse sonraki kelimeye geçer — ama tur bittikten hemen
  // sonraki ENTER_LOCK_MS içinde değil (son tahmini gönderen ikinci Enter sonucu okutmadan atlamasın).
  const ENTER_LOCK_MS = 700;
  let overAt = 0;
  function enter() {
    if (busy) return;
    if (!over) return submit();
    if (Date.now() - overAt < ENTER_LOCK_MS) return;
    next();
  }

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
    const step = Math.min(REVEAL, Math.round(1300 / L));     // uzun kelimede açılış hızlanır
    for (let i = 0; i < L; i++) {
      setTimeout(() => {
        const t = row.children[i];
        t.classList.add('flip');
        setTimeout(() => { t.className = 'tile flip ' + res[i]; tone(res[i] === 'ok' ? 880 : res[i] === 'near' ? 620 : 300, .1, 'triangle'); }, 180);
      }, i * step);
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
    }, L * step + 250);
  }

  function afterMiss() {
    const limit = steal ? TRIES + 1 : TRIES;
    if (hist.length >= limit) {
      if (mode === 'team' && !steal) {
        const unk = Array.from({ length: L }, (_, i) => i).filter(i => !known[i]);
        if (unk.length > 1) { const p = unk[Math.floor(Math.random() * unk.length)]; known[p] = target[p]; }
        steal = true; active = 1 - active;
        msg([bold(teamName(active)), ': size bir harf hediye! 🎁 Tek hakkınız var!']);
      } else return endRound(false);
    }
    render(); startTimer();
  }

  function finishRound(result) {
    results[level] = result;
    over = true; overAt = Date.now(); stopTimer();
  }

  function win() {
    const pts = steal ? L * 2 : (TRIES + 1 - hist.length) * L * 2;
    const m = meaningEl(target.join(''));
    const last = level === ROUNDS - 1 ? ' Seri tamam, sonucu gör! 🏁' : '';
    if (mode === 'team') { scores[active] += pts; msg(['🎉 ', bold(teamName(active)), ` bildi! +${pts} puan.${last}`, m], 'happy'); }
    else { soloScore += pts; streak++; msg([`Süpersin! 🎉 +${pts} puan.${last}`, m], 'happy'); }
    confetti(); sWin();
    finishRound('ok'); render();
    const row = rows[hist.length - 1];
    [...row.children].forEach((t, i) => setTimeout(() => t.classList.add('win'), i * 90));
  }

  function endRound(gaveUp) {
    finishRound('no');
    if (mode === 'solo') streak = 0;
    sLose();
    const ans = el('span', 'ans', target.join(''));
    const last = level === ROUNDS - 1 ? ' Seri tamam, sonucu gör! 🏁' : '';
    msg([gaveUp ? 'Kelime: ' : 'Bu sefer olmadı 🙈 Kelime: ', ans, last, meaningEl(target.join(''))], 'sad');
    render();
  }

  // ---------- Seri özeti ----------
  function showSummary() {
    episodeDone = true; stopTimer();
    const solved = results.filter(r => r === 'ok').length;
    const total = mode === 'team' ? Math.max(scores[0], scores[1]) : soloScore;
    stats.episodes += 1;
    const record = mode === 'solo' && soloScore > stats.best;
    if (record) stats.best = soloScore;
    save(STATS_KEY, stats);

    summaryEl.textContent = '';
    const card = el('div', 'sumCard');
    card.appendChild(el('div', 'sumTitle', record ? '🏆 Yeni rekor!' : '🏁 Seri tamamlandı!'));
    if (mode === 'team') {
      const row = el('div', 'sumTeams');
      [0, 1].forEach(t => { const b = el('div', 'sumTeam' + (scores[t] >= scores[1 - t] ? ' win' : '')); b.appendChild(el('small', null, teamName(t))); b.appendChild(el('b', null, String(scores[t]))); row.appendChild(b); });
      card.appendChild(row);
      card.appendChild(el('div', 'sumLine', scores[0] === scores[1] ? 'Berabere! 🤝' : `${teamName(scores[0] > scores[1] ? 0 : 1)} kazandı! 🎉`));
    } else {
      card.appendChild(el('div', 'sumScore', String(soloScore)));
      card.appendChild(el('div', 'sumLine', 'toplam puan'));
    }
    const grid = el('div', 'sumGrid');
    [[`${solved} / ${ROUNDS}`, 'kelime bulundu'], [String(stats.best), 'en iyi puan'], [String(stats.episodes), 'tamamlanan seri']]
      .forEach(([v, l]) => { const b = el('div', 'sumStat'); b.appendChild(el('b', null, v)); b.appendChild(el('small', null, l)); grid.appendChild(b); });
    card.appendChild(grid);
    const strip = el('div', 'sumStrip');
    results.forEach((r, i) => strip.appendChild(el('span', 'lv ' + (r || 'no'), String(MIN_LEN + i))));
    card.appendChild(strip);
    const btn = el('button', 'next', 'Yeni seri ▶'); btn.type = 'button'; btn.id = 'againBtn';
    btn.addEventListener('click', () => { startEpisode(); if (isTouch && !kbOn) kin.focus(); });
    card.appendChild(btn);
    summaryEl.appendChild(card);
    summaryEl.hidden = false;
    btn.focus();
    confetti(solved >= ROUNDS - 2 ? 120 : 50); sFinal();
    msg(['Seri bitti! Toplam ', bold(String(total)), ' puan. Yeni seri 2 harften başlar.'], 'happy');
    nextBtn.textContent = 'Yeni seri ▶';
    renderScores(); renderLevels();          // "En iyi" kutusu rekor sonrası hemen güncellensin
  }

  // ---------- Kontroller ----------
  // Düğme tıklandıktan sonra odak düğmede KALMAZ: kalırsa klavyeden yazılan tahminin Enter'ı düğmeye
  // "tık" sayılır ve oyuncu istemeden pes eder / sonraki kelimeye geçer (sahip bildirimi, 5 Kas 2026).
  nextBtn.addEventListener('click', () => {
    nextBtn.blur();
    if (busy) return;
    if (episodeDone) { startEpisode(); return; }
    if (over) next(); else endRound(true);
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
    mode = m; streak = 0;
    [...$('modeSeg').children].forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
    startEpisode();
  });

  $('timerChk').addEventListener('change', e => { timerOn = e.target.checked; if (!over && !busy) startTimer(); });

  // Fiziksel klavye. Enter HER ZAMAN oyun akışına gider (tahmin gönder / sonraki kelime); yalnız ayarlar
  // paneli (details.settings) ve seri özeti düğmesi kendi Enter'ını alır. Odaktaki "Pes et" düğmesine
  // tarayıcının Enter → tık çevirisi yapılmaz (preventDefault): yazılan tahmin pes etmeye dönüşmez.
  const inSettings = t => !!(t && t.closest && t.closest('.settings, #summary'));
  document.addEventListener('keydown', e => {
    if (e.target === kin || e.ctrlKey || e.metaKey || e.altKey) return;
    if (inSettings(e.target)) return;
    if (episodeDone) { if (e.key === 'Enter') { e.preventDefault(); startEpisode(); } return; }
    if (e.key === 'Enter') { e.preventDefault(); enter(); return; }
    if (e.key === ' ' && e.target && e.target.tagName === 'BUTTON') { e.preventDefault(); return; }   // Boşluk da düğmeye tık olmasın
    if (e.key === 'Backspace') { e.preventDefault(); press('SİL'); return; }
    if (e.key.length === 1) press(up(e.key));
  });

  // ---- Kelime havuzu & sözlük kontrolü ----
  if (!DICT) $('dictControls').style.display = 'none';
  $('poolSeg').addEventListener('click', e => {
    const p = e.target.dataset.pool; if (!p || p === pool || busy) return;
    pool = p;
    [...$('poolSeg').children].forEach(b => b.classList.toggle('on', b.dataset.pool === pool));
    startEpisode();
  });
  $('dictChk').addEventListener('change', e => { dictCheck = e.target.checked; });

  $('sndBtn').addEventListener('click', () => { $('sndBtn').blur(); sndOn = !sndOn; $('sndBtn').textContent = sndOn ? '🔊' : '🔇'; });

  updKb();
  (async () => {
    usedByLen = await load(USED_KEY, {});
    const s = await load(STATS_KEY, null);
    if (s && typeof s === 'object') stats = { best: s.best | 0, episodes: s.episodes | 0 };
    startEpisode();
  })();
})();
