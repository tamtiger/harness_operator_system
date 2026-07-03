import { describe, it, expect, vi } from 'vitest';
import { CapabilityRegistry, ContextEngine } from '../../packages/core/src/index.js';
import { DotNetAnalyzer } from '../../plugins/dotnet/src/index.js';
import { IFileSystem, ILogger, ICapabilityProvider } from '../../packages/contracts/src/index.js';
import { Result } from '../../packages/shared/src/index.js';

describe('Repository Analyzer Tests', () => {
  it('should parse csproj and extract dependencies & technologies', async () => {
    const mockCsproj = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Volo.Abp.AspNetCore.Mvc" Version="8.0.2" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.0" />
    <PackageReference Include="xunit" Version="2.5.3" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\\MyProject.Domain\\MyProject.Domain.csproj" />
  </ItemGroup>
</Project>
    `;

    const mockCsFile = `
namespace MyProject.Domain
{
    public interface IMyService {}
    public class MyService : IMyService {}
}
    `;

    const files = new Map<string, string>();
    files.set(process.cwd().replace(/\\/g, '/') + '/MyProject.csproj', mockCsproj);
    files.set(process.cwd().replace(/\\/g, '/') + '/MyService.cs', mockCsFile);

    const mockFileSystem: IFileSystem = {
      exists: async (p) => true,
      readFile: async (p) => files.get(p.replace(/\\/g, '/')) || '',
      writeFile: async (p, c) => {},
      mkdir: async (p) => {},
      readDir: async (p) => {
        const norm = p.replace(/\\/g, '/');
        const rootNorm = process.cwd().replace(/\\/g, '/');
        if (norm === rootNorm) {
          return ['MyProject.csproj', 'MyService.cs'];
        }
        return [];
      },
      remove: async (p) => {}
    };

    const analyzer = new DotNetAnalyzer(mockFileSystem);
    const result = await analyzer.analyze({
      projectId: 'test-proj',
      workspaceId: 'test-ws',
      traceId: 'test-trace'
    });

    expect(result.isSuccess).toBe(true);
    const analysis = result.value;
    expect(analysis.technologies.language).toBe('C#');
    expect(analysis.technologies.frameworks).toContain('ABP Framework');
    expect(analysis.technologies.orms).toContain('EF Core');
    expect(analysis.technologies.testFrameworks).toContain('xUnit');
    expect(analysis.dependencies).toContainEqual({ name: 'MyProject.Domain', version: 'local', type: 'project' });
    
    const serviceSymbol = analysis.symbols.find(s => s.name === 'MyService');
    expect(serviceSymbol).toBeDefined();
    expect(serviceSymbol?.type).toBe('class');
    expect(serviceSymbol?.namespace).toBe('MyProject.Domain');
  });

  it('should coordinate analysis and write draft files', async () => {
    const registry = new CapabilityRegistry();
    const writtenFiles = new Map<string, string>();

    const mockCap = {
      descriptor: { id: 'dotnet-analyzer', name: 'DotNet', type: 'analyzer', version: '0.0.1' },
      analyze: async () => Result.ok({
        technologies: { language: 'C#', frameworks: ['ABP Framework'], orms: ['EF Core'], testFrameworks: ['xUnit'] },
        dependencies: [],
        symbols: [{ name: 'Dummy', type: 'class', filePath: 'Dummy.cs' }]
      })
    };

    const mockProvider: ICapabilityProvider = {
      getCapabilities: () => [mockCap.descriptor as any],
      getCapability: (id) => mockCap as any
    };

    registry.registerProvider(mockProvider);

    const mockFileSystem: IFileSystem = {
      exists: async (p) => true,
      readFile: async (p) => '',
      writeFile: async (p, c) => {
        writtenFiles.set(p.replace(/\\/g, '/'), c);
      },
      mkdir: async (p) => {},
      readDir: async (p) => [],
      remove: async (p) => {}
    };

    const mockLogger: ILogger = {
      log: () => {},
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      fatal: () => {},
      serviceName: 'Logger'
    };

    const engine = new ContextEngine(registry, mockFileSystem, mockLogger);
    const res = await engine.analyzeRepository('proj1', 'ws1');

    expect(res.isSuccess).toBe(true);
    
    const repoMap = [...writtenFiles.keys()].find(k => k.endsWith('repo-map.yaml'));
    expect(repoMap).toBeDefined();
    expect(writtenFiles.get(repoMap!)).toContain('language: C#');
    
    const arch = [...writtenFiles.keys()].find(k => k.endsWith('architecture.md'));
    expect(arch).toBeDefined();
    expect(writtenFiles.get(arch!)).toContain('**Dummy** (class)');
  });
});
