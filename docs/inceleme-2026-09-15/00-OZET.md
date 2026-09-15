# bilnetoyun.com İnceleme — Yönetici Özeti

**Tarih:** 15 Eylül 2026 · **Kapsam:** depo `childsplaylogic` (236 commit, son 13 Eylül) + canlı site · **Yöntem:** ECC × Agency protokolü — beş uzman ajan (güvenlik, gerçeklik kontrolü, arayüz/UX, SEO, mühendislik) salt-okunur denetim yaptı; koordinatör tarayıcı ve `curl` ile canlıdan kanıt topladı. Hiçbir site dosyası değiştirilmedi (yalnız `.vercelignore`'a `docs/` ve `plans/` eklendi — bu raporların yayına çıkmaması için).

**Genel karar (reality-checker): NEEDS WORK.** 57 oyun teknik olarak çalışıyor, sitemap ve iç bağlantılar sağlam, takip aracı yok (olumlu). Ama site yanlış hosting varsayımıyla yayında, veritabanı herkese yazılabilir, çocuk isimleri anonim indirilebilir, arayüz erişilebilirlik eşiğinin altında ve belgeler gerçeği anlatmıyor.

## En kritik 7 bulgu

| # | Bulgu | Etki | Rapor |
|---|---|---|---|
| 1 | **Firebase veritabanı `lobbies`/`players`/`rooms` düğümleri kimliksiz yazma/silmeye açık.** Canlıda 1.480 eski lobi ve ~700 odada çocuk isimleri anonim okunabiliyor. | Tek istekle tüm lobiler silinebilir; spam/fatura; KVKK riski | 01 KRİTİK |
| 2 | **Canlı site Vercel'de, `firebase.json` geçersiz.** Güvenlik başlıkları yok; `server/ws-server.js`, `database.rules.json`, soru bankası `_bank_tmp.txt`, planlama `.md` dosyaları herkese açık (HTTP 200 doğrulandı). | Bilgi ifşası, clickjacking, MIME sniffing | 01, 02, 04 |
| 3 | **Depolanmış XSS:** rakip adı ve lobi alanları 4 dosyada ham `innerHTML`. | Lobi listesini açan her çocuğun tarayıcısında kod çalışır | 01 YÜKSEK |
| 4 | **Hub tek hata noktası:** Firebase SDK yüklenmezse (okul filtresi) site boş; tek bozuk oyun scripti tüm hub'ı öldürür; bozuk localStorage açılışı engeller. | Filtreli ağlarda site çalışmaz | 05 YÜKSEK |
| 5 | **Ana sayfa 802 KB JS + 243 KB CSS + ~1.4 MB CDN'i tek seferde yüklüyor, 0 `defer`;** Vercel'de önbellek yok. | Mobilde yavaş ilk boya, CWV kırmızı | 04 P0, 05 |
| 6 | **Erişilebilirlik:** zoom kilidi, tüm düğmelerde odak halkası kapalı, 7 kontrast ihlali, klavyeyle açılamayan kartlar. Hover/basma tepkileri animasyon yüzünden hiç çalışmıyor. | WCAG ihlali; çocuk bastığında tepki yok | 03 YÜKSEK |
| 7 | **SEO:** ana sayfa ızgarasında `href` yok (42 oyuna link akmıyor), 27 iframe sayfası indexlenebilir, title/description şablonu uzun, gizlilik/KVKK sayfası yok, "Bilnet Okulları" hiçbir yerde geçmiyor. Skor ~58/100. | Görünürlük ve güven kaybı | 04 |

## Sayılarla

- Oyun: **57 oynanabilir** (46 solo + 11 online) + 1 kapalı (Kelime Madeni 3D — belge "canlıda" diyor, kod "yakında"). Yetim: `son-kart`, `hava-hokeyi`, `zipla-topla-coop` (SEO sayfası/sitemap yok); `zipla-topla-coop.svg` canlıda 404.
- Kod: 300 farklı renk, 16 font bildirimi, 52 tanımsız token; `tone()` 20 dosyada birebir kopya; 8 dosya >800 satır; test 0, lint 0.
- Belge: durum dosyası 13 Haziran'da donmuş; sonraki 9 commit yok; "Definition of Done" 8 kutu boş ama 20 oyun ✅.
- egweblab imzası: **0/83 sayfa** (global kural gereği zorunlu).

## Ne yapılacak — plan

Düzeltmeler 12 adımlık bir blueprint'e dönüştürüldü: [`plans/bilnetoyun-duzeltme-2026-09-15.md`](../../plans/bilnetoyun-duzeltme-2026-09-15.md). İlk dört adım (Vercel yapılandırması, veritabanı kuralları, XSS, hub dayanıklılığı) birbirinden bağımsız ve **paralel** yürütülebilir; toplam ~11 saat. Sonrası seri: UX hızlı kazanımlar → SEO → imza bandı → gizlilik sayfaları → tembel yükleme → araçlar → temizlik/belge → Faz 2 (bilgi mimarisi, ayrı plan).

Her adım tek PR, Vercel önizlemede doğrulanır, kabul geçidinden (reality-checker → evidence-collector → security auditor) geçmeden merge edilmez.

## Kullanıcıdan karar bekleyenler

1. Firebase planı (Spark/Blaze) ve günlük veri temizliği için Cloud Function istenip istenmediği.
2. KVKK aydınlatma metni ve okulun resmî site / sosyal hesap adresleri.
3. Firebase Hosting yansısı (`childsplaylogic.web.app`) kullanılmaya devam edecek mi.
4. CSP zorlayıcı moda geçiş zamanı (önce Report-Only ile ölçüm).

## Raporlar

- [01-guvenlik.md](01-guvenlik.md) — kural taslağı, `vercel.json`, `.vercelignore` dahil
- [02-gerceklik-kontrolu.md](02-gerceklik-kontrolu.md) — 56 oyunluk envanter tablosu
- [03-arayuz-ux.md](03-arayuz-ux.md) — puan kartı, 11 hızlı kazanım, 3 tasarım yönü
- [04-seo.md](04-seo.md) — sayfa-başı meta tablosu, JSON-LD örneği
- [05-muhendislik.md](05-muhendislik.md) — mimari haritası, 5 refactor

## Kanıt (koordinatör, canlı)

- `Server: Vercel`; tek güvenlik başlığı HSTS; `/bu-sayfa-yok-123` → 404 (İngilizce jenerik sayfa).
- `curl` 200: `/server/ws-server.js`, `/server/package.json`, `/BASLAT-SERVER.bat`, `/EGITSEL-OYUN-PLANI.md`, `/_bank_tmp.txt`, `/database.rules.json`, `/firebase.json`.
- Konsol: `assets/images/hub/zipla-topla-coop.svg` 404 (hub ve Son Kart sayfasında).
- Ekran görüntüleri: masaüstü hub (giriş kartı → 4 sütun ızgara), mobil 375px (3 satırlık yapışkan üst bar ~160px, "Hadi Başlayalım" başlığı altında kalıyor), Son Kart menüsü. Dosya olarak kaydedilmedi; A6 adımında `kanit/` klasörüne alınacak.

## Durum 15 Eylül 2026 (öğleden sonra)

Sabahki bulguların 8 PR'ı `master`'da (`gh pr list --state all`; HEAD `258202c` = PR #19 merge). Aşağıdaki maddeler **merge edilmiş kodu** anlatır; canlı `curl` doğrulaması bu belgede tekrar yapılmadı (A1 PR gövdesindeki önizleme doğrulaması esas).

| Bulgu | Şimdi | PR |
|---|---|---|
| 1 RTDB herkese yazılabilir | `lobbies`/`players`/`rooms/*` koleksiyon-düzeyi `.write:true` kaldırıldı; anahtar biçimi (`^[A-Z]{5}$`, `^[A-Z2-9]{4}$`, `^P[a-z0-9]{10,16}$`) ve sayı tipi doğrulaması; `leaderboards/tetris` eklendi. Kurallar canlıda (`firebase deploy --only database`). **Eski veri temizliği yapılmadı — sahip onayında.** | #13 merged |
| 2 Vercel'de başlık yok, dahili dosyalar açık | `vercel.json`: nosniff, `X-Frame-Options`, Referrer-Policy, Permissions-Policy, HSTS, **CSP Report-Only**, js/css 1 saat / görsel 1 hafta önbellek, `trailingSlash`; `.vercelignore`: `*.md`, `*.py`, `seo/`, `docs/`, `plans/`, `tests/`, `.github/`, `database.rules.json`, `firebase.json` … yayın dışı; Türkçe `404.html`. `server/` ve `_bank_tmp.txt` repodan silindi. | #12, #14 merged |
| 3 Depolanmış XSS | Oyuncu adları ve lobi alanları `innerHTML` öncesi kaçışlanıyor (`0c44fa0`). | #16 merged |
| 4 Hub tek hata noktası | Kayıt defteri tembel thunk (`js/app.js` `resolveEntries`): bozuk modül yalnız kendi kartını düşürür; Firebase yoksa misafir moduna düşüş; bozuk `localStorage` ilerleme kurtarma; sıfırlama × bulut senkron yarışı. | #18 merged |
| 7 SEO | `seo/games_data.py` tek veri kaynağı (56 kayıt, 1 `active=False`); `@graph` JSON-LD; title ≤60 / description ≤150; `son-kart`, `hava-hokeyi`, `zipla-topla-coop` landing'leri; sitemap 57 `<loc>`; `llms.txt` üretiliyor; 27 iframe `games/*/index.html` `noindex` + canonical. Ana sayfa title/description/footer → PR #21 (açık). | #17, #15 merged |
| Test/CI yok | `npm run lint` (eslint flat config, 0 hata / 44 uyarı), `npm run test:smoke` (Playwright, **60/60**: 46 solo + 9 online derin bağlantı + 2 online hub yolu + admin + `/oyunlar/` + katalog), GitHub Actions her PR'da. | #19 merged |
| 6 Erişilebilirlik · egweblab imzası 0/83 | İmza: `404.html`, `/oyunlar/` hub ve 56 landing'de (`css/imza.css`, üretici şablonu). Hub `index.html` + `admin.html` imzası, zoom kilidi, `:focus-visible`, 7 kontrast, klavye, `zipla-topla-coop.svg`, Lighthouse Erişilebilirlik 100 (`kanit/`) → **PR #21 açık**, geçit incelemesi sürüyor. | #12, #17 merged · #21 açık |
| Gizlilik/KVKK sayfası yok | `/gizlilik/`, `/hakkinda/`, `/iletisim/` üreticiden (`STATIC_PAGES`), sitemap 60 → **PR #20 açık**; metin okul onayı bekliyor. | #20 açık |
| 5 Performans (802 KB JS, 0 defer) | **Değişmedi** — A9a/b/c PR #21 sonrası. | — |
| Belgeler gerçeği anlatmıyor | `EGITSEL-FAZ-DURUM.md` "Güncelleme 15 Eylül 2026", `EGITSEL-OYUN-PLANI.md` §3.4/§4.16/§6.2/§6.3/DoD notları, `LEGO-WORLD-GAME-SPEC.md` arşiv bandı, kök `README.md`, plan durumu. | A11b (bu commit) |

Karar bekleyenler listesine eklenenler: RTDB eski veri temizlik komutu (sahip), KVKK metni gözden geçirme (okul), iki cihazlı Google sıfırlama testi — bkz. `plans/bilnetoyun-duzeltme-2026-09-15.md` "Karar gerektiren noktalar" 6-8.
