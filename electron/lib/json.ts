export type PathKey = string | number

function field(value: unknown, key: PathKey): unknown {
  if (typeof key === 'number') {
    return Array.isArray(value) ? value[key] : undefined
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }
  return (value as Record<string, unknown>)[key]
}

export function pick(value: unknown, ...path: PathKey[]): unknown {
  return path.reduce<unknown>(field, value)
}

export function asText(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function parseJson(source: string): unknown {
  try {
    return JSON.parse(source)
  } catch {
    return null
  }
}
