/* ============================================
   Depolama tohumu — tarayıcı UI'sı yerine (hızlı, deterministik). tests/smoke.spec.js ve
   tests/janitor.spec.js ortak kullanır; anahtarlar tek kaynaktan:
   - sessionStorage bo_guest_mode=1 → giriş kartı atlanır (js/auth.js resumeGuest)
   - localStorage oyun_bahcesi_progress → tüm kilitler öğretmen-izniyle açık; test canlı
     adminConfig'e ("auto"/"unlock") bağımlı değildir (js/progress.js)
   - localStorage oyun_bahcesi_lastResetToken → canlı resetToken tohumu silmesin (js/app.js applyAdminConfig)
   - localStorage bo_janitor_last=şimdi → js/janitor.js "bu cihaz az önce koştu" sayar ve
     CANLI RTDB'de silme yapmaz (cihaz başına 6 saat eşiği). Temizlikçinin kendisi
     tests/janitor.spec.js'te sahte db ile ayrıca test edilir.
   ============================================ */
'use strict';

const GUEST_KEY = 'bo_guest_mode';
const PROGRESS_KEY = 'oyun_bahcesi_progress';
const RESET_TOKEN_KEY = 'oyun_bahcesi_lastResetToken';
const JANITOR_LAST_KEY = 'bo_janitor_last';

/**
 * Bağlama (context) her sayfa yüklemesinden önce çalışan tohum betiğini ekler.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string[]} lockKeys  teacherUnlocks anahtarları: solo slug'lar + 'mp:<slug>'
 */
function seedGuest(context, lockKeys) {
    return context.addInitScript(({ guestKey, progressKey, resetKey, janitorKey, lockKeys }) => {
        const teacherUnlocks = Object.fromEntries(lockKeys.map((k) => [k, true]));
        const progress = { version: 1, games: {}, totalStars: 0, settings: { soundEnabled: true, teacherUnlocks } };
        try { sessionStorage.setItem(guestKey, '1'); } catch (e) { /* depolama kapalıysa giriş kartı görünür → test bunu yakalar */ }
        try {
            localStorage.setItem(progressKey, JSON.stringify(progress));
            localStorage.setItem(resetKey, String(Number.MAX_SAFE_INTEGER));
            localStorage.setItem(janitorKey, String(Date.now()));
        } catch (e) { /* aynı */ }
    }, { guestKey: GUEST_KEY, progressKey: PROGRESS_KEY, resetKey: RESET_TOKEN_KEY, janitorKey: JANITOR_LAST_KEY, lockKeys });
}

module.exports = { GUEST_KEY, PROGRESS_KEY, RESET_TOKEN_KEY, JANITOR_LAST_KEY, seedGuest };
