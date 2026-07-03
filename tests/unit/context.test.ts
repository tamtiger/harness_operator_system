import { describe, it, expect } from 'vitest';
import { ContextEngine } from '../../packages/core/src/index.js';
import { IKnowledgeEngine, ICodeIndex, SymbolNode } from '../../packages/contracts/src/index.js';

describe('Context Engine Tests', () => {
  const mockKnowledgeEngine: IKnowledgeEngine = {
    search: async (query: string) => {
      if (query === 'arch') {
        return [
          {
            id: 'arch-1',
            type: 'doc',
            source: 'docs/architecture.md',
            title: 'Architecture',
            content: 'System follows layered architecture pattern.',
            tags: [],
            updatedAt: new Date()
          }
        ];
      }
      if (query === 'duplicated') {
        return [
          {
            id: 'dup-1',
            type: 'doc',
            source: 'docs/convention.md',
            title: 'Convention',
            content: 'Identical convention content.',
            tags: [],
            updatedAt: new Date()
          },
          {
            id: 'dup-2',
            type: 'doc',
            source: 'docs/convention.md',
            title: 'Convention',
            content: 'Identical convention content.',
            tags: [],
            updatedAt: new Date()
          }
        ];
      }
      return [];
    }
  } as any;

  const mockCodeIndex: ICodeIndex = {
    findSymbol: async (query: string) => {
      if (query === 'MyClass') {
        return {
          id: 'MyProject.MyClass',
          name: 'MyClass',
          kind: 'class',
          filePath: 'src/MyClass.cs',
          range: { startLine: 1, startCol: 0, endLine: 10, endCol: 0 },
          modifiers: ['public'],
          hash: 'h1'
        } as SymbolNode;
      }
      return undefined;
    }
  } as any;

  it('should build context pack with priority ordering', async () => {
    const engine = new ContextEngine({} as any, {} as any, {} as any, mockKnowledgeEngine, mockCodeIndex);

    const task = {
      id: 'task-1',
      description: 'Implement new feature',
      type: 'feature' as const,
      risk: 'low' as const
    };

    const pack = await engine.buildContext(task, ['arch', 'MyClass']);

    expect(pack.sections.length).toBe(3);
    
    expect(pack.sections[0].title).toBe('Task Details');
    expect(pack.sections[1].title).toBe('Architecture');
    expect(pack.sections[2].title).toBe('Symbol MyClass');
  });

  it('should deduplicate identical sections', async () => {
    const engine = new ContextEngine({} as any, {} as any, {} as any, mockKnowledgeEngine, mockCodeIndex);

    const task = {
      id: 'task-2',
      description: 'Test duplicates',
      type: 'bug' as const,
      risk: 'medium' as const
    };

    const pack = await engine.buildContext(task, ['duplicated']);

    expect(pack.sections.length).toBe(2);
    expect(pack.sections[1].title).toBe('Convention');
  });

  it('should limit context pack to budget and truncate', async () => {
    const task = {
      id: 'task-3',
      description: 'Test budget limit',
      type: 'feature' as const,
      risk: 'low' as const
    };

    const hugeKnowledge: IKnowledgeEngine = {
      search: async () => [
        {
          id: 'huge',
          type: 'doc',
          source: 'docs/architecture.md',
          title: 'Architecture',
          content: 'A'.repeat(150000),
          tags: [],
          updatedAt: new Date()
        }
      ]
    } as any;

    const engineHuge = new ContextEngine({} as any, {} as any, {} as any, hugeKnowledge, mockCodeIndex);
    const pack = await engineHuge.buildContext(task, ['test']);

    expect(pack.estimatedTokens).toBeLessThanOrEqual(30000);
    expect(pack.sections[1].content).toContain('[TRUNCATED]');
  });
});
