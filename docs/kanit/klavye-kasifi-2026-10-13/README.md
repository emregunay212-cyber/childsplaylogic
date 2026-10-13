# Klavye Kâşifi — kesintisiz akış kanıtı (13 Eki 2026)

Görüntüler Playwright (Chromium, `reducedMotion: reduce`, `page.clock` ile durdurulmuş zaman), yerel
`tests/static-server.js`; "Günlük giriş" tostu çekimden önce kaldırıldı. Taşma ölçümleri `olcumler.json`
(`tasma_y` = `#game-area` scrollHeight − clientHeight, `tasma_x` = sayfa yatay kaydırma) — hepsi 0.

| # | Görüntü | Gösterdiği |
|---|---|---|
| 01 | `01-harfler-orta-sira-yanan-tus-1366.png` | Bölüm 1/39, 5 sıralı TR Q ekran klavyesi (rakam satırı, `, ;` `. :`, iki Shift), yanan tuş |
| 02 | `02-heceler-1366.png` | Heceler kısmı (araç çubuğunda 2. nokta), harf kutuları + Boşluk |
| 03 | `03-kelimeler-1366.png` | Kelimeler kısmı |
| 04 | `04-cumleler-1366.png` | Cümleler (noktalamasız): yazılan mavi, sıradaki karakter (boşluk dahil) sarı |
| 05 | `05-bolum-seridi-dugmesiz-1366.png` | Bölüm sonu: düğmesiz şerit "Bölüm N tamam! Sıradaki: …" — 1,8 sn sonra kendiliğinden devam |
| 06 | `06-kisim-seridi-yildiz-1366.png` | Kısım sonu (Rakamlar → Noktalama): yıldızlar şeritte, kutlama katmanı AÇILMAZ |
| 07 | `07-noktalama-soru-shift-ipucu-1366.png` | `?` hedefi: iki Shift + `* ?` tuşu yanar; gizli resim balonu 🎁 (hedefle karışmasın) |
| 08 | `08-usta-paragrafi-1366.png` | Bölüm 39/39, üç cümlelik paragraf |
| 09 | `09-son-kisim-kutlama-katmani-1366.png` | Yalnız en sonda: kutlama katmanı (Sonraki Seviye yok) |
| 10 | `10-cumleler-360x640.png` | Dikey telefon |
| 11 | `11-en-uzun-paragraf-360x640.png` | En uzun içerik (102 karakter) dikey telefonda tek ekran |
| 12 | `12-en-uzun-paragraf-640x360-yatay.png` | En uzun içerik yatay telefonda tek ekran (alçak görünümde tuş 27 px) |
| 14 | `14-baslangic-secici-1366.png` | Başlangıç seçici: 6 kısım kartı + 39 bölüm numarası; ilk odak Harfler (Enter = baştan) |
| 15 | `15-baslangic-secici-360x640.png` | Seçici telefonda (2 sütun, son satır için kısa kaydırma; oyun alanı dikey kayar) |
| 13 | `13-kisim-seridi-360x640.png` | Kısım şeridi telefonda tam genişlik (inceleme bulgusu: `left: 50%` kendiliğinden genişliği yarıya indiriyordu → `width: max-content`) |

En uzun paragrafla ek ölçüm (taşma 0): 1366×650, 1280×600, 360×640, 320×568, 768×1024, 640×360.

## Süre bütçesi ("35 dakikalık ders")

39 bölüm, 372 tur, 4.523 vuruş (kelime sonu Boşluk dahil). Sabit gecikmeler (tur 1,15 sn, bölüm şeridi 1,8 sn,
kısım şeridi 2,8 sn) ≈ 8,6 dk. Hatasız ve okuma/arama payı sıfır **alt sınır**:

| Hız | Süre |
|---|---|
| 1,5 vuruş/sn (~18 kelime/dk) | ~59 dk |
| 2 vuruş/sn (~24 kelime/dk) | ~46 dk |
| 2,5 vuruş/sn (~30 kelime/dk) | ~39 dk |
| 3 vuruş/sn (~36 kelime/dk) | ~34 dk |
| 4 vuruş/sn (~48 kelime/dk, usta) | ~27 dk |

`tests/klavye-kasifi.spec.js` "35 dakikalık ders" testi 2,5 vuruş/sn > 35 dk ve 4 vuruş/sn < 35 dk koşulunu kilitler.

## Testler

- `npm run test:klavye` 8/8 (kaynak ağaç ve `SITE_ROOT=.build-check`). Mutasyon: kısım sonunda `onLevelUp` yerine
  eski `onComplete` çağrılınca "Harfler kısmı düğmesiz biter" testi kırmızı (katman kısım ortasında açıldı).
- `npm run test:smoke` + `test:dialog` + `test:hub-ia` 96/96 · `npm run lint` 0 hata · `catalog:check` OK ·
  `build:check` OK · `python seo/test_build_seo.py` 42/42.

## Kabul geçidi (kod incelemesi)

Bağımsız inceleme (durum makinesi, zamanlayıcı temizliği, `onLevelUp`, `resolveKey` ↔ TR Q kapağı, Shift, içerik, CSS):
yüksek güvenli hata yok. Düşük güvenli iki not: (1) telefonda şerit dar → düzeltildi (13); (2) son katmandaki
"Tekrar Oyna" yalnız son kısmı yeniden başlatıyordu → başlangıç seçici eklenince "Tekrar Oyna" seçiciyi açar.
