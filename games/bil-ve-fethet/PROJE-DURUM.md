# 🌍⚔️ BİL ve FETHET — Proje Durum Dokümanı

> Dünya haritası üzerinde oynanan, bilgi sorularıyla toprak fethedilen strateji oyunu.
> Triviador/Bil ve Fethet esinli, özgün mekaniklerle (oransal fetih, ülke bölünmesi, kademe sistemi).
>
> **Son güncelleme:** Faz 1 + Faz 2 tamamlandı. Online mod (Faz 3) planlandı.

---

## 📦 BU PAKETTE NE VAR

| Dosya | Açıklama |
|---|---|
| `bil-ve-fethet.html` | **OYNANABİLİR OYUN** — tek dosya, çift tıkla aç, internet gerektirmez |
| `PROJE-DURUM.md` | Bu doküman — yapılanlar, mekanikler, yol haritası |
| `CLAUDE.md` | Claude Code için orijinal tasarım handoff'u (mekanik referansı) |
| `game_template.html` | Oyunun kaynak şablonu (veri gömülmeden önceki hâli) |
| `questionbank.js` | Soru bankası — prosedürel üreticiler + veri havuzları |
| `build_map.py` | Harita verisi üretici (Natural Earth → oyun verisi) |
| `gamedata.json` | İşlenmiş harita verisi (176 ülke, komşuluk, şehir sayıları) |

**Oynamak için:** Sadece `bil-ve-fethet.html` dosyasını tarayıcıda açman yeterli.
**Geliştirmek için:** `game_template.html` + `questionbank.js` + `gamedata.json` kaynak dosyalardır;
`build.py` mantığıyla (aşağıda) birleştirilip `bil-ve-fethet.html` üretilir.

---

## ✅ YAPILANLAR (Faz 1 + Faz 2)

### Faz 1 — Bireysel Mod MVP ✓
- **Gerçek dünya haritası:** 176 ülke (Natural Earth verisi), SVG render, sürükle + tekerlek/pinch zoom
- **Komşuluk grafiği:** Kara komşulukları arc paylaşımından; ada ülkeleri için deniz komşuluğu;
  hiçbir ülke izole değil (tam bağlantı garantisi)
- **Ülke seçimi ve fetih:** Komşu ülkeye tıkla → 10 soruluk savaş → oransal toprak transferi
- **Oransal fetih tablosu:** 10 doğru = tam fetih, 6-9 doğru = orantılı kazanç, 5 = berabere,
  5 altı = kendi toprağından orantılı kayıp
- **NPC seviyeleri:** Her ülkeye rastgele saldırı + savunma seviyesi (1-4, ayrı ayrı)
- **Denge kuralı:** Başlangıç ülkesinin komşularının en az yarısı kolay savunmalı
- **Dünya zorlaşması:** Her 5 dakikada sahipsiz ülkelerin savunması +1 (erken fetih avantajlı)
- **Ekonomi:** Şehir sayısı bazlı altın geliri (her 10 sn), 4 kademeli saldırı/savunma yükseltme
- **Maliyet dengesi:** Yükseltme maliyeti şehir sayısına ölçekli; Zirve ilk 10 dk kilitli
- **Kazanma/kaybetme:** Tüm dünya = zafer; tüm toprak kaybı = game over

### Faz 2 — Derinlik ve Cila ✓
- **NPC karşı saldırısı:** Saldırısı savunmana denk komşular 1-3 dk'da bir sana saldırır
- **Atlas renklendirme:** 8 renkli palet, graph coloring ile komşular farklı renkte (0 çakışma);
  savunma zorluğu rengin koyuluğuyla gösterilir
- **Otomatik yakınlaşma:** Ülke seçince/saldırınca harita o ülkeye yumuşak animasyonla odaklanır
- **Ders sistemi:** İlkokul/ortaokul/lise için ders seçimi (matematik, fen, Türkçe, sosyal,
  coğrafya, İngilizce, din); çoklu seçim, sorular karışık gelir
- **Prosedürel soru üretimi:** Her ders büyük veri havuzlarından kombinatoryal soru üretir;
  tüm dünya fethedilse bile pratikte tekrar gelmez (tipik oyunda %0 tekrar)
- **Zorluk ölçeklemesi:** Etek→Zirve farkı her kademede belirgin (saldırı seviyesi yükselince
  sorular kolaylaşır, savunma seviyesi rakibin sorularını zorlaştırır)
- **Ses efektleri:** Web Audio sentezi ile doğru/yanlış/zafer/yenilgi/saldırı/yükseltme/alarm
  sesleri (hiç ses dosyası yok, tamamen sentetik); ses aç/kapa butonu
- **Görsel efektler:** Fethedilen ülke parlama animasyonu, sonuç emojisi pop animasyonu
- **Oyun içi menü:** ☰ butonu → Devam Et / Yeniden Başlat (yeni ülke seç) / Ana Menü

---

## 🎮 ONAYLANMIŞ OYUN MEKANİKLERİ

Bu kurallar oyun tasarımcısı tarafından onaylanmıştır — değiştirilmemeli.

### Genel
1. **İki mod:** Online (2-8 oyuncu, lobi) + Bireysel (1 oyuncu). *Şu an bireysel çalışıyor.*
2. **Harita:** Gerçek dünya, tüm ülkeler. Sadece komşuya saldırılabilir.
3. **Savaş kilidi:** Saldıran + savunan, savaş sırasında başka savaşa giremez (sahipsiz hedefte de).

### Savaş
4. **Eşzamanlı 10 soru, süre sınırlı.** Cevaplanmayan soru yanlış sayılır.
5. **Oransal transfer:** İki taraf arasındaki doğru farkı / 10 oranında toprak el değiştirir.
   Tek savaşta asla tüm ülke alınmaz; fetih kademelidir.
6. **Soru zorluğu çapraz belirlenir:** Saldıranın saldırı seviyesi → savunanın gördüğü soruların
   zorluğu; savunanın savunma seviyesi → saldıranın gördüğü soruların zorluğu.
7. **Zorluk her zaman seçilen kademe İÇİNDE ölçeklenir** (anaokulu lobisinde "Zirve" = anaokulunun
   en zoru; lise sorusu asla çıkmaz).

### Bireysel mod sonuç tablosu (sahipsiz/tek taraflı savaş)
| Doğru | Sonuç |
|---|---|
| 10 | Hedefin tamamı fethedilir |
| 6-9 | Hedefin (doğru/10) oranı fethedilir |
| 5 | Berabere |
| 0-4 | Kendi toprağının (5−doğru)/10 oranı kaybedilir |

### Ekonomi ve geliştirme
8. **Gelir = şehir sayısı bazlı** (eyaletli ülkelerde eyalet başına oranlı şehir atanır).
9. **4 kademe:** Etek → Yamaç → Tırmanış → Zirve. Hiçbir ülke seçimi ilk dakikalarda max'lanamaz;
   maliyet şehir sayısıyla ölçeklenir (az şehirli ülke ilk yükseltmelerde ucuz, Zirve herkes için pahalı).

### Sahipsiz ülkeler
10. **NPC yok, sadece seviye var.** Her ülkeye saldırı + savunma seviyesi ayrı rastgele atanır.
11. **Denge:** Başlangıç komşularının hepsi en zor olamaz. Zamanla sahipsiz ülkeler zorlaşır.
12. **Bireyselde karşı saldırı:** NPC saldırı seviyesi == oyuncu savunma seviyesi olan komşular,
    oyuncu savaşta değilken rastgele aralıklarla saldırır.

### Online'a özel (henüz uygulanmadı)
13. **Ülke bölünmesi:** Aynı ülkeyi N oyuncu seçerse ülke N eşit parçaya bölünür, rastgele dağıtılır.
14. **Başkent koruması:** Online'da başlangıç parçasının merkezi (başkent) asla fethedilemez.
    Bireyselde başkent koruması YOK (her şey kaybedilebilir).
15. **Kazanma:** Online'da süre dolunca en çok şehre sahip oyuncu; bireyselde tüm dünya.

---

## 🛠️ TEKNİK MİMARİ

### Dosya yapısı (kaynak)
```
bil-ve-fethet/
├── game_template.html   # HTML + CSS + oyun motoru (JS), iki placeholder içerir:
│                        #   __GAMEDATA__   → gamedata.json buraya gömülür
│                        #   __QUESTIONBANK__ → questionbank.js buraya gömülür
├── questionbank.js      # SUBJECTS, veri havuzları, SUBJGEN prosedürel üreticiler
├── gamedata.json        # [{id, n(isim), p(svg path), c(şehir), x, y, nb(komşular)}]
├── build_map.py         # Natural Earth TopoJSON → gamedata.json üretir
└── bil-ve-fethet.html   # ÜRETİLEN dosya (template + veriler birleşik)
```

### Build (kaynaktan oyunu üretme)
```python
# build.py
data = open('gamedata.json', encoding='utf-8').read()
bank = open('questionbank.js', encoding='utf-8').read()
tpl  = open('game_template.html', encoding='utf-8').read()
out  = tpl.replace('__GAMEDATA__', data).replace('__QUESTIONBANK__', bank)
open('bil-ve-fethet.html','w',encoding='utf-8').write(out)
```

### Oyun motoru bileşenleri (game_template.html içinde)
- **`S`** — tüm oyun durumu (faz, kademe, dersler, sahiplik, npc seviyeleri, altın, seviyeler...)
- **`CFG`** — tüm denge sabitleri tek yerde (gelir, maliyet, zamanlamalar)
- **Harita:** `buildMap`, `paintCountry`, `assignHues` (renklendirme), `focusCountry` (yakınlaşma)
- **Soru sistemi:** `genQuestion` → `MATGEN` (matematik), `SUBJGEN` (sözel dersler), `anaQuestion`
  (anaokulu); `askedQ` Set'i ile tekrar engelleme
- **Savaş:** `startBattle` → `nextQuestion` → `answer` → `finishBattle` → `afterBattle`
- **Ekonomi:** `tick` (gelir), `buyUp` (yükseltme), `refreshHUD`
- **NPC:** `scheduleNpcAttack`, `tryNpcAttack`
- **Ses:** `SFX` nesnesi (Web Audio sentezi)

### Denge sabitleri (`CFG`)
```js
TICK_MS: 10000          // gelir aralığı (10 sn)
INCOME_BASE: 25         // taban gelir
INCOME_PER_CITY: 3      // şehir başı gelir
COST_BASE: 600          // yükseltme taban maliyeti
WORLD_HARDEN_MS: 300000 // her 5 dk sahipsiz savunma +1
ZIRVE_LOCK_MS: 600000   // 4. kademe ilk 10 dk kilitli
NPC_ATK_MIN/MAX: 60-180 sn   // karşı saldırı aralığı
NPC_EXPECT: {1:4,2:5,3:6,4:7} // NPC seviye→beklenen doğru
```

### Soru bankası kapasitesi
- **Matematik:** Prosedürel, sonsuz (her kademede 4 zorluk, geniş sayı aralığı)
- **İngilizce:** 150+ kelime sözlüğü, zıt anlam, düzensiz fiil, çoğul/karşılaştırma → 500+ benzersiz
- **Coğrafya:** 75 ülke (başkent + kıta) → 225+ benzersiz
- **Türkçe:** Eş/zıt anlam havuzları, hece sayma, sözcük türü → 200+ benzersiz
- **Fen:** Element, organ, birim, gezegen, hâl değişimi + fizik hesabı → 150+ benzersiz
- **Tarih/Din:** Olay-yıl, kişi-rol, temel bilgi havuzları
- **Test sonucu:** Tipik oyun (600 soru) %0 tekrar; tüm dünya fethi (1200 soru) <%1 tekrar

---

## 🔜 BUNDAN SONRA YAPILACAKLAR

### Faz 3 — Online Mod (Firebase)
> Gerçek zamanlı çok oyunculu. Firebase Realtime Database gerektirir.

**Adım 1 — Firebase kurulumu (kullanıcı sağlar)**
1. [console.firebase.google.com](https://console.firebase.google.com) → yeni proje
2. Realtime Database oluştur (test modunda başla)
3. Web app ekle → config'i (apiKey, databaseURL vb.) al
4. Config'i `bil-ve-fethet.html` içine ekle

**Adım 2 — Lobi sistemi**
- Lobi oluştur: kurucu kademe, ders(ler), oyun süresi (10/20/30 dk), soru süresi, max oyuncu (2-8) seçer
- Lobi kodu ile katılım
- Oyuncu listesi gerçek zamanlı senkron

**Adım 3 — Ülke seçim ekranı**
- Haritadan ülke seç; aynı ülkeyi seçenler görünür
- Kurucu "Başlat" → ülke bölme hesaplanır

**Adım 4 — Voronoi ülke bölme**
- Aynı ülkeyi N oyuncu seçerse poligon N eşit alana bölünür (Voronoi + Lloyd relaxation)
- Her oyuncuya rastgele parça; başkent = başlangıç parçası merkezi (korumalı)

**Adım 5 — Eşzamanlı düello**
- İki oyuncuya aynı sorular, aynı anda (sunucu zaman damgası)
- Savaş kilidi (Firebase transaction ile race condition önleme)
- Cevaplar + süreler sunucuya yazılır

**Adım 6 — Senkron ekonomi ve süre**
- Gelir tick'i, seviye yükseltmeleri, süre sayacı senkron
- Süre dolunca skor (şehir sayısı) ile kazanan belirlenir

**Firebase veri modeli (öneri)**
```
/lobbies/{lobbyId}: { settings, players{}, status }
/games/{gameId}:
  /territories: { id: { owner, area, cities } }
  /players: { uid: { gold, atkLvl, defLvl, capitalId, inBattle } }
  /battles/{battleId}: { attacker, defender, questions[], answers{}, status }
  /npcLevels: { id: { atk, def } }
  /clock: { startedAt, durationMin }
```

### Faz 4 — Cila ve Güvenlik
- **Anti-hile:** Doğru cevap index'i savaş bitene kadar istemciye gönderilmez; sunucu doğrulaması
- **Bağlantı yönetimi:** Kopma/yeniden katılım
- **Mobil optimizasyon:** Dokunmatik harita iyileştirmeleri
- **Denge playtest:** Gerçek oyunculardan veri ile CFG ayarı

### Olası Eklentiler (opsiyonel)
- İstatistik ekranı (fethedilen ülke, doğruluk oranı, en uzun seri)
- Başarımlar / rozetler
- Soru bankası genişletme (mevcut 1.221 soruluk banka entegrasyonu)
- Farklı harita modları (sadece bir kıta, takım modu)
- Sıralama tablosu (online)

---

## 📝 NASIL GELİŞTİRİLİR

### Yeni soru/ders eklemek
`questionbank.js` içindeki veri havuzlarına ekleme yap:
- **İngilizce kelime:** `EN_WORDS` listesine `['english','türkçe']` ekle
- **Ülke:** `GEO` listesine `['Ülke','Başkent','Kıta']` ekle
- **Eş/zıt anlam:** `TR_SYN` / `TR_ANT` listelerine çift ekle
- **Yeni soru tipi:** İlgili `SUBJGEN[ders][kademe]` üreticisine `if (t===N)` dalı ekle

### Dengeyi ayarlamak
`game_template.html` içindeki `CFG` bloğunu düzenle (tek yerde). Örnek:
- Gelir yavaş geliyorsa → `INCOME_PER_CITY` artır
- Yükseltme pahalıysa → `COST_BASE` azalt
- NPC çok saldırıyorsa → `NPC_ATK_MIN/MAX` artır

### Değişikliği uygulamak
Kaynağı düzenledikten sonra build et (yukarıdaki `build.py`), `bil-ve-fethet.html` yeniden üretilir.

---

## 🧪 TEST DURUMU

Tüm testler otomatik (jsdom) ile doğrulandı:
- ✅ Harita render (176 ülke), komşuluk, denge kuralı
- ✅ Savaş akışı (fetih, kayıp, berabere), oransal transfer
- ✅ Yükseltme, Zirve kilidi, NPC karşı saldırısı
- ✅ Soru üreticileri (format, zorluk ölçeklemesi)
- ✅ Tekrarsız kapasite (tipik oyun %0 tekrar)
- ✅ Menü akışı (yeniden başlat, ana menü, durum sıfırlama)
- ✅ Ses entegrasyonu (çalışma zamanı hatası yok)

## 🔧 DÜZELTMELER

**2026-06-13 — Masaüstünde ülke seçilemiyor (kritik):**
`svg.setPointerCapture` (pan/zoom) sentetik `click` olayını SVG'ye yeniden hedefliyordu;
path'lere bağlı `click` dinleyicileri hiç çalışmıyordu → ne başlangıç ülkesi seçilebiliyor
ne de oyun içinde saldırı hedefi tıklanabiliyordu. Çözüm (kaynak/game_template.html):
1. Path-başına `click` dinleyicisi kaldırıldı.
2. `pointerdown`'da basılan ülke (`e.target.closest('.country')`) `drag.t`'ye kaydedilir;
   pinch başlarsa `drag.pinched` işaretlenir.
3. `endPtr`'de hareketsiz + pinch'siz `pointerup` = seçim → `onCountryClick(id)`.
4. **ID'ler STRING'dir** ("076" gibi baştaki sıfırlı ISO kodları) — sayıya çevirme
   `attackableIds().has()` ve `S.own` anahtar eşleşmesini bozar. Ham string geçilir.
5. `setPointerCapture` try/catch'e alındı (sentetik/uç durum pointerId'leri).
Doğrulama: preview'da uçtan uca akış — seçim, sürükleme (seçim tetiklemez), pinch,
tekerlek zoom, saldırı→10 soru→oransal fetih, NPC savunma savaşı. `?v=2` cache-bust.

**2026-06-13 — Çeldirici cevap-eşitliği çakışması (örn. "Mustafa Kemal" / "Mustafa Kemal Atatürk"):**
`questionbank.js`'te aynı kişi iki ayrı cevap olarak var (HIST_WHO: "T.C. kurucusu"→"Mustafa Kemal
Atatürk", "İlk TBMM Başkanı"→"Mustafa Kemal"). Çeldiriciler aynı havuzdan çekilince ikisi bir soruda
buluşuyor; eski `_opts` yalnız BİREBİR string eşitliğini (`v !== correct`) eliyordu → çocuk "diğer
varyantı" seçince yanlış sayılıyordu. Çözüm (kaynak/questionbank.js):
1. `_normAns` (küçük harf TR + tırnak/noktalama silme; **`-` ve `/` AYRAÇ DEĞİL** → "-100"≠"100",
   "1/2"≠"12") + `_sameAns` (normalize-eşit VEYA tam-kelime kapsama; "İnönü"⊂"İsmet İnönü").
2. `_opts` yeniden yazıldı: doğru + en fazla 3 çeldirici, hiçbir seçenek bir diğeriyle "aynı cevap" olmaz.
3. Sembol-yalnız cevaplar ("?"/"!") için ham-eşitlik yedeği (boşa-normalize birleştirmesin).
Doğrulama: `kaynak/test_opts.js` (22 iddia: 1000×2 Mustafa Kemal + ~3600 üretilen soru, 0 ikilem,
4 seçenek korunur) + tarayıcıda 15.000 tarih sorusunda 0 çakışma. `?v=3` cache-bust.
**Audit:** `fabrika/tools/scan_option_collisions.py` ile 1631 baked seçenek dizisi tarandı —
shipped tek diğer çakışma altin-avi "Mouse kaç düğme?" ("2" çeldiricisi doğru "2 ve bir tekerlek"in
ön-eki) düzeltildi; fabrika fen bankasındaki 3 isabet meşru çeldirici + oyuna shipped değil.

---

*Bu doküman, Claude Code veya başka bir geliştiriciyle çalışmaya devam etmek için
yeterli bağlamı sağlar. Online moda geçişte Firebase config'i ekledikten sonra
yukarıdaki Faz 3 adımları izlenebilir.*
