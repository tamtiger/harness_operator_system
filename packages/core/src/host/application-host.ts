import { IHost, IService, IFileSystem } from '@harness/contracts';
import { Container } from '../di/container.js';
import { pathToFileURL } from 'url';
import * as path from 'path';

export type RuntimeState =
  | 'CREATED'
  | 'INITIALIZING'
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'STOPPED'
  | 'FAILED';

export class ApplicationHost implements IHost {
  private state: RuntimeState = 'CREATED';
  private container = new Container();
  private services: IService[] = [];

  constructor() {}

  public getContainer(): Container {
    return this.container;
  }

  public registerServiceInstance(name: string, instance: any): void {
    this.container.registerInstance(name, instance);
    if (this.isService(instance)) {
      this.services.push(instance);
    }
  }

  public registerServiceSingleton(name: string, constructor: any, deps: string[] = []): void {
    this.container.registerSingleton(name, constructor, deps);
  }

  public getService<T>(name: string): T {
    return this.container.resolve<T>(name);
  }

  public async start(): Promise<void> {
    if (this.state !== 'CREATED') {
      throw new Error(`Cannot start host from state: ${this.state}`);
    }
    
    this.state = 'INITIALIZING';
    
    try {
      // 1. Resolve configuration first as it's required for workspace
      const config = this.getService<IService>('Configuration');
      if (config && config.initialize) {
        await config.initialize();
      }

      // 2. Initialize other services in registered order
      const trackedServiceNames = ['Logger', 'Workspace', 'EventBus', 'CapabilityRegistry', 'KnowledgeStore', 'KnowledgeEngine'];
      for (const name of trackedServiceNames) {
        try {
          const service = this.container.resolve<IService>(name);
          if (service && !this.services.includes(service)) {
            this.services.push(service);
          }
        } catch {
          // Ignore if not registered
        }
      }

      for (const service of this.services) {
        if (service.initialize) {
          await service.initialize();
        }
      }

      // 3. Load Plugins (Phase 4)
      await this.loadPlugins();

      this.state = 'STARTING';
      
      for (const service of this.services) {
        if (service.start) {
          await service.start();
        }
      }

      this.state = 'RUNNING';
    } catch (err) {
      this.state = 'FAILED';
      await this.cleanup();
      throw err;
    }
  }

  public async stop(): Promise<void> {
    if (this.state !== 'RUNNING') {
      return;
    }
    this.state = 'STOPPING';
    await this.cleanup();
    this.state = 'STOPPED';
  }

  private async loadPlugins(): Promise<void> {
    const fsService = this.getService<IFileSystem>('FileSystem');
    const registry = this.getService<any>('CapabilityRegistry');
    if (!fsService || !registry) return;

    const pluginsDir = path.join(process.cwd(), 'plugins');
    if (!(await fsService.exists(pluginsDir))) {
      return;
    }

    const dirs = await fsService.readDir(pluginsDir);
    for (const dir of dirs) {
      const pluginManifestPath = path.join(pluginsDir, dir, 'manifest.json');
      if (await fsService.exists(pluginManifestPath)) {
        try {
          const tsPath = path.resolve(pluginsDir, dir, 'src', 'index.ts');
          const jsPath = path.resolve(pluginsDir, dir, 'dist', 'index.js');
          const importPath = await fsService.exists(tsPath) ? tsPath : jsPath;
          
          const fileUrl = pathToFileURL(importPath).href;
          const pluginModule = await import(fileUrl);
          
          const ProviderClass = pluginModule.default;
          if (ProviderClass) {
            const provider = new ProviderClass(this.container);
            registry.registerProvider(provider);
          }
        } catch (err) {
          console.error(`Failed to load plugin from ${dir}:`, err);
        }
      }
    }
  }

  private async cleanup(): Promise<void> {
    // Reverse order for stop/dispose
    const revServices = [...this.services].reverse();
    for (const service of revServices) {
      try {
        if (service.stop) {
          await service.stop();
        }
      } catch (err) {
        console.error(`Error stopping service ${service.serviceName}:`, err);
      }
    }

    for (const service of revServices) {
      try {
        if (service.dispose) {
          await service.dispose();
        }
      } catch (err) {
        console.error(`Error disposing service ${service.serviceName}:`, err);
      }
    }
    
    try {
      const config = this.container.resolve<IService>('Configuration');
      if (config && config.dispose) {
        await config.dispose();
      }
    } catch {}
  }

  private isService(instance: any): instance is IService {
    return instance && typeof instance === 'object' && 'serviceName' in instance;
  }
}
