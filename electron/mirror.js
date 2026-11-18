'use strict';

// Mira mirror mapping (Steps 3+4): pure functions from signal to scene.
// No DOM, no Node APIs: requires cleanly in node for tests and bundles
// for the sandboxed renderer.

const MOODS = {
  Happy: { name: 'Happy', descriptor: 'Bright. Keep smiling.', hue: '#e8a020' },
  Surprise: { name: 'Surprised', descriptor: 'Electric. Something sparked.', hue: '#d9531e' },
  Sad: { name: 'Sad', descriptor: 'Low tide. Take it slow.', hue: '#5b7fa6' },
  Neutral: { name: 'Neutral', descriptor: 'Still water. Breathe easy.', hue: '#78716c' },
};

const LOW_CONFIDENCE = 0.5;

function moodForExpression(expression) {
  return MOODS[expression] || MOODS.Neutral;
}

// Full pulse period in ms, so the ring breathes at the heart's tempo.
function ringPeriodMs(bpm) {
  if (bpm == null || Number.isNaN(bpm) || bpm <= 0) return 1000;
  return Math.round(60000 / bpm);
}

function isLowConfidence(confidence) {
  return confidence == null || confidence < LOW_CONFIDENCE;
}

module.exports = { MOODS, LOW_CONFIDENCE, moodForExpression, ringPeriodMs, isLowConfidence };
