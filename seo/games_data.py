#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Oyun verisi — bilnetoyun.com SEO ureticisinin veri modulu.
seo/build_seo.py bu modulu okur; landing, hub, sitemap ve llms.txt buradan turetilir.

GAMES artik burada YAZILMAZ: TEK KAYNAK data/games.json'dur (B2a; ayni dosyayi js/catalog.js uretici
tools/build-catalog.js, hub ve duman testi de okur). Yeni oyun / metin degisikligi JSON'a yapilir,
sonra npm run catalog ve python seo/build_seo.py calistirilir. STATIC_PAGES (HTML icerik) burada kalir.

JSON kayit alanlari (build_seo.py'nin okuduklari; tam sozluk: docs/inceleme-2026-09-15/kanit/B2a-veri-notlari.md):
  slug     : SPA oyun id'si (derin-link: /?oyun=<slug>, js/app.js tryDeepLink)
  name     : gorunen ad (title/H1/JSON-LD; hub karti da ayni adi kullanir)
  cat      : SEO tur etiketi (title, JSON-LD genre, /oyunlar/ karti)
  age      : [min, max] yas araligi (JSON-LD suggestedMinAge/MaxAge; metin icin age_label())
  minutes  : tipik tur suresi, dakika (hub karti; B2b ogretmen anahtari)
  subject  : ders anahtari (turkce|ingilizce|matematik|fen|kodlama|strateji|sanat|spor|genel)
  players  : kac kisilik (metin). "online" geciyorsa playMode=MultiPlayer
  players_range : [min, max|null] oyuncu sayisi (JSON-LD numberOfPlayers)
  teaches  : ne kazandirir (JSON-LD teaches)
  short    : tek cumle (hub karti + meta description govdesi; ~<=110 karakter tut)
  about    : uzun aciklama (landing govdesi + JSON-LD description)
  active   : False -> sayfa uretilir ama noindex, "Cok yakinda", hub/sitemap/llms disi (hub'da "Yakinda" karti)
  module / online : hub alanlari; buradan yalniz also_online turetilir (ikisi de varsa: ayni sayfada
                    online surum de var, toplam oyun sayisinda +1 sayilir)
"""
import json
import os

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
           "<li><strong>cdnjs.cloudflare.com</strong> — yalnızca LEGO World 3D açıldığında three.js kitaplığı buradan yüklenir. Satranç (chess.js) ve LEGO World'ün model yükleyicisi bilnetoyun.com'un kendi sunucusundan gelir.</li>\n"
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
         ("Açık kaynak ve lisanslar", "lisanslar", [
           "Satranç taş görselleri <a href=\"https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces\" target=\"_blank\" rel=\"noopener\">Wikimedia Commons</a> üzerindeki Cburnett setinden alınmıştır ve <a href=\"https://creativecommons.org/licenses/by-sa/3.0/deed.tr\" target=\"_blank\" rel=\"noopener\">CC BY-SA 3.0</a> lisansıyla kullanılır; görseller bilnetoyun.com'un kendi sunucusundan yüklenir. Yazı tipleri Fredoka ve Nunito, SIL Open Font License ile self-host edilir. Satranç kuralları için <a href=\"https://github.com/jhlywa/chess.js\" target=\"_blank\" rel=\"noopener\">chess.js</a> (BSD-2), LEGO World 3D için <a href=\"https://github.com/mrdoob/three.js\" target=\"_blank\" rel=\"noopener\">three.js</a> (MIT) kullanılır.",
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

# ---------------------------------------------------------------- oyunlar: data/games.json
_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "games.json")


def _load_data(path=_DATA_PATH):
  with open(path, encoding="utf-8") as f:
    return json.load(f)


def _load_games(data):
  """data/games.json -> kayit listesi (dict'ler). also_online turetilir; alanlar oldugu gibi gecer."""
  games = []
  for rec in data["games"]:
    g = dict(rec)
    g["also_online"] = bool(g.get("module")) and bool(g.get("online"))
    games.append(g)
  return games


_DATA = _load_data()
GAMES = _load_games(_DATA)
# Yas raflari (B2b): {id, label, yas, ages [ilk, son]} — kapali tam yas araligi; /oyunlar/ suzgeci bunu okur.
SHELVES = list(_DATA.get("shelves", []))
# Hub bolumleri (kategori): {id, title, icon, color} — /oyunlar/ kategori suzgeci + kart seridi.
SECTIONS = list(_DATA.get("sections", []))


def shelves_of(g):
  """Oyunun girdigi raf id'leri. Kural js/hub-ia.js inShelf ve tools/build-catalog.js shelvesOf ile AYNI:
  oyun age [min,max] rafin ages [ilk,son] araligiyla kesisiyorsa girer (ucu birlikte degisir)."""
  age = g.get("age")
  if not isinstance(age, (list, tuple)) or len(age) != 2:
    return []
  return [s["id"] for s in SHELVES if age[0] <= s["ages"][1] and age[1] >= s["ages"][0]]
