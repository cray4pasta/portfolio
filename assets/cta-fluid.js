// CTA FLUID RIPPLE (WebGL, continuous while hovered)
// Shared across every page with the "Let's grab boba" .home-cta button.
(function() {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var button = document.querySelector('.home-cta');
  var canvas = button && button.querySelector('#cta-fluid-canvas');
  if (!button || !canvas || reduceMotion) return;

  var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  var vsSource = [
    'attribute vec2 a_position;',
    'varying vec2 v_uv;',
    'void main() {',
    '  v_uv = a_position * 0.5 + 0.5;',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
  ].join('\n');

  var fsSource = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_texture;',
    'uniform vec2 u_resolution;',
    'uniform float u_bleed;',
    'uniform float u_radius;',
    'uniform float u_time;',
    'uniform int u_pointCount;',
    'uniform vec3 u_points[8];',
    'uniform float u_strength;',
    'uniform float u_speed;',
    '',
    'float roundedBoxSDF(vec2 p, vec2 halfSize, float radius) {',
    '  vec2 q = abs(p) - halfSize + radius;',
    '  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;',
    '}',
    '',
    'void main() {',
    '  vec2 fragPx = vec2(v_uv.x * u_resolution.x, (1.0 - v_uv.y) * u_resolution.y);',
    '  vec2 disp = vec2(0.0);',
    '  for (int i = 0; i < 8; i++) {',
    '    if (i >= u_pointCount) break;',
    '    vec2 p = u_points[i].xy;',
    '    float age = u_points[i].z;',
    '    float d = distance(fragPx, p);',
    '    float falloff = exp(-d * 0.01) * exp(-age * 1.5);',
    '    float wave = sin(d * 0.1 - u_time * u_speed * 6.0);',
    '    vec2 dir = normalize(fragPx - p + 0.0001);',
    '    disp += dir * wave * falloff * u_strength;',
    '  }',
    '',
    '  vec2 center = u_resolution * 0.5;',
    '  vec2 halfSize = u_resolution * 0.5 - vec2(u_bleed);',
    '  vec2 edgeP = (fragPx - center) - disp * 3.0;',
    '  float dist = roundedBoxSDF(edgeP, halfSize, u_radius);',
    '  float alpha = 1.0 - smoothstep(0.0, 3.0, dist);',
    '',
    '  vec2 uv = clamp(v_uv + disp * 0.02, 0.0, 1.0);',
    '  vec4 texColor = texture2D(u_texture, uv);',
    '  gl_FragColor = vec4(texColor.rgb, alpha * texColor.a);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('CTA fluid shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, vsSource);
  var fs = compile(gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('CTA fluid program link error:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  var posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var posLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Synthetic soft gradient "surface" — smooth, no visible ring/band
  // structure, but strong enough tonal contrast that displacement reads.
  var gradCanvas = document.createElement('canvas');
  gradCanvas.width = 160;
  gradCanvas.height = 160;
  var gctx = gradCanvas.getContext('2d');
  var grad = gctx.createRadialGradient(60, 55, 4, 90, 100, 130);
  grad.addColorStop(0, '#57575a');
  grad.addColorStop(0.5, '#333335');
  grad.addColorStop(1, '#1c1c1d');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 160, 160);

  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gradCanvas);

  var u_resolution = gl.getUniformLocation(program, 'u_resolution');
  var u_bleed = gl.getUniformLocation(program, 'u_bleed');
  var u_radius = gl.getUniformLocation(program, 'u_radius');
  var u_time = gl.getUniformLocation(program, 'u_time');
  var u_pointCount = gl.getUniformLocation(program, 'u_pointCount');
  var u_points = gl.getUniformLocation(program, 'u_points');
  var u_strength = gl.getUniformLocation(program, 'u_strength');
  var u_speed = gl.getUniformLocation(program, 'u_speed');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  var BLEED_CSS = 10;
  var RADIUS_CSS = 12;
  var dprCurrent = 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprCurrent = dpr;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);

  var trail = [];
  var maxTrail = 4;
  var strength = 4.5;
  var speed = 0.6;
  var hovering = false;
  var rafId = null;
  var startTime = performance.now();

  function addPoint(x, y) {
    trail.push({ x: x, y: y, t: performance.now() });
    if (trail.length > maxTrail) trail.shift();
  }

  function onPointerMove(e) {
    var rect = canvas.getBoundingClientRect();
    var dpr = canvas.width / rect.width;
    addPoint((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr);
  }

  function onEnter(e) {
    hovering = true;
    canvas.classList.add('fluid-active');
    button.classList.add('fluid-bg-hidden');
    onPointerMove(e);
    startLoop();
  }

  function onLeave() {
    hovering = false;
  }

  button.addEventListener('pointerenter', onEnter);
  button.addEventListener('pointermove', onPointerMove);
  button.addEventListener('pointerleave', onLeave);

  function render() {
    var now = performance.now();
    var t = (now - startTime) / 1000;
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform1f(u_bleed, BLEED_CSS * dprCurrent);
    gl.uniform1f(u_radius, RADIUS_CSS * dprCurrent);
    gl.uniform1f(u_time, t);
    gl.uniform1f(u_strength, strength);
    gl.uniform1f(u_speed, speed);

    var pts = [];
    var alive = 0;

    // Two auto-orbiting sources keep the surface rippling even if the
    // cursor holds still — this is what makes it "constantly" rippling.
    if (hovering) {
      var cw = canvas.width, ch = canvas.height;
      pts.push(cw * 0.5 + Math.cos(t * 0.9) * cw * 0.32, ch * 0.5 + Math.sin(t * 0.9) * ch * 0.55, 0);
      pts.push(cw * 0.5 + Math.cos(t * 0.7 + Math.PI) * cw * 0.28, ch * 0.5 + Math.sin(t * 0.7 + Math.PI) * ch * 0.5, 0);
      alive += 2;
    }

    for (var i = 0; i < trail.length && alive < 8; i++) {
      var age = (now - trail[i].t) / 1000;
      if (age > 0.9) continue;
      pts.push(trail[i].x, trail[i].y, age);
      alive++;
    }
    while (pts.length < 8 * 3) pts.push(0, 0, 999);
    gl.uniform1i(u_pointCount, alive);
    gl.uniform3fv(u_points, new Float32Array(pts));

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (hovering || alive > 0) {
      rafId = requestAnimationFrame(render);
    } else {
      canvas.classList.remove('fluid-active');
      button.classList.remove('fluid-bg-hidden');
      rafId = null;
    }
  }

  function startLoop() {
    if (rafId == null) rafId = requestAnimationFrame(render);
  }
})();
