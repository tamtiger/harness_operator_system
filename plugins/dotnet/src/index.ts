import {
  ICapabilityProvider,
  ICapability,
  CapabilityDescriptor,
  CapabilityContext,
  IBuilder,
  ITester,
  ILinter,
  IAnalyzer,
  AnalysisResult,
  IFileSystem
} from '@harness/contracts';
import { Result } from '@harness/shared';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DotNetBuilder implements IBuilder {
  public readonly descriptor: CapabilityDescriptor = {
    id: 'dotnet-builder',
    name: 'DotNet Builder',
    type: 'builder',
    version: '0.0.1',
    timeoutMs: 300000 // 5 mins
  };

  public async build(context: CapabilityContext): Promise<Result<void>> {
    try {
      await execAsync('dotnet build');
      return Result.ok<void, Error>(undefined);
    } catch (err: any) {
      return Result.fail(new Error(err.stdout || err.message || 'dotnet build failed'));
    }
  }
}

export class DotNetTester implements ITester {
  public readonly descriptor: CapabilityDescriptor = {
    id: 'dotnet-tester',
    name: 'DotNet Tester',
    type: 'tester',
    version: '0.0.1',
    timeoutMs: 600000 // 10 mins
  };

  public async test(context: CapabilityContext): Promise<Result<{ passed: boolean; total: number; failed: number }>> {
    try {
      const { stdout } = await execAsync('dotnet test');
      const totalMatch = stdout.match(/Total:\s+(\d+)/);
      const failedMatch = stdout.match(/Failed:\s+(\d+)/);
      const passedMatch = stdout.match(/Passed:\s+(\d+)/);
      
      const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
      const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
      
      return Result.ok({
        passed: failed === 0,
        total,
        failed,
        passedCount: passed
      } as any);
    } catch (err: any) {
      return Result.fail(new Error(err.stdout || err.message || 'dotnet test failed'));
    }
  }
}

export class DotNetLinter implements ILinter {
  public readonly descriptor: CapabilityDescriptor = {
    id: 'dotnet-linter',
    name: 'DotNet Linter',
    type: 'linter',
    version: '0.0.1',
    timeoutMs: 120000 // 2 mins
  };

  public async lint(context: CapabilityContext): Promise<Result<{ passed: boolean; issues: string[] }>> {
    try {
      await execAsync('dotnet format --verify-no-changes');
      return Result.ok({ passed: true, issues: [] });
    } catch (err: any) {
      const issues = err.stdout ? err.stdout.split('\n').filter((l: string) => l.trim().length > 0) : ['Formatting issues found'];
      return Result.ok({ passed: false, issues });
    }
  }
}

export class DotNetAnalyzer implements IAnalyzer {
  public readonly descriptor: CapabilityDescriptor = {
    id: 'dotnet-analyzer',
    name: 'DotNet Analyzer',
    type: 'analyzer',
    version: '0.0.1',
    timeoutMs: 300000 // 5 mins
  };

  constructor(private readonly fileSystem: IFileSystem) {}

  public async analyze(context: CapabilityContext): Promise<Result<AnalysisResult>> {
    try {
      const workspaceRoot = process.cwd();
      const slnFiles: string[] = [];
      const csprojFiles: string[] = [];

      const findFiles = async (dir: string) => {
        try {
          const files = await this.fileSystem.readDir(dir);
          for (const file of files) {
            const normalizedDir = dir.replace(/\\/g, '/');
            const fullPath = normalizedDir.endsWith('/') ? `${normalizedDir}${file}` : `${normalizedDir}/${file}`;
            if (file.endsWith('.sln')) {
              slnFiles.push(fullPath);
            } else if (file.endsWith('.csproj')) {
              csprojFiles.push(fullPath);
            } else if (!file.startsWith('.') && file !== 'node_modules' && file !== 'bin' && file !== 'obj' && file !== 'dist') {
              try {
                await this.fileSystem.readDir(fullPath);
                await findFiles(fullPath);
              } catch {
                // Not a directory
              }
            }
          }
        } catch {
          // Ignore read errors
        }
      };

      await findFiles(workspaceRoot);

      const frameworks: string[] = [];
      const orms: string[] = [];
      const testFrameworks: string[] = [];
      const dependencies: { name: string; version: string; type: 'project' | 'package' }[] = [];
      const symbols: { name: string; type: 'class' | 'interface' | 'enum'; filePath: string; namespace?: string }[] = [];

      for (const csproj of csprojFiles) {
        const content = await this.fileSystem.readFile(csproj);
        if (content.includes('Microsoft.NET.Sdk')) {
          frameworks.push('.NET Sdk');
        }

        const packageRegex = /<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"/g;
        let match;
        while ((match = packageRegex.exec(content)) !== null) {
          const pkgName = match[1];
          const pkgVersion = match[2];
          dependencies.push({ name: pkgName, version: pkgVersion, type: 'package' });

          if (pkgName.includes('EntityFrameworkCore') && !orms.includes('EF Core')) {
            orms.push('EF Core');
          }
          if (pkgName.includes('Dapper') && !orms.includes('Dapper')) {
            orms.push('Dapper');
          }
          if (pkgName.includes('xunit') && !testFrameworks.includes('xUnit')) {
            testFrameworks.push('xUnit');
          }
          if (pkgName.includes('nunit') && !testFrameworks.includes('NUnit')) {
            testFrameworks.push('NUnit');
          }
          if (pkgName.includes('Volo.Abp') && !frameworks.includes('ABP Framework')) {
            frameworks.push('ABP Framework');
          }
        }

        const projectRegex = /<ProjectReference\s+Include="([^"]+)"/g;
        while ((match = projectRegex.exec(content)) !== null) {
          const projPath = match[1];
          const projName = projPath.split('\\').pop()?.split('/').pop()?.replace('.csproj', '') || projPath;
          dependencies.push({ name: projName, version: 'local', type: 'project' });
        }
      }

      const csFiles: string[] = [];
      const findCsFiles = async (dir: string) => {
        if (csFiles.length > 50) return;
        try {
          const files = await this.fileSystem.readDir(dir);
          for (const file of files) {
            const normalizedDir = dir.replace(/\\/g, '/');
            const fullPath = normalizedDir.endsWith('/') ? `${normalizedDir}${file}` : `${normalizedDir}/${file}`;
            if (file.endsWith('.cs')) {
              csFiles.push(fullPath);
            } else if (!file.startsWith('.') && file !== 'node_modules' && file !== 'bin' && file !== 'obj' && file !== 'dist') {
              try {
                await this.fileSystem.readDir(fullPath);
                await findCsFiles(fullPath);
              } catch {}
            }
          }
        } catch {}
      };
      await findCsFiles(workspaceRoot);

      for (const csFile of csFiles) {
        const content = await this.fileSystem.readFile(csFile);
        const namespaceMatch = content.match(/namespace\s+([\w\.]+)/);
        const namespace = namespaceMatch ? namespaceMatch[1] : undefined;

        const classRegex = /public\s+class\s+(\w+)/g;
        let cMatch;
        while ((cMatch = classRegex.exec(content)) !== null) {
          symbols.push({
            name: cMatch[1],
            type: 'class',
            filePath: csFile.replace(workspaceRoot.replace(/\\/g, '/') + '/', ''),
            namespace
          });
        }

        const interfaceRegex = /public\s+interface\s+(\w+)/g;
        let iMatch;
        while ((iMatch = interfaceRegex.exec(content)) !== null) {
          symbols.push({
            name: iMatch[1],
            type: 'interface',
            filePath: csFile.replace(workspaceRoot.replace(/\\/g, '/') + '/', ''),
            namespace
          });
        }
      }

      const result: AnalysisResult = {
        technologies: {
          language: 'C#',
          frameworks,
          orms,
          testFrameworks
        },
        dependencies,
        symbols
      };

      return Result.ok(result);
    } catch (err: any) {
      return Result.fail(err);
    }
  }
}

export default class DotNetPluginProvider implements ICapabilityProvider {
  public readonly serviceName = 'DotNetPluginProvider';

  private builder = new DotNetBuilder();
  private tester = new DotNetTester();
  private linter = new DotNetLinter();
  private analyzer: DotNetAnalyzer;

  constructor(container: any) {
    const fs = container.resolve('FileSystem');
    this.analyzer = new DotNetAnalyzer(fs);
  }

  public getCapabilities(): CapabilityDescriptor[] {
    return [
      this.builder.descriptor,
      this.tester.descriptor,
      this.linter.descriptor,
      this.analyzer.descriptor
    ];
  }

  public getCapability<T extends ICapability>(id: string): T | undefined {
    if (id === 'dotnet-builder') return this.builder as any as T;
    if (id === 'dotnet-tester') return this.tester as any as T;
    if (id === 'dotnet-linter') return this.linter as any as T;
    if (id === 'dotnet-analyzer') return this.analyzer as any as T;
    return undefined;
  }
}
