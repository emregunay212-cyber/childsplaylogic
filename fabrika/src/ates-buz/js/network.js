// FABRİKA STUB — çevrimdışı tek-dosya build'de ağ katmanı yoktur.
// Oyun, role parametresi olmadığında zaten yerel 2-oyuncu (tek klavye) çalışır;
// bu stub tüm ağ API yüzeyini no-op olarak korur ki çağrı yerleri kırılmasın.

function initNetwork() { return false; }
function getMyRole() { return null; }
function getOpponentName() { return ''; }
function isOnline() { return false; }

function broadcastPlayer() {}
function broadcastDeath() {}
function broadcastButtonState() {}
function broadcastButtonsArray() {}
function broadcastLeversArray() {}
function broadcastCubesArray() {}
function broadcastFullState() {}
function broadcastGuestInput() {}
function broadcastDiamondCollected() {}
function broadcastDoorState() {}
function broadcastLevel() {}
function clearLevelState() {}
function disconnectNetwork() {}

function setOnRemotePlayer() {}
function setOnRemoteButtons() {}
function setOnRemoteDiamonds() {}
function setOnRemoteDoors() {}
function setOnLevelChanged() {}
function setOnRemoteDeath() {}
function setOnRemoteButtonsArray() {}
function setOnRemoteLeversArray() {}
function setOnRemoteCubesArray() {}
function setOnHostState() {}
function setOnGuestInput() {}
function setOnOpponentLeft() {}
function setOnOpponentReturned() {}

export {
    initNetwork,
    getMyRole,
    getOpponentName,
    isOnline,
    broadcastPlayer,
    broadcastDeath,
    broadcastButtonState,
    broadcastButtonsArray,
    broadcastLeversArray,
    broadcastCubesArray,
    broadcastFullState,
    broadcastGuestInput,
    broadcastDiamondCollected,
    broadcastDoorState,
    broadcastLevel,
    clearLevelState,
    disconnectNetwork,
    setOnRemotePlayer,
    setOnRemoteButtons,
    setOnRemoteDiamonds,
    setOnRemoteDoors,
    setOnLevelChanged,
    setOnRemoteDeath,
    setOnRemoteButtonsArray,
    setOnRemoteLeversArray,
    setOnRemoteCubesArray,
    setOnHostState,
    setOnGuestInput,
    setOnOpponentLeft,
    setOnOpponentReturned,
};
