import { playGame } from "./game.js";
import { loadData, loadDataFromLocalStorage, setCurrentLevel, setMenuActive } from "./helpers.js";
import { initNetwork, isOnline, getMyRole } from "./network.js";

// Bilnetoyun entegrasyonu: online 2 oyuncu, iframe içinde çalışır
export async function start() {
    await loadData();
    loadDataFromLocalStorage();

    // Network kurulum (URL'de role varsa online mod)
    const online = initNetwork();
    if (online) {
        // Online modda menüyü atla, direkt level 1'den başla
        setCurrentLevel(1);
        setMenuActive(null);
    }

    playGame();
}

// Geriye uyumluluk: URL params yoksa da auto-start (test için)
window.addEventListener('load', () => {
    if (!window.__AB_STARTED) {
        window.__AB_STARTED = true;
        start().catch(err => console.error('Ateş & Buz başlatılamadı:', err));
    }
});
