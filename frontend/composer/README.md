# Nifty Notes

Nifty Notes is a grand-staff piano composition prototype built with `React`, `Vite`, `TypeScript`, `VexFlow`, and `Tone.js`.

The current product direction is "edit directly on the score". Users can insert notes and rests, build chords, add articulations, ornaments, dynamics, lyrics, key signatures, time signatures, tempo marks, ties, and slurs directly from the score view.

## Current capabilities

- Independent treble and bass staff editing
- Whole, half, quarter, eighth, sixteenth, and dotted durations
- Two-click note insertion flow: arm a rest slot first, then place the note
- Chord editing on existing notes
- Accidentals: natural, sharp, flat
- Articulations: staccato, staccatissimo, tenuto, portato, marcato, accent
- Ornaments: trill, turn, inverted turn, mordent, inverted mordent
- Dynamics: `pp`, `p`, `mp`, `mf`, `f`, `ff`, `sfz`
- Lyrics and score metadata editing
- Global tempo plus per-bar tempo marks
- Key signature picker in both the toolbar and the score-front area
- Time signature presets plus custom meter input
- Tie and slur support
- Playback, metronome, and playhead
- Built-in Fur Elise demo material

## Meter grouping

Time signatures are no longer treated as simple labels. The app now parses:

- numerator
- denominator
- grouping
- total subdivisions per measure

This grouping affects:

- how much content can fit inside a measure
- placeholder rest splitting
- eighth- and sixteenth-note beam grouping
- explanatory help shown in the sidebar

Default grouped meters currently include:

- `6/8` -> `3+3`
- `7/8` -> `2+2+3`
- `9/8` -> `3+3+3`

Custom grouping is also supported, for example `3+2+2`.

## Local development

Run the app from `frontend/composer`:

```bash
npm install
npm run dev
```

Default local URL:

```text
http://localhost:5173
```

Production build:

```bash
npm run build
```

Preview the build locally:

```bash
npm run preview
```

## Usage notes

### Notes tab

- Choose duration, dot, and accidental first.
- Hover a rest slot to reveal the blue droplet anchor.
- First click arms insertion.
- Second click places the note.
- Clicking an existing note selects it instead of immediately stacking a chord.

### Measures tab

- Switch among preset time signatures.
- Enter custom numerator, denominator, and grouping.
- Edit key signature and time signature directly from the score-front area.
- Set a tempo mark for the active bar.

### Text tab

- Apply lyrics to the selected note.
- Edit title, subtitle, composer, lyricist, and arranger directly above the score.

### Articulations, ornaments, and dynamics

- Select a note first.
- Apply the chosen marking from the relevant tab.
- The left sidebar updates with a short explanation of the selected symbol.

## Interaction model

- The left column is a fixed information sidebar.
- The right column is the scrollable composition area.
- Tempo marks are shown above the bar, not as note-level sliders.
- Score-front popovers for key signature and time signature are aligned to their hotspots.

## Project structure

- `src/App.tsx`: main UI, interaction flow, score rendering, playback control
- `src/App.css`: layout and interaction styling
- `src/composer/constants.ts`: shared constants, types, pitch ranges, meter options
- `src/composer/score.ts`: pitch mapping, meter parsing, grouping, layout, playback timing
- `src/composer/furElise.ts`: built-in demo score data

## Known limitations

- Key signature currently controls selection and display, but does not yet rewrite existing accidentals automatically.
- Slur support is currently limited to the same staff within the same system.
- Irregular meters support custom grouping input, but common presets like `3+2+2` are not yet exposed as one-click buttons.
- There is no persistence, export, account system, or backend storage yet.
