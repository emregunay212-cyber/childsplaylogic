/* ============================================
   Firebase Configuration
   --------------------------------------------
   SDK gstatic'ten yüklenir (index.html <head>). Filtreli ağlarda (okul) engellenebilir;
   o durumda hub yine açılmalı: tek kişilik oyunlar yerel çalışır, giriş/bulut/online kapalı.
   window.FIREBASE_OK → auth.js / app.js / admin.js bu bayrağa bakar; db yoksa null kalır.
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
