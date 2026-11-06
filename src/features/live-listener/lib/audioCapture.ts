import workletUrl from './pcmWorklet.ts?worker&url'

export const CAPTURE_SAMPLE_RATE = 16000

export interface CaptureHandle {
  stop(): void
}

export async function openSystemAudio(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
  for (const track of stream.getVideoTracks()) {
    track.stop()
    stream.removeTrack(track)
  }
  if (stream.getAudioTracks().length === 0) throw new Error('System audio is not available on this PC.')
  return stream
}

export async function startCapture(stream: MediaStream, onSamples: (samples: Float32Array) => void): Promise<CaptureHandle> {
  const context = new AudioContext({ sampleRate: CAPTURE_SAMPLE_RATE })
  try {
    await context.audioWorklet.addModule(workletUrl)
  } catch (error) {
    void context.close()
    throw error
  }

  const source = context.createMediaStreamSource(stream)
  const node = new AudioWorkletNode(context, 'pcm-capture', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 1,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers'
  })
  const silent = context.createGain()
  silent.gain.value = 0

  node.port.onmessage = (event: MessageEvent<Float32Array>) => onSamples(event.data)
  source.connect(node)
  node.connect(silent)
  silent.connect(context.destination)

  return {
    stop: () => {
      node.port.onmessage = null
      source.disconnect()
      node.disconnect()
      silent.disconnect()
      for (const track of stream.getTracks()) track.stop()
      void context.close()
    }
  }
}
