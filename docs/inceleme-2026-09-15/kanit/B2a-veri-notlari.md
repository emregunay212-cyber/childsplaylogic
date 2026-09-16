# B2a — `data/games.json` veri notları (16 Eylül 2026)

Kaynak dosya: `data/games.json` (UTF-8). Okuyanlar: `tools/build-catalog.js` (→ `js/catalog.js` + `index.html` altbilgi), `seo/games_data.py` (→ `/oyunlar/`, `sitemap.xml`, `llms.txt`), `tests/helpers/slugs.js` (duman testi). Şema doğrulaması üreticide (`npm run catalog:check`).

## Kayıt sayısı: 56 (plan "58 kayıt" diyor)

Plan 58'i kart sayısından türetmişti (47 solo kart + 11 online kart). `kod-macerasi` ve `satranc` hem solo hem online olduğu için tek kayıtta `module` + `online.module` taşır (slug benzersiz); benzersiz slug sayısı **56** = `seo/games_data.py`'deki eski `GAMES` uzunluğu. Hub yine 58 kart çizer (46 açık solo + 1 "Yakında" + 11 online); doğrulama: Playwright ile `#hub-grid .game-card` = 58, sıra master ile birebir.

## Alan sözlüğü

| Alan | Kaynak / kural |
|---|---|
| `slug`, `name` | `js/i18n.js TR.games` (ad) — tek istisna aşağıda |
| `module`, `levels`, `files` | `js/app.js gameCategoryDefs` (thunk adı, seviye sayısı, tembel yükleme listesi; `?v=` kırpıldı — deploy hash'ler) |
| `online.{module, order, files, badge}` | `js/app.js mpGameDefs`; `order` = Online bölümü sırası (1..11) |
| `stars`, `online.stars` | `js/lock-catalog.js STARS_BY_KEY` (solo / `mp:` anahtarı) |
| `section` | app.js kategori başlığı → `harf\|sayi\|bulmaca\|yaratici\|strateji`; yalnız-online kayıtlar `online` |
| `cat`, `age`, `teaches`, `short`, `about`, `players`, `active` | `seo/games_data.py GAMES` (age `"4-7"` → `[4, 7]`; `active=False` ↔ eski `comingSoon:true`) |
| `players_range` | Python `build_seo.players_range()` türetimi sabitlendi (`[2, null]` = "en az 2") — çıktı aynı |
| `subject`, `minutes` | **yeni**; aşağıdaki tablo |
| `sections[]` | hub bölümleri: başlık, `categoryIcons` anahtarı, mevcut başlık rengi (B1 `--kat-*` token'ı gelene kadar `var(--kat-<id>, #hex)` yedeği) |

## Kararlar (SEO çıktısında farka yol açanlar)

1. **`ates-buz` adı "Ateş & Buz"** — `TR.games`, oyun başlığı (`games/ates-buz/index.html`), hub altbilgisi, KVKK metni ve `index.html` SSS hep "&" kullanıyordu; yalnız `games_data.py` "Ateş ve Buz" diyordu. Tek kaynak tek ad ister; B0 sözleşmesi `TR.games` adlarını koruduğu için "&" seçildi. Sonuç: `oyunlar/ates-buz/index.html` title/H1/JSON-LD değişti (`about` metni "Ateş ve Buz, iki karakteri…" olarak kaldı).
2. **Sıra = hub sırası** (plan gereği). Python eski `GAMES` sırası rastgeleydi (satranc, penalti, hafiza…); şimdi `/oyunlar/index.html` kartları, `llms.txt` listesi ve `sitemap.xml` URL sırası hub sırasında. Bağlantı sayısı (55) ve `<loc>` sayısı (60) aynı.
3. **Hub kartına süre**: `/oyunlar/` kart meta satırı `Kategori · 4-7 yaş · 5 dk ›` oldu (plan B2a görev 4). Landing sayfalarına eklenmedi (56 sayfanın lastmod'u bugüne kayardı; B2b/B8b'de kart anatomisiyle birlikte).
4. `lastmod`: yalnız `oyunlar/ates-buz/` ve `/oyunlar/` bugüne kaydı (içerik değişti); 55 landing HEAD ile aynı.

## `subject` (ders anahtarı) ve `minutes` (tipik tur, dk)

Süre kaynakları: **K** = oyun kodu sabiti, **P** = `EGITSEL-OYUN-PLANI.md` tur süresi, **L** = landing/README metni, **T** = tahmin (tur sayısı × soru süresi, benzer oyunlarla kıyas). Tahminler B2b öğretmen anahtarı yayına girmeden gözden geçirilmeli; hepsi 1–30 aralığında ve üreticide doğrulanıyor.

| slug | subject | dk | kaynak |
|---|---|---|---|
| harf-tanima | turkce | 5 | T (3 seviye × ~8 soru) |
| hece-birlestirme | turkce | 5 | K (`rounds: 6/6/7`) |
| kelime-madeni-3d | ingilizce | 15 | T (açık dünya, kapalı oyun) |
| kelime-balonu | ingilizce | 4 | T (balon turu) |
| kelime-canavarlari | ingilizce | 5 | P (kelime quiz oturumu) |
| kelime-kurtarma | turkce | 3 | T (kelime başına ~1 dk × 3) |
| gunluk-kelime | turkce | 3 | P (günde tek kelime, 6 deneme) |
| sayi-sayma | matematik | 3 | K (`rounds: 5`) |
| matematik | matematik | 3 | K (`rounds: 5`) |
| desen | matematik | 3 | K (`rounds: 5`) |
| bilgi-madencisi | matematik | 2 | P (60 sn vardiya + seçim) |
| matematik-patlatma | matematik | 2 | P (60 sn tur) |
| matematik-kafe | matematik | 3 | P (120 sn vardiya) |
| bilgi-yilani | matematik | 3 | T |
| ritim-sorulari | matematik | 2 | P (75 sn tur) |
| kesir-2048 | matematik | 5 | T |
| sayi-ninja | matematik | 2 | P (75 sn tur) |
| hafiza-kartlari | genel | 3 | T (seviye başına) |
| sekil-bulmaca | matematik | 3 | T |
| siralama | matematik | 3 | K (`rounds: 3`) |
| jigsaw | genel | 5 | T |
| tetris | strateji | 5 | T (skor turu) |
| bilim-dedektifi | fen | 3 | P (90 sn vaka + 3 soru) |
| eslestirme-ustasi | genel | 3 | P (Zirve 120 sn sınırı) |
| labirent-avcisi | turkce | 3 | T (labirent başına) |
| renk-eslestirme | sanat | 3 | K (`totalRounds = 5`) |
| boyama | sanat | 5 | T (serbest) |
| tuval | sanat | 10 | T (serbest çizim) |
| sayilarla-boyama | sanat | 5 | T |
| emoji-yapici | sanat | 5 | T (serbest) |
| kod-macerasi | kodlama | 5 | K (`rounds: 3` × 3 seviye) |
| lego-macerasi | kodlama | 5 | K (`rounds: 3`) |
| lego-world | sanat | 15 | T (açık dünya; 9 seviye) |
| satranc | strateji | 15 | L (9 seviyeli AI maçı) |
| zipla-topla | spor | 5 | T (bölüm başına) |
| space-waves | spor | 2 | T (skor turu) |
| egim | spor | 2 | K (`SPEED_RAMP_SECONDS = 45`, skor turu) |
| buz-kulesi | spor | 3 | T (skor turu) |
| penalti | spor | 3 | T (9 seviye, seviye başına) |
| zindan-okcusu | strateji | 10 | T (dalga tabanlı hayatta kalma) |
| bil-ve-fethet | genel | 15 | T (harita fethi, 10 soruluk savaşlar) |
| bilgi-takimi | genel | 5 | P (görev) |
| bilgi-ciftligi | genel | 5 | P (10 soruluk oturum) |
| bilgi-kulesi | genel | 6 | P (12 soru × 30 sn) |
| cevap-kosusu | genel | 3 | T (sonsuz koşu turu) |
| bilgi-savunmasi | matematik | 5 | P (3–7 dalga) |
| fizik-firlatma | fen | 5 | T (bölüm başına) |
| kelime-tahmin | turkce | 5 | T (tur bazlı yarış) |
| harf-tahmin | turkce | 5 | T |
| penalti-mp | spor | 3 | K (`TOTAL_ROUNDS = 5`) |
| ates-buz | strateji | 5 | T (bölüm başına, iş birliği) |
| zipla-topla-coop | spor | 5 | T |
| hava-hokeyi | spor | 5 | L (ilk 7 gol) |
| altin-avi | genel | 5 | K (`GAME_DURATION_DEFAULT_MS = 5 dk`) |
| kelimelik | turkce | 15 | T (15×15 tahta, sıralı) |
| son-kart | strateji | 10 | T (2–4 kişi, el) |

`subject` seçim kuralı: oyunun **birincil** kazanımı (`teaches`); karma ders oyunları (bilgi-takimi, bilgi-çiftliği, bilgi-kulesi, cevap-koşusu, bil-ve-fethet, altın-avı, eşleştirme-ustası) `genel`; refleks/koordinasyon oyunları `spor`; planlama/mantık oyunları `strateji`.

## Doğrulama kaydı (bu dal)

- `npm run catalog:check` temiz; `node tools/build-catalog.js` ikinci koşu "değişiklik yok"; şema doğrulayıcı 10 kasıtlı hatayı (slug tekrar, age ters, minutes 0, eslint'te olmayan modül, eksik dosya, order tekrar, geçersiz subject, `comingSoon`, section/module çelişkisi, `?v=`) yakaladı.
- `LOCK_CATALOG` 58 / master 58, JSON eşit; `TR.games` 56 anahtar, master ile fark 0; `tests/helpers/slugs.js` çıktısı master ile birebir (46 solo + 11 online, atlanan `kelime-madeni-3d`).
- Hub (Playwright): 58 kart, sıra master `LOCK_CATALOG` sırasıyla aynı; kategori başlığı renkleri master hex'leriyle aynı (`var(--kat-*, #hex)` yedeği); konsol hatası 0.
- `npm run lint` 0 hata; `PORT=8767 npm run test:smoke` **60/60**; `python seo/test_build_seo.py` 42/42; `python seo/build_seo.py` ikinci koşu değişiklik 0; `node tools/build.js --out .build-check --check` temiz (`js/catalog.js` başvuruları `?h=` aldı).
