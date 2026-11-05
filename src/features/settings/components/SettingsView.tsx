import banner from '@/shared/assets/autodesk-banner.png'
import { useSettings } from '../hooks/useSettings'
import { SettingsForm } from './SettingsForm'
import styles from './Settings.module.css'

export function SettingsView() {
  const { view, loadError, status, save } = useSettings()

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <img className={styles.banner} src={banner} alt="AutoDesk - Screen to AI. Instant answers." />
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSubtitle}>Choose which AI answers your screenshots and how you capture them.</p>
      </header>
      {loadError && <p className={styles.loadError}>{loadError}</p>}
      {view && <SettingsForm view={view} status={status} onSave={save} />}
    </main>
  )
}
