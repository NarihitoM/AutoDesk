import { asText, parseJson, pick } from '../lib/json'

const DEFAULT_TIMEOUT_MS = 10_000

export async function describeFailure(response: Response): Promise<string> {
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

async function send(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    const host = URL.canParse(url) ? new URL(url).host : url
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`${host} did not respond in time.`)
    }
    throw new Error(`Could not connect to ${host}. Check that it is running and the address is correct.`)
  }

  if (!response.ok) throw new Error(await describeFailure(response))
  const data: unknown = await response.json()
  return data
}

export function getJson(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  return send(url, { headers }, timeoutMs)
}

export function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  return send(
    url,
    { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) },
    timeoutMs
  )
}
