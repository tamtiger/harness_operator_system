import { describe, it, expect } from 'vitest';
import { VerificationEngine, CodeIndexer } from '../../packages/core/src/index.js';
import { 
  IWorkspaceManager, 
  IConfiguration, 
  CapabilityContext, 
  IBuilder, 
  ILinter, 
  ITester, 
  ICapabilityProvider, 
  CapabilityDescriptor 
} from '../../packages/contracts/src/index.js';
import { CapabilityRegistry } from '../../packages/core/src/capability/capability-registry.js';
import { Result } from '../../packages/shared/src/index.js';
import * as path from 'path';
import * as fs from 'fs';

describe('Verification Engine Tests', () => {
  const tempTestDir = path.join(process.cwd(), 'temp-test-verification-' + Date.now());

  const mockWorkspace: IWorkspaceManager = {
    getWorkspaceRoot: () => tempTestDir,
    getProjectRoot: () => tempTestDir,
    getDatabaseDir: () => tempTestDir,
    ensureWorkspaceCreated: async () => {}
  } as any;

  const mockConfig = (failFast = true, rules: any[] = []): IConfiguration => {
    return {
      serviceName: 'Configuration',
      get: (key: string, defaultValue?: any) => {
        if (key === 'verification.failFast') return failFast;
        if (key === 'verification.rules') return rules.length > 0 ? rules : undefined;
        return defaultValue;
      }
    } as any;
  };

  // Mock Capabilities
  class MockBuilder implements IBuilder {
    public buildCalled = 0;
    constructor(private readonly success = true) {}
    public descriptor: CapabilityDescriptor = { id: 'mock-builder', name: 'Mock', type: 'builder', version: '0.0.1' };
    public async build(context: CapabilityContext): Promise<Result<void>> {
      this.buildCalled++;
      return this.success ? Result.ok<void, Error>(undefined) : Result.fail(new Error('Build failed'));
    }
  }

  class MockLinter implements ILinter {
    public lintCalled = 0;
    constructor(private readonly success = true, private readonly issues: string[] = []) {}
    public descriptor: CapabilityDescriptor = { id: 'mock-linter', name: 'Mock', type: 'linter', version: '0.0.1' };
    public async lint(context: CapabilityContext): Promise<Result<any>> {
      this.lintCalled++;
      return Result.ok({ passed: this.success, issues: this.issues });
    }
  }

  class MockTester implements ITester {
    public testCalled = 0;
    constructor(private readonly success = true, private readonly failed = 0, private readonly total = 10) {}
    public descriptor: CapabilityDescriptor = { id: 'mock-tester', name: 'Mock', type: 'tester', version: '0.0.1' };
    public async test(context: CapabilityContext): Promise<Result<any>> {
      this.testCalled++;
      return Result.ok({ passed: this.success, failed: this.failed, total: this.total });
    }
  }

  it('should run all L1-L3 layers successfully and return PASS', async () => {
    const registry = new CapabilityRegistry();
    const builder = new MockBuilder(true);
    const linter = new MockLinter(true);
    const tester = new MockTester(true);

    // Register mocks
    registry.registerProvider({
      getCapabilities: () => [builder.descriptor, linter.descriptor, tester.descriptor],
      getCapability: (id) => {
        if (id === 'mock-builder') return builder;
        if (id === 'mock-linter') return linter;
        if (id === 'mock-tester') return tester;
        return undefined;
      }
    } as ICapabilityProvider);

    const config = mockConfig(true);
    const engine = new VerificationEngine(mockWorkspace, registry, config);
    await engine.initialize();

    const res = await engine.verify('task-1', {} as CapabilityContext);

    expect(res.status).toBe('PASS');
    expect(res.layers.length).toBe(4); // L1, L2, L3, L4 (L4 passes because symbols.db is missing)
    expect(res.layers[0].status).toBe('PASS');
    expect(res.layers[1].status).toBe('PASS');
    expect(res.layers[2].status).toBe('PASS');
    expect(res.layers[3].status).toBe('PASS');

    expect(builder.buildCalled).toBe(1);
    expect(linter.lintCalled).toBe(1);
    expect(tester.testCalled).toBe(1);
  });

  it('should support fail-fast policy and stop execution on failure', async () => {
    const registry = new CapabilityRegistry();
    const builder = new MockBuilder(false); // L1 Fails
    const linter = new MockLinter(true);
    const tester = new MockTester(true);

    registry.registerProvider({
      getCapabilities: () => [builder.descriptor, linter.descriptor, tester.descriptor],
      getCapability: (id) => {
        if (id === 'mock-builder') return builder;
        if (id === 'mock-linter') return linter;
        if (id === 'mock-tester') return tester;
        return undefined;
      }
    } as ICapabilityProvider);

    const config = mockConfig(true); // failFast = true
    const engine = new VerificationEngine(mockWorkspace, registry, config);
    await engine.verify('task-2', {} as CapabilityContext);

    expect(builder.buildCalled).toBe(1);
    expect(linter.lintCalled).toBe(0); // L2 Skipped
    expect(tester.testCalled).toBe(0); // L3 Skipped
  });

  it('should evaluate L4 architecture rules and report violations', async () => {
    // Setup temp directory
    fs.mkdirSync(tempTestDir, { recursive: true });

    // Initialize CodeIndexer and index forbidden relation
    const indexer = new CodeIndexer(mockWorkspace);
    await indexer.initialize();

    const domainCode = `
      namespace MyProject.Domain {
        public class DomainClass {
          public void Handle() {
            InfraClass.Save();
          }
        }
      }
    `;

    const infraCode = `
      namespace MyProject.Infrastructure {
        public class InfraClass {
          public static void Save() {}
        }
      }
    `;

    await indexer.indexFile('src/domain/DomainClass.cs', domainCode);
    await indexer.indexFile('src/infrastructure/InfraClass.cs', infraCode);
    await indexer.dispose();

    // Verify L4 Architecture check detects the relation
    const registry = new CapabilityRegistry();
    const rules = [
      {
        name: 'Domain should not call Infrastructure directly',
        fromPattern: '/domain/',
        toPattern: '/infrastructure/',
        forbidden: true
      }
    ];
    const config = mockConfig(true, rules);
    const engine = new VerificationEngine(mockWorkspace, registry, config);

    const res = await engine.verify('task-3', {} as CapabilityContext);

    expect(res.status).toBe('FAIL');
    const l4Result = res.layers.find(l => l.layer === 'L4');
    expect(l4Result?.status).toBe('FAIL');
    expect(l4Result?.errors.length).toBeGreaterThan(0);
    expect(l4Result?.errors[0]).toContain('Domain should not call Infrastructure directly');

    // Cleanup temp dir
    try {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    } catch {}
  });
});
