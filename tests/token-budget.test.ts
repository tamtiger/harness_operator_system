import { describe, it, expect } from 'vitest'
import { computeTokenBudget } from '../src/utils/token-budget.js'

describe('computeTokenBudget', () => {
  it('returns correct totals by risk', () => {
    expect(computeTokenBudget('LOW').total).toBe(30_000)
    expect(computeTokenBudget('MEDIUM').total).toBe(45_000)
    expect(computeTokenBudget('HIGH').total).toBe(60_000)
    expect(computeTokenBudget('CRITICAL').total).toBe(80_000)
  })

  it('allocates correct percentages', () => {
    const b = computeTokenBudget('LOW')
    expect(b.system).toBe(3_000)     // 10%
    expect(b.plan).toBe(4_500)       // 15%
    expect(b.knowledge).toBe(15_000) // 50%
    expect(b.code).toBe(6_000)       // 20%
    expect(b.memory).toBe(1_500)     // 5%
  })

  it('respects override total', () => {
    const b = computeTokenBudget('LOW', 50_000)
    expect(b.total).toBe(50_000)
    expect(b.knowledge).toBe(25_000)
  })
})
