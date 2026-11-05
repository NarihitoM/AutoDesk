import { useCallback, useEffect, useState } from 'react'
import { bridge } from '@/shared/lib/bridge'
import { readIpcError } from '@/shared/lib/errors'
import type { ModelListResult } from '@/shared/types/models'
import type { ProviderId } from '@/shared/types/settings'

const DEBOUNCE_MS = 450

export type ModelListState =
  | { status: 'needs-key' }
  | { status: 'loading' }
  | { status: 'ready'; result: ModelListResult }
  | { status: 'error'; message: string }

interface ModelListQuery {
  provider: ProviderId
  baseUrl: string
  apiKey: string | undefined
  canFetch: boolean
}

export function useModelList({ provider, baseUrl, apiKey, canFetch }: ModelListQuery) {
  const [state, setState] = useState<ModelListState>({ status: canFetch ? 'loading' : 'needs-key' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!canFetch) {
      setState({ status: 'needs-key' })
      return
    }

    let active = true
    setState({ status: 'loading' })
    const timer = setTimeout(() => {
      bridge.settings.listModels({ provider, baseUrl, apiKey }).then(
        (result) => {
          if (active) setState({ status: 'ready', result })
        },
        (error: unknown) => {
          if (active) setState({ status: 'error', message: readIpcError(error) })
        }
      )
    }, DEBOUNCE_MS)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [provider, baseUrl, apiKey, canFetch, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  return { state, reload }
}
