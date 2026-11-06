import { useEffect } from 'react'
import { bridge } from '@/shared/lib/bridge'
import type { ListenerCommand, Speaker } from '@/shared/types/live'
import { openMicrophone, openSystemAudio, startCapture, type CaptureHandle } from '../lib/audioCapture'
import { toInt16, UtteranceSegmenter } from '../lib/segmenter'

interface ActiveSource {
  capture: CaptureHandle
  segmenter: UtteranceSegmenter
}

function describeError(error: unknown, speaker: Speaker): string {
  const source = speaker === 'them' ? 'system audio' : 'the microphone'
  if (error instanceof DOMException && error.name === 'NotAllowedError') return `Access to ${source} was blocked.`
  if (error instanceof DOMException && error.name === 'NotFoundError') return `No ${source} device was found.`
  return error instanceof Error && error.message ? `Could not listen to ${source}. ${error.message}` : `Could not listen to ${source}.`
}

async function openSource(speaker: Speaker): Promise<ActiveSource> {
  const stream = speaker === 'them' ? await openSystemAudio() : await openMicrophone()
  const segmenter = new UtteranceSegmenter((samples) => {
    const pcm = toInt16(samples)
    bridge.listener.sendAudio(speaker, pcm.buffer)
  })
  const capture = await startCapture(stream, (samples) => segmenter.push(samples))
  return { capture, segmenter }
}

export function useListener(): void {
  useEffect(() => {
    const sources = new Map<Speaker, ActiveSource>()
    let generation = 0

    const stopAll = (): void => {
      for (const source of sources.values()) {
        source.segmenter.flush()
        source.capture.stop()
      }
      sources.clear()
    }

    const start = async (command: Extract<ListenerCommand, { type: 'start' }>, run: number): Promise<void> => {
      const wanted: Speaker[] = [...(command.system ? ['them' as const] : []), ...(command.mic ? ['you' as const] : [])]
      for (const speaker of wanted) {
        try {
          const source = await openSource(speaker)
          if (run !== generation) {
            source.capture.stop()
            return
          }
          sources.set(speaker, source)
          bridge.listener.reportStatus({ speaker, ok: true })
        } catch (error) {
          if (run === generation) bridge.listener.reportStatus({ speaker, ok: false, message: describeError(error, speaker) })
        }
      }
    }

    const unsubscribe = bridge.listener.onCommand((command) => {
      generation += 1
      stopAll()
      if (command.type === 'start') void start(command, generation)
    })

    return () => {
      unsubscribe()
      generation += 1
      stopAll()
    }
  }, [])
}
