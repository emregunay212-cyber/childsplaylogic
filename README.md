# bilnetoyun.com

> Bilnet Okulları'nın 4-12 yaş için ücretsiz, üyeliksiz, tarayıcıda çalışan eğitici oyun platformu — vanilla HTML/JS/CSS, derleme adımı yok.
> 46 tek kişilik + 11 online = **57 oynanabilir** oyun, 1 kapalı (`js/lock-catalog.js`: `SOLO_GAMES` 47 + `ONLINE_GAMES` 11; Kelime Madeni 3D `js/app.js:32` `comingSoon: true`).

Depo: `github.com/emregunay212-cyber/childsplaylogic` · dal `master` · canlı: **Vercel** (`master`'a push = otomatik deploy).
Bu dosya (ve tüm `*.md`) `.vercelignore` ile yayın dışıdır.

## Yapı

| Yol | Ne | Not |
|---|---|---|
| `index.html` + `js/app.js` | Hub (SPA). Kayıt defteri `gameCategoryDefs` — her oyun tembel thunk `{ game: () => Modul, color, comingSoon? }`; `resolveEntries()` bozuk modülü yalnız kendi kartından düşürür | Derin bağlantı: `/?oyun=<slug>` (`tryDeepLink`) |
| `js/games/<id>.js` | Oyun modülü. Ya hub içinde doğrudan çalışır (`const id = '<slug>'`, `init/destroy`) ya da `games/<id>/index.html`'i iframe'e gömen sarmalayıcıdır (örn. `js/games/bilgi-ciftligi.js`) | 62 modül |
| `games/<id>/` | iframe'de çalışan bağımsız tek-dosya oyunlar (27); hepsi `noindex` + canonical `/oyunlar/<id>/` (PR #15) | Bazılarında `kaynak/` + `build.py` ya da `tools/` — üretilen `index.html` elle düzenlenmez |
| `js/lock-catalog.js` | **Tüm** oyunların tek listesi + yıldız eşikleri; hub, admin paneli ve duman testi bunu okur | Eşik yoksa 0 = açık |
| `js/auth.js`, `js/firebase-config.js`, `js/multiplayer.js`, `js/lobby.js` | Google girişi / misafir modu, `users/{uid}/gameSaves` bulut senkronu (`GAME_SAVE_KEYS`), Firebase **Realtime Database** lobi/oda | Firestore yok |
| `js/bilnet-meta.js` | Eğitsel meta katman: jeton (`DAILY_CAP = 50`), giriş serisi, rozetler — istemci tarafı | |
| `seo/games_data.py` | **Oyun listesinin tek veri kaynağı** (`GAMES`, `STATIC_PAGES`) | `active=False` → noindex, sitemap/hub dışı |
| `seo/build_seo.py` | Üretici: `oyunlar/<slug>/index.html` (56), `oyunlar/index.html`, `sitemap.xml`, `llms.txt` | **Üretilenler elle düzenlenmez** |
| `css/` | `main.css` (token'lar), `hub.css`, `landing.css`, `imza.css`, oyun başına `<slug>.css` | |
| `assets/images/hub/<slug>.svg` | Hub kart ikonları | |
| `admin.html` + `js/admin.js` | Öğretmen/yönetici paneli: oyun kilitle-aç, ilerleme sıfırla → RTDB `adminConfig` | |
| `tests/`, `playwright.config.js`, `eslint.config.js`, `.github/workflows/ci.yml` | Lint + Playwright duman testi + CI (PR #19) | |
| `tools/build.js` (+ `tools/lib/`) | Deploy anında içerik hash'li önbellek kırma: her yerel js/css/html başvurusu `?h=<hash>` (A10b). `--out .build-check` kopyaya üretir, `--check` çıktıyı doğrular | Vercel `buildCommand`; bağımlılıksız, Node ≥ 20; `.vercelignore`'a **eklenmez** |
| `docs/inceleme-2026-09-15/`, `plans/` | 15 Eylül 2026 denetim raporları ve düzeltme blueprint'i | |
| `fabrika/` | Eğitsel olmayan oyunların tek dosyalık satış build'leri (ayrı README) | Yayın dışı |

## Yerel geliştirme

```bash
python server.py                       # http://localhost:8000 — no-store başlıkları, thread'li (BASLAT-SERVER.bat aynı şey)
node tests/static-server.js --port 8765 # bağımlılıksız Node alternatifi (Playwright bunu kullanır)
```

Derleme yok; dosyayı düzenle, sayfayı yenile. Önbellek kırma **deploy anında** olur (A10b): Vercel `node tools/build.js --check` çalıştırır; her yerel js/css/html başvurusuna (`index.html`/`admin.html`/`games/*/index.html` etiketleri, `js/app.js` kayıt defteri `files`, iframe sarmalayıcıları, `games/ates-buz` ES-modül import'ları, `js/lib/stockfish.js`) içerik hash'i `?h=<sha256 ilk 10>` eklenir; js/css `immutable` 1 yıl önbelleklenir. Depodaki `?v=N` etiketleri isteğe bağlıdır — **artık elle artırılmaz**, build ne bulursa hash ile değiştirir.

## Testler

```bash
npm ci                                  # Node 20 (CI ile aynı)
npx playwright install chromium         # ilk kurulumda bir kez
npm run lint                            # eslint js/ games/ tools/ — no-undef hata, no-unused-vars uyarı
npm run build:check                     # deploy simülasyonu: kök → .build-check (hash'li), çıktı doğrulanır (?v= kalıntısı/eski hash = hata)
npm run test:build                      # tools/build.js birim testleri (idempotence, döngü, eksik dosya, --out)
npm run test:smoke                      # her aktif oyun /?oyun=<slug> ile açılır, 3 sn hatasız çalışmalı (60 test)
SITE_ROOT=.build-check PORT=8766 npm run test:smoke   # aynı test hash'li çıktı üzerinde (CI böyle koşar)
python seo/test_build_seo.py            # üretici birim testleri
```

`BASE_URL=https://<vercel-önizleme> npm run test:smoke` dış ortamda koşar. CI (`ci.yml`) her PR'da lint + `test:build` + `build:check` + duman testini (hash'li çıktı üzerinde) çalıştırır; iş adı `eslint + Playwright duman testi` master'da **required check**tir (branch protection, A10b) — kırmızıyken merge edilemez, force-push ve dal silme kapalı.

## Deploy

- **Site:** `master`'a push → Vercel otomatik deploy. Yapılandırma `vercel.json` (güvenlik başlıkları, CSP **Report-Only**, önbellek, `trailingSlash`; `buildCommand: node tools/build.js --check` yerinde hash ekler, `outputDirectory: "."`, install yok); yayın dışı dosyalar `.vercelignore` (tek kaynak — `firebase.json`'daki ignore listesi Vercel'de geçersiz; `tools/` yayında kalmalı, build oradan koşar). Önbellek: js/css `public, max-age=31536000, immutable` (URL hash'li), görseller 1 hafta, HTML varsayılan (`max-age=0, must-revalidate`).
- **Veritabanı kuralları:** `database.rules.json` → `firebase deploy --only database` (proje `childsplaylogic`, `.firebaserc`). Git Bash'te `MSYS_NO_PATHCONV=1` ön eki şart. `firebase.json` hosting bloğu yalnız isteğe bağlı `childsplaylogic.web.app` yansısı içindir.
- PR akışı: dal → PR → Vercel önizleme → geçit incelemesi → sahip merge'ü (`plans/bilnetoyun-duzeltme-2026-09-15.md` "Değişmezler").

## Yeni oyun ekleme

1. `js/games/<slug>.js` modülü (+ iframe oyunuysa `games/<slug>/index.html`, `css/<slug>.css`).
2. `index.html`'e `<link>`/`<script>` etiketi; `js/app.js` `gameCategoryDefs` içine `{ game: () => Modul, color: 'var(--<slug>-color)' }`; `js/i18n.js` `TR.games['<slug>']` adı; `css/main.css` renk değişkeni, `css/hub.css` kart şeridi.
3. `js/lock-catalog.js` → `SOLO_GAMES` ya da `ONLINE_GAMES` (hub sırasına göre; eşik gerekiyorsa `STARS_BY_KEY`).
4. `assets/images/hub/<slug>.svg` ikonu; kayıt anahtarları varsa `js/auth.js` `GAME_SAVE_KEYS`.
5. `seo/games_data.py` `GAMES` kaydı (`slug, name, cat, age, players, teaches, short, about`; online sürüm varsa `also_online=True`).
6. `python seo/build_seo.py` → `oyunlar/<slug>/`, `oyunlar/index.html`, `sitemap.xml`, `llms.txt` yeniden üretilir (title ≤60 / description ≤150 aşılırsa üretim durur).
7. `npm run lint && npm run test:smoke && python seo/test_build_seo.py` — duman testi slug listesini kataloğdan türetir, yeni oyun otomatik kapsanır.

Oyunu kapatmak: `js/app.js` kaydına `comingSoon: true`, `games_data.py`'de `active=False`, üreticiyi tekrar çalıştır (örnek: Kelime Madeni 3D).

## Admin paneli

`admin.html` yalnız Firebase Auth'ta tanımlı yönetici e-postasıyla açılır (`js/admin.js` `ADMIN_EMAIL`); sunucu tarafı kapı `database.rules.json` `adminConfig` `.write` kuralıdır — istemci kontrolü yalnız arayüzdür. Sayfa `X-Robots-Tag: noindex` alır (`vercel.json`).

## Güvenlik notları

- RTDB kuralları (PR #13): kök `.read/.write: false`; `lobbies`, `players`, `rooms/*` yalnız anahtar biçimi tutan tekil kayıtlara yazılır (`^[A-Z]{5}$`, `^[A-Z2-9]{4}$`, `^P[a-z0-9]{10,16}$`), lobi sayı alanları tip doğrulamalı; `users/{uid}` yalnız sahibine; `leaderboards/*` yalnız yeni kayıt, `timestamp == now`. Lobi/oda verisi tasarım gereği herkese okunur.
- Firebase'den gelen ad/lobi alanları `innerHTML` öncesi kaçışlanır (PR #16); yeni kod `textContent` ya da `escapeHTML` kullanmalı.
- `vercel.json` CSP **Report-Only** — zorlayıcı moda geçiş A9c'de (27 iframe sayfası satır içi `<script>` taşıyor).
- Sırlar: `js/firebase-config.js`'teki Firebase web yapılandırması herkese açık istemci anahtarıdır; gizli anahtar, token ya da servis hesabı repoda **bulunmaz**, eklenmez.

## Belgeler

- `docs/inceleme-2026-09-15/00-OZET.md` — denetim özeti + "Durum 15 Eylül 2026" · `01-guvenlik` … `05-muhendislik`
- `plans/bilnetoyun-duzeltme-2026-09-15.md` — A1–A12 adım durumu, kararlar, kanıt klasörü
- `EGITSEL-FAZ-DURUM.md` (eğitsel seri durumu, "Güncelleme 15 Eylül 2026"), `EGITSEL-OYUN-PLANI.md` (tasarım), `LEGO-WORLD-GAME-SPEC.md` (arşiv)

## Marka imzası (zorunlu)

Her sayfanın en altında egweblab imza bandı bulunur (`css/imza.css`, `.imza-band` — tek bağlantı `https://egweblab.com.tr`, logo `assets/logo-96.png`, yazdırmada gizli, yükseklik ≤ %2). Üretici şablonu landing'lere otomatik ekler; yeni statik sayfa eklerken band elle eklenir — eksik sayfa hata sayılır. Durum: `404.html`, `/oyunlar/` ve 56 landing'de var; hub `index.html` + `admin.html` PR #21 (açık) ile geliyor.
