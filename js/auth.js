/* ============================================
   Kimlik & Bulut Senkron — Google / Misafir
   - Google: ilerleme RTDB users/{uid}/progress'te tutulur → cihazlar arası senkron,
     kaldığı yerden devam.
   - Misafir: kayıt yok; her girişte 0 yıldız (yerel/efemer, buluta yazılmaz).
   "Sadece bulut" modeli: Google girişinde yerel ilerleme bulutla DEĞİŞTİRİLİR.
   ============================================ */
const Auth = (() => {
    const auth = firebase.auth();
    const provider = new firebase.auth.GoogleAuthProvider();
    const GUEST_KEY = 'bo_guest_mode';   // sessionStorage: aynı sekme oturumu misafir

    let mode = null;          // 'google' | 'guest' | null
    let currentUser = null;
    let onReady = null;       // app'in devam callback'i (hub/deep-link)
    let pushTimer = null;
    let wired = false;

    // Oyun-içi kayıtlar (Progress blob'undan AYRI; oyunların kendi localStorage anahtarları):
    // Zindan Okçusu bölüm/altın/ekipman + yüksek skorlar + seviye editörü kayıtları.
    // Bil ve Fethet sefer kaydı + Kelime Madeni 3D dünya kaydı (eğitsel seri Faz 0).
    // Google kullanıcısında users/{uid}/gameSaves altında senkronlanır.
    const GAME_SAVE_KEYS = ['zindan_okcusu_save_v1', 'tetris-best', 'egim-best', 'bk-highscore', 'menuLevels', 'menuLevelsPath', 'bilfethet_save', 'bilfethet_stats', 'kelimemadeni_save', 'kelimemadeni_stats', 'bilgimadenci_stats', 'matpatlatma_stats', 'kelimebalonu_stats', 'bilnet_score_queue', 'bilnet_meta'];
    const lastGameSave = {};   // key -> son buluta yazılan değer (gereksiz yazımı önler)
    let gsTimer = null;
    let gsWired = false;

    function cloudRef(uid) { return db.ref('users/' + uid + '/progress'); }
    function gameSavesRef(uid) { return db.ref('users/' + uid + '/gameSaves'); }

    // Oyun kayıtlarını buluta yansıt (yalnız değişen anahtarlar; debounced) — yalnız Google
    function pushGameSaves() {
        if (mode !== 'google' || !currentUser) return;
        const updates = {};
        for (const k of GAME_SAVE_KEYS) {
            let v = null;
            try { v = localStorage.getItem(k); } catch (e) {}
            const prev = (lastGameSave[k] === undefined) ? null : lastGameSave[k];
            if (v !== prev) { updates[k] = v; lastGameSave[k] = v; }   // null → Firebase anahtarı siler
        }
        if (!Object.keys(updates).length) return;
        try { gameSavesRef(currentUser.uid).update(updates); } catch (e) {}
    }
    function scheduleGameSavePush() { clearTimeout(gsTimer); gsTimer = setTimeout(pushGameSaves, 1000); }

    // Çıkış/misafir: yerel oyun kayıtlarını temizle (paylaşımlı cihazda başkasının kaydı görünmesin)
    function clearGameSaves() {
        for (const k of GAME_SAVE_KEYS) {
            try { localStorage.removeItem(k); } catch (e) {}
            lastGameSave[k] = null;
        }
    }

    // Oyunların localStorage yazımlarını yakala: iframe oyunları (Zindan) parent pencereye
    // 'storage' eventi yollar (anlık); aynı-pencere oyunları + kapanış için visibility/pagehide.
    function wireGameSaveSync() {
        if (gsWired) return;
        gsWired = true;
        window.addEventListener('storage', (e) => {
            if (e && e.key && GAME_SAVE_KEYS.indexOf(e.key) !== -1) scheduleGameSavePush();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') pushGameSaves();
        });
        window.addEventListener('pagehide', pushGameSaves);
    }

    // ── Buluta yaz (debounced) — yalnız Google modunda ──
    function pushProgress(data) {
        if (mode !== 'google' || !currentUser) return;
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
            try { cloudRef(currentUser.uid).set(data); } catch (e) {}
        }, 800);
    }

    // ── Google girişinde buluttan yükle; yereli EZ (cloud-only) ──
    async function loadCloudIntoLocal(uid) {
        let snap = null;
        try { snap = await cloudRef(uid).once('value'); } catch (e) {}
        const val = snap && snap.val();
        if (val) {
            Progress.setSyncHook(null);     // yüklerken buluta geri-yankı yapma
            Progress.replaceAll(val);
            Progress.setSyncHook(pushProgress);
        } else {
            // İlk kez giren hesap → 0'dan başla ve bulutu tohumla
            Progress.setSyncHook(pushProgress);
            Progress.resetAll();            // save → pushProgress → bulut seed
        }

        // ── Oyun-içi kayıtlar (Zindan vb.) ──
        let gsSnap = null;
        try { gsSnap = await gameSavesRef(uid).once('value'); } catch (e) {}
        const gs = (gsSnap && gsSnap.val()) || {};
        const seed = {};
        for (const k of GAME_SAVE_KEYS) {
            if (gs[k] != null) {
                // Bulutta var → yereli onunla değiştir (kaldığı yerden / başka cihazdan devam)
                try { localStorage.setItem(k, gs[k]); } catch (e) {}
                lastGameSave[k] = gs[k];
            } else {
                // Bulutta yok → mevcut yerel ilerlemeyi KORU ve bulutu tohumla (ilk giriş)
                let local = null;
                try { local = localStorage.getItem(k); } catch (e) {}
                if (local != null) { seed[k] = local; lastGameSave[k] = local; }
                else { lastGameSave[k] = null; }
            }
        }
        if (Object.keys(seed).length) { try { gameSavesRef(uid).update(seed); } catch (e) {} }
    }

    function applyGoogle(user) {
        mode = 'google';
        currentUser = user;
        hideLoginScreen();
        loadCloudIntoLocal(user.uid).then(() => {
            renderUserChip(user);
            if (onReady) onReady();
        });
    }

    function applyGuest() {
        mode = 'guest';
        currentUser = null;
        Progress.setSyncHook(null);
        Progress.resetAll();                // her misafir girişinde 0 yıldız
        clearGameSaves();                   // misafir: oyun kayıtları da efemer
        try { sessionStorage.setItem(GUEST_KEY, '1'); } catch (e) {}
        hideLoginScreen();
        renderUserChip(null);
        if (onReady) onReady();
    }

    function resumeGuest() {
        // Aynı sekme oturumunda yenileme: sıfırlama YAPMA (oturum içi yıldızlar korunur)
        mode = 'guest';
        currentUser = null;
        Progress.setSyncHook(null);
        hideLoginScreen();
        renderUserChip(null);
        if (onReady) onReady();
    }

    function init(readyCb) {
        onReady = readyCb;
        wireButtons();
        wireGameSaveSync();
        auth.onAuthStateChanged((user) => {
            if (user && !user.isAnonymous) {
                // Token yenilemesi vb. → aynı kullanıcıysa yeniden yükleme yapma
                // (oyun ortasında yerel ilerlemeyi ezmemek için kritik)
                if (mode === 'google' && currentUser && currentUser.uid === user.uid) return;
                applyGoogle(user);
            } else {
                let isGuest = false;
                try { isGuest = sessionStorage.getItem(GUEST_KEY) === '1'; } catch (e) {}
                if (isGuest) resumeGuest();
                else showLoginScreen();
            }
        });
    }

    // ── UI ──
    function $(id) { return document.getElementById(id); }

    function wireButtons() {
        if (wired) return;
        wired = true;
        $('login-google') && $('login-google').addEventListener('click', signInGoogle);
        $('login-guest') && $('login-guest').addEventListener('click', applyGuest);
    }

    function showLoginScreen() {
        hideError();
        $('login-screen') && $('login-screen').classList.remove('hidden');
        $('splash-screen') && $('splash-screen').classList.add('hidden');
        $('app') && $('app').classList.add('hidden');
    }
    function hideLoginScreen() {
        $('login-screen') && $('login-screen').classList.add('hidden');
    }

    function signInGoogle() {
        hideError();
        const btn = $('login-google');
        if (btn) btn.disabled = true;
        auth.signInWithPopup(provider)
            .catch((err) => {
                const code = err && err.code;
                if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
                    // kullanıcı vazgeçti — sessiz
                } else {
                    showError(err);
                }
            })
            .finally(() => { if (btn) btn.disabled = false; });
        // başarı → onAuthStateChanged → applyGoogle
    }

    function signOut() {
        try { sessionStorage.removeItem(GUEST_KEY); } catch (e) {}
        Progress.setSyncHook(null);
        Progress.resetAll();                // paylaşımlı cihaz: yereli temizle
        clearGameSaves();                   // oyun kayıtlarını da temizle
        const wasGoogle = (mode === 'google');
        mode = null; currentUser = null;
        if (wasGoogle) {
            auth.signOut().catch(() => {}); // → onAuthStateChanged(null) → showLoginScreen
        } else {
            showLoginScreen();
        }
    }

    // SVG ikon yardımcısı (innerHTML yok → güvenli)
    function svgIcon(d) {
        const ns = 'http://www.w3.org/2000/svg';
        const s = document.createElementNS(ns, 'svg');
        s.setAttribute('viewBox', '0 0 24 24');
        s.setAttribute('fill', 'currentColor');
        s.setAttribute('aria-hidden', 'true');
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', d);
        s.appendChild(p);
        return s;
    }

    // ── Hesap menüsü (aç/kapa) — mobilde de çıkış erişilebilir olsun diye ──
    function closeMenu() {
        const menu = document.querySelector('#user-chip .user-menu');
        if (menu) menu.classList.add('hidden');
        const tog = document.querySelector('#user-chip .user-toggle');
        if (tog) tog.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onDocClick, true);
        document.removeEventListener('keydown', onEscKey);
    }
    function onDocClick(e) {
        const chip = $('user-chip');
        if (chip && !chip.contains(e.target)) closeMenu();
    }
    function onEscKey(e) { if (e.key === 'Escape') closeMenu(); }
    function toggleMenu(e) {
        e.stopPropagation();
        const menu = document.querySelector('#user-chip .user-menu');
        const tog = document.querySelector('#user-chip .user-toggle');
        if (!menu) return;
        const willOpen = menu.classList.contains('hidden');
        menu.classList.toggle('hidden', !willOpen);
        if (tog) tog.setAttribute('aria-expanded', String(willOpen));
        if (willOpen) {
            document.addEventListener('click', onDocClick, true);
            document.addEventListener('keydown', onEscKey);
        } else {
            document.removeEventListener('click', onDocClick, true);
            document.removeEventListener('keydown', onEscKey);
        }
    }

    function renderUserChip(user) {
        const chip = $('user-chip');
        if (!chip) return;
        closeMenu();
        while (chip.firstChild) chip.removeChild(chip.firstChild);

        // Tek kompakt buton (avatar / kişi ikonu) → tıklayınca menü
        const tog = document.createElement('button');
        tog.className = 'user-toggle';
        tog.type = 'button';
        tog.title = user ? (user.displayName || 'Hesap') : 'Misafir';
        tog.setAttribute('aria-haspopup', 'true');
        tog.setAttribute('aria-expanded', 'false');
        tog.setAttribute('aria-label', 'Hesap menüsü');
        if (user && user.photoURL) {
            const img = document.createElement('img');
            img.className = 'user-avatar';
            img.src = user.photoURL;
            img.alt = '';
            img.referrerPolicy = 'no-referrer';   // Google foto bazen referrer'la 403 verir
            tog.appendChild(img);
        } else {
            tog.appendChild(svgIcon('M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'));
        }
        tog.addEventListener('click', toggleMenu);
        chip.appendChild(tog);

        // Açılır menü: ad (+ e-posta) + Çıkış yap
        const menu = document.createElement('div');
        menu.className = 'user-menu hidden';
        const nm = document.createElement('div');
        nm.className = 'user-menu-name';
        nm.textContent = user ? (user.displayName || 'Oyuncu') : 'Misafir';
        menu.appendChild(nm);
        if (user && user.email) {
            const em = document.createElement('div');
            em.className = 'user-menu-email';
            em.textContent = user.email;
            menu.appendChild(em);
        } else if (!user) {
            const hint = document.createElement('div');
            hint.className = 'user-menu-email';
            hint.textContent = 'Kayıt tutulmuyor';
            menu.appendChild(hint);
        }
        const out = document.createElement('button');
        out.className = 'user-menu-signout';
        out.type = 'button';
        out.appendChild(svgIcon('M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z'));
        const sl = document.createElement('span');
        sl.textContent = 'Çıkış yap';
        out.appendChild(sl);
        out.addEventListener('click', () => { closeMenu(); signOut(); });
        menu.appendChild(out);
        chip.appendChild(menu);
    }

    // ── Hata gösterimi ──
    function showError(err) {
        const box = $('login-error');
        if (!box) return;
        let msg = 'Giriş yapılamadı. Lütfen tekrar dene.';
        const code = err && err.code;
        if (code === 'auth/network-request-failed') msg = 'İnternet bağlantısı yok gibi görünüyor. Tekrar dene.';
        else if (code === 'auth/popup-blocked') msg = 'Açılır pencere engellendi. Tarayıcı iznini verip tekrar dene.';
        else if (code === 'auth/unauthorized-domain') msg = 'Bu site Google girişine henüz yetkili değil (yöneticiye bildir).';
        box.textContent = msg;
        box.classList.remove('hidden');
    }
    function hideError() {
        const box = $('login-error');
        if (box) { box.textContent = ''; box.classList.add('hidden'); }
    }

    return {
        init,
        signOut,
        getMode: () => mode,
        isGuest: () => mode === 'guest',
        getUser: () => currentUser,
        flushGameSaves: pushGameSaves,   // app.js oyundan çıkışta çağırır
    };
})();
