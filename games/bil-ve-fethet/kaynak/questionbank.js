/* ============================================================
   SORU BANKASI v2 — PROSEDÜREL ÜRETİCİLER + VERİ HAVUZLARI
   Amaç: tüm dünya fethedilse bile aynı soru tekrar gelmesin.
   Her ders büyük veri havuzlarından kombinatoryal soru üretir.
   ============================================================ */

const SUBJECTS = {
  ana:  [['mat','🔢 Sayılar'],['sek','🔷 Şekil & Renk']],
  ilk:  [['mat','🔢 Matematik'],['fen','🔬 Fen'],['tur','📖 Türkçe'],['sos','🏛️ Hayat Bilgisi'],['ing','🔤 İngilizce']],
  orta: [['mat','🔢 Matematik'],['fen','🔬 Fen'],['tur','📖 Türkçe'],['sos','🏛️ Sosyal'],['cog','🗺️ Coğrafya'],['ing','🔤 İngilizce'],['din','🕌 Din Kültürü']],
  lise: [['mat','🔢 Matematik'],['fen','🔬 Fen'],['tur','📖 Edebiyat'],['sos','🏛️ Tarih'],['cog','🗺️ Coğrafya'],['ing','🔤 İngilizce'],['din','🕌 Din Kültürü']],
};

const _rnd = (a,b) => a + Math.floor(Math.random() * (b - a + 1));
const _pick = arr => arr[Math.floor(Math.random() * arr.length)];
const _shuf = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
// Cevap normalizasyonu: küçük harf (TR), tırnak/noktalama SİL (bitişik kalsın),
// fazla boşlukları sadeleştir. DİKKAT: '-' ve '/' AYRAÇ SAYILMAZ — yoksa "-100" ile
// "100", "1/2" ile "12" yanlışlıkla aynı sayılırdı (işaret/kesir korunur).
const _normAns = s => String(s).toLocaleLowerCase('tr')
  .replace(/['’`"().,;:!?]/g, '').replace(/\s+/g, ' ').trim();
// İki seçenek AYNI cevabı mı gösteriyor? normalize-eşit VEYA biri diğerini TAM KELİMELERLE
// kapsıyorsa (ör. "Mustafa Kemal" ⊂ "Mustafa Kemal Atatürk", "İnönü" ⊂ "İsmet İnönü") → evet.
// Kelime sınırı şart: "12" sayısı "120" içinde, "O" elementi "OH" içinde sayılmaz.
function _sameAns(a, b){
  const x = _normAns(a), y = _normAns(b);
  // Yalnız noktalama/sembol cevaplar ("?", "!", "@") boşa normalize olur — bunları
  // birleştirme; ham eşitliğe düş (farklı semboller AYNI sayılmasın).
  if (!x || !y) return String(a) === String(b);
  if (x === y) return true;
  const [s, l] = x.length <= y.length ? [x, y] : [y, x];
  return (' ' + l + ' ').includes(' ' + s + ' ');
}
// Doğru cevap + en fazla 3 çeldirici. Hiçbir seçenek bir diğeriyle "aynı cevap" olmaz —
// "Mustafa Kemal" ile "Mustafa Kemal Atatürk" gibi ikilemler aynı soruda çıkmaz.
function _opts(correct, pool){
  const chosen = [correct];
  for (const v of _shuf(pool)){
    if (chosen.length >= 4) break;
    if (chosen.some(c => _sameAns(c, v))) continue;
    chosen.push(v);
  }
  return _shuf(chosen);
}
function _q(text, correct, pool){
  const opts = _opts(correct, pool);
  return { q: text, opts, ans: opts.indexOf(correct) };
}

/* ===================== VERİ HAVUZLARI ===================== */
const EN_WORDS = [
  ['apple','elma'],['banana','muz'],['orange','portakal'],['grape','üzüm'],['strawberry','çilek'],
  ['cherry','kiraz'],['lemon','limon'],['peach','şeftali'],['watermelon','karpuz'],['pear','armut'],
  ['cat','kedi'],['dog','köpek'],['bird','kuş'],['fish','balık'],['horse','at'],['cow','inek'],
  ['sheep','koyun'],['lion','aslan'],['elephant','fil'],['monkey','maymun'],['rabbit','tavşan'],
  ['bear','ayı'],['wolf','kurt'],['fox','tilki'],['snake','yılan'],['frog','kurbağa'],
  ['red','kırmızı'],['blue','mavi'],['green','yeşil'],['yellow','sarı'],['black','siyah'],
  ['white','beyaz'],['purple','mor'],['brown','kahverengi'],['pink','pembe'],['gray','gri'],
  ['book','kitap'],['pen','kalem'],['desk','sıra'],['teacher','öğretmen'],['student','öğrenci'],
  ['school','okul'],['bag','çanta'],['ruler','cetvel'],['notebook','defter'],['board','tahta'],
  ['mother','anne'],['father','baba'],['sister','kız kardeş'],['brother','erkek kardeş'],['baby','bebek'],
  ['family','aile'],['grandmother','büyükanne'],['grandfather','büyükbaba'],['uncle','amca'],['aunt','teyze'],
  ['house','ev'],['door','kapı'],['window','pencere'],['table','masa'],['chair','sandalye'],
  ['bed','yatak'],['kitchen','mutfak'],['room','oda'],['garden','bahçe'],['wall','duvar'],
  ['water','su'],['milk','süt'],['bread','ekmek'],['egg','yumurta'],['cheese','peynir'],
  ['meat','et'],['rice','pirinç'],['soup','çorba'],['honey','bal'],['salt','tuz'],
  ['head','baş'],['hand','el'],['foot','ayak'],['eye','göz'],['ear','kulak'],
  ['nose','burun'],['mouth','ağız'],['hair','saç'],['arm','kol'],['leg','bacak'],
  ['sun','güneş'],['moon','ay'],['star','yıldız'],['tree','ağaç'],['flower','çiçek'],
  ['sea','deniz'],['mountain','dağ'],['river','nehir'],['sky','gökyüzü'],['cloud','bulut'],
  ['rain','yağmur'],['snow','kar'],['wind','rüzgar'],['fire','ateş'],['ice','buz'],
  ['big','büyük'],['small','küçük'],['hot','sıcak'],['cold','soğuk'],['fast','hızlı'],
  ['slow','yavaş'],['happy','mutlu'],['sad','üzgün'],['good','iyi'],['bad','kötü'],
  ['new','yeni'],['old','eski'],['tall','uzun'],['short','kısa'],['easy','kolay'],
  ['difficult','zor'],['beautiful','güzel'],['ugly','çirkin'],['strong','güçlü'],['weak','zayıf'],
  ['clean','temiz'],['dirty','kirli'],['rich','zengin'],['poor','fakir'],['young','genç'],
  ['run','koşmak'],['walk','yürümek'],['eat','yemek'],['drink','içmek'],['sleep','uyumak'],
  ['read','okumak'],['write','yazmak'],['play','oynamak'],['go','gitmek'],['come','gelmek'],
  ['see','görmek'],['look','bakmak'],['open','açmak'],['close','kapatmak'],['sit','oturmak'],
  ['jump','zıplamak'],['swim','yüzmek'],['fly','uçmak'],['sing','şarkı söylemek'],['dance','dans etmek'],
  // — Meyve & sebze
  ['tomato','domates'],['potato','patates'],['onion','soğan'],['carrot','havuç'],['cucumber','salatalık'],
  ['pepper','biber'],['corn','mısır'],['pea','bezelye'],['bean','fasulye'],['garlic','sarımsak'],
  ['apricot','kayısı'],['fig','incir'],['plum','erik'],['melon','kavun'],['coconut','hindistan cevizi'],
  // — Hayvanlar
  ['tiger','kaplan'],['giraffe','zürafa'],['zebra','zebra'],['camel','deve'],['donkey','eşek'],
  ['goat','keçi'],['chicken','tavuk'],['duck','ördek'],['turkey','hindi'],['mouse','fare'],
  ['squirrel','sincap'],['turtle','kaplumbağa'],['butterfly','kelebek'],['bee','arı'],['ant','karınca'],
  ['spider','örümcek'],['penguin','penguen'],['dolphin','yunus'],['whale','balina'],['crocodile','timsah'],
  // — Renkler
  ['gold','altın rengi'],['silver','gümüş rengi'],
  // — Okul & eşya
  ['eraser','silgi'],['pencil','kurşun kalem'],['crayon','boya kalemi'],['scissors','makas'],['glue','yapıştırıcı'],
  ['paper','kâğıt'],['map','harita'],['globe','küre'],['clock','saat'],['computer','bilgisayar'],
  // — Aile & insanlar
  ['son','oğul'],['daughter','kız evlat'],['friend','arkadaş'],['boy','erkek çocuk'],['girl','kız çocuk'],
  ['man','adam'],['woman','kadın'],['child','çocuk'],['people','insanlar'],['neighbor','komşu'],
  // — Ev & mobilya
  ['roof','çatı'],['floor','zemin'],['stairs','merdiven'],['lamp','lamba'],['mirror','ayna'],
  ['sofa','koltuk'],['carpet','halı'],['curtain','perde'],['key','anahtar'],['phone','telefon'],
  // — Yiyecek & içecek
  ['butter','tereyağı'],['sugar','şeker'],['tea','çay'],['coffee','kahve'],['juice','meyve suyu'],
  ['cake','pasta'],['chocolate','çikolata'],['biscuit','bisküvi'],['jam','reçel'],['olive','zeytin'],
  // — Vücut
  ['finger','parmak'],['tooth','diş'],['tongue','dil'],['neck','boyun'],['knee','diz'],
  ['shoulder','omuz'],['face','yüz'],['heart','kalp'],['back','sırt'],['stomach','mide'],
  // — Doğa & hava
  ['lake','göl'],['forest','orman'],['island','ada'],['desert','çöl'],['valley','vadi'],
  ['storm','fırtına'],['fog','sis'],['rainbow','gökkuşağı'],['thunder','gök gürültüsü'],['lightning','şimşek'],
  // — Sıfatlar
  ['heavy','ağır'],['light','hafif'],['wide','geniş'],['narrow','dar'],['deep','derin'],
  ['empty','boş'],['full','dolu'],['quiet','sessiz'],['loud','gürültülü'],['soft','yumuşak'],
  ['hard','sert'],['sweet','tatlı'],['sour','ekşi'],['wet','ıslak'],['dry','kuru'],
  // — Fiiller
  ['listen','dinlemek'],['speak','konuşmak'],['help','yardım etmek'],['buy','satın almak'],['sell','satmak'],
  ['cook','pişirmek'],['wash','yıkamak'],['draw','çizmek'],['paint','boyamak'],['count','saymak'],
  ['learn','öğrenmek'],['teach','öğretmek'],['think','düşünmek'],['carry','taşımak'],['catch','yakalamak'],
  // — Meslekler
  ['doctor','doktor'],['nurse','hemşire'],['driver','şoför'],['farmer','çiftçi'],['pilot','pilot'],
  ['singer','şarkıcı'],['painter','ressam'],['baker','fırıncı'],['police','polis'],
  // — Ulaşım
  ['car','araba'],['bus','otobüs'],['train','tren'],['plane','uçak'],['ship','gemi'],
  ['bike','bisiklet'],['truck','kamyon'],['boat','tekne'],
];
const EN_DAYS = [['Monday','Pazartesi'],['Tuesday','Salı'],['Wednesday','Çarşamba'],['Thursday','Perşembe'],
  ['Friday','Cuma'],['Saturday','Cumartesi'],['Sunday','Pazar']];
const EN_NUM = [['one','1'],['two','2'],['three','3'],['four','4'],['five','5'],['six','6'],
  ['seven','7'],['eight','8'],['nine','9'],['ten','10'],['eleven','11'],['twelve','12']];
const EN_ANT = [['big','small'],['hot','cold'],['fast','slow'],['happy','sad'],['good','bad'],
  ['new','old'],['tall','short'],['easy','difficult'],['beautiful','ugly'],['strong','weak'],
  ['open','close'],['day','night'],['up','down'],['long','short'],['rich','poor'],
  ['clean','dirty'],['young','old'],['full','empty'],['right','wrong'],['near','far'],
  ['light','dark'],['wet','dry'],['soft','hard'],['wide','narrow'],
  ['deep','shallow'],['loud','quiet'],['sweet','sour'],['first','last'],['begin','end'],
  ['win','lose'],['buy','sell'],['push','pull'],['true','false']];
const EN_PAST = [['go','went'],['come','came'],['see','saw'],['eat','ate'],['drink','drank'],
  ['run','ran'],['write','wrote'],['take','took'],['give','gave'],['make','made'],
  ['buy','bought'],['bring','brought'],['get','got'],['sit','sat'],['sing','sang'],
  ['swim','swam'],['fly','flew'],['speak','spoke'],['break','broke'],['begin','began'],
  ['find','found'],['think','thought'],['teach','taught'],['catch','caught'],['build','built'],
  ['sell','sold'],['tell','told'],['feel','felt'],['keep','kept'],['sleep','slept'],
  ['leave','left'],['meet','met'],['read','read'],['stand','stood'],['understand','understood'],
  ['win','won'],['lose','lost'],['send','sent'],['spend','spent'],['hold','held']];
const EN_V3 = [['eat','eaten'],['write','written'],['see','seen'],['go','gone'],['do','done'],
  ['take','taken'],['give','given'],['speak','spoken'],['break','broken'],['drink','drunk'],
  ['choose','chosen'],['forget','forgotten'],['know','known'],['fall','fallen'],['drive','driven'],
  ['begin','begun'],['ring','rung'],['sing','sung'],['swim','swum'],['run','run'],
  ['come','come'],['become','become'],['grow','grown'],['throw','thrown'],['fly','flown'],
  ['wear','worn'],['tear','torn'],['bite','bitten'],['hide','hidden'],['ride','ridden']];
const EN_COMP = [['big','bigger'],['small','smaller'],['fast','faster'],['tall','taller'],['old','older'],
  ['strong','stronger'],['young','younger'],['cold','colder'],['hot','hotter'],['long','longer'],
  ['short','shorter'],['weak','weaker'],['slow','slower'],['warm','warmer'],['rich','richer'],
  ['poor','poorer'],['clean','cleaner'],['cheap','cheaper'],['near','nearer'],['deep','deeper'],
  ['high','higher'],['low','lower'],['light','lighter'],['dark','darker'],['soft','softer'],
  ['happy','happier'],['easy','easier'],['busy','busier'],['heavy','heavier'],['early','earlier']];

const GEO = [
  ['Türkiye','Ankara','Asya'],['Almanya','Berlin','Avrupa'],['Fransa','Paris','Avrupa'],['İtalya','Roma','Avrupa'],
  ['İspanya','Madrid','Avrupa'],['Portekiz','Lizbon','Avrupa'],['İngiltere','Londra','Avrupa'],['Hollanda','Amsterdam','Avrupa'],
  ['Belçika','Brüksel','Avrupa'],['İsviçre','Bern','Avrupa'],['Avusturya','Viyana','Avrupa'],['Yunanistan','Atina','Avrupa'],
  ['Polonya','Varşova','Avrupa'],['Rusya','Moskova','Avrupa'],['Ukrayna','Kiev','Avrupa'],['İsveç','Stockholm','Avrupa'],
  ['Norveç','Oslo','Avrupa'],['Finlandiya','Helsinki','Avrupa'],['Danimarka','Kopenhag','Avrupa'],['İrlanda','Dublin','Avrupa'],
  ['Macaristan','Budapeşte','Avrupa'],['Çekya','Prag','Avrupa'],['Romanya','Bükreş','Avrupa'],['Bulgaristan','Sofya','Avrupa'],
  ['Sırbistan','Belgrad','Avrupa'],['Hırvatistan','Zagreb','Avrupa'],['İzlanda','Reykjavik','Avrupa'],
  ['Çin','Pekin','Asya'],['Japonya','Tokyo','Asya'],['Hindistan','Yeni Delhi','Asya'],['Güney Kore','Seul','Asya'],
  ['Kuzey Kore','Pyongyang','Asya'],['Tayland','Bangkok','Asya'],['Vietnam','Hanoi','Asya'],['Endonezya','Cakarta','Asya'],
  ['Malezya','Kuala Lumpur','Asya'],['Filipinler','Manila','Asya'],['Pakistan','İslamabad','Asya'],['İran','Tahran','Asya'],
  ['Irak','Bağdat','Asya'],['Suriye','Şam','Asya'],['Suudi Arabistan','Riyad','Asya'],
  ['Afganistan','Kabil','Asya'],['Kazakistan','Astana','Asya'],['Özbekistan','Taşkent','Asya'],['Azerbaycan','Bakü','Asya'],
  ['Gürcistan','Tiflis','Asya'],['Ermenistan','Erivan','Asya'],['Moğolistan','Ulanbator','Asya'],['Bangladeş','Dakka','Asya'],
  ['Mısır','Kahire','Afrika'],['Libya','Trablus','Afrika'],['Cezayir','Cezayir','Afrika'],['Fas','Rabat','Afrika'],
  ['Tunus','Tunus','Afrika'],['Nijerya','Abuja','Afrika'],['Etiyopya','Addis Ababa','Afrika'],['Kenya','Nairobi','Afrika'],
  ['Güney Afrika','Pretoria','Afrika'],['Gana','Akra','Afrika'],['Sudan','Hartum','Afrika'],['Somali','Mogadişu','Afrika'],
  ['ABD','Washington','Kuzey Amerika'],['Kanada','Ottawa','Kuzey Amerika'],['Meksika','Meksiko','Kuzey Amerika'],
  ['Küba','Havana','Kuzey Amerika'],['Brezilya','Brasilia','Güney Amerika'],['Arjantin','Buenos Aires','Güney Amerika'],
  ['Şili','Santiago','Güney Amerika'],['Peru','Lima','Güney Amerika'],['Kolombiya','Bogota','Güney Amerika'],
  ['Venezuela','Karakas','Güney Amerika'],['Bolivya','La Paz','Güney Amerika'],['Uruguay','Montevideo','Güney Amerika'],
  ['Avustralya','Kanberra','Okyanusya'],['Yeni Zelanda','Wellington','Okyanusya'],
];
const CONTINENTS = ['Asya','Avrupa','Afrika','Kuzey Amerika','Güney Amerika','Okyanusya'];

const TR_SYN = [['ak','beyaz'],['kara','siyah'],['ihtiyar','yaşlı'],['cevap','yanıt'],['soru','sual'],
  ['öğretmen','muallim'],['anı','hatıra'],['konuk','misafir'],['armağan','hediye'],['sınav','imtihan'],
  ['vatan','yurt'],['fakir','yoksul'],['neşeli','sevinçli'],['kelime','sözcük'],['okul','mektep'],
  ['yıl','sene'],['hekim','doktor'],['kent','şehir'],['ulus','millet'],['kalp','yürek'],
  ['siyah','kara'],['beyaz','ak'],['zor','güç'],['mutlu','sevinçli'],['acele','ivedi'],
  ['öykü','hikâye'],['savaş','harp'],['barış','sulh'],['özgür','hür'],['düş','rüya'],
  ['ihtiyaç','gereksinim'],['olay','vaka'],['yöntem','metot'],['amaç','hedef'],['görev','vazife'],
  ['yetenek','kabiliyet'],['sözleşme','mukavele'],['anlam','mana'],['utangaç','çekingen'],['cömert','eli açık'],
  ['cesur','yürekli'],['gerçek','hakikat'],['kaygı','endişe'],['başarı','muvaffakiyet'],['tutsak','esir'],
  ['yorgun','bitkin'],['konut','mesken'],['dilek','istek'],['gülünç','komik'],['temel','esas']];
const TR_ANT = [['büyük','küçük'],['uzun','kısa'],['açık','kapalı'],['sıcak','soğuk'],['hızlı','yavaş'],
  ['iyi','kötü'],['güzel','çirkin'],['ileri','geri'],['aydınlık','karanlık'],['zengin','fakir'],
  ['dolu','boş'],['kalın','ince'],['yüksek','alçak'],['genç','yaşlı'],['sevinç','üzüntü'],
  ['doğru','yanlış'],['kolay','zor'],['önce','sonra'],['kalabalık','tenha'],['temiz','kirli'],
  ['gece','gündüz'],['yaz','kış'],['girmek','çıkmak'],['gülmek','ağlamak'],['almak','vermek'],
  ['sevmek','nefret etmek'],['başlamak','bitirmek'],['açmak','kapamak'],['yaş','kuru'],
  ['ağır','hafif'],['sert','yumuşak'],['derin','sığ'],['bol','kıt'],['cesur','korkak'],
  ['cömert','cimri'],['çalışkan','tembel'],['düzenli','dağınık'],['tatlı','acı'],['yakın','uzak'],
  ['hatırlamak','unutmak'],['kazanmak','kaybetmek'],['sağlam','çürük'],['ucuz','pahalı'],['sabah','akşam'],
  ['barış','savaş'],['dost','düşman'],['ödül','ceza'],['artmak','azalmak'],['canlı','cansız']];
const TR_NOUNS = ['kalem','masa','deniz','kuş','çiçek','okul','kitap','ev','araba','ağaç','güneş','bulut','yıldız','köprü','bahçe','pencere','kapı','duvar','sokak','şehir',
  'orman','nehir','dağ','bisiklet','top','bardak','tabak','kaşık','defter','silgi','anahtar','saat','kuzu','tavşan','kelebek','balık','gemi','uçak','tren','kütüphane'];
const TR_ADJ = ['mavi','güzel','büyük','hızlı','sıcak','yeşil','küçük','yeni','eski','parlak','geniş','dar',
  'kırmızı','sarı','soğuk','tatlı','uzun','kısa','temiz','sessiz','neşeli','akıllı','cesur','yumuşak'];
const TR_VERB = ['koştu','geldi','yazdı','okudu','baktı','gitti','güldü','uçtu','yürüdü','konuştu','düşündü','bekledi',
  'zıpladı','yüzdü','söyledi','dinledi','çizdi','boyadı','oynadı','uyudu','kalktı','oturdu','atladı','sevindi'];
const TR_SYLL = ['kelebek','şemsiye','telefon','pencere','bilgisayar','kütüphane','öğretmen','arkadaş','okul','kitap','deniz','ağaç','elma','portakal','televizyon','bilgi','sevgi','mutluluk','gökyüzü','merhaba',
  'kalem','masa','çiçek','kapı','araba','bahçe','köprü','yıldız','bardak','defter','anahtar','bisiklet','tavşan','balık','orman','uçak','okyanus','meyve','kardeş','kumbara'];

const FEN_UNITS = [['Kuvvet','Newton'],['Enerji','Joule'],['Güç','Watt'],['Elektrik akımı','Amper'],
  ['Gerilim','Volt'],['Sıcaklık','Kelvin'],['Uzunluk','Metre'],['Kütle','Kilogram'],['Zaman','Saniye'],['Direnç','Ohm'],
  ['Basınç','Pascal'],['Frekans','Hertz'],['Elektrik yükü','Coulomb'],['Işık şiddeti','Kandela'],['Madde miktarı','Mol']];
const FEN_ORGAN = [['Kalp','kan pompalar'],['Akciğer','solunum yapar'],['Mide','besinleri sindirir'],
  ['Böbrek','kanı süzer'],['Beyin','vücudu yönetir'],['Karaciğer','kanı temizler'],['Göz','görmeyi sağlar'],['Kulak','duymayı sağlar'],['Deri','vücudu korur'],['Bağırsak','besinleri emer'],
  ['Dil','tat almayı sağlar'],['Burun','koku almayı sağlar'],['Diş','besinleri öğütür'],['İskelet','vücuda destek verir'],['Kaslar','hareket etmemizi sağlar']];
const PLANETS = ['Merkür','Venüs','Dünya','Mars','Jüpiter','Satürn','Uranüs','Neptün'];
const FEN_STATE = [['Erime','katıdan sıvıya'],['Donma','sıvıdan katıya'],['Buharlaşma','sıvıdan gaza'],
  ['Yoğuşma','gazdan sıvıya'],['Süblimleşme','katıdan gaza'],['Kırağılaşma','gazdan katıya']];
const FEN_ELEM = [['Oksijen','O'],['Hidrojen','H'],['Karbon','C'],['Azot','N'],['Demir','Fe'],
  ['Altın','Au'],['Gümüş','Ag'],['Bakır','Cu'],['Sodyum','Na'],['Potasyum','K'],['Kalsiyum','Ca'],['Helyum','He'],
  ['Kükürt','S'],['Fosfor','P'],['Klor','Cl'],['Flor','F'],['Magnezyum','Mg'],
  ['Çinko','Zn'],['Kurşun','Pb'],['Alüminyum','Al'],['Silisyum','Si'],['Cıva','Hg'],
  ['Kalay','Sn'],['Nikel','Ni'],['Lityum','Li'],['Neon','Ne'],['Argon','Ar']];

const HIST = [
  ['Türkiye Cumhuriyeti\'nin ilanı','1923'],['TBMM\'nin açılışı','1920'],['İstanbul\'un fethi','1453'],
  ['Malazgirt Savaşı','1071'],['Lozan Antlaşması','1923'],['Mustafa Kemal\'in Samsun\'a çıkışı','1919'],
  ['Sakarya Meydan Muharebesi','1921'],['Büyük Taarruz','1922'],['Mudanya Ateşkesi','1922'],
  ['Saltanatın kaldırılması','1922'],['Halifeliğin kaldırılması','1924'],['Harf İnkılabı','1928'],
  ['Kadınlara seçme-seçilme hakkı','1934'],['Fransız İhtilali','1789'],['I. Dünya Savaşı başlangıcı','1914'],
  ['II. Dünya Savaşı başlangıcı','1939'],['Osmanlı Devleti\'nin kuruluşu','1299'],['Soyadı Kanunu','1934'],
  ['Çanakkale Zaferi','1915'],['Ankara\'nın başkent olması','1923'],
  ['Tekke ve zaviyelerin kapatılması','1925'],['Şapka İnkılabı','1925'],['Tevhid-i Tedrisat Kanunu (Öğretim Birliği)','1924'],
  ['Medeni Kanun\'un kabulü','1926'],['Kabotaj Kanunu\'nun kabulü','1926'],['Türk Dil Kurumu\'nun kuruluşu','1932'],
  ['Türk Tarih Kurumu\'nun kuruluşu','1931'],['İzmir İktisat Kongresi','1923'],['Cumhuriyet\'in 10. yıl kutlamaları','1933'],
  ['Atatürk\'ün vefatı','1938'],['Hatay\'ın Türkiye\'ye katılması','1939'],['Birinci İnönü Muharebesi','1921'],
  ['İkinci İnönü Muharebesi','1921'],['Kütahya-Eskişehir Muharebeleri','1921'],['Amasya Genelgesi','1919'],
  ['Erzurum Kongresi','1919'],['Sivas Kongresi','1919'],['Misak-ı Millî\'nin kabulü','1920'],
  ['Birleşmiş Milletler\'in kuruluşu','1945'],['İlk insanlı Ay\'a iniş','1969'],['Türkiye\'de ilk nüfus sayımı','1927']];
const HIST_WHO = [
  ['İstanbul\'u fetheden padişah','Fatih Sultan Mehmet'],['Türkiye Cumhuriyeti\'nin kurucusu','Mustafa Kemal Atatürk'],
  ['Osmanlı Devleti\'ni kuran kişi','Osman Bey'],['İlk TBMM Başkanı','Mustafa Kemal'],
  ['Kanuni lakaplı padişah','Sultan Süleyman'],['Yavuz lakaplı padişah','Sultan Selim'],
  ['Türkiye\'nin 2. cumhurbaşkanı','İsmet İnönü'],['Türk tarihinde ilk kadın savaş pilotu','Sabiha Gökçen'],
  ['İstiklal Marşı\'nın şairi','Mehmet Akif Ersoy'],['İstiklal Marşı\'nı besteleyen sanatçı','Osman Zeki Üngör'],
  ['Malazgirt Savaşı\'nı kazanan Selçuklu sultanı','Alparslan'],['Divânu Lugâti\'t-Türk adlı eseri yazan bilgin','Kaşgarlı Mahmud'],
  ['Kutadgu Bilig adlı eseri yazan düşünür','Yusuf Has Hacip'],['Anadolu\'da yaşamış büyük Türk halk ozanı','Yunus Emre'],
  ['Osmanlı\'da ilk matbaayı kuran kişi','İbrahim Müteferrika'],['Osmanlı\'nın en ünlü mimarı (Selimiye\'nin mimarı)','Mimar Sinan'],
  ['Cebir biliminin kurucusu sayılan bilgin','Harezmi'],['El-Kanun fi\'t-Tıb adlı tıp eserinin yazarı','İbn-i Sina'],
  ['Türkiye Cumhuriyeti\'nin başkomutanı ve ilk cumhurbaşkanı','Mustafa Kemal Atatürk']];

const DIN_FACTS = [
  ['İslam dininin kutsal kitabı','Kur\'an-ı Kerim'],['Müslümanların günlük namaz vakti sayısı','5'],
  ['İslam\'ın şart sayısı','5'],['İmanın şart sayısı','6'],['Kur\'an\'daki sure sayısı','114'],
  ['Hz. Muhammed\'in doğduğu şehir','Mekke'],['Müslümanların hac yaptığı şehir','Mekke'],
  ['Hz. Muhammed\'e ilk vahyin geldiği yer','Hira Mağarası'],['İslam\'ın ilk halifesi','Hz. Ebubekir'],
  ['Ramazan ayında tutulan ibadet','Oruç'],['Haftalık toplu ibadet günü','Cuma'],
  ['Kâbe\'nin bulunduğu şehir','Mekke'],['Hicretin yapıldığı (hicret edilen) şehir','Medine'],['Zekât ibadetinin türü','Mali'],
  ['Hz. Muhammed\'in babasının adı','Abdullah'],['Hz. Muhammed\'in annesinin adı','Âmine'],
  ['Müslümanların yöneldiği kıble','Kâbe'],['Günde kılınan farz namazların toplam rekât sayısı','17'],
  ['Sabah namazının farzının rekât sayısı','2'],['Bir haftada kaç gün vardır','7'],
  ['Kur\'an-ı Kerim\'in ilk suresi','Fatiha'],['Kur\'an-ı Kerim\'in en kısa surelerinden biri','Kevser'],
  ['Orucun açıldığı akşam yemeğinin adı','İftar'],['Oruca başlamadan önce yenen sabah öğünü','Sahur'],
  ['Hac ibadetinin yapıldığı ay (kurban ile aynı dönem)','Zilhicce'],['Ramazan Bayramı\'nın diğer adı','Şeker Bayramı'],
  ['Namazdan önce alınan temizlik (abdest) için kullanılan madde','Su'],['Kur\'an\'ı tane tane, kurallarına göre okumaya ne denir','Tecvid'],
  ['Camide namaz kıldıran kişiye ne denir','İmam'],['Ezanı okuyan kişiye ne denir','Müezzin'],
  ['İslam\'da yardımlaşma ve paylaşmayı ifade eden değer','Yardımseverlik'],['Büyüklere ve küçüklere karşı gösterilmesi gereken davranış','Saygı']];

/* ===================== PROSEDÜREL ÜRETİCİLER ===================== */
const SUBJGEN = {
 ing: {
  ilk: d => {
    const t = _rnd(0, 3);
    if (t===0){ const w=_pick(EN_WORDS); return _q(`"${w[0]}" kelimesinin Türkçesi nedir?`, w[1], EN_WORDS.map(x=>x[1])); }
    if (t===1){ const w=_pick(EN_WORDS); return _q(`"${w[1]}" kelimesinin İngilizcesi nedir?`, w[0], EN_WORDS.map(x=>x[0])); }
    if (t===2){ const day=_pick(EN_DAYS); return _q(`"${day[0]}" hangi gündür?`, day[1], EN_DAYS.map(x=>x[1])); }
    const n=_pick(EN_NUM); return _q(`"${n[0]}" sayısı kaçtır?`, n[1], EN_NUM.map(x=>x[1]));
  },
  orta: d => {
    const t = _rnd(0, 3);
    if (t===0){ const p=_pick(EN_PAST); return _q(`"${p[0]}" fiilinin ikinci hali (Past) nedir?`, p[1], EN_PAST.map(x=>x[1]).concat(['goed','eated','runned'])); }
    if (t===1){ const w=_pick(EN_WORDS); return _q(`"${w[1]}" kelimesinin İngilizcesi nedir?`, w[0], EN_WORDS.map(x=>x[0])); }
    if (t===2){ const p=_pick(EN_ANT); return _q(`"${p[0]}" kelimesinin zıt anlamlısı (opposite) nedir?`, p[1], EN_ANT.flat()); }
    const subj=_pick([['I','am'],['He','is'],['She','is'],['It','is'],['You','are'],['They','are'],['We','are']]);
    return _q(`"${subj[0]} ___ a student." boşluğa ne gelir?`, subj[1], ['am','is','are','be']);
  },
  lise: d => {
    const t = _rnd(0, 3);
    if (t===0){ const p=_pick(EN_PAST); return _q(`Past Simple: "${p[0]}" fiilinin geçmiş hali nedir?`, p[1], EN_PAST.map(x=>x[1]).concat(['goed','seed','taked'])); }
    if (t===1){ const v=_pick(EN_V3); return _q(`Present Perfect: "I have ___" → "${v[0]}" fiilinin 3. hali?`, v[1], EN_V3.map(x=>x[1])); }
    if (t===2){ const p=_pick(EN_ANT); return _q(`"${p[0]}" kelimesinin zıt anlamlısı nedir?`, p[1], EN_ANT.flat()); }
    const c=_pick(EN_COMP); return _q(`Karşılaştırma (comparative): "${c[0]}" → ?`, c[1], EN_COMP.map(x=>x[1]).concat(['more big','gooder']));
  },
 },
 cog: {
  orta: d => {
    const t = _rnd(0, 2);
    if (t===0){ const g=_pick(GEO); return _q(`${g[0]} ülkesinin başkenti neresidir?`, g[1], GEO.map(x=>x[1])); }
    if (t===1){ const g=_pick(GEO); return _q(`${g[0]} hangi kıtada yer alır?`, g[2], CONTINENTS); }
    const g=_pick(GEO); return _q(`${g[1]} hangi ülkenin başkentidir?`, g[0], GEO.map(x=>x[0]));
  },
  lise: d => {
    const t = _rnd(0, 2);
    if (t===0){ const g=_pick(GEO.filter(x=>!['Türkiye','Fransa','Almanya','İtalya','İspanya'].includes(x[0]))); return _q(`${g[0]} ülkesinin başkenti neresidir?`, g[1], GEO.map(x=>x[1])); }
    if (t===1){ const g=_pick(GEO); return _q(`${g[1]} hangi kıtadaki bir başkenttir?`, g[2], CONTINENTS); }
    const g=_pick(GEO); return _q(`${g[0]} hangi kıtada yer alır?`, g[2], CONTINENTS);
  },
 },
 tur: {
  ilk: d => {
    const t = _rnd(0, 2);
    if (t===0){ const w=_pick(TR_SYLL);
      const syl = (w.match(/[aeıioöuüâî]/gi)||[]).length;
      return _q(`"${w}" kelimesi kaç hecelidir?`, String(syl), ['1','2','3','4','5','6']); }
    if (t===1){ const p=_pick(TR_ANT); return _q(`"${p[0]}" kelimesinin zıt anlamlısı nedir?`, p[1], TR_ANT.flat()); }
    const p=_pick(TR_SYN); return _q(`"${p[0]}" kelimesinin eş anlamlısı nedir?`, p[1], TR_SYN.flat());
  },
  orta: d => {
    const t = _rnd(0, 3);
    if (t===0){ const p=_pick(TR_ANT); return _q(`"${p[0]}" sözcüğünün karşıt (zıt) anlamlısı hangisidir?`, p[1], TR_ANT.flat()); }
    if (t===1){ const p=_pick(TR_SYN); return _q(`"${p[0]}" sözcüğünün eş anlamlısı hangisidir?`, p[1], TR_SYN.flat()); }
    if (t===2){ const n=_pick(TR_NOUNS), a=_pick(TR_ADJ); return _q(`"${a} ${n}" tamlamasında "${a}" sözcüğünün türü nedir?`, 'Sıfat', ['İsim','Sıfat','Fiil','Zarf','Zamir']); }
    const n=_pick(TR_NOUNS); return _q(`"${n}" sözcüğünün türü nedir?`, 'İsim', ['İsim','Sıfat','Fiil','Zarf','Edat']);
  },
  lise: d => {
    const t = _rnd(0, 2);
    if (t===0){ const p=_pick(TR_SYN); return _q(`"${p[0]}" sözcüğünün eş anlamlısı nedir?`, p[1], TR_SYN.flat()); }
    if (t===1){ const v=_pick(TR_VERB); return _q(`"${v}" sözcüğü hangi tür sözcüktür?`, 'Fiil', ['İsim','Sıfat','Fiil','Zarf','Bağlaç']); }
    const p=_pick(TR_ANT); return _q(`"${p[0]}" sözcüğünün karşıt anlamlısı nedir?`, p[1], TR_ANT.flat());
  },
 },
 fen: {
  ilk: d => {
    const t = _rnd(0, 2);
    if (t===0){ const o=_pick(FEN_ORGAN); return _q(`Hangi organımız ${o[1]}?`, o[0], FEN_ORGAN.map(x=>x[0])); }
    if (t===1){ const o=_pick(FEN_ORGAN); return _q(`${o[0]} adlı organımızın görevi nedir?`, o[1], FEN_ORGAN.map(x=>x[1])); }
    const s=_pick(FEN_STATE.slice(0,3)); return _q(`Maddenin ${s[1]} geçmesine ne denir?`, s[0], FEN_STATE.map(x=>x[0]));
  },
  orta: d => {
    const t = _rnd(0, 3);
    if (t===0){ const u=_pick(FEN_UNITS); return _q(`${u[0]} büyüklüğünün birimi nedir?`, u[1], FEN_UNITS.map(x=>x[1])); }
    if (t===1){ const s=_pick(FEN_STATE); return _q(`"${s[0]}" olayında madde nasıl hâl değiştirir?`, s[1], FEN_STATE.map(x=>x[1])); }
    if (t===2){ const e=_pick(FEN_ELEM); return _q(`${e[0]} elementinin sembolü nedir?`, e[1], FEN_ELEM.map(x=>x[1])); }
    const i=_rnd(0,PLANETS.length-1); return _q(`Güneş'e ${i+1}. en yakın gezegen hangisidir?`, PLANETS[i], PLANETS);
  },
  lise: d => {
    const t = _rnd(0, 3);
    if (t===0){ const u=_pick(FEN_UNITS); return _q(`${u[0]} büyüklüğünün SI birimi nedir?`, u[1], FEN_UNITS.map(x=>x[1])); }
    if (t===1){ const m=_rnd(2,9), a=_rnd(2,9);
      const opts=_shuf([m*a, m+a, m*a+m, Math.abs(m*a-m)].filter((v,i,arr)=>arr.indexOf(v)===i)).map(String);
      for(let pad=1; opts.length<4; pad++){ const cand=String(m*a+pad); if(!opts.includes(cand)) opts.push(cand); }
      return { q:`F = m·a: kütle ${m} kg, ivme ${a} m/s² ise kuvvet kaç N?`, opts, ans:opts.indexOf(String(m*a)) }; }
    if (t===2){ const e=_pick(FEN_ELEM); return _q(`"${e[1]}" sembolü hangi elementi gösterir?`, e[0], FEN_ELEM.map(x=>x[0])); }
    const i=_rnd(0,PLANETS.length-1); return _q(`Güneş sisteminde ${i+1}. sıradaki gezegen hangisidir?`, PLANETS[i], PLANETS);
  },
 },
 sos: {
  ilk: d => {
    const t = _rnd(0,1);
    if (t===0){ const w=_pick(HIST_WHO.slice(0,4)); return _q(`${w[0]} kimdir?`, w[1], HIST_WHO.map(x=>x[1])); }
    const days=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']; const i=_rnd(0,6);
    return _q(`Haftanın ${i+1}. günü hangisidir?`, days[i], days);
  },
  orta: d => {
    const t = _rnd(0,1);
    if (t===0){ const h=_pick(HIST); return _q(`${h[0]} hangi yıl gerçekleşmiştir?`, h[1], HIST.map(x=>x[1])); }
    const w=_pick(HIST_WHO); return _q(`${w[0]} kimdir?`, w[1], HIST_WHO.map(x=>x[1]));
  },
  lise: d => {
    const t = _rnd(0,1);
    if (t===0){ const h=_pick(HIST); return _q(`${h[0]} olayı hangi yılda olmuştur?`, h[1], HIST.map(x=>x[1])); }
    const w=_pick(HIST_WHO); return _q(`Tarihte "${w[0]}" kimdir?`, w[1], HIST_WHO.map(x=>x[1]));
  },
 },
 din: {
  orta: d => { const f=_pick(DIN_FACTS); return _q(`${f[0]} nedir?`, f[1], DIN_FACTS.map(x=>x[1])); },
  lise: d => { const f=_pick(DIN_FACTS); return _q(`${f[0]} hangisidir?`, f[1], DIN_FACTS.map(x=>x[1])); },
 },
};
