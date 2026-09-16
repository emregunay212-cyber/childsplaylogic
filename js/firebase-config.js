/* ============================================
   Firebase Configuration + BilnetBridge (iframe köprüsü, B6)
   --------------------------------------------
   SDK gstatic'ten yüklenir (index.html <head>, defer + SRI). Filtreli ağlarda (okul) engellenebilir;
   o durumda hub yine açılmalı: tek kişilik oyunlar yerel çalışır, giriş/bulut/online kapalı.
   window.FIREBASE_OK → auth.js / app.js / admin.js bu bayrağa bakar; db yoksa null kalır.

   Config bu dosyada TEK yerde durur (herkese açık istemci anahtarı; sır değil). Iframe oyunları
   (games/kelimelik, games/son-kart, games/ates-buz, games/hava-hokeyi) SDK'yı ve config'i kendileri
   YÜKLEMEZ: `window.parent.BilnetBridge` üzerinden hub'ın bağlantısını kullanır (aşağıda).
   ============================================ */
const firebaseConfig = {
    apiKey: "AIzaSyBFF2v3Rm0vwvwQwtApmXgjQa6DYM_HDAw",
    authDomain: "childsplaylogic.firebaseapp.com",
    databaseURL: "https://childsplaylogic-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "childsplaylogic",
    storageBucket: "childsplaylogic.firebasestorage.app",
    messagingSenderId: "27619900067",
    appId: "1:27619900067:web:bf0f3aa99670b6a9dfdd16"
};

// Yönetici hesabı (TEK KAYNAK): admin.js (panel girişi) ve auth.js (hub'daki panel bağlantısı)
// bu e-postayı karşılaştırır. RTDB kurallarında adminConfig yazma yetkisi de yalnız bu hesapta.
const ADMIN_EMAIL = 'admin@bilnetoyun.com';

let db = null;
window.FIREBASE_OK = false;
try {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK yüklenemedi — çevrimdışı mod (tek kişilik oyunlar açık).');
    } else {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        window.FIREBASE_OK = true;
    }
} catch (e) {
    db = null;
    console.error('Firebase başlatılamadı — çevrimdışı mod:', e);
}

/* ── BilnetBridge — hub'ın iframe oyunlarına TEK Firebase köprüsü (B6) ──
   Iframe tarafı: `const bridge = window.parent !== window && window.parent.BilnetBridge;`
   (çapraz-origin erişimi fırlatabilir → try/catch) → `const db = bridge ? await bridge.ready() : null`.
   - ready(): Promise<db|null>. SDK + config hazırsa hub'ın `firebase.database()` örneği; çevrimdışı /
     engelli (SRI uyuşmazlığı dahil) modda null. ASLA reddetmez. Firebase compat <head>'de `defer` ile
     bu dosyadan ÖNCE çalışır (ya da hiç çalışmaz); karar bu satırlara gelindiğinde bellidir, söz hemen
     çözülür. A9b tembel yükleme oyun dosyalarını kapsar, SDK'yı değil — köprü SDK'yı beklemez.
   - uid(): firebase.auth().currentUser uid'i ya da null (misafirde şimdilik null; B7 anonim auth ile dolar).
   - displayName(): Google adı (Auth.getUser) → lobi takma adı (localStorage mp_name) → 'Oyuncu'.
     Auth (js/auth.js) bu dosyadan SONRA yüklenir → çağrı anında bakılır, yükleme anında değil.
   - firebase / db: doğrudan erişim (ör. `firebase.database.ServerValue.TIMESTAMP`); db null olabilir.
   Bağımsız açılan iframe sayfasında (parent yok) online mod desteklenmez (Karar 6, 16 Eyl 2026). */
window.BilnetBridge = (function () {
    const sdk = (typeof firebase !== 'undefined') ? firebase : null;
    const NAME_MAX = 20;   // js/lobby.js takma ad girişi maxlength=20 ile aynı

    function ready() {
        return Promise.resolve(window.FIREBASE_OK && db ? db : null);
    }

    function uid() {
        try {
            const user = (sdk && window.FIREBASE_OK) ? sdk.auth().currentUser : null;
            return user && user.uid ? String(user.uid) : null;
        } catch (e) {
            return null;   // firebase-auth-compat yüklenmemiş olabilir (SRI/ağ): auth() fırlatır
        }
    }

    function displayName() {
        try {
            const user = (typeof Auth !== 'undefined' && Auth && typeof Auth.getUser === 'function') ? Auth.getUser() : null;
            if (user && user.displayName) return String(user.displayName).trim().slice(0, NAME_MAX) || 'Oyuncu';
        } catch (e) { /* Auth henüz yok ya da bozuk: misafir adına düş */ }
        try {
            const name = localStorage.getItem('mp_name');
            if (name && name.trim()) return name.trim().slice(0, NAME_MAX);
        } catch (e) { /* depolama kapalı */ }
        return 'Oyuncu';
    }

    return { firebase: sdk, db, ready, uid, displayName };
})();
