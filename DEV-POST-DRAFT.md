---
title: Mira, a living mirror that feels your pulse
published: true
tags: devchallenge, presagechallenge
---

*This is a submission for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-2026-11-04)*

## What I Built

Mira is a living mirror that feels your pulse: your expression sets the mood, your heart rate sets the tempo. A real-time Electron scene where expression picks the tint (Happy warm amber, Surprised bright ember, Sad cool blue, Neutral soft stone), the pulse ring breathes at your heart rate, the wordmark beats with it, and a procedural 3D glow field orbits faster or slower with your BPM. One core flow that works end to end, no login, no dashboard clutter, no medical claims. Built with the Presage SmartSpectra SDK (`@smartspectra/node-sdk` 3.5.0, `PULSE_RATE` plus face metrics only), Electron 43 with koffi FFI, three.js 0.169.0 glow field (no model files, no network).

## Demo

Demo clip (mock signal path driving the identical mirror code, 17s, silent): `electron/demo-mirror.mp4` in the repo. Live-signal video on open hardware is next; the sandbox could not complete pulse model delivery (details under Consent and Data Handling).

Screenshots in `electron/screenshots/`: consent gate, all four moods at 1440, Happy at 390.

## Code

https://github.com/Sketchify-Dev/mira

How to test (no camera or key needed):

```bash
cd electron
npm install
npm run start:mock
```

Click Begin mirror, then Start. Live camera path: `MIRA_API_KEY=your_key_here npm run start` on an open network.

## How It Responds to Human Signals

Two live Presage signals drive the scene through one shared readout path consumed by both the live SDK and a faithful mock source:

- **Expressions** pick mood and tint. The mood map is pure functions (`electron/mirror.js`: expression to name plus hue), testable in plain node, bundled for the sandboxed renderer. 70 soft glow sprites tint by mood hue with eased color transitions.
- **Pulse rate** sets tempo. The ring breathes at the heart's period (`ringPeriodMs`: 60000/BPM), the wordmark beats at the same tempo, the glow field orbits faster when BPM rises.

Integration: main process owns the Node-side SDK session (koffi FFI, no node-gyp) with a headless file harness (lavapipe Vulkan for headless GPUs) for CI; the renderer attaches the same mirror handlers to live or harness events. Missing data never crashes the scene: absent pulse keeps the last BPM, empty expression keeps the last mood, locked by `electron/mirror.fallback.test.js` (4 passing). Low-confidence and no-face states surface in plain words. Camera permission follows the SmartSpectra quickstart exactly (grant media only to the bundled local page, both check and request handlers, no strict `mediaTypes` check).

## Prize Categories

**Most Creative or Delightful Use.** Wellness mirrors either show numbers or play animations; neither feels alive. Mira is the mirror as a living thing: calm when you are calm, bright when you smile, electric when you are surprised. Anti AI slop pass throughout (solid paper background, no gradients, no glow shadows, sentence case), a breathing drift in the glow field, and honest empty states instead of silent failures.

## Consent and Data Handling

- The camera never starts before you press Begin mirror (consent gate, plus an OS-level camera prompt mediated by Electron's permission handlers).
- Frames never leave this device. Nothing is recorded, stored, or sent anywhere.
- No network calls carry video. The SDK verifies the key and loads models online, but video stays local. SDK telemetry is on by default per the SDK (device and SDK details, never frames or vitals); pass `enableTelemetry: false` at SDK construction to turn it off. No optional AI services are used.
- Wellness feedback only, never a medical reading. No diagnosis or treatment claims anywhere in UI, copy, or this post.
- Weak signal states are honest: "No face detected", "Weak signal. Hold still in even light.", "The camera is blocked or denied."
- Verified live behavior: the SDK session reached Running with 160 packets streaming from the file feed, but the pulse model did not provision in the sandbox (native log: local model path unresolvable, remote delivery incomplete; face models resolve locally). Live pulse needs a real camera on an open network where model delivery completes; the fallback above covers all other cases.

## Agent Session

Built with Claude Code. Transcript available on request; key and secrets checked before sharing.
