import { playGame } from "./game.js?v=4";
import { loadData, loadDataFromLocalStorage, setCurrentLevel, setMenuActive } from "./helpers.js";
import { initNetwork, isOnline, getMyRole } from "./network.js?v=4";

// Fabrika tek-dosya build: yerel 2 oyuncu (tek klavye), ağ katmanı stub
export async function start() {
    // Tek başlatma garantisi — çift oyun döngüsünü engelle
    if (window.__AB_STARTED) return;
    window.__AB_STARTED = true;

    await loadData();
    loadDataFromLocalStorage();

    initNetwork();   // stub: her zaman false (çevrimdışı yerel mod)

    playGame();
}

// Yedek başlatma (inline import başaramazsa). start() kendi içinde tekilliği garanti eder.
window.addEventListener('load', () => {
    start().catch(err => console.error('Ateş & Buz başlatılamadı:', err));
});
