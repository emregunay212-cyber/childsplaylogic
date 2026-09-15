# Frontend Mühendislik Denetimi — bilnetoyun.com

Ajan: `engineering-frontend-developer` · Tarih: 15 Eylül 2026

Kapsam: mimari, performans, sürdürülebilirlik. Güvenlik ve SEO ayrı denetimlerde. Kanıtlar depo köküne göre dosya:satır; hiçbir dosya değiştirilmedi.

## 1. Mimari haritası

```
index.html (hub, tek sayfa)  ── <head>: 44 CSS + 6 senkron CDN script (chess, firebase×3, three, GLTFLoader)
   └─ </body> öncesi 76 senkron yerel script (defer/async: 0)      [index.html:177-183, 373-448]
        firebase-config.js → db  ──┐
        i18n.js (TR sözlük)        │
        audio.js / mobile-utils.js │   Progress (localStorage 'oyun_bahcesi_progress')
        progress.js ───────────────┼──▶ engine.js (GameEngine: startGame/onCorrect/onComplete → yıldız)
        particles.js / drag.js     │        ▲ init(gameArea, level, {onCorrect,onWrong,onComplete})
        multiplayer.js (RTDB)      │        │
        lobby.js ──────────────────┤   js/games/*.js  (62 dosya) ── iki tür:
        js/games/*.js              │     a) satır-içi DOM/canvas oyun (tetris, egim, zipla-topla…)
        lock-catalog.js (tek kaynak)│     b) iframe sarmalayıcı → games/<id>/index.html (27 bağımsız oyun)
        auth.js (Google/misafir,   │           └─ köprü: aynı-origin localStorage + 'storage' eventi
                 bulut senkron)    │              (bilnet-meta.js:221, auth.js:56-65)
        bilnet-meta.js (jeton)     │
        app.js (kayıt defteri, kilit, adminConfig, deep-link ?oyun=) ◀─ Firebase /adminConfig
oyunlar/<slug>/index.html (53 SEO stub, seo/build_seo.py üretir) ──▶ /?oyun=<slug>
admin.html → admin.js (lock-catalog.js paylaşır)
server/ws-server.js (ölü: istemcide hiç WebSocket referansı yok)
```

Bir oyun hub'a `app.js:17-110`'daki `gameCategories` listesine global sabitiyle eklenir; kilit eşiği `lock-catalog.js:34-39`; yıldız `engine.js:75-93 → progress.js:54-84`.

**Tanrı dosyalar (>800 satır):** `js/games/zipla-topla.js` 1480, `js/multiplayer.js` 1182, `js/games/altin-avi.js` 1126, `egim.js` 1018, `space-waves.js` 983, `lego-world.js` 915, `tetris.js` 892, `js/app.js` 873. **Uzun fonksiyonlar:** `multiplayer.js:766 listenToLobby` 282 satır, `multiplayer.js:127 createLobby` 108, `lobby.js:93 renderCreateForm` 104, `zipla-topla.js:460 fixedUpdate` 104.

## 2. Bulgular

| Önem | Bulgu | Kanıt | Etki | Öneri |
|---|---|---|---|---|
| YÜKSEK | 1 yıl `immutable` önbellek + elle `?v=` — hub'daki 76 scriptin 57'si, 44 CSS'in 37'si sürümsüz. Son 30 commit'te değişen 20 sürümsüz dosya var (ör. `js/games/bil-ve-fethet.js`, 17 eğitsel CSS). Dev sunucu `no-store` verdiği için yerelde görünmez. *(Not: Vercel'de şu an hiç önbellek yok — bkz. SEO raporu; önbellek açıldığı gün bu bulgu canlıya çıkar.)* | `firebase.json:26-29`, `index.html:375-444`, `server.py:12` | Dönen kullanıcı eski JS/CSS'i 1 yıl taşır; düzeltmeler ulaşmaz, karışık sürümler çalışır. | İçerik hash'li build (Refactor 1). Acil yama: js/css için `max-age=3600, must-revalidate`. |
| YÜKSEK | Firebase SDK tek sert bağımlılık: `firebase.auth()` IIFE'de, `Auth.init` korumasız. gstatic engellenirse (okul ağı) splash asla kalkmaz. | `js/auth.js:9`, `js/app.js:320`, `index.html:187,228` | Filtreli ağlarda site tamamen boş. Global hata yakalayıcı da yok (0 `onerror`/`unhandledrejection`). | Auth'u `typeof firebase` ile sar, SDK yoksa misafir moduna düş; `window.onerror` + toast. |
| YÜKSEK | Global sıfırlama × bulut senkron yarışı: `subscribeAdminConfig` Auth'tan önce; `resetToken` gelince `resetAll()` `syncHook=null` iken çalışır, sonra `loadCloudIntoLocal → replaceAll` eski yıldızları geri getirir; token "görüldü" işaretlendiği için bir daha uygulanmaz. | `app.js:309-320, 842-852`, `auth.js:69-89` | Google kullanıcısında sıfırlama ağ zamanlamasına göre ya çalışır ya sessizce kaybolur. | `applyAdminConfig`'i `proceedAfterAuth` sonrasına ertele; `lastResetToken`'ı bulut profiline de yaz. |
| YÜKSEK | Tek hata noktası: `app.js` 58 oyun globalini IIFE anında okur. Tek bir oyun scripti yüklenemez/parse edilemezse `App` tanımsız → hub ölü. | `app.js:5-110` | Bir oyundaki sözdizimi hatası tüm siteyi kapatır. | Kayıt defterini string id + `window[...]` ile tembel çöz, eksikleri `console.warn` ile atla. |
| ORTA | Hub her şeyi peşin yükler: 802 KB yerel JS + 243 KB CSS + ~1.4 MB CDN; three.js/GLTFLoader yalnız `lego-world.js`, chess.js yalnız `satranc-engine.js` kullanıyor, ikisi de baş'ta render-blocking. ~126 istek. | `index.html:129-183`, `js/games/lego-world.js:89`, `satranc-engine.js:131` | Yavaş ilk boya (özellikle tablet/3G), mobil bellek. | Oyun bazlı tembel yükleme (Refactor 4). |
| ORTA | `Progress.load()` şema doğrulamaz; `version` yazılır ama hiç okunmaz. Bozuk değer (`null`, `[]`, `{"version":1}`) her getter'da fırlatır (node ile doğrulandı). Her çağrı localStorage'ı yeniden parse eder. | `js/progress.js:11-29, 41-47`, `engine.js:44` | Tek bozuk anahtar = hub açılmaz, kendini onarmaz; çoklu sekme için `storage` dinleyicisi yok. | Yüklemede şema kontrolü + varsayılana dönüş; bellekte önbellek, `storage` eventi ile tazele. |
| ORTA | 21 eğitsel oyun aynı iskeleti taşır: `tone()` 20 dosyada birebir (md5 eşit), `pick` 21, `window.storage` shim 26, `visibilitychange` bloğu her dosyada. | `games/bilgi-madencisi/index.html:150-165, 334-335` ve diğer 19 | Bir hata 21 kez düzeltilir; tutarsızlık kaçınılmaz. | Ortak `games/_shared/edu-kit.js` (Refactor 5). |
| ORTA | Iframe'lerde ikinci SDK kopyası: kelimelik ve son-kart Firebase compat'i yeniden yükler, config literali 3 yerde; kelime-madeni-3d kendi 592 KB three.min.js'ini taşır (hub r128 CDN'den yüklü). | `games/kelimelik/index.html:11-17`, `games/son-kart/index.html:18`, `games/kelime-madeni-3d/index.html:200` | Çift parse, ikinci RTDB bağlantısı, config sürüklenmesi. | Iframe `parent.db`/`parent.firebase` kullansın; three'yi tek kaynaktan al. |
| ORTA | Ölü WS sunucusu: 756 satır, 3 commit (hepsi 2026-03-31), istemcide sıfır `WebSocket`; heartbeat yok, port sabit, deploy yapılandırması yok. | `server/ws-server.js:3, 23-29`, `js/multiplayer.js:32-34` (RTDB) | Bakım yükü ve yanıltıcı mimari; canlıda multiplayer tamamen Firebase RTDB. | `server/` klasörünü sil (git geçmişinde kalır). |
| ORTA | Yakalanmayan promise zincirleri: 9 `.then(`'den 7'si `catch`'siz. | `js/admin.js:112,119,127`, `js/auth.js:117`, `altin-avi.js:545,973,986` | Admin işlemi sessiz düşer, kullanıcı "başarılı" toast'ı görebilir. | Her zincire `.catch` + toast. |
| DÜŞÜK | ES-modül çift örnek: `collisionBlocks.js` hem `?v=3` hem `?v=5` ile import edilir. | `games/ates-buz/js/collisions.js:2`, `game.js:3` | İki ayrı modül örneği; sabitler değişirse uyumsuzluk. | Elle sürüm yerine hash (Refactor 1). |
| DÜŞÜK | Sürüm tutarsızlıkları: `i18n.js?v=5` (admin) vs `?v=7` (hub); `engine.js?v=2` (son-kart) vs sürümsüz (hub). | `admin.html:84`, `index.html:374,380`, `games/son-kart/index.html:45` | Aynı dosyanın farklı kopyaları aynı anda canlıda. | Aynı. |
| DÜŞÜK | Depo şişkinliği: `.git` 26 MB, `fabrika/` 21 MB — `build/` ile `dist/` arasında 15 birebir HTML kopyası, 3 zip (~300 KB), `player.glb` 1 MB, `stockfish.js` 1.5 MB, `words.txt` 780 KB. | `git ls-files` boyut listesi | Klon/deploy yavaş; ikili dosyalar diff'lenemez. | `fabrika/build` üretilmiş çıktı olarak `.gitignore`; zip'leri Releases'a taşı. |

**Olumlu:** `console.log` paylaşılan `js/`'de 0; satır-içi oyunların hepsi `cancelAnimationFrame` kullanıyor; 21 eğitsel oyun `visibilitychange`'de duraklıyor; `multiplayer.js` `.on/.off` eşleşiyor (`:1118-1124`); mobil ses kilidi doğru (`mobile-utils.js:90-102`, `audio.js:35`); `oyunlar/` üretilmiş, kopya değil.

## 3. Performans tablosu

| Sayfa | Yerel JS | Yerel CSS | CDN / büyük varlık | Not |
|---|---|---|---|---|
| `/` hub | 76 dosya, **802 KB** (en büyük: zipla-topla 65 KB, multiplayer 47 KB, altin-avi 41 KB, app 40 KB) | 44 dosya, **243 KB** | Firebase ×3 (~750 KB ham), three r128 (~600 KB) + GLTFLoader (unpkg, ~100 KB), chess.js (~30 KB) | 0 defer/async; 6 script `<head>`'de senkron; 3 CDN origin |
| `games/kelimelik` (iframe) | 5 dosya ≈ 46 KB + **words.txt 780 KB** | 6.7 KB | Firebase ×2 **yeniden** | Hub üstüne ikinci SDK örneği |
| `games/kelime-madeni-3d` (iframe, comingSoon) | 76 KB tek dosya + **three.min.js 592 KB yerel** | satır-içi | — | Hub'daki three ile çift kopya |
| `games/zindan-okcusu` (iframe) | 189 KB tek dosya | satır-içi | assets 772 KB (`archer.png` 716 KB) | Tek PNG sıkıştırılmalı |

## 4. Tekrarlanan kod

| Fonksiyon / blok | Dosya sayısı |
|---|---|
| `pick` | 21 |
| `tone` (AudioContext bip) | 20 (aynı gövde) |
| `window.storage` shim | 26 |
| `shuffle` | 14 |
| `toast` | 11 |
| `dist` | 7 |
| `clamp` | 4 |
| `rand` / `randInt` / `showResult` | 3'er |
| Firebase config literali | 3 |

## 5. Önerilen refactorlar (değer/risk sırasıyla)

1. **İçerik hash'li önbellek kırma (2-3 saat, düşük risk).** `tools/build.js`: `index.html`, `admin.html`, `games/*/index.html` ve modül import'larındaki `?v=N`'i dosya hash'iyle değiştirir; deploy öncesi çalışır. Geçiş süresince js/css için `max-age=3600, must-revalidate`. **Doğrulama:** deploy sonrası Network sekmesinde değişen dosyanın yeni hash'le geldiğini, değişmeyenin cache'ten geldiğini gör.
2. **Firebase'siz açılabilen hub + global hata yakalama (3-4 saat, düşük risk).** `auth.js:9` ve `app.js:320`'yi `typeof firebase` ile koru; SDK yoksa otomatik misafir; `app.js:17-110` kayıt defterini `{ id:'harf-tanima' }` + tembel çözümle; `window.onerror`/`unhandledrejection` → toast. **Doğrulama:** DevTools'ta gstatic.com'u engelle → hub misafir olarak açılmalı; bir oyun dosyasını kasıtlı boz → sadece o kart kaybolmalı.
3. **Sıfırlama/senkron sıralaması (2 saat, düşük risk).** `applyAdminConfig`'i `proceedAfterAuth` içinden çağır; `lastResetToken`'ı `users/{uid}/progress`'e de yaz ve `replaceAll` sonrası karşılaştır. **Doğrulama:** iki cihazda Google girişi, admin'den sıfırla, ikisini de yenile → 0 yıldız.
4. **Oyun bazlı tembel yükleme (6-8 saat, orta risk).** Çekirdek (progress/engine/auth/app) `defer`; oyun scripti+CSS'i ve three/chess/GLTFLoader `startGame` anında `loadScript()` ile; `index.html:129-175` CSS'lerini oyun başında ekle. **Doğrulama:** Lighthouse mobil önce/sonra (hedef ilk yükte <300 KB JS); Playwright smoke testi tüm slug'ları açsın.
5. **Eğitsel oyun kiti + ölü kod temizliği (4-6 saat, orta risk — 21 dosya).** `games/_shared/edu-kit.js` (tone/pick/shuffle/storage shim/visibility duraklatma), 21 oyunda satır-içi kopyaları sil; `server/` klasörünü ve `fabrika/build` kopyalarını kaldır. **Doğrulama:** aynı Playwright döngüsü — her oyun açılır, bir tur oynanır, konsol hatası sıfır.

## 6. Araç önerisi (solo geliştirici, vanilla JS)

Kök `package.json` yok, lint/format yok, test 0, CI yok. Asgari kurulum: `package.json` + `eslint` flat config (`no-undef` ve proje globalleri listesiyle — tam olarak 4. bulguyu yakalar) + `tools/build.js` (hash) + Playwright tek dosya: `lock-catalog.js`'teki her slug için `/?oyun=<slug>` aç, 3 sn bekle, `console.error` varsa test düşsün. Toplam kurulum ~3 saat; sonrasında her deploy öncesi `npm test && npm run build`.

## 7. Git sağlığı

236 commit, 2026-03-31 → 2026-09-13; patlamalı ritim (04-01: 37, 06-10: 31, 06-13: 20 commit) ve 17 Haziran'dan 13 Eylül'e tek commit. "faz4: 5 oyun", "8 oyun düzeltmesi" gibi çok-oyunlu commit'ler geri alınamaz risk taşıyor; oyun başına commit önerilir. `.git` 26 MB, takip edilen 608 dosya; büyük ikililer: `js/lib/stockfish.js` 1.5 MB, `assets/models/player.glb` 1 MB, `fabrika/dist` altında 3 zip ve `fabrika/build`'in birebir kopyaları.
