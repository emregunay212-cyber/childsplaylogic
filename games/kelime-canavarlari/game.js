"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.8 — aynen) ================= */
const CONFIG = {
  EGG_HATCH: 10,                 // yumurta açma: kategoriden 10 doğru
  EVO_THRESHOLDS: [25, 60, 120], // evrim eşikleri (kategori bazlı doğru sayacı)
  FUSION_Q: 20,                  // fusion: 20 soruluk karışık quiz
  FUSION_PASS: 0.8,              // %80+
  FEED_Q: 5,                     // besleme quizi soru sayısı
  Q_TIME: 10,                    // 10 sn süre (§4.8 quiz formatı)
};

/* ================= KATEGORİLER + KELİME BANKASI (EN→TR) ================= */
const CATS = {
  animals: { ad: 'Hayvanlar', e: '🐾', mon: ['🦎', '🦖', '🐉'], adlar: ['Kertenkelecik', 'Dinozorcuk', 'Kelime Ejderi'],
    words: [['cat','kedi'],['dog','köpek'],['bird','kuş'],['fish','balık'],['lion','aslan'],['tiger','kaplan'],
            ['rabbit','tavşan'],['monkey','maymun'],['horse','at'],['sheep','koyun'],['snake','yılan'],['frog','kurbağa'],
            ['bear','ayı'],['wolf','kurt'],['duck','ördek'],['cow','inek']] },
  food: { ad: 'Yiyecekler', e: '🍎', mon: ['🍄', '🧁', '🎂'], adlar: ['Mantarcık', 'Kekcik', 'Pasta Devi'],
    words: [['apple','elma'],['bread','ekmek'],['milk','süt'],['cheese','peynir'],['egg','yumurta'],['banana','muz'],
            ['orange','portakal'],['cake','pasta'],['honey','bal'],['rice','pirinç'],['soup','çorba'],['tea','çay'],
            ['water','su'],['butter','tereyağı'],['grape','üzüm'],['lemon','limon']] },
  colors: { ad: 'Renkler', e: '🌈', mon: ['🦋', '🦚', '🦄'], adlar: ['Kelebekçik', 'Tavuskuşu', 'Gökkuşağı Tekboynuz'],
    words: [['red','kırmızı'],['blue','mavi'],['green','yeşil'],['yellow','sarı'],['black','siyah'],['white','beyaz'],
            ['purple','mor'],['pink','pembe'],['orange','turuncu'],['brown','kahverengi'],['gray','gri'],['gold','altın rengi']] },
  school: { ad: 'Okul', e: '🏫', mon: ['🦉', '🧙', '🧞'], adlar: ['Baykuşçuk', 'Bilge Büyücü', 'Bilgi Cini'],
    words: [['book','kitap'],['pen','kalem'],['teacher','öğretmen'],['student','öğrenci'],['school','okul'],['desk','sıra'],
            ['paper','kağıt'],['lesson','ders'],['bag','çanta'],['eraser','silgi'],['ruler','cetvel'],['board','tahta']] },
  nature: { ad: 'Doğa', e: '🌳', mon: ['🌱', '🌲', '🗻'], adlar: ['Filizcik', 'Orman Bekçisi', 'Dağ Ruhu'],
    words: [['tree','ağaç'],['flower','çiçek'],['sun','güneş'],['moon','ay'],['star','yıldız'],['rain','yağmur'],
            ['snow','kar'],['wind','rüzgar'],['sea','deniz'],['mountain','dağ'],['river','nehir'],['cloud','bulut']] },
  body: { ad: 'Vücut', e: '🫀', mon: ['👾', '🤖', '👹'], adlar: ['Mini Yaratık', 'Robo Vücut', 'Dev Koruyucu'],
    words: [['head','baş'],['eye','göz'],['ear','kulak'],['nose','burun'],['mouth','ağız'],['hand','el'],
            ['foot','ayak'],['arm','kol'],['leg','bacak'],['hair','saç'],['tooth','diş'],['heart','kalp']] },
};
/* Melezler: iki tam evrimli canavar + %80 karışık quiz → nadir melez (Zindan fusion DNA'sı) */
const HYBRIDS = [
  { id: 'animals+food',   e: '🐙', ad: 'Lezzet Ahtapotu' },
  { id: 'animals+colors', e: '🦩', ad: 'Flamingo Prensi' },
  { id: 'animals+nature', e: '🦌', ad: 'Orman Geyiği' },
  { id: 'food+school',    e: '🧇', ad: 'Bilgin Waffle' },
  { id: 'colors+nature',  e: '🌺', ad: 'Renk Bahçesi' },
  { id: 'school+body',    e: '🧠', ad: 'Süper Beyin' },
];
const { pick } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)
function wordQuestion(cat){
  // kategoriler arası karışık: cat null ise rastgele kategori (fusion quizi)
  const c = cat || pick(Object.keys(CATS));
  const [en, tr] = pick(CATS[c].words);
  const toEn = Math.random() < 0.5;
  const correct = toEn ? en : tr;
  const set = new Set([correct]);
  let guard = 0;
  while (set.size < 4 && guard++ < 40){
    const w = pick(CATS[c].words);
    set.add(toEn ? w[0] : w[1]);
  }
  while (set.size < 4){ const cc = pick(Object.keys(CATS)); const w = pick(CATS[cc].words); set.add(toEn ? w[0] : w[1]); }
  const o = [...set].sort(() => Math.random() - 0.5);
  return { q: toEn ? `'${tr}' İngilizcede nedir?` : `'${en}' Türkçede nedir?`, o, a: o.indexOf(correct) };
}

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return {
    init,
    ok: () => { tone(660, 0.1, 'triangle', 0.07); tone(880, 0.12, 'triangle', 0.07, 0.09); },
    bad: () => tone(160, 0.25, 'sawtooth', 0.05),
    evo: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, i * 0.11)),
    feed: () => { tone(500, 0.08, 'triangle', 0.05); tone(620, 0.1, 'triangle', 0.05, 0.07); },
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

/* ================= KALICI DURUM ================= */
const SAVE_KEY = 'kelimecanavar_save';
let S = {
  counts: {},        // kategori → toplam doğru (evrim sayacı §4.8)
  hybrids: [],       // kazanılan melez id'leri
  solved: 0, wrong: 0,
};
function persist(){ try { window.storage.set(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function stageOf(cat){
  const n = S.counts[cat] || 0;
  if (n >= CONFIG.EVO_THRESHOLDS[2]) return 3;       // 3 = tam evrim (max)
  if (n >= CONFIG.EVO_THRESHOLDS[1]) return 2;
  if (n >= CONFIG.EVO_THRESHOLDS[0]) return 1;
  if (n >= CONFIG.EGG_HATCH) return 0;               // 0 = yumurtadan çıktı (bebek)
  return -1;                                          // -1 = yumurta
}
function nextGoal(cat){
  const n = S.counts[cat] || 0;
  if (n < CONFIG.EGG_HATCH) return CONFIG.EGG_HATCH;
  for (const t of CONFIG.EVO_THRESHOLDS) if (n < t) return t;
  return null;   // max
}

/* ================= UI ================= */
const $ = id => document.getElementById(id);
function collectionCount(){
  let n = 0;
  for (const c of Object.keys(CATS)){ const st = stageOf(c); if (st >= 0) n += (st === 0 ? 1 : st); }
  return n + S.hybrids.length;
}
function refreshHUD(){
  $('colChip').textContent = `📖 ${collectionCount()}/24`;
  $('solvedChip').textContent = `✅ ${S.solved} doğru`;
  $('fusionChip').textContent = `🧬 ${S.hybrids.length} melez`;
}
let activeTab = 'mons';
function render(){
  refreshHUD();
  const c = $('content');
  if (activeTab === 'mons'){
    const maxed = Object.keys(CATS).filter(k => stageOf(k) === 3);
    let fusionHtml = '';
    if (maxed.length >= 2){
      const avail = HYBRIDS.filter(h => {
        const [a, b] = h.id.split('+');
        return maxed.includes(a) && maxed.includes(b) && !S.hybrids.includes(h.id);
      });
      if (avail.length){
        fusionHtml = `<div class="secHead"><span>🧬 FUSION HAZIR!</span></div>` + avail.map(h => {
          const [a, b] = h.id.split('+');
          return `<div class="monCard r-epic" style="margin-bottom:10px">
            <div class="monEmoji">${CATS[a].mon[2]} ➕ ${CATS[b].mon[2]} = ❓</div>
            <div class="monName">${CATS[a].ad} × ${CATS[b].ad}</div>
            <div class="monKat">20 soruluk karışık quizde %80+ yap, melezi kazan!</div>
            <button class="monBtn fusion" data-fusion="${h.id}">🧬 BİRLEŞTİR</button>
          </div>`;
        }).join('');
      }
    }
    c.innerHTML = fusionHtml + `<div class="secHead"><span>🐉 Kategori Canavarları</span><span>besle = quiz çöz</span></div><div id="monGrid">` +
      Object.entries(CATS).map(([k, cat]) => {
        const st = stageOf(k), n = S.counts[k] || 0, goal = nextGoal(k);
        const emoji = st < 0 ? '🥚' : cat.mon[Math.max(0, st - 1)];
        const name = st < 0 ? 'Gizemli Yumurta' : st === 0 ? cat.mon[0] + ' bebeği' : cat.adlar[st - 1];
        const rar = st >= 3 ? 'r-leg' : st === 2 ? 'r-epic' : st === 1 ? 'r-rare' : '';
        const prog = goal ? Math.min(100, (n / goal) * 100) : 100;
        return `<div class="monCard ${rar}${st < 0 ? ' eggCard' : ''}">
          ${st > 0 ? `<div class="evoTag">Evrim ${st}/3</div>` : ''}
          <div class="monEmoji">${emoji}</div>
          <div class="monName">${st < 0 ? 'Gizemli Yumurta' : name}</div>
          <div class="monKat">${cat.e} ${cat.ad} · ${n} doğru</div>
          <div class="monBar"><i style="width:${prog}%"></i></div>
          <div class="monKat" style="margin-top:3px">${goal ? `${n}/${goal}` : 'TAM EVRİM! 🌟'}</div>
          <button class="monBtn" data-feed="${k}">🍖 Besle (${CONFIG.FEED_Q} soru)</button>
        </div>`;
      }).join('') + '</div>';
  } else {
    c.innerHTML = `<div class="secHead"><span>📖 Koleksiyon Defteri</span><span>${collectionCount()}/24</span></div><div id="monGrid">` +
      Object.entries(CATS).flatMap(([k, cat]) => cat.mon.map((m, i) => {
        const owned = stageOf(k) >= i + 1 || (i === 0 && stageOf(k) >= 0);
        return `<div class="monCard${owned ? (i === 2 ? ' r-leg' : i === 1 ? ' r-epic' : ' r-rare') : ''}" style="${owned ? '' : 'opacity:.4;filter:grayscale(.8)'}">
          <div class="monEmoji">${owned ? m : '❓'}</div>
          <div class="monName">${owned ? cat.adlar[i] : '???'}</div>
          <div class="monKat">${cat.e} ${cat.ad}</div>
        </div>`;
      })).join('') +
      HYBRIDS.map(h => {
        const owned = S.hybrids.includes(h.id);
        return `<div class="monCard${owned ? ' r-leg' : ''}" style="${owned ? '' : 'opacity:.4;filter:grayscale(.8)'}">
          <div class="monEmoji">${owned ? h.e : '❓'}</div>
          <div class="monName">${owned ? h.ad : 'Gizli Melez'}</div>
          <div class="monKat">🧬 Fusion</div>
        </div>`;
      }).join('') + '</div>' +
      `<div class="monKat" style="text-align:center;margin-top:10px">Hepsini topla → "Canavar Profesörü" ol! 🎓</div>`;
  }
  c.querySelectorAll('[data-feed]').forEach(b => b.addEventListener('click', () => startFeed(b.dataset.feed)));
  c.querySelectorAll('[data-fusion]').forEach(b => b.addEventListener('click', () => startFusion(b.dataset.fusion)));
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
  t.classList.add('on');
  activeTab = t.dataset.tab;
  render();
}));

/* ================= QUIZ AKIŞI (besleme + fusion) ================= */
let Q = null, fuseT = null;
function startFeed(cat){
  Audio2.init();
  Q = { mode: 'feed', cat, n: CONFIG.FEED_Q, i: 0, correct: 0 };
  $('qzTitle').textContent = `🍖 ${CATS[cat].ad} Beslemesi`;
  $('quizVeil').classList.add('show');
  showQ();
}
function startFusion(hid){
  Audio2.init();
  Q = { mode: 'fusion', hid, n: CONFIG.FUSION_Q, i: 0, correct: 0 };
  $('qzTitle').textContent = '🧬 FUSION Quizi — Karışık!';
  $('quizVeil').classList.add('show');
  showQ();
}
function showQ(){
  const q = Q.mode === 'fusion' ? wordQuestion(null) : wordQuestion(Q.cat);
  Q.cur = q;
  $('qzInfo').textContent = `Soru ${Q.i + 1}/${Q.n} · Doğru: ${Q.correct}`;
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
  setTimeout(() => { Q.i >= Q.n ? endQuiz() : showQ(); }, 800);
}
function endQuiz(){
  $('quizVeil').classList.remove('show');
  S.solved += Q.correct; S.wrong += Q.n - Q.correct;
  if (Q.mode === 'feed'){
    const before = stageOf(Q.cat);
    S.counts[Q.cat] = (S.counts[Q.cat] || 0) + Q.correct;
    const after = stageOf(Q.cat);
    persist();
    BilnetBridge.submitScore({ gameId: 'kelime-canavarlari', score: Q.correct * 15, tier: 2,
      stats: { correct: Q.correct, wrong: Q.n - Q.correct, cat: Q.cat } });
    if (after > before){
      // yumurtadan çıkış ya da evrim!
      const cat = CATS[Q.cat];
      Audio2.evo();
      $('evoTitle').textContent = after === 0 ? '🐣 YUMURTA ÇATLADI!' : '🎊 EVRİM!';
      $('evoChar').textContent = cat.mon[Math.max(0, after - 1)];
      $('evoName').textContent = after === 0 ? cat.mon[0] + ' bebeği doğdu!' : cat.adlar[after - 1];
      $('evoDetail').textContent = after === 3 ? 'TAM EVRİM! Artık fusion için hazır 🧬' : `Sonraki evrim: ${nextGoal(Q.cat)} doğru cevapta.`;
      $('evoVeil').classList.add('show');
      return;
    }
    Audio2.feed();
    $('resEmoji').textContent = '🍖';
    $('resTitle').textContent = 'Beslendi!';
    $('resDetail').innerHTML = `✅ ${Q.correct}/${Q.n} doğru → ${CATS[Q.cat].ad} canavarın ${Q.correct} büyüme puanı kazandı!<br><small>Bugün ${Q.correct} İngilizce kelime çalıştın 🎓</small>`;
    $('resultVeil').classList.add('show');
  } else {
    // fusion: %80+ şart (§4.8)
    const ok = Q.correct / Q.n >= CONFIG.FUSION_PASS;
    persist();
    BilnetBridge.submitScore({ gameId: 'kelime-canavarlari', score: ok ? 500 : Q.correct * 10, tier: 4,
      stats: { correct: Q.correct, wrong: Q.n - Q.correct, fusion: Q.hid, success: ok } });
    if (ok){
      S.hybrids.push(Q.hid);
      persist();
      const h = HYBRIDS.find(x => x.id === Q.hid);
      Audio2.evo();
      $('evoTitle').textContent = '🧬 FUSION BAŞARILI!';
      $('evoChar').textContent = h.e;
      $('evoName').textContent = h.ad;
      $('evoDetail').textContent = `%${Math.round(100 * Q.correct / Q.n)} doğrulukla nadir melez kazandın!`;
      $('evoVeil').classList.add('show');
    } else {
      $('resEmoji').textContent = '🧪';
      $('resTitle').textContent = 'Fusion Tutmadı!';
      $('resDetail').innerHTML = `%${Math.round(100 * Q.correct / Q.n)} doğruluk — fusion için %80 gerekli.<br><small>Canavarların sana küsmedi, tekrar dene! 💪</small>`;
      $('resultVeil').classList.add('show');
    }
  }
}
$('resOk').addEventListener('click', () => { $('resultVeil').classList.remove('show'); render(); });
$('evoOk').addEventListener('click', () => { $('evoVeil').classList.remove('show'); render(); });

/* ================= BAŞLAT ================= */
window.storage.get(SAVE_KEY).then(r => {
  if (r && r.value){ try { S = Object.assign(S, JSON.parse(r.value)); } catch (e) {} }
  render();
});
EduKit.onHidden(persist);   // gizlenince ve pagehide'da kaydet
