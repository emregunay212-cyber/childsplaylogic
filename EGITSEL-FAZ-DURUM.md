# 🎓 Eğitsel Oyun Serisi — Faz Durum Takibi

> Ana tasarım dokümanı: [EGITSEL-OYUN-PLANI.md](EGITSEL-OYUN-PLANI.md) (21 oyun, mekanikler, standartlar, Bridge API).
> Bu dosya yalnızca DURUM takibi içindir — mekanik kararlar ana dokümanda, değiştirilmez.
>
> **Çalışma kuralı (ana doküman §8.1):** Her oyun ayrı oturumda geliştirilir.
> **Kilit politikası (onaylı):** Eğitsel seri oyunları KİLİTSİZ yayınlanır (lock-catalog'a girilmez);
> mevcut eğlence oyunlarının yıldız merdiveni aynen korunur.
>
> Son güncelleme: 2026-06-13

## Durum Lejantı
⬜ Bekliyor · 🔨 Geliştiriliyor · ✅ Canlıda · 🧊 Uzak ufuk (planlı, tarih yok)

---

## FAZ 0 — Hazır Oyun Entegrasyonları (plan dışı gelen tamamlanmış oyunlar)

| No | İş | Durum | Oturum | Not |
|---|---|---|---|---|
| F0.1 | **Bil ve Fethet** entegrasyonu | ✅ | 2026-06-13 | Google Fonts CDN kaldırıldı (sistem fontu); visibilitychange otomatik duraklatma; `bilfethet_save`/`bilfethet_stats` kayıt + "Devam Et"; kaynak pipeline `games/bil-ve-fethet/kaynak/` (index.html elle DÜZENLENMEZ — `python build.py`); kategori: Strateji & Macera |
| F0.2 | **Kelime Madeni 3D** uygunlaştırma + entegrasyon | ✅ | 2026-06-13 | Three.js r128 YEREL (`games/kelime-madeni-3d/three.min.js` — tek-dosya standardına gerekçeli istisna: niyet CDN/internet bağımlılığını yasaklamak, aynı klasörden ikinci dosya kabul); dünya kaydı RLE+base64 (~60KB) + "Devam Et/Yeni Dünya"; 10. görevde skor özeti overlay; `kelimemadeni_save`/`kelimemadeni_stats`; kategori: Harfler & Kelimeler |
| F0.3 | Bil ve Fethet dokunmatik pan/zoom iyileştirme | ⬜ | — | Çalışıyor ama optimize değil (pointer event'e geçiş) — düşük öncelik |
| F0.4 | Bil ve Fethet ONLINE mod (oyunun kendi Faz 3-4'ü) | 🧊 | — | Firebase lobi + eşzamanlı düello + Voronoi ülke bölme + başkent koruması — bkz. `games/bil-ve-fethet/CLAUDE.md` §8, `PROJE-DURUM.md` |
| F0.5 | Kelime Madeni kendi Faz 1-3 kalanları | 🧊 | — | Kelime bankasını JSON'dan yükleme (1.221'lik banka + ünite seçimi), ses ayarları, gece/gündüz, öğretmen paneli — bkz. `games/kelime-madeni-3d/CLAUDE.md` §4 |
| F0.6 | Kelime Madeni zayıf okul PC performans testi | ⬜ | — | Gerçek donanımda test edilmeden okul geneline duyurulmamalı; gerekirse "düşük grafik" toggle'ı |

---

## FAZ 1 — Hızlı Kazanımlar (ana doküman §7 Faz 1)

| No | Oyun | İlham | Efor | Durum | Oturum | Not |
|---|---|---|---|---|---|---|
| 4.1 | **Bilgi Madencisi** 💎⛏️ | Gold Miner | ⭐ | ✅ | 2026-06-13 | "Altın Madencisi" kaynak kodu repoda YOK (doğrulandı) → SIFIRDAN yazıldı (kullanıcı onayı); §4.1 parametreleri aynen (tier×50, combo ×2 max, 5 doğruda dinamit, 60sn); FALLBACK 24 soru fabrika bankasından + prosedürel üretici; Bridge skor kuyruğu (`bilnet_score_queue`); kategori: Sayılar & Matematik |
| 4.2 | **Matematik Patlatma** 🧨 | Diamond Dash | ⭐⭐ | ✅ | 2026-06-13 | §4.2 aynen: 7×7 (mobil 6×6), zincir puanı taş²×10, hedef her 3 patlatmada yenilenir, tier hedefleri (Etek toplam 5-10 / Yamaç 10-20 / Tırmanış +fark / Zirve çarpım); çözümsüzlük kontrolü: hedef yeniden çekme → karıştırma → yeniden doldurma; hedefe TAM ulaşınca otomatik patlama, geri alma destekli sürükleme; `matpatlatma_stats` + Bridge kuyruğu; kategori: Sayılar & Matematik |
| 4.3 | **Kelime Balonu** 🎈 | Bubble Safari | ⭐⭐ | ✅ | 2026-06-13 | §4.3 aynen: kelime puanı uzunluk×30×tier, Etek/Yamaç sıra serbest, Tırmanış+ SIRALI, Zirve resimsiz (sadece TR); hex grid (8/7 offset) + duvar sekmeli fırlatma + nişan önizleme; doğru harf flood-pop + tavandan kopanlar düşer, yanlış vuruş yapışır (çeldirici harf — gereken harf verilmez); çözülebilirlik: gereken harf kümede yoksa çeldirici yeniden etiketlenir; 110+ kelimelik EN-TR-emoji banka gömülü; 120sn tur + taşma sınırı; `kelimebalonu_stats`; kategori: Harfler & Kelimeler. NOT: TR eş-anlam modu sonraki iyileştirme |
| M1 | **Meta katman v1** | — | ⭐⭐ | ✅ | 2026-06-13 | `js/bilnet-meta.js`: jeton=floor(skor/100) GÜNLÜK TAVAN 50 ✓, günlük giriş +5 + seri bonusları (3/5/7 gün → +10/+15/+25, kırılınca suçlayıcı dil yok) ✓, hub'da 💎 çipi + eğitsel profil paneli (kişisel rekorlar/istatistikler) ✓. **MİMARİ KARARI:** Firestore yerine İSTEMCİ-TARAFI + mevcut gameSaves RTDB senkronu (yeni kural/deploy gerektirmez, fire-and-forget ilkesine uygun); oyunlar `bilnet_score_queue`'ya yazıyor, meta tüketiyor. Sınıf ligi/turnuva (v2) RTDB sunucu yazımı + database.rules.json güncellemesi isteyecek — sabah kararına bırakıldı |

---

## FAZ 2 — İçerik Derinliği

| No | Oyun | İlham | Efor | Durum | Not |
|---|---|---|---|---|---|
| 4.6 | **Bilgi Takımı** ⚔️ | Mafia Wars (sosyalsiz) | ⭐⭐ | ✅ 2026-06-13 | §4.6 aynen: günlük enerji 20, görevler hızlı(3s/1⚡)/normal(5s/2⚡)/destan(10s/3⚡), her 5 görevde karakter, bonus max +%25 (sadece çarpan), aylık 30 görevlik sezon kitabı; 96 soruluk gömülü karma banka (fabrika mat+tr+fen) + EN prosedürel; `bilgitakimi_save/stats`; kategori: Strateji & Macera |
| 4.5 | **Matematik Kafe** ☕ | Cafe World | ⭐⭐ | ✅ 2026-06-13 | §4.5 aynen: vardiya 120sn, sabır Etek 30/diğer 20sn, doğru=50p+kalan sabır×2 bahşiş; tier problemleri (fiyat okuma → para üstü → tarif/% indirim → KDV %1+kampanya kıyası); **Numpad MODÜLER bileşen** (mount/clear API — diğer oyunlara kopyalanabilir); müşteri state machine, sabrı bitince üzülmeden çıkar; `matkafe_stats`; kategori: Sayılar & Matematik |
| M2 | **Meta katman v2 — rozetler** | — | ⭐⭐ | ✅ 2026-06-13 | §3.3 rozet kataloğu bilnet-meta.js'te: İlk Adım, Seri Ustası(7g), Matematik Kâşifi(1000p), Kelime Avcısı(100), Genç Bilimci(F3'te aktifleşir), Zirve Fatihi, Keskin Nişancı(%100/10+), Koleksiyoncu(5 oyun), Sezon Kahramanı; panelde rozet vitrini. **Sınıf ligi + haftalık turnuva ERTELENDİ**: RTDB sunucu yazımı + database.rules.json + sınıf kodu kayıt akışı gerektirir — sabah kararı (rules deploy riski gece alınmadı) |

## FAZ 3 — Amiral Gemileri

| No | Oyun | İlham | Efor | Durum | Not |
|---|---|---|---|---|---|
| 4.4 | **Bilim Dedektifi** 🔍 | Criminal Case | ⭐⭐⭐ | ✅ 2026-06-13 | §4.4 aynen: 90sn vaka, nesne 100p + süre bonusu, yanlış tık 5sn DONMA (puan kaybı yok), 1 ipucu (2sn parlama), 3 soruluk mini quiz → 1-3⭐ (3⭐ = tüm nesneler + quiz %100); 8 gömülü sahne (orman/mutfak/geri dönüşüm/uzay/vücut/deniz/hava/elektrik, tier etiketli) — Python generator yerine elle hazırlandı, yeni sahne = SCENES dizisine ekleme; `bilimdedektifi_stats.cases` → Genç Bilimci rozeti; kategori: Bulmaca & Mantık |
| 4.7 | **Bilgi Çiftliği** 🌱 | FarmVille | ⭐⭐⭐ | ✅ 2026-06-13 | §4.7 aynen: 10 soruluk paket → doğru başına 1 tohum (ders=tohum türü), GERÇEK zamanla büyüme 30dk/2sa/8sa/24sa, solma YOK ('hasada hazır bekler'), arazi 3×3→Sv3 4×4→Sv6 5×5; NOT: server timestamp yerine cihaz saati + anti-hile (gelecek tarihli dikim şimdiye çekilir) — tam sunucu doğrulaması lig altyapısıyla gelecek; kategori: Strateji & Macera |
| 4.8 | **Kelime Canavarları** 🐉 | Dragon City | ⭐⭐ | ✅ 2026-06-13 | §4.8 aynen: yumurta 10 doğru, evrim 25/60/120 (kategori sayacı), FUSION = 2 tam evrim + 20 soruluk karışık quiz %80+, 10sn/4 şık quiz; 6 kategori × 3 evrim + 6 melez = 24'lük koleksiyon defteri, nadirlik renkleri (common/rare/epic/legendary — Zindan DNA'sı); kategori: Harfler & Kelimeler |

## FAZ 4 — İkinci Dalga: Hızlı Çoğaltma (her biri ~1 oturum)

| No | Oyun | İlham | Durum | Not |
|---|---|---|---|---|
| 4.11 | **Eşleştirme Ustası** 🃏 | Memory | ✅ 2026-06-13 | §4.11 aynen: İLİŞKİLİ çiftler (7×8↔56, cat↔🐱, Buharlaşma↔💧→☁️), 3 deste (EN/mat/fen), 4×3→6×5+120sn, 3⭐=çift×1.5 hamle, 50p/çift+hamle bonusu, usta modu 3sn ön gösterim; rotateY flip; kategori: Bulmaca & Mantık |
| 4.12 | **Kelime Kurtarma** 🎈 | Adam Asmaca (yumuşatılmış) | ✅ 2026-06-13 | §4.12 aynen: asılan adam YOK — balon demetli karakter, kayıpta PARAŞÜT; balon 8/6/5/4, puan harf×20+balon×15, 1 harf jokeri, ipucu baştan açık; t1-2 TR resimli, t3 EN spelling, t4 deyim tamamlama; TR/EN klavye + fiziksel klavye; kategori: Harfler & Kelimeler |
| 4.13 | **Bilgi Yılanı** 🐍 | Snake | ✅ 2026-06-13 | §4.13 aynen: 20×20 (mobil 15×15), cevaplı yemler (t1 2→t3+ 4), doğru=30p×uzunluk çarpanı, yanlış=-2 boğum (1'de tur biter), duvar Etek geçirgen/Tırmanış+ ölümcül, hız +%10/5 doğru, yem spawn kuralı (gövde+kafa önü 3 hücre yasak); kategori: Sayılar & Matematik |
| 4.9 | **Ritim Soruları** 🎹 | Piano Tiles | ✅ 2026-06-13 | §4.9 aynen: 4 sütun, hız 2→5 karo/sn (10 doğruda artar), 20p×combo (max ×3), Etek cezasız / Yamaç kaçırma combo bozar / Tırmanış+ 3 can, Zirve kesir-yüzde karolar; doğru basışlar PENTATONİK melodi; 75sn tur; kategori: Sayılar & Matematik |
| 4.10 | **Kesir 2048** 🔢 | 2048 | ✅ 2026-06-13 | §4.10 aynen: 4×4, Etek 2-4-8 / Yamaç 5-10-20 / Tırmanış 1/8→1 TAM zinciri / Zirve DENK kesir gösterimleri (2/8'in 1/4'le birleştiği keşfedilir), birleşme=değer×10 + TAM bonusu, 3 geri al; PASTA modeli her taşta (conic-gradient — kesir görselleşir); kategori: Sayılar & Matematik |

## FAZ 5 — İkinci Dalga: Bağlılık Motorları

| No | Oyun | İlham | Durum | Not |
|---|---|---|---|---|
| 4.15 | **Günlük Kelime** 🟩 | Wordle | ✅ 2026-06-13 | §4.15 aynen: günde 1 kelime — TARİH BAZLI SEED (tüm okul aynı kelime, sunucu yok), TR 5 harf + EN 4 harf ayrı bulmacalar, 6 deneme, puan (7−deneme)×50 günde 1 kez, çözünce ANLAM + örnek cümle (eğitsel kapanış), ardışık gün serisi + deneme dağılımı grafiği; paylaşım butonu YOK; NOT: 'sınıf istatistiği' lig altyapısıyla; kelime listesi `TR_WORDS/EN_WORDS` — İngilizce zümresi ünite kelimeleri buraya eklenebilir; kategori: Harfler & Kelimeler |
| 4.14 | **Sayı Ninja** 🥷 | Fruit Ninja | ✅ 2026-06-13 | §4.14 aynen: 75sn, fırlatma 1.5→3/sn, doğru kesim 25p×combo (max ×4), tek harekette 3+ doğru = ×2 bonus, çeldirici bulut 3sn sallanma (yumuşak); KURAL MOTORU (üretici+doğrulayıcı çifti): t1 çift/tek/büyük, t2 katlar, t3 asal/kare/işlem sonucu, t4 kesir karşılaştırma; bıçak izi sönen polyline, parabolik fizik; kategori: Sayılar & Matematik |
| 4.18 | **Bilgi Kulesi** 🏰 | Kim Milyoner | ✅ 2026-06-13 | §4.18 aynen: 12 soru (3+3+3+3 tier), katlar 50→102400 (×2), güvenli kat 4 ve 8, 30sn/soru, günde 3 deneme, ÇEKİL stratejisi; jokerler: Yarı Yarıya + Çift Hak + 'Sınıfa Sor' yerine BİLGE BAYKUŞ (%70 isabet — sınıf agregasyonu lig altyapısı isteyecek, FAZ notu); kule görseli kat kat yükselir; kategori: Strateji & Macera |
| 4.17 | **Labirent Avcısı** 👻 | Pac-Man | ✅ 2026-06-13 | §4.17 aynen: 15×17 grid × 3 harita rotasyonu, harf×40p, bölüm=3 kelime, yanlış harf sırayı sıfırlar (harfler yeniden serpilir), UNUTKANLIK BULUTU değince 3sn ters kontrol (komik, korkutmaz), kapsül 5sn dondurur, bulut AI rastgele+%30 yönelme (A* yok), Zirve'de sahte harfler; swipe + ok tuşları; kategori: Bulmaca & Mantık |

## FAZ 6 — İkinci Dalga: Büyük Yapımlar

| No | Oyun | İlham | Durum | Not |
|---|---|---|---|---|
| 4.21 | **Cevap Koşusu** 🏃 | Temple Run | ✅ 2026-06-13 | §4.21 aynen: 3 şerit, pseudo-3D perspektif SIFIRDAN (NEON DRIFT yoktu), yol ayrımı 15sn→10sn, doğru×150 + jeton×5 + mesafe, yanlış=5sn çamur (ölüm yok), engeller kütük(zıpla)/kaya(şerit)/dal(kay), hız 10→20 m/sn, tema orman→bulut→UZAY, 4 yön swipe; kategori: Strateji & Macera |
| 4.19 | **Bilgi Savunması** 🌻 | Plants vs Zombies | ✅ 2026-06-13 | §4.19 aynen: 5 şerit (mobil dikey 4), kuleler Fıstıkçı 50/Çifte 100/Duvar 75/Bombacı 150, enerji = hızlı soru paneli (25/doğru, 10sn yenilenir), kuleye ulaşan canavar SORUSUYLA manuel yok edilebilir (son şans — bilgi hep kazandırır), dalgalar t1:3→t4:7+BOSS(3 soru); kategori: Strateji & Macera |
| 4.20 | **Fizik Fırlatma** 🎯 | Angry Birds | ✅ 2026-06-13 | §4.20 aynen: ÇİFTE eğitsel katman — mermi mini soruyla kazanılır + açı/kuvvet SAYISAL ekranda + bölüm sonu 'en verimli açın' raporu; 12 el yapımı bölüm (JSON dizilim), 2 AY bölümü (g×0.38 — kavramsal altın madeni), yörünge öngörüsü ilk 6 bölümde açık, hp'li kutu yıkımı (rigid body yok), yıldız=kalan mermi; kategori: Strateji & Macera |

---

## Entegrasyon Kalıbı (her oyun için aynı — F0.1/F0.2'de doğrulandı)

1. `games/<slug>/index.html` — tek dosya oyun (+ varsa yardımcı dosyalar/kaynak pipeline)
2. `js/games/<slug>.js` — iframe wrapper (zindan-okcusu.js kalıbı)
3. `index.html` — `<link>` css + `<script>` tag (+ değişen dosyaların cache-bust artışı)
4. `js/app.js` → `gameCategories` ilgili kategori (+ `js/i18n.js` ad + yönerge)
5. `css/main.css` renk değişkeni + `css/hub.css` kart şeridi + `css/<slug>.css` iframe stili
6. `assets/images/hub/<slug>.svg` ikon
7. `js/auth.js` → `GAME_SAVE_KEYS`'e kayıt anahtarları (bulut senkron)
8. `seo/build_seo.py` GAMES girdisi + `TODAY` güncelle + `python seo/build_seo.py`

**Kayıt anahtarı standardı:** `<oyunkisaadi>_save` + `<oyunkisaadi>_stats` — meta katman v1 stats anahtarlarını okuyacak.

## Açık Teknik Kararlar (meta katman v1 oturumunda)

- [ ] Backend: ana doküman Firestore şeması (§6.2) ↔ portal RTDB gerçeği → Bridge `sendToBackend` RTDB'ye uyarlanacak
- [ ] Soru bankası dönüştürücü: ana doküman §2 şeması ↔ `fabrika/soru-bankasi/soru-bankasi-{matematik,kelime,fen}.json` şeması (Python)
- [ ] Günlük jeton tavanı (50) ve skor doğrulama (rate limit + tutarlılık) — §3.1, §6.3

## Bakım Notları (kullanıcı geri bildirimi düzeltmeleri)

**2026-06-13 — Bil ve Fethet ülke seçimi (masaüstü) düzeltildi.**
Kök neden: pan/zoom kodundaki `svg.setPointerCapture` sentetik `click`'i SVG'ye yeniden
hedefliyordu → path'lerdeki `click` dinleyicileri HİÇ tetiklenmiyordu (başlangıç seçimi VE
oyun içi saldırı tıklaması bozuktu, dokunmatikte de). Çözüm: path-başına `click` kaldırıldı;
seçim `pointerup` tap algılamasına taşındı (hareket eşiği + pinch koruması). İkinci tuzak:
ülke ID'leri STRING ("076" — baştaki sıfır anlamlı), sayıya çevirme `attackableIds().has()`
ve `S.own` anahtarlarını bozuyor. KAYNAK kural geçerli: yalnız `kaynak/` düzenlenir + `python build.py`.
Doğrulama: preview'da tam akış (seçim→fetih→NPC savunması→oransal transfer) oynandı. `?v=2`.

**2026-06-13 — Kelime Madeni 3D v2.2: inşa parçaları (ev kurma).**
Kapı/cam/çatı(2 çeşit)/yarım blok/kum + 6 tarif + 3 görev + 14 slot hotbar.
Ayrıntı: `games/kelime-madeni-3d/CLAUDE.md` v2.2 bölümü. Node duman testi repoda:
`node games/kelime-madeni-3d/test_sim.js` (58 iddia). `?v=2`.

> ⚠️ Bu iki işin KODU, eşzamanlı çalışan başka bir oturumun `git add -A` süpürmesiyle
> `22f4498`(faz2)–`ccd4196`(faz4) commitlerinin içine karıştı — commit mesajları bu işleri
> anlatmaz; içerik doğrulandı ve sağlamdır. Ders: AYNI repoda iki oturum paralel çalışmamalı.
