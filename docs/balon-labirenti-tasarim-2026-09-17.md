# Balon Labirenti — tasarım ve uygulama belgesi (17 Eylül 2026)

Kaynak esin: plays.org "Pop the Balloons" (Construct 3, üçüncü taraf). **Kod ve varlık kopyalanmadı**; mekanik
gözlemlenip sıfırdan yazıldı. Karar sahibi: Emre (17 Eyl): ad **Balon Labirenti** (`balon-labirenti` /
`BalonLabirenti`), 6 bölüm × 5 labirent, üç mekanik (duvar · hareketli platform · sıcak hava), saf fizik +
açı/kuvvet sayısal göstergesi. Plan: `~/.claude/plans/…declarative-piglet.md` (bu belge deponun içindeki kopyası
ve ilerleme kaydıdır).

## 1. Kim, ne öğrenir

- Yaş 7-12 (raflar: 1-2., 3-4., 5-6. sınıf). Ders **Fen / Fizik**; kazanım: açı ve kuvvet tahmini, yansıma
  (geliş açısı = gidiş açısı sezgisi), neden-sonuç planlama, tek denemede sonuç öngörme.
- Oyun içi sayısal okuma "açı 42° · kuvvet 70": çocuk her atışta iki değişkeni **görür**; deneme-yanılma bilinçli
  ayara dönüşür (Fizik Fırlatma ile aynı pedagoji).

## 2. Döngü (tur)

Nişan (çek-bırak ya da klavye) → tek atış → top sekerek balonları patlatır → hepsi patladıysa "Temiz!" ve
900 ms sonra sonraki labirent; kalan varsa "Iskaladın, tekrar dene" ve aynı labirent 700 ms sonra sıfırlanır.
İki ıskadan sonra çözüm yolunun ilk 0,5 s'si hayalet yay olarak belirir (4 ıskada 1,2 s). Beş labirent
temizlenince bölüm biter; yıldız bölümdeki ıska sayısından: 0-1 → 3, 2-4 → 2, 5+ → 1.

## 3. Seviyeler

Hub seviyesi = bölüm (5 labirent). Bölümler: 1 Kova (düşür) · 2 Sekme (yansıma) · 3 Baca (yönlendirme) ·
4 Kapı (hareketli platform, zamanlama) · 5 Rüzgâr (sıcak hava) · 6 Fırtına (hepsi). Her labirent
`js/games/balon-labirenti-levels.js` içinde `cozum {aci, kuvvet}` taşır; `npm run test:balon` her çözümün 3×3
toleransla (açı ±1°, kuvvet ±2) temizlediğini kanıtlar. Hareketli platform nişan alırken faz 0'da durur, atışla
başlar (çözüm bırakma anına bağlı değil).

## 4. Fizik sözleşmesi

`js/games/balon-labirenti-fizik.js` — DOM'suz, deterministik (yalnız + − × ÷ √; sin/cos yalnız atış dönüşümünde).
800×500 mantıksal kanvas; sabit adım 1/120 s × 2 alt adım; daire–AABB en yakın nokta çözümü; yapışma hızı altında
yuvarlanma; sonuçlar `temiz | dustu | durdu | zaman`. Sabitler ve gerekçeleri plan dosyasında.

## 5. Girdi ve erişilebilirlik

Pointer çekişi (`setPointerCapture`, `touch-action: none`), klavye nişanı (Sol/Sağ açı, Yukarı/Aşağı kuvvet,
Enter/Boşluk ateş, R yeniden), kanvas `tabindex=0` + `aria-label`, `role=status aria-live=polite` duyuru,
`prefers-reduced-motion` dalı (sarsıntı yok, parçacık yarı, salınım yok).

## 6. Görsel dünya — impeccable yön sözleşmesi (geliştirme belgesi; koda kopyalanmaz)

**THESIS:** Tek atış, bütün labirent: çocuk topu değil *yolu* fırlatır.
**MODE:** Operate (görev: nişan al, bırak) — ifade ayrıntıda, akış merkezde.
**WORLD:** Hub'ın kurulu dünyası: gök gradyanı (`--gok-ust/--gok-alt`), Fredoka HUD hapları beyaz cam üstünde
`--murekkep`; oyunun kendi vurgusu mürekkep-mavi kalın duvarlar (`--bl-duvar #4F6272`, üst kenar `#7D93A6`),
beş renk parlak balon, koyu dikenli top (`--bl-top #2B3644`), sıcak hava yarı saydam turuncu.
**FIRST VIEWPORT:** Tek ekran, kaydırma yok: sol altta fırlatma halkası + top, sağda labirent; üstte
"Bölüm 1 · 1/5" ve "3 balon" hapları; nişan alınca alt ortada açı/kuvvet okuması.
**SIGNATURE:** Bırakınca lastik bandın geri çarpması, dönen dikenlerin kısa izi; balon patlayınca 350 ms
parça saçılımı ve düşen ip.
**RISK:** Dikey telefonda 90° döndürme (egim kalıbı) — HUD da döner; kabul edildi.

## 7. Dosyalar / entegrasyon (CLAUDE.md "Yeni oyun ekleme")

- [ ] `tests/balon-labirenti.spec.js` + `package.json` `test:balon` (önce kırmızı)
- [ ] `js/games/balon-labirenti-fizik.js` — saf fizik
- [ ] `tools/balon-labirenti-coz.js` — çözüm tarayıcı; `js/games/balon-labirenti-levels.js` bölüm 1
- [ ] `data/games.json` kaydı (`files.js` sırası fizik → levels → modül) · `eslint.config.js` globali · `npm run catalog` · `js/i18n.js` yönerge
- [ ] `js/games/balon-labirenti.js` — modül (nişan, uçuş, sonuç, klavye, duyuru, destroy) · `css/balon-labirenti.css`
- [ ] Hareketli platform + sıcak hava + hayalet ipucu · bölüm 2-6 labirentleri
- [ ] `css/games.css` dikey döndürme + tam ekran `.bl-wrap`
- [ ] `impeccable` geçişi · `emil-design-eng` geçişi (`design-taste-frontend` atlandı: açılış sayfası değil)
- [ ] `assets/images/hub/balon-labirenti.svg` · `python seo/build_seo.py` · README/CLAUDE.md sayıları
- [ ] Doğrulama: lint · catalog:check · test:balon · test:smoke (62) · build:check · seo testleri
- [ ] Kabul geçidi: reality-checker · evidence-collector (`docs/kanit/balon-labirenti-<tarih>/`) · güvenlik denetçisi · /code-review — bkz. §9
- [ ] PR → Vercel önizleme → CI yeşil → merge

## 8. Doğrulama kaydı

(uygulama sırasında doldurulur)

## 9. Kabul geçidi

| Ajan | Hüküm | Bulgu → yapılan |
|---|---|---|
| | | |
