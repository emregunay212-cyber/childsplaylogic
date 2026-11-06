/* OYUN: Yerçekimi Yolculuğu — gezegenlerin çekiminden kaçarak uzay istasyonuna ulaş, 6 seviye (Unity WebGL)
   Bağımsız Unity WebGL derlemesi (games/yercekimi-yolculugu/index.html), iframe ile gömülür.
   Unity kaynak projesi depoda değil; derleme çıktısı games/yercekimi-yolculugu/Build/ altında.
   Yıldız vermez (kilitsiz). */

const YercekimiYolculugu = (() => {
    const id = 'yercekimi-yolculugu';
    const levels = [{}];
    let iframe = null, container = null;
    function clear(el) { if (el) while (el.firstChild) el.removeChild(el.firstChild); }
    function focusGame() { try { iframe.contentWindow.focus(); } catch (e) {} }
    function init(gameArea) {
        container = gameArea;
        clear(gameArea);
        iframe = document.createElement('iframe');
        iframe.src = 'games/yercekimi-yolculugu/index.html';
        iframe.className = 'yy-iframe';
        iframe.title = 'Yerçekimi Yolculuğu';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);
        // Ok tuşları oyuna gitsin: iframe yüklenince ve tıklanınca odak içeri.
        iframe.addEventListener('load', focusGame);
        iframe.addEventListener('click', focusGame);
    }
    function destroy() {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        iframe = null; clear(container); container = null;
    }
    return { id, levels, init, destroy };
})();
