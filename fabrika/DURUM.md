# FABRİKA DURUM — Session Özeti (2026-06-11)

> Bu dosya başka bilgisayarda işe devam için yazıldı. Claude'a "fabrika/DURUM.md'yi
> oku ve kaldığımız yerden devam edelim" demen yeterli.
> NOT: Claude'un yerel hafızası (memory) makineye özgüdür — bu dosya tek köprüdür.
> Orijinal plan paketi yalnız ana PC'de: `C:\Users\emreg\Downloads\EGITSEL-OYUN-FABRIKASI`
> (özü aşağıda ve PARA-KAZANMA özeti bu dosyada mevcut).

## NE YAPILDI (kronolojik, bu session)

### 1. Math Archer oyunu TAMAMLANDI (eğitsel ürün #1)
Zindan Okçusu motorundan türetilmiş, 446 soru/dil gömülü roguelite. `fabrika/src/math-archer/`.
- 3 eğitsel mekanik: soru dalgası (her 3. dalga, 4 zararsız şık-taşıyıcı; doğru=altın+%30 hasar buff),
  sandık sorusu (15sn, nadirlik+1), konu seçimi (Çarpım/Dört İşlem/Kesirler/Karışık).
  Altın kural: sorular ÖDÜL, asla ceza/durdurma yok.
- Atış modeli: BASILI TUT = ATEŞ (sol fare / ikinci parmak; 1. parmak joystick),
  yön = işaret + ±0.25rad aim-assist; 🎯/🅰 mod seçici (oto: dururken en yakına;
  basılı tutuş her modda öncelikli; F kısayolu; Storage 'ma.fireMode').
- UI düzeltmeleri: taşan başlık (7.4vw), hub ayar paneli (chip'ler), Yetenekler düzeni,
  kalıcı bildirim KÖK NEDENİ: qBand gizli konumu translateY(-140%) top:84'ü aşmıyordu →
  calc(-100% - 100px)+visibility; tüm bandlara 16sn güvenlik tavanı.

### 2. itch.io YAYINI — İKİ SAYFA CANLI ✓
- EN: https://emregunay212-cyber.itch.io/math-archer
- TR: https://emregunay212-cyber.itch.io/matematik-okcusu
- Hesap: emregunay212-cyber (emregunay212@gmail.com). İkisi de Playwright ile doğrulandı.
- Paketler: `fabrika/dist/itch/` (zip'ler + 630x500 kapaklar). Üretici: `tools/make_itch_zip.py`.
- itch püf noktaları: Kind=HTML + zip içinde index.html + "played in browser" işareti;
  viewport 960x540 + Mobile friendly + Fullscreen; description alanı MARKDOWN İŞLEMEZ
  (düz metin); Short description ≤120 karakter; AI disclosure: 4 kutu da işaretli.

### 3. GameMonetize BAŞVURUSU — AKTİVASYON BEKLİYOR ⏳
- Hesap: ChildsPlayLogic / emregunay212@gmail.com. Panel: https://gamemonetize.com/developers
  (DİKKAT: plandaki developer.gamemonetize.com adresi YANLIŞ/yok).
- Math Archer Game ID: `fwyj1279nhd4ueyg698gs45hyvctntxy`
- SDK'lı build: `fabrika/dist/portal/gamemonetize/math-archer-gamemonetize.zip` (+3 boyut JPG).
  Üretici: `tools/make_portal_build.py gamemonetize math-archer-en.html --gameid <ID>`
  → SDK köprüsünü </title> sonrasına enjekte eder (window.SDK || no-op shim deseni sayesinde
  oyun koduna dokunmadan devreye girer). Smoke 5/5 geçti (SDK_READY, sdk.js yüklü).
- Form dolduruldu: Arcade+Shooting, 1280x720, mobile ON, description(≤650)+controls EN.
- SORUN: Verify panelinde reklam gelmiyor (telefonda da) → teşhis: yeni hesapta aktivasyon
  öncesi "no fill" NORMAL; entegrasyon konsolda kanıtlı (AD_SDK_LOADER_READY → SDK_READY).
- SON DURUM: kullanıcı mentolatux@gamemonetize.com'a (CC info@) aktivasyon maili atacak/attı.
  Mail şablonu session'da verildi; özü: "SDK kurulu, no-fill yüzünden reklam izlenemiyor,
  kendi tarafınızdan doğrulayıp aktive eder misiniz + itch demo linki".

### 4. Daha önce bitenler (önceki session'lar, özet)
- 7 eğitsel-olmayan oyun tek dosya build (12 build): buz-kulesi/frost-climber, egim/rolling-rush,
  blok-yagmuru/block-rain, penalti, zipla-topla/hop-and-grab, zindan-okcusu (TR+EN), ates-buz
  (özgün alev+su damlası sprite reskini). Hepsi `fabrika/build/`, satış paketleri `fabrika/dist/`.
- Altyapı: `tools/build.py` (config-driven: shellA/singlefile/esm), shims/core.js
  (SDK soketleri + Storage + T()), validator (<2MB, dış referans yok, localStorage yok).
- Canlı siteye DOKUNULMADI (kullanıcı şartı); fabrika/ deploy-ignore'da (firebase+vercel).

## SIRADAKİ ADIMLAR (öncelik sırası)
1. GameMonetize aktivasyon maili yanıtını bekle (1-3 iş günü) → onay gelince panelden yayını
   doğrula; Pazartesi rutini: panel istatistik kontrolü (10 dk/hafta).
2. GamePix (https://partners.gamepix.com/developers) + CrazyGames
   (https://developer.crazygames.com) hesapları aç → make_portal_build.py'a portal snippet'i
   ekleyip build üret (PORTALS dict'ine yeni giriş; GamePix/CrazyGames SDK dokümanına göre).
3. Kelime Okçusu + Fen Okçusu: bankalar hazır (`fabrika/soru-bankasi/` — kelime 225, fen 104).
   Üretim ucuz: src/math-archer kopyala + config.json'da questionBank değiştir + tema metinleri
   (~1 saat/oyun). Sonra itch + portallara aynı akış.
4. Lisans e-posta kampanyası (PARA-KAZANMA-PLANI Hafta 4): haftada 10-15 kişisel mail,
   7 gün sonra follow-up; "80+ öğrenciyle sınıfta test edildi, geliştirici öğretmen" vurgusu;
   non-exclusive $400-600 aralığı; pitch'ler `dist/<oyun>/pitch.md`. Hedef listesi araştırması
   Claude'dan istenebilir.

## ÇALIŞMA DÜZENİ (yeni makinede)
- Test sunucusu: `fabrika/SERVER-BASLAT.bat` (çift tık) ya da repo kökünde
  `python -m http.server 8000` → http://localhost:8000/fabrika/build/<dosya>.html
- Build: `cd fabrika/tools && python build.py math-archer` (ya da `all`).
- Screenshot/probe: Playwright gerekli (`pip install playwright && playwright install chromium`).
  Desen: `tools/shoot.py`. Preview araçları yerine Playwright (hidden-rAF sorunu yok).
- PIL görseller: kapak/portal görselleri PIL ile üretildi (Georgia fontu, altın #f5c451).

## KRİTİK TEKNİK NOTLAR (tuzaklar)
- Portal build'leri bilinçli dış SDK script'i içerir → fabrika validator'ından GEÇİRİLMEZ.
- shims/core.js `const SDK = window.SDK || {no-op}` → portal köprüsü oyun script'inden ÖNCE
  window.SDK'ya yazılırsa otomatik devrede.
- Playwright'ta `pProj=[]` gibi atamalar oyun binding'ine işlemeyebilir → davranışı
  `player.shootFx>0.1` örneklemesiyle ölç. Banner/overlay kapanışını className'le değil
  PİKSELLE doğrula (getBoundingClientRect / elementFromPoint).
- `.btn{width:100%}` mirası: küçük buton/chip'lerde width:auto şart.
- PowerShell 5.1: commit mesajında çift tırnak kullanma (pathspec'e bölünür); Türkçe pipe
  bozulur → geçici .py dosyası yaz-çalıştır-sil deseni.
- itch/GM zip formatı: kök dizinde index.html (make_itch_zip.py / make_portal_build.py halleder).

## HESAP/LINK ÖZETİ
| Ne | Değer |
|---|---|
| itch hesabı | emregunay212-cyber |
| itch EN | https://emregunay212-cyber.itch.io/math-archer |
| itch TR | https://emregunay212-cyber.itch.io/matematik-okcusu |
| GameMonetize | ChildsPlayLogic · GameId fwyj1279nhd4ueyg698gs45hyvctntxy |
| GM destek | mentolatux@gamemonetize.com · info@gamemonetize.com |
| Canlı hub | bilnetoyun.com (Vercel, push=otomatik) · childsplaylogic.web.app (Firebase, manuel) |
