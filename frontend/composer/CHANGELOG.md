# Changelog

## 2026-04-15

### Frontend Terminology and Key-Signature Labelling

- Switched note-value labels to Australian-first terminology with American names in parentheses, e.g. Crotchet (Quarter Note) and Minim (Half Note).
- Fixed duration-label lookup so dotted values and cursor previews resolve the correct label/class instead of falling back to the wrong base duration.
- Added explicit key-signature name metadata so the UI can show the accidental pattern together with the named major/minor pair.
- Updated key-signature picker buttons and front-of-score hotspots with clearer hover titles and current-key context.
- Standardized the visible bar-management copy to Measure / Measures across the toolbar, sidebar, and status text.
- Clarified in the manual key-signature change flow that existing notes are not auto-transposed when the signature changes.

## 2026-04-14

### Frontend Interaction Fixes

- Fixed chord-hover note preview alignment so the blue pending note follows the actual clicked note span instead of drifting to the note on the right.
- Reworked score-front key-signature and time-signature hotspots to follow the rendered VexFlow front modifiers instead of relying on fixed left offsets.
- Corrected score-front popover anchoring so the picker opens from the clicked front symbol and key-signature popovers use the wider key layout width.
- Added system-start measure numbers so each rendered line shows the current bar index at its left edge.
- Updated key signatures to render at the start of every visible system instead of only the first line.
- Added a dark natural-sign placeholder for `C` key at each system start so the key-signature insertion target remains visible even when the score has no sharps or flats.

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

## 2026-04-15

### Key-Aware Pitch Logic

- Wired the current key signature into score rendering, pitch labels, preview audio, playback scheduling, tie validation, and measure normalization.
- Updated note rendering so key-signature-default sharps/flats are interpreted as sounding pitches rather than treated as display-only metadata.
- Preserved the existing insert-note and placeholder-rest workflow while making the resulting notes key-aware.

### Key Change and Transposition

- Added a key-signature popover toggle that lets the user choose whether changing key should transpose existing notes or only respell them for the new key.
- Implemented rewrite-only key changes that preserve sounding pitch while adjusting accidentals for the new signature.
- Implemented score transposition on key change so existing notes, playback, and exported pitch spelling all move into the selected target key together.

### MusicXML Export

- Updated frontend and backend MusicXML export paths so `<alter>` and `<accidental>` are generated from the effective pitch under the current key signature.
- Updated tie-stop detection during export to compare effective sounding pitches rather than raw stored pitch tokens.

### Layout Simplification

- Removed the visible left-hand information cards from the active UI so the composing surface now owns the centre of the page.
- Switched the main workspace to a centred score stage instead of a wide two-column layout.
- Limited each rendered system to at most four bars and stopped stretching short systems to fill very wide monitors.
- Added a responsive compression rule so bars can tighten slightly before wrapping onto the next line.
- Renamed the visible `Measures` toolbar tab and `+ Measure / - Measure` controls to `Bars` and `+ Bar / - Bar`.

### Wrapped-Bar Stability

- Fixed a hover-triggered reflow bug where wrapped systems could jump back to the previous line while arming note insertion.
- Decoupled system breaking from placeholder hover focus so mouse movement no longer changes line wrapping once the score layout is established.

### System Edge Alignment

- Restored per-system right-edge alignment inside the new centred score paper.
- Systems now expand or compress within the fixed paper width so lines with three bars still end on the same right boundary as lines with four bars.
- Kept the capped centred page width, so this alignment does not revert to the earlier full-browser stretching behaviour.

## 2026-03-31

### Editor Improvements

- Continued UI and notation editing refinements for articulations, ornaments, dynamics, rests, and gallery demos.
- Improved score layout behavior for dense passages and custom meter groupings.

## 2026-04-15

### Note Insertion Interaction Refresh

- Changed note insertion so hovering a rest slot no longer immediately expands placeholder rests or shows the blue armed preview.
- Note mode now uses an explicit two-step arm flow: click a rest group once to arm insertion, then click again to place the note.
- When a rest group is armed, the insertion target snaps to the left-most available slot inside that beat group instead of staying on the exact horizontal point that was clicked.
- Armed note previews now keep their horizontal anchor stable after insertion because the preview X/Y is derived from the latest rendered hit-box geometry instead of stale stored coordinates.

### Progressive 16th / 32nd Rest Decomposition

- Added a progressive placeholder-rest planner for power-of-two beat groups so dense insertions unfold from left to right instead of exploding the whole beat into tiny rests at once.
- Semi-quaver (16th-note) insertion now stages empty quarter-beat space as `16th + 16th + 8th`, then promotes the remaining 8th into `16th + 16th` only when the left pair has been used.
- Demisemiquaver (32nd-note) insertion now stages empty quarter-beat space as `32nd + 32nd + 16th + 8th`, then progressively refines the remaining 16th and 8th only after the earlier 32nds have been consumed.
- After each inserted 16th/32nd note, the next left-most available slot in the same beat group stays armed automatically so students can continue filling the pattern without re-hovering the rest.

### Verification

- `frontend/composer`: `npm run build`
- Local Playwright checks confirmed:
  - no armed preview/rest decomposition appears on hover before the first click
  - first click arms the left-most slot in the chosen beat group
  - after inserting a 16th or 32nd note, the next slot in the same group stays armed and the progressive rest breakdown continues

