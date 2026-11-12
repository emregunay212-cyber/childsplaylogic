/* Ritim Koşusu — bölüm verisi (RKLevels)
   Tüm bölümler ÖZGÜNdür. Veri biçimi RITIM-KOSUSU planı §4 (nesneler[] { t, x, y, … }).
   Bölümler küçük bir kurucu (yap) ile yazılır; çıktı düz JSON'dur (editör/sunucu aynı biçimi okur).
   Her bölüm baştan ve her checkpoint'ten, her coin de ayrı ayrı doğrulama botuyla geçilebilir olmalı:
   `npm run test:ritim` (tests/ritim-kosusu-bot.mjs). */
/* global module */
(function (root) {
    'use strict';
    const CEIL = 9;

    function yap(meta, fn) {
        const n = [];
        const b = {
            d: (x, y = 0) => n.push({ t: 'diken', x, y }),
            da: (x, y = CEIL - 1) => n.push({ t: 'diken', x, y, yon: 'asagi' }),
            dn: (x, k, y = 0) => { for (let i = 0; i < k; i++) n.push({ t: 'diken', x: x + i, y }); },
            dan: (x, k, y = CEIL - 1) => { for (let i = 0; i < k; i++) n.push({ t: 'diken', x: x + i, y, yon: 'asagi' }); },
            yd: (x, y = 0) => n.push({ t: 'yarim_diken', x, y }),
            k: (x, y, g, h) => n.push({ t: 'blok', x, y, g, h }),
            // gemi sütunu: alttan h yükseklik, üstten u derinlik
            sutun: (x, h, u, g = 1) => {
                if (h > 0) n.push({ t: 'blok', x, y: 0, g, h });
                if (u > 0) n.push({ t: 'blok', x, y: CEIL - u, g, h: u });
            },
            pad: (x, tip = 'sari', y = 0) => n.push({ t: 'pad_' + tip, x, y }),
            h: (x, y, tip = 'sari') => n.push({ t: 'halka_' + tip, x, y }),
            mod: (x, m, y) => n.push(y === undefined ? { t: 'portal_mod', x, deger: m } : { t: 'portal_mod', x, deger: m, y }),
            yc: (x, v, y) => n.push(y === undefined ? { t: 'portal_yercekimi', x, deger: v } : { t: 'portal_yercekimi', x, deger: v, y }),
            hiz: (x, v, y) => n.push(y === undefined ? { t: 'portal_hiz', x, deger: v } : { t: 'portal_hiz', x, deger: v, y }),
            cp: (x) => n.push({ t: 'checkpoint', x }),
            coin: (x, y, no) => n.push({ t: 'coin', x, y, no }),
            cukur: (x, g) => n.push({ t: 'cukur', x, g }),
            saw: (x, y, r = 1) => n.push({ t: 'testere', x, y, r }),
        };
        fn(b);
        return Object.assign({ baslangic: { mod: 'kup', hiz: 1, yercekimi: 'normal' } }, meta, { nesneler: n });
    }

    const B = [];

    // ── 1 · İlk Adım — küp, diken, blok ──
    B.push(yap({
        id: 'd1-01', ad: 'İlk Adım', dunya: 1, zorluk: 'Kolay', yildiz: 1, bpm: 128,
        tema: { gok1: '#0e1240', gok2: '#1f3a9e', zemin: '#1d4fd8', cizgi: '#9fd2ff' }, bitis: 470,
    }, (b) => {
        [24, 44, 64, 84].forEach(x => b.d(x));
        b.cp(92);
        [104, 124, 144].forEach(x => b.dn(x, 2));
        b.k(158, 0, 4, 1);
        // merdiven 1-2-3, iniş 2-1
        b.k(170, 0, 4, 1); b.k(174, 0, 4, 2); b.k(178, 0, 5, 3);
        b.coin(181, 5.3, 1);
        b.k(183, 0, 3, 2); b.k(186, 0, 3, 1);
        b.d(194);
        b.cp(204);
        // platformlar arası diken çukurları
        b.k(212, 0, 9, 1); b.dn(221, 2); b.k(223, 0, 9, 1); b.dn(232, 2); b.k(234, 0, 9, 1); b.dn(243, 3); b.k(246, 0, 6, 1);
        b.cp(262);
        // nakarat: üçlü diken, art arda tekliler, blok üstünde diken
        b.dn(272, 2); b.d(290); b.coin(293.6, 0.6, 2); b.d(297); b.d(304);
        b.k(318, 0, 6, 1); b.d(321, 1);
        b.dn(336, 2);
        b.cp(350);
        // merdiven yukarı + platformda tekli dikenler
        b.k(360, 0, 6, 1); b.k(366, 0, 8, 2); b.d(371, 2); b.k(374, 0, 9, 3); b.d(379, 3);
        b.coin(385, 5.4, 3);
        b.k(383, 0, 4, 2); b.k(387, 0, 4, 1);
        b.d(400); b.d(416);
    }));

    // ── 2 · Sarı Yay — sarı ped, sarı halka ──
    B.push(yap({
        id: 'd1-02', ad: 'Sarı Yay', dunya: 1, zorluk: 'Kolay', yildiz: 2, bpm: 130,
        tema: { gok1: '#2a0d45', gok2: '#6b2fa8', zemin: '#9b4dd8', cizgi: '#f0c8ff' }, bitis: 470,
    }, (b) => {
        b.d(22); b.d(40); b.dn(56, 2);
        b.pad(73); b.dn(75, 3);
        b.pad(103); b.dn(105, 3);
        b.cp(118);
        // havada sarı halkalar, altlarında diken çukurları
        [134, 156, 178].forEach(x => { b.dn(x - 1, 4); b.h(x + 1, 2.4); });
        b.cp(196);
        // ped → halka → yüksek platform
        b.pad(206); b.h(209, 5.3); b.k(212, 4, 10, 1); b.dn(209, 16);
        b.coin(220, 7.2, 1);
        b.cp(240);
        // iki rota: üstte halkalar (coin), altta dikenler arası zıplama
        b.d(252); b.d(262); b.d(272);
        b.pad(246); b.h(249.5, 5.2); b.coin(253, 7.3, 2);
        b.cp(290);
        // vuruşa oturan halka dizisi (diken tabanı üstünde)
        b.dn(301, 15); [302, 305.5, 309, 312.5].forEach(x => b.h(x, 2.5));
        b.cp(336);
        // final: pedlerle yükselen basamaklar
        b.pad(344); b.k(350, 0, 6, 3); b.pad(354, 'sari', 3); b.k(357, 0, 11, 5);
        b.coin(364, 7.8, 3);
        b.k(368, 0, 4, 3); b.k(372, 0, 4, 1);
        b.d(388); b.dn(404, 2);
    }));

    // ── 3 · Basamaklar — havada platformlar, çukurlar ──
    B.push(yap({
        id: 'd1-03', ad: 'Basamaklar', dunya: 1, zorluk: 'Kolay', yildiz: 2, bpm: 132,
        tema: { gok1: '#3a1206', gok2: '#c85a1e', zemin: '#e07a2a', cizgi: '#ffe0b0' }, bitis: 460,
    }, (b) => {
        b.k(24, 0, 3, 1); b.k(40, 0, 3, 1); b.k(56, 0, 5, 1);
        b.cp(70);
        // zemin kalkar: çukur üstünde platformlar
        b.cukur(78, 74);
        [[76, 6], [85, 4], [92, 4], [99, 5], [107, 4], [114, 4], [121, 5], [129, 4], [136, 4], [143, 9]]
            .forEach(([x, g]) => b.k(x, 0, g, 1));
        b.cp(158);
        // yükselen merdiven (havada)
        b.cukur(166, 60);
        [[164, 5, 1], [172, 4, 2], [179, 4, 3], [186, 4, 4], [193, 4, 5], [200, 5, 5]].forEach(([x, g, y]) => b.k(x, y - 0.6, g, 0.6));
        b.coin(203.5, 7.6, 1);
        // inen merdiven
        [[208, 4, 4], [215, 4, 3], [222, 4, 2]].forEach(([x, g, y]) => b.k(x, y - 0.6, g, 0.6));
        b.cp(232);
        // dar platformlar + pedli adacıklar
        b.cukur(236, 66);
        b.k(234, 0, 4, 1); b.k(241, 0, 2, 1); b.k(247, 0, 2, 1); b.k(253, 0, 3, 1); b.pad(254, 'sari', 1); b.k(258, 0, 4, 2);
        b.k(265, 0, 3, 1); b.k(270, 0, 2, 1); b.k(276, 0, 3, 1); b.pad(277, 'sari', 1); b.k(281, 0, 4, 2);
        b.coin(271, 1.3, 2);
        b.k(288, 0, 3, 1); b.k(293, 0, 2, 1); b.k(298, 0, 6, 1);
        b.cp(310);
        // final: büyük blok kulesi
        b.k(322, 0, 4, 1); b.k(326, 0, 4, 2); b.k(330, 0, 4, 3); b.k(334, 0, 22, 4);
        b.d(342, 4); b.d(350, 4);
        b.coin(359, 1.6, 3); b.k(362, 0, 3, 2);
        b.d(376); b.d(392);
    }));

    // ── 4 · Kanatlar — gemi ──
    B.push(yap({
        id: 'd1-04', ad: 'Kanatlar', dunya: 1, zorluk: 'Normal', yildiz: 3, bpm: 135,
        tema: { gok1: '#3b0a2a', gok2: '#e0603a', zemin: '#ff8a4a', cizgi: '#ffd6b8' }, bitis: 500,
    }, (b) => {
        b.d(24); b.dn(42, 2); b.d(58);
        b.mod(72, 'gemi');
        // geniş koridor, yumuşak dalgalanan zemin/tavan
        for (let i = 0; i < 10; i++) {
            const x = 80 + i * 8;
            const h = [0, 1, 2, 1, 0, 1, 2, 2, 1, 0][i];
            const u = [2, 1, 0, 1, 2, 2, 1, 0, 1, 2][i];
            b.sutun(x, h, u, 8);
        }
        b.coin(124, 7.4, 1);
        b.cp(162);
        b.mod(168, 'kup');
        b.d(184); b.dn(198, 2);
        b.cp(212);
        b.mod(220, 'gemi');
        // sütunlar: alttan–üstten dönüşümlü
        [232, 246, 260, 274, 288, 302].forEach((x, i) => {
            if (i % 2 === 0) b.sutun(x, 5, 0, 2); else b.sutun(x, 0, 5, 2);
        });
        b.coin(281, 4.5, 2);
        b.cp(312);
        // daralan koridor + testereler
        b.k(318, 0, 60, 1.5); b.k(318, 6, 60, 3);
        b.saw(338, 1.5, 1); b.saw(356, 6, 1);
        b.cp(384);
        b.mod(390, 'kup');
        b.d(404); b.dn(418, 2); b.k(432, 0, 4, 1); b.d(440);
        b.coin(445, 3.2, 3);
        b.d(456);
    }));

    // ── 5 · Ters Dünya — yerçekimi portalı, mavi ped ──
    B.push(yap({
        id: 'd1-05', ad: 'Ters Dünya', dunya: 1, zorluk: 'Normal', yildiz: 3, bpm: 138,
        tema: { gok1: '#04140c', gok2: '#0f5a34', zemin: '#2fbf6a', cizgi: '#c4ffd9' }, bitis: 500,
    }, (b) => {
        b.d(24); b.dn(40, 2);
        b.pad(58, 'mavi');
        b.da(76); b.da(92);
        b.yc(104, 'normal');
        b.cp(120);
        // uzun tavan koşusu
        b.pad(128, 'mavi');
        b.da(146); b.dan(162, 2); b.da(180); b.coin(186, 7.2, 1); b.da(192); b.dan(208, 2);
        b.yc(222, 'normal');
        b.cp(236);
        // gemi + ters yerçekimi
        b.mod(244, 'gemi'); b.yc(250, 'ters');
        [262, 276, 290, 304].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 4.5, 0, 2); else b.sutun(x, 0, 4.5, 2); });
        b.coin(297, 1.2, 2);
        b.yc(318, 'normal'); b.mod(324, 'kup');
        b.cp(334);
        // mavi halkalarla zemin–tavan gidiş gelişi
        b.dn(346, 4); b.h(347, 2.6, 'mavi');
        b.dan(362, 4); b.h(363, 6.4, 'mavi');
        b.dn(378, 4); b.h(379, 2.6, 'mavi');
        b.dan(394, 4); b.h(395, 6.4, 'mavi');
        b.cp(406);
        // simetrik final
        [418, 434, 450].forEach(x => { b.d(x); b.da(x); });
        b.coin(442, 7.6, 3);
        b.pad(440, 'mavi'); b.yc(462, 'normal');
        b.d(474);
    }));

    // ── 6 · Mavi Kapı — Dünya 1 sınavı ──
    B.push(yap({
        id: 'd1-06', ad: 'Mavi Kapı', dunya: 1, zorluk: 'Normal', yildiz: 4, bpm: 140,
        tema: { gok1: '#0a0f3a', gok2: '#3a2a9e', zemin: '#5b4ae0', cizgi: '#d8d0ff' }, bitis: 560,
    }, (b) => {
        b.k(24, 0, 4, 1); b.k(28, 0, 4, 2); b.d(31, 2); b.k(32, 0, 6, 1); b.d(46);
        b.dn(60, 2);
        b.cp(74);
        b.pad(84); b.h(87, 5.3); b.k(90, 4, 8, 1); b.dn(87, 14); b.coin(95, 7.2, 1);
        b.dn(118, 4); b.h(119, 2.4);
        b.cp(134);
        b.mod(142, 'gemi');
        [154, 168, 182, 196].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 5, 0, 2); else b.sutun(x, 0, 5, 2); });
        b.saw(210, 4.5, 1);
        b.mod(222, 'kup');
        b.cp(232);
        b.pad(244, 'mavi'); b.da(262); b.dan(276, 2); b.coin(284, 7.4, 2); b.da(292);
        b.yc(304, 'normal');
        b.cp(318);
        b.mod(326, 'gemi'); b.yc(330, 'ters');
        b.k(340, 0, 50, 2); b.k(340, 7, 50, 2);
        b.saw(356, 2, 0.8); b.saw(372, 7, 0.8);
        b.yc(396, 'normal'); b.mod(402, 'kup');
        b.cp(412);
        b.dn(424, 15); [425, 428.5, 432, 435.5].forEach(x => b.h(x, 2.5)); b.coin(430.3, 4.4, 3);
        b.d(458); b.dn(474, 2); b.d(492); b.dn(508, 2);
    }));

    // ── 7 · Yuvarlan — top (Dünya 2 başlangıcı) ──
    B.push(yap({
        id: 'd2-07', ad: 'Yuvarlan', dunya: 2, zorluk: 'Zor', yildiz: 4, bpm: 140,
        tema: { gok1: '#2a0508', gok2: '#8a1424', zemin: '#d63a4a', cizgi: '#ffd0d6' }, bitis: 520,
    }, (b) => {
        b.d(24); b.dn(40, 2);
        b.mod(56, 'top');
        // tek tık geçişler: alt ve üst sırayla dikenli
        b.dn(72, 3); b.dan(92, 3); b.dn(112, 3); b.dan(132, 3);
        b.cp(146);
        // kesik zemin ve tavan
        b.cukur(156, 10); b.dan(170, 6); b.cukur(186, 8); b.dan(200, 4);
        b.coin(178, 7.4, 1);
        b.cp(214);
        b.mod(222, 'gemi');
        [236, 252, 268].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 4, 0, 2); else b.sutun(x, 0, 4, 2); });
        b.coin(260, 4.5, 2);
        b.mod(284, 'top');
        b.cp(292);
        b.dn(304, 3); b.dan(318, 3); b.dn(332, 3); b.dan(346, 3);
        b.cukur(362, 6); b.dan(376, 3);
        b.cp(388);
        b.dn(398, 3); b.dan(410, 3); b.dn(422, 3); b.dan(434, 3); b.coin(440, 0.6, 3); b.dn(446, 3);
        b.mod(462, 'kup');
        b.d(478);
    }));

    // ── Yarış pistleri (online): iki yol — güvenli/uzun ya da riskli/kısa (2x kestirme) ──
    const Y = [];
    Y.push(yap({
        id: 'yaris-1', ad: 'Düz Pist', yaris: true, zorluk: 'Kolay', bpm: 130,
        tema: { gok1: '#071a2e', gok2: '#1a6aa0', zemin: '#27a0e0', cizgi: '#c8ecff' }, bitis: 330,
    }, (b) => {
        b.d(24); b.d(40); b.d(56);
        b.cp(66);
        // yol ayrımı: alt yol ikili dikenler; üst yol ped → halkalar → 2x
        b.pad(72);
        b.k(80, 4, 60, 1);
        b.h(78, 5.6); b.d(92, 5); b.d(106, 5); b.hiz(116, 2, 6.5); b.d(124, 5);
        b.dn(90, 2); b.dn(106, 2); b.dn(122, 2);
        b.hiz(150, 1);
        b.cp(158);
        b.k(170, 0, 4, 1); b.k(174, 0, 4, 2); b.k(178, 0, 6, 3); b.k(184, 0, 4, 2); b.k(188, 0, 4, 1);
        b.cp(200);
        b.d(214); b.dn(232, 2); b.d(250); b.dn(268, 2); b.d(290);
    }));
    Y.push(yap({
        id: 'yaris-2', ad: 'Gökyüzü Yolu', yaris: true, zorluk: 'Normal', bpm: 140,
        tema: { gok1: '#08122a', gok2: '#2b5bb8', zemin: '#4a8af0', cizgi: '#dce8ff' }, bitis: 380,
    }, (b) => {
        b.d(24); b.dn(44, 2);
        b.mod(60, 'gemi');
        b.cp(66);
        // gemi: üst geniş koridor (güvenli), alt dar kanal + 2x (kestirme)
        b.k(80, 3, 140, 1);
        b.hiz(84, 2, 1.5);
        [100, 124, 148, 172, 196].forEach(x => b.k(x, 0, 2, 1));
        [108, 132, 156, 180].forEach(x => b.k(x, 2, 2, 1));
        [96, 120, 144, 168, 192].forEach((x, i) => { if (i % 2 === 0) b.k(x, 4, 2, 2.5); else b.k(x, 6.5, 2, 2.5); });
        b.hiz(226, 1);
        b.cp(232);
        b.mod(238, 'kup');
        b.pad(251); b.dn(253, 3); b.pad(271); b.dn(273, 3);
        b.cp(290);
        b.mod(296, 'gemi');
        [310, 324, 338, 352].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 5, 0, 2); else b.sutun(x, 0, 5, 2); });
    }));
    Y.push(yap({
        id: 'yaris-3', ad: 'Yuvarlak Yol', yaris: true, zorluk: 'Zor', bpm: 150,
        tema: { gok1: '#1a0820', gok2: '#7a2a8a', zemin: '#c050d0', cizgi: '#ffd8ff' }, bitis: 400,
    }, (b) => {
        b.mod(16, 'top');
        b.dn(32, 3); b.dan(48, 3); b.dn(64, 3);
        b.cp(80);
        // yol ayrımı: normal yerçekiminde kıvrımlı yol ya da mavi pedle ters tünel + 2x
        b.pad(90, 'mavi');
        b.hiz(100, 2, 7.5);
        b.k(96, 4, 110, 1);
        b.dan(120, 3); b.dan(150, 3); b.dan(180, 3);
        b.dn(112, 3); b.dn(132, 3); b.dn(152, 3); b.dn(172, 3); b.dn(192, 3);
        b.dan(124, 3, 3); b.dan(164, 3, 3);
        b.hiz(216, 1); b.yc(218, 'normal');
        b.cp(226);
        b.mod(234, 'ufo');
        b.k(250, 0, 4, 2); b.k(262, 0, 4, 3); b.k(274, 0, 4, 4); b.k(286, 0, 4, 3);
        b.dn(254, 8); b.dn(266, 8); b.dn(278, 8);
        b.cp(300);
        b.mod(308, 'top');
        b.dn(320, 3); b.dan(334, 3); b.dn(348, 3); b.dan(362, 3);
    }));

    const RKLevels = { CEIL, bolumler: B, pistler: Y, hepsi: B.concat(Y) };
    if (typeof module !== 'undefined' && module.exports) module.exports = RKLevels;
    else root.RKLevels = RKLevels;
})(typeof window !== 'undefined' ? window : globalThis);
