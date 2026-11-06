import type { TranscriptLine } from '@/shared/types/live'

const SPEAKER_LABELS = { them: 'Them', you: 'Me' } as const
const HISTORY_MESSAGES = 5
const MAX_MESSAGE_CHARS = 400

export function trimMessage(text: string, maxChars = MAX_MESSAGE_CHARS): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > maxChars ? `...${clean.slice(-maxChars).trimStart()}` : clean
}

export function latestQuestion(lines: readonly TranscriptLine[]): string {
  return [...lines].reverse().find((line) => line.speaker === 'them')?.text ?? ''
}

export function formatTranscript(
  lines: readonly TranscriptLine[],
  maxMessages = HISTORY_MESSAGES,
  maxChars = MAX_MESSAGE_CHARS
): string {
  return lines
    .map((line) => ({ speaker: line.speaker, text: trimMessage(line.text, maxChars) }))
    .filter((line) => line.text !== '')
    .slice(-maxMessages)
    .map((line) => `${SPEAKER_LABELS[line.speaker]}: ${line.text}`)
    .join('\n')
}

export function buildLivePrompt(instructions: string, lines: readonly TranscriptLine[]): string {
  const transcript = formatTranscript(lines)
  const question = latestQuestion(lines)
  return [
    instructions,
    '',
    `Last ${HISTORY_MESSAGES} messages ("Them" is the other person, "Me" is me):`,
    transcript || '(nothing has been said yet)',
    '',
    question ? `Latest thing they said: ${trimMessage(question)}` : 'Suggest what I could say next.'
  ].join('\n')
}
