import Markdown, { type Components } from 'react-markdown'
import type { PanelMessage } from '@/shared/types/ipc'

interface MessageItemProps {
  message: PanelMessage
  pending: boolean
}

const DOT_DELAYS = ['0s', '0.15s', '0.3s']

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

export function MessageItem({ message, pending }: MessageItemProps) {
  if (message.role === 'user') {
    return (
      <div className="mt-1 mb-2.5 ml-auto w-fit max-w-[88%] rounded-[10px_10px_3px_10px] bg-accent-soft px-3 py-2 break-words whitespace-pre-wrap">
        {message.text}
      </div>
    )
  }

  return (
    <div className="markdown mb-3.5">
      {message.note && (
        <div className="mb-1.5 inline-flex items-center rounded-full border border-line px-[9px] py-[3px] text-xs text-muted">
          {message.note}
        </div>
      )}
      {message.text && <Markdown components={markdownComponents}>{message.text}</Markdown>}
      {pending && !message.text && (
        <div className="flex gap-[5px] py-1.5" aria-label="Waiting for the answer">
          {DOT_DELAYS.map((delay) => (
            <span key={delay} className="size-1.5 animate-dot rounded-full bg-muted" style={{ animationDelay: delay }} />
          ))}
        </div>
      )}
      {message.error && (
        <div className="mt-1 rounded-control bg-danger-soft px-3 py-2 text-[13px] whitespace-pre-wrap text-danger">
          {message.error}
        </div>
      )}
    </div>
  )
}
