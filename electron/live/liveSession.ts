import { randomUUID } from 'node:crypto'
import { globalShortcut } from 'electron'
import { KEY_REQUIRED, LIVE_HOTKEY, LIVE_HOTKEY_LABEL } from '@/shared/lib/providers'
import type {
  ListenerStatus,
  LiveState,
  LiveStatus,
  PartialLines,
  Speaker,
  Suggestion,
  TranscriptLine
} from '@/shared/types/live'
import { providers } from '../Agent/providers'
import { streamChat } from '../Agent/stream'
import { getApiKey, getSettings } from '../settings/settingsStore'
import { cleanTranscript } from '../speech/transcript'
import { encodeWav } from '../speech/wav'
import { whisperServer } from '../speech/whisperServer'
import { sendListenerCommand, sendLiveEvent } from '../tools/windows'
import { buildLivePrompt, latestQuestion } from './livePrompt'

const ANSWER_DELAY_MS = 1200
const MAX_LINES = 400
const MAX_SUGGESTIONS = 20

function describeError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong.'
}

class LiveSession {
  private status: LiveStatus = { kind: 'idle' }
  private lines: TranscriptLine[] = []
  private partials: PartialLines = {}
  private suggestions: Suggestion[] = []
  private speakers = new Set<Speaker>()
  private queue: Promise<void> = Promise.resolve()
  private answerTimer: ReturnType<typeof setTimeout> | null = null
  private controller: AbortController | null = null
  private running = false
  private run = 0
  private finalized: Record<Speaker, number> = { them: 0, you: 0 }
  private pendingFinals = 0
  private partialBusy = false
  private answering = false
  private answerAgain = false
  private answeredLineId: string | null = null

  snapshot(): LiveState {
    return {
      status: this.status,
      lines: [...this.lines],
      partials: { ...this.partials },
      suggestions: this.suggestions.map((suggestion) => ({ ...suggestion })),
      hotkey: LIVE_HOTKEY_LABEL
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    const { live } = getSettings()
    if (!live.listenSystem && !live.listenMic) {
      this.setStatus({ kind: 'error', message: 'Turn on system audio or the microphone in Settings > Live assist.' })
      return
    }

    this.running = true
    this.run += 1
    this.speakers.clear()
    this.resetPartials()
    this.setStatus({ kind: 'starting' })
    try {
      await whisperServer.start(live.language)
    } catch (error) {
      this.running = false
      this.setStatus({ kind: 'error', message: describeError(error) })
      return
    }
    if (!this.running) return

    sendListenerCommand({ type: 'start', system: live.listenSystem, mic: live.listenMic })
    if (!globalShortcut.isRegistered(LIVE_HOTKEY)) globalShortcut.register(LIVE_HOTKEY, () => this.ask())
  }

  stop(): void {
    const wasActive = this.running || this.status.kind !== 'idle'
    this.running = false
    this.run += 1
    this.speakers.clear()
    this.resetPartials()
    this.clearAnswerTimer()
    this.answerAgain = false
    this.controller?.abort()
    sendListenerCommand({ type: 'stop' })
    whisperServer.stop()
    globalShortcut.unregister(LIVE_HOTKEY)
    if (wasActive) this.setStatus({ kind: 'idle' })
  }

  listenerStatus(status: ListenerStatus): void {
    if (!this.running) return
    if (status.ok) {
      this.speakers.add(status.speaker)
    } else {
      this.speakers.delete(status.speaker)
    }

    if (this.speakers.size > 0) {
      this.setStatus({ kind: 'listening', speakers: [...this.speakers] })
    } else if (!status.ok) {
      this.setStatus({ kind: 'error', message: status.message ?? 'Could not listen to any audio source.' })
    }
  }

  audio(speaker: Speaker, id: number, pcm: Int16Array): void {
    if (!this.running) return
    const run = this.run
    this.pendingFinals += 1
    this.queue = this.queue
      .then(async () => {
        if (run !== this.run) return
        const text = cleanTranscript(await whisperServer.transcribe(encodeWav(pcm)))
        if (run !== this.run) return
        this.finalized[speaker] = Math.max(this.finalized[speaker], id)
        if (this.status.kind === 'error' && this.speakers.size > 0) {
          this.setStatus({ kind: 'listening', speakers: [...this.speakers] })
        }
        if (text) {
          this.addLine(speaker, text)
        } else {
          this.setPartial(speaker, '')
        }
      })
      .catch((error: unknown) => {
        if (run === this.run) this.setStatus({ kind: 'error', message: describeError(error) })
      })
      .finally(() => {
        this.pendingFinals -= 1
      })
  }

  partial(speaker: Speaker, id: number, pcm: Int16Array): void {
    if (!this.running || this.partialBusy || this.pendingFinals > 0 || id <= this.finalized[speaker]) return
    const run = this.run
    this.partialBusy = true
    whisperServer
      .transcribe(encodeWav(pcm))
      .then((raw) => {
        const text = cleanTranscript(raw)
        if (run !== this.run || id <= this.finalized[speaker] || !text) return
        this.setPartial(speaker, text)
        if (speaker === 'them' && this.answerTimer) this.scheduleAnswer()
      })
      .catch(() => undefined)
      .finally(() => {
        this.partialBusy = false
      })
  }

  ask(): void {
    this.clearAnswerTimer()
    void this.answer(true)
  }

  private addLine(speaker: Speaker, text: string): void {
    const line: TranscriptLine = { id: randomUUID(), speaker, text, at: Date.now() }
    this.lines = [...this.lines, line].slice(-MAX_LINES)
    delete this.partials[speaker]
    sendLiveEvent({ type: 'line', line })

    if (speaker === 'them' && getSettings().live.autoAnswer) this.scheduleAnswer()
  }

  private setPartial(speaker: Speaker, text: string): void {
    if (text) {
      this.partials[speaker] = text
    } else {
      delete this.partials[speaker]
    }
    sendLiveEvent({ type: 'partial', speaker, text })
  }

  private resetPartials(): void {
    this.partials = {}
    this.finalized = { them: 0, you: 0 }
  }

  private scheduleAnswer(): void {
    this.clearAnswerTimer()
    this.answerTimer = setTimeout(() => {
      this.answerTimer = null
      void this.answer()
    }, ANSWER_DELAY_MS)
  }

  private clearAnswerTimer(): void {
    if (this.answerTimer) clearTimeout(this.answerTimer)
    this.answerTimer = null
  }

  private latestTheirLine(): TranscriptLine | undefined {
    return [...this.lines].reverse().find((line) => line.speaker === 'them')
  }

  private async answer(force = false): Promise<void> {
    if (this.answering) {
      this.answerAgain = true
      return
    }
    const latest = this.latestTheirLine()
    if (!force && (!latest || latest.id === this.answeredLineId)) return
    this.answeredLineId = latest?.id ?? null
    this.answering = true
    const controller = new AbortController()
    this.controller = controller

    const settings = getSettings()
    const providerId = settings.activeProvider
    const config = settings.providers[providerId]
    const apiKey = getApiKey(providerId)
    const suggestion: Suggestion = { id: randomUUID(), question: latestQuestion(this.lines), text: '', at: Date.now(), streaming: true }
    this.suggestions = [...this.suggestions, suggestion].slice(-MAX_SUGGESTIONS)
    sendLiveEvent({ type: 'suggestion', suggestion: { ...suggestion } })

    try {
      if (KEY_REQUIRED[providerId] && !apiKey) throw new Error('Add an API key for this provider in Settings.')
      if (!config.model) throw new Error('Choose a model in Settings.')

      const request = {
        model: config.model,
        baseUrl: config.baseUrl,
        apiKey,
        turns: [{ role: 'user' as const, text: buildLivePrompt(settings.live.prompt, this.lines) }]
      }
      for await (const delta of streamChat(providers[providerId], request, controller.signal)) {
        suggestion.text += delta
        sendLiveEvent({ type: 'delta', id: suggestion.id, text: delta })
      }
    } catch (error) {
      if (!controller.signal.aborted) suggestion.error = describeError(error)
    } finally {
      suggestion.streaming = false
      if (this.controller === controller) this.controller = null
      sendLiveEvent({ type: 'suggestion', suggestion: { ...suggestion } })
      this.answering = false
      if (this.answerAgain && this.running) {
        this.answerAgain = false
        void this.answer()
      }
    }
  }

  private setStatus(status: LiveStatus): void {
    this.status = status
    sendLiveEvent({ type: 'status', status })
  }
}

export const liveSession = new LiveSession()
