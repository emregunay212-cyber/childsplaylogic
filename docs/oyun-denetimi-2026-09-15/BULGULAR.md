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

