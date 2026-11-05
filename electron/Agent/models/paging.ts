import { asArray, asText, pick } from '../../lib/json'
import { getJson } from '../http'
import { joinUrl } from '../types'

const MAX_PAGES = 20

export async function fetchModelPages(
  baseUrl: string,
  path: string,
  headers: Record<string, string>,
  cursorParam: string
): Promise<unknown[]> {
  const items: unknown[] = []
  let cursor: string | null = null

  for (let page = 0; page < MAX_PAGES; page++) {
    const separator = path.includes('?') ? '&' : '?'
    const query = cursor ? `${separator}${cursorParam}=${encodeURIComponent(cursor)}` : ''
    const payload = await getJson(joinUrl(baseUrl, `${path}${query}`), headers)
    const data = asArray(pick(payload, 'data'))
    items.push(...data)

    const next = asText(pick(payload, 'last_id')) ?? asText(pick(data.at(-1), 'id'))
    if (pick(payload, 'has_more') !== true || !next || next === cursor) break
    cursor = next
  }

  return items
}
