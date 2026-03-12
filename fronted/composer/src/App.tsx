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
  BASE_DURATION_SUBDIVISIONS,
  BPM,
  DURATION_OPTIONS,
  ERASE_HOVER_COLOR,
  GRAND_STAFF_GAP,
  NOTE_COLOR,
  PIANO_SAMPLE_URLS,
  PLACEHOLDER_COLOR,
  SCORE_PADDING_BOTTOM,
  STAFF_IDS,
  SUBDIVISIONS_PER_BEAT,
  SUBDIVISIONS_PER_MEASURE,
  SYSTEM_GAP_Y,
  SYSTEM_SIDE_PADDING,
  SYSTEM_TOP,
  SYSTEM_WRAP_WIDTH,
  type BaseDuration,
  type EditMode,
  type HoverPreview,
  type MeasureData,
  type MeasureHitBox,
  type NotePitch,
  type ScoreItem,
  type StaffId,
  createMeasure,
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
  getDurationName,
  getDurationSubdivisions,
  getItemSubdivisions,
  getItemsForStaff,
  getPitchLabel,
  itemEnd,
  normalizeMeasures,
  pitchToY,
  rangesOverlap,
  snapSubdivision,
  toTonePitch,
  yToPitch,
} from './composer/score'

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
  noteRegistry: Map<string, StaveNote>,
): StaveNote {
  const note =
    item.kind === 'note'
      ? new StaveNote({
          autoStem: true,
          clef: staffId,
          dots: item.dots,
          duration: item.baseDuration,
          keys: [item.pitch ?? getRestKey(staffId)],
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

  if (item.dots > 0) {
    Dot.buildAndAttach([note], { all: true })
    Dot.getDots(note).forEach((dot) => {
      dot.setStyle({ fillStyle: color, strokeStyle: color })
    })
  }

  styleNote(note, color)

  if (item.kind === 'note') {
    noteRegistry.set(item.id, note)
  }

  return note
}

function createPlaceholder(baseDuration: BaseDuration, staffId: StaffId): StaveNote {
  const placeholder = new StaveNote({
    clef: staffId,
    duration: baseDuration,
    keys: [getRestKey(staffId)],
    type: 'r',
  })

  styleNote(placeholder, PLACEHOLDER_COLOR)
  return placeholder
}

function createAnchorNotes(): GhostNote[] {
  return Array.from({ length: SUBDIVISIONS_PER_MEASURE }, () => new GhostNote('16'))
}

function getPlaceholderDuration(
  items: ScoreItem[],
  subdivision: number,
): BaseDuration {
  const nextStart =
    findNextStartingItem(items, subdivision - 1)?.start ?? SUBDIVISIONS_PER_MEASURE
  const roomUntilNext = nextStart - subdivision
  const roomUntilBeat = SUBDIVISIONS_PER_BEAT - (subdivision % SUBDIVISIONS_PER_BEAT)

  if (
    subdivision % SUBDIVISIONS_PER_BEAT === 0 &&
    roomUntilNext >= 4 &&
    roomUntilBeat >= 4
  ) {
    return 'q'
  }

  if (subdivision % 2 === 0 && roomUntilNext >= 2 && roomUntilBeat >= 2) {
    return '8'
  }

  return '16'
}

function buildStaffVoiceData(
  items: ScoreItem[],
  staffId: StaffId,
  activeItemId: string | null,
  eraseHoverItemId: string | null,
  noteRegistry: Map<string, StaveNote>,
) {
  const notes: StaveNote[] = []
  let subdivision = 0

  while (subdivision < SUBDIVISIONS_PER_MEASURE) {
    const item = findStartingItem(items, subdivision)

    if (item) {
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

    const placeholderDuration = getPlaceholderDuration(items, subdivision)
    notes.push(createPlaceholder(placeholderDuration, staffId))
    subdivision += BASE_DURATION_SUBDIVISIONS[placeholderDuration]
  }

  return {
    anchorNotes: createAnchorNotes(),
    notes,
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

function applyFixedSubdivisionGrid(stave: Stave, anchorNotes: GhostNote[]) {
  const stavePadding = Metrics.get('Stave.padding', 0)
  const usableWidth = stave.getNoteEndX() - stave.getNoteStartX()
  const subdivisionWidth = usableWidth / SUBDIVISIONS_PER_MEASURE

  return anchorNotes.map((note, subdivision) => {
    const relativeX = subdivisionWidth * subdivision + subdivisionWidth / 2
    const absoluteX = stave.getNoteStartX() + stavePadding + relativeX
    note.getTickContext().setX(relativeX)
    return absoluteX
  })
}

function App() {
  const scoreRef = useRef<HTMLDivElement | null>(null)
  const hitBoxesRef = useRef<MeasureHitBox[]>([])
  const pianoRef = useRef<Tone.Sampler | null>(null)
  const pianoLoaderRef = useRef<Promise<Tone.Sampler> | null>(null)
  const playbackTimerRef = useRef<number | null>(null)
  const [measures, setMeasures] = useState<MeasureData[]>(initialMeasures)
  const [mode, setMode] = useState<EditMode>('note')
  const [baseDuration, setBaseDuration] = useState<BaseDuration>('q')
  const [dotted, setDotted] = useState(false)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [eraseHoverItemId, setEraseHoverItemId] = useState<string | null>(null)
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null)
  const [status, setStatus] = useState(
    'Click a note shape, then click either staff to insert on treble or bass.',
  )
  const [isPlaying, setIsPlaying] = useState(false)

  const systems = buildSystems(measures)
  const scoreWidth = SYSTEM_WRAP_WIDTH
  const scoreHeight =
    SYSTEM_TOP +
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

      pianoRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    const host = scoreRef.current
    if (!host) {
      return
    }

    host.innerHTML = ''

    const renderer = new Renderer(host, Renderer.Backends.SVG)
    renderer.resize(scoreWidth, scoreHeight)

    const context = renderer.getContext()
    const noteRegistry = new Map<string, StaveNote>()
    const hitBoxes: MeasureHitBox[] = []

    systems.forEach((system, systemIndex) => {
      let currentX = SYSTEM_SIDE_PADDING
      const trebleY = SYSTEM_TOP + systemIndex * SYSTEM_GAP_Y
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
            trebleStave.addTimeSignature('4/4')
            bassStave.addTimeSignature('4/4')
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
        )
        const bassData = buildStaffVoiceData(
          entry.measure.bassItems,
          'bass',
          activeItemId,
          eraseHoverItemId,
          noteRegistry,
        )

        const trebleVoice = new Voice({ beatValue: 4, numBeats: 4 })
        const bassVoice = new Voice({ beatValue: 4, numBeats: 4 })
        const trebleAnchorVoice = new Voice({ beatValue: 4, numBeats: 4 })
        const bassAnchorVoice = new Voice({ beatValue: 4, numBeats: 4 })

        trebleVoice.addTickables(trebleData.notes).setStave(trebleStave)
        bassVoice.addTickables(bassData.notes).setStave(bassStave)
        trebleAnchorVoice
          .addTickables(trebleData.anchorNotes)
          .setStave(trebleStave)
        bassAnchorVoice.addTickables(bassData.anchorNotes).setStave(bassStave)

        const formatter = new Formatter()
        formatter.joinVoices([trebleVoice, trebleAnchorVoice])
        formatter.joinVoices([bassVoice, bassAnchorVoice])
        formatter.format(
          [trebleVoice, trebleAnchorVoice, bassVoice, bassAnchorVoice],
          trebleStave.getNoteEndX() - trebleStave.getNoteStartX(),
          {
            alignRests: true,
            context,
          },
        )

        const xBySubdivision = applyFixedSubdivisionGrid(
          trebleStave,
          trebleData.anchorNotes,
        )

        bassData.anchorNotes.forEach((note, subdivision) => {
          const relativeX =
            xBySubdivision[subdivision] -
            bassStave.getNoteStartX() -
            Metrics.get('Stave.padding', 0)
          note.getTickContext().setX(relativeX)
        })

        const trebleBeams = Beam.generateBeams(trebleData.notes, {
          beamRests: false,
          groups: [new Fraction(1, 4)],
        })
        const bassBeams = Beam.generateBeams(bassData.notes, {
          beamRests: false,
          groups: [new Fraction(1, 4)],
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
          xBySubdivision,
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
          xBySubdivision,
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

          const next = findNextContiguousItem(measures, measureIndex, staffId, item)
          if (!next || next.item.kind !== 'note' || item.pitch !== next.item.pitch) {
            return
          }

          const firstNote = noteRegistry.get(item.id)
          const lastNote = noteRegistry.get(next.item.id)

          if (!firstNote || !lastNote) {
            return
          }

          new StaveTie({
            firstIndexes: [0],
            firstNote,
            lastIndexes: [0],
            lastNote,
          })
            .setContext(context)
            .draw()
        })
      })
    })

    hitBoxesRef.current = hitBoxes
  }, [activeItemId, eraseHoverItemId, measures, scoreHeight, scoreWidth, systems])

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

  function clearHoverState() {
    setHoverPreview(null)
    setEraseHoverItemId(null)
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
      const normalized = normalizeMeasures(draft)

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
      const piano = await ensurePiano()
      piano.triggerAttackRelease(toTonePitch(pitch), 0.45, Tone.now())
    } catch {
      setStatus('Piano samples could not be loaded.')
    }
  }

  function insertAtPosition(
    measureIndex: number,
    staffId: StaffId,
    rawSubdivision: number,
    pitch: NotePitch,
    kind: 'note' | 'rest',
  ) {
    const start = snapSubdivision(rawSubdivision, baseDuration, dotted)
    const length = getDurationSubdivisions(baseDuration, dotted)

    mutateMeasures((draft) => {
      const items = getItemsForStaff(draft[measureIndex], staffId)
      const end = start + length
      const filtered = items.filter(
        (item) => !rangesOverlap(item.start, itemEnd(item), start, end),
      )

      const inserted: ScoreItem = {
        baseDuration,
        dots: dotted ? 1 : 0,
        id: crypto.randomUUID(),
        kind,
        pitch: kind === 'note' ? pitch : undefined,
        start,
      }

      filtered.push(inserted)

      if (staffId === 'treble') {
        draft[measureIndex].trebleItems = filtered
      } else {
        draft[measureIndex].bassItems = filtered
      }

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

      const filtered = items.filter((item) => item.id !== target.id)
      if (staffId === 'treble') {
        draft[measureIndex].trebleItems = filtered
      } else {
        draft[measureIndex].bassItems = filtered
      }

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
          status: 'Tie mode requires an existing note.',
        }
      }

      const next = findNextContiguousItem(draft, measureIndex, staffId, target)

      if (!next || next.item.kind !== 'note') {
        return {
          activeItemId: target.id,
          status: 'There is no contiguous note after this one.',
        }
      }

      if (next.item.pitch !== target.pitch) {
        return {
          activeItemId: target.id,
          status: 'This prototype only ties notes with the same pitch.',
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
    const snappedSubdivision = snapSubdivision(rawSubdivision, baseDuration, dotted)
    const previewX =
      hitBox.xBySubdivision[snappedSubdivision] ?? hitBox.xBySubdivision[0] ?? hitBox.left
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
      hitBox,
      pitch,
      previewX,
      previewY,
      rawSubdivision,
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

    if (mode === 'note') {
      setHoverPreview({
        pitch: pointerTarget.pitch,
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

      if (playbackTimerRef.current !== null) {
        window.clearTimeout(playbackTimerRef.current)
        playbackTimerRef.current = null
      }

      setIsPlaying(false)
      setStatus('Playback stopped.')
      return
    }

    const notes = buildPlaybackNotes(measures)
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

    const startTime = Tone.now() + 0.08
    let totalDuration = 0

    notes.forEach((segment) => {
      piano.triggerAttackRelease(
        segment.note,
        segment.durationSeconds * 0.96,
        startTime + segment.startSeconds,
      )

      totalDuration = Math.max(
        totalDuration,
        segment.startSeconds + segment.durationSeconds,
      )
    })

    if (playbackTimerRef.current !== null) {
      window.clearTimeout(playbackTimerRef.current)
    }

    playbackTimerRef.current = window.setTimeout(() => {
      setIsPlaying(false)
      playbackTimerRef.current = null
    }, (totalDuration + 0.3) * 1000)

    setIsPlaying(true)
    setStatus('Playing the grand staff with piano samples.')
  }

  function selectDuration(nextDuration: BaseDuration) {
    setBaseDuration(nextDuration)

    if (!canUseDot(nextDuration)) {
      setDotted(false)
    }
  }

  function addMeasure() {
    setMeasures((current) => [
      ...current,
      createMeasure(`measure-${current.length + 1}`),
    ])
    setStatus('Added one bar. The layout will wrap to a new system automatically.')
  }

  function removeMeasure() {
    setMeasures((current) => {
      if (current.length === 1) {
        setStatus('At least one bar must remain.')
        return current
      }

      return normalizeMeasures(current.slice(0, -1))
    })

    setActiveItemId(null)
    clearHoverState()
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">///</div>
          <div>
            <div className="brand-title">Composer Prototype</div>
            <div className="brand-subtitle">
              VexFlow + Tone.js / Grand staff piano editor
            </div>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="primary-pill" onClick={handlePlay} type="button">
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <div className="tempo-chip">Piano · ♩ = {BPM}</div>
        </div>
      </header>

      <div className="toolbar-wrap">
        <div className="toolbar">
          <div className="tool-group tool-group--duration">
            <span className="group-label">Duration</span>
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.baseDuration}
                aria-label={option.label}
                className={
                  baseDuration === option.baseDuration ? 'tool tool--glyph active' : 'tool tool--glyph'
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
            <span className="group-label">Modifier</span>
            <button
              aria-label="Dotted"
              className={dotted ? 'tool tool--glyph active' : 'tool tool--glyph'}
              disabled={!dotEnabled}
              onClick={() => setDotted((current) => !current)}
              title="Dotted"
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
              <span>Duration</span>
              <strong>{selectedDurationName}</strong>
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

          <section className="panel">
            <h2>What Changed</h2>
            <ul>
              <li>Treble and bass now have separate editable note data.</li>
              <li>Bar wrapping is automatic when a system gets too wide.</li>
              <li>Hover preview now uses rendered 16th-note anchors.</li>
              <li>Insert and preview positions are snapped to the same x map.</li>
            </ul>
          </section>

          <section className="panel">
            <h2>Interaction Notes</h2>
            <ul>
              <li>Click the upper staff for treble notes and the lower for bass.</li>
              <li>Erase mode highlights exactly what will be removed.</li>
              <li>Empty areas still render placeholder rests to preserve spacing.</li>
            </ul>
          </section>
        </aside>

        <section className="score-stage">
          <div className="score-paper">
            <div className="score-heading">
              <div>
                <div className="eyebrow">Piano Composer Demo</div>
                <h1>My Score</h1>
              </div>
              <div className="status-box">{status}</div>
            </div>

            <div className="score-viewport">
              <div
                className="score-surface"
                style={{ height: `${scoreHeight}px`, width: `${scoreWidth}px` }}
              >
                <div className="score-canvas" ref={scoreRef} />
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

            <div className="footer-note">
              Measure wrapping is automatic. When you add bars, the layout starts a
              new piano system as soon as the current one runs out of room.
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
