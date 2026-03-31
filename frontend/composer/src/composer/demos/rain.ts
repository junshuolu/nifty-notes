/**
 * Rain and Your — Yiruma
 * Auto-generated from MusicXML.
 * Key: C. Time: 4/4. Tempo: 70 BPM.
 */

import { type MeasureData, type ScoreItem, generateId } from '../constants'

function note(item: {
  accidentals?: Record<string, '#' | 'b' | 'n'>
  articulation?: 'staccato' | 'staccatissimo' | 'tenuto' | 'portato' | 'marcato' | 'accent'
  baseDuration: 'w' | 'h' | 'q' | '8' | '16' | '32'
  dots: 0 | 1
  pitches: string[]
  start: number
  tieToNext?: boolean
}) {
  return { id: generateId(), kind: 'note', ...item } as unknown as ScoreItem
}

function rest(item: {
  baseDuration: 'w' | 'h' | 'q' | '8' | '16' | '32'
  dots: 0 | 1
  start: number
}) {
  return { id: generateId(), kind: 'rest', ...item } as unknown as ScoreItem
}

export function createRainMeasures(): MeasureData[] {
  return [
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        rest({ baseDuration: '16', dots: 0, start: 0 }),
        note({ baseDuration: '16', dots: 0, start: 2, pitches: ['g/4'] }),
        note({ baseDuration: '16', dots: 0, start: 4, pitches: ['c/5'] }),
        note({ baseDuration: '16', dots: 0, start: 6, pitches: ['d/5'] }),
      ],
      bassItems: [
        rest({ baseDuration: 'q', dots: 0, start: 0 }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['d/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['e/5'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['e/5'] }),
        rest({ baseDuration: '16', dots: 0, start: 24 }),
        note({ baseDuration: '16', dots: 0, start: 26, pitches: ['c/5'] }),
        note({ baseDuration: '16', dots: 0, start: 28, pitches: ['d/5'] }),
        note({ baseDuration: '16', dots: 0, start: 30, pitches: ['e/5'] }),
      ],
      bassItems: [
        note({ baseDuration: 'w', dots: 0, start: 0, pitches: ['g/3', 'c/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['d/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['g/5'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['g/5'] }),
        rest({ baseDuration: '16', dots: 0, start: 24 }),
        note({ baseDuration: '16', dots: 0, start: 26, pitches: ['g/5'] }),
        note({ baseDuration: '16', dots: 0, start: 28, pitches: ['a/5'] }),
        note({ baseDuration: '16', dots: 0, start: 30, pitches: ['b/5'] }),
      ],
      bassItems: [
        note({ baseDuration: 'w', dots: 0, start: 0, pitches: ['g/3', 'e/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['b/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['c/6'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['c/6'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['c/6'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['d/6'] }),
        note({ baseDuration: '16', dots: 1, start: 24, pitches: ['e/6'] }),
        note({ baseDuration: '16', dots: 0, start: 27, pitches: ['d/6'] }),
        note({ baseDuration: '16', dots: 1, start: 29, pitches: ['c/6'] }),
      ],
      bassItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['e/3', 'a/2'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['a/3', 'e/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['b/5'] }),
        rest({ baseDuration: '8', dots: 0, start: 16 }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['c/6'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['b/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['g/5'] }),
      ],
      bassItems: [
        note({ baseDuration: 'q', dots: 0, start: 0, pitches: ['e/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['g/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['b/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['g/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['a/5'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['a/5'] }),
        rest({ baseDuration: '8', dots: 0, start: 24 }),
        note({ baseDuration: '16', dots: 0, start: 28, pitches: ['g/5'] }),
        note({ baseDuration: '16', dots: 0, start: 30, pitches: ['f/5'] }),
      ],
      bassItems: [
        note({ baseDuration: 'w', dots: 0, start: 0, pitches: ['a/3', 'f/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['f/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['g/5'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['g/5'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['c/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['d/5'] }),
      ],
      bassItems: [
        note({ baseDuration: 'w', dots: 0, start: 0, pitches: ['g/3', 'c/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['e/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['f/5'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['f/5'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['g/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['f/5'] }),
      ],
      bassItems: [
        note({ baseDuration: 'q', dots: 0, start: 0, pitches: ['d/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['f/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['a/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['e/5'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['d/5'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['g/4'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['c/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['d/5'] }),
      ],
      bassItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['g/3', 'c/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['g/2'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['d/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['e/5'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['e/5'] }),
        rest({ baseDuration: '16', dots: 0, start: 24 }),
        note({ baseDuration: '16', dots: 0, start: 26, pitches: ['c/5'] }),
        note({ baseDuration: '16', dots: 0, start: 28, pitches: ['d/5'] }),
        note({ baseDuration: '16', dots: 0, start: 30, pitches: ['e/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['c/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['e/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['e/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['d/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['g/5'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['g/5'] }),
        rest({ baseDuration: '16', dots: 0, start: 24 }),
        note({ baseDuration: '16', dots: 0, start: 26, pitches: ['g/5'] }),
        note({ baseDuration: '16', dots: 0, start: 28, pitches: ['a/5'] }),
        note({ baseDuration: '16', dots: 0, start: 30, pitches: ['b/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['b/2'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['e/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['b/2'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['b/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['c/6'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['c/6'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['c/6'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['d/6'] }),
        note({ baseDuration: '16', dots: 1, start: 24, pitches: ['e/6'] }),
        note({ baseDuration: '16', dots: 0, start: 27, pitches: ['d/6'] }),
        note({ baseDuration: '16', dots: 1, start: 29, pitches: ['c/6'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['a/2'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['c/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['e/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['a/2'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['b/5'] }),
        rest({ baseDuration: '8', dots: 0, start: 16 }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['c/6'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['b/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['g/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['b/3'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['g/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['b/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['g/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['a/5'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['a/5'] }),
        rest({ baseDuration: '8', dots: 0, start: 24 }),
        note({ baseDuration: '16', dots: 0, start: 28, pitches: ['g/5'] }),
        note({ baseDuration: '16', dots: 0, start: 30, pitches: ['f/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['f/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['a/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['c/4'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['a/3'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['c/4'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['a/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['f/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['f/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['g/5'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['g/5'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['c/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['d/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['c/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['e/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['e/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['e/5'] }),
        note({ baseDuration: 'q', dots: 0, start: 4, pitches: ['f/5'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['a/4'] }),
        note({ baseDuration: 'q', dots: 0, start: 16, pitches: ['c/5'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['b/4'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['d/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['f/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['a/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 16, pitches: ['g/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['d/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'q', dots: 0, start: 0, pitches: ['c/5'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['c/4'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['d/4'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['e/4'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['c/5'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['e/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['g/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['c/3'] }),
        note({ baseDuration: 'q', dots: 1, start: 4, pitches: ['g/3'] }),
        rest({ baseDuration: 'h', dots: 0, start: 16 }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['a/5'] }),
        rest({ baseDuration: '8', dots: 0, start: 16 }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['b/4'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['c/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['a/5'] }),
      ],
      bassItems: [
        rest({ baseDuration: '8', dots: 0, start: 0 }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['c/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['f/3'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['g/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['a/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['g/5'] }),
        rest({ baseDuration: '8', dots: 0, start: 16 }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['b/4'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['c/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['g/5'] }),
      ],
      bassItems: [
        rest({ baseDuration: '8', dots: 0, start: 0 }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['c/4'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['d/4'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['e/4'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['g/5'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['f/5'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['f/5'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['e/5'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['e/5'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['d/5'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['d/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['c/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['d/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['f/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['a/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['g/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['d/5'] }),
        note({ baseDuration: 'q', dots: 1, start: 4, pitches: ['e/5'] }),
        rest({ baseDuration: '8', dots: 0, start: 16 }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['c/5'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['e/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['g/5'] }),
      ],
      bassItems: [
        rest({ baseDuration: 'q', dots: 0, start: 0 }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['d/4'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['c/4'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['g/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['a/5'] }),
        rest({ baseDuration: '8', dots: 0, start: 16 }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['b/5'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['f#/5'], accidentals: { 'f#/5': '#' } }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['a/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['f#/3'], accidentals: { 'f#/3': '#' } }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['a/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['c/4'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['e/4'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['d#/4'], accidentals: { 'd#/4': '#' } }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'q', dots: 1, start: 0, pitches: ['g/5'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['e/5'] }),
        note({ baseDuration: 'q', dots: 0, start: 16, pitches: ['g/5'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['f/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['e/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['g/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['b/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['c/4', 'a/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'q', dots: 0, start: 0, pitches: ['f/5'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['g/5'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['a/5'] }),
        note({ baseDuration: 'q', dots: 0, start: 20, pitches: ['b/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['c/6'] }),
      ],
      bassItems: [
        note({ baseDuration: 'q', dots: 0, start: 0, pitches: ['d/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['e/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['f/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['e/6'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['d/6'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['g/4'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['c/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['d/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['c/4'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['d/4'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['c/4'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['b/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['d/6'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['e/6'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['e/6'] }),
        rest({ baseDuration: '16', dots: 0, start: 24 }),
        note({ baseDuration: '16', dots: 0, start: 26, pitches: ['c/6'] }),
        note({ baseDuration: '16', dots: 0, start: 28, pitches: ['d/6'] }),
        note({ baseDuration: '16', dots: 0, start: 30, pitches: ['e/6'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['c/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['e/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['e/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['d/6'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['g/6'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['g/6'] }),
        rest({ baseDuration: '16', dots: 0, start: 24 }),
        note({ baseDuration: '16', dots: 0, start: 26, pitches: ['g/6'] }),
        note({ baseDuration: '16', dots: 0, start: 28, pitches: ['a/6'] }),
        note({ baseDuration: '16', dots: 0, start: 30, pitches: ['b/6'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['b/2'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['e/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['b/2'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['b/6'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['c/7'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['c/7'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['c/7'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['d/7'] }),
        note({ baseDuration: '16', dots: 1, start: 24, pitches: ['e/7'] }),
        note({ baseDuration: '16', dots: 0, start: 27, pitches: ['d/7'] }),
        note({ baseDuration: '16', dots: 1, start: 29, pitches: ['c/7'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['a/2'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['c/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['e/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['a/2'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['b/6'] }),
        rest({ baseDuration: '8', dots: 0, start: 16 }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['c/7'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['b/6'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['g/6'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['b/3'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['g/3'] }),
        note({ baseDuration: 'h', dots: 0, start: 16, pitches: ['b/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['g/6'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['a/6'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['a/6'] }),
        rest({ baseDuration: '8', dots: 0, start: 24 }),
        note({ baseDuration: '16', dots: 0, start: 28, pitches: ['g/6'] }),
        note({ baseDuration: '16', dots: 0, start: 30, pitches: ['f/6'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['f/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['a/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['c/4'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['a/3'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['c/4'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['a/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['f/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['f/6'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['g/6'] }),
        note({ baseDuration: 'h', dots: 0, start: 8, pitches: ['g/6'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['c/6'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['d/6'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['c/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['e/3'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['g/3'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['e/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['e/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['e/6'] }),
        note({ baseDuration: 'q', dots: 0, start: 4, pitches: ['f/6'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['a/5'] }),
        note({ baseDuration: 'q', dots: 0, start: 16, pitches: ['c/6'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['b/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['d/3'] }),
        note({ baseDuration: '8', dots: 0, start: 4, pitches: ['f/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 8, pitches: ['a/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 16, pitches: ['g/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['f/3'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'q', dots: 0, start: 0, pitches: ['c/6'] }),
        note({ baseDuration: '8', dots: 0, start: 8, pitches: ['c/4'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['d/4'] }),
        note({ baseDuration: '8', dots: 0, start: 16, pitches: ['e/4'] }),
        note({ baseDuration: '8', dots: 0, start: 20, pitches: ['g/4'] }),
        note({ baseDuration: '8', dots: 0, start: 24, pitches: ['c/5'] }),
        note({ baseDuration: '8', dots: 0, start: 28, pitches: ['d/5'] }),
      ],
      bassItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['c/3'] }),
        note({ baseDuration: 'q', dots: 1, start: 4, pitches: ['g/3'] }),
        rest({ baseDuration: 'h', dots: 0, start: 16 }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: '8', dots: 0, start: 0, pitches: ['e/5'] }),
        note({ baseDuration: 'q', dots: 0, start: 4, pitches: ['f/5'] }),
        note({ baseDuration: '8', dots: 0, start: 12, pitches: ['a/4'] }),
        note({ baseDuration: 'q', dots: 0, start: 16, pitches: ['c/5'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['b/4'] }),
      ],
      bassItems: [
        note({ baseDuration: 'h', dots: 0, start: 0, pitches: ['d/3'] }),
        note({ baseDuration: 'q', dots: 0, start: 16, pitches: ['g/2'] }),
        note({ baseDuration: 'q', dots: 0, start: 24, pitches: ['b/2'] }),
      ],
    },
    {
      id: generateId(),
      tempoBpm: null,
      trebleItems: [
        note({ baseDuration: 'h', dots: 1, start: 0, pitches: ['e/5', 'c/5', 'b/4', 'g/4'] }),
        rest({ baseDuration: 'q', dots: 0, start: 24 }),
      ],
      bassItems: [
        note({ baseDuration: 'h', dots: 1, start: 0, pitches: ['c/3'] }),
        rest({ baseDuration: 'q', dots: 0, start: 24 }),
      ],
    },
  ]
}

export const RAIN_META = {
  arranger: '',
  composer: 'Yiruma',
  keySignature: 'C' as const,
  lyricist: '',
  subtitle: '',
  tempoBpm: 70,
  timeSignature: '4/4' as const,
  title: 'Rain and Your',
}

