import { RuntimeContext } from '../../shared/types/repository';
import * as crypto from 'crypto';

export type CacheKey = string;

export function buildCacheKey(
  manifestVersion: string,
  sharedChecksum: string,
  localAssetsChecksum: string
): CacheKey {
  const raw = `${manifestVersion}:${sharedChecksum}:${localAssetsChecksum}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export class ContextCache {
  private cache = new Map<CacheKey, RuntimeContext>();
  private order: CacheKey[] = [];
  private maxEntries = 10;

  get(key: CacheKey): RuntimeContext | null {
    const entry = this.cache.get(key);
    if (entry) {
      // Refresh order
      this.order = this.order.filter(k => k !== key);
      this.order.push(key);
      return entry;
    }
    return null;
  }

  set(key: CacheKey, context: RuntimeContext): void {
    if (this.cache.has(key)) {
      this.order = this.order.filter(k => k !== key);
    } else if (this.order.length >= this.maxEntries) {
      // LRU Eviction
      const oldest = this.order.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, context);
    this.order.push(key);
  }

  invalidate(key: CacheKey): void {
    this.cache.delete(key);
    this.order = this.order.filter(k => k !== key);
  }

  clear(): void {
    this.cache.clear();
    this.order = [];
  }
}
