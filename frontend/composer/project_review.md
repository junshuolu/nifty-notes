# Project Review

## Current state

Nifty Notes has moved beyond a simple note-clicking prototype and now behaves like a usable score-editing prototype for grand-staff piano notation.

The current build supports:

- independent treble and bass staff editing
- notes, rests, chords, dots, and accidentals
- articulations, ornaments, dynamics, and lyrics
- key signatures and grouped time signatures
- per-bar tempo marks
- ties and slurs
- playback, metronome, and playhead
- editable score title and credits

For demo, classroom, and prototype validation purposes, the product is now capable of a full "write, edit, switch meter, switch key, and play back" loop.

## Most important progress in this iteration

### 1. Editing is now score-driven

The product no longer feels like a form with a score attached to it.

Users can now:

- arm insertion directly on rest slots
- edit key signatures and time signatures from the score-front area
- edit title and credit fields directly above the score
- select notes first, then apply notation marks

This is a much better foundation for a real notation editor.

### 2. Time signatures now affect notation structure

Meters are now parsed as structured data rather than treated as plain strings.

The system now tracks:

- numerator
- denominator
- grouping
- total subdivisions per measure

That model now drives:

- placeholder rest splitting
- beam grouping
- measure width estimation
- insertion capacity
- playback timing

As a result, meters such as `6/8`, `7/8`, and `9/8` now behave like grouped meters instead of just changing the label displayed on screen.

### 3. Score-front editing is now a first-class interaction

The score-front area is no longer passive engraving output.

It now supports:

- clickable key signature selection
- clickable time signature selection
- popovers aligned to the score-front hotspots

This makes the score feel substantially closer to a professional notation workflow.

## Technical structure

- Frontend stack: React + Vite + TypeScript
- Score rendering: VexFlow SVG backend
- Audio: Tone.js
- Main data model: `MeasureData[]`
- Separate staff data: `trebleItems` and `bassItems`

Key implementation points for this round:

- `parseTimeSignature(...)`
- `getSubdivisionGroupInfo(...)`
- group-based placeholder, layout, and beam calculation
- VexFlow `Voice.Mode.SOFT` to prevent custom-meter transitions from crashing the page

## Main issues already addressed

- The left status area and right composition area are now separated cleanly.
- The two-click insertion flow avoids accidental chord stacking.
- Chord editing has been restored.
- Extreme high and low pitch insertion ranges have been widened.
- Dynamic markings now render more like music notation.
- Tempo editing now produces bar-level tempo marks instead of note-level sliders.
- Key signature and time signature are no longer toolbar-only actions.

## Remaining limitations

- Key signature does not yet rewrite existing accidentals automatically.
- Irregular meter grouping is editable, but common presets like `3+2+2` are not yet exposed as one-click options.
- Slur support is still limited to the same staff and the same system.
- There is still no persistence, export, collaboration layer, or backend.
- Regression coverage is still mostly manual.

## Recommended next steps

1. Add one-click grouping presets for irregular meters such as `7/8` and `5/8`.
2. Connect key signature changes to existing accidental logic.
3. Add stable regression coverage for slurs, ties, tempo marks, and custom meters.
4. Evaluate MusicXML or PDF export.
