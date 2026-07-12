import * as fs from 'fs';
import * as path from 'path';
import { EffectiveAssetCollection } from '../../shared/types/assets';
import { RepositoryMetadata, RepositoryContext } from '../../shared/types/repository';
import { ADR } from '../../shared/types/governance';

export class ContextBuilder {
  build(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext {
    const root = metadata.root.path;
    const repoMapPath = path.join(root, '.harness', 'repository-map.md');
    let repositoryMap: string | undefined;
    if (fs.existsSync(repoMapPath)) {
      repositoryMap = fs.readFileSync(repoMapPath, 'utf8');
    }

    const adrs: ADR[] = [];
    const adrDir = path.join(metadata.root.path, '.harness', 'adr');
    if (fs.existsSync(adrDir) && fs.statSync(adrDir).isDirectory()) {
      const files = fs.readdirSync(adrDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = fs.readFileSync(path.join(adrDir, file), 'utf8');
          // Parse simple ADR frontmatter or stub it
          adrs.push({
            id: file.replace('.md', ''),
            title: file,
            status: 'accepted',
            context: content,
            decision: '',
            rationale: '',
            consequences: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    const context: RepositoryContext = {
      metadata,
      assets,
      repositoryMap,
      adrs: adrs.length > 0 ? adrs : undefined,
      buildTimestamp: new Date().toISOString()
    };

    // Deep freeze
    return this.deepFreeze(context);
  }

  private deepFreeze(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
      if (
        Object.prototype.hasOwnProperty.call(obj, prop) &&
        obj[prop] !== null &&
        (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') &&
        !Object.isFrozen(obj[prop])
      ) {
        this.deepFreeze(obj[prop]);
      }
    });
    return obj;
  }
}
