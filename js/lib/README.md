# `js/lib/` — vendor kütüphaneler

Üçüncü taraf JavaScript dosyalarının **değiştirilmemiş** kopyaları. Dosyalara yorum satırı bile eklenmez
(bütünlük: sha256 kaynak indirmeyle birebir); kaynak, sürüm, lisans ve özet **bu dosyada** tutulur.
Lisans metinleri `LICENSES/` altındadır (dosyaların kendisi lisans başlığı taşımıyor; BSD-2/MIT dağıtımda
metnin bulunmasını ister). `*.md` yayına çıkmaz (`.vercelignore`); `LICENSES/*.txt` siteyle birlikte yayınlanır.

`eslint` bu klasörü taramaz (`eslint.config.js` ignores `js/lib/**`); `tools/build.js` `?v=` kalıntı taramasında
vendor sayar (`VENDOR_RE`) ama başvuruları yine `?h=<hash>` ile önbellek-kırar (`js/catalog.js` `files`,
`js/games/satranc-engine.js` `new URL('js/lib/stockfish.js', …)`).

| Dosya | Sürüm | Kaynak URL | Lisans | sha256 (LF hâli = git blob) | İndirme |
|---|---|---|---|---|---|
| `chess.0.10.3.min.js` | chess.js 0.10.3 | `https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js` | BSD-2-Clause (`LICENSES/chess.js-0.10.3-BSD-2-Clause.txt`, © 2020 Jeff Hlywa) | `7aa430df2b9311849040851adef30c4de49f6c8cefdb80645a4262f1f95c445f` | 16 Eyl 2026 (B8a) |
| `three.r128.min.js` | three.js r128 (`build/three.min.js`) | `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` | MIT (`LICENSES/three.js-r128-MIT.txt`, © 2010-2021 three.js authors) | `9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2` | 16 Eyl 2026 (B6; `games/kelime-madeni-3d/three.min.js` ile `cmp` birebirdi, o kopya silindi) |
| `GLTFLoader.r128.js` | three.js r128 (`examples/js/loaders/GLTFLoader.js`) | `https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js` | MIT (`LICENSES/three.js-r128-MIT.txt`, © 2010-2021 three.js authors) | `5c15967ba830918a9caea6338712c994c354bccd4edc4569bde411c3ec06a3e6` | 16 Eyl 2026 (B8a) |
| `stockfish.js` | niklasf/stockfish.js çok-varyantlı saf-JS derlemesi (asm.js, WASM yok); sürüm dosyada açık değil | `https://github.com/niklasf/stockfish.js` (dosya başlığı) | GPL-3.0 (bildirim dosya başlığında; metin: <https://www.gnu.org/licenses/gpl-3.0.txt>) | `723fda70117bfa8d5053a7bc4ae50cdc96dc9e3fd41b57627e4dfa0a0025957a` | 1 Nis 2026 (`e4b1cc2`) |

Kullanan yerler: `chess.0.10.3.min.js` → `data/games.json` `satranc` (`files.js` + `online.files.js`), global `Chess`;
`three.r128.min.js` → `data/games.json` `lego-world` (`files.js` ilk sırada, global `THREE`) **ve**
`games/kelime-madeni-3d/index.html` (`../../js/lib/three.r128.min.js`; aynı URL → tarayıcı önbelleği paylaşılır);
`GLTFLoader.r128.js` → `lego-world`, `THREE.GLTFLoader`; `stockfish.js` → `js/games/satranc-engine.js` (Blob Worker).
Dış script origin'i artık yalnız gstatic (+ `apis.google.com` auth): `tools/build-catalog.js` `CDN_HOSTS = []`, dış URL
kabul edilmez; `vercel.json` CSP `script-src`'de cdnjs yok (B6).

## Doğrulama

```bash
git show HEAD:js/lib/chess.0.10.3.min.js | sha256sum      # her platformda (git blob = LF hâli)
sha256sum js/lib/GLTFLoader.r128.js                        # Linux/CI çalışma ağacında aynı değer
```

Windows'ta `core.autocrlf=true` çalışma ağacına CRLF yazar; `sha256sum` orada farklı çıkar — `git show` ya da
`tr -d '\r' < dosya | sha256sum` kullan (kaynak dosyalarda hiç CR yok, dönüşüm kayıpsız).

## Güncelleme

1. Yeni sürümü **aynı biçimde** indir: `curl -fsSL <kaynak URL> -o js/lib/<ad.sürüm.js>` — dosyaya dokunma.
2. Bu tabloya satır ekle/güncelle (sürüm, URL, lisans, `sha256sum`, tarih); lisans değiştiyse `LICENSES/`'a yeni metin.
3. Başvuruları güncelle: `data/games.json` → `npm run catalog`; iframe/engine yolları elle.
4. `npm run lint && npm run catalog:check && npm run test:smoke`.

Firebase compat SDK'sı vendor **değil**: gstatic'ten `integrity` (SRI, sha384) + `crossorigin="anonymous"` ile yüklenir
(`index.html`, `admin.html`); hash denetimi `npm run sri:check` (`tools/sri-check.js`, CI'da). Karar 5, 16 Eyl 2026.
