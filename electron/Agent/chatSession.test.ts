import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PanelEvent } from '@/shared/types/ipc'
import { ChatSession, type ImageRoute, type SessionTarget } from './chatSession'
import { openAiProvider } from './providers/openai'

interface SentRequest {
  model: string
  hasImage: boolean
  text: string
}

function sseResponse(text: string): Response {
  const body = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

function readRequest(init: RequestInit | undefined): SentRequest {
  const body: unknown = JSON.parse(String(init?.body))
  const payload = body as { model: string; messages: { content: unknown }[] }
  const first = payload.messages[0]?.content
  const parts = Array.isArray(first) ? (first as { type: string; text?: string }[]) : []
  return {
    model: payload.model,
    hasImage: parts.some((part) => part.type === 'image_url'),
    text: typeof first === 'string' ? first : (parts.find((part) => part.type === 'text')?.text ?? '')
  }
}

function setup(route: ImageRoute, respond: (request: SentRequest) => Response) {
  const sent: SentRequest[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      const request = readRequest(init)
      sent.push(request)
      return respond(request)
    })
  )
  const events: PanelEvent[] = []
  const session = new ChatSession({ mediaType: 'image/png', base64: 'AAAA' }, 'text-model', (event) => events.push(event))
  const target: SessionTarget = {
    provider: openAiProvider,
    config: { model: 'text-model', imageModel: '', baseUrl: 'https://example.test/v1' },
    apiKey: 'key',
    keyRequired: true,
    route
  }
  return { session, target, sent, events }
}

const rejectImages = (request: SentRequest): Response =>
  request.hasImage && request.model === 'text-model'
    ? new Response(JSON.stringify({ error: { message: 'messages[0].content must be a string' } }), { status: 400 })
    : sseResponse(request.model === 'vision-model' ? 'A login form with an error.' : 'Here is the fix.')

describe('ChatSession image routing', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends the image straight to a model that reads images', async () => {
    const { session, target, sent } = setup({ kind: 'direct', fallback: null }, () => sseResponse('Answer'))
    await session.ask('Explain', target)
    expect(sent).toEqual([{ model: 'text-model', hasImage: true, text: 'Explain' }])
    expect(session.snapshot().messages[1]?.text).toBe('Answer')
  })

  it('has a vision model describe the screenshot for a text-only model', async () => {
    const { session, target, sent, events } = setup({ kind: 'reader', model: 'vision-model' }, rejectImages)
    await session.ask('Explain', target)

    expect(sent.map((request) => `${request.model}:${request.hasImage}`)).toEqual(['vision-model:true', 'text-model:false'])
    expect(sent[1]?.text).toContain('A login form with an error.')
    expect(session.snapshot().messages[1]).toMatchObject({ text: 'Here is the fix.', note: 'Screenshot read by vision-model' })
    expect(events.some((event) => event.type === 'note')).toBe(true)
  })

  it('falls back to the image reader when the model rejects the image', async () => {
    const { session, target, sent } = setup({ kind: 'direct', fallback: 'vision-model' }, rejectImages)
    await session.ask('Explain', target)

    expect(sent.map((request) => `${request.model}:${request.hasImage}`)).toEqual([
      'text-model:true',
      'vision-model:true',
      'text-model:false'
    ])
    expect(session.snapshot().messages[1]?.text).toBe('Here is the fix.')
  })

  it('reuses the description for follow-up questions', async () => {
    const { session, target, sent } = setup({ kind: 'reader', model: 'vision-model' }, rejectImages)
    await session.ask('Explain', target)
    await session.ask('And then?', target)

    expect(sent.map((request) => request.model)).toEqual(['vision-model', 'text-model', 'text-model'])
    expect(sent[2]?.hasImage).toBe(false)
    expect(sent[2]?.text).toContain('A login form with an error.')
  })

  it('explains when no model can read the screenshot', async () => {
    const { session, target, sent } = setup({ kind: 'unavailable' }, () => sseResponse('unused'))
    await session.ask('Explain', target)
    expect(sent).toEqual([])
    expect(session.snapshot().messages[1]?.error).toMatch(/cannot read images, and no model from this provider can/)
  })
})
