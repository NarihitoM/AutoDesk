import { KEY_REQUIRED, PROVIDER_LABELS } from '@/shared/lib/providers'
import type { ProviderConfig, ProviderId } from '@/shared/types/settings'
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
  compatible: 'Ollama: http://localhost:11434/v1. LM Studio: http://localhost:1234/v1. Also works with OpenRouter or Groq.'
}

const MODEL_HINTS: Record<ProviderId, string> = {
  openai: 'Any OpenAI model that accepts images.',
  anthropic: 'Any Claude model, for example claude-opus-5-5 or claude-haiku-5-5.',
  gemini: 'Any Gemini model that accepts images.',
  compatible: 'Use a vision model, for example llava or qwen2.5vl.'
}

export function ProviderForm(props: ProviderFormProps) {
  const { id, config, hasStoredKey, keyDraft, keyCleared, onConfigChange, onKeyDraftChange, onClearKey } = props
  const keySaved = hasStoredKey && !keyCleared
  const keyLabel = KEY_REQUIRED[id] ? 'API key' : 'API key (optional)'

  return (
    <div className={styles.providerForm}>
      <label className={styles.field}>
        <span className={styles.label}>{keyLabel}</span>
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
        </span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Model</span>
        <input
          className={styles.input}
          value={config.model}
          spellCheck={false}
          onChange={(event) => onConfigChange({ ...config, model: event.target.value })}
        />
        <span className={styles.hint}>{MODEL_HINTS[id]}</span>
      </label>

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
