import {
  ICapabilityProvider,
  ICapability,
  CapabilityDescriptor,
  CapabilityContext,
  IBuilder,
  ITester,
  ILinter
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

export default class DotNetPluginProvider implements ICapabilityProvider {
  public readonly serviceName = 'DotNetPluginProvider';

  private builder = new DotNetBuilder();
  private tester = new DotNetTester();
  private linter = new DotNetLinter();

  public getCapabilities(): CapabilityDescriptor[] {
    return [
      this.builder.descriptor,
      this.tester.descriptor,
      this.linter.descriptor
    ];
  }

  public getCapability<T extends ICapability>(id: string): T | undefined {
    if (id === 'dotnet-builder') return this.builder as any as T;
    if (id === 'dotnet-tester') return this.tester as any as T;
    if (id === 'dotnet-linter') return this.linter as any as T;
    return undefined;
  }
}
