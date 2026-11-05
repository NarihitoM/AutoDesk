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

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(await describeFailure(response))
  const data: unknown = await response.json()
  return data
}

export async function getJson(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) })
  return readJson(response)
}

export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  })
  return readJson(response)
}
