import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from 'react'
import * as Tone from 'tone'
import {
  Accidental as VFAccidental,
  Annotation,
  Articulation,
  BarlineType,
  Beam,
  Clef as VFClef,
  Curve,
  Dot,
  Formatter,
  Fraction,
  GhostNote,
  Metrics,
  Ornament as VFOrnament,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  TextDynamics,
  TimeSignature as VFTimeSignature,
  Voice,
} from 'vexflow'
import './App.css'
import {
  ACTIVE_COLOR,
  DURATION_OPTIONS,
  ERASE_HOVER_COLOR,
  GRAND_STAFF_GAP,
  MAX_BPM,
  MIN_BPM,
  NOTE_COLOR,
  PIANO_SAMPLE_URLS,
  SCORE_CANVAS_TOP,
  SCORE_PADDING_BOTTOM,
  STAFF_IDS,
  SYSTEM_GAP_Y,
  SYSTEM_SIDE_PADDING,
  SYSTEM_WRAP_WIDTH,
  TIME_SIGNATURE_OPTIONS,
  BASS_PITCHES_FROM_TOP,
  BASS_TOP_LINE_INDEX,
  TREBLE_PITCHES_FROM_TOP,
  TREBLE_TOP_LINE_INDEX,
  type AccidentalType,
  type ArticulationType,
  type BaseDuration,
  type DynamicType,
  type EditMode,
  type KeySignatureSpec,
  type MeasureData,
  type MeasureHitBox,
  type NoteItem,
  type NotePitch,
  type OrnamentType,
  type RenderDuration,
  type ScoreItem,
  type StaffId,
  type TimeSignature,
  type ToolbarTab,
  createMeasure,
  generateId,
} from './composer/constants'
import {
  buildPlaybackNotes,
  buildSystems,
  cloneMeasures,
  findCoveringItem,
  findNextContiguousItem,
  findNextStartingItem,
  findStartingItem,
  getDisplayAccidentalForPitch,
  getChordStemDirection,
  getDurationName,
  getDurationSubdivisions,
  getEffectiveMeasureTempo,
  getItemSubdivisions,
  getItemsForStaff,
  getMeasureTempoTimeline,
  getNaturalizedPitch,
  getPitchLabel,
  getPitchLabels,
  getSubdivisionGroupInfo,
  haveSameNotePitches,
  itemEnd,
  normalizeMeasures,
  parseTimeSignature,
  pitchToY,
  rangesOverlap,
  rewriteMeasuresForKeySignature,
  snapSubdivision,
  sortPitches,
  toTonePitch,
  transposeMeasuresForKeySignature,
  type MeasureTempoTiming,
  yToPitch,
} from './composer/score'
import { createFurEliseMeasures } from './composer/furElise'
import {
  exportMusicXMLViaBackend,
  exportPDFViaBackend,
  importMusicXMLViaBackend,
  type PdfSystemBound,
  type MusicXmlScorePayload,
} from './composer/io'

declare global {
  interface Window {
    __PDF_EXPORT_ERROR__?: string
    __PDF_RENDER_META__?: {
      systemBoundsSvg: PdfSystemBound[]
    }
    __PDF_RENDER_READY__?: boolean
  }
}

const PLAYBACK_START_DELAY_SECONDS = 0.08
const MEASURE_EDGE_PADDING = 3
const GRID_EDGE_PADDING = 10
const DEFAULT_GROUP_VISUAL_UNITS = 2
const SYSTEM_MEASURE_NUMBER_FONT_SIZE = 16
const SYSTEM_MEASURE_NUMBER_OFFSET_X = 8
const SYSTEM_MEASURE_NUMBER_OFFSET_Y = -4
const SYSTEM_NATURAL_KEY_PLACEHOLDER_FONT_SIZE = 18
const SYSTEM_NATURAL_KEY_PLACEHOLDER_PADDING = 18
const SYSTEM_NATURAL_KEY_PLACEHOLDER_OFFSET_Y = 0
const SCORE_FRONT_HOTSPOT_PAD_X = 10
const SCORE_FRONT_KEY_MIN_WIDTH = 34
const SCORE_FRONT_TIME_MIN_WIDTH = 44
const SCORE_FRONT_TIME_POPOVER_WIDTH = 480
const SCORE_FRONT_KEY_POPOVER_WIDTH = 540
const SCORE_FRONT_HOTSPOT_HEIGHT = GRAND_STAFF_GAP + 62
const SCORE_MIN_SURFACE_WIDTH = 640
const PDF_JOB_SEARCH_PARAM = 'pdfJob'
const LOCAL_COMPOSITION_STORAGE_KEY = 'nifty-notes.saved-composition.v1'
const DEFAULT_NEW_COMPOSITION_MEASURES = 4
const DEFAULT_NEW_COMPOSITION_TEMPO = 80
const DEFAULT_NEW_COMPOSITION_TIME_SIGNATURE = '4/4'
const SHARP_SYMBOL = '\u266F'
const FLAT_SYMBOL = '\u266D'
const NATURAL_SYMBOL = '\u266E'
const SVG_NS = 'http://www.w3.org/2000/svg'
const LYRIC_FONT_FAMILY = 'Academico, "Times New Roman", serif'
const LYRIC_FONT_SIZE = 15
const LYRIC_MIN_FONT_SIZE = 11
const LYRIC_SEGMENT_PADDING = 6
const LYRIC_BASELINE_BIAS = 0.42
const LYRIC_MIN_SEGMENT_WIDTH = 24

type VexRenderContext = ReturnType<Renderer['getContext']>
type CompositionLayoutMode = 'independent' | 'linked'
type CompositionIoPayload = MusicXmlScorePayload & {
  layoutMode?: CompositionLayoutMode
}
type KeySignatureMeta = {
  countLabel: string
  countPhrase: string
  keyNames: string
  summaryGlyph: string
}
type SavedCompositionSnapshot = {
  layoutMode: CompositionLayoutMode
  payload: CompositionIoPayload
  savedAt: string
  title: string
  version: 1
}
type GridBounds = {
  endX: number
  startX: number
}
type LyricLayoutToken = {
  anchorX: number
  measureIndex: number
  measureLeft: number
  measureRight: number
  systemIndex: number
  text: string
  y: number
}
type ScoreEndControlsLayout = {
  bottom: number
  centerX: number
  top: number
}


const TOOLBAR_TABS: Array<{ id: ToolbarTab; label: string; hint: string }> = [
  { id: 'notes', label: 'Notes', hint: 'Pitch, duration, accidentals, and insert tools.' },
  { id: 'articulations', label: 'Articulations', hint: 'Apply touch and accent marks to the selected note.' },
  { id: 'ornaments', label: 'Ornaments', hint: 'Add trill and ornament symbols above the selected note.' },
  { id: 'dynamics', label: 'Dynamics', hint: 'Attach expressive dynamic markings to the selected note.' },
  { id: 'bars', label: 'Bars', hint: 'Manage bars, meter, tempo, and reset tools.' },
  { id: 'text', label: 'Text', hint: 'Edit score title fields and lyrics for the selected note.' },
  { id: 'export', label: 'Export', hint: 'Save the score as a PDF file.' },
]

const ARTICULATION_OPTIONS: Array<{
  glyph: string
  label: string
  value: ArticulationType
}> = [
    { glyph: '.', label: 'Staccato', value: 'staccato' },
    { glyph: 'v', label: 'Staccatissimo', value: 'staccatissimo' },
    { glyph: '-', label: 'Tenuto', value: 'tenuto' },
    { glyph: '._', label: 'Portato', value: 'portato' },
    { glyph: '^', label: 'Marcato', value: 'marcato' },
    { glyph: '>', label: 'Accent', value: 'accent' },
  ]

const ARTICULATION_LABELS: Record<ArticulationType, string> = {
  accent: 'Accent',
  marcato: 'Marcato',
  portato: 'Portato',
  staccatissimo: 'Staccatissimo',
  staccato: 'Staccato',
  tenuto: 'Tenuto',
}

const ORNAMENT_OPTIONS: Array<{
  glyph: string
  label: string
  value: OrnamentType
}> = [
    { glyph: 'tr', label: 'Trill', value: 'trill' },
    { glyph: 'turn', label: 'Turn', value: 'turn' },
    { glyph: 'inv', label: 'Inv. Turn', value: 'turnInverted' },
    { glyph: 'mord', label: 'Mordent', value: 'mordent' },
    { glyph: 'inv mord', label: 'Inv. Mordent', value: 'mordentInverted' },
  ]

const ORNAMENT_LABELS: Record<OrnamentType, string> = {
  mordent: 'Mordent',
  mordentInverted: 'Inverted mordent',
  trill: 'Trill',
  turn: 'Turn',
  turnInverted: 'Inverted turn',
}

const DYNAMIC_OPTIONS: DynamicType[] = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'sfz']

const KEY_SIGNATURE_OPTIONS: Array<{
  glyph: string
  label: string
  value: KeySignatureSpec
}> = [
    { glyph: 'Natural', label: 'Natural / C major', value: 'C' },
    { glyph: '♯', label: '1 sharp', value: 'G' },
    { glyph: '♯♯', label: '2 sharps', value: 'D' },
    { glyph: '♯♯♯', label: '3 sharps', value: 'A' },
    { glyph: '♯♯♯♯', label: '4 sharps', value: 'E' },
    { glyph: '♯♯♯♯♯', label: '5 sharps', value: 'B' },
    { glyph: '♯♯♯♯♯♯', label: '6 sharps', value: 'F#' },
    { glyph: '♯♯♯♯♯♯♯', label: '7 sharps', value: 'C#' },
    { glyph: '♭', label: '1 flat', value: 'F' },
    { glyph: '♭♭', label: '2 flats', value: 'Bb' },
    { glyph: '♭♭♭', label: '3 flats', value: 'Eb' },
    { glyph: '♭♭♭♭', label: '4 flats', value: 'Ab' },
    { glyph: '♭♭♭♭♭', label: '5 flats', value: 'Db' },
    { glyph: '♭♭♭♭♭♭', label: '6 flats', value: 'Gb' },
    { glyph: '♭♭♭♭♭♭♭', label: '7 flats', value: 'Cb' },
  ]

const KEY_SIGNATURE_META: Record<KeySignatureSpec, KeySignatureMeta> = {
  A: {
    countLabel: '3#',
    countPhrase: 'three sharps',
    keyNames: 'A Major / F# Minor',
    summaryGlyph: SHARP_SYMBOL.repeat(3),
  },
  Ab: {
    countLabel: '4b',
    countPhrase: 'four flats',
    keyNames: 'Ab Major / F Minor',
    summaryGlyph: FLAT_SYMBOL.repeat(4),
  },
  B: {
    countLabel: '5#',
    countPhrase: 'five sharps',
    keyNames: 'B Major / G# Minor',
    summaryGlyph: SHARP_SYMBOL.repeat(5),
  },
  Bb: {
    countLabel: '2b',
    countPhrase: 'two flats',
    keyNames: 'Bb Major / G Minor',
    summaryGlyph: FLAT_SYMBOL.repeat(2),
  },
  C: {
    countLabel: 'natural',
    countPhrase: 'the natural key signature with no sharps or flats',
    keyNames: 'C Major / A Minor',
    summaryGlyph: NATURAL_SYMBOL,
  },
  'C#': {
    countLabel: '7#',
    countPhrase: 'seven sharps',
    keyNames: 'C# Major / A# Minor',
    summaryGlyph: SHARP_SYMBOL.repeat(7),
  },
  Cb: {
    countLabel: '7b',
    countPhrase: 'seven flats',
    keyNames: 'Cb Major / Ab Minor',
    summaryGlyph: FLAT_SYMBOL.repeat(7),
  },
  D: {
    countLabel: '2#',
    countPhrase: 'two sharps',
    keyNames: 'D Major / B Minor',
    summaryGlyph: SHARP_SYMBOL.repeat(2),
  },
  Db: {
    countLabel: '5b',
    countPhrase: 'five flats',
    keyNames: 'Db Major / Bb Minor',
    summaryGlyph: FLAT_SYMBOL.repeat(5),
  },
  E: {
    countLabel: '4#',
    countPhrase: 'four sharps',
    keyNames: 'E Major / C# Minor',
    summaryGlyph: SHARP_SYMBOL.repeat(4),
  },
  Eb: {
    countLabel: '3b',
    countPhrase: 'three flats',
    keyNames: 'Eb Major / C Minor',
    summaryGlyph: FLAT_SYMBOL.repeat(3),
  },
  F: {
    countLabel: '1b',
    countPhrase: 'one flat',
    keyNames: 'F Major / D Minor',
    summaryGlyph: FLAT_SYMBOL,
  },
  'F#': {
    countLabel: '6#',
    countPhrase: 'six sharps',
    keyNames: 'F# Major / D# Minor',
    summaryGlyph: SHARP_SYMBOL.repeat(6),
  },
  G: {
    countLabel: '1#',
    countPhrase: 'one sharp',
    keyNames: 'G Major / E Minor',
    summaryGlyph: SHARP_SYMBOL,
  },
  Gb: {
    countLabel: '6b',
    countPhrase: 'six flats',
    keyNames: 'Gb Major / Eb Minor',
    summaryGlyph: FLAT_SYMBOL.repeat(6),
  },
}

const TAB_SELECTION_HINT: Record<Exclude<ToolbarTab, 'notes'>, string> = {
  articulations: 'Click an existing note while this tab is open to select it.',
  bars: 'Click a measure in the score to target it, then set a tempo mark from the Measures toolbar.',
  dynamics: 'Click an existing note to choose where the dynamic marking should appear.',
  export: 'Use the button below to export the score as PDF — no note selection needed.',
  ornaments: 'Click an existing note to add or remove an ornament.',
  text: 'Click an existing note to attach lyrics, or edit the score title block below.',
}

const TAB_SIDEBAR_TIPS: Record<ToolbarTab, string[]> = {
  notes: [
    'Use the blue teardrop to find the next rest slot. Click once to arm insertion there, then click again to place the note.',
    'Click an existing note to select it. Empty rest slots now use a two-click insert flow.',
    'Click a different pitch on the same selected note to build a chord. Shift-click an existing chord tone to remove it.',
    'Slur mode lets you click a start note and an end note on the same staff to draw a long phrase curve.',
    'After insertion, the rest guide advances automatically to the next available slot.',
  ],
  articulations: [
    'Select a note in the score, then apply a touch or accent mark from the toolbar.',
    'Articulations stay attached to the selected note and follow that note visually.',
  ],
  ornaments: [
    'Select a note first, then add trill, turn, or mordent markings from the toolbar.',
    'Ornaments stay above the target note and update immediately in the staff.',
  ],
  dynamics: [
    'Select a note, then add a dynamic marking using the music-style glyphs below.',
    'Dynamics sit below the note and keep their spacing when the note moves vertically.',
  ],
  bars: [
    'Click any measure in the score to target that measure for tempo changes.',
    'Click the time signature or key signature at the front of a system to open its chooser directly on the score.',
    'Set a measure tempo to draw a metronome mark above that measure and change playback from there onward.',
  ],
  text: [
    'Select a note to edit its lyric text, then apply or clear the lyric from the toolbar.',
    'The title, subtitle, composer, lyricist, and arranger fields are editable directly above the score.',
  ],
  export: [
    'Export PDF opens a filename dialog, then rasterizes the on-screen score into paginated A4.',
  ],
}

const ACCIDENTAL_LABELS: Record<AccidentalType, string> = {
  '#': 'Sharp',
  b: 'Flat',
  n: 'Natural',
}

const DURATION_HELP: Record<string, { description: string; title: string }> = {
  '8:0': {
    description: 'A quaver (8th note) fills half a beat in simple metre and suits flowing melodic movement.',
    title: 'Quaver (8th Note)',
  },
  '16:0': {
    description: 'A semi-quaver (16th note) fills a quarter of a beat and suits fast ornamental or rhythmic detail.',
    title: 'Semi-quaver (16th Note)',
  },
  '32:0': {
    description: 'A demisemiquaver (32nd note) fills one eighth of a beat and suits very fast ornamental figures.',
    title: 'Demisemiquaver (32nd Note)',
  },
  'h:0': {
    description: 'A minim (half note) spans two beats and keeps the existing long-rest placement behaviour intact.',
    title: 'Minim (Half Note)',
  },
  'h:1': {
    description: 'A dotted minim (dotted half note) spans three beats in simple metre and suits sustained phrases.',
    title: 'Dotted Minim (Dotted Half Note)',
  },
  'q:0': {
    description: 'A crotchet (quarter note) fills one beat and remains the default pulse value for tempo markings.',
    title: 'Crotchet (Quarter Note)',
  },
  'q:1': {
    description: 'A dotted crotchet (dotted quarter note) spans one and a half beats and works cleanly with compound groupings.',
    title: 'Dotted Crotchet (Dotted Quarter Note)',
  },
  'w:0': {
    description: 'A semibreve (whole note) spans the longest single value on the toolbar and still respects measure-fit constraints.',
    title: 'Semibreve (Whole Note)',
  },
}

const MODE_HELP: Record<EditMode, { description: string; title: string }> = {
  erase: {
    description: 'Erase removes the entire symbol under the pointer, including notes, chords, rests, and ties.',
    title: 'Erase Mode',
  },
  note: {
    description: 'Insert Note uses the blue teardrop as the next target. Clicking a note selects it instead of stacking a chord by accident.',
    title: 'Insert Note',
  },
  rest: {
    description: 'Insert Rest writes a real rest symbol using the currently selected duration at the clicked position.',
    title: 'Insert Rest',
  },
  slur: {
    description: 'Slur mode lets you choose a start note and an end note to draw one long phrase curve across them.',
    title: 'Slur Tool',
  },
  tie: {
    description: 'Tie links a note to the next contiguous note with the same pitch content.',
    title: 'Tie Tool',
  },
}

const ACCIDENTAL_HELP: Record<AccidentalType, { description: string; title: string }> = {
  '#': {
    description: 'Sharp raises the selected pitch by a semitone for the inserted note or chord member.',
    title: 'Sharp Accidental',
  },
  b: {
    description: 'Flat lowers the selected pitch by a semitone for the inserted note or chord member.',
    title: 'Flat Accidental',
  },
  n: {
    description: 'Natural cancels a previous sharp or flat and restores the pitch to its natural note name.',
    title: 'Natural Accidental',
  },
}

const ARTICULATION_HELP: Record<ArticulationType, { description: string; title: string }> = {
  accent: {
    description: 'Accent adds a stronger attack at the front of the selected note.',
    title: 'Accent',
  },
  marcato: {
    description: 'Marcato gives the selected note a very pointed, strongly stressed attack.',
    title: 'Marcato',
  },
  portato: {
    description: 'Portato keeps notes gently separated while still preserving some sustain between them.',
    title: 'Portato',
  },
  staccatissimo: {
    description: 'Staccatissimo makes the selected note very short and sharply detached.',
    title: 'Staccatissimo',
  },
  staccato: {
    description: 'Staccato shortens the selected note and gives it a detached touch.',
    title: 'Staccato',
  },
  tenuto: {
    description: 'Tenuto asks the performer to hold the selected note for its full value with slight emphasis.',
    title: 'Tenuto',
  },
}

const ORNAMENT_HELP: Record<OrnamentType, { description: string; title: string }> = {
  mordent: {
    description: 'Mordent adds a rapid alternation with the lower neighboring tone on the selected note.',
    title: 'Mordent',
  },
  mordentInverted: {
    description: 'Inverted mordent adds a rapid alternation with the upper neighboring tone.',
    title: 'Inverted Mordent',
  },
  trill: {
    description: 'Trill rapidly alternates the selected note with its upper neighbor for an extended ornament.',
    title: 'Trill',
  },
  turn: {
    description: 'Turn wraps around the selected pitch by moving above, through, and below it in quick succession.',
    title: 'Turn',
  },
  turnInverted: {
    description: 'Inverted turn starts below the selected pitch before wrapping back around it.',
    title: 'Inverted Turn',
  },
}

const DYNAMIC_HELP: Record<DynamicType, { description: string; title: string }> = {
  f: { description: 'Forte asks for a strong loud level.', title: 'Forte' },
  ff: { description: 'Fortissimo asks for a very loud dynamic.', title: 'Fortissimo' },
  fff: { description: 'Triple forte pushes the phrase to an extreme loud dynamic.', title: 'Triple Forte' },
  fp: { description: 'Fortepiano starts strong and immediately falls back to soft.', title: 'Fortepiano' },
  fz: { description: 'Forzando gives the selected note an immediate forceful stress.', title: 'Forzando' },
  mf: { description: 'Mezzo-forte is a moderately strong dynamic.', title: 'Mezzo-forte' },
  mp: { description: 'Mezzo-piano is a moderately soft dynamic.', title: 'Mezzo-piano' },
  p: { description: 'Piano asks for a soft dynamic.', title: 'Piano' },
  pf: { description: 'Piano-forte starts soft and then opens into a stronger sound.', title: 'Piano-forte' },
  pp: { description: 'Pianissimo asks for a very soft dynamic.', title: 'Pianissimo' },
  ppp: { description: 'Triple piano pushes the phrase to an extreme soft dynamic.', title: 'Triple Piano' },
  sfz: { description: 'Sforzando gives the selected note a sharply accented dynamic stress.', title: 'Sforzando' },
}

const TIME_SIGNATURE_HELP: Record<string, { description: string; title: string }> = {
  '2/4': {
    description: 'Two crotchet (quarter-note) beats per measure. Useful for a quick march-like or dance-like pulse.',
    title: '2/4 Time',
  },
  '3/4': {
    description: 'Three crotchet (quarter-note) beats per measure. Useful for waltz and other triple-metre phrasing.',
    title: '3/4 Time',
  },
  '4/4': {
    description: 'Four crotchet (quarter-note) beats per measure. This is the most common simple metre for broad phrasing.',
    title: '4/4 Time',
  },
  '6/8': {
    description: 'Six quavers (8th notes) grouped as 3+3. Beams and placeholder rests follow two compound beats.',
    title: '6/8 Time',
  },
  '7/8': {
    description: 'Seven quavers (8th notes) grouped by default as 2+2+3. Beams and placeholder rests follow that readable grouping.',
    title: '7/8 Time',
  },
  '9/8': {
    description: 'Nine quavers (8th notes) grouped as 3+3+3. Beams and placeholder rests follow three compound beats.',
    title: '9/8 Time',
  },
}

function getTimeSignatureHelp(
  timeSignature: TimeSignature,
  groupingOverride?: number[] | null,
) {
  const meter = parseTimeSignature(timeSignature, groupingOverride)
  const predefined = TIME_SIGNATURE_HELP[meter.display]

  if (predefined) {
    return predefined
  }

  const groupingLabel = meter.grouping.join('+')

  return {
    description: `${meter.display} uses ${groupingLabel} grouping for readable placeholder rests and beam grouping.`,
    title: `${meter.display} Time`,
  }
}

function parseGroupingInput(text: string) {
  const normalized = text.trim()

  if (!normalized) {
    return null
  }

  const parts = normalized
    .split('+')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value > 0)

  return parts.length > 0 ? parts : null
}

function formatGroupingInput(grouping: number[]) {
  return grouping.join('+')
}

function haveSameNumberSequence(left: number[] | null | undefined, right: number[] | null | undefined) {
  if (!left || left.length === 0) {
    return !right || right.length === 0
  }

  if (!right || left.length !== right.length) {
    return false
  }

  return left.every((value, index) => value === right[index])
}

const BAR_ACTION_HELP = {
  add: {
    description: 'Add Measure appends a new measure to the score and extends the layout automatically.',
    title: 'Add Measure',
  },
  clear: {
    description: 'Clear removes all notes and rests from the score while leaving an editable blank page.',
    title: 'Clear Score',
  },
  remove: {
    description: 'Remove Measure deletes the last measure, but always leaves at least one measure on the page.',
    title: 'Remove Measure',
  },
  tempo: {
    description: 'Measure tempo places a metronome-style tempo mark above the selected measure and changes playback from that measure onward.',
    title: 'Measure Tempo',
  },
} as const

type PlayheadState = {
  height: number
  top: number
  x: number
}

type PlaceholderFocus = {
  groupStart: number
  measureIndex: number
  staffId: StaffId
}

type HoveredRestPosition = {
  measureIndex: number
  staffId: StaffId
  subdivision: number
}

type PendingInsertPreview = {
  anchorItemId?: string
  measureIndex: number
  pitch: NotePitch
  staffId: StaffId
  subdivision: number
}

type ScoreSlur = {
  fromNoteId: string
  id: string
  staffId: StaffId
  toNoteId: string
}

type PendingSlurSelection = {
  measureIndex: number
  noteId: string
  staffId: StaffId
  subdivision: number
}

type ScoreFrontPopover = {
  anchorCenter: number
  kind: 'keySignature' | 'timeSignature'
  measureIndex: number
  top: number
}

type ScoreFrontHotspot = {
  height: number
  kind: 'keySignature' | 'timeSignature'
  left: number
  measureIndex: number
  top: number
  width: number
}

type HelpCard = {
  description: string
  title: string
}

function buildBlankMeasures(count = DEFAULT_NEW_COMPOSITION_MEASURES): MeasureData[] {
  return Array.from({ length: Math.max(count, 1) }, (_, index) =>
    createMeasure(`measure-${index + 1}`),
  )
}

function readSavedCompositionSnapshot(): SavedCompositionSnapshot | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_COMPOSITION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<SavedCompositionSnapshot>
    if (
      parsed?.version !== 1 ||
      !parsed.payload ||
      typeof parsed.savedAt !== 'string'
    ) {
      return null
    }

    return {
      layoutMode: parsed.layoutMode === 'linked' ? 'linked' : 'independent',
      payload: parsed.payload as CompositionIoPayload,
      savedAt: parsed.savedAt,
      title:
        typeof parsed.title === 'string' && parsed.title.trim()
          ? parsed.title
          : (parsed.payload.scoreTitle?.trim() || 'Untitled Composition'),
      version: 1,
    }
  } catch {
    return null
  }
}

function writeSavedCompositionSnapshot(snapshot: SavedCompositionSnapshot) {
  if (typeof window === 'undefined') {
    throw new Error('Local saving is unavailable in this environment.')
  }

  window.localStorage.setItem(
    LOCAL_COMPOSITION_STORAGE_KEY,
    JSON.stringify(snapshot),
  )
}

function getToolbarTabHelp(tab: ToolbarTab): HelpCard {
  const meta = TOOLBAR_TABS.find((item) => item.id === tab) ?? TOOLBAR_TABS[0]
  return {
    description: meta.hint,
    title: meta.label,
  }
}

function getDurationHelp(baseDuration: BaseDuration, dotted: boolean): HelpCard {
  return DURATION_HELP[`${baseDuration}:${dotted ? 1 : 0}`] ?? DURATION_HELP['q:0']
}

function getMeasureHelp(
  measureIndex: number,
  effectiveTempo: number,
  hasExplicitTempo: boolean,
): HelpCard {
  return {
    description: hasExplicitTempo
      ? `Measure ${measureIndex + 1} already has its own tempo mark at ${effectiveTempo} BPM. Update it here to redraw the mark and change playback from this measure onward.`
      : `Measure ${measureIndex + 1} is currently inheriting ${effectiveTempo} BPM. Set a measure tempo here to place a metronome mark above this measure.`,
    title: `Measure ${measureIndex + 1} Tempo`,
  }
}

function getSelectedNoteHelp(
  note: NoteItem,
  measureIndex: number,
  staffId: StaffId,
  keySignature: KeySignatureSpec,
): HelpCard {
  const details = [
    `${getDurationName(note.baseDuration, note.dots === 1)} note on the ${staffId} staff in measure ${measureIndex + 1}.`,
  ]

  if (note.articulation) {
    details.push(`Articulation: ${ARTICULATION_LABELS[note.articulation]}.`)
  }

  if (note.ornament) {
    details.push(`Ornament: ${ORNAMENT_LABELS[note.ornament]}.`)
  }

  if (note.dynamic) {
    details.push(`Dynamic: ${note.dynamic.toUpperCase()}.`)
  }

  if (note.lyrics) {
    details.push(`Lyrics attached: "${note.lyrics}".`)
  }

  return {
    description: details.join(' '),
    title: getPitchLabels(note.pitches, note.accidentals, keySignature),
  }
}

function getModeLabel(mode: EditMode) {
  if (mode === 'rest') {
    return 'Insert rest'
  }

  if (mode === 'slur') {
    return 'Long slur'
  }

  if (mode === 'tie') {
    return 'Tie'
  }

  if (mode === 'erase') {
    return 'Erase'
  }

  return 'Insert note'
}

function getDynamicGlyphText(dynamic: DynamicType) {
  return dynamic
    .split('')
    .map((letter) => TextDynamics.GLYPHS[letter] ?? letter)
    .join('')
}

function clampTempo(nextTempo: number) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(nextTempo)))
}

function getKeySignatureMeta(keySignature: KeySignatureSpec) {
  return KEY_SIGNATURE_META[keySignature]
}

function getKeySignatureNames(keySignature: KeySignatureSpec) {
  return getKeySignatureMeta(keySignature).keyNames
}

function getKeySignatureHelp(keySignature: KeySignatureSpec): HelpCard {
  const meta = getKeySignatureMeta(keySignature)
  return {
    description: `${meta.keyNames} uses ${meta.countPhrase} in the key signature.`,
    title: `Key Signature: ${meta.keyNames}`,
  }
}

function getKeySignaturePickerTitle(keySignature: KeySignatureSpec) {
  const meta = getKeySignatureMeta(keySignature)
  return `Set ${meta.keyNames} key signature (${meta.countLabel})`
}

function getKeySignatureDisplayLabel(keySignature: KeySignatureSpec) {
  const meta = getKeySignatureMeta(keySignature)
  return `${meta.summaryGlyph} (${meta.keyNames})`
}

function getKeySignatureChangeModeDescription(shouldTranspose: boolean) {
  return shouldTranspose
    ? 'Existing notes will transpose into the new key and playback will move with them.'
    : 'Existing notes will keep their sounding pitch and be respelled for the new key signature.'
}

function getSystemIndexForMeasure(
  systems: ReturnType<typeof buildSystems>,
  measureIndex: number,
) {
  return systems.findIndex((system) =>
    system.some((entry) => entry.measureIndex === measureIndex),
  )
}

function trimMeasuresForTimeSignature(
  sourceMeasures: MeasureData[],
  nextSubdivisionsPerMeasure: number,
  keySignature: KeySignatureSpec,
) {
  const draft = cloneMeasures(sourceMeasures)
  let removedItemCount = 0

  draft.forEach((measure) => {
    STAFF_IDS.forEach((staffId) => {
      const trimmedItems = getItemsForStaff(measure, staffId).filter((item) => {
        const fitsWithinMeasure =
          item.start < nextSubdivisionsPerMeasure &&
          itemEnd(item) <= nextSubdivisionsPerMeasure

        if (!fitsWithinMeasure) {
          removedItemCount += 1
        }

        return fitsWithinMeasure
      })

      if (staffId === 'treble') {
        measure.trebleItems = trimmedItems
      } else {
        measure.bassItems = trimmedItems
      }
    })
  })

  return {
    measures: normalizeMeasures(draft, nextSubdivisionsPerMeasure, keySignature),
    removedItemCount,
  }
}

function getPlayheadState(
  hitBoxes: MeasureHitBox[],
  elapsedSeconds: number,
  measureTempoTimeline: MeasureTempoTiming[],
  subdivisionsPerMeasure: number,
): PlayheadState | null {
  if (hitBoxes.length === 0) {
    return null
  }

  const trebleBoxes = hitBoxes
    .filter((box) => box.staffId === 'treble')
    .sort((left, right) => left.index - right.index)
  const bassBoxes = hitBoxes
    .filter((box) => box.staffId === 'bass')
    .sort((left, right) => left.index - right.index)

  if (trebleBoxes.length === 0 || bassBoxes.length === 0) {
    return null
  }

  const currentTiming =
    measureTempoTimeline.find(
      (timing) =>
        elapsedSeconds >= timing.startSeconds &&
        elapsedSeconds < timing.startSeconds + timing.durationSeconds,
    ) ??
    measureTempoTimeline[measureTempoTimeline.length - 1]

  if (!currentTiming) {
    return null
  }

  const measureIndex = Math.min(currentTiming.measureIndex, trebleBoxes.length - 1)
  const localElapsedSeconds = Math.max(0, elapsedSeconds - currentTiming.startSeconds)
  const localSubdivision = Math.min(
    localElapsedSeconds / currentTiming.subdivisionSeconds,
    subdivisionsPerMeasure - 1,
  )
  const leftSubdivision = Math.max(0, Math.floor(localSubdivision))
  const rightSubdivision = Math.min(
    leftSubdivision + 1,
    subdivisionsPerMeasure - 1,
  )
  const interpolation = localSubdivision - leftSubdivision
  const trebleBox = trebleBoxes[measureIndex]
  const bassBox = bassBoxes[measureIndex]

  if (!trebleBox || !bassBox) {
    return null
  }

  const startX =
    trebleBox.xBySubdivision[leftSubdivision] ??
    trebleBox.xBySubdivision[0] ??
    trebleBox.left
  const endX = trebleBox.xBySubdivision[rightSubdivision] ?? startX

  return {
    height: bassBox.hitBottom - trebleBox.hitTop,
    top: trebleBox.hitTop,
    x: startX + (endX - startX) * interpolation,
  }
}

function styleNote(note: StaveNote, color: string) {
  note.setStyle({ fillStyle: color, strokeStyle: color })
  note.setStemStyle({ fillStyle: color, strokeStyle: color })
  note.setFlagStyle({ fillStyle: color, strokeStyle: color })
  note.setLedgerLineStyle({ strokeStyle: color })
}

function getRestKey(staffId: StaffId): string {
  return staffId === 'treble' ? 'b/4' : 'd/3'
}

function createVisualNote(
  item: ScoreItem,
  staffId: StaffId,
  keySignature: KeySignatureSpec,
  activeItemId: string | null,
  eraseHoverItemId: string | null,
  noteRegistry: Map<string, { item: NoteItem; note: StaveNote }>,
  highlighted = false,
): StaveNote {
  const note =
    item.kind === 'note'
      ? new StaveNote({
        clef: staffId,
        dots: item.dots,
        duration: item.baseDuration,
        keys: item.pitches.map((pitch) => getNaturalizedPitch(pitch)),
        stemDirection: getChordStemDirection(item.pitches, staffId),
      })
      : new StaveNote({
        clef: staffId,
        dots: item.dots,
        duration: item.baseDuration,
        keys: [getRestKey(staffId)],
        type: 'r',
      })

  const color =
    eraseHoverItemId === item.id
      ? ERASE_HOVER_COLOR
      : highlighted && item.kind === 'rest'
        ? ACTIVE_COLOR
        : activeItemId === item.id
          ? ACTIVE_COLOR
          : NOTE_COLOR

  applyDots(note, item.dots, color)
  styleNote(note, color)

  if (item.kind === 'note' && item.accidentals) {
    item.pitches.forEach((pitch, index) => {
      const acc = getDisplayAccidentalForPitch(
        pitch,
        item.accidentals?.[pitch],
        keySignature,
      )
      if (acc) {
        note.addModifier(new VFAccidental(acc), index)
      }
    })
  } else if (item.kind === 'note') {
    item.pitches.forEach((pitch, index) => {
      const acc = getDisplayAccidentalForPitch(pitch, null, keySignature)
      if (acc) {
        note.addModifier(new VFAccidental(acc), index)
      }
    })
  }

  if (item.kind === 'note') {
    noteRegistry.set(item.id, { item, note })

    // Render articulation
    try {
      const artMap: Record<string, string> = {
        staccato: 'a.', staccatissimo: 'av', tenuto: 'a-',
        portato: 'a-', marcato: 'a^', accent: 'a>',
      }
      if (item.articulation && artMap[item.articulation]) {
        note.addModifier(new Articulation(artMap[item.articulation]))
      }
      if (item.ornament === 'trill') {
        note.addModifier(new VFOrnament('tr'))
      }
      if (item.ornament === 'turn') {
        note.addModifier(new VFOrnament('turn'))
      }
      if (item.ornament === 'turnInverted') {
        note.addModifier(new VFOrnament('turnInverted'))
      }
      if (item.ornament === 'mordent') {
        note.addModifier(new VFOrnament('mordent'))
      }
      if (item.ornament === 'mordentInverted') {
        note.addModifier(new VFOrnament('mordentInverted'))
      }
      if (item.dynamic) {
        const dynAnn = new Annotation(getDynamicGlyphText(item.dynamic))
        dynAnn.setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
        dynAnn.setFont('Bravura, Academico, "Times New Roman", serif', 26, 'normal', 'normal')
        dynAnn.setYShift(-24)
        note.addModifier(dynAnn)
      }
    } catch (e) {
      console.warn('VexFlow modifier error:', e)
    }
  }

  return note
}

function applyDots(note: StaveNote, dots: number, color: string) {
  if (dots <= 0) {
    return
  }

  Dot.buildAndAttach([note], { all: true })
  Dot.getDots(note).forEach((dot) => {
    dot.setStyle({ fillStyle: color, strokeStyle: color })
  })
}

function createPlaceholder(
  baseDuration: RenderDuration,
  staffId: StaffId,
  color: string,
  highlighted = false,
  dots = 0,
): StaveNote {
  const placeholder = new StaveNote({
    clef: staffId,
    dots,
    duration: baseDuration,
    keys: [getRestKey(staffId)],
    type: 'r',
  })

  const effectiveColor = highlighted ? ACTIVE_COLOR : color
  applyDots(placeholder, dots, effectiveColor)
  styleNote(placeholder, effectiveColor)
  return placeholder
}

function createAnchorNotes(subdivisionsPerMeasure: number): GhostNote[] {
  return Array.from({ length: subdivisionsPerMeasure }, () => new GhostNote('32'))
}

function getGroupPlaceholderLength(
  items: ScoreItem[],
  groupStart: number,
  groupLength: number,
) {
  const groupEnd = groupStart + groupLength
  let smallestLength: number | null = null

  items.forEach((item) => {
    if (item.start >= groupEnd || itemEnd(item) <= groupStart) {
      return
    }

    const length = getItemSubdivisions(item)

    if (smallestLength === null || length < smallestLength) {
      smallestLength = length
    }
  })

  // No items in this group: default to quarter-note granularity (8 subdivisions)
  // so an empty 4/4 beat shows 1 quarter rest
  if (smallestLength === null || smallestLength >= 8) {
    return 8
  }

  if (smallestLength >= 4) {
    return 4
  }

  if (smallestLength >= 2) {
    return 2
  }

  return 1
}

function getPlaceholderDurationForLength(length: number): {
  baseDuration: RenderDuration
  dots: 0 | 1
} {
  // Check large values first (descending order is critical)
  if (length >= 32) {
    return { baseDuration: 'w', dots: 0 }
  }

  if (length >= 24) {
    return { baseDuration: 'h', dots: 1 }
  }

  if (length >= 16) {
    return { baseDuration: 'h', dots: 0 }
  }

  if (length >= 12) {
    return { baseDuration: 'q', dots: 1 }
  }

  if (length >= 8) {
    return { baseDuration: 'q', dots: 0 }
  }

  if (length >= 6) {
    return { baseDuration: '8', dots: 1 }
  }

  if (length >= 4) {
    return { baseDuration: '8', dots: 0 }
  }

  if (length >= 3) {
    return { baseDuration: '16', dots: 1 }
  }

  if (length >= 2) {
    return { baseDuration: '16', dots: 0 }
  }

  return { baseDuration: '32', dots: 0 }
}

function isPowerOfTwoLength(length: number) {
  return length > 0 && (length & (length - 1)) === 0
}

function hasBlockingNoteInRange(
  items: ScoreItem[],
  start: number,
  end: number,
) {
  return items.some(
    (item) =>
      item.kind === 'note' &&
      rangesOverlap(item.start, itemEnd(item), start, end),
  )
}

function isRangeFilledByNotes(
  items: ScoreItem[],
  start: number,
  end: number,
) {
  let subdivision = start

  while (subdivision < end) {
    const item = findCoveringItem(items, subdivision)
    if (!item || item.kind !== 'note') {
      return false
    }

    subdivision = Math.min(itemEnd(item), end)
  }

  return true
}

function canUseProgressivePlaceholderPlan(
  items: ScoreItem[],
  groupStart: number,
  groupLength: number,
  selectedLength: number,
  subdivisionsPerMeasure: number,
) {
  const groupEnd = Math.min(groupStart + groupLength, subdivisionsPerMeasure)
  const effectiveGroupLength = groupEnd - groupStart

  if (
    !isPowerOfTwoLength(effectiveGroupLength) ||
    !isPowerOfTwoLength(selectedLength) ||
    selectedLength > effectiveGroupLength
  ) {
    return false
  }

  return items
    .filter(
      (item) =>
        item.kind === 'note' &&
        rangesOverlap(item.start, itemEnd(item), groupStart, groupEnd),
    )
    .every(
      (item) =>
        item.start % selectedLength === 0 &&
        getItemSubdivisions(item) % selectedLength === 0,
    )
}

function buildProgressivePlaceholderSegments(
  items: ScoreItem[],
  start: number,
  length: number,
  selectedLength: number,
): Array<{ length: number; start: number }> {
  const end = start + length

  if (!hasBlockingNoteInRange(items, start, end)) {
    if (length <= selectedLength) {
      return [{ length, start }]
    }

    const half = length / 2
    if (!Number.isInteger(half) || half < selectedLength) {
      return [{ length, start }]
    }

    return [
      ...buildProgressivePlaceholderSegments(items, start, half, selectedLength),
      { length: half, start: start + half },
    ]
  }

  if (isRangeFilledByNotes(items, start, end) || length <= 1) {
    return []
  }

  const half = length / 2
  if (!Number.isInteger(half) || half < 1) {
    return []
  }

  const leftStart = start
  const rightStart = start + half
  const leftEnd = rightStart
  const rightEnd = end
  const leftSegments = buildProgressivePlaceholderSegments(
    items,
    leftStart,
    half,
    selectedLength,
  )
  const rightSegments =
    isRangeFilledByNotes(items, leftStart, leftEnd) ||
    hasBlockingNoteInRange(items, rightStart, rightEnd)
      ? buildProgressivePlaceholderSegments(items, rightStart, half, selectedLength)
      : [{ length: half, start: rightStart }]

  return [...leftSegments, ...rightSegments]
}

function buildProgressivePlaceholderPlan(
  items: ScoreItem[],
  groupStart: number,
  groupLength: number,
  selectedLength: number,
  subdivisionsPerMeasure: number,
) {
  if (
    !canUseProgressivePlaceholderPlan(
      items,
      groupStart,
      groupLength,
      selectedLength,
      subdivisionsPerMeasure,
    )
  ) {
    return null
  }

  return new Map(
    buildProgressivePlaceholderSegments(items, groupStart, groupLength, selectedLength).map(
      (segment) => [segment.start, segment.length],
    ),
  )
}

function getFocusedPlaceholderLength(
  items: ScoreItem[],
  subdivision: number,
  subdivisionsPerMeasure: number,
  focusedDurationLength: number,
  cursorSubdivision: number | null,
  groupStart: number,
  groupLength: number,
) {
  const nextStart = findNextStartingItem(items, subdivision - 1)?.start ?? subdivisionsPerMeasure
  const groupEnd = groupStart + groupLength
  const maxLength = Math.max(1, Math.min(nextStart - subdivision, groupEnd - subdivision))
  const preferredLength = focusedDurationLength

  let bestL = 1
  for (const L of [32, 16, 8, 4, 2, 1]) {
    if (L <= maxLength && subdivision % L === 0) {
      if (L <= preferredLength) {
        bestL = L
        break
      } else {
        const cursorInside = cursorSubdivision !== null && 
                             cursorSubdivision >= subdivision && 
                             cursorSubdivision < subdivision + L
        if (!cursorInside) {
          bestL = L
          break
        }
      }
    }
  }

  return bestL
}

function getPlaceholderLength(
  items: ScoreItem[],
  subdivision: number,
  subdivisionsPerMeasure: number,
  groupSubdivisionLengths: number[],
) {
  const groupInfo = getSubdivisionGroupInfo(subdivision, groupSubdivisionLengths)
  const groupStart = groupInfo.start
  const groupEnd = Math.min(groupStart + groupInfo.length, subdivisionsPerMeasure)
  const nextStart = findNextStartingItem(items, subdivision - 1)?.start ?? subdivisionsPerMeasure
  const maxLength = Math.max(1, Math.min(nextStart - subdivision, groupEnd - subdivision))
  const preferredLength = getGroupPlaceholderLength(items, groupStart, groupInfo.length)

  let bestL = 1
  for (const L of [32, 16, 8, 4, 2, 1]) {
    if (L <= maxLength && subdivision % L === 0) {
      if (L <= preferredLength) {
        bestL = L
        break
      }
    }
  }

  return bestL
}

function buildStaffVoiceData(
  items: ScoreItem[],
  staffId: StaffId,
  keySignature: KeySignatureSpec,
  activeItemId: string | null,
  eraseHoverItemId: string | null,
  noteRegistry: Map<string, { item: NoteItem; note: StaveNote }>,
  subdivisionsPerMeasure: number,
  groupSubdivisionLengths: number[],
  measureIndex: number,
  placeholderFocus: PlaceholderFocus | null,
  focusedDurationLength: number,
  cursorSubdivision: number | null,
) {
  const notes: StaveNote[] = []
  const lengths: number[] = []
  const starts: number[] = []
  let subdivision = 0
  const focusedGroupStart =
    placeholderFocus?.measureIndex === measureIndex &&
      placeholderFocus.staffId === staffId
      ? placeholderFocus.groupStart
      : null
  const focusedGroupLength =
    focusedGroupStart !== null
      ? getSubdivisionGroupInfo(focusedGroupStart, groupSubdivisionLengths).length
      : null
  // Progressive rest expansion only applies to the armed/focused beat group.
  // Non-focused groups default to quarter-rest granularity for a cleaner look.
  const focusedPlaceholderPlan =
    focusedGroupStart !== null && focusedGroupLength !== null
      ? buildProgressivePlaceholderPlan(
        items,
        focusedGroupStart,
        focusedGroupLength,
        focusedDurationLength,
        subdivisionsPerMeasure,
      )
      : null

  while (subdivision < subdivisionsPerMeasure) {
    const item = findStartingItem(items, subdivision)

    if (item) {
      const isItemHighlighted = cursorSubdivision !== null && item.start === cursorSubdivision
      lengths.push(getItemSubdivisions(item))
      starts.push(item.start)
      notes.push(
        createVisualNote(
          item,
          staffId,
          keySignature,
          activeItemId,
          eraseHoverItemId,
          noteRegistry,
          isItemHighlighted,
        ),
      )
      subdivision += getItemSubdivisions(item)
      continue
    }

    const groupInfo = getSubdivisionGroupInfo(subdivision, groupSubdivisionLengths)
    const isFocusedGroup =
      focusedGroupStart !== null &&
      subdivision >= focusedGroupStart &&
      subdivision < focusedGroupStart + groupInfo.length

    const progressivePlaceholderLength =
      isFocusedGroup && focusedPlaceholderPlan?.has(subdivision)
        ? focusedPlaceholderPlan.get(subdivision) ?? null
        : null
    const placeholderLength =
      progressivePlaceholderLength ??
      (isFocusedGroup
        ? getFocusedPlaceholderLength(
        items,
        subdivision,
        subdivisionsPerMeasure,
        focusedDurationLength,
        cursorSubdivision,
        focusedGroupStart!,
        groupInfo.length,
      )
        : getPlaceholderLength(items, subdivision, subdivisionsPerMeasure, groupSubdivisionLengths))
    const placeholderDuration = getPlaceholderDurationForLength(placeholderLength)
    const isHighlighted = cursorSubdivision !== null && subdivision === cursorSubdivision
    lengths.push(placeholderLength)
    starts.push(subdivision)
    notes.push(
      createPlaceholder(
        placeholderDuration.baseDuration,
        staffId,
        NOTE_COLOR,
        isHighlighted,
        placeholderDuration.dots,
      ),
    )
    subdivision += placeholderLength
  }

  return {
    anchorNotes: createAnchorNotes(subdivisionsPerMeasure),
    lengths,
    notes,
    starts,
  }
}

function buildDurationGlyph(
  baseDuration: BaseDuration,
  dotted: boolean,
  className = 'tool-glyph',
) {
  return (
    <span className={`${className} ${className}--${baseDuration}`}>
      <span className={`${className}__head`} />
      {baseDuration !== 'w' ? <span className={`${className}__stem`} /> : null}
      {baseDuration === '8' || baseDuration === '16' || baseDuration === '32' ? (
        <span className={`${className}__flag ${className}__flag--1`} />
      ) : null}
      {baseDuration === '16' || baseDuration === '32' ? (
        <span className={`${className}__flag ${className}__flag--2`} />
      ) : null}
      {baseDuration === '32' ? (
        <span className={`${className}__flag ${className}__flag--3`} />
      ) : null}
      {dotted ? <span className={`${className}__dot`} /> : null}
    </span>
  )
}

function resolveClosestSubdivision(xBySubdivision: number[], x: number) {
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY

  xBySubdivision.forEach((anchorX, index) => {
    const distance = Math.abs(anchorX - x)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })

  return bestIndex
}

function getStaffHitBounds(stave: Stave, staffId: StaffId) {
  const topLineY = stave.getYForLine(0)
  const spacing = stave.getSpacingBetweenLines()
  const diatonicStep = spacing / 2
  const pitchPool =
    staffId === 'treble' ? TREBLE_PITCHES_FROM_TOP : BASS_PITCHES_FROM_TOP
  const topLineIndex =
    staffId === 'treble' ? TREBLE_TOP_LINE_INDEX : BASS_TOP_LINE_INDEX

  return {
    hitBottom:
      topLineY + (pitchPool.length - topLineIndex - 0.25) * diatonicStep,
    hitTop: topLineY - (topLineIndex + 0.75) * diatonicStep,
  }
}

function getPreviewExtents(
  previewBaseDuration: BaseDuration,
  previewDotted: boolean,
) {
  const left = 10
  let right = 14

  switch (previewBaseDuration) {
    case '16':
    case '32':
      right = 18
      break
    case '8':
      right = 16
      break
    case 'h':
    case 'w':
      right = 12
      break
    default:
      right = 14
  }

  if (previewDotted) {
    right += 6
  }

  return { left, right }
}

function getTickableHorizontalMetrics(note: StaveNote) {
  const metrics = note.getMetrics()

  return {
    left: metrics.modLeftPx + metrics.leftDisplacedHeadPx,
    right: metrics.notePx + metrics.rightDisplacedHeadPx + metrics.modRightPx,
  }
}

function clampAnchorXToMeasure(
  anchorX: number,
  measureLeft: number,
  measureRight: number,
  leftExtent: number,
  rightExtent: number,
) {
  return Math.min(
    measureRight - rightExtent - MEASURE_EDGE_PADDING,
    Math.max(measureLeft + leftExtent + MEASURE_EDGE_PADDING, anchorX),
  )
}

function clampPreviewX(
  previewX: number,
  measureLeft: number,
  measureRight: number,
  previewBaseDuration: BaseDuration,
  previewDotted: boolean,
) {
  const { left, right } = getPreviewExtents(
    previewBaseDuration,
    previewDotted,
  )

  const offset = previewBaseDuration === '32' ? -10 : previewBaseDuration === '16' ? -6 : 0

  return Math.min(
    measureRight - right - MEASURE_EDGE_PADDING,
    Math.max(measureLeft + left + MEASURE_EDGE_PADDING, previewX + offset),
  )
}

function getPreviewXForSubdivisionRange(
  hitBox: Pick<MeasureHitBox, 'left' | 'right' | 'xBySubdivision'>,
  subdivision: number,
  previewBaseDuration: BaseDuration,
  previewDotted: boolean,
) {
  return clampPreviewX(
    getTickableAnchorX(
      hitBox.xBySubdivision,
      subdivision,
      hitBox.left,
    ),
    hitBox.left,
    hitBox.right,
    previewBaseDuration,
    previewDotted,
  )
}

function getScoreFrontPopoverWidth(kind: ScoreFrontPopover['kind']) {
  return kind === 'timeSignature'
    ? SCORE_FRONT_TIME_POPOVER_WIDTH
    : SCORE_FRONT_KEY_POPOVER_WIDTH
}

function haveSameScoreEndControlsLayout(
  left: ScoreEndControlsLayout | null,
  right: ScoreEndControlsLayout | null,
) {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  return left.bottom === right.bottom &&
    left.centerX === right.centerX &&
    left.top === right.top
}

function drawSystemMeasureNumber(
  context: VexRenderContext,
  systemLeftX: number,
  trebleStave: Stave,
  measureNumber: number,
) {
  const label = String(measureNumber)
  const textWidth = context.measureText(label).width
  const anchorX = systemLeftX + SYSTEM_MEASURE_NUMBER_OFFSET_X
  const textX = anchorX - textWidth
  const textY = trebleStave.getYForTopText(0) + SYSTEM_MEASURE_NUMBER_OFFSET_Y

  context.save()
  context.setFillStyle(NOTE_COLOR)
  context.setFont('Arial, sans-serif', SYSTEM_MEASURE_NUMBER_FONT_SIZE, '700')
  context.fillText(label, textX, textY)
  context.restore()
}

function getSystemStartTimeSignaturePadding(keySignature: KeySignatureSpec) {
  return keySignature === 'C' ? SYSTEM_NATURAL_KEY_PLACEHOLDER_PADDING : undefined
}

function applySystemStartFrontModifiers(
  trebleStave: Stave,
  bassStave: Stave,
  keySignature: KeySignatureSpec,
  timeSignature: TimeSignature,
) {
  const timeSignaturePadding = getSystemStartTimeSignaturePadding(keySignature)

  trebleStave.addClef('treble')
  bassStave.addClef('bass')

  if (keySignature !== 'C') {
    trebleStave.addKeySignature(keySignature)
    bassStave.addKeySignature(keySignature)
  }

  trebleStave.addTimeSignature(timeSignature, timeSignaturePadding)
  bassStave.addTimeSignature(timeSignature, timeSignaturePadding)
}

function getLinkedGrandStaffGridBounds(
  trebleStave: Stave,
  bassStave: Stave,
): GridBounds | null {
  const startX = Math.max(trebleStave.getNoteStartX(), bassStave.getNoteStartX())
  const endX = Math.min(trebleStave.getNoteEndX(), bassStave.getNoteEndX())

  return endX - startX > GRID_EDGE_PADDING * 2
    ? { endX, startX }
    : null
}

function getSystemFrontGeometry(stave: Stave) {
  const noteStartX = stave.getNoteStartX()
  const clef = stave.getModifiers(undefined, VFClef.CATEGORY)[0]
  const timeModifier = stave.getModifiers(undefined, VFTimeSignature.CATEGORY)[0]

  if (!clef || !timeModifier) {
    return null
  }

  const clefRight = clef.getX() + clef.getWidth()
  const timeLeft = timeModifier.getX()

  return {
    clefRight,
    noteStartX,
    timeLeft,
  }
}

function drawNaturalKeySignaturePlaceholder(
  context: VexRenderContext,
  trebleStave: Stave,
  bassStave: Stave,
  frontGeometry: NonNullable<ReturnType<typeof getSystemFrontGeometry>>,
) {
  const label = '\u266E'
  const slotCenterX = (frontGeometry.clefRight + frontGeometry.timeLeft) / 2

  context.save()
  context.setFillStyle('#475569')
  context.setFont('Arial, sans-serif', SYSTEM_NATURAL_KEY_PLACEHOLDER_FONT_SIZE, '700')

  for (const stave of [trebleStave, bassStave]) {
    const textWidth = context.measureText(label).width
    const textX = slotCenterX - textWidth / 2
    const textY = stave.getYForGlyphs() + SYSTEM_NATURAL_KEY_PLACEHOLDER_OFFSET_Y
    context.fillText(label, textX, textY)
  }

  context.restore()
}

function createScoreFrontHotspot(
  kind: ScoreFrontHotspot['kind'],
  measureIndex: number,
  systemTop: number,
  rawLeft: number,
  rawRight: number,
  minWidth: number,
  bounds?: {
    maxRight?: number
    minLeft?: number
  },
) {
  let left = rawLeft - SCORE_FRONT_HOTSPOT_PAD_X
  let right = rawRight + SCORE_FRONT_HOTSPOT_PAD_X

  if (bounds?.minLeft !== undefined) {
    left = Math.max(left, bounds.minLeft)
  }

  if (bounds?.maxRight !== undefined) {
    right = Math.min(right, bounds.maxRight)
  }

  if (right - left < minWidth) {
    const center = (rawLeft + rawRight) / 2
    left = center - minWidth / 2
    right = center + minWidth / 2

    if (bounds?.minLeft !== undefined && left < bounds.minLeft) {
      right += bounds.minLeft - left
      left = bounds.minLeft
    }

    if (bounds?.maxRight !== undefined && right > bounds.maxRight) {
      left -= right - bounds.maxRight
      right = bounds.maxRight
    }
  }

  if (bounds?.minLeft !== undefined) {
    left = Math.max(left, bounds.minLeft)
  }

  if (bounds?.maxRight !== undefined) {
    right = Math.min(right, bounds.maxRight)
  }

  return {
    height: SCORE_FRONT_HOTSPOT_HEIGHT,
    kind,
    left,
    measureIndex,
    top: systemTop,
    width: Math.max(1, right - left),
  } satisfies ScoreFrontHotspot
}

function buildScoreFrontHotspots(
  systems: ReturnType<typeof buildSystems>,
  scoreTop: number,
  scoreWidth: number,
  keySignature: KeySignatureSpec,
  timeSignature: TimeSignature,
) {
  const targetSystemWidth = scoreWidth - SYSTEM_SIDE_PADDING * 2

  return systems.flatMap((system, systemIndex) => {
    const firstEntry = system[0]

    if (!firstEntry) {
      return []
    }

    const rawSystemWidth = system.reduce((sum, entry) => sum + entry.width, 0)
    const widthMultiplier = targetSystemWidth / rawSystemWidth
    const renderedSystemWidth = rawSystemWidth * widthMultiplier
    const systemLeft =
      SYSTEM_SIDE_PADDING + Math.max(0, (targetSystemWidth - renderedSystemWidth) / 2)
    const firstMeasureWidth = firstEntry.width * widthMultiplier
    const trebleY = scoreTop + systemIndex * SYSTEM_GAP_Y
    const systemTop = trebleY - 12
    const stave = new Stave(systemLeft, trebleY, firstMeasureWidth)
    stave.addClef('treble')

    if (keySignature !== 'C') {
      stave.addKeySignature(keySignature)
    }

    stave.addTimeSignature(timeSignature, getSystemStartTimeSignaturePadding(keySignature))
    stave.format()

    const frontGeometry = getSystemFrontGeometry(stave)

    if (!frontGeometry) {
      return []
    }

    const timeBoundaryLeft = frontGeometry.timeLeft - 2
    const hotspots: ScoreFrontHotspot[] = []

    hotspots.push(
      createScoreFrontHotspot(
        'keySignature',
        firstEntry.measureIndex,
        systemTop,
        frontGeometry.clefRight + 4,
        frontGeometry.timeLeft - 4,
        SCORE_FRONT_KEY_MIN_WIDTH,
        {
          maxRight: timeBoundaryLeft,
          minLeft: frontGeometry.clefRight + 2,
        },
      ),
    )

    hotspots.push(
      createScoreFrontHotspot(
        'timeSignature',
        firstEntry.measureIndex,
        systemTop,
        frontGeometry.timeLeft,
        frontGeometry.noteStartX,
        SCORE_FRONT_TIME_MIN_WIDTH,
        {
          minLeft: timeBoundaryLeft,
        },
      ),
    )

    return hotspots
  })
}

function applyFixedSubdivisionGrid(
  stave: Stave,
  anchorNotes: GhostNote[],
  groupUnits: number[],
  groupSubdivisionLengths: number[],
  noteAreaWidth: number,
  gridBounds?: GridBounds | null,
) {
  const stavePadding = Metrics.get('Stave.padding', 0)
  const gridStartX = gridBounds?.startX ?? stave.getNoteStartX()
  const gridEndX = gridBounds?.endX ?? stave.getNoteEndX()
  const totalUnits = groupUnits.reduce((sum, units) => sum + units, 0)
  const usableWidth = Math.max(
    1,
    Math.min(
      noteAreaWidth,
      gridEndX - gridStartX,
    ) - GRID_EDGE_PADDING * 2,
  )
  const unitWidth = usableWidth / Math.max(totalUnits, 1)
  const groupOffsets: number[] = []
  let accumulatedOffset = GRID_EDGE_PADDING

  groupUnits.forEach((units) => {
    groupOffsets.push(accumulatedOffset)
    accumulatedOffset += units * unitWidth
  })

  return anchorNotes.map((note, subdivision) => {
    const groupInfo = getSubdivisionGroupInfo(subdivision, groupSubdivisionLengths)
    const groupOffset = groupOffsets[groupInfo.index] ?? GRID_EDGE_PADDING
    const unitsInGroup = groupUnits[groupInfo.index] ?? DEFAULT_GROUP_VISUAL_UNITS
    const subdivisionWidth = (unitsInGroup * unitWidth) / Math.max(groupInfo.length, 1)
    const relativeX =
      groupOffset +
      subdivisionWidth * (subdivision - groupInfo.start) +
      subdivisionWidth / 2
    const absoluteX = gridStartX + stavePadding + relativeX
    const tickX = absoluteX - stave.getNoteStartX() - stavePadding
    note.getTickContext().setX(tickX)
    return absoluteX
  })
}

function positionTickablesOnGrid(
  stave: Stave,
  notes: StaveNote[],
  _lengths: number[],
  starts: number[],
  xBySubdivision: number[],
  gridBounds?: GridBounds | null,
) {
  const stavePadding = Metrics.get('Stave.padding', 0)
  const measureLeft = gridBounds?.startX ?? stave.getNoteStartX()
  const measureRight = gridBounds?.endX ?? stave.getNoteEndX()

  notes.forEach((note, index) => {
    const subdivision = starts[index] ?? 0
    const anchorX =
      getTickableAnchorX(
        xBySubdivision,
        subdivision,
        measureLeft,
      )
    const { left, right } = getTickableHorizontalMetrics(note)
    const clampedAnchorX = clampAnchorXToMeasure(
      anchorX,
      measureLeft,
      measureRight,
      left,
      right,
    )
    const relativeX = clampedAnchorX - stave.getNoteStartX() - stavePadding
    note.getTickContext().setX(relativeX)
  })
}

function getTickableAnchorX(
  xBySubdivision: number[],
  subdivision: number,
  fallbackX: number,
) {
  return xBySubdivision[subdivision] ?? xBySubdivision[0] ?? fallbackX
}

function measureLyricTextWidth(
  context: VexRenderContext,
  text: string,
  fontSize: number,
) {
  context.save()
  context.setFont(LYRIC_FONT_FAMILY, fontSize, '400')
  const width = context.measureText(text).width
  context.restore()
  return width
}

function renderLyricsToSvg(
  svg: SVGSVGElement,
  context: VexRenderContext,
  lyricTokens: LyricLayoutToken[],
) {
  if (lyricTokens.length === 0) {
    return
  }

  const lyricLayer = document.createElementNS(SVG_NS, 'g')
  lyricLayer.setAttribute('data-layer', 'lyrics')

  const systems = new Map<number, LyricLayoutToken[]>()
  lyricTokens.forEach((token) => {
    const normalizedText = token.text.replace(/\s+/g, ' ').trim()
    if (!normalizedText) {
      return
    }

    const existing = systems.get(token.systemIndex)
    if (existing) {
      existing.push({ ...token, text: normalizedText })
      return
    }

    systems.set(token.systemIndex, [{ ...token, text: normalizedText }])
  })

  Array.from(systems.entries())
    .sort(([left], [right]) => left - right)
    .forEach(([, systemTokens]) => {
      const sortedTokens = [...systemTokens].sort((left, right) => {
        if (left.measureIndex !== right.measureIndex) {
          return left.measureIndex - right.measureIndex
        }
        return left.anchorX - right.anchorX
      })

      sortedTokens.forEach((token, index) => {
        const previous = sortedTokens[index - 1]
        const next = sortedTokens[index + 1]
        const segmentLeft =
          previous && previous.measureIndex === token.measureIndex
            ? Math.max(token.measureLeft, (previous.anchorX + token.anchorX) / 2)
            : token.measureLeft
        const segmentRight =
          next && next.measureIndex === token.measureIndex
            ? Math.min(token.measureRight, (token.anchorX + next.anchorX) / 2)
            : token.measureRight
        const availableWidth = Math.max(
          LYRIC_MIN_SEGMENT_WIDTH,
          segmentRight - segmentLeft - LYRIC_SEGMENT_PADDING * 2,
        )

        let fontSize = LYRIC_FONT_SIZE
        let textWidth = measureLyricTextWidth(context, token.text, fontSize)

        while (fontSize > LYRIC_MIN_FONT_SIZE && textWidth > availableWidth) {
          fontSize -= 1
          textWidth = measureLyricTextWidth(context, token.text, fontSize)
        }

        const textNode = document.createElementNS(SVG_NS, 'text')
        textNode.setAttribute('x', String((segmentLeft + segmentRight) / 2))
        textNode.setAttribute('y', String(token.y))
        textNode.setAttribute('dominant-baseline', 'middle')
        textNode.setAttribute('fill', NOTE_COLOR)
        textNode.setAttribute('font-family', LYRIC_FONT_FAMILY)
        textNode.setAttribute('font-size', String(fontSize))
        textNode.setAttribute('text-anchor', 'middle')

        if (textWidth > availableWidth) {
          textNode.setAttribute('lengthAdjust', 'spacingAndGlyphs')
          textNode.setAttribute('textLength', String(availableWidth))
        }

        textNode.textContent = token.text
        lyricLayer.appendChild(textNode)
      })
    })

  svg.appendChild(lyricLayer)
}

function HoverRestIndicator({
  hitBoxes,
  position,
}: {
  hitBoxes: MeasureHitBox[]
  position: HoveredRestPosition
}) {
  const hitBox = hitBoxes.find(
    (box) =>
      box.index === position.measureIndex &&
      box.staffId === position.staffId,
  )

  if (!hitBox) {
    return null
  }

  const anchorX = hitBox.xBySubdivision[position.subdivision]

  if (anchorX === undefined) {
    return null
  }

  const indicatorY =
    position.staffId === 'treble'
      ? hitBox.topLineY + hitBox.spacing * 5.5
      : hitBox.topLineY + hitBox.spacing * 5.5

  return (
    <div
      className="hover-rest-indicator"
      style={{ left: `${anchorX}px`, top: `${indicatorY}px` }}
    >
      <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8 0C8 0 0 8 0 12C0 15.3137 3.58172 18 8 18C12.4183 18 16 15.3137 16 12C16 8 8 0 8 0Z"
          fill="#2563eb"
          fillOpacity="0.85"
        />
      </svg>
    </div>
  )
}

function PendingInsertIndicator({
  baseDuration,
  dotted,
  hitBoxes,
  noteRegistry,
  position,
}: {
  baseDuration: BaseDuration
  dotted: boolean
  hitBoxes: MeasureHitBox[]
  noteRegistry: Map<string, { item: NoteItem; note: StaveNote }>
  position: PendingInsertPreview
}) {
  const hitBox = hitBoxes.find(
    (box) =>
      box.index === position.measureIndex &&
      box.staffId === position.staffId,
  )
  const previewAnchorNote = position.anchorItemId
    ? noteRegistry.get(position.anchorItemId)
    : undefined
  const previewX =
    previewAnchorNote?.note.getCenterGlyphX() ??
    (hitBox
      ? getPreviewXForSubdivisionRange(
        hitBox,
        position.subdivision,
        baseDuration,
        dotted,
      )
      : 0)
  const previewY = hitBox
    ? pitchToY(
      position.pitch,
      hitBox.topLineY,
      hitBox.spacing,
      hitBox.staffId,
    )
    : 0

  const ledgerLines: number[] = []

  if (hitBox) {
    const topLineY = hitBox.topLineY
    const bottomLineY = topLineY + hitBox.spacing * 4

    if (previewY < topLineY - hitBox.spacing * 0.25) {
      for (
        let lineY = topLineY - hitBox.spacing;
        lineY >= previewY - hitBox.spacing * 0.5;
        lineY -= hitBox.spacing
      ) {
        ledgerLines.push(lineY)
      }
    } else if (previewY > bottomLineY + hitBox.spacing * 0.25) {
      for (
        let lineY = bottomLineY + hitBox.spacing;
        lineY <= previewY + hitBox.spacing * 0.5;
        lineY += hitBox.spacing
      ) {
        ledgerLines.push(lineY)
      }
    }
  }

  return (
    <>
      {ledgerLines.map((lineY) => (
        <div
          key={lineY}
          className="pending-note-preview__ledger"
          style={{ left: `${previewX}px`, top: `${lineY}px` }}
        />
      ))}
      <div
        className="pending-note-preview"
        style={{ left: `${previewX}px`, top: `${previewY}px` }}
      />
    </>
  )
}

function App() {
  const pdfRenderJobId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get(PDF_JOB_SEARCH_PARAM)
      : null
  const isPdfRenderMode = pdfRenderJobId !== null
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(true)
  const scoreRef = useRef<HTMLDivElement | null>(null)
  const pdfSystemBoundsRef = useRef<PdfSystemBound[]>([])
  const scoreContainerRef = useRef<HTMLElement | null>(null)
  const [availableScoreWidth, setAvailableScoreWidth] = useState(SYSTEM_WRAP_WIDTH)
  const tempoPanelRef = useRef<HTMLDivElement | null>(null)
  const fileMenuRef = useRef<HTMLDivElement | null>(null)
  const hitBoxesRef = useRef<MeasureHitBox[]>([])
  const noteRegistryRef = useRef<Map<string, { item: NoteItem; note: StaveNote }>>(new Map())
  const pianoRef = useRef<Tone.Sampler | null>(null)
  const pianoLoaderRef = useRef<Promise<Tone.Sampler> | null>(null)
  const previewSynthRef = useRef<Tone.Synth | null>(null)
  const metronomeSynthRef = useRef<Tone.Synth | null>(null)
  const playbackTimerRef = useRef<number | null>(null)
  const playheadAnimationRef = useRef<number | null>(null)
  const playbackStartRef = useRef<number | null>(null)
  const playbackDurationRef = useRef(0)
  const scheduledTransportEventsRef = useRef<number[]>([])
  const [measures, setMeasures] = useState<MeasureData[]>(() =>
    isPdfRenderMode ? [createMeasure('measure-1')] : createFurEliseMeasures(),
  )
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(isPdfRenderMode ? '4/4' : '3/4')
  const [timeSignatureGrouping, setTimeSignatureGrouping] = useState<number[] | null>(null)
  const [keySignature, setKeySignature] = useState<KeySignatureSpec>('C')
  const [grandStaffLayoutMode, setGrandStaffLayoutMode] = useState<CompositionLayoutMode>('independent')
  const [transposeOnKeyChange, setTransposeOnKeyChange] = useState(false)
  const [activeTab, setActiveTab] = useState<ToolbarTab>('notes')
  const [mode, setMode] = useState<EditMode>('note')
  const [baseDuration, setBaseDuration] = useState<BaseDuration>('8')
  const [dotted, setDotted] = useState(false)
  const [accidental, setAccidental] = useState<AccidentalType | null>(null)
  const [tempoBpm, setTempoBpm] = useState(isPdfRenderMode ? 80 : 72)
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false)
  const [isTempoPanelOpen, setIsTempoPanelOpen] = useState(false)
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false)
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [eraseHoverItemId, setEraseHoverItemId] = useState<string | null>(null)
  const [placeholderFocus, setPlaceholderFocus] = useState<PlaceholderFocus | null>(
    null,
  )
  const [hoveredRestPosition, setHoveredRestPosition] = useState<HoveredRestPosition | null>(null)
  const [pendingInsertPreview, setPendingInsertPreview] = useState<PendingInsertPreview | null>(null)
  const [chordHoverPreview, setChordHoverPreview] = useState<PendingInsertPreview | null>(null)
  const [slurs, setSlurs] = useState<ScoreSlur[]>([])
  const [pendingSlurSelection, setPendingSlurSelection] = useState<PendingSlurSelection | null>(null)
  const [scoreFrontPopover, setScoreFrontPopover] = useState<ScoreFrontPopover | null>(null)
  const [playhead, setPlayhead] = useState<PlayheadState | null>(null)
  const [status, setStatus] = useState(
    isPdfRenderMode
      ? 'Preparing backend PDF export...'
      : 'Click a rest slot once to arm note insertion, then click again to place the note.',
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [lyricsInput, setLyricsInput] = useState('')
  const [scoreTitle, setScoreTitle] = useState(isPdfRenderMode ? '' : 'F\u00fcr Elise')
  const [scoreSubtitle, setScoreSubtitle] = useState('')
  const [scoreComposer, setScoreComposer] = useState(isPdfRenderMode ? '' : 'Ludwig van Beethoven')
  const [scoreLyricist, setScoreLyricist] = useState('')
  const [scoreArranger, setScoreArranger] = useState('')
  const [activeMeasureIndex, setActiveMeasureIndex] = useState(0)
  const [measureTempoInput, setMeasureTempoInput] = useState(String(tempoBpm))
  const [timeSignatureNumeratorInput, setTimeSignatureNumeratorInput] = useState('3')
  const [timeSignatureDenominatorInput, setTimeSignatureDenominatorInput] = useState<'2' | '4' | '8' | '16'>('4')
  const [timeSignatureGroupingInput, setTimeSignatureGroupingInput] = useState('')
  const [helpCard, setHelpCard] = useState<HelpCard | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImportingMusicXml, setIsImportingMusicXml] = useState(false)
  const [isPdfRenderJobReady, setIsPdfRenderJobReady] = useState(!isPdfRenderMode)
  const [scoreEndControlsLayout, setScoreEndControlsLayout] = useState<ScoreEndControlsLayout | null>(null)
  const [exportDialog, setExportDialog] = useState<{ filename: string } | null>(null)
  const [saveDialog, setSaveDialog] = useState<{ name: string } | null>(null)
  const [savedCompositionSnapshot, setSavedCompositionSnapshot] = useState<SavedCompositionSnapshot | null>(
    () => readSavedCompositionSnapshot(),
  )
  const exportFilenameInputRef = useRef<HTMLInputElement | null>(null)
  const saveFilenameInputRef = useRef<HTMLInputElement | null>(null)
  const importMusicXmlInputRef = useRef<HTMLInputElement | null>(null)

  const meterDefinition = useMemo(
    () => parseTimeSignature(timeSignature, timeSignatureGrouping),
    [timeSignature, timeSignatureGrouping],
  )
  const systems = useMemo(
    () => buildSystems(
      measures,
      timeSignature,
      timeSignatureGrouping,
      availableScoreWidth,
      true,  // always align grand staff by beat
    ),
    [availableScoreWidth, measures, timeSignature, timeSignatureGrouping],
  )
  const subdivisionsPerMeasure = useMemo(
    () => meterDefinition.subdivisionsPerMeasure,
    [meterDefinition],
  )
  const measureTempoTimeline = useMemo(
    () => getMeasureTempoTimeline(measures, timeSignature, tempoBpm),
    [measures, tempoBpm, timeSignature],
  )
  const scoreTop = SCORE_CANVAS_TOP
  const scoreWidth = Math.max(SCORE_MIN_SURFACE_WIDTH, availableScoreWidth)
  const scoreHeight =
    scoreTop +
    (systems.length - 1) * SYSTEM_GAP_Y +
    GRAND_STAFF_GAP +
    120 +
    SCORE_PADDING_BOTTOM
  const scoreFrontHotspots = useMemo<ScoreFrontHotspot[]>(
    () => buildScoreFrontHotspots(systems, scoreTop, scoreWidth, keySignature, timeSignature),
    [keySignature, scoreTop, scoreWidth, systems, timeSignature],
  )
  const selectedDurationLength = getDurationSubdivisions(baseDuration, dotted)
  const selectedDurationName = getDurationName(baseDuration, dotted)
  const activeSelection = useMemo(() => {
    if (!activeItemId) {
      return null
    }

    for (const [measureIndex, measure] of measures.entries()) {
      for (const staffId of STAFF_IDS) {
        const match = getItemsForStaff(measure, staffId).find(
          (item) => item.id === activeItemId && item.kind === 'note',
        )

        if (match?.kind === 'note') {
          return {
            measureIndex,
            note: match,
            staffId,
          }
        }
      }
    }

    return null
  }, [activeItemId, measures])
  const activeNote = activeSelection?.note ?? null
  const activeTabMeta = TOOLBAR_TABS.find((tab) => tab.id === activeTab) ?? TOOLBAR_TABS[0]
  const activeTabTips = TAB_SIDEBAR_TIPS[activeTab]
  const activeKeySignatureLabel = getKeySignatureDisplayLabel(keySignature)
  const activeNoteLabel = activeNote
    ? getPitchLabels(activeNote.pitches, activeNote.accidentals, keySignature)
    : 'No note selected'
  const boundedActiveMeasureIndex = Math.min(activeMeasureIndex, Math.max(measures.length - 1, 0))
  const activeMeasure = measures[boundedActiveMeasureIndex] ?? null
  const activeMeasureTempo = activeMeasure
    ? getEffectiveMeasureTempo(measures, boundedActiveMeasureIndex, tempoBpm)
    : tempoBpm
  const visibleHelpCard = helpCard ?? getToolbarTabHelp(activeTab)
  useEffect(() => {
    const noteIds = new Set(
      measures.flatMap((measure) =>
        STAFF_IDS.flatMap((staffId) =>
          getItemsForStaff(measure, staffId)
            .filter((item): item is NoteItem => item.kind === 'note')
            .map((item) => item.id),
        ),
      ),
    )

    setSlurs((current) => {
      const filtered = current.filter(
        (slur) => noteIds.has(slur.fromNoteId) && noteIds.has(slur.toNoteId),
      )
      return filtered.length === current.length ? current : filtered
    })
    setPendingSlurSelection((current) =>
      current && noteIds.has(current.noteId) ? current : null,
    )
  }, [measures])

  useEffect(() => {
    const defaultMeter = parseTimeSignature(meterDefinition.display)
    setTimeSignatureNumeratorInput(String(meterDefinition.numerator))
    setTimeSignatureDenominatorInput(String(meterDefinition.denominator) as '2' | '4' | '8' | '16')
    setTimeSignatureGroupingInput(
      TIME_SIGNATURE_OPTIONS.some((option) => option.value === meterDefinition.display) &&
        haveSameNumberSequence(meterDefinition.grouping, defaultMeter.grouping)
        ? ''
        : formatGroupingInput(meterDefinition.grouping),
    )
  }, [meterDefinition])

  useEffect(() => {
    return () => {
      if (playbackTimerRef.current !== null) {
        window.clearTimeout(playbackTimerRef.current)
      }

      if (playheadAnimationRef.current !== null) {
        window.cancelAnimationFrame(playheadAnimationRef.current)
      }

      Tone.Transport.stop()
      Tone.Transport.cancel(0)
      pianoRef.current?.dispose()
      previewSynthRef.current?.dispose()
      metronomeSynthRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (!isTempoPanelOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        tempoPanelRef.current &&
        !tempoPanelRef.current.contains(event.target as Node)
      ) {
        setIsTempoPanelOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isTempoPanelOpen])

  useEffect(() => {
    if (!isFileMenuOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        fileMenuRef.current &&
        !fileMenuRef.current.contains(event.target as Node)
      ) {
        setIsFileMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isFileMenuOpen])

  useEffect(() => {
    const container = scoreContainerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = Math.floor(entry.contentRect.width) - 48
        setAvailableScoreWidth(Math.max(newWidth, 320))
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [isToolbarExpanded])
  useEffect(() => {
    setLyricsInput(activeNote?.lyrics ?? '')
  }, [activeNote?.id, activeNote?.lyrics])

  useEffect(() => {
    setActiveMeasureIndex((current) => Math.min(current, Math.max(measures.length - 1, 0)))
  }, [measures.length])

  useEffect(() => {
    setMeasureTempoInput(String(activeMeasureTempo))
  }, [activeMeasureTempo, boundedActiveMeasureIndex])

  function clearScheduledPlayback() {
    scheduledTransportEventsRef.current.forEach((eventId) => {
      Tone.Transport.clear(eventId)
    })
    scheduledTransportEventsRef.current = []
    Tone.Transport.stop()
    Tone.Transport.cancel(0)
  }

  function stopPlaybackVisuals() {
    if (playbackTimerRef.current !== null) {
      window.clearTimeout(playbackTimerRef.current)
      playbackTimerRef.current = null
    }

    if (playheadAnimationRef.current !== null) {
      window.cancelAnimationFrame(playheadAnimationRef.current)
      playheadAnimationRef.current = null
    }

    playbackStartRef.current = null
    playbackDurationRef.current = 0
    setPlayhead(null)
  }

  function startPlayheadAnimation(totalDuration: number) {
    stopPlaybackVisuals()
    playbackDurationRef.current = totalDuration
    playbackStartRef.current =
      performance.now() + PLAYBACK_START_DELAY_SECONDS * 1000

    const updatePlayhead = () => {
      const startedAt = playbackStartRef.current
      if (startedAt === null) {
        return
      }

      const elapsedSeconds = Math.max(0, (performance.now() - startedAt) / 1000)
      const nextPlayhead = getPlayheadState(
        hitBoxesRef.current,
        Math.min(elapsedSeconds, playbackDurationRef.current),
        measureTempoTimeline,
        subdivisionsPerMeasure,
      )

      setPlayhead(nextPlayhead)

      if (elapsedSeconds < playbackDurationRef.current) {
        playheadAnimationRef.current = window.requestAnimationFrame(updatePlayhead)
      } else {
        playheadAnimationRef.current = null
      }
    }

    playheadAnimationRef.current = window.requestAnimationFrame(updatePlayhead)
  }

  useEffect(() => {
    const host = scoreRef.current
    if (!host) {
      return
    }

    host.innerHTML = ''

    const renderer = new Renderer(host, Renderer.Backends.SVG)
    renderer.resize(scoreWidth, scoreHeight)

    const context = renderer.getContext()
    const noteRegistry = new Map<string, { item: NoteItem; note: StaveNote }>()
    const hitBoxes: MeasureHitBox[] = []
    const lyricTokens: LyricLayoutToken[] = []
    const renderedPdfSystemBounds: PdfSystemBound[] = []
    let renderedScoreEndControlsLayout: ScoreEndControlsLayout | null = null

    const targetSystemWidth = scoreWidth - SYSTEM_SIDE_PADDING * 2

    systems.forEach((system, systemIndex) => {
      const trebleY = scoreTop + systemIndex * SYSTEM_GAP_Y
      const bassY = trebleY + GRAND_STAFF_GAP
      let systemTop = Number.POSITIVE_INFINITY
      let systemBottom = Number.NEGATIVE_INFINITY

      const rawSystemWidth = system.reduce((sum, entry) => sum + entry.width, 0)
      const widthMultiplier = targetSystemWidth / rawSystemWidth
      const renderedSystemWidth = rawSystemWidth * widthMultiplier
      let currentX =
        SYSTEM_SIDE_PADDING + Math.max(0, (targetSystemWidth - renderedSystemWidth) / 2)

      system.forEach((entry, measureInSystem) => {
        const isSystemStart = measureInSystem === 0
        const isFinalMeasure = entry.measureIndex === measures.length - 1

        const adjustedWidth = entry.width * widthMultiplier
        const trebleStave = new Stave(currentX, trebleY, adjustedWidth)
        const bassStave = new Stave(currentX, bassY, adjustedWidth)

        if (isSystemStart) {
          applySystemStartFrontModifiers(
            trebleStave,
            bassStave,
            keySignature,
            timeSignature,
          )
        }

        if (isFinalMeasure) {
          trebleStave.setEndBarType(BarlineType.END)
          bassStave.setEndBarType(BarlineType.END)

          new StaveConnector(trebleStave, bassStave)
            .setContext(context)
            .setType('boldDoubleRight') 
            .draw()
        }

        const explicitMeasureTempo = entry.measure.tempoBpm
        if (entry.measureIndex === 0 || explicitMeasureTempo !== null) {
          trebleStave.setTempo(
            {
              bpm: getEffectiveMeasureTempo(measures, entry.measureIndex, tempoBpm),
              duration: 'q',
            },
            -26,
          )
        }

        trebleStave.setContext(context).draw()
        bassStave.setContext(context).draw()

        const frontGeometry = isSystemStart ? getSystemFrontGeometry(trebleStave) : null
        const linkedGridBounds =
          getLinkedGrandStaffGridBounds(trebleStave, bassStave)

        if (isSystemStart) {
          new StaveConnector(trebleStave, bassStave)
            .setContext(context)
            .setType('brace')
            .draw()

          new StaveConnector(trebleStave, bassStave)
            .setContext(context)
            .setType('singleLeft')
            .draw()
        }

        new StaveConnector(trebleStave, bassStave)
          .setContext(context)
          .setType('singleRight')
          .draw()

        if (isSystemStart) {
          drawSystemMeasureNumber(
            context,
            currentX,
            trebleStave,
            entry.measureIndex + 1,
          )

          if (keySignature === 'C' && frontGeometry) {
            drawNaturalKeySignaturePlaceholder(
              context,
              trebleStave,
              bassStave,
              frontGeometry,
            )
          }
        }

        const cursorPosition = pendingInsertPreview ?? hoveredRestPosition
        const trebleCursorSub =
          cursorPosition &&
            cursorPosition.measureIndex === entry.measureIndex &&
            cursorPosition.staffId === 'treble'
            ? cursorPosition.subdivision
            : null
        const bassCursorSub =
          cursorPosition &&
            cursorPosition.measureIndex === entry.measureIndex &&
            cursorPosition.staffId === 'bass'
            ? cursorPosition.subdivision
            : null
        const trebleData = buildStaffVoiceData(
          entry.measure.trebleItems,
          'treble',
          keySignature,
          activeItemId,
          eraseHoverItemId,
          noteRegistry,
          subdivisionsPerMeasure,
          entry.groupSubdivisionLengths,
          entry.measureIndex,
          placeholderFocus,
          selectedDurationLength,
          trebleCursorSub,
        )
        const bassData = buildStaffVoiceData(
          entry.measure.bassItems,
          'bass',
          keySignature,
          activeItemId,
          eraseHoverItemId,
          noteRegistry,
          subdivisionsPerMeasure,
          entry.groupSubdivisionLengths,
          entry.measureIndex,
          placeholderFocus,
          selectedDurationLength,
          bassCursorSub,
        )

        const voiceDefinition = {
          beatValue: meterDefinition.denominator,
          numBeats: meterDefinition.numerator,
        }
        const trebleVoice = new Voice(voiceDefinition).setMode(Voice.Mode.SOFT)
        const bassVoice = new Voice(voiceDefinition).setMode(Voice.Mode.SOFT)
        const trebleAnchorVoice = new Voice(voiceDefinition).setMode(Voice.Mode.SOFT)
        const bassAnchorVoice = new Voice(voiceDefinition).setMode(Voice.Mode.SOFT)

        trebleVoice.addTickables(trebleData.notes).setStave(trebleStave)
        bassVoice.addTickables(bassData.notes).setStave(bassStave)
        trebleAnchorVoice
          .addTickables(trebleData.anchorNotes)
          .setStave(trebleStave)
        bassAnchorVoice
          .addTickables(bassData.anchorNotes)
          .setStave(bassStave)

        const trebleFormatter = new Formatter()
        trebleFormatter.joinVoices([trebleVoice, trebleAnchorVoice])
        trebleFormatter.format(
          [trebleVoice, trebleAnchorVoice],
          trebleStave.getNoteEndX() - trebleStave.getNoteStartX(),
          {
            alignRests: false,
            context,
          },
        )
        const bassFormatter = new Formatter()
        bassFormatter.joinVoices([bassVoice, bassAnchorVoice])
        bassFormatter.format(
          [bassVoice, bassAnchorVoice],
          bassStave.getNoteEndX() - bassStave.getNoteStartX(),
          {
            alignRests: false,
            context,
          },
        )

        const trebleXBySubdivision = applyFixedSubdivisionGrid(
          trebleStave,
          trebleData.anchorNotes,
          entry.trebleGroupUnits,
          entry.groupSubdivisionLengths,
          entry.trebleNoteAreaWidth,
          linkedGridBounds,
        )
        const bassXBySubdivision = applyFixedSubdivisionGrid(
          bassStave,
          bassData.anchorNotes,
          entry.bassGroupUnits,
          entry.groupSubdivisionLengths,
          entry.bassNoteAreaWidth,
          linkedGridBounds,
        )

        positionTickablesOnGrid(
          trebleStave,
          trebleData.notes,
          trebleData.lengths,
          trebleData.starts,
          trebleXBySubdivision,
          linkedGridBounds,
        )
        positionTickablesOnGrid(
          bassStave,
          bassData.notes,
          bassData.lengths,
          bassData.starts,
          bassXBySubdivision,
          linkedGridBounds,
        )

        const trebleMeasureBounds = linkedGridBounds ?? {
          endX: trebleStave.getNoteEndX(),
          startX: trebleStave.getNoteStartX(),
        }
        const bassMeasureBounds = linkedGridBounds ?? {
          endX: bassStave.getNoteEndX(),
          startX: bassStave.getNoteStartX(),
        }
        const lyricY =
          trebleStave.getYForLine(4) +
          (bassStave.getYForLine(0) - trebleStave.getYForLine(4)) * LYRIC_BASELINE_BIAS

        const collectLyricTokens = (
          items: ScoreItem[],
          xBySubdivision: number[],
          measureBounds: GridBounds,
        ) => {
          items.forEach((item) => {
            if (item.kind !== 'note' || !item.lyrics?.trim()) {
              return
            }

            lyricTokens.push({
              anchorX: getTickableAnchorX(
                xBySubdivision,
                item.start,
                measureBounds.startX,
              ),
              measureIndex: entry.measureIndex,
              measureLeft: measureBounds.startX,
              measureRight: measureBounds.endX,
              systemIndex,
              text: item.lyrics,
              y: lyricY,
            })
          })
        }

        collectLyricTokens(entry.measure.trebleItems, trebleXBySubdivision, trebleMeasureBounds)
        collectLyricTokens(entry.measure.bassItems, bassXBySubdivision, bassMeasureBounds)

        const beamGroups = meterDefinition.grouping.map(
          (groupValue) => new Fraction(groupValue, meterDefinition.denominator),
        )
        const trebleBeams = Beam.generateBeams(trebleData.notes, {
          beamRests: false,
          groups: beamGroups,
        })
        const bassBeams = Beam.generateBeams(bassData.notes, {
          beamRests: false,
          groups: beamGroups,
        })

        trebleVoice.draw(context, trebleStave)
        bassVoice.draw(context, bassStave)
        trebleBeams.forEach((beam) => beam.setContext(context).draw())
        bassBeams.forEach((beam) => beam.setContext(context).draw())

        const trebleHitBounds = getStaffHitBounds(trebleStave, 'treble')
        const bassHitBounds = getStaffHitBounds(bassStave, 'bass')
        systemTop = Math.min(systemTop, trebleHitBounds.hitTop, bassHitBounds.hitTop)
        systemBottom = Math.max(systemBottom, trebleHitBounds.hitBottom, bassHitBounds.hitBottom)

        if (isFinalMeasure) {
          renderedScoreEndControlsLayout = {
            bottom: Math.max(trebleHitBounds.hitBottom, bassHitBounds.hitBottom),
            centerX: Math.min(scoreWidth - 18, currentX + adjustedWidth + SYSTEM_SIDE_PADDING / 2),
            top: Math.min(trebleHitBounds.hitTop, bassHitBounds.hitTop),
          }
        }

        hitBoxes.push({
          hitBottom: trebleHitBounds.hitBottom,
          hitTop: trebleHitBounds.hitTop,
          index: entry.measureIndex,
          left: trebleMeasureBounds.startX,
          right: trebleMeasureBounds.endX,
          spacing: trebleStave.getSpacingBetweenLines(),
          staffId: 'treble',
          topLineY: trebleStave.getYForLine(0),
          xBySubdivision: trebleXBySubdivision,
        })

        hitBoxes.push({
          hitBottom: bassHitBounds.hitBottom,
          hitTop: bassHitBounds.hitTop,
          index: entry.measureIndex,
          left: bassMeasureBounds.startX,
          right: bassMeasureBounds.endX,
          spacing: bassStave.getSpacingBetweenLines(),
          staffId: 'bass',
          topLineY: bassStave.getYForLine(0),
          xBySubdivision: bassXBySubdivision,
        })

        currentX += adjustedWidth
      })

      if (Number.isFinite(systemTop) && Number.isFinite(systemBottom)) {
        renderedPdfSystemBounds.push({
          bottom: systemBottom,
          top: Math.max(0, systemTop),
        })
      }
    })

    measures.forEach((measure, measureIndex) => {
      STAFF_IDS.forEach((staffId) => {
        getItemsForStaff(measure, staffId).forEach((item) => {
          if (!item.tieToNext || item.kind !== 'note') {
            return
          }

          const next = findNextContiguousItem(
            measures,
            measureIndex,
            staffId,
            item,
            subdivisionsPerMeasure,
          )
          if (
            !next ||
            next.item.kind !== 'note' ||
            !haveSameNotePitches(item, next.item, keySignature)
          ) {
            return
          }

          const firstEntry = noteRegistry.get(item.id)
          const lastEntry = noteRegistry.get(next.item.id)

          if (!firstEntry || !lastEntry) {
            return
          }

          new StaveTie({
            firstIndexes: firstEntry.item.pitches.map((_, index) => index),
            firstNote: firstEntry.note,
            lastIndexes: lastEntry.item.pitches.map((_, index) => index),
            lastNote: lastEntry.note,
          })
            .setContext(context)
            .draw()
        })
      })
    })

    slurs.forEach((slur) => {
      const fromEntry = noteRegistry.get(slur.fromNoteId)
      const toEntry = noteRegistry.get(slur.toNoteId)

      if (!fromEntry || !toEntry) {
        return
      }

      new Curve(fromEntry.note, toEntry.note, {
        cps: [
          { x: 10, y: slur.staffId === 'bass' ? 30 : -40 },
          { x: 10, y: slur.staffId === 'bass' ? 30 : -40 },
        ],
        invert: slur.staffId === 'bass',
        xShift: 2,
        yShift: slur.staffId === 'bass' ? 20 : -30,
      })
        .setContext(context)
        .draw()
    })

    const svg = host.querySelector('svg')
    if (svg instanceof SVGSVGElement) {
      renderLyricsToSvg(svg, context, lyricTokens)
    }

    hitBoxesRef.current = hitBoxes
    noteRegistryRef.current = noteRegistry
    pdfSystemBoundsRef.current = renderedPdfSystemBounds
    setScoreEndControlsLayout((current) =>
      haveSameScoreEndControlsLayout(current, renderedScoreEndControlsLayout)
        ? current
        : renderedScoreEndControlsLayout,
    )
  }, [
    activeItemId,
    eraseHoverItemId,
    hoveredRestPosition,
    keySignature,
    measures,
    selectedDurationLength,
    measureTempoTimeline,
    pendingInsertPreview,
    scoreHeight,
    scoreTop,
    scoreWidth,
    slurs,
    subdivisionsPerMeasure,
    systems,
    tempoBpm,
    timeSignature,
  ])

  async function ensurePiano() {
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }

    if (pianoRef.current?.loaded) {
      return pianoRef.current
    }

    if (!pianoLoaderRef.current) {
      pianoLoaderRef.current = new Promise<Tone.Sampler>((resolve, reject) => {
        const piano = new Tone.Sampler({
          attack: 0,
          baseUrl: 'https://tonejs.github.io/audio/salamander/',
          onerror: (error) => {
            piano.dispose()
            pianoLoaderRef.current = null
            reject(error)
          },
          onload: () => {
            piano.toDestination()
            pianoRef.current = piano
            resolve(piano)
          },
          release: 1.4,
          urls: PIANO_SAMPLE_URLS,
        })
      })
    }

    return pianoLoaderRef.current
  }

  function ensurePreviewSynth() {
    if (!previewSynthRef.current) {
      previewSynthRef.current = new Tone.Synth({
        envelope: {
          attack: 0.002,
          decay: 0.08,
          release: 0.1,
          sustain: 0,
        },
        oscillator: { type: 'triangle' },
      }).toDestination()
    }

    return previewSynthRef.current
  }

  function ensureMetronomeSynth() {
    if (!metronomeSynthRef.current) {
      metronomeSynthRef.current = new Tone.Synth({
        envelope: {
          attack: 0.001,
          decay: 0.04,
          release: 0.05,
          sustain: 0,
        },
        oscillator: { type: 'square' },
      }).toDestination()
    }

    return metronomeSynthRef.current
  }

  function clearHoverState() {
    setEraseHoverItemId(null)
    setChordHoverPreview(null)
  }

  function canInsertAtSubdivision(
    items: ScoreItem[],
    subdivision: number,
    length: number,
  ) {
    const end = subdivision + length
    return !items.some(
      (item) =>
        item.kind === 'note' &&
        rangesOverlap(item.start, itemEnd(item), subdivision, end),
    )
  }

  function getPlaceholderFocusForPosition(nextPosition: HoveredRestPosition | null) {
    if (!nextPosition) {
      return null
    }

    return {
      groupStart: getSubdivisionGroupInfo(
        nextPosition.subdivision,
        meterDefinition.groupSubdivisionLengths,
      ).start,
      measureIndex: nextPosition.measureIndex,
      staffId: nextPosition.staffId,
    }
  }

  function setPlaceholderFocusForPosition(nextPosition: HoveredRestPosition | null) {
    setPlaceholderFocus(getPlaceholderFocusForPosition(nextPosition))
  }

  function clearPendingInsertPreview() {
    setPendingInsertPreview(null)
    setPlaceholderFocus(null)
  }

  function buildPendingInsertPreview(
    nextPosition: HoveredRestPosition,
    pitch: NotePitch,
  ): PendingInsertPreview {
    return {
      measureIndex: nextPosition.measureIndex,
      pitch,
      staffId: nextPosition.staffId,
      subdivision: nextPosition.subdivision,
    }
  }

  function armPendingInsertPreviewForPosition(
    nextPosition: HoveredRestPosition,
    pitch: NotePitch,
    statusMessage: string,
  ) {
    setPendingInsertPreview({
      ...buildPendingInsertPreview(nextPosition, pitch),
    })
    setHoveredRestPosition(null)
    setPlaceholderFocusForPosition(nextPosition)
    setStatus(statusMessage)
  }

  function findFirstAvailableRestPositionInGroup(
    sourceMeasures: MeasureData[],
    measureIndex: number,
    staffId: StaffId,
    groupStart: number,
  ): HoveredRestPosition | null {
    const length = getDurationSubdivisions(baseDuration, dotted)
    const groupInfo = getSubdivisionGroupInfo(
      groupStart,
      meterDefinition.groupSubdivisionLengths,
    )
    const groupEnd = Math.min(groupInfo.start + groupInfo.length, subdivisionsPerMeasure)
    const items = getItemsForStaff(sourceMeasures[measureIndex], staffId)
    const checked = new Set<number>()

    for (let subdivision = groupInfo.start; subdivision < groupEnd; subdivision += 1) {
      const snapped = snapSubdivision(
        subdivision,
        baseDuration,
        dotted,
        subdivisionsPerMeasure,
      )

      if (
        snapped < groupInfo.start ||
        snapped + length > groupEnd ||
        checked.has(snapped)
      ) {
        continue
      }
      checked.add(snapped)

      if (canInsertAtSubdivision(items, snapped, length)) {
        return {
          measureIndex,
          staffId,
          subdivision: snapped,
        }
      }
    }

    return null
  }

  function armPendingInsertPreview(pointerTarget: NonNullable<ReturnType<typeof resolvePointerTarget>>) {
    const nextPosition =
      findFirstAvailableRestPositionInGroup(
        measures,
        pointerTarget.hitBox.index,
        pointerTarget.hitBox.staffId,
        pointerTarget.groupStart,
      ) ?? {
        measureIndex: pointerTarget.hitBox.index,
        staffId: pointerTarget.hitBox.staffId,
        subdivision: pointerTarget.snappedSubdivision,
      }

    armPendingInsertPreviewForPosition(
      nextPosition,
      pointerTarget.pitch,
      `Insertion preview armed on ${pointerTarget.hitBox.staffId}. The next slot is locked to the left-most available rest in this bar group. Move vertically if needed, then click again to place ${getPitchLabel(pointerTarget.pitch, accidental, keySignature)}.`,
    )
  }

  function findNextRestPosition(
    sourceMeasures: MeasureData[],
    startMeasureIndex: number,
    staffId: StaffId,
    rawSubdivision: number,
  ): HoveredRestPosition | null {
    const length = getDurationSubdivisions(baseDuration, dotted)
    const checked = new Set<string>()

    const scanRange = (
      measureFrom: number,
      measureTo: number,
      isWrapped: boolean,
    ) => {
      for (let measureIndex = measureFrom; measureIndex < measureTo; measureIndex += 1) {
        const items = getItemsForStaff(sourceMeasures[measureIndex], staffId)
        const startSubdivision =
          !isWrapped && measureIndex === startMeasureIndex
            ? rawSubdivision
            : 0

        for (let subdivision = startSubdivision; subdivision < subdivisionsPerMeasure; subdivision += 1) {
          const snapped = snapSubdivision(
            subdivision,
            baseDuration,
            dotted,
            subdivisionsPerMeasure,
          )

          if (snapped + length > subdivisionsPerMeasure) {
            continue
          }

          const key = `${measureIndex}:${snapped}`
          if (checked.has(key)) {
            continue
          }
          checked.add(key)

          if (canInsertAtSubdivision(items, snapped, length)) {
            return {
              measureIndex,
              staffId,
              subdivision: snapped,
            }
          }
        }
      }

      return null
    }

    return (
      scanRange(startMeasureIndex, sourceMeasures.length, false) ??
      scanRange(0, startMeasureIndex + 1, true)
    )
  }



  function replaceStaffItems(
    draft: MeasureData[],
    measureIndex: number,
    staffId: StaffId,
    items: ScoreItem[],
  ) {
    if (staffId === 'treble') {
      draft[measureIndex].trebleItems = items
    } else {
      draft[measureIndex].bassItems = items
    }
  }

  function mutateMeasures(
    updater: (draft: MeasureData[]) => {
      activeItemId?: string | null
      pendingInsertPreview?: PendingInsertPreview | null
      placeholderFocus?: PlaceholderFocus | null
      status?: string
    },
  ) {
    setMeasures((current) => {
      const draft = cloneMeasures(current)
      const result = updater(draft)
      const normalized = normalizeMeasures(draft, subdivisionsPerMeasure, keySignature)

      if (result.activeItemId !== undefined) {
        setActiveItemId(result.activeItemId)
      }

      if (result.pendingInsertPreview !== undefined) {
        setPendingInsertPreview(result.pendingInsertPreview)
      }

      if (result.placeholderFocus !== undefined) {
        setPlaceholderFocus(result.placeholderFocus)
      }

      if (result.status) {
        setStatus(result.status)
      }

      return normalized
    })
  }

  async function playPreviewPitch(pitch: NotePitch) {
    try {
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }

      const tonePitch = toTonePitch(pitch, accidental, keySignature)

      if (pianoRef.current?.loaded) {
        pianoRef.current.triggerAttackRelease(tonePitch, 0.45, Tone.now())
        return
      }

      ensurePreviewSynth().triggerAttackRelease(tonePitch, '8n', Tone.now())
      void ensurePiano().catch(() => {
        setStatus('Piano samples could not be loaded.')
      })
    } catch {
      setStatus('Audio preview could not be started.')
    }
  }

  function insertAtPosition(
    measureIndex: number,
    staffId: StaffId,
    rawSubdivision: number,
    pitch: NotePitch,
    kind: 'note' | 'rest',
  ) {
    const length = getDurationSubdivisions(baseDuration, dotted)

    if (length > subdivisionsPerMeasure) {
      setStatus(`${selectedDurationName} does not fit inside ${timeSignature}.`)
      return
    }

    const start = snapSubdivision(
      rawSubdivision,
      baseDuration,
      dotted,
      subdivisionsPerMeasure,
    )
    const currentGroupStart = getSubdivisionGroupInfo(
      start,
      meterDefinition.groupSubdivisionLengths,
    ).start
    const noteInsertStatus = `Inserted ${getPitchLabel(pitch, accidental, keySignature)} on ${staffId} as a ${selectedDurationName.toLowerCase()} note.`
    const restInsertStatus = `Inserted a ${selectedDurationName.toLowerCase()} rest on ${staffId}.`

    mutateMeasures((draft) => {
      const items = getItemsForStaff(draft[measureIndex], staffId)
      const end = start + length
      const exactStartItem = findStartingItem(items, start)
      const matchingStartItem =
        exactStartItem &&
          exactStartItem.baseDuration === baseDuration &&
          exactStartItem.dots === (dotted ? 1 : 0)
          ? exactStartItem
          : undefined

      if (kind === 'note' && matchingStartItem?.kind === 'note') {
        const pitchExists = matchingStartItem.pitches.includes(pitch)
        const nextPitches = sortPitches(
          pitchExists
            ? matchingStartItem.pitches.filter((value) => value !== pitch)
            : [...matchingStartItem.pitches, pitch],
          staffId,
        )

        if (nextPitches.length === 0) {
          replaceStaffItems(
            draft,
            measureIndex,
            staffId,
            items.filter((item) => item.id !== matchingStartItem.id),
          )

          return {
            activeItemId: null,
            status: `Removed ${getPitchLabel(pitch, accidental, keySignature)} from the ${staffId} chord.`,
          }
        }

        matchingStartItem.pitches = nextPitches

        // Update accidental for this pitch
        if (accidental && !pitchExists) {
          matchingStartItem.accidentals = { ...matchingStartItem.accidentals, [pitch]: accidental }
        } else if (pitchExists && matchingStartItem.accidentals) {
          const { [pitch]: _, ...rest } = matchingStartItem.accidentals
          matchingStartItem.accidentals = Object.keys(rest).length > 0 ? rest : undefined
        }

        return {
          activeItemId: matchingStartItem.id,
          status: pitchExists
            ? `Updated ${staffId} chord: ${getPitchLabels(nextPitches, matchingStartItem.accidentals, keySignature)}.`
            : `Expanded ${staffId} chord: ${getPitchLabels(nextPitches, matchingStartItem.accidentals, keySignature)}.`,
        }
      }

      const filtered = items.filter(
        (item) => !rangesOverlap(item.start, itemEnd(item), start, end),
      )

      const inserted: ScoreItem =
        kind === 'note'
          ? {
            baseDuration,
            dots: dotted ? 1 : 0,
            id: generateId(),
            kind,
            pitches: [pitch],
            start,
            ...(accidental ? { accidentals: { [pitch]: accidental } } : {}),
          }
          : {
            baseDuration,
            dots: dotted ? 1 : 0,
            id: generateId(),
            kind,
            start,
          }

      filtered.push(inserted)
      replaceStaffItems(draft, measureIndex, staffId, filtered)

      if (kind === 'note') {
        const nextRestPosition =
          findFirstAvailableRestPositionInGroup(
            draft,
            measureIndex,
            staffId,
            currentGroupStart,
          ) ??
          findNextRestPosition(
            draft,
            measureIndex,
            staffId,
            start + length,
          )

        return {
          activeItemId: inserted.id,
          pendingInsertPreview: nextRestPosition
            ? buildPendingInsertPreview(nextRestPosition, pitch)
            : null,
          placeholderFocus: getPlaceholderFocusForPosition(nextRestPosition),
          status: nextRestPosition
            ? `${noteInsertStatus} The next left-most available slot is armed. Move vertically if needed, then click again to place the next note.`
            : noteInsertStatus,
        }
      }

      return {
        activeItemId: inserted.id,
        status: restInsertStatus,
      }
    })

    if (kind === 'note') {
      void playPreviewPitch(pitch)
    }
  }

  function eraseAtPosition(
    measureIndex: number,
    staffId: StaffId,
    subdivision: number,
  ) {
    mutateMeasures((draft) => {
      const items = getItemsForStaff(draft[measureIndex], staffId)
      const target = findCoveringItem(items, subdivision)

      if (!target) {
        return {
          activeItemId: null,
          status: 'There is only placeholder spacing at this position.',
        }
      }

      replaceStaffItems(
        draft,
        measureIndex,
        staffId,
        items.filter((item) => item.id !== target.id),
      )

      return {
        activeItemId: null,
        status: `Erased the selected symbol from the ${staffId} staff.`,
      }
    })
  }

  function toggleTieAtPosition(
    measureIndex: number,
    staffId: StaffId,
    subdivision: number,
  ) {
    mutateMeasures((draft) => {
      const items = getItemsForStaff(draft[measureIndex], staffId)
      const target = findCoveringItem(items, subdivision)

      if (!target || target.kind !== 'note') {
        return {
          activeItemId: null,
          status: 'Tie mode requires an existing note or chord.',
        }
      }

      const next = findNextContiguousItem(
        draft,
        measureIndex,
        staffId,
        target,
        subdivisionsPerMeasure,
      )

      if (!next || next.item.kind !== 'note') {
        return {
          activeItemId: target.id,
          status: 'There is no contiguous note or chord after this one.',
        }
      }

      if (!haveSameNotePitches(target, next.item, keySignature)) {
        return {
          activeItemId: target.id,
          status: 'Ties require the next note or chord to use the same pitches.',
        }
      }

      target.tieToNext = !target.tieToNext

      return {
        activeItemId: target.id,
        status: target.tieToNext ? 'Tie added.' : 'Tie removed.',
      }
    })
  }

  function resolvePointerTarget(x: number, y: number) {
    const hitBox = hitBoxesRef.current
      .filter(
        (candidate) =>
          x >= candidate.left &&
          x <= candidate.right &&
          y >= candidate.hitTop &&
          y <= candidate.hitBottom,
      )
      .sort((left, right) => {
        const leftCenter = (left.hitTop + left.hitBottom) / 2
        const rightCenter = (right.hitTop + right.hitBottom) / 2
        return Math.abs(y - leftCenter) - Math.abs(y - rightCenter)
      })[0]

    if (!hitBox) {
      return null
    }

    const rawSubdivision = resolveClosestSubdivision(hitBox.xBySubdivision, x)
    const snappedSubdivision = snapSubdivision(
      rawSubdivision,
      baseDuration,
      dotted,
      subdivisionsPerMeasure,
    )
    const groupStart = getSubdivisionGroupInfo(
      snappedSubdivision,
      meterDefinition.groupSubdivisionLengths,
    ).start
    const pitch = yToPitch(y, hitBox.topLineY, hitBox.spacing, hitBox.staffId)
    const targetItem = findCoveringItem(
      getItemsForStaff(measures[hitBox.index], hitBox.staffId),
      rawSubdivision,
    )

    return {
      groupStart,
      hitBox,
      pitch,
      rawSubdivision,
      snappedSubdivision,
      targetItem,
    }
  }

  function focusMeasureSelection(measureIndex: number) {
    setActiveMeasureIndex(measureIndex)
    setHelpCard(
      getMeasureHelp(
        measureIndex,
        getEffectiveMeasureTempo(measures, measureIndex, tempoBpm),
        measures[measureIndex]?.tempoBpm !== null,
      ),
    )
  }

  function handleScoreMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (activeTab !== 'notes') {
      clearHoverState()
      setHoveredRestPosition(null)
      return
    }

    if (mode === 'note' && pendingInsertPreview) {
      const pendingHitBox = hitBoxesRef.current.find(
        (box) =>
          box.index === pendingInsertPreview.measureIndex &&
          box.staffId === pendingInsertPreview.staffId,
      )

      if (pendingHitBox) {
        const clampedOffsetY = Math.min(
          pendingHitBox.hitBottom,
          Math.max(pendingHitBox.hitTop, event.nativeEvent.offsetY),
        )
        const pitch = yToPitch(
          clampedOffsetY,
          pendingHitBox.topLineY,
          pendingHitBox.spacing,
          pendingHitBox.staffId,
        )

        setPendingInsertPreview((current) =>
          current
            ? {
              ...current,
              pitch,
            }
            : current,
        )
      }

      clearHoverState()
      setHoveredRestPosition(null)
      return
    }

    const pointerTarget = resolvePointerTarget(
      event.nativeEvent.offsetX,
      event.nativeEvent.offsetY,
    )

    if (!pointerTarget) {
      clearHoverState()
      setHoveredRestPosition(null)
      return
    }

    if (mode === 'note') {
      const snapped = snapSubdivision(
        pointerTarget.rawSubdivision,
        baseDuration,
        dotted,
        subdivisionsPerMeasure,
      )
      const staffId = pointerTarget.hitBox.staffId
      const mIdx = pointerTarget.hitBox.index
      const items = getItemsForStaff(measures[mIdx], staffId)
      const length = getDurationSubdivisions(baseDuration, dotted)
      const end = snapped + length

      // Only highlight if the position is a rest/placeholder (not an existing note)
      const hasNoteConflict = items.some(
        (item) =>
          item.kind === 'note' &&
          rangesOverlap(item.start, itemEnd(item), snapped, end),
      )

      if (!hasNoteConflict) {
        setHoveredRestPosition(null)
        setChordHoverPreview(null)
      } else {
        setHoveredRestPosition(null)

        let isHoveringActiveChordTarget = false
        const hoveredChordTarget =
          pointerTarget.targetItem?.kind === 'note' && pointerTarget.targetItem.id === activeItemId
            ? pointerTarget.targetItem
            : null
        if (hoveredChordTarget) {
          const canEditSelectedChord =
            hoveredChordTarget.baseDuration === baseDuration &&
            hoveredChordTarget.dots === (dotted ? 1 : 0) &&
            (!hoveredChordTarget.pitches.includes(pointerTarget.pitch) || event.shiftKey)

          isHoveringActiveChordTarget = canEditSelectedChord
        }

        if (isHoveringActiveChordTarget) {
          setChordHoverPreview({
            anchorItemId: hoveredChordTarget!.id,
            measureIndex: pointerTarget.hitBox.index,
            pitch: pointerTarget.pitch,
            staffId: pointerTarget.hitBox.staffId,
            // Chord edits always apply to the selected note's actual start slot.
            subdivision: hoveredChordTarget!.start,
          })
        } else {
          setChordHoverPreview(null)
        }
      }
    } else {
      setHoveredRestPosition(null)
      setChordHoverPreview(null)
    }

    if (mode === 'erase') {
      setEraseHoverItemId(pointerTarget.targetItem?.id ?? null)
    } else {
      setEraseHoverItemId(null)
    }
  }

  function handleScoreLeave() {
    clearHoverState()
    setHoveredRestPosition(null)
  }

  function handleScoreClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (scoreFrontPopover) {
      setScoreFrontPopover(null)
    }

    if (
      activeTab === 'notes' &&
      mode === 'note' &&
      pendingInsertPreview
    ) {
      const pendingHitBox = hitBoxesRef.current.find(
        (box) =>
          box.index === pendingInsertPreview.measureIndex &&
          box.staffId === pendingInsertPreview.staffId,
      )
      const anchorX =
        pendingHitBox
          ? getPreviewXForSubdivisionRange(
            pendingHitBox,
            pendingInsertPreview.subdivision,
            baseDuration,
            dotted,
          )
          : undefined

      if (
        pendingHitBox &&
        anchorX !== undefined &&
        Math.abs(event.nativeEvent.offsetX - anchorX) <= 26
      ) {
        insertAtPosition(
          pendingInsertPreview.measureIndex,
          pendingInsertPreview.staffId,
          pendingInsertPreview.subdivision,
          pendingInsertPreview.pitch,
          'note',
        )
        return
      }
    }

    const pointerTarget = resolvePointerTarget(
      event.nativeEvent.offsetX,
      event.nativeEvent.offsetY,
    )

    if (!pointerTarget) {
      setStatus('Click directly inside either staff.')
      return
    }

    setActiveMeasureIndex(pointerTarget.hitBox.index)

    if (activeTab !== 'notes') {
      clearPendingInsertPreview()
      if (pointerTarget.targetItem?.kind === 'note') {
        setActiveItemId(pointerTarget.targetItem.id)
        setHelpCard(
          getSelectedNoteHelp(
            pointerTarget.targetItem,
            pointerTarget.hitBox.index,
            pointerTarget.hitBox.staffId,
            keySignature,
          ),
        )
        setStatus(
          `Selected ${getPitchLabels(pointerTarget.targetItem.pitches, pointerTarget.targetItem.accidentals, keySignature)}. ${TAB_SELECTION_HINT[activeTab] ?? 'Use the toolbar to edit it.'}`,
        )
      } else {
        if (activeTab === 'bars') {
          focusMeasureSelection(pointerTarget.hitBox.index)
          setStatus(`Selected measure ${pointerTarget.hitBox.index + 1}. Use the Measures toolbar to set its tempo mark.`)
          return
        }

        setHelpCard(getToolbarTabHelp(activeTab))
        setStatus(
          TAB_SELECTION_HINT[activeTab] ??
          'This tab edits existing notes rather than inserting new ones.',
        )
      }
      return
    }

    if (mode === 'erase') {
      clearPendingInsertPreview()
      eraseAtPosition(
        pointerTarget.hitBox.index,
        pointerTarget.hitBox.staffId,
        pointerTarget.rawSubdivision,
      )
      return
    }

    if (mode === 'tie') {
      clearPendingInsertPreview()
      toggleTieAtPosition(
        pointerTarget.hitBox.index,
        pointerTarget.hitBox.staffId,
        pointerTarget.rawSubdivision,
      )
      return
    }

    if (mode === 'slur') {
      clearPendingInsertPreview()

      if (pointerTarget.targetItem?.kind !== 'note') {
        setStatus('Slur mode requires clicking an existing start note and end note.')
        return
      }

      const clickedSelection = {
        measureIndex: pointerTarget.hitBox.index,
        noteId: pointerTarget.targetItem.id,
        staffId: pointerTarget.hitBox.staffId,
        subdivision: pointerTarget.targetItem.start,
      } satisfies PendingSlurSelection

      if (!pendingSlurSelection) {
        setPendingSlurSelection(clickedSelection)
        setActiveItemId(pointerTarget.targetItem.id)
        setHelpCard(MODE_HELP.slur)
        setStatus(
          `Slur start armed on ${getPitchLabels(pointerTarget.targetItem.pitches, pointerTarget.targetItem.accidentals, keySignature)}. Click the ending note next.`,
        )
        return
      }

      toggleSlurBetweenNotes(pendingSlurSelection, clickedSelection)
      return
    }

    if (mode === 'rest') {
      clearPendingInsertPreview()
      insertAtPosition(
        pointerTarget.hitBox.index,
        pointerTarget.hitBox.staffId,
        pointerTarget.rawSubdivision,
        pointerTarget.pitch,
        'rest',
      )
      return
    }

    if (pointerTarget.targetItem?.kind === 'note') {
      const canEditSelectedChord =
        activeItemId === pointerTarget.targetItem.id &&
        pointerTarget.targetItem.baseDuration === baseDuration &&
        pointerTarget.targetItem.dots === (dotted ? 1 : 0) &&
        (!pointerTarget.targetItem.pitches.includes(pointerTarget.pitch) ||
          event.shiftKey)

      if (canEditSelectedChord) {
        insertAtPosition(
          pointerTarget.hitBox.index,
          pointerTarget.hitBox.staffId,
          pointerTarget.targetItem.start,
          pointerTarget.pitch,
          'note',
        )
        setChordHoverPreview(null)
        return
      }

      clearPendingInsertPreview()
      setChordHoverPreview(null)
      setActiveItemId(pointerTarget.targetItem.id)
      setHoveredRestPosition(null)
      setHelpCard(
        getSelectedNoteHelp(
          pointerTarget.targetItem,
          pointerTarget.hitBox.index,
          pointerTarget.hitBox.staffId,
          keySignature,
        ),
      )
      setStatus(
        `Selected ${getPitchLabels(pointerTarget.targetItem.pitches, pointerTarget.targetItem.accidentals, keySignature)}. Click another pitch on this selected note to build a chord, or switch tabs to edit it.`,
      )
      return
    }

    const isSamePendingSlot =
      pendingInsertPreview &&
      pendingInsertPreview.measureIndex === pointerTarget.hitBox.index &&
      pendingInsertPreview.staffId === pointerTarget.hitBox.staffId &&
      pendingInsertPreview.subdivision === pointerTarget.snappedSubdivision

    if (isSamePendingSlot && pendingInsertPreview) {
      insertAtPosition(
        pointerTarget.hitBox.index,
        pointerTarget.hitBox.staffId,
        pendingInsertPreview.subdivision,
        pendingInsertPreview.pitch,
        'note',
      )
      return
    }

    armPendingInsertPreview(pointerTarget)
  }

  async function handlePlay() {
    if (isPlaying) {
      pianoRef.current?.releaseAll()
      clearScheduledPlayback()
      stopPlaybackVisuals()

      setIsPlaying(false)
      setStatus('Playback stopped.')
      return
    }

    const notes = buildPlaybackNotes(measures, timeSignature, tempoBpm, keySignature)
    if (notes.length === 0) {
      setStatus('There are no notes to play yet.')
      return
    }

    setStatus('Loading piano samples...')

    let piano: Tone.Sampler

    try {
      piano = await ensurePiano()
    } catch {
      setStatus('Piano samples could not be loaded.')
      return
    }

    clearScheduledPlayback()
    Tone.Transport.bpm.value = measureTempoTimeline[0]?.bpm ?? tempoBpm
    Tone.Transport.position = 0
    let totalDuration = 0

    notes.forEach((segment) => {
      scheduledTransportEventsRef.current.push(
        Tone.Transport.schedule((time) => {
          piano.triggerAttackRelease(
            segment.notes,
            segment.durationSeconds * 0.96,
            time,
          )
        }, segment.startSeconds),
      )

      totalDuration = Math.max(
        totalDuration,
        segment.startSeconds + segment.durationSeconds,
      )
    })

    if (isMetronomeEnabled) {
      const metronome = ensureMetronomeSynth()
      measureTempoTimeline.forEach((timing) => {
        let groupSubdivisionStart = 0

        meterDefinition.groupSubdivisionLengths.forEach((groupLength, beatIndex) => {
          const beatStart = timing.startSeconds + groupSubdivisionStart * timing.subdivisionSeconds
          if (beatStart > totalDuration) {
            return
          }

          const isDownBeat = beatIndex === 0
          scheduledTransportEventsRef.current.push(
            Tone.Transport.schedule((time) => {
              metronome.triggerAttackRelease(
                isDownBeat ? 'C6' : 'A5',
                '32n',
                time,
                isDownBeat ? 0.9 : 0.55,
              )
            }, beatStart),
          )
          groupSubdivisionStart += groupLength
        })
      })
    }

    startPlayheadAnimation(totalDuration)
    Tone.Transport.start(`+${PLAYBACK_START_DELAY_SECONDS}`)

    playbackTimerRef.current = window.setTimeout(() => {
      setIsPlaying(false)
      clearScheduledPlayback()
      stopPlaybackVisuals()
    }, (totalDuration + 0.3) * 1000)

    setIsPlaying(true)
    const hasBarTempoMarks = measures.some(
      (measure, measureIndex) => measureIndex > 0 && measure.tempoBpm !== null,
    )
    setStatus(
      isMetronomeEnabled
        ? hasBarTempoMarks
          ? 'Playing with measure tempo marks and metronome.'
          : `Playing at ${tempoBpm} BPM with metronome.`
        : hasBarTempoMarks
          ? 'Playing with measure tempo marks.'
          : `Playing at ${tempoBpm} BPM.`,
    )
  }

  function updateTempo(nextTempo: number) {
    if (Number.isNaN(nextTempo)) {
      return
    }

    setTempoBpm(clampTempo(nextTempo))
  }

  function applyTempoToActiveMeasure() {
    const parsedTempo = Number(measureTempoInput)

    if (!Number.isFinite(parsedTempo)) {
      setStatus('Enter a BPM value before applying a measure tempo.')
      return
    }

    const nextTempo = clampTempo(parsedTempo)
    setMeasures((current) => {
      const draft = cloneMeasures(current)
      const targetMeasure = draft[boundedActiveMeasureIndex]

      if (targetMeasure) {
        targetMeasure.tempoBpm = nextTempo
      }

      return draft
    })
    setMeasureTempoInput(String(nextTempo))
    setHelpCard(BAR_ACTION_HELP.tempo)
    setStatus(`Measure ${boundedActiveMeasureIndex + 1} tempo set to ${nextTempo} BPM.`)
  }

  function clearTempoFromActiveMeasure() {
    const draft = cloneMeasures(measures)
    const targetMeasure = draft[boundedActiveMeasureIndex]

    if (!targetMeasure?.tempoBpm) {
      setStatus(`Measure ${boundedActiveMeasureIndex + 1} is already using the inherited tempo.`)
      return
    }

    targetMeasure.tempoBpm = null
    const inheritedTempo = getEffectiveMeasureTempo(
      draft,
      boundedActiveMeasureIndex,
      tempoBpm,
    )

    setMeasures(draft)
    setMeasureTempoInput(String(inheritedTempo))
    setHelpCard(BAR_ACTION_HELP.tempo)
    setStatus(
      `Cleared the explicit tempo from measure ${boundedActiveMeasureIndex + 1}. It now uses ${inheritedTempo} BPM.`,
    )
  }

  function selectMode(nextMode: EditMode) {
    setMode(nextMode)
    setHelpCard(MODE_HELP[nextMode])
    clearPendingInsertPreview()
    setPendingSlurSelection(null)
    setScoreFrontPopover(null)
    setHoveredRestPosition(null)
  }

  function changeTimeSignature(
    nextTimeSignature: TimeSignature,
    nextGroupingOverride: number[] | null = null,
  ) {
    const nextMeter = parseTimeSignature(nextTimeSignature, nextGroupingOverride)
    const normalizedGroupingOverride = haveSameNumberSequence(
      nextMeter.grouping,
      parseTimeSignature(nextMeter.display).grouping,
    )
      ? null
      : nextMeter.grouping

    if (
      nextMeter.display === meterDefinition.display &&
      haveSameNumberSequence(normalizedGroupingOverride, timeSignatureGrouping)
    ) {
      setScoreFrontPopover(null)
      return
    }

    const nextSubdivisionsPerMeasure = nextMeter.subdivisionsPerMeasure
    const { measures: nextMeasures, removedItemCount } = trimMeasuresForTimeSignature(
      measures,
      nextSubdivisionsPerMeasure,
      keySignature,
    )

    setHelpCard(getTimeSignatureHelp(nextMeter.display, normalizedGroupingOverride))
    setTimeSignature(nextMeter.display)
    setTimeSignatureGrouping(normalizedGroupingOverride)
    setMeasures(nextMeasures)
    clearPendingInsertPreview()
    setPendingSlurSelection(null)
    setScoreFrontPopover(null)
    setActiveMeasureIndex(0)
    setActiveItemId(null)
    clearHoverState()
    pianoRef.current?.releaseAll()
    clearScheduledPlayback()
    stopPlaybackVisuals()
    setIsPlaying(false)
    setStatus(
      removedItemCount > 0
        ? `Switched to ${nextMeter.display}. Removed ${removedItemCount} note or rest item(s) that no longer fit the new measure length.`
        : `Switched to ${nextMeter.display}. Existing notes and rests were preserved.`,
    )
  }

  function applyCustomTimeSignature() {
    const numerator = Number(timeSignatureNumeratorInput)
    const denominator = Number(timeSignatureDenominatorInput)

    if (!Number.isInteger(numerator) || numerator <= 0) {
      setStatus('Time signature numerator must be a positive integer.')
      return
    }

    if (![2, 4, 8, 16].includes(denominator)) {
      setStatus('Time signature denominator must be one of 2, 4, 8, or 16.')
      return
    }

    const groupingOverride = parseGroupingInput(timeSignatureGroupingInput)

    if (
      groupingOverride &&
      groupingOverride.reduce((sum, value) => sum + value, 0) !== numerator
    ) {
      setStatus('Grouping must add up exactly to the time-signature numerator.')
      return
    }

    changeTimeSignature(
      `${numerator}/${denominator}`,
      groupingOverride,
    )
  }

  function applyKeySignatureChange(
    nextKeySignature: KeySignatureSpec,
    shouldTranspose = transposeOnKeyChange,
  ) {
    if (nextKeySignature === keySignature) {
      setScoreFrontPopover(null)
      return
    }

    const transformedMeasures = shouldTranspose
      ? transposeMeasuresForKeySignature(measures, keySignature, nextKeySignature)
      : rewriteMeasuresForKeySignature(measures, keySignature, nextKeySignature)
    const normalizedMeasures = normalizeMeasures(
      transformedMeasures,
      subdivisionsPerMeasure,
      nextKeySignature,
    )

    pianoRef.current?.releaseAll()
    clearScheduledPlayback()
    stopPlaybackVisuals()
    setIsPlaying(false)
    setMeasures(normalizedMeasures)
    setKeySignature(nextKeySignature)
    setHelpCard(getKeySignatureHelp(nextKeySignature))
    clearPendingInsertPreview()
    setPendingSlurSelection(null)
    setScoreFrontPopover(null)
    clearHoverState()
    setStatus(
      shouldTranspose
        ? `Key signature changed to ${getKeySignatureNames(nextKeySignature)} (${getKeySignatureMeta(nextKeySignature).countLabel}). Existing notes were transposed into the new key.`
        : `Key signature changed to ${getKeySignatureNames(nextKeySignature)} (${getKeySignatureMeta(nextKeySignature).countLabel}). Existing notes kept their sounding pitch and were respelled for the new key.`,
    )
  }



  function openScoreFrontPopover(hotspot: ScoreFrontHotspot) {
    if (
      scoreFrontPopover &&
      scoreFrontPopover.kind === hotspot.kind &&
      scoreFrontPopover.measureIndex === hotspot.measureIndex
    ) {
      setScoreFrontPopover(null)
      return
    }

    setActiveTab('bars')
    setActiveMeasureIndex(hotspot.measureIndex)
    setScoreFrontPopover({
      anchorCenter: hotspot.left + hotspot.width / 2,
      kind: hotspot.kind,
      measureIndex: hotspot.measureIndex,
      top: hotspot.top + hotspot.height - 20,
    })
    setHelpCard(
      hotspot.kind === 'timeSignature'
        ? getTimeSignatureHelp(timeSignature, timeSignatureGrouping)
        : getKeySignatureHelp(keySignature),
    )
    setStatus(
      hotspot.kind === 'timeSignature'
        ? 'Choose a time signature for the whole score.'
        : `Choose a key signature for the whole score. Current: ${getKeySignatureNames(keySignature)}. ${getKeySignatureChangeModeDescription(transposeOnKeyChange)}`,
    )
  }

  function addMeasure() {
    pianoRef.current?.releaseAll()
    clearScheduledPlayback()
    stopPlaybackVisuals()
    setIsPlaying(false)
    setMeasures((current) => [
      ...current,
      createMeasure(`measure-${current.length + 1}`),
    ])
    clearPendingInsertPreview()
    setPendingSlurSelection(null)
    setScoreFrontPopover(null)
    setHelpCard(BAR_ACTION_HELP.add)
    setStatus('Added one measure. The layout wraps automatically as the score grows.')
  }

  function removeMeasure() {
    pianoRef.current?.releaseAll()
    clearScheduledPlayback()
    stopPlaybackVisuals()
    setIsPlaying(false)
    setMeasures((current) => {
      if (current.length === 1) {
        setStatus('At least one measure must remain.')
        return current
      }

      return normalizeMeasures(current.slice(0, -1), subdivisionsPerMeasure, keySignature)
    })

    setActiveItemId(null)
    setHelpCard(BAR_ACTION_HELP.remove)
    clearPendingInsertPreview()
    setPendingSlurSelection(null)
    setScoreFrontPopover(null)
    clearHoverState()
  }

  function startNewComposition() {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Start a new composition? Save locally first if you want to keep the current version available in this browser.',
      )
    ) {
      setIsFileMenuOpen(false)
      return
    }

    pianoRef.current?.releaseAll()
    clearScheduledPlayback()
    stopPlaybackVisuals()
    setIsPlaying(false)
    setTimeSignature(DEFAULT_NEW_COMPOSITION_TIME_SIGNATURE)
    setTimeSignatureGrouping(null)
    setKeySignature('C')
    setGrandStaffLayoutMode('independent')
    setMeasures(buildBlankMeasures())
    setSlurs([])
    setTempoBpm(DEFAULT_NEW_COMPOSITION_TEMPO)
    setMeasureTempoInput(String(DEFAULT_NEW_COMPOSITION_TEMPO))
    setTimeSignatureNumeratorInput('4')
    setTimeSignatureDenominatorInput('4')
    setTimeSignatureGroupingInput('')
    clearPendingInsertPreview()
    setPendingSlurSelection(null)
    setScoreFrontPopover(null)
    setActiveMeasureIndex(0)
    setBaseDuration('8')
    setDotted(false)
    setAccidental(null)
    setActiveTab('notes')
    setHelpCard(getToolbarTabHelp('notes'))
    setMode('note')
    setActiveItemId(null)
    setLyricsInput('')
    setScoreTitle('')
    setScoreSubtitle('')
    setScoreComposer('')
    setScoreLyricist('')
    setScoreArranger('')
    setExportDialog(null)
    setSaveDialog(null)
    setIsFileMenuOpen(false)
    setIsInstructionsOpen(false)
    clearHoverState()
    setStatus('Started a new composition. Click a rest slot once to arm note insertion, then click again to place the note.')
  }

  function openSaveCompositionDialog() {
    const defaultName = scoreTitle.trim() || 'Untitled Composition'
    setIsFileMenuOpen(false)
    setSaveDialog({ name: defaultName })
    setTimeout(() => saveFilenameInputRef.current?.select(), 30)
  }

  function confirmSaveComposition(name: string) {
    const title = name.trim() || 'Untitled Composition'

    try {
      const payload = buildScoreIoPayload()
      const snapshot: SavedCompositionSnapshot = {
        layoutMode: grandStaffLayoutMode,
        payload,
        savedAt: new Date().toISOString(),
        title,
        version: 1,
      }

      writeSavedCompositionSnapshot(snapshot)
      setSavedCompositionSnapshot(snapshot)
      setSaveDialog(null)
      setStatus(`Saved composition locally as "${title}".`)
    } catch (error) {
      console.error('Save composition failed:', error)
      setStatus(
        error instanceof Error
          ? `Failed to save composition: ${error.message}`
          : 'Failed to save composition.',
      )
    }
  }

  function loadSavedComposition() {
    const snapshot = readSavedCompositionSnapshot()
    setIsFileMenuOpen(false)

    if (!snapshot) {
      setSavedCompositionSnapshot(null)
      setStatus('No saved composition was found in this browser yet.')
      return
    }

    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `Load saved composition "${snapshot.title}"? Current unsaved changes will be replaced.`,
      )
    ) {
      return
    }

    setSavedCompositionSnapshot(snapshot)
    applyImportedMusicXml(snapshot.payload, {
      layoutMode: snapshot.layoutMode ?? snapshot.payload.layoutMode ?? 'independent',
    })
    setStatus(`Loaded saved composition "${snapshot.title}".`)
  }

  function clearScore() {
    pianoRef.current?.releaseAll()
    clearScheduledPlayback()
    stopPlaybackVisuals()
    setIsPlaying(false)
    const numMeasures = measures.length
    setMeasures(
      Array.from({ length: Math.max(numMeasures, 4) }, (_, i) => createMeasure(`measure-${i + 1}`)),
    )
    setSlurs([])
    clearPendingInsertPreview()
    setPendingSlurSelection(null)
    setScoreFrontPopover(null)
    setActiveMeasureIndex(0)
    setActiveItemId(null)
    setHelpCard(BAR_ACTION_HELP.clear)
    clearHoverState()
    setStatus('Score cleared. The blue teardrop now marks the next insert position.')
  }

  function applyLyrics(text: string) {
    if (!activeItemId) {
      setStatus('Select a note first, then type lyrics.')
      return
    }
    setHelpCard({
      description: text
        ? 'Lyrics attach to the selected note and render on the shared lyric line.'
        : 'Lyrics can be removed from the selected note without changing the notation.',
      title: text ? 'Apply Lyrics' : 'Clear Lyrics',
    })
    mutateMeasures((draft) => {
      for (const measure of draft) {
        for (const staffId of STAFF_IDS) {
          const items = getItemsForStaff(measure, staffId)
          const target = items.find((item) => item.id === activeItemId && item.kind === 'note') as NoteItem | undefined
          if (target) {
            target.lyrics = text || undefined
            return { activeItemId: target.id, status: text ? `Lyrics set: "${text}"` : 'Lyrics removed.' }
          }
        }
      }
      return { status: 'Could not find the selected note.' }
    })
  }

  function updateSelectedNote(
    updater: (target: NoteItem) => string,
    emptyStatus = 'Click an existing note first, then use this toolbar section.',
  ) {
    if (!activeItemId) {
      setStatus(emptyStatus)
      return
    }

    mutateMeasures((draft) => {
      for (const measure of draft) {
        for (const staffId of STAFF_IDS) {
          const items = getItemsForStaff(measure, staffId)
          const target = items.find(
            (item) => item.id === activeItemId && item.kind === 'note',
          ) as NoteItem | undefined

          if (target) {
            return {
              activeItemId: target.id,
              status: updater(target),
            }
          }
        }
      }

      return {
        activeItemId: null,
        status: 'Could not find the selected note.',
      }
    })
  }

  function toggleSlurBetweenNotes(
    startSelection: PendingSlurSelection,
    endSelection: PendingSlurSelection,
  ) {
    if (startSelection.noteId === endSelection.noteId) {
      setPendingSlurSelection(null)
      setStatus('Slur selection cancelled.')
      return
    }

    if (startSelection.staffId !== endSelection.staffId) {
      setStatus('Long slurs currently need both notes to be on the same staff.')
      return
    }

    const startSystemIndex = getSystemIndexForMeasure(systems, startSelection.measureIndex)
    const endSystemIndex = getSystemIndexForMeasure(systems, endSelection.measureIndex)

    if (
      startSystemIndex < 0 ||
      endSystemIndex < 0 ||
      startSystemIndex !== endSystemIndex
    ) {
      setStatus('Long slurs currently need both notes to stay within the same visible system.')
      return
    }

    const shouldSwap =
      endSelection.measureIndex < startSelection.measureIndex ||
      (
        endSelection.measureIndex === startSelection.measureIndex &&
        endSelection.subdivision < startSelection.subdivision
      )
    const fromSelection = shouldSwap ? endSelection : startSelection
    const toSelection = shouldSwap ? startSelection : endSelection
    let didRemoveExistingSlur = false

    setSlurs((current) => {
      const existingIndex = current.findIndex(
        (slur) =>
          slur.fromNoteId === fromSelection.noteId &&
          slur.toNoteId === toSelection.noteId &&
          slur.staffId === fromSelection.staffId,
      )

      if (existingIndex >= 0) {
        const next = [...current]
        next.splice(existingIndex, 1)
        didRemoveExistingSlur = true
        return next
      }

      return [
        ...current,
        {
          fromNoteId: fromSelection.noteId,
          id: generateId(),
          staffId: fromSelection.staffId,
          toNoteId: toSelection.noteId,
        },
      ]
    })

    setActiveItemId(toSelection.noteId)
    setPendingSlurSelection(null)
    setHelpCard(MODE_HELP.slur)
    setStatus(didRemoveExistingSlur ? 'Long slur removed.' : 'Long slur added.')
  }

  function toggleArticulation(nextArticulation: ArticulationType) {
    setHelpCard(ARTICULATION_HELP[nextArticulation])
    updateSelectedNote((target) => {
      target.articulation =
        target.articulation === nextArticulation ? undefined : nextArticulation
      return target.articulation
        ? `Applied ${ARTICULATION_LABELS[target.articulation]} to ${getPitchLabels(target.pitches, target.accidentals, keySignature)}.`
        : `Removed articulation from ${getPitchLabels(target.pitches, target.accidentals, keySignature)}.`
    })
  }

  function clearArticulation() {
    setHelpCard({
      description: 'Clear removes the articulation mark from the selected note without affecting pitch or rhythm.',
      title: 'Clear Articulation',
    })
    updateSelectedNote((target) => {
      target.articulation = undefined
      return `Cleared articulation from ${getPitchLabels(target.pitches, target.accidentals, keySignature)}.`
    })
  }

  function toggleOrnament(nextOrnament: OrnamentType) {
    setHelpCard(ORNAMENT_HELP[nextOrnament])
    updateSelectedNote((target) => {
      target.ornament = target.ornament === nextOrnament ? undefined : nextOrnament
      return target.ornament
        ? `Applied ${ORNAMENT_LABELS[target.ornament]} to ${getPitchLabels(target.pitches, target.accidentals, keySignature)}.`
        : `Removed ornament from ${getPitchLabels(target.pitches, target.accidentals, keySignature)}.`
    })
  }

  function clearOrnament() {
    setHelpCard({
      description: 'Clear removes the ornament from the selected note while leaving the note itself unchanged.',
      title: 'Clear Ornament',
    })
    updateSelectedNote((target) => {
      target.ornament = undefined
      return `Cleared ornament from ${getPitchLabels(target.pitches, target.accidentals, keySignature)}.`
    })
  }

  function toggleDynamic(nextDynamic: DynamicType) {
    setHelpCard(DYNAMIC_HELP[nextDynamic])
    updateSelectedNote((target) => {
      target.dynamic = target.dynamic === nextDynamic ? undefined : nextDynamic
      return target.dynamic
        ? `Applied ${target.dynamic} to ${getPitchLabels(target.pitches, target.accidentals, keySignature)}.`
        : `Removed dynamic from ${getPitchLabels(target.pitches, target.accidentals, keySignature)}.`
    })
  }

  function clearDynamic() {
    setHelpCard({
      description: 'Clear removes the dynamic marking from the selected note.',
      title: 'Clear Dynamic',
    })
    updateSelectedNote((target) => {
      target.dynamic = undefined
      return `Cleared dynamic from ${getPitchLabels(target.pitches, target.accidentals, keySignature)}.`
    })
  }

  function selectToolbarTab(nextTab: ToolbarTab) {
    setActiveTab(nextTab)
    setHelpCard(getToolbarTabHelp(nextTab))
    clearPendingInsertPreview()
    setPendingSlurSelection(null)
    setScoreFrontPopover(null)
    clearHoverState()
    setHoveredRestPosition(null)
  }

  function applyImportedMusicXml(
    payload: CompositionIoPayload,
    options?: { layoutMode?: CompositionLayoutMode },
  ) {
    const importedMeter = parseTimeSignature(
      payload.timeSignature,
      payload.timeSignatureGrouping,
    )
    const nextLayoutMode =
      options?.layoutMode ?? payload.layoutMode ?? 'independent'

    pianoRef.current?.releaseAll()
    clearScheduledPlayback()
    stopPlaybackVisuals()
    setIsPlaying(false)
    setTimeSignature(importedMeter.display)
    setTimeSignatureGrouping(payload.timeSignatureGrouping)
    setKeySignature(payload.keySignature)
    setGrandStaffLayoutMode(nextLayoutMode)
    setMeasures(
      normalizeMeasures(payload.measures, importedMeter.subdivisionsPerMeasure, payload.keySignature),
    )
    setSlurs(
      payload.slurs.map((slur) => ({
        ...slur,
        id: slur.id ?? generateId(),
      })),
    )
    setTempoBpm(payload.tempoBpm)
    setMeasureTempoInput(String(payload.tempoBpm))
    setTimeSignatureNumeratorInput(String(importedMeter.numerator))
    setTimeSignatureDenominatorInput(String(importedMeter.denominator) as '2' | '4' | '8' | '16')
    setTimeSignatureGroupingInput(
      payload.timeSignatureGrouping?.join('+') ?? '',
    )
    clearPendingInsertPreview()
    setPendingSlurSelection(null)
    setScoreFrontPopover(null)
    setActiveMeasureIndex(0)
    setBaseDuration('8')
    setActiveTab('notes')
    setHelpCard(getToolbarTabHelp('notes'))
    setMode('note')
    setActiveItemId(null)
    setLyricsInput('')
    setScoreTitle(payload.scoreTitle)
    setScoreSubtitle(payload.scoreSubtitle)
    setScoreComposer(payload.scoreComposer)
    setScoreLyricist(payload.scoreLyricist)
    setScoreArranger(payload.scoreArranger)
    clearHoverState()
  }

  function buildScoreIoPayload(): CompositionIoPayload {
    return {
      keySignature,
      layoutMode: grandStaffLayoutMode,
      measures,
      scoreArranger,
      scoreComposer,
      scoreLyricist,
      scoreSubtitle,
      scoreTitle,
      slurs,
      tempoBpm,
      timeSignature,
      timeSignatureGrouping,
    }
  }

  useEffect(() => {
    if (!pdfRenderJobId) {
      return
    }

    let cancelled = false
    setIsPdfRenderJobReady(false)
    window.__PDF_EXPORT_ERROR__ = undefined
    window.__PDF_RENDER_META__ = undefined
    window.__PDF_RENDER_READY__ = false

    void (async () => {
      try {
        const response = await fetch(`/api/pdf/jobs/${encodeURIComponent(pdfRenderJobId)}`)
        if (!response.ok) {
          throw new Error('Backend PDF job could not be loaded.')
        }

        const job = await response.json() as { filename: string; payload: CompositionIoPayload }
        if (cancelled) {
          return
        }

        applyImportedMusicXml(job.payload, {
          layoutMode: job.payload.layoutMode ?? 'independent',
        })
        setIsPdfRenderJobReady(true)
        setStatus(`Rendering "${job.filename}.pdf"...`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Backend PDF render failed.'
        window.__PDF_EXPORT_ERROR__ = message
        setStatus(message)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pdfRenderJobId])

  useEffect(() => {
    if (!pdfRenderJobId || !isPdfRenderJobReady || !scoreRef.current?.querySelector('svg')) {
      return
    }

    if (window.__PDF_RENDER_READY__ || window.__PDF_EXPORT_ERROR__) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
        })
        if ('fonts' in document) {
          await Promise.allSettled([
            document.fonts.load('16px Bravura'),
            document.fonts.ready,
          ])
        }

        if (cancelled) {
          return
        }

        const pdfSystemBoundsSvg: PdfSystemBound[] =
          pdfSystemBoundsRef.current.length === systems.length
            ? pdfSystemBoundsRef.current
            : systems.map((_, systemIndex) => {
                const systemTop = scoreTop + systemIndex * SYSTEM_GAP_Y - 26
                const systemBottom = scoreTop + systemIndex * SYSTEM_GAP_Y + GRAND_STAFF_GAP + 68
                return {
                  top: systemTop,
                  bottom: systemBottom,
                }
              })

        if (cancelled) {
          return
        }

        window.__PDF_RENDER_META__ = {
          systemBoundsSvg: pdfSystemBoundsSvg,
        }
        window.__PDF_RENDER_READY__ = true
        setStatus('Rendered score for backend PDF capture.')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Backend PDF render failed.'
        window.__PDF_EXPORT_ERROR__ = message
        setStatus(message)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    pdfRenderJobId,
    isPdfRenderJobReady,
    scoreTop,
    scoreTitle,
    scoreSubtitle,
    scoreComposer,
    scoreLyricist,
    scoreArranger,
    systems,
    keySignature,
    measures,
    slurs,
    tempoBpm,
    timeSignature,
    timeSignatureGrouping,
  ])

  function handleExportMusicXML() {
    setIsFileMenuOpen(false)
    void (async () => {
      try {
        await exportMusicXMLViaBackend(buildScoreIoPayload())
        setStatus('MusicXML downloaded successfully.')
      } catch (err) {
        console.error('Export MusicXML failed:', err)
        setStatus('Failed to export MusicXML.')
      }
    })()
  }

  function handleImportMusicXMLClick() {
    if (isImportingMusicXml) return
    setIsFileMenuOpen(false)
    importMusicXmlInputRef.current?.click()
  }

  async function handleImportMusicXMLFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || isImportingMusicXml) {
      return
    }

    setIsImportingMusicXml(true)
    setStatus(`Importing "${file.name}"...`)

    try {
      const xml = await file.text()
      const payload = await importMusicXMLViaBackend(xml)
      applyImportedMusicXml(payload, { layoutMode: 'linked' })
      const warningSuffix =
        payload.warnings && payload.warnings.length > 0
          ? ` Imported with ${payload.warnings.length} warning(s); see console for details.`
          : ''

      if (payload.warnings && payload.warnings.length > 0) {
        console.warn('MusicXML import warnings:', payload.warnings)
      }

      setStatus(`Imported "${file.name}" successfully.${warningSuffix}`)
    } catch (err) {
      console.error('Import MusicXML failed:', err)
      setStatus(
        err instanceof Error
          ? `Failed to import MusicXML: ${err.message}`
          : 'Failed to import MusicXML.',
      )
    } finally {
      setIsImportingMusicXml(false)
    }
  }

  function handleExportPDF() {
    if (isExporting) return
    setIsFileMenuOpen(false)
    const defaultName = (scoreTitle || 'score').replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u4e00-\u9fff ]/g, '_').trim() || 'score'
    setExportDialog({ filename: defaultName })
    setTimeout(() => exportFilenameInputRef.current?.select(), 30)
  }

  // Called by the dialog's Confirm button or Enter key
  async function confirmExport(filename: string) {
    if (!exportDialog) return
    const safeName = filename.trim() || 'score'
    setExportDialog(null)

    if (isExporting) return
    setIsExporting(true)
    setStatus('Generating PDF…')
    try {
      await exportPDFViaBackend({
        filename: safeName,
        payload: buildScoreIoPayload(),
      })
      setStatus(`PDF saved as "${safeName}.pdf".`)
    } catch (err) {
      console.error('Export PDF failed:', err)
      setStatus('Failed to export PDF.')
    } finally {
      setIsExporting(false)
    }
  }

  if (isPdfRenderMode) {
    return (
      <div
        style={{
          background: '#ffffff',
          margin: 0,
          minHeight: `${scoreHeight}px`,
          padding: 0,
        }}
      >
        <div
          className="score-surface"
          style={{
            background: '#ffffff',
            height: `${scoreHeight}px`,
            margin: 0,
            overflow: 'visible',
            padding: 0,
            width: `${scoreWidth}px`,
          }}
        >
          <div className="score-canvas" ref={scoreRef} />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <input
        ref={importMusicXmlInputRef}
        accept=".musicxml,.xml,application/xml,text/xml"
        hidden
        onChange={handleImportMusicXMLFile}
        type="file"
      />
      {exportDialog && (
        <div
          className="export-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Save file"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setExportDialog(null)
          }}
        >
          <div className="export-dialog">
            <div className="export-dialog__header">
              <span className="export-dialog__icon">📄</span>
              <h2 className="export-dialog__title">Save as PDF</h2>
            </div>
            <p className="export-dialog__hint">
              Enter a file name (without extension). The file will be saved to your Downloads folder.
            </p>
            <div className="export-dialog__field">
              <input
                ref={exportFilenameInputRef}
                autoFocus
                className="export-dialog__input"
                id="export-filename-input"
                maxLength={120}
                onChange={(e) =>
                  setExportDialog((d) => (d ? { filename: e.target.value } : d))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmExport(exportDialog.filename)
                  }
                }}
                placeholder="Score filename"
                type="text"
                value={exportDialog.filename}
              />
              <span className="export-dialog__ext">.pdf</span>
            </div>
            <div className="export-dialog__actions">
              <button
                className="export-dialog__cancel"
                onClick={() => setExportDialog(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="export-dialog__confirm"
                disabled={!exportDialog.filename.trim()}
                onClick={() => confirmExport(exportDialog.filename)}
                type="button"
              >
                ↓ Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {saveDialog && (
        <div
          className="export-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Save composition"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSaveDialog(null)
          }}
        >
          <div className="export-dialog">
            <div className="export-dialog__header">
              <span className="export-dialog__icon">Save</span>
              <h2 className="export-dialog__title">Save composition</h2>
            </div>
            <p className="export-dialog__hint">
              Enter a name for this composition. It will be saved locally in this browser.
            </p>
            <div className="export-dialog__field">
              <input
                ref={saveFilenameInputRef}
                autoFocus
                className="export-dialog__input"
                maxLength={120}
                onChange={(event) =>
                  setSaveDialog((current) => (
                    current ? { name: event.target.value } : current
                  ))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    confirmSaveComposition(saveDialog.name)
                  }
                }}
                placeholder="Composition name"
                type="text"
                value={saveDialog.name}
              />
            </div>
            <div className="export-dialog__actions">
              <button
                className="export-dialog__cancel"
                onClick={() => setSaveDialog(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="export-dialog__confirm"
                disabled={!saveDialog.name.trim()}
                onClick={() => confirmSaveComposition(saveDialog.name)}
                type="button"
              >
                Save Composition
              </button>
            </div>
          </div>
        </div>
      )}
      {isInstructionsOpen ? (
        <div
          className="info-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Instructions"
          onClick={() => setIsInstructionsOpen(false)}
        >
          <div
            className="info-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="info-dialog__header">
              <div>
                <h2>Instructions</h2>
                <p>How to create, import, save, and export a composition.</p>
              </div>
              <button
                className="info-dialog__close"
                onClick={() => setIsInstructionsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="info-dialog__body">
              <section className="info-dialog__section">
                <h3>Starting a piece</h3>
                <ul>
                  <li>Use `NEW COMPOSITION` for a blank 4/4 score with a default tempo of 80 BPM.</li>
                  <li>Use `FILE` to reopen a saved composition or import a MusicXML file into the current editor.</li>
                  <li>Imported MusicXML files are shown with linked treble and bass beat alignment.</li>
                </ul>
              </section>

              <section className="info-dialog__section">
                <h3>Writing notes</h3>
                <ul>
                  <li>Choose a note value, then click a rest slot once to arm it and click again to place the note.</li>
                  <li>Select an existing note to add articulations, ornaments, dynamics, lyrics, ties, or slurs.</li>
                  <li>Click the time signature or key signature at the start of a system to change it directly on the score.</li>
                </ul>
              </section>

              <section className="info-dialog__section">
                <h3>Saving and loading</h3>
                <ul>
                  <li>Open `FILE` and choose `Save Composition` to store the current score locally in this browser.</li>
                  <li>Choose `Open Saved Composition` to restore the last locally saved score.</li>
                  <li>Local save keeps your title, tempo, notation, imported content, and current layout mode.</li>
                </ul>
              </section>

              <section className="info-dialog__section">
                <h3>Importing and exporting</h3>
                <ul>
                  <li>`Import File` accepts `.musicxml` and `.xml` files.</li>
                  <li>`Export MusicXML` downloads the current score as MusicXML for notation software.</li>
                  <li>`Export PDF` downloads a paginated PDF of the current score.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      ) : null}
      <header className="topbar">
        <div className="brand">
          <img
            src="/logo-navigationx60.png"
            alt="Nifty Notes"
            className="brand-logo"
          />
        </div>

        <div className="topbar-actions">
          <button
            className="secondary-pill secondary-pill--new"
            onClick={startNewComposition}
            type="button"
          >
            NEW COMPOSITION
          </button>
          <div className="file-menu" ref={fileMenuRef}>
            <button
              aria-expanded={isFileMenuOpen}
              className={isFileMenuOpen ? 'secondary-pill active' : 'secondary-pill'}
              onClick={() => {
                setIsTempoPanelOpen(false)
                setIsFileMenuOpen((current) => !current)
              }}
              type="button"
            >
              FILE
            </button>
            {isFileMenuOpen ? (
              <div className="file-menu__panel">
                <div className="file-menu__section">
                  <button
                    className="file-menu__item"
                    onClick={startNewComposition}
                    type="button"
                  >
                    New Composition
                  </button>
                  <button
                    className="file-menu__item"
                    onClick={openSaveCompositionDialog}
                    type="button"
                  >
                    Save Composition
                  </button>
                  <button
                    className="file-menu__item"
                    onClick={loadSavedComposition}
                    type="button"
                  >
                    Open Saved Composition
                  </button>
                  <div className="file-menu__meta">
                    {savedCompositionSnapshot
                      ? `Saved locally: ${savedCompositionSnapshot.title} · ${new Date(savedCompositionSnapshot.savedAt).toLocaleString()}`
                      : 'No local save in this browser yet.'}
                  </div>
                </div>

                <div className="file-menu__section">
                  <button
                    className="file-menu__item"
                    disabled={isImportingMusicXml}
                    onClick={handleImportMusicXMLClick}
                    type="button"
                  >
                    {isImportingMusicXml ? 'Importing...' : 'Import File'}
                  </button>
                  <button
                    className="file-menu__item"
                    disabled={isImportingMusicXml}
                    onClick={handleExportMusicXML}
                    type="button"
                  >
                    Export MusicXML
                  </button>
                  <button
                    className="file-menu__item"
                    disabled={isExporting || isImportingMusicXml}
                    onClick={handleExportPDF}
                    type="button"
                  >
                    {isExporting ? 'Generating PDF...' : 'Export PDF'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <button
            className={isInstructionsOpen ? 'secondary-pill active' : 'secondary-pill'}
            onClick={() => {
              setIsFileMenuOpen(false)
              setIsInstructionsOpen(true)
            }}
            type="button"
          >
            INSTRUCTIONS
          </button>
          <div className="selection-chip">
            <span className="selection-chip__label">Selected</span>
            <strong>{activeNoteLabel}</strong>
          </div>
          <button className="primary-pill" onClick={handlePlay} type="button">
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <div className="tempo-control" ref={tempoPanelRef}>
            <button
              aria-expanded={isTempoPanelOpen}
              className={`tempo-chip${isTempoPanelOpen ? ' active' : ''}`}
              onClick={() => {
                setIsFileMenuOpen(false)
                setIsTempoPanelOpen((current) => !current)
              }}
              type="button"
            >
              Default Tempo {tempoBpm} BPM
            </button>
            {isTempoPanelOpen ? (
              <div className="tempo-panel">
                <label className="tempo-panel__field">
                  <span>Default Tempo</span>
                  <input
                    max={MAX_BPM}
                    min={MIN_BPM}
                    onChange={(event) => updateTempo(Number(event.target.value))}
                    type="range"
                    value={tempoBpm}
                  />
                </label>
                <label className="tempo-panel__field tempo-panel__field--number">
                  <span>BPM</span>
                  <input
                    max={MAX_BPM}
                    min={MIN_BPM}
                    onChange={(event) => updateTempo(Number(event.target.value))}
                    type="number"
                    value={tempoBpm}
                  />
                </label>
              </div>
            ) : null}
          </div>
          <button
            className={isMetronomeEnabled ? 'secondary-pill active' : 'secondary-pill'}
            onClick={() => setIsMetronomeEnabled((current) => !current)}
            type="button"
          >
            {isMetronomeEnabled ? 'Metronome On' : 'Metronome Off'}
          </button>
        </div>
      </header>
      <img
        src="/bird-waving.png"
        alt=""
        className="sidebar-mascot"
        aria-hidden="true"
      />

      <div className="toolbar-wrap">
        <div className="toolbar-shell">
          <div className="toolbar-tabs" aria-label="Composer toolbar" role="tablist">
            {TOOLBAR_TABS.map((tab) => (
              <button
                key={tab.id}
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? 'toolbar-tab active' : 'toolbar-tab'}
                onClick={() => {
                  selectToolbarTab(tab.id)
                  if (!isToolbarExpanded) setIsToolbarExpanded(true)
                }}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}

            <button
              className="toolbar-tab"
              style={{ marginLeft: 'auto', fontWeight: 'bold' }}
              onClick={() => setIsToolbarExpanded((current) => !current)}
              type="button"
            >
              {isToolbarExpanded ? '▲ ' : '▼ '}
            </button>
          </div>

          {isToolbarExpanded && (
            <div className="toolbar-panel">
              <div className="toolbar">
              {activeTab === 'notes' ? (
                <>
                  <div className="tool-group tool-group--duration">
                    <span className="group-label">Note Value</span>
                    {DURATION_OPTIONS.map((option) => (
                      <button
                        key={`${option.baseDuration}-${option.dots}`}
                        aria-label={option.label}
                        className={
                          baseDuration === option.baseDuration && (dotted ? 1 : 0) === option.dots
                            ? 'tool tool--glyph active'
                            : 'tool tool--glyph'
                        }
                        onClick={() => {
                          setBaseDuration(option.baseDuration);
                          setDotted(option.dots === 1);
                          setHelpCard(getDurationHelp(option.baseDuration, option.dots === 1));
                        }}
                        title={option.label}
                        type="button"
                      >
                        {buildDurationGlyph(option.baseDuration, option.dots === 1)}
                      </button>
                    ))}
                  </div>


                  <div className="tool-group">
                    <span className="group-label">Accidentals</span>
                    <button
                      aria-label="Natural"
                      className={accidental === 'n' ? 'tool tool--acc active' : 'tool tool--acc'}
                      onClick={() => {
                        setAccidental((current) => (current === 'n' ? null : 'n'))
                        setHelpCard(ACCIDENTAL_HELP.n)
                      }}
                      title="Natural"
                      type="button"
                    >
                      <span className="acc-symbol">&#x266E;</span>
                    </button>
                    <button
                      aria-label="Sharp"
                      className={accidental === '#' ? 'tool tool--acc active' : 'tool tool--acc'}
                      onClick={() => {
                        setAccidental((current) => (current === '#' ? null : '#'))
                        setHelpCard(ACCIDENTAL_HELP['#'])
                      }}
                      title="Sharp"
                      type="button"
                    >
                      <span className="acc-symbol">&#x266F;</span>
                    </button>
                    <button
                      aria-label="Flat"
                      className={accidental === 'b' ? 'tool tool--acc active' : 'tool tool--acc'}
                      onClick={() => {
                        setAccidental((current) => (current === 'b' ? null : 'b'))
                        setHelpCard(ACCIDENTAL_HELP.b)
                      }}
                      title="Flat"
                      type="button"
                    >
                      <span className="acc-symbol">&#x266D;</span>
                    </button>
                  </div>

                  <div className="tool-group">
                    <span className="group-label">Action</span>
                    <button
                      className={mode === 'note' ? 'tool active' : 'tool'}
                      onClick={() => selectMode('note')}
                      type="button"
                    >
                      Insert Note
                    </button>
                    <button
                      className={mode === 'rest' ? 'tool active' : 'tool'}
                      onClick={() => selectMode('rest')}
                      type="button"
                    >
                      Insert Rest
                    </button>
                    <button
                      className={mode === 'tie' ? 'tool active' : 'tool'}
                      onClick={() => selectMode('tie')}
                      type="button"
                    >
                      Tie
                    </button>
                    <button
                      className={mode === 'slur' ? 'tool active' : 'tool'}
                      onClick={() => selectMode('slur')}
                      type="button"
                    >
                      Slur
                    </button>
                    <button
                      className={mode === 'erase' ? 'tool active' : 'tool'}
                      onClick={() => selectMode('erase')}
                      type="button"
                    >
                      Erase
                    </button>
                  </div>
                </>
              ) : null}

              {activeTab === 'bars' ? (
                <>
                  <div className="tool-group tool-group--time-signature">
                    <span className="group-label">Time & Key Sig</span>
                    {(['4/4', '3/4', '2/4'] as const).map((ts) => (
                      <button
                        key={ts}
                        className={timeSignature === ts ? 'tool active' : 'tool'}
                        onClick={() => changeTimeSignature(ts)}
                        type="button"
                      >
                        {ts}
                      </button>
                    ))}
                  </div>

                  <div className="tool-group tool-group--bar-tempo">
                    <span className="group-label">Bar Tempo</span>
                    <div className="toolbar-chip">Bar {boundedActiveMeasureIndex + 1}</div>
                    <label className="toolbar-inline-field toolbar-inline-field--tempo">
                      <span>BPM</span>
                      <input
                        max={MAX_BPM}
                        min={MIN_BPM}
                        onChange={(event) => setMeasureTempoInput(event.target.value)}
                        type="number"
                        value={measureTempoInput}
                      />
                    </label>
                    <button className="tool" onClick={applyTempoToActiveMeasure} type="button">
                      Set Bar Tempo
                    </button>
                    <button
                      className="tool tool--ghost"
                      disabled={!activeMeasure?.tempoBpm}
                      onClick={clearTempoFromActiveMeasure}
                      type="button"
                    >
                      Clear Tempo
                    </button>
                  </div>

                  <div className="tool-group compact">
                    <span className="group-label">Bars</span>
                    <button className="tool" onClick={addMeasure} type="button">
                      + Bar
                    </button>
                    <button className="tool" onClick={removeMeasure} type="button">
                      - Bar
                    </button>
                  </div>

                <div className="tool-group compact">
                  <span className="group-label">Score</span>
                  <button className="tool tool--ghost" onClick={clearScore} title="Clear all notes" type="button">
                    Clear
                  </button>
                  </div>
                </>
              ) : null}

              {activeTab === 'articulations' ? (
                <div className="tool-group tool-group--wide tool-group--flush">
                  <span className="group-label">Marks</span>
                  {ARTICULATION_OPTIONS.map((option) => (
                    <button
                      aria-label={option.label}
                      key={option.value}
                      className={
                        activeNote?.articulation === option.value
                          ? 'tool tool--symbol tool--symbol-icon active'
                          : 'tool tool--symbol tool--symbol-icon'
                      }
                      onClick={() => toggleArticulation(option.value)}
                      title={option.label}
                      type="button"
                    >
                      <span className="tool-symbol">{option.glyph}</span>
                    </button>
                  ))}
                  <button
                    className="tool tool--ghost"
                    disabled={!activeNote?.articulation}
                    onClick={clearArticulation}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              ) : null}

              {activeTab === 'ornaments' ? (
                <div className="tool-group tool-group--wide tool-group--flush">
                  <span className="group-label">Ornaments</span>
                  {ORNAMENT_OPTIONS.map((option) => (
                    <button
                      aria-label={option.label}
                      key={option.value}
                      className={
                        activeNote?.ornament === option.value
                          ? 'tool tool--symbol tool--symbol-icon active'
                          : 'tool tool--symbol tool--symbol-icon'
                      }
                      onClick={() => toggleOrnament(option.value)}
                      title={option.label}
                      type="button"
                    >
                      <span className="tool-symbol tool-symbol--script">{option.glyph}</span>
                    </button>
                  ))}
                  <button
                    className="tool tool--ghost"
                    disabled={!activeNote?.ornament}
                    onClick={clearOrnament}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              ) : null}

              {activeTab === 'dynamics' ? (
                <div className="tool-group tool-group--wide tool-group--flush">
                  <span className="group-label">Dynamics</span>
                  {DYNAMIC_OPTIONS.map((dynamic) => (
                    <button
                      key={dynamic}
                      aria-label={dynamic.toUpperCase()}
                      className={
                        activeNote?.dynamic === dynamic
                          ? 'tool tool--dynamic active'
                          : 'tool tool--dynamic'
                      }
                      onClick={() => toggleDynamic(dynamic)}
                      title={dynamic.toUpperCase()}
                      type="button"
                    >
                      {getDynamicGlyphText(dynamic)}
                    </button>
                  ))}
                  <button
                    className="tool tool--ghost"
                    disabled={!activeNote?.dynamic}
                    onClick={clearDynamic}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              ) : null}

              {activeTab === 'text' ? (
                <div className="tool-group tool-group--wide tool-group--flush">
                  <span className="group-label">Lyrics</span>
                  <input
                    className="toolbar-input"
                    disabled={!activeNote}
                    onChange={(event) => setLyricsInput(event.target.value)}
                    placeholder={
                      activeNote
                        ? 'Type lyrics for the selected note'
                        : 'Select a note in the score first'
                    }
                    type="text"
                    value={lyricsInput}
                  />
                  <button
                    className="tool"
                    disabled={!activeNote}
                    onClick={() => applyLyrics(lyricsInput)}
                    type="button"
                  >
                    Apply Lyrics
                  </button>
                  <button
                    className="tool tool--ghost"
                    disabled={!activeNote || !activeNote.lyrics}
                    onClick={() => {
                      setLyricsInput('')
                      applyLyrics('')
                    }}
                    type="button"
                  >
                    Clear Lyrics
                  </button>
                  <div className="toolbar-note">
                    Edit the large title block directly above the staff. Changes update live.
                  </div>
                </div>
              ) : null}

              {activeTab === 'export' ? (
                <div className="tool-group compact">
                  <span className="group-label">Import / Export</span>
                  <button
                    className="tool tool--io"
                    disabled={isImportingMusicXml}
                    onClick={handleImportMusicXMLClick}
                    title="Import MusicXML via backend parser"
                    type="button"
                  >
                    {isImportingMusicXml ? '...' : 'Import XML'}
                  </button>
                  <button
                    className="tool tool--io"
                    disabled={isImportingMusicXml}
                    onClick={handleExportMusicXML}
                    title="Export score as MusicXML"
                    type="button"
                  >
                    XML
                  </button>
                  <button
                    className="tool tool--io"
                    disabled={isExporting || isImportingMusicXml}
                    onClick={handleExportPDF}
                    title="Export score as PDF"
                    type="button"
                  >
                    {isExporting ? '…' : '↓ PDF'}
                  </button>
                </div>
              ) : null}
              </div>
            </div>
          )}

        </div>
      </div>
      <main className="workspace">
        <aside className="sidebar">
          <section className="panel panel--guide">
            <span className="panel-eyebrow">{helpCard ? 'Selection Help' : 'Current Tab'}</span>
            <h2>{visibleHelpCard.title}</h2>
            <p className="status-copy">{visibleHelpCard.description}</p>
            <ul className="panel-list">
              {activeTabTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>

          <section className="panel panel--status">
            <h2>Status</h2>
            <p className="status-copy">{status}</p>
          </section>

          <section className="panel panel--selection">
            <h2>Selection</h2>
            <div className="summary-row">
              <span>Active measure</span>
              <strong>{boundedActiveMeasureIndex + 1}</strong>
            </div>
            <div className="summary-row">
              <span>Active tab</span>
              <strong>{activeTabMeta.label}</strong>
            </div>
            <div className="summary-row">
              <span>Selected note</span>
              <strong>{activeNoteLabel}</strong>
            </div>
            <div className="summary-row">
              <span>Selected staff</span>
              <strong>
                {activeSelection
                  ? `${activeSelection.staffId} / Measure ${activeSelection.measureIndex + 1}`
                  : 'None'}
              </strong>
            </div>
            <div className="summary-row">
              <span>Mode</span>
              <strong>{getModeLabel(mode)}</strong>
            </div>
            <div className="summary-row">
              <span>Note Value</span>
              <strong>{selectedDurationName}</strong>
            </div>
            <div className="summary-row">
              <span>Accidental</span>
              <strong>{accidental ? ACCIDENTAL_LABELS[accidental] : 'None'}</strong>
            </div>
            <div className="summary-row">
              <span>Articulation</span>
              <strong>
                {activeNote?.articulation ? ARTICULATION_LABELS[activeNote.articulation] : 'None'}
              </strong>
            </div>
            <div className="summary-row">
              <span>Ornament</span>
              <strong>
                {activeNote?.ornament ? ORNAMENT_LABELS[activeNote.ornament] : 'None'}
              </strong>
            </div>
            <div className="summary-row">
              <span>Dynamic</span>
              <strong>{activeNote?.dynamic ? activeNote.dynamic.toUpperCase() : 'None'}</strong>
            </div>
            <div className="summary-row">
              <span>Lyrics</span>
              <strong>{activeNote?.lyrics ? 'Attached' : 'None'}</strong>
            </div>
          </section>

          <section className="panel panel--score">
            <h2>Score</h2>
            <div className="summary-row">
              <span>Time Signature</span>
              <strong>{timeSignature}</strong>
            </div>
            <div className="summary-row">
              <span>Key Signature</span>
              <strong>{activeKeySignatureLabel}</strong>
            </div>
            <div className="summary-row">
              <span>Default Tempo</span>
              <strong>{tempoBpm} BPM</strong>
            </div>
            <div className="summary-row">
              <span>Measure Tempo</span>
              <strong>{activeMeasureTempo} BPM</strong>
            </div>
            <div className="summary-row">
              <span>Metronome</span>
              <strong>{isMetronomeEnabled ? 'On' : 'Off'}</strong>
            </div>
            <div className="summary-row">
              <span>Systems</span>
              <strong>{systems.length}</strong>
            </div>
            <div className="summary-row">
              <span>Measures</span>
              <strong>{measures.length}</strong>
            </div>
          </section>

          <section className="panel">
            <h2>What Changed</h2>
            <ul>
              <li>Hover any rest slot to target it, click once to arm insertion, then click again to place the note.</li>
              <li>Treble and bass staves are fully independent — editing one never distorts the other.</li>
              <li>Semi-quaver (16th-note) rests are now evenly spaced within the beat and no longer overlap neighbouring crotchet (quarter-note) rests.</li>
            </ul>
          </section>

          <section className="panel">
            <h2>Interaction Notes</h2>
            <ul>
              <li>Choose a note value, then toggle Dot if you want the dotted version.</li>
              <li>Treble and bass keep separate editable data on the grand staff.</li>
              <li>Erase removes an entire note, chord, or rest at the hovered position.</li>
            </ul>
          </section>
        </aside>

        <section className="score-stage" ref={scoreContainerRef}>
          <div className="score-paper score-paper--empty">
            <div className="score-header-card">
              <input
                aria-label="Score title"
                className={`score-title-input${scoreTitle ? '' : ' is-empty'}`}
                onChange={(event) => setScoreTitle(event.target.value)}
                placeholder="No title provided"
                type="text"
                value={scoreTitle}
              />
              <input
                aria-label="Score subtitle"
                className="score-subtitle-input"
                onChange={(event) => setScoreSubtitle(event.target.value)}
                placeholder="Optional subtitle"
                type="text"
                value={scoreSubtitle}
              />
              <div className="score-credit-fields">
                <label className="meta-field">
                  <span>Composer</span>
                  <input
                    className="meta-input"
                    onChange={(event) => setScoreComposer(event.target.value)}
                    placeholder="Composer"
                    type="text"
                    value={scoreComposer}
                  />
                </label>
                <label className="meta-field">
                  <span>Lyricist</span>
                  <input
                    className="meta-input"
                    onChange={(event) => setScoreLyricist(event.target.value)}
                    placeholder="Lyricist"
                    type="text"
                    value={scoreLyricist}
                  />
                </label>
                <label className="meta-field">
                  <span>Arranger</span>
                  <input
                    className="meta-input"
                    onChange={(event) => setScoreArranger(event.target.value)}
                    placeholder="Arranger"
                    type="text"
                    value={scoreArranger}
                  />
                </label>
              </div>

            </div>

            <div className="score-viewport">
              <div
                className="score-surface"
                style={{ height: `${scoreHeight}px`, width: `${scoreWidth}px` }}
              >
                <div className="score-canvas" ref={scoreRef} />
                {playhead ? (
                  <div
                    aria-hidden="true"
                    className="playhead-line"
                    style={{
                      height: `${playhead.height}px`,
                      left: `${playhead.x}px`,
                      top: `${playhead.top}px`,
                    }}
                  />
                ) : null}
                {mode === 'note' && (pendingInsertPreview || chordHoverPreview) ? (
                  <PendingInsertIndicator
                    baseDuration={baseDuration}
                    dotted={dotted}
                    hitBoxes={hitBoxesRef.current}
                    noteRegistry={noteRegistryRef.current}
                    position={(pendingInsertPreview || chordHoverPreview)!}
                  />
                ) : null}
                {mode === 'note' && pendingInsertPreview ? (
                  <HoverRestIndicator
                    hitBoxes={hitBoxesRef.current}
                    position={pendingInsertPreview}
                  />
                ) : null}
                {mode === 'note' && hoveredRestPosition && !pendingInsertPreview ? (
                  <HoverRestIndicator
                    hitBoxes={hitBoxesRef.current}
                    position={hoveredRestPosition}
                  />
                ) : null}
                <div
                  aria-label="notation-hit-layer"
                  className="score-hit-layer"
                  onClick={handleScoreClick}
                  onMouseLeave={handleScoreLeave}
                  onMouseMove={handleScoreMouseMove}
                  role="presentation"
                  style={{ height: `${scoreHeight}px`, width: `${scoreWidth}px` }}
                />
                {!isPdfRenderMode && scoreEndControlsLayout ? (
                  <div
                    className="score-end-controls"
                    style={{
                      height: `${scoreEndControlsLayout.bottom - scoreEndControlsLayout.top}px`,
                      left: `${scoreEndControlsLayout.centerX}px`,
                      top: `${scoreEndControlsLayout.top}px`,
                    }}
                  >
                    <button
                      aria-label="Add one bar after the final bar"
                      className="score-end-control"
                      onClick={addMeasure}
                      title="Add one bar"
                      type="button"
                    >
                      +
                    </button>
                    <button
                      aria-label="Remove the final bar"
                      className="score-end-control"
                      disabled={measures.length === 1}
                      onClick={removeMeasure}
                      title={measures.length === 1 ? 'At least one bar must remain' : 'Remove one bar'}
                      type="button"
                    >
                      -
                    </button>
                  </div>
                ) : null}
                {scoreFrontHotspots.map((hotspot) => (
                  <button
                    key={`${hotspot.kind}-${hotspot.measureIndex}`}
                    aria-label={
                      hotspot.kind === 'timeSignature'
                        ? `Open time signature picker. Current: ${timeSignature}.`
                        : `Open key signature picker. Current: ${getKeySignatureNames(keySignature)}.`
                    }
                    className={
                      scoreFrontPopover?.kind === hotspot.kind &&
                        scoreFrontPopover.measureIndex === hotspot.measureIndex
                        ? 'score-front-hotspot is-active'
                        : 'score-front-hotspot'
                    }
                    onClick={(event) => {
                      event.stopPropagation()
                      openScoreFrontPopover(hotspot)
                    }}
                    title={
                      hotspot.kind === 'timeSignature'
                        ? `Time Signature: ${timeSignature}`
                        : `Key Signature: ${getKeySignatureDisplayLabel(keySignature)}`
                    }
                    style={{
                      height: `${hotspot.height}px`,
                      left: `${hotspot.left}px`,
                      top: `${hotspot.top}px`,
                      width: `${hotspot.width}px`,
                    }}
                    type="button"
                  />
                ))}
                {scoreFrontPopover ? (
                  <div
                    className={
                      scoreFrontPopover.kind === 'timeSignature'
                        ? 'score-front-popover score-front-popover--time'
                        : 'score-front-popover score-front-popover--key'
                    }
                    style={(() => {
                      const popoverWidth = getScoreFrontPopoverWidth(scoreFrontPopover.kind)
                      const left = Math.min(
                        Math.max(scoreFrontPopover.anchorCenter - popoverWidth / 2, 18),
                        Math.max(scoreWidth - popoverWidth - 18, 18),
                      )

                      return {
                        left: `${left}px`,
                        top: `${scoreFrontPopover.top}px`,
                      }
                    })()}
                  >
                    <div className="score-front-popover__header">
                    <strong>{scoreFrontPopover.kind === 'timeSignature' ? 'Time Signature' : 'Key Signature'}</strong>
                    <button
                      className="score-front-popover__close"
                      onClick={() => setScoreFrontPopover(null)}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                  <div className="score-front-popover__meta">
                    {scoreFrontPopover.kind === 'timeSignature'
                      ? `Current: ${timeSignature}`
                      : `Current: ${getKeySignatureDisplayLabel(keySignature)}`}
                  </div>

                  {scoreFrontPopover.kind === 'timeSignature' ? (
                    <>
                      <div className="score-front-popover__row score-front-popover__row--time">
                        {TIME_SIGNATURE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            className={
                              timeSignature === option.value
                                ? 'score-front-option active'
                                : 'score-front-option'
                            }
                            onClick={() => changeTimeSignature(option.value)}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <div className="score-front-popover__custom-meter">
                        <label className="toolbar-inline-field">
                          <span>Numerator</span>
                          <input
                            inputMode="numeric"
                            onChange={(event) => setTimeSignatureNumeratorInput(event.target.value)}
                            type="text"
                            value={timeSignatureNumeratorInput}
                          />
                        </label>
                        <label className="toolbar-inline-field">
                          <span>Denominator</span>
                          <select
                            className="toolbar-select"
                            onChange={(event) =>
                              setTimeSignatureDenominatorInput(event.target.value as '2' | '4' | '8' | '16')
                            }
                            value={timeSignatureDenominatorInput}
                          >
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="16">16</option>
                          </select>
                        </label>
                        <label className="toolbar-inline-field toolbar-inline-field--grouping">
                          <span>Grouping</span>
                          <input
                            onChange={(event) => setTimeSignatureGroupingInput(event.target.value)}
                            placeholder={timeSignatureDenominatorInput === '8' ? '2+2+3' : '1+1+1'}
                            type="text"
                            value={timeSignatureGroupingInput}
                          />
                        </label>
                        <button className="tool" onClick={applyCustomTimeSignature} type="button">
                          Apply Meter
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="score-front-popover__key-mode">
                        <label className="score-front-popover__checkbox">
                          <input
                            checked={transposeOnKeyChange}
                            onChange={(event) => setTransposeOnKeyChange(event.target.checked)}
                            type="checkbox"
                          />
                          <span>Transpose existing notes when changing key</span>
                        </label>
                        <div className="score-front-popover__hint">
                          {getKeySignatureChangeModeDescription(transposeOnKeyChange)}
                        </div>
                      </div>
                      <div className="score-front-popover__row score-front-popover__row--key">
                        {KEY_SIGNATURE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            className={
                              keySignature === option.value
                                ? 'score-front-option active'
                                : 'score-front-option'
                            }
                            onClick={() => applyKeySignatureChange(option.value)}
                            aria-label={getKeySignaturePickerTitle(option.value)}
                            title={`${getKeySignaturePickerTitle(option.value)}. ${transposeOnKeyChange ? 'This will transpose existing notes.' : 'This will respell existing notes without transposing.'}`}
                            type="button"
                          >
                            {option.glyph}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
