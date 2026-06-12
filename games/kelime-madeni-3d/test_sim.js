/* ============================================================
   KELİME MADENİ 3D — Node duman testi (DOM/THREE stub'larıyla)
   Çalıştırma:  node games/kelime-madeni-3d/test_sim.js
   index.html içindeki ana oyun script'ini stub ortamında yükler,
   inşa sistemi (kum/cam/kapı/çatı/yarım blok) dahil temel akışı
   uçtan uca doğrular. CLAUDE.md çalışma kuralı: her değişiklikten
   sonra bu duman testi çalıştırılır.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(cond, msg){
  if (cond){ pass++; console.log('  ✔ ' + msg); }
  else { fail++; console.error('  ✘ ' + msg); }
}

/* ---------- DOM stub ---------- */
function makeEl(){
  const el = {
    style:{}, children:[], userData:{}, textContent:'', value:'', disabled:false,
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(){}, removeEventListener(){},
    appendChild(c){ el.children.push(c); return c; },
    removeChild(){}, setAttribute(){}, getAttribute(){ return null; },
    requestPointerLock(){}, focus(){}, closest(){ return null; },
    getContext(){ return ctx2d; },
  };
  Object.defineProperty(el, 'innerHTML', { get(){ return ''; }, set(){} });
  return el;
}
const ctx2d = new Proxy({}, {
  get(t, k){
    if (k === 'canvas') return { width: 256, height: 256 };
    return (..._a) => {};
  },
  set(){ return true; }
});
const elements = new Map();
const documentStub = {
  body: makeEl(),
  createElement(){ return makeEl(); },
  createElementNS(){ return makeEl(); },
  getElementById(id){ if(!elements.has(id)) elements.set(id, makeEl()); return elements.get(id); },
  addEventListener(){}, removeEventListener(){},
  exitPointerLock(){}, querySelectorAll(){ return []; },
  get pointerLockElement(){ return null; }, hidden:false,
};

/* ---------- THREE stub ---------- */
class V3 { constructor(x=0,y=0,z=0){ this.x=x; this.y=y; this.z=z; }
  set(x,y,z){ this.x=x; this.y=y; this.z=z; return this; }
  copy(v){ this.x=v.x; this.y=v.y; this.z=v.z; return this; }
  sub(v){ this.x-=v.x; this.y-=v.y; this.z-=v.z; return this; }
  normalize(){ const l=Math.hypot(this.x,this.y,this.z)||1; this.x/=l; this.y/=l; this.z/=l; return this; }
  unproject(){ return this; } multiplyScalar(s){ this.x*=s; this.y*=s; this.z*=s; return this; } }
class ColorStub { constructor(){ } copy(){ return this; } multiplyScalar(){ return this; } }
class Obj3D { constructor(){ this.position=new V3(); this.rotation={x:0,y:0,z:0,order:''};
  this.visible=true; this.userData={}; this.children=[]; }
  add(c){ this.children.push(c); } remove(){} }
const THREE = {
  Scene: class extends Obj3D { constructor(){ super(); this.background=null; this.fog=null; } },
  Fog: class {}, Color: ColorStub, Vector3: V3,
  PerspectiveCamera: class extends Obj3D { constructor(){ super(); this.aspect=1; } updateProjectionMatrix(){} },
  WebGLRenderer: class { constructor(){ } setPixelRatio(){} setSize(){} render(){} },
  MeshBasicMaterial: class { constructor(o){ Object.assign(this, o||{}); this.color=new ColorStub(); } },
  CanvasTexture: class { constructor(){ this.magFilter=0; this.minFilter=0; this.generateMipmaps=false; } },
  NearestFilter: 1,
  BufferGeometry: class { setAttribute(){} setIndex(){} dispose(){} },
  Float32BufferAttribute: class { constructor(){} },
  Mesh: class extends Obj3D { constructor(g,m){ super(); this.geometry=g||{dispose(){}}; this.material=m; } },
  BoxGeometry: class {}, EdgesGeometry: class { constructor(){} },
  LineSegments: class extends Obj3D { constructor(){ super(); } },
  LineBasicMaterial: class { constructor(){} },
  Group: class extends Obj3D {},
};

/* ---------- window/global stub ---------- */
const store = new Map();
const g = globalThis;
// Node'un salt-okunur globalleri (navigator, performance...) defineProperty ile ezilir
const def = (k, v) => Object.defineProperty(g, k, { value: v, writable: true, configurable: true });
def('document', documentStub);
def('window', g);
def('THREE', THREE);
def('navigator', { maxTouchPoints: 0 });
def('innerWidth', 1280); def('innerHeight', 720); def('devicePixelRatio', 1);
def('localStorage', { getItem:k=>store.has(k)?store.get(k):null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k) });
def('addEventListener', () => {}); def('removeEventListener', () => {});
let rafCb = null;
def('requestAnimationFrame', cb => { rafCb = cb; return 1; });
def('cancelAnimationFrame', () => {});
def('performance', { now: () => Date.now() });
// window.storage köprüsü script#0'da tanımlanıyor — onu da yüklüyoruz (aşağıda).

/* ---------- oyunu yükle ---------- */
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
(0, eval)(scripts[0]); // storage köprüsü

const EXPORTS = `
;globalThis.__G = { B, BINFO, binfo, OPAQUE, SOLID, isDoor, isOpenDoor, isDoorUpper,
  isRoof, isSlab, isHalf, shapeBoxes, blocks, light, IX, getB, setBlock, blockAt, solidAt,
  collides, physics, player, state, keys, touchMove, tryPlace, toggleDoor, raycast, lookDir,
  HOT, selectSlot, RECIPES, QUESTS, craft, canCraft, add, cnt, seedSandPockets,
  restoreFromSave, persistGame, rleEncode, rleDecode, u8ToB64, b64ToU8,
  WX, WY, WZ, HMAP, playerOverlapsCell, checkQuests };`;
(0, eval)(scripts[1] + EXPORTS);
const G = g.__G;
const B = G.B;

console.log('— Yükleme & dünya üretimi —');
ok(typeof G.tryPlace === 'function', 'oyun script\'i stub ortamında yüklendi (init çalıştı)');
ok(G.blocks.includes(B.SAND), 'dünyada kum var (yüzey yamaları/yeraltı cepleri)');
ok(G.QUESTS.length === 13, 'görev sayısı 13 (10 eski + 3 ev kurma)');
ok(G.HOT.length === 14, 'eşya çubuğu 14 slot');
ok(G.RECIPES.some(r => r.out === 'glass' && r.furn), 'cam tarifi fırın gerektiriyor');

console.log('— OPAQUE / SOLID ayrımı —');
ok(G.OPAQUE(B.SAND) === true,        'kum opak (ışığı keser)');
ok(G.OPAQUE(B.GLASS) === false,      'cam şeffaf (ışık geçer)');
ok(G.OPAQUE(B.ROOFW_N) === false,    'çatı şeffaf sayılır (komşu yüzler çizilir)');
ok(G.SOLID(B.GLASS) === true,        'cam katı (çarpışma var)');
ok(G.SOLID(B.DOOR_XA) === true,      'kapalı kapı katı');
ok(G.SOLID(B.DOORO_XA) === false,    'açık kapı geçilir');
ok(G.isHalf(B.SLAB_W) && G.isHalf(B.ROOFT_E), 'yarım yükseklik: yarım blok + çatı');
for (let t = 16; t <= 35; t++) ok(!!G.BINFO[t] && Array.isArray(G.BINFO[t].tex), `BINFO[${t}] geçerli (tex var)`);
ok(G.binfo(99).tex[0] === 3, 'bilinmeyen ID yedeği taş dokusuna düşüyor');

console.log('— Şekil kutuları —');
ok(G.shapeBoxes(B.SLAB_W,0,0,0).length === 1, 'yarım blok tek kutu');
ok(G.shapeBoxes(B.ROOFW_N,0,0,0).length === 2, 'çatı 2 kutu (alt yarım + üst çeyrek)');
ok(G.shapeBoxes(B.DOOR_XA,0,0,0)[0][5] < 0.2, 'kapalı X kapısı ince panel (sz<0.2)');

/* test platformu: spawn yakınında düz alan aç */
const px = Math.floor(G.player.x), pz = Math.floor(G.player.z);
let floorY = -1;
for (let y = G.WY - 2; y >= 1; y--) if (G.SOLID(G.blockAt(px, y, pz))) { floorY = y; break; }
const fy = floorY; // zemin hücresi; oyuncu fy+1'de durur
for (let dx = -1; dx <= 1; dx++) for (let dz = 0; dz <= 4; dz++) {
  const cx = px + dx, cz = pz + dz;
  G.setBlock(cx, fy, cz, B.GRASS);                      // düz zemin
  for (let y = fy + 1; y <= Math.min(G.WY - 1, fy + 4); y++) G.setBlock(cx, y, cz, B.AIR);
}
G.player.x = px + 0.5; G.player.z = pz + 0.5; G.player.y = fy + 1.02;
G.player.vx = G.player.vy = G.player.vz = 0; G.player.yaw = Math.PI; // -yaw sin/cos: PI → +Z yönü
G.player.pitch = -0.55; G.state.paused = false;

console.log('— Kapı yerleştirme / aç-kapa —');
G.add('door', 2);
G.selectSlot(G.HOT.findIndex(h => h.it === 'door'));
const doorCellsBefore = G.blocks.filter(t => G.isDoor(t)).length;
G.tryPlace(); // bakış: ileri-aşağı → zemine yerleştirme beklenir
const doorCells = [];
for (let i = 0; i < G.blocks.length; i++) if (G.isDoor(G.blocks[i])) doorCells.push(i);
ok(doorCells.length - doorCellsBefore === 2, 'kapı 2 hücre olarak yerleşti (alt+üst)');
ok(G.cnt('door') === 1, 'envanterden 1 kapı düştü');
ok((G.state.stats.doorPlaced || 0) === 1, 'doorPlaced sayacı arttı');
// hücre koordinatını çöz
const di = doorCells[0];
const dy = (di / (G.WX * G.WZ)) | 0, dz2 = ((di / G.WX) | 0) % G.WZ, dx2 = di % G.WX;
const lowY = G.isDoorUpper(G.blocks[di]) ? dy - 1 : dy;
const closedLow = G.getB(dx2, lowY, dz2);
ok(G.isDoor(closedLow) && !G.isOpenDoor(closedLow), 'yerleşen kapı kapalı durumda');
G.toggleDoor(dx2, lowY, dz2, closedLow);
ok(G.isOpenDoor(G.getB(dx2, lowY, dz2)) && G.isOpenDoor(G.getB(dx2, lowY + 1, dz2)), 'aç-kapa: iki yarı da açıldı');
// eşikte dururken kapatma REDDİ
const sx0 = G.player.x, sy0 = G.player.y, sz0 = G.player.z;
G.player.x = dx2 + 0.5; G.player.z = dz2 + 0.5; G.player.y = lowY;
G.toggleDoor(dx2, lowY, dz2, G.getB(dx2, lowY, dz2));
ok(G.isOpenDoor(G.getB(dx2, lowY, dz2)), 'oyuncu eşikteyken kapı KAPANMADI (fırlatma koruması)');
ok(!G.collides(G.player.x, G.player.y, G.player.z), 'açık kapı içinde çarpışma yok');
// açık kapı içindeyken ışın origin'i atlıyor mu
const ld = G.lookDir();
const hit = G.raycast(G.player.x, G.player.y + 1.62, G.player.z, ld[0], ld[1], ld[2], 5);
ok(!hit || hit.face !== null, 'açık kapı içinden nişan: origin hücresine takılmıyor');
G.player.x = sx0; G.player.y = sy0; G.player.z = sz0;
G.toggleDoor(dx2, lowY, dz2, G.getB(dx2, lowY, dz2));
ok(!G.isOpenDoor(G.getB(dx2, lowY, dz2)), 'oyuncu dışarıdayken kapı kapandı');

console.log('— Yarım blok çarpışması + oto-basamak —');
const slabX = px, slabZ = pz + 2;
G.setBlock(dx2, lowY, dz2, B.AIR); G.setBlock(dx2, lowY + 1, dz2, B.AIR); // kapıyı kaldır (yol açılsın)
G.setBlock(slabX, fy + 1, slabZ, B.SLAB_W);
ok(G.collides(slabX + 0.5, fy + 1.2, slabZ + 0.5), 'yarım blok alt yarıda katı');
ok(!G.collides(slabX + 0.5, fy + 1.5, slabZ + 0.5), 'yarım blok üst yarıda boş (tam 0.5 sınırı dahil)');
G.player.x = px + 0.5; G.player.z = pz + 0.5; G.player.y = fy + 1.02; G.player.vy = 0;
// slab hücresi üzerindeyken ulaşılan tepe yükseklik ölçülür (oyuncu sonra yoluna devam eder)
let maxYOnSlab = 0;
G.keys.KeyW = true;
for (let i = 0; i < 90; i++){
  G.physics(1 / 60);
  if (G.player.z > slabZ - 0.4 && G.player.z < slabZ + 1) maxYOnSlab = Math.max(maxYOnSlab, G.player.y);
}
G.keys.KeyW = false;
ok(maxYOnSlab > fy + 1.45, `oto-basamak: yarım bloğun üstüne yürüyerek çıkıldı (tepe y=${maxYOnSlab.toFixed(2)}, taban ${fy+1})`);
ok(G.player.z > slabZ + 0.5, 'yarım blokta takılma yok (üzerinden geçildi)');

console.log('— Çatı yön çözümü —');
G.add('roofw', 4);
G.selectSlot(G.HOT.findIndex(h => h.it === 'roofw'));
G.player.x = px + 0.5; G.player.z = pz + 0.5; G.player.y = fy + 1.02;
G.player.yaw = Math.PI; G.player.pitch = -0.8; // öne-aşağı bak (+Z)
const roofBefore = G.blocks.filter(t => G.isRoof(t)).length;
G.tryPlace();
const roofNow = [];
for (let i = 0; i < G.blocks.length; i++) if (G.isRoof(G.blocks[i])) roofNow.push(G.blocks[i]);
ok(roofNow.length - roofBefore === 1, 'çatı merdiveni yerleşti');
ok((G.state.stats.roofPlaced || 0) >= 1, 'roofPlaced sayacı arttı');

console.log('— Cam tarifi + görev sayacı —');
G.add('sand', 4); G.add('coal', 2); G.state.hasFurnace = true;
const rGlass = G.RECIPES.find(r => r.out === 'glass');
ok(G.canCraft(rGlass) === 'ok', 'cam üretilebilir (kum+kömür+fırın)');
G.craft(rGlass); G.craft(rGlass);
ok(G.cnt('glass') === 4, '2 üretimde 4 cam');
ok((G.state.stats.glassMade || 0) === 4, 'glassMade sayacı 4');
G.checkQuests();
ok(G.state.questDone[11] === true, '"4 cam üret" görevi tamamlandı');

console.log('— Kayıt / eski-kayıt kum telafisi —');
G.persistGame.call(null); // worldActive false olabilir — doğrudan restore senaryosu test edilir
const snapshot = Uint8Array.from(G.blocks);
const noSand = Uint8Array.from(snapshot, t => (t === B.SAND ? B.STONE : t));
const fakeOld = { blocks: G.u8ToB64(G.rleEncode(noSand)), st: { inv: { wood: 3 } }, pl: { x: px + 0.5, y: fy + 1.02, z: pz + 0.5, yaw: 0, pitch: -0.1 } };
ok(G.restoreFromSave(fakeOld) === true, 'eski kayıt yüklendi');
ok(G.blocks.includes(B.SAND), 'kumsuz eski dünyaya yeraltı kum cepleri eklendi (retrofit)');
ok(G.cnt('wood') === 3, 'kayıttaki envanter geri geldi');

console.log(`\nSONUÇ: ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);
