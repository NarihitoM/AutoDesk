import { describe, expect, it } from 'vitest'
import { buildLivePrompt, formatTranscript, latestQuestion } from '../live/livePrompt'
import { cleanTranscript } from './transcript'
import { encodeWav } from './wav'

const line = (speaker: 'them' | 'you', text: string, id = text) => ({ id, speaker, text, at: 0, open: false })

describe('cleanTranscript', () => {
  it('removes noise tags and keeps real speech', () => {
    expect(cleanTranscript(' [BLANK_AUDIO] So tell me about yourself. (keyboard clicking) ')).toBe('So tell me about yourself.')
  })

  it.each(['[BLANK_AUDIO]', '(music)', ' Thank you. ', 'you', '...', '♪♪'])('drops %s', (text) =>
    expect(cleanTranscript(text)).toBe('')
  )
})

describe('live prompt', () => {
  const lines = [line('them', 'Hi, thanks for joining.'), line('you', 'Happy to be here.'), line('them', 'Why do you want this role?')]

  it('labels speakers and finds the latest question', () => {
    expect(formatTranscript(lines)).toBe('Them: Hi, thanks for joining.\nMe: Happy to be here.\nThem: Why do you want this role?')
    expect(latestQuestion(lines)).toBe('Why do you want this role?')
  })

  it('keeps only the most recent lines when the transcript is long', () => {
    const many = Array.from({ length: 50 }, (_, index) => line('them', `Line number ${index} with some words`, String(index)))
    const transcript = formatTranscript(many, 200)
    expect(transcript.length).toBeLessThanOrEqual(240)
    expect(transcript.endsWith('Line number 49 with some words')).toBe(true)
  })

  it('trims one very long turn to its most recent words', () => {
    const transcript = formatTranscript([line('them', `start ${'word '.repeat(400)}end`)], 300)
    expect(transcript.length).toBeLessThanOrEqual(320)
    expect(transcript.startsWith('Them: ...')).toBe(true)
    expect(transcript.endsWith('end')).toBe(true)
  })

  it('builds a prompt with instructions, transcript, and the question', () => {
    const prompt = buildLivePrompt('Help me answer.', lines)
    expect(prompt.startsWith('Help me answer.')).toBe(true)
    expect(prompt).toContain('Me: Happy to be here.')
    expect(prompt.endsWith('Latest thing they said: Why do you want this role?')).toBe(true)
  })
})

describe('encodeWav', () => {
  it('writes a 16 kHz mono PCM header followed by the samples', () => {
    const wav = encodeWav(new Int16Array([0, 1000, -1000]))
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE')
    expect(wav.readUInt16LE(22)).toBe(1)
    expect(wav.readUInt32LE(24)).toBe(16000)
    expect(wav.readUInt32LE(40)).toBe(6)
    expect(wav.readInt16LE(46)).toBe(1000)
    expect(wav.readInt16LE(48)).toBe(-1000)
  })
})
