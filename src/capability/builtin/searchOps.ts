import { BaseCapability } from '../registry/types';
import { RuntimeContext } from '../../shared/types/repository';
import { CapabilityDefinition } from '../../shared/types/assets';
import { AssetType, AssetScope, Permission } from '../../shared/types/enums';
import * as fs from 'fs';
import * as path from 'path';

export const searchTextDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.search.text',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Search Text',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.search.text',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string' },
      path: { type: 'string' },
      recursive: { type: 'boolean' },
      caseSensitive: { type: 'boolean' }
    },
    required: ['pattern', 'path']
  },
  outputSchema: {
    type: 'object',
    properties: {
      matches: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            line: { type: 'number' },
            content: { type: 'string' }
          },
          required: ['file', 'line', 'content']
        }
      }
    },
    required: ['matches']
  },
  permissions: [Permission.READ_FILE]
};

export class SearchTextCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absPath = path.resolve(root.path, input.path);
    const matches: any[] = [];
    const pattern = new RegExp(input.pattern, input.caseSensitive ? '' : 'i');

    const searchFile = (file: string) => {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          matches.push({
            file: path.relative(root.path, file).replace(/\\/g, '/'),
            line: index + 1,
            content: line
          });
        }
      });
    };

    const traverse = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const stats = fs.statSync(full);
        if (stats.isDirectory() && input.recursive !== false) {
          traverse(full);
        } else if (stats.isFile()) {
          searchFile(full);
        }
      }
    };

    if (fs.existsSync(absPath)) {
      const stats = fs.statSync(absPath);
      if (stats.isDirectory()) {
        traverse(absPath);
      } else {
        searchFile(absPath);
      }
    }

    return { matches };
  }
}

export const searchFileDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.search.file',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Search Files',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.search.file',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string' },
      root: { type: 'string' }
    },
    required: ['pattern', 'root']
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

export class SearchFileCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const root = this.getRepoRoot(context);
    const absRoot = path.resolve(root.path, input.root);
    const files: string[] = [];
    const matcher = new RegExp(input.pattern.replace(/\*/g, '.*'));

    const traverse = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const stats = fs.statSync(full);
        if (stats.isDirectory()) {
          traverse(full);
        } else if (stats.isFile() && matcher.test(item)) {
          files.push(path.relative(root.path, full).replace(/\\/g, '/'));
        }
      }
    };

    if (fs.existsSync(absRoot) && fs.statSync(absRoot).isDirectory()) {
      traverse(absRoot);
    }
    return { files };
  }
}

export const searchSymbolDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.search.symbol',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Search Symbol',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.search.symbol',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: { type: 'string' },
      root: { type: 'string' },
      language: { type: 'string' }
    },
    required: ['symbol', 'root']
  },
  outputSchema: {
    type: 'object',
    properties: {
      locations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            line: { type: 'number' },
            col: { type: 'number' }
          },
          required: ['file', 'line', 'col']
        }
      }
    },
    required: ['locations']
  },
  permissions: [Permission.READ_FILE]
};

export class SearchSymbolCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    // Basic regex-based symbol search
    const root = this.getRepoRoot(context);
    const absRoot = path.resolve(root.path, input.root);
    const locations: any[] = [];
    // Matches word bounds for the symbol
    const pattern = new RegExp(`\\b${input.symbol}\\b`);

    const searchFile = (file: string) => {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        const col = line.indexOf(input.symbol);
        if (col !== -1 && pattern.test(line)) {
          locations.push({
            file: path.relative(root.path, file).replace(/\\/g, '/'),
            line: index + 1,
            col: col + 1
          });
        }
      });
    };

    const traverse = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const stats = fs.statSync(full);
        if (stats.isDirectory()) {
          traverse(full);
        } else if (stats.isFile() && (item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.json'))) {
          searchFile(full);
        }
      }
    };

    if (fs.existsSync(absRoot) && fs.statSync(absRoot).isDirectory()) {
      traverse(absRoot);
    }
    return { locations };
  }
}
