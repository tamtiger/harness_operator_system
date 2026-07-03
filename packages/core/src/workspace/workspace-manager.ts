import { IWorkspaceManager, IFileSystem, IConfiguration } from '@harness/contracts';
import * as path from 'path';

export class WorkspaceManager implements IWorkspaceManager {
  public readonly serviceName = 'Workspace';
  
  private workspaceRoot!: string;
  private projectRoot!: string;

  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly config: IConfiguration
  ) {}

  public async initialize(): Promise<void> {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    
    // Read from config, fallback to default ~/.harness
    this.workspaceRoot = this.config.get('workspace_dir', path.join(homeDir, '.harness'));
    this.projectRoot = process.cwd();
  }

  public getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  public getProjectRoot(): string {
    return this.projectRoot;
  }

  public getCacheDir(): string {
    return path.join(this.workspaceRoot, 'cache');
  }

  public getSessionDir(): string {
    return path.join(this.workspaceRoot, 'sessions');
  }

  public getDatabaseDir(): string {
    return path.join(this.workspaceRoot, 'database');
  }

  public async ensureWorkspaceCreated(): Promise<void> {
    await this.fileSystem.mkdir(this.workspaceRoot);
    await this.fileSystem.mkdir(this.getCacheDir());
    await this.fileSystem.mkdir(this.getSessionDir());
    await this.fileSystem.mkdir(this.getDatabaseDir());
  }
}
