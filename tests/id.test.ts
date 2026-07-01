import { describe, it, expect } from 'vitest'
import { generateId, now, estimateTokens, contentHash } from '../src/utils/id.js'

describe('id utils', () => {
  it('generateId returns UUID v4', () => {
    expect(generateId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('generateId is unique', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })

  it('now returns ISO timestamp', () => {
    const ts = now()
    expect(new Date(ts).toISOString()).toBe(ts)
  })

  it('estimateTokens ~4 chars per token', () => {
    expect(estimateTokens('1234')).toBe(1)
    expect(estimateTokens('12345')).toBe(2)
    expect(estimateTokens('')).toBe(0)
  })

  it('contentHash returns consistent sha256', () => {
    const h1 = contentHash('hello')
    const h2 = contentHash('hello')
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64)
  })
})
