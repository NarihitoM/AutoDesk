import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { ModelOption } from '@/shared/types/models'
import styles from './Settings.module.css'

const TYPE_AHEAD_RESET_MS = 700

interface ModelDropdownProps {
  id: string
  value: string
  options: readonly ModelOption[]
  caption: string
  placeholder: string
  disabled: boolean
  onChange(model: string): void
}

function findMatch(options: readonly ModelOption[], query: string, from: number): number {
  const needle = query.toLowerCase()
  const ordered = [...options.slice(from), ...options.slice(0, from)]
  const startsWith = ordered.findIndex(
    (option) => option.label.toLowerCase().startsWith(needle) || option.id.toLowerCase().startsWith(needle)
  )
  const index = startsWith !== -1 ? startsWith : ordered.findIndex((option) => option.id.toLowerCase().includes(needle))
  return index === -1 ? -1 : (index + from) % options.length
}

export function ModelDropdown({ id, value, options, caption, placeholder, disabled, onChange }: ModelDropdownProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: '', at: 0 })

  const selected = options.find((option) => option.id === value)
  const listId = `${id}-list`

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const openList = (): void => {
    setActive(Math.max(0, options.findIndex((option) => option.id === value)))
    setOpen(true)
  }

  const close = (): void => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const choose = (option: ModelOption | undefined): void => {
    if (!option) return
    onChange(option.id)
    close()
  }

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openList()
    }
  }

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    const last = options.length - 1
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((index) => Math.min(index + 1, last))
        return
      case 'ArrowUp':
        event.preventDefault()
        setActive((index) => Math.max(index - 1, 0))
        return
      case 'Home':
        event.preventDefault()
        setActive(0)
        return
      case 'End':
        event.preventDefault()
        setActive(last)
        return
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(options[active])
        return
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      case 'Tab':
        setOpen(false)
        return
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now()
      const text = now - typed.current.at > TYPE_AHEAD_RESET_MS ? event.key : typed.current.text + event.key
      typed.current = { text, at: now }
      const match = findMatch(options, text, text.length === 1 ? active + 1 : active)
      if (match !== -1) setActive(match)
    }
  }

  return (
    <div className={styles.dropdown} ref={rootRef}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className={styles.dropdownTrigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={styles.optionText}>
          <span className={styles.optionLabel} data-placeholder={!selected}>
            {selected?.label ?? placeholder}
          </span>
          {selected && selected.label !== selected.id && <span className={styles.optionId}>{selected.id}</span>}
        </span>
        <svg className={styles.chevron} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <div className={styles.dropdownPanel}>
          <div className={styles.dropdownCaption}>{caption}</div>
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={`${listId}-${active}`}
            className={styles.dropdownList}
            onKeyDown={onListKeyDown}
          >
            {options.map((option, index) => (
              <li
                key={option.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.id === value}
                data-active={index === active}
                className={styles.dropdownOption}
                onPointerEnter={() => setActive(index)}
                onClick={() => choose(option)}
              >
                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.label !== option.id && <span className={styles.optionId}>{option.id}</span>}
                </span>
                {option.id === value && (
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className={styles.check}>
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
