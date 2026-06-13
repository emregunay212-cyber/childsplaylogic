/* ============================================
   OYUN: Bil ve Fethet
   Triviador tarzı, gerçek dünya haritası üzerinde soru-cevapla
   toprak fethedilen strateji oyunu (Faz 0.1 — eğitsel seri).
   Bağımsız tek-dosya HTML oyunu olduğu için siteye iframe ile
   gömülür (bkz. games/bil-ve-fethet/index.html).
   Kayıt (sefer durumu + istatistik) oradaki window.storage köprüsü
   üzerinden tarayıcının localStorage'ına yazılır; Google girişli
   kullanıcıda js/auth.js bunu users/{uid}/gameSaves ile senkronlar.
   Tek oyunculu: kendi ilerlemesini yönetir, yıldız vermez.
   ============================================ */

const BilVeFethet = (() => {
    const id = 'bil-ve-fethet';
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
        iframe.src = 'games/bil-ve-fethet/index.html?v=3';
        iframe.className = 'bvf-iframe';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);

        // iframe yüklenince ve tıklanınca içeriğine odaklan — etkileşimlerin
        // ilk tıklamadan itibaren sorunsuz çalışması için.
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
