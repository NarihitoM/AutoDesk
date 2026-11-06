import { useEffect, useRef, useState } from 'react'
import banner from '@/shared/assets/autodesk-banner.png'
import { bridge } from '@/shared/lib/bridge'
import { usePanelEvents } from '../hooks/usePanelEvents'
import { usePanelStore } from '../store/panelStore'
import { Composer } from './Composer'
import { MessageItem } from './MessageItem'

const COPIED_RESET_MS = 1500
const GHOST_BUTTON = 'h-7 rounded-control px-2.5 text-[12.5px] text-muted hover:enabled:bg-hover hover:enabled:text-fg disabled:opacity-40'

export function ResponsePanel() {
  usePanelEvents()
  const state = usePanelStore((store) => store.state)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const lastMessage = state?.messages.at(-1)
  const lastAnswer = state?.messages.findLast((message) => message.role === 'assistant' && message.text)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') bridge.panel.close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [lastMessage?.text, state?.messages.length])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const copyAnswer = (): void => {
    if (!lastAnswer) return
    void navigator.clipboard.writeText(lastAnswer.text).then(() => setCopied(true))
  }

  return (
    <div className="flex h-full flex-col border border-line bg-surface">
      <header className="flex h-11 items-center justify-between gap-3 border-b border-line pr-2 pl-3.5 [-webkit-app-region:drag]">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="font-semibold tracking-[0.01em]">AutoDesk</span>
          {state && <span className="truncate text-xs text-faint">{state.model}</span>}
        </div>
        <div className="flex gap-0.5 [-webkit-app-region:no-drag]">
          <button type="button" className={GHOST_BUTTON} onClick={copyAnswer} disabled={!lastAnswer}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className={GHOST_BUTTON} onClick={bridge.panel.close} aria-label="Close">
            Close
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-[18px]" ref={scrollRef}>
        {state ? (
          <>
            <img
              className="mb-3.5 block max-h-[140px] max-w-full rounded-control border border-line bg-sunken object-contain"
              src={state.image} alt="Captured area" />
            {state.messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                pending={state.streaming && message.id === lastMessage?.id}
              />
            ))}
          </>
        ) : (
          <div className="mx-3 my-8 text-center leading-relaxed text-muted">
            <img className="mx-auto mb-3 block h-auto w-full max-w-[280px]" src={banner} alt="AutoDesk" />
            <p>Hold the capture key and drag over your screen to ask about it.</p>
          </div>
        )}
      </div>

      {state && <Composer streaming={state.streaming} />}
    </div>
  )
}
