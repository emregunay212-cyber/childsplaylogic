# SEO / Teknik Web Denetimi — bilnetoyun.com

Ajan: `marketing-seo-specialist` · Tarih: 15 Eylül 2026 · Yöntem: repo + canlı HEAD istekleri (Server: Vercel)

**Skor kartı: 58 / 100 (tahmini)**

Özet: 53 adet `/oyunlar/<slug>/` açılış sayfası şablon olarak sağlam (benzersiz title/description/canonical/VideoGame şeması), sitemap dosyalarla birebir tutarlı ve canlı HTML repo ile aynı. Ancak ana sayfa JS'le kurulan, giriş kartıyla kapatılmış bir SPA: ilk HTML'de yalnız 11 oyun bağlantısı var, 82 senkron script + 45 CSS + Firebase/three.js `<head>`'de yükleniyor ve Vercel'de hiçbir varlık önbelleklenmiyor. Ayrıca 27 iframe oyun sayfası, dahili planlama dokümanları ve soru bankası indexlenebilir hâlde canlıda; çocuk sitesi için gizlilik/KVKK sayfası yok.

## Bulgular

| Öncelik | Bulgu | Kanıt | Etki | Düzeltme |
|---|---|---|---|---|
| **P0** | Ana sayfa ızgarası JS ile üretiliyor; kartlar `<div role="button">`, `href` yok. İlk HTML'de 13 `<a>`: 11'i `/oyunlar/…` (footer), 1'i `admin.html`. Giriş kartı (`#login-screen`) uygulamayı kapatıyor. | `js/app.js:567-580`, `index.html:203-232, 254, 450-464` | 53 oyunun 42'sine ana sayfadan link equity akmıyor; Googlebot render etse bile tıklanacak bağlantı yok. | Footer nav'ı 53 oyuna genişlet ya da kartları `<a href="/oyunlar/<slug>/">` yap; hub-grid'i `build_seo.py` ile statik üret. |
| **P0** | Render-blocking yük: `<head>`'de 45 stylesheet (249 KB), chess.js, 3 Firebase compat (31+166+139 KB), three.js r128 (~600 KB), GLTFLoader (unpkg), 5 Google Fonts ailesi; gövdede 82 `<script src>`, **0** `defer/async`; yerel JS 822 KB. | `index.html:127-181, 419-448` | LCP/TBT/INP mobilde kırmızı; CWV "iyi" eşiğini geçmez. | Oyun JS/CSS'ini oyun açılınca dinamik yükle; Firebase/three yalnız ihtiyaç duyan oyunda; `defer`; Fredoka+Nunito'yu self-host + `preload`, Cinzel/Bebas'ı hub'dan çıkar. |
| **P0** | Vercel'de önbellek yok: HTML, JS, SVG, PNG hepsi `Cache-Control: public, max-age=0, must-revalidate`. `firebase.json` immutable/güvenlik başlıkları (X-Frame-Options, X-Content-Type-Options) uygulanmıyor; `?v=N` şeması işlevsiz. | canlı HEAD: `/js/app.js?v=20`, `/favicon.svg`, `/og-image.png` | Tekrar ziyarette her varlık yeniden doğrulanıyor; CWV ve tarama maliyeti artıyor. | `vercel.json` → `headers`: `/js|css|assets/(.*)` için `max-age=31536000, immutable` + güvenlik başlıkları; `?v=` yerine dosya adı hash'i. |
| **P0** | Dahili dosyalar canlıda 200: `EGITSEL-OYUN-PLANI.md` (41 KB), `server.py`, `database.rules.json`, `seo/build_seo.py`, `_bank_tmp.txt` (soru bankası). `.vercelignore` yalnız `fabrika/`; `firebase.json` ignore listesi Vercel'de geçersiz. | canlı HEAD, `.vercelignore` | Bilgi ifşası (DB kural yapısı, cevap anahtarları); .md/.txt indexlenip "thin" içerik olarak siteye yazılır. | `.vercelignore`'a `*.md *.py *.bat server/ seo/ _bank_tmp.txt database.rules.json` ekle. |
| **P1** | 27 `games/*/index.html` iframe sayfası indexlenebilir: yalnız `<title>`; description/canonical/robots/og **0/27**. Canlı `/games/kelimelik/` → 200 (1.6 KB). | `games/kelimelik/index.html:5` | `/oyunlar/<slug>/` ile ikili içerik, zayıf sayfa indexlenmesi. | Her iframe sayfasına `<meta name="robots" content="noindex">` (veya `X-Robots-Tag`) ve `/oyunlar/<slug>/`'a canonical. |
| **P1** | Sondaki eğik çizgi: `/oyunlar/kelimelik`, `/oyunlar/kelimelik/`, `/oyunlar/kelimelik/index.html`, `/index.html` hepsi 200, aynı gövde. Sitemap, 53 iç link ve 53 canonical tutarlı `/` sonlu → risk sınırlı. | canlı HEAD | Tarama israfı; canonical'a bağımlılık. | `vercel.json`: `"trailingSlash": true, "cleanUrls": true` (308 yönlendirir). |
| **P1** | Ana sayfa title "Bilnet Oyun (Bilnet Oyun) - …" 72 kr., marka tekrarı; description 260 kr.; `keywords` meta gereksiz; aynı tekrar `<h2>`'de ve `alternateName`'de. | `index.html:8-9, 34, 42, 343-344` | SERP'te kesilir, CTR düşer, spam algısı. | Title: "Bilnet Oyun – 4-10 Yaş Çocuklar İçin Ücretsiz Eğitici Oyunlar" (60); description ≤155; `keywords`'ü sil. |
| **P1** | Oyun sayfaları: title >60 kr. **37/53**, description >160 kr. **53/53** (maks. 273). Şablon kaynaklı. | `seo/build_seo.py` `build_page()`; en uzun `oyunlar/bilgi-savunmasi` (77/255) | Her sayfa SERP'te kesiliyor. | Şablon: `{name} Oyna – Ücretsiz {cat} Oyunu \| Bilnet Oyun`; description = `short` + yaş, ≤150. |
| **P1** | Gizlilik/KVKK/iletişim sayfası yok. "Kişisel veri toplamaz" iddiası Google ile giriş + Firebase kayıt senkronuyla çelişiyor. | `ls *.html` → admin, index; `index.html:355`, `js/auth.js` | Çocuk sitesi için E-E-A-T/güven açığı; KVKK aydınlatma yükümlülüğü. | `/gizlilik/`, `/iletisim/`, `/hakkinda/` statik sayfalar; ifadeyi "yalnızca giriş yaparsan ilerlemen saklanır" olarak düzelt; footer'a link. |
| **P1** | Organization şeması `logo`, `sameAs`, `parentOrganization` içermiyor; hiçbir HTML'de Bilnet Okulları resmi sitesine bağlantı yok. | `index.html:60-64` | Marka/Knowledge Panel sinyali yok, okulun otoritesi devralınamıyor. | Ayrı `Organization` bloğu (logo: icon-512.png, sameAs: okul sitesi + sosyal), footer'da okul linki. |
| **P1** | `kelime-madeni-3d` kapalı (`comingSoon:true`), sitemap'ten elle çıkarılmış (commit 91b3822) ama `/oyunlar/kelime-madeni-3d/` canlı, hub'dan linkli, indexlenebilir; "Hemen Oyna" ölü uç. Generator `GAMES`'te durduğundan bir sonraki çalıştırmada sitemap'e geri girer. | `js/app.js:26-27`, `oyunlar/index.html:68` | Kullanıcı çıkmazı, soft-404 sinyali. | Sayfaya `noindex` + hub'dan kaldır; `GAMES`'e `active` alanı. |
| **P1** | Özel 404 yok: Vercel jenerik İngilizce "404: NOT_FOUND" (79 bayt), marka/link yok. | canlı `/bu-sayfa-yok-123` → 404 | Kayıp ziyaretçi; çocuk kitlesi için kötü UX. | Kök dizine Türkçe `404.html` (Vercel statik sitede otomatik servis eder). |
| **P2** | Sitemap: 54 URL, hepsinde `lastmod 2026-06-13` (elle sabit `TODAY`), `weekly`, 52×0.8 → sinyal değeri sıfır. | `seo/build_seo.py:14, 387-393` | Google lastmod'u yok sayar. | lastmod'u git/mtime'dan üret; changefreq/priority kaldır. |
| **P2** | Yapılandırılmış veri: FAQPage artık yalnız devlet/sağlık sitelerinde zengin sonuç verir → etkisiz; "Bilnet Oyun'te" yazım hatası (doğrusu "Oyun'da"). VideoGame: `name` "… - Bilnet Oyun" eki, `image` yok, `suggestedMinAge` 53 sayfada da 4 (sayfa "7-10 yaş" diyor), `BreadcrumbList` yok; hub'da (`oyunlar/index.html`) JSON-LD hiç yok. | `index.html:79-126, 121`; `oyunlar/kelimelik/index.html:26-56` | Zengin sonuç fırsatı kaçıyor, tutarsız veri. | Aşağıdaki örnek şema; hub'a `CollectionPage + ItemList`. |
| **P2** | og:image 55 sayfada aynı `og-image.png`; oysa 55 hub SVG ikonu mevcut. | `assets/images/hub/*.svg` | Sosyal paylaşımda ayrışma yok. | Build'de oyun başına 1200×630 PNG üret. |
| **P2** | `llms.txt` bayat: "22 oyun" (site 53), oyun URL'leri yok, Türkçe karakterler ASCII'ye kırılmış. | `llms.txt` | AI arama araçları eksik/yanlış envanter görür. | `build_seo.py` üretsin: 53 oyun + `/oyunlar/<slug>/` linkleri. |
| **P2** | `robots.txt` uygun; GPTBot/ClaudeBot/Google-Extended **açıkça izinli** — bilinçli tercih olmalı. `admin.html` `noindex` (admin.html:6) ve sitemap dışı → yeterli. Ana sayfa üst barında `href="admin.html"` herkese görünüyor. | `robots.txt`, `index.html:254` | Düşük. | Admin linkini yalnızca yetkili oturumda DOM'a ekle. |
| **P2** | `www.` → **307** (geçici). `http://` → 308 (iyi). | canlı HEAD | Sinyal birleşmesi zayıflar. | Vercel domain ayarında 308'e çevir. |
| **P2** | `viewport` `user-scalable=no, maximum-scale=1` (hub + tüm games/). | `index.html:3`, `games/kelimelik/index.html:3` | Erişilebilirlik cezası (Lighthouse). | Kaldır. |
| **P2** | Ağır varlıklar: `stockfish.js` 1.58 MB (hub'da yüklenmiyor, iyi), `player.glb` 1.09 MB, `kelimelik/words.txt` 797 KB, `zindan-okcusu/assets/archer.png` 731 KB, `bilgi-yilani/assets/fruits.png` 383 KB. Hub'da `<img>` yok (ikonlar JS ile; `width/height`/`loading="lazy"` 0). | `du`: games 5.5 MB, js 2.5 MB, assets 2.4 MB | Oyun içi LCP. | PNG→WebP, words.txt gzip/JSON parça, ikonlara boyut niteliği. |
| **P2** | i18n: yalnız Türkçe (`js/i18n.js` TR sözlüğü), İngilizce sürüm yok → hreflang gerekmez; `lang="tr"` 82 sayfada tutarlı. | `js/i18n.js:1-15` | — | Değişiklik yok. |

## Sayfa-başı meta özeti

| Grup | Sayfa | title | description | canonical | og:image | JSON-LD | robots | H1 |
|---|---|---|---|---|---|---|---|---|
| `/oyunlar/<slug>/` | 53 | 53 (37'si >60 kr.) | 53 (53'ü >160 kr.) | 53 | 53 (hepsi aynı) | 53 VideoGame | 53 | 53 |
| `/oyunlar/` hub | 1 | 1 | 1 | 1 | 1 | **0** | 1 | 1 |
| `/games/<slug>/` iframe | 27 | 27 (yalnız ad) | **0** | **0** | **0** | **0** | **0** | 15 |
| `/` | 1 | 1 (72 kr., tekrar) | 1 (260 kr.) | 1 | 1 | 3 | 1 | **2 adet** (`index.html:190, 234`) |

En kötü 5: `games/kelimelik` ("Kelimelik", 1.6 KB), `games/son-kart`, `games/hava-hokeyi`, `games/ates-buz`, `games/zindan-okcusu` — description/canonical/og/robots sıfır. `son-kart` ve `hava-hokeyi`'nin `/oyunlar/` karşılığı da yok; yalnız iframe sayfası olarak var.

## Sitemap ↔ dosya uyuşmazlıkları

- Sitemap 54 URL → 54'ü de repo'da mevcut (`oyunlar/…/index.html`), kırık URL **0**; admin.html yok (doğru); `firebase.json` ignore listesindeki `index-3d.html` vb. sitemap'te yok (doğru) ama Vercel'de servis ediliyor.
- Repo'da olup sitemap'te olmayan: `/oyunlar/kelime-madeni-3d/` (bilinçli çıkarılmış, ama sayfa canlı ve hub'dan linkli).
- `games/son-kart/`, `games/hava-hokeyi/`: açılış sayfası da sitemap kaydı da yok.
- Canlı sitemap = repo sitemap (9 558 / 9 885 bayt farkı yalnız CRLF→LF).

## Canlı doğrulama (HEAD istekleri, Server: Vercel)

| URL | Durum |
|---|---|
| `/` | 200, `max-age=0`, HSTS var, X-Frame-Options **yok** |
| `/js/app.js?v=20`, `/favicon.svg`, `/og-image.png` | 200, `max-age=0, must-revalidate` (immutable yok) |
| `/sitemap.xml`, `/robots.txt`, `/llms.txt` | 200 |
| `/oyunlar/kelimelik` · `/oyunlar/kelimelik/` · `/oyunlar/kelimelik/index.html` · `/index.html` | hepsi 200 (yönlendirme yok) |
| `/games/kelimelik/` | 200 (indexlenebilir iframe sayfası) |
| `/admin.html` | 200 (noindex meta ile) |
| `/EGITSEL-OYUN-PLANI.md`, `/server.py`, `/database.rules.json`, `/seo/build_seo.py`, `/_bank_tmp.txt` | **200 — ifşa** |
| `/bu-sayfa-yok-123` | 404 (Vercel jenerik, 79 bayt) — `firebase.json` catch-all aktif değil |
| `http://bilnetoyun.com/` → https | 308 |
| `https://www.bilnetoyun.com/` → apex | **307** |

## Önerilen oyun sayfası JSON-LD (build_seo.py `jsonld_for` yerine)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "VideoGame", "@id": "https://bilnetoyun.com/oyunlar/kelimelik/#game",
      "name": "Kelimelik", "url": "https://bilnetoyun.com/oyunlar/kelimelik/",
      "image": "https://bilnetoyun.com/og/kelimelik.png",
      "description": "…", "inLanguage": "tr", "genre": "Kelime",
      "gamePlatform": "Web Browser", "applicationCategory": "GameApplication",
      "operatingSystem": "Any", "playMode": "MultiPlayer",
      "numberOfPlayers": {"@type":"QuantitativeValue","minValue":2,"maxValue":2},
      "isAccessibleForFree": true, "offers": {"@type":"Offer","price":"0","priceCurrency":"TRY"},
      "audience": {"@type":"EducationalAudience","educationalRole":"student","suggestedMinAge":7,"suggestedMaxAge":10},
      "educationalUse": "practice", "teaches": "Kelime bilgisi, strateji ve Türkçe yazım",
      "dateModified": "2026-06-17",
      "publisher": {"@id": "https://bilnetoyun.com/#org"} },
    { "@type": "Organization", "@id": "https://bilnetoyun.com/#org",
      "name": "Bilnet Oyun", "url": "https://bilnetoyun.com/",
      "logo": "https://bilnetoyun.com/icon-512.png",
      "parentOrganization": {"@type":"EducationalOrganization","name":"Bilnet Okulları","url":"<resmî site>"},
      "sameAs": ["<instagram>", "<youtube>"] },
    { "@type": "BreadcrumbList", "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Ana Sayfa","item":"https://bilnetoyun.com/"},
      {"@type":"ListItem","position":2,"name":"Oyunlar","item":"https://bilnetoyun.com/oyunlar/"},
      {"@type":"ListItem","position":3,"name":"Kelimelik"} ] }
  ]
}
```

`suggestedMinAge/MaxAge` `g["age"]`'den, `teaches` `g["teaches"]`'ten, `dateModified` git tarihinden türetilmeli. Hub sayfasına `CollectionPage` + 53 elemanlı `ItemList` eklenmeli.

**İlk sprint sırası:** (1) `.vercelignore` + `vercel.json` (headers, trailingSlash, 404.html) — aynı gün; (2) `games/` sayfalarına noindex/canonical + kelime-madeni-3d; (3) ana sayfa footer'ını 53 linke genişlet, title/description düzelt; (4) script/CSS lazy-load ve font self-host; (5) gizlilik/iletişim sayfaları + Organization şeması + llms.txt yenileme.
