"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.7 — aynen) ================= */
const CONFIG = {
  SESSION_Q: 10,                 // 10 soruluk paketler, doğru başına 1 tohum
  Q_TIME: 15,
  GROW_MS: { 1: 30 * 60e3, 2: 2 * 3600e3, 3: 8 * 3600e3, 4: 24 * 3600e3 },   // 30dk/2sa/8sa/24sa
  HARVEST_PTS: { 1: 60, 2: 150, 3: 350, 4: 800 },
  HARVEST_XP: { 1: 10, 2: 22, 3: 45, 4: 90 },
  GRID_BY_LEVEL: lvl => lvl >= 6 ? 5 : lvl >= 3 ? 4 : 3,    // 3×3 → 4×4 → 5×5
  XP_PER_LEVEL: 100,
};
const CROPS = {
  mat: { ad: 'Matematik Buğdayı', seed: '🌾', stages: ['🌱', '🌿', '🌾'] },
  fen: { ad: 'Fen Domatesi',      seed: '🍅', stages: ['🌱', '🌿', '🍅'] },
  en:  { ad: 'İngilizce Ayçiçeği',seed: '🌻', stages: ['🌱', '🌿', '🌻'] },
  tr:  { ad: 'Türkçe Lavantası',  seed: '💜', stages: ['🌱', '🌿', '💜'] },
};

/* ================= SORU BANKASI (Bilgi Takımı ile ortak gömülü banka, kısaltılmış + EN üretici) ================= */
const BANK = [
  {d:"mat",z:1,q:"4 × 5 = ?",o:["10","15","20","25"],a:2},
  {d:"mat",z:1,q:"77 − 55 = ?",o:["20","32","27","22"],a:3},
  {d:"mat",z:1,q:"9 × 7 = ?",o:["64","63","54","56"],a:1},
  {d:"mat",z:1,q:"9 × 6 = ?",o:["44","64","54","45"],a:2},
  {d:"mat",z:1,q:"56 − 55 = ?",o:["2","6","11","1"],a:3},
  {d:"mat",z:1,q:"2/4 + 1/4 = ?",o:["4/5","3/4","1/2","3/8"],a:1},
  {d:"mat",z:2,q:"43 + 34 − 9 = ?",o:["68","67","78","63"],a:0},
  {d:"mat",z:2,q:"6 × 6 = ?",o:["26","46","36","37"],a:2},
  {d:"mat",z:2,q:"11 × 11 = ?",o:["131","120","132","121"],a:3},
  {d:"mat",z:2,q:"35 + 28 − 13 = ?",o:["45","60","50","40"],a:2},
  {d:"mat",z:2,q:"73 + 47 − 20 = ?",o:["100","95","98","102"],a:0},
  {d:"mat",z:3,q:"13 × 8 = ?",o:["91","104","117","112"],a:1},
  {d:"mat",z:3,q:"9 × 8 + 17 = ?",o:["84","90","88","89"],a:3},
  {d:"mat",z:3,q:"10/12 kesrinin en sade hali?",o:["2/3","6/7","10/11","5/6"],a:3},
  {d:"mat",z:3,q:"16 × 5 = ?",o:["75","80","70","64"],a:1},
  {d:"mat",z:3,q:"9 × 9 + 15 = ?",o:["94","96","95","106"],a:1},
  {d:"tr",z:1,q:"'ev' kelimesinin eş anlamlısı?",o:["yol","ağaç","bulut","konut"],a:3},
  {d:"tr",z:1,q:"'okul' kelimesinin eş anlamlısı?",o:["deniz","bahçe","mektep","kalem"],a:2},
  {d:"tr",z:1,q:"'hekim' kelimesinin eş anlamlısı?",o:["hasta","doktor","hemşire","ilaç"],a:1},
  {d:"tr",z:1,q:"'armağan' kelimesinin eş anlamlısı?",o:["kupa","hediye","para","ödül"],a:1},
  {d:"tr",z:2,q:"'ucuz' kelimesinin zıt anlamlısı?",o:["bedava","indirimli","pahalı","değerli"],a:2},
  {d:"tr",z:2,q:"'kolay' kelimesinin zıt anlamlısı?",o:["rahat","basit","hafif","zor"],a:3},
  {d:"tr",z:2,q:"'gece' kelimesinin zıt anlamlısı?",o:["gündüz","akşam","öğle","sabah"],a:0},
  {d:"tr",z:2,q:"'eski' kelimesinin zıt anlamlısı?",o:["kullanılmış","yeni","antika","tarihi"],a:1},
  {d:"tr",z:3,q:"Hangisi doğru yazılmıştır?",o:["yanliş","yannış","yalnış","yanlış"],a:3},
  {d:"tr",z:3,q:"Hangisi doğru yazılmıştır?",o:["kitabcı","kitabçı","kitapçı","kitapcı"],a:2},
  {d:"tr",z:3,q:"Hangisi doğru yazılmıştır?",o:["şofor","şöför","şoför","şöfor"],a:2},
  {d:"fen",z:1,q:"Hangisi canlıdır?",o:["Ağaç","Taş","Su","Bulut"],a:0},
  {d:"fen",z:1,q:"Bitkiler hangi gazı üretir?",o:["Oksijen","Helyum","Azot","Karbondioksit"],a:0},
  {d:"fen",z:1,q:"Hangisi sıvıdır?",o:["Taş","Süt","Tahta","Demir"],a:1},
  {d:"fen",z:1,q:"İnsan hangi organla nefes alır?",o:["Mide","Kalp","Akciğer","Böbrek"],a:2},
  {d:"fen",z:2,q:"Suyun donma sıcaklığı kaç derecedir?",o:["-100°C","0°C","100°C","10°C"],a:1},
  {d:"fen",z:2,q:"Sıvı halden gaz haline geçişe ne denir?",o:["Erime","Donma","Buharlaşma","Yoğuşma"],a:2},
  {d:"fen",z:2,q:"Hangisi gezegendir?",o:["Jüpiter","Ay","Yıldız","Güneş"],a:0},
  {d:"fen",z:3,q:"Hangisi Güneş'e en yakın gezegendir?",o:["Mars","Dünya","Merkür","Venüs"],a:2},
  {d:"fen",z:3,q:"Mevsimler neden oluşur?",o:["Ay","Eksen eğikliği","Rüzgar","Güneşe uzaklık"],a:1},
  {d:"fen",z:3,q:"Hangisi karışımdır?",o:["Saf su","Altın","Tuzlu su","Oksijen"],a:2},
];
const EN_WORDS = [
  ['apple','elma'],['dog','köpek'],['cat','kedi'],['bird','kuş'],['fish','balık'],['book','kitap'],
  ['water','su'],['bread','ekmek'],['milk','süt'],['house','ev'],['school','okul'],['sun','güneş'],
  ['moon','ay'],['star','yıldız'],['tree','ağaç'],['flower','çiçek'],['red','kırmızı'],['blue','mavi'],
  ['green','yeşil'],['big','büyük'],['small','küçük'],['happy','mutlu'],['fast','hızlı'],['cold','soğuk'],
];
const { pick } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)

/* ================= KALICI SORU GEÇMİŞİ (tekrar-önleme) =================
   Öğrenciye aynı soru gelmesin diye sorulmuş sorular ders bazlı kalıcı
   tutulur (localStorage). Oturum-içi Set (asked) hızlı erişim, kalıcı
   geçmiş (ASKED) sayfa yenilense de korunur. İngilizce sorular kelime-çifti
   anahtarıyla (en|tr) izlenir. */
const ASKED_KEY = 'bilgiciftligi_asked';
const asked = { mat: new Set(), fen: new Set(), en: new Set(), tr: new Set() };
let ASKED = { mat: [], fen: [], en: [], tr: [] };
function loadAsked(){
  try {
    return window.storage.get(ASKED_KEY).then(r => {
      if (r && r.value){
        const parsed = JSON.parse(r.value);
        for (const d of ['mat', 'fen', 'en', 'tr']){
          const arr = Array.isArray(parsed && parsed[d]) ? parsed[d] : [];
          ASKED[d] = arr.slice();
          asked[d] = new Set(arr);
        }
      }
    }).catch(() => {});
  } catch (e) { return Promise.resolve(); }
}
function saveAsked(){ try { window.storage.set(ASKED_KEY, JSON.stringify(ASKED)); } catch (e) {} }
function markAsked(ders, key){
  if (!asked[ders]) return;
  if (asked[ders].has(key)) return;
  asked[ders].add(key);
  ASKED[ders].push(key);
  saveAsked();
}
function resetAsked(ders){
  if (!asked[ders]) return;
  asked[ders].clear();
  ASKED[ders] = [];
  saveAsked();
}

function enKey(en, tr){ return en + '|' + tr; }
function enQuestion(){
  // havuzdaki sorulmamış kelime çiftlerini bul; hepsi sorulduysa SADECE EN geçmişini sıfırla
  let words = EN_WORDS.filter(w => !asked.en.has(enKey(w[0], w[1])));
  if (!words.length){ resetAsked('en'); words = EN_WORDS.slice(); }
  const [en, tr] = pick(words);
  markAsked('en', enKey(en, tr));
  const toEn = Math.random() < 0.5;
  const correct = toEn ? en : tr;
  const set = new Set([correct]);
  while (set.size < 4){ const w = pick(EN_WORDS); set.add(toEn ? w[0] : w[1]); }
  const o = [...set].sort(() => Math.random() - 0.5);
  return { q: toEn ? `'${tr}' İngilizcede nedir?` : `'${en}' Türkçede nedir?`, o, a: o.indexOf(correct) };
}
function nextQuestion(ders, tier){
  if (ders === 'en') return enQuestion();
  const z = Math.min(3, tier);
  let pool = BANK.filter(x => x.d === ders && x.z <= z && !asked[ders].has(x.q));
  if (!pool.length){ resetAsked(ders); pool = BANK.filter(x => x.d === ders && x.z <= z); }
  const q = pick(pool);
  markAsked(ders, q.q);
  return { q: q.q, o: q.o.slice(), a: q.a };
}

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return {
    init,
    ok: () => { tone(660, 0.1, 'triangle', 0.07); tone(880, 0.12, 'triangle', 0.07, 0.09); },
    bad: () => tone(160, 0.25, 'sawtooth', 0.05),
    plant: () => { tone(420, 0.09, 'triangle', 0.05); tone(520, 0.1, 'triangle', 0.05, 0.08); },
    harvest: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.07, i * 0.1)),
    level: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.15, 'triangle', 0.08, i * 0.11)),
  };
})();

/* ================= Bridge ================= */
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

/* ================= KALICI ÇİFTLİK ================= */
const SAVE_KEY = 'bilgiciftligi_save';
const STATS_KEY = 'bilgiciftligi_stats';
let F = {
  xp: 0, harvests: 0,
  seeds: { mat: 0, fen: 0, en: 0, tr: 0 },
  plots: {},        // "r,c" -> {d, t, at}  (ders, tier, dikilme zamanı)
};
let STATS = { sessions: 0, correct: 0, wrong: 0, harvests: 0 };
function persist(){ try { window.storage.set(SAVE_KEY, JSON.stringify(F)); } catch (e) {} }
function saveStats(){ try { window.storage.set(STATS_KEY, JSON.stringify(STATS)); } catch (e) {} }
function level(){ return 1 + Math.floor(F.xp / CONFIG.XP_PER_LEVEL); }

/* ================= UI ================= */
const $ = id => document.getElementById(id);
const toast = msg => EduKit.toast(msg, 2800);   // #toast öğesi + oyunun stili; zamanlayıcı kit'te
function fmtLeft(ms){
  if (ms <= 0) return 'HAZIR ✨';
  const s = Math.ceil(ms / 1000);
  if (s < 60) return s + ' sn';
  const m = Math.ceil(s / 60);
  if (m < 60) return m + ' dk';
  const h = Math.floor(m / 60);
  return h + ' sa ' + (m % 60 ? (m % 60) + ' dk' : '');
}
function refreshHUD(){
  $('xpChip').textContent = `🚜 Sv ${level()} · ${F.xp} XP`;
  const N = CONFIG.GRID_BY_LEVEL(level());
  $('plotChip').textContent = `🟫 ${N}×${N}`;
  $('harvestChip').textContent = `🧺 ${F.harvests} hasat`;
  $('sMat').textContent = '🌾 ' + F.seeds.mat;
  $('sFen').textContent = '🍅 ' + F.seeds.fen;
  $('sEn').textContent = '🌻 ' + F.seeds.en;
  $('sTr').textContent = '💜 ' + F.seeds.tr;
}
function renderFarm(){
  refreshHUD();
  const N = CONFIG.GRID_BY_LEVEL(level());
  const farm = $('farm');
  const wrap = $('farmWrap').getBoundingClientRect();
  const size = Math.min(wrap.width - 8, wrap.height - 8, 480);
  const cell = Math.floor((size - 14 - (N - 1) * 7) / N);
  farm.style.gridTemplateColumns = `repeat(${N}, ${cell}px)`;
  farm.innerHTML = '';
  const now = Date.now();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++){
    const k = r + ',' + c;
    const p = F.plots[k];
    const el = document.createElement('div');
    el.className = 'plot';
    el.style.height = cell + 'px';
    if (p){
      // anti-hile: dikilme zamanı gelecekteyse şimdiye çek (cihaz saati oynatılmış)
      if (p.at > now){ p.at = now; persist(); }
      const total = CONFIG.GROW_MS[p.t];
      const left = p.at + total - now;
      const crop = CROPS[p.d];
      const stage = left <= 0 ? 2 : (now - p.at) / total > 0.5 ? 1 : 0;
      el.innerHTML = `<div class="pe" style="font-size:${Math.round(cell * 0.42)}px">${crop.stages[stage]}</div>
        <div class="pt">${fmtLeft(left)}</div>`;
      if (left <= 0) el.classList.add('ready');
      el.addEventListener('click', () => {
        if (left <= 0) harvest(k);
        else toast(`${crop.ad} büyüyor — ${fmtLeft(left)} kaldı. Solmaz, seni bekler! 😌`);
      });
    } else {
      el.innerHTML = `<div class="pe" style="font-size:${Math.round(cell * 0.34)}px;opacity:.5">➕</div>`;
      el.addEventListener('click', () => openPlant(k));
    }
    farm.appendChild(el);
  }
}
function harvest(k){
  const p = F.plots[k];
  if (!p) return;
  const pts = CONFIG.HARVEST_PTS[p.t], xp = CONFIG.HARVEST_XP[p.t];
  const lvlBefore = level();
  delete F.plots[k];
  F.xp += xp; F.harvests++; STATS.harvests++;
  persist(); saveStats();
  Audio2.harvest();
  toast(`🧺 ${CROPS[p.d].ad} hasat edildi! +${pts} puan, +${xp} XP`);
  BilnetBridge.submitScore({ gameId: 'bilgi-ciftligi', score: pts, tier: p.t, stats: { crop: p.d, harvests: F.harvests } });
  if (level() > lvlBefore){ Audio2.level(); toast(`🎉 Çiftlik seviye ${level()} oldu!` + (CONFIG.GRID_BY_LEVEL(level()) > CONFIG.GRID_BY_LEVEL(lvlBefore) ? ' ARAZİ BÜYÜDÜ! 🟫' : '')); }
  renderFarm();
}
/* ---- ekme ---- */
let plantTarget = null;
function openPlant(k){
  plantTarget = k;
  const g = $('plantGrid');
  g.innerHTML = '';
  let any = false;
  // tohumlar ders bazlı; tier dikim sırasında seçilir (tohum türü ders, süre/değer tier)
  for (const d of ['mat', 'fen', 'en', 'tr']){
    const b = document.createElement('button');
    b.className = 'selBtn';
    b.disabled = F.seeds[d] <= 0;
    b.style.opacity = F.seeds[d] <= 0 ? 0.45 : 1;
    b.innerHTML = `${CROPS[d].seed} ${CROPS[d].ad}<small>${F.seeds[d]} tohum</small>`;
    b.addEventListener('click', () => choosePlantTier(d));
    g.appendChild(b);
    if (F.seeds[d] > 0) any = true;
  }
  if (!any){ toast('Tohumun yok — önce soru çöz! 📝'); return; }
  $('plantVeil').classList.add('show');
}
function choosePlantTier(d){
  const g = $('plantGrid');
  g.innerHTML = '';
  [1, 2, 3, 4].forEach(t => {
    const b = document.createElement('button');
    b.className = 'selBtn';
    b.innerHTML = `${['', '🏕️ Etek', '⛰️ Yamaç', '🧗 Tırmanış', '🏔️ Zirve'][t]}<small>${fmtLeft(CONFIG.GROW_MS[t]).replace('HAZIR ✨', '')} · ${CONFIG.HARVEST_PTS[t]}p</small>`;
    b.addEventListener('click', () => {
      if (!F.seeds[d] || F.seeds[d] <= 0) { $('plantVeil').classList.remove('show'); return; }   // çift dokunuşta sayaç eksiye düşmesin
      F.seeds[d]--;
      F.plots[plantTarget] = { d, t, at: Date.now() };
      persist();
      Audio2.plant();
      $('plantVeil').classList.remove('show');
      renderFarm();
    });
    g.appendChild(b);
  });
}
$('bPlantClose').addEventListener('click', () => $('plantVeil').classList.remove('show'));

/* ---- soru oturumu ---- */
let selDers = 'mat', selTier = 1, Q = null, fuseT = null;
document.querySelectorAll('#dersGrid .selBtn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#dersGrid .selBtn').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); selDers = b.dataset.d;
}));
document.querySelectorAll('#tierGrid .selBtn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#tierGrid .selBtn').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); selTier = parseInt(b.dataset.t, 10);
}));
$('bQuiz').addEventListener('click', () => { Audio2.init(); $('setupVeil').classList.add('show'); });
$('bSetupClose').addEventListener('click', () => $('setupVeil').classList.remove('show'));
$('bStartQuiz').addEventListener('click', () => {
  $('setupVeil').classList.remove('show');
  Q = { i: 0, correct: 0 };
  $('qzTitle').textContent = `${CROPS[selDers].seed} ${CROPS[selDers].ad} Oturumu`;
  $('quizVeil').classList.add('show');
  showQ();
});
function showQ(){
  const q = nextQuestion(selDers, selTier);
  Q.cur = q;
  $('qzInfo').textContent = `Soru ${Q.i + 1}/${CONFIG.SESSION_Q} · Tohum: ${Q.correct}`;
  $('qzText').textContent = q.q;
  const box = $('qzOpts'); box.innerHTML = '';
  q.o.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt'; b.textContent = o;
    b.addEventListener('click', () => answerQ(i));
    box.appendChild(b);
  });
  clearInterval(fuseT);
  const t0 = Date.now();
  fuseT = setInterval(() => {
    if (document.hidden) return;
    const left = 1 - (Date.now() - t0) / (CONFIG.Q_TIME * 1000);
    $('qzFuse').style.width = Math.max(0, left * 100) + '%';
    if (left <= 0) answerQ(-1);
  }, 100);
}
function answerQ(i){
  clearInterval(fuseT);
  const q = Q.cur;
  const right = i === q.a;
  if (right){ Q.correct++; Audio2.ok(); } else Audio2.bad();
  const btns = $('qzOpts').children;
  [...btns].forEach((b, j) => { b.disabled = true; if (j === q.a) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); });
  Q.i++;
  setTimeout(() => { Q.i >= CONFIG.SESSION_Q ? endSession() : showQ(); }, 800);
}
function endSession(){
  $('quizVeil').classList.remove('show');
  F.seeds[selDers] += Q.correct;          // doğru başına 1 tohum (§4.7)
  STATS.sessions++; STATS.correct += Q.correct; STATS.wrong += CONFIG.SESSION_Q - Q.correct;
  persist(); saveStats();
  $('resTitle').textContent = Q.correct > 0 ? 'Tohumlar Hazır!' : 'Tarla Seni Bekliyor!';
  $('resDetail').innerHTML = `✅ ${Q.correct}/${CONFIG.SESSION_Q} doğru → ${CROPS[selDers].seed} <b>${Q.correct} tohum</b> kazandın!<br><small>Bugün ${Q.correct} soru çözdün 🎓 Şimdi ek, büyüsün!</small>`;
  $('resultVeil').classList.add('show');
}
$('resOk').addEventListener('click', () => { $('resultVeil').classList.remove('show'); renderFarm(); });

$('bHelp').addEventListener('click', () => $('helpVeil').classList.add('show'));
$('bHelpClose').addEventListener('click', () => $('helpVeil').classList.remove('show'));

/* ---- başlat + canlı sayaç ---- */
window.storage.get(SAVE_KEY).then(r => {
  if (r && r.value){ try { F = Object.assign(F, JSON.parse(r.value)); } catch (e) {} }
  return window.storage.get(STATS_KEY);
}).then(r => {
  if (r && r.value){ try { STATS = Object.assign(STATS, JSON.parse(r.value)); } catch (e) {} }
  return loadAsked();   // sorulmuş-soru geçmişini geri yükle (tekrar-önleme)
}).then(() => {
  renderFarm();
});
setInterval(() => { if (!document.hidden) renderFarm(); }, 10000);   // kalan süre etiketleri tazelenir
EduKit.onHidden(persist, renderFarm);   // gizlenince/pagehide'da kaydet, geri gelince çiz
addEventListener('resize', renderFarm);
