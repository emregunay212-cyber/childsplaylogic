"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.19 — aynen) ================= */
const CONFIG = {
  COLS: 9,
  ENERGY_PER_Q: 25,            // hızlı panel sorusu = 25 enerji
  EP_REFRESH: 10,              // panel sorusu 10 sn'de yenilenir
  START_ENERGY: 75,
  TOWERS: {
    fistikci: { ad:'Fıstıkçı', e:'🥜', cost:50,  hp:120, dmg:18, rof:1.4, kind:'shoot' },
    cifte:    { ad:'Çifte',    e:'🌰', cost:100, hp:120, dmg:18, rof:0.65, kind:'shoot' },
    duvar:    { ad:'Duvar',    e:'🧱', cost:75,  hp:420, dmg:0,  rof:0,   kind:'wall' },
    bombaci:  { ad:'Bombacı',  e:'🍒', cost:150, hp:90,  dmg:60, rof:2.6, kind:'aoe' },
  },
  WAVES: { 1:3, 2:4, 3:5, 4:7 },
  MOB_HP: { 1:60, 2:80, 3:100, 4:120 },
  KILL_POINT: 40, WAVE_BONUS: 120,
};
const { randInt: rnd, pick, shuffle } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)
function quickQ(){   // hızlı panel: numeric/kısa (işlem akıcılığı — §4.19)
  const k = rnd(0,2);
  let q, ans;
  if (k===0){ const a=rnd(3,12),b=rnd(3,12); q=`${a} + ${b} = ?`; ans=a+b; }
  else if (k===1){ const a=rnd(2,9),b=rnd(2,9); q=`${a} × ${b} = ?`; ans=a*b; }
  else { const a=rnd(8,25),b=rnd(2,7); q=`${a} − ${b} = ?`; ans=a-b; }
  const set = new Set([ans]);
  while (set.size<3){ const v=ans+rnd(-4,4); if(v>=0) set.add(v); }
  const o = shuffle([...set]);
  return { q, o:o.map(String), a:o.indexOf(ans) };
}
function mobQ(){    // canavar/boss sorusu: tam 4 şıklı
  const B = [
    {q:'Hangisi canlıdır?',o:['Çiçek','Taş','Bulut','Su'],a:0},
    {q:"'dog' ne demek?",o:['kedi','köpek','kuş','balık'],a:1},
    {q:'6 × 7 = ?',o:['36','40','42','48'],a:2},
    {q:'Suyun donma noktası?',o:['0°C','10°C','100°C','-50°C'],a:0},
    {q:'Hangisi gezegendir?',o:['Ay','Güneş','Mars','Yıldız'],a:2},
    {q:"'kitap' İngilizcesi?",o:['pen','book','desk','bag'],a:1},
    {q:'45 + 28 = ?',o:['63','71','73','83'],a:2},
    {q:'Bitkiler hangi gazı üretir?',o:['Azot','Karbondioksit','Oksijen','Helyum'],a:2},
  ];
  const q = pick(B);
  const order = shuffle([0,1,2,3]);
  return { q:q.q, o:order.map(i=>q.o[i]), a:order.indexOf(q.a) };
}

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return { init,
    plant: () => tone(420,0.1,'triangle',0.05),
    shoot: () => tone(700,0.05,'square',0.025),
    hit: () => tone(300,0.06,'square',0.03),
    kill: () => { tone(520,0.08,'triangle',0.06); tone(700,0.1,'triangle',0.06,0.07); },
    energy: () => { tone(660,0.08,'triangle',0.06); tone(880,0.1,'triangle',0.06,0.07); },
    bad: () => tone(170,0.22,'sawtooth',0.05),
    wave: () => { tone(330,0.2,'sine',0.07); tone(262,0.25,'sine',0.07,0.16); },
    lose: () => { tone(260,0.3,'sawtooth',0.07); tone(180,0.4,'sawtooth',0.07,0.25); },
    win: () => [523,659,784,1046].forEach((f,i)=>tone(f,0.16,'triangle',0.08,i*0.12)) };
})();
const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(p){ const rec={...p,ts:Date.now()};
    try{ const r=await window.storage.get(this.QUEUE_KEY); const q=r&&r.value?JSON.parse(r.value):[];
      q.push(rec); while(q.length>50)q.shift(); await window.storage.set(this.QUEUE_KEY,JSON.stringify(q)); }catch(e){} },
};
const STATS_KEY = 'bilgisavunmasi_stats';
let STATS = { plays:0, kills:0, best:{1:0,2:0,3:0,4:0} };
function loadStats(){ try{ window.storage.get(STATS_KEY).then(r=>{ if(r&&r.value){ try{ STATS=Object.assign(STATS,JSON.parse(r.value)); }catch(e){} } refreshBest(); }); }catch(e){} }
function saveStats(){ try{ window.storage.set(STATS_KEY,JSON.stringify(STATS)); }catch(e){} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const G = {
  state:'menu', tier:1, rows:5, cols:CONFIG.COLS,
  energy:CONFIG.START_ENERGY, score:0, kills:0, manualKills:0,
  wave:0, totalWaves:3, mobsLeft:0, spawnQueue:[],
  towers:{}, mobs:[], bullets:[],
  selTower:null, epAnswer:null, epTimer:null,
  raf:0, lastTs:0, cellW:0, cellH:0, fieldW:0,
  pendingMob:null, mvLeft:0,
};
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show')); $(id).classList.add('show'); }
function layout(){
  G.rows = innerHeight > innerWidth ? 4 : 5;   // mobil dikeyde 4 şerit (§4.19)
  const f = $('field').getBoundingClientRect();
  G.fieldW = f.width;
  G.cellW = f.width / G.cols;
  G.cellH = f.height / G.rows;
  const grid = $('grid');
  grid.style.gridTemplateColumns = `repeat(${G.cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${G.rows}, 1fr)`;
}
function buildShop(){
  const s = $('towerShop');
  s.innerHTML = '';
  for (const [k,t] of Object.entries(CONFIG.TOWERS)){
    const b = document.createElement('button');
    b.className='shopBtn'; b.dataset.k = k;
    b.innerHTML = `<span class="ic">${t.e}</span>${t.ad}<span>⚡${t.cost}</span>`;
    b.addEventListener('click', ()=>{
      G.selTower = G.selTower===k ? null : k;
      [...s.children].forEach(x=>x.classList.toggle('sel', x.dataset.k===G.selTower));
    });
    s.appendChild(b);
  }
}
function refreshShop(){
  [...$('towerShop').children].forEach(b=>{
    b.disabled = CONFIG.TOWERS[b.dataset.k].cost > G.energy;
  });
}
function buildGrid(){
  const grid = $('grid');
  grid.innerHTML = '';
  for (let r=0;r<G.rows;r++) for (let c=0;c<G.cols;c++){
    const el = document.createElement('div');
    el.className='cellF'; el.dataset.r=r; el.dataset.c=c;
    el.addEventListener('click', ()=>placeTower(r,c,el));
    grid.appendChild(el);
  }
}
function placeTower(r,c,el){
  if (G.state!=='playing' || !G.selTower) return;
  const key = r+','+c;
  if (G.towers[key]) return;
  const T = CONFIG.TOWERS[G.selTower];
  if (G.energy < T.cost) return;
  G.energy -= T.cost;
  G.towers[key] = { r, c, kind:G.selTower, hp:T.hp, maxHp:T.hp, cd:0, el };
  el.innerHTML = `<div class="tw">${T.e}</div><div class="hpBar"><i style="width:100%"></i></div>`;
  Audio2.plant();
  refreshHUD();
}
/* enerji paneli (hızlı soru — §4.19) */
function newEpQ(){
  const q = quickQ();
  G.epAnswer = q.a;
  $('epQ').textContent = q.q;
  const box = $('epOpts');
  box.innerHTML = '';
  q.o.forEach((o,i)=>{
    const b = document.createElement('button');
    b.className='epOpt'; b.textContent=o;
    b.addEventListener('click', ()=>{
      if (G.state!=='playing') return;
      if (i===G.epAnswer){
        G.energy += CONFIG.ENERGY_PER_Q;
        Audio2.energy();
        refreshHUD();
      } else Audio2.bad();
      newEpQ();
    });
    box.appendChild(b);
  });
  clearTimeout(G.epTimer);
  G.epTimer = setTimeout(()=>{ if(G.state==='playing') newEpQ(); }, CONFIG.EP_REFRESH*1000);
}
/* dalga sistemi (§4.19): dalga başına canavar sayısı/hızı artar */
function startWave(){
  G.wave++;
  Audio2.wave();
  $('waveChip').textContent = `🌊 ${G.wave}/${G.totalWaves}`;
  const count = 3 + G.wave*2 + G.tier;
  const isBossWave = G.tier===4 && G.wave===G.totalWaves;
  G.spawnQueue = [];
  for (let i=0;i<count;i++){
    G.spawnQueue.push({ delay: i*(3.2 - Math.min(1.8, G.wave*0.3)), boss:false });
  }
  if (isBossWave) G.spawnQueue.push({ delay: count*2 + 3, boss:true });
  G.mobsLeft = G.spawnQueue.length;
}
function spawnMob(boss){
  const r = rnd(0, G.rows-1);
  const q = mobQ();
  const el = document.createElement('div');
  el.className = 'mob';
  const baseHp = CONFIG.MOB_HP[G.tier] * (1 + G.wave*0.18);
  const m = { r, x: G.fieldW + 20, hp: boss? baseHp*4 : baseHp, maxHp: boss? baseHp*4 : baseHp,
    speed: (14 + G.wave*1.6 + G.tier*2) * (boss?0.6:1), q, boss, bossQLeft: boss?3:1, el, eating:null };
  el.innerHTML = `<div class="mq">${q.q.length>14? q.q.slice(0,13)+'…' : q.q}</div><div class="me">${boss?'👹':pick(['🧟','👾','🤖','👻'])}</div><div class="hpBar" style="position:relative;width:44px"><i style="width:100%"></i></div>`;
  el.addEventListener('click', ()=>openMobQ(m));
  $('field').appendChild(el);
  G.mobs.push(m);
}
/* SON ŞANS: kuleye ulaşan/yürüyen canavarın sorusu manuel cevaplanır (§4.19) */
function openMobQ(m){
  if (G.state!=='playing' || m.dead) return;
  G.state='mobq';
  G.pendingMob = m;
  G.mvLeft = m.boss ? m.bossQLeft : 1;
  showMobQ();
}
function showMobQ(){
  const m = G.pendingMob;
  const q = m.boss ? mobQ() : m.q;
  m.curQ = q;
  $('mvQ').textContent = (m.boss? `BOSS ${4-G.mvLeft}/3 — ` : '') + q.q;
  const box = $('mvOpts');
  box.innerHTML = '';
  q.o.forEach((o,i)=>{
    const b = document.createElement('button');
    b.className='opt'; b.textContent=o;
    b.addEventListener('click', ()=>{
      [...box.children].forEach((x,j)=>{ x.disabled=true; if(j===q.a)x.classList.add('right'); else if(j===i)x.classList.add('wrong'); });
      if (i===q.a){
        G.mvLeft--;
        if (G.mvLeft<=0){
          setTimeout(()=>{ killMob(m, true); $('mobVeil').classList.remove('show'); G.state='playing'; }, 600);
        } else setTimeout(showMobQ, 700);
      } else {
        // yanlış: canavar yürümeye devam eder (ceza yok — sadece şans gitti)
        Audio2.bad();
        setTimeout(()=>{ $('mobVeil').classList.remove('show'); G.state='playing'; }, 800);
      }
    });
    box.appendChild(b);
  });
  $('mobVeil').classList.add('show');
}
function killMob(m, manual){
  if (m.dead) return;
  m.dead = true;
  m.el.remove();
  G.kills++; if (manual) G.manualKills++;
  G.score += CONFIG.KILL_POINT * (m.boss?5:1);
  G.mobsLeft--;
  Audio2.kill();
  refreshHUD();
}
function refreshHUD(){
  $('energyChip').textContent = '⚡ ' + G.energy;
  $('scoreChip').textContent = '⭐ ' + G.score;
  refreshShop();
}
function loop(ts){
  if (G.state!=='playing' && G.state!=='mobq'){ G.raf=0; return; }
  const dt = G.state==='mobq' ? 0 : Math.min(0.05,(ts-G.lastTs)/1000||0.016);
  G.lastTs = ts;
  // spawn kuyruğu
  for (const s of G.spawnQueue){ s.delay -= dt; if (s.delay<=0 && !s.done){ s.done=true; spawnMob(s.boss); } }
  G.spawnQueue = G.spawnQueue.filter(s=>!s.done);
  // kuleler ateş eder (şeritteki en yakın canavar — §4.19)
  for (const key of Object.keys(G.towers)){
    const t = G.towers[key];
    const T = CONFIG.TOWERS[t.kind];
    if (T.kind==='wall') continue;
    t.cd -= dt;
    if (t.cd<=0){
      const targets = G.mobs.filter(m=>!m.dead && m.r===t.r && m.x > (t.c+1)*G.cellW - 6);
      if (targets.length){
        t.cd = T.rof;
        const tx = (t.c+0.7)*G.cellW, ty = (t.r+0.45)*G.cellH;
        G.bullets.push({ x:tx, y:ty, r:t.r, dmg:T.dmg, aoe:T.kind==='aoe', el:null });
        Audio2.shoot();
      }
    }
  }
  // mermiler
  for (const b of G.bullets){
    b.x += 420*dt;
    if (!b.el){ b.el = document.createElement('div'); b.el.className='bullet'; $('field').appendChild(b.el); }
    b.el.style.transform = `translate(${b.x}px, ${(b.r+0.42)*G.cellH}px)`;
    const hit = G.mobs.find(m=>!m.dead && m.r===b.r && Math.abs(m.x - b.x) < 18);
    if (hit){
      b.done = true;
      Audio2.hit();
      if (b.aoe){
        G.mobs.filter(m=>!m.dead && m.r===b.r && Math.abs(m.x-b.x)<G.cellW*1.2).forEach(m=>damageMob(m,b.dmg));
      } else damageMob(hit, b.dmg);
    }
    if (b.x > G.fieldW+20) b.done = true;
  }
  G.bullets = G.bullets.filter(b=>{ if(b.done && b.el) b.el.remove(); return !b.done; });
  // canavarlar yürür / kule kemirir
  for (const m of G.mobs){
    if (m.dead) continue;
    const col = Math.floor(m.x / G.cellW) - 1;
    const tKey = m.r+','+Math.max(0,col);
    const tw = G.towers[tKey];
    if (tw && m.x <= (col+1)*G.cellW + 8 && col>=0){
      // kuleyi kemir
      tw.hp -= 26*dt;
      const bar = tw.el.querySelector('.hpBar i');
      if (bar) bar.style.width = Math.max(0,(tw.hp/tw.maxHp)*100)+'%';
      if (tw.hp<=0){ tw.el.innerHTML=''; delete G.towers[tKey]; }
    } else {
      m.x -= m.speed*dt;
    }
    m.el.style.transform = `translate(${m.x-22}px, ${m.r*G.cellH + G.cellH*0.08}px)`;
    const bar = m.el.querySelector('.hpBar i');
    if (bar) bar.style.width = Math.max(0,(m.hp/m.maxHp)*100)+'%';
    if (m.x < -10) return endRound(false);     // bahçeye girdi
  }
  // dalga bitti mi?
  if (G.mobsLeft<=0 && !G.spawnQueue.length && G.mobs.every(m=>m.dead)){
    G.score += CONFIG.WAVE_BONUS;
    if (G.wave >= G.totalWaves) return endRound(true);
    startWave();
  }
  G.raf = requestAnimationFrame(loop);
}
function damageMob(m, dmg){
  m.hp -= dmg;
  if (m.hp<=0) killMob(m,false);
}
function startRound(){
  G.state='playing';
  G.energy = CONFIG.START_ENERGY + (G.tier===1?25:0);
  G.score=0; G.kills=0; G.manualKills=0;
  G.wave=0; G.totalWaves = CONFIG.WAVES[G.tier];
  G.towers={}; G.selTower=null;
  G.mobs.forEach(m=>m.el && m.el.remove()); G.mobs=[];
  G.bullets.forEach(b=>b.el && b.el.remove()); G.bullets=[];
  show('screen-game');
  layout(); buildGrid(); buildShop();
  newEpQ();
  startWave();
  refreshHUD();
  $('waveChip').textContent = `🌊 1/${G.totalWaves}`;
  G.lastTs = performance.now();
  if (!G.raf) G.raf = requestAnimationFrame(loop);
}
function endRound(win){
  if (G.state!=='playing' && G.state!=='mobq') return;
  G.state='result';
  if (G.raf) cancelAnimationFrame(G.raf); G.raf=0;   // loop() içinden return ile gelince raf sıfırlanmıyor, "Tekrar Savun" döngüyü bir daha kurmuyordu
  clearTimeout(G.epTimer);
  win ? Audio2.win() : Audio2.lose();
  STATS.plays++; STATS.kills += G.kills;
  const isBest = G.score > (STATS.best[G.tier]||0);
  if (isBest) STATS.best[G.tier] = G.score;
  saveStats();
  BilnetBridge.submitScore({ gameId:'bilgi-savunmasi', score:G.score, tier:G.tier,
    stats:{ kills:G.kills, manualKills:G.manualKills, waves:G.wave, win } });
  $('resEmoji').textContent = win ? (isBest?'🏆':'🌻') : '🧟';
  $('resTitle').textContent = win ? 'Bahçe Korundu!' : 'Canavarlar Geçti!';
  $('resScore').textContent = G.score;
  $('resStats').innerHTML = `🌊 Dalga: <b>${G.wave}/${G.totalWaves}</b> · ⚔️ Yenilen: <b>${G.kills}</b> · 🧠 Soruyla yenilen: <b>${G.manualKills}</b>` +
    (isBest?`<br>🏅 <b>YENİ REKOR!</b>`:'');
  $('eduLine').textContent = `Enerjini bilgiyle ürettin — işlem hızın savunmanın gücü oldu! ⚡`;
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
$('bMenu').addEventListener('click',()=>{ G.state='menu'; clearTimeout(G.epTimer); show('screen-menu'); refreshBest(); });
$('bQuitTop').addEventListener('click',()=>{ G.state='menu'; clearTimeout(G.epTimer); show('screen-menu'); refreshBest(); });
EduKit.onHidden(() => { if (G.state === 'playing' || G.state === 'mobq') saveStats(); });   // gizlenince ve pagehide'da kaydet
addEventListener('resize',()=>{ if(G.state==='playing') layout(); });
loadStats();
