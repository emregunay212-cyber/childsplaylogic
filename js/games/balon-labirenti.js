/* ============================================
   Balon Labirenti — hub-içi canvas modülü (fizik bulmacası)
   --------------------------------------------
   Tek atış: dikenli topu geri çek (ya da ok tuşlarıyla nişan al), bırak; top duvarlardan sekerek
   balonları patlatır. Hepsi patlarsa labirent temizlenir, kalan varsa aynı labirent yeniden.
   Hub seviyesi = bölüm (5 labirent): GameEngine.setTotal(5); temiz → onCorrect, ıska → onWrong;
   5. labirentten sonra onComplete(yıldız) — yıldız bölümdeki ıska sayısından (0-1: 3, 2-4: 2, 5+: 1).
   Fizik: js/games/balon-labirenti-fizik.js (deterministik; önizleme, ipucu ve test aynı step'i kullanır).
   Labirentler: js/games/balon-labirenti-levels.js. Her iki dosya registry files.js sırasıyla önce yüklenir.
   Gözlem kancaları (test): .bl-wrap[data-durum=nisan|ucus|temizlendi|kacirdi|bitti] data-labirent data-kalan
   data-atis data-ipucu; BalonLabirenti.durum() → { rafAktif }. ?dev=1: ızgara + konsol atış kaydı +
   [ ] labirent atla + window.__blDebug.
   ============================================ */

const BalonLabirenti = (() => {
    const id = 'balon-labirenti';
    const BOLUM_ADLARI = ['Kova', 'Sekme', 'Baca', 'Kapı', 'Rüzgâr', 'Fırtına'];
    const levels = BOLUM_ADLARI.map((ad) => ({ ad }));

    const F = window.BALON_LABIRENTI_FIZIK;
    const LEVELS = window.BALON_LABIRENTI_LEVELS || [];
    const S = F ? F.SABIT : { W: 800, H: 500 };
    const W = S.W, H = S.H;

    const ILERLE_MS = 900;      // temiz → sonraki labirent
    const SIFIRLA_MS = 700;     // ıska → aynı labirent
    const TOST_MS = 1400;
    const GORSEL_DEVAM_TIK = 48;  // temizlendikten sonra top 0,4 s daha hareket eder (görsel)
    const KLAVYE_ACI = 3, KLAVYE_ACI_HIZLI = 15, KLAVYE_KUVVET = 5, KLAVYE_KUVVET_HIZLI = 20;
    const PARCA_OMUR = 0.35;

    let container = null, callbacks = null;
    let wrap, canvas, ctx, ui, hudBolum, hudKalan, okuma, yenidenBtn, toast, duyuru;
    let canvasFit = null;
    let renk = null;
    let bolum = 1, labirentler = [], labirentIdx = 0, labirent = null;
    let state = 'destroyed';   // hazir | ucus | temizlendi | iska | bitti | destroyed
    let shot = null, gorselKalan = 0;
    let iska = 0, ardIska = 0;
    let mazeT = 0;             // labirent saati (nişanda platform önizlemesi için akmaz: faz 0'da bekler)
    let aim = null;            // { start:{x,y}, cur:{x,y}, pointerId } pointer nişanı
    let klavyeNisan = { aci: 45, kuvvet: 60, aktif: false };
    let sonAtis = null;        // {aci,kuvvet} — data-atis
    let ipucuYol = null, ipucuAlfa = 0;
    let bant = null;           // bant geri çarpma animasyonu { x0,y0, t }
    let parcalar = [];         // kanvas parçacıkları
    let sarsinti = 0;          // kalan sarsıntı süresi (s)
    let iz = [];               // top izi
    let sonTapMs = 0, sonPopMs = 0;
    let azHareket = false, azHareketMQ = null;
    let rafId = 0, rafAktif = false, lastTime = 0, accum = 0, paused = false;
    let ilerleTimer = 0, resetTimer = 0, toastTimer = 0;
    let dev = false, debugSon = null;
    let onKeyDown, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onVisibility, onMQ;

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    // ---- Renkler: CSS token'larından bir kez oku (hex yedekli) ----
    function okuRenkler() {
        const cs = getComputedStyle(wrap);
        const al = (ad, yedek) => { const v = cs.getPropertyValue(ad).trim(); return v || yedek; };
        renk = {
            gokUst: al('--gok-ust', '#87CEEB'), gokAlt: al('--gok-alt', '#C9E8F7'),
            duvar: al('--bl-duvar', '#4F6272'), duvarUst: al('--bl-duvar-ust', '#7D93A6'), duvarGolge: al('--bl-duvar-golge', '#3A4A58'),
            top: al('--bl-top', '#2B3644'), diken: al('--bl-top-diken', '#1B222C'),
            balon: [al('--bl-balon-1', '#FF5E7E'), al('--bl-balon-2', '#FFB547'), al('--bl-balon-3', '#58C86B'), al('--bl-balon-4', '#4FA8F5'), al('--bl-balon-5', '#B27BF0')],
            sicak: al('--bl-sicak', 'rgba(255,140,60,0.22)'), sicakCizgi: al('--bl-sicak-cizgi', 'rgba(255,120,40,0.55)'),
            platform: al('--bl-platform', '#6B5B95'), platformRay: al('--bl-platform-ray', 'rgba(107,91,149,0.35)'),
            bant: al('--bl-bant', '#D9534F'), murekkep: al('--murekkep', '#1F3A4D'), dogru: al('--dogru', '#1E8E4E'),
        };
    }

    // ---- Init / Destroy ----
    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs || {};
        if (!F || !LEVELS.length) {
            console.error('[BalonLabirenti] fizik ya da labirent dosyası yüklenmemiş (registry files.js sırası: fizik → levels → modül)');
            return;
        }
        dev = (() => { try { return new URLSearchParams(location.search).get('dev') === '1'; } catch (e) { return false; } })();
        bolum = clamp(parseInt(level, 10) || 1, 1, levels.length);
        if (bolum !== level) console.error('[BalonLabirenti] seviye aralık dışı: ' + level + ' → ' + bolum);
        labirentler = LEVELS.filter((m) => m.bolum === bolum);
        if (labirentler.length !== 5) console.error('[BalonLabirenti] bölüm ' + bolum + ' için ' + labirentler.length + ' labirent (5 bekleniyordu)');
        if (!labirentler.length) return;                     // bozuk veri: boş sahne yerine hiç kurma (motor geri dönüşü açık kalır)
        GameEngine.setTotal(labirentler.length);
        azHareketMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        azHareket = !!(azHareketMQ && azHareketMQ.matches);
        iska = 0; ardIska = 0; sonAtis = null; parcalar = []; iz = []; sarsinti = 0; bant = null;
        buildDOM();
        okuRenkler();
        bindInput();
        labirentYukle(0);
        state = 'hazir';
        wrap.dataset.durum = 'nisan';
        lastTime = performance.now(); accum = 0; paused = false;
        rafAktif = true;
        rafId = requestAnimationFrame(loop);
        if (dev) kurDebug();
        // Bayat odağı (kutlama penceresinin düğmesi) bırak; klavye nişanı için kanvasa odaklan
        try { canvas.focus({ preventScroll: true }); } catch (e) { /* eski tarayıcı */ }
    }

    function destroy() {
        state = 'destroyed';
        rafAktif = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        clearTimeout(ilerleTimer); clearTimeout(resetTimer); clearTimeout(toastTimer);
        ilerleTimer = resetTimer = toastTimer = 0;
        if (canvasFit) { canvasFit.disconnect(); canvasFit = null; }
        unbindInput();
        if (dev && window.__blDebug) delete window.__blDebug;
        aim = null; shot = null; ipucuYol = null;
        if (container) container.innerHTML = '';
        wrap = canvas = ctx = ui = null;
    }

    // ---- DOM ----
    function buildDOM() {
        container.innerHTML = '';
        wrap = document.createElement('div');
        wrap.className = 'bl-wrap';
        wrap.dataset.durum = 'hazirlaniyor';

        canvas = document.createElement('canvas');
        canvas.className = 'bl-canvas';
        canvas.tabIndex = 0;
        canvas.setAttribute('role', 'application');
        canvas.setAttribute('aria-label', 'Balon Labirenti oyun alanı. Ok tuşlarıyla açı ve kuvvet, Enter ile fırlat, R ile yeniden.');
        ctx = canvas.getContext('2d');
        try { canvasFit = MobileUtils.attachResponsiveCanvas(canvas, ctx, W, H); }
        catch (e) { canvas.width = W; canvas.height = H; }
        wrap.appendChild(canvas);

        ui = document.createElement('div');
        ui.className = 'bl-ui';

        const hud = document.createElement('div');
        hud.className = 'bl-hud';
        hudBolum = document.createElement('div');
        hudBolum.className = 'bl-pill bl-pill--bolum';
        hudKalan = document.createElement('div');
        hudKalan.className = 'bl-pill bl-pill--kalan';
        hud.appendChild(hudBolum);
        hud.appendChild(hudKalan);

        okuma = document.createElement('div');
        okuma.className = 'bl-okuma';
        okuma.setAttribute('aria-hidden', 'true');
        hud.appendChild(okuma);

        yenidenBtn = document.createElement('button');
        yenidenBtn.type = 'button';
        yenidenBtn.className = 'bl-yeniden';
        yenidenBtn.textContent = 'Yeniden';
        yenidenBtn.setAttribute('aria-label', 'Labirenti yeniden başlat');
        hud.appendChild(yenidenBtn);
        ui.appendChild(hud);

        toast = document.createElement('div');
        toast.className = 'bl-toast';
        toast.setAttribute('aria-hidden', 'true');
        ui.appendChild(toast);

        duyuru = document.createElement('div');
        duyuru.className = 'bl-duyuru';
        duyuru.setAttribute('role', 'status');
        duyuru.setAttribute('aria-live', 'polite');
        ui.appendChild(duyuru);

        wrap.appendChild(ui);
        container.appendChild(wrap);
    }

    // Hap: [soluk etiket] [koyu değer] — "Bölüm 1  1/5", "3 balon"
    function pill(el, etiket, deger, degerOnce) {
        el.textContent = '';
        const e = document.createElement('span');
        e.className = 'bl-pill__etiket';
        e.textContent = etiket;
        const d = document.createElement('span');
        d.className = 'bl-pill__deger';
        d.textContent = deger;
        if (degerOnce) { el.appendChild(d); el.appendChild(e); }
        else { el.appendChild(e); el.appendChild(d); }
    }

    function hudGuncelle() {
        pill(hudBolum, 'Bölüm ' + bolum, (labirentIdx + 1) + '/' + labirentler.length);
        const kalan = shot ? shot.kalan : labirent.balonlar.length;
        pill(hudKalan, 'balon', String(kalan), true);
        hudKalan.classList.toggle('is-son', kalan === 1);
        wrap.dataset.bolum = String(bolum);
        wrap.dataset.labirent = (labirentIdx + 1) + '/' + labirentler.length;
        wrap.dataset.kalan = String(kalan);
    }

    function duyur(metin) {
        if (!duyuru) return;
        duyuru.textContent = '';
        requestAnimationFrame(() => { if (duyuru) duyuru.textContent = metin; });
    }

    function tostGoster(metin, tur) {
        clearTimeout(toastTimer);
        toast.textContent = metin;
        toast.className = 'bl-toast is-acik ' + (tur === 'basari' ? 'is-basari' : 'is-hata');
        toastTimer = setTimeout(() => { if (toast) toast.classList.remove('is-acik'); }, TOST_MS);
    }

    function okumaGuncelle(atis) {
        if (!atis) {
            if (labirent && labirent.sira === 1 && labirent.ipucu && state === 'hazir' && !aim && !klavyeNisan.aktif) {
                okuma.textContent = labirent.ipucu;
                okuma.classList.add('is-acik', 'is-ipucu');
            } else {
                okuma.classList.remove('is-acik', 'is-ipucu');
            }
            return;
        }
        okuma.classList.remove('is-ipucu');
        okuma.textContent = '';
        okuma.appendChild(document.createTextNode('açı ' + atis.aci + '°'));
        const ayrac = document.createElement('span');
        ayrac.className = 'bl-okuma__ayrac';
        ayrac.textContent = '·';
        okuma.appendChild(ayrac);
        okuma.appendChild(document.createTextNode('kuvvet ' + atis.kuvvet));
        okuma.classList.add('is-acik');
    }

    // ---- Labirent akışı ----
    function labirentYukle(idx) {
        labirentIdx = clamp(idx, 0, labirentler.length - 1);
        labirent = labirentler[labirentIdx];
        shot = null; gorselKalan = 0; mazeT = 0; ardIska = 0;
        aim = null; ipucuYol = null; ipucuAlfa = 0; parcalar = []; iz = []; bant = null;
        klavyeNisan = { aci: 45, kuvvet: 60, aktif: false };
        delete wrap.dataset.ipucu;
        state = 'hazir';
        wrap.dataset.durum = 'nisan';
        hudGuncelle();
        okumaGuncelle(null);
        duyur('Bölüm ' + bolum + ', labirent ' + (labirentIdx + 1) + ': ' + labirent.ad + '. ' + labirent.balonlar.length + ' balon.');
        if (canvas && document.activeElement !== canvas && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('.game-toolbar'))) {
            try { canvas.focus({ preventScroll: true }); } catch (e) { /* yok */ }
        }
    }

    function labirentSifirla() {
        if (state === 'destroyed') return;
        shot = null; gorselKalan = 0; mazeT = 0; parcalar = []; iz = []; bant = null;
        state = 'hazir';
        wrap.dataset.durum = 'nisan';
        hudGuncelle();
        okumaGuncelle(null);
        if (ardIska >= 2 && labirent.cozum) {
            const r = F.simulate(labirent, labirent.cozum, { yol: true, maxT: ardIska >= 4 ? 1.2 : 0.5 });
            ipucuYol = r.yol; ipucuAlfa = 0;
            wrap.dataset.ipucu = '1';
        }
    }

    function atesle(atis) {
        if (state !== 'hazir' || !atis) return;
        sonAtis = atis;
        wrap.dataset.atis = atis.aci + ',' + atis.kuvvet;
        shot = F.createShot(labirent, atis);
        mazeT = 0;
        state = 'ucus';
        wrap.dataset.durum = 'ucus';
        ipucuYol = null; delete wrap.dataset.ipucu;
        if (aim) {
            const p = cekisNoktasi();
            bant = { x0: p.x, y0: p.y, t: 0 };
        } else {
            bant = null;
        }
        aim = null;
        klavyeNisan.aktif = false;
        okumaGuncelle(null);
        AudioManager.play('whoosh');
        if (dev) console.info('[BL] atış', atis);
    }

    function atisBitti(sonuc) {
        if (state !== 'ucus') return;
        if (dev) console.info('[BL] sonuç', sonuc, 'süre', shot.t.toFixed(2), 'patlayan', shot.patlayan.length + '/' + labirent.balonlar.length);
        debugSon = { atis: sonAtis, sonuc, sure: shot.t };
        if (sonuc === 'temiz') {
            state = 'temizlendi';
            wrap.dataset.durum = 'temizlendi';
            gorselKalan = GORSEL_DEVAM_TIK;
            ardIska = 0;
            hudGuncelle();
            if (callbacks.onCorrect) callbacks.onCorrect();   // motor success sesini çalar
            const son = labirent.balonlar[shot.sonPatlayan] || labirent.balonlar[0];
            const pp = toPage(son.x, son.y);
            try { Particles.sparkle(pp.x, pp.y, azHareket ? 6 : 14); } catch (e) { /* parçacık katmanı yok */ }
            tostGoster('Temiz!', 'basari');
            duyur('Labirent temizlendi.');
            ilerleTimer = setTimeout(() => {
                if (state === 'destroyed') return;
                if (labirentIdx < labirentler.length - 1) labirentYukle(labirentIdx + 1);
                else bitir();
            }, ILERLE_MS);
        } else {
            state = 'iska';
            wrap.dataset.durum = 'kacirdi';
            iska++; ardIska++;
            if (callbacks.onWrong) callbacks.onWrong();      // motor error sesini çalar
            tostGoster('Iskaladın, tekrar dene', 'hata');
            duyur('Iskaladın, tekrar dene. ' + shot.kalan + ' balon kaldı.');
            resetTimer = setTimeout(labirentSifirla, SIFIRLA_MS);
        }
    }

    function bitir() {
        if (state === 'destroyed') return;
        state = 'bitti';
        wrap.dataset.durum = 'bitti';
        const yildiz = iska <= 1 ? 3 : iska <= 4 ? 2 : 1;
        duyur('Bölüm ' + bolum + ' tamamlandı.');
        if (callbacks.onComplete) callbacks.onComplete(yildiz);
    }

    function yeniden() {
        if (state === 'ucus') {
            // Uçuşu kes: ıska sayılır (labirent yeniden başlar)
            shot.sonuc = 'iptal';
            atisBitti('iptal');
        } else if (state === 'hazir') {
            klavyeNisan = { aci: 45, kuvvet: 60, aktif: klavyeNisan.aktif };
            aim = null;
            okumaGuncelle(klavyeNisan.aktif ? klavyeNisan : null);
        }
    }

    // ---- Koordinat dönüşümü (dikey telefonda wrap 90° döner: bbox uzun kenarı dikey) ----
    function toLogical(cx, cy) {
        const r = canvas.getBoundingClientRect();
        const rot = r.height > r.width;
        const ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
        const u = rot ? oy : ox, v = rot ? -ox : oy;
        const cssW = rot ? r.height : r.width, cssH = rot ? r.width : r.height;
        return { x: (u + cssW / 2) * W / cssW, y: (v + cssH / 2) * H / cssH };
    }
    function toPage(lx, ly) {
        const r = canvas.getBoundingClientRect();
        const rot = r.height > r.width;
        const cssW = rot ? r.height : r.width, cssH = rot ? r.width : r.height;
        const u = lx * cssW / W - cssW / 2, v = ly * cssH / H - cssH / 2;
        const ox = rot ? -v : u, oy = rot ? u : v;
        return { x: r.left + r.width / 2 + ox, y: r.top + r.height / 2 + oy };
    }

    // Çekişteki topun konumu (başlangıç + kırpılmış çekiş vektörü)
    function cekisVektoru() {
        if (!aim) return null;
        let dx = aim.cur.x - aim.start.x, dy = aim.cur.y - aim.start.y;
        const len = Math.hypot(dx, dy);
        if (len > S.CEKME_MAX) { dx *= S.CEKME_MAX / len; dy *= S.CEKME_MAX / len; }
        return { dx, dy, len: Math.min(len, S.CEKME_MAX) };
    }
    // Çekişteki topun ÇİZİM konumu: kanvas içinde kalır (fizik yalnız vektöre bakar, çizim kırpılır)
    function cekisNoktasi() {
        const v = cekisVektoru();
        const b = labirent.baslangic;
        if (!v) return { x: b.x, y: b.y };
        const R = S.TOP_R + 2;
        return { x: clamp(b.x + v.dx, R, W - R), y: clamp(b.y + v.dy, R, H - R) };
    }
    function aimAtis() {
        const v = cekisVektoru();
        return v ? F.pullToShot(v.dx, v.dy) : null;
    }

    // ---- Girdi ----
    function bindInput() {
        unbindInput();
        onPointerDown = (e) => {
            if (state !== 'hazir') return;
            if (aim) return;                                     // ikinci parmak/işaretçi nişanı devralmaz
            if (e.button !== undefined && e.button !== 0) return;
            const p = toLogical(e.clientX, e.clientY);
            aim = { start: p, cur: p, pointerId: e.pointerId };
            ipucuYol = null; delete wrap.dataset.ipucu;
            klavyeNisan.aktif = false;
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* desteklenmiyor */ }
            try { canvas.focus({ preventScroll: true }); } catch (err) { /* yok */ }
            e.preventDefault();
        };
        onPointerMove = (e) => {
            if (!aim || e.pointerId !== aim.pointerId) return;
            aim.cur = toLogical(e.clientX, e.clientY);
            okumaGuncelle(aimAtis());
            e.preventDefault();
        };
        onPointerUp = (e) => {
            if (!aim || e.pointerId !== aim.pointerId) return;
            aim.cur = toLogical(e.clientX, e.clientY);
            const atis = aimAtis();
            if (atis) atesle(atis);
            else { aim = null; okumaGuncelle(null); }
            e.preventDefault();
        };
        onPointerCancel = (e) => {
            if (!aim || (e.pointerId !== undefined && e.pointerId !== aim.pointerId)) return;
            aim = null;
            okumaGuncelle(null);
        };
        onKeyDown = (e) => {
            if (state === 'destroyed') return;
            // Odak araç çubuğu düğmesindeyse tuşu tarayıcıya bırak (Enter/Boşluk düğmeyi çalıştırsın)
            const hedef = e.target;
            if (hedef && hedef !== canvas && hedef.closest && hedef.closest('.game-toolbar, dialog, .bl-yeniden')) return;
            const k = e.key;
            if (dev && k === ']') { e.preventDefault(); clearTimeout(ilerleTimer); clearTimeout(resetTimer); labirentYukle(labirentIdx + 1); return; }
            if (dev && k === '[') { e.preventDefault(); clearTimeout(ilerleTimer); clearTimeout(resetTimer); labirentYukle(labirentIdx - 1); return; }
            if (dev && (k === 'l' || k === 'L')) { e.preventDefault(); console.info('[BL] labirent', JSON.stringify(labirent)); return; }
            if (k === 'r' || k === 'R') { e.preventDefault(); yeniden(); return; }
            if (state !== 'hazir') return;
            if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
                e.preventDefault();
                aim = null; ipucuYol = null; delete wrap.dataset.ipucu;
                klavyeNisan.aktif = true;
                const da = e.shiftKey ? KLAVYE_ACI_HIZLI : KLAVYE_ACI;
                const dk = e.shiftKey ? KLAVYE_KUVVET_HIZLI : KLAVYE_KUVVET;
                if (k === 'ArrowLeft') klavyeNisan.aci = (klavyeNisan.aci + da) % 360;          // saat yönünün tersi = sola dön
                if (k === 'ArrowRight') klavyeNisan.aci = (klavyeNisan.aci - da + 360) % 360;
                if (k === 'ArrowUp') klavyeNisan.kuvvet = clamp(klavyeNisan.kuvvet + dk, 10, 100);
                if (k === 'ArrowDown') klavyeNisan.kuvvet = clamp(klavyeNisan.kuvvet - dk, 10, 100);
                okumaGuncelle(klavyeNisan);
                return;
            }
            if (k === 'Enter' || k === ' ') {
                if (!klavyeNisan.aktif) { klavyeNisan.aktif = true; okumaGuncelle(klavyeNisan); e.preventDefault(); return; }
                e.preventDefault();
                atesle({ aci: klavyeNisan.aci, kuvvet: klavyeNisan.kuvvet });
            }
        };
        onVisibility = () => {
            if (document.hidden) { paused = true; }
            else { paused = false; lastTime = performance.now(); accum = 0; }
        };
        onMQ = (e) => { azHareket = !!e.matches; };
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerCancel);
        canvas.addEventListener('lostpointercapture', onPointerCancel);
        canvas.addEventListener('keydown', onKeyDown);
        yenidenBtn.addEventListener('click', yeniden);
        document.addEventListener('visibilitychange', onVisibility);
        if (azHareketMQ && azHareketMQ.addEventListener) azHareketMQ.addEventListener('change', onMQ);
    }

    function unbindInput() {
        if (canvas) {
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerCancel);
            canvas.removeEventListener('lostpointercapture', onPointerCancel);
            canvas.removeEventListener('keydown', onKeyDown);
            if (aim) { try { canvas.releasePointerCapture(aim.pointerId); } catch (e) { /* yok */ } }
        }
        if (yenidenBtn) yenidenBtn.removeEventListener('click', yeniden);
        if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
        if (azHareketMQ && onMQ && azHareketMQ.removeEventListener) azHareketMQ.removeEventListener('change', onMQ);
    }

    // ---- Döngü: sabit adım (fizik ADIM), çizim kare başına ----
    function loop(now) {
        if (state === 'destroyed') { rafAktif = false; return; }
        const dt = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;
        if (!paused) {
            accum += dt;
            while (accum >= S.ADIM) {
                sabitTik(S.ADIM);
                accum -= S.ADIM;
            }
            gorselTik(dt);
        }
        if (!document.hidden) draw();
        rafId = requestAnimationFrame(loop);
    }

    function sabitTik(h) {
        if (state === 'ucus' && shot) {
            const sonuc = F.tick(shot, labirent, false);
            olaylariIsle();
            mazeT = shot.t;
            if (sonuc) atisBitti(sonuc);
        } else if (state === 'temizlendi' && shot && gorselKalan > 0) {
            F.tick(shot, labirent, true);
            olaylariIsle();
            mazeT = shot.t;
            gorselKalan--;
        }
    }

    function olaylariIsle() {
        const ev = shot.olaylar;
        const now = performance.now();
        for (let i = 0; i < ev.length; i++) {
            const o = ev[i];
            if (o.tip === 'pop') {
                if (now - sonPopMs > 16) { AudioManager.play('pop'); sonPopMs = now; }
                const b = labirent.balonlar[o.i];
                patlat(b.x, b.y, o.i);
                hudGuncelle();
            } else if (o.tip === 'carpma' && o.siddet > 400) {
                if (now - sonTapMs > 120) { AudioManager.play('tap'); sonTapMs = now; }
                if (!azHareket) sarsinti = 0.12;
            }
        }
    }

    function patlat(x, y, i) {
        const n = azHareket ? 4 : 8;
        const c = renk.balon[i % renk.balon.length];
        for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2 + (i % 3) * 0.4;
            const hiz = 140 + (k % 3) * 40;
            parcalar.push({ x, y, vx: Math.cos(a) * hiz, vy: Math.sin(a) * hiz - 60, omur: PARCA_OMUR, c, r: 3 + (k % 2) * 2 });
        }
        parcalar.push({ x, y: y + 14, vx: 0, vy: 120, omur: PARCA_OMUR, c: renk.murekkep, r: 1.5, ip: true });
        if (!azHareket) parcalar.push({ x, y, vx: 0, vy: 0, omur: 0.15, c, halka: true, r: S.BALON_R });
    }

    function gorselTik(dt) {
        if (bant) { bant.t += dt; if (bant.t > 0.16) bant = null; }
        if (sarsinti > 0) sarsinti = Math.max(0, sarsinti - dt);
        if (ipucuYol && ipucuAlfa < 1) ipucuAlfa = Math.min(1, ipucuAlfa + dt / 0.22);
        for (let i = parcalar.length - 1; i >= 0; i--) {
            const p = parcalar[i];
            p.omur -= dt;
            if (p.omur <= 0) { parcalar.splice(i, 1); continue; }
            if (p.halka) continue;                      // halka yerinde büyür (çizimde)
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt;
        }
        if (shot && (state === 'ucus' || state === 'temizlendi') && !azHareket) {
            iz.push({ x: shot.x, y: shot.y });
            if (iz.length > 7) iz.shift();
        }
    }

    // ---- Çizim ----
    function yuvarlakDikdortgen(x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
        ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
        ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y);
        ctx.closePath();
    }

    function draw() {
        if (!ctx || !labirent) return;
        ctx.save();
        ctx.clearRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, renk.gokUst);
        g.addColorStop(1, renk.gokAlt);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        if (sarsinti > 0) {
            const s = sarsinti / 0.12 * 2;
            ctx.translate(Math.sin(sarsinti * 180) * s, Math.cos(sarsinti * 140) * s);
        }
        if (dev) drawIzgara();
        drawHava();
        drawPlatformlar();
        drawDuvarlar();
        drawBalonlar();
        drawIpucu();
        drawNisan();
        drawTop();
        drawParcalar();
        ctx.restore();
    }

    function drawIzgara() {
        ctx.save();
        ctx.strokeStyle = 'rgba(31,58,77,0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.fillStyle = 'rgba(31,58,77,0.6)';
        ctx.font = '10px monospace';
        (labirent.duvarlar || []).forEach((d, i) => ctx.fillText('d' + i, d.x + 2, d.y + 10));
        labirent.balonlar.forEach((b, i) => ctx.fillText('b' + i, b.x + 18, b.y - 12));
        ctx.restore();
    }

    function drawHava() {
        const hava = labirent.hava;
        if (!hava) return;
        const t = azHareket ? 0 : (performance.now() / 1000);
        for (let i = 0; i < hava.length; i++) {
            const z = hava[i];
            ctx.fillStyle = renk.sicak;
            yuvarlakDikdortgen(z.x, z.y, z.w, z.h, 10);
            ctx.fill();
            ctx.strokeStyle = renk.sicakCizgi;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 10]);
            const sutun = Math.max(1, Math.round(z.w / 26));
            for (let c = 0; c < sutun; c++) {
                const x = z.x + (c + 0.5) * (z.w / sutun);
                const kay = ((t * 60 + c * 17) % 32);
                ctx.lineDashOffset = kay;
                ctx.beginPath();
                ctx.moveTo(x, z.y + z.h - 4);
                ctx.lineTo(x, z.y + 4);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        }
    }

    function drawPlatformlar() {
        const hareketli = labirent.hareketli;
        if (!hareketli) return;
        for (let i = 0; i < hareketli.length; i++) {
            const p = hareketli[i];
            // Ray: başlangıç ↔ hedef merkez çizgisi (noktalı)
            ctx.strokeStyle = renk.platformRay;
            ctx.lineWidth = 3;
            ctx.setLineDash([4, 8]);
            ctx.beginPath();
            ctx.moveTo(p.x + p.w / 2, p.y + p.h / 2);
            ctx.lineTo(p.hedef.x + p.w / 2, p.hedef.y + p.h / 2);
            ctx.stroke();
            ctx.setLineDash([]);
            const q = F.platformAt(p, mazeT);
            ctx.fillStyle = renk.platform;
            yuvarlakDikdortgen(q.x, q.y, p.w, p.h, 6);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            yuvarlakDikdortgen(q.x + 3, q.y + 2, p.w - 6, 3, 2);
            ctx.fill();
        }
    }

    function drawDuvarlar() {
        const duvarlar = labirent.duvarlar;
        if (!duvarlar) return;
        for (let i = 0; i < duvarlar.length; i++) {
            const d = duvarlar[i];
            ctx.fillStyle = renk.duvarGolge;
            yuvarlakDikdortgen(d.x, d.y + 3, d.w, d.h, 7);
            ctx.fill();
            ctx.fillStyle = renk.duvar;
            yuvarlakDikdortgen(d.x, d.y, d.w, d.h, 7);
            ctx.fill();
            ctx.fillStyle = renk.duvarUst;
            yuvarlakDikdortgen(d.x + 3, d.y + 2, Math.max(4, d.w - 6), 3, 2);
            ctx.fill();
        }
    }

    function drawBalonlar() {
        const balonlar = labirent.balonlar;
        const R = S.BALON_R;
        const t = azHareket ? 0 : performance.now() / 1000;
        for (let i = 0; i < balonlar.length; i++) {
            if (shot && shot.patladi[i]) continue;
            const b = balonlar[i];
            const salinim = azHareket ? 0 : Math.sin(t * 2.6 + i * 1.3) * 2;
            const x = b.x, y = b.y + salinim;
            const c = renk.balon[i % renk.balon.length];
            // ip
            ctx.strokeStyle = 'rgba(31,58,77,0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y + R + 3);
            ctx.quadraticCurveTo(x + 4, y + R + 12, x - 2, y + R + 22);
            ctx.stroke();
            // gövde
            const rg = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.15, x, y, R * 1.05);
            rg.addColorStop(0, 'rgba(255,255,255,0.95)');
            rg.addColorStop(0.25, c);
            rg.addColorStop(1, c);
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.ellipse(x, y, R, R * 1.12, 0, 0, Math.PI * 2);
            ctx.fill();
            // düğüm
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.moveTo(x, y + R * 1.05);
            ctx.lineTo(x - 4, y + R * 1.05 + 6);
            ctx.lineTo(x + 4, y + R * 1.05 + 6);
            ctx.closePath();
            ctx.fill();
            // parlama
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.beginPath();
            ctx.ellipse(x - R * 0.4, y - R * 0.45, R * 0.22, R * 0.34, -0.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawIpucu() {
        if (!ipucuYol || ipucuAlfa <= 0) return;
        ctx.save();
        ctx.globalAlpha = 0.42 * ipucuAlfa;
        ctx.strokeStyle = renk.dogru;
        ctx.lineWidth = 4;
        ctx.setLineDash([2, 10]);
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < ipucuYol.length; i++) {
            const p = ipucuYol[i];
            if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
        ctx.restore();
    }

    function drawNisan() {
        const b = labirent.baslangic;
        // fırlatma halkası
        ctx.strokeStyle = 'rgba(31,58,77,0.35)';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(b.x, b.y, S.TOP_R + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(31,58,77,0.12)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, S.TOP_R + 8, 0, Math.PI * 2);
        ctx.fill();

        if (state !== 'hazir') {
            if (bant) {
                // bant geri çarpması: çekiş noktasından halkaya doğru hızla döner
                const k = 1 - Math.pow(1 - Math.min(1, bant.t / 0.16), 3);
                const x = bant.x0 + (b.x - bant.x0) * k, y = bant.y0 + (b.y - bant.y0) * k;
                bandCiz(x, y, 1 - k);
            }
            return;
        }
        let atis = null, cekis = null;
        if (aim) { atis = aimAtis(); cekis = cekisNoktasi(); }
        else if (klavyeNisan.aktif) atis = { aci: klavyeNisan.aci, kuvvet: klavyeNisan.kuvvet };
        if (!atis && !aim) return;

        if (atis) {
            const pts = F.preview(labirent, atis.aci, atis.kuvvet, 22, 0.04);
            for (let i = 0; i < pts.length; i++) {
                ctx.fillStyle = 'rgba(31,58,77,' + (0.55 * (1 - i / pts.length)).toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(pts[i][0], pts[i][1], 4 - i * 0.08, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        if (aim && cekis) {
            bandCiz(cekis.x, cekis.y, 1);
        } else if (atis) {
            // klavye nişanı: ok
            const rad = atis.aci * Math.PI / 180;
            const len = 30 + atis.kuvvet * 0.9;
            const ex = b.x + Math.cos(rad) * len, ey = b.y - Math.sin(rad) * len;
            ctx.strokeStyle = renk.bant;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - Math.cos(rad - 0.5) * 12, ey + Math.sin(rad - 0.5) * 12);
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - Math.cos(rad + 0.5) * 12, ey + Math.sin(rad + 0.5) * 12);
            ctx.stroke();
        }
    }

    function bandCiz(x, y, alfa) {
        const b = labirent.baslangic;
        ctx.save();
        ctx.globalAlpha = alfa;
        ctx.strokeStyle = renk.bant;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x - 10, b.y); ctx.lineTo(x, y); ctx.lineTo(b.x + 10, b.y);
        ctx.stroke();
        ctx.restore();
    }

    function topCiz(x, y, spin, alfa) {
        const R = S.TOP_R;
        ctx.save();
        ctx.globalAlpha = alfa;
        ctx.translate(x, y);
        ctx.rotate(spin);
        ctx.fillStyle = renk.diken;
        ctx.beginPath();
        const n = 10;
        for (let i = 0; i < n; i++) {
            const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.5) / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2;
            ctx.moveTo(Math.cos(a0) * (R - 2), Math.sin(a0) * (R - 2));
            ctx.lineTo(Math.cos(a1) * (R + 6), Math.sin(a1) * (R + 6));
            ctx.lineTo(Math.cos(a2) * (R - 2), Math.sin(a2) * (R - 2));
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = renk.top;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.arc(-R * 0.3, -R * 0.35, R * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawTop() {
        if (state === 'hazir') {
            const p = aim ? cekisNoktasi() : labirent.baslangic;
            topCiz(p.x, p.y, 0, 1);
            return;
        }
        if (!shot) { topCiz(labirent.baslangic.x, labirent.baslangic.y, 0, 1); return; }
        for (let i = 0; i < iz.length; i++) {
            const p = iz[i];
            ctx.fillStyle = 'rgba(43,54,68,' + (0.25 * (i + 1) / iz.length).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, S.TOP_R * (0.4 + 0.5 * (i + 1) / iz.length), 0, Math.PI * 2);
            ctx.fill();
        }
        topCiz(shot.x, shot.y, shot.spin, 1);
    }

    function drawParcalar() {
        for (let i = 0; i < parcalar.length; i++) {
            const p = parcalar[i];
            if (p.halka) {
                // 0,15 s: yarıçap 1× → 1,9× güçlü ease-out ile, opaklık 0,7 → 0
                const k = 1 - p.omur / 0.15;
                const e = 1 - Math.pow(1 - k, 3);
                ctx.globalAlpha = 0.7 * (1 - k);
                ctx.strokeStyle = p.c;
                ctx.lineWidth = 3 * (1 - k) + 1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * (1 + 0.9 * e), 0, Math.PI * 2);
                ctx.stroke();
                continue;
            }
            ctx.globalAlpha = Math.max(0, p.omur / PARCA_OMUR);
            ctx.fillStyle = p.c;
            ctx.beginPath();
            if (p.ip) ctx.rect(p.x - 1, p.y, 2, 10);
            else ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ---- Geliştirici yardımcıları (?dev=1) ----
    function kurDebug() {
        window.__blDebug = {
            get son() { return debugSon; },
            deneme(aci, kuvvet) { return F.simulate(labirent, { aci, kuvvet }); },
            tolerans() {
                const c = sonAtis || labirent.cozum;
                const satirlar = [];
                for (const da of [-1, 0, 1]) {
                    const hucre = [];
                    for (const dk of [-2, 0, 2]) hucre.push(F.simulate(labirent, { aci: (c.aci + da + 360) % 360, kuvvet: c.kuvvet + dk }).hepsi ? 'OK' : '--');
                    satirlar.push('aci ' + (c.aci + da) + ': ' + hucre.join(' '));
                }
                console.info('[BL] tolerans ' + labirent.id + ' ' + JSON.stringify(c) + '\n' + satirlar.join('\n'));
                return satirlar;
            },
            labirent: () => labirent,
        };
    }

    function durum() { return { rafAktif, state, labirentIdx, iska }; }

    return { id, levels, init, destroy, durum };
})();
