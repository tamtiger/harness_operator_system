import { RepositoryServiceImpl } from '../../repository/service';
import { ContextServiceImpl } from '../../context/service';
import { ExecutionServiceImpl } from '../../execution/service';
import { GovernanceServiceImpl } from '../../governance/service';
import { CapabilityServiceImpl } from '../../capability/service';
import { SharedHarnessInstaller } from '../../platform/install/SharedHarnessInstaller';
import { SharedHarnessUpdater } from '../../platform/update/SharedHarnessUpdater';
import { SharedHarnessSynchronizer } from '../../platform/sync/SharedHarnessSynchronizer';
import { AssetPublisher } from '../../platform/publish/AssetPublisher';
import { DiagnosticsEngine } from '../../platform/doctor/DiagnosticsEngine';
import { PlatformOrchestrator, getDefaultSharedPath } from '../../platform/orchestration/PlatformOrchestrator';
import { FileSystemPersistence } from '../../repository/persistence/FileSystemPersistence';
import { PlatformServiceImpl } from '../../platform/service';
import * as path from 'path';

export function createPlatformService(rootPath?: string, sharedPath?: string): PlatformServiceImpl {
  const finalRoot = rootPath || path.resolve('.');
  const finalShared = sharedPath || getDefaultSharedPath();
  const repo = new RepositoryServiceImpl();
  let repoRoot;
  try {
    repoRoot = repo.discover(finalRoot);
  } catch (e) {
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
    repo, ctx, exec, gov, registry,
    installer, updater, synchronizer, publisher, doctor,
    finalRoot, finalShared
  );

  return new PlatformServiceImpl(orchestrator, repo);
}
