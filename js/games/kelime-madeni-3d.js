/* ============================================
   OYUN: Kelime Madeni 3D
   Minecraft tarzı 3D voxel madencilik + İngilizce kelime öğretimi
   (Faz 0.2 — eğitsel seri). Cevher kazınca TR↔EN soru gelir; doğru
   cevap cevheri kazandırır. Bağımsız HTML oyunu olduğu için siteye
   iframe ile gömülür (bkz. games/kelime-madeni-3d/index.html;
   three.min.js aynı klasörden yerel servis edilir — CDN yok).
   Kayıt (dünya + ilerleme + istatistik) window.storage köprüsüyle
   localStorage'a yazılır; Google girişte gameSaves bulut senkronu.
   Tek oyunculu: kendi ilerlemesini yönetir, yıldız vermez.
   ============================================ */

const KelimeMadeni3D = (() => {
    const id = 'kelime-madeni-3d';
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
        iframe.src = 'games/kelime-madeni-3d/index.html?v=1';
        iframe.className = 'km3-iframe';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);

        // iframe yüklenince ve tıklanınca içeriğine odaklan — klavye (WASD/C/E)
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
