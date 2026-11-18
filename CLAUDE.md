# CLAUDE.md - Mira (Presage SmartSpectra Challenge)

## Stack
- Electron 43 + `@smartspectra/node-sdk` (koffi FFI, no node-gyp) in `electron/`
- Renderer: plain HTML/CSS/JS bundled with esbuild (mirrors electron-quickstart)
- Existing Next.js app in `app/` is out of scope for the SDK path; keep it building

## Commands
- `cd electron && npm install` (pulls per-platform native runtimes, a few hundred MB, expected)
- `cd electron && npm run start` (builds renderer, launches Electron)
- Mock mode: launch with `?mock=1` (no camera or key needed)

## Rules
- Follow global build loop: one PLAN.md step at a time, run tests, show diff.
- No code until PLAN.md exists (done). No step N+1 until step N test passes.
- Camera frames never leave the device; no storage, no network calls with video.
- No diagnosis or treatment claims anywhere in UI, copy, or submission.
- Consent gate before camera starts; surface SDK low-confidence states honestly.
- Keep Next.js AGENTS.md block intact; commit it with work to keep tree clean.
