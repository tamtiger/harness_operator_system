import { RelativePath, ISO8601, CapabilityId } from './primitives';

export interface RepositoryRoot {
  path: string;
  hasGit: boolean;
  discoveredAt: string;
}
import { EffectiveAssetCollection, Rule, Knowledge, Workflow } from './assets';
import { ADR } from './governance';
import { Permission } from './enums';

export interface ContextConfig {
  token_budget?: number;
  budget_strategy?: 'priority_trim' | 'hard_limit';
}

export interface AgentConfig {
  entry_point: string;
  context?: ContextConfig;
}

export interface SourceConfig {
  id: string;
  type: 'git' | 'local_path' | 'registry';
  uri: string;
  version?: string;
  verified?: boolean;
}

export interface CapabilityConfig {
  id: CapabilityId;
  source: 'shared' | 'local' | 'external';
  path?: RelativePath;
  package?: string;
  version?: string;
}

export interface ArtifactConfig {
  type: string;
  path: string;
}

export interface GovernanceConfig {
  auto_submit_proposals?: boolean;
  require_evidence?: boolean;
  min_evidence_count?: number;
}

export interface RepositoryConfig {
  name?: string;
  root: string;
  description?: string;
}

export interface Manifest {
  version: number;
  specification: string;
  repository: RepositoryConfig;
  agent: AgentConfig;
  sources?: SourceConfig[];
  capabilities?: CapabilityConfig[];
  artifacts: ArtifactConfig[];
  governance?: GovernanceConfig;
  vendor?: Record<string, unknown>;
}

export interface RepositoryMetadata {
  root: RepositoryRoot;
  name?: string;
  manifest: Manifest;
  gitBranch?: string;
  gitCommit?: string;
}

export interface RepositoryContext {
  metadata: RepositoryMetadata;
  assets: EffectiveAssetCollection;
  repositoryMap?: string;
  adrs?: ADR[];
  buildTimestamp: ISO8601;
}

export interface TaskContext {
  taskType?: string;
  workingDirectory?: string;
  tags?: string[];
}

export interface BudgetAllocation {
  totalTokens: number;
  allocated: {
    rules: number;
    knowledge: number;
    prompts: number;
    workflows: number;
    metadata: number;
  };
  remaining: number;
}

export interface RuntimeContext extends RepositoryContext {
  taskContext: TaskContext;
  budget: BudgetAllocation;
  rankedRules: Rule[];
  relevantKnowledge: Knowledge[];
  activeWorkflow?: Workflow;
  availableCapabilities: CapabilityId[];
  permissions?: Permission[];
  agentsMd?: string;
}
