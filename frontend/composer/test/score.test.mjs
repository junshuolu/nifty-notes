import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const sourceDir = path.join(projectRoot, 'src', 'composer')
const buildDir = path.join(projectRoot, '.test-output', 'composer')

async function transpileSource(sourceFile, outputFile) {
  const source = await fs.readFile(path.join(sourceDir, sourceFile), 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
    fileName: sourceFile,
  })

  const output = transpiled.outputText
    .replaceAll("from './constants'", "from './constants.mjs'")

  await fs.writeFile(path.join(buildDir, outputFile), output)
}

async function loadScoreModule() {
  await fs.rm(buildDir, { force: true, recursive: true })
  await fs.mkdir(buildDir, { recursive: true })
  await transpileSource('constants.ts', 'constants.mjs')
  await transpileSource('score.ts', 'score.mjs')
  return import(pathToFileURL(path.join(buildDir, 'score.mjs')).href)
}

function note(overrides = {}) {
  return {
    baseDuration: 'q',
    dots: 0,
    id: overrides.id ?? 'note',
    kind: 'note',
    pitches: ['c/4'],
    start: 0,
    ...overrides,
  }
}

function measure(overrides = {}) {
  return {
    bassItems: [],
    id: overrides.id ?? 'measure',
    tempoBpm: null,
    trebleItems: [],
    ...overrides,
  }
}

async function run() {
  const score = await loadScoreModule()

  const sixEight = score.parseTimeSignature('6/8')
  assert.deepEqual(
    {
      denominator: sixEight.denominator,
      display: sixEight.display,
      grouping: sixEight.grouping,
      groupSubdivisionLengths: sixEight.groupSubdivisionLengths,
      subdivisionsPerMeasure: sixEight.subdivisionsPerMeasure,
    },
    {
      denominator: 8,
      display: '6/8',
      grouping: [3, 3],
      groupSubdivisionLengths: [12, 12],
      subdivisionsPerMeasure: 24,
    },
  )
  assert.deepEqual(score.parseTimeSignature('7/8').grouping, [2, 2, 3])
  assert.deepEqual(score.parseTimeSignature('7/8', [3, 2, 2]).groupSubdivisionLengths, [12, 8, 8])
  assert.equal(score.parseTimeSignature('4/5').display, '4/4')
  assert.equal(score.snapSubdivision(31, 'q', false, 32), 24)
  assert.equal(score.snapSubdivision(29, '8', false, 32), 28)

  assert.equal(score.getEffectiveAlterForPitch('f/4', undefined, 'G'), 1)
  assert.equal(score.getDisplayAccidentalForPitch('f/4', undefined, 'G'), null)
  assert.equal(score.getDisplayAccidentalForPitch('f/4', 'n', 'G'), 'n')
  assert.equal(score.toTonePitch('f/4', undefined, 'G'), 'F#4')
  assert.equal(score.toTonePitch('f/4', 'n', 'G'), 'F4')
  assert.deepEqual(score.rewritePitchForKeySignature('f/4', undefined, 'G', 'C'), {
    accidental: '#',
    pitch: 'f/4',
  })
  assert.deepEqual(score.transposePitchForKeySignature('c/4', null, 'C', 'D'), {
    pitch: 'd/4',
  })

  const validTie = score.normalizeMeasures([
    measure({
      trebleItems: [
        note({ id: 'a', pitches: ['f/4'], start: 0, tieToNext: true }),
        note({ id: 'b', pitches: ['f#/4'], start: 8 }),
      ],
    }),
  ], 32, 'G')
  assert.equal(validTie[0].trebleItems[0].tieToNext, true)

  const invalidTie = score.normalizeMeasures([
    measure({
      trebleItems: [
        note({ id: 'a', pitches: ['c/4'], start: 0, tieToNext: true }),
        note({ id: 'b', pitches: ['d/4'], start: 8 }),
      ],
    }),
  ], 32, 'C')
  assert.equal(invalidTie[0].trebleItems[0].tieToNext, false)

  const playbackNotes = score.buildPlaybackNotes([
    measure({
      trebleItems: [
        note({ id: 'a', pitches: ['c/4'], start: 0, tieToNext: true }),
        note({ id: 'b', pitches: ['c/4'], start: 8 }),
      ],
    }),
  ], '4/4', 120, 'C')
  assert.deepEqual(playbackNotes, [{
    durationSeconds: 1,
    notes: ['C4'],
    startSeconds: 0,
  }])
}

try {
  await run()
  console.log('score tests passed')
} finally {
  await fs.rm(buildDir, { force: true, recursive: true })
}
