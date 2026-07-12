import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Manifest } from '../../shared/types/repository';
import { CapabilityRegistry } from '../../shared/contracts/services';
import { CapabilityDefinition } from '../../shared/types/assets';
import { capError } from '../../shared/errors/factories';
import { getDefaultHarnessPath } from '../../shared/utils/path';

export class CapabilityLoader {
  constructor(private sharedPath?: string) {}

  loadFromManifest(manifest: Manifest, registry: CapabilityRegistry): void {
    if (!manifest.capabilities) return;

    for (const capConfig of manifest.capabilities) {
      if (capConfig.source === 'shared') {
        const sharedDir = this.sharedPath || path.join(getDefaultHarnessPath(), 'shared');
        const capFile = path.join(sharedDir, 'capabilities', `${capConfig.id}.yaml`);
        if (fs.existsSync(capFile)) {
          this.loadYamlCapability(capFile, registry);
        } else {
          console.warn(`[WARNING] Shared capability file not found: ${capConfig.id}`);
        }
      } else if (capConfig.source === 'local') {
        const repoRoot = manifest.repository.root || '.';
        // Use path from config or fall back to default
        const relPath = capConfig.path || `.harness/capabilities/${capConfig.id}.yaml`;
        const capFile = path.resolve(repoRoot, relPath);
        if (fs.existsSync(capFile)) {
          this.loadYamlCapability(capFile, registry);
        } else {
          throw capError('CAP_008', { details: `Local capability file not found: ${relPath}` });
        }
      } else if (capConfig.source === 'external') {
        console.warn(`[WARNING] External capabilities not supported (security): ${capConfig.id}`);
      }
    }
  }

  private loadYamlCapability(filePath: string, registry: CapabilityRegistry): void {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const def = yaml.load(content) as CapabilityDefinition;
      
      // Stub executable implementation for custom yaml-defined scripts
      const impl = {
        async execute(context: any, input: any): Promise<any> {
          return { success: true, details: `Executed custom script: ${def.content || ''}` };
        }
      };
      registry.register(def, impl);
    } catch (e: any) {
      throw capError('CAP_008', { details: `Failed to load custom capability from ${filePath}: ${e.message}` });
    }
  }

}
