# Fabrika — Tek Dosyalık Satış Build'leri

Hub'daki eğitsel olmayan oyunların portal-satışına hazır, tek dosyalık HTML sürümleri.
Spesifikasyon: `EGITSEL-OYUN-FABRIKASI/CLAUDE.md` (tek dosya < 2 MB, offline, CDN yok,
tarayıcı kalıcı deposu yok → SDK_STORAGE soyutlaması, SDK soketleri, TR+EN STRINGS).

## Ürünler (12 build, 7 oyun)

| Oyun | TR | EN | Boyut | Mod |
|---|---|---|---|---|
| Buz Kulesi | `buz-kulesi-tr.html` | `frost-climber-en.html` | 65 KB | Solo sonsuz |
| Eğim | `egim-tr.html` | `rolling-rush-en.html` | 73 KB | Solo sonsuz |
| Blok Yağmuru | `blok-yagmuru-tr.html` | `block-rain-en.html` | 66 KB | Solo sonsuz |
| Penaltı | `penalti-tr.html` | `penalty-hero-en.html` | 55 KB | 9 bölüm |
| Zıpla Topla | `zipla-topla-tr.html` | `hop-and-grab-en.html` | 100 KB | 12 bölüm, solo + yerel 2P |
| Zindan Okçusu | `zindan-okcusu-tr.html` | — (EN çevirisi bekliyor) | 470 KB | Roguelite |
| Ateş & Buz | `ates-buz-tr.html` | — | 556 KB | Yerel 2P co-op, 10 bölüm |

## Kullanım

```bash
# Tek oyun derle + doğrula
python fabrika/tools/build.py buz-kulesi

# Hepsi
python fabrika/tools/build.py all
```

Validator her build'de şunları garanti eder: boyut < 2 MB, sıfır dış referans
(http src/href, fetch, XHR, firebase, CDN), doğrudan tarayıcı-deposu çağrısı yok,
ESM import kalıntısı yok, gömülü script'ler node ile syntax-temiz, oyun-özel
yasaklı kelimeler (`forbiddenWords`) çıktıda yok.

## Yapı

- `shims/core.js` — SDK soketleri + Storage soyutlaması + T()/STRINGS (tek kaynak)
- `templates/shell.html` — hub-modülü oyunlar için standalone kabuk (menü, bölüm seçimi, bölüm-sonu)
- `src/<oyun>/` — dönüştürülmüş kaynak + `strings.json` + `config.json`
- `tools/` — build.py, bundle_esm.py (Ateş&Buz 21-dosya birleştirici), optimize_png.py, validate.py
- `build/` — tek dosyalık çıktılar
- `dist/<oyun>/` — satış paketi: build + `pitch.md` + `screenshots/`

Bu klasör canlıya çıkmaz: `firebase.json` hosting.ignore + `.vercelignore` içinde.

## Otomatik doğrulanan QA (bu makinede yapıldı)

- [x] 12/12 build validator'dan geçti (offline yapısal garanti dahil)
- [x] Her oyun tarayıcıda açılıp BAŞLATILDI, konsol sıfır hata
- [x] TR + EN menü/HUD metinleri doğru dilde (örneklem: tüm oyunların TR'si, 3 oyunun EN'i)
- [x] Mobil portrait (375×812): dokunmatik kontroller görünür, çerçeve sığıyor
- [x] Mobil landscape (740×360): oyun çerçevesi sığıyor
- [x] Bölüm-seçimi/yıldız/kilit akışı (Penaltı, Zıpla Topla), mod geçişi (Zıpla Topla 2P → 5 can)
- [x] Hub koduna dokunulmadı (yalnız fabrika/ + deploy-ignore dosyaları değişti)

## Kalan manuel adımlar (görünür pencere/fiziksel cihaz gerektirir)

1. **Ekran görüntüleri**: oyun başına 5 adet 1280×720 → `dist/<oyun>/screenshots/`
   (önerilen kareler: menü, erken oynanış, aksiyon anı, özel an, bölüm-sonu).
   Arka plandaki otomasyon penceresinde rAF durduğundan otomatik alınamadı.
2. **10 dakikalık FPS oturumu** (orta seviye Android'de) — fabrika checklist maddesi.
3. **Gerçek dokunmatik cihaz testi** (pointer:coarse medya dalları emülatörsüz doğrulanmalı).
4. **Ateş & Buz 2P oynanış turu** (iki el klavyede 1-2 bölüm).
5. Zindan Okçusu **EN string tablosu** (~200 metin) — ayrı iş olarak planlandı.
6. Ateş & Buz **sprite reskini** — geniş dağıtımlı lisans öncesi (pitch.md'de işaretli).

## Portal yükleme sırası (PARA-KAZANMA-PLANI.md ile)

1. itch.io vitrin (build'ler olduğu gibi yüklenebilir)
2. GameMonetize / GamePix / CrazyGames — portal SDK'sını `window.SDK` ve
   `window.SDK_STORAGE`'a bağlayan ~10 satırlık adaptörle (soket adları CLAUDE.md'deki gibi)
3. pitch.md'ler doğrudan e-posta kampanyasında kullanılabilir
