import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import * as Tone from 'tone'
import {
  BarlineType,
  Beam,
  Dot,
  Formatter,
  Fraction,
  GhostNote,
  Metrics,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  Voice,
} from 'vexflow'
import './App.css'
import { CursorPreview } from './composer/CursorPreview'
import {
  ACTIVE_COLOR,
  DEFAULT_BPM,
  DURATION_OPTIONS,
  ERASE_HOVER_COLOR,
  GRAND_STAFF_GAP,
  MAX_BPM,
  MIN_BPM,
  NOTE_COLOR,
  PIANO_SAMPLE_URLS,
  SCORE_PADDING_BOTTOM,
  STAFF_IDS,
  SUBDIVISIONS_PER_BEAT,
  SYSTEM_GAP_Y,
  SYSTEM_SIDE_PADDING,
  SYSTEM_WRAP_WIDTH,
  TIME_SIGNATURE_OPTIONS,
  type BaseDuration,
  type EditMode,
  type HoverPreview,
  type MeasureData,
  type MeasureHitBox,
  type NoteItem,
  type NotePitch,
  type RenderDuration,
  type ScoreItem,
  type StaffId,
  type TimeSignature,
  createMeasure,
  generateId,
  initialMeasures,
} from './composer/constants'
import {
  buildPlaybackNotes,
  buildSystems,
  canUseDot,
  cloneMeasures,
  findCoveringItem,
  findNextContiguousItem,
  findNextStartingItem,
  findStartingItem,
  getBeatsPerMeasure,
  getChordStemDirection,
  getDurationName,
  getDurationSubdivisions,
  getItemSubdivisions,
  getItemsForStaff,
  getMeasureSubdivisions,
  getPitchLabel,
  getPitchLabels,
  getSubdivisionSeconds,
  haveSamePitches,
  itemEnd,
  normalizeMeasures,
  pitchToY,
  rangesOverlap,
  snapSubdivision,
  sortPitches,
  toTonePitch,
  yToPitch,
} from './composer/score'

const PLAYBACK_START_DELAY_SECONDS = 0.08
const NOTE_VISUAL_SHIFT = 4
const REST_VISUAL_SHIFT = 11
const MEASURE_EDGE_PADDING = 3
const GRID_EDGE_PADDING = 10

type PlayheadState = {
  height: number
  top: number
  x: number
}

type PlaceholderFocus = {
  beatStart: number
  measureIndex: number
  staffId: StaffId
}

function clampTempo(nextTempo: number) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(nextTempo)))
}

function getPlayheadState(
  hitBoxes: MeasureHitBox[],
  elapsedSeconds: number,
  bpm: number,
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

  const subdivisionSeconds = getSubdivisionSeconds(bpm)
  const absoluteSubdivision = Math.max(0, elapsedSeconds / subdivisionSeconds)
  const measureIndex = Math.min(
    Math.floor(absoluteSubdivision / subdivisionsPerMeasure),
    trebleBoxes.length - 1,
  )
  const localSubdivision = Math.min(
    absoluteSubdivision - measureIndex * subdivisionsPerMeasure,
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
  activeItemId: string | null,
  eraseHoverItemId: string | null,
  noteRegistry: Map<string, { item: NoteItem; note: StaveNote }>,
): StaveNote {
  const note =
    item.kind === 'note'
      ? new StaveNote({
          clef: staffId,
          dots: item.dots,
          duration: item.baseDuration,
          keys: item.pitches,
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
      : activeItemId === item.id
        ? ACTIVE_COLOR
        : NOTE_COLOR

  applyDots(note, item.dots, color)

  styleNote(note, color)

  if (item.kind === 'note') {
    noteRegistry.set(item.id, { item, note })
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
): StaveNote {
  const placeholder = new StaveNote({
    clef: staffId,
    duration: baseDuration,
    keys: [getRestKey(staffId)],
    type: 'r',
  })

  styleNote(placeholder, color)
  return placeholder
}

function createAnchorNotes(subdivisionsPerMeasure: number): GhostNote[] {
  return Array.from({ length: subdivisionsPerMeasure }, () => new GhostNote('32'))
}

function getBeatPlaceholderLength(
  items: ScoreItem[],
  beatStart: number,
) {
  const beatEnd = beatStart + SUBDIVISIONS_PER_BEAT
  let smallestLength: number | null = null

  items.forEach((item) => {
    if (item.start >= beatEnd || itemEnd(item) <= beatStart) {
      return
    }

    const length = getItemSubdivisions(item)

    if (smallestLength === null || length < smallestLength) {
      smallestLength = length
    }
  })

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

function getPlaceholderDurationForLength(length: number): RenderDuration {
  if (length >= 8) {
    return 'q'
  }

  if (length >= 4) {
    return '8'
  }

  if (length >= 2) {
    return '16'
  }

  return '32'
}

function clampPlaceholderLength(maxLength: number, preferredLength: number) {
  if (preferredLength <= maxLength) {
    return preferredLength
  }

  if (maxLength >= 8) {
    return 8
  }

  if (maxLength >= 4) {
    return 4
  }

  if (maxLength >= 2) {
    return 2
  }

  return 1
}

function beatContainsSixteenthContent(
  items: ScoreItem[],
  beatStart: number,
) {
  const beatEnd = beatStart + SUBDIVISIONS_PER_BEAT

  return items.some((item) => {
    if (item.start >= beatEnd || itemEnd(item) <= beatStart) {
      return false
    }

    return getItemSubdivisions(item) <= 2
  })
}

function getFocusedPlaceholderLength(
  items: ScoreItem[],
  subdivision: number,
  subdivisionsPerMeasure: number,
  focusedBaseDuration: BaseDuration,
) {
  const beatStart =
    Math.floor(subdivision / SUBDIVISIONS_PER_BEAT) * SUBDIVISIONS_PER_BEAT
  const beatEnd = Math.min(beatStart + SUBDIVISIONS_PER_BEAT, subdivisionsPerMeasure)
  const nextStart =
    findNextStartingItem(items, subdivision - 1)?.start ?? subdivisionsPerMeasure
  const maxLength = Math.min(nextStart - subdivision, beatEnd - subdivision)

  if (focusedBaseDuration === '8') {
    return clampPlaceholderLength(maxLength, 4)
  }

  if (focusedBaseDuration === '16') {
    const preferredLength =
      subdivision < beatStart + 4 || beatContainsSixteenthContent(items, beatStart)
        ? 2
        : 4

    return clampPlaceholderLength(maxLength, preferredLength)
  }

  return getPlaceholderLength(items, subdivision, subdivisionsPerMeasure)
}

function getPlaceholderLength(
  items: ScoreItem[],
  subdivision: number,
  subdivisionsPerMeasure: number,
) {
  const beatStart =
    Math.floor(subdivision / SUBDIVISIONS_PER_BEAT) * SUBDIVISIONS_PER_BEAT
  const beatEnd = Math.min(beatStart + SUBDIVISIONS_PER_BEAT, subdivisionsPerMeasure)
  const nextStart =
    findNextStartingItem(items, subdivision - 1)?.start ?? subdivisionsPerMeasure
  const maxLength = Math.min(nextStart - subdivision, beatEnd - subdivision)
  const preferredLength = getBeatPlaceholderLength(items, beatStart)

  return clampPlaceholderLength(maxLength, preferredLength)
}

function buildStaffVoiceData(
  items: ScoreItem[],
  staffId: StaffId,
  activeItemId: string | null,
  eraseHoverItemId: string | null,
  noteRegistry: Map<string, { item: NoteItem; note: StaveNote }>,
  subdivisionsPerMeasure: number,
  measureIndex: number,
  placeholderFocus: PlaceholderFocus | null,
  focusedBaseDuration: BaseDuration,
) {
  const notes: StaveNote[] = []
  const lengths: number[] = []
  const starts: number[] = []
  let subdivision = 0
  const focusedBeatStart =
    placeholderFocus?.measureIndex === measureIndex &&
    placeholderFocus.staffId === staffId
      ? placeholderFocus.beatStart
      : null

  while (subdivision < subdivisionsPerMeasure) {
    const item = findStartingItem(items, subdivision)

    if (item) {
      lengths.push(getItemSubdivisions(item))
      starts.push(item.start)
      notes.push(
        createVisualNote(
          item,
          staffId,
          activeItemId,
          eraseHoverItemId,
          noteRegistry,
        ),
      )
      subdivision += getItemSubdivisions(item)
      continue
    }

    const isFocusedBeat =
      focusedBeatStart !== null &&
      subdivision >= focusedBeatStart &&
      subdivision < focusedBeatStart + SUBDIVISIONS_PER_BEAT
    const placeholderLength = isFocusedBeat
      ? getFocusedPlaceholderLength(
          items,
          subdivision,
          subdivisionsPerMeasure,
          focusedBaseDuration,
        )
      : getPlaceholderLength(items, subdivision, subdivisionsPerMeasure)
    const placeholderDuration = getPlaceholderDurationForLength(placeholderLength)
    lengths.push(placeholderLength)
    starts.push(subdivision)
    notes.push(createPlaceholder(placeholderDuration, staffId, NOTE_COLOR))
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
      {baseDuration === '8' || baseDuration === '16' ? (
        <span className={`${className}__flag ${className}__flag--1`} />
      ) : null}
      {baseDuration === '16' ? (
        <span className={`${className}__flag ${className}__flag--2`} />
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

function getNoteExtents(length: number, hasFlag: boolean, dotted = false) {
  const left = 10
  let right = 14

  if (length <= 2 || hasFlag) {
    right = 18
  } else if (length <= 4) {
    right = 16
  } else if (length >= 16) {
    right = 12
  }

  if (dotted) {
    right += 6
  }

  return { left, right }
}

function getRestExtents() {
  return { left: 7, right: 7 }
}

function getPreviewExtents(
  previewBaseDuration: BaseDuration,
  previewDotted: boolean,
) {
  return getNoteExtents(
    getDurationSubdivisions(previewBaseDuration, previewDotted),
    previewBaseDuration === '8' || previewBaseDuration === '16',
    previewDotted,
  )
}

function getTickableExtents(note: StaveNote, length: number) {
  if (note.isRest()) {
    return getRestExtents()
  }

  return getNoteExtents(length, note.hasFlag())
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

  return Math.min(
    measureRight - right - MEASURE_EDGE_PADDING,
    Math.max(measureLeft + left + MEASURE_EDGE_PADDING, previewX),
  )
}

function applyFixedSubdivisionGrid(
  stave: Stave,
  anchorNotes: GhostNote[],
  beatUnits: number[],
  noteAreaWidth: number,
) {
  const stavePadding = Metrics.get('Stave.padding', 0)
  const totalUnits = beatUnits.reduce((sum, units) => sum + units, 0)
  const usableWidth = Math.max(
    1,
    Math.min(
      noteAreaWidth,
      stave.getNoteEndX() - stave.getNoteStartX(),
    ) - GRID_EDGE_PADDING * 2,
  )
  const unitWidth = usableWidth / Math.max(totalUnits, 1)
  const beatOffsets: number[] = []
  let accumulatedOffset = GRID_EDGE_PADDING

  beatUnits.forEach((units) => {
    beatOffsets.push(accumulatedOffset)
    accumulatedOffset += units * unitWidth
  })

  return anchorNotes.map((note, subdivision) => {
    const beatIndex = Math.floor(subdivision / SUBDIVISIONS_PER_BEAT)
    const beatOffset = beatOffsets[beatIndex] ?? GRID_EDGE_PADDING
    const unitsInBeat = beatUnits[beatIndex] ?? 2
    const subdivisionWidth = (unitsInBeat * unitWidth) / SUBDIVISIONS_PER_BEAT
    const relativeX =
      beatOffset +
      subdivisionWidth * (subdivision % SUBDIVISIONS_PER_BEAT) +
      subdivisionWidth / 2
    const absoluteX = stave.getNoteStartX() + stavePadding + relativeX
    note.getTickContext().setX(relativeX)
    return absoluteX
  })
}

function positionTickablesOnGrid(
  stave: Stave,
  notes: StaveNote[],
  lengths: number[],
  starts: number[],
  xBySubdivision: number[],
) {
  const stavePadding = Metrics.get('Stave.padding', 0)

  notes.forEach((note, index) => {
    const subdivision = starts[index] ?? 0
    const length = lengths[index] ?? 1
    const lastSubdivision = Math.min(
      subdivision + Math.max(length - 1, 0),
      xBySubdivision.length - 1,
    )
    const startX = xBySubdivision[subdivision]
    const endX = xBySubdivision[lastSubdivision]

    if (startX === undefined || endX === undefined) {
      return
    }

    const anchorX =
      (startX + endX) / 2 -
      NOTE_VISUAL_SHIFT -
      (note.isRest() ? REST_VISUAL_SHIFT : 0)
    const { left, right } = getTickableExtents(note, length)
    const clampedAnchorX = clampAnchorXToMeasure(
      anchorX,
      stave.getNoteStartX(),
      stave.getNoteEndX(),
      left,
      right,
    )
    const relativeX = clampedAnchorX - stave.getNoteStartX() - stavePadding
    note.getTickContext().setX(relativeX)
  })
}

function App() {
  const scoreRef = useRef<HTMLDivElement | null>(null)
  const tempoPanelRef = useRef<HTMLDivElement | null>(null)
  const hitBoxesRef = useRef<MeasureHitBox[]>([])
  const pianoRef = useRef<Tone.Sampler | null>(null)
  const pianoLoaderRef = useRef<Promise<Tone.Sampler> | null>(null)
  const previewSynthRef = useRef<Tone.Synth | null>(null)
  const metronomeSynthRef = useRef<Tone.Synth | null>(null)
  const playbackTimerRef = useRef<number | null>(null)
  const playheadAnimationRef = useRef<number | null>(null)
  const playbackStartRef = useRef<number | null>(null)
  const playbackDurationRef = useRef(0)
  const scheduledTransportEventsRef = useRef<number[]>([])
  const [measures, setMeasures] = useState<MeasureData[]>(initialMeasures)
  const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4')
  const [mode, setMode] = useState<EditMode>('note')
  const [baseDuration, setBaseDuration] = useState<BaseDuration>('q')
  const [dotted, setDotted] = useState(false)
  const [tempoBpm, setTempoBpm] = useState(DEFAULT_BPM)
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false)
  const [isTempoPanelOpen, setIsTempoPanelOpen] = useState(false)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [eraseHoverItemId, setEraseHoverItemId] = useState<string | null>(null)
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null)
  const [placeholderFocus, setPlaceholderFocus] = useState<PlaceholderFocus | null>(
    null,
  )
  const [playhead, setPlayhead] = useState<PlayheadState | null>(null)
  const [status, setStatus] = useState(
    'Choose a note value, then click either staff to add notes, rests, or chords.',
  )
  const [isPlaying, setIsPlaying] = useState(false)

  const systems = buildSystems(
    measures,
    timeSignature,
    placeholderFocus,
    baseDuration,
  )
  const subdivisionsPerMeasure = getMeasureSubdivisions(timeSignature)
  const beatsPerMeasure = getBeatsPerMeasure(timeSignature)
  const scoreTop = 36
  const scoreWidth = Math.max(
    SYSTEM_WRAP_WIDTH,
    systems.reduce(
      (widest, system) =>
        Math.max(
          widest,
          system.reduce((sum, entry) => sum + entry.width, 0) +
            SYSTEM_SIDE_PADDING * 2,
        ),
      0,
    ),
  )
  const scoreHeight =
    scoreTop +
    (systems.length - 1) * SYSTEM_GAP_Y +
    GRAND_STAFF_GAP +
    120 +
    SCORE_PADDING_BOTTOM
  const selectedDurationName = getDurationName(baseDuration, dotted)
  const dotEnabled = canUseDot(baseDuration)

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
        tempoBpm,
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

    systems.forEach((system, systemIndex) => {
      let currentX = SYSTEM_SIDE_PADDING
      const trebleY = scoreTop + systemIndex * SYSTEM_GAP_Y
      const bassY = trebleY + GRAND_STAFF_GAP

      system.forEach((entry, measureInSystem) => {
        const isSystemStart = measureInSystem === 0
        const isFinalMeasure = entry.measureIndex === measures.length - 1
        const trebleStave = new Stave(currentX, trebleY, entry.width)
        const bassStave = new Stave(currentX, bassY, entry.width)

        if (isSystemStart) {
          trebleStave.addClef('treble')
          bassStave.addClef('bass')

          if (systemIndex === 0) {
            trebleStave.addTimeSignature(timeSignature)
            bassStave.addTimeSignature(timeSignature)
          }
        }

        if (isFinalMeasure) {
          trebleStave.setEndBarType(BarlineType.END)
          bassStave.setEndBarType(BarlineType.END)
        }

        trebleStave.setContext(context).draw()
        bassStave.setContext(context).draw()

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

        const trebleData = buildStaffVoiceData(
          entry.measure.trebleItems,
          'treble',
          activeItemId,
          eraseHoverItemId,
          noteRegistry,
          subdivisionsPerMeasure,
          entry.measureIndex,
          placeholderFocus,
          baseDuration,
        )
        const bassData = buildStaffVoiceData(
          entry.measure.bassItems,
          'bass',
          activeItemId,
          eraseHoverItemId,
          noteRegistry,
          subdivisionsPerMeasure,
          entry.measureIndex,
          placeholderFocus,
          baseDuration,
        )

        const trebleVoice = new Voice({ beatValue: 4, numBeats: beatsPerMeasure })
        const bassVoice = new Voice({ beatValue: 4, numBeats: beatsPerMeasure })
        const trebleAnchorVoice = new Voice({ beatValue: 4, numBeats: beatsPerMeasure })
        const bassAnchorVoice = new Voice({ beatValue: 4, numBeats: beatsPerMeasure })

        trebleVoice.addTickables(trebleData.notes).setStave(trebleStave)
        bassVoice.addTickables(bassData.notes).setStave(bassStave)
        trebleAnchorVoice
          .addTickables(trebleData.anchorNotes)
          .setStave(trebleStave)
        bassAnchorVoice
          .addTickables(bassData.anchorNotes)
          .setStave(bassStave)

        const formatter = new Formatter()
        formatter.joinVoices([trebleVoice, trebleAnchorVoice])
        formatter.joinVoices([bassVoice, bassAnchorVoice])
        formatter.format(
          [trebleVoice, trebleAnchorVoice, bassVoice, bassAnchorVoice],
          trebleStave.getNoteEndX() - trebleStave.getNoteStartX(),
          {
            alignRests: false,
            context,
          },
        )

        const trebleXBySubdivision = applyFixedSubdivisionGrid(
          trebleStave,
          trebleData.anchorNotes,
          entry.trebleBeatUnits,
          entry.trebleNoteAreaWidth,
        )
        const bassXBySubdivision = applyFixedSubdivisionGrid(
          bassStave,
          bassData.anchorNotes,
          entry.bassBeatUnits,
          entry.bassNoteAreaWidth,
        )

        positionTickablesOnGrid(
          trebleStave,
          trebleData.notes,
          trebleData.lengths,
          trebleData.starts,
          trebleXBySubdivision,
        )
        positionTickablesOnGrid(
          bassStave,
          bassData.notes,
          bassData.lengths,
          bassData.starts,
          bassXBySubdivision,
        )

        const beamGroups = [new Fraction(1, 4)]
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

        hitBoxes.push({
          hitBottom: trebleStave.getYForLine(8),
          hitTop: trebleStave.getYForLine(-3),
          index: entry.measureIndex,
          left: trebleStave.getNoteStartX(),
          right: trebleStave.getNoteEndX(),
          spacing: trebleStave.getSpacingBetweenLines(),
          staffId: 'treble',
          topLineY: trebleStave.getYForLine(0),
          xBySubdivision: trebleXBySubdivision,
        })

        hitBoxes.push({
          hitBottom: bassStave.getYForLine(8),
          hitTop: bassStave.getYForLine(-3),
          index: entry.measureIndex,
          left: bassStave.getNoteStartX(),
          right: bassStave.getNoteEndX(),
          spacing: bassStave.getSpacingBetweenLines(),
          staffId: 'bass',
          topLineY: bassStave.getYForLine(0),
          xBySubdivision: bassXBySubdivision,
        })

        currentX += entry.width
      })
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
            !haveSamePitches(item.pitches, next.item.pitches)
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

    hitBoxesRef.current = hitBoxes
  }, [
    activeItemId,
    beatsPerMeasure,
    eraseHoverItemId,
    measures,
    scoreHeight,
    scoreTop,
    scoreWidth,
    subdivisionsPerMeasure,
    systems,
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
    setHoverPreview(null)
    setEraseHoverItemId(null)
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
      status?: string
    },
  ) {
    setMeasures((current) => {
      const draft = cloneMeasures(current)
      const result = updater(draft)
      const normalized = normalizeMeasures(draft, subdivisionsPerMeasure)

      if (result.activeItemId !== undefined) {
        setActiveItemId(result.activeItemId)
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

      if (pianoRef.current?.loaded) {
        pianoRef.current.triggerAttackRelease(toTonePitch(pitch), 0.45, Tone.now())
        return
      }

      ensurePreviewSynth().triggerAttackRelease(toTonePitch(pitch), '8n', Tone.now())
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
            status: `Removed ${getPitchLabel(pitch)} from the ${staffId} chord.`,
          }
        }

        matchingStartItem.pitches = nextPitches

        return {
          activeItemId: matchingStartItem.id,
          status: pitchExists
            ? `Updated ${staffId} chord: ${getPitchLabels(nextPitches)}.`
            : `Expanded ${staffId} chord: ${getPitchLabels(nextPitches)}.`,
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

      return {
        activeItemId: inserted.id,
        status:
          kind === 'note'
            ? `Inserted ${getPitchLabel(pitch)} on ${staffId} as a ${selectedDurationName.toLowerCase()} note.`
            : `Inserted a ${selectedDurationName.toLowerCase()} rest on ${staffId}.`,
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

      if (!haveSamePitches(next.item.pitches, target.pitches)) {
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
    const beatStart =
      Math.floor(snappedSubdivision / SUBDIVISIONS_PER_BEAT) * SUBDIVISIONS_PER_BEAT
    const previewLength = getDurationSubdivisions(baseDuration, dotted)
    const previewLastSubdivision = Math.min(
      snappedSubdivision + Math.max(previewLength - 1, 0),
      hitBox.xBySubdivision.length - 1,
    )
    const previewStartX =
      hitBox.xBySubdivision[snappedSubdivision] ?? hitBox.xBySubdivision[0] ?? hitBox.left
    const previewEndX =
      hitBox.xBySubdivision[previewLastSubdivision] ?? previewStartX
    const previewX = clampPreviewX(
      (previewStartX + previewEndX) / 2 - NOTE_VISUAL_SHIFT,
      hitBox.left,
      hitBox.right,
      baseDuration,
      dotted,
    )
    const pitch = yToPitch(y, hitBox.topLineY, hitBox.spacing, hitBox.staffId)
    const previewY = pitchToY(
      pitch,
      hitBox.topLineY,
      hitBox.spacing,
      hitBox.staffId,
    )
    const targetItem = findCoveringItem(
      getItemsForStaff(measures[hitBox.index], hitBox.staffId),
      rawSubdivision,
    )

    return {
      beatStart,
      hitBox,
      pitch,
      previewX,
      previewY,
      rawSubdivision,
      snappedSubdivision,
      targetItem,
    }
  }

  function handleScoreMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    const pointerTarget = resolvePointerTarget(
      event.nativeEvent.offsetX,
      event.nativeEvent.offsetY,
    )

    if (!pointerTarget) {
      clearHoverState()
      return
    }

    setPlaceholderFocus({
      beatStart: pointerTarget.beatStart,
      measureIndex: pointerTarget.hitBox.index,
      staffId: pointerTarget.hitBox.staffId,
    })

    if (mode === 'note') {
      setHoverPreview({
        pitches: [pointerTarget.pitch],
        x: pointerTarget.previewX,
        y: pointerTarget.previewY,
      })
    } else {
      setHoverPreview(null)
    }

    if (mode === 'erase') {
      setEraseHoverItemId(pointerTarget.targetItem?.id ?? null)
    } else {
      setEraseHoverItemId(null)
    }
  }

  function handleScoreLeave() {
    clearHoverState()
  }

  function handleScoreClick(event: ReactMouseEvent<HTMLDivElement>) {
    const pointerTarget = resolvePointerTarget(
      event.nativeEvent.offsetX,
      event.nativeEvent.offsetY,
    )

    if (!pointerTarget) {
      setStatus('Click directly inside either staff.')
      return
    }

    setPlaceholderFocus({
      beatStart: pointerTarget.beatStart,
      measureIndex: pointerTarget.hitBox.index,
      staffId: pointerTarget.hitBox.staffId,
    })

    if (mode === 'erase') {
      eraseAtPosition(
        pointerTarget.hitBox.index,
        pointerTarget.hitBox.staffId,
        pointerTarget.rawSubdivision,
      )
      return
    }

    if (mode === 'tie') {
      toggleTieAtPosition(
        pointerTarget.hitBox.index,
        pointerTarget.hitBox.staffId,
        pointerTarget.rawSubdivision,
      )
      return
    }

    if (mode === 'rest') {
      insertAtPosition(
        pointerTarget.hitBox.index,
        pointerTarget.hitBox.staffId,
        pointerTarget.rawSubdivision,
        pointerTarget.pitch,
        'rest',
      )
      return
    }

    insertAtPosition(
      pointerTarget.hitBox.index,
      pointerTarget.hitBox.staffId,
      pointerTarget.rawSubdivision,
      pointerTarget.pitch,
      'note',
    )
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

    const notes = buildPlaybackNotes(measures, timeSignature, tempoBpm)
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
    Tone.Transport.bpm.value = tempoBpm
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
      const beatSeconds = 60 / tempoBpm
      const beatCount = Math.ceil(totalDuration / beatSeconds)

      for (let beatIndex = 0; beatIndex <= beatCount; beatIndex += 1) {
        const isDownBeat = beatIndex % beatsPerMeasure === 0
        scheduledTransportEventsRef.current.push(
          Tone.Transport.schedule((time) => {
            metronome.triggerAttackRelease(
              isDownBeat ? 'C6' : 'A5',
              '32n',
              time,
              isDownBeat ? 0.9 : 0.55,
            )
          }, beatIndex * beatSeconds),
        )
      }
    }

    startPlayheadAnimation(totalDuration)
    Tone.Transport.start(`+${PLAYBACK_START_DELAY_SECONDS}`)

    playbackTimerRef.current = window.setTimeout(() => {
      setIsPlaying(false)
      clearScheduledPlayback()
      stopPlaybackVisuals()
    }, (totalDuration + 0.3) * 1000)

    setIsPlaying(true)
    setStatus(
      isMetronomeEnabled
        ? `Playing at ${tempoBpm} BPM with metronome.`
        : `Playing at ${tempoBpm} BPM.`,
    )
  }

  function updateTempo(nextTempo: number) {
    if (Number.isNaN(nextTempo)) {
      return
    }

    setTempoBpm(clampTempo(nextTempo))
  }

  function selectDuration(nextDuration: BaseDuration) {
    setBaseDuration(nextDuration)
  }

  function changeTimeSignature(nextTimeSignature: TimeSignature) {
    if (nextTimeSignature === timeSignature) {
      return
    }

    setTimeSignature(nextTimeSignature)
    setMeasures((current) => current.map((measure) => createMeasure(measure.id)))
    setActiveItemId(null)
    clearHoverState()
    pianoRef.current?.releaseAll()
    clearScheduledPlayback()
    stopPlaybackVisuals()
    setIsPlaying(false)
    setStatus(`Switched to ${nextTimeSignature}. Existing notes were cleared.`)
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
    setStatus('Added one bar. The layout wraps automatically as the score grows.')
  }

  function removeMeasure() {
    pianoRef.current?.releaseAll()
    clearScheduledPlayback()
    stopPlaybackVisuals()
    setIsPlaying(false)
    setMeasures((current) => {
      if (current.length === 1) {
        setStatus('At least one bar must remain.')
        return current
      }

      return normalizeMeasures(current.slice(0, -1), subdivisionsPerMeasure)
    })

    setActiveItemId(null)
    clearHoverState()
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div>
            <div className="brand-title">Nifty Notes</div>
            <div className="brand-subtitle">
              Interactive grand staff piano composer
            </div>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="primary-pill" onClick={handlePlay} type="button">
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <div className="tempo-control" ref={tempoPanelRef}>
            <button
              aria-expanded={isTempoPanelOpen}
              className={`tempo-chip${isTempoPanelOpen ? ' active' : ''}`}
              onClick={() => setIsTempoPanelOpen((current) => !current)}
              type="button"
            >
              Tempo {tempoBpm} BPM
            </button>
            {isTempoPanelOpen ? (
              <div className="tempo-panel">
                <label className="tempo-panel__field">
                  <span>Tempo</span>
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
                <button
                  className={isMetronomeEnabled ? 'tool active' : 'tool'}
                  onClick={() =>
                    setIsMetronomeEnabled((current) => !current)
                  }
                  type="button"
                >
                  {isMetronomeEnabled ? 'Metronome On' : 'Metronome Off'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="toolbar-wrap">
        <div className="toolbar">
          <div className="tool-group tool-group--duration">
            <span className="group-label">Note Value</span>
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.baseDuration}
                aria-label={option.label}
                className={
                  baseDuration === option.baseDuration
                    ? 'tool tool--glyph active'
                    : 'tool tool--glyph'
                }
                onClick={() => selectDuration(option.baseDuration)}
                title={option.label}
                type="button"
              >
                {buildDurationGlyph(option.baseDuration, false)}
              </button>
            ))}
          </div>

          <div className="tool-group">
            <span className="group-label">Dot</span>
            <button
              aria-label="Toggle dotted value"
              className={dotted ? 'tool tool--glyph active' : 'tool tool--glyph'}
              disabled={!dotEnabled}
              onClick={() => setDotted((current) => !current)}
              title="Dot"
              type="button"
            >
              {buildDurationGlyph(baseDuration, true, 'dot-glyph')}
            </button>
          </div>

          <div className="tool-group">
            <span className="group-label">Action</span>
            <button
              className={mode === 'note' ? 'tool active' : 'tool'}
              onClick={() => setMode('note')}
              type="button"
            >
              Insert Note
            </button>
            <button
              className={mode === 'rest' ? 'tool active' : 'tool'}
              onClick={() => setMode('rest')}
              type="button"
            >
              Insert Rest
            </button>
            <button
              className={mode === 'tie' ? 'tool active' : 'tool'}
              onClick={() => setMode('tie')}
              type="button"
            >
              Tie
            </button>
            <button
              className={mode === 'erase' ? 'tool active' : 'tool'}
              onClick={() => setMode('erase')}
              type="button"
            >
              Erase
            </button>
          </div>

          <div className="tool-group">
            <span className="group-label">Time Signature</span>
            {TIME_SIGNATURE_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={timeSignature === option.value ? 'tool active' : 'tool'}
                onClick={() => changeTimeSignature(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
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
        </div>
      </div>

      <main className="workspace">
        <aside className="sidebar">
          <section className="panel">
            <h2>Current Settings</h2>
            <div className="summary-row">
              <span>Mode</span>
              <strong>
                {mode === 'note' && 'Insert note'}
                {mode === 'rest' && 'Insert rest'}
                {mode === 'tie' && 'Tie'}
                {mode === 'erase' && 'Erase'}
              </strong>
            </div>
            <div className="summary-row">
              <span>Note Value</span>
              <strong>{selectedDurationName}</strong>
            </div>
            <div className="summary-row">
              <span>Time Signature</span>
              <strong>{timeSignature}</strong>
            </div>
            <div className="summary-row">
              <span>Tempo</span>
              <strong>{tempoBpm} BPM</strong>
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
              <span>Bars</span>
              <strong>{measures.length}</strong>
            </div>
          </section>

          <section className="panel panel--status">
            <h2>Status</h2>
            <p className="status-copy">{status}</p>
          </section>

          <section className="panel">
            <h2>What Changed</h2>
            <ul>
              <li>Empty bars stay on the quarter-rest skeleton until you actually write into that beat.</li>
              <li>Active eighth beats now show two eighth-rest slots, while active sixteenth beats start as 16th + 16th + 8th and only split the last rest once the beat gets denser.</li>
              <li>Eighth and sixteenth beats still widen automatically, but with a tighter spacing ratio so the bar grows without stretching too far.</li>
              <li>Treble and bass placeholders only react on the staff and beat you are editing, so shaping the bass no longer scrambles the treble view.</li>
              <li>Clicks now snap to the nearest slot instead of always falling left.</li>
              <li>Hover previews and inserted notes now use the same placement bounds, so half notes and other longer values land where they preview.</li>
              <li>Pitch picking now lines up with the note you actually click.</li>
              <li>Tempo can be adjusted from the top bar, with an optional metronome.</li>
              <li>Playback now shows a vertical playhead across both staves.</li>
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

        <section className="score-stage">
          <div className="score-paper score-paper--empty">
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
                {mode === 'note' && hoverPreview ? (
                  <CursorPreview
                    baseDuration={baseDuration}
                    dotted={dotted}
                    preview={hoverPreview}
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
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
