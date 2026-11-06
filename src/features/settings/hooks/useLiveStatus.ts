import { useEffect, useState } from 'react'
import { bridge } from '@/shared/lib/bridge'
import type { LiveStatus } from '@/shared/types/live'

export function useLiveStatus(): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>({ kind: 'idle' })

  useEffect(() => {
    const unsubscribe = bridge.live.onEvent((event) => {
      if (event.type === 'status') setStatus(event.status)
    })
    bridge.live.ready()
    return unsubscribe
  }, [])

  return status
}
