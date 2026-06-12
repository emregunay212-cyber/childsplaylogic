/* ============================================
   OYUN: Bilgi Madencisi
   Gold Miner tarzı soru-cevap madenciliği (Eğitsel seri Faz 1 / 4.1).
   Soru üstte, 4 cevap taşı yerin altında — kancayı doğru taşa bırak!
   Yanlış taş ağırdır (zaman cezası), combo ×2'ye kadar, dinamit 5 doğruda.
   4 zorluk: Etek / Yamaç / Tırmanış / Zirve. Tasarım: EGITSEL-OYUN-PLANI.md §4.1.
   Bağımsız tek-dosya HTML oyunu olduğu için siteye iframe ile gömülür
   (bkz. games/bilgi-madencisi/index.html). İstatistik + skor kuyruğu
   window.storage köprüsüyle localStorage'a yazılır; Google girişte
   gameSaves bulut senkronu. Yıldız vermez (eğitsel seri kilitsiz).
   ============================================ */

const BilgiMadencisi = (() => {
    const id = 'bilgi-madencisi';
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
        iframe.src = 'games/bilgi-madencisi/index.html?v=1';
        iframe.className = 'bm-iframe';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);

        // iframe yüklenince ve tıklanınca içeriğine odaklan — klavye (BOŞLUK/P)
        // kontrollerinin tıklamadan da çalışması için.
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
