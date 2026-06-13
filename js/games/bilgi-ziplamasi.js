/* OYUN: Bilgi Zıplaması — soru platformlu sonsuz tırmanış (Faz 5 / 4.16)
   Eğitsel seri — bağımsız tek-dosya HTML oyunu (games/bilgi-ziplamasi/index.html),
   iframe ile gömülür; kayıt window.storage → localStorage + gameSaves senkronu.
   Yıldız vermez (eğitsel seri kilitsiz). */

const BilgiZiplamasi = (() => {
    const id = 'bilgi-ziplamasi';
    const levels = [{}];
    let iframe = null, container = null;
    function clear(el){ if (el) while (el.firstChild) el.removeChild(el.firstChild); }
    function init(gameArea, level, callbacks) {
        container = gameArea;
        clear(gameArea);
        iframe = document.createElement('iframe');
        iframe.src = 'games/bilgi-ziplamasi/index.html?v=1';
        iframe.className = 'bz-iframe';
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
