import { CapabilityRegistry } from '../shared/contracts/services';
import { CapabilityDefinition } from '../shared/types/assets';
import { CapabilityResult } from '../shared/types/capability';
import { RuntimeContext } from '../shared/types/repository';
import { CapabilityId } from '../shared/types/primitives';
import { CapabilityRegistryImpl } from './registry/CapabilityRegistry';
import { registerBuiltins } from './builtin';
import { FileSystemPersistence } from '../repository/persistence/FileSystemPersistence';

export class CapabilityServiceImpl implements CapabilityRegistry {
  private registry: CapabilityRegistry = new CapabilityRegistryImpl();

  constructor() {
    // Register built-ins with file persistence dependency
    registerBuiltins(this.registry, {
      persistence: new FileSystemPersistence()
    });
  }

  register(def: CapabilityDefinition, impl: any): void {
    this.registry.register(def, impl);
  }

  unregister(id: CapabilityId): void {
    this.registry.unregister(id);
  }

  isRegistered(id: CapabilityId): boolean {
    return this.registry.isRegistered(id);
  }

  resolve(id: CapabilityId): any {
    return this.registry.resolve(id);
  }

  getDefinition(id: CapabilityId): CapabilityDefinition {
    // Cast to access internal helper if needed or use resolved def
    return (this.registry as any).getDefinition(id);
  }

  list(): CapabilityDefinition[] {
    return this.registry.list();
  }

  async invoke(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult> {
    return this.registry.invoke(id, context, input);
  }
}
