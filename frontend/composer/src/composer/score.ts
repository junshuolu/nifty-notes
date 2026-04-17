import { Stem } from 'vexflow'
import {
  BASS_TOP_LINE_INDEX,
  BASS_PITCHES_FROM_TOP,
  BASE_DURATION_SUBDIVISIONS,
  DURATION_OPTIONS,
  STAFF_IDS,
  SUBDIVISIONS_PER_BEAT,
  SYSTEM_FIRST_MEASURE_WIDTH,
  SYSTEM_MEASURE_WIDTH,
  SYSTEM_SIDE_PADDING,
  SYSTEM_WRAP_WIDTH,
  TREBLE_TOP_LINE_INDEX,
  TREBLE_PITCHES_FROM_TOP,
  type AccidentalType,
  type BaseDuration,
  type ContiguousTarget,
  type KeySignatureSpec,
  type MeasureData,
  type NotePitch,
  type NoteItem,
  type RenderDuration,
  type ScoreItem,
  type StaffId,
  type TimeSignature,
} from './constants'

export interface MeasureTempoTiming {
  bpm: number
  durationSeconds: number
  measureIndex: number
  startSeconds: number
  subdivisionSeconds: number
}

export interface ParsedTimeSignature {
  denominator: 2 | 4 | 8 | 16
  display: TimeSignature
  groupSubdivisionLengths: number[]
  grouping: number[]
  numerator: number
  subdivisionsPerMeasure: number
}

const WHOLE_NOTE_SUBDIVISIONS = BASE_DURATION_SUBDIVISIONS.w
const SUPPORTED_TIME_SIGNATURE_DENOMINATORS = new Set([2, 4, 8, 16])
const LETTER_SEQUENCE = ['c', 'd', 'e', 'f', 'g', 'a', 'b'] as const
const LETTER_TO_SEMITONE: Record<(typeof LETTER_SEQUENCE)[number], number> = {
  a: 9,
  b: 11,
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
}
const SHARP_ORDER = ['f', 'c', 'g', 'd', 'a', 'e', 'b'] as const
const FLAT_ORDER = ['b', 'e', 'a', 'd', 'g', 'c', 'f'] as const
const KEY_SIGNATURE_TO_FIFTHS: Record<KeySignatureSpec, number> = {
  A: 3,
  Ab: -4,
  B: 5,
  Bb: -2,
  C: 0,
  'C#': 7,
  Cb: -7,
  D: 2,
  Db: -5,
  E: 4,
  Eb: -3,
  F: -1,
  'F#': 6,
  G: 1,
  Gb: -6,
}
const KEY_SIGNATURE_MAJOR_ROOT: Record<KeySignatureSpec, { alter: -1 | 0 | 1; letter: (typeof LETTER_SEQUENCE)[number] }> = {
  A: { alter: 0, letter: 'a' },
  Ab: { alter: -1, letter: 'a' },
  B: { alter: 0, letter: 'b' },
  Bb: { alter: -1, letter: 'b' },
  C: { alter: 0, letter: 'c' },
  'C#': { alter: 1, letter: 'c' },
  Cb: { alter: -1, letter: 'c' },
  D: { alter: 0, letter: 'd' },
  Db: { alter: -1, letter: 'd' },
  E: { alter: 0, letter: 'e' },
  Eb: { alter: -1, letter: 'e' },
  F: { alter: 0, letter: 'f' },
  'F#': { alter: 1, letter: 'f' },
  G: { alter: 0, letter: 'g' },
  Gb: { alter: -1, letter: 'g' },
}
const MIDI_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

type LetterName = (typeof LETTER_SEQUENCE)[number]
type RenderAccidental = AccidentalType | '##' | 'bb'
type PitchRepresentation = {
  accidental?: AccidentalType
  pitch: NotePitch
}
type KeySignatureInterval = {
  letterShift: number
  semitoneShift: number
}

function getDefaultGrouping(
  numerator: number,
  denominator: number,
) {
  if (denominator === 8 && numerator > 3) {
    if (numerator % 3 === 0) {
      return Array.from({ length: numerator / 3 }, () => 3)
    }

    if (numerator === 5) {
      return [2, 3]
    }

    if (numerator === 7) {
      return [2, 2, 3]
    }

    const groups: number[] = []
    let remaining = numerator

    while (remaining > 0) {
      if (remaining === 3) {
        groups.push(3)
        break
      }

      if (remaining === 4) {
        groups.push(2, 2)
        break
      }

      groups.push(2)
      remaining -= 2
    }

    return groups
  }

  return Array.from({ length: numerator }, () => 1)
}

function normalizeGrouping(
  numerator: number,
  denominator: number,
  groupingOverride?: number[] | null,
) {
  if (
    groupingOverride &&
    groupingOverride.length > 0 &&
    groupingOverride.every((value) => Number.isInteger(value) && value > 0) &&
    groupingOverride.reduce((sum, value) => sum + value, 0) === numerator
  ) {
    return groupingOverride
  }

  return getDefaultGrouping(numerator, denominator)
}

export function parseTimeSignature(
  timeSignature: TimeSignature,
  groupingOverride?: number[] | null,
): ParsedTimeSignature {
  const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(timeSignature)
  const numerator = Math.max(1, Number(match?.[1] ?? 4))
  const parsedDenominator = Number(match?.[2] ?? 4)
  const denominator = (
    SUPPORTED_TIME_SIGNATURE_DENOMINATORS.has(parsedDenominator)
      ? parsedDenominator
      : 4
  ) as 2 | 4 | 8 | 16
  const grouping = normalizeGrouping(numerator, denominator, groupingOverride)
  const subdivisionUnit = WHOLE_NOTE_SUBDIVISIONS / denominator
  const groupSubdivisionLengths = grouping.map((value) => value * subdivisionUnit)
  const display = `${numerator}/${denominator}`

  return {
    denominator,
    display,
    groupSubdivisionLengths,
    grouping,
    numerator,
    subdivisionsPerMeasure: groupSubdivisionLengths.reduce((sum, value) => sum + value, 0),
  }
}

export function getSubdivisionGroupInfo(
  subdivision: number,
  groupSubdivisionLengths: number[],
) {
  let start = 0

  for (let index = 0; index < groupSubdivisionLengths.length; index += 1) {
    const length = groupSubdivisionLengths[index] ?? 0
    const end = start + length

    if (subdivision < end) {
      return {
        index,
        length,
        start,
      }
    }

    start = end
  }

  const lastLength = groupSubdivisionLengths[groupSubdivisionLengths.length - 1] ?? 0
  return {
    index: Math.max(groupSubdivisionLengths.length - 1, 0),
    length: lastLength,
    start: Math.max(start - lastLength, 0),
  }
}

export function getItemsForStaff(
  measure: MeasureData,
  staffId: StaffId,
): ScoreItem[] {
  return staffId === 'treble' ? measure.trebleItems : measure.bassItems
}

export function getBeatsPerMeasure(timeSignature: TimeSignature): number {
  return parseTimeSignature(timeSignature).numerator
}

export function getMeasureSubdivisions(timeSignature: TimeSignature): number {
  return parseTimeSignature(timeSignature).subdivisionsPerMeasure
}

export function canUseDot(baseDuration: BaseDuration): boolean {
  return baseDuration !== '32'
}

export function getDurationSubdivisions(
  baseDuration: RenderDuration,
  dotted: boolean,
): number {
  const base = BASE_DURATION_SUBDIVISIONS[baseDuration]

  if (!dotted || baseDuration === '32') {
    return base
  }

  return base + Math.floor(base / 2)
}

export function getItemSubdivisions(item: ScoreItem): number {
  return getDurationSubdivisions(item.baseDuration, item.dots === 1)
}

export function getDurationName(baseDuration: BaseDuration, dotted: boolean): string {
  const exactLabel = DURATION_OPTIONS.find(
    (option) => option.baseDuration === baseDuration && option.dots === (dotted ? 1 : 0),
  )?.label

  if (exactLabel) {
    return exactLabel
  }

  return (
    DURATION_OPTIONS.find(
      (option) => option.baseDuration === baseDuration && option.dots === 0,
    )?.label ?? 'Crotchet (Quarter Note)'
  )
}

export function getDurationPreviewClass(baseDuration: BaseDuration, dotted = false): string {
  return (
    DURATION_OPTIONS.find(
      (option) => option.baseDuration === baseDuration && option.dots === (dotted ? 1 : 0),
    )?.previewClass ??
    DURATION_OPTIONS.find(
      (option) => option.baseDuration === baseDuration && option.dots === 0,
    )?.previewClass ??
    'quarter'
  )
}

/**
 * 音名字符串规则（与谱面编辑、播放等一致）：
 * `b/4` = B 本位，`bb/4` = 降 B，`bbb/4` = B 重降，`c##/4` = C 重升，`cbb/4` = C 重降。
 * 后缀匹配顺序必须为长串在前（## 在 # 前，bbb → bb → b），否则 `bb`、`bbb` 会解析错。
 */
export function parsePitchToken(pitch: NotePitch) {
  const [noteToken = 'c', octave = '4'] = pitch.split('/')
  const token = noteToken.trim().toLowerCase()
  const m = /^([a-g])(##|#|bbb|bb|b|n)?$/i.exec(token)
  const letter = (m?.[1] ?? token[0] ?? 'c').toLowerCase()
  const suf = m?.[2] ?? ''

  let xmlAlter = 0
  if (suf === '##') xmlAlter = 2
  else if (suf === '#') xmlAlter = 1
  else if (suf === 'bbb' || suf === 'bb') xmlAlter = -2
  else if (suf === 'b') xmlAlter = -1
  else if (suf === 'n') xmlAlter = 0

  let embeddedAccidental: '' | '#' | 'b' = ''
  if (suf === '##' || suf === '#') embeddedAccidental = '#'
  else if (suf === 'bbb' || suf === 'bb' || suf === 'b') embeddedAccidental = 'b'

  return {
    embeddedAccidental,
    letter,
    naturalPitch: `${letter}/${octave}` as NotePitch,
    octave,
    xmlAlter,
  }
}

function getAccidentalAlter(accidental?: RenderAccidental | null): -2 | -1 | 0 | 1 | 2 | null {
  if (accidental === '##') return 2
  if (accidental === '#') return 1
  if (accidental === 'bb') return -2
  if (accidental === 'b') return -1
  if (accidental === 'n') return 0
  return null
}

function getAccidentalTokenFromAlter(alter: number): RenderAccidental | 'n' | null {
  if (alter === 2) return '##'
  if (alter === 1) return '#'
  if (alter === 0) return 'n'
  if (alter === -1) return 'b'
  if (alter === -2) return 'bb'
  return null
}

function getLetterIndex(letter: string): number {
  return LETTER_SEQUENCE.indexOf(letter as LetterName)
}

function getLetterPitchClass(letter: LetterName) {
  return LETTER_TO_SEMITONE[letter]
}

function getNaturalMidi(letter: LetterName, octave: number) {
  return (octave + 1) * 12 + getLetterPitchClass(letter)
}

function getStepNumber(letter: LetterName, octave: number) {
  return octave * LETTER_SEQUENCE.length + getLetterIndex(letter)
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

function getStepFromNumber(stepNumber: number): { letter: LetterName; octave: number } {
  const letterIndex = mod(stepNumber, LETTER_SEQUENCE.length)
  const octave = Math.floor((stepNumber - letterIndex) / LETTER_SEQUENCE.length)
  return {
    letter: LETTER_SEQUENCE[letterIndex] ?? 'c',
    octave,
  }
}

export function getKeySignatureAlterForLetter(
  keySignature: KeySignatureSpec,
  letter: string,
): -1 | 0 | 1 {
  const fifths = KEY_SIGNATURE_TO_FIFTHS[keySignature]

  if (fifths > 0 && SHARP_ORDER.slice(0, fifths).includes(letter as LetterName)) {
    return 1
  }

  if (fifths < 0 && FLAT_ORDER.slice(0, Math.abs(fifths)).includes(letter as LetterName)) {
    return -1
  }

  return 0
}

export function getEffectiveAlterForPitch(
  pitch: NotePitch,
  accidental: RenderAccidental | null | undefined,
  keySignature: KeySignatureSpec = 'C',
): number {
  const explicitAlter = getAccidentalAlter(accidental)
  if (explicitAlter !== null) {
    return explicitAlter
  }

  const parsed = parsePitchToken(pitch)
  if (parsed.xmlAlter !== 0) {
    return parsed.xmlAlter
  }

  return getKeySignatureAlterForLetter(keySignature, parsed.letter)
}

export function getDisplayAccidentalForPitch(
  pitch: NotePitch,
  accidental: RenderAccidental | null | undefined,
  keySignature: KeySignatureSpec = 'C',
): RenderAccidental | 'n' | null {
  if (accidental) {
    return accidental
  }

  const parsed = parsePitchToken(pitch)
  const keyAlter = getKeySignatureAlterForLetter(keySignature, parsed.letter)
  const effectiveAlter = getEffectiveAlterForPitch(pitch, accidental, keySignature)

  if (effectiveAlter === keyAlter) {
    return null
  }

  return getAccidentalTokenFromAlter(effectiveAlter)
}

export function getNaturalizedPitch(pitch: NotePitch): NotePitch {
  return parsePitchToken(pitch).naturalPitch
}

export function getMidiForPitch(
  pitch: NotePitch,
  accidental?: RenderAccidental | null,
  keySignature: KeySignatureSpec = 'C',
): number {
  const { letter, octave } = parsePitchToken(pitch)
  return (
    getNaturalMidi(letter as LetterName, Number(octave)) +
    getEffectiveAlterForPitch(pitch, accidental, keySignature)
  )
}

function getPitchRepresentationForKey(
  letter: LetterName,
  octave: number,
  effectiveAlter: number,
  keySignature: KeySignatureSpec,
): PitchRepresentation {
  const naturalPitch = `${letter}/${octave}` as NotePitch
  const keyAlter = getKeySignatureAlterForLetter(keySignature, letter)

  if (effectiveAlter === keyAlter) {
    return { pitch: naturalPitch }
  }

  if (effectiveAlter === 0) {
    return keyAlter === 0
      ? { pitch: naturalPitch }
      : { accidental: 'n', pitch: naturalPitch }
  }

  if (effectiveAlter === 1) {
    return keyAlter === 1
      ? { pitch: naturalPitch }
      : { accidental: '#', pitch: naturalPitch }
  }

  if (effectiveAlter === -1) {
    return keyAlter === -1
      ? { pitch: naturalPitch }
      : { accidental: 'b', pitch: naturalPitch }
  }

  const suffix = effectiveAlter === 2 ? '##' : effectiveAlter === -2 ? 'bb' : ''
  return { pitch: `${letter}${suffix}/${octave}` as NotePitch }
}

export function rewritePitchForKeySignature(
  pitch: NotePitch,
  accidental: AccidentalType | null | undefined,
  sourceKeySignature: KeySignatureSpec,
  targetKeySignature: KeySignatureSpec,
): PitchRepresentation {
  const { letter, octave } = parsePitchToken(pitch)
  const effectiveAlter = getEffectiveAlterForPitch(pitch, accidental, sourceKeySignature)
  return getPitchRepresentationForKey(
    letter as LetterName,
    Number(octave),
    effectiveAlter,
    targetKeySignature,
  )
}

function getKeySignatureInterval(
  sourceKeySignature: KeySignatureSpec,
  targetKeySignature: KeySignatureSpec,
): KeySignatureInterval {
  const sourceRoot = KEY_SIGNATURE_MAJOR_ROOT[sourceKeySignature]
  const targetRoot = KEY_SIGNATURE_MAJOR_ROOT[targetKeySignature]
  const sourcePitchClass = mod(
    getLetterPitchClass(sourceRoot.letter) + sourceRoot.alter,
    MIDI_NOTE_NAMES.length,
  )
  const targetPitchClass = mod(
    getLetterPitchClass(targetRoot.letter) + targetRoot.alter,
    MIDI_NOTE_NAMES.length,
  )

  if (sourcePitchClass === targetPitchClass) {
    return { letterShift: 0, semitoneShift: 0 }
  }

  const upSemitoneShift = mod(targetPitchClass - sourcePitchClass, MIDI_NOTE_NAMES.length)
  const downSemitoneShift = upSemitoneShift - MIDI_NOTE_NAMES.length
  const upLetterShift = mod(
    getLetterIndex(targetRoot.letter) - getLetterIndex(sourceRoot.letter),
    LETTER_SEQUENCE.length,
  )
  const downLetterShift = upLetterShift - LETTER_SEQUENCE.length

  if (Math.abs(downSemitoneShift) < Math.abs(upSemitoneShift)) {
    return { letterShift: downLetterShift, semitoneShift: downSemitoneShift }
  }

  return { letterShift: upLetterShift, semitoneShift: upSemitoneShift }
}

export function transposePitchForKeySignature(
  pitch: NotePitch,
  accidental: AccidentalType | null | undefined,
  sourceKeySignature: KeySignatureSpec,
  targetKeySignature: KeySignatureSpec,
): PitchRepresentation {
  const interval = getKeySignatureInterval(sourceKeySignature, targetKeySignature)
  const { letter, octave } = parsePitchToken(pitch)
  const sourceMidi = getMidiForPitch(pitch, accidental, sourceKeySignature)
  const nextStep = getStepNumber(letter as LetterName, Number(octave)) + interval.letterShift
  const transposedStep = getStepFromNumber(nextStep)
  const targetMidi = sourceMidi + interval.semitoneShift
  const naturalTargetMidi = getNaturalMidi(transposedStep.letter, transposedStep.octave)
  const effectiveAlter = targetMidi - naturalTargetMidi

  return getPitchRepresentationForKey(
    transposedStep.letter,
    transposedStep.octave,
    effectiveAlter,
    targetKeySignature,
  )
}

function mapNoteToKeySignature(
  note: NoteItem,
  transform: (pitch: NotePitch, accidental: AccidentalType | null | undefined) => PitchRepresentation,
): NoteItem {
  const nextPitches: NotePitch[] = []
  const nextAccidentals: Record<string, AccidentalType> = {}

  note.pitches.forEach((pitch) => {
    const next = transform(pitch, note.accidentals?.[pitch])
    nextPitches.push(next.pitch)
    if (next.accidental) {
      nextAccidentals[next.pitch] = next.accidental
    }
  })

  return {
    ...note,
    accidentals: Object.keys(nextAccidentals).length > 0 ? nextAccidentals : undefined,
    pitches: [...new Set(nextPitches)],
  }
}

export function rewriteMeasuresForKeySignature(
  measures: MeasureData[],
  sourceKeySignature: KeySignatureSpec,
  targetKeySignature: KeySignatureSpec,
): MeasureData[] {
  return cloneMeasures(measures).map((measure) => ({
    ...measure,
    bassItems: measure.bassItems.map((item) =>
      item.kind === 'note'
        ? mapNoteToKeySignature(item, (pitch, accidental) =>
            rewritePitchForKeySignature(
              pitch,
              accidental,
              sourceKeySignature,
              targetKeySignature,
            ),
          )
        : item,
    ),
    trebleItems: measure.trebleItems.map((item) =>
      item.kind === 'note'
        ? mapNoteToKeySignature(item, (pitch, accidental) =>
            rewritePitchForKeySignature(
              pitch,
              accidental,
              sourceKeySignature,
              targetKeySignature,
            ),
          )
        : item,
    ),
  }))
}

export function transposeMeasuresForKeySignature(
  measures: MeasureData[],
  sourceKeySignature: KeySignatureSpec,
  targetKeySignature: KeySignatureSpec,
): MeasureData[] {
  return cloneMeasures(measures).map((measure) => ({
    ...measure,
    bassItems: measure.bassItems.map((item) =>
      item.kind === 'note'
        ? mapNoteToKeySignature(item, (pitch, accidental) =>
            transposePitchForKeySignature(
              pitch,
              accidental,
              sourceKeySignature,
              targetKeySignature,
            ),
          )
        : item,
    ),
    trebleItems: measure.trebleItems.map((item) =>
      item.kind === 'note'
        ? mapNoteToKeySignature(item, (pitch, accidental) =>
            transposePitchForKeySignature(
              pitch,
              accidental,
              sourceKeySignature,
              targetKeySignature,
            ),
          )
        : item,
    ),
  }))
}

export function toTonePitch(
  pitch: NotePitch,
  accidental?: RenderAccidental | null,
  keySignature: KeySignatureSpec = 'C',
): string {
  const midi = getMidiForPitch(pitch, accidental, keySignature)
  const pitchClass = mod(midi, MIDI_NOTE_NAMES.length)
  const octave = Math.floor(midi / MIDI_NOTE_NAMES.length) - 1
  return `${MIDI_NOTE_NAMES[pitchClass] ?? 'C'}${octave}`
}

export function cloneMeasures(measures: MeasureData[]): MeasureData[] {
  return measures.map((measure) => ({
    bassItems: measure.bassItems.map((item) =>
      item.kind === 'note'
        ? { ...item, pitches: [...item.pitches], accidentals: item.accidentals ? { ...item.accidentals } : undefined }
        : { ...item },
    ),
    id: measure.id,
    tempoBpm: measure.tempoBpm,
    trebleItems: measure.trebleItems.map((item) =>
      item.kind === 'note'
        ? { ...item, pitches: [...item.pitches], accidentals: item.accidentals ? { ...item.accidentals } : undefined }
        : { ...item },
    ),
  }))
}

export function getEffectiveMeasureTempo(
  measures: MeasureData[],
  measureIndex: number,
  defaultBpm: number,
): number {
  let effectiveBpm = defaultBpm

  for (let index = 0; index <= measureIndex && index < measures.length; index += 1) {
    effectiveBpm = measures[index]?.tempoBpm ?? effectiveBpm
  }

  return effectiveBpm
}

export function getMeasureTempoTimeline(
  measures: MeasureData[],
  timeSignature: TimeSignature,
  defaultBpm: number,
): MeasureTempoTiming[] {
  const subdivisionsPerMeasure = getMeasureSubdivisions(timeSignature)
  let startSeconds = 0

  return measures.map((_, measureIndex) => {
    const bpm = getEffectiveMeasureTempo(measures, measureIndex, defaultBpm)
    const subdivisionSeconds = getSubdivisionSeconds(bpm)
    const durationSeconds = subdivisionsPerMeasure * subdivisionSeconds
    const timing = {
      bpm,
      durationSeconds,
      measureIndex,
      startSeconds,
      subdivisionSeconds,
    }

    startSeconds += durationSeconds
    return timing
  })
}

export function itemEnd(item: ScoreItem): number {
  return item.start + getItemSubdivisions(item)
}

export function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
): boolean {
  return firstStart < secondEnd && secondStart < firstEnd
}

export function findCoveringItem(
  items: ScoreItem[],
  subdivision: number,
): ScoreItem | undefined {
  return items.find((item) => item.start <= subdivision && subdivision < itemEnd(item))
}

export function findStartingItem(
  items: ScoreItem[],
  subdivision: number,
): ScoreItem | undefined {
  return items.find((item) => item.start === subdivision)
}

export function findNextStartingItem(
  items: ScoreItem[],
  subdivision: number,
): ScoreItem | undefined {
  return items.find((item) => item.start > subdivision)
}

export function findNextContiguousItem(
  measures: MeasureData[],
  measureIndex: number,
  staffId: StaffId,
  item: ScoreItem,
  subdivisionsPerMeasure: number,
): ContiguousTarget | null {
  const nextStart = itemEnd(item)
  const items = getItemsForStaff(measures[measureIndex], staffId)

  if (nextStart < subdivisionsPerMeasure) {
    const nextItem = findStartingItem(items, nextStart)
    return nextItem ? { item: nextItem, measureIndex } : null
  }

  const nextMeasure = measures[measureIndex + 1]
  if (!nextMeasure) {
    return null
  }

  const nextItems = getItemsForStaff(nextMeasure, staffId)
  const nextItem = findStartingItem(nextItems, 0)
  return nextItem ? { item: nextItem, measureIndex: measureIndex + 1 } : null
}

export function sortPitches(
  pitches: NotePitch[],
  staffId: StaffId,
): NotePitch[] {
  const pool = getPitchPool(staffId)
  const getPitchIndex = (pitch: NotePitch) => {
    const index = pool.indexOf(parsePitchToken(pitch).naturalPitch)
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER
  }

  return [...new Set(pitches)].sort(
    (left, right) => getPitchIndex(left) - getPitchIndex(right),
  )
}

export function haveSamePitches(
  left: NotePitch[],
  right: NotePitch[],
): boolean {
  return (
    left.length === right.length &&
    left.every((pitch, index) => pitch === right[index])
  )
}

export function haveSameNotePitches(
  left: NoteItem,
  right: NoteItem,
  keySignature: KeySignatureSpec = 'C',
): boolean {
  if (left.pitches.length !== right.pitches.length) {
    return false
  }

  const leftMidi = left.pitches
    .map((pitch) => getMidiForPitch(pitch, left.accidentals?.[pitch], keySignature))
    .sort((a, b) => a - b)
  const rightMidi = right.pitches
    .map((pitch) => getMidiForPitch(pitch, right.accidentals?.[pitch], keySignature))
    .sort((a, b) => a - b)

  return leftMidi.every((value, index) => value === rightMidi[index])
}

export function normalizeMeasures(
  measures: MeasureData[],
  subdivisionsPerMeasure: number,
  keySignature: KeySignatureSpec = 'C',
): MeasureData[] {
  const cloned = cloneMeasures(measures)

  cloned.forEach((measure, measureIndex) => {
    STAFF_IDS.forEach((staffId) => {
      const items = getItemsForStaff(measure, staffId)
      items.sort((left, right) => left.start - right.start)

      items.forEach((item) => {
        if (item.kind === 'note') {
          item.pitches = sortPitches(item.pitches, staffId)
        }

        if (!item.tieToNext) {
          return
        }

        const next = findNextContiguousItem(
          cloned,
          measureIndex,
          staffId,
          item,
          subdivisionsPerMeasure,
        )
        const validTarget =
          item.kind === 'note' &&
          next?.item.kind === 'note' &&
          haveSameNotePitches(item, next.item, keySignature)

        if (!validTarget) {
          item.tieToNext = false
        }
      })
    })
  })

  return cloned
}

export function buildPlaybackNotes(
  measures: MeasureData[],
  timeSignature: TimeSignature,
  defaultBpm: number,
  keySignature: KeySignatureSpec = 'C',
) {
  const measureTimings = getMeasureTempoTimeline(measures, timeSignature, defaultBpm)
  const subdivisionsPerMeasure = getMeasureSubdivisions(timeSignature)
  const segments: Array<{
    durationSeconds: number
    notes: string[]
    startSeconds: number
  }> = []
  const visited = new Set<string>()

  measures.forEach((measure, measureIndex) => {
    STAFF_IDS.forEach((staffId) => {
      getItemsForStaff(measure, staffId).forEach((item) => {
        if (item.kind !== 'note' || visited.has(item.id)) {
          return
        }

        let totalDurationSeconds =
          getItemSubdivisions(item) *
          (measureTimings[measureIndex]?.subdivisionSeconds ??
            getSubdivisionSeconds(defaultBpm))
        let currentMeasureIndex = measureIndex
        let currentItem = item

        visited.add(item.id)

        while (currentItem.tieToNext) {
          const next = findNextContiguousItem(
            measures,
            currentMeasureIndex,
            staffId,
            currentItem,
            subdivisionsPerMeasure,
          )

          if (
            !next ||
            next.item.kind !== 'note' ||
            !haveSameNotePitches(next.item, item, keySignature)
          ) {
            break
          }

          totalDurationSeconds +=
            getItemSubdivisions(next.item) *
            (measureTimings[next.measureIndex]?.subdivisionSeconds ??
              getSubdivisionSeconds(defaultBpm))
          currentMeasureIndex = next.measureIndex
          currentItem = next.item
          visited.add(next.item.id)
        }

        segments.push({
          durationSeconds: totalDurationSeconds,
          notes: item.pitches.map((p) => toTonePitch(p, item.accidentals?.[p], keySignature)),
          startSeconds:
            (measureTimings[measureIndex]?.startSeconds ?? 0) +
            item.start *
              (measureTimings[measureIndex]?.subdivisionSeconds ??
                getSubdivisionSeconds(defaultBpm)),
        })
      })
    })
  })

  return segments
}

function getPitchPool(staffId: StaffId) {
  return (staffId === 'treble'
    ? TREBLE_PITCHES_FROM_TOP
    : BASS_PITCHES_FROM_TOP) as readonly string[]
}

function getTopLineIndex(staffId: StaffId) {
  return staffId === 'treble' ? TREBLE_TOP_LINE_INDEX : BASS_TOP_LINE_INDEX
}

export function getSubdivisionSeconds(bpm: number) {
  return (60 / bpm) / SUBDIVISIONS_PER_BEAT
}

export function yToPitch(
  y: number,
  topLineY: number,
  spacing: number,
  staffId: StaffId,
): NotePitch {
  const pool = getPitchPool(staffId)
  const diatonicStep = spacing / 2
  const rawIndex =
    Math.round((y - topLineY) / diatonicStep) + getTopLineIndex(staffId)
  const clampedIndex = Math.min(Math.max(rawIndex, 0), pool.length - 1)

  return pool[clampedIndex] ?? (staffId === 'treble' ? 'g/4' : 'c/3')
}

export function pitchToY(
  pitch: NotePitch,
  topLineY: number,
  spacing: number,
  staffId: StaffId,
): number {
  const pool = getPitchPool(staffId)
  const pitchIndex = pool.findIndex((value) => value === parsePitchToken(pitch).naturalPitch)
  const safeIndex = pitchIndex >= 0 ? pitchIndex : 8
  return topLineY + (safeIndex - getTopLineIndex(staffId)) * (spacing / 2)
}

export function getPitchLabel(
  pitch: NotePitch,
  accidental?: AccidentalType | null,
  keySignature: KeySignatureSpec = 'C',
): string {
  const { letter, octave } = parsePitchToken(pitch)
  const resolvedAccidental = getDisplayAccidentalForPitch(pitch, accidental, keySignature)
  const accSymbol =
    resolvedAccidental === 'n'
      ? '\u266E'
      : resolvedAccidental === '#'
        ? '\u266F'
        : resolvedAccidental === 'b'
          ? '\u266D'
          : resolvedAccidental === '##'
            ? '\u266F\u266F'
            : resolvedAccidental === 'bb'
              ? '\u266D\u266D'
          : ''
  return `${letter.toUpperCase()}${accSymbol}${octave}`
}

export function getPitchLabels(
  pitches: NotePitch[],
  accidentals?: Record<string, AccidentalType>,
  keySignature: KeySignatureSpec = 'C',
): string {
  return pitches.map((p) => getPitchLabel(p, accidentals?.[p], keySignature)).join(' + ')
}

export function getSnapStep(baseDuration: BaseDuration, dotted: boolean): number {
  const base = BASE_DURATION_SUBDIVISIONS[baseDuration]

  if (!dotted) {
    return base
  }

  return Math.max(1, Math.floor(base / 2))
}

export function snapSubdivision(
  rawSubdivision: number,
  baseDuration: BaseDuration,
  dotted: boolean,
  subdivisionsPerMeasure: number,
): number {
  const length = getDurationSubdivisions(baseDuration, dotted)
  const maxStart = Math.max(0, subdivisionsPerMeasure - length)
  const step = getSnapStep(baseDuration, dotted)
  const snapped = Math.round(rawSubdivision / step) * step
  return Math.min(snapped, maxStart)
}

const MEASURE_DECORATION_WIDTH =
  SYSTEM_FIRST_MEASURE_WIDTH - SYSTEM_MEASURE_WIDTH
const VISUAL_UNITS_PER_BEAT = 2
const EIGHTH_VISUAL_UNITS_PER_BEAT = 3
const SIXTEENTH_VISUAL_UNITS_PER_BEAT = 5
const THIRTY_SECOND_VISUAL_UNITS_PER_BEAT = 8
const VISUAL_UNIT_WIDTH = SYSTEM_MEASURE_WIDTH / (4 * VISUAL_UNITS_PER_BEAT)
const MAX_MEASURES_PER_SYSTEM = 4
const MIN_SYSTEM_COMPRESSION_RATIO = 0.84

function getSmallestBeatItemLength(
  items: ScoreItem[],
  groupStart: number,
  groupLength: number,
): number | null {
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

  return smallestLength
}

function getBeatVisualUnitsForItems(
  items: ScoreItem[],
  groupStart: number,
  groupLength: number,
): number {
  const smallestLength = getSmallestBeatItemLength(items, groupStart, groupLength)

  if (smallestLength === null || smallestLength >= 8) {
    return VISUAL_UNITS_PER_BEAT
  }

  if (smallestLength >= 4) {
    return EIGHTH_VISUAL_UNITS_PER_BEAT
  }

  if (smallestLength >= 2) {
    return SIXTEENTH_VISUAL_UNITS_PER_BEAT
  }

  return THIRTY_SECOND_VISUAL_UNITS_PER_BEAT
}

function getStaffGroupVisualUnits(
  items: ScoreItem[],
  groupSubdivisionLengths: number[],
) {
  let groupStart = 0

  return groupSubdivisionLengths.map((groupLength) => {
    const units = getBeatVisualUnitsForItems(items, groupStart, groupLength)
    groupStart += groupLength
    return units
  })
}

export function buildSystems(
  measures: MeasureData[],
  timeSignature: TimeSignature,
  groupingOverride: number[] | null,
  availableScoreWidth: number = SYSTEM_WRAP_WIDTH,
) {
  const meter = parseTimeSignature(timeSignature, groupingOverride)
  const systems: Array<
    Array<{
      bassNoteAreaWidth: number
      bassGroupUnits: number[]
      groupSubdivisionLengths: number[]
      measure: MeasureData
      measureIndex: number
      noteAreaWidth: number
      trebleNoteAreaWidth: number
      trebleGroupUnits: number[]
      width: number
    }>
  > = []
  let currentSystem: Array<{
    bassNoteAreaWidth: number
    bassGroupUnits: number[]
    groupSubdivisionLengths: number[]
    measure: MeasureData
    measureIndex: number
    noteAreaWidth: number
    trebleNoteAreaWidth: number
    trebleGroupUnits: number[]
    width: number
  }> = []
  let currentWidth = 0
  const maxWidth = Math.max(320, availableScoreWidth - SYSTEM_SIDE_PADDING * 2)

  measures.forEach((measure, measureIndex) => {
    const trebleGroupUnits = getStaffGroupVisualUnits(
      measure.trebleItems,
      meter.groupSubdivisionLengths,
    )
    const bassGroupUnits = getStaffGroupVisualUnits(
      measure.bassItems,
      meter.groupSubdivisionLengths,
    )
    const trebleNoteAreaWidth = Math.ceil(
      trebleGroupUnits.reduce((sum, units) => sum + units, 0) * VISUAL_UNIT_WIDTH,
    )
    const bassNoteAreaWidth = Math.ceil(
      bassGroupUnits.reduce((sum, units) => sum + units, 0) * VISUAL_UNIT_WIDTH,
    )
    const noteAreaWidth = Math.max(trebleNoteAreaWidth, bassNoteAreaWidth)
    const measureWidth =
      noteAreaWidth + (currentSystem.length === 0 ? MEASURE_DECORATION_WIDTH : 0)

    const nextSystemWidth = currentWidth + measureWidth
    const nextCompressionRatio =
      currentSystem.length > 0 ? maxWidth / nextSystemWidth : 1

    if (
      currentSystem.length > 0 &&
      (
        currentSystem.length >= MAX_MEASURES_PER_SYSTEM ||
        nextCompressionRatio < MIN_SYSTEM_COMPRESSION_RATIO
      )
    ) {
      systems.push(currentSystem)
      currentSystem = []
      currentWidth = 0
    }

    const widthForSystem =
      noteAreaWidth + (currentSystem.length === 0 ? MEASURE_DECORATION_WIDTH : 0)
    currentSystem.push({
      bassNoteAreaWidth,
      bassGroupUnits,
      groupSubdivisionLengths: meter.groupSubdivisionLengths,
      measure,
      measureIndex,
      noteAreaWidth,
      trebleNoteAreaWidth,
      trebleGroupUnits,
      width: widthForSystem,
    })
    currentWidth += widthForSystem
  })

  if (currentSystem.length > 0) {
    systems.push(currentSystem)
  }

  return systems
}

export function getChordStemDirection(
  pitches: NotePitch[],
  staffId: StaffId,
): number {
  const pool = getPitchPool(staffId)
  const middleIndex = 6
  const indexes = pitches
    .map((pitch) => pool.indexOf(parsePitchToken(pitch).naturalPitch))
    .filter((index) => index >= 0)

  if (indexes.length === 0) {
    return Stem.UP
  }

  const highestDistance = Math.abs(Math.min(...indexes) - middleIndex)
  const lowestDistance = Math.abs(Math.max(...indexes) - middleIndex)

  return lowestDistance >= highestDistance ? Stem.UP : Stem.DOWN
}

export function isChord(item: ScoreItem): item is NoteItem {
  return item.kind === 'note' && item.pitches.length > 1
}
