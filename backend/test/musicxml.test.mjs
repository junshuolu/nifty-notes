import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildMusicXmlDocument,
  getSafeScoreFilename,
  parseMusicXml,
} from '../musicxml.mjs'

const minimalScoreXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <movement-title>Quality Fixture</movement-title>
  <identification>
    <creator type="composer">Nifty Notes Team</creator>
  </identification>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>8</divisions>
        <key><fifths>1</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome><beat-unit>quarter</beat-unit><per-minute>96</per-minute></metronome>
        </direction-type>
        <sound tempo="96"/>
        <staff>1</staff>
      </direction>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
        <lyric><text>Hi</text></lyric>
      </note>
      <note>
        <chord/>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <direction placement="below">
        <direction-type><dynamics><mf/></dynamics></direction-type>
        <staff>1</staff>
      </direction>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <backup><duration>16</duration></backup>
      <note>
        <rest/>
        <duration>16</duration>
        <voice>1</voice>
        <type>half</type>
        <staff>2</staff>
      </note>
    </measure>
  </part>
</score-partwise>`

test('safe score filenames keep supported characters and replace unsafe ones', () => {
  assert.equal(
    getSafeScoreFilename('My/Score: Unit Test?', 'musicxml'),
    'My_Score_ Unit Test_.musicxml',
  )
  assert.equal(getSafeScoreFilename('   ', 'pdf'), 'score.pdf')
  assert.equal(getSafeScoreFilename('Etude 1', 'pdf'), 'Etude 1.pdf')
})

test('parseMusicXml imports metadata, meter, key, tempo, chords, lyrics, dynamics, and staff rests', () => {
  const payload = parseMusicXml(minimalScoreXml)

  assert.equal(payload.scoreTitle, 'Quality Fixture')
  assert.equal(payload.scoreComposer, 'Nifty Notes Team')
  assert.equal(payload.keySignature, 'G')
  assert.equal(payload.timeSignature, '4/4')
  assert.equal(payload.tempoBpm, 96)
  assert.deepEqual(payload.warnings, [])
  assert.equal(payload.measures.length, 1)

  const [measure] = payload.measures
  assert.equal(measure.tempoBpm, null)
  assert.equal(measure.trebleItems.length, 2)
  assert.equal(measure.bassItems.length, 1)

  assert.deepEqual(measure.trebleItems[0].pitches, ['c/4', 'e/4'])
  assert.equal(measure.trebleItems[0].lyrics, 'Hi')
  assert.equal(measure.trebleItems[0].start, 0)
  assert.equal(measure.trebleItems[1].dynamic, 'mf')
  assert.equal(measure.trebleItems[1].start, 8)

  assert.equal(measure.bassItems[0].kind, 'rest')
  assert.equal(measure.bassItems[0].baseDuration, 'h')
  assert.equal(measure.bassItems[0].start, 0)
})

test('parseMusicXml rejects unsupported or malformed input with useful errors', () => {
  assert.throws(
    () => parseMusicXml('<not-score-partwise/>'),
    /Only score-partwise MusicXML files are supported/,
  )

  assert.throws(
    () => parseMusicXml(minimalScoreXml.replace('<type>quarter</type>', '<time-modification/>')),
    /Tuplets are not supported/,
  )
})

test('buildMusicXmlDocument exports key-aware accidentals and tie start/stop notation', () => {
  const xml = buildMusicXmlDocument({
    keySignature: 'G',
    measures: [
      {
        bassItems: [],
        id: 'measure-1',
        tempoBpm: null,
        trebleItems: [
          {
            accidentals: { 'f/4': 'n' },
            baseDuration: 'w',
            dots: 0,
            id: 'n1',
            kind: 'note',
            pitches: ['f/4'],
            start: 0,
            tieToNext: true,
          },
        ],
      },
      {
        bassItems: [],
        id: 'measure-2',
        tempoBpm: null,
        trebleItems: [
          {
            accidentals: { 'f/4': 'n' },
            baseDuration: 'w',
            dots: 0,
            id: 'n2',
            kind: 'note',
            pitches: ['f/4'],
            start: 0,
          },
        ],
      },
    ],
    scoreArranger: '',
    scoreComposer: 'Composer Name',
    scoreLyricist: '',
    scoreSubtitle: 'Regression Export',
    scoreTitle: 'Tie Export',
    slurs: [],
    tempoBpm: 88,
    timeSignature: '4/4',
    timeSignatureGrouping: null,
  })

  assert.match(xml, /<movement-title>Tie Export<\/movement-title>/)
  assert.match(xml, /<creator type="composer">Composer Name<\/creator>/)
  assert.match(xml, /<key><fifths>1<\/fifths><\/key>/)
  assert.match(xml, /<accidental>natural<\/accidental>/)
  assert.match(xml, /<tie type="start"\/>/)
  assert.match(xml, /<tie type="stop"\/>/)
  assert.match(xml, /<tied type="start"\/>/)
  assert.match(xml, /<tied type="stop"\/>/)
})
