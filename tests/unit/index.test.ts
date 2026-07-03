import { describe, it, expect } from 'vitest';
import { CodeIndexer } from '../../packages/core/src/index.js';
import { IWorkspaceManager } from '../../packages/contracts/src/index.js';

describe('Code Indexer Tests', () => {
  const mockWorkspace: IWorkspaceManager = {
    getWorkspaceRoot: () => process.cwd(),
    getDatabaseDir: () => ':memory:'
  } as any;

  it('should parse C# source code and index symbols', async () => {
    const code = `
namespace MyNamespace
{
    public interface IService {}
    public class ServiceImpl : BaseService, IService
    {
        public void DoSomething()
        {
            logger.LogInfo();
        }
    }
}
    `;

    const indexer = new CodeIndexer(mockWorkspace);
    await indexer.initialize();

    await indexer.indexFile('src/ServiceImpl.cs', code);

    // Verify symbols
    const serviceImpl = await indexer.findSymbol('MyNamespace.ServiceImpl');
    expect(serviceImpl).toBeDefined();
    expect(serviceImpl?.kind).toBe('class');
    expect(serviceImpl?.namespace).toBe('MyNamespace');

    const method = await indexer.findSymbol('MyNamespace.ServiceImpl.DoSomething');
    expect(method).toBeDefined();
    expect(method?.kind).toBe('method');
    expect(method?.parentId).toBe('MyNamespace.ServiceImpl');

    // Verify relations
    const derived = await indexer.findDerivedTypes('MyNamespace.BaseService');
    expect(derived.length).toBe(1);
    expect(derived[0].id).toBe('MyNamespace.ServiceImpl');

    const impls = await indexer.findImplementations('MyNamespace.IService');
    expect(impls.length).toBe(1);
    expect(impls[0].id).toBe('MyNamespace.ServiceImpl');

    const refs = await indexer.findReferences('LogInfo');
    expect(refs.length).toBe(1);
    expect(refs[0].fromId).toBe('MyNamespace.ServiceImpl.DoSomething');

    await indexer.dispose();
  });

  it('should parse TS source code and support incremental updates', async () => {
    const code1 = `
export class User {
  constructor(public name: string) {}
  greet() {
    console.log("hello");
  }
}
    `;

    const code2 = `
export class User {
  greet() {
    console.log("hello");
  }
  sayGoodbye() {}
}
    `;

    const indexer = new CodeIndexer(mockWorkspace);
    await indexer.initialize();

    // Index first version
    await indexer.indexFile('src/user.ts', code1);

    let symbols = await indexer.findFileSymbols('src/user.ts');
    expect(symbols.length).toBe(2); // User, greet
    expect(symbols.find(s => s.name === 'greet')).toBeDefined();

    // Index second version (removed constructor, added sayGoodbye)
    await indexer.indexFile('src/user.ts', code2);

    symbols = await indexer.findFileSymbols('src/user.ts');
    expect(symbols.length).toBe(3); // User, greet, sayGoodbye
    expect(symbols.find(s => s.name === 'sayGoodbye')).toBeDefined();

    await indexer.dispose();
  });
});
