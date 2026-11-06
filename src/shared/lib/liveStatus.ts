import type { LiveStatus } from '@/shared/types/live'

export function liveStatusLabel(status: LiveStatus): string {
  switch (status.kind) {
    case 'idle':
      return 'Stopped'
    case 'starting':
      return 'Starting speech engine...'
    case 'listening': {
      const sources = status.speakers.map((speaker) => (speaker === 'them' ? 'system audio' : 'mic'))
      return `Listening to ${sources.join(' and ')}`
    }
    case 'error':
      return status.message
  }
}

export function isLiveActive(status: LiveStatus): boolean {
  return status.kind === 'starting' || status.kind === 'listening'
}

export const LIVE_STATUS_DOT: Record<LiveStatus['kind'], string> = {
  idle: 'bg-faint',
  starting: 'bg-accent animate-pulse',
  listening: 'bg-success animate-pulse',
  error: 'bg-danger'
}
