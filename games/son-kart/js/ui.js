/* ============================================
   SON KART — Arayüz (render katmanı)
   main.js bunu çağırır: mount / showMenu / showLobby / updateLobby /
   renderGame / askColor / showResult / toast.
   XSS-güvenli: tüm metin textContent ile; HTML stringi YOK. Statik SVG'ler
   DOMParser ile (güvenilir sabit girdi) düğüme çevrilir.
   ============================================ */
const SonKartUI = (() => {
  let root = null, handlers = {};
  const N = {};
  const COLOR_NAME = { r: 'Kırmızı', y: 'Sarı', g: 'Yeşil', b: 'Mavi' };
  const COLOR_HEX = { r: 'var(--c-r)', y: 'var(--c-y)', g: 'var(--c-g)', b: 'var(--c-b)' };

  const SVG_SKIP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"><circle cx="50" cy="50" r="33"/><line x1="27" y1="27" x2="73" y2="73"/></svg>';
  const SVG_REV = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M24 40 H66 M55 28 L70 40 L55 52"/><path d="M76 60 H34 M45 48 L30 60 L45 72"/></svg>';
  const SVG_DIR_CW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M28 50 a22 22 0 1 1 8 16"/><path d="M22 52 L28 64 L40 58"/></svg>';
  const SVG_DIR_CCW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M72 50 a22 22 0 1 0 -8 16"/><path d="M78 52 L72 64 L60 58"/></svg>';
  // Joker amblemi: dört-renk çark (kartın "istediğin rengi seç" işlevini net anlatır)
  const SVG_WILD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g stroke="#fff" stroke-width="4" stroke-linejoin="round">' +
    '<path d="M50 50 L50 9 A41 41 0 0 1 91 50 Z" fill="#e23b34"/>' +
    '<path d="M50 50 L91 50 A41 41 0 0 1 50 91 Z" fill="#f4c20d"/>' +
    '<path d="M50 50 L50 91 A41 41 0 0 1 9 50 Z" fill="#36b44a"/>' +
    '<path d="M50 50 L9 50 A41 41 0 0 1 50 9 Z" fill="#2e8fe6"/>' +
    '<circle cx="50" cy="50" r="9" fill="#25262e"/></g></svg>';

  // ── DOM yardımcıları ──
  function E(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function svgNode(str) { return document.importNode(new DOMParser().parseFromString(str, 'image/svg+xml').documentElement, true); }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }

  // Kart sembolü → düğüme yaz; bir şey eklendiyse true.
  function symInto(node, v) {
    if (v === 'skip') { node.appendChild(svgNode(SVG_SKIP)); return true; }
    if (v === 'rev') { node.appendChild(svgNode(SVG_REV)); return true; }
    if (v === 'wild') { node.appendChild(svgNode(SVG_WILD)); return true; }
    const t = v === 'd2' ? '+2' : v === 'wd4' ? '+4' : v;
    node.textContent = t; return true;
  }
  // Özel kartlara alt etiket → ne işe yaradığı kartın üstünde net olsun
  const CARD_TAGS = { skip: 'ATLA', rev: 'YÖN', d2: 'İKİ ÇEK', wild: 'JOKER', wd4: 'JOKER +4' };
  function cardTag(v) { return CARD_TAGS[v] || null; }

  function cardEl(card, opts) {
    opts = opts || {};
    const d = E('div', 'sk-card c-' + card.c); d.dataset.id = card.id;
    if (opts.w) d.style.setProperty('--w', opts.w + 'px');
    if (card.c === 'w') { const q = E('div', 'quad'); for (let i = 0; i < 4; i++) q.appendChild(E('i')); d.appendChild(q); }
    else d.appendChild(E('div', 'oval'));
    const c = E('div', 'center'); symInto(c, card.v); d.appendChild(c);
    ['tl', 'br'].forEach(pos => { const cn = E('div', 'corner ' + pos); if (symInto(cn, card.v)) d.appendChild(cn); });
    const tag = cardTag(card.v); if (tag) d.appendChild(E('div', 'cardtag', tag));
    return d;
  }
  function backEl() { return E('div', 'sk-cardback'); }

  // ── İskelet ──
  function mount(el) {
    root = el; clear(root);
    const app = E('div'); app.id = 'sk-app';
    N.menu = E('div', 'sk-screen'); N.menu.id = 'screen-menu';
    N.lobby = E('div', 'sk-screen'); N.lobby.id = 'screen-lobby';
    N.game = E('div', 'sk-screen'); N.game.id = 'screen-game';

    // — oyun ekranı —
    const top = E('div', 'sk-topbar');
    N.leaveBtn = E('button', 'sk-btn ghost small', 'Çıkış'); N.leaveBtn.onclick = () => handlers.onLeaveGame && handlers.onLeaveGame();
    N.banner = E('div', 'sk-turnbanner');
    N.bannerDot = E('span', 'tb-dot');
    N.bannerMain = E('span', 'tb-main', '…');
    N.banner.append(N.bannerDot, N.bannerMain);
    N.rulesBtn = E('button', 'sk-btn ghost small', 'Kurallar'); N.rulesBtn.onclick = () => openRules();
    top.append(N.leaveBtn, N.banner, N.rulesBtn);

    N.opps = E('div', 'sk-opponents');
    // son hamleler akışı — hızlı/ard arda oynanan kartları takip etmeyi sağlar
    N.feed = E('div', 'sk-feed');

    const table = E('div', 'sk-table');
    N.dir = E('div', 'sk-dir');                       // küçük yön göstergesi (köşe)
    // Deste (çekme yığını)
    const pileDraw = E('div', 'sk-pile');
    pileDraw.append(E('div', 'lbl', 'Çek'), (N.draw = E('div', 'sk-draw-card')));
    N.draw.onclick = () => handlers.onDraw && handlers.onDraw();
    // Açılan kart (üstteki kart) + altında aktif renk
    const pileDisc = E('div', 'sk-pile pile-disc');
    N.discard = E('div', 'sk-discwrap');
    N.colorInd = E('div', 'sk-color-ind');
    N.colorInd.append((N.swatch = E('span', 'swatch')), (N.colorName = E('span', 'cname', 'Renk')));
    pileDisc.append(E('div', 'lbl', 'Açılan kart'), N.discard, N.colorInd);
    table.append(N.dir, pileDraw, pileDisc);
    N.table = table;

    const handwrap = E('div', 'sk-handwrap');
    const actions = E('div', 'sk-actions');
    N.pass = E('button', 'sk-btn ghost', 'Pas Geç'); N.pass.style.display = 'none';
    N.pass.onclick = () => handlers.onPass && handlers.onPass();
    N.uno = E('button', 'sk-btn sk-uno-btn', 'SON KART!'); N.uno.style.display = 'none';
    N.uno.onclick = () => handlers.onUno && handlers.onUno();
    actions.append(N.pass, N.uno);
    N.hand = E('div', 'sk-hand');
    handwrap.append(actions, N.hand);

    N.game.append(top, N.opps, N.feed, table, handwrap);

    // — modallar + toast —
    N.colorModal = E('div', 'sk-modal'); N.colorModal.id = 'sk-colormodal';
    const cbox = E('div', 'box'); cbox.appendChild(E('h3', '', 'Renk seç'));
    const colors = E('div', 'sk-colors');
    [['pr', 'r'], ['py', 'y'], ['pg', 'g'], ['pb', 'b']].forEach(([cls, c]) => { const b = E('button', cls); b.dataset.c = c; colors.appendChild(b); });
    cbox.appendChild(colors); N.colorModal.appendChild(cbox);

    N.resultModal = E('div', 'sk-modal'); N.resultModal.id = 'sk-resultmodal';
    N.resultBox = E('div', 'box sk-result'); N.resultModal.appendChild(N.resultBox);

    N.rulesModal = E('div', 'sk-modal'); N.rulesModal.id = 'sk-rulesmodal';
    N.rulesModal.appendChild(buildRules());
    N.rulesModal.addEventListener('click', e => { if (e.target === N.rulesModal) closeRules(); });

    N.toast = E('div', 'sk-toast');

    app.append(N.menu, N.lobby, N.game, N.colorModal, N.resultModal, N.rulesModal, N.toast);
    root.appendChild(app);
  }

  // ── Kurallar paneli (oyun sırasında da açılabilir) ──
  function ruleRow(card, title, desc) {
    const row = E('div', 'rule-row');
    const mini = cardEl(card, { w: 46 });
    const tx = E('div', 'rule-tx'); tx.append(E('div', 'rule-t', title), E('div', 'rule-d', desc));
    row.append(mini, tx); return row;
  }
  function buildRules() {
    const box = E('div', 'box sk-rules');
    const head = E('div', 'rules-head');
    head.append(E('h2', '', 'Nasıl Oynanır?'));
    const x = E('button', 'sk-btn ghost small', 'Kapat'); x.onclick = () => closeRules(); head.appendChild(x);
    box.appendChild(head);
    const body = E('div', 'rules-body');

    const p = E('p', 'rule-intro', 'Amaç: Elindeki kartları herkesten önce bitirmek. Sıran gelince üstteki kartla AYNI RENK ya da AYNI SAYI/sembol olan bir kart at. Uyan kartın yoksa desteden çek.');
    body.appendChild(p);

    body.appendChild(E('h3', '', 'Özel Kartlar'));
    body.appendChild(ruleRow({ c: 'r', v: 'skip', id: -90 }, 'Atla', 'Sıradaki oyuncu pas geçer, oynayamaz.'));
    body.appendChild(ruleRow({ c: 'g', v: 'rev', id: -91 }, 'Yön Değiştir', 'Oyun yönü tersine döner (2 kişide: tekrar sen oynarsın).'));
    body.appendChild(ruleRow({ c: 'b', v: 'd2', id: -92 }, '+2 (İki Çek)', 'Sıradaki oyuncu 2 kart çeker ve sırasını kaçırır.'));
    body.appendChild(ruleRow({ c: 'w', v: 'wild', id: -93 }, 'Joker', 'Her zaman atılır. Atınca devam edecek RENGİ sen seçersin.'));
    body.appendChild(ruleRow({ c: 'w', v: 'wd4', id: -94 }, 'Joker +4', 'Rengi seçersin; sıradaki oyuncu 4 kart çeker ve sırasını kaçırır.'));

    body.appendChild(E('h3', '', '“Son Kart!” Kuralı'));
    body.appendChild(E('p', 'rule-d', 'Tek kartın kalacağı hamleyi yapmadan ÖNCE “SON KART!” butonuna bas. Basmazsan ceza olarak 2 kart çekersin!'));

    body.appendChild(E('h3', '', 'Masadaki Göstergeler'));
    const leg = E('ul', 'rule-legend');
    leg.append(
      liText('Aktif renk: Masanın ortasındaki renkli halka şu an hangi rengin geçerli olduğunu gösterir (Joker sonrası önemlidir).'),
      liText('Yön oku: Sıranın hangi yöne ilerlediğini gösterir.'),
      liText('Rakip kartları: Kapalı (arka yüz) kartlar rakibin kaç kartı kaldığını gösterir — içerikleri gizlidir.'),
      liText('Sıra: Üstteki şerit ve parlayan oyuncu, sıranın kimde olduğunu gösterir; “Son Hamleler” akışı ise az önce ne oynandığını yazar.')
    );
    body.appendChild(leg);
    box.appendChild(body);
    return box;
  }
  function liText(t) { const li = E('li'); li.textContent = t; return li; }
  function openRules() { if (N.rulesModal) N.rulesModal.classList.add('show'); }
  function closeRules() { if (N.rulesModal) N.rulesModal.classList.remove('show'); }

  function setHandlers(h) { handlers = Object.assign(handlers, h); }
  function show(which) { [['menu', N.menu], ['lobby', N.lobby], ['game', N.game]].forEach(([k, n]) => n.classList.toggle('active', k === which)); }

  // ── Menü ──
  function showMenu(cbs) {
    let bots = 1; clear(N.menu);
    const logo = E('div', 'sk-logo'); logo.append(E('h1', '', 'SON KART'), E('div', 'tag', 'Renkleri ve sayıları eşleştir, elini ilk bitiren kazanır!'));
    const fan = E('div', 'sk-menu-cards');
    [{ c: 'r', v: '7' }, { c: 'b', v: 'rev' }, { c: 'g', v: '2' }, { c: 'w', v: 'wd4' }, { c: 'y', v: 'skip' }]
      .forEach((c, i) => fan.appendChild(cardEl({ c: c.c, v: c.v, id: -1 - i }, { w: 64 })));

    const list = E('div', 'sk-menu-list');
    const sub = E('div', 'sk-sub');
    sub.appendChild(E('div', '', 'Tek Başına — bot sayısı')); sub.lastChild.style.textAlign = 'center'; sub.lastChild.style.fontWeight = '700';
    const bb = E('div', 'sk-bots');
    [1, 2, 3].forEach(n => { const b = E('button', 'sk-chip' + (n === bots ? ' on' : ''), '' + n); b.onclick = () => { bots = n; [...bb.children].forEach(x => x.classList.toggle('on', +x.textContent === n)); }; bb.appendChild(b); });
    const soloBtn = E('button', 'sk-btn', 'Bota Karşı Oyna'); soloBtn.onclick = () => cbs.onSolo(bots);
    sub.append(bb, soloBtn);

    const quick = E('button', 'sk-btn ghost', 'Hızlı Eşleş (Online)'); quick.onclick = () => cbs.onQuick();
    const create = E('button', 'sk-btn ghost', 'Oda Kur'); create.onclick = () => cbs.onCreate();
    const field = E('div', 'sk-field');
    N.codeInput = E('input'); N.codeInput.maxLength = 4; N.codeInput.placeholder = 'KOD'; N.codeInput.autocomplete = 'off';
    const joinBtn = E('button', 'sk-btn small', 'Katıl'); joinBtn.onclick = () => cbs.onJoin((N.codeInput.value || '').trim());
    field.append(N.codeInput, joinBtn);
    N.hint = E('div', 'sk-hint');

    const spacer = E('div'); spacer.style.height = '6px';
    const rulesLink = E('button', 'sk-btn ghost small', 'Nasıl Oynanır?'); rulesLink.onclick = () => openRules();
    list.append(sub, spacer, quick, create, field, N.hint, rulesLink);
    N.menu.append(logo, fan, list);
    show('menu');
  }
  function setHint(t) { if (N.hint) N.hint.textContent = t || ''; }

  // ── Lobi ──
  function showLobby(opts) {
    clear(N.lobby);
    const leave = E('button', 'sk-btn ghost small sk-back', 'Ayrıl'); leave.onclick = () => opts.onLeave && opts.onLeave();
    const codeBox = E('div', 'sk-code-box');
    codeBox.appendChild(E('div', '', 'Oda Kodu')); codeBox.lastChild.style.opacity = '.85'; codeBox.lastChild.style.fontWeight = '700'; codeBox.lastChild.style.marginBottom = '6px';
    codeBox.appendChild(E('div', 'code', opts.code));
    N.lobbyPlayers = E('div', 'sk-players');
    N.lobbyHint = E('div', 'sk-hint', 'Arkadaşların bu kodla katılsın…');
    N.lobby.append(leave, codeBox, N.lobbyPlayers, N.lobbyHint);
    if (opts.isHost) { N.lobbyStart = E('button', 'sk-btn', 'Başlat'); N.lobbyStart.disabled = true; N.lobbyStart.onclick = () => opts.onStart && opts.onStart(); N.lobby.appendChild(N.lobbyStart); }
    else { N.lobbyStart = null; N.lobby.appendChild(E('div', 'sk-hint', 'Başlamak için kurucuyu bekle…')); }
    show('lobby');
  }
  function updateLobby(data) {
    if (!N.lobbyPlayers) return;
    clear(N.lobbyPlayers);
    data.players.forEach(p => {
      const row = E('div', 'sk-prow');
      row.appendChild(E('span', 'dot' + (p.present ? '' : ' off')));
      row.appendChild(E('span', '', p.name));
      if (p.isHost) row.appendChild(E('span', 'host-tag', 'kurucu'));
      N.lobbyPlayers.appendChild(row);
    });
    if (N.lobbyStart) N.lobbyStart.disabled = !data.canStart;
    if (N.lobbyHint && data.hint != null) N.lobbyHint.textContent = data.hint;
  }

  // ── Oyun render ──
  let _lastTopId = null;
  function renderGame(view) {
    show('game');
    // Sıra afişi — kimin sırası olduğu net olsun
    N.banner.classList.toggle('mine', !!view.canAct);
    N.bannerDot.style.background = COLOR_HEX[view.curColor] || '#fff';
    if (view.canAct) N.bannerMain.textContent = view.drew ? 'SENİN SIRAN — oyna ya da Pas geç' : 'SENİN SIRAN';
    else N.bannerMain.textContent = (view.activeName || 'Oyuncu') + ' oynuyor…';

    clear(N.opps);
    view.players.filter(p => !p.isMe).forEach(p => {
      const d = E('div', 'sk-opp' + (p.isTurn ? ' turn' : '') + (p.present ? '' : ' gone'));
      if (p.isTurn) d.appendChild(E('div', 'turn-pip', 'SIRA'));
      d.appendChild(E('div', 'nm', p.name));
      const mini = E('div', 'mini'); const k = Math.min(p.count, 5);
      for (let i = 0; i < k; i++) mini.appendChild(E('div', 'sk-cardback'));
      d.appendChild(mini);
      d.appendChild(E('div', 'cnt', p.count + ' kart'));
      if (p.said) d.appendChild(E('div', 'said', 'SON KART!'));
      N.opps.appendChild(d);
    });

    // Son hamleler akışı (en yeni en solda/üstte)
    clear(N.feed);
    (view.log || []).slice(-4).reverse().forEach((line, i) => {
      const chip = E('div', 'feed-chip' + (i === 0 ? ' fresh' : ''), line);
      N.feed.appendChild(chip);
    });

    // Yığın + kart-pop animasyonu (her atılan kart belirgin olsun)
    clear(N.discard);
    if (view.top) { const tc = cardEl(view.top); if (view.top.id !== _lastTopId) tc.classList.add('pop'); N.discard.appendChild(tc); _lastTopId = view.top.id; }
    N.discard.dataset.color = view.curColor || '';
    clear(N.draw); N.draw.appendChild(backEl()); N.draw.appendChild(E('div', 'cnt', '' + view.deckCount));
    if (N.swatch) N.swatch.style.background = COLOR_HEX[view.curColor] || '#fff';
    if (N.colorName) N.colorName.textContent = COLOR_NAME[view.curColor] || 'Renk';
    clear(N.dir); N.dir.appendChild(svgNode(view.dir === 1 ? SVG_DIR_CW : SVG_DIR_CCW));

    clear(N.hand);
    N.hand.classList.toggle('myturn', !!view.canAct);
    view.myHand.forEach(card => {
      const e = cardEl(card);
      const playable = view.canAct && view.legal.has(card.id);
      e.classList.toggle('playable', playable);
      e.classList.toggle('dim', view.canAct && !playable);
      if (playable) e.onclick = () => handlers.onPlay && handlers.onPlay(card.id);
      N.hand.appendChild(e);
    });
    N.uno.style.display = (view.canAct && view.myHand.length === 2) ? '' : 'none';
    N.pass.style.display = view.canPass ? '' : 'none';
  }

  // ── Renk seçici ──
  function askColor() {
    return new Promise(resolve => {
      N.colorModal.classList.add('show');
      const btns = N.colorModal.querySelectorAll('button');
      const onClick = (e) => { const c = e.currentTarget.dataset.c; cleanup(); resolve(c); };
      function cleanup() { N.colorModal.classList.remove('show'); btns.forEach(b => b.removeEventListener('click', onClick)); }
      btns.forEach(b => b.addEventListener('click', onClick));
    });
  }

  // ── Sonuç ──
  function showResult(opts) {
    clear(N.resultBox);
    N.resultBox.appendChild(E('h2', '', opts.isMe ? 'Kazandın!' : 'Oyun Bitti'));
    N.resultBox.appendChild(E('div', '', opts.text || '')); N.resultBox.lastChild.style.fontWeight = '700';
    const row = E('div', 'row');
    const again = E('button', 'sk-btn', 'Tekrar'); again.onclick = () => { N.resultModal.classList.remove('show'); opts.onAgain && opts.onAgain(); };
    const home = E('button', 'sk-btn ghost', 'Menü'); home.onclick = () => { N.resultModal.classList.remove('show'); opts.onHome && opts.onHome(); };
    row.append(again, home); N.resultBox.appendChild(row);
    N.resultModal.classList.add('show');
  }
  function hideResult() { if (N.resultModal) N.resultModal.classList.remove('show'); }

  // ── Toast ──
  let toastT = null;
  function toast(msg) {
    if (!N.toast) return;
    N.toast.textContent = msg; N.toast.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => N.toast.classList.remove('show'), 1800);
  }

  return { mount, setHandlers, showMenu, setHint, showLobby, updateLobby, renderGame, askColor, showResult, hideResult, toast, COLOR_NAME };
})();
