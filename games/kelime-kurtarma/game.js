"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.12 — aynen) ================= */
const CONFIG = {
  BALLOONS: { 1: 8, 2: 6, 3: 5, 4: 4 },     // balon hakkı
  WORD_POINT: (len, left) => len * 20 + left * 15,   // harf×20 + kalan balon×15
  JOKER_PER_ROUND: 1,                        // 1 harf açma jokeri
};
/* Kelime havuzları: t1-t2 TR resimli, t3 EN tanımlı, t4 TR deyim tamamlama */
const WORDS = {
  1: [ // 3-4 harf TR + resim ipucu
    { w:'KEDİ', hint:'🐱 Hayvan — miyav der', tr:true }, { w:'KUŞ', hint:'🐦 Hayvan — gökyüzünde uçar', tr:true },
    { w:'ELMA', hint:'🍎 Meyve — kırmızı ya da yeşil', tr:true }, { w:'TOP', hint:'⚽ Oyuncak — zıplar', tr:true },
    { w:'SÜT', hint:'🥛 İçecek — kemikleri güçlendirir', tr:true }, { w:'AY', hint:'🌙 Gökyüzünde — geceleri parlar', tr:true },
    { w:'BUZ', hint:'🧊 Çok soğuk — donmuş su', tr:true }, { w:'GÜL', hint:'🌹 Çiçek — dikenli', tr:true },
    { w:'ARI', hint:'🐝 Böcek — bal yapar', tr:true }, { w:'EV', hint:'🏠 İçinde yaşarız', tr:true },
    { w:'KAR', hint:'❄️ Kışın yağar — bembeyaz', tr:true }, { w:'BAL', hint:'🍯 Arılar yapar — tatlı', tr:true },
  ],
  2: [ // 5-6 harf TR
    { w:'KALEM', hint:'✏️ Okul eşyası — onunla yazarız', tr:true }, { w:'ÇİÇEK', hint:'🌸 Bahçede açar — güzel kokar', tr:true },
    { w:'BALIK', hint:'🐟 Suda yaşar — solungaçla solur', tr:true }, { w:'YILDIZ', hint:'⭐ Geceleri gökyüzünde parlar', tr:true },
    { w:'ORMAN', hint:'🌳 Ağaçlarla dolu yer', tr:true }, { w:'GÜNEŞ', hint:'☀️ Dünyamızı ısıtır ve aydınlatır', tr:true },
    { w:'TAVŞAN', hint:'🐰 Havuç sever — uzun kulaklı', tr:true }, { w:'OYUNCAK', hint:'🧸 Çocuklar onunla oynar', tr:true },
    { w:'KİTAP', hint:'📖 Okuruz — bilgi dolu', tr:true }, { w:'DENİZ', hint:'🌊 Tuzlu su — yüzeriz', tr:true },
  ],
  3: [ // EN spelling — tanım var, resim YOK (Zirve kuralı buraya da yaklaşır ama tanım+EN)
    { w:'APPLE', hint:"🇬🇧 'elma' — İngilizcesini yaz" }, { w:'WATER', hint:"🇬🇧 'su' — İngilizcesini yaz" },
    { w:'HOUSE', hint:"🇬🇧 'ev' — İngilizcesini yaz" }, { w:'SCHOOL', hint:"🇬🇧 'okul' — İngilizcesini yaz" },
    { w:'ORANGE', hint:"🇬🇧 'portakal' — İngilizcesini yaz" }, { w:'YELLOW', hint:"🇬🇧 'sarı' — İngilizcesini yaz" },
    { w:'RABBIT', hint:"🇬🇧 'tavşan' — İngilizcesini yaz" }, { w:'FLOWER', hint:"🇬🇧 'çiçek' — İngilizcesini yaz" },
    { w:'WINTER', hint:"🇬🇧 'kış' — İngilizcesini yaz" }, { w:'MONKEY', hint:"🇬🇧 'maymun' — İngilizcesini yaz" },
  ],
  4: [ // TR deyim/atasözü tamamlama (eksik kelimeyi bul)
    { w:'GÖL', hint:'📜 "Damlaya damlaya ___ olur."', tr:true },
    { w:'DEMİR', hint:'📜 "___ tavında dövülür."', tr:true },
    { w:'BAL', hint:'📜 "Tatlı dil yılanı deliğinden çıkarır; ___ tutan parmağını yalar."', tr:true },
    { w:'AĞAÇ', hint:'📜 "___ yaşken eğilir."', tr:true },
    { w:'TENCERE', hint:'📜 "___ yuvarlanmış kapağını bulmuş."', tr:true },
    { w:'SAKLA', hint:'📜 "___ samanı gelir zamanı." (ipucu: fiil)', tr:true },
    { w:'DOST', hint:'📜 "İyi ___ kara günde belli olur."', tr:true },
    { w:'EMEK', hint:'📜 "___ olmadan yemek olmaz."', tr:true },
  ],
};
const TR_LETTERS = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');
const EN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const HEROES = ['🐻','🐰','🐱','🦊','🐼'];
const { pick } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return { init,
    hit: () => { tone(660,0.1,'triangle',0.07); tone(880,0.12,'triangle',0.06,0.08); },
    pop: () => tone(180,0.2,'sawtooth',0.06),
    win: () => [523,659,784,1046].forEach((f,i)=>tone(f,0.15,'triangle',0.07,i*0.11)),
    chute: () => { tone(400,0.2,'sine',0.05); tone(330,0.25,'sine',0.05,0.18); tone(290,0.3,'sine',0.04,0.38); } };
})();

const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(p){ const rec={...p,ts:Date.now()};
    try{ const r=await window.storage.get(this.QUEUE_KEY); const q=r&&r.value?JSON.parse(r.value):[];
      q.push(rec); while(q.length>50)q.shift(); await window.storage.set(this.QUEUE_KEY,JSON.stringify(q)); }catch(e){} },
};
const STATS_KEY = 'kelimekurtarma_stats';
let STATS = { plays:0, saved:0, best:{1:0,2:0,3:0,4:0} };
function loadStats(){ try{ window.storage.get(STATS_KEY).then(r=>{ if(r&&r.value){ try{ STATS=Object.assign(STATS,JSON.parse(r.value)); }catch(e){} } refreshBest(); }); }catch(e){} }
function saveStats(){ try{ window.storage.set(STATS_KEY,JSON.stringify(STATS)); }catch(e){} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const G = { state:'menu', tier:1, word:null, revealed:new Set(), balloons:8, joker:1,
  score:0, words:0, usedWords:new Set() };
const upperTr = s => s.toLocaleUpperCase('tr-TR');

function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show')); $(id).classList.add('show'); }
function refreshHUD(){
  $('scoreChip').textContent = '⭐ ' + G.score;
  $('balChip').textContent = '🎈 ' + G.balloons;
  $('wordChip').textContent = '📚 ' + G.words;
}
function newWord(){
  clearTimeout(loseTimer);
  let pool = WORDS[G.tier].filter(w => !G.usedWords.has(w.w));
  if (!pool.length){ G.usedWords.clear(); pool = WORDS[G.tier]; }
  G.word = pick(pool);
  G.usedWords.add(G.word.w);
  G.revealed = new Set();
  G.balloons = CONFIG.BALLOONS[G.tier];
  G.joker = CONFIG.JOKER_PER_ROUND;
  G.state = 'playing';
  $('hero').textContent = pick(HEROES);
  $('balloonGuy').style.transform = '';
  $('hintBox').textContent = '💡 ' + G.word.hint + ` (${G.word.w.length} harf)`;
  renderBalloons(); renderWord(); renderKb();
  refreshHUD();
}
function renderBalloons(){
  const cols = ['🎈','🟠','🔴','🟡','🟢','🔵','🟣','🩷'];
  $('balloons').innerHTML = Array.from({length:G.balloons},(_,i)=>`<span class="bal">${i%2?'🎈':'🎈'}</span>`).join('');
}
function renderWord(){
  $('wordRow').innerHTML = G.word.w.split('').map(ch =>
    ch === ' ' ? '<div class="slot sp"></div>' :
    `<div class="slot">${G.revealed.has(ch) ? ch : ''}</div>`).join('');
}
function renderKb(){
  const letters = G.word.tr ? TR_LETTERS : EN_LETTERS;
  const kb = $('kb');
  kb.innerHTML = '';
  letters.forEach(L => {
    const b = document.createElement('button');
    b.className = 'key'; b.textContent = L;
    b.addEventListener('click', () => guess(L, b));
    kb.appendChild(b);
  });
  const j = document.createElement('button');
  j.id = 'jokerBtn'; j.textContent = `🃏 Harf Aç (${G.joker})`;
  j.addEventListener('click', useJoker);
  kb.appendChild(j);
}
function guess(L, btn){
  if (G.state !== 'playing' || btn.disabled) return;
  Audio2.init();
  btn.disabled = true;
  if (G.word.w.includes(L)){
    btn.classList.add('hit');
    G.revealed.add(L);
    Audio2.hit();
    renderWord();
    if (G.word.w.split('').every(ch => ch === ' ' || G.revealed.has(ch))) winWord();
  } else {
    btn.classList.add('missK');
    G.balloons--;
    Audio2.pop();
    const bals = $('balloons').children;
    // Balon i = G.balloons (0 tabanlı): art arda iki yanlışta ikisi de ayrı balonu patlatır
    if (bals[G.balloons]) { bals[G.balloons].classList.add('pop'); setTimeout(renderBalloons, 320); }
    refreshHUD();
    if (G.balloons <= 0) loseWord();
  }
}
function useJoker(){
  if (G.state !== 'playing' || G.joker <= 0) return;
  const hidden = [...new Set(G.word.w.split(''))].filter(ch => ch !== ' ' && !G.revealed.has(ch));
  if (!hidden.length) return;
  G.joker--;
  const L = pick(hidden);
  G.revealed.add(L);
  [...$('kb').children].forEach(b => { if (b.textContent === L){ b.disabled = true; b.classList.add('hit'); } });
  document.getElementById('jokerBtn').textContent = `🃏 Harf Aç (${G.joker})`;
  Audio2.hit();
  renderWord();
  if (G.word.w.split('').every(ch => ch === ' ' || G.revealed.has(ch))) winWord();
}
function winWord(){
  G.state = 'result';
  const pts = CONFIG.WORD_POINT(G.word.w.length, G.balloons);   // harf×20 + kalan balon×15 (§4.12)
  G.score += pts; G.words++;
  STATS.saved++;
  endScreen(true, pts);
}
let loseTimer = null;
function loseWord(){
  G.state = 'result';
  // YUMUŞAK kayıp: karakter düşmez, paraşütle süzülür (§4.12)
  Audio2.chute();
  $('hero').textContent = '🪂';
  $('balloonGuy').style.transform = 'translateY(46vh)';
  // Paraşüt inerken 🏠 → BAŞLA yapılırsa eski zamanlayıcı yeni turu sonuç ekranına kesmesin
  clearTimeout(loseTimer);
  loseTimer = setTimeout(() => { if (G.state === 'result') endScreen(false, 0); }, 1500);
}
function endScreen(win, pts){
  STATS.plays++;
  const isBest = G.score > (STATS.best[G.tier]||0);
  if (isBest) STATS.best[G.tier] = G.score;
  saveStats();
  BilnetBridge.submitScore({ gameId:'kelime-kurtarma', score:G.score, tier:G.tier,
    stats:{ words:G.words, lastWord:G.word.w, win } });
  $('resEmoji').textContent = win ? '🎉' : '🪂';
  $('resTitle').textContent = win ? `${G.word.w} — Kurtarıldı!` : 'Yumuşak İniş!';
  $('resScore').textContent = G.score;
  $('resStats').innerHTML = (win
    ? `🎈 Kalan balon: <b>${G.balloons}</b> · ⭐ Bu kelime: <b>+${pts}</b>`
    : `Kelime <b>${G.word.w}</b> idi — paraşüt açıldı, kimseye bir şey olmadı! 😊`) +
    `<br>📚 Bu turda kurtarılan: <b>${G.words}</b> kelime` +
    (isBest ? `<br>🏅 <b>YENİ REKOR!</b>` : '');
  $('eduLine').textContent = G.words > 0 ? `Bugün ${G.words} kelimenin yazılışını çalıştın! 🎓` : 'Harfleri ısıttın — yeni kelime seni bekliyor! 💪';
  if (win) Audio2.win();
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
$('bPlay').addEventListener('click',()=>{ Audio2.init(); G.score=0; G.words=0; show('screen-game'); newWord(); });
$('bAgain').addEventListener('click',()=>{ show('screen-game'); newWord(); });
$('bMenu').addEventListener('click',()=>{ G.state='menu'; show('screen-menu'); refreshBest(); });
$('bQuitTop').addEventListener('click',()=>{ G.state='menu'; show('screen-menu'); refreshBest(); });
// fiziksel klavye desteği
addEventListener('keydown', e => {
  if (G.state !== 'playing') return;
  if (!e.key || e.key.length !== 1) return;
  // İngilizce kelimede klavye ASCII: küçük "i" tr-TR ile "İ" olur ve I tuşuyla eşleşmezdi
  const L = G.word.tr ? upperTr(e.key) : e.key.toUpperCase().replace('İ', 'I');
  const btn = [...$('kb').children].find(b => b.textContent === L && !b.disabled && b.className.includes('key'));
  if (btn) guess(L, btn);
});
EduKit.onHidden(saveStats);   // gizlenince ve pagehide'da kaydet
loadStats();
