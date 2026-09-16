"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.9 — aynen) ================= */
const CONFIG = {
  ROUND_SEC: 75,
  START_SPEED: 2,           // karo/sn (akış hızı)
  MAX_SPEED: 5,
  SPEED_UP_EVERY: 10,       // her 10 doğruda hız artar
  SPEED_STEP: 0.35,
  HIT_POINT: 20,            // 20 p × combo
  COMBO_MAX: 3,             // max ×3
  SPAWN_GAP: 0.85,          // karolar arası mesafe (karo yüksekliği oranı)
  TIERS: {
    1: { lives: Infinity, missBreaksCombo: false },   // Etek: ceza yok
    2: { lives: Infinity, missBreaksCombo: true },    // Yamaç: kaçırma combo bozar
    3: { lives: 3, missBreaksCombo: true },           // Tırmanış: 3 can
    4: { lives: 3, missBreaksCombo: true, frac: true },// Zirve: kesir/yüzde cevaplar
  },
};
/* pentatonik gam (doğru basışlar melodi olur — §4.9 ödül hissi) */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.5];
const { randInt: rnd, pick, shuffle } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)

function genQ(tier){
  if (tier === 4 && Math.random() < 0.6){
    if (Math.random() < 0.5){
      const den = pick([2,4,5,10]), num = rnd(1,den-1);
      const n = den*rnd(2,6);
      const ans = n*num/den;
      const opts = new Set([ans]); let g=0;
      while (opts.size<4 && g++<40){ const v = ans + rnd(-6,6); if (v>0) opts.add(v); }
      return { q:`${n} sayısının ${num}/${den}'i?`, opts: shuffle([...opts].map(String)), ans: String(ans) };
    }
    const p = pick([10,25,50]), base = (100/p)*rnd(2,9), ans = base*p/100;
    const opts = new Set([ans]); let g=0;
    while (opts.size<4 && g++<40){ const v = ans + rnd(-5,5); if (v>0) opts.add(v); }
    return { q:`${base} sayısının %${p}'i?`, opts: shuffle([...opts].map(String)), ans: String(ans) };
  }
  let q, ans;
  if (tier === 1){ const k=rnd(0,2);
    if (k===0){ const a=rnd(2,9),b=rnd(2,9); q=`${a} + ${b} = ?`; ans=a+b; }
    else if (k===1){ const a=rnd(5,18),b=rnd(1,a); q=`${a} − ${b} = ?`; ans=a-b; }
    else { const a=rnd(2,5),b=rnd(2,5); q=`${a} × ${b} = ?`; ans=a*b; } }
  else if (tier === 2){ const k=rnd(0,1);
    if (k===0){ const a=rnd(11,49),b=rnd(11,49); q=`${a} + ${b} = ?`; ans=a+b; }
    else { const a=rnd(2,9),b=rnd(2,9); q=`${a} × ${b} = ?`; ans=a*b; } }
  else { const k=rnd(0,1);
    if (k===0){ const a=rnd(6,14),b=rnd(3,9); q=`${a} × ${b} = ?`; ans=a*b; }
    else { const b=rnd(3,9),c=rnd(4,15); q=`${b*c} ÷ ${b} = ?`; ans=c; } }
  const opts = new Set([ans]); let g=0;
  while (opts.size<4 && g++<40){ const v = ans + rnd(-Math.max(3,Math.round(ans*0.25)), Math.max(3,Math.round(ans*0.25))); if (v>=0) opts.add(v); }
  return { q, opts: shuffle([...opts].map(String)), ans: String(ans) };
}

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return { init,
    note: i => tone(PENTA[i % PENTA.length], 0.22, 'triangle', 0.08),
    bad: () => tone(150,0.25,'sawtooth',0.05),
    miss: () => tone(240,0.15,'sawtooth',0.04),
    fanfare: () => [523,659,784,1046].forEach((f,i)=>tone(f,0.15,'triangle',0.07,i*0.11)) };
})();

const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(p){ const rec={...p,ts:Date.now()};
    try{ const r=await window.storage.get(this.QUEUE_KEY); const q=r&&r.value?JSON.parse(r.value):[];
      q.push(rec); while(q.length>50)q.shift(); await window.storage.set(this.QUEUE_KEY,JSON.stringify(q)); }catch(e){} },
};
const STATS_KEY = 'ritim_stats';
let STATS = { plays:0, correct:0, best:{1:0,2:0,3:0,4:0}, bestCombo:0 };
function loadStats(){ try{ window.storage.get(STATS_KEY).then(r=>{ if(r&&r.value){ try{ STATS=Object.assign(STATS,JSON.parse(r.value)); }catch(e){} } refreshBest(); }); }catch(e){} }
function saveStats(){ try{ window.storage.set(STATS_KEY,JSON.stringify(STATS)); }catch(e){} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const G = {
  state:'menu', tier:1,
  score:0, correct:0, wrong:0, streak:0, bestStreak:0, lives:Infinity,
  tiles:[], q:null, speed:2, noteI:0,
  timeLeft:CONFIG.ROUND_SEC, secT:null, raf:0, lastTs:0, spawnAcc:0,
  recentQ:[],            // son soruların metni (peş peşe tekrar engeli)
  keyLockUntil:[0,0,0,0],// kolon başına debounce (key-repeat engeli)
};
const RECENT_Q_MAX = 8;       // son 8 sorunun metnini hatırla
const KEY_DEBOUNCE_MS = 120;  // kolon başına tuş tekrar engeli
const HIT_ZONE_PX = 45;       // vuruş çizgisine ±45px yakınlık (hit-zone)
const KEY_TO_COL = { KeyA:0, KeyS:1, KeyD:2, KeyF:3, Digit1:0, Digit2:1, Digit3:2, Digit4:3,
                     Numpad1:0, Numpad2:1, Numpad3:2, Numpad4:3 };
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show')); $(id).classList.add('show'); }
function comboMult(){ return Math.min(CONFIG.COMBO_MAX, 1 + Math.floor(G.streak/4)); }
/* vuruş çizgisi (#hitLine) bottom:96px + 3px yükseklik; merkez y'si lane üstünden */
function hitZoneCenterY(H){ return H - 96 - 1.5; }
function refreshHUD(){
  $('scoreChip').textContent = '⭐ ' + G.score;
  $('comboChip').textContent = '🔥 ×' + comboMult();
  $('okChip').textContent = '✅ ' + G.correct + ' · ⏱️ ' + Math.max(0,G.timeLeft);
  $('lives').textContent = G.lives === Infinity ? '' : '❤️'.repeat(Math.max(0,G.lives));
}
function newQuestion(){
  // peş peşe aynı soru gelmesin: son sorulardan biriyse sınırlı denemeyle yeniden üret
  let q = genQ(G.tier);
  let tries = 0;
  while (G.recentQ.includes(q.q) && tries++ < 12){ q = genQ(G.tier); }
  G.q = q;
  G.recentQ.push(q.q);
  while (G.recentQ.length > RECENT_Q_MAX) G.recentQ.shift();
  $('qLine').textContent = G.q.q;
}
function spawnTile(){
  // her karo soru şıklarından biri; doğru karo %35 olasılıkla gelir (bulunabilir kalsın)
  const correct = Math.random() < 0.35;
  const txt = correct ? G.q.ans : pick(G.q.opts.filter(o => o !== G.q.ans));
  const col = rnd(0,3);
  const el = document.createElement('div');
  el.className = 'tileK';
  el.style.left = (col*25) + '%';
  el.textContent = txt;
  el.addEventListener('pointerdown', e => { e.stopPropagation(); tapTile(t); });
  const lane = $('lane');
  lane.appendChild(el);
  const t = { el, y: -90, txt, correct, dead:false, col, inZone:false };
  G.tiles.push(t);
}
function tapTile(t){
  if (G.state!=='playing' || t.dead) return;
  t.dead = true;
  if (t.correct){
    G.correct++; G.streak++;
    if (G.streak > G.bestStreak) G.bestStreak = G.streak;
    G.score += CONFIG.HIT_POINT * comboMult();   // 20p × combo (§4.9)
    Audio2.note(G.noteI++);                      // pentatonik melodi
    t.el.classList.add('hitOk');
    if (G.correct % CONFIG.SPEED_UP_EVERY === 0) G.speed = Math.min(CONFIG.MAX_SPEED, G.speed + CONFIG.SPEED_STEP);
    newQuestion();
  } else {
    // yanlışa basış: combo sıfırlanır (oyun bitmez — Etek'te yumuşak)
    G.wrong++; G.streak = 0; G.noteI = 0;
    Audio2.bad();
    t.el.classList.add('hitBad');
    if (G.lives !== Infinity){ G.lives--; if (G.lives<=0){ removeTileLater(t); return endRound('can'); } }
  }
  removeTileLater(t);
  refreshHUD();
}
function removeTileLater(t){ setTimeout(()=>{ t.el.remove(); }, 180); }
/* Klavye vuruşu: ilgili kolonda vuruş çizgisine en yakın (hit-zone içi) notayı bul ve bas.
   Boş basışta (hit-zone'da nota yok) kaçırma geri bildirimi ver. */
function hitColumn(col){
  if (G.state!=='playing') return;
  const lane = $('lane');
  const zoneCenter = hitZoneCenterY(lane.clientHeight);
  let best = null, bestDist = Infinity;
  for (const t of G.tiles){
    if (t.dead || t.col !== col) continue;
    const dist = Math.abs((t.y + 42) - zoneCenter);
    if (dist <= HIT_ZONE_PX && dist < bestDist){ best = t; bestDist = dist; }
  }
  if (best){
    tapTile(best);                 // mevcut vuruş/skor mantığını aynen kullan
  } else {
    // hit-zone dışında boş basış: kaçırma sesi + hafif görsel uyarı (oyun bitmez)
    Audio2.miss();
  }
}
function loop(ts){
  if (G.state!=='playing'){ G.raf=0; return; }
  const dt = Math.min(0.05,(ts-G.lastTs)/1000||0.016);
  G.lastTs = ts;
  const lane = $('lane');
  const H = lane.clientHeight;
  const pxPerSec = G.speed * 120;
  const zoneCenter = hitZoneCenterY(H);   // vuruş çizgisinin merkez y'si
  // spawn: karolar arası mesafe
  G.spawnAcc += dt * G.speed;
  if (G.spawnAcc >= CONFIG.SPAWN_GAP){ G.spawnAcc = 0; spawnTile(); }
  for (const t of G.tiles){
    if (t.dead) continue;
    t.y += pxPerSec * dt;
    t.el.style.transform = `translateY(${t.y}px)`;
    // hit-zone görsel vurgusu: karo merkezi vuruş çizgisine ±45px ise parlat
    const inZone = Math.abs((t.y + 42) - zoneCenter) <= HIT_ZONE_PX;
    if (inZone !== t.inZone){
      t.inZone = inZone;
      t.el.classList.toggle('inZone', inZone);
    }
    if (t.y > H){
      t.dead = true;
      t.el.remove();
      if (t.correct){
        // doğru karo kaçtı
        if (CONFIG.TIERS[G.tier].missBreaksCombo){ G.streak=0; G.noteI=0; Audio2.miss(); }
        if (G.lives !== Infinity){ G.lives--; refreshHUD(); if (G.lives<=0){ G.raf=0; return endRound('can'); } }   // raf sıfırlanmazsa Tekrar Oyna'da döngü bir daha kurulmuyordu
        newQuestion();
        refreshHUD();
      }
    }
  }
  G.tiles = G.tiles.filter(t => !t.dead);
  G.raf = requestAnimationFrame(loop);
}
function startRound(){
  const T = CONFIG.TIERS[G.tier];
  G.state='playing';
  G.score=0; G.correct=0; G.wrong=0; G.streak=0; G.bestStreak=0; G.noteI=0;
  G.lives = T.lives;
  G.speed = CONFIG.START_SPEED;
  G.timeLeft = CONFIG.ROUND_SEC;
  G.spawnAcc = 0;
  G.recentQ = [];
  G.keyLockUntil = [0,0,0,0];
  document.querySelectorAll('.tileK').forEach(e=>e.remove());
  G.tiles = [];
  show('screen-game');
  newQuestion();
  refreshHUD();
  clearInterval(G.secT);
  G.secT = setInterval(()=>{
    if (G.state!=='playing') return;
    G.timeLeft--;
    refreshHUD();
    if (G.timeLeft<=0) endRound('sure');
  },1000);
  G.lastTs = performance.now();
  if (!G.raf) G.raf = requestAnimationFrame(loop);
}
function endRound(reason){
  if (G.state!=='playing') return;
  G.state='result';
  clearInterval(G.secT);
  STATS.plays++; STATS.correct += G.correct;
  if (G.bestStreak > STATS.bestCombo) STATS.bestCombo = G.bestStreak;
  const isBest = G.score > (STATS.best[G.tier]||0);
  if (isBest) STATS.best[G.tier] = G.score;
  saveStats();
  BilnetBridge.submitScore({ gameId:'ritim-sorulari', score:G.score, tier:G.tier,
    stats:{ correct:G.correct, wrong:G.wrong, maxCombo:G.bestStreak } });
  $('resEmoji').textContent = isBest ? '🏆' : '🎹';
  $('resTitle').textContent = reason==='can' ? 'Canlar Bitti!' : 'Melodi Bitti!';
  $('resScore').textContent = G.score;
  $('resStats').innerHTML = `✅ Doğru: <b>${G.correct}</b> · ❌ Yanlış: <b>${G.wrong}</b> · 🔥 En uzun seri: <b>${G.bestStreak}</b>` +
    (isBest?`<br>🏅 <b>YENİ REKOR!</b>`:'');
  $('eduLine').textContent = G.correct>0 ? `Bugün ritimle ${G.correct} işlem çözdün! 🎵` : 'Parmakların ısındı — tekrar dene! 💪';
  if (G.correct>=15) Audio2.fanfare();
  show('screen-result');
  refreshBest();
}
function refreshBest(){
  const b = STATS.best[G.tier]||0;
  $('bestLine').textContent = b>0 ? `🏅 ${['','Etek','Yamaç','Tırmanış','Zirve'][G.tier]} rekorun: ${b}` : '';
}
document.querySelectorAll('.tierBtn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tierBtn').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); G.tier=parseInt(b.dataset.t,10); refreshBest();
}));
$('bPlay').addEventListener('click',()=>{ Audio2.init(); startRound(); });
$('bAgain').addEventListener('click',startRound);
$('bMenu').addEventListener('click',()=>{ G.state='menu'; show('screen-menu'); refreshBest(); });
function pauseGame(){ if(G.state!=='playing')return; G.state='paused'; $('pauseVeil').classList.add('show'); }
$('bPause').addEventListener('click',pauseGame);
$('bResume').addEventListener('click',()=>{ if(G.state!=='paused')return; G.state='playing'; $('pauseVeil').classList.remove('show'); G.lastTs=performance.now(); if(!G.raf)G.raf=requestAnimationFrame(loop); });
$('bQuit').addEventListener('click',()=>{ $('pauseVeil').classList.remove('show'); clearInterval(G.secT); G.state='menu'; show('screen-menu'); refreshBest(); });
addEventListener('keydown',e=>{ if((e.code==='KeyP'||e.code==='Escape')&&G.state==='playing') pauseGame(); });
/* Oyun tuşları: A S D F (alternatif 1 2 3 4) → kolon vuruşu. Debounce + preventDefault. */
addEventListener('keydown',e=>{
  if (G.state!=='playing') return;
  const col = KEY_TO_COL[e.code];
  if (col === undefined) return;
  e.preventDefault();
  if (e.repeat) return;                              // tarayıcı key-repeat'i engelle
  const now = performance.now();
  if (now < G.keyLockUntil[col]) return;             // kolon başına ~120ms debounce
  G.keyLockUntil[col] = now + KEY_DEBOUNCE_MS;
  flashKeyCap(col);                                  // harf etiketine basış efekti
  hitColumn(col);
});
function flashKeyCap(col){
  const cap = document.querySelector('.keyCap[data-col="'+col+'"]');
  if (!cap) return;
  cap.classList.add('press');
  setTimeout(()=>cap.classList.remove('press'), 110);
}
EduKit.onHidden(() => { if (G.state === 'playing'){ pauseGame(); saveStats(); } });   // gizlenince duraklat, pagehide'da da kaydet
loadStats();
