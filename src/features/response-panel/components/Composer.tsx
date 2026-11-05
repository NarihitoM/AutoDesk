import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { bridge } from '@/shared/lib/bridge'
import styles from './ResponsePanel.module.css'

interface ComposerProps {
  streaming: boolean
}

export function Composer({ streaming }: ComposerProps) {
  const [text, setText] = useState('')

  const submit = (): void => {
    const value = text.trim()
    if (!value || streaming) return
    bridge.panel.ask(value)
    setText('')
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    submit()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className={styles.composer} onSubmit={onSubmit}>
      <textarea
        className={styles.input}
        value={text}
        rows={1}
        placeholder="Ask a follow-up..."
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {streaming ? (
        <button type="button" className={styles.secondaryButton} onClick={bridge.panel.stop}>
          Stop
        </button>
      ) : (
        <button type="submit" className={styles.primaryButton} disabled={!text.trim()}>
          Send
        </button>
      )}
    </form>
  )
}
