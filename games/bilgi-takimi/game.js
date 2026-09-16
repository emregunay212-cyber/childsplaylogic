"use strict";
/* ================= CONFIG (EGITSEL-OYUN-PLANI §4.6 — aynen) ================= */
const CONFIG = {
  DAILY_ENERGY: 20,                                    // günlük enerji (ekran süresi sınırı — veli dostu)
  QUEST_TYPES: {
    fast:   { ad: 'Hızlı',  soru: 3,  enerji: 1, bonus: 30,  xp: 20, ic: '⚡' },
    normal: { ad: 'Normal', soru: 5,  enerji: 2, bonus: 60,  xp: 40, ic: '📘' },
    epic:   { ad: 'Destan', soru: 10, enerji: 3, bonus: 150, xp: 90, ic: '🐉' },
  },
  CHAR_EVERY: 5,            // her 5 görevde bir yeni karakter şansı (garantili)
  Q_TIME: 15,               // soru süresi sn
  POINT_PER_CORRECT: 10,
  SEASON_QUESTS: 30,        // aylık görev kitabı
  XP_PER_LEVEL: 100,
};
const DERS = { mat: ['🧮', 'Matematik'], tr: ['📚', 'Türkçe'], fen: ['🔬', 'Fen'], en: ['🇬🇧', 'İngilizce'], mix: ['🎲', 'Karışık'] };

/* Karakterler — pasif bonus MAX +%25 (asla cevabı vermez, sadece puan çarpanı) */
const CHARS = [
  { id: 'asli',   ad: 'Matematikçi Aslı', e: '👧', ders: 'mat', b: 10 },
  { id: 'burak',  ad: 'Fenci Burak',      e: '👦', ders: 'fen', b: 10 },
  { id: 'defne',  ad: 'Sözcü Defne',      e: '👩', ders: 'tr',  b: 10 },
  { id: 'lina',   ad: 'Lingo Lina',       e: '🧚', ders: 'en',  b: 10 },
  { id: 'kerem',  ad: 'Kâşif Kerem',      e: '🧭', ders: 'mix', b: 5  },
  { id: 'pamuk',  ad: 'Profesör Pamuk',   e: '🐱', ders: 'mat', b: 15 },
  { id: 'baykus', ad: 'Bilge Baykuş',     e: '🦉', ders: 'fen', b: 15 },
  { id: 'gulce',  ad: 'Kitap Kurdu Gülce',e: '🐛', ders: 'tr',  b: 15 },
  { id: 'max',    ad: 'Papağan Max',      e: '🦜', ders: 'en',  b: 15 },
  { id: 'selin',  ad: 'Süper Selin',      e: '🦸', ders: 'mix', b: 25 },
];
const QUEST_NAMES = {
  mat: ['Kütüphane Hesabı', 'Pazar Matematiği', 'Sayı Avı'],
  tr:  ['Sözlük Avı', 'Kelime Köprüsü', 'Yazım Devriyesi'],
  fen: ['Laboratuvar Görevi', 'Doğa Gözlemi', 'Uzay Üssü'],
  en:  ['English Club', 'Kelime Pasaportu', 'Çeviri Masası'],
  mix: ['Bilgi Turu', 'Karma Sınav', 'Büyük Keşif'],
};

/* ================= SORU BANKASI (fabrika bankalarından gömülü 96 + EN üretici) ================= */
const BANK = [
  {d:"mat",z:2,q:"43 + 34 − 9 = ?",o:["68","67","78","63"],a:0},
  {d:"mat",z:3,q:"10/12 kesrinin en sade hali?",o:["2/3","6/7","10/11","5/6"],a:3},
  {d:"mat",z:2,q:"43 + 26 − 23 = ?",o:["41","56","46","44"],a:2},
  {d:"mat",z:3,q:"9/12 kesrinin en sade hali?",o:["1/2","1/1","9/11","3/4"],a:3},
  {d:"mat",z:3,q:"9 × 8 + 17 = ?",o:["84","90","88","89"],a:3},
  {d:"mat",z:2,q:"35 + 28 − 13 = ?",o:["45","60","50","40"],a:2},
  {d:"mat",z:2,q:"55 + 15 − 15 = ?",o:["50","54","55","57"],a:2},
  {d:"mat",z:3,q:"6/12 kesrinin en sade hali?",o:["2/3","6/11","1/2","1/1"],a:2},
  {d:"mat",z:2,q:"49 + 28 − 13 = ?",o:["54","64","74","69"],a:1},
  {d:"mat",z:3,q:"16 × 5 = ?",o:["75","80","70","64"],a:1},
  {d:"mat",z:3,q:"13 × 8 = ?",o:["91","104","117","112"],a:1},
  {d:"mat",z:1,q:"2/8 + 1/8 = ?",o:["3/16","1/4","3/8","1/2"],a:2},
  {d:"mat",z:2,q:"23 + 35 − 23 = ?",o:["35","40","25","37"],a:0},
  {d:"mat",z:2,q:"32 + 35 − 16 = ?",o:["51","50","53","61"],a:0},
  {d:"mat",z:3,q:"9 × 4 + 39 = ?",o:["73","75","74","65"],a:1},
  {d:"mat",z:2,q:"73 + 47 − 20 = ?",o:["100","95","98","102"],a:0},
  {d:"mat",z:1,q:"2/4 + 1/4 = ?",o:["4/5","3/4","1/2","3/8"],a:1},
  {d:"mat",z:3,q:"15 × 3 = ?",o:["35","42","45","46"],a:2},
  {d:"mat",z:1,q:"4 × 5 = ?",o:["10","15","20","25"],a:2},
  {d:"mat",z:1,q:"77 − 55 = ?",o:["20","32","27","22"],a:3},
  {d:"mat",z:1,q:"79 − 38 = ?",o:["31","36","46","41"],a:3},
  {d:"mat",z:2,q:"6 × 6 = ?",o:["26","46","36","37"],a:2},
  {d:"mat",z:1,q:"9 × 7 = ?",o:["64","63","54","56"],a:1},
  {d:"mat",z:2,q:"28 + 43 − 23 = ?",o:["46","49","48","47"],a:2},
  {d:"mat",z:1,q:"8/10 + 1/10 = ?",o:["9/10","1/1","9/20","10/11"],a:0},
  {d:"mat",z:3,q:"6 × 7 + 28 = ?",o:["70","65","69","72"],a:0},
  {d:"mat",z:3,q:"4 × 4 + 28 = ?",o:["54","44","49","46"],a:1},
  {d:"mat",z:1,q:"9 × 6 = ?",o:["44","64","54","45"],a:2},
  {d:"mat",z:2,q:"69 + 32 − 24 = ?",o:["87","77","75","78"],a:1},
  {d:"mat",z:1,q:"56 − 55 = ?",o:["2","6","11","1"],a:3},
  {d:"mat",z:3,q:"5 × 7 + 13 = ?",o:["58","48","47","43"],a:1},
  {d:"mat",z:3,q:"6 × 6 + 16 = ?",o:["47","52","53","42"],a:1},
  {d:"mat",z:3,q:"6 × 7 + 39 = ?",o:["81","71","76","83"],a:0},
  {d:"mat",z:3,q:"3 × 4 + 35 = ?",o:["47","45","49","46"],a:0},
  {d:"mat",z:2,q:"11 × 11 = ?",o:["131","120","132","121"],a:3},
  {d:"mat",z:3,q:"9 × 9 + 15 = ?",o:["94","96","95","106"],a:1},
  {d:"tr",z:1,q:"'ev' kelimesinin eş anlamlısı?",o:["yol","ağaç","bulut","konut"],a:3},
  {d:"tr",z:3,q:"Hangisi doğru yazılmıştır?",o:["kravat","karavat","krevat","kıravat"],a:0},
  {d:"tr",z:2,q:"'almak' kelimesinin zıt anlamlısı?",o:["vermek","tutmak","getirmek","taşımak"],a:0},
  {d:"tr",z:1,q:"'vatan' kelimesinin eş anlamlısı?",o:["şehir","köy","yurt","ülke"],a:2},
  {d:"tr",z:1,q:"'ihtiyar' kelimesinin eş anlamlısı?",o:["bebek","yaşlı","çocuk","genç"],a:1},
  {d:"tr",z:1,q:"'hekim' kelimesinin eş anlamlısı?",o:["hasta","doktor","hemşire","ilaç"],a:1},
  {d:"tr",z:1,q:"'anı' kelimesinin eş anlamlısı?",o:["hayal","hatıra","rüya","plan"],a:1},
  {d:"tr",z:1,q:"'ödül' kelimesinin eş anlamlısı?",o:["görev","ceza","borç","mükafat"],a:3},
  {d:"tr",z:2,q:"'acemi' kelimesinin zıt anlamlısı?",o:["çırak","yeni","usta","öğrenci"],a:2},
  {d:"tr",z:1,q:"'kelime' kelimesinin eş anlamlısı?",o:["harf","hece","sözcük","cümle"],a:2},
  {d:"tr",z:3,q:"Hangisi doğru yazılmıştır?",o:["dersane","dershane","dershene","desane"],a:1},
  {d:"tr",z:2,q:"'ucuz' kelimesinin zıt anlamlısı?",o:["bedava","indirimli","pahalı","değerli"],a:2},
  {d:"tr",z:2,q:"'açık' kelimesinin zıt anlamlısı?",o:["boş","temiz","kapalı","geniş"],a:2},
  {d:"tr",z:2,q:"'kolay' kelimesinin zıt anlamlısı?",o:["rahat","basit","hafif","zor"],a:3},
  {d:"tr",z:2,q:"'cömert' kelimesinin zıt anlamlısı?",o:["cimri","zengin","iyi","nazik"],a:0},
  {d:"tr",z:1,q:"'özgürlük' kelimesinin eş anlamlısı?",o:["yasa","esaret","kural","hürriyet"],a:3},
  {d:"tr",z:2,q:"'ağlamak' kelimesinin zıt anlamlısı?",o:["üzülmek","gülmek","bakmak","susmak"],a:1},
  {d:"tr",z:1,q:"'ezgi' kelimesinin eş anlamlısı?",o:["ses","melodi","gürültü","söz"],a:1},
  {d:"tr",z:3,q:"Hangisi doğru yazılmıştır?",o:["yanliş","yannış","yalnış","yanlış"],a:3},
  {d:"tr",z:1,q:"'yetenek' kelimesinin eş anlamlısı?",o:["şans","tembellik","güç","kabiliyet"],a:3},
  {d:"tr",z:2,q:"'eski' kelimesinin zıt anlamlısı?",o:["kullanılmış","yeni","antika","tarihi"],a:1},
  {d:"tr",z:1,q:"'okul' kelimesinin eş anlamlısı?",o:["deniz","bahçe","mektep","kalem"],a:2},
  {d:"tr",z:3,q:"Hangisi doğru yazılmıştır?",o:["kitabcı","kitabçı","kitapçı","kitapcı"],a:2},
  {d:"tr",z:1,q:"'armağan' kelimesinin eş anlamlısı?",o:["kupa","hediye","para","ödül"],a:1},
  {d:"tr",z:2,q:"'gece' kelimesinin zıt anlamlısı?",o:["gündüz","akşam","öğle","sabah"],a:0},
  {d:"tr",z:3,q:"Hangisi doğru yazılmıştır?",o:["şofor","şöför","şoför","şöfor"],a:2},
  {d:"tr",z:1,q:"'değer' kelimesinin eş anlamlısı?",o:["fiyat","ücret","kıymet","para"],a:2},
  {d:"tr",z:2,q:"'uzun' kelimesinin zıt anlamlısı?",o:["geniş","kısa","dar","ince"],a:1},
  {d:"tr",z:2,q:"'soru' kelimesinin zıt anlamlısı?",o:["test","ödev","cevap","sınav"],a:2},
  {d:"tr",z:3,q:"Hangisi doğru yazılmıştır?",o:["müşde","müjjde","müjde","mücde"],a:2},
  {d:"fen",z:1,q:"Cisimleri yere çeken kuvvet nedir?",o:["Işık","Yer çekimi","Rüzgar","Ses"],a:1},
  {d:"fen",z:3,q:"Ses neyin içinde yayılmaz?",o:["Suda","Boşlukta","Demirde","Havada"],a:1},
  {d:"fen",z:2,q:"Dünya kendi etrafında bir turunu kaç saatte tamamlar?",o:["365 saat","12 saat","24 saat","1 saat"],a:2},
  {d:"fen",z:3,q:"Hangisi saf maddedir?",o:["Hava","Altın","Tuzlu su","Çay"],a:1},
  {d:"fen",z:2,q:"Sürtünme kuvveti hareketi nasıl etkiler?",o:["Durdurmaz","Hızlandırır","Etkilemez","Yavaşlatır"],a:3},
  {d:"fen",z:1,q:"Bitkiler hangi gazı üretir?",o:["Oksijen","Helyum","Azot","Karbondioksit"],a:0},
  {d:"fen",z:3,q:"Besin zincirinde üreticiler kimlerdir?",o:["Bitkiler","Kartallar","Aslanlar","Mantarlar"],a:0},
  {d:"fen",z:1,q:"Geceleri gökyüzünde parlayan nedir?",o:["Yağmur","Güneş","Yıldızlar","Bulutlar"],a:2},
  {d:"fen",z:1,q:"Hangisi sıvıdır?",o:["Taş","Süt","Tahta","Demir"],a:1},
  {d:"fen",z:3,q:"Bitkilerde fotosentez nerede gerçekleşir?",o:["Kök","Tohum","Mitokondri","Kloroplast"],a:3},
  {d:"fen",z:1,q:"Bir günde kaç saat vardır?",o:["12","60","24","365"],a:2},
  {d:"fen",z:1,q:"İtme ve çekme nedir?",o:["Ses","Koku","Renk","Kuvvet"],a:3},
  {d:"fen",z:3,q:"Hücrenin enerji üreten yapısı hangisidir?",o:["Hücre zarı","Çekirdek","Ribozom","Mitokondri"],a:3},
  {d:"fen",z:1,q:"İnsan hangi organla nefes alır?",o:["Mide","Kalp","Akciğer","Böbrek"],a:2},
  {d:"fen",z:1,q:"Hangisi canlıdır?",o:["Ağaç","Taş","Su","Bulut"],a:0},
  {d:"fen",z:2,q:"Besin zincirinde otçullar neyle beslenir?",o:["Taşla","Etle","Suyla","Bitkilerle"],a:3},
  {d:"fen",z:3,q:"Işık hangi ortamda en hızlı yayılır?",o:["Havada","Boşlukta","Camda","Suda"],a:1},
  {d:"fen",z:1,q:"Şeker suda ne olur?",o:["Donar","Patlar","Çözünür","Yanar"],a:2},
  {d:"fen",z:3,q:"Bir maddenin kütlesi her yerde ne olur?",o:["İkiye katlanır","Sıfırlanır","Değişir","Aynı kalır"],a:3},
  {d:"fen",z:1,q:"Hangisi katı maddedir?",o:["Süt","Buz","Su","Hava"],a:1},
  {d:"fen",z:3,q:"Hangisi Güneş'e en yakın gezegendir?",o:["Mars","Dünya","Merkür","Venüs"],a:2},
  {d:"fen",z:3,q:"Mevsimler neden oluşur?",o:["Ay","Eksen eğikliği","Rüzgar","Güneşe uzaklık"],a:1},
  {d:"fen",z:1,q:"Dünya'nın uydusu hangisidir?",o:["Venüs","Ay","Mars","Güneş"],a:1},
  {d:"fen",z:1,q:"Hangisi gaz halindedir?",o:["Buz","Demir","Tahta","Hava"],a:3},
  {d:"fen",z:2,q:"Hangisi gezegendir?",o:["Jüpiter","Ay","Yıldız","Güneş"],a:0},
  {d:"fen",z:2,q:"Maddenin ısı alınca hacmi ne olur?",o:["Küçülür","Kaybolur","Değişmez","Genişler"],a:3},
  {d:"fen",z:2,q:"Sıvı halden gaz haline geçişe ne denir?",o:["Erime","Donma","Buharlaşma","Yoğuşma"],a:2},
  {d:"fen",z:2,q:"Suyun donma sıcaklığı kaç derecedir?",o:["-100°C","0°C","100°C","10°C"],a:1},
  {d:"fen",z:3,q:"Hangisi karışımdır?",o:["Saf su","Altın","Tuzlu su","Oksijen"],a:2},
  {d:"fen",z:2,q:"Hangisi soğukkanlı hayvandır?",o:["Köpek","Kertenkele","İnek","Kedi"],a:1},
];
/* İngilizce dersi: prosedürel üretim (EN→TR / TR→EN, 4 şık) */
const EN_WORDS = [
  ['apple','elma'],['dog','köpek'],['cat','kedi'],['bird','kuş'],['fish','balık'],['book','kitap'],
  ['water','su'],['bread','ekmek'],['milk','süt'],['house','ev'],['school','okul'],['teacher','öğretmen'],
  ['table','masa'],['chair','sandalye'],['door','kapı'],['window','pencere'],['sun','güneş'],['moon','ay'],
  ['star','yıldız'],['tree','ağaç'],['flower','çiçek'],['car','araba'],['train','tren'],['plane','uçak'],
  ['red','kırmızı'],['blue','mavi'],['green','yeşil'],['yellow','sarı'],['big','büyük'],['small','küçük'],
  ['happy','mutlu'],['sad','üzgün'],['fast','hızlı'],['slow','yavaş'],['hot','sıcak'],['cold','soğuk'],
];
const { pick, shuffle } = EduKit;   // paylaşılan yardımcılar (games/_shared/edu-kit.js)
function enQuestion(){
  const [en, tr] = pick(EN_WORDS);
  const toEn = Math.random() < 0.5;
  const correct = toEn ? en : tr;
  const set = new Set([correct]);
  while (set.size < 4){ const w = pick(EN_WORDS); set.add(toEn ? w[0] : w[1]); }
  const o = shuffle([...set]);
  return { d: 'en', q: toEn ? `'${tr}' İngilizcede nedir?` : `'${en}' Türkçede nedir?`, o, a: o.indexOf(correct) };
}
const asked = new Set();
function nextQuestion(ders){
  const d = ders === 'mix' ? pick(['mat', 'tr', 'fen', 'en']) : ders;
  if (d === 'en') return enQuestion();
  let pool = BANK.filter(x => x.d === d && !asked.has(x.q));
  if (!pool.length){ BANK.forEach(x => { if (x.d === d) asked.delete(x.q); }); pool = BANK.filter(x => x.d === d); }
  const q = pick(pool);
  asked.add(q.q);
  return { ...q, o: q.o.slice() };
}

/* ================= Audio ================= */
const Audio2 = (() => {
  const { init, tone } = EduKit.audio;   // tek AudioContext + ilk jestte resume (games/_shared/edu-kit.js)
  return {
    init,
    ok:   () => { tone(660, 0.1, 'triangle', 0.07); tone(880, 0.14, 'triangle', 0.07, 0.1); },
    bad:  () => tone(160, 0.28, 'sawtooth', 0.05),
    done: () => [523, 659, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.07, i * 0.11)),
    char: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, i * 0.12)),
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
      q.push(rec);
      while (q.length > 50) q.shift();
      await window.storage.set(this.QUEUE_KEY, JSON.stringify(q));
    } catch (e) {}
  },
};

/* ================= KALICI DURUM ================= */
const SAVE_KEY = 'bilgitakimi_save';
const STATS_KEY = 'bilgitakimi_stats';
let S = {
  energy: CONFIG.DAILY_ENERGY, energyDay: '',
  xp: 0, score: 0,
  chars: ['asli'],                  // başlangıç üyesi
  questsDone: 0,
  daily: [], dailyDay: '',
  seasonKey: '', seasonDone: [],
};
let STATS = { quests: 0, correct: 0, wrong: 0, seasonsCompleted: 0 };
const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const monthKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1); };
function persist(){ try { window.storage.set(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function saveStats(){ try { window.storage.set(STATS_KEY, JSON.stringify(STATS)); } catch (e) {} }
function level(){ return 1 + Math.floor(S.xp / CONFIG.XP_PER_LEVEL); }

/* ================= GÖREV ÜRETİMİ ================= */
function genDaily(){
  const tipler = ['fast', 'fast', 'normal', 'normal', 'normal', 'epic'];
  const dersler = shuffle(['mat', 'tr', 'fen', 'en', 'mix', pick(['mat', 'tr', 'fen', 'en'])]);
  S.daily = tipler.map((t, i) => ({
    tip: t, ders: dersler[i],
    ad: pick(QUEST_NAMES[dersler[i]]),
    done: false,
  }));
  S.dailyDay = dayKey();
}
function seasonQuest(i){
  const tip = i % 10 === 9 ? 'epic' : (i % 3 === 2 ? 'normal' : 'fast');
  const ders = ['mat', 'tr', 'fen', 'en', 'mix'][i % 5];
  return { tip, ders, ad: `${i + 1}. ${pick(QUEST_NAMES[ders])}` };
}
function rollDays(){
  const t = dayKey();
  if (S.energyDay !== t){ S.energyDay = t; S.energy = CONFIG.DAILY_ENERGY; }
  if (S.dailyDay !== t) genDaily();
  const m = monthKey();
  if (S.seasonKey !== m){ S.seasonKey = m; S.seasonDone = []; }
}

/* ================= KARAKTER BONUSU (max +%25, sadece çarpan) ================= */
function bonusFor(ders){
  let best = 0;
  for (const id of S.chars){
    const c = CHARS.find(x => x.id === id);
    if (!c) continue;
    if (c.ders === ders || c.ders === 'mix' || ders === 'mix') best = Math.max(best, c.b);
  }
  return Math.min(25, best);
}

/* ================= UI ================= */
const $ = id => document.getElementById(id);
function refreshHUD(){
  $('energyChip').textContent = `⚡ ${S.energy}/${CONFIG.DAILY_ENERGY}`;
  $('energyChip').classList.toggle('low', S.energy <= 3);
  $('lvlChip').textContent = `🎖️ Sv ${level()}`;
  $('scoreChip').textContent = `⭐ ${S.score}`;
  $('teamChip').textContent = `👥 ${S.chars.length}/${CHARS.length}`;
  $('xpBar').style.width = (S.xp % CONFIG.XP_PER_LEVEL) + '%';
}
let activeTab = 'daily';
function questCard(q, idx, season){
  const T = CONFIG.QUEST_TYPES[q.tip];
  const [dIc, dAd] = DERS[q.ders];
  const bonus = bonusFor(q.ders);
  const done = season ? S.seasonDone.includes(idx) : q.done;
  const noEnergy = S.energy < T.enerji;
  return `<div class="qCard${done ? ' done' : ''}">
    <div class="qIc">${T.ic}</div>
    <div class="qBody">
      <div class="qTitle">${q.ad}</div>
      <div class="qSub">${dIc} ${dAd} · ${T.soru} soru · ⚡${T.enerji}${bonus ? ` · 👥 +%${bonus} puan` : ''}</div>
    </div>
    <button class="qBtn" data-idx="${idx}" data-season="${season ? 1 : 0}" ${done || noEnergy ? 'disabled' : ''}>
      ${done ? '✓ Bitti' : noEnergy ? '⚡ Yetersiz' : 'BAŞLA'}
    </button>
  </div>`;
}
function render(){
  rollDays(); refreshHUD();
  const c = $('content');
  if (activeTab === 'daily'){
    const kalan = S.daily.filter(q => !q.done).length;
    c.innerHTML = `<div class="secHead"><span>📋 Bugünün Görevleri</span><span>${6 - kalan}/6</span></div>` +
      S.daily.map((q, i) => questCard(q, i, false)).join('') +
      `<div class="qSub" style="text-align:center;margin-top:8px">Enerji her gün ${CONFIG.DAILY_ENERGY}'ye yenilenir · Her ${CONFIG.CHAR_EVERY} görevde yeni takım üyesi! 🎁</div>`;
  } else if (activeTab === 'season'){
    c.innerHTML = `<div class="secHead"><span>📖 ${new Date().toLocaleDateString('tr-TR', { month: 'long' })} Görev Kitabı</span><span>${S.seasonDone.length}/${CONFIG.SEASON_QUESTS}</span></div>` +
      Array.from({ length: CONFIG.SEASON_QUESTS }, (_, i) => questCard(seasonQuest(i), i, true)).join('') +
      `<div class="qSub" style="text-align:center;margin-top:8px">Kitabı bitirene "Sezon Kahramanı" rozeti! 🏅</div>`;
  } else {
    c.innerHTML = `<div class="secHead"><span>👥 Takımım</span><span>${S.chars.length}/${CHARS.length}</span></div><div id="teamGrid">` +
      CHARS.map(ch => {
        const owned = S.chars.includes(ch.id);
        return `<div class="charCard${owned ? '' : ' locked'}${ch.b >= 25 ? ' leg' : ''}">
          <div class="charEmoji">${owned ? ch.e : '❓'}</div>
          <div class="charName">${owned ? ch.ad : '???'}</div>
          <div class="charBonus">+%${ch.b} puan</div>
          <div class="charDers">${DERS[ch.ders][0]} ${DERS[ch.ders][1]}</div>
        </div>`;
      }).join('') + '</div>' +
      `<div class="qSub" style="text-align:center;margin-top:10px">Üyeler pasif bonus verir — asla cevabı söylemez! Görev yaptıkça yenileri katılır.</div>`;
  }
  c.querySelectorAll('.qBtn').forEach(b => b.addEventListener('click', () => {
    startQuest(parseInt(b.dataset.idx, 10), b.dataset.season === '1');
  }));
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
  t.classList.add('on');
  activeTab = t.dataset.tab;
  render();
}));

/* ================= GÖREV AKIŞI ================= */
let Q = null, fuseT = null;
function startQuest(idx, season){
  Audio2.init();
  const meta = season ? seasonQuest(idx) : S.daily[idx];
  const T = CONFIG.QUEST_TYPES[meta.tip];
  if (S.energy < T.enerji) return;
  S.energy -= T.enerji;
  Q = { idx, season, meta, T, i: 0, correct: 0 };
  persist(); refreshHUD();
  $('qzTitle').textContent = `${T.ic} ${meta.ad}`;
  $('quizVeil').classList.add('show');
  showQuestion();
}
function showQuestion(){
  const q = nextQuestion(Q.meta.ders);
  Q.cur = q;
  $('qzInfo').textContent = `Soru ${Q.i + 1}/${Q.T.soru} · Doğru: ${Q.correct}`;
  $('qzText').textContent = q.q;
  const box = $('qzOpts'); box.innerHTML = '';
  q.o.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt'; b.textContent = o;
    b.addEventListener('click', () => answer(i));
    box.appendChild(b);
  });
  startFuse();
}
function startFuse(){
  clearInterval(fuseT);
  let t0 = Date.now(), last = t0;
  $('qzFuse').style.width = '100%';
  fuseT = setInterval(() => {
    const now = Date.now();
    if (document.hidden){ last = now; return; }   // sekme gizliyken süre akmaz (teneffüs güvencesi)
    if (now - last > 400) t0 += now - last;        // gizli geçen süre t0'a eklenir; eskiden dönüşte anında yanlış sayılıyordu
    last = now;
    const left = 1 - (now - t0) / (CONFIG.Q_TIME * 1000);
    $('qzFuse').style.width = Math.max(0, left * 100) + '%';
    if (left <= 0) answer(-1);
  }, 100);
}
function answer(i){
  clearInterval(fuseT);
  const q = Q.cur;
  const right = i === q.a;
  if (right){ Q.correct++; Audio2.ok(); } else Audio2.bad();
  const btns = $('qzOpts').children;
  [...btns].forEach((b, j) => {
    b.disabled = true;
    if (j === q.a) b.classList.add('right');
    else if (j === i) b.classList.add('wrong');
  });
  Q.i++;
  setTimeout(() => { Q.i >= Q.T.soru ? finishQuest() : showQuestion(); }, 850);
}
function finishQuest(){
  $('quizVeil').classList.remove('show');
  const bonus = bonusFor(Q.meta.ders);
  const raw = Q.correct * CONFIG.POINT_PER_CORRECT + (Q.correct === Q.T.soru ? Q.T.bonus : Math.round(Q.T.bonus * Q.correct / Q.T.soru));
  const pts = Math.round(raw * (1 + bonus / 100));
  S.score += pts; S.xp += Q.T.xp;
  S.questsDone++;
  STATS.quests++; STATS.correct += Q.correct; STATS.wrong += (Q.T.soru - Q.correct);
  if (Q.season){ if (!S.seasonDone.includes(Q.idx)) S.seasonDone.push(Q.idx); }
  else S.daily[Q.idx].done = true;
  let seasonMsg = '';
  if (Q.season && S.seasonDone.length === CONFIG.SEASON_QUESTS){
    STATS.seasonsCompleted++;
    seasonMsg = '<br>🏅 <b>SEZON KİTABI TAMAMLANDI!</b>';
    Audio2.char();
  }
  persist(); saveStats();
  BilnetBridge.submitScore({
    gameId: 'bilgi-takimi', score: pts, tier: Q.tip === 'epic' ? 3 : Q.tip === 'normal' ? 2 : 1,
    stats: { correct: Q.correct, wrong: Q.T.soru - Q.correct, quest: Q.meta.ad },
  });
  $('resEmoji').textContent = Q.correct === Q.T.soru ? '🌟' : Q.correct > 0 ? '🎉' : '💪';
  $('resTitle').textContent = Q.correct === Q.T.soru ? 'Mükemmel Görev!' : 'Görev Tamam!';
  $('resDetail').innerHTML =
    `✅ ${Q.correct}/${Q.T.soru} doğru &nbsp;·&nbsp; ⭐ +${pts} puan${bonus ? ` <small>(takım +%${bonus})</small>` : ''} &nbsp;·&nbsp; 💜 +${Q.T.xp} XP` +
    seasonMsg +
    `<br><small>Bugün ${Q.correct} yeni şey öğrendin! 🎓</small>`;
  $('resultVeil').classList.add('show');
  Audio2.done();
}
$('resOk').addEventListener('click', () => {
  $('resultVeil').classList.remove('show');
  // her 5 görevde yeni karakter (§4.6)
  if (S.questsDone > 0 && S.questsDone % CONFIG.CHAR_EVERY === 0){
    const locked = CHARS.filter(c => !S.chars.includes(c.id));
    if (locked.length){
      const c = pick(locked);
      S.chars.push(c.id);
      persist();
      $('rwChar').textContent = c.e;
      $('rwName').textContent = c.ad;
      $('rwBonus').textContent = `${DERS[c.ders][0]} ${DERS[c.ders][1]} görevlerinde +%${c.b} puan`;
      $('charVeil').classList.add('show');
      Audio2.char();
      return;
    }
  }
  render();
});
$('charOk').addEventListener('click', () => { $('charVeil').classList.remove('show'); render(); });

/* ================= BAŞLAT ================= */
window.storage.get(SAVE_KEY).then(r => {
  if (r && r.value){ try { S = Object.assign(S, JSON.parse(r.value)); } catch (e) {} }
  return window.storage.get(STATS_KEY);
}).then(r => {
  if (r && r.value){ try { STATS = Object.assign(STATS, JSON.parse(r.value)); } catch (e) {} }
  rollDays(); persist(); render();
});
EduKit.onHidden(() => { persist(); saveStats(); });   // gizlenince ve pagehide'da kaydet
