import { describe, expect, it } from 'vitest'
import { DEFAULT_SEGMENTER_OPTIONS, toInt16, UtteranceSegmenter } from './segmenter'

const RATE = DEFAULT_SEGMENTER_OPTIONS.sampleRate

function speech(ms: number, amplitude: number): Float32Array {
  const samples = new Float32Array((RATE * ms) / 1000)
  for (let index = 0; index < samples.length; index++) {
    const time = index / RATE
    const syllables = Math.sin(Math.PI * 4 * time) ** 2
    samples[index] = amplitude * syllables * Math.sin(2 * Math.PI * 220 * time)
  }
  return samples
}

function noise(ms: number, amplitude: number, seed = 1): Float32Array {
  const samples = new Float32Array((RATE * ms) / 1000)
  let state = seed
  for (let index = 0; index < samples.length; index++) {
    state = (state * 16807) % 2147483647
    samples[index] = amplitude * ((state / 2147483647) * 2 - 1)
  }
  return samples
}

function collect() {
  const utterances: Float32Array[] = []
  const ids: number[] = []
  const partials: { id: number; length: number }[] = []
  const segmenter = new UtteranceSegmenter({
    onUtterance: (samples, id) => {
      utterances.push(samples)
      ids.push(id)
    },
    onPartial: (samples, id) => partials.push({ id, length: samples.length })
  })
  return { segmenter, utterances, ids, partials }
}

describe('UtteranceSegmenter', () => {
  it('ignores silence', () => {
    const { segmenter, utterances } = collect()
    segmenter.push(new Float32Array(RATE * 3))
    segmenter.flush()
    expect(utterances).toHaveLength(0)
  })

  it('emits one utterance after speech followed by a pause', () => {
    const { segmenter, utterances } = collect()
    segmenter.push(new Float32Array(RATE / 2))
    segmenter.push(speech(1200, 0.3))
    segmenter.push(new Float32Array(RATE))
    expect(utterances).toHaveLength(1)
    const seconds = (utterances[0]?.length ?? 0) / RATE
    expect(seconds).toBeGreaterThan(1.2)
    expect(seconds).toBeLessThan(2.4)
  })

  it('drops clicks that are too short to be speech', () => {
    const { segmenter, utterances } = collect()
    segmenter.push(speech(90, 0.5))
    segmenter.push(new Float32Array(RATE))
    expect(utterances).toHaveLength(0)
  })

  it('learns steady background noise and still hears speech over it', () => {
    const { segmenter, utterances } = collect()
    segmenter.push(noise(3000, 0.02))
    expect(utterances).toHaveLength(0)

    const voice = speech(1000, 0.3)
    const background = noise(1000, 0.02, 7)
    segmenter.push(voice.map((value, index) => value + (background[index] ?? 0)))
    segmenter.push(noise(1000, 0.02, 9))
    expect(utterances).toHaveLength(1)
  })

  it('splits long speech so answers do not wait for the speaker to stop', () => {
    const { segmenter, utterances } = collect()
    segmenter.push(speech(25000, 0.3))
    expect(utterances.length).toBeGreaterThanOrEqual(2)
  })

  it('sends growing partial snapshots while someone is speaking', () => {
    const { segmenter, ids, partials } = collect()
    segmenter.push(speech(3000, 0.3))
    segmenter.push(new Float32Array(RATE))
    expect(partials.length).toBeGreaterThanOrEqual(2)
    expect(partials.every((partial) => partial.id === ids[0])).toBe(true)
    expect(partials[1]?.length ?? 0).toBeGreaterThan(partials[0]?.length ?? 0)
  })

  it('gives each utterance a new id', () => {
    const { segmenter, ids } = collect()
    for (let turn = 0; turn < 2; turn++) {
      segmenter.push(speech(1000, 0.3))
      segmenter.push(new Float32Array(RATE))
    }
    expect(ids).toEqual([1, 2])
  })

  it('converts samples to 16-bit PCM with clipping', () => {
    expect([...toInt16(new Float32Array([0, 1, -1, 2, -2, 0.5]))]).toEqual([0, 32767, -32768, 32767, -32768, 16383])
  })
})
