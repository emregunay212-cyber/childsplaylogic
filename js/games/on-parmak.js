/* ============================================
   On Parmak — on parmak klavye oyunu (Türkçe Q, 6–12 yaş), hub-içi modül
   --------------------------------------------
   Akış (spec docs/on-parmak-tasarim-2026-10-15.md §3): başlangıç seçici → bölümler kendiliğinden geçer.
   Kısım = motor seviyesi (data/games.json levels = ON_PARMAK_ICERIK.length); kısım sonu callbacks.onLevelUp
   (katman yok), yalnız SON kısım callbacks.onComplete (kutlama katmanı; "Tekrar Oyna" yeni init → seçici).
   Bölüm türleri: 'kutu' (tanıtım ekranları + 7'li kutu sayfaları, yanlışta bekler) ve 'satir' (3 görünür satır,
   imleç her basışta ilerler, canlı hız + doğruluk). Bölüm sonu sonuç şeridi; doğruluk < %80 → aynı bölüm baştan.
   Ölçüm: window.OnParmakOlcum (saf). Ekran klavyesi + eller: window.OnParmakEkran. Fiziksel tuş = konum:
   window.KlavyeDizilim.karakterOf(e) (plan sapma 3). Caps Lock açıkken basışlar yok sayılır (sapma 8);
   Enter/Backspace yazmada yok sayılır, Enter yalnız sonuç şeridini geçer (ilk 400 ms hariç, sapma 7).
   Motorun onCorrect/onWrong'u tuş başına ÇAĞRILMAZ (ses tekrarı + sayaç şişmesi); yıldızı modül hesaplar.
   Güvenlik: içerik ve basılan karakter textContent ile; veriyle innerHTML yok (yalnız innerHTML = '' temizliği).
   ============================================ */

const OnParmak = (() => {
    const id = 'on-parmak';
    const levels = window.ON_PARMAK_ICERIK;          // kısım listesi = motor seviyeleri

    const KUTU_SAYFA = 7;            // kutulu alıştırmada bir sayfadaki kutu
    const SERIT_ALISTIR_MS = 1200;   // tanıtım → "Şimdi alıştıralım" şeridi
    const SONUC_MS = 2500;           // sonuç şeridi kendiliğinden kalkar
    const ENTER_KILIT_MS = 400;      // şerit açıldıktan sonra refleks Enter yok sayılır
    const KISIM_SERIT_MS = 2800;     // kısım geçiş şeridi
    const GECER_DOGRULUK = 80;       // hedef (yalnız metin için; karar OnParmakOlcum.bolumYildizi'nde)

    // Parmak adı (tanıtım cümlesi): "F tuşuna sol işaret parmağınla bas."
    const PARMAK_ILE = {
        'sol-serce': 'sol serçe parmağınla', 'sol-yuzuk': 'sol yüzük parmağınla',
        'sol-orta': 'sol orta parmağınla', 'sol-isaret': 'sol işaret parmağınla',
        'sag-isaret': 'sağ işaret parmağınla', 'sag-orta': 'sağ orta parmağınla',
        'sag-yuzuk': 'sağ yüzük parmağınla', 'sag-serce': 'sağ serçe parmağınla',
        basparmak: 'başparmağınla',
    };
    const KARAKTER_ADI = { ' ': 'Boşluk', ',': 'virgül', '.': 'nokta' };

    let container = null;
    let callbacks = null;
    let els = {};
    let ekran = null;
    let timers = [];
    let keydownHandler = null;
    let pendingStart = null;  // seçiciden: { bolum } — GameEngine.startGame ile gelen sıradaki init'te tüketilir

    // Oturum içi tercih (kaydedilmez): el çizimi kullanıcı değiştirmedikçe kısmın varsayılanını izler
    let elTercih = null;      // null | true | false
    let klavyeAcik = true;

    // Akış durumu
    let kisimIdx = 0;
    let bolumIdx = 0;
    let mod = 'yok';          // 'tanitim' | 'serit' | 'kutu' | 'satir' | 'sonuc' | 'gecis' | 'bitti'
    let capsAcik = false;
    let kisimYildizlari = []; // bu girişte GEÇİLEN bölümlerin yıldızları (kısım ortasından başlanırsa yalnız oynananlar)

    // Bölüm ölçümü
    let metin = '';
    let poz = 0;              // sıradaki karakter
    let dogruIlk = 0;
    let toplamBasis = 0;
    let baslangic = 0;        // ilk sayılan basışın zamanı (ms); 0 = henüz basılmadı
    let bitis = 0;
    let hataliPoz = false;    // kutu: bu kutuda en az bir yanlış basış oldu
    let tanitimAdimlari = [];
    let tanitimIdx = 0;
    let sonucAcilis = 0;
    let satirlar = [];        // satır motoru: [{ dugum, bas, son }]
    let harfDugumleri = [];   // satır motoru: karakter → <span>
    let etkinSatir = -1;

    function later(fn, ms) {
        const t = setTimeout(() => { timers = timers.filter((x) => x !== t); fn(); }, ms);
        timers.push(t);
        return t;
    }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function el(tag, cls, text) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }
    const simdi = () => Date.now();
    const kisim = () => levels[kisimIdx];
    const bolum = () => kisim().bolumler[bolumIdx];
    function genelNo(ki, bi) {
        let n = bi + 1;
        for (let i = 0; i < ki; i++) n += levels[i].bolumler.length;
        return n;
    }
    const TOPLAM_BOLUM = levels.reduce((n, k) => n + k.bolumler.length, 0);
    // Tuş kapağındaki biçim: harf büyük (Türkçe kuralı: i → İ), diğerleri olduğu gibi
    const kapak = (ch) => (ch === ' ' ? 'Boşluk' : ch.toLocaleUpperCase('tr-TR'));
    const gorunur = (ch) => (ch === ' ' ? '␣' : ch);

    // ── Kurulum ──
    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        clearTimers();
        kisimIdx = Math.min(Math.max(level, 1), levels.length) - 1;
        mod = 'yok';
        capsAcik = false;
        kisimYildizlari = [];
        const start = pendingStart;
        pendingStart = null;
        GameEngine.setTotal(TOPLAM_BOLUM);

        // "Tekrar Oyna" düğmesinden kalan bayat odak: ilk basış oyuna gitsin
        const ae = document.activeElement;
        if (ae && ae !== document.body && !gameArea.contains(ae)) { try { ae.blur(); } catch (e) { /* yok say */ } }
        // Hub kartı, derin bağlantı ve "Tekrar Oyna" seçiciyi açar; tuş dinleyicisi seçimden SONRA kurulur
        // (seçicide Enter/Boşluk düğmeyi etkinleştirsin, oyun yutmasın)
        if (!start) { seciciKur(); return; }
        bolumIdx = Math.min(start.bolum, kisim().bolumler.length - 1);
        oyunKur();
        keydownHandler = onKeyDown;
        document.addEventListener('keydown', keydownHandler);
        kisimBaslat();
    }

    // ── Başlangıç seçici: kısım kartı → kısmın ilk bölümü; numara → o bölüm. İlk odak Kısım 1 (Enter = baştan) ──
    function seciciKur() {
        container.innerHTML = '';
        const root = el('div', 'op-picker');
        root.appendChild(el('h2', 'op-picker__title', 'Nereden başlamak istersin?'));
        const ipucu = el('p', 'op-picker__ipucu');
        // Tuş kapağı + ek tek parça: "F’de" satır sonunda bölünmesin
        const tusEk = (harf) => { const s = el('span', 'op-picker__tus'); s.append(el('strong', '', harf), '’de'); return s; };
        ipucu.append('Sol işaret parmağın ', tusEk('F'), ', sağ işaret parmağın ', tusEk('J'), ' — bu tuşlarda küçük tümsek var.');
        root.appendChild(ipucu);
        const grid = el('div', 'op-picker__grid');
        let first = null;
        levels.forEach((k, si) => {
            const ilk = genelNo(si, 0);
            const son = ilk + k.bolumler.length - 1;
            const kart = el('div', 'op-picker__kart');
            kart.dataset.kisim = String(si + 1);
            const ana = el('button', 'op-picker__kisim');
            ana.type = 'button';
            ana.appendChild(el('span', 'op-picker__no', 'Kısım ' + (si + 1)));
            ana.appendChild(el('span', 'op-picker__ad', k.ad));
            ana.appendChild(el('span', 'op-picker__ornek', k.ornek));
            ana.appendChild(el('span', 'op-picker__aralik', 'Bölüm ' + ilk + '–' + son));
            ana.setAttribute('aria-label', 'Kısım ' + (si + 1) + ', ' + k.ad + ', bölüm ' + ilk + '–' + son + ', baştan başla');
            ana.addEventListener('click', () => startFrom(si, 0));
            kart.appendChild(ana);
            const cipler = el('div', 'op-picker__bolumler');
            cipler.setAttribute('role', 'group');
            cipler.setAttribute('aria-label', k.ad + ' bölümleri');
            k.bolumler.forEach((b, ti) => {
                const no = ilk + ti;
                const c = el('button', 'op-picker__bolum', String(no));
                c.type = 'button';
                c.dataset.bolumSec = String(no);
                c.title = 'Bölüm ' + no + ': ' + b.ad;
                c.setAttribute('aria-label', c.title);
                c.addEventListener('click', () => startFrom(si, ti));
                cipler.appendChild(c);
            });
            kart.appendChild(cipler);
            grid.appendChild(kart);
            if (!first) first = ana;
        });
        root.appendChild(grid);
        if (dokunmatik()) root.appendChild(el('p', 'op-not', 'On Parmak fiziksel klavyeyle oynanır.'));
        container.appendChild(root);
        els = { root };
        try { first.focus({ preventScroll: true }); } catch (e) { /* yok say */ }
    }

    function startFrom(si, ti) {
        AudioManager.play('tap');
        pendingStart = { bolum: ti };
        GameEngine.startGame(GameEngine.getCurrentGame(), si + 1);   // araç çubuğu + yıldız kaydı seçilen kısma
    }

    function dokunmatik() {
        try { return typeof MobileUtils !== 'undefined' && MobileUtils.isTouchDevice(); } catch (e) { return false; }
    }

    // ── Oyun DOM'u ──
    function oyunKur() {
        container.innerHTML = '';
        const root = el('div', 'op-oyun');

        const ust = el('div', 'op-ust');
        const ilerleme = el('div', 'op-ilerleme');
        const ilerlemeNo = el('span', 'op-ilerleme__no');
        const ilerlemeAd = el('span', 'op-ilerleme__ad');
        ilerleme.append(ilerlemeNo, ilerlemeAd);
        ust.appendChild(ilerleme);
        const dugmeler = el('div', 'op-dugmeler');
        const elDugme = dugmeKur('El', () => { elTercih = !elAcikMi(); ekranGuncelle(); });
        const klavyeDugme = dugmeKur('Klavye', () => { klavyeAcik = !klavyeAcik; ekranGuncelle(); });
        dugmeler.append(elDugme, klavyeDugme);
        ust.appendChild(dugmeler);
        root.appendChild(ust);

        const caps = el('div', 'op-caps');
        caps.hidden = true;
        caps.appendChild(el('strong', 'op-caps__baslik', 'Büyük harf kilidi açık'));
        caps.appendChild(el('span', 'op-caps__metin', 'Kapatmak için Caps Lock tuşuna bas.'));
        root.appendChild(caps);

        const sahne = el('div', 'op-sahne');
        const yonerge = el('p', 'op-yonerge');
        sahne.appendChild(yonerge);
        const alan = el('div', 'op-alan');
        sahne.appendChild(alan);
        const olcum = el('div', 'op-olcum');
        const hizDeger = el('span', 'op-olcum__deger');
        const dogrulukDeger = el('span', 'op-olcum__deger');
        const hizKutu = el('span', 'op-olcum__oge');
        hizKutu.append(hizDeger, el('span', 'op-olcum__birim', ' kelime/dk'));
        const dogrulukKutu = el('span', 'op-olcum__oge');
        dogrulukKutu.append(el('span', 'op-olcum__birim', 'doğruluk '), dogrulukDeger);
        olcum.append(hizKutu, dogrulukKutu);
        olcum.setAttribute('aria-hidden', 'true');   // her basışta değişir; ekran okuyucuya bölüm sonunda tek özet
        sahne.appendChild(olcum);
        const serit = el('div', 'op-serit');
        serit.setAttribute('aria-hidden', 'true');   // aynı bilgi canlı bölgede duyurulur
        sahne.appendChild(serit);
        root.appendChild(sahne);

        const ekranKap = el('div', 'op-ekran-kap');
        root.appendChild(ekranKap);
        if (dokunmatik()) root.appendChild(el('p', 'op-not', 'On Parmak fiziksel klavyeyle oynanır.'));

        const canli = el('div', 'op-canli');
        canli.setAttribute('aria-live', 'polite');
        canli.setAttribute('role', 'status');
        root.appendChild(canli);

        container.appendChild(root);
        ekran = window.OnParmakEkran.olustur(ekranKap, { el: true, klavye: klavyeAcik, basinca: dokunusBasis });
        els = { root, ilerlemeNo, ilerlemeAd, elDugme, klavyeDugme, caps, sahne, yonerge, alan, olcum,
            hizDeger, dogrulukDeger, serit, canli };
    }

    function dugmeKur(ad, fn) {
        const b = el('button', 'op-dugme', ad);
        b.type = 'button';
        b.setAttribute('aria-pressed', 'true');
        b.addEventListener('mousedown', (e) => e.preventDefault());   // fareyle odak almasın: Boşluk düğmeye gitmesin
        b.addEventListener('click', fn);
        return b;
    }

    function elAcikMi() { return elTercih === null ? !!kisim().el : elTercih; }

    // Klavye kapalıyken eller de gizlenir (el yalnız klavyenin üstünde anlamlı); "El" düğmesi o sırada devre dışı
    function ekranGuncelle() {
        if (!ekran) return;
        const elGoster = klavyeAcik && elAcikMi();
        ekran.goster({ el: elGoster, klavye: klavyeAcik });
        els.klavyeDugme.setAttribute('aria-pressed', String(klavyeAcik));
        els.elDugme.setAttribute('aria-pressed', String(elGoster));
        els.elDugme.disabled = !klavyeAcik;
    }

    function duyur(metin) {
        if (!els.canli) return;
        // Aynı metin art arda gelirse de okunsun: önce boşalt, sonraki görevde yaz
        els.canli.textContent = '';
        later(() => { if (els.canli) els.canli.textContent = metin; }, 30);
    }

    function durumYaz() {
        const r = els.root;
        if (!r) return;
        r.dataset.mod = mod;
        r.dataset.kisim = String(kisimIdx + 1);
        r.dataset.bolum = genelNo(kisimIdx, bolumIdx) + '/' + TOPLAM_BOLUM;
        r.dataset.beklenen = beklenen() || '';
    }

    function beklenen() {
        if (mod === 'tanitim') {
            const a = tanitimAdimlari[tanitimIdx];
            return a ? (a.shift ? 'Shift' : a.ch) : null;
        }
        if (mod === 'kutu' || mod === 'satir') return poz < metin.length ? metin[poz] : null;
        return null;
    }

    // ── Fiziksel klavye ──
    function onKeyDown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // Odak oyun kökünün DIŞINDA görünür bir etkileşimli öğedeyse (araç çubuğu) tuş tarayıcıya bırakılır
        const t = e.target;
        if (t && t !== document.body && els.root && !els.root.contains(t)
            && typeof t.closest === 'function' && t.closest('button, a, input, textarea, select, [contenteditable]')
            && t.getClientRects().length > 0) return;
        const enter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter';
        const bosluk = e.code === 'Space' || e.key === ' ';
        // Oyun içindeki El/Klavye düğmesi Tab ile odaktaysa Enter/Boşluk düğmeyi etkinleştirir
        if ((enter || bosluk) && t && els.root && els.root.contains(t) && t.tagName === 'BUTTON') return;
        if (typeof e.getModifierState === 'function') capsGuncelle(e.getModifierState('CapsLock'));
        if (enter || bosluk) e.preventDefault();          // sayfa kaymasın
        if (e.repeat) return;
        if (enter) { enterBasildi(); return; }            // Enter Boşluk değildir
        if (e.key === 'CapsLock' || e.code === 'CapsLock') return;
        if (e.key === 'Backspace') { e.preventDefault(); return; }   // geri silme yok; sayılmaz
        if (e.key === 'Shift') { shiftBasildi(e.code); return; }
        if (capsAcik) return;                              // Caps Lock açıkken yazma duraklar (sayılmaz)
        const ch = window.KlavyeDizilim.karakterOf(e);
        if (ch == null) return;
        e.preventDefault();
        basis(ch);
    }

    function dokunusBasis(ch) {
        if (capsAcik) return;
        basis(ch);
    }

    function capsGuncelle(acik) {
        if (acik === capsAcik || !els.caps) return;
        capsAcik = acik;
        els.caps.hidden = !acik;
        if (els.root) els.root.classList.toggle('is-caps', acik);
        duyur(acik ? 'Büyük harf kilidi açık. Kapatmak için Caps Lock tuşuna bas.' : 'Büyük harf kilidi kapandı, devam edebilirsin.');
    }

    function enterBasildi() {
        if (mod === 'sonuc' && simdi() - sonucAcilis >= ENTER_KILIT_MS) sonucuGec();
    }

    function basis(ch) {
        if (mod === 'tanitim') tanitimBasis(ch);
        else if (mod === 'kutu') kutuBasis(ch);
        else if (mod === 'satir') satirBasis(ch);
    }

    // ── Kısım / bölüm ──
    function kisimBaslat() {
        kisimYildizlari = [];
        ekranGuncelle();
        bolumBaslat(false);
    }

    function bolumBaslat(tekrar) {
        clearTimers();
        const b = bolum();
        metin = b.metin;
        poz = 0; dogruIlk = 0; toplamBasis = 0; baslangic = 0; bitis = 0; hataliPoz = false;
        els.root.classList.remove('is-olcum');
        els.serit.classList.remove('is-acik');
        const no = genelNo(kisimIdx, bolumIdx);
        els.ilerlemeNo.textContent = 'Bölüm ' + no + '/' + TOPLAM_BOLUM;
        els.ilerlemeAd.textContent = b.ad;
        els.root.dataset.tur = b.tur;
        // Tanıtım: yalnız kutu bölümünün yeni tuşları (+ yeniShift tek ekran); tekrarda gösterilmez
        tanitimAdimlari = [];
        if (b.tur === 'kutu' && !tekrar) {
            (b.yeni || []).forEach((ch) => tanitimAdimlari.push({ ch }));
            if (b.yeniShift) tanitimAdimlari.push({ shift: b.yeniShift });
        }
        tanitimIdx = 0;
        if (tanitimAdimlari.length) { tanitimGoster(); return; }
        alistirmaBaslat();
    }

    // ── Tanıtım (basışlar sayılmaz) ──
    function tanitimGoster() {
        mod = 'tanitim';
        const a = tanitimAdimlari[tanitimIdx];
        const alan = els.alan;
        alan.innerHTML = '';
        alan.className = 'op-alan op-alan--tanitim';
        els.yonerge.textContent = '';
        const kapakEl = el('div', 'op-tanitim__tus');
        const cumle = el('p', 'op-tanitim__cumle');
        let duyuru;
        if (a.shift) {
            const shiftEl = a.shift === 'sol' ? 'sol' : 'sağ';
            const harfEl = a.shift === 'sol' ? 'Sağ' : 'Sol';
            const parmak = a.shift === 'sol' ? 'sol serçe parmağınla' : 'sağ serçe parmağınla';
            kapakEl.textContent = 'Shift';
            kapakEl.classList.add('op-tanitim__tus--genis');
            cumle.append(harfEl + ' el harfleri için ', el('strong', '', shiftEl), ' Shift’e ', el('strong', '', parmak), ' bas.');
            duyuru = harfEl + ' el harfleri için ' + shiftEl + ' Shift tuşuna ' + parmak + ' bas.';
            ekran.vurgula(null);
        } else {
            const ad = kapak(a.ch);
            const parmak = PARMAK_ILE[window.KlavyeDizilim.parmaklarOf(a.ch)[0]] || '';
            kapakEl.textContent = ad;
            if (a.ch === ' ') kapakEl.classList.add('op-tanitim__tus--genis');
            cumle.append(el('strong', 'op-tanitim__harf', ad), ' tuşuna ', el('strong', '', parmak), ' bas.');
            duyuru = (KARAKTER_ADI[a.ch] || ad) + ' tuşuna ' + parmak + ' bas.';
            ekran.vurgula(a.ch);
        }
        alan.append(kapakEl, cumle);
        duyur(duyuru);
        durumYaz();
    }

    function tanitimBasis(ch) {
        const a = tanitimAdimlari[tanitimIdx];
        if (!a || a.shift) { ekran.bas(ch, false); AudioManager.play('error'); salla(); return; }
        if (ch !== a.ch) { ekran.bas(ch, false); AudioManager.play('error'); salla(); return; }
        ekran.bas(ch, true);
        AudioManager.play('tap');
        tanitimIleri();
    }

    function shiftBasildi(code) {
        if (mod !== 'tanitim') return;
        const a = tanitimAdimlari[tanitimIdx];
        if (!a || !a.shift) return;
        const dogru = (a.shift === 'sol' && code === 'ShiftLeft') || (a.shift === 'sag' && code === 'ShiftRight');
        if (!dogru) { AudioManager.play('error'); salla(); return; }
        AudioManager.play('tap');
        tanitimIleri();
    }

    function salla() {
        const k = els.alan.querySelector('.op-tanitim__tus');
        if (!k) return;
        k.classList.remove('is-yanlis');
        void k.offsetWidth;
        k.classList.add('is-yanlis');
    }

    function tanitimIleri() {
        tanitimIdx++;
        if (tanitimIdx < tanitimAdimlari.length) { tanitimGoster(); return; }
        // "Şimdi alıştıralım: F J" — basışlar bu sırada yok sayılır
        mod = 'serit';
        ekran.vurgula(null);
        const yeniler = (bolum().yeni || []).map(kapak).join(' ');
        seritGoster('Şimdi alıştıralım', yeniler, null, 'is-bilgi');
        duyur('Şimdi alıştıralım: ' + yeniler);
        durumYaz();
        later(() => { seritKapat(); alistirmaBaslat(); }, SERIT_ALISTIR_MS);
    }

    function alistirmaBaslat() {
        if (bolum().tur === 'kutu') kutuBaslat();
        else satirBaslat();
    }

    // Ölçüm: ilk sayılan basışta saat başlar
    function say(dogru, ilkBasis) {
        if (!baslangic) baslangic = simdi();
        toplamBasis++;
        if (dogru && ilkBasis) dogruIlk++;
    }

    // ── Kutu motoru: 7'li sayfalar, yanlışta bekler ──
    function kutuBaslat() {
        mod = 'kutu';
        els.yonerge.textContent = 'Yanan tuşa, yanan parmakla bas.';
        kutuSayfaCiz();
        ekran.vurgula(metin[poz]);
        durumYaz();
    }

    function kutuSayfaCiz() {
        const alan = els.alan;
        alan.innerHTML = '';
        alan.className = 'op-alan op-alan--kutu';
        const sayfaBas = Math.floor(poz / KUTU_SAYFA) * KUTU_SAYFA;
        const sayfa = el('div', 'op-kutular');
        for (let i = sayfaBas; i < Math.min(sayfaBas + KUTU_SAYFA, metin.length); i++) {
            const k = el('div', 'op-kutu' + (metin[i] === ' ' ? ' op-kutu--bosluk' : ''));
            k.dataset.i = String(i);
            k.appendChild(el('span', 'op-kutu__harf', gorunur(metin[i])));
            if (i === poz) k.classList.add('is-etkin');
            sayfa.appendChild(k);
        }
        const toplamSayfa = Math.ceil(metin.length / KUTU_SAYFA);
        const sayfaNo = Math.floor(poz / KUTU_SAYFA) + 1;
        const noktalar = el('div', 'op-sayfalar');
        noktalar.setAttribute('aria-hidden', 'true');
        for (let s = 1; s <= toplamSayfa; s++) noktalar.appendChild(el('span', 'op-sayfa' + (s < sayfaNo ? ' is-bitti' : s === sayfaNo ? ' is-etkin' : '')));
        alan.append(sayfa, noktalar);
        els.kutular = sayfa;
    }

    function kutuDugumu(i) { return els.kutular ? els.kutular.querySelector('.op-kutu[data-i="' + i + '"]') : null; }

    function kutuBasis(ch) {
        const hedef = metin[poz];
        const kutu = kutuDugumu(poz);
        if (ch !== hedef) {
            say(false, false);
            hataliPoz = true;
            ekran.bas(ch, false);
            AudioManager.play('error');
            if (kutu) {
                kutu.classList.add('is-yanlis');
                kutu.querySelector('.op-kutu__harf').textContent = gorunur(ch);   // basılan karakter görünür
            }
            return;
        }
        say(true, !hataliPoz);
        ekran.bas(ch, true);
        AudioManager.play('tap');
        if (kutu) {
            kutu.classList.remove('is-yanlis', 'is-etkin');
            kutu.querySelector('.op-kutu__harf').textContent = gorunur(hedef);
            if (hataliPoz) kutu.classList.add('is-duzeltildi');
            else {
                kutu.classList.add('is-dogru');
                const tik = el('span', 'op-kutu__tik', '✓');
                tik.setAttribute('aria-hidden', 'true');
                kutu.appendChild(tik);
            }
        }
        hataliPoz = false;
        poz++;
        if (poz >= metin.length) { bolumBitti(); return; }
        if (poz % KUTU_SAYFA === 0) kutuSayfaCiz();
        else { const s = kutuDugumu(poz); if (s) s.classList.add('is-etkin'); }
        ekran.vurgula(metin[poz]);
        durumYaz();
    }

    // ── Satır motoru: 3 görünür satır, sözcük bölünmez, imleç her basışta ilerler ──
    function satirBaslat() {
        mod = 'satir';
        els.yonerge.textContent = 'Metni yaz. Yanlış harfte durma, devam et.';
        const alan = els.alan;
        alan.innerHTML = '';
        alan.className = 'op-alan op-alan--satir';
        const pencere = el('div', 'op-satirlar');
        const kayan = el('div', 'op-satirlar__ic');
        pencere.appendChild(kayan);
        alan.appendChild(pencere);
        // Satır başına sığan karakter: gerçek yazı tipinde ölçülür
        // (harf başına ayrı span — oyundaki gibi; ortalama Türkçe harf genişliği)
        const olcu = el('div', 'op-satir');
        olcu.style.visibility = 'hidden';
        for (const c of 'kasılmşedf') olcu.appendChild(el('span', 'op-harf', c));
        kayan.appendChild(olcu);
        const harfGen = olcu.firstChild ? (olcu.lastChild.getBoundingClientRect().right - olcu.firstChild.getBoundingClientRect().left) / 10 : 0;
        olcu.remove();
        const genislik = pencere.clientWidth || 600;
        const sigan = Math.max(12, Math.floor(genislik / (harfGen || 18)) - 1);

        satirlar = [];
        harfDugumleri = [];
        satirBol(metin, sigan).forEach((s) => {
            const dugum = el('div', 'op-satir');
            for (let i = s.bas; i < s.son; i++) {
                const h = el('span', 'op-harf' + (metin[i] === ' ' ? ' op-harf--bosluk' : ''), metin[i]);
                harfDugumleri.push(h);
                dugum.appendChild(h);
            }
            kayan.appendChild(dugum);
            satirlar.push({ dugum, bas: s.bas, son: s.son });
        });
        els.kayan = kayan;
        etkinSatir = -1;
        satirImlec();
        ekran.vurgula(metin[poz]);
        olcumYaz();
        durumYaz();
    }

    // Sözcük bölünmez: boşluk önceki satırın sonunda kalır (yazılacak karakterdir)
    function satirBol(m, sigan) {
        const sonuc = [];
        let bas = 0;
        while (bas < m.length) {
            let son = Math.min(bas + sigan, m.length);
            if (son < m.length) {
                const kes = m.lastIndexOf(' ', son - 1);
                if (kes >= bas) son = kes + 1;
            }
            sonuc.push({ bas, son });
            bas = son;
        }
        return sonuc;
    }

    function satirImlec() {
        harfDugumleri.forEach((h) => h.classList.remove('is-imlec'));
        if (poz < harfDugumleri.length) harfDugumleri[poz].classList.add('is-imlec');
        const sIdx = satirlar.findIndex((s) => poz >= s.bas && poz < s.son);
        if (sIdx === -1 || sIdx === etkinSatir) return;
        etkinSatir = sIdx;
        satirlar.forEach((s, i) => s.dugum.classList.toggle('is-etkin', i === sIdx));
        // Etkin satır ortada (ilk satırda en üstte); satır yüksekliği CSS'te --op-satir-yuk
        const kayma = Math.max(0, Math.min(sIdx - 1, satirlar.length - 3));
        els.kayan.style.transform = 'translateY(calc(' + (-kayma) + ' * var(--op-satir-yuk)))';
    }

    function satirBasis(ch) {
        const hedef = metin[poz];
        const dogru = ch === hedef;
        say(dogru, true);
        const h = harfDugumleri[poz];
        if (dogru) {
            ekran.bas(ch, true);
            AudioManager.play('tap');
            if (h) h.classList.add('is-dogru');
        } else {
            ekran.bas(ch, false);
            AudioManager.play('error');
            if (h) {
                h.classList.add('is-yanlis');
                if (hedef === ' ') h.textContent = '␣';
            }
        }
        poz++;
        olcumYaz();
        if (poz >= metin.length) { bolumBitti(); return; }
        satirImlec();
        ekran.vurgula(metin[poz]);
        durumYaz();
    }

    function olcumYaz() {
        const O = window.OnParmakOlcum;
        if (!baslangic) { els.root.classList.remove('is-olcum'); return; }
        els.root.classList.add('is-olcum');
        const ms = (bitis || simdi()) - baslangic;
        els.hizDeger.textContent = String(Math.round(O.hiz(poz, ms)));
        els.dogrulukDeger.textContent = '%' + Math.floor(O.dogruluk(dogruIlk, toplamBasis));
    }

    // ── Bölüm sonu: sonuç şeridi ──
    function bolumBitti() {
        bitis = simdi();
        mod = 'sonuc';
        ekran.vurgula(null);
        const O = window.OnParmakOlcum;
        const b = bolum();
        const d = O.dogruluk(dogruIlk, toplamBasis);
        const ms = bitis - baslangic;
        const h = O.hiz(metin.length, ms);
        const y = O.bolumYildizi({ dogruluk: d, hiz: h, hedefHiz: b.tur === 'kutu' ? undefined : kisim().hedefHiz });
        const dGoster = Math.floor(d);          // %79,6 asla "%80" görünmesin (karar ham değerle)
        const no = genelNo(kisimIdx, bolumIdx);
        if (b.tur === 'satir') olcumYaz();
        sonucAcilis = simdi();
        els.root.dataset.sonuc = y === 0 ? 'tekrar' : String(y);
        if (y === 0) {
            AudioManager.play('whoosh');
            seritGoster('Bir daha deneyelim', 'doğruluk %' + dGoster + ', hedef %' + GECER_DOGRULUK, null, 'is-tekrar');
            duyur('Bir daha deneyelim. Doğruluk yüzde ' + dGoster + ', hedef yüzde ' + GECER_DOGRULUK + '. Bölüm ' + no + ' baştan başlıyor.');
        } else {
            kisimYildizlari.push(y);
            AudioManager.play('star');
            const hGoster = Math.round(h);
            const sure = sureMetni(ms);
            // Parçalar dar ekranda kendi içinde bölünmesin ("11 / sn" olmasın): parça içi bölünmez boşluk
            const NBSP = String.fromCharCode(0xA0);
            const parca = ['doğruluk %' + dGoster, hGoster + ' kelime/dk', sure].map((x) => x.split(' ').join(NBSP));
            seritGoster('Bölüm ' + no + ' tamam!', parca.join(' · '), y, 'is-basari');
            duyur('Bölüm ' + no + ' tamam: 3 üzerinden ' + y + ' yıldız. Doğruluk yüzde ' + dGoster + ', hız ' + hGoster
                + ' kelime/dk, süre ' + sure + '.');
        }
        durumYaz();
        later(sonucuGec, SONUC_MS);
    }

    function sureMetni(ms) {
        const sn = Math.max(0, Math.round(ms / 1000));
        if (sn < 60) return sn + ' sn';
        return Math.floor(sn / 60) + ' dk ' + (sn % 60) + ' sn';
    }

    function sonucuGec() {
        if (mod !== 'sonuc') return;
        mod = 'gecis';
        clearTimers();
        seritKapat();
        const tekrar = els.root.dataset.sonuc === 'tekrar';
        delete els.root.dataset.sonuc;
        if (tekrar) { bolumBaslat(true); return; }
        if (bolumIdx < kisim().bolumler.length - 1) { bolumIdx++; bolumBaslat(false); return; }
        kisimBitti();
    }

    // ── Kısım sonu ──
    function kisimBitti() {
        const y = window.OnParmakOlcum.kisimYildizi(kisimYildizlari);
        if (kisimIdx >= levels.length - 1) {
            mod = 'bitti';
            durumYaz();
            callbacks.onComplete(y);
            return;
        }
        callbacks.onLevelUp(y);                  // motor yıldızı kaydeder, araç çubuğu sonraki kısma
        AudioManager.play('star');
        const biten = kisim();
        kisimIdx++;
        bolumIdx = 0;
        mod = 'gecis';
        els.alan.innerHTML = '';
        els.yonerge.textContent = '';
        seritGoster(biten.ad + ' tamam!', 'Sıradaki: ' + kisim().ad, y, 'is-kisim');
        duyur(biten.ad + ' tamam: 3 üzerinden ' + y + ' yıldız. Sıradaki: ' + kisim().ad + '.');
        durumYaz();
        later(() => { seritKapat(); kisimBaslat(); }, KISIM_SERIT_MS);
    }

    // ── Şerit (bilgi / sonuç / tekrar / kısım) ──
    function seritGoster(baslik, alt, yildiz, tur) {
        const s = els.serit;
        s.innerHTML = '';
        s.className = 'op-serit ' + tur;
        s.appendChild(el('div', 'op-serit__baslik', baslik));
        if (yildiz != null) s.appendChild(yildizlar(yildiz));
        s.appendChild(el('div', 'op-serit__alt', alt));
        els.root.classList.add('is-serit');
        void s.offsetWidth;   // giriş geçişi her açılışta oynasın
        s.classList.add('is-acik');
    }

    function seritKapat() {
        if (!els.serit) return;
        els.serit.classList.remove('is-acik');
        els.root.classList.remove('is-serit');
    }

    function yildizlar(n) {
        const NS = 'http://www.w3.org/2000/svg';
        const kap = el('div', 'op-yildizlar');
        for (let i = 0; i < 3; i++) {
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('class', 'op-yildiz' + (i < n ? ' is-kazanildi' : ''));
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z');
            svg.appendChild(p);
            kap.appendChild(svg);
        }
        return kap;
    }

    function destroy() {
        clearTimers();
        mod = 'yok';
        if (keydownHandler) { document.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
        if (ekran) { ekran.yokEt(); ekran = null; }
        if (container) container.innerHTML = '';
        els = {};
        satirlar = []; harfDugumleri = []; tanitimAdimlari = [];
    }

    return { id, levels, init, destroy };
})();
