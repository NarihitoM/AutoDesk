import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { bridge } from '@/shared/lib/bridge'

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
    <form className="flex items-end gap-2 border-t border-line px-3 pt-2.5 pb-3" onSubmit={onSubmit}>
      <textarea
        className="field-sizing-content max-h-[120px] min-h-9 flex-1 resize-none rounded-control border border-line bg-sunken px-[11px] py-2 leading-[1.4] outline-none focus:border-accent-strong"
        value={text}
        rows={1}
        placeholder="Ask a follow-up..."
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {streaming ? (
        <button
          type="button"
          className="h-9 rounded-control border border-line-strong bg-raised px-4 font-semibold hover:bg-hover"
          onClick={bridge.panel.stop}
        >
          Stop
        </button>
      ) : (
        <button
          type="submit"
          className="h-9 rounded-control bg-accent-strong px-4 font-semibold text-on-accent disabled:opacity-45"
          disabled={!text.trim()}
        >
          Send
        </button>
      )}
    </form>
  )
}
