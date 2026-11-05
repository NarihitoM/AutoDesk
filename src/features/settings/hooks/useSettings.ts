import { useCallback, useEffect, useState } from 'react'
import { bridge } from '@/shared/lib/bridge'
import type { SettingsUpdate, SettingsView } from '@/shared/types/settings'

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }

function readError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

export function useSettings() {
  const [view, setView] = useState<SettingsView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' })

  useEffect(() => {
    bridge.settings.get().then(setView, (error: unknown) => setLoadError(readError(error)))
  }, [])

  const save = useCallback(async (update: SettingsUpdate): Promise<boolean> => {
    setStatus({ kind: 'saving' })
    try {
      setView(await bridge.settings.save(update))
      setStatus({ kind: 'saved' })
      return true
    } catch (error) {
      setStatus({ kind: 'error', message: readError(error) })
      return false
    }
  }, [])

  return { view, loadError, status, save }
}
