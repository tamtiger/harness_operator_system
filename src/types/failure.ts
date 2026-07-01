export type FailureType = 'SYNTAX' | 'LOGIC' | 'ARCHITECTURE' | 'SECURITY' | 'CONVENTION' | 'SCOPE_CREEP'

export interface FailurePattern {
  id: string
  signature: string
  description: string
  failure_type: FailureType
  component: string
  occurrence_count: number
  task_ids: string[]
  first_seen: string
  last_seen: string
  promoted: boolean
  knowledge_file: string | null
}
