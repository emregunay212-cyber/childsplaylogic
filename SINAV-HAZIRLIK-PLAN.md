# Sınav Hazırlık Modülü — Uygulama Planı

> Bu dosya, `PROJE-BAGLAMI.md` (vizyon/kararlar) üstüne inşa edilen **somut uygulama
> planıdır**. Mevcut bilnetoyun.com (childsplaylogic) kod tabanı incelenerek hazırlandı.

---

## 0. Bu oturumda netleşen kararlar

| Karar | Seçim |
|---|---|
| **Mimari** | Hibrit — aynı site, ayrı `hazirlik/` bölümü. Ana sayfada giriş butonu/kartı. |
| **Kapsam** | Çok sınavlı: **LGS + YKS (TYT/AYT) + KPSS**. Tasarım baştan çok sınavlı; içerik kademeli dolar. |
| **Skill stratejisi** | Her sınav için ayrı soru-yazma skill'i. `kpss-soru-yazma` hazır; `lgs-soru-yazma` ve `yks-soru-yazma` üretilecek. |
| **Kayıt/kimlik** | Veli e-postası + şifre (Firebase Auth). Çocuk verisi → KVKK gereği veli hesabı. |
| **Runtime AI** | YOK. İçerik önceden hazırlanır (skill + insan doğrulama), site sade kalır. |

---

## 1. Mevcut kod tabanının özeti (kararı belirleyen gerçekler)

- **Kimlik:** Site tamamen **anonim**, Firebase **Auth yok**. Tek-oyunculu ilerleme `localStorage`'da
  (`oyun_bahcesi_progress`), çok-oyunculu geçici `playerId` + nickname.
- **Yapı:** Tek `index.html` + JS routing (SPA). Oyunlar `{id, levels, init, destroy}` IIFE modülleri,
  `js/app.js` içindeki `gameCategories` dizisinden render edilir.
- **Firebase:** SDK compat **10.14.1**, sadece `app` + `database` yüklü (auth modülü yok).
  Proje `childsplaylogic`, RTDB `europe-west1`. Kurallar: default deny, ama `lobbies/players/rooms`
  herkese açık.
- **Hosting:** `public: "."`, **tüm yollar → `/index.html`** rewrite (SPA). Statik dosyalar 1 yıl cache.
- **Marka/dil:** Tek domain, %100 Türkçe (`js/i18n.js` global `TR`), ortak CSS değişkenleri, PWA
  (service worker yok). Build adımı yok — statik dosyalar doğrudan serve.

**Sonuç:** Oyunlar hafif/anonim; sınav hazırlık kayıtlı/kişisel. Ayrı bölüm doğru tercih.
Oyun akışına dokunulmaz; auth sadece `hazirlik/` içinde devreye girer.

---

## 2. Hedef bölüm mimarisi

Ana hub'a bir kart/buton: **"📚 Sınav Hazırlık / Çalışma Alanım"** → `childsplaylogic.com/hazirlik/`.
Bu, oyunlardan ayrı, **çok sayfalı** kendi mini-uygulaması (oyun SPA'sı değil).

```
childsplaylogic/                 ← mevcut site (oyunlar, anonim — dokunulmaz)
│  index.html, js/app.js, ...
│
└─ hazirlik/                     ← YENİ bölüm (kayıtlı, kişisel)
   ├─ index.html                 giriş / kayıt (+ KVKK aydınlatma & veli onayı)
   ├─ panel.html                 dashboard: "bu hafta / bugün şunu çalış" + eksikler + ilerleme
   ├─ konu.html                  konu anlatımı (okuma) + not alma
   ├─ test.html                  ön test & konuya özel sorular + yanlışta dönüt
   ├─ css/
   │   └─ hazirlik.css           ana sitenin renk değişkenlerini paylaşır
   └─ js/
      ├─ auth.js                 Firebase Auth (yalnız hazirlik/ sayfalarında yüklenir)
      ├─ icerik.js               içerik (anlatım + soru) okuma
      ├─ quiz.js                 tek soru-çözme motoru (tüm sınavlar aynı motoru kullanır)
      ├─ plan.js                 kural tabanlı seviye/plan/Leitner mantığı
      └─ panel.js                dashboard render + günlük öneri
```

### 2.1 Ana site entegrasyonu
- `js/app.js` hub'ına bir giriş noktası (kart veya üst bar butonu) → `window.location.href = 'hazirlik/'`.
  Bu bir **oyun modülü değil**; basit bir link. Oyun kategorisi sistemine sokulmaz.
- `firebase.json` rewrite'ı düzenle: `hazirlik/**` mevcut SPA rewrite'ına yutulmamalı.
  ```json
  "rewrites": [
    { "source": "/hazirlik/**", "destination": "/hazirlik/index.html" },
    { "source": "**", "destination": "/index.html" }
  ]
  ```
  (Gerçek `.html` dosyaları zaten doğrudan serve edilir; bu kural uzantısız derin linkler içindir.)

### 2.2 Auth katmanı
- `hazirlik/` sayfalarına ek script: `firebase-auth-compat.js` (10.14.1).
- Oyunlar bu modülü **yüklemez** → anonim akış aynen korunur.
- Aynı Firebase projesi/console → yeni kurulum, yeni maliyet kalemi yok.

---

## 3. Veri modeli

### 3.1 İçerik dağıtımı — ÖNERİ: statik JSON (RTDB değil)
Konu anlatımları ve sorular **herkese aynı** ve **nadiren değişir**. Bunları RTDB'de tutmak gereksiz
okuma maliyeti yaratır. Daha iyisi: **statik JSON dosyaları** olarak Hosting'den servis (CDN + 1 yıl
cache, auth gerekmez). PROJE-BAGLAMI §3'teki "içerik RTDB'de" kararını bu noktada revize ediyoruz.

```
hazirlik/icerik/
  index.json                         ← sınav/ders/konu kataloğu (slug + ad + sıra + önkoşul)
  <sinav>/<ders>/<konuSlug>.json     ← { anlatim, sorular[] }  (ör. lgs/matematik/carpanlar-katlar.json)
```

- **Avantaj:** ucuz, hızlı, cache'lenir; içerik güncellemesi = dosya deploy.
- Kişisel veriyle karışmaz; içerik herkese açık zaten.

### 3.2 Kişisel veri — Firebase RTDB (auth-locked)
```
hazirlik/kullanicilar/{uid}/
  profil:    { veliEposta, ogrenciAdi, sinavHedefi, sinif, kayitTarihi }
  onTest:    { tamamlandi: bool, sonuc: { <ders>: { <konuSlug>: {dogru, yanlis} } } }
  ilerleme/<sinav>/<ders>/<konuSlug>: { dogru, yanlis, leitnerKutu, sonCalisma }
  plan:      { haftaBaslangic, gunlukGorevler[], oncelikSirasi[] }
  notlar/<konuSlug>/{notId}: { metin, tarih }
  sonuclar/{denemeId}: { tur, puan, tarih, cevaplar[] }
hazirlik/bildirimler/{id}: { konuSlug, soruId, mesaj, uid, tarih }   ← "soruyu bildir"
```

### 3.3 Güvenlik kuralları (mevcut kuralların yanına eklenir)
```json
"hazirlik": {
  "kullanicilar": {
    "$uid": {
      ".read":  "auth != null && auth.uid === $uid",
      ".write": "auth != null && auth.uid === $uid"
    }
  },
  "bildirimler": {
    ".read": false,
    "$id": { ".write": "auth != null && newData.child('uid').val() === auth.uid" }
  }
}
```
Mevcut `lobbies/players/rooms/leaderboards` kuralları **olduğu gibi kalır**. İçerik statik JSON
olduğu için RTDB kuralı gerektirmez.

### 3.4 Slug / etiket ayrımı (önceki tespit edilen sorun — plana dahil)
`konu` hem path anahtarı hem etiket olamaz (Türkçe karakter/boşluk path'te sorunlu). Çözüm:
- **`konuSlug`** (ascii-tireli, ör. `carpanlar-katlar`) → dosya adı + eşleşme anahtarı.
- **`konu`** (insan-okunur, ör. "Çarpanlar ve Katlar") → ekranda gösterim.
- Soru JSON şemasına `konuSlug` ve `sinav`/`ders` slug'ları eklenir. Soru-yazma skill'leri bu
  slug'ları taksonomiden üretmeli (her skill'in referans taksonomisine `slug` kolonu eklenir).

---

## 4. İçerik üretim pipeline'ı & skill stratejisi

Üç içerik tipi üretilecek; hepsi önce skill, sonra insan doğrulamasından geçer:
1. **Konu anlatımı** — seviyeye uygun, özet + örnekli açıklama.
2. **Sorular** — sınav formatına uygun çoktan seçmeli.
3. **Dönütler** — her sorunun `cozum`/açıklaması (yanlış cevapta öğrenciye gösterilir).

### 4.1 Sınav başına soru-yazma skill'leri
Hepsi `kpss-soru-yazma` kalıbını izler (sabit JSON şema, zorunlu öz-doğrulama, `kaynakGerekli`
bayrağı, yazar+kontrolcü rolleri) ama **format kuralları sınava göre değişir**:

| Skill | Durum | Şık sayısı | Müfredat | Not |
|---|---|---|---|---|
| `kpss-soru-yazma` | ✅ Hazır (düzeltildi) | **5 (A–E)** | KPSS GY/GK/Eğitim Bil. | Yetişkin; düzeltilmiş paket Downloads'ta |
| `lgs-soru-yazma` | ⏳ Üretilecek | **4 (A–D)** | MEB ortaokul 8. sınıf | Yeni nesil / beceri temelli sorular |
| `yks-soru-yazma` | ⏳ Üretilecek | **5 (A–E)** | TYT + AYT lise müfredatı | TYT ve AYT alt-kategorileri |

> ⚠️ **Kritik fark:** LGS **4 şıklı**, YKS/KPSS **5 şıklı**. Her skill kendi şık kuralını dayatır.

### 4.2 Ortak konu-anlatımı skill'i
`konu-anlatimi-yazma` (yeni): verilen sınav/ders/konu/seviye için öğrenci-dostu anlatım üretir
(tanım → örnek → özet → sık hatalar). Çıktı, içerik JSON'undaki `anlatim` alanını doldurur.

### 4.3 Yükleme akışı
1. Skill(ler) → JSON üret (sorular + anlatım + dönüt).
2. Doğrulama: skill'in kontrolcü protokolü + **insan örneklem kontrolü** (cevap anahtarı riski).
3. `kaynakGerekli=true` sorular insan/resmî kaynak onayından geçmeden yayınlanmaz.
4. Onaylı JSON → `hazirlik/icerik/<sinav>/<ders>/<konuSlug>.json` dosyasına yazılır → `firebase deploy`.
5. Site runtime'da bu dosyayı `fetch` ile okur. **AI yok.**

---

## 5. Adaptif sistem (kural tabanlı — PROJE-BAGLAMI §4)

1. **Ön test:** Kayıt sonrası, hedef sınavın konularını kapsayan, her sorusu konu/zorluk etiketli kısa test.
2. **Seviye:** Konu konu doğru oranı → eşik: `<%50 zayıf`, `%50–80 orta`, `>%80 güçlü`.
3. **Plan:** Konular zayıflık + önkoşul sırasına dizilir; sınava kalan güne yayılır. `plan.oncelikSirasi`.
4. **Günlük öneri:** Girişte `panel.html` → "Bugün: [Ders] – [Konu] (anlatım + N soru)".
5. **Adaptif döngü:** Her testten sonra doğru oranı yeniden ölçülür, **Leitner kutuları** güncellenir,
   plan yeniden sıralanır. Eksik konular kapanana dek öne gelir.

Hepsi `if/else` + sayma + sıralama ile (`js/plan.js`). Yapay zeka gerekmez.

---

## 6. Sayfa sayfa UX akışı

- **`index.html` (Giriş/Kayıt):** Veli e-postası + şifre. Kayıtta: öğrenci adı/takma ad, hedef sınav,
  sınıf, **KVKK aydınlatma metni + veli açık rıza onay kutusu**. İlk girişte → ön teste yönlendir.
- **`panel.html` (Dashboard):** Karşılama, haftalık hedef, **bugünün önerisi**, eksik konular listesi,
  ders/konu ilerleme çubukları, "Çalışmaya başla" butonu.
- **`konu.html`:** Konu anlatımı (okuma) + **not alma** alanı (kaydet → `kullanicilar/{uid}/notlar`).
  "Bu konunun sorularını çöz" butonu → `test.html`.
- **`test.html`:** Ön test veya konu soruları. Soru → cevap → doğru/yanlış. **Yanlışta: doğru cevap +
  `cozum` dönütü.** Test sonu: skor → ilerleme güncelle → plan yeniden sırala. Her soruda "soruyu bildir".

---

## 7. KVKK / çocuk verisi (uygulamadan önce teyit edilmeli)

- Çocuktan veri toplandığı için (özellikle 13 yaş altı) **veli açık rızası** ve **aydınlatma metni** şart.
- Hesap **veliye** bağlı (veli e-postası) — bu yüzden bu kayıt modeli seçildi.
- **Veri minimizasyonu:** yalnız gerekli alanlar (öğrenci adı takma ad olabilir, doğum tarihi yerine sınıf).
- Aydınlatma metni + rıza akışı **hukuki teyit** ister (bu plan hukuki danışmanlık değildir).

---

## 8. Yol haritası

- **Faz 0 — Temel:** `hazirlik/` iskeleti; Firebase Auth (veli e-postası); `firebase.json` rewrite;
  RTDB güvenlik kuralları; çok-sınavlı içerik şeması + slug kararı; KVKK aydınlatma/rıza taslağı.
- **Faz 1 — İçerik altyapısı:** `quiz.js` motoru; içerik JSON şeması (anlatım+soru+dönüt); statik içerik
  servisi (`icerik.js`); **1 sınav / 1 ders / birkaç konu pilot içerik** (kalite kalibrasyonu).
- **Faz 2 — Adaptif:** ön test → seviye → plan → günlük öneri → Leitner eksik takibi.
- **Faz 3 — Zenginleştirme:** not alma, "soruyu bildir", ilerleme görselleştirme, parola sıfırlama.
- **Faz 4 — Skill fabrikası & ölçekleme:** `lgs-soru-yazma` + `yks-soru-yazma` + `konu-anlatimi-yazma`
  skill'leri (kpss kalıbından); ders/konu içeriğini ölçekli üretip yükleme.

> İçerik pilotu (Faz 1) için ilk ders henüz seçilmedi — bkz. Açık Sorular.

---

## 9. Açık sorular / riskler

1. **Pilot ders:** Çok sınavlı tasarım baştan kurulur, ama içerik tek dersle pilotlanmalı (kalite için).
   Hangi sınav-ders ile başlayalım? (Öneri: LGS-Matematik veya hazır skill nedeniyle KPSS-GY-Matematik.)
2. **İçerik hacmi hedefi:** Konu başına min. kaç soru? Kolay/orta/zor dağılımı? Ön test uzunluğu?
3. **LGS 4-şık / YKS-KPSS 5-şık** farkı her skill'de ayrı kurallanacak (not edildi).
4. **KVKK metni** ve veli rıza akışının hukuki teyidi.
5. **İçerik = statik JSON** önerisi onayı (RTDB yerine). Maliyet/basitlik avantajı; PROJE-BAGLAMI §3 revizyonu.
6. **PWA/offline:** Konu anlatımı offline okunsun mu? (Service worker şu an yok — ileride.)

---

## 10. Genişletilmiş gereksinimler (2026-06-01 kullanıcı geri bildirimi)

**Netleşen vizyon:** Site, çalışmak isteyen öğrencinin sınava hazırlıkta **tek durağı** olmalı —
öğrenci konu/soru *aramadan*, doğru ve kapsamlı içerik + kişisel planlama burada bulsun. Veli,
öğretmen ve öğrenci bu içeriğe **güvenebilmeli**. Bu yüzden içerik doğru/doğrulanmış/geniş olmalı
ve sistem öğrenciyi **planlayıp yönlendirmeli** (sadece soru sormakla kalmamalı).

Eklenecek özellikler:
1. **Ön test (seviye tespit) — kayıttan sonra ilk adım.** Hedef sınavın hazır konularından
   karışık, konu etiketli kısa test. Sonuç → her konuya başlangıç seviyesi. İlerleme ve planın
   başlangıç girdisidir.
2. **Çalışma planı — haftalık / aylık / yıllık.** Girdi: ön test seviyeleri + **sınav tarihi** +
   güncel ilerleme. Kural tabanlı öncelik (zayıflık × önkoşul × sınav ağırlığı). Çıktı: yıllık
   konu dağılımı → aylık hedefler → haftalık günlük görevler ("Salı: X anlatımı + 20 soru").
   İlerledikçe yeniden hesaplanır.
3. **Soru havuzu büyütme + rotasyon.** Konu başına çok soru; her testte havuzdan farklı,
   karıştırılmış bir alt küme → "hep aynı soru" sorunu biter. Konu başına hedef: 30+ (kademeli,
   hepsi doğrulanmış).
4. **Soru süresi (timer).** Testte geçen süre gösterilir; sonuçta toplam + soru başına ortalama.
5. **Test sırasında not paneli (sağda).** Öğrenci konu notlarını test çözerken görüp güncelleyebilir
   (geniş ekranda sağ sütun, dar ekranda alta iner). Not konuya bağlı.
6. **Konu açılma kuralı (KARAR):** Kilit YOK. İçeriği hazır olan her konu erişilebilir; diğerleri
   yalnız içerik henüz hazırlanmadığı için "Yakında". Sıra/öncelik plan + ön testle *önerilir*,
   dayatılmaz. (Önkoşul yalnız sıralama için; erişimi engellemez.)

### Revize yol haritası (öncelik sırası)
- **R1 (bu turda):** Soru havuzunu büyüt + quiz'e rotasyon + süre (timer) + test-içi not paneli.
- **R2:** Ön test akışı (çok-konulu seviye tespit) + sonucu ilerlemeye yazma.
- **R3:** Çalışma planı motoru (haftalık/aylık/yıllık) + sınav tarihi + panelde "bugün / bu hafta".
- **R4:** Kalan LGS-Matematik konularının içeriği (anlatım + doğrulanmış soru havuzu).
- **R5:** `lgs/yks-soru-yazma` skill'leri + içerik ölçekleme; sonra diğer dersler.
- **R6:** Firebase Auth + RTDB'ye taşıma (siteye aktarım) + ana hub'a giriş kartı.

---

## 11. Pedagojik ve etkileşim vizyonu (2026-06-01 — araştırma temelli)

Kullanıcı geri bildirimi: düz metin anlatım sıkıcı; çocuk sıkılmadan, merak ederek öğrenmeli;
adaptif zorluk, kalem-kağıt hissi (çizim/karalama/işaretleme), çoklu not şart. "Bunlar olmazsa
olmaz." Ürün artık **soru bankası değil, gerçek dijital çalışma ortamı**.

### Araştırma bulguları (kaynaklar yol haritasının altında)
- **Görsel öğrenme:** görsel temsiller (sayı doğrusu, alan modeli, cebir karosu, diyagram)
  anlamayı ve kalıcılığı artırır; soyut → somut. Gerçek hayat bağlamı motivasyonu artırır.
- **Worked examples + fading:** çözümlü örnekler bilişsel yükü azaltır; ÇOK örnek, adım adım,
  sonra ipuçları kademeli azaltılır ("tam çözüm → yarı → kendin çöz"). Tek örnek YETMEZ.
- **Adaptif zorluk:** öğrenciyi "en uygun zorluk" (zone of proximal development) bandında tut;
  başarı → zorlaş, zorlanma → kolaylaş. Sıkılmayı ve yılmayı birlikte önler.
- **Kalem-kağıt / el yazısı:** tablet+kalem kağıt hissini taklit eder; matematik/denklemde
  el yazısı + çizim, sembol klavyesinden daha doğal.

### 11.1 Zengin anlatım formatı (yeni "anlatim" şeması)
Bölüm tipleri (`bolumler[].tip`): `hook` (neden önemli + gerçek hayat) · `kavram` (renkli
tanım/ipucu/dikkat kutuları) · `gorsel` (özgün **SVG diyagram** — sayı doğrusu, alan modeli,
çarpan ağacı; **emoji DEĞİL**, bkz. proje belleği) · `ornek` (çok sayıda, adım adım çözümlü
worked example; kademeli zorlaşan) · `dene` (mini etkileşim/kendin çöz) · `ozet` (+ sonraki
konuya merak köprüsü). Chunking: kısa parçalar. Üretim için `konu-anlatimi-yazma` skill'i bu
formata göre güncellenecek.

### 11.2 Adaptif zorluk + soru havuzu
- Her konuda **zorluk-dengeli, büyük havuz** (hedef ≥ 8 kolay + 8 orta + 8 zor ≈ 24+; mevcut 10
  yetersiz). Tüm sorular yine kodla doğrulanır.
- Test seçimi konu **seviyesine** göre: zayıf → kolay ağırlıklı, orta → orta, güçlü → zor ağırlıklı.
  Test içinde dinamik: arka arkaya doğru → zorlaş, yanlış → kolaylaş.
- "İyi olduğu konu" güçlü olsa da Leitner ile tekrar gelir (unutmama); ama artık daha zor sorularla
  (derinleşme).

### 11.3 Kalem-kağıt çalışma ortamı (mobil öncelikli)
- **Karalama/çizim alanı (scratchpad):** HTML Canvas + Pointer Events (parmak + stylus + fare).
  Soru çözerken yanda/altta; serbest çizim, renk, silgi, temizle. Şekil çizimi (geometri),
  işlem yapma. Çizim kaydedilebilir (konuya/soruya bağlı).
- **Soru üzerinde işaretleme:** altını çizme/vurgulama (özellikle Türkçe/paragraf — ileride).
- **Cevabı "kağıda yazar gibi":** el yazısı/çizim girişi (matematik sembolü klavyeden zor sorununa
  çözüm — öğrenci çizerek/yazarak çalışır; sistem çoktan seçmeli cevabı ayrıca alır).
- **Çoklu not (Not 1/2/3):** konuya bağlı birden çok not; her not metin VEYA çizim olabilir
  (matematiksel ifade/şekil için çizim notu). Soru çözerken o konunun notları yanda listelenir.

### Revize öncelik (R-serisi güncellendi)
- **RA — Zengin anlatım formatı:** şema + `konu-anlatimi-yazma` skill güncellemesi + **1 konuyu
  yeni formatta prototip** (SVG görsel + çok worked example) → onay → sonra tüm içerik bu formatta.
- **RB — Kalem-kağıt:** scratchpad (Canvas) + çoklu not (metin+çizim) + soru işaretleme.
- **RC — Adaptif zorluk + havuz:** her konuyu 24+ dengeli soruya çıkar; seviyeye göre test seçimi
  + test içi dinamik zorluk.
- **RD — İçerik ölçekleme:** kalan konular + diğer dersler (yeni format & havuz boyutuyla).
- (R6 — canlıya alma — en sona kayar.)

> Kaynaklar: [IES — middle school math engagement](https://ies.ed.gov/learn/blog/strategies-engage-students-and-transform-middle-school-math-experience) · [Worked-example effect (Wikipedia)](https://en.wikipedia.org/wiki/Worked-example_effect) · [MIT TLL — Worked Examples](https://tll.mit.edu/teaching-resources/how-people-learn/worked-examples/) · [Wolters Kluwer — adaptive quizzing/mastery](https://www.wolterskluwer.com/en/expert-insights/using-adaptive-quizzing-as-a-lowstakes-measure-of-mastery) · [NotedEx — handwriting math on tablet](https://www.notedexapp.com/blog/benefits-of-using-handwriting-for-math-equations-at-college-using-a-digital-pen-tablet)

---

## 12. Çok dersli kapsam (LGS — planlandı, içerik kademeli)

Katalog (`hazirlik/icerik/index.json`) artık LGS'nin **tüm derslerini ve 8. sınıf konularını**
içerir. İçerik (anlatım + soru) konu konu üretilir; üretilen konu `hazir:true` olur.

| Ders | Konu | Durum |
|---|---|---|
| Matematik | 11 | 5 hazır (zengin format), 6 sırada |
| Türkçe | 12 | planlandı |
| Fen Bilimleri | 8 | planlandı |
| T.C. İnkılap Tarihi | 7 | planlandı |
| Din Kültürü | 5 | planlandı |
| İngilizce | 10 | planlandı |

**İçerik üretim sırası (öneri):** Matematik'i bitir (havuz 24 + kalan 6 konu) → Fen → Türkçe →
İnkılap → Din → İngilizce. Her ders için `konu-anlatimi-yazma` + `lgs-soru-yazma` skill'leri;
sayısal konularda kodla doğrulama, sözel/güncel konularda (İnkılap, Din, Türkçe yorum) kaynak teyidi.

**Açık işler (çok ders için):**
- **UI:** Panel şu an yalnız Matematik gösteriyor → çok-dersli panel (ders seçimi/sekmeleri) gerekli (RD).
- **Skill:** `lgs-soru-yazma` matematik odaklı → Türkçe/Fen/İnkılap için ders-özel kurallar
  (4 şık sabit; sözel/paragraf doğrulama; İnkılap-Din'de tarih/kaynak teyidi) eklenmeli.
- **Ön test / plan:** çok dersli olunca ders bazında seviye + ders-arası çalışma planı.
