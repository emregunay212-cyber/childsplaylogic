/* ============================================
   OYUN: Bilgi Takımı — görev döngüsü + karakter koleksiyonu (Faz 2 / 4.6, sosyalsiz Mafia Wars)
   Eğitsel seri — bağımsız tek-dosya HTML oyunu, siteye iframe ile gömülür
   (bkz. games/bilgi-takimi/index.html). Kayıt/istatistik window.storage
   köprüsüyle localStorage'a; Google girişte gameSaves bulut senkronu.
   Yıldız vermez (eğitsel seri kilitsiz).
   ============================================ */

const BilgiTakimi = (() => {
    const id = 'bilgi-takimi';
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
        iframe.src = 'games/bilgi-takimi/index.html?v=1';
        iframe.className = 'bt-iframe';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);

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
