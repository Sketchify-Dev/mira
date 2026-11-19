'use strict';
// Fallback contract: ABSENT cardio / empty expressions must not crash the
// mirror or clear the last reading. Pure logic, runs in plain node.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { moodForExpression, ringPeriodMs } = require('./mirror');

// Mirrors renderer.renderMirror's null-tolerant extraction.
function extract(signal, last) {
  const mood = moodForExpression(signal.expression);
  const bpm = signal.bpm != null ? signal.bpm : last.bpm;
  const name = signal.expression || last.mood;
  return { bpm, name, hue: mood.hue, period: ringPeriodMs(bpm) };
}

test('ABSENT cardio keeps last BPM', () => {
  const r = extract({ bpm: undefined, expression: 'Happy' }, { bpm: 72, mood: 'Neutral' });
  assert.equal(r.bpm, 72);
  assert.equal(r.name, 'Happy');
  assert.equal(r.period, ringPeriodMs(72));
});

test('empty expression keeps last mood', () => {
  const r = extract({ bpm: 80, expression: undefined }, { bpm: 72, mood: 'Sad' });
  assert.equal(r.bpm, 80);
  assert.equal(r.name, 'Sad');
});

test('both absent keeps everything', () => {
  const r = extract({}, { bpm: 65, mood: 'Neutral' });
  assert.equal(r.bpm, 65);
  assert.equal(r.name, 'Neutral');
});

test('unknown expression maps to Neutral', () => {
  assert.equal(moodForExpression('Blinking').name, 'Neutral');
  assert.equal(moodForExpression(undefined).name, 'Neutral');
});
