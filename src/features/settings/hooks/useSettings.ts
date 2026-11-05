import { useCallback, useEffect, useState } from 'react'
import { bridge } from '@/shared/lib/bridge'
import { readIpcError } from '@/shared/lib/errors'
import type { SettingsUpdate, SettingsView } from '@/shared/types/settings'

const SAVED_MESSAGE_MS = 2500

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

  useEffect(() => {
    if (status.kind !== 'saved') return
    const timer = setTimeout(() => setStatus({ kind: 'idle' }), SAVED_MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [status])

  const save = useCallback(async (update: SettingsUpdate): Promise<SettingsView | null> => {
    setStatus({ kind: 'saving' })
    try {
      const saved = await bridge.settings.save(update)
      setView(saved)
      setStatus({ kind: 'saved' })
      return saved
    } catch (error) {
      setStatus({ kind: 'error', message: readIpcError(error) })
      return null
    }
  }, [])

  return { view, loadError, status, save }
}
