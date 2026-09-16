"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.4 — aynen) ================= */
const CONFIG = {
  CASE_SEC: 90,           // vaka süresi
  FIND_POINT: 100,        // nesne bulma puanı
  WRONG_FREEZE: 5,        // yanlış tıklama: 5 sn donma (puan kaybı YOK)
  HINTS: 1,               // vaka başına 1 ipucu (nesne 2 sn parlar)
  TIME_BONUS_PER_SEC: 2,  // kalan süre bonusu
};

/* ================= SAHNELER (şema §4.4: objects[{e,x,y,s,cat}], quiz gömülü) ================= */
const SCENES = [
  { id: 'orman', ad: 'Orman Vakası', e: '🌳', tier: 1, bg: ['#9cd47a', '#3e7d3a'],
    gorev: 'omurgalı hayvanı', hedefCat: 'omurgali', hedefN: 5,
    objects: [
      { e: '🦊', x: 18, y: 70, s: 40, cat: 'omurgali' }, { e: '🐦', x: 35, y: 22, s: 32, cat: 'omurgali' },
      { e: '🐸', x: 62, y: 80, s: 34, cat: 'omurgali' }, { e: '🦉', x: 78, y: 18, s: 36, cat: 'omurgali' },
      { e: '🐿️', x: 50, y: 55, s: 32, cat: 'omurgali' },
      { e: '🦋', x: 28, y: 38, s: 30 }, { e: '🐜', x: 70, y: 64, s: 24 }, { e: '🐌', x: 44, y: 86, s: 28 },
      { e: '🕷️', x: 86, y: 44, s: 26 }, { e: '🌸', x: 12, y: 50, s: 30 }, { e: '🍄', x: 58, y: 68, s: 30 },
      { e: '🌲', x: 8, y: 24, s: 44 }, { e: '🌳', x: 90, y: 70, s: 44 }, { e: '🪨', x: 24, y: 88, s: 32 },
      { e: '🐛', x: 64, y: 36, s: 24 }, { e: '🍃', x: 40, y: 12, s: 26 },
    ],
    quiz: [
      { q: 'Omurgalı hayvanların ortak özelliği nedir?', o: ['Kanatları vardır', 'İskeletlerinde omurga bulunur', 'Hepsi suda yaşar', 'Hepsi et yer'], a: 1 },
      { q: 'Hangisi omurgasız bir hayvandır?', o: ['Tilki', 'Kurbağa', 'Kelebek', 'Baykuş'], a: 2 },
      { q: 'Kurbağa hangi grupta yer alır?', o: ['Sürüngenler', 'İki yaşamlılar', 'Kuşlar', 'Memeliler'], a: 1 },
    ] },
  { id: 'mutfak', ad: 'Mutfak Laboratuvarı', e: '🍳', tier: 1, bg: ['#ffe3b3', '#d99a55'],
    gorev: 'ısı kaynağını', hedefCat: 'isi', hedefN: 4,
    objects: [
      { e: '🔥', x: 22, y: 64, s: 38, cat: 'isi' }, { e: '🕯️', x: 70, y: 30, s: 34, cat: 'isi' },
      { e: '☀️', x: 88, y: 12, s: 38, cat: 'isi' }, { e: '🍳', x: 46, y: 58, s: 38, cat: 'isi' },
      { e: '🧊', x: 30, y: 30, s: 32 }, { e: '🥶', x: 80, y: 76, s: 32 }, { e: '🥛', x: 60, y: 80, s: 30 },
      { e: '🍎', x: 14, y: 42, s: 30 }, { e: '🥄', x: 38, y: 80, s: 28 }, { e: '🧂', x: 54, y: 22, s: 28 },
      { e: '🍞', x: 8, y: 80, s: 32 }, { e: '🫖', x: 64, y: 48, s: 32 }, { e: '🍋', x: 90, y: 50, s: 28 },
    ],
    quiz: [
      { q: 'Hangisi bir ısı kaynağıdır?', o: ['Buz', 'Güneş', 'Süt', 'Kaşık'], a: 1 },
      { q: 'Isı alan maddenin sıcaklığı genelde ne olur?', o: ['Düşer', 'Değişmez', 'Yükselir', 'Sıfırlanır'], a: 2 },
      { q: 'Buz ısı alınca ne olur?', o: ['Donar', 'Erir', 'Kaynar', 'Yok olur'], a: 1 },
    ] },
  { id: 'geridonusum', ad: 'Geri Dönüşüm Devriyesi', e: '♻️', tier: 2, bg: ['#bfe6c8', '#5e9e72'],
    gorev: 'geri dönüştürülebilir nesneyi', hedefCat: 'donusum', hedefN: 5,
    objects: [
      { e: '📰', x: 20, y: 30, s: 32, cat: 'donusum' }, { e: '🥤', x: 66, y: 26, s: 32, cat: 'donusum' },
      { e: '🍾', x: 40, y: 70, s: 34, cat: 'donusum' }, { e: '📦', x: 82, y: 60, s: 36, cat: 'donusum' },
      { e: '🥫', x: 14, y: 78, s: 30, cat: 'donusum' },
      { e: '🍌', x: 52, y: 42, s: 30 }, { e: '🍗', x: 30, y: 54, s: 28 }, { e: '🌿', x: 8, y: 50, s: 28 },
      { e: '🪨', x: 90, y: 30, s: 30 }, { e: '🍂', x: 58, y: 88, s: 28 }, { e: '♻️', x: 46, y: 12, s: 34 },
      { e: '🌻', x: 76, y: 84, s: 30 },
    ],
    quiz: [
      { q: 'Hangisi geri dönüştürülebilir?', o: ['Muz kabuğu', 'Cam şişe', 'Tavuk kemiği', 'Yaprak'], a: 1 },
      { q: 'Geri dönüşüm neden önemlidir?', o: ['Çöpleri artırır', 'Doğal kaynakları korur', 'Suyu kirletir', 'Enerji harcar'], a: 1 },
      { q: 'Kağıt hangi doğal kaynaktan üretilir?', o: ['Taş', 'Ağaç', 'Kum', 'Petrol'], a: 1 },
    ] },
  { id: 'uzay', ad: 'Uzay Üssü', e: '🚀', tier: 2, bg: ['#2a2a55', '#0a0a22'],
    gorev: 'gök cismini', hedefCat: 'gok', hedefN: 5,
    objects: [
      { e: '🌕', x: 20, y: 22, s: 38, cat: 'gok' }, { e: '⭐', x: 60, y: 14, s: 30, cat: 'gok' },
      { e: '🪐', x: 84, y: 32, s: 38, cat: 'gok' }, { e: '☄️', x: 38, y: 36, s: 32, cat: 'gok' },
      { e: '🌍', x: 70, y: 58, s: 38, cat: 'gok' },
      { e: '🚀', x: 14, y: 64, s: 38 }, { e: '🛰️', x: 48, y: 64, s: 32 }, { e: '👨‍🚀', x: 30, y: 80, s: 36 },
      { e: '📡', x: 86, y: 82, s: 32 }, { e: '🔭', x: 62, y: 84, s: 32 }, { e: '🛸', x: 8, y: 36, s: 30 },
    ],
    quiz: [
      { q: 'Dünya hangi gök cisminin etrafında döner?', o: ['Ay', 'Mars', 'Güneş', 'Jüpiter'], a: 2 },
      { q: "Dünya'nın doğal uydusu hangisidir?", o: ['Güneş', 'Ay', 'Venüs', 'Kuyruklu yıldız'], a: 1 },
      { q: 'Hangisi bir gezegendir?', o: ['Ay', 'Güneş', 'Satürn', 'Kuyruklu yıldız'], a: 2 },
    ] },
  { id: 'vucut', ad: 'Vücut Haritası', e: '🫀', tier: 3, bg: ['#ffd9d9', '#d98a8a'],
    gorev: 'iç organı', hedefCat: 'organ', hedefN: 4,
    objects: [
      { e: '🫀', x: 30, y: 30, s: 36, cat: 'organ' }, { e: '🫁', x: 64, y: 28, s: 36, cat: 'organ' },
      { e: '🧠', x: 46, y: 12, s: 36, cat: 'organ' }, { e: '🫘', x: 70, y: 86, s: 32, cat: 'organ' },
      { e: '🦠', x: 80, y: 70, s: 28 }, { e: '🍫', x: 16, y: 80, s: 28 }, { e: '👁️', x: 18, y: 18, s: 30 },
      { e: '👂', x: 78, y: 14, s: 30 }, { e: '🦷', x: 60, y: 50, s: 28 }, { e: '💪', x: 12, y: 50, s: 32 },
      { e: '🦴', x: 42, y: 72, s: 32 }, { e: '🥗', x: 54, y: 88, s: 30 }, { e: '🩺', x: 30, y: 56, s: 30 },
    ],
    quiz: [
      { q: 'Kanı vücuda pompalayan organ hangisidir?', o: ['Akciğer', 'Kalp', 'Mide', 'Beyin'], a: 1 },
      { q: 'Solunum hangi organla yapılır?', o: ['Kalp', 'Böbrek', 'Akciğer', 'Karaciğer'], a: 2 },
      { q: 'Vücudumuzun yönetim merkezi neresidir?', o: ['Mide', 'Beyin', 'Kemik', 'Deri'], a: 1 },
    ] },
  { id: 'deniz', ad: 'Derin Deniz', e: '🌊', tier: 3, bg: ['#7ec3ef', '#1c4a7e'],
    gorev: 'solungaçlı canlıyı', hedefCat: 'solungac', hedefN: 4,
    objects: [
      { e: '🐟', x: 24, y: 36, s: 32, cat: 'solungac' }, { e: '🦈', x: 64, y: 28, s: 40, cat: 'solungac' },
      { e: '🐠', x: 44, y: 60, s: 32, cat: 'solungac' }, { e: '🦞', x: 80, y: 78, s: 32, cat: 'solungac' },
      { e: '🐬', x: 16, y: 16, s: 38 }, { e: '🐢', x: 86, y: 40, s: 34 }, { e: '🐙', x: 32, y: 80, s: 36 },
      { e: '🦭', x: 56, y: 12, s: 34 }, { e: '🪸', x: 10, y: 84, s: 32 }, { e: '🐚', x: 66, y: 88, s: 28 },
      { e: '⚓', x: 90, y: 14, s: 30 }, { e: '🤿', x: 48, y: 34, s: 30 },
    ],
    quiz: [
      { q: 'Balıklar suda nasıl solunum yapar?', o: ['Akciğerle', 'Solungaçla', 'Deriyle', 'Burunla'], a: 1 },
      { q: 'Hangisi memeli bir deniz canlısıdır?', o: ['Köpek balığı', 'Yunus', 'Hamsi', 'İstakoz'], a: 1 },
      { q: 'Yunus nefes almak için ne yapar?', o: ['Hiç nefes almaz', 'Su yüzeyine çıkar', 'Solungaç kullanır', 'Kumda bekler'], a: 1 },
    ] },
  { id: 'hava', ad: 'Hava Durumu Merkezi', e: '⛅', tier: 4, bg: ['#cfe8ff', '#7da9cf'],
    gorev: 'su döngüsü ögesini', hedefCat: 'dongu', hedefN: 4,
    objects: [
      { e: '☁️', x: 30, y: 18, s: 38, cat: 'dongu' }, { e: '🌧️', x: 60, y: 26, s: 36, cat: 'dongu' },
      { e: '💧', x: 44, y: 56, s: 30, cat: 'dongu' }, { e: '🌫️', x: 14, y: 40, s: 34, cat: 'dongu' },
      { e: '🌈', x: 74, y: 50, s: 38 }, { e: '☀️', x: 10, y: 12, s: 36 }, { e: '❄️', x: 88, y: 72, s: 30 },
      { e: '🌪️', x: 26, y: 76, s: 34 }, { e: '🌡️', x: 56, y: 82, s: 30 }, { e: '⚡', x: 70, y: 70, s: 28 },
      { e: '🪁', x: 42, y: 34, s: 28 }, { e: '⛈️', x: 84, y: 16, s: 36 },
    ],
    quiz: [
      { q: 'Su buharlaşınca ne oluşur?', o: ['Buz', 'Su buharı', 'Kar', 'Dolu'], a: 1 },
      { q: 'Bulutlar nasıl oluşur?', o: ['Su buharının yoğuşmasıyla', 'Rüzgarın esmesiyle', 'Güneşin batmasıyla', 'Yıldırımla'], a: 0 },
      { q: 'Su döngüsünün enerji kaynağı nedir?', o: ['Ay', 'Rüzgar', 'Güneş', 'Toprak'], a: 2 },
    ] },
  { id: 'elektrik', ad: 'Elektrik Atölyesi', e: '💡', tier: 4, bg: ['#fff3c4', '#c2a64e'],
    gorev: 'elektrikle çalışan aleti', hedefCat: 'elektrik', hedefN: 5,
    objects: [
      { e: '💡', x: 20, y: 20, s: 34, cat: 'elektrik' }, { e: '📺', x: 64, y: 30, s: 38, cat: 'elektrik' },
      { e: '🔌', x: 40, y: 60, s: 32, cat: 'elektrik' }, { e: '💻', x: 82, y: 64, s: 36, cat: 'elektrik' },
      { e: '🤖', x: 14, y: 70, s: 36, cat: 'elektrik' },
      { e: '🕯️', x: 50, y: 18, s: 30 }, { e: '📚', x: 30, y: 42, s: 30 }, { e: '✂️', x: 70, y: 84, s: 28 },
      { e: '🪵', x: 88, y: 20, s: 30 }, { e: '🧹', x: 8, y: 44, s: 30 }, { e: '⚽', x: 52, y: 86, s: 30 },
      { e: '🔋', x: 66, y: 56, s: 28 },
    ],
    quiz: [
      { q: 'Hangisi elektrikle çalışır?', o: ['Mum', 'Süpürge', 'Televizyon', 'Kitap'], a: 2 },
      { q: 'Elektrik enerjisi ampulde hangi enerjiye dönüşür?', o: ['Ses', 'Işık', 'Hareket', 'Rüzgar'], a: 1 },
      { q: 'Prizle oynamak neden tehlikelidir?', o: ['Gürültü yapar', 'Elektrik çarpabilir', 'Işık söner', 'Koku yapar'], a: 1 },
    ] },
];

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return {
    init,
    find: () => { tone(700, 0.09, 'triangle', 0.07); tone(950, 0.12, 'triangle', 0.07, 0.08); },
    freeze: () => { tone(220, 0.3, 'sawtooth', 0.05); tone(180, 0.35, 'sawtooth', 0.04, 0.1); },
    ok: () => { tone(660, 0.1, 'triangle', 0.07); tone(880, 0.12, 'triangle', 0.07, 0.09); },
    bad: () => tone(160, 0.25, 'sawtooth', 0.05),
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

/* ================= İstatistik (Genç Bilimci rozeti bunu okur: cases) ================= */
const STATS_KEY = 'bilimdedektifi_stats';
let STATS = { cases: 0, found: 0, stars: {} };   // stars: {sceneId: 0-3}
function loadStats(){ try { window.storage.get(STATS_KEY).then(r => { if (r && r.value){ try { STATS = Object.assign(STATS, JSON.parse(r.value)); } catch (e) {} } renderMenu(); }); } catch (e) {} }
function saveStats(){ try { window.storage.set(STATS_KEY, JSON.stringify(STATS)); } catch (e) {} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const G = {
  state: 'menu', scene: null,
  score: 0, timeLeft: CONFIG.CASE_SEC, secT: null,
  found: 0, total: 0, hints: CONFIG.HINTS, frozen: 0,
  quizI: 0, quizOk: 0,
};

function renderMenu(){
  $('caseGrid').innerHTML = SCENES.map((s, i) => {
    const st = STATS.stars[s.id] || 0;
    return `<div class="caseCard" data-i="${i}">
      <div class="caseEmoji">${s.e}</div>
      <div class="caseName">${s.ad}</div>
      <div class="caseTier">${['', '🏕️ Etek', '⛰️ Yamaç', '🧗 Tırmanış', '🏔️ Zirve'][s.tier]}</div>
      <div class="caseStars">${st ? '⭐'.repeat(st) : '&nbsp;'}</div>
    </div>`;
  }).join('');
  document.querySelectorAll('.caseCard').forEach(c => c.addEventListener('click', () => {
    Audio2.init(); startCase(SCENES[parseInt(c.dataset.i, 10)]);
  }));
}
function show(id){ document.querySelectorAll('.screen').forEach(s => s.classList.remove('show')); $(id).classList.add('show'); }

function layoutScene(){
  const wrap = $('sceneWrap').getBoundingClientRect();
  const sc = $('scene');
  const w = Math.min(wrap.width - 12, 620);
  const h = Math.min(wrap.height - 12, w * 0.72);
  sc.style.width = w + 'px';
  sc.style.height = h + 'px';
  sc.style.background = `linear-gradient(180deg, ${G.scene.bg[0]}, ${G.scene.bg[1]})`;
}
function startCase(scene){
  G.state = 'playing'; G.scene = scene;
  G.score = 0; G.timeLeft = CONFIG.CASE_SEC;
  G.found = 0; G.total = scene.hedefN; G.hints = CONFIG.HINTS; G.frozen = 0;
  $('freezeVeil').classList.remove('show');   // süre donma sırasında bittiyse örtü yeni vakada kalıyordu (sahne kilitli)
  show('screen-game');
  layoutScene();
  $('taskLine').textContent = `🔍 Bu sahnede ${scene.hedefN} ${scene.gorev} bul!`;
  $('bHint').disabled = false;
  $('bHint').textContent = `💡 İpucu (${G.hints})`;
  // nesneleri yerleştir
  const sc = $('scene');
  sc.querySelectorAll('.obj,.tick').forEach(el => el.remove());
  scene.objects.forEach((o, i) => {
    const el = document.createElement('div');
    el.className = 'obj';
    el.textContent = o.e;
    el.style.left = o.x + '%';
    el.style.top = o.y + '%';
    el.style.fontSize = o.s + 'px';
    el.dataset.i = i;
    el.addEventListener('pointerdown', ev => { ev.stopPropagation(); clickObj(o, el); });
    sc.appendChild(el);
  });
  refreshHUD();
  clearInterval(G.secT);
  G.secT = setInterval(() => {
    if (G.state !== 'playing') return;
    if (G.frozen > 0){
      G.frozen--;
      $('freezeCnt').textContent = G.frozen + 1;
      if (G.frozen <= 0) $('freezeVeil').classList.remove('show');
    }
    G.timeLeft--;
    if (G.timeLeft <= 5 && G.timeLeft > 0) Audio2.tick();
    refreshHUD();
    if (G.timeLeft <= 0) startQuiz();   // süre bitti → eldeki bulgularla rapora geç
  }, 1000);
}
function clickObj(o, el){
  if (G.state !== 'playing' || G.frozen > 0 || el.classList.contains('found')) return;
  if (o.cat === G.scene.hedefCat){
    el.classList.add('found');
    G.found++;
    G.score += CONFIG.FIND_POINT;
    Audio2.find();
    const t = document.createElement('div');
    t.className = 'tick'; t.textContent = '✅';
    t.style.left = o.x + '%'; t.style.top = o.y + '%';
    $('scene').appendChild(t);
    refreshHUD();
    if (G.found >= G.total){
      G.score += Math.max(0, G.timeLeft) * CONFIG.TIME_BONUS_PER_SEC;   // kalan süre bonusu
      setTimeout(startQuiz, 600);
    }
  } else {
    // yanlış tıklama: 5 sn donma — puan kaybı YOK (§4.4, Criminal Case klasik cezası)
    G.frozen = CONFIG.WRONG_FREEZE;
    $('freezeCnt').textContent = G.frozen;
    $('freezeVeil').classList.add('show');
    Audio2.freeze();
  }
}
$('bHint').addEventListener('click', () => {
  if (G.hints <= 0 || G.state !== 'playing') return;
  G.hints--;
  $('bHint').textContent = `💡 İpucu (${G.hints})`;
  if (G.hints <= 0) $('bHint').disabled = true;
  // bulunmamış bir hedef 2 sn parlar
  const els = [...document.querySelectorAll('.obj')].filter(el =>
    !el.classList.contains('found') && G.scene.objects[el.dataset.i].cat === G.scene.hedefCat);
  if (els.length){
    const el = els[Math.floor(Math.random() * els.length)];
    el.classList.add('hintGlow');
    setTimeout(() => el.classList.remove('hintGlow'), 2100);
  }
});
function refreshHUD(){
  $('scoreChip').textContent = '⭐ ' + G.score;
  $('timeChip').textContent = '⏱️ ' + Math.max(0, G.timeLeft);
  $('timeChip').classList.toggle('low', G.timeLeft <= 15);
  $('foundChip').textContent = `🔍 ${G.found}/${G.total}`;
}

/* ---- mini quiz (3 soru → yıldız) ---- */
function startQuiz(){
  if (G.state !== 'playing') return;
  G.state = 'quiz';
  clearInterval(G.secT);
  G.quizI = 0; G.quizOk = 0;
  $('quizVeil').classList.add('show');
  showQuizQ();
}
function showQuizQ(){
  const q = G.scene.quiz[G.quizI];
  $('qzInfo').textContent = `Soru ${G.quizI + 1}/3 · Doğru: ${G.quizOk}`;
  $('qzText').textContent = q.q;
  const box = $('qzOpts'); box.innerHTML = '';
  q.o.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt'; b.textContent = o;
    b.addEventListener('click', () => {
      [...box.children].forEach((x, j) => {
        x.disabled = true;
        if (j === q.a) x.classList.add('right');
        else if (j === i) x.classList.add('wrong');
      });
      if (i === q.a){ G.quizOk++; G.score += 50; Audio2.ok(); } else Audio2.bad();
      setTimeout(() => { G.quizI++; G.quizI >= 3 ? finishCase() : showQuizQ(); }, 850);
    });
    box.appendChild(b);
  });
}
function finishCase(){
  $('quizVeil').classList.remove('show');
  G.state = 'result';
  // 3⭐ koşulu (§4.4): TÜM nesneler + quiz %100; 2⭐: nesneler tamam VEYA quiz tam; 1⭐: vaka kapandı
  const stars = (G.found >= G.total && G.quizOk === 3) ? 3 : (G.found >= G.total || G.quizOk === 3) ? 2 : 1;
  if ((STATS.stars[G.scene.id] || 0) < stars) STATS.stars[G.scene.id] = stars;
  STATS.cases++; STATS.found += G.found;
  saveStats();
  BilnetBridge.submitScore({
    gameId: 'bilim-dedektifi', score: G.score, tier: G.scene.tier,
    stats: { found: G.found, total: G.total, quizOk: G.quizOk, scene: G.scene.id },
  });
  $('resEmoji').textContent = stars === 3 ? '🏆' : stars === 2 ? '🕵️' : '🔍';
  $('resTitle').textContent = stars === 3 ? 'Kusursuz Vaka!' : 'Vaka Kapandı!';
  $('resStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  $('resStats').innerHTML =
    `🔍 Bulunan: <b>${G.found}/${G.total}</b> &nbsp;·&nbsp; 🧪 Quiz: <b>${G.quizOk}/3</b><br>⭐ Toplam puan: <b>${G.score}</b>`;
  $('eduLine').textContent = `Bugün ${G.found} bilimsel keşif yaptın! 🎓`;
  if (stars === 3) Audio2.fanfare();
  show('screen-result');
}
$('bAgain').addEventListener('click', () => startCase(G.scene));
$('bMenu').addEventListener('click', () => { G.state = 'menu'; renderMenu(); show('screen-menu'); });

/* ---- duraklatma + visibilitychange ---- */
function pauseGame(){ if (G.state !== 'playing') return; G.state = 'paused'; $('pauseVeil').classList.add('show'); }
$('bPause').addEventListener('click', pauseGame);
$('bResume').addEventListener('click', () => { if (G.state === 'paused'){ G.state = 'playing'; $('pauseVeil').classList.remove('show'); } });
$('bQuit').addEventListener('click', () => {
  $('pauseVeil').classList.remove('show');
  clearInterval(G.secT);
  G.state = 'menu'; renderMenu(); show('screen-menu');
});
EduKit.onHidden(() => { if (G.state === 'playing'){ pauseGame(); saveStats(); } });   // gizlenince duraklat, pagehide'da da kaydet
addEventListener('resize', () => { if (G.state === 'playing') layoutScene(); });

/* ---- başlat ---- */
renderMenu();
loadStats();
