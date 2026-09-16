/* global GAME_SHELVES */   /* js/catalog.js (ÜRETİLMİŞ) — eslint.config.js hubCoreGlobals listesine eklenene kadar (config-protection hook) */
/* exported HubIA */
/* ============================================
   BİLNET OYUN - Hub bilgi mimarisi yardımcıları (Faz 2 / B2b)
   --------------------------------------------
   js/app.js'in hub çizimi bu modülü okur; burada DOM'a veri yazılmaz, durum tutulmaz (yalnız localStorage
   tercihleri). Üç iş:
     1. Yaş rafı modeli — GAME_SHELVES (data/games.json `shelves`): rafın kapsadığı tam yaşlar `ages [ilk, son]`
        (kapalı aralık). Oyun `age [min, max]` bu aralıkla kesişiyorsa o rafa girer; birden çok rafa girebilir
        (aynı kural tools/build-catalog.js shelvesOf ve seo/games_data.py shelves_of'ta — üçü birlikte değişir).
        Raf seçimi `localStorage bo_shelf` ('hepsi' | raf id); ilk ziyaret "Hepsi".
     2. Arama — ad / kazanım (teaches) / ders (subject) / bölüm adı üzerinde, aksan ve büyük-küçük harf duyarsız:
        Türkçe İ/ı elle eşlenir (JS toLowerCase 'İ' → 'i̇' + nokta üretir), sonra NFD ayrıştırıp aksanlar atılır.
        Sorgu boşlukla parçalanır; her parça dizinde bir SÖZCÜK BAŞLANGICI olmalı (VE). Ad eşleşmesi üstte sıralanır.
     3. Klavye — çip grubu (role=radiogroup: ok tuşları seçer, Home/End, yalnız seçili çip Tab durağı) ve
        kart grubu (yatay ray / ızgara: roving tabindex; Sol/Sağ komşu, Yukarı/Aşağı ızgarada geometriyle satır
        değiştirir, Home/End uçlar). Kart etkinleştirme (Enter/Boşluk) MobileUtils.bindActivate'te kalır.
   Öğretmen görünümü tercihi `localStorage bo_teacher` ('1' | yok).
   ============================================ */

const HubIA = (() => {
    const SHELF_KEY = 'bo_shelf';
    const TEACHER_KEY = 'bo_teacher';
    const ALL = 'hepsi';

    // Ders anahtarı → görünen ad (arama dizini + öğretmen görünümü)
    const SUBJECT_LABELS = {
        turkce: 'Türkçe', ingilizce: 'İngilizce', matematik: 'Matematik', fen: 'Fen', kodlama: 'Kodlama',
        strateji: 'Strateji', sanat: 'Sanat', spor: 'Spor', genel: 'Genel',
    };

    // ── 1. Yaş rafı ──
    function shelves() { return Array.isArray(GAME_SHELVES) ? GAME_SHELVES : []; }

    function inShelf(age, shelf) {
        return Array.isArray(age) && age.length === 2 && age[0] <= shelf.ages[1] && age[1] >= shelf.ages[0];
    }

    // Oyunun girdiği raf id'leri (görünüm sırasıyla)
    function shelvesOf(age) {
        return shelves().filter((s) => inShelf(age, s)).map((s) => s.id);
    }

    function isShelfId(id) { return id === ALL || shelves().some((s) => s.id === id); }

    function readStore(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function writeStore(key, value) {
        try {
            if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
        } catch (e) { /* depolama kapalı: tercih yalnız oturumda yaşar */ }
    }

    function readShelf() {
        const v = readStore(SHELF_KEY);
        return v && isShelfId(v) ? v : ALL;
    }
    function saveShelf(id) { writeStore(SHELF_KEY, isShelfId(id) ? id : ALL); }

    function readTeacher() { return readStore(TEACHER_KEY) === '1'; }
    function saveTeacher(on) { writeStore(TEACHER_KEY, on ? '1' : null); }

    // ── 2. Arama ──
    // Aksan + büyük/küçük harf katlaması. Sıra önemli: İ/I eşlemesi toLowerCase'ten ÖNCE (JS 'İ'.toLowerCase()
    // = 'i' + U+0307), NFD ayrıştırma sonra (ş→s+U+0327, ğ→g+U+0306, ö→o+U+0308, â→a+U+0302), en sonda
    // ı (U+0131, ayrışmaz) → i. Böylece "KESİR", "kesir", "Kesır" aynı dizeye iner.
    function fold(s) {
        return String(s == null ? '' : s)
            .replace(/İ/g, 'i')
            .replace(/I/g, 'ı')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/ı/g, 'i');
    }

    function words(s) {
        return fold(s).split(/[^a-z0-9]+/).filter(Boolean);
    }

    // Kayıt için arama dizini: { ad: [sözcükler], hepsi: [sözcükler] }
    function indexOf(entry) {
        const subject = SUBJECT_LABELS[entry.subject] || entry.subject || '';
        const parts = [entry.name, entry.teaches, subject, entry.sectionTitle, entry.online ? 'online çok oyunculu' : ''];
        return { ad: words(entry.name), hepsi: words(parts.join(' ')) };
    }

    function queryTokens(q) { return words(q); }

    // Eşleşme puanı: 0 = yok; 1 = tüm parçalar dizinde; 2 = ayrıca ilk parça adda sözcük başlangıcı
    function score(index, tokens) {
        if (!tokens.length) return 0;
        const hit = (list, t) => list.some((w) => w.startsWith(t));
        if (!tokens.every((t) => hit(index.hepsi, t))) return 0;
        return tokens.every((t) => hit(index.ad, t)) ? 2 : 1;
    }

    // ── 3. Klavye ──
    const RADIO_SEL = '[role="radio"]';

    function radios(group) { return Array.from(group.querySelectorAll(RADIO_SEL)); }

    // Seçili çipi işaretle: aria-checked + Tab durağı (roving); seçili yoksa ilk çip Tab durağı
    function setChecked(group, value) {
        const items = radios(group);
        let found = false;
        items.forEach((el) => {
            const on = el.dataset.value === value;
            el.setAttribute('aria-checked', on ? 'true' : 'false');
            el.classList.toggle('active', on);
            el.tabIndex = on ? 0 : -1;
            if (on) found = true;
        });
        if (!found && items.length) items[0].tabIndex = 0;
    }

    function checkedValue(group) {
        const el = group.querySelector(RADIO_SEL + '[aria-checked="true"]');
        return el ? el.dataset.value : null;
    }

    // Çip grubu: tık seçer; ok tuşları komşuya geçip SEÇER (APG radio group); Home/End uçlar.
    // onChange(value, event) yalnız değer değişince çağrılır. Dinleyiciler kapsayıcıda (çipler yeniden çizilebilir).
    function bindRadioGroup(group, onChange) {
        if (!group || group.dataset.iaBound) return;
        group.dataset.iaBound = '1';
        const select = (el, e) => {
            if (!el) return;
            const prev = checkedValue(group);
            setChecked(group, el.dataset.value);
            el.focus({ preventScroll: true });
            try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e2) { /* eski tarayıcı */ }
            if (prev !== el.dataset.value) onChange(el.dataset.value, e);
        };
        group.addEventListener('click', (e) => {
            const el = e.target.closest(RADIO_SEL);
            if (el && group.contains(el)) select(el, e);
        });
        group.addEventListener('keydown', (e) => {
            const cur = e.target.closest(RADIO_SEL);
            if (!cur) return;
            const items = radios(group);
            const i = items.indexOf(cur);
            let next = null;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = items[(i + 1) % items.length];
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = items[(i - 1 + items.length) % items.length];
            else if (e.key === 'Home') next = items[0];
            else if (e.key === 'End') next = items[items.length - 1];
            else if (e.key === ' ' || e.key === 'Enter') next = cur;
            if (!next) return;
            e.preventDefault();
            select(next, e);
        });
    }

    // Kart grubu (roving tabindex). itemSel: kart seçicisi; grid=true ise Yukarı/Aşağı satır değiştirir.
    // refresh(): yeniden çizim sonrası ilk kartı Tab durağı yapar (odaklanan kart sonra durağı devralır).
    function bindRoving(container, itemSel, opts) {
        const grid = !!(opts && opts.grid);
        const items = () => Array.from(container.querySelectorAll(itemSel));
        function setStop(el) {
            items().forEach((c) => { c.tabIndex = c === el ? 0 : -1; });
        }
        function refresh() {
            const list = items();
            if (!list.length) return;
            const cur = list.find((c) => c.tabIndex === 0) || list[0];
            setStop(cur);
        }
        function focusTo(el) {
            if (!el) return;
            setStop(el);
            el.focus({ preventScroll: true });
            try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* eski tarayıcı */ }
        }
        // Izgarada satır değiştirme: en yakın üst/alt satırdaki, yatayda en yakın kart
        function vertical(list, cur, dir) {
            const r = cur.getBoundingClientRect();
            let best = null; let bestRow = null; let bestDx = Infinity;
            for (const c of list) {
                const cr = c.getBoundingClientRect();
                const dy = dir > 0 ? cr.top - r.top : r.top - cr.top;
                if (dy < 2) continue;
                const rowKey = Math.round(cr.top);
                if (bestRow !== null && (dir > 0 ? rowKey > bestRow : rowKey < bestRow)) continue;
                const dx = Math.abs(cr.left - r.left);
                if (bestRow === null || (dir > 0 ? rowKey < bestRow : rowKey > bestRow) || dx < bestDx) {
                    best = c; bestRow = rowKey; bestDx = dx;
                }
            }
            return best;
        }
        if (!container.dataset.iaRoving) {
            container.dataset.iaRoving = '1';
            container.addEventListener('focusin', (e) => {
                const el = e.target.closest(itemSel);
                if (el && container.contains(el)) setStop(el);
            });
            container.addEventListener('keydown', (e) => {
                const cur = e.target.closest(itemSel);
                if (!cur || !container.contains(cur)) return;
                const list = items();
                const i = list.indexOf(cur);
                let next = null;
                if (e.key === 'ArrowRight') next = list[Math.min(i + 1, list.length - 1)];
                else if (e.key === 'ArrowLeft') next = list[Math.max(i - 1, 0)];
                else if (e.key === 'Home') next = list[0];
                else if (e.key === 'End') next = list[list.length - 1];
                else if (grid && e.key === 'ArrowDown') next = vertical(list, cur, 1);
                else if (grid && e.key === 'ArrowUp') next = vertical(list, cur, -1);
                if (!next) return;
                e.preventDefault();
                focusTo(next);
            });
        }
        return { refresh };
    }

    return {
        ALL, SHELF_KEY, TEACHER_KEY, SUBJECT_LABELS,
        shelves, inShelf, shelvesOf, isShelfId, readShelf, saveShelf, readTeacher, saveTeacher,
        fold, words, indexOf, queryTokens, score,
        bindRadioGroup, setChecked, checkedValue, bindRoving,
    };
})();
