/* scratchpad.js — Kalem-kağıt çalışma alanı. İKİ MOD:
   - ✏️ Çizim: HTML Canvas + Pointer Events (parmak/stylus/fare); renk, silgi, temizle.
   - ⌨️ Yaz: klavye + matematik sembol paleti (², ³, √, ×, ÷ …).
   Cihaza göre varsayılan sekme (dokunmatik → Çizim, fare → Yaz).
   olustur() bir kontrol nesnesi döndürür: { goster, aktif(), metin(), cizimDataURL() } —
   böylece içeriği "not" olarak kaydetmek için dışarıdan okunabilir. Güvenli DOM (innerHTML yok). */
const Scratchpad = (() => {
  function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  function olustur(kapsayici, { yukseklik = 300 } = {}) {
    kapsayici.replaceChildren();

    const sekmeBar = el('div', 'hz-scratch-sekme');
    const cizimSek = el('button', 'hz-sekme-btn', '✏️ Çizim');
    const yaziSek = el('button', 'hz-sekme-btn', '⌨️ Yaz');
    cizimSek.type = 'button'; yaziSek.type = 'button';
    sekmeBar.append(cizimSek, yaziSek);

    const cizimPanel = el('div', 'hz-scratch-panel');
    const yaziPanel = el('div', 'hz-scratch-panel');
    kapsayici.append(sekmeBar, cizimPanel, yaziPanel);

    const taRef = yaziKur(yaziPanel);
    let canvasRef = null;
    let aktif = 'yazi';

    function goster(hangi) {
      cizimPanel.hidden = hangi !== 'cizim';
      yaziPanel.hidden = hangi !== 'yazi';
      cizimSek.classList.toggle('aktif', hangi === 'cizim');
      yaziSek.classList.toggle('aktif', hangi === 'yazi');
      if (hangi === 'cizim' && !canvasRef) canvasRef = cizimKur(cizimPanel, yukseklik);
      aktif = hangi;
    }
    cizimSek.addEventListener('click', () => goster('cizim'));
    yaziSek.addEventListener('click', () => goster('yazi'));

    const dokunmatik = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    goster(dokunmatik ? 'cizim' : 'yazi');

    return {
      goster,
      aktif: () => aktif,
      metin: () => (taRef ? taRef.value : ''),
      cizimDataURL: () => (canvasRef ? canvasRef.toDataURL('image/png') : null)
    };
  }

  // YAZ modu: textarea + matematik sembol paleti. Textarea'yı döndürür.
  function yaziKur(panel) {
    const semboller = ['²', '³', 'ⁿ', '√', '×', '÷', '·', '½', '⅓', '¼', 'π', '≤', '≥', '≠', '±', '°', '( )'];
    const palet = el('div', 'hz-yazi-palet');
    const ta = el('textarea', 'hz-yazi-alan');
    ta.placeholder = 'Çözümünü / hesabını buraya yazabilirsin. Üstteki sembol tuşlarını kullanabilirsin (², √, × …).';
    semboller.forEach(s => {
      const b = el('button', 'hz-palet-btn', s); b.type = 'button';
      b.addEventListener('click', () => {
        const eklenecek = s === '( )' ? '()' : s;
        const bas = ta.selectionStart, son = ta.selectionEnd;
        ta.value = ta.value.slice(0, bas) + eklenecek + ta.value.slice(son);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = bas + (s === '( )' ? 1 : eklenecek.length);
      });
      palet.append(b);
    });
    panel.append(palet, ta);
    return ta;
  }

  // ÇİZİM modu: canvas + araçlar. Canvas'ı döndürür.
  function cizimKur(panel, yukseklik) {
    const renkler = ['#243140', '#3D6FB4', '#E74C3C', '#2ECC71'];
    let aktifRenk = renkler[0];
    let silgiMod = false;
    const kalemKalinlik = 3, silgiKalinlik = 20;

    const arac = el('div', 'hz-scratch-arac');
    const renkBtnlar = renkler.map(r => {
      const b = el('button', 'hz-renk'); b.type = 'button'; b.style.background = r;
      b.setAttribute('aria-label', 'Kalem rengi');
      b.addEventListener('click', () => { aktifRenk = r; silgiMod = false; aktifGuncelle(); });
      arac.append(b); return b;
    });
    const silgiBtn = el('button', 'hz-scratch-btn hz-silgi', 'Silgi'); silgiBtn.type = 'button';
    silgiBtn.addEventListener('click', () => { silgiMod = true; aktifGuncelle(); });
    const temizleBtn = el('button', 'hz-scratch-btn', 'Temizle'); temizleBtn.type = 'button';
    arac.append(silgiBtn, temizleBtn);
    panel.append(arac);

    function aktifGuncelle() {
      renkBtnlar.forEach((b, i) => b.classList.toggle('aktif', !silgiMod && renkler[i] === aktifRenk));
      silgiBtn.classList.toggle('aktif', silgiMod);
    }

    const canvas = el('canvas', 'hz-scratch-canvas');
    panel.append(canvas);
    const genislik = Math.max(280, panel.clientWidth || 320);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = genislik * dpr; canvas.height = yukseklik * dpr;
    canvas.style.width = genislik + 'px'; canvas.style.height = yukseklik + 'px';
    const ctx = canvas.getContext('2d');
    // Beyaz zemin (toDataURL'de şeffaf yerine beyaz görünsün)
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    let ciziyor = false;
    const nokta = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    function ayarla() {
      if (silgiMod) { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#fff'; ctx.lineWidth = silgiKalinlik; }
      else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = aktifRenk; ctx.lineWidth = kalemKalinlik; }
    }
    canvas.addEventListener('pointerdown', e => {
      ciziyor = true; try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      ayarla(); const p = nokta(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.01, p.y + 0.01); ctx.stroke();
    });
    canvas.addEventListener('pointermove', e => { if (!ciziyor) return; const p = nokta(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
    const bitir = () => { ciziyor = false; };
    canvas.addEventListener('pointerup', bitir);
    canvas.addEventListener('pointercancel', bitir);
    canvas.addEventListener('pointerleave', bitir);
    temizleBtn.addEventListener('click', () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); });

    aktifGuncelle();
    return canvas;
  }

  return { olustur };
})();
