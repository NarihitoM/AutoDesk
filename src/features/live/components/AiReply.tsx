import Markdown from 'react-markdown'
import type { Suggestion } from '@/shared/types/live'

const DOT_DELAYS = ['0ms', '160ms', '320ms']

interface AiReplyProps {
  reply: Suggestion
}

export function AiReply({ reply }: AiReplyProps) {
  return (
    <li className="flex flex-col items-start gap-1">
      <span className="px-1 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">AI</span>
      <div className="max-w-[92%] rounded-card rounded-bl-sm border border-line bg-sunken px-3 py-2">
        {reply.text ? (
          <div className="markdown text-[13.5px]">
            <Markdown>{reply.text}</Markdown>
          </div>
        ) : (
          reply.streaming && (
            <span className="flex gap-[5px] py-1.5" aria-label="AI is replying">
              {DOT_DELAYS.map((delay) => (
                <span key={delay} className="size-1.5 animate-dot rounded-full bg-muted" style={{ animationDelay: delay }} />
              ))}
            </span>
          )
        )}
        {reply.error && (
          <p className="mt-1 rounded-control bg-danger-soft px-2.5 py-1.5 text-[12.5px] text-danger">{reply.error}</p>
        )}
      </div>
    </li>
  )
}
