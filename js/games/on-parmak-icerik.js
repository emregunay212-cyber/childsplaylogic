/* ============================================
   On Parmak — içerik (sabit veri; her açılışta aynı, rastgelelik yok)
   --------------------------------------------
   Yayımlar: window.ON_PARMAK_ICERIK. Şema: docs/on-parmak-tasarim-2026-10-15.md §5.4.
   Bu dosyada yalnız Kısım 1 "Orta sıra" var; sonraki kısımlar sonraki adımlarda eklenir.

   Kısım: { ad, ornek, hedefHiz, el, bolumler: [ { tur: 'kutu'|'satir'|'oyun', ad, yeni?: [...], oyun?: ad, metin } ] }
   Oyun bölümü: oyun ∈ balon | canavar | baloncuk | elma (js/games/on-parmak-<ad>.js). Harf oyununda (balon) metin
   boşluksuz harf dizisi, en az 20 harf; kelime oyununda boşlukla ayrılmış en az 8 kelime. Uzunluk ≤ hedefHiz × 10.
   Kurallar (tests/on-parmak.spec.js denetler):
     - Bir bölüm yalnız o ana kadar ÖĞRENİLMİŞ tuşları kullanır (kutu `yeni`'leri sırayla birikir; boşluk 2. bölümden sonra).
     - kutu 21–35 karakter; satır 50–80 ve en çok hedefHiz × 10 karakter (hedef hızda ≤ 2 dk); oyun da ≤ hedefHiz × 10.
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
];
