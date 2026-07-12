import { BaseCapability } from '../registry/types';
import { RuntimeContext } from '../../shared/types/repository';
import { FileSystemPersistence } from '../../repository/persistence/FileSystemPersistence';
import { CapabilityDefinition } from '../../shared/types/assets';
import { AssetType, AssetScope, Permission } from '../../shared/types/enums';

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
    this.persistence.deleteFile(root, input.path);
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
    return { exists: this.persistence.existsFile(root, input.path) };
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
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const entries = this.persistence.listDir(root, input.directory);
    const files = entries.filter(e => e.type === 'file').map(e => e.name);
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
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    this.persistence.moveFile(root, input.source, input.destination);
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
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    this.persistence.copyFile(root, input.source, input.destination);
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
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    this.persistence.mkDir(root, input.path, input.recursive ?? true);
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
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    this.persistence.rmDir(root, input.path, input.recursive ?? true);
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
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const entries = this.persistence.listDir(root, input.path);
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
  constructor(private persistence: FileSystemPersistence) {
    super();
  }

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    return { exists: this.persistence.existsDir(root, input.path) };
  }
}
