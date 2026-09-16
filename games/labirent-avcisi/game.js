"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.17 — aynen) ================= */
const CONFIG = {
  LETTER_POINT: 40,            // kelime tamamlama: harf × 40
  WORDS_PER_LEVEL: 3,          // bölüm: 3 kelime tamamlanınca biter
  REVERSE_MS: 3000,            // bulut teması: 3 sn kontrol tersine döner
  FREEZE_MS: 5000,             // güç kapsülü: 5 sn bulutları dondurur
  PLAYER_SPEED: 4.6,           // hücre/sn
  TIERS: {
    1: { clouds: 1, cloudSpeed: 2.2, fake: false, words: ['KEDİ','TOP','SU','BAL','AY'] },
    2: { clouds: 2, cloudSpeed: 2.5, fake: false, words: ['KALEM','ÇİÇEK','GÜNEŞ','DENİZ','KİTAP'] },
    3: { clouds: 2, cloudSpeed: 3.1, fake: false, words: ['ORMAN','YILDIZ','TAVŞAN','BAYRAK','OKYANUS'] },
    4: { clouds: 3, cloudSpeed: 3.3, fake: true,  words: ['GÖKYÜZÜ','ÖĞRETMEN','KELEBEK','ARMAĞAN','BİLGİSAYAR'] },
  },
};
/* 3 hazır harita rotasyonu (15×17 — 1 duvar, 0 yol) §4.17 */
const MAPS = [
[
"111111111111111",
"100000001000001",
"101111101011101",
"101000000010001",
"101011111010111",
"100010001000001",
"111010101011101",
"100000100000001",
"101110101111101",
"100010100010001",
"101010111010101",
"101000001010001",
"101011101011101",
"100000001000001",
"101111111011101",
"100000000000001",
"111111111111111"],
[
"111111111111111",
"100010000010001",
"101010111010101",
"101000101000101",
"101110101011101",
"100000000000001",
"101011111110101",
"101000001000101",
"101110101011101",
"100000100000001",
"111010101011111",
"100010001000001",
"101111111010101",
"101000000010101",
"101011111110101",
"100000000000001",
"111111111111111"],
[
"111111111111111",
"100000100000001",
"101110101111101",
"100010001000101",
"111011111010101",
"100000001010001",
"101111101011101",
"100000000000001",
"101011111110101",
"101010000010101",
"101010111010101",
"100010101000001",
"111010101111101",
"100010000000001",
"101111101111101",
"100000000000001",
"111111111111111"],
];
const { randInt: rnd, pick } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)
const TR_ALL = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return { init,
    pick: i => tone(500+i*60,0.08,'triangle',0.06),
    bad: () => tone(180,0.22,'sawtooth',0.05),
    cloud: () => { tone(260,0.18,'sine',0.06); tone(200,0.25,'sine',0.06,0.14); },
    word: () => [523,659,784].forEach((f,i)=>tone(f,0.13,'triangle',0.07,i*0.1)),
    cap: () => { tone(700,0.1,'square',0.05); tone(900,0.12,'square',0.05,0.08); },
    fanfare: () => [523,659,784,1046].forEach((f,i)=>tone(f,0.15,'triangle',0.07,i*0.11)) };
})();
const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(p){ const rec={...p,ts:Date.now()};
    try{ const r=await window.storage.get(this.QUEUE_KEY); const q=r&&r.value?JSON.parse(r.value):[];
      q.push(rec); while(q.length>50)q.shift(); await window.storage.set(this.QUEUE_KEY,JSON.stringify(q)); }catch(e){} },
};
const STATS_KEY = 'labirent_stats';
let STATS = { plays:0, words:0, best:{1:0,2:0,3:0,4:0} };
function loadStats(){ try{ window.storage.get(STATS_KEY).then(r=>{ if(r&&r.value){ try{ STATS=Object.assign(STATS,JSON.parse(r.value)); }catch(e){} } refreshBest(); }); }catch(e){} }
function saveStats(){ try{ window.storage.set(STATS_KEY,JSON.stringify(STATS)); }catch(e){} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx2 = cv.getContext('2d');
const W = 15, H = 17;
const G = {
  state:'menu', tier:1, map:null, cell:24,
  player:{ x:1, y:1, dir:{x:0,y:0}, want:{x:0,y:0}, fx:1, fy:1 },
  clouds:[], letters:[], capsule:null,
  word:'', progress:0, wordsDone:0, usedWords:[],
  score:0, reversedUntil:0, frozenUntil:0,
  raf:0, lastTs:0,
};
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show')); $(id).classList.add('show'); }
function layout(){
  const wrap = $('cvWrap').getBoundingClientRect();
  G.cell = Math.floor(Math.min((wrap.width-10)/W, (wrap.height-10)/H));
  cv.width = G.cell*W; cv.height = G.cell*H;
}
const wall = (x,y) => x<0||x>=W||y<0||y>=H||G.map[y][x]==='1';
function freeCells(){
  const out=[];
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) if (!wall(x,y)) out.push([x,y]);
  return out;
}
function scatterLetters(){
  // mevcut G.word'ün harflerini (+ Zirve'de sahteler) labirente serp
  const T = CONFIG.TIERS[G.tier];
  const cells = freeCells().filter(([x,y]) => Math.abs(x-G.player.fx)+Math.abs(y-G.player.fy) > 3);
  const chosen = [];
  G.letters = [];
  const letters = G.word.split('');
  if (T.fake){   // Zirve: sahte çeldirici harfler (§4.17)
    for (let i=0;i<4;i++){
      let L = TR_ALL[rnd(0,TR_ALL.length-1)];
      while (letters.includes(L)) L = TR_ALL[rnd(0,TR_ALL.length-1)];
      letters.push(L);
    }
  }
  for (const L of letters){
    let c, guard=0;
    do { c = pick(cells); guard++; } while (guard<80 && chosen.some(p=>p[0]===c[0]&&p[1]===c[1]));
    chosen.push(c);
    G.letters.push({ x:c[0], y:c[1], L });
  }
  const cc = pick(cells);
  G.capsule = { x:cc[0], y:cc[1] };
  renderWordLine();
}
function placeWord(){
  const T = CONFIG.TIERS[G.tier];
  let pool = T.words.filter(w=>!G.usedWords.includes(w));
  if (!pool.length){ G.usedWords=[]; pool=T.words; }
  G.word = pick(pool);
  G.usedWords.push(G.word);
  G.progress = 0;
  scatterLetters();
}
function renderWordLine(){
  $('wordLine').textContent = G.word.split('').map((L,i)=> i<G.progress ? L : (i===G.progress ? '▸'+L : '·')).join(' ');
}
function startRound(){
  const T = CONFIG.TIERS[G.tier];
  G.state='playing';
  show('screen-game');   // ÖNCE göster: cvWrap görünür olmalı ki layout doğru ölçsün
  G.map = pick(MAPS);
  layout();              // canvas boyutu artık görünür cvWrap'ten hesaplanır (0/negatif boyut bug'ı düzeltildi)
  G.player = { fx:1, fy:1, x:1, y:1, dir:{x:0,y:0}, want:{x:0,y:0} };
  G.score=0; G.wordsDone=0; G.usedWords=[];
  G.reversedUntil=0; G.frozenUntil=0;
  // bulutlar köşelerden başlar
  const corners = [[W-2,1],[W-2,H-2],[1,H-2]];
  G.clouds = Array.from({length:T.clouds},(_,i)=>({ fx:corners[i%3][0], fy:corners[i%3][1],
    x:corners[i%3][0], y:corners[i%3][1], dir:{x:0,y:0} }));
  placeWord();
  refreshHUD();
  G.lastTs = performance.now();
  // endRound() loop'un İÇİNDEN return ettiği için son frame "G.raf=requestAnimationFrame" satırına
  // ulaşamaz → G.raf bayat (ateşlenmiş) bir id'de kalır. Eski "if(!G.raf)" guard'ı bu yüzden 2. turda
  // döngüyü hiç başlatmıyordu (boş ekran). Her tur başında bayatı iptal et, döngüyü kesin yeniden kur.
  cancelAnimationFrame(G.raf);
  G.raf = requestAnimationFrame(loop);
}
function refreshHUD(){
  $('scoreChip').textContent = '⭐ ' + G.score;
  $('wordChip').textContent = `📚 ${G.wordsDone}/${CONFIG.WORDS_PER_LEVEL}`;
}
/* grid tabanlı hareket (§4.17 — köşe dönüşleri kolay) */
function stepEntity(e, speed, dt, chooser){
  // hücre merkezindeyse yön seç
  const atCenter = Math.abs(e.x - e.fx) < 0.02 && Math.abs(e.y - e.fy) < 0.02;
  if (atCenter){
    e.x = e.fx; e.y = e.fy;
    chooser(e);
    if (e.dir.x||e.dir.y){
      const nx = e.fx + e.dir.x, ny = e.fy + e.dir.y;
      if (!wall(nx,ny)){ e.fx = nx; e.fy = ny; }
      else e.dir = {x:0,y:0};
    }
  }
  const dx = e.fx - e.x, dy = e.fy - e.y;
  const dist = Math.abs(dx)+Math.abs(dy);
  if (dist > 0){
    const mv = Math.min(dist, speed*dt);
    e.x += Math.sign(dx)*Math.min(Math.abs(dx), mv);
    e.y += Math.sign(dy)*Math.min(Math.abs(dy), mv);
  }
}
function playerChooser(p){
  const rev = performance.now() < G.reversedUntil ? -1 : 1;
  const want = { x: G.player.want.x*rev, y: G.player.want.y*rev };
  if ((want.x||want.y) && !wall(p.fx+want.x, p.fy+want.y)) p.dir = want;
}
/* labirent-farkında takip (§4.17): eski "basit AI" (Manhattan-greedy %30) YETERSİZDİ —
   düz mesafe duvarları yok saydığı için bulut duvar cebinde salınıp oyuncuya HİÇ
   ulaşamıyordu; dolayısıyla temas hiç olmuyor, kontrol-ters efekti hiç tetiklenmiyordu.
   Çözüm: BFS ile oyuncuya giden en kısa yolun İLK adımını bul (15×17 grid → çok ucuz). */
function bfsNextStep(c){
  const sx=c.fx, sy=c.fy, tx=G.player.fx, ty=G.player.fy;
  if (sx===tx && sy===ty) return null;
  const idx=(x,y)=>y*W+x, start=idx(sx,sy);
  const prev=new Map(); prev.set(start,-1);
  const q=[[sx,sy]]; let head=0;
  const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
  while (head < q.length){
    const [x,y]=q[head++];
    if (x===tx && y===ty){                    // hedefe ulaştık: parent'ı start olan hücreye kadar geri izle
      let cur=idx(x,y), cx=x, cy=y;
      while (prev.get(cur) !== start){ cur=prev.get(cur); cx=cur%W; cy=(cur-cx)/W; }
      return { x:Math.sign(cx-sx), y:Math.sign(cy-sy) };
    }
    for (const d of dirs){
      const nx=x+d.x, ny=y+d.y;
      if (!wall(nx,ny) && !prev.has(idx(nx,ny))){ prev.set(idx(nx,ny), idx(x,y)); q.push([nx,ny]); }
    }
  }
  return null;
}
function cloudChooser(c){
  if (performance.now() < G.frozenUntil){ c.dir={x:0,y:0}; return; }
  const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].filter(d=>!wall(c.fx+d.x,c.fy+d.y));
  if (!dirs.length){ c.dir={x:0,y:0}; return; }
  if (Math.random() < 0.7){                   // çoğunlukla oyuncuyu KOVALA (gerçek yol bulma)
    const step = bfsNextStep(c);
    if (step && (step.x||step.y)){ c.dir = step; return; }
  }
  const noBack = dirs.filter(d => !(d.x===-c.dir.x && d.y===-c.dir.y));  // kalan %30: serbest dolaş (geri dönme)
  c.dir = pick(noBack.length?noBack:dirs);
}
function loop(ts){
  if (G.state!=='playing'){ G.raf=0; return; }
  const dt = Math.min(0.05,(ts-G.lastTs)/1000||0.016);
  G.lastTs = ts;
  const T = CONFIG.TIERS[G.tier];
  stepEntity(G.player, CONFIG.PLAYER_SPEED, dt, playerChooser);
  for (const c of G.clouds) stepEntity(c, T.cloudSpeed, dt, cloudChooser);
  // harf toplama
  for (let i=G.letters.length-1;i>=0;i--){
    const L = G.letters[i];
    if (Math.abs(L.x-G.player.x)<0.4 && Math.abs(L.y-G.player.y)<0.4){
      const need = G.word[G.progress];
      if (L.L === need){
        G.letters.splice(i,1);
        G.progress++;
        Audio2.pick(G.progress);
        renderWordLine();
        if (G.progress >= G.word.length){
          G.score += G.word.length * CONFIG.LETTER_POINT;   // harf × 40 (§4.17)
          G.wordsDone++;
          Audio2.word();
          refreshHUD();
          if (G.wordsDone >= CONFIG.WORDS_PER_LEVEL) return endRound(true);
          placeWord();
        }
      } else {
        // yanlış harfe değdin: sıra sıfırlanır, harfler geri gelir (§4.17)
        Audio2.bad();
        G.progress = 0;
        placeWordSamePositions();
      }
      break;
    }
  }
  // kapsül
  if (G.capsule && Math.abs(G.capsule.x-G.player.x)<0.4 && Math.abs(G.capsule.y-G.player.y)<0.4){
    G.capsule = null;
    G.frozenUntil = performance.now() + CONFIG.FREEZE_MS;   // 5 sn dondurur (§4.17)
    Audio2.cap();
  }
  // bulut teması: 3 sn kontrol ters (§4.17 — korkutmaz!)
  if (performance.now() >= G.frozenUntil){
    for (const c of G.clouds){
      if (Math.abs(c.x-G.player.x)<0.5 && Math.abs(c.y-G.player.y)<0.5){
        if (performance.now() >= G.reversedUntil){
          G.reversedUntil = performance.now() + CONFIG.REVERSE_MS;
          Audio2.cloud();
        }
      }
    }
  }
  draw(ts);
  G.raf = requestAnimationFrame(loop);
}
function placeWordSamePositions(){
  // yanlış harf: AYNI kelime, sıra sıfır, harfler yeniden serpilir (§4.17)
  G.progress = 0;
  scatterLetters();
}
function draw(ts){
  const c = G.cell;
  ctx2.fillStyle = '#0a1326';
  ctx2.fillRect(0,0,cv.width,cv.height);
  // duvarlar
  for (let y=0;y<H;y++) for (let x=0;x<W;x++){
    if (G.map[y][x]==='1'){
      ctx2.fillStyle = '#1d3a6e';
      ctx2.fillRect(x*c+1, y*c+1, c-2, c-2);
      ctx2.strokeStyle = '#2a4a8a';
      ctx2.lineWidth = 1.5;
      ctx2.strokeRect(x*c+2.5, y*c+2.5, c-5, c-5);
    }
  }
  // harfler
  ctx2.textAlign='center'; ctx2.textBaseline='middle';
  for (const L of G.letters){
    const need = G.word[G.progress] === L.L;
    ctx2.beginPath(); ctx2.arc(L.x*c+c/2, L.y*c+c/2, c*0.34, 0, 7);
    ctx2.fillStyle = need ? 'rgba(255,210,63,.95)' : 'rgba(255,255,255,.82)';
    ctx2.fill();
    if (need){ ctx2.strokeStyle='#fff'; ctx2.lineWidth=2.5; ctx2.stroke(); }
    ctx2.fillStyle = '#16264a';
    ctx2.font = `900 ${Math.round(c*0.42)}px system-ui`;
    ctx2.fillText(L.L, L.x*c+c/2, L.y*c+c/2+1);
  }
  // kapsül
  if (G.capsule){
    ctx2.font = `${Math.round(c*0.6)}px system-ui`;
    ctx2.fillText('⚡', G.capsule.x*c+c/2, G.capsule.y*c+c/2);
  }
  // bulutlar
  const frozen = performance.now() < G.frozenUntil;
  for (const cl of G.clouds){
    ctx2.globalAlpha = frozen ? 0.45 : 1;
    ctx2.font = `${Math.round(c*0.74)}px system-ui`;
    ctx2.fillText(frozen ? '🧊' : '🌫️', cl.x*c+c/2, cl.y*c+c/2);
    ctx2.globalAlpha = 1;
  }
  // oyuncu
  const rev = performance.now() < G.reversedUntil;
  ctx2.font = `${Math.round(c*0.74)}px system-ui`;
  ctx2.fillText(rev ? '😵' : '😋', G.player.x*c+c/2, G.player.y*c+c/2);
  ctx2.textBaseline='alphabetic';
}
function endRound(win){
  if (G.state!=='playing') return;
  G.state='result';
  STATS.plays++; STATS.words += G.wordsDone;
  const isBest = G.score > (STATS.best[G.tier]||0);
  if (isBest) STATS.best[G.tier] = G.score;
  saveStats();
  BilnetBridge.submitScore({ gameId:'labirent-avcisi', score:G.score, tier:G.tier,
    stats:{ words:G.wordsDone } });
  $('resEmoji').textContent = isBest ? '🏆' : '🟡';
  $('resTitle').textContent = win ? 'Bölüm Tamam!' : 'Tur Bitti!';
  $('resScore').textContent = G.score;
  $('resStats').innerHTML = `📚 Tamamlanan kelime: <b>${G.wordsDone}/${CONFIG.WORDS_PER_LEVEL}</b>` +
    (isBest?`<br>🏅 <b>YENİ REKOR!</b>`:'');
  $('eduLine').textContent = G.wordsDone>0 ? `${G.wordsDone} kelimeyi HARF SIRASIYLA topladın — yazım hafızan güçleniyor! 🎓` : 'Labirenti keşfettin — tekrar dene! 💪';
  if (win) Audio2.fanfare();
  show('screen-result');
  refreshBest();
}
function refreshBest(){
  const b = STATS.best[G.tier]||0;
  $('bestLine').textContent = b>0 ? `🏅 ${['','Etek','Yamaç','Tırmanış','Zirve'][G.tier]} rekorun: ${b}` : '';
}
/* giriş: swipe yön değiştirme (§4.17) + ok tuşları */
let touchStart=null;
cv.addEventListener('pointerdown', e=>{ touchStart={x:e.clientX,y:e.clientY}; });
cv.addEventListener('pointerup', e=>{
  if (!touchStart) return;
  const dx=e.clientX-touchStart.x, dy=e.clientY-touchStart.y;
  touchStart=null;
  if (Math.abs(dx)<16 && Math.abs(dy)<16) return;
  G.player.want = Math.abs(dx)>Math.abs(dy) ? {x:Math.sign(dx),y:0} : {x:0,y:Math.sign(dy)};
});
addEventListener('keydown', e=>{
  const m={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},
           KeyW:{x:0,y:-1},KeyS:{x:0,y:1},KeyA:{x:-1,y:0},KeyD:{x:1,y:0}};
  if (m[e.code]){ e.preventDefault(); G.player.want=m[e.code]; }
  if ((e.code==='KeyP'||e.code==='Escape')&&G.state==='playing') pauseGame();
});
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
$('bQuit').addEventListener('click',()=>{ $('pauseVeil').classList.remove('show'); G.state='menu'; show('screen-menu'); refreshBest(); });
EduKit.onHidden(() => { if (G.state === 'playing'){ pauseGame(); saveStats(); } });   // gizlenince duraklat, pagehide'da da kaydet
addEventListener('resize',()=>{ if(G.state==='playing') layout(); });
loadStats();
