import { asText, parseJson, pick } from '../lib/json'
import { SseParser } from './sse'
import type { ChatRequest, VisionProvider } from './types'

async function describeFailure(response: Response): Promise<string> {
  const body = await response.text().catch(() => '')
  const parsed = parseJson(body)
  const message =
    asText(pick(parsed, 'error', 'message')) ??
    asText(pick(parsed, 0, 'error', 'message')) ??
    asText(pick(parsed, 'error')) ??
    body.trim().slice(0, 300)
  const status = `${response.status} ${response.statusText}`.trim()
  return message ? `${status}: ${message}` : status
}

export async function* streamChat(
  provider: VisionProvider,
  request: ChatRequest,
  signal: AbortSignal
): AsyncGenerator<string> {
  const http = provider.buildRequest(request)
  const response = await fetch(http.url, {
    method: 'POST',
    headers: http.headers,
    body: JSON.stringify(http.body),
    signal
  })

  if (!response.ok) throw new Error(await describeFailure(response))
  if (!response.body) throw new Error('The provider returned an empty response.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const events: string[] = []
  const parser = new SseParser((data) => events.push(data))

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      parser.push(decoder.decode())
      parser.end()
    } else {
      parser.push(decoder.decode(value, { stream: true }))
    }

    for (const data of events.splice(0)) {
      const delta = provider.readDelta(data)
      if (delta) yield delta
    }

    if (done) return
  }
}
