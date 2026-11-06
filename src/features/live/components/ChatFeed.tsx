import { useEffect, useRef } from 'react'
import type { Suggestion, TranscriptLine } from '@/shared/types/live'
import { AiReply } from './AiReply'

interface ChatFeedProps {
  lines: readonly TranscriptLine[]
  partial: string
  suggestions: readonly Suggestion[]
  listening: boolean
}

type ChatItem = { kind: 'line'; at: number; line: TranscriptLine } | { kind: 'reply'; at: number; reply: Suggestion }

const STICK_TO_BOTTOM_PX = 80

function buildItems(lines: readonly TranscriptLine[], replies: readonly Suggestion[]): ChatItem[] {
  const items: ChatItem[] = [
    ...lines.map((line): ChatItem => ({ kind: 'line', at: line.at, line })),
    ...replies.map((reply): ChatItem => ({ kind: 'reply', at: reply.at, reply }))
  ]
  return items.sort((a, b) => a.at - b.at)
}

interface SpeechBubbleProps {
  text: string
  pending?: string
}

function SpeechBubble({ text, pending }: SpeechBubbleProps) {
  return (
    <li className="flex flex-col items-end gap-1">
      <span className="px-1 text-[11px] font-semibold tracking-[0.04em] text-accent uppercase">You</span>
      <p className="max-w-[85%] rounded-card rounded-br-sm bg-accent-strong px-3 py-2 text-[13.5px] leading-snug text-on-accent">
        {text}
        {pending && (
          <>
            {text && ' '}
            <span className="opacity-65">{pending}</span>
            <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-current" />
          </>
        )}
      </p>
    </li>
  )
}

export function ChatFeed({ lines, partial, suggestions, listening }: ChatFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const items = buildItems(lines, suggestions)
  const latestReply = suggestions.at(-1)?.text.length ?? 0
  const lastLine = lines.at(-1)
  const merged = lastLine?.open && partial ? lastLine : undefined

  useEffect(() => {
    const element = scrollRef.current
    if (element && stickRef.current) element.scrollTop = element.scrollHeight
  }, [items.length, latestReply, partial, lastLine?.text])

  const onScroll = (): void => {
    const element = scrollRef.current
    if (!element) return
    stickRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < STICK_TO_BOTTOM_PX
  }

  const empty = items.length === 0 && partial === ''

  return (
    <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
      {empty ? (
        <p className="px-4 py-10 text-center text-[13px] leading-relaxed text-muted">
          {listening
            ? 'Listening. What your computer plays appears here as it is spoken, and the AI replies when the audio pauses.'
            : 'Press Start to transcribe your computer audio.'}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item) =>
            item.kind === 'line' ? (
              <SpeechBubble
                key={item.line.id}
                text={item.line.text}
                pending={item.line === merged ? partial : undefined}
              />
            ) : (
              <AiReply key={item.reply.id} reply={item.reply} />
            )
          )}
          {partial && !merged && <SpeechBubble key="live" text="" pending={partial} />}
        </ol>
      )}
    </div>
  )
}
