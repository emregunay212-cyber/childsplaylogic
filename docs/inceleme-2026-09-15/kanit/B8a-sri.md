# B8a görev 2–3 — kütüphane vendor + Firebase SRI kanıtı (16 Eylül 2026)

Dal `faz2/b8a-vendor-sri`. Ajan `engineering-frontend-developer`. Karar 5: **gstatic + SRI** (vendor değil) —
`curl -sI https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js` → `Access-Control-Allow-Origin: *`,
`Cross-Origin-Resource-Policy: cross-origin`, `Cache-Control: public, max-age=31536000` (sürümlü URL değişmez).

## Görev 2 — chess.js ve GLTFLoader yerel

| Dosya | Kaynak | sha256 | Boyut |
|---|---|---|---|
| `js/lib/chess.0.10.3.min.js` | `https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js` | `7aa430df2b9311849040851adef30c4de49f6c8cefdb80645a4262f1f95c445f` | 15 141 B |
| `js/lib/GLTFLoader.r128.js` | `https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js` | `5c15967ba830918a9caea6338712c994c354bccd4edc4569bde411c3ec06a3e6` | 96 550 B |

Lisans metinleri `js/lib/LICENSES/` (chess.js BSD-2 © 2020 Jeff Hlywa; three.js r128 MIT); tablo ve güncelleme
adımları `js/lib/README.md`. `three.min.js` r128 **cdnjs'te kaldı** (B6'da `js/lib/three.r128.min.js` olarak
tekilleşecek; o zaman `vercel.json` CSP `script-src`'den cdnjs ve `tools/build-catalog.js` `CDN_HOSTS` de düşer).

Değişen başvurular: `data/games.json` `satranc` (`files.js` + `online.files.js`) ve `lego-world` → `npm run catalog`
(`js/catalog.js` yenilendi; `index.html` altbilgisi değişmedi). `vercel.json` iki CSP satırından `https://unpkg.com`
düştü. `seo/games_data.py` gizlilik üçüncü taraf listesi: unpkg çıktı, cdnjs "yalnız LEGO World 3D için three.js";
hakkında "Açık kaynak ve lisanslar" paragrafına three.js (MIT) eklendi → `python seo/build_seo.py`
(`gizlilik/index.html`, `hakkinda/index.html` yenilendi). `tools/build-catalog.js` `CDN_HOSTS = ['cdnjs.cloudflare.com']`.
`eslint.config.js` `js/lib/**` zaten ignore'daydı (yorumlar güncellendi).

Playwright (Chromium, `tests/static-server.js --port 8771`, misafir tohumu `tests/helpers/guest-seed.js`):

```
satranc:    Chess=function  console.error=0 pageerror=0 requestfailed=0
            dış istekler: www.gstatic.com/firebasejs/10.14.1/{app,database,auth}-compat.js  (blob: Worker = stockfish)
            yerel js/lib/chess.0.10.3.min.js istendi: true · cdnjs/unpkg isteği: 0
lego-world: THREE=object  THREE.GLTFLoader=function  console.error=0 pageerror=0 requestfailed=0
            dış istekler: gstatic ×3 + cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
            yerel js/lib/GLTFLoader.r128.js istendi: true · unpkg isteği: 0
```

`grep -rn "wikimedia\|cdnjs\|unpkg" index.html admin.html js/ data/ games/ seo/ vercel.json --include=*.js --include=*.json --include=*.html --include=*.py`
→ yalnız: `seo/games_data.py:162` (hakkında Cburnett atfı), three.min.js cdnjs satırları (`data/games.json:773`,
`js/catalog.js:55`, `seo/games_data.py:116` gizlilik listesi, `vercel.json:33,42` CSP) ve
`games/kelime-madeni-3d/index.html:200` (eski kaynak yorumu: "CDN yok — yerel kopya, cdnjs'ten alınmış").

## Görev 3 — Firebase compat SRI (gstatic)

`index.html:147-149` ve `admin.html:13-15` üç `<script>`'e `integrity="sha384-…" crossorigin="anonymous"`
(URL ve sürüm değişmedi). Hash: `curl -fsSL <url> | openssl dgst -sha384 -binary | openssl base64 -A`; Node
`crypto` ile ve `--compressed` ikinci indirmeyle çapraz doğrulandı (aynı değerler).

| Dosya (10.14.1) | sha384 (base64) | Boyut |
|---|---|---|
| `firebase-app-compat.js` | `ZaR6mWzmJtrRibZ1Vm7SoHFr8OXjyAuGAXalGDKqbxFT18oi/z+oZLIRFkpeNor1` | 31 799 B |
| `firebase-database-compat.js` | `g5H2aNdtgRBYOBLsuOAuHvUXWnw4bswmU+tYjmGc1G3JfKxl79uWwV4sQarJsLwu` | 166 145 B |
| `firebase-auth-compat.js` | `I1LYojsZ5RM1cOda44Z2h42Qa6YfsQ1XkXxREnhp4ueYBR/4d1pG1K+NZM537Vsj` | 139 319 B |

`tools/sri-check.js` (yeni, bağımlılıksız Node ≥ 20; `npm run sri:check`; `ci.yml`'de `catalog:check`'ten sonra tek adım;
`.vercelignore`'da): iki HTML'deki `integrity` taşıyan dış script'leri bulur, indirir, integrity'deki algoritmayla
özet hesaplar; uyuşmazlık / `crossorigin` eksik / indirilemedi → çıkış 1 ve dosya:satır + URL; `--print` güncel
hash'leri yazar (yenileme); integrity'siz dış script uyarı (`--strict` ile hata).
`node tools/build.js --out .build-check --check` → OK; `.build-check/index.html` ve `admin.html`'de integrity satırları
aynen duruyor (dış URL'lere dokunulmaz, `dış URL: 13`); `js/catalog.js` yerel yollar `?h=` aldı
(`js/lib/chess.0.10.3.min.js?h=0e4bd44947`, `js/lib/GLTFLoader.r128.js?h=427f1897cd`).

### Negatif test (kasıtlı bozuk integrity → düzelt)

`index.html`'de `firebase-app-compat.js` integrity'si `sha384-AAAA…` yapıldı, hub Playwright ile açıldı, sonra dosya
bayt bayt geri yüklendi:

```
sri-check (bozuk):  exit=1
  [sri] HATA: hash uyuşmuyor: index.html:147 https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js
  [sri] 1 hata, 0 uyarı (6 integrity'li script) — … `node tools/sri-check.js --print` ile yenile
hub (bozuk):        FIREBASE_OK=false  firebase=undefined  offline-banner görünür ("Çevrimdışısın — tek kişilik oyunlar açık")  hub kartları çizildi
  [error]   Failed to find a valid digest in the 'integrity' attribute for resource '…/firebase-app-compat.js'
            with computed SHA-384 integrity 'ZaR6mWzm…Nor1'. The resource has been blocked.
  [warning] Firebase SDK yüklenemedi — çevrimdışı mod (tek kişilik oyunlar açık).      (js/firebase-config.js)
  [warning] Auth: Firebase yok — misafir modunda devam ediliyor (tek kişilik oyunlar açık).
sri-check (düzgün): exit=0 — [sri] check OK — 6 integrity'li dış script doğrulandı
hub (düzgün):       FIREBASE_OK=true  firebase=object  offline-banner gizli  console error 0
```

Ekran görüntüsü: `B8a-sri-bozuk.png` (A4 çevrimdışı bandı hub'ın üstünde). Beklenen davranış doğrulandı: SRI
uyuşmazlığı kırmaz, hub tek kişilik modda açılır; CI `sri:check` bunu görünür kılar.

## Toplu doğrulama

`npm run lint` 0 hata (43 eski uyarı) · `npm run catalog:check` OK · `python seo/test_build_seo.py` 42 test OK ·
`npm run test:build` 7/7 · `npm run test:smoke` 60/60 (kök, `PORT=8771`) · `SITE_ROOT=.build-check PORT=8772 npm run test:smoke` 60/60 ·
`npm run sri:check` 0 · `.build-check` silindi.

## Kalan üçüncü taraf origin'ler (script)

- `www.gstatic.com` — Firebase compat ×3, SRI'lı (`index.html`, `admin.html`); `games/kelimelik/index.html:13-14` ve
  `games/son-kart/index.html:13-14` de app+database compat'i gstatic'ten **SRI'sız** yüklüyor — B6 bunları
  `parent.firebase` köprüsüne alıp silecek (kapsam dışı bırakıldı; `tools/sri-check.js` yalnız iki hub sayfasını tarar).
- `apis.google.com` — Google girişi (CSP'de, Firebase Auth popup akışı).
- `cdnjs.cloudflare.com` — yalnız `three.min.js` r128 (LEGO World), B6'ya kadar.
- Script dışı: `fonts.googleapis.com` / `fonts.gstatic.com` (4 iframe oyunu), `accounts.google.com` (frame-src),
  `*.firebasedatabase.app` / `*.googleapis.com` (connect-src).

## Sapmalar / notlar

- Plan chess.js için "30 KB" diyordu; cdnjs minified 15 KB.
- `js/lib/README.md` sha256 değerleri LF hâlinindir (= git blob). Windows'ta `core.autocrlf=true` çalışma ağacına
  CRLF yazar; doğrulama `git show HEAD:js/lib/<dosya> | sha256sum` ile (README'de yazılı).
- `js/lib/stockfish.js` (GPL-3, 1 Nis 2026'dan beri) README tablosuna eklendi; sürüm dosyada açık değil, GPL metni
  eklenmedi (yalnız bağlantı) — istenirse ayrı iş.
- Port 8765'te başka bir oturumun `tests/static-server.js`'i açıktı (PID 37360, 11:04); dokunulmadı, 8771/8772 kullanıldı.
