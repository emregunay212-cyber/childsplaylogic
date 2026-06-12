# BİL VE FETHET — Dünya Bilgi Fetih Oyunu
## CLAUDE.md — Proje Handoff Dokümanı

> Bu doküman, Triviador/Bil ve Fethet tarzı, gerçek dünya haritası üzerinde oynanan
> bilgi-tabanlı fetih oyununun tam tasarım ve geliştirme rehberidir.
> Tüm mekanik kararlar oyun tasarımcısı (Emre) tarafından onaylanmıştır — değiştirme, uygula.

---

## 1. OYUN ÖZETİ

İki mod içeren, soru-cevap ile toprak fethedilen strateji oyunu:

| | ONLINE MOD | BİREYSEL MOD |
|---|---|---|
| Oyuncu | 2–8 oyuncu, lobi tabanlı | 1 oyuncu |
| Harita | Gerçek dünya, tüm ülkeler | Gerçek dünya, tüm ülkeler |
| Kazanma | Süre dolduğunda en çok toprak | Tüm dünyayı fethetmek |
| Kaybetme | Yok — başkent asla kaybedilmez | Tüm topraklar kaybedilirse GAME OVER |
| Süre | Lobi kuran belirler | Süresiz |

---

## 2. HARİTA SİSTEMİ

### 2.1 Veri Kaynağı
- **Natural Earth** GeoJSON (admin-0 ülke sınırları, ~195 ülke)
- Render: SVG (zoom/pan destekli), tek HTML dosyasında inline veya ayrı JSON
- Performans için TopoJSON + simplify (mapshaper ile %5–10 detay) önerilir

### 2.2 Komşuluk Grafiği
- Her ülkenin kara komşuları önceden hesaplanıp `neighbors.json` olarak gömülür
- Ada ülkeleri için "deniz komşuluğu": belirli mesafe içindeki en yakın 1–3 ülke komşu sayılır (örn. İngiltere–Fransa, Japonya–G.Kore). Hiçbir ülke izole kalmamalı.
- **Saldırı kuralı: sadece komşu ülkeye/parçaya saldırılabilir.**

### 2.3 Ülke Bölünmesi (Online)
- Aynı ülkeyi N oyuncu seçerse ülke **N eşit alana** bölünür
- Yöntem: ülke poligonu içinde N tohum noktası ile **Voronoi parçalama**, alanlar eşitlenene kadar tohumlar Lloyd relaxation ile dengelenir
- Her oyuncuya **rastgele** bir parça verilir
- Bölünmüş ülke içindeki parçalar birbirine komşudur → aynı ülkenin oyuncuları birbirini fethedebilir

### 2.4 Başkent (Sadece Online)
- Her oyuncunun **başlangıç parçasının merkez bölgesi** onun başkentidir
- Başkent **asla fethedilemez** → oyuncu oyundan çıkmadıkça her zaman diriliş alanı vardır
- Bireysel modda başkent koruması YOKTUR — her şey kaybedilebilir

---

## 3. ŞEHİR SAYISI VE GELİR SİSTEMİ

### 3.1 Şehir Sayısı Verisi
- Temel: her ülkenin **resmi idari bölge sayısı** (Türkiye = 81 il vb.)
- **Eyalet sistemli ülkeler için oran kuralı:** eyalet sayısı doğrudan kullanılmaz;
  her eyalete ülkenin büyüklüğü/nüfusuna göre belirli sayıda şehir atanır.
  - Örnek: ABD 50 eyalet → eyalet başına ~3 şehir → 150 şehir
  - Almanya 16 eyalet → eyalet başına ~3 → 48 şehir
  - Rusya, Çin, Hindistan, Brezilya gibi devler benzer çarpanla ölçeklenir
- Sonuç tek bir statik `cities.json` dosyası: `{ "TR": 81, "DE": 48, "US": 150, ... }`
- Hedef aralık: en küçük ülke ~3–5 şehir, en büyük ~150–200 şehir

### 3.2 Gelir
- Altın geliri **sahip olunan şehir sayısına** orantılıdır
- Formül: `gelir/tick = TABAN + (şehir_sayısı × KATSAYI)`
- Tick aralığı: 10 sn (ayarlanabilir sabit)
- Bölünmüş ülkede her parça, ülkenin şehirlerinden alan oranında pay alır

---

## 4. SAVAŞ SİSTEMİ

### 4.1 Savaş Kilidi (Kural 1)
- Saldıran ve savunan, savaş sırasında **başka hiçbir savaşa giremez**
- Sahipsiz ülkeye saldırırken de kilit geçerli: o sırada başkası sana saldıramaz
- Savaş bitince kilit kalkar

### 4.2 Soru Düellosu (Oyuncu vs Oyuncu)
1. Saldıran, komşu bir hedef seçer → savunana bildirim gider
2. İki tarafa da **eşzamanlı 10 soru** gelir
3. Her soru **süre sınırlıdır** (lobi kuran ayarlar, önerilen 10–30 sn); süre dolarsa yanlış sayılır
4. Soru zorlukları:
   - Savunanın gördüğü soruların zorluğu = **saldıranın saldırı seviyesi**
   - Saldıranın gördüğü soruların zorluğu = **savunanın savunma seviyesi**

### 4.3 Oransal Toprak Transferi
```
fark = saldıran_doğru − savunan_doğru
fark > 0  → savunan, toprağının (fark/10)'unu saldırana kaptırır
fark < 0  → saldıran, toprağının (|fark|/10)'unu savunana kaptırır
fark = 0  → berabere, toprak değişmez
```
- Tek savaşta asla tüm ülke el değiştirmez; fetih kademelidir
- Transfer edilen alan, iki taraf arasındaki **sınırdan başlayarak** kesilir (bitişiklik korunur)
- Online'da savunanın başkent bölgesi transfer hesabına dahil edilmez

### 4.4 Sahipsiz Ülkeye Saldırı (Online + Bireysel, aynı mantık)
- Tek taraflı: sadece saldıran oyuncu 10 soru cevaplar
- Soru zorluğu = hedef ülkenin **savunma seviyesi**
- **NİHAİ SONUÇ TABLOSU** (kazanç hedef ülkeden, kayıp oyuncunun kendi toprağından):
  | Doğru | Sonuç |
  |---|---|
  | 10 | Hedefin 10/10'u fethedilir |
  | 9 | Hedefin 9/10'u |
  | 8 | 8/10 |
  | 7 | 7/10 |
  | 6 | 6/10 |
  | 5 | Berabere |
  | 4 | Kendi toprağının 1/10'u kaybedilir |
  | 3 | 2/10 kaybedilir |
  | 2 | 3/10 |
  | 1 | 4/10 |
  | 0 | 5/10 |

---

## 5. SAHİPSİZ ÜLKELER (NPC SİSTEMİ)

- Yapay zeka YOK; sadece önceden atanmış seviyeler var
- Oyun başında her sahipsiz ülkeye **ayrı ayrı rastgele**:
  - Saldırı seviyesi (1–4)
  - Savunma seviyesi (1–4)
  - İkisi farklı olabilir (güçlü saldırı + zayıf savunma mümkün)
- **Denge kuralı:** bir oyuncunun seçtiği ülkenin komşularının TAMAMI en yüksek seviye olamaz; seviyeler orantılı dağıtılır (örn. komşuların en az %50'si seviye 1–2 olmalı)
- **Zaman ölçeklemesi:** oyun ilerledikçe sahipsiz ülkelerin savunma seviyesi kademeli artar (örn. her 5 dakikada +1, max 4). Erken fetih avantajlıdır.

### 5.1 NPC Karşı Saldırısı (Sadece Bireysel Mod)
- Tetik koşulu: `komşu_ülke.saldırı_seviyesi == oyuncu.savunma_seviyesi`
- Oyuncu o anda savaşta DEĞİLSE, rastgele aralıklarla (örn. 60–180 sn) o ülke saldırır
- Çözüm: oyuncu savunan olarak 10 soru cevaplar (zorluk = NPC saldırı seviyesi);
  NPC'nin "doğru sayısı" seviyesine göre simüle edilir (örn. seviye başına beklenen doğru: L1=4, L2=5, L3=6, L4=7, ±1 rastgele)
- Oransal transfer aynı tabloyla uygulanır — NPC kazanırsa oyuncu toprak kaybeder, oyuncu kazanırsa NPC ülkesinden toprak alır

---

## 6. GELİŞTİRME SİSTEMİ

### 6.1 Kademeler
4 seviye, hem saldırı hem savunma için ayrı yükseltilir:

| Seviye | Ad | Soru Zorluğu (kademe içi) |
|---|---|---|
| 1 | Etek | Çok kolay |
| 2 | Yamaç | Kolay-orta |
| 3 | Tırmanış | Orta-zor |
| 4 | Zirve | En zor |

### 6.2 Maliyet Dengesi (KRİTİK TASARIM KURALI)
- **Hiçbir ülke seçimi, oyunun ilk dakikalarında max seviyeye ulaştıramaz**
- Yükseltme maliyeti, seçilen ülkenin **şehir sayısına orantılı ölçeklenir**:
  - Az şehirli ülke → düşük gelir → İLK yükseltmeler ucuz (oynanabilir kalsın)
  - Çok şehirli ülke → yüksek gelir → yükseltmeler pahalı
- Formül önerisi: `maliyet(seviye) = TABAN × seviye³ × (0.5 + şehir_sayısı/100)`
- Hedef denge: hangi ülke seçilirse seçilsin **Zirve seviyesine ulaşmak minimum ~12–15 dakika** birikim gerektirsin; Etek→Yamaç ilk 2–3 dakikada mümkün olsun
- Sabitleri playtest ile ayarla; `config.js` içinde tüm denge sabitleri tek yerde dursun

---

## 7. SORU SİSTEMİ

### 7.1 Kademe (Lobi Ayarı)
Lobi kuran, oyuncu kitlesinin eğitim kademesini seçer:
`Anaokulu | İlkokul (1-4) | Ortaokul (5-8) | Lise`

- Tüm zorluk seviyeleri (Etek→Zirve) **seçilen kademe İÇİNDE** ölçeklenir
- Anaokulu lobisinde "Zirve" = anaokulu için en zor soru, lise sorusu ASLA çıkmaz

### 7.2 Soru Bankası
- Format: JSON — `{ id, kademe, zorluk(1-4), kategori, soru, secenekler[4], dogru_index }`
- Başlangıç: mevcut 1.221 soruluk eğitim bankası kademe+zorluk etiketiyle dönüştürülür
- Genişletme: Python generator (mevcut araçlar uyarlanır)
- Hedef: kademe başına min. 400 soru (4 zorluk × 100)
- Aynı savaşta soru tekrarı engellenir; oturum bazlı kullanılan-soru takibi

### 7.3 Eşzamanlılık (Online)
- İki oyuncuya aynı sorular, aynı anda, sunucu zaman damgasıyla gönderilir
- Cevap + cevap süresi sunucuya yazılır; süre aşımı = yanlış
- Anti-hile: doğru cevap index'i istemciye savaş bitene kadar gönderilmez (Faz 4)

---

## 8. ONLINE MİMARİ

### 8.1 Lobi Akışı
1. Kurucu lobi açar → ayarlar: **kademe, oyun süresi (10/20/30 dk), soru süresi (10–30 sn), max oyuncu (2–8)**
2. Lobi kodu ile katılım
3. Ülke seçim ekranı: dünya haritasından ülke seç; aynı ülkeyi seçenler görünür
4. Kurucu "Başlat" → ülke bölme hesaplanır, NPC seviyeleri atanır, oyun başlar

### 8.2 Teknoloji
- **Backend: Firebase Realtime Database** (lobi durumu, oyun state, savaş senkronu)
  - Emre'nin mevcut Firebase deneyimi var; ileride Supabase migrasyonu opsiyonel
- State modeli:
```
/lobbies/{lobbyId}: { settings, players{}, status }
/games/{gameId}:
  /territories: { countryId|parcelId: { owner, area, cities } }
  /players: { uid: { gold, attackLvl, defenseLvl, capitalId, inBattle } }
  /battles/{battleId}: { attacker, defender, questions[], answers{}, status }
  /npcLevels: { countryId: { atk, def } }
  /clock: { startedAt, durationMin }
```
- Savaş kilidi: `inBattle` flag'i transaction ile set edilir (race condition'a dikkat)
- Gelir tick'i: istemci hesaplar + sunucu doğrular (basit), veya Cloud Function (ileri)

### 8.3 Oyun Sonu
- Süre dolunca: toprak alanı (km² değil — **parça/şehir sayısı** üzerinden skorlama; skor = sahip olunan şehir sayısı) en yüksek oyuncu kazanır
- Skor tablosu + tekrar oyna

---

## 9. BİREYSEL MOD AKIŞI

1. Kademe seç → ülke seç → oyun başlar
2. Harita üzerinde komşu ülkelere saldır (10 soru sistemi)
3. NPC karşı saldırıları rastgele gelir (Bölüm 5.1)
4. Gelir birikir → saldırı/savunma geliştirilir
5. **Kazanma:** dünyadaki tüm topraklar fethedilince
6. **Kaybetme:** oyuncunun hiç toprağı kalmazsa GAME OVER (başkent koruması yok)
7. Sahipsiz ülkeler zamanla zorlaşır (Bölüm 5 zaman ölçeklemesi)

---

## 10. GELİŞTİRME FAZLARI

### Faz 1 — Bireysel MVP (tek HTML dosyası)
- [ ] Dünya haritası render (GeoJSON→SVG, zoom/pan)
- [ ] Komşuluk grafiği + cities.json üretimi (Python script)
- [ ] Ülke seçimi, fetih (10 soru + oransal tablo)
- [ ] Soru bankası entegrasyonu (kademe + 4 zorluk)
- [ ] Altın geliri + 4 kademeli geliştirme + maliyet formülü
- [ ] NPC seviyeleri + denge kuralı + zaman ölçeklemesi
- [ ] Game over / dünya fethi ekranları

### Faz 2 — Derinlik
- [ ] NPC karşı saldırı sistemi
- [ ] Voronoi ülke bölme motoru (online hazırlığı)
- [ ] Toprak transferinde sınırdan kesme algoritması
- [ ] Ses, animasyon, savaş ekranı cilası

### Faz 3 — Online
- [ ] Firebase lobi sistemi (kod ile katılım, ayarlar)
- [ ] Ülke seçim ekranı + bölünme
- [ ] Eşzamanlı 10 soru düellosu + savaş kilidi (transaction)
- [ ] Başkent koruması, gelir senkronu, süre/skor sistemi

### Faz 4 — Cila & Güvenlik
- [ ] Anti-hile (cevapların geç gönderimi, sunucu doğrulama)
- [ ] Bağlantı kopması/yeniden katılım
- [ ] Mobil uyum (dokunmatik harita)
- [ ] Denge playtest'i ve config ayarı

---

## 11. DOSYA YAPISI (HEDEF)

```
bil-ve-fethet/
├── CLAUDE.md                # bu doküman
├── index.html               # Faz 1: tek dosya bireysel oyun
├── data/
│   ├── world.topo.json      # sadeleştirilmiş harita
│   ├── neighbors.json       # komşuluk grafiği
│   ├── cities.json          # ülke→şehir sayısı
│   └── questions/           # kademe bazlı soru bankaları
│       ├── anaokulu.json
│       ├── ilkokul.json
│       ├── ortaokul.json
│       └── lise.json
├── tools/
│   ├── build_map.py         # Natural Earth → topo + neighbors + cities
│   └── question_gen.py      # soru bankası dönüştürücü/üretici
└── config.js                # TÜM denge sabitleri tek yerde
```

---

## 12. ONAYLANMIŞ KURALLAR ÖZETİ (DEĞİŞTİRİLEMEZ)

1. Sadece komşuya saldırılır; saldıran+savunan savaş kilidindedir (sahipsiz hedefte de)
2. PvP: eşzamanlı 10 soru, süre sınırlı, cevapsız=yanlış, fark/10 oransal transfer
3. Saldırı seviyesi rakibin soru zorluğunu, savunma seviyesi saldıranın soru zorluğunu belirler
4. Zorluk her zaman lobi kademesi İÇİNDE ölçeklenir
5. Gelir = şehir sayısı bazlı; eyaletli ülkelerde eyalet başına oranlı şehir ataması
6. Online'da başkent (başlangıç parça merkezi) fethedilemez; bireyselde her şey kaybedilebilir
7. Sahipsiz ülkelerin saldırı/savunma seviyeleri ayrı ve rastgele; komşuların hepsi en zor olamaz; zamanla zorlaşırlar
8. Bireyselde dengi NPC komşu (NPC saldırı == oyuncu savunma) rastgele aralıklarla saldırır
9. Geliştirme 4 kademe (Etek/Yamaç/Tırmanış/Zirve); hiçbir senaryoda ilk dakikalarda max'lanamaz; maliyet şehir sayısıyla ölçeklenir
10. Online kazanan: süre sonunda en çok şehir; bireysel kazanan: tüm dünya
