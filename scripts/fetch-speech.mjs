import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const TARGET = resolve(import.meta.dirname, '../resources/speech')

const ENGINE = {
  url: 'https://github.com/ggml-org/whisper.cpp/releases/download/b5130/whisper-bin-x64.zip',
  sha256: 'f9ec6c52a2e949b62ab51fa21d0d497958f9e41c3010c157c4e42932d5316f3c',
  files: /^(whisper-server\.exe|whisper\.dll|ggml(-base|-cpu-[\w-]+)?\.dll)$/
}

const MODELS = [
  {
    name: 'ggml-base-q5_1.bin',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
    sha256: '422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898'
  },
  {
    name: 'ggml-silero-v5.1.2.bin',
    url: 'https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v5.1.2.bin',
    sha256: '29940d98d42b91fbd05ce489f3ecf7c72f0a42f027e4875919a28fb4c04ea2cf'
  }
]

const LICENSE_URL = 'https://raw.githubusercontent.com/ggml-org/whisper.cpp/b5130/LICENSE'

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function download(url, expected) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (expected && sha256(buffer) !== expected) throw new Error(`Checksum mismatch for ${url}`)
  return buffer
}

function isCurrent(path, expected) {
  return existsSync(path) && sha256(readFileSync(path)) === expected
}

async function fetchModels() {
  for (const model of MODELS) {
    const path = join(TARGET, model.name)
    if (isCurrent(path, model.sha256)) continue
    console.log(`Downloading ${model.name}`)
    writeFileSync(path, await download(model.url, model.sha256))
  }
}

async function fetchEngine() {
  const marker = join(TARGET, '.engine')
  if (existsSync(join(TARGET, 'whisper-server.exe')) && existsSync(marker) && readFileSync(marker, 'utf8') === ENGINE.sha256) return

  console.log('Downloading whisper.cpp engine')
  const zip = await download(ENGINE.url, ENGINE.sha256)
  const work = join(tmpdir(), `autodesk-speech-${process.pid}`)
  mkdirSync(work, { recursive: true })
  try {
    const archive = join(work, 'engine.zip')
    writeFileSync(archive, zip)
    const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar'
    const result = spawnSync(tar, ['-xf', archive, '-C', work], { stdio: 'inherit' })
    if (result.status !== 0) throw new Error('Could not extract the whisper.cpp archive')

    const release = join(work, 'Release')
    const files = readdirSync(release).filter((name) => ENGINE.files.test(name))
    if (!files.includes('whisper-server.exe')) throw new Error('whisper-server.exe is missing from the archive')
    for (const name of files) copyFileSync(join(release, name), join(TARGET, name))

    writeFileSync(join(TARGET, 'LICENSE-whisper.cpp.txt'), await download(LICENSE_URL))
    writeFileSync(marker, ENGINE.sha256)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

mkdirSync(TARGET, { recursive: true })
await fetchEngine()
await fetchModels()
console.log(`Speech files are ready in ${TARGET}`)
