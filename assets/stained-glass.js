/* ─── STAINED GLASS WINDOW ─── Draws the homepage window with a WebGL2
   fragment shader: a round-arched greenhouse window of square glass blocks
   (a pressed rim around a warped, wavy centre) in dark mortar, set in a
   slim, flat dark-metal frame and lit from behind by a slowly drifting sun. Everything is
   drawn on the GPU each frame, so nothing heavy runs on the main thread.
   Static under reduced motion; hidden if the browser has no WebGL2.

   Tweak the window with CONFIG below. To tune it live, open the homepage
   with ?tune on the end of the URL (e.g. localhost:3002/?tune): a panel of
   sliders appears, and "Copy settings" copies a CONFIG to paste back here.
   Click a tile in the window while tuning to change its colour or opacity. */
(function () {
  const CONFIG = {
    width: 540,        // window width, px (the text column is 540, so this is the most it can be)
    height: 235,       // window height, px
    tileSize: 53,      // px, roughly; blocks stay square-ish and fill the window evenly
    columns: 1,        // vertical sections below the arch (bars between them)
    sections: 1,       // horizontal sections below the arch (bars between them)
    shape: 'rectangle',  // 'arch' (round top) or 'rectangle' (no arch)
    archHeight: 40,    // px from the top of the glass to where the arch starts
    spokes: 1,         // bars fanning out in the arch (0 for none)
    hub: 0,            // size of the half-circle in the arch, as a share of the arch (0 for none)
    barWidth: 6,       // thickness of the bars across the window, px
    spokeWidth: 6,     // thickness of the spokes in the arch, px
    frame: 5,          // thickness of the frame around the window, px
    frameMaterial: 'wood',  // 'wood' or 'glass' for the frame and bars
    frameColor: '#583400',  // their colour: the wood's, or the glass's tint (white is clear glass)
    jointColor: '#d6ece4',  // tint of the glass joints between tiles, seen edge-on (white is clear)
    edgeWave: 30,      // how far the window's outer edge wanders in and out, px (0 for a clean edge)
    edgeBlur: 40,      // how softly the outer edge fades into the page, px (0 for a crisp edge)
    cornerRadius: 4,   // roundness of each glass block's corners, px
    gap: 1.8,          // mortar showing between blocks, px
    texture: 1.5,      // how much the centre of each block ripples (0 flat – 1.5 very wavy)
    glow: 1.5,         // brightness of the sun and daylight behind the glass (0–1.5)
    palette: 'jewel',  // 'pastel' (soft, dusty) or 'jewel' (bright)
    // The glass as a physical material (the same ideas as Three.js's MeshPhysicalMaterial)
    ior: 1.38,         // index of refraction: how strongly the glass bends what's behind it (glass ~1.5, water 1.33)
    thickness: 3,      // how thick the blocks are: deeper relief, more bending
    roughness: 0.29,   // frosting: 0 clear glass – 1 fully frosted
    dispersion: 1.15,  // colours split slightly where the glass bends (0 none)
    tint: 1,           // how deep a tile's colour gets where light crosses thick glass (0 clear)
    caustics: 1.15,    // bright light focused by the curved glass (0 none)
    lenses: 1,         // round lens domes pressed into each block's centre (0 none – 2 very domed)
    outside: 1,        // soft clouds in the blue sky behind the window (0 clear sky)
    opacity: 1,        // how solid the glass is overall (0 clear – 1 solid)
    tiles: {           // per-tile changes, keyed 'column,row' from the top-left (0,0):
                       // { color: '#hex', opacity: 0–1 }. Set by clicking tiles in ?tune
      '1,0': { color: '#e32400' },
      '2,0': { color: '#e63b7a' },
      '3,0': { color: '#ebebeb' },
      '4,0': { color: '#0056d6' },
      '5,0': { color: '#0056d6' },
      '6,0': { color: '#ffffff' },
      '0,1': { color: '#00a3d7' },
      '2,1': { color: '#d6d6d6' },
      '3,1': { color: '#e63b7a' },
      '4,1': { color: '#d6d6d6' },
      '6,1': { color: '#b51a00' },
      '7,1': { color: '#e4ef65' },
      '8,1': { color: '#ff4013' },
      '1,2': { color: '#d6d6d6' },
      '2,2': { color: '#e32400' },
      '4,2': { color: '#fffbb9' },
      '6,2': { color: '#d6d6d6' },
      '7,2': { color: '#b51a00' },
      '8,2': { color: '#ebebeb' },
      '9,2': { color: '#ebebeb' },
      '0,3': { color: '#ffffff' },
      '1,3': { color: '#e63b7a' },
      '2,3': { color: '#c0c0c0' },
      '5,3': { color: '#ffffff' },
      '6,3': { color: '#fffbb9' },
      '8,3': { color: '#e63b7a' },
      '0,4': { color: '#ebebeb' },
      '1,4': { color: '#fec700' },
      '2,4': { color: '#ffffff' },
      '3,4': { color: '#ff4013' },
      '4,4': { color: '#ebebeb' },
      '5,4': { color: '#ebebeb' },
      '6,4': { color: '#fffbb9' },
      '7,4': { color: '#ebebeb' },
      '8,4': { color: '#ffffff' },
      '9,4': { color: '#f4a4c0' },
      '0,5': { color: '#ebebeb' },
      '1,5': { color: '#e63b7a' },
      '2,5': { color: '#f9d3e0' },
      '3,5': { color: '#ebebeb' },
      '5,5': { color: '#ffffff' },
      '6,5': { color: '#f9d3e0' },
      '7,5': { color: '#ebebeb' },
      '8,5': { color: '#f4a4c0' },
      '9,5': { color: '#e32400' },
      '0,6': { color: '#e63b7a' },
      '1,6': { color: '#f9d3e0' },
      '2,6': { color: '#ffffff' },
      '3,6': { color: '#e63b7a' },
      '4,6': { color: '#ebebeb' },
      '6,6': { color: '#ebebeb' },
      '7,6': { color: '#0056d6' },
      '8,6': { color: '#ebebeb' },
      '9,6': { color: '#e32400' },
    },
    sunX: 0.55,        // where the sun sits behind the window: 0 left edge – 1 right edge
    sunY: 0.13,        //   and 0 top – 1 bottom
    glare: 3,          // the sun's glare glinting through the bumpy glass (0 for none)
    glareSize: 0.115,  // how tight that glare is: small is a sharp glint, large a soft bloom
    sheen: 1.4,        // reflections on the glass surface, strongest where it tilts away (0 for none)
    rays: 0.95,        // beams of light coming out of each tile toward you (0 for none)
    rayLength: 235,    // how far the beams reach past the window's edges, px
    softness: 0,       // how much the beams soften and spread as they travel (0 stay crisp)
    dust: 0,           // dust motes drifting and twinkling in the beams (0 none)
    bloom: 3,          // soft glow around the brightest glass and glints (0 none)
    raySpeed: 2,       // how fast the light shifts: the sun's slow drift and the beams' shimmer
    rayShimmer: 1.2,   // how much each beam slowly brightens and dims in place (0 steady)
    seed: 20261013,    // change for a different colour arrangement
  };

  const canvas = document.querySelector('canvas.home-glass');
  if (!canvas) return;
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
  if (!gl) { canvas.style.display = 'none'; return; }

  let W, H;                                    // window size (CSS px), from CONFIG
  let L, R, T, B;                              // glass area, inset by the frame
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Glass colours, picked at random per block like a real window. Each
  // palette has 14 so a tile keeps its place in the pattern across palettes.
  const PALETTES = {
    // soft, dusty cathedral glass in warm light
    pastel: [
      '#e9a77c', '#f0b98a', '#d98b6a', '#e7a3a8', '#c98e9d', '#b9a3c9', '#a99abb',
      '#8fa07a', '#6f8a63', '#a8c0c9', '#8faab5', '#e8c27e', '#f2dcc0', '#d7b49a',
    ],
    // bright jewel tones
    jewel: [
      '#e3201b', '#a3100f', '#f2650f', '#f59e0b', '#f7c21a', '#29b2dc', '#5ccbea',
      '#1c3d9a', '#1f9e3a', '#82c341', '#e98aa8', '#d9cbbd', '#d9452a', '#ff8a3d',
    ],
  };
  let PALETTE = PALETTES.pastel;
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

  const VS = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

  const FS = `#version 300 es
precision highp float;
uniform vec2 uSize;        // CSS px
uniform float uDpr;
uniform vec4 uBox;         // glass area: left, top, right, bottom
uniform vec2 uTile;        // block cell size
uniform float uS, uRx, uRy, uCx, uFrame;
uniform float uMull[4]; uniform int uMullN;
uniform float uTran[4]; uniform int uTranN;
uniform int uSpokes;
uniform vec3 uMetal;              // colour of the frame and bars (wood) or their tint (glass)
uniform bool uWoodFrame;          // frame and bars are wood, not glass
uniform bool uArch;               // round top; otherwise a plain rectangle
uniform vec3 uJoint;              // tint of the glass joints between blocks
uniform float uSpoke, uWave, uBlur;
uniform float uHub, uWood, uGap, uRad, uTex, uGlow, uSeed, uPulse;
uniform vec2 uSun;
uniform highp sampler2D uTiles;   // per tile: rgb colour, a opacity
uniform vec2 uGrid;               // columns, rows of tiles
uniform float uOpacity;           // overall glass opacity
uniform int uPass;                // 0 draw the window, 1 each tile's default palette index, 2 bake glass heights
uniform highp sampler2D uHeight;  // baked glass heights (pass 2's output)
uniform highp sampler2D uSelTex;  // per tile: r > 0 when selected in ?tune
uniform bool uHasSel;
// The glass as a physical material, like Three.js's MeshPhysicalMaterial
uniform float uCam;               // camera's distance from the window, px
uniform float uIor;               // index of refraction (glass ~1.5)
uniform float uThick;             // how thick the blocks are: relief and how far they bend the view
uniform float uRough;             // frosting: blurs what's seen through the glass
uniform float uDisp;              // dispersion: colours split slightly at the bends
uniform float uTint;              // attenuation: how deep a tile's colour gets through thick glass
uniform float uCaustic;           // light focused by curved glass
uniform float uLens;              // how domed the lenses in each block are
uniform float uGlareSize;         // how tight the sun's glare is (GGX roughness)
uniform float uOutside;           // how many clouds drift across the sky outside
uniform float uSheen, uGlare;     // reflection of the room, glare of the sun
out vec4 o;

const float PI = 3.14159265;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  return noise(p) * 0.6 + noise(p * 2.1 + vec2(5.2, 1.3)) * 0.3 + noise(p * 4.3 + vec2(9.1, 7.7)) * 0.1;
}
// approximate signed distance to an ellipse (negative inside)
float sdEll(vec2 p, vec2 r) {
  float k0 = length(p / r), k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-4);
}
float gauss(float x, float c, float w) { float t = (x - c) / w; return exp(-t * t); }

// Which block g (relative to the glass area) falls in, where in it, and the
// signed distance to that block's rounded edge (negative inside)
void tileAt(vec2 g, out vec2 cell, out vec2 lp, out vec2 wh, out float d) {
  cell = floor(g / uTile);
  wh = uTile - 2.0 * uGap;
  lp = g - cell * uTile - uGap;
  float rad = min(uRad, min(wh.x, wh.y) * 0.5);
  vec2 q = abs(lp - wh * 0.5) - (wh * 0.5 - rad);
  d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
}

// The shape of a pressed glass block's face, 0 at its outer edge: a rounded
// lip up to a flat rim with a fine ridge, then a step down into a recessed
// centre whose surface ripples
float blockHeight(vec2 g, out float cover) {
  vec2 cell, lp, wh;
  float d;
  tileAt(g, cell, lp, wh, d);
  cover = clamp(0.5 - d * uDpr, 0.0, 1.0);
  float sz = min(wh.x, wh.y);
  float rim = sz * 0.14, step = rim * 0.8;
  vec2 off = vec2(hash(cell + 7.7), hash(cell + 3.3)) * 50.0;
  float amt = uTex * mix(0.75, 1.25, hash(cell + 1.9));
  vec2 uv = lp / sz;
  float edge = -d + (noise(uv * 9.0 + off) - 0.5) * rim * 0.3 * (0.4 + amt);   // pressed glass wobbles
  float lip = 1.0 - pow(1.0 - clamp(edge / (rim * 0.45), 0.0, 1.0), 2.0);
  lip += 0.05 * gauss(edge, rim * 0.62, rim * 0.1);
  vec2 q = uv * 1.8 + off;
  float wx = fbm(q), wy = fbm(q + vec2(7.3, 2.9));
  float n = fbm(q + 2.4 * amt * vec2(wx, wy));
  // Lenses: one to three round domes pressed into the centre, like bullseye
  // glass. Their curve magnifies and flips the view behind them and focuses
  // the light; the waves run over them.
  float dome = 0.0;
  int count = 1 + int(hash(cell + 9.1) * 2.999);
  for (int k = 0; k < 3; k++) {
    if (k >= count) break;
    float fk = float(k);
    vec2 at = (0.28 + 0.44 * vec2(hash(cell + fk * 3.7 + 0.11), hash(cell + fk * 5.3 + 0.37))) * wh / sz;
    float r0 = mix(0.13, 0.27, hash(cell + fk * 7.1 + 0.53));
    float rr = length(uv - at) / r0;
    float cap = max(1.0 - rr * rr, 0.0);
    dome = max(dome, cap * cap * r0 / 0.27);   // swells smoothly out of the surface; smaller ones sit lower
  }
  float centre = 0.5 + (n - 0.5) * 0.6 * amt + dome * 0.85 * uLens;
  return mix(lip, centre, smoothstep(rim, rim + step, edge));
}

// What's outside the window: a clear blue sky warming to gold toward the
// horizon and around the sun, with soft sunlit clouds drifting across it
// (they give the waves in the glass something to bend). blur softens it all
// (frosted glass).
vec3 outside(vec2 q, float blur) {
  float y = clamp(q.y / uSize.y, 0.0, 1.0);
  float sd = distance(q, uSun);
  vec3 sky = mix(vec3(0.22, 0.50, 0.92), vec3(0.45, 0.70, 0.97), smoothstep(0.0, 0.55, y));   // deep to bright blue
  sky = mix(sky, vec3(1.0, 0.78, 0.45), smoothstep(0.5, 1.0, y) * 0.8);                     // warm gold low down
  sky = mix(sky, vec3(1.0, 0.78, 0.50), min(exp(-sd / 200.0) * 0.4 * uGlow, 0.7));         // warmth around the sun
  // clouds: soft white, lit gold on the side facing the sun
  float soft = 0.08 + blur * 0.01;
  float c = fbm(q * vec2(0.006, 0.012) + vec2(3.1, 7.7)) * 0.7 + noise(q * 0.03 + 11.0) * 0.3 * (1.0 - min(blur * 0.05, 1.0));
  float cloud = smoothstep(0.6 - soft, 0.6 + soft, c) * uOutside;
  vec3 cloudC = mix(vec3(1.0, 0.97, 0.93), vec3(1.0, 0.84, 0.6), exp(-sd / 220.0));
  sky = mix(sky, cloudC, cloud * 0.85);
  // the sun: a bright core with a wide warm halo
  sky += vec3(1.0, 0.90, 0.72) * (exp(-sd / (35.0 + blur)) * 1.4 + exp(-sd / 110.0) * 0.25) * uGlow * (0.95 + 0.05 * uPulse);
  sky += vec3(1.0, 0.98, 0.94) * smoothstep(12.0 + blur, 5.0, sd) * 2.0 * uGlow;      // the sun's disc itself
  return sky;
}

// Baked height at a device pixel (16 bits across two channels)
float heightAt(ivec2 c) {
  vec4 t = texelFetch(uHeight, clamp(c, ivec2(0), ivec2(uSize * uDpr) - 1), 0);
  return (t.r + t.g / 255.0) * 1.5;
}

// Light a point of glass as a physical material: look through it at the sky
// (bent by its surface: Snell's law with this IOR, a little differently per
// colour, frosted by roughness), tint by how much glass the light crosses
// (Beer–Lambert), add focused light and the sun's glare, and mirror the room
// where the surface turns away (Fresnel). N: surface normal; h: how thick the
// glass is here (0–1.5); curv: < 0 where the surface is a converging lens.
vec3 shadeGlass(vec2 p, vec3 N, float h, float curv, vec3 tint) {
  vec3 P = vec3(p, 0.0);
  vec3 V = normalize(vec3(uSize * 0.5, uCam) - P);  // toward the viewer
  float depth = uThick * 40.0;                      // how far behind the glass the view is bent, px
  float blur = uRough * 30.0;
  vec3 seen, Tg;
  for (int c = 0; c < 3; c++) {
    vec3 Tr = refract(-V, N, 1.0 / (uIor + (float(c) - 1.0) * uDisp * 0.04));
    if (c == 1) Tg = Tr;
    vec2 off = (Tr.xy / max(-Tr.z, 0.25) + V.xy / V.z) * depth;    // only the bend, not the straight view
    seen[c] = outside(p + off, blur)[c];
  }
  float path = (h * 0.8 + 0.4) / max(dot(N, V), 0.35);
  vec3 trans = pow(max(tint, vec3(0.002)), vec3(path * uTint));
  vec3 glass = seen * trans;
  // caustics: crests act as little lenses and focus the sunlight
  glass += vec3(1.0, 0.95, 0.85) * trans * clamp(-curv * 0.6, 0.0, 1.0) * uCaustic * uGlow * 0.5;
  // glare (GGX): the sun seen straight through the bending glass
  vec3 Ls = normalize(vec3(uSun, -700.0) - P);
  float al = uGlareSize + uRough * 0.06, a2 = al * al;   // its own tightness; frost only widens it a little
  float ct = max(dot(Tg, Ls), 0.0);
  float ggx = a2 * a2 / pow(ct * ct * (a2 - 1.0) + 1.0, 2.0);   // GGX lobe, scaled to 1 at its peak
  glass += vec3(1.0, 0.97, 0.9) * mix(trans, vec3(1), 0.5) * ggx * uGlare;   // hot enough to burn through the tint
  // Fresnel: facing you the glass is clear; turned away it mirrors the room
  float F0 = pow((uIor - 1.0) / (uIor + 1.0), 2.0);
  float fres = F0 + (1.0 - F0) * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  vec3 room = mix(vec3(1.0, 0.95, 0.86), vec3(0.85, 0.72, 0.58), smoothstep(-0.3, 0.4, R.y));   // a warm room
  glass = mix(glass, room, clamp(fres * uSheen, 0.0, 1.0));
  // bright light rolls off softly instead of clipping
  return mix(glass, 0.8 + 0.2 * (1.0 - exp(-(glass - 0.8) * 5.0)), step(0.8, glass));
}

// A round glass rod (the frame and bars): r is how far this point is from the
// rod's centre line, hw its half-width, dir the way out from the centre line.
// Light bends strongly through its curve, and its edges go dark where the
// light reflects inside the glass instead of coming through.
vec3 shadeRod(vec2 p, vec2 dir, float r, float hw, vec3 tint) {
  float s = clamp(r / max(hw, 1e-3), 0.0, 0.98);
  vec3 N = normalize(vec3(dir * s, sqrt(1.0 - s * s)));
  vec3 c = shadeGlass(p, N, 1.2 * sqrt(1.0 - s * s), -0.5, tint);
  return c * mix(1.0, 0.45, smoothstep(0.55, 1.0, s));
}

// A round wooden rod (the frame and bars, when they're wood): grain runs
// along it as long streaks with fine darker growth lines, it's lit softly
// from the room in front, varnish gives it a faint sheen, and the sun behind
// the window catches its edges. Arguments as for shadeRod.
vec3 shadeWood(vec2 p, vec2 dir, float r, float hw, vec3 base) {
  float s = clamp(r / max(hw, 1e-3), 0.0, 0.98);
  vec3 N = normalize(vec3(dir * s, sqrt(1.0 - s * s)));
  vec2 t = vec2(-dir.y, dir.x);                      // along the rod
  float along = dot(p, t), across = dot(p, dir);
  float wobble = fbm(vec2(along * 0.01, across * 0.05)) * 2.0;
  float g = fbm(vec2(along * 0.015, across * 0.45 + wobble));
  float rings = smoothstep(0.55, 0.8, fract(g * 7.0));
  vec3 c = base * (0.82 + 0.4 * g) * mix(1.0, 0.72, rings);
  vec3 L = normalize(vec3(-0.35, -0.6, 0.72));       // soft light from the room, above and to the left
  c *= 0.55 + 0.5 * max(dot(N, L), 0.0);
  vec3 V = normalize(vec3(uSize * 0.5, uCam) - vec3(p, 0.0));
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  c = mix(c, vec3(1.0, 0.92, 0.8), fres * 0.3);                       // varnish
  c += vec3(1.0, 0.9, 0.75) * pow(max(dot(reflect(-L, N), V), 0.0), 24.0) * 0.18;
  c += vec3(1.0, 0.8, 0.5) * pow(s, 4.0) * 0.12 * uGlow;               // sun catching the edges
  return c;
}

void main() {
  if (uPass == 1) {
    // One pixel per tile: which palette colour the window gives it by default
    vec2 cell = vec2(floor(gl_FragCoord.x), uGrid.y - 1.0 - floor(gl_FragCoord.y));
    o = vec4(floor(hash(cell + 0.5) * 13.999) / 255.0, 0, 0, 1);
    return;
  }
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  if (uPass == 2) {
    // Bake the glass's height once per change, like a game's normal map
    float cover;
    float v = clamp(blockHeight(p - uBox.xy, cover) / 1.5, 0.0, 1.0);
    float hi = floor(v * 255.0) / 255.0;
    o = vec4(hi, (v - hi) * 255.0, cover, 1);
    return;
  }
  vec2 ctr = vec2(uCx, uS);

  // Window outline: rectangle below the springline, half-ellipse above
  float dRect = max(max(uBox.x - p.x, p.x - uBox.z), max(uS - p.y, p.y - uBox.w));
  float dArch = uArch
    ? max(min(dRect, sdEll(p - ctr, vec2(uRx, uRy))), p.y - uBox.w)
    : max(max(uBox.x - p.x, p.x - uBox.z), max(uBox.y - p.y, p.y - uBox.w));
  // Outer edge: wanders in and out (slow waves plus a little fine raggedness),
  // only ever inward so it never hits the canvas edge, then fades into the page
  float wave = (fbm(p * 0.03 + 3.0) * 0.8 + noise(p * 0.16 + 9.0) * 0.2) * uWave;
  float dEdge = dArch + wave;                       // the frame follows the wavy edge too
  float dOut = dEdge - uFrame;                      // outer edge sits uFrame outside the glass
  float alpha = uBlur > 0.0 ? smoothstep(0.0, uBlur, -dOut) : clamp(0.5 - dOut * uDpr, 0.0, 1.0);
  if (alpha <= 0.0) { o = vec4(0); return; }

  // ── Glass, lit as a physical material ──
  vec2 cell, lp, wh;
  float d;
  tileAt(p - uBox.xy, cell, lp, wh, d);
  vec4 tile = texelFetch(uTiles, ivec2(clamp(cell, vec2(0), uGrid - 1.0)), 0);
  float op = tile.a * uOpacity;

  // Surface normal and curvature from the baked heights around this pixel
  ivec2 pc = ivec2(gl_FragCoord.xy);
  vec4 t0 = texelFetch(uHeight, pc, 0);
  float h = (t0.r + t0.g / 255.0) * 1.5, cover = t0.b;
  float hl = heightAt(pc - ivec2(1, 0)), hr = heightAt(pc + ivec2(1, 0));
  float hd = heightAt(pc - ivec2(0, 1)), hu = heightAt(pc + ivec2(0, 1));
  float relief = uThick * 8.0;                      // px the face rises per unit of height
  vec2 slope = vec2(hr - hl, hd - hu) * 0.5 * uDpr * relief;   // per CSS px, y down
  vec3 N = normalize(vec3(-slope, 1.0));
  float curv = (hl + hr + hd + hu - 4.0 * h) * uDpr * uDpr * relief;   // < 0 on crests

  // The blocks, and the glass joints between them. A joint is glass seen
  // edge-on, so its light crosses a long way through it and takes on more
  // of its colour, and it stays solid where a tile is see-through.
  vec3 tint = mix(uJoint, tile.rgb, cover);
  vec3 col = shadeGlass(p, N, mix(1.4, h, cover), curv, tint);
  float a = mix(1.0, op, cover);

  // Bars: the nearest mullion, transom, spoke or hub ring, and its half-width
  float bar = 1e5, bhw = uWood * 0.5;
  float hw = uWood * 0.5;
  if (p.y >= uS) {
    for (int i = 0; i < 4; i++) {
      if (i >= uMullN) break;
      float dd = abs(p.x - uMull[i]) - hw;
      if (dd < bar) { bar = dd; bhw = hw; }
    }
  }
  for (int i = 0; i < 4; i++) {
    if (i >= uTranN) break;
    float dd = abs(p.y - uTran[i]) - hw;
    if (dd < bar) { bar = dd; bhw = hw; }
  }
  if (uArch && p.y <= uS) {
    if (uHub > 0.0) {
      float dd = abs(sdEll(p - ctr, vec2(uRx, uRy) * uHub)) - uWood * 0.39;
      if (dd < bar) { bar = dd; bhw = uWood * 0.39; }
    }
    for (int k = 0; k < 16; k++) {
      if (k >= uSpokes) break;
      float an = PI + PI * float(k + 1) / float(uSpokes + 1);
      vec2 dir = vec2(cos(an), sin(an));
      vec2 a0 = ctr + dir * vec2(uRx, uRy) * uHub, a1 = ctr + dir * vec2(uRx, uRy);
      vec2 ba = a1 - a0, pa = p - a0;
      float hh = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      float dd = length(pa - ba * hh) - uSpoke * 0.5;
      if (dd < bar) { bar = dd; bhw = uSpoke * 0.5; }
    }
  }
  // Which way is "out from the centre line", from how the distances change
  // across neighbouring pixels (y flipped to match p)
  vec2 barDir = vec2(dFdx(bar), -dFdy(bar));
  vec2 edgeDir = vec2(dFdx(dEdge), -dFdy(dEdge));
  barDir /= max(length(barDir), 1e-5);
  edgeDir /= max(length(edgeDir), 1e-5);

  // Bars (wood or glass rods), with only a faint shadow on the glass beside them
  col *= 1.0 - 0.08 * smoothstep(3.0, 0.0, bar);
  float bc = clamp(0.5 - bar * uDpr, 0.0, 1.0);
  if (bc > 0.0) {
    col = mix(col, uWoodFrame ? shadeWood(p, barDir, bar + bhw, bhw, uMetal) : shadeRod(p, barDir, bar + bhw, bhw, uMetal), bc);
    a = mix(a, 1.0, bc);
  }
  // The frame around the window: a rod running round the edge
  col *= 1.0 - 0.08 * smoothstep(-3.0, 0.0, dEdge);
  float fc = clamp(0.5 + dEdge * uDpr, 0.0, 1.0);
  if (fc > 0.0) {
    float fhw = uFrame * 0.5, off = dEdge - fhw;
    vec2 fdir = edgeDir * sign(off);
    col = mix(col, uWoodFrame ? shadeWood(p, fdir, abs(off), fhw, uMetal) : shadeRod(p, fdir, abs(off), fhw, uMetal), fc);
    a = mix(a, 1.0, fc);
  }

  // Selected tiles (?tune only): a white ring with a dark line outside it
  if (uHasSel && d > -3.5 && d < 0.5 && all(greaterThanEqual(cell, vec2(0))) && all(lessThan(cell, uGrid))
      && texelFetch(uSelTex, ivec2(cell), 0).r > 0.5) {
    col = d < -1.5 ? vec3(1) : vec3(0.1);
    a = 1.0;
  }

  a *= alpha;
  o = vec4(col * a, a);
}`;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const prog = gl.createProgram();
  try {
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.error('stained-glass:', err);
    canvas.style.display = 'none';
    return;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  const u = (name) => (U[name] ??= gl.getUniformLocation(prog, name));
  gl.uniform1f(u('uDpr'), dpr);
  gl.uniform1i(u('uHasSel'), 0);
  // Baked glass heights (pass 2 renders into this, the window reads it)
  const heightTex = gl.createTexture();
  const bakeFb = gl.createFramebuffer();
  gl.uniform1i(u('uHeight'), 2);
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.uniform1i(u('uTiles'), 0);
  let grid = { cols: 0, rows: 0, tw: 0, th: 0, seed: null, index: null };

  // Turns a config into the window's geometry. Blocks fill the glass evenly;
  // the arch, mullions and transoms all land on seams between blocks.
  const CAM = 1100;                            // camera's distance from the window, px: how strong the perspective is
  let current;
  function apply(c) {
    current = c;
    gl.uniform1f(u('uCam'), CAM);
    gl.uniform1f(u('uSheen'), c.sheen);
    gl.uniform1f(u('uGlare'), c.glare);
    gl.uniform1f(u('uIor'), c.ior);
    gl.uniform1f(u('uThick'), c.thickness);
    gl.uniform1f(u('uRough'), c.roughness);
    gl.uniform1f(u('uDisp'), c.dispersion);
    gl.uniform1f(u('uTint'), c.tint);
    gl.uniform1f(u('uCaustic'), c.caustics);
    gl.uniform1f(u('uLens'), c.lenses);
    gl.uniform1f(u('uGlareSize'), c.glareSize);
    gl.uniform1f(u('uOutside'), c.outside);
    // Size: the canvas keeps its own shape, and shrinks with the column on phones
    W = c.width; H = c.height;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    canvas.style.width = W + 'px';
    canvas.style.aspectRatio = W + ' / ' + H;
    gl.uniform2f(u('uSize'), W, H);
    const F = c.frame;
    L = F; R = W - F; T = F; B = H - F;
    gl.uniform4f(u('uBox'), L, T, R, B);
    gl.uniform1f(u('uFrame'), F);
    const n = parseInt(c.frameColor.slice(1), 16);
    gl.uniform3f(u('uMetal'), (n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
    gl.uniform1i(u('uWoodFrame'), c.frameMaterial === 'glass' ? 0 : 1);
    const arch = c.shape !== 'rectangle';
    gl.uniform1i(u('uArch'), arch ? 1 : 0);
    const jn = parseInt(c.jointColor.slice(1), 16);
    gl.uniform3f(u('uJoint'), (jn >> 16) / 255, ((jn >> 8) & 255) / 255, (jn & 255) / 255);
    const COLS = Math.max(2, Math.round((R - L) / c.tileSize));
    const ROWS = Math.max(2, Math.round((B - T) / c.tileSize));
    const tw = (R - L) / COLS, th = (B - T) / ROWS;
    // no arch: the rectangle starts at the top, and so do the mullions
    const archRows = arch ? Math.min(ROWS - 1, Math.max(1, Math.round(c.archHeight / th))) : 0;
    const S = T + archRows * th;
    const mull = [], tran = [];
    for (let k = 1; k < Math.min(c.columns, 5); k++) mull.push(L + Math.round((k * COLS) / c.columns) * tw);
    const below = ROWS - archRows;
    // (the first transom marks where the arch meets the panels; with no arch there's nothing to mark)
    for (let k = arch ? 0 : 1; k < Math.min(c.sections, 4); k++) tran.push(S + Math.round((k * below) / c.sections) * th);
    gl.uniform2f(u('uTile'), tw, th);
    gl.uniform1f(u('uS'), S);
    gl.uniform1f(u('uRx'), (R - L) / 2);
    gl.uniform1f(u('uRy'), S - T);
    gl.uniform1f(u('uCx'), W / 2);
    gl.uniform1fv(u('uMull[0]'), [...mull, 0, 0, 0, 0].slice(0, 4));
    gl.uniform1i(u('uMullN'), mull.length);
    gl.uniform1fv(u('uTran[0]'), [...tran, 0, 0, 0, 0].slice(0, 4));
    gl.uniform1i(u('uTranN'), tran.length);
    gl.uniform1i(u('uSpokes'), Math.min(c.spokes, 16));
    gl.uniform1f(u('uHub'), c.hub);
    gl.uniform1f(u('uWood'), c.barWidth);
    gl.uniform1f(u('uSpoke'), c.spokeWidth);
    gl.uniform1f(u('uWave'), c.edgeWave);
    gl.uniform1f(u('uBlur'), c.edgeBlur);
    gl.uniform1f(u('uGap'), c.gap);
    gl.uniform1f(u('uRad'), c.cornerRadius);
    gl.uniform1f(u('uTex'), c.texture);
    gl.uniform1f(u('uGlow'), c.glow);
    gl.uniform1f(u('uSeed'), (c.seed % 9973) / 9973);
    gl.uniform1f(u('uOpacity'), c.opacity);
    gl.uniform2f(u('uGrid'), COLS, ROWS);

    // Each tile's default colour comes from the shader's own random pick, so
    // read those picks back once per grid (one pixel per tile), then lay any
    // per-tile changes from c.tiles over them
    if (grid.cols !== COLS || grid.rows !== ROWS || grid.seed !== c.seed) {
      gl.viewport(0, 0, COLS, ROWS);
      gl.uniform1i(u('uPass'), 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const px = new Uint8Array(COLS * ROWS * 4);
      gl.readPixels(0, 0, COLS, ROWS, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.uniform1i(u('uPass'), 0);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const index = new Uint8Array(COLS * ROWS);
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) index[j * COLS + i] = px[((ROWS - 1 - j) * COLS + i) * 4];
      }
      grid = { cols: COLS, rows: ROWS, seed: c.seed, index };
    }
    grid.tw = tw; grid.th = th;
    PALETTE = PALETTES[c.palette] || PALETTES.pastel;
    const data = new Uint8Array(COLS * ROWS * 4);
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const k = j * COLS + i, t = c.tiles[`${i},${j}`] || {};
        const [r, g, b] = rgb(t.color || PALETTE[grid.index[k]]);
        data.set([r, g, b, Math.round((t.opacity ?? 1) * 255)], k * 4);
      }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, COLS, ROWS, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

    // Bake the glass's surface into heightTex: the expensive shape work runs
    // once per change, and every frame just lights it
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, heightTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);              // can't sample what's being drawn into
    gl.bindFramebuffer(gl.FRAMEBUFFER, bakeFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, heightTex, 0);
    gl.uniform1i(u('uPass'), 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.uniform1i(u('uPass'), 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, heightTex);
    gl.activeTexture(gl.TEXTURE0);

    if (rays) rays.layout(c);
  }

  function render(t) {
    const s = t / 1000;
    // the sun wanders side to side on two unrelated rhythms, so the beams never settle square
    const st = s * current.raySpeed;
    const sun = [W * current.sunX + (Math.sin(st * 0.11) * 0.6 + Math.sin(st * 0.07 + 1.7) * 0.4) * W * 0.025,
                 H * current.sunY + Math.sin(st * 0.09 + 0.6) * H * 0.012];
    gl.uniform2f(u('uSun'), sun[0], sun[1]);
    gl.uniform1f(u('uPulse'), 0.5 + 0.5 * Math.sin(s * 0.4));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (rays) rays.draw(s, sun);
  }

  /* ── Light beams: a second canvas around the window, over it and under the
     text. The same 3D scene as the glass: a camera in front of the window,
     the sun far behind it as a directional light, and the window's image as
     the light's gobo (cookie). For every pixel, march along the camera's ray
     through the air in front of the glass; at each step, trace back toward
     the sun to the window and see which tile (if any) that light came
     through. That gives a beam out of each tile toward you, the tile's
     colour, split from its neighbours by the dark lines between tiles, and
     converging on the sun in perspective. Drawn at 1× resolution: it is
     soft by nature. Hidden on phones. ── */
  const rays = (() => {
    const rc = document.createElement('canvas');
    rc.className = 'home-glass-rays';
    rc.setAttribute('aria-hidden', 'true');
    canvas.parentNode.insertBefore(rc, canvas.nextSibling);
    const rg = rc.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
    if (!rg) { rc.remove(); return null; }

    const RFS = `#version 300 es
precision highp float;
uniform sampler2D uWin;   // the window as drawn this frame: the light's cookie
uniform vec2 uSize;       // this canvas, CSS px
uniform float uRes;       // drawing-buffer pixels per CSS px
uniform vec4 uWin_;       // window's x, y, w, h inside this canvas (the plane z = 0)
uniform vec3 uEye;        // camera, px (z toward the viewer)
uniform vec3 uLd;         // direction the sunlight travels, scaled so z = 1
uniform float uZmax, uStrength, uTime;
uniform float uSoft;      // how much beams soften as they travel (penumbra)
uniform float uDust;      // how many dust motes drift through the beams
uniform float uBloom;     // glow around the brightest glass
uniform float uSpeed;     // how fast the beams move
uniform float uShimmer;   // how much individual beams brighten and fade
uniform float uReveal;    // 0 → 1 as the light first pours in
out vec4 o;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

// light let through at a spot on the glass: glass yes, dark mortar and bars barely
float through(vec4 c) { return smoothstep(0.1, 0.4, dot(c.rgb, vec3(0.333))) * c.a; }

void main() {
  vec2 q = vec2(gl_FragCoord.x, uSize.y * uRes - gl_FragCoord.y) / uRes;
  float t = uTime * uSpeed;
  // Each beam's direction as seen from the sun's spot (their vanishing point)
  vec2 sunQ = uEye.xy - uLd.xy * uEye.z;
  vec2 fromSun = q - sunQ;
  float ang = atan(fromSun.x, fromSun.y);
  // The light pours in: beams reach further as uReveal goes 0 → 1
  float reveal = 1.0 - pow(1.0 - uReveal, 3.0);
  float zmax = uZmax * mix(0.08, 1.0, reveal);

  // ── Beams: march the camera's ray through the hazy air in front of the
  // glass; at each step, trace back along the sunlight to the window ──
  const int N = 56;
  float jitter = hash(q);                                   // hides banding
  vec3 acc = vec3(0);
  float lit = 0.0;
  float z0 = zmax * 0.35;
  for (int i = 0; i < N; i++) {
    float z = (float(i) + jitter) / float(N) * zmax;        // depth in front of the glass
    vec2 P = uEye.xy + (q - uEye.xy) * (uEye.z - z) / uEye.z;   // the camera ray at that depth
    vec2 uv = (P - uLd.xy * z - uWin_.xy) / uWin_.zw;      // back along the sunlight to the glass
    if (any(lessThan(uv, vec2(0))) || any(greaterThan(uv, vec2(1)))) continue;
    // penumbra: the further from the glass, the softer the beam's edges
    vec4 c = textureLod(uWin, uv, z / zmax * 5.0 * uSoft);
    // brightest right at the glass, falling off like 1/d² as the light
    // spreads, then dying away to nothing so there's no hard end; dust
    // drifting through makes the haze uneven
    float w = through(c) / (1.0 + (z / z0) * (z / z0)) * smoothstep(zmax, zmax * 0.5, z)
            * (0.6 + 0.8 * noise(P * 0.02 + vec2(0.0, uTime * 0.12)));
    acc += c.rgb * w;
    lit += w;
  }
  vec3 hue = lit > 0.0 ? acc / lit : vec3(1);
  float light = pow(lit / float(N) * 3.2, 1.4) * 1.3 * uStrength;   // a little contrast so beams separate
  // Shimmer: the beams stay where they are, but each slowly brightens and
  // dims on its own, like light as thin cloud passes the sun. Noise across
  // the fan's angle (one value per narrow wedge) drifts through time only.
  float flick = noise(vec2(ang * 24.0, t * 0.35)) * 0.65 + noise(vec2(ang * 9.0 + 7.0, t * 0.22)) * 0.35;
  light *= mix(1.0, 0.35 + flick * 1.3, uShimmer) * reveal;
  // over the glass itself, only a trace, so the tiles stay clear; following
  // the window's own soft edge, the beams seem to come out of the tiles
  vec2 here = (q - uWin_.xy) / uWin_.zw;
  bool onWin = all(greaterThan(here, vec2(0))) && all(lessThan(here, vec2(1)));
  float solid = onWin ? texture(uWin, here).a : 0.0;
  light *= mix(1.0, 0.06, solid);

  // ── Dust motes: tiny specks drifting slowly through the air. Each sits at
  // its own depth and only shows if a beam reaches it there, in that beam's
  // colour, twinkling as it turns ──
  vec3 moteC = vec3(0);
  float moteA = 0.0;
  for (int l = 0; l < 2; l++) {
    float fl = float(l);
    float cs = mix(34.0, 21.0, fl);                         // one speck per cell this size, px
    vec2 drift = vec2(sin(uTime * 0.05 + fl * 2.0) * 20.0, -uTime * (3.0 + 2.0 * fl));
    vec2 g = (q + drift) / cs, id = floor(g) + fl * 101.0;
    vec2 at = 0.15 + 0.7 * vec2(hash(id + 0.13), hash(id + 1.37));
    at += 0.08 * vec2(sin(uTime * 0.4 + hash(id) * 30.0), cos(uTime * 0.33 + hash(id + 2.0) * 30.0));
    float r = length((fract(g) - at) * cs);
    float size = mix(0.5, 1.6, hash(id + 3.3));
    float spot = smoothstep(size + 1.0, size * 0.2, r) * step(hash(id + 4.4), uDust * 0.6);
    if (spot <= 0.0) continue;
    float z = hash(id + 5.5) * uZmax * 0.8;
    vec2 qm = (floor(g) + at) * cs - drift;                 // where this speck is on screen
    vec2 P = uEye.xy + (qm - uEye.xy) * (uEye.z - z) / uEye.z;
    vec2 uv = (P - uLd.xy * z - uWin_.xy) / uWin_.zw;
    if (any(lessThan(uv, vec2(0))) || any(greaterThan(uv, vec2(1)))) continue;
    vec4 c = textureLod(uWin, uv, 1.0);
    float twinkle = 0.55 + 0.45 * sin(uTime * 1.7 + hash(id + 6.6) * 40.0);
    float m = spot * through(c) * twinkle / (1.0 + (z / z0) * (z / z0));
    moteC += mix(c.rgb, vec3(1.0, 0.95, 0.85), 0.4) * m;
    moteA += m;
  }

  // ── Bloom: the brightest glints and glass blow out into a soft glow ──
  float bloomA = 0.0;
  vec3 bloomC = vec3(0);
  if (uBloom > 0.0) {
    vec2 bh = clamp(here, vec2(0), vec2(1));
    vec3 wide = textureLod(uWin, bh, 4.5).rgb, close = textureLod(uWin, bh, 2.5).rgb;
    float outside = length(max(abs(here - 0.5) - 0.5, 0.0) * uWin_.zw);
    float fade = exp(-outside / 30.0);
    float hot = (max(dot(close, vec3(0.333)) - 0.78, 0.0) * 3.0 + max(dot(wide, vec3(0.333)) - 0.72, 0.0) * 2.0) * fade;
    bloomA = clamp(hot * uBloom, 0.0, 0.5);
    bloomC = mix(close, vec3(1.0, 0.96, 0.88), 0.6);
  }

  vec2 e = min(q, uSize - q);
  float edgeFade = smoothstep(0.0, 90.0, min(e.x, e.y));

  // On a white page light shows as its colour: keep the hue vivid, warm it
  // like sunlight, and let the amount of light set how strongly it tints
  float peak = max(max(hue.r, hue.g), hue.b);
  hue /= max(peak, 1e-4);
  hue = mix(vec3(dot(hue, vec3(0.333))), hue, 1.2);
  hue = mix(hue, vec3(1.0, 0.86, 0.62), 0.15);
  float a = clamp(light, 0.0, 0.55);
  vec4 beams = vec4(clamp(hue, 0.0, 1.0) * a, a);
  float ma = clamp(moteA * 2.5, 0.0, 0.9);
  vec4 motes = vec4(moteC / max(moteA, 1e-4) * ma, ma);
  vec4 bloom = vec4(bloomC * bloomA, bloomA);
  // layer them: beams, then bloom, then the specks on top
  vec4 outC = beams;
  outC = bloom + outC * (1.0 - bloom.a);
  outC = motes + outC * (1.0 - motes.a);
  o = outC * edgeFade;
}`;
    const sh = (type, src) => {
      const x = rg.createShader(type);
      rg.shaderSource(x, src);
      rg.compileShader(x);
      if (!rg.getShaderParameter(x, rg.COMPILE_STATUS)) throw new Error(rg.getShaderInfoLog(x));
      return x;
    };
    const rp = rg.createProgram();
    try {
      rg.attachShader(rp, sh(rg.VERTEX_SHADER, VS));
      rg.attachShader(rp, sh(rg.FRAGMENT_SHADER, RFS));
      rg.linkProgram(rp);
      if (!rg.getProgramParameter(rp, rg.LINK_STATUS)) throw new Error(rg.getProgramInfoLog(rp));
    } catch (err) {
      console.error('stained-glass rays:', err);
      rc.remove();
      return null;
    }
    rg.useProgram(rp);
    rg.bindBuffer(rg.ARRAY_BUFFER, rg.createBuffer());
    rg.bufferData(rg.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), rg.STATIC_DRAW);
    const al = rg.getAttribLocation(rp, 'a');
    rg.enableVertexAttribArray(al);
    rg.vertexAttribPointer(al, 2, rg.FLOAT, false, 0, 0);
    const RU = {};
    const ru = (name) => (RU[name] ??= rg.getUniformLocation(rp, name));
    const wt = rg.createTexture();
    rg.bindTexture(rg.TEXTURE_2D, wt);
    rg.texParameteri(rg.TEXTURE_2D, rg.TEXTURE_MIN_FILTER, rg.LINEAR_MIPMAP_LINEAR);   // blurred levels: penumbra and bloom
    rg.texParameteri(rg.TEXTURE_2D, rg.TEXTURE_MAG_FILTER, rg.LINEAR);
    rg.texParameteri(rg.TEXTURE_2D, rg.TEXTURE_WRAP_S, rg.CLAMP_TO_EDGE);
    rg.texParameteri(rg.TEXTURE_2D, rg.TEXTURE_WRAP_T, rg.CLAMP_TO_EDGE);

    let cfg = null, pad = 0;
    // The light pours in once the page is showing: straight away, or once the
    // glitter intro has wiped away if it's playing. Instantly under reduced motion.
    let revealStart = null;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) revealStart = -1e9;
    else if (document.querySelector('.glitter-intro')) addEventListener('glitter:intro-done', () => { revealStart = performance.now(); }, { once: true });
    else revealStart = performance.now();
    const RES = 0.5;
    // Sizes and places this canvas around the window, with room for the beams
    function layout(c) {
      cfg = c;
      const on = c.rays > 0 || c.dust > 0 || c.bloom > 0;   // this layer also carries the dust and bloom
      rc.hidden = !on;
      if (!on) return;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      pad = Math.round(c.rayLength * 1.4 + 40);   // beams spread a little further than rayLength; never cut them off
      const cw = w + pad * 2, ch = h + pad * 2;
      // beams are soft, so half resolution looks the same at a quarter of the work
      const bw = Math.round(cw * RES), bh = Math.round(ch * RES);
      if (rc.width !== bw || rc.height !== bh) { rc.width = bw; rc.height = bh; }
      rc.style.width = cw + 'px';
      rc.style.height = ch + 'px';
      rc.style.left = canvas.offsetLeft - pad + 'px';
      rc.style.top = canvas.offsetTop - pad + 'px';
      rg.viewport(0, 0, bw, bh);
      rg.uniform2f(ru('uSize'), cw, ch);
      rg.uniform1f(ru('uRes'), RES);
      rg.uniform4f(ru('uWin_'), pad, pad, w, h);
      // camera centred on the window; beams reach about rayLength past its edges
      const k = w / W, cam = CAM * k, half = Math.max(w, h) / 2;
      rg.uniform3f(ru('uEye'), pad + w / 2, pad + h / 2, cam);
      rg.uniform1f(ru('uZmax'), Math.min((cam * c.rayLength) / (half + c.rayLength), cam * 0.85));
      rg.uniform1f(ru('uStrength'), c.rays);
      rg.uniform1f(ru('uSoft'), c.softness);
      rg.uniform1f(ru('uDust'), c.dust);
      rg.uniform1f(ru('uBloom'), c.bloom);
      rg.uniform1f(ru('uSpeed'), c.raySpeed);
      rg.uniform1f(ru('uShimmer'), c.rayShimmer);
    }
    // Must run right after the window draws, while its image is still there.
    // sun: where the window drew its sun, in the window's own px
    function draw(s, sun) {
      if (rc.hidden || !rc.offsetParent) return;
      const w = canvas.offsetWidth, h = canvas.offsetHeight, k = w / W, cam = CAM * k;
      // sunlight's direction, chosen so its beams converge on the sun in perspective
      rg.uniform3f(ru('uLd'), -(sun[0] * k - w / 2) / cam, -(sun[1] * k - h / 2) / cam, 1);
      rg.texImage2D(rg.TEXTURE_2D, 0, rg.RGBA, rg.RGBA, rg.UNSIGNED_BYTE, canvas);
      rg.generateMipmap(rg.TEXTURE_2D);
      rg.uniform1f(ru('uTime'), s);
      rg.uniform1f(ru('uReveal'), revealStart === null ? 0 : Math.min((performance.now() - revealStart) / 2600, 1));
      rg.clearColor(0, 0, 0, 0);
      rg.clear(rg.COLOR_BUFFER_BIT);
      rg.drawArrays(rg.TRIANGLES, 0, 3);
    }
    // The window can shrink with the column; keep the light lined up with it
    // ?edit can move the window (assets/page-edit.js); the light moves with it
    addEventListener('page-edit:moved', (e) => { if (e.detail === canvas) rc.style.translate = canvas.style.translate; });
    new ResizeObserver(() => { if (cfg) { layout(cfg); render(performance.now()); } }).observe(canvas);
    return { layout, draw };
  })();

  apply(CONFIG);
  render(0);

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!still) {
    // Animate only while the window is on screen
    let raf = 0;
    const loop = (t) => { render(t); raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !raf) raf = requestAnimationFrame(loop);
      else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(canvas);
  }

  /* ── ?tune panel: sliders that update the window live ── */
  if (!/[?&]tune\b/.test(location.search)) return;
  const SLIDERS = [
    ['width', 'Width', 160, 540, 1],
    ['height', 'Height', 120, 600, 1],
    ['tileSize', 'Tile size', 14, 80, 1],
    ['columns', 'Columns', 1, 5, 1],
    ['sections', 'Rows of panels', 1, 4, 1],
    ['archHeight', 'Arch height', 40, 300, 1],
    ['spokes', 'Spokes', 0, 15, 1],
    ['spokeWidth', 'Spoke thickness', 0, 18, 0.5],
    ['hub', 'Arch centre', 0, 0.8, 0.01],
    ['barWidth', 'Bar thickness', 0, 18, 0.5],
    ['frame', 'Frame thickness', 0, 20, 0.5],
    ['edgeWave', 'Edge wave', 0, 30, 0.5],
    ['edgeBlur', 'Edge blur', 0, 40, 0.5],
    ['cornerRadius', 'Corner roundness', 0, 12, 0.2],
    ['gap', 'Gap', 0, 6, 0.1],
    ['texture', 'Ripples', 0, 1.5, 0.05],
    ['glow', 'Sun brightness', 0, 1.5, 0.05],
    ['ior', 'IOR (bend)', 1, 2.2, 0.01],
    ['thickness', 'Glass thickness', 0, 3, 0.05],
    ['roughness', 'Roughness (frost)', 0, 1, 0.01],
    ['dispersion', 'Dispersion', 0, 2, 0.05],
    ['tint', 'Tint depth', 0, 3, 0.05],
    ['caustics', 'Caustics', 0, 3, 0.05],
    ['lenses', 'Lenses', 0, 2, 0.05],
    ['outside', 'Clouds', 0, 1, 0.01],
    ['opacity', 'Glass opacity', 0, 1, 0.01],
    ['sunX', 'Sun left–right', 0, 1, 0.01],
    ['sunY', 'Sun top–bottom', 0, 1, 0.01],
    ['glare', 'Sun glare', 0, 3, 0.05],
    ['glareSize', 'Glare size', 0.005, 0.3, 0.005],
    ['sheen', 'Glass sheen', 0, 3, 0.05],
    ['rays', 'Light beams', 0, 3, 0.05],
    ['rayLength', 'Beam length', 0, 500, 5],
    ['softness', 'Beam softness', 0, 2, 0.05],
    ['dust', 'Dust motes', 0, 1.6, 0.05],
    ['bloom', 'Bloom', 0, 3, 0.05],
    ['raySpeed', 'Light speed', 0, 2, 0.05],
    ['rayShimmer', 'Beam shimmer', 0, 1.5, 0.05],
  ];
  const live = { ...CONFIG, tiles: { ...CONFIG.tiles } };
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:10000;width:260px;max-height:calc(100vh - 32px);overflow:auto;' +
    'padding:16px;background:#fff;border-radius:8px;box-shadow:0 0 0 1px rgb(0 0 0/.08),0 12px 32px -12px rgb(0 0 0/.25);' +
    'font:12px/16px var(--font-sans,system-ui);color:#333';
  panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
    '<span style="font-weight:600">Stained glass</span>' +
    '<button data-hide style="padding:2px 8px;border:1px solid #ddd;border-radius:6px;background:#f6f6f6;font:inherit;cursor:pointer">Hide</button></div>';
  // Hide tucks the panel away behind a small tab in the same corner; the
  // tab brings it back
  const tab = document.createElement('button');
  tab.textContent = 'Stained glass';
  tab.hidden = true;
  tab.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:10000;padding:8px 12px;border:0;border-radius:8px;background:#fff;' +
    'box-shadow:0 0 0 1px rgb(0 0 0/.08),0 12px 32px -12px rgb(0 0 0/.25);font:600 12px/16px var(--font-sans,system-ui);color:#333;cursor:pointer';
  panel.querySelector('[data-hide]').addEventListener('click', () => { panel.hidden = true; tab.hidden = false; });
  tab.addEventListener('click', () => { panel.hidden = false; tab.hidden = true; });
  let afterApply = () => {};
  const update = () => { apply(live); afterApply(); render(performance.now()); };
  for (const [key, label, min, max, step] of SLIDERS) {
    const row = document.createElement('label');
    row.style.cssText = 'display:block;margin-bottom:10px';
    row.innerHTML = `<span style="display:flex;justify-content:space-between"><span>${label}</span><b></b></span>` +
      `<input type="range" min="${min}" max="${max}" step="${step}" value="${live[key]}" style="width:100%">`;
    const out = row.querySelector('b'), input = row.querySelector('input');
    out.textContent = live[key];
    input.addEventListener('input', () => {
      live[key] = Number(input.value);
      out.textContent = input.value;
      update();
    });
    panel.appendChild(row);
  }
  {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px';
    row.innerHTML = '<span>Palette</span><select style="font:inherit">' +
      Object.keys(PALETTES).map((k) => `<option${k === live.palette ? ' selected' : ''}>${k}</option>`).join('') + '</select>';
    row.querySelector('select').addEventListener('change', (e) => { live.palette = e.target.value; update(); });
    panel.appendChild(row);
  }
  {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px';
    row.innerHTML = '<span>Shape</span><select style="font:inherit">' +
      ['arch', 'rectangle'].map((k) => `<option${k === live.shape ? ' selected' : ''}>${k}</option>`).join('') + '</select>';
    row.querySelector('select').addEventListener('change', (e) => { live.shape = e.target.value; update(); });
    panel.appendChild(row);
  }
  {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px';
    row.innerHTML = '<span>Frame &amp; bars</span><select style="font:inherit">' +
      ['wood', 'glass'].map((k) => `<option${k === live.frameMaterial ? ' selected' : ''}>${k}</option>`).join('') + '</select>';
    row.querySelector('select').addEventListener('change', (e) => { live.frameMaterial = e.target.value; update(); });
    panel.appendChild(row);
  }
  {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px';
    row.innerHTML = `<span>Frame &amp; bars colour</span><input type="color" value="${live.frameColor}">`;
    row.querySelector('input').addEventListener('input', (e) => { live.frameColor = e.target.value; update(); });
    panel.appendChild(row);
  }
  {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px';
    row.innerHTML = `<span>Joint glass</span><input type="color" value="${live.jointColor}">`;
    row.querySelector('input').addEventListener('input', (e) => { live.jointColor = e.target.value; update(); });
    panel.appendChild(row);
  }
  // Tile editor: click tiles in the window to select them, then recolour
  // them together. Click picks one tile; Shift/Cmd-click adds or removes
  // one; dragging paints the selection across tiles.
  {
    const box = document.createElement('div');
    box.style.cssText = 'margin:14px 0 10px;padding-top:12px;border-top:1px solid #eee';
    const button = 'padding:6px 10px;margin:0 6px 6px 0;border:1px solid #ddd;border-radius:6px;background:#f6f6f6;font:inherit;cursor:pointer';
    box.innerHTML = '<div style="font-weight:600;margin-bottom:8px">Tiles</div>' +
      '<div data-hint style="color:#888;margin-bottom:8px">Click a tile in the window to change it. Shift-click or drag to pick several.</div>' +
      '<div data-edit hidden>' +
      '<label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span data-name></span><input data-color type="color"></label>' +
      '<label style="display:block;margin-bottom:10px"><span style="display:flex;justify-content:space-between"><span>Opacity</span><b data-op></b></span>' +
      '<input data-opacity type="range" min="0" max="1" step="0.01" style="width:100%"></label>' +
      `<button data-reset style="${button}">Reset selected</button><button data-clear style="${button}">Deselect</button>` +
      '</div>' +
      `<button data-all style="${button}">Select all</button>`;
    panel.appendChild(box);
    const $ = (q) => box.querySelector(q);
    const sel = new Set();                     // 'column,row' keys
    const selTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, selTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(u('uSelTex'), 1);
    const colourOf = (key) => {
      const [i, j] = key.split(',').map(Number);
      return live.tiles[key]?.color || PALETTE[grid.index[j * grid.cols + i]];
    };
    // Sends the selection to the shader; drops tiles that fell off the grid
    const upload = () => {
      for (const key of sel) {
        const [i, j] = key.split(',').map(Number);
        if (i >= grid.cols || j >= grid.rows) sel.delete(key);
      }
      const data = new Uint8Array(grid.cols * grid.rows);
      for (const key of sel) { const [i, j] = key.split(',').map(Number); data[j * grid.cols + i] = 255; }
      gl.activeTexture(gl.TEXTURE1);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, grid.cols, grid.rows, 0, gl.RED, gl.UNSIGNED_BYTE, data);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(u('uHasSel'), sel.size ? 1 : 0);
    };
    const show = () => {
      upload();
      $('[data-hint]').hidden = sel.size > 0;
      $('[data-edit]').hidden = sel.size === 0;
      if (sel.size) {
        const first = [...sel][0];
        const t = live.tiles[first] || {};
        $('[data-name]').textContent = sel.size === 1 ? `Tile ${first.replace(',', ', ')} colour` : `${sel.size} tiles: colour`;
        $('[data-color]').value = colourOf(first);
        $('[data-opacity]').value = t.opacity ?? 1;
        $('[data-op]').textContent = t.opacity ?? 1;
      }
      render(performance.now());
    };
    afterApply = upload;
    const edit = (patch) => {
      for (const key of sel) live.tiles[key] = { ...live.tiles[key], ...patch };
      update();
    };
    $('[data-color]').addEventListener('input', (e) => edit({ color: e.target.value }));
    $('[data-opacity]').addEventListener('input', (e) => { $('[data-op]').textContent = e.target.value; edit({ opacity: Number(e.target.value) }); });
    $('[data-reset]').addEventListener('click', () => { for (const key of sel) delete live.tiles[key]; update(); show(); });
    $('[data-clear]').addEventListener('click', () => { sel.clear(); show(); });
    $('[data-all]').addEventListener('click', () => {
      for (let j = 0; j < grid.rows; j++) for (let i = 0; i < grid.cols; i++) sel.add(`${i},${j}`);
      show();
    });

    const tileAt = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) * W) / r.width - L, y = ((e.clientY - r.top) * H) / r.height - T;
      const i = Math.floor(x / grid.tw), j = Math.floor(y / grid.th);
      return i >= 0 && j >= 0 && i < grid.cols && j < grid.rows ? `${i},${j}` : null;
    };
    let painting = null;                       // 'add' or 'remove' while the pointer is down
    canvas.style.cursor = 'pointer';
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => {
      const key = tileAt(e);
      const multi = e.shiftKey || e.metaKey || e.ctrlKey;
      if (!key) { if (!multi) { sel.clear(); show(); } return; }
      if (multi) {
        painting = sel.has(key) ? 'remove' : 'add';
      } else {
        const only = sel.size === 1 && sel.has(key);
        sel.clear();
        painting = only ? 'remove' : 'add';    // clicking the lone selected tile deselects it
      }
      painting === 'add' ? sel.add(key) : sel.delete(key);
      canvas.setPointerCapture(e.pointerId);
      show();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!painting) return;
      const key = tileAt(e);
      if (!key || (painting === 'add') === sel.has(key)) return;
      painting === 'add' ? sel.add(key) : sel.delete(key);
      show();
    });
    const stop = () => { painting = null; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    show();
  }
  const btn = (text, fn) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = 'margin:4px 8px 0 0;padding:6px 10px;border:1px solid #ddd;border-radius:6px;background:#f6f6f6;font:inherit;cursor:pointer';
    b.addEventListener('click', fn);
    panel.appendChild(b);
    return b;
  };
  btn('Shuffle colours', () => { live.seed = Math.floor(Math.random() * 1e9); update(); });
  const copy = btn('Copy settings', async () => {
    const text = 'const CONFIG = ' + JSON.stringify(live, null, 2).replace(/"(\w+)":/g, '$1:') + ';';
    try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; }
    catch { console.log(text); copy.textContent = 'Logged to console'; }
    setTimeout(() => (copy.textContent = 'Copy settings'), 1500);
  });
  document.body.appendChild(panel);
  document.body.appendChild(tab);
})();
