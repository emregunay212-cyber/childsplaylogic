/* ============================================
   Mobile Utils — Canvas DPR + Touch Yardımcıları
   ============================================ */

const MobileUtils = (() => {
  const MAX_DPR = 2;

  function getDPR() {
    return Math.min(window.devicePixelRatio || 1, MAX_DPR);
  }

  function isTouchDevice() {
    return (window.matchMedia && window.matchMedia('(hover: none)').matches) ||
           ('ontouchstart' in window);
  }

  function setupHiDPICanvas(canvas, ctx, logicalW, logicalH, opts) {
    const options = opts || {};
    const dpr = options.forceIntegerDpr
      ? Math.max(1, Math.floor(getDPR()))
      : getDPR();
    canvas.width = Math.round(logicalW * dpr);
    canvas.height = Math.round(logicalH * dpr);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return dpr;
  }

  function lockBodyScroll() {
    document.body.classList.add('game-active');
  }

  function unlockBodyScroll() {
    document.body.classList.remove('game-active');
  }

  function unlockAudio() {
    try {
      if (typeof AudioManager === 'undefined' || !AudioManager) return;
      if (typeof AudioManager.unlock === 'function') AudioManager.unlock();
      const ctx = AudioManager.context || AudioManager.audioContext || null;
      if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume();
      }
    } catch (e) {}
  }

  let audioUnlockAttached = false;
  function attachGlobalAudioUnlock() {
    if (audioUnlockAttached) return;
    audioUnlockAttached = true;
    const once = () => {
      unlockAudio();
      document.removeEventListener('touchstart', once, true);
      document.removeEventListener('mousedown', once, true);
      document.removeEventListener('keydown', once, true);
    };
    document.addEventListener('touchstart', once, true);
    document.addEventListener('mousedown', once, true);
    document.addEventListener('keydown', once, true);
  }

  function bindHoldButton(el, onPress, onRelease) {
    if (!el) return;
    el.style.touchAction = 'none';
    let activeTouchId = null;
    const press = () => { if (onPress) onPress(); };
    const release = () => { if (onRelease) onRelease(); };

    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (activeTouchId === null && e.changedTouches && e.changedTouches[0]) {
        activeTouchId = e.changedTouches[0].identifier;
      }
      press();
    }, { passive: false });

    const touchEndLike = (e) => {
      if (activeTouchId === null) return;
      if (e.changedTouches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchId) {
            activeTouchId = null;
            release();
            return;
          }
        }
      } else {
        activeTouchId = null;
        release();
      }
    };

    el.addEventListener('touchend', (e) => { e.preventDefault(); touchEndLike(e); }, { passive: false });
    el.addEventListener('touchcancel', (e) => { touchEndLike(e); });

    el.addEventListener('mousedown', (e) => { e.preventDefault(); press(); });
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);

    document.addEventListener('mouseup', release);
  }

  return {
    getDPR,
    isTouchDevice,
    setupHiDPICanvas,
    lockBodyScroll,
    unlockBodyScroll,
    attachGlobalAudioUnlock,
    unlockAudio,
    bindHoldButton,
  };
})();
