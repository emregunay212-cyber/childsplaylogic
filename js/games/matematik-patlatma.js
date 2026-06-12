/* ============================================
   OYUN: Matematik Patlatma
   Diamond Dash / Bejeweled Blitz tarzı sayı-zinciri patlatma
   (Eğitsel seri Faz 1 / 4.2). Hedef üstte ("Toplamı 12 yap"),
   komşu taşlar sürüklenerek zincir kurulur; toplam/fark/çarpım
   hedefe TAM ulaşınca taşlar patlar, üstten yenileri düşer.
   Zincir puanı = taş² × 10 (uzun zincir teşviki), 60 sn skor yarışı,
   4 tier (Etek toplama 5-10 → Zirve çarpım hedefleri).
   Tasarım: EGITSEL-OYUN-PLANI.md §4.2 — çözümsüzlük kontrolü dahil.
   Bağımsız tek-dosya HTML oyunu olduğu için siteye iframe ile gömülür
   (bkz. games/matematik-patlatma/index.html). İstatistik + skor kuyruğu
   window.storage köprüsüyle localStorage'a; Google girişte gameSaves
   bulut senkronu. Yıldız vermez (eğitsel seri kilitsiz).
   ============================================ */

const MatematikPatlatma = (() => {
    const id = 'matematik-patlatma';
    const levels = [{}];

    let iframe = null;
    let container = null;

    function clear(el) {
        if (el) while (el.firstChild) el.removeChild(el.firstChild);
    }

    // GameEngine.startGame(game, level) -> game.init(gameArea, level, callbacks)
    function init(gameArea, level, callbacks) {
        container = gameArea;
        clear(gameArea);

        iframe = document.createElement('iframe');
        iframe.src = 'games/matematik-patlatma/index.html?v=1';
        iframe.className = 'mtp-iframe';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);

        // iframe yüklenince ve tıklanınca içeriğine odaklan — klavye (P/Esc)
        // kısayollarının tıklamadan da çalışması için.
        iframe.addEventListener('load', () => { try { iframe.contentWindow.focus(); } catch (e) {} });
        iframe.addEventListener('click', () => { try { iframe.contentWindow.focus(); } catch (e) {} });
    }

    function destroy() {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        iframe = null;
        clear(container);
        container = null;
    }

    return { id, levels, init, destroy };
})();
