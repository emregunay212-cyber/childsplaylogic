# Gerçeklik Kontrolü — bilnetoyun.com

Ajan: `testing-reality-checker` · Tarih: 15 Eylül 2026

**Yöntem:** Salt-okunur dosya incelemesi + git geçmişi (236 commit, dal `master`, çalışma ağacı temiz, son commit 2026-09-13). Canlı sunucu bulguları koordinatörün `curl` doğrulamasından; ekran görüntüsü/oyun-içi tur kaydı bu turda ALINMADI — o kanıt hâlâ eksik.

**Karar: NEEDS WORK.** Oyunlar teknik olarak yerinde, ama belgeler gerçeği anlatmıyor, iki kullanıcı yolu kırık ve deploy yanlış yapılandırmayla çalışıyor.

## Hosting gerçeği: Vercel vs firebase.json

- Canlı site **Vercel**'den yayınlanıyor (`Server: Vercel`, gerçek 404). Repo bunu tek yerde söylüyor: `fabrika/DURUM.md:97` — "bilnetoyun.com (Vercel, push=otomatik) · childsplaylogic.web.app (Firebase, manuel)".
- `vercel.json` YOK; `.vercelignore` tek satır: `fabrika/`. Dolayısıyla **firebase.json'daki hiçbir kural canlıda geçerli değil**:
  - `firebase.json:6-16` ignore listesi → Vercel'de uygulanmıyor. Canlıda 200: `/server/ws-server.js`, `/database.rules.json`, `/_bank_tmp.txt`, `/EGITSEL-OYUN-PLANI.md`, `games/*/tools/*.py` (4), `games/bil-ve-fethet/CLAUDE.md`, `games/zindan-okcusu/GELISIM-PLANI.md`, `server.py`, `BASLAT-SERVER.bat`.
  - `firebase.json:18-27` güvenlik başlıkları → canlıda yok.
  - `firebase.json:30-33` 1 yıllık `immutable` cache → canlıda yok (bu yüzden ?v= kaymaları Vercel'de zararsız, Firebase yansısında zararlı).
  - `firebase.json:36-40` "her yol → index.html" → canlıda yok; kırık yollar gerçek 404.
- Belgelerle çelişki: `server.py:5` "canlıda Firebase Hosting kullanılır" — yanlış. `EGITSEL-*.md` hosting'den hiç söz etmiyor. `LEGO-WORLD-GAME-SPEC.md:8,11` "Vercel" diyor — tek doğru belge, o da Nisan tarihli.

## Doğrulandı

1. **games/ ↔ oyunlar/ ilişkisi:** kopya DEĞİL. `games/<id>/index.html` = iframe içinde çalışan gerçek oyun (27); `js/games/<id>.js` sarmalayıcıyla yüklenir (örn. `js/games/bilgi-ciftligi.js:15`). `oyunlar/<id>/index.html` = `seo/build_seo.py` ile üretilen SEO açılış sayfası (53); "Hemen Oyna" → `/?oyun=<id>` (`oyunlar/ates-buz/index.html:84`), hub çözer (`js/app.js:333-348`).
2. 27 `games/` klasörünün tamamı sarmalayıcıya ve hub kaydına sahip; 58 modülün hepsi tanımlı.
3. **Kırık statik referans yok:** index.html (76 yerel src/href), oyunlar/index.html, admin.html, 27 games/*/index.html — hepsi diske çözümleniyor.
4. **Çok oyunculu = Firebase RTDB**, WebSocket değil (`js/multiplayer.js:1,32-33,223`; `ws://` 0 sonuç). 11 online oyun (`js/app.js:278-290`).
5. PWA manifest sağlam (4 ikon + start_url mevcut); service worker yok.
6. Admin kapısı sunucu tarafında (`database.rules.json:6`); istemci kontrolü (`js/admin.js:11,183`) yalnız arayüz.
7. `oyunlar/index.html:36-88` 53 sayfaya bağlanıyor; sitemap 54 URL.

## Yanlış / tutarsız

1. **`EGITSEL-FAZ-DURUM.md:22` — Kelime Madeni 3D "✅ Canlıda"** → gerçekte kapalı: `js/app.js:26-27` `comingSoon: true` (2026-06-16, commit `91b3822`).
2. **Durum belgesi 2026-06-13'te donmuş** (`EGITSEL-FAZ-DURUM.md:10`); sonrasındaki 9 commit hiçbir belgede yok: Son Kart (`6352b27`), admin tüm oyunlar (`d9b2990`), Zindan füzyon 2.0 (`83c7823`), cevap-kosusu siyah ekran (`48fc00b`), labirent (`96a8573`, `f2646ea`), bilgi-yilani görseller (`bf33a58`, `9e41321`), IndexNow (`79423c3`).
3. "21 oyunluk seri canlıda" (`a17ab44`) → 4.16 Bilgi Zıplaması (`EGITSEL-OYUN-PLANI.md:540`) `8977765`'te kaldırıldı; kayıt yok. Canlıda plan oyunlarından **20** var.
4. Plan §6.2 "Firestore Şeması (mevcut altyapı)" (`EGITSEL-OYUN-PLANI.md:746`) → kodda Firestore yok, RTDB var (`js/bilnet-meta.js:5-9`). §6.3 Cloud Function skor doğrulama / rate limit → kod yok. §3.4-3.5 lig/turnuva → kod yok (belge "ertelendi" diyor, tutarlı).
5. **Definition of Done hiç işaretlenmemiş:** `EGITSEL-OYUN-PLANI.md:832-839` 8 kutu boş; repoda test sonucu, ekran görüntüsü, otomatik test yok — buna rağmen 20 oyun "✅". Kanıtsız onay.
6. "Açık" görünen iş aslında yapılmış: `EGITSEL-FAZ-DURUM.md:103` "[ ] Günlük jeton tavanı (50)" → `js/bilnet-meta.js:21` `DAILY_CAP = 50` mevcut.
7. `LEGO-WORLD-GAME-SPEC.md` (2026-04-01): Phaser/PixiJS + Firestore öngörüyor, 41 kutu boş; gerçek uygulama Three.js (`js/games/lego-world.js:2`). Spec ölü.
8. `llms.txt:9-44` (2026-04-13): "22 oyun, PWA desteği" → gerçek 46 solo + 11 online; PWA yalnız manifest.
9. `index.html:10,14,453` "20+ / 22+ oyun" — sitede 57 oynanabilir oyun var; kendi aleyhine eksik iddia.
10. `seo/build_seo.py:147` kelime-madeni-3d hâlâ listede; sitemap'ten elle çıkarıldı → bir sonraki çalıştırmada geri gelir. `build_seo.py:14` TODAY elle "2026-06-13".
11. `_bank_tmp.txt` geçici soru bankası; hiçbir dosya referans vermiyor; `22f4498` ile depoya girmiş, canlıda açık.
12. `EGITSEL-FAZ-DURUM.md:121-123` belge kendisi `22f4498`–`ccd4196` commitlerinin karışık iş içerdiğini itiraf ediyor.
13. **Cache-bust (?v=) kaymaları** — dosya değişmiş, etiket artırılmamış: `js/i18n.js` (`index.html:374` v=7 ↔ `admin.html:84` v=5; dosya 13 ve 17 Haz'da değişti); `css/main.css?v=8`, `css/hub.css?v=3` (10 Haz) ↔ 13 Haz değişim; `js/games/cevap-kosusu.js:15` v=1 ↔ 15 Haz düzeltme; `zindan-okcusu.js:28` v=7 ↔ 17 Haz; `kelimelik.js:19` v=3 ↔ 9 Haz; `games/ates-buz/js/collisions.js:2` v=3 ↔ `game.js:3` v=5 aynı modül → 88 KB modül İKİ kez yükleniyor. Etki: Vercel'de zararsız; `childsplaylogic.web.app` yansısında dönen ziyaretçi eski dosya alır.

## Kırık

1. **Hub'da eksik ikon (canlı 404):** `js/app.js:285` `zipla-topla-coop` → `js/app.js:648` `assets/images/hub/zipla-topla-coop.svg`; klasörde yalnız `zipla-topla.svg`. Kart çalışır, ikon kırık; `onerror` yok.
2. **Ölü uçlu açılış sayfası:** `oyunlar/kelime-madeni-3d/index.html:84` "Hemen Oyna" → `/?oyun=kelime-madeni-3d` → `js/app.js:751-754` sessizce döner. Sayfa `index, follow` ve `oyunlar/index.html:68`'den bağlı.
3. **Yetim oyunlar (SEO'suz):** `hava-hokeyi`, `son-kart`, `zipla-topla-coop` hub'da var ama `oyunlar/` sayfası, sitemap girdisi ve `build_seo.py` kaydı yok.
4. **Ölü sunucu kodu:** `server/ws-server.js` hiçbir istemci tarafından çağrılmıyor; deploy yapılandırması yok — kullanılmayan ama canlıda açık kod.
5. `firebase.json:14-16` var olmayan dosyaları hariç tutuyor (`index-3d.html`, `lib/`, `assets3d/` hiç commit edilmemiş) → kural boşa.
6. Güvenlik (kırık değil, açık): `database.rules.json:46-57` `lobbies`/`players` herkese okuma+yazma; rules dosyası canlıda okunabiliyor.

## Oyun envanteri (56 kimlik; hub'da 47 solo [1 kapalı] + 11 online)

| id | games/ | oyunlar/ | hub | sitemap | lock-catalog |
|---|---|---|---|---|---|
| altin-avi | — | ✓ | online | ✓ | ✓ |
| ates-buz | ✓ | ✓ | online | ✓ | ✓ |
| bil-ve-fethet | ✓ | ✓ | solo | ✓ | ✓ |
| bilgi-ciftligi | ✓ | ✓ | solo | ✓ | ✓ |
| bilgi-kulesi | ✓ | ✓ | solo | ✓ | ✓ |
| bilgi-madencisi | ✓ | ✓ | solo | ✓ | ✓ |
| bilgi-savunmasi | ✓ | ✓ | solo | ✓ | ✓ |
| bilgi-takimi | ✓ | ✓ | solo | ✓ | ✓ |
| bilgi-yilani | ✓ | ✓ | solo | ✓ | ✓ |
| bilim-dedektifi | ✓ | ✓ | solo | ✓ | ✓ |
| boyama | — | ✓ | solo | ✓ | ✓ |
| buz-kulesi | — | ✓ | solo | ✓ | ✓ |
| cevap-kosusu | ✓ | ✓ | solo | ✓ | ✓ |
| desen | — | ✓ | solo | ✓ | ✓ |
| egim | — | ✓ | solo | ✓ | ✓ |
| emoji-yapici | — | ✓ | solo | ✓ | ✓ |
| eslestirme-ustasi | ✓ | ✓ | solo | ✓ | ✓ |
| fizik-firlatma | ✓ | ✓ | solo | ✓ | ✓ |
| gunluk-kelime | ✓ | ✓ | solo | ✓ | ✓ |
| hafiza-kartlari | — | ✓ | solo | ✓ | ✓ |
| harf-tahmin | — | ✓ | online | ✓ | ✓ |
| harf-tanima | — | ✓ | solo | ✓ | ✓ |
| **hava-hokeyi** | ✓ | **—** | online | **—** | ✓ |
| hece-birlestirme | — | ✓ | solo | ✓ | ✓ |
| jigsaw | — | ✓ | solo | ✓ | ✓ |
| kelime-balonu | ✓ | ✓ | solo | ✓ | ✓ |
| kelime-canavarlari | ✓ | ✓ | solo | ✓ | ✓ |
| kelime-kurtarma | ✓ | ✓ | solo | ✓ | ✓ |
| **kelime-madeni-3d** | ✓ | ✓ | **KAPALI (Yakında)** | **—** | ✓ |
| kelime-tahmin | — | ✓ | online | ✓ | ✓ |
| kelimelik | ✓ | ✓ | online | ✓ | ✓ |
| kesir-2048 | ✓ | ✓ | solo | ✓ | ✓ |
| kod-macerasi | — | ✓ | solo+online | ✓ | ✓ |
| labirent-avcisi | ✓ | ✓ | solo | ✓ | ✓ |
| lego-macerasi | — | ✓ | solo | ✓ | ✓ |
| lego-world | — | ✓ | solo | ✓ | ✓ |
| matematik | — | ✓ | solo | ✓ | ✓ |
| matematik-kafe | ✓ | ✓ | solo | ✓ | ✓ |
| matematik-patlatma | ✓ | ✓ | solo | ✓ | ✓ |
| penalti | — | ✓ | solo | ✓ | ✓ |
| penalti-mp | — | ✓ | online | ✓ | ✓ |
| renk-eslestirme | — | ✓ | solo | ✓ | ✓ |
| ritim-sorulari | ✓ | ✓ | solo | ✓ | ✓ |
| satranc | — | ✓ | solo+online | ✓ | ✓ |
| sayi-ninja | ✓ | ✓ | solo | ✓ | ✓ |
| sayi-sayma | — | ✓ | solo | ✓ | ✓ |
| sayilarla-boyama | — | ✓ | solo | ✓ | ✓ |
| sekil-bulmaca | — | ✓ | solo | ✓ | ✓ |
| siralama | — | ✓ | solo | ✓ | ✓ |
| **son-kart** | ✓ | **—** | online | **—** | ✓ |
| space-waves | — | ✓ | solo | ✓ | ✓ |
| tetris | — | ✓ | solo | ✓ | ✓ |
| tuval | — | ✓ | solo | ✓ | ✓ |
| zindan-okcusu | ✓ | ✓ | solo | ✓ | ✓ |
| zipla-topla | — | ✓ | solo | ✓ | ✓ |
| **zipla-topla-coop** | — | **—** | online | **—** | ✓ |

"games/ —" olanlar hub içinde doğrudan çalışan `js/games/<id>.js` oyunlarıdır (iframe yok). Oynanabilir toplam: **46 solo + 11 online = 57**; kapalı: 1.

## Deploy'da kırık / riskli

1. `zipla-topla-coop.svg` → her hub açılışında 404 (canlıda doğrulandı).
2. `/oyunlar/kelime-madeni-3d/` → Google'a açık, tıklanınca oyun açılmayan sayfa.
3. `server/`, `*.md`, `*.py`, `database.rules.json`, `_bank_tmp.txt`, `.bat` → Vercel'de herkese açık.
4. Güvenlik başlıkları ve cache politikası yalnız firebase.json'da → `vercel.json` yazılmadan çalışmaz.
5. `seo/build_seo.py` yeniden çalıştırılırsa kelime-madeni-3d sitemap'e döner; hava-hokeyi/son-kart yine üretilmez.
6. Firebase yansısı (`childsplaylogic.web.app`) kullanılıyorsa ?v= kaymaları nedeniyle 5 dosya eski sürümde kalabilir.

**Sertifika yok.** Sonraki tur için gereken kanıt: 57 oyunun her biri için mobil (360px) + masaüstü ekran görüntüsü, 11 online oyunda iki-cihazlı lobi turu, `vercel.json` sonrası canlı `curl` çıktıları, iki EGITSEL belgesinin git geçmişiyle eşitlenmesi.
