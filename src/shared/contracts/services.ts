import { RelativePath, CacheKey, CapabilityId, ProposalId } from '../types/primitives';
import { Manifest, RepositoryMetadata, RepositoryContext, RuntimeContext, RepositoryRoot } from '../types/repository';
import { AssetCollection, EffectiveAssetCollection, CapabilityDefinition } from '../types/assets';
import { CapabilityResult } from '../types/capability';
import { ValidationResult, InstallConfig, InstallResult, UpdateConfig, UpdateResult, SyncConfig, SyncResult, PublishRequest, PublishResult, DiagnosticReport, PlatformStatus, ProposalRequest, ProposalFilter, PromotionResult } from '../types/platform';
import { TaskRequest, TaskState, ExecutionResult, CancelResult } from '../types/execution';
import { Proposal, AuditRecord } from '../types/governance';

export interface DirEntry {
  name: string;
  type: 'file' | 'dir';
}

export interface FileSystemOps {
  read(root: RepositoryRoot, path: RelativePath): string;
  write(root: RepositoryRoot, path: RelativePath, data: string): void;
  existsFile(root: RepositoryRoot, path: RelativePath): boolean;
  existsDir(root: RepositoryRoot, path: RelativePath): boolean;
  deleteFile(root: RepositoryRoot, path: RelativePath): void;
  moveFile(root: RepositoryRoot, src: RelativePath, dest: RelativePath): void;
  copyFile(root: RepositoryRoot, src: RelativePath, dest: RelativePath): void;
  listDir(root: RepositoryRoot, path: RelativePath): DirEntry[];
  mkDir(root: RepositoryRoot, path: RelativePath, recursive?: boolean): void;
  rmDir(root: RepositoryRoot, path: RelativePath, recursive?: boolean): void;
}

export interface RepositoryService {
  discover(workingDir: string): RepositoryRoot;
  loadManifest(root: RepositoryRoot): Manifest;
  loadSharedAssets(sharedPath: string): AssetCollection;
  loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection;
  resolveAssets(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection;
  buildContext(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext;
  persist(root: RepositoryRoot, path: RelativePath, data: string): void;
  readFile(root: RepositoryRoot, path: RelativePath): string;
  fileExists(root: RepositoryRoot, path: RelativePath): boolean;
  dirExists(root: RepositoryRoot, path: RelativePath): boolean;
  ensureDir(root: RepositoryRoot, path: RelativePath): void;
  readDir(root: RepositoryRoot, path: RelativePath): string[];
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
  getDefinition(id: CapabilityId): CapabilityDefinition;
  invoke(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult>;
  list(): CapabilityDefinition[];
  isRegistered(id: CapabilityId): boolean;
}

export interface GovernanceService {
  submitProposal(request: ProposalRequest): Proposal;
  submitExistingProposal(id: ProposalId): Proposal;
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
  validate(root?: string): Promise<ValidationResult>;
  status(): Promise<PlatformStatus>;
  listCapabilities(): Promise<CapabilityDefinition[]>;
  previewContext(request: TaskRequest): Promise<RuntimeContext>;
  invokeCapability(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult>;
  cancelTask(taskId: string): Promise<CancelResult>;
  submitProposal(request: ProposalRequest): Promise<Proposal>;
  submitExistingProposal(id: ProposalId): Promise<Proposal>;
  listProposals(filter: ProposalFilter): Promise<Proposal[]>;
  getProposal(id: ProposalId): Promise<Proposal>;
  reviewProposal(id: ProposalId, reviewer: string): Promise<Proposal>;
  approveProposal(id: ProposalId, reviewer: string, comments?: string): Promise<Proposal>;
  rejectProposal(id: ProposalId, reviewer: string, comments: string): Promise<Proposal>;
}
