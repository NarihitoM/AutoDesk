import type { TranscriptLine } from '@/shared/types/live'

const HISTORY_MESSAGES = 5
const MAX_MESSAGE_CHARS = 400

export function trimMessage(text: string, maxChars = MAX_MESSAGE_CHARS): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > maxChars ? `...${clean.slice(-maxChars).trimStart()}` : clean
}

export function latestQuestion(lines: readonly TranscriptLine[]): string {
  return lines.at(-1)?.text ?? ''
}

export function formatTranscript(
  lines: readonly TranscriptLine[],
  maxMessages = HISTORY_MESSAGES,
  maxChars = MAX_MESSAGE_CHARS
): string {
  return lines
    .map((line) => trimMessage(line.text, maxChars))
    .filter((text) => text !== '')
    .slice(-maxMessages)
    .map((text) => `- ${text}`)
    .join('\n')
}

export function buildLivePrompt(instructions: string, lines: readonly TranscriptLine[]): string {
  const transcript = formatTranscript(lines)
  const question = latestQuestion(lines)
  return [
    instructions,
    '',
    `Last ${HISTORY_MESSAGES} messages heard from my computer's audio:`,
    transcript || '(nothing has been said yet)',
    '',
    question ? `Latest message: ${trimMessage(question)}` : 'Reply to what was said.'
  ].join('\n')
}
