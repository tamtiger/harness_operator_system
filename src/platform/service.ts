import { PlatformService, RepositoryService } from '../shared/contracts/services';
import { PlatformOrchestrator, getDefaultSharedPath } from './orchestration/PlatformOrchestrator';
import { TaskRequest, ExecutionResult, CancelResult } from '../shared/types/execution';
import { InstallConfig, InstallResult, UpdateConfig, UpdateResult, SyncConfig, SyncResult, PublishRequest, PublishResult, DiagnosticReport, PlatformStatus, AssetCountEntry, ValidationResult, ProposalRequest, ProposalFilter } from '../shared/types/platform';
import { Proposal } from '../shared/types/governance';
import { ProposalId, CapabilityId } from '../shared/types/primitives';
import { CapabilityDefinition, AssetCollection } from '../shared/types/assets';
import { CapabilityResult } from '../shared/types/capability';
import { RuntimeContext } from '../shared/types/repository';
import { RepositoryServiceImpl } from '../repository/service';
import { ContextServiceImpl } from '../context/service';
import { ExecutionServiceImpl } from '../execution/service';
import { CapabilityServiceImpl } from '../capability/service';
import { GovernanceServiceImpl } from '../governance/service';
import { FileSystemPersistence } from '../repository/persistence/FileSystemPersistence';
import { SharedHarnessInstaller } from './install/SharedHarnessInstaller';
import { SharedHarnessUpdater } from './update/SharedHarnessUpdater';
import { SharedHarnessSynchronizer } from './sync/SharedHarnessSynchronizer';
import { AssetPublisher } from './publish/AssetPublisher';
import { DiagnosticsEngine } from './doctor/DiagnosticsEngine';
import * as path from 'path';
import * as fs from 'fs';

function getPackageVersion(): string {
  const candidates = [
    path.join(__dirname, '..', '..', 'package.json'),
    path.join(process.cwd(), 'package.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf8')).version || '0.0.0';
      }
    } catch {
      // try next
    }
  }
  return '0.0.0';
}

export class PlatformServiceImpl implements PlatformService {
  constructor(
    private orchestrator: PlatformOrchestrator,
    private repoService: RepositoryService
  ) {}

  static create(rootPath?: string, sharedPath?: string): PlatformServiceImpl {
    const finalRoot = rootPath || path.resolve('.');
    const finalShared = sharedPath || getDefaultSharedPath();
    const repo = new RepositoryServiceImpl();
    let repoRoot;
    try {
      repoRoot = repo.discover(finalRoot);
    } catch {
      repoRoot = { path: finalRoot, hasGit: false, discoveredAt: '' };
    }
    const ctx = new ContextServiceImpl();
    const registry = new CapabilityServiceImpl(new FileSystemPersistence());
    const exec = new ExecutionServiceImpl(registry);
    const gov = new GovernanceServiceImpl(repo, repoRoot);

    const installer = new SharedHarnessInstaller(registry, finalShared, finalRoot);
    const updater = new SharedHarnessUpdater(registry, finalShared, finalRoot);
    const synchronizer = new SharedHarnessSynchronizer(ctx, finalShared);
    const publisher = new AssetPublisher(gov, registry);
    const doctor = new DiagnosticsEngine(finalRoot, finalShared, registry);

    const orchestrator = new PlatformOrchestrator(
      { repo, ctx, exec, gov, registry },
      { installer, updater, synchronizer, publisher, doctor },
      { rootPath: finalRoot, sharedPath: finalShared }
    );

    return new PlatformServiceImpl(orchestrator, repo);
  }

  async run(request: TaskRequest): Promise<ExecutionResult> {
    return this.orchestrator.run(request);
  }

  async install(config: InstallConfig): Promise<InstallResult> {
    return this.orchestrator.installer.install(config);
  }

  async update(config: UpdateConfig): Promise<UpdateResult> {
    return this.orchestrator.updater.update(config);
  }

  async sync(config: SyncConfig): Promise<SyncResult> {
    return this.orchestrator.synchronizer.sync(config);
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    return this.orchestrator.publisher.publish(request);
  }

  async doctor(): Promise<DiagnosticReport> {
    return this.orchestrator.doctor.runChecks();
  }

  async validate(root?: string): Promise<ValidationResult> {
    const targetPath = root || this.orchestrator.rootPath;
    return this.repoService.validate({ path: targetPath, hasGit: false, discoveredAt: '' });
  }

  async status(): Promise<PlatformStatus> {
    const root = this.orchestrator.repo.discover(this.orchestrator.rootPath);
    const manifest = this.orchestrator.repo.loadManifest(root);

    let sharedAssets: AssetCollection = { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] };
    let sharedInstalled = false;
    let sharedVersion = 'unknown';
    try {
      sharedAssets = this.orchestrator.repo.loadSharedAssets('');
      sharedInstalled = true;
      sharedVersion = manifest.version.toString();
    } catch {
      // Shared harness not installed
    }

    const localAssets = this.orchestrator.repo.loadLocalAssets(root, manifest);
    const effective = this.orchestrator.repo.resolveAssets(sharedAssets, localAssets);
    const validation = this.orchestrator.repo.validate(root);

    function count<K extends keyof AssetCollection>(type: K): number {
      return (sharedAssets[type]?.length || 0) + (localAssets[type]?.length || 0) + (effective[type]?.length || 0);
    }

    const makeEntry = (type: keyof AssetCollection): AssetCountEntry => ({
      shared: sharedAssets[type]?.length || 0,
      local: localAssets[type]?.length || 0,
      effective: effective[type]?.length || 0,
    });

    return {
      status: 'active',
      version: getPackageVersion(),
      uptimeMs: process.uptime() * 1000,
      repository: { path: root.path, valid: validation.valid },
      sharedHarness: { installed: sharedInstalled, version: sharedVersion },
      assets: {
        rules: makeEntry('rules'),
        prompts: makeEntry('prompts'),
        templates: makeEntry('templates'),
        workflows: makeEntry('workflows'),
        knowledge: makeEntry('knowledge'),
        hooks: makeEntry('hooks'),
        capabilities: makeEntry('capabilities'),
      }
    };
  }

  async listCapabilities(): Promise<CapabilityDefinition[]> {
    return this.orchestrator.registry.list();
  }

  async previewContext(request: TaskRequest): Promise<RuntimeContext> {
    return this.orchestrator.buildContextPreview(request);
  }

  async invokeCapability(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult> {
    return this.orchestrator.registry.invoke(id, context, input);
  }

  async cancelTask(taskId: string): Promise<CancelResult> {
    return this.orchestrator.exec.cancel(taskId);
  }

  async getProposal(id: ProposalId): Promise<Proposal> {
    return this.orchestrator.gov.getProposal(id);
  }

  async reviewProposal(id: ProposalId, reviewer: string): Promise<Proposal> {
    return this.orchestrator.gov.review(id, reviewer);
  }

  async rejectProposal(id: ProposalId, reviewer: string, comments: string): Promise<Proposal> {
    return this.orchestrator.gov.reject(id, reviewer, comments);
  }

  async submitProposal(request: ProposalRequest): Promise<Proposal> {
    return this.orchestrator.gov.submitProposal(request);
  }

  async submitExistingProposal(id: ProposalId): Promise<Proposal> {
    return this.orchestrator.gov.submitExistingProposal(id);
  }

  async listProposals(filter: ProposalFilter): Promise<Proposal[]> {
    return this.orchestrator.gov.listProposals(filter);
  }

  async approveProposal(id: ProposalId, reviewer: string, comments: string = ''): Promise<Proposal> {
    const prop = this.orchestrator.gov.getProposal(id);
    if (prop.status === 'SUBMITTED') {
      await this.orchestrator.gov.review(id, reviewer);
    }
    return this.orchestrator.gov.approve(id, reviewer, comments);
  }
}
