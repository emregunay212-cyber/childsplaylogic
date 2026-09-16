"use strict";
/* ================= STRINGS ================= */
const STRINGS = {
  modeSum:  { pre: 'Toplamı',  post: 'yapan zinciri kur' },
  modeDiff: { pre: 'Farkı',    post: 'olan İKİ taşı seç' },
  modeProd: { pre: 'Çarpımı',  post: 'yapan zinciri kur' },
  shuffled: '🔀 Taşlar karıştı!',
  edu: (c, t) => `Bugün ${c} işlem zinciri kurdun — toplam ${t} taş patlattın! 🎉`,
  eduZero: 'Zincirler seni bekliyor — bir dahaki turda patlat! 💪',
  best: (t, s) => `🏅 ${['','Etek','Yamaç','Tırmanış','Zirve'][t]} rekorun: ${s}`,
};

/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.2 — aynen) ================= */
const CONFIG = {
  ROUND_SEC: 60,                  // tur süresi
  GRID_DESKTOP: 7,                // 7×7
  GRID_MOBILE: 6,                 // mobilde 6×6
  MOBILE_BREAK: 480,
  CHAIN_POINT: n => n * n * 10,   // zincir puanı: taş_sayısı² × 10 (uzun zincir teşviki)
  TARGET_EVERY: 3,                // hedef her 3 patlatmada bir yenilenir
  MIN_CHAIN: 2,
  TIERS: {                        // hedef üretimi tier'a göre
    1: () => ({ mode: 'sum',  target: rnd(5, 10) }),                       // Etek: 5-10, sadece toplama
    2: () => ({ mode: 'sum',  target: rnd(10, 20) }),                      // Yamaç: 10-20
    3: () => Math.random() < 0.5                                           // Tırmanış: çıkarma karışır
         ? { mode: 'sum',  target: rnd(10, 20) }
         : { mode: 'diff', target: rnd(1, 7) },
    4: () => {                                                             // Zirve: çarpım hedefleri
      const k = Math.random() < 0.7 ? 2 : 3;
      let p = 1; for (let i = 0; i < k; i++) p *= rnd(2, k === 2 ? 9 : 5);
      return { mode: 'prod', target: p };
    },
  },
};
const { randInt: rnd } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)

/* ================= Audio (Web Audio sentez) ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return {
    init,
    pick: len => tone(380 + len * 55, 0.07, 'triangle', 0.05),   // zincir uzadıkça tiz (akış hissi)
    unpick: () => tone(300, 0.06, 'triangle', 0.04),
    boom: len => { tone(120, 0.22, 'sawtooth', 0.08); for (let i = 0; i < Math.min(len, 6); i++) tone(600 + i * 90, 0.1, 'triangle', 0.05, 0.04 + i * 0.04); },
    bad:  () => tone(150, 0.25, 'sawtooth', 0.05),
    newTarget: () => { tone(520, 0.09, 'triangle', 0.05); tone(700, 0.11, 'triangle', 0.05, 0.09); },
    tick: () => tone(840, 0.05, 'square', 0.03),
    fanfare: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, i * 0.13)),
  };
})();

/* ================= Bridge (§6.1 stub — meta katman v1 backend bağlayacak) ================= */
const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(payload){
    const rec = { ...payload, ts: Date.now() };
    try {
      const r = await window.storage.get(this.QUEUE_KEY);
      const q = r && r.value ? JSON.parse(r.value) : [];
      q.push(rec);
      while (q.length > 50) q.shift();
      await window.storage.set(this.QUEUE_KEY, JSON.stringify(q));
    } catch (e) {}
  },
  flushQueue(){ /* meta katman v1 */ },
};

/* ================= İstatistik (kalıcı) ================= */
const STATS_KEY = 'matpatlatma_stats';
let STATS = { plays: 0, chains: 0, tiles: 0, longest: 0, best: { 1: 0, 2: 0, 3: 0, 4: 0 } };
function loadStats(){
  try { window.storage.get(STATS_KEY).then(r => {
    if (r && r.value){ try { STATS = Object.assign(STATS, JSON.parse(r.value)); } catch (e) {} }
    refreshBestLine();
  }); } catch (e) {}
}
function saveStats(){ try { window.storage.set(STATS_KEY, JSON.stringify(STATS)); } catch (e) {} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const board = $('board'), fx = $('fxCanvas'), fctx = fx.getContext('2d');

const G = {
  state: 'menu', tier: 1,
  N: 7, cell: 50, pad: 6,
  grid: [],                 // grid[c][r] = tile | null
  score: 0, timeLeft: CONFIG.ROUND_SEC, secT: null,
  chains: 0, tilesCleared: 0, longest: 0, boomCount: 0,
  goal: { mode: 'sum', target: 12 },
  chain: [], dragging: false, over: false,
  particles: [], raf: 0,
};
let tileSeq = 0;
const VAL_VARS = ['', 'var(--v1)','var(--v2)','var(--v3)','var(--v4)','var(--v5)','var(--v6)','var(--v7)','var(--v8)','var(--v9)'];

/* ---- yerleşim ---- */
function layout(){
  // Izgara boyutu yalnız tur BAŞINDA seçilir: oyun sürerken eşik (480 px) geçilirse G.N değişip
  // G.grid ile uyuşmazdı (6×6 veri, 7×7 sınır → tryExtend/applyGravity undefined hatası, tahta donar)
  if (G.state !== 'playing' || !G.grid || !G.grid.length){
    G.N = innerWidth < CONFIG.MOBILE_BREAK ? CONFIG.GRID_MOBILE : CONFIG.GRID_DESKTOP;
  }
  const wrap = $('boardWrap').getBoundingClientRect();
  const size = Math.min(wrap.width - 16, wrap.height - 16, 560);
  G.cell = Math.floor((size - G.pad * 2) / G.N);
  const bs = G.cell * G.N + G.pad * 2;
  board.style.width = bs + 'px'; board.style.height = bs + 'px';
  fx.width = bs; fx.height = bs;
}
function tileXY(c, r){ return { x: G.pad + c * G.cell, y: G.pad + r * G.cell }; }
function placeTile(t){
  const p = tileXY(t.c, t.r);
  t.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
}

/* ---- taş üretimi ---- */
function makeTile(c, r, fromAbove){
  const t = { id: ++tileSeq, v: rnd(1, 9), c, r, el: document.createElement('div') };
  t.el.className = 'tile';
  t.el.style.width = (G.cell - 6) + 'px';
  t.el.style.height = (G.cell - 6) + 'px';
  t.el.style.fontSize = Math.round(G.cell * 0.46) + 'px';
  t.el.style.background = VAL_VARS[t.v];
  t.el.textContent = t.v;
  if (fromAbove){
    const p = tileXY(c, r - (fromAbove || 0) - 1);
    t.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }
  board.appendChild(t.el);
  if (fromAbove) requestAnimationFrame(() => requestAnimationFrame(() => placeTile(t)));
  else placeTile(t);
  return t;
}
function fillBoard(){
  board.querySelectorAll('.tile').forEach(e => e.remove());
  G.grid = [];
  for (let c = 0; c < G.N; c++){
    G.grid[c] = [];
    for (let r = 0; r < G.N; r++) G.grid[c][r] = makeTile(c, r);
  }
}

/* ---- ÇÖZÜMSÜZLÜK KONTROLÜ (şart — §4.2): her zaman en az 1 geçerli zincir ---- */
function neighbors(c, r){
  const out = [];
  if (c > 0) out.push([c - 1, r]);
  if (c < G.N - 1) out.push([c + 1, r]);
  if (r > 0) out.push([c, r - 1]);
  if (r < G.N - 1) out.push([c, r + 1]);
  return out;
}
function hasValidChain(goal){
  const { mode, target } = goal;
  if (mode === 'diff'){
    for (let c = 0; c < G.N; c++) for (let r = 0; r < G.N; r++){
      const a = G.grid[c][r]; if (!a) continue;
      if (c < G.N - 1 && G.grid[c + 1][r] && Math.abs(a.v - G.grid[c + 1][r].v) === target) return true;
      if (r < G.N - 1 && G.grid[c][r + 1] && Math.abs(a.v - G.grid[c][r + 1].v) === target) return true;
    }
    return false;
  }
  const seen = new Set();
  const key = (c, r) => c * 16 + r;
  function dfs(c, r, acc, len){
    for (const [nc, nr] of neighbors(c, r)){
      const t = G.grid[nc][nr];
      if (!t || seen.has(key(nc, nr))) continue;
      const na = mode === 'sum' ? acc + t.v : acc * t.v;
      if (na === target && len + 1 >= CONFIG.MIN_CHAIN) return true;
      const goOn = mode === 'sum' ? na < target : (na < target && target % na === 0);
      if (goOn && len < 12){
        seen.add(key(nc, nr));
        if (dfs(nc, nr, na, len + 1)) { seen.delete(key(nc, nr)); return true; }
        seen.delete(key(nc, nr));
      }
    }
    return false;
  }
  for (let c = 0; c < G.N; c++) for (let r = 0; r < G.N; r++){
    const t = G.grid[c][r]; if (!t) continue;
    if (mode === 'prod' && target % t.v !== 0 && t.v !== target) continue;
    seen.clear(); seen.add(key(c, r));
    if (dfs(c, r, t.v, 1)) return true;
  }
  return false;
}
function shuffleBoard(){
  // mevcut değerleri Fisher-Yates ile yeniden dağıt (taş sayısı korunur)
  const vals = [];
  for (let c = 0; c < G.N; c++) for (let r = 0; r < G.N; r++) if (G.grid[c][r]) vals.push(G.grid[c][r].v);
  for (let i = vals.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
  let i = 0;
  for (let c = 0; c < G.N; c++) for (let r = 0; r < G.N; r++){
    const t = G.grid[c][r]; if (!t) continue;
    t.v = vals[i++]; t.el.textContent = t.v; t.el.style.background = VAL_VARS[t.v];
  }
  const st = $('shuffleToast');
  st.style.display = 'block';
  setTimeout(() => st.style.display = 'none', 1100);
}
function ensureSolvable(){
  if (hasValidChain(G.goal)) return;
  // 1) yeni hedef dene (10 deneme)
  for (let i = 0; i < 10; i++){
    const g = CONFIG.TIERS[G.tier]();
    if (hasValidChain(g)){ setGoal(g, true); return; }
  }
  // 2) taşları karıştır (gerekirse birkaç kez), hedefi yeniden çek
  for (let i = 0; i < 6; i++){
    shuffleBoard();
    const g = CONFIG.TIERS[G.tier]();
    if (hasValidChain(g)){ setGoal(g, true); return; }
    if (hasValidChain(G.goal)) return;
  }
  // 3) son çare: tahtayı yeniden doldur
  fillBoard();
}

/* ---- hedef ---- */
function setGoal(g, silent){
  G.goal = g;
  const s = g.mode === 'sum' ? STRINGS.modeSum : g.mode === 'diff' ? STRINGS.modeDiff : STRINGS.modeProd;
  $('targetLabel').textContent = s.pre;
  $('targetLabel2').textContent = s.post;
  $('targetNum').textContent = g.target;
  $('targetNum').classList.remove('boom'); void $('targetNum').offsetWidth; $('targetNum').classList.add('boom');
  if (!silent) Audio2.newTarget();
}
function newGoal(){
  for (let i = 0; i < 14; i++){
    const g = CONFIG.TIERS[G.tier]();
    if (hasValidChain(g)){ setGoal(g); return; }
  }
  setGoal(CONFIG.TIERS[G.tier]());
  ensureSolvable();
}

/* ---- zincir etkileşimi ---- */
function cellFromEvent(e){
  const rect = board.getBoundingClientRect();
  const x = e.clientX - rect.left - G.pad, y = e.clientY - rect.top - G.pad;
  const c = Math.floor(x / G.cell), r = Math.floor(y / G.cell);
  if (c < 0 || c >= G.N || r < 0 || r >= G.N) return null;
  // merkez eşiği: hücrenin orta %72'si — köşe kesmelerini önler
  const cx = (x % G.cell) / G.cell, cy = (y % G.cell) / G.cell;
  if (cx < 0.14 || cx > 0.86 || cy < 0.14 || cy > 0.86) return null;
  return { c, r };
}
function chainValue(){
  if (!G.chain.length) return 0;
  if (G.goal.mode === 'prod') return G.chain.reduce((p, t) => p * t.v, 1);
  return G.chain.reduce((s, t) => s + t.v, 0);   // sum (diff için ayrı gösterim)
}
function refreshAcc(){
  const el = $('accLine');
  if (!G.chain.length){ el.innerHTML = '&nbsp;'; el.classList.remove('over'); return; }
  const m = G.goal.mode;
  if (m === 'diff'){
    el.textContent = G.chain.length === 1 ? `${G.chain[0].v} seçildi — komşusunu seç`
      : `|${G.chain[0].v} − ${G.chain[1].v}| = ${Math.abs(G.chain[0].v - G.chain[1].v)}`;
    el.classList.remove('over');
    return;
  }
  const v = chainValue(), sym = m === 'prod' ? '×' : '+';
  el.textContent = G.chain.map(t => t.v).join(` ${sym} `) + ` = ${v} / ${G.goal.target}`;
  el.classList.toggle('over', v > G.goal.target);
}
function clearChain(){
  G.chain.forEach(t => t.el.classList.remove('sel'));
  G.chain = [];
  refreshAcc(); drawChainLine();
}
function tryExtend(c, r){
  const t = G.grid[c][r];
  if (!t) return;
  // geri alma: bir önceki taşa dönüldü
  if (G.chain.length >= 2 && G.chain[G.chain.length - 2] === t){
    const last = G.chain.pop();
    last.el.classList.remove('sel');
    Audio2.unpick(); refreshAcc(); drawChainLine();
    return;
  }
  if (G.chain.includes(t)) return;
  if (G.chain.length){
    const last = G.chain[G.chain.length - 1];
    if (Math.abs(last.c - c) + Math.abs(last.r - r) !== 1) return;   // sadece komşu
    if (G.goal.mode === 'diff' && G.chain.length >= 2) return;       // fark = tam iki taş
  }
  G.chain.push(t);
  t.el.classList.add('sel');
  Audio2.pick(G.chain.length);
  refreshAcc(); drawChainLine();
  evaluateChain();
}
function evaluateChain(){
  const m = G.goal.mode, T = G.goal.target;
  if (m === 'diff'){
    if (G.chain.length === 2){
      if (Math.abs(G.chain[0].v - G.chain[1].v) === T) explodeChain();
      else { invalidFlash(); }
    }
    return;
  }
  const v = chainValue();
  if (v === T && G.chain.length >= CONFIG.MIN_CHAIN) explodeChain();
  else if (m === 'prod' && (v > T || (T % v !== 0 && v !== T))) { /* kırmızı göstergeyle sürsün — bırakınca temizlenir */ }
}
function invalidFlash(){
  Audio2.bad();
  G.chain.forEach(t => { t.el.style.filter = 'grayscale(.6) brightness(.8)'; });
  const old = [...G.chain];
  setTimeout(() => { old.forEach(t => t.el.style.filter = ''); }, 240);
  clearChain();
  G.dragging = false;
}

/* ---- patlatma + yerçekimi + doldurma ---- */
function explodeChain(){
  const n = G.chain.length;
  const pts = CONFIG.CHAIN_POINT(n);
  G.score += pts;
  G.chains++; G.tilesCleared += n; G.boomCount++;
  if (n > G.longest) G.longest = n;
  Audio2.boom(n);
  // parçacık + skor yazısı
  let cx = 0, cy = 0;
  G.chain.forEach(t => {
    const p = tileXY(t.c, t.r);
    cx += p.x + G.cell / 2; cy += p.y + G.cell / 2;
    burst(p.x + G.cell / 2, p.y + G.cell / 2, t.v);
    t.el.classList.add('pop');
    setTimeout(() => t.el.remove(), 200);
    G.grid[t.c][t.r] = null;
  });
  floatText('+' + pts, cx / n, cy / n);
  G.chain = []; refreshAcc(); drawChainLine();
  G.dragging = false;
  // yerçekimi + doldurma
  setTimeout(() => {
    applyGravity();
    // hedef yenileme: her 3 patlatmada bir (§4.2)
    if (G.boomCount % CONFIG.TARGET_EVERY === 0) newGoal();
    ensureSolvable();
    refreshHUD();
  }, 120);
  refreshHUD();
}
function applyGravity(){
  for (let c = 0; c < G.N; c++){
    let write = G.N - 1, fallen = 0;
    for (let r = G.N - 1; r >= 0; r--){
      const t = G.grid[c][r];
      if (!t) continue;
      if (r !== write){
        G.grid[c][write] = t; G.grid[c][r] = null;
        t.r = write; placeTile(t);
      }
      write--;
    }
    let spawn = 0;
    for (let r = write; r >= 0; r--){
      spawn++;
      G.grid[c][r] = makeTile(c, r, spawn);
    }
  }
}

/* ---- efektler (canvas particle pool — §4.2 geliştirme notu) ---- */
function burst(x, y, v){
  for (let i = 0; i < 12; i++){
    const a = Math.random() * Math.PI * 2, sp = 70 + Math.random() * 180;
    G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, life: 0.6, v });
  }
}
const floats = [];
function floatText(txt, x, y){ floats.push({ txt, x, y, life: 1 }); }
const VAL_HEX = ['', '#ef5777','#f3a04d','#ffd23f','#7bd960','#37c8ab','#4aa8ff','#8a7bff','#d36bff','#ff6bc4'];
function drawChainLine(){
  fctx.clearRect(0, 0, fx.width, fx.height);
  if (G.chain.length >= 2){
    fctx.beginPath();
    G.chain.forEach((t, i) => {
      const p = tileXY(t.c, t.r);
      const x = p.x + G.cell / 2, y = p.y + G.cell / 2;
      i ? fctx.lineTo(x, y) : fctx.moveTo(x, y);
    });
    fctx.lineWidth = 7; fctx.lineCap = 'round'; fctx.lineJoin = 'round';
    fctx.strokeStyle = 'rgba(255,255,255,0.55)';
    fctx.stroke();
  }
}
function fxLoop(ts){
  if (G.state !== 'playing' && !G.particles.length && !floats.length){ G.raf = 0; drawChainLine(); return; }
  drawChainLine();
  const dt = 0.016;
  for (const p of G.particles){
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 380 * dt; p.life -= dt;
    fctx.globalAlpha = Math.max(0, p.life / 0.6);
    fctx.fillStyle = VAL_HEX[p.v];
    fctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }
  G.particles = G.particles.filter(p => p.life > 0);
  fctx.globalAlpha = 1; fctx.textAlign = 'center'; fctx.font = '900 26px system-ui';
  for (const f of floats){
    f.y -= 0.7; f.life -= 0.016;
    fctx.globalAlpha = Math.max(0, f.life);
    fctx.fillStyle = '#ffd23f';
    fctx.fillText(f.txt, f.x, f.y);
  }
  fctx.globalAlpha = 1;
  for (let i = floats.length - 1; i >= 0; i--) if (floats[i].life <= 0) floats.splice(i, 1);
  G.raf = requestAnimationFrame(fxLoop);
}
function kickFx(){ if (!G.raf) G.raf = requestAnimationFrame(fxLoop); }

/* ---- pointer ---- */
board.addEventListener('pointerdown', e => {
  if (G.state !== 'playing') return;
  Audio2.init();
  const c = cellFromEvent(e);
  if (!c) return;
  G.dragging = true;
  clearChain();
  tryExtend(c.c, c.r);
  board.setPointerCapture(e.pointerId);
});
board.addEventListener('pointermove', e => {
  if (!G.dragging || G.state !== 'playing') return;
  const c = cellFromEvent(e);
  if (c) tryExtend(c.c, c.r);
});
function endDrag(){
  if (!G.dragging) return;
  G.dragging = false;
  clearChain();   // hedefe TAM ulaşmadan bırakıldı — ceza yok, sadece temizlenir
}
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', endDrag);

/* ---- HUD + akış ---- */
function refreshHUD(){
  $('scoreChip').textContent = '⭐ ' + G.score;
  $('timeChip').textContent = '⏱️ ' + Math.max(0, G.timeLeft);
  $('timeChip').classList.toggle('low', G.timeLeft <= 10);
  $('chainChip').textContent = '🔗 ' + G.chains;
}
function show(id){ document.querySelectorAll('.screen').forEach(s => s.classList.remove('show')); $(id).classList.add('show'); }

function startRound(){
  G.state = 'playing';
  G.score = 0; G.timeLeft = CONFIG.ROUND_SEC;
  G.chains = 0; G.tilesCleared = 0; G.longest = 0; G.boomCount = 0;
  G.chain = []; G.particles = []; G.dragging = false;
  show('screen-game');
  G.grid = [];         // yeni tur: layout() ızgara boyutunu yeniden seçebilsin
  layout(); fillBoard();
  newGoal(); ensureSolvable();
  refreshHUD(); refreshAcc();
  clearInterval(G.secT);
  G.secT = setInterval(() => {
    if (G.state !== 'playing') return;
    G.timeLeft--;
    if (G.timeLeft <= 5 && G.timeLeft > 0) Audio2.tick();
    refreshHUD();
    if (G.timeLeft <= 0) endRound();
  }, 1000);
  kickFx();
}

function endRound(){
  G.state = 'result';
  clearInterval(G.secT);
  clearChain();
  STATS.plays++; STATS.chains += G.chains; STATS.tiles += G.tilesCleared;
  if (G.longest > STATS.longest) STATS.longest = G.longest;
  const isBest = G.score > (STATS.best[G.tier] || 0);
  if (isBest) STATS.best[G.tier] = G.score;
  saveStats();
  BilnetBridge.submitScore({
    gameId: 'matematik-patlatma', score: G.score, tier: G.tier,
    stats: { chains: G.chains, tilesCleared: G.tilesCleared, longestChain: G.longest },
  });
  $('resEmoji').textContent = isBest ? '🏆' : (G.chains >= 8 ? '🥇' : '🧨');
  $('resScore').textContent = G.score;
  $('resStats').innerHTML =
    `🔗 Zincir: <b>${G.chains}</b> &nbsp;·&nbsp; 🧱 Patlayan taş: <b>${G.tilesCleared}</b><br>` +
    `📏 En uzun zincir: <b>${G.longest}</b> taş (${CONFIG.CHAIN_POINT(G.longest) || 0} puan!)` +
    (isBest ? `<br>🏅 <b>YENİ ${['', 'ETEK', 'YAMAÇ', 'TIRMANIŞ', 'ZİRVE'][G.tier]} REKORU!</b>` : '');
  $('eduLine').textContent = G.chains > 0 ? STRINGS.edu(G.chains, G.tilesCleared) : STRINGS.eduZero;
  if (G.chains >= 5) Audio2.fanfare();
  show('screen-result');
  refreshBestLine();
}
function refreshBestLine(){
  const b = STATS.best[G.tier] || 0;
  $('bestLine').textContent = b > 0 ? STRINGS.best(G.tier, b) : '';
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
function pauseGame(){
  if (G.state !== 'playing') return;
  G.state = 'paused';
  $('pauseVeil').classList.add('show');
}
function resumeGame(){
  if (G.state !== 'paused') return;
  G.state = 'playing';
  $('pauseVeil').classList.remove('show');
  kickFx();
}
$('bPause').addEventListener('click', pauseGame);
$('bResume').addEventListener('click', resumeGame);
$('bQuit').addEventListener('click', () => {
  $('pauseVeil').classList.remove('show');
  clearInterval(G.secT);
  G.state = 'menu'; show('screen-menu'); refreshBestLine();
});
EduKit.onHidden(() => {
  if (G.state === 'playing'){ pauseGame(); saveStats(); }   // teneffüs güvencesi
});   // gizlenince duraklat, pagehide'da da kaydet
addEventListener('keydown', e => { if ((e.code === 'KeyP' || e.code === 'Escape') && G.state === 'playing') pauseGame(); });
addEventListener('resize', () => { if (G.state === 'playing'){ layout(); G.grid.flat().forEach(t => { if (t){ t.el.style.width = (G.cell-6)+'px'; t.el.style.height = (G.cell-6)+'px'; t.el.style.fontSize = Math.round(G.cell*0.46)+'px'; placeTile(t); } }); drawChainLine(); } });

/* ---- başlat ---- */
loadStats();
