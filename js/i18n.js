/* ============================================
   OYUN BAHÇESİ - Türkçe Dil Dosyası
   ============================================ */

const TR = {
    appName: 'Oyun Bahçesi',
    splashSubtitle: 'Öğrenmeye Hazır Mısın?',
    splashStart: 'Oynamaya Başla!',

    // Oyun isimleri
    games: {
        'hafiza-kartlari': 'Hafıza Kartları',
        'renk-eslestirme': 'Renk Eşleştirme',
        'sayi-sayma': 'Sayı Sayma',
        'harf-tanima': 'Harf Tanıma',
        'sekil-bulmaca': 'Şekil Bulmaca',
        'boyama': 'Boyama',
        'siralama': 'Sıralama',
        'kelime-tahmin': 'Kelime Tahmin',
        'harf-tahmin': 'Harf Tahmin',
        'kod-macerasi': 'Kod Macerası',
    },

    // Multiplayer strings
    multiplayerTitle: 'Çok Oyunculu Oyunlar',
    mp: {
        yourName: 'Adın:',
        createRoom: 'Oda Oluştur',
        joinRoom: 'Lobiye Katıl',
        quickPlay: 'Hızlı Oyun',
        back: 'Geri',
        roomSettings: 'Oda Ayarları',
        letterCount: 'Harf Sayısı:',
        turnCount: 'Tur Sayısı:',
        create: 'Oluştur ✓',
        waitingRoom: 'Bekleme Odası',
        roomCode: 'Oda Kodu:',
        waitingForOpponent: 'Rakip bekleniyor...',
        cancel: 'İptal',
        availableRooms: 'Mevcut Odalar',
        loading: 'Yükleniyor...',
        noRooms: 'Şu an açık oda yok. Yeni bir oda oluşturabilirsin!',
        refresh: 'Yenile ↻',
        join: 'Katıl',
        searching: 'Rakip aranıyor...',
        connecting: 'Bağlanıyor...',
        connectionError: 'Sunucuya bağlanılamadı!',
        writeWord: 'Kelimeni Yaz!',
        writeWordDesc: 'Rakibinin tahmin edeceği {n} harfli bir kelime yaz!',
        opponent: 'Rakip',
        send: 'Gönder ✓',
        waiting: 'Bekleniyor...',
        wordAccepted: 'Kelimen kabul edildi! Rakip bekleniyor...',
        opponentReady: 'Rakip hazır!',
        opponentLeft: 'Rakip oyundan ayrıldı!',
        yourTurn: '🟢 Senin Sıran!',
        opponentTurn: '⏳ Rakibin Sırası...',
        guess: 'Tahmin Et',
        opponentGuesses: 'Rakip tahmin',
        opponentWordTitle: 'Rakibin Kelimesi',
        yourWordTitle: 'Senin Kelimen',
        found: 'Bulunan',
        youWin: 'Kazandın!',
        youLose: 'Kaybettin!',
        draw: 'Berabere!',
        yourWord: 'Senin kelimen',
        opponentWord: 'Rakibin kelimesi',
        you: 'Sen',
        opponentLabel: 'Rakip',
        guesses: 'tahmin',
        playAgain: 'Tekrar Oyna',
        backToHub: 'Ana Sayfa',
    },

    // Seviye tamamlama
    complete: {
        perfect: 'Mükemmel!',
        great: 'Harika!',
        good: 'Aferin!',
        tryAgain: 'Tekrar Dene!',
    },

    // Butonlar
    buttons: {
        replay: 'Tekrar Oyna',
        next: 'Sonraki Seviye',
        hub: 'Oyunlar',
        back: 'Geri',
    },

    // Oyun yönergeleri
    instructions: {
        'hafiza-kartlari': 'Eşleşen kartları bul!',
        'renk-eslestirme': '{color} rengindeki nesneye dokun!',
        'sayi-sayma': 'Kaç tane {object} var? Say ve doğru sayıya bas!',
        'harf-tanima': '"{letter}" harfi ile başlayan resmi bul!',
        'sekil-bulmaca': 'Şekilleri doğru yerlere sürükle!',
        'boyama': 'Bir renk seç ve resmi boya!',
        'siralama': 'Nesneleri küçükten büyüğe sırala!',
        'kod-macerasi': 'Robotu yıldıza götür!',
    },

    // Kod Macerasi stringleri
    kodMacerasi: {
        up: 'Yukarı',
        down: 'Aşağı',
        left: 'Sola',
        right: 'Sağa',
        repeat: 'Tekrarla',
        play: 'Çalıştır',
        ready: 'Hazır',
        reset: 'Sıfırla',
        building: 'Kod yazılıyor...',
        executing: 'Çalıştırılıyor...',
        reached: 'Hedefe Ulaştı!',
        crashed: 'Engele Çarptı!',
        outOfBounds: 'Izgaradan Çıktı!',
        notReached: 'Hedefe Ulaşamadı!',
        blocksUsed: 'Blok',
        round: 'Tur',
        optimal: 'En Az',
        gridSize: 'Izgara Boyutu',
        program: 'Programın',
    },

    // Renkler
    colors: {
        kirmizi: { name: 'Kırmızı', hex: '#E74C3C' },
        mavi: { name: 'Mavi', hex: '#3498DB' },
        sari: { name: 'Sarı', hex: '#F1C40F' },
        yesil: { name: 'Yeşil', hex: '#2ECC71' },
        turuncu: { name: 'Turuncu', hex: '#E67E22' },
        mor: { name: 'Mor', hex: '#9B59B6' },
        pembe: { name: 'Pembe', hex: '#FF69B4' },
        kahverengi: { name: 'Kahverengi', hex: '#8B4513' },
        beyaz: { name: 'Beyaz', hex: '#FFFFFF' },
        siyah: { name: 'Siyah', hex: '#2C3E50' },
    },

    // Türk Alfabesi
    alphabet: [
        'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H',
        'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P',
        'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
    ],

    // Harf-resim eşleştirmeleri
    letterImages: {
        'A': [
            { word: 'Araba', emoji: '🚗' },
            { word: 'Ayı', emoji: '🐻' },
            { word: 'Armut', emoji: '🍐' },
        ],
        'B': [
            { word: 'Balık', emoji: '🐟' },
            { word: 'Balon', emoji: '🎈' },
            { word: 'Böcek', emoji: '🐛' },
        ],
        'C': [
            { word: 'Ceylan', emoji: '🦌' },
            { word: 'Cam', emoji: '🪟' },
        ],
        'Ç': [
            { word: 'Çiçek', emoji: '🌸' },
            { word: 'Çilek', emoji: '🍓' },
            { word: 'Çanta', emoji: '🎒' },
        ],
        'D': [
            { word: 'Deniz', emoji: '🌊' },
            { word: 'Dondurma', emoji: '🍦' },
            { word: 'Dünya', emoji: '🌍' },
        ],
        'E': [
            { word: 'Elma', emoji: '🍎' },
            { word: 'Ev', emoji: '🏠' },
            { word: 'Ekmek', emoji: '🍞' },
        ],
        'F': [
            { word: 'Fil', emoji: '🐘' },
            { word: 'Fare', emoji: '🐭' },
        ],
        'G': [
            { word: 'Güneş', emoji: '☀️' },
            { word: 'Gül', emoji: '🌹' },
            { word: 'Gemi', emoji: '🚢' },
        ],
        'Ğ': [
            { word: 'Dağ', emoji: '⛰️' },
        ],
        'H': [
            { word: 'Havuç', emoji: '🥕' },
            { word: 'Hayvan', emoji: '🐾' },
        ],
        'I': [
            { word: 'Irmak', emoji: '🏞️' },
        ],
        'İ': [
            { word: 'İnek', emoji: '🐄' },
            { word: 'İğne', emoji: '🪡' },
        ],
        'J': [
            { word: 'Jimnastik', emoji: '🤸' },
        ],
        'K': [
            { word: 'Kedi', emoji: '🐱' },
            { word: 'Kuş', emoji: '🐦' },
            { word: 'Kelebek', emoji: '🦋' },
        ],
        'L': [
            { word: 'Lale', emoji: '🌷' },
            { word: 'Limon', emoji: '🍋' },
        ],
        'M': [
            { word: 'Muz', emoji: '🍌' },
            { word: 'Masa', emoji: '🪑' },
            { word: 'Maymun', emoji: '🐒' },
        ],
        'N': [
            { word: 'Nar', emoji: '🍎' },
        ],
        'O': [
            { word: 'Okul', emoji: '🏫' },
            { word: 'Otobüs', emoji: '🚌' },
        ],
        'Ö': [
            { word: 'Ördek', emoji: '🦆' },
        ],
        'P': [
            { word: 'Panda', emoji: '🐼' },
            { word: 'Portakal', emoji: '🍊' },
        ],
        'R': [
            { word: 'Robot', emoji: '🤖' },
            { word: 'Roket', emoji: '🚀' },
        ],
        'S': [
            { word: 'Sincap', emoji: '🐿️' },
            { word: 'Sepet', emoji: '🧺' },
        ],
        'Ş': [
            { word: 'Şemsiye', emoji: '☂️' },
            { word: 'Şeker', emoji: '🍬' },
        ],
        'T': [
            { word: 'Tavşan', emoji: '🐰' },
            { word: 'Tren', emoji: '🚂' },
            { word: 'Top', emoji: '⚽' },
        ],
        'U': [
            { word: 'Uçak', emoji: '✈️' },
            { word: 'Uzay', emoji: '🌌' },
        ],
        'Ü': [
            { word: 'Üzüm', emoji: '🍇' },
        ],
        'V': [
            { word: 'Vapur', emoji: '⛴️' },
        ],
        'Y': [
            { word: 'Yıldız', emoji: '⭐' },
            { word: 'Yılan', emoji: '🐍' },
        ],
        'Z': [
            { word: 'Zürafa', emoji: '🦒' },
            { word: 'Zebra', emoji: '🦓' },
        ],
    },

    // Sayma nesneleri
    countingObjects: [
        { name: 'elma', emoji: '🍎' },
        { name: 'yıldız', emoji: '⭐' },
        { name: 'çiçek', emoji: '🌸' },
        { name: 'balık', emoji: '🐟' },
        { name: 'kelebek', emoji: '🦋' },
        { name: 'kalp', emoji: '❤️' },
        { name: 'balon', emoji: '🎈' },
        { name: 'araba', emoji: '🚗' },
        { name: 'kuş', emoji: '🐦' },
        { name: 'portakal', emoji: '🍊' },
    ],

    // Hafıza kartı emojileri
    memoryEmojis: [
        '🐶', '🐱', '🐰', '🦊', '🐻', '🐼',
        '🦁', '🐸', '🐧', '🦋', '🐢', '🐝',
        '🌸', '🌻', '⭐', '🍎', '🍌', '🚗',
        '✈️', '🚀', '🎈', '🌈', '🍓', '🎵',
    ],
    memoryImages: [
        'dog', 'cat', 'rabbit', 'fox', 'bear', 'panda',
        'lion', 'frog', 'penguin', 'butterfly', 'turtle', 'bee',
        'flower', 'sunflower', 'star', 'apple', 'banana', 'car',
        'airplane', 'rocket', 'balloon', 'rainbow', 'strawberry', 'music',
    ],

    // Şekiller
    shapes: {
        daire: 'Daire',
        kare: 'Kare',
        ucgen: 'Üçgen',
        dikdortgen: 'Dikdörtgen',
        yildiz: 'Yıldız',
        kalp: 'Kalp',
        oval: 'Oval',
        eskenar: 'Eşkenar Dörtgen',
    },
};
