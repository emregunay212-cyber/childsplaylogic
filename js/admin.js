/* ============================================
   BilnetOyun - Admin Paneli (Faz 1: merkezi kontrol)
   - Firebase Auth ile giriş; /adminConfig'i okur/yazar
   - Kilitler + global sıfırlama + ses merkezi; istatistik = bu cihaz
   ============================================ */
(function () {
    const auth = firebase.auth();
    const cfgRef = db.ref('adminConfig');
    // adminConfig'e YAZMA yetkisi RTDB kurallarında yalnızca bu e-postaya verili
    // (database.rules.json). Başka hesapla panel açılırsa her kayıt PERMISSION_DENIED verir.
    const ADMIN_EMAIL = 'admin@bilnetoyun.com';
    let cfg = {};

    // ── küçük DOM yardımcısı (innerHTML yok → XSS-güvenli) ──
    function el(tag, attrs, ...kids) {
        const n = document.createElement(tag);
        if (attrs) {
            for (const k in attrs) {
                if (k === 'class') n.className = attrs[k];
                else if (k === 'text') n.textContent = attrs[k];
                else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
                else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
            }
        }
        kids.flat().forEach(c => { if (c == null) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return n;
    }

    function $(id) { return document.getElementById(id); }

    let toastT;
    function toast(msg, kind) {
        const t = $('toast');
        t.textContent = msg;
        t.className = 'toast show ' + (kind || '');
        clearTimeout(toastT);
        toastT = setTimeout(() => { t.className = 'toast ' + (kind || ''); }, 2400);
    }

    function fbErr(e) { return (e && (e.code || e.message)) || 'bilinmeyen hata'; }

    // ── İstatistik (bu cihazın localStorage'ı) ──
    function readProgress() {
        try { return JSON.parse(localStorage.getItem('oyun_bahcesi_progress')) || {}; }
        catch (e) { return {}; }
    }
    function renderStats() {
        const data = readProgress();
        const body = $('stats-body');
        body.textContent = '';
        body.appendChild(el('div', { class: 'stat-row' },
            el('div', { class: 'stat' },
                el('div', { class: 'n', text: String(data.totalStars || 0) }),
                el('div', { class: 'l', text: 'Toplam yıldız (bu cihaz)' })
            )
        ));
        const games = data.games || {};
        const ids = Object.keys(games).filter(id => (games[id].totalStars || 0) > 0)
            .sort((a, b) => (games[b].totalStars || 0) - (games[a].totalStars || 0));
        if (!ids.length) {
            body.appendChild(el('div', { class: 'per-game' }, el('div', { class: 'empty', text: 'Bu cihazda henüz yıldız kazanılmamış.' })));
            return;
        }
        const grid = el('div', { class: 'per-game' });
        ids.forEach(id => {
            grid.appendChild(el('div', { class: 'pg-name', text: (TR.games[id] || id) }));
            grid.appendChild(el('div', { class: 'pg-stars', text: (games[id].totalStars || 0) + ' yıldız' }));
        });
        body.appendChild(grid);
    }

    // ── Kilit yönetimi ──
    function lockStateFor(key) { return (cfg.locks && cfg.locks[key]) || 'auto'; }

    function segBtn(label, val, cls, state, key) {
        return el('button', {
            class: cls + (state === val ? ' active' : ''),
            text: label,
            onclick: () => setLock(key, val)
        });
    }

    function renderLocks() {
        const list = $('lock-list');
        list.textContent = '';
        LOCK_CATALOG.forEach(g => {
            const state = lockStateFor(g.key);
            const nameWrap = el('div', { class: 'lr-name' }, (TR.games[g.id] || g.id));
            if (g.type === 'online') nameWrap.appendChild(el('span', { class: 'lr-tag', text: 'Online' }));
            const seg = el('div', { class: 'seg' },
                segBtn('Otomatik', 'auto', 'on-auto', state, g.key),
                segBtn('Açık', 'unlock', 'on-unlock', state, g.key),
                segBtn('Kilit', 'lock', 'on-lock', state, g.key)
            );
            list.appendChild(el('div', { class: 'lock-row' },
                nameWrap,
                el('div', { class: 'lr-th', text: g.stars + ' yıldız' }),
                seg
            ));
        });
    }

    function setLock(key, val) {
        const ref = cfgRef.child('locks').child(key);
        const p = (val === 'auto') ? ref.remove() : ref.set(val);
        p.then(() => toast('Kaydedildi.', 'ok')).catch(e => toast('Hata: ' + fbErr(e), 'bad'));
    }

    function bulkLocks(val) {
        if (val === 'auto') {
            cfgRef.child('locks').remove()
                .then(() => toast('Tüm override\'lar temizlendi (otomatik).', 'ok'))
                .catch(e => toast('Hata: ' + fbErr(e), 'bad'));
            return;
        }
        const updates = {};
        LOCK_CATALOG.forEach(g => { updates[g.key] = val; });
        cfgRef.child('locks').set(updates)
            .then(() => toast(val === 'unlock' ? 'Tüm oyunlar açıldı.' : 'Tüm oyunlar kilitlendi.', 'ok'))
            .catch(e => toast('Hata: ' + fbErr(e), 'bad'));
    }

    // ── Global sıfırlama ──
    function doReset() {
        if (!confirm('TÜM cihazlardaki ilerleme (yıldızlar) bir sonraki açılışta sıfırlanacak. Bu geri alınamaz. Emin misiniz?')) return;
        cfgRef.child('resetToken').set(firebase.database.ServerValue.TIMESTAMP)
            .then(() => toast('Sıfırlama sinyali tüm cihazlara gönderildi.', 'ok'))
            .catch(e => toast('Hata: ' + fbErr(e), 'bad'));
    }

    // ── Ses ──
    function renderSound() {
        const cur = cfg.sound || 'auto';
        ['auto', 'on', 'off'].forEach(v => {
            const b = $('snd-' + v);
            if (b) b.classList.toggle('active', cur === v);
        });
    }
    function setSound(val) {
        const ref = cfgRef.child('sound');
        const p = (val === 'auto') ? ref.remove() : ref.set(val);
        p.then(() => toast('Ses ayarı kaydedildi.', 'ok')).catch(e => toast('Hata: ' + fbErr(e), 'bad'));
    }

    // ── Auth ──
    function mapAuthErr(e) {
        const c = e && e.code;
        if (c === 'auth/invalid-email') return 'Geçersiz e-posta.';
        if (c === 'auth/missing-password') return 'Şifre girin.';
        if (c === 'auth/wrong-password' || c === 'auth/invalid-credential') return 'E-posta veya şifre hatalı.';
        if (c === 'auth/user-not-found') return 'Kullanıcı bulunamadı.';
        if (c === 'auth/too-many-requests') return 'Çok fazla deneme. Biraz sonra tekrar deneyin.';
        if (c === 'auth/operation-not-allowed') return 'Email/Password girişi Firebase konsolunda etkin değil.';
        return 'Giriş hatası: ' + fbErr(e);
    }

    function subscribeCfg() {
        cfgRef.on('value', (snap) => {
            cfg = snap.val() || {};
            renderLocks();
            renderSound();
        });
    }

    function wire() {
        $('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            $('login-err').textContent = '';
            const email = $('email').value.trim();
            const pw = $('pw').value;
            auth.signInWithEmailAndPassword(email, pw).catch(err => { $('login-err').textContent = mapAuthErr(err); });
        });
        $('logout').addEventListener('click', () => auth.signOut());
        $('btn-reset').addEventListener('click', doReset);
        $('bulk-unlock').addEventListener('click', () => bulkLocks('unlock'));
        $('bulk-lock').addEventListener('click', () => bulkLocks('lock'));
        $('bulk-auto').addEventListener('click', () => bulkLocks('auto'));
        $('snd-auto').addEventListener('click', () => setSound('auto'));
        $('snd-on').addEventListener('click', () => setSound('on'));
        $('snd-off').addEventListener('click', () => setSound('off'));

        auth.onAuthStateChanged((user) => {
            if (user && user.email === ADMIN_EMAIL) {
                $('login-view').classList.add('hidden');
                $('panel-view').classList.remove('hidden');
                $('who').textContent = user.email || '';
                $('login-err').textContent = '';
                renderStats();
                subscribeCfg();
            } else {
                // Giriş yok VEYA yönetici hesabı değil → paneli açma (aksi halde her
                // kayıt PERMISSION_DENIED verir). Yönetici e-postasıyla giriş gerekir.
                $('panel-view').classList.add('hidden');
                $('login-view').classList.remove('hidden');
                if (user) $('login-err').textContent = 'Bu hesap (' + (user.email || 'bilinmiyor') + ') yönetici değil. Lütfen ' + ADMIN_EMAIL + ' ile giriş yapın.';
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
    else wire();
})();
