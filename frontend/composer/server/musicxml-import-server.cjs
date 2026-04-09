const http = require('node:http')
const { DOMParser } = require('../node_modules/fonteditor-core/node_modules/@xmldom/xmldom')

const PORT = Number.parseInt(process.env.MUSICXML_IMPORT_PORT ?? '8787', 10)

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
  1: { baseDuration: '32', dots: 0 },
}

const SUPPORTED_SUBDIVISION_VALUES = Object.keys(SUBDIVISION_TO_DURATION)
  .map((value) => Number(value))
  .sort((left, right) => right - left)

const ACCIDENTAL_MAP = {
  flat: 'b',
  natural: 'n',
  sharp: '#',
}

const ARTICULATION_MAP = {
  accent: 'accent',
  'detached-legato': 'portato',
  'staccatissimo': 'staccatissimo',
  staccato: 'staccato',
  'strong-accent': 'marcato',
  tenuto: 'tenuto',
}

const ORNAMENT_MAP = {
  'inverted-mordent': 'mordentInverted',
  'inverted-turn': 'turnInverted',
  mordent: 'mordent',
  'trill-mark': 'trill',
  turn: 'turn',
}

const DYNAMIC_TAGS = new Set(['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz', 'fz', 'fp', 'pf'])

let idCounter = 0

function nextId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now()}-${idCounter}`
}

function elementChildren(node, name) {
  const children = []
  for (const child of Array.from(node.childNodes ?? [])) {
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

function parseTimeSignature(beats, beatType) {
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
  if (durationSpec.baseDuration === 'w') {
    return durationSpec.dots === 1 ? 48 : 32
  }
  if (durationSpec.baseDuration === 'h') {
    return durationSpec.dots === 1 ? 24 : 16
  }
  if (durationSpec.baseDuration === 'q') {
    return durationSpec.dots === 1 ? 12 : 8
  }
  if (durationSpec.baseDuration === '8') {
    return durationSpec.dots === 1 ? 6 : 4
  }
  if (durationSpec.baseDuration === '16') {
    return durationSpec.dots === 1 ? 3 : 2
  }
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
          currentTimeSignature = parseTimeSignature(
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
        event.tieToNext = event.tieToNext || elementChildren(child, 'tie').some((tie) => tie.getAttribute('type') === 'start')

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

    const meter = parseTimeSignature(...currentTimeSignature.split('/'))
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

    if (tempoInMeasure !== null) {
      if (measureIndex === 0) {
        defaultTempo = tempoInMeasure
        runningTempo = tempoInMeasure
      }
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

    if (eventsByStaff.treble.some((event) => event.start + event.subdivisions > meter.subdivisionsPerMeasure) ||
      eventsByStaff.bass.some((event) => event.start + event.subdivisions > meter.subdivisionsPerMeasure)) {
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

function parseMusicXml(xml) {
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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload))
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 404, { error: 'Not found.' })
    return
  }

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  if (req.method === 'POST' && req.url === '/api/musicxml/import') {
    try {
      const body = await readJsonBody(req)
      if (!body || typeof body.xml !== 'string' || !body.xml.trim()) {
        sendJson(res, 400, { error: 'Request body must include a non-empty xml string.' })
        return
      }

      sendJson(res, 200, parseMusicXml(body.xml))
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'MusicXML import failed.' })
    }
    return
  }

  sendJson(res, 404, { error: 'Not found.' })
})

server.listen(PORT, () => {
  console.log(`MusicXML import server listening on http://127.0.0.1:${PORT}`)
})
