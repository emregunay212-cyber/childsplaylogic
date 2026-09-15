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

