/* Thank-you note component. Renders into every
   <div data-component="thank-you-note"> placeholder: a typewriter whose
   carriage-return lever, when clicked, slides the carriage right and back,
   then feeds a ticket (Figma node 120:4409) up from behind the roller with
   the visitor's visit date and time spent on the site.

   Five pieces, kept separate so the UI can be redesigned without
   touching the logic:
     1. visit tracker – starts on script load; counts *visible* time
                        across pages via sessionStorage (so it's site-wide
                        as long as every page loads this script)
     2. ticket        – static artwork + text from the design; the date and
                        seconds are filled in on each pull of the lever
     3. sound         – synthesized typewriter clicks, slides and a bell
     4. floating      – the printed ticket flips toward the viewer and floats
                        with download / close buttons
     5. picture       – redraws the ticket on a canvas: it floats and downloads

   Exposed for debugging: window.ThankYouNote.getVisitData() */
(function () {
  const KEY = 'tyn:';
  const store = {
    get(k) { try { return sessionStorage.getItem(KEY + k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(KEY + k, v); } catch (e) {} },
  };

  /* ─── 1. Visit tracker ─── */
  let activeMs = Number(store.get('activeMs')) || 0; // banked from earlier pages
  let segmentStart = document.visibilityState === 'visible' ? performance.now() : null;

  function bank() {
    if (segmentStart !== null) {
      activeMs += performance.now() - segmentStart;
      segmentStart = null;
    }
    store.set('activeMs', String(Math.round(activeMs)));
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') bank();
    else segmentStart = performance.now();
  });
  // pagehide covers navigating to another page on the site
  window.addEventListener('pagehide', bank);

  function secondsSpent() {
    const live = segmentStart !== null ? performance.now() - segmentStart : 0;
    return Math.max(1, Math.round((activeMs + live) / 1000));
  }

  // Ticket shows the first page view of the session as "Sep 24" over "2026"
  function getVisitData() {
    // Today's date at print time (a tab left open overnight still prints today)
    const now = new Date();
    return {
      day: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      year: String(now.getFullYear()),
      seconds: secondsSpent(),
    };
  }

  /* ─── 2. Ticket ─── */
  const ticket = `
          <div class="tyn-ticket">
            <div class="tk-shape"><img src="assets/ticket/ticket-shape.svg" alt="" width="429" height="220"></div>
            <div class="tk-frame"></div>
            <div class="tk-col-name"></div>
            <div class="tk-col-date"></div>
            <div class="tk-rule"></div>
            <div class="tk-name"><p>Prerna Kashyap</p></div>
            <p class="tk-day"></p>
            <p class="tk-year"></p>
            <p class="tk-time"></p>
            <p class="tk-message">Hi, thank you for visiting my site. I hope you had fun exploring :)</p>
            <div class="tk-flowers tk-flowers-b"><div><img src="assets/ticket/ticket-flowers.png" alt=""></div></div>
            <div class="tk-flowers tk-flowers-a"><img src="assets/ticket/ticket-flowers-peony.png" alt="" width="284" height="224"></div>
            <a class="tk-email" href="mailto:prernakashyapuw@gmail.com">My email: prernakashyapuw@gmail.com</a>
            <div class="tk-texture"><img src="assets/ticket/ticket-texture.svg" alt="" loading="lazy"></div>
          </div>`;

  // The typewriter is one PNG drawn twice: .tyn-body (the outer shell) stays put on
  // top, .tyn-carriage-img (everything else) slides underneath it with the carriage.
  // The clip-path polygons that split them live in shared.css.
  const img = '<img src="assets/typewriter.png" alt="" width="1758" height="895">';
  document.querySelectorAll('[data-component="thank-you-note"]').forEach((el) => {
    el.outerHTML = `
  <p class="tyn-hint">Click the typewriter :)</p>
  <div class="tyn">
    <div class="tyn-machine">
      <div class="tyn-gap-fill"></div>
      <div class="tyn-gap-fill tyn-gap-fill-r"></div>
      <div class="tyn-corner-fill"></div>
      <div class="tyn-carriage">
        <div class="tyn-tray" aria-live="polite">
          <div class="tyn-note" hidden>${ticket}</div>
        </div>
        <div class="tyn-layer tyn-carriage-img">${img}</div>
        <button type="button" class="tyn-handle" aria-label="Pull the carriage lever to get a thank-you note"></button>
      </div>
      <div class="tyn-layer tyn-body">${img}</div>
    </div>
  </div>`;
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ─── 3. Sound ───
     Synthesized with Web Audio (no audio files): short filtered-noise clicks
     for keys, a noise sweep for the carriage sliding, a bell for the lever.
     The context is created on the first lever pull, a user gesture, so
     browsers allow it to play. */
  let ctx = null;
  let noise = null;
  function audio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // A noise burst through a bandpass filter, shaped by a fast attack/decay
  function burst(at, { freq, q = 1.2, gain, decay, sweepTo }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(freq, at);
    if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, at + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(at, Math.random() * 0.4);
    src.stop(at + decay + 0.02);
  }
  const sound = {
    key(at) { burst(at, { freq: 1800 + Math.random() * 1400, gain: 0.35, decay: 0.045 }); },
    slide(at, dur) { burst(at, { freq: 700, sweepTo: 2600, q: 0.8, gain: 0.12, decay: dur }); },
    ratchet(at) { burst(at, { freq: 900, q: 2, gain: 0.3, decay: 0.06 }); },
    bell(at) {
      [[2093, 0.18], [4186, 0.05]].forEach(([f, v]) => {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(v, at + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
        o.connect(g).connect(ctx.destination);
        o.start(at);
        o.stop(at + 1.45);
      });
    },
  };
  // Schedule sounds relative to "now"; silently skipped if Web Audio is unavailable
  function play(fn) {
    const ac = audio();
    if (ac) fn(ac.currentTime);
  }

  // Carriage return: slide right (the lever push), then ease back to the start.
  function returnCarriage(carriage) {
    play((t) => { sound.ratchet(t); sound.slide(t, 0.35); sound.bell(t + 0.33); });
    return carriage.animate([
      { transform: 'translateX(0)', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      { transform: 'translateX(5%)', offset: 0.35, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { transform: 'translateX(0)' },
    ], { duration: 1000 }).finished;
  }

  // Typing the ticket out, one line at a time like a real typewriter: the
  // carriage glides left as the line is typed, then snaps back right, and the
  // paper advances a line on each return. The ticket rides in the carriage, so
  // it shifts sideways with it.
  const LINES = 5;          // line feeds to bring the whole ticket up
  const TYPE_SHIFT = '-4%'; // how far the carriage travels while typing a line
  async function typeOut(carriage, note) {
    for (let i = 1; i <= LINES; i++) {
      // Seven key clicks spread over each 380ms line
      play((t) => { for (let k = 1; k <= 7; k++) sound.key(t + (k * 0.38) / 7); });
      await carriage.animate(
        [{ transform: 'translateX(0)' }, { transform: `translateX(${TYPE_SHIFT})` }],
        { duration: 380, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' }
      ).finished;
      play((t) => { sound.slide(t, 0.18); sound.ratchet(t + 0.17); });
      const from = 100 - ((i - 1) * 100) / LINES;
      const to = 100 - (i * 100) / LINES;
      await Promise.all([
        carriage.animate(
          [{ transform: `translateX(${TYPE_SHIFT})` }, { transform: 'translateX(0)' }],
          { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
        ).finished,
        note.animate(
          [{ transform: `translateY(${from}%)` }, { transform: `translateY(${to}%)` }],
          { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' }
        ).finished,
      ]);
      carriage.getAnimations().forEach((a) => a.cancel()); // drop held typing frames
    }
    note.classList.add('is-out');                    // settle into the resting state…
    note.getAnimations().forEach((a) => a.cancel()); // …then release the held frames
  }

  /* ─── 4. Floating ticket ───
     Once printed, the ticket tears off: it flips once while flying from the
     typewriter to the middle of the screen, floats there, and offers
     download / close buttons. */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const icons = {
    download: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>',
  };

  // Resolves when the visitor closes the ticket. `art` is the ticket already
  // drawn to a canvas (drawTicket): one flat bitmap flies far more smoothly than
  // the live ticket markup with its heavy SVG grain, fonts and filters.
  function floatTicket(ticket, art, returnFocusTo) {
    return new Promise((done) => {
      const from = ticket.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.className = 'tyn-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Your thank-you ticket');
      overlay.innerHTML = `
        <div class="tyn-backdrop"></div>
        <div class="tyn-float">
          <div class="tyn-float-bob">
            <div class="tyn-float-front">
              <a class="tyn-email-link" href="mailto:prernakashyapuw@gmail.com" aria-label="Email Prerna at prernakashyapuw@gmail.com"></a>
            </div>
            <div class="tyn-float-back" aria-hidden="true"><img src="assets/ticket/ticket-shape.svg" alt=""></div>
          </div>
        </div>
        <div class="tyn-actions">
          <button type="button" class="tyn-action" data-action="download" aria-label="Download ticket">${icons.download}</button>
          <button type="button" class="tyn-action" data-action="close" aria-label="Close">${icons.close}</button>
        </div>`;
      // The picture takes the ticket's place; the original leaves the typewriter
      art.setAttribute('role', 'img');
      art.setAttribute('aria-label', `Thank-you ticket: ${ticket.innerText.replace(/\s+/g, ' ').trim()}`);
      overlay.querySelector('.tyn-float-front').prepend(art);
      document.body.append(overlay);

      const float = overlay.querySelector('.tyn-float');
      // The floating copy is laid out at its final size (so it's rasterized once,
      // crisp) and animated up from the printed size: 1.6× max, always on screen.
      const scale = Math.min(1.6, (innerWidth - 32) / from.width, (innerHeight * 0.62) / from.height);
      float.style.width = `${from.width * scale}px`;

      const to = float.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const k = 1 / scale; // scale at which the copy exactly covers the printed ticket

      overlay.classList.add('is-open');
      const landed = reduceMotion.matches ? 0 : 1500;
      if (!reduceMotion.matches) {
        // Lift out of the typewriter tipping back, tumble end over end toward the
        // viewer while growing, overshoot a touch, settle.
        float.animate([
          { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${k}) rotateX(0deg)`, easing: 'cubic-bezier(0.3, 0, 0.6, 1)' },
          { transform: `translate3d(${dx}px, ${dy - 48}px, 0) scale(${k}) rotateX(-28deg)`, offset: 0.16, easing: 'cubic-bezier(0.35, 0, 0.25, 1)' },
          { transform: `translate3d(${dx * 0.45}px, ${dy * 0.45}px, 0) scale(${k + (1 - k) * 0.35}) rotateX(-190deg)`, offset: 0.55, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)' },
          { transform: 'translate3d(0, 0, 0) scale(1.05) rotateX(-360deg)', offset: 0.86, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' },
          { transform: 'translate3d(0, 0, 0) scale(1) rotateX(-360deg)' },
        ], { duration: landed, fill: 'forwards' });
      }
      setTimeout(() => overlay.classList.add('is-floating'), landed);
      overlay.querySelector('[data-action="download"]').focus({ preventScroll: true });

      let closing = false;
      async function close() {
        if (closing) return;
        closing = true;
        document.removeEventListener('keydown', onKey);
        overlay.classList.remove('is-open', 'is-floating');
        if (!reduceMotion.matches) {
          float.getAnimations().forEach((a) => a.cancel());
          await float.animate([
            { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
            { transform: 'translate3d(0, 40px, 0) scale(0.9)', opacity: 0 },
          ], { duration: 280, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }).finished;
        }
        overlay.remove();
        returnFocusTo.focus({ preventScroll: true });
        done();
      }
      function onKey(e) {
        if (e.key === 'Escape') close();
        if (e.key === 'Tab') { // keep focus inside: email link, download, close
          const items = overlay.querySelectorAll('.tyn-email-link, .tyn-action');
          const first = items[0], last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener('keydown', onKey);
      overlay.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (btn?.dataset.action === 'close') return close();
        if (btn?.dataset.action === 'download') {
          btn.disabled = true;
          try { await downloadTicket(art); } finally { btn.disabled = false; }
          return;
        }
        if (!e.target.closest('.tyn-float')) close(); // click on the backdrop
      });
    });
  }

  /* ─── 5. Ticket picture + download ───
     Redraws the ticket on a canvas from the same Figma geometry the CSS uses
     (428.74×220 units, here at 3×). That canvas is what floats, and what the
     download button saves as a PNG. */
  const loadImage = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });

  function wrapLines(g, text, maxWidth) {
    const lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && g.measureText(next).width > maxWidth) { lines.push(line); line = word; }
      else line = next;
    }
    return line ? [...lines, line] : lines;
  }

  async function drawTicket(ticket) {
    const S = 3;
    const W = 428.74, H = 220;
    const [shape, texture, flowers, peony] = await Promise.all([
      'assets/ticket/ticket-shape.svg', 'assets/ticket/ticket-texture.svg',
      'assets/ticket/ticket-flowers.png', 'assets/ticket/ticket-flowers-peony.png',
    ].map(loadImage));
    await document.fonts.ready;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(W * S);
    canvas.height = H * S;
    const g = canvas.getContext('2d');
    g.scale(S, S);

    // Ticket shape
    g.save();
    g.beginPath(); g.rect(0, 0, W, 219.891); g.clip();
    g.drawImage(shape, 0, 0, W, 220.203);
    g.restore();

    // Rules
    g.strokeStyle = '#000';
    g.lineWidth = 1;
    g.strokeRect(42.5, 24.5, 342.62, 171.82);
    const line = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    line(87.5, 27, 87.5, 194);        // name column
    line(150.5, 26.67, 150.5, 166.67); // date column
    line(91, 169.5, 379, 169.5);       // above the email

    // Flowers (left group: the source rotated 90° into a 141×56 box)
    g.save();
    g.translate(159 + 70.5, 110.67 + 28);
    g.rotate(Math.PI / 2);
    g.beginPath(); g.rect(-28, -70.5, 56, 141); g.clip();
    g.drawImage(flowers, -28 - 0.05, -70.5, 88.1, 141);
    g.restore();
    // Peony: its export sits on #1e1e1e, so turn brightness into ink alpha
    // (the same result as the CSS brightness(8.5) + multiply)
    const pc = document.createElement('canvas');
    pc.width = peony.naturalWidth; pc.height = peony.naturalHeight;
    const pg = pc.getContext('2d');
    pg.drawImage(peony, 0, 0);
    const px = pg.getImageData(0, 0, pc.width, pc.height);
    for (let i = 0; i < px.data.length; i += 4) {
      const f = Math.min(1, (px.data[i] * 8.5) / 255);
      px.data[i] = px.data[i + 1] = px.data[i + 2] = 0;
      px.data[i + 3] = Math.round((1 - f) * 255);
    }
    pg.putImageData(px, 0, 0);
    g.drawImage(pc, 300, 110.67, 71, 56);

    // Text
    g.fillStyle = '#000';
    g.save();
    g.translate(64, 110.5);
    g.rotate(-Math.PI / 2);
    g.font = '800 20px "PP Editorial Old", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('Prerna Kashyap', 0, 1);
    g.restore();

    const text = (sel) => ticket.querySelector(sel).textContent;
    g.textBaseline = 'top';
    g.textAlign = 'center';
    g.font = '14px "Moms Typewriter", monospace';
    g.fillText(text('.tk-day'), 119.5, 48);
    g.fillText(text('.tk-year'), 119.5, 69);
    g.font = '12px "Moms Typewriter", monospace';
    wrapLines(g, text('.tk-time'), 55).forEach((l, i) => g.fillText(l, 119.5, 120.67 + i * 14));
    g.textAlign = 'left';
    wrapLines(g, text('.tk-message'), 220).forEach((l, i) => g.fillText(l, 159, 50.67 + i * 14));
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '10px "Moms Typewriter", monospace';
    g.fillText(text('.tk-email'), 87 + 145.5, 182);

    // Grain on top, as in the design
    g.save();
    g.beginPath(); g.rect(0, 0, 403, H); g.clip();
    g.globalAlpha = 0.56;
    g.drawImage(texture, 8, 0, 414, 219);
    g.restore();
    return canvas;
  }

  async function downloadTicket(canvas) {
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prerna-kashyap-thank-you-ticket.png';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.querySelectorAll('.tyn').forEach((root) => {
    const handle = root.querySelector('.tyn-handle');
    const carriage = root.querySelector('.tyn-carriage');
    const note = root.querySelector('.tyn-note');
    let busy = false;

    // The whole machine works as the lever: a click anywhere on it (outside
    // the paper tray, which may hold the ticket's email link) pulls it.
    root.querySelector('.tyn-machine').addEventListener('click', (e) => {
      if (e.target !== handle && !e.target.closest('.tyn-tray')) handle.click();
    });

    handle.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      root.classList.add('is-busy');

      // Pull any previous sheet out instantly; a fresh one is typed out after the return
      note.classList.remove('is-out');

      const { day, year, seconds } = getVisitData();
      note.querySelector('.tk-day').textContent = day;
      note.querySelector('.tk-year').textContent = year;
      note.querySelector('.tk-time').textContent = `Time: ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
      note.hidden = false;

      // Draw the flying/downloadable picture while the ticket is being typed out
      const printed = note.querySelector('.tyn-ticket');
      const art = drawTicket(printed).catch(() => null);

      if (reduceMotion.matches) {
        note.classList.add('is-out');
      } else {
        await returnCarriage(carriage);
        await typeOut(carriage, note);
        await sleep(450); // a beat to see it in the typewriter before it lifts off
      }

      const picture = await art;
      if (picture) { // if it couldn't be drawn, the ticket simply stays in the typewriter
        const closed = floatTicket(printed, picture, handle);
        note.classList.remove('is-out'); // the floating picture has taken its place
        await closed;
      }

      busy = false;
      root.classList.remove('is-busy');
    });
  });

  window.ThankYouNote = { getVisitData };
})();
