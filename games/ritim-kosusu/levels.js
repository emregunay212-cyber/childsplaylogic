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
            // içindeki nesneler bir hareket grubuna girer (tetik_hareket ile kayar)
            grup: (g, inner) => { const i0 = n.length; inner(); for (let i = i0; i < n.length; i++) n[i].grup = g; },
            hareket: (x, grup, dy, sure = 0.4) => n.push({ t: 'tetik_hareket', x, grup, dy, sure }),
            renk: (x, hedef, renk, sure = 1) => n.push({ t: 'tetik_renk', x, hedef, renk, sure }),
            mini: (x, v = 'mini', y) => n.push(y === undefined ? { t: 'portal_boyut', x, deger: v } : { t: 'portal_boyut', x, deger: v, y }),
            ayna: (x, v = 'acik') => n.push({ t: 'portal_ayna', x, deger: v }),
        };
        fn(b);
        // Top modundan çıkışta yerçekimi normale döner: top bölümü tavanda da tabanda da bitebilir, sonrası
        // oyuncunun nerede kaldığına bağlı olmasın (bölüm botunun yolu ile çocuğun yolu aynı engelleri görsün).
        const modlar = n.filter(o => o.t === 'portal_mod' && o.y === undefined).sort((p, q) => p.x - q.x);
        let onceki = (meta.baslangic && meta.baslangic.mod) || 'kup';
        for (const m of modlar) {
            if (onceki === 'top' && m.deger !== 'top' &&
                !n.some(o => o.t === 'portal_yercekimi' && o.deger === 'normal' && Math.abs(o.x - m.x) <= 3)) {
                n.push({ t: 'portal_yercekimi', x: m.x, deger: 'normal' });
            }
            onceki = m.deger;
        }
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


    // ── 8 · Pembe Adım — pembe ped ve halka: alçak / yüksek zıplamayı ayırt et ──
    B.push(yap({
        id: 'd2-08', ad: 'Pembe Adım', dunya: 2, zorluk: 'Zor', yildiz: 4, bpm: 142,
        tema: { gok1: '#14082e', gok2: '#8a2a7a', zemin: '#ff5fb8', cizgi: '#ffd6f0' }, bitis: 520,
    }, (b) => {
        b.d(22); b.dn(38, 2);
        // pembe ped: alçak tavanlı geçitlerin altından kısa sıçrama
        [56, 80, 104].forEach(x => { b.pad(x, 'pembe'); b.dn(x + 2, 2); b.k(x + 1, 3.6, 5, 2); });
        b.cp(124);
        // sarı ve pembe ped yan yana: üst yol sarı (coin), alt yol pembe
        b.pad(134); b.k(139, 3.4, 10, 0.6); b.coin(146, 5.0, 1);
        b.pad(152, 'pembe'); b.dn(154, 2);
        b.pad(170, 'pembe'); b.dn(172, 2); b.k(171, 3.6, 5, 2);
        b.cp(186);
        // pembe halkalarla alçak tavanlı tünel
        b.k(194, 4, 60, 5);
        [200, 216, 232].forEach(x => { b.dn(x, 3); b.h(x + 1, 1.9, 'pembe'); });
        b.coin(224, 3.2, 2);
        b.cp(258);
        // sarı halka → pembe halka zinciri
        b.dn(268, 9); b.h(269, 2.4); b.h(272.4, 2.6, 'pembe'); b.h(274.9, 2.6, 'pembe');
        b.d(292); b.dn(306, 2);
        b.cp(318);
        // top + pembe halka
        b.mod(326, 'top');
        b.dn(340, 3); b.dan(356, 3); b.dn(372, 3);
        b.coin(380, 0.6, 3);
        b.dan(390, 3);
        b.mod(406, 'kup');
        b.cp(412);
        b.d(424); b.pad(436, 'pembe'); b.dn(438, 2); b.dn(452, 2); b.d(468); b.pad(480, 'pembe'); b.dn(482, 2);
    }));

    // ── 9 · Hızlı Nabız — hız portalları ──
    B.push(yap({
        id: 'd2-09', ad: 'Hızlı Nabız', dunya: 2, zorluk: 'Zor', yildiz: 5, bpm: 145,
        tema: { gok1: '#0a0626', gok2: '#3a1aa8', zemin: '#ff3fb0', cizgi: '#7af0ff' }, bitis: 640, baslangic: { mod: 'kup', hiz: 0.5 },
    }, (b) => {
        // 0,5x: uzun ve yavaş zıplamalar
        [18, 30, 42].forEach(x => b.d(x)); b.dn(54, 2); b.k(64, 0, 4, 1); b.d(72);
        b.hiz(82, 1);
        b.cp(86);
        // 1x: aynı desen hızlı
        [96, 110, 124].forEach(x => b.d(x)); b.dn(138, 2); b.k(150, 0, 4, 1); b.d(160);
        b.k(166, 1.2, 4, 0.6); b.coin(168, 3.6, 1);
        b.cp(176);
        // 2x gemi, geniş koridor
        b.hiz(182, 2); b.mod(184, 'gemi');
        [200, 220, 240, 260, 280].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 4.5, 0, 2); else b.sutun(x, 0, 4.5, 2); });
        b.coin(270, 2.2, 2);
        b.mod(296, 'kup'); b.hiz(298, 0.5);
        b.cp(302);
        // 0,5x sakin bölüm
        b.d(316); b.dn(330, 2); b.d(344);
        b.hiz(354, 2);
        b.cp(358);
        // 2x küp ve top dönüşümlü
        b.d(372); b.dn(390, 2); b.d(408); b.dn(426, 3);
        b.mod(444, 'top');
        b.dn(460, 4); b.dan(480, 4); b.coin(488, 7.6, 3); b.dn(500, 4);
        b.mod(520, 'kup'); b.hiz(522, 1);
        b.cp(528);
        b.d(542); b.dn(558, 2); b.d(574); b.dn(590, 2); b.d(606);
    }));

    // ── 10 · Kayan Zemin — hareket eden bloklar (tetikleyici) ──
    B.push(yap({
        id: 'd2-10', ad: 'Kayan Zemin', dunya: 2, zorluk: 'Zor', yildiz: 5, bpm: 145,
        tema: { gok1: '#041a1e', gok2: '#156a74', zemin: '#2ad1c9', cizgi: '#d0fffb' }, bitis: 560,
    }, (b) => {
        b.d(22); b.dn(38, 2);
        // yükselen platformlar: üstüne basınca kalkar
        b.cukur(52, 60);
        b.grup(1, () => b.k(50, 0, 10, 1)); b.hareket(55, 1, 1.5, 0.5);
        b.grup(2, () => b.k(63, 1.5, 8, 0.8)); b.hareket(64, 2, 1.2, 0.5);
        b.grup(3, () => b.k(74, 2.5, 8, 0.8)); b.hareket(76, 3, -1.2, 0.5);
        b.k(86, 1, 8, 0.8); b.k(97, 1, 18, 0.8);
        b.coin(104, 3.6, 1);
        b.cp(118);
        // kapanan duvarlar: tavandan inen sütunlar, aradan geç
        [134, 154, 174].forEach((x, i) => {
            b.grup(10 + i, () => { b.k(x, 9, 2, 6); });
            b.hareket(x - 10, 10 + i, -3.2, 0.6);
            b.d(x - 6);
        });
        b.cp(190);
        // gemi + yukarı aşağı kayan sütunlar
        b.mod(198, 'gemi');
        [214, 234, 254, 274].forEach((x, i) => {
            const up = i % 2 === 0;
            b.grup(20 + i, () => { if (up) b.k(x, 0, 2, 4); else b.k(x, 5, 2, 4); });
            b.hareket(x - 14, 20 + i, up ? 1 : -1, 0.6);
        });
        b.coin(264, 7.5, 2);
        b.mod(290, 'kup');
        b.cp(296);
        // inen zemin parçaları: yukarıdakilere atla
        b.cukur(306, 64);
        b.grup(30, () => b.k(304, 0, 10, 1)); b.hareket(312, 30, -2.5, 0.8);
        b.k(316, 2, 7, 0.8);
        b.grup(31, () => b.k(326, 2, 8, 0.8)); b.hareket(331, 31, -1.6, 0.8);
        b.k(338, 2.4, 8, 0.8);
        b.grup(32, () => b.k(350, 2.4, 8, 0.8)); b.hareket(354, 32, -2.5, 0.8);
        b.k(361, 1, 12, 0.8); b.coin(366, 3.3, 3);
        b.cp(378);
        // top + kayan tavan
        b.mod(386, 'top');
        b.grup(40, () => b.k(396, 7, 60, 2)); b.hareket(392, 40, -2.5, 1.2);
        b.dn(410, 3); b.dan(430, 3, 4.5 - 1 + 0); b.dn(450, 3);
        b.hareket(456, 40, 2.5, 0.6);
        b.mod(470, 'kup');
        b.cp(476);
        // final: vuruşla nabız atan bloklar
        [488, 504, 520].forEach((x, i) => { b.grup(50 + i, () => b.k(x, 0, 3, 1)); b.hareket(x - 6, 50 + i, 1, 0.3); });
        b.d(512); b.d(528);
    }));

    // ── 11 · Uçan Daire — UFO ──
    B.push(yap({
        id: 'd2-11', ad: 'Uçan Daire', dunya: 2, zorluk: 'Daha Zor', yildiz: 6, bpm: 148,
        tema: { gok1: '#05020f', gok2: '#2a1050', zemin: '#7a3ad8', cizgi: '#f0e0ff' }, bitis: 560,
    }, (b) => {
        b.d(20);
        b.mod(32, 'ufo');
        // basamaklı platformlar
        [[44, 1], [54, 2], [64, 3], [74, 2], [84, 1]].forEach(([x, h]) => { b.k(x, 0, 6, h); });
        b.dn(50, 4); b.dn(60, 4); b.dn(70, 4); b.dn(80, 4);
        b.cp(96);
        // havada asılı diken kümeleri arasında kısa sıçramalar
        [108, 124, 140, 156, 172].forEach((x, i) => { b.dn(x, 3, 0); b.k(x, 3.5 + (i % 2), 3, 0.6); b.d(x + 1, 4.1 + (i % 2)); });
        b.coin(148, 1.5, 1);
        b.cp(186);
        // pembe halkalar
        b.dn(196, 20); [199, 206, 213].forEach(x => b.h(x, 2.6, 'pembe'));
        b.cp(222);
        // UFO + ters yerçekimi
        b.yc(230, 'ters');
        b.dan(244, 3); b.k(256, 6, 4, 3); b.dan(268, 3); b.k(280, 6.5, 4, 2.5); b.dan(292, 3);
        b.coin(286, 2.2, 2);
        b.yc(304, 'normal');
        b.cp(312);
        // küp → UFO → gemi zinciri
        b.mod(320, 'kup'); b.d(330); b.dn(342, 2);
        b.mod(354, 'ufo'); b.k(366, 0, 3, 2); b.dn(369, 4); b.k(373, 0, 3, 3);
        b.mod(384, 'gemi'); b.sutun(396, 5, 0, 2); b.sutun(410, 0, 5, 2);
        b.mod(424, 'ufo');
        b.cp(430);
        // UFO final: yükselen merdiven
        [[440, 1], [450, 2], [460, 3], [470, 4], [480, 5]].forEach(([x, h]) => b.k(x, 0, 6, h));
        b.dn(446, 4); b.dn(456, 4); b.dn(466, 4); b.dn(476, 4);
        b.coin(484, 7.2, 3);
        b.mod(492, 'kup');
        b.d(510); b.dn(526, 2);
    }));

    // ── 12 · Gece Treni — Dünya 2 sınavı (2x ağırlıklı) ──
    B.push(yap({
        id: 'd2-12', ad: 'Gece Treni', dunya: 2, zorluk: 'Daha Zor', yildiz: 6, bpm: 150,
        tema: { gok1: '#05060f', gok2: '#1c2440', zemin: '#3a3f60', cizgi: '#ffd23f' }, bitis: 760,
    }, (b) => {
        b.d(20); b.pad(34, 'pembe'); b.dn(36, 2); b.k(35, 3.6, 5, 2); b.pad(52); b.dn(54, 4);
        b.cp(68);
        // 2x top, kesik raylar
        b.hiz(74, 2); b.mod(76, 'top');
        b.cukur(92, 10); b.dan(110, 4); b.cukur(126, 10); b.dan(146, 4); b.dn(166, 4);
        b.coin(131, 7.6, 1);
        b.cp(184);
        // 2x gemi, kayan sütunlar
        b.mod(190, 'gemi');
        [208, 232, 256, 280].forEach((x, i) => {
            const up = i % 2 === 0;
            b.grup(60 + i, () => { if (up) b.k(x, 0, 2, 4.5); else b.k(x, 4.5, 2, 4.5); });
            b.hareket(x - 16, 60 + i, up ? 0.8 : -0.8, 0.5);
        });
        b.coin(292, 7.5, 2);
        b.cp(300);
        // 0,5x UFO, dinlenme
        b.hiz(306, 0.5); b.mod(308, 'ufo');
        b.k(320, 0, 4, 2); b.dn(324, 4); b.k(328, 0, 4, 3); b.dn(332, 4); b.k(336, 0, 4, 2);
        b.coin(331, 6.4, 3);
        b.cp(346);
        // 2x küp, kapanan duvarlar
        b.hiz(350, 2); b.mod(352, 'kup');
        b.d(370); b.dn(392, 2);
        [416, 444].forEach((x, i) => { b.grup(70 + i, () => b.k(x, 9, 3, 6)); b.hareket(x - 14, 70 + i, -3.2, 0.5); });
        b.d(470); b.dn(492, 3);
        b.cp(510);
        // 2x top → UFO → küp final
        b.mod(516, 'top');
        b.dn(532, 4); b.dan(556, 4); b.dn(580, 4);
        b.mod(600, 'ufo');
        b.k(616, 0, 4, 2); b.dn(620, 6); b.k(626, 0, 4, 3);
        b.mod(640, 'kup');
        b.d(660); b.dn(684, 3); b.d(708); b.dn(730, 2);
    }));


    // ── 13 · Zikzak — dalga ──
    B.push(yap({
        id: 'd3-13', ad: 'Zikzak', dunya: 3, zorluk: 'Daha Zor', yildiz: 6, bpm: 150,
        tema: { gok1: '#021418', gok2: '#0a5a6a', zemin: '#18c8e0', cizgi: '#d0faff' }, bitis: 560,
    }, (b) => {
        b.d(20); b.dn(34, 2);
        b.mod(46, 'dalga');
        // geniş zikzak koridor: alttan / üstten sütunlar
        b.k(52, 0, 150, 1); b.k(52, 8, 150, 1);
        [64, 76, 88, 100, 112, 124].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1, 2, 3.5); else b.k(x, 4.5, 2, 3.5); });
        b.coin(118, 7.2, 1);
        b.cp(134);
        // daralan koridor + testereler
        b.k(140, 1, 62, 1); b.k(140, 7, 62, 1);
        [150, 162, 174, 186].forEach((x, i) => b.saw(x, i % 2 === 0 ? 2.8 : 6.2, 0.9));
        b.cp(206);
        b.mod(212, 'kup');
        b.d(226); b.dn(240, 2); b.k(254, 0, 4, 1); b.d(262);
        b.cp(272);
        // dalga + yerçekimi portalı
        b.mod(278, 'dalga');
        b.k(284, 0, 120, 1.5); b.k(284, 7.5, 120, 1.5);
        b.yc(300, 'ters');
        [312, 328, 344].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1.5, 2, 3); else b.k(x, 4.5, 2, 3); });
        b.coin(336, 2.4, 2);
        b.yc(360, 'normal');
        [372, 388].forEach((x, i) => { if (i % 2 === 0) b.k(x, 4.5, 2, 3); else b.k(x, 1.5, 2, 3); });
        b.cp(408);
        // final: vuruşa oturan zikzak
        b.k(412, 0, 120, 1); b.k(412, 8, 120, 1);
        [422, 432, 442, 452, 462, 472, 482, 492].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1, 1.5, 3.2); else b.k(x, 4.8, 1.5, 3.2); });
        b.coin(497, 4.5, 3);
        b.mod(536, 'kup');
    }));

    // ── 14 · Küçük Dev — mini boyut ──
    B.push(yap({
        id: 'd3-14', ad: 'Küçük Dev', dunya: 3, zorluk: 'Daha Zor', yildiz: 7, bpm: 152,
        tema: { gok1: '#0c1e06', gok2: '#3a8a1a', zemin: '#8ae04a', cizgi: '#eaffd0' }, bitis: 560,
    }, (b) => {
        b.d(20); b.dn(36, 2); b.k(52, 0, 4, 1); b.d(60);
        b.mini(72);
        // alçak tüneller: yalnız mini zıplayabilir
        b.k(80, 2.3, 50, 1); [88, 100, 112, 122].forEach(x => b.d(x));
        b.coin(106, 1.4, 1);
        b.cp(134);
        // mini gemi, 2 blokluk koridor
        b.mod(140, 'gemi');
        b.k(146, 0, 90, 2); b.k(146, 4.2, 90, 4.8);
        b.k(160, 2, 2, 0.8); b.k(172, 3.4, 2, 0.8); b.k(184, 2, 2, 0.8); b.k(196, 3.4, 2, 0.8); b.k(208, 2, 2, 0.8); b.k(220, 3.4, 2, 0.8);
        b.mod(238, 'kup');
        b.cp(242);
        // normal boyut: aynı tünel artık zıplanamaz, üstten dolaş
        b.mini(248, 'normal');
        b.k(256, 0, 4, 1); b.k(262, 0, 4, 2); b.k(268, 2.3, 30, 1); b.d(276, 0); b.d(288, 0); b.k(266, 3.3, 34, 0.01);
        b.coin(282, 1.3, 2);
        b.d(304);
        b.cp(312);
        // mini top + mini dalga
        b.mini(318); b.mod(320, 'top');
        b.dn(334, 3); b.dan(348, 3); b.dn(362, 3);
        b.mod(378, 'dalga');
        b.k(384, 0, 70, 1.5); b.k(384, 6.5, 70, 2.5);
        [396, 410, 424, 438].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1.5, 1.5, 2.6); else b.k(x, 3.9, 1.5, 2.6); });
        b.coin(431, 5.6, 3);
        b.mod(456, 'kup'); b.mini(458, 'normal');
        b.cp(462);
        // final: boyut değişimli
        b.d(474); b.mini(484); b.k(490, 2.3, 10, 1); b.d(494); b.mini(504, 'normal'); b.dn(514, 2); b.mini(524); b.d(532);
        b.mini(544, 'normal');
    }));

    // ── 15 · Testere Ormanı ──
    B.push(yap({
        id: 'd3-15', ad: 'Testere Ormanı', dunya: 3, zorluk: 'Daha Zor', yildiz: 7, bpm: 154,
        tema: { gok1: '#0a1404', gok2: '#2e4a12', zemin: '#c8641e', cizgi: '#ffd8a8' }, bitis: 600,
    }, (b) => {
        // zemine yarı gömülü testereler
        [22, 40, 58, 76].forEach(x => b.saw(x, 0, 0.9)); b.dn(92, 2);
        b.cp(104);
        // havada asılı testereler arasında küp
        [116, 132, 148].forEach((x, i) => { b.saw(x, 0, 0.8); b.saw(x + 2, 4.2, 1); });
        b.coin(140, 3.4, 1);
        b.cp(162);
        // gemi, testere koridoru
        b.mod(168, 'gemi');
        [182, 198, 214, 230, 246].forEach((x, i) => b.saw(x, i % 2 === 0 ? 2 : 6.8, 1.6));
        b.coin(222, 4.4, 2);
        b.mod(262, 'top');
        b.cp(266);
        // top: testereler zemin ve tavanda dönüşümlü
        [280, 300, 320, 340].forEach((x, i) => b.saw(x, i % 2 === 0 ? 0 : 9, 1.2));
        b.mod(356, 'dalga');
        b.cp(360);
        // dalga: testereler arası dar zikzak
        b.k(364, 0, 120, 1); b.k(364, 8, 120, 1);
        [376, 392, 408, 424, 440, 456].forEach((x, i) => b.saw(x, i % 2 === 0 ? 2.2 : 6.8, 1.4));
        b.coin(432, 4.5, 3);
        b.mod(488, 'kup');
        b.cp(494);
        [508, 524, 540].forEach(x => b.saw(x, 0, 0.9)); b.dn(556, 2); b.saw(574, 0, 1);
    }));

    // ── 16 · Demir Adım — robot ──
    B.push(yap({
        id: 'd3-16', ad: 'Demir Adım', dunya: 3, zorluk: 'Usta', yildiz: 8, bpm: 155,
        tema: { gok1: '#0e0e12', gok2: '#3a3a46', zemin: '#7a7a8a', cizgi: '#ff4040' }, bitis: 600, baslangic: { mod: 'robot' },
    }, (b) => {
        // kısa zıplamalar
        [20, 32, 44].forEach(x => b.d(x)); b.dn(56, 2);
        b.cp(68);
        // uzun ve kısa karışık (basma süresi önemli)
        b.dn(80, 4); b.d(96); b.dn(106, 4); b.k(120, 0, 4, 1); b.k(128, 0, 4, 2.4); b.d(140); b.dn(150, 4);
        b.k(160, 2.2, 4, 0.6); b.coin(162, 4.0, 1);
        b.cp(172);
        // robot + sarı halka
        b.dn(184, 6); b.h(186, 2.2); b.dn(204, 6); b.h(206, 2.6); b.d(224); b.dn(234, 4);
        b.cp(250);
        // gemi ara bölümü
        b.mod(256, 'gemi');
        [270, 286, 302].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 5, 0, 2); else b.sutun(x, 0, 5, 2); });
        b.coin(294, 7.4, 2);
        b.mod(318, 'robot');
        b.cp(322);
        // robot + ters yerçekimi
        b.pad(332, 'mavi'); b.da(348); b.dan(360, 4); b.da(376); b.dan(388, 3);
        b.yc(402, 'normal');
        b.cp(414);
        // 2x robot finali
        b.hiz(420, 2);
        b.d(436); b.dn(452, 4); b.d(472); b.dn(488, 5); b.coin(491, 3.4, 3); b.d(510); b.dn(526, 4);
        b.hiz(546, 1);
        b.d(560); b.dn(574, 2);
    }));

    // ── 17 · Ayna — ayna portalı ──
    B.push(yap({
        id: 'd3-17', ad: 'Ayna', dunya: 3, zorluk: 'Usta', yildiz: 8, bpm: 156,
        tema: { gok1: '#061626', gok2: '#2a6aa8', zemin: '#9ad8ff', cizgi: '#ffffff' }, bitis: 620,
    }, (b) => {
        b.d(20); b.dn(36, 2); b.d(52);
        b.ayna(64);
        // ayna: oyun sağdan sola akar
        b.d(78); b.dn(94, 2); b.k(108, 0, 4, 1); b.d(116); b.dn(130, 2);
        b.k(139, 1.2, 4, 0.6); b.coin(141, 3.6, 1);
        b.cp(150);
        b.ayna(156, 'kapali');
        b.mod(162, 'gemi');
        [176, 192, 208].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 5, 0, 2); else b.sutun(x, 0, 5, 2); });
        b.cp(222);
        // ayna + top
        b.mod(226, 'top'); b.ayna(230);
        b.dn(244, 3); b.dan(262, 3); b.dn(280, 3); b.coin(288, 7.6, 2); b.dan(298, 3);
        b.cp(314);
        // ayna + robot
        b.mod(318, 'robot');
        b.d(332); b.dn(346, 4); b.d(364); b.dn(378, 3);
        b.ayna(394, 'kapali');
        b.cp(400);
        // final: ayna her 8 vuruşta açılıp kapanır
        b.mod(404, 'kup');
        [418, 452, 486, 520].forEach((x, i) => { b.ayna(x, i % 2 === 0 ? 'acik' : 'kapali'); b.d(x + 10); b.dn(x + 22, 2); });
        b.coin(546, 3.2, 3); b.k(544, 0, 4, 1);
        b.ayna(560, 'kapali');
        b.d(574); b.dn(590, 2);
    }));

    // ── 18 · Kırık Saat — Dünya 3 sınavı ──
    B.push(yap({
        id: 'd3-18', ad: 'Kırık Saat', dunya: 3, zorluk: 'Usta', yildiz: 9, bpm: 158,
        tema: { gok1: '#120a04', gok2: '#4a2a12', zemin: '#c87a3a', cizgi: '#ffd9a0' }, bitis: 760, baslangic: { mod: 'robot' },
    }, (b) => {
        // robot + testereler
        b.saw(22, 0, 0.9); b.dn(36, 4); b.saw(54, 0, 1); b.d(68); b.saw(82, 0, 0.9); b.dn(96, 3);
        b.cp(112);
        // mini dalga
        b.mini(118); b.mod(120, 'dalga');
        b.k(126, 0, 90, 1.5); b.k(126, 6.5, 90, 2.5);
        [138, 152, 166, 180, 194].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1.5, 1.5, 2.6); else b.k(x, 3.9, 1.5, 2.6); });
        b.coin(173, 2.3, 1);
        b.mini(218, 'normal');
        b.cp(222);
        // ayna gemi
        b.mod(226, 'gemi'); b.ayna(230);
        [244, 260, 276, 292].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 5, 0, 2); else b.sutun(x, 0, 5, 2); });
        b.coin(284, 7.4, 2);
        b.ayna(306, 'kapali');
        b.cp(312);
        // 2x top, kayan zemin
        b.hiz(316, 2); b.mod(318, 'top');
        b.dn(336, 4); b.dan(358, 4); b.cukur(380, 10); b.dan(398, 4); b.dn(420, 4);
        b.hiz(438, 1);
        b.cp(444);
        // mini UFO
        b.mini(448); b.mod(450, 'ufo');
        [[462, 1], [472, 2], [482, 3], [492, 2]].forEach(([x, h]) => b.k(x, 0, 5, h));
        b.dn(467, 5); b.dn(477, 5); b.dn(487, 5);
        b.coin(497, 4.6, 3);
        b.mini(506, 'normal');
        b.cp(512);
        // 2x dalga → robot → küp final
        b.hiz(516, 2); b.mod(518, 'dalga');
        b.k(522, 0, 100, 1); b.k(522, 8, 100, 1);
        [536, 552, 568, 584, 600].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1, 2, 3.5); else b.k(x, 4.5, 2, 3.5); });
        b.mod(624, 'robot'); b.hiz(626, 1);
        b.d(640); b.dn(654, 4); b.d(672);
        b.mod(684, 'kup');
        b.dn(698, 2); b.d(714); b.dn(728, 2);
    }));


    // ── 19 · Yeşil Işık — mavi ve yeşil halka ──
    B.push(yap({
        id: 'd4-19', ad: 'Yeşil Işık', dunya: 4, zorluk: 'Usta', yildiz: 9, bpm: 160,
        tema: { gok1: '#02140a', gok2: '#0a3a1e', zemin: '#1e8a4a', cizgi: '#5dff6a' }, bitis: 640,
    }, (b) => {
        b.d(20); b.dn(34, 2);
        // mavi halkalar: yalnız yerçekimi çevirir
        b.dn(48, 4); b.h(49, 2.6, 'mavi'); b.dan(64, 4); b.h(65, 6.4, 'mavi'); b.dn(80, 4); b.h(81, 2.6, 'mavi');
        b.dan(96, 4); b.h(97, 6.4, 'mavi');
        b.cp(112);
        // yeşil halkalar: çevirir ve zıplatır
        b.dn(122, 8); b.h(123, 2.4, 'yesil'); b.dan(132, 8); b.h(134, 6.6, 'yesil'); b.dn(144, 8); b.h(146, 2.4, 'yesil');
        b.yc(156, 'normal'); b.coin(160, 4.5, 1); b.dn(164, 2);
        b.yc(170, 'normal');
        b.cp(178);
        // yeşil halka + top
        b.mod(184, 'top');
        b.dn(198, 4); b.dan(216, 4); b.h(224, 4.5, 'yesil'); b.dn(234, 4); b.dan(252, 4);
        b.mod(268, 'kup'); b.yc(270, 'normal');
        b.cp(276);
        // UFO + yeşil halka
        b.mod(282, 'ufo');
        b.k(296, 0, 4, 2); b.dn(300, 6); b.h(306, 4.4, 'yesil'); b.k(312, 7, 6, 2); b.dan(318, 6); b.h(326, 4.6, 'yesil');
        b.coin(331, 2.2, 2);
        b.yc(340, 'normal'); b.mod(344, 'kup');
        b.cp(350);
        // küp, art arda yeşil halkalar
        b.dn(358, 5); b.h(359, 2.4, 'yesil'); b.dan(368, 5); b.h(370, 6.6, 'yesil');
        b.dn(379, 5); b.h(380, 2.4, 'yesil'); b.dan(389, 5); b.h(391, 6.6, 'yesil');
        b.yc(398, 'normal');
        b.cp(404);
        // final
        b.d(418); b.dn(432, 2); b.pad(450, 'mavi'); b.dan(464, 3); b.da(480); b.yc(492, 'normal');
        b.coin(505, 3.2, 3); b.k(503, 0, 4, 1);
        b.d(520); b.dn(536, 2); b.d(556); b.dn(572, 2); b.d(596);
    }));

    // ── 20 · Siyah Delik — siyah halka ──
    B.push(yap({
        id: 'd4-20', ad: 'Siyah Delik', dunya: 4, zorluk: 'Usta', yildiz: 9, bpm: 162,
        tema: { gok1: '#050208', gok2: '#2a0a3a', zemin: '#5a1a7a', cizgi: '#d8a0ff' }, bitis: 640,
    }, (b) => {
        b.d(20); b.dn(34, 2);
        // siyah halka: havadan zemine hızla in (alçak tavandaki dikenlerden kaç)
        [48, 72, 96].forEach(x => { b.pad(x); b.h(x + 3, 4.6, 'siyah'); b.dan(x + 5, 6, 4.6); b.dn(x + 11, 2); });
        b.cp(118);
        // sarı → siyah halka zinciri
        b.dn(128, 4); b.h(129, 2.4); b.h(131.5, 4.0, 'siyah'); b.dn(135, 2);
        b.dn(150, 4); b.h(151, 2.4); b.h(153.6, 3.8, 'siyah'); b.dn(157, 2);
        b.coin(130.6, 4.4, 1);
        b.cp(170);
        // dalga: ani düşüşler (yerçekimi portalları ile)
        b.mod(176, 'dalga');
        b.k(180, 0, 100, 1); b.k(180, 8, 100, 1);
        [192, 208, 224, 240, 256].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1, 2, 3.5); else b.k(x, 4.5, 2, 3.5); });
        b.coin(232, 2.2, 2);
        b.mod(282, 'robot');
        b.cp(288);
        // robot + siyah halka
        b.d(300); b.pad(314); b.h(318, 4.4, 'siyah'); b.dan(320, 5, 4.2); b.dn(326, 2); b.dn(340, 4); b.d(358);
        b.cp(372);
        // 2x küp
        b.mod(376, 'kup'); b.hiz(378, 2);
        b.d(394); b.dn(414, 3); b.d(436); b.k(452, 0, 5, 1); b.d(461, 1); b.dn(478, 2);
        b.hiz(500, 1);
        b.cp(506);
        // final
        b.pad(518); b.h(521, 4.6, 'siyah'); b.dan(523, 6, 4.6); b.dn(529, 2);
        b.coin(536, 3.3, 3); b.k(534, 0, 4, 1);
        b.d(552); b.dn(568, 2); b.d(590); b.dn(606, 2);
    }));

    // ── 21 · Gölge Koşusu — ışık ve renk tetikleyicileri ──
    B.push(yap({
        id: 'd4-21', ad: 'Gölge Koşusu', dunya: 4, zorluk: 'Usta', yildiz: 10, bpm: 164,
        tema: { gok1: '#000000', gok2: '#0a0a14', zemin: '#1a1a2a', cizgi: '#6a6a8a' }, bitis: 680,
    }, (b) => {
        b.d(20); b.dn(36, 2); b.d(52); b.dn(68, 2);
        b.renk(76, 'cizgi', '#ffd23f', 0.5);
        b.cp(84);
        b.mod(90, 'gemi'); b.renk(90, 'gok2', '#1a0a3a', 1);
        [104, 120, 136, 152, 168].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 5, 0, 2); else b.sutun(x, 0, 5, 2); });
        b.coin(160, 7.4, 1);
        b.mod(184, 'kup');
        b.cp(190);
        // renk tetikleyicileri ile zemin ve arka plan sürekli değişir
        b.renk(196, 'zemin', '#c83a6a', 1); b.renk(196, 'gok2', '#3a0a1a', 1);
        b.d(206); b.dn(220, 2); b.k(234, 0, 4, 1); b.d(242);
        b.renk(250, 'zemin', '#3a6ac8', 1); b.renk(250, 'gok2', '#0a1a3a', 1);
        b.dn(258, 2); b.d(274); b.pad(288); b.dn(290, 3);
        b.cp(304);
        // top + kayan tavan
        b.mod(310, 'top'); b.renk(310, 'zemin', '#c8a03a', 1);
        b.grup(80, () => b.k(320, 7, 70, 2)); b.hareket(316, 80, -2, 1);
        b.dn(334, 3); b.dan(352, 3, 4); b.dn(370, 3); b.coin(380, 4.5, 2);
        b.hareket(386, 80, 2, 0.6);
        b.mod(396, 'dalga');
        b.cp(400);
        b.k(404, 0, 120, 1); b.k(404, 8, 120, 1); b.renk(404, 'gok2', '#2a0a2a', 1);
        [416, 432, 448, 464, 480, 496].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1, 2, 3.5); else b.k(x, 4.5, 2, 3.5); });
        b.mod(528, 'kup');
        b.cp(534);
        // final: ışıklar tamamen açılır
        b.renk(540, 'gok1', '#2a1a6a', 2); b.renk(540, 'gok2', '#ff7ab8', 2); b.renk(540, 'zemin', '#ffb020', 2); b.renk(540, 'cizgi', '#ffffff', 1);
        b.d(552); b.dn(568, 2); b.d(586); b.coin(587.6, 2.9, 3); b.k(596, 0, 4, 1); b.dn(612, 2); b.d(634); b.dn(650, 2);
    }));

    // ── 22 · Dört Vites — 3x ve 4x hız ──
    B.push(yap({
        id: 'd4-22', ad: 'Dört Vites', dunya: 4, zorluk: 'Usta+', yildiz: 10, bpm: 166,
        tema: { gok1: '#14040a', gok2: '#5a0a1a', zemin: '#f0f0f0', cizgi: '#ff2a2a' }, bitis: 1160,
    }, (b) => {
        b.d(20); b.dn(34, 2); b.d(50); b.dn(66, 2);
        b.hiz(80, 2); b.mod(82, 'gemi');
        b.cp(84);
        [100, 120, 140, 160].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 4.5, 0, 2); else b.sutun(x, 0, 4.5, 2); });
        b.coin(150, 7.4, 1);
        b.mod(180, 'kup'); b.hiz(182, 3);
        b.cp(186);
        // 3x küp, geniş aralıklı engeller
        b.d(206); b.dn(232, 3); b.d(258); b.k(282, 0, 8, 1); b.d(292, 1); b.dn(318, 3); b.d(344); b.dn(370, 4);
        b.hiz(396, 0.5);
        b.cp(400);
        // 0,5x dinlenme
        b.d(412); b.dn(424, 2); b.coin(437, 3.2, 2); b.k(435, 0, 4, 1); b.d(450);
        b.hiz(462, 3); b.mod(464, 'top');
        b.cp(468);
        // 3x top + gemi
        b.dn(490, 5); b.dan(522, 5); b.dn(554, 5); b.dan(586, 5);
        b.mod(612, 'gemi');
        [636, 664, 692, 720].forEach((x, i) => { if (i % 2 === 0) b.sutun(x, 4.5, 0, 2); else b.sutun(x, 0, 4.5, 2); });
        b.mod(744, 'kup');
        b.cp(750);
        // 4x final: birkaç büyük engel, hız hissi
        b.hiz(756, 4);
        b.d(786); b.dn(826, 3); b.d(866); b.k(900, 0, 10, 1); b.d(912, 1); b.dn(950, 4);
        b.coin(990, 3.4, 3); b.k(986, 0, 8, 1);
        b.d(1030); b.dn(1070, 3); b.d(1110);
    }));

    // ── 23 · Mod Fırtınası — hızlı mod geçişleri ──
    B.push(yap({
        id: 'd4-23', ad: 'Mod Fırtınası', dunya: 4, zorluk: 'Usta+', yildiz: 11, bpm: 168,
        tema: { gok1: '#0a0420', gok2: '#3a1a6a', zemin: '#6a4ae0', cizgi: '#ffe14d' }, bitis: 760,
    }, (b) => {
        b.d(18);
        // her 4 vuruşta mod: küp → gemi → top → UFO
        const seq = ['gemi', 'top', 'ufo', 'kup', 'gemi', 'top', 'ufo', 'kup'];
        seq.forEach((m, i) => {
            const x = 30 + i * 18;
            b.mod(x, m); b.renk(x, 'zemin', { kup: '#38e07b', gemi: '#ff5fcf', top: '#ff9a3c', ufo: '#c8a800' }[m], 0.3);
            if (m === 'kup') b.d(x + 9);
            if (m === 'gemi') b.sutun(x + 9, 0, 5, 2);
            if (m === 'top') b.dn(x + 8, 3);
            if (m === 'ufo') { b.k(x + 6, 0, 3, 2); b.dn(x + 9, 3); }
        });
        b.coin(40, 1.2, 1);
        b.cp(176);
        // her 2 vuruşta mod
        const seq2 = ['gemi', 'kup', 'top', 'kup', 'ufo', 'kup', 'gemi', 'kup', 'top', 'kup'];
        seq2.forEach((m, i) => {
            const x = 182 + i * 12;
            b.mod(x, m);
            if (m === 'kup') b.d(x + 7);
            if (m === 'gemi') b.k(x + 6, 0, 2, 3);
        });
        b.cp(306);
        // dalga + robot + mini
        b.mod(312, 'dalga'); b.k(316, 0, 60, 1); b.k(316, 8, 60, 1);
        [328, 344, 360].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1, 2, 3.5); else b.k(x, 4.5, 2, 3.5); });
        b.mod(378, 'robot'); b.d(390); b.dn(402, 4);
        b.mini(418); b.mod(420, 'kup'); b.k(428, 2.3, 16, 1); b.d(434); b.coin(440, 1.3, 2); b.mini(450, 'normal');
        b.cp(456);
        // ayna açıkken mod zinciri
        b.ayna(462);
        ['gemi', 'top', 'kup', 'ufo', 'kup'].forEach((m, i) => {
            const x = 468 + i * 16;
            b.mod(x, m);
            if (m === 'kup') b.d(x + 9);
            if (m === 'gemi') b.sutun(x + 8, 5, 0, 2);
            if (m === 'top') b.dan(x + 8, 3);
            if (m === 'ufo') { b.k(x + 6, 0, 3, 2); b.dn(x + 9, 3); }
        });
        b.ayna(550, 'kapali');
        b.cp(556);
        // 2x hızda zincir
        b.hiz(560, 2);
        ['gemi', 'kup', 'top', 'kup', 'dalga', 'kup'].forEach((m, i) => {
            const x = 566 + i * 22;
            b.mod(x, m);
            if (m === 'kup') b.dn(x + 12, 2);
            if (m === 'gemi') b.sutun(x + 11, 0, 5, 2);
            if (m === 'top') b.dn(x + 10, 4);
            if (m === 'dalga') { b.k(x + 10, 0, 2, 4); }
        });
        b.coin(700, 3.3, 3); b.k(698, 0, 4, 1);
        b.hiz(712, 1);
        b.d(722); b.dn(738, 2);
    }));

    // ── 24 · Son Vuruş — final ──
    B.push(yap({
        id: 'd4-24', ad: 'Son Vuruş', dunya: 4, zorluk: 'Usta+', yildiz: 12, bpm: 170,
        tema: { gok1: '#0e1240', gok2: '#1f3a9e', zemin: '#1d4fd8', cizgi: '#9fd2ff' }, bitis: 1220,
    }, (b) => {
        // Bölüm 1'e selam: aynı ilk engeller
        [24, 44, 64].forEach(x => b.d(x)); b.dn(84, 2); b.dn(104, 2);
        b.cp(118);
        // 2x gemi, dar koridor
        b.renk(122, 'gok2', '#6a1a6a', 1); b.renk(122, 'zemin', '#ff5fcf', 1);
        b.hiz(124, 2); b.mod(126, 'gemi');
        b.k(134, 0, 120, 1.5); b.k(134, 6, 120, 3);
        [150, 172, 194, 216, 238].forEach((x, i) => b.k(x, i % 2 === 0 ? 1.5 : 4.6, 2, 1.4));
        b.coin(205, 5.2, 1);
        b.hiz(256, 1);
        b.cp(260);
        // top + UFO zinciri
        b.renk(264, 'zemin', '#ff9a3c', 1);
        b.mod(266, 'top'); b.dn(280, 3); b.dan(296, 3); b.dn(312, 3);
        b.mod(326, 'ufo'); b.k(338, 0, 4, 2); b.dn(342, 5); b.k(347, 0, 4, 3); b.dn(351, 5); b.k(356, 0, 4, 2);
        b.cp(368);
        // mini dalga
        b.renk(372, 'zemin', '#40e0ff', 1);
        b.mini(374); b.mod(376, 'dalga');
        b.k(380, 0, 90, 1.5); b.k(380, 6.5, 90, 2.5);
        [392, 406, 420, 434, 448].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1.5, 1.5, 2.6); else b.k(x, 3.9, 1.5, 2.6); });
        b.mini(472, 'normal');
        b.cp(476);
        // robot + ayna
        b.renk(480, 'zemin', '#c9cfe0', 1);
        b.mod(482, 'robot'); b.ayna(486);
        b.d(498); b.dn(512, 4); b.d(530); b.dn(544, 3);
        b.ayna(560, 'kapali');
        b.cp(566);
        // yeşil ve siyah halkalar
        b.mod(570, 'kup'); b.renk(570, 'zemin', '#5dff6a', 1);
        b.dn(582, 8); b.h(583, 2.4, 'yesil'); b.dan(592, 8); b.h(594, 6.6, 'yesil'); b.dn(604, 8); b.h(606, 2.4, 'yesil');
        b.yc(620, 'normal');
        b.pad(632); b.h(635, 4.6, 'siyah'); b.dan(637, 6, 4.6); b.dn(643, 2);
        b.coin(652, 3.3, 2); b.k(650, 0, 4, 1);
        b.cp(664);
        // 3x hız, her 2 vuruşta mod
        b.renk(668, 'gok2', '#3a0a0a', 1); b.renk(668, 'zemin', '#ff2a2a', 1);
        b.hiz(670, 3);
        ['gemi', 'kup', 'top', 'kup', 'gemi', 'kup'].forEach((m, i) => {
            const x = 676 + i * 30;
            b.mod(x, m);
            if (m === 'kup') b.dn(x + 16, 3);
            if (m === 'gemi') b.sutun(x + 15, 0, 5, 2);
            if (m === 'top') b.dn(x + 14, 5);
        });
        b.cp(860);
        // 4x kısa sprint
        b.hiz(866, 4);
        b.d(896); b.dn(936, 3); b.d(976); b.dn(1016, 4);
        b.coin(1054, 3.4, 3); b.k(1050, 0, 8, 1);
        // müzik biter: 0,5x sessiz geçiş, son vuruşta bitiş
        b.hiz(1080, 0.5); b.renk(1080, 'gok1', '#000000', 2); b.renk(1080, 'gok2', '#3a2a00', 2); b.renk(1080, 'zemin', '#c8a03a', 2); b.renk(1080, 'cizgi', '#ffd23f', 2);
        b.cp(1084);
        b.d(1100); b.dn(1124, 2); b.d(1150); b.dn(1176, 2);
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


    Y.push(yap({
        id: 'yaris-4', ad: 'Şampiyonluk', yaris: true, zorluk: 'Usta', bpm: 160,
        tema: { gok1: '#120a02', gok2: '#5a3a0a', zemin: '#e0a020', cizgi: '#fff0c0' }, bitis: 560,
    }, (b) => {
        b.d(24); b.dn(42, 2); b.d(60);
        b.mod(76, 'gemi');
        b.cp(80);
        // birinci kestirme: dar kanal + 2x
        b.k(92, 3.2, 110, 1);
        b.hiz(96, 2, 1.5);
        [112, 140, 168].forEach(x => b.k(x, 0, 2, 1.2));
        [104, 126, 148, 170, 192].forEach((x, i) => b.k(x, i % 2 === 0 ? 4.2 : 6.6, 2, i % 2 === 0 ? 2.4 : 2.4));
        b.hiz(208, 1);
        b.cp(214);
        b.mod(218, 'dalga');
        b.k(222, 0, 100, 1); b.k(222, 8, 100, 1);
        [236, 252, 268, 284, 300].forEach((x, i) => { if (i % 2 === 0) b.k(x, 1, 2, 3.5); else b.k(x, 4.5, 2, 3.5); });
        b.mod(326, 'top');
        b.cp(330);
        // ikinci kestirme: mavi pedle ters tünel + 2x
        b.pad(338, 'mavi');
        b.k(346, 4, 80, 1);
        b.hiz(350, 2, 7.5);
        b.dan(372, 3); b.dan(400, 3);
        b.dn(360, 3); b.dan(378, 3, 3); b.dn(396, 3); b.dan(414, 3, 3);
        b.hiz(432, 1); b.yc(434, 'normal');
        b.cp(440);
        b.mod(446, 'robot');
        b.d(460); b.dn(474, 4); b.d(494); b.dn(508, 3); b.d(530);
    }));

    const RKLevels = { CEIL, bolumler: B, pistler: Y, hepsi: B.concat(Y) };
    if (typeof module !== 'undefined' && module.exports) module.exports = RKLevels;
    else root.RKLevels = RKLevels;
})(typeof window !== 'undefined' ? window : globalThis);
