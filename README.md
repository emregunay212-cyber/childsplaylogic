# bilnetoyun.com

> Bilnet Okulları'nın 4-12 yaş için ücretsiz, üyeliksiz, tarayıcıda çalışan eğitici oyun platformu — vanilla HTML/JS/CSS, derleme adımı yok.
> 47 tek kişilik + 11 online = **58 oynanabilir** oyun, 1 kapalı (`data/games.json`: 57 kayıt = 48 solo + 11 online, `kod-macerasi`/`satranc` iki sürümlü; Kelime Madeni 3D `active: false`). Hub dört **yaş rafına** ayrılır (Anaokulu 4-6 · 1-2. Sınıf · 3-4. Sınıf · 5-6. Sınıf; oyun yaş aralığının kestiği her rafta görünür), öğretmen görünümü kazanım + süre + arama ekler (B2b).

Depo: `github.com/emregunay212-cyber/childsplaylogic` · dal `master` · canlı: **Vercel** (`master`'a push = otomatik deploy).
Bu dosya (ve tüm `*.md`) `.vercelignore` ile yayın dışıdır.

## Yapı

| Yol | Ne | Not |
|---|---|---|
| `data/games.json` | **Oyun bilgisinin TEK kaynağı** (B2a): slug, ad, modül, bölüm, ders, yaş, süre, kazanım, metinler, yıldız eşiği, online sürüm, tembel yükleme dosyaları; `sections` = hub bölümleri; `shelves` = yaş rafları (B2b: `ages` kapalı tam yaş aralığı, etiket) | Alan sözlüğü `docs/inceleme-2026-09-15/kanit/B2a-veri-notlari.md`; yayında açık (`/data/games.json`) |
| `tools/build-catalog.js` | JSON → `js/catalog.js` (`GAME_SHELVES/GAME_SECTIONS/GAME_CATALOG/GAME_MODULES`, ÜRETİLMİŞ) + `index.html` altbilgi grupları (`<!-- catalog:start/end -->`), altbilgi giriş cümlesi (`catalog:lead`) ve SEO bloğu (`catalog:seo`: oyun sayıları, raf dağılımı, adlar); şema doğrular; `--check` fark varsa çıkış 1 | `npm run catalog` / `catalog:check`; bağımlılıksız; `.vercelignore` ile yayın dışı |
| `index.html` + `js/app.js` | Hub (SPA). Kayıt defteri `gameCategoryDefs`/`mpGameDefs` `GAME_CATALOG`'dan türetilir — her oyun tembel thunk `{ game: GAME_MODULES[ad], id, levels, files, color: var(--kat-<bölüm>), comingSoon: !active, name, section, subject, age, minutes, teaches }`; `resolveModule()` bozuk modülü yalnız kendi kartından düşürür. Hub çizimi (B2b): yaş rafı çipleri (`bo_shelf`) × kategori çipleri, "Devam et" satırı (Progress v2 `lastPlayed`), öğretmen anahtarı (`bo_teacher`: kazanım + süre + ders çipleri + arama) — sözleşme `CLAUDE.md` | Derin bağlantı: `/?oyun=<slug>` (`tryDeepLink`) |
| `js/games/<id>.js` | Oyun modülü. Ya hub içinde doğrudan çalışır (`const id = '<slug>'`, `init/destroy`) ya da `games/<id>/index.html`'i iframe'e gömen sarmalayıcıdır (örn. `js/games/bilgi-ciftligi.js`) | 62 modül |
| `games/<id>/` | iframe'de çalışan bağımsız tek-dosya oyunlar (27); hepsi `noindex` + canonical `/oyunlar/<id>/` (PR #15) | Bazılarında `kaynak/` + `build.py` ya da `tools/` — üretilen `index.html` elle düzenlenmez |
| `js/lock-catalog.js` | Kilit listesi + yıldız eşikleri (`GAME_CATALOG`'dan türetilir; API aynı: `SOLO_GAMES/ONLINE_GAMES/LOCK_CATALOG/LOCK_STARS_BY_KEY`); hub ve admin paneli bunu okur | Eşik = JSON `stars` / `online.stars`; 0 = açık |
| `js/auth.js`, `js/firebase-config.js`, `js/multiplayer.js`, `js/lobby.js` | Google girişi / misafir modu, `users/{uid}/gameSaves` bulut senkronu (`GAME_SAVE_KEYS`), Firebase **Realtime Database** lobi/oda | Firestore yok |
| `js/bilnet-meta.js` | Eğitsel meta katman: jeton (`DAILY_CAP = 50`), giriş serisi, rozetler — istemci tarafı | |
| `js/hub-ia.js` | Hub bilgi mimarisi yardımcıları (B2b): raf üyeliği (`GAME_SHELVES`), `bo_shelf`/`bo_teacher` tercihleri, aksan + İ/ı duyarsız arama katlaması ve sözcük-başlangıcı eşleşmesi, çip grubu (`role=radiogroup`, ok tuşları) ve kart grubu (roving tabindex; ızgarada Yukarı/Aşağı) klavye | Test `tests/hub-ia.spec.js` |
| `js/dialog.js` | Tek modal/katman API'si (B3): `Dialog.open/close/isOpen/fromKeyboard` — `<dialog>` + `showModal()` (yedek yol: `open` + elle odak döngüsü), kardeşler `inert`, Escape/Tab/odak dönüşü tek yerde; kilit penceresi, meta panel, seviye tamamlama ve hesap menüsü (`modal:false`) bunu kullanır | Sözleşme `CLAUDE.md`; test `tests/dialog.spec.js` |
| `seo/games_data.py` | `GAMES = data/games.json` yükler (`also_online` türetir) + `STATIC_PAGES` (gizlilik/hakkında/iletişim HTML içeriği) | `active: false` → noindex, sitemap/hub dışı |
| `seo/build_seo.py` | Üretici: `oyunlar/<slug>/index.html` (57), `oyunlar/index.html` (B2b §3.11: yaş × kategori süzgeci JS'siz, radio + CSS `:has()`; kartlar hub anatomisinde, kazanım hep açık), `sitemap.xml`, `llms.txt` | **Üretilenler elle düzenlenmez** |
| `css/` | `tokens.css` (tasarım token'ları, B1 — her sayfada ilk stylesheet; kaynak `docs/tasarim-sozlesmesi.md`), `main.css`, `hub.css`, `landing.css`, `games.css`, `multiplayer.css`, `admin.css`, `imza.css` (hub kabuğu: ham hex yok, yalnız `var(--…)`), oyun başına `<slug>.css` (kendi temalı; B1'de dokunulmadı) | |
| `assets/images/hub/<slug>.svg` | Hub kart görselleri v2 (128×128, rx 28, sahne dili; B2b) · `assets/images/categories/*.svg` kategori simgeleri v2 · `assets/maskot/bulut-{mutlu,uyuyan}.svg` maskot (marka onayı bekliyor) | `klavye-kasifi.svg` eski set (v2'si yok) |
| `admin.html` + `js/admin.js` | Öğretmen/yönetici paneli: oyun kilitle-aç, ilerleme sıfırla → RTDB `adminConfig` | |
| `tests/`, `playwright.config.js`, `eslint.config.js`, `.github/workflows/ci.yml` | Lint + Playwright duman testi + CI (PR #19) | |
| `tools/build.js` (+ `tools/lib/`) | Deploy anında içerik hash'li önbellek kırma: her yerel js/css/html başvurusu `?h=<hash>` (A10b). `--out .build-check` kopyaya üretir, `--check` çıktıyı doğrular | Vercel `buildCommand`; bağımlılıksız, Node ≥ 20; `.vercelignore`'a **eklenmez** |
| `js/lib/` | Vendor kütüphaneler, **değiştirilmemiş** kopyalar: `chess.0.10.3.min.js` (BSD-2), `GLTFLoader.r128.js` (MIT), `stockfish.js` (GPL-3); `README.md` kaynak URL + sha256 + lisans tablosu, `LICENSES/` metinler (B8a). three.min.js r128 B6'ya kadar cdnjs'te | Lint dışı; build `?h=` ekler; Firebase SDK vendor değil — gstatic + SRI |
| `tools/sri-check.js` | `index.html`/`admin.html`'deki dış `<script integrity>` hash'lerini indirip yeniden hesaplar; uyuşmazlık → çıkış 1; `--print` güncel değerleri yazar (yenileme) | `npm run sri:check` (CI'da); bağımlılıksız; `.vercelignore` ile yayın dışı |
| `docs/inceleme-2026-09-15/`, `plans/` | 15 Eylül 2026 denetim raporları ve düzeltme blueprint'i | |
| `fabrika/` | Eğitsel olmayan oyunların tek dosyalık satış build'leri (ayrı README) | Yayın dışı |

## Yerel geliştirme

```bash
python server.py                       # http://localhost:8000 — no-store başlıkları, thread'li (BASLAT-SERVER.bat aynı şey)
node tests/static-server.js --port 8765 # bağımlılıksız Node alternatifi (Playwright bunu kullanır)
```

Derleme yok; dosyayı düzenle, sayfayı yenile. Önbellek kırma **deploy anında** olur (A10b): Vercel `node tools/build.js --check` çalıştırır; her yerel js/css/html başvurusuna (`index.html`/`admin.html`/`games/*/index.html` etiketleri, `js/catalog.js` tembel yükleme `files` listeleri, iframe sarmalayıcıları, `games/ates-buz` ES-modül import'ları, `js/lib/stockfish.js`) içerik hash'i `?h=<sha256 ilk 10>` eklenir; js/css `immutable` 1 yıl önbelleklenir. Depodaki `?v=N` etiketleri isteğe bağlıdır — **artık elle artırılmaz**, build ne bulursa hash ile değiştirir.

## Testler

```bash
npm ci                                  # Node 20 (CI ile aynı)
npx playwright install chromium         # ilk kurulumda bir kez
npm run lint                            # eslint js/ games/ tools/ — no-undef hata, no-unused-vars uyarı
npm run catalog:check                   # data/games.json şeması + js/catalog.js ve index.html altbilgisi güncel mi (CI koşar)
npm run sri:check                       # Firebase SDK (gstatic) integrity hash'leri hâlâ doğru mu (CI koşar); yenileme: node tools/sri-check.js --print
npm run build:check                     # deploy simülasyonu: kök → .build-check (hash'li), çıktı doğrulanır (?v= kalıntısı/eski hash = hata)
npm run test:build                      # tools/build.js birim testleri (idempotence, döngü, eksik dosya, --out)
npm run test:smoke                      # her aktif oyun /?oyun=<slug> ile açılır, 3 sn hatasız çalışmalı (61 test)
npm run test:dialog                     # js/dialog.js: dört katmanda odak/Tab/Escape/inert + yedek yol + erişilebilirlik ağacı (14 test, B3)
npm run test:hub-ia                     # hub bilgi mimarisi (B2b): yaş rafı, çipler, öğretmen anahtarı, arama, klavye, kart durumları (sahte Firebase adminConfig), /oyunlar/ süzgeci (13 test)
SITE_ROOT=.build-check PORT=8766 npm run test:smoke   # aynı test hash'li çıktı üzerinde (CI böyle koşar)
python seo/test_build_seo.py            # üretici birim testleri
```

`BASE_URL=https://<vercel-önizleme> npm run test:smoke` dış ortamda koşar. CI (`ci.yml`) her PR'da lint + `catalog:check` + `sri:check` + SEO üretimi tazelik kontrolü (`python seo/build_seo.py && git diff --exit-code -I lastmod …`) + `test:build` + `build:check` + duman, temizlikçi, dialog ve hub bilgi mimarisi testlerini (hash'li çıktı üzerinde) çalıştırır; iş adı `eslint + Playwright duman testi` master'da **required check**tir (branch protection, A10b) — kırmızıyken merge edilemez, force-push ve dal silme kapalı.

## Deploy

- **Site:** `master`'a push → Vercel otomatik deploy. Yapılandırma `vercel.json` (güvenlik başlıkları, CSP **Report-Only**, önbellek, `trailingSlash`; `buildCommand: node tools/build.js --check` yerinde hash ekler, `outputDirectory: "."`, install yok); yayın dışı dosyalar `.vercelignore` (tek kaynak — `firebase.json`'daki ignore listesi Vercel'de geçersiz; `tools/` yayında kalmalı, build oradan koşar). Önbellek: js/css `public, max-age=31536000, immutable` (URL hash'li), görseller 1 hafta, HTML varsayılan (`max-age=0, must-revalidate`).
- **Veritabanı kuralları:** `database.rules.json` → `firebase deploy --only database` (proje `childsplaylogic`, `.firebaserc`). Git Bash'te `MSYS_NO_PATHCONV=1` ön eki şart. `firebase.json` hosting bloğu yalnız isteğe bağlı `childsplaylogic.web.app` yansısı içindir.
- PR akışı: dal → PR → Vercel önizleme → geçit incelemesi → sahip merge'ü (`plans/bilnetoyun-duzeltme-2026-09-15.md` "Değişmezler").

## Yeni oyun ekleme

1. `js/games/<slug>.js` modülü (+ iframe oyunuysa `games/<slug>/index.html`, `css/<slug>.css`); modül adı `eslint.config.js` `gameModuleGlobals` listesine.
2. `data/games.json` `games` dizisine hub sırasında **tek kayıt**: `slug, name, module, section, cat, subject, age [min,max], minutes, levels, teaches, short, about, players, players_range, active, stars, files {js, css}`; online sürüm varsa `online: { module, order, stars, badge?, files? }` (yalnız-online oyunda `module: null`, `section: "online"`). Alan sözlüğü: `docs/inceleme-2026-09-15/kanit/B2a-veri-notlari.md`.
3. `npm run catalog` → `js/catalog.js` + `index.html` altbilgisi yeniden üretilir (şema hatası varsa durur; `index.html`'e başka etiket eklenmez, dosyalar `files` ile tembel yüklenir).
4. `css/hub.css` `.game-card[data-game="<slug>"]::before` kart şeridi (B1 sonrası `var(--kat-<bölüm>)`); `assets/images/hub/<slug>.svg` ikonu; kayıt anahtarları varsa `js/auth.js` `GAME_SAVE_KEYS`; yönerge varsa `js/i18n.js` `TR.instructions`.
5. `python seo/build_seo.py` → `oyunlar/<slug>/`, `oyunlar/index.html`, `sitemap.xml`, `llms.txt` yeniden üretilir (title ≤60 / description ≤150 aşılırsa üretim durur).
6. `npm run lint && npm run catalog:check && npm run test:smoke && python seo/test_build_seo.py` — duman testi slug listesini JSON'dan türetir, yeni oyun otomatik kapsanır.

Oyunu kapatmak: JSON kaydında `active: false` (tek bayrak: hub'da "Yakında" kartı, landing noindex, sitemap/llms/altbilgi dışı, duman testi atlar) → `npm run catalog && python seo/build_seo.py` (örnek: Kelime Madeni 3D).

## Admin paneli

`admin.html` yalnız Firebase Auth'ta tanımlı yönetici e-postasıyla açılır (`js/admin.js` `ADMIN_EMAIL`); sunucu tarafı kapı `database.rules.json` `adminConfig` `.write` kuralıdır — istemci kontrolü yalnız arayüzdür. Sayfa `X-Robots-Tag: noindex` alır (`vercel.json`).

## Güvenlik notları

- RTDB kuralları (PR #13): kök `.read/.write: false`; `lobbies`, `players`, `rooms/*` yalnız anahtar biçimi tutan tekil kayıtlara yazılır (`^[A-Z]{5}$`, `^[A-Z2-9]{4}$`, `^P[a-z0-9]{10,16}$`), lobi sayı alanları tip doğrulamalı; `users/{uid}` yalnız sahibine; `leaderboards/*` yalnız yeni kayıt, `timestamp == now`. Lobi/oda verisi tasarım gereği herkese okunur.
- Firebase'den gelen ad/lobi alanları `innerHTML` öncesi kaçışlanır (PR #16); yeni kod `textContent` ya da `escapeHTML` kullanmalı.
- `vercel.json` CSP **Report-Only** — zorlayıcı moda geçiş A9c'de (27 iframe sayfası satır içi `<script>` taşıyor).
- Üçüncü taraf script (B8a): Firebase compat SDK gstatic'ten `integrity="sha384-…" crossorigin="anonymous"` ile yüklenir (Karar 5: vendor değil, SRI); hash uyuşmazsa tarayıcı script'i engeller, hub A4 çevrimdışı modunda açılır (tek kişilik oyunlar), CI `sri:check` kırmızı olur. chess.js ve GLTFLoader `js/lib/` altında yerel; unpkg CSP'den düştü, cdnjs yalnız three.min.js için (B6'ya kadar).
- Sırlar: `js/firebase-config.js`'teki Firebase web yapılandırması herkese açık istemci anahtarıdır; gizli anahtar, token ya da servis hesabı repoda **bulunmaz**, eklenmez.
- İstemci tarafı temizlikçi (`js/janitor.js`): ücretsiz Spark planında Cloud Functions yok; herkese okunur `lobbies` ve `rooms/*` altında çocuk takma adları birikmesin diye temizliği ziyaretçi tarayıcısı yapar — `createdAt` 24 saatten eski (ya da hiç olmayan) kayıtlar yol başına en çok 60'ar silinir.
- Kapılar: yalnız Firebase açık, çevrimiçi ve üst pencerede; cihaz başına 6 saatte bir (`localStorage bo_janitor_last`); `js/app.js` oturum çözülünce boşta zamanda planlar (`requestIdleCallback`), oyun başlatma yolunda değil; asla fırlatmaz (`[Janitor]` console.info/warn).
- Silme yetkisi mevcut kurallardan gelir (anahtar deseni tutan tekil kayıt); yalnız desene uyan anahtarlar tek çok-yollu `update({k:null})` ile silinir. `database.rules.json` `.indexOn`'a `createdAt` eklendi — `firebase deploy --only database` yapılana kadar sorgu istemcide süzülür (çalışır, SDK "unspecified index" uyarır). Test: `npm run test:janitor` (sahte db, canlıya dokunmaz).

## Belgeler

- `docs/inceleme-2026-09-15/00-OZET.md` — denetim özeti + "Durum 15 Eylül 2026" · `01-guvenlik` … `05-muhendislik`
- `plans/bilnetoyun-duzeltme-2026-09-15.md` — A1–A12 adım durumu, kararlar, kanıt klasörü
- `EGITSEL-FAZ-DURUM.md` (eğitsel seri durumu, "Güncelleme 15 Eylül 2026"), `EGITSEL-OYUN-PLANI.md` (tasarım), `LEGO-WORLD-GAME-SPEC.md` (arşiv)

## Marka imzası (zorunlu)

Her sayfanın en altında egweblab imza bandı bulunur (`css/imza.css`, `.imza-band` — tek bağlantı `https://egweblab.com.tr`, logo `assets/logo-96.png`, yazdırmada gizli, yükseklik ≤ %2). Üretici şablonu landing'lere otomatik ekler; yeni statik sayfa eklerken band elle eklenir — eksik sayfa hata sayılır. Durum: `404.html`, `/oyunlar/` ve 56 landing'de var; hub `index.html` + `admin.html` PR #21 (açık) ile geliyor.
