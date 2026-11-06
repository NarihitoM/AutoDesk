import banner from '@/shared/assets/autodesk-banner.png'
import type { AppTab } from '@/shared/types/ipc'
import { useAppTab } from '../hooks/useAppTab'
import { useSettings } from '../hooks/useSettings'
import { SettingsForm } from './SettingsForm'
import { styles } from './settingsClasses'

const TABS: readonly { id: AppTab; label: string; subtitle: string }[] = [
  { id: 'settings', label: 'Settings', subtitle: 'Choose which AI answers your screenshots and how you capture them.' },
  { id: 'live', label: 'Live assist', subtitle: 'Transcribe a call and get suggested replies in real time.' }
]

export function SettingsView() {
  const { view, loadError, status, save } = useSettings()
  const [tab, setTab] = useAppTab()
  const current = TABS.find((item) => item.id === tab) ?? TABS[0]

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <img className={styles.banner} src={banner} alt="AutoDesk - Screen to AI. Instant answers." />
        <nav className={styles.tabs} role="tablist" aria-label="AutoDesk">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === tab}
              className={styles.tab}
              data-active={item.id === tab}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <p className={styles.pageSubtitle}>{current?.subtitle}</p>
      </header>
      {loadError && <p className={styles.loadError}>{loadError}</p>}
      {view && <SettingsForm tab={tab} view={view} status={status} onSave={save} />}
    </main>
  )
}
