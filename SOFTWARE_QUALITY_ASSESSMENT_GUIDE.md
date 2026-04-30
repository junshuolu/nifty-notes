# COMP[39]900 26T1 Software Quality Assessment Guide

This guide is the tester-facing installation, quality, and testing note for Nifty Notes.

## System Summary

Nifty Notes is a browser-based React and VexFlow piano score editor with a Node.js backend. The delivered system supports:

- Grand staff score editing for treble and bass staves.
- Notes, rests, chords, ties, slurs, articulations, ornaments, dynamics, lyrics, key signatures, time signatures, bars, tempo, playback, and metronome support.
- Local composition save and reopen.
- Backend MusicXML import and export.
- Backend PDF export with headless-browser rendering and A4 pagination.
- A deployed instance at `http://8.210.93.101:3001/`.

The main code implemented by the team is in `frontend/composer/src`, `backend/server.mjs`, and `backend/musicxml.mjs`. External libraries such as React, VexFlow, Tone.js, Puppeteer, and xmldom are dependencies and are not claimed as team-authored work.

## Requirements

- Node.js 20 or newer.
- npm.
- Chrome, Chromium, or Microsoft Edge installed locally.

The backend PDF export uses `puppeteer-core`, so it needs a real browser executable. If the browser is not in a standard install location, set:

```bash
CHROME_EXECUTABLE_PATH=/absolute/path/to/chrome
```

On Windows PowerShell, if `npm` is blocked by script execution policy, use `npm.cmd` instead of `npm`.

## Installation

Install frontend dependencies:

```bash
cd frontend/composer
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
```

## Run Locally

For development, start both servers:

```bash
cd backend
npm start
```

```bash
cd frontend/composer
npm run dev
```

Default local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://127.0.0.1:8787
```

For production-style PDF export, build the frontend first because the backend reads `frontend/composer/dist`:

```bash
cd frontend/composer
npm run build
```

Then run:

```bash
cd backend
npm start
```

The backend serves the built frontend and `/api/*` routes from one process.

## Why Docker Is Not Used

We did not provide a Docker container for the final submission. The main reason is that the system's PDF export and core user experience depend on a real browser environment:

- Backend PDF export launches Chrome, Chromium, or Edge through `puppeteer-core`.
- Correct PDF output depends on browser font rendering, Bravura music font availability, SVG layout, and headless-browser behavior.
- The assessed frontend workflow includes local file upload/download, browser audio playback through Tone.js, pointer-based score editing, and visual inspection of VexFlow SVG output.
- Containerising only the backend would still require bundling and configuring Chromium, fonts, sandbox flags, and file permissions, while not meaningfully validating the audio and browser UX parts of the project.

For this reason, the recommended assessment arrangement is either:

- Test the live deployment at `http://8.210.93.101:3001/`, or
- Run the system locally using the Node.js instructions above with Chrome, Chromium, or Edge installed.

If a Docker waiver or alternative testing arrangement is required, this guide is the proposed alternative installation manual. The backend could be containerised later, but the current submitted system is intentionally documented for direct Node.js and browser-based testing to match how the application is used.

## Automated Tests

Automated tests have been added for deterministic logic where assertions are stable and useful.

### Backend Tests

Run:

```bash
cd backend
npm test
```

Coverage:

- Safe filename generation for exported `.musicxml` and `.pdf` files.
- MusicXML import of metadata, key signature, time signature, tempo, chords, lyrics, dynamics, and two-staff rests.
- Sad-case MusicXML import errors for unsupported or malformed input.
- MusicXML export of key-aware accidentals and tie start/stop notation.

### Frontend Score Logic Tests

Run:

```bash
cd frontend/composer
npm test
```

Coverage:

- Compound time-signature grouping and invalid denominator fallback.
- Subdivision snapping inside a measure.
- Key-aware pitch spelling, implicit accidentals, explicit naturals, and Tone.js pitch conversion.
- Rewrite-only key-signature changes and transposition.
- Tie validation and playback segment merging.

The frontend test runner intentionally avoids Vitest or browser automation so it can run in restricted marking environments. It uses the existing TypeScript dependency to compile `constants.ts` and `score.ts` into a temporary test output directory, runs Node assertions, then removes the temporary files.

## Quality Checks

Recommended commands before submission:

```bash
cd frontend/composer
npm test
npm run lint
npx tsc -b
npm run build
```

```bash
cd backend
npm test
```

Troubleshooting note: in some restricted Windows or sandboxed environments, Vite can fail while starting esbuild with `spawn EPERM`. That indicates a local child-process policy issue. On a normal development machine, run the full `npm run build` command before PDF-export testing.

`npm run lint` currently exits successfully with two React Hook dependency warnings in `src/App.tsx`. These warnings should be reviewed before future refactors, but they are not new test or documentation failures.

## Manual Test Plan

Some important behavior is visual, audio-based, or browser-environment dependent, so it is better assessed manually:

1. Open the application and confirm the score editor loads without console errors.
2. Create a new composition and add notes/rests on treble and bass staves.
3. Verify the two-click note insertion flow and progressive 16th/32nd rest breakdown.
4. Add and remove a chord note, then confirm the preview aligns with the selected notehead.
5. Change key signatures with and without transposition, then check notation and playback pitch.
6. Change time signatures and custom groupings, then confirm bars are trimmed or grouped correctly.
7. Add articulations, ornaments, dynamics, lyrics, ties, and slurs.
8. Use playback and metronome controls, including a changed tempo on a later bar.
9. Save a local composition and reopen it.
10. Import a MusicXML file and check treble/bass alignment, lyrics, tempo, and key signature.
11. Export MusicXML and re-import it to check round-trip preservation of supported notation.
12. Export PDF and inspect page headers, system breaks, cropping, final bars, and dense notation.
13. Resize the browser and confirm the score surface remains usable.
14. Test invalid inputs such as malformed MusicXML and missing Chrome for PDF export, and confirm clear error messages.

Manual testing is especially important for:

- VexFlow SVG geometry and hit boxes.
- PDF page cropping and font rendering.
- Audio playback.
- File picker and download behavior.
- Pointer interactions on the score surface.

## Known Limitations

- PDF pagination and cropping still need careful visual checking for dense scores and very tight spacing.
- PDF export depends on an installed Chrome, Chromium, or Edge executable.
- Browser audio playback depends on the user's browser audio policy and device output.
- The frontend editor is state-heavy in `App.tsx`; future maintainers should consider extracting more interaction logic into isolated modules to expand automated coverage.

## Submission Checklist

- Include `README.md`, `PROJECT_OVERVIEW.md`, `CHANGELOG.md`, and this guide.
- Include `backend/` source files and `backend/package-lock.json`.
- Include `frontend/composer/` source files, assets, fonts, and `package-lock.json`.
- Exclude `node_modules`, `.npm-cache`, and other generated dependency caches from the submission zip.
- Build `frontend/composer/dist` before final production-style backend testing if PDF export will be tested locally from the backend.
- Submit a PDF copy of the installation manual. This guide can be exported to PDF.
