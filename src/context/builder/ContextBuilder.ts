import * as fs from 'fs';
import * as path from 'path';
import { RepositoryContext, RuntimeContext } from '../../shared/types/repository';
import { TaskRequest } from '../../shared/types/execution';
import { Prompt } from '../../shared/types/assets';
import { AssetScope, AssetType } from '../../shared/types/enums';
import { ContextFilter } from '../filter/ContextFilter';
import { ContextRanker } from '../ranking/ContextRanker';
import { BudgetAllocator } from '../budget/BudgetAllocator';

const BUILTIN_PROMPT_FILES = ['implementer-prompt.md', 'task-reviewer-prompt.md', 'code-reviewer.md'];

export class ContextBuilder {
  private filterer = new ContextFilter();
  private ranker = new ContextRanker();
  private allocator = new BudgetAllocator();

  build(repoContext: RepositoryContext, request: TaskRequest): RuntimeContext {
    const filtered = this.filterer.filter(repoContext, request);
    const ranked = this.ranker.rank(filtered, request);
    const enriched = this.injectBuiltinPrompts(ranked);
    const allocated = this.allocator.allocate(enriched);

    // Load AGENTS.md from repository root
    let agentsMd: string | undefined;
    const agentsPath = path.join(repoContext.metadata.root.path, 'AGENTS.md');
    if (fs.existsSync(agentsPath)) {
      agentsMd = fs.readFileSync(agentsPath, 'utf8');
    }

    return this.deepFreeze({ ...allocated, agentsMd });
  }

  private injectBuiltinPrompts(context: RepositoryContext): RepositoryContext {
    const promptsDir = path.resolve(__dirname, '../../shared/templates/prompts');
    const builtinPrompts: Prompt[] = [];

    for (const file of BUILTIN_PROMPT_FILES) {
      const filePath = path.join(promptsDir, file);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      const id = file.replace('.md', '');

      // Extract first H1 as display name
      const nameMatch = content.match(/^#\s+(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : id;

      builtinPrompts.push({
        metadata: {
          id,
          type: AssetType.PROMPT,
          version: '1.0.0',
          name,
          description: 'Built-in prompt template for subagent dispatch',
          scope: AssetScope.SHARED,
          source: 'builtin',
          createdAt: '2026-07-13',
          updatedAt: '2026-07-13',
          tags: ['dispatch', 'template', 'subagent'],
        },
        content,
        modelHints: [],
        tokenEstimate: Math.ceil(content.length / 4),
      });
    }

    if (builtinPrompts.length === 0) return context;

    return {
      ...context,
      assets: {
        ...context.assets,
        prompts: [...builtinPrompts, ...context.assets.prompts],
      },
    };
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
