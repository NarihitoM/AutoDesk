import { useEffect, useId } from 'react'
import { PROVIDER_LABELS } from '@/shared/lib/providers'
import type { ModelOption } from '@/shared/types/models'
import type { ProviderId } from '@/shared/types/settings'
import { useModelList, type ModelListState } from '../hooks/useModelList'
import { ModelDropdown } from './ModelDropdown'
import { styles } from './settingsClasses'

interface ModelPickerProps {
  provider: ProviderId
  baseUrl: string
  apiKey: string | undefined
  canFetch: boolean
  value: string
  imageModel: string
  onChange(model: string): void
  onImageModelChange(model: string): void
  onConnectionChange(connected: boolean): void
}

const AUTOMATIC: ModelOption = { id: '', label: 'Automatic', images: 'unknown' }

function describe(state: ModelListState, provider: ProviderId, models: readonly ModelOption[]): string {
  const name = PROVIDER_LABELS[provider]
  switch (state.status) {
    case 'needs-key':
      return `Add your API key to load models from ${name}.`
    case 'loading':
      return `Loading models from ${name}...`
    case 'error':
      return state.message
    case 'ready': {
      if (models.length === 0) return `${name} returned no models.`
      const total = `${models.length} ${models.length === 1 ? 'model' : 'models'} from ${name}`
      const vision = models.filter((model) => model.images === 'yes').length
      return `${total}. ${vision} can read images. Others get a description of the screenshot from an image reader.`
    }
  }
}

function placeholderFor(state: ModelListState, isLive: boolean): string {
  if (isLive) return 'Choose a model'
  if (state.status === 'loading') return 'Loading models...'
  if (state.status === 'needs-key') return 'Connect to load models'
  return 'No models available'
}

function readerHint(selected: ModelOption | undefined, readers: readonly ModelOption[]): string {
  if (readers.length === 0) {
    return selected?.images === 'no'
      ? `No model from this provider can read images, so ${selected.label} cannot answer captures. Choose a model tagged Images.`
      : 'No model from this provider is known to read images, so screenshots are sent as they are.'
  }
  const reason =
    selected?.images === 'no'
      ? `${selected.label} cannot read images, so this model describes each screenshot for it first.`
      : `With Automatic, ${selected?.label ?? 'the chosen model'} gets the screenshot directly and this model steps in only if it is rejected. Pick a model to always use it.`
  return `${reason} Automatic picks ${readers[0]?.label ?? 'the first model that can read images'}.`
}

export function ModelPicker(props: ModelPickerProps) {
  const { provider, baseUrl, apiKey, canFetch, value, imageModel, onChange, onImageModelChange, onConnectionChange } =
    props
  const id = useId()
  const readerId = useId()
  const { state, reload } = useModelList({ provider, baseUrl, apiKey, canFetch })

  useEffect(() => {
    if (state.status === 'ready') onConnectionChange(state.result.models.length > 0)
    if (state.status === 'error') onConnectionChange(false)
  }, [state, onConnectionChange])

  const live = state.status === 'ready' ? state.result.models : []
  const isLive = live.length > 0
  const keepsSaved = isLive && value !== '' && !live.some((option) => option.id === value)
  const options: ModelOption[] = keepsSaved ? [{ id: value, label: value, images: 'unknown' }, ...live] : live

  const selected = options.find((option) => option.id === value)
  const readers = live.filter((option) => option.images === 'yes' && option.id !== value)
  const showReader = isLive && selected !== undefined && selected.images !== 'yes'
  const keepsReader = imageModel !== '' && !readers.some((option) => option.id === imageModel)
  const readerOptions: ModelOption[] = [
    AUTOMATIC,
    ...(keepsReader ? [{ id: imageModel, label: imageModel, images: 'unknown' as const }] : []),
    ...readers
  ]

  return (
    <>
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
          {describe(state, provider, live)}
        </span>
      </div>

      {showReader && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={readerId}>
            Image reader
          </label>
          <ModelDropdown
            id={readerId}
            value={imageModel}
            options={readerOptions}
            caption="Models that can read images"
            placeholder="Automatic"
            disabled={false}
            onChange={onImageModelChange}
          />
          <span className={styles.hint}>{readerHint(selected, readers)}</span>
        </div>
      )}
    </>
  )
}
