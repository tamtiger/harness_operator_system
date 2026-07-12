import { CapabilityRegistry, type FileSystemOps } from '../shared/contracts/services';
import { CapabilityDefinition } from '../shared/types/assets';
import { CapabilityResult } from '../shared/types/capability';
import { RuntimeContext } from '../shared/types/repository';
import { CapabilityId } from '../shared/types/primitives';
import { CapabilityRegistryImpl } from './registry/CapabilityRegistry';
import { registerBuiltins } from './builtin';

export class CapabilityServiceImpl implements CapabilityRegistry {
  private registry: CapabilityRegistry;

  constructor(persistence?: FileSystemOps, registry?: CapabilityRegistry) {
    this.registry = registry || new CapabilityRegistryImpl();
    if (persistence) {
      registerBuiltins(this.registry, { persistence });
    }
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
    return this.registry.getDefinition(id);
  }

  list(): CapabilityDefinition[] {
    return this.registry.list();
  }

  async invoke(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult> {
    return this.registry.invoke(id, context, input);
  }
}
