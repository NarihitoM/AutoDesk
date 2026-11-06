import { bridge } from '@/shared/lib/bridge'
import { isLiveActive, LIVE_STATUS_DOT, liveStatusLabel } from '@/shared/lib/liveStatus'
import { LIVE_HOTKEY_LABEL } from '@/shared/lib/providers'
import { useLiveStatus } from '../hooks/useLiveStatus'
import { styles } from './settingsClasses'

interface LiveLauncherProps {
  starting: boolean
  onStart(): void
}

export function LiveLauncher({ starting, onStart }: LiveLauncherProps) {
  const status = useLiveStatus()
  const active = isLiveActive(status)

  return (
    <section className={styles.section}>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[17px] font-semibold">Live assist</h2>
        <p className="text-muted">
          Click Start to open the live chat. It transcribes the call as people speak and suggests what to say when you
          are asked a question. Press {LIVE_HOTKEY_LABEL} any time for a suggestion.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-card border border-line bg-sunken px-3.5 py-3">
        <span className={`size-2.5 flex-none rounded-full ${LIVE_STATUS_DOT[status.kind]}`} />
        <span
          className={`min-w-0 flex-1 truncate text-[13px] ${status.kind === 'error' ? 'text-danger' : 'text-muted'}`}
          title={liveStatusLabel(status)}
        >
          {liveStatusLabel(status)}
        </span>
        {active ? (
          <>
            <button type="button" className={styles.secondaryButton} onClick={bridge.live.stop}>
              Stop
            </button>
            <button type="button" className={styles.primaryButton} onClick={bridge.live.launch}>
              Open chat
            </button>
          </>
        ) : (
          <button type="button" className={styles.primaryButton} disabled={starting} onClick={onStart}>
            Start
          </button>
        )}
      </div>

      <p className={styles.hint}>
        Audio is transcribed on this PC by a built-in speech model and is never uploaded. Only the transcript text is
        sent to the AI provider from the Settings tab. Use headphones so your mic does not pick up the other person.
      </p>
    </section>
  )
}
