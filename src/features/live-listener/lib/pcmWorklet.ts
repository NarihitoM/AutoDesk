interface WorkletProcessor {
  readonly port: MessagePort
  process(inputs: Float32Array[][]): boolean
}

declare const AudioWorkletProcessor: {
  prototype: { readonly port: MessagePort }
  new (): { readonly port: MessagePort }
}

declare function registerProcessor(name: string, processor: new () => WorkletProcessor): void

const CHUNK_SIZE = 1600

class PcmCapture extends AudioWorkletProcessor implements WorkletProcessor {
  private buffer = new Float32Array(CHUNK_SIZE)
  private length = 0

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0]
    if (!channel) return true

    let offset = 0
    while (offset < channel.length) {
      const count = Math.min(CHUNK_SIZE - this.length, channel.length - offset)
      this.buffer.set(channel.subarray(offset, offset + count), this.length)
      this.length += count
      offset += count
      if (this.length === CHUNK_SIZE) {
        this.port.postMessage(this.buffer)
        this.buffer = new Float32Array(CHUNK_SIZE)
        this.length = 0
      }
    }
    return true
  }
}

registerProcessor('pcm-capture', PcmCapture)
