# Blueprint — Ateş & Buz: yeni dünyalar (Ateş Mağarası 11–14 + Buz Mağarası 15–18)

**Hedef:** Mevcut 10 bölümlük Ateş & Buz'a, temadan çıkmadan iki yeni dünya eklemek: her biri kendi arka planı, zemin dokusu ve bulmaca karakteriyle; menüde dünya seçimi; her bölüm **yeniden oynatılabilir kayıtlı çözümle**. Her adım tek PR, soğuk başlangıçla yürütülebilir.
**Spec (onaylı):** `docs/superpowers/specs/2026-09-30-ates-buz-yeni-dunyalar-design.md` — kararlar orada; bu plan onları yürütür. Düşmanca incelemede (30 Eyl) bulunan kapsam/teknik düzeltmeler bu sürümde işlendi; spec'le farklar "Spec'ten sapmalar" bölümünde.
**Oluşturuldu:** 2026-09-30 (2. sürüm: düşmanca inceleme sonrası) · **Mod:** git + GitHub CLI (dal → PR → Vercel önizleme → kabul geçidi → CI yeşil → **Claude merge eder**, `CLAUDE.md` "Çalışma kuralları") · **Depo:** `C:\Users\emreg\Documents\bilnetoyun` (`master`)
**Durum takibi:** adım başlığındaki kutu işaretlenir; adım bitmeden sonrakine geçilmez. Plan dosyası güncellenmeden sonraki adıma geçilmez.

## KALDIĞIMIZ YER

- **Durum (30 Eyl 2026):** spec onaylı, plan düşmanca incelemeden geçti ve düzeltildi; **hiçbir uygulama yapılmadı**. Ön koşul adım 0 = fizik PR'ı **#50** (`fix/ates-buz-fizik`): PR açık, CI çalışıyor, Reality Checker yeniden doğrulaması bekleniyor.
- **Sonraki iş:** #50 birleşince A1'den başla.
- **Sahip tarafı (bekliyor / bilmesi gerekenler):**
  1. Oyunu hub'da yeniden açma kararı (`data/games.json` `ates-buz` `active:false`) — bu plan **açmaz**; açmadan önce **iki cihazda insan testi** (burada gerçek zamanlı oynanamıyor: tarayıcı panosu kareleri ~1,5 fps'e kısıyor).
  2. **Hub oyunu yalnız çevrimiçi başlatıyor** (`js/games/ates-buz.js`, `games/ates-buz/js/main.js` menüyü atlayıp 1. bölümden açar). Dünya seçimi ekranı yalnız bağımsız sayfada (`/games/ates-buz/`) görünür; hub oyuncusu Ateş Mağarası'na 10 bölümü sırayla oynayınca ulaşır (çevrimiçi sıra 1→18). İstenirse "hub'dan dünya seç" ayrı bir iş.
  3. Kayıtlı çözümler tasarımcı betiği olabilir (aşağıda "Çözüm kaydı ilkesi") — spec §3.5'ten küçük bir gevşeme; onay bekleniyor.

## Ön bilgi (soğuk başlangıç için)

- Oyun `games/ates-buz/` (ES modül, tuvalde çizim, 39×29 hücre × 36 px = 1404×1044). Yapı: `js/game.js` (döngü, `startGame`, `applyHostState`, tıklama/menü akışı ~858–913, sıradaki bölüm ~772–795, guest sınırı ~998), `js/player.js` (fizik), `js/collisionBlocks.js` (`level1..N` + `levels`), `js/ingameAssets/*`, `js/menu/{menus,buttons,menuLevel,quests}.js` (canvas menü), `js/helpers.js` (global durum, `gameData`, localStorage), `data/*.json` (bölüm anahtarlı), `img/maps/level<N>.png` + `bg.png` (TEK arka plan), `tools/build_levels.py` (ASCII → dizi + PNG + JSON; alt komutlar `test|preview|build|json|all`).
- **Fizik sözleşmesi:** `CLAUDE.md` "Ateş & Buz fizik sözleşmesi"; rapor `docs/ates-buz-fizik-2026-09-30.md`; test `npm run test:ates-buz` (Node fizik testi + görsel↔ızgara tarayıcı testi; bütçeler kare sayısına ölçekli; hız sabiti `game.js`'ten okunur). Test `games/ates-buz/js`'yi geçici klasöre `{"type":"module"}` ile kopyalar (Node 20'de tipsiz pakette `.js` ESM yüklenmez). Yerelde Node 24, CI'da Node 20: yeni Node testleri **merge öncesi CI'da** (Node 20) doğrulanır.
- **Menü (kırılgan noktalar — A3'te açıkça ele alınır):** `menus.js` düğüm/yolları `for i<=10` ile **modül yüklenirken** (senkron) üretir → dünya verisi de senkron bir JS modülü olmak zorunda (`fetch` ile gelen JSON olamaz). Tıklama `game.js:872–881` **tüm** `menuLevels`'ı dolaşır. `game.js:906–908`: `menuActive != "mainMenu"` ise düğme basınca menü kapanır. Ana menü = bölüm haritasının kendisi (ayrı "Oyna" düğmesi yok; `buttons.js` yalnız unlock/reset). `buttons.js TEXT_GAP` yalnız 3–8, 10, 11, 14 harfli yazıları tanır (başka uzunlukta x=NaN → yazı görünmez). `menus.js resetProgress` **`localStorage.clear()`** çağırır (iframe aynı kökenli: hub ilerlemesini ve diğer oyun kayıtlarını siler).
- **Kayıt:** `helpers.js loadDataFromLocalStorage/saveDataToLocalStorage` `for i=1..Object.keys(x).length` + `x[i]` kullanır → anahtarların 1..N ardışık olduğunu varsayar. `menuLevels` buluta da senkronlanır (`js/auth.js GAME_SAVE_KEYS`) → 14 girdili bir kayıt 10 düğümlü sürüme yüklenirse `menuLevels[11][key]` TypeError atar. **Bu yüzden kayıt döngülerinin sertleştirilmesi ilk adımdadır (A1) ve geri alma sırası kurallıdır.**
- **Görevler (quests):** `quests.allDiamonds/finalDiamond` `required: []` bekler ama elmaslar artık listeden çıkarılmıyor, `collected` bayrağı kalkıyor (`player.js checkDiamonds`) → bu görevler **bugün hiç tamamlanmıyor** (özgün hata; yıldız göstergesi). 14 ve 18'in "final elması" görevi bu yüzden A3'te düzeltilir.
- **Kapı/elmas headless'ta:** `Door.opened` yalnız `Sprite.draw()` içinde ve görsel yüklüyse ilerler (`sprite.js` ~170–174, `door.js openDoor`); Node'daki `Image` taklidi `onload` tetiklemez → kapılar hiç açılmaz. `tests/ates-buz-fizik.mjs` bu yüzden `doors: []` ile çalışır; hedef doğrulama için `stepGoals` gerekir (A4).
- **Zincirli köprü (`bridge.js`) statik:** `shape 'square'`, güncellemesi/bağlantısı yok → bulmaca mekaniği değil, dekor/katı platformdur (13. bölüm buna göre tasarlanır).
- Build: `tools/build.js` ES modül import'larını hash'ler (yeni `js/worlds.js` için ek iş gerekmez; `build:check` doğrular). `tools/` yayında kalır (`.vercelignore`: "tools/ EKLEME"); **yeni araçlar tek tek** `.vercelignore`'a eklenir. `eslint` yalnız `**/*.js`; `tools/*.mjs` lint dışı.
- Ajanlar: `Frontend Developer`, `UI Designer`, `Test Automation Engineer`, `Backend Architect`, `Reality Checker`, `Evidence Collector`, `AI-Generated Code Security Auditor`, `Code Reviewer`, `Technical Writer`.
- **Tasarım skilleri (kullanıcı kuralı):** görünen her iş `impeccable` görür (A2 paleti + A3 menüsü için açık geçiş: kontrast/hiyerarşi/aralık kontrol listesi PR'a yazılır); arka plan/zemin/menü **yön** için `design-taste-frontend` (kod yazılmadan önce); hareket varsa `emil-design-eng`. `impeccable/scripts/impeccable` **çalıştırılmaz** (ikili indirir). Platform notu: tuval çizimi → ilkeler geçerli, tarayıcı denetim araçları değil.

## Değişmezler (her adımdan sonra doğrulanır)

1. `npm run test:ates-buz` yeşil (fizik + görsel↔ızgara + dünyalar + çözüm tekrarı). Testler `levels`'tan türer — **elle sabitlenmiş sayı yok** (`ates-buz-veri.spec.js` A1'de `Object.keys(levels).length`'e bağlanır; bekçi/batma bütçeleri kare sayısına ölçekli).
2. `npm run lint` hatasız; `npm run catalog:check`, `npm run build:check` yeşil.
3. **Tapınak (1–10) değişmez:** A1'de `tests/ates-buz-tapinak.sha256` + `tests/ates-buz-tapinak-degismez.mjs` eklenir (levels[1..10] dizileri, `data/*.json`'ın 1–10 anahtarları ve `img/maps/level1..10.png` SHA-256'sı). Test bu özeti yeniden hesaplar; bilinçli bir Tapınak değişikliği özeti de güncellemek zorundadır (dosya-çapında `git diff` kullanılmaz — B1/C1 ortak dosyaları zaten değiştirir).
4. `data/games.json` `ates-buz` `active:false` kalır; README/landing sayıları değişmez.
5. Sır/anahtar eklenmez; yeni `tools/ates-buz-*.mjs` dosyaları `.vercelignore`'a **tek tek** eklenir (`tools/` klasörü yayında kalır); `_preview_*.png` `.gitignore`'a eklenir.
6. `CLAUDE.md`/README **yalnız adım D'de** güncellenir (paralel adımlar aynı bölümü düzenlemesin); her adım kendi notunu bu plan dosyasına yazar.
7. Node 20 uyumu: yeni Node testleri `fs.cpSync`/ESM geçici paket kalıbını kullanır; `localStorage`/`document` taklitleri `Object.defineProperty` ile (Node ≥25 getter'ı).

## Bağımlılık grafiği

```
0 (fizik PR #50 merge) ──► A1 (worlds.js + kayıt sertleştirme + ortak sim modülü + Tapınak-değişmez)
                              ├──► A2 (tema üretimi + bölüm-başı arka plan)  ──► A3 (menü: dünya seçimi, 18'e genişleme, görev düzeltmesi, resetProgress)
                              └──► A4 (çözücü + stepGoals/snapshot + çözüm tekrarı)                     │
                                                                                                          ├──► A5 (çevrimiçi sıralı geçiş testi, sahte firebase)
                                                                                                          ▼
                                   (A3 + A4 + A5) ──► B1 (Ateş Mağarası 11–14) ──► C1 (Buz Mağarası 15–18) ──► D (kabul + belge)
```

- **Paralel:** A2 ∥ A4 (A2 = `tools/build_levels.py`, `img/maps/bg-*.png`, `game.js` arka plan payı; A4 = `tools/`, `tests/`).
- **Seri:** A2 → A3 (ikisi `game.js` ve `worlds.js`'e dokunur). B1 → C1 (aynı `GENERATED` blok ve `data/*.json`).
- `package.json`/`ci.yml`'e birden çok adım dokunur → her adım **kendi satırını ekler**, çakışırsa rebase.
- **Geri alma sırası (kurallı):** B1/C1 önce, sonra A3; A1'in kayıt sertleştirmesi **hiçbir zaman** geri alınmaz (aksi halde 11–18'li bulut kaydı eski sürümü çökertir).

---

## Adım 0 — Fizik düzeltmesi PR'ı (#50) [ ]

**Dal:** `fix/ates-buz-fizik` · **PR:** https://github.com/emregunay212-cyber/childsplaylogic/pull/50 · **Model:** varsayılan.
**Durum:** commit `54e0aaa`; lint/catalog/build:check/`test:ates-buz` yeşil; güvenlik denetimi temiz; Reality Checker ilk tur NEEDS WORK → bulgular işlendi, yeniden doğrulama bekleniyor; CI bekleniyor.
**Çıkış kriteri:** CI yeşil + Reality Checker READY + merge; `master`'da `npm run test:ates-buz` yeşil. **Geri alma:** `git revert <merge>` (oyun kapalı).

## Adım A1 — Dünya tablosu, kayıt sertleştirme, ortak simülasyon, Tapınak-değişmez [ ]

**Dal:** `ates-buz/dunyalar-a1` · **Bağımlılık:** 0 · **Model:** varsayılan · **Ajan:** `Frontend Developer` + `Test Automation Engineer`.
**Bağlam:** Spec §3.1, §3.5, §5. Bugün bölüm→dünya bilgisi yok; fizik düzeneği `tests/ates-buz-fizik.mjs`'e gömülü; kayıt döngüleri ardışık anahtar varsayar.
**Görevler:**
1. `games/ates-buz/js/worlds.js` (yeni, **senkron** JS modülü, DOM'suz): `WORLDS = [{ id:'tapinak', ad:'Tapınak', bolumler:[1..10], arkaplan:'./img/maps/bg.png', zemin:'tapinak', acilisSarti:null }, { id:'ates', ad:'Ateş Mağarası', bolumler:[11,12,13,14], arkaplan:'./img/maps/bg-ates.png', zemin:'ates', acilisSarti:{ bolum:10 } }, { id:'buz', ad:'Buz Mağarası', bolumler:[15,16,17,18], arkaplan:'./img/maps/bg-buz.png', zemin:'buz', acilisSarti:{ bolum:10 } }]`; `worldOfLevel(n)`; `levelsOfWorld(id, mevcutBolumler)` (yalnız `levels`'te **var olan** bölümler → içerik gelmeden altyapı birleşebilir); `isWorldUnlocked(id, menuLevels)` — **`unlocked` bayrağına** bakar (Tapınak'ın 10. bölümünü tamamlamak 11/15'in `unlocked`'ını açar), `questsStatus`'a bakmaz (yoksa "Unlock all" dünyaları açmaz). **Tek doğruluk kaynağı**; `tools/build_levels.py` dünya→tema eşlemesini bu dosyadan regex ile okur (A2'de).
2. **Kayıt sertleştirme** (`helpers.js` `loadDataFromLocalStorage/saveDataToLocalStorage`): döngüler `Object.keys(...)` üzerinden, **mevcut düğümde olmayan anahtar atlanır**, eksik düğüm dokunulmaz; bozuk JSON'da varsayılan. Test (`tests/ates-buz-kayit.mjs`, Node, `helpers.js` geçici kopyadan): (a) anahtarları {1–9, 11–13} boşluklu yol kaydı yazılıp okunur, hata yok; (b) **14 girdili** `menuLevels` kaydı **10 düğümlü** menüye yüklenir, hata yok; (c) eski 10 girdili kayıt 18 düğümlü menüye yüklenir, 11–18 varsayılan.
3. `tests/lib/ates-buz-sim.mjs` (yeni): `tests/ates-buz-fizik.mjs`'teki sahte DOM, modül yükleme, `setup/step`, geometri yardımcıları, politikalar, `rng` buraya taşınır; `tests/ates-buz-fizik.mjs` bunu içe aktarır. **Davranış bit-bit aynı:** taşıma öncesi/sonrası `node tests/ates-buz-fizik.mjs > f.txt` çıktıları `diff` ile **boş** fark.
4. `tests/ates-buz-dunyalar.mjs` (Node): `WORLDS` tutarlı — bölümler kesişmez, `levelsOfWorld` sıralı, Tapınak `[1..10]`, her bölüm tek dünyada; 11–18 şimdilik `levels`'te yok → boş liste.
5. `tests/ates-buz-tapinak-degismez.mjs` + `tests/ates-buz-tapinak.sha256` (değişmez 3); `tests/ates-buz-veri.spec.js` `toBe(10)` → `Object.keys(levels).length` ve `WORLDS` ile tutarlılık.
6. `package.json` `test:ates-buz` tüm Node testlerini + veri spec'ini koşar; CI adımı aynı betiği koşar.
**Doğrulama:** `npm run test:ates-buz` (fizik sayıları adım 0 ile **aynı**: 19/19, bekçi ≤ bütçe), `diff f-once.txt f-sonra.txt` boş, `npm run lint`, `build:check`; CI Node 20.
**Çıkış kriteri:** `worlds.js` Node'da test edilir; kayıt sertleştirme üç senaryoda yeşil; fizik testi sonuçları bit-bit aynı; Tapınak özeti yeşil; oyun davranışı değişmedi (`worlds.js` henüz `game.js`'e bağlı değil). **Geri alma:** PR revert — **ama** kayıt sertleştirmesi yine de kalır (ayrı küçük commit olarak korunur).

## Adım A2 — Tema üretimi + bölüm başına arka plan [ ]

**Dal:** `ates-buz/dunyalar-a2` · **Bağımlılık:** A1 · **Paralel:** A4 · **Model:** strongest (görsel yön) · **Ajan:** `UI Designer` (palet) + `Frontend Developer`.
**Bağlam:** Spec §3.2, §3.4. Arka plan `game.js`'te tek global `background` (`bg.png`), ana döngü (`~401`) ve `drawAll` (`~702`) çizer; zemin PNG'sini `tools/build_levels.py render_png` mevcut taş dokusundan (`extract_tile(level2.png)`) üretir. **Sabit işaretçi:** `patch_collision_js` GENERATED bloğu `// === GENERATED LEVELS 7-10 START/END (build_levels.py) ===` (satır ~157–158); işaretçiyi yeniden adlandırmak eski bloğu bulamaz → `const level7` iki kez tanımlanır (SyntaxError).
**Görevler:**
1. **Yön önce:** `design-taste-frontend` §0 brief ile iki palet (`docs/ates-buz-tema-paleti.md`, ≤1 sayfa): Ateş (kızıl taş, koyu kömür arka plan, lav çatlağı, sıcak ışıltı), Buz (mavi-beyaz taş, derin mavi arka plan, kristal, soğuk ışıltı). **Ölçülebilir kural:** zemin dokusu ortalama tonu (zemin PNG'sinin opak piksellerinin HSV ortalaması), ilgili havuz renginden (Ateş→lav kırmızısı, Buz→su mavisi) ≥25° uzak **ya da** parlaklık farkı ≥%20; ölçüm betiği `tools/ates-buz-palet-olc.py`. `impeccable` geçişi (kontrast/hiyerarşi/aralık) PR'a yazılır.
2. `tools/build_levels.py`: `THEMES = {tapinak, ates, buz}` (dünya→tema eşlemesi `worlds.js`'ten regex ile okunur; tutarlılık testi A1'in `ates-buz-dunyalar.mjs`'ine eklenir); `render_png(ints, tile, tema)` zemini HSV kaydırma + kenar süsleriyle (lav çatlağı/buz kristali; yalnız boş komşu kenarlarda, deterministik tohumlu) üretir; `cmd_bg` → `img/maps/bg-ates.png`, `bg-buz.png` (1404×1044, `bg.png`'den renk kaydırma + vinyet; deterministik); `cmd_preview <dunya>` bir bölüm düzenini iki temada `tools/_preview_*.png` olarak çıkarır. **GENERATED işaretçisi** `LEVELS 7-18` için genelleştirilir; **geçiş adımı:** eski `7-10` işaretçisi okunup yeni işaretçiyle yeniden yazılır (idempotent; ikinci çalıştırma değişiklik üretmez).
3. `game.js`: `startGame()` `currentBackground`'u `worldOfLevel(currentLevel).arkaplan`'dan yükler (Sprite önbelleği); yükleme hatasında **Tapınak `bg.png`'ye düş** (spec §5'te "yüklenemedi" deniyordu — düşme daha güvenli; sapma listesinde); `background.draw()` iki çağrı yeri `currentBackground.draw()`.
4. PNG boyutu: 2 × ~1–2 MB'ı aşarsa quantize et.
**Doğrulama:** (a) `python games/ates-buz/tools/build_levels.py all` iki kez → `git diff --exit-code -- games/ates-buz/img games/ates-buz/js/collisionBlocks.js games/ates-buz/data` (Tapınak/7–10 **bayt-bayt aynı**) ve `bg-*.png` için **iki koşuda `sha256sum` aynı** (izlenmeyen dosyada `git diff` boş döner; bu yüzden sha kullanılır); (b) `npm run test:ates-buz` (veri spec'ine: `bg-*.png` 1404×1044, palet ölçümü sınırda); (c) tarayıcıda Seviye 7'yi aç → arka plan Tapınak, fark yok; (d) Evidence Collector iki tema önizlemesini yan yana ekran görüntüsü olarak koyar (`docs/kanit/ates-buz-tema-*.png`).
**Çıkış kriteri:** iki arka plan + tema üretimi deterministik; Tapınak bayt-bayt aynı (değişmez 3); `game.js` arka planı dünyadan seçer, hatada Tapınak'a düşer; palet belgesi + ölçüm yazılı. **Geri alma:** PR revert (Tapınak etkilenmedi).

## Adım A3 — Menü: dünya seçimi, 18 bölüme genişleme, görev düzeltmesi [ ]

**Dal:** `ates-buz/dunyalar-a3` · **Bağımlılık:** A2 (seri) · **Model:** strongest (menü durum makinesi, kayıt uyumu) · **Ajan:** `Frontend Developer` + `Test Automation Engineer`.
**Bağlam:** yukarıdaki "Menü (kırılgan noktalar)", "Kayıt", "Görevler". Menü tuvalle elle çizilir; düğmeler `menuButtons[menuActive]`, bölüm düğümleri `MenuLevel`.
**Görevler:**
1. **Akış:** açılış ekranı `menuActive='worlds'` (3 büyük düğme: Tapınak / Ateş Mağarası / Buz Mağarası; kilitli/açık `isWorldUnlocked`; `levelsOfWorld` boşsa "Yakında", tıklanamaz). Dünya seçilince `seciliDunya` ayarlanır ve bugünkü bölüm haritası (`menuActive='mainMenu'`) **yalnız o dünyanın düğüm/yollarıyla** çizilir; haritada "Dünyalar" geri düğmesi. `helpers.js` başlangıç durumu `'worlds'` (bağımsız sayfada), çevrimiçi kip değişmez (`main.js` menüyü atlar).
2. **Tıklama:** `game.js:872–881` yalnız `levelsOfWorld(seciliDunya)` düğümlerini dolaşır (aksi halde 1, 11, 15 aynı koordinatta üst üste yakalanır: üç paralel `startGame+animation`). `game.js:906–908`: `menuActive` `'mainMenu'` **ve `'worlds'`** iken düğme basınca menü kapanmaz.
3. `menus.js`: düğüm/yol üretimi dünya başına (`menuNodes[n]` anahtarı **bölüm numarası kalır**); düğüm sayısına göre `menuNodeYs` hesaplanır (4–10 düğüm); `levelsUnlocking`/`pathUnlocking` dünya içinde `n→n+1`, Tapınak 10 → 11 ve 15 (yalnız `levels`'te varsa). `unlockAllDiamonds` tüm düğümleri açar. **`resetProgress`: `localStorage.clear()` YERİNE yalnız `menuLevels` ve `menuLevelsPath` anahtarlarını `removeItem`** (hub/diğer oyun kayıtları silinmesin); yalnız bölüm 1 açık kalır.
4. `buttons.js TEXT_GAP`: kullanılan her yazı uzunluğu için girdi (Dünyalar, Ateş Mağarası, Buz Mağarası, Tapınak, Yakında…) — ya da `textGap` hesaplamasını uzunluktan türet (tercih: türet; tablo yalnız varsayılan). Yazı genişliği testi: tüm menü yazıları için `x` sonlu sayı.
5. **Görevler:** `quests.allDiamonds/finalDiamond` artık `collected` bayraklarına bakar (tüm elmaslar toplandı mı; `final` tipi ayrı). Mevcut Tapınak yıldız mantığı (6. bölüm `finalDiamond`) **yeniden doğru çalışır**; bu Tapınak'ta yıldız sonuçlarını değiştirebilir → PR açıklamasında belirt (düzeltme, regresyon değil).
6. Saf mantık `worlds.js`'te, `tests/ates-buz-dunyalar.mjs` test eder: (a) 10 tamamlanmadan Ateş/Buz kilitli; (b) tamamlanınca açık; (c) "Unlock all" sonrası açık; (d) eski 10 girdili kayıtla dünyalar `levels`'e göre "Yakında"; (e) `levelsOfWorld` boş dünya tıklanamaz.
**Doğrulama:** `npm run test:ates-buz`; tarayıcıda (rAF 60 fps zorlu test sayfası) ana menü → dünya seçimi → Tapınak → Seviye 1 açılır, geri dönüş, **tek `startGame`** (yinelenen döngü yok: konsol/sayaç); eski kayıt (10 girdili) ile açılış bozulmaz; `resetProgress` sonrası `localStorage`'ta yabancı anahtar (ör. `bo_shelf`) **durur**; konsol hatası 0; Evidence Collector dünya ekranı + harita ekran görüntüsü.
**Not (tarayıcı panosu):** `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16)` (yalnız test sayfasında).
**Çıkış kriteri:** Tapınak erişilebilir (1 tık fazla); 11–18 içerik yokken "Yakında"; eski kayıt ve hub kayıtları bozulmaz; görevler çalışır. **Geri alma:** PR revert (kayıt sertleştirmesi A1'de kalır; 11+ içerik varsa önce B1/C1 geri alınır).

## Adım A4 — Çözücü, hedef adımı, çözüm kaydı/tekrar testi [ ]

**Dal:** `ates-buz/dunyalar-a4` · **Bağımlılık:** A1 · **Paralel:** A2 · **Model:** strongest (arama tasarımı) · **Ajan:** `Backend Architect` (durum uzayı) + `Test Automation Engineer`.
**Bağlam:** Spec §3.5 (bu adımla **gözden geçirildi**). Ölçülen: fizik düzeneği ≈20 bin kare/sn; iki karakter × ~21 makro = 441 dal, makro başına ~40 kare → genişletme başına ~0,9 sn. 6 px ızgarada 234×174 ≈ 41 bin konum/karakter, çift için ham ~1,6·10⁹, rampa durumları ve küp konumlarıyla ≥10⁹: **kör BFS gerçekçi değil**. Geçmişte 8–10. bölümlerde geçilemezlik düzeltmesi gerekti (`1a6def2`).
**Çözüm kaydı ilkesi:** bir bölüm **yayımlanabilir** ⇔ kayıtlı çözümü (çözücü **ya da** tasarımcı betiği) **iki kapıyı da açar** ve **tek karakterle açamaz**. Tasarımcı betiği, çözücünün bulamadığı (özellikle küp/top) bölümler içindir; doğrulayıcı **tekrar**'dır (çözücüye güvenilmez) — döngüsel "çözücüyle doğrulanmış" yok.
**Görevler:**
1. `tests/lib/ates-buz-sim.mjs`'e (A1) **eklemeler** (mevcut `step` **değişmez**): `stepGoals(s)` — `Door` örneklerine `loaded=true` verir ve `game.js` sırasıyla (`~491–494` kapı `pressed` sıfırla/`openDoor`, `~581` `checkDoors`, `~652` iki kapı `opened`) + `checkDiamonds` uygular; `snapshot(s)/restore(s, snap)` — dinamik durumun derin kopyası (**`player.lastPosition = hitbox.position` referans paylaşımına dikkat**: kopyada ayrıştır). **Doğrulama:** 500 karelik düz koşu; 250. karede snapshot + restore + devam koşusu **bit-bit aynı**.
2. `tools/ates-buz-cozucu.mjs` (yayın dışı, `.vercelignore`'a eklenir): **hedef-yönelimli, iki aşamalı** arama. (a) Tek karakter **erişilebilirlik** (kapılar/rampalar sabit durumda): 6 px konum ızgarası × makro-eylemler (yürü N, yürü+zıpla, zıpla, bekle) üzerinde BFS — 41 bin durum/karakter, saniyeler. (b) **Bulmaca sabit noktası**: iki karakter için erişilebilir kümeyi hesapla → erişilebilir düğme/kol konumları → o rampa durumlarını uygula → yeniden hesapla → kapılar erişilebilir olana ya da küme büyümeyi kesene dek yinele. Küp/top **statik** sayılır (yalnız bayraklı bölümlerde tasarımcı betiği kullanılır). Elmas maskesi **durumdan çıkarılır** (hedef değil). Çalışma süresi bütçesi: bölüm başına ≤ 10 dk, durum üst sınırı 2 M; aşılırsa "çözücü sınırı" raporu.
3. **Çözüm biçimi** `tests/ates-buz-cozumler.json`: `{ "<bolum>": { "kaynak":"cozucu|tasarimci", "butce_kare": N, "fire":"<rle>", "water":"<rle>" } }`. RLE dilbilgisi: `"<girdi><sayı>,<girdi><sayı>,…"`, girdi ∈ {`0` yok, `L`, `R`, `U`, `LU`, `RU`} (kare başına; sayı ≥1). `butce_kare` **bağımsız bütçedir** (tasarımcının beyan ettiği üst sınır, ≤ 5400 = 90 sn), kaydın uzunluğu değil.
4. `tests/ates-buz-cozum.mjs`: her kayıt `step + stepGoals` ile baştan oynatılır; iki kapı `opened`; süre ≤ `butce_kare`; **ölüm/yeniden doğuş yok**; **tek karakter testi:** diğer karakterin girdisi `0` yapılınca kapılar **açılmaz** ("tek başına geçilemez" kanıtı); `npm run test:ates-buz`'a dahil.
5. **Çözücüyü mevcut bölümlerde doğrula:** çıkış = **Seviye 3** (mekaniksiz, statik; tam çözüm) **ve** düğme içeren bir bölüm (Seviye 2; bulmaca sabit noktası çalışıyor) çözülür ve kaydedilir. Çözemediği Tapınak bölümleri "çözücü sınırı" olarak not edilir (hata değil).
6. Çözücü çıktısı deterministik (sabit tohum, aynı girdi → aynı dosya).
**Doğrulama:** `node tools/ates-buz-cozucu.mjs --bolum 3` çözüm bulur, `tests/ates-buz-cozum.mjs` yeşil; kaydı bilerek bozunca (bir girdiyi sil) **kırmızı**; tek-karakter testi kırmızı→yeşil doğru yönde; snapshot/restore bit-bit; `npm run test:ates-buz` Node 20'de (CI).
**Çıkış kriteri:** Seviye 3 + Seviye 2 için kayıtlı, tekrar oynatılan çözüm; bozunca kırmızı; çözücü sınırları `CLAUDE.md`'ye **adım D'de** yazılır (şimdilik bu planda). **Risk:** küp/top bulmacaları → tasarımcı betiği (yukarıdaki ilke). **Geri alma:** dalı sil.

## Adım A5 — Çevrimiçi sıralı geçiş testi (sahte firebase) [ ]

**Dal:** `ates-buz/dunyalar-a5` · **Bağımlılık:** A3 · **Model:** varsayılan · **Ajan:** `Test Automation Engineer`.
**Bağlam:** `network.js` `window.parent.firebase.database()` ister (satır ~54–58); hub etkin olmayan çevrimiçi oyunları süzer (`js/app.js` `g.online && g.active`) ve `ates-buz` `active:false` → **hub üzerinden iki sekme doğrulaması yapılamaz**; canlı RTDB'ye yazılmamalı.
**Görevler:** `tests/helpers/fake-firebase.js` (bellek içi `database().ref(path).set/update/on('value')/child/onDisconnect`, iki bağlam arasında paylaşılan veri yolu); `tests/ates-buz-cevrimici.spec.js`: tek sayfada iki `iframe` (`/games/ates-buz/index.html?role=host&…` / `role=guest&…`), ebeveyn sayfa sahte `firebase`'i sağlar; host 1. bölümü oynar → kapılar açılır (test, `window` üzerinden host durumunu zorlayarak ya da çözüm kaydını girdi olarak vererek) → host `currentLevel+1`, misafir `applyHostState` ile aynı bölüme geçer; 10→11 sınırı `levels` uzunluğuna bağlı.
**Doğrulama:** `npm run test:ates-buz` (spec dahil) yeşil; canlı ağ çağrısı 0 (`page.route` ile engel + sahte). **Çıkış kriteri:** çevrimiçi sıralı geçiş iki kipte (host/misafir) otomatik doğrulanır. **Geri alma:** dalı sil.

## Adım B1 — Ateş Mağarası (11–14) [ ]

**Dal:** `ates-buz/ates-magarasi` · **Bağımlılık:** A3, A4, A5 · **Model:** strongest (bölüm tasarımı) · **Ajan:** `UI Designer` (yerleşim) + `Frontend Developer`; kabul: `Evidence Collector`.
**Bağlam:** Spec §4. Hedef yaş 6–10; 11 öğretici, 14 en zor; her bölüm **tek başına geçilemez**. Parçalar: düğme→rampa, kol, küp, top, havuzlar (`f` lav: su ölür; `w` su: ateş ölür; `a` asit: ikisi de ölür), **zincirli köprü dekoru** (mekanik değil). ASCII lejantı `build_levels.py` başlığında; yardımcılar `make_level()/R()/lay()`; örnek `LEVEL7..10`.
**Görevler:**
1. 11 *Kıvılcım*: lav havuzu (ateş geçer, su kaçınır) + tek düğme→rampa, ikisi birlikte. 12 *Asit Geçidi*: asit engeli, küpü düğmeye taşıma. 13 *Zincirli Köprü*: **iki düğme → rampa rölesi**; köprü yalnız katı platform/dekor. 14 *Ateş Kalbi*: kol + düğme + küp, final elması (`quests.finalDiamond`, A3'te düzeldi).
2. `LEVELS`'e 11–14 (`dunya:'ates'` → tema); `build_levels.py all` → `collisionBlocks.js GENERATED` bloğu (7–14) + `level11..14.png` + `data/*.json`. Başlangıç konumları/elmas/kapı/parça katı blokta doğmaz (veri testi).
3. `worlds.js` Ateş `bolumler:[11..14]` artık `levels`'te var → dünya seçimi "Yakında" yerine açılır (A3 mantığı); 10 tamamlanınca 11 açılır.
4. Her bölüme kayıtlı çözüm (çözücü ya da tasarımcı betiği); tek-karakter testi yeşil (geçilemez kanıtı).
**Doğrulama:** `build_levels.py all` iki kez → ikinci çalışma fark üretmez; `npm run test:ates-buz` (fizik sweep yeni bölümleri kapsar; görsel↔ızgara; çözüm tekrarı 11–14; Tapınak-değişmez); `lint`; tarayıcıda Ateş'i açmak için **localStorage tohumu** (`menuLevels` ile 10 tamamlanmış kayıt) ya da "Hepsini aç" → menüden Ateş Mağarası → 11 açılır, arka plan/zemin Ateş teması, konsol 0 hata; Evidence Collector her bölümün ekran görüntüsünü alır.
**Çıkış kriteri:** 4 bölüm, hepsi kayıtlı çözümle geçilebilir ve tek başına geçilemez, fizik değişmezleri yeşil, tema palet belgesine uygun; PR'da bölüm başına çözüm kaynağı (çözücü/tasarımcı) + süre + ekran görüntüsü. **Geri alma:** PR revert (`levels` 10'a döner; Ateş "Yakında"; kayıt sertleştirmesi sayesinde 11+ kayıtlı bulut durumu çökertmez).

## Adım C1 — Buz Mağarası (15–18) [ ]

**Dal:** `ates-buz/buz-magarasi` · **Bağımlılık:** B1 (seri) · **Model/ajan:** B1 ile aynı.
**Görevler:** 15 *İlk Buz*: su havuzları (su geçer, ateş kaçınır) + tek kol. 16 *Yuvarlanan Top*: topu eğimden düşürüp düğmeye oturtma (çözücü zor → tasarımcı betiği). 17 *Kol Zinciri*: karşılıklı kapılar, sıralı kol. 18 *Buz Kalbi*: final (`finalDiamond`). Geri kalan B1 ile aynı (Buz teması, `dunya:'buz'`, çözüm kayıtları).
**Doğrulama / çıkış / geri alma:** B1'deki gibi; **ek:** A5'in çevrimiçi sıralı geçiş testi 10→11→…→18 sınırını kapsayacak şekilde genişletilir (host/misafir; canlı RTDB yok).

## Adım D — Kabul geçidi, belgeler, devir [ ]

**Dal:** `ates-buz/dunyalar-d` · **Bağımlılık:** C1 · **Ajan:** `Reality Checker`, `AI-Generated Code Security Auditor`, `Code Reviewer`, `Technical Writer`.
**Görevler:** (1) `CLAUDE.md` "Ateş & Buz fizik sözleşmesi"ne dünya/çözücü/çözüm-kaydı kuralları + **"yeni bölüm ekleme" kontrol listesi** (ASCII → `build_levels.py all` → çözüm kaydı → testler) + çözücü sınırları; README test satırı; `docs/ates-buz-fizik-…` bağlantısı; bu planın "KALDIĞIMIZ YER"i. (2) Reality Checker: tüm iddialar komutla kanıtlanır (tema tutarlılığı, çözüm kayıtları, eski kayıt uyumu, çevrimiçi sıralı geçiş, Tapınak değişmez). (3) Sahibe **yeniden açma kontrol listesi** (insan testi: 2 cihaz, 18 bölüm; `active:false`'ı kaldırma = `data/games.json` + `npm run catalog` + `python seo/build_seo.py` + `seo/test_build_seo.py` kapalı listesi) — **bu plan açmaz**. (4) Bellek kaydı (`memory/`).
**Çıkış kriteri:** tüm değişmezler yeşil; devir belgesi; açma kararı sahibinde.

---

## Spec'ten sapmalar (gerekçeli)

1. §3.5: "bulunamayan bölüm yayımlanmaz" → "kayıtlı çözümü (çözücü **ya da** tasarımcı betiği) replay ile doğrulanamayan bölüm yayımlanmaz" (çözücü küp/top'ta yetmeyebilir; doğrulayıcı tekrardır).
2. §5: bozuk dünya görseli → Tapınak arka planına düş (spec "yüklenemedi" diyordu).
3. §5: misafir bölüm doğrulaması `Object.keys(levels).length` ile kalır (mevcut davranış); `worldOfLevel` yalnız menü/arka plan için.
4. §4: 13. bölümde **zincirli köprü dekor** (mekanik yok); bulmaca iki düğme + rampa rölesi.
5. Yeni adım **A5** (çevrimiçi test altyapısı) ve **A1'e kayıt sertleştirme**: düşmanca incelemenin kritik bulguları (kayıt döngüsü çökmesi, çevrimiçi doğrulamanın imkânsızlığı).

## Plan mutasyon protokolü

Adım **bölünürse** (ör. B1 çok büyürse 11–12 / 13–14): eski başlığı `[bölündü → B1a/B1b]` yap, yeni adımlar aynı bağlam notlarını taşır. **Atlanırsa:** gerekçeyi adımın altına yaz. **Araya adım eklenirse:** bağımlılık grafiğini güncelle. **Terk:** nedenini ve kalan işi "KALDIĞIMIZ YER"e yaz. Her mutasyon bu dosyada tarihli kalır.

## Bilinen riskler (bu plana özgü)

1. **Çözücü yetmezse** (küp/top): tasarımcı betiği + replay doğrulaması; bölüm sadeleştirilir; "geçilebilir" iddiası kayıtsız yapılmaz.
2. **Prosedürel sanat** çizim kalitesinde olmayabilir; palet belgesi, ölçüm ve ekran görüntüleriyle sahibe gösterilir; beğenilmezse yalnız A2 tekrarlanır (bölümler tema parametresi aldığı için yeniden üretim ucuz).
3. **Menü tuvali:** erişilebilirlik bugünkü menüden fazlasını sunmaz (kapsam dışı).
4. **Gerçek zamanlı insan testi burada yapılamaz:** açmadan önce sahibin oynaması şart.
5. **Hub çevrimiçi-only:** dünya seçimi yalnız bağımsız sayfada; hub oyuncusu yeni dünyalara sıralı ilerleyerek ulaşır (sahibe bildirildi).
6. **Fizik PR #50 ön koşul:** yeni bölümler fizikteki bilinen kusurlara (seviye 4 kol rampası aralığı, eğim kenarı titremesi) duyarlı olabilir; yeni bölüm tasarımı bu kalıplardan kaçınır (ASCII'de rampa yolunun eğim/blok köşesine yakın geçmemesi; fizik sweep zaten yakalar).
