export type TaskType = 'FEATURE' | 'BUG' | 'REFACTOR' | 'OPS' | 'HOTFIX'

export type TaskStatus =
  | 'PENDING'
  | 'PLANNING'
  | 'AWAITING_APPROVAL'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'DONE'
  | 'FAILED'
  | 'ESCALATED'
  | 'CANCELLED'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Task {
  id: string
  repo: string
  session_id: string
  description: string
  type: TaskType
  status: TaskStatus
  risk_level: RiskLevel
  plan_id: string | null
  created_at: string
  completed_at: string | null
  cost_usd: number
  tokens_input: number
  tokens_output: number
  adapter: string
  retry_count: number
}
