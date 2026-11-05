/* OYUN: Lingo — ilk harfi verilen 5 harfli kelimeyi 5 denemede bul (tek oyuncu / 2 takım)
   Bağımsız tek-dosya HTML oyunu (games/lingo/index.html + game.js, EduKit), iframe ile gömülür.
   Kayıt tutmaz (localStorage anahtarı yok). Yıldız vermez (eğitsel seri kilitsiz). */

const Lingo = (() => {
    const id = 'lingo';
    const levels = [{}];
    let iframe = null, container = null;
    function clear(el){ if (el) while (el.firstChild) el.removeChild(el.firstChild); }
    function init(gameArea, level, callbacks) {
        container = gameArea;
        clear(gameArea);
        iframe = document.createElement('iframe');
        iframe.src = 'games/lingo/index.html';
        iframe.className = 'lingo-iframe';
        iframe.title = 'Lingo';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);
        iframe.addEventListener('load', () => { try { iframe.contentWindow.focus(); } catch (e) {} });
        iframe.addEventListener('click', () => { try { iframe.contentWindow.focus(); } catch (e) {} });
    }
    function destroy() {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        iframe = null; clear(container); container = null;
    }
    return { id, levels, init, destroy };
})();
