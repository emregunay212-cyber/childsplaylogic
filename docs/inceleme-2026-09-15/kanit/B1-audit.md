# B1 — Teknik denetim (impeccable `reference/audit.md`, 5 boyut)

**Kapsam:** hub kabuğu (9 dosya: `css/main.css hub.css landing.css games.css multiplayer.css responsive.css animations.css admin.css imza.css`) + `css/tokens.css` (yeni) + `index.html / admin.html / 404.html / seo/build_seo.py` `<link>` ekleri. 40 oyun CSS'i ve `games/**` kapsam dışı (B1 sözleşmesi).
**Tarih:** 16 Eyl 2026 · **Dal:** `faz2/b1-tokens` (origin/master c2f4a66 üzerine) · **Ölçüm ortamı:** `node tests/static-server.js --port 8766`, Chromium (Playwright 1.63), Lighthouse 13.4.1 (chrome-devtools MCP).
**Yöntem notu:** `impeccable/scripts/impeccable` betiği ÇALIŞTIRILMADI (ikili indirir; kullanıcı kuralı). Aşağıdaki puanlar `reference/audit.md` ölçütleriyle elle verildi; deterministik bulgular grep/Node/Lighthouse çıktısına dayanır, görsel yargı ekran görüntülerine.

## Denetim sağlık puanı

| # | Boyut | Puan | Ana bulgu |
|---|-------|------|-----------|
| 1 | Erişilebilirlik | 4 | Lighthouse a11y **100** (giriş navigation, hub snapshot, landing mobile); tüm metin çiftleri ≥ 4.5:1 (tablo aşağıda); tek odak halkası kuralı; dokunma hedefleri ≥ 44 px (çip/düğme 52 px) |
| 2 | Performans | 3 | Sonsuz dekoratif animasyonlar (güneş nabzı, bulut, CTA halkası, lobi ikonu) B4'e bırakıldı — `infinite` main 8 / hub 1 / games 4 / multiplayer 3; `transition: all` 0; `will-change` yok; hub ilk yükü A9'da ölçülmüştü |
| 3 | Duyarlı tasarım | 3 | 375 ve 1280 kanıtlı; 320'de kart adı 16 px'e iner; ≤640 üst şerit iki satır (çipler 52 px'e çıktığı için `.hub` üst boşluğu 132 px'e ayarlandı); yaş rafı / kart geometrisi (172/152 px) B2b'de |
| 4 | Tema/token | 4 | 9 dosyada ham hex **0**, tüm renk/yazı/yarıçap/süre `css/tokens.css`'ten (24 hex, 169 tanım); semantik katman + köprü katmanı; koyu tema sözleşme gereği yok |
| 5 | Uygulama bütünlüğü | 3 | Tek görsel dünya (gökyüzü + beyaz çıkartma kartı + mürekkep) hub, landing, statik sayfalar ve adminde aynı; şablon moru, "oyuncak kutusu" lobi paleti, admin koyu teması silindi; kalan: emoji ikonlar (çip, kategori başlığı, düğme ikonları — B2b ikon seti), 90 px kart ikonu / eski SVG seti |
| **Toplam** | | **17/20** | **İyi** (Theming ≥ 3 ve toplam ≥ 14 kapısı geçildi) |

### Uygulama bütünlüğü kararı
**Geçti.** Ürüne özgü sistem kodda okunuyor: `docs/tasarim-sozlesmesi.md` §1 token adları birebir `css/tokens.css`'te; bileşenler (birincil/ikincil düğme, çip, rozet, kart, modal) aynı yarıçap/kontur/gölge dilini kullanıyor; landing (`/oyunlar/kelimelik/`) ve `/gizlilik/` hub ile aynı dünyada (`B1-landing-375.png`). Sapma: ikon dili hâlâ emoji + eski hub SVG'leri (B2b kapsamı, burada dokunulmadı).

## Deterministik doğrulama (komut → sonuç)

| Kontrol | Sonuç |
|---|---|
| `grep -ohE '#[0-9a-fA-F]{3,8}\b' css/{9 dosya} \| tr A-F a-f \| sort -u \| wc -l` | **0** (hedef ≤ 24) |
| `grep -oE '#…' css/tokens.css \| sort -u \| wc -l` | **24** (sözleşme §1 ile birebir) |
| `grep -c "transition: all" css/{9 dosya}` | hepsi **0** (önce 17 games + 8 diğer) |
| `grep -rn "667eea\|764ba2\|ease-bounce\|ease-spring" css/{9 dosya}` | boş |
| Ham `font-family: 'Fredoka'/'Nunito'` (9 dosya) | 0 (önce 36) |
| Kullanılan − tanımlı token | yalnız `--cat-color` (js/app.js satır içi verir); oyun CSS'lerinde `--diff-color`, `--sbn-cols` JS'ten gelir (kapsam dışı, önceden de böyleydi) |
| `npm run lint` | 0 hata (43 önceden var olan `no-unused-vars` uyarısı) |
| `npm run catalog:check` | OK |
| `PORT=8765 npm run test:smoke` | **60/60** |
| `python seo/test_build_seo.py` | 42 test OK; `python seo/build_seo.py` ikinci koşuda diff yok |
| `node tools/build.js --out .build-check --check` | OK — idempotent, `?v=` kalıntısı yok; `tokens.css?h=…` her sayfada |
| Lighthouse (`B1-lighthouse.json`) | a11y 100 · best-practices 100 · SEO 100 — `/` giriş (desktop nav), hub misafir (desktop snapshot), `/oyunlar/kelimelik/` (mobile nav) |

## Kontrast tablosu (WCAG 2.x, hesaplanan)

| Ön plan | Zemin | Yer | Oran | Sonuç |
|---|---|---|---|---|
| `--murekkep` #1F3A4D | `--beyaz` | gövde, kart adı, ikincil düğme | 11.86:1 | ✓ |
| `--murekkep-orta` #4E6272 | `--beyaz` | `.top-sub`, `.popular-empty`, ikincil metin, yer tutucu | 6.34:1 | ✓ |
| `--beyaz` | `--mavi-800` #17739F | birincil düğme, "Tümü" çipi, seçili hap | 5.26:1 | ✓ |
| `--mavi-800` | `--beyaz` | ikincil düğme metni, kart içi bağlantı, `.letter-display` | 5.26:1 | ✓ |
| `--murekkep` | `--mavi-500` #4AABE0 | ev karosu simgesi (UI ≥ 3:1) | 4.63:1 | ✓ |
| `--murekkep` | `--gok-ust` #87CEEB | giriş/splash başlığı, landing üst bağlantı + kırıntı + altbilgi | 6.81:1 | ✓ |
| `--murekkep` | `--cim` #7EC850 | imza bandı (hub, çim üstünde; `.hub .imza-band` mürekkep) | 5.80:1 | ✓ |
| `--murekkep` | `--mavi-050` #E8F5FC | "2 Oyuncu" rozeti, meta-stat, landing çipleri | 10.67:1 | ✓ |
| `--murekkep-orta` | `--yildiz-bos` #D7DEE3 | Yakında / Çevrimdışı rozeti, bekleyen sıra | 4.66:1 | ✓ |
| `--murekkep` | `--dogru-zemin` #DFF5E7 | doğru hücre / tuş / sıra rozeti (renk + kenar) | 10.36:1 | ✓ |
| `--murekkep` | yanlış zemin (#C0392B %10 beyazda) | yanlış hücre | 10.22:1 | ✓ |
| `--yanlis` #C0392B | yanlış zemin | `.login-error` metni | 4.69:1 | ✓ |
| `--beyaz` | `--yanlis` | hata toast'ı | 5.44:1 | ✓ |
| `--dogru` #1E8E4E | `--beyaz` | "Harika!" kutlama başlığı (≥ 24 px, eşik 3:1) | 4.17:1 | ✓ (büyük metin) |
| `--murekkep` | `--gunes` #FFD54A | rakip harfi, `.mat-unknown`, seçim vurgusu | 8.40:1 | ✓ |
| `--murekkep` | `--kat-harf` #45B7D1 | hece düğmesi hover (kategori dolgusu) | 5.05:1 | ✓ |
| `--mavi-800` | `--mavi-050` | admin sayaç, mavi zeminde vurgu | 4.74:1 | ✓ |

Reddedilen ve kodda kullanılmayan çiftler (gerekçe): beyaz/mavi-500 2.56:1; mavi-800/gök 3.02:1 ve mürekkep-orta/gök 3.64:1 (landing kırıntı/altbilgi bu yüzden mürekkep); mürekkep-orta/çim 3.10:1; beyaz/doğru 4.17:1 ve doğru/beyaz küçük metin (kelime/harf tahmin hücreleri bu yüzden zemin tonu + mürekkep); beyaz/kategori rengi 2.35:1; beyaz 13 px/kat-online 4.39:1 (tuvaldeki mor "2 oyuncu" rozeti → mavi-050 + mürekkep; **sözleşme sapması, B2b'de tuvalle uzlaştırılmalı**).

## Bulgular (önem sırasıyla)

- **[P2] Sonsuz dekoratif animasyon** — `css/main.css` (güneş nabzı, bulutlar, CTA `pulseGlow`, ok `float`), `css/hub.css` (`sunPulse`), `css/games.css` (`glow`, `pulse`, spinner), `css/multiplayer.css` (`iconFloat`, `dotWave`, `turnPulse`). Kategori: Performans. Etki: boşta hub'da sürekli compositing; hareket azaltmada zaten kapanıyor. Standart: sözleşme §1 "kutlama 600 ms sonra durur". Öneri: B4'te `infinite` → tek seferlik ya da kaldır. Komut: `/impeccable animate`.
- **[P2] Emoji simge kalıntısı** — `.chip-icon` PNG kategori simgeleri, `.coin-icon` 💎, lobi düğme ikonları (🏠 🚪 ⚡), kutlama başlığı öncesi emoji, `.hub .butterfly`. Kategori: Uygulama bütünlüğü. Etki: sözleşme "emoji hiçbir yerde simge değildir" (§2). Öneri: B2b ikon seti (`design/…/categories-v2/*.svg`) + `js/app.js categoryIcons`. Komut: `/impeccable polish`.
- **[P2] Kart geometrisi sözleşmeden farklı** — kart 172/152 px, ikon 128 ızgara, yaş rafı, "Devam et" satırı, öğretmen anahtarı B2b kapsamı; B1 yalnız palet/tipografi/yarıçap/kontur. Kategori: Duyarlı. Komut: `/impeccable layout`.
- **[P3] `css/multiplayer.css` lobi mimarisi** — takma ad serbest metin (§3.08 hazır isim + avatar seçici B5); burada yalnız palet değişti. Komut: `/impeccable shape`.
- **[P3] `404.html` satır içi `<style>` kendi `:root`'unu taşıyor** — `tokens.css` yüklendi ama sayfa eski renk adlarını kullanıyor (§3.12 maskotlu 404 B2b/B3'te). Komut: `/impeccable colorize`.
- **[P3] Köprü katmanı** — 52 `--<oyun>-color` + 21 eski UI adı `tokens.css`'te takma ad olarak duruyor (oyun CSS/JS'leri için). B4'te silinir; yeni kod kullanmaz (`check-tokens` hub dosyalarında 0 köprü kullanımı doğruladı).

## Sistemik gözlemler
- Renk artık 24 primitife bağlı; yeni bir renk gerekiyorsa önce sözleşme değişir, sonra `tokens.css` — dosya başına palet yok.
- `transition` her yerde özellik listesi + `--sure-*` + `--egri-out`; yalnız yıldız yapışması `--egri-yay`.
- Geri bildirim renk + biçim birlikte (doğru: zemin + yeşil kenar/taban; yanlış: zemin + kırmızı kenar; kilit: simge + metin).

## Olumlu bulgular
- Odak halkası tek kural (`:focus-visible` 3 px mavi-800 + 3 px boşluk) hub, landing, admin'de aynı; imza bandı kendi halkasını aynı tonla çizer.
- Tarayıcı yüzeyleri paletten: `::selection` güneş sarısı + mürekkep, `caret-color` mavi-800, yer tutucu mürekkep-orta.
- Hareketi azalt: süre token'ları 150 ms'e iner (0 değil), `--egri-yay` düz ease-out olur; `animations.css` hedefli kuralları korunur.
- Landing ve statik sayfalar `main.css` yüklemeden hub ile aynı dünyada (`tokens.css` + `landing.css`).

## Önerilen komutlar (öncelik sırası)
1. **[P2] `/impeccable animate`** — B4: sonsuz döngüleri kaldır, kutlama 600 ms, basma 120 ms/0,97 tek dil.
2. **[P2] `/impeccable polish`** — B2b: ikon seti, kart anatomisi (172/152 px, 128 ızgara ikon), yaş rafı.
3. **[P3] `/impeccable colorize`** — 404 satır içi stil → `tokens.css` adları.
4. **[P3] `/impeccable polish`** — son geçiş.

## Kanıt dosyaları
`B1-hub-1280.png`, `B1-hub-375.png`, `B1-landing-375.png` (zorunlu üçlü) · `B1-kutlama-1280.png` (seviye tamamlama: birincil "Sonraki", ikincil "Tekrar/Oyunlar", yıldız yapışması) · `B1-kilitli-kart-1280.png` (kilit rozeti + ilerleme, simülasyon: canlı adminConfig kilitleri açık) · `B1-giris-1280.png` (giriş kartı: misafir birincil) · `B1-lobi-375.png` (online lobi paleti) · `B1-online-kartlar-375.png` (2 Oyuncu rozeti, online şeridi) · `B1-admin-1280.png` (açık tema admin) · `B1-lighthouse.json`.
