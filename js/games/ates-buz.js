/* ============================================
   OYUN: Ateş & Buz - Online 2 Kişilik Platform
   Temel: pavel-skala/Fireboy-and-Watergirl
   Bilnetoyun entegrasyonu: iframe + Firebase senkron
   Host = Fireboy (kırmızı, ok tuşları)
   Guest = Watergirl (mavi, ok tuşları)
   ============================================ */

const AtesBuz = (() => {
  const id = 'ates-buz';
  const isMultiplayer = true;

  let iframe = null;
  let container = null;
  let lobbyRef = null;
  let parentKeyHandler = null;
  let parentKeyUpHandler = null;

  const FORWARDED_KEYS = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'
  ]);

  function forwardKeyEvent(eventType, event) {
    if (!iframe || !iframe.contentWindow) return;
    if (!FORWARDED_KEYS.has(event.key)) return;
    try {
      const ev = new iframe.contentWindow.KeyboardEvent(eventType, {
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
        which: event.which,
        bubbles: true,
        cancelable: true,
      });
      iframe.contentWindow.dispatchEvent(ev);
    } catch (e) {
      // Sessiz geç; iframe unload olduysa normal
    }
  }

  function setupKeyForwarding() {
    parentKeyHandler = (e) => {
      if (FORWARDED_KEYS.has(e.key)) {
        e.preventDefault();
        forwardKeyEvent('keydown', e);
      }
    };
    parentKeyUpHandler = (e) => {
      if (FORWARDED_KEYS.has(e.key)) {
        e.preventDefault();
        forwardKeyEvent('keyup', e);
      }
    };
    window.addEventListener('keydown', parentKeyHandler, true);
    window.addEventListener('keyup', parentKeyUpHandler, true);
  }

  function teardownKeyForwarding() {
    if (parentKeyHandler) window.removeEventListener('keydown', parentKeyHandler, true);
    if (parentKeyUpHandler) window.removeEventListener('keyup', parentKeyUpHandler, true);
    parentKeyHandler = null;
    parentKeyUpHandler = null;
  }

  function init(gameArea, data) {
    container = gameArea;

    while (gameArea.firstChild) gameArea.removeChild(gameArea.firstChild);

    const role = data.yourRole || 'host';
    const lobbyId = data.lobbyId;
    const opName = encodeURIComponent(data.opponentName || 'Rakip');

    iframe = document.createElement('iframe');
    iframe.src = `games/ates-buz/index.html?role=${role}&lobbyId=${lobbyId}&name=${opName}`;
    iframe.className = 'ab-iframe';
    iframe.setAttribute('allow', 'fullscreen');
    iframe.setAttribute('tabindex', '0');
    gameArea.appendChild(iframe);

    // Otomatik focus: iframe yüklenince içeriğine odaklan (klavye olayları için)
    iframe.addEventListener('load', () => {
      try { iframe.contentWindow.focus(); } catch (e) {}
    });
    // Kullanıcı oyun alanına tıklarsa da odaklan
    iframe.addEventListener('click', () => {
      try { iframe.contentWindow.focus(); } catch (e) {}
    });

    // Parent klavye olaylarını iframe'e yönlendir (tıklamadan çalışsın diye)
    setupKeyForwarding();

    if (typeof db !== 'undefined' && db && lobbyId) {
      lobbyRef = db.ref('lobbies/' + lobbyId);
    }
  }

  function destroy() {
    teardownKeyForwarding();
    if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    iframe = null;
    if (lobbyRef) {
      try { lobbyRef.child('ab').remove(); } catch (e) {}
      lobbyRef = null;
    }
    if (container) {
      while (container.firstChild) container.removeChild(container.firstChild);
    }
    container = null;
  }

  return { id, isMultiplayer, init, destroy };
})();
