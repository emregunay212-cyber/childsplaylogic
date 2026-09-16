# B5 — Elle tur kanıtı: 5 eğitsel oyun, edu-kit sonrası (16 Eylül 2026)

**Yöntem:** Playwright (Chromium, headless), `tests/static-server.js --port 8773`, `faz2/b5-edu-kit` dalı.
Her oyun bağımsız (`/games/<slug>/`) açıldı; ek olarak Bilgi Madencisi hub yolundan (`/?oyun=bilgi-madencisi`, misafir tohumu) iframe içinde denendi.

- **Ses spy'ı:** sayfa betiklerinden önce `window.EduKit` atamasına setter tuzağı kurulup `EduKit.audio.tone`/`EduKit.tone` sarıldı
  (oyunlar `const { init, tone } = EduKit.audio` ile bu sarmalayıcıyı alır) → çağrı sayısı + argümanlar; ayrıca
  `AudioContext.prototype.createOscillator` sayıldı ve `ctx.state` okundu (gerçekten osilatör üretiliyor mu, bağlam `running` mı).
- **Sekme gizleme:** headless'ta sekme arka plana alınamadığından `document.hidden`/`visibilityState` `configurable` getter ile
  `hidden` yapılıp `visibilitychange` gönderildi (kit `EduKit.onHidden` tam bu ikisini okur); geri gelişte tersi.
  Gerçek tarayıcıda aynı olay aynı yoldan gelir; `pagehide` yolu ayrıca `tests/edu-kit.spec.js` ile değil, kit kodunda
  (`window.addEventListener('pagehide', hide)`) mevcut.
- **Beklenen davranış = eski davranış:** duraklatma perdesi olan oyunlar (madenci, kafe) gizlenince `paused` + `#pauseVeil.show`,
  geri gelince KENDİLİĞİNDEN sürmez (Devam düğmesi) — satır içi kopyada da böyleydi. Perdesiz oyunlar (kesir, günlük kelime, çiftlik)
  yalnız kaydeder (`saveStats`/`persist`); Bilgi Çiftliği geri gelince `renderFarm` çizer (`onHidden(persist, renderFarm)`).

### bilgi-madencisi (/games/bilgi-madencisi/)

| Adım | Sonuç |
|---|---|
| EduKit.version | 1.0.0 |
| Oyna → G.state | playing |
| kanca bırakma sonrası ses | EduKit.tone çağrısı 1, createOscillator 1, ctx.state=running; ilk tınılar: [[300,0.09,"square",0.04,0]] (= `Audio2.drop`) |
| sekme gizlendi → G.state / pauseVeil.show | paused / true |
| gizlenince saveStats → localStorage bilgimadenci_stats | yazıldı |
| geri gelince (visibilitychange visible) → G.state | paused (oyun kendiliğinden sürmez; Devam düğmesi bekler — eski davranış) |
| Devam → G.state | playing |
| konsol/JS hatası | 0 JS hatası; 1 adet 404: `sorular/math-tier1.json` — oyunun kendi tasarımı (QuestionBank önce banka dosyasını dener, yoksa prosedürel üretici; master'da da aynı), kit'le ilgisiz |

### matematik-kafe (/games/matematik-kafe/)

| Adım | Sonuç |
|---|---|
| Oyna → G.state | playing |
| vardiya başı ses | EduKit.tone 2, createOscillator 2, ctx.state=running |
| sekme gizlendi → G.state / pauseVeil.show | paused / true |
| localStorage matkafe_stats | yazıldı |
| geri gel + Devam → G.state / pauseVeil.show | playing / false |
| konsol/JS hatası | 0 |

### kesir-2048 (/games/kesir-2048/)

| Adım | Sonuç |
|---|---|
| Oyna → G.state | playing |
| ok tuşu → slide sesi | EduKit.tone 1, createOscillator 1; tını: [300,0.06,"square",0.03,0] (= `Audio2.slide`) |
| sekme gizlendi → saveStats → localStorage kesir2048_stats | yazıldı |
| G.state (bu oyunda perde yok, kayıt var — eski davranış) | playing |
| geri gel → ok tuşu hâlâ işler (tone sayacı) | 2 |
| konsol/JS hatası | 0 |

### gunluk-kelime (/games/gunluk-kelime/)

| Adım | Sonuç |
|---|---|
| 2 harf yazıldı → key sesi | EduKit.tone 2, createOscillator 2, ctx.state=running; tını: [500,0.04,"square",0.03,0] (= `Audio2.key`) |
| ızgarada yazılan harfler | KA |
| sekme gizlendi → persist/saveStats → localStorage gunlukkelime_save / _stats | save yazıldı / stats yazıldı |
| geri gel → Backspace işler | K |
| konsol/JS hatası | 0 |

### bilgi-ciftligi (/games/bilgi-ciftligi/)

| Adım | Sonuç |
|---|---|
| soru cevaplandı → ok/bad sesi | EduKit.tone 1, createOscillator 1, ctx.state=running; tını: [160,0.25,"sawtooth",0.05,0] (= `Audio2.bad`, ilk şık yanlıştı) |
| sekme gizlendi → persist → localStorage bilgiciftligi_save | yazıldı |
| soru fitili gizliyken durur (setInterval içinde `document.hidden` kontrolü — oyunun kendi kodu) | evet |
| geri gel → renderFarm (resumeFn) → #farm hücre sayısı | 9 → 9 (yeniden çizildi, hücre sayısı sabit) |
| konsol/JS hatası | 0 |

### bilgi-madencisi hub içinde (/?oyun=bilgi-madencisi)

| Adım | Sonuç |
|---|---|
| iframe içinde EduKit.version | 1.0.0 |
| iframe satır içi script | 0 |
| Oyna → G.state | playing |
| iframe belgesi gizlendi → G.state / pauseVeil.show | paused / true |
| konsol/JS hatası | 0 JS hatası; aynı tasarım-gereği 404 (`sorular/math-tier1.json`) |

**Sonuç:** 5/5 oyunda ses kit üzerinden üretiliyor (frekans/süre/tip/ses düzeyi eski çağrılarla aynı), gizlenince duraklatma/kayıt
eski davranışla birebir, geri gelişte hata yok. Otomatik karşılığı: `npm run test:edu-kit` (63 test) + `PORT=8773 npm run test:smoke` (61/61).
