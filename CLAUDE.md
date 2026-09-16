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
  `Progress.getLevelStars(id, level)`.
- Paylaşılan CSS (`css/games.css`): `.game-instruction`, `.game-option-btn` (+`.correct`/`.wrong`
  animasyonlu), `.letter-display`, `.number-btn`, `.level-selector`/`.level-btn`. Token'lar
  `css/main.css :root` — `--<slug>-color`, `--touch-min: 52px`, `--radius-sm/md/lg`, `--ease-bounce/
  spring/out`, `--dur-fast/base`, `--success/--error(+-light)`, `--text-warm/--text-muted`, fontlar
  Fredoka (başlık) / Nunito (gövde). Oyuna özel stil `css/<slug>.css`'e, registry `files`'a eklenir.
- Kayıt defteri **`data/games.json`** (TEK kaynak, B2a): kayıt `{ slug, name, module: 'ModulAdi', section, cat, subject, age, minutes, levels, …, files: { js: ['js/games/<slug>.js'], css: ['css/<slug>.css'] } }`;
  `npm run catalog` → `js/catalog.js` (`GAME_CATALOG` + `GAME_MODULES` thunk tablosu) + `index.html` altbilgisi. `js/app.js`, `js/lock-catalog.js`, `js/i18n.js TR.games` buradan türer; elle girdi yazılmaz.
  **`index.html`'e etiket eklenmez** — dosyalar `files` ile tembel yüklenir (A9b); `?v=` yazılmaz (üretici reddeder; deploy hash'ler).
- Duman testi (`tests/smoke.spec.js`) slug'ları `data/games.json`'dan türetir (`active:false` atlanır) → yeni oyun JSON'a
  girince otomatik kapsanır (`/?oyun=<slug>` 3 sn hatasız).

### Yeni oyun ekleme (README "Yeni oyun ekleme" + düzeltme)

README "Yeni oyun ekleme" (B2a sonrası) güncel; kısa sıra:
1. `js/games/<slug>.js` (+ `css/<slug>.css`) — yukarıdaki sözleşme; modül adı `eslint.config.js gameModuleGlobals`'a.
2. `data/games.json` kaydı (hub sırasında; `stars` 0 = kilitsiz; `online` varsa `order`) → `npm run catalog`.
3. `css/hub.css` `.game-card[data-game="<slug>"]::before` · `js/i18n.js` `TR.instructions` (yönerge varsa).
4. `assets/images/hub/<slug>.svg` (128×128, `rx=28` yuvarlatılmış gradyan zemin kalıbı).
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
