'use strict';

// Mira renderer, Steps 3+4: consent gate, mirror scene, empty states.
// One readout path shared by the live SDK and the mock source.

const {
  SmartSpectraSDK,
  ProcessingStatus,
  ValidationCode,
  MetricType,
  faceMetrics,
} = require('@smartspectra/node-sdk/renderer');
const { decodeMetrics } = require('@smartspectra/node-sdk/messages');
const { createMockSignalSource } = require('./mock-signals');
const { moodForExpression, ringPeriodMs, isLowConfidence, isUnknownConfidence } = require('./mirror');
const livingScene = require('./living-scene');

// Key arrives async over IPC (see preload __miraBridge). Resolved once at
// boot; empty string means main has no key configured.
let API_KEY = '';
async function loadApiKey() {
  try {
    const hasBridge = !!(window.__miraBridge && typeof window.__miraBridge.getApiKey === 'function');
    console.info('[mira] bridge present:', hasBridge);
    if (hasBridge) {
      API_KEY = (await window.__miraBridge.getApiKey()) || '';
    }
  } catch (e) {
    console.error('[mira] getApiKey failed:', e);
  }
  console.info('[mira] key channel ready, length:', API_KEY.length);
}
const MOCK = new URLSearchParams(window.location.search).get('mock') === '1';
const HARNESS = new URLSearchParams(window.location.search).get('harness') === '1';
const LOW_CONF_TIMEOUT_MS = 3000;
const RECONNECT_DELAY_MS = 2000;

const $ = (id) => document.getElementById(id);
const els = {
  preview: $('preview'),
  statusBadge: $('status-badge'),
  errorBanner: $('error-banner'),
  errorCode: $('error-code'),
  errorMessage: $('error-message'),
  readoutPulse: $('readout-pulse'),
  readoutExpression: $('readout-expression'),
  btnStart: $('btn-start'),
  btnStop: $('btn-stop'),
  consentGate: $('consent-gate'),
  btnBegin: $('btn-begin'),
  mirror: $('mirror'),
  scene: $('scene'),
  scenePreview: $('scene-preview'),
  pulseRing: $('pulse-ring'),
  moodName: $('mood-name'),
  sceneCanvas: $('scene-canvas'),
  stateLine: $('state-line'),
};

const STATUS_NAMES = Object.fromEntries(
  Object.entries(ProcessingStatus).map(([k, v]) => [v, k.replace(/^k/, '')]),
);
const VALIDATION_NAMES = Object.fromEntries(
  Object.entries(ValidationCode).map(([k, v]) => [v, k.replace(/^k/, '')]),
);

const state = {
  phase: 'gate', // gate | consented | running | reconnecting | error
  sdk: null,
  mockSource: null,
  lastSignalAt: 0,
  lowConfTimer: null,
  reconnectTimer: null,
  lastMood: 'Neutral',
  lastBpm: null,
};

// --- Phase machine: the badge is the single source of truth ---

function setPhase(phase, info) {
  state.phase = phase;
  // Start stays available in consented AND failed: a failed start must
  // never brick the UI : the error banner explains, Start retries.
  els.btnStart.disabled = !(phase === 'consented' || phase === 'failed');
  els.btnStop.disabled = !(phase === 'running' || phase === 'reconnecting');
  els.statusBadge.className = 'status status-' + phaseClass(phase);
  els.statusBadge.textContent = phaseLabel(phase, info);
}

function phaseLabel(phase, info) {
  switch (phase) {
    case 'gate': return 'Waiting for consent';
    case 'consented': return 'Ready';
    case 'running': return info && info.mock ? 'Running (demo signal)' : 'Running';
    case 'reconnecting': return 'Reconnecting.';
    case 'failed': return 'Start failed : try again';
    case 'error': return info && info.code ? `Error: ${info.code}` : 'Error';
    default: return 'Idle';
  }
}

function phaseClass(phase) {
  switch (phase) {
    case 'running': return 'running';
    case 'failed': return 'error';
    case 'error': return 'error';
    case 'reconnecting': return 'starting';
    case 'consented': return 'idle';
    case 'gate':
    default: return 'uninitialized';
  }
}

function showError(code, message) {
  els.errorCode.textContent = code;
  els.errorMessage.textContent = friendlyMessage(code, message);
  els.errorBanner.hidden = false;
}

function hideError() {
  els.errorBanner.hidden = true;
}

function friendlyMessage(code, detail) {
  switch (code) {
    case 'startup/E_CAMERA':
      return `The camera is blocked or denied. Allow camera access for Mira in the browser or OS prompt, then press Start to try again. (${detail})`;
    case 'startup/E_API_KEY':
      return detail || 'The API key is missing or rejected. Check .env, then try again.';
    case 'startup/E_TIMEOUT':
      return 'Startup timed out waiting for the first frame. Check the camera, then press Start again.';
    case 'stream/E_NO_FACE':
    case 'stream/kNoFaceFound':
      return 'No face detected. Center your face in the frame and hold still.';
    case 'stream/E_LOW_SIGNAL':
      return 'Signal is weak. Hold still in even light; readings resume on their own.';
    case 'stream/E_DISCONNECT':
      return 'The video feed dropped. The mirror reconnects automatically.';
    default:
      return detail || 'Something went wrong.';
  }
}

// --- Mirror scene: expression picks mood/color, pulse sets tempo ---

function renderMirror({ bpm, expression, confidence }) {
  const mood = moodForExpression(expression);
  state.lastMood = mood.name;
  if (bpm != null) state.lastBpm = bpm;

  els.readoutPulse.textContent = bpm != null ? String(Math.round(bpm)) : ':';
  els.readoutExpression.textContent = mood.name;
  els.moodName.textContent = mood.name;

  // Tint the scene with the mood hue; ring breathes at the heart's tempo.
  els.scene.style.setProperty('--mood-hue', mood.hue);
  els.pulseRing.style.borderColor = mood.hue;
  livingScene.setMood(mood.name, mood.hue, bpm);
  els.pulseRing.style.animationDuration = `${ringPeriodMs(bpm)}ms`;
  // Wordmark beats at the heart's tempo while live.
  document.body.classList.add('is-live');
  document.body.style.setProperty('--beat-ms', `${ringPeriodMs(bpm)}ms`);

  if (isUnknownConfidence(confidence)) {
    setStateLine('Warming up. The mirror is calibrating to your face.', false);
  } else if (isLowConfidence(confidence)) {
    setStateLine('Weak signal. Hold still in even light.', true);
  } else {
    setStateLine(MOCK ? 'Demo signal. Live camera is off.' : 'Reading your pulse and expression.', false);
  }
}

function setStateLine(text, warn) {
  els.stateLine.textContent = text;
  els.stateLine.classList.toggle('is-warn', !!warn);
}

function resetScene() {
  els.readoutPulse.textContent = '--';
  els.readoutExpression.textContent = '--';
  els.moodName.textContent = '--';
  els.scene.style.removeProperty('--mood-hue');
  els.pulseRing.style.borderColor = '';
  els.pulseRing.style.animationDuration = '';
  livingScene.stop();
  document.body.classList.remove('is-live');
  document.body.style.removeProperty('--beat-ms');
  setStateLine('Press Start to begin.', false);
}

// --- Consent gate: camera never starts before Begin ---

els.btnBegin.addEventListener('click', () => {
  els.consentGate.hidden = true;
  els.mirror.hidden = false;
  setPhase('consented');
  // Start the 3D layer once, the first time the mirror is revealed.
  // Reduced motion gets a single static frame; no WebGL keeps the flat card.
  try {
    livingScene.start(els.sceneCanvas, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    /* flat card fallback */
  }
  els.btnStart.focus();
});

// --- Mock signal source (Step 2) ---

function startMock() {
  hideError();
  setPhase('running', { mock: true });
  setStateLine('Demo signal. Live camera is off.', false);
  els.scenePreview.hidden = true;
  state.mockSource = createMockSignalSource();
  state.mockSource.start((signal) => {
    state.lastSignalAt = Date.now();
    renderMirror(signal);
  });
}

function stopMock() {
  if (state.mockSource) state.mockSource.stop();
  state.mockSource = null;
  els.scenePreview.hidden = false;
  resetScene();
  setPhase('consented');
}

// --- Live SDK path ---

function topExpression(expression) {
  if (!expression) return null;
  const scores = expression.scores || expression.scoresList || [];
  let best = null;
  for (const s of scores) {
    if (!best || (s.confidence ?? 0) > (best.confidence ?? 0)) best = s;
  }
  if (!best) return expression.type != null ? String(expression.type) : null;
  const name = typeof best.type === 'number' ? expressionName(best.type) : String(best.type);
  return name.charAt(0) + name.slice(1).toLowerCase();
}

function expressionName(type) {
  // Matches ExpressionType enum: 1 Angry, 2 Contempt, 3 Disgust, 4 Fear,
  // 5 Happy, 6 Neutral, 7 Sad, 8 Surprise.
  return (
    { 1: 'ANGRY', 2: 'CONTEMPT', 3: 'DISGUST', 4: 'FEAR', 5: 'HAPPY', 6: 'NEUTRAL', 7: 'SAD', 8: 'SURPRISE' }[type] ||
    `TYPE_${type}`
  );
}

function attachMirrorHandlers(sdk) {
  sdk.on('processingStatus', (status) => {
    const label = STATUS_NAMES[status] || `Status(${status})`;
    if (status === ProcessingStatus.kRunning) {
      setPhase('running');
    } else if (status === ProcessingStatus.kError) {
      setPhase('error', { code: label });
    }
  });

  sdk.on('validationStatus', (code, timestampUs, hint) => {
    const name = VALIDATION_NAMES[code] || `Code(${code})`;
    if (code === ValidationCode.kOk) {
      if (state.phase === 'running') setStateLine('Reading your pulse and expression.', false);
      return;
    }
    // No-face and weak-signal states, surfaced honestly with guidance.
    const upper = String(name).toUpperCase();
    if (upper.includes('FACE') || upper.includes('NOFACE') || upper.includes('NO_FACE')) {
      setStateLine('No face detected : center your face in the frame.', true);
      showError('stream/E_NO_FACE', hint || name);
    } else {
      setStateLine('Weak signal. Hold still in even light.', true);
      showError(`stream/${name}`, hint ? `${name}: ${hint}` : name);
    }
  });

  sdk.on('metrics', (buf) => {
    try {
      const metrics = decodeMetrics(buf);
      if (metrics && typeof metrics.byteLength === 'number') return;
      state.lastSignalAt = Date.now();
      hideError();
      const pr = metrics.cardio?.pulseRate?.at(-1)?.value;
      const expr = topExpression(metrics.face?.expression?.at(-1));
      const conf = metrics.face?.expression?.at(-1)?.scores?.[0]?.confidence;
      renderMirror({ bpm: pr ?? state.lastBpm, expression: expr || state.lastMood, confidence: conf });
      armLowConfWatchdog();
    } catch (e) {
      console.error('[mira] failed to decode metrics:', e);
    }
  });

  sdk.on('error', (code, message, retryable) => {
    if (retryable) {
      setPhase('reconnecting');
      showError('stream/E_DISCONNECT', message || String(code));
      scheduleReconnect();
    } else {
      // Terminal SDK error: destroy so the next Start rebuilds clean
      // instead of restarting a dead session (not in a valid state).
      try { state.sdk.stop(); } catch { /* best effort */ }
      try { state.sdk.destroy(); } catch { /* best effort */ }
      state.sdk = null;
      setPhase('failed', { code: String(code) });
      showError(String(code), message);
    }
  });

  sdk.on('streamAvailable', (stream) => {
    els.preview.srcObject = stream;
    els.preview.play().catch(() => {});
    const [track] = stream.getVideoTracks ? stream.getVideoTracks() : [];
    if (track) {
      track.onended = () => {
        if (state.phase === 'running') {
          setPhase('reconnecting');
          showError('stream/E_DISCONNECT', 'Camera track ended.');
          scheduleReconnect();
        }
      };
    }
  });

}


function buildSdk() {
  state.sdk = new SmartSpectraSDK({
    apiKey: API_KEY,
    // Pulse (face rPPG) + expressions only. ARTERIAL_PRESSURE_TRACE and
    // HRV stay out: the bp model fails to init on this box and the session
    // sits in kChestNotVisible on a face-framed feed with them requested.
    requestedMetrics: [MetricType.PULSE_RATE, ...faceMetrics],
    enableAccumulatedOutput: false,
  });

  attachMirrorHandlers(state.sdk);
}

// If metrics stop arriving mid-run, say so instead of freezing silently.
function armLowConfWatchdog() {
  if (state.lowConfTimer) clearTimeout(state.lowConfTimer);
  state.lowConfTimer = setTimeout(() => {
    if (state.phase === 'running' && Date.now() - state.lastSignalAt > LOW_CONF_TIMEOUT_MS) {
      setStateLine('Weak signal. Hold still in even light.', true);
    }
  }, LOW_CONF_TIMEOUT_MS);
}

function scheduleReconnect() {
  if (state.reconnectTimer) return;
  state.reconnectTimer = setTimeout(async () => {
    state.reconnectTimer = null;
    if (state.phase !== 'reconnecting') return;
    try {
      if (state.sdk) await state.sdk.start();
    } catch (err) {
      setPhase('error', { code: String(err.code ?? 'JS') });
      showError(String(err.code ?? 'JS'), err.message);
    }
  }, RECONNECT_DELAY_MS);
}

async function startMeasurement() {
  hideError();
  if (MOCK) {
    startMock();
    return;
  }
  if (!API_KEY) {
    showError('startup/E_API_KEY', `No key reached the app (got ${API_KEY.length} chars). Run with MIRA_API_KEY set, or add it to .env. Mock mode needs no key.`);
    setPhase('failed', { code: 'E_API_KEY' });
    return;
  }
  setPhase('reconnecting'); // "Starting." visual while the SDK spins up
  els.statusBadge.textContent = 'Starting.';
  try {
    if (!HARNESS && !state.sdk) buildSdk();
    if (HARNESS) {
      // Headless harness: main owns a Node-side SDK session fed by useFile
      // (the SDK pumps frames itself with steady timestamps). The renderer
      // never touches captureStream: it loops the same synthetic feed in
      // the preview for visual parity and routes main's forwarded session
      // events into the shared mirror handlers. Listener attached once.
      if (!state.harnessAttached && window.__miraBridge?.onHarnessEvent) {
        state.harnessAttached = true;
        window.__miraBridge.onHarnessEvent((ev) => {
          if (!ev || !state.sdk) return;
          const sdk = state.sdk;
          if (ev.type === 'processingStatus') sdk.emit('processingStatus', ev.status);
          else if (ev.type === 'validationStatus') sdk.emit('validationStatus', ev.code, ev.timestampUs, ev.hint);
          else if (ev.type === 'metrics') sdk.emit('metrics', ev.buf);
          else if (ev.type === 'error') sdk.emit('error', { code: ev.code }, ev.message, ev.retryable);
        });
      }
      // Shim with the start/stop/destroy shape the live path uses, so the
      // stop/reconnect code below works unchanged. No local SDK exists: the
      // real session lives in main.
      const bridge = window.__miraBridge;
      state.harnessHandlers = {};
      state.sdk = {
        on: (event, cb) => { (state.harnessHandlers ||= {})[event] ||= []; state.harnessHandlers[event].push(cb); },
        emit: (event, ...args) => { for (const cb of (state.harnessHandlers?.[event] || [])) { try { cb(...args); } catch (e) { console.error('[mira] harness handler failed:', e); } } },
        start: () => bridge.harnessStart(),
        stop: () => bridge.harnessStop(),
        destroy: () => bridge.harnessStop(),
      };
      // Mirror handlers (status/validation/metrics/error) attach below via
      // buildSdk-style registration: do it here since there is no local SDK.
      attachMirrorHandlers(state.sdk);
      els.preview.src = './harness-face.mp4';
      // NOTE: preview stays mp4; the SDK session reads harness-face.avi.
      els.preview.loop = true;
      els.preview.muted = true;
      els.preview.play().catch(() => {});
      console.info('[mira] harness file session requested from main');
    }
    console.info('[mira] starting SDK, key present:', API_KEY.length > 0);
    await state.sdk.start();
    console.info('[mira] start() resolved, waiting for processingStatus/metrics');
    // Live path: wait for the SDK's 'processingStatus' event to flip us to
    // running; if start() resolved, report what we know so far.
    setStateLine('Camera open : waiting for the first reading.', false);
  } catch (err) {
    const msg = String(err.message || err);
    const network = /timed out|timeout|resolving|network|offline|enotfound|econn/i.test(msg);
    const code = network ? 'startup/E_NETWORK'
      : /already started|start_custom|run_file/i.test(msg) ? 'startup/E_STUCK'
      : /camera|permission|device|notfound|notallowed|overconstrained/i.test(msg) ? 'startup/E_CAMERA'
      : (err.code ?? 'startup/E_TIMEOUT');
    // Tear down the stuck SDK so the next Start begins clean instead of
    // hitting "session already started" forever.
    if (state.sdk) {
      try { state.sdk.stop(); } catch { /* best effort */ }
      try { state.sdk.destroy(); } catch { /* best effort */ }
      state.sdk = null;
    }
    // Key rejected by the service (not merely missing): say so plainly.
    const rejected = /api.?key|unauthor|401|403|forbidden|verification failed|authorization failed/i.test(msg);
    setPhase('failed', { code: String(code) });
    showError(String(code), network
      ? `No route to the Presage backend from this network (DNS resolve timed out). The SDK needs to download models and verify the key online. Retry on an unrestricted network. (${msg.slice(0, 160)})`
      : /already started/i.test(msg)
        ? `The previous session stuck. It has been torn down. Wait 5 seconds, then press Start again.`
      : rejected
        ? `The service rejected this key (key length ${API_KEY.length}). Check it at physiology.presagetech.com, then retry. (${msg})`
        : msg);
    console.error('[mira] start() failed:', err);
  }
}

async function stopMeasurement() {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  if (state.lowConfTimer) {
    clearTimeout(state.lowConfTimer);
    state.lowConfTimer = null;
  }
  if (MOCK) {
    stopMock();
    return;
  }
  try {
    if (state.sdk) await state.sdk.stop();
  } catch (err) {
    console.error('stop() failed:', err);
  }
  els.preview.srcObject = null;
  if (state.sdk) {
    try {
      await state.sdk.destroy();
    } catch {
      /* already destroyed */
    }
    state.sdk = null;
  }
  resetScene();
  setPhase('consented');
}

els.btnStart.addEventListener('click', startMeasurement);
els.btnStop.addEventListener('click', stopMeasurement);
setPhase('gate');
loadApiKey().then(() => {
  // Harness-only autostart for headless CI (no camera involved: the feed is
  // the synthetic file). Pass ?autostart=1 with ?harness=1. Live mode always
  // waits for the consent click.
  const params = new URLSearchParams(window.location.search);
  if (params.get('harness') === '1' && params.get('autostart') === '1') {
    els.btnBegin.click();
    els.btnStart.click();
  }
});
