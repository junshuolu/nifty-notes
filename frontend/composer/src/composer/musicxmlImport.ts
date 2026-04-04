/**
 * MusicXML → Nifty Notes 内部小节结构（钢琴双谱表）。
 * 支持本应用导出的 score-partwise、常见 MuseScore 文件；不展开 .mxl（ZIP）。
 */

import {
  STAFF_IDS,
  type AccidentalType,
  type BaseDuration,
  type KeySignatureSpec,
  type MeasureData,
  type NoteItem,
  type NotePitch,
  type RenderDuration,
  type RestItem,
  type ScoreItem,
  type StaffId,
  type TimeSignature,
  generateId,
} from './constants'
import {
  getDurationSubdivisions,
  getItemsForStaff,
  getMeasureSubdivisions,
  itemEnd,
  normalizeMeasures,
} from './score'

const FIFTHS_TO_KEY: Record<number, KeySignatureSpec> = {
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
  [-1]: 'F',
  [-2]: 'Bb',
  [-3]: 'Eb',
  [-4]: 'Ab',
  [-5]: 'Db',
  [-6]: 'Gb',
  [-7]: 'Cb',
}

export type MusicXMLImportResult = {
  measures: MeasureData[]
  timeSignature: TimeSignature
  keySignature: KeySignatureSpec
  tempoBpm: number
  title?: string
  subtitle?: string
  composer?: string
  lyricist?: string
  arranger?: string
  error?: string
  warnings?: string[]
}

function childElements(parent: Element, localName: string): Element[] {
  return [...parent.children].filter((c) => c.localName === localName)
}

function firstChildTextInt(parent: Element | null, localName: string, fallback: number): number {
  if (!parent) return fallback
  const el = [...parent.children].find((c) => c.localName === localName)
  const n = parseInt(el?.textContent?.trim() ?? '', 10)
  return Number.isFinite(n) ? n : fallback
}

function elementTextInt(el: Element | null, fallback: number): number {
  if (!el) return fallback
  const n = parseInt(el.textContent?.trim() ?? '', 10)
  return Number.isFinite(n) ? n : fallback
}

function findDescendantLocal(root: Element, localName: string): Element | null {
  if (root.localName === localName) return root
  for (const c of root.children) {
    const hit = findDescendantLocal(c, localName)
    if (hit) return hit
  }
  return null
}

function findScoreRoot(doc: Document): Element | null {
  const root = doc.documentElement
  if (!root) return null
  const ln = root.localName
  if (ln === 'score-partwise' || ln === 'score-timewise') return root
  const sp = doc.getElementsByTagName('score-partwise')[0]
  if (sp) return sp
  const st = doc.getElementsByTagName('score-timewise')[0]
  return st ?? null
}

function collectParts(scoreRoot: Element): Element[] {
  const out: Element[] = []
  const walk = (el: Element) => {
    if (el.localName === 'part') out.push(el)
    for (const c of el.children) walk(c)
  }
  walk(scoreRoot)
  return out
}

function pickPianoPart(parts: Element[]): Element | null {
  const byId = parts.find((p) => (p.getAttribute('id') ?? '').toUpperCase() === 'P1')
  if (byId) return byId
  return parts[0] ?? null
}

function extractMetadata(scoreRoot: Element): {
  title?: string
  subtitle?: string
  composer?: string
  lyricist?: string
  arranger?: string
} {
  let title: string | undefined
  let subtitle: string | undefined
  const creators: Record<string, string> = {}

  const work = findDescendantLocal(scoreRoot, 'work')
  if (work) {
    const wt = childElements(work, 'work-title')[0]
    if (wt?.textContent?.trim()) title = wt.textContent.trim()
    const mt = childElements(work, 'movement-title')[0]
    if (mt?.textContent?.trim()) subtitle = mt.textContent.trim()
  }

  const ident = findDescendantLocal(scoreRoot, 'identification')
  if (ident) {
    for (const c of ident.children) {
      if (c.localName !== 'creator') continue
      const type = (c.getAttribute('type') ?? 'composer').toLowerCase()
      const text = c.textContent?.trim()
      if (!text) continue
      if (type === 'composer') creators.composer = text
      else if (type === 'lyricist') creators.lyricist = text
      else if (type === 'arranger') creators.arranger = text
    }
  }

  if (!title) {
    const wt = scoreRoot.getElementsByTagName('work-title')[0]
    if (wt?.textContent?.trim()) title = wt.textContent.trim()
  }

  return {
    title,
    subtitle,
    composer: creators.composer,
    lyricist: creators.lyricist,
    arranger: creators.arranger,
  }
}

function measureXmlDuration(beats: number, beatType: number, divisions: number): number {
  if (beatType <= 0) return divisions * 4
  return Math.round((beats * 4 * divisions) / beatType)
}

function xmlDivToAppSubdiv(xmlDur: number, divisionsPerQuarter: number): number {
  if (divisionsPerQuarter <= 0) return 0
  return Math.round((xmlDur * 8) / divisionsPerQuarter)
}

function nearestWrittenDuration(
  appSubdiv: number,
): { baseDuration: RenderDuration; dots: 0 | 1 } {
  const options: Array<{ baseDuration: RenderDuration; dots: 0 | 1; len: number }> = []
  const bases: RenderDuration[] = ['w', 'h', 'q', '8', '16', '32']
  for (const baseDuration of bases) {
    for (const dots of [0, 1] as const) {
      if (baseDuration === '32' && dots === 1) continue
      const len = getDurationSubdivisions(baseDuration, dots === 1)
      options.push({ baseDuration, dots, len })
    }
  }
  let best = options[0]!
  let bestDiff = Math.abs(best.len - appSubdiv)
  for (const o of options) {
    const d = Math.abs(o.len - appSubdiv)
    if (d < bestDiff) {
      best = o
      bestDiff = d
    }
  }
  return { baseDuration: best.baseDuration, dots: best.dots }
}

/** 音高字符串里已带升降（如 bb、c#），则 Vex 会从 key 显示，勿再叠加 VFAccidental */
function pitchKeyShowsAccidental(pitch: NotePitch): boolean {
  const tok = (pitch.split('/')[0] ?? '').toLowerCase()
  if (tok.length < 2) return false
  return /[#b]/.test(tok.slice(1))
}

function musicXmlPitchToVex(
  step: string,
  alter: number,
  octave: number,
): { pitch: NotePitch; accidental?: AccidentalType } {
  const s = step.trim().toLowerCase().slice(0, 1)
  if (alter === 0) return { pitch: `${s}/${octave}` }
  if (alter === 1) return { pitch: `${s}#/${octave}`, accidental: '#' }
  if (alter === -1) {
    if (s === 'b') return { pitch: `bb/${octave}`, accidental: 'b' }
    return { pitch: `${s}b/${octave}`, accidental: 'b' }
  }
  if (alter === 2) return { pitch: `${s}##/${octave}`, accidental: '#' }
  if (alter === -2) {
    if (s === 'b') return { pitch: `bbb/${octave}`, accidental: 'b' }
    return { pitch: `${s}bb/${octave}`, accidental: 'b' }
  }
  return { pitch: `${s}/${octave}` }
}

function parseAccidental(noteEl: Element): AccidentalType | undefined {
  const acc = childElements(noteEl, 'accidental')[0]
  if (!acc) return undefined
  const v = acc.textContent?.trim().toLowerCase() ?? ''
  if (v === 'sharp' || v === 'sharp-1') return '#'
  if (v === 'flat' || v === 'flat-1') return 'b'
  if (v === 'natural') return 'n'
  return undefined
}

function hasTie(noteEl: Element, type: 'start' | 'stop'): boolean {
  for (const c of noteEl.children) {
    if (c.localName === 'tie' && c.getAttribute('type') === type) return true
  }
  const notations = childElements(noteEl, 'notations')[0]
  if (notations) {
    for (const c of notations.children) {
      if (c.localName === 'tied' && c.getAttribute('type') === type) return true
    }
  }
  return false
}

function parseLyric(noteEl: Element): string | undefined {
  const lyric = childElements(noteEl, 'lyric')[0]
  if (!lyric) return undefined
  const text = findDescendantLocal(lyric, 'text')
  const t = text?.textContent?.trim()
  return t || undefined
}

function applyAttributes(
  attrEl: Element,
  state: { divisions: number; beats: number; beatType: number; fifths: number; staves: number },
) {
  for (const c of attrEl.children) {
    if (c.localName === 'divisions') {
      const v = elementTextInt(c, 0)
      if (v > 0) state.divisions = v
    } else if (c.localName === 'time') {
      const b = firstChildTextInt(c, 'beats', state.beats)
      const bt = firstChildTextInt(c, 'beat-type', state.beatType)
      if (b > 0) state.beats = b
      if (bt > 0) state.beatType = bt
    } else if (c.localName === 'key') {
      const f = firstChildTextInt(c, 'fifths', state.fifths)
      state.fifths = f
    } else if (c.localName === 'staves') {
      const s = elementTextInt(c, 2)
      if (s > 0) state.staves = s
    }
  }
}

function parseNoteElement(
  noteEl: Element,
  ctx: {
    divisions: number
    beats: number
    beatType: number
    posXml: number
    lastNonChordStartXml: number
  },
): {
  staff: 1 | 2
  startXml: number
  durationXml: number
  rest: boolean
  chord: boolean
  dots: 0 | 1
  vexPitch?: NotePitch
  accidental?: AccidentalType
  tieStart: boolean
  tieStop: boolean
  lyrics?: string
} | null {
  if (childElements(noteEl, 'grace').length > 0) return null

  const chord = childElements(noteEl, 'chord').length > 0
  const restEl = childElements(noteEl, 'rest')[0]
  const isRest = !!restEl
  const measureRest = restEl?.getAttribute('measure') === 'yes'

  let durationXml = elementTextInt(childElements(noteEl, 'duration')[0], 0)
  if (measureRest) {
    durationXml = measureXmlDuration(ctx.beats, ctx.beatType, ctx.divisions)
  }
  if (durationXml <= 0) return null

  const staffNum = firstChildTextInt(noteEl, 'staff', 1)
  const staff: 1 | 2 = staffNum >= 2 ? 2 : 1

  const dots = childElements(noteEl, 'dot').length > 0 ? 1 : 0

  const startXml = chord ? ctx.lastNonChordStartXml : ctx.posXml
  if (!chord) {
    ctx.lastNonChordStartXml = ctx.posXml
    ctx.posXml += durationXml
  }

  const tieStart = hasTie(noteEl, 'start')
  const tieStop = hasTie(noteEl, 'stop')
  const lyrics = parseLyric(noteEl)

  if (isRest) {
    return {
      staff,
      startXml,
      durationXml,
      rest: true,
      chord,
      dots,
      tieStart: false,
      tieStop: false,
      lyrics,
    }
  }

  const pitchEl = childElements(noteEl, 'pitch')[0]
  if (!pitchEl) return null
  const step = childElements(pitchEl, 'step')[0]?.textContent?.trim() ?? 'C'
  const octave = firstChildTextInt(pitchEl, 'octave', 4)
  const alter = firstChildTextInt(pitchEl, 'alter', 0)
  const accFromXml = parseAccidental(noteEl)
  const { pitch, accidental } = musicXmlPitchToVex(step, alter, octave)
  const accidentalOut = accFromXml ?? accidental

  return {
    staff,
    startXml,
    durationXml,
    rest: false,
    chord,
    dots,
    vexPitch: pitch,
    accidental: accidentalOut,
    tieStart,
    tieStop,
    lyrics,
  }
}

function pushOrMergeNote(items: ScoreItem[], note: NoteItem) {
  const last = items[items.length - 1]
  if (
    last?.kind === 'note' &&
    last.start === note.start &&
    note.pitches.length > 0
  ) {
    const ln = last as NoteItem
    ln.pitches = [...ln.pitches, ...note.pitches]
    if (note.accidentals) {
      ln.accidentals = { ...ln.accidentals, ...note.accidentals }
    }
    if (note.tieToNext) ln.tieToNext = true
    if (note.lyrics && !ln.lyrics) ln.lyrics = note.lyrics
    return
  }
  items.push(note)
}

function toScoreItem(
  parsed: NonNullable<ReturnType<typeof parseNoteElement>>,
  divisions: number,
): NoteItem | RestItem | null {
  const appStart = xmlDivToAppSubdiv(parsed.startXml, divisions)
  const appDurRaw = xmlDivToAppSubdiv(parsed.durationXml, divisions)
  const { baseDuration, dots } = nearestWrittenDuration(Math.max(1, appDurRaw))

  if (parsed.rest) {
    const r: RestItem = {
      id: generateId(),
      kind: 'rest',
      baseDuration: baseDuration as BaseDuration,
      dots,
      start: appStart,
    }
    return r
  }

  if (!parsed.vexPitch) return null

  let acc: Record<string, AccidentalType> | undefined
  if (parsed.accidental) {
    if (parsed.accidental === 'n') {
      acc = { [parsed.vexPitch]: 'n' }
    } else if (!pitchKeyShowsAccidental(parsed.vexPitch)) {
      acc = { [parsed.vexPitch]: parsed.accidental }
    }
  }

  const n: NoteItem = {
    id: generateId(),
    kind: 'note',
    baseDuration: baseDuration as BaseDuration,
    dots,
    start: appStart,
    pitches: [parsed.vexPitch],
    accidentals: acc,
    tieToNext: parsed.tieStart,
    lyrics: parsed.lyrics,
  }
  return n
}

function resolveTies(measures: MeasureData[], subdivisionsPerMeasure: number) {
  const walkStaff = (staff: StaffId) => {
    for (let mi = 0; mi < measures.length; mi++) {
      const items = getItemsForStaff(measures[mi], staff)
      const notes = items
        .filter((i): i is NoteItem => i.kind === 'note')
        .sort((a, b) => a.start - b.start)

      for (let i = 0; i < notes.length; i++) {
        const a = notes[i]!
        if (!a.tieToNext) continue
        const aEnd = itemEnd(a)
        let target: NoteItem | null = null
        if (aEnd < subdivisionsPerMeasure) {
          target = notes.find((n) => n.start === aEnd && pitchesEqual(a.pitches, n.pitches)) ?? null
        } else if (mi + 1 < measures.length) {
          const nextItems = getItemsForStaff(measures[mi + 1]!, staff)
          const nextNotes = nextItems.filter((x): x is NoteItem => x.kind === 'note')
          target = nextNotes.find((n) => n.start === 0 && pitchesEqual(a.pitches, n.pitches)) ?? null
        }
        if (!target) {
          a.tieToNext = false
        }
      }
    }
  }
  STAFF_IDS.forEach(walkStaff)
}

function pitchesEqual(a: NotePitch[], b: NotePitch[]): boolean {
  if (a.length !== b.length) return false
  return a.every((p, i) => p === b[i])
}

function extractSoundTempo(measureEl: Element): number | null {
  for (const c of measureEl.children) {
    if (c.localName === 'sound') {
      const t = c.getAttribute('tempo')
      if (t) {
        const n = parseFloat(t)
        if (Number.isFinite(n) && n > 0) return Math.round(n)
      }
    }
    if (c.localName === 'direction') {
      const sound = findDescendantLocal(c, 'sound')
      const t = sound?.getAttribute('tempo')
      if (t) {
        const n = parseFloat(t)
        if (Number.isFinite(n) && n > 0) return Math.round(n)
      }
    }
  }
  return null
}

export function importMusicXML(xmlString: string): MusicXMLImportResult {
  const warnings: string[] = []
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml')
  const perr = doc.querySelector('parsererror')
  if (perr) {
    return { error: 'Invalid XML', measures: [], timeSignature: '4/4', keySignature: 'C', tempoBpm: 80 }
  }

  const scoreRoot = findScoreRoot(doc)
  if (!scoreRoot) {
    return { error: 'No MusicXML score root found', measures: [], timeSignature: '4/4', keySignature: 'C', tempoBpm: 80 }
  }

  if (scoreRoot.localName === 'score-timewise') {
    return {
      error: 'score-timewise is not supported (convert to partwise or re-export)',
      measures: [],
      timeSignature: '4/4',
      keySignature: 'C',
      tempoBpm: 80,
    }
  }

  const meta = extractMetadata(scoreRoot)
  const parts = collectParts(scoreRoot)
  const part = pickPianoPart(parts)
  if (!part) {
    return { error: 'No <part> elements found', measures: [], timeSignature: '4/4', keySignature: 'C', tempoBpm: 80 }
  }

  const state = {
    divisions: 32,
    beats: 4,
    beatType: 4,
    fifths: 0,
    staves: 2,
  }

  let tempoBpm = 80
  let sawMeterInFile = false
  const rawMeasures: Array<{ treble: ScoreItem[]; bass: ScoreItem[] }> = []

  const measureEls = [...part.children].filter((c) => c.localName === 'measure')
  if (measureEls.length === 0) {
    return { error: 'No measures in part', measures: [], timeSignature: '4/4', keySignature: 'C', tempoBpm: 80 }
  }

  for (const measureEl of measureEls) {
    const treble: ScoreItem[] = []
    const bass: ScoreItem[] = []

    const ctx = {
      divisions: state.divisions,
      beats: state.beats,
      beatType: state.beatType,
      posXml: 0,
      lastNonChordStartXml: 0,
    }

    for (const child of measureEl.children) {
      if (child.localName === 'attributes') {
        applyAttributes(child, state)
        ctx.divisions = state.divisions
        ctx.beats = state.beats
        ctx.beatType = state.beatType
        if (childElements(child, 'time').length > 0) sawMeterInFile = true
        continue
      }

      if (child.localName === 'backup') {
        const d = elementTextInt(child, 0)
        ctx.posXml -= d
        continue
      }

      if (child.localName === 'forward') {
        const d = elementTextInt(child, 0)
        ctx.posXml += d
        continue
      }

      if (child.localName === 'note') {
        ctx.divisions = state.divisions
        const parsed = parseNoteElement(child, ctx)
        if (!parsed) continue
        const item = toScoreItem(parsed, state.divisions)
        if (!item) continue

        const target = parsed.staff === 1 ? treble : bass
        if (item.kind === 'note') {
          pushOrMergeNote(target, item)
        } else {
          target.push(item)
        }
        continue
      }
    }

    const t0 = extractSoundTempo(measureEl)
    if (t0 != null) tempoBpm = t0

    rawMeasures.push({ treble, bass })
  }

  if (state.divisions < 1) state.divisions = 32

  const timeSignature: TimeSignature = `${state.beats}/${state.beatType}` as TimeSignature
  const keySignature = FIFTHS_TO_KEY[state.fifths] ?? 'C'
  const subdivisionsPerMeasure = getMeasureSubdivisions(timeSignature)

  const measures: MeasureData[] = rawMeasures.map((raw) => ({
    id: generateId(),
    tempoBpm: null,
    trebleItems: raw.treble,
    bassItems: raw.bass,
  }))

  resolveTies(measures, subdivisionsPerMeasure)
  const normalized = normalizeMeasures(measures, subdivisionsPerMeasure)

  if (!sawMeterInFile) {
    warnings.push('No explicit time signature in file; assumed 4/4 until first attributes.')
  }

  return {
    measures: normalized,
    timeSignature,
    keySignature,
    tempoBpm,
    title: meta.title,
    subtitle: meta.subtitle,
    composer: meta.composer,
    lyricist: meta.lyricist,
    arranger: meta.arranger,
    warnings: warnings.length ? warnings : undefined,
  }
}
