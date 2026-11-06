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

      <div className={styles.field}>
        <span className={styles.label}>Listen to</span>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={value.listenSystem}
            onChange={(event) => update('listenSystem', event.target.checked)}
          />
          <span>System audio (the other people in a call)</span>
        </label>
        <label className={styles.checkbox}>
          <input type="checkbox" checked={value.listenMic} onChange={(event) => update('listenMic', event.target.checked)} />
          <span>Microphone (you)</span>
        </label>
      </div>

      <label className={styles.checkbox}>
        <input type="checkbox" checked={value.autoAnswer} onChange={(event) => update('autoAnswer', event.target.checked)} />
        <span>Suggest a reply automatically when they ask a question</span>
      </label>
      <span className={styles.hint}>Press {LIVE_HOTKEY_LABEL} at any time while listening to ask the AI for a suggestion.</span>

      <label className={styles.field}>
        <span className={styles.label}>Instructions for suggestions</span>
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
