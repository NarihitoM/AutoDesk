import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { availableParallelism } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'
import { asText, pick } from '../lib/json'

const SERVER_FILE = 'whisper-server.exe'
const MODEL_FILE = 'ggml-base-q5_1.bin'
const VAD_FILE = 'ggml-silero-v5.1.2.bin'
const STARTUP_TIMEOUT_MS = 30_000
const REQUEST_TIMEOUT_MS = 60_000

function speechDirectory(): string {
  return app.isPackaged ? join(process.resourcesPath, 'speech') : join(app.getAppPath(), 'resources', 'speech')
}

export function isSpeechInstalled(): boolean {
  const directory = speechDirectory()
  return [SERVER_FILE, MODEL_FILE, VAD_FILE].every((file) => existsSync(join(directory, file)))
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('No free port'))))
    })
  })
}

function threadCount(): number {
  return Math.max(2, Math.min(8, availableParallelism() - 2))
}

async function waitUntilReady(url: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('The speech engine stopped while starting.')
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
  throw new Error('The speech engine did not start in time.')
}

class WhisperServer {
  private child: ChildProcess | null = null
  private ready: Promise<string> | null = null
  private language = ''

  start(language: string): Promise<string> {
    if (this.ready && this.language === language) return this.ready
    this.stop()
    this.language = language
    const ready = this.launch(language)
    this.ready = ready
    ready.catch(() => {
      if (this.ready === ready) this.stop()
    })
    return ready
  }

  async transcribe(wav: Buffer): Promise<string> {
    if (!this.ready) throw new Error('The speech engine is not running.')
    const url = await this.ready
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'speech.wav')
    form.append('response_format', 'json')
    form.append('temperature', '0')

    const response = await fetch(`${url}/inference`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    if (!response.ok) throw new Error(`The speech engine failed (${response.status}).`)
    const payload: unknown = await response.json()
    return asText(pick(payload, 'text')) ?? ''
  }

  stop(): void {
    this.child?.kill()
    this.child = null
    this.ready = null
  }

  private async launch(language: string): Promise<string> {
    if (!isSpeechInstalled()) {
      throw new Error('The speech engine is missing. Reinstall AutoDesk, or run npm run fetch:speech in development.')
    }

    const directory = speechDirectory()
    const port = await freePort()
    const args = [
      '-m', join(directory, MODEL_FILE),
      '--host', '127.0.0.1',
      '--port', String(port),
      '-l', language,
      '-t', String(threadCount()),
      '-nt',
      '--vad',
      '-vm', join(directory, VAD_FILE)
    ]

    const child = spawn(join(directory, SERVER_FILE), args, { cwd: directory, windowsHide: true, stdio: 'ignore' })
    const failed = new Promise<never>((_, reject) => {
      child.once('error', (error) => reject(new Error(`The speech engine could not start. ${error.message}`)))
    })
    child.once('exit', () => {
      if (this.child === child) {
        this.child = null
        this.ready = null
      }
    })
    this.child = child

    const url = `http://127.0.0.1:${port}`
    await Promise.race([waitUntilReady(url, child), failed])
    return url
  }
}

export const whisperServer = new WhisperServer()
