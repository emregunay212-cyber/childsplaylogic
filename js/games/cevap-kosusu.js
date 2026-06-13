/* OYUN: Cevap Koşusu — pseudo-3D sonsuz koşucu + yol ayrımı soruları (Faz 6 / 4.21)
   Eğitsel seri — bağımsız tek-dosya HTML oyunu (games/cevap-kosusu/index.html),
   iframe ile gömülür; kayıt window.storage → localStorage + gameSaves senkronu.
   Yıldız vermez (eğitsel seri kilitsiz). */

const CevapKosusu = (() => {
    const id = 'cevap-kosusu';
    const levels = [{}];
    let iframe = null, container = null;
    function clear(el){ if (el) while (el.firstChild) el.removeChild(el.firstChild); }
    function init(gameArea, level, callbacks) {
        container = gameArea;
        clear(gameArea);
        iframe = document.createElement('iframe');
        iframe.src = 'games/cevap-kosusu/index.html?v=1';
        iframe.className = 'ck-iframe';
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
