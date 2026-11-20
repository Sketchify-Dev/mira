# Mira, a living mirror that feels your pulse

Tagline: your pulse sets the tempo, your expression sets the mood. A living mirror built with the Presage SmartSpectra SDK.

## Inspiration

Wellness mirrors either show numbers or play animations. Neither feels alive. We wanted a mirror that feels your pulse: calm when you are calm, bright when you smile, electric when you are surprised. One core flow that works end to end, no login, no dashboard clutter, no medical claims.

## What it does

Mira reads pulse and facial expression from your camera with the SmartSpectra Node SDK and shapes a real-time scene:

- Expression picks the mood and tint: Happy (warm amber), Surprised (bright ember), Sad (cool blue), Neutral (soft stone)
- Live pulse sets the tempo: the pulse ring breathes at your heart rate, the wordmark beats with it, the 3D glow field orbits faster or slower
- Consent gate first: the camera never starts before you press Begin mirror
- Honest states: no face, weak signal, camera denied, and low confidence are all surfaced in plain words
- Demo mode: `npm run start:mock` runs a faithful signal source (60 to 100 BPM sine, cycling expressions) with no camera or key needed

SmartSpectra tech used: `@smartspectra/node-sdk` 3.5.0, `PULSE_RATE` plus face metrics only, Electron 43 with koffi FFI, main-process file harness with lavapipe Vulkan for headless GPUs.

## How we built it

Stack: Electron 43 + `@smartspectra/node-sdk` in `electron/`, plain HTML/CSS/JS bundled with esbuild, three.js 0.169.0 procedural glow field (no model files, no network).

Key decisions:

- One readout path shared by live SDK and mock source, so the mirror scene consumes one interface
- Mood map is pure functions (`mirror.js`), testable in plain node, bundled for the sandboxed renderer
- 3D layer is 70 soft glow sprites tinted by mood hue, tempo scaled by BPM, reduced-motion gets a single static frame, no WebGL falls back to the flat card
- Anti AI slop pass: solid paper background, no gradients, no glow shadows, no helper subtext, text in sentence case

Camera permission follows the SmartSpectra quickstart exactly: grant media only to the bundled local page, deny everything else. Both `setPermissionCheckHandler` and `setPermissionRequestHandler` are set, with no strict `mediaTypes` check that silently denied video-only requests on some Electron versions.

## Consent and Data Handling

- The camera never starts before you press Begin mirror.
- Frames never leave this device. Nothing is recorded, stored, or sent anywhere.
- No network calls carry video. The SDK verifies the key and loads models online, but video stays local.
- Wellness feedback only, never a medical reading. No diagnosis or treatment claims anywhere in UI, copy, or this post.
- Weak signal states are honest: "No face detected", "Weak signal. Hold still in even light.", "The camera is blocked or denied."

## Challenges we ran into

- Sandbox DNS initially had no route to the Presage backend; the SDK session still reached Running with 100+ packets streaming (face landmarks from local models) while the pulse model awaited pairing. Backend is reachable again (HTTPS 403 on root as expected). Live retry streamed 160 packets with the session Running to EOF, but the pulse model did not provision: the native log shows its model path unresolvable locally with remote delivery not completing, while face models resolve locally. Live pulse needs a real camera on an open network where model delivery completes; until then the renderer fallback (last BPM, last mood, honest signal copy) covers it, locked by a node test (`electron/mirror.fallback.test.js`, 4 passing). The demo clip and screenshots use the mock signal path, which drives the identical mirror code.
- Offscreen capture flaked with UnknownVizError on visible windows; fixed by capturing offscreen and polling the mood label instead of wall-clock timing.
- Particles first rendered as grey dust on the pale card; reworked to 70 large soft glows with a breathing drift so the field reads as light, not dirt.

## How to Test

```bash
cd electron
npm install
npm run start:mock
```

Click Begin mirror, then Start. The mirror cycles Neutral, Happy, Surprised, Sad with a demo pulse. Live camera path: `MIRA_API_KEY=your_key_here npm run start` on an open network.

Screenshots: `electron/screenshots/` (consent gate, all four moods at 1440, Happy at 390). Clip: `electron/demo-mirror.mp4` (17s, silent H.264).

Repo: https://github.com/Sketchify-Dev/mira

## What is next

Live-signal demo video on open hardware, packaged builds per OS with the native closure, and one more mood axis (calm to energized) driven by pulse variability without any medical interpretation.
