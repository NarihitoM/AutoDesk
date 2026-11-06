import { useEffect } from 'react'
import { bridge } from '@/shared/lib/bridge'
import { openSystemAudio, startCapture, type CaptureHandle } from '../lib/audioCapture'
import { toInt16, UtteranceSegmenter } from '../lib/segmenter'

interface ActiveSource {
  capture: CaptureHandle
  segmenter: UtteranceSegmenter
}

function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'Access to system audio was blocked.'
  if (error instanceof DOMException && error.name === 'NotFoundError') return 'No audio output device was found.'
  return error instanceof Error && error.message
    ? `Could not listen to system audio. ${error.message}`
    : 'Could not listen to system audio.'
}

async function openSource(): Promise<ActiveSource> {
  const stream = await openSystemAudio()
  const segmenter = new UtteranceSegmenter({
    onUtterance: (samples, id) => bridge.listener.sendAudio(id, toInt16(samples).buffer),
    onPartial: (samples, id) => bridge.listener.sendPartial(id, toInt16(samples).buffer),
    onSpeechStart: () => bridge.listener.sendActivity(true),
    onDiscard: () => bridge.listener.sendActivity(false)
  })
  const capture = await startCapture(stream, (samples) => segmenter.push(samples))
  return { capture, segmenter }
}

export function useListener(): void {
  useEffect(() => {
    let source: ActiveSource | null = null
    let generation = 0

    const stopSource = (): void => {
      source?.segmenter.flush()
      source?.capture.stop()
      source = null
    }

    const start = async (run: number): Promise<void> => {
      try {
        const opened = await openSource()
        if (run !== generation) {
          opened.capture.stop()
          return
        }
        source = opened
        bridge.listener.reportStatus({ ok: true })
      } catch (error) {
        if (run === generation) bridge.listener.reportStatus({ ok: false, message: describeError(error) })
      }
    }

    const unsubscribe = bridge.listener.onCommand((command) => {
      generation += 1
      stopSource()
      if (command.type === 'start') void start(generation)
    })

    return () => {
      unsubscribe()
      generation += 1
      stopSource()
    }
  }, [])
}
