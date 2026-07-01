import type { KnowledgeEntry, KnowledgeType, RepoMap, ConceptMap, GlossaryTerm } from './knowledge.js'
import type { Context, ContextItem } from './context.js'
import type { Task, TaskType, RiskLevel } from './task.js'
import type { Plan } from './plan.js'
import type { VerificationResult, LayerResult } from './verification.js'
import type { CodeSymbol, CodeReference } from './code-index.js'
import type { MemoryEntry, MemoryTier } from './memory.js'
import type { AuditEvent, MetricEvent } from './events.js'

/** Knowledge Engine — Module duy nhất đọc knowledge sources (AC-03) */
export interface IKnowledgeEngine {
  index(repoPath: string): Promise<void>
  search(query: string, topK?: number): Promise<KnowledgeEntry[]>
  getRepoMap(): Promise<RepoMap | null>
  getConceptMap(): Promise<ConceptMap | null>
  getGlossary(): Promise<GlossaryTerm[]>
  getByType(type: KnowledgeType): Promise<KnowledgeEntry[]>
  invalidateCache(): Promise<void>
}

/** Context Engine — Build context cho AI, trong giới hạn token budget */
export interface IContextEngine {
  buildContext(taskDescription: string, riskLevel: RiskLevel): Promise<Context>
  getRelevantItems(query: string, budget: number): Promise<ContextItem[]>
}

/**
 * Planning Engine — Nhận plan từ AI, validate, score risk, approve/reject.
 * Phase 1 (Pull model): AI submit plan qua MCP. Harness không yêu cầu AI sinh plan.
 */
export interface IPlanningEngine {
  submitPlan(plan: Plan, repoPath: string): Promise<{ status: 'approved' | 'rejected' | 'awaiting_approval'; errors?: string[]; risk_level: RiskLevel }>
  validatePlan(plan: Plan, repoPath: string): Promise<{ valid: boolean; errors: string[] }>
  scorePlanRisk(plan: Plan): RiskLevel
  approvePlan(planId: string, by: string): Promise<void>
  rejectPlan(planId: string, reason: string): Promise<void>
  getCurrentPlan(taskId: string): Promise<Plan | null>
}

/**
 * Runtime Engine — Track state, checkpoint, rollback.
 * Pull model: AI tự loop steps, gọi Harness báo progress.
 * Harness KHÔNG điều phối AI execution.
 */
export interface IRuntimeEngine {
  startTask(description: string, type?: TaskType): Promise<Task>
  reportProgress(taskId: string, stepId: string, status: 'IN_PROGRESS' | 'DONE' | 'FAILED', details?: string): Promise<void>
  reportCompletion(taskId: string): Promise<VerificationResult>
  checkpoint(taskId: string, stepId: string): Promise<string>
  rollback(taskId: string, toStepId?: string): Promise<void>
  getTaskStatus(taskId: string): Promise<Task>
}

/** Verification Engine — L1-L4 automated checks, độc lập với AI (AC-04) */
export interface IVerificationEngine {
  verify(task: Task, plan: Plan): Promise<VerificationResult>
  runLayer(layer: string, repoPath: string, changedFiles: string[]): Promise<LayerResult>
}

/** Code Index — tree-sitter → symbols.db */
export interface ICodeIndex {
  buildIndex(repoPath: string): Promise<void>
  getSymbol(name: string): Promise<CodeSymbol[]>
  getReferences(symbolId: string): Promise<CodeReference[]>
  getFileSymbols(filePath: string): Promise<CodeSymbol[]>
  findCallers(symbolId: string): Promise<CodeReference[]>
  getAffectedTests(changedFiles: string[]): Promise<string[]>
}

/** Memory Store — Session memory (Phase 1), Project memory (Phase 2) */
export interface IMemoryStore {
  get(tier: MemoryTier, key: string): Promise<MemoryEntry | null>
  set(tier: MemoryTier, key: string, value: string, meta?: { task_id?: string; session_id?: string }): Promise<void>
  list(tier: MemoryTier): Promise<MemoryEntry[]>
  delete(tier: MemoryTier, key: string): Promise<void>
  clear(tier: MemoryTier): Promise<void>
}

/** Audit Logger — Append-only event log */
export interface IAuditLogger {
  log(event: AuditEvent): Promise<void>
  logMetric(event: MetricEvent): Promise<void>
  getEvents(taskId: string): Promise<AuditEvent[]>
}
