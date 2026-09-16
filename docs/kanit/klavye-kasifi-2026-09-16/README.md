# Klavye Kâşifi — görsel kanıt koşusu (2026-09-16)

Ajan: **testing-evidence-collector** (EvidenceQA). Dal `feat/klavye-kasifi`. İki tur:
- **Tur 1 (öncesi)** — commit `4c1e501`: 12 istenen + 7 ek görüntü, 14 bulgu.
- **Tur 2 (düzeltme sonrası)** — commit `9c65579`: bulgu 1, 3, 4, 5, 6, 7, 11, 13 için kod değişti → yalnız ilgili
  kareler **aynı dosya adlarıyla** yeniden çekildi (🔁 işaretli), 2 yeni kare eklendi (13 + ek-ucus). Diğer kareler
  Tur 1'den kalır.

Ortam: worktree kökü `http://localhost:8765` (tests/static-server.js), Playwright 1.63.0 / Chromium headless,
`reducedMotion: 'no-preference'`, `locale: tr-TR`. Giriş: her bağlamda `.login-guest` ("Misafir Olarak Oyna") gerçekten
tıklandı; oyun hub kartından (01→02, 06a/07) ya da `/?oyun=klavye-kasifi` derin bağlantısıyla açıldı. Her kareden önce
≥700 ms beklendi. Tur 2'de 5 harfli kelime için koordinatör izniyle `GameEngine.startGame(KlavyeKasifi, 3)` ile Seviye 3
yeniden başlatıldı (deneme sayısı her satırda). Betikler depoya eklenmedi (%TEMP%). Oyun kodu **değiştirilmedi**.
Ham ölçümler: [`olcumler.json`](olcumler.json) (tur 1), [`olcumler-ek.json`](olcumler-ek.json) (tur 1 ek),
[`olcumler-sonrasi.json`](olcumler-sonrasi.json) (tur 2), [`olcumler-ucus.json`](olcumler-ucus.json) (tur 2, balon solması).
Her iki turda **0 `pageerror`, 0 `console.error`**.

Tasarım belgesi §6 vaadi (docs/klavye-kasifi-tasarim-2026-09-15.md): "Üstte kâşif defteri, ortada tek büyük harf kartı ile
'?' balonu, altta tam klavye — yanan tek tuş gözü hemen çeker. **Kaydırma yok; 360×640 ve 1366×768'de tek ekran.**"
ve "Doğru basışta resim balondan çıkar ve deftere **uçar** (FLIP); yanlışta tuş sallanır, hedef tuş nefes alır."

## 1. Görüntüler (12 istenen + 9 ek; 🔁 = 9c65579 ile yeniden çekildi)

| # | Dosya | Alındığı durum |
|---|---|---|
| 1 | [01-hub-kart-1366.png](01-hub-kart-1366.png) | Hub, misafir girişi sonrası; "Harfler & Kelimeler" bölümünde Klavye Kâşifi kartı ortaya kaydırıldı (kart 190×213 px, şerit `#3A86FF`, ikon SVG yüklü) |
| 2 | [02-seviye1-baslangic-1366.png](02-seviye1-baslangic-1366.png) | Seviye 1 açılış, kurulumdan 700 ms sonra: harf «Ü», Ü tuşu sarı, 6 boş yuva |
| 3 | [03-seviye1-dogru-1366.png](03-seviye1-dogru-1366.png) | Doğru ekran tuşu tıklamasından **262–386 ms** sonra: balon 🍇, altyazı "Üzüm", tuş yeşil, kıvılcım noktaları |
| 4 | [04-seviye1-ucus-1366.png](04-seviye1-ucus-1366.png) | Doğru basıştan **655–800 ms** sonra: `.kk-flyer` DOM'da (transform `translate(-201px,-150px) scale(.477)`), 🍇 balon ile defter arasında havada |
| 5 | [05-seviye1-yanlis-1366.png](05-seviye1-yanlis-1366.png) | Yanlış tuş «F» tıklamasından **128–291 ms** sonra: F kırmızı (wiggle), hedef «Ç» sarı, kart nudge |
| 6 | [06-seviye1-bitis-1366.png](06-seviye1-bitis-1366.png) | 6 tur (1 yanlış) sonrası `#level-complete` göründükten 700 ms sonra: "Mükemmel!", 3 yıldız, konfeti; dolu defter arkada (bulanık, %50 karartma) |
| 6a 🔁 | [06a-seviye1-defter-dolu-1366.png](06a-seviye1-defter-dolu-1366.png) | **EK** — 6. doğru basıştan 1271 ms sonra, katman öncesi: defter 6/6, **6 farklı emoji** (✈️ 🥕 🦓 🐄 🚀 🏞️; harfler U H Z İ R I). Tur 1'de 🍬 iki kez çıkmıştı |
| 6b | [06b-seviye2-baslangic-1366.png](06b-seviye2-baslangic-1366.png) | **EK** — Seviye 2 açılış: tuş yanmıyor (`is-target`/`is-hint` yok), 8 yuva; önceki kutlamanın konfetisi hâlâ düşüyor |
| 6c | [06c-seviye2-ipucu-5sn-1366.png](06c-seviye2-ipucu-5sn-1366.png) | **EK** — Seviye 2'de 5,4 sn boşta: hedef «Ğ» tuşu `is-hint` ile nefes alıyor |
| 7 🔁 | [07-seviye3-kelime-1366.png](07-seviye3-kelime-1366.png) | Seviye 3 açılış (L1+L2 oynanarak, konfeti geçsin diye 3 sn sonra): ROKET kutuları, R `is-current`; bekleyen harfler artık koyu gri `#5F6B73` (5,47:1), kenar `#8C9BAD`; yönerge "Harfleri sırayla yaz, sonra Boşluk!" |
| 8 | [08-seviye3-bosluk-1366.png](08-seviye3-bosluk-1366.png) | G-Ü-N-E-Ş sırayla tıklandı, son harften 700 ms sonra: 5 kutu mavi, **Boşluk sarı**, yönerge "Şimdi Boşluk tuşuna bas!" (ardından fiziksel Space → ☀️ "Güneş" doğrulandı) |
| 9 | [09-seviye1-375.png](09-seviye1-375.png) | 375×812 @2x dikey telefon, derin bağlantı + misafir, Seviye 1 açılış: tam klavye görünür, kaydırma yok; **günlük giriş toast'u Boşluk'un üstünde** (bulgu 2 — açık, kanıt bu kare) |
| 10 🔁 | [10-seviye1-yatay-812.png](10-seviye1-yatay-812.png) | 812×375 @2x yatay telefon, Seviye 1, toast geçtikten sonra: tek ekran (329/329); kart defterin **7,7 px altında**, binme yok |
| 11 🔁 | [11-seviye3-375.png](11-seviye3-375.png) | 375×812, Seviye 3, **5 harfli** ROBOT (engine ile 1. denemede): kart x 16→359 (tam `[16,359]`), 5 kutu + "?" balonu eksiksiz; scrollWidth 375 = clientWidth |
| 12 | [12-landing-oyunlar-klavye-kasifi.png](12-landing-oyunlar-klavye-kasifi.png) | `/oyunlar/klavye-kasifi/` tam sayfa (776 px), HTTP 200; imza bandı en altta (`DIV.imza-band` body'nin son öğesi) |
| 13 ✚ | [13-seviye3-375-yonerge-ses.png](13-seviye3-375-yonerge-ses.png) | **YENİ** — 375×812 Seviye 3 üst şerit (y 56–176 kırpma): yönerge balonu `x 75,5–299,5` ile ses düğmesi `x 315–359` arasında **15,5 px boşluk**, `overlap: false` (`getBoundingClientRect`) |
| ek 🔁 | [ek-diakritik-kartlar-1366.png](ek-diakritik-kartlar-1366.png) | **EK/denetim** — kart DOM'da klonlanıp Ğ Ü Ö Ç Ş İ A Q yazıldı (yalnız tarayıcıda): `line-height 1.12` → harf kutusu 116,5 px, kart 136,5 px; Ğ şapkası ve Ç/Ş çengelleri kenardan ayrık |
| ek 🔁 | [ek-360x640-seviye1.png](ek-360x640-seviye1.png) | **EK** — 360×640 @2x Seviye 1, toast geçtikten sonra: tek ekran (584/584), tuş 25,9×51,2 px, yuva 38,4 px, defter–kart 40,7 px |
| ek 🔁 | [ek-360x640-seviye3.png](ek-360x640-seviye3.png) | **EK** — 360×640 Seviye 3, **5 harfli** BALON (engine ile 3. deneme): kart x 16→344 (kullanılabilir 328 px'in tamamı), yönerge iki satıra dengeli kırılıyor, ses düğmesine 12 px |
| ek 🔁 | [ek-seviye3-yatay-812.png](ek-seviye3-yatay-812.png) | **EK** — 812×375 Seviye 3, **5 harfli** ÖRDEK (engine ile 1. deneme): tek ekran (329/329), kart defterin 9 px altında |
| ek ✚ | [ek-ucus-balon-1366.png](ek-ucus-balon-1366.png) | **YENİ/denetim** — doğru basıştan 937 ms sonra (uçuş bitti, 🌸 1. yuvaya yerleşti): balon `is-flown` sınıfını taşıyor ama **tam opak** — solma görünmüyor (bkz. bulgu 11) |

## 2. Ölçümler

### 2a. Tur 1 (4c1e501)

| Ölçüm | 1366×768 | 375×812 (@2x) | 812×375 (@2x) | 360×640 (@2x) |
|---|---|---|---|---|
| `.kk-key` (harf tuşu) | **54,2 × 60 px** | **27,2 × 60 px** | 54,2 × 34 px | 25,9 × 51,2 px |
| `.kk-key--space` | 415 × 60 px | 208 × 60 px | 415 × 34 px | 199 × 51 px |
| `.kk-letter` font-size | **104 px** Fredoka 700 (line-height 1) | 104 px | 56,25 px | 96 px |
| `#game-area` scroll/client yükseklik | 712 / 712 | 756 / 756 | 329 / 329 | 584 / 584 |
| `#game-area` scroll/client genişlik | 1366 / 1366 | L1 375/375 · **L3 424/375 (taşma)** | 812 / 812 | 360 / 360 (3 harfli kelimede) |
| Seviye 3 kutu (`.kk-tile`) | 62 px | **62 px** (5 kutu → kart 472 px) | 38 px | 57,6 px |
| Defter–kart dikey aralık | 60 px | 106 px | **−6 px (binme)** | 46 px |
| Yönerge sağ ucu → ses düğmesi | 216 px | **−2 px (L3)** | 222 px | **−9,5 px (L3)** |

### 2b. Tur 2 (9c65579) — yeniden ölçülenler

| Ölçüm | 1366×768 | 375×812 | 812×375 | 360×640 |
|---|---|---|---|---|
| `#game-area` scroll/client | 712/712 · 1366/1366 | 756/756 · **375/375 (L3, 5 harf)** | **329/329** · 812/812 | 584/584 · **360/360 (L3, 5 harf)** |
| Seviye 3 kart (5 harf) | x 415,9–950,1 (534 px) | **x 16–359 (343 px)** | x 246–566 (320 px) | **x 16–344 (328 px)** |
| `.kk-tile` (5 harf) / harf fontu | 62 px / 34,7 px | 37,5 px / 21 px | 33,8 px / 18,9 px | 38,9 px / 21,8 px |
| `.kk-bubble` | 92 px | 96 px | 52 px | 76,8 px |
| `.kk-slot` (L1 6 yuva / L3 4 yuva) | 44 / 44 px | 44 / 44 px | 24 / 24 px | 38,4 / 38,4 px |
| Defter altı → kart üstü | L1 53,8 px · L3 66 px | L3 110 px | **L1 7,7 px · L3 9 px** | L1 40,7 · L3 48 px |
| Yönerge sağ ucu → ses düğmesi | L1 216 · L3 138,6 px | **L3 15,5 px** | L3 222 px | L1 49,5 · **L3 12 px** |
| `.kk-letter` | 104 px, line-height **116,5 px** (1.12); kart 136,5 px | — | 48,75 px (13vh) | 96 px / 107,5 px |
| `.kk-key` | 54,2 × 60 | 27,2 × 60 | 54,2 × 34 | 25,9 × 51,2 |

### 2c. Kontrast (hesaplanan, WCAG 2.x)

| Öğe | Ön / arka plan | Tur 1 | Tur 2 (9c65579) |
|---|---|---|---|
| Yönerge `.kk-instruction` | `#5D4037` / `rgba(255,255,255,.8)` üstü `#E8F4FD` → bileşke `#FAFDFF` | **9,11:1** (saf beyazda 9,32:1) | değişmedi |
| Tuş etiketi | `#2D3436` / `#FFFFFF` | 12,68:1 | değişmedi |
| Yanan tuş etiketi | `#2D3436` / `#FFD166` | 8,79:1 | değişmedi |
| Boşluk etiketi (durağan) | `#5F6B73` / `#FFFFFF` | 5,47:1 | değişmedi |
| Altyazı `.kk-caption` | `#5F6B73` / `#E8F4FD` | 4,9:1 | değişmedi |
| Büyük harf `.kk-letter` | `#3A86FF` / beyaz | 3,48:1 (104 px → büyük metin, geçer) | değişmedi |
| **Bekleyen kelime kutusu harfi** | tur 1 `#94A3B8`, tur 2 `#5F6B73` / beyaz | **2,56:1** ❌ | **5,47:1** ✅ AA |
| Bekleyen kutu kenarı | tur 1 `#E2E8F0`, tur 2 `#8C9BAD` / beyaz | 1,23:1 | **2,84:1** (commit "3:1" diyor; 3:1'in 0,16 altında) |
| Boş defter yuvası kesik çizgi | `rgba(45,52,54,.28→.4)` / `#F5FAFE`≈ | ≈1,8:1 | **2,22:1** (hâlâ < 3:1) |

Toast çakışması (375×812, oyun kurulduktan 700 ms sonra, tur 1): `#meta-toast` (z-index 1300, opacity 1) x 93,8–281 · y 724–786;
`.kk-key--space` x 83,5–292 · y 726–786 → Boşluk'un ~%90'ı 3 sn örtülü (3,7 sn'de opacity 0). Tur 2'de kod değişmedi.

Kelime havuzu (Seviye 3, `TR.letterImages`'tan türetilen 46 kelime): 2 harf ×1, 3 harf ×8, **4 harf ×13, 5 harf ×24** → %80'i 4–5 harfli.

Balon solması (tur 2, `olcumler-ucus.json`): doğru basıştan 617 / 816 / 1007 / 1111 ms sonra `.kk-bubble` sınıfı
`is-revealed is-flown`, hesaplanan `opacity` **1** (beklenen 0,45); `animation-name: kkPop`, `animation-fill-mode: both`.
DOM teşhisi: aynı öğede `style.animation='none'` yapılınca opacity **0,45** oluyor → `kkPop` keyframe'lerindeki `opacity: 1`
(`both` dolgusu) normal `.is-flown` bildirimini eziyor.

## 3. Bulgular — tur 1 + tur 2 durumu

| # | Önem | Kanıt (tur 1) | Ne görüldü (tur 1, 4c1e501) | Tur 2 (9c65579) |
|---|---|---|---|---|
| 1 | **YÜKSEK** | 11 (eski), ek-360 L3 (eski) | Seviye 3 kelime kartı dikey telefonda yatay taşıyordu: BALIK için kart 472 px, x=−48,5; ilk kutu "B" ve "?" balonu kesik; scrollWidth 424 > 375. 46 kelimenin 37'si sığmıyordu; 360×640'ta da aynı. | ✅ **KAPANDI** — [11](11-seviye3-375.png): ROBOT, kart x 16–359, scrollWidth 375; [ek-360 L3](ek-360x640-seviye3.png): BALON, kart x 16–344, scrollWidth 360; [ek-yatay L3](ek-seviye3-yatay-812.png): ÖRDEK 320 px. Kutu genişliği `--kk-word-len` bütçesiyle 37,5 / 38,9 / 33,8 px'e iniyor. |
| 2 | ORTA | [09](09-seviye1-375.png), 10 (eski) | Günlük giriş toast'u oyun açılışında Boşluk tuşunun ~%90'ını 3 sn örtüyor; derin bağlantı (SEO "Hemen Oyna") gerçek yol. | ❌ **AÇIK** — bu PR dışında (hub bileşeni). 09 kanıt olarak duruyor; 10 toast geçtikten sonra yeniden çekildi. |
| 3 | ORTA | 07 (eski), 11 (eski) | Bekleyen harf kutuları soluk: harf 2,56:1, kenar 1,23:1. | ✅ **KAPANDI** — [07](07-seviye3-kelime-1366.png): harf `#5F6B73` **5,47:1**; kenar `#8C9BAD` **2,84:1** (commit 3:1 diyor, 0,16 eksik — çocuk için kutu artık net görünüyor, sayı notu). |
| 4 | ORTA | 06a (eski) | Aynı harf bir seviyede tekrar geliyordu (🍬 Ş 3. ve 6. yuvada); `lastPick` yalnız ardışık tekrarı engelliyordu. | ✅ **KAPANDI** — [06a](06a-seviye1-defter-dolu-1366.png): 6 farklı emoji, L1 harfleri U H Z İ R I (6/6 tekil), L2 Ş B U T J Z E M (8/8 tekil) — `usedPicks`. |
| 5 | ORTA | ek-360 L3 (eski), 11 (eski) | Seviye 3 yönerge balonu ses düğmesinin altına giriyordu (360: −9,5 px, 375: −2 px). | ✅ **KAPANDI** — [13](13-seviye3-375-yonerge-ses.png): 375'te 15,5 px boşluk, `overlap:false`; [ek-360 L3](ek-360x640-seviye3.png): 12 px, metin iki satıra dengeli kırılıyor (`max-width: calc(100% − 112px)`, kısa yönerge "…sonra Boşluk!"). |
| 6 | ORTA | 10 (eski), ek-yatay L3 (eski) | 812×375'te kart defter yuvalarına 6 px biniyordu (`.kk-stage min-height:0`). | ✅ **KAPANDI** — [10](10-seviye1-yatay-812.png): defter altı 121 → kart üstü 128,7 (**+7,7 px**); [ek-yatay L3](ek-seviye3-yatay-812.png): +9 px; scrollHeight = clientHeight = 329 her ikisinde. |
| 7 | DÜŞÜK | ek-diakritik (eski), 06c | Ğ şapkası kart üst kenarına, Ç/Ş çengelleri alt kenara dayanıyordu (`line-height:1`). | ✅ **KAPANDI** — [ek-diakritik](ek-diakritik-kartlar-1366.png): `line-height 1.12` → harf kutusu 116,5 px; Ğ/Ç/Ş kenardan görünür payla ayrık. |
| 8 | DÜŞÜK | [06b](06b-seviye2-baslangic-1366.png), 07 (eski), 11 (eski) | Önceki seviyenin kutlama konfetisi "Sonraki Seviye" sonrası yeni seviyenin ilk 1–2 sn'sine akıyor (`Particles.celebrate`, motor düzeyi). | ❌ **AÇIK** — bu PR dışında. 07 bu yüzden 3 sn bekleyip çekildi; 06b kanıt olarak duruyor. |
| 9 | DÜŞÜK | [09](09-seviye1-375.png) | 375×812'de kart ile defter arasında ~108 px, kart ile klavye arasında ~136 px boş bant; harf 104 px tavanında. | ❌ **AÇIK** (ele alınmadı) — tur 2 L3'te defter–kart 110 px; düzen aynı. |
| 10 | DÜŞÜK | [02](02-seviye1-baslangic-1366.png) | Boş defter yuvası kesik çizgisi ≈1,8:1. | ⚠ **KISMEN** — `.28 → .4` alfa: 2,22:1 (belirgin daha okunur, hâlâ < 3:1). Kapatma iddiası yoktu. |
| 11 | DÜŞÜK | [04](04-seviye1-ucus-1366.png) | Uçuşta balondaki resim yerinde kalıyor, kopyası uçuyor (§6 "resim balondan **çıkar**"). | ❌ **AÇIK — düzeltme etkisiz**: `is-flown` sınıfı ekleniyor ama [ek-ucus-balon](ek-ucus-balon-1366.png) 937 ms'de balon tam opak; hesaplanan opacity 617–1111 ms boyunca **1** (`olcumler-ucus.json`). Neden: `.kk-bubble.is-revealed { animation: kkPop .36s both }` — `kkPop` keyframe'i `opacity: 1` içeriyor ve `both` dolgusu animasyon bittikten sonra da uygulanır; animasyon değerleri normal bildirimi (`.is-flown { opacity: .45 }`) ezer. DOM'da `animation:none` yapılınca 0,45 görülüyor. Öneri: `kkPop`'tan `opacity` kaldırılsın ya da `is-flown` balonun içindeki metne/`::before`'a uygulansın. |
| 12 | DÜŞÜK | [12](12-landing-oyunlar-klavye-kasifi.png) | İmza bandı 40 px / 776 px = %5,15 (kural ≤ %2); şablon geneli. | ❌ **AÇIK** — bu PR dışında. |
| 13 | DÜŞÜK | 06a (eski) | "Masa" → 🪑 (sandalye) veri hatası (`js/i18n.js`). | ✅ **KAPANDI (kodda)** — `Mantar 🍄` oldu (`git show 9c65579 -- js/i18n.js`); görsel yeniden çekilmedi (M harfi bu koşuda gelmedi). |
| 14 | DÜŞÜK | [10](10-seviye1-yatay-812.png) | Yatay telefonda tuş 34 px yüksek (< 44 px dokunma eşiği). | ❌ **AÇIK** — bu PR dışında (34 px korunuyor). |

### Tur 2'de fark edilen yeni gözlem (bloklamaz)

| # | Önem | Kanıt | Ne görülüyor |
|---|---|---|---|
| 15 | DÜŞÜK | [11](11-seviye3-375.png), [ek-360 L3](ek-360x640-seviye3.png) | Dar ekranda kutu bütçesi harfleri küçültüyor (375: kutu 37,5 px, harf 21 px) ama "?" balonu 96 px kalıyor → kartta yazılacak harfler küçük, ödül balonu büyük; hiyerarşi tersine dönüyor. Dar ekranda balon tavanı da bütçeye girse (ör. 64 px) kutular ~44 px olur. |

## 4. Doğrulanan vaatler (kanıtla)

- Doğru/yanlış/ipucu durumları: tuş yeşil (03), tuş kırmızı + hedef sarı + kart nudge (05), 5 sn ipucu nefesi (06c), Boşluk yanıyor (08).
- Uçuş (FLIP) yakalandı: `.kk-flyer` 655–800 ms'de havada (04); 6/6 yuva doldu (06a); yıldız hesabı 1 yanlışla 3⭐ (06).
- Fiziksel klavye yolu: Seviye 3 sonunda `page.keyboard.press('Space')` ile gönderim → balon ☀️ "Güneş" (`olcumler.json` → `notes1366.spaceAfter`). Harf yolu (`keydown` P → doğru) yalnız iptal edilen ilk koşunun konsol logunda görüldü; bu klasördeki görüntüler ekran tuşu tıklamasıyla alındı.
- Dikey kaydırma yok: 1366×768, 375×812, 812×375, 360×640 — her iki turda `scrollHeight == clientHeight`; tur 2'de yatay taşma da yok (5 harfli kelimelerle).
- Yönerge kontrastı 9,11:1; tuş etiketleri 12,68:1 / sarıda 8,79:1; Fredoka + Nunito yüklü.
- Hub kartı: doğru bölümde, şerit `#3A86FF`, ikon SVG (viewBox 128) yüklü (01). Açılış sayfası: h1 "Klavye Kâşifi Oyna", CTA `/?oyun=klavye-kasifi`, imza bandı son öğe (12).
- Konsol: 0 hata, 0 yakalanmamış istisna (iki turda toplam 9 bağlam).

## 5. Dürüst değerlendirme

**Tur 1:** masaüstü akışı vaat edildiği gibi çalışıyordu; dikey telefonda Seviye 3 kırıktı (bulgu 1).
**Tur 2 (9c65579):** yüksek bulgu ve beş orta bulgu kanıtla kapandı (1, 3, 4, 5, 6) + düşük 7 ve 13. Kod değişen ama
**etkisiz kalan** bir düzeltme var: bulgu 11 (balon solması `kkPop` dolgusuna yeniliyor) — düşük önemde, ama "düzeltildi"
diye kapatılmamalı. Açık kalanlar bu PR dışında: 2 (toast), 8 (konfeti), 12 (imza bandı yüksekliği), 14 (yatay tuş 34 px);
ayrıca ele alınmayan düşük 9 ve kısmen iyileşen 10, yeni düşük 15.
Durum: **oyunun kendi kapsamı için KABUL EDİLEBİLİR** (kalan tek kod bulgusu 11 düşük ve teşhisi hazır); PR dışı 2/8/12/14
ayrı iş olarak izlenmeli.

---
**Toplam: 21 görüntü (12 istenen + 9 ek; 9'u 9c65579 ile yeniden çekildi, 2'si yeni), 15 bulgu (tur 1: 14 → 7 kapandı ✅, 1 kısmen ⚠, 6 açık ❌ [biri etkisiz düzeltme]; tur 2: +1 yeni düşük).**
