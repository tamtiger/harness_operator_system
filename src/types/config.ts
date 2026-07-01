import type { RiskLevel } from './task.js'

export interface ProjectConfig {
  namespace: string
  language: string
  framework: string
  approval?: {
    auto_approve_risk?: RiskLevel[]
    approval_timeout_minutes?: number | null
  }
  plugins?: string[]
  team?: {
    approvers?: string[]
  }
  cost?: {
    warn_per_task_usd?: number
    block_per_task_usd?: number
  }
  knowledge?: {
    include?: string[]
  }
  context?: {
    budget_tokens?: number
  }
}
