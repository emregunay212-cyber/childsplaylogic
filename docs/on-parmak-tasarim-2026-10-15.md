# On Parmak — on parmak klavye oyunu tasarımı

> Durum: **uygulamada** (tasarım 2026-10-15'te onaylandı; dal `feat/on-parmak`). Uygulama planı:
> `plans/on-parmak-2026-10-15.md` (3 PR). Plan kararları bu belgeden saptığında burası da güncellenir.
> Slug `on-parmak` · kategori Harfler & Kelimeler (`section: harf`, `cat: Klavye`) · yaş 6–12 · hub-içi modül (iframe değil) ·
> 7 kısım (motor seviyesi) × ~100 bölüm · Türkçe Q.

## 1. Amaç ve kaynak

Sahip isteği: TypingClub'daki on parmak klavye eğitimini (incelenen bağlantı: `typingclub.com/sportal/program-3/117.play`)
bilnetoyun.com'a **oyun** olarak eklemek. Kurs değil: öğrenci bilişim dersi süresince oynar, bölümler kendiliğinden ilerler,
girişte öğretmen/öğrenci başlangıç bölümünü seçer ("13. bölümden başla"). Kaldığı yerden devam yok (Klavye Kâşifi ile aynı
gerekçe: laboratuvarda bilgisayar ortak, misafir modu kayıt tutmaz).

**Klavye Kâşifi'nden farkı:** Kâşifi tuşun **yerini bulmayı** öğretir (tek parmak, süre/hız yok, 4–10 yaş). On Parmak her tuşun
**hangi parmakla** basılacağını öğretir, ezberletir ve hızı ölçer. İkisi birbirinin tekrarı değil, ardışık iki adımdır.

### 1.1 TypingClub incelemesi (15 Eki 2026, misafir oturumu, hesap açılmadı)

Bağlantı ayrı bir oyun değil, "program-3" kursunun ilk dersidir ("Keys f & j"). Programın ders verisi
(`/api/v1.1/program2/3/`) okunarak çıkarılan yapı:

| Öğe | TypingClub'da | On Parmak'ta |
|---|---|---|
| Ölçek | 726 öğe: 25 bölüm başlığı, 691 yazma dersi, 10 video; 64'ü oyun, 16'sı seviye testi | ~100 bölüm, 7 kısım (§5) |
| Sıra | Orta sıra çift çift (f-j, d-k, s-l, a-;, g-h) → üst → alt → Shift → rakam → sembol → temel/ileri metin (75 kelime/dk'ya kadar) | Aynı mantık, Türkçe Q tuşlarıyla |
| Yeni tuş tanıtımı | "Type the [f] key using your left index finger" + klavye üstünde el çizimi, parmak mavi yanar | §3.2 tanıtım ekranı |
| Kutulu motor (`boxed`, `on_error: block`) | 7'li kutu sayfaları; yanlışta kutu kırmızı + basılan harf, doğru tuşa kadar bekler | §3.2 kutulu alıştırma |
| Satır motoru (`normal`, `on_error: continue`) | Satırlar; yanlış harf kırmızı, imleç ilerler; geri silme yok; tam klavye + el; canlı hız/doğruluk | §3.3 satır bölümü |
| Tek el dersleri (`left/right-anchor`) | Yalnız sol / sağ el tuşlarıyla metin | İçerik türü olarak (Kısım 7), ayrı motor yok |
| Ders eşiği | `min_accuracy` 80 (hepsinde), `min_wpm` + `goal_wpm` kısma göre artar | %80 geçiş, hız yalnız 3. yıldız (§4) |
| Sonuç ekranı | 5 yıldız, puan, doğruluk/süre/hız göstergeleri, "Try again" / "→" | Düğmesiz 3 yıldızlı şerit (§3.5) |
| Oyunlar | Balloon Valley (13), Monster Attack (19), Floating Bubbles (16), Apple Thieves (11), Temple Bash (5) | İlk dördü, kendi çizimimizle (§6) |
| Diğer | Videolar (oturuş, mola), seviye testleri, ders haritası, birkaç dersten sonra **üyelik duvarı** | Video/harita/üyelik yok |

Apple Thieves ve Temple Bash misafirle açılamadı (üyelik duvarı); işleyişleri ders verisinden ve oyun adından çıkarıldı.
**Telif:** TypingClub metinleri, karakterleri ve görselleri kullanılmaz. Örnek alınan yalnız işleyiştir; Türkçe içerik ve
SVG çizimler bu proje için yazılır.

## 2. Sahip kararları (15 Eki 2026)

| Konu | Karar |
|---|---|
| Dizilim | **Türkçe Q** (okul bilgisayarları; Kâşifi ile aynı). F dizilimi kapsam dışı. |
| Kullanım | Ders süresince oyun; bölümler kendiliğinden ilerler; girişte başlangıç seçici; ilerleme kaydı yok. |
| Yaş | 6–12, tek akış (yaş seçimi yok). Hız hedefi geçişi engellemez (§4). |
| Kapsam | ~100 bölüm, 7 kısım (§5). |
| Kötü geçen bölüm | Doğruluk **< %80** → aynı bölüm kendiliğinden tekrar. Hız geçişi engellemez. |
| Mini oyunlar | Balon Vadisi, Canavar Saldırısı, Uçan Baloncuklar, Elma Bekçisi (dördü). |
| Oyunda can bitmesi | Oyun erken biter, en çok ⭐, akış sürer (tekrar yok). %80 kuralı oyunlarda da geçerli. |
| Mimari | Hub-içi modül (yaklaşım A); Q eşlemesi ortak dosyaya alınır, Klavye Kâşifi de ona geçer. |
| Ad | **On Parmak** (`on-parmak`). |
| Çalışma | Depo `Downloads\childsplaylogic` klonunda, dal `feat/on-parmak`; 3 PR, oyun son PR'a kadar `active: false`. |

**Kapsam dışı (bilinçli):** F dizilimi, video, ders haritası/ilerleme kaydı, üyelik, seviye testleri, geri silme, ses dosyası,
yaşa göre eşik, Temple Bash.

## 3. Akış ve ekranlar

### 3.1 Açılış: başlangıç seçici

Klavye Kâşifi'nin seçicisiyle aynı düzen (`kk-picker` kalıbı, kendi sınıf adlarıyla):

- 7 kısım kartı: ad, örnek tuşlar, bölüm aralığı ("Bölüm 19–36"). Kart = kısmın başından başla.
- Kartın altında bölüm numarası çipleri (genel numara 1–~100). Çip = o bölümden başla.
- İlk odak Kısım 1 kartında; Enter = baştan başla.
- Üstte tek satırlık hatırlatma: "Sol işaret parmağın **F**'de, sağ işaret parmağın **J**'de — bu tuşlarda küçük tümsek var."
- Seçim → modül `pendingStart = bölümNo` bırakır, `GameEngine.startGame(oyun, kısım)` çağırır (araç çubuğu ve yıldız kaydı
  doğru kısma yazılsın); yeni `init` seçilen bölümden başlar. Oyunun tuş dinleyicisi seçimden **sonra** kurulur.
- Son kutlama katmanındaki "Tekrar Oyna" seçiciyi açar.

### 3.2 Yeni tuş bölümü = tanıtım + kutulu alıştırma

1. **Tanıtım:** bölümün her yeni tuşu için bir ekran — "**F** tuşuna **sol işaret parmağınla** bas." El çiziminde o parmak
   yanar, ekran klavyesinde tuş nabız atar. Yalnız doğru tuş geçirir; yanlış tuşta tuş kırmızı titrer, ilerlemez. Tanıtım
   basışları doğruluğa sayılmaz. Tanıtım bitince 1,2 sn'lik şerit: "Şimdi alıştıralım: **F J**".
2. **Kutulu alıştırma:** metin 7'li kutu sayfaları halinde. Etkin kutunun altında çizgi. Doğru tuş → kutu yeşil + ✓, imleç
   ilerler. Yanlış tuş → kutu kırmızı, içinde basılan karakter görünür, ekran klavyesinde basılan tuş kırmızı; doğru tuşa
   basılana kadar **bekler**. Hatası düzeltilen kutu ✓ almaz. Sayfa bitince sonraki 7'li sayfa.
   Boşluk içeren metinde boşluk kutusu "␣" ile gösterilir.

### 3.3 Satır bölümü

Tekrar, kelime, cümle, tek el ve paragraf bölümleri bu motordadır.

- Metin satırlara bölünür; 3 satır görünür, etkin satır ortada kalacak şekilde kayar. Sözcük satır sonunda bölünmez.
- Doğru karakter yeşil zemin, yanlış karakter kırmızı zemin; imleç her basışta **ilerler** (TypingClub `continue`).
  Geri silme yok (Backspace yok sayılır).
- Canlı göstergeler: **hız (kelime/dk)** ve **doğruluk %** — ilk basıştan sonra görünür, her basışta güncellenir.
- Bölüm, son karakter yazılınca biter.

### 3.4 Oyun bölümü

§6'daki dört oyundan biri; aynı ekran klavyesi/el çizimi oyun alanının altında (oyun izin veriyorsa küçültülmüş).

### 3.5 Bölüm sonu: sonuç şeridi

Düğmesiz, ~2,5 sn; Enter hemen geçirir. İçerik: 3 yıldız, doğruluk %, hız (kelime/dk), süre.
**Enter Boşluk değildir** (Klavye Kâşifi'nin tersine): yazma sırasında Enter ve Backspace yok sayılır ve sayılmaz; Enter yalnız
seçicide (düğme) ve şeridi geçmekte işler. Şerit açıldıktan sonraki **400 ms** içinde Enter yok sayılır (refleks basış şeridi
atlatmasın).
Doğruluk < %80 → şerit "Bir daha deneyelim — doğruluk %72, hedef %80" der ve **aynı bölüm baştan** başlar (tanıtım
ekranları tekrar gösterilmez). Takılan öğrenciyi öğretmen seçiciden ileri alır.

### 3.6 Kısım sonu ve bitiş

Kısım bitince `callbacks.onLevelUp(kısımYıldızı)` (katman açılmaz; yıldız `Progress`'e, araç çubuğu sonraki kısma) + 2,8 sn'lik
kısım şeridi ("Orta sıra tamam! ⭐⭐⭐ Sıradaki: Üst sıra"). Yalnız Kısım 7 bitince `callbacks.onComplete(yıldız)` → kutlama
katmanı. Kısım yıldızı = o kısımda **geçilen** bölümlerin yıldız ortalaması, en yakın tama yuvarlanır (kısım ortasından
başlanırsa yalnız oynananlar).

### 3.7 Ekranın sabit parçaları

- **Ekran klavyesi:** Türkçe Q (rakam satırı dahil; `"` ve `-` tuşları On Parmak'ta görünür), iki Shift, Boşluk. Sıradaki tuş
  yanar; Shift gereken karakterde **karşı elin** Shift'i de yanar.
- **El çizimi:** klavyenin üstüne binen iki el (kendi SVG'miz, her parmak ayrı yol). Sıradaki tuşun parmağı yanar
  (Shift'li karakterde iki parmak).
- **Göster/gizle düğmeleri:** "El" ve "Klavye". El çizimi Kısım 1–3'te varsayılan açık, 4–7'de kapalı. Tercih oturum içi,
  kaydedilmez.
- **Caps Lock açıkken yazma duraklar:** `getModifierState('CapsLock')` açıksa belirgin uyarı ("Büyük harf kilidi açık —
  kapatmak için Caps Lock tuşuna bas") ve basışlar **yok sayılır, sayılmaz**. Caps Lock tuşunun kendi basışı uyarı durumunu
  günceller: kapanınca uyarı gider, yazma sürer. Hoşgörü yok: Kısım 4'te Shift'siz büyük harf kabul edilmez (Shift kuralı
  öğretilir).
- **Dokunmatik:** fiziksel klavye birincil giriş. Dokunmatik cihazda (`MobileUtils.isTouchDevice()`) bilgi notu
  ("On Parmak fiziksel klavyeyle oynanır"); ekran tuşlarına dokunmak yine aynı `press()` yoluna girer.
- **Ses:** her doğru basışta `AudioManager.play('tap')`, yanlışta `'error'`, bölüm sonu `'star'`. Ses dosyası eklenmez.
  Motorun `onCorrect/onWrong`'u tuş başına çağrılmaz (ses tekrarı ve sayaç şişmesi olur); yıldızı modül hesaplar.

## 4. Ölçümler ve yıldız

- **Doğruluk** = ilk basışta doğru karakter / toplam basış. Kutulu motorda aynı kutuya her yanlış basış ayrı hata sayılır.
  Tanıtım basışları sayılmaz.
- **Hız (kelime/dk)** = (yazılan karakter sayısı / 5) / dakika. Süre ilk basışta başlar, son karakterde biter. Boşluk karakterdir.
- **Bölüm yıldızı** (yalnız doğruluk ≥ %80 ise; altı = tekrar):
  - ⭐ doğruluk ≥ %80
  - ⭐⭐ doğruluk ≥ %90
  - ⭐⭐⭐ doğruluk ≥ %95 **ve** hız ≥ kısım hedefi
- **Kısım hız hedefleri** (yalnız 3. yıldız): K1 8 · K2 10 · K3 12 · K4 12 · K5 10 · K6 10 · K7 15→25 (bölüm başına artar).
  Kutulu bölümlerde hız hedefi yok (3. yıldız yalnız doğrulukla).
- **Oyun bölümü:** doğruluk aynı formül; %80 altı → tekrar. Oyun canlı bittiyse yıldız doğruluk eşiklerinden (hız şartı yok);
  canlar bittiyse en çok ⭐.
- **Sınır durumları:** `dogruluk(0, 0) = 0` (hiç basmadan bitmez → tekrar). Süre < 1 sn ise hız 0 (3. yıldız verilmez; sahte
  saatte sonsuz hız olmaz).
- **Oyunlarda öncelik:** önce %80 kuralı (doğruluk < 80 → tekrar; hiç basmadan canları bitirmek de buna girer), sonra can
  kuralı (canlar bitti + doğruluk ≥ 80 → en çok ⭐, akış sürer).

## 5. İçerik

### 5.1 Türkçe Q parmak haritası (`klavye-dizilim.js`)

| Parmak | Tuşlar |
|---|---|
| Sol serçe | `"` 1 Q A Z, sol Shift |
| Sol yüzük | 2 W S X |
| Sol orta | 3 E D C |
| Sol işaret | 4 5 R T F G V B |
| Sağ işaret | 6 7 Y U H J N M |
| Sağ orta | 8 I(ı) K Ö |
| Sağ yüzük | 9 O L Ç |
| Sağ serçe | 0 * - P Ğ Ü Ş İ(i) , . , sağ Shift |
| Başparmaklar | Boşluk |

Shift kuralı: harfin **karşı elinin** serçe parmağı Shift'e basar (sol el harfi → sağ Shift).

### 5.2 Kısımlar

| Kısım | İçerik | ~Bölüm | El çizimi |
|---|---|---|---|
| 1 Orta sıra | F J → D K → S L → A Ş → G H → İ , ; ardından ilk kelimeler | 18 | açık |
| 2 Üst sıra | R U → E I(ı) → T Y → O W → P Q → Ğ Ü | 18 | açık |
| 3 Alt sıra | V M → C Ö → B N → X Ç → Z . | 16 | açık |
| 4 Büyük harf | Shift kuralı; büyük harf sol el / sağ el, özel adlar, cümle başı | 12 | kapalı |
| 5 Rakamlar | 4 7 → 3 8 → 2 9 → 1 0 → 5 6; sayılı ifadeler | 12 | kapalı |
| 6 Noktalama | ? ! : ; ' " ( ) - ve noktalı cümleler | 10 | kapalı |
| 7 Akıcı yazma | Sık kelimeler, tek el kelimeleri, cümleler, kısa bilgi paragrafları | 14 | kapalı |

Her yeni tuş çifti kabaca: **yeni tuş** (tanıtım + kutulu) → **tekrar** (satır, yalnız harf kalıpları) → **kelime** (satır, gerçek
Türkçe kelimeler). Her 3–4 tuş çiftinde bir **oyun** bölümü. Toplam ~15 oyun bölümü: harf sıralarında (K1–3) Balon Vadisi,
kelime düzeyinde Canavar Saldırısı / Uçan Baloncuklar / Elma Bekçisi sırayla; dördü de akışta en az iki kez yer alır.

### 5.3 İçerik kuralları

- Metinler **sabit veri** (`js/games/on-parmak-icerik.js`, `window.ON_PARMAK_ICERIK`); her açılışta aynı. Rastgelelik yok.
- Her bölüm yalnız **o ana kadar öğrenilmiş** tuşları kullanır (kısım sırası + bölüm sırası boyunca birikimli küme).
- Kelimeler gerçek Türkçe kelimeler, çocuğa uygun; özel adlar yalnız Kısım 4'ten sonra. Q, W, X Türkçe alfabede yok: yalnız
  kendi tanıtım/tekrar bölümlerinde harf kalıbı olarak geçer, kelime ve cümle metinlerinde kullanılmaz.
- Uzunluk: kutulu 21–35 karakter; satır K1–3 50–80, K4–6 60–120, K7 150–250 karakter.
- **Süre bütçesi:** her bölüm, kısmın hız hedefinde hatasız yazılırsa **≤ 2 dakika** sürer.

### 5.4 Veri şeması

```js
window.ON_PARMAK_ICERIK = [            // dizi uzunluğu = data/games.json levels (7)
  {
    ad: 'Orta sıra', ornek: 'F J D K', hedefHiz: 8, el: true,
    bolumler: [
      { tur: 'kutu',  ad: 'F ve J', yeni: ['f', 'j'], metin: 'ffjj fjfj …' },
      { tur: 'satir', ad: 'F J tekrar', metin: 'fff jjj fj jf …' },
      { tur: 'oyun',  ad: 'Balon Vadisi: F J D K', oyun: 'balon', metin: 'fjdkdkfj…' },
      // kelime oyunlarında metin boşlukla ayrılmış kelime listesidir
    ],
  },
  …
];
```

Genel bölüm numarası (seçicideki 1–~100) dizinin sırasından türer; elle yazılmaz. K7'de bölüm başına `hedefHiz` geçersiz kılınabilir.

## 6. Mini oyunlar

### 6.1 Ortak arayüz

Her oyun ayrı dosyada `window.OnParmakOyunlari[ad] = { baslat(alan, { metin, el }, { tus(dogruMu), bitti(sonuc) }), durdur() }`.
`sonuc = { canliBitti: bool }`; doğruluk/hız sayımını ana modül `tus()` çağrılarından yapar. Ana modül oyunun türünü bilmez.

- Çizim DOM + CSS (`transform`, `requestAnimationFrame`); kanvas yok. Görseller kendi SVG'miz (TypingClub ninjası/yetisi yok).
- **Uyarlanır hız:** yavaş başlar; her başarılı öğede hız biraz artar, can kaybında azalır (alt/üst sınırlı).
- **Sekme gizlenince** (`visibilitychange`) oyun durur; görünür olunca "Devam etmek için bir tuşa bas".
- `prefers-reduced-motion`: sallanma/sarsıntı yok, temel hız düşük.
- `durdur()` bütün `requestAnimationFrame`/zamanlayıcıları iptal eder, DOM'u boşaltır; hub'a dönüşte sızıntı olmaz.
- Çok hedefli oyunlarda (baloncuk, elma) **ilk harf** hedefi seçer: o harfle başlayan, tehlikeye en yakın hedef kilitlenir;
  kelime bitene kadar kilit sürer; kilitliyken yanlış harf = hata. Eşleşen hedef yoksa basış hata sayılır.

### 6.2 Oyunlar

| Oyun | İçerik | İşleyiş | Bitiş |
|---|---|---|---|
| **Balon Vadisi** | harf | Sağdan üzerinde harf yazan balonlar gelir; doğru harf → karakterimiz o balona atlar. Tutunduğu balon yavaşça alçalır; suya değerse can gider, karakter sıradaki balondan devam eder. Yanlış tuşta balon sallanır. | Metin biter (kazandı) ya da 3 can biter |
| **Canavar Saldırısı** | kelime | Kelime üstte kutularda; sevimli canavar sağdan yaklaşır. Her bitirilen kelimede karakter **kar topu** atar, canavar geri seker, can çubuğu azalır. Canavar karaktere ulaşırsa can gider, canavar geri çekilir. | Can çubuğu biter (= kelimeler biter) ya da 3 can biter |
| **Uçan Baloncuklar** | kelime | İçinde kelime olan 2–4 baloncuk aşağıdan yukarı süzülür; ilk harf hedefi seçer, kelime bitince baloncuk patlar. | Kelimeler biter ya da tepeye 3 baloncuk kaçar |
| **Elma Bekçisi** | kelime | Ortada ağaç ve 5 elma; iki yandan kelime etiketli sincaplar yaklaşır; ilk harf sincabı seçer, kelime bitince sincap kaçar. Ağaca ulaşan sincap bir elma alır. | Kelimeler biter ya da 5 elma biter |

Şiddet içermez: vurma yok, kar topu/kaçma/patlama var.

## 7. Mimari ve dosyalar

| Dosya | Görevi |
|---|---|
| `js/games/klavye-dizilim.js` (yeni, ortak) | `window.KlavyeDizilim` (DOM'suz, saf): Türkçe Q satırları (taban/Shift karakteri, büyük-küçük harf: `I`↔`ı`, `İ`↔`i`), parmak haritası (§5.1), `tusOf(ch).shift` + `shiftTusuOf(ch)` (Shift gereken karakterde karşı elin Shift tuşu), `parmaklarOf`, `elOf`, `yazilabilir`. **Fiziksel tuş = konum:** `karakterOf(e)` — `e.code` haritada varsa karakter yalnız koddan türer (harfte büyük/küçük = `shiftKey` XOR Caps Lock; diğerlerinde `shiftKey ? ust : alt`), böylece İngilizce dizilimli PC'de de doğru tuş sayılır (`KeyI`→ı, `Quote`→i, `Comma`→ö …) ve Windows TR Q'daki ölü tuş `^` (`e.key` `'Dead'`) de doğru çıkar; `e.key` yalnız `e.code` boşken (bazı sanal klavyeler) kullanılır; `e.code` dolu ama haritada yoksa (Numpad, F tuşları) ya da pasif `< >` tuşuysa (`IntlBackslash`) `null` → basış yok sayılır ve sayılmaz. Klavye Kâşifi `ROWS`/`CODE_MAP` sabitlerini `KlavyeDizilim.kasifi` görünümünden alır; Kâşifi kendi `SHIFT_OF`/`TYPEABLE`/`resolveKey` kalıbını korur, davranışı değişmez (`test:klavye` yeşil). |
| `js/games/on-parmak-olcum.js` (yeni, saf) | Doğruluk, hız (kelime/dk), bölüm ve kısım yıldızı fonksiyonları (§4); DOM'suz, Node'da (`vm`) test edilir. |
| `js/games/on-parmak-icerik.js` | §5.4 verisi |
| `js/games/on-parmak-ekran.js` | `window.OnParmakEkran`: ekran klavyesi + el SVG'si; `vurgula(karakter)`, `bas(karakter, dogruMu)`, `goster({ el, klavye })` |
| `js/games/on-parmak-balon.js` · `-canavar.js` · `-baloncuk.js` · `-elma.js` | §6 oyunları |
| `js/games/on-parmak.js` | `OnParmak` modülü (`id`, `levels` = içerik, `init`, `destroy`): seçici, kutulu/satır motoru, ölçüm, sonuç şeridi, %80 tekrarı, kısım geçişi |
| `css/on-parmak.css` | Yalnız `var(--…)` token'ları (B1); oyun sahnelerinin kendi renkleri bu dosyada |
| `assets/images/hub/on-parmak.svg` | 128×128, `rx=28` gradyan zemin, v2 sahne dili (emoji yok) |
| `data/games.json` | Kayıt: `section: harf`, `cat: Klavye`, `subject: kodlama`¹, `age: [6,12]`, `levels: 7`, `files.js` sırası: dizilim → içerik → ekran → 4 oyun → modül |

¹ `tools/build-catalog.js SUBJECTS` bir "bilişim" değeri içermez; bilişim öğretmeni öğretmen görünümünde oyunu **Kodlama** ders
çipinde bulur. (Klavye Kâşifi harf tanıma olduğu için `turkce`'de kalır.)

Ayrıca: `eslint.config.js gameModuleGlobals`'a `OnParmak`; `js/i18n.js TR.instructions['on-parmak']`; Klavye Kâşifi kaydının
`files.js` listesine `klavye-dizilim.js` (ilk sıraya); `npm run catalog`; `python seo/build_seo.py`; `CLAUDE.md` ve `README.md`
sözleşme satırları.

**Dinleyiciler:** `document` `keydown` tek dinleyici, `e.repeat` yok sayılır, `destroy`'da kaldırılır. Zamanlayıcılar dizide
izlenir, `destroy`'da temizlenir (hub modül sözleşmesi).

## 8. Erişilebilirlik ve dayanıklılık

- Bölüm sonucu ve kısım geçişi kalıcı bir `aria-live="polite"` bölgesine yazılır; seçici kartları gerçek `button`.
- Renk tek başına bilgi taşımaz: doğru kutuda ✓, yanlış kutuda basılan karakter görünür.
- Odak: seçici sonrası odak oyun alanında; Tab ile araç çubuğuna çıkılabilir, yazma odağı kaybolursa tıklama/tuş geri getirir.
- `prefers-reduced-motion`: nabız/sallanma yerine durağan vurgu.
- Hata yolu: içerik/oyun dosyası yüklenmezse `resolveModule()` yalnız bu kartı düşürür (mevcut davranış).

## 9. Testler

- **İçerik (tarayıcısız, `tests/on-parmak.spec.js` içinde ya da `tests/on-parmak-icerik.mjs`):** her karakter Q'da yazılabilir ·
  her bölüm yalnız öğrenilmiş tuşları kullanır · kısım sayısı = `games.json levels` · bölüm sayısı 90–110 · dört oyun türü en
  az ikişer kez · süre bütçesi (her bölüm hedef hızda ≤ 2 dk) · uzunluk sınırları · kutulu bölümün `yeni` tuşları metinde geçer.
- **Tarayıcı (Playwright):** seçici → doğru motor seviyesi (`GameEngine.getCurrentLevel()`) ve doğru bölüm · tanıtım yalnız
  doğru tuşla geçer · kutulu motor hatada bekler, ✓ yalnız ilk basışta doğruysa · satır motoru hatayı işaretleyip ilerler, canlı
  hız/doğruluk görünür · doğruluk < %80 → aynı bölüm yeniden · sonuç şeridi kendiliğinden ve Enter'la geçer · kısım sonu katman
  açmadan sonraki kısım · son kısımda kutlama katmanı · Caps Lock uyarısı · İngilizce dizilim eşlemesi (`KeyI`→ı, `Quote`→i,
  `Semicolon`→ş, `BracketLeft`→ğ, `BracketRight`→ü, `Comma`→ö, `Period`→ç, `Slash`→.) · dört oyun açılır, kazanılır ve canla
  biter (`page.clock`) · hub'a dönüşte `keydown` dinleyicisi ve rAF kalmaz.
- **Gerileme:** `npm run test:klavye` (ortak dizilim dosyasından sonra), `npm run test:smoke` (yeni slug JSON'dan otomatik).
- `package.json` → `test:on-parmak`; `.github/workflows/ci.yml`'e eklenir.

## 10. Uygulama bölünmesi (3 PR, `blueprint` planı)

1. **PR1 — Çekirdek:** `klavye-dizilim.js` + Kâşifi geçişi, `on-parmak-ekran.js` (klavye + el), `on-parmak.js` (seçici,
   kutulu/satır motoru, ölçüm, sonuç şeridi, %80 tekrarı, kısım geçişi), Kısım 1 içeriği (oyun bölümleri henüz yok; PR2
   ekler), kayıt `active: false`, testler.
2. **PR2 — Mini oyunlar:** dört oyun dosyası + ortak arayüz + Kısım 1'e oyun bölümleri + oyun testleri.
3. **PR3 — İçerik ve yayın:** Kısım 2–7, hub ikonu, SEO üretimi, `active: true`, CLAUDE.md/README.

Her PR: dal → PR → Vercel önizleme → kabul geçidi (doğrulama komutları, gerçeklik denetimi, ekran görüntüsü kanıtı,
`security-ai-generated-code-auditor`, kod incelemesi) → CI yeşil → merge. Arayüz işinde `impeccable`, hareket/geçişlerde
`emil-design-eng` uygulanır.

## 11. Riskler ve açık noktalar

- **El çizimi:** iyi görünen, parmakları ayrı yanabilen iki el SVG'si en çok el emeği isteyen görsel parça; PR1'de önce
  kaba sürümle akış kurulur, `impeccable` cilası aynı PR içinde.
- **İçerik yazımı:** ~100 bölümün Türkçe metni; "yalnız öğrenilmiş tuşlar" kuralı erken kısımlarda kelime havuzunu daraltır
  (K1'in ünlüleri yalnız a ve i: "kaşık" yazılamaz, "aşk", "dal", "şal", "fil", "sil" yazılır). İçerik testi kuralı kilitler;
  kelime bulunamayan yerde harf kalıbı kullanılır.
- **Kâşifi geçişi:** ortak dosyaya taşıma Kâşifi'yi bozmamalı; PR1'de ilk iş bu taşıma + `test:klavye`.
- **Satır sonu:** depo `core.autocrlf=true` ile klonlandı; yeni dosyalar mevcut dosyalarla aynı satır sonuyla commit edilir.
