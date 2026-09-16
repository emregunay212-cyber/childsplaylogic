# B2b — Teknik denetim (impeccable `reference/audit.md`, 5 boyut) + craft-floor kontrolü

**Kapsam:** hub bilgi mimarisi (`js/app.js` hub çizimi, `js/hub-ia.js`, `js/progress.js` v2, `index.html` üst bar + süzgeçler + Devam et, `css/hub.css main.css responsive.css animations.css`), statik hub `/oyunlar/` (`seo/build_seo.py HUB_TMPL/build_hub`, `css/landing.css`), görseller (`assets/images/hub/*.svg` v2, `assets/images/categories/*.svg`, `assets/maskot/bulut-*.svg`), tek kaynak (`data/games.json shelves`, `tools/build-catalog.js`).
**Tarih:** 16 Eyl 2026 · **Dal:** `faz2/b2b-yas-rafi` (master 1ca0d8e üzerine) · **Ölçüm ortamı:** `node tests/static-server.js --port 8779`, Chromium (Playwright 1.63), Lighthouse 13.4.1 (chrome-devtools MCP).
**Yöntem notu:** `impeccable/scripts/impeccable` betiği ÇALIŞTIRILMADI (ikili indirir; kullanıcı kuralı). `reference/craft-floor.md` inşadan önce okundu ve aşağıdaki "Craft floor" tablosunda madde madde doğrulandı; puanlar `reference/audit.md` ölçütleriyle elle verildi.

## Denetim sağlık puanı

| # | Boyut | Puan | Ana bulgu |
|---|-------|------|-----------|
| 1 | Erişilebilirlik | 4 | Lighthouse a11y **100 × 4** (hub Hepsi, hub öğretmen + arama sonuçları, hub öğretmen + Anaokulu ızgarası, `/oyunlar/` mobile nav); çip grupları `role=radiogroup/radio` + ok tuşları; kartlarda roving tabindex (ray: Sol/Sağ/Home/End, ızgara: + Yukarı/Aşağı); anahtar `role=switch aria-checked`; arama `input[type=search]` + `<label>` + `aria-live` sayaç; yıldız satırı `role=img "3 üzerinden N yıldız"`; boş durumlar `role=status`; tüm yeni metin çiftleri ≥ 4.5:1 (tablo) |
| 2 | Performans | 3 | Kart görselleri `loading=lazy decoding=async` (Hepsi görünümünde 163 kart, 56 tekil SVG); çizim yalnız DOM API (innerHTML yok); arama 120 ms debounce; v2 SVG'ler C2PA `<metadata>` taşıyor: 56 dosya 692 KB (eski set 239 KB), sıkıştırmasız ~12 KB/adet → P2 (aşağıda); yeni animasyon eklenmedi (B4) |
| 3 | Duyarlı tasarım | 4 | 375 / 1024 / 1280 kanıtlı (9 ekran görüntüsü); ray kartı 172 → 168 → 152 px, tek raf ızgarası auto-fill (≤ 640: 2 sütun); üst bar ≤ 640 tek satır (ev/ses 44 px, anahtar yalnız simge); çip satırları yatay kayar; dokunma hedefleri ≥ 44 px (masaüstünde çip 52 px) |
| 4 | Tema/token | 4 | Hub kabuğu 9 dosyada ham hex **0**; kullanılan − tanımlı token farkı **yok** (`--cat-color` de kalktı: kategori şeridi `data-section` → `--kat-*`); `transition: all` 0; tek vurgu (mavi-800 dolgu), tek yarıçap sistemi (hap / 16 / 24) |
| 5 | Uygulama bütünlüğü | 4 | Sözleşme §3.02 birebir: yaş rafı birinci eksen, kategori ikinci, Devam et ilk satır, öğretmen anahtarı; kart §3.03 on durum korunuyor (yakında / yıldız-kilidi / admin-kilidi / çevrimdışı / online rozeti, hiçbiri yalnız renkle değil); emoji ikon kalmadı (v2 kategori SVG, "Tümü/Hepsi" simgesiz); `/oyunlar/` hub ile aynı kart anatomisi (§3.11) |
| **Toplam** | | **19/20** | **Mükemmel** (hedef: Hiyerarşi 4, Erişilebilirlik 4 — ikisi de sağlandı) |

### Uygulama bütünlüğü kararı
**Geçti.** Sistem tek kaynaktan akıyor: `data/games.json shelves` → `GAME_SHELVES` (hub) ve `SHELVES` (Python); raf üyeliği kuralı üç yerde aynı satır (`js/hub-ia.js inShelf`, `tools/build-catalog.js shelvesOf`, `seo/games_data.py shelves_of`) ve `tests/hub-ia.spec.js` beklentileri JSON'dan bağımsız hesaplayıp DOM'la karşılaştırıyor. Sözleşmeden sapmalar aşağıda gerekçeli.

## Craft floor (`reference/craft-floor.md`) kontrolü

| Madde | Sonuç |
|---|---|
| Kontrast (gövde ≥ 4.5:1, büyük ≥ 3:1) | Tablo aşağıda; en düşük çift 5.3:1 (beyaz / mavi-800 dolgu, 15-18 px 600-700) |
| Derinlik (ofset + yumuşak bulanıklık) | Yalnız `--golge-1/2/3` (ofset 2/6/14 px); maskot SVG'de feDropShadow dy 2 / σ 3 |
| Aralık (sıkı gruplar, cömert ayırıcı; başlık üstü > altı) | Raf: başlık üstü 24 px (`.hub-grid gap`), altı 12 px; kart içi 8/8/4/8 px ritmi; tek raf ızgarası 16 px |
| Tip (ölçek/ağırlık adımları, taşma) | 13 (rozet) · 15 (çip) · 16 (gövde) · 18 (arama) · 20 (kart adı) · 24 (raf başlığı); kart adı 2 satır yuvası + clamp, taşan ad kırpılır (…); "Öğretmen görünümü" etiketi ≤ 640 sr-only |
| Hareket (tek yazarlı an) | Yeni animasyon YOK (B4). Mevcut: kart girişi (ilk 12, 40 ms kademe), basma 0,97; anahtar düğmesi `--sure-gecis` ile kayar; reduced-motion `css/animations.css` mevcut kurallarla kapanır |
| Durumlar (hover / devre dışı / yükleniyor / hata / boş) | Boş Devam et (maskot + "Hadi başlayalım!"), boş arama ("Burada bir oyun yok…"), boş raf × kategori (aynı metin), çevrimdışı bant (maskot uyuyan), yakında / kilitli / çevrimdışı kart; yükleniyor: mevcut `.game-loading` (oyun açılışı), hub iskeleti B4/B9 dışı |
| Tarayıcı yüzeyleri | Ray kaydırma çubuğu ince + mavi-800 (`scrollbar-color`, WebKit sözde öğeleri), `input[type=search]` temizle düğmesi mürekkep-orta SVG maske, `::selection` ve `caret-color` B1'den |
| Kopya | Sözleşme sesi: "Devam et · Kaldığın yerden", "Hadi başlayalım! Bir oyun seç, kaldığın yeri burada tutarım.", "Burada bir oyun yok. … Başka bir raf dene.", "Çevrimdışısın, tek kişilik oyunlar açık"; uzun tire (—) hub ve `/oyunlar/` sayfa metninde **0** (test 5.2) |
| Kapsam | Plan B2b görev 1-8 mevcut ve saniyeler içinde bulunabilir (aşağıdaki test listesi) |
| Reddedilenler | Kicker/eyebrow yok (raf başlığı tek `h2`); kart ızgarası dışında kart-içinde-kart yok; monospace yok; gradyan metin yok; emoji ikon yok. **Bilinçli sapma:** Devam et karosunda 8 px SOL şerit (`craft-floor` "1 px üstü renkli border-left" varsayılanını reddeder) — sözleşme §2 "Devam et satırı: sol kenarda kategori şeridi" açıkça istiyor; kart dünyasının 8 px üst şeridinin yatay karoya izdüşümü, dekor değil kategori taşıyıcı |

## Deterministik doğrulama (komut → sonuç)

| Kontrol | Sonuç |
|---|---|
| `npm run lint` | 0 hata (43 önceden var olan `no-unused-vars` uyarısı) |
| `npm run catalog:check` | OK (`js/catalog.js` + `index.html` altbilgi / giriş cümlesi / SEO bloğu JSON ile aynı) |
| `npm run sri:check` | OK (6 integrity'li dış script) |
| `PORT=8781 npm run test:smoke` | **61/61** (56 derin bağlantı + 2 hub kartı Online çipi üzerinden + admin + /oyunlar/ + katalog) |
| `PORT=8781 npm run test:dialog` | **14/14** (kilitli kart seçicisi `.first()`: tetris üç rafta) |
| `PORT=8781 npm run test:hub-ia` | **13/13**; `SITE_ROOT=.build-check` ile de 13/13 + dialog 14/14 |
| `node tools/build.js --out .build-check --check` | OK (498 hash'li başvuru, idempotent; sonra silindi) |
| `python seo/test_build_seo.py` | 42 test OK; `python seo/build_seo.py` ikinci koşuda diff yok |
| Ham hex (9 hub CSS) | **0**; `transition: all` 0; tanımsız token yok |
| İmza bandı oranı | hub 1280 **0,0156**, 375 **0,0148**; `/oyunlar/` 0,0065 / 0,0046 (≤ 0,02) |
| SVG güvenlik taraması (v2 hub 56 + kategori 6) | `<script`, `on*=`, dış `href`/`xlink:href`, `<use`, `<style`, `@import`, `data:` → **0 eşleşme**; `url()` yalnız iç `#id` (gradyan/klip) |
| Lighthouse (`B2b-lighthouse.json`) | a11y **100** × 4; best-practices 100; SEO 100; `/oyunlar/` agentic-browsing 90 (yalnız simüle CLS 0,17; gerçek yüklemede 0,001) |

## Raf başına kart (Hepsi görünümü, data/games.json 16 Eyl 2026)

| Raf | Yaşlar (kapalı) | Kart | Not |
|---|---|---|---|
| Anaokulu | 4-5 | **17** | çıkış kriteri "≤ ~15": 17 (veri; `zipla-topla` ve `penalti` 5-10 yerine 6-10 sayılırsa 15, sahip kararı) |
| 1-2. Sınıf | 6-7 | 44 | |
| 3-4. Sınıf | 8-9 | 55 | |
| 5-6. Sınıf | 10-12 | 47 | |

Toplam kart 163 (58 oyun + kelime-madeni-3d yakında kartı; oyun kestiği her rafta bir kez). Kural: raf `ages` KAPALI tam yaş aralığı (Anaokulu = 4 ve 5 yaş); oyun `age [min,max]` kesişirse girer. Sözleşmedeki "4-6 · 6-8 · 8-10 · 10-12" sınır yaşları iki rafa da sayılsaydı Anaokulu 34 kart olurdu (6 yaş eşiği), kriter kaçardı.

## Kontrast tablosu (WCAG 2.x, hesaplanan)

| Ön plan | Zemin | Yer | Oran |
|---|---|---|---|
| mürekkep #1F3A4D | beyaz | çip, kart adı, raf sayısı, arama metni | 11,9:1 |
| mürekkep-orta #4E6272 | beyaz | çip alt etiketi (4-6 yaş), süre, arama yer tutucu/sayaç, boş durum gövdesi | 6,3:1 |
| beyaz | mavi-800 #17739F | seçili çip, raf başlığı, Devam et başlığı, anahtar rayı | 5,3:1 |
| mürekkep | mavi-050 #E8F5FC | yaş rozeti, kazanım etiketi, 2 Oyuncu, çevrimdışı bandı, boş Devam et | 10,4:1 |
| mavi-800 | beyaz | anahtar etiketi (açık) | 5,3:1 |
| mürekkep-orta | yıldız-boş #D7DEE3 | "Yakında"/"Çevrimdışı" rozeti (B1'den) | 4,7:1 |

## Bulgular

- **[P2] v2 hub SVG'leri C2PA manifesti taşıyor** — `assets/images/hub/*.svg`: 56 dosya 692 KB (eski 239 KB); `<metadata>` bloğu ~8 KB base64/adet, sıkıştırılamaz. Etki: 3G'de kart görselleri geç gelir (sayfa kullanılabilir, `loading=lazy`). Öneri: sahip onayıyla `<metadata>` sıyrılır (görsel değişmez) → `/impeccable optimize`.
- **[P2] `/oyunlar/` simüle CLS 0,17** — Lighthouse mobile navigation, `font-display: swap` yeniden akışı (site geneli, B2b dışı). Öneri: `css/fonts.css`'te yedek yüz `size-adjust` → `/impeccable optimize`.
- **[P3] Kategori çip satırı 1280'de 7. çip kaydırmada** — "Online Çok Oyunculu" bölüm adı uzun; satır yatay kayar (tasarım gereği), tam görünürlük için bölüm adı JSON'da kısaltılabilir ("Online") → `/impeccable distill`.
- **[P3] Öğretmen görünümü 375'te dört süzgeç satırı** — teacher masaüstü personası (brief); telefonda çalışır, sıkışık. → `/impeccable adapt` (katlanır süzgeç) gerekirse.

## Olumlu bulgular
- Tek kaynak disiplini: raflar, bölümler, sayılar (58), oyun adları hub / `/oyunlar/` / `index.html` SEO bloğu / altbilgi girişinde aynı JSON'dan; el ile yazılmış "57" kalıntıları üretici tarafından düzeltildi.
- Her raf kendi kapsamında okunuyor: çocuk "Anaokulu" çipine bir kez basınca 17 kartlık ızgara; öğretmen anahtar + arama ile kazanıma göre 3 hamlede oyun buluyor (ör. "kesir" → 3 sonuç, ad eşleşmesi önde).
- Durumlar korunurken kart anatomisi tek tip: online / solo / kilitli / yakında / çevrimdışı aynı DOM yapısında (`createGameCard` tek yol), `applyLockedState`/`applyOfflineState` değişmedi.

## Önerilen eylemler
1. **[P2] `/impeccable optimize`**: v2 SVG `<metadata>` sıyırma (sahip onayı) + `fonts.css size-adjust`.
2. **[P3] `/impeccable distill`**: "Online Çok Oyunculu" bölüm adı → "Online" (JSON `sections[].title`, altbilgi/SEO metni değişir).
3. **[P3] `/impeccable adapt`**: 375 öğretmen görünümünde katlanır süzgeç.
4. `/impeccable polish` son geçiş (B4 hareket sistemiyle birlikte).

## Ekran görüntüleri
`B2b-hub-{375,1024,1280}.png` (misafir, Hepsi, Devam et dolu) · `B2b-hub-ogretmen-{375,1024,1280}.png` (anahtar açık: ders çipleri, arama, kazanım + süre) · `B2b-oyunlar-{375,1024,1280}.png` (statik hub: süzgeç + ızgara) · `B2b-lighthouse.json`.
