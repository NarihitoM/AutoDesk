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
