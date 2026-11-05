export class SseParser {
  private buffer = ''
  private dataLines: string[] = []

  constructor(private readonly onData: (data: string) => void) {}

  push(chunk: string): void {
    this.buffer += chunk
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''
    for (const line of lines) this.handleLine(line)
  }

  end(): void {
    if (this.buffer) {
      this.handleLine(this.buffer)
      this.buffer = ''
    }
    this.dispatch()
  }

  private handleLine(rawLine: string): void {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (line === '') {
      this.dispatch()
      return
    }
    if (line.startsWith(':')) return

    const separator = line.indexOf(':')
    const field = separator === -1 ? line : line.slice(0, separator)
    if (field !== 'data') return

    const value = separator === -1 ? '' : line.slice(separator + 1)
    this.dataLines.push(value.startsWith(' ') ? value.slice(1) : value)
  }

  private dispatch(): void {
    if (this.dataLines.length === 0) return
    const data = this.dataLines.join('\n')
    this.dataLines = []
    this.onData(data)
  }
}
