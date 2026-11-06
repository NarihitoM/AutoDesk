import { useEffect } from 'react'
import { bridge } from '@/shared/lib/bridge'
import { isLiveActive, LIVE_STATUS_DOT, liveStatusLabel } from '@/shared/lib/liveStatus'
import { useLiveEvents } from '../hooks/useLiveEvents'
import { useLiveStore } from '../store/liveStore'
import { ChatFeed } from './ChatFeed'

const GHOST_BUTTON =
  'h-7 rounded-control px-2.5 text-[12.5px] text-muted hover:enabled:bg-hover hover:enabled:text-fg disabled:opacity-40'

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
  const active = isLiveActive(status)

  return (
    <div className="flex h-full flex-col border border-line bg-surface">
      <header className="flex h-11 items-center justify-between gap-3 border-b border-line pr-2 pl-3.5 [-webkit-app-region:drag]">
        <span className="font-semibold tracking-[0.01em]">Live chat</span>
        <div className="flex gap-0.5 [-webkit-app-region:no-drag]">
          <button type="button" className={GHOST_BUTTON} onClick={bridge.live.close}>
            Close
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <span className={`size-2 flex-none rounded-full ${LIVE_STATUS_DOT[status.kind]}`} />
        <span
          className={`min-w-0 flex-1 truncate text-[12.5px] ${status.kind === 'error' ? 'text-danger' : 'text-muted'}`}
          title={liveStatusLabel(status)}
        >
          {liveStatusLabel(status)}
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

      <ChatFeed
        lines={state?.lines ?? []}
        partial={state?.partial ?? ''}
        suggestions={state?.suggestions ?? []}
        listening={status.kind === 'listening'}
      />
    </div>
  )
}
