"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.11 — aynen) ================= */
const CONFIG = {
  TIERS: {
    1: { cols: 3, rows: 4, pairs: 6 },
    2: { cols: 4, rows: 4, pairs: 8 },
    3: { cols: 4, rows: 5, pairs: 10, moveLimit: true },   // hamle sınırı
    4: { cols: 5, rows: 6, pairs: 15, timeLimit: 120 },     // süre sınırı 120 sn
  },
  STAR3_FACTOR: 1.5,            // 3⭐ = çift sayısı × 1.5 hamleden az
  PAIR_POINT: 50,               // 50/çift
  MOVE_BONUS: 8,                // kalan hamle bonusu (sınırlı modlarda)
  USTA_PREVIEW_MS: 3000,        // usta modu: 3 sn açık gösterim
  MOVE_LIMIT_FACTOR: 2.4,       // hamle sınırı = çift × 2.4
};
/* İLİŞKİLİ çift havuzları (özdeş değil!) */
const POOLS = {
  en: [ ['cat','🐱'],['dog','🐶'],['sun','☀️'],['fish','🐟'],['bird','🐦'],['apple','🍎'],['book','📖'],
        ['star','⭐'],['tree','🌳'],['car','🚗'],['house','🏠'],['moon','🌙'],['bee','🐝'],['key','🔑'],
        ['milk','🥛'],['rain','🌧️'],['shoe','👟'],['ball','⚽'],['cake','🎂'],['ship','🚢'] ],
  mat: [ ['7×8','56'],['6×6','36'],['9×4','36✱'],['12+19','31'],['45−18','27'],['8×9','72'],['54÷6','9'],
         ['5×7','35'],['13+28','41'],['72÷8','9✱'],['11×3','33'],['90−47','43'],['6×9','54'],['64÷8','8'],
         ['25+36','61'],['100−55','45'],['7×7','49'],['81÷9','9✦'],['4×12','48'],['15+47','62'] ],
  fen: [ ['Buharlaşma','💧→☁️'],['Donma','💧→🧊'],['Erime','🧊→💧'],['Yağmur','☁️→💧'],['Fotosentez','🌿+☀️'],
         ['Mıknatıs','🧲'],['Yerçekimi','🍎⬇️'],['Güneş','☀️'],['Ay','🌙'],['Kalp','🫀'],['Akciğer','🫁'],
         ['Omurgalı','🐟'],['Omurgasız','🐛'],['Işık','💡'],['Ses','🔔'],['Geri dönüşüm','♻️'],
         ['Gezegen','🪐'],['Tohum','🌱'],['Enerji','⚡'],['Bulut','☁️'] ],
};
const { shuffle } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return { init,
    flip: () => tone(420,0.07,'square',0.04),
    match: () => { tone(660,0.1,'triangle',0.07); tone(880,0.13,'triangle',0.07,0.09); },
    miss: () => tone(200,0.18,'sawtooth',0.04),
    fanfare: () => [523,659,784,1046].forEach((f,i)=>tone(f,0.16,'triangle',0.07,i*0.12)) };
})();

/* ================= Bridge + İstatistik ================= */
const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(p){ const rec={...p,ts:Date.now()};
    try{ const r=await window.storage.get(this.QUEUE_KEY); const q=r&&r.value?JSON.parse(r.value):[];
      q.push(rec); while(q.length>50)q.shift(); await window.storage.set(this.QUEUE_KEY,JSON.stringify(q)); }catch(e){} },
};
const STATS_KEY = 'eslestirme_stats';
let STATS = { plays:0, pairs:0, best:{1:0,2:0,3:0,4:0} };
function loadStats(){ try{ window.storage.get(STATS_KEY).then(r=>{ if(r&&r.value){ try{ STATS=Object.assign(STATS,JSON.parse(r.value)); }catch(e){} } refreshBest(); }); }catch(e){} }
function saveStats(){ try{ window.storage.set(STATS_KEY,JSON.stringify(STATS)); }catch(e){} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const G = { state:'menu', tier:1, ders:'en', usta:false,
  moves:0, found:0, pairs:6, open:[], lock:false,
  moveLimit:0, timeLeft:0, secT:null, score:0 };

function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show')); $(id).classList.add('show'); }
function refreshHUD(){
  $('moveChip').textContent = '👆 ' + G.moves + (G.moveLimit ? '/'+G.moveLimit : '');
  $('pairChip').textContent = `✅ ${G.found}/${G.pairs}`;
  const lc = $('limitChip');
  if (G.timeLeft > 0){ lc.style.display=''; lc.textContent = '⏱️ ' + G.timeLeft; } else lc.style.display='none';
}
function startRound(){
  G.roundTok = (G.roundTok||0) + 1;   // tur jetonu: eski turun bekleyen zamanlayıcıları yok sayılır
  const T = CONFIG.TIERS[G.tier];
  G.state='playing'; G.moves=0; G.found=0; G.pairs=T.pairs; G.open=[]; G.lock=false; G.score=0;
  G.moveLimit = T.moveLimit ? Math.round(T.pairs * CONFIG.MOVE_LIMIT_FACTOR) : 0;
  G.timeLeft = T.timeLimit || 0;
  show('screen-game');
  // kartları kur
  const pool = shuffle(POOLS[G.ders].slice()).slice(0, T.pairs);
  const cards = shuffle(pool.flatMap((p,i) => [
    { pid:i, side:0, text:p[0] }, { pid:i, side:1, text:p[1] } ]));
  const wrap = $('boardWrap').getBoundingClientRect();
  const cw = Math.min(Math.floor((wrap.width-16-(T.cols-1)*8)/T.cols), 110);
  const ch = Math.min(Math.floor((wrap.height-16-(T.rows-1)*8)/T.rows), 110);
  const board = $('board');
  board.style.gridTemplateColumns = `repeat(${T.cols}, ${cw}px)`;
  board.innerHTML = '';
  cards.forEach(c => {
    const el = document.createElement('div');
    el.className = 'cardC' + (c.side ? ' t2' : '');
    el.style.width = cw+'px'; el.style.height = ch+'px';
    const isEmoji = /\p{Extended_Pictographic}/u.test(c.text);
    el.innerHTML = `<div class="cardI">
      <div class="face back">❔</div>
      <div class="face front" style="font-size:${isEmoji ? Math.round(ch*0.5) : Math.max(13, Math.min(20, Math.round(cw*1.5/Math.max(3,c.text.length))))}px">${c.text}</div>
    </div>`;
    el.addEventListener('click', () => flip(el, c));
    board.appendChild(el);
  });
  refreshHUD();
  clearInterval(G.secT);
  if (G.timeLeft > 0){
    G.secT = setInterval(() => {
      if (G.state!=='playing' || document.hidden) return;
      G.timeLeft--; refreshHUD();
      if (G.timeLeft<=0) endRound(false);
    }, 1000);
  }
  // usta modu: 3 sn ön gösterim
  if (G.usta){
    G.lock = true;
    [...board.children].forEach(el => el.classList.add('open'));
    const roundTok = G.roundTok;   // menüye dönüp yeni tur başlatılırsa bayat zamanlayıcı çalışmasın
    setTimeout(() => { if (roundTok !== G.roundTok) return; [...board.children].forEach(el => el.classList.remove('open')); G.lock=false; }, CONFIG.USTA_PREVIEW_MS);
  }
}
function flip(el, c){
  if (G.state!=='playing' || G.lock || el.classList.contains('open') || el.classList.contains('matched')) return;
  Audio2.init(); Audio2.flip();
  el.classList.add('open');
  G.open.push({ el, c });
  if (G.open.length === 2){
    G.moves++;
    const [a,b] = G.open;
    if (a.c.pid === b.c.pid){
      a.el.classList.add('matched'); b.el.classList.add('matched');
      a.el.classList.remove('open'); b.el.classList.remove('open');
      G.found++;
      Audio2.match();
      G.open = [];
      refreshHUD();
      if (G.found >= G.pairs) endRound(true);
      else if (G.moveLimit && G.moves >= G.moveLimit) endRound(false);
    } else {
      G.lock = true;
      Audio2.miss();
      const tok = G.roundTok;
      setTimeout(() => {
        a.el.classList.remove('open'); b.el.classList.remove('open');
        if (tok !== G.roundTok || G.state !== 'playing') return;   // eski turun zamanlayıcısı yeni turun G.open'ını silmesin
        G.open = []; G.lock = false;
        refreshHUD();
        if (G.moveLimit && G.moves >= G.moveLimit) endRound(false);
      }, 750);
    }
    refreshHUD();
  }
}
function endRound(win){
  if (G.state!=='playing') return;
  G.state='result';
  clearInterval(G.secT);
  // yıldız: 3⭐ = çift×1.5 hamleden az (§4.11)
  const th3 = Math.ceil(G.pairs * CONFIG.STAR3_FACTOR);
  const stars = !win ? (G.found >= G.pairs*0.6 ? 1 : 0)
    : G.moves <= th3 ? 3 : G.moves <= th3 + G.pairs ? 2 : 1;
  const moveBonus = G.moveLimit ? Math.max(0, G.moveLimit - G.moves) * CONFIG.MOVE_BONUS : 0;
  G.score = G.found * CONFIG.PAIR_POINT + moveBonus;
  STATS.plays++; STATS.pairs += G.found;
  const isBest = G.score > (STATS.best[G.tier]||0);
  if (isBest) STATS.best[G.tier] = G.score;
  saveStats();
  BilnetBridge.submitScore({ gameId:'eslestirme-ustasi', score:G.score, tier:G.tier,
    stats:{ pairs:G.found, moves:G.moves, stars, ders:G.ders } });
  $('resEmoji').textContent = stars===3 ? '🏆' : win ? '🃏' : '💪';
  $('resTitle').textContent = win ? 'Tamamlandı!' : (G.timeLeft<=0 ? 'Süre Doldu!' : 'Hamleler Bitti!');
  $('resStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3-stars);
  $('resScore').textContent = G.score;
  $('resStats').innerHTML = `✅ Çift: <b>${G.found}/${G.pairs}</b> · 👆 Hamle: <b>${G.moves}</b>${G.moveLimit?'/'+G.moveLimit:''}` +
    (moveBonus?` · 🎁 Bonus: <b>+${moveBonus}</b>`:'') +
    (isBest?`<br>🏅 <b>YENİ REKOR!</b>`:'');
  $('eduLine').textContent = G.found>0 ? `Bugün ${G.found} bilgi çifti eşleştirdin! 🎉` : 'Hafızanı ısıttın — tekrar dene! 💪';
  if (stars===3) Audio2.fanfare();
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
document.querySelectorAll('.dersBtn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.dersBtn').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); G.ders=b.dataset.d;
}));
$('bPlay').addEventListener('click',()=>{ Audio2.init(); G.usta=$('ustaChk').checked; startRound(); });
$('bAgain').addEventListener('click',startRound);
$('bMenu').addEventListener('click',()=>{ G.state='menu'; show('screen-menu'); refreshBest(); });
$('bQuitTop').addEventListener('click',()=>{ clearInterval(G.secT); G.state='menu'; show('screen-menu'); refreshBest(); });
EduKit.onHidden(saveStats);   // gizlenince ve pagehide'da kaydet
loadStats();
