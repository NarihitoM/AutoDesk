import { useEffect } from 'react'
import { bridge } from '@/shared/lib/bridge'
import { useLiveStore } from '../store/liveStore'

export function useLiveEvents(): void {
  const apply = useLiveStore((store) => store.apply)

  useEffect(() => {
    const unsubscribe = bridge.live.onEvent(apply)
    bridge.live.ready()
    return unsubscribe
  }, [apply])
}
