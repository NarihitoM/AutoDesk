import { useId, useState } from 'react'
import type { ModelOption } from '@/shared/types/models'
import type { ProviderId } from '@/shared/types/settings'
import { useModelList, type ModelListState } from '../hooks/useModelList'
import styles from './Settings.module.css'

const CUSTOM_OPTION = '__custom__'

interface ModelPickerProps {
  provider: ProviderId
  baseUrl: string
  apiKey: string | undefined
  canFetch: boolean
  value: string
  onChange(model: string): void
}

function describe(state: ModelListState, models: ModelOption[]): string {
  switch (state.status) {
    case 'needs-key':
      return 'Add your API key above to load the available models.'
    case 'loading':
      return 'Loading models...'
    case 'error':
      return `Could not load models. ${state.message}`
    case 'ready': {
      const count = `${models.length} ${models.length === 1 ? 'model' : 'models'}`
      if (models.length === 0) return 'No models that accept images were found. Enter a model ID instead.'
      if (state.result.visionFilter === 'verified') return `${count} that accept images.`
      if (state.result.visionFilter === 'name-based') return `${count} that accept images, matched by model name.`
      return `This server does not report image support, so all ${count} are shown. Pick one that can read images.`
    }
  }
}

export function ModelPicker({ provider, baseUrl, apiKey, canFetch, value, onChange }: ModelPickerProps) {
  const id = useId()
  const [typing, setTyping] = useState(false)
  const { state, reload } = useModelList({ provider, baseUrl, apiKey, canFetch })

  const models = state.status === 'ready' ? state.result.models : []
  const showList = models.length > 0 && !typing
  const inList = models.some((model) => model.id === value)

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        Model
      </label>
      <div className={styles.inline}>
        {showList ? (
          <select
            id={id}
            className={styles.input}
            value={value}
            onChange={(event) => {
              if (event.target.value === CUSTOM_OPTION) setTyping(true)
              else onChange(event.target.value)
            }}
          >
            {!inList && <option value={value}>{value} (not in list)</option>}
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
            <option value={CUSTOM_OPTION}>Enter a model ID...</option>
          </select>
        ) : (
          <input
            id={id}
            className={styles.input}
            value={value}
            spellCheck={false}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {typing && models.length > 0 ? (
          <button type="button" className={styles.secondaryButton} onClick={() => setTyping(false)}>
            Show list
          </button>
        ) : (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={reload}
            disabled={state.status === 'loading' || state.status === 'needs-key'}
          >
            Refresh
          </button>
        )}
      </div>
      <span className={styles.hint} data-tone={state.status === 'error' ? 'error' : undefined}>
        {describe(state, models)}
      </span>
    </div>
  )
}
