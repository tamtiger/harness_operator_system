import { IService, ICapabilityProvider, ICapability, CapabilityType } from '@harness/contracts';
import { Result, HarnessError } from '@harness/shared';

export class CapabilityRegistry implements IService {
  public readonly serviceName = 'CapabilityRegistry';

  private capabilities = new Map<CapabilityType, ICapability>();

  constructor() {}

  public registerProvider(provider: ICapabilityProvider): void {
    const descriptors = provider.getCapabilities();
    for (const descriptor of descriptors) {
      if (!descriptor.id || !descriptor.name || !descriptor.type || !descriptor.version) {
        throw new HarnessError('CAPABILITY_INVALID', `Invalid capability descriptor from provider`);
      }

      // Phase 1 constraint: Only 1 active provider per capability type
      if (this.capabilities.has(descriptor.type)) {
        throw new HarnessError(
          'CAPABILITY_DUPLICATE',
          `Multiple providers registered for capability type: ${descriptor.type}. Phase 1 only supports 1 active provider.`
        );
      }

      const instance = provider.getCapability<ICapability>(descriptor.id);
      if (!instance) {
        throw new HarnessError(
          'CAPABILITY_MISSING_INSTANCE',
          `Provider failed to return capability instance for id: ${descriptor.id}`
        );
      }

      this.capabilities.set(descriptor.type, instance);
    }
  }

  public resolve<T extends ICapability>(type: CapabilityType): T | undefined {
    return this.capabilities.get(type) as T;
  }

  public async executeSafe<T extends ICapability, R>(
    capability: T,
    fn: (cap: T) => Promise<Result<R>>
  ): Promise<Result<R>> {
    const timeoutMs = capability.descriptor.timeoutMs || 300000; // 5 mins default
    
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new HarnessError('CAPABILITY_TIMEOUT', `Capability ${capability.descriptor.id} execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([
        fn(capability),
        timeoutPromise
      ]);
      clearTimeout(timer!);
      return result as Result<R>;
    } catch (err: any) {
      clearTimeout(timer!);
      if (err instanceof HarnessError) {
        return Result.fail(err);
      }
      return Result.fail(new HarnessError('CAPABILITY_FAILED', err.message || 'Capability execution failed', { error: err }));
    }
  }
}
