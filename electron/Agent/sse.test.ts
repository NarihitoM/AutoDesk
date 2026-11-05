import { describe, expect, it } from 'vitest'
import { SseParser } from './sse'

function collect(chunks: string[]): string[] {
  const events: string[] = []
  const parser = new SseParser((data) => events.push(data))
  for (const chunk of chunks) parser.push(chunk)
  parser.end()
  return events
}

describe('SseParser', () => {
  it('parses complete events', () => {
    expect(collect(['data: one\n\ndata: two\n\n'])).toEqual(['one', 'two'])
  })

  it('handles chunks split in the middle of a line', () => {
    expect(collect(['da', 'ta: {"a":', '1}\n', '\nda', 'ta: x\n\n'])).toEqual(['{"a":1}', 'x'])
  })

  it('handles CRLF line endings split across chunks', () => {
    expect(collect(['data: one\r', '\n\r\n', 'data: two\r\n\r\n'])).toEqual(['one', 'two'])
  })

  it('joins multi-line data and ignores other fields and comments', () => {
    const stream = ': ping\nevent: message_start\nid: 7\ndata: a\ndata: b\n\n'
    expect(collect([stream])).toEqual(['a\nb'])
  })

  it('flushes a trailing event without a blank line', () => {
    expect(collect(['data: last'])).toEqual(['last'])
  })
})
