import Markdown, { type Components } from 'react-markdown'
import type { PanelMessage } from '@/shared/types/ipc'
import styles from './ResponsePanel.module.css'

interface MessageItemProps {
  message: PanelMessage
  pending: boolean
}

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

export function MessageItem({ message, pending }: MessageItemProps) {
  if (message.role === 'user') {
    return <div className={styles.question}>{message.text}</div>
  }

  return (
    <div className={styles.answer}>
      {message.note && <div className={styles.note}>{message.note}</div>}
      {message.text && <Markdown components={markdownComponents}>{message.text}</Markdown>}
      {pending && !message.text && (
        <div className={styles.thinking} aria-label="Waiting for the answer">
          <span />
          <span />
          <span />
        </div>
      )}
      {message.error && <div className={styles.error}>{message.error}</div>}
    </div>
  )
}
