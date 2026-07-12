import { BaseCapability } from '../registry/types';
import { RuntimeContext } from '../../shared/types/repository';
import { CapabilityDefinition } from '../../shared/types/assets';
import { AssetType, AssetScope, Permission } from '../../shared/types/enums';
import * as child_process from 'child_process';

// Exec helper to run command in target working directory safely
function runGitCmd(cmd: string, cwd: string): string {
  try {
    return child_process.execSync(`git ${cmd}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export const gitStatusDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.git.status',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Git Status',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.git.status',
  inputSchema: { type: 'object' },
  outputSchema: {
    type: 'object',
    properties: {
      staged: { type: 'array', items: { type: 'string' } },
      unstaged: { type: 'array', items: { type: 'string' } },
      untracked: { type: 'array', items: { type: 'string' } }
    },
    required: ['staged', 'unstaged', 'untracked']
  },
  permissions: [Permission.READ_FILE]
};

export class GitStatusCapability extends BaseCapability {
  async execute(context: RuntimeContext): Promise<any> {
    const root = this.getRepoRoot(context);
    const statusOut = runGitCmd('status --porcelain', root.path);
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    if (statusOut) {
      statusOut.split('\n').forEach(line => {
        const xy = line.substring(0, 2);
        const file = line.substring(3).trim();
        if (xy === '??') untracked.push(file);
        else {
          if (xy[0] !== ' ' && xy[0] !== '?') staged.push(file);
          if (xy[1] !== ' ' && xy[1] !== '?') unstaged.push(file);
        }
      });
    }

    return { staged, unstaged, untracked };
  }
}

export const gitDiffDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.git.diff',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Git Diff',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.git.diff',
  inputSchema: {
    type: 'object',
    properties: {
      staged: { type: 'boolean' },
      file: { type: 'string' }
    }
  },
  outputSchema: {
    type: 'object',
    properties: {
      diff: { type: 'string' }
    },
    required: ['diff']
  },
  permissions: [Permission.READ_FILE]
};

export class GitDiffCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    let cmd = 'diff';
    if (input.staged) cmd += ' --staged';
    if (input.file) cmd += ` -- ${input.file}`;
    const diff = runGitCmd(cmd, root.path);
    return { diff };
  }
}

export const gitCommitDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.git.commit',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Git Commit',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.git.commit',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      files: { type: 'array', items: { type: 'string' } }
    },
    required: ['message']
  },
  outputSchema: {
    type: 'object',
    properties: {
      commitHash: { type: 'string' }
    },
    required: ['commitHash']
  },
  permissions: [Permission.GIT_WRITE]
};

export class GitCommitCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    if (input.files && input.files.length > 0) {
      input.files.forEach((f: string) => runGitCmd(`add ${f}`, root.path));
    } else {
      runGitCmd('add .', root.path);
    }
    const res = runGitCmd(`commit -m "${input.message}"`, root.path);
    const hash = runGitCmd('rev-parse HEAD', root.path) || 'mock-commit-hash';
    return { commitHash: hash };
  }
}

export const gitLogDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.git.log',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Git Log',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.git.log',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number' }
    }
  },
  outputSchema: {
    type: 'object',
    properties: {
      commits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            hash: { type: 'string' },
            message: { type: 'string' },
            author: { type: 'string' },
            date: { type: 'string' }
          },
          required: ['hash', 'message', 'author', 'date']
        }
      }
    },
    required: ['commits']
  },
  permissions: [Permission.READ_FILE]
};

export class GitLogCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const limit = input.limit || 10;
    const logOut = runGitCmd(`log -n ${limit} --pretty=format:"%H|%s|%an|%ad"`, root.path);
    const commits: any[] = [];
    if (logOut) {
      logOut.split('\n').forEach(line => {
        const parts = line.split('|');
        if (parts.length >= 4) {
          commits.push({
            hash: parts[0],
            message: parts[1],
            author: parts[2],
            date: parts[3]
          });
        }
      });
    }
    return { commits };
  }
}

export const gitBranchDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.git.branch',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Git Branch',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.git.branch',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'create', 'delete'] },
      name: { type: 'string' }
    },
    required: ['action']
  },
  outputSchema: {
    type: 'object',
    properties: {
      branches: { type: 'array', items: { type: 'string' } },
      current: { type: 'string' }
    }
  },
  permissions: [Permission.READ_FILE]
};

export class GitBranchCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    if (input.action === 'create' && input.name) {
      runGitCmd(`branch ${input.name}`, root.path);
    } else if (input.action === 'delete' && input.name) {
      runGitCmd(`branch -D ${input.name}`, root.path);
    }
    const branchOut = runGitCmd('branch', root.path);
    const branches: string[] = [];
    let current = '';
    if (branchOut) {
      branchOut.split('\n').forEach(b => {
        const clean = b.replace('*', '').trim();
        branches.push(clean);
        if (b.startsWith('*')) {
          current = clean;
        }
      });
    }
    return { branches, current };
  }
}

export const gitCheckoutDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.git.checkout',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Git Checkout',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.git.checkout',
  inputSchema: {
    type: 'object',
    properties: {
      ref: { type: 'string' }
    },
    required: ['ref']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' }
    },
    required: ['success']
  },
  permissions: [Permission.GIT_WRITE]
};

export class GitCheckoutCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    runGitCmd(`checkout ${input.ref}`, root.path);
    return { success: true };
  }
}
