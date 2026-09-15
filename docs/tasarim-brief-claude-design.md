# Bilnet Oyun — Claude Design için tasarım briefi (Faz 2 / B0 girdisi)

Aşağıdaki metin olduğu gibi Claude Design'a yapıştırılır. Çıktı (artboard'lar + token tablosu) `docs/tasarim-sozlesmesi.md`'ye dönüştürülüp B1'den itibaren uygulanır.

---

## PROMPT

Sen çocuk ürünleri konusunda deneyimli bir ürün tasarımcısısın. **bilnetoyun.com** için ana ekranı ve tüm yan ekranları baştan tasarlayacaksın. Aşağıdaki brief'i satır satır uygula; belirsizlik varsa tek bir soru sor, yoksa sorma ve tasarla.

### 1. Ürün
- **Bilnet Oyun**, Bilnet Okulları'nın 4-12 yaş öğrencileri için ücretsiz, üyeliksiz eğitici oyun platformu. 57 oyun: harf ve kelime, sayı ve matematik, bulmaca ve mantık, yaratıcılık, strateji ve macera, online çok oyunculu (11 oyun).
- Tek sayfa web uygulaması (hub) + her oyun için ayrı açılış sayfası + 404 + gizlilik/hakkında/iletişim + yönetici paneli (öğretmen).
- Mevcut marka sinyalleri korunacak: tema mavisi **#4AABE0**, gökyüzü/çimen dünyası, kategori renkleri (harf mavi #45B7D1, sayı turkuaz #4ECDC4, bulmaca sarı #F7B731, yaratıcılık pembe #FF78C4, strateji kahverengi/altın, online mor #7B5BFF), yazı tipleri **Fredoka** (başlık) + **Nunito** (metin), 57 oyunun mevcut SVG simgeleri (yeniden çizmek istersen aynı çizgi kalınlığında tek set olarak öner).
- Bilgi mimarisi, sayfa adresleri ve menü adları değişmeyecek: Ana sayfa, Oyunlar, Hakkında, Gizlilik, İletişim; kategori sekmeleri Tümü / Harfler ve Kelimeler / Sayılar ve Matematik / Bulmaca ve Mantık / Yaratıcılık / Strateji ve Macera / Online.

### 2. Kitle ve cihazlar
- **Çocuk (4-7):** okuma öncesi ya da yeni okur. Simge ve renk metinden önce gelir; her hedefe parmakla basılır (en az 52 px); metin en az 18 px; büyük harfle bağırma yok.
- **Çocuk (8-12):** okur, rekabet ve ilerleme ister (yıldız, rozet, online).
- **Öğretmen:** sınıf tableti (768-1024 px, yatay) ve projeksiyonla masaüstü. Kilit sistemi ve yönetici paneli onun için.
- **Veli:** telefon (375 px). Güven ister: gizlilik, reklam yok, üyelik yok.
- Öncelik sırası: **tablet yatay → telefon dikey → masaüstü**. Her ekranı 1280 ve 375 genişlikte ver; tablet 1024'te davranışı yazılı belirt.

### 3. Tasarım yönü: "Çıkartma kitabı bahçesi"
Tek bir dünya, her ekranda aynı: gökyüzü, güneş, bulutlar ve çimen zemininde **çıkartma (sticker) hissi**. Her kart, düğme ve rozet kalın beyaz konturlu, hafif yumuşak gölgeli bir çıkartma gibi durur; sanki bir sayfaya yapıştırılmış. Çocuğa hitap eden ama şablon görünmeyen bir dil için şunları kullan:
- **Balonlar:** kategori başlıklarında ve seviye tamamlama anında; her kategori kendi renginde bir balon demeti taşır.
- **Yıldız çıkartmaları:** ilerleme 0-3 yıldız, kazanılan yıldız kartın köşesine "yapışır".
- **Konfeti + balon uçuşu:** yalnızca yıldız kazanma anında (tek kutlama anı, 600 ms, sonra durur).
- **Maskot (isteğe bağlı, öner):** basit, iki-üç şekilden oluşan sevimli bir rehber (ör. gözlüklü küçük bir bulut ya da baykuş). Giriş kartında selamlar, boş/hata durumlarında konuşur. Dört-beş ifade çiz: mutlu, düşünen, üzgün (hata), kutlayan, uyuyan (çevrimdışı). Marka onayı gerekeceği için ayrı bir artboard'da alternatifli ver.
- **Şekil dili:** her şey yuvarlak. Tek yarıçap sistemi: düğmeler hap, kartlar 24 px, giriş alanları 16 px; bunu her ekranda aynı uygula.
- **Renk:** Bilnet mavisi tek marka rengi; kategori renkleri yalnız kart şeridi/balon/raf etiketinde; beyaz kart yüzeyi; metin koyu lacivert-gri (saf siyah yok). Mor "yapay zekâ gradyanı", neon parlama, cam efekti, koyu tema yok. Tüm metin/zemin çiftleri **WCAG AA 4,5:1**; büyük düğme metinleri 3:1 üstü.
- **Tipografi:** Fredoka 600-700 başlık ve düğme, Nunito 400-700 metin. Ölçek: kart adı 20 px, raf başlığı 28-32 px, hub başlığı 36-40 px, rozet en az 12 px, gövde 18 px. Türkçe karakterler (ş ğ ı İ ö ü ç) her boyutta kontrol edilir.
- **Hareket:** amaçlı ve kısa. Basma 120 ms küçülme (0,97), geçişler 200-250 ms, kutlama 600 ms. Sonsuz süzülme, sürekli parlama, sallanan menü yok. "Hareketi azalt" tercihinde yalnız durum geçişleri kalır.
- **Ses/geri bildirim ipuçları:** ekranda ses düğmesi durumu net (açık/kapalı), doğru/yanlış geri bildirimi rengin yanında simgeyle de verilir (renk körü çocuklar).

### 4. Tasarlanacak ekranlar (her biri ayrı artboard, 1280 + 375)
1. **Giriş kartı:** "Google ile Giriş" ve "Misafir Olarak Oyna"; veli için bir satır açıklama (giriş yapılırsa yıldızlar kaydolur). Maskot burada karşılar.
2. **Hub ana ekran:** üst şerit (ev, kategori sekmeleri, yıldız ve elmas sayacı, ses, hesap), "Devam et" satırı (kaldığı 3 oyun), ardından **yaş rafları**: Anaokulu (4-6), 1-2. Sınıf, 3-4. Sınıf, 5-6. Sınıf; her raf yatay kaydırılır, kartlarda kategori rengi şerit olarak kalır. Öğretmen anahtarı açıkken kartlara kazanım etiketi ve süre eklenir. Altbilgi: sayfa bağlantıları + en altta "Tasarım ve yazılım egweblab.com.tr" imza bandı (kaldırılamaz, 40 px).
3. **Oyun kartı durumları:** normal, basılı, klavye odağı, 0/1/2/3 yıldız, kilitli (yıldız eşiği gösterilir), "Yakında", online (2 oyuncu rozeti), çevrimdışıyken gri.
4. **Kilit modalı:** "Bu oyun için 5 yıldız gerekiyor" mantığı; öğretmen izniyle açılabildiği notu; tek düğme.
5. **Yıldız/rozet paneli (meta):** toplam yıldız, elmas, rozetler; günlük jeton tavanı bilgisi.
6. **Seviye tamamlama katmanı:** kazanılan yıldızlar, "Tekrar", "Sonraki", "Ana ekran"; kutlama anı burada.
7. **Oyun çerçevesi:** üst şerit (geri, oyun adı, yıldızlar, tam ekran), oyun alanı; iframe oyunları da bu çerçevede açılır.
8. **Online akışı:** takma ad seçimi (serbest metin değil: hazır sevimli isim + avatar/emoji seçici), oda kur / lobiye katıl / hızlı oyun, bekleme odası (oda kodu çok büyük ve okunur, "kodu arkadaşına ver"), rakip bulundu, bağlantı koptu.
9. **Sistem durumları:** çevrimdışı bandı ("tek kişilik oyunlar açık"), yükleniyor (iskelet, dönen simge değil), hata toast'ı, boş "Devam et" satırı.
10. **Oyun açılış sayfası** (`/oyunlar/<oyun>/`): kırıntı, başlık, bir cümle, "Hemen Oyna" düğmesi, yaş/kategori/oyuncu bilgisi, "ne öğretir" kutusu; veli/öğretmen okur, çocuk düğmeye basar.
11. **/oyunlar/ listesi:** 55 kartın raf düzeniyle statik hâli.
12. **404 sayfası:** maskot saklambaç oynuyor, "Oyunlara dön".
13. **Gizlilik / Hakkında / İletişim:** yetişkin okuma şablonu (68 karakter ölçü, 18 px, 1,6 satır aralığı), aynı dünyada ama sakin.
14. **Yönetici paneli (öğretmen):** koyu değil, aynı aile ama araç gibi: giriş formu; oyun kilitleri listesi (otomatik/açık/kilit), toplu düğmeler onaylı; ses dayatması; "tüm cihazları sıfırla" tehlikeli bölge.

### 5. Teslim biçimi
- Her artboard'da ekran adı ve genişlik; 375'te tek sütun, yatay taşma yok.
- **Token tablosu** (CSS değişken adıyla): renkler (en fazla 24: `--bilnet-mavi`, `--kategori-harf` …), yazı ölçeği, aralık (4/8 katları), yarıçap, gölge, süre/easing. Aynı tablo koyu tema içermez; site tek tema (açık).
- **Bileşen envanteri:** düğme (birincil/ikincil/tehlike, 3 boyut), çip, kart, rozet, modal, toast, bant, form alanı, sekme; her birinin normal/basılı/odak/devre dışı hâli.
- **Simge kuralı:** tek çizgi kalınlığı, 24 ve 32 px ızgara; kategori simgeleri ve arayüz simgeleri (ev, ses, tam ekran, geri, kilit, yıldız, elmas, oyuncu) tek set. Emoji simge olarak kullanılmaz.
- **Metin dili:** çocuğa "sen", kısa, olumlu ("Harika!", "Bir daha dene"); ekran metinlerinde uzun tire yok, ünlem tek.
- Gerçek içerik kullan: oyun adları (Harf Tanıma, Hece Birleştirme, Kelimelik, Son Kart, Zindan Okçusu, Altın Avı, LEGO World 3D, Matematik Kafe …), "57 oyun", "4-12 yaş". Lorem ipsum yok.
- Her artboard için 2-3 satır "neden böyle" notu; alternatif gösterdiğin yerde tek bir öneri işaretle.

### 6. Yapma listesi
- Mor-mavi yapay zekâ gradyanı, neon parlama, cam/frosted efekt, koyu tema, gradyan metin.
- Üç eşit özellik kartı, ortalanmış jenerik hero, sonsuz animasyon, yanıp sönen öğe (3 Hz üstü hiçbir şey).
- Küçük metin (12 px altı), düşük kontrast pastel üstünde açık gri, dokunma hedefi 44 px altı.
- Reklam alanı, e-posta toplama, sosyal paylaşım butonu (çocuk ürünü).
- Menü adlarını, sayfa adreslerini ve oyun adlarını değiştirmek.
- Emoji'yi simge olarak kullanmak; el çizimi düzensiz ikon karışımı.

Bitirmeden önce kontrol et: her metin/zemin çifti AA mı, her hedef 52 px mi, 375'te taşma var mı, imza bandı her sayfada mı, tek yarıçap sistemi mi, hareket "azalt" hâlinde ne kalıyor.

---

## Uygulama notu (koordinatör)
Design çıktısı geldiğinde: token tablosu → `css/tokens.css` (B1), raf mimarisi → B2a/B2b, maskot → SVG olarak `assets/` (marka onayı sonrası), bileşenler → mevcut sınıf adlarıyla eşleme tablosu. Kabul: Playwright duman 60/60, Lighthouse erişilebilirlik 100 korunur, imza bandı ≤ %2.
