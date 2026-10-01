# Ateş & Buz — yeni dünyalar (Ateş Mağarası + Buz Mağarası) — tasarım

**Durum:** tasarım sahibi tarafından onaylandı (30 Eyl 2026). Uygulama planı: `plans/ates-buz-yeni-dunyalar-2026-09-30.md`.
**Ön koşul:** fizik düzeltmesi PR'ı (`fix/ates-buz-fizik`, bkz. `docs/ates-buz-fizik-2026-09-30.md`) birleşmiş olmalı.
**Oyun durumu:** hub'da kapalı (`data/games.json` `ates-buz` `active:false`). Bu iş oyunu açmaz; açma kararı sahibinde.

## 1. Amaç ve kapsam

Mevcut 10 bölümlük Ateş & Buz'a, **temadan çıkmadan** (aynı karakterler, havuz/elmas/kapı görselleri, aynı "kırmızı=lav,
mavi=su, yeşil=asit" mantığı) iki yeni dünya eklemek: her dünya kendi **arka planı**, **zemin dokusu** ve **bulmaca
karakteriyle**.

| Dünya | Bölümler | Arka plan / zemin | Bulmaca karakteri |
|---|---|---|---|
| Tapınak (mevcut) | 1–10 | tuğla `bg.png` + kahverengi taş | değişmez |
| Ateş Mağarası | 11–14 | kızıl taş, lav çatlakları, sıcak ışıltı | lav/asit geçişleri, küpü düğmeye taşıma, zincirli köprü |
| Buz Mağarası | 15–18 | mavi buz, kristaller, soğuk ışıltı | topu düğmeye yuvarlama, kol zinciri, su yolları |

**Kapsam dışı (YAGNI):** yeni mekanik (buzda kayma, rüzgâr, hareketli platform), yeni karakter/sprite, yeni ses, elle çizim
sanat, yeni havuz türü, çevrimiçi kipe özel bölüm seçimi. Fizik koduna dokunulmaz.

## 2. Kararlar (sahibi onayı)

1. 8 yeni bölüm (4 + 4); numaralar 11–18, toplam 18.
2. Menüde **dünya seçimi** ekranı; Ateş ve Buz Mağarası, Tapınak'ın 10. bölümü tamamlanınca açılır; her dünyanın yolu
   bugünkü 2 sütunlu zigzag düzeniyle çizilir.
3. Çevrimiçi kip bölümleri **numara sırasıyla** oynatmaya devam eder (host `currentLevel+1`, misafir host durumunu izler);
   üst sınır `Object.keys(levels).length` = 18.
4. Görseller **prosedürel**: mevcut taş/arka plan dokusunun renk kaydırılıp süslenmesi (PIL, deterministik). Sanatçı işi değil.
5. Bulmacalar **yalnız mevcut parçalarla** (düğme→rampa, kol, küp, top, zincirli köprü, lav/su/asit havuzu, elmas, kapı).
6. Her bölüm **kayıtlı çözümle** gelir; test çözümü fizik düzeneğinde tekrar oynatır (Balon Labirenti `cozum` yöntemi).

## 3. Mimari (birimler ve arayüzler)

**3.1 Dünya tablosu** — `games/ates-buz/js/worlds.js` (yeni, saf veri + 2 yardımcı, DOM'suz → Node'da test edilir):
`WORLDS = [{ id, ad, bolumler:[…], arkaplan:'img/maps/bg-<id>.png', zemin:'<id>', acilisSarti:{ bolum:10 } }]`,
`worldOfLevel(n)`, `levelsOfWorld(id)`. Tek doğruluk kaynağı; menü, arka plan, kilit ve testler buradan okur.

**3.2 Arka plan** — `game.js`'teki tek global `background` (`bg.png`) yerine `startGame()` bölümün dünyasına göre
`currentBackground` seçer (yüklemede önbellek; `drawAll` ve ana döngü aynı nesneyi çizer). Bölümün zemin PNG'si
(`level<N>.png`) zaten bölüm başına; değişen yalnız arka plan ve üretim.

**3.3 Menü** — `menus.js`: bugünkü sabit `for i<=10` düğüm/yol üretimi dünya başına yapılır (`menuNodes` anahtarı yine
bölüm numarası → eski kayıtlarla uyumlu: `localStorage menuLevels/menuLevelsPath` indeksle tutuluyor, 11–18 eklenince
eski kayıt bozulmaz). Yeni **dünya seçimi ekranı** (`menuActive = 'worlds'`): 3 büyük düğme (kilitli/açık durumu
`acilisSarti`'ndan). `drawMenu` yalnız seçili dünyanın düğümlerini çizer. "Hepsini aç" ve "İlerlemeyi sıfırla" 18 bölümü
kapsar. Kilit zinciri: 1→…→10 (mevcut), 10 tamamlanınca 11 ve 15 açılır; 11→…→14, 15→…→18.

**3.4 Üretim hattı** — `tools/build_levels.py`: `LEVELS` kayıtlarına `dunya` alanı; `render_png` zemin dokusunu dünya
temasına göre üretir (HSV kaydırma + kenar süsleri: lav çatlağı / buz kristali); yeni `cmd_bg` dünya arka planlarını
üretir. `GENERATED LEVELS` bloğu 7–18'i kapsar. Bölüm verisi (`data/*.json`: players, doors, diamonds, buttons, levers,
cubes, balls, bridges) mevcut `cmd_json` akışıyla yazılır.

**3.5 Çözücü ve çözüm kaydı** — `tools/ates-buz-cozucu.mjs` (yayın dışı; `.vercelignore`) fizik düzeneğini
(`tests/ates-buz-fizik.mjs`'teki `setup/step`, ortak modüle taşınır) kullanarak iki karakter için makro-eylem araması
(yürü/zıpla/bekle, düğme-kol-kapı durumu durumun parçası) yapar; bulduğu çözümü `tests/ates-buz-cozumler.json`'a
yazar (bölüm → kare başına iki karakterin girdisi, RLE). **Çözücü kör BFS değildir** (durum uzayı ≥10⁹): hedef-yönelimli, iki aşamalı
(tek karakter erişilebilirlik + bulmaca sabit noktası; küp/top statik). **Yayım ilkesi:** kayıtlı çözümü (çözücü **ya da** tasarımcı betiği)
replay ile iki kapıyı açmayan ya da tek karakterle de açılabilen bölüm yayımlanmaz; doğrulayıcı her zaman *tekrar*dır (çözücüye güvenilmez).

**3.6 Testler** — mevcut `tests/ates-buz-fizik.mjs` ve `tests/ates-buz-veri.spec.js` `levels` anahtarlarından türediği için
yeni bölümleri otomatik kapsar. Eklenenler: (a) `cozum tekrarı`: her bölümün kayıtlı çözümü iki kapıyı da açar, süre ≤ bölüm
bütçesi; (b) `dunyalar`: `WORLDS` tutarlı (bölüm kesişimi yok, hepsi `levels` içinde, 1–10 Tapınak); (c) menü/kilit birim
testi (saf fonksiyon); (d) görsel: dünya arka plan görselleri 1404×1044 ve tema paleti sınırlarında.

## 4. Bölüm niyetleri (geometri uygulama planında; çözücü doğrular)

Hedef yaş 6–10; her dünyanın 1. bölümü öğretici, 4. bölümü en zor; her biri **tek başına geçilemez** (iş birliği şart).

- **Ateş Mağarası:** 11 *Kıvılcım* — lav havuzu (ateş geçer, su kaçınır) + tek düğme→rampa, ikisi birlikte;
  12 *Asit Geçidi* — asit engeli, küpü düğmeye taşıma; 13 *Zincirli Köprü* — iki düğme → rampa rölesi (zincirli köprü **dekor/katı platformdur**, mekaniği yok);
  14 *Ateş Kalbi* — kol + düğme + küp birleşimi, final elması.
- **Buz Mağarası:** 15 *İlk Buz* — su havuzları (su geçer, ateş kaçınır) + tek kol; 16 *Yuvarlanan Top* — topu eğimden
  düşürüp düğmeye oturtma; 17 *Kol Zinciri* — karşılıklı kapılar, sıralı kol; 18 *Buz Kalbi* — final.

## 5. Hata/uyum yönetimi

- **Kayıt döngüleri ardışık anahtar varsaymaz** (`Object.keys`, olmayan anahtar atlanır); 14 girdili bulut kaydı 10 düğümlü sürüme yüklenince çökmez. Bu sertleştirme ilk altyapı adımında yapılır ve geri alınmaz.
- `resetProgress` `localStorage.clear()` yerine yalnız menü anahtarlarını siler (iframe aynı kökenli: hub/diğer oyun kayıtları korunur).
- Eski kayıt (10 girdili `menuLevels`) yeni sürümde yüklenir; eksik 11–18 varsayılan kilitli (10 tamamlıysa 11/15 açık sayılır).
- Bozuk/eksik dünya görseli Tapınak arka planına düşer; Tapınak etkilenmez (`worlds.js` veri doğrulaması).
- Çevrimiçi: misafir `hostLevel`'i mevcut davranışla (`Object.keys(levels).length`) doğrular; bilinmeyen bölümde yok sayar. Çevrimiçi sıralı geçiş testi için sahte (bellek içi) firebase gerekir; hub oyunu etkin olmadığı için hub üzerinden iki sekme doğrulaması yapılamaz.

## 6. Sıralama (ayrı PR'lar; plan dosyasında adım adım)

0. Fizik PR'ı birleşir (ön koşul). 1. Altyapı (`worlds.js`, arka plan seçimi, menü, üretim hattı teması, çözücü, testler) —
Tapınak davranışı değişmez. 2. Ateş Mağarası (4 bölüm + arka plan + çözüm kayıtları). 3. Buz Mağarası. 4. Kabul geçidi ve
belgeler (README/CLAUDE.md). Oyunun yeniden açılması bu işin parçası değildir.

## 7. Riskler (dürüst)

- **Hub oyunu yalnız çevrimiçi başlatıyor** (menü atlanır, 1. bölümden açılır): dünya seçimi ekranı yalnız bağımsız sayfada görünür; hub oyuncusu yeni dünyalara 10 bölümü sırayla oynayınca ulaşır. İstenirse "hub'dan dünya seç" ayrı iş.
- `quests.allDiamonds/finalDiamond` bugün hiç tamamlanmıyor (elmaslar `collected` bayrağıyla işaretleniyor): 14/18 "final elması" için menü adımında düzeltilir (Tapınak yıldızları da düzelir).
- Gerçek zamanlı insan oynaması burada yapılamıyor (tarayıcı panosu kareleri ~1,5 fps'e kısıyor): **açmadan önce insan testi şart.**
- Prosedürel sanat "çizim" kalitesinde olmayabilir; temadan çıkmaz ama sanatçı işi değildir.
- Küp/top bulmacalarında çözücü çözüm bulamayabilir → bölüm sadeleşir; erken bölümlerde az, sonlarda bilinçli kullanım.
- Menü tuvalle elle çiziliyor (HTML değil): dünya ekranı aynı çizim diliyle yazılmalı; dokunmatik kontrol ve erişilebilirlik
  için klavye/ok gezinmesi bugünkü menüden daha fazlasını sunmaz (kapsam dışı).
