import { RuntimeContext, RepositoryRoot } from '../../shared/types/repository';
import { CapabilityImpl } from '../../shared/contracts/services';
import { isWithinBoundary } from '../../shared/utils/path';
import { capError } from '../../shared/errors/factories';

export abstract class BaseCapability implements CapabilityImpl {
  abstract execute(context: RuntimeContext, input: unknown): Promise<unknown>;
  
  protected getRepoRoot(context: RuntimeContext): RepositoryRoot {
    return context.metadata.root;
  }

  protected validatePath(context: RuntimeContext, filePath: string): void {
    const root = this.getRepoRoot(context).path;
    if (!isWithinBoundary(root, filePath)) {
      throw capError('CAP_002', { field: 'path', reason: `Access denied: target path '${filePath}' lies outside the workspace boundary.` });
    }
  }
}
