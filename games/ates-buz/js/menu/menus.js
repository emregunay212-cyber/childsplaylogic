import { Sprite } from "../sprite.js";
import { menuButtons, unlockAllDiamondsButton } from "./buttons.js";
import {
    canvas,
    ctx,
    currentLevel,
    menuLevels,
    menuLevelsPath,
    setMenuLevels,
    setMenuLevelsPath,
} from "../helpers.js";
import { levelTime } from "../time.js";
import { drawArrow, quests } from "./quests.js";
import { MenuLevel } from "./menuLevel.js";

const menuBg = new Sprite({
    position: {
        x: canvas.width * 0.1,
        y: canvas.height * 0.2,
    },
    imgSrc: "./img/menu_bg.png",
});

const menuDiamondsBorderColor = {
    true: "#fac702",
    false: "#4d3b0e",
};

const menusTexts = {
    lost: () => {
        const t = "OYUN BİTTİ";
        ctx.font = "120px Cinzel";
        const x = (canvas.width - ctx.measureText(t).width) / 2;
        const y = menuBg.position.y + canvas.height * 0.25;
        ctx.lineWidth = 7;
        ctx.strokeStyle = "black";
        ctx.strokeText(t, x, y);

        ctx.fillStyle = "yellow";
        ctx.fillText(t, x, y);
    },
    paused: () => {
        const t = "DURAKLADI";
        ctx.font = "120px Cinzel";
        const x = (canvas.width - ctx.measureText(t).width) / 2;
        const y = menuBg.position.y + canvas.height * 0.25;
        ctx.lineWidth = 7;
        ctx.strokeStyle = "black";
        ctx.strokeText(t, x, y);

        ctx.fillStyle = "yellow";
        ctx.fillText(t, x, y);
    },
    won: () => {
        const fullText = `Süre : ${levelTime.minutes}:${levelTime.seconds}`;
        //time
        ctx.font = "50px Cinzel";
        ctx.lineWidth = 7;
        ctx.strokeStyle = "black";
        ctx.strokeText(fullText, 600, menuBg.position.y + 160);

        ctx.fillStyle = "yellow";
        ctx.fillText(fullText, 600, menuBg.position.y + 160);

        menuLevels[currentLevel].quests.forEach((quest) => {
            quest.updatePositionY(menuBg.position.y);
            quest.draw();
        });

        drawArrow(menuBg.position.y);

        menuWonDiamond.position.y = menuBg.position.y + 280;
        menuWonDiamond.setQuestsStatus(menuLevels[currentLevel].questsStatus);
        menuWonDiamond.drawFullDiamond();
    },
};

let menuWonDiamond = new MenuLevel({
    position: {
        x: 900,
        y: 270,
    },
    unlocked: true,
});

function drawInGameMenu(name, transform) {
    menuBg.position.y += transform;
    menuBg.draw();

    menusTexts[name]();

    for (const btnName in menuButtons[name]) {
        menuButtons[name][btnName].updatePositionY(menuBg.position.y);
        menuButtons[name][btnName].draw();
    }

    menuBg.position.y -= transform;
}

function drawMenu() {
    ctx.fillStyle = "#5c4614";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let fullText = "Fireboy";
    ctx.font = "70px Cinzel";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "black";
    ctx.strokeText(fullText, canvas.width * 0.23, canvas.height * 0.1);

    ctx.fillStyle = "red";
    ctx.fillText(fullText, canvas.width * 0.23, canvas.height * 0.1);

    fullText = "and";
    ctx.font = "70px Cinzel";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "black";
    ctx.strokeText(fullText, canvas.width * 0.44, canvas.height * 0.1);

    ctx.fillStyle = "yellow";
    ctx.fillText(fullText, canvas.width * 0.44, canvas.height * 0.1);

    fullText = "Watergirl";
    ctx.font = "70px Cinzel";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "black";
    ctx.strokeText(fullText, canvas.width * 0.56, canvas.height * 0.1);

    ctx.fillStyle = "#2596be";
    ctx.fillText(fullText, canvas.width * 0.56, canvas.height * 0.1);

    //buttons
    for (const btnName in menuButtons.mainMenu) {
        menuButtons.mainMenu[btnName].draw();
    }

    //paths
    for (const key in menuLevelsPath) {
        const path = menuLevelsPath[key];
        drawFullPath(path);
    }

    //diamonds
    for (const key in menuLevels) {
        const diamond = menuLevels[key];

        diamond.drawFullDiamond();
    }
}

function drawFullPath(path) {
    const mainColor = menuDiamondsBorderColor[path.unlocked];
    drawPathPart(path, 0, 3, "black");
    drawPathPart(path, 3, 9, mainColor);
    drawPathPart(path, 12, 3, "black");
}

function drawPathPart(path, offset, width, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(path.position.x + offset, path.position.y);
    ctx.lineTo(path.finalPosition.x + offset, path.finalPosition.y);
    ctx.lineTo(path.finalPosition.x + width + offset, path.finalPosition.y);
    ctx.lineTo(path.position.x + width + offset, path.position.y);
    ctx.lineTo(path.position.x + offset, path.position.y);
    ctx.fill();
}

function checkMenuDiamondsCollision(pos, diamond) {
    return (
        diamond.unlocked &&
        pos.x > diamond.position.x &&
        pos.x < diamond.position.x + diamond.height * 0.9 &&
        pos.y < diamond.position.y + diamond.height &&
        pos.y > diamond.position.y
    );
}

function unlockAllDiamonds() {
    for (const index in menuLevels) {
        menuLevels[index].unlocked = true;
    }
    for (const index in menuLevelsPath) {
        menuLevelsPath[index].unlocked = true;
    }
    drawMenu();
}

function resetProgress() {
    localStorage.clear();

    for (const index in menuLevels) {
        menuLevels[index].setQuestsStatus(0);
        if (index == 1) {
            menuLevels[index].unlocked = true;
            continue;
        }
        menuLevels[index].unlocked = false;
    }

    for (const index in menuLevelsPath) {
        menuLevelsPath[index].unlocked = false;
    }

    menuButtons.mainMenu.unlock = unlockAllDiamondsButton;

    drawMenu();
}

// 10 bölüm: dikey merdiven 10 düğüme sığmadığı için 2 sütunlu ZIGZAG düzen.
// Düğümler alt (L1) -> üst (L10) tırmanır; tek numaralar sol, çift sağ sütun.
const menuColLeft = canvas.width * 0.4;
const menuColRight = canvas.width * 0.56;
const menuNodeYs = [0.9, 0.809, 0.718, 0.627, 0.536, 0.445, 0.354, 0.263, 0.172, 0.081];

const menuNodes = {};
for (let i = 1; i <= 10; i++) {
    menuNodes[i] = new MenuLevel({
        position: {
            x: i % 2 === 1 ? menuColLeft : menuColRight,
            y: canvas.height * menuNodeYs[i - 1],
        },
        questsStatus: 0,
        unlocked: i === 1,
        pathUnlocking: i < 10 ? [i] : [],
        levelsUnlocking: i < 10 ? [i + 1] : [],
        // 6. bölüm "final elması" görevini korur; diğerleri standart.
        quests: i === 6 ? [quests.finalDiamond] : [quests.levelCompleted, quests.allDiamonds],
    });
}
setMenuLevels(menuNodes);

// Yollar düğüm merkezlerini birbirine bağlar (zigzag çapraz şeritler).
const menuPaths = {};
for (let i = 1; i <= 9; i++) {
    menuPaths[i] = {
        position: { x: menuNodes[i].position.x + 29, y: menuNodes[i].position.y + 40 },
        finalPosition: { x: menuNodes[i + 1].position.x + 29, y: menuNodes[i + 1].position.y + 40 },
        unlocked: false,
    };
}
setMenuLevelsPath(menuPaths);

export {
    drawMenu,
    drawInGameMenu,
    checkMenuDiamondsCollision,
    unlockAllDiamonds,
    menuDiamondsBorderColor,
    resetProgress,
};
