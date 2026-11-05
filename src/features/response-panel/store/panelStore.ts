import { create } from 'zustand'
import type { PanelEvent, PanelState } from '@/shared/types/ipc'

interface PanelStore {
  state: PanelState | null
  apply(event: PanelEvent): void
}

function reduce(state: PanelState | null, event: PanelEvent): PanelState | null {
  if (event.type === 'snapshot') return event.state
  if (!state) return state

  switch (event.type) {
    case 'message':
      return {
        ...state,
        streaming: state.streaming || event.message.role === 'assistant',
        messages: [...state.messages, event.message]
      }
    case 'delta':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === event.messageId ? { ...message, text: message.text + event.text } : message
        )
      }
    case 'done':
      return {
        ...state,
        streaming: false,
        messages: state.messages.map((message) =>
          message.id === event.messageId && event.error ? { ...message, error: event.error } : message
        )
      }
  }
}

export const usePanelStore = create<PanelStore>()((set) => ({
  state: null,
  apply: (event) => set(({ state }) => ({ state: reduce(state, event) }))
}))
