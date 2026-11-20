# Live-signal video runbook (open hardware)

No camera exists in the build sandbox, so this runs on your machine with a webcam, on an open network where the Presage backend is reachable.

## What you need

- Webcam, even indoor light, face centered in frame
- Open network (the pulse model downloads on first run)
- Key in `electron/.env`: `MIRA_API_KEY=your_key_here` (gitignored, never commit it)

## Steps

```bash
cd electron
npm install
MIRA_API_KEY=your_key_here npm run start
```

1. Click **Begin mirror** (consent gate clears, camera starts).
2. Click **Start**. Watch the state line: it should move from "Camera open: waiting for the first reading." to "Reading your pulse and expression."
3. Hold still, face centered, even light. Within ~10s you should see a BPM number and an expression label.
4. Change expression (smile, widen eyes, relax). The mood label, card tint, and glow field should follow within ~2s.
5. Record 30 to 60s with a screen recorder (phone on a tripod aimed at the screen also works and avoids recorder overhead). Keep it silent or strip audio after.

## What good looks like

- BPM in a plausible resting range, ring tempo matching it
- Mood changes track your face, color eases (not snaps) between tints
- No error banner; if one appears, read it verbatim into the video notes

## If it fails

- `E_API_KEY`: key missing or rejected. Check `.env`, verify at physiology.presagetech.com.
- `E_NETWORK`: backend unreachable from that network. Retry on a different network.
- `E_CAMERA`: OS denied the camera. Allow it in the OS prompt, press Start again.
- Weak signal / no face: more light, face centered, hold still.

## After recording

1. Upload to YouTube (unlisted is fine) or attach the file to the repo release.
2. Edit the DEV post Demo section: replace the mock-clip note with the video embed/link. `https://dev.to/sketchify/mira-a-living-mirror-that-feels-your-pulse-pl7`
3. Optional: record the same flow in mock mode side by side to show parity.
