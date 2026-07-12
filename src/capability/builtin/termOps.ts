import { BaseCapability } from '../registry/types';
import { RuntimeContext } from '../../shared/types/repository';
import { CapabilityDefinition } from '../../shared/types/assets';
import { AssetType, AssetScope, Permission } from '../../shared/types/enums';
import * as child_process from 'child_process';

export const termExecuteDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.terminal.execute',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Execute Command',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.terminal.execute',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string' },
      cwd: { type: 'string' }
    },
    required: ['command']
  },
  outputSchema: {
    type: 'object',
    properties: {
      stdout: { type: 'string' },
      stderr: { type: 'string' },
      exitCode: { type: 'number' }
    },
    required: ['stdout', 'stderr', 'exitCode']
  },
  permissions: [Permission.EXECUTE_COMMAND]
};

export class TermExecuteCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const cwd = input.cwd || root.path;
    try {
      const stdout = child_process.execSync(input.command, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (e: any) {
      return {
        stdout: e.stdout || '',
        stderr: e.stderr || e.message,
        exitCode: e.status || 1
      };
    }
  }
}

export const termStreamDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.terminal.stream',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Stream Command',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.terminal.stream',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string' }
    },
    required: ['command']
  },
  outputSchema: {
    type: 'object',
    properties: {
      output: { type: 'string' }
    },
    required: ['output']
  },
  permissions: [Permission.EXECUTE_COMMAND]
};

export class TermStreamCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    // basic mock fallback for stream output
    const root = this.getRepoRoot(context);
    try {
      const stdout = child_process.execSync(input.command, { cwd: root.path, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return { output: stdout };
    } catch (e: any) {
      return { output: e.message };
    }
  }
}
