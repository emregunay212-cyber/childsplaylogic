# Blueprint — bilnetoyun.com Faz 2: Bilgi mimarisi, tasarım sistemi, edu-kit, anonim auth, CSP

**Hedef:** Faz 1 (`plans/bilnetoyun-duzeltme-2026-09-15.md`) yangınları söndürdü; Faz 2 yapıyı kurar: yaş rafı mimarisi, token'lı tasarım sistemi, dialog ve hareket sistemi, 21 eğitsel oyun için ortak kit, iframe köprüsü, `auth.uid` sahipliği ve zorlayıcı CSP. Her adım tek PR, soğuk başlangıçla yürütülebilir.
**Oluşturuldu:** 2026-09-15 · **Mod:** git + GitHub CLI (dal → PR → Vercel önizleme → kabul geçidi → **kullanıcı merge'ü**) · **Depo:** `C:\Users\emreg\Documents\bilnetoyun` (`origin` = github.com/emregunay212-cyber/childsplaylogic, dal `master`)
**Önkoşul:** Faz 1 A6, A7, A8a merge (tamam). A9a/b/c, A8b (takma ad seçici), A10b (hash build) **bu plandan önce** biter; aşağıda hangi adımın hangisine yaslandığı yazılıdır.
**Durum takibi:** adım başlığındaki kutu işaretlenir; adım bitmeden sonrakine geçilmez.

## Ön bilgi (soğuk başlangıç için)

- Canlı site **Vercel**; önizleme URL'leri SSO korumalı → Vercel MCP `get_access_to_vercel_url` ile `_vercel_share` bağlantısı, `curl` çerez kavanozuyla. Firebase CLI Git Bash'te `MSYS_NO_PATHCONV=1`; yedekler repo dışına (`~/.claude/backups/`), depo herkese açık.
- Test: `npm run lint && npm run test:smoke` → **60 test** (46 solo + 9 online derin bağlantı + 2 hub kartı + admin + `/oyunlar/` + katalog; `tests/smoke.spec.js`). Dış ortam: `BASE_URL=<önizleme> npm run test:smoke`.
- Üretici: `python seo/build_seo.py` → 57 landing + `oyunlar/index.html` + 3 statik sayfa + `sitemap.xml` + `llms.txt`. Elle düzenlenen üretilmiş dosya ezilir; değişiklik şablona/veriye yapılır.
- Tasarım skilleri (kullanıcı kuralı, zorunlu): yön `~/.claude/skills/design-taste-frontend/SKILL.md` (§0 brief, §1 kadranlar, §2 sistem, §11 redesign protokolü, §14 ön-uçuş); inşa/denetim `~/.claude/skills/impeccable/SKILL.md` + `reference/{shape,extract,audit,animate,craft-floor,document}.md`; hareket `~/.claude/skills/emil-design-eng/SKILL.md`. **`impeccable/scripts/impeccable` çalıştırılmaz** (ilk çalışmada ikili indirir); markdown'lar elle uygulanır ve kanıt klasörüne yazılır.
- Kanıt: `docs/inceleme-2026-09-15/kanit/` (A6 Lighthouse: erişilebilirlik **100/100** iki ölçümde — bu taban korunur). Faz 2 dosyaları `B*-*.png|json|md` önekiyle aynı klasöre.
- Ajan adları Faz 1 ile aynı: `design-ui-designer`, `engineering-frontend-developer`, `engineering-backend-architect`, `security-ai-generated-code-auditor`, `testing-test-automation-engineer`, `testing-reality-checker`, `testing-evidence-collector`, `marketing-seo-specialist`, `design-accessibility-auditor`.

## Değişmezler (her adımdan sonra doğrulanır)

1. Duman testi **60/60** (`npm run test:smoke`), `npm run lint` hatasız (uyarı serbest).
2. Lighthouse erişilebilirlik **100** — A6 kanıtındaki iki ölçüm (giriş kartı navigasyonu + hub snapshot); kanıt JSON'u kaydedilir.
3. İmza bandı: uzun sayfalarda (hub 1280 ve 375, `/oyunlar/`, `/gizlilik/`) `band.offsetHeight / document.documentElement.scrollHeight ≤ 0.02`; metin/bağlantı değişmez; yeni sayfa tipine eklenir; `@media print` gizli.
4. `python seo/build_seo.py` ikinci çalıştırmada `git diff --stat` boş (idempotent); `grep -c "<loc>" sitemap.xml` = aktif oyun + 5 (`/`, `/oyunlar/`, 3 statik).
5. Canlıda yeni dahili dosya yok: `docs/`, `plans/`, `tools/`, `seo/`, `functions/`, `tests/` → 404. `data/games.json` ve `og/` **bilerek** açık.
6. Kilit/adminConfig davranışı değişmez: `admin.html` duman + elle "kilitle/aç" bir oyunda; `?oyun=<slug>` derin bağlantı kilidi atlar (A5 kararı).
7. Kabul geçidi her PR'da: `testing-reality-checker` → görsel varsa `testing-evidence-collector` → `security-ai-generated-code-auditor`.

## Bağımlılık grafiği

```
Faz 1: A9a fontlar ─┐   A9b tembel yükleme ─┐   A8b takma ad ─┐   A9c CSP kararı ─┐
                    ▼                       ▼                 ▼                    ▼
B0 yön ──► B1 tokens ──► B3 dialog ──► B2b yaş rafı UI ──► B4 hareket
B2a veri modeli ───────────────────────┘ (B2b'ye)  └──► B8b og:image (B0 + B2a)
B5 edu-kit ───┐
B6 köprü ─────┼──► B9 CSP enforce            B6 ──► B7 anonim auth + temizlik
B8a taş/kütüp ┘
```

Paralel küme 1 (başlangıç, dosya kesişimi yok): **B0, B2a, B5, B8a**. Küme 2: **B1, B6** (B6 A9b sonrası). Seri zincir: **B1 → B3 → B2b → B4** (hepsi `js/app.js` + `css/hub.css`'e dokunur). **B7** B6 + A8b sonrası. **B9** en son. Toplam iş: ~75–90 saat + B9'un 2×7 gün gözlemi.

---

## B0 — Yön: tasarım sözleşmesi (`docs/tasarim-sozlesmesi.md`)  `[ ]`

**Öncelik:** KAPI (kod yazılmadan önce) · **Model:** strongest · **Ajan:** `design-ui-designer` + skill `design-taste-frontend` (yön), `impeccable` `reference/shape.md` (brief) ve `reference/document.md` (sözleşme biçimi) · **Bağımlılık:** A6/A7 merge; okuldan marka varlıkları (Karar 2) · **Süre:** 4–6 saat, kod yok
**Bağlam:** `docs/inceleme-2026-09-15/03-arayuz-ux.md` puan kartı (Marka 1/5, Tutarlılık 2/5, Hiyerarşi 2/5) ve "Anti-slop / ayırt edicilik — 3 somut yön". Mevcut marka izleri: `theme-color #4AABE0` (`index.html:6`), Fredoka + Nunito, egweblab `assets/logo-96.png` (okul logosu **yok**), şablon moru `#667eea` (`css/hub.css:48`, `css/games.css:352`), gökyüzü/çimen sahnesi (`css/main.css` `--bg-sky-*`, `index.html` `.hub-bg`), emoji ikonlar. Skill ön-uçuşu sırayla: brief → tek satırlık *Design Read* → 3 kadran → sistem seçimi → redesign modu → denetim → sözleşme. Kadran önerisi: `DESIGN_VARIANCE 5 / MOTION 4 / DENSITY 4` — çocuk ürünü + erişilebilirlik kısıtı skill'in "trust-first" satırını tetikler; gerekçe yazılır, sessizce taban alınmaz. Mod: **redesign – preserve** (slug, `?oyun=` derin bağlantı, nav etiketleri, `TR.games` adları, yıldız/kilit mantığı, KVKK metni değişmez; §11.C/11.F). Sistem: resmi paket yok; "defter kâğıdı" kendi dünyası, native CSS token — dürüstçe böyle etiketlenir (§2.B).
**Görevler**
1. §1 Brief: kim (4–12 yaş; sınıf tableti yatay 1024px, evde telefon 375px; öğretmen masaüstü), iş (çocuk 30 sn içinde yaşına uygun oyunu bulup açar; öğretmen kazanım + süreye göre seçer), kısıtlar (WCAG AA, dokunma ≥ 44px, erken okur için etiket ≥ 18px, reduced-motion, okul ağı filtresi: Firebase'siz de çalışır), anti-hedefler (şablon moru, gradyan metin, emoji ikon, sonsuz animasyon, uzun tire `—` sayfa metninde, kicker/eyebrow etiketleri — `craft-floor.md` yasakları).
2. §2 Design Read + kadranlar + sistem + mod + §11.B denetimi: korunan/emekli edilen desen listesi (KORUNUR: kart ızgarası fikri, yıldız ekonomisi, kilit modalı akışı, imza bandı; EMEKLİ: `.hub-bg` sahnesi, `--ease-bounce/--ease-spring`, 52 oyun-başı renk, Comic Sans/Orbitron/Cinzel hub'da, `.popular-section` emoji başlığı).
3. §3 Üç yön tek sözleşmede: (a) **Sınıf rafı** = bilgi mimarisi (B2b girdisi): raf sırası ve sınırları (Karar 8), "Devam et" satırı, öğretmen anahtarının eklediği alanlar (`teaches`, `minutes`, konu), arama (Karar 7); (b) **Bilnet mavisi + defter kâğıdı** = palet + yüzey + kart anatomisi (kâğıt beyazı zemin, 2px mürekkep kontur, köşede konu renkli sekme, 8px konu şeridi; okul logosu üst barda, "Bilnet Okulları" görünür); (c) **Tek tipografik ses** = Fredoka display + Nunito metin, self-host (A9a), oyun içi temalı fontlar yalnız o oyunun iframe'inde.
4. §4 Token sözleşmesi (değer + kullanım yeri + kontrast): palet ≤ 24 semantik token (`--paper --paper-2 --ink --ink-2 --muted --line --blue --blue-deep --blue-tint --star --star-deep --star-empty --ok --warn --info --overlay` + 7 konu rengi `--subject-harf --subject-sayi --subject-bulmaca --subject-yaratici --subject-strateji --subject-fen --subject-online`); tip ölçeği 12/14/16/18/20/24/28/36/48 px (rozet ≥ 12, kart başlığı 20, raf başlığı 28, satır yüksekliği 1.2/1.5); aralık 4/8/12/16/24/32/48/64; yarıçap 8/12/16/24/pill (tek sistem); hareket `--dur-fast 120ms --dur-base 200ms --dur-slow 250ms`, `--ease-out cubic-bezier(.23,1,.32,1)`, `--ease-in-out cubic-bezier(.77,0,.175,1)`, yalnız `transform/opacity`; tek açık tema (Page Theme Lock; koyu tema yok — çocuk ürünü, sınıf ışığı).
5. §5 Bileşen envanteri, her biri için durumlar: üst bar, raf başlığı, yatay ray, oyun kartı (normal/kilitli/yakında/çevrimdışı/online/devam-et), çip (raf/konu), öğretmen anahtarı, arama alanı + boş durum, dialog, toast, düğme (primary/ghost), rozet, kilit ilerlemesi, seviye tamamlama kartı, çevrimdışı bandı, imza bandı. İkon politikası: 24px tek çizgi SVG seti; `assets/images/hub/*.svg` (56) tek ağırlığa kademeli çekilir (B2b'de en görünür 12'si).
6. §6 (isteğe bağlı) `design` tuval skill'i ile 3 artboard: hub 1280, hub 375, öğretmen modu — karar aracı, kod değil; bağlantı sözleşmeye.
7. §7 Skill §14 ön-uçuş listesinden bu projeye uygulanacak maddeler (uzun tire 0, tek vurgu rengi, tek yarıçap, düğme kontrastı, hareket gerekçesi, reduced-motion, `min-height:100dvh`) — B1/B2b/B4 bu listeyi kapı olarak kullanır.
**Doğrulama:** her token için değer + en az bir kullanım yeri; kontrast tablosu (WCAG formülü, `kanit/B0-kontrast.md`) en düşük metin çifti ≥ 4.5:1, büyük metin ≥ 3:1; §11.B denetiminde her emekli desen için dosya:satır; kullanıcı yön onayı (geri alınması en pahalı karar).
**Çıkış kriteri:** kullanıcı "bu yön" dedi; B1 ve B2b yalnız bu dosyayı okuyarak çalışabilir. **Geri alma:** dosya silinir; kod değişmedi.

## B1 — `css/tokens.css` + hub kabuğunun token'a geçişi  `[ ]`

**Öncelik:** yapısal · **Model:** default · **Ajan:** `design-ui-designer` (`impeccable` `reference/extract.md` akışı; `reference/audit.md` kapı) · **Bağımlılık:** B0, A9a (font dosyaları) · **Süre:** 6–8 saat
**Bağlam:** Hub kabuğu 9 dosya (`css/main.css hub.css landing.css games.css multiplayer.css responsive.css animations.css admin.css imza.css`): **182 benzersiz hex / 466 kullanım**; yalnız main+hub+landing 124 hex. `css/main.css:16-127` `:root` 52 oyun-başı renk + UI; `css/landing.css:7-40` ayrı `--l-*` paleti (ikinci görsel dünya); `css/games.css:484` tanımsız `--primary`; 36 ham `'Fredoka', sans-serif`; `transition: all` 25 (17'si `games.css`). 40 oyun CSS'i (`css/<oyun>.css`) kendi temalı dünyası — **bu adımda dokunulmaz**.
**Görevler**
1. `css/tokens.css` (yeni): B0 §4 token'ları; primitif + semantik; `@media (prefers-reduced-motion: reduce)` süre token'larını 0'a değil 150 ms'e çeker; `[data-theme]` yok.
2. `index.html`, `admin.html`, `404.html` ve `seo/build_seo.py` (PAGE_TMPL/HUB_TMPL/STATIC_TMPL `<head>`) → `tokens.css` ilk stylesheet (`?v=` / A10b hash). `landing.css` `:root` bloğu silinir, `--l-*` → semantik token; dosya kalır.
3. 9 dosyada her hex → token; 52 `--<oyun>-color` → 7 `--subject-*` (`js/app.js:28-117` girdilerindeki `color:` alanı konu token'ına eşlenir; B2a'da JSON'a taşınır); ham `font-family` → `var(--font-display|--font-body)`; `transition: all` → özellik listesi; `#667eea` iki yerde silinir; `--ease-bounce/--ease-spring` kullanımları `--ease-out` (silme B4'te).
4. Kontrast çiftleri B0 tablosuyla; `.top-sub`, `.popular-empty`, rozetler ölçülür.
**Doğrulama:** `grep -ohE '#[0-9a-fA-F]{3,8}\b' css/{main,hub,landing,games,multiplayer,responsive,animations,admin,imza}.css | tr A-F a-f | sort -u | wc -l` → **≤ 24 ve hepsi `tokens.css`'te**; `grep -c "transition: all"` bu 9 dosyada 0; kullanılan − tanımlı token farkı yalnız `--cat-color` (JS inline); `reference/audit.md` 5 boyut puanı `kanit/B1-audit.md` (Theming ≥ 3, toplam ≥ 14); 375/1280 ekran görüntüleri `kanit/B1-*.png`; smoke 60/60; Lighthouse 100; `/oyunlar/kelimelik/` ve `/gizlilik/` görsel olarak hub'la aynı dünyada.
**Çıkış kriteri:** hex ≤ 24; görsel fark yalnız sözleşmenin istediği (palet/tipografi). **Geri alma:** PR revert.

## B2a — Veri modeli: `data/games.json` tek kaynak  `[ ]`

**Öncelik:** yapısal · **Model:** default · **Ajan:** `engineering-frontend-developer` + `marketing-seo-specialist` · **Bağımlılık:** A5b (üretici), A10a (test) · **Süre:** 5–6 saat
**Bağlam:** Oyun bilgisi 5 yerde: `js/app.js:28-117` + `:336-348` (kategori, modül, renk, `comingSoon`), `js/lock-catalog.js` (hub sırası, tür, yıldız eşiği), `js/i18n.js:11` (`TR.games` adlar), `seo/games_data.py:132` `GAMES` (59 kayıt: name/cat/age/teaches/short/about/active/players), `index.html:282-379` footer grupları (A5a, elle). `active:false` (Python) ile `comingSoon:true` (JS) ayrı bayrak → sürüklenme. `tests/helpers/slugs.js` kataloğu regex'le okuyor. `age`/`teaches` zaten var; **`subject` ve `minutes` yok**.
**Görevler**
1. `data/games.json` (yeni, UTF-8, slug sırası = hub sırası). Kayıt: `slug, name, module|null, section (harf|sayi|bulmaca|yaratici|strateji), subject (turkce|ingilizce|matematik|fen|kodlama|strateji|sanat|spor|genel), age:[min,max], minutes (tipik tur, 1–30), teaches, short, about, players, players_range, active, stars, badge?, online:{module, stars, badge?}?, files:{css:[], js:[]}` (A9b tembel yükleme listesi buraya taşınır). `kod-macerasi`/`satranc` hem `module` hem `online.module`; `kelime-tahmin` gibi yalnız-online oyunlar `module:null`. `minutes` ve `subject` 58 kayıt için girilir (kaynak: oyun kodu + `EGITSEL-OYUN-PLANI.md` tur süreleri).
2. `tools/build-catalog.js` (yeni, Node, bağımlılıksız): JSON → `js/catalog.js` (`const GAME_CATALOG = [...]` + `const GAME_MODULES = { HarfTanima: () => HarfTanima, ... }` thunk tablosu — üst düzey `const` modüller `window`'a bağlanmadığı için `window[name]` çalışmaz, `js/app.js:22-26` notu) + `index.html` footer'ını `<!-- catalog:start -->…<!-- catalog:end -->` işaretleri arasında yeniden yazar; `--check` modunda fark varsa çıkış 1. Üretilmiş dosya başlığı "ÜRETİLMİŞ — kaynak data/games.json".
3. `js/lock-catalog.js` → `GAME_CATALOG`'dan türetilir (`SOLO_GAMES/ONLINE_GAMES/LOCK_CATALOG/LOCK_STARS_BY_KEY` API'si korunur; `js/admin.js` değişmez). `js/i18n.js` `TR.games` → katalogdan. `js/app.js` `gameCategoryDefs`/`mpGameDefs` → katalogdan üretilir; `resolveEntry` A4 davranışı aynı. `js/catalog.js` `js/errors.js`'ten hemen sonra yüklenir.
4. `seo/games_data.py`: `GAMES = json.load(open('../data/games.json'))`; `seo/build_seo.py:93` `age_range()` `[min,max]` listesini okur; `STATIC_PAGES` Python'da kalır (HTML içerik). `build_hub` kartlarına `minutes`/`subject` (B2b'de yaş rafı düzenine geçer).
5. `tests/helpers/slugs.js` → `data/games.json` okur (regex kalkar). `package.json`: `"catalog": "node tools/build-catalog.js"`, `"catalog:check": "node tools/build-catalog.js --check"`. `.github/workflows/ci.yml`: `npm run catalog:check` + `python seo/build_seo.py && git diff --exit-code oyunlar sitemap.xml llms.txt index.html`.
6. `.vercelignore`: `tools/` eklenir; `data/` **açık kalır** (kamuya faydalı, sır yok). `eslint.config.js`: `GAME_CATALOG`, `GAME_MODULES` hub globali.
**Doğrulama:** `npm run catalog:check` temiz; JSON şema kontrolü `tools/build-catalog.js` içinde (zorunlu alanlar, slug benzersiz, `age[0] < age[1]`, `minutes` 1–30, `module` adı `eslint.config.js` listesinde); `python seo/build_seo.py` → değişen dosya 0 ya da yalnız `minutes/subject` ekleyen satırlar; hub kart sayısı/sırası aynı (46 + 11), `oyunlar/index.html` bağlantı sayısı aynı; smoke 60/60; `curl <preview>/data/games.json` 200, `/tools/build-catalog.js` 404.
**Çıkış kriteri:** JS, Python ve test aynı dosyayı okuyor; `comingSoon`/`active` tek bayrak. **Geri alma:** PR revert (üretilen dosyalar dahil).

## B2b — Bilgi mimarisi: yaş rafı, öğretmen anahtarı, arama  `[ ]`

**Öncelik:** yapısal (Hiyerarşi 2/5 → hedef 4/5) · **Model:** strongest · **Ajan:** `design-ui-designer` + `engineering-frontend-developer` (`reference/craft-floor.md` inşa öncesi okunur) · **Bağımlılık:** B1, B2a, B3 · **Süre:** 10–14 saat
**Bağlam:** 03 YÜKSEK "Bilgi mimarisi": 5 yaşındaki çocuk da öğretmen de aynı 58 kartı görüyor; yön 1 "Sınıf rafı". Hub render `js/app.js:526-816` (`showHub → renderCategoryNav → renderPopularGames → renderHubGrid`); `createGameCard` `innerHTML` şablonu (sabit veri, güvenli); `js/progress.js` "son oynanan" tutmuyor (A4 şema doğrulaması `isValidShape/normalize`, `version:1`). Statik hub `oyunlar/index.html` (`seo/build_seo.py` `HUB_TMPL`) aynı düzeni almalı.
**Görevler**
1. Raf modeli (Karar 8 varsayılanı): `Anaokulu 4–6 · 1–2. sınıf 6–8 · 3–4. sınıf 8–10 · 5–6. sınıf 10–12`; oyun `age` aralığının kestiği her rafa girer; raf seçimi tek çip grubu (`role="radiogroup"`), hatırlanır (`localStorage bo_shelf`), ilk ziyaret "Hepsi" (raflar alt alta, her raf yatay ray). Konu çipleri ikincil eksen (raf içinde filtre). Online oyunlar ayrı bölüm değil: `age`'e göre raflara dağılır + "Online" konu çipi; kart rozeti kalır.
2. "Devam et" satırı: `Progress` şeması v2 (`lastPlayed: {slug: ts}`; v1 → v2 göç `normalize` içinde, bulut blob'u da aynı şekil); `App.startGame`/`startMultiplayerGame` damgalar; ilk satırda son 3 oyun büyük karo; hiç oynanmamışsa raf başlığı ilk sıraya (boş durum metni sözleşmeden; `.popular-section` kaldırılır).
3. Kart anatomisi (B0 §5): 8px konu şeridi, yaş rozeti, süre (`minutes` dk), yıldızlar; `applyLockedState`/`applyOfflineState`/yakında durumları **aynen** korunur.
4. Öğretmen anahtarı: üst barda `role="switch"` (`localStorage bo_teacher`); açıkken kartlarda `teaches` etiketi + konu çipleri + arama alanı (Karar 7). Arama: `input[type=search]`, 58 kayıtta ad/`teaches`/`subject`; aksan ve büyük-küçük duyarsız (`normalize('NFD')` + Türkçe `İ/ı/I/i` eşlemesi elle); sonuç 0 → boş durum; sonuç render `textContent` ile.
5. Klavye: yatay rayda ok tuşları (roving `tabindex`), çip grubunda ok tuşları, kart Enter/Boşluk (`MobileUtils.bindActivate`). Dokunma hedefleri ≥ 44px.
6. `seo/build_seo.py` `HUB_TMPL`/`build_hub` aynı raf düzenini statik üretir; `index.html` SEO bloğu ve footer sayıları `{toplam_oyun}`'dan.
7. Kopya sözleşme sesiyle; sayfa metninde uzun tire 0.
**Doğrulama:** `tests/hub-ia.spec.js` (yeni): "Anaokulu" çipi → `kesir-2048` yok, `renk-eslestirme` var; arama "kesir" → 1 sonuç; öğretmen anahtarı → `teaches` görünür; klavyeyle 5 kart açılır; "Devam et" oynanan oyunu gösterir. Smoke 60/60 (derin bağlantı etkilenmez); Lighthouse 100; 375 / 1024 yatay / 1280 ekran görüntüleri `kanit/B2b-*.png`; `reference/audit.md` yeniden (Erişilebilirlik 4); craft-floor kontrolü (kontrast, ≥ 44px, tip ölçeği, boş/yükleniyor/çevrimdışı durumları).
**Çıkış kriteri:** 5 yaş için tek rafta ≤ ~15 kart; öğretmen 30 sn içinde kazanıma göre oyun bulur; `/oyunlar/` ile hub aynı düzen. **Geri alma:** PR revert; Progress v2 fazladan alan taşır, v1 kodu yok sayar (ileri uyumlu).

## B3 — Modal / dialog sistemi  `[ ]`

**Öncelik:** YÜKSEK (erişilebilirlik) · **Model:** default · **Ajan:** `engineering-frontend-developer` + `design-accessibility-auditor` · **Bağımlılık:** B1 · **Süre:** 4–5 saat
**Bağlam:** Dört katman, dört davranış: kilit penceresi `js/app.js:234-332` (Escape + tek düğmede Tab kilidi, odak geri döner), meta panel `js/bilnet-meta.js:175-236` (Escape, odak "Kapat"a; odak tuzağı yok), seviye tamamlama `js/engine.js:95-131` + `index.html:434` (`role` yok, Escape yok, odak yok), kullanıcı menüsü `js/auth.js` (`.user-menu`). Stil `css/hub.css:523-560`, `:635`, `css/main.css:648`. Kaydırma kilidi `MobileUtils.lockBodyScroll`.
**Görevler**
1. `js/dialog.js` (yeni; `js/errors.js`'ten sonra yüklenir): `Dialog.open(el, {initialFocus, returnFocus, dismissible})` / `Dialog.close(el)`. Yerel `<dialog>` + `showModal()` varsa onu kullanır (üst katman, Escape, odak tuzağı tarayıcıdan; Karar 10); yoksa `role=dialog aria-modal="true"` + elle odak döngüsü + Escape. Arka plan `inert` (desteklenmiyorsa `aria-hidden`). Açılış `--dur-base` ease-out, kapanış daha kısa; reduced-motion anında.
2. Dört katman `Dialog`'a taşınır; `index.html` işaretlemesi `<dialog>`; `css/hub.css` tek `.dialog` + `::backdrop` stili token'larla; `hub.css:523-560` ve `main.css:648` blokları kaldırılır.
3. Seviye tamamlama: `aria-labelledby="complete-title"`; ilk odak "Sonraki Seviye" (yoksa "Tekrar Oyna"); `dismissible:false` (Escape ile kazara çıkış yok — çocuk kullanıcı); yıldız animasyonu (B4 odak anı) burada.
4. Klavye kısayoluyla açılan hiçbir katman animasyonlu değil (emil-design-eng: sık işlem = animasyon yok).
**Doğrulama:** `tests/dialog.spec.js` (yeni), her katman: aç → `document.activeElement` içeride; Tab ×20 → odak içeride; Escape → kapanır, odak tetikleyiciye döner (seviye tamamlama hariç); arka plan `inert`/`aria-hidden`; NVDA ile elle 1 tur (`kanit/B3-nvda.md`); Lighthouse 100; smoke 60/60.
**Çıkış kriteri:** tek dialog API'si, dört kullanım, sıfır özel Escape kodu. **Geri alma:** PR revert.

## B4 — Hareket sistemi  `[ ]`

**Öncelik:** ORTA · **Model:** default · **Ajan:** `design-ui-designer` (`emil-design-eng` karar çerçevesi; `impeccable` `reference/animate.md`) · **Bağımlılık:** B1, B2b (`hub.css` çakışması) · **Süre:** 4–6 saat
**Bağlam:** 03 Hareket 2/5. `css/hub.css:45` `wiggleHover`, `:199` `sunPulse` sonsuz, `:249` `cardEnter` `--ease-spring`, `:536` `lmPop` overshoot, `:625` `float`+`sway` sonsuz; `css/animations.css` 30 keyframe (çoğu kullanımsız); `--ease-bounce/--ease-spring` token'ları; `transition: all` (B1 sonrası yalnız oyun CSS'lerinde). A6'nın hedefli reduced-motion bloğu `css/animations.css:188-215` iyi taban; `playwright.config.js:36` `reducedMotion:'reduce'`.
**Görevler**
1. Hareket tezi (`animate.md` "Set the motion thesis", `kanit/B4-hareket.md`): **odak anı** = seviye tamamlama yıldızları (tek yazarlı sekans, 500–800 ms, `starEarned`); **geri bildirim** = basma `scale(.97)` 120 ms; **durum** = kart kilit/çevrimdışı geçişi 200 ms; **süreklilik** = dialog açılışı 200 ms, kapanış 150 ms; **bütçe** = boşta compositing 0. Kalan her şey silinir: güneş/bulut/süzülme döngüleri, `wiggleHover`, `csBump` overshoot, gölge animasyonları.
2. `css/tokens.css` süre/easing token'ları tek kaynak; `--ease-bounce/--ease-spring` silinir; giriş kademesi `min(i,12)×40 ms` (A6) kalır.
3. `css/animations.css`: kullanımı 0 olan keyframe'ler silinir (`grep -c "<ad>" css/*.css js/*.js`); kalanlar cardEnter, starEarned, successPulse, numberPop, wiggle (hata), fade/dialog.
4. Reduced-motion: dekoratif → `none`, geri bildirim 150 ms ease-out (A6 bloğu güncellenir); oyun sayfalarına (`games/*/index.html`) aynı kural B5 ile edu-kit CSS'i üzerinden.
5. Emil inceleme tablosu (Before / After / Why) `kanit/B4-hareket.md` içinde — her kalan animasyon tek cümle gerekçeli.
**Doğrulama:** `grep -c "infinite" css/main.css css/hub.css css/animations.css css/games.css` → 0; `grep -c "ease-bounce\|ease-spring" css/*.css` → 0; Chrome Performance 10 sn boşta hub: 0 animasyon karesi (`kanit/B4-performance.png`); 375px'te basma tepkisi görünür (`kanit/B4-basma.webm`); smoke 60/60; Lighthouse 100.
**Çıkış kriteri:** hub'da sonsuz animasyon 0; hareket 120–250 ms bandında (odak anı hariç). **Geri alma:** PR revert.

## B5 — `games/_shared/edu-kit.js` + 21 eğitsel oyunun taşınması  `[ ]`

**Öncelik:** YÜKSEK (bakım + B9 önkoşulu) · **Model:** strongest · **Ajan:** `engineering-frontend-developer` + `testing-test-automation-engineer` · **Bağımlılık:** A10a · **Süre:** 10–14 saat (21 dosya × ~30 dk + kit + test)
**Bağlam:** `docs/inceleme-2026-09-15/05-muhendislik.md` ORTA "21 eğitsel oyun aynı iskelet" / Refactor 5. Ölçüm (bu depo): `function tone` **20** dosyada (`grep -l "function tone" games/*/index.html`), `pick` 18, `shuffle` 11, `window.storage` shim 25, `visibilitychange` 23. Her oyun tek dosya HTML + **2 satır içi `<script>`** (örnek `games/bilgi-madencisi/index.html:152-170` shim, `:171+` oyun); satır içi script = CSP enforce engeli. Wrapper'lar `js/games/<slug>.js` iframe `src` `?v=N` (`js/games/bilgi-madencisi.js:30`). `games/ates-buz` ES modül, `kelimelik`/`son-kart` çok dosyalı — bu adım dışı (B6).
**Görevler**
1. `games/_shared/edu-kit.js` (yeni, klasik script, `window.EduKit`, `EduKit.version`): `tone(freq, ms, type)` (tek `AudioContext`, mobil kilit açma `MobileUtils.unlockAudio` deseniyle), `pick(arr)`, `shuffle(arr)` (Fisher-Yates, **yeni dizi döner**), `clamp/rand/randInt/dist`, `storage` shim (aynı Promise API, `window.storage` varsa dokunmaz), `onHidden(pauseFn)` (`visibilitychange` + `pagehide`), `toast(msg)`. `games/_shared/edu-kit.css` (yeni): reduced-motion + odak halkası + tip ölçeği token'ları (B1 `tokens.css`'ten alt küme). `eslint.config.js`: `games/**` için `EduKit: 'readonly'`.
2. Her oyun: iki satır içi blok → `games/<slug>/game.js` (yeni); `<script src="../_shared/edu-kit.js"></script><script src="game.js"></script>`; yerel kopya fonksiyonlar silinir, `EduKit.*` çağrılır; davranış birebir (frekanslar, `pick` semantiği, kayıt anahtarları `js/auth.js` `GAME_SAVE_KEYS` ile aynı). **Oyun başına 1 commit** (`refactor(<slug>): edu-kit`), tek PR.
3. Birebir olmayan varyantlar (md5 farklı `tone`/`shuffle`) `kanit/B5-farklar.md`'de; bilerek korunan farklar not düşülür, kit'e parametre olarak alınır.
4. Wrapper `?v=` artırılır (A10b hash build geldiyse gereksiz).
**Doğrulama:** smoke 60/60; `tests/edu-kit.spec.js` (yeni): 21 oyunda iframe içinde `EduKit.version` tanımlı ve `document.querySelectorAll('script:not([src])').length === 0`; elle 5 oyun bir tur (ses, duraklatma: sekme değiştir → geri gel); `npm run lint` temiz; CSP Report-Only konsolunda bu 21 sayfa için `inline` ihlali 0.
**Çıkış kriteri:** `grep -c "<script>" games/*/index.html` 21 eğitsel oyunda 0; `function tone` yalnız edu-kit'te. **Geri alma:** commit bazında revert (oyun başına).

## B6 — Iframe köprüsü: `parent` Firebase + three.js tekilleştirme  `[ ]`

**Öncelik:** ORTA · **Model:** default · **Ajan:** `engineering-frontend-developer` · **Bağımlılık:** A9b (Firebase/three'nin ne zaman yüklendiği) · **Süre:** 4–6 saat
**Bağlam:** 05 ORTA: `games/kelimelik/index.html:13-30` ve `games/son-kart/index.html:13-29` Firebase compat'i **yeniden** yükler, config literali 3 yerde (`js/firebase-config.js:9-17` + 2 iframe); `games/kelime-madeni-3d/three.min.js` (603 KB, 2021 = r128) hub'daki cdnjs r128 ile çift. `games/ates-buz/js/network.js:62` ve `games/hava-hokeyi/index.html:159` zaten `parent.firebase.database()` kullanıyor (örnek desen). `games/kelimelik/net.js:10` `window.KL_DB`, `games/son-kart/js/net.js:13` `window.SK_DB`.
**Görevler**
1. `js/firebase-config.js`: `window.BilnetBridge = { firebase, db, ready(): Promise<db|null>, uid(): string|null, displayName(): string }` — hub'ın tek köprüsü; A9b tembel yüklemede `ready()` SDK gelince çözülür; B7'de `uid()` anonim/Google uid döner.
2. `games/kelimelik/net.js` ve `games/son-kart/js/net.js` `ready()` → `window.parent !== window && parent.BilnetBridge ? parent.BilnetBridge.db : null`; iki `index.html`'den SDK `<script>`'leri ve config bloğu silinir. Bağımsız açılış (canonical `/oyunlar/`, noindex — A5c): online düğmeleri "Bu oyun Bilnet Oyun içinden oynanır" + bağlantı (Karar 6); Son Kart solo modu bağımsız çalışmaya devam eder.
3. `ates-buz`/`hava-hokeyi`: `parentWin.firebase.database()` → `parent.BilnetBridge.db` (tek API, tek hata mesajı).
4. three.js: `curl -s https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js | cmp - games/kelime-madeni-3d/three.min.js`; aynıysa tek kopya `js/lib/three.r128.min.js` (yeni) — hub (A9b `loadScript`) ve iframe (`../../js/lib/three.r128.min.js`) aynı URL'yi yükler, tarayıcı önbelleği paylaşılır; `games/kelime-madeni-3d/three.min.js` silinir. Farklıysa API farkı `kanit/B6-three.md`'ye, karar B8a'ya.
**Doğrulama:** Network: Kelimelik açıkken `firebase-*-compat.js` isteği yalnız hub'dan (1 kez); Son Kart online oda kur/katıl iki cihaz; Kelimelik online 1 tur; `grep -rn "apiKey" games/` → 0; `grep -rn "three.min.js" games/` → yalnız `js/lib` yolu; smoke 60/60; CSP raporunda `games/kelimelik`, `games/son-kart` inline ihlali 0.
**Çıkış kriteri:** Firebase config tek dosyada; three tek dosyada. **Geri alma:** PR revert.

## B7 — Anonim auth + `auth.uid` sahipliği + günlük temizlik  `[ ]`

**Öncelik:** KRİTİK (isim taklidi, çocuk verisi) · **Model:** strongest · **Ajan:** `security-ai-generated-code-auditor` + `engineering-backend-architect` · **Bağımlılık:** B6, A8b (takma ad seçici), A2 (kural tabanı), Karar 1 · **Süre:** 10–12 saat
**Bağlam:** `docs/inceleme-2026-09-15/01-guvenlik.md` "Ne değişmedi: isim taklidi hâlâ mümkün (anonim auth gerektirir, faz 2)". Kimlikler istemcide rastgele: `js/multiplayer.js:22-35` `'P'+…` → `players/<id>`, `lobbies/<kod>/{hostId,guestId}`; `games/kelimelik/net.js:11`, `games/son-kart/js/net.js:15` `'p'+…`; `js/games/altin-avi.js:191,462` `rooms/altin-avi/<kod>/players/<myId>`; alt düğümler `lobbies/<kod>/zt` (`js/games/zipla-topla.js:1186`), `/ab` (`games/ates-buz/js/network.js:63`), `/hh` (`games/hava-hokeyi/index.html:159`). `database.rules.json` (A2): anahtar biçimi + tip doğrulaması var, **sahiplik yok**; `players/$playerId` `^P[a-z0-9]{10,16}$`, lobi `^[A-Z]{5}$`, oda `^[A-Z2-9]{4}$`. `js/auth.js` Google/misafir; misafirde Firebase oturumu yok.
**Görevler**
1. `js/auth.js`: misafir seçilince `auth.signInAnonymously()` (Firebase konsolunda Anonymous sağlayıcı açılır — **kullanıcı**); Google girişi ayrı hesap (bağlama yok, basitlik); Firebase yoksa online zaten kapalı (A4). `BilnetBridge.uid()` = `auth.currentUser.uid`. Misafir/gizlilik metni: anonim hesap kişisel veri taşımaz (uid opak).
2. Kimlik: `Multiplayer.generatePlayerId()` → uid; Kelimelik/Son Kart `genId()` → `parent.BilnetBridge.uid()`; Altın Avı `myId` → uid. Oda/lobi kodu üretimi değişmez. `players/$playerId` deseni `^P…$` → Firebase uid biçimi (`^[A-Za-z0-9]{20,36}$`).
3. Kural diff'i (özet; tamamı PR'da, emülatörde test edilir):
```
"players": { "$playerId": { ".write": "auth != null && auth.uid === $playerId", ... } }
"lobbies": { "$lobbyId": {
  ".write": "auth != null && $lobbyId.matches(/^[A-Z]{5}$/) && (
    (!data.exists() && newData.child('hostId').val() === auth.uid) ||
    data.child('hostId').val() === auth.uid || data.child('guestId').val() === auth.uid ||
    (!data.child('guestId').exists() && newData.child('guestId').val() === auth.uid) ||
    (data.exists() && !newData.exists() && data.child('createdAt').val() < now - 86400000) )",
  "hostId":  { ".validate": "data.exists() || newData.val() === auth.uid" },
  "guestId": { ".validate": "!newData.exists() || data.exists() || newData.val() === auth.uid" },
  "ab": { ... }, "hh": { ... }, "zt": { ... }      /* aynı sahiplik: host ya da guest */
} }
"rooms/altin-avi/$code/players/$pid": { ".write": "auth != null && auth.uid === $pid" }
"rooms/{kelimelik,son-kart}/$code": { ".write": "auth != null && (yeni oda: names/<uid> var || mevcut: names/<uid> var)" }
```
   Son `.write` dalı (createdAt < now − 24 saat → herkes silebilir) = Spark planında kural tabanlı TTL; lobi listesi açılışında istemci 1 bayat lobiyi siler (fırsatçı temizlik, `js/lobby.js`).
4. Günlük temizlik (Karar 1): **(a)** Blaze varsa `functions/` (yeni) `scheduledCleanup` her gece 03:00 (`lobbies` state≠WAITING ∧ createdAt<−24s; `players` lastSeen<−24s; `rooms/*` FINISHED<−24s); **(b)** Blaze yoksa `.github/workflows/rtdb-temizlik.yml` (yeni, `schedule: cron '0 0 * * *'`) + `tools/rtdb-cleanup.js` (Admin SDK; servis hesabı JSON **yalnız GitHub Secrets**, repo herkese açık) — aynı script yerelden `--dry-run` ile çalışır. Öneri: (b).
5. Emülatör (`firebase emulators:start --only database,auth`): oluştur/katıl/bitir; başkasının `players/<uid>/name` → RED; 24 saatten yeni yabancı lobi silme → RED, 25 saatlik → OK; anonim → Google geçişi; `hands/deck/racks` okunurluğu değişmedi (hile riski Faz 1 kararı — bilinçli).
6. `seo/games_data.py` `STATIC_PAGES` gizlilik "cok-oyunculu" bölümü: "24 saat içinde otomatik silinir", anonim hesap cümlesi; `hakkinda` değişmez.
**Doğrulama:** emülatör senaryoları (`kanit/B7-emulator.md`); canlı deploy sonrası 2 cihaz × Kelimelik, Altın Avı, Zıpla Topla Online, Kelime Tahmin; anonim `curl -X PUT ".../players/abc.json" -d '{"name":"x"}'` → 401; temizlik job'unun ilk koşusu (`kanit/B7-temizlik.log`); Firebase konsolunda Auth kullanıcı sayısı artışı gözlenir (Karar 1b).
**Çıkış kriteri:** her yazma `auth.uid`'e bağlı; bayat veri ≤ 24 saat; 11 online oyun çalışır. **Geri alma:** `git show <önceki>:database.rules.json > database.rules.json && firebase deploy --only database` (dakikalar); `js/auth.js` revert; oluşmuş anonim hesaplar zararsız.

## B8a — Satranç taşları yerel + kütüphane vendor / SRI  `[ ]`

**Öncelik:** ORTA · **Model:** default · **Ajan:** `engineering-frontend-developer` · **Bağımlılık:** A9b (kütüphanelerin yüklendiği yer), B6 (three) · **Süre:** 3 saat
**Bağlam:** `js/games/satranc-engine.js:10-23` 12 taş SVG'si `upload.wikimedia.org` (Cburnett seti, **CC BY-SA 3.0 — atıf zorunlu**); 01 ORTA "SRI yok": `index.html:177-183` chess.js 0.10.3 (cdnjs), Firebase ×3 (gstatic), three r128 (cdnjs), GLTFLoader (unpkg); `js/lib/stockfish.js` vendor emsali; `gizlilik/` üçüncü taraf listesi (`seo/games_data.py` STATIC_PAGES) wikimedia + cdnjs + unpkg sayıyor.
**Görevler**
1. 12 SVG → `assets/images/chess/{K,Q,R,B,N,P,k,q,r,b,n,p}.svg` (yeni); `PIECE_SVGS` yerel yol; `hakkinda` STATIC_PAGES'e "Kaynaklar" bölümü (Cburnett, CC BY-SA 3.0, Wikimedia bağlantısı); `gizlilik` listesinden wikimedia çıkar.
2. chess.js (30 KB) → `js/lib/chess.0.10.3.min.js`, GLTFLoader r128 → `js/lib/GLTFLoader.r128.js` (yeni); three B6'daki `js/lib/three.r128.min.js`. A9b `loadScript` yolları yerel; CSP `script-src`'den cdnjs/unpkg düşer (B9 girdisi); `gizlilik` listesinden cdnjs/unpkg çıkar.
3. Firebase compat (gstatic): önce `curl -sI https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js | grep -i access-control-allow-origin` → `*` ise `integrity="sha384-…"` (`openssl dgst -sha384 -binary | openssl base64 -A`) + `crossorigin="anonymous"` üç dosyaya; `tools/sri-check.js` (yeni) hash'leri yeniden hesaplayıp karşılaştırır, `ci.yml`'e eklenir (hash uyuşmazlığı hub'ı A4 çevrimdışı moduna düşürür — kırılma değil ama görünmez; CI erken uyarır). ACAO yoksa ya da Karar 5 "vendor" derse üç dosya `js/lib/firebase/` altına.
**Doğrulama:** Satranç açılır, Network'te wikimedia isteği 0; `grep -rn "wikimedia\|cdnjs\|unpkg" index.html js/ games/ seo/ --include=*.js --include=*.html --include=*.py` → yalnız `hakkinda` atıf satırı; SRI: `integrity` değerini kasıtlı boz → script yüklenmez, çevrimdışı bandı görünür; düzelt → normal; smoke 60/60; Lighthouse best-practices 100.
**Çıkış kriteri:** üçüncü taraf script origin'i yalnız gstatic (+ `apis.google.com` auth). **Geri alma:** PR revert.

## B8b — Oyun başına og:image  `[ ]`

**Öncelik:** DÜŞÜK (SEO P2) · **Model:** default · **Ajan:** `marketing-seo-specialist` · **Bağımlılık:** B0 (marka), B2a (veri), A9a (font dosyaları) · **Süre:** 3 saat
**Bağlam:** `docs/inceleme-2026-09-15/04-seo.md` P2: 55 sayfa aynı `og-image.png`; `seo/build_seo.py:34-35` `OG_IMAGE` sabiti + `TODO(A5-og)`; hub ikonları SVG (`assets/images/hub/`, 56). **Pillow (12.2, kurulu) SVG rasterize edemez**; `cairosvg` Windows'ta cairo ister → şablon HTML'i Playwright (kurulu) ile ekran görüntüsü tercih edilir; Pillow yalnız isteğe bağlı PNG-8 küçültme (Karar 9).
**Görevler**
1. `seo/og-template.html` (yeni; `css/tokens.css` + self-host fontlar; 1200×630; defter kâğıdı zemin, ikon, ad, yaş/konu rozeti, "Bilnet Oyun") ve `tools/build-og.js` (yeni; Playwright chromium, `data/games.json` aktif oyunlar + hub + 3 statik → `og/<slug>.png`; deterministik: `deviceScaleFactor:1`, animasyon yok; kaynak hash'i değişmeyen görsel yeniden üretilmez).
2. `seo/build_seo.py`: `og_image = f"{SITE}/og/{slug}.png"` (dosya yoksa `og-image.png`); JSON-LD `image` aynı; `index.html` og:image `og/hub.png`. `package.json` `"og": "node tools/build-og.js"`; `og/` `.vercelignore`'da açık; mevcut `vercel.json` png önbellek kuralı kapsar.
**Doğrulama:** `ls og | wc -l` = aktif oyun + 4; `curl -sI <preview>/og/kelimelik.png` → 200 `image/png`; opengraph.xyz ile 1 sayfa; boyut ≤ 120 KB/adet; `python seo/build_seo.py` idempotent; sitemap değişmez.
**Çıkış kriteri:** her landing kendi görseliyle paylaşılır. **Geri alma:** `OG_IMAGE` sabitine dön, `og/` sil.

## B9 — CSP: Report-Only → enforce  `[ ]`

**Öncelik:** YÜKSEK (güvenlik) · **Model:** default · **Ajan:** `security-ai-generated-code-auditor` · **Bağımlılık:** B5, B6, B8a, A9c; Karar 4 (tarih) · **Süre:** 3 saat + 2 × 7 gün gözlem
**Bağlam:** `vercel.json` `Content-Security-Policy-Report-Only` (A1; `wasm-unsafe-eval`, `worker-src 'self' blob:`). Satır içi script envanteri: hub sayfalarında 0 (`index.html` JSON-LD blokları çalıştırılmaz); B5/B6 sonrası iframe sayfalarında kalanlar: `games/bil-ve-fethet/index.html` (2 blok + 6 `onclick`), `games/zindan-okcusu/index.html` (2 blok + 44 `on*`), `games/kelime-madeni-3d/index.html` (2 blok + 12 `on*`, comingSoon), `games/hava-hokeyi/index.html:35` (1 blok). `style-src 'unsafe-inline'` kalır (satır içi `style=` ve JS `style.width`; script için değil — kabul edilir risk, not düşülür). Ücretsiz rapor toplayıcı yok → ölçüm tarayıcı konsolu + Playwright.
**Görevler**
1. Kalan 4 sayfa: satır içi bloklar → `games/<slug>/game.js`, `on*=` → `addEventListener` (A9c iki oyunda yaptıysa atla). Hedef: `grep -c "<script>" games/*/index.html` toplam 0; `grep -cE 'on[a-z]+="' games/*/index.html` 0.
2. `vercel.json` Report-Only değeri nihai: `script-src 'self' 'wasm-unsafe-eval' https://www.gstatic.com https://apis.google.com` (cdnjs/unpkg B8a ile düştü; Firebase vendor edildiyse gstatic de düşer); `tests/csp.spec.js` (yeni): 60 sayfada `console` mesajı "Content Security Policy" içeren 0 — `BASE_URL=<önizleme>` ile koşar (Vercel önizleme başlıkları prod ile aynı).
3. **PR1** (1 + 2) → 7 gün Report-Only'de 3 farklı cihazda konsol gözlemi → **PR2**: aynı değer `Content-Security-Policy` başlığına kopyalanır, Report-Only **yanında kalır** (çift başlık; ihlal olursa rapor sürer) → 7 gün → **PR3**: Report-Only silinir.
**Doğrulama:** `tests/csp.spec.js` 0 ihlal; `curl -sI https://bilnetoyun.com/ | grep -i content-security-policy` → enforce başlığı; 2 cihazda Google girişi (popup `apis.google.com`, `frame-src` firebaseapp) + 3 online oyun + Satranç (worker) + LEGO World (three); smoke 60/60 prod `BASE_URL` ile.
**Çıkış kriteri:** enforce başlığı canlı, 7 gün 0 ihlal. **Geri alma:** `vercel.json`'da başlık adını `-Report-Only`ye çevir + push (dakikalar); kod değişikliği gerekmez.

---

## Karar gerektiren noktalar (kullanıcı)

1. **B7 temizlik:** Cloud Function (Blaze) mi, GitHub Actions cron + servis hesabı (Spark yeter, öneri) mi? **1b:** anonim hesap birikimi — Identity Platform otomatik temizliği (Blaze) ya da birikime razı olmak (maliyetsiz, yalnız sayaç).
2. **B0 marka varlıkları:** okul logosu (SVG), resmî mavi (`#4AABE0` mi?), "Bilnet Okulları" yazımı; okulun resmî site / sosyal URL'leri (A8'den açık).
3. Firebase Hosting yansısı `childsplaylogic.web.app`: kalsın mı, `firebase.json` hosting bloğu kaldırılsın mı (kalırsa ignore listesi `.vercelignore` ile senkron yükü sürer)?
4. **B9 enforce tarihi** (PR2 ve PR3 günleri).
5. **B8a Firebase SDK:** gstatic + SRI mi, `js/lib/firebase/` vendor mı? (Okul ağı filtresi ve tek origin lehine vendor; güncelleme elle.)
6. **B6:** `games/*/index.html` bağımsız açıldığında online mod desteklenmesin (köprü yalnız hub'da; Son Kart solo çalışır).
7. **B2b arama:** çocuğa da görünsün mü, yalnız öğretmen modunda mı? (Öneri: yalnız öğretmen; çocuğa raf yeter.)
8. **B2b raf sınırları** 4–6 / 6–8 / 8–10 / 10–12 ve raf adları (okuldaki kullanım: "Anaokulu" mı "Okul Öncesi" mi); ilk ziyaret varsayılanı "Hepsi".
9. **B8b araç:** Playwright ekran görüntüsü (öneri) — Pillow-only istenirse ikon yerine `assets/images/categories/*.png` kullanılır (oyun başına ayrışma azalır).
10. **B3 `<dialog>`:** sınıf tableti filosunun tarayıcı sürümü (Safari ≥ 15.4 / Chrome ≥ 37 gerekir; değilse yedek yol devrede kalır — yalnız bilgi).

## Plan mutasyon protokolü

Bir adım bölünür/atlanır/eklenirse: bu dosyada adımın başlığına `[bölündü → B5a/B5b]`, `[atlandı: gerekçe]` veya `[eklendi: tarih]` notu düşülür; bağımlılık grafiği ve paralel kümeler güncellenir; Faz 1 planındaki A12 satırına bu dosyanın yolu işlenir; commit mesajı `docs(plan): …`. Karar listesindeki bir madde karara bağlanınca ilgili adımın "Bağlam" satırına `[Karar N: …]` eklenir.

## Kanıt klasörü

`docs/inceleme-2026-09-15/kanit/` — `B0-kontrast.md`, `B1-audit.md`, `B1-*.png`, `B2b-*.png`, `B3-nvda.md`, `B4-hareket.md`, `B4-performance.png`, `B5-farklar.md`, `B6-three.md`, `B7-emulator.md`, `B7-temizlik.log`, Lighthouse JSON'ları. Kabul geçidi bu klasörsüz "geçti" demez.
