# B5 — Eğitsel oyun kiti: birebir olmayan varyantlar ve kararlar (16 Eylül 2026)

Kaynak ölçüm (dal `faz2/b5-edu-kit`, taşıma öncesi, `games/*/index.html`):

| Ölçüm | Sonuç |
|---|---|
| `grep -l "function tone"` | **20** dosya — hepsi eğitsel seri (planın "21"i tasarım sayısıdır; 4.16 Bilgi Zıplaması `8977765` ile kaldırılmıştı → depoda 20) |
| `grep -c "<script>"` | 20 oyunda **2**'şer blok (40): 1) `window.storage` shim, 2) oyun kodu (`"use strict"` ile başlar) |
| `tone` zarfı | 20/20 aynı anlam: `tone(f, durSANİYE, type='triangle', vol=0.06, whenSANİYE=0)`, `exponentialRampToValueAtTime(0.0001)`, `stop(+dur+0.02)`; yalnız 2 biçimlendirme (boşluklu 8 / sıkışık 12) |
| `Audio2.init()` | 20/20 aynı: bağlamı ilk "Oyna" tıklamasında kurar (kullanıcı jesti), askıdaysa `resume()`; `init` çağrılmadan `tone` sessiz |
| `pick` | 16 oyunda, hepsi `arr[Math.floor(Math.random()*arr.length)]` |
| `rnd(a,b)` | 17 oyunda, hepsi `a + Math.floor(Math.random()*(b-a+1))` (tam sayı, kapalı aralık) — 6'sında ölü (hiç çağrılmıyor) |
| `shuffle` | 10 oyunda, hepsi YERİNDE Fisher-Yates (`return a`); 20 çağrı noktasının tamamı atılabilir dizi verir (`[...set]`, `.slice()`, literal) |
| `window.storage` shim | 20/20 aynı API: `get(key)→{value}\|null`, `set`, `remove`; 3 biçimlendirme (10/16/19 satır); önce hub köprüsünü kontrol eder |
| `visibilitychange` | 20/20; **7 gövde varyantı** (aşağıda) |
| `toast` | 3 oyunda birebir (2800 / 2600 / 2800 ms), `#toast` öğesi + oyunun kendi CSS'i |
| Üretilmiş `index.html` | **Yok.** `games/bilgi-yilani/tools/` yalnız sprite üretir (assets/*.png); `games/bil-ve-fethet/kaynak` kapsam dışı |
| Satır içi `on*=` özniteliği / `javascript:` | 20 oyunda 0 (CSP provası için ön koşul) |

## Kararlar

| # | Oyun(lar) | Fark | Karar |
|---|---|---|---|
| 1 | 20/20 | Görev taslağı `tone(freq, ms, type='sine', gain?)` diyordu; oyunlardaki tek imza `tone(f, durSaniye, type='triangle', vol, whenSaniye)` | **Kit oyunların imzasını korur** (`EduKit.tone(f, dur, type, vol, when)`, saniye, varsayılan `triangle`/0.06). ms+sine'a geçmek ~150 çağrı noktasını değiştirir ve "frekans/zarf birebir" şartını bozardı. 2 biçimlendirme varyantı tek gövdeye indi. |
| 2 | 20/20 | Ses kilidi: her oyun `Audio2.init()`'i kendi "Oyna" tıklamasında çağırır; iframe'de `MobileUtils.unlockAudio` yok | `EduKit.audio.init()` aynı; ek olarak kit `pointerdown/touchstart/keydown` (yakalama, pasif, kalıcı) ile yalnız **askıdaki** bağlamı `resume()` eder. Bağlam kurulmadan hiçbir şey yapmaz → `init` öncesi sessizlik korunur; iOS arka plandan dönüşte yeniden askıya alınan bağlam ilk dokunuşta uyanır (kazanım). |
| 3 | 10 oyun | `shuffle` yerinde karıştırıyordu | Çağrı noktalarının hepsi atılabilir dizi verdiğinden **`EduKit.shuffle` (yeni dizi)** bağlandı; `Math.random()` çağrı sırası ve sayısı aynı → aynı tohumla aynı sonuç. Yerinde varyant `EduKit.shuffleInPlace` olarak kit'te var (kullanan oyun yok). |
| 4 | 17 oyun | `rnd` adı | `const { randInt: rnd } = EduKit` takma adı (çağrı noktaları dokunulmadı). Ölü `rnd` (bilgi-ciftligi, bilgi-kulesi, bilgi-takimi, eslestirme-ustasi, kelime-canavarlari, kesir-2048) için takma ad AÇILMADI (lint uyarısı olurdu; davranış yok). |
| 5 | bilgi-madencisi | `rnd/pick/shuffle` `QuestionBank` kapanışı içinde tanımlıydı (diğerlerinde üst düzey) | Destructuring satırı aynı kapanış içine yazıldı; kapsam değişmedi. |
| 6 | 20/20 | `window.storage` shim biçim farkları | `EduKit.storage` tek gövde; hub köprüsü varsa dokunmaz; `delete` = `remove` takma adı eklendi (görev taslağındaki ad). Oyun kodu `window.storage.get/set` çağırmaya devam eder — kayıt anahtarları (`js/auth.js GAME_SAVE_KEYS`) DEĞİŞMEDİ. Her oyundaki `BilnetBridge` (`bilnet_score_queue`) oyunda kaldı — B6/B7 köprü işi. |
| 7 | 20/20 | `visibilitychange` gövdeleri: (a) `hidden && playing → pauseGame(); saveStats()` ×10 · (b) `hidden → saveStats()` ×5 · (c) `hidden → persist(); saveStats()` ×2 (takimi, gunluk-kelime) · (d) `hidden → persist()` ×1 (canavarlari) · (e) `hidden ? persist() : renderFarm()` ×1 (ciftligi) · (f) `hidden && (playing\|\|mobq) → saveStats()` ×1 (savunmasi) | `EduKit.onHidden(pauseFn, resumeFn?)`: oyunun gövdesi (durum koşulları dahil) **aynen** `pauseFn` oldu; yalnız ciftligi `resumeFn=renderFarm` aldı. Eklenen: `pagehide` de `pauseFn`'i çağırır (kapanışta kayıt — hub'ın `js/auth.js` kendi anahtarları için aynısını yapar), gizli→pagehide çiftinde tek çağrı; `pageshow` (bfcache dönüşü) `resumeFn`. Geri gelişte oyunlar KENDİLİĞİNDEN sürmez (Devam düğmesi) — eski davranış. |
| 8 | bilgi-ciftligi, bilgi-takimi, kelime-canavarlari | `toast(msg)` + `toastT` zamanlayıcısı | `EduKit.toast(msg, ms)`: `#toast` öğesi ve oyunun CSS'i kullanılır, süre parametre (2800 / 2600). **bilgi-takimi ve kelime-canavarlari'ndaki kopya ölüydü** (hiç çağrılmıyor) → takma ad açılmadı; `#toast` div + CSS'leri yerinde bırakıldı. |
| 9 | 20/20 | Reduced-motion: hub hedefli seçicilerle çalışır (`css/animations.css`), 20 oyunun sınıf adları farklı | `edu-kit.css` evrensel: keyframe animasyonları 150 ms / 1 tekrar / ease-out (sonsuz nabızlar tek kareye iner, pop/sallanma görünür kalır); geçişler 0.01 ms (150 ms'e "kısaltma" mümkün değil: `transition-property:all` varsayılanı, geçişi olmayan her öğeye gecikme eklerdi). Oyun mantığı `animationend/transitionend`'e bağlı değil (20 oyunda 0). Playwright `reducedMotion:'reduce'` ile koştuğundan smoke 61/61 bu yolu da test eder. |
| 10 | 20/20 | Klavye odağı tarayıcının varsayılan auto halkasıydı (oyun CSS'lerinde `outline` yok) | `:focus-visible { outline: 3px solid var(--mavi-800); outline-offset: 2px; box-shadow: 0 0 0 2px var(--beyaz) }` — iki tonlu halka (iç beyaz, dış mavi): oyun zeminlerinin çoğu koyu (madenci kahverengi, kafe lacivert…), tek renkli mavi-800 koyu kahvede ~2.2:1 kalıyordu; beyaz iç halka her zeminde ≥3:1 verir. `box-shadow` yalnız odak anında oyunun 3B düğme gölgesinin yerine geçer (yalnız klavye kullanıcısı görür). Kanıt: `kanit/B5-odak-halkasi-1280.png`. |
| 11 | 20/20 | `css/tokens.css` iframe'e ulaşmaz | `edu-kit.css :root` KOPYA token'lar (ham hex yalnız burada): `--mavi-500 --mavi-800 --murekkep --murekkep-orta --beyaz --dogru --yanlis --yildiz`, `--font-display --font-body`, `--yazi-baslik/dugme/govde/rozet-{aile,kalinlik,boy,satir}`, `--ara-1…8`, `--r-kart --r-giris --r-hap`, `--golge-2`, `--hedef-min`, `--sure-bas --sure-gecis --egri-out`. `tests/edu-kit.spec.js` her adı tokens.css ile karşılaştırır; sapma = FAIL. |
| 12 | fizik-firlatma, kelime-kurtarma, kesir-2048 (2), matematik-patlatma | Lint artık oyun kodunu görüyor: ölü değişkenler `support`, `cols`, `T`, `gained`, `fallen` (uyarı) | Dokunulmadı — kitle ilgisiz, davranış değişikliği riski alınmadı; A11 temizlik kalemi. |
| 13 | bil-ve-fethet, zindan-okcusu, kelime-madeni-3d, hava-hokeyi | Satır içi script + `on*` öznitelikleri; eğitsel iskelet değil | Plan gereği kapsam dışı (B9 envanterinde "B5/B6 sonrası kalanlar"). |
| 14 | `js/games/<slug>.js` sarmalayıcıları | `iframe.src = 'games/<slug>/index.html?v=N'` | Dokunulmadı; `tools/build.js` `game.js?h=`, `../_shared/edu-kit.js?h=`, `../_shared/edu-kit.css?h=` üretiyor (20/20 doğrulandı, `tests/build.spec.js` 8. test). |

## Taşıma yöntemi

Mekanik adımlar tek betikle (`migrate.js`, depo dışı) yapıldı: 2 blok → `game.js`; ses gövdesi → `const { init, tone } = EduKit.audio;`;
yardımcılar → tek `const { … } = EduKit;`; toast → `const toast = msg => EduKit.toast(msg, N);`; visibilitychange → `EduKit.onHidden(…)`.
Oyun başına `game.js` ↔ eski satır içi blok farkı yalnız bu 3–5 satırdır (örnek: `git show` ile `bilgi-madencisi` — 3 hunk).
