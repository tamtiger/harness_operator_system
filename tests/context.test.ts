import { describe, it, expect, beforeAll } from 'vitest';
import { ContextFilter } from '../src/context/filter/ContextFilter';
import { ContextRanker } from '../src/context/ranking/ContextRanker';
import { BudgetAllocator } from '../src/context/budget/BudgetAllocator';
import { ContextCache, buildCacheKey } from '../src/context/cache/ContextCache';
import { ContextBuilder } from '../src/context/builder/ContextBuilder';
import { RepositoryContext, RuntimeContext } from '../src/shared/types/repository';
import { TaskRequest } from '../src/shared/types/execution';
import { AssetType, AssetScope } from '../src/shared/types/enums';

describe('M3 Context Builder Pipeline', () => {
  let mockContext: RepositoryContext;
  let mockRequest: TaskRequest;

  beforeAll(() => {
    mockContext = {
      metadata: {
        root: { path: '.', hasGit: false, discoveredAt: '' },
        name: 'test',
        version: '0.0.1',
        description: 'desc',
        sharedHarnessVersion: null,
        repositoryMapContent: '# Map',
        agentsMdContent: '',
        discoveredAt: ''
      },
      assets: {
        rules: [
          {
            metadata: {
              id: 'rule-1',
              type: AssetType.RULE,
              version: '1.0.0',
              name: 'Global Rule',
              scope: AssetScope.LOCAL,
              tags: ['scope:src', 'auth'],
              priority: 'high',
              updatedAt: new Date(Date.now() - 1000).toISOString()
            } as any,
            content: 'Global rule content'
          },
          {
            metadata: {
              id: 'rule-2',
              type: AssetType.RULE,
              version: '1.0.0',
              name: 'Backend Rule',
              scope: AssetScope.LOCAL,
              tags: ['scope:backend'],
              priority: 'low',
              updatedAt: new Date(Date.now() - 5000).toISOString()
            } as any,
            content: 'Backend rule content very long to exceed the allocated budget constraint'.repeat(10)
          },
          {
            metadata: {
              id: 'rule-deprecated',
              type: AssetType.RULE,
              version: '1.0.0',
              name: 'Deprecated Rule',
              scope: AssetScope.LOCAL,
              deprecated: true
            } as any,
            content: 'Deprecated'
          }
        ],
        prompts: [],
        templates: [],
        workflows: [],
        knowledge: [
          {
            metadata: {
              id: 'k-1',
              type: AssetType.KNOWLEDGE,
              version: '1.0.0',
              name: 'Auth Knowledge',
              scope: AssetScope.LOCAL,
              tags: ['auth'],
              confidence: 'high'
            } as any,
            content: 'Auth knowledge details'
          },
          {
            metadata: {
              id: 'k-2',
              type: AssetType.KNOWLEDGE,
              version: '1.0.0',
              name: 'Db Knowledge',
              scope: AssetScope.LOCAL,
              tags: ['database'],
              confidence: 'low'
            } as any,
            content: 'Db knowledge details'
          }
        ],
        hooks: [],
        capabilities: []
      },
      buildTimestamp: ''
    };

    mockRequest = {
      id: 'req-1',
      taskType: 'implementation',
      description: 'Implement auth',
      tags: ['auth'],
      workingDirectory: 'src'
    };
  });

  describe('ContextFilter', () => {
    const filterer = new ContextFilter();

    it('should filter rules by scopePaths and exclude deprecated by default', () => {
      const filtered = filterer.filter(mockContext, mockRequest);
      expect(filtered.assets.rules.length).toBe(1);
      expect(filtered.assets.rules[0].metadata.id).toBe('rule-1');
    });

    it('should filter knowledge by tag overlap and confidence threshold', () => {
      const filtered = filterer.filter(mockContext, mockRequest);
      expect(filtered.assets.knowledge.length).toBe(1);
      expect(filtered.assets.knowledge[0].metadata.id).toBe('k-1'); // k-2 is low confidence (default target: medium)
    });
  });

  describe('ContextRanker', () => {
    const ranker = new ContextRanker();

    it('should rank rules by priority score and recency', () => {
      const ranked = ranker.rank(mockContext, mockRequest);
      // rule-1 is high priority, rule-2 is low priority
      expect(ranked.assets.rules[0].metadata.id).toBe('rule-1');
    });
  });

  describe('BudgetAllocator', () => {
    const allocator = new BudgetAllocator();

    it('should allocate tokens and trim to budget under priority_trim', () => {
      const config = {
        total_tokens: 100, // very small budget
        strategy: 'priority_trim' as const
      };
      const runtime = allocator.allocate(mockContext, config);
      expect(runtime.budget.remaining).toBeLessThan(100);
      expect(runtime.rankedRules.length).toBeLessThan(mockContext.assets.rules.length);
    });

    it('should throw CTX_003 under hard_limit strategy when exceeding budget', () => {
      const config = {
        total_tokens: 5, // extremely small budget
        strategy: 'hard_limit' as const
      };
      expect(() => allocator.allocate(mockContext, config)).toThrow();
    });
  });

  describe('ContextCache', () => {
    it('should store and retrieve runtime context', () => {
      const cache = new ContextCache();
      const key = buildCacheKey('2', 'sha-shared', 'sha-local');
      const runtime = { id: 'ctx-1' } as any;

      cache.set(key, runtime);
      const retrieved = cache.get(key);
      expect(retrieved).toBe(runtime);
    });

    it('should evict oldest entry on LRU overflow (11th entry)', () => {
      const cache = new ContextCache();
      for (let i = 1; i <= 11; i++) {
        cache.set(`key-${i}`, { id: `ctx-${i}` } as any);
      }
      expect(cache.get('key-1')).toBeNull(); // oldest key-1 is evicted
      expect(cache.get('key-2')).not.toBeNull();
    });
  });

  describe('ContextBuilder', () => {
    const builder = new ContextBuilder();

    it('should build RuntimeContext that is frozen recursively', () => {
      const runtime = builder.build(mockContext, mockRequest);
      expect(Object.isFrozen(runtime)).toBe(true);
      expect(Object.isFrozen(runtime.rankedRules)).toBe(true);
    });
  });
});
