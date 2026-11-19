'use strict';

// Mira living scene (Step 4): a lightweight three.js layer inside the
// existing .scene card. Procedural only, no model files, no network.
// Mood drives color via the shared hue map in mirror.js; BPM drives orbit
// tempo via ringPeriodMs. The existing ring, stats, and mood label stay
// as they are. Reduced motion or no WebGL falls back to the flat card.

const THREE = require('three');
const { ringPeriodMs } = require('./mirror');

const COUNT = 70;
const SPEEDS = { Neutral: 0.25, Happy: 1.0, Surprise: 1.6, Sad: 0.12 };
const SIZES = { Neutral: 1.0, Happy: 1.15, Surprise: 1.5, Sad: 0.8 };

let renderer = null;
let scene = null;
let camera = null;
let points = null;
let raf = 0;
let running = false;
let targetColor = null;
let targetSpeed = SPEEDS.Neutral;
let curSpeed = SPEEDS.Neutral;

function hexToThree(hex) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function makeSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function seedPositions(pos) {
  for (let i = 0; i < COUNT; i++) {
    // Flat disc facing the camera, denser toward the middle.
    const r = 1.9 * Math.sqrt((i * 7919 % 1000) / 1000);
    const th = ((i * 104729) % 1000) / 1000 * Math.PI * 2;
    pos[i * 3] = r * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(th) * 0.75;
    pos[i * 3 + 2] = (((i * 1299709) % 1000) / 1000 - 0.5) * 0.4;
  }
}

const BASE_SIZE = 0.55;

function sizeFor(mood) {
  return BASE_SIZE * (SIZES[mood] || 1.0);
}

// Returns true when the WebGL layer started.
function start(canvas, reducedMotion) {
  if (running) return true;
  let gl = null;
  try {
    gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  } catch {
    gl = null;
  }
  if (!gl) return false;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
  camera.position.set(0, 0, 4.2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xfff2df, 1.2);
  sun.position.set(2.5, 3, 4);
  scene.add(sun);

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  seedPositions(pos);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: hexToThree('#78716c'),
    size: BASE_SIZE,
    map: makeSprite(),
    transparent: true,
    opacity: 0.32,
    sizeAttenuation: true,
    depthWrite: false,
    toneMapped: false,
  });
  points = new THREE.Points(geo, mat);
  scene.add(points);

  targetColor = hexToThree('#78716c');
  running = true;

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  renderer.userData.resize = resize;
  window.addEventListener('resize', resize);
  resize();

  if (reducedMotion) {
    renderer.render(scene, camera);
    return true;
  }

  let last = performance.now();
  const tick = (now) => {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    curSpeed += (targetSpeed - curSpeed) * Math.min(1, dt * 2);
    points.rotation.z += dt * curSpeed * 0.15;
    points.position.y = Math.sin(now / 1600) * 0.08;
    points.material.color.lerp(targetColor, Math.min(1, dt * 2));
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return true;
}

function setMood(name, hue, bpm) {
  targetColor = hexToThree(hue);
  targetSpeed = SPEEDS[name] != null ? SPEEDS[name] : SPEEDS.Neutral;
  const period = ringPeriodMs(bpm);
  if (running && targetSpeed > 0) targetSpeed *= 1000 / Math.max(400, period);
  if (points) {
    points.material.size += (sizeFor(name) - points.material.size) * 0.2;
    if (!raf) renderer.render(scene, camera);
  }
}

function stop() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  if (renderer && renderer.userData.resize) window.removeEventListener('resize', renderer.userData.resize);
  if (scene) {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
  if (renderer) renderer.dispose();
  renderer = scene = camera = points = null;
}

module.exports = { start, setMood, stop };
