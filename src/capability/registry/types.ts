import { RuntimeContext, RepositoryRoot } from '../../shared/types/repository';
import { CapabilityImpl } from '../../shared/contracts/services';

export abstract class BaseCapability implements CapabilityImpl {
  abstract execute(context: RuntimeContext, input: unknown): Promise<unknown>;
  
  protected getRepoRoot(context: RuntimeContext): RepositoryRoot {
    return context.metadata.root;
  }
}
