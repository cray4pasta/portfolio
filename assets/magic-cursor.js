/* Magic cursor: a trail of small four-point sparkles that follow the
   pointer, drift down and fade. Fun page only. Skipped on touch devices
   and when the visitor prefers reduced motion. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const HUES = ['#c9b8ff', '#ffc2e2', '#ffe3a3', '#b8e6ff'];
  const MAX = 80;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  const sparks = [];
  let last = null;
  let running = false;

  function spawn(x, y) {
    if (sparks.length >= MAX) sparks.shift();
    sparks.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.6,
      vy: Math.random() * 0.6 + 0.2,
      size: Math.random() * 4 + 3,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.08,
      life: 1,
      decay: Math.random() * 0.015 + 0.015,
      color: HUES[(Math.random() * HUES.length) | 0],
    });
  }

  function drawSparkle(s) {
    const r = s.size * s.life;
    const w = r * 0.28;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.globalAlpha = s.life;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(w, -w, r, 0);
    ctx.quadraticCurveTo(w, w, 0, r);
    ctx.quadraticCurveTo(-w, w, -r, 0);
    ctx.quadraticCurveTo(-w, -w, 0, -r);
    ctx.fill();
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.rot += s.spin;
      s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      drawSparkle(s);
    }
    if (sparks.length) {
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }

  addEventListener('pointermove', (e) => {
    if (last) {
      // Spawn along the path so fast movements leave an even trail
      const dist = Math.hypot(e.clientX - last.x, e.clientY - last.y);
      const steps = Math.min(Math.floor(dist / 14), 4);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        spawn(last.x + (e.clientX - last.x) * t, last.y + (e.clientY - last.y) * t);
      }
    }
    last = { x: e.clientX, y: e.clientY };
    if (!running && sparks.length) {
      running = true;
      requestAnimationFrame(tick);
    }
  }, { passive: true });

  document.addEventListener('pointerleave', () => { last = null; });
})();
