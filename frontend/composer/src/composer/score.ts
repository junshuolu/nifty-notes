import { Stem } from 'vexflow'
import {
  BASS_PITCHES_FROM_TOP,
  BASE_DURATION_SUBDIVISIONS,
  BPM,
  DURATION_OPTIONS,
  STAFF_IDS,
  SUBDIVISIONS_PER_BEAT,
  SYSTEM_FIRST_MEASURE_WIDTH,
  SYSTEM_MEASURE_WIDTH,
  SYSTEM_SIDE_PADDING,
  SYSTEM_WRAP_WIDTH,
  TIME_SIGNATURE_OPTIONS,
  TREBLE_PITCHES_FROM_TOP,
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

export function getItemsForStaff(
  measure: MeasureData,
  staffId: StaffId,
): ScoreItem[] {
  return staffId === 'treble' ? measure.trebleItems : measure.bassItems
}

export function getBeatsPerMeasure(timeSignature: TimeSignature): number {
  return (
    TIME_SIGNATURE_OPTIONS.find((option) => option.value === timeSignature)
      ?.beatsPerMeasure ?? 4
  )
}

export function getMeasureSubdivisions(timeSignature: TimeSignature): number {
  return getBeatsPerMeasure(timeSignature) * SUBDIVISIONS_PER_BEAT
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

export function toTonePitch(pitch: NotePitch): string {
  const [note, octave] = pitch.split('/')
  return `${note.toUpperCase()}${octave}`
}

export function cloneMeasures(measures: MeasureData[]): MeasureData[] {
  return measures.map((measure) => ({
    bassItems: measure.bassItems.map((item) =>
      item.kind === 'note'
        ? { ...item, pitches: [...item.pitches] }
        : { ...item },
    ),
    id: measure.id,
    trebleItems: measure.trebleItems.map((item) =>
      item.kind === 'note'
        ? { ...item, pitches: [...item.pitches] }
        : { ...item },
    ),
  }))
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
) {
  const subdivisionSeconds = (60 / BPM) / SUBDIVISIONS_PER_BEAT
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

        let totalSubdivisions = getItemSubdivisions(item)
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

          totalSubdivisions += getItemSubdivisions(next.item)
          currentMeasureIndex = next.measureIndex
          currentItem = next.item
          visited.add(next.item.id)
        }

        segments.push({
          durationSeconds: totalSubdivisions * subdivisionSeconds,
          notes: item.pitches.map(toTonePitch),
          startSeconds:
            (measureIndex * subdivisionsPerMeasure + item.start) * subdivisionSeconds,
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

export function yToPitch(
  y: number,
  topLineY: number,
  spacing: number,
  staffId: StaffId,
): NotePitch {
  const pool = getPitchPool(staffId)
  const diatonicStep = spacing / 2
  const rawIndex = Math.round((y - topLineY) / diatonicStep) + 2
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
  return topLineY + (safeIndex - 2) * (spacing / 2)
}

export function getPitchLabel(pitch: NotePitch): string {
  const [note, octave] = pitch.split('/')
  return `${note.toUpperCase()}${octave}`
}

export function getPitchLabels(pitches: NotePitch[]): string {
  return pitches.map(getPitchLabel).join(' + ')
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
  const snapped = Math.floor(rawSubdivision / step) * step
  return Math.min(snapped, maxStart)
}

export function getSystemMeasureWidth(measureIndexInSystem: number): number {
  return measureIndexInSystem === 0
    ? SYSTEM_FIRST_MEASURE_WIDTH
    : SYSTEM_MEASURE_WIDTH
}

export function buildSystems(measures: MeasureData[]) {
  const systems: Array<
    Array<{ measure: MeasureData; measureIndex: number; width: number }>
  > = []
  let currentSystem: Array<{ measure: MeasureData; measureIndex: number; width: number }> =
    []
  let currentWidth = 0
  const maxWidth = SYSTEM_WRAP_WIDTH - SYSTEM_SIDE_PADDING * 2

  measures.forEach((measure, measureIndex) => {
    const measureWidth = getSystemMeasureWidth(currentSystem.length)
    if (currentSystem.length > 0 && currentWidth + measureWidth > maxWidth) {
      systems.push(currentSystem)
      currentSystem = []
      currentWidth = 0
    }

    const widthForSystem = getSystemMeasureWidth(currentSystem.length)
    currentSystem.push({ measure, measureIndex, width: widthForSystem })
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
