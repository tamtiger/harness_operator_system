export type MemoryTier = 'SESSION' | 'PROJECT' | 'GLOBAL'

export interface MemoryEntry {
  id: string
  tier: MemoryTier
  key: string
  value: string
  created_at: string
  updated_at: string
  task_id?: string
  session_id?: string
}
