# bilnetoyun — proje haritası (Claude Code her oturumda otomatik yükler)

Bu dosya keşif yerine geçer: yapı sorusu burada/README'de yanıtlanıyorsa başka dosya AÇILMAZ.
Yalnız görevin dokunduğu dosyalar açılır. Yapıyı değiştiren iş bitince bu dosya güncellenir.

@README.md

## README'nin söylemediği sözleşmeler

### Hub-içi oyun modülü (iframe olmayan oyunlar — `js/games/<slug>.js`)

```js
const ModulAdi = (() => {
    const id = 'slug';                       // = data/games.json slug'ı, TR.games anahtarı, hub ikonu adı
    const levels = [ { …seviye ayarı… } ];   // uzunluğu = data/games.json `levels` değeri (uyuşmazsa console.error)
    let container, callbacks, timers = [];
    function init(gameArea, level, cbs) {   // cbs = { onCorrect, onWrong, onComplete }
        container = gameArea; callbacks = cbs;
        GameEngine.setTotal(turSayisi);      // yıldız hesabı için toplam
        // … DOM'u container'a kur …
    }
    function destroy() {                     // hub'a dönüşte / yeniden başlatmada çağrılır
        timers.forEach(clearTimeout); timers = [];  // geciken zamanlayıcı kopuk DOM'a yazmasın
        // dinleyicileri (document keydown vb.) MUTLAKA kaldır
        if (container) container.innerHTML = '';
    }
    return { id, levels, init, destroy };
})();
```

- `GameEngine` (`js/engine.js`): `startGame(game, level)` her seferinde `#game-area` düğümünü
  TAZELER (klon + replaceWith; eski oyunun geciken zamanlayıcıları kopuk düğüme yazar) ve `init` eder;
  callback'ler nesil sayacına bağlıdır (eski nesil → yok sayılır). `onCorrect()`/`onWrong()` sayar +
  ses çalar (modül aynı sesi tekrar ÇALMAZ); `onComplete(customStars?)` yıldızı hesaplar
  (deneme doğruluğu = doğru/(doğru+yanlış): ≥%95 → 3, ≥%70 → 2, altı → 1; deneme 0 ise 3),
  `Progress`'e yazar, kutlama overlay'ini açar. Modül `GameEngine.getCurrentLevel()` ile aktif seviyeyi okuyabilir.
- Paylaşılan yardımcılar (hepsi global, `index.html` yükler):
  `AudioManager.play('tap'|'success'|'error'|'star'|'complete'|'pop'|'whoosh'|'flip')` (Web Audio, dosya yok);
  `Particles.sparkle(x,y,n)` / `.confetti(x,y,n)` / `.stars(x,y,n)` / `.celebrate()`;
  `MobileUtils.bindActivate(el, fn)` (tap+click tekilleştirir), `.isTouchDevice()`;
  `TR` (`js/i18n.js`): `TR.games[id]` ad, `TR.instructions[id]` yönerge, `TR.letterImages[HARF]` → `[{word, emoji}]`, `TR.alphabet`, `TR.colors`;
  `Progress.getLevelStars(id, level)`;
  **`Dialog`** (`js/dialog.js`, B3 — tek modal/katman API'si, `js/errors.js`'ten hemen sonra yüklenir):
  `Dialog.open(el, { initialFocus, returnFocus, dismissible = true, modal = true, animate = true, onClose })` /
  `Dialog.close(el)` / `Dialog.isOpen(el)` / `Dialog.fromKeyboard(e)`. `el` bir `<dialog class="dialog">`
  (+ `aria-labelledby`): `showModal()` varsa üst katman, yoksa yedek yol (`open` özniteliği, `role=dialog`,
  elle Tab döngüsü); Escape/Tab sarma/perdeye tık/odak dönüşü/kardeşleri `inert` (ya da `aria-hidden`) hep
  modülde — **katmanda özel Escape/Tab kodu yazılmaz**. `dismissible:false` → Escape ve perde kapatmaz
  (seviye tamamlama). `modal:false` → menü/popover (`show()`, perde/inert yok, dışarı tık + odak kaçışı kapatır).
  Klavyeyle açılan katman `animate: !Dialog.fromKeyboard(e)` ile animasyonsuz. Kap stili `css/hub.css .dialog`
  (giriş `--sure-gecis`, çıkış `--sure-bas`, reduced-motion anında); kart stili katmanın kendi bloğunda.
  Konfeti kanvası `data-dialog-ustu` ile modal açıkken üst katmana (popover) alınır. Test: `npm run test:dialog`.
- Paylaşılan CSS (`css/games.css`): `.game-instruction`, `.game-option-btn` (+`.correct`/`.wrong`
  animasyonlu), `.letter-display`, `.number-btn`, `.level-selector`/`.level-btn`. Token'lar
  **`css/tokens.css`** (B1; tek kaynak `docs/tasarim-sozlesmesi.md` §1, her sayfada ilk stylesheet):
  renk `--mavi-500/700/800/050 --gok-ust/alt --cim(-koyu) --gunes --murekkep(-orta) --beyaz --cizgi
  --kat-harf/sayi/bulmaca/yaratici/strateji/online --dogru(-zemin) --yanlis --yildiz(-bos)` (24 hex; hub
  kabuğunda başka hex yazılmaz), yazı `--font-display/--font-body` + `--yazi-<rol>-{aile,kalinlik,boy,satir}`,
  aralık `--ara-1…8`, yarıçap `--r-kart/--r-giris/--r-hap`, `--kontur`, gölge `--golge-1..3`, `--hedef-min`,
  süre/eğri `--sure-bas/gecis/kutlama --egri-out/--egri-yay`; semantik `--metin --yuzey --dugme-dolgu …`.
  Eski adlar (`--<slug>-color`, `--touch-min`, `--radius-*`, `--ease-*`, `--dur-*`, `--success/--error`,
  `--text-warm/--text-muted`, `--font-heading`) tokens.css "köprü" katmanında takma ad olarak yaşar — yalnız
  oyun CSS/JS'leri için, B4'te kaldırılır; yeni kod bunları kullanmaz. Oyuna özel stil `css/<slug>.css`'e,
  registry `files`'a eklenir.
- Kayıt defteri **`data/games.json`** (TEK kaynak, B2a): kayıt `{ slug, name, module: 'ModulAdi', section, cat, subject, age, minutes, levels, …, files: { js: ['js/games/<slug>.js'], css: ['css/<slug>.css'] } }`;
  `npm run catalog` → `js/catalog.js` (`GAME_SHELVES` + `GAME_SECTIONS` + `GAME_CATALOG` + `GAME_MODULES` thunk tablosu) + `index.html` altbilgisi, altbilgi giriş cümlesi (`catalog:lead`) ve SEO bloğu (`catalog:seo`; sayılar + oyun adları). `js/app.js`, `js/hub-ia.js`, `js/lock-catalog.js`, `js/i18n.js TR.games` buradan türer; elle girdi yazılmaz.
  **`index.html`'e etiket eklenmez** — dosyalar `files` ile tembel yüklenir (A9b); `?v=` yazılmaz (üretici reddeder; deploy hash'ler).
- **Hub çizimi (B2b, `js/app.js showHub` → `renderHubControls` / `renderContinue` / `renderHubGrid`; yardımcılar `js/hub-ia.js`):**
  birinci eksen **yaş rafı** (`data/games.json shelves`, `ages` kapalı tam yaş aralığı; oyun `age` kesişirse o rafa girer, birden çok raf olabilir;
  `localStorage bo_shelf` = `'hepsi'` | raf id, ilk ziyaret Hepsi = raflar alt alta + raf başına yatay ray `.raf-ray`; tek raf = `.raf-izgara`),
  ikinci eksen kategori çipi (`data-cat`/`data-value` = bölüm id, `'all'`; online oyunlar ayrı bölüm DEĞİL, raflara dağılır + `data-online` kart + "2 Oyuncu" rozeti).
  "Devam et" ilk satır: `Progress` v2 `lastPlayed { <kilit anahtarı>: ts }` (`touchLastPlayed` `startGame`/`startMultiplayerGame`'de; boşsa maskotlu boş durum).
  Öğretmen görünümü `localStorage bo_teacher` = `'1'` (`#btn-teacher role=switch`, `#hub.ogretmen`): kartlarda kazanım + süre, ders çipleri (`#hub-subject-nav`), arama (`#hub-search`, ad/kazanım/ders/bölüm, aksan + İ/ı duyarsız sözcük başlangıcı; sonuç `.raf--arama`). Çip grupları `role=radiogroup` (ok tuşları seçer), kartlarda roving tabindex (`HubIA.bindRoving`).
  Kart tek yol `createGameCard(entry, { wide, shelf })` (DOM API, innerHTML yok): `data-section` → kategori şeridi (`css/hub.css`, yeni oyun için CSS satırı GEREKMEZ), yıldız satırı oyun düzeyi 3 yuva (`cardStarCount`), yaş rozeti; `applyLockedState`/`applyOfflineState`/yakında aynen.
  Statik `oyunlar/index.html` aynı raf ve kategori verisiyle (`seo/build_seo.py build_hub`: JS'siz radio + `:has()` süzgeci, `css/landing.css`).
- Duman testi (`tests/smoke.spec.js`) slug'ları `data/games.json`'dan türetir (`active:false` atlanır) → yeni oyun JSON'a
  girince otomatik kapsanır (`/?oyun=<slug>` 3 sn hatasız).

### Eğitsel iframe oyunu (`games/<slug>/index.html` + `game.js` + `games/_shared/edu-kit.js`, B5)

- `index.html` gövde sonu: `<script src="../_shared/edu-kit.js"></script><script src="game.js"></script>`; head: `<link rel="stylesheet" href="../_shared/edu-kit.css">` oyunun `<style>`'ından önce. **Satır içi `<script>` ve `on*=` yazılmaz** (CSP provası `npm run test:edu-kit` kırılır); `?v=` yazılmaz (build hash'ler).
- `game.js` klasik script (`"use strict"`), hub modüllerine BAŞVURMAZ (iframe ayrı pencere; `MobileUtils`/`AudioManager` yok). Global `EduKit` (eslint `games/**`):
  `EduKit.audio.init()` (bağlamı kur + resume — "Oyna" tıklamasında çağır) · `EduKit.tone(f, durSaniye, type='triangle', vol=0.06, whenSaniye=0)` (init öncesi sessiz; kit ilk jestte askıdaki bağlamı kendisi uyandırır) ·
  `pick(arr)` · `shuffle(arr)` (yeni dizi) / `shuffleInPlace(arr)` · `randInt(a,b)` (kapalı aralık) · `rand/clamp/dist` · `storage` (= `window.storage`: `get(key)→{value}|null`, `set`, `remove`; anahtar `js/auth.js GAME_SAVE_KEYS`'e) ·
  `onHidden(pauseFn, resumeFn?)` (visibilitychange gizli + pagehide → pauseFn; görünür/pageshow → resumeFn; oyun kendiliğinden sürmez, Devam düğmesi) · `toast(msg, ms=2800)` (`#toast` varsa oyunun stili).
  Oyun deseni: `const Audio2 = (() => { const { init, tone } = EduKit.audio; return { init, ok: () => tone(660, 0.1, 'triangle', 0.07), … }; })();` — ses adları/frekanslar oyunda kalır, zarf kit'te.
- Kit CSS token'ları `css/tokens.css`'in KOPYASIdır (iframe'e tokens.css ulaşmaz); yeni token gerekirse tokens.css'ten kopyalanır, test (`edu-kit.spec.js`) ad+değer eşitliğini denetler. Kit sürümü `EduKit.version` (semver; API kırılırsa majör).

### Yeni oyun ekleme (README "Yeni oyun ekleme" + düzeltme)

README "Yeni oyun ekleme" (B2a sonrası) güncel; kısa sıra:
1. `js/games/<slug>.js` (+ `css/<slug>.css`) — yukarıdaki sözleşme; modül adı `eslint.config.js gameModuleGlobals`'a.
2. `data/games.json` kaydı (hub sırasında; `stars` 0 = kilitsiz; `online` varsa `order`) → `npm run catalog`.
3. Kategori şeridi otomatik (`data-section` → `var(--kat-<bölüm>)`, B2b; `css/hub.css`'e satır eklenmez, yeni renk adı AÇILMAZ) · `js/i18n.js` `TR.instructions` (yönerge varsa). Yaş rafı `age`'den türer (raf listesi `data/games.json shelves`).
4. `assets/images/hub/<slug>.svg` (128×128, `rx=28` yuvarlatılmış gradyan zemin kalıbı; v2 sahne dili, emoji yok).
5. `python seo/build_seo.py` (üretilenler elle düzenlenmez).
6. `npm run lint && npm run catalog:check && npm run test:smoke && python seo/test_build_seo.py`.
7. Kayıt anahtarı (localStorage) kullanıyorsa `js/auth.js GAME_SAVE_KEYS`.

## Çalışma kuralları
- Tüm `*.md` `.vercelignore` ile yayın dışı; `oyunlar/**`, `sitemap.xml`, `llms.txt`, `js/catalog.js` ve `index.html` altbilgi grupları üretilir, elle dokunulmaz (CI `catalog:check` + SEO tazelik kontrolüyle kırmızıya döner).
- Dal → PR → Vercel önizleme → kabul geçidi (Adım 3) → CI yeşil → **Claude merge eder** (sahip kararı,
  16 Eyl 2026: "merge dahil GitHub işlemlerini sen yap"). `master`'a doğrudan push yok; birleştirme yalnız PR üzerinden.
- Aynı depoda iki oturum paralel çalışmaz (`EGITSEL-FAZ-DURUM.md` dersi); çalışma ağacı kirliyse
  yeni iş ayrı worktree'de dallanır.
- Süren işler: `plans/` (düzeltme, Faz 2, oyun denetimi blueprint'leri) — kaldığı yer orada yazar.
