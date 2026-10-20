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

- Durum: PR2 (Adım 2) — dört mini oyun hazır (Balon Vadisi, Canavar Saldırısı, Uçan Baloncuklar, Elma Bekçisi). İçerik yalnız Kısım 1 "Orta sıra" (`levels: 1`, 18 bölüm, üç oyun türü / dört oyun bölümü: Balon Vadisi ×2, "G H tekrar ve kelimeler"den sonra Uçan Baloncuklar, kısım sonunda Canavar Saldırısı); **Elma Bekçisi Kısım 1'de yok, ilk kez Kısım 2'de (Adım 3)** — o zamana dek yalnız test fikstürüyle sınanır. Hub'da "Yakında" kartı; kısım 2–7 ve açılış sonraki adımlarda.
  Spec `docs/on-parmak-tasarim-2026-10-15.md`, plan `plans/on-parmak-2026-10-15.md`. TypingClub metni/görseli/sesi kullanılmaz (yalnız işleyiş örnek).
- **Dosya sırası** (`data/games.json files.js` = yükleme sırası): `klavye-dizilim.js` → `on-parmak-olcum.js` → `on-parmak-icerik.js` →
  `on-parmak-ekran.js` → `on-parmak-oyun-ortak.js` → oyunlar (`on-parmak-balon.js`, `on-parmak-canavar.js`, `on-parmak-baloncuk.js`, `on-parmak-elma.js`) → `on-parmak.js`; css `css/on-parmak.css` (sahne renkleri yalnız burada). Yardımcılar `window.X` yayımlar, modül `window.X` ile okur
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
  **Satır motoru ÖLÇÜLÜ böler** (Adım 3 görev 1): harf `<span>`'ları bir kez kurulur, gerçek genişlikleri okunur (boşluk, yanlışta görünen `␣` ile — hangisi genişse),
  `satirBolOlcu` sözcük bölmeden satırlara dizer (boşluk önceki satır sonunda; satırdan uzun sözcük harf harf); çizimden sonra `scrollWidth > clientWidth` kalırsa daha dar yeniden böler
  (hedef genişlik her turda yalnız azalır, W/2 tabanı, en çok 3 tur; taşma yine sürerse son çare: gerçek taşma oranıyla küçülen karakter sayılı bölme — hasım stil testi kilitli).
  `window` `resize`'ında (genişlik değiştiyse) ve yazı tipi geç yüklenince (`document.fonts.ready`) AYNI span'lar yeniden dizilir — yazılanlar ve imleç korunur; ResizeObserver
  kullanılmaz (oyun testleri RO sayar). Dinleyici bölüm değişiminde ve `destroy()`'da kalkar. Pencere ölçülemezse (0 genişlik) karakter sayısıyla yedek bölme.
  **Shift'li karakter:** kutu/satır `metin[poz]`'u olduğu gibi bekler (büyük harf, `? ! : ; ' ( )`, rakam satırı Shift'lileri); `ekran.vurgula` tuş + karşı Shift + iki parmağı yakar;
  Shift'siz eşi (`j` ↔ `J`, `*` ↔ `?`) yanlıştır. **Tanıtım:** Shift'li yeni tuşta cümle tuşun KENDİ parmağını (`parmaklarOf` son eleman) ve karşı Shift'i söyler
  ("? tuşuna sağ serçe parmağınla bas; sol Shift’i sol serçe parmağınla basılı tut."). `yeniShift` ekranı `Shift + <örnek>` iki kapak gösterir; örnek = bölüm metninde o Shift'le
  yazılan ilk büyük harf (yoksa sol → J, sağ → F) ve `vurgula(örnek)` ile tuşu + Shift + iki parmak yanar; geçiren yalnız doğru Shift basışıdır (örnek harf/yanlış Shift salla).
  Kutu bölümü yalnız Shift tanıtabilir (`yeni: []` + `yeniShift`); "Şimdi alıştıralım" şeridi "Sol Shift"/"Sağ Shift" der.
- **Ölçüm (`on-parmak-olcum.js`, saf):** `dogruluk(dogruIlk, toplam)` = ilk basışta doğru / toplam basış (%); **toplam 0 → 0**. `hiz(karakter, ms)` = (karakter/5)/dakika;
  **ms < 1000 → 0** (sahte saatte sonsuz hız yok). `bolumYildizi({dogruluk, hiz, hedefHiz, canliBitti = true})`: doğruluk < 80 → **0 = bölüm baştan (tekrar)**;
  `canliBitti:false` → en çok 1; ≥ 95 ve hız ≥ hedefHiz (hedefHiz yoksa yalnız ≥ 95) → 3; ≥ 90 → 2; değilse 1. `kisimYildizi(dizi)` = ortalama, en yakın tam sayı, boş → 0.
  Kutu bölümünde hız şartı yok (`hedefHiz` verilmez). Satırın 3. yıldız hedefi **`b.hedefHiz ?? kisim().hedefHiz`** (bölüm hedefi kısmınkini ezer; K7 bölüm başına 15→25; uzunluk tavanı da aynı değerden). **Oyunlarda öncelik (sapma 9):** önce %80 kuralı (hiç basmadan canları/elmaları bitirmek de tekrar), sonra can kuralı (`canliBitti:false` → en çok 1, akış sürer). Ham değerle karar, ekranda `Math.floor` — doğruluk VE hız, canlı ve sonuçta (%79,6 asla "%80" görünmez). Tekrar şeridinde (yıldız 0) hız gösterilmez (yalnız doğruluk + hedef).
- **İçerik (`on-parmak-icerik.js`, `window.ON_PARMAK_ICERIK`):** kısım `{ ad, ornek, hedefHiz, el, bolumler: [ { tur: 'kutu'|'satir', ad, yeni?: [...], yeniShift?: 'sol'|'sag', hedefHiz?: sayı, metin } ] }` (bölüm `hedefHiz` > 0, verilirse kısmınkini ezer).
  Kurallar (spec §5, `tests/on-parmak.spec.js` denetler): bölüm yalnız o ana kadar **öğrenilmiş** tuşları kullanır (kutu `yeni`'leri sırayla BİRİKİR; boşluk kendi kutu bölümüyle gelir; `yeniShift`
  verilen bölümden sonra, küçüğü öğrenilmiş ve karşı elde olan harflerin büyükleri öğrenilmiş sayılır); her karakter `yazilabilir`; kutu 21–35 karakter, satır ≥ 50 ve **≤ hedefHiz × 10**
  (hedef hızda ≤ 2 dk; kutuda hedef 8); `yeni` tuşları kendi metninde geçer; baştaki/sondaki/çift boşluk yok; boşluk öğrenildikten sonra her satırda birden çok sözcük;
  **yasak sözcük** testi (metin + bölüm adındaki her sözcük; ayırıcı harf dışı her şey). Genel bölüm numarası dizi sırasından türer, elle yazılmaz.
  **Sıkı kurallar (Adım 3 görev 1, `ICERIK_DENETCI` saf denetçiler; her biri kural bozan sahte içerikle de sınanır):** `qwx` — Q/W/X yalnız adı o harfi TEK BAŞINA anan
  ("Q ve W", "X tekrar") kutu/satır bölümünde; `shiftSirasi` — Shift'li her karakter (büyük harf, ? ! : ; ' ( ) …) ancak gerektirdiği Shift (`sol` Shift → sağ el) o bölümde ya da
  önce tanıtıldıysa; `yeniShift` yalnız kutuda ve metninde o Shift'le yazılan büyük harf var; `tekEl` — adında "sol el"/"sağ el" geçen bölümde harf ve rakam yalnız o elde
  (`elOf`; boşluk ve noktalama serbest); `yasak` — `YASAK_KOK` (yalnız açıkça zararlı kökler: silah, bıçak, tabanca, savaş, şarap…) kökle BAŞLAYAN her sözcük (çekimli: "silahlar",
  "şarabı", "bıçaklı") + `YASAK_TAM` yalnız sayılan biçimler (masum sözcüklerin başı olan kökler: "kan" → kanat/kanal serbest, "seks" → seksen, "rakı" → rakım,
  "fal" → falan, "öl" → ölçü, "ateş" → ateşböceği/ateşli, "aşk" biçimleri tek tek); `uzunluk` — kutu 21–35, satır ≥ 50, ≤ hedefHiz × 10 (bölüm hedefi varsa o); `tamKurs` — **yalnız `levels === 7` iken** (öncesi `test.skip`): 7 kısım,
  90–110 bölüm, dört oyunun her biri ≥ 2.
- **Ekran (`on-parmak-ekran.js`, `window.OnParmakEkran`):** klavye + iki el TEK SVG (`createElementNS`; parmak uçları tuşlarla her ölçekte hizalı). `olustur(kap, { el = true, klavye = true, basinca })` →
  `{ vurgula(ch), bas(ch, dogruMu), goster({el, klavye}), yokEt() }`. `vurgula` tuşu + parmak(lar)ı + gerekiyorsa karşı Shift'i `is-hedef` yapar (null/'' temizler); `bas` kısa süre `is-down` / `is-yanlis`.
  Tuş `<g data-code>` pointerdown → `basinca(Shift'siz karakter)`; el/vurgu/etiket katmanları `pointer-events: none`; pasif `< >`, Shift, süs tuşları tepkisiz; birincil olmayan düğme yok sayılır.
- **Test:** `npm run test:on-parmak` (173 test, `tamKurs` `levels 7`'ye dek atlanır; CI `ci.yml` adımı, hash'li çıktıda `SITE_ROOT=.build-check PORT=8766 npm run test:on-parmak`): tarayıcısız (`vm`) dizilim + `karakterOf` + ölçüm + içerik kuralları,
  tarayıcıda ekran ve oyun akışı. **Kapalı oyun test yolu:** `tests/on-parmak.spec.js` bağlamında `js/catalog.js` isteği (`/\/js\/catalog\.js(\?|$)/`) yakalanır, gövdede `"slug":"on-parmak"` satırındaki
  `"active":false` → `true` yapılır (hash'li çıktıda `?h=` de eşleşir); kısım geçişi için ayrıca 2 kısımlı içerik + `levels:2` katalog yaması fikstürü (`opTestParcali`); Elma Bekçisi için aynı kalıpla `opTestElma` (2. kısım = Elma bölümü + satır; kelime sırası testlere göre seçili — `OP_ELMA_METIN`; dört oyunu birlikte sınayan yerleşim testleri de bu fikstürde); bilinmeyen oyun adı için `opTestBilinmez` (`constructor` + `yok`); Shift ve geniş glifler için `opTestShift` (`OP_TEST_SHIFT`: sol/sağ `yeniShift` kutuları, `?` tanıtımlı Shift'li işaret kutusu `OP_SHIFT_KUTU`, M W Ğ Ş + Shift'li uzun satır `OP_SHIFT_SATIR` — satır taşması masaüstü + 375 px ve yeniden boyutlandırmada sınanır). Fikstür yaması katalogda `levels` N → N + 1 yapar (içerik kısım kazandıkça uyar; fikstür bölüm numaraları `OP_N + i`). Elma içeriğe girince (Adım 3) testler gerçek bölüme taşınabilir. Üretim kodu değişmez; oyun
  açılınca (`active:true`) yama gereksizleşir ve **kaldırılır** (yamasız "kapalı oyun" describe'ı da silinir) (duman testi `data/games.json`'dan kendiliğinden kapsar). Açılışta `seo/test_build_seo.py` kapalı listesinden `on-parmak` de çıkar.
- **Oyun bölümü (`tur: 'oyun'`, Adım 2):** `window.OnParmakOyunlari[ad] = { baslat(alan, { metin, el, tohum }, { tus(dogruMu), bitti({ canliBitti }), hedef(ch|null), duyuru(metin) }), durdur() }`
  (ad `Object.prototype.hasOwnProperty` ile aranır: `constructor` gibi miras ad oyun sayılmaz); `duyuru` = can/elma kaybı (oyun sürüyorsa) ve "Oyun durdu" → modülün kalıcı `aria-live` bölgesi (yalnız mod `oyun` iken; sonuç duyurusunu ezmez);
  `baslat` → tutamaç `{ bas(ch), devamTusu(), duraklat(acik) }` (Caps Lock açıkken modül oyunu durdurur — balon alçalmaz, can gitmez; kapanınca hemen sürer; açıkken devam tuşu sürdürmez; `dongu.duraklat/surdur(neden)`). Oyun keydown dinleyicisi KURMAZ: modül her tuşta önce `devamTusu()` (true = yutuldu, sayılmaz — sekme dönüşü
  "Devam etmek için bir tuşa bas"), sonra `karakterOf` karakterini `bas(ch)`'a verir. `tus()` sayılan her basışta bir kez (eşzamanlı), `hedef()` klavye vurgusu +
  `data-beklenen`, son doğru harfte `bitti` eşzamanlı (sahte saatte akış döngüsüz ilerler). `tohum` = genel bölüm numarası (`OnParmakOyunOrtak.rng` = mulberry32, belirleyici: aynı bölüm = aynı sahne; tekrar da aynı).
  Yıldız: `bolumYildizi({ …, hedefHiz: yok, canliBitti })` — önce %80 (hiç basmadan canları bitirmek de tekrar), sonra can (en çok 1, akış sürer; şerit "Bölüm N bitti").
  Modül oyunu bölüm değişiminde, kısım sonunda ve `destroy()`'da `durdur()` eder; bilinmeyen oyun adı → `console.error` + bölüm atlanır. Oyunda ekran klavyesi
  küçük (`.op-oyun[data-tur="oyun"]`, ≤ 600 px). Zaman yalnız döngünün `dt`'si (oyunda `setTimeout` yok). **Ortak kabuk (yeni oyun bunu kullanır, kopya yazmaz):** `OnParmakOyunOrtak` çekirdek `dongu`, `azaltilmisHareket()` (prefers-reduced-motion TEK kaynak; dört oyun + `uyarlanirHiz` okur), `uyarlanirHiz`, `hedefSec`, `rng`; çok hedef yardımcıları `secilebilir(hedefler)` (yalnız `gorunur !== false`), `enAcil(hedefler)` (tehlikesi en yüksek), `beklenenHarf(hedefler, kilit)` (kilit varsa sıradaki harf, yoksa en acilin ilk harfi — klavye vurgusu; o harf basılınca `hedefSec` aynı hedefi seçer; ikisi de harfi `[...kelime][i]` ile okur, içerik NFC — test denetler), `hedefBildirici(kok, cb)` (yalnız değişince `data-hedef` + `cb`; dört oyun kullanır); sahne yardımcıları `svgEl/htmlEl/easeOut`, `tepeYolu(rnd, { x0, son, adim, taban, genlik, alt })`, `canlarHud(n, { ad = 'Can', yol, sinif })` → `{ el, guncelle(can) }` (`.op-mini__canlar/__can`, aria-label "<ad>: c / n"), `devamKatmani()` (`.op-mini__devam`, canlı bölge değil), `tikCiz(parent, attrs)` (`.op-mini__tik`: renk dışı isabet onayı) ve `oyunKabugu({ kok, svg, H, devam, adim, olcu, duyur })`: ölçü (viewBox, `kabuk.W`, `olcu(W)` — yalnız W değişince; RO'nun ilk bildirimi ilk çizimi ikilemez) + ResizeObserver + `dongu` + `kok.dataset.durum`/devam katmanı (+ `duyur('Oyun durdu. …')`) + tutamaç (`kabuk.baslat(basFn)` → `{ bas, devamTusu, duraklat }`) + `kabuk.bitir(neden)` (`data-bitti`; sonrasında devam kartı HİÇ görünmez, sekme dönüşünde döngü tuşsuz sürer, `devamTusu` false) + `kabuk.durdur()` (sonra her geri çağrı etkisiz). Oyun dosyası kalıbı: `s = {…}; s.kabuk = O.oyunKabugu({ …, olcu: (W) => { s.W = W; }, duyur: cbs.duyuru });` ilk çizim; `return s.kabuk.baslat(bas)`; bitişte `s.kabuk.bitir(neden)` + `cbs.bitti`; `durdur() { const e = s; s = null; e.kabuk.durdur(); }` (dört oyunda aynı; modül tek örnek durumunu kendisi tuttuğu için kabuğa taşınmadı). **Ortak sahne CSS:** kök `.op-mini` + `.op-<oyun>`, `.op-mini__svg`, `.op-mini__hud`, `.op-mini__sayac` (dört kopya blok yok). **Yerleşim (kabul geçidi, test kilitli):** oyunda yönerge TEK satır sabit yükseklik → dört oyunda sahne üstü aynı (±2 px, masaüstü + 375); telefonda bölüm adı hap + düğmelerin altında kendi satırında, kesilmez; Caps bandı oyunda sahnenin ALT kenarında (canlar/sayaç/yönerge görünür); "Oyun durdu" sahnenin alt kenarında geniş şerit (hedefi örtmez, telefonda ≤ 2 satır; Caps bandı açıkken gizli); sonuç şeridi parçaları bölünmez (`.op-serit__parca`) ve dengeli satır (yetim "sn" yok). **İsabet işareti (renk dışı, her oyunda):** Balon doğru yazılan balonda onay (`is-tamam`), Canavar yazılan kutuda onay rozeti, Baloncuk/Elma kelime bitince onay (patlama/etiket sönüşünde); harf düzeyi klavye eylemi animasyonsuz. **Sayaç:** Balon/Baloncuk/Elma ilerleme = ele alınan / toplam (bitişte toplam/toplam); Canavar "Güç" etiketli kalan güç. **Balon Vadisi** (`on-parmak-balon.js`, harf oyunu):
  doğru harf → karakter oklu balona atlar; tutunulan balon alçalır (`uyarlanirHiz`), suya değince can gider ve karakter sıradaki balona taşınır (o harf atlanır,
  basış sayılmaz); 3 can. **Canavar Saldırısı** (`on-parmak-canavar.js`, kelime oyunu, tek hedef — `hedefSec` kullanmaz): kelime üstte harf kutularında, **Boşluk da yazılır** (kelimenin son kutusu Boşluk = kar topunu atar; son kelimede son harf) → beklenen dizi = metin; güç çubuğu = kelime sayısı, atışta EŞZAMANLI azalır (son atışta `bitti`); top havadayken ve geri sekerken canavar yürümez (uçuş/sekme yalnız görsel). Yaklaşma `m` ∈ [0,1] (`data-m`, sahne genişliğinden bağımsız; `uyarlanirHiz` taban 0,05/sn, geri itme 0,5); `m ≤ 0` → can gider, canavar başa çekilir, kelime ve ilerleme korunur; 3 can. Yanlış basış ilerletmez, sıradaki kutu kırmızı. **Uçan Baloncuklar** (`on-parmak-baloncuk.js`, kelime oyunu, çok hedef): metin = boşlukla ayrılmış kelime listesi, **Boşluk YAZILMAZ** (her kelime kendi baloncuğunda; beklenen dizi = boşluksuz harfler); baloncuklar metin sırasıyla doğar, çayırın arkasından yukarı süzülür (`p` ∈ [0,1], `data-p`; `uyarlanirHiz` taban 0,045 p/sn ≈ 22 sn tırmanış). **Görünürlük:** merkezi çayırın üst kenarının üstüne çıkana dek `data-gorunur="0"` — seçilemez, vurgulanmaz (ilk harfi = hata). **Plan** `baslat`'ta bir kez, sahne çiziminden ÖNCE: kelime başına üç `rnd()` (u, kay, faz); şerit = `floor(u × n)`, bir öncekinin şeridine düşerse (+1) mod n (`n` = şerit sayısı, `data-seritler`: en az 2, ideal 170 birim → telefonda 2); test Node'daki `rng(tohum)` planıyla `data-serit` eşitliğini denetler. Zamanlama: başta iki (p 0,36 ve 0,24, ikisi de görünür), sonra her 0,3 p yolda bir (en çok min(4, n + 1)), 2'nin altına düşünce sıradaki hemen; sıradakinin şeridinde alçakta (p < 0,45) baloncuk varsa doğuş BEKLER (şerit plandan değişmez). Yarıçap ≤ 0,9 × şerit yarısı − 13 → komşu baloncuklar ve kilit halkası birbirine/kenara değmez (375 px testi). **İlk harf hedef seçer** (`hedefSec(secilebilir(…))`, `tehlike = p`): o harfle başlayan, tepeye en yakın görünür baloncuk kilitlenir (`data-kilit`, `.is-kilitli`: kalın kontur + kesikli ikinci halka + 1,08 büyüme + sıradaki harfin altı çizili; diğerleri soluk — renkten bağımsız); kilitliyken yanlış harf (öbür baloncuğun ilk harfi de) = hata, kilit sürer; kilitsizken hiçbir ilk harfe uymayan = hata. Kelime bitince patlar (sayılır, `data-patlayan`; sayaç ele alınan = patlayan + kaçan). `hedef()`: kilit varsa sıradaki harf, yoksa **en acil görünür baloncuğun ilk harfi** (klavye parmağı oraya; o harf basılırsa aynı baloncuk kilitlenir), değişince döngüden de bildirilir. Tepeden kaçan baloncuk = −1 can (kelimesi gider, kilitliyse kilit düşer); 3 can. Liste bitince (patlayan + kaçan) canlı biter. **Çok hedefli oyun kuralları (Baloncuk incelemesinden; Baloncuk ve Elma istisnasız uyar, yeni çok hedefli oyun da uyar):** (1) yalnız sahnede GÖRÜNEN hedef seçilir/kilitlenir ve vurgulanır (`hedefSec`/`beklenenHarf`'e `O.secilebilir(hedefler)` verilir; hedef `gorunur` alanını oyun döngüsü günceller, `data-gorunur`); (2) doğuş konumu (taraf/şerit) kare zamanlamasına bağlı OLMAZ — kelime başına sabit sayıda `rnd()` ile önceden kurulan plandan gelir (doluluk yalnız doğuş ANINI geciktirir, konumu değiştirmez); ikisi de testle kilitli (görünmeyen ilk harf testi + Node plan eşitliği). **Elma Bekçisi** (`on-parmak-elma.js`, kelime oyunu, çok hedef): ortada ağaç, tacında 5 elma (= can; HUD `canlarHud(5, { ad: 'Elma', yol: elma })` + taçta alınan yuva kesikli boş halka); sincaplar iki yandan, iki şeritte (uzak küçük / yakın büyük) ağaca seker, kelime sincabın üstündeki etikette; **Boşluk YAZILMAZ**. Yol `m` ∈ [0,1] (0 = kenarda tam görünür, 1 = ağaçta; `data-m`; `uyarlanirHiz` taban 0,05 m/sn ≈ 20 sn). Doğan sincap kenardan girer (`GIRIS_MS` 900, `data-gorunur="0"`, etiket solgun): girişi bitmeden seçilemez. **Plan** `baslat`'ta bir kez: kelimeler ikişerli, çiftin ilki hangi yandan = çift başına bir `rnd()`, öbürü karşı yandan; her yanda şerit yakın/uzak sırayla; kelime başına bir `rnd()` tüy rengi (`data-taraf`, `data-serit`; test plan eşitliğini Node'daki `rng(tohum)` ile denetler). Zamanlama: başta iki (biri m 0,2 görünür, öbürü girişte), sonra her 0,3 m yolda bir, en çok 4; 2'nin altına düşünce sıradaki hemen; sıradakinin şeridinde kenara yakın sincap varsa bekler (m < 0,3 YA DA yatay uzaklık iki etiketin yarı genişliği + 8'den az — dar sahnede etiketler binmesin). **Etiket bandı:** etiketler sincapların üstünde ayrı bantta (yakın şerit merkezi 216, uzak 176; etiket sincaba ince sapla bağlı) → etiket başka sincaba/etikete binmez (375 px testi); ağaca varırken uzak etiket tacın alt kenarının önüne geçebilir (bilinçli: etiket önde ve okunur). Girişte etiket saydamlığı döngüden (`is-giris`: CSS geçişi kapalı). Kutlama yuvaları sıra numarasıyla izler → yeniden boyutlandırma kutlamayı kaybettirmez. İlk harf → görünenlerden ağaca en yakın (`hedefSec`, `tehlike = m`) kilitlenir (`data-kilit`; etiket kalın mavi kontur + kesikli ikinci çerçeve + 1,1 büyüme + dolu uç + sıradaki harf altı çizili; diğerleri soluk); kilitliyken yanlış harf = hata, kilit sürer. Kelime bitince sincap döner ve kendi kenarına koşar (`is-kaciyor`, artık seçilemez; `data-biten`). Ağaca varan (kilitliyse kilit düşer) tarafındaki ilk dolu yuvadan elma alır: elma daldan pati'ye uçar (`is-aliyor`, 420 ms), sonra sincap elmayla kaçar; azaltılmış harekette uçuş/zıplama/koşu yok — elma doğrudan elde, sincap yerinde solar. 5 elma biterse `canliBitti:false` (`data-bitti="elmalar"`), kelimeler biterse canlı. İçerik kuralı: `oyun` ∈ balon|canavar|baloncuk|elma; harf oyununda boşluksuz ≥ 20 harf, kelime oyununda ≥ 8 kelime; ≤ hedefHiz × 10.
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
