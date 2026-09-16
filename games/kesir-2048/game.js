"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.10 — aynen) =================
   Değer modeli: value = 1/8'lik birim sayısı (t3/t4). 1=1/8, 2=1/4, 4=1/2, 8=1 TAM,
   16=2, 32=4... Aynı DEĞERLER birleşir → görünüm farklı olabilir (denk kesir!). */
const CONFIG = {
  N: 4,
  MERGE_POINT: v => Math.max(1, Math.round(v)) * 10,   // birleşme puanı: oluşan değer × 10
  UNDO: 3,                                              // geri al hakkı: oyun başına 3
  TAM_BONUS: 100,                                       // 1 TAM oluşturma "patlama" bonusu
};
const TIERS = {
  1: { type: 'int', base: 2,  spawn: [2, 4] },
  2: { type: 'int', base: 5,  spawn: [5, 10] },          // farklı taban — esneklik
  3: { type: 'frac', spawn: [1, 1, 1, 2] },              // 1/8 ağırlıklı
  4: { type: 'frac', spawn: [1, 1, 2, 2, 4], mixed: true }, // denk kesir gösterimleri karışır
};
const { pick } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)
/* kesir gösterimi: birim=1/8 → v birim; Zirve'de denk formlar (2/8 yerine 1/4 vb. rastgele) */
function fracLabel(v, mixed){
  if (v >= 8){ const tam = v/8; return Number.isInteger(tam) ? tam + ' TAM' : tam.toFixed(1); }
  // v/8 sadeleştir
  let num = v, den = 8;
  if (!mixed || Math.random() < 0.6){
    while (num % 2 === 0 && den % 2 === 0){ num/=2; den/=2; }
  } else if (num % 2 === 0){
    // denk kesir bilgisi: bazen SADELEŞTİRMEDEN göster (2/8 = 1/4 öğretisi)
  }
  return num + '/' + den;
}
function hueFor(v){ return (Math.log2(v) * 42 + 8) % 360; }

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return { init,
    slide: () => tone(300,0.06,'square',0.03),
    merge: v => tone(400 + Math.log2(v)*70, 0.12, 'triangle', 0.06),
    tam: () => [523,659,784,1046].forEach((f,i)=>tone(f,0.14,'triangle',0.08,i*0.09)),
    over: () => { tone(300,0.25,'sawtooth',0.06); tone(220,0.3,'sawtooth',0.05,0.2); } };
})();

const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(p){ const rec={...p,ts:Date.now()};
    try{ const r=await window.storage.get(this.QUEUE_KEY); const q=r&&r.value?JSON.parse(r.value):[];
      q.push(rec); while(q.length>50)q.shift(); await window.storage.set(this.QUEUE_KEY,JSON.stringify(q)); }catch(e){} },
};
const STATS_KEY = 'kesir2048_stats';
let STATS = { plays:0, merges:0, tams:0, best:{1:0,2:0,3:0,4:0} };
function loadStats(){ try{ window.storage.get(STATS_KEY).then(r=>{ if(r&&r.value){ try{ STATS=Object.assign(STATS,JSON.parse(r.value)); }catch(e){} } refreshBest(); }); }catch(e){} }
function saveStats(){ try{ window.storage.set(STATS_KEY,JSON.stringify(STATS)); }catch(e){} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const G = {
  state:'menu', tier:1,
  grid:[], score:0, tams:0, undo:CONFIG.UNDO, history:[],
  cell:80, gap:8,
};
let tileSeq = 0;
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show')); $(id).classList.add('show'); }
function layout(){
  const wrap = $('boardWrap').getBoundingClientRect();
  const size = Math.min(wrap.width-12, wrap.height-12, 440);
  G.cell = Math.floor((size - 16 - G.gap*(CONFIG.N-1)) / CONFIG.N);
  const bs = G.cell*CONFIG.N + G.gap*(CONFIG.N-1) + 16;
  const b = $('board');
  b.style.width = bs+'px'; b.style.height = bs+'px';
  // arka plan hücreleri
  b.querySelectorAll('.bgCell').forEach(e=>e.remove());
  for (let r=0;r<CONFIG.N;r++) for (let c=0;c<CONFIG.N;c++){
    const e = document.createElement('div');
    e.className='bgCell';
    e.style.width = e.style.height = G.cell+'px';
    e.style.left = (8 + c*(G.cell+G.gap))+'px';
    e.style.top = (8 + r*(G.cell+G.gap))+'px';
    b.appendChild(e);
  }
}
function posOf(r,c){ return { x: 8 + c*(G.cell+G.gap), y: 8 + r*(G.cell+G.gap) }; }
function makeTileEl(t){
  const T = TIERS[G.tier];
  const el = document.createElement('div');
  el.className='tile2';
  el.style.width = el.style.height = G.cell+'px';
  styleTile(el, t.v);
  $('board').appendChild(el);
  return el;
}
function styleTile(el, v){
  const T = TIERS[G.tier];
  const hue = hueFor(v);
  el.style.background = `hsl(${hue} 60% 48%)`;
  const isFrac = T.type === 'frac';
  const label = isFrac ? fracLabel(v, T.mixed) : String(v);
  const pieSize = Math.round(G.cell*0.42);
  let pieHtml = '';
  if (isFrac && v < 8){
    // PASTA MODELİ: dolu dilim oranı = v/8 (kesir görselleşir — §4.10'un asıl değeri)
    const pct = (v/8)*100;
    pieHtml = `<div class="pie" style="width:${pieSize}px;height:${pieSize}px;background:conic-gradient(#fff 0% ${pct}%, rgba(0,0,0,.35) ${pct}% 100%)"></div>`;
  } else if (isFrac){
    pieHtml = `<div class="pie" style="width:${pieSize}px;height:${pieSize}px;background:#fff"></div>`;
  }
  el.innerHTML = pieHtml + `<div style="font-size:${isFrac ? Math.round(G.cell*0.21) : Math.round(G.cell*0.3)}px">${label}</div>`;
}
function setTilePos(t, animate){
  const p = posOf(t.r, t.c);
  t.el.style.setProperty('--tx', p.x+'px');
  t.el.style.setProperty('--ty', p.y+'px');
  t.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
}
function spawn(){
  const empty = [];
  for (let r=0;r<CONFIG.N;r++) for (let c=0;c<CONFIG.N;c++) if (!G.grid[r][c]) empty.push([r,c]);
  if (!empty.length) return;
  const [r,c] = pick(empty);
  const T = TIERS[G.tier];
  const v = T.type==='int' ? pick(T.spawn) : pick(T.spawn);
  const t = { id:++tileSeq, v, r, c, el:null };
  t.el = makeTileEl(t);
  t.el.style.transform = `translate(${posOf(r,c).x}px, ${posOf(r,c).y}px) scale(.3)`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ setTilePos(t); }));
  G.grid[r][c] = t;
}
function snapshot(){
  return { score:G.score, tams:G.tams,
    cells: G.grid.flatMap((row,r)=>row.map((t,c)=>t?{v:t.v,r,c}:null)).filter(Boolean) };
}
function restore(s){
  $('board').querySelectorAll('.tile2').forEach(e=>e.remove());
  G.grid = Array.from({length:CONFIG.N},()=>Array(CONFIG.N).fill(null));
  G.score = s.score; G.tams = s.tams;
  for (const c of s.cells){
    const t = { id:++tileSeq, v:c.v, r:c.r, c:c.c, el:null };
    t.el = makeTileEl(t);
    setTilePos(t);
    G.grid[c.r][c.c] = t;
  }
  refreshHUD();
}
function move(dx, dy){
  if (G.state!=='playing') return;
  const T = TIERS[G.tier];
  const before = snapshot();
  let moved = false, gained = 0, tamMade = false;
  const range = [...Array(CONFIG.N).keys()];
  const rows = dy>0 ? [...range].reverse() : range;
  const cols = dx>0 ? [...range].reverse() : range;
  const mergedIds = new Set();
  for (const r of rows) for (const c of cols){
    const t = G.grid[r][c];
    if (!t) continue;
    let nr=r, nc=c;
    while (true){
      const tr = nr+dy, tc = nc+dx;
      if (tr<0||tr>=CONFIG.N||tc<0||tc>=CONFIG.N) break;
      const o = G.grid[tr][tc];
      if (!o){ nr=tr; nc=tc; continue; }
      if (o.v===t.v && !mergedIds.has(o.id) && !mergedIds.has(t.id)){
        // BİRLEŞME — denk değerler kaynaşır (t4'te 1/4 + 2/8 görünümleri aynı değerdir)
        G.grid[r][c]=null;
        G.grid[tr][tc]=null;
        const nv = t.v*2;
        o.el.remove(); t.el.remove();
        const m = { id:++tileSeq, v:nv, r:tr, c:tc, el:null };
        m.el = makeTileEl(m);
        setTilePos(m);
        m.el.classList.add('merged');
        G.grid[tr][tc]=m;
        mergedIds.add(m.id);
        // birleşme puanı: oluşan değer × 10 (kesirde değer = nv/8 TAM cinsinden)
        G.score += T.type==='frac' ? (Math.round((nv/8)*80) || 10) : nv*10;
        STATS.merges++;
        Audio2.merge(nv);
        if (T.type==='frac' && nv===8){ G.tams++; STATS.tams++; G.score += CONFIG.TAM_BONUS; tamMade = true; }
        moved = true;
        break;
      }
      break;
    }
    if ((nr!==r||nc!==c) && G.grid[r][c]===t){
      G.grid[r][c]=null;
      t.r=nr; t.c=nc;
      G.grid[nr][nc]=t;
      setTilePos(t);
      moved = true;
    }
  }
  if (moved){
    G.history.push(before);
    if (G.history.length>10) G.history.shift();
    Audio2.slide();
    if (tamMade) Audio2.tam();
    // Zamanlayıcı saklanır: taş belirmeden Geri Al'a basılırsa geri alınmış tahtaya taş eklenmesin
    clearTimeout(G.spawnT);
    G.spawnT = setTimeout(()=>{ G.spawnT=null; spawn(); refreshHUD(); checkOver(); }, 130);
    refreshHUD();
  }
}
function canMove(){
  for (let r=0;r<CONFIG.N;r++) for (let c=0;c<CONFIG.N;c++){
    const t = G.grid[r][c];
    if (!t) return true;
    if (c<CONFIG.N-1 && G.grid[r][c+1] && G.grid[r][c+1].v===t.v) return true;
    if (r<CONFIG.N-1 && G.grid[r+1][c] && G.grid[r+1][c].v===t.v) return true;
  }
  return false;
}
function checkOver(){
  if (!canMove()) endRound();
}
function refreshHUD(){
  $('scoreChip').textContent = '⭐ ' + G.score;
  $('tamChip').textContent = TIERS[G.tier].type==='frac' ? `🥧 ${G.tams} TAM` : `🔝 ${maxTile()}`;
  $('bUndo').textContent = '↩️ ' + G.undo;
  $('bUndo').disabled = G.undo<=0 || !G.history.length;
}
function maxTile(){
  let m=0;
  for (const row of G.grid) for (const t of row) if (t && t.v>m) m=t.v;
  return m;
}
function startRound(){
  clearTimeout(G.spawnT); G.spawnT=null;   // önceki hamlenin bekleyen taşı yeni tahtaya düşmesin
  G.state='playing';
  G.score=0; G.tams=0; G.undo=CONFIG.UNDO; G.history=[];
  show('screen-game');
  layout();
  $('board').querySelectorAll('.tile2').forEach(e=>e.remove());
  G.grid = Array.from({length:CONFIG.N},()=>Array(CONFIG.N).fill(null));
  spawn(); spawn();
  refreshHUD();
}
function endRound(){
  if (G.state!=='playing') return;
  G.state='result';
  Audio2.over();
  STATS.plays++;
  const isBest = G.score > (STATS.best[G.tier]||0);
  if (isBest) STATS.best[G.tier] = G.score;
  saveStats();
  BilnetBridge.submitScore({ gameId:'kesir-2048', score:G.score, tier:G.tier,
    stats:{ tams:G.tams, maxTile:maxTile() } });
  const T = TIERS[G.tier];
  $('resEmoji').textContent = isBest ? '🏆' : '🧩';
  $('resScore').textContent = G.score;
  $('resStats').innerHTML = (T.type==='frac'
    ? `🥧 Oluşturulan TAM: <b>${G.tams}</b> · 🔝 En büyük: <b>${fracLabel(maxTile(), false)}</b>`
    : `🔝 En büyük taş: <b>${maxTile()}</b>`) +
    (isBest?`<br>🏅 <b>YENİ REKOR!</b>`:'');
  $('eduLine').textContent = T.type==='frac'
    ? (G.tams>0 ? `Bugün kesirleri birleştirip ${G.tams} TAM yaptın! 🥧` : 'Kesir pastalarını gördün — bir dahaki sefere TAM yap! 💪')
    : `Bugün sayıları katlaya katlaya ${maxTile()}'e ulaştın! 🎉`;
  show('screen-result');
  refreshBest();
}
$('bUndo').addEventListener('click',()=>{
  if (G.undo<=0 || !G.history.length || G.state!=='playing') return;
  G.undo--;
  clearTimeout(G.spawnT); G.spawnT=null;
  restore(G.history.pop());
});
$('bRestart').addEventListener('click',startRound);
function refreshBest(){
  const b = STATS.best[G.tier]||0;
  $('bestLine').textContent = b>0 ? `🏅 ${['','Etek','Yamaç','Tırmanış','Zirve'][G.tier]} rekorun: ${b}` : '';
}
/* ---- giriş: swipe + ok tuşları ---- */
let swipeStart = null;
$('board').addEventListener('pointerdown', e => { swipeStart = {x:e.clientX,y:e.clientY}; });
addEventListener('pointerup', e => {
  if (!swipeStart || G.state!=='playing') { swipeStart=null; return; }
  const dx = e.clientX-swipeStart.x, dy = e.clientY-swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx)<24 && Math.abs(dy)<24) return;
  Audio2.init();
  Math.abs(dx)>Math.abs(dy) ? move(Math.sign(dx),0) : move(0,Math.sign(dy));
});
addEventListener('keydown', e => {
  const m = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0] };
  if (m[e.code] && G.state==='playing'){ e.preventDefault(); Audio2.init(); move(...m[e.code]); }
});
document.querySelectorAll('.tierBtn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tierBtn').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); G.tier=parseInt(b.dataset.t,10); refreshBest();
}));
$('bPlay').addEventListener('click',()=>{ Audio2.init(); startRound(); });
$('bAgain').addEventListener('click',startRound);
$('bMenu').addEventListener('click',()=>{ G.state='menu'; show('screen-menu'); refreshBest(); });
$('bQuitTop').addEventListener('click',()=>{ G.state='menu'; show('screen-menu'); refreshBest(); });
EduKit.onHidden(saveStats);   // gizlenince ve pagehide'da kaydet
addEventListener('resize',()=>{ if(G.state==='playing'){ layout(); G.grid.flat().forEach(t=>{ if(t){ t.el.style.width=t.el.style.height=G.cell+'px'; styleTile(t.el,t.v); setTilePos(t); } }); } });
loadStats();
