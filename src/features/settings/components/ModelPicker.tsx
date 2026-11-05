import { useId } from 'react'
import { PROVIDER_LABELS } from '@/shared/lib/providers'
import type { ProviderId } from '@/shared/types/settings'
import { useModelList, type ModelListState } from '../hooks/useModelList'
import { ModelDropdown } from './ModelDropdown'
import styles from './Settings.module.css'

interface ModelPickerProps {
  provider: ProviderId
  baseUrl: string
  apiKey: string | undefined
  canFetch: boolean
  value: string
  onChange(model: string): void
}

function describe(state: ModelListState, provider: ProviderId, liveCount: number): string {
  const name = PROVIDER_LABELS[provider]
  const count = `${liveCount} ${liveCount === 1 ? 'model' : 'models'}`
  switch (state.status) {
    case 'needs-key':
      return `Add your API key to load models from ${name}.`
    case 'loading':
      return `Loading models from ${name}...`
    case 'error':
      return state.message
    case 'ready':
      if (liveCount === 0) return `${name} has no models that accept images.`
      if (state.result.visionFilter === 'verified') return `${count} from ${name} that accept images.`
      if (state.result.visionFilter === 'name-based') return `${count} from ${name} that accept images, matched by name.`
      return `${name} does not report image support, so all ${count} are shown. Pick one that can read images.`
  }
}

function placeholderFor(state: ModelListState, isLive: boolean): string {
  if (isLive) return 'Choose a model'
  if (state.status === 'loading') return 'Loading models...'
  if (state.status === 'needs-key') return 'Connect to load models'
  return 'No models available'
}

export function ModelPicker({ provider, baseUrl, apiKey, canFetch, value, onChange }: ModelPickerProps) {
  const id = useId()
  const { state, reload } = useModelList({ provider, baseUrl, apiKey, canFetch })

  const live = state.status === 'ready' ? state.result.models : []
  const isLive = live.length > 0
  const keepsSaved = isLive && value !== '' && !live.some((option) => option.id === value)
  const options = keepsSaved ? [{ id: value, label: value }, ...live] : live

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        Model
      </label>
      <div className={styles.inline}>
        <ModelDropdown
          id={id}
          value={value}
          options={options}
          caption={`Live from ${PROVIDER_LABELS[provider]}`}
          placeholder={placeholderFor(state, isLive)}
          disabled={!isLive}
          onChange={onChange}
        />
        <button
          type="button"
          className={styles.iconButton}
          onClick={reload}
          disabled={state.status === 'loading' || state.status === 'needs-key'}
          aria-label="Reload the model list"
          title="Reload the model list"
          data-spinning={state.status === 'loading'}
        >
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <path
              d="M13.5 8a5.5 5.5 0 11-1.6-3.9M13.5 2.5v3.2h-3.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <span className={styles.hint} data-tone={state.status === 'error' ? 'error' : undefined}>
        {describe(state, provider, live.length)}
      </span>
    </div>
  )
}
