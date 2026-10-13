/* ============================================
   Klavye Kâşifi — kısım ve bölüm içeriği (modülden ÖNCE yüklenir: data/games.json files.js sırası)
   --------------------------------------------
   Sıra (sahip kararı, 13 Eki 2026): Harfler → Heceler → Kelimeler → Cümleler → Rakamlar → Noktalama.
   Kısım = motor seviyesi (araç çubuğu noktası, yıldız kaydı); bölüm = kısım içindeki tur dizisi.
   Oyun açılınca başlangıç seçici: kısım kartı (kısmın başı) ya da bölüm numarası; oradan sonra bölümler
   arasında düğme yok, oyun çıkılana kadar kendiliğinden ilerler.
   Kısım alanları: id, name, sample (seçici kartındaki örnek), stages.
   Bölüm alanları:
     name   ekranda görünen bölüm adı
     kind   'key'      tek tuş (büyük kart)
            'word'     harf kutuları + sonunda Boşluk (hece, kelime, sayı)
            'sentence' akan satır; boşluklar ve noktalama dahil, son karakterle biter
     hint   'always'   hedef tuş hep yanar · 'delayed' 5 sn boşta ya da yanlışta yanar
     order  'fixed'    sırayla (yoksa her girişte karışır)
     tip    (isteğe bağlı) yönerge metni — yoksa türün varsayılanı
     items  'metin' ya da ['metin', 'emoji'] — yalnız ekran klavyesindeki karakterler (test denetler)
   Bölüm ≤ 12 tur (defter yuvaları dar telefona sığsın). Süre bütçesi: tests/klavye-kasifi.spec.js
   "35 dakikalık ders" testi (orta hız bitiremez, usta bitirir).
   ============================================ */

window.KLAVYE_KASIFI_ICERIK = [
    // ===== 1. HARFLER: klavyedeki 32 harf (29 Türkçe + Q W X) =====
    {
        id: 'harf',
        name: 'Harfler',
        sample: 'A S D F',
        stages: [
            { name: 'Orta sıra', kind: 'key', hint: 'always', items: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'] },
            { name: 'Üst sıra', kind: 'key', hint: 'always', items: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'] },
            { name: 'Alt sıra', kind: 'key', hint: 'always', items: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'] },
            { name: 'Sesli harfler', kind: 'key', hint: 'delayed', items: ['A', 'E', 'I', 'İ', 'O', 'Ö', 'U', 'Ü'] },
            { name: 'Sessiz harfler 1', kind: 'key', hint: 'delayed', items: ['B', 'C', 'Ç', 'D', 'F', 'G', 'Ğ', 'H', 'J', 'K', 'L', 'M'] },
            { name: 'Sessiz harfler 2', kind: 'key', hint: 'delayed', items: ['N', 'P', 'R', 'S', 'Ş', 'T', 'V', 'Y', 'Z', 'Q', 'W', 'X'] },
        ],
    },
    // ===== 2. HECELER =====
    {
        id: 'hece',
        name: 'Heceler',
        sample: 'BA · KE · TOP',
        stages: [
            { name: 'Açık heceler 1', kind: 'word', hint: 'delayed', tip: 'Heceyi yaz, sonra Boşluk!', items: ['BA', 'BE', 'DA', 'Dİ', 'KA', 'KO', 'LA', 'LE', 'MA', 'Mİ', 'NE', 'NU'] },
            { name: 'Açık heceler 2', kind: 'word', hint: 'delayed', tip: 'Heceyi yaz, sonra Boşluk!', items: ['SA', 'SU', 'TA', 'Tİ', 'YA', 'YE', 'RA', 'RO', 'ÇA', 'ÇO', 'ŞU', 'ŞE'] },
            { name: 'Kapalı heceler', kind: 'word', hint: 'delayed', tip: 'Heceyi yaz, sonra Boşluk!', items: ['AL', 'AT', 'EL', 'EV', 'İN', 'İŞ', 'OK', 'ON', 'UÇ', 'UN', 'ÖN', 'ÜÇ'] },
            { name: 'Üç harfli heceler 1', kind: 'word', hint: 'delayed', tip: 'Heceyi yaz, sonra Boşluk!', items: ['BAL', 'KAL', 'MAS', 'SAR', 'TOP', 'KOL', 'GEL', 'SEN', 'BİR', 'KIŞ', 'YOL', 'DUR'] },
            { name: 'Üç harfli heceler 2', kind: 'word', hint: 'delayed', tip: 'Heceyi yaz, sonra Boşluk!', items: ['ÇAY', 'ŞEN', 'GÖZ', 'KÜL', 'YÜZ', 'DİŞ', 'KAŞ', 'SÜT', 'ÇOK', 'TAŞ', 'PİL', 'GÜN'] },
        ],
    },
    // ===== 3. KELİMELER =====
    {
        id: 'kelime',
        name: 'Kelimeler',
        sample: 'ELMA · KÖPEK',
        stages: [
            { name: 'Kısa kelimeler', kind: 'word', hint: 'delayed', items: [['EV', '🏠'], ['AT', '🐴'], ['SU', '💧'], ['OK', '🏹'], ['AY', '🌙'], ['KUŞ', '🐦'], ['FİL', '🐘'], ['GÜL', '🌹'], ['BAL', '🍯'], ['DAĞ', '⛰️'], ['ZİL', '🔔'], ['TOP', '⚽']] },
            { name: 'Dört harfli kelimeler', kind: 'word', hint: 'delayed', items: [['ELMA', '🍎'], ['KEDİ', '🐱'], ['KAPI', '🚪'], ['GEMİ', '🚢'], ['KUZU', '🐑'], ['FARE', '🐭'], ['ÜZÜM', '🍇'], ['KALE', '🏰'], ['KUTU', '📦'], ['OKUL', '🏫'], ['BOYA', '🎨'], ['SAAT', '⌚']] },
            { name: 'Beş harfli kelimeler', kind: 'word', hint: 'delayed', items: [['ARMUT', '🍐'], ['BALIK', '🐟'], ['ÇİÇEK', '🌸'], ['ÇİLEK', '🍓'], ['ÇANTA', '🎒'], ['DENİZ', '🌊'], ['KÖPEK', '🐶'], ['BULUT', '☁️'], ['ŞEKER', '🍬'], ['KAŞIK', '🥄'], ['LİMON', '🍋'], ['KALEM', '✏️']] },
            { name: 'Türkçe harfler', kind: 'word', hint: 'delayed', items: [['AĞAÇ', '🌳'], ['IŞIK', '💡'], ['GÖZLÜK', '👓'], ['ŞİŞE', '🍾'], ['KÖPRÜ', '🌉'], ['GÜNEŞ', '☀️'], ['ÜÇGEN', '🔺'], ['YAĞMUR', '🌧️'], ['ŞAPKA', '🎩'], ['ÇORAP', '🧦'], ['ÖRDEK', '🦆'], ['BÖCEK', '🐛']] },
            { name: 'Uzun kelimeler', kind: 'word', hint: 'delayed', items: [['TAVŞAN', '🐰'], ['KELEBEK', '🦋'], ['MAYMUN', '🐒'], ['ZÜRAFA', '🦒'], ['KARPUZ', '🍉'], ['DOMATES', '🍅'], ['TELEFON', '📱'], ['SİNCAP', '🐿️'], ['PENGUEN', '🐧'], ['KAMYON', '🚚'], ['TRAKTÖR', '🚜'], ['PATATES', '🥔']] },
            { name: 'Çok uzun kelimeler', kind: 'word', hint: 'delayed', items: [['BİLGİSAYAR', '💻'], ['PORTAKAL', '🍊'], ['BİSİKLET', '🚲'], ['HELİKOPTER', '🚁'], ['DONDURMA', '🍦'], ['ÇİKOLATA', '🍫'], ['KAPLUMBAĞA', '🐢'], ['SALYANGOZ', '🐌'], ['AYAKKABI', '👟'], ['GÖKKUŞAĞI', '🌈']] },
        ],
    },
    // ===== 4. CÜMLELER (noktalamasız: noktalama 6. kısımda) =====
    {
        id: 'cumle',
        name: 'Cümleler',
        sample: 'Kedi süt içti',
        stages: [
            { name: 'İki kelimelik cümleler', kind: 'sentence', hint: 'delayed', items: [['Kedi uyudu', '🐱'], ['Ali koştu', '🏃'], ['Kuş uçtu', '🐦'], ['Bebek güldü', '👶'], ['Su aktı', '💧'], ['Top düştü', '⚽'], ['Güneş doğdu', '🌅'], ['Ayşe okudu', '📖']] },
            { name: 'Üç kelimelik cümleler', kind: 'sentence', hint: 'delayed', items: [['Ali topu attı', '⚽'], ['Kedi süt içti', '🐱'], ['Ben elma yedim', '🍎'], ['Kuşlar ağaçta öter', '🐦'], ['Annem kek yaptı', '🍰'], ['Babam çay içti', '☕'], ['Balık suda yüzer', '🐟'], ['Arı bal yapar', '🐝']] },
            { name: 'Kısa cümleler', kind: 'sentence', hint: 'delayed', items: [['Bugün hava güzel', '☀️'], ['Okula erken geldim', '🏫'], ['Köpek kemik buldu', '🐶'], ['Dışarıda kar yağıyor', '❄️'], ['Elif resim yaptı', '🎨'], ['Tren çok hızlı', '🚂'], ['Bahçede çiçekler açtı', '🌸'], ['Ayşe ip atladı', '🤸']] },
            { name: 'Dört kelimelik cümleler', kind: 'sentence', hint: 'delayed', items: [['Her sabah kitap okurum', '📚'], ['Kardeşim parkta salıncağa bindi', '🎠'], ['Kırmızı balon gökyüzüne uçtu', '🎈'], ['Dedem bahçede domates yetiştirir', '🍅'], ['Kedimiz yumuşak minderde uyur', '🐱'], ['Okulda yeni arkadaşlar edindim', '🏫'], ['Anneannem bize kurabiye yaptı', '🍪'], ['Sincap ağaçtan fındık topladı', '🐿️']] },
            { name: 'Beş kelimelik cümleler', kind: 'sentence', hint: 'delayed', items: [['Yaz tatilinde ailemle denize gittim', '🏖️'], ['Öğretmenimiz bize güzel bir masal okudu', '📖'], ['Küçük kedi yumağı odada kovaladı', '🧶'], ['Babam akşam yemeğinde makarna pişirdi', '🍝'], ['Bahçedeki ağaçlar sonbaharda yaprak döker', '🍂'], ['Kardeşimle birlikte oyuncak kule yaptık', '🧱'], ['Futbol maçında iki gol attım', '⚽'], ['Ormanda yürürken bir tavşan gördük', '🐰']] },
            { name: 'Uzun cümleler', kind: 'sentence', hint: 'delayed', items: [['Hafta sonu dedemlerin köyüne gidip inekleri besledik', '🐄'], ['Kütüphaneden aldığım kitabı iki günde bitirdim', '📚'], ['Yağmur durunca gökyüzünde kocaman bir gökkuşağı belirdi', '🌈'], ['Annem pazardan taze çilek ve kiraz aldı', '🍓'], ['Sınıfımızdaki akvaryumda rengarenk balıklar yüzüyor', '🐠'], ['Teneffüste arkadaşlarımla bahçede saklambaç oynadık', '🙈'], ['Kış gelince dağların tepesi bembeyaz karla kaplanır', '🏔️'], ['Bilgisayar dersinde klavyede hızlı yazmayı öğreniyoruz', '⌨️']] },
            { name: 'Atasözleri', kind: 'sentence', hint: 'delayed', items: [['Damlaya damlaya göl olur', '💧'], ['Ağaç yaşken eğilir', '🌳'], ['Bilmemek ayıp değil öğrenmemek ayıp', '📚'], ['Sakla samanı gelir zamanı', '🌾'], ['Birlikten kuvvet doğar', '🤝'], ['Az olsun öz olsun', '💎'], ['İşleyen demir pas tutmaz', '🔨'], ['Bugünün işini yarına bırakma', '⏰']] },
            { name: 'Tekerlemeler', kind: 'sentence', hint: 'delayed', items: [['Şu köşe yaz köşesi şu köşe kış köşesi ortada su şişesi', '🍶'], ['Kartal kalkar dal sarkar dal sarkar kartal kalkar', '🦅'], ['Al bu takatukaları takatukacıya götür', '📦'], ['Bu yoğurdu sarımsaklasak da mı saklasak sarımsaklamasak da mı saklasak', '🥛'], ['Kırk küp kırkının da kulpu kırık küp', '🏺'], ['Şemsi Paşa pasajında sesi büzüşesiceler', '🏛️']] },
            { name: 'Usta cümleleri', kind: 'sentence', hint: 'delayed', items: [['Uzay mekiği büyük bir gürültüyle havalandı ve kısa sürede gözden kayboldu', '🚀'], ['Karıncalar kış gelmeden önce yuvalarına bol bol yiyecek taşır', '🐜'], ['Denizin dibinde renkli mercanların arasında küçük balıklar saklanıyordu', '🐠'], ['Bilim insanları dinozorların milyonlarca yıl önce yaşadığını söylüyor', '🦕'], ['Ormanda kamp kurduk ve gece ateşin başında yıldızları seyrettik', '⛺'], ['Klavyede on parmak yazan biri bakmadan çok hızlı yazabilir', '⌨️']] },
        ],
    },
    // ===== 5. RAKAMLAR =====
    {
        id: 'rakam',
        name: 'Rakamlar',
        sample: '1 2 3 · 2026',
        stages: [
            { name: 'Rakamlar sırayla', kind: 'key', hint: 'always', order: 'fixed', items: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] },
            { name: 'Rakam avı', kind: 'key', hint: 'delayed', items: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] },
            { name: 'İki basamaklı sayılar', kind: 'word', hint: 'delayed', tip: 'Sayıyı yaz, sonra Boşluk!', items: ['12', '25', '30', '47', '58', '61', '76', '83', '90', '99'] },
            { name: 'Büyük sayılar', kind: 'word', hint: 'delayed', tip: 'Sayıyı yaz, sonra Boşluk!', items: ['100', '205', '318', '450', '777', '1000', '1923', '2026', '3600', '12345'] },
        ],
    },
    // ===== 6. NOKTALAMA (? ve ! Türkçe Q'da Shift ister) =====
    {
        id: 'noktalama',
        name: 'Noktalama',
        sample: '. , ? !',
        stages: [
            { name: 'Nokta ve virgül', kind: 'key', hint: 'always', items: ['.', ',', '.', ',', '.', ',', '.', ','] },
            { name: 'Soru ve ünlem', kind: 'key', hint: 'always', tip: 'Shift tuşunu basılı tut, yanan tuşa bas!', items: ['?', '!', '?', '!', '?', '!', '?', '!'] },
            { name: 'Noktalı cümleler', kind: 'sentence', hint: 'delayed', tip: 'Cümleyi yaz, sonuna nokta koy!', items: [['Kedim çok sevimli.', '🐱'], ['Bugün parka gittik.', '🌳'], ['Ben resim yapmayı severim.', '🎨'], ['Kuşlar sabah erkenden öter.', '🐦'], ['Annem bana masal okudu.', '📖'], ['Okulumuzun bahçesi çok büyük.', '🏫'], ['Kardeşim yeni yürümeye başladı.', '👶'], ['Kışın kardan adam yaparız.', '⛄']] },
            { name: 'Soru cümleleri', kind: 'sentence', hint: 'delayed', tip: 'Soru işareti için Shift tuşunu basılı tut!', items: [['Bu ne?', '❓'], ['Adın ne?', '🙂'], ['Kaç yaşındasın?', '🎂'], ['Nereye gidiyorsun?', '🚶'], ['Bugün hava nasıl?', '🌤️'], ['Elma mı armut mu?', '🍎'], ['Kitabın nerede?', '📕'], ['Bizimle oynar mısın?', '🧸']] },
            { name: 'Ünlem cümleleri', kind: 'sentence', hint: 'delayed', tip: 'Ünlem için Shift tuşunu basılı tut!', items: [['Haydi koş!', '🏃'], ['Aferin sana!', '👏'], ['Dikkat et!', '⚠️'], ['Ne güzel bir gün!', '🌞'], ['Yaşasın tatil!', '🏖️'], ['Hemen gel!', '📣'], ['Gol oldu!', '⚽'], ['Çok teşekkürler!', '🙏']] },
            { name: 'Virgüllü cümleler', kind: 'sentence', hint: 'delayed', items: [['Elma, armut ve muz aldım.', '🍌'], ['Kırmızı, sarı ve yeşil balonlar uçtu.', '🎈'], ['Ali, Ayşe ve Can parka gitti.', '🎠'], ['Kalem, silgi ve defter çantamda.', '🎒'], ['Sabah kalktım, yüzümü yıkadım.', '🚿'], ['Kediler, köpekler ve kuşlar hayvandır.', '🐾'], ['Annem, babam ve ben sinemaya gittik.', '🎬'], ['Pazartesi, salı ve çarşamba okul var.', '📅']] },
            { name: 'Sayılı cümleler', kind: 'sentence', hint: 'delayed', items: [['Sepette 5 elma var.', '🍎'], ['Sınıfımızda 24 öğrenci var.', '🏫'], ['Bir yılda 12 ay vardır.', '📅'], ['Bir haftada 7 gün vardır.', '🗓️'], ['Bir günde 24 saat vardır.', '⏰'], ['Ben 9 yaşındayım.', '🎂'], ['Kitabım 120 sayfa.', '📕'], ['Okulumuz 1990 yılında açıldı.', '🏫']] },
            { name: 'Karışık noktalama', kind: 'sentence', hint: 'delayed', items: [['Merhaba, benim adım Ali.', '👋'], ['Ne zaman geleceksin?', '⏳'], ['Dikkat, yol kaygan!', '⚠️'], ['Bugün 3 kitap okudum, çok yoruldum.', '📚'], ['Sen de gelir misin, Ayşe?', '🙋'], ['Eyvah, otobüs kaçtı!', '🚌'], ['Hangi renk daha güzel, mavi mi yeşil mi?', '🎨'], ['Yaşasın, kar yağıyor!', '❄️']] },
            { name: 'Usta paragrafları', kind: 'sentence', hint: 'delayed', items: [['Bugün okulda resim yaptık. Ben bir ev ve 3 ağaç çizdim. Öğretmenim çok beğendi!', '🎨'], ['Kediler çok uyur mu? Evet, günde 15 saat uyuyabilirler. Ne tembel hayvanlar!', '🐱'], ['Ay, Dünya etrafında dönen bir uydudur. Gece gökyüzünde parlar. Sen hiç dolunay gördün mü?', '🌕'], ['Hafta sonu pikniğe gittik. Annem sandviç, babam meyve getirdi. Ne kadar eğlenceli bir gündü!', '🧺'], ['Arılar çiçeklerden nektar toplar. Bir kavanoz bal için binlerce çiçeğe konarlar. Ne çalışkan böcekler!', '🐝'], ['Klavyede hızlı yazmak için çok çalıştım. Artık 10 parmakla yazabiliyorum. Sen de dener misin?', '⌨️']] },
        ],
    },
];
