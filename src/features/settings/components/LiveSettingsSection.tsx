import { LIVE_HOTKEY_LABEL, LIVE_LANGUAGES } from '@/shared/lib/providers'
import type { LiveSettings } from '@/shared/types/live'
import { styles } from './settingsClasses'

interface LiveSettingsSectionProps {
  value: LiveSettings
  onChange(value: LiveSettings): void
}

export function LiveSettingsSection({ value, onChange }: LiveSettingsSectionProps) {
  const update = <K extends keyof LiveSettings>(key: K, next: LiveSettings[K]): void => onChange({ ...value, [key]: next })

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Options</h2>

      <label className={styles.field}>
        <span className={styles.label}>Spoken language</span>
        <select className={styles.input} value={value.language} onChange={(event) => update('language', event.target.value)}>
          {LIVE_LANGUAGES.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.checkbox}>
        <input type="checkbox" checked={value.autoAnswer} onChange={(event) => update('autoAnswer', event.target.checked)} />
        <span>Reply automatically when the audio pauses</span>
      </label>
      <span className={styles.hint}>Press {LIVE_HOTKEY_LABEL} while listening to get a reply right away.</span>

      <label className={styles.field}>
        <span className={styles.label}>Instructions for AI replies</span>
        <textarea
          className={styles.textarea}
          value={value.prompt}
          rows={4}
          onChange={(event) => update('prompt', event.target.value)}
        />
      </label>
    </section>
  )
}
