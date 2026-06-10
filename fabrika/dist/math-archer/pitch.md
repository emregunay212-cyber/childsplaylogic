# Matematik Okçusu / Math Archer

8-12 yaş çocuklar için, oyun oynarken matematik öğreten roguelite okçu oyunu. Çarpım tablosu, dört işlem ve kesirler — sorular oyunun akışına ödül olarak işlenmiştir: oyuncu hiç durmaz, yanlış cevap asla cezalandırılmaz.

A roguelite archer that teaches math to ages 8-12 while they play. Multiplication, four operations and fractions — questions are woven into the flow as REWARDS: the player never stops, wrong answers are never punished.

**Gerçek bir okulda, sınıf ortamında öğrencilerle test edilmiş motor** (geliştirici öğretmendir, 80+ öğrenci).

## Eğitsel katman (3 mekanik)

1. **Sandık Sorusu** — bölüm sonunda eşya düşerken 15 saniyelik soru: doğru cevap eşyayı bir üst nadirliğe yükseltir + bonus altın; yanlış/süre dolması = normal eşya (oyun akışı bozulmaz).
2. **Soru Dalgası** — Sonsuz modda her 3. dalgada, sahne modunda her odada bir kez: ekranın üstünde soru, 4 zararsız taşıyıcı düşmanın üstünde şıklar. Doğru şık vurulursa geçici güç (+%30 hasar) + altın; yanlışta bonus yok, ceza yok.
3. **Konu Seçimi** — ana ekranda Çarpım / Dört İşlem / Kesirler / Karışık; yalnız soru havuzunu filtreler, oynanışı değiştirmez.

Zorluk eğrisi otomatik: dalga 1-10 → kolay, 11-25 → orta, 26+ → zor (sahne modunda bölüme göre).

## Lisans
- Non-exclusive, branding opsiyonu var — $400-800 (eğitsel içerik + derin meta-ilerleme nedeniyle üst bant)
- TR ve EN ayrı dosyalar; soru bankaları dil başına 446 doğrulanmış soru

## Teknik
| | |
|---|---|
| Dosya | `matematik-okcusu-tr.html` / `math-archer-en.html` — tek dosya |
| Boyut | 534 KB (sprite'lar + 446 soru gömülü) |
| Çevrimdışı | Evet — harici istek sıfır |
| Platform | Mobil (joystick + **ikinci parmakla nişan**) + masaüstü (WASD + **fareyle nişan**); nişan alınmazsa otomatik atış |
| Diller | TR + EN (sorular dahil) |
| SDK | GameMonetize-tarzı soketler hazır, SDK'sız sessiz çalışır |
| İçerik | 4 bölüm + Sonsuz mod, 10+ düşman, 3 boss, ekipman/yetenek ağacı meta-ilerlemesi |

## Notlar
- Aynı motor + farklı soru bankası = yeni ürün ("Kelime Okçusu", "Science Blaster") — ders değiştirmek dosya değiştirmektir.
- Soru bankası şeması açık JSON; alıcı kendi sorularını kolayca ekleyebilir.
