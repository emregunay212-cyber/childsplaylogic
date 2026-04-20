// Ateş & Buz Network Katmanı — parent bilnetoyun Firebase instance üzerinden online 2 oyuncu senkronu
// Host = fireboy, Guest = watergirl. Her oyuncu kendi karakterini otoriter olarak simüle eder.

let myRole = null;       // 'host' | 'guest'
let lobbyId = null;
let abRef = null;        // firebase.database().ref('lobbies/<id>/ab')
let opponentName = 'Rakip';

let onRemotePlayer = null;
let onRemoteButtons = null;
let onRemoteDiamonds = null;
let onRemoteDoors = null;
let onLevelChanged = null;
let onRemoteDeath = null;
let onOpponentLeft = null;
let onRemoteButtonsArray = null;
let onRemoteLeversArray = null;
let onRemoteCubesArray = null;
let onHostState = null;
let onGuestInput = null;

let remoteListenerRefs = [];

function parseURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        role: params.get('role'),
        lobbyId: params.get('lobbyId'),
        opponentName: params.get('name') || 'Rakip',
    };
}

function initNetwork() {
    const params = parseURLParams();
    if (!params.role || !params.lobbyId) {
        console.log('[AB Network] URL params yok — offline mod');
        return false;
    }

    myRole = params.role;
    lobbyId = params.lobbyId;
    opponentName = params.opponentName;

    // Parent'ın Firebase instance'ına eriş
    const parentWin = window.parent;
    if (!parentWin || !parentWin.firebase) {
        console.warn('[AB Network] Parent Firebase bulunamadı — offline mod');
        return false;
    }

    try {
        // db script-scope const, window'a attach değil. Doğrudan firebase.database() kullan.
        const parentDb = parentWin.firebase.database();
        abRef = parentDb.ref('lobbies/' + lobbyId + '/ab');
    } catch (err) {
        console.error('[AB Network] Firebase ref hatası:', err);
        return false;
    }

    // Başlangıç state'i (sadece host yazar)
    if (myRole === 'host') {
        abRef.child('level').set(1);
        abRef.child('started').set(true);
    }

    // Opponent karakterini dinle
    const opField = myRole === 'host' ? 'iceState' : 'fireState';
    const opListener = abRef.child(opField).on('value', snap => {
        const v = snap.val();
        if (v && onRemotePlayer) onRemotePlayer(v);
    });
    remoteListenerRefs.push({ ref: abRef.child(opField), listener: opListener });

    // Butonlar
    const buttonListener = abRef.child('buttons').on('value', snap => {
        const v = snap.val();
        if (v && onRemoteButtons) onRemoteButtons(v);
    });
    remoteListenerRefs.push({ ref: abRef.child('buttons'), listener: buttonListener });

    // Elmaslar (toplanmış index listesi)
    const diamondListener = abRef.child('diamondsCollected').on('value', snap => {
        const v = snap.val();
        if (v && onRemoteDiamonds) onRemoteDiamonds(v);
    });
    remoteListenerRefs.push({ ref: abRef.child('diamondsCollected'), listener: diamondListener });

    // Kapı state
    const doorListener = abRef.child('doors').on('value', snap => {
        const v = snap.val();
        if (v && onRemoteDoors) onRemoteDoors(v);
    });
    remoteListenerRefs.push({ ref: abRef.child('doors'), listener: doorListener });

    // Seviye değişimi (host kontrolü)
    const levelListener = abRef.child('level').on('value', snap => {
        const v = snap.val();
        if (typeof v === 'number' && onLevelChanged) onLevelChanged(v);
    });
    remoteListenerRefs.push({ ref: abRef.child('level'), listener: levelListener });

    // Opponent ölüm bildirimi (respawn için)
    const deathListener = abRef.child(opField + 'Death').on('value', snap => {
        const v = snap.val();
        if (v && onRemoteDeath) onRemoteDeath(v);
    });
    remoteListenerRefs.push({ ref: abRef.child(opField + 'Death'), listener: deathListener });

    // Buton array sync (paylaşılan state)
    const btnArrListener = abRef.child('buttonsArray').on('value', snap => {
        const v = snap.val();
        if (v && onRemoteButtonsArray) onRemoteButtonsArray(v);
    });
    remoteListenerRefs.push({ ref: abRef.child('buttonsArray'), listener: btnArrListener });

    // Levye array sync
    const leverArrListener = abRef.child('leversArray').on('value', snap => {
        const v = snap.val();
        if (v && onRemoteLeversArray) onRemoteLeversArray(v);
    });
    remoteListenerRefs.push({ ref: abRef.child('leversArray'), listener: leverArrListener });

    // Küp array sync (sadece host yazar, guest okur)
    const cubeArrListener = abRef.child('cubesArray').on('value', snap => {
        const v = snap.val();
        if (v && onRemoteCubesArray) onRemoteCubesArray(v);
    });
    remoteListenerRefs.push({ ref: abRef.child('cubesArray'), listener: cubeArrListener });

    // Host-authoritative: host tam state yazar, guest okur
    if (myRole === 'guest') {
        const hostStateListener = abRef.child('hostState').on('value', snap => {
            const v = snap.val();
            if (v && onHostState) onHostState(v);
        });
        remoteListenerRefs.push({ ref: abRef.child('hostState'), listener: hostStateListener });
    }

    // Guest input: host guest'ten input alır
    if (myRole === 'host') {
        const guestInputListener = abRef.child('guestInput').on('value', snap => {
            const v = snap.val();
            if (v && onGuestInput) onGuestInput(v);
        });
        remoteListenerRefs.push({ ref: abRef.child('guestInput'), listener: guestInputListener });
    }

    console.log('[AB Network] Bağlandı, rol:', myRole, 'lobby:', lobbyId);
    return true;
}

function getMyRole() { return myRole; }
function getOpponentName() { return opponentName; }
function isOnline() { return abRef !== null; }

// Throttle: ağa sadece N ms'de bir gönder (30Hz ~= 33ms)
let lastPlayerBroadcast = 0;
const PLAYER_BROADCAST_MS = 33;

function broadcastPlayer(player) {
    if (!abRef) return;
    const now = Date.now();
    if (now - lastPlayerBroadcast < PLAYER_BROADCAST_MS) return;
    lastPlayerBroadcast = now;

    const field = myRole === 'host' ? 'fireState' : 'iceState';
    abRef.child(field).set({
        x: Math.round(player.position.x),
        y: Math.round(player.position.y),
        vx: Math.round(player.velocity.x * 10) / 10,
        vy: Math.round(player.velocity.y * 10) / 10,
        onBlock: player.isOnBlock ? 1 : 0,
        died: player.died ? 1 : 0,
        anim: player.currentAnimation || 'idle',
        t: now,
    });
}

function broadcastDeath() {
    if (!abRef) return;
    const field = myRole === 'host' ? 'fireStateDeath' : 'iceStateDeath';
    abRef.child(field).set({ t: Date.now() });
}

function broadcastButtonState(buttonIdx, pressed) {
    if (!abRef) return;
    abRef.child('buttons/' + buttonIdx).set(pressed ? 1 : 0);
}

function broadcastDiamondCollected(idx) {
    if (!abRef) return;
    abRef.child('diamondsCollected/' + idx).set(1);
}

function broadcastDoorState(element, atDoor) {
    if (!abRef) return;
    abRef.child('doors/' + element).set(atDoor ? 1 : 0);
}

function broadcastLevel(level) {
    if (!abRef || myRole !== 'host') return;
    abRef.child('level').set(level);
}

// Throttled paylaşılan durum broadcast'leri
let lastButtonsBroadcast = 0;
let lastLeversBroadcast = 0;
let lastCubesBroadcast = 0;
const BUTTONS_BROADCAST_MS = 50;   // 20Hz
const LEVERS_BROADCAST_MS = 50;    // 20Hz
const CUBES_BROADCAST_MS = 33;     // 30Hz

function broadcastButtonsArray(states) {
    if (!abRef) return;
    const now = Date.now();
    if (now - lastButtonsBroadcast < BUTTONS_BROADCAST_MS) return;
    lastButtonsBroadcast = now;
    abRef.child('buttonsArray').set(states);
}

function broadcastLeversArray(angles) {
    if (!abRef) return;
    const now = Date.now();
    if (now - lastLeversBroadcast < LEVERS_BROADCAST_MS) return;
    lastLeversBroadcast = now;
    // Float'ları kısalt (3 ondalık)
    const rounded = angles.map(a => Math.round(a * 1000) / 1000);
    abRef.child('leversArray').set(rounded);
}

function broadcastCubesArray(states) {
    if (!abRef || myRole !== 'host') return;
    const now = Date.now();
    if (now - lastCubesBroadcast < CUBES_BROADCAST_MS) return;
    lastCubesBroadcast = now;
    // Yuvarla
    const rounded = states.map(s => ({
        x: Math.round(s.x),
        y: Math.round(s.y),
        vx: Math.round(s.vx * 10) / 10,
        vy: Math.round(s.vy * 10) / 10,
    }));
    abRef.child('cubesArray').set(rounded);
}

// Host-authoritative: host tüm state'i tek obje olarak yazar
// 30Hz yeterli (Firebase bandwidth sınırı); 60Hz'de throttle + gecikme oluyor
let lastFullStateBroadcast = 0;
const FULL_STATE_BROADCAST_MS = 33;  // 30Hz

function broadcastFullState(state) {
    if (!abRef || myRole !== 'host') return;
    const now = Date.now();
    if (now - lastFullStateBroadcast < FULL_STATE_BROADCAST_MS) return;
    lastFullStateBroadcast = now;
    abRef.child('hostState').set(state);
}

// Guest input: guest kendi keys.pressed durumunu host'a gönderir
let lastInputBroadcast = 0;
const INPUT_BROADCAST_MS = 16;  // 60Hz — input gecikmesini azalt

function broadcastGuestInput(keys) {
    if (!abRef || myRole !== 'guest') return;
    const now = Date.now();
    if (now - lastInputBroadcast < INPUT_BROADCAST_MS) return;
    lastInputBroadcast = now;
    abRef.child('guestInput').set({
        left: keys.left ? 1 : 0,
        right: keys.right ? 1 : 0,
        up: keys.up ? 1 : 0,
    });
}

function clearLevelState() {
    if (!abRef) return;
    abRef.child('buttons').remove();
    abRef.child('diamondsCollected').remove();
    abRef.child('doors').remove();
}

function disconnectNetwork() {
    for (const { ref, listener } of remoteListenerRefs) {
        try { ref.off('value', listener); } catch (e) {}
    }
    remoteListenerRefs = [];
    abRef = null;
}

// Callback setters
function setOnRemotePlayer(fn) { onRemotePlayer = fn; }
function setOnRemoteButtons(fn) { onRemoteButtons = fn; }
function setOnRemoteDiamonds(fn) { onRemoteDiamonds = fn; }
function setOnRemoteDoors(fn) { onRemoteDoors = fn; }
function setOnLevelChanged(fn) { onLevelChanged = fn; }
function setOnRemoteDeath(fn) { onRemoteDeath = fn; }
function setOnRemoteButtonsArray(fn) { onRemoteButtonsArray = fn; }
function setOnRemoteLeversArray(fn) { onRemoteLeversArray = fn; }
function setOnRemoteCubesArray(fn) { onRemoteCubesArray = fn; }
function setOnHostState(fn) { onHostState = fn; }
function setOnGuestInput(fn) { onGuestInput = fn; }

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
};
