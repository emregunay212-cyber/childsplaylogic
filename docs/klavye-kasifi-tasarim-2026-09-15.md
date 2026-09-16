# Klavye Kâşifi — anaokulu klavye oyunu tasarımı

> Durum: **inşa edildi, kabul geçidi + PR** (2026-09-16, dal `feat/klavye-kasifi`). Bittiğinde bu satır "canlıda" olur ve
> `EGITSEL-FAZ-DURUM.md`'ye satır eklenmez (eğitsel 8–12 serisinin parçası değil; okul öncesi hub oyunu).
> Slug `klavye-kasifi` · kategori Harfler & Kelimeler · yaş 4–6 · hub-içi modül (iframe değil) · 3 seviye.

## 1. Kim, ne öğrenir

Anaokulu çocuğu (4–6) okuma bilmez, büyük harflerin bir kısmını tanır, tek parmakla tuşa basar.
Bu yaşta "klavye geliştirme" **on parmak değildir**; üç somut beceridir:

| Beceri | Oyunda nerede |
|---|---|
| Ekrandaki harfi klavyede **bulmak** (harf ↔ tuş konumu) | Her turda büyük harf + ekran klavyesinde tuşun yeri |
| **Tek tuşa tek basış** (basılı tutmadan, çift basmadan) | `keydown` + `repeat` yok sayılır; basılan tuş ekranda çöker |
| **Sıra** (soldan sağa harf dizmek) ve **Boşluk** tuşunu tanımak | 3. seviye: kelime harf harf, sonunda Boşluk |

Yaşa uygun olmayanlar bilinçli olarak yok: süre sayacı, can, hız baskısı, okunması gereken yönerge.
Yönerge metni ebeveyn/öğretmen içindir; çocuk için anlamı **yanan tuş** ve **zıplayan kutu** taşır.

## 2. Döngü (tur)

1. Hedef gelir: büyük harf kartı (1–2. seviye) ya da kelime kutuları (3. seviye). Kartın altında "?" balonu:
   resim gizli.
2. Çocuk tuşa basar — fiziksel klavye (birincil) ya da ekran klavyesine dokunma (tablet/telefon). İkisi
   aynı `press(harf)` yoluna girer; fiziksel basışta da ekrandaki tuş çöker (eşleme pekişir).
3. Doğru: tuş yeşile döner ve pat'lar, "?" balonu resme dönüşür (🐻 Ayı), kıvılcım, `success` sesi, resim
   üstteki **kâşif defteri**ne (tur sayısı kadar yuva) uçar. İsteğe bağlı sesli okuma harfin adını söyler.
4. Yanlış: basılan tuş kısa kırmızı sallanır, hedef tuş **ipucu** olarak yanıp söner. Tur tekrar edilmez,
   çocuk devam eder. Bir turda yalnız **ilk** yanlış sayılır (el yordamı 1 yıldıza düşürmez).
5. Defter dolunca seviye biter → motorun kutlama katmanı (yıldız + konfeti).

## 3. Seviyeler

| # | Ad | Tur | Havuz | İpucu | Yeni beceri |
|---|---|---|---|---|---|
| 1 | Işıklı Tuş | 6 harf | 29 harf (`TR.letterImages`) | Hedef tuş **sürekli** yanar | Harf ↔ tuş konumu, tek basış |
| 2 | Harf Avı | 8 harf | 29 harf | Tuş yanmaz; 5 sn boşta ya da ilk yanlışta yanıp söner | Konumu hatırlamak |
| 3 | Kelime Yolu | 4 kelime | `TR.letterImages`'tan 2–5 harfli kelimeler (emoji tekilleştirilmiş) | Sıradaki kutu zıplar; 5 sn / yanlışta tuş yanar; son harften sonra **Boşluk** yanar | Sıra, soldan sağa, Boşluk |

Art arda aynı harf/kelime gelmez. Yıldız: modül kendi hesaplar (`onComplete(stars)`): hatalı tur 0–1 → 3⭐,
turların ≤ yarısı → 2⭐, üstü → 1⭐ (motorun doğruluk formülüne bağımlı değil; iki sürümünde de aynı sonuç).

## 4. Klavye

Türkçe Q dizilimi, gerçek sıra kaymalarıyla (2. sıra ¼ tuş, 3. sıra ¾ tuş içeride) — çocuk gerçek
klavyenin coğrafyasını görür:

```
Q W E R T Y U I O P Ğ Ü
 A S D F G H J K L Ş İ
   Z X C V B N M Ö Ç
        [ Boşluk ]
```

Fiziksel klavye: `e.key` Türkçe büyük harfe çevrilir (`toLocaleUpperCase('tr-TR')`: i→İ, ı→I). Harf değilse
`e.code` konum haritası denenir (İngilizce işletim sistemi dizilimindeki `Semicolon` → Ş, `Quote` → İ,
`BracketLeft` → Ğ, `BracketRight` → Ü, `Comma` → Ö, `Period` → Ç): tuş kapağında ne yazıyorsa o gelir, TR
harfleri her makinede basılabilir. `Enter` Boşluk gibi kabul edilir (3. seviye "gönder"). Boşlukta
`preventDefault` (alan kaymasın; odaktaki düğme tetiklenmesin). Ekran tuşları `tabindex="-1"` (fiziksel
klavye zaten erişilebilir giriş) ve `mousedown` odak almaz → fiziksel Boşluk, dokunulan tuşu ikinci kez
tetiklemez. Tuş genişliği `clamp(26px, (genişlik − boşluklar)/12, 56px)`: 360 px telefonda telefon
klavyesi ölçüsünde, tablette/PC'de 52 px dokunma hedefi.

## 5. Sesli okuma (isteğe bağlı)

`speechSynthesis` ile harf adı ("be", "çe", "yumuşak ge") ve kelime okunur — dosya yok, cihazda çalışır.
Yalnız `tr-TR` sesi varsa ve hub ses düğmesi açıksa; oyun içi hoparlör düğmesiyle kapatılır
(`Progress.saveSetting('kkSpeech')`). Sınıfta 20 PC aynı anda konuşmasın diye varsayılan **kapalı**;
düğme ilk turda dikkat çeker (tek sefer sallanır).

## 6. Görsel dünya — impeccable yön sözleşmesi (geliştirme belgesi; koda kopyalanmaz)

**THESIS:** Klavye bir harita, tuş bir ışık: çocuk harfi *okumaz*, ışığı *bulur* ve resmi *kazanır*.
**MODE:** Operate (görev: tuşa bas) — ifade ayrıntıda, akış merkezde.
**WORLD:** Hub'ın kurulu dünyası aynen: Fredoka/Nunito, gökyüzü-çimen zemin, `--radius-md/lg`, yumuşak
gölgeler; oyun rengi `--klavye-color #3A86FF` (klavye mavisi; cyan/lacivert kartlardan ayrık). Tuşlar beyaz
"klavye kapağı": alt kenar çizgisi ile basılabilir hissi, yanan tuş sıcak sarı (#FFD166) + halka.
**FIRST VIEWPORT:** Üstte kâşif defteri (6–8 boş yuva), ortada tek büyük harf kartı ile "?" balonu, altta tam
klavye — yanan tek tuş gözü hemen çeker. Kaydırma yok; 360×640 ve 1366×768'de tek ekran.
**SIGNATURE:** Doğru basışta resim balondan çıkar ve deftere **uçar** (FLIP); yanlışta tuş sallanır, hedef
tuş nefes alır.
**RISK:** Telefon dikeyde tuşlar 27 px — kabul edildi (fiziksel klavye birincil; telefon klavyesi ölçüsü).

## 7. Dosyalar / entegrasyon (CLAUDE.md "Yeni oyun ekleme")

- [x] `js/games/klavye-kasifi.js` — modül (`id`, `levels[3]`, `init`, `destroy`; `keydown` dinleyicisi ve
      zamanlayıcılar `destroy`'da kaldırılır)
- [x] `css/klavye-kasifi.css` — `kk-` önekli stiller, `prefers-reduced-motion` dalı
- [x] `js/app.js` kayıt (Harfler & Kelimeler, Harf Tanıma'dan sonra) · `js/i18n.js` ad + yönerge ·
      `css/main.css` renk · `css/hub.css` kart şeridi · `js/lock-catalog.js` `SOLO_GAMES`
- [x] `assets/images/hub/klavye-kasifi.svg`
- [x] `seo/games_data.py` + `python seo/build_seo.py`
- [x] `npm run lint` · `npm run test:smoke` · `python seo/test_build_seo.py`
- [x] Kabul geçidi: reality-checker · evidence-collector (ekran görüntüleri `docs/kanit/klavye-kasifi-2026-09-16/`) · güvenlik denetçisi — bkz. §9
- [ ] PR → Vercel önizleme → sahip merge'ü → portfolyoya ekleme


## 8. Doğrulama kaydı (2026-09-16)

- Tarayıcı (Claude Browser, localhost): 3 seviye baştan sona oynandı — L1 6 tur (1 yanlışla 3⭐), L2 8 tur (5 sn sonra
  ipucu nefesi doğrulandı), L3 4 kelime (Boşluk ve Enter ile gönderim; yanlış harfte ipucu). Fiziksel klavye yolu
  (`keydown` — i→İ dönüşümü dâhil) ve ekran klavyesi tıklama yolu ayrı ayrı çalıştı. Boşlukta sayfa kaymadı.
- Görünümler tek ekran, kaydırmasız: 375×812 (dikey telefon, tuş 27×60 px), 812×375 (yatay telefon), 800×600,
  1366×680 (okul PC tarayıcı alanı; tuş 54×54 px).
- Not: Claude Browser paneli `prefers-reduced-motion: reduce` emüle ediyor → panelde azaltılmış-hareket dalı
  (uçuş yerine anında yerleşme) görüldü; tam hareket dalı Playwright kanıt koşusunda (`docs/kanit/`) alınır.
- `npm run lint`: 0 hata (43 önceden var olan uyarı, yeni dosyada 0) · `npm run test:smoke`: 61/61 (önceki 60 + klavye-kasifi)
  · `python seo/test_build_seo.py`: 42/42 · `python seo/build_seo.py`: title 60/60, description 146/150, aşım 0.
- Yan düzeltme: `js/particles.js` kıvılcım yarıçapı bir kare boyunca eksiye düşüp `IndexSizeError` fırlatıyordu
  (sparkle kullanan her oyunda konsola düşen yakalanmamış hata) → `Math.max(0, …)` koruması.
- README "Yeni oyun ekleme" 2. adımı güncellendi (index.html etiketi yok; `files` ile tembel yükleme; eslint globali).

## 9. Kabul geçidi (2026-09-16)

| Ajan | Hüküm | Bulgu → yapılan |
|---|---|---|
| **AI-Generated Code Security Auditor** | MERGE-READY (güvenlik bulgusu 0) | KK-01 klavye kullanıcısı araç çubuğu odaktayken Enter/Boşluk'la çıkamıyor → odak oyun dışı etkileşimli öğedeyse dinleyici tuşu tarayıcıya bırakır (`4c1e501`). KK-02 CLAUDE.md motor paragrafı master'ı değil PR #34'ü anlatıyordu → iki sürüm de yazıldı. KK-03 uzak TTS sesi → `localService` öncelikli. |
| **Reality Checker** | 10 iddianın 9'u kanıtla GEÇTİ; NEEDS WORK (telefonda yatay taşma) | L2 defteri (8×44 px) ve L3 kartı (5 harf) 360–412 px'te taşıyordu → yuva ve kutu genişliği tur sayısı/kelime uzunluğu bütçesiyle (`--kk-rounds`, `--kk-word-len`) hesaplanır; probe yeniden koşuldu: 360/375/390/412 × L1–L3 scrollW = clientW. Meşgul penceresinde Boşluk kaydırıyordu → `preventDefault` `busy` kontrolünden önce. İngilizce dizilimde «I» üretilemiyordu → KeyI + hedef I ise I. Belge ölçümü 27×65 → 27×60. |
| **Evidence Collector** | 19 görüntü, 14 bulgu (1 yüksek = aynı taşma) | Bekleyen kutu harfi 2,56:1 → `--text-muted` 5,5:1, kenar 3:1. Yönerge ses düğmesinin altına giriyordu → `max-width` + kısa L3 yönergesi. Yatay telefonda kart deftere biniyordu → sahne `min-height: 0` kaldırıldı, kısa görünüm bütçesi. Aynı harf bir seviyede tekrar edebiliyordu → seviye içi `usedPicks`. Ğ/Ç/Ş diakritikleri kenara dayanıyordu → `line-height 1.12`. "Masa 🪑" veri hatası → "Mantar 🍄" (`js/i18n.js`). Uçuşta resim balonda kalıyordu → balon solar (`is-flown`). |

Bu PR'ın dışında bırakılan bulgular (ayrı iş): günlük giriş toast'u (`js/bilnet-meta.js`) telefonda açılışta 3 sn Boşluk tuşunu örtüyor;
önceki seviyenin konfetisi yeni seviyeye akıyor (motor kutlaması); landing imza bandı yüksekliği %5 (üretici şablonu, kural ≤%2);
yatay telefonda tuş yüksekliği 34 px (< 44 px dokunma hedefi — yükseklik bütçesi).

Kanıt yenileme sonrası (bkz. `docs/kanit/klavye-kasifi-2026-09-16/README.md`): bulgu 11 (balon uçuşta opak — `kkPop` `both` dolgusu
`.is-flown` opaklığını eziyordu → `.kk-bubble.is-revealed.is-flown { animation: none }`, Playwright: 750 ms'de opacity 0.45) ve bulgu 15
(dar ekranda 96 px balon / 37 px kutu → `≤599px` Kelime Yolu balonu `clamp(52px, 8vh, 72px)`, kutular 44 px) kapatıldı; kutu kenarı 3,2:1.

Master birleştirmesi (PR #34 motoru) sonrası tam doğrulama yeniden koşuldu: 9/9 iddia GEÇTİ. Bulunan bir gerileme kapatıldı:
KK-01 odak geçişi, kutlama düğmesinden ("Sonraki Seviye") kalan bayat odak yüzünden çocuğun ilk basışını yutuyordu →
çizilmeyen (getClientRects 0) öğeler geçiş almaz + `init` bayat odağı bırakır (probe: ilk basış işlendi, araç çubuğu Enter çalışır).
