/* White-on-white name — "Prerna Kashyap" in thick white paint on a white
   ground, lit from the side so only the relief reads. Moving the cursor over
   the letters leaves a pale opal oil sheen that drifts and fades.
   Usage: <canvas class="white-art" data-name="Prerna Kashyap"></canvas>
   The canvas sizes itself: the ink spans the canvas width minus --art-inset
   on each side (capped at --art-width if set, centred), the tallest glyph starts --art-top below whatever precedes
   the canvas, and layout ends at the ink's bottom edge (see index.html). */
(() => {
  const cv = document.querySelector('canvas.white-art');
  if (!cv) return;
  const NAME = cv.dataset.name || 'Prerna Kashyap';
  const FAMILY = '"PP Editorial Old Art", "Times New Roman", Georgia, serif';
  const fontSpec = size => `400 ${size}px ${FAMILY}`;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Settings tuned in the prototype's control panel.
  const tune = { depth: 100, strength: 0, cast: 24, angle: 214, spacing: -7, oil: 17, move: 0, flow: 12, spread: 19, linger: 50 };

  const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) { document.documentElement.classList.add('no-white-art'); return; }

  const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;

  const NOISE = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
    float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a*noise(p); p = p*2.03 + 17.1; a *= .5; } return s; }
  `;

  // Oil layer: decays slowly, drifts, and takes new splats along the cursor path.
  const OIL = NOISE + `
    varying vec2 vUv;
    uniform sampler2D uPrev;
    uniform vec2 uA, uB;
    uniform float uAsp, uRad, uAmt, uTime, uFlow, uKeep, uFade;
    void main(){
      vec2 q = vUv*vec2(uAsp, 1.);
      vec2 flow = vec2(noise(q*3. + uTime*.15) - .5, noise(q*3. + 19. + uTime*.15) - .5) * uFlow;
      float prev = texture2D(uPrev, vUv - flow).r;
      vec2 pa = q - uA, ba = uB - uA;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0., 1.);
      float d = length(pa - ba*h);
      float splat = exp(-d*d/(uRad*uRad)) * uAmt;
      float v = max(prev*uKeep - uFade, 0.) + splat;
      gl_FragColor = vec4(min(v, 1.), 0., 0., 1.);
    }
  `;

  const DRAW = NOISE + `
    varying vec2 vUv;
    uniform sampler2D uMask, uOil;
    uniform vec2 uRes, uLight;
    uniform float uAsp, uTime, uRelief, uContrast, uCast, uOilAmt, uOilTime;

    float heightAt(vec2 uv, vec2 t, vec2 n, out float body){
      vec3 m = texture2D(uMask, uv).rgb;
      vec2 q = uv*vec2(uAsp, 1.);
      body = smoothstep(.06, .6, m.r);
      float rim = clamp(m.r - m.g, 0., 1.);
      float a = dot(q, t), b = dot(q, n);
      float streak = noise(vec2(a*14., b*240.))*.6 + noise(vec2(a*31. + 5., b*520.))*.4;
      float knife = smoothstep(.47, .55, fbm(q*6. + 3.));
      float swell = fbm(q*2.6 + 7.);
      float letter = body*(.62 + .3*swell + .16*streak - .12*knife) + rim*1.0 + m.g*.3;
      float gesso = .08*fbm(vec2(q.x*2.2 + q.y*.4, q.y*55.));
      vec2 wv = q*uRes.y;
      float weave = .008*(sin(wv.x)*.5 + .5)*(sin(wv.y)*.5 + .5);
      return letter + (gesso + weave)*(1. - body*.85);
    }

    // Dusty opal palette, sampled from the reference: grey-blue, seafoam, aqua, periwinkle, mauve, blush.
    vec3 pearl(float t){
      t = fract(t)*6.;
      vec3 c0 = vec3(.706, .737, .8);
      vec3 c1 = vec3(.702, .776, .765);
      vec3 c2 = vec3(.698, .757, .784);
      vec3 c3 = vec3(.722, .698, .824);
      vec3 c4 = vec3(.851, .702, .812);
      vec3 c5 = vec3(.855, .816, .8);
      float f = smoothstep(0., 1., fract(t));
      if (t < 1.) return mix(c0, c1, f);
      if (t < 2.) return mix(c1, c2, f);
      if (t < 3.) return mix(c2, c3, f);
      if (t < 4.) return mix(c3, c4, f);
      if (t < 5.) return mix(c4, c5, f);
      return mix(c5, c0, f);
    }

    void main(){
      vec2 uv = vUv;
      vec2 px = 1./uRes;
      vec3 m = texture2D(uMask, uv).rgb;

      // Brush direction follows the letterforms: tangent to the wide blur's contours.
      float gx = texture2D(uMask, uv + vec2(px.x*4., 0.)).b - texture2D(uMask, uv - vec2(px.x*4., 0.)).b;
      float gy = texture2D(uMask, uv + vec2(0., px.y*4.)).b - texture2D(uMask, uv - vec2(0., px.y*4.)).b;
      vec2 g = vec2(gx*uAsp, gy);
      vec2 tan0 = vec2(-g.y, g.x);
      vec2 t = normalize(mix(vec2(.94, .34), normalize(tan0 + 1e-6), smoothstep(0., .01, length(g))));
      if (t.x < 0.) t = -t;
      vec2 n = vec2(-t.y, t.x);

      float body, b1;
      float h  = heightAt(uv, t, n, body);
      float hx = heightAt(uv + vec2(px.x, 0.), t, n, b1) - heightAt(uv - vec2(px.x, 0.), t, n, b1);
      float hy = heightAt(uv + vec2(0., px.y), t, n, b1) - heightAt(uv - vec2(0., px.y), t, n, b1);
      float k = uRelief * uRes.y * .5;
      vec3 N = normalize(vec3(-hx*k, -hy*k, 1.));

      vec3 L = normalize(vec3(uLight*.82, .57));
      vec3 V = vec3(0., 0., 1.);
      vec3 Hv = normalize(L + V);
      float diff = dot(N, L);

      // Raking light on white: the relief is the only thing that reads.
      vec3 gessoC = vec3(1.);
      vec3 paintC = vec3(1.);
      vec3 albedo = mix(gessoC, paintC, body);
      float shade = clamp(1. + uContrast*(diff - L.z), .45, 1.12);
      vec3 col = albedo*shade;
      col = mix(col, col*vec3(1., .965, .92), clamp((1. - shade)*1.6, 0., 1.));

      // Soft cast shadow on the canvas, thrown away from the light.
      vec2 toLight = vec2(uLight.x/uAsp, uLight.y)*.014;
      float sh = clamp(texture2D(uMask, uv + toLight).g - m.g, 0., 1.);
      col *= 1. - sh*uCast*(1. - body);

      float spec = pow(max(dot(N, Hv), 0.), 60.)*.07*body;
      col += spec;

      // Oil slick: thin-film interference over the paint relief.
      float oilRaw = texture2D(uOil, uv).r;
      float lm = smoothstep(.12, .5, m.r);
      float om = smoothstep(.015, .22, oilRaw)*lm;
      if (om > .001) {
        // Nacre: soft pastel iridescence that shifts with the paint's surface angle.
        vec2 q = uv*vec2(uAsp, 1.);
        vec2 drift = vec2(uOilTime*.02, -uOilTime*.012);
        vec2 r = mat2(.87, -.5, .5, .87)*q;
        float warp = fbm(r*vec2(1.6, 3.2) + drift);
        float warp2 = fbm(r*vec2(2.4, 5.) + warp*1.7 - drift);
        float bands = fbm(vec2(r.x*1.1 + warp2*1.4, r.y*6.5 + warp*2.3));
        float strata = noise(vec2(r.x*3. + warp*4., r.y*90. + warp2*6.));
        float t = bands*1.8 + m.g*.5 + dot(N.xy, vec2(.12, .08)) + strata*.04 + oilRaw*.25;
        vec3 pal = pearl(t);
        float lum = dot(pal, vec3(.3333));
        pal = min(mix(vec3(lum), pal, 1.8 + .8*uOilAmt)*1.07, vec3(1.));
        vec3 nacre = mix(vec3(.97), pal, clamp(.45 + .9*uOilAmt, 0., 1.))*(.95 + .07*max(diff, 0.));
        // Rippling caustic light, like sun through shallow water.
        float c1n = 1. - abs(2.*noise(r*vec2(7., 11.) + warp*3. + drift*4.) - 1.);
        float c2n = 1. - abs(2.*noise(r*vec2(13., 19.) - warp2*2.5 - drift*3.) - 1.);
        float caustic = pow(c1n, 14.)*.55 + pow(c2n, 18.)*.35;
        float glint = step(.9965, hash(floor(gl_FragCoord.xy/2.) + floor(uTime*2.)))*.35;
        float lustre = pow(max(dot(N, Hv), 0.), 40.)*.12;
        nacre = min(nacre + (caustic + glint)*(.6 + .6*uOilAmt) + lustre, vec3(1.));
        col = mix(col, nacre, om*min(1., 1.6*uOilAmt));
      }

      col = min(col, vec3(1.));
      gl_FragColor = vec4(col, 1.);
    }
  `;

  function compile(type, src){
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(fs){
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }

  let oilP, drawP;
  try { oilP = program(OIL); drawP = program(DRAW); }
  catch (e) { console.error(e); document.documentElement.classList.add('no-white-art'); return; }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function makeTex(w, h){
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  }

  let W = 0, H = 0, asp = 1, maskTex = null, oil = [], fbs = [], cur = 0, ow = 0, oh = 0;
  let textBox = null, layoutBox = null;

  // CSS-pixel layout: size the type so its ink fills the available width,
  // then give the canvas enough padding above and below for the cast shadow.
  // Measure the name's real ink by drawing it and scanning pixels. Font
  // metrics (actualBoundingBox*) vary by browser, especially with
  // letter-spacing, so this keeps the side padding exact everywhere.
  let ink = null;
  function measureInk(){
    const SIZE = 200;
    const c = document.createElement('canvas');
    const x = c.getContext('2d', { willReadFrequently: true });
    x.font = fontSpec(SIZE);
    const adv = x.measureText(NAME).width;
    c.width = Math.ceil(adv + SIZE*2); c.height = SIZE*2;
    x.font = fontSpec(SIZE);
    if ('letterSpacing' in x) x.letterSpacing = `${SIZE*tune.spacing/100}px`;
    x.textBaseline = 'alphabetic';
    x.fillText(NAME, SIZE, SIZE*1.4);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let l = c.width, r = -1, t = c.height, btm = -1;
    for (let y = 0; y < c.height; y++){
      for (let i = 0; i < c.width; i++){
        if (d[(y*c.width + i)*4 + 3] > 20){
          if (i < l) l = i; if (i > r) r = i;
          if (y < t) t = y; if (y > btm) btm = y;
        }
      }
    }
    // All values per 1px of font size, relative to the draw point.
    ink = { left: (l - SIZE)/SIZE, width: (r + 1 - l)/SIZE, ascent: (SIZE*1.4 - t)/SIZE, descent: (btm + 1 - SIZE*1.4)/SIZE };
  }

  // CSS-pixel layout: size the type so its ink spans the width minus
  // --art-inset on both sides, centred, with room above and below for the
  // cast shadow. The tallest glyph starts exactly --art-top below the nav.
  function layout(){
    if (!ink) measureInk();
    const cssW = cv.parentElement.clientWidth;
    const cs = getComputedStyle(cv);
    const inset = parseFloat(cs.getPropertyValue('--art-inset')) || 40;
    const topGap = parseFloat(cs.getPropertyValue('--art-top')) || 120;
    const maxW = parseFloat(cs.getPropertyValue('--art-width')) || Infinity;
    const inkW = Math.max(1, Math.min(maxW, cssW - inset*2));
    const fs = inkW/ink.width;
    const ascent = ink.ascent*fs, descent = ink.descent*fs;
    // Room around the ink for the cast shadow and oil. The top can't exceed
    // the gap above, or the canvas would overlap whatever sits there.
    const pad = Math.max(24, fs*.22), padTop = Math.min(topGap, pad);
    layoutBox = { cssW, fs, padTop, ascent, inkW, left: (cssW - inkW)/2 - ink.left*fs };
    cv.style.height = Math.round(padTop + pad + ascent + descent) + 'px';
    cv.style.marginTop = (topGap - padTop) + 'px';
    // Pull following content up so layout ends at the ink's bottom edge.
    cv.style.marginBottom = (-pad) + 'px';
  }

  // Paint the name into three blurred layers: R = letter body, G = paint swell, B = wide field for brush direction.
  function buildMask(){
    const s = Math.min(1, 2048/Math.max(W, H));
    const mw = Math.max(2, Math.round(W*s)), mh = Math.max(2, Math.round(H*s));
    const c = document.createElement('canvas'); c.width = mw; c.height = mh;
    const x = c.getContext('2d', { willReadFrequently: true });
    const k = mw/layoutBox.cssW;
    const fs = layoutBox.fs*k;
    const baseline = (layoutBox.padTop + layoutBox.ascent)*k;
    const left = layoutBox.left*k;
    const OFF = mw + 2000;

    function layer(blur){
      x.setTransform(1,0,0,1,0,0);
      x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetX = 0;
      x.fillStyle = '#000'; x.fillRect(0, 0, mw, mh);
      x.font = fontSpec(fs);
      if ('letterSpacing' in x) x.letterSpacing = `${fs*tune.spacing/100}px`;
      x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.fillStyle = '#fff';
      x.shadowColor = '#fff'; x.shadowBlur = blur; x.shadowOffsetX = OFF;
      x.fillText(NAME, left - OFF, baseline);
      return x.getImageData(0, 0, mw, mh).data;
    }
    const r = layer(Math.max(1, fs*0.012));
    const g = layer(fs*0.035);
    const b = layer(fs*0.12);
    const out = x.createImageData(mw, mh), o = out.data;
    for (let i = 0; i < o.length; i += 4){ o[i] = r[i]; o[i+1] = g[i]; o[i+2] = b[i]; o[i+3] = 255; }
    x.putImageData(out, 0, 0);

    const lh = fs*.98;
    const inkLeft = (layoutBox.cssW - layoutBox.inkW)/2*k;
    textBox = { x0: inkLeft/mh, x1: (inkLeft + layoutBox.inkW*k)/mh, y: 1 - (baseline - layoutBox.ascent*k*.45)/mh, lines: 1, lh: lh/mh };

    if (!maskTex) maskTex = makeTex();
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  function buildOil(){
    oil.forEach(t => gl.deleteTexture(t)); fbs.forEach(f => gl.deleteFramebuffer(f));
    ow = Math.max(2, Math.round(W/2)); oh = Math.max(2, Math.round(H/2));
    oil = [makeTex(ow, oh), makeTex(ow, oh)];
    fbs = oil.map(t => {
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return f;
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function resize(){
    layout();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = cv.clientWidth, ch = cv.clientHeight;
    if (!cw || !ch) return;
    if (cw*ch*dpr*dpr > 4.2e6) dpr = Math.sqrt(4.2e6/(cw*ch));
    W = Math.round(cw*dpr); H = Math.round(ch*dpr);
    cv.width = W; cv.height = H; asp = W/H;
    buildMask(); buildOil();
  }

  // Pointer, in canvas units where height = 1 and y points up.
  const ptr = { x: 0, y: 0, px: 0, py: 0, active: false, moved: false };
  let lastInput = 0, introUntil = 0, introStart = 0;
  function setPtr(e, fresh){
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left)/r.height, y = 1 - (e.clientY - r.top)/r.height;
    if (fresh || !ptr.active){ ptr.px = x; ptr.py = y; }
    ptr.x = x; ptr.y = y; ptr.active = true; ptr.moved = true;
    lastInput = performance.now(); introUntil = 0;
  }
  cv.addEventListener('pointermove', e => setPtr(e, false));
  cv.addEventListener('pointerdown', e => setPtr(e, true));
  cv.addEventListener('pointerleave', () => { ptr.active = false; });
  window.addEventListener('blur', () => { ptr.active = false; });

  let lastW = 0, rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (cv.parentElement.clientWidth !== lastW){ lastW = cv.parentElement.clientWidth; resize(); } }, 150);
  });

  function introPoint(now){
    const s = Math.min(1, (now - introStart)/2600);
    const e = s < .5 ? 2*s*s : 1 - Math.pow(-2*s + 2, 2)/2;
    const b = textBox;
    return { x: b.x0 + (b.x1 - b.x0)*e, y: b.y + Math.sin(e*Math.PI*5)*b.lh*.12, done: s >= 1 };
  }

  const light = { x: Math.cos(tune.angle*Math.PI/180), y: Math.sin(tune.angle*Math.PI/180) };
  let oilClock = 0, lastNow = 0, fadeBank = 0, running = false, visible = true;
  function frame(now){
    if (!visible){ running = false; lastNow = 0; return; }
    const t = now/1000;
    const dt = lastNow ? Math.min((now - lastNow)/1000, .1) : 0; lastNow = now;
    const flowK = tune.flow/50*(reduceMotion ? .33 : 1);
    oilClock += dt*flowK;
    // Oil fades linearly over 0.6s–15s. Tiny fades are banked until they clear one 8-bit step.
    const life = .6*Math.pow(25, tune.linger/100);
    fadeBank += (.7/life)*dt;
    let fade = 0;
    if (fadeBank >= .0047){ fade = fadeBank; fadeBank = 0; }
    let A = [ptr.px, ptr.py], B = [ptr.x, ptr.y], amt = 0;

    if (introUntil && now < introUntil && textBox){
      const p = introPoint(now);
      if (!ptr.introPrev) ptr.introPrev = [p.x, p.y];
      A = ptr.introPrev; B = [p.x, p.y]; amt = .5;
      ptr.introPrev = B;
      if (p.done) introUntil = 0;
    } else if (ptr.active){
      amt = ptr.moved ? .7 : .08;
      ptr.px = ptr.x; ptr.py = ptr.y; ptr.moved = false;
    }

    const sway = tune.move/100*1.6;
    const ang = tune.angle*Math.PI/180;
    const tx = ptr.active ? (ptr.x/asp - .5)*sway : 0, ty = ptr.active ? (ptr.y - .5)*sway : 0;
    light.x += ((Math.cos(ang) + tx) - light.x)*.04;
    light.y += ((Math.sin(ang) + ty) - light.y)*.04;
    const ll = Math.hypot(light.x, light.y);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbs[1 - cur]);
    gl.viewport(0, 0, ow, oh);
    gl.useProgram(oilP.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, oil[cur]);
    gl.uniform1i(oilP.u.uPrev, 0);
    gl.uniform2f(oilP.u.uA, A[0], A[1]);
    gl.uniform2f(oilP.u.uB, B[0], B[1]);
    gl.uniform1f(oilP.u.uAsp, asp);
    gl.uniform1f(oilP.u.uRad, (textBox ? textBox.lh*.2 : .04)*(.35 + 1.3*tune.spread/100));
    gl.uniform1f(oilP.u.uAmt, amt);
    gl.uniform1f(oilP.u.uTime, oilClock);
    gl.uniform1f(oilP.u.uKeep, 1);
    gl.uniform1f(oilP.u.uFade, fade);
    gl.uniform1f(oilP.u.uFlow, .0018*flowK);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    cur = 1 - cur;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(drawP.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.uniform1i(drawP.u.uMask, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, oil[cur]);
    gl.uniform1i(drawP.u.uOil, 1);
    gl.uniform2f(drawP.u.uRes, W, H);
    gl.uniform2f(drawP.u.uLight, light.x/ll, light.y/ll);
    gl.uniform1f(drawP.u.uAsp, asp);
    gl.uniform1f(drawP.u.uTime, reduceMotion ? 0 : t);
    gl.uniform1f(drawP.u.uRelief, .0002 + tune.depth/100*.02);
    gl.uniform1f(drawP.u.uContrast, tune.strength/100*1.1);
    gl.uniform1f(drawP.u.uCast, tune.cast/100*.4);
    gl.uniform1f(drawP.u.uOilAmt, tune.oil/100);
    gl.uniform1f(drawP.u.uOilTime, oilClock);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(frame);
  }
  function start(){ if (!running && visible){ running = true; requestAnimationFrame(frame); } }

  // Stop drawing while the section is scrolled out of view.
  if ('IntersectionObserver' in window){
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; start(); }).observe(cv);
  }

  const fontReady = document.fonts ? Promise.race([
    document.fonts.load(fontSpec(100)),
    new Promise(r => setTimeout(r, 2500))
  ]) : Promise.resolve();

  fontReady.then(() => {
    lastW = cv.parentElement.clientWidth;
    resize();
    start();
    requestAnimationFrame(() => cv.classList.add('ready'));
    if (!reduceMotion){
      setTimeout(() => {
        if (lastInput === 0 && textBox){
          introStart = performance.now(); introUntil = introStart + 2700; ptr.introPrev = null;
        }
      }, 1600);
    }
  });
})();
