import { ListenerPage } from './pages/ListenerPage'
import { LivePage } from './pages/LivePage'
import { OverlayPage } from './pages/OverlayPage'
import { PanelPage } from './pages/PanelPage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  const route = window.location.hash.slice(1).split('/')[0]

  if (route === 'overlay') return <OverlayPage />
  if (route === 'panel') return <PanelPage />
  if (route === 'live') return <LivePage />
  if (route === 'listener') return <ListenerPage />
  return <SettingsPage />
}
