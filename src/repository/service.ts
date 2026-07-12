import { RepositoryService } from '../shared/contracts/services';
import { RepositoryRoot, RelativePath } from '../shared/types/primitives';
import { Manifest, RepositoryMetadata, RepositoryContext } from '../shared/types/repository';
import { AssetCollection, EffectiveAssetCollection } from '../shared/types/assets';
import { ValidationResult } from '../shared/types/platform';

import { RepositoryDiscovery } from './discovery/RepositoryDiscovery';
import { ManifestLoader } from './manifest/ManifestLoader';
import { RepositoryValidator } from './validation/RepositoryValidator';
import { repoError } from '../shared/errors/factories';
import * as fs from 'fs';
import * as path from 'path';

export class RepositoryServiceImpl implements RepositoryService {
  private discovery = new RepositoryDiscovery();
  private loader = new ManifestLoader();
  private validator = new RepositoryValidator();

  discover(workingDir: string): RepositoryRoot {
    return this.discovery.discover(workingDir);
  }

  loadManifest(root: RepositoryRoot): Manifest {
    return this.loader.load(root.path);
  }

  loadSharedAssets(sharedPath: string): AssetCollection {
    throw new Error('Not implemented yet');
  }

  loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection {
    throw new Error('Not implemented yet');
  }

  resolveAssets(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection {
    throw new Error('Not implemented yet');
  }

  buildContext(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext {
    throw new Error('Not implemented yet');
  }

  persist(root: RepositoryRoot, relativePath: RelativePath, data: string): void {
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      throw repoError('REPO_014', { details: `Invalid path: ${relativePath}` });
    }
    const absPath = path.resolve(root.path, '.harness', relativePath);
    const parent = path.dirname(absPath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    
    // Atomic Write
    const tempFile = absPath + '.tmp.' + Math.random().toString(36).substring(2, 10);
    fs.writeFileSync(tempFile, data, 'utf8');
    fs.renameSync(tempFile, absPath);
  }

  validate(root: RepositoryRoot, options?: { mode: 'strict' | 'lenient' }): ValidationResult {
    return this.validator.validate(root.path, options);
  }
}
