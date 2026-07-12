import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';
import { AssetCollection, Asset } from '../../shared/types/assets';
import { RepositoryRoot } from '../../shared/types/primitives';
import { Manifest } from '../../shared/types/repository';
import { repoError } from '../../shared/errors/factories';
import { isWithinBoundary } from '../../shared/utils/path';
import { FrontMatterParser } from './FrontMatterParser';
import { AssetValidator } from './AssetValidator';
import { AssetScope } from '../../shared/types/enums';

export class AssetLoader {
  private parser = new FrontMatterParser();
  private validator = new AssetValidator();

  loadSharedAssets(sharedPath?: string): AssetCollection {
    const resolvedPath = sharedPath || this.getDefaultSharedPath();
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
      throw repoError('REPO_008', { details: `Shared path not found: ${resolvedPath}` });
    }

    const installedMeta = path.join(resolvedPath, '..', 'metadata', 'installed.yaml');
    if (!fs.existsSync(installedMeta)) {
      throw repoError('REPO_008', { details: `installed.yaml not found` });
    }

    const checksumFile = path.join(resolvedPath, '..', 'metadata', 'checksum.yaml');
    if (!fs.existsSync(checksumFile)) {
      throw repoError('REPO_009', { details: `checksum.yaml not found` });
    }

    // Load checksums
    let checksumData: any;
    try {
      checksumData = yaml.load(fs.readFileSync(checksumFile, 'utf8'));
    } catch (e: any) {
      throw repoError('REPO_009', { details: `Corrupted checksum.yaml: ${e.message}` });
    }

    const collection: AssetCollection = {
      rules: [],
      prompts: [],
      templates: [],
      workflows: [],
      knowledge: [],
      hooks: [],
      capabilities: []
    };

    const subdirs = ['capabilities', 'rules', 'prompts', 'templates', 'workflows', 'knowledge', 'hooks'];

    for (const subdir of subdirs) {
      const dirPath = path.join(resolvedPath, subdir);
      if (!fs.existsSync(dirPath)) continue;

      this.scanDir(dirPath, resolvedPath, (filePath, content) => {
        // Calculate SHA-256 and verify checksum
        const relativeFilePath = path.relative(path.join(resolvedPath, '..'), filePath).replace(/\\/g, '/');
        const expectedHash = checksumData?.checksums?.[relativeFilePath];
        if (!expectedHash) {
          // If not in checksum.yaml, log warning (forward compatibility)
          console.warn(`[WARNING] File not listed in checksums: ${relativeFilePath}`);
        } else {
          const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
          // Standard check format `sha256:abc...` or raw hex
          const expectedRaw = expectedHash.replace(/^sha256:/, '');
          if (hash !== expectedRaw) {
            throw repoError('REPO_009', { details: `Checksum mismatch for file: ${relativeFilePath}` });
          }
        }

        const { metadata, body } = this.parser.parse(filePath, content);
        const validatedMeta = this.validator.validate(metadata, filePath);
        
        // Enforce shared scope
        validatedMeta.scope = AssetScope.SHARED;

        this.addAssetToCollection(collection, {
          metadata: validatedMeta,
          content: body
        });
      });
    }

    return collection;
  }

  loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection {
    const collection: AssetCollection = {
      rules: [],
      prompts: [],
      templates: [],
      workflows: [],
      knowledge: [],
      hooks: [],
      capabilities: []
    };
    const assetIds = new Set<string>();

    if (!manifest.artifacts) {
      return collection;
    }

    const repoRootAbs = root.path;

    for (const artifact of manifest.artifacts) {
      // Validate path traversal boundary
      if (artifact.path.includes('..') || path.isAbsolute(artifact.path)) {
        throw repoError('REPO_014', { details: `Path traversal detected: ${artifact.path}` });
      }

      const artifactAbs = path.resolve(repoRootAbs, artifact.path);
      if (!isWithinBoundary(repoRootAbs, path.relative(repoRootAbs, artifactAbs))) {
        throw repoError('REPO_014', { details: `Path traversal detected: ${artifact.path}` });
      }

      if (!fs.existsSync(artifactAbs)) {
        continue;
      }

      const stat = fs.statSync(artifactAbs);
      if (stat.isDirectory()) {
        this.scanDir(artifactAbs, repoRootAbs, (filePath, content) => {
          this.loadAssetFile(filePath, content, collection, assetIds);
        });
      } else if (stat.isFile()) {
        const content = fs.readFileSync(artifactAbs, 'utf8');
        this.loadAssetFile(artifactAbs, content, collection, assetIds);
      }
    }

    return collection;
  }

  private loadAssetFile(filePath: string, content: string, collection: AssetCollection, assetIds: Set<string>) {
    // Max file size 1MB
    const stat = fs.statSync(filePath);
    if (stat.size > 1024 * 1024) {
      throw repoError('REPO_013', { path: filePath, size: stat.size });
    }

    // Binary file skip check (detect null bytes in first 8KB)
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        // Skip binary file
        return;
      }
    }

    const { metadata, body } = this.parser.parse(filePath, content);
    const validatedMeta = this.validator.validate(metadata, filePath);

    // Enforce local scope
    validatedMeta.scope = AssetScope.LOCAL;

    // Check duplicate ID
    if (assetIds.has(validatedMeta.id)) {
      throw repoError('REPO_006', { details: `Duplicate asset ID in local collection: ${validatedMeta.id}` });
    }
    assetIds.add(validatedMeta.id);

    this.addAssetToCollection(collection, {
      metadata: validatedMeta,
      content: body
    });
  }

  private addAssetToCollection(collection: AssetCollection, asset: Asset) {
    const type = asset.metadata.type;
    if (type === 'rule') collection.rules.push(asset as any);
    else if (type === 'prompt') collection.prompts.push(asset as any);
    else if (type === 'template') collection.templates.push(asset as any);
    else if (type === 'workflow') collection.workflows.push(asset as any);
    else if (type === 'knowledge') collection.knowledge.push(asset as any);
    else if (type === 'hook') collection.hooks.push(asset as any);
    else if (type === 'capability') collection.capabilities.push(asset as any);
  }

  private scanDir(dirPath: string, rootBoundary: string, callback: (filePath: string, content: string) => void) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      // Skip hidden files
      if (file.startsWith('.')) continue;

      const fullPath = path.join(dirPath, file);
      const relative = path.relative(rootBoundary, fullPath);

      if (!isWithinBoundary(rootBoundary, relative)) {
        throw repoError('REPO_014', { details: `Path traversal detected: ${relative}` });
      }

      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        this.scanDir(fullPath, rootBoundary, callback);
      } else if (stat.isFile() && (file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        callback(fullPath, content);
      }
    }
  }

  getDefaultSharedPath(): string {
    if (process.platform === 'win32') {
      return path.join(process.env.APPDATA ?? os.homedir(), 'harness', 'shared');
    }
    return path.join(os.homedir(), '.harness', 'shared');
  }
}
