import { useEffect, useRef } from 'react'
import type { TranscriptLine } from '@/shared/types/live'

interface TranscriptListProps {
  lines: readonly TranscriptLine[]
  listening: boolean
}

const SPEAKER_STYLES = {
  them: { label: 'Them', className: 'text-accent' },
  you: { label: 'You', className: 'text-success' }
} as const

export function TranscriptList({ lines, listening }: TranscriptListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [lines.length])

  if (lines.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-[13px] leading-relaxed text-muted">
        {listening ? 'Listening. What people say will appear here.' : 'Press Start to transcribe the conversation.'}
      </p>
    )
  }

  return (
    <ol className="flex flex-col gap-2">
      {lines.map((line) => {
        const speaker = SPEAKER_STYLES[line.speaker]
        return (
          <li key={line.id} className="text-[13px] leading-snug">
            <span className={`mr-1.5 text-[11px] font-semibold tracking-[0.04em] uppercase ${speaker.className}`}>
              {speaker.label}
            </span>
            <span>{line.text}</span>
          </li>
        )
      })}
      <div ref={endRef} />
    </ol>
  )
}
