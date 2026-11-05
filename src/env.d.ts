import type { AutoDeskApi } from '@/shared/types/ipc'

declare global {
  interface Window {
    autodesk: AutoDeskApi
  }
}
