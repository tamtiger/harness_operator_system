import { RuntimeContext } from '../../shared/types/repository';
import { RepositoryRoot } from '../../shared/types/primitives';

export interface CapabilityImpl {
  execute(context: RuntimeContext, input: unknown): Promise<unknown>;
}

export abstract class BaseCapability implements CapabilityImpl {
  abstract execute(context: RuntimeContext, input: unknown): Promise<unknown>;
  
  protected getRepoRoot(context: RuntimeContext): RepositoryRoot {
    return context.metadata.root;
  }
}
