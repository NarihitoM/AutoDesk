import { randomUUID } from 'node:crypto'
import { globalShortcut } from 'electron'
import { KEY_REQUIRED, LIVE_HOTKEY, LIVE_HOTKEY_LABEL } from '@/shared/lib/providers'
import type { ListenerStatus, LiveState, LiveStatus, Suggestion, TranscriptLine } from '@/shared/types/live'
import type { ReasoningLevel } from '@/shared/types/settings'
import { providers } from '../Agent/providers'
import { streamChat } from '../Agent/stream'
import { getApiKey, getSettings } from '../settings/settingsStore'
import { cleanTranscript } from '../speech/transcript'
import { encodeWav } from '../speech/wav'
import { whisperServer } from '../speech/whisperServer'
import { sendListenerCommand, sendLiveEvent } from '../tools/windows'
import { buildLivePrompt, latestQuestion } from './livePrompt'

const TURN_GAP_MS = 1500
const MAX_LINES = 400
const MAX_SUGGESTIONS = 20
const REPLY_MAX_TOKENS: Record<ReasoningLevel, number> = {
  default: 1024,
  off: 1024,
  low: 2048,
  medium: 4096,
  high: 8192
}
const EMPTY_REPLY =
  'The model sent back no answer. Thinking models can use the whole reply on reasoning. Set Reasoning to Off in Settings, or choose a model that answers directly.'

function describeError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong.'
}

class LiveSession {
  private status: LiveStatus = { kind: 'idle' }
  private lines: TranscriptLine[] = []
  private partialText = ''
  private suggestions: Suggestion[] = []
  private queue: Promise<void> = Promise.resolve()
  private controller: AbortController | null = null
  private running = false
  private run = 0
  private finalized = 0
  private pending = 0
  private speaking = false
  private turnTimer: ReturnType<typeof setTimeout> | null = null
  private partialBusy = false
  private answering = false
  private answerAgain = false
  private answeredKey: string | null = null

  snapshot(): LiveState {
    return {
      status: this.status,
      lines: [...this.lines],
      partial: this.partialText,
      suggestions: this.suggestions.map((suggestion) => ({ ...suggestion })),
      hotkey: LIVE_HOTKEY_LABEL
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    const { live } = getSettings()

    this.running = true
    this.run += 1
    this.resetTurn()
    this.setStatus({ kind: 'starting' })
    try {
      await whisperServer.start(live.language)
    } catch (error) {
      this.running = false
      this.setStatus({ kind: 'error', message: describeError(error) })
      return
    }
    if (!this.running) return

    sendListenerCommand({ type: 'start' })
    if (!globalShortcut.isRegistered(LIVE_HOTKEY)) globalShortcut.register(LIVE_HOTKEY, () => this.ask())
  }

  stop(): void {
    const wasActive = this.running || this.status.kind !== 'idle'
    this.running = false
    this.run += 1
    this.resetTurn()
    this.answerAgain = false
    this.controller?.abort()
    sendListenerCommand({ type: 'stop' })
    whisperServer.stop()
    globalShortcut.unregister(LIVE_HOTKEY)
    this.clearHistory()
    if (wasActive) this.setStatus({ kind: 'idle' })
  }

  private clearHistory(): void {
    this.lines = []
    this.suggestions = []
    this.answeredKey = null
    sendLiveEvent({ type: 'snapshot', state: this.snapshot() })
  }

  listenerStatus(status: ListenerStatus): void {
    if (!this.running) return
    if (status.ok) {
      this.setStatus({ kind: 'listening' })
    } else {
      this.setStatus({ kind: 'error', message: status.message ?? 'Could not listen to system audio.' })
    }
  }

  activity(speaking: boolean): void {
    if (!this.running) return
    this.speaking = speaking
    if (speaking) {
      this.clearTurnTimer()
    } else {
      this.scheduleTurnEnd()
    }
  }

  audio(id: number, pcm: Int16Array): void {
    if (!this.running) return
    const run = this.run
    this.speaking = false
    this.pending += 1
    this.queue = this.queue
      .then(async () => {
        if (run !== this.run) return
        const text = cleanTranscript(await whisperServer.transcribe(encodeWav(pcm)))
        if (run !== this.run) return
        this.finalized = Math.max(this.finalized, id)
        if (this.status.kind === 'error') this.setStatus({ kind: 'listening' })
        if (text) {
          this.appendSpeech(text)
        } else {
          this.setPartial('')
        }
      })
      .catch((error: unknown) => {
        if (run === this.run) this.setStatus({ kind: 'error', message: describeError(error) })
      })
      .finally(() => {
        if (run !== this.run) return
        this.pending -= 1
        this.scheduleTurnEnd()
      })
  }

  partial(id: number, pcm: Int16Array): void {
    if (!this.running || this.partialBusy || this.pending > 0 || id <= this.finalized) return
    const run = this.run
    this.partialBusy = true
    whisperServer
      .transcribe(encodeWav(pcm))
      .then((raw) => {
        const text = cleanTranscript(raw)
        if (run === this.run && id > this.finalized && text) this.setPartial(text)
      })
      .catch(() => undefined)
      .finally(() => {
        this.partialBusy = false
      })
  }

  ask(): void {
    void this.answer(true)
  }

  private appendSpeech(text: string): void {
    this.partialText = ''
    const open = this.openLine()
    if (open) {
      this.replaceLine({ ...open, text: `${open.text} ${text}` })
      return
    }

    const line: TranscriptLine = { id: randomUUID(), text, at: Date.now(), open: true }
    this.lines = [...this.lines, line].slice(-MAX_LINES)
    sendLiveEvent({ type: 'line', line })
  }

  private replaceLine(line: TranscriptLine): void {
    this.lines = this.lines.map((existing) => (existing.id === line.id ? line : existing))
    sendLiveEvent({ type: 'line', line })
  }

  private openLine(): TranscriptLine | undefined {
    const last = this.lines.at(-1)
    return last?.open ? last : undefined
  }

  private closeOpenLine(): void {
    const open = this.openLine()
    if (open) this.replaceLine({ ...open, open: false })
  }

  private scheduleTurnEnd(): void {
    this.clearTurnTimer()
    if (!this.running || this.speaking || this.pending > 0 || !this.openLine()) return
    this.turnTimer = setTimeout(() => {
      this.turnTimer = null
      this.endTurn()
    }, TURN_GAP_MS)
  }

  private endTurn(): void {
    this.clearTurnTimer()
    if (!this.openLine()) return
    this.closeOpenLine()
    if (getSettings().live.autoAnswer) void this.answer()
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) clearTimeout(this.turnTimer)
    this.turnTimer = null
  }

  private resetTurn(): void {
    this.clearTurnTimer()
    this.partialText = ''
    this.finalized = 0
    this.pending = 0
    this.speaking = false
  }

  private setPartial(text: string): void {
    this.partialText = text
    sendLiveEvent({ type: 'partial', text })
  }

  private latestKey(): string | null {
    const line = this.lines.at(-1)
    return line ? `${line.id}:${line.text.length}` : null
  }

  private async answer(force = false): Promise<void> {
    if (this.answering) {
      this.answerAgain = true
      return
    }
    const key = this.latestKey()
    if (!force && (!key || key === this.answeredKey)) return
    this.answeredKey = key
    this.answering = true
    const controller = new AbortController()
    this.controller = controller

    const settings = getSettings()
    const providerId = settings.activeProvider
    const config = settings.providers[providerId]
    const apiKey = getApiKey(providerId)
    const suggestion: Suggestion = {
      id: randomUUID(),
      question: latestQuestion(this.lines),
      text: '',
      at: Date.now(),
      streaming: true
    }
    this.suggestions = [...this.suggestions, suggestion].slice(-MAX_SUGGESTIONS)
    sendLiveEvent({ type: 'suggestion', suggestion: { ...suggestion } })

    try {
      if (KEY_REQUIRED[providerId] && !apiKey) throw new Error('Add an API key for this provider in Settings.')
      if (!config.model) throw new Error('Choose a model in Settings.')

      const request = {
        model: config.model,
        baseUrl: config.baseUrl,
        apiKey,
        maxTokens: REPLY_MAX_TOKENS[config.reasoning],
        reasoning: config.reasoning,
        turns: [{ role: 'user' as const, text: buildLivePrompt(settings.live.prompt, this.lines) }]
      }
      for await (const delta of streamChat(providers[providerId], request, controller.signal)) {
        suggestion.text += delta
        sendLiveEvent({ type: 'delta', id: suggestion.id, text: delta })
      }
      if (!suggestion.text.trim()) suggestion.error = EMPTY_REPLY
    } catch (error) {
      if (!controller.signal.aborted) suggestion.error = describeError(error)
    } finally {
      suggestion.streaming = false
      if (this.controller === controller) this.controller = null
      if (this.suggestions.includes(suggestion)) sendLiveEvent({ type: 'suggestion', suggestion: { ...suggestion } })
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
