import { describe, it, expect } from 'vitest';
import { SQLiteKnowledgeStore, KnowledgeEngine } from '../../packages/core/src/index.js';
import { IFileSystem, IWorkspaceManager } from '../../packages/contracts/src/index.js';
import * as path from 'path';

describe('Knowledge Engine Tests', () => {
  it('should parse markdown sections correctly', () => {
    const markdown = `
# Title

Some general introduction.

## Section 1
tags: ["intro", "guide"]

Content of section 1.

### Sub Section 1.1
tags: ["advanced"]

Content of subsection 1.1.
    `;

    const mockFileSystem: IFileSystem = {} as any;
    const mockWorkspace: IWorkspaceManager = {
      getWorkspaceRoot: () => process.cwd()
    } as any;

    const store = new SQLiteKnowledgeStore();
    const engine = new KnowledgeEngine(store, mockFileSystem, mockWorkspace);

    const filePath = path.join(process.cwd(), 'docs', 'readme.md');
    const items = engine.parseMarkdownSections(filePath, markdown);

    expect(items.length).toBe(3);
    
    expect(items[0].title).toBe('Title');
    expect(items[0].content).toContain('Some general introduction.');

    expect(items[1].title).toBe('Section 1');
    expect(items[1].content).toContain('Content of section 1.');
    expect(items[1].tags).toContain('intro');
    expect(items[1].tags).toContain('guide');

    expect(items[2].title).toBe('Sub Section 1.1');
    expect(items[2].content).toContain('Content of subsection 1.1.');
    expect(items[2].tags).toContain('advanced');
  });

  it('should index, store, search and rank items via BM25', async () => {
    const store = new SQLiteKnowledgeStore();
    store.initializeStore(':memory:');

    const files = new Map<string, string>();
    files.set(path.join(process.cwd(), 'docs', 'readme.md'), `
# Readme

This is the system overview document. It talks about system requirements and developer guides.
    `);
    files.set(path.join(process.cwd(), 'docs', 'decisions', 'adr-1.md'), `
# ADR 1: SQLite Storage

We decide to use SQLite for lightweight local SQL database storage. SQLite runs inside process.
    `);

    const mockFileSystem: IFileSystem = {
      exists: async (p) => {
        const norm = p.replace(/\\/g, '/');
        const rootNorm = process.cwd().replace(/\\/g, '/');
        return norm === rootNorm || norm === `${rootNorm}/docs` || norm === `${rootNorm}/docs/decisions` || files.has(p);
      },
      readFile: async (p) => files.get(p) || '',
      readDir: async (p) => {
        if (p.endsWith('decisions')) return ['adr-1.md'];
        if (p.endsWith('docs')) return ['readme.md', 'decisions'];
        return [];
      }
    } as any;

    const mockWorkspace: IWorkspaceManager = {
      getWorkspaceRoot: () => process.cwd(),
      getDatabaseDir: () => ':memory:'
    } as any;

    const engine = new KnowledgeEngine(store, mockFileSystem, mockWorkspace);
    
    await engine.indexDocuments();

    const stored = store.getItems();
    expect(stored.length).toBe(2);

    const results = await engine.search('SQLite');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('ADR 1: SQLite Storage');

    const results2 = await engine.search('system');
    expect(results2.length).toBe(1);
    expect(results2[0].title).toBe('Readme');

    await store.dispose();
  });
});
