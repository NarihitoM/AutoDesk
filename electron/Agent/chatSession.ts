import { randomUUID } from 'node:crypto'
import type { PanelEvent, PanelMessage, PanelState } from '@/shared/types/ipc'
import type { ProviderConfig } from '@/shared/types/settings'
import { ImageNotSupportedError, streamChat } from './stream'
import { toDataUrl, type ChatImage, type ChatRequest, type ChatTurn, type VisionProvider } from './types'

export type ImageRoute =
  | { kind: 'direct'; fallback: string | null }
  | { kind: 'reader'; model: string }
  | { kind: 'unavailable' }

export interface SessionTarget {
  provider: VisionProvider
  config: ProviderConfig
  apiKey: string | null
  keyRequired: boolean
  route: ImageRoute
}

interface ImageDescription {
  model: string
  text: string
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong while talking to the AI provider.'
}

export function readerPrompt(question: string): string {
  return [
    'Describe this screenshot in full detail for someone who cannot see it and must answer a question about it.',
    'Transcribe all visible text exactly, including code, numbers, labels, and error messages.',
    'Describe the layout, any charts, tables, or diagrams, and anything else that matters.',
    'Do not answer or solve anything yourself.',
    '',
    `The question they will answer: ${question}`
  ].join('\n')
}

export function withDescription(question: string, description: ImageDescription): string {
  return [
    question,
    '',
    `The screenshot is not attached because you cannot read images. Here is a detailed description of it written by ${description.model}:`,
    '',
    description.text
  ].join('\n')
}

export class ChatSession {
  readonly id = randomUUID()
  private readonly messages: PanelMessage[] = []
  private controller: AbortController | null = null
  private description: ImageDescription | null = null

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
      await this.answer(target, reply, controller.signal)
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

  private async answer(target: SessionTarget, reply: PanelMessage, signal: AbortSignal): Promise<void> {
    const { route } = target
    if (!this.description) {
      if (route.kind === 'unavailable') {
        throw new Error(
          `${target.config.model} cannot read images, and no model from this provider can. Choose a model tagged Images, or set an image reader in Settings.`
        )
      }
      if (route.kind === 'reader') await this.readImage(target, route.model, reply, signal)
    }

    try {
      await this.streamReply(target, reply, signal)
    } catch (error) {
      const fallback = route.kind === 'direct' ? route.fallback : null
      const canFallBack = error instanceof ImageNotSupportedError && !this.description && !reply.text
      if (!canFallBack || fallback === null) throw error
      await this.readImage(target, fallback, reply, signal)
      await this.streamReply(target, reply, signal)
    }
  }

  private async readImage(target: SessionTarget, model: string, reply: PanelMessage, signal: AbortSignal): Promise<void> {
    this.setNote(reply, `Reading the screenshot with ${model}...`)
    const question = this.messages.find((message) => message.role === 'user')?.text ?? ''
    const request: ChatRequest = {
      model,
      baseUrl: target.config.baseUrl,
      apiKey: target.apiKey,
      reasoning: target.config.reasoning,
      turns: [{ role: 'user', text: readerPrompt(question), image: this.image }]
    }

    let text = ''
    try {
      for await (const delta of streamChat(target.provider, request, signal)) text += delta
    } catch (error) {
      if (signal.aborted) throw error
      throw new Error(`${model} could not read the screenshot. ${describeError(error)}`)
    }
    if (!text.trim()) throw new Error(`${model} returned an empty description of the screenshot.`)

    this.description = { model, text: text.trim() }
    this.setNote(reply, `Screenshot read by ${model}`)
  }

  private async streamReply(target: SessionTarget, reply: PanelMessage, signal: AbortSignal): Promise<void> {
    const request: ChatRequest = {
      model: target.config.model,
      baseUrl: target.config.baseUrl,
      apiKey: target.apiKey,
      reasoning: target.config.reasoning,
      turns: this.buildTurns(reply.id)
    }
    for await (const delta of streamChat(target.provider, request, signal)) {
      reply.text += delta
      this.emit({ type: 'delta', messageId: reply.id, text: delta })
    }
  }

  private setNote(reply: PanelMessage, note: string): void {
    reply.note = note
    this.emit({ type: 'note', messageId: reply.id, note })
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
      turns.push(turns.length === 0 ? this.firstTurn(message) : { role: message.role, text: message.text })
    }
    return turns
  }

  private firstTurn(message: PanelMessage): ChatTurn {
    if (this.description) return { role: message.role, text: withDescription(message.text, this.description) }
    return { role: message.role, text: message.text, image: this.image }
  }
}
