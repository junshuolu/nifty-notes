export type BaseDuration = 'w' | 'h' | 'q' | '8' | '16'
export type EditMode = 'note' | 'rest' | 'tie' | 'erase'
export type NotePitch = string
export type StaffId = 'treble' | 'bass'

export interface ScoreItem {
  id: string
  kind: 'note' | 'rest'
  baseDuration: BaseDuration
  dots: 0 | 1
  start: number
  pitch?: NotePitch
  tieToNext?: boolean
}

export interface MeasureData {
  bassItems: ScoreItem[]
  id: string
  trebleItems: ScoreItem[]
}

export interface MeasureHitBox {
  hitBottom: number
  hitTop: number
  index: number
  left: number
  right: number
  spacing: number
  staffId: StaffId
  topLineY: number
  xBySubdivision: number[]
}

export interface ContiguousTarget {
  item: ScoreItem
  measureIndex: number
}

export interface HoverPreview {
  pitch: NotePitch
  x: number
  y: number
}

export const STAFF_IDS: StaffId[] = ['treble', 'bass']
export const BPM = 80
export const BEATS_PER_MEASURE = 4
export const SUBDIVISIONS_PER_BEAT = 4
export const SUBDIVISIONS_PER_MEASURE = BEATS_PER_MEASURE * SUBDIVISIONS_PER_BEAT
export const SYSTEM_LEFT = 52
export const SYSTEM_TOP = 116
export const SYSTEM_GAP_Y = 232
export const GRAND_STAFF_GAP = 104
export const SYSTEM_WRAP_WIDTH = 1120
export const SYSTEM_SIDE_PADDING = 36
export const SYSTEM_FIRST_MEASURE_WIDTH = 252
export const SYSTEM_MEASURE_WIDTH = 182
export const SCORE_PADDING_BOTTOM = 44
export const NOTE_COLOR = '#0f172a'
export const ACTIVE_COLOR = '#2563eb'
export const PLACEHOLDER_COLOR = '#c0cadc'
export const ERASE_HOVER_COLOR = '#ef4444'

export const TREBLE_PITCHES_FROM_TOP = [
  'a/5',
  'g/5',
  'f/5',
  'e/5',
  'd/5',
  'c/5',
  'b/4',
  'a/4',
  'g/4',
  'f/4',
  'e/4',
  'd/4',
  'c/4',
  'b/3',
  'a/3',
  'g/3',
  'f/3',
  'e/3',
] as const

export const BASS_PITCHES_FROM_TOP = [
  'c/4',
  'b/3',
  'a/3',
  'g/3',
  'f/3',
  'e/3',
  'd/3',
  'c/3',
  'b/2',
  'a/2',
  'g/2',
  'f/2',
  'e/2',
  'd/2',
  'c/2',
  'b/1',
  'a/1',
  'g/1',
] as const

export const BASE_DURATION_SUBDIVISIONS: Record<BaseDuration, number> = {
  '16': 1,
  '8': 2,
  h: 8,
  q: 4,
  w: 16,
}

export const DURATION_OPTIONS: Array<{
  baseDuration: BaseDuration
  label: string
  previewClass: string
}> = [
  { baseDuration: 'w', label: 'Whole', previewClass: 'whole' },
  { baseDuration: 'h', label: 'Half', previewClass: 'half' },
  { baseDuration: 'q', label: 'Quarter', previewClass: 'quarter' },
  { baseDuration: '8', label: 'Eighth', previewClass: 'eighth' },
  { baseDuration: '16', label: 'Sixteenth', previewClass: 'sixteenth' },
]

export const PIANO_SAMPLE_URLS = {
  A0: 'A0.mp3',
  A1: 'A1.mp3',
  A2: 'A2.mp3',
  A3: 'A3.mp3',
  A4: 'A4.mp3',
  A5: 'A5.mp3',
  A6: 'A6.mp3',
  A7: 'A7.mp3',
  C1: 'C1.mp3',
  C2: 'C2.mp3',
  C3: 'C3.mp3',
  C4: 'C4.mp3',
  C5: 'C5.mp3',
  C6: 'C6.mp3',
  C7: 'C7.mp3',
  C8: 'C8.mp3',
  'D#1': 'Ds1.mp3',
  'D#2': 'Ds2.mp3',
  'D#3': 'Ds3.mp3',
  'D#4': 'Ds4.mp3',
  'D#5': 'Ds5.mp3',
  'D#6': 'Ds6.mp3',
  'D#7': 'Ds7.mp3',
  'F#1': 'Fs1.mp3',
  'F#2': 'Fs2.mp3',
  'F#3': 'Fs3.mp3',
  'F#4': 'Fs4.mp3',
  'F#5': 'Fs5.mp3',
  'F#6': 'Fs6.mp3',
  'F#7': 'Fs7.mp3',
}

export function createMeasure(id?: string): MeasureData {
  return {
    bassItems: [],
    id: id ?? crypto.randomUUID(),
    trebleItems: [],
  }
}

export const initialMeasures = Array.from({ length: 4 }, (_, index) =>
  createMeasure(`measure-${index + 1}`),
)
