import { RepositoryService, PlatformService } from '../src/shared/contracts/services';
import { RelativePath } from '../src/shared/types/primitives';
import { Manifest, RepositoryMetadata, RepositoryContext, RepositoryRoot } from '../src/shared/types/repository';
import { AssetCollection, EffectiveAssetCollection } from '../src/shared/types/assets';
import { ValidationResult, InstallConfig, InstallResult, UpdateConfig, UpdateResult, SyncConfig, SyncResult, PublishRequest, PublishResult, DiagnosticReport, PlatformStatus, ProposalRequest, ProposalFilter } from '../src/shared/types/platform';
import { TaskRequest, ExecutionResult } from '../src/shared/types/execution';
import { Proposal } from '../src/shared/types/governance';

export class MockRepositoryService implements RepositoryService {
  discover(workingDir: string): RepositoryRoot { throw new Error('Not implemented'); }
  loadManifest(root: RepositoryRoot): Manifest { throw new Error('Not implemented'); }
  loadSharedAssets(sharedPath: string): AssetCollection { throw new Error('Not implemented'); }
  loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection { throw new Error('Not implemented'); }
  resolveAssets(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection { throw new Error('Not implemented'); }
  buildContext(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext { throw new Error('Not implemented'); }
  persist(root: RepositoryRoot, path: RelativePath, data: string): void { throw new Error('Not implemented'); }
  validate(root: RepositoryRoot): ValidationResult { throw new Error('Not implemented'); }
}

export class MockPlatformService implements PlatformService {
  run(request: TaskRequest): Promise<ExecutionResult> { throw new Error('Not implemented'); }
  install(config: InstallConfig): Promise<InstallResult> { throw new Error('Not implemented'); }
  update(config: UpdateConfig): Promise<UpdateResult> { throw new Error('Not implemented'); }
  sync(config: SyncConfig): Promise<SyncResult> { throw new Error('Not implemented'); }
  publish(request: PublishRequest): Promise<PublishResult> { throw new Error('Not implemented'); }
  doctor(): Promise<DiagnosticReport> { throw new Error('Not implemented'); }
  validate(root: string): Promise<ValidationResult> { throw new Error('Not implemented'); }
  status(): Promise<PlatformStatus> { throw new Error('Not implemented'); }
  submitProposal(request: ProposalRequest): Promise<Proposal> { throw new Error('Not implemented'); }
  listProposals(filter: ProposalFilter): Promise<Proposal[]> { throw new Error('Not implemented'); }
  approveProposal(id: string, reviewer: string, comments?: string): Promise<Proposal> { throw new Error('Not implemented'); }
}
