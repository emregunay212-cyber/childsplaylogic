/* ============================================
   SpaceWaves — Bilişim Soruları (4. sınıf seviyesi)
   100 adet soru, zorluk 1-5
   ============================================ */

const SPACE_WAVES_QUESTIONS = [
  // ---- Kolay (1) — Bilgisayar parçaları ----
  { q: 'Bilgisayarda yazı yazmak için hangi parça kullanılır?', options: ['Fare', 'Klavye', 'Hoparlör', 'Ekran'], correctIdx: 1, difficulty: 1 },
  { q: 'Bilgisayarın görüntüyü gösterdiği parça hangisidir?', options: ['Klavye', 'Ekran', 'Fare', 'Kasa'], correctIdx: 1, difficulty: 1 },
  { q: 'Farenin görevi nedir?', options: ['Ses çıkarır', 'İmleci hareket ettirir', 'Görüntü verir', 'Yazı yazar'], correctIdx: 1, difficulty: 1 },
  { q: 'Bilgisayardan ses duymak için hangisi gerekir?', options: ['Hoparlör', 'Klavye', 'Fare', 'Yazıcı'], correctIdx: 0, difficulty: 1 },
  { q: 'Kağıda yazı veya resim basan aygıt hangisidir?', options: ['Tarayıcı', 'Yazıcı', 'Kamera', 'Mikrofon'], correctIdx: 1, difficulty: 1 },
  { q: 'Ses kaydı yapmak için ne kullanılır?', options: ['Hoparlör', 'Mikrofon', 'Kamera', 'Ekran'], correctIdx: 1, difficulty: 1 },
  { q: 'Bilgisayarın beyni olarak adlandırılan parça hangisidir?', options: ['Ekran', 'Klavye', 'İşlemci (CPU)', 'Fare'], correctIdx: 2, difficulty: 2 },
  { q: 'Hafızayı geçici olarak tutan parça hangisidir?', options: ['RAM', 'Ekran', 'Klavye', 'Hoparlör'], correctIdx: 0, difficulty: 2 },
  { q: 'Bilgileri kalıcı olarak saklayan parça hangisidir?', options: ['RAM', 'Sabit Disk (HDD/SSD)', 'Fare', 'Klavye'], correctIdx: 1, difficulty: 2 },
  { q: 'Dizüstü bilgisayarın diğer adı nedir?', options: ['Laptop', 'Tablet', 'Akıllı saat', 'Oyun konsolu'], correctIdx: 0, difficulty: 1 },

  // ---- Kolay-Orta (2) — Yazılım/Donanım ----
  { q: 'Dokunabildiğimiz bilgisayar parçalarına ne denir?', options: ['Yazılım', 'Donanım', 'İnternet', 'Sanal'], correctIdx: 1, difficulty: 2 },
  { q: 'Programlara ve uygulamalara ne denir?', options: ['Donanım', 'Yazılım', 'Kablo', 'Fiş'], correctIdx: 1, difficulty: 2 },
  { q: 'Aşağıdakilerden hangisi yazılımdır?', options: ['Klavye', 'Fare', 'Web tarayıcısı', 'Ekran'], correctIdx: 2, difficulty: 2 },
  { q: 'Aşağıdakilerden hangisi donanımdır?', options: ['Oyun', 'Klavye', 'Web sitesi', 'Uygulama'], correctIdx: 1, difficulty: 2 },
  { q: 'İşletim sistemi ne tür bir şeydir?', options: ['Donanım', 'Yazılım', 'Kablo', 'Ekran'], correctIdx: 1, difficulty: 3 },
  { q: 'Aşağıdakilerden hangisi bir işletim sistemidir?', options: ['Windows', 'Word', 'Chrome', 'YouTube'], correctIdx: 0, difficulty: 2 },
  { q: 'Telefonlarda kullanılan işletim sistemi aşağıdakilerden hangisidir?', options: ['Android', 'Word', 'Paint', 'Excel'], correctIdx: 0, difficulty: 2 },
  { q: 'Fotoğraf düzenlemek için kullanılan program türü?', options: ['Metin editörü', 'Fotoğraf/resim editörü', 'Web tarayıcı', 'Hesap makinesi'], correctIdx: 1, difficulty: 2 },
  { q: 'Yazı yazmak için hangi program kullanılır?', options: ['Word', 'Paint', 'Chrome', 'VLC'], correctIdx: 0, difficulty: 2 },
  { q: 'Video izlemek için hangisi kullanılır?', options: ['Hesap makinesi', 'VLC / Video oynatıcı', 'Paint', 'Notepad'], correctIdx: 1, difficulty: 2 },

  // ---- Orta (3) — İnternet ----
  { q: 'Web sitelerini görüntülemek için ne kullanılır?', options: ['Web tarayıcı', 'Yazıcı', 'Kamera', 'Hoparlör'], correctIdx: 0, difficulty: 2 },
  { q: 'Aşağıdakilerden hangisi bir web tarayıcısıdır?', options: ['Chrome', 'Word', 'Excel', 'Paint'], correctIdx: 0, difficulty: 2 },
  { q: 'Web sayfalarının adresine ne denir?', options: ['URL', 'CPU', 'RAM', 'GPU'], correctIdx: 0, difficulty: 3 },
  { q: '"www" ne anlama gelir?', options: ['World Wide Web', 'Windows Web Wireless', 'Web World Works', 'Wonderful Web World'], correctIdx: 0, difficulty: 3 },
  { q: 'E-posta göndermek için aşağıdakilerden hangisi gerekir?', options: ['İnternet bağlantısı', 'Yazıcı', 'Tarayıcı (belge)', 'Hoparlör'], correctIdx: 0, difficulty: 2 },
  { q: 'Aşağıdaki sembolün adı nedir: @', options: ['Et işareti', 'Diyez', 'Dolar', 'Virgül'], correctIdx: 0, difficulty: 3 },
  { q: 'İnternet üzerinden arama yapmak için hangisi kullanılabilir?', options: ['Google', 'Word', 'Paint', 'Excel'], correctIdx: 0, difficulty: 1 },
  { q: 'Wi-Fi nedir?', options: ['Kablosuz internet', 'Bir tür klavye', 'Bir oyun', 'Bir işletim sistemi'], correctIdx: 0, difficulty: 2 },
  { q: 'İnternete bağlanmayı sağlayan kutuya ne denir?', options: ['Modem/Router', 'Yazıcı', 'Ekran', 'Fare'], correctIdx: 0, difficulty: 3 },
  { q: 'Web sitelerini indiren küçük programlara ne denir?', options: ['Tarayıcı', 'Virüs', 'Oyun', 'Klasör'], correctIdx: 0, difficulty: 3 },

  // ---- Orta (3) — Güvenlik ----
  { q: 'İnternette tanımadığın kişilere kişisel bilgilerini vermeli misin?', options: ['Evet', 'Hayır', 'Bazen', 'Her zaman'], correctIdx: 1, difficulty: 2 },
  { q: 'Şifre nasıl olmalı?', options: ['Kolay tahmin edilebilen', 'Herkesin bildiği', 'Güçlü ve gizli', 'Sadece 1 harf'], correctIdx: 2, difficulty: 2 },
  { q: 'Bilgisayara zarar veren programa ne denir?', options: ['Oyun', 'Virüs', 'Tarayıcı', 'Yazıcı'], correctIdx: 1, difficulty: 2 },
  { q: 'Virüslerden korunmak için kullanılan program?', options: ['Antivirüs', 'Oyun', 'Paint', 'Word'], correctIdx: 0, difficulty: 3 },
  { q: 'Sosyal medyada paylaşımlar yapılırken nelere dikkat etmeliyiz?', options: ['Kişisel bilgi paylaşmamaya', 'Herkese herşeyi söylemeye', 'Adres vermeye', 'Telefon paylaşmaya'], correctIdx: 0, difficulty: 3 },
  { q: 'Bilinmeyen linklere tıklamak güvenli midir?', options: ['Evet', 'Hayır', 'Her zaman', 'Bazen'], correctIdx: 1, difficulty: 2 },
  { q: 'Şifrenizi kiminle paylaşmalısınız?', options: ['Sadece aileniz bilebilir', 'Hiç kimseyle / gerektiğinde aileyle', 'Arkadaşlarla', 'Herkesle'], correctIdx: 1, difficulty: 3 },
  { q: 'Bilgisayarda kötü bir şey yazıyorsa ne yapmalısın?', options: ['Kapatıp büyüğüne söylemelisin', 'Tıklamalısın', 'Yanıt vermelisin', 'Paylaşmalısın'], correctIdx: 0, difficulty: 2 },
  { q: 'İnternette görülen her bilgi doğru mudur?', options: ['Evet, hepsi doğru', 'Hayır, doğruluğu araştırılmalı', 'Sadece resimler doğru', 'Sadece videolar doğru'], correctIdx: 1, difficulty: 3 },
  { q: 'Güvenli şifrede ne olmalı?', options: ['Harf, rakam ve sembol', 'Sadece 1', 'Sadece "1234"', 'Sadece "abc"'], correctIdx: 0, difficulty: 3 },

  // ---- Orta-Zor (4) — Dosya/Klasör ----
  { q: 'Dosyaları saklamak için kullandığımız yapıya ne denir?', options: ['Klasör', 'Ekran', 'Kablo', 'Fare'], correctIdx: 0, difficulty: 2 },
  { q: '".txt" uzantısı hangi tür dosyaya aittir?', options: ['Metin', 'Resim', 'Video', 'Ses'], correctIdx: 0, difficulty: 3 },
  { q: '".jpg" uzantısı hangi tür dosyaya aittir?', options: ['Metin', 'Resim', 'Video', 'Ses'], correctIdx: 1, difficulty: 3 },
  { q: '".mp3" uzantısı hangi tür dosyaya aittir?', options: ['Resim', 'Ses', 'Metin', 'Video'], correctIdx: 1, difficulty: 3 },
  { q: '".mp4" uzantısı hangi tür dosyaya aittir?', options: ['Video', 'Resim', 'Ses', 'Metin'], correctIdx: 0, difficulty: 3 },
  { q: '".pdf" uzantısı hangi tür dosyaya aittir?', options: ['Belge', 'Oyun', 'Video', 'Ses'], correctIdx: 0, difficulty: 4 },
  { q: 'Bir dosya silindiğinde nereye gider?', options: ['Çöp Kutusu / Geri Dönüşüm Kutusu', 'Masaüstü', 'Belgeler', 'İnternet'], correctIdx: 0, difficulty: 3 },
  { q: 'Dosya kopyalamak için hangi klavye kısayolu kullanılır?', options: ['Ctrl + C', 'Ctrl + V', 'Ctrl + X', 'Ctrl + Z'], correctIdx: 0, difficulty: 4 },
  { q: 'Yapıştırmak için hangi kısayol kullanılır?', options: ['Ctrl + V', 'Ctrl + C', 'Ctrl + Z', 'Ctrl + S'], correctIdx: 0, difficulty: 4 },
  { q: 'Dosyayı kaydetmek için hangi kısayol kullanılır?', options: ['Ctrl + S', 'Ctrl + C', 'Ctrl + V', 'Ctrl + Z'], correctIdx: 0, difficulty: 4 },

  // ---- Orta-Zor (4) — Klavye/Kısayollar ----
  { q: 'Geri almak için hangi kısayol kullanılır?', options: ['Ctrl + Z', 'Ctrl + Y', 'Ctrl + S', 'Ctrl + V'], correctIdx: 0, difficulty: 4 },
  { q: 'Büyük harf yazmak için hangi tuş basılı tutulur?', options: ['Shift', 'Tab', 'Alt', 'Ctrl'], correctIdx: 0, difficulty: 3 },
  { q: 'Harfleri sürekli büyük yazmak için hangi tuş?', options: ['Caps Lock', 'Shift', 'Alt', 'Ctrl'], correctIdx: 0, difficulty: 3 },
  { q: 'İki kelime arasında boşluk için hangi tuşa basılır?', options: ['Space (boşluk)', 'Enter', 'Tab', 'Shift'], correctIdx: 0, difficulty: 2 },
  { q: 'Yeni satıra geçmek için hangi tuş?', options: ['Enter', 'Shift', 'Alt', 'Space'], correctIdx: 0, difficulty: 2 },
  { q: 'Bir harfi silmek için hangi tuş?', options: ['Backspace', 'Enter', 'Shift', 'Tab'], correctIdx: 0, difficulty: 2 },
  { q: 'Kesmek (Kes) için hangi kısayol?', options: ['Ctrl + X', 'Ctrl + C', 'Ctrl + V', 'Ctrl + A'], correctIdx: 0, difficulty: 4 },
  { q: 'Tümünü seçmek için hangi kısayol?', options: ['Ctrl + A', 'Ctrl + S', 'Ctrl + C', 'Ctrl + V'], correctIdx: 0, difficulty: 4 },
  { q: 'Yazdırmak için hangi kısayol?', options: ['Ctrl + P', 'Ctrl + C', 'Ctrl + S', 'Ctrl + F'], correctIdx: 0, difficulty: 4 },
  { q: 'Bulmak (arama) için hangi kısayol?', options: ['Ctrl + F', 'Ctrl + S', 'Ctrl + A', 'Ctrl + Z'], correctIdx: 0, difficulty: 4 },

  // ---- Orta (3) — Sayılar/Birimler ----
  { q: 'Bilgisayarda en küçük bilgi birimine ne denir?', options: ['Bit', 'Byte', 'MB', 'GB'], correctIdx: 0, difficulty: 4 },
  { q: '1 Byte kaç bit eder?', options: ['8', '4', '10', '16'], correctIdx: 0, difficulty: 5 },
  { q: 'Hangisi en büyüktür?', options: ['KB', 'MB', 'GB', 'Byte'], correctIdx: 2, difficulty: 4 },
  { q: 'Hangisi en küçüktür?', options: ['GB', 'MB', 'KB', 'Byte'], correctIdx: 3, difficulty: 4 },
  { q: '1 KB yaklaşık kaç byte eder?', options: ['1000', '100', '10', '1'], correctIdx: 0, difficulty: 5 },
  { q: 'Bilgisayarlar sadece hangi iki sayıyı anlar?', options: ['0 ve 1', '1 ve 2', '5 ve 10', '8 ve 9'], correctIdx: 0, difficulty: 4 },
  { q: 'Bu "0 ve 1" sayı sistemine ne denir?', options: ['İkili (binary)', 'Onluk', 'Ondalık', 'Romen'], correctIdx: 0, difficulty: 5 },
  { q: 'Ekranda görüntüyü oluşturan en küçük noktaya ne denir?', options: ['Piksel', 'Bit', 'Byte', 'Çerçeve'], correctIdx: 0, difficulty: 4 },

  // ---- Orta-Zor (4) — Programlama temelleri ----
  { q: 'Bilgisayara bir iş yaptırmak için yazılan komut dizisine ne denir?', options: ['Program / Kod', 'Oyun', 'Resim', 'Video'], correctIdx: 0, difficulty: 3 },
  { q: 'Bir işin tekrar tekrar yapılmasını sağlayan yapıya ne denir?', options: ['Döngü', 'Karar', 'Değişken', 'Resim'], correctIdx: 0, difficulty: 4 },
  { q: '"Eğer ... ise" yapısına programlamada ne denir?', options: ['Karar / Koşul', 'Döngü', 'Değişken', 'Fonksiyon'], correctIdx: 0, difficulty: 4 },
  { q: 'Scratch ne için kullanılır?', options: ['Kodlama öğrenmek', 'Film izlemek', 'Fotoğraf çekmek', 'Müzik dinlemek'], correctIdx: 0, difficulty: 3 },
  { q: 'Bir bilgiyi saklamak için kullanılan kutulara ne denir?', options: ['Değişken', 'Döngü', 'Koşul', 'Dosya'], correctIdx: 0, difficulty: 4 },
  { q: 'Algoritma nedir?', options: ['Bir işin adım adım çözümü', 'Bir oyun', 'Bir donanım', 'Bir dosya'], correctIdx: 0, difficulty: 4 },
  { q: 'Python nedir?', options: ['Bir programlama dili', 'Bir oyun', 'Bir film', 'Bir süper kahraman'], correctIdx: 0, difficulty: 4 },
  { q: 'HTML ne için kullanılır?', options: ['Web sayfası yapmak', 'Film izlemek', 'Ses kaydı', 'Oyun oynamak'], correctIdx: 0, difficulty: 5 },

  // ---- Kolay-Orta — Genel ----
  { q: 'Bilgisayarı açmak için hangi düğmeye basılır?', options: ['Power (güç)', 'Enter', 'Shift', 'Alt'], correctIdx: 0, difficulty: 1 },
  { q: 'USB ne işe yarar?', options: ['Veri ve güç aktarımı', 'Ses çıkarmak', 'Isı vermek', 'Görüntü çizmek'], correctIdx: 0, difficulty: 3 },
  { q: 'Flash bellek ne için kullanılır?', options: ['Dosya taşımak/saklamak', 'Yemek pişirmek', 'Ses çalmak', 'Ekran açmak'], correctIdx: 0, difficulty: 3 },
  { q: 'CD veya DVD ne için kullanılır?', options: ['Veri/film/müzik kaydetmek', 'Çay içmek', 'Kapı açmak', 'Yol bulmak'], correctIdx: 0, difficulty: 3 },
  { q: 'Dokunmatik ekran nedir?', options: ['Parmakla kontrol edilebilen ekran', 'Sadece klavyeli ekran', 'Kırık ekran', 'Siyah ekran'], correctIdx: 0, difficulty: 2 },
  { q: 'Akıllı telefonlarda klavye genellikle nerededir?', options: ['Ekranda (dokunmatik)', 'Arkada', 'Yan tarafta', 'Yok'], correctIdx: 0, difficulty: 2 },
  { q: 'QR kod neye yarar?', options: ['Hızlıca bilgi/site açmak', 'Yemek pişirmek', 'Ev süslemek', 'Yağ ölçmek'], correctIdx: 0, difficulty: 3 },
  { q: 'Emoji nedir?', options: ['Küçük resim/simge', 'Virüs', 'Klasör', 'Yazıcı'], correctIdx: 0, difficulty: 2 },
  { q: 'E-posta adresinde mutlaka bulunması gereken işaret?', options: ['@', '#', '$', '&'], correctIdx: 0, difficulty: 3 },
  { q: 'Web sitesi linki hangi harflerle başlar?', options: ['http / https', 'abc', 'zzz', 'xyz'], correctIdx: 0, difficulty: 3 },

  // ---- Zor (5) — İleri ----
  { q: 'HTTPS\'deki "S" harfi neyi ifade eder?', options: ['Secure (güvenli)', 'Simple', 'Small', 'Super'], correctIdx: 0, difficulty: 5 },
  { q: 'Bulut (cloud) depolama nedir?', options: ['İnternet üzerinden dosya saklamak', 'Gökyüzü', 'Yağmur', 'Buhar'], correctIdx: 0, difficulty: 4 },
  { q: 'Google Drive hangi hizmeti verir?', options: ['Bulut depolama', 'Yemek siparişi', 'Taksi çağırma', 'Oyun oynatma'], correctIdx: 0, difficulty: 4 },
  { q: 'Zoom / Meet ne için kullanılır?', options: ['Görüntülü toplantı', 'Fotoğraf düzenleme', 'Müzik dinleme', 'Oyun oynama'], correctIdx: 0, difficulty: 3 },
  { q: 'Yapay zekâ (AI) nedir?', options: ['Bilgisayarın öğrenmesi ve düşünebilmesi', 'Bir oyun', 'Bir film', 'Yalnızca robot'], correctIdx: 0, difficulty: 5 },
  { q: 'Bir robot nedir?', options: ['Programlanabilen makine', 'Canlı hayvan', 'Bitki', 'Yemek'], correctIdx: 0, difficulty: 3 },
  { q: 'Sosyal medya ne demektir?', options: ['İnsanların paylaşım yaptığı internet siteleri', 'Sadece haber siteleri', 'Sadece oyunlar', 'Sadece alışveriş'], correctIdx: 0, difficulty: 3 },
  { q: 'Spam nedir?', options: ['İstenmeyen e-posta', 'Bir yemek', 'Oyun türü', 'Klasör türü'], correctIdx: 0, difficulty: 5 },
  { q: 'Çerez (cookie) nedir?', options: ['Web sitesinin tarayıcıya kaydettiği küçük bilgi', 'Bisküvi türü', 'Oyun türü', 'Dosya türü'], correctIdx: 0, difficulty: 5 },
  { q: 'İnternette başkasının yazdığını kopyalayıp kendinmiş gibi sunmak ne demek?', options: ['İntihal (kopyalama)', 'Paylaşım', 'Araştırma', 'Oyun'], correctIdx: 0, difficulty: 5 },
];

if (typeof window !== 'undefined') {
  window.SPACE_WAVES_QUESTIONS = SPACE_WAVES_QUESTIONS;
}
