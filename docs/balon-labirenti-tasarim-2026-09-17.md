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

- [x] `tests/balon-labirenti.spec.js` + `package.json` `test:balon` (önce kırmızı: dosyalar yokken ENOENT ile düştü)
- [x] `js/games/balon-labirenti-fizik.js` — saf fizik (sabitler + gerekçe dosya başında)
- [x] `tools/balon-labirenti-coz.js` — çözüm tarayıcı (`--check`, `--yaz`, `--ascii`, orta-kuvvet tercihi); `js/games/balon-labirenti-levels.js` 30 labirent
- [x] `data/games.json` kaydı (`files.js` sırası fizik → levels → modül) · `eslint.config.js` globali · `npm run catalog` · `js/i18n.js` yönerge
- [x] `js/games/balon-labirenti.js` — modül (çekiş/klavye nişanı, HUD, okuma, tost, `aria-live`, hayalet ipucu, destroy temizliği, `?dev=1`) · `css/balon-labirenti.css`
- [x] Hareketli platform + sıcak hava çizimi/rayı · hayalet ipucu yayı · bölüm 2-6 labirentleri (tarayıcı 30/30 9/9)
- [x] `css/games.css` dikey döndürme + tam ekran `.bl-wrap`; yatay telefonda oran koruma (`flex: 0 0 auto`)
- [x] `impeccable` geçişi (hap metinleri doğal dil, glif yerine metin, sabit tip ölçeği, ilk labirent ipucu metni, odak halkası) ·
      `emil-design-eng` geçişi (tost çıkışı girişten hızlı, patlama halkası 150 ms, hover yalnız ince işaretçide) ·
      `design-taste-frontend` atlandı: açılış sayfası/portfolyo değil, oyun ekranı
- [x] `assets/images/hub/balon-labirenti.svg` · `python seo/build_seo.py` · README/CLAUDE.md sayıları · CI adımı
- [x] Doğrulama: lint 0 hata · catalog:check · test:balon 6/6 (Node sunucu + hash'li çıktı) · test:smoke 62/62 · build:check · seo 42/42
- [x] Kanıt: `docs/kanit/balon-labirenti-2026-09-17/` (17 görüntü + `olcumler.json` + README)
- [x] Kabul geçidi: reality-checker ✓ · güvenlik denetçisi ✓ · /code-review ✓ · evidence-collector (rapor bekleniyor) — bkz. §9
- [ ] PR → Vercel önizleme → CI yeşil → merge

## 8. Doğrulama kaydı (2026-09-17)

- **Fizik/seviye (tarayıcısız):** `npm run test:balon` test 1-3: 30 labirent × 9 varyant (açı ±1°, kuvvet ±2) hepsi temiz, çözüm ≤ 10 s;
  aynı atış iki kez → bit-bit aynı yol; tünelleme değişmezi (1400/240 = 5,8 px < 10 px); geometri kuralları (kenar payı, duvar içi balon yok,
  platform süpürmesi duvarla kesişmez, bölüm-mekanik kapıları). `node tools/balon-labirenti-coz.js --check` 30/30 OK.
- **Canlı (Playwright, Node statik sunucu):** kayıtlı çözüm çekişi → `data-atis` = cozum (±1°/±2), `temizlendi`, 2/5, skor {1,0};
  kasıtlı ıska ×2 → `kacirdi`, skor wrong 2, `data-ipucu=1`; klavye Sol/Sol/Yukarı → okuma "açı 48° · kuvvet 65", Enter → uçuş, duyuru;
  `#game-home` → wrap 0, `rafAktif false`; karttan yeniden → tek wrap, `rafAktif true`, pop sesi ≤ balon sayısı. Aynı 6 test
  `SITE_ROOT=.build-check` hash'li çıktıda geçti.
- **Elle (Claude Browser, localhost):** bölüm 1 baştan sona (1-1 çekişle, 1-5 çözümle) → kutlama penceresi 3 yıldız → Sonraki Seviye → bölüm 2;
  bölüm 4-1 platform rayı, bölüm 5-3 sıcak hava sahnesi; 375×812 dikey (döndürülmüş eşleme "açı 54° · kuvvet 82" beklenen 55/82) ve
  812×375 yatay (oran 1,60). Not: Claude Browser paneli sekme etkinleştirirken kanvasa hayalet sürüklemeler gönderdi (panel eseri;
  kanıt Playwright ile alındı) ve panel `prefers-reduced-motion` emüle ettiğinden iz/salınım panelde görünmez.
- **Bulunup kapatılanlar:** çekilen top kanvas dışına çıkıyordu → çizim kırpılır; Yeniden düğmesi sağ altta duvarı örtüyordu → HUD satırına;
  yatay telefonda `flex-shrink` sahneyi eziyordu → `flex: 0 0 auto` + yükseklik bütçesi; son balon habı 4,17:1 → zemin yeşili;
  Python `server.py` ile canlı testler kararsız → Node sunucu; ıska sonrası ipucu metni geri gelmiyordu → `okumaGuncelle(null)`.
- **Sayılar:** lint 0 hata (48 önceden var olan uyarı) · catalog:check OK · build:check OK · SEO title 60/60, desc 146/150, 42/42 ·
  smoke 62/62 · test:balon 6/6 · rAF 2 s'de 122 kare (headless) · Yeniden 90×52 · kontrastlar kanıt README §2.

## 9. Kabul geçidi (2026-09-17)

| Ajan | Hüküm | Bulgu → yapılan |
|---|---|---|
| **AI-Generated Code Security Auditor** | MERGE-READY (0 kritik/yüksek/orta, 1 düşük, 3 bilgi) | Düşük: `?dev=1` labirent atlama canlıda URL'den yıldız üretebilirdi → yalnız `localhost/127.0.0.1` ya da `localStorage bo_dev=1` ile açılır. Bilgi: `tools/balon-labirenti-coz.js` yayına çıkıyordu → `.vercelignore`; `--yaz` regex'inde id kaçışı eklendi. Bilgi (diff dışı): `seo/build_seo.py` JSON-LD `</` kaçışı — not edildi, dokunulmadı. |
| **Kod incelemesi** (`/code-review high`) | 3 bulgu, hepsi kapatıldı | İkinci parmak nişanı devralıyordu → `if (aim) return`; boş bölümde `console.error` sonrası TypeError → `init` erken döner; 12 px altı çekişte ipucu metni titriyordu → nişan/klavye aktifken ipucu gizli. |
| **Reality Checker** | APPROVED (8 iddiadan 8'i kanıtla; 2 dürüst çekince) | Çekince 1: `tests/balon-labirenti.spec.js` tek başına eslint'te `no-undef` (page.evaluate içindeki hub globalleri) — `tests/**` `npm run lint` kapsamında değil, `tests/smoke.spec.js` ile aynı sınıf, önceden var olan yapılandırma boşluğu (bu PR'da dokunulmadı). Çekince 2: kanıt görüntüleri cila commit'lerinden önceydi → 17:58'de son HEAD'de yeniden yakalandı. Nitler: `bolum !== Number(level)`, tost zamanlayıcısına `destroyed` koruması, `destroy`'da HUD referansları null, README modül sayısı 66. |
| **Evidence Collector** | (rapor bekleniyor) | |
