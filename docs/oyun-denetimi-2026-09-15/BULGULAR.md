# Oyun Denetimi Bulguları — 15 Eyl 2026

Biçim: `[KRİTİK|YÜKSEK|ORTA|DÜŞÜK|ŞÜPHELİ] dosya:satır — sorun — senaryo — öneri`. K1 = statik inceleme, K2 = canlı oynanış (bilnetoyun.com, misafir modu). Plan: `plans/bilnetoyun-oyun-denetimi-2026-09-15.md`.

## Kategori 1 — Harfler & Kelimeler (15 Eyl gece)

### Sisteme özgü (tüm hub-native oyunları etkiler) — düzeltildi (js/engine.js)
- [YÜKSEK] js/engine.js:67-73 — Yıldız = doğru/toplam; yanlışta turu tekrar ettiren oyunlarda (harf-tanima, hece, matematik, desen…) her tur sonunda doğru sayısı toplam'a eşitleniyordu → **kaç hata olursa olsun 3 yıldız** ("Mükemmel!"). K2 kanıtı: harf-tanima 1 yanlış + 5 doğru → 3 yıldız. Düzeltme: doğru/(doğru+yanlış); customStars geçen oyunlar (hafiza, kod-macerasi, lego, penalti, satranc, zipla…) etkilenmez.
- [YÜKSEK] js/engine.js:11-33 — Oyun modüllerinin geciken setTimeout'ları (harf 600/800 ms, hece 400/800/1200 ms…) hub'a dönüp hemen başka oyun açınca **yeni oyunun** `#game-area`'sını siliyor ve `callbacks.onComplete/onWrong` ile yeni oyunun puanına yazıyordu (K1 harf-tanima, hece). Düzeltme: her startGame'de `#game-area` düğümü klonlanıp değiştirilir (eski zamanlayıcılar kopuk düğüme yazar) + callback'ler nesil sayacına bağlı (eski nesil → yok sayılır); destroy nesli ilerletir.
- [DÜŞÜK] 375 px dikeyde oyun paneli ekranın üst ~%55'i, alt yarı boş gökyüzü — Faz 2 B2'de ele alınacak, düzeltilmedi.
- [DÜŞÜK] Doğru/yanlış geri bildirimi yalnız renk (yeşil/kırmızı çerçeve), simge yok — renk körü çocuk için Faz 2 tasarım sözleşmesine not.
- [DÜŞÜK] iframe oyunlarında (yıldız vermeyen 27 oyun) araç çubuğunda 3 gri yıldız görünüyor ama hiç kazanılamıyor — Faz 2.

### 1. harf-tanima — K1 ✔ K2 ✔ (canlıda 1. seviye bitirildi, 2. seviye açıldı, 375 px taşma yok)
- [YÜKSEK→düzeltildi] js/games/harf-tanima.js:108-115,125 — destroy() bekleyen zamanlayıcıları iptal etmiyordu (yukarıdaki sistem bulgusu + modülde later()/clearTimeout).
- [ORTA→düzeltildi] js/games/harf-tanima.js:59-69 — Yanlış seçeneklerde emoji/kelime çakışması elenmiyordu (Elma🍎 ↔ Nar🍎 aynı turda iki kart aynı emoji). Düzeltme: çakışan seçenek atlanır, havuz bitene kadar sonraki harf denenir.
- [DÜŞÜK→düzeltildi] Aynı hedef harf art arda gelebiliyordu (K2: "O" iki tur üst üste). Düzeltme: lastLetter hariç tutulur.
- [DÜŞÜK] js/games/harf-tanima.js:36 — uygun harf yoksa sessiz return (bugünkü veriyle tetiklenmez) — bırakıldı.
- [ORTA, karar] Hedef "O" iken seçeneklerde Ö ile başlayan kelime (Ördek) çıkabiliyor; 4-6 yaş için görsel ayrım zor. Tasarım kararı — Faz 2'de benzer harfler (O/Ö, U/Ü, I/İ, C/Ç, S/Ş, G/Ğ) yanlış seçenek olarak elenebilir.

### 2. hece-birlestirme — K1 ✔ K2 ✔ (KRİTİK canlıda doğrulandı)
- [KRİTİK→düzeltildi] js/games/hece-birlestirme.js:181-189 — Yanlış cevaptan sonraki otomatik sıfırlama DOM'u temizliyor ama selected dizisini boşaltmıyordu → ikinci denemede 4., 5.… hece ekleniyor, uzunluk eşitliği bir daha tutmuyor, **tur "↺ Tekrar" düğmesine basılmadan bitirilemiyordu**. K2: 1. seviye "perşembe" yanlış sıra → 7 doğru deneme kabul edilmedi; ↺ Tekrar sonrası kabul edildi. Düzeltme: selected.length = 0.
- [YÜKSEK→düzeltildi] 400/800/1200 ms zamanlayıcılar destroy'da iptal edilmiyordu (kopuk DOM'da answerArea.classList TypeError → hub hata toast'ı). Düzeltme: later() + destroy'da clearTimeout.
- [DÜŞÜK/ŞÜPHELİ] css/games.css:868 — 420 px altında .hece-btn ~42 px yükseklik (44 px hedefin hafif altı) — bırakıldı, Faz 2.
- [ŞÜPHELİ, doğrulanmadı] Doğru heceler tıklandıktan sonraki 400 ms içinde kalan yanıltıcı heceye de tıklanırsa selected 4 olur → yanlış sayılabilir; canlıda denenmedi.

### 4. kelime-balonu (iframe) — K1 ✔ K2 ✔ (Etek turu: harf vuruşu ve slot dolumu çalışıyor)
- [ŞÜPHELİ] games/kelime-balonu/index.html:186,329-334 — Kısa/yatay ekranda (canvas 300 px'e sabitlenince) başlangıç dizilimi tehlike çizgisinin altında kalabilir → ilk kelimede "sınıra ulaştı". Gerçek tablet yatayda ölçülmeli; düzeltilmedi.
- [ORTA] :277-282 loadStats() .catch yok — storage reddederse rekor satırı boş kalır. Düzeltilmedi (düşük etki).
- [ORTA] :703-728 Süre dolarken parmak basılıysa G.aim.active sıfırlanmıyor → yeni turun ilk karesinde bayat nişan çizgisi (görsel). Düzeltilmedi.
- [DÜŞÜK] ⏸️ düğmesi ~24 px (44 px altı); :345 kelime havuzu yenilenince art arda aynı kelime olabilir; js/games/kelime-balonu.js:42 iframe click dinleyicisi ölü kod.
- [ORTA, UX] Hedef kelime İngilizce ("ear"), ekranda yalnız "👂 kulak" görünüyor; ilk oynayan çocuk K-U-L-A-K harflerini vurmaya çalışabilir. HUD'da "İngilizcesini vur" ipucu yok — Faz 2 metin kararı.
- [ŞÜPHELİ] K2'de oyun başladıktan sonraki ilk tıklamada "Mola!" (duraklatma) açıldı, Devam'dan sonra tekrarlamadı — otomasyon kaynaklı odak/blur olabilir; gerçek cihazda kontrol.

### 5. kelime-canavarlari (iframe) — K1 ✔ K2 ✔ (Hayvanlar beslemesi: 5 soru, doğru/yanlış sınıfları ve sonuç akışı çalışıyor)
- [ORTA] games/kelime-canavarlari/index.html:177-191,358-378 — Bir beslemede sorulan kelimeler izlenmiyor; 12 kelimelik kategoride 5 soruda tekrar olasılığı ~%60. Düzeltilmedi (oynanışı bozmaz).
- [ŞÜPHELİ] :379-388 answerQ tekrar-giriş kilidi yok; fitil tik'i ile çift dokunuş yarışırsa soru atlanabilir/melez iki kez eklenebilir. Canlıda üretilemedi.
- [DÜŞÜK] .monBtn ~31 px, .tab ~34 px (44 px altı); :299 vs :318 bebek adı iki sekmede farklı.

### 6. kelime-kurtarma (iframe) — K1 ✔ K2 ✔ (YÜKSEK canlıda doğrulandı)
- [KRİTİK→düzeltildi] games/kelime-kurtarma/index.html:285 — Kayıp sonrası 1,5 s'lik endScreen zamanlayıcısı iptal edilmiyordu: paraşüt inerken 🏠 → BAŞLA yapılırsa yeni tur sonuç ekranına kesiliyor, güncel skor "kaybettin" olarak gönderiliyordu. Düzeltme: loseTimer + newWord'de clearTimeout + state şartı.
- [YÜKSEK→düzeltildi] :322 — Fiziksel klavyede İngilizce kelimede küçük "i" toLocaleUpperCase('tr-TR') ile "İ" oluyor, ASCII "I" tuşuyla eşleşmiyordu → tuş sessizce çalışmıyordu. K2: Tırmanış "ev→house": keydown i etkisiz, keydown I etkili. Düzeltme: İngilizce kelimede toUpperCase + İ→I.
- [ORTA→düzeltildi] :253-254 — 320 ms içinde iki yanlış tahmin aynı son balonu işaretliyordu. Düzeltme: kalan balon sayısına göre indeks.
- [ORTA] :48 .key 375-414 px'te ~31-35 px (10-11 tuşlu satır 44 px'e sığmıyor) — Faz 2 klavye düzeni.
- [DÜŞÜK] :215-217 cols ölü kod. Bırakıldı.

### 7. gunluk-kelime (iframe) — K1 ✔ K2 ✔ (bugünkü kelime açıldı; kod okumasıyla doğrulandı)
- [KRİTİK→düzeltildi] games/gunluk-kelime/index.html:105-127 vs 208 — TR listesindeki 30 kelimenin 8'i 5 harf değildi (YILDIZ, TOPRAK, RÜZGAR, BAYRAK, DAKİKA, KIYMET = 6; DOST, OYUN = 4) ama ızgara sabit 5 sütun → **o günlerde kelime tüm okul için kazanılamıyordu** (8/30 gün). Düzeltme: GÜNEŞ, TARLA, KİRAZ, BALIK, ZAMAN, KÖPEK, ARMUT, TAVUK (anlam + örnek cümle ile); betikle doğrulandı: 30/30 beş harf, tekrar yok.
- [KRİTİK→düzeltildi] :184-194 — dayIndex() UTC günü, dayKey() yerel gün: TR'de 00:00-03:00 arası tahta sıfırlanıp aynı kelime yeniden kazanılıyor, seri ve puan iki kez yazılıyordu. Düzeltme: dayIndex yerel takvim gününden.
- [ORTA→düzeltildi] :176-180 — Puan kuyruğu bozuk JSON ise her kazanımda sessizce kayboluyordu. Düzeltme: parse hatasında kuyruk sıfırlanır.
- [DÜŞÜK] :39-40 .key 38 px genişlik (44 altı) — Faz 2.

## Kategori 2 — Sayılar & Matematik (15 Eyl gece)

### Sisteme özgü (K2'de yakalandı) — düzeltildi
- [KRİTİK→düzeltildi] js/particles.js:32-52 — Sparkle parçacığı ömrü bitince yarıçap `size*life` negatife düşüyor, `ctx.arc` **IndexSizeError** fırlatıyor: animasyon döngüsü ölüyor (`animId` dolu kaldığından bir daha **hiç parçacık çıkmıyor**) ve çocuğa "Bir şeyler ters gitti — sayfa çalışmaya devam ediyor." toast'ı gösteriliyordu. K2 kanıtı: konsolda 4× `Failed to execute 'arc' … radius provided (-0.0575) is negative` (harf-tanima/sayi-sayma doğru cevap kıvılcımlarından). Düzeltme: ömrü biten parçacık çizilmez + `Math.max(0, r)`. K2 (sekil-bulmaca, ilk doğru sürükleme): toast canlıda ekranda görüldü → her hub-native oyunun **ilk doğru cevabında** çocuğa hata mesajı çıkıyordu; KRİTİK.
- [DÜŞÜK] games/bilgi-madencisi/index.html:309 — her başlangıçta `sorular/math-tier1.json` isteği 404 (dosya yok, tasarım gereği yedek üretici devrede). Ağ gürültüsü; dosya eklenebilir ya da istek kaldırılabilir. Bırakıldı.
- [ŞÜPHELİ, otomasyon] kelime-balonu ve matematik-patlatma'da ilk etkileşimden sonra "Mola!" açıldı; tetikleyici yalnız `visibilitychange`/P/Esc/⏸️ (kod okundu) → tarayıcı panelinin görünürlük değişimi. Gerçek cihazda tekrarlanmazsa bulgu değil.

### 8. sayi-sayma — K1 ✔ K2 ✔ (5 tur bitirildi; 1 yanlış + 5 doğru → 3 yıldız = sistem bulgusu)
- [YÜKSEK→düzeltildi] js/games/sayi-sayma.js:86-108 — Doğru cevapta yalnız basılan buton kilitleniyordu; 600-800 ms geçiş penceresinde başka sayıya dokunmak haksız `onWrong` sayıyordu (deneme bazlı yıldızla artık düşürürdü). Düzeltme: doğru cevapta tüm `.number-btn` kilitlenir; yanlış tuş 500 ms kilitli.
- [ORTA→düzeltildi] :101,139 — zamanlayıcılar init/destroy'da iptal edilmiyordu. Düzeltme: `later()`.

### 9. matematik — K1 ✔ K2 ✔ (3 seviye × 5 soru; negatif/tekrar seçenek yok)
- [ORTA→düzeltildi] js/games/matematik.js:88-89,106-107 — Motor zaten `success/error` sesini çalıyor; modül aynı sesi ikinci kez çalıp üst üste bindiriyordu. Düzeltme: modül çağrıları kaldırıldı.
- [ORTA→düzeltildi] :97-124 — 1000/1500 ms tur geçişi zamanlayıcıları init/destroy'da iptal edilmiyordu. Düzeltme: `later()`.

### 10. desen — K1 ✔ K2 ✔ (3 seviye × 5 desen; periyot 2/3/4 doğru üretiliyor, seçenek tekrarı yok)
- [ORTA→düzeltildi] js/games/desen.js:89-90,109-110 — çift ses (matematik ile aynı). Düzeltildi.
- [ORTA→düzeltildi] :103-124 — zamanlayıcı temizliği. Düzeltildi.
- [DÜŞÜK, karar] Seçeneklerde benzer şekiller (🔷/💎, ♦️/🔴) yan yana; 4-6 yaş için ayrım zor — Faz 2 simge seti.

### 13. matematik-kafe (iframe) — K1 ✔ K2 ✔ (yanlış cevap aynı soruda kalıyor, doğru +76 puan ve sonraki müşteri)
- [DÜŞÜK] games/matematik-kafe/index.html:322-328 — numpad `keydown` dinleyicisinde preventDefault yok (Backspace geri gitme — modern tarayıcıda kapalı). Bırakıldı.
- [DÜŞÜK, düzen] Kısa yükseklikte (≈415 px) numpad'in alt satırı kesiliyor; tablet dikey/yatayda sorun yok. Faz 2.
- Hesap formülleri (indirim, KDV, para üstü, tarif) tam sayı üretiyor; XSS/i-İ bulgusu yok.

### 14. bilgi-yilani (iframe) — K1 ✔ K2 ✔ (yılan hareket ediyor, ok tuşları çalışıyor, sayfa kaymıyor)
- [YÜKSEK→düzeltildi] games/bilgi-yilani/index.html:266 — Kendine çarpma kontrolü kuyruk hücresini de sayıyordu; kuyruk o adımda boşalacağı hâlde oraya girmek "kendine çarptın" ile turu bitiriyordu (uzun yılanda dar manevralar haksız kayıp). Düzeltme: büyüme olmayacaksa kuyruk hariç gövde kontrol edilir.
- [ORTA] :199-206,480 — `resize` oyun sırasında ızgara boyutunu (20↔15) değiştirebiliyor; birkaç kare ekran dışı çizim, çökme yok. Bırakıldı.
- [DÜŞÜK] :207-212 aynı soru art arda gelebilir. [ŞÜPHELİ] :126-132 `numOpts` yedek döngüsü teorik sonsuz döngü.

### 15. ritim-sorulari (iframe) — K1 ✔ K2 ✔ (karolar düşüyor, doğru kolon tuşu +20 puan)
- [KRİTİK→düzeltildi] games/ritim-sorulari/index.html:336 — Son can kaybında `endRound('can')` dönerken `G.raf` sıfırlanmıyordu; "Tekrar Oyna"/"BAŞLA" `if (!G.raf)` koruması yüzünden döngüyü **bir daha kurmuyordu** → karo düşmeyen, sessizce 0 puanla biten donuk tur (hub'dan çıkıp girene kadar). Düzeltme: `G.raf=0`.
- [ORTA] :243-251 vs 320-341 — Soru değişince ekrandaki eski karolar temizlenmiyor; eski soruya göre etiketli karolar yeni soru altında düşmeye devam ediyor. Bırakıldı (tasarım kararı gerek: karoları silmek mi, geçiş animasyonu mu).
- [ŞÜPHELİ] :186-188/256 — 4 benzersiz şık bulunamazsa karoda "undefined" görünebilir (çok düşük olasılık).

### 16. kesir-2048 (iframe) — K1 ✔ K2 ✔ (4 yönde kaydırma, birleşme ve puan doğru; aynı taş bir hamlede iki kez birleşmiyor)
- [YÜKSEK→düzeltildi] games/kesir-2048/index.html:304,364-368 — Hamle sonrası 130 ms'lik taş üretme zamanlayıcısı saklanmıyordu; taş belirmeden "Geri Al"a basılınca geri alınmış tahtaya fazladan taş düşüyordu (undo tam geri almıyor). Düzeltme: `G.spawnT` saklanır; undo ve yeni oyun başında iptal edilir.
- [ORTA] :122-132 — Zirve modunda kesir etiketi her çizimde yeniden rastgele sadeleştiriliyor ("1/4" ↔ "2/8" resize'da değişebilir). Bırakıldı (denk kesir öğretisi için kararlı etiket önerilir).
- [ORTA] :283-285 — kalıcı `STATS.merges/tams` undo ile geri alınmıyor (arayüzde gösterilmiyor). [DÜŞÜK] Geri Al/🏠 çipleri ~24 px.

### 17. sayi-ninja (iframe) — K1 ✔ K2 ✔ (nesneler fırlıyor, kural metni "ÇİFT sayıları kes")
- [YÜKSEK→düzeltildi] games/sayi-ninja/index.html:374-380 — Kesme izi (`G.blade`) yeni vuruşta sıfırlanmıyordu; iki dokunuş arasındaki "hayalet" çizgi dokunulmayan sayıları kesiyordu. Düzeltme: pointerdown'da iz sıfırlanır.
- [ORTA] :144,272-277,382-391 — "ÇOKLU ×2!" etiketi ile gerçek bonus (düz `cutThisStroke×CUT_POINT`) uyuşmuyor; `MULTI_BONUS` kullanılmıyor. Bırakıldı.
- [DÜŞÜK] ⏸️ ~24 px.

### 11. bilgi-madencisi (iframe) — K1 ✔ K2 ✔ (kanca sallanıyor, tıklayınca fırlıyor; taşlar 3/10/7/4)
- [ORTA] games/bilgi-madencisi/index.html:403-426 — resize'da taş konumları yeniden hesaplanmıyor (tuval ölçüsü değişince taşlar eski pikselde). Bırakıldı.
- [ORTA] :51,122 — ⏸️ Mola ~22 px (44 px altı). Bırakıldı (Faz 2 HUD).
- [ŞÜPHELİ] :259-269 `fracOpts` 4 benzersiz seçenek bulamazsa dolgu yok → "undefined" taş (çok düşük olasılık).
- [DÜŞÜK] :309 `sorular/math-tier1.json` 404 (tasarım gereği yedek üretici). Bırakıldı.

### 12. matematik-patlatma (iframe) — K1 ✔ K2 ✔ (7×7 ızgara, sürükleme zinciri; "Toplamı 9 yapan zinciri kur")
- [YÜKSEK→düzeltildi] games/matematik-patlatma/index.html:288,719 — Oyun sürerken pencere 480 px eşiğini geçince (telefon döndürme) `layout()` `G.N`'i 6↔7 değiştiriyor ama `G.grid` yeniden kurulmuyordu → `tryExtend`/`applyGravity` `undefined` hatası, tahta donuyordu. Düzeltme: ızgara boyutu yalnız tur başında seçilir (turda sabit).
- [ORTA] :49,123 — ⏸️ Mola ~22 px. Bırakıldı.
- [ŞÜPHELİ] :401-402 `ensureSolvable` son çare `fillBoard` sonrası yeniden doğrulamıyor (çok düşük olasılık).

## Kategori 3 — Bulmaca & Mantık (15 Eyl gece)

### Önizleme doğrulaması (PR #34, kategori 1-2 düzeltmeleri)
- hece-birlestirme: 2 yanlış denemeden sonra doğru sıra ↺ Tekrar OLMADAN kabul edildi (Kelime 2/6) ✔
- harf-tanima: 1 yanlış + 5 doğru → **2 yıldız "Harika!"**, kayıt 2 ✔ (eskiden 3 "Mükemmel!")
- particles: 5 doğru cevap kıvılcımından sonra konsolda `radius provided … negative` yok, toast yok ✔

### 18. hafiza-kartlari — K2 ✔ (2×2: yanlış çift kapanıyor, çiftler eşleşiyor, 1 hata ile 3 yıldız — customStars, tasarım)
### 19. sekil-bulmaca — K2 ✔ (gerçek fare sürüklemesiyle yıldız yerine oturdu, doğru=1; ilk doğru bırakmada üretimde "Bir şeyler ters gitti" toast'ı = particles bulgusu)
### 20. siralama — K2 ✔ (yanlış sıra → yanlış+1 ve sıfırlama; doğru sıra → tur 2)
### 21. jigsaw — K2 ✔ / [YÜKSEK→düzeltildi] js/games/jigsaw.js:9-45 — "Resim" rastgele emoji ızgarası ama ekranda hiçbir referans yok; parçanın nereye gideceği bilinemez, oyun tamamen tahmin (4 parça için ortalama çok sayıda hata → deneme bazlı yıldızla 1 yıldız). Düzeltme: tahtanın üstünde "Örnek — aynısını yap" mini ızgarası (`.jig-ref`); çift ses kaldırıldı; `later()`.
### 22. tetris — K2 ✔ (dokunmatik düğmelerle sol/sağ/düşür çalıştı, puan 24)
### 23. bilim-dedektifi (iframe) — K2 ✔ (Orman vakası: yanlış nesne 5 sn donma, 5 omurgalı bulundu → mini quiz açıldı). [DÜŞÜK] vaka kartları `div` (klavye erişimi yok).
### 24. eslestirme-ustasi (iframe) — K2 ✔ (yanlış çift kapandı, 👟+shoe eşleşti 1/6)
### 25. labirent-avcisi (iframe) — K2 ✔ (ok tuşuyla hareket, harf hedefi HUD'da)

### Kategori 3 — K1 bulguları (ajanlar) ve düzeltmeler
- hafiza-kartlari: [YÜKSEK→düzeltildi] js/games/hafiza-kartlari.js:56-58 — kart boyutu sabit px; 375 px telefonda 5+ sütunlu seviyelerde (6-10) sağ kartlar .game-area overflow-x:hidden ardında kalıp tıklanamıyordu → seviye bitirilemezdi. Düzeltme: boyut ekran genişliğine göre (--card-size), CSS min 60 px kaldırıldı. [YÜKSEK→düzeltildi] :125-145 800 ms zamanlayıcı destroy'da iptal → later(). [DÜŞÜK] klavye erişimi yok (hub geneli).
- sekil-bulmaca: [YÜKSEK→düzeltildi] js/games/sekil-bulmaca.js:121-136 — dokun-dokun yolu yarımdı: parçaya dokunup silüete dokunmak hiçbir şey yapmıyordu (sürüklemeyen çocuk için seviye bitmiyordu). Düzeltme: silüet tıklaması seçili parçayı handleDrop'a verir; yanlışta titreşim. [ORTA] js/drag.js:6-9 tek activeElement — iki parmakla iki parça sürüklenirse biri asılı kalır. Bırakıldı (Faz 2 drag.js pointerId haritası). [DÜŞÜK] klavye yok.
- siralama: [YÜKSEK→düzeltildi] js/games/siralama.js:210,239 — 1200 ms tur geçişi destroy'da iptal edilmiyordu (aynı oyunu hemen yeniden açınca yeni turu siliyordu) → later(). [ORTA] :11,50 — 3. seviye "mixed" tipi uygulanmamış, 1. seviyeyle aynı havuz/yönerge (yalnız 5 öğe). Bırakıldı (içerik kararı). [DÜŞÜK] nextSlotIndex ölü kod.
- jigsaw: [YÜKSEK→düzeltildi] js/games/jigsaw.js:91-97 — dolu hücreye dokunmak "yanlış" sayılıyordu (16 parçayı hatasız yerleştiren çocuk tek sızma dokunuşla 2 yıldız). Düzeltme: target.placed → yok say.
- tetris: [YÜKSEK→düzeltildi] js/games/tetris.js:234-237 — klavyede basılı tutmada OS tekrar keydown'ları startMove'u yeniden başlatıp DAS/ARR'ı sıfırlıyordu (tepkisiz his). Düzeltme: !e.repeat. [ORTA] onComplete hiç çağrılmıyor → seviye noktası/yıldız sayacı tetris'i saymaz (sonsuz oyun; ürün kararı). [ORTA] js/mobile-utils.js:142 bindHoldButton her girişte document'e mouseup dinleyicisi bırakıyor (etkisi düşük). [ŞÜPHELİ] :434 450 ms game-over modalı izlenmiyor.
- bilim-dedektifi: [YÜKSEK→düzeltildi] games/bilim-dedektifi/index.html:345-381 — süre donma sırasında biterse #freezeVeil kalıcı kalıyor, "Tekrar Oyna"daki yeni vaka buz örtüsüyle kilitli açılıyordu. Düzeltme: startCase örtüyü kaldırır. [ORTA] .caseCard div, klavye yok. [DÜŞÜK] küçük nesneler (~24 px) + 5 sn ceza.
- eslestirme-ustasi: [YÜKSEK→düzeltildi] games/eslestirme-ustasi/index.html:229-261 — eşleşmeme zamanlayıcısı (750 ms) menüye dönüp yeni tur başlatılınca yeni turun G.open'ını sıfırlıyor, bir kart kalıcı açık/eşleşemez kalıyordu (tur bitirilemez). Düzeltme: tur jetonu (G.roundTok) + G.state şartı; usta önizlemesi de korumalı. [ORTA] :211 çoklu glif cevaplar küçültülmüyor, dar kartta taşabilir. [ŞÜPHELİ] .screen overflow:auto yok.
- labirent-avcisi: rAF/labirent bağlanabilirliği/dokunma temiz (3 harita BFS ile doğrulandı). [ORTA] .screen/#pauseVeil overflow:auto yok + touch-action:none (kısa ekranda düğmeye ulaşılamayabilir); ⏸️ ~24 px. [DÜŞÜK] kapsül harfle aynı hücreye düşebilir.

## Kategori 4 — Yaratıcılık (16 Eyl gece)
### 26. renk-eslestirme — K1 ✔ K2 ✔
- [YÜKSEK→düzeltildi] js/games/renk-eslestirme.js:13,90-93 — Kart üstündeki emoji karttan bağımsız rastgele seçiliyordu: "Yeşil nerede?" sorusunda yeşil kartta 🌸, sarı kartta 🔵, kırmızı kartta 🎈 (K2 ekran görüntüsü). Renk öğrenen 4 yaş için yanıltıcı. Düzeltme: renge göre emoji havuzu; 3. seviyede (metin modu) zemin beyaz, rengi yalnız nesne taşır. Ajan notu: ☂️/🎀 platforma göre belirsiz → 🔮/🦩 ile değiştirildi.
- [ORTA→düzeltildi] :118-133 — tur kazanılınca kalan kartlar kilitlenmiyordu (geçişte dokunuş haksız yanlış). Zamanlayıcılar later().
### 27. boyama — K1 ✔ K2 ✔ (Ev resmi 6 bölge boyandı)
- [YÜKSEK→düzeltildi] js/games/boyama.js:109-115,221-232 — Tamamlanan resimler yalnız bellekteydi, onComplete/Progress hiç yazılmıyordu: hub kartı 10 yıldız satırı hep boş, ✅ işaretleri yenilemede kayboluyordu. Düzeltme: resim i tamamlanınca Progress.setLevelStars('boyama', i+1, 3) + sayaç; galeri ✅'leri Progress'ten okunur.
- [ORTA→düzeltildi] :268-273 — ↩ geri al bölgeyi griye döndürünce sayaç düşmüyordu → gri bölge kalırken "tamamlandı". Düzeltme: placeholder renge dönüşte sayaç azalır.
### 28. tuval — K1 ✔ K2 ✔ (çapraz sürüklemede 3 ayrık hücre boyandı = boşluk bulgusu)
- [YÜKSEK→düzeltildi] js/games/tuval.js:82-92 — Boyama yalnız pointerenter ile; hızlı sürüklemede ara hücreler atlanıyor; dokunmatikte ilk hücrenin örtük pointer capture'ı yüzünden sürükleme hiç ilerlemiyor olabilir. Düzeltme: capture bırakılır, pointermove + elementFromPoint + Bresenham ara hücre doldurma.
- [YÜKSEK→düzeltildi] :55-60,138-142 — Aktif Lv düğmesine tekrar basmak ve Temizle tek dokunuşla çizimi geri dönüşsüz siliyordu. Düzeltme: aynı seviye yok sayılır; Temizle iki adımlı ("Emin misin? Tekrar bas", 3 sn).
- [ORTA] css/tuval.css:63-65 palet 32 px (44 altı). Bırakıldı (Faz 2).
### 29. sayilarla-boyama — K1 ✔ K2 ✔ (gerçek dokunuşla hücre boyandı; .click() bilerek çalışmıyor — pointer tabanlı)
- [YÜKSEK→düzeltildi] js/games/sayilarla-boyama.js:293-298 — bitişte onComplete 500 ms gecikmeliydi; bu pencerede "Ana Sayfa"ya basılırsa yıldız hiç yazılmıyordu. Düzeltme: hemen çağrılır.
- [ORTA] :296 yıldız eşiği hücre sayısına oranlanmıyor (Kalp 40 / Kelebek 89 aynı 2-6 hata toleransı). Bırakıldı (denge kararı). [ORTA] 375 px'te 11 sütunlu resimlerde hücre ~29 px. Faz 2.
### 30. emoji-yapici — K1 ✔ K2 ✔ (sekmeler, sürpriz, koleksiyon)
- [YÜKSEK→düzeltildi] js/games/emoji-yapici.js:220-430 — "Koleksiyonum" yalnız bellekteydi: Tekrar Oyna / hub / yenileme koleksiyonu siliyordu; silme yoktu. Düzeltme: emojiyapici_save localStorage (doğrulama + bozuk JSON koruması + 24 sınırı), Google girişinde bulut senkronu (auth.js GAME_SAVE_KEYS), her yüzde ✕ sil.
- [ORTA] css/emoji-yapici.css:35-46 sekmeler ~30 px (44 altı). Faz 2. [ŞÜPHELİ] değiştirmeden 4 kez "Ekle" de kutlamayı tetikliyor (kasıtlı basitlik olabilir).

## Kategori 5 — Strateji & Macera (16 Eyl gece)
- kod-macerasi: [YÜKSEK→düzeltildi] css/kod-macerasi.css:6-12 — .kod-grid-wrap .game-area dikey flex içinde büzülüp overflow:hidden ile alt satırları gizliyordu: K2'de 3×3 ızgaranın robot satırı görünmüyordu (wrap 81 px, robot hücresi 217-271 px). Düzeltme: flex-shrink:0 (alan kaydırılır).
- lego-macerasi: [KRİTİK→düzeltildi] js/app.js:113 — kayıt defteri yalnız JS yüklüyordu; stiller css/kod-macerasi.css içinde (.lego-*, .kod-*) → oyun tamamen stilsiz açılıyordu (ızgara yok, düz liste; K2 ekran görüntüsü). Tembel yükleme (A9b) regresyonu. Düzeltme: CSS dosyası files'a eklendi; betikle 30 hub-native oyun tarandı, başka eksik CSS bağımlılığı yok.
- lego-world: 3D sahne yüklendi (three.js CDN). [DÜŞÜK] ekranda kontrol ipucu yok. satranc: zorluk seçimi + hamle + AI yanıtı çalışıyor; [ORTA] taş görselleri upload.wikimedia.org'dan (gizlilik metninde beyan edilmiş; çevrimdışı/erişim riski; self-host + CC BY-SA atıf önerilir). zipla-topla, space-waves, egim, buz-kulesi, penalti (gol +1), zindan-okcusu (menü; sıfırlama confirm'li), bil-ve-fethet, bilgi-takimi, bilgi-ciftligi, bilgi-kulesi, cevap-kosusu, bilgi-savunmasi, fizik-firlatma: açıldı, menü/ilk etkileşim çalışıyor; K1 ajan sonuçları aşağıda.

- kod-macerasi / lego-macerasi (K1): [YÜKSEK→düzeltildi] js/games/kod-macerasi.js:182-210, js/games/lego-macerasi.js:396-476 — destroy bekleyen zamanlayıcıları (tur geçişi 1000 ms, hata sıfırlama 1500 ms, adım animasyonu 450 ms) iptal etmiyordu; hub'a dönüp hemen tekrar girince tur sessizce 2'ye atlıyor, bloklar/inşaat paneli sıfırlanıyor, yıldız yanlış hesaplanıyordu. Düzeltme: oturum jetonu (init/destroy ilerletir) — eski oturumun animasyon bitişi ve zamanlayıcıları yok sayılır. [ŞÜPHELİ] kod-macerasi-shared.js:322-331 REPEAT ilk blokta sessizce hiçbir şey yapmıyor (tasarım?). [DÜŞÜK] ↺ 40 px.
### Kategori 5 — K1 bulguları (ajanlar) ve düzeltmeler
- lego-world: [YÜKSEK→düzeltildi] js/games/lego-world.js:877-896 — destroy'da WebGL bağlamı bırakılmıyordu (`forceContextLoss` yok); hub↔oyun geçişlerinde bağlam birikip tarayıcı sınırında sessiz kararma. [YÜKSEK→düzeltildi] :200-238 — geç gelen player.glb callback'i yeni örneğin modelini eziyor / hub'a dönülmüşse TypeError. Düzeltme: oturum jetonu. [ORTA→düzeltildi] :424 çift 'success' sesi; :582-591 blur/visibilitychange'de tuşlar bırakılmıyor + ok/boşluk preventDefault yok (eklendi). [ORTA] css/lego-world.css:201 ≤480 px'te yön tuşları 42 px. [ŞÜPHELİ] calcStars "artakalan envanter" ile ters orantılı olabilir. [DÜŞÜK] ekranda kontrol ipucu yok.
- zipla-topla: [YÜKSEK→düzeltildi] js/games/zipla-topla.js:518,545-546,738 — modül ses/konfetiyi kendisi çalıp motor callback'i AYNI efekti tekrar çalıyordu (bölüm sonunda iki "ta-da", iki konfeti). Düzeltme: callbacks varsa yalnız motor; online'da modül. [ORTA] solo modda masaüstünde kontrol ipucu yok (banner yalnız coop/online). [ORTA] 2 kişide ölen oyuncu ışınlanınca kamera sıçrıyor. [ŞÜPHELİ] Seviye 6/12 platform mesafeleri canlıda doğrulanmalı.
- satranc: [YÜKSEK→düzeltildi] js/games/satranc-engine.js:92-114 — Stockfish 10 sn zaman aşımı isteğe bağlı değildi ve başarılı yanıtta iptal edilmiyordu: eski zaman aşımı sonraki hamlenin sözünü null'a çözüp yedek (zayıf) AI'yı sessizce devreye sokuyordu. Düzeltme: isteğe özgü zamanlayıcı + bestmove'da clearTimeout. [ORTA] taş <img>'lerinde onerror yok → wikimedia erişilemezse tahta boş (Unicode yedeği hiç tetiklenmiyor). [DÜŞÜK] 360-430 px'te hücre 35-43 px; terfi hep vezir.
- penalti: [YÜKSEK→düzeltildi] js/games/penalti.js:296-343 — atış animasyon zinciri (200/700/1200/500 ms) destroy'da iptal edilmiyordu; hub'da ses/konfeti sızıyordu → later(). [DÜŞÜK] seviye 9 (saveChance .80) 3 gol eşiği ~%6 olasılık — denge kararı.
- space-waves: [ORTA] onComplete hiç çağrılmıyor (sonsuz oyun deseni; tetris/sayi-ninja gibi — ürün kararı). [ORTA] :487-512 cevap sonrası 900 ms zamanlayıcı destroy'da iptal edilmiyor (yalnız ses sızar). Bırakıldı.
- egim: [ORTA] :376 game-over modal zamanlayıcısı destroy'da iptal edilmiyor (kopuk DOM'a yazıyor, görünür etki yok). [ORTA] js/mobile-utils.js:142 bindHoldButton her çağrıda document'e kalıcı mouseup dinleyicisi (egim/buz-kulesi/tetris — hub geneli, Faz 2).
- buz-kulesi: [YÜKSEK→düzeltildi] js/games/buz-kulesi.js:557-560 — "Hub'a Dön" ham App.showHub çağırıyordu: motor destroy/klavye dinleyicileri/mobil kaydırma kilidi atlanıyor, hub kaydırılamıyordu. Düzeltme: js/app.js `App.showHub` artık navigateToHub (tam temizlik) — altin-avi, harf-tahmin, kelime-tahmin, kod-macerasi-mp de aynı yoldan geçer.
- zindan-okcusu: [ORTA] :476-478 bozuk kayıt sessizce sıfırlanıyor (uyarı yok). [ŞÜPHELİ] :2487-2501 it.name/it.uid escape'siz innerHTML/onclick — bugün yalnız sabit üreteçlerden geliyor (self-XSS ötesi yok); savunma amaçlı kaçış önerilir. [ORTA] .mini 38 px düğmeler.
- bil-ve-fethet: [YÜKSEK→düzeltildi] games/bil-ve-fethet/index.html:1344-1362 — NPC karşı saldırısında kayıp fark/10 ile hesaplanıyor, NPC 8 yaparsa 0 doğruda toprağın %80'i gidiyordu (saldırı modu %50 ile sınırlı). Düzeltme: savunma kaybı da (5-n)/10 tablosu, en fazla %50. [ORTA] oyun bitince _tickT/_hudT/npcTimer temizlenmiyor. [ŞÜPHELİ] eski kayıtta S.npc[id] yoksa openTarget TypeError. [DÜŞÜK] ✕ ~22 px.
- bilgi-takimi: [YÜKSEK→düzeltildi] games/bilgi-takimi/index.html:513-523 — "sekme gizliyken süre akmaz" yorumu yanıltıcıydı: t0 sabit kalıyor, dönüşte soru anında yanlış sayılıyordu. Düzeltme: gizli geçen süre t0'a eklenir. Gün sınırı tek yerel dayKey ✔. [DÜŞÜK] .qBtn ~34 px.
- bilgi-kulesi: [YÜKSEK→düzeltildi] games/bilgi-kulesi/index.html:249-256 — aynı gizli-sekme hatası (35+ sn sonra dönüşte anında yanlış, günlük hak yanıyor). Düzeltme aynı. [ORTA] 🏠 onaysız çıkış deneme hakkını tüketiyor. [ŞÜPHELİ] Çift Hak süre dolumunu kapsamıyor.
- bilgi-ciftligi: [YÜKSEK, karar] :92-103 vs 443-460 — kurulum ekranındaki "zorluk büyüme süresini ve hasat değerini belirler" vaadi ekme akışına bağlı değil (tier yalnız soru zorluğu; z:4 soru yok; büyüme/hasat ekmede ayrıca seçiliyor). İçerik/tasarım kararı — metin kaldırılmalı ya da tier tohuma bağlanmalı. [ŞÜPHELİ] tek tohumda çift dokunuş sayaç -1.
- bilgi-savunmasi: [KRİTİK→düzeltildi] games/bilgi-savunmasi/index.html:429-458 — tur doğal bittiğinde (canavar bahçeye girdi / son dalga) `G.raf` sıfırlanmıyor; "Tekrar Savun"/"SAVUN" döngüyü bir daha kurmuyordu → canavar gelmeyen, kule ateş etmeyen donuk tahta (yalnız yenilemeyle kurtuluyordu). Düzeltme: endRound'da cancelAnimationFrame + G.raf=0. [ŞÜPHELİ] bossQLeft güncellenmiyor.
- cevap-kosusu: temiz (dt sınırı, şerit eşlemesi, raf yeniden başlatma). [DÜŞÜK] pointer capture/pointercancel yok; molada resize dinlenmiyor.
- fizik-firlatma: [ORTA] :428-454 sapan sürüklemesinde setPointerCapture/pointercancel yok (parmak dışarı çıkınca kuş gerili kalır; sonraki dokunuş düzeltir). [DÜŞÜK] :300-304 `support` ölü kod (yıldız yere inmiyor).
- kod-macerasi / lego-macerasi: yukarıda (oturum jetonu).
- Online K2 (iki sekme): kelime-tahmin — Test1 oda kurdu (kod YSRYG), Test2 "Lobiye Katıl" listesinden katıldı, iki taraf kelime yazdı, sıra Test1'e geçti ✔. Lobi takma adı serbest metin (A8b kararı, Faz 2 seçici).

