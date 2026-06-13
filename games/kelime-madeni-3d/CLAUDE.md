# KELİME MADENİ 3D — Proje Belgesi (CLAUDE.md)

> Eğitsel Minecraft benzeri 3D voxel oyunu — İngilizce kelime öğretimi entegre.
> Tek dosyalık HTML5 (portalda `games/kelime-madeni-3d/index.html`, ~1500 satır),
> Three.js r128 (yerel `three.min.js`).
> Hedef kitle: 8–12 yaş. Geliştirici: Emre (Bilnet) + Claude. Güncel sürüm: **2.2**

### v2.2 — İnşa Parçaları (ev kurma) — 2026-06-13
- **Yeni bloklar (ID 16-35):** Kum(16, opak), Cam(17), Kapı(18-25: eksen×alt/üst×açık/kapalı
  ayrı ID'ler), Tahta Çatı(26-29) + Kiremit Çatı(30-33) merdivenleri (4 yön), Yarım Tahta/Taş(34-35).
- **OPAQUE / SOLID ayrımı:** OPAQUE (ışık+yüz ayıklama) ↔ SOLID (çarpışma) ayrıldı.
  17+ şeffaf sayılır (çatıdan ışık sızar → ev içi aydınlık, bilinçli). Açık kapı geçilir;
  çatı/yarım blok `collides()` içinde **yarım yükseklik** çarpışır (`py < y+0.5`, kesin <).
- **Oto-basamak:** 0.5'lik engele yürüyünce tüm platformlarda kendiliğinden çıkılır
  (yükseltilmiş AABB testi; dokunmatik tam-blok oto-zıplamasından ÖNCE denenir).
- **Atlas 4×4 → 8×8** (`AT=8`): yeni karolar 16 kum, 17 cam (orta şeffaf — materyale
  `alphaTest:0.5` eklendi, `transparent:true` YOK), 18-19 kapı üst/alt, 20 kiremit.
- **Kapı mekaniği:** 2 hücre yerleşir (tavan/destek/oyuncu-çakışma kontrolleri), sağ tık /
  kısa dokunuş aç-kapa; oyuncu eşikteyken KAPANMAZ (fırlatma koruması); kazınca iki hücre
  temizlenir, eşya 1 düşer. `raycast` origin'i açık kapıysa atlar (eşikten nişan).
- **Kum kaynağı:** yüzeyde sin-gürültü kumsalları + hash3 yeraltı cepleri.
  **Eski kayıt telafisi:** yüklemede dünyada hiç kum yoksa yeraltı cepleri eklenir
  (yalnız STONE dönüşür — oyuncu yapısına dokunmaz). Kayıt sürümü v:1 KALDI (bilinçli:
  v:2 bayat istemcide kaydı reddettirip 20 sn'de üzerine yazdırırdı).
- **Tarifler (+6):** kapı 4🟧; cam 2🟨+1⚫ fırın→2; tahta çatı 3🟧→4; kiremit 3🪨+1⚫ fırın→4;
  yarım bloklar. **Görevler 10→13** (sona eklendi — eski questDone indeksleri korunur).
- **Hotbar 7→14 slot:** 2 satır × 7 grid (kaydırma yok), `Digit1-9` + fare tekerleği döngüsü
  (panel açıkken no-op). 360px ekranda taşmadan sığar (doğrulandı).
- **Test:** `test_sim.js` Node duman harness'i artık REPODA (58 iddia: dünya/çarpışma/kapı/
  oto-basamak/tarif/görev/kayıt/retrofit). Çalıştır: `node games/kelime-madeni-3d/test_sim.js`.
- Savunma: `binfo(t)` bilinmeyen ID'de taş-benzeri yedek döner (geçerli tex DAHİL —
  alphaTest + çizilmemiş karo = görünmez blok tuzağı). iframe cache-bust `?v=2`.

---

## 1. OYUN KONSEPTİ

Oyuncu blok dünyasında kaynak toplar, alet üretir ve derine iner. **Tüm cevherler
(kömür, demir, elmas, kristal) kazıldığında İngilizce soru sorar** — doğru cevap
cevheri kazandırır, yanlış cevapta cevher kaybolur ve kelime havuza geri döner.
İngilizce bilmeden ilerlemek imkânsızdır (meşale için kömür, kazma için demir vb.).

### İlerleme zinciri (Minecraft mantığı)
```
El → ağaç kes → Tahta Kazma → taş kaz → Fırın (8 parke taş)
   → demir cevheri + kömür → Demir Külçe (fırında) → Demir Kazma
   → elmas (y<8) → Elmas Kazma
   → Kristal Parçası (soru ödülü) → KRİSTAL KAZMA (final alet)
```

### Eğitsel döngü
- 90 kelimelik TR↔EN banka (`WORDS` dizisi), 4 şıklı sorular, %60 TR→EN / %40 EN→TR
- Doğru: cevher + XP + seri bonusu; seri 3'ün katlarında ekstra ödül
- Yanlış: cevher yok, seri sıfırlanır, kelime havuzun başına geri döner (tekrar sorulur)
- "📖 Öğrendiğim Kelimeler" defteri doğru cevaplanan kelimeleri listeler
- Cevher ödül/XP tablosu: Kömür +1⚫/6⭐, Demir +1🟠/9⭐, Elmas +1💎/14⭐, Kristal 1-3🔮/15⭐

---

## 2. UYGULANAN SİSTEMLER (sürüm geçmişi)

### v1.x — 2D prototipler (terk edildi)
- `kelime-madeni.html`: 2D Terraria tarzı, kelime kristali quizi
- `kelime-madeni-2.html`: üretim zinciri, fırın, ışık sistemi, 10 görev
- Karar: 3D'ye geçildi. (Not: 2D dosyalardaki hash fonksiyonunda kristal
  oluşumunu engelleyen bit hatası var — 3D'de düzeltildi, 2D'lerde duruyor.)

### v2.x — 3D voxel (güncel)
| Sistem | Detay |
|---|---|
| Dünya | 64×40×64 voxel, prosedürel yükseklik haritası, solucan algoritmalı mağaralar, ağaçlar, derinliğe göre cevher (kömür y<h-3, demir y<15, elmas y<8, kristal 2 kanal) |
| Render | Chunk tabanlı mesh (8×40×8, 64 chunk), yalnızca görünen yüzeyler, canvas'ta üretilen 16'lık piksel doku atlası, MeshBasicMaterial + vertex color (ışık dokuya çarpılır) |
| Işık | Minecraft usulü taşma dolgusu (flood-fill BFS): gök ışığı 15, meşale 12, fener 14, kristal 9, fırın 8. Blok değişiminde ±15 kutu yerel relight + değişen bbox'a göre chunk yeniden inşası (kuyrukla karelere bölünür, kare başına 3 chunk) |
| Fizik | AABB oyuncu (0.6×1.8), eksen bazlı çarpışma, yerçekimi, zıplama, sıkışma koruması (blok içinde kalırsa yukarı iter), dokunmatikte otomatik zıplama (1 bloklu basamak) |
| Kazma | DDA voxel ışın izleme (REACH masaüstü 5 / dokunmatik 5.5), blok HP + kazma gücü, alet kademesi kilidi (taş≥tahta kazma, demir≥taş, elmas≥demir), kırılma ilerleme çubuğu, hedef vurgu kutusu |
| Üretim | 11 tarif (tahta, çubuk, meşale, fırın, külçe-eritme [fırın şart], fener, 5 kazma). Kazmalar üretilince otomatik kuşanılır |
| Görevler | 10 adımlık rehber zincir, alt-orta şeritte aktif görev + ilerleme, tamamlanınca +20⭐ |
| XP/Seviye | Soru ve üretimden XP; seviye başına +%4 kazma hızı |
| Kamera | C / 📷 ile 1. ↔ 3. şahıs. 3. şahıs: 4.2 blok geriden, duvar çarpışma kontrolü (geri ışın), blok karakter modeli (ışığa göre kararır/aydınlanır) |
| Dokunmatik | MC PE tarzı: sol bölgeye dokun-sürükle = dinamik joystick (görünmez, parmak altında belirir), basılı tut = kaz (parmak takipli), kısa dokun = blok koy, sürükle = bak, tek buton: ⤒ zıpla. touch-action:none + setPointerCapture + pointercancel yönetimi, jest/kaydırma engelleme |
| HUD | Tek durum şeridi (⛏️⭐🔥📚) + 4 ikon buton (📷🎯📖🛠️), 760px altı medya sorgusuyla küçülen eşya çubuğu |
| Ses | Web Audio sentez bip'leri (kaz, kır, doğru/yanlış, seviye, elmas fanfarı) |

### Çözülen kritik hatalar (tekrarlamasın)
1. **hash3 bit hatası**: `(h^(h>>16))` işaretli kaydırma üst biti hep sıfırlıyordu →
   `Math.imul` + `>>>` ile düzeltildi. Eşik tabanlı oluşum (cevher) bu yüzden hiç çalışmıyordu.
2. **Spawn sıralaması**: oyuncu konumu `genWorld()` çağrılmadan HMAP'ten okunuyordu →
   `placeSpawn()` (spiral arama, ağaç üstünü atlar) init içinde dünyadan sonra çağrılır.
3. **Ağaç tacı kafa hizasında**: gövde 3 → 4-5 blok yapıldı, altından yürünebilir.
4. **Dokunmatik pointercancel**: `touch-action:none` eksikti, tarayıcı jesti devralıp
   joystick'i öldürüyordu ("1-2 sn sonra takılma" raporunun nedeni).

### Bilinen küçük pürüzler
- Eğimli arazide nadiren tek yaprak kafa hizasına gelebilir (tek vuruşta kırılır).
- İlerleme kaydedilmiyor (bilinçli: aşağıya bak).
- Three.js CDN'den geldiği için ilk açılışta internet gerekir.

---

## 3. DOSYA / KOD HARİTASI

Tek dosya: `kelime-madeni-3d-v2.html`. Script bölümleri (yorum başlıklarıyla ayrılı):
```
KELİME BANKASI      → WORDS [tr,en] dizisi          ← kelime eklemek için tek yer
EŞYALAR/BLOKLAR     → ITEMS, B, BINFO (hp/drop/tier/tex), EMIT (ışık kaynakları)
KAZMALAR/TARİFLER   → PICKS, RECIPES, QUESTS
DÜNYA VERİSİ        → blocks/light Uint8Array, IX(), hash3(), genWorld(), placeSpawn()
IŞIK                → relightBox(bbox, seedBorder) — BFS, değişim bbox döndürür
DOKU ATLASI         → makeAtlas() canvas piksel dokular (4×4 grid, 32px)
MESH ÜRETİMİ        → FACES tablosu, buildChunk(), rebuildBox()+kuyruk, setBlock()
OYUNCU/KONTROL      → physics() (oto-zıplama dahil), collides(), klavye
IŞIN İZLEME         → raycast() DDA (t mesafesi döner), lookDir()
KAZMA/KOYMA         → getAim(), screenRay(), doMine(), tryPlace(sx?,sy?), QUIZ_ORE
QUIZ                → openQuiz(blokTipi, derinlikY) — META ödül tablosu
ÜRETİM/GÖREV/HUD    → craft(), renderCraft(), checkQuests(), updateHUD()
DOKUNMATİK          → dinamik joystick + jest makinesi (bak/kaz/koy ayrımı)
KAMERA              → camMode, updateCamera(), buildPlayerMesh()
DÖNGÜ               → loop(): physics → doMine → rebuildQueue(3) → updateCamera → render
```

Test altyapısı (önemli!): Oyun **Node'da DOM/THREE stub'larıyla baştan sona
çalıştırılabilir** durumda — sohbet geçmişindeki simülasyon harness'i spawn,
hareket, kazma, quiz akışını otomatik doğruladı. Yeni özelliklerde aynı yöntemle
regresyon testi yap.

---

## 4. YOL HARİTASI (yapılacaklar)

### Faz 1 — Temel eksikler
- [ ] **Kayıt sistemi**: localStorage (yerel dosya kullanımında çalışır; claude.ai
      artifact önizlemesinde ÇALIŞMAZ — bu yüzden eklenmedi). blocks+light Uint8Array
      → base64, state JSON. "Devam et / Yeni dünya" menüsü.
- [ ] **Kelime bankası dışarıdan**: `WORDS`'ü JSON'dan yükle. Mevcut 1.221 soruluk
      eğitsel JSON bankasıyla birleştir; sınıf seviyesi (5-8) ve ünite seçimi
      (açılış ekranında seçici). Zorluk → cevher eşlemesi (kolay=kömür, zor=elmas).
- [ ] **Ses açma/kapama** butonu + basit ayarlar paneli (hassasiyet, ses).

### Faz 2 — Oyun derinliği
- [ ] Gece/gündüz döngüsü (gök rengi + gök ışığı seviyesi animasyonu — relight maliyetine
      dikkat: tüm dünya relight yerine gökten gelen ışığı çarpan olarak uygula).
- [ ] Basit yaratıklar (gece zombisi / mağara örümceği) + kılıç tarifi + kalp sistemi.
- [x] ~~Daha fazla blok türü (cam: kum+fırın, merdiven)~~ → **v2.2'de geldi** (kapı/cam/çatı/yarım blok). Sandık hâlâ açık.
- [ ] Başarımlar (rozetler) + oyun sonu istatistik ekranı (öğrenilen kelime raporu).

### Faz 3 — Okul/ürünleştirme (eğitsel oyun fabrikası ile hizalı)
- [ ] Öğretmen paneli: sınıfa özel kelime listesi yükleme, öğrenci sonuç raporu
      (yanlış yapılan kelimeler CSV/Excel çıktısı).
- [ ] bilnetoyun.com portalına ekleme (SEO notu: oyuna özel URL, SPA tuzağına düşme).
- [ ] PWA manifesti + service worker (Three.js'i yerel gömerek tam çevrimdışı) →
      sonrasında Capacitor ile Android paketi.
- [ ] Diğer derslere reskin: Matematik Madeni (işlem soruları), Fen Madeni —
      soru motoru zaten blok tipinden bağımsız, sadece `openQuiz` içeriği değişir.

### Faz 4 — İleri seviye (opsiyonel)
- [ ] Daha büyük dünya: sonsuz chunk üretimi (şu an sabit 64×40×64).
- [ ] Basit çok oyunculu (Firebase RTDB — bilnetoyun altyapısı mevcut; gecikme
      sorunları için önceki Firebase latency analizine bak).

---

## 5. CLAUDE CODE İÇİN ÇALIŞMA NOTLARI
- Tek dosya disiplinini koru; 2.000 satırı aşarsa modüllere böl + build script
  (tek HTML'e gömen basit bir Node birleştirici) ekle.
- Her değişiklikten sonra: (1) `new Function(script)` sözdizimi testi,
  (2) stub harness ile spawn/hareket/quiz duman testi.
- Performans bütçesi: blok kırma karesi < 16ms (relight ~4ms ölçüldü; chunk
  inşası kuyrukta). Dünya boyutu büyütülürse relight kutusunu koru, küresel yapma.
- Türkçe UI metinleri, çocuk dostu ton. Kod yorumları Türkçe.
- Ortam: Windows + PowerShell. Test cihazları: okul PC'leri (zayıf GPU olabilir,
  pixelRatio 1.5 sınırı bilinçli) + Android tablet/telefon.
