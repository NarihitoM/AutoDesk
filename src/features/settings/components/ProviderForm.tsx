import { KEY_REQUIRED, KEY_URLS, PROVIDER_LABELS, USES_KEY } from '@/shared/lib/providers'
import type { ProviderConfig, ProviderId } from '@/shared/types/settings'
import { ModelPicker } from './ModelPicker'
import styles from './Settings.module.css'

interface ProviderFormProps {
  id: ProviderId
  config: ProviderConfig
  hasStoredKey: boolean
  keyDraft: string
  keyCleared: boolean
  onConfigChange(config: ProviderConfig): void
  onKeyDraftChange(value: string): void
  onClearKey(): void
}

const BASE_URL_HINTS: Record<ProviderId, string> = {
  openai: 'Change this only if you use a proxy.',
  anthropic: 'Change this only if you use a proxy.',
  gemini: 'Change this only if you use a proxy.',
  groq: 'Change this only if you use a proxy.',
  openrouter: 'Change this only if you use a proxy.',
  ollama: 'Ollama runs on your PC at http://localhost:11434/v1 by default.',
  lmstudio: 'Start the local server in LM Studio. The default address is http://localhost:1234/v1.',
  compatible: 'Any server with an OpenAI-compatible chat completions API, for example vLLM or LocalAI.'
}

export function ProviderForm(props: ProviderFormProps) {
  const { id, config, hasStoredKey, keyDraft, keyCleared, onConfigChange, onKeyDraftChange, onClearKey } = props
  const keySaved = hasStoredKey && !keyCleared
  const draft = keyDraft.trim()
  const canFetchModels = !KEY_REQUIRED[id] || keySaved || draft !== ''
  const keyUrl = KEY_URLS[id]

  return (
    <div className={styles.providerForm}>
      {USES_KEY[id] && (
        <label className={styles.field}>
          <span className={styles.label}>{KEY_REQUIRED[id] ? 'API key' : 'API key (optional)'}</span>
          <div className={styles.inline}>
            <input
              className={styles.input}
              type="password"
              autoComplete="off"
              value={keyDraft}
              placeholder={keySaved ? 'Saved. Type a new key to replace it.' : `Paste your ${PROVIDER_LABELS[id]} key`}
              onChange={(event) => onKeyDraftChange(event.target.value)}
            />
            {keySaved && (
              <button type="button" className={styles.secondaryButton} onClick={onClearKey}>
                Remove
              </button>
            )}
          </div>
          <span className={styles.hint}>
            {keyCleared ? 'The key will be removed when you save.' : 'Stored encrypted on this computer.'}
            {keyUrl && !keyCleared && (
              <>
                {' '}
                <a className={styles.link} href={keyUrl} target="_blank" rel="noreferrer">
                  Get a key
                </a>
              </>
            )}
          </span>
        </label>
      )}

      <ModelPicker
        provider={id}
        baseUrl={config.baseUrl}
        apiKey={draft || undefined}
        canFetch={canFetchModels}
        value={config.model}
        onChange={(model) => onConfigChange({ ...config, model })}
      />

      <label className={styles.field}>
        <span className={styles.label}>Base URL</span>
        <input
          className={styles.input}
          value={config.baseUrl}
          spellCheck={false}
          onChange={(event) => onConfigChange({ ...config, baseUrl: event.target.value })}
        />
        <span className={styles.hint}>{BASE_URL_HINTS[id]}</span>
      </label>
    </div>
  )
}
