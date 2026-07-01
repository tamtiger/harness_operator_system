export type VerificationLayer =
  | 'syntax'
  | 'lint'
  | 'unit_test'
  | 'architecture'
  | 'security'
  | 'ai_review'
  | 'mutation'

export type VerificationStatus = 'PASS' | 'FAIL' | 'SKIP'
export type ErrorSeverity = 'ERROR' | 'WARNING'

export interface VerificationError {
  code: string
  message: string
  file: string | null
  line: number | null
  severity: ErrorSeverity
}

export interface LayerResult {
  status: VerificationStatus
  duration_ms: number
  errors: VerificationError[]
}

export interface VerificationResult {
  id: string
  task_id: string
  attempt: number
  overall: 'PASS' | 'FAIL'
  layers: Partial<Record<VerificationLayer, LayerResult>>
  created_at: string
}
