import { IConfiguration, IFileSystem } from '@harness/contracts';
import * as path from 'path';

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export class LayeredConfiguration implements IConfiguration {
  public readonly serviceName = 'Configuration';
  private config: Record<string, any> = {};

  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly defaults: Record<string, any> = {},
    private readonly overrides: Record<string, any> = {}
  ) {}

  public async initialize(): Promise<void> {
    // 1. Load default
    let merged = { ...this.defaults };

    // 2. Try loading workspace config (~/.harness/config.json)
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const workspaceConfigPath = path.join(homeDir, '.harness', 'config.json');
    if (await this.fileSystem.exists(workspaceConfigPath)) {
      try {
        const content = await this.fileSystem.readFile(workspaceConfigPath);
        merged = deepMerge(merged, JSON.parse(content));
      } catch (err) {
        // Recoverable
      }
    }

    // 3. Try loading project config (.harness/project.json)
    const projectConfigPath = path.join(process.cwd(), '.harness', 'project.json');
    if (await this.fileSystem.exists(projectConfigPath)) {
      try {
        const content = await this.fileSystem.readFile(projectConfigPath);
        merged = deepMerge(merged, JSON.parse(content));
      } catch (err) {
        // Recoverable
      }
    }

    // 4. Merge overrides
    this.config = deepMerge(merged, this.overrides);
  }

  public get<T>(key: string, defaultValue?: T): T {
    const parts = key.split('.');
    let current = this.config;
    for (const part of parts) {
      if (current === undefined || current === null) {
        return defaultValue as T;
      }
      current = current[part];
    }
    return (current !== undefined ? current : defaultValue) as T;
  }

  public all(): Record<string, any> {
    return { ...this.config };
  }
}
