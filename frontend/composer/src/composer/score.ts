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

export function canUseDot(_: BaseDuration): boolean {
  return true
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
  const baseLabel = DURATION_OPTIONS.find(
    (option) => option.baseDuration === baseDuration,
  )?.label

  if (!baseLabel) {
    return 'Quarter'
  }

  return dotted ? `Dotted ${baseLabel}` : baseLabel
}

export function getDurationPreviewClass(baseDuration: BaseDuration): string {
  return (
    DURATION_OPTIONS.find((option) => option.baseDuration === baseDuration)
      ?.previewClass ?? 'quarter'
  )
}

export function toTonePitch(pitch: NotePitch, accidental?: AccidentalType | null): string {
  const [note, octave] = pitch.split('/')
  const acc = accidental === '#' ? '#' : accidental === 'b' ? 'b' : ''
  return `${note.toUpperCase()}${acc}${octave}`
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
  return [...new Set(pitches)].sort(
    (left, right) => pool.indexOf(left) - pool.indexOf(right),
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

export function normalizeMeasures(
  measures: MeasureData[],
  subdivisionsPerMeasure: number,
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
          haveSamePitches(item.pitches, next.item.pitches)

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
            !haveSamePitches(next.item.pitches, item.pitches)
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
          notes: item.pitches.map((p) => toTonePitch(p, item.accidentals?.[p])),
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
  const pitchIndex = pool.findIndex((value) => value === pitch)
  const safeIndex = pitchIndex >= 0 ? pitchIndex : 8
  return topLineY + (safeIndex - getTopLineIndex(staffId)) * (spacing / 2)
}

export function getPitchLabel(pitch: NotePitch, accidental?: AccidentalType | null): string {
  const [note, octave] = pitch.split('/')
  const accSymbol = accidental === '#' ? '\u266F' : accidental === 'b' ? '\u266D' : accidental === 'n' ? '\u266E' : ''
  return `${note.toUpperCase()}${accSymbol}${octave}`
}

export function getPitchLabels(pitches: NotePitch[], accidentals?: Record<string, AccidentalType>): string {
  return pitches.map((p) => getPitchLabel(p, accidentals?.[p])).join(' + ')
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
const SIXTEENTH_VISUAL_UNITS_PER_BEAT = 3.5
const THIRTY_SECOND_VISUAL_UNITS_PER_BEAT = 6
const VISUAL_UNIT_WIDTH = SYSTEM_MEASURE_WIDTH / (4 * VISUAL_UNITS_PER_BEAT)

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

function getFocusedBeatVisualUnits(
  focusedBaseDuration: BaseDuration | null,
) {
  if (focusedBaseDuration === '16') {
    return SIXTEENTH_VISUAL_UNITS_PER_BEAT
  }

  if (focusedBaseDuration === '8') {
    return EIGHTH_VISUAL_UNITS_PER_BEAT
  }

  return VISUAL_UNITS_PER_BEAT
}

function getStaffGroupVisualUnits(
  items: ScoreItem[],
  groupSubdivisionLengths: number[],
  focusedGroupStart: number | null,
  focusedBaseDuration: BaseDuration | null,
) {
  let groupStart = 0

  return groupSubdivisionLengths.map((groupLength) => {
    const units = Math.max(
      getBeatVisualUnitsForItems(items, groupStart, groupLength),
      focusedGroupStart === groupStart && focusedBaseDuration !== null
        ? getFocusedBeatVisualUnits(focusedBaseDuration)
        : VISUAL_UNITS_PER_BEAT,
    )

    groupStart += groupLength
    return units
  })
}

export function buildSystems(
  measures: MeasureData[],
  timeSignature: TimeSignature,
  groupingOverride: number[] | null,
  placeholderFocus: {
    groupStart: number
    measureIndex: number
    staffId: StaffId
  } | null,
  baseDuration: BaseDuration,
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
  const maxWidth = SYSTEM_WRAP_WIDTH - SYSTEM_SIDE_PADDING * 2

  measures.forEach((measure, measureIndex) => {
    const focusedTrebleGroupStart =
      placeholderFocus?.measureIndex === measureIndex &&
      placeholderFocus.staffId === 'treble'
        ? placeholderFocus.groupStart
        : null
    const focusedBassGroupStart =
      placeholderFocus?.measureIndex === measureIndex &&
      placeholderFocus.staffId === 'bass'
        ? placeholderFocus.groupStart
        : null
    const trebleGroupUnits = getStaffGroupVisualUnits(
      measure.trebleItems,
      meter.groupSubdivisionLengths,
      focusedTrebleGroupStart,
      focusedTrebleGroupStart === null ? null : baseDuration,
    )
    const bassGroupUnits = getStaffGroupVisualUnits(
      measure.bassItems,
      meter.groupSubdivisionLengths,
      focusedBassGroupStart,
      focusedBassGroupStart === null ? null : baseDuration,
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

    if (currentSystem.length > 0 && currentWidth + measureWidth > maxWidth) {
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
    .map((pitch) => pool.indexOf(pitch))
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
