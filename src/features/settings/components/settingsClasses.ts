const control = 'w-full rounded-control border border-line bg-sunken px-[11px] outline-none focus:border-accent-strong'
const button = 'h-9 whitespace-nowrap rounded-control px-[18px] font-semibold disabled:opacity-50'
const caps = 'text-xs font-semibold uppercase tracking-[0.06em]'

export const styles = {
  page: 'min-h-full bg-surface px-8 pt-7',
  pageHeader: 'mb-[22px]',
  banner: 'mx-auto mb-5 block h-auto w-full max-w-[360px] rounded-card',
  pageSubtitle: 'text-muted',
  tabs: 'mb-3 grid grid-cols-2 gap-1 rounded-card border border-line bg-sunken p-1',
  tab: 'h-10 rounded-control text-[14px] font-semibold text-muted transition-colors hover:text-fg data-[active=true]:bg-raised data-[active=true]:text-fg data-[active=true]:shadow-[0_0_0_1px_var(--color-line-strong)]',
  loadError: 'rounded-control bg-danger-soft px-3 py-2.5 text-danger',
  credit: 'pb-5 text-center text-xs text-faint',

  form: 'flex flex-col gap-4',
  section: 'flex flex-col gap-4 rounded-card border border-line bg-raised p-[18px]',
  sectionTitle: `${caps} text-muted`,

  segmented: 'grid grid-cols-4 gap-2 max-[540px]:grid-cols-2',
  segment:
    'group relative flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-card border border-line bg-sunken px-1.5 pt-3 pb-2.5 text-muted transition-colors hover:border-line-strong hover:text-fg data-[active=true]:border-accent-strong data-[active=true]:bg-accent-soft data-[active=true]:text-fg data-[active=true]:shadow-[inset_0_0_0_1px_var(--color-accent-strong)]',
  logo: 'grid size-[38px] place-items-center rounded-[10px] bg-raised text-fg group-data-[active=true]:bg-surface',
  segmentLabel: 'max-w-full truncate text-[12.5px] font-semibold',
  dot: 'absolute top-2 right-2 size-[7px] rounded-full bg-success',

  themeSwitch: 'grid grid-cols-3 gap-1 rounded-card border border-line bg-sunken p-1',
  reasoningSwitch: 'grid grid-cols-5 gap-1 rounded-card border border-line bg-sunken p-1 max-[540px]:grid-cols-3',
  themeOption:
    'h-8 rounded-control font-semibold text-muted transition-colors hover:text-fg data-[active=true]:bg-raised data-[active=true]:text-fg data-[active=true]:shadow-[0_0_0_1px_var(--color-line-strong)]',

  providerForm: 'flex flex-col gap-4',
  field: 'flex flex-col gap-1.5',
  label: 'text-[13px] font-semibold',
  hint: 'text-[12.5px] leading-normal text-faint data-[tone=error]:text-danger',
  link: 'text-accent hover:underline',
  inline: 'flex gap-2',
  input: `${control} h-9`,
  textarea: `${control} resize-y py-[9px] leading-normal`,
  path: 'flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-control border border-line bg-sunken px-[11px] font-mono text-[12.5px] whitespace-nowrap text-muted',
  checkbox: 'flex cursor-pointer items-center gap-2.5 [&_input]:size-4 [&_input]:accent-accent-strong',

  dropdown: 'relative min-w-0 flex-1',
  dropdownTrigger:
    'group flex min-h-11 w-full items-center justify-between gap-2.5 rounded-control border border-line bg-sunken px-3 py-1.5 text-left hover:enabled:border-line-strong aria-expanded:border-accent-strong disabled:opacity-70',
  chevron: 'flex-none text-muted transition-transform group-aria-expanded:rotate-180',
  optionText: 'flex min-w-0 flex-col',
  optionLabel:
    'truncate data-[placeholder=true]:text-faint group-aria-selected/option:font-semibold group-aria-selected/option:text-accent',
  optionId: 'truncate font-mono text-[11.5px] text-faint',
  optionMeta: 'flex flex-none items-center gap-2',
  dropdownPanel:
    'absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-card border border-line-strong bg-raised shadow-panel',
  dropdownCaption: 'border-b border-line px-3 pt-[9px] pb-[7px] text-[11px] font-semibold uppercase tracking-[0.06em] text-faint',
  dropdownList: 'max-h-[280px] overflow-y-auto p-1 outline-none',
  dropdownOption:
    'group/option flex cursor-pointer items-center justify-between gap-2.5 rounded-control px-2.5 py-[7px] data-[active=true]:bg-hover',
  tag: 'whitespace-nowrap rounded-full px-[7px] py-0.5 text-[11px] font-semibold data-[images=yes]:bg-accent-soft data-[images=yes]:text-accent data-[images=no]:bg-hover data-[images=no]:text-muted',
  check: 'flex-none text-accent',
  iconButton:
    'grid size-11 flex-none place-items-center rounded-control border border-line-strong bg-sunken text-muted hover:enabled:bg-hover hover:enabled:text-fg disabled:opacity-45 data-[spinning=true]:[&_svg]:animate-spin',

  footer: 'sticky bottom-0 flex items-center justify-end gap-3.5 bg-linear-to-b from-transparent to-surface to-30% pt-3.5 pb-[22px]',
  status: 'text-[13px] text-muted data-[kind=saved]:text-success data-[kind=error]:text-danger',
  primaryButton: `${button} bg-accent-strong text-on-accent`,
  secondaryButton: `${button} border border-line-strong bg-sunken hover:enabled:bg-hover`
} as const
