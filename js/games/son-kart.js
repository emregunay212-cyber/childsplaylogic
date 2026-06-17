/* ============================================
   OYUN: Son Kart — UNO-tarzı renk/sayı kart oyunu (Solo + Online 2-4)
   Bağımsız tek-uygulama oyunu; siteye iframe ile gömülür
   (bkz. games/son-kart/index.html). Online eşleşme + senkronu kendi
   Firebase odasıyla (rooms/son-kart) yönetir — Lobby/multiplayer.js KULLANMAZ.
   Bu yüzden app.js startMultiplayerGame'de Kelimelik gibi doğrudan init edilir.
   ============================================ */
const SonKart = (() => {
  const id = 'son-kart';
  let iframe = null, container = null;

  function clear(el) { if (el) while (el.firstChild) el.removeChild(el.firstChild); }

  function init(gameArea) {
    container = gameArea;
    clear(gameArea);
    iframe = document.createElement('iframe');
    iframe.src = 'games/son-kart/index.html?v=2';
    iframe.className = 'zo-iframe';   // tam-boy iframe stili (Zindan/Kelimelik ile ortak)
    iframe.setAttribute('allow', 'fullscreen');
    iframe.setAttribute('tabindex', '0');
    gameArea.appendChild(iframe);
    iframe.addEventListener('load', () => { try { iframe.contentWindow.focus(); } catch (e) {} });
    iframe.addEventListener('click', () => { try { iframe.contentWindow.focus(); } catch (e) {} });
  }

  function destroy() {
    if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    iframe = null;
    clear(container);
    container = null;
  }

  return { id, init, destroy };
})();
