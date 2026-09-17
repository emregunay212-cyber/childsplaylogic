# Balon Labirenti — kanıt klasörü (17 Eylül 2026)

Yakalama: Playwright (chromium, headless) + `tests/static-server.js` (`--port 8790`), misafir tohumu ve sahte
Firebase (canlı RTDB'ye dokunulmadı). Görüntüler 17 Eyl 17:58'de, cila + inceleme + güvenlik düzeltmelerinden SONRAKİ
HEAD üzerinde yeniden yakalandı (Reality Checker: ilk set cila öncesiydi). Betik scratchpad'de tutuldu, depoya eklenmedi (Klavye Kâşifi kanıtıyla
aynı yaklaşım). Ölçümler `olcumler.json`.

## 1. Görüntüler

| Dosya | Ne gösteriyor |
|---|---|
| `01-hub-kart-1366.png` | Hub'da kart: 1-2. Sınıf rafı, Strateji şeridi, yeni ikon (kova + 3 balon + dikenli top) |
| `02-b1-1-baslangic-1366.png` | Bölüm 1 · 1/5 Tek Kova; HUD ortasında ipucu metni ("Topu geri çek, kovaya at!") |
| `03-b1-1-nisan-1366.png` | Nişan: lastik bant, önizleme noktaları, okuma **açı 55° · kuvvet 82** |
| `04-b1-1-ucus-1366.png` | Uçuş: dikenli top + iz |
| `05-b1-1-temiz-1366.png` | "Temiz!" tostu, kıvılcımlar, sayaç 0 balon |
| `06-b1-2-baslangic-1366.png` | 900 ms sonra 2/5 Uzak Kova kendiliğinden yüklendi |
| `07-iska-tost-1366.png` | Boşluğa atış → "Iskaladın, tekrar dene" (yanlış rengi, beyaz cam) |
| `08-ipucu-yayi-1366.png` | İkinci ıska → çözüm yolunun ilk 0,5 s'si yeşil noktalı hayalet yay |
| `09-klavye-nisan-1366.png` | Klavye nişanı: ok + önizleme + okuma; kanvas odak halkası |
| `10-bolum-sonu-3yildiz-1366.png` | 5 labirent temizlendi → motor kutlama penceresi, "3 üzerinden 3 yıldız" |
| `11-b4-1-kayan-kapak-1366.png` | Bölüm 4 · Kayan Kapak: hareketli platform, noktalı ray, nişanda beklemede |
| `12-b5-1-sicak-hava-1366.png` | Bölüm 5 · Sıcak Hava: çukur + turuncu kesikli sıcak hava sütunu |
| `13-b5-1-yukselis-1366.png` | Sıcak havada yükselen top (uçuş ortası) |
| `14-b1-1-375x812-dikey.png` | Dikey telefon: sahne 90° döner, HUD sahneyle döner; kayıtlı çözüm çekişi döndürülmüş eşlemeyle temizledi |
| `15-b1-1-812x375-yatay.png` | Yatay telefon: oran 1,60 korunur, taşma yok |
| `16-azaltilmis-hareket-ucus-1366.png` | `prefers-reduced-motion`: iz, sarsıntı, salınım ve halka yok |
| `17-landing-oyunlar-balon-labirenti.png` | `/oyunlar/balon-labirenti/` üretilmiş landing (canonical, imza bandı) |

## 2. Ölçümler (`olcumler.json`)

| Ölçüm | Değer | Eşik |
|---|---|---|
| Kart rafları | `sinif-1-2`, `sinif-3-4`, `sinif-5-6` | yaş 7-12 → üç raf ✓ |
| Okuma metni | `açı 55° · kuvvet 82` (cozum b1-1 = 55/82) | eşleme birebir ✓ |
| Skor: 1 temiz → `{correct:1, wrong:0, total:5}`; 2 ıska → `{correct:1, wrong:2}`; bölüm sonu `{correct:5, wrong:0}` | | motor callback'leri ✓ |
| Bölüm sonu yıldız | "3 üzerinden 3 yıldız" (0 ıska) | ≤1 ıska → 3 ✓ |
| Sonraki Seviye | `data-bolum = 2` | destroy + init ✓ |
| Yeniden düğmesi | 90×52 px | ≥ 52 (`--hedef-min`) ✓ |
| HUD hap metni | `rgb(31,58,77)` üzeri `rgba(255,255,255,.85)`, Fredoka | mürekkep/beyaz 11,86:1 ✓ |
| Yeniden | beyaz / `#17739F` (`--mavi-800`) | 8,37:1 ✓ |
| Hap etiketi / ipucu | `--murekkep-orta` beyazda 6,34:1 | ≥ 4,5 ✓ |
| Tost "Iskaladın" | `--yanlis` beyazda 5,44:1 | ≥ 4,5 ✓ |
| Tost "Temiz!" | `--dogru` beyazda 4,17:1 (24 px kalın = büyük metin) | ≥ 3:1 ✓ |
| Son balon habı | zemin `--dogru-zemin` (#DFF5E7), metin mürekkep | 10,36:1 ✓ (metin rengiyle değil zeminle işaretlenir) |
| Hub gidiş-dönüş ×3 | kapalı: `.bl-wrap` 0, `rafAktif false`; açık: 1 wrap, 1 canvas, `rafAktif true` | sızıntı yok ✓ |
| 2 s uçuşta rAF | 122 kare | ≥ 100 ✓ (headless) |
| Dikey 375×812 | wrap 375×600, `scrollWidth = clientWidth = 375`, çözüm temizledi | yatay taşma yok ✓ |
| Yatay 812×375 | wrap 459×287, oran 1,60, `#game-area` taşma yok | oran korunur ✓ |
| Landing | title "Balon Labirenti Oyna – Ücretsiz Oyun \| Bilnet Oyun" (≤60), description ≤150, canonical `/oyunlar/balon-labirenti/`, imza bandı var | ✓ |

Komut sonuçları (17 Eyl): `npm run lint` 0 hata (48 önceden var olan uyarı, yeni dosyalarda 0) · `npm run catalog:check` OK ·
`npm run build:check` OK · `python seo/build_seo.py` title 60/60, desc 146/150 · `python seo/test_build_seo.py` 42/42 ·
`npm run test:balon` 6/6 (Node statik sunucu ve `SITE_ROOT=.build-check` hash'li çıktı) · `npm run test:smoke` 62/62 ·
`node tools/balon-labirenti-coz.js --check` 30/30 OK (3×3 tolerans 9/9).

## 3. Bulgular (yakalama sırasında görülüp kapatılanlar)

1. Çekilen top kanvas dışına çıkıyordu (fırlatma noktası sol altta, tam çekiş köşeyi aşıyor) → çizim konumu kanvas
   içinde kırpılır; fizik yalnız vektöre bakar.
2. "Yeniden" düğmesi sağ altta Uzak Kova'nın duvarını örtüyordu → okuma ve düğme HUD satırına taşındı (üst; sahne örtülmez).
3. Yatay telefonda (812×375) `flex-shrink` sahneyi 796×313'e eziyordu → `flex: 0 0 auto` + yükseklik bütçeli genişlik.
4. Son balon habı `--dogru` metniyle 4,17:1 (AA altı) → zemin `--dogru-zemin`, metin mürekkep.
5. Yerel `python server.py` ile Playwright canlı testleri kararsızdı (istek kuyruğu) → testler Node statik sunucuyla koşar (CI ile aynı); README'de not.
6. Aynı karede patlayan iki balon tek "pop" sesi (16 ms eşik) → test eşitlik yerine 1 ≤ pop ≤ balon sayısı (çift dinleyici yine yakalanır).

## 4. Doğrulanan vaatler

- Tek atış / tüm balonlar → temiz; kalan varsa aynı labirent (700 ms) ✓ (03-08)
- Açı/kuvvet gösterge ne yazıyorsa simülasyon o sayılarla koşar ✓ (`data-atis` = okuma; tarayıcı çözümüyle temiz)
- 30 labirent × 9 tolerans varyantı deterministik fizikte çözülür ✓ (`test:balon`, `coz.js --check`)
- Hub seviyesi = bölüm; 5 temiz → `onComplete(3)` ✓ (10)
- Hareketli platform nişanda faz 0'da bekler, atışla başlar ✓ (11; fizik `platformAt(p, shot.t)`)
- Sıcak hava sütunu yükseltir ✓ (12-13)
- Klavye: ok tuşları + Enter, `aria-live` duyuru ✓ (09; `test:balon` klavye testi)
- Hub'a dönüş temiz, yeniden açılışta tek sahne ✓ (ölçüm hubGidisDonus ×3)
- Dikey/yatay telefon ✓ (14-15) · azaltılmış hareket ✓ (16) · landing ✓ (17)

## 5. Dürüst değerlendirme

- Görüntüler headless Chromium'dan; gerçek dokunmatik cihazda çekiş hissi (parmak altında kalan top) test edilmedi.
- Kutlama penceresinden sonra motorun konfetisi bir sonraki bölüme akıyor (motor davranışı, Klavye Kâşifi'nde de not edilmişti).
- Dikey telefonda HUD metinleri sahneyle birlikte 90° döner (Eğim kalıbı; kabul edilen risk).
- Bölüm 2-6 labirentleri yalnız simülasyonla (tarayıcı 9/9 + 25'lik dayanıklılık) doğrulandı; elle oynanan bölümler 1, 4-1, 5-3.
  Zorluk hissi (özellikle b3-3 Langırt 19/25, b6-4 19/25) gerçek çocuklarla test edilmedi.
- Claude Browser paneli sekme etkinleştirirken kanvasa hayalet sürükleme gönderdi (panel eseri); kanıt bu yüzden Playwright ile alındı.
