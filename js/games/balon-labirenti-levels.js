/* ============================================
   Balon Labirenti — labirent tanımları (6 bölüm × 5 labirent)
   --------------------------------------------
   Kanvas 800×500 mantıksal; koordinatlar px. Her kayıt:
     id 'b<bölüm>-<sıra>' · bolum 1-6 · sira 1-5 · ad
     baslangic {x,y}            topun fırlatma noktası (60 px çevresinde duvar yok; tam çekiş 140 px kanvas içinde kalacak kadar içeride)
     duvarlar  [{x,y,w,h}]      eksene paralel kutu, w/h ≥ 20 (zemin 24)
     balonlar  [{x,y}]          yarıçap 16; duvar yüzeyinden ≥ 20, birbirinden ≥ 30, kenardan ≥ 24
     hareketli [{x,y,w,h,hedef:{x,y},sure}]  (bölüm 4+) x,y ↔ hedef gidiş-dönüş sure s; nişanda başlangıçta bekler
     hava      [{x,y,w,h,guc}]  (bölüm 5+) içindeyken yukarı ivme guc·G; guc 1.2-2.0
     cozum     {aci,kuvvet}     tools/balon-labirenti-coz.js önerisi; test 3×3 toleransla (±1°, ±2) doğrular
     ipucu     (isteğe bağlı)   ilk turda gösterilen kısa yönlendirme
   Zorlayıcı ilkeler (dayanıklı çözüm için): 72-76 px koridor/baca içindeki balon her geçişte patlar;
   kova zeminindeki balonları yuvarlanan top alır; tepe noktası yakınındaki balon kuvvete duyarsızdır.
   Üretim: labirenti yaz → node tools/balon-labirenti-coz.js <id> --ascii → cozum'u yapıştır → npm run test:balon
   ============================================ */

window.BALON_LABIRENTI_LEVELS = [
    // ===== BÖLÜM 1 — KOVA: düşür (parabol, kuvvet = mesafe) =====
    {
        id: 'b1-1', bolum: 1, sira: 1, ad: 'Tek Kova',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 400, y: 436, w: 224, h: 24 },
            { x: 400, y: 260, w: 24, h: 176 },
            { x: 600, y: 260, w: 24, h: 176 },
        ],
        balonlar: [{ x: 460, y: 412 }, { x: 512, y: 412 }, { x: 564, y: 412 }],
        cozum: { aci: 53, kuvvet: 70 },
        ipucu: 'Topu geri çek, kovaya at!',
    },
    {
        id: 'b1-2', bolum: 1, sira: 2, ad: 'Uzak Kova',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 580, y: 436, w: 220, h: 24 },
            { x: 580, y: 236, w: 24, h: 200 },
            { x: 776, y: 236, w: 24, h: 200 },
        ],
        balonlar: [{ x: 636, y: 412 }, { x: 690, y: 412 }, { x: 744, y: 412 }],
        cozum: { aci: 49, kuvvet: 88 },
        ipucu: 'Daha uzağa: daha çok çek.',
    },
    {
        id: 'b1-3', bolum: 1, sira: 3, ad: 'Basamaklı Kova',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 400, y: 280, w: 24, h: 180 },
            { x: 424, y: 380, w: 136, h: 80 },
            { x: 560, y: 436, w: 136, h: 24 },
            { x: 696, y: 280, w: 24, h: 180 },
        ],
        balonlar: [{ x: 470, y: 356 }, { x: 530, y: 356 }, { x: 600, y: 412 }, { x: 660, y: 412 }],
        cozum: { aci: 49, kuvvet: 69 },
        ipucu: 'Önce üst basamağa düşür.',
    },
    {
        id: 'b1-4', bolum: 1, sira: 4, ad: 'Yüksek Kova',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 420, y: 300, w: 220, h: 24 },
            { x: 420, y: 180, w: 24, h: 120 },
            { x: 616, y: 180, w: 24, h: 120 },
        ],
        balonlar: [{ x: 470, y: 276 }, { x: 515, y: 276 }, { x: 560, y: 276 }, { x: 595, y: 276 }],
        cozum: { aci: 59, kuvvet: 82 },
        ipucu: 'Yukarıdaki kovaya lob at.',
    },
    {
        id: 'b1-5', bolum: 1, sira: 5, ad: 'Huni',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 300, y: 260, w: 24, h: 200 },
            { x: 676, y: 260, w: 24, h: 200 },
            { x: 300, y: 436, w: 400, h: 24 },
            { x: 324, y: 376, w: 152, h: 60 },
            { x: 552, y: 376, w: 124, h: 60 },
        ],
        balonlar: [{ x: 390, y: 352 }, { x: 440, y: 352 }, { x: 514, y: 352 }, { x: 514, y: 412 }],
        cozum: { aci: 57, kuvvet: 78 },
        ipucu: 'Sol basamağa düşür, huni gerisini yapar.',
    },

    // ===== BÖLÜM 2 — SEKME: yansıma =====
    {
        id: 'b2-1', bolum: 2, sira: 1, ad: 'Zemin Sekmesi',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 800, h: 24 },
            { x: 520, y: 180, w: 280, h: 24 },
            { x: 520, y: 180, w: 24, h: 180 },
            { x: 776, y: 204, w: 24, h: 232 },
        ],
        balonlar: [{ x: 532, y: 398 }, { x: 600, y: 412 }, { x: 660, y: 412 }, { x: 720, y: 412 }],
        cozum: { aci: 359, kuvvet: 35 },
        ipucu: 'Alçak at, zeminden seksin, kapının altından girsin.',
    },
    {
        id: 'b2-2', bolum: 2, sira: 2, ad: 'Ayna',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 800, h: 24 },
            { x: 400, y: 120, w: 24, h: 316 },
            { x: 776, y: 60, w: 24, h: 376 },
        ],
        balonlar: [{ x: 470, y: 412 }, { x: 560, y: 412 }, { x: 660, y: 412 }, { x: 740, y: 412 }],
        cozum: { aci: 61, kuvvet: 88 },
        ipucu: 'Sütunun üstünden aşır; duvar geri gönderir.',
    },
    {
        id: 'b2-3', bolum: 2, sira: 3, ad: 'Köşe',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 300, y: 436, w: 500, h: 24 },
            { x: 300, y: 300, w: 24, h: 136 },
            { x: 776, y: 100, w: 24, h: 336 },
            { x: 520, y: 330, w: 256, h: 24 },
            { x: 520, y: 234, w: 256, h: 24 },
        ],
        balonlar: [{ x: 600, y: 294 }, { x: 700, y: 294 }, { x: 420, y: 412 }, { x: 350, y: 412 }],
        cozum: { aci: 38, kuvvet: 75 },
        ipucu: 'Köşedeki kovuğa gir; duvar geri gönderir, top aşağı düşer.',
    },
    {
        id: 'b2-4', bolum: 2, sira: 4, ad: 'Tünel',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 360, y: 336, w: 440, h: 24 },
            { x: 360, y: 432, w: 440, h: 24 },
            { x: 776, y: 360, w: 24, h: 72 },
        ],
        balonlar: [{ x: 430, y: 396 }, { x: 520, y: 396 }, { x: 610, y: 396 }, { x: 700, y: 396 }],
        cozum: { aci: 21, kuvvet: 49 },
        ipucu: 'Tünelin ağzını tuttur, gerisi sekme.',
    },
    {
        id: 'b2-5', bolum: 2, sira: 5, ad: 'Kutu',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 440, y: 436, w: 240, h: 24 },
            { x: 440, y: 180, w: 24, h: 256 },
            { x: 656, y: 60, w: 24, h: 376 },
            { x: 440, y: 180, w: 78, h: 24 },
            { x: 602, y: 180, w: 78, h: 24 },
        ],
        balonlar: [{ x: 490, y: 412 }, { x: 540, y: 412 }, { x: 590, y: 412 }, { x: 630, y: 412 }],
        cozum: { aci: 61, kuvvet: 82 },
        ipucu: 'Dar ağızdan içeri; arka duvar topu geri düşürür.',
    },

    // ===== BÖLÜM 3 — BACA: yönlendirme =====
    {
        id: 'b3-1', bolum: 3, sira: 1, ad: 'Baca',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 538, y: 260, w: 24, h: 200 },
            { x: 638, y: 120, w: 24, h: 340 },
            { x: 538, y: 436, w: 124, h: 24 },
            { x: 470, y: 260, w: 68, h: 20 },
        ],
        balonlar: [{ x: 600, y: 412 }, { x: 600, y: 370 }, { x: 600, y: 328 }, { x: 600, y: 286 }],
        cozum: { aci: 52, kuvvet: 82 },
        ipucu: 'Bacanın ağzına yukarıdan düşür.',
    },
    {
        id: 'b3-2', bolum: 3, sira: 2, ad: 'S Koridoru',
        baslangic: { x: 100, y: 120 },
        duvarlar: [
            { x: 0, y: 140, w: 24, h: 320 },
            { x: 776, y: 140, w: 24, h: 320 },
            { x: 24, y: 200, w: 500, h: 24 },
            { x: 276, y: 320, w: 500, h: 24 },
            { x: 24, y: 436, w: 752, h: 24 },
        ],
        balonlar: [{ x: 480, y: 176 }, { x: 430, y: 176 }, { x: 310, y: 296 }, { x: 360, y: 296 }, { x: 200, y: 412 }, { x: 130, y: 412 }],
        cozum: { aci: 359, kuvvet: 36 },
        ipucu: 'Rafın ucundan düşsün, bir sonrakine geçsin.',
    },
    {
        id: 'b3-3', bolum: 3, sira: 3, ad: 'Langırt',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 216, y: 436, w: 584, h: 24 },
            { x: 216, y: 300, w: 24, h: 136 },
            { x: 776, y: 120, w: 24, h: 316 },
            { x: 380, y: 180, w: 40, h: 40 },
            { x: 300, y: 260, w: 40, h: 40 },
            { x: 460, y: 260, w: 40, h: 40 },
            { x: 380, y: 340, w: 40, h: 40 },
        ],
        balonlar: [{ x: 330, y: 412 }, { x: 400, y: 412 }, { x: 470, y: 412 }, { x: 600, y: 412 }, { x: 700, y: 412 }],
        cozum: { aci: 58, kuvvet: 80 },
        ipucu: 'Tamponların arasından süzül, zeminde yuvarlan.',
    },
    {
        id: 'b3-4', bolum: 3, sira: 4, ad: 'Çatı',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 800, h: 24 },
            { x: 300, y: 240, w: 500, h: 24 },
            { x: 300, y: 240, w: 24, h: 120 },
            { x: 776, y: 264, w: 24, h: 172 },
        ],
        balonlar: [{ x: 312, y: 398 }, { x: 560, y: 412 }, { x: 640, y: 412 }, { x: 720, y: 412 }],
        cozum: { aci: 359, kuvvet: 35 },
        ipucu: 'Çatının altına alçaktan gir.',
    },
    {
        id: 'b3-5', bolum: 3, sira: 5, ad: 'Plinko',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 440, y: 436, w: 280, h: 24 },
            { x: 440, y: 260, w: 24, h: 176 },
            { x: 696, y: 260, w: 24, h: 176 },
            { x: 500, y: 170, w: 20, h: 20 },
            { x: 580, y: 170, w: 20, h: 20 },
            { x: 660, y: 170, w: 20, h: 20 },
            { x: 540, y: 220, w: 20, h: 20 },
            { x: 620, y: 220, w: 20, h: 20 },
        ],
        balonlar: [{ x: 490, y: 412 }, { x: 546, y: 412 }, { x: 602, y: 412 }, { x: 658, y: 412 }],
        cozum: { aci: 52, kuvvet: 73 },
        ipucu: 'Çivilerden süzülüp kovaya.',
    },

    // ===== BÖLÜM 4 — KAPI: hareketli platform, zamanlama =====
    {
        id: 'b4-1', bolum: 4, sira: 1, ad: 'Kayan Kapak',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 400, y: 436, w: 224, h: 24 },
            { x: 400, y: 236, w: 24, h: 200 },
            { x: 600, y: 236, w: 24, h: 200 },
        ],
        hareketli: [{ x: 424, y: 216, w: 80, h: 20, hedef: { x: 520, y: 216 }, sure: 2.4 }],
        balonlar: [{ x: 460, y: 412 }, { x: 512, y: 412 }, { x: 564, y: 412 }],
        cozum: { aci: 59, kuvvet: 72 },
        ipucu: 'Kapak açıkken düşür: attığın an hareket başlar.',
    },
    {
        id: 'b4-2', bolum: 4, sira: 2, ad: 'Ping-Pong Kapı',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 360, y: 336, w: 440, h: 24 },
            { x: 360, y: 432, w: 440, h: 24 },
            { x: 776, y: 360, w: 24, h: 72 },
        ],
        hareketli: [{ x: 520, y: 360, w: 20, h: 24, hedef: { x: 520, y: 408 }, sure: 2.0 }],
        balonlar: [{ x: 420, y: 396 }, { x: 470, y: 396 }, { x: 600, y: 396 }, { x: 700, y: 396 }],
        cozum: { aci: 23, kuvvet: 48 },
        ipucu: 'Kapı inip çıkar; açık yanından geç.',
    },
    {
        id: 'b4-3', bolum: 4, sira: 3, ad: 'Perde',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 360, y: 200, w: 440, h: 24 },
            { x: 360, y: 296, w: 280, h: 24 },
            { x: 300, y: 436, w: 500, h: 24 },
            { x: 776, y: 224, w: 24, h: 212 },
        ],
        hareketli: [{ x: 336, y: 224, w: 20, h: 24, hedef: { x: 336, y: 296 }, sure: 1.2 }],
        balonlar: [{ x: 420, y: 260 }, { x: 480, y: 260 }, { x: 540, y: 260 }, { x: 600, y: 260 }],
        cozum: { aci: 52, kuvvet: 61 },
        ipucu: 'Perde inerken üst koridora gir.',
    },
    {
        id: 'b4-4', bolum: 4, sira: 4, ad: 'Kayan Köprü',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 260, h: 24 },
            { x: 460, y: 436, w: 340, h: 24 },
            { x: 776, y: 240, w: 24, h: 196 },
        ],
        hareketli: [{ x: 260, y: 436, w: 100, h: 24, hedef: { x: 360, y: 436 }, sure: 2.0 }],
        balonlar: [{ x: 360, y: 412 }, { x: 520, y: 412 }, { x: 600, y: 412 }, { x: 680, y: 412 }, { x: 750, y: 412 }],
        cozum: { aci: 313, kuvvet: 46 },
        ipucu: 'Köprü boşluğu kapatınca geç.',
    },
    {
        id: 'b4-5', bolum: 4, sira: 5, ad: 'Çift Kapaklı Kova',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 400, y: 436, w: 280, h: 24 },
            { x: 400, y: 216, w: 24, h: 220 },
            { x: 656, y: 216, w: 24, h: 220 },
        ],
        hareketli: [
            { x: 490, y: 196, w: 40, h: 20, hedef: { x: 424, y: 196 }, sure: 2.4 },
            { x: 550, y: 196, w: 40, h: 20, hedef: { x: 616, y: 196 }, sure: 2.4 },
        ],
        balonlar: [{ x: 460, y: 412 }, { x: 516, y: 412 }, { x: 572, y: 412 }, { x: 632, y: 412 }],
        cozum: { aci: 72, kuvvet: 91 },
        ipucu: 'Kapaklar açılırken düşür; kapanmadan önce.',
    },

    // ===== BÖLÜM 5 — RÜZGÂR: sıcak hava =====
    {
        id: 'b5-1', bolum: 5, sira: 1, ad: 'Sıcak Hava',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 180, h: 24 },
            { x: 260, y: 436, w: 540, h: 24 },
            { x: 400, y: 180, w: 24, h: 180 },
            { x: 500, y: 180, w: 24, h: 256 },
        ],
        hava: [{ x: 424, y: 180, w: 76, h: 256, guc: 1.6 }],
        balonlar: [{ x: 462, y: 412 }, { x: 462, y: 370 }, { x: 462, y: 328 }, { x: 462, y: 286 }, { x: 462, y: 244 }],
        cozum: { aci: 301, kuvvet: 40 },
        ipucu: 'Çukuru atla, topu sıcak havanın içine yuvarla; hava yükseltir.',
    },
    {
        id: 'b5-2', bolum: 5, sira: 2, ad: 'Rüzgâr Köprüsü',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 160, h: 24 },
            { x: 360, y: 360, w: 24, h: 100 },
            { x: 384, y: 436, w: 416, h: 24 },
            { x: 776, y: 240, w: 24, h: 196 },
        ],
        hava: [{ x: 240, y: 200, w: 120, h: 300, guc: 2.0 }],
        balonlar: [{ x: 460, y: 412 }, { x: 540, y: 412 }, { x: 620, y: 412 }, { x: 700, y: 412 }],
        cozum: { aci: 310, kuvvet: 37 },
        ipucu: 'Sıcak havaya uç; hava duvarın üstünden aşırır.',
    },
    {
        id: 'b5-3', bolum: 5, sira: 3, ad: 'Yükselen Baca',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 180, h: 24 },
            { x: 260, y: 436, w: 540, h: 24 },
            { x: 400, y: 60, w: 24, h: 300 },
            { x: 500, y: 60, w: 24, h: 376 },
        ],
        hava: [{ x: 424, y: 100, w: 76, h: 336, guc: 1.8 }],
        balonlar: [{ x: 462, y: 412 }, { x: 462, y: 340 }, { x: 462, y: 268 }, { x: 462, y: 196 }, { x: 462, y: 124 }],
        cozum: { aci: 304, kuvvet: 37 },
        ipucu: 'Bacanın dibinden gir, hava seni yukarı taşır.',
    },
    {
        id: 'b5-4', bolum: 5, sira: 4, ad: 'Rüzgâr Kapısı',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 180, h: 24 },
            { x: 260, y: 436, w: 540, h: 24 },
            { x: 478, y: 100, w: 24, h: 260 },
            { x: 578, y: 100, w: 24, h: 336 },
        ],
        hareketli: [{ x: 502, y: 120, w: 40, h: 20, hedef: { x: 538, y: 120 }, sure: 2.0 }],
        hava: [{ x: 502, y: 140, w: 76, h: 296, guc: 1.6 }],
        balonlar: [{ x: 540, y: 412 }, { x: 540, y: 340 }, { x: 540, y: 268 }, { x: 540, y: 196 }, { x: 540, y: 80 }],
        cozum: { aci: 24, kuvvet: 38 },
        ipucu: 'Yükselirken kapağın açık yanından çık.',
    },
    {
        id: 'b5-5', bolum: 5, sira: 5, ad: 'İki Rüzgâr',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 180, h: 24 },
            { x: 260, y: 436, w: 540, h: 24 },
            { x: 300, y: 60, w: 24, h: 300 },
            { x: 400, y: 180, w: 24, h: 256 },
            { x: 424, y: 180, w: 136, h: 24 },
            { x: 560, y: 180, w: 24, h: 256 },
            { x: 660, y: 60, w: 24, h: 376 },
        ],
        hava: [
            { x: 324, y: 180, w: 76, h: 256, guc: 1.6 },
            { x: 584, y: 180, w: 76, h: 256, guc: 1.6 },
        ],
        balonlar: [{ x: 362, y: 412 }, { x: 362, y: 330 }, { x: 362, y: 248 }, { x: 490, y: 156 }, { x: 622, y: 412 }, { x: 622, y: 330 }, { x: 622, y: 248 }],
        cozum: { aci: 346, kuvvet: 80 },
        ipucu: 'Birinci sütun seni rafa, raf ikinci sütuna atar.',
    },

    // ===== BÖLÜM 6 — FIRTINA: hepsi birden =====
    {
        id: 'b6-1', bolum: 6, sira: 1, ad: 'Fırtına Kovası',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 180, h: 24 },
            { x: 300, y: 436, w: 380, h: 24 },
            { x: 300, y: 236, w: 24, h: 200 },
            { x: 656, y: 120, w: 24, h: 240 },
            { x: 680, y: 436, w: 120, h: 24 },
            { x: 756, y: 120, w: 24, h: 316 },
        ],
        hava: [{ x: 680, y: 140, w: 76, h: 296, guc: 1.6 }],
        balonlar: [{ x: 560, y: 412 }, { x: 620, y: 412 }, { x: 718, y: 412 }, { x: 718, y: 340 }, { x: 718, y: 268 }, { x: 718, y: 196 }],
        cozum: { aci: 56, kuvvet: 67 },
        ipucu: 'Çukuru atla, kovada yuvarlan, sıcak bacaya gir.',
    },
    {
        id: 'b6-2', bolum: 6, sira: 2, ad: 'Uzun Yol',
        baslangic: { x: 100, y: 120 },
        duvarlar: [
            { x: 0, y: 140, w: 24, h: 320 },
            { x: 776, y: 140, w: 24, h: 320 },
            { x: 24, y: 200, w: 500, h: 24 },
            { x: 276, y: 320, w: 500, h: 24 },
            { x: 24, y: 436, w: 752, h: 24 },
        ],
        hava: [{ x: 24, y: 244, w: 76, h: 192, guc: 2.0 }],
        balonlar: [{ x: 480, y: 176 }, { x: 430, y: 176 }, { x: 310, y: 296 }, { x: 360, y: 296 }, { x: 62, y: 412 }, { x: 62, y: 350 }, { x: 62, y: 288 }],
        cozum: { aci: 210, kuvvet: 66 },
        ipucu: 'S yolunun sonunda sıcak hava bekliyor.',
    },
    {
        id: 'b6-3', bolum: 6, sira: 3, ad: 'Kapılı Baca',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 180, h: 24 },
            { x: 260, y: 436, w: 540, h: 24 },
            { x: 478, y: 60, w: 24, h: 300 },
            { x: 578, y: 60, w: 24, h: 376 },
        ],
        hareketli: [
            { x: 502, y: 300, w: 40, h: 20, hedef: { x: 538, y: 300 }, sure: 1.6 },
            { x: 538, y: 180, w: 40, h: 20, hedef: { x: 502, y: 180 }, sure: 1.6 },
        ],
        hava: [{ x: 502, y: 100, w: 76, h: 336, guc: 1.8 }],
        balonlar: [{ x: 540, y: 412 }, { x: 540, y: 250 }, { x: 540, y: 130 }, { x: 540, y: 80 }],
        cozum: { aci: 15, kuvvet: 68 },
        ipucu: 'İki kapı, iki zamanlama; hava sabırlıdır.',
    },
    {
        id: 'b6-4', bolum: 6, sira: 4, ad: 'Fırtına Langırtı',
        baslangic: { x: 150, y: 360 },
        duvarlar: [
            { x: 400, y: 436, w: 280, h: 24 },
            { x: 400, y: 260, w: 24, h: 176 },
            { x: 424, y: 380, w: 116, h: 56 },
            { x: 656, y: 120, w: 24, h: 240 },
            { x: 680, y: 436, w: 120, h: 24 },
            { x: 756, y: 120, w: 24, h: 316 },
            { x: 480, y: 170, w: 20, h: 20 },
            { x: 560, y: 170, w: 20, h: 20 },
        ],
        hava: [{ x: 680, y: 140, w: 76, h: 296, guc: 1.5 }],
        balonlar: [{ x: 570, y: 412 }, { x: 620, y: 412 }, { x: 718, y: 412 }, { x: 718, y: 340 }, { x: 718, y: 268 }, { x: 718, y: 196 }],
        cozum: { aci: 43, kuvvet: 81 },
        ipucu: 'Çivilerden kovaya; basamaktan aşağı, sıcak bacaya.',
    },
    {
        id: 'b6-5', bolum: 6, sira: 5, ad: 'Büyük Final',
        baslangic: { x: 100, y: 340 },
        duvarlar: [
            { x: 0, y: 436, w: 180, h: 24 },
            { x: 260, y: 436, w: 540, h: 24 },
            { x: 300, y: 120, w: 20, h: 180 },
            { x: 320, y: 340, w: 240, h: 24 },
            { x: 560, y: 60, w: 24, h: 304 },
            { x: 660, y: 60, w: 24, h: 376 },
        ],
        hareketli: [{ x: 300, y: 300, w: 20, h: 60, hedef: { x: 300, y: 360 }, sure: 1.2 }],
        hava: [{ x: 584, y: 100, w: 76, h: 336, guc: 1.8 }],
        balonlar: [{ x: 345, y: 400 }, { x: 400, y: 400 }, { x: 480, y: 400 }, { x: 622, y: 412 }, { x: 622, y: 330 }, { x: 622, y: 248 }, { x: 622, y: 166 }, { x: 622, y: 84 }],
        cozum: { aci: 296, kuvvet: 44 },
        ipucu: 'Çukur, kapı, tünel, baca: tek atışta hepsi.',
    },
];
