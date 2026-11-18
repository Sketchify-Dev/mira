'use strict';

// Mira mock signal source (Step 2): a faithful stand-in for the live
// SmartSpectra SDK stream. Emits { bpm, expression, confidence } at 2 Hz
// through the same updateReadouts() path the live SDK uses, so the mirror
// scene in Step 3 can consume one interface for both.
//
// Pure functions (bpmAt, expressionAt, confidenceAt) are exported for
// tests; the timer driver is the only impure part. No Node APIs here:
// this file bundles for the sandboxed renderer and requires cleanly in
// plain node.

const MOCK_EXPRESSIONS = ['Neutral', 'Happy', 'Surprise', 'Sad'];
const EXPRESSION_PERIOD_S = 4;
const TICK_MS = 500;

// Sine sweep across the full 60-100 BPM band (period ~38s).
function bpmAt(tSeconds) {
  return Math.round(80 + 20 * Math.sin(tSeconds / 6));
}

// Cycle the four expressions, 4s each, in order.
function expressionAt(tSeconds) {
  return MOCK_EXPRESSIONS[Math.floor(tSeconds / EXPRESSION_PERIOD_S) % MOCK_EXPRESSIONS.length];
}

// High, gently varying confidence so Step 3 can exercise its
// high-confidence path end to end on mock data.
function confidenceAt(tSeconds) {
  return 0.9 + 0.05 * Math.sin(tSeconds / 2.3);
}

function createMockSignalSource() {
  let timer = null;
  return {
    start(onSignal) {
      const t0 = Date.now();
      const emit = () => {
        const t = (Date.now() - t0) / 1000;
        onSignal({ bpm: bpmAt(t), expression: expressionAt(t), confidence: confidenceAt(t), t });
      };
      emit();
      timer = setInterval(emit, TICK_MS);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

module.exports = {
  createMockSignalSource,
  bpmAt,
  expressionAt,
  confidenceAt,
  MOCK_EXPRESSIONS,
  EXPRESSION_PERIOD_S,
  TICK_MS,
};
