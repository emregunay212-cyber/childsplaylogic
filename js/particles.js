/* ============================================
   OYUN BAHÇESİ - Parçacık Efektleri
   ============================================ */

const Particles = (() => {
    let canvas, ctx;
    let particles = [];
    let animId = null;

    const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7B731', '#A55EEA', '#FF78C4', '#26DE81', '#FFD700'];

    function init() {
        canvas = document.getElementById('particles-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
    }

    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function animate() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles = particles.filter(p => p.life > 0);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life -= p.decay;
            p.rotation += p.rotSpeed;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = Math.max(0, p.life);

            if (p.type === 'confetti') {
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            } else if (p.type === 'star') {
                drawStar(ctx, 0, 0, 5, p.size, p.size / 2, p.color);
            } else if (p.type === 'sparkle') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(0, 0, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });

        if (particles.length > 0) {
            animId = requestAnimationFrame(animate);
        } else {
            animId = null;
        }
    }

    function drawStar(ctx, cx, cy, spikes, outerR, innerR, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
    }

    function spawn(type, x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 2 + Math.random() * 6;

            particles.push({
                type,
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                gravity: type === 'sparkle' ? 0 : 0.12,
                life: 1,
                decay: 0.012 + Math.random() * 0.01,
                size: type === 'confetti' ? 8 + Math.random() * 6 : 4 + Math.random() * 4,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.15,
            });
        }

        if (!animId) {
            animId = requestAnimationFrame(animate);
        }
    }

    function confetti(x, y, count = 50) {
        if (!ctx) init();
        spawn('confetti', x || canvas.width / 2, y || canvas.height / 3, count);
    }

    function stars(x, y, count = 15) {
        if (!ctx) init();
        spawn('star', x || canvas.width / 2, y || canvas.height / 3, count);
    }

    function sparkle(x, y, count = 10) {
        if (!ctx) init();
        spawn('sparkle', x, y, count);
    }

    function celebrate() {
        if (!ctx) init();
        const cx = canvas.width / 2;
        const cy = canvas.height / 3;
        confetti(cx, cy, 60);
        setTimeout(() => stars(cx, cy, 20), 200);
        setTimeout(() => confetti(cx - 100, cy, 30), 300);
        setTimeout(() => confetti(cx + 100, cy, 30), 400);
    }

    return { init, confetti, stars, sparkle, celebrate };
})();
