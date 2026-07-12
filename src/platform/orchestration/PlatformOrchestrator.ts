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

export interface PlatformServices {
  repo: RepositoryService;
  ctx: ContextService;
  exec: ExecutionService;
  gov: GovernanceService;
  registry: CapabilityRegistry;
}

export interface PlatformTools {
  installer: SharedHarnessInstaller;
  updater: SharedHarnessUpdater;
  synchronizer: SharedHarnessSynchronizer;
  publisher: AssetPublisher;
  doctor: DiagnosticsEngine;
}

export interface PlatformConfig {
  rootPath: string;
  sharedPath: string;
}

export class PlatformOrchestrator {
  readonly repo: RepositoryService;
  readonly ctx: ContextService;
  readonly exec: ExecutionService;
  readonly gov: GovernanceService;
  readonly registry: CapabilityRegistry;
  readonly installer: SharedHarnessInstaller;
  readonly updater: SharedHarnessUpdater;
  readonly synchronizer: SharedHarnessSynchronizer;
  readonly publisher: AssetPublisher;
  readonly doctor: DiagnosticsEngine;
  readonly rootPath: string;
  readonly sharedPath: string;

  constructor(services: PlatformServices, tools: PlatformTools, config: PlatformConfig) {
    this.repo = services.repo;
    this.ctx = services.ctx;
    this.exec = services.exec;
    this.gov = services.gov;
    this.registry = services.registry;
    this.installer = tools.installer;
    this.updater = tools.updater;
    this.synchronizer = tools.synchronizer;
    this.publisher = tools.publisher;
    this.doctor = tools.doctor;
    this.rootPath = config.rootPath || process.cwd();
    this.sharedPath = config.sharedPath || getDefaultSharedPath();
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
