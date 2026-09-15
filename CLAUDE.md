# bilnetoyun — proje haritası (Claude Code her oturumda otomatik yükler)

Bu dosya keşif yerine geçer: yapı sorusu burada/README'de yanıtlanıyorsa başka dosya AÇILMAZ.
Yalnız görevin dokunduğu dosyalar açılır. Yapıyı değiştiren iş bitince bu dosya güncellenir.

@README.md

## README'nin söylemediği sözleşmeler

### Hub-içi oyun modülü (iframe olmayan oyunlar — `js/games/<slug>.js`)

```js
const ModulAdi = (() => {
    const id = 'slug';                       // = kayıt defteri id'si, TR.games anahtarı, hub ikonu adı
    const levels = [ { …seviye ayarı… } ];   // uzunluğu = js/app.js `levels:` değeri (uyuşmazsa console.error)
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

- `GameEngine` (`js/engine.js`): `startGame(game, level)` her seferinde `#game-area`'yı temizler,
  `init` eder; `onCorrect()`/`onWrong()` sayar + ses çalar; `onComplete(customStars?)` yıldızı
  hesaplar (doğruluk ≥%95 → 3, ≥%70 → 2, altı → 1; toplam 0 ise 3), `Progress`'e yazar, kutlama
  overlay'ini açar. Modül `GameEngine.getCurrentLevel()` ile aktif seviyeyi okuyabilir.
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
- Kayıt defteri `js/app.js gameCategoryDefs`: `{ game: () => ModulAdi, id, levels, files: ['js/games/<slug>.js', 'css/<slug>.css'], color: 'var(--<slug>-color)' }`.
  **`index.html`'e etiket eklenmez** — dosyalar `files` ile tembel yüklenir (A9b); `?v=` elle artırılmaz.
- Duman testi (`tests/smoke.spec.js`) slug'ları `js/lock-catalog.js`'ten türetir → yeni oyun kataloğa
  girince otomatik kapsanır (`/?oyun=<slug>` 3 sn hatasız).

### Yeni oyun ekleme (README "Yeni oyun ekleme" + düzeltme)

README'nin 2. adımındaki "`index.html`'e `<link>`/`<script>`" **eskidir**; doğru sıra:
1. `js/games/<slug>.js` (+ `css/<slug>.css`) — yukarıdaki sözleşme.
2. `js/app.js` `gameCategoryDefs` kaydı (`files` ile) · `js/i18n.js` `TR.games` + `TR.instructions` ·
   `css/main.css` `--<slug>-color` · `css/hub.css` `.game-card[data-game="<slug>"]::before`.
3. `js/lock-catalog.js` `SOLO_GAMES` (hub sırasında; eşik yoksa yazılmaz = kilitsiz).
4. `assets/images/hub/<slug>.svg` (128×128, `rx=28` yuvarlatılmış gradyan zemin kalıbı).
5. `seo/games_data.py` `GAMES` kaydı → `python seo/build_seo.py` (üretilenler elle düzenlenmez).
6. `npm run lint && npm run test:smoke && python seo/test_build_seo.py`.
7. Kayıt anahtarı (localStorage) kullanıyorsa `js/auth.js GAME_SAVE_KEYS`.

## Çalışma kuralları
- Tüm `*.md` `.vercelignore` ile yayın dışı; `oyunlar/**`, `sitemap.xml`, `llms.txt` üretilir, elle dokunulmaz.
- Dal → PR → Vercel önizleme → geçit incelemesi → sahip merge'ü. `master`'a doğrudan push yok.
- Aynı depoda iki oturum paralel çalışmaz (`EGITSEL-FAZ-DURUM.md` dersi); çalışma ağacı kirliyse
  yeni iş ayrı worktree'de dallanır.
- Süren işler: `plans/` (düzeltme, Faz 2, oyun denetimi blueprint'leri) — kaldığı yer orada yazar.
