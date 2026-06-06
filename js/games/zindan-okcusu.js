/* ============================================
   OYUN: Zindan Okçusu
   Archero / Survivor.io tarzı top-down (kuşbakışı) roguelike
   arena okçu oyunu. Bağımsız tek-dosya HTML oyunu olduğu için
   siteye iframe ile gömülür (bkz. games/zindan-okcusu/index.html).
   Kayıt (altın / ekipman / bölüm ilerlemesi) oradaki window.storage
   köprüsü üzerinden tarayıcının localStorage'ına yazılır.
   Tek oyunculu: kendi skorunu/ilerlemesini yönetir, yıldız vermez.
   ============================================ */

const ZindanOkcusu = (() => {
    const id = 'zindan-okcusu';
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
        iframe.src = 'games/zindan-okcusu/index.html?v=2';
        iframe.className = 'zo-iframe';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);

        // iframe yüklenince ve tıklanınca içeriğine odaklan — klavye (WASD/P/Esc)
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
