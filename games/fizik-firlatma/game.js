"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.20 — aynen) ================= */
const CONFIG = {
  START_AMMO_Q: 3,          // başlangıç: 3 soru = 3 mermi
  G_BASE: 1450,             // yerçekimi (bölüm çarpanıyla — "Ay bölümü" g düşük)
  POWER_MAX: 100,
  V_PER_POWER: 10.6,        // kuvvet→hız: uzaktaki kutuları vurabilmek için artırıldı
};
/* 12 el yapımı seviye (JSON tanımlı kutu dizilimleri — §4.20)
   b: kutular [x(0-1 sahne oranı), yerden kat, w, h(kat), hp] · s: yıldızlar · g: yerçekimi çarpanı */
const LEVELS = [
  { ad:'İlk Atış',      g:1,   b:[[0.72,0,1,2,40]], s:[[0.72,2.4]] },
  { ad:'İkiz Kule',     g:1,   b:[[0.62,0,1,2,40],[0.82,0,1,2,40]], s:[[0.62,2.4],[0.82,2.4]] },
  { ad:'Köprü',         g:1,   b:[[0.6,0,1,1,40],[0.84,0,1,1,40],[0.72,1,3,1,55]], s:[[0.72,0.4],[0.72,2.4]] },
  { ad:'Merdiven',      g:1,   b:[[0.55,0,1,1,40],[0.68,0,1,2,40],[0.82,0,1,3,50]], s:[[0.55,1.4],[0.68,2.4],[0.82,3.4]] },
  { ad:'Kale Duvarı',   g:1,   b:[[0.6,0,1,3,60],[0.78,0,1,3,60],[0.69,3,3,1,55]], s:[[0.69,0.5],[0.69,4.4]] },
  { ad:'AY BÖLÜMÜ 🌙',  g:0.38,b:[[0.7,0,1,2,40],[0.86,0,1,3,50]], s:[[0.7,2.4],[0.86,3.4]] },     // kavramsal altın madeni (§4.20)
  { ad:'Çifte Köprü',   g:1,   b:[[0.55,0,1,1,40],[0.7,0,1,1,40],[0.62,1,3,1,50],[0.85,0,1,2,50]], s:[[0.62,2.2],[0.85,2.4]] },
  { ad:'Piramit',       g:1,   b:[[0.62,0,1,1,45],[0.72,0,1,1,45],[0.82,0,1,1,45],[0.67,1,1,1,45],[0.77,1,1,1,45],[0.72,2,1,1,45]], s:[[0.72,3.4]] },
  { ad:'Yüksek Burç',   g:1,   b:[[0.78,0,1,5,75]], s:[[0.78,5.4],[0.66,0.4]] },
  { ad:'AY KALESİ 🌙',  g:0.38,b:[[0.6,0,1,3,55],[0.8,0,1,4,60],[0.7,4,3,1,55]], s:[[0.7,5.4],[0.6,3.4]] },
  { ad:'Labirent Duvar',g:1,   b:[[0.55,0,1,2,50],[0.68,0,1,4,60],[0.82,0,1,2,50],[0.75,2,2,1,50]], s:[[0.62,0.4],[0.82,2.4],[0.75,3.3]] },
  { ad:'BÜYÜK FİNAL',   g:1,   b:[[0.55,0,1,3,60],[0.68,0,1,5,75],[0.84,0,1,4,65],[0.61,3,2,1,55],[0.76,4,2,1,60]], s:[[0.61,4.3],[0.76,5.4],[0.84,4.4]] },
];
const { randInt: rnd, pick, shuffle } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)
function ammoQ(){
  const k = rnd(0,2);
  let q, ans;
  if (k===0){ const a=rnd(4,12),b=rnd(4,12); q=`${a} + ${b} = ?`; ans=a+b; }
  else if (k===1){ const a=rnd(2,9),b=rnd(2,9); q=`${a} × ${b} = ?`; ans=a*b; }
  else { const F=[['Yerçekimi cisimleri nereye çeker?','Yere','Göğe','Yana'],['Açı 90° olursa atış nereye gider?','Dik yukarı','İleri','Geriye'],['Daha güçlü çekersen mermi ne olur?','Daha uzağa gider','Yavaşlar','Geri döner'],['Ay\'da yerçekimi Dünya\'ya göre?','Daha az','Daha çok','Aynı']];
    const f=pick(F); const o=shuffle([f[1],f[2],f[3]]);
    return { q:f[0], o, a:o.indexOf(f[1]) }; }
  const set = new Set([ans]);
  while (set.size<3){ const v=ans+rnd(-4,4); if(v>0) set.add(v); }
  const o = shuffle([...set].map(String));
  return { q, o, a:o.indexOf(String(ans)) };
}

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return { init,
    stretch: p => tone(200+p*2.4, 0.05, 'sine', 0.03),
    launch: () => { tone(380,0.12,'square',0.06); tone(520,0.1,'square',0.04,0.08); },
    hit: () => tone(220,0.1,'square',0.05),
    breakB: () => { tone(160,0.18,'sawtooth',0.06); tone(120,0.2,'sawtooth',0.05,0.1); },
    star: () => { tone(880,0.1,'triangle',0.07); tone(1175,0.14,'triangle',0.07,0.09); },
    ok: () => { tone(660,0.1,'triangle',0.07); tone(880,0.12,'triangle',0.07,0.09); },
    bad: () => tone(170,0.22,'sawtooth',0.05),
    win: () => [523,659,784,1046].forEach((f,i)=>tone(f,0.16,'triangle',0.08,i*0.12)) };
})();
const BilnetBridge = {
  QUEUE_KEY: 'bilnet_score_queue',
  async submitScore(p){ const rec={...p,ts:Date.now()};
    try{ const r=await window.storage.get(this.QUEUE_KEY); const q=r&&r.value?JSON.parse(r.value):[];
      q.push(rec); while(q.length>50)q.shift(); await window.storage.set(this.QUEUE_KEY,JSON.stringify(q)); }catch(e){} },
};
const STATS_KEY = 'fizikfirlatma_stats';
let STATS = { stars:{}, unlocked:1 };   // stars: {lvlIdx: 0-3}
function loadStats(){ try{ window.storage.get(STATS_KEY).then(r=>{ if(r&&r.value){ try{ STATS=Object.assign(STATS,JSON.parse(r.value)); }catch(e){} } renderMenu(); }); }catch(e){} }
function saveStats(){ try{ window.storage.set(STATS_KEY,JSON.stringify(STATS)); }catch(e){} }

/* ================= Game ================= */
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx2 = cv.getContext('2d');
const G = {
  state:'menu', lvlIdx:0, lvl:null,
  ammo:0, ammoEarnQ:0,
  boxes:[], stars:[], starsGot:0,
  proj:null, drag:null, angle:45, power:70,
  bestShots:[],
  raf:0, lastTs:0,
};
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show')); $(id).classList.add('show'); }
function layout(){ cv.width = innerWidth; cv.height = innerHeight; }
const groundY = () => cv.height - 60;
/* Sapan konumu: mermiyi geriye (sol/aşağı) çekip güç toplamaya yetecek alan kalsın.
   Soldan en az ~120px boşluk bırak (geniş çekme payı), ama hedefler 0.55–0.86 oranında
   olduğu için kabaca ekranın %22'sini geçme (mermi yine de uzağa atılabilsin). */
const slingX = () => Math.max(120, Math.min(cv.width*0.22, 260));
const slingY = () => groundY() - 70;
/* Maksimum geriye çekme mesafesi: sapanın solundaki kullanılabilir alanla orantılı.
   Geniş ekranda büyük, dar ekranda makul; POWER_MAX'a bu mesafede ulaşılır. */
const maxDrag = () => Math.max(120, Math.min(slingX() - 16, 260));
const unit = () => Math.min(56, cv.height/9);
function renderMenu(){
  const g = $('lvlGrid');
  g.innerHTML = '';
  LEVELS.forEach((L,i)=>{
    const open = i < STATS.unlocked;
    const st = STATS.stars[i]||0;
    const b = document.createElement('button');
    b.className = 'lvlBtn' + (open?'':' lockedL');
    b.innerHTML = `${open ? (i+1) : '🔒'}<small>${st?'⭐'.repeat(st):(open?L.ad.slice(0,8):'')}</small>`;
    if (open) b.addEventListener('click', ()=>{ Audio2.init(); startLevel(i); });
    g.appendChild(b);
  });
  const total = Object.values(STATS.stars).reduce((s,v)=>s+v,0);
  $('bestLine').textContent = total>0 ? `⭐ Toplam yıldız: ${total}/${LEVELS.length*3}` : '';
}
function startLevel(i){
  G.state='earn';
  G.lvlIdx = i;
  G.lvl = LEVELS[i];
  layout();
  const u = unit();
  G.boxes = G.lvl.b.map(b => ({
    x: b[0]*cv.width, y: groundY() - (b[1]+b[3])*u,
    w: b[2]*u*0.9, h: b[3]*u, hp: b[4], maxHp: b[4], dead:false }));
  G.stars = G.lvl.s.map(s => ({ x: s[0]*cv.width + u*0.45, y: groundY() - s[1]*u, got:false }));
  G.starsGot = 0;
  G.ammo = 0; G.ammoEarnQ = CONFIG.START_AMMO_Q;
  G.proj = null; G.drag = null;
  G.bestShots = [];
  G.angle = 45; G.power = 70;
  show('screen-game');
  refreshHUD();
  earnAmmo();
  G.lastTs = performance.now();
  if (!G.raf) G.raf = requestAnimationFrame(loop);
}
/* mermi kazanma: atış öncesi mini soru (§4.20 birinci eğitsel katman) */
function earnAmmo(){
  if (G.ammoEarnQ <= 0){ G.state='playing'; return; }
  G.state='earn';
  const q = ammoQ();
  $('aqQ').textContent = q.q;
  const box = $('aqOpts');
  box.innerHTML = '';
  q.o.forEach((o,i)=>{
    const b = document.createElement('button');
    b.className='opt'; b.textContent=o;
    b.addEventListener('click', ()=>{
      [...box.children].forEach((x,j)=>{ x.disabled=true; if(j===q.a)x.classList.add('right'); else if(j===i)x.classList.add('wrong'); });
      if (i===q.a){ G.ammo++; Audio2.ok(); } else Audio2.bad();
      G.ammoEarnQ--;
      refreshHUD();
      setTimeout(()=>{
        if (G.ammoEarnQ>0) earnAmmo();
        else {
          $('ammoVeil').classList.remove('show');
          if (G.ammo<=0){ G.ammoEarnQ = 1; earnAmmo(); return; }   // hiç mermi yoksa 1 şans daha
          G.state='playing';
        }
      }, 700);
    });
    box.appendChild(b);
  });
  $('ammoVeil').classList.add('show');
}
function refreshHUD(){
  $('lvlChip').textContent = `🎯 ${G.lvlIdx+1}. ${G.lvl.ad}`;
  $('ammoChip').textContent = '🐦 ' + G.ammo;
  $('starChip').textContent = `⭐ ${G.starsGot}/${G.stars.length}`;
  $('physLine').textContent = `📐 ${Math.round(G.angle)}° · 💪 ${Math.round(G.power)}` + (G.lvl && G.lvl.g<1 ? ' · 🌙 düşük yerçekimi!' : '');
}
function loop(ts){
  if (G.state!=='playing' && G.state!=='earn' && G.state!=='flying'){ G.raf=0; return; }
  const dt = Math.min(0.04,(ts-G.lastTs)/1000||0.016);
  G.lastTs = ts;
  if (G.proj){
    const g = CONFIG.G_BASE * G.lvl.g;
    G.proj.vy += g*dt;
    G.proj.x += G.proj.vx*dt;
    G.proj.y += G.proj.vy*dt;
    G.proj.trail.push({x:G.proj.x, y:G.proj.y});
    if (G.proj.trail.length>40) G.proj.trail.shift();
    // kutu çarpışması
    for (const b of G.boxes){
      if (b.dead) continue;
      if (G.proj.x > b.x-8 && G.proj.x < b.x+b.w+8 && G.proj.y > b.y-8 && G.proj.y < b.y+b.h+8){
        const dmg = Math.min(90, Math.hypot(G.proj.vx,G.proj.vy)/9);
        b.hp -= dmg;
        Audio2.hit();
        G.proj.vx *= 0.35; G.proj.vy *= 0.35;
        if (b.hp<=0){ b.dead=true; Audio2.breakB(); }
        break;
      }
    }
    // yıldız toplama (mermiyle değme)
    for (const s of G.stars){
      if (!s.got && Math.hypot(s.x-G.proj.x, s.y-G.proj.y) < 26){
        s.got = true; G.starsGot++;
        Audio2.star();
        refreshHUD();
      }
    }
    // açık yıldızlar: kutu yıkılınca düşen yıldız da sayılır (kutu üstündekiler)
    for (const s of G.stars){
      if (s.got) continue;
      const support = G.boxes.some(b=>!b.dead && s.x>b.x-10 && s.x<b.x+b.w+10 && Math.abs((b.y)-(s.y))<unit()*1.2);
      // yıldız desteksiz kaldıysa yere iner; yerdeki yıldız mermiyle alınır (basit model)
    }
    // zemin / sahne dışı
    if (G.proj.y > groundY()-8 || G.proj.x > cv.width+40 || G.proj.x < -40){
      shotEnded();
    }
  }
  draw();
  G.raf = requestAnimationFrame(loop);
}
function shotEnded(){
  if (!G.proj) return;
  G.bestShots.push({ angle:G.proj.a0, power:G.proj.p0, stars:G.starsGot });
  G.proj = null;
  if (G.starsGot >= G.stars.length) return endLevel(true);
  if (G.ammo <= 0){
    // mermi bitti: yıldız varsa kısmi başarı; yoksa yeniden mermi kazanma şansı
    if (G.starsGot > 0) return endLevel(false);
    G.ammoEarnQ = 2;
    earnAmmo();
    return;
  }
  G.state='playing';
}
function endLevel(allStars){
  G.state='result';
  // yıldız: 1-3 (kalan mermiye göre — §4.20)
  const stars = allStars ? (G.ammo>=2 ? 3 : G.ammo>=1 ? 2 : 1) : (G.starsGot>0 ? 1 : 0);
  if ((STATS.stars[G.lvlIdx]||0) < stars) STATS.stars[G.lvlIdx] = stars;
  if (stars>0 && G.lvlIdx+1 >= STATS.unlocked) STATS.unlocked = Math.min(LEVELS.length, G.lvlIdx+2);
  saveStats();
  const score = G.starsGot*200 + G.ammo*100 + stars*150;
  BilnetBridge.submitScore({ gameId:'fizik-firlatma', score, tier: Math.min(4, 1+Math.floor(G.lvlIdx/3)),
    stats:{ level:G.lvlIdx+1, stars, starsGot:G.starsGot } });
  // en verimli açı raporu (§4.20 fizik kazanımı — bilinçli ayar teşviki)
  const best = G.bestShots.sort((a,b)=>b.stars-a.stars)[0];
  $('endEmoji').textContent = stars===3 ? '🏆' : stars>0 ? '🎯' : '💪';
  $('endTitle').textContent = stars>0 ? 'Bölüm Tamam!' : 'Bir Daha Dene!';
  $('resStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(Math.max(0,3-stars));
  $('endDetail').innerHTML =
    `🌟 Toplanan yıldız: <b>${G.starsGot}/${G.stars.length}</b> · 🐦 Kalan mermi: <b>${G.ammo}</b>` +
    (best ? `<br>📐 <b>En verimli atışın: ${Math.round(best.angle)}° / kuvvet ${Math.round(best.power)}</b> — açıyı hatırla!` : '') +
    (G.lvl.g<1 ? `<br>🌙 Ay'da yerçekimi az olduğu için mermi daha uzağa süzüldü — fark ettin mi?` : '');
  $('endNext').style.display = (stars>0 && G.lvlIdx+1 < LEVELS.length) ? '' : 'none';
  if (stars>0) Audio2.win();
  $('endVeil').classList.add('show');
}
$('endNext').addEventListener('click', ()=>{ $('endVeil').classList.remove('show'); startLevel(G.lvlIdx+1); });
$('endMenu').addEventListener('click', ()=>{ $('endVeil').classList.remove('show'); G.state='menu'; renderMenu(); show('screen-menu'); });
function draw(){
  // sahne
  const g = ctx2.createLinearGradient(0,0,0,cv.height);
  if (G.lvl && G.lvl.g < 1){ g.addColorStop(0,'#1a1a3e'); g.addColorStop(1,'#2a2a55'); }
  else { g.addColorStop(0,'#aee3ff'); g.addColorStop(1,'#cfeaff'); }
  ctx2.fillStyle = g;
  ctx2.fillRect(0,0,cv.width,cv.height);
  if (G.lvl && G.lvl.g<1){
    ctx2.fillStyle='rgba(255,255,255,.8)';
    for (let i=0;i<24;i++) ctx2.fillRect((i*167)%cv.width, (i*89)%Math.round(groundY()*0.8), 2.5, 2.5);
    ctx2.font='40px system-ui'; ctx2.fillText('🌍', cv.width-70, 70);
  } else {
    ctx2.font='34px system-ui'; ctx2.fillText('☀️', cv.width-66, 56);
  }
  // zemin
  ctx2.fillStyle = G.lvl && G.lvl.g<1 ? '#5a5a7e' : '#5fae6e';
  ctx2.fillRect(0,groundY(),cv.width,cv.height-groundY());
  // yörünge öngörüsü (ilk bölümlerde açık, yalnızca son 3 bölümde kapalı — §4.20)
  const showGuide = G.lvlIdx < 9;
  if (G.drag && showGuide){
    const v = launchVel();
    let x=slingX(), y=slingY(), vx=v.vx, vy=v.vy;
    ctx2.fillStyle='rgba(255,255,255,.7)';
    const gg = CONFIG.G_BASE*G.lvl.g;
    for (let t=0;t<26;t++){
      vy += gg*0.045; x += vx*0.045; y += vy*0.045;
      if (y>groundY()) break;
      ctx2.beginPath(); ctx2.arc(x,y,3.2,0,7); ctx2.fill();
    }
  }
  // kutular
  for (const b of G.boxes){
    if (b.dead) continue;
    ctx2.fillStyle = `hsl(28 ${40+40*(b.hp/b.maxHp)}% ${38+18*(b.hp/b.maxHp)}%)`;
    ctx2.strokeStyle = '#5a3a1e'; ctx2.lineWidth=2.5;
    ctx2.fillRect(b.x, b.y, b.w, b.h);
    ctx2.strokeRect(b.x, b.y, b.w, b.h);
    if (b.hp < b.maxHp*0.55){
      ctx2.strokeStyle='rgba(60,30,10,.6)'; ctx2.lineWidth=1.8;
      ctx2.beginPath(); ctx2.moveTo(b.x+b.w*0.3,b.y+4); ctx2.lineTo(b.x+b.w*0.55,b.y+b.h*0.6); ctx2.stroke();
    }
  }
  // yıldızlar
  ctx2.font='26px system-ui'; ctx2.textAlign='center';
  for (const s of G.stars) if (!s.got) ctx2.fillText('⭐', s.x, s.y);
  // sapan
  const sx=slingX(), sy=slingY();
  ctx2.strokeStyle='#5a3a1e'; ctx2.lineWidth=7; ctx2.lineCap='round';
  ctx2.beginPath(); ctx2.moveTo(sx-12, groundY()); ctx2.lineTo(sx-12, sy+6); ctx2.stroke();
  ctx2.beginPath(); ctx2.moveTo(sx+12, groundY()); ctx2.lineTo(sx+12, sy+6); ctx2.stroke();
  // lastik + mermi (çekiliyorken)
  if (G.drag){
    ctx2.strokeStyle='#8a4a2a'; ctx2.lineWidth=4;
    ctx2.beginPath(); ctx2.moveTo(sx-12, sy+6); ctx2.lineTo(G.drag.x, G.drag.y); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(sx+12, sy+6); ctx2.lineTo(G.drag.x, G.drag.y); ctx2.stroke();
    ctx2.font='30px system-ui';
    ctx2.fillText('🐦', G.drag.x, G.drag.y+8);
  } else if (!G.proj && G.ammo>0 && G.state==='playing'){
    ctx2.font='30px system-ui';
    ctx2.fillText('🐦', sx, sy+8);
  }
  // uçan mermi + iz
  if (G.proj){
    ctx2.fillStyle='rgba(255,255,255,.5)';
    for (const t of G.proj.trail) ctx2.fillRect(t.x-2,t.y-2,4,4);
    ctx2.font='30px system-ui';
    ctx2.fillText('🐦', G.proj.x, G.proj.y+8);
  }
  ctx2.textAlign='start';
}
function launchVel(){
  const rad = G.angle * Math.PI/180;
  const v = G.power * CONFIG.V_PER_POWER;
  return { vx: Math.cos(rad)*v, vy: -Math.sin(rad)*v };
}
/* sapan girişi: sürükle → açı+kuvvet SAYISAL (§4.20 ikinci eğitsel katman) */
cv.addEventListener('pointerdown', e=>{
  if (G.state!=='playing' || G.proj || G.ammo<=0) return;
  G.drag = { x:e.clientX, y:e.clientY };
  updateAim(e);
});
cv.addEventListener('pointermove', e=>{ if (G.drag) updateAim(e); });
function updateAim(e){
  G.drag = { x:e.clientX, y:e.clientY };
  const dx = slingX() - e.clientX, dy = e.clientY - slingY();
  G.angle = Math.max(5, Math.min(85, Math.atan2(dy, dx) * 180/Math.PI));
  if (isNaN(G.angle)) G.angle = 45;
  // Çekme mesafesini POWER_MAX'a oranla: maxDrag kadar çekince tam güç.
  const pull = Math.hypot(dx, dy);
  G.power = Math.max(15, Math.min(CONFIG.POWER_MAX, (pull/maxDrag())*CONFIG.POWER_MAX));
  Audio2.stretch(G.power);
  refreshHUD();
}
cv.addEventListener('pointerup', ()=>{
  if (!G.drag || G.state!=='playing') { G.drag=null; return; }
  G.drag = null;
  if (G.ammo<=0) return;
  G.ammo--;
  const v = launchVel();
  G.proj = { x:slingX(), y:slingY(), vx:v.vx, vy:v.vy, trail:[], a0:G.angle, p0:G.power };
  Audio2.launch();
  refreshHUD();
});
$('bQuitTop').addEventListener('click', ()=>{
  $('ammoVeil').classList.remove('show');
  G.state='menu'; renderMenu(); show('screen-menu');
});
EduKit.onHidden(saveStats);   // gizlenince ve pagehide'da kaydet
addEventListener('resize', ()=>{ if(G.state==='playing') layout(); });
loadStats();
renderMenu();
