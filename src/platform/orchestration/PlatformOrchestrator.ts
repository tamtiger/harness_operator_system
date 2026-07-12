import { RepositoryService, ContextService, ExecutionService, GovernanceService, CapabilityRegistry } from '../../shared/contracts/services';
import { TaskRequest, ExecutionResult } from '../../shared/types/execution';
import { RuntimeContext } from '../../shared/types/repository';
import { SharedHarnessInstaller } from '../install/SharedHarnessInstaller';
import { SharedHarnessUpdater } from '../update/SharedHarnessUpdater';
import { SharedHarnessSynchronizer } from '../sync/SharedHarnessSynchronizer';
import { AssetPublisher } from '../publish/AssetPublisher';
import { DiagnosticsEngine } from '../doctor/DiagnosticsEngine';
import { AssetCollection } from '../../shared/types/assets';
import * as path from 'path';
import { getDefaultHarnessPath } from '../../shared/utils/path';

export function getDefaultSharedPath(): string {
  return getDefaultHarnessPath();
}

export class PlatformOrchestrator {
  constructor(
    public repo: RepositoryService,
    public ctx: ContextService,
    public exec: ExecutionService,
    public gov: GovernanceService,
    public registry: CapabilityRegistry,
    public installer: SharedHarnessInstaller,
    public updater: SharedHarnessUpdater,
    public synchronizer: SharedHarnessSynchronizer,
    public publisher: AssetPublisher,
    public doctor: DiagnosticsEngine,
    public rootPath: string,
    public sharedPath: string
  ) {
    this.rootPath = rootPath || process.cwd();
    this.sharedPath = sharedPath || getDefaultSharedPath();
  }

  private async buildBaseContext(request: TaskRequest): Promise<{ runtimeCtx: RuntimeContext; effective: AssetCollection }> {
    const root = this.repo.discover(this.rootPath!);
    const manifest = this.repo.loadManifest(root);
    
    let shared: AssetCollection = { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] };
    try {
      shared = this.repo.loadSharedAssets(path.join(this.sharedPath!, 'shared'));
    } catch (e) {
      // ignore
    }

    const local = this.repo.loadLocalAssets(root, manifest);
    const effective = this.repo.resolveAssets(shared, local);
    
    const metadata = {
      root,
      name: manifest.repository.name || 'unnamed',
      manifest,
      discoveredAt: new Date().toISOString()
    };

    const repoCtx = this.repo.buildContext(effective, metadata);
    const runtimeCtx = this.ctx.buildRuntimeContext(repoCtx, request);
    return { runtimeCtx, effective };
  }

  async run(request: TaskRequest): Promise<ExecutionResult> {
    const { runtimeCtx } = await this.buildBaseContext(request);
    return this.exec.execute(runtimeCtx, request);
  }

  async buildContextPreview(request: TaskRequest): Promise<RuntimeContext> {
    const { runtimeCtx } = await this.buildBaseContext(request);
    return runtimeCtx;
  }
}
