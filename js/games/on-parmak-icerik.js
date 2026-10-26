/* ============================================
   On Parmak — içerik (sabit veri; her açılışta aynı, rastgelelik yok)
   --------------------------------------------
   Yayımlar: window.ON_PARMAK_ICERIK. Şema: docs/on-parmak-tasarim-2026-10-15.md §5.4.
   Bu dosyada Kısım 1 "Orta sıra" ve Kısım 2 "Üst sıra" var; sonraki kısımlar sonraki adımlarda eklenir.

   Kısım: { ad, ornek, hedefHiz, el, bolumler: [ { tur: 'kutu'|'satir'|'oyun', ad, yeni?: [...], oyun?: ad, metin } ] }
   Oyun bölümü: oyun ∈ balon | canavar | baloncuk | elma (js/games/on-parmak-<ad>.js). Harf oyununda (balon) metin
   boşluksuz harf dizisi, en az 20 harf; kelime oyununda boşlukla ayrılmış en az 8 kelime. Uzunluk ≤ hedefHiz × 10.
   Kurallar (tests/on-parmak.spec.js denetler):
     - Bir bölüm yalnız o ana kadar ÖĞRENİLMİŞ tuşları kullanır (kutu `yeni`'leri sırayla birikir; boşluk 2. bölümden sonra).
     - kutu 21–35 karakter; satır en az 50 ve en çok hedefHiz × 10 karakter (hedef hızda ≤ 2 dk); oyun da ≤ hedefHiz × 10.
     - Kutu bölümünün `yeni` tuşları kendi metninde geçer. Yalnız Shift tanıtan kutu: `yeni: []` + `yeniShift: 'sol'|'sag'`
       (metninde o Shift'le yazılan büyük harf olur; sol Shift → sağ el harflerinin büyükleri).
     - Sıkı kurallar: Q/W/X yalnız adı o harfi anan tanıtım/tekrar bölümünde; büyük harf ve Shift'li işaret yalnız gerektirdiği
       Shift tanıtıldıktan sonra; adında "sol el"/"sağ el" olan bölümde harf ve rakam yalnız o elde; yasak sözcük (çekimli
       biçimler dahil); levels 7 olunca 90–110 bölüm ve dört oyunun her biri ≥ 2.
   Genel bölüm numarası dizinin sırasından türer, elle yazılmaz.
   ============================================ */

window.ON_PARMAK_ICERIK = [
    {
        ad: 'Orta sıra',
        ornek: 'F J D K',
        hedefHiz: 8,
        el: true,
        bolumler: [
            { tur: 'kutu',  ad: 'F ve J', yeni: ['f', 'j'],
              metin: 'ffjjfjfjjfjffjjfjffjfjjf' },
            { tur: 'kutu',  ad: 'Boşluk', yeni: [' '],
              metin: 'ff jj fj jf fjf jfj ff jj' },
            { tur: 'satir', ad: 'F J tekrar',
              metin: 'fff jjj fj jf fjf jfj ffj jjf fjfj jfjf ffjj jjff fjj jff fj jf' },
            { tur: 'kutu',  ad: 'D ve K', yeni: ['d', 'k'],
              metin: 'dd kk dk kd dkd kdk fd jk' },
            { tur: 'satir', ad: 'D K tekrar',
              metin: 'dk kd dkd kdk fdk jkd dfk kjd dd kk fdjk kjdf dkdk kdkd fk jd' },
            { tur: 'oyun',  ad: 'Balon Vadisi: F J D K', oyun: 'balon',
              metin: 'fjdkfkdjjdfkkfjddjkffkdj' },
            { tur: 'kutu',  ad: 'S ve L', yeni: ['s', 'l'],
              metin: 'ss ll sl ls sls lsl ds kl' },
            { tur: 'satir', ad: 'S L tekrar',
              metin: 'sl ls sls lsl dsl kls sdk lkj ss ll fsl jls sfdl lkjs sl ls dk' },
            { tur: 'kutu',  ad: 'A ve Ş', yeni: ['a', 'ş'],
              metin: 'aa şş aş şa aşa şaş fa jş' },
            { tur: 'satir', ad: 'A Ş tekrar',
              metin: 'aş şa aşa şaş asd şlk afj şjk aa şş fasş jşla sdaş kşfa as şl' },
            { tur: 'satir', ad: 'İlk kelimeler',
              metin: 'al as ad aş dal kal sal şal ada saf kaş asa kasa kafa' },
            { tur: 'oyun',  ad: 'Balon Vadisi: ilk sekiz tuş', oyun: 'balon',
              metin: 'asdfjklşşlkafdsajşalkdsflajşdkfs' },
            { tur: 'kutu',  ad: 'G ve H', yeni: ['g', 'h'],
              metin: 'gg hh gh hg ghg hgh ag ha' },
            { tur: 'satir', ad: 'G H tekrar ve kelimeler',
              metin: 'gh hg ghg hgh gaf fgh hak had hal gaga daha hala halka sakal' },
            { tur: 'oyun',  ad: 'Uçan Baloncuklar: orta sıra', oyun: 'baloncuk',
              metin: 'hala halka saha daha kasa kaş ada gaga şal sakal' },
            { tur: 'kutu',  ad: 'İ ve virgül', yeni: ['i', ','],
              metin: 'ii ,, i, ,i ii, hi, ki, si,' },
            { tur: 'satir', ad: 'Orta sıra kelimeleri',
              metin: 'fil, dil, kil, sil, şiş, hilal, kişi, dikiş, ilgi, şifa, hadi' },
            { tur: 'oyun',  ad: 'Canavar Saldırısı: orta sıra kelimeleri', oyun: 'canavar',
              metin: 'dalga silgi hafif şaka halka gaga sakal kafa hilal kişi' },
        ],
    },
    {
        ad: 'Üst sıra',
        ornek: 'R U E I',
        hedefHiz: 10,
        el: true,
        bolumler: [
            { tur: 'kutu',  ad: 'R ve U', yeni: ['r', 'u'],
              metin: 'rr uu ru ur rur uru fr ju' },
            { tur: 'satir', ad: 'R U tekrar',
              metin: 'rr uu ru ur frf juj fru jur rur uru frj jur ruf urf rad kur sur' },
            { tur: 'satir', ad: 'R U kelimeleri',
              metin: 'kar kuş su dur kuru sulu uslu kulak durak kural giriş şiir kuşlar iri' },
            { tur: 'kutu',  ad: 'E ve I', yeni: ['e', 'ı'],
              metin: 'ee ıı eı ıe eıe ıeı de kı' },
            { tur: 'satir', ad: 'E I tekrar',
              metin: 'ee ıı eı ıe ded kık ede ıkı fe jı der kır eşi ılı sere kırı eı ıe' },
            { tur: 'satir', ad: 'E I kelimeleri',
              metin: 'ses kedi kek dere şeker sıra kısa ılık ıslak kaşık kırık erik fikir aile' },
            { tur: 'oyun',  ad: 'Elma Bekçisi: R U E I', oyun: 'elma',
              metin: 'kedi kale şeker şiir ses sıra arı ara dere dal ılık ıslak' },
            { tur: 'kutu',  ad: 'T ve Y', yeni: ['t', 'y'],
              metin: 'tt yy ty yt tyt yty ft jy' },
            { tur: 'satir', ad: 'T Y tekrar ve kelimeler',
              metin: 'tt yy ty yt tat yat et at tek yıl tuş kaya yatak tırtıl tatlı yeşil tahta' },
            { tur: 'kutu',  ad: 'O ve W', yeni: ['o', 'w'],
              metin: 'oo ww ow wo owo wow lo sw' },
            { tur: 'satir', ad: 'O W tekrar',
              metin: 'oo ww ow wo lol sws owo wsw lo sw ol ws olo wsw oo ww wo ow' },
            { tur: 'satir', ad: 'O kelimeleri',
              metin: 'okul oda yol kol sol soru dost koşu tost toka kolay sokak yokuş otel dolu' },
            { tur: 'oyun',  ad: 'Uçan Baloncuklar: O T Y', oyun: 'baloncuk',
              metin: 'okul oda kol koşu soru sokak yol yokuş dost dolu tost toka' },
            { tur: 'kutu',  ad: 'P ve Q', yeni: ['p', 'q'],
              metin: 'pp qq pq qp pqp qpq şp aq' },
            { tur: 'satir', ad: 'P Q tekrar',
              metin: 'pp qq pq qp şpş aqa pqp qpq şp aq pa qa ps aq pqa qpş pp qq' },
            { tur: 'satir', ad: 'P kelimeleri',
              metin: 'top kapı kitap sepet paket pasta pide şapka papatya yaprak toprak park ipek' },
            { tur: 'kutu',  ad: 'Ğ ve Ü', yeni: ['ğ', 'ü'],
              metin: 'ğğ üü ğü üğ ğüğ üğü şğ şü' },
            { tur: 'satir', ad: 'Ğ Ü tekrar ve kelimeler',
              metin: 'ğğ üü ğü üğ şğş şüş dağ yağ doğru ağır süt gül tüy yük üst ütü sürü yürü' },
            { tur: 'oyun',  ad: 'Canavar Saldırısı: üst sıra kelimeleri', oyun: 'canavar',
              metin: 'dağ yağış doğru süt sürü gül tüy ütü kürek yürüyüş kapı okul' },
        ],
    },
];
