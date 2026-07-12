import * as fs from 'fs';
import * as path from 'path';
import { RepositoryContext, RuntimeContext } from '../../shared/types/repository';
import { TaskRequest } from '../../shared/types/execution';
import { ContextFilter } from '../filter/ContextFilter';
import { ContextRanker } from '../ranking/ContextRanker';
import { BudgetAllocator } from '../budget/BudgetAllocator';

export class ContextBuilder {
  private filterer = new ContextFilter();
  private ranker = new ContextRanker();
  private allocator = new BudgetAllocator();

  build(repoContext: RepositoryContext, request: TaskRequest): RuntimeContext {
    const filtered = this.filterer.filter(repoContext, request);
    const ranked = this.ranker.rank(filtered, request);
    const allocated = this.allocator.allocate(ranked);

    // Load AGENTS.md from repository root
    let agentsMd: string | undefined;
    const agentsPath = path.join(repoContext.metadata.root.path, 'AGENTS.md');
    if (fs.existsSync(agentsPath)) {
      agentsMd = fs.readFileSync(agentsPath, 'utf8');
    }

    return this.deepFreeze({ ...allocated, agentsMd });
  }

  private deepFreeze(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
      if (
        Object.prototype.hasOwnProperty.call(obj, prop) &&
        obj[prop] !== null &&
        (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') &&
        !Object.isFrozen(obj[prop])
      ) {
        this.deepFreeze(obj[prop]);
      }
    });
    return obj;
  }
}
