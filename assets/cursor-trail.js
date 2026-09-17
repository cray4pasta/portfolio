/* Magic cursor trail — glowing particle stream following the pointer. */
(() => {
  if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'cursor-trail-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9998';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const colors = ['#c2a8ff', '#9fd6ff', '#ffb3dd', '#ffd66b'];
  let particles = [];
  let mouseX = -100, mouseY = -100;
  let lastX = mouseX, lastY = mouseY;
  let active = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    active = true;

    const dx = mouseX - lastX;
    const dy = mouseY - lastY;
    const dist = Math.hypot(dx, dy);
    // higher birth rate — denser trail along the path
    const steps = Math.min(Math.max(Math.floor(dist / 2.5), 1), 16);

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = lastX + dx * t;
      const y = lastY + dy * t;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.5 + 0.15;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.12,
        size: Math.random() * 0.7 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: Math.random() * 0.022 + 0.016,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.4 + 0.25,
        // turbulence: gentle random drift force re-rolled each frame
        wander: Math.random() * Math.PI * 2,
        wanderSpeed: Math.random() * 0.15 + 0.05,
      });
    }

    if (particles.length > 420) particles.splice(0, particles.length - 420);
    lastX = mouseX;
    lastY = mouseY;
  }, { passive: true });

  window.addEventListener('mouseleave', () => { active = false; });

  function draw() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // turbulence — gentle wandering force so particles drift naturally
      p.wander += p.wanderSpeed;
      p.vx += Math.cos(p.wander) * 0.006;
      p.vy += Math.sin(p.wander) * 0.006;
      // gravity — slight downward pull as they age
      p.vy += 0.0025;

      const px = p.x, py = p.y;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.twinklePhase += p.twinkleSpeed;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // glitter flicker — brightness pulses fast so flecks seem to catch the light
      const twinkle = 0.5 + Math.abs(Math.sin(p.twinklePhase)) * 0.5;
      const r = p.size * p.life;

      // saturated pastel glow
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4.5);
      grad.addColorStop(0, p.color);
      grad.addColorStop(0.5, p.color);
      grad.addColorStop(1, 'transparent');
      ctx.globalAlpha = p.life * twinkle;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 4.5, 0, Math.PI * 2);
      ctx.fill();

      // soft halo ring around the fleck
      ctx.globalAlpha = p.life * twinkle * 0.5;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = r * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2.4, 0, Math.PI * 2);
      ctx.stroke();

      // motion blur — faint stretch along the direction of travel
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 0.25) {
        ctx.globalAlpha = p.life * twinkle * 0.3;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = r * 0.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // tiny bright fleck core for the glitter catch-light
      ctx.globalAlpha = p.life * twinkle * 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
