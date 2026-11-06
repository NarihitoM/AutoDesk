const NOISE_TAGS = /\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|♪+/g

const HALLUCINATIONS = new Set([
  'you',
  'thank you',
  'thanks',
  'thank you for watching',
  'thanks for watching',
  'please subscribe',
  'bye',
  'okay',
  'so'
])

const QUESTION_START =
  /^(what|why|how|when|where|who|whom|whose|which|can|could|would|will|shall|should|do|does|did|is|are|was|were|have|has|had|may|might|tell me|describe|explain|walk me through|give me|talk about|share)\b/i

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cleanTranscript(raw: string): string {
  const text = raw.replace(NOISE_TAGS, ' ').replace(/\s+/g, ' ').trim()
  if (!/[\p{L}\p{N}]/u.test(text)) return ''
  if (HALLUCINATIONS.has(normalize(text))) return ''
  return text
}

export function looksLikeQuestion(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.endsWith('?')) return true
  return trimmed.split(/(?<=[.!?])\s+/).some((sentence) => QUESTION_START.test(sentence.trim()))
}
