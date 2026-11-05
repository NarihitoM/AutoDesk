import { useCallback, useEffect, useState } from 'react'
import { bridge } from '@/shared/lib/bridge'
import { readIpcError } from '@/shared/lib/errors'
import type { SettingsUpdate, SettingsView } from '@/shared/types/settings'

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }

export function useSettings() {
  const [view, setView] = useState<SettingsView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' })

  useEffect(() => {
    bridge.settings.get().then(setView, (error: unknown) => setLoadError(readIpcError(error)))
  }, [])

  const save = useCallback(async (update: SettingsUpdate): Promise<boolean> => {
    setStatus({ kind: 'saving' })
    try {
      setView(await bridge.settings.save(update))
      setStatus({ kind: 'saved' })
      return true
    } catch (error) {
      setStatus({ kind: 'error', message: readIpcError(error) })
      return false
    }
  }, [])

  return { view, loadError, status, save }
}
