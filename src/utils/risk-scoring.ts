import type { RiskLevel } from '../types/task.js'
import type { PlanImpact } from '../types/plan.js'

const HIGH_RISK_SCOPES = ['auth', 'payment', 'security', 'shared infrastructure']

const CRITICAL_INDICATORS = [
  'production data migration',
  'credential rotation',
  'secret rotation',
  'external api contract change',
]

/**
 * Deterministic risk scoring from plan impact.
 * AI cannot assign risk — this formula does (AC-02).
 */
export function scoreRisk(impact: PlanImpact, taskDescription?: string): RiskLevel {
  const desc = (taskDescription ?? '').toLowerCase()

  // CRITICAL
  if (CRITICAL_INDICATORS.some((indicator) => desc.includes(indicator))) {
    return 'CRITICAL'
  }

  // HIGH
  if (impact.breaking_changes || impact.public_api_change) {
    return 'HIGH'
  }
  if (HIGH_RISK_SCOPES.some((scope) => desc.includes(scope))) {
    return 'HIGH'
  }

  // MEDIUM
  if (
    impact.files_to_change.length > 5 ||
    impact.interfaces_affected.length > 0 ||
    impact.db_schema_change
  ) {
    return 'MEDIUM'
  }

  return 'LOW'
}
