/* ============================================
   OYUN: Matematik Kafe — günlük hayat problemleri + numpad (Faz 2 / 4.5, Cafe World esinli)
   Eğitsel seri — bağımsız tek-dosya HTML oyunu, siteye iframe ile gömülür
   (bkz. games/matematik-kafe/index.html). Kayıt/istatistik window.storage
   köprüsüyle localStorage'a; Google girişte gameSaves bulut senkronu.
   Yıldız vermez (eğitsel seri kilitsiz).
   ============================================ */

const MatematikKafe = (() => {
    const id = 'matematik-kafe';
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
        iframe.src = 'games/matematik-kafe/index.html?v=1';
        iframe.className = 'mk-iframe';
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
