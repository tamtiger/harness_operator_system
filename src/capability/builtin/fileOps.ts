import { BaseCapability } from '../registry/types';
import { RuntimeContext } from '../../shared/types/repository';
import { FileSystemPersistence } from '../../repository/persistence/FileSystemPersistence';
import { CapabilityDefinition } from '../../shared/types/assets';
import { AssetType, AssetScope, Permission } from '../../shared/types/enums';
import * as fs from 'fs';
import * as path from 'path';

export const fileReadDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.file.read',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Read File',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.file.read',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' }
    },
    required: ['path']
  },
  outputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string' }
    },
    required: ['content']
  },
  permissions: [Permission.READ_FILE]
};

export class FileReadCapability extends BaseCapability {
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const content = this.persistence.read(root, input.path);
    return { content };
  }
}

export const fileWriteDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.file.write',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Write File',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.file.write',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' }
    },
    required: ['path', 'content']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' }
    },
    required: ['success']
  },
  permissions: [Permission.WRITE_FILE]
};

export class FileWriteCapability extends BaseCapability {
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    this.persistence.write(root, input.path, input.content);
    return { success: true };
  }
}

export const fileAppendDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.file.append',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Append File',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.file.append',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' }
    },
    required: ['path', 'content']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' }
    },
    required: ['success']
  },
  permissions: [Permission.WRITE_FILE]
};

export class FileAppendCapability extends BaseCapability {
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    let existing = '';
    try {
      existing = this.persistence.read(root, input.path);
    } catch (e) { /* ignore */ }
    this.persistence.write(root, input.path, existing + input.content);
    return { success: true };
  }
}

export const fileDeleteDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.file.delete',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Delete File',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.file.delete',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' }
    },
    required: ['path']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' }
    },
    required: ['success']
  },
  permissions: [Permission.WRITE_FILE]
};

export class FileDeleteCapability extends BaseCapability {
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absPath = path.resolve(root.path, input.path);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
    return { success: true };
  }
}

export const fileExistsDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.file.exists',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'File Exists',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.file.exists',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' }
    },
    required: ['path']
  },
  outputSchema: {
    type: 'object',
    properties: {
      exists: { type: 'boolean' }
    },
    required: ['exists']
  },
  permissions: [Permission.READ_FILE]
};

export class FileExistsCapability extends BaseCapability {
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absPath = path.resolve(root.path, input.path);
    return { exists: fs.existsSync(absPath) && fs.statSync(absPath).isFile() };
  }
}

export const fileListDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.file.list',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'List Files',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.file.list',
  inputSchema: {
    type: 'object',
    properties: {
      directory: { type: 'string' },
      pattern: { type: 'string' }
    },
    required: ['directory']
  },
  outputSchema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['files']
  },
  permissions: [Permission.READ_FILE]
};

export class FileListCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absDir = path.resolve(root.path, input.directory);
    if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
      return { files: [] };
    }
    const files = fs.readdirSync(absDir).filter(f => fs.statSync(path.join(absDir, f)).isFile());
    return { files };
  }
}

export const fileMoveDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.file.move',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Move File',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.file.move',
  inputSchema: {
    type: 'object',
    properties: {
      source: { type: 'string' },
      destination: { type: 'string' }
    },
    required: ['source', 'destination']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' }
    },
    required: ['success']
  },
  permissions: [Permission.WRITE_FILE]
};

export class FileMoveCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absSrc = path.resolve(root.path, input.source);
    const absDest = path.resolve(root.path, input.destination);
    if (fs.existsSync(absSrc)) {
      const parent = path.dirname(absDest);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      fs.renameSync(absSrc, absDest);
    }
    return { success: true };
  }
}

export const fileCopyDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.file.copy',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Copy File',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.file.copy',
  inputSchema: {
    type: 'object',
    properties: {
      source: { type: 'string' },
      destination: { type: 'string' }
    },
    required: ['source', 'destination']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' }
    },
    required: ['success']
  },
  permissions: [Permission.WRITE_FILE]
};

export class FileCopyCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absSrc = path.resolve(root.path, input.source);
    const absDest = path.resolve(root.path, input.destination);
    if (fs.existsSync(absSrc)) {
      const parent = path.dirname(absDest);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      fs.copyFileSync(absSrc, absDest);
    }
    return { success: true };
  }
}

// Directory ops
export const dirCreateDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.dir.create',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Create Directory',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.dir.create',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      recursive: { type: 'boolean' }
    },
    required: ['path']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' }
    },
    required: ['success']
  },
  permissions: [Permission.WRITE_FILE]
};

export class DirCreateCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absPath = path.resolve(root.path, input.path);
    fs.mkdirSync(absPath, { recursive: input.recursive ?? true });
    return { success: true };
  }
}

export const dirDeleteDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.dir.delete',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Delete Directory',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.dir.delete',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      recursive: { type: 'boolean' }
    },
    required: ['path']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' }
    },
    required: ['success']
  },
  permissions: [Permission.WRITE_FILE]
};

export class DirDeleteCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absPath = path.resolve(root.path, input.path);
    if (fs.existsSync(absPath)) {
      fs.rmSync(absPath, { recursive: input.recursive ?? true, force: true });
    }
    return { success: true };
  }
}

export const dirListDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.dir.list',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'List Directory',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.dir.list',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' }
    },
    required: ['path']
  },
  outputSchema: {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' }
          },
          required: ['name', 'type']
        }
      }
    },
    required: ['entries']
  },
  permissions: [Permission.READ_FILE]
};

export class DirListCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absPath = path.resolve(root.path, input.path);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
      return { entries: [] };
    }
    const entries = fs.readdirSync(absPath).map(name => {
      const stats = fs.statSync(path.join(absPath, name));
      return {
        name,
        type: stats.isDirectory() ? 'dir' : 'file'
      };
    });
    return { entries };
  }
}

export const dirExistsDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.dir.exists',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Directory Exists',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.dir.exists',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' }
    },
    required: ['path']
  },
  outputSchema: {
    type: 'object',
    properties: {
      exists: { type: 'boolean' }
    },
    required: ['exists']
  },
  permissions: [Permission.READ_FILE]
};

export class DirExistsCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absPath = path.resolve(root.path, input.path);
    return { exists: fs.existsSync(absPath) && fs.statSync(absPath).isDirectory() };
  }
}
