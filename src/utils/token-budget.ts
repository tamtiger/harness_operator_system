import type { RiskLevel } from '../types/task.js'
import type { TokenBudget } from '../types/context.js'

const BUDGET_BY_RISK: Record<RiskLevel, number> = {
  LOW: 30_000,
  MEDIUM: 45_000,
  HIGH: 60_000,
  CRITICAL: 80_000,
}

const ALLOCATION = {
  system: 0.10,
  plan: 0.15,
  knowledge: 0.50,
  code: 0.20,
  memory: 0.05,
} as const

export function computeTokenBudget(riskLevel: RiskLevel, overrideTotal?: number): TokenBudget {
  const total = overrideTotal ?? BUDGET_BY_RISK[riskLevel]
  return {
    total,
    system: Math.floor(total * ALLOCATION.system),
    plan: Math.floor(total * ALLOCATION.plan),
    knowledge: Math.floor(total * ALLOCATION.knowledge),
    code: Math.floor(total * ALLOCATION.code),
    memory: Math.floor(total * ALLOCATION.memory),
  }
}
