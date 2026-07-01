export type AuditEventType =
  | 'task.created' | 'task.done' | 'task.failed' | 'task.cancelled'
  | 'plan.generated' | 'plan.approved' | 'plan.rejected' | 'plan.rolled_back'
  | 'step.started' | 'step.done' | 'step.failed'
  | 'verification.started' | 'verification.layer' | 'verification.done'
  | 'ai.call' | 'ai.unavailable'
  | 'rollback.started' | 'rollback.done'
  | 'scope_creep.detected'
  | 'cost.warning' | 'cost.blocked'
  | 'escalation.human_required'

export interface AuditEvent {
  ts: string
  event: AuditEventType
  task_id: string
  data?: Record<string, unknown>
}

export interface MetricEvent {
  ts: string
  event: 'task.done'
  task_id: string
  duration_ms: number
  cost_usd: number
  tokens_in: number
  tokens_out: number
  retry_count: number
  risk: string
  adapter: string
}
