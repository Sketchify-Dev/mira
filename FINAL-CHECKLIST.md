# Mira final checklist (Nov 22, 11:59 PM PST)

## Done (verified)

- [x] Electron app builds from fresh clone (`npm install`, `npm run build`)
- [x] Mock flow runs end to end (Begin, Start, moods cycle, BPM animates)
- [x] 3D glow field: mood tint, BPM tempo, reduced-motion frame, no-WebGL fallback
- [x] Camera permission matches SDK quickstart (check + request handlers)
- [x] Fallback test locked: `electron/mirror.fallback.test.js` (4 pass)
- [x] No em/en dashes in code, UI, README, PLAN, DEV drafts
- [x] No diagnosis or treatment claims anywhere (disclaimer lines only)
- [x] README: How to Test first, Consent and Data Handling, judge checklist
- [x] Screenshots: consent + 4 moods at 1440, Happy at 390
- [x] Demo clip: `electron/demo-mirror.mp4` (17s, silent H.264)
- [x] Repo public: https://github.com/Sketchify-Dev/mira
- [x] DEV post published with challenge template + tags: https://dev.to/sketchify/mira-a-living-mirror-that-feels-your-pulse-pl7

## Needs you (open hardware or editor)

- [ ] Live-signal video (30-60s, webcam, open network): follow `LIVE-VIDEO-RUNBOOK.md`, then embed in DEV post Demo section
- [ ] DEV cover image: open the post in the DEV editor, drag `electron/screenshots/mood-happy-1440.png` into the cover slot (API rejects external URLs)
- [ ] (Optional) Agent session embed: upload transcript at https://dev.to/agent_sessions/new, set Make Public, embed in the post's Agent Session section. Check for keys first.

## Judge path (paste-ready)

```bash
git clone https://github.com/Sketchify-Dev/mira && cd mira/electron && npm install && npm run start:mock
```

Click Begin mirror, then Start.
