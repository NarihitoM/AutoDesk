export interface SegmenterOptions {
  sampleRate: number
  frameMs: number
  minSpeechMs: number
  endSilenceMs: number
  maxUtteranceMs: number
  preRollMs: number
}

export const DEFAULT_SEGMENTER_OPTIONS: SegmenterOptions = {
  sampleRate: 16000,
  frameMs: 30,
  minSpeechMs: 300,
  endSilenceMs: 700,
  maxUtteranceMs: 10000,
  preRollMs: 240
}

const MIN_THRESHOLD = 0.008
const MAX_THRESHOLD = 0.2
const NOISE_MULTIPLIER = 3
const NOISE_WINDOW_MS = 1500

function rms(frame: Float32Array): number {
  let sum = 0
  for (const sample of frame) sum += sample * sample
  return Math.sqrt(sum / frame.length)
}

function concat(chunks: readonly Float32Array[]): Float32Array {
  const total = chunks.reduce((length, chunk) => length + chunk.length, 0)
  const result = new Float32Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export function toInt16(samples: Float32Array): Int16Array<ArrayBuffer> {
  const result = new Int16Array(samples.length)
  for (let index = 0; index < samples.length; index++) {
    const value = Math.max(-1, Math.min(1, samples[index] ?? 0))
    result[index] = value < 0 ? value * 0x8000 : value * 0x7fff
  }
  return result
}

export class UtteranceSegmenter {
  private readonly frameSize: number
  private readonly preRollFrames: number
  private readonly noiseFrames: number
  private pending = new Float32Array(0)
  private preRoll: Float32Array[] = []
  private chunks: Float32Array[] = []
  private speaking = false
  private speechMs = 0
  private silenceMs = 0
  private levels: number[] = []

  constructor(
    private readonly onUtterance: (samples: Float32Array) => void,
    private readonly options: SegmenterOptions = DEFAULT_SEGMENTER_OPTIONS
  ) {
    this.frameSize = Math.round((options.sampleRate * options.frameMs) / 1000)
    this.preRollFrames = Math.round(options.preRollMs / options.frameMs)
    this.noiseFrames = Math.round(NOISE_WINDOW_MS / options.frameMs)
  }

  get threshold(): number {
    const floor = this.levels.length > 0 ? Math.min(...this.levels) : 0
    return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, floor * NOISE_MULTIPLIER))
  }

  push(samples: Float32Array): void {
    let buffer = this.pending.length > 0 ? concat([this.pending, samples]) : samples
    while (buffer.length >= this.frameSize) {
      this.processFrame(buffer.slice(0, this.frameSize))
      buffer = buffer.subarray(this.frameSize)
    }
    this.pending = buffer.slice()
  }

  flush(): void {
    if (this.speaking) this.emit()
    this.pending = new Float32Array(0)
  }

  private processFrame(frame: Float32Array): void {
    const level = rms(frame)
    this.levels.push(level)
    if (this.levels.length > this.noiseFrames) this.levels.shift()
    const isSpeech = level > this.threshold

    if (!this.speaking) {
      if (!isSpeech) {
        this.preRoll = [...this.preRoll, frame].slice(-this.preRollFrames)
        return
      }
      this.speaking = true
      this.chunks = [...this.preRoll, frame]
      this.preRoll = []
      this.speechMs = this.options.frameMs
      this.silenceMs = 0
      return
    }

    this.chunks.push(frame)
    if (isSpeech) {
      this.speechMs += this.options.frameMs
      this.silenceMs = 0
    } else {
      this.silenceMs += this.options.frameMs
    }

    const lengthMs = this.chunks.length * this.options.frameMs
    if (this.silenceMs >= this.options.endSilenceMs || lengthMs >= this.options.maxUtteranceMs) this.emit()
  }

  private emit(): void {
    if (this.speechMs >= this.options.minSpeechMs) this.onUtterance(concat(this.chunks))
    this.speaking = false
    this.chunks = []
    this.speechMs = 0
    this.silenceMs = 0
  }
}
