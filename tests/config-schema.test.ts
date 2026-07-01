import { describe, it, expect } from 'vitest'
import { ProjectConfigSchema } from '../src/schemas/config.schema.js'

describe('ProjectConfigSchema', () => {
  it('validates minimal config', () => {
    const r = ProjectConfigSchema.safeParse({ namespace: 'test', language: 'ts', framework: 'node' })
    expect(r.success).toBe(true)
  })

  it('rejects empty namespace', () => {
    expect(ProjectConfigSchema.safeParse({ namespace: '', language: 'ts', framework: 'node' }).success).toBe(false)
  })

  it('rejects uppercase namespace', () => {
    expect(ProjectConfigSchema.safeParse({ namespace: 'MyApp', language: 'ts', framework: 'node' }).success).toBe(false)
  })

  it('rejects knowledge paths with ..', () => {
    const r = ProjectConfigSchema.safeParse({
      namespace: 'test', language: 'ts', framework: 'node',
      knowledge: { include: ['../outside'] },
    })
    expect(r.success).toBe(false)
  })

  it('rejects absolute knowledge paths', () => {
    const r = ProjectConfigSchema.safeParse({
      namespace: 'test', language: 'ts', framework: 'node',
      knowledge: { include: ['/etc/passwd'] },
    })
    expect(r.success).toBe(false)
  })

  it('applies defaults', () => {
    const r = ProjectConfigSchema.parse({ namespace: 'test', language: 'ts', framework: 'node' })
    expect(r.approval?.auto_approve_risk).toEqual(['LOW'])
    expect(r.cost?.warn_per_task_usd).toBe(0.50)
    expect(r.cost?.block_per_task_usd).toBe(2.00)
  })
})
