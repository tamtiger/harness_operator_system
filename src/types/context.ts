import type { RiskLevel } from './task.js'

export interface TokenBudget {
  total: number
  system: number
  plan: number
  knowledge: number
  code: number
  memory: number
}

export interface ContextItem {
  id: string
  type: 'architecture' | 'adr' | 'convention' | 'glossary' | 'code' | 'memory' | 'failure'
  title: string
  content: string
  relevance_score: number
  token_count: number
}

export interface Context {
  task_id: string
  risk_level: RiskLevel
  budget: TokenBudget
  items: ContextItem[]
  dropped_items: Array<{ id: string; title: string; reason: string }>
  assembled_at: string
}
