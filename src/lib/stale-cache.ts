import { computeTreeHash } from "./tree-hash.js";

interface CacheEntry {
  hash: string;
  timestamp: number;
}

const TTL_MS = 30_000; // 30 seconds
const cache = new Map<string, CacheEntry>();

/**
 * Compute tree hash with 30s TTL cache.
 * Returns cached value if within TTL, otherwise recomputes.
 */
export function computeTreeHashCached(repoPath: string): string {
  const now = Date.now();
  const entry = cache.get(repoPath);

  if (entry && now - entry.timestamp < TTL_MS) {
    return entry.hash;
  }

  const hash = computeTreeHash(repoPath);
  cache.set(repoPath, { hash, timestamp: now });
  return hash;
}

/**
 * Invalidate the cached tree hash for a repo.
 */
export function invalidateTreeHashCache(repoPath: string): void {
  cache.delete(repoPath);
}

/**
 * Exposed for testing: clear entire cache.
 */
export function clearTreeHashCache(): void {
  cache.clear();
}
