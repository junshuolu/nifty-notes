# Changelog

## 2026-04-14

### PDF Export

- Tightened PDF system cropping so each rendered system is sent to the backend as a raw vertical range instead of a pre-padded range.
- Moved final system padding and crop stabilization into the backend pagination step.
- Added a seam-based non-overlap rule between adjacent systems to reduce cases where part of the next line appears in the previous line.
- Kept PDF pagination system-based rather than measure-based.

## 2026-04-13

### Backend Integration

- Unified MusicXML import, MusicXML export, and PDF export under `backend/server.mjs`.
- Added backend MusicXML helpers in `backend/musicxml.mjs`.
- Replaced the old frontend-only export flow with backend API calls from `src/composer/io.ts`.
- Added backend PDF job handling through `/api/pdf/export` and `/api/pdf/jobs/:id`.
- Switched PDF generation to a backend headless-browser flow that renders the built frontend and returns the final A4 PDF.

### Frontend Integration

- Updated `src/App.tsx` to build a score IO payload for backend import/export APIs.
- Added a PDF render mode driven by the `pdfJob` search parameter.
- Reduced the PDF render page to a score-only layout for backend capture.

## 2026-04-06

### MusicXML and Score Workflow

- Added backend-backed MusicXML import parsing.
- Added backend-backed MusicXML export generation.
- Kept the main score editor and playback flow in the frontend.

## 2026-03-31

### Editor Improvements

- Continued UI and notation editing refinements for articulations, ornaments, dynamics, rests, and gallery demos.
- Improved score layout behavior for dense passages and custom meter groupings.
