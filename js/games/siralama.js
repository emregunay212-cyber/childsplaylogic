/* ============================================
   OYUN: Sıralama (Sorting/Ordering)
   ============================================ */

const Siralama = (() => {
    const id = 'siralama';

    const levels = [
        { count: 3, type: 'size', rounds: 3 },
        { count: 5, type: 'number', rounds: 3 },
        { count: 5, type: 'mixed', rounds: 3 },
    ];

    const sizeEmojis = [
        { emoji: '🐁', size: 1, name: 'Fare' },
        { emoji: '🐱', size: 2, name: 'Kedi' },
        { emoji: '🐕', size: 3, name: 'Köpek' },
        { emoji: '🐎', size: 4, name: 'At' },
        { emoji: '🐘', size: 5, name: 'Fil' },
        { emoji: '🐛', size: 0.5, name: 'Böcek' },
        { emoji: '🐰', size: 1.5, name: 'Tavşan' },
        { emoji: '🦁', size: 3.5, name: 'Aslan' },
        { emoji: '🐻', size: 4.5, name: 'Ayı' },
        { emoji: '🦒', size: 5.5, name: 'Zürafa' },
    ];

    let container = null;
    let callbacks = null;
    let roundsPlayed = 0;
    let totalRounds = 3;
    let selectedSlot = null;

    function init(gameArea, level, cbs) {
        container = gameArea;
        callbacks = cbs;
        roundsPlayed = 0;
        totalRounds = levels[level - 1].rounds;
        GameEngine.setTotal(totalRounds);
        startRound(level);
    }

    function startRound(level) {
        container.innerHTML = '';
        selectedSlot = null;
        const config = levels[level - 1];

        let items = [];
        let instructionText = '';

        if (config.type === 'size' || config.type === 'mixed') {
            const shuffled = [...sizeEmojis].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, config.count);
            items = selected.map(s => ({
                emoji: s.emoji,
                value: s.size,
                label: s.name,
                displaySize: 1.2 + s.size * 0.3,
            }));
            instructionText = 'Hayvanları küçükten büyüğe sırala!';
        }

        if (config.type === 'number') {
            const nums = [];
            while (nums.length < config.count) {
                const n = 1 + Math.floor(Math.random() * 10);
                if (!nums.includes(n)) nums.push(n);
            }
            items = nums.map(n => ({
                emoji: n.toString(),
                value: n,
                label: n.toString(),
                displaySize: 2,
                isNumber: true,
            }));
            instructionText = 'Sayıları küçükten büyüğe sırala!';
        }

        // Doğru sıra
        const correctOrder = [...items].sort((a, b) => a.value - b.value);

        // Karıştır
        const shuffledItems = [...items].sort(() => Math.random() - 0.5);

        // Yönerge
        const instruction = document.createElement('div');
        instruction.className = 'game-instruction';
        instruction.textContent = instructionText;
        container.appendChild(instruction);

        // Ok göstergesi
        const arrow = document.createElement('div');
        arrow.style.cssText = 'font-family:Fredoka;font-size:1rem;color:#999;text-align:center;margin-bottom:12px';
        arrow.textContent = '◀ Küçük ── Büyük ▶';
        container.appendChild(arrow);

        // Slot'lar
        const slotsDiv = document.createElement('div');
        slotsDiv.className = 'sorting-slots';
        slotsDiv.style.flexWrap = 'wrap';

        const slots = [];
        for (let i = 0; i < config.count; i++) {
            const slot = document.createElement('div');
            slot.className = 'sorting-slot';
            slot.dataset.index = i;
            slot.dataset.filled = 'false';
            slots.push(slot);
            slotsDiv.appendChild(slot);
        }
        container.appendChild(slotsDiv);

        // Seçenek kartları
        const itemsDiv = document.createElement('div');
        itemsDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:20px';

        shuffledItems.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'game-option-btn';
            btn.dataset.value = item.value;
            btn.style.width = '80px';
            btn.style.height = '80px';

            if (item.isNumber) {
                btn.style.fontSize = '2rem';
                btn.style.fontWeight = '700';
                btn.style.color = '#3498DB';
                btn.textContent = item.emoji;
            } else {
                btn.style.fontSize = item.displaySize + 'rem';
                btn.textContent = item.emoji;
            }

            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                placeItem(btn, item, slots, correctOrder, itemsDiv);
            });

            itemsDiv.appendChild(btn);
        });

        container.appendChild(itemsDiv);

        // Slot'lara tıklama - yerleştirilmiş öğeyi geri al
        slots.forEach(slot => {
            slot.addEventListener('click', () => {
                if (slot.dataset.filled === 'true' && slot._sourceBtn) {
                    slot.textContent = '';
                    slot.dataset.filled = 'false';
                    slot._sourceBtn.disabled = false;
                    slot._sourceBtn.style.opacity = '1';
                    slot._sourceBtn = null;
                    AudioManager.play('tap');
                }
            });
        });
    }

    let nextSlotIndex = 0;

    function placeItem(btn, item, slots, correctOrder, itemsDiv) {
        // Sonraki boş slot'u bul
        let targetSlot = null;
        for (const slot of slots) {
            if (slot.dataset.filled === 'false') {
                targetSlot = slot;
                break;
            }
        }

        if (!targetSlot) return;

        // Slot'a yerleştir
        targetSlot.textContent = item.isNumber ? item.emoji : item.emoji;
        targetSlot.style.fontSize = item.isNumber ? '2rem' : (item.displaySize || 1.5) + 'rem';
        targetSlot.dataset.filled = 'true';
        targetSlot.dataset.value = item.value;
        targetSlot._sourceBtn = btn;

        btn.disabled = true;
        btn.style.opacity = '0.4';
        AudioManager.play('tap');

        // Tüm slot'lar dolduysa kontrol et
        const allFilled = slots.every(s => s.dataset.filled === 'true');
        if (allFilled) {
            checkOrder(slots, correctOrder);
        }
    }

    function checkOrder(slots, correctOrder) {
        const values = slots.map(s => parseFloat(s.dataset.value));
        const isCorrect = values.every((v, i) => v === correctOrder[i].value);

        if (isCorrect) {
            // Doğru sıralama
            slots.forEach((slot, i) => {
                setTimeout(() => {
                    slot.style.borderColor = 'var(--success)';
                    slot.style.background = 'var(--success-light)';
                    slot.style.animation = 'successPulse 0.3s ease';
                }, i * 100);
            });

            callbacks.onCorrect();
            roundsPlayed++;

            if (roundsPlayed >= totalRounds) {
                setTimeout(() => callbacks.onComplete(), 800);
            } else {
                setTimeout(() => startRound(GameEngine.getCurrentLevel()), 1200);
            }
        } else {
            // Yanlış sıralama - reset
            callbacks.onWrong();

            slots.forEach(slot => {
                slot.style.borderColor = 'var(--error)';
                slot.style.animation = 'wiggle 0.4s ease';
            });

            setTimeout(() => {
                slots.forEach(slot => {
                    if (slot._sourceBtn) {
                        slot._sourceBtn.disabled = false;
                        slot._sourceBtn.style.opacity = '1';
                    }
                    slot.textContent = '';
                    slot.dataset.filled = 'false';
                    slot.dataset.value = '';
                    slot._sourceBtn = null;
                    slot.style.borderColor = '';
                    slot.style.background = '';
                    slot.style.animation = '';
                });
            }, 700);
        }
    }

    function destroy() {
        if (container) container.innerHTML = '';
        nextSlotIndex = 0;
    }

    return { id, levels, init, destroy };
})();
