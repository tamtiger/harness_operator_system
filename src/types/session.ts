export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface Session {
  id: string
  namespace: string
  status: SessionStatus
  task_id: string | null
  started_at: string
  ended_at: string | null
  total_cost_usd: number
  total_tokens_in: number
  total_tokens_out: number
}
