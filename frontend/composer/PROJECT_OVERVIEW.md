# Project Overview

This document is the fastest orientation path for future contributors or AI agents working on the Nifty Notes composer.

## Purpose

The composer is a browser-based grand-staff piano editor built with React and VexFlow. It supports notation editing, playback, MusicXML import/export, local composition save/open, and backend-driven PDF export.

## Runtime Shape

- `frontend/composer` owns the interactive editor UI and score rendering.
- `backend/server.mjs` exposes the active import/export/PDF API surface.
- `backend/musicxml.mjs` owns MusicXML normalization and generation.
- The frontend production build in `frontend/composer/dist` is reused by the backend during PDF export jobs.

## Main Frontend Entry Points

- `src/App.tsx`
  - Main application shell, editor state, toolbar flow, VexFlow rendering, playback coordination, import/export handlers, and PDF render mode.
- `src/App.css`
  - Main layout, toolbar, score-stage, dialog, and editor visual styling.
- `src/composer/constants.ts`
  - Shared editing enums and structural types such as toolbar tabs, score items, measures, and note metadata.
- `src/composer/score.ts`
  - Score-domain helpers for timing grids, key logic, transposition, pitch mapping, and measure transformations.
- `src/composer/io.ts`
  - Frontend API client for MusicXML import/export and PDF export.

## Current User Flows

1. `NEW COMPOSITION` resets the editor to a blank default score.
2. `FILE` handles local composition save/open plus MusicXML import/export.
3. Toolbar tabs handle editing modes for notes, articulations, ornaments, dynamics, bars, text, and export.
4. `Play` and metronome controls drive browser-side playback against the current score state.
5. PDF export sends the current score payload to the backend, which launches a headless browser and captures the built frontend output.

## State Ownership Notes

- `App.tsx` is currently the main state container. Expect to find score content, selection, playback flags, popovers, dialogs, and help-card state there.
- `measures` is the core editable score dataset. Most notation mutations flow through helpers that transform this array.
- Layout-sensitive features rely on rendered geometry captured after VexFlow draws the score. Be careful when changing layout containers, width constraints, or system-breaking rules.
- Import mode can use linked grand-staff alignment rules that differ from manual composition defaults. Preserve those flows when touching import/render code.

## Safe Editing Guidance

- If you need to add or remove a toolbar feature, update both `constants.ts` and the tab metadata/render branches in `App.tsx`.
- If you touch score spacing or wrapping, rebuild and re-check:
  - normal editing
  - imported MusicXML alignment
  - hover/preview hit boxes
  - PDF export layout
- If you change import/export payload shape, update both frontend `src/composer/io.ts` and backend `backend/server.mjs` / `backend/musicxml.mjs`.
- Keep README and CHANGELOG in sync when changing user-visible workflows.

## Removed Scope

- The old built-in `Gallery` demo flow is intentionally gone. Do not reintroduce demo-score state or UI unless the product direction changes.

## Verification Baseline

For most frontend-only changes, start with:

```bash
cd frontend/composer
npm run build
```

For import/export or PDF changes, also verify the backend path with the built frontend present in `dist/`.
