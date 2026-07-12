import { RepositoryService, ContextService, ExecutionService, GovernanceService, CapabilityRegistry } from '../../shared/contracts/services';
import { TaskRequest, ExecutionResult } from '../../shared/types/execution';
import { SharedHarnessInstaller } from '../install/SharedHarnessInstaller';
import { SharedHarnessUpdater } from '../update/SharedHarnessUpdater';
import { SharedHarnessSynchronizer } from '../sync/SharedHarnessSynchronizer';
import { AssetPublisher } from '../publish/AssetPublisher';
import { DiagnosticsEngine } from '../doctor/DiagnosticsEngine';
import { AssetCollection } from '../../shared/types/assets';
import * as os from 'os';
import * as path from 'path';

export function getDefaultSharedPath(): string {
  return path.join(os.homedir(), '.harness');
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
    public doctor: DiagnosticsEngine
  ) {}

  async run(request: TaskRequest): Promise<ExecutionResult> {
    const root = this.repo.discover(process.cwd());
    const manifest = this.repo.loadManifest(root);
    const sharedPath = getDefaultSharedPath();
    
    // Load shared assets
    let shared: AssetCollection = { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] };
    try {
      shared = this.repo.loadSharedAssets(path.join(sharedPath, 'shared'));
    } catch (e) {
      // ignore
    }

    const local = this.repo.loadLocalAssets(root, manifest);
    const assets = this.repo.resolveAssets(shared, local);
    
    const metadata = {
      root,
      name: manifest.repository.name || 'unnamed',
      manifest,
      discoveredAt: new Date().toISOString()
    };

    const repoCtx = this.repo.buildContext(assets, metadata);
    const runtimeCtx = this.ctx.buildRuntimeContext(repoCtx, request);

    return this.exec.execute(runtimeCtx, request);
  }
}
