"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.15 — aynen) ================= */
const CONFIG = {
  TRIES: 6,
  POINT: tries => (7 - tries) * 50,    // (7 − deneme) × 50, günde 1 kez
  EPOCH: Date.UTC(2026, 0, 1),         // tarih bazlı deterministik seçim — herkes aynı kelime
};
/* Kelime listeleri: müfredat öncelikli (İngilizce ünite kelimeleri buraya eklenebilir — §4.15 notu) */
const TR_WORDS = [ // 5 harf + anlam + örnek cümle (eğitsel kapanış)
  ['KALEM','Yazı yazma aracı','Yeni kalemimle ödevimi yaptım.'],
  ['KİTAP','Okumak için sayfalardan oluşan eser','Kitap okumak hayal gücünü geliştirir.'],
  ['ORMAN','Ağaçlarla kaplı geniş alan','Ormanda kuş sesleri duyduk.'],
  ['DENİZ','Tuzlu büyük su kütlesi','Yazın denizde yüzmeyi severim.'],
  ['BAHÇE','Çiçek ve sebze yetiştirilen alan','Bahçede domates yetiştirdik.'],
  ['GÜNEŞ','Gündüz ışık ve ısı veren yıldız','Güneş doğunca kuşlar ötmeye başladı.'],
  ['TARLA','Ekin ekilen geniş toprak','Tarlada başaklar sararmıştı.'],
  ['KİRAZ','Kırmızı, çekirdekli yaz meyvesi','Kiraz ağacından bir avuç kiraz topladık.'],
  ['ŞEKER','Tatlı yiyecek maddesi','Bayramda şeker ikram ettik.'],
  ['BULUT','Gökyüzündeki su buharı kümesi','Bulutlar yağmur getirdi.'],
  ['KARGA','Siyah tüylü zeki kuş','Karga cevizi taşa vurarak kırdı.'],
  ['TAVAN','Odanın üst yüzeyi','Tavana balonlar astık.'],
  ['MASAL','Olağanüstü olayları anlatan öykü','Ninem bana masal anlattı.'],
  ['BALIK','Suda yaşayan, yüzgeçli hayvan','Akvaryumdaki balık kırmızıydı.'],
  ['ÇİÇEK','Bitkilerin renkli, kokulu bölümü','Anneme çiçek aldım.'],
  ['ZAMAN','Geçip giden süre','Zamanı iyi kullanmak gerekir.'],
  ['KÖPEK','Sadık, evcil hayvan','Köpeğimiz topu getirmeyi çok sever.'],
  ['KÖPRÜ','İki yakayı birleştiren yapı','Köprüden geçerken nehri izledik.'],
  ['SABAH','Günün ilk bölümü','Sabah erkenden kalkıp kahvaltı ettik.'],
  ['MEYVE','Ağaçların yenilebilir ürünü','Meyve yemek sağlığa iyi gelir.'],
  ['BİLGİ','Öğrenilen şeylerin bütünü','Bilgi paylaştıkça çoğalır.'],
  ['ARMUT','Sarı, tatlı bir meyve','Armut dalından düşünce yuvarlandı.'],
  ['ÇANTA','Eşya taşımaya yarayan gereç','Okul çantamı akşamdan hazırlarım.'],
  ['PERDE','Pencereyi örten kumaş','Perdeyi açınca güneş içeri doldu.'],
  ['SINIF','Ders yapılan oda','Sınıfımızı rengarenk süsledik.'],
  ['DÜNYA','Üzerinde yaşadığımız gezegen','Dünya, Güneş etrafında döner.'],
  ['HAVUÇ','Turuncu kök sebze','Tavşanlar havucu çok sever.'],
  ['TAVUK','Yumurtlayan kümes hayvanı','Tavuk sabah erkenden yem yedi.'],
  ['ŞEHİR','Büyük yerleşim yeri','Şehirde trafik yoğundu.'],
  ['VAPUR','Deniz yolcu taşıtı','Vapurla karşıya geçtik.'],
];
const EN_WORDS = [ // 4 harf + TR karşılık + örnek
  ['BOOK','kitap','I read a book every night.'],
  ['FISH','balık','The fish swims in the sea.'],
  ['STAR','yıldız','I saw a bright star.'],
  ['MOON','ay','The moon shines at night.'],
  ['TREE','ağaç','The tree has green leaves.'],
  ['BIRD','kuş','The bird sings in the morning.'],
  ['MILK','süt','I drink milk for breakfast.'],
  ['CAKE','pasta','We ate cake at the party.'],
  ['DOOR','kapı','Please close the door.'],
  ['RAIN','yağmur','The rain stopped at noon.'],
  ['BLUE','mavi','The sky is blue today.'],
  ['FROG','kurbağa','The frog jumps high.'],
  ['SHIP','gemi','The ship sails away.'],
  ['RING','yüzük','She wears a gold ring.'],
  ['LION','aslan','The lion is the king of animals.'],
  ['BEAR','ayı','The bear sleeps in winter.'],
  ['DUCK','ördek','The duck swims in the lake.'],
  ['CORN','mısır','We eat corn in summer.'],
  ['SNOW','kar','Snow is white and cold.'],
  ['WIND','rüzgar','The wind moves the clouds.'],
  ['HAND','el','Wash your hands before lunch.'],
  ['FOOT','ayak','My foot hurts after running.'],
  ['GAME','oyun','We play a fun game.'],
  ['HOME','ev','I go home after school.'],
  ['KING','kral','The king lives in a castle.'],
];
const TR_KB = ['ERTYUIOPĞÜ','ASDFGHJKLŞİ','ZCVBNMÖÇ'];
const EN_KB = ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return { init,
    key: () => tone(500,0.04,'square',0.03),
    row: () => tone(420,0.1,'triangle',0.05),
    win: () => [523,659,784,1046].forEach((f,i)=>tone(f,0.15,'triangle',0.08,i*0.11)),
    lose: () => { tone(300,0.25,'sawtooth',0.05); tone(230,0.3,'sawtooth',0.05,0.2); } };
})();
const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(p){ const rec={...p,ts:Date.now()};
    try{ const r=await window.storage.get(this.QUEUE_KEY); let q=[];
      try{ q=r&&r.value?JSON.parse(r.value):[]; if(!Array.isArray(q)) q=[]; }catch(e){ q=[]; }   // bozuk kuyruk sıfırlanır, puan sessizce kaybolmaz
      q.push(rec); while(q.length>50)q.shift(); await window.storage.set(this.QUEUE_KEY,JSON.stringify(q)); }catch(e){} },
};

/* ================= Günün kelimesi (deterministik — sunucu YOK) ================= */
function dayIndex(){
  // Yerel takvim günü (dayKey ile aynı kaynak). Date.now() UTC günüydü: TR'de 00:00-03:00 arası
  // tahta "yeni gün" diye sıfırlanıyor ama kelime dünkü kalıyordu → aynı kelime iki kez kazanılıyordu.
  const d = new Date();
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - CONFIG.EPOCH) / 86400000);
}
function dayKey(){
  const d = new Date();
  return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
}
function todaysWord(mode){
  const list = mode==='tr' ? TR_WORDS : EN_WORDS;
  return list[((dayIndex() % list.length) + list.length) % list.length];
}

/* ================= Kalıcı durum ================= */
const SAVE_KEY = 'gunlukkelime_save';
const STATS_KEY = 'gunlukkelime_stats';
let S = { day:'', tr:{rows:[],done:false,win:false}, en:{rows:[],done:false,win:false} };
let STATS = { plays:0, wins:0, streak:0, lastWinDay:'', best:0, dist:[0,0,0,0,0,0] };
function persist(){ try{ window.storage.set(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function saveStats(){ try{ window.storage.set(STATS_KEY, JSON.stringify(STATS)); }catch(e){} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
let mode = 'tr', cur = '', locked = false;
const upTr = s => s.toLocaleUpperCase('tr-TR');
function wordLen(){ return mode==='tr' ? 5 : 4; }
function target(){ return todaysWord(mode)[0]; }

function buildGrid(){
  const L = wordLen();
  const g = $('grid');
  const cs = Math.min(58, Math.floor((Math.min(innerWidth,480) - 40) / L) - 6);
  g.style.setProperty('--cs', cs+'px');
  g.style.gridTemplateColumns = `repeat(${L}, ${cs}px)`;
  g.innerHTML = '';
  for (let r=0;r<CONFIG.TRIES;r++) for (let c=0;c<L;c++){
    const el = document.createElement('div');
    el.className='cell'; el.id = 'c'+r+'_'+c;
    g.appendChild(el);
  }
  // önceki tahminleri geri yükle
  const st = S[mode];
  st.rows.forEach((row,r) => paintRow(r, row.guess, row.marks, true));
  cur = '';
  locked = st.done;
  $('msg').textContent = st.done
    ? (st.win ? 'Bugünü çözdün! Yarın yeni kelime 🎉' : 'Bugünlük bitti — yarın yeni şans!')
    : 'Bugünün kelimesini 6 denemede bul!';
  buildKb();
}
function buildKb(){
  const rows = mode==='tr' ? TR_KB : EN_KB;
  const kb = $('kb');
  kb.innerHTML = '';
  const marks = keyMarks();
  rows.forEach((row,i) => {
    const div = document.createElement('div');
    div.className='kbRow';
    if (i===2){
      const ent = document.createElement('button');
      ent.className='key wide'; ent.textContent='GİR';
      ent.addEventListener('click', submit);
      div.appendChild(ent);
    }
    row.split('').forEach(L => {
      const k = document.createElement('button');
      k.className = 'key' + (marks[L] ? ' '+marks[L] : '');
      k.textContent = L;
      k.addEventListener('click', () => typeKey(L));
      div.appendChild(k);
    });
    if (i===2){
      const del = document.createElement('button');
      del.className='key wide'; del.textContent='⌫';
      del.addEventListener('click', () => { cur = cur.slice(0,-1); renderCur(); });
      div.appendChild(del);
    }
    kb.appendChild(div);
  });
}
function keyMarks(){
  const m = {};
  for (const row of S[mode].rows){
    row.guess.split('').forEach((L,i) => {
      const k = row.marks[i];
      if (k==='g') m[L]='g';
      else if (k==='y' && m[L]!=='g') m[L]='y';
      else if (!m[L]) m[L]='x';
    });
  }
  return m;
}
function typeKey(L){
  if (locked || cur.length >= wordLen()) return;
  Audio2.init(); Audio2.key();
  cur += L;
  renderCur();
}
function renderCur(){
  const r = S[mode].rows.length;
  for (let c=0;c<wordLen();c++){
    const el = $('c'+r+'_'+c);
    el.textContent = cur[c]||'';
    el.classList.toggle('fill', !!cur[c]);
  }
}
function evalGuess(guess, ans){
  const marks = Array(guess.length).fill('x');
  const rest = ans.split('');
  guess.split('').forEach((L,i) => { if (ans[i]===L){ marks[i]='g'; rest[i]=null; } });
  guess.split('').forEach((L,i) => {
    if (marks[i]==='g') return;
    const j = rest.indexOf(L);
    if (j>=0){ marks[i]='y'; rest[j]=null; }
  });
  return marks;
}
function paintRow(r, guess, marks, instant){
  guess.split('').forEach((L,c) => {
    const el = $('c'+r+'_'+c);
    const apply = () => { el.textContent=L; el.classList.add(marks[c]); };
    instant ? apply() : setTimeout(apply, c*150);
  });
}
function submit(){
  if (locked) return;
  if (cur.length !== wordLen()){ $('msg').textContent = `${wordLen()} harf gerekli!`; return; }
  Audio2.row();
  const ans = target();
  const marks = evalGuess(cur, ans);
  const r = S[mode].rows.length;
  S[mode].rows.push({ guess: cur, marks });
  paintRow(r, cur, marks);
  const win = cur === ans;
  cur = '';
  if (win || S[mode].rows.length >= CONFIG.TRIES){
    S[mode].done = true; S[mode].win = win;
    locked = true;
    persist();
    setTimeout(() => finish(win), wordLen()*150 + 350);
  } else {
    persist();
    $('msg').textContent = `${CONFIG.TRIES - S[mode].rows.length} deneme hakkın kaldı`;
  }
  setTimeout(buildKb, wordLen()*150 + 100);
}
function finish(win){
  const tries = S[mode].rows.length;
  const w = todaysWord(mode);
  const pts = win ? CONFIG.POINT(tries) : 0;
  STATS.plays++;
  if (win){
    STATS.wins++;
    STATS.dist[tries-1]++;
    // ardışık gün serisi (ayrı rozet zinciri — §4.15)
    const t = dayKey();
    const yd = (()=>{ const d=new Date(); d.setDate(d.getDate()-1); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); })();
    STATS.streak = STATS.lastWinDay === yd ? STATS.streak+1 : (STATS.lastWinDay === t ? STATS.streak : 1);
    STATS.lastWinDay = t;
    if (pts > STATS.best) STATS.best = pts;
    Audio2.win();
  } else Audio2.lose();
  saveStats();
  refreshStreak();
  if (pts > 0) BilnetBridge.submitScore({ gameId:'gunluk-kelime', score:pts, tier:1,
    stats:{ tries, mode, word:w[0] } });
  $('endEmoji').textContent = win ? (tries<=2 ? '🤩' : '🎉') : '🌙';
  $('endTitle').textContent = win ? `${tries}. denemede buldun!` : 'Bugünlük bu kadar!';
  $('endSub').textContent = win ? `+${pts} puan · 🔥 Seri: ${STATS.streak} gün` : 'Cevabı birlikte öğrenelim:';
  $('meaningBox').innerHTML = mode==='tr'
    ? `<b>${w[0]}</b>: ${w[1]}<br><i>"${w[2]}"</i>`
    : `<b>${w[0]}</b> = ${w[1]}<br><i>"${w[2]}"</i>`;
  // deneme dağılımı
  $('distRow').innerHTML = '<b style="font-size:12px">Deneme dağılımın:</b>' +
    STATS.dist.map((n,i) => `<div style="display:flex;gap:6px;align-items:center"><span style="width:12px">${i+1}</span><div class="dBar" style="width:${Math.max(8, n / Math.max(1,...STATS.dist) * 100)}%">${n||''}</div></div>`).join('');
  $('endVeil').classList.add('show');
}
function refreshStreak(){ $('streakChip').textContent = '🔥 ' + STATS.streak; }
$('endOk').addEventListener('click', () => $('endVeil').classList.remove('show'));
document.querySelectorAll('.modeBtn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.modeBtn').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  mode = b.dataset.m;
  buildGrid();
}));
addEventListener('keydown', e => {
  if (e.key === 'Enter') return submit();
  if (e.key === 'Backspace'){ cur = cur.slice(0,-1); renderCur(); return; }
  // İngilizce modda ASCII büyütme: küçük "i" tr-TR ile "İ" olur ve EN klavyede bulunmazdı (FISH/BIRD/SHIP yazılamıyordu)
  const L = mode==='tr' ? upTr(e.key) : String(e.key).toUpperCase().replace('İ','I');
  const valid = (mode==='tr' ? TR_KB : EN_KB).join('').includes(L) && L.length===1;
  if (valid) typeKey(L);
});

/* ---- başlat: gün döngüsü ---- */
window.storage.get(SAVE_KEY).then(r => {
  if (r && r.value){ try{ S = Object.assign(S, JSON.parse(r.value)); }catch(e){} }
  const t = dayKey();
  if (S.day !== t){ S = { day:t, tr:{rows:[],done:false,win:false}, en:{rows:[],done:false,win:false} }; persist(); }
  return window.storage.get(STATS_KEY);
}).then(r => {
  if (r && r.value){ try{ STATS = Object.assign(STATS, JSON.parse(r.value)); }catch(e){} }
  refreshStreak();
  buildGrid();
});
EduKit.onHidden(() => { persist(); saveStats(); });   // gizlenince ve pagehide'da kaydet
