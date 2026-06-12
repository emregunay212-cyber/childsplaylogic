/* ============================================
   BİLNET META KATMAN v1 (EGITSEL-OYUN-PLANI §3.1-3.2 + §6)
   Jeton sistemi + günlük giriş serisi + eğitsel profil paneli.

   MİMARİ KARARI (Firestore ↔ RTDB): Ana doküman §6.2 Firestore şeması önerir;
   portal RTDB kullanır. v1 İSTEMCİ-TARAFI çalışır ve mevcut gameSaves bulut
   senkronundan (js/auth.js) yararlanır — yeni veritabanı kuralı/deploy
   GEREKTİRMEZ. Oyunlar skorları bilnet_score_queue'ya yazar (BilnetBridge);
   bu modül kuyruğu okuyup jetona çevirir. Sınıf ligi/turnuva (v2) RTDB'ye
   sunucu-doğrulamalı yazım isteyecek — o aşamada database.rules.json güncellenir.

   Kurallar (§3.1-3.2):
   - jeton = floor(skor / 100), GÜNLÜK TAVAN 50 (oyun kazancı)
   - Günlük ilk giriş +5; seri bonusu: 3 gün +10, 5 gün +15, 7 gün +25
   - Seri kırılınca suçlayıcı dil YOK ("Yeni seri başlat! 💪")
   ============================================ */

const BilnetMeta = (() => {
    const META_KEY = 'bilnet_meta';
    const QUEUE_KEY = 'bilnet_score_queue';
    const DAILY_CAP = 50;
    const LOGIN_BONUS = 5;
    const STREAK_BONUS = { 3: 10, 5: 15, 7: 25 };

    // Eğitsel oyunların kalıcı istatistik anahtarları (profil panelinde gösterilir)
    const GAME_STATS = [
        { key: 'bilgimadenci_stats',  name: 'Bilgi Madencisi',    icon: '⛏️', line: s => `${s.correct || 0} doğru işlem` },
        { key: 'matpatlatma_stats',   name: 'Matematik Patlatma', icon: '🧨', line: s => `${s.chains || 0} zincir · en uzun ${s.longest || 0} taş` },
        { key: 'kelimebalonu_stats',  name: 'Kelime Balonu',      icon: '🎈', line: s => `${s.words || 0} İngilizce kelime` },
        { key: 'bilfethet_stats',     name: 'Bil ve Fethet',      icon: '🌍', line: s => `${s.conquests || 0} tam fetih · ${s.correct || 0} doğru` },
        { key: 'kelimemadeni_stats',  name: 'Kelime Madeni 3D',   icon: '💎', line: s => `${s.solved || 0} kelime sorusu çözüldü` },
    ];

    let M = { coins: 0, dayKey: '', coinsToday: 0, streak: 0, bestStreak: 0, lastDay: '', lastTs: 0,
              badges: [], matPoints: 0, seenGames: [] };
    let saveTimer = null;

    /* ── ROZET KATALOĞU (meta v2 — EGITSEL-OYUN-PLANI §3.3) ── */
    const MAT_GAMES = ['bilgi-madencisi', 'matematik-patlatma', 'matematik-kafe'];
    const BADGES = [
        { id: 'ilk-adim',     e: '🥇', ad: 'İlk Adım',          k: 'İlk oyununu tamamla',
          test: () => M.seenGames.length >= 1 },
        { id: 'seri-ustasi',  e: '🔥', ad: 'Seri Ustası',       k: '7 günlük giriş serisi',
          test: () => M.bestStreak >= 7 },
        { id: 'mat-kasifi',   e: '🧮', ad: 'Matematik Kâşifi',  k: 'Matematik oyunlarında 1000 toplam puan',
          test: () => M.matPoints >= 1000 },
        { id: 'kelime-avcisi',e: '📚', ad: 'Kelime Avcısı',     k: '100 kelime eşleştir/öğren',
          test: () => {
              let n = 0;
              try { n += (JSON.parse(localStorage.getItem('kelimebalonu_stats') || '{}').words || 0); } catch (e) {}
              try { n += (JSON.parse(localStorage.getItem('kelimemadeni_stats') || '{}').solved || 0); } catch (e) {}
              return n >= 100;
          } },
        { id: 'genc-bilimci', e: '🔬', ad: 'Genç Bilimci',      k: "Bilim Dedektifi'nde 10 vaka çöz",
          test: () => { try { return (JSON.parse(localStorage.getItem('bilimdedektifi_stats') || '{}').cases || 0) >= 10; } catch (e) { return false; } } },
        { id: 'zirve-fatihi', e: '🏔️', ad: 'Zirve Fatihi',      k: 'Bir oyunda Zirve seviyesinde skor yap',
          test: () => ['bilgimadenci_stats', 'matpatlatma_stats', 'kelimebalonu_stats', 'matkafe_stats']
              .some(k => { try { const s = JSON.parse(localStorage.getItem(k) || '{}'); return s.best && (s.best[4] || 0) > 0; } catch (e) { return false; } }) },
        { id: 'nisanci',      e: '🎯', ad: 'Keskin Nişancı',    k: 'Bir oturumda %100 doğruluk (en az 10 soru)',
          test: null /* kuyruk kaydından işaretlenir */ },
        { id: 'koleksiyoncu', e: '🌟', ad: 'Koleksiyoncu',      k: '5 farklı oyunda skor kaydet',
          test: () => M.seenGames.length >= 5 },
        { id: 'sezon-kahramani', e: '🏅', ad: 'Sezon Kahramanı', k: 'Bilgi Takımı sezon kitabını bitir',
          test: () => { try { return (JSON.parse(localStorage.getItem('bilgitakimi_stats') || '{}').seasonsCompleted || 0) >= 1; } catch (e) { return false; } } },
    ];
    function awardBadge(id){
        if (M.badges.includes(id)) return;
        const b = BADGES.find(x => x.id === id);
        if (!b) return;
        M.badges.push(id);
        save();
        toast(`${b.e} ROZET KAZANDIN: ${b.ad}!`);
    }
    function checkBadges(){
        for (const b of BADGES){
            if (M.badges.includes(b.id) || !b.test) continue;
            try { if (b.test()) awardBadge(b.id); } catch (e) {}
        }
    }

    function todayKey(d) {
        const x = d || new Date();
        return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    }
    function yesterdayKey() {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return todayKey(d);
    }
    function load() {
        try {
            const raw = localStorage.getItem(META_KEY);
            if (raw) M = Object.assign(M, JSON.parse(raw));
        } catch (e) {}
    }
    function save() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try { localStorage.setItem(META_KEY, JSON.stringify(M)); } catch (e) {}
        }, 150);
    }
    function rollDay() {
        const t = todayKey();
        if (M.dayKey !== t) { M.dayKey = t; M.coinsToday = 0; }
    }

    // ── Günlük giriş + seri (§3.2) ──
    function dailyLogin() {
        const t = todayKey();
        if (M.lastDay === t) return;
        const wasYesterday = M.lastDay === yesterdayKey();
        const broke = M.lastDay && !wasYesterday && M.streak > 0;
        M.streak = wasYesterday ? M.streak + 1 : 1;
        if (M.streak > M.bestStreak) M.bestStreak = M.streak;
        M.lastDay = t;
        let earned = LOGIN_BONUS;
        let msg = `🌞 Günaydın! Günlük giriş +${LOGIN_BONUS} 💎`;
        const bonus = STREAK_BONUS[M.streak];
        if (bonus) { earned += bonus; msg = `🔥 ${M.streak} günlük seri! +${LOGIN_BONUS + bonus} 💎`; }
        else if (M.streak > 1) msg = `🔥 Seri ${M.streak}. gün! +${LOGIN_BONUS} 💎`;
        else if (broke) msg = `🌞 Yeni seri başlat! 💪 +${LOGIN_BONUS} 💎`;   // suçlayıcı dil yok
        M.coins += earned;        // giriş bonusu tavandan bağımsız (sınırlı zaten)
        save();
        toast(msg);
        checkBadges();            // seri rozeti (7 gün) burada düşebilir
    }

    // ── Skor kuyruğu → jeton (§3.1: floor(skor/100), günlük tavan 50) ──
    function processQueue() {
        rollDay();
        let q = [];
        try { q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) {}
        let earned = 0, capped = false;
        for (const rec of q) {
            if (!rec || !rec.ts || rec.ts <= M.lastTs) continue;
            M.lastTs = Math.max(M.lastTs, rec.ts);
            // rozet ham verileri (v2): oynanan oyunlar, matematik puanı, keskin nişancı
            if (rec.gameId && !M.seenGames.includes(rec.gameId)) M.seenGames.push(rec.gameId);
            if (MAT_GAMES.includes(rec.gameId)) M.matPoints += (rec.score || 0);
            const st = rec.stats || {};
            if ((st.correct || 0) >= 10 && (st.wrong || 0) === 0) awardBadge('nisanci');
            let j = Math.floor((rec.score || 0) / 100);
            if (j <= 0) continue;
            const room = DAILY_CAP - M.coinsToday;
            if (room <= 0) { capped = true; continue; }
            if (j > room) { j = room; capped = true; }
            M.coins += j; M.coinsToday += j; earned += j;
        }
        checkBadges();
        if (earned > 0) {
            save();
            toast(`💎 +${earned} jeton kazandın!` + (capped ? ' (günlük tavan doldu — yarın yine kazan!)' : ''));
        } else if (capped) {
            save();
        }
        refreshChip();
    }

    // ── UI ──
    function refreshChip() {
        const el = document.getElementById('total-coins');
        if (el) el.textContent = M.coins;
    }
    let toastT = null;
    function toast(msg) {
        let t = document.getElementById('meta-toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastT);
        toastT = setTimeout(() => t.classList.remove('show'), 3200);
    }
    function openPanel() {
        const ov = document.getElementById('meta-panel');
        if (!ov) return;
        document.getElementById('mp-coins').textContent = M.coins;
        document.getElementById('mp-today').textContent = M.coinsToday + ' / ' + DAILY_CAP;
        document.getElementById('mp-streak').textContent = M.streak + ' gün' + (M.bestStreak > M.streak ? ` (rekor ${M.bestStreak})` : '');
        // eğitsel oyun istatistikleri
        const list = document.getElementById('mp-games');
        list.innerHTML = '';
        for (const g of GAME_STATS) {
            let s = null;
            try { s = JSON.parse(localStorage.getItem(g.key) || 'null'); } catch (e) {}
            if (!s) continue;
            const best = s.best ? Math.max(...Object.values(s.best).map(Number)) : 0;
            const row = document.createElement('div');
            row.className = 'mp-row';
            row.innerHTML = `<span class="mp-ic">${g.icon}</span><span class="mp-nm">${g.name}</span>` +
                `<span class="mp-ln">${g.line(s)}${best ? ` · rekor ${best}` : ''}</span>`;
            list.appendChild(row);
        }
        if (!list.children.length) list.innerHTML = '<div class="mp-row mp-empty">Eğitsel oyunları oynadıkça istatistiklerin burada birikecek! 🎓</div>';
        // rozetler (v2)
        const bl = document.getElementById('mp-badges');
        if (bl) {
            bl.innerHTML = BADGES.map(b => {
                const on = M.badges.includes(b.id);
                return `<div class="mp-badge${on ? ' on' : ''}" title="${b.k}"><span>${on ? b.e : '🔒'}</span><small>${b.ad}</small></div>`;
            }).join('');
        }
        ov.classList.add('show');
    }
    function closePanel() {
        const ov = document.getElementById('meta-panel');
        if (ov) ov.classList.remove('show');
    }

    function init() {
        load();
        rollDay();
        dailyLogin();
        processQueue();
        refreshChip();
        const chip = document.getElementById('coin-counter');
        if (chip) chip.addEventListener('click', openPanel);
        const closeBtn = document.getElementById('mp-close');
        if (closeBtn) closeBtn.addEventListener('click', closePanel);
        const ov = document.getElementById('meta-panel');
        if (ov) ov.addEventListener('click', e => { if (e.target === ov) closePanel(); });
        // iframe oyunları kuyruğa yazınca parent'a storage eventi düşer → anında işle
        window.addEventListener('storage', e => {
            if (e && e.key === QUEUE_KEY) processQueue();
        });
        // güvence: oyundan dönüşte ve aralıklı tarama
        document.addEventListener('visibilitychange', () => { if (!document.hidden) processQueue(); });
        setInterval(processQueue, 20000);
    }

    return { init, processQueue, openPanel, _debug: () => M };
})();

document.addEventListener('DOMContentLoaded', BilnetMeta.init);
if (document.readyState !== 'loading') BilnetMeta.init();
