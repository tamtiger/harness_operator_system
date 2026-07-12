import { RepositoryRoot, RelativePath, CacheKey, CapabilityId, ProposalId } from '../types/primitives';
import { Manifest, RepositoryMetadata, RepositoryContext, RuntimeContext } from '../types/repository';
import { AssetCollection, EffectiveAssetCollection, CapabilityDefinition } from '../types/assets';
import { ValidationResult, InstallConfig, InstallResult, UpdateConfig, UpdateResult, SyncConfig, SyncResult, PublishRequest, PublishResult, DiagnosticReport, PlatformStatus, ProposalRequest, ProposalFilter, PromotionResult } from '../types/platform';
import { TaskRequest, TaskState, ExecutionResult, CancelResult } from '../types/execution';
import { CapabilityResult } from '../types/capability';
import { Proposal, AuditRecord } from '../types/governance';

export interface RepositoryService {
  discover(workingDir: string): RepositoryRoot;
  loadManifest(root: RepositoryRoot): Manifest;
  loadSharedAssets(sharedPath: string): AssetCollection;
  loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection;
  resolveAssets(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection;
  buildContext(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext;
  persist(root: RepositoryRoot, path: RelativePath, data: string): void;
  validate(root: RepositoryRoot): ValidationResult;
}

export interface ContextService {
  buildRuntimeContext(repoContext: RepositoryContext, request: TaskRequest): RuntimeContext;
  invalidateCache(key: CacheKey): void;
}

export interface ExecutionService {
  execute(context: RuntimeContext, request: TaskRequest): Promise<ExecutionResult>;
  cancel(taskId: string): Promise<CancelResult>;
  getStatus(taskId: string): TaskState;
}

export interface CapabilityImpl {
  execute(context: RuntimeContext, input: unknown): Promise<unknown>;
}

export interface CapabilityRegistry {
  register(def: CapabilityDefinition, impl: CapabilityImpl): void;
  unregister(id: CapabilityId): void;
  resolve(id: CapabilityId): CapabilityImpl;
  invoke(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult>;
  list(): CapabilityDefinition[];
  isRegistered(id: CapabilityId): boolean;
}

export interface GovernanceService {
  submitProposal(request: ProposalRequest): Proposal;
  listProposals(filter: ProposalFilter): Proposal[];
  getProposal(id: ProposalId): Proposal;
  review(id: ProposalId, reviewer: string): Proposal;
  approve(id: ProposalId, reviewer: string, comments: string): Proposal;
  reject(id: ProposalId, reviewer: string, comments: string): Proposal;
  requestChanges(id: ProposalId, reviewer: string, comments: string): Proposal;
  promote(id: ProposalId): PromotionResult;
  getAuditLog(proposalId: ProposalId): AuditRecord[];
}

export interface PlatformService {
  run(request: TaskRequest): Promise<ExecutionResult>;
  install(config: InstallConfig): Promise<InstallResult>;
  update(config: UpdateConfig): Promise<UpdateResult>;
  sync(config: SyncConfig): Promise<SyncResult>;
  publish(request: PublishRequest): Promise<PublishResult>;
  doctor(): Promise<DiagnosticReport>;
  validate(root: string): Promise<ValidationResult>;
  status(): Promise<PlatformStatus>;
  submitProposal(request: ProposalRequest): Promise<Proposal>;
  listProposals(filter: ProposalFilter): Promise<Proposal[]>;
  approveProposal(id: ProposalId, reviewer: string, comments?: string): Promise<Proposal>;
}
