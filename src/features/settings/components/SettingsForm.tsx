import { useState, type FormEvent } from 'react'
import { bridge } from '@/shared/lib/bridge'
import {
  CAPTURE_KEY_LABELS,
  CAPTURE_KEYS,
  PROVIDER_IDS,
  PROVIDER_LABELS,
  PROVIDER_SHORT_LABELS
} from '@/shared/lib/providers'
import type {
  CaptureKey,
  KeyChange,
  ProviderConfig,
  ProviderId,
  Settings,
  SettingsUpdate,
  SettingsView
} from '@/shared/types/settings'
import type { SaveStatus } from '../hooks/useSettings'
import { ProviderForm } from './ProviderForm'
import { ProviderLogo } from './ProviderLogo'
import styles from './Settings.module.css'

interface SettingsFormProps {
  view: SettingsView
  status: SaveStatus
  onSave(update: SettingsUpdate): Promise<boolean>
}

type KeyDrafts = Partial<Record<ProviderId, string>>

function buildKeyChanges(drafts: KeyDrafts, cleared: ReadonlySet<ProviderId>): Partial<Record<ProviderId, KeyChange>> {
  const changes: Partial<Record<ProviderId, KeyChange>> = {}
  for (const id of PROVIDER_IDS) {
    const value = drafts[id]?.trim()
    if (value) changes[id] = { action: 'set', value }
    else if (cleared.has(id)) changes[id] = { action: 'clear' }
  }
  return changes
}

function captureHint(key: CaptureKey): string {
  if (key === 'right-mouse') {
    return 'Hold the right mouse button and drag to select an area. A normal right-click still opens menus as usual.'
  }
  return 'Hold this key, then left-click and drag to select an area. Pressing any other key cancels, so normal shortcuts keep working.'
}

function statusText(status: SaveStatus): string {
  if (status.kind === 'saving') return 'Saving...'
  if (status.kind === 'saved') return 'Saved'
  if (status.kind === 'error') return status.message
  return ''
}

export function SettingsForm({ view, status, onSave }: SettingsFormProps) {
  const [draft, setDraft] = useState<Settings>(view.settings)
  const [keyDrafts, setKeyDrafts] = useState<KeyDrafts>({})
  const [clearedKeys, setClearedKeys] = useState<ReadonlySet<ProviderId>>(new Set())

  const active = draft.activeProvider

  const update = <K extends keyof Settings>(key: K, value: Settings[K]): void => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const updateProvider = (config: ProviderConfig): void => {
    setDraft((current) => ({ ...current, providers: { ...current.providers, [active]: config } }))
  }

  const setKeyDraft = (value: string): void => {
    setKeyDrafts((current) => ({ ...current, [active]: value }))
    setClearedKeys((current) => {
      const next = new Set(current)
      next.delete(active)
      return next
    })
  }

  const clearKey = (): void => {
    setKeyDrafts((current) => ({ ...current, [active]: '' }))
    setClearedKeys((current) => new Set(current).add(active))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const saved = await onSave({ settings: draft, keys: buildKeyChanges(keyDrafts, clearedKeys) })
    if (saved) {
      setKeyDrafts({})
      setClearedKeys(new Set())
    }
  }

  return (
    <form className={styles.form} onSubmit={(event) => void onSubmit(event)}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>AI provider</h2>
        <div className={styles.segmented} role="radiogroup" aria-label="AI provider">
          {PROVIDER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === active}
              className={styles.segment}
              data-active={id === active}
              title={PROVIDER_LABELS[id]}
              onClick={() => update('activeProvider', id)}
            >
              <span className={styles.logo}>
                <ProviderLogo provider={id} />
              </span>
              <span className={styles.segmentLabel}>{PROVIDER_SHORT_LABELS[id]}</span>
              {view.storedKeys[id] && !clearedKeys.has(id) && <span className={styles.dot} aria-label="Key saved" />}
            </button>
          ))}
        </div>
        <ProviderForm
          key={active}
          id={active}
          config={draft.providers[active]}
          hasStoredKey={view.storedKeys[active]}
          keyDraft={keyDrafts[active] ?? ''}
          keyCleared={clearedKeys.has(active)}
          onConfigChange={updateProvider}
          onKeyDraftChange={setKeyDraft}
          onClearKey={clearKey}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Capture</h2>
        <label className={styles.field}>
          <span className={styles.label}>Capture key</span>
          <select
            className={styles.input}
            value={draft.captureKey}
            onChange={(event) => {
              const captureKey = CAPTURE_KEYS.find((key) => key === event.target.value)
              if (captureKey) update('captureKey', captureKey)
            }}
          >
            {CAPTURE_KEYS.map((key) => (
              <option key={key} value={key}>
                {CAPTURE_KEY_LABELS[key]}
              </option>
            ))}
          </select>
          <span className={styles.hint}>{captureHint(draft.captureKey)}</span>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Prompt sent with every capture</span>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={draft.prompt}
            rows={4}
            onChange={(event) => update('prompt', event.target.value)}
          />
        </label>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>General</h2>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={draft.launchAtStartup}
            onChange={(event) => update('launchAtStartup', event.target.checked)}
          />
          <span>Start AutoDesk when I sign in to Windows</span>
        </label>
        <div className={styles.field}>
          <span className={styles.label}>Data folder</span>
          <div className={styles.inline}>
            <code className={styles.path}>{view.dataDirectory}</code>
            <button type="button" className={styles.secondaryButton} onClick={bridge.settings.openDataFolder}>
              Open folder
            </button>
          </div>
          <span className={styles.hint}>
            Settings are saved in settings.json. API keys are saved in credentials.json, encrypted so only your
            Windows account can read them.
          </span>
        </div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.status} data-kind={status.kind} role="status">
          {statusText(status)}
        </span>
        <button type="submit" className={styles.primaryButton} disabled={status.kind === 'saving'}>
          Save
        </button>
      </footer>
    </form>
  )
}
