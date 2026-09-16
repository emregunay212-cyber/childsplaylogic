# B6 — three.js r128 tekilleştirme kanıtı (16 Eyl 2026)

## `cmp` sonucu: BİREBİR AYNI (API farkı yok)

```
curl -fsSL https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js -o three.cdnjs.min.js
cmp three.cdnjs.min.js games/kelime-madeni-3d/three.min.js
  → "differ: char 4, line 1"  (yalnız satır sonu: çalışma ağacı CRLF, core.autocrlf=true)
tr -d '\r' < games/kelime-madeni-3d/three.min.js | cmp three.cdnjs.min.js -
  → sessiz (aynı)
```

| | boyut | CR | LF | sha256 (LF hâli) |
|---|---|---|---|---|
| cdnjs `three.js/r128/three.min.js` | 603 445 | 0 | 6 | `9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2` |
| `games/kelime-madeni-3d/three.min.js` (çalışma ağacı) | 603 451 | 6 | 6 | aynı (git blob `i/lf` = cdnjs baytları) |

`git ls-files --eol games/kelime-madeni-3d/three.min.js` → `i/lf w/crlf`: depodaki blob LF, 6 baytlık fark
Windows çalışma ağacının CRLF dönüşümü. İçerik ve `THREE.REVISION = "128"` aynı → **tek kopya** kararı.

## Yapılan

- `js/lib/three.r128.min.js` (yeni; cdnjs indirmesinin değiştirilmemiş kopyası, `js/lib/README.md` tablosunda
  kaynak URL + sha256 + MIT `LICENSES/three.js-r128-MIT.txt`).
- `data/games.json` `lego-world` `files.js[0]` cdnjs URL → `js/lib/three.r128.min.js` (`npm run catalog`).
- `games/kelime-madeni-3d/index.html` `<script src="three.min.js">` → `../../js/lib/three.r128.min.js`;
  `games/kelime-madeni-3d/three.min.js` silindi. Aynı URL → LEGO World açıldıktan sonra Kelime Madeni 3D
  (kapalı oyun, `active:false`) tarayıcı önbelleğinden okur (build `?h=` hash'i iki başvuruda aynı: `d7ea9027d8`).
- Son CDN host'u düştü: `vercel.json` iki CSP `script-src`'den cdnjs çıktı; `tools/build-catalog.js` `CDN_HOSTS = []`
  (dış URL artık şema hatası); `seo/games_data.py` gizlilik üçüncü taraf listesinden cdnjs maddesi silindi
  (`python seo/build_seo.py` → `gizlilik/index.html`).

## Doğrulama (`tests/bridge.spec.js` "three.js r128 tek kopya")

- `/?oyun=lego-world`: `THREE.REVISION === "128"`, `THREE.GLTFLoader` fonksiyon, `js/lib/three.r128.min.js` isteği 1,
  cdnjs/unpkg isteği 0, JS hatası 0.
- `/games/kelime-madeni-3d/` (bağımsız): aynı dosya `../../js/lib/` üzerinden 1 istek, başka three kopyası istenmedi.
- `grep -rn "three.min.js" games/ js/ data/` → yalnız `js/lib` yolu ve yorum satırları (aşağıda).
