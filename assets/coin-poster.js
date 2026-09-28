/* ─── COIN POSTER (About page) ───
   React + Three.js. A grid of 3D metallic coins, one per place visited.
   Hover a coin and it spins continuously on its Y axis; move away and it
   coasts to a stop on whichever face is nearest, like a coin settling on
   a table.

   Every coin draws into ONE shared WebGL canvas (a scissored viewport per
   coin), so adding more coins doesn't run into the browser's
   WebGL-context limit.

   Coins are listed in assets/coins/coins.json. Photos come from the
   Numista catalogue via scripts/fetch-coins.mjs, which fills in each
   entry's front/back paths. Until a coin has photos, a generated gold
   face with its text is shown in their place. */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const html = htm.bind(React.createElement);

const COINS_URL = 'assets/coins/coins.json';

const RADIUS = 1;
const THICKNESS = 0.14;         // ~1:7 of the radius, close to a real coin
const SPIN_SPEED = Math.PI * 1.6; // rad/s at full hover spin
const SPIN_EASE = 3;            // how quickly the spin winds up (1/s)
const SETTLE_K = 38;            // spring stiffness for settling on a face
const GOLD = new THREE.Color('#d4af5a');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ─── Procedural textures ─── */

// Normal map for the reeded (ridged) edge: one ridge period, tiled around
// the circumference.
function makeReedingNormalMap() {
  const w = 32;
  const c = document.createElement('canvas');
  c.width = w; c.height = 1;
  const ctx = c.getContext('2d');
  for (let x = 0; x < w; x++) {
    const nx = Math.sin((x / w) * Math.PI * 2) * 0.8;
    const nz = Math.sqrt(1 - nx * nx);
    ctx.fillStyle = `rgb(${Math.round((nx * 0.5 + 0.5) * 255)},128,${Math.round((nz * 0.5 + 0.5) * 255)})`;
    ctx.fillRect(x, 0, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(160, 1);
  return tex;
}

// Stand-in coin face drawn on a canvas, used until the real photo loads
// (or if it's missing).
function makePlaceholderFace({ place, value = '', unit = '', year = '' }, side) {
  const S = 512, cx = S / 2;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');

  const base = ctx.createRadialGradient(cx * 0.8, cx * 0.7, 20, cx, cx, cx);
  base.addColorStop(0, '#f6e3a8');
  base.addColorStop(0.6, '#dcb866');
  base.addColorStop(1, '#b98f3e');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);

  const ink = 'rgba(110, 76, 22, 0.75)';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;

  // Beaded inner border
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cx, S * 0.43, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * S * 0.465, cx + Math.sin(a) * S * 0.465, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Text around the top arc
  const arcText = side === 'front' || !year ? place.toUpperCase() : `${place.toUpperCase()} · ${year}`;
  ctx.font = '600 38px Geist, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const r = S * 0.36;
  const spread = Math.min(Math.PI * 0.9, arcText.length * 0.13);
  [...arcText].forEach((ch, i, arr) => {
    const a = -Math.PI / 2 - spread / 2 + (spread * (i + 0.5)) / arr.length;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cx + Math.sin(a) * r);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  if (side === 'front') {
    ctx.font = '700 150px Geist, system-ui, sans-serif';
    ctx.fillText(value, cx, cx + 10);
    ctx.font = '600 40px Geist, system-ui, sans-serif';
    ctx.fillText(unit, cx, cx + 110);
  } else {
    // Simple laurel + star emblem
    ctx.lineWidth = 7;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx, cx + 20, 110, Math.PI / 2 + dir * 0.35, Math.PI / 2 + dir * 1.9, dir < 0);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 2 + dir * (0.55 + i * 0.25);
        ctx.save();
        ctx.translate(cx + Math.cos(a) * 110, cx + 20 + Math.sin(a) * 110);
        ctx.rotate(a + (dir > 0 ? 0.6 : -0.6));
        ctx.beginPath(); ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 26 : 62;
      ctx.lineTo(cx + Math.cos(a) * rr, cx + 10 + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Catalogue photos show the coin on a plain background with some margin.
// Crop to the coin's bounding square so the coin fills the face exactly.
function cropToCoin(img) {
  const S = 96; // detect on a small copy, crop the full-size image
  const probe = document.createElement('canvas');
  probe.width = probe.height = S;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  pctx.drawImage(img, 0, 0, S, S);
  const px = pctx.getImageData(0, 0, S, S).data;
  const bg = [px[0], px[1], px[2], px[3]]; // top-left corner = background
  let x0 = S, y0 = S, x1 = -1, y1 = -1;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const diff = bg[3] < 16
        ? px[i + 3]                               // transparent background
        : Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]);
      if (diff > 36) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
  }
  const c = document.createElement('canvas');
  const size = Math.min(1024, Math.max(img.naturalWidth, img.naturalHeight));
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (x1 < 0) { ctx.drawImage(img, 0, 0, size, size); return c; }
  const sx = img.naturalWidth / S, sy = img.naturalHeight / S;
  const cx = ((x0 + x1 + 1) / 2) * sx, cy = ((y0 + y1 + 1) / 2) * sy;
  const half = (Math.max((x1 - x0 + 1) * sx, (y1 - y0 + 1) * sy) / 2) * 0.99; // shave the anti-aliased edge
  ctx.drawImage(img, cx - half, cy - half, half * 2, half * 2, 0, 0, size, size);
  return c;
}

// Traces a non-round coin's outline from its (cropped) photo: the coin's
// radius at `n` evenly spaced angles, counter-clockwise from 3 o'clock,
// normalized so the widest point is 1.
function measureOutline(canvas, n = 256) {
  const S = 256, h = S / 2;
  const probe = document.createElement('canvas');
  probe.width = probe.height = S;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  pctx.drawImage(canvas, 0, 0, S, S);
  const px = pctx.getImageData(0, 0, S, S).data;
  const bg = [px[0], px[1], px[2], px[3]];
  const isCoin = (x, y) => {
    const i = ((y | 0) * S + (x | 0)) * 4;
    return (bg[3] < 16 ? px[i + 3]
      : Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2])) > 36;
  };
  const raw = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    let r = h - 1;
    while (r > h * 0.5 && !isCoin(h + Math.cos(t) * r, h - Math.sin(t) * r)) r -= 0.5;
    raw.push(r / h);
  }
  // Median of 5 to drop single-pixel noise
  const out = raw.map((_, k) => [-2, -1, 0, 1, 2].map((d) => raw[(k + d + n) % n]).sort((a, b) => a - b)[2]);
  const max = Math.max(...out);
  return out.map((r) => r / max);
}

// Rotation (radians) that lines the back photo's outline up with the front's.
// The back cap is mirrored, so back angle (π - t) sits under front angle t.
// Symmetric outlines (12 scallops, 7 sides…) fit equally well at several
// turns; of those, take the smallest so the photo stays upright.
function alignBack(front, back) {
  const n = front.length;
  const errs = [];
  for (let s = 0; s < n; s++) {
    let err = 0;
    for (let k = 0; k < n; k++) {
      const d = front[k] - back[(((n / 2 - k + s) % n) + n) % n];
      err += d * d;
    }
    errs.push(err);
  }
  const min = Math.min(...errs), max = Math.max(...errs);
  const fits = (s) => errs[s] <= min + (max - min) * 0.15;
  let best = 0;
  for (let s = 0; s < n; s++) {
    const turn = Math.min(s, n - s);
    if (fits(s) && (!fits(best) || turn < Math.min(best, n - best))) best = s;
  }
  // Settle on the exact minimum within a few steps of that fit
  const center = best;
  for (let d = -3; d <= 3; d++) {
    const s = (center + d + n) % n;
    if (errs[s] < errs[best]) best = s;
  }
  return (best / n) * Math.PI * 2;
}

function rotateCanvas(src, angle) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d');
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(angle);
  ctx.drawImage(src, -c.width / 2, -c.height / 2);
  return c;
}

// Coin body extruded from a traced outline, with the same material slots
// as the round body: 0 = edge, 1 = front, 2 = back.
function makeShapedBody(profile) {
  const n = profile.length;
  const pts = profile.map((r, k) => {
    const t = (k / n) * Math.PI * 2;
    return new THREE.Vector2(Math.cos(t) * r * RADIUS, Math.sin(t) * r * RADIUS);
  });
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: THICKNESS, bevelEnabled: false });
  g.translate(0, 0, -THICKNESS / 2);
  // ExtrudeGeometry writes the bottom lid, then the top lid, then the sides.
  const lids = g.groups[0].count, half = lids / 2;
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < lids; i++) {
    const x = pos.getX(i) / (2 * RADIUS), y = pos.getY(i) / (2 * RADIUS);
    uv.setXY(i, i < half ? 0.5 - x : 0.5 + x, 0.5 + y);
  }
  g.clearGroups();
  g.addGroup(0, half, 2);
  g.addGroup(half, half, 1);
  g.addGroup(lids, pos.count - lids, 0);
  return g;
}

/* ─── Shared geometry ─── */

// Cylinder with its faces pointing ±Z, and cap UVs rewritten so each face
// image reads upright from the side it's seen from (the back cap is
// mirrored so it isn't reversed after a half turn).
function makeCoinBody() {
  const g = new THREE.CylinderGeometry(RADIUS, RADIUS, THICKNESS, 128, 1);
  const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const ny = nrm.getY(i);
    if (Math.abs(ny) < 0.5) continue; // edge
    const x = pos.getX(i) / (2 * RADIUS), z = pos.getZ(i) / (2 * RADIUS);
    uv.setXY(i, ny > 0 ? 0.5 + x : 0.5 - x, 0.5 - z);
  }
  g.rotateX(Math.PI / 2);
  return g;
}

/* ─── Engine: one renderer, many coins ─── */

class CoinEngine {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;
    this.coins = new Set();
    this.frame = 0;
    this.last = 0;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setScissorTest(true);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    this.camera.position.set(0, 0, 4.6); // coin fills ~87% of its box, leaving room for the hover lean

    this.body = makeCoinBody();
    this.rim = new THREE.TorusGeometry(RADIUS - 0.035, 0.03, 12, 128);
    this.reeding = makeReedingNormalMap();

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(stage);
    this.resize();
  }

  add(el, opts) {
    const scene = new THREE.Scene();
    scene.environment = this.env;

    const key = new THREE.DirectionalLight('#fff0d0', 2.2);
    key.position.set(-2, 3, 4);
    const rimLight = new THREE.DirectionalLight('#ffe2a8', 1.4);
    rimLight.position.set(3, -1, -2);
    scene.add(key, rimLight);

    const metal = opts.metal ? new THREE.Color(opts.metal) : GOLD;
    const edgeMat = new THREE.MeshPhysicalMaterial({
      color: metal, metalness: 1, roughness: 0.3,
      normalMap: this.reeding, normalScale: new THREE.Vector2(0.9, 0.9),
      envMapIntensity: 1.1,
    });
    const shaped = opts.shape && !/^round/i.test(opts.shape);
    const faces = {}; // cropped photo canvases, for tracing shaped coins
    const faceMat = (side) => {
      const placeholder = makePlaceholderFace(opts, side);
      const mat = new THREE.MeshPhysicalMaterial({
        map: placeholder, bumpMap: placeholder, bumpScale: 2.2,
        metalness: 0.85, roughness: 0.34,
        clearcoat: 0.35, clearcoatRoughness: 0.25,
        envMapIntensity: 1,
      });
      const url = side === 'front' ? opts.front : opts.back;
      if (url) {
        new THREE.ImageLoader().load(url, (img) => {
          faces[side] = cropToCoin(img);
          if (shaped && faces.front && faces.back) this.reshape(coin, faces);
          if (shaped && side === 'back' && faces.front) return; // reshape() set it, rotated
          const tex = new THREE.CanvasTexture(faces[side]);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          mat.map = tex;
          mat.bumpMap = tex;
          mat.needsUpdate = true;
          placeholder.dispose();
          this.wake();
        }, undefined, () => {}); // missing photo: keep the placeholder
      }
      return mat;
    };
    const front = faceMat('front'), back = faceMat('back');

    // Cylinder material groups: 0 = edge, 1 = top cap (front), 2 = bottom cap (back)
    const body = new THREE.Mesh(this.body, [edgeMat, front, back]);
    const rimMat = new THREE.MeshPhysicalMaterial({ color: metal, metalness: 1, roughness: 0.22 });
    const rimFront = new THREE.Mesh(this.rim, rimMat);
    const rimBack = new THREE.Mesh(this.rim, rimMat);
    rimFront.position.z = THICKNESS / 2;
    rimBack.position.z = -THICKNESS / 2;

    const spin = new THREE.Group();   // Y-axis spin
    spin.add(body, rimFront, rimBack);
    const tilt = new THREE.Group();   // slight lean toward the viewer on hover
    tilt.add(spin);
    scene.add(tilt);

    const coin = {
      el, scene, spin, tilt, body, rims: [rimFront, rimBack], edgeMat, back,
      mats: [edgeMat, front, back, rimMat],
      angle: 0, vel: 0, target: 0, hover: false, lean: 0,
      setHover: (on) => {
        if (coin.hover === on) return;
        coin.hover = on;
        if (reduceMotion.matches && on) coin.target = Math.round(coin.angle / Math.PI) * Math.PI + Math.PI;
        this.wake();
      },
    };
    this.coins.add(coin);
    this.wake();
    return coin;
  }

  // Swap a non-round coin's cylinder for its traced outline, and turn its
  // back photo so the two outlines line up.
  reshape(coin, faces) {
    const front = measureOutline(faces.front);
    const turn = alignBack(front, measureOutline(faces.back));
    const tex = new THREE.CanvasTexture(rotateCanvas(faces.back, turn));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    coin.back.map?.dispose();
    coin.back.map = coin.back.bumpMap = tex;
    coin.back.needsUpdate = true;

    coin.body.geometry = makeShapedBody(front);
    coin.shapedGeometry = coin.body.geometry;
    coin.rims.forEach((m) => { m.visible = false; }); // round rims don't fit
    coin.edgeMat.normalMap = null;                    // no reeding on a shaped edge
    coin.edgeMat.needsUpdate = true;
    this.wake();
  }

  remove(coin) {
    coin.shapedGeometry?.dispose();
    this.coins.delete(coin);
    coin.mats.forEach((m) => { m.map?.dispose(); m.dispose(); });
  }

  resize() {
    const { width, height } = this.stage.getBoundingClientRect();
    this.renderer.setSize(width, height, false);
    this.wake();
  }

  wake() {
    if (!this.frame) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  step(c, dt) {
    let moving = false;
    if (c.hover && !reduceMotion.matches) {
      // Wind up to a steady spin.
      c.vel += (SPIN_SPEED - c.vel) * (1 - Math.exp(-SPIN_EASE * dt));
      c.angle += c.vel * dt;
      // Keep the settle target one face ahead so letting go carries momentum.
      c.target = Math.round((c.angle + c.vel * 0.3) / Math.PI) * Math.PI;
      moving = true;
    } else {
      // Critically damped spring onto the nearest face.
      const acc = SETTLE_K * (c.target - c.angle) - 2 * Math.sqrt(SETTLE_K) * c.vel;
      c.vel += acc * dt;
      c.angle += c.vel * dt;
      if (Math.abs(c.target - c.angle) < 1e-4 && Math.abs(c.vel) < 1e-3) {
        c.angle = c.target; c.vel = 0;
      } else moving = true;
    }
    const leanTarget = c.hover ? 1 : 0;
    c.lean += (leanTarget - c.lean) * (1 - Math.exp(-8 * dt));
    if (Math.abs(leanTarget - c.lean) > 1e-3) moving = true;

    c.spin.rotation.y = c.angle;
    c.tilt.rotation.x = -0.14 * c.lean;
    c.tilt.scale.setScalar(1 + 0.04 * c.lean);
    return moving;
  }

  tick(now) {
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;

    const stageRect = this.canvas.getBoundingClientRect();
    const r = this.renderer;
    r.setScissor(0, 0, stageRect.width, stageRect.height);
    r.setClearColor(0x000000, 0);
    r.clear();

    let active = false;
    for (const c of this.coins) {
      if (this.step(c, dt)) active = true;
      const b = c.el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      const x = b.left - stageRect.left;
      const y = stageRect.bottom - b.bottom; // GL origin is bottom-left
      r.setViewport(x, y, b.width, b.height);
      r.setScissor(x, y, b.width, b.height);
      this.camera.aspect = b.width / b.height;
      this.camera.updateProjectionMatrix();
      r.render(c.scene, this.camera);
    }

    this.frame = active ? requestAnimationFrame(this.tick) : 0;
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.ro.disconnect();
    for (const c of this.coins) this.remove(c);
    this.body.dispose(); this.rim.dispose(); this.reeding.dispose(); this.env.dispose();
    this.renderer.dispose();
  }
}

/* ─── React components ─── */

const StageContext = createContext(null);

// Hosts the shared canvas. Any <Coin> inside it renders through it.
export function CoinStage({ className = '', children }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const [engine, setEngine] = useState(null);

  useEffect(() => {
    let e;
    try { e = new CoinEngine(canvasRef.current, stageRef.current); }
    catch { setEngine(false); return; } // no WebGL: coins fall back to flat images
    setEngine(e);
    return () => e.dispose();
  }, []);

  return html`
    <div ref=${stageRef} className=${`coin-stage ${className}`}>
      <canvas ref=${canvasRef} className="coin-stage-canvas" aria-hidden="true" />
      <${StageContext.Provider} value=${engine}>${children}<//>
    </div>`;
}

// A single 3D coin. front/back are image URLs for the two faces.
export function Coin({ front = 'front.png', back = 'back.png', place, year, metal, title, ...face }) {
  const engine = useContext(StageContext);
  const viewRef = useRef(null);
  const coinRef = useRef(null);
  const pointerType = useRef('mouse');

  useEffect(() => {
    if (!engine) return;
    const coin = engine.add(viewRef.current, { front, back, place, year, metal, ...face });
    coinRef.current = coin;
    return () => { engine.remove(coin); coinRef.current = null; };
  }, [engine, front, back, metal]);

  const setHover = (on) => coinRef.current?.setHover(on);

  return html`
    <button
      type="button"
      className="coin"
      aria-label=${`${title || 'Coin'} from ${place}${year ? `, ${year}` : ''}`}
      title=${title}
      onPointerDown=${(e) => { pointerType.current = e.pointerType; }}
      onPointerEnter=${(e) => { if (e.pointerType !== 'touch') setHover(true); }}
      onPointerLeave=${(e) => { if (e.pointerType !== 'touch') setHover(false); }}
      onFocus=${(e) => { if (e.target.matches(':focus-visible')) setHover(true); }}
      onBlur=${() => setHover(false)}
      onClick=${() => {
        // Touch has no hover, so a tap toggles the spin instead.
        if (pointerType.current === 'touch' && coinRef.current) setHover(!coinRef.current.hover);
      }}
    >
      <span ref=${viewRef} className="coin-view">
        ${engine === false && html`<img src=${front} alt="" />`}
      </span>
    </button>`;
}

export function CoinPoster({ coins }) {
  // Coin photos belong to their Numista contributors; credit them once
  // under the grid.
  const credits = [...new Map(coins.flatMap((c) => c.credits || []).map((cr) => [cr.by, cr])).values()];
  return html`
    <${CoinStage} className="coin-grid">
      ${coins.map(({ credits: _, numistaId, numistaUrl, query, ...c }) =>
        // No photo yet: pass null so the generated face shows instead of a 404.
        html`<${Coin} key=${c.place} ...${c} front=${c.front || null} back=${c.back || null} />`)}
    <//>
    ${credits.length > 0 && html`
      <details className="coin-credits">
        <summary>Photos: <a href="https://en.numista.com" target="_blank" rel="noopener">Numista</a> contributors</summary>
        <p>${credits.map((cr, i) => html`${i ? ', ' : ''}${cr.url
          ? html`<a href=${cr.url} target="_blank" rel="noopener">${cr.by}</a>`
          : cr.by}`)}</p>
      </details>`}`;
}

const mount = document.getElementById('coin-poster');
if (mount) {
  fetch(COINS_URL)
    .then((res) => res.json())
    .then((coins) => createRoot(mount).render(html`<${CoinPoster} coins=${coins} />`))
    .catch((err) => console.error('Coin poster: could not load', COINS_URL, err));
}
