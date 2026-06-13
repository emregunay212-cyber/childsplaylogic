/* OYUN: Sayı Ninja — kurala uyanı kes (Faz 5 / 4.14)
   Eğitsel seri — bağımsız tek-dosya HTML oyunu (games/sayi-ninja/index.html),
   iframe ile gömülür; kayıt window.storage → localStorage + gameSaves senkronu.
   Yıldız vermez (eğitsel seri kilitsiz). */

const SayiNinja = (() => {
    const id = 'sayi-ninja';
    const levels = [{}];
    let iframe = null, container = null;
    function clear(el){ if (el) while (el.firstChild) el.removeChild(el.firstChild); }
    function init(gameArea, level, callbacks) {
        container = gameArea;
        clear(gameArea);
        iframe = document.createElement('iframe');
        iframe.src = 'games/sayi-ninja/index.html?v=1';
        iframe.className = 'sn-iframe';
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
