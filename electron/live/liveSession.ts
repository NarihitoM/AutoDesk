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

const TURN_GAP_MS = 1500
const MAX_LINES = 400
const MAX_SUGGESTIONS = 20
const REPLY_MAX_TOKENS = 1024
const SPEAKERS: readonly Speaker[] = ['them', 'you']

type PerSpeaker<T> = Record<Speaker, T>

function perSpeaker<T>(value: T): PerSpeaker<T> {
  return { them: value, you: value }
}

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
  private controller: AbortController | null = null
  private running = false
  private run = 0
  private finalized = perSpeaker(0)
  private pending = perSpeaker(0)
  private speaking = perSpeaker(false)
  private turnTimers: Partial<PerSpeaker<ReturnType<typeof setTimeout>>> = {}
  private partialBusy = false
  private answering = false
  private answerAgain = false
  private answeredKey: string | null = null

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
    this.resetTurns()
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
    this.closeOpenLine()
    this.resetTurns()
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

  activity(speaker: Speaker, speaking: boolean): void {
    if (!this.running) return
    this.speaking[speaker] = speaking
    if (speaking) {
      this.clearTurnTimer(speaker)
    } else {
      this.scheduleTurnEnd(speaker)
    }
  }

  audio(speaker: Speaker, id: number, pcm: Int16Array): void {
    if (!this.running) return
    const run = this.run
    this.speaking[speaker] = false
    this.pending[speaker] += 1
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
          this.appendSpeech(speaker, text)
        } else {
          this.setPartial(speaker, '')
        }
      })
      .catch((error: unknown) => {
        if (run === this.run) this.setStatus({ kind: 'error', message: describeError(error) })
      })
      .finally(() => {
        if (run !== this.run) return
        this.pending[speaker] -= 1
        this.scheduleTurnEnd(speaker)
      })
  }

  partial(speaker: Speaker, id: number, pcm: Int16Array): void {
    const busy = this.partialBusy || this.pending.them + this.pending.you > 0
    if (!this.running || busy || id <= this.finalized[speaker]) return
    const run = this.run
    this.partialBusy = true
    whisperServer
      .transcribe(encodeWav(pcm))
      .then((raw) => {
        const text = cleanTranscript(raw)
        if (run === this.run && id > this.finalized[speaker] && text) this.setPartial(speaker, text)
      })
      .catch(() => undefined)
      .finally(() => {
        this.partialBusy = false
      })
  }

  ask(): void {
    void this.answer(true)
  }

  private appendSpeech(speaker: Speaker, text: string): void {
    delete this.partials[speaker]
    const last = this.lines.at(-1)
    if (last?.open && last.speaker === speaker) {
      this.replaceLine({ ...last, text: `${last.text} ${text}` })
      return
    }

    if (last?.open) this.endTurn(last.speaker)
    const line: TranscriptLine = { id: randomUUID(), speaker, text, at: Date.now(), open: true }
    this.lines = [...this.lines, line].slice(-MAX_LINES)
    sendLiveEvent({ type: 'line', line })
  }

  private replaceLine(line: TranscriptLine): void {
    this.lines = this.lines.map((existing) => (existing.id === line.id ? line : existing))
    sendLiveEvent({ type: 'line', line })
  }

  private openLineOf(speaker: Speaker): TranscriptLine | undefined {
    const last = this.lines.at(-1)
    return last?.open && last.speaker === speaker ? last : undefined
  }

  private closeOpenLine(): void {
    const last = this.lines.at(-1)
    if (last?.open) this.replaceLine({ ...last, open: false })
  }

  private scheduleTurnEnd(speaker: Speaker): void {
    this.clearTurnTimer(speaker)
    if (!this.running || this.speaking[speaker] || this.pending[speaker] > 0 || !this.openLineOf(speaker)) return
    this.turnTimers[speaker] = setTimeout(() => {
      delete this.turnTimers[speaker]
      this.endTurn(speaker)
    }, TURN_GAP_MS)
  }

  private endTurn(speaker: Speaker): void {
    this.clearTurnTimer(speaker)
    const line = this.openLineOf(speaker)
    if (!line) return
    this.replaceLine({ ...line, open: false })
    if (speaker === 'them' && getSettings().live.autoAnswer) void this.answer()
  }

  private clearTurnTimer(speaker: Speaker): void {
    const timer = this.turnTimers[speaker]
    if (timer) clearTimeout(timer)
    delete this.turnTimers[speaker]
  }

  private resetTurns(): void {
    for (const speaker of SPEAKERS) this.clearTurnTimer(speaker)
    this.partials = {}
    this.finalized = perSpeaker(0)
    this.pending = perSpeaker(0)
    this.speaking = perSpeaker(false)
  }

  private setPartial(speaker: Speaker, text: string): void {
    if (text) {
      this.partials[speaker] = text
    } else {
      delete this.partials[speaker]
    }
    sendLiveEvent({ type: 'partial', speaker, text })
  }

  private latestTheirKey(): string | null {
    const line = [...this.lines].reverse().find((candidate) => candidate.speaker === 'them')
    return line ? `${line.id}:${line.text.length}` : null
  }

  private async answer(force = false): Promise<void> {
    if (this.answering) {
      this.answerAgain = true
      return
    }
    const key = this.latestTheirKey()
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
        maxTokens: REPLY_MAX_TOKENS,
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
