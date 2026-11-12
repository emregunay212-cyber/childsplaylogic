/* OYUN: Ritim Koşusu — tek tuşla müzikli engel koşusu (iframe: games/ritim-kosusu/index.html)
   Bölüm seçimi oyunun İÇİNDE (hub'a levels: 1). 2 kişilik online yarış da oyunun içinden: "2 Kişilik" →
   oda kur / koda katıl; iframe parent Firebase (window.parent.firebase) ile lobbies/<KOD> kaydını kullanır.
   Fizik çekirdeği games/ritim-kosusu/core.js (saf), bölümler levels.js; doğrulama: npm run test:ritim.
   Yıldız vermez (kilitsiz). */

const RitimKosusu = (() => {
    const id = 'ritim-kosusu';
    const levels = [{}];
    let iframe = null, container = null;
    function clear(el) { if (el) while (el.firstChild) el.removeChild(el.firstChild); }
    function focusGame() { try { iframe.contentWindow.focus(); } catch (e) {} }
    function init(gameArea) {
        container = gameArea;
        clear(gameArea);
        iframe = document.createElement('iframe');
        iframe.src = 'games/ritim-kosusu/index.html';
        iframe.className = 'rk-iframe';
        iframe.title = 'Ritim Koşusu';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);
        // Boşluk/ok tuşları oyuna gitsin: iframe yüklenince ve tıklanınca odak içeri
        iframe.addEventListener('load', focusGame);
        iframe.addEventListener('click', focusGame);
    }
    function destroy() {
        // 2 kişilik odadaysa odadan çık (kurucu odayı siler, misafir yerini boşaltır)
        try { if (iframe && iframe.contentWindow && iframe.contentWindow.__rkLeave) iframe.contentWindow.__rkLeave(); } catch (e) {}
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        iframe = null; clear(container); container = null;
    }
    return { id, levels, init, destroy };
})();
