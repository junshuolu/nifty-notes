# Changelog

## 2026-04-22

### Title Placeholder Copy Update

- Replaced the default empty score-title placeholder text `No title provided` with `ADD TITLE` so students have a clearer prompt when naming a song.

### Verification

- `frontend/composer`: `npm run build`

## 2026-04-19

### Sidebar Mascot and Brand Logo Adjustment

- Moved the rainbow parrot from the top-bar brand area into a fixed-position sidebar mascot on the left margin of the page.
- The parrot is now vertically centred in the viewport and stays in place regardless of score scrolling (`position: fixed`).
- The parrot scales with the viewport width via `clamp(140px, 14vw, 280px)` so it grows and shrinks naturally with page zoom.
- The mascot is hidden on viewports narrower than 1320 px where the left margin would be too narrow.
- Added a gentle entrance animation and continuous floating animation to the mascot.
- Adjusted the Nifty Notes brand logo `min-width` to avoid over-stretching the image.
- To change the parrot size in the future, edit the `width` property in the `.sidebar-mascot` rule at the bottom of `App.css`.

### Verification

- `frontend/composer`: `npm run build`

## 2026-04-18

### Gallery Removal and Documentation Refresh

- Removed the composer `Gallery` tab, its help text, and its demo-piece loading branch from the active toolbar workflow.
- Removed the two bundled gallery demo score sources so the editor no longer carries unused sample-piece data.
- Updated the composer instructions and README to reflect the current entry points: `NEW COMPOSITION`, saved composition reopen, MusicXML import, export, and PDF generation.
- Added `PROJECT_OVERVIEW.md` to give future AI/dev handoffs a concise map of the composer architecture, state ownership, and safe change areas.

### Score-End Controls and Chord Preview Alignment

- Added `+ / -` controls beside the final double barline so users can add or remove the last bar directly from the score surface instead of returning to the toolbar.
- Anchored the end-of-score controls to the rendered geometry of the actual final system, so they stay attached to the last barline as wrapping and score width change.
- Fixed chord-hover preview targeting so the preview now locks to the selected note's real start slot instead of showing a misleading target to the right.
- Fixed chord-hover preview positioning so the blue preview notehead now uses the rendered VexFlow note geometry of the selected chord anchor, which keeps the preview visually aligned with the existing notehead.

### Verification

- `frontend/composer`: `npm run build`

## 2026-04-17

### MusicXML Import Alignment and Lyrics

- Added a linked grand-staff render mode for imported MusicXML that now shares both beat-width decisions and the final rendered X grid across treble and bass.
- Tightened imported grand-staff spacing by deriving a shared note area from the rendered stave bounds, so notes that start together now land on the same horizontal beat anchor.
- Changed long-note placement from full-span centering to leading beat-segment anchoring, so imported half notes in `4/4` now land on beats 1 and 3 rather than drifting toward the middle of their spans.
- Applied the same onset anchor rule to pending-note previews and lyric anchoring so import layout, preview placement, and final noteheads all agree.
- Replaced lyric `Annotation` rendering with a dedicated SVG lyric layer between the staves.
- Lyrics now stay on one baseline per system, remain constrained to their local measure segment, and long lyric strings compress to fit instead of colliding into the next lyric.
- Propagated the linked-grid bounds into imported measure hitboxes so hover, insertion preview, and playback tracking stay consistent with the imported layout.

### Composition File Workflow and Help

- Added a persistent top-bar `NEW COMPOSITION` action so users can reset into a fresh score from either a built-in demo or an imported composition.
- Added a `FILE` menu with local save/open, MusicXML import, MusicXML export, and PDF export actions.
- Added an `INSTRUCTIONS` dialog that explains the editing workflow plus how to create, import, save, and export a composition.

### Verification

- `frontend/composer`: `npm run build`
- Local browser import smoke tests verified:
  - shared first-beat notehead X positions across treble and bass in linked import mode
  - half-note onset anchors in `4/4` now match quarter-note beats 1 and 3
  - one lyric baseline per system after MusicXML import
  - long lyric text staying within its segment instead of overlapping the following lyric

## 2026-04-18

### Rest-as-Placeholder Note Insertion and Grand Staff Alignment

- Default empty beats now display quarter rests for a clean, uncluttered look.
- Progressive left-to-right rest expansion activates only after the user arms a beat group (first click). Once armed, rests expand based on the selected note duration:
  - 16th-note: `16th + 16th + 8th`, then the trailing 8th splits into two 16ths as earlier slots are filled.
  - 32nd-note: `32nd + 32nd + 16th + 8th`, with progressive refinement as earlier slots are consumed.
- Treble and bass staves now always share the same beat-level visual-unit widths, ensuring that rests and notes with the same starting beat position align vertically regardless of whether the composition was imported or manually created.
- Both staves now always use linked grid bounds for subdivision positioning, so the horizontal X coordinates for treble and bass share the same coordinate space.
- The alignment rule remains: quarter rests/notes align with 8th positions 1, 3, 5, 7; 8th rests/notes align with 16th positions 1, 3, 5, 7, 9, 11, 13, 15; quarter rests/notes align with 16th positions 1, 5, 9, 13.

### Verification

- `frontend/composer`: `npm run build`

### Start-Slot Alignment Model

- Finalized the alignment rule so noteheads and rests now anchor strictly to `start` position on the smallest subdivision grid, not to the geometric center of their covered span.
- This means longer values now align with the first shorter onset they cover:
  - half notes align to quarter-note starts `1, 3` in `4/4`
  - quarter notes align to eighth-note starts `1, 3, 5, 7`
  - quarter notes align to sixteenth-note starts `1, 5, 9, 13`
- Reused the same start-slot anchor rule for pending insertion previews and imported lyric anchors so preview, import, and final render all share one timing model.
- Replaced the previous fixed note/rest placement offsets with dynamic VexFlow metrics when positioning rendered tickables, so rests, dotted values, and modifier-bearing notes clamp against their real glyph widths instead of hard-coded extents.

### Verification

- `frontend/composer`: `npm run build`
- Local browser import geometry checks confirmed:
  - measure 1 quarter-note X positions: `143.245, 193.245, 243.245, 293.245`
  - measure 1 half-note X positions: `143.245, 243.245`
  - measure 2 eighth-note X positions: `496.833, 535.583, 574.333, 613.083, 651.833, 690.583, 729.333, 768.083`
  - measure 2 quarter-note X positions: `496.833, 574.333, 651.833, 729.333`
  - measure 1 half-rest X positions: `130.285, 230.285`, aligned to quarter-note starts `1, 3`
  - measure 2 quarter-rest X positions: `500.833, 578.333, 655.833, 733.333`, aligned to eighth-note starts `1, 3, 5, 7`
  - imported lyric baseline remained unified and long lyric overlap stayed `false`


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

