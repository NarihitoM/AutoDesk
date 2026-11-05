import { OverlayPage } from './pages/OverlayPage'
import { PanelPage } from './pages/PanelPage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  const route = window.location.hash.slice(1)

  if (route === 'overlay') return <OverlayPage />
  if (route === 'panel') return <PanelPage />
  return <SettingsPage />
}
