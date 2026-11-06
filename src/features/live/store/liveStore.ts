import { create } from 'zustand'
import type { LiveEvent, LiveState } from '@/shared/types/live'

interface LiveStore {
  state: LiveState | null
  apply(event: LiveEvent): void
}

function reduce(state: LiveState | null, event: LiveEvent): LiveState | null {
  if (event.type === 'snapshot') return event.state
  if (!state) return state

  switch (event.type) {
    case 'status':
      return { ...state, status: event.status }
    case 'line': {
      const partials = { ...state.partials }
      delete partials[event.line.speaker]
      return { ...state, lines: [...state.lines, event.line], partials }
    }
    case 'partial': {
      const partials = { ...state.partials }
      if (event.text) {
        partials[event.speaker] = event.text
      } else {
        delete partials[event.speaker]
      }
      return { ...state, partials }
    }
    case 'suggestion': {
      const exists = state.suggestions.some((suggestion) => suggestion.id === event.suggestion.id)
      return {
        ...state,
        suggestions: exists
          ? state.suggestions.map((suggestion) => (suggestion.id === event.suggestion.id ? event.suggestion : suggestion))
          : [...state.suggestions, event.suggestion]
      }
    }
    case 'delta':
      return {
        ...state,
        suggestions: state.suggestions.map((suggestion) =>
          suggestion.id === event.id ? { ...suggestion, text: suggestion.text + event.text } : suggestion
        )
      }
  }
}

export const useLiveStore = create<LiveStore>()((set) => ({
  state: null,
  apply: (event) => set(({ state }) => ({ state: reduce(state, event) }))
}))
