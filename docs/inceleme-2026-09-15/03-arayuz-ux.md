# Arayüz / UX Denetimi — bilnetoyun.com

Ajan: `design-ui-designer` + `impeccable` (audit/critique/craft-floor kontrol listesi elle) · Tarih: 15 Eylül 2026

**Yöntem:** Salt-okunur kod denetimi; kontrast oranları WCAG formülüyle hesaplandı. İncelenen yüzeyler: `index.html` (hub), `oyunlar/index.html`, 53 landing, `admin.html`, `games/son-kart`, `games/zindan-okcusu`, `oyunlar/hafiza-kartlari`, `oyunlar/matematik`, `css/` (45 dosya), `js/app.js`, `js/lock-catalog.js`, `js/mobile-utils.js`, `js/auth.js`. Koordinatörün canlı ekran görüntüleri (masaüstü 800px, mobil 375px) bulguları destekliyor: mobilde yapışkan üst bar 3 satır (~160px) ve "Hadi Başlayalım" başlığı altında kalıyor.

## Özet puan kartı

| Boyut | Puan | Gerekçe |
|---|---|---|
| Hiyerarşi | 2/5 | 58 eş boyutlu kart, 6 konu bölümü; yaş/beceri ekseni, arama ve filtre yok (`js/app.js:17-106`). Yaş bilgisi yalnızca hub'dan ulaşılamayan `/oyunlar/`'da. |
| Tutarlılık | 2/5 | 300 farklı hex, 16 farklı `font-family`, 52 kez tanımsız token, aynı sınıf adı iki bileşende. |
| Erişilebilirlik | 2/5 | Zoom kilidi, tüm `<button>`'larda odak halkası kapalı, 7 kontrast ihlali, klavyeyle açılamayan kartlar/çip, odak yönetimi olmayan modallar. |
| Mobil | 3/5 | Kırılım noktaları, safe-area ve 52px araç çubuğu düğmeleri iyi; ama çipler 36-38px, ~1 MB CSS/JS ilk karttan önce. |
| Tipografi | 2/5 | Fredoka+Nunito doğru seçim; ama 9.6px rozetler, ≤340px'te 12px kart başlığı, 54 sayfada yüklenmeyen Nunito, hiç yüklenmeyen Orbitron/Baloo. |
| Hareket | 2/5 | 58 kart sonsuza dek süzülüyor; hover/basma dönüşümleri animasyon tarafından eziliyor (çalışmıyor); nav hover'da sallanma; 40 adet `transition: all`. |
| Marka | 1/5 | "Bilnet Okulları" arayüzde hiç geçmiyor, logo yok, 8 yazı tipi, şablon moru `#667eea`, emoji ikonlar, egweblab imzası 0/83 sayfada. |

## Bulgular

| Önem | Bulgu | Kanıt | Öneri |
|---|---|---|---|
| YÜKSEK | Zoom kilidi — WCAG 1.4.4 ihlali. Hub'da gereksiz: `touch-action: manipulation` zaten çift-dokunma zoom'unu kaldırıyor. | `index.html:5`; `main.css:132`; `games/son-kart/index.html:5`, `games/zindan-okcusu/index.html:5` | Hub: `content="width=device-width, initial-scale=1, viewport-fit=cover"`. Iframe içindeki oyun belgelerinin viewport meta'sı zaten yok sayılır; kanvas oyunları `touch-action:none` ile korunuyor. |
| YÜKSEK | Odak halkası yok: global `button { outline: none }`; tek `:focus-visible` kuralı div kartlarda. WCAG 2.4.7. | `css/main.css:144`; `css/hub.css:259`; `css/admin.css:50` | `outline:none` sil; `main.css`'e `:where(button,[role=button],a):focus-visible{outline:3px solid var(--neutral);outline-offset:3px}`. |
| YÜKSEK | Kontrast ihlalleri (WCAG 1.4.3): "Aşağıdan bir oyun seç…" **2.0:1**; yaş etiketi `#f5a623` beyazda **2.0:1**; giriş notu **2.9:1**; "Eğitici Oyunlar" alt marka **3.2:1** (10px); meta notu **3.2:1**; kilit ilerlemesi ve "Online" **3.5:1**; splash alt başlığı **1.6:1**. | `hub.css:90-92`; `oyunlar/index.html:26`; `main.css:326-329`; `main.css:550-556`; `hub.css:593`; `hub.css:453`, `app.js:650`; `main.css:203-207` | `#888→#5F6B73`, `#9099a3→#5B6672`, `#f5a623→#B36B00`, `#7a93a8→#4F6B84`; `.popular-empty`'e beyaz zemin; splash alt başlığına `--text-warm`. |
| YÜKSEK | Bilgi mimarisi: 5 yaşındaki çocuk da öğretmen de aynı 58 kartı görüyor. Yaş, beceri, süre bilgisi kartta yok. `/oyunlar/` listesi hub'dan erişilemez: footer `#app`'in altında, `html,body{overflow:hidden}` + `.app{height:100%}` yüzünden asla ekrana gelmiyor. | `js/app.js:17-106, 567-716`; `index.html:450-467`; `main.css:122-125, 600-605` | Birincil eksen yaş bandı (Anaokulu / 1-2. sınıf / 3-4. sınıf), ikincil eksen konu. Karta yaş rozeti + süre. "Öğretmen" anahtarıyla beceri etiketleri. Footer'ı `.hub` kaydırma kapsayıcısının içine al. |
| YÜKSEK | İlk yük: 44 CSS + 76 JS (~802 KB JS + 243 KB CSS) + three.js + chess.js + 3 Firebase + GLTFLoader — tek oyun için gereken kod ilk karttan önce iniyor. | `index.html:132-183, 373-448` | Hub çekirdeği ayrı; her oyunun CSS/JS'i ilk tıkta; three.js yalnızca LEGO World başlarken. |
| YÜKSEK | Tanımsız token: `--font-heading` / `--font-body` 52 yerde kullanılıyor, hiçbir yerde tanımlı değil → `h2`/`button` Fredoka yerine Nunito'ya düşüyor. `--text-muted` de tanımsız. | `hub.css:392,401,433,450,485,494`; `multiplayer.css` (42); `main.css:709-720`; `satranc.css` | `main.css:16` `:root`'a: `--font-heading:'Fredoka','Nunito',sans-serif; --font-body:'Nunito','Segoe UI',sans-serif; --text-muted:#5F6B73;` |
| YÜKSEK | Sınıf çakışması: `.mp-badge` hem meta panelindeki rozet (opacity .45, grayscale) hem online kartlardaki "2 Oyuncu" etiketi. `hub.css` önce yüklendiği için etiket %45 saydam basılıyor. | `hub.css:604-605` vs `multiplayer.css:46-61`; `index.html:134-135`; `app.js:647` | Meta rozetlerini `.meta-badge` yap (`hub.css:604-608` + `bilnet-meta.js`). |
| YÜKSEK | egweblab marka imzası hiçbir sayfada yok (0/83). `assets/logo-96.png` de yok. | `grep -rn "egweblab\|imza"` → 0; `ls assets/` → yalnız `images/ models/` | Aşağıda "Marka imzası durumu". |
| ORTA | Hover/basma dönüşümleri **çalışmıyor**: kartlarda `cardEnter … both` + sonsuz `gentleFloat` animasyonu `transform`'u `:hover`/`:active`'in üstüne yazıyor. Splash düğmesinde aynısı. Çocuk bastığında hiçbir basma tepkisi yok. | `hub.css:236-238` vs `259-268`; `main.css:225-226` vs `245-250` | Süzülmeyi kaldır; giriş animasyonunu `animationend`'de sınıfla düşür veya dönüşümleri `.card-inner`'a uygula. Basma: `:active{transform:scale(.97)}` 120ms `ease-out`. |
| ORTA | 58 kart 0.06s×sıra ile giriyor → son kart ~4 s sonra; sonra sonsuza dek süzülüyor (düşük uçlu tablette sürekli compositing). | `app.js:594, 654`; `hub.css:237-246` | Kademe `min(i,12)*40ms`; sonsuz süzülme yok; `badgePulse` kaldır (`multiplayer.css:61-65`). |
| ORTA | Klavye: online kartlar, popüler kartlar ve jeton çipi `tabindex=0` ama yalnızca `click`. Kilit modalı `role=dialog` ama Escape/odak yönetimi yok. | `app.js:663, 562`; `index.html:246` + `bilnet-meta.js:215`; `app.js:196-247`; `index.html:324` | `app.js:187-189` keydown desenini ortak `bindActivate(el, fn)` yardımcısına çıkar; modallara Escape + odak yönetimi. |
| ORTA | Reduced-motion: global `0.01ms` öldürme anlamlı geri bildirimi de siliyor; yalnızca hub'da. | `animations.css:193-199` | Dekoratif sonsuz animasyonları hedefle; durum geçişlerini 150ms'e indir; oyun sayfalarına da ekle. |
| ORTA | Sistem durumu: "Oynamaya Başla!" auth çözülene kadar sessiz; çevrimdışıyken `firebase.initializeApp` korumasız → `auth.js:9` fırlatıyor; "çevrimdışısın" mesajı yok. | `app.js:352-359`; `firebase-config.js:14`; `auth.js:9`; `app.js:837-838` | `typeof firebase` koruması; çevrimdışı bant; CTA'ya `aria-busy`. |
| ORTA | Yönetim paneli: "Tüm Cihazları Sıfırla" `confirm()` ile korunuyor (iyi); "Tümünü Kilitle" onaysız, oyun ortasındaki çocukları anında hub'a atıyor. Başlık "BilnetOyun" (bitişik). | `admin.js:125, 117-120`; `app.js:862-864`; `admin.html:7,19` | `bulkLocks('lock')`'a onay; cihazda "5 sn içinde kapanacak" uyarısı; ad "Bilnet Oyun". |
| ORTA | Yazı boyutları erken okur için küçük: "Kilitli/Yakında/2 Oyuncu" **9.6px**; kart başlığı ≤340px'te 12px. 4-7 yaş için ≥18px olmalı. | `hub.css:393,434`; `multiplayer.css:53`; `main.css:551`; `responsive.css:213,52` | Rozet ≥12px; kart başlığı `clamp(1rem, 2.6vw, 1.25rem)`. |
| ORTA | Font yükleme: 54 landing sayfası `'Nunito'` bildiriyor, hiçbiri yüklemiyor. `'Orbitron'`, `'Baloo'`, `'Comic Sans MS'` hub'da yüklenmiyor. Hub tek oyun (Altın Avı) için Cinzel×2 + Bebas indiriyor. | `oyunlar/index.html:20`; `egim.css:96`; `buz-kulesi.css:49`, `space-waves.css:42`, `zipla-topla.css:46`; `index.html:131` | Fredoka + Nunito latin-ext self-host (woff2, `font-display: swap`); Comic Sans/Orbitron sil; Cinzel/Bebas'ı Altın Avı açılırken yükle. |
| ORTA | Kopya tutarsızlığı: "20+" (6 yer), "22+", "53" — gerçek 57/58. Yaş: JSON-LD "4-10" derken 22 oyun "8-12 yaş". | `index.html:10,14,46,91,344,369,453`; `lock-catalog.js:16-31` | Tek kaynak: `lock-catalog.js`'e `age`, `subject`, `minutes`. |
| ORTA | Kırık görsel: `zipla-topla-coop.svg` yok, `onerror` yok → online kartta kırık resim. | `app.js:648` | SVG ekle; `img.onerror` ile kategori ikonuna düş. |
| ORTA | Dokunma hedefleri: çipler 36-38px, meta kapatma ~20px, hesap çipi 38px — `--touch-min:52px` tokeni tanımlı ama kullanılmıyor. | `hub.css:39`, `responsive.css:263`; `hub.css:581`; `main.css:353-354, 107` | Çip `min-height:44px`; `#mp-close` 44×44. |
| ORTA | 53 landing sayfası birebir aynı inline `<style>` bloğunu taşıyor, hover/focus yok (0/54), paleti `main.css` tokenlarında yok → ikinci bir görsel dünya. | `oyunlar/*/index.html:57-75` | Tek `css/landing.css` (token'lı, `:hover`/`:focus-visible`/`:active`). |
| DÜŞÜK | Emoji ikon olarak kullanılıyor — Windows/iOS'ta farklı çiziliyor, marka dışı. | `index.html:247,284-295`; `app.js:536-551` | 24px tek çizgi ağırlıklı SVG ikon seti. |
| DÜŞÜK | Hareket dili: `transition: all` ×40; nav hover'da 0.4s `wiggleHover`; `--ease-bounce` overshoot; box-shadow animasyonları. | `hub.css:36,45,236`; `animations.css:79-82,162-165` | Token: `--dur-fast:120ms; --dur-base:200ms; --ease-out:cubic-bezier(.23,1,.32,1)`; yalnız `transform`/`opacity`. |
| DÜŞÜK | Başlık sırası: `h1 → h3` (h2 yok); iki `h1`; ikonlarda `alt` = etiket → ekran okuyucu iki kez okuyor. `html,body{user-select:none}`. | `app.js:678,700`; `index.html:190,234`; `main.css:131` | Bölüm başlıkları `h2`; dekoratif `img`'lerde `alt=""`; `user-select:none` yalnız `.game-area`. |
| DÜŞÜK | Şablon sinyalleri: `#667eea→#764ba2` (uiGradients moru) aktif çipte; sky/cloud/sun/grass CSS sahnesi; 15 inline `style` ile footer. | `hub.css:48`; `games.css:352`; `main.css:436-490`; `index.html:450-467` | Aşağıdaki yön önerileri. |

## Anti-slop / ayırt edicilik — 3 somut yön

1. **"Sınıf rafı" mimarisi.** Konu bölümleri yerine üç yaş rafı (Anaokulu · 1-2. sınıf · 3-4. sınıf); her raf yatay kaydırmalı, kart üstündeki 8px şerit konu rengini taşır. İlk görünüm: çocuğun adı/avatarı + "Sıradaki 3 oyun" büyük "Devam et" karoları — gerçek bir birincil eylem. Öğretmen anahtarı kartlara kazanım etiketi ve süre ekler.
2. **Bilnet mavisi + defter kâğıdı.** Gökyüzü/bulut/çimen sahnesini ve gradyanları kaldır; tek marka mavisi (`theme-color #4AABE0`) + tek sıcak vurgu (yıldız sarısı). Kartlar "ders defteri" yaprağı: kâğıt beyazı, 2px mürekkep kontur, köşede konu renkli sekme; 55 SVG ikon tek çizgi ağırlığına çekilir. Okul logosu üst barda; "Bilnet Okulları" görünür.
3. **Tek tipografik ses.** Yalnız Fredoka (display) + Nunito (metin), self-host, latin-ext. Oyun içi temalı fontlar yalnız o oyunun iframe'inde. Ölçek: kart başlığı 20px, raf başlığı 28px, rozet 12px.

## Hızlı kazanımlar (≤1 saat)

1. `index.html:5` viewport'tan `maximum-scale=1.0, user-scalable=no` sil.
2. `main.css:144` `outline:none` sil; global `:focus-visible` kuralı ekle.
3. `main.css:16` `:root`'a `--font-heading`, `--font-body`, `--text-muted` tanımla.
4. `hub.css:604-608` `.mp-badge` → `.meta-badge` (+ `bilnet-meta.js`).
5. Kontrast renk değişimleri (7 CSS satırı).
6. `assets/images/hub/zipla-topla-coop.svg` ekle; `app.js:648`'e `onerror`.
7. `admin.js:117` `bulkLocks('lock')`'a `confirm()`.
8. MP/popüler kart ve jeton çipine keydown.
9. `hub.css:238` `gentleFloat` kaldır; `app.js:594` kademeyi `min(i,12)*40ms` yap.
10. Sayı kopyasını (20+/22+/53) gerçek sayıya eşitle.
11. `animations.css:193-199` global öldürmeyi dekoratif seçicilerle sınırla.

## Yapısal işler (gün/hafta)

1. Yaş bandı + öğretmen görünümü + arama; `lock-catalog.js`'e `age/subject/minutes`.
2. `css/tokens.css` + `css/landing.css`; 53 inline bloğu ve 300 hex'i token'a indir.
3. Oyun kodunu tıkta yükleme; hub çekirdeği <150 KB.
4. Modal/dialog sistemi (odak tuzağı, Escape, `aria-modal`).
5. Çevrimdışı/Firebase-yok durumu ve CTA yükleniyor hali.
6. Hareket sistemi: 120-250ms, ease-out token, yalnız transform/opacity.
7. Fontları self-host; oyun içi fontları iframe'e taşı.
8. Marka imza bandını tüm sayfa tiplerine ekle.

## Marka imzası durumu

**Yok — 0/83 sayfa.** Hub, `oyunlar/index.html`, 53 landing, 27 oyun sayfası, `admin.html` — hiçbirinde `egweblab`/`.imza` geçmiyor; `assets/logo-96.png` yok; hiçbir CSS'te `@media print` yok. Uygulama notu: `index.html`'de `html,body{overflow:hidden}` (`main.css:125`) yüzünden band `#app`'in altına konursa asla görünmez (mevcut footer'ın başına gelen bu); band `.hub` kaydırma kapsayıcısının sonuna (`index.html:277` sonrası) yerleştirilmeli. Iframe'li oyun sayfalarında ana belgeye değil hub'a ait; bağımsız açılışta görünmesi isteniyorsa oyun belgesinin gövde sonuna eklenir. Stil `css/main.css` token'larıyla (`--text-warm`, `--text-muted`, `--shadow-sm`, `--ease-smooth`) yazılmalı; yükseklik ≤ %2 ölçülerek doğrulanmalı.
