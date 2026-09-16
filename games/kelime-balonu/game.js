"use strict";
/* ================= STRINGS ================= */
const STRINGS = {
  overflow: '🎈 Balonlar sınıra ulaştı!',
  wordDone: w => `🎉 ${w.toUpperCase()}!`,
  edu: (n) => `Bugün ${n} İngilizce kelime tamamladın! 🎉`,
  eduZero: 'Balonlar seni bekliyor — bir dahaki turda patlat! 💪',
  best: (t, s) => `🏅 ${['','Etek','Yamaç','Tırmanış','Zirve'][t]} rekorun: ${s}`,
};

/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.3 — aynen) ================= */
const CONFIG = {
  ROUND_SEC: 120,
  WORD_POINT: (len, tier) => len * 30 * tier,   // kelime tamamlama puanı: uzunluk × 30 × tier
  ORDERED: { 1: false, 2: false, 3: true, 4: true },   // sıra zorunluluğu Tırmanış+
  SHOW_EMOJI: { 1: true, 2: true, 3: true, 4: false }, // Zirve: resim yok, sadece TR
  COLS: 8,                 // hex grid: çift satır 8, tek satır 7 balon
  INIT_ROWS: { 1: 3, 2: 4, 3: 4, 4: 4 },   // Etek'te daha ferah başlangıç
  PROJ_SPEED: 920,         // px/sn
  FALL_BONUS_LIMIT: 40,
};
const { randInt: rnd, pick, shuffle } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)

/* ================= KELİME BANKASI (EN-TR-emoji; pair_match) ================= */
const WORDS = {
  1: [ // 3 harf
    ['cat','kedi','🐱'],['dog','köpek','🐶'],['sun','güneş','☀️'],['bee','arı','🐝'],
    ['car','araba','🚗'],['bus','otobüs','🚌'],['egg','yumurta','🥚'],['fox','tilki','🦊'],
    ['owl','baykuş','🦉'],['ant','karınca','🐜'],['cow','inek','🐮'],['hat','şapka','🎩'],
    ['key','anahtar','🔑'],['map','harita','🗺️'],['pen','kalem','🖊️'],['box','kutu','📦'],
    ['cup','fincan','☕'],['bed','yatak','🛏️'],['ice','buz','🧊'],['eye','göz','👁️'],
    ['ear','kulak','👂'],['arm','kol','💪'],['leg','bacak','🦵'],['bag','çanta','🎒'],
    ['sea','deniz','🌊'],['toy','oyuncak','🧸'],
  ],
  2: [ // 4-5 harf
    ['fish','balık','🐟'],['bird','kuş','🐦'],['lion','aslan','🦁'],['frog','kurbağa','🐸'],
    ['star','yıldız','⭐'],['moon','ay','🌙'],['tree','ağaç','🌳'],['book','kitap','📖'],
    ['milk','süt','🥛'],['cake','pasta','🎂'],['apple','elma','🍎'],['horse','at','🐴'],
    ['mouse','fare','🐭'],['house','ev','🏠'],['bread','ekmek','🍞'],['water','su','💧'],
    ['train','tren','🚆'],['plane','uçak','✈️'],['chair','sandalye','🪑'],['clock','saat','🕐'],
    ['heart','kalp','❤️'],['snake','yılan','🐍'],['sheep','koyun','🐑'],['tiger','kaplan','🐯'],
    ['queen','kraliçe','👑'],['shoe','ayakkabı','👟'],['ship','gemi','🚢'],['door','kapı','🚪'],
    ['ring','yüzük','💍'],['rain','yağmur','🌧️'],
  ],
  3: [ // 6+ harf, sıralı
    ['orange','portakal','🍊'],['banana','muz','🍌'],['monkey','maymun','🐵'],['rabbit','tavşan','🐰'],
    ['flower','çiçek','🌸'],['school','okul','🏫'],['window','pencere','🪟'],['garden','bahçe','🌷'],
    ['cheese','peynir','🧀'],['chicken','tavuk','🐔'],['turtle','kaplumbağa','🐢'],['spider','örümcek','🕷️'],
    ['winter','kış','❄️'],['pencil','kurşun kalem','✏️'],['yellow','sarı','💛'],['purple','mor','💜'],
    ['dragon','ejderha','🐉'],['doctor','doktor','🩺'],['father','baba','👨'],['mother','anne','👩'],
    ['bridge','köprü','🌉'],['candle','mum','🕯️'],['planet','gezegen','🪐'],['rocket','roket','🚀'],
    ['guitar','gitar','🎸'],['button','düğme','🔘'],
  ],
};
// Zirve: 5-8 harf karışık (resim gösterilmez — sadece TR karşılık, çeviri bilgisi)
WORDS[4] = WORDS[3].concat([
  ['teacher','öğretmen','👩‍🏫'],['student','öğrenci','🎓'],['kitchen','mutfak','🍳'],['morning','sabah','🌅'],
  ['animal','hayvan','🐾'],['picture','resim','🖼️'],['castle','kale','🏰'],['family','aile','👨‍👩‍👧'],
  ['summer','yaz','🏖️'],['market','pazar','🛒'],['breakfast','kahvaltı','🥐'],['mountain','dağ','⛰️'],
]);

/* ================= Audio (Web Audio sentez) ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return {
    init,
    shoot: () => tone(420, 0.1, 'square', 0.04),
    pop: n => { for (let i = 0; i < Math.min(n, 5); i++) tone(560 + i * 110, 0.09, 'triangle', 0.06, i * 0.05); },
    stick: () => tone(170, 0.18, 'sawtooth', 0.05),
    fall: () => { tone(700, 0.07, 'triangle', 0.04); tone(500, 0.09, 'triangle', 0.04, 0.07); },
    word: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, 'triangle', 0.07, i * 0.1)),
    tick: () => tone(840, 0.05, 'square', 0.03),
    over: () => { tone(300, 0.25, 'sawtooth', 0.06); tone(220, 0.3, 'sawtooth', 0.06, 0.2); },
    fanfare: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, i * 0.12)),
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
      q.push(rec);
      while (q.length > 50) q.shift();
      await window.storage.set(this.QUEUE_KEY, JSON.stringify(q));
    } catch (e) {}
  },
  flushQueue(){ /* meta katman v1 */ },
};

/* ================= İstatistik ================= */
const STATS_KEY = 'kelimebalonu_stats';
let STATS = { plays: 0, words: 0, bubbles: 0, best: { 1: 0, 2: 0, 3: 0, 4: 0 } };
function loadStats(){
  try { window.storage.get(STATS_KEY).then(r => {
    if (r && r.value){ try { STATS = Object.assign(STATS, JSON.parse(r.value)); } catch (e) {} }
    refreshBestLine();
  }); } catch (e) {}
}
function saveStats(){ try { window.storage.set(STATS_KEY, JSON.stringify(STATS)); } catch (e) {} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx2 = cv.getContext('2d');
const LETTER_HUE = L => (L.charCodeAt(0) * 47) % 360;

const G = {
  state: 'menu', tier: 1,
  score: 0, timeLeft: CONFIG.ROUND_SEC, secT: null,
  words: 0, bubblesPopped: 0, doneWords: [],
  pool: [], word: null, remaining: [], progress: 0,
  cells: new Map(),          // "c,r" -> {c, r, L}
  D: 44, padX: 6, topPad: 8,
  proj: null, aim: { x: 0, y: -1, active: false },
  particles: [], fallers: [], floats: [],
  raf: 0, lastTs: 0, shotsResolved: true,
};

/* ---- hex grid yardımcıları (odd-r offset: tek satırlar yarım sağa) ---- */
const ckey = (c, r) => c + ',' + r;
function rowCols(r){ return r % 2 ? CONFIG.COLS - 1 : CONFIG.COLS; }
function cellXY(c, r){
  return {
    x: G.padX + G.D / 2 + c * G.D + (r % 2 ? G.D / 2 : 0),
    y: G.topPad + G.D / 2 + r * G.D * 0.866,
  };
}
function neighborsOf(c, r){
  const odd = r % 2;
  const dirs = odd
    ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]
    : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
  const out = [];
  for (const [dc, dr] of dirs){
    const nc = c + dc, nr = r + dr;
    if (nr < 0 || nc < 0 || nc >= rowCols(nr)) continue;
    out.push([nc, nr]);
  }
  return out;
}

/* ---- yerleşim ---- */
function layout(){
  const bar = $('topBar').getBoundingClientRect();
  cv.width = innerWidth;
  cv.height = Math.max(300, innerHeight - bar.height);
  G.D = Math.min(Math.floor((cv.width - 12) / CONFIG.COLS), 54);
  G.padX = Math.floor((cv.width - (CONFIG.COLS * G.D)) / 2);
}
function shooterPos(){ return { x: cv.width / 2, y: cv.height - 64 }; }
function dangerY(){ return cv.height - 150; }

/* ---- balon üretimi / kelime ---- */
function randLetter(){ return String.fromCharCode(65 + rnd(0, 25)); }
function fillInitial(){
  G.cells.clear();
  for (let r = 0; r < CONFIG.INIT_ROWS[G.tier]; r++)
    for (let c = 0; c < rowCols(r); c++)
      G.cells.set(ckey(c, r), { c, r, L: randLetter() });
}
function newWord(){
  if (!G.pool.length) G.pool = shuffle(WORDS[G.tier].slice());
  const [en, tr, emoji] = G.pool.pop();
  G.word = { en: en.toUpperCase(), tr, emoji };
  G.remaining = G.word.en.split('');     // sırasızda multiset, sıralıda kuyruk
  G.progress = 0;
  $('wordEmoji').textContent = CONFIG.SHOW_EMOJI[G.tier] ? emoji : '❓';
  $('wordTr').textContent = tr;
  renderSlots();
  ensureLetters();
}
function renderSlots(){
  const el = $('slots');
  el.innerHTML = '';
  const ordered = CONFIG.ORDERED[G.tier];
  G.word.en.split('').forEach((L, i) => {
    const s = document.createElement('div');
    s.className = 'slot';
    if (i < G.progress){ s.classList.add('fill'); s.textContent = L; }
    else if (ordered && i === G.progress) s.classList.add('next');
    el.appendChild(s);
  });
}
function neededLetters(){
  if (CONFIG.ORDERED[G.tier]) return G.progress < G.word.en.length ? [G.word.en[G.progress]] : [];
  return [...new Set(G.remaining)];
}
/* VURULABİLİRLİK: balon, yanında/altında boş hücre varsa mermiyle ulaşılabilir.
   (Mermi alttan gelir — gömülü balona çarpamaz.) */
function isHittable(b){
  for (const [nc, nr] of neighborsOf(b.c, b.r))
    if (nr >= b.r && !G.cells.has(ckey(nc, nr))) return true;
  // kendi sütununun en altındaki balon her zaman açıktır
  for (let r = b.r + 1; r < b.r + 2; r++) if (!G.cells.has(ckey(b.c, r))) return true;
  return false;
}
/* Çözülebilirlik garantisi v2: gereken her harf VURULABİLİR yüzeyde olmalı —
   sadece var olması yetmez (gömülü harf = imkânsız atış). Yoksa alt yüzeydeki
   bir çeldirici balon o harfe yeniden etiketlenir. */
function ensureLetters(){
  const needs = neededLetters();
  if (!needs.length) return;
  const live = [...G.cells.values()];
  if (!live.length){ pushRow(); pushRow(); return ensureLetters(); }
  const hittables = live.filter(isHittable)
    .sort((a, b) => cellXY(b.c, b.r).y - cellXY(a.c, a.r).y);   // en alttakiler önce
  for (const L of needs){
    if (hittables.some(b => b.L === L)) continue;   // zaten vurulabilir yüzeyde
    // alt yüzeyden bir çeldirici seç (gereken başka harfi bozma), en ulaşılabilir 8 içinden
    const cands = hittables.filter(b => !needs.includes(b.L));
    const target = cands.length ? pick(cands.slice(0, 8)) : (hittables[0] || pick(live));
    if (target) target.L = L;
  }
}

/* ---- satır itme (kelime tamamlanınca tavandan yeni satır) ---- */
function pushRow(){
  const moved = [...G.cells.values()];
  G.cells.clear();
  for (const b of moved){
    b.r += 1;
    // satır paritesi değişti — kolon sınırını aşan kenar balonu içeri al
    if (b.c >= rowCols(b.r)) b.c = rowCols(b.r) - 1;
    const k = ckey(b.c, b.r);
    if (!G.cells.has(k)) G.cells.set(k, b);
  }
  for (let c = 0; c < rowCols(0); c++) G.cells.set(ckey(c, 0), { c, r: 0, L: randLetter() });
  checkDanger();
}

/* ---- tehlike sınırı ---- */
function lowestBubbleY(){
  let y = 0;
  for (const b of G.cells.values()) y = Math.max(y, cellXY(b.c, b.r).y + G.D / 2);
  return y;
}
function checkDanger(){
  if (G.state === 'playing' && lowestBubbleY() > dangerY()) endRound('overflow');
}

/* ---- fırlatma ---- */
function fire(){
  if (G.state !== 'playing' || G.proj || !G.shotsResolved) return;
  const s = shooterPos();
  let dx = G.aim.x - s.x, dy = G.aim.y - s.y;
  if (dy > -20) dy = -20;
  const L = Math.hypot(dx, dy);
  G.proj = { x: s.x, y: s.y, vx: dx / L * CONFIG.PROJ_SPEED, vy: dy / L * CONFIG.PROJ_SPEED };
  G.shotsResolved = false;
  Audio2.shoot();
}
function updateProj(dt){
  const p = G.proj;
  if (!p) return;
  p.x += p.vx * dt; p.y += p.vy * dt;
  const R = G.D / 2 - 2;
  if (p.x < R){ p.x = R; p.vx = -p.vx; }
  if (p.x > cv.width - R){ p.x = cv.width - R; p.vx = -p.vx; }
  // tavana ulaştı → yapış (yanlış sayılır: klasik ceza)
  if (p.y < G.topPad + R){ stickProj(null); return; }
  // küme teması
  for (const b of G.cells.values()){
    const q = cellXY(b.c, b.r);
    const d2 = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d2 < (G.D * 0.86) ** 2){ hitBubble(b); return; }
  }
}
function hitBubble(b){
  const needs = neededLetters();
  if (needs.includes(b.L)) popCorrect(b);
  else stickProj(b);
}

/* ---- doğru: patlat (+ komşu aynı harfler), kopanlar düşer, harfi topla ---- */
function popCorrect(hit){
  const L = hit.L;
  // flood: aynı harfli komşu grubu
  const group = new Set([ckey(hit.c, hit.r)]);
  const stack = [hit];
  while (stack.length){
    const b = stack.pop();
    for (const [nc, nr] of neighborsOf(b.c, b.r)){
      const k = ckey(nc, nr);
      const nb = G.cells.get(k);
      if (nb && nb.L === L && !group.has(k)){ group.add(k); stack.push(nb); }
    }
  }
  for (const k of group){
    const b = G.cells.get(k);
    burstAt(cellXY(b.c, b.r), b.L);
    G.cells.delete(k);
  }
  G.bubblesPopped += group.size;
  Audio2.pop(group.size);
  dropFloating();
  G.proj = null; G.shotsResolved = true;
  collectLetter(L);
}
function collectLetter(L){
  if (CONFIG.ORDERED[G.tier]) G.progress++;
  else {
    const i = G.remaining.indexOf(L);
    if (i >= 0) G.remaining.splice(i, 1);
    G.progress = G.word.en.length - G.remaining.length;
  }
  renderSlots();
  if (G.progress >= G.word.en.length) wordComplete();
  else ensureLetters();
}
function wordComplete(){
  const pts = CONFIG.WORD_POINT(G.word.en.length, G.tier);   // uzunluk × 30 × tier (§4.3)
  G.score += pts;
  G.words++;
  G.doneWords.push([G.word.en, G.word.tr]);
  floatText(STRINGS.wordDone(G.word.en) + '  +' + pts, cv.width / 2, cv.height * 0.32);
  Audio2.word();
  // büyük patlama hissi: ekrandaki tüm balonlardan minik konfeti
  let n = 0;
  for (const b of G.cells.values()){ if (n++ % 3 === 0) burstAt(cellXY(b.c, b.r), b.L, 4); }
  pushRow();             // yeni satır tavandan iner — yoğunluk korunur
  refreshHUD();
  newWord();
}
/* tavandan kopanlar düşer */
function dropFloating(){
  const reach = new Set();
  const stack = [];
  for (const b of G.cells.values()) if (b.r === 0){ reach.add(ckey(b.c, b.r)); stack.push(b); }
  while (stack.length){
    const b = stack.pop();
    for (const [nc, nr] of neighborsOf(b.c, b.r)){
      const k = ckey(nc, nr);
      const nb = G.cells.get(k);
      if (nb && !reach.has(k)){ reach.add(k); stack.push(nb); }
    }
  }
  const fell = [];
  for (const [k, b] of [...G.cells]){
    if (!reach.has(k)){
      const p = cellXY(b.c, b.r);
      fell.push({ x: p.x, y: p.y, vy: -60, L: b.L });
      G.cells.delete(k);
    }
  }
  if (fell.length){
    G.fallers.push(...fell.slice(0, CONFIG.FALL_BONUS_LIMIT));
    G.bubblesPopped += fell.length;
    Audio2.fall();
  }
}

/* ---- yanlış: fırlatılan balon kümeye yapışır (klasik ceza) ---- */
function stickProj(contact){
  const p = G.proj;
  // aday hücreler: temas balonunun boş komşuları; tavan vuruşunda 0. satır
  let candidates = [];
  if (contact){
    for (const [nc, nr] of neighborsOf(contact.c, contact.r))
      if (!G.cells.has(ckey(nc, nr))) candidates.push([nc, nr]);
  }
  if (!candidates.length){
    const r = 0;
    for (let c = 0; c < rowCols(r); c++) if (!G.cells.has(ckey(c, r))) candidates.push([c, r]);
  }
  if (!candidates.length){ G.proj = null; G.shotsResolved = true; return; }
  let bestC = candidates[0], bestD = Infinity;
  for (const [c, r] of candidates){
    const q = cellXY(c, r);
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < bestD){ bestD = d; bestC = [c, r]; }
  }
  // yapışan balon rastgele çeldirici harf alır (gereken harf OLMASIN — haksız ödül engellenir)
  const needs = neededLetters();
  let L = randLetter(), guard = 0;
  while (needs.includes(L) && guard++ < 20) L = randLetter();
  G.cells.set(ckey(bestC[0], bestC[1]), { c: bestC[0], r: bestC[1], L });
  Audio2.stick();
  shakeWord();
  G.proj = null; G.shotsResolved = true;
  checkDanger();
  ensureLetters();
}
function shakeWord(){
  const el = $('wordRow');
  el.style.transition = 'transform .08s';
  el.style.transform = 'translateX(-6px)';
  setTimeout(() => el.style.transform = 'translateX(6px)', 80);
  setTimeout(() => el.style.transform = '', 160);
}

/* ---- efektler ---- */
function burstAt(p, L, n){
  const hue = LETTER_HUE(L);
  for (let i = 0; i < (n || 10); i++){
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 170;
    G.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.6, hue });
  }
}
function floatText(txt, x, y){ G.floats.push({ txt, x, y, life: 1.3 }); }

/* ---- çizim ---- */
function drawBubble(x, y, L, alpha){
  const R = G.D / 2 - 2;
  const hue = LETTER_HUE(L);
  ctx2.globalAlpha = alpha == null ? 1 : alpha;
  const g = ctx2.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.2, x, y, R);
  g.addColorStop(0, `hsl(${hue} 85% 76%)`);
  g.addColorStop(1, `hsl(${hue} 70% 52%)`);
  ctx2.beginPath(); ctx2.arc(x, y, R, 0, 7);
  ctx2.fillStyle = g; ctx2.fill();
  ctx2.lineWidth = 2; ctx2.strokeStyle = `hsl(${hue} 60% 38%)`; ctx2.stroke();
  // parlama
  ctx2.beginPath(); ctx2.arc(x - R * 0.35, y - R * 0.42, R * 0.22, 0, 7);
  ctx2.fillStyle = 'rgba(255,255,255,.55)'; ctx2.fill();
  ctx2.fillStyle = '#fff';
  ctx2.font = `900 ${Math.round(R * 1.02)}px system-ui`;
  ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
  ctx2.strokeStyle = `hsl(${hue} 60% 30%)`; ctx2.lineWidth = 3;
  ctx2.strokeText(L, x, y + 1);
  ctx2.fillText(L, x, y + 1);
  ctx2.textBaseline = 'alphabetic';
  ctx2.globalAlpha = 1;
}
function draw(){
  ctx2.clearRect(0, 0, cv.width, cv.height);
  // tehlike sınırı
  const dy = dangerY();
  ctx2.setLineDash([10, 8]);
  ctx2.beginPath(); ctx2.moveTo(0, dy); ctx2.lineTo(cv.width, dy);
  ctx2.strokeStyle = 'rgba(220,60,60,.55)'; ctx2.lineWidth = 2.5; ctx2.stroke();
  ctx2.setLineDash([]);
  // küme — gereken harfler altın halkayla vurgulanır ("hangi harfi arıyorum?" sorunu çözülür)
  const needsNow = G.state === 'playing' ? neededLetters() : [];
  const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 280);
  for (const b of G.cells.values()){
    const p = cellXY(b.c, b.r);
    drawBubble(p.x, p.y, b.L);
    if (needsNow.includes(b.L)){
      ctx2.beginPath(); ctx2.arc(p.x, p.y, G.D / 2 + 2.5, 0, 7);
      ctx2.strokeStyle = `rgba(255,210,63,${(0.45 + 0.5 * pulse).toFixed(2)})`;
      ctx2.lineWidth = 3.5; ctx2.stroke();
    }
  }
  // düşenler
  for (const f of G.fallers) drawBubble(f.x, f.y, f.L, 0.9);
  // nişan çizgisi (1 sekme önizleme)
  const s = shooterPos();
  if (G.state === 'playing' && G.aim.active && !G.proj){
    let dx = G.aim.x - s.x, dy2 = G.aim.y - s.y;
    if (dy2 > -20) dy2 = -20;
    const len = Math.hypot(dx, dy2); dx /= len; dy2 /= len;
    let x = s.x, y = s.y, vx = dx, vy = dy2;
    ctx2.setLineDash([4, 9]);
    ctx2.beginPath(); ctx2.moveTo(x, y);
    let travel = 0, bounced = 0;
    while (travel < cv.height * 0.95 && bounced <= 1){
      const tToWall = vx > 0 ? (cv.width - 10 - x) / vx : vx < 0 ? (10 - x) / vx : 1e9;
      const tToTop = vy < 0 ? (G.topPad + 14 - y) / vy : 1e9;
      const t = Math.min(tToWall, tToTop, 220);
      x += vx * t; y += vy * t; travel += t;
      ctx2.lineTo(x, y);
      if (t === tToTop) break;
      if (t === tToWall){ vx = -vx; bounced++; }
    }
    ctx2.strokeStyle = 'rgba(255,255,255,.8)'; ctx2.lineWidth = 3; ctx2.stroke();
    ctx2.setLineDash([]);
  }
  // fırlatıcı (sapan tabanı + bekleyen balon)
  ctx2.font = '30px system-ui'; ctx2.textAlign = 'center';
  ctx2.fillText('🏹', s.x, s.y + 38);
  if (!G.proj) drawBubble(s.x, s.y, '★');
  // mermi
  if (G.proj) drawBubble(G.proj.x, G.proj.y, '★');
  // parçacıklar
  for (const pt of G.particles){
    ctx2.globalAlpha = Math.max(0, pt.life / 0.6);
    ctx2.fillStyle = `hsl(${pt.hue} 85% 65%)`;
    ctx2.fillRect(pt.x - 3, pt.y - 3, 6, 6);
  }
  ctx2.globalAlpha = 1;
  // yüzen yazılar
  ctx2.textAlign = 'center'; ctx2.font = '900 24px system-ui';
  for (const f of G.floats){
    ctx2.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx2.fillStyle = '#fff';
    ctx2.strokeStyle = 'rgba(14,58,92,.85)'; ctx2.lineWidth = 5;
    ctx2.strokeText(f.txt, f.x, f.y);
    ctx2.fillText(f.txt, f.x, f.y);
  }
  ctx2.globalAlpha = 1;
}

/* ---- döngü ---- */
function loop(ts){
  if (G.state !== 'playing'){ G.raf = 0; return; }
  const dt = Math.min(0.04, (ts - G.lastTs) / 1000 || 0.016);
  G.lastTs = ts;
  updateProj(dt);
  for (const pt of G.particles){ pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 340 * dt; pt.life -= dt; }
  G.particles = G.particles.filter(pt => pt.life > 0);
  for (const f of G.fallers){ f.y += (f.vy += 900 * dt) * dt; }
  G.fallers = G.fallers.filter(f => f.y < cv.height + G.D);
  for (const f of G.floats){ f.y -= 24 * dt; f.life -= dt * 0.7; }
  G.floats = G.floats.filter(f => f.life > 0);
  draw();
  G.raf = requestAnimationFrame(loop);
}

/* ---- giriş: nişan + ateş ---- */
cv.addEventListener('pointerdown', e => {
  if (G.state !== 'playing') return;
  Audio2.init();
  G.aim = { x: e.clientX, y: e.clientY - $('topBar').getBoundingClientRect().height, active: true };
});
cv.addEventListener('pointermove', e => {
  if (!G.aim.active) return;
  G.aim.x = e.clientX;
  G.aim.y = e.clientY - $('topBar').getBoundingClientRect().height;
});
cv.addEventListener('pointerup', e => {
  if (G.state !== 'playing' || !G.aim.active) return;
  G.aim.active = false;
  fire();
});
cv.addEventListener('pointercancel', () => { G.aim.active = false; });

/* ---- HUD + akış ---- */
function refreshHUD(){
  $('scoreChip').textContent = '⭐ ' + G.score;
  $('timeChip').textContent = '⏱️ ' + Math.max(0, G.timeLeft);
  $('timeChip').classList.toggle('low', G.timeLeft <= 15);
  $('wordChip').textContent = '📚 ' + G.words;
}
function show(id){ document.querySelectorAll('.screen').forEach(s => s.classList.remove('show')); $(id).classList.add('show'); }

function startRound(){
  G.state = 'playing';
  G.score = 0; G.timeLeft = CONFIG.ROUND_SEC;
  G.words = 0; G.bubblesPopped = 0; G.doneWords = [];
  G.pool = shuffle(WORDS[G.tier].slice());
  G.proj = null; G.shotsResolved = true;
  G.particles = []; G.fallers = []; G.floats = [];
  show('screen-game');
  layout(); fillInitial(); newWord();
  refreshHUD();
  clearInterval(G.secT);
  G.secT = setInterval(() => {
    if (G.state !== 'playing') return;
    G.timeLeft--;
    if (G.timeLeft <= 5 && G.timeLeft > 0) Audio2.tick();
    refreshHUD();
    if (G.timeLeft <= 0) endRound('time');
  }, 1000);
  G.lastTs = performance.now();
  if (!G.raf) G.raf = requestAnimationFrame(loop);
}

function endRound(reason){
  if (G.state !== 'playing') return;
  G.state = 'result';
  clearInterval(G.secT);
  if (reason === 'overflow') Audio2.over();
  STATS.plays++; STATS.words += G.words; STATS.bubbles += G.bubblesPopped;
  const isBest = G.score > (STATS.best[G.tier] || 0);
  if (isBest) STATS.best[G.tier] = G.score;
  saveStats();
  BilnetBridge.submitScore({
    gameId: 'kelime-balonu', score: G.score, tier: G.tier,
    stats: { words: G.words, bubblesPopped: G.bubblesPopped },
  });
  $('resTitle').textContent = reason === 'overflow' ? STRINGS.overflow : 'Süre Doldu!';
  $('resEmoji').textContent = isBest ? '🏆' : (G.words >= 5 ? '🥇' : '🎈');
  $('resScore').textContent = G.score;
  const wordList = G.doneWords.slice(0, 8).map(([en, tr]) => `<b>${en.toLowerCase()}</b> = ${tr}`).join(' · ');
  $('resStats').innerHTML =
    `📚 Tamamlanan kelime: <b>${G.words}</b> &nbsp;·&nbsp; 🎈 Patlayan balon: <b>${G.bubblesPopped}</b>` +
    (isBest ? `<br>🏅 <b>YENİ ${['', 'ETEK', 'YAMAÇ', 'TIRMANIŞ', 'ZİRVE'][G.tier]} REKORU!</b>` : '') +
    (wordList ? `<div id="resWords">📖 ${wordList}</div>` : '');
  $('eduLine').textContent = G.words > 0 ? STRINGS.edu(G.words) : STRINGS.eduZero;
  if (G.words >= 3) Audio2.fanfare();
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
  G.lastTs = performance.now();
  if (!G.raf) G.raf = requestAnimationFrame(loop);
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
addEventListener('resize', () => { if (G.state === 'playing') layout(); });

/* ---- başlat ---- */
loadStats();
