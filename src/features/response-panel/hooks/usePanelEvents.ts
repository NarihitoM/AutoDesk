import { useEffect } from 'react'
import { bridge } from '@/shared/lib/bridge'
import { usePanelStore } from '../store/panelStore'

export function usePanelEvents(): void {
  const apply = usePanelStore((store) => store.apply)

  useEffect(() => {
    const unsubscribe = bridge.panel.onEvent(apply)
    bridge.panel.ready()
    return unsubscribe
  }, [apply])
}
