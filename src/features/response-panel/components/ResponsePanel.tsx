import { useEffect, useRef, useState } from 'react'
import banner from '@/shared/assets/autodesk-banner.png'
import { bridge } from '@/shared/lib/bridge'
import { usePanelEvents } from '../hooks/usePanelEvents'
import { usePanelStore } from '../store/panelStore'
import { Composer } from './Composer'
import { MessageItem } from './MessageItem'
import styles from './ResponsePanel.module.css'

const COPIED_RESET_MS = 1500

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
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span className={styles.brand}>AutoDesk</span>
          {state && <span className={styles.model}>{state.model}</span>}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.ghostButton} onClick={copyAnswer} disabled={!lastAnswer}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" className={styles.ghostButton} onClick={bridge.panel.close} aria-label="Close">
            Close
          </button>
        </div>
      </header>

      <div className={styles.body} ref={scrollRef}>
        {state ? (
          <>
            <img className={styles.capture} src={state.image} alt="Captured area" />
            {state.messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                pending={state.streaming && message.id === lastMessage?.id}
              />
            ))}
          </>
        ) : (
          <div className={styles.empty}>
            <img className={styles.emptyBanner} src={banner} alt="AutoDesk" />
            <p>Hold the capture key and drag over your screen to ask about it.</p>
          </div>
        )}
      </div>

      {state && <Composer streaming={state.streaming} />}
    </div>
  )
}
