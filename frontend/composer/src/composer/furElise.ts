/**
 * Für Elise (致爱丽丝) — A-theme
 * Original: Beethoven, 3/8 time, A minor
 * Encoded in 3/4 time (note values doubled) for the Nifty Notes composer.
 * Tempo recommendation: ~72 BPM in 3/4 ≈ original Andante feel.
 */

import { type MeasureData, type NoteItem, type ScoreItem, generateId } from './constants'

type N = { p: string; d: '8' | 'q' | 'h'; s: number; acc?: Record<string, '#' | 'b' | 'n'> }
type R = { d: '8' | 'q' | 'h'; s: number }

function n(pitch: string, duration: '8' | 'q' | 'h', start: number, acc?: Record<string, '#' | 'b' | 'n'>): N {
  return { p: pitch, d: duration, s: start, ...(acc ? { acc } : {}) }
}

function r(duration: '8' | 'q' | 'h', start: number): R {
  return { d: duration, s: start }
}

function buildItems(notes: (N | R)[]): ScoreItem[] {
  return notes.map((item) => {
    if ('p' in item) {
      const base: NoteItem = {
        id: generateId(),
        kind: 'note',
        baseDuration: item.d,
        dots: 0,
        start: item.s,
        pitches: [item.p],
      }
      if (item.acc) {
        base.accidentals = item.acc
      }
      return base
    }
    return {
      id: generateId(),
      kind: 'rest' as const,
      baseDuration: item.d,
      dots: 0,
      start: item.s,
    }
  })
}

function buildChordItems(notes: Array<{ pitches: string[]; d: '8' | 'q' | 'h'; s: number; acc?: Record<string, '#' | 'b' | 'n'> } | R>): ScoreItem[] {
  return notes.map((item) => {
    if ('pitches' in item) {
      const base: NoteItem = {
        id: generateId(),
        kind: 'note',
        baseDuration: item.d,
        dots: 0,
        start: item.s,
        pitches: item.pitches,
      }
      if (item.acc) {
        base.accidentals = item.acc
      }
      return base
    }
    return {
      id: generateId(),
      kind: 'rest' as const,
      baseDuration: item.d,
      dots: 0,
      start: item.s,
    }
  })
}

function m(treble: ScoreItem[], bass: ScoreItem[]): MeasureData {
  return { id: generateId(), tempoBpm: null, trebleItems: treble, bassItems: bass }
}

/**
 * In 3/4 time with SUBDIVISIONS_PER_BEAT = 8:
 *   beat 1 starts at subdivision 0
 *   beat 2 starts at subdivision 8
 *   beat 3 starts at subdivision 16
 *
 * Eighth note = 4 subdivisions (one beat = two eighths)
 * Quarter note = 8 subdivisions (one beat)
 * Half note = 16 subdivisions (two beats)
 */

export function createFurEliseMeasures(): MeasureData[] {
  // ─── Measure 1: Pickup ── ‹ rest › E5 D#5 ───
  const m1 = m(
    buildItems([
      r('q', 0),                                         // beat 1: rest
      r('q', 8),                                         // beat 2: rest
      n('e/5', '8', 16),                                 // beat 3: E5
      n('d/5', '8', 20, { 'd/5': '#' }),                 // D#5
    ]),
    buildItems([
      r('q', 0), r('q', 8), r('q', 16),                 // bass: rest
    ]),
  )

  // ─── Measure 2: E5 D#5 E5 B4 D5 C5 ───
  const m2 = m(
    buildItems([
      n('e/5', '8', 0),                                  // E5
      n('d/5', '8', 4, { 'd/5': '#' }),                  // D#5
      n('e/5', '8', 8),                                  // E5
      n('b/4', '8', 12),                                 // B4
      n('d/5', '8', 16),                                 // D5
      n('c/5', '8', 20),                                 // C5
    ]),
    buildItems([
      r('q', 0), r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 3: A4 ‹rest› C4 E4 A4 ───
  const m3 = m(
    buildItems([
      n('a/4', 'q', 0),                                  // A4 (quarter)
      r('8', 8),                                         // rest (eighth)
      n('c/4', '8', 12),                                 // C4
      n('e/4', '8', 16),                                 // E4
      n('a/4', '8', 20),                                 // A4
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 }, // A octave chord
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 4: B4 ‹rest› E4 G#4 B4 ───
  const m4 = m(
    buildItems([
      n('b/4', 'q', 0),                                  // B4 (quarter)
      r('8', 8),                                         // rest
      n('e/4', '8', 12),                                 // E4
      n('g/4', '8', 16, { 'g/4': '#' }),                 // G#4
      n('b/4', '8', 20),                                 // B4
    ]),
    buildChordItems([
      { pitches: ['e/3', 'b/3'], d: 'q', s: 0 },        // E-B
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 5: C5 ‹rest› E4 E5 D#5 ───
  const m5 = m(
    buildItems([
      n('c/5', 'q', 0),                                  // C5 (quarter)
      r('8', 8),                                         // rest
      n('e/4', '8', 12),                                 // E4
      n('e/5', '8', 16),                                 // E5
      n('d/5', '8', 20, { 'd/5': '#' }),                 // D#5
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 }, // A octave
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 6: E5 D#5 E5 B4 D5 C5 (same as m2) ───
  const m6 = m(
    buildItems([
      n('e/5', '8', 0),
      n('d/5', '8', 4, { 'd/5': '#' }),
      n('e/5', '8', 8),
      n('b/4', '8', 12),
      n('d/5', '8', 16),
      n('c/5', '8', 20),
    ]),
    buildItems([
      r('q', 0), r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 7: A4 ‹rest› C4 E4 A4 (same as m3) ───
  const m7 = m(
    buildItems([
      n('a/4', 'q', 0),
      r('8', 8),
      n('c/4', '8', 12),
      n('e/4', '8', 16),
      n('a/4', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 8: B4 ‹rest› E4 C5 B4 ───
  const m8 = m(
    buildItems([
      n('b/4', 'q', 0),
      r('8', 8),
      n('e/4', '8', 12),
      n('c/5', '8', 16),
      n('b/4', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['e/3', 'b/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 9: A4 ‹rest› ‹rest› E5 D#5 ── (theme repeat) ───
  const m9 = m(
    buildItems([
      n('a/4', 'q', 0),
      r('q', 8),
      n('e/5', '8', 16),
      n('d/5', '8', 20, { 'd/5': '#' }),
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measures 10–13: Second statement (same as m2–m5) ───
  const m10 = m(
    buildItems([
      n('e/5', '8', 0),
      n('d/5', '8', 4, { 'd/5': '#' }),
      n('e/5', '8', 8),
      n('b/4', '8', 12),
      n('d/5', '8', 16),
      n('c/5', '8', 20),
    ]),
    buildItems([
      r('q', 0), r('q', 8), r('q', 16),
    ]),
  )

  const m11 = m(
    buildItems([
      n('a/4', 'q', 0),
      r('8', 8),
      n('c/4', '8', 12),
      n('e/4', '8', 16),
      n('a/4', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  const m12 = m(
    buildItems([
      n('b/4', 'q', 0),
      r('8', 8),
      n('e/4', '8', 12),
      n('g/4', '8', 16, { 'g/4': '#' }),
      n('b/4', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['e/3', 'b/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  const m13 = m(
    buildItems([
      n('c/5', 'q', 0),
      r('8', 8),
      n('e/4', '8', 12),
      n('e/5', '8', 16),
      n('d/5', '8', 20, { 'd/5': '#' }),
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 14: E5 D#5 E5 B4 D5 C5 ───
  const m14 = m(
    buildItems([
      n('e/5', '8', 0),
      n('d/5', '8', 4, { 'd/5': '#' }),
      n('e/5', '8', 8),
      n('b/4', '8', 12),
      n('d/5', '8', 16),
      n('c/5', '8', 20),
    ]),
    buildItems([
      r('q', 0), r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 15: A4 ‹rest› C4 E4 A4 ───
  const m15 = m(
    buildItems([
      n('a/4', 'q', 0),
      r('8', 8),
      n('c/4', '8', 12),
      n('e/4', '8', 16),
      n('a/4', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 16: B4 ‹rest› E4 C5 B4 ───
  const m16 = m(
    buildItems([
      n('b/4', 'q', 0),
      r('8', 8),
      n('e/4', '8', 12),
      n('c/5', '8', 16),
      n('b/4', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['e/3', 'b/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 17: A4 ‹rest› B4 C5 ── (transition to B-section) ───
  const m17 = m(
    buildItems([
      n('a/4', 'q', 0),
      r('8', 8),
      n('b/4', '8', 12),
      n('c/5', '8', 16),
      n('d/5', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 18: E5 ‹rest› G4 F5 E5 ─── (B section start)
  const m18 = m(
    buildItems([
      n('e/5', 'q', 0),
      r('8', 8),
      n('g/4', '8', 12),
      n('f/5', '8', 16),
      n('e/5', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['c/3', 'g/3', 'c/4'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 19: D5 ‹rest› E4 F5 D5 ───
  const m19 = m(
    buildItems([
      n('d/5', 'q', 0),
      r('8', 8),
      n('e/4', '8', 12),
      n('f/5', '8', 16),
      n('d/5', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['g/2', 'b/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 20: C5 ‹rest› E4 E5 C5 ───
  const m20 = m(
    buildItems([
      n('c/5', 'q', 0),
      r('8', 8),
      n('e/4', '8', 12),
      n('e/5', '8', 16),
      n('c/5', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 21: B4 ‹rest› E4 E5 D#5 ───
  const m21 = m(
    buildItems([
      n('b/4', 'q', 0),
      r('8', 8),
      n('e/4', '8', 12),
      n('e/5', '8', 16),
      n('d/5', '8', 20, { 'd/5': '#' }),
    ]),
    buildChordItems([
      { pitches: ['e/3', 'b/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measures 22–25: Final A-theme restatement ───
  const m22 = m(
    buildItems([
      n('e/5', '8', 0),
      n('d/5', '8', 4, { 'd/5': '#' }),
      n('e/5', '8', 8),
      n('b/4', '8', 12),
      n('d/5', '8', 16),
      n('c/5', '8', 20),
    ]),
    buildItems([
      r('q', 0), r('q', 8), r('q', 16),
    ]),
  )

  const m23 = m(
    buildItems([
      n('a/4', 'q', 0),
      r('8', 8),
      n('c/4', '8', 12),
      n('e/4', '8', 16),
      n('a/4', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  const m24 = m(
    buildItems([
      n('b/4', 'q', 0),
      r('8', 8),
      n('e/4', '8', 12),
      n('c/5', '8', 16),
      n('b/4', '8', 20),
    ]),
    buildChordItems([
      { pitches: ['e/3', 'b/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  // ─── Measure 25: Final A4 (held) ───
  const m25 = m(
    buildItems([
      n('a/4', 'q', 0),
      r('q', 8),
      r('q', 16),
    ]),
    buildChordItems([
      { pitches: ['a/2', 'e/3', 'a/3'], d: 'q', s: 0 },
      r('q', 8), r('q', 16),
    ]),
  )

  return [
    m1, m2, m3, m4, m5, m6, m7, m8, m9, m10,
    m11, m12, m13, m14, m15, m16, m17, m18, m19, m20,
    m21, m22, m23, m24, m25,
  ]
}
