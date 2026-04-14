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
