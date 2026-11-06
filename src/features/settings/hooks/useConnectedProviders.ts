import { useCallback, useEffect, useState } from 'react'
import { bridge } from '@/shared/lib/bridge'
import { KEY_REQUIRED, PROVIDER_IDS } from '@/shared/lib/providers'
import type { ProviderConfig, ProviderId } from '@/shared/types/settings'

type Connections = Partial<Record<ProviderId, boolean>>

export function useConnectedProviders(providers: Record<ProviderId, ProviderConfig>) {
  const [connected, setConnected] = useState<Connections>({})

  const markConnected = useCallback((id: ProviderId, ok: boolean) => {
    setConnected((current) => (current[id] === ok ? current : { ...current, [id]: ok }))
  }, [])

  useEffect(() => {
    let active = true
    for (const id of PROVIDER_IDS) {
      if (KEY_REQUIRED[id]) continue
      bridge.settings
        .listModels({ provider: id, baseUrl: providers[id].baseUrl })
        .then((response) => response.ok && response.result.models.length > 0)
        .catch(() => false)
        .then((ok) => {
          if (active) markConnected(id, ok)
        })
    }
    return () => {
      active = false
    }
  }, [providers, markConnected])

  return { connected, markConnected }
}
