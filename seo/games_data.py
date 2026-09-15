#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Oyun verisi — bilnetoyun.com SEO ureticisinin TEK VERI KAYNAGI.
seo/build_seo.py bu listeyi okur; landing, hub, sitemap ve llms.txt buradan turetilir.

Alanlar:
  slug     : SPA oyun id'si (derin-link: /?oyun=<slug>, js/app.js tryDeepLink)
  name     : gorunen ad (title/H1/JSON-LD)
  cat      : kategori etiketi (title, genre)
  age      : "min-max" yas araligi (JSON-LD suggestedMinAge/MaxAge buradan parse edilir)
  players  : kac kisilik (metin). "online" geciyorsa playMode=MultiPlayer
  teaches  : ne kazandirir (JSON-LD teaches)
  short    : tek cumle (hub karti + meta description govdesi; ~<=110 karakter tut)
  about    : uzun aciklama (landing govdesi + JSON-LD description)
  active   : False -> sayfa uretilir ama noindex, "Cok yakinda", hub/sitemap/llms disi (varsayilan True)
  players_range : (min, max) oyuncu sayisi; verilmezse players metninden turetilir
  also_online   : True -> ayni sayfada online surumu de var (toplam oyun sayisinda +1 sayilir)
"""

# Statik bilgi sayfalari (A8a) — build_seo.py STATIC_TMPL ile /<slug>/index.html uretir;
# bos degilse sitemap'e, llms.txt'ye ve tum altbilgilere (landing/hub/statik) girer.
#   slug        : URL parcasi (/<slug>/)
#   title       : H1 (ve JSON-LD WebPage.name)
#   nav         : altbilgi/kirinti kisa etiketi
#   page_title  : <title> (<= 60); yoksa "{title} | Bilnet Oyun"
#   description : meta description (<= 150)
#   lead        : baslik altindaki giris cumlesi
#   note        : (istege bagli) icerigin ustundeki kisa uyari kutusu
#   schema_type : (istege bagli) WebPage | AboutPage | ContactPage (varsayilan WebPage)
#   sections    : [(h2, bolum-id, [paragraf, ...])] — paragraf "<" ile basliyorsa oldugu gibi
#                 basilir (liste/yorum), yoksa <p> icine alinir. Icerik guvenilir yazar HTML'idir;
#                 {toplam_oyun} yer tutucusu uretimde oyun sayisiyla doldurulur.
# Gizlilik metni (KVKK md. 10 aydinlatma) js/auth.js, js/progress.js, js/lobby.js, js/multiplayer.js,
# games/kelimelik/net.js, games/son-kart/js/net.js, js/games/altin-avi.js, database.rules.json,
# js/firebase-config.js, index.html ve vercel.json ile birebir dogrulanmistir; kod degisirse metin de
# degismeli. "24 saati gecen kayitlar otomatik temizlikle silinir" cumlesi, ayni anda eklenen uygulama-ici
# temizlik isine (sonraki ziyaretcide, parti parti) dayanir; sure garantisi ("en gec") verilmez.
# Okul bilgileri (SCHOOL_*) sahip tarafindan dogrulanmis yayimli kaynaklardir; e-posta yayimlanmamistir,
# uydurulmaz. Sirket/sicil unvani kampus sitesinden dogrulanamadigi icin yalniz kampus adi kullanilir.
SCHOOL_NAME = "Bilnet Okulları Balıkesir Kampüsü"
SCHOOL_URL = "https://balikesir.bilnetokullari.com/"
SCHOOL_CONTACT_URL = "https://balikesir.bilnetokullari.com/tr/kampus-iletisim"
SCHOOL_CORP_URL = "https://bilnetokullari.com/"
SCHOOL_PHONE = "0 850 260 12 45"          # Bilnet Okulları çağrı merkezi (yayımlı)
SCHOOL_PHONE_TEL = "tel:+908502601245"
SCHOOL_SOCIAL = [                          # (etiket, URL) — Organization JSON-LD sameAs ile aynı liste
  ("Instagram", "https://www.instagram.com/bilnetbalikesir/"),
  ("Facebook", "https://www.facebook.com/bilnetbalikesir"),
  ("X (Twitter)", "https://twitter.com/bilnetbalikesir"),
]

def _contact(text):
  return f'<a href="{SCHOOL_CONTACT_URL}" target="_blank" rel="noopener">{text}</a>'


_CONTACT_LINK = _contact("kampüs iletişim sayfası")
_PHONE_LINK = f'<a href="{SCHOOL_PHONE_TEL}">{SCHOOL_PHONE}</a>'
_SOCIAL_LI = "".join(f'<li><a href="{u}" target="_blank" rel="noopener">{n}</a></li>\n' for n, u in SCHOOL_SOCIAL)

STATIC_PAGES = [
  dict(slug="gizlilik", title="Gizlilik ve Kişisel Verilerin Korunması", nav="Gizlilik",
       description="KVKK aydınlatma metni: Bilnet Oyun'da hangi veri işlenir, nereye aktarılır, ne kadar saklanır, haklarınız neler? Misafir, Google girişi, online oyun.",
       lead="Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun (KVKK) 10. maddesi uyarınca Bilnet Oyun'u kullanırken hangi verilerin hangi amaçla işlendiğini, kimlere aktarıldığını, ne kadar saklandığını ve haklarınızı sade bir dille açıklar. Veliler ve öğretmenler için yazılmıştır.",
       note="Bu metin bilgilendirme amaçlıdır ve okul yönetiminin onayıyla güncellenir.",
       sections=[
         ("Veri sorumlusu ve iletişim", "veri-sorumlusu", [
           f"Bilnet Oyun (bilnetoyun.com), <strong>{SCHOOL_NAME}</strong>'nün 4–12 yaş öğrencileri için hazırlanmış ücretsiz eğitici oyun platformudur. KVKK kapsamında veri sorumlusu <strong>{SCHOOL_NAME}</strong>'dür.",
           f"Kişisel verilerle ilgili soru ve başvurular için: {_CONTACT_LINK} ya da Bilnet Okulları çağrı merkezi <strong>{_PHONE_LINK}</strong>. Öğrenci ve veliler önce okuldaki bilişim öğretmenine de başvurabilir (bkz. <a href=\"/iletisim/\">İletişim</a>).",
         ]),
         ("Bir bakışta: ne zaman hangi veri?", "ozet", [
           "<ul>\n"
           "<li><strong>Misafir olarak oynarken:</strong> ad, e-posta ya da başka bir kişisel bilgi istenmez; ilerleme sunucuya gönderilmez.</li>\n"
           "<li><strong>Google ile giriş yaparsanız:</strong> Google hesabındaki ad, e-posta ve profil fotoğrafı (Firebase Authentication) ile hesaba bağlı oyun ilerlemesi.</li>\n"
           "<li><strong>Çok oyunculu oyunlarda:</strong> yazılan takma ad, oda kodu ve oyun durumu; oyun süresince herkese görünür.</li>\n"
           "<li><strong>Skor tablolarında:</strong> isteğe bağlı yazılan ad (en fazla 16 karakter) ve skor; herkese açık.</li>\n"
           "<li><strong>Her ziyarette:</strong> sayfayı ve altyapıyı sunan hizmetler teknik zorunluluk olarak cihazın IP adresini görür (bkz. Aktarım).</li>\n"
           "</ul>",
         ]),
         ("Misafir olarak oynarken", "misafir", [
           "Giriş ekranında <strong>Misafir</strong> seçildiğinde hiçbir kişisel veri istenmez ve toplanmaz. Kazanılan yıldızlar yalnızca kullandığınız tarayıcının yerel deposunda tutulur; sunucuya gönderilmez.",
           "Misafir oturumu geçicidir: yeni bir misafir girişinde ilerleme sıfırdan başlar. Böylece sınıf tableti gibi paylaşımlı cihazlarda bir öğrencinin ilerlemesi bir sonrakine görünmez.",
         ]),
         ("Google ile giriş yaparsanız", "google-girisi", [
           "Google girişi isteğe bağlıdır ve yalnızca sizin (çocuk için velisinin) düğmeye basmasıyla başlar. Giriş yapıldığında <strong>Firebase Authentication</strong> üzerinden Google hesabındaki <strong>ad, e-posta adresi ve profil fotoğrafı</strong> alınır. Amaç: hesabı tanımak, hesap menüsünde göstermek ve ilerlemeyi hesaba bağlamak. Uygulama bu bilgileri kendi veritabanına yazmaz, başka bir amaçla işlemez.",
           "Yıldızlar, ayarlar ve oyun içi kayıtlar (bölüm ilerlemesi, en yüksek skorlar, jeton ve günlük seri) <strong>Firebase Realtime Database</strong>'de, hesap kimliğine bağlı, hesaba özel bir alanda saklanır. Veritabanı kuralları gereği bu alanı uygulama üzerinden yalnızca hesabın sahibi okuyabilir ve yazabilir; yönetici paneli dâhil başka hiçbir arayüz göremez. Doğrudan erişim yalnızca sistemi işleten teknik sorumluda (Firebase yönetim konsolu) bulunur.",
           "Aynı hesapla başka bir cihazdan girildiğinde ilerleme kaldığı yerden devam eder. <strong>Çıkış yap</strong> seçildiğinde bu cihazdaki kopya silinir; buluttaki kayıt, silinmesi istenene kadar durur. Uygulama içinde hesap silme düğmesi yoktur; silme talebi yukarıdaki iletişim yollarıyla iletilir.",
           "Çocukların Google girişini okulun verdiği ya da velinin gözetimindeki bir hesapla yapması önerilir.",
         ]),
         ("Çok oyunculu oyunlarda", "cok-oyunculu", [
           "Online oyunlarda (Kelime Tahmin, Harf Tahmin, Satranç, Kod Macerası, Penaltı Online, Ateş &amp; Buz, Zıpla Topla Online, Hava Hokeyi, Altın Avı, Kelimelik, Son Kart) oyuncu bir <strong>takma ad</strong> yazar. Takma ad, oda kodu ve oyun durumu (hamleler, skor, tahmin edilen kelimeler, çevrimiçi olma bilgisi) oyun süresince Firebase Realtime Database'de tutulur; <strong>lobi listesinde ve rakip oyunculara görünür</strong>. Bu bölüm hesapsız da okunabildiği için takma ad olarak gerçek ad-soyad, sınıf ya da okul numarası yazılmamalıdır.",
           "Bu kayıtlar hiçbir hesapla ilişkilendirilmez ve geçicidir. Lobi tabanlı oyunlarda kayıt oyun bitince ya da odadan çıkılınca silinir; bağlantı koptuğunda çevrimiçi kaydı kendiliğinden kaldırılır. Kelimelik ve Son Kart'ta başlamış bir oda oyun bittikten sonra da kalabilir. 24 saati geçen tüm lobi ve oda kayıtları otomatik temizlikle silinir. Takma ad, bir sonraki oyunda yeniden yazmamak için yalnızca kendi cihazınızda saklanır.",
         ]),
         ("Skor tabloları", "skor-tablolari", [
           "Tetris, Eğim ve SpaceWaves'te oyun sonunda <strong>Skoru Kaydet</strong> seçilirse yazılan ad (en fazla 16 karakter) ve skor, herkese açık skor tablosuna eklenir. Kayıt tamamen isteğe bağlıdır; kaydetmeden de oynanabilir. Eklenen kayıt uygulama içinden değiştirilemez ya da silinemez; silme talebi okul üzerinden iletilir. Buraya da gerçek ad yazılmaması önerilir.",
         ]),
         ("Toplama yöntemi ve hukuki sebep", "hukuki-sebep", [
           "Veriler yalnızca sizin platformu kullanmanızla — misafir ya da Google girişi seçmeniz, takma ad ya da skor adı yazmanız, oyun oynamanız — elektronik ortamda, otomatik yollarla toplanır. Form doldurulmaz; üçüncü kaynaklardan veri alınmaz.",
           "Google girişi, ilerleme senkronu, çok oyunculu oyun ve skor tablosu verileri, talep ettiğiniz hizmetin sunulabilmesi için gereklidir (KVKK md. 5/2-c, sözleşmenin ifası). Altyapı hizmetlerinin gördüğü IP adresi gibi teknik veriler, hizmetin güvenli ve kesintisiz çalıştırılması için işlenir (md. 5/2-f, meşru menfaat). Bunların hiçbiri zorunlu değildir: Google girişi, online oyunlar ve skor kaydı isteğe bağlıdır ve kullanıcının kendi eylemiyle başlar; misafir olarak, hiçbir kişisel veri vermeden oynanabilir.",
         ]),
         ("Aktarım ve yurt dışı", "aktarim", [
           "Platform kendi sunucusunda kişisel veri tutmaz; verileri aşağıdaki hizmetler barındırır ya da işler. Bu hizmetlerin tamamı yurt dışında kuruludur; dolayısıyla veriler KVKK md. 9 kapsamında yurt dışına aktarılır. Bu hizmetler olmadan oyunlar çalışmaz; hangi verinin nereye gittiğini bilerek karar verebilmeniz için hepsini açıkça listeliyoruz:",
           "<ul>\n"
           "<li><strong>Google Firebase</strong> (Realtime Database ve Authentication) — giriş, ilerleme senkronu, çok oyunculu oyunlar, skor tabloları ve merkezi yönetici ayarları. Oyun verileri Google Cloud'un Belçika (europe-west1) bölgesinde tutulur; Google hesabına ait kayıt (ad, e-posta, fotoğraf) Firebase Authentication'da saklanır ve bölgesi Google tarafından belirlenir. Site açılır açılmaz yönetici ayarlarını okumak için Firebase'e bağlanır; yazılım kitaplığı www.gstatic.com'dan yüklenir.</li>\n"
           "<li><strong>Vercel</strong> — site bu barındırma hizmeti ve dünya çapındaki dağıtım ağı üzerinden sunulur; sağlayıcı, hizmetin işletilmesi ve güvenliği için standart sunucu kayıtları (IP adresi, istek zamanı) tutabilir.</li>\n"
           "<li><strong>Yazı tipleri</strong> — ana sayfa, oyun sayfaları ve oyunların çoğu yazı tiplerini bilnetoyun.com'un kendi sunucusundan yükler. Yalnızca <strong>Ateş &amp; Buz, Kelimelik, Son Kart ve Zindan Okçusu</strong> açıldığında yazı tipleri Google Fonts'tan (fonts.googleapis.com, fonts.gstatic.com) yüklenir; bu istekte IP adresi Google'a iletilir.</li>\n"
           "<li><strong>cdnjs.cloudflare.com ve unpkg.com</strong> — Satranç (chess.js) ve LEGO World 3D (three.js) kitaplıkları yalnızca bu oyunlar açıldığında buradan yüklenir.</li>\n"
           "<li><strong>upload.wikimedia.org</strong> — Satranç taş görselleri Wikimedia Commons'tan yüklenir.</li>\n"
           "</ul>",
           "Bu isteklerde ilgili sağlayıcı, teknik zorunluluk olarak tarayıcının IP adresini ve tarayıcı bilgisini görür; platform Firebase dışındaki hiçbir sağlayıcıya ad, e-posta ya da ilerleme verisi göndermez. Veriler bunların dışında hiçbir kişi ya da kurumla paylaşılmaz, satılmaz.",
         ]),
         ("Saklama süreleri", "saklama", [
           "<ul>\n"
           "<li><strong>Misafir ilerlemesi:</strong> yalnızca cihazınızda; yeni misafir girişinde ya da tarayıcı verileri temizlendiğinde silinir.</li>\n"
           "<li><strong>Google hesabına bağlı ilerleme ve hesap kaydı:</strong> hesabın silinmesi talep edilene kadar; cihazdaki kopya çıkışta silinir.</li>\n"
           "<li><strong>Lobi ve oda kayıtları</strong> (takma ad, oyun durumu): lobi tabanlı oyunlarda oyun bitince; Kelimelik ve Son Kart odaları oyun sonrası kalabilir; 24 saati geçen tüm kayıtlar otomatik temizlikle silinir.</li>\n"
           "<li><strong>Takma ad (cihazda):</strong> siz değiştirene ya da tarayıcı verileri temizlenene kadar.</li>\n"
           "<li><strong>Skor tablosu kayıtları:</strong> silme talebine kadar.</li>\n"
           "<li><strong>Sağlayıcıların teknik sunucu kayıtları:</strong> ilgili sağlayıcının kendi saklama politikasına göre, kısa süreli.</li>\n"
           "</ul>",
         ]),
         ("Reklam, çerez ve izleme", "izleme", [
           "Bilnet Oyun'da <strong>reklam gösterilmez</strong>; Google Analytics benzeri analitik araçlar, izleme pikselleri ya da sosyal medya eklentileri <strong>kullanılmaz</strong>. Kullanıcı profili çıkarılmaz; kamera, mikrofon ve konum izni istenmez.",
           "Site kendi adına çerez bırakmaz. Google girişi kullanılırsa oturum bilgisi tarayıcının yerel deposunda tutulur; giriş penceresi Google'ın kendi çerez ve gizlilik politikasına tabidir.",
         ]),
         ("Yönetici paneli", "yonetici-paneli", [
           "Yönetici paneli yalnızca <strong>yetkili okul personeli</strong> tarafından kullanılır ve üç iş yapar: oyunları kilitlemek ya da açmak, ses ayarını belirlemek ve gerektiğinde tüm cihazlarda ilerlemeyi sıfırlamak. Panel öğrenci hesaplarına, adlarına ya da ilerleme kayıtlarına <strong>erişmez</strong>; veritabanı kuralları bu erişime izin vermez.",
         ]),
         ("Haklarınız ve başvuru", "haklar", [
           "KVKK'nın 11. maddesi uyarınca, kendinize ya da velisi olduğunuz çocuğa ait veriler için veri sorumlusuna başvurarak: verinin işlenip işlenmediğini <strong>öğrenme</strong>, işlenmişse bilgi <strong>isteme</strong>, amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde ya da yurt dışında aktarıldığı üçüncü kişileri bilme, eksik ya da yanlış verinin <strong>düzeltilmesini</strong> isteme, verinin <strong>silinmesini</strong> ya da yok edilmesini isteme, bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme, yalnızca otomatik sistemlerle analiz sonucu aleyhinize çıkan bir sonuca <strong>itiraz</strong> etme ve kanuna aykırı işleme nedeniyle zarara uğradıysanız tazmin talep etme haklarına sahipsiniz.",
           f"Başvurunuzu {_contact("kampüs iletişim sayfasındaki")} yollarla ya da çağrı merkezi <strong>{_PHONE_LINK}</strong> üzerinden iletebilirsiniz; öğrenci ve veliler için okuldaki bilişim öğretmeni de aracı olur. Başvurular KVKK md. 13 uyarınca en geç 30 gün içinde ücretsiz sonuçlandırılır. Başvurunuz reddedilir ya da yanıtsız kalırsa Kişisel Verileri Koruma Kurulu'na şikâyet hakkınız vardır (md. 14). Google hesabına bağlı kayıtlar, skor tablosu girdileri ve oda kayıtları talep üzerine silinir.",
         ]),
         ("Çocuk verisi ve veli sorumluluğu", "cocuk-verisi", [
           "Bilnet Oyun 4–12 yaş grubu için tasarlanmıştır; kullanıcıları çocuktur ve veriler bu bilinçle en aza indirilmiştir: oynamak için hesap gerekmez; doğum tarihi, adres, telefon ya da fotoğraf yüklemesi istenmez. Google girişi ve online oyunlar dâhil tüm kullanımda ebeveyn ya da öğretmen gözetimi önerilir.",
           "Google girişi, takma ad ve skor kaydı gibi seçimler çocuk adına veli tarafından ya da veli gözetiminde yapılmalıdır. Çocuklara çevrimiçi oyunlarda gerçek adını, okulunu, sınıfını ve iletişim bilgilerini paylaşmaması gerektiğini hatırlatın. Bir çocuğun verisinin izinsiz işlendiğini düşünüyorsanız yukarıdaki başvuru yollarıyla silme talebinde bulunabilirsiniz.",
         ]),
         ("Değişiklikler", "degisiklikler", [
           "Bu metin platformda yapılan değişikliklere göre güncellenir; güncel sürüm her zaman bu adreste yayımlanır. <strong>Son güncelleme: 15 Eylül 2026.</strong>",
         ]),
       ]),
  dict(slug="hakkinda", title="Bilnet Oyun Hakkında", nav="Hakkında", schema_type="AboutPage",
       page_title="Bilnet Oyun Hakkında – Ücretsiz Eğitici Oyun Platformu",
       description="Bilnet Okulları Balıkesir Kampüsü'nün 4-12 yaş için ücretsiz, üyeliksiz eğitici oyun platformu: {toplam_oyun} oyun, yıldız sistemi, öğretmen kilitleri.",
       lead=f"Bilnet Oyun, {SCHOOL_NAME}'nün anaokulundan ortaokula tüm öğrencileri için hazırladığı ücretsiz eğitici oyun platformudur.",
       sections=[
         ("Ne sunuyoruz?", "oyunlar", [
           "Platformda harf ve kelime, sayı ve matematik, hafıza, kodlama, fen, İngilizce, strateji ve sanat alanlarında <strong>{toplam_oyun} oyun</strong> bulunur; bir kısmı iki ya da daha çok oyunculu online oyunlardır. Her oyun tarayıcıda çalışır; telefon, tablet ve bilgisayarda kurulum gerektirmez. Tam liste <a href=\"/oyunlar/\">Tüm Oyunlar</a> sayfasındadır.",
         ]),
         ("Nasıl çalışır?", "nasil-calisir", [
           "Oynamak için üyelik gerekmez: <strong>Misafir</strong> seçip hemen başlayabilirsin. İlerlemenin cihazlar arasında saklanmasını istersen isteğe bağlı Google girişi vardır; neyin nerede tutulduğu <a href=\"/gizlilik/\">Gizlilik</a> sayfasında anlatılır.",
           "Oyunlar yıldız kazandırır. Bazı oyunlar belirli sayıda yıldız toplanınca açılır; böylece çocuk kolaydan zora doğal bir sırayla ilerler. Öğretmenler yönetici panelinden oyunları sınıf için topluca açabilir ya da kilitleyebilir ve ses ayarını belirleyebilir.",
         ]),
         ("Kim yaptı?", "kim-yapti", [
           f"Bilnet Oyun, <a href=\"{SCHOOL_URL}\" target=\"_blank\" rel=\"noopener\">{SCHOOL_NAME}</a> için geliştirildi ve okul topluluğuna ücretsiz sunulur. Kampüs, <a href=\"{SCHOOL_CORP_URL}\" target=\"_blank\" rel=\"noopener\">Bilnet Okulları</a> ailesinin parçasıdır. Tasarım ve yazılım: <a href=\"https://egweblab.com.tr\" target=\"_blank\" rel=\"noopener\">egweblab</a>. Soru ve önerilerin için <a href=\"/iletisim/\">İletişim</a> sayfasına bak.",
         ]),
       ]),
  dict(slug="iletisim", title="İletişim", nav="İletişim", schema_type="ContactPage",
       page_title="İletişim – Soru, Öneri ve Hata Bildirimi | Bilnet Oyun",
       description="Bilnet Oyun için soru, öneri, hata bildirimi ve KVKK talepleri: Bilnet Okulları Balıkesir Kampüsü iletişim sayfası, çağrı merkezi ve sosyal hesaplar.",
       lead=f"Soru, öneri ve hata bildirimleri için önce okulunuzdaki bilişim öğretmenine, ardından {SCHOOL_NAME}'ne ulaşabilirsiniz.",
       sections=[
         ("Kime yazmalı?", "kime", [
           "<ul>\n"
           "<li><strong>Öğrenci ve veliler:</strong> okulunuzdaki bilişim (bilgisayar) öğretmenine söyleyin; platformla ilgili geri bildirimleri o iletir.</li>\n"
           "<li><strong>Öğretmenler ve okul personeli:</strong> okul yönetimi üzerinden platform sorumlusuna ulaşın.</li>\n"
           "</ul>",
         ]),
         ("Okula ulaşın", "okul", [
           f"Bilnet Oyun'u <a href=\"{SCHOOL_URL}\" target=\"_blank\" rel=\"noopener\">{SCHOOL_NAME}</a> sunar. Okulun resmî iletişim yolları:",
           "<ul>\n"
           f"<li><strong>Kampüs iletişim sayfası:</strong> <a href=\"{SCHOOL_CONTACT_URL}\" target=\"_blank\" rel=\"noopener\">balikesir.bilnetokullari.com/tr/kampus-iletisim</a></li>\n"
           f"<li><strong>Çağrı merkezi:</strong> {_PHONE_LINK}</li>\n"
           f"<li><strong>Kurumsal site:</strong> <a href=\"{SCHOOL_CORP_URL}\" target=\"_blank\" rel=\"noopener\">bilnetokullari.com</a></li>\n"
           "</ul>",
           "Kampüsün sosyal hesapları:",
           "<ul>\n" + _SOCIAL_LI + "</ul>",
         ]),
         ("Hata bildirirken şunları yazın", "hata-bildirimi", [
           "Sorunu hızlı çözebilmemiz için şu üç bilgi yeterlidir:",
           "<ol>\n"
           "<li><strong>Hangi oyun?</strong> Oyunun adı ve varsa bölüm ya da seviye.</li>\n"
           "<li><strong>Hangi cihaz ve tarayıcı?</strong> Örneğin “sınıf tableti, Chrome” ya da “evdeki bilgisayar, Safari”.</li>\n"
           "<li><strong>Ne oldu?</strong> Beklediğiniz ile gördüğünüz arasındaki fark; mümkünse ekran görüntüsü.</li>\n"
           "</ol>",
         ]),
         ("Kişisel verilerle ilgili talepler", "kvkk-talep", [
           f"Bilgi alma, düzeltme ve silme talepleri {_contact("kampüs iletişim sayfasındaki")} yollarla ya da çağrı merkezi üzerinden iletilir; KVKK gereği en geç 30 gün içinde ücretsiz yanıtlanır. Hangi verilerin tutulduğunu <a href=\"/gizlilik/\">Gizlilik ve Kişisel Verilerin Korunması</a> sayfasında bulabilirsiniz.",
         ]),
       ]),
]

GAMES = [
  dict(slug="satranc", name="Satranç", cat="Strateji", age="6-10", players="Tek kişilik (AI'ya karşı)", also_online=True,
       teaches="Strateji, planlama ve mantık",
       short="Yapay zekâya karşı 9 seviyede satranç oyna.",
       about="Bilnet Oyun Satranç, çocukların stratejik düşünme ve planlama becerisini geliştirmek için tasarlanmış, tarayıcıda ücretsiz çalışan bir satranç oyunudur. Yapay zekâya karşı kolaydan zora 9 farklı seviyede oynayabilir; taş hareketlerini ve temel açılışları eğlenerek öğrenirsin. Kurulum ya da üyelik gerekmez."),
  dict(slug="penalti", name="Penaltı", cat="Spor / Refleks", age="5-10", players="Tek kişilik",
       teaches="El-göz koordinasyonu ve zamanlama",
       short="Kaleciye penaltı at, 9 seviyede gol krallığına ulaş.",
       about="Penaltı, doğru zamanda ve yönde şut çekerek kaleciyi geçmeye çalıştığın hızlı bir refleks oyunudur. 9 seviye boyunca kaleci giderek daha zorlaşır; çocuklar el-göz koordinasyonunu ve zamanlamayı geliştirir. Ücretsiz, üyeliksiz, telefon ve tablette oynanır."),
  dict(slug="hafiza-kartlari", name="Hafıza Kartları", cat="Hafıza", age="4-9", players="Tek kişilik",
       teaches="Görsel hafıza ve dikkat",
       short="Eşleşen kartları bul, 10 seviyede hafızanı güçlendir.",
       about="Hafıza Kartları, kapalı kartları açıp eşlerini bulduğun klasik bir hafıza ve dikkat oyunudur. 10 artan seviyede kart sayısı çoğalır ve görsel hafıza giderek güçlenir. Anaokulu ve ilkokul çocukları için ideal; tamamen ücretsiz."),
  dict(slug="matematik", name="Matematik", cat="Matematik", age="5-9", players="Tek kişilik",
       teaches="Toplama, çıkarma ve hızlı işlem",
       short="Toplama-çıkarma alıştırmalarıyla dört işlemi eğlenerek öğren.",
       about="Matematik oyunu, çocuklara toplama ve çıkarma başta olmak üzere temel işlemleri oyunlaştırarak öğretir. Doğru cevaplarla yıldız toplar, hız ve doğruluğunu artırırsın. İlkokul matematik pratiği için ücretsiz ve eğlenceli bir kaynak."),
  dict(slug="kod-macerasi", name="Kod Macerası", cat="Kodlama", age="6-10", players="Tek kişilik", also_online=True,
       teaches="Algoritma ve kodlama mantığı",
       short="Karakteri komutlarla yönlendir, kodlamanın temelini öğren.",
       about="Kod Macerası, çocuklara blok/komut mantığıyla algoritma ve kodlamanın temellerini öğreten bir bulmaca oyunudur. Karakteri hedefe ulaştırmak için doğru komut dizisini kurarsın; problem çözme ve mantıksal sıralama gelişir. Kod öğrenmeye giriş için ücretsiz."),
  dict(slug="lego-world", name="LEGO World 3D", cat="3D / İnşa", age="6-10", players="Tek kişilik",
       teaches="Mekânsal düşünme ve yaratıcılık",
       short="3D açık dünyada keşfet ve inşa et, 9 seviye.",
       about="LEGO World 3D, çocukların 3 boyutlu bir dünyada keşfedip yapılar inşa ettiği yaratıcı bir oyundur. Mekânsal algı, planlama ve yaratıcılığı geliştirir. Tarayıcıda ücretsiz çalışır, indirme gerektirmez."),
  dict(slug="lego-macerasi", name="LEGO Macerası", cat="Kodlama / İnşa", age="6-10", players="Tek kişilik",
       teaches="Kodlama + inşa becerisi",
       short="LEGO temalı kodlama ve inşa görevleri, 3 seviye.",
       about="LEGO Macerası, kodlama mantığını LEGO temalı inşa görevleriyle birleştirir. Komutlarla parçaları yerleştirir, hedefleri tamamlarsın. Hem algoritma hem yaratıcılık geliştiren ücretsiz bir eğitici oyun."),
  dict(slug="renk-eslestirme", name="Renk Eşleştirme", cat="Okul Öncesi", age="4-7", players="Tek kişilik",
       teaches="Renk tanıma ve eşleştirme",
       short="Renkleri eşleştir, okul öncesi renk bilgini geliştir.",
       about="Renk Eşleştirme, küçük çocukların renkleri tanıyıp eşleştirdiği okul öncesi bir oyundur. Renk ayırt etme ve dikkat becerisini güçlendirir. Anaokulu yaş grubu için ücretsiz ve basit arayüzlü."),
  dict(slug="sayi-sayma", name="Sayı Sayma", cat="Okul Öncesi", age="4-7", players="Tek kişilik",
       teaches="Sayma ve sayı tanıma",
       short="Nesneleri say, sayıları eğlenerek öğren.",
       about="Sayı Sayma, çocukların ekrandaki nesneleri sayarak sayı kavramını öğrendiği okul öncesi bir oyundur. Sayı tanıma ve birebir eşleme becerisini geliştirir. Anaokulu için ücretsiz."),
  dict(slug="harf-tanima", name="Harf Tanıma", cat="Okul Öncesi", age="4-7", players="Tek kişilik",
       teaches="Harf tanıma ve okuma hazırlığı",
       short="Harfleri tanı, okumaya ilk adımı at.",
       about="Harf Tanıma, çocukların harfleri görsel olarak tanıyıp ayırt ettiği okuma-hazırlık oyunudur. Alfabe bilgisi ve okur-yazarlığa geçişi destekler. Anaokulu ve 1. sınıf için ücretsiz."),
  dict(slug="hece-birlestirme", name="Hece Birleştirme", cat="Okuma", age="5-8", players="Tek kişilik",
       teaches="Hece bilgisi ve okuma akıcılığı",
       short="Heceleri birleştirip kelime kur, okumayı pekiştir.",
       about="Hece Birleştirme, heceleri bir araya getirerek kelime oluşturduğun bir okuma oyunudur. Hece bilinci ve okuma akıcılığını geliştirir. İlkokul okuma çalışmaları için ücretsiz ve eğlenceli."),
  dict(slug="sekil-bulmaca", name="Şekil Bulmaca", cat="Bulmaca", age="4-8", players="Tek kişilik",
       teaches="Şekil-uzay ilişkisi ve dikkat",
       short="Şekilleri doğru yere yerleştir, bulmacayı çöz.",
       about="Şekil Bulmaca, çocukların şekilleri uygun boşluklara yerleştirdiği bir mantık ve dikkat oyunudur. Şekil tanıma ve uzamsal düşünmeyi geliştirir. Okul öncesi ve ilkokul için ücretsiz."),
  dict(slug="siralama", name="Sıralama", cat="Mantık", age="4-8", players="Tek kişilik",
       teaches="Sıralama ve karşılaştırma mantığı",
       short="Nesneleri doğru sıraya diz, mantığını geliştir.",
       about="Sıralama, nesneleri boyut/miktar gibi ölçütlere göre dizmeyi öğreten bir mantık oyunudur. Karşılaştırma ve sıralama becerisini geliştirir. Erken yaş matematik-mantık için ücretsiz."),
  dict(slug="boyama", name="Boyama", cat="Sanat", age="3-8", players="Tek kişilik",
       teaches="Yaratıcılık ve renk bilgisi",
       short="Resimleri istediğin gibi boya, 10 resim.",
       about="Boyama, çocukların hazır şablonları diledikleri renklerle boyadığı bir sanat oyunudur. Yaratıcılık, renk bilgisi ve ince motor becerisini destekler. Tüm yaşlara uygun, ücretsiz."),
  dict(slug="tuval", name="Tuval", cat="Sanat", age="5-10", players="Tek kişilik",
       teaches="Piksel sanatı ve yaratıcılık",
       short="Piksel piksel kendi resmini çiz.",
       about="Tuval, piksel tabanlı bir çizim/boyama oyunudur. Çocuklar kare kare kendi resimlerini oluşturur; yaratıcılık ve dikkat gelişir. Ücretsiz, üyeliksiz."),
  dict(slug="jigsaw", name="Jigsaw Bulmaca", cat="Bulmaca", age="5-10", players="Tek kişilik",
       teaches="Görsel algı ve sabır",
       short="Parçaları birleştirip resmi tamamla.",
       about="Jigsaw Bulmaca, dağılmış parçaları birleştirerek resmi tamamladığın klasik bir yapboz oyunudur. Görsel algı, sabır ve problem çözmeyi geliştirir. Çocuklar için ücretsiz."),
  dict(slug="desen", name="Desen Tamamlama", cat="Mantık", age="5-9", players="Tek kişilik",
       teaches="Örüntü ve mantıksal akıl yürütme",
       short="Eksik deseni bul, örüntüyü tamamla.",
       about="Desen Tamamlama, bir örüntünün eksik parçasını bulduğun mantık oyunudur. Örüntü algısı ve mantıksal akıl yürütmeyi geliştirir; matematiksel düşünmenin temelidir. Ücretsiz."),
  dict(slug="zindan-okcusu", name="Zindan Okçusu", cat="Aksiyon", age="7-10", players="Tek kişilik",
       teaches="Refleks, strateji ve karar verme",
       short="Okçunla zindanda hayatta kal, beceri ve ekipman geliştir.",
       about="Zindan Okçusu, dalga dalga gelen yaratıklara karşı okçunla hayatta kaldığın bir aksiyon-hayatta kalma oyunudur. Seviye atladıkça aktif/pasif beceriler seçer, ekipman geliştirir ve bölümleri geçersin. Refleks, strateji ve hızlı karar verme gelişir. Ücretsiz."),
  dict(slug="kelime-tahmin", name="Kelime Tahmin", cat="Kelime", age="7-10", players="Online çok oyunculu",
       teaches="Kelime bilgisi ve tümdengelim",
       short="Wordle tarzı: gizli kelimeyi arkadaşınla yarışarak bul.",
       about="Kelime Tahmin, Wordle tarzında gizli kelimeyi tahmin etmeye çalıştığın online bir kelime oyunudur. Arkadaşınla aynı anda yarışır, kelime dağarcığını ve mantıksal çıkarımı geliştirirsin. Ücretsiz, üyeliksiz online çok oyunculu."),
  dict(slug="harf-tahmin", name="Harf Tahmin", cat="Kelime", age="7-10", players="Online çok oyunculu",
       teaches="Kelime bilgisi ve tahmin",
       short="Adam asmaca tarzı: harf tahmin ederek kelimeyi çöz.",
       about="Harf Tahmin, adam asmaca mantığıyla harfleri tahmin ederek gizli kelimeyi bulduğun online bir oyundur. Kelime bilgisi ve tahmin stratejisini geliştirir. Arkadaşlarınla ücretsiz oyna."),
  dict(slug="altin-avi", name="Altın Avı", cat="Bilgi", age="7-10", players="Online (5-30 kişi)",
       teaches="Genel kültür ve hızlı düşünme",
       short="5-30 kişilik bilgi yarışı: sorularla altın topla, geliştir.",
       about="Altın Avı, 5-30 kişinin aynı anda katıldığı online bir bilgi yarışı oyunudur. Sorulara doğru cevap vererek altın toplar, saldırı/savunma geliştirir ve lider tablosunda yükselirsin. Genel kültür ve hızlı düşünmeyi geliştiren ücretsiz çok oyunculu oyun."),
  dict(slug="ates-buz", name="Ateş ve Buz", cat="İş birliği", age="6-10", players="2 kişilik / online",
       teaches="İş birliği ve koordinasyon",
       short="İki karakteri yönet, engelleri birlikte aş.",
       about="Ateş ve Buz, iki karakteri (ateş ve buz) birlikte yönlendirerek engelleri aştığın bir iş birliği oyunudur. Eş güdüm ve birlikte problem çözmeyi geliştirir. Ücretsiz oynanır."),
  dict(slug="tetris", name="Tetris", cat="Bulmaca", age="6-10", players="Tek kişilik",
       teaches="Mekânsal düşünme ve hızlı planlama",
       short="Blokları döndür, satırları doldur ve temizle.",
       about="Tetris, düşen blokları döndürüp yerleştirerek satırları tamamladığın klasik bir bulmaca-arcade oyunudur. Hız arttıkça mekânsal düşünme, planlama ve refleks gelişir. Tarayıcıda ücretsiz, üyeliksiz oynanır."),
  dict(slug="buz-kulesi", name="Buz Kulesi", cat="Arcade", age="6-10", players="Tek kişilik",
       teaches="Zamanlama, refleks ve denge",
       short="Platformdan platforma zıpla, düşmeden yüksel.",
       about="Buz Kulesi, Icy Tower tarzı dikey bir zıplama oyunudur; platformdan platforma sıçrayarak mümkün olduğunca yükselirsin. Zamanlama, refleks ve el-göz koordinasyonunu geliştirir. Ücretsiz, üyeliksiz, telefon ve tablette oynanır."),
  dict(slug="zipla-topla", name="Zıpla Topla", cat="Platform", age="5-10", players="Tek kişilik",
       teaches="Zamanlama, refleks ve koordinasyon",
       short="Mario tarzı platformlarda zıpla, topla ve ilerle.",
       about="Zıpla Topla, Mario tarzı 2 boyutlu bir platform macera oyunudur; engelleri aşar, eşyaları toplar ve bölümleri geçersin. Zamanlama, refleks ve el-göz koordinasyonunu geliştirir. Tarayıcıda ücretsiz oynanır."),
  dict(slug="egim", name="Eğim", cat="Arcade", age="6-10", players="Tek kişilik",
       teaches="Hızlı refleks ve odak",
       short="Eğimli sonsuz yolda topu yönet, engellerden kaç.",
       about="Eğim (Slope Ball), hız kazanan bir topu eğimli sonsuz bir yolda yönlendirerek engellerden kaçtığın bir refleks-arcade oyunudur. Hızlı tepki, odak ve el-göz koordinasyonunu geliştirir. Ücretsiz, üyeliksiz."),
  dict(slug="space-waves", name="SpaceWaves", cat="Arcade", age="6-10", players="Tek kişilik",
       teaches="Refleks ve odaklanma",
       short="Uzayda dalgalar ve geçitler arasından çarpmadan süzül.",
       about="SpaceWaves (Uzay Dalgaları), dar geçitler ve engel dalgaları arasından aracını çarpmadan süzdüğün hızlı bir refleks-arcade oyunudur. Odak, zamanlama ve hızlı tepkiyi geliştirir. Tarayıcıda ücretsiz oynanır."),
  dict(slug="sayilarla-boyama", name="Sayılarla Boyama", cat="Sanat", age="4-9", players="Tek kişilik",
       teaches="Sayı tanıma, dikkat ve ince motor beceri",
       short="Numarayı seç, aynı numaralı kutuları boya, resmi ortaya çıkar.",
       about="Sayılarla Boyama, her numaraya karşılık gelen kutuları boyayarak gizli resmi ortaya çıkardığın bir sanat ve sayı oyunudur. Sayı tanıma, dikkat ve ince motor becerisini geliştirir. Çocuklar için ücretsiz, üyeliksiz."),
  dict(slug="emoji-yapici", name="Emoji Yapıcı", cat="Sanat", age="4-10", players="Tek kişilik",
       teaches="Yaratıcılık ve görsel tasarım",
       short="Parçaları seç, kendi emoji yüzünü yarat.",
       about="Emoji Yapıcı, göz, ağız ve aksesuar parçalarını birleştirerek kendi emoji yüzünü tasarladığın yaratıcı bir oyundur. Yaratıcılık ve görsel tasarımı geliştirir. Tarayıcıda ücretsiz, üyeliksiz."),
  dict(slug="penalti-mp", name="Penaltı Online", cat="Spor", age="6-10", players="Online 2 kişilik",
       teaches="Zamanlama, refleks ve rekabet",
       short="Arkadaşınla online penaltı düellosu: at ve kurtar.",
       about="Penaltı Online, bir arkadaşınla aynı anda oynadığın çevrim içi penaltı düellosudur; sırayla şut çeker ve kaleyi korursun. Zamanlama, refleks ve rekabet duygusunu geliştirir. Üyeliksiz, ücretsiz online oynanır."),
  dict(slug="kelimelik", name="Kelimelik", cat="Kelime", age="7-10", players="Online 2 kişilik",
       teaches="Kelime bilgisi, strateji ve Türkçe yazım",
       short="Arkadaşınla 1v1 Türkçe kelime oyunu: harfleri diz, kelime kur, puan topla.",
       about="Kelimelik, Scrabble tarzında 1v1 oynanan online Türkçe kelime oyunudur. 15x15 tahtada harf taşlarını dizerek kelimeler kurar, harf ve kelime çarpanlı özel karelerle puan toplar, arkadaşına karşı yarışırsın. Kelime dağarcığı, strateji ve Türkçe yazımı geliştiren ücretsiz, üyeliksiz online çok oyunculu bir oyun."),
  dict(slug="bil-ve-fethet", name="Bil ve Fethet", cat="Bilgi / Strateji", age="8-12", players="Tek kişilik",
       teaches="Genel kültür, strateji ve hızlı karar verme",
       short="Soruları cevapla, ülkeleri fethet: dünya haritasında bilgi savaşı.",
       about="Bil ve Fethet, gerçek dünya haritası üzerinde oynanan soru-cevap temelli bir fetih oyunudur. Komşu ülkelere saldırır, 10 soruluk bilgi savaşlarıyla toprak kazanır, gelirini yönetip saldırı ve savunma seviyeni geliştirirsin. Anaokulundan liseye kademe seçimi ve matematik, fen, Türkçe, sosyal, coğrafya, İngilizce ders seçenekleriyle hem genel kültürü hem stratejik düşünmeyi geliştirir. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  # js/app.js: comingSoon:true (2026-06-16) — sayfa noindex + "Çok yakında"; hub/sitemap/llms dışı.
  dict(slug="kelime-madeni-3d", name="Kelime Madeni 3D", cat="3D / İngilizce", age="8-12", players="Tek kişilik", active=False,
       teaches="İngilizce kelime dağarcığı ve mekânsal düşünme",
       short="Minecraft tarzı 3D madende kaz, üret — cevherler İngilizce soru sorar!",
       about="Kelime Madeni 3D, Minecraft tarzı blok dünyasında geçen eğitsel bir madencilik oyunudur. Ağaç kes, kazma üret, mağaralara in; kömür, demir, elmas ve kristal kazdığında İngilizce kelime sorusu gelir — doğru bilirsen cevher senindir. Üretim zinciri, 10 görevlik macera ve öğrendiğin kelimelerin defteriyle İngilizce kelime dağarcığını oyun içinde geliştirirsin. Dünya otomatik kaydedilir, kaldığın yerden devam edersin. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="bilgi-madencisi", name="Bilgi Madencisi", cat="Matematik", age="8-12", players="Tek kişilik",
       teaches="Dört işlem akıcılığı, kesirler ve hızlı karar verme",
       short="Soru yukarıda, cevaplar yerin altında — kancayı doğru taşa bırak!",
       about="Bilgi Madencisi, klasik altın madencisi mekaniğini matematikle birleştiren bir refleks ve işlem oyunudur. Ekranın üstünde bir soru görünür, yerin altında 4 cevap taşı durur; sallanan kancayı doğru taşa bırakırsan puan kazanırsın — yanlış taş ağırdır ve zamanını yer. Art arda doğrularda combo çarpanı, 5 doğruda dinamit! Etek'ten Zirve'ye 4 zorluk seviyesiyle toplama, çıkarma, çarpım tablosu, bölme, kesirler ve yüzdeler 60 saniyelik vardiyalarda akıcı hale gelir. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="matematik-patlatma", name="Matematik Patlatma", cat="Matematik", age="8-12", players="Tek kişilik",
       teaches="Zihinden işlem akıcılığı ve sayı hissi",
       short="Komşu taşları sürükle, hedef sayıyı tuttur — zincir ne kadar uzun, puan o kadar dev!",
       about="Matematik Patlatma, sayı taşlarından zincir kurarak hedefi tutturduğun 60 saniyelik bir işlem akıcılığı oyunudur. Hedef üstte yazar (örneğin 'Toplamı 12 yap'); komşu taşları parmağınla sürükleyip zincirin toplamı hedefe tam ulaşınca taşlar patlar, üstten yenileri düşer. Puan taş sayısının karesiyle büyür — uzun zincir kurmak hep kazandırır. Etek'te kolay toplamalar, Tırmanış'ta fark soruları, Zirve'de çarpım hedefleriyle zihinden işlem hızı eğlenerek gelişir. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="kelime-balonu", name="Kelime Balonu", cat="İngilizce", age="8-12", players="Tek kişilik",
       teaches="İngilizce kelime dağarcığı ve yazım (spelling)",
       short="İngilizce kelimenin harflerini balonlardan vur — kelime tamamlanınca büyük patlama!",
       about="Kelime Balonu, klasik balon patlatma (bubble shooter) mekaniğini İngilizce kelime öğrenimiyle birleştirir. Üstte hedef kelimenin resmi ve Türkçesi görünür (🐱 kedi); balonun içindeki doğru harfleri vurarak C-A-T gibi kelimeleri tamamlarsın. Doğru harf patlar ve yanındaki aynı harfli balonları da götürür; yanlış vuruş balonu kümeye yapıştırır — dikkat! Etek'te 3 harfli kolay kelimeler, Tırmanış'ta 6+ harf sıralı vurma, Zirve'de resim ipucu olmadan sadece Türkçe karşılıkla oynanır. Nişan alma, sekme ve zamanlama becerisiyle İngilizce yazım bir arada gelişir. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="bilgi-takimi", name="Bilgi Takımı", cat="Karma / Görev", age="8-12", players="Tek kişilik",
       teaches="Matematik, Türkçe, fen ve İngilizce — düzenli çalışma alışkanlığı",
       short="Görevleri bitir, XP topla, bilgi takımına yeni karakterler kat!",
       about="Bilgi Takımı, soru çözerek görev tamamladığın bir macera-koleksiyon oyunudur. Kütüphane, laboratuvar ve sözlük görevlerinde matematik, Türkçe, fen ve İngilizce soruları çözer; XP ve puan toplarsın. Her 5 görevde takımına Matematikçi Aslı, Bilge Baykuş gibi yeni bir karakter katılır — karakterler sana asla cevap söylemez, sadece puanını artırır. Günlük 20 enerji sınırı ekran süresini dengeler; aylık 30 görevlik sezon kitabını bitirenler Sezon Kahramanı olur. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="matematik-kafe", name="Matematik Kafe", cat="Matematik", age="8-12", players="Tek kişilik",
       teaches="Günlük hayat matematiği: alışveriş, para üstü, oran ve yüzde",
       short="Siparişin hesabını yap, hızlı servisle bahşişi kap — kasa sende!",
       about="Matematik Kafe'de kasiyer sensin! Müşteriler sipariş verir, fiyatlar panoda yazar; hesabı tuş takımıyla girer, doğru ve hızlı servisle bahşiş kazanırsın. Etek'te tek ürün fiyatı okuma, Yamaç'ta çoklu sipariş ve para üstü, Tırmanış'ta tarif ölçekleme ve %10 indirim, Zirve'de %1 KDV ve kampanya karşılaştırma soruları seni bekler. Müfredatın en çok istediği günlük hayat problemleri 120 saniyelik eğlenceli vardiyalara dönüşür. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="bilim-dedektifi", name="Bilim Dedektifi", cat="Fen Bilimleri", age="8-12", players="Tek kişilik",
       teaches="Fen kavramları, gözlem ve dikkat",
       short="Sahnedeki bilimsel nesneleri bul, vaka quizini çöz, 3 yıldızı topla!",
       about="Bilim Dedektifi, gizli obje bulmaca mekaniğini fen bilimleriyle birleştirir. Orman, mutfak, uzay, derin deniz gibi 8 vakada 'omurgalıları bul', 'ısı kaynaklarını işaretle' gibi görevler verilir; yanlış tıklama büyüteci 5 saniye dondurur. Vaka sonunda konuyla ilgili 3 soruluk mini quiz yıldızlarını belirler. Gözlem, dikkat ve fen kavramları (canlılar, madde, enerji, su döngüsü, elektrik) bir arada gelişir. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="bilgi-ciftligi", name="Bilgi Çiftliği", cat="Karma / Çiftlik", age="8-12", players="Tek kişilik",
       teaches="Tüm dersler + sabır ve planlama",
       short="Soru çöz, tohum kazan, ek — bitkiler gerçek zamanda büyür, hasat senin!",
       about="Bilgi Çiftliği'nde tohumlar bilgiyle kazanılır: 10 soruluk oturumlarda her doğru cevap 1 tohum verir. Matematik Buğdayı, Fen Domatesi, İngilizce Ayçiçeği ve Türkçe Lavantası gerçek zamanda büyür (30 dakikadan 24 saate) — oyun kapalıyken bile! Bitkiler asla solmaz, hasada hazır seni bekler. Hasatla çiftlik XP'si toplar, araziyi 3×3'ten 5×5'e büyütürsün. Düzenli tekrar alışkanlığını oyunlaştıran, stressiz bir çiftlik deneyimi. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="kelime-canavarlari", name="Kelime Canavarları", cat="İngilizce", age="8-12", players="Tek kişilik",
       teaches="İngilizce kelime kategorileri (hayvanlar, yiyecekler, renkler...)",
       short="İngilizce kelimelerle canavarını besle, evrimleştir, FUSION ile melez yarat!",
       about="Kelime Canavarları'nda her İngilizce kelime kategorisinin bir canavarı var: hayvanlar, yiyecekler, renkler, okul, doğa ve vücut. Kategorinin kelime quizlerini çözerek canavarını besler, 10 doğruda yumurtayı çatlatır, 25-60-120 doğruda evrimleştirirsin. İki tam evrimli canavarı 20 soruluk karışık quizde %80 başarıyla BİRLEŞTİRİP nadir melezler kazanabilirsin. 24 canavarlık koleksiyonu tamamla, Canavar Profesörü ol! Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="eslestirme-ustasi", name="Eşleştirme Ustası", cat="Hafıza", age="6-12", players="Tek kişilik",
       teaches="Hafıza + işlem/kelime/fen bilgisi bir arada",
       short="Kartlar özdeş değil İLİŞKİLİ: 7×8 kartının eşi 56! Az hamlede bul, 3 yıldızı kap.",
       about="Eşleştirme Ustası klasik hafıza oyununu bilgiyle birleştirir: çiftler özdeş değil, ilişkilidir — 'cat' kartının eşi kedi resmi, '7×8' kartının eşi '56', 'Buharlaşma' kartının eşi su-buhar simgesi. İngilizce, matematik ve fen destelerinden seç; Etek 4×3'ten Zirve 6×5 + süre sınırına dört zorluk. Usta modunda kartlar 3 saniye gösterilip kapanır. Az hamlede bitirene 3 yıldız! Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="kelime-kurtarma", name="Kelime Kurtarma", cat="Kelime", age="6-12", players="Tek kişilik",
       teaches="Türkçe yazım, İngilizce spelling, deyimler",
       short="Her yanlış harf bir balon patlatır — kelimeyi bul, karakteri uçur!",
       about="Kelime Kurtarma, adam asmacanın çocuk dostu hâlidir: sevimli karakterimiz balon demetiyle havada durur, her yanlış harf bir balon patlatır. Balonlar bitse bile korkma — paraşüt açılır, yumuşacık iner! İpucu baştan açıktır. Etek'te 3-4 harfli resimli kelimeler, Tırmanış'ta İngilizce spelling, Zirve'de deyim-atasözü tamamlama. Harf açma jokeri ve klavye desteğiyle yazım becerisi eğlenerek gelişir. Ücretsiz, üyeliksiz."),
  dict(slug="bilgi-yilani", name="Bilgi Yılanı", cat="Matematik", age="7-12", players="Tek kişilik",
       teaches="Dört işlem akıcılığı + refleks ve yön planlama",
       short="Klasik yılan ama yemler CEVAP: doğru yemi ye uza, yanlışta kısal!",
       about="Bilgi Yılanı, Nokia klasiğini matematikle buluşturur. Soru üstte sabittir; haritadaki elma yemlerinin üzerinde cevaplar yazar. Doğru yemi yersen uzar ve puan kazanırsın, yanlış yem seni 2 boğum kısaltır — tek boğuma düşersen tur biter! Etek'te duvarlar geçirgendir, Tırmanış'tan itibaren ölümcül; her 5 doğruda hız artar. Kaydırma ya da ok tuşlarıyla oynanır. Ücretsiz, üyeliksiz, tarayıcıda."),
  dict(slug="ritim-sorulari", name="Ritim Soruları", cat="Matematik", age="7-12", players="Tek kişilik",
       teaches="Zihinden işlem hızı + dikkat ve ritim",
       short="Düşen karolardan doğru cevaba bas — hatasız seri melodiye dönüşür!",
       about="Ritim Soruları, Piano Tiles akışını matematikle birleştirir: soru üstte sabit durur, 4 sütundan cevap karoları akar. Doğru cevaplı karoya bas, yanlışları boş geçir! Her doğru basış pentatonik bir nota çalar — hatasız seri gerçek bir melodi olur. Hız her 10 doğruda artar; Etek'te ceza yok, Tırmanış'ta 3 can, Zirve'de kesir ve yüzde karoları. 75 saniyelik teneffüs dostu turlar. Ücretsiz, üyeliksiz."),
  dict(slug="kesir-2048", name="Kesir 2048", cat="Matematik", age="8-12", players="Tek kişilik",
       teaches="Kesirler, denk kesirler ve birim kesir kavramı",
       short="1/8 + 1/8 = 1/4 → 1 TAM! Pasta dilimleriyle kesirler gözünün önünde birleşir.",
       about="Kesir 2048, sevilen kaydırma oyununu kesir öğretimine dönüştürür. Etek ve Yamaç klasik sayılarla ısındırır; Tırmanış'ta taşlar kesir olur: 1/8 + 1/8 = 1/4 → 1/2 → 1 TAM! Her taşın üzerindeki PASTA modeli kesrin gerçek miktarını gösterir — kavram ezbersiz görselleşir. Zirve'de denk kesir gösterimleri karışır (2/8'in 1/4 ile birleştiğini keşfedersin!). 3 geri alma hakkı, kaydırma ve ok tuşu desteği. Müfredatın en zorlanılan konusu kesirler, oyunla tanışıyor. Ücretsiz, üyeliksiz."),
  dict(slug="gunluk-kelime", name="Günlük Kelime", cat="Kelime", age="7-12", players="Tek kişilik",
       teaches="Türkçe ve İngilizce yazım, sözcük dağarcığı",
       short="Her gün TEK kelime — tüm okul aynı kelimeyi çözüyor! 6 deneme, yeşil-sarı ipuçları.",
       about="Günlük Kelime, sevilen kelime bulmaca formatını okul hayatına taşır: her gün herkese AYNI kelime gelir — sınıfta heyecanı paylaşırsın ama mesajlaşma yoktur. Türkçe 5 harf ve İngilizce 4 harf olmak üzere iki ayrı günlük bulmaca! 6 denemede harf ipuçlarıyla (yeşil yerinde, sarı var ama başka yerde) kelimeyi bul. Çözünce kelimenin anlamı ve örnek cümlesi gösterilir — her gün yeni bir şey öğrenirsin. Ardışık gün serisi rozetlere gider! Ücretsiz, üyeliksiz."),
  dict(slug="sayi-ninja", name="Sayı Ninja", cat="Matematik", age="8-12", players="Tek kişilik",
       teaches="Sayı hissi: çift-tek, katlar, asallık, kare sayılar, kesir karşılaştırma",
       short="Havaya fırlayan sayılardan kurala uyanları KES — kural 15 saniyede bir değişir!",
       about="Sayı Ninja, Fruit Ninja heyecanını sayı hissiyle birleştirir. Sayılar havaya fırlar, sen parmağınla keser gibi çizersin — ama yalnız KURALA UYANLARI! 'Çift sayıları kes', '3'ün katlarını kes', 'Asal sayıları kes', '1/2'den büyük kesirleri kes'... Kural her 15 saniyede değişir, beyin sürekli tetikte kalır. Tek harekette 3+ doğru kesim bonus verir; çeldirici buluta dikkat! Ezber değil, sayıları TANIMA üzerine kurulu. Ücretsiz, üyeliksiz."),
  dict(slug="bilgi-kulesi", name="Bilgi Kulesi", cat="Genel Kültür", age="8-12", players="Tek kişilik",
       teaches="Tüm dersler — strateji ve risk yönetimiyle birlikte",
       short="12 soruluk kuleyi tırman: jokerler, güvenli katlar ve zirvede taç!",
       about="Bilgi Kulesi, efsanevi yarışma formatını çocuklara uyarlar: 12 soruluk zorluk merdiveni Etek sorularıyla başlar, Zirve'de biter. Her doğru cevap kuleye kat ekler; 4. ve 8. katlar GÜVENLİDİR — yanlışta oraya inersin, kule yıkılmaz. Yarı yarıya, Bilge Baykuş ve Çift Hak jokerleri; istediğin an puanını alıp çekilme stratejisi! Günde 3 deneme hakkıyla her giriş kıymetlidir. Ücretsiz, üyeliksiz."),
  dict(slug="labirent-avcisi", name="Labirent Avcısı", cat="Kelime / Labirent", age="7-12", players="Tek kişilik",
       teaches="Yazım sırası, planlama ve yön bulma",
       short="Labirentteki harfleri SIRAYLA topla — Unutkanlık Bulutu'na yakalanma!",
       about="Labirent Avcısı'nda noktalar yerine HARFLER var: hedef kelimeyi doğru sırayla toplamalısın. Yanlış harfe değersen sıra başa döner! Hayalet yok — onun yerine sevimli Unutkanlık Bulutu 🌫️ gezer; sana değerse 3 saniye kontrollerin TERS döner (korkutmaz, güldürür). Güç kapsülü bulutları 5 saniye dondurur. 3 farklı labirent, Zirve'de sahte çeldirici harfler! Kelime yazımı kas hafızasına işler. Ücretsiz, üyeliksiz."),
  dict(slug="cevap-kosusu", name="Cevap Koşusu", cat="Karma / Koşu", age="7-12", players="Tek kişilik",
       teaches="Tüm dersler + hızlı karar verme ve refleks",
       short="3 şeritli sonsuz koşu — yol ayrımında DOĞRU tabelanın şeridine geç!",
       about="Cevap Koşusu, sonsuz koşucu heyecanını bilgiyle birleştirir: 3 şeritli yolda koşar, kütüklerden zıplar, kayalardan kaçarsın. Her 15 saniyede YOL AYRIMI gelir — üç tabelada üç cevap; soruyu okuyup doğru tabelanın şeridine geçersen bonus, yanlış şerit çamurlu yol olur ve 5 saniye yavaşlarsın (ölüm yok!). Manzara mesafeyle değişir: orman, bulutlar ve UZAY. Dağ temalı portalın koşu hâli! Ücretsiz, üyeliksiz."),
  dict(slug="bilgi-savunmasi", name="Bilgi Savunması", cat="Strateji / Matematik", age="8-12", players="Tek kişilik",
       teaches="İşlem akıcılığı + kaynak yönetimi ve strateji",
       short="Soru çöz, enerji üret, kuleler dik — Soru Canavarlarından bahçeni koru!",
       about="Bilgi Savunması'nda savunma enerjisi BİLGİDEN gelir: alttaki hızlı soru panelinden her doğru cevap 25 enerji üretir; enerjiyle Fıstıkçı, Çifte, Duvar ve Bombacı kulelerini dikersin. Kuleler otomatik ateş eder ama bir canavar yaklaşırsa SON ŞANS hep vardır: canavarın üstüne dokun, sorusunu doğru cevapla, anında yok et — bilgi her zaman kazandırır! Etek'te 3 dalga, Zirve'de 7 dalga + 3 sorulu BOSS. Ücretsiz, üyeliksiz."),
  dict(slug="fizik-firlatma", name="Fizik Fırlatma", cat="Fen / Fizik", age="8-12", players="Tek kişilik",
       teaches="Açı, kuvvet ve yerçekimi — kinestetik fizik öğrenimi",
       short="Sapanı çek, AÇI ve KUVVETİ sayılarla gör, 12 bölümde yıldızları vur!",
       about="Fizik Fırlatma'da her atış bir fizik dersi: sapanı çekerken açı ve kuvvet SAYISAL olarak ekranda görünür (45° / kuvvet 70), bölüm sonunda 'en verimli açın' raporu gelir — deneme-yanılma değil, bilinçli ayar! Mermiler bilgiyle kazanılır: atış öncesi mini soruları çöz. 12 el yapımı bölüm; AY bölümlerinde yerçekimi düşüktür ve merminin süzülüşü kavramı kendiliğinden öğretir. Ücretsiz, üyeliksiz."),
  # --- 2026-09-15 (A5b): hub'da olup landing'i olmayan 3 online oyun ---
  dict(slug="son-kart", name="Son Kart", cat="Kart", age="6-12",
       players="Tek kişilik (bota karşı) ya da online 2-4 kişi", players_range=(1, 4),
       teaches="Renk-sayı eşleştirme, sıra takibi ve strateji",
       short="UNO tarzı kart oyunu: rengi ya da sayıyı eşleştir, elini ilk bitiren kazanır. Bota karşı ya da 2-4 kişi online.",
       about="Son Kart, UNO tarzında oynanan bir renk ve sayı eşleştirme kart oyunudur. Sıran gelince ortadaki kartla aynı renkte ya da aynı sayıda bir kart atarsın; uyan kartın yoksa desteden çekersin. Atla, Yön Değiştir, +2 ve Joker +4 gibi özel kartlar her eli yeniden karıştırır; tek kartın kalmadan önce “Son Kart!” demeyi unutursan 2 kart ceza çekersin. Tek başına 1-3 bota karşı oynayabilir, “Hızlı Eşleş” ile online rakip bulabilir ya da oda kodu kurup 2-4 arkadaşınla aynı masaya oturabilirsin. Sıra takibi, dikkat ve küçük stratejik kararlar eğlenerek gelişir. Ücretsiz, üyeliksiz, tarayıcıda oynanır."),
  dict(slug="hava-hokeyi", name="Hava Hokeyi", cat="Spor", age="6-12", players="Online 2 kişilik", players_range=(2, 2),
       teaches="Refleks, el-göz koordinasyonu ve açı sezgisi",
       short="Arkadaşınla online hava hokeyi: tokmağı kaydır, diski rakibin kalesine sok — ilk 7 golü atan kazanır!",
       about="Hava Hokeyi, bir arkadaşınla aynı anda oynadığın online 2 kişilik bir masa oyunudur. Biri kırmızı, diğeri mavi tokmağı alır; parmağın ya da farenle tokmağı kaydırıp diski rakibin kalesine sokmaya, kendi kaleni de korumaya çalışırsın. Disk bantlardan seker ve hız kazanır, her golden sonra geri sayımla yeniden başlarsınız; ilk 7 golü atan maçı kazanır. Lobide oda kurup kodu paylaşman yeterli, klavye gerekmez. Refleks, el-göz koordinasyonu ve açı sezgisi geliştiren ücretsiz, üyeliksiz bir online oyun."),
  dict(slug="zipla-topla-coop", name="Zıpla Topla Online", cat="Platform", age="6-12", players="Online 2 kişilik (co-op)", players_range=(2, 2),
       teaches="İş birliği, zamanlama ve koordinasyon",
       short="Mario tarzı platformlarda 2 kişilik online co-op: arkadaşınla birlikte zıpla, 12 bölümü beraber bitir!",
       about="Zıpla Topla Online, Mario tarzı 2 boyutlu platform oyunu Zıpla Topla'nın iki kişilik iş birliği (co-op) sürümüdür. Lobide oda kurup kodu paylaşırsın; arkadaşın katılınca aynı bölümde yan yana koşar, zıplar, altınları toplar ve kapıya birlikte ulaşırsınız. 3 tema × 4 seviye = 12 bölüm; hareketli platformlar, düşmanlar ve her bölümde yenilenen ortak 5 canlık havuz sizi birlikte plan yapmaya zorlar — birinin hatası herkesin canını yer, o yüzden zamanlama ve iletişim önemli. Klavye ya da dokunmatik kontrollerle oynanır. İş birliği, zamanlama ve el-göz koordinasyonunu geliştiren ücretsiz, üyeliksiz bir online platform oyunu."),
]
