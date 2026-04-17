import { DOMParser } from '@xmldom/xmldom'

const STAFF_IDS = ['treble', 'bass']
const BASE_DURATION_SUBDIVISIONS = {
  '32': 1,
  '16': 2,
  '8': 4,
  h: 16,
  q: 8,
  w: 32,
}

const KEY_SIGNATURE_TO_FIFTHS = {
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
  Gb: -6,
  G: 1,
}

const KEY_BY_FIFTHS = {
  '-7': 'Cb',
  '-6': 'Gb',
  '-5': 'Db',
  '-4': 'Ab',
  '-3': 'Eb',
  '-2': 'Bb',
  '-1': 'F',
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
}

const LETTER_TO_SEMITONE = {
  a: 9,
  b: 11,
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
}
const SHARP_ORDER = ['f', 'c', 'g', 'd', 'a', 'e', 'b']
const FLAT_ORDER = ['b', 'e', 'a', 'd', 'g', 'c', 'f']

const MUSICXML_DIVISIONS = 8
const MUSICXML_TYPE_BY_DURATION = {
  '8': 'eighth',
  '16': '16th',
  '32': '32nd',
  h: 'half',
  q: 'quarter',
  w: 'whole',
}

const MUSICXML_DURATION_CHOICES = [
  { baseDuration: 'w', dots: 1, subdivisions: 48 },
  { baseDuration: 'w', dots: 0, subdivisions: 32 },
  { baseDuration: 'h', dots: 1, subdivisions: 24 },
  { baseDuration: 'h', dots: 0, subdivisions: 16 },
  { baseDuration: 'q', dots: 1, subdivisions: 12 },
  { baseDuration: 'q', dots: 0, subdivisions: 8 },
  { baseDuration: '8', dots: 1, subdivisions: 6 },
  { baseDuration: '8', dots: 0, subdivisions: 4 },
  { baseDuration: '16', dots: 1, subdivisions: 3 },
  { baseDuration: '16', dots: 0, subdivisions: 2 },
  { baseDuration: '32', dots: 0, subdivisions: 1 },
]

const DURATION_BY_SIGNATURE = {
  'whole:0': { baseDuration: 'w', dots: 0, subdivisions: 32 },
  'whole:1': { baseDuration: 'w', dots: 1, subdivisions: 48 },
  'half:0': { baseDuration: 'h', dots: 0, subdivisions: 16 },
  'half:1': { baseDuration: 'h', dots: 1, subdivisions: 24 },
  'quarter:0': { baseDuration: 'q', dots: 0, subdivisions: 8 },
  'quarter:1': { baseDuration: 'q', dots: 1, subdivisions: 12 },
  'eighth:0': { baseDuration: '8', dots: 0, subdivisions: 4 },
  'eighth:1': { baseDuration: '8', dots: 1, subdivisions: 6 },
  '16th:0': { baseDuration: '16', dots: 0, subdivisions: 2 },
  '16th:1': { baseDuration: '16', dots: 1, subdivisions: 3 },
  '32nd:0': { baseDuration: '32', dots: 0, subdivisions: 1 },
}

const SUBDIVISION_TO_DURATION = {
  1: { baseDuration: '32', dots: 0 },
  2: { baseDuration: '16', dots: 0 },
  3: { baseDuration: '16', dots: 1 },
  4: { baseDuration: '8', dots: 0 },
  6: { baseDuration: '8', dots: 1 },
  8: { baseDuration: 'q', dots: 0 },
  12: { baseDuration: 'q', dots: 1 },
  16: { baseDuration: 'h', dots: 0 },
  24: { baseDuration: 'h', dots: 1 },
  32: { baseDuration: 'w', dots: 0 },
  48: { baseDuration: 'w', dots: 1 },
}

const SUPPORTED_SUBDIVISION_VALUES = Object.keys(SUBDIVISION_TO_DURATION)
  .map((value) => Number(value))
  .sort((left, right) => right - left)

const ACCIDENTAL_MAP = {
  flat: 'b',
  natural: 'n',
  sharp: '#',
}

const ARTICULATION_TO_MUSICXML = {
  accent: 'accent',
  marcato: 'strong-accent type="up"',
  portato: 'detached-legato',
  staccatissimo: 'staccatissimo',
  staccato: 'staccato',
  tenuto: 'tenuto',
}

const ARTICULATION_MAP = {
  accent: 'accent',
  'detached-legato': 'portato',
  staccatissimo: 'staccatissimo',
  staccato: 'staccato',
  'strong-accent': 'marcato',
  tenuto: 'tenuto',
}

const ORNAMENT_TO_MUSICXML = {
  mordent: 'mordent',
  mordentInverted: 'inverted-mordent',
  trill: 'trill-mark',
  turn: 'turn',
  turnInverted: 'inverted-turn',
}

const ORNAMENT_MAP = {
  'inverted-mordent': 'mordentInverted',
  'inverted-turn': 'turnInverted',
  mordent: 'mordent',
  'trill-mark': 'trill',
  turn: 'turn',
}

const DYNAMIC_TAGS = new Set(['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz', 'fz', 'fp', 'pf'])
const SUPPORTED_TIME_SIGNATURE_DENOMINATORS = new Set([2, 4, 8, 16])

let idCounter = 0

function nextId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now()}-${idCounter}`
}

function escapeXml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function getSafeScoreFilename(name, extension) {
  const safeName = String(name || '')
    .replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u4e00-\u9fff ]/g, '_')
    .trim() || 'score'
  return `${safeName}.${extension}`
}

function getDefaultGrouping(numerator, denominator) {
  if (denominator === 8 && numerator > 3) {
    if (numerator % 3 === 0) {
      return Array.from({ length: numerator / 3 }, () => 3)
    }
    if (numerator === 5) return [2, 3]
    if (numerator === 7) return [2, 2, 3]

    const groups = []
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

function normalizeGrouping(numerator, denominator, groupingOverride) {
  if (
    Array.isArray(groupingOverride) &&
    groupingOverride.length > 0 &&
    groupingOverride.every((value) => Number.isInteger(value) && value > 0) &&
    groupingOverride.reduce((sum, value) => sum + value, 0) === numerator
  ) {
    return groupingOverride
  }

  return getDefaultGrouping(numerator, denominator)
}

function parseEditorTimeSignature(timeSignature, groupingOverride) {
  const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(timeSignature)
  const numerator = Math.max(1, Number(match?.[1] ?? 4))
  const parsedDenominator = Number(match?.[2] ?? 4)
  const denominator = SUPPORTED_TIME_SIGNATURE_DENOMINATORS.has(parsedDenominator)
    ? parsedDenominator
    : 4
  const grouping = normalizeGrouping(numerator, denominator, groupingOverride)
  const subdivisionUnit = BASE_DURATION_SUBDIVISIONS.w / denominator
  const groupSubdivisionLengths = grouping.map((value) => value * subdivisionUnit)

  return {
    denominator,
    groupSubdivisionLengths,
    grouping,
    numerator,
    subdivisionsPerMeasure: groupSubdivisionLengths.reduce((sum, value) => sum + value, 0),
  }
}

function getItemsForStaff(measure, staffId) {
  return staffId === 'treble' ? measure.trebleItems : measure.bassItems
}

function getItemSubdivisions(item) {
  const base = BASE_DURATION_SUBDIVISIONS[item.baseDuration]
  if (item.dots !== 1 || item.baseDuration === '32') {
    return base
  }
  return base + Math.floor(base / 2)
}

function itemEnd(item) {
  return item.start + getItemSubdivisions(item)
}

function findStartingItem(items, subdivision) {
  return items.find((item) => item.start === subdivision)
}

function findNextContiguousItem(measures, measureIndex, staffId, item, subdivisionsPerMeasure) {
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

  const nextItem = findStartingItem(getItemsForStaff(nextMeasure, staffId), 0)
  return nextItem ? { item: nextItem, measureIndex: measureIndex + 1 } : null
}

function parsePitchToken(pitch) {
  const [noteToken = 'c', octave = '4'] = String(pitch).split('/')
  const token = noteToken.trim().toLowerCase()
  const match = /^([a-g])(##|#|bbb|bb|b|n)?$/i.exec(token)
  const letter = (match?.[1] ?? token[0] ?? 'c').toLowerCase()
  const suffix = match?.[2] ?? ''

  let xmlAlter = 0
  if (suffix === '##') xmlAlter = 2
  else if (suffix === '#') xmlAlter = 1
  else if (suffix === 'bbb' || suffix === 'bb') xmlAlter = -2
  else if (suffix === 'b') xmlAlter = -1

  return {
    letter,
    octave,
    xmlAlter,
  }
}

function getAccidentalAlter(accidental) {
  if (accidental === '##') return 2
  if (accidental === '#') return 1
  if (accidental === 'bb') return -2
  if (accidental === 'b') return -1
  if (accidental === 'n') return 0
  return null
}

function getKeySignatureAlterForLetter(keySignature, letter) {
  const fifths = KEY_SIGNATURE_TO_FIFTHS[keySignature] ?? 0

  if (fifths > 0 && SHARP_ORDER.slice(0, fifths).includes(letter)) {
    return 1
  }

  if (fifths < 0 && FLAT_ORDER.slice(0, Math.abs(fifths)).includes(letter)) {
    return -1
  }

  return 0
}

function getEffectiveAlterForPitch(pitch, accidental, keySignature = 'C') {
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

function getDisplayAccidentalForPitch(pitch, accidental, keySignature = 'C') {
  if (accidental) {
    return accidental
  }

  const parsed = parsePitchToken(pitch)
  const keyAlter = getKeySignatureAlterForLetter(keySignature, parsed.letter)
  const effectiveAlter = getEffectiveAlterForPitch(pitch, accidental, keySignature)

  if (effectiveAlter === keyAlter) {
    return null
  }

  if (effectiveAlter === 2) return '##'
  if (effectiveAlter === 1) return '#'
  if (effectiveAlter === 0) return 'n'
  if (effectiveAlter === -1) return 'b'
  if (effectiveAlter === -2) return 'bb'
  return null
}

function getMidiForPitch(pitch, accidental, keySignature = 'C') {
  const { letter, octave } = parsePitchToken(pitch)
  return ((Number(octave) + 1) * 12) + LETTER_TO_SEMITONE[letter] + getEffectiveAlterForPitch(pitch, accidental, keySignature)
}

function haveSameNotePitches(left, right, keySignature = 'C') {
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

function splitSubdivisions(subdivisions) {
  let remaining = subdivisions
  const chunks = []

  for (const choice of MUSICXML_DURATION_CHOICES) {
    while (remaining >= choice.subdivisions) {
      chunks.push({ baseDuration: choice.baseDuration, dots: choice.dots })
      remaining -= choice.subdivisions
    }
  }

  if (remaining !== 0) {
    throw new Error(`Cannot encode a ${subdivisions}-subdivision span as MusicXML with the current duration set.`)
  }

  return chunks
}

function getGroupBoundaryAfter(subdivision, groupSubdivisionLengths, measureSubdivisions) {
  let cursor = 0
  for (const groupLength of groupSubdivisionLengths) {
    cursor += groupLength
    if (subdivision < cursor) {
      return cursor
    }
  }
  return measureSubdivisions
}

function splitSubdivisionsByGroups(startSubdivision, totalSubdivisions, groupSubdivisionLengths, measureSubdivisions) {
  if (totalSubdivisions <= 0) {
    return []
  }

  const chunks = []
  let cursor = startSubdivision
  let remaining = totalSubdivisions

  while (remaining > 0) {
    const nextBoundary = getGroupBoundaryAfter(cursor, groupSubdivisionLengths, measureSubdivisions)
    const segmentLength = Math.min(remaining, nextBoundary - cursor)
    chunks.push(...splitSubdivisions(segmentLength))
    cursor += segmentLength
    remaining -= segmentLength
  }

  return chunks
}

function buildTieStopMap(measures, timeSignature, keySignature) {
  const stopTargets = new Set()
  const subdivisionsPerMeasure = parseEditorTimeSignature(timeSignature).subdivisionsPerMeasure

  measures.forEach((measure, measureIndex) => {
    STAFF_IDS.forEach((staffId) => {
      getItemsForStaff(measure, staffId).forEach((item) => {
        if (item.kind !== 'note' || !item.tieToNext) {
          return
        }

        const next = findNextContiguousItem(
          measures,
          measureIndex,
          staffId,
          item,
          subdivisionsPerMeasure,
        )

        if (next?.item.kind === 'note' && haveSameNotePitches(item, next.item, keySignature)) {
          stopTargets.add(next.item.id)
        }
      })
    })
  })

  return stopTargets
}

function buildSlurMaps(slurs) {
  const startMap = new Map()
  const stopMap = new Map()

  slurs.forEach((slur, index) => {
    const number = (index % 6) + 1
    startMap.set(slur.fromNoteId, [...(startMap.get(slur.fromNoteId) ?? []), number])
    stopMap.set(slur.toNoteId, [...(stopMap.get(slur.toNoteId) ?? []), number])
  })

  return { startMap, stopMap }
}

function getAccidentalTag(pitch, accidental, keySignature) {
  const displayAccidental = getDisplayAccidentalForPitch(
    pitch,
    accidental ?? null,
    keySignature,
  )

  if (displayAccidental === '##') return 'double-sharp'
  if (displayAccidental === '#') return 'sharp'
  if (displayAccidental === 'bb') return 'flat-flat'
  if (displayAccidental === 'b') return 'flat'
  if (displayAccidental === 'n') return 'natural'
  return null
}

function pushTempoDirection(lines, bpm) {
  lines.push('      <direction placement="above">')
  lines.push('        <direction-type>')
  lines.push('          <metronome>')
  lines.push('            <beat-unit>quarter</beat-unit>')
  lines.push(`            <per-minute>${Math.round(bpm)}</per-minute>`)
  lines.push('          </metronome>')
  lines.push('        </direction-type>')
  lines.push(`        <sound tempo="${Math.round(bpm)}"/>`)
  lines.push('        <staff>1</staff>')
  lines.push('      </direction>')
}

function pushDynamicDirection(lines, dynamic, staffNumber) {
  lines.push('      <direction placement="below">')
  lines.push('        <direction-type>')
  lines.push('          <dynamics>')
  lines.push(`            <${dynamic}/>`)
  lines.push('          </dynamics>')
  lines.push('        </direction-type>')
  lines.push(`        <staff>${staffNumber}</staff>`)
  lines.push('      </direction>')
}

function pushRestNote(lines, baseDuration, dots, staffNumber) {
  lines.push('      <note>')
  lines.push('        <rest/>')
  lines.push(`        <duration>${getItemSubdivisions({ baseDuration, dots, id: 'rest', kind: 'rest', start: 0 })}</duration>`)
  lines.push('        <voice>1</voice>')
  lines.push(`        <type>${MUSICXML_TYPE_BY_DURATION[baseDuration]}</type>`)
  if (dots === 1) {
    lines.push('        <dot/>')
  }
  lines.push(`        <staff>${staffNumber}</staff>`)
  lines.push('      </note>')
}

function pushNoteItem(lines, item, staffNumber, tieStops, slurStarts, slurStops, keySignature) {
  const tieStop = tieStops.has(item.id)
  const slurStartNumbers = slurStarts.get(item.id) ?? []
  const slurStopNumbers = slurStops.get(item.id) ?? []
  const articulationTag = item.articulation ? ARTICULATION_TO_MUSICXML[item.articulation] : null
  const ornamentTag = item.ornament ? ORNAMENT_TO_MUSICXML[item.ornament] : null

  item.pitches.forEach((pitch, index) => {
    const { letter, octave } = parsePitchToken(pitch)
    const effectiveAlter = getEffectiveAlterForPitch(
      pitch,
      item.accidentals?.[pitch],
      keySignature,
    )
    const accidentalTag = getAccidentalTag(
      pitch,
      item.accidentals?.[pitch],
      keySignature,
    )

    lines.push('      <note>')
    if (index > 0) {
      lines.push('        <chord/>')
    }
    lines.push('        <pitch>')
    lines.push(`          <step>${letter.toUpperCase()}</step>`)
    if (effectiveAlter !== 0) {
      lines.push(`          <alter>${effectiveAlter}</alter>`)
    }
    lines.push(`          <octave>${octave}</octave>`)
    lines.push('        </pitch>')
    lines.push(`        <duration>${getItemSubdivisions(item)}</duration>`)
    lines.push('        <voice>1</voice>')
    lines.push(`        <type>${MUSICXML_TYPE_BY_DURATION[item.baseDuration]}</type>`)
    if (item.dots === 1) {
      lines.push('        <dot/>')
    }
    if (tieStop) {
      lines.push('        <tie type="stop"/>')
    }
    if (item.tieToNext) {
      lines.push('        <tie type="start"/>')
    }
    if (accidentalTag) {
      lines.push(`        <accidental>${accidentalTag}</accidental>`)
    }
    lines.push(`        <staff>${staffNumber}</staff>`)

    if (index === 0 && item.lyrics) {
      lines.push('        <lyric>')
      lines.push(`          <text>${escapeXml(item.lyrics)}</text>`)
      lines.push('        </lyric>')
    }

    const hasNotations =
      tieStop ||
      item.tieToNext ||
      slurStartNumbers.length > 0 ||
      slurStopNumbers.length > 0 ||
      Boolean(articulationTag) ||
      Boolean(ornamentTag)

    if (hasNotations) {
      lines.push('        <notations>')
      if (tieStop) {
        lines.push('          <tied type="stop"/>')
      }
      if (item.tieToNext) {
        lines.push('          <tied type="start"/>')
      }
      slurStopNumbers.forEach((number) => {
        lines.push(`          <slur type="stop" number="${number}"/>`)
      })
      slurStartNumbers.forEach((number) => {
        lines.push(`          <slur type="start" number="${number}"/>`)
      })
      if (articulationTag) {
        lines.push('          <articulations>')
        if (articulationTag.includes(' ')) {
          const [tagName, attrs] = articulationTag.split(' ', 2)
          lines.push(`            <${tagName} ${attrs}/>`)
        } else {
          lines.push(`            <${articulationTag}/>`)
        }
        lines.push('          </articulations>')
      }
      if (ornamentTag) {
        lines.push('          <ornaments>')
        lines.push(`            <${ornamentTag}/>`)
        lines.push('          </ornaments>')
      }
      lines.push('        </notations>')
    }

    lines.push('      </note>')
  })
}

function pushStaffContents(lines, measure, staffId, measureSubdivisions, groupSubdivisionLengths, tieStops, slurStarts, slurStops, keySignature) {
  const staffNumber = staffId === 'treble' ? 1 : 2
  const items = [...getItemsForStaff(measure, staffId)].sort((left, right) => left.start - right.start)
  let cursor = 0

  for (const item of items) {
    if (item.start > cursor) {
      const padding = splitSubdivisionsByGroups(
        cursor,
        item.start - cursor,
        groupSubdivisionLengths,
        measureSubdivisions,
      )
      padding.forEach((chunk) => pushRestNote(lines, chunk.baseDuration, chunk.dots, staffNumber))
      cursor = item.start
    }

    if (item.kind === 'note' && item.dynamic) {
      pushDynamicDirection(lines, item.dynamic, staffNumber)
    }

    if (item.kind === 'note') {
      pushNoteItem(lines, item, staffNumber, tieStops, slurStarts, slurStops, keySignature)
    } else {
      pushRestNote(lines, item.baseDuration, item.dots, staffNumber)
    }

    cursor = item.start + getItemSubdivisions(item)
  }

  if (cursor < measureSubdivisions) {
    splitSubdivisionsByGroups(
      cursor,
      measureSubdivisions - cursor,
      groupSubdivisionLengths,
      measureSubdivisions,
    ).forEach((chunk) => pushRestNote(lines, chunk.baseDuration, chunk.dots, staffNumber))
  }
}

export function buildMusicXmlDocument(payload) {
  const {
    keySignature,
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
  } = payload

  const { startMap: slurStarts, stopMap: slurStops } = buildSlurMaps(slurs)
  const tieStops = buildTieStopMap(measures, timeSignature, keySignature)
  const meter = parseEditorTimeSignature(timeSignature, timeSignatureGrouping)
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
  ]

  if (String(scoreTitle || '').trim()) {
    lines.push(`  <movement-title>${escapeXml(String(scoreTitle).trim())}</movement-title>`)
  }

  const credits = [
    String(scoreSubtitle || '').trim(),
    String(scoreComposer || '').trim() ? `Composer: ${String(scoreComposer).trim()}` : '',
    String(scoreLyricist || '').trim() ? `Lyricist: ${String(scoreLyricist).trim()}` : '',
    String(scoreArranger || '').trim() ? `Arranger: ${String(scoreArranger).trim()}` : '',
  ].filter(Boolean)

  credits.forEach((credit, index) => {
    lines.push('  <credit>')
    lines.push(`    <credit-words default-y="${1450 - index * 60}">${escapeXml(credit)}</credit-words>`)
    lines.push('  </credit>')
  })

  if (String(scoreComposer || '').trim() || String(scoreLyricist || '').trim() || String(scoreArranger || '').trim()) {
    lines.push('  <identification>')
    if (String(scoreComposer || '').trim()) {
      lines.push(`    <creator type="composer">${escapeXml(String(scoreComposer).trim())}</creator>`)
    }
    if (String(scoreLyricist || '').trim()) {
      lines.push(`    <creator type="lyricist">${escapeXml(String(scoreLyricist).trim())}</creator>`)
    }
    if (String(scoreArranger || '').trim()) {
      lines.push(`    <creator type="arranger">${escapeXml(String(scoreArranger).trim())}</creator>`)
    }
    lines.push('  </identification>')
  }

  lines.push('  <part-list>')
  lines.push('    <score-part id="P1">')
  lines.push('      <part-name>Piano</part-name>')
  lines.push('    </score-part>')
  lines.push('  </part-list>')
  lines.push('  <part id="P1">')

  measures.forEach((measure, index) => {
    lines.push(`    <measure number="${index + 1}">`)

    if (index === 0) {
      lines.push('      <attributes>')
      lines.push(`        <divisions>${MUSICXML_DIVISIONS}</divisions>`)
      lines.push(`        <key><fifths>${KEY_SIGNATURE_TO_FIFTHS[keySignature]}</fifths></key>`)
      lines.push(`        <time><beats>${meter.numerator}</beats><beat-type>${meter.denominator}</beat-type></time>`)
      lines.push('        <staves>2</staves>')
      lines.push('        <clef number="1"><sign>G</sign><line>2</line></clef>')
      lines.push('        <clef number="2"><sign>F</sign><line>4</line></clef>')
      lines.push('      </attributes>')
    }

    if (index === 0 || measure.tempoBpm !== null) {
      pushTempoDirection(lines, index === 0 ? tempoBpm : (measure.tempoBpm ?? tempoBpm))
    }

    pushStaffContents(
      lines,
      measure,
      'treble',
      meter.subdivisionsPerMeasure,
      meter.groupSubdivisionLengths,
      tieStops,
      slurStarts,
      slurStops,
      keySignature,
    )

    lines.push('      <backup>')
    lines.push(`        <duration>${meter.subdivisionsPerMeasure}</duration>`)
    lines.push('      </backup>')

    pushStaffContents(
      lines,
      measure,
      'bass',
      meter.subdivisionsPerMeasure,
      meter.groupSubdivisionLengths,
      tieStops,
      slurStarts,
      slurStops,
      keySignature,
    )

    lines.push('    </measure>')
  })

  lines.push('  </part>')
  lines.push('</score-partwise>')

  return lines.join('\n')
}

function elementChildren(node, name) {
  const children = []
  for (const child of Array.from(node?.childNodes ?? [])) {
    if (child.nodeType === 1 && (!name || child.nodeName === name)) {
      children.push(child)
    }
  }
  return children
}

function firstElement(node, name) {
  return elementChildren(node, name)[0] ?? null
}

function text(node) {
  return (node?.textContent ?? '').trim()
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseMusicXmlTimeSignature(beats, beatType) {
  const numerator = Math.max(1, asNumber(beats, 4))
  const denominator = [2, 4, 8, 16].includes(asNumber(beatType, 4)) ? asNumber(beatType, 4) : 4
  return {
    denominator,
    subdivisionsPerMeasure: Math.round(32 * numerator / denominator),
    value: `${numerator}/${denominator}`,
  }
}

function extractMetadata(doc) {
  const scorePartwise = firstElement(doc, 'score-partwise') ?? doc
  const creators = elementChildren(scorePartwise, 'identification')
    .flatMap((identification) => elementChildren(identification, 'creator'))

  const creatorByType = new Map()
  creators.forEach((creator) => {
    const type = creator.getAttribute('type') ?? ''
    if (type && !creatorByType.has(type)) {
      creatorByType.set(type, text(creator))
    }
  })

  const creditWords = elementChildren(scorePartwise, 'credit')
    .flatMap((credit) => elementChildren(credit, 'credit-words').map(text))
    .filter(Boolean)

  return {
    scoreArranger: creatorByType.get('arranger') ?? '',
    scoreComposer: creatorByType.get('composer') ?? '',
    scoreLyricist: creatorByType.get('lyricist') ?? '',
    scoreSubtitle: creditWords.find((line) => !line.startsWith('Composer:') && !line.startsWith('Lyricist:') && !line.startsWith('Arranger:')) ?? '',
    scoreTitle:
      text(firstElement(scorePartwise, 'movement-title')) ||
      text(firstElement(firstElement(scorePartwise, 'work') ?? scorePartwise, 'work-title')) ||
      'Untitled',
  }
}

function pickSourcePart(scorePartwise, warnings) {
  const parts = elementChildren(scorePartwise, 'part')
  if (parts.length === 0) {
    throw new Error('No MusicXML part data was found.')
  }
  if (parts.length > 1) {
    warnings.push('Multiple parts detected; only the first part is imported right now.')
  }
  return parts[0]
}

function durationFromNote(note, divisions) {
  if (firstElement(note, 'time-modification')) {
    throw new Error('Tuplets are not supported in the importer yet.')
  }

  const typeName = text(firstElement(note, 'type')).toLowerCase()
  const dotCount = elementChildren(note, 'dot').length
  const direct = DURATION_BY_SIGNATURE[`${typeName}:${dotCount}`]
  if (direct) {
    return direct
  }

  const durationNode = firstElement(note, 'duration')
  if (!durationNode) {
    throw new Error('A note is missing its MusicXML duration.')
  }

  const exactSubdivisions = asNumber(text(durationNode)) * 8 / divisions
  if (!Number.isFinite(exactSubdivisions) || exactSubdivisions <= 0) {
    throw new Error(`Invalid duration encountered: duration=${text(durationNode)} divisions=${divisions}`)
  }
  if (!Number.isInteger(exactSubdivisions)) {
    throw new Error(
      `Unsupported rhythmic value encountered: duration=${text(durationNode)} divisions=${divisions}. Tuplets or non-16th quantization are not supported yet.`,
    )
  }

  const fallback = SUBDIVISION_TO_DURATION[exactSubdivisions]
  if (fallback) {
    return { ...fallback, subdivisions: exactSubdivisions }
  }

  return {
    baseDuration: undefined,
    dots: undefined,
    subdivisions: exactSubdivisions,
  }
}

function decomposeSubdivisions(subdivisions) {
  let remaining = subdivisions
  const chunks = []

  for (const value of SUPPORTED_SUBDIVISION_VALUES) {
    while (remaining >= value) {
      chunks.push(SUBDIVISION_TO_DURATION[value])
      remaining -= value
    }
  }

  if (remaining !== 0) {
    throw new Error(`Unsupported note length after quantization: ${subdivisions}`)
  }

  return chunks
}

function getSubdivisionsForDurationSpec(durationSpec) {
  if (durationSpec.baseDuration === 'w') return durationSpec.dots === 1 ? 48 : 32
  if (durationSpec.baseDuration === 'h') return durationSpec.dots === 1 ? 24 : 16
  if (durationSpec.baseDuration === 'q') return durationSpec.dots === 1 ? 12 : 8
  if (durationSpec.baseDuration === '8') return durationSpec.dots === 1 ? 6 : 4
  if (durationSpec.baseDuration === '16') return durationSpec.dots === 1 ? 3 : 2
  return 1
}

function pitchFromXml(note) {
  const pitch = firstElement(note, 'pitch')
  if (!pitch) {
    throw new Error('A MusicXML note pitch could not be read.')
  }

  const step = text(firstElement(pitch, 'step')).toLowerCase() || 'c'
  const octave = text(firstElement(pitch, 'octave')) || '4'
  const alter = asNumber(text(firstElement(pitch, 'alter')))

  if (![0, 1, 2, -1, -2].includes(alter)) {
    throw new Error(`Unsupported accidental alter value: ${alter}`)
  }

  const suffix = alter === 2 ? '##' : alter === 1 ? '#' : alter === -2 ? 'bb' : alter === -1 ? 'b' : ''
  return `${step}${suffix}/${octave}`
}

function readArticulation(note) {
  const articulations = firstElement(firstElement(note, 'notations') ?? note, 'articulations')
  if (!articulations) {
    return undefined
  }
  for (const entry of elementChildren(articulations)) {
    const mapped = ARTICULATION_MAP[entry.nodeName]
    if (mapped) {
      return mapped
    }
  }
  return undefined
}

function readOrnament(note) {
  const ornaments = firstElement(firstElement(note, 'notations') ?? note, 'ornaments')
  if (!ornaments) {
    return undefined
  }
  for (const entry of elementChildren(ornaments)) {
    const mapped = ORNAMENT_MAP[entry.nodeName]
    if (mapped) {
      return mapped
    }
  }
  return undefined
}

function parseDirection(direction, currentPositionDivisions) {
  const offset = asNumber(text(firstElement(direction, 'offset')))
  const staffNumber = asNumber(text(firstElement(direction, 'staff')), 1)
  const position = currentPositionDivisions + offset
  const directionType = firstElement(direction, 'direction-type')
  const sound = firstElement(direction, 'sound')

  let tempo = null
  if (sound?.getAttribute('tempo')) {
    tempo = Math.round(asNumber(sound.getAttribute('tempo')))
  }

  if (tempo === null && directionType) {
    const metronome = firstElement(directionType, 'metronome')
    if (metronome) {
      tempo = Math.round(asNumber(text(firstElement(metronome, 'per-minute'))))
    }
  }

  let dynamic = null
  if (directionType) {
    const dynamics = firstElement(directionType, 'dynamics')
    if (dynamics) {
      const tag = elementChildren(dynamics)[0]?.nodeName ?? ''
      if (DYNAMIC_TAGS.has(tag)) {
        dynamic = tag
      }
    }
  }

  return {
    dynamic,
    position,
    staffId: staffNumber === 2 ? 'bass' : 'treble',
    tempo,
  }
}

function sortAndValidateEvents(events, measureNumber, staffId) {
  events.sort((left, right) => left.start - right.start)
  let lastEnd = 0
  for (const event of events) {
    if (event.start < lastEnd) {
      throw new Error(`Measure ${measureNumber} has overlapping voices on the ${staffId} staff, which are not supported yet.`)
    }
    lastEnd = event.start + event.subdivisions
  }
}

function applyDynamics(items, marks) {
  for (const mark of marks) {
    const target = items.find((item) => item.kind === 'note' && item.start >= mark.position)
    if (target) {
      target.dynamic = mark.dynamic
    }
  }
}

function parsePart(part, warnings) {
  const measures = []
  const slurs = []
  const openSlurs = new Map()
  let currentDivisions = 8
  let currentTimeSignature = '4/4'
  let keySignature = 'C'
  let defaultTempo = 80
  let runningTempo = defaultTempo
  let skippedGraceNoteCount = 0

  elementChildren(part, 'measure').forEach((measureNode, measureIndex) => {
    let currentPositionDivisions = 0
    let lastStartByStaff = { bass: 0, treble: 0 }
    let tempoInMeasure = null
    const directions = []
    const eventsByStaff = { bass: [], treble: [] }

    for (const child of elementChildren(measureNode)) {
      if (child.nodeName === 'attributes') {
        const divisionsNode = firstElement(child, 'divisions')
        if (divisionsNode) {
          currentDivisions = asNumber(text(divisionsNode), currentDivisions)
        }

        const keyNode = firstElement(child, 'key')
        if (keyNode) {
          const fifths = String(asNumber(text(firstElement(keyNode, 'fifths')), 0))
          keySignature = KEY_BY_FIFTHS[fifths] ?? 'C'
        }

        const timeNode = firstElement(child, 'time')
        if (timeNode) {
          currentTimeSignature = parseMusicXmlTimeSignature(
            text(firstElement(timeNode, 'beats')),
            text(firstElement(timeNode, 'beat-type')),
          ).value
        }
        continue
      }

      if (child.nodeName === 'direction') {
        const parsed = parseDirection(child, currentPositionDivisions)
        if (parsed.tempo !== null && tempoInMeasure === null) {
          tempoInMeasure = parsed.tempo
        }
        if (parsed.dynamic) {
          directions.push(parsed)
        }
        continue
      }

      if (child.nodeName === 'backup') {
        currentPositionDivisions -= asNumber(text(firstElement(child, 'duration')))
        continue
      }

      if (child.nodeName === 'forward') {
        currentPositionDivisions += asNumber(text(firstElement(child, 'duration')))
        continue
      }

      if (child.nodeName !== 'note') {
        continue
      }

      if (firstElement(child, 'grace')) {
        skippedGraceNoteCount += 1
        continue
      }

      const staffId = asNumber(text(firstElement(child, 'staff')), 1) === 2 ? 'bass' : 'treble'
      const isChord = Boolean(firstElement(child, 'chord'))
      const isRest = Boolean(firstElement(child, 'rest'))
      const duration = durationFromNote(child, currentDivisions)
      const start = isChord ? lastStartByStaff[staffId] : currentPositionDivisions * 8 / currentDivisions

      if (!Number.isInteger(start)) {
        throw new Error(`Measure ${measureIndex + 1} contains a duration the editor cannot quantize cleanly.`)
      }

      let event
      if (isChord) {
        event = eventsByStaff[staffId][eventsByStaff[staffId].length - 1]
        if (!event || event.kind !== 'note' || event.start !== start || event.subdivisions !== duration.subdivisions) {
          throw new Error(`Measure ${measureIndex + 1} contains a malformed chord grouping.`)
        }
      } else {
        event = {
          accidentals: {},
          articulation: undefined,
          dynamic: undefined,
          id: nextId('note'),
          kind: isRest ? 'rest' : 'note',
          lyrics: undefined,
          ornament: undefined,
          pitches: [],
          start,
          subdivisions: duration.subdivisions,
          tieToNext: false,
        }
        eventsByStaff[staffId].push(event)
        lastStartByStaff[staffId] = start
      }

      if (!isChord) {
        currentPositionDivisions += asNumber(text(firstElement(child, 'duration')))
      }

      if (!isRest) {
        const pitch = pitchFromXml(child)
        if (!event.pitches.includes(pitch)) {
          event.pitches.push(pitch)
        }

        const accidental = ACCIDENTAL_MAP[text(firstElement(child, 'accidental'))]
        if (accidental) {
          event.accidentals[pitch] = accidental
        }

        event.articulation = event.articulation ?? readArticulation(child)
        event.ornament = event.ornament ?? readOrnament(child)
        event.lyrics =
          event.lyrics ??
          (text(firstElement(firstElement(child, 'lyric') ?? child, 'text')) || undefined)
        event.tieToNext =
          event.tieToNext ||
          elementChildren(child, 'tie').some((tie) => tie.getAttribute('type') === 'start')

        const notationSlurs = elementChildren(firstElement(child, 'notations') ?? child, 'slur')
        notationSlurs
          .filter((slur) => slur.getAttribute('type') === 'stop')
          .forEach((slur) => {
            const key = `${staffId}:${slur.getAttribute('number') ?? '1'}`
            const fromNoteId = openSlurs.get(key)
            if (fromNoteId && fromNoteId !== event.id) {
              slurs.push({
                fromNoteId,
                id: nextId('slur'),
                staffId,
                toNoteId: event.id,
              })
            }
            openSlurs.delete(key)
          })

        notationSlurs
          .filter((slur) => slur.getAttribute('type') === 'start')
          .forEach((slur) => {
            const key = `${staffId}:${slur.getAttribute('number') ?? '1'}`
            openSlurs.set(key, event.id)
          })
      }
    }

    const meter = parseMusicXmlTimeSignature(...currentTimeSignature.split('/'))
    sortAndValidateEvents(eventsByStaff.treble, measureIndex + 1, 'treble')
    sortAndValidateEvents(eventsByStaff.bass, measureIndex + 1, 'bass')
    applyDynamics(eventsByStaff.treble, directions.filter((entry) => entry.staffId === 'treble' && entry.dynamic))
    applyDynamics(eventsByStaff.bass, directions.filter((entry) => entry.staffId === 'bass' && entry.dynamic))

    const normalize = (events) =>
      events.flatMap((event) => {
        const durationSpecs = decomposeSubdivisions(event.subdivisions)
        let runningStart = event.start

        return durationSpecs.map((durationSpec, chunkIndex) => {
          const start = runningStart
          runningStart += getSubdivisionsForDurationSpec(durationSpec)

          if (event.kind === 'rest') {
            return {
              baseDuration: durationSpec.baseDuration,
              dots: durationSpec.dots,
              id: nextId('rest'),
              kind: 'rest',
              start,
            }
          }

          const isLastChunk = chunkIndex === durationSpecs.length - 1
          return {
            accidentals:
              chunkIndex === 0 && Object.keys(event.accidentals).length > 0
                ? event.accidentals
                : undefined,
            articulation: chunkIndex === 0 ? event.articulation : undefined,
            baseDuration: durationSpec.baseDuration,
            dots: durationSpec.dots,
            dynamic: chunkIndex === 0 ? event.dynamic : undefined,
            id: chunkIndex === 0 ? event.id : nextId('note'),
            kind: 'note',
            lyrics: chunkIndex === 0 ? event.lyrics : undefined,
            ornament: chunkIndex === 0 ? event.ornament : undefined,
            pitches: event.pitches,
            start,
            tieToNext: !isLastChunk || event.tieToNext || undefined,
          }
        })
      })

    if (tempoInMeasure !== null && measureIndex === 0) {
      defaultTempo = tempoInMeasure
      runningTempo = tempoInMeasure
    }

    const measureTempo =
      tempoInMeasure !== null && measureIndex > 0 && tempoInMeasure !== runningTempo
        ? tempoInMeasure
        : null

    if (tempoInMeasure !== null) {
      runningTempo = tempoInMeasure
    }

    measures.push({
      bassItems: normalize(eventsByStaff.bass),
      id: `measure-${measureIndex + 1}`,
      tempoBpm: measureTempo,
      trebleItems: normalize(eventsByStaff.treble),
    })

    if (
      eventsByStaff.treble.some((event) => event.start + event.subdivisions > meter.subdivisionsPerMeasure) ||
      eventsByStaff.bass.some((event) => event.start + event.subdivisions > meter.subdivisionsPerMeasure)
    ) {
      throw new Error(`Measure ${measureIndex + 1} exceeds the current time signature.`)
    }
  })

  if (openSlurs.size > 0) {
    warnings.push('Some slurs could not be closed during import and were skipped.')
  }
  if (skippedGraceNoteCount > 0) {
    warnings.push(`${skippedGraceNoteCount} grace note(s) were skipped during import.`)
  }

  return {
    keySignature,
    measures,
    slurs,
    tempoBpm: defaultTempo,
    timeSignature: currentTimeSignature,
    timeSignatureGrouping: null,
  }
}

export function parseMusicXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('The uploaded file is not valid XML.')
  }

  const scorePartwise = firstElement(doc, 'score-partwise')
  if (!scorePartwise) {
    throw new Error('Only score-partwise MusicXML files are supported right now.')
  }

  const warnings = []
  const metadata = extractMetadata(doc)
  const part = pickSourcePart(scorePartwise, warnings)
  const score = parsePart(part, warnings)

  return {
    ...metadata,
    ...score,
    warnings,
  }
}
