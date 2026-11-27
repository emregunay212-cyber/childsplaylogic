/* OYUN: Obur Delik — şehirde büyüyen aç delik (iframe: games/obur-delik/index.html)
   Bölüm seçimi oyunun İÇİNDE (hub'a levels: 1). Kurallar games/obur-delik/core.js (saf),
   bölüm dengesi: npm run test:obur. Yıldız vermez (kilitsiz); bölüm yıldızları oyunun kendi kaydında (obur_ilerleme). */

const OburDelik = (() => {
    const id = 'obur-delik';
    const levels = [{}];
    let iframe = null, container = null;
    function clear(el) { if (el) while (el.firstChild) el.removeChild(el.firstChild); }
    function focusGame() { try { iframe.contentWindow.focus(); } catch (e) {} }
    function init(gameArea) {
        container = gameArea;
        clear(gameArea);
        iframe = document.createElement('iframe');
        iframe.src = 'games/obur-delik/index.html';
        iframe.className = 'ob-iframe';
        iframe.title = 'Obur Delik';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);
        // Ok tuşları oyuna gitsin: iframe yüklenince ve tıklanınca odak içeri
        iframe.addEventListener('load', focusGame);
        iframe.addEventListener('click', focusGame);
    }
    function destroy() {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        iframe = null; clear(container); container = null;
    }
    return { id, levels, init, destroy };
})();
