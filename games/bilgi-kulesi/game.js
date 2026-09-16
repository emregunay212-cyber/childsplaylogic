"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.18 — aynen) ================= */
const CONFIG = {
  FLOORS: 12,                              // 3 Etek + 3 Yamaç + 3 Tırmanış + 3 Zirve
  POINTS: [50,100,200,400,800,1600,3200,6400,12800,25600,51200,102400].slice(0,12).map((v,i)=>[50,100,200,400,800,1600,3200,6400,12800,25600,51200,102400][i]),
  SAFE: [4, 8],                            // güvenli katlar (Milyoner barajı)
  Q_TIME: 30,                              // soru başına 30 sn
  DAILY_TRIES: 3,                          // günlük 3 kule denemesi
  OWL_ACCURACY: 0.7,                       // Bilge Baykuş %70 isabetli tahmin verir
};
/* kat → zorluk: 1-3 Etek(z1) · 4-6 Yamaç(z2) · 7-9 Tırmanış(z3) · 10-12 Zirve(z3+EN/karışık) */
const BANK = [
  {z:1,q:"4 × 5 = ?",o:["10","15","20","25"],a:2},
  {z:1,q:"Hangisi canlıdır?",o:["Taş","Çiçek","Su","Bulut"],a:1},
  {z:1,q:"'okul' kelimesinin eş anlamlısı?",o:["deniz","bahçe","mektep","kalem"],a:2},
  {z:1,q:"Bir haftada kaç gün vardır?",o:["5","6","7","8"],a:2},
  {z:1,q:"9 × 6 = ?",o:["45","54","56","63"],a:1},
  {z:1,q:"Hangisi meyvedir?",o:["Havuç","Elma","Patates","Soğan"],a:1},
  {z:1,q:"'büyük' kelimesinin zıt anlamlısı?",o:["dev","iri","küçük","geniş"],a:2},
  {z:1,q:"77 − 55 = ?",o:["12","22","23","32"],a:1},
  {z:2,q:"Dünya'nın uydusu hangisidir?",o:["Mars","Güneş","Ay","Venüs"],a:2},
  {z:2,q:"43 + 26 − 23 = ?",o:["41","56","46","44"],a:2},
  {z:2,q:"'cömert' kelimesinin zıt anlamlısı?",o:["cimri","zengin","iyi","nazik"],a:0},
  {z:2,q:"Suyun donma sıcaklığı kaçtır?",o:["10°C","0°C","-10°C","100°C"],a:1},
  {z:2,q:"11 × 11 = ?",o:["111","121","122","131"],a:1},
  {z:2,q:"Sıvıdan gaza geçişin adı nedir?",o:["Erime","Donma","Buharlaşma","Yoğuşma"],a:2},
  {z:2,q:"Hangisi gezegen DEĞİLDİR?",o:["Mars","Jüpiter","Ay","Venüs"],a:2},
  {z:2,q:"İstiklal Marşı'nın yazarı kimdir?",o:["Atatürk","Mehmet Akif Ersoy","Yunus Emre","Nazım Hikmet"],a:1},
  {z:3,q:"9 × 8 + 17 = ?",o:["84","89","88","90"],a:1},
  {z:3,q:"Fotosentez bitkinin neresinde olur?",o:["Kök","Tohum","Kloroplast","Mitokondri"],a:2},
  {z:3,q:"Hangisi doğru yazılmıştır?",o:["yanliş","yannış","yalnış","yanlış"],a:3},
  {z:3,q:"10/12 kesrinin en sade hali?",o:["5/6","2/3","10/11","6/7"],a:0},
  {z:3,q:"Güneş'e en yakın gezegen?",o:["Venüs","Mars","Merkür","Dünya"],a:2},
  {z:3,q:"Ses hangi ortamda YAYILMAZ?",o:["Su","Hava","Demir","Boşluk"],a:3},
  {z:3,q:"16 × 5 = ?",o:["70","75","80","85"],a:2},
  {z:3,q:"Mevsimlerin oluşma nedeni?",o:["Güneşe uzaklık","Eksen eğikliği","Ay'ın dönüşü","Rüzgarlar"],a:1},
  {z:4,q:"'water' kelimesinin Türkçesi?",o:["ateş","su","hava","toprak"],a:1},
  {z:4,q:"Hücrenin enerji santrali hangisidir?",o:["Çekirdek","Ribozom","Mitokondri","Zar"],a:2},
  {z:4,q:"200 sayısının %25'i kaçtır?",o:["25","40","50","75"],a:2},
  {z:4,q:"'teacher' ne demektir?",o:["öğrenci","öğretmen","okul","ders"],a:1},
  {z:4,q:"Hangisi SAF maddedir?",o:["Hava","Tuzlu su","Altın","Limonata"],a:2},
  {z:4,q:"3² + 4² = ?",o:["25","24","49","12"],a:0},
  {z:4,q:"Türkiye'nin başkenti hangisidir?",o:["İstanbul","İzmir","Ankara","Bursa"],a:2},
  {z:4,q:"'library' ne demektir?",o:["kitap","kütüphane","laboratuvar","sınıf"],a:1},
];
const { pick, shuffle } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return { init,
    tension: () => tone(220, 0.5, 'sine', 0.03),          // soru gelirken gerilim tınısı (§4.18)
    ok: () => { tone(660,0.12,'triangle',0.08); tone(880,0.16,'triangle',0.08,0.1); },
    bad: () => { tone(220,0.3,'sawtooth',0.06); tone(160,0.4,'sawtooth',0.06,0.2); },
    floor: () => tone(520,0.1,'triangle',0.06),
    win: () => [523,659,784,1046,1318].forEach((f,i)=>tone(f,0.18,'triangle',0.08,i*0.13)) };
})();
const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(p){ const rec={...p,ts:Date.now()};
    try{ const r=await window.storage.get(this.QUEUE_KEY); const q=r&&r.value?JSON.parse(r.value):[];
      q.push(rec); while(q.length>50)q.shift(); await window.storage.set(this.QUEUE_KEY,JSON.stringify(q)); }catch(e){} },
};
const STATS_KEY = 'bilgikulesi_stats';
let STATS = { plays:0, best:0, peaks:0, day:'', triesToday:0 };
const dayKey = () => { const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
function loadStats(cb){ try{ window.storage.get(STATS_KEY).then(r=>{ if(r&&r.value){ try{ STATS=Object.assign(STATS,JSON.parse(r.value)); }catch(e){} } rollDay(); refreshMenu(); if(cb)cb(); }); }catch(e){ if(cb)cb(); } }
function saveStats(){ try{ window.storage.set(STATS_KEY,JSON.stringify(STATS)); }catch(e){} }
function rollDay(){ const t=dayKey(); if (STATS.day!==t){ STATS.day=t; STATS.triesToday=0; saveStats(); } }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const G = { state:'menu', floor:0, jokers:{half:1,owl:1,second:1}, secondActive:false,
  cur:null, used:new Set(), fuseT:null, locked:false };
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show')); $(id).classList.add('show'); }
function refreshMenu(){
  $('dailyLine').textContent = `🎫 Bugünkü hak: ${Math.max(0, CONFIG.DAILY_TRIES - STATS.triesToday)}/${CONFIG.DAILY_TRIES}`;
  $('bestLine').textContent = STATS.best > 0 ? `🏅 Rekorun: ${STATS.best} puan · 👑 Zirve: ${STATS.peaks} kez` : '';
  $('bPlay').disabled = STATS.triesToday >= CONFIG.DAILY_TRIES;
  if ($('bPlay').disabled) $('bPlay').textContent = '🌙 Yarın yine gel!';
  else $('bPlay').textContent = '🏰 KULEYE TIRMAN';
}
function buildTower(){
  const t = $('towerCol');
  t.innerHTML = '';
  for (let i=1;i<=CONFIG.FLOORS;i++){
    const f = document.createElement('div');
    f.className = 'floor' + (CONFIG.SAFE.includes(i) ? ' safe' : '');
    f.id = 'f'+i;
    f.textContent = `${i} · ${CONFIG.POINTS[i-1]}`;
    t.appendChild(f);
  }
}
function paintTower(){
  for (let i=1;i<=CONFIG.FLOORS;i++){
    const f = $('f'+i);
    f.classList.toggle('done', i <= G.floor);
    f.classList.toggle('cur', i === G.floor+1);
  }
}
function tierOfFloor(fl){ return fl<=3 ? 1 : fl<=6 ? 2 : fl<=9 ? 3 : 4; }
function nextQuestion(){
  const z = tierOfFloor(G.floor+1);
  let pool = BANK.filter(q => q.z===z && !G.used.has(q.q));
  if (!pool.length) pool = BANK.filter(q => q.z===z);
  const q = pick(pool);
  G.used.add(q.q);
  // şıkları karıştır
  const order = shuffle([0,1,2,3]);
  G.cur = { q:q.q, o:order.map(i=>q.o[i]), a:order.indexOf(q.a) };
  G.locked = false;
  $('floorChip').textContent = `🏰 Kat ${G.floor+1}/12 · ${['','🏕️','⛰️','🧗','🏔️'][z]}`;
  $('ptChip').textContent = '⭐ ' + CONFIG.POINTS[G.floor];
  $('qText').textContent = G.cur.q;
  const box = $('opts');
  box.innerHTML = '';
  G.cur.o.forEach((o,i) => {
    const b = document.createElement('button');
    b.className='opt'; b.textContent = String.fromCharCode(65+i)+') '+o;
    b.addEventListener('click', () => answer(i, b));
    box.appendChild(b);
  });
  Audio2.tension();
  startFuse();
  paintTower();
  refreshJokers();
}
function startFuse(){
  clearInterval(G.fuseT);
  let t0 = Date.now(), last = t0;
  $('fuse').style.width='100%';
  G.fuseT = setInterval(()=>{
    const now = Date.now();
    if (document.hidden){ last = now; return; }
    if (now - last > 400) t0 += now - last;   // sekme gizliyken geçen süre sayılmaz (dönüşte anında yanlış sayılıyordu)
    last = now;
    const left = 1 - (now-t0)/(CONFIG.Q_TIME*1000);
    $('fuse').style.width = Math.max(0,left*100)+'%';
    if (left<=0) answer(-1, null);
  },100);
}
function refreshJokers(){
  $('jHalf').disabled = !G.jokers.half || G.locked;
  $('jOwl').disabled = !G.jokers.owl || G.locked;
  $('jSecond').disabled = !G.jokers.second || G.secondActive || G.locked;
  $('jSecond').textContent = G.secondActive ? '🛡️ AKTİF' : '🛡️ Çift Hak';
}
function answer(i, btn){
  if (G.locked) return;
  clearInterval(G.fuseT);
  const right = i === G.cur.a;
  const btns = [...$('opts').children];
  if (right){
    G.locked = true;
    btns.forEach((b,j)=>{ b.disabled=true; if(j===G.cur.a) b.classList.add('right'); });
    Audio2.ok(); Audio2.floor();
    G.floor++;
    G.secondActive = false;
    paintTower();
    if (G.floor >= CONFIG.FLOORS) return setTimeout(()=>endRun('peak'), 900);
    setTimeout(nextQuestion, 1000);
  } else {
    // Çift Hak aktifse: bir yanlış affedilir (§4.18)
    if (G.secondActive && i >= 0){
      G.secondActive = false;
      if (btn){ btn.classList.add('wrong'); btn.classList.add('dim'); btn.disabled = true; }
      refreshJokers();
      startFuse();
      return;
    }
    G.locked = true;
    btns.forEach((b,j)=>{ b.disabled=true; if(j===G.cur.a) b.classList.add('right'); else if(j===i) b.classList.add('wrong'); });
    Audio2.bad();
    setTimeout(()=>endRun('fall'), 1200);
  }
}
/* jokerler */
$('jHalf').addEventListener('click', ()=>{
  if (!G.jokers.half || G.locked) return;
  G.jokers.half = 0;
  const wrongs = [0,1,2,3].filter(i=>i!==G.cur.a);
  shuffle(wrongs).slice(0,2).forEach(i => $('opts').children[i].classList.add('dim'));
  refreshJokers();
});
$('jOwl').addEventListener('click', ()=>{
  if (!G.jokers.owl || G.locked) return;
  G.jokers.owl = 0;
  // Bilge Baykuş: %70 doğru tahmin (sınıf istatistiği backend'i lig altyapısıyla gelecek — şimdilik bilge dost!)
  const guess = Math.random() < CONFIG.OWL_ACCURACY ? G.cur.a : pick([0,1,2,3].filter(i=>i!==G.cur.a));
  const b = $('opts').children[guess];
  b.textContent = '🦉 ' + b.textContent;
  refreshJokers();
});
$('bWalk').addEventListener('click', ()=>{
  if (G.state!=='playing' || G.locked) return;
  endRun('walk');
});
function startRun(){
  rollDay();
  if (STATS.triesToday >= CONFIG.DAILY_TRIES) return;
  STATS.triesToday++; STATS.plays++;
  saveStats();
  G.state='playing'; G.floor=0;
  G.jokers={half:1,owl:1,second:1}; G.secondActive=false;
  G.used.clear();
  show('screen-game');
  buildTower();
  nextQuestion();
}
$('jSecond').addEventListener('click', ()=>{
  if (!G.jokers.second || G.secondActive || G.locked) return;
  G.jokers.second = 0;
  G.secondActive = true;
  refreshJokers();
});
function earned(reason){
  if (reason==='peak') return CONFIG.POINTS[CONFIG.FLOORS-1];
  if (reason==='walk') return G.floor>0 ? CONFIG.POINTS[G.floor-1] : 0;
  // düşüş: son güvenli kata (4 veya 8) iner — §4.18 baraj sistemi
  const safe = CONFIG.SAFE.filter(s => s <= G.floor).pop() || 0;
  return safe>0 ? CONFIG.POINTS[safe-1] : 0;
}
function endRun(reason){
  if (G.state!=='playing') return;
  G.state='result';
  clearInterval(G.fuseT);
  const pts = earned(reason);
  if (pts > STATS.best) STATS.best = pts;
  if (reason==='peak') STATS.peaks++;
  saveStats();
  BilnetBridge.submitScore({ gameId:'bilgi-kulesi', score:pts, tier:tierOfFloor(Math.max(1,G.floor)),
    stats:{ floor:G.floor, reason } });
  $('endEmoji').textContent = reason==='peak' ? '👑' : reason==='walk' ? '🚪' : '🛡️';
  $('endTitle').textContent = reason==='peak' ? 'ZİRVEYE ÇIKTIN!' : reason==='walk' ? 'Akıllıca Çekildin!' : 'Güvenli Kata İndin!';
  $('resScore').textContent = pts;
  $('endDetail').innerHTML = reason==='peak'
    ? `12 katın TAMAMINI tırmandın — kule senin! 🏰`
    : reason==='walk'
      ? `${G.floor}. kattan puanını alıp çekildin. Bazen durmak da kazanmaktır!`
      : `Yanlış cevap kuleyi yıkmadı — ${CONFIG.SAFE.filter(s=>s<=G.floor).pop()||0}. güvenli katta durdun.` +
        `<br><small>Doğrusu işaretlendi; bir dahaki tırmanışta görüşürüz! 💪</small>`;
  if (reason==='peak') Audio2.win();
  $('endVeil').classList.add('show');
}
$('endOk').addEventListener('click', ()=>{
  $('endVeil').classList.remove('show');
  G.state='menu'; refreshMenu(); show('screen-menu');
});
$('bQuitTop').addEventListener('click', ()=>{
  clearInterval(G.fuseT);
  G.state='menu'; refreshMenu(); show('screen-menu');
});
$('bPlay').addEventListener('click', ()=>{ Audio2.init(); startRun(); });
EduKit.onHidden(saveStats);   // gizlenince ve pagehide'da kaydet
loadStats();
