import Markdown from 'react-markdown'
import type { Suggestion } from '@/shared/types/live'

interface SuggestionCardProps {
  suggestion: Suggestion
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  return (
    <article className="rounded-card border border-accent-strong/40 bg-accent-soft px-3.5 py-3">
      <header className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.06em] text-accent uppercase">AI suggestion</span>
        {suggestion.streaming && <span className="text-[11px] text-muted">Writing...</span>}
      </header>
      {suggestion.question && (
        <p className="mb-2 border-l-2 border-line-strong pl-2 text-[12.5px] text-muted">{suggestion.question}</p>
      )}
      {suggestion.text ? (
        <div className="markdown text-[13.5px]">
          <Markdown>{suggestion.text}</Markdown>
        </div>
      ) : (
        suggestion.streaming && <p className="text-[13px] text-muted">Thinking about a reply...</p>
      )}
      {suggestion.error && (
        <p className="mt-1 rounded-control bg-danger-soft px-2.5 py-1.5 text-[12.5px] text-danger">{suggestion.error}</p>
      )}
    </article>
  )
}
