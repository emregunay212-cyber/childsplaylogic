"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.5 — aynen) ================= */
const CONFIG = {
  ROUND_SEC: 120,                          // vardiya süresi
  PATIENCE: { 1: 30, 2: 20, 3: 20, 4: 20 },// müşteri sabrı (Etek 30, diğerleri 20)
  SERVE_POINT: 50,                         // doğru servis
  TIP_PER_SEC: 2,                          // kalan sabır × 2 bahşiş
  QUEUE_SIZE: 3,
};
const MENU = [
  { e: '🍞', ad: 'Tost',     f: 15 },
  { e: '🥤', ad: 'Ayran',    f: 8  },
  { e: '🍵', ad: 'Çay',      f: 5  },
  { e: '🍪', ad: 'Kurabiye', f: 12 },
  { e: '🍋', ad: 'Limonata', f: 10 },
  { e: '🥪', ad: 'Sandviç',  f: 20 },
  { e: '🍕', ad: 'Pizza',    f: 30 },
];
const FACES = ['🧒', '👧', '👦', '👵', '👴', '👨', '👩', '🦊', '🐻', '🐰', '🐸'];
const { randInt: rnd, pick } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)

/* ================= PROBLEM ÜRETİCİ (tier'a göre — §4.5) ================= */
function genProblem(tier){
  const m = () => pick(MENU);
  if (tier === 1){
    // Etek: tek ürün fiyatı okuma (panodan bul)
    const u = m(), n = rnd(1, 2);
    return { q: n === 1 ? `1 ${u.ad} kaç TL?` : `${n} ${u.ad} kaç TL?`, a: u.f * n };
  }
  if (tier === 2){
    if (Math.random() < 0.55){
      // çoklu ürün toplama
      const a = m(); let b = m(); while (b === a) b = m();
      const na = rnd(1, 2), nb = rnd(1, 2);
      return { q: `${na} ${a.ad} + ${nb} ${b.ad} = ? TL`, a: na * a.f + nb * b.f };
    }
    // para üstü
    const u = m(), n = rnd(1, 2), tutar = u.f * n;
    const verilen = tutar <= 25 ? 50 : 100;
    return { q: `${n} ${u.ad} aldım, ${verilen} TL verdim. Para üstü?`, a: verilen - tutar };
  }
  if (tier === 3){
    if (Math.random() < 0.5){
      // tarif ölçekleme (oran-orantı)
      const malzeme = pick([['yumurta', '🥚'], ['bardak un', '🌾'], ['kaşık şeker', '🍬']]);
      const k1 = 2, adet = rnd(2, 4), k2 = pick([4, 6, 8]);
      return { q: `Tarif ${k1} kişilik: ${adet} ${malzeme[0]}. ${k2} kişilik için kaç ${malzeme[0]}?`, a: adet * (k2 / k1) };
    }
    // %10 indirim (tam bölünen fiyatlar: 10/20/30)
    const u = pick(MENU.filter(x => x.f % 10 === 0));
    return { q: `%10 indirimli ${u.ad} kaç TL? (normal ${u.f} TL)`, a: u.f - u.f / 10 };
  }
  // Zirve
  if (Math.random() < 0.5){
    // KDV %1 (yüzlük büyük siparişler — tam sonuç)
    const u = pick(MENU.filter(x => 100 % x.f === 0 || 200 % x.f === 0));
    const hedef = pick([100, 200, 300].filter(h => h % u.f === 0));
    const adet = hedef / u.f;
    return { q: `Okul siparişi: ${adet} ${u.ad} (${hedef} TL). %1 KDV ile toplam kaç TL?`, a: hedef + hedef / 100 };
  }
  // kampanya karşılaştırma → 1 veya 2 yazılır
  const u = m();
  const n = rnd(3, 4);
  const tekli = u.f * n;
  const kampanya = tekli + pick([-rnd(2, 8), rnd(2, 8)]);
  const cevap = kampanya < tekli ? 1 : 2;
  return {
    q: `Hangisi daha ucuz? 1️⃣ Kampanya: ${n} ${u.ad} ${kampanya} TL · 2️⃣ Tek tek: ${n} × ${u.f} TL  (1 mi 2 mi?)`,
    a: cevap,
  };
}

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return {
    init,
    key: () => tone(520, 0.05, 'square', 0.03),
    ok: () => { tone(660, 0.1, 'triangle', 0.07); tone(880, 0.12, 'triangle', 0.07, 0.09); tone(1100, 0.1, 'triangle', 0.05, 0.18); },
    bad: () => tone(170, 0.22, 'sawtooth', 0.05),
    leave: () => { tone(360, 0.12, 'triangle', 0.04); tone(280, 0.16, 'triangle', 0.04, 0.1); },
    bell: () => { tone(880, 0.1, 'sine', 0.06); tone(1175, 0.16, 'sine', 0.06, 0.08); },
    tick: () => tone(840, 0.05, 'square', 0.03),
    fanfare: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, i * 0.13)),
  };
})();

/* ================= Bridge (§6.1 stub) ================= */
const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(payload){
    const rec = { ...payload, ts: Date.now() };
    try {
      const r = await window.storage.get(this.QUEUE_KEY);
      const q = r && r.value ? JSON.parse(r.value) : [];
      q.push(rec); while (q.length > 50) q.shift();
      await window.storage.set(this.QUEUE_KEY, JSON.stringify(q));
    } catch (e) {}
  },
};

/* ================= İstatistik ================= */
const STATS_KEY = 'matkafe_stats';
let STATS = { plays: 0, served: 0, lost: 0, bestTip: 0, best: { 1: 0, 2: 0, 3: 0, 4: 0 } };
function loadStats(){ try { window.storage.get(STATS_KEY).then(r => { if (r && r.value){ try { STATS = Object.assign(STATS, JSON.parse(r.value)); } catch (e) {} } refreshBestLine(); }); } catch (e) {} }
function saveStats(){ try { window.storage.set(STATS_KEY, JSON.stringify(STATS)); } catch (e) {} }

/* ================= NUMPAD — MODÜLER BİLEŞEN (diğer oyunlarda yeniden kullanılabilir)
   Kullanım: Numpad.mount(gridEl, valueEl, { onSubmit(value), allowDot }) ================= */
const Numpad = (() => {
  let valueEl = null, onSubmit = null, val = '';
  const LAYOUT = ['7', '8', '9', '⌫', '4', '5', '6', 'C', '1', '2', '3', '✔', '0', '.'];
  function refresh(){ if (valueEl) valueEl.textContent = val || ' '; }
  function press(k){
    Audio2.key();
    if (k === '⌫') val = val.slice(0, -1);
    else if (k === 'C') val = '';
    else if (k === '✔'){ if (val !== '' && onSubmit) onSubmit(parseFloat(val.replace(',', '.'))); return; }
    else if (k === '.'){ if (!val.includes('.')) val = (val || '0') + '.'; }
    else if (val.length < 7) val += k;
    refresh();
  }
  function mount(gridEl, vEl, opts){
    valueEl = vEl; onSubmit = opts.onSubmit; val = '';
    gridEl.innerHTML = '';
    LAYOUT.forEach(k => {
      const b = document.createElement('button');
      b.className = 'npBtn' + (k === '✔' ? ' ok' : (k === '⌫' || k === 'C') ? ' act' : '');
      b.textContent = k;
      b.addEventListener('click', () => press(k));
      gridEl.appendChild(b);
    });
    refresh();
    // klavye desteği
    if (!mount._wired){
      mount._wired = true;
      addEventListener('keydown', e => {
        if (!document.getElementById('screen-game').classList.contains('show')) return;
        if (e.key >= '0' && e.key <= '9') press(e.key);
        else if (e.key === 'Backspace') press('⌫');
        else if (e.key === 'Enter') press('✔');
        else if (e.key === '.' || e.key === ',') press('.');
      });
    }
  }
  function clear(){ val = ''; refresh(); }
  return { mount, clear };
})();

/* ================= Game (müşteri kuyruğu state machine: bekliyor → sipariş → mutlu/üzgün → çıkış) ================= */
const $ = id => document.getElementById(id);
const G = {
  state: 'menu', tier: 1,
  score: 0, timeLeft: CONFIG.ROUND_SEC, secT: null, patT: null,
  served: 0, lost: 0, tips: 0, wrongTries: 0,
  queue: [],         // [{face, prob, patience, maxPat}]
};

function renuMenuBoard(){
  $('menuBoard').innerHTML = MENU.map(u => `<span>${u.e} ${u.ad} <b style="color:#ffd23f">${u.f} TL</b></span>`).join('');
}
function newCustomer(){
  return { face: pick(FACES), prob: genProblem(G.tier), patience: CONFIG.PATIENCE[G.tier], maxPat: CONFIG.PATIENCE[G.tier] };
}
function fillQueue(){
  while (G.queue.length < CONFIG.QUEUE_SIZE) G.queue.push(newCustomer());
  renderQueue();
}
function renderQueue(){
  const q = $('queue');
  q.innerHTML = '';
  G.queue.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'cust' + (i === 0 ? ' active' : '');
    el.innerHTML = `<div class="face">${c.face}</div><div class="pat"><i style="width:${(c.patience / c.maxPat) * 100}%;background:${c.patience / c.maxPat > 0.4 ? 'var(--ok)' : '#e2622b'}"></i></div>`;
    q.appendChild(el);
  });
  const cur = G.queue[0];
  $('bubble').textContent = cur ? cur.prob.q : 'Müşteri geliyor…';
}
function serveAnswer(v){
  if (G.state !== 'playing' || !G.queue.length) return;
  const cur = G.queue[0];
  if (Math.abs(v - cur.prob.a) < 0.001){
    const tip = Math.max(0, Math.round(cur.patience)) * CONFIG.TIP_PER_SEC;
    const pts = CONFIG.SERVE_POINT + tip;          // 50 p + kalan sabır × 2 (§4.5)
    G.score += pts; G.served++; G.tips += tip;
    if (tip > STATS.bestTip) STATS.bestTip = tip;
    Audio2.ok();
    floatHappy('😊 +' + pts);
    G.queue.shift();
    Numpad.clear();
    fillQueue();
    refreshHUD();
  } else {
    G.wrongTries++;
    Audio2.bad();
    const b = $('bubble');
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
    Numpad.clear();
  }
}
function floatHappy(txt){
  const el = document.createElement('div');
  el.textContent = txt;
  el.style.cssText = 'position:absolute;left:50%;top:30%;transform:translateX(-50%);font-weight:900;font-size:22px;color:#2c7a44;pointer-events:none;transition:all 1s;z-index:8';
  $('kafeAlan').appendChild(el);
  requestAnimationFrame(() => { el.style.top = '8%'; el.style.opacity = '0'; });
  setTimeout(() => el.remove(), 1050);
}
/* sabır akışı: aktif müşteri sabırsızlanır; biterse üzülmeden, sessizce çıkar (kaygı yaratmama ilkesi) */
function patienceTick(){
  if (G.state !== 'playing' || !G.queue.length) return;
  const cur = G.queue[0];
  cur.patience -= 0.25;
  if (cur.patience <= 0){
    G.lost++;
    Audio2.leave();
    G.queue.shift();
    Numpad.clear();
    fillQueue();
    refreshHUD();
  } else renderQueue();
}

/* ---- HUD + akış ---- */
function refreshHUD(){
  $('scoreChip').textContent = '⭐ ' + G.score;
  $('timeChip').textContent = '⏱️ ' + Math.max(0, G.timeLeft);
  $('timeChip').classList.toggle('low', G.timeLeft <= 15);
  $('servedChip').textContent = '😊 ' + G.served;
}
function show(id){ document.querySelectorAll('.screen').forEach(s => s.classList.remove('show')); $(id).classList.add('show'); }

function startRound(){
  G.state = 'playing';
  G.score = 0; G.timeLeft = CONFIG.ROUND_SEC;
  G.served = 0; G.lost = 0; G.tips = 0; G.wrongTries = 0;
  G.queue = [];
  show('screen-game');
  renuMenuBoard();
  Numpad.mount($('npGrid'), $('npValue'), { onSubmit: serveAnswer });
  fillQueue();
  Audio2.bell();
  refreshHUD();
  clearInterval(G.secT); clearInterval(G.patT);
  G.secT = setInterval(() => {
    if (G.state !== 'playing') return;
    G.timeLeft--;
    if (G.timeLeft <= 5 && G.timeLeft > 0) Audio2.tick();
    refreshHUD();
    if (G.timeLeft <= 0) endRound();
  }, 1000);
  G.patT = setInterval(patienceTick, 250);
}
function endRound(){
  if (G.state === 'result') return;
  G.state = 'result';
  clearInterval(G.secT); clearInterval(G.patT);
  STATS.plays++; STATS.served += G.served; STATS.lost += G.lost;
  const isBest = G.score > (STATS.best[G.tier] || 0);
  if (isBest) STATS.best[G.tier] = G.score;
  saveStats();
  BilnetBridge.submitScore({
    gameId: 'matematik-kafe', score: G.score, tier: G.tier,
    stats: { served: G.served, lost: G.lost, tips: G.tips, wrongTries: G.wrongTries },
  });
  $('resEmoji').textContent = isBest ? '🏆' : (G.served >= 8 ? '👨‍🍳' : '☕');
  $('resScore').textContent = G.score;
  $('resStats').innerHTML =
    `😊 Mutlu müşteri: <b>${G.served}</b> &nbsp;·&nbsp; 😶 Bekleyemeden giden: <b>${G.lost}</b><br>` +
    `💰 Toplam bahşiş: <b>${G.tips}</b>` +
    (isBest ? `<br>🏅 <b>YENİ ${['', 'ETEK', 'YAMAÇ', 'TIRMANIŞ', 'ZİRVE'][G.tier]} REKORU!</b>` : '');
  $('eduLine').textContent = G.served > 0
    ? `Bugün ${G.served} günlük hayat problemi çözdün! 🎉`
    : 'Kasada pratik yaptın — bir dahaki vardiyada bahşişler senin! 💪';
  if (G.served >= 5) Audio2.fanfare();
  show('screen-result');
  refreshBestLine();
}
function refreshBestLine(){
  const b = STATS.best[G.tier] || 0;
  $('bestLine').textContent = b > 0 ? `🏅 ${['', 'Etek', 'Yamaç', 'Tırmanış', 'Zirve'][G.tier]} rekorun: ${b}` : '';
}

/* ---- menü ---- */
document.querySelectorAll('.tierBtn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tierBtn').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  G.tier = parseInt(b.dataset.t, 10);
  refreshBestLine();
}));
$('bPlay').addEventListener('click', () => { Audio2.init(); startRound(); });
$('bHelp').addEventListener('click', () => $('helpBox').classList.toggle('show'));
$('bAgain').addEventListener('click', startRound);
$('bMenu').addEventListener('click', () => { G.state = 'menu'; show('screen-menu'); refreshBestLine(); });

/* ---- duraklatma + visibilitychange (zorunlu §5) ---- */
function pauseGame(){ if (G.state !== 'playing') return; G.state = 'paused'; $('pauseVeil').classList.add('show'); }
function resumeGame(){ if (G.state !== 'paused') return; G.state = 'playing'; $('pauseVeil').classList.remove('show'); }
$('bPause').addEventListener('click', pauseGame);
$('bResume').addEventListener('click', resumeGame);
$('bQuit').addEventListener('click', () => {
  $('pauseVeil').classList.remove('show');
  clearInterval(G.secT); clearInterval(G.patT);
  G.state = 'menu'; show('screen-menu'); refreshBestLine();
});
EduKit.onHidden(() => {
  if (G.state === 'playing'){ pauseGame(); saveStats(); }
});   // gizlenince duraklat, pagehide'da da kaydet

/* ---- başlat ---- */
loadStats();
