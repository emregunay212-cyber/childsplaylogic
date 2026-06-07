/* ============================================
   OYUN: Kelimelik — Türkçe Scrabble (Online 1v1)
   Bağımsız tek-uygulama oyunu; siteye iframe ile gömülür
   (bkz. games/kelimelik/index.html). Online eşleşme + senkronu kendi
   Firebase odasıyla (rooms/kelimelik) yönetir — Lobby/multiplayer.js KULLANMAZ.
   Bu yüzden app.js startMultiplayerGame'de Altın Avı gibi doğrudan init edilir.
   ============================================ */
const Kelimelik = (() => {
  const id = 'kelimelik';
  let iframe = null, container = null;

  function clear(el) { if (el) while (el.firstChild) el.removeChild(el.firstChild); }

  // startMultiplayerGame(game) → game.init(gameArea, {})
  function init(gameArea) {
    container = gameArea;
    clear(gameArea);
    iframe = document.createElement('iframe');
    iframe.src = 'games/kelimelik/index.html?v=2';
    iframe.className = 'zo-iframe';   // tam-boy iframe stili (Zindan ile ortak)
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
