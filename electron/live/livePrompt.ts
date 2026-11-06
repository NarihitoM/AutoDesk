import type { TranscriptLine } from '@/shared/types/live'

const SPEAKER_LABELS = { them: 'Them', you: 'Me' } as const
const MAX_TRANSCRIPT_CHARS = 2400
const MAX_LATEST_CHARS = 600

function tail(text: string, maxChars: number): string {
  return text.length > maxChars ? `...${text.slice(-maxChars)}` : text
}

export function latestQuestion(lines: readonly TranscriptLine[]): string {
  return [...lines].reverse().find((line) => line.speaker === 'them')?.text ?? ''
}

export function formatTranscript(lines: readonly TranscriptLine[], maxChars = MAX_TRANSCRIPT_CHARS): string {
  const picked: string[] = []
  let length = 0
  for (const line of [...lines].reverse()) {
    const entry = `${SPEAKER_LABELS[line.speaker]}: ${tail(line.text, maxChars)}`
    if (picked.length > 0 && length + entry.length > maxChars) break
    picked.push(entry)
    length += entry.length + 1
  }
  return picked.reverse().join('\n')
}

export function buildLivePrompt(instructions: string, lines: readonly TranscriptLine[]): string {
  const transcript = formatTranscript(lines)
  const question = latestQuestion(lines)
  return [
    instructions,
    '',
    'Transcript so far ("Them" is the other person, "Me" is me):',
    transcript || '(nothing has been said yet)',
    '',
    question ? `Latest thing they said: ${tail(question, MAX_LATEST_CHARS)}` : 'Suggest what I could say next.'
  ].join('\n')
}
