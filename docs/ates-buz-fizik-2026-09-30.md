# Ateş & Buz — fizik/veri hataları: kök neden raporu (30 Eyl 2026)

**Şikâyet:** karakter sıkışıp düşüyor · bulmacaların ana parçaları kayboluyor · zıplarken karakterler geçmemesi gereken
duvarlardan geçip orada sıkışıyor. **Durum:** oyun hub'da `active: false` (PR #48); dosyalar depoda. Düzeltme dalı
`fix/ates-buz-fizik`. Yeniden açma kararı sahibinde (**öneri: önce iki cihazda insan testi** — burada gerçek zamanlı oynanamıyor).

## Yöntem (tahmin değil, ölçüm)

Oyunun gerçek modülleri sahte DOM'da yüklendi, `game.js` döngüsünün fizik sırası birebir yinelendi; deterministik girdilerle
(rastgele / duvara yaslan + zıpla / sık yön + zıplama spam / kapı-rampa zorlaması) 10 seviye oynatıldı ve **değişmezler**
ölçüldü. Test `tests/ates-buz-fizik.mjs` (Node) + `tests/ates-buz-veri.spec.js` (tarayıcı), `npm run test:ates-buz`.
Bağımsız üç inceleme (gerçeklik denetçisi, kod inceleyici, güvenlik) bulgularıyla iki tur sıkılaştırıldı (aşağıda "İnceleme
bulguları").

## Kök nedenler

| # | Belirti | Kök neden (ölçüm) | Düzeltme |
|---|---|---|---|
| 1 | **Sıkışıp blokun İÇİNDEN düşme** | Kayma hilesi (3 × `x--`) ile yürüme (`+3`) birbirini **sıfırlıyor**. Orijinal oyun 2.0 hızla yazılmıştı (net −1); Bilnet'in hız artışı (3.0) bunu bozdu: hız 2.0'da gömülme **0**, 2.4'te başlıyor, 3.0'da en kötü. | `sliding` bayrağı açıkken **ve oyuncu bir KARE bloğa yaslıyken** bloğa doğru yürüme o kare iptal. (İlk sürüm her kaymada iptal ediyordu; eğim ucuna düşerken inişi bozduğu için daraltıldı.) |
| 2 | **Zıplarken duvardan geçme** | Yatay itme yönü **hız işaretine** bakıyor: bloktan uzağa yürüyen oyuncu bloğun öbür yüzüne ışınlanıyor (dikey rampa kapısında +51 px, geniş yatay rampada +69…+136 px, eğim hücrelerinde 65–72 px). Hız = 0 iken hiç itilmiyor → gömülü kalıyor. | İtme yönü **en az bindirmeyle** (kare/rampa/küp, üçgen kafa-çarpışması, küp, top); yatay bindirme dikeyden büyükse dikey çözüme bırak |
| 3 | **Rampanın altına/üstüne ışınlanma** | Dikey çözüm "tavan/iniş" dalları derinliğe bakmıyor: dikey rampa kapısına 3 px bitişik zıplayan oyuncu "tavan" sanılıp kapının ALTINA 78 px, yürüyen oyuncu kapının ÜSTÜNE 99 px ışınlanıyor. Ölçüm: gerçek düzeltmeler <8 px, hatalılar ≥24 px. | İniş ≤16 px, tavan ≤12 px (küp/top 30/12) |
| 4 | **Eğimin yanından yüzeye ışınlanma** | `triangleChangePosition` ayakları yüzeye tek karede çekiyor; 20–58 px'lik çekmelerin **tamamı düşerken** oluyor (1,5 M karede 102 olay): oyuncu eğimin dik yanına/hücrenin altına girip yüzeye "tırmanarak geçiyor". | Çekme ≤ hücre yüksekliği (36 px); fazlası → girdiği yüzden yatay it |
| 5 | **Parça (top/küp) yer değiştiriyor / görselin altında kalıyor** | Seviye 5'te 1, seviye 6'da 2 top **katı bloğun içinde doğuyor**: ilk 2 karede zemin görselinin ALTINDA gizli kalıp (görsel parçaların üstüne çizilir) duvarın altına ışınlanıyor (seviye 6 topu yazarın yerinden 59 px aşağıda yerleşiyor). Top +136 px, küp oyuncuyu ~100 px atlıyor. **Not:** başka bir "kaybolma" yolu (ör. havuza düşen küpün başa dönmesi, tasarım gereği) ölçümde hata çıkarmadı; sahada sürerse oyun-içi anı (seviye, parça, ne yapılıyordu) gerekir. | Başlangıç konumları düzeltildi + küp/top korumaları |
| 6 | **Seviye 1 görsel ↔ çarpışma tutarsızlığı** | `level1` dizisinde **59 hücre görselde katı, çarpışmada BOŞ**; 19'u açık alana komşu. **Oyuncunun bunlara girdiği ölçülemedi**: eski kodda 72 bin karelik rastgele oyunda ≥12 px girilen hücre yok (54'ü tamamen kapalı). Yine de görselle uyumsuzdu; düzeltme zararsız (erişilebilir durum kümesi eski↔yeni aynı). Seviye 2–10 görselle birebir. | `level1` görselden türetilerek yeniden yazıldı; görsel↔ızgara testi |
| 7 | Kalıcı takılma (bilinmeyen durumlar) | Hiçbir çözücü uygulanamayan sıkıştırma kalıcı | `checkStuck()` bekçisi: gövde ≥8 px gömülü 30 kare → son serbest konum |

## Ölçüm özeti (aynı girdilerle master ↔ yeni)

- **Varsayılan test** (360 bin kare): en uzun gömülü seri **80 → 0 kare**, bloğun içinden "batıp" geçme **57 → 0**, tünelleme **2 → 0**,
  tek karede >40 px ışınlanma **28 → 0**. **Geniş tarama** (`SEEDS=10 FRAMES=6000`, 1,8 M kare): batma **279 → 8**, tünelleme
  **4 → 0**, ışınlanma **129 → 0**, en uzun gömülü seri **80 → 8 kare**.
- **Test kalitesi:** 19 denetimden eski kodda **14'ü kırmızı** (S5 yeni bekçiyi sınadığı için eski kodda kendiliğinden kırmızıdır).
  Her koruma **mutasyonla** sınandı (iniş/tavan sınırı, küp/top yüz seçimi, üçgen yüz seçimi, eğim çekme sınırı): her biri ilgili
  denetimi kırmızı yapıyor.
- **Normal oyun:** eğim inişi karşılaştırması (29 587 deneme, eğime düşerek yaklaşma): eski-başarılı/yeni-başarısız **42**,
  yeni-başarılı/eski-başarısız **235**. Rastgele girdilerle eski↔yeni: koşuların yarıya yakını 4000 kare boyunca bit-bit aynı;
  ilk sapmaların çoğu eski kodun hatalı durumunda ya da kayma bağlamında.

## İnceleme bulguları (dürüst kayıt)

- Gerçeklik denetçisi ilk turda **"NEEDS WORK"** verdi: geniş tohumda test yeşil değildi, bekçi eşiği testi maskeliyordu, "11/14 eski
  kırmızı" iddiam şişikti (2'si eski kodda alan yokluğundan yapaydı), eğimde yürüme iptali normal oyunda tırmanışı bozuyordu, seviye 1
  iddiam ölçülmemişti. Hepsi işlendi: bütçeler kare sayısına ölçeklendi, hız sabiti `game.js`'ten okunuyor, iptal daraltıldı, eğim çekme
  sınırı ve üçgen yüz seçimi eklendi, S6–S10 senaryoları eklendi, seviye 1 iddiası yumuşatıldı.
- Kod inceleyici: kayma iptali eğim ucuna yukarıdan düşüşü bozuyordu (eski-başarılı/yeni-başarısız 379) → daraltılarak **42**'ye indi.
- Güvenlik denetimi: bulgu yok (geçici klasör yalnız kendi `mkdtemp` dizinini siler; yeni ağ/secret/`eval` yok).

## Bilinen ve bilerek dokunulmayanlar

- **Seviye 4, kol #0 rampası ara konumdayken** (612→504; yalnız kol çekilirken): bir eğim/blok köşesiyle ~16 px'lik dar aralık oluşur;
  gövde sığmaz, oyuncu ~0,5 sn takılır ve bekçi son serbest konuma alır (geniş taramada 1,8 M karede 9 kez). Rampaların oyuncuyu
  itmesi/taşıması özgün tasarımda yok; eğim tırmanışı tavan denetimi yapmıyor.
- Eğim kenarlarında 14–24 px'lik tek karelik sıçrama/titreme (üçgen dalları; özgün kodda, hız 2.0'da da var).
- İki oyuncu küpü ters yönlerde iterken küpün ~40 px sıçraması (nadir).
- **Davranış değişikliği (küçük):** eğime yukarıdan düşerken ~%0,14 oranında inişler artık yana itilerek başarısız oluyor (eskiden
  yüzeye ışınlanarak başarılıydı); bunun karşılığında 235 iniş düzeldi.
- Çevrimiçi tarafta (host otoriter, misafir 20 Hz girdi) gecikme kaynaklı görsel kayma kapsam dışı.
- Node 20 (CI) altında bu oturumda koşturulamadı (yalnız Node 24); test geçici paket + `{"type":"module"}` ile Node 20'de çalışacak
  biçimde yazıldı, CI ilk koşuda doğrular.
