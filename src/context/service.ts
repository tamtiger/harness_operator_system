import { ContextService } from '../shared/contracts/services';
import { RepositoryContext, RuntimeContext } from '../shared/types/repository';
import { TaskRequest } from '../shared/types/execution';
import { ContextCache, buildCacheKey, CacheKey } from './cache/ContextCache';
import { ContextBuilder } from './builder/ContextBuilder';
import * as crypto from 'crypto';

export class ContextServiceImpl implements ContextService {
  private cache = new ContextCache();
  private builder = new ContextBuilder();

  buildRuntimeContext(repoContext: RepositoryContext, request: TaskRequest): RuntimeContext {
    // Generate a hash representing local assets state
    const localHashes = repoContext.assets.rules.map(r => r.metadata.id + ':' + r.metadata.version).join(',');
    const localAssetsChecksum = crypto.createHash('sha256').update(localHashes).digest('hex');

    const key = buildCacheKey(
      repoContext.metadata.manifest.version.toString(),
      repoContext.metadata.gitCommit || 'none',
      localAssetsChecksum
    );

    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const runtime = this.builder.build(repoContext, request);
    this.cache.set(key, runtime);
    return runtime;
  }

  invalidateCache(key: CacheKey): void {
    this.cache.invalidate(key);
  }
}
