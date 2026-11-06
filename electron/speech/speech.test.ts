import { describe, expect, it } from 'vitest'
import { buildLivePrompt, formatTranscript, latestQuestion, trimMessage } from '../live/livePrompt'
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

  it('sends only the last 5 messages', () => {
    const many = Array.from({ length: 12 }, (_, index) => line('them', `Message ${index}`, String(index)))
    expect(formatTranscript(many).split('\n')).toEqual([
      'Them: Message 7',
      'Them: Message 8',
      'Them: Message 9',
      'Them: Message 10',
      'Them: Message 11'
    ])
  })

  it('trims whitespace and keeps the most recent words of a long message', () => {
    expect(trimMessage('  So   tell me\n about it.  ')).toBe('So tell me about it.')
    const trimmed = trimMessage(`start ${'word '.repeat(400)}end`, 100)
    expect(trimmed.length).toBeLessThanOrEqual(103)
    expect(trimmed.startsWith('...')).toBe(true)
    expect(trimmed.endsWith('end')).toBe(true)
  })

  it('skips messages that are empty after trimming', () => {
    expect(formatTranscript([line('them', '   ', 'a'), line('you', 'Sure.', 'b')])).toBe('Me: Sure.')
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
