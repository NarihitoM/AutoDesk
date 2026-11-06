import { useEffect, useRef } from 'react'
import type { Suggestion, TranscriptLine } from '@/shared/types/live'
import { SuggestionCard } from './SuggestionCard'

interface ChatFeedProps {
  lines: readonly TranscriptLine[]
  suggestions: readonly Suggestion[]
  listening: boolean
}

type ChatItem = { kind: 'line'; at: number; line: TranscriptLine } | { kind: 'suggestion'; at: number; suggestion: Suggestion }

const STICK_TO_BOTTOM_PX = 80

function buildItems(lines: readonly TranscriptLine[], suggestions: readonly Suggestion[]): ChatItem[] {
  const items: ChatItem[] = [
    ...lines.map((line): ChatItem => ({ kind: 'line', at: line.at, line })),
    ...suggestions.map((suggestion): ChatItem => ({ kind: 'suggestion', at: suggestion.at, suggestion }))
  ]
  return items.sort((a, b) => a.at - b.at)
}

function Bubble({ line }: { line: TranscriptLine }) {
  const mine = line.speaker === 'you'
  return (
    <li className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      <span className={`px-1 text-[11px] font-semibold tracking-[0.04em] uppercase ${mine ? 'text-success' : 'text-accent'}`}>
        {mine ? 'You' : 'Them'}
      </span>
      <p
        className={`max-w-[85%] rounded-card px-3 py-2 text-[13.5px] leading-snug ${
          mine ? 'rounded-br-sm bg-accent-strong text-on-accent' : 'rounded-bl-sm border border-line bg-raised'
        }`}
      >
        {line.text}
      </p>
    </li>
  )
}

export function ChatFeed({ lines, suggestions, listening }: ChatFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const items = buildItems(lines, suggestions)
  const latestText = suggestions.at(-1)?.text.length ?? 0

  useEffect(() => {
    const element = scrollRef.current
    if (element && stickRef.current) element.scrollTop = element.scrollHeight
  }, [items.length, latestText])

  const onScroll = (): void => {
    const element = scrollRef.current
    if (!element) return
    stickRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < STICK_TO_BOTTOM_PX
  }

  return (
    <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] leading-relaxed text-muted">
          {listening
            ? 'Listening. What people say will appear here, and suggested replies show up when you are asked a question.'
            : 'Press Start to transcribe the conversation.'}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item) =>
            item.kind === 'line' ? (
              <Bubble key={item.line.id} line={item.line} />
            ) : (
              <li key={item.suggestion.id}>
                <SuggestionCard suggestion={item.suggestion} />
              </li>
            )
          )}
        </ol>
      )}
    </div>
  )
}
