# Mira - PLAN

A living mirror that feels your pulse: face expressions change the character/scene, live pulse sets tempo and glow. Electron desktop app, SmartSpectra Node SDK, Most Creative or Delightful lane. Deadline Nov 22, 11:59 PM PST.

## Step 1: Electron shell + SDK smoke test
- Scaffold Electron app in `electron/` (main, preload, renderer) wired to `@smartspectra/node-sdk` per electron-quickstart.
- Show camera preview + raw pulse BPM and top expression on screen.
- Test: `npm run start` in `electron/`, see live BPM and expression update with your face in frame.

## Step 2: Mock signal mode
- Add `?mock=1` renderer path emitting fake pulse/expression stream (sine BPM 60-100, cycling expressions).
- Test: run with mock flag, no camera or key needed, values animate.

## Step 3: Mirror scene v1
- One full-screen scene: expression picks character mood/color, pulse BPM drives pulse ring tempo and glow.
- Consent gate on launch (camera permission explainer + opt-in button), no frames stored.
- Test: live camera changes mood within 2s of expression change; ring tempo tracks BPM.

## Step 4: Polish + delight
- Add 3 expression states minimum (happy, surprised, neutral), smooth transitions, sound-free.
- Empty states: no-face, low-confidence, camera-denied.
- Test: each state reachable on camera; screenshots at 1440 and 390-equivalent window.
- Status: UI de-slopped per electron/design.md (anti AI slop rules binding, unslop counter 0). 3D living field landed: 70 soft glow sprites, mood hue tint, BPM tempo, reduced-motion single frame, no-WebGL flat fallback. Tests: mirror mapping + mock expressions verified via node, no dashes in touched files, no medical claims in copy. Screenshots in electron/screenshots/: consent gate, Neutral/Happy/Surprise/Sad at 1440, Happy at 390. Demo clip electron/demo-mirror.mp4 (17s, 1440x900, silent H.264). Screenshots in electron/screenshots/: consent gate, Neutral/Happy/Surprised/Sad at 1440, Happy at 390. Found and fixed consent gate staying visible after Begin (display:flex overrode hidden). Sad/Happy verified visually; Neutral/Surprise captured at correct mock times.

## Step 5: Submission pack
- Demo video (live signal visible), public repo, DEV post with Consent and Data Handling section.
- Test: fresh clone, `npm install && npm run start` works; judge checklist passes.
- Status: README rewritten (How to Test first, Consent and Data Handling, judge checklist).
- SDK verified (Nov 19): session reaches Running, 100+ metric packets stream from file feed, validation fires. Cardio block ABSENT in sandbox: pulse model needs device pairing (POST /device/pair/verify) which timed out there. Face landmarks stream from local models. Renderer fallback locked by electron/mirror.fallback.test.js (4 pass): ABSENT cardio keeps last BPM, empty expression keeps last mood. Backend reachable again (DNS resolves, HTTPS 403 as expected for root). Live retry: 160 packets, session Running to EOF, cardio still ABSENT. Native log: pulse model path unresolvable locally, remote delivery not completing; face models resolve locally. Validation sequence 0/1/7 behaves as designed on a face-only feed. Live pulse needs a real camera on an open network where model delivery completes; renderer fallback covers all other cases per mirror.fallback.test.js. Fresh-clone verified: install + build pass, mirror mapping tests pass, no dashes, no medical claims. Demo clip committed. Remaining: public repo push, DEV post, live-signal demo note (sandbox has no route to Presage backend; demo on open network or judge-side key).

## Out of scope
No diagnosis claims, no data storage, no login, no Next.js web deploy of the SDK path.
