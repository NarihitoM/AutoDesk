import { useEffect, useState } from 'react'
import { bridge } from '@/shared/lib/bridge'
import type { AppTab } from '@/shared/types/ipc'

function initialTab(): AppTab {
  return window.location.hash.split('/')[1] === 'live' ? 'live' : 'settings'
}

export function useAppTab(): [AppTab, (tab: AppTab) => void] {
  const [tab, setTab] = useState<AppTab>(initialTab)

  useEffect(() => bridge.settings.onShowTab((next) => setTab(next === 'live' ? 'live' : 'settings')), [])

  return [tab, setTab]
}
