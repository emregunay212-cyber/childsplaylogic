/* ============================================
   OYUN BAHÇESİ - Sürükle Bırak Sistemi
   ============================================ */

const DragSystem = (() => {
    let activeElement = null;
    let offsetX = 0, offsetY = 0;
    let startX = 0, startY = 0;
    let dropZones = [];
    let onDropCallback = null;

    function makeDraggable(element, options = {}) {
        element.style.touchAction = 'none';
        element.classList.add('draggable-item');

        element.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            activeElement = element;
            const rect = element.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            startX = rect.left;
            startY = rect.top;

            element.classList.add('dragging');
            element.style.position = 'fixed';
            element.style.left = rect.left + 'px';
            element.style.top = rect.top + 'px';
            element.style.zIndex = '1000';
            element.style.width = rect.width + 'px';
            element.style.height = rect.height + 'px';

            element.setPointerCapture(e.pointerId);
            AudioManager.play('pop');
        });

        element.addEventListener('pointermove', (e) => {
            if (activeElement !== element) return;
            e.preventDefault();
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            element.style.left = x + 'px';
            element.style.top = y + 'px';

            // Drop zone highlight
            const centerX = e.clientX;
            const centerY = e.clientY;
            dropZones.forEach(zone => {
                const zRect = zone.element.getBoundingClientRect();
                const inside = centerX >= zRect.left && centerX <= zRect.right &&
                               centerY >= zRect.top && centerY <= zRect.bottom;
                zone.element.classList.toggle('highlight', inside);
            });
        });

        element.addEventListener('pointerup', (e) => {
            if (activeElement !== element) return;
            e.preventDefault();
            element.classList.remove('dragging');

            const centerX = e.clientX;
            const centerY = e.clientY;

            let dropped = false;
            dropZones.forEach(zone => {
                zone.element.classList.remove('highlight');
                const zRect = zone.element.getBoundingClientRect();
                const inside = centerX >= zRect.left && centerX <= zRect.right &&
                               centerY >= zRect.top && centerY <= zRect.bottom;
                if (inside && !dropped) {
                    dropped = true;
                    if (onDropCallback) {
                        onDropCallback(element, zone.element, zone.id);
                    }
                }
            });

            if (!dropped) {
                // Geri dön
                element.style.left = startX + 'px';
                element.style.top = startY + 'px';
                setTimeout(() => {
                    resetPosition(element);
                }, 200);
            }

            activeElement = null;
        });

        element.addEventListener('pointercancel', () => {
            if (activeElement === element) {
                element.classList.remove('dragging');
                resetPosition(element);
                activeElement = null;
            }
        });
    }

    function resetPosition(element) {
        element.style.position = '';
        element.style.left = '';
        element.style.top = '';
        element.style.zIndex = '';
        element.style.width = '';
        element.style.height = '';
    }

    function snapToTarget(element, target) {
        const tRect = target.getBoundingClientRect();
        element.style.position = 'fixed';
        element.style.left = tRect.left + 'px';
        element.style.top = tRect.top + 'px';
        element.style.width = tRect.width + 'px';
        element.style.height = tRect.height + 'px';
        element.style.zIndex = '10';
        element.classList.remove('dragging');
    }

    function setDropZones(zones) {
        dropZones = zones; // [{element, id}]
    }

    function setOnDrop(callback) {
        onDropCallback = callback;
    }

    function cleanup() {
        dropZones = [];
        onDropCallback = null;
        activeElement = null;
    }

    return { makeDraggable, setDropZones, setOnDrop, snapToTarget, resetPosition, cleanup };
})();
