import { randomUUID, createHash } from 'node:crypto'

export function generateId(): string {
  return randomUUID()
}

export function now(): string {
  return new Date().toISOString()
}

/** Simple token estimation: ~4 chars per token */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}
