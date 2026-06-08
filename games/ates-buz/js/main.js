import { playGame } from "./game.js?v=3";
import { loadData, loadDataFromLocalStorage, setCurrentLevel, setMenuActive } from "./helpers.js";
import { initNetwork, isOnline, getMyRole } from "./network.js?v=3";

// Bilnetoyun entegrasyonu: online 2 oyuncu, iframe içinde çalışır
export async function start() {
    // Tek başlatma garantisi: hem index.html inline script'i hem aşağıdaki 'load' dinleyicisi
    // start() çağırıyordu → İKİ paralel oyun döngüsü oluşuyordu (2× fizik, çift dinleyici, çift
    // Firebase aboneliği). Bayrağı İLK await'ten ÖNCE (senkron) set ederek ikinci çağrıyı engelle.
    if (window.__AB_STARTED) return;
    window.__AB_STARTED = true;

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

// Yedek başlatma (inline import başaramazsa). start() kendi içinde tekilliği garanti eder.
window.addEventListener('load', () => {
    start().catch(err => console.error('Ateş & Buz başlatılamadı:', err));
});
