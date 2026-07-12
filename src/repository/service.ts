import { RepositoryService } from '../shared/contracts/services';
import { RelativePath } from '../shared/types/primitives';
import { Manifest, RepositoryMetadata, RepositoryContext, RepositoryRoot } from '../shared/types/repository';
import { AssetCollection, EffectiveAssetCollection } from '../shared/types/assets';
import { ValidationResult } from '../shared/types/platform';

import { RepositoryDiscovery } from './discovery/RepositoryDiscovery';
import { ManifestLoader } from './manifest/ManifestLoader';
import { RepositoryValidator } from './validation/RepositoryValidator';
import { AssetLoader } from './assets/AssetLoader';
import { ResolutionEngine } from './resolution/ResolutionEngine';
import { ContextBuilder } from './context/ContextBuilder';
import { FileSystemPersistence } from './persistence/FileSystemPersistence';

export class RepositoryServiceImpl implements RepositoryService {
  private discovery = new RepositoryDiscovery();
  private loader = new ManifestLoader();
  private validator = new RepositoryValidator();
  private assetLoader = new AssetLoader();
  private resolutionEngine = new ResolutionEngine();
  private contextBuilder = new ContextBuilder();
  private persistence = new FileSystemPersistence();

  discover(workingDir: string): RepositoryRoot {
    return this.discovery.discover(workingDir);
  }

  loadManifest(root: RepositoryRoot): Manifest {
    return this.loader.load(root.path);
  }

  loadSharedAssets(sharedPath: string): AssetCollection {
    return this.assetLoader.loadSharedAssets(sharedPath);
  }

  loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection {
    return this.assetLoader.loadLocalAssets(root, manifest);
  }

  resolveAssets(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection {
    return this.resolutionEngine.resolve(shared, local);
  }

  buildContext(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext {
    return this.contextBuilder.build(assets, metadata);
  }

  persist(root: RepositoryRoot, path: RelativePath, data: string): void {
    this.persistence.write(root, path, data);
  }

  readFile(root: RepositoryRoot, path: RelativePath): string {
    return this.persistence.read(root, path);
  }

  fileExists(root: RepositoryRoot, path: RelativePath): boolean {
    return this.persistence.existsFile(root, path);
  }

  dirExists(root: RepositoryRoot, path: RelativePath): boolean {
    return this.persistence.existsDir(root, path);
  }

  ensureDir(root: RepositoryRoot, path: RelativePath): void {
    this.persistence.mkDir(root, path);
  }

  readDir(root: RepositoryRoot, path: RelativePath): string[] {
    return this.persistence.listDir(root, path).map(e => e.name);
  }

  validate(root: RepositoryRoot, options?: { mode: 'strict' | 'lenient' }): ValidationResult {
    return this.validator.validate(root.path, options);
  }
}
