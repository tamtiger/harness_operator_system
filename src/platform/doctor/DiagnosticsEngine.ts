import { DiagnosticReport, DiagnosticCheck } from '../../shared/types/platform';
import { CapabilityRegistry } from '../../shared/contracts/services';
import { RepositoryServiceImpl } from '../../repository/service';
import { AssetCollection } from '../../shared/types/assets';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';

export class DiagnosticsEngine {
  private repoService = new RepositoryServiceImpl();

  constructor(
    private rootPath: string,
    private sharedPath: string,
    private registry: CapabilityRegistry
  ) {}

  async runChecks(): Promise<DiagnosticReport> {
    const checks: DiagnosticCheck[] = [];
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 1. shared_installed
    const sharedDir = path.join(this.sharedPath, 'shared');
    const sharedExists = fs.existsSync(sharedDir);
    checks.push({
      name: 'shared_installed',
      status: sharedExists ? 'pass' : 'fail',
      message: sharedExists ? 'Shared Harness directory found' : 'Shared Harness directory not found',
      remediation: sharedExists ? undefined : 'Run harness install to download the shared harness bundle'
    });

    // 2. shared_checksum
    let checksumPass = true;
    if (sharedExists) {
      const checksumFile = path.join(this.sharedPath, 'metadata', 'checksum.yaml');
      if (!fs.existsSync(checksumFile)) {
        checksumPass = false;
      } else {
        try {
          const checksumData = yaml.load(fs.readFileSync(checksumFile, 'utf8')) as { checksums?: Record<string, string> };
          const checksums: Record<string, string> = checksumData?.checksums || {};
          for (const [relFile, expectedHash] of Object.entries(checksums)) {
            // relFile is relative to sharedPath parent (e.g. "shared/rules/foo.md")
            const absFile = path.join(this.sharedPath, relFile);
            if (!fs.existsSync(absFile)) {
              checksumPass = false;
              break;
            }
            const fileContent = fs.readFileSync(absFile);
            const actualSha = crypto.createHash('sha256').update(fileContent).digest('hex');
            const expectedRaw = String(expectedHash).replace(/^sha256:/, '');
            if (actualSha !== expectedRaw) {
              checksumPass = false;
              break;
            }
          }
        } catch (e) {
          checksumPass = false;
        }
      }
    } else {
      checksumPass = false;
    }
    checks.push({
      name: 'shared_checksum',
      status: checksumPass ? 'pass' : 'fail',
      message: checksumPass ? 'Integrity check passed' : 'Integrity check failed',
      remediation: checksumPass ? undefined : 'Re-install the shared harness'
    });

    // 3. local_manifest
    let manifestValid = true;
    let manifestError: string | undefined;
    try {
      const rootMeta = { path: this.rootPath, hasGit: false, discoveredAt: '' };
      this.repoService.loadManifest(rootMeta);
      const validation = this.repoService.validate(rootMeta);
      manifestValid = validation.valid;
      if (!manifestValid && validation.errors.length > 0) {
        manifestError = validation.errors[0].message;
      }
    } catch (e: any) {
      manifestValid = false;
      manifestError = e.message;
    }
    checks.push({
      name: 'local_manifest',
      status: manifestValid ? 'pass' : 'fail',
      message: manifestValid ? 'harness.yaml is valid' : `harness.yaml validation failed: ${manifestError}`,
      remediation: manifestValid ? undefined : 'Fix the harness.yaml config to match schema specifications'
    });

    // 4. agents_md
    const agentsMd = path.join(this.rootPath, 'AGENTS.md');
    const agentsExists = fs.existsSync(agentsMd);
    checks.push({
      name: 'agents_md',
      status: agentsExists ? 'pass' : 'fail',
      message: agentsExists ? 'AGENTS.md found at root' : 'AGENTS.md missing from repository root',
      remediation: agentsExists ? undefined : 'Create AGENTS.md at the root defining AI contracts'
    });

    // 5. asset_ids_unique
    let assetUnique = true;
    const duplicateIds: string[] = [];
    try {
      const rootMeta = { path: this.rootPath, hasGit: false, discoveredAt: '' };
      const manifest = this.repoService.loadManifest(rootMeta);
      let sharedAssets: AssetCollection = { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] };
      try {
        sharedAssets = this.repoService.loadSharedAssets(path.join(this.sharedPath, 'shared'));
      } catch (e) {
        // ignore
      }
      const localAssets = this.repoService.loadLocalAssets(rootMeta, manifest);
      const resolved = this.repoService.resolveAssets(sharedAssets, localAssets);

      const allIds = new Set<string>();
      const lists = [resolved.rules, resolved.prompts, resolved.templates, resolved.workflows, resolved.knowledge];
      for (const list of lists) {
        for (const asset of list) {
          if (allIds.has(asset.metadata.id)) {
            assetUnique = false;
            duplicateIds.push(asset.metadata.id);
          }
          allIds.add(asset.metadata.id);
        }
      }
    } catch {
      assetUnique = false;
    }
    checks.push({
      name: 'asset_ids_unique',
      status: assetUnique ? 'pass' : 'fail',
      message: assetUnique ? 'No duplicate IDs' : `Duplicate asset IDs found: ${duplicateIds.join(', ')}`,
      remediation: assetUnique ? undefined : 'Ensure every asset defined has a unique identifier'
    });

    // 6. capability_registry
    let capRegistryPass = true;
    try {
      const registeredCaps = this.registry.list().map(c => c.capabilityId);
      const rootMeta = { path: this.rootPath, hasGit: false, discoveredAt: '' };
      const manifest = this.repoService.loadManifest(rootMeta);
      const localAssets = this.repoService.loadLocalAssets(rootMeta, manifest);
      
      for (const cap of localAssets.capabilities || []) {
        if (!registeredCaps.includes(cap.metadata.id)) {
          capRegistryPass = false;
          break;
        }
      }
    } catch (e) {
      capRegistryPass = false;
    }
    checks.push({
      name: 'capability_registry',
      status: capRegistryPass ? 'pass' : 'warn',
      message: capRegistryPass ? 'All capabilities registered' : 'Some local capabilities are unregistered',
      remediation: capRegistryPass ? undefined : 'Register outstanding capabilities to avoid invocation faults'
    });

    // Determine overall status
    const hasFail = checks.some(c => c.status === 'fail');
    const hasWarn = checks.some(c => c.status === 'warn');
    if (hasFail) {
      overall = 'critical';
    } else if (hasWarn) {
      overall = 'warning';
    }

    return {
      timestamp: new Date().toISOString(),
      overall,
      checks
    };
  }
}
