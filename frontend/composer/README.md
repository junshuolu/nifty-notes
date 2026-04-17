# Nifty Notes

Nifty Notes is a React + VexFlow piano score editor for grand staff composition, playback, MusicXML interchange, and PDF export.

## Overview

The editor runs in the browser, while import/export services are now unified in the backend.

- MusicXML import: frontend uploads XML, backend parses it, frontend applies the returned score payload.
- MusicXML export: frontend sends the current score payload, backend generates `.musicxml`.
- PDF export: frontend sends the current score payload, backend launches a headless browser, renders the score page, paginates by system, and returns a downloadable PDF.

## Current Features

- Grand staff score editing with treble and bass staves
- Note, rest, tie, slur, articulation, ornament, lyric, and dynamic editing
- Time signature changes, custom grouping, bar tempo, and metronome playback
- Built-in gallery demos
- MusicXML import through backend parsing
- MusicXML export through backend generation
- Backend PDF export with A4 pagination

## Project Structure

```text
backend/
  musicxml.mjs        MusicXML parse/generate helpers
  server.mjs          Backend API and PDF export server

frontend/composer/
  src/App.tsx         Main UI, VexFlow rendering, PDF render mode
  src/composer/io.ts  Frontend API calls for import/export
  dist/               Frontend production build used by backend PDF export
```

## Requirements

- Node.js 20+
- A local Chrome or Edge installation

Backend PDF export looks for Chrome or Edge in standard Windows install paths. If your browser is installed elsewhere, set `CHROME_EXECUTABLE_PATH`.

## Install

Frontend:

```bash
cd frontend/composer
npm install
```

Backend:

```bash
cd backend
npm install
```

## Run Locally

Start the backend:

```bash
cd backend
npm start
```

Start the frontend dev server:

```bash
cd frontend/composer
npm run dev
```

Default local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://127.0.0.1:8787
```

## Important PDF Note

Backend PDF export uses the built frontend bundle in `frontend/composer/dist`.

If you change score rendering, layout, or PDF render mode code, rebuild the frontend before exporting PDF:

```bash
cd frontend/composer
npm run build
```

## Backend API

- `POST /api/musicxml/import`
  - Input: `{ "xml": "<musicxml>" }`
  - Output: normalized score payload for the editor

- `POST /api/musicxml/export`
  - Input: current score payload
  - Output: downloadable `.musicxml`

- `POST /api/pdf/export`
  - Input: `{ filename, payload }`
  - Output: downloadable `.pdf`

- `GET /api/pdf/jobs/:id`
  - Internal endpoint used by the PDF render page

## PDF Export Design

The current PDF flow is backend-driven:

1. Frontend sends the current score payload to `/api/pdf/export`.
2. Backend stores a temporary PDF job.
3. Backend opens the built frontend page with `?pdfJob=...`.
4. Frontend renders a minimal score-only page for PDF capture.
5. Frontend reports per-system vertical bounds.
6. Backend packs systems onto A4 pages and generates the final PDF with `page.pdf()`.

The pagination logic is system-based rather than measure-based.

## Development Notes

- `frontend/composer/server/musicxml-import-server.cjs` is legacy and no longer part of the active runtime.
- The active backend entry is `backend/server.mjs`.
- The active MusicXML implementation lives in `backend/musicxml.mjs`.

## Latest Frontend Editing Fixes

- Chord insertion hover now aligns with the actual selected note slot, which avoids the visual drift that previously appeared on the note to the right.
- Score-front key-signature and time-signature click zones now track the rendered stave modifiers instead of using fixed horizontal guesses.
- Score-front popovers now anchor from the clicked symbol, and system-start measure numbers are rendered at the left edge of each line for long scores.

## Build

Frontend build:

```bash
cd frontend/composer
npm run build
```

Backend helper script to rebuild frontend:

```bash
cd backend
npm run build:frontend
```

## Known Limitations

- PDF pagination and cropping are still being tuned for edge cases like dense notation and very tight inter-system spacing.
- PDF export depends on a local Chrome or Edge executable being available to the backend.
- The backend serves the built frontend for PDF jobs, so stale `dist/` output can cause old PDF behavior if the frontend was changed but not rebuilt.

## Latest Terminology and Key-Signature Updates

- Note-value labels now use Australian terminology first, with the American name in parentheses for clarity, e.g. Crotchet (Quarter Note) and Dotted Minim (Dotted Half Note).
- Key-signature summaries now include the rendered accidental pattern plus the named major/minor pair, e.g. a four-sharp pattern with E Major / C# Minor.
- Key-signature chooser buttons now expose descriptive hover text such as Set E Major / C# Minor key signature (4#).
- The score-front hotspot also reports the current key-signature name, not just the clickable area.
- Manual key-signature changes do not currently transpose existing notes; they only update the displayed signature and related labels.

## Latest Key-Aware Playback and Transposition

- The active key signature now affects note spelling, playback pitch, preview pitch, tie validation, and exported MusicXML pitch data.
- Notes that are implied by the key signature now sound correctly even when they do not carry an explicit accidental in the stored note data.
- The key-signature popover now includes a `Transpose existing notes when changing key` toggle.
- With the toggle off, changing key preserves the sounding notes and respells accidentals for the new signature.
- With the toggle on, changing key transposes the existing composition into the selected target key and updates playback/export accordingly.

## Latest Layout Simplification

- The left-side Selection Help, Status, Selection, and Score cards are no longer part of the visible editing layout.
- The composing surface is now centered on the page, with the score stage capped to a narrower reading width for large monitors.
- Each system now targets a maximum of four bars per line.
- Systems no longer expand to fill the entire viewport width; instead they stay compact, can compress slightly, and wrap sooner when space gets tight.
- Within that capped score paper, each system now still aligns to the same right edge, so a three-bar line ends flush with a four-bar line.
- The visible toolbar wording now uses `Bars`, `+ Bar`, and `- Bar`.
- Wrapped systems now keep a stable line break while hovering for note insertion; hover focus no longer causes bars to jump between lines.

## Latest Note-Insertion Flow

- Note insertion no longer previews on plain hover. Moving the mouse across an empty rest slot does not expand placeholder rests or show the armed blue preview until the first click happens.
- The note workflow is now explicitly two-step:
  - first click: arm the chosen beat group
  - second click: place the note
- Once armed, the blue droplet and preview note are pinned to the left-most available slot in that beat group. This makes the fill order deterministic for students even if the first click landed later in the rest area.
- After a note is inserted, the next left-most available slot in the same beat group stays armed automatically so repeated insertions can continue without re-hovering.

## Latest Progressive Rest Breakdown

- Semi-quaver (16th-note) entry now unfolds a quarter-beat rest as `16th + 16th + 8th`.
- After the first two 16th-note insertions have been used, the remaining 8th rest is automatically refined into the final two 16th rests.
- Demisemiquaver (32nd-note) entry now unfolds a quarter-beat rest as `32nd + 32nd + 16th + 8th`.
- As the earlier 32nd-note slots are consumed, the remaining 16th rest and later the remaining 8th rest are progressively refined, so the notation stays readable instead of showing every 32nd rest up front.
- This progressive planner currently applies to power-of-two beat groups, which covers the simple-meter teaching cases that motivated the change.
