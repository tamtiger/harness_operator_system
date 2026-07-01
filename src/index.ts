// ─── Domain Types ───
export type { Task, TaskType, TaskStatus, RiskLevel } from './types/task.js'
export type { Plan, PlanStep, PlanImpact, PlanStatus, StepStatus, StepAction } from './types/plan.js'
export type {
  KnowledgeEntry, KnowledgeType,
  RepoMap, RepoMapModule,
  ConceptMap, ConceptMapEntry,
  GlossaryTerm,
} from './types/knowledge.js'
export type {
  VerificationResult, VerificationLayer, VerificationStatus,
  VerificationError, LayerResult, ErrorSeverity,
} from './types/verification.js'
export type { FailurePattern, FailureType } from './types/failure.js'
export type { ProjectConfig } from './types/config.js'
export type { Context, ContextItem, TokenBudget } from './types/context.js'
export type { MemoryEntry, MemoryTier } from './types/memory.js'
export type { Session, SessionStatus } from './types/session.js'
export type { CodeSymbol, CodeReference, SymbolType, ReferenceType } from './types/code-index.js'
export type { AuditEvent, AuditEventType, MetricEvent } from './types/events.js'

// ─── Engine Interfaces ───
export type {
  IKnowledgeEngine,
  IContextEngine,
  IPlanningEngine,
  IRuntimeEngine,
  IVerificationEngine,
  ICodeIndex,
  IMemoryStore,
  IAuditLogger,
} from './types/engines.js'

// ─── Schemas ───
export { ProjectConfigSchema, type ValidatedProjectConfig } from './schemas/config.schema.js'

// ─── Utils ───
export { generateId, now, estimateTokens, contentHash } from './utils/id.js'
export { computeTokenBudget } from './utils/token-budget.js'
export { scoreRisk } from './utils/risk-scoring.js'
