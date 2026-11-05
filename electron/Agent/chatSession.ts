import { randomUUID } from 'node:crypto'
import type { PanelEvent, PanelMessage, PanelState } from '@/shared/types/ipc'
import type { ProviderConfig } from '@/shared/types/settings'
import { streamChat } from './stream'
import { toDataUrl, type ChatImage, type ChatTurn, type VisionProvider } from './types'

export interface SessionTarget {
  provider: VisionProvider
  config: ProviderConfig
  apiKey: string | null
  keyRequired: boolean
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong while talking to the AI provider.'
}

export class ChatSession {
  readonly id = randomUUID()
  private readonly messages: PanelMessage[] = []
  private controller: AbortController | null = null

  constructor(
    private readonly image: ChatImage,
    private model: string,
    private readonly emit: (event: PanelEvent) => void
  ) {}

  get streaming(): boolean {
    return this.controller !== null
  }

  snapshot(): PanelState {
    return {
      sessionId: this.id,
      image: toDataUrl(this.image),
      model: this.model,
      messages: this.messages.map((message) => ({ ...message })),
      streaming: this.streaming
    }
  }

  async ask(text: string, target: SessionTarget): Promise<void> {
    if (this.streaming) return

    const question: PanelMessage = { id: randomUUID(), role: 'user', text }
    const reply: PanelMessage = { id: randomUUID(), role: 'assistant', text: '' }
    this.messages.push(question, reply)
    this.model = target.config.model
    this.emit({ type: 'message', message: { ...question } })
    this.emit({ type: 'message', message: { ...reply } })

    const controller = new AbortController()
    this.controller = controller

    try {
      if (target.keyRequired && !target.apiKey) {
        throw new Error('Add an API key for this provider in Settings (tray icon > Settings).')
      }
      if (!target.config.model) {
        throw new Error('Choose a model in Settings (tray icon > Settings).')
      }
      const turns = this.buildTurns(reply.id)
      const request = { model: target.config.model, baseUrl: target.config.baseUrl, apiKey: target.apiKey, turns }
      for await (const delta of streamChat(target.provider, request, controller.signal)) {
        reply.text += delta
        this.emit({ type: 'delta', messageId: reply.id, text: delta })
      }
      this.finish(reply)
    } catch (error) {
      if (controller.signal.aborted) {
        this.finish(reply, reply.text ? undefined : 'Stopped.')
      } else {
        this.finish(reply, describeError(error))
      }
    }
  }

  stop(): void {
    this.controller?.abort()
  }

  private finish(reply: PanelMessage, error?: string): void {
    this.controller = null
    if (error) reply.error = error
    this.emit({ type: 'done', messageId: reply.id, error })
  }

  private buildTurns(pendingId: string): ChatTurn[] {
    const turns: ChatTurn[] = []
    for (const message of this.messages) {
      if (message.id === pendingId) continue
      if (message.role === 'assistant' && (message.error || !message.text)) continue

      const last = turns.at(-1)
      if (last && last.role === message.role) {
        last.text = `${last.text}\n\n${message.text}`
        continue
      }
      turns.push(
        turns.length === 0
          ? { role: message.role, text: message.text, image: this.image }
          : { role: message.role, text: message.text }
      )
    }
    return turns
  }
}
