/* ============================================
   OYUN: Hava Hokeyi - Online 2 Kişilik
   iframe wrapper: games/hava-hokeyi/index.html
   Host = kırmızı tokmak, Guest = mavi tokmak
   Mouse/dokunma ile oynanır (klavye yok).
   ============================================ */
const HavaHokeyi = (() => {
  const id = 'hava-hokeyi';
  const isMultiplayer = true;

  let iframe = null;
  let container = null;
  let lobbyRef = null;

  function init(gameArea, data) {
    container = gameArea;

    while (gameArea.firstChild) gameArea.removeChild(gameArea.firstChild);

    const role = (data && data.yourRole) || 'host';
    const lobbyId = data && data.lobbyId;
    const opName = encodeURIComponent((data && data.opponentName) || 'Rakip');

    iframe = document.createElement('iframe');
    iframe.src = `games/hava-hokeyi/index.html?role=${role}&lobbyId=${lobbyId}&name=${opName}`;
    iframe.className = 'hh-iframe';
    iframe.setAttribute('allow', 'fullscreen');
    iframe.setAttribute('tabindex', '0');
    gameArea.appendChild(iframe);

    // Otomatik focus (dokunma/fare olayları iframe'e gitsin)
    iframe.addEventListener('load', () => { try { iframe.contentWindow.focus(); } catch (e) {} });
    iframe.addEventListener('click', () => { try { iframe.contentWindow.focus(); } catch (e) {} });

    // Oyundan çıkışta hh/ dalını temizlemek için lobi referansını sakla
    if (typeof db !== 'undefined' && db && lobbyId) {
      lobbyRef = db.ref('lobbies/' + lobbyId);
    }
  }

  function destroy() {
    if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    iframe = null;
    if (lobbyRef) {
      try { lobbyRef.child('hh').remove(); } catch (e) {}
      lobbyRef = null;
    }
    if (container) {
      while (container.firstChild) container.removeChild(container.firstChild);
    }
    container = null;
  }

  return { id, isMultiplayer, init, destroy };
})();
