/* OYUN: Ritim Koşusu — tek tuşla müzikli engel koşusu (iframe: games/ritim-kosusu/index.html)
   RitimKosusu   : tek kişilik (7 bölüm + 3 yarış pisti, bölüm seçimi oyunun İÇİNDE; hub'a levels: 1)
   RitimKosusuMP : online 2 kişilik yarış — hub lobisi; iframe parent Firebase ile lobbies/<id>/rk dalını kullanır.
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
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        iframe = null; clear(container); container = null;
    }
    return { id, levels, init, destroy };
})();

const RitimKosusuMP = (() => {
    const id = 'ritim-kosusu';
    const isMultiplayer = true;
    let iframe = null, container = null, lobbyRef = null;
    function clear(el) { if (el) while (el.firstChild) el.removeChild(el.firstChild); }
    function focusGame() { try { iframe.contentWindow.focus(); } catch (e) {} }
    function init(gameArea, data) {
        container = gameArea;
        clear(gameArea);
        const role = (data && data.yourRole) === 'guest' ? 'guest' : 'host';
        const lobbyId = encodeURIComponent((data && data.lobbyId) || '');
        const opName = encodeURIComponent((data && data.opponentName) || 'Rakip');
        iframe = document.createElement('iframe');
        iframe.src = `games/ritim-kosusu/index.html?mod=yaris&role=${role}&lobbyId=${lobbyId}&name=${opName}`;
        iframe.className = 'rk-iframe';
        iframe.title = 'Ritim Koşusu — online yarış';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);
        iframe.addEventListener('load', focusGame);
        iframe.addEventListener('click', focusGame);
        // Oyundan çıkışta rk/ dalını temizle
        if (typeof db !== 'undefined' && db && data && data.lobbyId) lobbyRef = db.ref('lobbies/' + data.lobbyId);
    }
    function destroy() {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        iframe = null;
        if (lobbyRef) { try { lobbyRef.child('rk').remove(); } catch (e) {} lobbyRef = null; }
        clear(container); container = null;
    }
    return { id, isMultiplayer, init, destroy };
})();
