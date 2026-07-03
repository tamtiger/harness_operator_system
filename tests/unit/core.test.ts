import { describe, it, expect, vi } from 'vitest';
import { ApplicationHost, Container, StructuredLogger, LayeredConfiguration, LocalEventBus, WorkspaceManager, CapabilityRegistry } from '../../packages/core/src/index.js';
import { SystemClock, NanoidGenerator, PhysicalFileSystem } from '../../packages/shared/src/index.js';

describe('Harness Operator Core Infrastructure Tests', () => {
  it('should resolve dependencies from Container', () => {
    const container = new Container();
    container.registerInstance('Clock', new SystemClock());
    container.registerSingleton('IdGen', NanoidGenerator);
    
    const clock = container.resolve<SystemClock>('Clock');
    const idGen = container.resolve<NanoidGenerator>('IdGen');
    
    expect(clock).toBeInstanceOf(SystemClock);
    expect(idGen).toBeInstanceOf(NanoidGenerator);
    expect(idGen.generate('test')).toContain('test_');
  });

  it('should merge configuration correctly', async () => {
    const fs = new PhysicalFileSystem();
    const defaults = { app: { port: 3000, debug: false } };
    const overrides = { app: { debug: true } };
    
    const config = new LayeredConfiguration(fs, defaults, overrides);
    await config.initialize();
    
    expect(config.get('app.port')).toBe(3000);
    expect(config.get('app.debug')).toBe(true);
  });

  it('should publish and subscribe to EventBus', () => {
    const clock = new SystemClock();
    const bus = new LocalEventBus(clock);
    const handler = vi.fn();
    
    bus.subscribe('TestEvent', handler);
    bus.publish('TestEvent', { value: 42 });
    
    expect(handler).toHaveBeenCalled();
    const envelope = handler.mock.calls[0][0];
    expect(envelope.event).toBe('TestEvent');
    expect(envelope.payload.value).toBe(42);
  });

  it('should manage application host lifecycle', async () => {
    const host = new ApplicationHost();
    const clock = new SystemClock();
    const fs = new PhysicalFileSystem();
    
    host.registerServiceInstance('FileSystem', fs);
    host.registerServiceInstance('Clock', clock);
    host.registerServiceInstance('Configuration', new LayeredConfiguration(fs, { workspace_dir: './tmp' }));
    host.registerServiceSingleton('Logger', StructuredLogger);
    host.registerServiceSingleton('Workspace', WorkspaceManager, ['FileSystem', 'Configuration']);
    host.registerServiceSingleton('EventBus', LocalEventBus, ['Clock']);
    host.registerServiceSingleton('CapabilityRegistry', CapabilityRegistry);
    
    await host.start();
    
    const workspace = host.getService<WorkspaceManager>('Workspace');
    expect(workspace.getWorkspaceRoot()).toBe('./tmp');
    
    await host.stop();
  });
});
