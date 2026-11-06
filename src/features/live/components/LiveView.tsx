import { useEffect } from 'react'
import { bridge } from '@/shared/lib/bridge'
import type { LiveStatus } from '@/shared/types/live'
import { useLiveEvents } from '../hooks/useLiveEvents'
import { useLiveStore } from '../store/liveStore'
import { SuggestionCard } from './SuggestionCard'
import { TranscriptList } from './TranscriptList'

const GHOST_BUTTON =
  'h-7 rounded-control px-2.5 text-[12.5px] text-muted hover:enabled:bg-hover hover:enabled:text-fg disabled:opacity-40'

function statusLabel(status: LiveStatus): string {
  switch (status.kind) {
    case 'idle':
      return 'Stopped'
    case 'starting':
      return 'Starting speech engine...'
    case 'listening': {
      const sources = status.speakers.map((speaker) => (speaker === 'them' ? 'system audio' : 'mic'))
      return `Listening to ${sources.join(' and ')}`
    }
    case 'error':
      return status.message
  }
}

const STATUS_DOT: Record<LiveStatus['kind'], string> = {
  idle: 'bg-faint',
  starting: 'bg-accent animate-pulse',
  listening: 'bg-success animate-pulse',
  error: 'bg-danger'
}

export function LiveView() {
  useLiveEvents()
  const state = useLiveStore((store) => store.state)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') bridge.live.close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const status = state?.status ?? { kind: 'idle' }
  const active = status.kind === 'starting' || status.kind === 'listening'
  const suggestions = state?.suggestions ?? []
  const latest = suggestions.at(-1)
  const earlier = suggestions.slice(0, -1).reverse()

  return (
    <div className="flex h-full flex-col border border-line bg-surface">
      <header className="flex h-11 items-center justify-between gap-3 border-b border-line pr-2 pl-3.5 [-webkit-app-region:drag]">
        <span className="font-semibold tracking-[0.01em]">Live assist</span>
        <div className="flex gap-0.5 [-webkit-app-region:no-drag]">
          <button type="button" className={GHOST_BUTTON} onClick={bridge.live.close}>
            Close
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <span className={`size-2 flex-none rounded-full ${STATUS_DOT[status.kind]}`} />
        <span
          className={`min-w-0 flex-1 truncate text-[12.5px] ${status.kind === 'error' ? 'text-danger' : 'text-muted'}`}
          title={statusLabel(status)}
        >
          {statusLabel(status)}
        </span>
        {active ? (
          <button
            type="button"
            className="h-8 rounded-control border border-line-strong bg-raised px-3.5 text-[13px] font-semibold hover:bg-hover"
            onClick={bridge.live.stop}
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="h-8 rounded-control bg-accent-strong px-3.5 text-[13px] font-semibold text-on-accent"
            onClick={bridge.live.start}
          >
            Start
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {latest && (
          <section className="max-h-[55%] flex-none overflow-y-auto border-b border-line px-3.5 py-3">
            <SuggestionCard suggestion={latest} />
            {earlier.length > 0 && (
              <details className="mt-2.5">
                <summary className="cursor-pointer text-[12px] text-muted">Earlier suggestions ({earlier.length})</summary>
                <div className="mt-2 flex flex-col gap-2">
                  {earlier.map((suggestion) => (
                    <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                  ))}
                </div>
              </details>
            )}
          </section>
        )}

        <section className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
          <h2 className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-faint uppercase">Transcript</h2>
          <TranscriptList lines={state?.lines ?? []} listening={status.kind === 'listening'} />
        </section>
      </div>

      <footer className="flex items-center gap-2 border-t border-line px-3 pt-2.5 pb-3">
        <span className="min-w-0 flex-1 text-[12px] leading-snug text-faint">
          Use headphones so your mic does not pick up the other person.
        </span>
        <button
          type="button"
          className="h-9 flex-none rounded-control bg-accent-strong px-3.5 text-[13px] font-semibold whitespace-nowrap text-on-accent disabled:opacity-45"
          onClick={bridge.live.ask}
          disabled={!state || state.lines.length === 0}
          title={state ? `Shortcut: ${state.hotkey}` : undefined}
        >
          Ask AI{state ? ` (${state.hotkey})` : ''}
        </button>
      </footer>
    </div>
  )
}
