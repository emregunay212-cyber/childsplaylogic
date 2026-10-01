import { Sprite } from "./sprite.js";

// Dikey çarpışma "yanlış eksen" korumaları (px). Ölçüm (10 seviye × 3 oyun biçimi, ~2M kare): gerçek
// iniş/tavan düzeltmeleri hep < 8 px; hatalı ışınlanmalar ≥ 24 px. Eşikler bu ikisinin arasında.
const LAND_MAX_DEPTH = 16;
const BUMP_MAX_DEPTH = 12;
const TRI_LIFT_MAX = 36; // eğim hücresi 36 px: meşru yüzeye çekme ≤ 36; üstü = ayaklar hücrenin ALTINDA (katının içinden geçmiş)

// Kalıcı sıkışma bekçisi: gövde (üst 36 px) bir kare/rampa/köprüye STUCK_DEPTH px'ten fazla gömülü kalırsa
// STUCK_FRAMES kare sonra oyuncu son serbest konumuna döner. Bilinmeyen bir durumda bile kalıcı takılma olmasın.
const STUCK_DEPTH = 8;
const STUCK_FRAMES = 30;
const FREE_DEPTH = 2; // bundan azı "serbest" sayılır; son serbest konum yalnız burada güncellenir

export class Player extends Sprite {
    constructor({
        position,
        collisionBlocks,
        allAssets,
        diamonds,
        doors,
        imgSrc,
        frameRate,
        frameDelay,
        currentRow,
        imgRows,
        legs,
        keys,
        animations,
        element,
    }) {
        super({ position, imgSrc, frameRate, frameDelay, currentRow, imgRows, animations });
        this.position = position;
        this.velocity = {
            x: 0,
            y: 0,
        };
        this.keys = keys;
        this.element = element;

        this.collisionBlocks = collisionBlocks;
        this.allAssets = allAssets;
        this.diamonds = diamonds;
        this.doors = doors;

        this.isOnBlock = false;

        this.lastPosition = position;

        this.hitbox = {
            position: {
                x: this.position.x + 4,
                y: this.position.y + 12,
            },
            width: 36,
            height: 60,
            legs: {
                position: {
                    x: this.position.x,
                    y: this.position.y,
                },
                width: 12,
                height: 24,
            },
        };

        this.legs = legs;

        this.sliding = {
            left: false,
            right: false,
        };

        this.currentAnimation = "idle";

        this.died = false;

        this.rampBlocked = false;
        this.isOnRamp = false;

        this.lastSafe = { x: this.position.x, y: this.position.y };
        this.stuckFrames = 0;
        this.unstuckCount = 0; // bekçi kaç kez devreye girdi (test/ölçüm)
    }
    update() {
        this.hitboxPositionCalc();
        this.lastPosition = this.hitbox.position;

        // ctx.fillStyle = "rgba(0,0,255,0.5)";
        // ctx.fillRect(
        //     this.hitbox.position.x,
        //     this.hitbox.position.y,
        //     this.hitbox.width,
        //     this.hitbox.height - this.hitbox.legs.height
        // );
        // ctx.fillStyle = "rgba(0,255,0, 0.5)";
        // ctx.fillRect(
        //     this.hitbox.legs.position.x,
        //     this.hitbox.legs.position.y,
        //     this.hitbox.legs.width,
        //     this.hitbox.legs.height
        // );

        // Köşeden sıyrılma (sliding bayrağı: x−− / x∓3, toplam ≈3 px/kare) yürümeden baskın olmalı.
        // Orijinal oyun 2.0 hızla yazılmıştı (kayma net −1); hız 3.0 olunca kayma ile yürüme birbirini
        // sıfırlıyor, oyuncu köşede asılı kalıp bloğun İÇİNDEN düşüyordu. Bayrak sürerken bloğa doğru
        // yürüme bu kare iptal: kayma her hızda kazanır, köşe temizlenince yürüyüş geri gelir.
        // Yalnız GERÇEKTEN bir kare bloğa yaslıyken (eğimde kayarken değil): eğimde tırmanma (kayma 1 px) eskisi gibi sürer.
        if (
            ((this.sliding.left && this.velocity.x > 0) || (this.sliding.right && this.velocity.x < 0)) &&
            this.overlapsSolidSquare()
        ) {
            this.velocity.x = 0;
        }

        this.position.x += this.velocity.x;

        this.hitboxPositionCalc();
        this.horizontalCollision(this.allAssets);

        this.hitboxPositionCalc();
        this.horizontalCollision(this.collisionBlocks);

        //gravity
        this.gravity();

        this.hitboxPositionCalc();
        this.isOnBlock = false;
        this.sliding.right = false;
        this.sliding.left = false;
        this.rampBlocked = false;
        this.verticalCollision(this.collisionBlocks);

        this.hitboxPositionCalc();
        this.isOnRamp = false;
        this.verticalCollision(this.allAssets);

        this.hitboxPositionCalc();
        this.checkStuck();
        this.calculateAngle();

        this.legs.position = {
            x: this.position.x + 37,
            y: this.position.y + 72,
        };
    }
    // Oyuncu, bloğun hangi yanına daha yakın? (en az bindirme): "left" = sol yüzüne yaslı, "right" = sağ yüzüne
    nearestSide(block) {
        const penLeft = this.hitbox.position.x + this.hitbox.width - block.hitbox.position.x;
        const penRight = block.hitbox.position.x + block.hitbox.width - this.hitbox.position.x;
        return penLeft < penRight ? "left" : "right";
    }
    // Tüm hitbox bir KARE bloğa yatayda ve dikeyde >1 px bindiriyor mu? (üçgen/havuz sayılmaz)
    overlapsSolidSquare() {
        const hb = this.hitbox;
        this.hitboxPositionCalc();
        for (const block of this.collisionBlocks) {
            if (block.shape != "square") continue;
            const ox =
                Math.min(hb.position.x + hb.width, block.hitbox.position.x + block.hitbox.width) -
                Math.max(hb.position.x, block.hitbox.position.x);
            if (ox <= 1) continue;
            const oy =
                Math.min(hb.position.y + hb.height, block.hitbox.position.y + block.hitbox.height) -
                Math.max(hb.position.y, block.hitbox.position.y);
            if (oy > 1) return true;
        }
        return false;
    }
    // Gövde dikdörtgeninin katı bloklara (kare/rampa/köprü) en derin bindirmesi (px, en az iki eksenin küçüğü)
    bodyEmbedDepth() {
        const hb = this.hitbox;
        const bx = hb.position.x;
        const by = hb.position.y;
        const bw = hb.width;
        const bh = hb.height - hb.legs.height;
        let depth = 0;
        const test = (block) => {
            const ox = Math.min(bx + bw, block.hitbox.position.x + block.hitbox.width) - Math.max(bx, block.hitbox.position.x);
            if (ox <= 0) return;
            const oy = Math.min(by + bh, block.hitbox.position.y + block.hitbox.height) - Math.max(by, block.hitbox.position.y);
            if (oy <= 0) return;
            depth = Math.max(depth, Math.min(ox, oy));
        };
        for (const block of this.collisionBlocks) if (block.shape == "square") test(block);
        for (const asset of this.allAssets) {
            if (asset.shape == "ramp" || asset.shape == "square") test(asset);
        }
        return depth;
    }
    checkStuck() {
        const depth = this.bodyEmbedDepth();
        if (depth < FREE_DEPTH) {
            this.lastSafe.x = this.position.x;
            this.lastSafe.y = this.position.y;
            this.stuckFrames = 0;
        } else if (depth >= STUCK_DEPTH) {
            if (++this.stuckFrames >= STUCK_FRAMES) {
                this.position.x = this.lastSafe.x;
                this.position.y = this.lastSafe.y;
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.sliding.left = false;
                this.sliding.right = false;
                this.stuckFrames = 0;
                this.unstuckCount++;
                this.hitboxPositionCalc();
            }
        } else {
            this.stuckFrames = 0;
        }
    }
    changeSprite(name) {
        if (name != this.currentAnimation) {
            //head animation
            this.currentFrame = 0;
            this.frameCount = 0;

            this.frameRate = this.animations[name].frameRate;
            this.currentRow = this.animations[name].currentRow;
            if (this.animations[name].flipImage) this.flipImage = true;
            else this.flipImage = false;

            this.currentAnimation = name;

            if (name == "up" || name == "down") {
                name = "idle";
            }

            //legs animation
            this.legs.currentFrame = 0;
            this.legs.frameCount = 0;

            this.legs.frameRate = this.legs.animations[name].frameRate;
            this.legs.currentRow = this.legs.animations[name].currentRow;
            if (this.legs.animations[name].flipImage) this.legs.flipImage = true;
            else this.legs.flipImage = false;
        }
    }
    checkDiamonds() {
        for (let i = 0; i < this.diamonds.length; i++) {
            let diamond = this.diamonds[i];
            if (diamond.collected) continue;
            if (
                (diamond.type == "final" || this.element == diamond.type) &&
                this.hitbox.position.x <= diamond.hitbox.position.x + diamond.hitbox.width &&
                this.hitbox.position.x + this.hitbox.width >= diamond.hitbox.position.x &&
                this.hitbox.position.y <= diamond.hitbox.position.y + diamond.hitbox.height &&
                this.hitbox.position.y + this.hitbox.height >= diamond.hitbox.position.y
            ) {
                // collected flag (splice yerine — online sync için stabil index gerekli)
                diamond.collected = true;
                if (typeof this.onDiamondCollected === 'function') {
                    this.onDiamondCollected(i);
                }
            }
        }
    }
    checkDoors() {
        this.doors.forEach((door) => {
            if (
                this.element == door.element &&
                this.hitbox.position.x >= door.hitbox.position.x &&
                this.hitbox.position.x + this.hitbox.width <=
                    door.hitbox.position.x + door.hitbox.width &&
                this.hitbox.position.y >= door.hitbox.position.y &&
                this.hitbox.position.y + this.hitbox.height <=
                    door.hitbox.position.y + door.hitbox.height
            ) {
                door.pressed = true;
                return;
            }
        });
    }
    calculateAngle() {
        this.angle =
            Math.atan2(
                this.hitbox.position.y - this.lastPosition.y,
                Math.abs(this.hitbox.position.x - this.lastPosition.x)
            ) / 4;
        if (this.angle > 0) {
            this.angle /= 1.5;
        }
        if (this.velocity.y == 0) {
            this.angle = 0;
        }
    }
    hitboxPositionCalc() {
        this.hitbox.position = {
            x: this.position.x + 31,
            y: this.position.y + 37,
        };
        this.hitbox.legs.position = {
            x: this.hitbox.position.x + (this.hitbox.width - this.hitbox.legs.width) / 2,
            y: this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height,
        };
    }
    gravity() {
        // this.velocity.y += 0.5;
        if (this.velocity.y < 0) {
            this.velocity.y += 0.07;
            if (this.velocity.y > -0.001) {
                this.velocity.y = 0;
            }
        } else if (this.velocity.y > 0) {
            if (this.velocity.y >= 1.6) {
                // this.velocity.y = 1.7
                this.velocity.y += 0.02;
            } else {
                this.velocity.y += 0.07;
                // this.velocity.y += 1
            }
        }
        // else if (this.velocity.y == 0) this.velocity.y = 1.7;
        else this.velocity.y = 2.02;
        // this.velocity.y += 0.08;
        this.position.y += this.velocity.y;
    }
    horizontalCollision(blocks) {
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];

            if (
                this.hitbox.position.x <= block.hitbox.position.x + block.hitbox.width &&
                this.hitbox.position.x + this.hitbox.width >= block.hitbox.position.x &&
                this.hitbox.position.y + this.hitbox.height >= block.hitbox.position.y + 1 &&
                this.hitbox.position.y <= block.hitbox.position.y + block.hitbox.height
            ) {
                //ramp blocked
                if (this.rampBlocked) {
                    break;
                }

                if (
                    block.shape == "square" ||
                    block.shape == "ramp" ||
                    block.shape == "lever" ||
                    block.shape == "cube" ||
                    block.shape == "pondTriangle"
                ) {
                    //collision not from side
                    if (
                        block.shape == "pondTriangle" &&
                        ((block.direction.x == "left" &&
                            this.hitbox.legs.position.x + this.hitbox.legs.width <=
                                block.hitbox.position.x + block.hitbox.width &&
                            block.hitbox.width) ||
                            (block.direction.x == "right" && this.velocity.x < 0))
                    ) {
                        break;
                    }

                    //head collision
                    if (
                        this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                            block.hitbox.position.y &&
                        Math.round(this.hitbox.position.y) <
                            block.hitbox.position.y + block.hitbox.height &&
                        !this.sliding.right &&
                        !this.sliding.left
                    ) {
                        let moveTo;
                        if (block.shape == "lever") {
                            //pushing lever to left
                            if (
                                this.velocity.x < 0 &&
                                Math.round(block.angle / (Math.PI / 180)) > -30
                            ) {
                                block.angle -= Math.PI / 180;
                            }
                            //pushing lever to right
                            else if (
                                this.velocity.x > 0 &&
                                Math.round(block.angle / (Math.PI / 180)) < 30
                            ) {
                                block.angle += Math.PI / 180;
                            }
                            //lever pushing player to left
                            else if (
                                this.velocity.x == 0 &&
                                this.hitbox.position.x <= block.hitbox.position.x
                            ) {
                                moveTo = "left";
                            }
                            //lever pushing player to right
                            else if (
                                this.velocity.x == 0 &&
                                this.hitbox.position.x >= block.hitbox.position.x
                            ) {
                                moveTo = "right";
                            }
                        } else if (block.shape == "cube") {
                            if (this.velocity.x > 0) {
                                block.velocity.x = 1.5;
                            } else {
                                block.velocity.x = -1.5;
                            }
                        }
                        // İtme yönü: kare/rampa/küpte hız işareti DEĞİL, oyuncunun bloğa göre hangi yanda olduğu
                        // (en az bindirme) belirler. Hıza bakınca bloktan UZAĞA yürüyen (ya da duran) oyuncu
                        // bloğun öbür yüzüne ışınlanıyordu (dikey rampada +51 px = "duvardan geçiyor").
                        let pushTo = null;
                        if (
                            block.shape == "square" ||
                            block.shape == "ramp" ||
                            block.shape == "cube"
                        ) {
                            const penLeft =
                                this.hitbox.position.x + this.hitbox.width - block.hitbox.position.x;
                            const penRight =
                                block.hitbox.position.x + block.hitbox.width - this.hitbox.position.x;
                            pushTo = penLeft < penRight ? "left" : "right";
                            // Yatay bindirme dikeyden belirgin büyükse bu yan çarpışma değil (ör. oyuncu geniş bir
                            // rampanın altında/içinde): yana ~70 px ışınlama yerine dikey çözüm/kayma devralsın.
                            const bodyBottom =
                                this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height;
                            const overlapY =
                                Math.min(bodyBottom, block.hitbox.position.y + block.hitbox.height) -
                                Math.max(this.hitbox.position.y, block.hitbox.position.y);
                            if (Math.min(penLeft, penRight) > overlapY + 2) pushTo = "none";
                        }
                        //player pushed to the right side of the block (was going left)
                        if (pushTo ? pushTo == "right" : this.velocity.x < 0 || moveTo == "right") {
                            const offset = this.hitbox.position.x - this.position.x;
                            this.position.x =
                                block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                            break;
                        }
                        //player pushed to the left side of the block (was going right)
                        else if (pushTo ? pushTo == "left" : this.velocity.x > 0 || moveTo == "left") {
                            const offset =
                                this.hitbox.position.x - this.position.x + this.hitbox.width;
                            this.position.x = block.hitbox.position.x - offset - 0.01;
                            break;
                        }
                    }
                    //player sliding
                    else if (this.sliding.left) this.position.x--;
                    else if (this.sliding.right) this.position.x++;
                    //legs collision
                    else if (
                        this.hitbox.legs.position.y + this.hitbox.legs.height >=
                            block.hitbox.position.y &&
                        this.hitbox.legs.position.y <= block.hitbox.position.y + block.hitbox.height
                    ) {
                        if (block.shape == "cube") {
                            if (this.velocity.x > 0) {
                                block.velocity.x = 1.5;
                            } else {
                                block.velocity.x = -1.5;
                            }
                        }
                        //player going to left
                        // (+ ayaklar bloğun SAĞ yüzünü kesmeli; sağ dalla simetrik. Yoksa sol yüzüne yaslı,
                        //  sola yürüyen oyuncu bloğun öbür yanına ışınlanıyordu)
                        if (
                            this.velocity.x < 0 &&
                            this.hitbox.legs.position.x <=
                                block.hitbox.position.x + block.hitbox.width &&
                            this.hitbox.legs.position.x + this.hitbox.legs.width >=
                                block.hitbox.position.x + block.hitbox.width
                        ) {
                            const offset = this.hitbox.legs.position.x - this.position.x;
                            this.position.x =
                                block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                            break;
                        }
                        //player going to right
                        else if (
                            this.velocity.x > 0 &&
                            this.hitbox.legs.position.x + this.hitbox.legs.width >=
                                block.hitbox.position.x &&
                            this.hitbox.legs.position.x <= block.hitbox.position.x
                        ) {
                            const offset =
                                this.hitbox.legs.position.x -
                                this.position.x +
                                this.hitbox.legs.width;
                            this.position.x = block.hitbox.position.x - offset - 0.01;
                            break;
                        }
                    }
                }
                //collision for ball
                else if (block.shape == "ball") {
                    //legs collision
                    if (
                        this.hitbox.position.y + this.hitbox.height >= block.hitbox.position.y &&
                        this.hitbox.position.y < block.hitbox.position.y + block.hitbox.height
                    ) {
                        //player going to left
                        if (
                            this.velocity.x < 0 &&
                            this.hitbox.legs.position.x <=
                                block.hitbox.position.x + block.hitbox.width &&
                            this.hitbox.legs.position.x + this.hitbox.legs.width >=
                                block.hitbox.position.x
                        ) {
                            block.velocity.x = Math.min(2, block.velocity.x - 0.5);

                            const offset = this.hitbox.legs.position.x - this.position.x;
                            this.position.x =
                                block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                            break;
                        }
                        //player going to right
                        else if (
                            this.velocity.x > 0 &&
                            this.hitbox.legs.position.x + this.hitbox.legs.width >=
                                block.hitbox.position.x &&
                            this.hitbox.legs.position.x <= block.hitbox.position.x
                        ) {
                            block.velocity.x = Math.min(2, block.velocity.x + 0.5);

                            const offset =
                                this.hitbox.legs.position.x -
                                this.position.x +
                                this.hitbox.legs.width;
                            this.position.x = block.hitbox.position.x - offset - 0.01;
                            break;
                        }
                    }
                }
                //triangle collision
                else if (block.shape == "triangle") {
                    if (block.direction.y == "down" && this.isOnBlock) {
                        if (
                            block.direction.x == "left" &&
                            this.hitbox.position.x + this.hitbox.width >
                                block.hitbox.position.x + 10 &&
                            this.hitbox.position.x + this.hitbox.width <
                                block.hitbox.position.x + block.hitbox.width &&
                            this.hitbox.position.y > block.hitbox.position.y &&
                            this.hitbox.position.y < block.hitbox.position.y + 18
                        ) {
                            const offset =
                                this.hitbox.position.x - this.position.x + this.hitbox.width - 10;
                            this.position.x = block.hitbox.position.x - offset - 0.01;
                            break;
                        } else if (
                            block.direction.x == "right" &&
                            this.hitbox.position.x <
                                block.hitbox.position.x + block.hitbox.width - 10 &&
                            this.hitbox.position.x > block.hitbox.position.x &&
                            this.hitbox.position.y > block.hitbox.position.y &&
                            this.hitbox.position.y < block.hitbox.position.y + 18
                        ) {
                            const offset = this.hitbox.position.x - this.position.x;
                            this.position.x =
                                block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                            break;
                        }
                    }
                    if (
                        block.direction.x == "left" &&
                        this.hitbox.position.x <= block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.position.x >= block.hitbox.position.x &&
                        this.velocity.x < 0
                    ) {
                        //head collision
                        if (
                            this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                                block.hitbox.position.y &&
                            Math.round(this.hitbox.position.y) <
                                block.hitbox.position.y + block.hitbox.height &&
                            !this.sliding.right &&
                            !this.sliding.left
                        ) {
                            const offset = this.hitbox.position.x - this.position.x;
                            this.position.x =
                                block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                            break;
                        }
                        //legs collision
                        else if (
                            this.hitbox.legs.position.y + this.hitbox.legs.height >
                                block.hitbox.position.y &&
                            this.hitbox.legs.position.y + this.hitbox.legs.height <=
                                block.hitbox.position.y + block.hitbox.height &&
                            this.hitbox.legs.position.x <=
                                block.hitbox.position.x + block.hitbox.width &&
                            this.hitbox.legs.position.x + this.hitbox.legs.width >=
                                block.hitbox.position.x + block.hitbox.width &&
                            this.velocity.y != 0
                        ) {
                            const offset = this.hitbox.legs.position.x - this.position.x;
                            this.position.x =
                                block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                            break;
                        }
                    } else if (
                        block.direction.x == "right" &&
                        this.hitbox.position.x + this.hitbox.width >= block.hitbox.position.x &&
                        this.hitbox.position.x + this.hitbox.width <=
                            block.hitbox.position.x + block.hitbox.width &&
                        this.velocity.x > 0
                    ) {
                        //head collision
                        if (
                            this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                                block.hitbox.position.y &&
                            Math.round(this.hitbox.position.y) <
                                block.hitbox.position.y + block.hitbox.height &&
                            !this.sliding.right &&
                            !this.sliding.left
                        ) {
                            const offset =
                                this.hitbox.position.x - this.position.x + this.hitbox.width;
                            this.position.x = block.hitbox.position.x - offset - 0.01;
                            break;
                        }
                        //legs collision
                        else if (
                            this.hitbox.legs.position.y + this.hitbox.legs.height >
                                block.hitbox.position.y &&
                            this.hitbox.legs.position.y + this.hitbox.legs.height <=
                                block.hitbox.position.y + block.hitbox.height &&
                            this.hitbox.legs.position.x + this.hitbox.legs.width >=
                                block.hitbox.position.x &&
                            this.hitbox.legs.position.x <= block.hitbox.position.x &&
                            this.velocity.y != 0
                        ) {
                            const offset =
                                this.hitbox.legs.position.x -
                                this.position.x +
                                this.hitbox.legs.width;
                            this.position.x = block.hitbox.position.x - offset - 0.01;
                            break;
                        }
                    }
                    //triangle up collision
                    if (block.direction.y == "up" && this.isOnBlock == false) {
                        //head collision
                        if (
                            this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                                block.hitbox.position.y + block.hitbox.height &&
                            this.hitbox.position.y <=
                                block.hitbox.position.y + block.hitbox.height &&
                            !this.sliding.left &&
                            !this.sliding.right
                        ) {
                            // Hücrenin hangi yanında olduğuna göre it (hız işaretine göre değil): hücrenin
                            // uzak yüzüne (ölçüm: 65–72 px) atlama olmasın.
                            if (this.velocity.x !== 0) {
                                //player ends on the right side of the cell
                                if (this.nearestSide(block) == "right") {
                                    const offset = this.hitbox.position.x - this.position.x;
                                    this.position.x =
                                        block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                                    break;
                                }
                                //player ends on the left side of the cell
                                else {
                                    const offset =
                                        this.hitbox.position.x - this.position.x + this.hitbox.width;
                                    this.position.x = block.hitbox.position.x - offset - 0.01;
                                    break;
                                }
                            }
                        }
                        //player sliding
                        else if (this.sliding.left) this.position.x--;
                        else if (this.sliding.right) this.position.x++;
                        //legs collision
                        else if (
                            this.hitbox.legs.position.y + this.hitbox.legs.height >=
                                block.hitbox.position.y + block.hitbox.height &&
                            this.hitbox.legs.position.y <=
                                block.hitbox.position.y + block.hitbox.height
                        ) {
                            //triangle left
                            if (
                                block.direction.x == "right" &&
                                this.hitbox.legs.position.x <=
                                    block.hitbox.position.x + block.hitbox.width &&
                                this.lastPosition.x +
                                    (this.hitbox.width - this.hitbox.legs.width) / 2 >=
                                    block.hitbox.position.x + block.hitbox.width
                            ) {
                                const offset = this.hitbox.legs.position.x - this.position.x;
                                this.position.x =
                                    block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                                break;
                            }
                            //triangle right
                            else if (
                                block.direction.x == "left" &&
                                this.hitbox.legs.position.x + this.hitbox.legs.width >=
                                    block.hitbox.position.x &&
                                this.lastPosition.x +
                                    (this.hitbox.width - this.hitbox.legs.width) / 2 +
                                    this.hitbox.legs.width <=
                                    block.hitbox.position.x
                            ) {
                                const offset =
                                    this.hitbox.legs.position.x -
                                    this.position.x +
                                    this.hitbox.legs.width;
                                this.position.x = block.hitbox.position.x - offset - 0.01;
                                break;
                            }
                        }
                    }
                    //triangle down collision
                    else if (block.direction.y == "down" && this.isOnBlock == false) {
                        //head collision
                        if (
                            this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                                block.hitbox.position.y &&
                            this.hitbox.position.y <= block.hitbox.position.y &&
                            !this.sliding.left &&
                            !this.sliding.right
                        ) {
                            // Hücrenin hangi yanında olduğuna göre it (hız işaretine göre değil): hücrenin
                            // uzak yüzüne (ölçüm: 65–72 px) atlama olmasın.
                            if (this.velocity.x !== 0) {
                                //player ends on the right side of the cell
                                if (this.nearestSide(block) == "right") {
                                    const offset = this.hitbox.position.x - this.position.x;
                                    this.position.x =
                                        block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                                    break;
                                }
                                //player ends on the left side of the cell
                                else {
                                    const offset =
                                        this.hitbox.position.x - this.position.x + this.hitbox.width;
                                    this.position.x = block.hitbox.position.x - offset - 0.01;
                                    break;
                                }
                            }
                        }
                        //player sliding
                        else if (this.sliding.left) this.position.x--;
                        else if (this.sliding.right) this.position.x++;
                        //legs collision
                        else if (
                            this.hitbox.legs.position.y + this.hitbox.legs.height >=
                                block.hitbox.position.y &&
                            this.hitbox.legs.position.y <= block.hitbox.position.y
                        ) {
                            //triangle left
                            if (
                                block.direction.x == "right" &&
                                this.hitbox.legs.position.x <=
                                    block.hitbox.position.x + block.hitbox.width &&
                                this.lastPosition.x +
                                    (this.hitbox.width - this.hitbox.legs.width) / 2 >=
                                    block.hitbox.position.x + block.hitbox.width
                            ) {
                                const offset = this.hitbox.legs.position.x - this.position.x;
                                this.position.x =
                                    block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                                break;
                            }
                            //triangle right
                            else if (
                                block.direction.x == "left" &&
                                this.hitbox.legs.position.x + this.hitbox.legs.width >=
                                    block.hitbox.position.x &&
                                this.lastPosition.x +
                                    (this.hitbox.width - this.hitbox.legs.width) / 2 +
                                    this.hitbox.legs.width <=
                                    block.hitbox.position.x
                            ) {
                                const offset =
                                    this.hitbox.legs.position.x -
                                    this.position.x +
                                    this.hitbox.legs.width;
                                this.position.x = block.hitbox.position.x - offset - 0.01;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    calculateXPos(block) {
        let xPos;
        //triangle up
        if (block.direction.y == "up") {
            xPos = this.hitbox.legs.position.x % 36;
            //triangle to left
            if (block.direction.x == "left") {
                xPos = (this.hitbox.legs.position.x + this.hitbox.legs.width) % 36;

                xPos = 36 - xPos;
                if (xPos == 36 || xPos < 1) xPos = 0;
            }
            //triangle to right
            else if (xPos < 1) xPos = 0;

            if (block.shape == "pondTriangle") xPos /= 2;
        }
        //triangle down
        else {
            xPos = this.hitbox.position.x % 36;

            if (block.direction.x == "left") xPos = 36 - xPos;
            else {
                if (xPos == 0) xPos = 36;
                else if (xPos < 1) xPos = 0;
            }
        }
        return xPos;
    }
    //change position for collision in triangle
    triangleChangePosition(block, xPos) {
        //for triangle up
        if (
            block.direction.y == "up" &&
            this.hitbox.position.y + this.hitbox.height >= block.hitbox.position.y + xPos
        ) {
            // Ayaklar eğim yüzeyinin TRI_LIFT_MAX px (= hücre yüksekliği) altındaysa oyuncu hücrenin ALTINA/dik YANINA girmiştir;
            // yüzeye 20–58 px "ışınlamak" duvardan yukarı tırmanıp geçmekti (ölçüm: hepsi düşerken). Girdiği yüzden it.
            if (
                this.hitbox.position.y + this.hitbox.height - (block.hitbox.position.y + xPos) >
                TRI_LIFT_MAX
            ) {
                const penLeft =
                    this.hitbox.position.x + this.hitbox.width - block.hitbox.position.x;
                const penRight =
                    block.hitbox.position.x + block.hitbox.width - this.hitbox.position.x;
                if (penLeft < penRight) {
                    const offset = this.hitbox.position.x - this.position.x + this.hitbox.width;
                    this.position.x = block.hitbox.position.x - offset - 0.01;
                } else {
                    const offset = this.hitbox.position.x - this.position.x;
                    this.position.x = block.hitbox.position.x + block.hitbox.width - offset + 0.01;
                }
                return;
            }
            this.isOnBlock = true;
            this.velocity.y = 0;
            const offset = this.hitbox.position.y + this.hitbox.height - this.position.y;
            this.position.y = block.hitbox.position.y + xPos - offset - 0.01;
            if (block.shape == "triangle") {
                if (block.direction.x == "left") this.position.x -= 0.5;
                else this.position.x += 0.5;
            }
        }
        //for triangle down
        else if (
            block.direction.y == "down" &&
            this.hitbox.position.y < block.hitbox.position.y + block.hitbox.height - xPos
        ) {
            const offset = this.hitbox.position.y - this.position.y;
            this.position.y = block.hitbox.position.y + block.hitbox.height - xPos - offset + 0.01;
            this.velocity.y = 0;
        }
    }
    verticalCollision(blocks) {
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];

            if (
                this.hitbox.position.x <= block.hitbox.position.x + block.hitbox.width &&
                this.hitbox.position.x + this.hitbox.width >= block.hitbox.position.x &&
                this.hitbox.position.y + this.hitbox.height >= block.hitbox.position.y &&
                this.hitbox.position.y <= block.hitbox.position.y + block.hitbox.height
            ) {
                //collision for square
                if (
                    block.shape == "square" ||
                    block.shape == "ramp" ||
                    block.shape == "lever" ||
                    block.shape == "cube"
                ) {
                    //ramp is blocked
                    if (
                        this.isOnRamp &&
                        Math.round(this.hitbox.position.y) <=
                            block.hitbox.position.y + block.hitbox.height &&
                        Math.round(this.hitbox.position.y) >= block.hitbox.position.y
                    ) {
                        this.rampBlocked = true;
                        break;
                    }

                    //player going down legs collision
                    // (ayaklar blok üstünden en çok LAND_MAX_DEPTH px aşağıdaysa: gerçek iniş. Daha derinse
                    //  oyuncu blokun YANINA gömülmüştür — dikey rampa kapısı vb.; "üstüne ışınla" değil,
                    //  aşağıdaki kayma dalı yana sıyırsın)
                    if (
                        this.velocity.y >= 0 &&
                        this.hitbox.legs.position.x <
                            block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width >
                            block.hitbox.position.x &&
                        this.hitbox.position.y + this.hitbox.height >= block.hitbox.position.y &&
                        this.hitbox.position.y + this.hitbox.height <=
                            block.hitbox.position.y + block.hitbox.height &&
                        this.hitbox.position.y + this.hitbox.height - block.hitbox.position.y <=
                            LAND_MAX_DEPTH
                    ) {
                        if (block.shape == "button") {
                            block.pressed = true;
                        }
                        if (block.shape == "ramp") {
                            this.isOnRamp = true;
                        }
                        this.isOnBlock = true;
                        const offset =
                            this.hitbox.position.y + this.hitbox.height - this.position.y;

                        this.velocity.y = 0;
                        this.position.y = block.hitbox.position.y - offset - 0.01;
                        break;
                    }
                    //player going down head collision
                    else if (
                        this.velocity.y > 0 &&
                        this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                            block.hitbox.position.y
                    ) {
                        //player going left
                        if (this.hitbox.position.x <= block.hitbox.position.x) {
                            this.position.x -= 3;
                            this.sliding.left = true;
                        }
                        //player going right
                        else {
                            this.position.x += 3;
                            this.sliding.right = true;
                        }
                        break;
                    }
                    //player going up
                    // (kafa blok altına en çok BUMP_MAX_DEPTH px girdiyse gerçek tavan çarpması; daha derinse
                    //  oyuncu blokun yanına gömülmüştür — bloğun ALTINA ışınlama)
                    else if (
                        this.velocity.y < 0 &&
                        this.hitbox.position.y <= block.hitbox.position.y + block.hitbox.height &&
                        this.hitbox.position.y >= block.hitbox.position.y &&
                        block.hitbox.position.y + block.hitbox.height - this.hitbox.position.y <=
                            BUMP_MAX_DEPTH
                    ) {
                        this.velocity.y = 0;
                        const offset = this.hitbox.position.y - this.position.y;
                        this.position.y =
                            block.hitbox.position.y + block.hitbox.height - offset + 0.01;
                        //player blocking ramp
                        if (
                            block.shape == "ramp" &&
                            Math.round(this.position.y + offset) ==
                                block.hitbox.position.y + block.hitbox.height
                        ) {
                            block.blocked = true;
                            block.blockedDirection = "down";
                        }
                        break;
                    }
                    //player blocking ramp
                    else if (
                        this.isOnBlock &&
                        block.shape == "ramp" &&
                        Math.round(this.hitbox.position.y) ==
                            block.hitbox.position.y + block.hitbox.height
                    ) {
                        block.blocked = true;
                        block.blockedDirection = "down";
                        break;
                    }
                }
                //collision for button
                else if (block.shape == "button") {
                    if (
                        this.hitbox.legs.position.x <
                            block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width >
                            block.hitbox.position.x
                    ) {
                        block.pressed = true;
                    }
                }
                //collision for ball
                else if (block.shape == "ball") {
                    //player going down legs collision
                    if (
                        this.velocity.y >= 0 &&
                        this.hitbox.legs.position.x <
                            block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width >
                            block.hitbox.position.x &&
                        this.hitbox.position.y + this.hitbox.height >= block.hitbox.position.y &&
                        this.hitbox.position.y + this.hitbox.height <=
                            block.hitbox.position.y + block.hitbox.height
                    ) {
                        this.isOnBlock = true;
                        const offset =
                            this.hitbox.position.y + this.hitbox.height - this.position.y;

                        this.velocity.y = 0;
                        this.position.y = block.hitbox.position.y - offset - 0.01;
                        break;
                    }
                }
                //collision for triangle left
                else if (block.direction.x == "left") {
                    //player going down head collision
                    if (
                        block.shape == "pondTriangle" &&
                        this.velocity.y > 0 &&
                        this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                            block.hitbox.position.y &&
                        this.hitbox.legs.position.x >= block.hitbox.position.x + block.hitbox.width
                    ) {
                        this.position.x += 3;
                        this.sliding.right = true;
                        break;
                    }

                    //player going from down to triangle
                    else if (
                        block.direction.y == "up" &&
                        this.lastPosition.y >= block.hitbox.position.y + block.hitbox.height
                    ) {
                        const offset = this.hitbox.position.y - this.position.y;
                        this.velocity.y = 0;
                        this.position.y =
                            block.hitbox.position.y + block.hitbox.height - offset + 0.01;
                        break;
                    }
                    // player standing on triangle
                    else if (
                        block.direction.y == "up" &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width >
                            block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.legs.position.x <= block.hitbox.position.x + block.hitbox.width
                    ) {
                        this.isOnBlock = true;
                        const offset =
                            this.hitbox.position.y + this.hitbox.height - this.position.y;

                        this.velocity.y = 0;
                        this.position.y = block.hitbox.position.y - offset - 0.01;
                        break;
                    }
                    //check collision for triangle up left
                    else if (
                        block.direction.y == "up" &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width >
                            block.hitbox.position.x &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width <
                            block.hitbox.position.x + block.hitbox.width
                    ) {
                        let xPos = this.calculateXPos(block);

                        this.triangleChangePosition(block, xPos);
                        break;
                    }
                    // check collision for triangle down left
                    else if (
                        block.direction.y == "down" &&
                        this.velocity.y < 0 &&
                        this.hitbox.position.x + this.hitbox.width >
                            block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.position.x <= block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.position.y < block.hitbox.position.y + block.hitbox.height &&
                        this.hitbox.position.y > block.hitbox.position.y
                    ) {
                        this.velocity.y = 0;
                        const offset = this.hitbox.position.y - this.position.y;
                        this.position.y =
                            block.hitbox.position.y + block.hitbox.height - offset + 0.01;
                        break;
                    }
                    // check collision for triangle down left
                    else if (
                        block.direction.y == "down" &&
                        this.velocity.y < 0 &&
                        this.hitbox.position.x + this.hitbox.width >= block.hitbox.position.x &&
                        this.hitbox.position.x + this.hitbox.width <=
                            block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.position.y > block.hitbox.position.y
                    ) {
                        let xPos = this.calculateXPos(block);
                        this.triangleChangePosition(block, xPos);
                        break;
                    }
                    //player going down to triangle down
                    else if (
                        block.direction.y == "down" &&
                        this.velocity.y >= 0 &&
                        this.hitbox.legs.position.x <
                            block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width >
                            block.hitbox.position.x &&
                        this.hitbox.position.y + this.hitbox.height >= block.hitbox.position.y &&
                        this.hitbox.position.y + this.hitbox.height <=
                            block.hitbox.position.y + block.hitbox.height
                    ) {
                        this.isOnBlock = true;
                        const offset =
                            this.hitbox.position.y + this.hitbox.height - this.position.y;

                        this.velocity.y = 0;
                        this.position.y = block.hitbox.position.y - offset - 0.01;
                        break;
                    }
                    //player going down head collision
                    else if (
                        this.velocity.y > 0 &&
                        this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                            block.hitbox.position.y &&
                        this.hitbox.legs.position.x > block.hitbox.position.x + block.hitbox.width
                    ) {
                        this.position.x += 3;
                        this.sliding.right = true;
                        break;
                    }
                    //player going down head collision
                    else if (block.direction.y == "up" && this.velocity.y > 0) {
                        let myBlock = {
                            direction: {
                                x: block.direction.x,
                                y: "down",
                            },
                        };
                        let xPos = this.calculateXPos(myBlock);
                        if (
                            this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                            block.hitbox.position.y + xPos
                        ) {
                            this.position.x--;
                            this.sliding.left = true;
                            break;
                        }
                    }
                }
                //collision for triangle right
                else if (block.direction.x == "right") {
                    //player going down head collision
                    if (
                        block.shape == "pondTriangle" &&
                        this.velocity.y > 0 &&
                        this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                            block.hitbox.position.y
                    ) {
                        this.position.x -= 3;
                        this.sliding.left = true;
                        break;
                    }
                    //check pond
                    if (
                        block.shape == "pondTriangle" &&
                        this.element != block.element &&
                        this.hitbox.position.y + this.hitbox.height >=
                            block.hitbox.position.y + 10 &&
                        this.hitbox.position.y <= block.hitbox.position.y &&
                        this.hitbox.legs.position.x > block.hitbox.position.x
                    ) {
                        //end
                        this.died = true;
                        break;
                    }

                    //player going from down to triangle
                    if (
                        block.direction.y == "up" &&
                        this.lastPosition.y >= block.hitbox.position.y + block.hitbox.height
                    ) {
                        const offset = this.hitbox.position.y - this.position.y;
                        this.velocity.y = 0;
                        this.position.y =
                            block.hitbox.position.y + block.hitbox.height - offset + 0.01;
                        break;
                    }
                    // player standing on triangle
                    else if (
                        block.direction.y == "up" &&
                        this.hitbox.legs.position.x < block.hitbox.position.x &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width >=
                            block.hitbox.position.x
                    ) {
                        this.isOnBlock = true;
                        const offset =
                            this.hitbox.position.y + this.hitbox.height - this.position.y;

                        this.velocity.y = 0;
                        this.position.y = block.hitbox.position.y - offset - 0.01;
                        break;
                    }
                    // check collision for triangle up right
                    else if (
                        block.direction.y == "up" &&
                        this.hitbox.legs.position.x >= block.hitbox.position.x &&
                        this.hitbox.legs.position.x < block.hitbox.position.x + block.hitbox.width
                    ) {
                        let xPos = this.calculateXPos(block);

                        this.triangleChangePosition(block, xPos);
                        break;
                    }

                    //check collision for triangle down right
                    else if (
                        block.direction.y == "down" &&
                        this.velocity.y < 0 &&
                        this.hitbox.position.x < block.hitbox.position.x &&
                        this.hitbox.position.x + this.hitbox.width >= block.hitbox.position.x &&
                        this.hitbox.position.y < block.hitbox.position.y + block.hitbox.height &&
                        this.hitbox.position.y > block.hitbox.position.y
                    ) {
                        this.velocity.y = 0;
                        const offset = this.hitbox.position.y - this.position.y;
                        this.position.y =
                            block.hitbox.position.y + block.hitbox.height - offset + 0.01;
                        break;
                    }

                    //check collision for triangle down right
                    else if (
                        block.direction.y == "down" &&
                        this.velocity.y < 0 &&
                        this.hitbox.position.x < block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.position.y > block.hitbox.position.y
                    ) {
                        let xPos = this.calculateXPos(block);

                        this.triangleChangePosition(block, xPos);
                        break;
                    }
                    //player going down to triangle down
                    else if (
                        block.direction.y == "down" &&
                        this.velocity.y >= 0 &&
                        this.hitbox.legs.position.x <
                            block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width >
                            block.hitbox.position.x &&
                        this.hitbox.position.y + this.hitbox.height >= block.hitbox.position.y &&
                        this.hitbox.position.y + this.hitbox.height <=
                            block.hitbox.position.y + block.hitbox.height
                    ) {
                        this.isOnBlock = true;
                        const offset =
                            this.hitbox.position.y + this.hitbox.height - this.position.y;

                        this.velocity.y = 0;
                        this.position.y = block.hitbox.position.y - offset - 0.01;
                        break;
                    }
                    //player going down head collision
                    else if (
                        this.velocity.y > 0 &&
                        this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                            block.hitbox.position.y &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width <
                            block.hitbox.position.x
                    ) {
                        this.position.x -= 3;
                        this.sliding.left = true;
                        break;
                    }
                    //player going down head collision
                    else if (block.direction.y == "up" && this.velocity.y > 0) {
                        let myBlock = {
                            direction: {
                                x: block.direction.x,
                                y: "down",
                            },
                        };
                        let xPos = this.calculateXPos(myBlock);
                        if (
                            this.hitbox.position.y + this.hitbox.height - this.hitbox.legs.height >=
                            block.hitbox.position.y + xPos
                        ) {
                            this.position.x++;
                            this.sliding.right = true;
                            break;
                        }
                    }
                    if (
                        block.shape == "pondTriangle" &&
                        this.velocity.y > 0 &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width >=
                            block.hitbox.position.x &&
                        this.hitbox.legs.position.x + this.hitbox.legs.width <=
                            block.hitbox.position.x + block.hitbox.width
                    ) {
                        this.isOnBlock = true;
                        const offset =
                            this.hitbox.position.y + this.hitbox.height - this.position.y;

                        this.velocity.y = 0;
                        this.position.y = block.hitbox.position.y - offset - 0.01;
                        break;
                    }
                }
                //collision for pond
                else if (block.shape == "pond") {
                    //check pond
                    if (
                        this.element != block.element &&
                        this.hitbox.position.y + this.hitbox.height >=
                            block.hitbox.position.y + 10 &&
                        this.hitbox.position.y + this.hitbox.height <=
                            block.hitbox.position.y + block.hitbox.height
                    ) {
                        //end
                        this.died = true;
                        break;
                    }

                    //player going down
                    if (
                        this.hitbox.legs.position.x <=
                            block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.legs.position.x >= block.hitbox.position.x &&
                        this.hitbox.position.y + this.hitbox.height >=
                            block.hitbox.position.y + block.hitbox.height / 2 &&
                        this.hitbox.position.y + this.hitbox.height <=
                            block.hitbox.position.y + block.hitbox.height &&
                        !(
                            blocks[i + 1] &&
                            blocks[i + 1].shape == "pondTriangle" &&
                            this.hitbox.legs.position.x + this.hitbox.legs.width >
                                blocks[i + 1].hitbox.position.x
                        )
                    ) {
                        this.isOnBlock = true;
                        this.velocity.y = 0;
                        const offset =
                            this.hitbox.position.y + this.hitbox.height - this.position.y;

                        this.position.y =
                            block.hitbox.position.y - offset - 0.01 + block.hitbox.height / 2;
                        break;
                    }
                    //player going up
                    else if (
                        this.hitbox.position.x <= block.hitbox.position.x + block.hitbox.width &&
                        this.hitbox.position.x >= block.hitbox.position.x &&
                        this.hitbox.position.y >=
                            block.hitbox.position.y + block.hitbox.height / 2 &&
                        this.hitbox.position.y <= block.hitbox.position.y + block.hitbox.height
                    ) {
                        this.velocity.y = 0;
                        const offset = this.hitbox.position.y - this.position.y;
                        this.position.y =
                            block.hitbox.position.y + block.hitbox.height - offset + 0.01;
                        break;
                    }
                }
            }
        }
    }
}
