import { describe, it, expect } from 'vitest'
import { scoreRisk } from '../src/utils/risk-scoring.js'
import type { PlanImpact } from '../src/types/plan.js'

function makeImpact(overrides: Partial<PlanImpact> = {}): PlanImpact {
  return {
    files_to_change: [],
    interfaces_affected: [],
    breaking_changes: false,
    db_schema_change: false,
    public_api_change: false,
    ...overrides,
  }
}

describe('scoreRisk', () => {
  it('returns LOW for minimal impact', () => {
    expect(scoreRisk(makeImpact())).toBe('LOW')
  })

  it('returns MEDIUM when files_to_change > 5', () => {
    expect(scoreRisk(makeImpact({ files_to_change: ['a','b','c','d','e','f'] }))).toBe('MEDIUM')
  })

  it('returns MEDIUM when interfaces_affected is not empty', () => {
    expect(scoreRisk(makeImpact({ interfaces_affected: ['IPayment'] }))).toBe('MEDIUM')
  })

  it('returns MEDIUM when db_schema_change is true', () => {
    expect(scoreRisk(makeImpact({ db_schema_change: true }))).toBe('MEDIUM')
  })

  it('returns HIGH when breaking_changes is true', () => {
    expect(scoreRisk(makeImpact({ breaking_changes: true }))).toBe('HIGH')
  })

  it('returns HIGH when public_api_change is true', () => {
    expect(scoreRisk(makeImpact({ public_api_change: true }))).toBe('HIGH')
  })

  it('returns HIGH for security keywords', () => {
    expect(scoreRisk(makeImpact(), 'update auth middleware')).toBe('HIGH')
    expect(scoreRisk(makeImpact(), 'fix payment processing')).toBe('HIGH')
  })

  it('returns CRITICAL for production data migration', () => {
    expect(scoreRisk(makeImpact(), 'production data migration')).toBe('CRITICAL')
  })

  it('returns CRITICAL for credential rotation', () => {
    expect(scoreRisk(makeImpact(), 'credential rotation')).toBe('CRITICAL')
  })

  it('CRITICAL overrides everything', () => {
    expect(scoreRisk(makeImpact({ breaking_changes: true }), 'production data migration')).toBe('CRITICAL')
  })
})
