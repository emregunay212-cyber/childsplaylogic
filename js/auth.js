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

    function cloudRef(uid) { return db.ref('users/' + uid + '/progress'); }

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
        const wasGoogle = (mode === 'google');
        mode = null; currentUser = null;
        if (wasGoogle) {
            auth.signOut().catch(() => {}); // → onAuthStateChanged(null) → showLoginScreen
        } else {
            showLoginScreen();
        }
    }

    function renderUserChip(user) {
        const chip = $('user-chip');
        if (!chip) return;
        while (chip.firstChild) chip.removeChild(chip.firstChild);
        if (user) {
            if (user.photoURL) {
                const img = document.createElement('img');
                img.className = 'user-avatar';
                img.src = user.photoURL;
                img.alt = '';
                img.referrerPolicy = 'no-referrer';   // Google foto bazen referrer'la 403 verir
                chip.appendChild(img);
            }
            const name = document.createElement('span');
            name.className = 'user-name';
            name.textContent = user.displayName || 'Oyuncu';
            chip.appendChild(name);
        } else {
            const badge = document.createElement('span');
            badge.className = 'user-name user-guest';
            badge.textContent = 'Misafir';
            chip.appendChild(badge);
        }
        const out = document.createElement('button');
        out.className = 'user-signout';
        out.type = 'button';
        out.title = 'Çıkış yap';
        out.setAttribute('aria-label', 'Çıkış yap');
        out.textContent = 'Çıkış';
        out.addEventListener('click', signOut);
        chip.appendChild(out);
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
    };
})();
