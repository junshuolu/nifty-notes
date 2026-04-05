// @ts-expect-error midi-writer-js types not resolved
import MidiWriter from 'midi-writer-js'
import type { MeasureData } from './constants'


function pitchToMidiNote(pitch: string): number {
    const noteOffsets: Record<string, number> = {
        c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11,
    }

    const noteName = pitch.split('/')[0] // 'c/4' → 'c'
    const octave = parseInt(pitch.split('/')[1]) // 'c/4' → 4

    const base = noteName.charAt(0) // 'c'
    const offset = noteOffsets[base] ?? 0
    // c# → +1, cb → -1
    let midi = (octave + 1) * 12 + offset

    if (noteName.includes('#')) midi += 1
    if (noteName.includes('b') && noteName.length > 1) midi -= 1
    return midi
}

// convert baseDuration to midi-writer-js duration string
function toMidiWriterDuration(baseDuration: string, dots: number): string {
    const map: Record<string, string> = {
        w: '1',
        h: '2',
        q: '4',
        '8': '8',
        '16': '16',
    }
    let dur = map[baseDuration] ?? '4'
    if (dots === 1) dur = 'd' + dur
    return dur
}


export function exportToMidi(
    measures: MeasureData[],
    timeSignature: string,
    tempoBpm: number,
): void {
    // 1. create two tracks: treble clef and bass clef
    const trebleTrack = new MidiWriter.Track()
    const bassTrack = new MidiWriter.Track()

    // 2. set tempo and time signature
    trebleTrack.setTempo(tempoBpm)
    const [numerator, denominator] = timeSignature.split('/').map(Number)
    trebleTrack.setTimeSignature(numerator, denominator)

    // 3. iterate through each measure and write notes
    for (const measure of measures) {
        // process treble clef
        for (const item of measure.trebleItems) {
            const dur = toMidiWriterDuration(item.baseDuration, item.dots)

            if (item.kind === 'note') {
                const pitchNumbers = item.pitches.map(p => pitchToMidiNote(p))
                trebleTrack.addEvent(
                    new MidiWriter.NoteEvent({
                        pitch: pitchNumbers,
                        duration: dur,
                        velocity: 80,
                    })
                )
            } else {
                // rest: use a wait event
                trebleTrack.addEvent(
                    new MidiWriter.NoteEvent({
                        pitch: [] as number[],
                        duration: dur,
                        velocity: 0,
                        wait: dur,
                    })
                )
            }
        }

        // process bass clef (same logic)
        for (const item of measure.bassItems) {
            const dur = toMidiWriterDuration(item.baseDuration, item.dots)

            if (item.kind === 'note') {
                const pitchNumbers = item.pitches.map(p => pitchToMidiNote(p))
                bassTrack.addEvent(
                    new MidiWriter.NoteEvent({
                        pitch: pitchNumbers,
                        duration: dur,
                        velocity: 80,
                    })
                )
            } else {
                bassTrack.addEvent(
                    new MidiWriter.NoteEvent({
                        pitch: [] as number[],
                        duration: dur,
                        velocity: 0,
                        wait: dur,
                    })
                )
            }
        }
    }

    // 4. build the MIDI file and trigger download
    const writer = new MidiWriter.Writer([trebleTrack, bassTrack])
    const blob = new Blob([writer.buildFile()], { type: 'audio/midi' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'composition.mid'
    a.click()
    URL.revokeObjectURL(url)
}
