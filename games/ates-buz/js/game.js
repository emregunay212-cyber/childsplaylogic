import { Player } from "./player.js";
import { Sprite } from "./sprite.js";
import { levels } from "./collisionBlocks.js";
import { createObjectsFromArray } from "./collisions.js";
import { Diamond } from "./ingameAssets/diamond.js";
import { Button } from "./ingameAssets/button.js";
import { Ramp } from "./ingameAssets/ramp.js";
import { pauseButton, menuButtons, checkButtonCollision } from "./menu/buttons.js";
import {
    getMousePos,
    continueAnimation,
    setContinueAnimation,
    endGame,
    currentLevel,
    gameData,
    setEndGame,
    menuActive,
    setMenuActive,
    setCurrentLevel,
    setAllDiamonds,
    setLevelCompleted,
    levelCompleted,
    allDiamonds,
    menuLevels,
    menuLevelsPath,
    saveDataToLocalStorage,
} from "./helpers.js";
import { drawInGameMenu, drawMenu, checkMenuDiamondsCollision } from "./menu/menus.js";
import { Lever } from "./ingameAssets/lever.js";
import { Cube } from "./ingameAssets/cube.js";
import { Door } from "./ingameAssets/door.js";
import { quests } from "./menu/quests.js";
import { drawTime, formatTime, levelTime } from "./time.js";
import { Bridge } from "./ingameAssets/bridge.js";
import { Ball } from "./ingameAssets/ball.js";
import {
    isOnline,
    getMyRole,
    broadcastFullState,
    broadcastGuestInput,
    setOnHostState,
    setOnGuestInput,
} from "./network.js";

// Host-authoritative state
let latestHostState = null;
let latestGuestInput = { left: false, right: false, up: false };

// Bilnetoyun ayarı: hız (orijinal 2.0 / -4.35)
const MOVE_SPEED = 2.4;
const JUMP_VELOCITY = -4.35;

let bgBlocks, died, menuButtonPressed, pauseGame, collisionBlocks, ponds;

let allAssets = [];
let allPlayers = [];
let allButtons = [];
let allLevers = [];
let allCubes = [];
let allDoors = [];
let allBridges = [];
let allBalls = [];
let allRamps = [];

let startedTime;
let pausedTime = 0;
let pausedStartTime;

const background = new Sprite({
    position: {
        x: 0,
        y: 0,
    },
    imgSrc: `./img/maps/bg.png`,
});

function startGame() {
    died = false;
    menuButtonPressed = null;
    pauseGame = false;

    allAssets = [];
    allPlayers = [];
    setAllDiamonds([]);
    allButtons = [];
    allLevers = [];
    allCubes = [];
    allDoors = [];
    allBridges = [];
    allBalls = [];
    allRamps = [];

    setLevelCompleted(false);

    startedTime = Date.now();
    pausedTime = 0;

    const values = createObjectsFromArray(levels[currentLevel]);
    collisionBlocks = values.objects;
    ponds = values.ponds;

    bgBlocks = new Sprite({
        position: {
            x: 0,
            y: 0,
        },
        imgSrc: `./img/maps/level${currentLevel}.png`,
    });

    //diamonds
    gameData.diamonds[currentLevel].forEach((diamond) => {
        allDiamonds.push(
            new Diamond({
                position: diamond.position,
                type: diamond.type,
            })
        );
    });

    //buttons
    if (gameData.buttons[currentLevel]) {
        gameData.buttons[currentLevel].forEach((buttonGroup) => {
            const color = buttonGroup.ramp.color;
            const finalColor = buttonGroup.ramp.finalColor;

            const ramp = new Ramp({
                position: { ...buttonGroup.ramp.position },
                boxCount: buttonGroup.ramp.boxCount,
                color,
                finalColor,
                finalPosition: buttonGroup.ramp.finalPosition,
                rotated: buttonGroup.ramp.rotated,
            });
            allAssets.push(ramp);
            allRamps.push(ramp);

            let groupButtons = [];

            buttonGroup.buttons.forEach((button) => {
                const newButton = new Button({
                    position: { ...button.position },
                    color,
                    finalColor,
                    ramp,
                });
                groupButtons.push(newButton);
                allAssets.push(newButton);
            });
            allButtons.push(groupButtons);
        });
    }

    //levers
    if (gameData.levers[currentLevel]) {
        gameData.levers[currentLevel].forEach((leverGroup) => {
            const color = leverGroup.ramp.color;
            const finalColor = leverGroup.ramp.finalColor;

            const ramp = new Ramp({
                position: { ...leverGroup.ramp.position },
                boxCount: leverGroup.ramp.boxCount,
                color,
                finalColor,
                finalPosition: leverGroup.ramp.finalPosition,
                rotated: leverGroup.ramp.rotated,
            });
            allAssets.push(ramp);
            allRamps.push(ramp);

            const lever = new Lever({
                position: leverGroup.lever.position,
                color,
                finalColor,
                ramp,
            });
            allLevers.push(lever);
            allAssets.push(lever);
        });
    }

    //cubes
    if (gameData.cubes[currentLevel]) {
        gameData.cubes[currentLevel].forEach((cube) => {
            const newCube = new Cube({
                position: { ...cube.position },
                collisionBlocks,
                allAssets,
                players: allPlayers,
            });
            allCubes.push(newCube);
            allAssets.push(newCube);
        });
    }

    //bridges
    if (gameData.bridges[currentLevel]) {
        gameData.bridges[currentLevel].forEach((bridge) => {
            const newBridge = new Bridge({
                position: { ...bridge.position },
                chainsCount: bridge.chainsCount,
            });

            allBridges.push(newBridge);
            allAssets.push(newBridge);
        });
    }

    //balls
    if (gameData.balls[currentLevel]) {
        gameData.balls[currentLevel].forEach((ball) => {
            const newBall = new Ball({
                position: { ...ball.position },
                collisionBlocks,
                allAssets,
                allPlayers,
            });

            allBalls.push(newBall);
            allAssets.push(newBall);
        });
    }

    //doors
    gameData.doors[currentLevel].forEach((door) => {
        const newDoor = new Door({
            position: door.position,
            element: door.element,
        });
        // Guest: kapı animasyonu host broadcast'teki currentFrame'den — lokal openDoor no-op
        if (isOnline() && getMyRole() === 'guest') {
            newDoor.openDoor = () => {};
        }
        allDoors.push(newDoor);
    });

    //players
    for (const player in gameData.players) {
        const currentPlayer = gameData.players[player];

        allPlayers.push(
            new Player({
                position: { ...currentPlayer[currentLevel].position },
                collisionBlocks,
                allAssets,
                diamonds: allDiamonds,
                doors: allDoors,
                imgSrc: currentPlayer.constants.imgSrc,
                element: currentPlayer.constants.element,
                frameRate: 1,
                frameDelay: 4,
                imgRows: 4,
                currentRow: 1,
                keys: {
                    // Online modda iki oyuncu da ok tuşları kullanır (her biri kendi karakterini)
                    up: isOnline() ? "ArrowUp" : currentPlayer.constants.keys.up,
                    left: isOnline() ? "ArrowLeft" : currentPlayer.constants.keys.left,
                    right: isOnline() ? "ArrowRight" : currentPlayer.constants.keys.right,
                    pressed: {
                        up: false,
                        left: false,
                        right: false,
                    },
                },
                animations: {
                    idle: {
                        currentRow: 1,
                        frameRate: 1,
                    },
                    left: {
                        currentRow: 2,
                        frameRate: 8,
                        flipImage: true,
                    },
                    right: {
                        currentRow: 2,
                        frameRate: 8,
                    },
                    up: {
                        currentRow: 3,
                        frameRate: 1,
                    },
                    down: {
                        currentRow: 4,
                        frameRate: 1,
                    },
                },
                legs: new Sprite({
                    position: {
                        x: currentPlayer[currentLevel].position.x + 37,
                        y: currentPlayer[currentLevel].position.y + 72,
                    },
                    imgSrc: currentPlayer.constants.legsImgSrc,
                    imgRows: 2,
                    currentRow: 1,
                    frameRate: 1,
                    frameDelay: 4,
                    animations: {
                        idle: {
                            currentRow: 1,
                            frameRate: 1,
                        },
                        left: {
                            currentRow: 2,
                            flipImage: true,
                            frameRate: 8,
                        },
                        right: {
                            currentRow: 2,
                            frameRate: 8,
                        },
                    },
                }),
            })
        );
    }

    // Artık elmas toplama host'un broadcastFullState'i içinde diamondsCollected[] array'i ile sync ediliyor,
    // ayrı callback'e gerek yok.
}

function playGame() {
    drawMenu();

    let now;
    let delta;
    let fixedFps = 60;
    let interval = 1000 / fixedFps;
    let then = Date.now();

    let time;

    function animation() {
        now = Date.now();
        delta = now - then;

        if (delta > interval) {
            then = now - (delta % interval);

            // ── Host-authoritative: guest uzak state'i her frame uygular ──
            if (isOnline() && getMyRole() === 'guest' && latestHostState) {
                applyHostState(latestHostState);
            }
            // ── Host-authoritative: host guest input'unu kendi water karakterine uygular ──
            if (isOnline() && getMyRole() === 'host') {
                const water = allPlayers.find(p => p.element === 'water');
                if (water) {
                    // Jump edge detection: up becomes true → velocity y impulse
                    if (latestGuestInput.up && !water.keys.pressed.up) {
                        if (water.isOnBlock && !water.rampBlocked) {
                            water.velocity.y = JUMP_VELOCITY;
                        }
                    }
                    water.keys.pressed.left = !!latestGuestInput.left;
                    water.keys.pressed.right = !!latestGuestInput.right;
                    water.keys.pressed.up = !!latestGuestInput.up;
                }
            }

            background.draw();

            // Guest: diamond check yapma — host belirliyor
            if (!(isOnline() && getMyRole() === 'guest')) {
                allPlayers.forEach((player) => {
                    player.checkDiamonds();
                });
            }

            allDiamonds.forEach((diamond) => {
                diamond.draw();
            });

            const isGuestMode = isOnline() && getMyRole() === 'guest';
            for (const buttons of allButtons) {
                let movedRamp = false;
                for (const button of buttons) {
                    if (button.pressed) {
                        if (button.position.y == button.finalPosition.y) {
                            // Guest: host belirliyor, standing check yapma
                            if (!isGuestMode) {
                                let standingOnButton = false;
                                allPlayers.forEach((player) => {
                                    if (button.checkStandingOnButton(player, player.hitbox.legs)) {
                                        standingOnButton = true;
                                    }
                                });
                                allCubes.forEach((cube) => {
                                    if (button.checkStandingOnButton(cube, cube.hitbox)) {
                                        standingOnButton = true;
                                    }
                                });
                                allBalls.forEach((ball) => {
                                    if (button.checkStandingOnButton(ball, ball.hitbox)) {
                                        standingOnButton = true;
                                    }
                                });
                                if (!standingOnButton) {
                                    button.pressed = false;
                                    button.move("up");
                                }
                            }
                        } else {
                            button.move("down");
                        }
                    } else {
                        if (button.position.y != button.startPosition.y) {
                            button.move("up");
                        }
                    }

                    button.fillColor();
                    button.draw();
                    // Guest: ramp host'tan sync, lokal move yapma (sadece draw)
                    if (button.pressed && !movedRamp) {
                        movedRamp = true;
                        if (!isGuestMode) button.run();
                        else button.ramp.draw(button.pressed);
                    }
                }
                if (!movedRamp) {
                    if (!isGuestMode) buttons[0].run();
                    else buttons[0].ramp.draw(false);
                }
            }

            allCubes.forEach((cube) => {
                cube.draw();
                // Online'da küp sadece host tarafında fizik hesaplar; guest sync'ten pozisyonu alır
                if (!isOnline() || getMyRole() === 'host') {
                    cube.update();
                    if (cube.rampBlocked) {
                        allAssets.forEach((asset) => {
                            if (
                                asset.hitbox.position.y ==
                                Math.round(cube.hitbox.position.y + cube.hitbox.height)
                            ) {
                                asset.blocked = true;
                                asset.blockedDirection = "up";
                            }
                        });
                    }
                }
            });

            allLevers.forEach((lever) => {
                if (!isGuestMode) lever.run();
                else lever.ramp.draw(lever.pressed);
            });

            allDoors.forEach((door) => {
                door.draw();
                door.pressed = false;
            });

            allBalls.forEach((ball) => {
                ball.draw();
                // Online'da ball sadece host tarafında fizik; guest sync'ten pozisyon alır
                if (!isOnline() || getMyRole() === 'host') {
                    ball.update();
                }
            });

            allBridges.forEach((bridge) => {
                bridge.drawChain();
                bridge.draw();
            });

            bgBlocks.draw();
            // collisionBlocks.forEach((collisionBlock) => {
            //     collisionBlock.draw();
            // });

            allLevers.forEach((lever) => {
                // checkAngle: guest'te de çalışsın ki lever.pressed angle'dan türetilsin (rampa hareketi için)
                // Host'un broadcast'i her frame angle'ı overwrite eder — drift sorunu olmaz
                lever.checkAngle();
                lever.drawLever();
            });

            allPlayers.forEach((player) => {
                // Guest mode: her iki karakter için de fizik çalıştırma, sadece çiz
                if (isGuestMode) {
                    player.legs.position = {
                        x: player.position.x + 37,
                        y: player.position.y + 72,
                    };
                    player.hitboxPositionCalc();
                    // Animasyon state'i host'tan gelen anim'a göre ayarlandı
                    player.draw();
                    player.legs.draw();
                    return;
                }
                // Host / offline mode: uzak oyuncu var mı? (Host kendi + guest su'yu simüle ediyor — iki de local)
                if (false && isOnline() && !isMyPlayer(player)) {
                    // Remote pozisyon zaten listener'da set edildi. Sadece hitbox ve legs pozisyonunu güncelle.
                    player.legs.position = {
                        x: player.position.x + 37,
                        y: player.position.y + 72,
                    };
                    player.hitboxPositionCalc();
                    player.draw();
                    player.legs.draw();
                    player.checkDoors();
                    return;
                }

                if (player.keys.pressed.left) {
                    player.velocity.x = -MOVE_SPEED;
                    player.changeSprite("left");
                } else if (player.keys.pressed.right) {
                    player.velocity.x = MOVE_SPEED;
                    player.changeSprite("right");
                } else {
                    player.velocity.x = 0;
                    if (player.velocity.y < -1.5) {
                        player.changeSprite("up");
                    } else if (player.velocity.y > 1.5) {
                        player.changeSprite("down");
                    } else {
                        player.changeSprite("idle");
                    }
                }

                player.draw();
                player.legs.draw();
                player.update();

                if (player.rampBlocked) {
                    allAssets.forEach((asset) => {
                        if (
                            asset.hitbox.position.y ==
                            Math.round(player.hitbox.position.y + player.hitbox.height)
                        ) {
                            asset.blocked = true;
                            asset.blockedDirection = "up";
                        }
                    });
                }

                player.checkDoors();

                if (player.died) {
                    died = true;
                }

            });

            ponds.forEach((pond) => {
                pond.draw();
            });

            // ── Host-authoritative broadcast ──
            if (isOnline()) {
                if (getMyRole() === 'host') {
                    // Host tam state yayınlar
                    const buttonStates = [];
                    for (const group of allButtons) {
                        for (const btn of group) buttonStates.push(btn.pressed ? 1 : 0);
                    }
                    const fire = allPlayers.find(p => p.element === 'fire');
                    const water = allPlayers.find(p => p.element === 'water');
                    const fireDoor = allDoors.find(d => d.element === 'fire');
                    const waterDoor = allDoors.find(d => d.element === 'water');
                    broadcastFullState({
                        levelIdx: currentLevel,
                        fire: fire ? {
                            x: Math.round(fire.position.x), y: Math.round(fire.position.y),
                            vx: Math.round(fire.velocity.x * 10) / 10,
                            vy: Math.round(fire.velocity.y * 10) / 10,
                            anim: fire.currentAnimation || 'idle',
                            died: fire.died ? 1 : 0,
                        } : null,
                        water: water ? {
                            x: Math.round(water.position.x), y: Math.round(water.position.y),
                            vx: Math.round(water.velocity.x * 10) / 10,
                            vy: Math.round(water.velocity.y * 10) / 10,
                            anim: water.currentAnimation || 'idle',
                            died: water.died ? 1 : 0,
                        } : null,
                        buttons: buttonStates,
                        levers: allLevers.map(l => Math.round(l.angle * 1000) / 1000),
                        cubes: allCubes.map(c => ({
                            x: Math.round(c.position.x), y: Math.round(c.position.y),
                        })),
                        balls: allBalls.map(b => ({
                            x: Math.round(b.position.x), y: Math.round(b.position.y),
                            a: Math.round((b.angle || 0) * 100) / 100,
                        })),
                        ramps: allRamps.map(r => ({
                            x: Math.round(r.position.x), y: Math.round(r.position.y),
                        })),
                        diamondsCollected: allDiamonds.map(d => d.collected ? 1 : 0),
                        doorFire: fireDoor ? { pressed: fireDoor.pressed ? 1 : 0, frame: fireDoor.currentFrame || 0, opened: fireDoor.opened ? 1 : 0 } : null,
                        doorWater: waterDoor ? { pressed: waterDoor.pressed ? 1 : 0, frame: waterDoor.currentFrame || 0, opened: waterDoor.opened ? 1 : 0 } : null,
                        time: (now - startedTime - pausedTime),
                    });
                } else if (getMyRole() === 'guest') {
                    // Guest kendi keys.pressed'ini host'a gönderir (water karakterinin keys'i)
                    const water = allPlayers.find(p => p.element === 'water');
                    if (water) broadcastGuestInput(water.keys.pressed);
                }
            }

            //time calc
            time = now - startedTime - pausedTime;
            const formatedTime = formatTime(time);
            drawTime(formatedTime.minutes, formatedTime.seconds);

            //both doors opened — sadece host level geçişini tetikler; guest host'un state'inden yeni level'ı alır
            const amHostOrOffline = !isOnline() || getMyRole() === 'host';
            if (amHostOrOffline && !levelCompleted && allDoors[0].opened == true && allDoors[1].opened == true) {
                setLevelCompleted(true);
                levelTime.minutes = formatedTime.minutes;
                levelTime.seconds = formatedTime.seconds;
                playersDissapearing();
                return;
            }

            pauseButton.draw();

            if (died) {
                // Online: GAME OVER göstermek yerine lokal respawn yap (her oyuncu kendi başlangıç konumuna)
                if (isOnline()) {
                    allPlayers.forEach((p) => {
                        if (p.died) {
                            const playerKey = p.element === 'fire' ? 'fireboy' : 'watergirl';
                            const data = gameData.players[playerKey];
                            const startPos = data && data[currentLevel] && data[currentLevel].position;
                            if (startPos) {
                                p.position.x = startPos.x;
                                p.position.y = startPos.y;
                            }
                            p.velocity.x = 0;
                            p.velocity.y = 0;
                            p.died = false;
                            p.isOnBlock = false;
                            for (const k in p.keys.pressed) p.keys.pressed[k] = false;
                        }
                    });
                    died = false;
                } else {
                    setMenuActive("lost");
                    drawMenuAnimation(menuActive, "up");
                    return;
                }
            } else if (pauseGame) {
                setMenuActive("paused");
                drawMenuAnimation(menuActive, "up");
                return;
            }
        }
        requestAnimationFrame(animation);
    }

    function drawAll() {
        background.draw();
        allDiamonds.forEach((diamond) => {
            diamond.draw();
        });
        allButtons.forEach((buttonGroup) => {
            buttonGroup.forEach((button) => {
                button.fillColor();
                button.draw();
                button.ramp.draw(button.pressed);
            });
        });
        allCubes.forEach((cube) => {
            cube.draw();
        });
        allLevers.forEach((lever) => {
            lever.ramp.draw();
        });
        allBridges.forEach((bridge) => {
            bridge.drawChain();
            bridge.draw();
        });
        allDoors.forEach((door) => {
            door.draw();
        });
        allBalls.forEach((ball) => {
            ball.draw();
        });
        bgBlocks.draw();
        // collisionBlocks.forEach((collisionBlock) => {
        //     collisionBlock.draw();
        // });
        allLevers.forEach((lever) => {
            lever.drawLever();
        });
        allPlayers.forEach((player) => {
            player.draw();
            player.legs.draw();
        });
        ponds.forEach((pond) => {
            pond.draw();
        });
        const formatedTime = formatTime(time);
        drawTime(formatedTime.minutes, formatedTime.seconds);
        pauseButton.draw();
    }

    function playersDissapearing() {
        let opacity = 1;
        const dissapearing = setInterval(() => {
            opacity -= 0.05;
            if (opacity <= 0) {
                opacity = 0;
                clearInterval(dissapearing);

                let questCount = 0;
                menuLevels[currentLevel].quests.forEach((quest) => {
                    quest.setVariable();
                    quest.check();
                    if (quest.completed) {
                        if (menuLevels[currentLevel].quests.length == 1) {
                            questCount += 2;
                        } else {
                            questCount++;
                        }
                    }
                });
                if (questCount > menuLevels[currentLevel].questsStatus) {
                    menuLevels[currentLevel].setQuestsStatus(questCount);
                }

                menuLevels[currentLevel].levelsUnlocking.forEach((index) => {
                    menuLevels[index].unlocked = true;
                });
                menuLevels[currentLevel].pathUnlocking.forEach((index) => {
                    menuLevelsPath[index].unlocked = true;
                });

                saveDataToLocalStorage();

                // Online modda "won" menüsünü atla; host otomatik sonraki seviyeye geçer,
                // guest host'tan gelen yeni level'ı uygular.
                if (isOnline()) {
                    if (getMyRole() === 'host') {
                        const nextLevel = currentLevel + 1;
                        if (nextLevel <= 6) {
                            setCurrentLevel(nextLevel);
                            setLevelCompleted(false);
                            setMenuActive(null);
                            startGame();
                            animation();
                        } else {
                            // Tüm seviyeler tamam
                            setMenuActive("won");
                            drawMenuAnimation(menuActive, "up");
                        }
                    }
                    // Guest: yeni level hostState.levelIdx ile gelecek — animation loop tekrar başlatılmayacak;
                    // applyHostState level değişimini algılayıp reload yapacak.
                    return;
                }

                setMenuActive("won");
                drawMenuAnimation(menuActive, "up");
            }
            allDoors.forEach((door) => {
                door.draw();
            });
            allPlayers.forEach((player) => {
                player.opacity = opacity;
                player.draw();
                player.legs.opacity = opacity;
                player.legs.draw();
            });
        }, 50);
    }

    function drawMenuAnimation(menuName, direction) {
        let transform = 1000;
        let value = 10;
        if (direction == "down") {
            transform = 0;
            value = -10;
        }
        const endTransform = Math.abs(transform - 1000);

        const menuAnimation = setInterval(() => {
            drawAll();

            transform -= value;
            drawInGameMenu(menuName, transform);
            if (transform == endTransform) {
                clearInterval(menuAnimation);
                if (direction == "down") {
                    animation();
                    setContinueAnimation(false);
                }
            }
        }, 1);
    }

    canvas.onmousedown = (event) => {
        if (menuButtonPressed) return;

        const mousePos = getMousePos(event);

        for (const menuButton in menuButtons[menuActive]) {
            if (checkButtonCollision(mousePos, menuButtons[menuActive][menuButton])) {
                menuButtonPressed = menuButton;
                menuButtons[menuActive][menuButton].scaleDown();
                menuButtons[menuActive][menuButton].draw();
            }
        }
    };

    canvas.onmouseup = (event) => {
        const mousePos = getMousePos(event);

        if (!menuActive) {
            if (checkButtonCollision(mousePos, pauseButton)) {
                pauseGame = true;
                allPlayers.forEach((player) => {
                    for (const key in player.keys.pressed) {
                        player.keys.pressed[key] = false;
                    }
                });
                pausedStartTime = Date.now();
            }
            return;
        }

        if (menuActive == "mainMenu") {
            for (const index in menuLevels) {
                if (checkMenuDiamondsCollision(mousePos, menuLevels[index])) {
                    setCurrentLevel(index);
                    setMenuActive(null);
                    startGame();
                    animation();
                }
            }
        }

        for (const menuButton in menuButtons[menuActive]) {
            if (
                checkButtonCollision(mousePos, menuButtons[menuActive][menuButton]) &&
                menuButtonPressed == menuButton
            ) {
                menuButtons[menuActive][menuButton].resetSize();
                menuButtons[menuActive][menuButton].draw();

                setTimeout(() => {
                    if (!menuActive) return;

                    menuButtons[menuActive][menuButton].run();
                    pauseGame = false;

                    if (continueAnimation) {
                        drawMenuAnimation(menuActive, "down");
                        pausedTime += Date.now() - pausedStartTime;
                    }
                    if (endGame) {
                        setEndGame(false);
                        startGame();
                        animation();
                    }
                    if (menuActive != "mainMenu") {
                        setMenuActive(null);
                    }
                    menuButtonPressed = null;
                }, 200);
                return;
            }
        }

        if (menuButtonPressed) {
            menuButtons[menuActive][menuButtonPressed].resetSize();
            menuButtons[menuActive][menuButtonPressed].draw();
            menuButtonPressed = null;
        }
    };

    // Online modda: host sadece fire'ı, guest sadece water'ı kontrol eder
    function isMyPlayer(player) {
        if (!isOnline()) return true;
        const role = getMyRole();
        if (role === 'host' && player.element === 'fire') return true;
        if (role === 'guest' && player.element === 'water') return true;
        return false;
    }

    window.addEventListener("keydown", (event) => {
        if (pauseGame) return;
        allPlayers.forEach((player) => {
            if (!isMyPlayer(player)) return;
            switch (event.key) {
                case player.keys.up:
                    if (isOnline() && getMyRole() === 'guest') {
                        // Guest: fizik yerel çalışmıyor; sadece key kaydet, host karar verir
                        player.keys.pressed.up = true;
                    } else if (player.isOnBlock && !player.keys.pressed.up && !player.rampBlocked) {
                        player.velocity.y = JUMP_VELOCITY;
                        player.keys.pressed.up = true;
                    }
                    break;
                case player.keys.left:
                    player.keys.pressed.left = true;
                    break;
                case player.keys.right:
                    player.keys.pressed.right = true;
                    break;
            }
        });
    });

    window.addEventListener("keyup", (event) => {
        if (pauseGame) return;

        allPlayers.forEach((player) => {
            if (!isMyPlayer(player)) return;
            switch (event.key) {
                case player.keys.up:
                    player.keys.pressed.up = false;
                    break;
                case player.keys.left:
                    player.keys.pressed.left = false;
                    break;
                case player.keys.right:
                    player.keys.pressed.right = false;
                    break;
            }
        });
    });

    document.addEventListener("visibilitychange", () => {
        allPlayers.forEach((player) => {
            for (const key in player.keys.pressed) {
                player.keys.pressed[key] = false;
            }
        });
    });

    document.addEventListener("contextmenu", () => {
        allPlayers.forEach((player) => {
            for (const key in player.keys.pressed) {
                player.keys.pressed[key] = false;
            }
        });
    });

    // ── Host-authoritative state uygulama (guest tarafı) ──────────
    function applyHostState(st) {
        if (!st) return;
        // Level değişimi: host yeni seviyeye geçtiyse guest de yüklesin
        if (typeof st.levelIdx === 'number' && st.levelIdx !== currentLevel && st.levelIdx >= 1 && st.levelIdx <= 6) {
            setCurrentLevel(st.levelIdx);
            setLevelCompleted(false);
            setMenuActive(null);
            startGame();
            return; // yeni level yüklendi, bu frame için state uygulamayı atla
        }
        // Oyuncular
        const fire = allPlayers.find(p => p.element === 'fire');
        const water = allPlayers.find(p => p.element === 'water');
        if (fire && st.fire) {
            fire.position.x = st.fire.x;
            fire.position.y = st.fire.y;
            fire.velocity.x = st.fire.vx || 0;
            fire.velocity.y = st.fire.vy || 0;
            fire.died = !!st.fire.died;
            if (st.fire.anim) try { fire.changeSprite(st.fire.anim); } catch (e) {}
        }
        if (water && st.water) {
            water.position.x = st.water.x;
            water.position.y = st.water.y;
            water.velocity.x = st.water.vx || 0;
            water.velocity.y = st.water.vy || 0;
            water.died = !!st.water.died;
            if (st.water.anim) try { water.changeSprite(st.water.anim); } catch (e) {}
        }
        // Butonlar
        if (Array.isArray(st.buttons)) {
            let idx = 0;
            for (const group of allButtons) {
                for (const btn of group) {
                    btn.pressed = st.buttons[idx] === 1;
                    idx++;
                }
            }
        }
        // Levyeler
        if (Array.isArray(st.levers)) {
            st.levers.forEach((angle, i) => {
                if (allLevers[i] && typeof angle === 'number') allLevers[i].angle = angle;
            });
        }
        // Küpler
        if (Array.isArray(st.cubes)) {
            st.cubes.forEach((s, i) => {
                if (allCubes[i] && s) {
                    allCubes[i].position.x = s.x;
                    allCubes[i].position.y = s.y;
                }
            });
        }
        // Toplar
        if (Array.isArray(st.balls)) {
            st.balls.forEach((s, i) => {
                if (allBalls[i] && s) {
                    allBalls[i].position.x = s.x;
                    allBalls[i].position.y = s.y;
                    if (typeof s.a === 'number') allBalls[i].angle = s.a;
                }
            });
        }
        // Rampalar
        if (Array.isArray(st.ramps)) {
            st.ramps.forEach((s, i) => {
                if (allRamps[i] && s) {
                    const dx = s.x - allRamps[i].position.x;
                    const dy = s.y - allRamps[i].position.y;
                    if (dx !== 0 || dy !== 0) {
                        // Rampa parçalarıyla birlikte tüm child'ları kaydır
                        allRamps[i].position.x = s.x;
                        allRamps[i].position.y = s.y;
                        allRamps[i].hitbox.position.x += dx;
                        allRamps[i].hitbox.position.y += dy;
                        if (allRamps[i].ramps) {
                            allRamps[i].ramps.forEach(r => {
                                r.position.x += dx;
                                r.position.y += dy;
                            });
                        }
                    }
                }
            });
        }
        // Elmaslar
        if (Array.isArray(st.diamondsCollected)) {
            st.diamondsCollected.forEach((c, i) => {
                if (allDiamonds[i]) allDiamonds[i].collected = (c === 1);
            });
        }
        // Kapılar
        const fireDoor = allDoors.find(d => d.element === 'fire');
        const waterDoor = allDoors.find(d => d.element === 'water');
        if (fireDoor && st.doorFire) {
            fireDoor.pressed = !!st.doorFire.pressed;
            if (typeof st.doorFire.frame === 'number') fireDoor.currentFrame = st.doorFire.frame;
            fireDoor.opened = !!st.doorFire.opened;
        }
        if (waterDoor && st.doorWater) {
            waterDoor.pressed = !!st.doorWater.pressed;
            if (typeof st.doorWater.frame === 'number') waterDoor.currentFrame = st.doorWater.frame;
            waterDoor.opened = !!st.doorWater.opened;
        }
    }

    // ── Online mode kurulumu (host-authoritative) ─────────────────
    if (isOnline()) {
        // Guest: host'tan tam state al
        setOnHostState((state) => {
            latestHostState = state;
        });
        // Host: guest input'unu al
        setOnGuestInput((input) => {
            latestGuestInput = {
                left: !!(input && input.left),
                right: !!(input && input.right),
                up: !!(input && input.up),
            };
        });

        // Auto-start: level 1'den başla, menüyü atla
        setCurrentLevel(1);
        setMenuActive(null);
        startGame();
        animation();
    }
}

export { playGame };
