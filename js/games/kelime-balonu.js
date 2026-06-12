/* ============================================
   OYUN: Kelime Balonu
   Bubble Safari tarzı balon patlatma + İngilizce kelime
   (Eğitsel seri Faz 1 / 4.3). Hedef üstte (emoji + Türkçesi),
   harfli balonlardan kelimenin harfleri vurulur: doğru harf
   patlar (+ komşu aynı harfler), yanlış vuruş kümeye yapışır.
   Kelime puanı = uzunluk × 30 × tier; Etek/Yamaç sıra serbest,
   Tırmanış+ sıralı, Zirve resimsiz (sadece TR karşılık).
   Tasarım: EGITSEL-OYUN-PLANI.md §4.3 — hex grid + sekme fiziği.
   Bağımsız tek-dosya HTML oyunu olduğu için siteye iframe ile
   gömülür (bkz. games/kelime-balonu/index.html). İstatistik +
   skor kuyruğu window.storage köprüsüyle localStorage'a; Google
   girişte gameSaves bulut senkronu. Yıldız vermez (kilitsiz).
   ============================================ */

const KelimeBalonu = (() => {
    const id = 'kelime-balonu';
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
        iframe.src = 'games/kelime-balonu/index.html?v=1';
        iframe.className = 'kb-iframe';
        iframe.setAttribute('allow', 'fullscreen; autoplay');
        iframe.setAttribute('tabindex', '0');
        gameArea.appendChild(iframe);

        // iframe yüklenince ve tıklanınca içeriğine odaklan — klavye (P/Esc)
        // kısayollarının tıklamadan da çalışması için.
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
