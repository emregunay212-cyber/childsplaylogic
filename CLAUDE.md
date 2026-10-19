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
  `cbs.onLevelUp(stars)` (kesintisiz akış, Klavye Kâşifi): seviyeyi overlay AÇMADAN bitirir — yıldız `Progress`'e,
  araç çubuğu sonraki seviyeye geçer, modül yeniden init EDİLMEZ (akışı kendi sürdürür); son seviyede `onComplete`.
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

### Ateş & Buz fizik sözleşmesi (`games/ates-buz/js/`, 30 Eyl 2026 düzeltmesi — `docs/ates-buz-fizik-2026-09-30.md`)

- Elle yazılmış dikdörtgen çarpışma (`player.js`/`ingameAssets/cube.js`/`ball.js`) **hıza ve veriye duyarlıdır**:
  `game.js MOVE_SPEED` (orijinal 2.0 → şimdi 3.0) ya da `collisionBlocks.js`/`data/*.json` değişince **`npm run test:ates-buz`** koşulur;
  kırmızıysa oyun yeniden açılmaz. Sayılar değil **değişmezler** denetlenir: gövde blokta gömülü kalmaz, tek karede ışınlanma yok,
  duvar "tünellemesi" yok, parça/oyuncu/elmas katı blokta doğmaz, seviye görseli ↔ çarpışma ızgarası birebir.
- Kurallar (kırmızıyı bozmadan değiştirme): (1) yatay itme yönü **hız işaretiyle değil bloğa göre en az bindirmeyle** seçilir
  (kare/rampa/küp, üçgen kafa-çarpışması, küp, top; yatay bindirme dikeyden büyükse dikey çözüme bırakılır);
  (2) dikey düzeltme "iniş ≤ 16 px / tavan ≤ 12 px" (küp/top 30/12), eğim yüzeyine çekme ≤ 36 px (hücre yüksekliği) — daha derini
  yan gömülmedir, "üstüne/altına/yüzeye ışınlama" yapılmaz, girdiği yüzden itilir;
  (3) `sliding` bayrağı açıkken **ve oyuncu bir KARE bloğa yaslıyken** bloğa doğru yürüme o kare iptal (kayma her hızda yürümeyi yener;
  eğimde kayarken iptal YOK — eğim inişini/tırmanışını bozar); (4) `checkStuck()` bekçisi: gövde ≥8 px gömülü 30 kare → son serbest
  konum (`lastSafe`; yeniden doğuşta `game.js` sıfırlar; `unstuckCount` ölçer).
- Test kapsamı: `tests/ates-buz-fizik.mjs` hız/zıplama sabitlerini `game.js`'ten okur; `SEEDS=10 FRAMES=6000 node tests/ates-buz-fizik.mjs`
  geniş tarama (1,8 M kare, ~2 dk; CI'da yok). Korumalar mutasyonla sınandı (bir korumayı bozunca ilgili S-senaryosu kırmızı olmalı;
  istisna: eğim çekme sınırı yalnız varsayılan taramayla yakalanır).
- Seviye 1–6 elle, 7–10 `tools/build_levels.py` ile üretilir (yalnız `GENERATED LEVELS 7-10` bloğu); seviye dizisi değişince
  görsel eşitliği testi (`tests/ates-buz-veri.spec.js`) kırar — ızgara görselden türetilir, tersi değil.
- Bilinen kusurlar (özgün kodda var, bilerek dokunulmadı): seviye 4 kol #0 ve #1 rampaları ara konumdayken bir eğim/blok köşesiyle ~16 px'lik
  dar aralık → oyuncu ~0,5 sn takılır, bekçi çözer (rampalar oyuncuyu itmez/taşımaz); seviye 4/6'da eğim kenarlarında 14–24 px'lik
  tek karelik sıçrama/titreme; iki oyuncu küpü ters yönlerde iterken küpün ~40 px sıçraması. Oyun hub'da AÇIK (1 Eki 2026: sahip bağımsız sayfada elle test etti, öğrencilere açıldı);
  sahada sorun bildirilirse önce bu belgedeki bilinen kusurlara bak.

### Klavye Kâşifi (kesintisiz akış — `js/games/klavye-kasifi.js` + `klavye-kasifi-icerik.js`, 13 Eki 2026)

- Sıra sahip kararı: Harfler → Heceler → Kelimeler → Cümleler (noktalamasız) → Rakamlar → Noktalama. **Kısım = motor seviyesi**
  (`data/games.json levels` = kısım sayısı, 6); kısım içindeki bölümler (39) şeritle kendiliğinden geçer — "Sonraki Seviye" düğmesi
  yok; kısım sonu `onLevelUp`, yalnız son kısım `onComplete` (katman). Açılışta (hub kartı, derin bağlantı, "Tekrar Oyna")
  **başlangıç seçici**: kısım kartı ya da bölüm numarası → modül `pendingStart` bırakıp `GameEngine.startGame(oyun, kısım)` çağırır
  (araç çubuğu + yıldız kaydı doğru seviyeye), yeni init seçilen bölümden başlar; oyun tuş dinleyicisi seçimden SONRA kurulur.
  Kaldığı yerden devam yok (misafir kaydı yok, laboratuvarda bilgisayar ortak).
- İçerik yalnız ekran klavyesindeki karakterler (TR Q + rakam satırı + `, .` + Shift karakterleri); bölüm ≤ 12 tur. Fiziksel tuş:
  `e.key` ve `e.code`'un TR Q kapağı aday, beklenenle uyuşan seçilir (İngilizce dizilimli PC'de TR kapak çalışır).
- **Dizilim verisi `js/games/klavye-dizilim.js`'ten türer** (On Parmak'la ortak, `files.js` ilk sırası): `ROWS` ve `CODE_MAP` artık modülde
  elle yazılmaz, `KlavyeDizilim.kasifi.satirlar()` / `.kodHaritasi()` verir (eski sabitlerin birebir türevi; `tests/klavye-kasifi.spec.js`
  derin-eşitlik testi korur). `SHIFT_OF` / `TYPEABLE` / `resolveKey` kalıbı ve davranış DEĞİŞMEDİ — fiziksel tuş kuralını (e.key + kod adayı)
  On Parmak'a taşıma, o `karakterOf` ile konumdan çalışır.
- **Süre bütçesi** ("35 dk'lık derste usta olmayan bitiremez"): içerik değişince `npm run test:klavye`; hatasız alt sınırla 30 kelime/dk
  bitirmemeli, 48 kelime/dk bitirmeli. İçerik kısaltılırsa test kırılır.

### On Parmak (on parmak klavye, Türkçe Q — `js/games/on-parmak*.js` + `klavye-dizilim.js`, **`active:false`**, 15 Eki 2026)

- Durum: PR2 (Adım 2) sürüyor — yalnız Kısım 1 "Orta sıra" (`levels: 1`, 16 bölüm; iki oyun bölümü: Balon Vadisi ×2), hub'da "Yakında" kartı; diğer üç mini oyun Adım 2'nin sonraki görevlerinde, kısım 2–7 ve açılış sonraki adımlarda.
  Spec `docs/on-parmak-tasarim-2026-10-15.md`, plan `plans/on-parmak-2026-10-15.md`. TypingClub metni/görseli/sesi kullanılmaz (yalnız işleyiş örnek).
- **Dosya sırası** (`data/games.json files.js` = yükleme sırası): `klavye-dizilim.js` → `on-parmak-olcum.js` → `on-parmak-icerik.js` →
  `on-parmak-ekran.js` → `on-parmak-oyun-ortak.js` → oyunlar (`on-parmak-balon.js`; Adım 2'de diğer üçü) → `on-parmak.js`; css `css/on-parmak.css` (sahne renkleri yalnız burada). Yardımcılar `window.X` yayımlar, modül `window.X` ile okur
  (modül yalnız `{ id, levels, init, destroy }`; `levels = window.ON_PARMAK_ICERIK`, uzunluk = JSON `levels`). Kapalı oyun: motor `?oyun=` dahil açmaz.
- **`KlavyeDizilim`** (`klavye-dizilim.js`, saf, `window.KlavyeDizilim`): `SATIRLAR` (4 satır; tuş `{ code, alt, ust, parmak }`, okul klavyesinin `< >` =
  `IntlBackslash` **pasif**), `PARMAKLAR`, `BOSLUK`, `SHIFT`; `tusOf(ch) → {code, shift}|null`, `parmaklarOf(ch)` (Shift'liyse ÖNCE karşı serçe),
  `shiftTusuOf(ch)`, `elOf(ch)`, `yazilabilir(ch)` (dizilimde var ve pasif değil — içerik yalnız bunları kullanır), `kasifi` görünümü (Kâşifi bölümü).
  Türkçe büyük/küçük HER ZAMAN `toLocaleUpperCase/LowerCase('tr-TR')` (`'i'.toUpperCase()` yanlış). **`karakterOf(e)` = fiziksel tuş KONUMU:** `e.code`
  dizilimde (ya da Space) varsa karakter YALNIZ koddan türer, `e.key`'e bakılmaz (İngilizce dizilimde KeyI → `ı`, Quote → `i`, Comma → `ö`; yanlış
  fiziksel tuş doğru sayılmaz; Windows TR Q ölü tuş `^` koddan doğru çıkar). Harfte büyük/küçük = `shiftKey XOR CapsLock`; rakam/noktalamada `shiftKey ? ust : alt`.
  `e.code` boşsa (sanal klavye) tek karakterlik `e.key` dizilimdeyse o. `e.code` dolu ama haritada yoksa (Numpad, F tuşları, Shift, Enter) ya da pasif `< >` → `null`:
  basış yok sayılır ve SAYILMAZ. Ctrl/Meta/Alt süzmesi çağıranın işidir.
- **Modül kuralları (`on-parmak.js`):** Kısım = motor seviyesi; kısım sonu `cbs.onLevelUp`, yalnız son kısım `cbs.onComplete` (modül çağırır, motor son kısımda
  `onLevelUp`'ta hiçbir şey yapmaz). Açılışta başlangıç seçici (`pendingStart = { bolum }` + `GameEngine.startGame`, tuş dinleyicisi seçimden SONRA; Kâşifi kalıbı),
  kaldığı yerden devam yok, yeni `localStorage` anahtarı yok. `onCorrect/onWrong` tuş başına ÇAĞRILMAZ (ses tekrarı + sayaç şişer); yıldızı modül hesaplar.
  **Enter Boşluk değildir:** yazmada Enter/Backspace yok sayılır ve sayılmaz; Enter yalnız seçicide (düğme) ve sonuç şeridini geçmekte işler — şerit açıldıktan
  sonraki `ENTER_KILIT_MS = 400` içinde yok sayılır. **Caps Lock açıkken** (`getModifierState('CapsLock')`) belirgin uyarı, basışlar yok sayılır ve sayılmaz; Caps Lock
  tuşunun kendi basışı uyarıyı günceller; hoşgörü yok (Shift kuralı öğretilir). Uyarı sahnenin üstüne BİNER; sahne sabit yükseklikte (`--op-sahne-yuk`) → bölüm türü/uyarı
  klavyeyi dikeyde oynatmaz. Açık sonuç/kısım şeridinde Caps duyurusu şerit duyurusunun ardına eklenir (ezmez). **Odak kaçışı:** fareyle odak almış düğmede
  (araç çubuğu ya da El/Klavye; `pointerdown`→`focusin` ile izlenir — Chrome tuşta `:focus-visible`'ı keydown'dan önce açar) yazılabilir tuş (`karakterOf` ≠ null,
  Boşluk dahil) gelirse odak bırakılır ve basış işlenir; klavyeyle odaklanmış düğmede Enter/Boşluk/Tab tarayıcının. Zamanlayıcılar `later()` ile izlenir, `destroy()` dinleyiciyi + ekranı kaldırır.
- **Ölçüm (`on-parmak-olcum.js`, saf):** `dogruluk(dogruIlk, toplam)` = ilk basışta doğru / toplam basış (%); **toplam 0 → 0**. `hiz(karakter, ms)` = (karakter/5)/dakika;
  **ms < 1000 → 0** (sahte saatte sonsuz hız yok). `bolumYildizi({dogruluk, hiz, hedefHiz, canliBitti = true})`: doğruluk < 80 → **0 = bölüm baştan (tekrar)**;
  `canliBitti:false` → en çok 1; ≥ 95 ve hız ≥ hedefHiz (hedefHiz yoksa yalnız ≥ 95) → 3; ≥ 90 → 2; değilse 1. `kisimYildizi(dizi)` = ortalama, en yakın tam sayı, boş → 0.
  Kutu bölümünde hız şartı yok (`hedefHiz` verilmez). Oyunlarda öncelik (Adım 2'de oyunlar gelince geçerli): önce %80 kuralı (hiç basmadan canları bitirmek de tekrar), sonra can kuralı. Ham değerle karar, ekranda `Math.floor` — doğruluk VE hız, canlı ve sonuçta (%79,6 asla "%80" görünmez). Tekrar şeridinde (yıldız 0) hız gösterilmez (yalnız doğruluk + hedef).
- **İçerik (`on-parmak-icerik.js`, `window.ON_PARMAK_ICERIK`):** kısım `{ ad, ornek, hedefHiz, el, bolumler: [ { tur: 'kutu'|'satir', ad, yeni?: [...], yeniShift?: 'sol'|'sag', metin } ] }`.
  Kurallar (spec §5, `tests/on-parmak.spec.js` denetler): bölüm yalnız o ana kadar **öğrenilmiş** tuşları kullanır (kutu `yeni`'leri sırayla BİRİKİR; boşluk kendi kutu bölümüyle gelir; `yeniShift`
  verilen bölümden sonra, küçüğü öğrenilmiş ve karşı elde olan harflerin büyükleri öğrenilmiş sayılır); her karakter `yazilabilir`; kutu 21–35 karakter, satır ≥ 50 ve **≤ hedefHiz × 10**
  (hedef hızda ≤ 2 dk; kutuda hedef 8); `yeni` tuşları kendi metninde geçer; baştaki/sondaki/çift boşluk yok; boşluk öğrenildikten sonra her satırda birden çok sözcük;
  **yasak sözcük listesi** testi (metindeki her sözcük). Genel bölüm numarası dizi sırasından türer, elle yazılmaz.
- **Ekran (`on-parmak-ekran.js`, `window.OnParmakEkran`):** klavye + iki el TEK SVG (`createElementNS`; parmak uçları tuşlarla her ölçekte hizalı). `olustur(kap, { el = true, klavye = true, basinca })` →
  `{ vurgula(ch), bas(ch, dogruMu), goster({el, klavye}), yokEt() }`. `vurgula` tuşu + parmak(lar)ı + gerekiyorsa karşı Shift'i `is-hedef` yapar (null/'' temizler); `bas` kısa süre `is-down` / `is-yanlis`.
  Tuş `<g data-code>` pointerdown → `basinca(Shift'siz karakter)`; el/vurgu/etiket katmanları `pointer-events: none`; pasif `< >`, Shift, süs tuşları tepkisiz; birincil olmayan düğme yok sayılır.
- **Test:** `npm run test:on-parmak` (97 test; CI `ci.yml` adımı, hash'li çıktıda `SITE_ROOT=.build-check PORT=8766 npm run test:on-parmak`): tarayıcısız (`vm`) dizilim + `karakterOf` + ölçüm + içerik kuralları,
  tarayıcıda ekran ve oyun akışı. **Kapalı oyun test yolu:** `tests/on-parmak.spec.js` bağlamında `js/catalog.js` isteği (`/\/js\/catalog\.js(\?|$)/`) yakalanır, gövdede `"slug":"on-parmak"` satırındaki
  `"active":false` → `true` yapılır (hash'li çıktıda `?h=` de eşleşir); kısım geçişi için ayrıca 2 kısımlı içerik + `levels:2` katalog yaması fikstürü. Üretim kodu değişmez; oyun
  açılınca (`active:true`) yama gereksizleşir ve **kaldırılır** (yamasız "kapalı oyun" describe'ı da silinir) (duman testi `data/games.json`'dan kendiliğinden kapsar). Açılışta `seo/test_build_seo.py` kapalı listesinden `on-parmak` de çıkar.
- **Oyun bölümü (`tur: 'oyun'`, Adım 2):** `window.OnParmakOyunlari[ad] = { baslat(alan, { metin, el, tohum }, { tus(dogruMu), bitti({ canliBitti }), hedef(ch|null) }), durdur() }`;
  `baslat` → tutamaç `{ bas(ch), devamTusu(), duraklat(acik) }` (Caps Lock açıkken modül oyunu durdurur — balon alçalmaz, can gitmez; kapanınca hemen sürer; açıkken devam tuşu sürdürmez; `dongu.duraklat/surdur(neden)`). Oyun keydown dinleyicisi KURMAZ: modül her tuşta önce `devamTusu()` (true = yutuldu, sayılmaz — sekme dönüşü
  "Devam etmek için bir tuşa bas"), sonra `karakterOf` karakterini `bas(ch)`'a verir. `tus()` sayılan her basışta bir kez (eşzamanlı), `hedef()` klavye vurgusu +
  `data-beklenen`, son doğru harfte `bitti` eşzamanlı (sahte saatte akış döngüsüz ilerler). `tohum` = genel bölüm numarası (`OnParmakOyunOrtak.rng`, belirleyici).
  Yıldız: `bolumYildizi({ …, hedefHiz: yok, canliBitti })` — önce %80 (hiç basmadan canları bitirmek de tekrar), sonra can (en çok 1, akış sürer; şerit "Bölüm N bitti").
  Modül oyunu bölüm değişiminde, kısım sonunda ve `destroy()`'da `durdur()` eder; bilinmeyen oyun adı → `console.error` + bölüm atlanır. Oyunda ekran klavyesi
  küçük (`.op-oyun[data-tur="oyun"]`, ≤ 600 px). Zaman yalnız döngünün `dt`'si (oyunda `setTimeout` yok). **Balon Vadisi** (`on-parmak-balon.js`, harf oyunu):
  doğru harf → karakter oklu balona atlar; tutunulan balon alçalır (`uyarlanirHiz`), suya değince can gider ve karakter sıradaki balona taşınır (o harf atlanır,
  basış sayılmaz); 3 can. İçerik kuralı: `oyun` ∈ balon|canavar|baloncuk|elma; harf oyununda boşluksuz ≥ 20 harf, kelime oyununda ≥ 8 kelime; ≤ hedefHiz × 10.
- Yeni kısım/bölüm eklerken: içerik kuralları testi koşar (`npm run test:on-parmak`); `levels` = `ON_PARMAK_ICERIK.length` (JSON'u + `npm run catalog` güncelle); bu bölümü o PR'ın eklediği sözleşmeyle güncelle.

### Altın Avı (online, kendi lobisi — `js/games/altin-avi.js`, `rooms/altin-avi/<KOD>`)

- Blooket tarzı kendi hızında yarış: oyuncu kendi node'unu yazar (çalma hedefin `gold`'una da yazar), altın HEP transaction. Test: `npm run test:altin-avi` (sahte RTDB `tests/helpers/fake-rtdb.js` + `page.clock`; canlı DB'ye dokunmaz; `window.firebase` yazılamaz, canlı Firebase isteği/websocket'i testi düşürür).
- **Kurallar İSTEMCİ tarafı caydırıcıdır, sunucuda zorlanmaz:** `database.rules.json` `rooms/altin-avi/$code` altında kimliksiz yazıma izin verir (konsoldan altın/durum yazılabilir). Ceza/kilit çocukların okumadan basmasını önler, hileyi değil. Gerçek çözüm Firebase Anonymous Auth + kural sıkılaştırma (ayrı iş; KVKK/çocuk verisi değerlendirmesi ister).
- **"Tıklayarak geç" istismarına karşı** (30 Eyl 2026 sınıf gözlemi: yanlışın bedeli yoktu, doğru cevap %64 B'ydi): şıklar HER gösterimde oyuncuya özel karışır (`shown`; `correctIdx` veridir, ekran konumu değil) · soru çizilince okuma kilidi (`READ_LOCK_*`, şıklar `disabled`, devreden tıklama sayılmaz) · yanlış = **tıklanamayan** bekleme `WRONG_LOCK_MS` 3/5/8 sn (art arda; doğruda sıfırlanır) + `WRONG_GOLD_PENALTY` altın. Testler bu sayıları kilitler (bekleme sınırları ±100 ms, okuma kilidi alt sınırı, ikinci koruma katmanı; mutasyonla doğrulandı). **Yanlış ekranını tıklayınca geçilir yapma.** Okuma göstergesi sorunun ALTINDA, şıkların üstünde (küçük ekranda şıklar taşar); `prefers-reduced-motion`'da çubuk gizlenir (dolu görünüp "hazır" sanılmasın).
- Çalma kasası KALIR (Blooket kimliği); host oda kurarken `ÇALMA KASASI: AÇIK/KAPALI` seçer (`room.stealEnabled`; alan yoksa açık). Kapalıysa havuzdan çıkar.
- Bitiş SUNUCU saatiyle: `serverNow()` = `Date.now()` + `.info/serverTimeOffset`; istemci saatiyle `endsAt` yazılmaz/okunmaz (kayık saatli tek cihaz oyunu erken bitirirdi). Altın yalnız `state === 'PLAYING'` iken yazılır (`canWriteGold`; çalmanın kazanç aşaması muaf — toplam korunur). Final podyumu `finalRoster`'dan (son bilinen oyuncular; çıkanların düğümü silinse de sıralama kaymaz) çizilir ve bitişten sonra gelen yazımlarla tazelenir. Zamanlayıcılar `later()` ile izlenir, `cleanup()` temizler. Ekran okuyucu: kalıcı `#aa-live` bölgesine `announce()`.
- Soru bankasına soru eklerken: doğru cevabın konumu önemsiz (karışıyor) ama doğru şık hep en uzun olmasın (bankada %79 böyleydi → "en uzun şıkkı seç" okumadan dürüst oyuncudan çok kazandırıyordu, simülasyonla ölçüldü). Test (`tests/altin-avi.spec.js` "soru bankası") en uzun-şık payını sınırlar.

### Yeni oyun ekleme (README "Yeni oyun ekleme" + düzeltme)

README "Yeni oyun ekleme" (B2a sonrası) güncel; kısa sıra:
1. `js/games/<slug>.js` (+ `css/<slug>.css`) — yukarıdaki sözleşme; modül adı `eslint.config.js gameModuleGlobals`'a. Modül birden çok dosyaysa (örn. Balon Labirenti: `balon-labirenti-fizik.js` → `balon-labirenti-levels.js` → `balon-labirenti.js`) yardımcı dosyalar `window.X` yayımlar (eslint globali gerekmez) ve `files.js` sırası yükleme sırasıdır.
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
