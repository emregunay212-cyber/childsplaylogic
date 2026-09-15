# Blueprint — bilnetoyun.com Düzeltme Planı

**Hedef:** 15 Eylül 2026 incelemesinin (`docs/inceleme-2026-09-15/`) bulgularını, her biri tek PR'lık ve soğuk başlangıçla yürütülebilir adımlara dönüştürmek. Öncelik: güvenlik/ifşa → hosting → SEO → UX → mühendislik.
**Oluşturuldu:** 2026-09-15 · **Mod:** git + GitHub CLI (dal → PR → Vercel önizleme → merge) · **Depo:** `C:\Users\emreg\Documents\bilnetoyun` (`origin` = github.com/emregunay212-cyber/childsplaylogic, dal `master`)
**Durum takibi:** her adımın başındaki kutu işaretlenir; adım bitmeden sonrakine geçilmez (protokol kuralı).

## Revizyon 1 — 15 Eyl 2026 gece, blueprint düşmanca gözden geçirmesi sonrası

Gözden geçirme kararı DÜZELTMELİ idi; uygulanan değişiklikler:
- **Önizleme erişimi:** Vercel Deployment Protection (SSO) açık → `curl <preview>` çalışmaz. Çözüm: Vercel MCP `get_access_to_vercel_url` ile `_vercel_share` bağlantısı → çerez kavanozuyla curl. Rich Results Test yalnız prod'da.
- **Firebase CLI yolları:** Git Bash'te `MSYS_NO_PATHCONV=1` şart; yedekler repo DIŞINA (`~/.claude/backups/rtdb-20260915/`, depo herkese açık).
- **A2:** yıkıcı `PUT null` sondası yerine `PATCH {"probe-x":null}`; gerçek biçimler: lobi `^[A-Z]{5}$` (alfabe `ABCDEFGHJKLMNPRSTUVYZ`), oda `^[A-Z2-9]{4}$`, oyuncu `^P[a-z0-9]{10,16}$`; durumlar büyük harf `WAITING/WORD_SETUP/PLAYING/FINISHED`; `ab/hh/zt` = `lobbies/<kod>/` alt düğümleri → `$other:false` yok; `email_verified` eklenmedi (admin e-posta/şifre hesabı kilitlenirdi); temizlik **kullanıcı onayına** bırakıldı (komut yedek klasöründe). Ajan: `engineering-database-optimizer` Postgres odaklı → RTDB işi koordinatör + security auditor yaptı.
- **A1:** `cleanUrls` alınmadı (27 iframe `index.html?v=N` → her açılışta 308 olurdu); CSP'ye `worker-src 'self' blob:` eklendi; görsel önbelleği 1 hafta (1 yıl değil). İmza CSS'i ayrı `css/imza.css` (landing/admin `main.css` yüklemiyor).
- **A3:** `escapeHTML` `Lobby` IIFE'sine özel → MP dosyalarında `textContent` ya da yerel yardımcı.
- **A5 → A5a** (index.html title/description/footer 53 link + footer'ı `.hub` içine al), **A5b** (`build_seo.py` şablon/JSON-LD/llms/yeni kayıtlar), **A5c** (27 `games/*/index.html` noindex+canonical).
- **A9 → A9a** (font self-host), **A9b** (defer + tembel yükleme), **A9c** (CSP: 27 oyun sayfası satır içi `<script>` taşıyor → `/games/(.*)` için ayrı `'unsafe-inline'`li başlık ya da dış dosyaya taşıma kararı). "CSP raporu 0" kriteri A9b'den çıktı. Ölçüt: "gzip transfer, Firebase compat hariç".
- **A10 → A10a** (package.json + eslint + Playwright duman testi; giriş kapısı için `sessionStorage bo_guest_mode=1`, `comingSoon` slug'ları atla) **A9'dan ÖNCE**; **A10b** (hash build + immutable + CI zorunlu + master branch protection) sonra.
- **Değişmez eklendi:** admin paneli dumanı (giriş + kilitle/aç) — A1/A2/A4/A5 dokunuyor.
- **Karar listesine eklendi:** hile (`hands/deck` herkese okunur), SRI, iframe'de ikinci Firebase kopyası, `www.` 307, konsol ayarları.
- Süre gerçekleri: A2 5-6 saat, A6 6-8 saat.
- Merge: otomatik mod sınıflandırıcısı `gh pr merge`'ü engelliyor → PR'lar önizlemede doğrulanmış + güvenlik incelemeli hâlde kullanıcı merge'üne bırakılır.

## Durum — 15 Eyl 2026 öğleden sonra (kaynak: `gh pr list --state all --limit 20 --json number,title,state`)

| Adım | PR | Durum |
|---|---|---|
| A1 Vercel | #12 | merged 01:18 UTC |
| A2 RTDB kuralları | #13 | merged 01:34 UTC; kurallar canlıda (`firebase deploy --only database`); eski veri temizliği sahip onayında |
| A11a ölü kod | #14 | merged 01:35 UTC |
| A5c iframe noindex | #15 | merged 01:35 UTC |
| A3 XSS | #16 | merged 06:07 UTC |
| A5b SEO üretici | #17 | merged 06:07 UTC |
| A4 hub dayanıklılığı | #18 | merged 06:07 UTC |
| A10a lint + duman testi + CI | #19 | merged 06:32 UTC (60/60) |
| A8a statik sayfalar | #20 | **açık** |
| A6 + A5a + A7 hub paketi | #21 | **açık** — geçit incelemesi sürüyor |
| A9a / A9b / A9c, A10b, A8b, A12 | — | bekliyor |
| A11b belge senkronu | — | bu commit (`docs: belge senkronu …`) — PR açılacak |

Grafikteki sıra fiilen şöyle yürüdü: A1/A2/A3/A4 paralel → A5c, A11a, A5b, A10a (A6'dan önce) → A6+A5a+A7 tek PR (#21) → A8a (#20).
`index.html`'e dokunan #21 merge edilmeden A9 başlamaz (çakışma).

## Değişmezler (her adımdan sonra doğrulanır)

1. 57 oyun hub'dan açılır, konsolda hata yok (A10a #19 merged: `npm run test:smoke` — 60 test; öncesinde elle `/?oyun=<slug>`).
2. Canlıda yeni herkese-açık dosya yok: `curl -s -o /dev/null -w '%{http_code}' https://bilnetoyun.com/<yol>` → `server/ws-server.js`, `database.rules.json`, `_bank_tmp.txt`, `docs/`, `plans/` için **404**.
3. `git status` temiz; her PR tek adım; commit mesajı `fix|feat|chore(<alan>): …`.
4. Kabul geçidi (protokol Adım 3) her PR'da: `testing-reality-checker` → görsel varsa `testing-evidence-collector` → `security-ai-generated-code-auditor`.

## Bağımlılık grafiği

```
A1 vercel ──┐
A2 rules  ──┼─ (paralel, birbirinden bağımsız)
A3 xss    ──┤
A4 hub-dayaniklilik ─┘
      ↓
A6 ux-hizli → A5a/b/c seo → A7 imza → A8 gizlilik → A10a duman-testi → A9a/b/c tembel-yukleme → A10b hash-build
      (hepsi index.html'e dokunur → SERİ, bu sırayla)
A11 temizlik+belge (A1 sonrası herhangi bir an; belge senkronu en son)
A12 faz-2-ux (ayrı blueprint; A6-A9 bittikten sonra)
```

Paralel çalıştırılabilecek küme: **A1, A2, A3, A4** (dosya kesişimi yok). Kalanlar seri.

## Hosting gerçeği (her adımın ön bilgisi)

Canlı site **Vercel** (`Server: Vercel`, `master`'a push = otomatik deploy). `firebase.json` yalnız `childsplaylogic.web.app` yansısı ve **veritabanı kuralları** için geçerli. ~~Repo'da `vercel.json` yok; `.vercelignore` = `fabrika/` + (bu planla) `docs/`, `plans/`.~~ **Güncel (PR #12, `3b81bd1`):** `vercel.json` var (güvenlik başlıkları, CSP Report-Only, önbellek, `trailingSlash`); `.vercelignore` tam liste (`*.md`, `*.py`, `seo/`, `docs/`, `plans/`, `tests/`, `.github/`, `database.rules.json`, `firebase.json` …).

---

## A1 — Vercel yapılandırması: başlıklar, ignore, 404, URL biçimi  `[x] PR #12 merged 15 Eyl 01:18 UTC` (`cleanUrls` alınmadı — Revizyon 1)

**Öncelik:** P0 · **Model:** default · **Ajan:** `engineering-backend-architect` · **Bağımlılık:** yok · **Süre:** 2 saat
**Bağlam:** Güvenlik başlıkları, önbellek ve dosya gizleme yalnız `firebase.json`'da → canlıda yok. Dahili dosyalar herkese açık (bkz. `docs/inceleme-2026-09-15/01-guvenlik.md` "YÜKSEK — Depo dosyaları canlıda açık"). 404 sayfası Vercel'in İngilizce jenerik sayfası.
**Görevler**
1. `vercel.json` oluştur — `01-guvenlik.md` "vercel.json" bölümündeki içerik + `"trailingSlash": true`, `"cleanUrls": true` + önbellek: `/assets/(.*)`, `/(.*)\.(png|svg|jpg|glb|woff2)` → `public, max-age=31536000, immutable`; `/(.*)\.(js|css)` → `public, max-age=3600, must-revalidate` (A10 hash build'e kadar). CSP **Report-Only** kalır.
2. `.vercelignore`'u `01-guvenlik.md` ".vercelignore" bölümündeki listeyle değiştir (`docs/`, `plans/` dahil; `llms.txt`, `robots.txt`, `sitemap.xml`, `BingSiteAuth.xml`, `1cbb4632-….txt` açık kalır).
3. Kök dizine Türkçe `404.html` (hub tasarım diliyle, "Oyunlara dön" bağlantısı, `noindex`).
4. `firebase.json` hosting bloğundaki ölü ignore satırlarını (`index-3d.html`, `lib/`, `assets3d/`) kaldır; `X-XSS-Protection` sil.
**Doğrulama:** dal push → Vercel önizleme URL'sinde: `curl -sI <preview>/ | grep -iE "x-frame|x-content|referrer|content-security"` → 4 başlık; `curl -s -o /dev/null -w '%{http_code}' <preview>/database.rules.json` → 404 (server/, _bank_tmp.txt, EGITSEL-OYUN-PLANI.md, docs/, plans/ için de); `<preview>/bu-sayfa-yok` → 404 + Türkçe sayfa; `<preview>/oyunlar/kelimelik` → 308 → `/oyunlar/kelimelik/`; 5 oyun açılır (CSP report-only olduğu için kırılma olmamalı; konsolda CSP raporlarını not al → A9'da giderilecek).
**Çıkış kriteri:** yukarıdaki curl'ler canlıda (merge sonrası) da aynı. **Geri alma:** `vercel.json` ve `404.html` sil, `.vercelignore`'u eski hâline getir, push.

## A2 — Firebase RTDB kuralları: koleksiyon-düzeyi yazmayı kapat  `[x] PR #13 merged 15 Eyl 01:34 UTC; kurallar canlıda (firebase deploy --only database); görev 4 eski veri temizliği YAPILMADI — komut sahip onayında (bkz. Karar 6)`

**Öncelik:** KRİTİK · **Model:** strongest · **Ajan:** `engineering-database-optimizer` + `security-ai-generated-code-auditor` · **Bağımlılık:** yok · **Süre:** 3 saat
**Bağlam:** `lobbies`, `players`, `rooms` `.write: true` → kimliksiz silme/spam/isim taklidi; canlıda 1.480 eski lobi ve ~700 odada çocuk isimleri anonim okunabiliyor (`01-guvenlik.md` KRİTİK). Kural taslağı aynı dosyada.
**Görevler**
1. `js/multiplayer.js` ve `js/lobby.js`'de üretilen lobi kodu ve oyuncu id biçimini oku; taslaktaki `matches()` desenlerini gerçek biçime eşle (`^P[a-z0-9]{8,20}$`, `^[A-Z0-9]{4,8}$` varsayımdır — **doğrula**).
2. `database.rules.json`'ı taslakla değiştir; `leaderboards/tetris` bloğu ve `rooms/kelimelik` `.indexOn` ekle; `adminConfig` yazmaya `email_verified`.
3. Firebase Emulator (`firebase emulators:start --only database`) veya konsol Rules Playground ile: lobi oluştur / katıl / bitir / kök `lobbies` silme (RED) / 25 karakter ad (RED) / `wordLength:"<svg>"` (RED).
4. Eski veri temizliği: `state != 'waiting'` ve `createdAt < now-24h` lobileri ve yetim `ab/hh/zt` düğümlerini tek seferlik script ile sil (önce `firebase database:get /lobbies > yedek.json`). Günlük temizlik için Cloud Function/Scheduled job **ayrı karar** (A12 notu).
5. Deploy: `firebase deploy --only database`.
**Doğrulama:** anonim `curl "https://childsplaylogic-default-rtdb.europe-west1.firebasedatabase.app/lobbies.json?shallow=true"` → hâlâ okunur (tasarım gereği); anonim `curl -X PUT …/lobbies.json -d 'null'` → 401/PERMISSION_DENIED; canlıda 2 cihazla Kelimelik + Altın Avı + Son Kart bir tur.
**Çıkış kriteri:** kök silme reddediliyor, üç online oyun çalışıyor, eski veri temiz. **Geri alma:** yedek `database.rules.json.onceki` ile `firebase deploy --only database`.

## A3 — Depolanmış XSS: rakip adı ve lobi alanları  `[x] PR #16 merged 15 Eyl 06:07 UTC (0c44fa0); wordLength 3..8 sınırı takibi PR #21'de`

**Öncelik:** YÜKSEK · **Model:** default · **Ajan:** `engineering-frontend-developer` · **Bağımlılık:** yok · **Süre:** 2 saat
**Bağlam:** Firebase'den gelen `opponentName`, `l.id`, `l.wordLength`, `gridSize`, `maxTurns` ham `innerHTML`'e basılıyor (`01-guvenlik.md` YÜKSEK ×2). `js/lobby.js:8`'de `escapeHTML()` zaten var.
**Görevler:** `js/lobby.js:266,268` → `escapeHTML()` + `Number()`; `js/games/kod-macerasi-mp.js:224-227,393`, `js/games/satranc-mp.js:95`, `js/games/penalti-mp.js:223,232,441,446` → `textContent` veya `escapeHTML`; tüm `js/`'de `grep -n "innerHTML" | grep -iE "name|opponent|lobby|l\."` → kalan her satır için karar notu.
**Doğrulama:** yerel `python server.py`; iki sekmede lobi; ad alanına `<img src=x onerror=alert(1)>` → metin olarak görünür, alert yok; `wordLength` konsoldan `"<b>x"` yazılmaya çalışıldığında (A2 sonrası) reddedilir.
**Çıkış kriteri:** kullanıcı verisi taşıyan `innerHTML` 0. **Geri alma:** PR revert.

## A4 — Hub dayanıklılığı: Firebase'siz açılış, hata yakalama, bozuk localStorage, sıfırlama yarışı  `[x] PR #18 merged 15 Eyl 06:07 UTC (bd78d1d); iki-cihaz Google sıfırlama testi canlıda yapılmadı (bkz. Karar 8)`

**Öncelik:** YÜKSEK · **Model:** strongest (yarış durumu) · **Ajan:** `engineering-frontend-developer` · **Bağımlılık:** yok · **Süre:** 4 saat
**Bağlam:** `05-muhendislik.md` YÜKSEK ×3 + ORTA (Progress). gstatic engellenince splash kalkmıyor; tek bozuk oyun scripti hub'ı öldürüyor; `Progress.load()` bozuk JSON'da fırlatıyor; admin sıfırlama × bulut senkron yarışı.
**Görevler:** `js/auth.js:9`, `js/app.js:320` `typeof firebase` koruması + misafir moduna düşüş + "çevrimdışısın" bandı; `js/app.js:17-110` kayıt defterini string id + `window[...]` tembel çözüm, eksikte `console.warn`; `window.onerror`/`unhandledrejection` → toast; `js/progress.js` şema doğrulama + varsayılan + bellek önbelleği + `storage` eventi; `applyAdminConfig`'i `proceedAfterAuth` sonrasına al, `lastResetToken`'ı bulut profiline yaz; `js/admin.js:112,119,127`, `js/auth.js:117` `.catch` + toast.
**Doğrulama:** DevTools → gstatic.com engelle → hub misafir olarak açılır; `localStorage.setItem('oyun_bahcesi_progress','[]')` → hub açılır, ilerleme sıfırdan; bir oyun dosyasını kasıtlı boz → yalnız o kart kaybolur; iki cihazda Google girişi + admin sıfırla → ikisi de 0 yıldız.
**Çıkış kriteri:** dört senaryo geçer. **Geri alma:** PR revert.

## A6 — UX hızlı kazanımlar (≤1 saatlik 11 madde)  `[~] PR #21 AÇIK (A6+A5a+A7 tek PR — hepsi index.html) — geçit incelemesi sürüyor; PR gövdesi: Lighthouse Erişilebilirlik giriş 93→100, hub 89→100, kanıt docs/inceleme-2026-09-15/kanit/`

**Öncelik:** YÜKSEK (erişilebilirlik) · **Model:** default · **Ajan:** `design-ui-designer` (impeccable ilkeleri) · **Bağımlılık:** A1-A4 merge · **Süre:** 2 saat
**Bağlam:** `03-arayuz-ux.md` "Hızlı kazanımlar" 1-11 (viewport zoom, focus-visible, tanımsız token'lar, `.mp-badge` çakışması, 7 kontrast düzeltmesi, `zipla-topla-coop.svg` + `onerror`, admin toplu kilit onayı, klavye, `gentleFloat` kaldırma + kademe sınırı, sayı kopyası, reduced-motion kapsamı).
**Doğrulama:** Lighthouse Erişilebilirlik ≥ 90 (önce/sonra kaydet); klavyeyle Tab ile 5 kart açılır; canlı konsolda 404 yok; `testing-evidence-collector`: masaüstü + 375px ekran görüntüsü `docs/inceleme-2026-09-15/kanit/A6-*.png`.
**Çıkış kriteri:** 11 madde + Lighthouse. **Geri alma:** PR revert.

## A5 — SEO düzeltmeleri (şablon + üretici)  `[bölündü → A5a/A5b/A5c] A5c [x] PR #15 merged (d3393be) · A5b [x] PR #17 merged (b6dde87: seo/games_data.py tek kaynak, 3 eksik oyun, llms.txt) · A5a [~] PR #21 açık (ana sayfa title/description/footer)`

**Öncelik:** P1 · **Model:** default · **Ajan:** `marketing-seo-specialist` · **Bağımlılık:** A1 (trailingSlash/404), A6 (index.html çakışması) · **Süre:** 4 saat
**Bağlam:** `04-seo.md`. Üretici `seo/build_seo.py` 53 landing + sitemap + (yeni) llms.txt'yi üretir; elle düzenlenen sayfalar bir sonraki çalıştırmada ezilir → **değişiklikler şablona yapılır**.
**Görevler:** `index.html` title/description/keywords (`04-seo.md` P1); `build_seo.py`: title ≤60 / description ≤150 şablonu, `GAMES`'e `active`, `age_min/max`, `og` alanı; `son-kart`, `hava-hokeyi`, `zipla-topla-coop` kayıtları; `kelime-madeni-3d` `active:false` → `noindex` + hub'dan gizle; lastmod git tarihinden; `llms.txt` üretimi; JSON-LD `@graph` (VideoGame + Organization + BreadcrumbList) ve hub'a `CollectionPage`; 27 `games/*/index.html` `<head>`'e `noindex` + canonical (`/oyunlar/<slug>/`); ana sayfa footer'ını tüm aktif oyunlara `<a href>` ile genişlet; `admin.html` linkini yalnız yetkili oturumda DOM'a ekle.
**Doğrulama:** `python seo/build_seo.py` → `git diff --stat` beklenen dosyalar; `grep -c "<loc>" sitemap.xml` = aktif oyun sayısı + 2; Rich Results Test'te 1 oyun sayfası hatasız; `curl -s <preview>/games/kelimelik/ | grep -c noindex` = 1.
**Çıkış kriteri:** üretici tek kaynak; sitemap ↔ hub ↔ landing tutarlı. **Geri alma:** PR revert (üretilen dosyalar dahil).

## A7 — egweblab marka imza bandı (zorunlu kural)  `[~] 404.html + oyunlar/ hub + 56 landing canlıda (PR #12 css/imza.css, PR #17 üretici şablonu — grep -rl imza-band --include=*.html . = 58); hub index.html + admin.html PR #21 AÇIK (oran 1280: %0,65 · 375: %0,61 · admin %1,05, PR gövdesi)`

**Öncelik:** ZORUNLU (global kural) · **Model:** default · **Ajan:** `design-ui-designer` · **Bağımlılık:** A5 (footer/şablon) · **Süre:** 2 saat
**Bağlam:** `~/.claude/CLAUDE.md` "Marka İmzası" bölümü: her sayfanın en altında tek bağlantı, logo 20px, iki tipografik register, hover'da hap zemini, `@media print` gizli, yükseklik ≤ %2. Hub'da `html,body{overflow:hidden}` → band `.hub` kaydırma kapsayıcısının sonuna (`index.html:277` civarı), `#app` altına değil (`03-arayuz-ux.md` "Marka imzası durumu").
**Görevler:** `assets/logo-96.png` ekle; `.imza-band/.imza/.imza__*` stilini `css/main.css` token'larıyla yaz; hub, `oyunlar/index.html`, `build_seo.py` landing şablonu, `admin.html`, `404.html`, A8 sayfaları; `games/*/index.html` iframe içinde olduğundan **eklenmez** (bağımsız açılış istenirse ayrı karar).
**Doğrulama:** `grep -rl "egweblab" --include=*.html . | wc -l` = beklenen sayfa sayısı; tarayıcıda band yüksekliği / `document.documentElement.scrollHeight` ≤ 0.02 (hub 375px ve 1280px); yazdırma önizlemede yok; ekran görüntüsü `kanit/A7-*.png`.
**Çıkış kriteri:** ölçülmüş oran + tüm sayfa tipleri. **Geri alma:** PR revert.

## A8 — Gizlilik / KVKK, iletişim, hakkında sayfaları + ad politikası  `[bölündü → A8a/A8b] A8a [~] PR #20 AÇIK (/gizlilik/ /hakkinda/ /iletisim/ üreticiden, sitemap 60 loc; KVKK metni "bilgilendirme amaçlı", okul onayı bekliyor — Karar 7) · A8b [ ] bekliyor (index.html "kişisel veri toplamaz" ifadesi + lobi takma ad seçici)`

**Öncelik:** P1 · **Model:** default · **Ajan:** `engineering-frontend-developer` (+ metin için kullanıcı onayı) · **Bağımlılık:** A7 · **Süre:** 3 saat + hukuki metin
**Bağlam:** Çocuk sitesi; Google girişi + Firebase kayıt var; "kişisel veri toplamaz" ifadesi yanlış (`04-seo.md` P1, `01-guvenlik.md` ORTA). Çok oyunculu ad serbest metin ve herkese açık.
**Görevler:** `/gizlilik/`, `/iletisim/`, `/hakkinda/` statik sayfalar (şablon: landing.css); footer bağlantıları; `index.html:355` ifadesini düzelt; `js/lobby.js:47` ad girişi → takma ad/emoji seçici (serbest metin kaldır); Organization şemasına okul sitesi + `sameAs` (kullanıcıdan URL). **Aydınlatma metni içeriği kullanıcı/okul hukuk birimi onayına tabidir — taslak hazırlanır, yayınlanmaz.**
**Doğrulama:** 3 sayfa 200 + sitemap'te; lobi adı seçiciyle; `curl <preview>/gizlilik/ | grep -c egweblab` = 1.
**Çıkış kriteri:** sayfalar yayında (metin onaylı), serbest ad girişi yok. **Geri alma:** PR revert.

## A9 — Tembel yükleme + font self-host  `[ ] A9a / A9b / A9c bekliyor — PR #21 merge edilmeden başlamaz (index.html çakışması)`

**Öncelik:** P0 (performans) · **Model:** strongest · **Ajan:** `engineering-frontend-developer` + `testing-performance-benchmarker` · **Bağımlılık:** A5, A7 (index.html) · **Süre:** 8 saat
**Bağlam:** Hub 802 KB JS + 243 KB CSS + ~1.4 MB CDN, 0 defer (`05-muhendislik.md` Refactor 4; `04-seo.md` P0). CSP Report-Only raporları (A1) satır içi `onclick` içeren iki oyunu gösterir.
**Görevler:** çekirdek (progress/engine/auth/app/i18n/audio/mobile-utils/lock-catalog) `defer`; oyun JS+CSS `startGame` anında `loadScript()/loadCSS()` (kayıt defterinde `files:[…]`); three/GLTFLoader yalnız lego-world, chess.js yalnız satranç, Firebase yalnız online/giriş akışında; Fredoka + Nunito latin-ext woff2 self-host + `preload` + `font-display: swap`; Cinzel/Bebas oyun açılışında; Comic Sans/Orbitron kaldır; `games/bil-ve-fethet`, `games/zindan-okcusu` satır içi `onclick` → `addEventListener` (CSP'yi zorlayıcı moda almak için).
**Doğrulama:** Lighthouse mobil önce/sonra (`kanit/A9-lighthouse-*.json`), hedef ilk yük JS < 300 KB, LCP < 2.5 s; 57 oyun elle/Playwright açılır; CSP raporu 0 → `vercel.json`'da `Content-Security-Policy` (zorlayıcı) ayrı küçük PR.
**Çıkış kriteri:** ölçümler + tüm oyunlar. **Geri alma:** PR revert.

## A10 — Araçlar: hash'li build, eslint, Playwright duman testi  `[bölündü → A10a/A10b] A10a [x] PR #19 merged 15 Eyl 06:32 UTC (ab40c9f: package.json, eslint.config.js 0 hata/44 uyarı, tests/smoke.spec.js 60/60, .github/workflows/ci.yml) · A10b [ ] bekliyor (hash build + immutable + required check + branch protection)`

**Öncelik:** P1 · **Model:** default · **Ajan:** `testing-test-automation-engineer` · **Bağımlılık:** A9 · **Süre:** 4 saat
**Bağlam:** `?v=N` elle sürümleme 20+ yerde kaymış (`02-gerceklik-kontrolu.md` 13); lint/test yok.
**Görevler:** kök `package.json`; `tools/build.js` (index/admin/games/*/index/`import` içindeki `?v=` → içerik hash'i); `eslint` flat config `no-undef` + proje globalleri; `tests/smoke.spec.js`: `lock-catalog.js`'teki her slug için `/?oyun=<slug>` aç, 3 sn, `console.error` → fail; GitHub Actions: PR'da `npm test`; Vercel build komutu `npm run build`.
**Doğrulama:** `npm test` yeşil; önizlemede JS dosya adları hash'li; `vercel.json` js/css önbelleği `immutable`'a çevrilir (A1'deki geçici 1 saat kalkar).
**Çıkış kriteri:** CI zorunlu kontrol. **Geri alma:** build adımını Vercel'den kaldır.

## A11 — Ölü kod, depo temizliği, belge senkronu  `[bölündü → A11a/A11b] A11a [x] PR #14 merged (41c9c28: server/ + _bank_tmp.txt silindi, server.py notu Vercel) · A11b [x] bu commit: EGITSEL-FAZ-DURUM.md "Güncelleme 15 Eylül 2026", EGITSEL-OYUN-PLANI.md §3.4/§4.16/§6.2/§6.3/DoD notları, LEGO spec arşiv bandı, README.md, bu plan · kalan: fabrika/build + dist/*.zip .gitignore, games/ates-buz çift modül sürümü (?v= kayması) — A10b ile`

**Öncelik:** P2 · **Model:** default · **Ajan:** `engineering-frontend-developer` + `testing-reality-checker` · **Bağımlılık:** A1 (temizlik), A10 (belge senkronu en son) · **Süre:** 3 saat
**Görevler:** `server/` sil (git geçmişinde kalır; `js/multiplayer.js` RTDB); `_bank_tmp.txt` sil veya `fabrika/`ya taşı; `fabrika/build/` ve `fabrika/dist/*.zip` `.gitignore`; `games/ates-buz` çift modül sürümü; `EGITSEL-FAZ-DURUM.md` ve `EGITSEL-OYUN-PLANI.md`'yi git gerçeğiyle eşitle (Kelime Madeni 3D kapalı, 20/21 oyun, Son Kart, RTDB ≠ Firestore, DoD kutuları); `LEGO-WORLD-GAME-SPEC.md` "arşiv/uygulanmadı" başlığı; `server.py:5` "canlıda Vercel"; `README.md` (hosting gerçeği + deploy akışı).
**Doğrulama:** `git ls-files | wc -l` düşer; `du -sh .git` (yeni büyüme yok); reality-checker "Yanlış/tutarsız" listesi 0.
**Çıkış kriteri:** belge = kod. **Geri alma:** PR revert.

## A12 — Faz 2: Bilgi mimarisi ve tasarım sistemi (ayrı blueprint)  `[ ] bekliyor — A6-A9 bitmeden başlamaz; ayrı blueprint yazılmadı`

**Öncelik:** yapısal · **Model:** strongest · **Ajanlar:** `design-taste-frontend` (yön) → `design-ui-designer` + `impeccable` (inşa) → `emil-design-eng` (hareket) · **Bağımlılık:** A6-A9
**Kapsam (bu planda yalnız başlık):** yaş rafı mimarisi + öğretmen görünümü + arama; `css/tokens.css` + `css/landing.css`; modal/dialog sistemi; hareket sistemi; `games/_shared/edu-kit.js` (21 oyun); günlük veri temizliği (Cloud Function) ve anonim auth (`auth.uid === $playerId`). **Başlamadan `blueprint` ile ayrı plan yazılır.**

---

## Karar gerektiren noktalar (kullanıcı)

1. **A2** — Firebase faturalandırma planı ve günlük temizlik için Cloud Function (Blaze gerektirir) istenip istenmediği.
2. **A8** — KVKK aydınlatma metni içeriği ve okul resmi site / sosyal hesap URL'leri.
3. **A7** — `games/*/index.html` bağımsız açıldığında imza gösterilsin mi (iframe içinde gereksiz).
4. **A9** — CSP zorlayıcı moda geçiş tarihi (rapor 0 olduktan sonra).
5. Firebase yansısı `childsplaylogic.web.app` kullanılmaya devam edecek mi; edilmeyecekse `firebase.json` hosting bloğu tamamen kaldırılır.
6. **A2 eski veri temizliği (eklendi 15 Eyl öğleden sonra):** kurallar canlıda ama 1.476 eski lobi + 344/322/42 oda (çocuk isimleri anonim okunabilir) hâlâ duruyor. Yedek + silme listeleri + komut `~/.claude/backups/rtdb-20260915/TEMIZLIK-KOMUTU.md` (repo dışı) — **sahip onayıyla çalıştırılacak** (PR #13 gövdesi "Yapılmadı (onay bekliyor)").
7. **A8a KVKK metni (eklendi 15 Eyl):** `/gizlilik/` PR #20'de "bilgilendirme amaçlıdır, okul yönetiminin onayıyla güncellenir" notuyla taslak; şirket sicil no / DPO / e-posta uydurulmadı. Okul yönetimi / hukuk birimi gözden geçirmeli; resmî e-posta ve okul sitesi bağlantısı gelince `seo/games_data.py` `STATIC_PAGES` güncellenir.
8. **A4 iki-cihaz Google sıfırlama testi (eklendi 15 Eyl):** PR #18 sıfırlama/senkron yarışını kodda düzeltti; "iki cihazda Google girişi + admin sıfırla → ikisi de 0 yıldız" senaryosu canlıda **iki gerçek cihazla** henüz oynanmadı (doğrulama satırı A4). Sahip iki cihazla bir tur atıp sonucu `kanit/`ye not düşmeli.
9. **Konsol sertleştirme (eklendi 15 Eyl akşam) — YAPILDI:** API anahtarına HTTP referrer kısıtı (bilnetoyun.com, *.bilnetoyun.com, childsplaylogic.firebaseapp.com) · `www` → 308 (Vercel'e domain olarak eklendi) · e-posta numaralandırma koruması zaten açıktı · plan **Spark** (`billingEnabled: false`) → bütçe alarmı gereksiz · "kayıt olmayı kapat" **bilerek yapılmadı** (Google girişini de kilitler). Kanıt: `kanit/KONSOL-sertlestirme-2026-09-15.md`. Açık sahip kararları: `childsplaylogic.com` + `www.childsplaylogic.com` → 308 → bilnetoyun.com (şu an kopya site); Auth authorizedDomains'teki 15 bayat önizleme kanalı.

## Plan mutasyon protokolü

Bir adım bölünür/atlanır/eklenirse: bu dosyada adımın başlığına `[bölündü → A3a/A3b]`, `[atlandı: gerekçe]` veya `[eklendi: tarih]` notu düşülür; sıralama grafiği güncellenir; commit mesajı `docs(plan): …`.

## Kanıt klasörü

`docs/inceleme-2026-09-15/kanit/` — ekran görüntüleri (`A6-hub-375.png`…), Lighthouse JSON'ları, curl çıktıları. Kabul geçidi bu klasörsüz "geçti" demez.
