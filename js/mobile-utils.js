/* ============================================
   Mobile Utils — Canvas DPR + Touch Yardımcıları + tık/klavye etkinleştirme (bindActivate)
   ============================================ */

const MobileUtils = (() => {
  const MAX_DPR = 2;

  function getDPR() {
    return Math.min(window.devicePixelRatio || 1, MAX_DPR);
  }

  function isTouchDevice() {
    if ('ontouchstart' in window) return true;
    if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) return true;
    if (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0) return true;
    if (window.matchMedia) {
      if (window.matchMedia('(pointer: coarse)').matches) return true;
      if (window.matchMedia('(hover: none)').matches) return true;
      if (window.matchMedia('(any-pointer: coarse)').matches) return true;
    }
    return false;
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

  // Canvas'ı GÖRÜNTÜLENEN boyutuna (CSS px × DPR) göre boyutlandırır ve çizim
  // koordinatlarını mantıksal (logicalW×logicalH) sisteme ölçekler. Oyun büyüdükçe
  // (örn. tam ekran) iç çözünürlük de büyür → bulanıklaşma olmaz. ResizeObserver ile
  // boyut değişiminde otomatik yeniden ayarlanır. Oyun her karede mantıksal
  // koordinatlarda çizmeye devam eder.
  function attachResponsiveCanvas(canvas, ctx, logicalW, logicalH) {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    const fit = () => {
      const dpr = getDPR();
      const w = canvas.clientWidth || logicalW;
      const h = canvas.clientHeight || logicalH;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      // Mantıksal koordinat sistemini iç çözünürlüğe ölçekle (en-boy oranı
      // korunduğunda x/y aynı faktör → bozulma olmaz).
      ctx.setTransform(canvas.width / logicalW, 0, 0, canvas.height / logicalH, 0, 0);
    };
    fit();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(canvas);
    }
    // ResizeObserver bazı durumlarda (ör. tam ekran geçişi) tetiklenmeyebildiği için
    // window resize olayını da dinle — tam ekran butonu bu olayı tetikler.
    window.addEventListener('resize', fit);
    return {
      refit: fit,
      disconnect() { if (ro) ro.disconnect(); window.removeEventListener('resize', fit); }
    };
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

  // Bir öğeyi tıkla VE klavyeyle (Enter / Boşluk) etkinleştirir — role="button" + tabindex="0"
  // taşıyan div'ler (hub kartları, jeton çipi) için. Gerçek <button> zaten bunu kendisi yapar.
  // Boşlukta preventDefault: sayfa kaymasın. app.js ve bilnet-meta.js kullanır.
  function bindActivate(el, fn) {
    if (!el || typeof fn !== 'function') return;
    el.addEventListener('click', fn);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); }
    });
  }

  return {
    getDPR,
    isTouchDevice,
    setupHiDPICanvas,
    attachResponsiveCanvas,
    lockBodyScroll,
    unlockBodyScroll,
    attachGlobalAudioUnlock,
    unlockAudio,
    bindHoldButton,
    bindActivate,
  };
})();
