# CLAUDE.md — BilnetOyun Eğitsel Oyun Dönüşüm Projesi

> **Proje sahibi:** Emre Günay (Bilnet) — Bilişim Teknolojileri Öğretmeni, Özel Balıkesir Bilnet Okulları
> **Hedef platform:** bilnetoyun.com
> **Hedef kitle:** 8–12 yaş (İlkokul 3 — Ortaokul 6. sınıf)
> **Bu dosyanın amacı:** Klasik Facebook oyunlarının eğitsel versiyonlarını tek dosya HTML5 formatında geliştirmek için Claude Code'a tam teslim dokümanı.

---

## 1. PROJE ÖZETİ

Facebook'un altın çağındaki (2009–2014) popüler oyunların mekanikleri eğitsel içerikle yeniden kurgulanacak ve bilnetoyun.com portalına eklenecek. Oyunların bağımlılık yaratan kısmı sosyal iletişim değil, **rekabet + ilerleme hissi**dir; bu proje yalnızca bu iki unsuru güvenli biçimde kullanır.

### 1.1 Kesin Kısıtlar (DEĞİŞTİRİLEMEZ)

| Kural | Açıklama |
|---|---|
| ❌ Sohbet YOK | Hiçbir oyunda mesajlaşma, yorum, serbest metin girişi olmayacak |
| ❌ Arkadaş ekleme YOK | Kullanıcılar arası ilişki tablosu kurulmayacak |
| ❌ Hediye/davet YOK | Kullanıcıdan kullanıcıya hiçbir aksiyon yok |
| ✅ Pasif rekabet VAR | Skor tabloları, sınıf ligi, rozetler (rumuz + avatar ile) |
| ✅ Gerçek isim YOK | Liderlik tablolarında yalnızca rumuz ve avatar görünür |
| ✅ KVKK uyumlu | Kişisel veri minimum: rumuz, sınıf kodu, skorlar |

### 1.2 Teknik Standartlar

- **Format:** Her oyun TEK DOSYA HTML5 (`oyun-adi.html`) — CSS ve JS gömülü, harici bağımlılık yok (Zindan Okçusu / NEON DRIFT / Altın Madencisi standardı)
- **Mobil öncelikli:** Dokunmatik kontroller birincil, klavye/fare ikincil. Min. 360px genişlik
- **Performans:** 60 FPS hedef, requestAnimationFrame, canvas tabanlı oyunlarda object pooling
- **Ses:** Web Audio API ile sentezlenmiş ses (NEON DRIFT yaklaşımı) — harici ses dosyası yok
- **Dil:** TR birincil, EN içerik kelime oyunlarında. UI metinleri `STRINGS` objesi içinde toplanır (ileride i18n için)
- **Backend:** Mevcut Firebase (Firestore). Latency hassas hiçbir mekanik gerçek zamanlı senkron gerektirmez — skor yazma fire-and-forget olduğu için mevcut latency sorunu bu projeyi etkilemez. Supabase geçişine hazır soyutlama (Bölüm 6.4)
- **Offline tolerans:** Oyun internetsiz oynanabilir; skor localStorage'a yazılır, bağlantı gelince senkronlanır

### 1.3 Zorluk Seviyeleri (Portal Standardı)

Tüm oyunlarda dağ tırmanışı metaforu kullanılır:

| Seviye | Ad | Hedef |
|---|---|---|
| 1 | 🏕️ **Etek** | 3. sınıf / başlangıç |
| 2 | ⛰️ **Yamaç** | 4. sınıf / orta |
| 3 | 🧗 **Tırmanış** | 5. sınıf / ileri |
| 4 | 🏔️ **Zirve** | 6. sınıf / uzman |

---

## 2. ORTAK SORU BANKASI ŞEMASI

Tüm oyunlar aynı JSON formatından beslenir. Mevcut 1.221 soruluk banka bu şemaya uyarlanır (Python generator'lar güncellenebilir).

```json
{
  "meta": {
    "version": "1.0",
    "subject": "math | vocab_tr | vocab_en | science",
    "generated": "2026-06-12"
  },
  "questions": [
    {
      "id": "math-add-0042",
      "subject": "math",
      "topic": "toplama",
      "tier": 1,
      "type": "multiple_choice | pair_match | true_false | numeric",
      "question": "7 + 5 = ?",
      "options": ["10", "11", "12", "13"],
      "answer": "12",
      "pairs": null,
      "image": null,
      "time_limit_sec": 15,
      "points": 10
    },
    {
      "id": "vocab-en-animal-0007",
      "subject": "vocab_en",
      "topic": "animals",
      "tier": 2,
      "type": "pair_match",
      "question": null,
      "options": null,
      "answer": null,
      "pairs": [["cat", "kedi"], ["dog", "köpek"], ["bird", "kuş"]],
      "image": null,
      "time_limit_sec": 30,
      "points": 15
    }
  ]
}
```

**Kurallar:**
- Oyunlar soru bankasını `fetch('sorular/{subject}-tier{n}.json')` ile yükler; dosya bulunamazsa gömülü `FALLBACK_QUESTIONS` dizisine düşer (oyun asla kırılmaz)
- `type` alanı oyunun mekaniğine göre filtrelenir (ör. Matematik Patlatma sadece `numeric` kullanır)
- Yanlış cevaplar asla utandırmaz: ceza = puan kaybı değil, fırsat kaybı (combo sıfırlanır, zaman akar)

---

## 3. META KATMAN — PORTAL GENELİ SİSTEMLER

Tüm oyunların üstünde çalışan ortak ilerleme sistemi. Bu, Facebook oyunlarındaki "geri gelme" döngüsünün güvenli karşılığıdır.

### 3.1 Jeton Sistemi (💎 Bilnet Jetonu)

- Her oyun sonunda skora orantılı jeton kazanılır: `jeton = floor(skor / 100)`
- Jeton harcama yerleri: avatar aksesuarları, oyun içi kozmetikler (YETENEK SATIN ALMA YOK — pay-to-win'in jeton versiyonu bile olmaz)
- Günlük jeton kazanma tavanı: 50 (ekran süresi dengesi, veli sunumunda güçlü argüman)

### 3.2 Günlük Giriş + Seri (Streak)

- Her gün ilk girişte +5 jeton
- Seri bonusu: 3 gün → +10, 5 gün → +15, 7 gün → +25 ve rozet
- Seri kırılırsa sıfırlanır ama suçlayıcı dil YOK ("Serin bitti!" değil → "Yeni seri başlat! 💪")

### 3.3 Rozet Sistemi

| Rozet | Koşul |
|---|---|
| 🥇 İlk Adım | İlk oyunu tamamla |
| 🔥 Seri Ustası | 7 günlük giriş serisi |
| 🧮 Matematik Kâşifi | Matematik oyunlarında 1000 toplam puan |
| 📚 Kelime Avcısı | 100 kelime eşleştir |
| 🔬 Genç Bilimci | Bilim Dedektifi'nde 10 vaka çöz |
| 🏔️ Zirve Fatihi | Herhangi bir oyunda Zirve seviyesini bitir |
| 🎯 Keskin Nişancı | Bir oturumda %100 doğruluk (min. 10 soru) |
| 🌟 Koleksiyoncu | 5 farklı oyunda skor kaydet |

### 3.4 Sınıf Ligi (Pasif Rekabet Çekirdeği)

- Her öğrenci kayıt olurken **sınıf kodu** girer (öğretmen dağıtır: `5A-2026` gibi)
- Bireysel skorlar sınıfın haftalık havuzuna eklenir
- Pazartesi 00:00'da lig sıfırlanır, önceki haftanın şampiyonu duyurulur
- Görünüm: "🏆 Bu hafta: 1. 6-B (12.450 p) · 2. 5-A (11.200 p) · 3. 6-A (9.800 p)"
- Bireysel tablo: sınıf içi ilk 10, yalnızca rumuz + avatar

### 3.5 Haftalık Turnuva

- Her hafta BİR oyun "haftanın turnuvası" olur (rotasyon)
- Turnuva oyununda kazanılan puanlar 2x sınıf ligi katkısı sağlar
- Bu mekanik, eski oyunların da unutulmamasını sağlar (içerik rotasyonu)

---

## 4. OYUNLAR — DETAYLI TASARIM

Toplam 21 oyun, iki dalga halinde:
- **Birinci dalga (4.1–4.8):** Facebook klasiklerinden dönüşümler
- **İkinci dalga (4.9–4.21):** Flash/mobil klasiklerinden dönüşümler

Geliştirme sırası önerisi: **4.1 → 4.2 → 4.3** (Faz 1) → **4.4 → 4.5** (Faz 2) → **4.6 → 4.7 → 4.8** (Faz 3) → İkinci dalga Bölüm 7'deki faz planına göre.

---

### 4.1 BİLGİ MADENCİSİ 💎⛏️
**İlham:** Gold Miner klasiği · **Temel:** Mevcut Altın Madencisi kodu (EN DÜŞÜK MALİYET)

**Eğitsel dönüşüm:**
- Ekranın üstünde bir soru görünür (ör. "8 × 7 = ?")
- Yeraltındaki nesneler cevap taşlarıdır: doğru cevap altın parlaklığında ama DİĞERLERİYLE AYNI görünümde (görsel ipucu yok, bilgi gerekir)
- Doğru taşı çek → puan + hızlı geri sarma. Yanlış taşı çek → taş ağırdır, yavaş gelir, puan yok, zaman kaybı
- Combo: art arda 3 doğru → kanca hızı +%20

**Mekanik parametreler:**
```
Tur süresi: 60 sn
Soru başına taş sayısı: 4 (1 doğru, 3 çeldirici)
Doğru çekme puanı: tier × 50
Combo çarpanı: x1 → x1.5 → x2 (max)
Dinamit (jetonla değil, 5 doğru cevapla kazanılır): yanlış taşı yok eder
```

**Soru tipi:** `numeric`, `multiple_choice` (cevaplar kısa olmalı, taşa sığacak)
**Ders:** Matematik (4 işlem, kesirler Tırmanış+)
**Geliştirme notu:** Altın Madencisi'nin kanca fiziği, sallanma açısı ve geri sarma kodu birebir korunur. Sadece nesne spawn mantığı soru bankasına bağlanır.

---

### 4.2 MATEMATİK PATLATMA 🧨🔢
**İlham:** Bejeweled Blitz / Diamond Dash

**Eğitsel dönüşüm:**
- 7×7 grid, taşların üzerinde sayılar (1–9)
- Hedef üstte yazar: "Toplamı **12** yapan komşu taşları seç"
- Oyuncu komşu taşları sürükleyerek zincir yapar; zincir toplamı hedefe ulaşınca taşlar patlar, üstten yenileri düşer
- 60 saniyelik skor yarışı — Diamond Dash'in "kısa ve tekrar oynatan" DNA'sı korunur

**Mekanik parametreler:**
```
Grid: 7×7 (mobilde 6×6)
Tur süresi: 60 sn
Zincir puanı: taş_sayısı² × 10 (uzun zincir teşviki)
Hedef sayı değişimi: her 3 patlatmada bir yenilenir
Etek: hedef 5-10, sadece toplama
Yamaç: hedef 10-20
Tırmanış: çıkarma karışır ("farkı 6 yapan iki taş")
Zirve: çarpım hedefleri ("çarpımı 24")
```

**Soru tipi:** Soru bankası gerekmez — sayılar prosedürel üretilir (her zaman en az 1 geçerli zincir garantilenir, çözümsüzlük kontrolü şart)
**Ders:** Matematik (işlem akıcılığı)
**Geliştirme notu:** Match-3 yerine "zincir seçme" mekaniği — parmak sürükleme için `touchmove` ile hücre kesişim testi. Patlama partikülleri için basit canvas particle pool.

---

### 4.3 KELİME BALONU 🎈🔤
**İlham:** Bubble Safari / Bubble Witch Saga

**Eğitsel dönüşüm:**
- Klasik bubble shooter: alttan balon fırlatılır, üstte balon kümesi
- Her balonun içinde bir HARF var. Ekranın üstünde hedef: bir resim + Türkçesi (EN modunda) ör. 🐱 "kedi"
- Oyuncu C-A-T harflerini sırayla vurmalı. Doğru harf → balon ve komşu aynı harfler patlar. Yanlış harf → balon kümeye yapışır (klasik ceza)
- Kelime tamamlanınca büyük patlama + yeni kelime

**Mekanik parametreler:**
```
Kelime tamamlama puanı: kelime_uzunluğu × 30 × tier
Sıra zorunluluğu: Etek'te yok (harfler herhangi sırada), Tırmanış+ sıralı
Etek: 3 harfli EN kelimeler (cat, dog, sun)
Yamaç: 4-5 harf
Tırmanış: 6+ harf, sıralı vurma
Zirve: resim yok, sadece TR karşılık verilir (çeviri bilgisi)
TR modu: eş anlamlı eşleştirme (resim → Türkçe kelimenin harfleri)
```

**Soru tipi:** `pair_match` (kelime–anlam çiftleri) — mevcut vocabulary bankası direkt kullanılır
**Ders:** İngilizce kelime, Türkçe sözcük bilgisi
**Geliştirme notu:** Hexagonal grid + balon yapışma fiziği bu oyunun tek zor kısmı. Açı hesaplı fırlatma + duvar sekmesi. Resimler emoji ile çözülür (harici asset yok).

---

### 4.4 BİLİM DEDEKTİFİ 🔍🔬
**İlham:** Criminal Case (gizli obje bulma)

**Eğitsel dönüşüm:**
- Her "vaka" bir bilim temalı sahne: SVG/emoji ile oluşturulmuş yoğun bir görsel (orman, laboratuvar, uzay, vücut sistemi)
- Görev listesi: "Bu sahnede 5 omurgalı bul", "3 ısı kaynağını işaretle", "Geri dönüştürülebilir 4 nesneyi bul"
- Süre + yanlış tıklama cezası (5 sn donma — Criminal Case'in klasik cezası)
- Vaka sonunda mini quiz: bulunan nesnelerle ilgili 3 soru → yıldız puanı (1–3 ⭐)

**Mekanik parametreler:**
```
Vaka süresi: 90 sn
Nesne bulma puanı: 100/nesne, kalan süre bonusu
Yanlış tıklama: -5 sn donma (puan kaybı yok)
3 yıldız koşulu: tüm nesneler + quiz %100
İpucu hakkı: vaka başına 1 (nesnenin bölgesi 2 sn parlar)
Vaka rotasyonu: haftada 2 yeni sahne hedefi
```

**Soru tipi:** Sahne tanımları ayrı JSON: `{scene_id, theme, objects: [{emoji, x, y, size, label, category}], quiz: [soru_id'leri]}`
**Ders:** Fen Bilimleri (canlılar, madde, enerji, çevre)
**Geliştirme notu:** Sahneler emoji + SVG kompozisyonuyla prosedürel yerleştirilir; nesne koordinatları JSON'da. Tıklama testi basit bounding circle. EN ZENGİN İÇERİK GEREKTİREN OYUN — sahne JSON'ları için ayrı Python generator yazılmalı.

---

### 4.5 MATEMATİK KAFE ☕🧮
**İlham:** Cafe World / Restaurant City

**Eğitsel dönüşüm:**
- Müşteriler (emoji karakterler) sıraya girer, her birinin sipariş balonu bir matematik problemi:
  - "2 tost + 1 ayran = ? TL" (fiyat listesi panoda)
  - "50 TL verdim, para üstü?"
  - "Tarif 2 kişilik, 6 kişilik için kaç yumurta?"
- Doğru cevap → müşteri mutlu, bahşiş (bonus puan). Yavaş/yanlış → müşteri sabırsızlanır, az puan (asla kızmaz, sadece bekler)
- Kafe seviye atlar: yeni menü öğeleri = yeni problem tipleri

**Mekanik parametreler:**
```
Vardiya süresi: 120 sn
Müşteri sabır süresi: 20 sn (Etek: 30 sn)
Doğru servis: 50 p + kalan sabır × 2 bahşiş
Etek: tek ürün fiyatı okuma
Yamaç: çoklu ürün toplama, para üstü
Tırmanış: oran-orantı (tarif ölçekleme), %10 indirim hesabı
Zirve: KDV %1 hesabı, kampanya karşılaştırma ("hangisi daha ucuz?")
```

**Soru tipi:** Prosedürel üretim (fiyat listesi + şablon problemler) — `numeric` cevap, ekran klavyesiyle giriş
**Ders:** Matematik (günlük hayat problemleri — müfredatın en çok istediği tür)
**Geliştirme notu:** Müşteri kuyruğu state machine (bekliyor → sipariş → mutlu/üzgün → çıkış). Numpad UI bileşeni diğer oyunlarda da kullanılacak şekilde modüler yazılmalı.

---

### 4.6 BİLGİ TAKIMI ⚔️📖
**İlham:** Mafia Wars (görev döngüsü) — SOSYAL KISIM TAMAMEN ÇIKARILDI

**Eğitsel dönüşüm:**
- Oyuncu bir "bilgi takımı" kurar ama takım üyeleri GERÇEK KİŞİ DEĞİL, kazanılan karakterlerdir (Matematikçi Aslı, Fenci Burak, Sözcü Defne…)
- Görev listesi: her görev = belirli sayıda soru çözmek ("Kütüphane görevi: 5 Türkçe sorusu çöz")
- Görev tamamlanınca XP + bazen yeni takım üyesi
- Takım üyeleri pasif bonus verir: Matematikçi Aslı varsa matematik görevlerinde +%10 puan
- Mafia Wars'un "enerji" sistemi: günde 20 görev enerjisi (ekran süresi sınırı — veli dostu)

**Mekanik parametreler:**
```
Günlük enerji: 20 (görev başına 1-3)
Görev türleri: hızlı (3 soru), normal (5 soru), destan (10 soru, 3 enerji)
Karakter kazanımı: her 5 görevde bir şans
Karakter bonusları: max +%25 (asla cevabı vermez, sadece puan çarpanı)
Sezon: aylık görev kitabı (30 görev), bitirene özel rozet
```

**Soru tipi:** Tüm banka — `multiple_choice` ağırlıklı, karışık ders
**Ders:** Tümü (portal genelinde "ana ilerleme oyunu" rolü)
**Geliştirme notu:** Bu oyun canvas gerektirmez — DOM tabanlı UI yeterli, en hızlı geliştirilebilir Faz 2 oyunu olabilir. Karakter görselleri emoji + CSS ile.

---

### 4.7 BİLGİ ÇİFTLİĞİ 🌱🚜
**İlham:** FarmVille — PORTALIN AMİRAL GEMİSİ ADAYI

**Eğitsel dönüşüm:**
- Soru çözerek **tohum** kazanılır (her doğru cevap = 1 tohum, ders seçilebilir)
- Tohum ekilir → GERÇEK ZAMANLA büyür (buğday 30 dk, domates 2 saat, ağaç 1 gün) → FarmVille'in "geri gelme" döngüsü
- Hasat → jeton + çiftlik XP → yeni arazi, yeni bitki türleri açılır
- Bitki türleri ders temalı: 🌾 Matematik Buğdayı, 🍅 Fen Domatesi, 🌻 İngilizce Ayçiçeği — hangi dersten soru çözüldüyse o tohum
- Solma mekaniği YUMUŞAK: bitki solmaz, sadece "hasada hazır" bekler (FarmVille'in stres yaratan solması bilinçli olarak ÇIKARILDI — çocuk suçluluk hissetmemeli)

**Mekanik parametreler:**
```
Soru oturumu: 10 soruluk paketler, doğru başına 1 tohum
Büyüme süreleri: 30 dk / 2 sa / 8 sa / 24 sa (tohum kalitesine göre)
Arazi: 3×3 başlar → XP ile 5×5'e
Dekorasyon: jetonla (çit, gölet, korkuluk — tamamen kozmetik)
Hasat bildirimi: portal içi rozet, push notification YOK (okul cihazları)
```

**Soru tipi:** Tüm banka, oturum başında ders + tier seçimi
**Ders:** Tümü
**Geliştirme notu:** Zaman bazlı büyüme `server timestamp` ile hesaplanmalı (cihaz saati hilesine karşı). Çiftlik durumu tek Firestore dokümanı: `farms/{uid}` → `{plots: [{seed, planted_at, subject}], xp, level, decor}`. İzometrik görünüm GEREKMEZ — düz grid + emoji yeterli, sevimlilik CSS animasyonlarından gelir.

---

### 4.8 KELİME CANAVARLARI 🐉📝
**İlham:** Dragon City · **Temel:** Zindan Okçusu fusion sistemi (motor hazır!)

**Eğitsel dönüşüm:**
- Her öğrenilen İngilizce kelime kategorisi bir canavar yumurtası verir (animals → 🦎, food → 🍄 canavarı)
- Canavar beslemek = o kategoriden kelime quizi çözmek; doğru cevaplar canavarı büyütür (3 evrim aşaması)
- **FUSION:** İki tam evrimli canavar birleşir → nadir melez (Zindan Okçusu fusion kodu reskin) — birleşim için İKİ kategorinin karışık quizi geçilmeli
- Koleksiyon defteri: 20+ canavar, tamamlayana "Canavar Profesörü" rozeti

**Mekanik parametreler:**
```
Yumurta açma: kategoriden 10 doğru cevap
Evrim eşikleri: 25 / 60 / 120 doğru cevap (kategori bazlı sayaç)
Fusion koşulu: 2 max-evrim canavar + 20 soruluk karışık quiz %80+
Quiz formatı: kelime → 4 anlam seçeneği, 10 sn süre
Canavar görselleri: emoji kombinasyonu + CSS filter (hue-rotate ile varyasyon)
```

**Soru tipi:** `pair_match` ve `multiple_choice` — vocabulary bankası kategori etiketleriyle
**Ders:** İngilizce (kategori sistemi kelime gruplarıyla birebir örtüşür)
**Geliştirme notu:** Zindan Okçusu'ndan alınacaklar: fusion UI akışı, envanter grid'i, nadirlik renk sistemi (common/rare/epic/legendary). Çıkarılacaklar: savaş, hasar, tüm aksiyon katmanı.

---

### 4.9 RİTİM SORULARI 🎹⬛
**İlham:** Piano Tiles · **Efor:** ⭐ Düşük (1 oturum)

**Eğitsel dönüşüm:**
- 4 sütunlu klasik düşen karo düzeni; ekranın üstünde soru sabit durur ("6 × 4 = ?")
- Düşen karoların üzerinde cevaplar yazar: doğru cevaplı karoya BAS, yanlışlara basma (boş geçir)
- Doğru karo kaçarsa veya yanlışa basılırsa combo sıfırlanır (oyun bitmez — Etek'te; Tırmanış+ 3 can)
- Hız her 10 doğruda artar — Piano Tiles'ın "akış hali" DNA'sı korunur

**Mekanik parametreler:**
```
Başlangıç hızı: 2 karo/sn → max 5 karo/sn
Doğru basış: 20 p × combo (max x3)
Soru değişimi: her doğru basışta yeni soru
Etek: tek basamaklı işlemler, ceza yok
Yamaç: iki basamaklı, kaçırma combo bozar
Tırmanış: 3 can sistemi
Zirve: karolarda kesir/yüzde cevaplar
```

**Soru tipi:** `numeric`, `multiple_choice` (kısa cevaplar) — çeldiriciler banka `options` alanından
**Ders:** Matematik (işlem akıcılığı), İngilizce hızlı kelime tanıma modu eklenebilir
**Geliştirme notu:** En basit motor: 4 sütun, sabit hızda inen div'ler, `touchstart` testi. Müzik yerine Web Audio ile her doğru basışta pentatonik nota — yanlışsız seri melodik tını verir (ödül hissi).

---

### 4.10 KESİR 2048 🔢🧩
**İlham:** 2048 · **Efor:** ⭐ Düşük (1 oturum)

**Eğitsel dönüşüm:**
- Klasik 4×4 kaydırma; Etek/Yamaç'ta sayılar (orijinal 2048), Tırmanış+ kesirler birleşir
- Kesir modu: 1/8 + 1/8 → 1/4 → 1/2 → 1 TAM (tam sayı oluşturmak = "patlama" + büyük puan)
- Tam sayılar birleşmeye devam eder: 1+1→2→4...
- Her birleşmede küçük bir görsel ispat animasyonu: iki çeyrek dilimin yarım daireye dönüşmesi (pasta modeli) — kesir KAVRAMI görselleşir

**Mekanik parametreler:**
```
Grid: 4×4
Birleşme puanı: oluşan değer × 10
Etek: klasik 2-4-8 sayıları
Yamaç: 5-10-20-40 (farklı taban, esneklik)
Tırmanış: 1/8 → 1 TAM kesir zinciri
Zirve: karışık (1/4 + 2/8 birleşir — denk kesir bilgisi!)
Geri al hakkı: oyun başına 3
```

**Soru tipi:** Soru bankası gerekmez — tamamen prosedürel
**Ders:** Matematik (kesirler, denk kesirler — müfredatın en zorlanılan konusu)
**Geliştirme notu:** 2048 mantığı ~200 satır. Asıl değer pasta dilimi SVG animasyonunda — birleşme anında 0.4 sn'lik morph. Swipe algılama `touchstart/touchend` delta yönü.

---

### 4.11 EŞLEŞTİRME USTASI 🃏🧠
**İlham:** Klasik hafıza kartı (Memory/Pexeso) · **Efor:** ⭐ Düşük (1 oturum)

**Eğitsel dönüşüm:**
- Kapalı kart grid'i; çift bulma ama çiftler ÖZDEŞ DEĞİL, İLİŞKİLİ:
  - İngilizce: "cat" kartı ↔ 🐱 kartı
  - Matematik: "7×8" kartı ↔ "56" kartı
  - Fen: "Buharlaşma" ↔ 💧→☁️ kartı
- Az hamlede bitirme = yüksek yıldız (1–3 ⭐)
- "Usta modu": kartlar 3 sn açık gösterilir, sonra kapanır → saf hafıza + bilgi birleşimi

**Mekanik parametreler:**
```
Etek: 4×3 grid (6 çift)
Yamaç: 4×4 (8 çift)
Tırmanış: 5×4 (10 çift) + hamle sınırı
Zirve: 6×5 (15 çift) + süre sınırı 120 sn
Yıldız: 3⭐ = çift sayısı × 1.5 hamleden az
Puan: 50/çift + kalan hamle bonusu
```

**Soru tipi:** `pair_match` — vocabulary ve işlem bankası DİREKT kullanılır, sıfır içerik üretimi
**Ders:** Tümü (çift tipi derse göre)
**Geliştirme notu:** CSS `transform: rotateY` kart çevirme, DOM tabanlı, canvas gerekmez. En hızlı geliştirilebilecek oyun — Claude Code'a ilk ısınma görevi olarak ideal.

---

### 4.12 KELİME KURTARMA 🎈🔤
**İlham:** Adam Asmaca — TEMA YUMUŞATILDI · **Efor:** ⭐ Düşük (1 oturum)

**Eğitsel dönüşüm:**
- Asılan adam YOK (çocuk dostu değil) → yerine: bir balon demetine bağlı sevimli karakter; her yanlış harf bir balon patlatır, balonlar biterse karakter yavaşça süzülerek iner ("düşmez", paraşüt açılır — kaybetme bile yumuşak)
- İpucu sistemi: kelimenin tanımı/kategorisi baştan açık ("Hayvan, 5 harf, çiftlikte yaşar")
- Doğru harf → balon parlar + harf yerine oturur

**Mekanik parametreler:**
```
Balon hakkı: Etek 8, Yamaç 6, Tırmanış 5, Zirve 4
Kelime puanı: harf sayısı × 20 + kalan balon × 15
İpucu jokerı: 1 harf açma (tur başına 1)
Etek: 3-4 harf + resim ipucu
Zirve: 7+ harf, sadece tanım, EN kelimeler
TR modu: deyim tamamlama (Zirve)
```

**Soru tipi:** `pair_match` (kelime + tanım/kategori alanı) — vocabulary bankasına `hint` alanı eklenir
**Ders:** Türkçe sözcük bilgisi, İngilizce yazım (spelling)
**Geliştirme notu:** Ekran klavyesi 29 harf TR / 26 harf EN toggle. Balon patlaması CSS animasyon. Tamamen DOM, yarım oturumda biter.

---

### 4.13 BİLGİ YILANI 🐍🍎
**İlham:** Snake (Nokia klasiği) · **Efor:** ⭐ Düşük (1 oturum)

**Eğitsel dönüşüm:**
- Klasik yılan; haritada 4 yem var, her yemin üzerinde bir cevap yazar, soru üstte sabit
- Doğru cevap yemini ye → uzarsın + puan. Yanlış yemi ye → 2 segment kısalırsın (1 segmente düşersen tur biter)
- Her doğru yemde soru değişir ve yemler yeniden konumlanır
- Duvarlar Etek'te geçirgen (karşıdan çıkar), Tırmanış+ ölümcül

**Mekanik parametreler:**
```
Grid: 20×20 (mobilde 15×15)
Hız: 5 hücre/sn → her 5 doğruda +%10
Doğru yem: 30 p × uzunluk çarpanı
Yanlış yem: -2 segment (puan kaybı yok)
Kontrol: swipe (mobil) / ok tuşları
Etek: 2 yem (1 doğru 1 yanlış), geçirgen duvar
Zirve: 4 yem, ölümcül duvar, hızlı tempo
```

**Soru tipi:** `multiple_choice` (kısa cevaplar), `numeric`
**Ders:** Tümü — karışık ders modu "Bilgi Yılanı Klasik" olarak sunulur
**Geliştirme notu:** Snake motoru ~150 satır canvas. Tek incelik: yemler yılanın mevcut gövdesine ve kafasının 3 hücre önüne spawn edilmemeli (haksız ölüm engellenir).

---

### 4.14 SAYI NİNJA 🥷🔢
**İlham:** Fruit Ninja · **Efor:** ⭐⭐ Orta

**Eğitsel dönüşüm:**
- Alttan havaya sayılar/ifadeler fırlar, parmakla kesilir
- Üstte kural yazar ve her 15 sn'de değişir: "3'ün katlarını kes!", "Asal sayıları kes!", "Sonucu 10'dan büyük olanları kes!"
- Kurala uyanı kes → puan + sayı parçacıkları efekti. Kurala uymayanı kes → combo sıfır
- Bomba yerine "çeldirici bulut": kesilirse 3 sn ekran sallanır (ceza yumuşak)

**Mekanik parametreler:**
```
Tur süresi: 75 sn
Fırlatma temposu: 1.5 nesne/sn → 3/sn
Doğru kesim: 25 p × combo (max x4)
Çoklu kesim bonusu: tek harekette 3+ doğru = x2
Etek: "çift sayıları kes" gibi tek kurallar
Yamaç: katlar, bölünebilme
Tırmanış: asal, kare sayılar, işlem sonuçları
Zirve: "kesri 1/2'den büyük olanları kes"
```

**Soru tipi:** Prosedürel kural motoru (`rules.js` modülü: kural → üretici + doğrulayıcı fonksiyon çifti)
**Ders:** Matematik (sayı hissi, bölünebilme, asallık — ezber değil tanıma)
**Geliştirme notu:** Parabolik fırlatma fiziği basit (`vy -= g`). Kesme algılama: `touchmove` çizgisinin nesne dairesiyle kesişimi. Bıçak izi için fading polyline. Zindan Okçusu particle pool'u buraya taşınabilir.

---

### 4.15 GÜNLÜK KELİME 🟩🟨
**İlham:** Wordle · **Efor:** ⭐⭐ Orta · **STRATEJİK ÖNEM: YÜKSEK**

**Eğitsel dönüşüm:**
- Günde 1 kelime — TÜM OKUL aynı kelimeyi çözer (ortak deneyim = sosyal his, iletişimsiz!)
- Klasik 6 deneme, yeşil/sarı/gri geri bildirim
- TR modu (5 harf) ve EN modu (4 harf, yaş grubuna uygun) ayrı günlük kelimeler
- Çözünce: kelimenin anlamı + örnek cümle gösterilir (eğitsel kapanış)
- Sonuç paylaşımı YOK (sosyal medya butonu yok) ama sınıf istatistiği VAR: "Sınıfının %68'i bugün çözdü, ortalama 4.2 deneme"

**Mekanik parametreler:**
```
Deneme: 6
Puan: (7 - deneme_sayısı) × 50, günde 1 kez
Seri: ardışık gün çözme sayacı (ayrı rozet zinciri)
Kelime seçimi: tarih bazlı seed → herkes aynı kelime, sunucu gerekmez
Kelime listesi: müfredat kelimeleri öncelikli (haftalık İngilizce ünite kelimeleri buraya pompalanır!)
Etek-Zirve ayrımı YOK — tek günlük kelime, okul geneli eşitlik
```

**Soru tipi:** Düz kelime listesi JSON (`daily_words_tr.json`, `daily_words_en.json`) + geçerli tahmin sözlüğü
**Ders:** Türkçe ve İngilizce yazım, sözcük dağarcığı
**Geliştirme notu:** Tarih bazlı deterministik seçim: `index = daysSince(epoch) % wordList.length`. Günlük "çözüldü" durumu localStorage + skor Bridge'e bir kez yazılır. **İngilizce zümresiyle koordinasyon fırsatı: o haftanın ünite kelimeleri listeye eklenirse oyun müfredatın parçası olur.**

---

### 4.16 BİLGİ ZIPLAMASI 🦘☁️
**İlham:** Doodle Jump · **Efor:** ⭐⭐ Orta

**Eğitsel dönüşüm:**
- Karakter otomatik zıplar, oyuncu sağa-sola yönlendirir
- Platformlar üç tip: normal (boş), CEVAP platformu (üzerinde cevap yazar), kırık
- Her 10 platformda bir "soru katmanı" gelir: yan yana 3 cevap platformu, soru ekranın üstünde — doğru platforma inersen yaylanıp fırlarsın (+yükseklik bonusu), yanlış platform kırılır ve düşersin
- Skor = ulaşılan yükseklik; sonsuz tırmanış, dağ teması portala cuk oturur (Etek'ten Zirve'ye GERÇEKTEN tırmanıyorsun!)

**Mekanik parametreler:**
```
Skor: yükseklik(m) + doğru cevap × 100
Soru katmanı sıklığı: her 10 platform
Doğru platform: süper zıplama (+3 platform yüksekliği)
Yanlış: platform kırılır (altta normal platform varsa kurtulur)
Tema değişimi: 500m orman → 1500m bulutlar → 3000m uzay
Kontrol: cihaz eğimi (DeviceOrientation) VEYA dokunma — ikisi de desteklenir
```

**Soru tipi:** `multiple_choice` (3 seçenekli filtrelenir)
**Ders:** Tümü
**Geliştirme notu:** Kamera takibi (karakter ekranın üst 1/3'üne gelince dünya aşağı kayar), platform recycling (pool). DeviceOrientation izni iOS'ta kullanıcı etkileşimi gerektirir — dokunma kontrolü varsayılan olmalı.

---

### 4.17 LABİRENT AVCISI 👻🟡
**İlham:** Pac-Man · **Efor:** ⭐⭐ Orta

**Eğitsel dönüşüm:**
- Labirentte noktalar yerine HARFLER/SAYILAR serpilidir; üstte soru: "GÜNEŞ kelimesini sırayla topla" veya "Toplamı 15 yapacak sayıları topla"
- Doğru sıradaki öğeyi al → parlar. Yanlış öğeye değersen → sıra sıfırlanır (öğeler geri gelir)
- Hayalet yerine "Unutkanlık Bulutu" 🌫️: yavaşça gezer, değerse 3 sn kontrol tersine döner (korkutmaz, komiktir)
- Güç kapsülü: 5 sn bulutları dondurur

**Mekanik parametreler:**
```
Labirent: 15×17 grid, 3 hazır harita rotasyonu
Bulut sayısı: Etek 1 → Zirve 3
Kelime tamamlama: harf × 40 p
Bölüm: 3 kelime/hedef tamamlanınca biter
Kontrol: swipe yön değiştirme
Zirve: bulutlar hızlı + labirentte sahte harfler (çeldirici)
```

**Soru tipi:** `pair_match` kelimeleri (harf dizilimi) + prosedürel sayı hedefleri
**Ders:** Türkçe/İngilizce yazım sırası, matematik (toplam avı)
**Geliştirme notu:** Grid tabanlı hareket (serbest piksel değil — köşe dönüşleri kolaylaşır). Bulut AI'ı basit: rastgele + %30 oyuncuya yönelme. A* GEREKMEZ.

---

### 4.18 BİLGİ KULESİ 🏰💡
**İlham:** Kim Milyoner Olmak İster · **Efor:** ⭐⭐ Orta

**Eğitsel dönüşüm:**
- 12 soruluk zorluk merdiveni: Etek sorularından başlar, Zirve'de biter (tier sistemi DOĞAL olarak gömülü)
- Para yerine KULE: her doğru cevap kuleye bir kat ekler, görsel olarak yükselir
- 3 joker:
  - **Yarı yarıya**: 2 şık eler
  - **Sınıfa Sor**: o soruyu daha önce çözen TÜM okul kullanıcılarının cevap dağılımını gösterir ("%62 B dedi") — gerçek iletişim yok, toplu istatistik var
  - **Çift Hak**: bir kez yanlış yapma hakkı
- Yanlış cevapta kule yıkılmaz, "güvenli katta" durur (4. ve 8. kat güvenli — Milyoner'in baraj sistemi)

**Mekanik parametreler:**
```
Soru sayısı: 12 (3 Etek + 3 Yamaç + 3 Tırmanış + 3 Zirve)
Kat puanları: 50-100-200-400-...-25600 (ikiye katlanır)
Güvenli katlar: 4 (800 p) ve 8 (6400 p)
Süre: soru başına 30 sn
Günlük hak: 3 kule denemesi
"Sınıfa Sor" verisi: scores koleksiyonundan soru bazlı agregasyon (Cloud Function, 1 saat cache)
```

**Soru tipi:** `multiple_choice` 4 şıklı — bankanın ana formatı, sıfır uyarlama
**Ders:** Tümü, karışık — "genel kültür modu" da eklenebilir
**Geliştirme notu:** DOM tabanlı, dramatik gerilim CSS ile (soru gelirken karartma, doğruda altın parıltı, Web Audio gerilim tınısı). Hafta sonu turnuva formatına en uygun oyun.

---

### 4.19 BİLGİ SAVUNMASI 🌻🛡️
**İlham:** Plants vs Zombies · **Efor:** ⭐⭐⭐ Yüksek

**Eğitsel dönüşüm:**
- 5 şeritli klasik düzen; zombi yerine "Soru Canavarları" yürür — her canavarın üzerinde bir soru yazar
- Savunma kuleleri dikmek için "enerji" gerekir; enerji ekranın altındaki hızlı soru panelinden kazanılır (cevapla → enerji damlası)
- Kuleler otomatik ateş eder AMA bir canavar kuleye ulaşırsa üzerindeki soruyu MANUEL cevaplayarak yok edebilirsin (son şans mekaniği — bilgi her zaman kazandırır)
- Dalga sistemi: 5 dalga = 1 bölüm, bölüm sonu "büyük canavar" (3 soruluk boss)

**Mekanik parametreler:**
```
Şerit: 5 (mobil dikeyde 4)
Kule türleri: Fıstıkçı (tek atış), Çifte (hızlı), Duvar (yavaşlatıcı), Bombacı (alan)
Kule maliyeti: 50-100-75-150 enerji
Enerji kazanımı: hızlı panel sorusu = 25 enerji (paneldeki soru 10 sn'de yenilenir)
Dalga zorluğu: canavar hızı ve sayısı artar
Etek: 3 dalga, yavaş tempo / Zirve: 7 dalga + boss
```

**Soru tipi:** `numeric` ve kısa `multiple_choice` (hızlı panel), boss için tam 4 şıklı
**Ders:** Matematik ağırlıklı (enerji paneli işlem akıcılığı ister)
**Geliştirme notu:** En karmaşık ikinci dalga oyunlarından: kule hedefleme (şeritteki en yakın canavar), mermi-canavar çarpışma, dalga zamanlayıcı. Zindan Okçusu'nun mermi/çarpışma/pool sistemleri ciddi oranda taşınabilir. 2-3 oturum planla.

---

### 4.20 FİZİK FIRLATMA 🎯🐦
**İlham:** Angry Birds · **Efor:** ⭐⭐⭐ Yüksek

**Eğitsel dönüşüm:**
- Sapan + parabolik atış; hedefler kutu kuleleri içindeki "hedef yıldızlar"
- ÇİFTE EĞİTSEL KATMAN:
  1. **Mermi kazanma:** Atış öncesi mini soru → doğru cevap = atış hakkı (3 soru = 3 mermi)
  2. **Fizik kazanımı:** Atış açısı ve kuvvet göstergesi EKRANDA SAYISAL gösterilir ("45° / kuvvet 70") — deneme yanılma yerine bilinçli ayar teşvik edilir, bölüm sonunda "en verimli açın: 43°" geri bildirimi
- Tırmanış+ bölümlerde atış öncesi tahmin sorusu: "Bu açıyla mermi hedefi aşar mı?" (tahmin doğruysa bonus)

**Mekanik parametreler:**
```
Bölüm: 12 el yapımı seviye (JSON tanımlı kutu dizilimleri)
Yıldız: 1-3 ⭐ (kalan mermi sayısına göre)
Mermi tipi: normal, ağır (Yamaç+), bölünen (Zirve)
Fizik: basit AABB + dairesel çarpışma, tam rigid body GEREKMEZ
Yerçekimi sabiti bölümlere göre değişebilir ("Ay bölümü": g düşük — kavramsal altın madeni!)
```

**Soru tipi:** `multiple_choice` (mermi kazanma) + seviye JSON'ları
**Ders:** Fen (kuvvet, açı, yerçekimi — kinestetik öğrenme) + soru bankasından karma
**Geliştirme notu:** Tam fizik motoru yazma — kutular sadece devrilir/yıkılır (sağlık puanlı), gerçekçi yığın fiziği gereksiz karmaşıklık. Yörünge öngörü çizgisi (noktalı parabol) Etek'te açık, Zirve'de kapalı.

---

### 4.21 CEVAP KOŞUSU 🏃💨
**İlham:** Temple Run / Crossy Road · **Efor:** ⭐⭐⭐ Yüksek · **MOBİL POTANSİYEL: EN YÜKSEK**

**Eğitsel dönüşüm:**
- 3 şeritli sonsuz koşucu (pseudo-3D — NEON DRIFT motorundan perspektif tekniği taşınır!)
- Normal akış: engellerden kaç (sağ/sol swipe, zıpla)
- Her 15 saniyede YOL AYRIMI: 3 tabela, üstte soru — doğru tabelanın şeridine geç, yanlış şerit çamurlu yol (5 sn yavaşlama, ölüm yok)
- Koşarken toplanan jetonlar + doğru ayrım bonusları = skor
- Dağ teması: koşu Etek'ten başlar, mesafe arttıkça manzara Zirve'ye tırmanır

**Mekanik parametreler:**
```
Skor: mesafe(m) + doğru ayrım × 150 + jeton × 5
Ayrım sıklığı: 15 sn (mesafe arttıkça 10 sn'ye iner)
Yanlış ayrım: 5 sn yavaşlama (sonsuz koşucuda zaman = skor kaybı, ceza doğal)
Hız: 10 m/sn → 20 m/sn
Engeller: kütük (zıpla), kaya (şerit değiştir), alçak dal (kayma - swipe down)
Güçlendirme: mıknatıs, kalkan (jetonla satın alınmaz, yolda toplanır)
```

**Soru tipi:** `multiple_choice` 3 şıklı filtrelenmiş — tabelaya sığacak kısa cevaplar
**Ders:** Tümü
**Geliştirme notu:** NEON DRIFT'in pseudo-3D yol projeksiyonu (segment tabanlı perspektif) doğrudan temel alınır — en büyük teknik risk zaten çözülmüş durumda. Karakter animasyonu 3 kare sprite yerine CSS transform ile stilize silüet.

---

## 5. OYUN İSKELETİ — STANDART ŞABLON

Her oyun bu yapıyı izler (tek dosyada):

```
oyun-adi.html
├── <style>           → Mobil öncelikli CSS, portal renk paleti
├── #screen-menu      → Başlık, seviye seçimi (Etek/Yamaç/Tırmanış/Zirve), nasıl oynanır
├── #screen-game      → Canvas veya DOM oyun alanı + HUD (skor, süre, combo)
├── #screen-result    → Skor, kazanılan jeton, rozet bildirimi, "Tekrar Oyna" + "Portala Dön"
└── <script>
    ├── STRINGS       → Tüm UI metinleri (TR)
    ├── CONFIG        → Tier parametreleri, süreler, puanlar
    ├── FALLBACK_QUESTIONS → Gömülü 20 soru (offline güvence)
    ├── QuestionBank  → JSON yükleme + filtreleme + karıştırma
    ├── Game          → Oyun döngüsü (state machine: menu → playing → paused → result)
    ├── Audio         → Web Audio sentez (doğru/yanlış/combo/fanfar sesleri)
    └── Bridge        → Portal entegrasyonu (Bölüm 6)
```

**Zorunlu davranışlar:**
- `visibilitychange` → otomatik duraklat (teneffüs zili çalınca skor yanmasın)
- Yanlış cevapta kırmızı flaş + titreşim YOK; sadece nötr "shake" animasyonu (kaygı yaratmama ilkesi)
- Her oyun sonu ekranında: skor + bu oturumda öğrenilen/çözülen içerik özeti ("Bugün 14 çarpma işlemi çözdün! 🎉")

---

## 6. PORTAL ENTEGRASYONU

### 6.1 Bridge API (her oyuna gömülür)

```javascript
const BilnetBridge = {
  // Oyun bittiğinde çağrılır — tek giriş noktası
  async submitScore({gameId, score, tier, stats}) {
    const payload = {
      uid: this.getUid(),           // portal session'dan
      gameId, score, tier,
      stats,                        // {correct: 14, wrong: 3, maxCombo: 5}
      ts: Date.now()
    };
    try {
      await this.sendToBackend(payload);
    } catch (e) {
      this.queueOffline(payload);   // localStorage kuyruğu
    }
  },
  // Bağlantı dönünce kuyruk boşaltılır
  flushQueue() { /* ... */ }
};
```

### 6.2 Firestore Şeması (mevcut altyapı)

```
users/{uid}
  → {nickname, avatar, classCode, coins, streak, lastLogin, badges: []}

scores/{uid}_{gameId}
  → {best, weekly, total, lastPlayed}

class_league/{week}/{classCode}
  → {totalPoints, memberCount}        // increment ile atomik artış

badges_defs/{badgeId}
  → {name, emoji, condition}          // istemci koşulu kontrol eder, sunucu doğrular

farms/{uid}                            // sadece Bilgi Çiftliği
monsters/{uid}                         // sadece Kelime Canavarları
```

**Latency notu:** Hiçbir oyun gerçek zamanlı okuma yapmaz. Skorlar yazma ağırlıklı (fire-and-forget), liderlik tabloları 5 dk cache'li okunur. Mevcut Firebase latency sorunu bu mimaride hissedilmez.

### 6.3 Güvenlik

- Skor doğrulama: istemci skoru + `stats` tutarlılık kontrolü Cloud Function ile (`score ≤ correct × maxPuan × maxCombo` sınırı)
- Rate limit: dakikada max 2 skor yazımı/kullanıcı
- Sınıf kodu format kontrolü, serbest metin alanı YOK (rumuz: ön tanımlı kelime + sayı kombinasyonu önerilir: "HızlıKartal42" — küfür filtresi derdi sıfırlanır)

### 6.4 Supabase Geçiş Hazırlığı

`Bridge.sendToBackend()` tek soyutlama noktasıdır. Geçişte yalnızca bu fonksiyon değişir; oyun dosyalarına dokunulmaz. Tablo karşılıkları: `users`, `scores`, `class_league` → Postgres tabloları, `increment` → `rpc` çağrısı.

---

## 7. GELİŞTİRME YOL HARİTASI

### Faz 1 — Hızlı Kazanımlar (2-3 hafta)
| # | Oyun | Temel | Tahmini Efor |
|---|---|---|---|
| 1 | Bilgi Madencisi | Altın Madencisi reskini | ⭐ Düşük |
| 2 | Matematik Patlatma | Sıfırdan, basit grid | ⭐⭐ Orta |
| 3 | Kelime Balonu | Sıfırdan, bubble fizik | ⭐⭐ Orta |
| + | Meta katman v1 | Jeton + günlük giriş + skor tablosu | ⭐⭐ Orta |

### Faz 2 — İçerik Derinliği (3-4 hafta)
| # | Oyun | Not |
|---|---|---|
| 4 | Bilgi Takımı | DOM tabanlı, hızlı çıkar — enerji sistemi burada test edilir |
| 5 | Matematik Kafe | Numpad bileşeni + prosedürel problem üretici |
| + | Meta katman v2 | Sınıf ligi + haftalık turnuva + rozetler |

### Faz 3 — Amiral Gemileri (4-6 hafta)
| # | Oyun | Not |
|---|---|---|
| 6 | Bilim Dedektifi | Sahne içerik üretimi paralel yürütülmeli (Python generator) |
| 7 | Bilgi Çiftliği | Zaman bazlı backend mantığı — en dikkatli test gerektiren |
| 8 | Kelime Canavarları | Zindan Okçusu fusion kodu hazır olduğu için göründüğünden hızlı |

### Faz 4 — İkinci Dalga: Hızlı Çoğaltma (2-3 hafta, paralel yürütülebilir)
Düşük eforlu oyunlar — her biri 1 oturum, portal içerik sayısını hızla katlar:
| # | Oyun | Not |
|---|---|---|
| 9 | Eşleştirme Ustası (4.11) | EN KOLAY — Claude Code ısınma görevi, buradan başla |
| 10 | Kelime Kurtarma (4.12) | DOM tabanlı, yarım oturum |
| 11 | Bilgi Yılanı (4.13) | ~150 satır canvas motoru |
| 12 | Ritim Soruları (4.9) | Teneffüs oyunu, yüksek tekrar oynanabilirlik |
| 13 | Kesir 2048 (4.10) | Kesir müfredatı için stratejik |

### Faz 5 — İkinci Dalga: Bağlılık Motorları (3-4 hafta)
| # | Oyun | Not |
|---|---|---|
| 14 | Günlük Kelime (4.15) | ⭐ STRATEJİK — "her gün gel" döngüsünü tek başına taşır, ÖNE ALINABİLİR |
| 15 | Sayı Ninja (4.14) | Dokunmatik şov oyunu, tanıtımlarda gösterilecek oyun |
| 16 | Bilgi Kulesi (4.18) | Hafta sonu turnuva formatı |
| 17 | Bilgi Zıplaması (4.16) | Sonsuz skor yarışı |
| 18 | Labirent Avcısı (4.17) | 3 harita rotasyonu |

### Faz 6 — İkinci Dalga: Büyük Yapımlar (4-6 hafta)
| # | Oyun | Not |
|---|---|---|
| 19 | Cevap Koşusu (4.21) | NEON DRIFT motoru temel — mobilde en çok oynanacak aday |
| 20 | Bilgi Savunması (4.19) | Zindan Okçusu sistemleri taşınır, 2-3 oturum |
| 21 | Fizik Fırlatma (4.20) | 12 seviye JSON tasarımı paralel hazırlanmalı |

**Faz sıralaması esnektir.** Önerilen istisna: **Günlük Kelime (4.15) Faz 1'in hemen ardından çıkarılabilir** — portala günlük dönüş alışkanlığını en erken kazandıracak oyun budur ve geliştirme maliyeti düşüktür.

### Her oyun için tamamlanma kriterleri (Definition of Done)
- [ ] 360px mobilde sorunsuz, dokunmatik birincil
- [ ] 4 tier de oynanabilir ve fark hissedilir
- [ ] Offline çalışır, skor kuyruklanır
- [ ] FALLBACK_QUESTIONS gömülü
- [ ] Bridge entegrasyonu test edildi
- [ ] Oyun sonu özet ekranı eğitsel kazanımı söylüyor
- [ ] Hiçbir serbest metin girişi / sosyal özellik yok
- [ ] 60 sn'lik bir oturum bile anlamlı (teneffüs testi)

---

## 8. CLAUDE CODE İÇİN ÇALIŞMA TALİMATLARI

1. **Her oyun ayrı oturumda geliştirilir.** Bu dosya + ilgili oyunun bölümü (Bölüm 4.x) + Bölüm 5-6 her oturumda bağlama verilir.
2. **Önce oynanabilir çekirdek:** Soru bankası entegrasyonundan önce FALLBACK_QUESTIONS ile oyun döngüsü tamamlanır ve test edilir.
3. **Mevcut kod tabanından dönüşümlerde** (4.1, 4.8): önce orijinal dosya okunur, korunacak/silinecek sistemler listelenir, onay sonrası dönüşüm başlar.
4. **Test protokolü:** Her milestone'da Emre tarayıcıda manuel test eder; mobil test Chrome DevTools device mode + gerçek telefon.
5. **Dil:** Kod yorumları ve commit mesajları Türkçe olabilir; değişken/fonksiyon adları İngilizce.
6. **Asla eklenmeyecekler:** chat, arkadaşlık, kullanıcılar arası aksiyon, gerçek para, reklam SDK'sı, push notification, serbest metin girişi.

---

*Son güncelleme: 12 Haziran 2026 · Hazırlayan: Claude (Emre Günay ile birlikte) · bilnetoyun.com Eğitsel Dönüşüm Projesi v1.0*
