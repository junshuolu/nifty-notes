# Changelog

## 2026-03-30

### Meter and notation

- Added custom time signature input with numerator, denominator, and grouping.
- Expanded preset meter support to `4/4`, `3/4`, `2/4`, `6/8`, `7/8`, and `9/8`.
- Added grouped-meter parsing so placeholder rests and beam groups follow readable notation for compound and irregular meters.
- Set `7/8` to default to `2+2+3`, while still allowing custom grouping input.
- Fixed the odd-meter `IncompleteVoice` rendering failure by relaxing VexFlow voice strictness for the app-managed grid layout.

### Score-front editing

- Added clickable score-front hotspots for key signature.
- Added clickable score-front hotspots for time signature.
- Aligned score-front popovers to the hotspot coordinate system instead of the old centered transform.
- Unified toolbar and score-front meter/key editing flows.

### Editing workflow

- Kept the two-click note insertion model.
- Restored and refined chord editing on selected notes.
- Expanded the editable pitch range for treble and bass staves.
- Added slur mode for long phrase curves.
- Enabled note-level articulations, ornaments, dynamics, and lyrics from dedicated tabs.

### UI and layout

- Reworked the top toolbar into `Notes`, `Articulations`, `Ornaments`, `Dynamics`, `Measures`, and `Text`.
- Kept the left sidebar fixed while the score area scrolls independently.
- Moved tempo editing to bar-level tempo marks above the staff.
- Added an editable score header for title, subtitle, composer, lyricist, and arranger.

## 2026-03-29

### Symbol editing

- Switched articulations, ornaments, and dynamics to icon-first tool rows.
- Moved explanation text into the left sidebar help card.
- Updated dynamic rendering to music-style glyphs instead of plain text styling.

### Insertion preview

- Replaced the old crosshair guide with a localized preview and droplet anchor.
- Added whole-note and half-note placeholder behavior.
- Fixed high and low insertion edge cases where preview positions could be shown but not inserted.

## 2026-03-28

### Core interaction cleanup

- Preserved empty-measure rest skeletons instead of over-expanding the whole bar when switching note values.
- Improved hover and insertion alignment so preview and actual placement match.
- Added clearer demo and clear flows for manual testing and classroom demos.
- Improved dynamic spacing for denser rhythmic content.
