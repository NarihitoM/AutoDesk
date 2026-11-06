import { randomUUID } from 'node:crypto'
import { globalShortcut } from 'electron'
import { KEY_REQUIRED, LIVE_HOTKEY, LIVE_HOTKEY_LABEL } from '@/shared/lib/providers'
import type { ListenerStatus, LiveState, LiveStatus, Speaker, Suggestion, TranscriptLine } from '@/shared/types/live'
import { providers } from '../Agent/providers'
import { streamChat } from '../Agent/stream'
import { getApiKey, getSettings } from '../settings/settingsStore'
import { cleanTranscript, looksLikeQuestion } from '../speech/transcript'
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
  private suggestions: Suggestion[] = []
  private speakers = new Set<Speaker>()
  private queue: Promise<void> = Promise.resolve()
  private answerTimer: ReturnType<typeof setTimeout> | null = null
  private controller: AbortController | null = null
  private running = false

  snapshot(): LiveState {
    return {
      status: this.status,
      lines: [...this.lines],
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
    this.speakers.clear()
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
    this.speakers.clear()
    this.clearAnswerTimer()
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

  audio(speaker: Speaker, pcm: Int16Array): void {
    if (!this.running) return
    this.queue = this.queue
      .then(async () => {
        if (!this.running) return
        const text = cleanTranscript(await whisperServer.transcribe(encodeWav(pcm)))
        if (!this.running) return
        if (this.status.kind === 'error' && this.speakers.size > 0) {
          this.setStatus({ kind: 'listening', speakers: [...this.speakers] })
        }
        if (text) this.addLine(speaker, text)
      })
      .catch((error: unknown) => {
        if (this.running) this.setStatus({ kind: 'error', message: describeError(error) })
      })
  }

  ask(): void {
    this.clearAnswerTimer()
    void this.answer()
  }

  private addLine(speaker: Speaker, text: string): void {
    const line: TranscriptLine = { id: randomUUID(), speaker, text, at: Date.now() }
    this.lines = [...this.lines, line].slice(-MAX_LINES)
    sendLiveEvent({ type: 'line', line })

    if (speaker !== 'them' || !getSettings().live.autoAnswer) return
    if (looksLikeQuestion(text) || this.answerTimer) this.scheduleAnswer()
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

  private async answer(): Promise<void> {
    this.controller?.abort()
    const controller = new AbortController()
    this.controller = controller

    const settings = getSettings()
    const providerId = settings.activeProvider
    const config = settings.providers[providerId]
    const apiKey = getApiKey(providerId)
    const suggestion: Suggestion = { id: randomUUID(), question: latestQuestion(this.lines), text: '', streaming: true }
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
    }
  }

  private setStatus(status: LiveStatus): void {
    this.status = status
    sendLiveEvent({ type: 'status', status })
  }
}

export const liveSession = new LiveSession()
