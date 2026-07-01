import type { RiskLevel } from './task.js'

export type PlanStatus = 'DRAFT' | 'APPROVED' | 'EXECUTING' | 'DONE' | 'ROLLED_BACK'
export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED' | 'ROLLED_BACK'
export type StepAction = 'create' | 'update' | 'delete' | 'move'

export interface PlanImpact {
  files_to_change: string[]
  interfaces_affected: string[]
  breaking_changes: boolean
  db_schema_change: boolean
  public_api_change: boolean
}

export interface PlanStep {
  id: string
  order: number
  action: StepAction
  file_path: string | null
  description: string
  rationale: string
  risk_note: string
  status: StepStatus
  checkpoint_id: string | null
}

export interface Plan {
  id: string
  task_id: string
  version: number
  status: PlanStatus
  risk_level: RiskLevel
  steps: PlanStep[]
  impact: PlanImpact
  rollback_plan: string
  test_strategy: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
}
